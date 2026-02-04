/**
 * Execute AI Node Edge Function
 *
 * Handles Claude API calls with tool_use support for flow execution.
 * Iteratively processes tool calls until Claude returns a final response.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

// ============================================================================
// Configuration
// ============================================================================

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ITERATIONS = 10;
const MAX_TOKENS = 4096;

const ALLOWED_ORIGINS = [
  'https://app.isyncso.com',
  'https://www.isyncso.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// ============================================================================
// Types
// ============================================================================

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  tool_use_id: string;
  content: string;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      systemPrompt,
      messages,
      tools,
      nodeType,
      nodeConfig,
      prospectId,
      executionId,
      workspaceId
    } = await req.json();

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase for tool execution
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tool execution context
    const toolContext = {
      workspaceId,
      prospectId,
      executionId,
      supabase
    };

    // Call Claude with tool loop
    const result = await callClaudeWithToolLoop(
      apiKey,
      systemPrompt,
      messages,
      tools || [],
      toolContext
    );

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('execute-ai-node error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Claude API with Tool Loop
// ============================================================================

async function callClaudeWithToolLoop(
  apiKey: string,
  systemPrompt: string,
  initialMessages: Array<{ role: string; content: string | unknown[] }>,
  tools: unknown[],
  toolContext: {
    workspaceId: string;
    prospectId: string;
    executionId: string;
    supabase: ReturnType<typeof createClient>;
  }
): Promise<{
  response: string;
  toolCalls: ToolCall[];
  tokensUsed: number;
}> {
  let messages = [...initialMessages];
  const allToolCalls: ToolCall[] = [];
  let totalTokens = 0;
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();

    // Track tokens
    totalTokens += (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0);

    // Check stop reason
    const stopReason = result.stop_reason;

    // Extract content
    const content = result.content || [];

    // Check for tool use
    const toolUseBlocks = content.filter((c: { type: string }) => c.type === 'tool_use');

    if (toolUseBlocks.length === 0 || stopReason === 'end_turn') {
      // No tool calls - extract final text response
      const textBlock = content.find((c: { type: string }) => c.type === 'text');
      return {
        response: textBlock?.text || '',
        toolCalls: allToolCalls,
        tokensUsed: totalTokens
      };
    }

    // Process tool calls
    const toolResults: ToolResult[] = [];

    for (const toolUse of toolUseBlocks) {
      const toolCall: ToolCall = {
        id: toolUse.id,
        name: toolUse.name,
        input: toolUse.input
      };
      allToolCalls.push(toolCall);

      console.log(`[execute-ai-node] Tool call: ${toolUse.name}`, toolUse.input);

      // Execute tool
      const toolResult = await executeToolServer(
        toolUse.name,
        toolUse.input,
        toolContext
      );

      toolResults.push({
        tool_use_id: toolUse.id,
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
      });
    }

    // Add assistant message with tool use
    messages.push({
      role: 'assistant',
      content
    });

    // Add tool results
    messages.push({
      role: 'user',
      content: toolResults.map(r => ({
        type: 'tool_result',
        tool_use_id: r.tool_use_id,
        content: r.content
      }))
    });
  }

  // Max iterations reached
  console.warn('[execute-ai-node] Max tool iterations reached');
  return {
    response: 'Analysis completed with multiple tool calls. Please review the results.',
    toolCalls: allToolCalls,
    tokensUsed: totalTokens
  };
}

// ============================================================================
// Server-Side Tool Execution
// ============================================================================

async function executeToolServer(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: {
    workspaceId: string;
    prospectId: string;
    executionId: string;
    supabase: ReturnType<typeof createClient>;
  }
): Promise<unknown> {
  const { supabase, workspaceId, prospectId, executionId } = context;

  try {
    switch (toolName) {
      // ============ RESEARCH TOOLS ============
      case 'search_knowledge': {
        const query = toolInput.query as string;
        const collection = toolInput.collection as string;

        // Call search RPC
        const { data, error } = await supabase.rpc('search_knowledge', {
          p_workspace_id: workspaceId,
          p_query_embedding: await generateEmbedding(query),
          p_collections: collection === 'all' ? null : [collection],
          p_limit: 5,
          p_threshold: 0.6
        });

        if (error) throw error;
        return {
          found: data?.length || 0,
          results: (data || []).slice(0, 5).map((r: { title: string; content: string; collection: string; similarity: number }) => ({
            title: r.title,
            content: r.content?.slice(0, 500),
            collection: r.collection,
            similarity: Math.round(r.similarity * 100) + '%'
          }))
        };
      }

      case 'search_prospect_history': {
        const { data, error } = await supabase
          .from('interaction_memory')
          .select('*')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        return {
          found: data?.length || 0,
          interactions: (data || []).map((i: { created_at: string; interaction_type: string; channel: string; outcome: string; summary: string }) => ({
            date: i.created_at,
            type: i.interaction_type,
            channel: i.channel,
            outcome: i.outcome,
            summary: i.summary?.slice(0, 200)
          }))
        };
      }

      case 'research_company': {
        // Use scrape-embed function
        const scrapeResult = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-embed`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
              workspaceId,
              url: toolInput.url,
              collection: 'prospects',
              metadata: { prospect_id: prospectId }
            })
          }
        );
        return await scrapeResult.json();
      }

      // ============ COMPOSITION TOOLS (Return guidance) ============
      case 'compose_email':
      case 'compose_subject_line':
      case 'compose_linkedin_message':
      case 'compose_sms':
      case 'compose_call_script':
        // These return guidance for Claude to compose content
        return {
          guidance: toolInput,
          instruction: `Use this guidance to compose the content. Return the final text.`
        };

      // ============ ANALYSIS TOOLS ============
      case 'analyze_prospect': {
        const { data: prospect } = await supabase
          .from('prospects')
          .select('*')
          .eq('id', prospectId)
          .single();

        return {
          analysis_type: toolInput.analysis_type,
          prospect_context: {
            company: prospect?.company,
            industry: prospect?.industry,
            role: prospect?.role || prospect?.title,
            company_size: prospect?.company_size
          },
          instruction: `Perform ${toolInput.analysis_type} analysis based on this context.`
        };
      }

      case 'evaluate_timing': {
        const { data: interactions } = await supabase
          .from('interaction_memory')
          .select('*')
          .eq('prospect_id', prospectId)
          .eq('channel', 'email')
          .order('created_at', { ascending: false })
          .limit(10);

        const opened = (interactions || []).filter((i: { content: { opened_at?: string } }) => i.content?.opened_at);
        return {
          channel: toolInput.channel,
          engagement_data: {
            total_emails: interactions?.length || 0,
            opened: opened.length,
            open_rate: interactions?.length ? Math.round(opened.length / interactions.length * 100) + '%' : 'N/A'
          },
          instruction: 'Recommend the best timing based on this data.'
        };
      }

      case 'score_engagement': {
        const { data: interactions } = await supabase
          .from('interaction_memory')
          .select('*')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false })
          .limit(20);

        let score = 0;
        (interactions || []).forEach((i: { outcome: string }) => {
          if (i.outcome === 'positive') score += 20;
          else if (i.outcome === 'neutral') score += 5;
          else if (i.outcome === 'negative') score -= 10;
        });

        return {
          score: Math.min(Math.max(score, 0), 100),
          level: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
          interaction_count: interactions?.length || 0
        };
      }

      // ============ ACTION TOOLS ============
      case 'save_draft': {
        const { data, error } = await supabase
          .from('interaction_memory')
          .insert({
            workspace_id: workspaceId,
            prospect_id: prospectId,
            execution_id: executionId,
            interaction_type: 'draft_created',
            channel: toolInput.content_type,
            content: {
              subject: toolInput.subject,
              body: toolInput.body,
              notes: toolInput.notes
            },
            outcome: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, draft_id: data.id };
      }

      case 'schedule_follow_up': {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + (toolInput.delay_days as number));

        const { data, error } = await supabase
          .from('interaction_memory')
          .insert({
            workspace_id: workspaceId,
            prospect_id: prospectId,
            execution_id: executionId,
            interaction_type: 'follow_up_scheduled',
            content: {
              action: toolInput.action,
              scheduled_for: scheduledDate.toISOString(),
              condition: toolInput.condition
            },
            outcome: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return {
          success: true,
          scheduled_for: scheduledDate.toISOString(),
          message: `Follow-up scheduled for ${scheduledDate.toLocaleDateString()}`
        };
      }

      case 'update_prospect_status': {
        const updates: Record<string, unknown> = {};
        if (toolInput.status) updates.stage = toolInput.status;
        if (toolInput.notes) updates.notes = toolInput.notes;

        const { error } = await supabase
          .from('prospects')
          .update(updates)
          .eq('id', prospectId);

        if (error) throw error;
        return { success: true, message: `Status updated to ${toolInput.status}` };
      }

      case 'log_interaction': {
        const { data, error } = await supabase
          .from('interaction_memory')
          .insert({
            workspace_id: workspaceId,
            prospect_id: prospectId,
            execution_id: executionId,
            interaction_type: toolInput.interaction_type,
            outcome: toolInput.outcome,
            summary: toolInput.summary,
            content: { next_steps: toolInput.next_steps }
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, interaction_id: data.id };
      }

      default:
        console.warn(`[execute-ai-node] Unknown tool: ${toolName}`);
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`[execute-ai-node] Tool error for ${toolName}:`, error);
    return { error: error.message };
  }
}

// ============================================================================
// Embedding Generation (for search) - Together.ai BAAI/bge-large-en-v1.5 (1024 dimensions)
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const togetherKey = Deno.env.get('TOGETHER_API_KEY');
  if (!togetherKey) {
    throw new Error('TOGETHER_API_KEY not configured for embeddings');
  }

  const response = await fetch('https://api.together.xyz/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${togetherKey}`
    },
    body: JSON.stringify({
      model: 'BAAI/bge-large-en-v1.5',
      input: text.slice(0, 8000)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Together.ai embedding error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}
