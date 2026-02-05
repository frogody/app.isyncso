/**
 * Proactive Intelligence System for SYNC
 *
 * Provides intelligent, contextual insights:
 * - PRE-CALL context enrichment (middleware before LLM calls)
 * - Post-action insights (revenue impact, stock warnings, etc.)
 * - Pattern recognition (billing cycles, common clients)
 * - Smart suggestions based on context
 * - User preference learning
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { ActionResult, ActionContext } from './types.ts';
import { SyncSession, ActiveEntities } from '../memory/types.ts';

// ============================================================================
// PRE-CALL CONTEXT ENRICHMENT (Middleware)
// ============================================================================

export interface ContextEnrichment {
  summaryContext: string;       // Recent activity summary
  relevantEntities: string;     // Entities likely relevant to query
  pendingItems: string;         // Pending tasks, invoices, etc.
  timeContext: string;          // Time-aware context
  userPreferences: string;      // Known user preferences
}

/**
 * Enrich context BEFORE making LLM call
 * This is the proactive context middleware Vy recommended
 */
export async function enrichContextForQuery(
  query: string,
  ctx: ActionContext,
  session: SyncSession
): Promise<ContextEnrichment> {
  const enrichment: ContextEnrichment = {
    summaryContext: '',
    relevantEntities: '',
    pendingItems: '',
    timeContext: '',
    userPreferences: '',
  };

  try {
    const now = new Date();
    const supabase = ctx.supabase;
    const companyId = ctx.companyId;

    // 1. TIME CONTEXT - Always include
    enrichment.timeContext = generateTimeContext(now);

    // 2. RECENT ACTIVITY SUMMARY - Based on query patterns
    if (shouldFetchRecentActivity(query)) {
      enrichment.summaryContext = await fetchRecentActivitySummary(supabase, companyId, now);
    }

    // 3. PENDING ITEMS - Based on query patterns
    if (shouldFetchPendingItems(query)) {
      enrichment.pendingItems = await fetchPendingItemsSummary(supabase, companyId, now);
    }

    // 4. USER PREFERENCES - If available
    enrichment.userPreferences = await fetchUserPreferences(supabase, ctx.userId, companyId);

    // 5. SESSION ENTITIES - From current conversation
    if (session.active_entities.clients.length > 0 || session.active_entities.products.length > 0) {
      enrichment.relevantEntities = formatSessionEntities(session);
    }

  } catch (error) {
    console.warn('[ProactiveContext] Error enriching context:', error);
  }

  return enrichment;
}

/**
 * Format enrichment for injection into system prompt
 */
export function formatEnrichmentForPrompt(enrichment: ContextEnrichment): string {
  const sections: string[] = [];

  if (enrichment.timeContext) {
    sections.push(enrichment.timeContext);
  }

  if (enrichment.summaryContext) {
    sections.push(`\n## RECENT ACTIVITY\n${enrichment.summaryContext}`);
  }

  if (enrichment.pendingItems) {
    sections.push(`\n## PENDING ITEMS\n${enrichment.pendingItems}`);
  }

  if (enrichment.relevantEntities) {
    sections.push(`\n## CONVERSATION CONTEXT\n${enrichment.relevantEntities}`);
  }

  if (enrichment.userPreferences) {
    sections.push(`\n## USER PREFERENCES\n${enrichment.userPreferences}`);
  }

  return sections.join('\n');
}

// Helper: Determine if query needs recent activity
function shouldFetchRecentActivity(query: string): boolean {
  const patterns = [
    /\b(summary|summarize|overview|report|weekly|monthly|review)\b/i,
    /\b(recent|latest|last|this week|today|yesterday)\b/i,
    /\b(how (am i|are we) doing|status|progress)\b/i,
  ];
  return patterns.some(p => p.test(query));
}

// Helper: Determine if query needs pending items
function shouldFetchPendingItems(query: string): boolean {
  const patterns = [
    /\b(pending|overdue|due|outstanding|open|unpaid)\b/i,
    /\b(what('s| is) (left|remaining|next)|to-?do)\b/i,
    /\b(tasks?|invoices?|proposals?)\b/i,
  ];
  return patterns.some(p => p.test(query));
}

// Generate time-aware context
function generateTimeContext(now: Date): string {
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  let greeting = 'Hello';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';

  let timeNote = '';
  if (now.getDay() === 1) timeNote = ' Start of the work week.';
  else if (now.getDay() === 5) timeNote = ' End of the work week approaching.';

  const dayOfMonth = now.getDate();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (dayOfMonth >= lastDayOfMonth - 2) {
    timeNote += ' End of month.';
  }

  return `## TIME CONTEXT\nToday is ${dayOfWeek}, ${dateStr}.${timeNote}`;
}

// Fetch recent activity summary
async function fetchRecentActivitySummary(
  supabase: SupabaseClient,
  companyId: string,
  now: Date
): Promise<string> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lines: string[] = [];

  try {
    // Recent invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, status')
      .eq('company_id', companyId)
      .gte('created_at', weekAgo.toISOString());

    if (invoices && invoices.length > 0) {
      const invoiceTotal = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const paidCount = invoices.filter(i => i.status === 'paid').length;
      lines.push(`- Invoices this week: ${invoices.length} created (${paidCount} paid), €${invoiceTotal.toFixed(2)} total`);
    }

    // Recent expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('company_id', companyId)
      .gte('date', weekAgo.toISOString().split('T')[0]);

    if (expenses && expenses.length > 0) {
      const expenseTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      lines.push(`- Expenses this week: ${expenses.length} logged, €${expenseTotal.toFixed(2)} total`);
    }

    // Recent tasks completed
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('company_id', companyId)
      .gte('updated_at', weekAgo.toISOString());

    if (tasks && tasks.length > 0) {
      const completed = tasks.filter(t => t.status === 'complete').length;
      lines.push(`- Tasks this week: ${completed} completed of ${tasks.length} total activity`);
    }

  } catch (error) {
    console.warn('[ProactiveContext] Error fetching activity summary:', error);
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

// Fetch pending items summary
async function fetchPendingItemsSummary(
  supabase: SupabaseClient,
  companyId: string,
  now: Date
): Promise<string> {
  const lines: string[] = [];
  const today = now.toISOString().split('T')[0];

  try {
    // Pending invoices
    const { data: pendingInvoices } = await supabase
      .from('invoices')
      .select('total, client_name, due_date')
      .eq('company_id', companyId)
      .in('status', ['sent', 'draft']);

    if (pendingInvoices && pendingInvoices.length > 0) {
      const pendingTotal = pendingInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const overdue = pendingInvoices.filter(i => i.due_date && i.due_date < today).length;
      lines.push(`- Pending invoices: ${pendingInvoices.length} (€${pendingTotal.toFixed(2)})${overdue > 0 ? ` - ${overdue} overdue!` : ''}`);
    }

    // Pending tasks
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('title, due_date, priority')
      .eq('company_id', companyId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(5);

    if (pendingTasks && pendingTasks.length > 0) {
      const overdue = pendingTasks.filter(t => t.due_date && t.due_date < today).length;
      const highPriority = pendingTasks.filter(t => t.priority === 'high').length;
      lines.push(`- Pending tasks: ${pendingTasks.length} open${overdue > 0 ? ` (${overdue} overdue)` : ''}${highPriority > 0 ? ` - ${highPriority} high priority` : ''}`);
    }

    // Draft proposals
    const { data: draftProposals } = await supabase
      .from('proposals')
      .select('id, client_name')
      .eq('company_id', companyId)
      .eq('status', 'draft');

    if (draftProposals && draftProposals.length > 0) {
      lines.push(`- Draft proposals: ${draftProposals.length} waiting to be sent`);
    }

  } catch (error) {
    console.warn('[ProactiveContext] Error fetching pending items:', error);
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

// Fetch user preferences
async function fetchUserPreferences(
  supabase: SupabaseClient,
  userId: string | undefined,
  companyId: string
): Promise<string> {
  if (!userId) return '';

  const lines: string[] = [];

  try {
    const { data: prefs } = await supabase
      .from('sync_user_preferences')
      .select('preference_key, preference_value, confidence')
      .eq('user_id', userId)
      .gte('confidence', 0.6)
      .order('confidence', { ascending: false })
      .limit(5);

    if (prefs && prefs.length > 0) {
      for (const pref of prefs) {
        const key = pref.preference_key.replace(/_/g, ' ');
        lines.push(`- ${key}: ${JSON.stringify(pref.preference_value)}`);
      }
    }
  } catch (error) {
    // Table might not exist, ignore
  }

  return lines.length > 0 ? `Known preferences:\n${lines.join('\n')}` : '';
}

// Format session entities for context
function formatSessionEntities(session: SyncSession): string {
  const lines: string[] = [];

  if (session.active_entities.clients.length > 0) {
    const clients = session.active_entities.clients.slice(0, 3).map(c => c.name).join(', ');
    lines.push(`- Recently mentioned clients: ${clients}`);
  }

  if (session.active_entities.products.length > 0) {
    const products = session.active_entities.products.slice(0, 3).map(p => p.name).join(', ');
    lines.push(`- Recently mentioned products: ${products}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Types
// ============================================================================

export interface ProactiveInsight {
  type: 'info' | 'warning' | 'suggestion' | 'celebration';
  message: string;
  action?: {  // Optional follow-up action
    label: string;
    action: string;
    data: any;
  };
  priority: number;  // 0-100, higher = more important
}

export interface UserPreference {
  key: string;
  value: any;
  confidence: number;  // How confident we are this is a preference
  learnedFrom: string; // Action that taught us this
  count: number;       // How many times we've seen this pattern
}

export interface PatternMatch {
  pattern: string;
  description: string;
  lastOccurrence: string;
  frequency: number;
}

// ============================================================================
// Post-Action Insights
// ============================================================================

/**
 * Generate insights after an action is executed
 */
export async function generatePostActionInsights(
  action: string,
  data: any,
  result: ActionResult,
  ctx: ActionContext,
  session: SyncSession
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];

  if (!result.success) {
    return insights;
  }

  const supabase = ctx.supabase;

  // Route to specific insight generators
  switch (action) {
    case 'create_invoice':
    case 'create_proposal':
      insights.push(...await generateFinanceInsights(action, data, result, supabase, ctx.companyId));
      break;
    case 'create_expense':
      insights.push(...await generateExpenseInsights(data, result, supabase, ctx.companyId));
      break;
    case 'search_products':
    case 'list_products':
      insights.push(...await generateProductInsights(data, result, supabase, ctx.companyId));
      break;
    case 'update_inventory':
      insights.push(...await generateInventoryInsights(data, result, supabase, ctx.companyId));
      break;
    case 'create_prospect':
      insights.push(...await generateCRMInsights(data, result, supabase, ctx.companyId));
      break;
    case 'complete_task':
      insights.push(...await generateTaskInsights(data, result, supabase, ctx.companyId, ctx.userId));
      break;
    case 'generate_image':
      insights.push(...generateImageInsights(data, result));
      break;
  }

  // Add pattern-based insights
  insights.push(...await detectPatterns(action, data, session, ctx));

  // Sort by priority
  return insights.sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// Finance Insights
// ============================================================================

async function generateFinanceInsights(
  action: string,
  data: any,
  result: ActionResult,
  supabase: SupabaseClient,
  companyId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const invoiceData = result.result;

  if (!invoiceData) return insights;

  const total = invoiceData.total || 0;
  const clientName = invoiceData.client_name || data.client_name;

  // Get financial context
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  try {
    // Get monthly revenue
    const { data: monthlyInvoices } = await supabase
      .from('invoices')
      .select('total, status')
      .eq('company_id', companyId)
      .gte('created_at', startOfMonth.toISOString());

    const monthlyRevenue = monthlyInvoices
      ?.filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0) || 0;

    const monthlyPending = monthlyInvoices
      ?.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.total || 0), 0) || 0;

    // Revenue milestone insights
    if (monthlyRevenue + total >= 10000 && monthlyRevenue < 10000) {
      insights.push({
        type: 'celebration',
        message: `Congratulations! This invoice brings your monthly revenue to over €10,000!`,
        priority: 90,
      });
    }

    // Pending revenue context
    if (monthlyPending > 5000) {
      insights.push({
        type: 'info',
        message: `You now have €${monthlyPending.toFixed(2)} in pending invoices this month.`,
        action: {
          label: 'View pending invoices',
          action: 'list_invoices',
          data: { status: 'sent' },
        },
        priority: 60,
      });
    }

    // Client history
    const { data: clientHistory } = await supabase
      .from('invoices')
      .select('total, created_at')
      .eq('company_id', companyId)
      .ilike('client_name', `%${clientName}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (clientHistory && clientHistory.length > 1) {
      const clientTotal = clientHistory.reduce((sum, i) => sum + (i.total || 0), 0);
      insights.push({
        type: 'info',
        message: `This is invoice #${clientHistory.length} for ${clientName}. Total invoiced: €${clientTotal.toFixed(2)}`,
        priority: 40,
      });

      // Detect billing pattern
      if (clientHistory.length >= 3) {
        const intervals = [];
        for (let i = 0; i < clientHistory.length - 1; i++) {
          const d1 = new Date(clientHistory[i].created_at);
          const d2 = new Date(clientHistory[i + 1].created_at);
          intervals.push(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if (avgInterval >= 25 && avgInterval <= 35) {
          insights.push({
            type: 'suggestion',
            message: `You typically bill ${clientName} monthly. Consider setting up a recurring invoice.`,
            priority: 55,
          });
        }
      }
    }

    // First invoice for a new client
    if (!clientHistory || clientHistory.length === 1) {
      insights.push({
        type: 'info',
        message: `This is your first invoice for ${clientName}. Would you like to add them as a prospect for follow-up?`,
        action: {
          label: 'Create prospect',
          action: 'create_prospect',
          data: { first_name: clientName.split(' ')[0], last_name: clientName.split(' ').slice(1).join(' ') },
        },
        priority: 35,
      });
    }

  } catch (error) {
    console.warn('Failed to generate finance insights:', error);
  }

  return insights;
}

// ============================================================================
// Expense Insights
// ============================================================================

async function generateExpenseInsights(
  data: any,
  result: ActionResult,
  supabase: SupabaseClient,
  companyId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get monthly expenses by category
    const { data: monthlyExpenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('company_id', companyId)
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    if (monthlyExpenses && monthlyExpenses.length > 0) {
      const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const category = data.category || result.result?.category;

      // Category breakdown
      const categoryTotals: Record<string, number> = {};
      for (const exp of monthlyExpenses) {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      }

      const categoryTotal = categoryTotals[category] || 0;
      const categoryPercent = totalExpenses > 0 ? (categoryTotal / totalExpenses * 100).toFixed(1) : 0;

      insights.push({
        type: 'info',
        message: `${category} expenses this month: €${categoryTotal.toFixed(2)} (${categoryPercent}% of total €${totalExpenses.toFixed(2)})`,
        priority: 45,
      });

      // Budget warning (if category spending is high)
      if (categoryTotal > 1000 && categoryPercent > 30) {
        insights.push({
          type: 'warning',
          message: `${category} is your largest expense category this month.`,
          action: {
            label: 'View expenses',
            action: 'list_expenses',
            data: { category },
          },
          priority: 65,
        });
      }
    }

  } catch (error) {
    console.warn('Failed to generate expense insights:', error);
  }

  return insights;
}

// ============================================================================
// Product/Inventory Insights
// ============================================================================

async function generateProductInsights(
  data: any,
  result: ActionResult,
  supabase: SupabaseClient,
  companyId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const products = result.result;

  if (!Array.isArray(products)) return insights;

  // Check for low stock items in search results
  const lowStock = products.filter((p: any) => p.quantity !== undefined && p.quantity < 10 && p.quantity > 0);
  const outOfStock = products.filter((p: any) => p.quantity !== undefined && p.quantity === 0);

  if (outOfStock.length > 0) {
    insights.push({
      type: 'warning',
      message: `${outOfStock.length} out of stock.`,
      action: {
        label: 'Details',
        action: 'get_low_stock',
        data: {},
      },
      priority: 80,
    });
  } else if (lowStock.length > 0) {
    insights.push({
      type: 'warning',
      message: `${lowStock.length} running low.`,
      action: {
        label: 'Details',
        action: 'get_low_stock',
        data: {},
      },
      priority: 60,
    });
  }

  return insights;
}

async function generateInventoryInsights(
  data: any,
  result: ActionResult,
  supabase: SupabaseClient,
  companyId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];

  if (result.result?.quantity !== undefined) {
    const newQuantity = result.result.quantity;
    const productName = data.product_name || result.result.name || 'Product';

    if (newQuantity === 0) {
      insights.push({
        type: 'warning',
        message: `${productName} is now out of stock! Consider reordering.`,
        priority: 85,
      });
    } else if (newQuantity < 5) {
      insights.push({
        type: 'warning',
        message: `${productName} is running low (${newQuantity} remaining).`,
        priority: 65,
      });
    } else if (newQuantity > 100) {
      insights.push({
        type: 'info',
        message: `${productName} is well stocked (${newQuantity} units).`,
        priority: 30,
      });
    }
  }

  return insights;
}

// ============================================================================
// CRM Insights
// ============================================================================

async function generateCRMInsights(
  data: any,
  result: ActionResult,
  supabase: SupabaseClient,
  companyId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];

  try {
    // Get pipeline stats
    const { data: prospects } = await supabase
      .from('prospects')
      .select('stage, deal_value')
      .eq('company_id', companyId);

    if (prospects && prospects.length > 0) {
      const totalValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
      const newCount = prospects.filter(p => p.stage === 'new' || p.stage === 'lead').length;

      insights.push({
        type: 'info',
        message: `Pipeline update: ${prospects.length} total prospects with €${totalValue.toFixed(2)} potential value.`,
        priority: 40,
      });

      if (newCount > 10) {
        insights.push({
          type: 'suggestion',
          message: `You have ${newCount} new leads. Consider qualifying them or starting an outreach campaign.`,
          action: {
            label: 'View pipeline',
            action: 'get_pipeline_stats',
            data: {},
          },
          priority: 55,
        });
      }
    }

  } catch (error) {
    console.warn('Failed to generate CRM insights:', error);
  }

  return insights;
}

// ============================================================================
// Task Insights
// ============================================================================

async function generateTaskInsights(
  data: any,
  result: ActionResult,
  supabase: SupabaseClient,
  companyId: string,
  userId?: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];

  try {
    // Get remaining tasks for today
    const today = new Date().toISOString().split('T')[0];
    const { data: todaysTasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('due_date', today)
      .in('status', ['pending', 'in_progress']);

    const remaining = todaysTasks?.length || 0;

    if (remaining === 0) {
      insights.push({
        type: 'celebration',
        message: `All tasks for today completed! Great work!`,
        priority: 75,
      });
    } else {
      insights.push({
        type: 'info',
        message: `${remaining} task(s) remaining for today.`,
        action: {
          label: 'View my tasks',
          action: 'get_my_tasks',
          data: {},
        },
        priority: 45,
      });
    }

    // Check for overdue tasks
    const { data: overdue } = await supabase
      .from('tasks')
      .select('id')
      .eq('company_id', companyId)
      .lt('due_date', today)
      .in('status', ['pending', 'in_progress']);

    if (overdue && overdue.length > 0) {
      insights.push({
        type: 'warning',
        message: `You have ${overdue.length} overdue task(s).`,
        action: {
          label: 'View overdue',
          action: 'get_overdue_tasks',
          data: {},
        },
        priority: 70,
      });
    }

  } catch (error) {
    console.warn('Failed to generate task insights:', error);
  }

  return insights;
}

// ============================================================================
// Image Generation Insights
// ============================================================================

function generateImageInsights(data: any, result: ActionResult): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];

  if (result.success) {
    insights.push({
      type: 'suggestion',
      message: 'Would you like me to generate variations of this image, or use it in marketing materials?',
      priority: 35,
    });
  }

  return insights;
}

// ============================================================================
// Pattern Detection
// ============================================================================

async function detectPatterns(
  action: string,
  data: any,
  session: SyncSession,
  ctx: ActionContext
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const patterns = await analyzeUserPatterns(session, ctx);

  // Check if this matches a common pattern
  for (const pattern of patterns) {
    if (pattern.pattern === action && pattern.frequency >= 3) {
      insights.push({
        type: 'suggestion',
        message: `I noticed you ${pattern.description} frequently. Want me to remember your typical settings?`,
        priority: 30,
      });
      break;
    }
  }

  return insights;
}

async function analyzeUserPatterns(
  session: SyncSession,
  ctx: ActionContext
): Promise<PatternMatch[]> {
  const patterns: PatternMatch[] = [];

  try {
    // Analyze recent messages for patterns
    const recentActions = session.messages
      .filter(m => m.actionExecuted)
      .slice(-20);

    const actionCounts: Record<string, number> = {};
    for (const msg of recentActions) {
      const action = msg.actionExecuted?.type;
      if (action) {
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      }
    }

    for (const [action, count] of Object.entries(actionCounts)) {
      if (count >= 3) {
        patterns.push({
          pattern: action,
          description: getPatternDescription(action),
          lastOccurrence: new Date().toISOString(),
          frequency: count,
        });
      }
    }

  } catch (error) {
    console.warn('Failed to analyze patterns:', error);
  }

  return patterns;
}

function getPatternDescription(action: string): string {
  const descriptions: Record<string, string> = {
    'create_invoice': 'create invoices',
    'create_proposal': 'create proposals',
    'search_products': 'search for products',
    'list_invoices': 'check invoices',
    'create_task': 'create tasks',
    'create_expense': 'log expenses',
    'generate_image': 'generate images',
    'get_financial_summary': 'check finances',
  };
  return descriptions[action] || action.replace(/_/g, ' ');
}

// ============================================================================
// User Preference Learning
// ============================================================================

export async function learnPreference(
  session: SyncSession,
  key: string,
  value: any,
  source: string,
  ctx: ActionContext
): Promise<void> {
  const currentPrefs = session.active_entities.preferences || {};
  const existingPref = currentPrefs[key];

  if (existingPref) {
    // Update confidence if same value
    if (JSON.stringify(existingPref.value) === JSON.stringify(value)) {
      existingPref.count = (existingPref.count || 1) + 1;
      existingPref.confidence = Math.min(existingPref.confidence + 0.1, 1.0);
    }
  } else {
    // New preference
    currentPrefs[key] = {
      value,
      confidence: 0.5,
      learnedFrom: source,
      count: 1,
    };
  }

  session.active_entities.preferences = currentPrefs;

  // Persist preference
  try {
    await ctx.supabase.from('sync_user_preferences').upsert({
      user_id: session.user_id,
      company_id: session.company_id,
      preference_key: key,
      preference_value: value,
      confidence: currentPrefs[key].confidence,
      learned_from: source,
      interaction_count: currentPrefs[key].count,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to persist preference:', error);
  }
}

// Common preferences to learn
export const LEARNABLE_PREFERENCES = {
  'default_tax_rate': (data: any) => data.tax_percent,
  'default_currency': (data: any) => data.currency,
  'default_due_days': (data: any) => data.due_days,
  'preferred_image_style': (data: any) => data.style,
  'preferred_aspect_ratio': (data: any) => data.aspect_ratio,
};

export async function extractAndLearnPreferences(
  action: string,
  data: any,
  session: SyncSession,
  ctx: ActionContext
): Promise<void> {
  // Learn default values from actions
  if (action === 'create_invoice' || action === 'create_proposal') {
    if (data.tax_percent && data.tax_percent !== 21) {  // Non-default
      await learnPreference(session, 'default_tax_rate', data.tax_percent, action, ctx);
    }
    if (data.due_days && data.due_days !== 30) {
      await learnPreference(session, 'default_due_days', data.due_days, action, ctx);
    }
  }

  if (action === 'generate_image') {
    if (data.style) {
      await learnPreference(session, 'preferred_image_style', data.style, action, ctx);
    }
    if (data.aspect_ratio) {
      await learnPreference(session, 'preferred_aspect_ratio', data.aspect_ratio, action, ctx);
    }
  }
}

// ============================================================================
// Smart Suggestions Based on Context
// ============================================================================

export function generateContextualSuggestions(
  session: SyncSession,
  currentTime: Date
): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const hour = currentTime.getHours();
  const dayOfWeek = currentTime.getDay();

  // Monday morning - suggest weekly review
  if (dayOfWeek === 1 && hour >= 8 && hour <= 10) {
    insights.push({
      type: 'suggestion',
      message: 'Good morning! Would you like a weekly financial summary?',
      action: {
        label: 'Get summary',
        action: 'get_financial_summary',
        data: { period: 'week' },
      },
      priority: 50,
    });
  }

  // End of month - suggest monthly review
  const today = currentTime.getDate();
  const lastDay = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  if (today >= lastDay - 2) {
    insights.push({
      type: 'suggestion',
      message: 'End of month approaching. Would you like a monthly financial review?',
      action: {
        label: 'Monthly review',
        action: 'get_financial_summary',
        data: { period: 'month' },
      },
      priority: 60,
    });
  }

  // If there are recent clients, suggest follow-up
  const recentClients = session.active_entities.clients
    .filter(c => {
      const lastMentioned = new Date(c.last_mentioned);
      const daysSince = (currentTime.getTime() - lastMentioned.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7 && daysSince < 30;
    });

  if (recentClients.length > 0) {
    insights.push({
      type: 'suggestion',
      message: `It's been a while since you worked with ${recentClients[0].name}. Need to follow up?`,
      action: {
        label: 'Create task',
        action: 'create_task',
        data: { title: `Follow up with ${recentClients[0].name}` },
      },
      priority: 35,
    });
  }

  return insights;
}

// ============================================================================
// Format Insights for Response
// ============================================================================

export function formatInsightsForResponse(insights: ProactiveInsight[]): string {
  if (insights.length === 0) return '';

  let response = '\n\n---\n';

  // Group by type
  const warnings = insights.filter(i => i.type === 'warning');
  const celebrations = insights.filter(i => i.type === 'celebration');
  const suggestions = insights.filter(i => i.type === 'suggestion');
  const infos = insights.filter(i => i.type === 'info');

  // Celebrations first
  for (const c of celebrations) {
    response += `🎉 ${c.message}\n`;
  }

  // Then warnings
  for (const w of warnings) {
    response += `⚠️ ${w.message}\n`;
  }

  // Then top info/suggestions (limit to 2)
  const otherInsights = [...infos, ...suggestions]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);

  for (const i of otherInsights) {
    const icon = i.type === 'suggestion' ? '💡' : 'ℹ️';
    response += `${icon} ${i.message}\n`;
  }

  return response.trimEnd();
}
