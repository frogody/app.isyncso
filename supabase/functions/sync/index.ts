/**
 * SYNC API Endpoint
 * Main orchestrator endpoint for processing user messages
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Agent definitions for routing
const AGENTS = {
  learn: {
    id: 'learn',
    name: 'Learn Agent',
    description: 'Learning & development, courses, skill tracking',
    keywords: ['learn', 'course', 'training', 'skill', 'education', 'lesson', 'certificate'],
  },
  growth: {
    id: 'growth',
    name: 'Growth Agent',
    description: 'Sales pipeline, prospects, leads, campaigns',
    keywords: ['prospect', 'lead', 'sales', 'campaign', 'outreach', 'pipeline', 'crm'],
  },
  sentinel: {
    id: 'sentinel',
    name: 'Sentinel Agent',
    description: 'Compliance, EU AI Act, risk assessment, governance',
    keywords: ['compliance', 'risk', 'ai act', 'regulation', 'audit', 'governance', 'policy'],
  },
  finance: {
    id: 'finance',
    name: 'Finance Agent',
    description: 'Invoices, expenses, budgets, payments',
    keywords: ['invoice', 'payment', 'expense', 'budget', 'btw', 'vat', 'financial', 'billing'],
  },
  raise: {
    id: 'raise',
    name: 'Raise Agent',
    description: 'Fundraising, investors, pitch, valuation',
    keywords: ['investor', 'funding', 'pitch', 'valuation', 'raise', 'venture', 'capital'],
  },
  create: {
    id: 'create',
    name: 'Create Agent',
    description: 'Image generation, marketing creatives, visuals',
    keywords: ['image', 'create', 'generate', 'visual', 'design', 'creative', 'photo'],
  },
};

// Session store (in production, use Redis or database)
const sessions: Map<string, { messages: Array<{ role: string; content: string }>; context: object }> = new Map();

const SYNC_SYSTEM_PROMPT = `You are SYNC, the central AI orchestrator for iSyncSO - an intelligent business platform.

Your role is to:
1. Understand user requests and provide helpful responses
2. Route specialized tasks to the appropriate agent when needed
3. Maintain context across the conversation
4. Synthesize information from multiple sources

Available specialized agents:
- learn: Learning & development, course recommendations, skill tracking
- growth: Sales pipeline, prospect research, lead scoring
- sentinel: EU AI Act compliance, risk assessment, governance
- finance: Invoice processing, expense tracking, budget forecasting
- raise: Fundraising, investor research, pitch preparation
- create: AI image generation, marketing creatives

When you determine a task should be delegated, respond with a JSON block:
{"delegate": {"agent": "agent_id", "task": "specific task description"}}

For direct responses, just reply naturally.

Be concise, professional, and helpful. Use Dutch business context when relevant (BTW for VAT, etc.).`;

interface SyncRequest {
  message: string;
  sessionId?: string;
  context?: {
    userId?: string;
    companyId?: string;
    metadata?: Record<string, unknown>;
  };
}

interface SyncResponse {
  response: string;
  sessionId: string;
  delegatedTo?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function detectAgentFromMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  for (const [agentId, agent] of Object.entries(AGENTS)) {
    for (const keyword of agent.keywords) {
      if (lowerMessage.includes(keyword)) {
        return agentId;
      }
    }
  }

  return null;
}

function generateSessionId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateSession(sessionId?: string): { id: string; messages: Array<{ role: string; content: string }>; context: object } {
  const id = sessionId || generateSessionId();

  if (!sessions.has(id)) {
    sessions.set(id, { messages: [], context: {} });
  }

  const session = sessions.get(id)!;
  return { id, ...session };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SyncRequest = await req.json();
    const { message, sessionId, context } = body;

    // Validate input
    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!TOGETHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create session
    const session = getOrCreateSession(sessionId);

    // Update context if provided
    if (context) {
      session.context = { ...session.context, ...context };
    }

    // Add user message to history
    session.messages.push({ role: 'user', content: message });

    // Build messages for API
    const apiMessages = [
      { role: 'system', content: SYNC_SYSTEM_PROMPT },
      ...session.messages.slice(-10), // Keep last 10 messages for context
    ];

    // Call Together AI
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Together AI error:', errorText);

      // Fallback to simpler model
      const fallbackResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!fallbackResponse.ok) {
        throw new Error(`API error: ${errorText}`);
      }

      const fallbackData = await fallbackResponse.json();
      const assistantMessage = fallbackData.choices?.[0]?.message?.content || 'I apologize, I encountered an issue processing your request.';

      session.messages.push({ role: 'assistant', content: assistantMessage });
      sessions.set(session.id, { messages: session.messages, context: session.context });

      return new Response(
        JSON.stringify({
          response: assistantMessage,
          sessionId: session.id,
          usage: fallbackData.usage ? {
            promptTokens: fallbackData.usage.prompt_tokens,
            completionTokens: fallbackData.usage.completion_tokens,
            totalTokens: fallbackData.usage.total_tokens,
          } : undefined,
        } as SyncResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let assistantMessage = data.choices?.[0]?.message?.content || '';
    let delegatedTo: string | undefined;

    // Check for delegation in response
    const delegateMatch = assistantMessage.match(/\{"delegate":\s*\{[^}]+\}\}/);
    if (delegateMatch) {
      try {
        const delegateInfo = JSON.parse(delegateMatch[0]);
        delegatedTo = delegateInfo.delegate?.agent;

        // Remove the JSON from the response and add delegation info
        assistantMessage = assistantMessage.replace(delegateMatch[0], '').trim();
        if (!assistantMessage) {
          assistantMessage = `I'm routing your request to the ${AGENTS[delegatedTo as keyof typeof AGENTS]?.name || delegatedTo} for specialized handling.`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Also check for keyword-based routing if no explicit delegation
    if (!delegatedTo) {
      delegatedTo = detectAgentFromMessage(message) || undefined;
    }

    // Store assistant response
    session.messages.push({ role: 'assistant', content: assistantMessage });
    sessions.set(session.id, { messages: session.messages, context: session.context });

    // Log usage for tracking (optional - can be stored in Supabase)
    if (context?.companyId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('ai_usage_log').insert({
          company_id: context.companyId,
          user_id: context.userId || null,
          model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
          cost_usd: 0, // Free model
          content_type: 'chat',
          metadata: {
            sessionId: session.id,
            delegatedTo,
            messageLength: message.length,
          },
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
        // Don't fail the request if logging fails
      }
    }

    const syncResponse: SyncResponse = {
      response: assistantMessage,
      sessionId: session.id,
      delegatedTo,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };

    return new Response(
      JSON.stringify(syncResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SYNC error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({
        error: errorMessage,
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        sessionId: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
