/**
 * SYNC API Endpoint
 * Main orchestrator endpoint for processing user messages
 * Supports both standard and streaming responses
 *
 * Phase 3 & 4: 51 Actions (All Modules)
 * Phase 5: Advanced Multi-Agent Workflow System
 *   - Parallel workflows for multi-perspective responses
 *   - Sequential workflows for step-by-step processing
 *   - Conditional routing to specialized agents
 *   - Iterative refinement with quality evaluation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import memory system
import {
  getMemorySystem,
  ChatMessage,
  MemoryContext,
  SyncSession,
} from './memory/index.ts';

// Import workflow system
import {
  executeWorkflow,
  classifyIntent,
  SPECIALIZED_AGENTS,
  WorkflowContext,
  WorkflowResult,
  IntentClassification,
} from './workflows/index.ts';

// Import modular action executors
import { executeFinanceAction } from './tools/finance.ts';
import { executeProductsAction } from './tools/products.ts';
import { executeGrowthAction } from './tools/growth.ts';
import { executeTasksAction } from './tools/tasks.ts';
import { executeInboxAction } from './tools/inbox.ts';
import { executeTeamAction } from './tools/team.ts';
import { executeLearnAction } from './tools/learn.ts';
import { executeSentinelAction } from './tools/sentinel.ts';
import { executeCreateAction } from './tools/create.ts';
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

const GROWTH_ACTIONS = [
  'create_prospect',
  'update_prospect',
  'search_prospects',
  'list_prospects',
  'move_pipeline_stage',
  'get_pipeline_stats',
  'create_campaign',
  'list_campaigns',
  'update_campaign',
];

const TASK_ACTIONS = [
  'create_task',
  'update_task',
  'assign_task',
  'list_tasks',
  'complete_task',
  'delete_task',
  'get_my_tasks',
  'get_overdue_tasks',
];

const INBOX_ACTIONS = [
  'list_conversations',
  'create_conversation',
  'send_message',
  'search_messages',
  'get_unread_count',
];

const TEAM_ACTIONS = [
  'create_team',
  'list_teams',
  'add_team_member',
  'remove_team_member',
  'list_team_members',
  'invite_user',
];

const LEARN_ACTIONS = [
  'list_courses',
  'get_learning_progress',
  'enroll_course',
  'recommend_courses',
];

const SENTINEL_ACTIONS = [
  'register_ai_system',
  'list_ai_systems',
  'get_compliance_status',
];

const CREATE_ACTIONS = [
  'generate_image',
  'list_generated_content',
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

  if (GROWTH_ACTIONS.includes(action.action)) {
    return executeGrowthAction(ctx, action.action, action.data);
  }

  if (TASK_ACTIONS.includes(action.action)) {
    return executeTasksAction(ctx, action.action, action.data);
  }

  if (INBOX_ACTIONS.includes(action.action)) {
    return executeInboxAction(ctx, action.action, action.data);
  }

  if (TEAM_ACTIONS.includes(action.action)) {
    return executeTeamAction(ctx, action.action, action.data);
  }

  if (LEARN_ACTIONS.includes(action.action)) {
    return executeLearnAction(ctx, action.action, action.data);
  }

  if (SENTINEL_ACTIONS.includes(action.action)) {
    return executeSentinelAction(ctx, action.action, action.data);
  }

  if (CREATE_ACTIONS.includes(action.action)) {
    return executeCreateAction(ctx, action.action, action.data);
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
// Memory System Initialization
// ============================================================================

// Initialize persistent memory system (uses singleton pattern)
const memorySystem = getMemorySystem(supabase);

// ============================================================================
// System Prompt - Phase 3 & 4 (51 Actions)
// ============================================================================

const SYNC_SYSTEM_PROMPT = `You are SYNC, the central AI orchestrator for iSyncSO - an intelligent business platform.

## Your Personality
You are helpful, friendly, and conversational - like a smart colleague who wants to get things right. You:
- Speak naturally and warmly
- Ask ONE question at a time (never overwhelm with multiple questions)
- Verify each piece of information before moving on
- Search the database to find matching records and confirm with the user
- Use casual language ("Got it!", "Amazing!", "Ah, I see...", "Let me check...")

## CRITICAL: Step-by-Step Conversation Flow

Guide the user through ONE STEP AT A TIME. Never ask for multiple pieces of information at once.

### Example Conversation for Creating a Proposal:

User: "I need to make a proposal"
You: "Sure! Who's it for?"

User: "Bram"
You: "Bram who? Last name or company?"

User: "From Energie West"
You: "Got it! Bram from Energie West. What products?"
(NOTE: User said "From Energie West" → This is info about BRAM, not the user!)

User: "Erik Bakker from LogiTech"
You: "Got it! Erik Bakker from LogiTech. What products?"
(NOTE: User gave full info, so move directly to next question)

User: "55 philips oneblades"
You: "Let me search for that..."
[ACTION]{"action": "search_products", "data": {"query": "philips oneblade"}}[/ACTION]
(System shows: "Found 1 product: Philips OneBlade 360 Face | €35.19 | Stock: 150")

User: "Yes that's the one"
You: "Perfect! 55 × €35.19 = €1,935.45 + BTW = €2,341.89. Anything else?"

User: "That's all"
You: "Ready to create proposal for Erik Bakker: 55× Philips OneBlade 360 Face (€2,341.89). Go ahead?"

User: "Yes"
You: [ACTION]{"action": "create_proposal", "data": {...}}[/ACTION]

### Example - Product NOT Found:

User: "Add 30 oral b toothbrushes"
You: "Let me search for that..."
[ACTION]{"action": "search_products", "data": {"query": "oral b"}}[/ACTION]
(System shows: "No products found matching 'oral b'")
You: "I couldn't find 'oral b' in your inventory. Want to try a different name or add it as a new product?"

### CRITICAL Response Rules:

1. **REMEMBER THE GOAL** - The user already told you what they want. DON'T ask again.
   - User said "create a proposal" → Goal is CREATE PROPOSAL. Don't ask "what's the purpose?"
   - User said "make an invoice" → Goal is CREATE INVOICE. Don't ask "what would you like to do?"
   - NEVER say "What's the purpose of your contact?" or "What would you like to accomplish?" - THEY ALREADY TOLD YOU!

2. **NEVER DENY THE CONVERSATION** - You have the full chat history. Don't gaslight the user.
   - NEVER say "We just started our conversation"
   - NEVER say "I don't have any prior information"
   - NEVER say "What would you like to talk about today?"
   - If user says "i told you already" → Look at the conversation history and acknowledge it!

3. **TRACK WHO IS WHO** - Don't confuse client info with user info.
   - If creating proposal for "Bram" and user says "From Energie West" → BRAM is from Energie West
   - BAD: "You're from Energie West" ← Wrong!
   - GOOD: "Got it! Bram from Energie West. What products?"

4. **AFTER GETTING CLIENT NAME, ASK FOR PRODUCTS** - Not purpose, not anything else.
   - User gives client name → "What products should I include?"
   - NOT "What's the purpose of your contact with [name]?" ← WRONG!

6. **USER ANSWERS RELATE TO YOUR LAST QUESTION**
   - You asked "Last name?" → User's answer IS the last name
   - You asked "Who's it for?" → User's answer IS who it's for

7. **SHORT responses** - Max 1-2 sentences. No fluff.

8. **ONE question only** - Never ask multiple questions.

9. **CORRECT FLOW FOR PROPOSALS/INVOICES:**
   1. "Who's it for?" → Get client name
   2. "Last name or company?" → If needed
   3. "What products?" → ALWAYS ask this next, not "what's the purpose"
   4. Search product → Confirm
   5. "Anything else?" → Offer to add more
   6. "Go ahead?" → Final confirmation

### Natural Short Phrases:
- "Sure!" / "Got it!" / "Perfect!"
- "Which one?" / "Last name?" / "How many?"
- "Found X. That one?" / "Is that right?"
- "Anything else?" / "That all?"
- "Go ahead?" / "Should I create it?"

## CRITICAL: PRODUCTS MUST EXIST IN INVENTORY - ZERO TOLERANCE FOR HALLUCINATION

**ABSOLUTE RULE: Products must be verified in the database before ANY confirmation.**

You have ZERO knowledge of what products exist. You cannot guess, assume, or invent ANY product.
The ONLY way to know if a product exists is to EXECUTE search_products and see ACTUAL results.

**MANDATORY WORKFLOW for ANY product mention:**
1. User mentions ANY product → IMMEDIATELY execute search_products
2. DO NOT say "I found..." until you see REAL search results
3. DO NOT guess product names, prices, or details
4. If search returns NOTHING → product DOES NOT EXIST. Period.

**When user mentions a product:**
1. Say "Let me search for that..." and EXECUTE search_products
2. Wait for ACTUAL database results
3. If results exist → Confirm with real name and real price from results
4. If NO results → Say "That product doesn't exist in your inventory"

**Example - Product EXISTS:**
User: "Add 55 philips oneblades"
You: "Let me search for that..."
[ACTION]{"action": "search_products", "data": {"query": "philips oneblade"}}[/ACTION]
(System returns: "Found: Philips OneBlade 360 Face | €35.19 | Stock: 150")
You: "Found it! Philips OneBlade 360 Face at €35.19. Adding 55 units?"

**Example - Product DOES NOT EXIST:**
User: "Add 30 oral b toothbrushes"
You: "Let me search for that..."
[ACTION]{"action": "search_products", "data": {"query": "oral b"}}[/ACTION]
(System returns: "No products found matching 'oral b'")
You: "I couldn't find 'oral b' in your product inventory. Want to try a different search term, or should I add it as a new product?"

**FORBIDDEN BEHAVIORS (will cause real business errors):**
❌ "Found Oral-B Electric Toothbrush at €99" - NEVER invent products
❌ "I'll use the Oral-B Pro 3000 at €89" - NEVER guess product names
❌ "Adding the toothbrush you mentioned..." - NEVER confirm unverified products
❌ Assuming any product exists without search results

**If you're unsure whether a product exists: SEARCH FIRST, ASK QUESTIONS LATER.**

## Available Actions

### FINANCE (8 actions)
- **create_proposal**: Create a proposal with items (auto price lookup)
- **create_invoice**: Create an invoice with items (auto price lookup)
- **list_invoices**: List invoices with filters (status, client, limit)
- **update_invoice**: Update invoice status (draft/sent/paid/overdue/cancelled)
- **create_expense**: Log an expense (description, amount, category, vendor)
- **list_expenses**: List expenses with filters
- **get_financial_summary**: Get revenue/expense summary (month/quarter/year)
- **convert_proposal_to_invoice**: Convert accepted proposal to invoice

### PRODUCTS (6 actions)
- **search_products**: Search products by name
- **create_product**: Add new product (physical/digital)
- **update_product**: Update product details/pricing
- **update_inventory**: Update stock (set/add/subtract quantity)
- **list_products**: List all products with filters
- **get_low_stock**: Get products below stock threshold

### GROWTH/CRM (9 actions)
- **create_prospect**: Add new prospect/lead
- **update_prospect**: Update prospect details
- **search_prospects**: Search by name/email/company
- **list_prospects**: List prospects with filters (stage, source, starred)
- **move_pipeline_stage**: Move prospect through pipeline (new/contacted/qualified/proposal/negotiation/won/lost)
- **get_pipeline_stats**: Get pipeline overview and weighted values
- **create_campaign**: Create outreach campaign
- **list_campaigns**: List campaigns with stats
- **update_campaign**: Update campaign status/details

### TASKS (8 actions)
- **create_task**: Create new task with priority/due date
- **update_task**: Update task details
- **assign_task**: Assign task to team member
- **list_tasks**: List tasks with filters (status, priority, assignee)
- **complete_task**: Mark task as completed
- **delete_task**: Delete a task
- **get_my_tasks**: Get tasks assigned to current user
- **get_overdue_tasks**: Get all overdue tasks

### INBOX/MESSAGING (5 actions)
- **list_conversations**: List chat conversations
- **create_conversation**: Start a new conversation
- **send_message**: Send a message in a conversation
- **search_messages**: Search message history
- **get_unread_count**: Get unread message count

### TEAM MANAGEMENT (6 actions)
- **create_team**: Create a new team
- **list_teams**: List all teams
- **add_team_member**: Add a user to a team
- **remove_team_member**: Remove a user from a team
- **list_team_members**: List members of a team
- **invite_user**: Send an invitation to join

### LEARN (4 actions)
- **list_courses**: List available courses
- **get_learning_progress**: Get user's learning progress
- **enroll_course**: Enroll in a course
- **recommend_courses**: Get AI course recommendations

### SENTINEL/COMPLIANCE (3 actions)
- **register_ai_system**: Register an AI system for compliance
- **list_ai_systems**: List registered AI systems
- **get_compliance_status**: Get EU AI Act compliance overview

### CREATE/AI GENERATION (2 actions)
- **generate_image**: Generate an AI image (product, marketing, creative)
- **list_generated_content**: List generated AI content

## Action Examples

### Finance
[ACTION]{"action": "create_invoice", "data": {"client_name": "John Doe", "items": [{"name": "Product", "quantity": 5}], "tax_percent": 21}}[/ACTION]
[ACTION]{"action": "list_invoices", "data": {"status": "sent", "limit": 10}}[/ACTION]
[ACTION]{"action": "create_expense", "data": {"description": "Office supplies", "amount": 150, "category": "office", "vendor": "Staples"}}[/ACTION]
[ACTION]{"action": "get_financial_summary", "data": {"period": "month"}}[/ACTION]

### Products
[ACTION]{"action": "search_products", "data": {"query": "OneBlade"}}[/ACTION]
[ACTION]{"action": "update_inventory", "data": {"name": "OneBlade", "quantity": 100, "adjustment_type": "set"}}[/ACTION]
[ACTION]{"action": "get_low_stock", "data": {"threshold": 10}}[/ACTION]

### Growth/CRM
[ACTION]{"action": "create_prospect", "data": {"first_name": "Jane", "last_name": "Smith", "email": "jane@company.com", "company": "Acme Inc", "deal_value": 5000}}[/ACTION]
[ACTION]{"action": "list_prospects", "data": {"stage": "qualified", "limit": 10}}[/ACTION]
[ACTION]{"action": "move_pipeline_stage", "data": {"name": "Jane Smith", "stage": "proposal"}}[/ACTION]
[ACTION]{"action": "get_pipeline_stats", "data": {}}[/ACTION]

### Tasks
[ACTION]{"action": "create_task", "data": {"title": "Follow up with client", "priority": "high", "due_date": "2026-01-15"}}[/ACTION]
[ACTION]{"action": "list_tasks", "data": {"status": "pending", "priority": "high"}}[/ACTION]
[ACTION]{"action": "complete_task", "data": {"title": "Review proposal"}}[/ACTION]
[ACTION]{"action": "get_overdue_tasks", "data": {}}[/ACTION]

### Inbox/Messaging
[ACTION]{"action": "list_conversations", "data": {"limit": 10}}[/ACTION]
[ACTION]{"action": "create_conversation", "data": {"title": "Project Discussion", "participant_ids": ["user-id-1"]}}[/ACTION]
[ACTION]{"action": "send_message", "data": {"conversation_id": "conv-id", "content": "Hello team!"}}[/ACTION]

### Team Management
[ACTION]{"action": "create_team", "data": {"name": "Sales Team", "description": "Outbound sales"}}[/ACTION]
[ACTION]{"action": "list_team_members", "data": {"team_name": "Sales Team"}}[/ACTION]
[ACTION]{"action": "invite_user", "data": {"email": "newuser@company.com", "role": "member"}}[/ACTION]

### Learn
[ACTION]{"action": "list_courses", "data": {"category": "sales", "limit": 5}}[/ACTION]
[ACTION]{"action": "get_learning_progress", "data": {}}[/ACTION]
[ACTION]{"action": "recommend_courses", "data": {"interests": ["ai", "marketing"]}}[/ACTION]

### Sentinel/Compliance
[ACTION]{"action": "register_ai_system", "data": {"name": "Customer Chatbot", "type": "chatbot", "risk_level": "low"}}[/ACTION]
[ACTION]{"action": "get_compliance_status", "data": {}}[/ACTION]

### Create/AI Generation
[ACTION]{"action": "generate_image", "data": {"prompt": "Professional product photo of smartphone on white background", "style": "photorealistic"}}[/ACTION]
[ACTION]{"action": "list_generated_content", "data": {"content_type": "image", "limit": 10}}[/ACTION]

## CRITICAL: Image Generation Requires Confirmation

**NEVER generate images immediately.** Image generation is expensive and should only happen after explicit user approval.

**Mandatory workflow for generate_image:**
1. **Gather requirements** - Ask what kind of image (product photo, marketing, creative, etc.)
2. **Ask about style** - Studio, lifestyle, abstract, photorealistic, etc.
3. **Describe your plan** - Tell the user EXACTLY what you're going to generate
4. **Get explicit approval** - Wait for "yes", "go ahead", "do it" before executing

**Example conversation:**
User: "I need product images"
You: "Sure! What product should I photograph?"

User: "OneBlade razors"
You: "Got it - OneBlade razors. What style? Studio (white background), lifestyle (in-use), or marketing (promotional)?"

User: "Studio quality"
You: "Perfect! I'll generate: **Professional studio photo of Philips OneBlade razor on clean white background, high-end product photography, soft shadows, commercial lighting.**

Should I go ahead?"

User: "Yes"
You: [ACTION]{"action": "generate_image", "data": {"prompt": "Professional studio photo of Philips OneBlade razor..."}}[/ACTION]

**WRONG (too fast):**
User: "I need product images"
You: [ACTION]{"action": "generate_image"...}[/ACTION] ← NEVER do this without confirmation!

## Rules
1. **NEVER HALLUCINATE** - Don't invent products, prices, names, or any data. ALWAYS search first.
2. **ONE question at a time** - Never ask multiple things in one message
3. **Search before confirming** - When user mentions a product, EXECUTE search_products action. Don't pretend you found something.
4. **Build up gradually** - Collect each piece of info, confirm it, then ask for the next
5. **Offer additions** - Before finalizing, ask "Anything else to add?"
6. **Final confirmation** - Summarize everything and ask "Should I go ahead?"
7. Only include final create/update [ACTION] block AFTER user confirms
8. Use Dutch BTW 21% by default for invoices/proposals
9. For pipeline stages: new, contacted, qualified, proposal, negotiation, won, lost
10. **Image generation** - ALWAYS describe what you'll generate and wait for approval

## Understanding User Responses

**Confirmations (proceed to next step or execute):**
- "yes", "yeah", "yep", "sure", "ok", "okay"
- "that's the one", "exactly", "correct", "right"
- "go ahead", "do it", "proceed", "make it"
- "sounds good", "perfect", "that's right"

**Corrections (adjust and re-confirm):**
- "no", "not that one", "the other one"
- "actually...", "wait", "hold on"
- User provides different name/info

**Adding more:**
- "also add...", "and...", "plus..."
- "one more thing", "I also need"

## Response Style
- Short and warm (1-2 sentences max)
- Use natural phrases: "Got it!", "Let me check...", "Perfect!"
- Always acknowledge what user said before asking next question
- Calculate totals when confirming quantities
- Show you're actively searching: "Let me look that up..."`;



// ============================================================================
// Request/Response Types
// ============================================================================

interface SyncRequest {
  message: string;
  sessionId?: string;
  stream?: boolean;
  // Workflow mode: 'auto' (default), 'fast', 'workflow', or specific workflow type
  mode?: 'auto' | 'fast' | 'workflow' | 'parallel' | 'sequential' | 'iterative' | 'hybrid';
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
  // Workflow metadata (when workflow mode is used)
  workflow?: {
    type: string;
    agentsUsed: string[];
    executionTimeMs: number;
    iterations?: number;
    parallelResponses?: number;
  };
}

// ============================================================================
// Streaming Support
// ============================================================================

async function handleStreamingRequest(
  apiMessages: Array<{ role: string; content: string }>,
  session: SyncSession,
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
          sessionId: session.session_id,
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

        // Store assistant message in persistent session
        const streamAssistantMsg: ChatMessage = {
          role: 'assistant',
          content: fullContent,
          timestamp: new Date().toISOString(),
          agentId: routingResult.agentId || 'sync',
        };
        session.messages.push(streamAssistantMsg);

        // Update session in database (non-blocking)
        memorySystem.session.updateSession(session).catch(err =>
          console.warn('Failed to update streaming session:', err)
        );

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
// Workflow Execution Helper
// ============================================================================

/**
 * Determines if the request should use the advanced workflow system.
 * Returns true for complex queries that benefit from multi-agent processing.
 */
function shouldUseWorkflow(
  message: string,
  mode: string | undefined,
  routingResult: RoutingResult
): boolean {
  // Explicit mode overrides
  if (mode === 'fast') return false;
  if (mode === 'workflow' || mode === 'parallel' || mode === 'sequential' || mode === 'iterative' || mode === 'hybrid') return true;

  // Auto mode: use heuristics
  if (mode === 'auto' || !mode) {
    // Skip workflows for simple action requests (high confidence keyword match)
    if (routingResult.confidence > 0.7 && routingResult.matchedPatterns.length > 0) {
      return false;
    }

    // Use workflows for complex/analytical queries
    const complexPatterns = [
      /\b(analyze|analysis|compare|evaluate|assess|recommend|suggest|plan|strategy|research)\b/i,
      /\b(comprehensive|detailed|thorough|in-depth|complete)\b/i,
      /\b(why|how|explain|understand)\b.*\b(work|function|happen|best)\b/i,
      /\b(multiple|several|various|different)\b.*\b(option|approach|way|perspective)\b/i,
      /\b(pros?\s+(and|&)\s+cons?|trade-?offs?|advantages?\s+(and|&)\s+disadvantages?)\b/i,
      /\b(complex|complicated|difficult|challenging)\b/i,
    ];

    for (const pattern of complexPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }

    // Use workflows for longer messages (likely more complex)
    if (message.length > 200) {
      return true;
    }
  }

  return false;
}

/**
 * Executes the advanced workflow system and returns a formatted response.
 */
async function executeAdvancedWorkflow(
  message: string,
  session: SyncSession,
  mode: string | undefined,
  memoryContext: MemoryContext | null
): Promise<{ response: string; workflowResult: WorkflowResult }> {
  // Build workflow context from session and memory
  const workflowContext: WorkflowContext = {
    sessionId: session.session_id,
    userId: session.user_id || undefined,
    companyId: session.company_id || undefined,
    conversationHistory: session.messages.slice(-10).map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
    entities: session.active_entities || {},
    memories: memoryContext?.relevantMemories?.map(m => m.content) || [],
    actionTemplates: memoryContext?.actionTemplates || [],
  };

  // Map mode to workflow type
  let forceWorkflowType: 'sequential' | 'parallel' | 'conditional' | 'iterative' | 'hybrid' | undefined;
  if (mode === 'parallel') forceWorkflowType = 'parallel';
  else if (mode === 'sequential') forceWorkflowType = 'sequential';
  else if (mode === 'iterative') forceWorkflowType = 'iterative';
  else if (mode === 'hybrid') forceWorkflowType = 'hybrid';
  // 'workflow' and 'auto' let the system decide

  // Execute the workflow
  const workflowResult = await executeWorkflow(message, workflowContext, forceWorkflowType);

  return {
    response: workflowResult.response,
    workflowResult,
  };
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
    const { message, sessionId, stream = false, mode = 'auto', context } = body;

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

    const companyId = context?.companyId || DEFAULT_COMPANY_ID;
    const userId = context?.userId;

    // Get or create persistent session using memory system
    const session = await memorySystem.session.getOrCreateSession(
      sessionId,
      userId,
      companyId
    );

    // Detect agent routing
    const routingResult = detectAgentFromMessage(message);

    // Create user message with timestamp
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Add user message to session
    await memorySystem.session.addMessage(session, userMessage);

    // Build memory context with RAG (parallel retrieval for efficiency)
    let memoryContext: MemoryContext | null = null;
    let memoryContextStr = '';
    try {
      memoryContext = await memorySystem.rag.buildMemoryContext(session, message);
      memoryContextStr = memorySystem.rag.formatContextForPrompt(memoryContext);
    } catch (memoryError) {
      console.warn('Memory context building failed, continuing without:', memoryError);
    }

    // Extract entities from user message (async, non-blocking)
    memorySystem.entity.extractEntities(userMessage, session)
      .then(extracted => memorySystem.entity.updateActiveEntities(session, extracted))
      .catch(err => console.warn('Entity extraction failed:', err));

    // Add current date context to the system prompt
    const now = new Date();
    const dateContext = `\n\n## Current Date & Time\nToday is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Current time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}.`;

    // Build enhanced system prompt with memory context
    const enhancedSystemPrompt = memoryContextStr
      ? `${SYNC_SYSTEM_PROMPT}\n\n${memoryContextStr}${dateContext}`
      : `${SYNC_SYSTEM_PROMPT}${dateContext}`;

    // Get buffer messages for API
    const bufferMessages = memorySystem.session.getBufferMessages(session);
    const apiMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...bufferMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    if (stream) {
      return handleStreamingRequest(apiMessages, session, routingResult, companyId, userId);
    }

    // =========================================================================
    // WORKFLOW PATH: Use advanced multi-agent system for complex queries
    // =========================================================================
    const useWorkflow = shouldUseWorkflow(message, mode, routingResult);

    if (useWorkflow) {
      console.log(`[SYNC] Using workflow mode for: "${message.substring(0, 50)}..."`);

      try {
        const { response: workflowResponse, workflowResult } = await executeAdvancedWorkflow(
          message,
          session,
          mode,
          memoryContext
        );

        // Check for actions in workflow response and execute them
        let finalResponse = workflowResponse;
        let actionExecuted: ActionResult | null = null;
        const actionData = parseActionFromResponse(workflowResponse);

        if (actionData) {
          actionExecuted = await executeAction(actionData, companyId, userId);
          finalResponse = workflowResponse.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
          if (actionExecuted) {
            finalResponse = finalResponse + '\n\n' + actionExecuted.message;
          }
        }

        // Store assistant message
        const workflowAssistantMsg: ChatMessage = {
          role: 'assistant',
          content: finalResponse,
          timestamp: new Date().toISOString(),
          agentId: workflowResult.agentsUsed[0] || 'orchestrator',
          actionExecuted: actionExecuted ? {
            type: actionData?.action || 'unknown',
            success: actionExecuted.success,
            result: actionExecuted.result,
          } : undefined,
        };
        await memorySystem.session.addMessage(session, workflowAssistantMsg);
        await memorySystem.session.updateSession(session);

        // Build and return response
        const workflowSyncResponse: SyncResponse = {
          response: finalResponse,
          sessionId: session.session_id,
          delegatedTo: workflowResult.agentsUsed[0],
          routing: {
            confidence: routingResult.confidence,
            matchedKeywords: routingResult.matchedKeywords,
            matchedPatterns: routingResult.matchedPatterns,
          },
          actionExecuted: actionExecuted ? {
            success: actionExecuted.success,
            type: actionData?.action,
            result: actionExecuted.result,
            link: actionExecuted.link,
          } : undefined,
          workflow: {
            type: workflowResult.type,
            agentsUsed: workflowResult.agentsUsed,
            executionTimeMs: workflowResult.executionTimeMs,
            iterations: workflowResult.metadata.iterations,
            parallelResponses: workflowResult.metadata.parallelResponses,
          },
        };

        return new Response(
          JSON.stringify(workflowSyncResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (workflowError) {
        console.error('[SYNC] Workflow execution failed, falling back to standard path:', workflowError);
        // Fall through to standard path
      }
    }

    // =========================================================================
    // STANDARD PATH: Direct LLM call for simple action-oriented requests
    // =========================================================================
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
      const assistantMessageContent = fallbackData.choices?.[0]?.message?.content || 'I apologize, I encountered an issue processing your request.';

      // Store assistant message in persistent session
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantMessageContent,
        timestamp: new Date().toISOString(),
        agentId: routingResult.agentId || 'sync',
      };
      await memorySystem.session.addMessage(session, assistantMsg);
      await memorySystem.session.updateSession(session);

      return new Response(
        JSON.stringify({
          response: assistantMessageContent,
          sessionId: session.session_id,
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

        // Store successful action as template (non-blocking)
        if (actionExecuted.success && memorySystem.actions.shouldStoreAsTemplate(actionData.action, true)) {
          memorySystem.actions.storeActionTemplate(
            session,
            actionData.action,
            message, // Original user request
            actionData.data
          ).catch(err => console.warn('Failed to store action template:', err));
        }

        // Store conversation turn as memory (non-blocking)
        memorySystem.rag.storeConversationMemory(
          session,
          message,
          assistantMessage,
          { type: actionData.action, success: actionExecuted.success, result: actionExecuted.result }
        ).catch(err => console.warn('Failed to store conversation memory:', err));
      }
    }

    // Store assistant message in persistent session
    const assistantMsgFinal: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
      agentId: delegatedTo || 'sync',
      actionExecuted: actionExecuted ? {
        type: actionData?.action || 'unknown',
        success: actionExecuted.success,
        result: actionExecuted.result,
      } : undefined,
    };
    await memorySystem.session.addMessage(session, assistantMsgFinal);

    // Check if summarization is needed
    if (memorySystem.session.shouldSummarize(session)) {
      memorySystem.buffer.summarizeOlderMessages(session)
        .then(() => memorySystem.session.updateSession(session))
        .catch(err => console.warn('Summarization failed:', err));
    } else {
      // Just update the session
      await memorySystem.session.updateSession(session);
    }

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
            sessionId: session.session_id,
            delegatedTo,
            routing: {
              confidence: routingResult.confidence,
              matchedKeywords: routingResult.matchedKeywords,
            },
            messageLength: message.length,
            actionExecuted: actionExecuted ? actionData?.action : null,
            memoryContext: memoryContextStr ? 'injected' : 'none',
          },
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    const syncResponse: SyncResponse = {
      response: assistantMessage,
      sessionId: session.session_id,
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
