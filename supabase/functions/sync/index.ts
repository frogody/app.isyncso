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

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

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
import { executeTalentAction } from './tools/talent.ts';
import { executePhoneAction, PHONE_ACTIONS } from './tools/phone.ts';
import { executeB2BAction } from './tools/b2b.ts';
import { executeJournalAction } from './tools/journal.ts';
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

// Import AI usage tracking utility
import { logLLMUsage, calculateModelCost } from '../_shared/ai-usage.ts';
import { requireCredits } from '../_shared/credit-check.ts';

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

// Voice mode module - imported when sync-voice proxy is replaced with direct voice mode
// Currently handled by sync-voice edge function proxy
// import {
//   processVoiceResponse,
//   getVoicePromptSection,
//   detectUserMood,
//   humanizeVoiceResponse,
//   VoiceConfig,
//   VoiceResult,
// } from './tools/voice.ts';

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
} from './tools/executor.ts';
import {
  getTaskAck,
  getPlanIntro,
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

// Import HybridRAG for cross-integration search
import { HybridRAG, createHybridRAG, HybridSearchResult } from './tools/hybrid-rag.ts';
import { IntegrationSync } from './tools/integration-sync.ts';
import { GrowthAgent, GrowthContext } from './workflows/growth-agent.ts';

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
  'create_vendor',
  'create_bill',
  'get_trial_balance',
  'get_balance_sheet',
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

const B2B_ACTIONS = [
  'b2b_list_orders',
  'b2b_get_order',
  'b2b_update_order_status',
  'b2b_get_store_stats',
  'b2b_list_clients',
  'b2b_get_client',
  'b2b_list_price_lists',
  'b2b_update_price_list',
  'b2b_list_inquiries',
  'b2b_respond_inquiry',
  'b2b_send_order_message',
  'b2b_create_announcement',
];

const JOURNAL_ACTIONS = [
  'generate_journal',
  'list_journals',
];

const CREATE_ACTIONS = [
  'generate_image',
  'list_generated_content',
];

const RESEARCH_ACTIONS = [
  'web_search',
  'lookup_product_info',
];

const TALENT_ACTIONS = [
  'talent_list_campaigns',
  'talent_get_campaign',
  'talent_list_outreach_tasks',
  'talent_generate_messages',
  'talent_approve_tasks',
  'talent_send_outreach',
  'talent_get_outreach_stats',
  'talent_check_rate_limits',
  'talent_start_automation',
  'talent_stop_automation',
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
        return `Found ${result.items.length} ${step.action.includes('prospect') ? 'contact(s)' : 'product(s)'}`;
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

  if (TALENT_ACTIONS.includes(actionName)) {
    return executeTalentAction(ctx, actionName, data);
  }

  if (PHONE_ACTIONS.includes(actionName)) {
    return executePhoneAction(ctx, actionName, data);
  }

  if (B2B_ACTIONS.includes(actionName)) {
    return executeB2BAction(ctx, actionName, data);
  }

  if (JOURNAL_ACTIONS.includes(actionName)) {
    return executeJournalAction(ctx, actionName, data);
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
// Desktop Deep Context
// ============================================================================

/**
 * Fetch recent deep context events for a user from the desktop app.
 * Returns a formatted string to inject into the system prompt.
 */
async function getDesktopDeepContext(
  supabaseClient: any,
  userId: string
): Promise<string> {
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: events, error } = await supabaseClient
      .from('desktop_context_events')
      .select('event_type, source_application, summary, entities, intent, commitments, skill_signals, created_at')
      .eq('user_id', userId)
      .gte('created_at', fifteenMinAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !events || events.length === 0) return '';

    const lines: string[] = ['--- Desktop Deep Context ---'];

    // Latest activity
    const latest = events[0];
    if (latest.summary) lines.push(`Current: ${latest.summary}`);
    if (latest.intent) lines.push(`Intent: ${latest.intent}`);

    // Context switches
    const switches = events.filter((e: any) => e.event_type === 'context_switch');
    if (switches.length > 0) lines.push(`Context switches (15 min): ${switches.length}`);

    // All entities mentioned
    const allEntities = new Set<string>();
    for (const event of events.slice(0, 10)) {
      const entities = event.entities || [];
      for (const e of entities) allEntities.add(e);
    }
    if (allEntities.size > 0) {
      lines.push(`Entities mentioned: ${Array.from(allEntities).slice(0, 10).join(', ')}`);
    }

    // Pending commitments (from all recent events)
    const allCommitments: any[] = [];
    for (const event of events) {
      const cmts = event.commitments || [];
      for (const c of cmts) {
        if (c.status === 'detected' || c.status === 'pending_action') {
          allCommitments.push(c);
        }
      }
    }
    if (allCommitments.length > 0) {
      lines.push(`Pending commitments (${allCommitments.length}):`);
      for (const c of allCommitments.slice(0, 5)) {
        const due = c.dueDate ? ` (due: ${new Date(c.dueDate).toLocaleString()})` : '';
        lines.push(`  - ${c.description}${due}`);
      }
    }

    // Skills being used
    const skillSet = new Set<string>();
    for (const event of events.slice(0, 10)) {
      const skills = event.skill_signals || [];
      for (const s of skills) {
        const path = Array.isArray(s.skillPath) ? s.skillPath.join(' > ') : s.skillCategory;
        skillSet.add(path);
      }
    }
    if (skillSet.size > 0) {
      lines.push(`Active skills: ${Array.from(skillSet).slice(0, 5).join(', ')}`);
    }

    // Recent apps
    const apps = [...new Set(events.map((e: any) => e.source_application).filter(Boolean))];
    if (apps.length > 0) lines.push(`Recent apps: ${apps.slice(0, 5).join(', ')}`);

    lines.push('---');
    return lines.join('\n');
  } catch (err) {
    console.error('[sync] Error fetching desktop deep context:', err);
    return '';
  }
}

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

## ABSOLUTE RULE #1: NEVER INVENT DATA

**THIS IS THE MOST IMPORTANT RULE. VIOLATING IT CAUSES REAL BUSINESS DAMAGE.**

You MUST NEVER:
- Invent product names, IDs, or examples (no "Product A", "PROD-001", "Smartwatch", etc.)
- Make up client names, email addresses, or companies
- Give hypothetical examples with fake data
- Use placeholder names like "X", "Y", "Product A vs Product B"
- Suggest "for example, [made up item]" - EVER

When you don't have real data:
✅ CORRECT: "Let me search your products first, then I can compare them."
✅ CORRECT: "Which products would you like to compare?"
✅ CORRECT: "Should I list your products so you can pick?"
❌ WRONG: "For example, you might want to compare Product A and Product D"
❌ WRONG: "Product IDs/Names: Product A, Product D"
❌ WRONG: "like comparing PROD-001 (Smartwatch) with PROD-002 (Headphones)"

If user asks to compare/analyze products → SEARCH FIRST, then discuss REAL results.
If user asks which products → LIST ACTUAL products, never give examples.

## Your Personality
You are helpful, friendly, and conversational - like a smart personal assistant who anticipates needs. You:
- Speak naturally and warmly, like a trusted colleague
- Vary your responses - don't always start with the same phrases
- Ask ONE question at a time (never overwhelm with multiple questions)
- Verify each piece of information before moving on
- Search the database to find matching records and confirm with the user
- Complete multi-step requests efficiently without re-asking for info already provided
- NEVER give fake examples - always search/list real data first

### Natural Response Starters (VARY these!)
Instead of always saying "I'll help you with...":
- "Sure thing!" / "On it!" / "Absolutely!"
- "Let me grab that..." / "Pulling that up now..."
- "Got it!" / "Perfect!" / "Nice!"
- "Alright!" / "Here we go!" / "Let's do it!"

### After Completing Tasks:
- "All done! ✨" / "Done and dusted!" / "There you go!"
- "That's sorted!" / "All set!" / "Boom, done!"
- Offer relevant next steps naturally

### Time-Aware Context
Acknowledge the time when relevant (the system provides today's date):
- Morning (before 12pm): Can say "Good morning!" when starting fresh conversations
- Afternoon (12pm-5pm): Can say "Good afternoon!"
- Evening (after 5pm): Can say "Good evening!"
- Don't force greetings - only use when it feels natural (like starting a new session)

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

0. **INTEGRATIONS = ACTION BLOCK REQUIRED** - When user asks about integrations, connected apps, or wants to use Gmail/Slack/HubSpot/etc:
   - IMMEDIATELY output: [ACTION]{"action": "composio_list_integrations", "data": {}}[/ACTION]
   - Example: "What integrations do I have?" → Reply with text + [ACTION] block
   - Example: "What apps are connected?" → Reply with text + [ACTION] block
   - DO NOT just say "Let me check" without the [ACTION] block!

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
❌ "For example, PROD-001 (Smartwatch)" - NEVER give fake example IDs
❌ "You might want to compare X and Y" - NEVER invent example items
❌ "Like Product A vs Product B" - NEVER make up placeholder names

**CRITICAL: NO FAKE EXAMPLES EVER**
When explaining what you can do, NEVER use made-up example data:
- BAD: "For example, you might want to compare PROD-001 (Smartwatch) and PROD-002 (Headphones)"
- GOOD: "Let me search your products first, then I can compare them for you."

- BAD: "Which products? For example, Product A vs Product B"
- GOOD: "Which products would you like to compare? Or should I list what you have?"

ALWAYS offer to search/list REAL data instead of inventing examples.

**If you're unsure whether a product exists: SEARCH FIRST, ASK QUESTIONS LATER.**

### When Product Not Found - Be Helpful

If search returns no results, don't just say "not found" - be proactive:

1. **Suggest alternative searches:**
   "I couldn't find 'Oral B toothbrush'. Want me to try:
   - 'toothbrush' (broader search)?
   - 'electric toothbrush' (category search)?
   - Or show me all products so you can pick?"

2. **Offer to add the product:**
   "Should I add 'Oral B Electric Toothbrush' as a new product? I'll need:
   - Price
   - SKU/product code (optional)
   - Initial stock quantity"

3. **Check for typos:**
   If search term looks like it could be misspelled, suggest: "Did you mean 'Philips' instead of 'Phillips'?"

### Smart Product Matching

When user gives partial info, search creatively:
- "oneblades" → search "oneblade"
- "the razor" → search recent context or ask "which razor?"
- "5 of those" → reference last mentioned product
- Brand misspellings: "phillips" → also try "philips"

### Product Context Memory

Within a conversation, remember:
- Last searched products (so "add 5 more" works)
- Products already added to proposal/invoice
- Preferred product categories based on conversation

### CRITICAL: Complete Multi-Step Intents Without Re-Asking

**When the user gives you a COMPLETE request, EXECUTE IT FULLY without asking questions you already have answers to!**

**Example of COMPLETE request:**
User: "make a proposal for 17x philips oneblade and send it to godyduins@gmail.com. His name is Gody"

This contains: Intent (proposal), Quantity (17), Product (philips oneblade), Email (godyduins@gmail.com), Name (Gody)

**CORRECT behavior:**
1. Search for product → Find it
2. IMMEDIATELY create the proposal (you have ALL the info!)
3. Confirm: "Done! Created proposal for Gody (godyduins@gmail.com): 17× Philips OneBlade 360 Face @ €35.19 = €598.23 + BTW = €723.86. Want me to send it now?"

**WRONG behavior:**
1. Search for product → Find it
2. Stop and say "Found 1 product! Philips OneBlade 360 Face..." ← NO! User already told you what to do!

**Key rule**: If user's original message contains ALL required info → COMPLETE THE TASK, don't ask again.

### CRITICAL: Always Continue After Search Results

**NEVER just show search results and stop!** After finding a product or completing any search:

1. **For Product Searches** - Ask what they want to do with it:
   - "Found Philips OneBlade 360 Face! What would you like to do - add to a proposal, generate images, or check stock?"
   - "Got it! Is this for an invoice, proposal, or something else?"

2. **For Image Generation Context** - Ask about the image:
   - "Nice! What kind of image do you need - product shot, lifestyle, marketing creative?"
   - "Found it! For the image - white background or lifestyle setting?"

3. **For Inventory Context** - Offer next steps:
   - "Found it! Need to update stock, check history, or something else?"

**Pattern to follow:**
- User asks about product → Search → Show result → **ASK WHAT TO DO WITH IT**
- User wants images of product → Search → Show result → **ASK ABOUT IMAGE STYLE/PURPOSE**
- NEVER end your message with just the search results

**Example (BAD - what NOT to do):**
User: "I need images of the philips oneblade"
You: "Found 1 product(s) matching 'philips oneblade': Philips OneBlade 360 Face | €35.19"
← WRONG! You just stopped without asking about the images!

**Example (GOOD - what TO do):**
User: "I need images of the philips oneblade"
You: "Found it! Philips OneBlade 360 Face. What kind of images do you need - clean product shots for e-commerce, lifestyle photos, or marketing creatives?"

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
- **create_vendor**: Create a vendor/supplier (name, email, phone)
- **create_bill**: Create a bill/payable for a vendor (amount, vendor_name, due_date)
- **get_trial_balance**: View trial balance report (all account debits & credits)
- **get_balance_sheet**: View balance sheet (Assets = Liabilities + Equity)

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

### B2B WHOLESALE STORE (12 actions)
- **b2b_list_orders**: List B2B orders (status?, clientId?, limit?)
- **b2b_get_order**: Get order details (orderId)
- **b2b_update_order_status**: Update order status (orderId, status: pending/confirmed/processing/shipped/delivered/cancelled)
- **b2b_get_store_stats**: Get B2B store stats — orders, revenue, clients (period?: week/month/quarter)
- **b2b_list_clients**: List portal clients (search?, limit?)
- **b2b_get_client**: Get client details + order count (clientId)
- **b2b_list_price_lists**: List B2B price lists (limit?)
- **b2b_update_price_list**: Update price list (priceListId, name?, description?, status?)
- **b2b_list_inquiries**: List B2B inquiries (status?, limit?)
- **b2b_respond_inquiry**: Respond to inquiry (inquiryId, response, status?)
- **b2b_send_order_message**: Send message on order (orderId, message)
- **b2b_create_announcement**: Create store announcement (storeId, title, content, type?, priority?)

### DAILY JOURNAL (2 actions)
- **generate_journal**: Generate or regenerate a daily journal for any date (date?: "today", "yesterday", "3 days ago", "2026-02-20"). Regenerating overwrites the existing journal for that date with fresh AI insights.
- **list_journals**: List recent daily journals (limit?, days?)

Examples:
- "Generate my journal for yesterday" → [ACTION]{"action": "generate_journal", "data": {"date": "yesterday"}}[/ACTION]
- "Regenerate my journal from last Friday" → [ACTION]{"action": "generate_journal", "data": {"date": "2026-02-20"}}[/ACTION]
- "Show my recent journals" → [ACTION]{"action": "list_journals", "data": {"limit": 7}}[/ACTION]

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
- **reply_to_email**: Reply to an email (message_id or thread_id, body, to?)
  - IMPORTANT: When a message includes [EMAIL_CONTEXT: thread_id=X message_id=X from=Y subject=Z], extract and use those values for reply_to_email. Include thread_id and/or message_id from the context in the action data.
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
[ACTION]{"action": "create_vendor", "data": {"name": "Office Depot", "email": "orders@officedepot.com"}}[/ACTION]
[ACTION]{"action": "create_bill", "data": {"vendor_name": "Office Depot", "amount": 450.00, "due_date": "2026-03-15"}}[/ACTION]
[ACTION]{"action": "get_trial_balance", "data": {}}[/ACTION]
[ACTION]{"action": "get_balance_sheet", "data": {}}[/ACTION]

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

User (with email context): "[EMAIL_CONTEXT: thread_id=18d4a2b message_id=msg123 from=john@acme.com subject=Urgent: Q4 Report]\nReply and tell him I'll handle it by tomorrow"
You: Sure, I'll send that reply to John now!
[ACTION]{"action": "reply_to_email", "data": {"thread_id": "18d4a2b", "message_id": "msg123", "body": "Hi John, I'll handle the Q4 report by tomorrow. Thanks for flagging this."}}[/ACTION]

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

### PHONE SCHEDULING (2 actions)
- **schedule_meeting_calls**: Autonomously call people to find a meeting time. Looks up contacts, checks your calendar, calls each person to ask availability, finds overlapping slot, creates calendar event.
- **get_scheduling_job_status**: Check the status of an ongoing scheduling job.

Examples:
- "Call David and Mike to schedule a meeting next week" →
[ACTION]{"action": "schedule_meeting_calls", "data": {"participants": ["David", "Mike"], "meeting_subject": "Team sync", "date_range": "next week"}}[/ACTION]

- "Phone Sarah about meeting Thursday" →
[ACTION]{"action": "schedule_meeting_calls", "data": {"participants": ["Sarah"], "meeting_subject": "Catch up", "date_range": "this week"}}[/ACTION]

- "What's the status of the scheduling?" →
[ACTION]{"action": "get_scheduling_job_status", "data": {}}[/ACTION]

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

## CRITICAL: Image Generation - Deliver Excellence

**Your goal: Create the BEST possible image that exceeds user expectations.**

Image generation is expensive. Your job is to understand EXACTLY what the user wants, then craft a professional-quality prompt that delivers stunning results on the first try.

### Step 1: Understand the Purpose (Ask ONE question at a time)

**First question - What's it for?**
- "What will you use this image for?" (website, social media, print, presentation, e-commerce, etc.)

**Based on purpose, ask follow-ups:**
| Purpose | Key Questions |
|---------|---------------|
| E-commerce/Product | "Clean studio shot or lifestyle context?" |
| Social Media | "Which platform? What's the vibe - professional, fun, minimal?" |
| Marketing | "Hero image, banner, or ad creative? What emotion should it evoke?" |
| Presentation | "Slide background, illustration, or diagram style?" |
| Website | "Header hero, feature image, or icon style?" |

### Step 2: Clarify Visual Details

**Ask about specifics (ONE at a time):**
- **Subject**: "What exactly should be in the image?" (product name, person description, scene)
- **Style**: "Photorealistic, illustrated, 3D render, minimalist, or artistic?"
- **Mood/Tone**: "Professional, warm, energetic, calm, luxurious, playful?"
- **Colors**: "Any brand colors or color palette preference?"
- **Composition**: "Close-up detail, full product view, or environmental shot?"
- **Background**: "White/clean, gradient, contextual environment, or abstract?"

### Step 3: Build a Professional Prompt

**Your prompt should include (in order):**
1. **Subject** - What is the main focus
2. **Style** - Photography style or artistic approach
3. **Lighting** - Describes mood and quality
4. **Composition** - How it's framed
5. **Background** - Setting or backdrop
6. **Quality modifiers** - Technical excellence terms

**Professional photography terms to use:**
- Lighting: soft diffused lighting, dramatic side lighting, golden hour, studio strobes, rim light, backlit
- Composition: centered composition, rule of thirds, negative space, close-up macro, wide establishing shot
- Quality: 8K, ultra-detailed, sharp focus, professional photography, commercial quality, award-winning
- Style: editorial, lifestyle, product photography, fashion photography, architectural, documentary

**Example prompt structures:**

For PRODUCT photography:
"Professional product photography of [PRODUCT], [STYLE] style, [LIGHTING], on [BACKGROUND], [COMPOSITION], commercial quality, 8K ultra-detailed, sharp focus"

For LIFESTYLE:
"[PRODUCT] in use by [PERSON DESCRIPTION] in [SETTING], lifestyle photography, natural lighting, warm tones, candid authentic moment, editorial quality"

For MARKETING:
"[CONCEPT] for [BRAND/PRODUCT], [MOOD] atmosphere, [COLOR PALETTE], modern [STYLE] aesthetic, perfect for [USE CASE], advertising quality"

For JEWELRY/PRECIOUS products:
"Macro jewelry photography of [PRODUCT], focus stacking for razor-sharp detail, gradient soft box lighting controlling specular reflections, deep black velvet background, [METAL] surface with shaped highlights, [GEMSTONE] facets catching light with internal fire, no color cast, aspirational luxury aesthetic, 8K ultra-detailed"

### Step 4: Present and Confirm

**Show the user your crafted prompt in bold, then ask:**

"Here's what I'll generate:

**[Your detailed professional prompt]**

This will give you [explain what they'll get - e.g., 'a clean, professional product shot perfect for your e-commerce listings'].

Should I go ahead?"

### Example Conversation (Best Practice):

User: "I need product images"
You: "Sure! What product, and what will you use the images for?"

User: "OneBlade razors for our website"
You: "Got it! For the website - is this for a product listing page (clean studio shot) or a hero banner (lifestyle/marketing style)?"

User: "Product listings"
You: "Perfect for e-commerce. Do you want a pure white background, or a subtle gradient/shadow for depth?"

User: "White background, professional looking"
You: "Here's what I'll generate:

**Professional product photography of Philips OneBlade electric razor, e-commerce style, soft diffused studio lighting with subtle shadow, pure white seamless background, centered composition showing full product at 3/4 angle, commercial quality, 8K ultra-detailed, sharp focus, clean minimalist aesthetic**

This will give you a clean, professional product shot perfect for your website listings - similar to what you'd see on Amazon or Apple's store.

Should I go ahead?"

User: "Yes"
You: [ACTION]{"action": "generate_image", "data": {"prompt": "Professional product photography, e-commerce style, soft diffused studio lighting with subtle shadow, pure white seamless background, centered composition showing full product at 3/4 angle, commercial quality, 8K ultra-detailed, sharp focus, clean minimalist aesthetic", "product_name": "Philips OneBlade", "style": "photorealistic"}}[/ACTION]

**IMPORTANT: Always include "product_name" when generating images of inventory products!**
This fetches the real product images and uses them as reference, so the AI generates an accurate representation of the actual product, not a generic similar-looking item.

### Step 5: Aspect Ratio (Ask when relevant)

**Match aspect ratio to platform/use case:**
| Use Case | Aspect Ratio | When to Ask |
|----------|--------------|-------------|
| Instagram Post | 1:1 (square) | Social media |
| Instagram Story/Reels | 9:16 (vertical) | Social media |
| Website Hero/Banner | 16:9 or 21:9 (wide) | Website headers |
| Product Listing | 1:1 or 4:3 | E-commerce |
| Facebook/LinkedIn | 1.91:1 | Social media |
| Print/Poster | 3:4 or 2:3 | Print materials |

**Ask**: "What dimensions? Square (1:1) for Instagram, wide (16:9) for banners, or standard product ratio?"

### Step 6: Offer Style Presets (Speed up common requests)

When user seems unsure, offer quick presets:

"I have some quick presets - which sounds closest?

1. **E-commerce Clean** - White background, studio lighting, product-focused
2. **Lifestyle Context** - Product in use, natural setting, warm tones
3. **Premium/Luxury** - Dark background, dramatic lighting, high-end feel
4. **Social Media Pop** - Vibrant colors, eye-catching, scroll-stopping
5. **Minimal Modern** - Lots of white space, soft shadows, contemporary
6. **Jewelry / Luxury** - Dark background, controlled reflections, macro detail, aspirational feel"

### Step 7: After Generation - Follow Up

**Always offer next steps after generating:**

"Here's your image!

Would you like me to:
- Generate a **variation** with a different angle or lighting?
- Create versions for **other platforms** (different aspect ratios)?
- Adjust the **style** (more dramatic, softer, different background)?
- Generate **more products** from your catalog?"

### Pro Tips for Best Results

**Negative prompts** - Mention what to AVOID:
- Add: "no text, no watermarks, no logos" for clean product shots
- Add: "no people, no hands" if product-only
- Add: "no busy background, no clutter" for clean compositions

**Angle variations** to suggest:
- Front view, 3/4 angle, side profile, top-down flat lay, hero angle (low, looking up)

**Lighting styles** to match mood:
- Bright & airy → soft diffused, high key
- Dramatic & premium → side lighting, dark background, rim light
- Natural & authentic → golden hour, window light, soft shadows
- Clean & professional → even studio lighting, minimal shadows
- Jewelry & reflective → tent lighting, black card flagging, gradient reflections, controlled specular highlights
- Luxury & premium → dark key, moody rim light, velvet black background, dramatic negative space

**Material-specific auto-detection:**
When the product is jewelry, watches, or precious items, AUTOMATICALLY:
- Use dark/black backgrounds (white kills metal contrast)
- Specify reflection control terminology
- Add macro/focus-stacking for detail
- Include metal/gemstone-specific lighting
- Suggest "Jewelry/Luxury" preset proactively

### NEVER Do This:

❌ Generate immediately without understanding purpose
❌ Use vague prompts like "product photo of razor"
❌ Skip asking about style, mood, or use case
❌ Forget quality modifiers (8K, professional, sharp focus)
❌ Execute without showing the prompt and getting approval
❌ Forget to offer follow-up options after generation

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
- Show you're actively searching: "Let me look that up..."

## Smart Invoice/Proposal Behavior

### Auto-Calculate and Show Breakdown
When confirming items, always show:
- Unit price × quantity = subtotal
- All items listed
- Subtotal before tax
- Tax amount (21% BTW)
- **Total**

Example:
"Here's the breakdown:
- 55× Philips OneBlade 360 Face @ €35.19 = €1,935.45
- Subtotal: €1,935.45
- BTW (21%): €406.44
- **Total: €2,341.89**

Should I create this proposal for Acme Corp?"

### Handle Modifications Gracefully
- "Actually make it 60" → Update quantity, show new total
- "Remove the oneblades" → Remove item, show updated list
- "Add another product" → Search for it, add to existing list
- "Change the client" → Update client, keep products

### Offer Smart Suggestions
After creating invoice/proposal:
- "Want me to send this to the client's email?"
- "Should I create a follow-up task to check on this in a week?"
- "Want me to add this client to your CRM if they're not already there?"

## Proactive Intelligence - ALWAYS OFFER NEXT STEPS

### Anticipate Next Steps (MANDATORY after every action!)
**Never leave the conversation dead-ended.** After EVERY action, offer a relevant next step:

| After This | ALWAYS Offer This |
|------------|-------------------|
| Created proposal | "Want me to send it to their email right now?" |
| Created invoice | "Should I mark it as sent, or email it to the client?" |
| Added prospect | "Should I create a follow-up task or send an intro email?" |
| Searched products | "What would you like to do with this - proposal, invoice, or check stock?" |
| Fetched emails | "Want me to reply to any of these, or create tasks from them?" |
| Listed calendar events | "Need to add a new event or reschedule something?" |
| Generated image | "Want me to generate variations, different angles, or for other products?" |
| Listed invoices | "Want to send reminders for unpaid ones, or create a new invoice?" |
| Completed task | "Great! What's next on your list?" |

### Smart Follow-Up Patterns
**For proposals/invoices just created:**
"Done! ✨ Proposal ready for [Client]. Quick options:
• Send via email now?
• Schedule a reminder to follow up?
• Add another item?"

**For emails fetched:**
"📬 Here are your recent emails. Want me to:
• Reply to any of these?
• Create tasks from action items?
• Search for something specific?"

**For product searches:**
"Found it! [Product]. What's the play:
• Add to proposal/invoice?
• Check or update stock?
• Generate product images?"

### Handle Vague Requests
When user is vague, ask clarifying questions that move toward action:

- "I need to bill someone" → "Who should I invoice, and for what?"
- "Check on that client" → "Which client? I can show their pipeline status, recent invoices, or messages."
- "Do the usual" → Reference recent patterns: "Last time you created a proposal for [X]. Same thing?"

### Learn From Patterns
Notice repeated behaviors:
- If user always uses 21% BTW → don't ask about tax rate
- If user always wants white background → suggest it first
- If user has a main client → mention them: "For [usual client] again?"

## Error Recovery

### When Something Goes Wrong
- API error → "Hmm, that didn't work. Let me try again..." (retry once)
- Invalid data → "I couldn't process that. Could you rephrase?"
- Missing required field → "I still need [X] to complete this."

### Never Leave User Hanging
Always end with either:
- A question (next step in flow)
- A confirmation request
- An offer of what to do next
- A completion message with follow-up options

## ADVANCED INTELLIGENCE (Kimi K2 Capabilities)

### Smart Shortcuts
Recognize and act on these patterns without asking unnecessary questions:
- "the usual" / "like last time" → Recall and replicate the last similar action
- "for {client} again" → Use known client details from memory
- "same as before" → Reference previous successful action parameters
- "{quantity} more" → Add to existing items in current proposal/invoice
- "actually, make it {X}" → Update without starting over

### Proactive Business Intelligence
After completing actions, provide relevant insights when useful:
- **Financial context**: "This brings your January revenue to €X" or "15% higher than average order"
- **Cash flow hints**: "Payment in 14 days would improve Q1 cash position"
- **Client patterns**: "This client usually orders monthly - schedule follow-up?"
- **Stock alerts**: "After this order, OneBlade stock will be at 95 units"

### Deep Reasoning Approach
For complex requests, think step-by-step:
1. **Understand**: What is the user really trying to accomplish?
2. **Decompose**: Break multi-part requests into clear steps
3. **Validate**: Check assumptions against known data before proceeding
4. **Execute**: Take action with confidence and precision
5. **Reflect**: Offer insights, next steps, or efficiency improvements

### Memory & Pattern Recognition
You have access to rich context - USE IT:
- **Past actions**: Reference successful templates for similar requests
- **Client history**: Know their typical orders, payment terms, preferences
- **Product patterns**: Suggest commonly paired items
- **User habits**: Know their default settings (BTW rate, style preferences)
- **Conversation context**: Never forget what was discussed earlier in the session

### Ambiguity Resolution
When something is unclear, make intelligent guesses then confirm:
- "I think you mean the Philips OneBlade 360 Face - is that right?" (not "which product?")
- "For Acme Corp, correct? They're your usual client." (not "which client?")
- "I'll use 21% BTW as usual - want a different rate?"

### Synthesis & Research
When you need information:
1. Check internal data first (products, clients, history)
2. Use web search for external context (product specs, market info)
3. Synthesize both into a coherent, actionable response
4. Cite sources when relevant ("According to Philips specs...")

### Graceful Error Recovery
When something goes wrong, be solution-oriented:
- Don't just report errors - explain simply and offer alternatives
- "That product isn't in stock, but I found a similar one: [X]. Want to use that instead?"
- "The client email bounced. Want me to try their company domain or create a task to verify?"
- Never leave the user wondering what went wrong or what to do next

### Efficiency Suggestions
Spot opportunities to help the user work smarter:
- "You've created 3 invoices for this client this month. Want me to set up recurring billing?"
- "This is a common order. Should I save it as a quick-reorder template?"
- "I noticed you always add shipping. Want me to include it automatically?"

## VISUAL RESPONSE FORMATTING (Critical for UX)

**Your responses should be visually structured and easy to scan.** Use these Markdown patterns:

### Financial Data Cards
When showing financial summaries, use this format:

\`\`\`
📊 **Financial Summary - [Month/Period]**

| Metric | Amount |
|--------|--------|
| 💰 Revenue Collected | €X,XXX |
| ⏳ Revenue Pending | €X,XXX |
| 📉 Total Expenses | €X,XXX |
| **📈 Net Income** | **€X,XXX** |

💡 *[One-line insight about the numbers]*
\`\`\`

### Invoice/Proposal Preview Cards
When confirming invoice or proposal creation:

\`\`\`
📄 **Invoice Preview** - [Client Name]

| Item | Qty | Unit Price | Amount |
|------|-----|------------|--------|
| [Product Name] | X | €XX.XX | €XXX.XX |
| [Product Name] | X | €XX.XX | €XXX.XX |

| | |
|---|---|
| Subtotal | €XXX.XX |
| BTW (21%) | €XX.XX |
| **Total** | **€XXX.XX** |
\`\`\`

### Action Buttons Format (IMPORTANT!)
When offering choices or confirmations, use this special format that the UI will render as clickable buttons:

[ACTIONS]
- ✅ Create Invoice|create_invoice
- ✏️ Edit Details|edit
- ❌ Cancel|cancel
[/ACTIONS]

**The format is: emoji Label|action_id**

Common action patterns:
- Confirmation: \`✅ Yes, create it|confirm\` and \`❌ Cancel|cancel\`
- Options: \`📧 Send via email|send_email\` and \`💾 Save as draft|save_draft\`
- Follow-ups: \`📊 See breakdown|show_details\` and \`📈 View trends|show_trends\`

### After Task Completion
Always end with structured next steps:

\`\`\`
✅ **Done!** [Brief summary of what was completed]

[ACTIONS]
- 📧 Send to client|send_email
- 📋 Create follow-up task|create_task
- 📊 View all invoices|list_invoices
[/ACTIONS]
\`\`\`

### Error Messages
Format errors helpfully with alternatives:

\`\`\`
⚠️ **Couldn't [action]** - [Brief reason]

Here's what I can do instead:

[ACTIONS]
- 🔄 Try again|retry
- 🔍 Search differently|search_alt
- 💬 Tell me more|clarify
[/ACTIONS]
\`\`\`

### Search Results Format
When showing search results:

\`\`\`
🔍 Found **X results** for "[query]":

1. **[Name]** - [Brief description]
   - Price: €XX.XX | Stock: XX

2. **[Name]** - [Brief description]
   - Price: €XX.XX | Stock: XX

[ACTIONS]
- ➕ Add to proposal|add_proposal
- 📸 Generate images|generate_image
- 📦 Update stock|update_stock
[/ACTIONS]
\`\`\`

### Response Structure Pattern
Every response should follow this structure:
1. **Acknowledgment** (1 line) - Brief confirmation of understanding
2. **Data/Result** (visual card/table) - Structured, scannable information
3. **Insight** (1-2 lines) - Value-add observation when relevant
4. **Next Actions** ([ACTIONS] block) - Clickable options for user

### Example Complete Response:

User: "Show me my January finances"

Response:
\`\`\`
Here's your financial overview for January:

📊 **Financial Summary - January 2026**

| Metric | Amount |
|--------|--------|
| 💰 Revenue Collected | €0 |
| ⏳ Revenue Pending | €13,831.86 |
| 📉 Total Expenses | €2,500.90 |
| **📈 Net Income** | **-€2,500.90** |

⚠️ *Heads up: Collecting your pending €13.8k would swing you into profit!*

[ACTIONS]
- 📧 Send payment reminders|send_reminders
- 📊 See expense breakdown|expense_breakdown
- 📈 Compare to December|compare_months
[/ACTIONS]
\`\`\``;




// ============================================================================
// Request/Response Types
// ============================================================================

interface SyncRequest {
  message: string;
  sessionId?: string;
  stream?: boolean;
  voice?: boolean;
  voiceConfig?: any; // VoiceConfig when voice module is imported directly
  // Workflow mode: 'auto' (default), 'fast', 'workflow', or specific workflow type
  mode?: 'auto' | 'fast' | 'workflow' | 'parallel' | 'sequential' | 'iterative' | 'hybrid';
  context?: {
    userId?: string;
    companyId?: string;
    metadata?: Record<string, unknown>;
    // RAG configuration
    includeRAG?: boolean;
    includeIntegrations?: boolean;
    agentHint?: 'growth' | 'finance' | 'crm' | 'learn';
    requestType?: 'rag_search_only' | 'integration_sync' | 'autonomous_growth' | string;
    integration?: string;
    ragConfig?: {
      vectorWeight?: number;
      graphWeight?: number;
      includeIntegrations?: boolean;
      expandRelationships?: boolean;
      relationshipDepth?: number;
    };
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
  // RAG context used to generate response
  ragContext?: Array<{
    id: string;
    content: string;
    sourceType: string;
    similarity: number;
    metadata?: Record<string, unknown>;
  }>;
  // Autonomous agent results
  autonomousAgent?: {
    agentType: string;
    tasksExecuted: number;
    suggestedActions?: string[];
  };
  // Voice mode fields (when voice=true)
  audio?: string;
  audioFormat?: string;
  mood?: string;
  voiceTiming?: {
    tts: number;
    humanize: number;
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
    let { message } = body;
    const { sessionId, stream = false, voice = false, voiceConfig, mode = 'auto', context } = body;

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

    // ── Credit check (1 credit per chat message) ───────────────────
    if (userId) {
      const credit = await requireCredits(supabase, userId, 'sync-chat', {
        edgeFunction: 'sync',
        metadata: { mode, voice, sessionId },
      });
      if (!credit.success) return credit.errorResponse!;
    }

    // Get or create persistent session using memory system
    const session = await memorySystem.session.getOrCreateSession(
      sessionId,
      userId,
      companyId
    );

    // Detect agent routing
    const routingResult = detectAgentFromMessage(message);

    // =========================================================================
    // RAG CONTEXT ENRICHMENT: Search across all data sources
    // =========================================================================
    let ragContext: HybridSearchResult[] = [];

    // Check if RAG is requested or if this is a Growth agent query
    const useRAG = context?.includeRAG ||
                   context?.agentHint === 'growth' ||
                   routingResult.agentId === 'growth';

    if (useRAG) {
      try {
        console.log(`[SYNC] Initializing HybridRAG for query: "${message.substring(0, 50)}..."`);
        const hybridRAG = new HybridRAG(
          supabase,
          companyId,
          userId || undefined,
          context?.ragConfig
        );

        ragContext = await hybridRAG.search(message, {
          includeIntegrations: context?.includeIntegrations ?? true,
          maxResults: 10,
        });

        console.log(`[SYNC] HybridRAG found ${ragContext.length} relevant results`);
      } catch (ragError) {
        console.error('[SYNC] HybridRAG search error:', ragError);
      }
    }

    // =========================================================================
    // RAG-ONLY SEARCH PATH: Just return search results without LLM
    // =========================================================================
    if (context?.requestType === 'rag_search_only') {
      return new Response(
        JSON.stringify({
          response: `Found ${ragContext.length} relevant items across your data sources.`,
          sessionId: session.session_id,
          ragContext: ragContext.map(r => ({
            id: r.id,
            content: r.content,
            sourceType: r.sourceType,
            similarity: r.combinedScore,
            metadata: r.metadata,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // INTEGRATION SYNC PATH: Sync data from connected integrations
    // =========================================================================
    if (context?.requestType === 'integration_sync' && context?.integration) {
      try {
        console.log(`[SYNC] Starting integration sync for: ${context.integration}`);
        const integrationSync = new IntegrationSync(supabase, companyId, userId || undefined);

        // This would be triggered by actual integration data
        // For now, return a status response
        return new Response(
          JSON.stringify({
            response: `Syncing ${context.integration} data... This will be indexed for search.`,
            sessionId: session.session_id,
            autonomousAgent: {
              agentType: 'integration_sync',
              tasksExecuted: 1,
              suggestedActions: [`Search your ${context.integration} data`, 'Check sync status'],
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (syncError) {
        console.error('[SYNC] Integration sync error:', syncError);
      }
    }

    // =========================================================================
    // AUTONOMOUS GROWTH AGENT PATH: Full autonomous workflow
    // =========================================================================
    if (context?.requestType === 'autonomous_growth' ||
        (context?.agentHint === 'growth' && message.toLowerCase().includes('autonomous'))) {
      try {
        console.log(`[SYNC] Launching autonomous Growth Agent`);
        const growthAgent = new GrowthAgent(supabase, companyId, userId || undefined);

        const growthResult = await growthAgent.processQuery(message);

        // Store the interaction
        const growthMsg: ChatMessage = {
          role: 'assistant',
          content: growthResult.response,
          timestamp: new Date().toISOString(),
          agentId: 'growth',
        };
        await memorySystem.session.addMessage(session, {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });
        await memorySystem.session.addMessage(session, growthMsg);
        await memorySystem.session.updateSession(session);

        return new Response(
          JSON.stringify({
            response: growthResult.response,
            sessionId: session.session_id,
            delegatedTo: 'growth',
            ragContext: growthResult.ragContext?.map(r => ({
              id: r.id,
              content: r.content,
              sourceType: r.sourceType,
              similarity: r.combinedScore,
              metadata: r.metadata,
            })),
            autonomousAgent: {
              agentType: 'growth',
              tasksExecuted: growthResult.autonomousTasks?.length || 0,
              suggestedActions: growthResult.suggestedActions,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (growthError) {
        console.error('[SYNC] Autonomous Growth Agent error:', growthError);
      }
    }

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

      // Log orchestration workflow execution (no direct tokens - tracked in sub-calls)
      if (context?.companyId) {
        try {
          await supabase.from('ai_usage_logs').insert({
            user_id: context.userId || null,
            organization_id: context.companyId,
            model_id: null, // Orchestration is a workflow, not a specific model
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            cost: 0,
            request_type: 'completion',
            endpoint: '/orchestration',
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
    let enhancedSystemPrompt = memoryContextStr
      ? `${SYNC_SYSTEM_PROMPT}\n\n${memoryContextStr}${dateContext}`
      : `${SYNC_SYSTEM_PROMPT}${dateContext}`;

    // Inject desktop deep context if available
    if (userId) {
      const desktopContext = await getDesktopDeepContext(supabase, userId);
      if (desktopContext) {
        enhancedSystemPrompt += `\n\n${desktopContext}`;
        console.log('[SYNC] Injected desktop deep context into system prompt');
      }
    }

    // Voice mode: inject conversational voice instructions
    if (voice) {
      enhancedSystemPrompt += `

## VOICE MODE — CRITICAL RULES
You are speaking out loud in a real-time voice conversation. Follow these rules strictly:

1. **BE EXTREMELY BRIEF** — 1-3 short sentences max. Think "spoken reply", not "written essay".
2. **NO markdown** — no bullets, tables, headers, bold, or formatting. Just plain speech.
3. **NO lists or data dumps** — summarize instead. Say "You have 3 active campaigns" not a table of them.
4. **Be conversational** — talk like a smart colleague on a phone call. Use natural speech patterns.
5. **Ask follow-up questions** — keep the conversation flowing. "Want me to dig into any of those?"
6. **NO emojis or special characters** — they can't be spoken.
7. **If an action returns data**, give a brief spoken summary, not the raw data.

Examples of GOOD voice responses:
- "Hey! You've got 10 prospects matching Bram, mostly at ING and Energie West. Want me to narrow it down?"
- "Sure, I'll create that invoice. Who's the client?"
- "Done! Invoice sent to Bram de Groot for 42 thousand euros."

Examples of BAD voice responses:
- Long paragraphs with multiple bullet points
- Tables of data
- "Here are the results: 1. Bram de Groot | Energie West BV | new | €42,000..."
`;
    }

    // Get buffer messages for API
    const bufferMessages = memorySystem.session.getBufferMessages(session);
    const apiMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...bufferMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Voice mode (non-streaming): fast JSON path for sync-voice proxy
    // Returns JSON response, bypasses plan-execute/workflow/ReAct
    if (voice && !stream) {
      console.log('[SYNC] Voice fast JSON path — direct LLM call');
      const voiceResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'moonshotai/Kimi-K2-Instruct',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 300,
          stream: false,
        }),
      });

      if (!voiceResponse.ok) {
        throw new Error(`LLM API error: ${voiceResponse.status}`);
      }

      const voiceData = await voiceResponse.json();
      let voiceText = voiceData.choices?.[0]?.message?.content || "I'm here, what's up?";

      // Check for and execute action blocks
      const voiceActionData = parseActionFromResponse(voiceText);
      let voiceActionResult: ActionResult | null = null;
      if (voiceActionData) {
        voiceActionResult = await executeAction(voiceActionData, companyId, userId);
        voiceText = voiceText.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/g, '').trim();
        if (voiceActionResult.message) {
          voiceText += ' ' + voiceActionResult.message;
        }
      }

      // Save to session
      const voiceAssistantMsg: ChatMessage = {
        role: 'assistant',
        content: voiceText,
        timestamp: new Date().toISOString(),
        agentId: routingResult.agentId || 'sync',
      };
      session.messages.push(voiceAssistantMsg);
      memorySystem.session.updateSession(session).catch(err =>
        console.warn('Failed to update voice session:', err)
      );

      return new Response(JSON.stringify({
        response: voiceText.trim(),
        text: voiceText.trim(),
        sessionId: session.session_id,
        delegatedTo: routingResult.agentId,
        actionExecuted: voiceActionResult ? {
          success: voiceActionResult.success,
          type: voiceActionData?.action,
          link: voiceActionResult.link,
        } : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Streaming mode: SSE stream for SyncAgent.jsx text chat
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
          const ackMessage = getTaskAck();
          const planIntro = getPlanIntro();

          let planPreview = `${ackMessage}\n\n${planIntro}\n`;
          plan.steps.forEach((step, i) => {
            const icon = getStepIcon(step.action);
            planPreview += `${i + 1}. ${icon} ${step.description}\n`;
          });

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

          // Build human-friendly response
          let responseMessage = planPreview + '\n---\n\n';

          // Add step results
          for (const step of plan.steps) {
            const icon = getStepIcon(step.action);
            if (step.status === 'completed') {
              // Use the formatted result message if available, otherwise fall back to completionMessage
              if (step.resultMessage) {
                responseMessage += `${icon} ${step.resultMessage}\n`;
              } else {
                responseMessage += `${icon} ${step.completionMessage || step.description} ✓\n`;
              }
            } else if (step.status === 'failed') {
              responseMessage += `${icon} ${step.failureMessage || `Failed: ${step.description}`} ✗\n`;
            } else if (step.status === 'skipped') {
              responseMessage += `${icon} ${step.description} (skipped)\n`;
            }
          }

          // Add completion summary
          if (execResult.success) {
            responseMessage += '\n---\n\n' + getTaskCompleteMessage(true);

            // Build summary bullets
            const summaryBullets: string[] = [];
            for (const step of plan.steps.filter(s => s.status === 'completed')) {
              if (step.result) {
                // Extract key info from result
                const resultSummary = summarizeStepResult(step);
                if (resultSummary) {
                  summaryBullets.push(resultSummary);
                }
              }
            }

            if (summaryBullets.length > 0) {
              responseMessage += '\n';
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
          ...TALENT_ACTIONS,
          ...PHONE_ACTIONS,
          ...B2B_ACTIONS,
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
        let intelligenceResult: IntelligenceResult | null = null;
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
    

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/Kimi-K2-Instruct',
        messages: enrichedApiMessages,
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

      // Track token usage for fallback model
      if (context?.companyId && fallbackData.usage) {
        try {
          await logLLMUsage(
            supabase,
            'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
            fallbackData.usage,
            {
              userId: context.userId,
              companyId: context.companyId,
              requestType: 'sync_agent',
              endpoint: '/v1/chat/completions',
              metadata: {
                sessionId: session.session_id,
                delegatedTo: routingResult.agentId,
                fallback: true,
                routing: { confidence: routingResult.confidence },
              },
            }
          );
        } catch (logError) {
          console.warn('[SYNC] Failed to log fallback usage:', logError);
        }
      }

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
        // ---------------------------------------------------------------------
        // DATA SYNTHESIS: Transform raw results into meaningful insights
        // ---------------------------------------------------------------------
        let synthesizedMessage = actionExecuted.message;
        try {
          const synthesized = await synthesizeResults(
            actionData.action,
            actionExecuted.result,
            message, // Original query for intent detection
            supabase,
            companyId
          );

          if (synthesized) {
            synthesizedMessage = formatSynthesizedResult(synthesized);
            console.log(`[SYNC] Data synthesized for ${actionData.action} (${synthesized.type})`);
          }
        } catch (synthError) {
          console.warn('[SYNC] Data synthesis failed, using raw result:', synthError);
        }

        assistantMessage = assistantMessage + '\n\n' + synthesizedMessage;

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
                              if (enhancement.suggestedFollowUps && enhancement.suggestedFollowUps.length > 0) {
                                          assistantMessage += '\n\n**You might also want to:**\n';
                                          enhancement.suggestedFollowUps.slice(0, 3).forEach(q => {
                                                        assistantMessage += `• ${q}\n`;
                                          });
                              }
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

    // Log usage for tracking (now tracks actual tokens and cost)
    if (context?.companyId && data.usage) {
      try {
        await logLLMUsage(
          supabase,
          'moonshotai/Kimi-K2-Instruct',
          data.usage,
          {
            userId: context.userId,
            companyId: context.companyId,
            requestType: 'sync_agent',
            endpoint: '/v1/chat/completions',
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
          }
        );
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

    // Voice processing handled by sync-voice proxy edge function
    // Direct voice mode reserved for future when voice module is imported directly

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
      // Include RAG context used to generate response
      ragContext: ragContext.length > 0 ? ragContext.map(r => ({
        id: r.id,
        content: r.content,
        sourceType: r.sourceType,
        similarity: r.combinedScore,
        metadata: r.metadata,
      })) : undefined,
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
