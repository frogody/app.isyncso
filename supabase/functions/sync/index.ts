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
import { executeResearchAction } from './tools/research.ts';
import { executeComposioAction, COMPOSIO_ACTIONS } from './tools/composio.ts';
import { ActionContext, ActionResult, ChainedAction, ActionChainResult } from './tools/types.ts';

// Import new improvement modules
import { handleActionFailure, executeWithRecovery, RecoveryResult } from './tools/recovery.ts';
import {
  parseActionChain,
  parseMultipleActions,
  executeActionChain,
  detectChainIntent,
  CHAIN_TEMPLATES,
  ActionChain,
} from './tools/chaining.ts';
import {
  classifyIntent as classifyIntentLLM,
  quickClassify,
  IntentResult,
  getActionsForIntent,
  getAgentForIntent,
} from './tools/intent.ts';
import {
  generatePostActionInsights,
  extractAndLearnPreferences,
  generateContextualSuggestions,
  formatInsightsForResponse,
  ProactiveInsight,
  enrichContextForQuery,
  formatEnrichmentForPrompt,
  ContextEnrichment,
} from './tools/proactive.ts';
// Import intelligence orchestration modules
import {
    orchestrateIntelligence,
    enhanceResponse,
    generateEnhancedSystemContext,
    IntelligenceResult
} from './tools/intelligence-orchestrator.ts';

import {
  detectOrchestrationWorkflow,
  extractWorkflowContext,
  executeOrchestrationWorkflow,
  getContextQuestions,
  OrchestrationWorkflow,
  OrchestrationResult,
  ORCHESTRATION_WORKFLOWS,
} from './tools/orchestration.ts';
import {
  executeReActLoop,
  shouldUseReAct,
  formatReActStepsForUser,
  ReActContext,
  ReActResult,
} from './tools/react.ts';
import {
  KnowledgeGraph,
  extractEntityMentions,
  formatEntityContext,
} from './tools/knowledge-graph.ts';
import {
  synthesizeResults,
  formatSynthesizedResult,
  SynthesizedResult,
} from './tools/synthesis.ts';

// Import Plan-Execute system (Co-Worker upgrade)
import {
  createTaskPlan,
  TaskPlan,
  TaskStep,
  extractEntities,
  shouldPlan,
  generatePlanFromLLM,
  savePlan,
  loadPlan,
  ACTION_CATALOG,
} from './tools/planner.ts';
import {
  executePlan,
  ExecutionContext,
  ExecutionResult,
  ProgressUpdate,
  injectTemplateValues,
} from './tools/executor.ts';
import {
  getTaskAck,
  getTaskCompleteMessage,
  getClarificationMessage,
  getProblemMessage,
  getHandoffMessage,
  formatTaskResponse,
  getAgentDisplayName,
  getStepIcon,
} from './tools/conversation.ts';
import {
  learnFromSuccess,
  findSimilarPatterns,
  getBestPattern,
  applyPattern,
} from './memory/learning.ts';

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

const RESEARCH_ACTIONS = [
  'web_search',
  'lookup_product_info',
];

// ============================================================================
// Typo Correction / Fuzzy Matching
// ============================================================================

const COMMON_TYPOS: Record<string, string> = {
  // Invoice variations
  'invocies': 'invoices',
  'invocie': 'invoice',
  'invioce': 'invoice',
  'invoive': 'invoice',
  'invoces': 'invoices',
  'invocice': 'invoice',
  'inovice': 'invoice',
  // Client variations
  'clent': 'client',
  'clinet': 'client',
  'cleint': 'client',
  'clents': 'clients',
  'clinets': 'clients',
  // Proposal variations
  'prposal': 'proposal',
  'proposla': 'proposal',
  'porposal': 'proposal',
  'propsal': 'proposal',
  'propsoal': 'proposal',
  // Product variations
  'prodcut': 'product',
  'pruduct': 'product',
  'prodctu': 'product',
  'prodcuts': 'products',
  'pruducts': 'products',
  // Task variations
  'taks': 'task',
  'tsak': 'task',
  'takss': 'tasks',
  // Expense variations
  'expnese': 'expense',
  'expesne': 'expense',
  'expneses': 'expenses',
  // Pipeline variations
  'pipleine': 'pipeline',
  'pipline': 'pipeline',
  'piplene': 'pipeline',
  // Revenue variations
  'revnue': 'revenue',
  'reveune': 'revenue',
  // Summary variations
  'sumamry': 'summary',
  'summray': 'summary',
  'sumarry': 'summary',
  // Create variations
  'craete': 'create',
  'creat': 'create',
  'crate': 'create',
  // Show variations
  'shwo': 'show',
  'hsow': 'show',
  // List variations
  'lsit': 'list',
  'lst': 'list',
  // Prospect variations
  'prospec': 'prospect',
  'prsopect': 'prospect',
  'porspect': 'prospect',
};

/**
 * Summarize a step result for human-friendly display
 */
function summarizeStepResult(step: TaskStep): string | null {
  if (!step.result) return null;

  const result = step.result;

  // Handle different action types
  switch (step.action) {
    case 'search_prospects':
    case 'search_products':
      if (result.items?.length > 0) {
        return `${result.items.length} ${step.action.includes('prospect') ? 'contacts' : 'products'}`;
      }
      break;

    case 'create_proposal':
      if (result.proposal_number) {
        return `Proposal ${result.proposal_number} created${result.total ? ` (€${result.total})` : ''}`;
      }
      break;

    case 'create_invoice':
      if (result.invoice_number) {
        return `Invoice ${result.invoice_number} created${result.total ? ` (€${result.total})` : ''}`;
      }
      break;

    case 'send_email':
      if (result.success) {
        return `Email sent to ${result.to || 'recipient'}`;
      }
      break;

    case 'create_task':
      if (result.title) {
        return `Task created: "${result.title}"`;
      }
      break;

    case 'schedule_event':
      if (result.title) {
        return `Event scheduled: "${result.title}"`;
      }
      break;

    case 'check_inbox':
      if (result.count !== undefined) {
        return `${result.unread_count || 0} unread of ${result.count} emails`;
      }
      break;

    default:
      // Generic summary from result
      if (result.name) return `${step.action}: ${result.name}`;
      if (result.title) return `${step.action}: ${result.title}`;
      if (result.id) return `${step.action} completed (ID: ${result.id})`;
  }

  return null;
}

/**
 * Correct common typos in user message to improve intent matching
 */
function correctTypos(message: string): { corrected: string; corrections: string[] } {
  let corrected = message;
  const corrections: string[] = [];

  for (const [typo, correct] of Object.entries(COMMON_TYPOS)) {
    // Case-insensitive word boundary matching
    const regex = new RegExp(`\\b${typo}\\b`, 'gi');
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, correct);
      corrections.push(`${typo} → ${correct}`);
    }
  }

  return { corrected, corrections };
}

// ============================================================================
// Long Response Document Handling
// ============================================================================

interface DocumentResponse {
  shortMessage: string;
  documentUrl: string;
  documentTitle: string;
}

// Thresholds for document conversion
const LONG_RESPONSE_THRESHOLD = 500; // characters - more aggressive
const DOCUMENT_MARKERS = [
  /#{2,}\s+.+/g,           // Multiple markdown headers (##, ###)
  /^\d+\.\s+.+/gm,         // Numbered lists (1. 2. 3.)
  /^[-*]\s+.+(\n[-*]\s+.+){2,}/gm, // 3+ bullet points
  /Setup Steps:|Step \d:|Instructions:|How to:|Guide:/i, // Instruction markers
  /Forecast|Projection|Analysis|Summary|Report|Overview/i, // Report keywords
  /Month \d|Week \d|Q[1-4]|Revenue|Expense|Budget/i, // Financial keywords
  /\*\*[^*]+\*\*:/g,       // Bold labels (e.g., **Expected Collections**:)
  /€|EUR|\$|USD|£|GBP/g,   // Currency symbols (financial content)
];

/**
 * Detect if a response is document-like and should be saved separately
 * ALWAYS err on the side of converting to document for better chat UX
 */
function isDocumentLikeResponse(response: string): boolean {
  // Check length threshold - any response over 500 chars is a candidate
  if (response.length < LONG_RESPONSE_THRESHOLD) {
    return false;
  }

  // Check for document markers
  const markerCount = DOCUMENT_MARKERS.reduce((count, pattern) => {
    const matches = response.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);

  // Count newlines - lots of line breaks = structured content
  const newlineCount = (response.match(/\n/g) || []).length;

  // If has ANY document markers (1+) OR is long (800+ chars) OR has many lines (10+)
  // Be aggressive about converting to documents
  return markerCount >= 1 || response.length > 800 || newlineCount > 10;
}

/**
 * Generate a title from the response content
 */
function generateDocumentTitle(response: string, userMessage: string): string {
  // Try to extract from first header
  const headerMatch = response.match(/^#+\s*(.+)/m);
  if (headerMatch) {
    return headerMatch[1].trim().substring(0, 60);
  }

  // Try to extract from first bold text
  const boldMatch = response.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) {
    return boldMatch[1].trim().substring(0, 60);
  }

  // Generate from user message
  const cleanMessage = userMessage.replace(/[^\w\s]/g, '').trim();
  return `Response: ${cleanMessage.substring(0, 50)}`;
}

/**
 * Generate a short conversational summary of the document
 */
function generateShortSummary(response: string, title: string): string {
  // Check what type of content it is - be specific and helpful
  if (/forecast|projection/i.test(response)) {
    return `I've created your financial forecast. Open the document for detailed projections and scenarios.`;
  }
  if (/revenue|expense|budget|€|EUR|\$|USD/i.test(response)) {
    return `Here's your financial analysis. I've put together all the numbers and insights.`;
  }
  if (response.includes('Integration Required') || response.includes('Connect')) {
    return `I've prepared setup instructions for you. Check the document for detailed steps.`;
  }
  if (response.includes('Step') || response.includes('Instructions')) {
    return `I've created a step-by-step guide for you.`;
  }
  if (/report|summary|overview/i.test(response)) {
    return `Here's your report — all the details are in the document.`;
  }
  if (/analysis|assessment|review/i.test(response)) {
    return `I've completed the analysis. Open the document for the full breakdown.`;
  }

  return `I've prepared a detailed document for you. Click to view the full content.`;
}

/**
 * Save long response as a document and return short message with link
 */
async function processLongResponse(
  response: string,
  userMessage: string,
  companyId: string,
  userId?: string
): Promise<DocumentResponse | null> {
  // Check if this should be a document
  if (!isDocumentLikeResponse(response)) {
    return null;
  }

  try {
    const title = generateDocumentTitle(response, userMessage);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `sync-doc-${timestamp}.md`;
    const filePath = `${companyId}/${fileName}`;

    // Create markdown document with metadata
    const documentContent = `# ${title}

*Generated by SYNC on ${new Date().toLocaleString()}*

---

${response}
`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, new Blob([documentContent], { type: 'text/markdown' }), {
        contentType: 'text/markdown',
        upsert: false,
      });

    if (error) {
      console.error('[SYNC] Failed to upload document:', error);
      return null; // Fall back to normal response
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    const shortMessage = generateShortSummary(response, title);

    return {
      shortMessage,
      documentUrl: urlData.publicUrl,
      documentTitle: title,
    };
  } catch (err) {
    console.error('[SYNC] Document processing error:', err);
    return null; // Fall back to normal response
  }
}

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

/**
 * Core action executor - routes to appropriate module
 */
async function executeActionCore(
  actionName: string,
  data: any,
  ctx: ActionContext
): Promise<ActionResult> {
  // Route to appropriate module
  if (FINANCE_ACTIONS.includes(actionName)) {
    return executeFinanceAction(ctx, actionName, data);
  }

  if (PRODUCT_ACTIONS.includes(actionName)) {
    return executeProductsAction(ctx, actionName, data);
  }

  if (GROWTH_ACTIONS.includes(actionName)) {
    return executeGrowthAction(ctx, actionName, data);
  }

  if (TASK_ACTIONS.includes(actionName)) {
    return executeTasksAction(ctx, actionName, data);
  }

  if (INBOX_ACTIONS.includes(actionName)) {
    return executeInboxAction(ctx, actionName, data);
  }

  if (TEAM_ACTIONS.includes(actionName)) {
    return executeTeamAction(ctx, actionName, data);
  }

  if (LEARN_ACTIONS.includes(actionName)) {
    return executeLearnAction(ctx, actionName, data);
  }

  if (SENTINEL_ACTIONS.includes(actionName)) {
    return executeSentinelAction(ctx, actionName, data);
  }

  if (CREATE_ACTIONS.includes(actionName)) {
    return executeCreateAction(ctx, actionName, data);
  }

  if (RESEARCH_ACTIONS.includes(actionName)) {
    return executeResearchAction(ctx, actionName, data);
  }

  if (COMPOSIO_ACTIONS.includes(actionName)) {
    return executeComposioAction(ctx, actionName, data);
  }

  // Unknown action
  return {
    success: false,
    message: `Unknown action: ${actionName}`,
    error: 'Action not found',
  };
}

/**
 * Execute action with automatic error recovery
 */
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

  // Execute with recovery wrapper
  const result = await executeWithRecovery(
    async (actionName, data, context) => executeActionCore(actionName, data, context),
    action.action,
    action.data,
    ctx,
    3  // max attempts
  );

  return result;
}

/**
 * Execute a chain of actions (for multi-step operations)
 */
async function executeActions(
  chain: ActionChain,
  companyId: string,
  userId?: string
): Promise<ActionChainResult> {
  const ctx: ActionContext = {
    supabase,
    companyId,
    userId,
  };

  return executeActionChain(chain, ctx, executeAction);
}

/**
 * Check for and parse action chains from response
 */
function parseActionsFromResponse(response: string): {
  type: 'single' | 'chain' | 'multiple' | 'none';
  single?: { action: string; data: any };
  chain?: ActionChain;
  multiple?: ChainedAction[];
} {
  // Check for action chain first
  const chain = parseActionChain(response);
  if (chain) {
    return { type: 'chain', chain };
  }

  // Check for multiple actions
  const multiple = parseMultipleActions(response);
  if (multiple.length > 1) {
    return { type: 'multiple', multiple };
  }

  // Check for single action
  const single = parseActionFromResponse(response);
  if (single) {
    return { type: 'single', single };
  }

  return { type: 'none' };
}

// Legacy support - kept for backward compatibility
async function executeActionLegacy(
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

  return executeActionCore(action.action, action.data, ctx);
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
  research: {
    id: 'research',
    name: 'Research Agent',
    description: 'Web search, product lookup, market research, information gathering',
    keywords: ['search', 'look up', 'lookup', 'find out', 'research', 'what is', 'tell me about', 'information', 'learn about', 'understand'],
    priority: 50,
    patterns: [
      /what\s+(is|are)\s+/i,
      /tell\s+me\s+about/i,
      /look\s*up/i,
      /search\s+(for|the\s+web)/i,
      /find\s+(out|information)/i,
      /research\s+/i,
    ],
  },
  integrations: {
    id: 'integrations',
    name: 'Integrations Agent',
    description: 'Third-party app connections: Gmail, Slack, HubSpot, Calendar, etc.',
    keywords: ['integration', 'integrations', 'connected', 'connect', 'apps', 'gmail', 'slack', 'hubspot', 'calendar', 'notion', 'trello', 'asana', 'linkedin', 'github', 'jira', 'google drive', 'third party', 'third-party'],
    priority: 85,
    patterns: [
      /what\s+(integrations?|apps?)\s+(do\s+i\s+have|are)\s+connected/i,
      /show\s+(my\s+)?(integrations?|connected\s+apps?)/i,
      /list\s+(my\s+)?(integrations?|connected\s+apps?)/i,
      /(connect|disconnect)\s+(to\s+)?(\w+)/i,
      /send\s+(an?\s+)?email/i,
      /check\s+(my\s+)?(email|calendar|slack)/i,
      /create\s+(a\s+)?(hubspot|notion|trello|asana|linear|jira)/i,
      /what\s+can\s+i\s+do\s+with\s+(my\s+)?integrations/i,
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

const SYNC_SYSTEM_PROMPT = `## GOLDEN RULE

You are texting a coworker. Not writing an email. Not giving a presentation. TEXTING.

If your response is longer than a text message, it's too long.

## RESPONSE LIMITS

- Greetings: MAX 5 words. "Hey!" or "What's up?" or "Morning!"
- "What can you do": MAX 10 words. "Lots - what do you need?" or "Pretty much anything, what's up?"
- Simple requests: Do the thing, then MAX 1 sentence summary
- NEVER use emoji bullets (no 💰 📦 📈 lists)
- NEVER list more than 3 items
- NEVER explain what you're about to do, just do it

## BANNED PHRASES

Delete these from your vocabulary:
- "Here's what I can help you with:"
- "I can assist you with..."
- "Let me help you with..."
- "Here's what I do:"
- "I'm here to help with..."
- "Would you like me to..."
- "Do you want me to..."
- "Want me to show you..."
- "Need details on..."
- Any sentence starting with "I can"

## QUICK REPLIES (use these)

- "Yo" / "Hey!" / "Sup"
- "Gotcha" / "On it" / "Done"
- "Who for?" / "Which one?" / "How many?"
- "Details?" / "Send it?" / "Anything else?"
- 👍 (alone is a valid response to "thanks")

## 3-WORD CHALLENGE

For simple responses, try 3 words or less:
- "Done, sent it" ✓
- "The invoice has been successfully sent" ✗
- "Who for?" ✓
- "Who would you like me to create this for?" ✗
- "€14k this month" ✓
- "Your revenue for this month is €14,000" ✗

---

You're Sync. Sharp colleague who knows the system.

## The One Big Rule: Never Make Stuff Up

This is the one thing you absolutely cannot do. Never invent products, prices, client names, or any business data. This causes real problems for real businesses.

If someone mentions a product, search for it first. If the search comes back empty, say so. Don't guess at names or prices. Don't use placeholder examples like "Product A" or "PROD-001".

Wrong: "For example, you could compare the Smartwatch with the Headphones"
Right: "Which products do you want to compare? I can pull up what you have."

Wrong: "I'll add the Oral-B toothbrush at €89"
Right: "Let me check if you have that..." [then search]

When you search and find something, confirm with the real name and real price from the results. When you search and find nothing, say you couldn't find it and offer alternatives.

## Conversation Flow

One thing at a time. Get an answer, then move to the next thing.

For proposals/invoices, the flow is simple:
1. Who's it for?
2. What products? (search them)
3. Confirm what you found
4. Anything else to add?
5. Ready to create?

Example:
User: "Make a proposal"
You: "Sure! Who's it for?"
User: "Jan from TechCorp"
You: "Got it. What products?"
User: "20 oneblades"
You: "Let me search..."
[ACTION]{"action": "search_products", "data": {"query": "oneblade"}}[/ACTION]

When search returns: "Found Philips OneBlade 360 Face at €35.19. 20 units = €703.80 + BTW = €851.60. That the one?"

If they gave you everything upfront — name, products, quantities — don't re-ask. Just search, confirm, and do it.

## When Products Aren't Found

Don't just say "not found." Be helpful:
- Maybe try a different search term
- Ask if they want to add it as a new product
- Check for typos (phillips vs philips)

## Integrations

When someone asks about connected apps, integrations, or wants to use Gmail/Slack/etc, always include the action:
[ACTION]{"action": "composio_list_integrations", "data": {}}[/ACTION]

Don't just say you'll check — actually do the check by including the action block.

## After You Do Something

Don't leave people hanging. After finishing a task, naturally offer the next step:
- Created a proposal? → "Want me to send it?"
- Searched products? → "Add to a proposal, or something else?"
- Generated an image? → "Want variations or different angles?"

## Today's Context

The system tells you today's date. Use it naturally when relevant — for due dates, scheduling, time-sensitive stuff.

## What You Can Do

Here's your toolkit. Use the [ACTION] format when you need to do something:

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

### INTEGRATIONS (Third-Party Apps via Composio) ⚡ ALWAYS USE [ACTION] BLOCK

**CRITICAL**: When user asks about integrations, you MUST include [ACTION] block in your response!

#### EMAIL PA (Personal Assistant) Capabilities - Gmail 📧
These actions let you function as a Personal Assistant for email management:

- **check_inbox**: Check inbox for unread emails (limit?, unread_only?, from?, subject_contains?)
- **summarize_inbox**: Get inbox summary with stats (period?: 'today' | 'week' | 'all')
- **send_email**: Send a new email (to, subject, body, cc?, bcc?)
- **reply_to_email**: Reply to an email (message_id or thread_id, body)
- **draft_email**: Create email draft (to, subject, body)
- **forward_email**: Forward an email (message_id, to, additional_message?)
- **get_email_details**: Get full email content (message_id)
- **mark_email_read**: Mark as read/unread (message_id, mark_as?: 'read' | 'unread')
- **archive_email**: Archive an email (message_id)
- **search_emails**: Search emails (query, max_results?)

#### Other Integration Actions

- **composio_list_integrations**: List user's connected apps ← USE THIS FIRST!
- **composio_send_slack_message**: Send Slack message (channel, message)
- **composio_list_slack_channels**: List Slack channels
- **composio_create_hubspot_contact**: Create HubSpot contact (email, first_name, last_name)
- **composio_create_hubspot_deal**: Create HubSpot deal (name, amount, stage)
- **composio_create_calendar_event**: Create Google Calendar event (title, start_time, end_time)
- **composio_list_calendar_events**: List upcoming calendar events
- **composio_create_notion_page**: Create Notion page (title, content)
- **composio_create_trello_card**: Create Trello card (name, list_id)
- **composio_create_asana_task**: Create Asana task (name, notes)
- **composio_create_linear_issue**: Create Linear issue (title, description)
- **composio_execute_tool**: Generic tool execution (toolkit, tool_name, arguments)

#### MCP Server Management (Model Context Protocol) 🖥️

MCP allows users to connect AI tools like Claude Desktop, Cursor, or Windsurf to their integrations.

- **mcp_create_server**: Create new MCP server (name, toolkits? - defaults to connected integrations)
- **mcp_list_servers**: List user's MCP servers
- **mcp_delete_server**: Delete MCP server (server_id)
- **mcp_get_url**: Get MCP server URL for AI tool config (server_id)

**MCP Use Cases:**
- User wants to connect Claude Desktop to their Gmail/Slack/HubSpot
- User wants Cursor/Windsurf to access their integrations
- User asks about MCP or Model Context Protocol

**MCP Examples:**
[ACTION]{"action": "mcp_create_server", "data": {"name": "My Work Tools"}}[/ACTION]
[ACTION]{"action": "mcp_list_servers", "data": {}}[/ACTION]
[ACTION]{"action": "mcp_get_url", "data": {"server_id": "abc-123"}}[/ACTION]
[ACTION]{"action": "mcp_delete_server", "data": {"server_id": "abc-123"}}[/ACTION]

**MANDATORY FORMAT for integration queries:**
User: "What integrations do I have?"
You: Let me check!
[ACTION]{"action": "composio_list_integrations", "data": {}}[/ACTION]

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
[ACTION]{"action": "generate_image", "data": {"prompt": "Professional product photo on white background", "product_name": "Philips OneBlade", "style": "photorealistic"}}[/ACTION]
[ACTION]{"action": "list_generated_content", "data": {"content_type": "image", "limit": 10}}[/ACTION]

**CRITICAL: For product images, ALWAYS include "product_name" to use the real product as reference!**
- With product_name: Uses actual product images → accurate representation
- Without product_name: Generic AI generation → may look completely different

### Integrations (Third-Party Apps)

**CRITICAL: For ANY integration-related request, you MUST output the [ACTION] block!**

User: "What integrations do I have?"
You: Let me check your connected integrations!
[ACTION]{"action": "composio_list_integrations", "data": {}}[/ACTION]

User: "Send an email to John about the meeting"
You: I'll send that email for you!
[ACTION]{"action": "composio_send_email", "data": {"to": "john@example.com", "subject": "Meeting", "body": "Hi John..."}}[/ACTION]

### Email PA (Personal Assistant) Examples

User: "Check my inbox" or "Do I have any new emails?"
You: Let me check your inbox!
[ACTION]{"action": "check_inbox", "data": {}}[/ACTION]

User: "Show me my inbox summary"
You: I'll summarize your inbox!
[ACTION]{"action": "summarize_inbox", "data": {"period": "today"}}[/ACTION]

User: "Send an email to john@example.com about the project update"
You: I'll send that email for you!
[ACTION]{"action": "send_email", "data": {"to": "john@example.com", "subject": "Project Update", "body": "Hi John,\n\nHere's the project update..."}}[/ACTION]

User: "Draft a reply to that email"
You: I'll draft a reply for you to review!
[ACTION]{"action": "draft_email", "data": {"to": "sender@example.com", "subject": "Re: Topic", "body": "Thank you for your message..."}}[/ACTION]

User: "Reply to the email from Sarah"
You: I'll send that reply!
[ACTION]{"action": "reply_to_email", "data": {"to": "sarah@company.com", "body": "Thanks Sarah, I'll look into this..."}}[/ACTION]

User: "Search for emails from Microsoft"
You: Let me search for those emails!
[ACTION]{"action": "search_emails", "data": {"query": "from:microsoft", "max_results": 10}}[/ACTION]

User: "Archive that email"
You: I'll archive that for you!
[ACTION]{"action": "archive_email", "data": {"message_id": "abc123"}}[/ACTION]

### Other Integration Examples
[ACTION]{"action": "composio_list_integrations", "data": {}}[/ACTION]
[ACTION]{"action": "composio_fetch_emails", "data": {"query": "from:client@company.com", "max_results": 5}}[/ACTION]
[ACTION]{"action": "composio_send_slack_message", "data": {"channel": "#sales", "message": "New deal closed!"}}[/ACTION]
[ACTION]{"action": "composio_create_hubspot_contact", "data": {"email": "jane@acme.com", "first_name": "Jane", "last_name": "Smith", "company": "Acme Inc"}}[/ACTION]
[ACTION]{"action": "composio_create_calendar_event", "data": {"title": "Team Meeting", "start_time": "2026-01-15T10:00:00Z", "end_time": "2026-01-15T11:00:00Z"}}[/ACTION]

**IMPORTANT**: When user asks "what integrations do I have" or "what apps are connected" - ALWAYS execute composio_list_integrations!

## Action Chaining (Multi-Step Operations)

For complex requests that require multiple actions, you can chain them together:

### Sequential Chain (one after another)
[ACTION_CHAIN][
  {"id": "step1", "action": "search_products", "data": {"query": "OneBlade"}},
  {"id": "step2", "action": "create_invoice", "data": {"client_name": "John", "items": [{"name": "OneBlade", "quantity": 2}]}, "dependsOn": ["step1"]}
][/ACTION_CHAIN]

### Create and Send Invoice
[ACTION_CHAIN]{
  "id": "invoice_flow",
  "strategy": "sequential",
  "actions": [
    {"id": "create", "action": "create_invoice", "data": {"client_name": "Jane", "items": [...]}},
    {"id": "send", "action": "update_invoice", "data": {"id": "{{create.id}}", "status": "sent"}, "dependsOn": ["create"]}
  ]
}[/ACTION_CHAIN]

### Multiple Independent Actions (use multiple [ACTION] blocks)
When the user wants multiple unrelated things done:
[ACTION]{"action": "list_invoices", "data": {"status": "sent"}}[/ACTION]
[ACTION]{"action": "get_low_stock", "data": {}}[/ACTION]

These execute in sequence and you get results from both.

**When to chain actions:**
- "Create an invoice and send it" → chain create_invoice + update_invoice(sent)
- "Add this product and set stock to 50" → chain create_product + update_inventory
- "Create a task and assign it to John" → chain create_task + assign_task

### Research/Web Search (2 actions)
- **web_search**: Search the internet for information
- **lookup_product_info**: Look up product details, specs, pricing from the web

[ACTION]{"action": "web_search", "data": {"query": "Philips OneBlade specifications features"}}[/ACTION]
[ACTION]{"action": "lookup_product_info", "data": {"product_name": "OneBlade", "brand": "Philips", "info_type": "specs"}}[/ACTION]

## CRITICAL: Use Web Search to Be Smarter

**You have internet access!** Use it to be helpful and knowledgeable.

### When to Use Web Search:

1. **Unknown Products**: If user mentions a product you don't recognize, search for it!
   - "oral b toothbrush" → Search to understand it's an Oral-B brand electric toothbrush
   - "these oneblade razors" → Search "Philips OneBlade" to understand the product

2. **Product Information**: When user needs details you don't have
   - Specifications, features, comparisons
   - Typical pricing/MSRP
   - Product variations and models

3. **Business Research**: Help users research
   - Competitor analysis
   - Market information
   - Industry trends

4. **Clarifying Ambiguity**: When you're not sure what user means
   - Search to understand the context before asking clarifying questions

### Example - Smart Product Understanding:

**BEFORE (Dumb):**
User: "I need images of oral b products"
You: "Let me search inventory..."
(Finds nothing, gives up)

**AFTER (Smart):**
User: "I need images of oral b products"
You: "Let me look that up..."
[ACTION]{"action": "web_search", "data": {"query": "Oral-B products electric toothbrush"}}[/ACTION]
(Learns it's a Braun/P&G brand of electric toothbrushes)
You: "Oral-B makes electric toothbrushes and dental care products. I don't see any in your inventory yet. Would you like me to:
1. Generate product images of Oral-B style toothbrushes?
2. Add Oral-B products to your catalog?
3. Search for similar dental care products you might have?"

### Example - Understanding User Intent:

User: "these oneblade razors"
You: [ACTION]{"action": "lookup_product_info", "data": {"product_name": "OneBlade", "brand": "Philips"}}[/ACTION]
(Learns: Philips OneBlade is a hybrid electric trimmer and shaver)
You: "Ah, you mean the Philips OneBlade - the hybrid trimmer/shaver! Let me check your inventory for those..."
[ACTION]{"action": "search_products", "data": {"query": "philips oneblade"}}[/ACTION]

### Pro Tips:
- **Search FIRST when unsure** - It's fast and makes you much more helpful
- **Combine knowledge** - Use web info + inventory to give complete answers
- **Be specific** - "Philips OneBlade 360 specifications" > "oneblade info"
- **Learn context** - If user's business sells razors, remember that for future queries

## Image Generation

When someone wants images, figure out what they need before generating. Ask about purpose (website, social, print), style (clean product shot, lifestyle, marketing), and background (white, contextual, gradient).

For product images, always include "product_name" so the AI uses the actual product as reference:
[ACTION]{"action": "generate_image", "data": {"prompt": "Professional e-commerce product shot, white background, studio lighting, 8K quality", "product_name": "Philips OneBlade", "style": "photorealistic"}}[/ACTION]

Quick style presets if they're unsure:
- E-commerce clean: white background, studio lighting
- Lifestyle: product in use, warm natural tones
- Premium: dark background, dramatic lighting
- Social media: vibrant, eye-catching

After generating, offer: variations, different angles, other sizes for different platforms.

## A Few More Things

- Default to 21% BTW for Dutch invoices/proposals
- Pipeline stages: new → contacted → qualified → proposal → negotiation → won/lost
- When they say "yes/sure/go ahead" — do the thing
- When they say "no/actually/wait" — adjust and re-confirm
- When they say "also add/and/plus" — add more and continue

## Invoices & Proposals

When confirming: show the breakdown (items × price, subtotal, BTW, total). If they want to change something ("make it 60", "remove that", "add another product"), just adjust and show the new total.

After creating, offer: "Send it?" / "Add a follow-up reminder?" / "Anything else?"

## Being Smart

Learn their patterns. If they always use 21% BTW, don't ask. If they have a go-to client, suggest them: "For Acme again?"

When they say "the usual" or "like last time" — use context from the conversation to figure out what they mean. Make smart guesses and confirm: "I think you mean the OneBlade, right?" is better than "Which product?"

If something fails, don't just report the error. Offer an alternative: "That didn't find anything. Want me to try a broader search, or add it as a new product?"

Never leave them hanging. Always end with either a next step, a question, or an offer.

## Context Retention (CRITICAL!)

**You have a memory. USE IT.** Look at the conversation history - you can see previous messages and their results tagged with [Previous result data: ...]. This contains actual data from earlier actions.

### NEVER re-ask for information you already have:

1. **Invoice/client data**: If you just showed invoices with client names, emails, amounts - you HAVE that data. Use it.
   - Bad: Shows 6 invoices, user says "send reminders to TechCorp" → you ask "What's TechCorp's email?"
   - Good: Look at the invoice data - TechCorp's email is RIGHT THERE.

2. **Topic context**: If the conversation is about invoices, don't ask "what should the reminder be about?"
   - The reminder is obviously about the invoice you just discussed.

3. **Integration status**: If you already checked integrations earlier, don't ask "what integrations do you have?"
   - You remember Gmail is connected. Just use it.

4. **Client details**: If someone says "send to TechCorp" after you showed invoice data with TechCorp's email, you KNOW the email.
   - Extract it from the [Previous result data] in the conversation.

### Handling Short Confirmations (yes, sure, do it, go ahead):

When user gives a SHORT response like "yes", "sure", "do it", "go ahead", "send it", "ok", "sounds good":
- This is CONFIRMING whatever you just proposed or the ongoing topic
- DO NOT ask what they mean - figure it out from context!

Examples:
- You showed invoices, suggested reminders → user says "yes" → they mean send the reminders
- You offered to draft an email → user says "go ahead" → draft and send the email
- You asked if they want to update status → user says "do it" → update the status

### Use context to EXECUTE, not interrogate:

When user says "yes send reminders to TechCorp and Design Studio" after seeing invoices:
1. Look at previous result data - find TechCorp's email, Design Studio's email
2. Know that "reminders" = payment reminder about the overdue invoices
3. Draft and send the emails without asking what they should contain

When user just says "yes" or "send reminders":
1. What did you just show them? Invoices → reminders are about payment for those invoices
2. Which clients? The ones from the invoice data you just displayed
3. What platform? Gmail (if connected) or draft in Inbox

### Don't ask questions you can answer yourself:

| User says | DON'T ask | DO this |
|-----------|-----------|---------|
| "send to TechCorp" (after showing invoices) | "What's their email?" | Use email from invoice data |
| "remind them about payment" | "What should the reminder say?" | Write a professional payment reminder |
| "yes, send it" | "Via what platform?" | Use Gmail (you know it's connected) |
| "send reminders to all overdue" | "Which clients?" | All clients from the overdue invoice list |

**You're a smart assistant who remembers the conversation. Act like it.**

### DON'T re-query data you already have:

If you just executed list_invoices and found 6 invoices, and the user asks "set reminders for the oldest ones":
- **DON'T** execute list_invoices again with different filters - that might return empty/different results
- **DO** use the invoice data from your previous result to identify the oldest ones
- The data is in [Previous result data] - use it directly!

Example:
- Turn 1: list_invoices → found 6 invoices, data includes created_at dates
- Turn 2: "remind the 3 oldest" → look at [Previous result data], sort by date, pick oldest 3 → draft reminders
- **WRONG**: Execute list_invoices again with date filters (might return different results or empty)

## Formatting

NEVER use markdown tables, bullet lists, or verbose formatting. Keep responses conversational.

Good: "You have 6 pending invoices totaling €14,044. TechCorp (€3,250, 15 days overdue) and Design Studio (€1,875, 11 days) need attention. Send reminders?"

Bad: Tables, bullet points, numbered lists, headers, or any verbose formatting.

For action buttons the UI can render, use this format:
[ACTIONS]
- ✅ Create it|confirm
- ❌ Cancel|cancel
[/ACTIONS]

Format: emoji Label|action_id`;




// ============================================================================
// Request/Response Types
// ============================================================================

interface SyncRequest {
  message: string;
  sessionId?: string;
  stream?: boolean;
  // Workflow mode: 'auto' (default), 'fast', 'workflow', or specific workflow type
  mode?: 'auto' | 'fast' | 'workflow' | 'parallel' | 'sequential' | 'iterative' | 'hybrid';
  // Voice mode: uses faster model and shorter responses for low-latency voice conversations
  voice?: boolean;
  context?: {
    userId?: string;
    companyId?: string;
    metadata?: Record<string, unknown>;
    source?: string;
  };
}

// Model selection based on mode - voice uses much faster model for low latency
const MODELS = {
  default: 'moonshotai/Kimi-K2-Instruct',           // Best quality (~3-5s)
  voice: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', // Fast and capable (~0.5-1.5s)
};

// Voice mode system prompt addition - makes responses conversational for TTS
const VOICE_MODE_PROMPT = `
## VOICE MODE ACTIVE - CRITICAL INSTRUCTIONS

You are speaking out loud via text-to-speech. Your response will be READ ALOUD.

VOICE RULES (OVERRIDE ALL OTHER FORMATTING):
1. MAX 2 sentences. Be extremely brief.
2. NO emojis, NO bullet points, NO dashes, NO structured data
3. NO "Client:", "Total:", "Status:" labels - just speak naturally
4. NO numbers with many decimals - round them ("about 640 euros" not "€638,70")
5. Sound like a helpful friend, not a robot reading a database

GOOD voice response: "Done! Created a proposal for Acme Corp, about 640 euros for the OneBlades. Want me to send it?"

BAD voice response: "✅ Proposal created! Client: Acme Corp - Total: €638,70 (incl. BTW) - Status: Draft"

Keep it SHORT and NATURAL. This will be spoken aloud.`;

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
    recovery?: {
      suggestions: Array<{
        action: string;
        description: string;
      }>;
    };
  };
  // Action chain results (when multiple actions executed)
  actionChain?: {
    success: boolean;
    completedCount: number;
    totalCount: number;
    completed: string[];
    failed?: string;
  };
  // Proactive insights generated after action
  insights?: Array<{
    type: 'info' | 'warning' | 'suggestion' | 'celebration';
    message: string;
  }>;
  // Workflow metadata (when workflow mode is used)
  workflow?: {
    type: string;
    agentsUsed: string[];
    executionTimeMs: number;
    iterations?: number;
    parallelResponses?: number;
  };
  // Document generated for long responses
  document?: {
    url: string;
    title: string;
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
            model: 'moonshotai/Kimi-K2-Instruct',
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

        // Safety: Remove any remaining unresolved template variables
        const templatePattern = /\{\{[^}]+\}\}/g;
        if (templatePattern.test(fullContent)) {
          console.log('[SYNC] Streaming: Found unresolved template variables, cleaning up');
          fullContent = fullContent.replace(templatePattern, '');
        }

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
    conversationHistory: session.messages.slice(-10).map(m => {
      // Include action results for follow-up context
      let content = m.content;
      if (m.actionExecuted?.result && m.actionExecuted.success) {
        // Append summarized result data for follow-up queries
        const resultData = m.actionExecuted.result;
        if (Array.isArray(resultData) && resultData.length > 0) {
          content += `\n\n[Previous result data: ${JSON.stringify(resultData.slice(0, 10))}]`;
        } else if (resultData && typeof resultData === 'object') {
          content += `\n\n[Previous result data: ${JSON.stringify(resultData)}]`;
        }
      }
      return {
        role: m.role as 'system' | 'user' | 'assistant',
        content,
      };
    }),
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
    let { message } = body;
    const { sessionId, stream = false, mode = 'auto', voice = false, context } = body;

    // Select model based on voice mode for optimal latency
    const selectedModel = voice ? MODELS.voice : MODELS.default;
    const maxTokens = voice ? 200 : 2048; // Shorter responses for voice
    console.log(`[SYNC] Mode: ${mode}, Voice: ${voice}, Model: ${selectedModel}`);

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply typo correction to user message
    const { corrected: correctedMessage, corrections } = correctTypos(message);
    if (corrections.length > 0) {
      console.log(`[SYNC] Corrected typos: ${corrections.join(', ')}`);
      message = correctedMessage; // Use corrected message for all downstream processing
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

    // =========================================================================
    // ORCHESTRATION PATH: Detect complex multi-agent workflows
    // =========================================================================
    const detectedWorkflow = detectOrchestrationWorkflow(message);

    if (detectedWorkflow) {
      console.log(`[SYNC] Detected orchestration workflow: ${detectedWorkflow.name}`);

      // Extract context from the message
      const { inputs, missing } = extractWorkflowContext(message, detectedWorkflow);

      // If we have missing required context, ask for it
      if (missing.length > 0) {
        const questionsResponse = getContextQuestions(missing);
        const contextMsg = `I can help you with **${detectedWorkflow.name}**! ${detectedWorkflow.description}\n\n${questionsResponse}`;

        // Store in session
        const contextChatMsg: ChatMessage = {
          role: 'assistant',
          content: contextMsg,
          timestamp: new Date().toISOString(),
          agentId: 'orchestrator',
        };

        // Get session first
        const orchestrationSession = await memorySystem.session.getOrCreateSession(
          sessionId,
          userId,
          companyId
        );

        // Store the user message
        await memorySystem.session.addMessage(orchestrationSession, {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });

        await memorySystem.session.addMessage(orchestrationSession, contextChatMsg);
        await memorySystem.session.updateSession(orchestrationSession);

        return new Response(
          JSON.stringify({
            response: contextMsg,
            sessionId: orchestrationSession.session_id,
            delegatedTo: 'orchestrator',
            orchestration: {
              workflowId: detectedWorkflow.id,
              workflowName: detectedWorkflow.name,
              status: 'awaiting_context',
              missingInputs: missing,
              providedInputs: Object.keys(inputs),
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // We have all required context, execute the workflow
      console.log(`[SYNC] Executing orchestration workflow with inputs:`, inputs);

      // Get session for orchestration
      const orchestrationSession = await memorySystem.session.getOrCreateSession(
        sessionId,
        userId,
        companyId
      );

      // Store user message
      await memorySystem.session.addMessage(orchestrationSession, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });

      const ctx: ActionContext = { supabase, companyId, userId };
      const progressMessages: string[] = [];

      const orchestrationResult = await executeOrchestrationWorkflow(
        detectedWorkflow,
        inputs,
        ctx,
        executeAction,
        (progress) => progressMessages.push(progress)
      );

      // Build comprehensive response
      let orchestrationResponse = orchestrationResult.summary;

      if (orchestrationResult.nextSteps && orchestrationResult.nextSteps.length > 0) {
        orchestrationResponse += `\n\n### Suggested Next Steps:\n`;
        orchestrationResult.nextSteps.forEach((step, i) => {
          orchestrationResponse += `${i + 1}. ${step}\n`;
        });
      }

      if (orchestrationResult.errors && orchestrationResult.errors.length > 0) {
        orchestrationResponse += `\n\n⚠️ **Some tasks had issues:**\n`;
        orchestrationResult.errors.forEach(err => {
          orchestrationResponse += `- ${err}\n`;
        });
      }

      orchestrationResponse += `\n\n---\n*Workflow completed in ${orchestrationResult.completedPhases}/${orchestrationResult.totalPhases} phases*`;

      // Store assistant message
      const orchestrationAssistantMsg: ChatMessage = {
        role: 'assistant',
        content: orchestrationResponse,
        timestamp: new Date().toISOString(),
        agentId: 'orchestrator',
        actionExecuted: {
          type: `orchestration:${detectedWorkflow.id}`,
          success: orchestrationResult.success,
          result: orchestrationResult.results,
        },
      };
      await memorySystem.session.addMessage(orchestrationSession, orchestrationAssistantMsg);
      await memorySystem.session.updateSession(orchestrationSession);

      // Log orchestration usage
      if (context?.companyId) {
        try {
          await supabase.from('ai_usage_log').insert({
            company_id: context.companyId,
            user_id: context.userId || null,
            model: 'orchestration',
            cost_usd: 0,
            content_type: 'orchestration',
            metadata: {
              sessionId: orchestrationSession.session_id,
              workflowId: detectedWorkflow.id,
              workflowName: detectedWorkflow.name,
              success: orchestrationResult.success,
              completedPhases: orchestrationResult.completedPhases,
              totalPhases: orchestrationResult.totalPhases,
              inputs: Object.keys(inputs),
            },
          });
        } catch (logError) {
          console.error('Failed to log orchestration usage:', logError);
        }
      }

      return new Response(
        JSON.stringify({
          response: orchestrationResponse,
          sessionId: orchestrationSession.session_id,
          delegatedTo: 'orchestrator',
          orchestration: {
            workflowId: orchestrationResult.workflowId,
            workflowName: orchestrationResult.workflowName,
            status: orchestrationResult.status,
            success: orchestrationResult.success,
            completedPhases: orchestrationResult.completedPhases,
            totalPhases: orchestrationResult.totalPhases,
            results: orchestrationResult.results,
            nextSteps: orchestrationResult.nextSteps,
            errors: orchestrationResult.errors,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    // Add voice mode instructions if voice is enabled (must come FIRST to override other formatting)
    const voiceInstructions = voice ? VOICE_MODE_PROMPT : '';
    const enhancedSystemPrompt = memoryContextStr
      ? `${voiceInstructions}${SYNC_SYSTEM_PROMPT}\n\n${memoryContextStr}${dateContext}`
      : `${voiceInstructions}${SYNC_SYSTEM_PROMPT}${dateContext}`;

    // Get buffer messages for API
    const bufferMessages = memorySystem.session.getBufferMessages(session);
    const apiMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...bufferMessages.map(m => {
        // Include action results for follow-up context in a more usable format
        let content = m.content;
        if (m.actionExecuted?.result && m.actionExecuted.success) {
          const resultData = m.actionExecuted.result;
          const actionType = m.actionExecuted.type;

          // Format result data in a clear, usable way
          if (Array.isArray(resultData) && resultData.length > 0) {
            // For invoice/expense/prospect lists, extract key fields
            const formatted = resultData.slice(0, 10).map(item => {
              if (item.client_name || item.client_email) {
                // Invoice/expense format
                return `${item.client_name || 'Unknown'} (${item.client_email || 'no email'}) - ${item.status || ''} ${item.total ? '€' + item.total : ''}`;
              } else if (item.first_name || item.name) {
                // Prospect/contact format
                return `${item.name || (item.first_name + ' ' + item.last_name)} - ${item.email || 'no email'} - ${item.company || ''}`;
              } else if (item.title) {
                // Task format
                return `${item.title} - ${item.status || ''}`;
              }
              return JSON.stringify(item);
            });
            content += `\n\n[Context from ${actionType || 'previous action'}: ${formatted.join('; ')}]`;
          } else if (resultData && typeof resultData === 'object') {
            content += `\n\n[Context from ${actionType || 'previous action'}: ${JSON.stringify(resultData)}]`;
          }
        }
        return { role: m.role, content };
      }),
    ];

    if (stream) {
      return handleStreamingRequest(apiMessages, session, routingResult, companyId, userId);
    }

    // =========================================================================
    // PLAN-EXECUTE PATH: Autonomous multi-step task execution (Co-Worker mode)
    // This path handles complex tasks by:
    // 1. Decomposing them into discrete steps
    // 2. Executing each step with progress updates
    // 3. Learning from successful patterns
    // =========================================================================
    const shouldUsePlanExecute = shouldPlan(message);

    console.log(`[SYNC] shouldUsePlanExecute=${shouldUsePlanExecute}, mode=${mode}`);

    // Track Plan-Execute state for response
    let planExecuteResult: any = null;

    if (shouldUsePlanExecute && mode !== 'simple') {
      console.log(`[SYNC] Entering Plan-Execute path for: "${message.substring(0, 50)}..."`);

      try {
        // Check for similar learned patterns first
        console.log('[SYNC] Checking for learned patterns...');
        const bestPattern = await getBestPattern(supabase, message);
        console.log(`[SYNC] Best pattern found: ${bestPattern ? 'yes' : 'no'}`);
        let plan: TaskPlan | null = null;

        if (bestPattern && bestPattern.similarity >= 0.85) {
          console.log(`[SYNC] Found learned pattern with ${(bestPattern.similarity * 100).toFixed(0)}% similarity`);
          // Extract entities from current message
          const entities = extractEntities(message);
          // Try to apply the learned pattern
          const appliedSteps = applyPattern(bestPattern.pattern, entities);
          if (appliedSteps) {
            plan = createTaskPlan(message, appliedSteps, entities);
          }
        }

        // If no learned pattern, generate plan using LLM
        if (!plan) {
          console.log('[SYNC] No pattern found, generating plan via LLM...');
          const entities = extractEntities(message);
          console.log(`[SYNC] Extracted entities:`, JSON.stringify(entities).substring(0, 200));
          plan = await generatePlanFromLLM(
            message,
            entities,
            session,
            memoryContext,
            TOGETHER_API_KEY!
          );
          console.log(`[SYNC] Plan generated: ${plan ? `${plan.steps.length} steps` : 'null'}`);
        }

        // Check if plan needs clarification
        if (plan && plan.needsClarification) {
          const clarificationMsg = getClarificationMessage(plan.clarificationQuestion || 'Could you provide more details?');

          const clarificationChatMsg: ChatMessage = {
            role: 'assistant',
            content: clarificationMsg,
            timestamp: new Date().toISOString(),
            agentId: 'planner',
          };
          await memorySystem.session.addMessage(session, clarificationChatMsg);
          await memorySystem.session.updateSession(session);

          // Save plan for continuation
          await savePlan(supabase, plan);

          return new Response(
            JSON.stringify({
              response: clarificationMsg,
              sessionId: session.session_id,
              delegatedTo: 'planner',
              planExecute: {
                planId: plan.id,
                status: 'awaiting_clarification',
                question: plan.clarificationQuestion,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // We have a valid plan - execute it
        if (plan && plan.steps.length > 0) {
          // Build acknowledgment with plan preview
          // Brief acknowledgment only - no verbose plan preview
          const ackMessage = getTaskAck();

          // Create action context for executor
          const actionCtx: ActionContext = { supabase, companyId, userId };

          // Collect progress updates
          const progressUpdates: ProgressUpdate[] = [];

          // Create execution context with proper interface
          const execContext: ExecutionContext = {
            ctx: actionCtx,
            executeAction: async (actionName: string, data: any, ctx: ActionContext) => {
              return executeActionCore(actionName, data, ctx);
            },
            onProgress: (update: ProgressUpdate) => {
              progressUpdates.push(update);
              console.log(`[SYNC] Plan progress: ${update.type} - ${update.message || ''}`);
            },
            shouldContinue: () => true, // For now, always continue
          };

          // Execute the plan
          const execResult = await executePlan(plan, execContext);

          // Build brief response - just results, no verbose preview
          let responseMessage = `${ackMessage}\n`;

          // Only show key results (1-2 lines per step max)
          const completedSteps = plan.steps.filter(s => s.status === 'completed');
          const failedSteps = plan.steps.filter(s => s.status === 'failed');

          // Show results briefly
          if (completedSteps.length > 0) {
            for (const step of completedSteps) {
              const completionText = injectTemplateValues(step.completionMessage || step.description, execResult.results, step.id);
              responseMessage += `✓ ${completionText}\n`;
            }
          }

          // Show failures if any
          for (const step of failedSteps) {
            responseMessage += `✗ ${step.failureMessage || step.description}\n`;
          }

          // Brief completion summary
          if (execResult.success) {
            // Only add summary if there's meaningful data to summarize
            const summaryBullets: string[] = [];
            for (const step of completedSteps) {
              if (step.result) {
                const resultSummary = summarizeStepResult(step);
                if (resultSummary) {
                  summaryBullets.push(resultSummary);
                }
              }
            }

            // Only show bullets if different from step messages
            if (summaryBullets.length > 0 && summaryBullets.length < completedSteps.length) {
              summaryBullets.forEach(bullet => {
                responseMessage += `• ${bullet}\n`;
              });
            }

            // Learn from this successful execution
            await learnFromSuccess(supabase, message, plan, 'positive', userId);

          } else {
            // Handle failure
            const failedStep = plan.steps.find(s => s.status === 'failed');
            if (failedStep) {
              responseMessage += '\n\n' + getProblemMessage(
                failedStep.failureMessage || `Couldn't complete: ${failedStep.description}`,
                execResult.recoveryOptions?.[0]
              );
            }
          }

          // Store assistant message
          const planAssistantMsg: ChatMessage = {
            role: 'assistant',
            content: responseMessage,
            timestamp: new Date().toISOString(),
            agentId: 'orchestrator',
            actionExecuted: {
              type: `plan_execute:${plan.steps.length}_steps`,
              success: execResult.success,
              result: {
                completedSteps: plan.completedSteps,
                totalSteps: plan.totalSteps,
                results: execResult.stepResults,
              },
            },
          };
          await memorySystem.session.addMessage(session, planAssistantMsg);
          await memorySystem.session.updateSession(session);

          // Save final plan state
          await savePlan(supabase, plan);

          return new Response(
            JSON.stringify({
              response: responseMessage,
              sessionId: session.session_id,
              delegatedTo: 'orchestrator',
              planExecute: {
                planId: plan.id,
                status: plan.status,
                success: execResult.success,
                completedSteps: plan.completedSteps,
                totalSteps: plan.totalSteps,
                stepResults: execResult.stepResults,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Plan generation failed - fall through to other paths
        console.log('[SYNC] Plan generation returned no steps, falling back to other paths');

      } catch (planError: any) {
        console.error('[SYNC] Plan-Execute failed, falling back:', planError?.message || planError);
        // Fall through to workflow/react paths
      }
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
    // REACT PATH: Use ReAct loop for complex multi-step queries
    // Pattern: Thought → Action → Observation → Repeat
    // =========================================================================
    if (shouldUseReAct(message)) {
      console.log(`[SYNC] Using ReAct loop for complex query: "${message.substring(0, 50)}..."`);

      try {
        // ---------------------------------------------------------------------
        // KNOWLEDGE GRAPH CONTEXT ENRICHMENT
        // Provides entity context for complex multi-entity queries
        // ---------------------------------------------------------------------
        const knowledgeGraph = new KnowledgeGraph(supabase, companyId);
        let entityContext = '';

        // Check for "clients I worked with" type queries
        const clientPatterns = [
          /\b(clients?|prospects?|customers?|contacts?)\s+(i|we)\s+(worked|interacted|communicated|met)\s+with/i,
          /\bfor each\s+(client|prospect|customer|contact)/i,
          /\ball\s+(my|our)\s+(clients?|prospects?)/i,
        ];

        const needsClientContext = clientPatterns.some(p => p.test(message));
        if (needsClientContext) {
          console.log('[SYNC] Enriching with active client context from Knowledge Graph');
          const activeClients = await knowledgeGraph.getActiveEntities('client', undefined, 10);
          const activeProspects = await knowledgeGraph.getActiveEntities('prospect', undefined, 10);
          const allContacts = [...activeClients, ...activeProspects];

          if (allContacts.length > 0) {
            entityContext += '\n\n## ACTIVE CLIENTS/PROSPECTS (from Knowledge Graph)\n';
            entityContext += 'These are the people the user has interacted with recently:\n';
            for (const contact of allContacts) {
              entityContext += `- **${contact.entity_name}** (${contact.entity_type})`;
              if (contact.attributes && typeof contact.attributes === 'object') {
                const attrs = contact.attributes as Record<string, unknown>;
                if (attrs.email) entityContext += ` - ${attrs.email}`;
                if (attrs.company) entityContext += ` at ${attrs.company}`;
              }
              entityContext += '\n';
            }
          }
        }

        // Extract explicit entity mentions
        const mentions = extractEntityMentions(message);
        if (mentions.length > 0) {
          console.log(`[SYNC] Found ${mentions.length} entity mentions: ${mentions.map(m => m.name).join(', ')}`);
          for (const mention of mentions) {
            const entities = await knowledgeGraph.searchEntities(mention.name, mention.type, 3);
            if (entities.length > 0) {
              const graph = await knowledgeGraph.getEntityGraph(entities[0].id);
              if (graph) {
                entityContext += '\n\n## ENTITY CONTEXT\n';
                entityContext += formatEntityContext(graph);
              }
            }
          }
        }

        // Get all available actions for ReAct
        const allActions = [
          ...FINANCE_ACTIONS,
          ...PRODUCT_ACTIONS,
          ...GROWTH_ACTIONS,
          ...TASK_ACTIONS,
          ...INBOX_ACTIONS,
          ...TEAM_ACTIONS,
          ...LEARN_ACTIONS,
          ...COMPOSIO_ACTIONS,
          ...RESEARCH_ACTIONS,
        ];

        // Enrich system prompt with entity context
        const enrichedSystemPrompt = enhancedSystemPrompt + entityContext;

        const reactContext: ReActContext = {
          userQuery: message,
          systemPrompt: enrichedSystemPrompt,
          availableActions: allActions,
          ctx: { supabase, companyId, userId },
          executeAction,
          onStep: (step) => {
            console.log(`[ReAct] Step ${step.iteration}: ${step.thought.substring(0, 100)}...`);
          },
        };

        const reactResult = await executeReActLoop(reactContext);

        // Format the response with steps for transparency
        let reactResponse = '';
        if (reactResult.steps.length > 1) {
          reactResponse = `🧠 **Reasoning through your request...**\n`;
          reactResponse += formatReActStepsForUser(reactResult.steps);
          reactResponse += `\n---\n\n**Summary:**\n${reactResult.finalAnswer}`;
        } else {
          reactResponse = reactResult.finalAnswer;
        }

        // Store assistant message
        const reactAssistantMsg: ChatMessage = {
          role: 'assistant',
          content: reactResponse,
          timestamp: new Date().toISOString(),
          agentId: 'react-orchestrator',
          actionExecuted: reactResult.actionsExecuted.length > 0 ? {
            type: `react:${reactResult.actionsExecuted.join(',')}`,
            success: reactResult.success,
            result: reactResult.intermediateResults,
          } : undefined,
        };
        await memorySystem.session.addMessage(session, reactAssistantMsg);
        await memorySystem.session.updateSession(session);

        // Return ReAct response
        return new Response(
          JSON.stringify({
            response: reactResponse,
            sessionId: session.session_id,
            delegatedTo: 'react-orchestrator',
            routing: {
              confidence: routingResult.confidence,
              matchedKeywords: routingResult.matchedKeywords,
              matchedPatterns: routingResult.matchedPatterns,
            },
            workflow: {
              type: 'react',
              agentsUsed: ['react-orchestrator'],
              executionTimeMs: 0, // TODO: track timing
              iterations: reactResult.totalIterations,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (reactError) {
        console.error('[SYNC] ReAct loop failed, falling back to standard path:', reactError);
        // Fall through to standard path
      }
    }

    // =========================================================================
    // STANDARD PATH: Direct LLM call for simple action-oriented requests
    // =========================================================================

    // ---------------------------------------------------------------------
    // PROACTIVE CONTEXT ENRICHMENT (Pre-call middleware)
    // Injects relevant context based on query patterns
    // ---------------------------------------------------------------------
    let enrichedApiMessages = [...apiMessages];
    try {
      const contextEnrichment = await enrichContextForQuery(
        message,
        { supabase, companyId, userId },
        session
      );
      const enrichmentText = formatEnrichmentForPrompt(contextEnrichment);

      if (enrichmentText) {
        console.log(`[SYNC] Proactive context enrichment added (${enrichmentText.length} chars)`);
        // Inject enrichment into system message
        const systemIdx = enrichedApiMessages.findIndex(m => m.role === 'system');
        if (systemIdx >= 0) {
          enrichedApiMessages[systemIdx] = {
            ...enrichedApiMessages[systemIdx],
            content: enrichedApiMessages[systemIdx].content + '\n\n' + enrichmentText,
          };
        }
      }
    } catch (enrichError) {
      console.warn('[SYNC] Context enrichment failed, continuing without:', enrichError);
    }

        // === INTELLIGENCE ORCHESTRATION ===
        // Orchestrate deep intelligence before LLM call for "mouth-dropping" results
        // Skip for voice mode to reduce latency
        let intelligenceResult: IntelligenceResult | null = null;
        if (!voice) {
          try {
                  intelligenceResult = await orchestrateIntelligence(
                            supabase,
                            session,
                            message,
                            enrichedApiMessages.map(m => typeof m.content === 'string' ? m.content : ''),
                            []
                          );
                  if (intelligenceResult) {
                            const intelligenceContext = generateEnhancedSystemContext(intelligenceResult);
                            // Find system message and enhance it
                            const sysIdx = enrichedApiMessages.findIndex(m => m.role === 'system');
                            if (sysIdx >= 0) {
                                        enrichedApiMessages[sysIdx] = {
                                                      ...enrichedApiMessages[sysIdx],
                                                      content: enrichedApiMessages[sysIdx].content + '\n\n' + intelligenceContext,
                                        };
                            }
                            console.log(`[SYNC] Intelligence orchestration added ${intelligenceResult.deepInsights.length} insights`);
                  }
          } catch (intelligenceError) {
                  console.warn('[SYNC] Intelligence orchestration failed, continuing without:', intelligenceError);
          }
        } else {
          console.log('[SYNC] Voice mode: skipping intelligence orchestration for low latency');
        }
    

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: enrichedApiMessages,
        temperature: 0.7,
        max_tokens: maxTokens,
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
          messages: enrichedApiMessages,
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

    // Check for and execute action blocks (supports single, multiple, and chain formats)
    let actionExecuted: ActionResult | null = null;
    let chainResult: ActionChainResult | null = null;
    let proactiveInsights: ProactiveInsight[] = [];
    const parsedActions = parseActionsFromResponse(assistantMessage);

    if (parsedActions.type === 'chain' && parsedActions.chain) {
      // Execute action chain
      chainResult = await executeActions(parsedActions.chain, companyId, userId);
      assistantMessage = assistantMessage.replace(/\[ACTION_CHAIN\][\s\S]*?\[\/ACTION_CHAIN\]/g, '').trim();
      assistantMessage = assistantMessage + '\n\n' + chainResult.message;

      // Generate insights for each completed action
      const ctx: ActionContext = { supabase, companyId, userId };
      for (const completed of chainResult.completed) {
        const insights = await generatePostActionInsights(
          completed.action,
          completed.result.result,
          completed.result,
          ctx,
          session
        );
        proactiveInsights.push(...insights);
      }

    } else if (parsedActions.type === 'multiple' && parsedActions.multiple) {
      // Execute multiple actions as a sequential chain
      const chain: ActionChain = {
        id: `auto_chain_${Date.now()}`,
        actions: parsedActions.multiple,
        strategy: 'sequential',
        stopOnError: true,
      };
      chainResult = await executeActions(chain, companyId, userId);
      assistantMessage = assistantMessage.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
      assistantMessage = assistantMessage + '\n\n' + chainResult.message;

    } else if (parsedActions.type === 'single' && parsedActions.single) {
      // Execute single action with recovery
      const actionData = parsedActions.single;
      actionExecuted = await executeAction(actionData, companyId, userId);
      assistantMessage = assistantMessage.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();

      if (actionExecuted) {
        // Check if action message would contradict existing content
        // (e.g., "No invoices found" when LLM already mentioned invoice data)
        const isEmptyResultMsg = /^No \w+ found/i.test(actionExecuted.message);
        // More flexible regex: matches "6 pending invoices", "Found 3 prospects", etc.
        const dataPattern = /\d+\s+(?:\w+\s+)*(invoices?|prospects?|tasks?|products?|expenses?)/i;
        const llmMentionsData = dataPattern.test(assistantMessage);

        // Also check recent conversation history for data mentions (last 3 messages)
        const recentHistory = session.messages.slice(-3).map(m => m.content).join(' ');
        const historyMentionsData = dataPattern.test(recentHistory);

        // Check if recent actions returned non-empty results for same entity type
        const entityType = actionExecuted.message.match(/No (\w+) found/i)?.[1]?.toLowerCase();
        const recentActionHadData = session.messages.slice(-3).some(m => {
          if (!m.actionExecuted?.result) return false;
          const result = m.actionExecuted.result;
          return Array.isArray(result) && result.length > 0;
        });

        console.log('[SYNC] === MESSAGE CONTRADICTION CHECK ===');
        console.log('[SYNC] Action executed:', actionData.action);
        console.log('[SYNC] Action data:', JSON.stringify(actionData.data));
        console.log('[SYNC] Action success:', actionExecuted.success);
        console.log('[SYNC] Action message (full):', actionExecuted.message);
        console.log('[SYNC] Action result count:', Array.isArray(actionExecuted.result) ? actionExecuted.result.length : 'not array');
        console.log('[SYNC] isEmpty check:', isEmptyResultMsg);
        console.log('[SYNC] llmMentionsData:', llmMentionsData);
        console.log('[SYNC] historyMentionsData:', historyMentionsData);
        console.log('[SYNC] recentActionHadData:', recentActionHadData);
        console.log('[SYNC] entityType:', entityType);
        console.log('[SYNC] LLM response preview:', assistantMessage?.substring(0, 200));
        console.log('[SYNC] ================================');

        // Skip contradictory message if EITHER current response OR recent history mentions data
        const shouldSkipEmptyMessage = isEmptyResultMsg && (llmMentionsData || historyMentionsData || recentActionHadData);

        if (shouldSkipEmptyMessage) {
          // Skip appending contradictory "No X found" message
          console.log('[SYNC] Skipping contradictory empty result message:', actionExecuted.message);
        } else {
          // Use the action's message directly - it's already brief and conversational
          assistantMessage = assistantMessage + '\n\n' + actionExecuted.message;
        }

            // === INTELLIGENCE RESPONSE ENHANCEMENT ===
            // Enhance response with deep insights and follow-up suggestions
            if (intelligenceResult && actionExecuted) {
                    try {
                              const enhancement = await enhanceResponse(
                                          supabase,
                                          session,
                                          actionData.action,
                                          actionExecuted,
                                          intelligenceResult
                                        );
                              if (enhancement.postResponse) {
                                          assistantMessage += enhancement.postResponse;
                              }
                              // Removed verbose "You might also want to" suggestions - keep responses brief
                              console.log('[SYNC] Response enhanced with intelligence insights');
                    } catch (enhanceError) {
                              console.warn('[SYNC] Response enhancement failed:', enhanceError);
                    }
            }
        

        // Generate proactive insights
        const ctx: ActionContext = { supabase, companyId, userId };
        proactiveInsights = await generatePostActionInsights(
          actionData.action,
          actionData.data,
          actionExecuted,
          ctx,
          session
        );

        // Learn user preferences from action (non-blocking)
        extractAndLearnPreferences(actionData.action, actionData.data, session, ctx)
          .catch(err => console.warn('Failed to learn preferences:', err));

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

        // ================================================================
        // CONTINUATION: If search_products succeeded but user wanted more,
        // call LLM again to complete the multi-step request
        // ================================================================
        const isSearchAction = actionData.action === 'search_products';
        const hasMultiStepIntent = /\b(proposal|invoice|create|make|send|email)\b/i.test(message);
        const searchFoundProducts = actionExecuted.success && actionExecuted.result &&
          (Array.isArray(actionExecuted.result) ? actionExecuted.result.length > 0 : true);

        if (isSearchAction && hasMultiStepIntent && searchFoundProducts) {
          console.log('[CONTINUATION] Search completed, continuing multi-step intent...');

          // Build continuation prompt
          const wantsSend = /\bsend\s*(it)?\s*(to)?\b/i.test(message);
          const docType = /proposal/i.test(message) ? 'proposal' : 'invoice';

          const continuationPrompt = `The user originally asked: "${message}"

You already searched and found the product. Here are the search results:
${actionExecuted.message}

NOW CONTINUE to complete their request. Create the ${docType} with ALL info from the original message:
- Product name: Use the EXACT product name from search results above
- Quantity: Extract from original message (e.g., "17x" means quantity 17)
- Client name: Extract from original message
- Client email: Extract from original message if provided
${wantsSend ? `- Status: The user said "send" so set status to "sent" and include the email` : ''}

IMPORTANT: The items array must use the EXACT product name from search results.
Example: {"action": "create_${docType}", "data": {"client_name": "Name Here", "client_email": "email@here.com", "items": [{"name": "Philips OneBlade 360 Face", "quantity": 17}]}}

Output the create_${docType} [ACTION] block NOW. Do NOT ask any more questions!`;

          // Call LLM again for continuation
          const continuationMessages = [
            { role: 'system', content: enhancedSystemPrompt },
            ...apiMessages.slice(1), // Include conversation history
            { role: 'assistant', content: assistantMessage },
            { role: 'user', content: continuationPrompt },
          ];

          try {
            const contResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${TOGETHER_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'moonshotai/Kimi-K2-Instruct',
                messages: continuationMessages,
                max_tokens: 2000,
                temperature: 0.7,
              }),
            });

            if (contResponse.ok) {
              const contData = await contResponse.json();
              const continuationContent = contData.choices?.[0]?.message?.content || '';

              // Check for action in continuation response
              const contAction = parseActionFromResponse(continuationContent);
              if (contAction && (contAction.action === 'create_proposal' || contAction.action === 'create_invoice')) {
                // Execute the continuation action
                const contResult = await executeAction(contAction, companyId, userId);
                const contCleanMsg = continuationContent.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();

                if (contResult) {
                  assistantMessage = assistantMessage + '\n\n' + contCleanMsg + '\n\n' + contResult.message;
                  actionExecuted = contResult;
                  console.log('[CONTINUATION] Successfully created:', contAction.action);
                }
              }
            }
          } catch (contError) {
            console.warn('[CONTINUATION] Failed:', contError);
            // Continue without continuation - don't break the flow
          }
        }
      }
    }

    // Add proactive insights to response
    if (proactiveInsights.length > 0) {
      assistantMessage += formatInsightsForResponse(proactiveInsights);
    }

    // Generate contextual suggestions based on time/session
    const contextualSuggestions = generateContextualSuggestions(session, new Date());
    if (contextualSuggestions.length > 0 && !actionExecuted && !chainResult) {
      // Only add contextual suggestions if no action was just executed
      assistantMessage += formatInsightsForResponse(contextualSuggestions.slice(0, 1));
    }

    // Store assistant message in persistent session
    const executedActionType = parsedActions.single?.action || chainResult?.completed[0]?.action;
    const assistantMsgFinal: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString(),
      agentId: delegatedTo || 'sync',
      actionExecuted: (actionExecuted || chainResult) ? {
        type: executedActionType || 'unknown',
        success: actionExecuted?.success || chainResult?.success || false,
        result: actionExecuted?.result || chainResult?.partialResults,
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
          model: 'moonshotai/Kimi-K2-Instruct',
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
            actionExecuted: executedActionType || null,
            chainExecuted: chainResult ? chainResult.completed.map(c => c.action) : null,
            insightsGenerated: proactiveInsights.length,
            memoryContext: memoryContextStr ? 'injected' : 'none',
          },
        });
      } catch (logError) {
        console.error('Failed to log usage:', logError);
      }
    }

    // Build response with new fields
    const actionType = parsedActions.single?.action || (chainResult?.completed[0]?.action);

    // Process long responses as documents for better UX
    // ALWAYS check - even action results can be document-worthy (like forecasts, reports)
    let finalResponse = assistantMessage;
    let documentInfo: DocumentResponse | null = null;

    documentInfo = await processLongResponse(
      assistantMessage,
      message, // original user message
      context?.companyId || DEFAULT_COMPANY_ID,
      context?.userId
    );

    if (documentInfo) {
      finalResponse = documentInfo.shortMessage;
      console.log('[SYNC] Long response converted to document:', documentInfo.documentTitle);
    }

    // Safety: Remove any remaining unresolved template variables from response
    // These appear as {{variable.path}} and shouldn't be shown to users
    const templatePattern = /\{\{[^}]+\}\}/g;
    if (templatePattern.test(finalResponse)) {
      console.log('[SYNC] Found unresolved template variables in response, cleaning up');
      finalResponse = finalResponse.replace(templatePattern, '');
    }

    const syncResponse: SyncResponse = {
      response: finalResponse,
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
        type: actionType,
        result: actionExecuted.result,
        link: actionExecuted.link,
        recovery: actionExecuted.recovery ? {
          suggestions: actionExecuted.recovery.suggestions.map(s => ({
            action: s.action,
            description: s.description,
          })),
        } : undefined,
      } : undefined,
      // Include chain results if multiple actions were executed
      actionChain: chainResult ? {
        success: chainResult.success,
        completedCount: chainResult.completed.length,
        totalCount: parsedActions.chain?.actions.length || parsedActions.multiple?.length || 0,
        completed: chainResult.completed.map(c => c.action),
        failed: chainResult.failed?.action,
      } : undefined,
      // Include proactive insights
      insights: proactiveInsights.length > 0 ? proactiveInsights.map(i => ({
        type: i.type,
        message: i.message,
      })) : undefined,
      // Include document if long response was converted
      document: documentInfo ? {
        url: documentInfo.documentUrl,
        title: documentInfo.documentTitle,
      } : undefined,
    };

    return new Response(
      JSON.stringify(syncResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SYNC error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    // Provide user-friendly error messages based on error type
    let userMessage = 'I encountered an issue processing your request. ';

    if (errorMessage.includes('API error') || errorMessage.includes('LLM') || errorMessage.includes('fetch')) {
      userMessage += 'There was a temporary connection issue. Please try again in a moment.';
    } else if (errorMessage.includes('not found') || errorMessage.includes('No') || errorMessage.includes('empty')) {
      userMessage += 'No matching data was found. Try adjusting your search criteria or date range.';
    } else if (errorMessage.includes('timeout')) {
      userMessage += 'The request took too long. Please try a simpler query.';
    } else {
      userMessage += 'Please try rephrasing your request or breaking it into smaller steps.';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        response: userMessage,
        sessionId: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  // Return 200 to prevent client-side error handling
    );
  }
});
