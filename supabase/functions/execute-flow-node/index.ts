/**
 * Execute Flow Node Edge Function
 *
 * Server-side node execution for the flow engine.
 * Called by the queue worker to resume executions after timers/delays.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

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

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Service-role only - this is an internal function
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: service role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { executionId, nodeId, context = {}, isRetry = false } = await req.json();

    if (!executionId || !nodeId) {
      return new Response(
        JSON.stringify({ error: 'executionId and nodeId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get execution with flow and prospect
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .select('*, outreach_flows(*), prospects(*)')
      .eq('id', executionId)
      .single();

    if (execError || !execution) {
      return new Response(
        JSON.stringify({ error: execError?.message || 'Execution not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flow = execution.outreach_flows;
    const prospect = execution.prospects;
    const nodes = flow.nodes || [];
    const node = nodes.find((n: { id: string }) => n.id === nodeId);

    if (!node) {
      return new Response(
        JSON.stringify({ error: `Node ${nodeId} not found in flow` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create node execution record
    const { data: nodeExec } = await supabase
      .from('node_executions')
      .insert({
        execution_id: executionId,
        node_id: nodeId,
        node_type: node.type,
        status: 'running',
        started_at: new Date().toISOString(),
        input_data: {
          context: { ...execution.context, ...context },
          is_retry: isRetry
        }
      })
      .select()
      .single();

    // Update execution current node
    await supabase
      .from('flow_executions')
      .update({
        current_node_id: nodeId,
        status: 'running'
      })
      .eq('id', executionId);

    // Process node based on type
    let result: { success: boolean; output?: Record<string, unknown>; error?: string; nextNodes?: string[] };

    try {
      switch (node.type) {
        case 'aiAnalysis':
        case 'ai_analysis':
        case 'sendEmail':
        case 'send_email':
        case 'linkedinMessage':
        case 'linkedin':
        case 'research':
        case 'researchProspect':
        case 'followUp':
        case 'follow_up':
          // Call execute-ai-node for AI-powered nodes
          const aiResult = await fetch(
            `${supabaseUrl}/functions/v1/execute-ai-node`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                systemPrompt: flow.agent_persona || 'You are a helpful B2B sales assistant.',
                messages: [{ role: 'user', content: buildNodePrompt(node, prospect, execution.context) }],
                tools: [],
                nodeType: node.type,
                prospectId: prospect.id,
                executionId,
                workspaceId: execution.workspace_id
              })
            }
          );

          const aiData = await aiResult.json();
          result = {
            success: aiResult.ok,
            output: aiData,
            error: aiData.error
          };
          break;

        case 'condition':
        case 'branch':
          result = evaluateCondition(node, prospect, { ...execution.context, ...context });
          break;

        case 'updateStatus':
        case 'update_status':
          result = await updateProspectStatus(supabase, node, prospect.id);
          break;

        case 'end':
          result = { success: true, output: { completed: true } };
          break;

        default:
          result = { success: true, output: { pass_through: true } };
      }
    } catch (nodeError) {
      result = { success: false, error: nodeError.message };
    }

    // Update node execution
    if (nodeExec) {
      await supabase
        .from('node_executions')
        .update({
          status: result.success ? 'completed' : 'failed',
          output_data: result.output,
          error_message: result.error,
          completed_at: new Date().toISOString()
        })
        .eq('id', nodeExec.id);
    }

    // Update execution context
    const updatedContext = {
      ...execution.context,
      ...context,
      [nodeId]: result.output,
      last_node: nodeId
    };

    // Determine next steps
    const edges = flow.edges || [];
    let nextNodes = edges
      .filter((e: { source: string; sourceHandle?: string }) => {
        if (e.source !== nodeId) return false;
        // Handle branching
        if (result.output?.branch && e.sourceHandle) {
          return e.sourceHandle === result.output.branch;
        }
        return true;
      })
      .map((e: { target: string }) => e.target);

    if (node.type === 'end' || nextNodes.length === 0) {
      // Complete execution
      await supabase
        .from('flow_executions')
        .update({
          status: 'completed',
          context: updatedContext,
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
    } else {
      // Update context and continue
      await supabase
        .from('flow_executions')
        .update({ context: updatedContext })
        .eq('id', executionId);

      // Execute next nodes (recursively or queue them)
      for (const nextNodeId of nextNodes) {
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));

        // Recursively call this function for next node
        await fetch(
          `${supabaseUrl}/functions/v1/execute-flow-node`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              executionId,
              nodeId: nextNodeId,
              context: updatedContext
            })
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        nodeId,
        output: result.output,
        nextNodes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('execute-flow-node error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function buildNodePrompt(
  node: { type: string; data?: { prompt?: string } },
  prospect: Record<string, unknown>,
  context: Record<string, unknown>
): string {
  const basePrompt = node.data?.prompt || `Process this ${node.type} step for the prospect.`;

  return `
## PROSPECT
Name: ${prospect.name || prospect.full_name || 'Unknown'}
Company: ${prospect.company || prospect.company_name || 'Unknown'}
Role: ${prospect.role || prospect.title || 'Unknown'}
Industry: ${prospect.industry || 'Unknown'}

## CONTEXT
${JSON.stringify(context, null, 2)}

## TASK
${basePrompt}
`;
}

function evaluateCondition(
  node: { data?: { conditions?: Array<{ field: string; operator: string; value: unknown; branch?: string }> } },
  prospect: Record<string, unknown>,
  context: Record<string, unknown>
): { success: boolean; output: { branch: string; evaluated: boolean } } {
  const conditions = node.data?.conditions || [];

  for (const condition of conditions) {
    const value = getNestedValue(prospect, condition.field) || getNestedValue(context, condition.field);

    let matches = false;
    switch (condition.operator) {
      case 'equals':
      case '==':
        matches = value === condition.value;
        break;
      case 'not_equals':
      case '!=':
        matches = value !== condition.value;
        break;
      case 'contains':
        matches = String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        break;
      case 'is_empty':
        matches = !value || value === '';
        break;
      case 'is_not_empty':
        matches = !!value && value !== '';
        break;
      default:
        matches = false;
    }

    if (matches) {
      return {
        success: true,
        output: { branch: condition.branch || 'true', evaluated: true }
      };
    }
  }

  return {
    success: true,
    output: { branch: 'false', evaluated: false }
  };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

async function updateProspectStatus(
  supabase: ReturnType<typeof createClient>,
  node: { data?: { status?: string; notes?: string } },
  prospectId: string
): Promise<{ success: boolean; output: Record<string, unknown>; error?: string }> {
  const updates: Record<string, unknown> = {};
  if (node.data?.status) updates.stage = node.data.status;
  if (node.data?.notes) updates.notes = node.data.notes;

  const { error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', prospectId);

  if (error) {
    return { success: false, output: {}, error: error.message };
  }

  return {
    success: true,
    output: { updated_status: node.data?.status, updated: true }
  };
}
