/**
 * Data Synthesis Layer for SYNC
 *
 * Transforms raw action results into meaningful, grouped insights.
 * Instead of returning raw data, synthesize it into:
 * - Grouped summaries (by client, by category, by time period)
 * - Comparative analysis
 * - Trend detection
 * - Actionable recommendations
 *
 * Based on Vy's recommendation for "Data Synthesis" capability.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult } from './types.ts';

// ============================================================================
// Types
// ============================================================================

export interface SynthesizedResult {
  type: 'summary' | 'grouped' | 'comparison' | 'trend' | 'recommendation';
  title: string;
  data: any;
  insights: string[];
  formatting: 'markdown' | 'table' | 'list' | 'narrative';
}

export interface GroupedData<T> {
  key: string;
  label: string;
  items: T[];
  summary: {
    count: number;
    total?: number;
    average?: number;
    [key: string]: any;
  };
}

export interface TrendData {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  currentValue: number;
  previousValue: number;
  period: string;
}

// ============================================================================
// Main Synthesis Functions
// ============================================================================

/**
 * Synthesize results based on query intent and data type
 */
export async function synthesizeResults(
  action: string,
  results: any,
  queryIntent: string,
  supabase: SupabaseClient,
  companyId: string
): Promise<SynthesizedResult | null> {
  // Determine the type of synthesis needed based on query
  const synthesisType = detectSynthesisType(queryIntent);

  switch (action) {
    case 'list_invoices':
    case 'search_invoices':
      return synthesizeInvoiceData(results, synthesisType, queryIntent);

    case 'list_prospects':
    case 'search_prospects':
      return synthesizeProspectData(results, synthesisType, queryIntent);

    case 'list_tasks':
    case 'get_my_tasks':
      return synthesizeTaskData(results, synthesisType, queryIntent);

    case 'list_expenses':
      return synthesizeExpenseData(results, synthesisType, queryIntent);

    case 'get_financial_summary':
      return synthesizeFinancialOverview(results, queryIntent);

    case 'get_pipeline_stats':
      return synthesizePipelineData(results, queryIntent);

    default:
      return null;
  }
}

/**
 * Detect what type of synthesis is needed from query
 */
function detectSynthesisType(query: string): 'summary' | 'grouped' | 'comparison' | 'trend' | 'recommendation' {
  const patterns = {
    grouped: /\b(for each|by (client|category|status|week|month)|group|per)\b/i,
    comparison: /\b(compare|versus|vs|compared to|difference|better|worse)\b/i,
    trend: /\b(trend|trending|over time|growth|decline|change)\b/i,
    recommendation: /\b(suggest|recommend|should|could|advice|what to|next steps)\b/i,
    summary: /\b(summary|summarize|overview|total|how many|how much)\b/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) {
      return type as 'summary' | 'grouped' | 'comparison' | 'trend' | 'recommendation';
    }
  }

  return 'summary';
}

// ============================================================================
// Invoice Synthesis
// ============================================================================

function synthesizeInvoiceData(
  invoices: any[],
  type: string,
  query: string
): SynthesizedResult {
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return {
      type: 'summary',
      title: 'Invoice Summary',
      data: { count: 0 },
      insights: ['No invoices found for the specified criteria.'],
      formatting: 'narrative',
    };
  }

  // Group by client
  if (type === 'grouped' || /by client/i.test(query)) {
    const byClient = groupBy(invoices, 'client_name');
    const grouped: GroupedData<any>[] = Object.entries(byClient).map(([client, items]) => ({
      key: client,
      label: client || 'Unknown Client',
      items,
      summary: {
        count: items.length,
        total: items.reduce((sum, i) => sum + (i.total || 0), 0),
        paid: items.filter(i => i.status === 'paid').length,
        pending: items.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length,
      },
    }));

    return {
      type: 'grouped',
      title: 'Invoices by Client',
      data: grouped,
      insights: generateInvoiceInsights(invoices, grouped),
      formatting: 'markdown',
    };
  }

  // Group by status
  if (/by status/i.test(query)) {
    const byStatus = groupBy(invoices, 'status');
    const grouped: GroupedData<any>[] = Object.entries(byStatus).map(([status, items]) => ({
      key: status,
      label: capitalizeStatus(status),
      items,
      summary: {
        count: items.length,
        total: items.reduce((sum, i) => sum + (i.total || 0), 0),
      },
    }));

    return {
      type: 'grouped',
      title: 'Invoices by Status',
      data: grouped,
      insights: generateInvoiceInsights(invoices, grouped),
      formatting: 'markdown',
    };
  }

  // Default summary
  const total = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const paid = invoices.filter(i => i.status === 'paid');
  const paidTotal = paid.reduce((sum, i) => sum + (i.total || 0), 0);

  return {
    type: 'summary',
    title: 'Invoice Summary',
    data: {
      count: invoices.length,
      totalValue: total,
      paidCount: paid.length,
      paidValue: paidTotal,
      collectionRate: total > 0 ? ((paidTotal / total) * 100).toFixed(1) : 0,
    },
    insights: [
      `${invoices.length} invoices totaling €${total.toFixed(2)}`,
      `${paid.length} paid (€${paidTotal.toFixed(2)}) - ${total > 0 ? ((paidTotal / total) * 100).toFixed(1) : 0}% collected`,
      invoices.length - paid.length > 0
        ? `${invoices.length - paid.length} pending payment`
        : 'All invoices paid!',
    ],
    formatting: 'narrative',
  };
}

function generateInvoiceInsights(invoices: any[], grouped: GroupedData<any>[]): string[] {
  const insights: string[] = [];

  // Top client by value
  const topClient = grouped.reduce((top, g) =>
    (g.summary.total || 0) > (top?.summary.total || 0) ? g : top
  , grouped[0]);
  if (topClient) {
    insights.push(`Highest value: ${topClient.label} (€${topClient.summary.total?.toFixed(2)})`);
  }

  // Overdue detection
  const overdue = invoices.filter(i =>
    i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date()
  );
  if (overdue.length > 0) {
    const overdueTotal = overdue.reduce((sum, i) => sum + (i.total || 0), 0);
    insights.push(`⚠️ ${overdue.length} overdue invoices (€${overdueTotal.toFixed(2)})`);
  }

  return insights;
}

// ============================================================================
// Prospect/Client Synthesis
// ============================================================================

function synthesizeProspectData(
  prospects: any[],
  type: string,
  query: string
): SynthesizedResult {
  if (!Array.isArray(prospects) || prospects.length === 0) {
    return {
      type: 'summary',
      title: 'Prospect Summary',
      data: { count: 0 },
      insights: ['No prospects found for the specified criteria.'],
      formatting: 'narrative',
    };
  }

  // Group by stage
  if (type === 'grouped' || /by stage|pipeline/i.test(query)) {
    const byStage = groupBy(prospects, 'stage');
    const stageOrder = ['new', 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    const grouped: GroupedData<any>[] = stageOrder
      .filter(stage => byStage[stage])
      .map(stage => ({
        key: stage,
        label: capitalizeStatus(stage),
        items: byStage[stage],
        summary: {
          count: byStage[stage].length,
          total: byStage[stage].reduce((sum, p) => sum + (p.deal_value || 0), 0),
        },
      }));

    return {
      type: 'grouped',
      title: 'Pipeline by Stage',
      data: grouped,
      insights: generatePipelineInsights(prospects, grouped),
      formatting: 'markdown',
    };
  }

  // Group by source
  if (/by source/i.test(query)) {
    const bySource = groupBy(prospects, 'source');
    const grouped: GroupedData<any>[] = Object.entries(bySource).map(([source, items]) => ({
      key: source,
      label: source || 'Unknown Source',
      items,
      summary: {
        count: items.length,
        total: items.reduce((sum, p) => sum + (p.deal_value || 0), 0),
      },
    }));

    return {
      type: 'grouped',
      title: 'Prospects by Source',
      data: grouped,
      insights: [
        `${prospects.length} prospects from ${Object.keys(bySource).length} sources`,
      ],
      formatting: 'markdown',
    };
  }

  // Default summary
  const totalValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);

  return {
    type: 'summary',
    title: 'Prospect Summary',
    data: {
      count: prospects.length,
      totalPipelineValue: totalValue,
    },
    insights: [
      `${prospects.length} prospects in pipeline`,
      `Total pipeline value: €${totalValue.toFixed(2)}`,
    ],
    formatting: 'narrative',
  };
}

function generatePipelineInsights(prospects: any[], grouped: GroupedData<any>[]): string[] {
  const insights: string[] = [];

  const totalValue = prospects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
  insights.push(`Total pipeline value: €${totalValue.toFixed(2)}`);

  // Conversion potential
  const qualified = grouped.filter(g => ['qualified', 'proposal', 'negotiation'].includes(g.key));
  if (qualified.length > 0) {
    const qualifiedValue = qualified.reduce((sum, g) => sum + (g.summary.total || 0), 0);
    insights.push(`High-probability deals: €${qualifiedValue.toFixed(2)}`);
  }

  return insights;
}

// ============================================================================
// Task Synthesis
// ============================================================================

function synthesizeTaskData(
  tasks: any[],
  type: string,
  query: string
): SynthesizedResult {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return {
      type: 'summary',
      title: 'Task Summary',
      data: { count: 0 },
      insights: ['No tasks found.'],
      formatting: 'narrative',
    };
  }

  const today = new Date().toISOString().split('T')[0];

  // Group by priority
  if (/by priority/i.test(query)) {
    const byPriority = groupBy(tasks, 'priority');
    const priorityOrder = ['high', 'medium', 'low'];

    const grouped: GroupedData<any>[] = priorityOrder
      .filter(p => byPriority[p])
      .map(priority => ({
        key: priority,
        label: capitalizeStatus(priority) + ' Priority',
        items: byPriority[priority],
        summary: {
          count: byPriority[priority].length,
        },
      }));

    return {
      type: 'grouped',
      title: 'Tasks by Priority',
      data: grouped,
      insights: generateTaskInsights(tasks, today),
      formatting: 'markdown',
    };
  }

  // Group by status
  if (/by status/i.test(query)) {
    const byStatus = groupBy(tasks, 'status');
    const grouped: GroupedData<any>[] = Object.entries(byStatus).map(([status, items]) => ({
      key: status,
      label: capitalizeStatus(status),
      items,
      summary: { count: items.length },
    }));

    return {
      type: 'grouped',
      title: 'Tasks by Status',
      data: grouped,
      insights: generateTaskInsights(tasks, today),
      formatting: 'markdown',
    };
  }

  // Default summary
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const overdue = tasks.filter(t =>
    t.due_date && t.due_date < today && t.status !== 'complete'
  );
  const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'complete');

  return {
    type: 'summary',
    title: 'Task Summary',
    data: {
      total: tasks.length,
      pending: pending.length,
      overdue: overdue.length,
      highPriority: highPriority.length,
    },
    insights: generateTaskInsights(tasks, today),
    formatting: 'narrative',
  };
}

function generateTaskInsights(tasks: any[], today: string): string[] {
  const insights: string[] = [];

  const pending = tasks.filter(t => t.status !== 'complete' && t.status !== 'cancelled');
  const overdue = tasks.filter(t =>
    t.due_date && t.due_date < today && t.status !== 'complete'
  );
  const dueToday = tasks.filter(t => t.due_date === today && t.status !== 'complete');

  insights.push(`${pending.length} tasks pending`);

  if (dueToday.length > 0) {
    insights.push(`📅 ${dueToday.length} due today`);
  }

  if (overdue.length > 0) {
    insights.push(`⚠️ ${overdue.length} overdue`);
  }

  const highPriority = pending.filter(t => t.priority === 'high');
  if (highPriority.length > 0) {
    insights.push(`🔴 ${highPriority.length} high priority`);
  }

  return insights;
}

// ============================================================================
// Expense Synthesis
// ============================================================================

function synthesizeExpenseData(
  expenses: any[],
  type: string,
  query: string
): SynthesizedResult {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {
      type: 'summary',
      title: 'Expense Summary',
      data: { count: 0 },
      insights: ['No expenses found.'],
      formatting: 'narrative',
    };
  }

  // Group by category
  if (type === 'grouped' || /by category/i.test(query)) {
    const byCategory = groupBy(expenses, 'category');
    const grouped: GroupedData<any>[] = Object.entries(byCategory)
      .map(([category, items]) => ({
        key: category,
        label: category || 'Uncategorized',
        items,
        summary: {
          count: items.length,
          total: items.reduce((sum, e) => sum + (e.amount || 0), 0),
        },
      }))
      .sort((a, b) => (b.summary.total || 0) - (a.summary.total || 0));

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      type: 'grouped',
      title: 'Expenses by Category',
      data: grouped,
      insights: [
        `Total: €${total.toFixed(2)} across ${Object.keys(byCategory).length} categories`,
        `Top category: ${grouped[0]?.label} (€${grouped[0]?.summary.total?.toFixed(2) || 0})`,
      ],
      formatting: 'markdown',
    };
  }

  // Default summary
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const average = total / expenses.length;

  return {
    type: 'summary',
    title: 'Expense Summary',
    data: {
      count: expenses.length,
      total,
      average,
    },
    insights: [
      `${expenses.length} expenses totaling €${total.toFixed(2)}`,
      `Average: €${average.toFixed(2)}`,
    ],
    formatting: 'narrative',
  };
}

// ============================================================================
// Financial Overview Synthesis
// ============================================================================

function synthesizeFinancialOverview(data: any, query: string): SynthesizedResult {
  const insights: string[] = [];

  if (data.revenue && data.expenses) {
    const profit = data.revenue - data.expenses;
    const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

    insights.push(`Revenue: €${data.revenue.toFixed(2)}`);
    insights.push(`Expenses: €${data.expenses.toFixed(2)}`);
    insights.push(`${profit >= 0 ? 'Profit' : 'Loss'}: €${Math.abs(profit).toFixed(2)} (${margin.toFixed(1)}% margin)`);
  }

  return {
    type: 'summary',
    title: 'Financial Overview',
    data,
    insights,
    formatting: 'narrative',
  };
}

// ============================================================================
// Pipeline Data Synthesis
// ============================================================================

function synthesizePipelineData(data: any, query: string): SynthesizedResult {
  const insights: string[] = [];

  if (data.total_value) {
    insights.push(`Total pipeline: €${data.total_value.toFixed(2)}`);
  }

  if (data.stages) {
    const active = Object.entries(data.stages)
      .filter(([stage]) => !['won', 'lost'].includes(stage))
      .reduce((sum: number, [_, count]: [string, any]) => sum + (typeof count === 'number' ? count : 0), 0);
    insights.push(`Active prospects: ${active}`);
  }

  return {
    type: 'summary',
    title: 'Pipeline Overview',
    data,
    insights,
    formatting: 'narrative',
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format synthesized result for display
 */
export function formatSynthesizedResult(result: SynthesizedResult): string {
  let output = `### ${result.title}\n\n`;

  if (result.type === 'grouped' && Array.isArray(result.data)) {
    for (const group of result.data as GroupedData<any>[]) {
      output += `**${group.label}**\n`;
      output += `- Count: ${group.summary.count}`;
      if (group.summary.total !== undefined) {
        output += ` | Total: €${group.summary.total.toFixed(2)}`;
      }
      if (group.summary.paid !== undefined) {
        output += ` | Paid: ${group.summary.paid}`;
      }
      output += '\n\n';
    }
  } else if (result.formatting === 'narrative') {
    for (const insight of result.insights) {
      output += `${insight}\n`;
    }
  }

  // Add insights section if there are any additional insights
  if (result.insights.length > 0 && result.type === 'grouped') {
    output += '\n**Insights:**\n';
    for (const insight of result.insights) {
      output += `- ${insight}\n`;
    }
  }

  return output;
}

// ============================================================================
// Utility Functions
// ============================================================================

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key] || 'unknown');
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function capitalizeStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
