/**
 * SYNC API Endpoint
 * Main orchestrator endpoint for processing user messages
 * Supports both standard and streaming responses
 *
 * Phase 1: 14 Actions (Finance + Products)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import modular action executors
import { executeFinanceAction } from './tools/finance.ts';
import { executeProductsAction } from './tools/products.ts';
import { ActionContext, ActionResult } from './tools/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Supabase client for database operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Default company ID (fallback)
const DEFAULT_COMPANY_ID = '6a07896c-28e5-4f54-836e-ec0bde91c2c2';

// ============================================================================
// Action Categories
// ============================================================================

const FINANCE_ACTIONS = [
  'create_proposal',
  'create_invoice',
  'list_invoices',
  'update_invoice',
  'create_expense',
  'list_expenses',
  'get_financial_summary',
  'convert_proposal_to_invoice',
];

const PRODUCT_ACTIONS = [
  'search_products',
  'create_product',
  'update_product',
  'update_inventory',
  'list_products',
  'get_low_stock',
];

// ============================================================================
// Action Parsing and Execution
// ============================================================================

function parseActionFromResponse(response: string): { action: string; data: any } | null {
  const actionMatch = response.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
  if (actionMatch) {
    try {
      return JSON.parse(actionMatch[1].trim());
    } catch {
      return null;
    }
  }
  return null;
}

async function executeAction(
  action: { action: string; data: any },
  companyId: string,
  userId?: string
): Promise<ActionResult> {
  // Create action context
  const ctx: ActionContext = {
    supabase,
    companyId,
    userId,
  };

  // Route to appropriate module
  if (FINANCE_ACTIONS.includes(action.action)) {
    return executeFinanceAction(ctx, action.action, action.data);
  }

  if (PRODUCT_ACTIONS.includes(action.action)) {
    return executeProductsAction(ctx, action.action, action.data);
  }

  // Unknown action
  return {
    success: false,
    message: `Unknown action: ${action.action}`,
    error: 'Action not found',
  };
}

// ============================================================================
// Agent Routing Configuration
// ============================================================================

interface AgentRouting {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  priority: number;
  patterns: RegExp[];
}

const AGENTS: Record<string, AgentRouting> = {
  finance: {
    id: 'finance',
    name: 'Finance Agent',
    description: 'Invoices, expenses, budgets, payments, BTW/VAT',
    keywords: ['invoice', 'invoices', 'invoicing', 'payment', 'payments', 'expense', 'expenses', 'budget', 'btw', 'vat', 'financial', 'billing', 'bill', 'receipt', 'euro', 'eur', '€', 'price', 'cost', 'fee', 'charge', 'proposal', 'proposals', 'quote', 'quotes'],
    priority: 100,
    patterns: [
      /send\s+(an?\s+)?invoice/i,
      /create\s+(an?\s+)?invoice/i,
      /invoice\s+for\s+/i,
      /\d+\s*(euro|eur|€)/i,
      /€\s*\d+/i,
      /btw|vat/i,
      /payment\s+(of|for)/i,
      /billing/i,
      /create\s+(an?\s+)?proposal/i,
      /send\s+(an?\s+)?proposal/i,
      /show\s+(my\s+)?invoices/i,
      /list\s+(all\s+)?invoices/i,
      /unpaid\s+invoices/i,
      /overdue\s+invoices/i,
      /log\s+(an?\s+)?expense/i,
      /financial\s+summary/i,
      /revenue|income|cash\s*flow/i,
    ],
  },
  products: {
    id: 'products',
    name: 'Products Agent',
    description: 'Product catalog, inventory, stock management',
    keywords: ['product', 'products', 'inventory', 'stock', 'sku', 'catalog', 'item', 'items', 'warehouse'],
    priority: 95,
    patterns: [
      /search\s+(for\s+)?products?/i,
      /find\s+products?/i,
      /add\s+(a\s+)?product/i,
      /create\s+(a\s+)?product/i,
      /update\s+(the\s+)?stock/i,
      /update\s+inventory/i,
      /low\s+stock/i,
      /out\s+of\s+stock/i,
      /list\s+(all\s+)?products/i,
      /show\s+(my\s+)?products/i,
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth Agent',
    description: 'Sales pipeline, prospects, leads, campaigns, outreach',
    keywords: ['prospect', 'prospects', 'lead', 'leads', 'sales', 'campaign', 'campaigns', 'outreach', 'pipeline', 'crm', 'contact', 'contacts', 'cold email', 'sequence', 'follow up', 'followup'],
    priority: 80,
    patterns: [
      /find\s+(prospects?|leads?|contacts?)/i,
      /research\s+(company|companies|prospect)/i,
      /sales\s+pipeline/i,
      /lead\s+scor/i,
      /email\s+(sequence|campaign|outreach)/i,
    ],
  },
  sentinel: {
    id: 'sentinel',
    name: 'Sentinel Agent',
    description: 'Compliance, EU AI Act, risk assessment, governance',
    keywords: ['compliance', 'compliant', 'risk', 'risks', 'ai act', 'regulation', 'regulations', 'audit', 'governance', 'policy', 'policies', 'gdpr', 'legal', 'regulatory'],
    priority: 90,
    patterns: [
      /eu\s+ai\s+act/i,
      /risk\s+(assessment|level|classification)/i,
      /compliance\s+(check|status|report)/i,
      /ai\s+system\s+(risk|classification)/i,
      /gdpr/i,
    ],
  },
  learn: {
    id: 'learn',
    name: 'Learn Agent',
    description: 'Learning & development, courses, skill tracking',
    keywords: ['learn', 'learning', 'course', 'courses', 'training', 'skill', 'skills', 'education', 'lesson', 'lessons', 'certificate', 'certificates', 'tutorial', 'study'],
    priority: 70,
    patterns: [
      /take\s+(a\s+)?course/i,
      /learn\s+(about|how)/i,
      /training\s+(program|course)/i,
      /skill\s+(gap|assessment)/i,
    ],
  },
  raise: {
    id: 'raise',
    name: 'Raise Agent',
    description: 'Fundraising, investors, pitch, valuation',
    keywords: ['investor', 'investors', 'funding', 'fundraising', 'pitch', 'valuation', 'raise', 'raising', 'venture', 'capital', 'vc', 'seed', 'series'],
    priority: 75,
    patterns: [
      /raise\s+(funding|capital|money)/i,
      /find\s+investors?/i,
      /pitch\s+(deck|preparation)/i,
      /series\s+[a-z]/i,
      /seed\s+(round|funding)/i,
    ],
  },
  create: {
    id: 'create',
    name: 'Create Agent',
    description: 'Image generation, marketing creatives, visuals',
    keywords: ['image', 'images', 'create', 'generate', 'visual', 'visuals', 'design', 'creative', 'creatives', 'photo', 'photos', 'graphic', 'graphics', 'banner', 'logo'],
    priority: 60,
    patterns: [
      /generate\s+(an?\s+)?image/i,
      /create\s+(an?\s+)?(image|visual|graphic)/i,
      /marketing\s+(creative|visual|image)/i,
      /product\s+(photo|image)/i,
    ],
  },
};

// ============================================================================
// Routing Logic
// ============================================================================

interface RoutingResult {
  agentId: string | null;
  confidence: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
}

function detectAgentFromMessage(message: string): RoutingResult {
  const lowerMessage = message.toLowerCase();
  const scores: Map<string, { score: number; keywords: string[]; patterns: string[] }> = new Map();

  const sortedAgents = Object.entries(AGENTS).sort((a, b) => b[1].priority - a[1].priority);

  for (const [agentId, agent] of sortedAgents) {
    let score = 0;
    const matchedKeywords: string[] = [];
    const matchedPatterns: string[] = [];

    for (const pattern of agent.patterns) {
      if (pattern.test(message)) {
        score += 30;
        matchedPatterns.push(pattern.source);
      }
    }

    for (const keyword of agent.keywords) {
      if (lowerMessage.includes(keyword)) {
        score += 10 + keyword.length;
        matchedKeywords.push(keyword);
      }
    }

    score = score * (agent.priority / 100);

    if (score > 0) {
      scores.set(agentId, { score, keywords: matchedKeywords, patterns: matchedPatterns });
    }
  }

  let bestAgent: string | null = null;
  let bestScore = 0;
  let bestKeywords: string[] = [];
  let bestPatterns: string[] = [];

  for (const [agentId, data] of scores) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestAgent = agentId;
      bestKeywords = data.keywords;
      bestPatterns = data.patterns;
    }
  }

  const confidence = Math.min(bestScore / 100, 1);

  return {
    agentId: bestAgent,
    confidence,
    matchedKeywords: bestKeywords,
    matchedPatterns: bestPatterns,
  };
}

// ============================================================================
// Session Management
// ============================================================================

const sessions: Map<string, { messages: Array<{ role: string; content: string }>; context: object }> = new Map();

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

// ============================================================================
// System Prompt - Phase 1 (14 Actions)
// ============================================================================

const SYNC_SYSTEM_PROMPT = `You are SYNC, the central AI orchestrator for iSyncSO - an intelligent business platform.

You can EXECUTE REAL ACTIONS by including an [ACTION] block in your response.

## IMPORTANT: Automatic Product Price Lookup
When creating proposals or invoices, you can OMIT the unit_price field. The system will automatically look up prices from the product inventory. Just use the product name as it appears in the catalog.

## Available Actions

### FINANCE (8 actions)

#### Search Products (for price lookup)
[ACTION]
{"action": "search_products", "data": {"query": "product name"}}
[/ACTION]

#### Create Proposal
[ACTION]
{"action": "create_proposal", "data": {
  "client_name": "Client Name",
  "client_company": "Company Name (optional)",
  "client_email": "email@example.com (optional)",
  "title": "Proposal: Product/Service for Client",
  "items": [{"name": "Product Name", "quantity": 10}],
  "tax_percent": 21,
  "notes": "Additional notes (optional)"
}}
[/ACTION]

#### Create Invoice
[ACTION]
{"action": "create_invoice", "data": {
  "client_name": "Client Name",
  "client_email": "email@example.com (optional)",
  "items": [{"name": "Product Name", "quantity": 1}],
  "tax_percent": 21,
  "due_days": 30
}}
[/ACTION]

#### List Invoices
[ACTION]
{"action": "list_invoices", "data": {
  "status": "draft|sent|paid|overdue|cancelled (optional)",
  "client": "client name filter (optional)",
  "limit": 20
}}
[/ACTION]

#### Update Invoice Status
[ACTION]
{"action": "update_invoice", "data": {
  "invoice_number": "INV-2025-123456",
  "status": "draft|sent|paid|overdue|cancelled"
}}
[/ACTION]

#### Create Expense
[ACTION]
{"action": "create_expense", "data": {
  "description": "Expense description",
  "amount": 100.00,
  "category": "office|travel|software|marketing|other",
  "vendor": "Vendor Name (optional)",
  "date": "2025-01-07 (optional, defaults to today)",
  "notes": "Additional notes (optional)"
}}
[/ACTION]

#### List Expenses
[ACTION]
{"action": "list_expenses", "data": {
  "category": "filter by category (optional)",
  "vendor": "filter by vendor (optional)",
  "limit": 20
}}
[/ACTION]

#### Get Financial Summary
[ACTION]
{"action": "get_financial_summary", "data": {
  "period": "month|quarter|year"
}}
[/ACTION]

#### Convert Proposal to Invoice
[ACTION]
{"action": "convert_proposal_to_invoice", "data": {
  "proposal_number": "PROP-2025-123456"
}}
[/ACTION]

### PRODUCTS (6 actions)

#### Search Products
[ACTION]
{"action": "search_products", "data": {"query": "product name"}}
[/ACTION]

#### Create Product
[ACTION]
{"action": "create_product", "data": {
  "name": "Product Name",
  "type": "physical|digital",
  "price": 29.99,
  "sku": "SKU-123 (optional)",
  "quantity": 100,
  "description": "Product description (optional)",
  "status": "draft|published"
}}
[/ACTION]

#### Update Product
[ACTION]
{"action": "update_product", "data": {
  "name": "Product Name (for lookup)",
  "updates": {
    "price": 34.99,
    "status": "published",
    "description": "Updated description"
  }
}}
[/ACTION]

#### Update Inventory
[ACTION]
{"action": "update_inventory", "data": {
  "name": "Product Name",
  "quantity": 50,
  "adjustment_type": "set|add|subtract"
}}
[/ACTION]

#### List Products
[ACTION]
{"action": "list_products", "data": {
  "type": "physical|digital (optional)",
  "status": "draft|published|archived (optional)",
  "search": "name filter (optional)",
  "limit": 20
}}
[/ACTION]

#### Get Low Stock Alerts
[ACTION]
{"action": "get_low_stock", "data": {
  "threshold": 10
}}
[/ACTION]

## Rules:
1. When asked to CREATE/MAKE a proposal or invoice, ALWAYS include the [ACTION] block
2. Extract client name, product names, and quantities from the user's message
3. DO NOT include unit_price unless the user specifically provides a custom price
4. Use Dutch BTW rate of 21% by default
5. Use the exact or similar product name as in the catalog (e.g., "Philips OneBlade", "OneBlade")
6. Provide a brief confirmation message along with the action block
7. For list/search queries, filter appropriately based on user request
8. Always confirm what action you're taking before the [ACTION] block

## Example Conversations:

### Invoice Creation
User: "make an invoice for mink krijnen for 88 philips one blades"
Response: Creating an invoice for Mink Krijnen with 88 Philips OneBlade units. The price will be looked up from your product inventory.
[ACTION]
{"action": "create_invoice", "data": {"client_name": "Mink Krijnen", "items": [{"name": "Philips OneBlade", "quantity": 88}], "tax_percent": 21}}
[/ACTION]

### List Unpaid Invoices
User: "show me all unpaid invoices"
Response: Here are your unpaid invoices:
[ACTION]
{"action": "list_invoices", "data": {"status": "sent"}}
[/ACTION]

### Log Expense
User: "log an expense of 250 euros for office supplies from staples"
Response: Logging an expense of €250 for office supplies from Staples.
[ACTION]
{"action": "create_expense", "data": {"description": "Office supplies", "amount": 250, "category": "office", "vendor": "Staples"}}
[/ACTION]

### Check Low Stock
User: "what products are running low on stock?"
Response: Checking for products with low inventory:
[ACTION]
{"action": "get_low_stock", "data": {"threshold": 10}}
[/ACTION]

### Update Stock
User: "set the oneblade stock to 200 units"
Response: Updating Philips OneBlade stock to 200 units.
[ACTION]
{"action": "update_inventory", "data": {"name": "OneBlade", "quantity": 200, "adjustment_type": "set"}}
[/ACTION]`;

// ============================================================================
// Request/Response Types
// ============================================================================

interface SyncRequest {
  message: string;
  sessionId?: string;
  stream?: boolean;
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
  routing?: {
    confidence: number;
    matchedKeywords: string[];
    matchedPatterns: string[];
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  actionExecuted?: {
    success: boolean;
    type?: string;
    result?: any;
    link?: string;
  };
}

// ============================================================================
// Streaming Support
// ============================================================================

async function handleStreamingRequest(
  apiMessages: Array<{ role: string; content: string }>,
  session: { id: string; messages: Array<{ role: string; content: string }>; context: object },
  routingResult: RoutingResult,
  companyId: string,
  userId?: string,
): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
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
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        let fullContent = '';
        const decoder = new TextDecoder();

        const metadata = {
          event: 'start',
          sessionId: session.id,
          delegatedTo: routingResult.agentId,
          routing: {
            confidence: routingResult.confidence,
            matchedKeywords: routingResult.matchedKeywords,
          },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'chunk', content })}\n\n`));
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }

        // Check for and execute action blocks after streaming
        const actionData = parseActionFromResponse(fullContent);
        let actionResult: ActionResult | null = null;
        if (actionData) {
          actionResult = await executeAction(actionData, companyId, userId);
          const cleanedContent = fullContent.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
          fullContent = cleanedContent + '\n\n' + actionResult.message;
        }

        session.messages.push({ role: 'assistant', content: fullContent });
        sessions.set(session.id, { messages: session.messages, context: session.context });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          event: 'end',
          content: fullContent,
          actionExecuted: actionResult ? {
            success: actionResult.success,
            type: actionData?.action,
            link: actionResult.link,
          } : undefined,
        })}\n\n`));
        controller.close();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'error', error: errorMessage })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey');

    if (!authHeader && !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SyncRequest = await req.json();
    const { message, sessionId, stream = false, context } = body;

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

    const session = getOrCreateSession(sessionId);
    const companyId = context?.companyId || DEFAULT_COMPANY_ID;
    const userId = context?.userId;

    if (context) {
      session.context = { ...session.context, ...context };
    }

    const routingResult = detectAgentFromMessage(message);
    session.messages.push({ role: 'user', content: message });

    const apiMessages = [
      { role: 'system', content: SYNC_SYSTEM_PROMPT },
      ...session.messages.slice(-10),
    ];

    if (stream) {
      return handleStreamingRequest(apiMessages, session, routingResult, companyId, userId);
    }

    // Non-streaming request
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
          delegatedTo: routingResult.agentId || undefined,
          routing: {
            confidence: routingResult.confidence,
            matchedKeywords: routingResult.matchedKeywords,
            matchedPatterns: routingResult.matchedPatterns,
          },
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
    let delegatedTo: string | undefined = routingResult.agentId || undefined;

    // Check for explicit delegation in response
    const delegateMatch = assistantMessage.match(/\{"delegate":\s*\{[^}]+\}\}/);
    if (delegateMatch) {
      try {
        const delegateInfo = JSON.parse(delegateMatch[0]);
        if (delegateInfo.delegate?.agent) {
          delegatedTo = delegateInfo.delegate.agent;
        }
        assistantMessage = assistantMessage.replace(delegateMatch[0], '').trim();
        if (!assistantMessage) {
          assistantMessage = `I'm routing your request to the ${AGENTS[delegatedTo as keyof typeof AGENTS]?.name || delegatedTo} for specialized handling.`;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Check for and execute action blocks
    let actionExecuted: ActionResult | null = null;
    const actionData = parseActionFromResponse(assistantMessage);
    if (actionData) {
      actionExecuted = await executeAction(actionData, companyId, userId);
      assistantMessage = assistantMessage.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
      if (actionExecuted) {
        assistantMessage = assistantMessage + '\n\n' + actionExecuted.message;
      }
    }

    session.messages.push({ role: 'assistant', content: assistantMessage });
    sessions.set(session.id, { messages: session.messages, context: session.context });

    // Log usage for tracking
    if (context?.companyId) {
      try {
        await supabase.from('ai_usage_log').insert({
          company_id: context.companyId,
          user_id: context.userId || null,
          model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
          cost_usd: 0,
          content_type: 'chat',
          metadata: {
            sessionId: session.id,
            delegatedTo,
            routing: {
              confidence: routingResult.confidence,
              matchedKeywords: routingResult.matchedKeywords,
            },
            messageLength: message.length,
            actionExecuted: actionExecuted ? actionData?.action : null,
          },
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    const syncResponse: SyncResponse = {
      response: assistantMessage,
      sessionId: session.id,
      delegatedTo,
      routing: {
        confidence: routingResult.confidence,
        matchedKeywords: routingResult.matchedKeywords,
        matchedPatterns: routingResult.matchedPatterns,
      },
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      actionExecuted: actionExecuted ? {
        success: actionExecuted.success,
        type: actionData?.action,
        result: actionExecuted.result,
        link: actionExecuted.link,
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
