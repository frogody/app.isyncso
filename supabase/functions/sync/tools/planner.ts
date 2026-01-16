/**
 * SYNC Task Planner
 *
 * Decomposes user requests into step-by-step execution plans.
 * Based on Plan-and-Execute architecture pattern.
 */

import { ActionContext } from './types.ts';

// =============================================================================
// Types
// =============================================================================

export interface TaskPlan {
  id: string;
  goal: string;
  originalRequest: string;
  steps: TaskStep[];
  currentStep: number;
  status: 'planning' | 'awaiting_confirmation' | 'executing' | 'paused' | 'completed' | 'failed';
  needsClarification: boolean;
  clarificationQuestion?: string;
  createdAt: Date;
  completedAt?: Date;
  totalSteps: number;
  completedSteps: number;
  context: PlanContext;
}

export interface TaskStep {
  id: string;
  index: number;
  description: string;
  agent: string;
  action: string;
  inputs: Record<string, any>;
  inputTemplates: Record<string, string>; // Templates like {{step_1.result.id}}
  dependsOn: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  announcement: string;
  completionMessage: string;
  failureMessage: string;
  isCheckpoint: boolean; // Pause for user confirmation
  fallbackAction?: string; // Alternative if this fails
  retryCount: number;
  maxRetries: number;
  executionTimeMs?: number;
}

export interface PlanContext {
  sessionId: string;
  userId?: string;
  companyId?: string;
  conversationHistory: string[];
  extractedEntities: ExtractedEntities;
  previousResults: Map<string, any>;
}

export interface ExtractedEntities {
  clients: Array<{ name: string; company?: string; email?: string }>;
  products: Array<{ name: string; quantity?: number; price?: number }>;
  amounts: Array<{ value: number; currency: string }>;
  dates: Array<{ value: string; context?: string }>;
  emails: string[];
  references: Array<{ type: string; value: string }>;
}

export interface PlanningResult {
  success: boolean;
  plan?: TaskPlan;
  needsClarification: boolean;
  clarificationQuestion?: string;
  error?: string;
}

// =============================================================================
// Action Catalog - All available actions for planning
// =============================================================================

export const ACTION_CATALOG: Record<string, ActionDefinition> = {
  // Finance Actions
  search_prospects: {
    agent: 'growth',
    description: 'Search for a client/prospect in CRM',
    requiredInputs: ['query'],
    optionalInputs: [],
    outputFields: ['id', 'name', 'email', 'company', 'phone'],
  },
  create_prospect: {
    agent: 'growth',
    description: 'Create a new prospect/lead',
    requiredInputs: ['first_name', 'last_name', 'email'],
    optionalInputs: ['company', 'phone', 'notes'],
    outputFields: ['id', 'name', 'email'],
  },
  search_products: {
    agent: 'products',
    description: 'Search for products in inventory',
    requiredInputs: ['query'],
    optionalInputs: [],
    outputFields: ['id', 'name', 'price', 'quantity', 'sku'],
  },
  list_products: {
    agent: 'products',
    description: 'List all products',
    requiredInputs: [],
    optionalInputs: ['limit', 'status'],
    outputFields: ['products'],
  },
  create_proposal: {
    agent: 'finance',
    description: 'Create a proposal/quote for a client',
    requiredInputs: ['client_name', 'items'],
    optionalInputs: ['client_email', 'notes', 'valid_until'],
    outputFields: ['id', 'proposal_number', 'total', 'items'],
  },
  create_invoice: {
    agent: 'finance',
    description: 'Create an invoice',
    requiredInputs: ['client_name', 'items'],
    optionalInputs: ['client_email', 'due_date', 'notes'],
    outputFields: ['id', 'invoice_number', 'total', 'items'],
  },
  create_task: {
    agent: 'tasks',
    description: 'Create a task or reminder',
    requiredInputs: ['title'],
    optionalInputs: ['description', 'due_date', 'priority', 'assignee'],
    outputFields: ['id', 'title', 'due_date'],
  },
  // ==========================================================================
  // EMAIL / PA CAPABILITIES (Composio Gmail Integration)
  // ==========================================================================
  send_email: {
    agent: 'composio',
    description: 'Send a new email via Gmail',
    requiredInputs: ['to', 'subject', 'body'],
    optionalInputs: ['cc', 'bcc', 'attachments'],
    outputFields: ['messageId', 'success'],
  },
  check_inbox: {
    agent: 'composio',
    description: 'Check inbox for new/unread emails',
    requiredInputs: [],
    optionalInputs: ['limit', 'unread_only', 'from', 'subject_contains'],
    outputFields: ['emails', 'count', 'unread_count'],
  },
  fetch_emails: {
    agent: 'composio',
    description: 'Fetch recent emails from inbox',
    requiredInputs: [],
    optionalInputs: ['limit', 'query', 'label'],
    outputFields: ['emails'],
  },
  search_emails: {
    agent: 'composio',
    description: 'Search emails by query (from, subject, content)',
    requiredInputs: ['query'],
    optionalInputs: ['limit', 'date_after', 'date_before'],
    outputFields: ['emails', 'count'],
  },
  reply_to_email: {
    agent: 'composio',
    description: 'Reply to a specific email',
    requiredInputs: ['body'],
    optionalInputs: ['message_id', 'thread_id', 'to', 'cc', 'bcc'],
    outputFields: ['messageId', 'success'],
  },
  forward_email: {
    agent: 'composio',
    description: 'Forward an email to someone',
    requiredInputs: ['message_id', 'to'],
    optionalInputs: ['additional_message'],
    outputFields: ['messageId', 'success'],
  },
  draft_email: {
    agent: 'composio',
    description: 'Create a draft email (not sent)',
    requiredInputs: ['to', 'subject', 'body'],
    optionalInputs: ['cc', 'bcc'],
    outputFields: ['draftId', 'success'],
  },
  get_email_details: {
    agent: 'composio',
    description: 'Get full details of a specific email',
    requiredInputs: ['message_id'],
    optionalInputs: [],
    outputFields: ['id', 'thread_id', 'from', 'to', 'subject', 'date', 'body', 'labels'],
  },
  mark_email_read: {
    agent: 'composio',
    description: 'Mark an email as read',
    requiredInputs: ['message_id'],
    optionalInputs: ['mark_as'],
    outputFields: ['success'],
  },
  archive_email: {
    agent: 'composio',
    description: 'Archive an email',
    requiredInputs: ['message_id'],
    optionalInputs: [],
    outputFields: ['success'],
  },
  summarize_inbox: {
    agent: 'composio',
    description: 'Get a summary of recent important emails',
    requiredInputs: [],
    optionalInputs: ['hours_back', 'priority_only'],
    outputFields: ['summary', 'important_count', 'action_required'],
  },
  // ==========================================================================
  // CALENDAR CAPABILITIES
  // ==========================================================================
  create_calendar_event: {
    agent: 'composio',
    description: 'Create a calendar event',
    requiredInputs: ['title', 'start_time'],
    optionalInputs: ['end_time', 'description', 'attendees', 'location'],
    outputFields: ['eventId', 'link'],
  },
  generate_image: {
    agent: 'create',
    description: 'Generate an AI image',
    requiredInputs: ['prompt'],
    optionalInputs: ['style', 'product_name', 'use_case'],
    outputFields: ['url', 'id'],
  },
  web_search: {
    agent: 'research',
    description: 'Search the web for information',
    requiredInputs: ['query'],
    optionalInputs: [],
    outputFields: ['results', 'summary'],
  },
  get_financial_summary: {
    agent: 'finance',
    description: 'Get financial overview (revenue, expenses)',
    requiredInputs: [],
    optionalInputs: ['period', 'start_date', 'end_date'],
    outputFields: ['revenue', 'expenses', 'profit', 'invoices'],
  },
  list_tasks: {
    agent: 'tasks',
    description: 'List tasks',
    requiredInputs: [],
    optionalInputs: ['status', 'assignee', 'due_before'],
    outputFields: ['tasks'],
  },
  complete_task: {
    agent: 'tasks',
    description: 'Mark a task as complete',
    requiredInputs: ['task_id'],
    optionalInputs: [],
    outputFields: ['success'],
  },
  update_inventory: {
    agent: 'products',
    description: 'Update product stock quantity',
    requiredInputs: ['product_id', 'quantity'],
    optionalInputs: ['adjustment_type'],
    outputFields: ['new_quantity'],
  },
  list_invoices: {
    agent: 'finance',
    description: 'List invoices',
    requiredInputs: [],
    optionalInputs: ['status', 'client', 'limit'],
    outputFields: ['invoices'],
  },
  get_pipeline_stats: {
    agent: 'growth',
    description: 'Get sales pipeline statistics',
    requiredInputs: [],
    optionalInputs: [],
    outputFields: ['stages', 'total_value', 'conversion_rate'],
  },
};

interface ActionDefinition {
  agent: string;
  description: string;
  requiredInputs: string[];
  optionalInputs: string[];
  outputFields: string[];
}

// =============================================================================
// Planning Prompt
// =============================================================================

const PLANNER_SYSTEM_PROMPT = `You are the SYNC Task Planner. Your job is to decompose user requests into step-by-step execution plans.

## Your Capabilities
You can create plans using these actions:
${Object.entries(ACTION_CATALOG).map(([action, def]) =>
  `- ${action} (${def.agent}): ${def.description}
    Inputs: ${[...def.requiredInputs, ...def.optionalInputs.map(i => i + '?')].join(', ') || 'none'}
    Outputs: ${def.outputFields.join(', ')}`
).join('\n')}

## Planning Rules

1. **SIMPLE REQUESTS (1-2 steps)**: Don't over-plan. "Search for product X" = 1 step.

2. **COMPLEX REQUESTS (3-7 steps)**: Break into logical sequence.
   Example: "Send proposal to Erik for 20 oneblades" =
   - Step 1: search_prospects (find Erik)
   - Step 2: search_products (find oneblade)
   - Step 3: create_proposal (create with found data)
   - Step 4: send_email (send to Erik's email)

3. **DEPENDENCIES**: Use {{step_id.field}} to reference previous results.
   Example: inputs: { "to": "{{search_client.result.email}}" }

4. **CLARIFICATION**: If critical info is missing, set needsClarification=true.
   Example: "Make a proposal" → Missing: who for? what products?

5. **ANNOUNCEMENTS**: Write friendly, human messages for each step.
   - announcement: What you're about to do ("Let me find Erik in your contacts...")
   - completionMessage: What you accomplished ("Found Erik Bakker at LogiTech!")
   - Use {{result.field}} placeholders for dynamic data:
     * {{result.count}} - Number of items found
     * {{result.total}} - Same as count (for clarity)
     * {{result.first.name}} - First item's field
     * {{result.items}} - Array of all items
     * {{result.message}} - Action's summary message

6. **CHECKPOINTS**: Set isCheckpoint=true for irreversible actions (send_email, create_invoice).

7. **FALLBACKS**: For critical steps, specify fallbackAction if available.

## Output Format (JSON only, no markdown)

{
  "goal": "Short description of what user wants",
  "needsClarification": false,
  "clarificationQuestion": null,
  "steps": [
    {
      "id": "step_1",
      "description": "Human-readable step description",
      "agent": "growth",
      "action": "search_prospects",
      "inputs": { "query": "Erik" },
      "inputTemplates": {},
      "dependsOn": [],
      "announcement": "Let me find Erik in your contacts...",
      "completionMessage": "Found {{result.name}} at {{result.company}}!",
      "failureMessage": "Couldn't find anyone named Erik. Want me to search differently?",
      "isCheckpoint": false,
      "fallbackAction": null
    }
  ]
}

## Context You Have Access To
- Current date/time
- User's conversation history
- Previously extracted entities (clients, products mentioned)
- Session context

IMPORTANT: Output ONLY valid JSON. No explanations, no markdown code blocks.`;

// =============================================================================
// Entity Extraction
// =============================================================================

export function extractEntities(message: string, conversationHistory: string[] = []): ExtractedEntities {
  const entities: ExtractedEntities = {
    clients: [],
    products: [],
    amounts: [],
    dates: [],
    emails: [],
    references: [],
  };

  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = message.match(emailRegex);
  if (emails) entities.emails = [...new Set(emails)];

  // Extract amounts with currency
  const amountRegex = /[€$£]?\s*(\d+(?:[.,]\d{2})?)\s*(?:euro|euros|€|\$|£|EUR|USD|GBP)?/gi;
  let amountMatch;
  while ((amountMatch = amountRegex.exec(message)) !== null) {
    const value = parseFloat(amountMatch[1].replace(',', '.'));
    if (!isNaN(value) && value > 0) {
      entities.amounts.push({
        value,
        currency: message.includes('$') ? 'USD' : message.includes('£') ? 'GBP' : 'EUR',
      });
    }
  }

  // Extract quantities (numbers followed by product-like words)
  const quantityRegex = /(\d+)\s*(?:x|×)?\s*([a-zA-Z][a-zA-Z\s]{2,})/gi;
  let qtyMatch;
  while ((qtyMatch = quantityRegex.exec(message)) !== null) {
    const quantity = parseInt(qtyMatch[1]);
    const productName = qtyMatch[2].trim();
    if (quantity > 0 && productName.length > 2) {
      entities.products.push({ name: productName, quantity });
    }
  }

  // Extract dates
  const datePatterns = [
    /(?:next|this)\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    /(?:tomorrow|today|yesterday)/gi,
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g,
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?/gi,
  ];

  for (const pattern of datePatterns) {
    const matches = message.match(pattern);
    if (matches) {
      entities.dates.push(...matches.map(m => ({ value: m.toLowerCase(), context: 'mentioned' })));
    }
  }

  // Extract names (capitalized words that look like names)
  const nameRegex = /(?:to|for|from|with|contact|client|send|email)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let nameMatch;
  while ((nameMatch = nameRegex.exec(message)) !== null) {
    const name = nameMatch[1].trim();
    if (name.length > 1 && !['The', 'This', 'That', 'What'].includes(name)) {
      entities.clients.push({ name });
    }
  }

  // Extract invoice/proposal references
  const refRegex = /(INV|PROP|ORD|TASK)[-#]?\d+/gi;
  const refs = message.match(refRegex);
  if (refs) {
    entities.references = refs.map(r => ({
      type: r.substring(0, 3).toUpperCase(),
      value: r,
    }));
  }

  return entities;
}

// =============================================================================
// Plan Generation
// =============================================================================

export async function generatePlan(
  message: string,
  context: PlanContext,
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<PlanningResult> {
  try {
    // Extract entities from the message
    const entities = extractEntities(message, context.conversationHistory);
    context.extractedEntities = entities;

    // Build context for the planner
    const contextInfo = buildContextInfo(context, entities);

    // Call LLM to generate plan
    const userPrompt = `${contextInfo}

User request: "${message}"

Create a step-by-step plan to accomplish this. Output JSON only.`;

    const response = await llmCall(PLANNER_SYSTEM_PROMPT, userPrompt);

    // Parse the response
    const planData = parseJsonResponse(response);

    if (!planData) {
      return {
        success: false,
        needsClarification: false,
        error: 'Failed to generate a valid plan',
      };
    }

    // Check if clarification needed
    if (planData.needsClarification) {
      return {
        success: true,
        needsClarification: true,
        clarificationQuestion: planData.clarificationQuestion,
      };
    }

    // Build the TaskPlan
    const plan: TaskPlan = {
      id: generatePlanId(),
      goal: planData.goal || message,
      originalRequest: message,
      steps: (planData.steps || []).map((step: any, index: number) => ({
        id: step.id || `step_${index + 1}`,
        index,
        description: step.description || '',
        agent: step.agent || 'orchestrator',
        action: step.action || '',
        inputs: step.inputs || {},
        inputTemplates: step.inputTemplates || {},
        dependsOn: step.dependsOn || [],
        status: 'pending' as const,
        announcement: step.announcement || `Working on step ${index + 1}...`,
        completionMessage: step.completionMessage || 'Done!',
        failureMessage: step.failureMessage || 'Something went wrong.',
        isCheckpoint: step.isCheckpoint || false,
        fallbackAction: step.fallbackAction || null,
        retryCount: 0,
        maxRetries: 2,
      })),
      currentStep: 0,
      status: 'awaiting_confirmation',
      needsClarification: false,
      createdAt: new Date(),
      totalSteps: planData.steps?.length || 0,
      completedSteps: 0,
      context,
    };

    return {
      success: true,
      plan,
      needsClarification: false,
    };

  } catch (error) {
    console.error('[Planner] Error generating plan:', error);
    return {
      success: false,
      needsClarification: false,
      error: `Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// =============================================================================
// Plan Formatting for Display
// =============================================================================

export function formatPlanForDisplay(plan: TaskPlan): string {
  const lines: string[] = [];

  lines.push(`Got it! Here's my plan:\n`);

  for (const step of plan.steps) {
    const statusIcon = getStepStatusIcon(step.status);
    lines.push(`${statusIcon} ${step.description}`);
  }

  lines.push(`\nReady to proceed?`);

  return lines.join('\n');
}

export function formatPlanAsList(plan: TaskPlan): string {
  const lines: string[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    lines.push(`${i + 1}. ${step.description}`);
  }

  return lines.join('\n');
}

function getStepStatusIcon(status: TaskStep['status']): string {
  switch (status) {
    case 'pending': return '○';
    case 'running': return '◐';
    case 'completed': return '✓';
    case 'failed': return '✗';
    case 'skipped': return '⊘';
    default: return '○';
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildContextInfo(context: PlanContext, entities: ExtractedEntities): string {
  const parts: string[] = [];

  // Add date context
  const now = new Date();
  parts.push(`Current date: ${now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`);

  // Add extracted entities
  if (entities.clients.length > 0) {
    parts.push(`Mentioned clients: ${entities.clients.map(c => c.name).join(', ')}`);
  }
  if (entities.products.length > 0) {
    parts.push(`Mentioned products: ${entities.products.map(p =>
      p.quantity ? `${p.quantity}x ${p.name}` : p.name
    ).join(', ')}`);
  }
  if (entities.emails.length > 0) {
    parts.push(`Email addresses: ${entities.emails.join(', ')}`);
  }
  if (entities.dates.length > 0) {
    parts.push(`Dates mentioned: ${entities.dates.map(d => d.value).join(', ')}`);
  }
  if (entities.amounts.length > 0) {
    parts.push(`Amounts: ${entities.amounts.map(a => `${a.currency} ${a.value}`).join(', ')}`);
  }

  // Add recent conversation context
  if (context.conversationHistory.length > 0) {
    const recentHistory = context.conversationHistory.slice(-5);
    parts.push(`Recent conversation:\n${recentHistory.join('\n')}`);
  }

  return parts.join('\n');
}

function parseJsonResponse(response: string): any {
  try {
    // Try direct parse first
    return JSON.parse(response);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON object in response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Give up
      }
    }

    return null;
  }
}

function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// Plan Complexity Assessment
// =============================================================================

export function assessComplexity(message: string): 'simple' | 'moderate' | 'complex' {
  const words = message.toLowerCase().split(/\s+/);
  const length = words.length;
  const msgLower = message.toLowerCase();

  // Check for multi-step indicators
  const multiStepIndicators = [
    'and then', 'after that', 'also', 'then',
    'as well', 'plus', 'followed by', 'next'
  ];
  const hasMultiStep = multiStepIndicators.some(ind => msgLower.includes(ind));

  // Check for multiple actions
  const actionWords = ['create', 'send', 'make', 'find', 'search', 'update', 'add', 'schedule', 'generate',
                       'reply', 'forward', 'draft', 'check', 'summarize', 'archive'];
  const actionCount = actionWords.filter(a => msgLower.includes(a)).length;

  // Check for complexity indicators
  const complexIndicators = [
    'follow up', 'remind', 'if', 'unless', 'when',
    'compare', 'analyze', 'review', 'all', 'every'
  ];
  const hasComplexity = complexIndicators.some(ind => msgLower.includes(ind));

  // Email-specific complexity patterns
  const emailComplexPatterns = [
    /\b(reply|respond).+(to|back)\b/i,           // "reply to the email"
    /\b(forward|send).+to\b/i,                    // "forward this to John"
    /\b(check|summarize).+(inbox|emails?)\b/i,   // "check my inbox"
    /\b(read|show).+(unread|new).+emails?\b/i,   // "show unread emails"
    /\b(draft|write).+(email|response)\b/i,      // "draft an email"
  ];
  const hasEmailTask = emailComplexPatterns.some(p => p.test(message));

  if (hasComplexity || actionCount >= 3 || (hasMultiStep && actionCount >= 2)) {
    return 'complex';
  } else if (hasMultiStep || actionCount >= 2 || length > 20 || hasEmailTask) {
    return 'moderate';
  } else {
    return 'simple';
  }
}

// =============================================================================
// Quick Plan Templates
// =============================================================================

export const QUICK_PLAN_TEMPLATES: Record<string, (entities: ExtractedEntities) => Partial<TaskPlan>> = {
  // "Send proposal to X for Y products"
  send_proposal: (entities) => ({
    goal: 'Create and send proposal',
    steps: [
      {
        id: 'find_client',
        index: 0,
        description: 'Find client in contacts',
        agent: 'growth',
        action: 'search_prospects',
        inputs: { query: entities.clients[0]?.name || '' },
        inputTemplates: {},
        dependsOn: [],
        status: 'pending',
        announcement: `Let me find ${entities.clients[0]?.name || 'the client'} in your contacts...`,
        completionMessage: 'Found {{result.name}}!',
        failureMessage: "Couldn't find that client. Want me to search differently?",
        isCheckpoint: false,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'find_product',
        index: 1,
        description: 'Search for product',
        agent: 'products',
        action: 'search_products',
        inputs: { query: entities.products[0]?.name || '' },
        inputTemplates: {},
        dependsOn: [],
        status: 'pending',
        announcement: `Searching for ${entities.products[0]?.name || 'the product'}...`,
        completionMessage: 'Found {{result.name}} at {{result.price}}!',
        failureMessage: "Couldn't find that product.",
        isCheckpoint: false,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'create_proposal',
        index: 2,
        description: 'Create the proposal',
        agent: 'finance',
        action: 'create_proposal',
        inputs: {},
        inputTemplates: {
          client_name: '{{find_client.result.name}}',
          client_email: '{{find_client.result.email}}',
          items: JSON.stringify([{
            product_id: '{{find_product.result.id}}',
            quantity: entities.products[0]?.quantity || 1,
          }]),
        },
        dependsOn: ['find_client', 'find_product'],
        status: 'pending',
        announcement: 'Creating the proposal...',
        completionMessage: 'Created proposal {{result.proposal_number}}!',
        failureMessage: 'Failed to create proposal.',
        isCheckpoint: false,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'send_email',
        index: 3,
        description: 'Send proposal via email',
        agent: 'composio',
        action: 'send_email',
        inputs: {},
        inputTemplates: {
          to: '{{find_client.result.email}}',
          subject: 'Proposal {{create_proposal.result.proposal_number}}',
          body: 'Please find attached your proposal.',
        },
        dependsOn: ['create_proposal'],
        status: 'pending',
        announcement: 'Sending to {{find_client.result.email}}...',
        completionMessage: 'Email sent!',
        failureMessage: 'Failed to send email.',
        isCheckpoint: true,
        retryCount: 0,
        maxRetries: 2,
      },
    ],
  }),

  // "Create invoice for X"
  create_invoice: (entities) => ({
    goal: 'Create invoice',
    steps: [
      {
        id: 'find_client',
        index: 0,
        description: 'Find client',
        agent: 'growth',
        action: 'search_prospects',
        inputs: { query: entities.clients[0]?.name || '' },
        inputTemplates: {},
        dependsOn: [],
        status: 'pending',
        announcement: 'Finding the client...',
        completionMessage: 'Found {{result.name}}!',
        failureMessage: "Couldn't find client.",
        isCheckpoint: false,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'create_invoice',
        index: 1,
        description: 'Create invoice',
        agent: 'finance',
        action: 'create_invoice',
        inputs: {},
        inputTemplates: {
          client_name: '{{find_client.result.name}}',
          client_email: '{{find_client.result.email}}',
        },
        dependsOn: ['find_client'],
        status: 'pending',
        announcement: 'Creating invoice...',
        completionMessage: 'Created invoice {{result.invoice_number}}!',
        failureMessage: 'Failed to create invoice.',
        isCheckpoint: false,
        retryCount: 0,
        maxRetries: 2,
      },
    ],
  }),
};

// =============================================================================
// Detect if request matches a quick template
// =============================================================================

export function detectQuickTemplate(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  if ((lowerMessage.includes('send') || lowerMessage.includes('email')) &&
      lowerMessage.includes('proposal')) {
    return 'send_proposal';
  }

  if (lowerMessage.includes('create') && lowerMessage.includes('invoice')) {
    return 'create_invoice';
  }

  return null;
}

// =============================================================================
// Core Planning Functions
// =============================================================================

/**
 * Determine if a message should use the Plan-Execute path
 */
export function shouldPlan(message: string): boolean {
  const complexity = assessComplexity(message);

  // Always plan for complex tasks
  if (complexity === 'complex') {
    return true;
  }

  // Plan for moderate tasks that involve multiple steps
  if (complexity === 'moderate') {
    const multiStepIndicators = [
      /\b(and|then|also|after that|next|finally)\b/i,
      /\b(send|email).+(to|for).+/i, // Send something to someone
      /\b(create|make).+(and|then)\b/i,
      /\b(find|search).+(create|send|schedule)\b/i,
    ];
    return multiStepIndicators.some(p => p.test(message));
  }

  return false;
}

/**
 * Create a new task plan from steps
 */
export function createTaskPlan(
  request: string,
  steps: TaskStep[],
  entities: ExtractedEntities
): TaskPlan {
  const plan: TaskPlan = {
    id: crypto.randomUUID(),
    goal: request,
    originalRequest: request,
    steps,
    currentStep: 0,
    status: 'planning',
    needsClarification: false,
    createdAt: new Date(),
    totalSteps: steps.length,
    completedSteps: 0,
    context: {
      entities,
      previousResults: {},
      userPreferences: {},
    },
  };

  return plan;
}

/**
 * Generate a plan using LLM
 */
export async function generatePlanFromLLM(
  message: string,
  entities: ExtractedEntities,
  session: any,
  memoryContext: any,
  apiKey: string
): Promise<TaskPlan | null> {
  try {
    // Check for quick template first
    const templateName = detectQuickTemplate(message);
    if (templateName && QUICK_PLAN_TEMPLATES[templateName]) {
      const template = QUICK_PLAN_TEMPLATES[templateName](entities);
      if (template.steps && template.steps.length > 0) {
        return createTaskPlan(message, template.steps as TaskStep[], entities);
      }
    }

    // Build available actions list for prompt
    const availableActions = Object.entries(ACTION_CATALOG)
      .map(([name, def]) => `- ${name}: ${def.description} (agent: ${def.agent})`)
      .join('\n');

    // Build context from entities
    let entityContext = '';
    if (entities.clients.length > 0) {
      entityContext += `\nMentioned clients: ${entities.clients.join(', ')}`;
    }
    if (entities.products.length > 0) {
      entityContext += `\nMentioned products: ${entities.products.join(', ')}`;
    }
    if (entities.amounts.length > 0) {
      entityContext += `\nMentioned amounts: ${entities.amounts.map(a => `€${a}`).join(', ')}`;
    }
    if (entities.dates.length > 0) {
      entityContext += `\nMentioned dates: ${entities.dates.join(', ')}`;
    }
    if (entities.emails.length > 0) {
      entityContext += `\nMentioned emails: ${entities.emails.join(', ')}`;
    }

    const plannerPrompt = `You are a task planner for a business assistant. Given a user request, create a step-by-step plan.

USER REQUEST: ${message}
${entityContext}

AVAILABLE ACTIONS:
${availableActions}

RULES:
1. Break the task into 2-7 atomic steps
2. Each step must use exactly ONE action from the list above
3. Use dependsOn to chain steps that need previous results
4. Use inputTemplates with {{step_id.result.field}} for data flow between steps
5. If you need to find something before using it, add a search step first
6. If the request is unclear or missing critical info, set needsClarification: true

RESPOND WITH JSON ONLY:
{
  "goal": "Brief description of what we're doing",
  "needsClarification": false,
  "clarificationQuestion": null,
  "steps": [
    {
      "id": "step_1",
      "description": "Human-readable step description",
      "agent": "agent_name",
      "action": "action_name",
      "inputs": { "key": "value" },
      "inputTemplates": { "key": "{{previous_step.result.field}}" },
      "dependsOn": [],
      "announcement": "What to tell user before this step",
      "completionMessage": "What to tell user after (can use {{result.field}})",
      "failureMessage": "What to tell user if it fails",
      "isCheckpoint": false
    }
  ]
}`;

    console.log('[Planner] Generating plan via LLM...');

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/Kimi-K2-Instruct',
        messages: [
          { role: 'system', content: 'You are a task planning assistant. You MUST respond with ONLY valid JSON - no markdown, no explanations, just the JSON object.' },
          { role: 'user', content: plannerPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('[Planner] LLM request failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Planner] No content in LLM response');
      return null;
    }

    // Parse the JSON response
    let planData;
    try {
      planData = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[Planner] Failed to parse LLM response as JSON');
        return null;
      }
    }

    // Convert to TaskPlan
    const steps: TaskStep[] = (planData.steps || []).map((s: any, i: number) => ({
      id: s.id || `step_${i + 1}`,
      index: i,
      description: s.description || `Step ${i + 1}`,
      agent: s.agent || 'orchestrator',
      action: s.action || 'unknown',
      inputs: s.inputs || {},
      inputTemplates: s.inputTemplates || {},
      dependsOn: s.dependsOn || [],
      status: 'pending' as const,
      announcement: s.announcement || `Working on step ${i + 1}...`,
      completionMessage: s.completionMessage || 'Done!',
      failureMessage: s.failureMessage || 'This step failed.',
      isCheckpoint: s.isCheckpoint || false,
      retryCount: 0,
      maxRetries: 2,
    }));

    const plan = createTaskPlan(message, steps, entities);
    plan.goal = planData.goal || message;
    plan.needsClarification = planData.needsClarification || false;
    plan.clarificationQuestion = planData.clarificationQuestion;

    return plan;

  } catch (error) {
    console.error('[Planner] Error generating plan:', error);
    return null;
  }
}

/**
 * Save a plan to the database
 */
export async function savePlan(supabase: any, plan: TaskPlan): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sync_task_plans')
      .upsert({
        id: plan.id,
        session_id: plan.context.sessionId || 'unknown',
        user_id: plan.context.userId,
        company_id: plan.context.companyId,
        goal: plan.goal,
        steps: plan.steps,
        current_step: plan.currentStep,
        status: plan.status,
        created_at: plan.createdAt,
        completed_at: plan.completedAt,
      });

    if (error) {
      console.error('[Planner] Failed to save plan:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Planner] Error saving plan:', error);
    return false;
  }
}

/**
 * Load a plan from the database
 */
export async function loadPlan(supabase: any, planId: string): Promise<TaskPlan | null> {
  try {
    const { data, error } = await supabase
      .from('sync_task_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !data) {
      console.error('[Planner] Failed to load plan:', error);
      return null;
    }

    const plan: TaskPlan = {
      id: data.id,
      goal: data.goal,
      originalRequest: data.goal,
      steps: data.steps || [],
      currentStep: data.current_step || 0,
      status: data.status || 'planning',
      needsClarification: false,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      totalSteps: data.steps?.length || 0,
      completedSteps: data.steps?.filter((s: any) => s.status === 'completed').length || 0,
      context: {
        entities: {},
        previousResults: {},
        userPreferences: {},
        sessionId: data.session_id,
        userId: data.user_id,
        companyId: data.company_id,
      },
    };

    return plan;
  } catch (error) {
    console.error('[Planner] Error loading plan:', error);
    return null;
  }
}
