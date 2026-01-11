/**
 * LLM-Based Intent Recognition for SYNC
 *
 * Provides intelligent intent classification using:
 * - LLM-based analysis for complex/ambiguous requests
 * - Embedding similarity to known intent patterns
 * - Fallback to keyword matching for simple cases
 * - Entity extraction alongside intent
 */

import { generateEmbedding } from '../memory/embeddings.ts';

// ============================================================================
// Types
// ============================================================================

export interface IntentResult {
  primaryIntent: string;
  confidence: number;               // 0-1
  secondaryIntents: string[];       // Other possible intents
  agentId: string;                  // Recommended agent
  entities: ExtractedEntities;      // Extracted entities
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedWorkflow?: 'sequential' | 'parallel' | 'conditional' | 'iterative';
  requiresChain: boolean;           // Multiple actions needed
  chainActions?: string[];          // If chain, what actions
  clarificationNeeded?: string;     // If unclear, what to ask
}

export interface ExtractedEntities {
  clients: Array<{ name: string; company?: string; email?: string }>;
  products: Array<{ name: string; quantity?: number; price?: number }>;
  amounts: Array<{ value: number; currency: string; context?: string }>;
  dates: Array<{ value: string; context?: string }>;
  people: Array<{ name: string; role?: string }>;
  references: Array<{ type: string; value: string }>;  // Invoice numbers, IDs, etc.
}

// Intent categories mapped to agents and actions
export const INTENT_MAPPING: Record<string, {
  agentId: string;
  actions: string[];
  patterns: string[];
  priority: number;
}> = {
  // Finance intents
  'create_invoice': {
    agentId: 'finance',
    actions: ['create_invoice'],
    patterns: ['create invoice', 'make invoice', 'bill', 'invoice for', 'send invoice'],
    priority: 100,
  },
  'create_proposal': {
    agentId: 'finance',
    actions: ['create_proposal'],
    patterns: ['create proposal', 'make proposal', 'quote for', 'offer for', 'send proposal'],
    priority: 100,
  },
  'view_invoices': {
    agentId: 'finance',
    actions: ['list_invoices'],
    patterns: ['show invoices', 'list invoices', 'my invoices', 'unpaid invoices', 'overdue'],
    priority: 90,
  },
  'log_expense': {
    agentId: 'finance',
    actions: ['create_expense'],
    patterns: ['log expense', 'add expense', 'record expense', 'expense for'],
    priority: 90,
  },
  'financial_overview': {
    agentId: 'finance',
    actions: ['get_financial_summary'],
    patterns: ['financial summary', 'revenue', 'income', 'cash flow', 'how much'],
    priority: 85,
  },

  // Product intents
  'search_products': {
    agentId: 'products',
    actions: ['search_products'],
    patterns: ['find product', 'search product', 'do you have', 'look for', 'find'],
    priority: 95,
  },
  'add_product': {
    agentId: 'products',
    actions: ['create_product'],
    patterns: ['add product', 'create product', 'new product'],
    priority: 90,
  },
  'update_stock': {
    agentId: 'products',
    actions: ['update_inventory'],
    patterns: ['update stock', 'add stock', 'inventory', 'restock', 'stock level'],
    priority: 90,
  },
  'low_stock_check': {
    agentId: 'products',
    actions: ['get_low_stock'],
    patterns: ['low stock', 'out of stock', 'running low', 'need to reorder'],
    priority: 85,
  },

  // CRM intents
  'add_prospect': {
    agentId: 'growth',
    actions: ['create_prospect'],
    patterns: ['add prospect', 'new lead', 'add contact', 'new prospect'],
    priority: 80,
  },
  'find_prospects': {
    agentId: 'growth',
    actions: ['search_prospects', 'list_prospects'],
    patterns: ['find prospect', 'search leads', 'show prospects', 'my leads'],
    priority: 75,
  },
  'pipeline_status': {
    agentId: 'growth',
    actions: ['get_pipeline_stats'],
    patterns: ['pipeline', 'sales status', 'deals', 'opportunities'],
    priority: 75,
  },
  'run_campaign': {
    agentId: 'growth',
    actions: ['create_campaign', 'update_campaign'],
    patterns: ['create campaign', 'start campaign', 'email campaign', 'outreach'],
    priority: 70,
  },

  // Task intents
  'create_task': {
    agentId: 'tasks',
    actions: ['create_task'],
    patterns: ['create task', 'add task', 'remind me', 'todo', 'need to'],
    priority: 75,
  },
  'view_tasks': {
    agentId: 'tasks',
    actions: ['list_tasks', 'get_my_tasks'],
    patterns: ['show tasks', 'my tasks', 'what do i need to do', 'to do list'],
    priority: 70,
  },
  'complete_task': {
    agentId: 'tasks',
    actions: ['complete_task'],
    patterns: ['complete task', 'done with', 'finished', 'mark complete'],
    priority: 70,
  },
  'overdue_tasks': {
    agentId: 'tasks',
    actions: ['get_overdue_tasks'],
    patterns: ['overdue', 'missed deadline', 'late tasks'],
    priority: 70,
  },

  // Image generation intents
  'generate_image': {
    agentId: 'create',
    actions: ['generate_image'],
    patterns: ['create image', 'generate image', 'make image', 'product photo', 'visual'],
    priority: 60,
  },

  // Research intents
  'web_search': {
    agentId: 'research',
    actions: ['web_search'],
    patterns: ['search for', 'look up', 'find information', 'research'],
    priority: 50,
  },

  // Sentinel/Compliance intents
  'ai_compliance': {
    agentId: 'sentinel',
    actions: ['get_compliance_status', 'register_ai_system'],
    patterns: ['compliance', 'ai act', 'regulation', 'register ai'],
    priority: 90,
  },

  // Team intents
  'team_management': {
    agentId: 'team',
    actions: ['list_teams', 'list_team_members', 'invite_user'],
    patterns: ['team members', 'invite', 'add to team', 'who is on'],
    priority: 60,
  },

  // Learning intents
  'learning': {
    agentId: 'learn',
    actions: ['list_courses', 'get_learning_progress'],
    patterns: ['course', 'learn', 'training', 'skill', 'study'],
    priority: 70,
  },
};

// ============================================================================
// Fast Keyword-Based Classification (First Pass)
// ============================================================================

export function quickClassify(message: string): IntentResult | null {
  const lowerMsg = message.toLowerCase();
  let bestMatch: { intent: string; score: number } | null = null;

  for (const [intent, config] of Object.entries(INTENT_MAPPING)) {
    let score = 0;

    for (const pattern of config.patterns) {
      if (lowerMsg.includes(pattern.toLowerCase())) {
        score += pattern.length + config.priority / 10;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { intent, score };
    }
  }

  if (bestMatch && bestMatch.score > 10) {
    const config = INTENT_MAPPING[bestMatch.intent];
    return {
      primaryIntent: bestMatch.intent,
      confidence: Math.min(bestMatch.score / 50, 0.9),  // Cap at 0.9 for keyword match
      secondaryIntents: [],
      agentId: config.agentId,
      entities: extractEntitiesQuick(message),
      complexity: 'simple',
      requiresChain: false,
    };
  }

  return null;  // Need LLM classification
}

// ============================================================================
// Quick Entity Extraction (Regex-Based)
// ============================================================================

function extractEntitiesQuick(message: string): ExtractedEntities {
  const entities: ExtractedEntities = {
    clients: [],
    products: [],
    amounts: [],
    dates: [],
    people: [],
    references: [],
  };

  // Extract amounts (currency values)
  const amountPatterns = [
    /€\s*(\d+(?:[.,]\d{2})?)/g,
    /(\d+(?:[.,]\d{2})?)\s*(?:euro|eur)/gi,
    /\$\s*(\d+(?:[.,]\d{2})?)/g,
  ];

  for (const pattern of amountPatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const value = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(value)) {
        entities.amounts.push({
          value,
          currency: message.includes('$') ? 'USD' : 'EUR',
        });
      }
    }
  }

  // Extract quantities with product context
  const quantityPattern = /(\d+)\s+(?:x\s+)?([A-Z][A-Za-z\s]+?)(?:\s+(?:for|at|@)|\s*$|,)/g;
  let qMatch;
  while ((qMatch = quantityPattern.exec(message)) !== null) {
    entities.products.push({
      name: qMatch[2].trim(),
      quantity: parseInt(qMatch[1]),
    });
  }

  // Extract dates
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(today|tomorrow|next week|next month|volgende week)/gi,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    /(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)/gi,
  ];

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      entities.dates.push({ value: match[1] });
    }
  }

  // Extract references (invoice/proposal numbers)
  const refPatterns = [
    /(?:INV|PROP|ORD)[-\s]?\d{4}[-\s]?\d+/gi,
    /#(\d+)/g,
  ];

  for (const pattern of refPatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      entities.references.push({
        type: match[0].toUpperCase().startsWith('INV') ? 'invoice' :
              match[0].toUpperCase().startsWith('PROP') ? 'proposal' : 'reference',
        value: match[0],
      });
    }
  }

  // Extract "for [Name]" patterns (clients)
  const forPattern = /\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let forMatch;
  while ((forMatch = forPattern.exec(message)) !== null) {
    const name = forMatch[1].trim();
    // Avoid common words
    if (!['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(name)) {
      entities.clients.push({ name });
    }
  }

  return entities;
}

// ============================================================================
// LLM-Based Classification (Deep Analysis)
// ============================================================================

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a business AI assistant called SYNC.
Analyze the user's message and extract:
1. Primary intent (what they want to do)
2. Entities (clients, products, amounts, dates)
3. Complexity level
4. Whether multiple actions are needed

Available intents and their agents:
FINANCE: create_invoice, create_proposal, view_invoices, log_expense, financial_overview
PRODUCTS: search_products, add_product, update_stock, low_stock_check
GROWTH/CRM: add_prospect, find_prospects, pipeline_status, run_campaign
TASKS: create_task, view_tasks, complete_task, overdue_tasks
CREATE: generate_image
RESEARCH: web_search
SENTINEL: ai_compliance
TEAM: team_management
LEARN: learning

Respond in JSON format:
{
  "primaryIntent": "intent_name",
  "confidence": 0.0-1.0,
  "secondaryIntents": [],
  "agentId": "agent_name",
  "entities": {
    "clients": [{"name": "...", "company": "...", "email": "..."}],
    "products": [{"name": "...", "quantity": ..., "price": ...}],
    "amounts": [{"value": ..., "currency": "EUR", "context": "..."}],
    "dates": [{"value": "...", "context": "..."}],
    "people": [{"name": "...", "role": "..."}],
    "references": [{"type": "...", "value": "..."}]
  },
  "complexity": "simple|moderate|complex",
  "requiresChain": true/false,
  "chainActions": ["action1", "action2"],
  "clarificationNeeded": null or "question to ask"
}`;

export async function classifyWithLLM(message: string): Promise<IntentResult> {
  if (!TOGETHER_API_KEY) {
    // Fallback to quick classification
    const quick = quickClassify(message);
    if (quick) return quick;

    return {
      primaryIntent: 'unknown',
      confidence: 0.3,
      secondaryIntents: [],
      agentId: 'sync',
      entities: extractEntitiesQuick(message),
      complexity: 'moderate',
      requiresChain: false,
    };
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',  // Fast model for classification
        messages: [
          { role: 'system', content: INTENT_CLASSIFICATION_PROMPT },
          { role: 'user', content: message },
        ],
        temperature: 0.1,  // Low temp for consistent classification
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('LLM classification failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const parsed = JSON.parse(content);

    return {
      primaryIntent: parsed.primaryIntent || 'unknown',
      confidence: parsed.confidence || 0.5,
      secondaryIntents: parsed.secondaryIntents || [],
      agentId: parsed.agentId || 'sync',
      entities: parsed.entities || extractEntitiesQuick(message),
      complexity: parsed.complexity || 'moderate',
      suggestedWorkflow: parsed.suggestedWorkflow,
      requiresChain: parsed.requiresChain || false,
      chainActions: parsed.chainActions,
      clarificationNeeded: parsed.clarificationNeeded,
    };

  } catch (error) {
    console.warn('LLM classification failed, using quick classification:', error);
    const quick = quickClassify(message);
    if (quick) return quick;

    return {
      primaryIntent: 'unknown',
      confidence: 0.3,
      secondaryIntents: [],
      agentId: 'sync',
      entities: extractEntitiesQuick(message),
      complexity: 'moderate',
      requiresChain: false,
    };
  }
}

// ============================================================================
// Hybrid Classification (Best of Both)
// ============================================================================

export async function classifyIntent(
  message: string,
  useDeepAnalysis: boolean = false
): Promise<IntentResult> {
  // First try quick classification
  const quickResult = quickClassify(message);

  // If quick classification is confident enough, use it
  if (quickResult && quickResult.confidence > 0.7) {
    return quickResult;
  }

  // For complex messages or when forced, use LLM
  if (useDeepAnalysis || !quickResult || quickResult.confidence < 0.5) {
    return await classifyWithLLM(message);
  }

  // Return quick result if moderately confident
  return quickResult;
}

// ============================================================================
// Intent to Action Mapping
// ============================================================================

export function getActionsForIntent(intent: string): string[] {
  const mapping = INTENT_MAPPING[intent];
  if (mapping) {
    return mapping.actions;
  }

  // Fallback: try to parse intent as action
  const actionPatterns = [
    /^create_(.+)$/,
    /^update_(.+)$/,
    /^list_(.+)$/,
    /^search_(.+)$/,
    /^get_(.+)$/,
  ];

  for (const pattern of actionPatterns) {
    if (pattern.test(intent)) {
      return [intent];
    }
  }

  return [];
}

export function getAgentForIntent(intent: string): string {
  const mapping = INTENT_MAPPING[intent];
  return mapping?.agentId || 'sync';
}
