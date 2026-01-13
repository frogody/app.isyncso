/**
 * SYNC Deep Intelligence Module
  *
   * Upgrades the SYNC agent with enhanced reasoning capabilities:
    * - Deep Context Synthesis: Connect insights across all data domains
     * - Predictive Intelligence: Anticipate user needs before they ask
      * - Cross-Entity Analysis: Find hidden patterns and relationships
       * - Smart Recommendations: Actionable insights, not just data
        *
         * @author Claude & Gody
          * @version 2.0.0
           */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult } from './types.ts';
import { SyncSession } from '../memory/types.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface DeepInsight {
    category: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'recommendation';
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    summary: string;
    details: string;
    relatedEntities: string[];
    suggestedActions: string[];
    confidence: number;
    dataPoints: DataPoint[];
}

export interface DataPoint {
    source: string;
    metric: string;
    value: any;
    trend?: 'up' | 'down' | 'stable';
    percentChange?: number;
}

export interface CrossEntityConnection {
    entity1: { type: string; id: string; name: string };
    entity2: { type: string; id: string; name: string };
    relationshipType: string;
    strength: number;
    insights: string[];
}

export interface PredictiveContext {
    likelyIntent: string;
    confidence: number;
    suggestedQueries: string[];
    relevantData: any[];
    proactiveInsights: DeepInsight[];
}

// ============================================================================
// DEEP CONTEXT SYNTHESIS
// ============================================================================

/**
 * Synthesize deep insights by connecting data across ALL domains
  * This goes beyond simple summaries to find meaningful patterns
   */
export async function synthesizeDeepContext(
    supabase: SupabaseClient,
    session: SyncSession,
    query: string,
    recentActions: ActionResult[]
  ): Promise<DeepInsight[]> {
    const insights: DeepInsight[] = [];
    const companyId = session.company_id;
  
    try {
          // Fetch comprehensive data in parallel
          const [
                  invoicesData,
                  expensesData,
                  clientsData,
                  tasksData,
                  productsData,
                  prospectsData
                ] = await Promise.all([
                  fetchRecentInvoices(supabase, companyId),
                  fetchRecentExpenses(supabase, companyId),
                  fetchActiveClients(supabase, companyId),
                  fetchPendingTasks(supabase, companyId),
                  fetchProductMetrics(supabase, companyId),
                  fetchProspectActivity(supabase, companyId)
                ]);
      
          // === FINANCIAL HEALTH ANALYSIS ===
          const financialInsights = analyzeFinancialHealth(invoicesData, expensesData);
          insights.push(...financialInsights);
      
          // === CLIENT RELATIONSHIP PATTERNS ===
          const clientInsights = analyzeClientPatterns(clientsData, invoicesData, tasksData);
          insights.push(...clientInsights);
      
          // === OPPORTUNITY DETECTION ===
          const opportunities = detectOpportunities(
                  clientsData,
                  prospectsData,
                  invoicesData,
                  productsData
                );
          insights.push(...opportunities);
      
          // === RISK ANALYSIS ===
          const risks = analyzeRisks(invoicesData, expensesData, tasksData);
          insights.push(...risks);
      
          // === TREND DETECTION ===
          const trends = detectTrends(invoicesData, expensesData, clientsData);
          insights.push(...trends);
      
          // Sort by priority and confidence
          return insights.sort((a, b) => {
                  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                            return priorityOrder[a.priority] - priorityOrder[b.priority];
                  }
                  return b.confidence - a.confidence;
          });
      
    } catch (error) {
          console.error('[DeepIntelligence] Error synthesizing context:', error);
          return insights;
    }
}

// ============================================================================
// FINANCIAL HEALTH ANALYSIS
// ============================================================================

function analyzeFinancialHealth(
    invoices: any[],
    expenses: any[]
  ): DeepInsight[] {
    const insights: DeepInsight[] = [];
  
    if (!invoices?.length && !expenses?.length) return insights;
  
    // Calculate key metrics
    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const netCashflow = totalRevenue - totalExpenses;
  
    const paidInvoices = invoices?.filter(i => i.status === 'paid') || [];
    const pendingInvoices = invoices?.filter(i => i.status === 'pending' || i.status === 'sent') || [];
    const overdueInvoices = invoices?.filter(i => {
          if (i.status === 'paid') return false;
          const dueDate = new Date(i.due_date);
          return dueDate < new Date();
    }) || [];
  
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  
    // === OVERDUE INVOICES ALERT ===
    if (overdueInvoices.length > 0) {
          const clientNames = [...new Set(overdueInvoices.map(i => i.client_name || i.contact?.name || 'Unknown'))];
          insights.push({
                  category: 'risk',
                  priority: overdueAmount > 5000 ? 'critical' : 'high',
                  title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''} (€${overdueAmount.toLocaleString()})`,
                  summary: `You have €${overdueAmount.toLocaleString()} in overdue payments from ${clientNames.length} client${clientNames.length > 1 ? 's' : ''}.`,
                  details: `Overdue clients: ${clientNames.join(', ')}. Oldest overdue: ${getOldestOverdue(overdueInvoices)} days. This affects your cash flow and may indicate collection issues.`,
                  relatedEntities: overdueInvoices.map(i => i.contact_id).filter(Boolean),
                  suggestedActions: [
                            'Send payment reminders to overdue clients',
                            'Review payment terms with repeat late-payers',
                            'Consider offering early payment discounts'
                          ],
                  confidence: 0.95,
                  dataPoints: [
                    { source: 'invoices', metric: 'overdue_count', value: overdueInvoices.length },
                    { source: 'invoices', metric: 'overdue_amount', value: overdueAmount }
                          ]
          });
    }
  
    // === CASH FLOW INSIGHT ===
    if (netCashflow !== 0) {
          const isPositive = netCashflow > 0;
          insights.push({
                  category: isPositive ? 'trend' : 'risk',
                  priority: isPositive ? 'medium' : (netCashflow < -1000 ? 'high' : 'medium'),
                  title: `Net Cash Flow: ${isPositive ? '+' : ''}€${netCashflow.toLocaleString()}`,
                  summary: isPositive
                            ? `Strong positive cash flow this period with €${netCashflow.toLocaleString()} net income.`
                            : `Negative cash flow of €${Math.abs(netCashflow).toLocaleString()} - expenses exceed revenue.`,
                  details: `Revenue: €${totalRevenue.toLocaleString()} | Expenses: €${totalExpenses.toLocaleString()} | Pending receivables: €${pendingAmount.toLocaleString()}`,
                  relatedEntities: [],
                  suggestedActions: isPositive
                            ? ['Consider reinvesting surplus', 'Review investment opportunities']
                            : ['Review and reduce non-essential expenses', 'Accelerate invoice collection', 'Consider payment plan negotiations'],
                  confidence: 0.9,
                  dataPoints: [
                    { source: 'invoices', metric: 'total_revenue', value: totalRevenue },
                    { source: 'expenses', metric: 'total_expenses', value: totalExpenses },
                    { source: 'calculated', metric: 'net_cashflow', value: netCashflow, trend: isPositive ? 'up' : 'down' }
                          ]
          });
    }
  
    // === REVENUE CONCENTRATION RISK ===
    const revenueByClient = groupByClient(paidInvoices);
    const topClient = Object.entries(revenueByClient).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    if (topClient && totalRevenue > 0) {
          const concentration = ((topClient[1] as number) / totalRevenue) * 100;
          if (concentration > 40) {
                  insights.push({
                            category: 'risk',
                            priority: concentration > 60 ? 'high' : 'medium',
                            title: `Revenue Concentration: ${concentration.toFixed(0)}% from One Client`,
                            summary: `${topClient[0]} accounts for ${concentration.toFixed(0)}% of your revenue. This creates dependency risk.`,
                            details: `Diversifying your client base would reduce business risk. Consider expanding services to other clients.`,
                            relatedEntities: [],
                            suggestedActions: [
                                        'Identify prospects similar to top client',
                                        'Expand services to existing smaller clients',
                                        'Develop new service offerings'
                                      ],
                            confidence: 0.85,
                            dataPoints: [
                              { source: 'calculated', metric: 'revenue_concentration', value: concentration }
                                      ]
                  });
          }
    }
  
    return insights;
}

// ============================================================================
// CLIENT RELATIONSHIP PATTERNS
// ============================================================================

function analyzeClientPatterns(
    clients: any[],
    invoices: any[],
    tasks: any[]
  ): DeepInsight[] {
    const insights: DeepInsight[] = [];
  
    if (!clients?.length) return insights;
  
    // Identify inactive high-value clients
    const clientRevenue = groupByClient(invoices || []);
    const highValueClients = clients.filter(c => {
          const revenue = clientRevenue[c.name] || 0;
          return revenue > 1000;
    });
  
    // Find clients with no recent activity (30+ days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
    const dormantHighValue = highValueClients.filter(c => {
          const lastInvoice = invoices?.find(i => i.contact_id === c.id);
          const lastTask = tasks?.find(t => t.contact_id === c.id);
          const lastActivity = Math.max(
                  lastInvoice ? new Date(lastInvoice.created_at).getTime() : 0,
                  lastTask ? new Date(lastTask.created_at).getTime() : 0
                );
          return lastActivity < thirtyDaysAgo.getTime();
    });
  
    if (dormantHighValue.length > 0) {
          insights.push({
                  category: 'opportunity',
                  priority: 'high',
                  title: `${dormantHighValue.length} High-Value Client${dormantHighValue.length > 1 ? 's' : ''} Need Attention`,
                  summary: `${dormantHighValue.map(c => c.name).join(', ')} ${dormantHighValue.length > 1 ? 'have' : 'has'} been inactive for 30+ days.`,
                  details: `These clients have generated significant revenue but haven't had recent interaction. This could indicate churn risk or upsell opportunity.`,
                  relatedEntities: dormantHighValue.map(c => c.id),
                  suggestedActions: [
                            'Schedule check-in calls with inactive clients',
                            'Send personalized updates or offers',
                            'Review if any projects are pending'
                          ],
                  confidence: 0.88,
                  dataPoints: dormantHighValue.map(c => ({
                            source: 'clients',
                            metric: 'days_inactive',
                            value: Math.floor((Date.now() - new Date(c.updated_at || c.created_at).getTime()) / (1000 * 60 * 60 * 24))
                  }))
          });
    }
  
    return insights;
}

// ============================================================================
// OPPORTUNITY DETECTION
// ============================================================================

function detectOpportunities(
    clients: any[],
    prospects: any[],
    invoices: any[],
    products: any[]
  ): DeepInsight[] {
    const insights: DeepInsight[] = [];
  
    // Hot prospects ready to close
    const hotProspects = prospects?.filter(p =>
          p.status === 'qualified' || p.status === 'proposal' || p.score >= 70
                                             ) || [];
  
    if (hotProspects.length > 0) {
          const totalPotential = hotProspects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
          insights.push({
                  category: 'opportunity',
                  priority: totalPotential > 10000 ? 'critical' : 'high',
                  title: `${hotProspects.length} Hot Prospect${hotProspects.length > 1 ? 's' : ''} Ready to Close`,
                  summary: `€${totalPotential.toLocaleString()} in potential deals from ${hotProspects.length} qualified prospect${hotProspects.length > 1 ? 's' : ''}.`,
                  details: `Prospects: ${hotProspects.map(p => `${p.company_name || p.name} (€${(p.deal_value || 0).toLocaleString()})`).join(', ')}`,
                  relatedEntities: hotProspects.map(p => p.id),
                  suggestedActions: [
                            'Schedule closing meetings this week',
                            'Prepare final proposals',
                            'Address any remaining objections'
                          ],
                  confidence: 0.82,
                  dataPoints: [
                    { source: 'prospects', metric: 'hot_count', value: hotProspects.length },
                    { source: 'prospects', metric: 'potential_revenue', value: totalPotential }
                          ]
          });
    }
  
    return insights;
}

// ============================================================================
// RISK ANALYSIS
// ============================================================================

function analyzeRisks(
    invoices: any[],
    expenses: any[],
    tasks: any[]
  ): DeepInsight[] {
    const insights: DeepInsight[] = [];
  
    // Overdue tasks
    const overdueTasks = tasks?.filter(t => {
          if (t.status === 'complete') return false;
          const dueDate = new Date(t.due_date);
          return dueDate < new Date();
    }) || [];
  
    if (overdueTasks.length > 0) {
          const criticalTasks = overdueTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
          insights.push({
                  category: 'risk',
                  priority: criticalTasks.length > 0 ? 'high' : 'medium',
                  title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''} ${criticalTasks.length > 0 ? `(${criticalTasks.length} critical)` : ''}`,
                  summary: `You have ${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past their due date that need attention.`,
                  details: `Overdue tasks: ${overdueTasks.slice(0, 5).map(t => t.title || t.description?.substring(0, 30)).join(', ')}${overdueTasks.length > 5 ? ` and ${overdueTasks.length - 5} more` : ''}`,
                  relatedEntities: overdueTasks.map(t => t.id),
                  suggestedActions: [
                            'Review and prioritize overdue tasks',
                            'Reschedule or delegate if needed',
                            'Communicate delays to stakeholders'
                          ],
                  confidence: 0.92,
                  dataPoints: [
                    { source: 'tasks', metric: 'overdue_count', value: overdueTasks.length },
                    { source: 'tasks', metric: 'critical_overdue', value: criticalTasks.length }
                          ]
          });
    }
  
    return insights;
}

// ============================================================================
// TREND DETECTION
// ============================================================================

function detectTrends(
    invoices: any[],
    expenses: any[],
    clients: any[]
  ): DeepInsight[] {
    const insights: DeepInsight[] = [];
  
    if (!invoices?.length || invoices.length < 3) return insights;
  
    // Group invoices by month
    const monthlyRevenue = groupByMonth(invoices);
    const months = Object.keys(monthlyRevenue).sort();
  
    if (months.length >= 2) {
          const lastMonth = monthlyRevenue[months[months.length - 1]];
          const prevMonth = monthlyRevenue[months[months.length - 2]];
      
          if (prevMonth > 0) {
                  const change = ((lastMonth - prevMonth) / prevMonth) * 100;
                  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            
                  if (Math.abs(change) > 10) {
                            insights.push({
                                        category: 'trend',
                                        priority: Math.abs(change) > 30 ? 'high' : 'medium',
                                        title: `Revenue ${trend === 'up' ? 'Increased' : 'Decreased'} ${Math.abs(change).toFixed(0)}% Month-over-Month`,
                                        summary: `Your revenue went from €${prevMonth.toLocaleString()} to €${lastMonth.toLocaleString()} (${change > 0 ? '+' : ''}${change.toFixed(0)}%).`,
                                        details: trend === 'up'
                                                      ? `Strong growth trend! Consider scaling operations or investing in more capacity.`
                                                      : `Revenue decline detected. Review sales pipeline and client retention strategies.`,
                                        relatedEntities: [],
                                        suggestedActions: trend === 'up'
                                                      ? ['Analyze what drove growth', 'Replicate successful strategies', 'Plan for increased capacity']
                                                      : ['Review lost deals', 'Reach out to churned clients', 'Enhance sales efforts'],
                                        confidence: 0.85,
                                        dataPoints: [
                                          { source: 'invoices', metric: 'monthly_revenue', value: lastMonth, trend, percentChange: change }
                                                    ]
                            });
                  }
          }
    }
  
    return insights;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchRecentInvoices(supabase: SupabaseClient, companyId: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
    const { data } = await supabase
      .from('invoices')
      .select('*, contact:contacts(id, name)')
      .eq('company_id', companyId)
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
  
    return data || [];
}

async function fetchRecentExpenses(supabase: SupabaseClient, companyId: string) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(100);
  
    return data || [];
}

async function fetchActiveClients(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', 'client')
      .order('updated_at', { ascending: false })
      .limit(50);
  
    return data || [];
}

async function fetchPendingTasks(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'complete')
      .order('due_date', { ascending: true })
      .limit(50);
  
    return data || [];
}

async function fetchProductMetrics(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('products')
      .select('*, invoice_items(quantity, total)')
      .eq('company_id', companyId)
      .limit(50);
  
    return data || [];
}

async function fetchProspectActivity(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('prospects')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(30);
  
    return data || [];
}

function groupByClient(invoices: any[]): Record<string, number> {
    return invoices.reduce((acc, inv) => {
          const clientName = inv.contact?.name || inv.client_name || 'Unknown';
          acc[clientName] = (acc[clientName] || 0) + (inv.total || 0);
          return acc;
    }, {} as Record<string, number>);
}

function groupByMonth(invoices: any[]): Record<string, number> {
    return invoices.reduce((acc, inv) => {
          const month = inv.created_at?.substring(0, 7) || 'unknown';
          acc[month] = (acc[month] || 0) + (inv.total || 0);
          return acc;
    }, {} as Record<string, number>);
}

function getOldestOverdue(invoices: any[]): number {
    if (!invoices.length) return 0;
    const oldest = invoices.reduce((min, inv) => {
          const dueDate = new Date(inv.due_date);
          return dueDate < min ? dueDate : min;
    }, new Date());
    return Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// FORMAT FOR RESPONSE
// ============================================================================

/**
 * Format deep insights into a compelling response
  */
export function formatDeepInsightsForResponse(insights: DeepInsight[]): string {
    if (!insights.length) {
          return '';
    }
  
    const sections: string[] = [];
  
    // Group by category
    const critical = insights.filter(i => i.priority === 'critical');
    const opportunities = insights.filter(i => i.category === 'opportunity' && i.priority !== 'critical');
    const risks = insights.filter(i => i.category === 'risk' && i.priority !== 'critical');
    const trends = insights.filter(i => i.category === 'trend');
  
    if (critical.length > 0) {
          sections.push(`🚨 **REQUIRES IMMEDIATE ATTENTION**\n${critical.map(i =>
                  `• **${i.title}**: ${i.summary}`
                                                                                ).join('\n')}`);
    }
  
    if (opportunities.length > 0) {
          sections.push(`💡 **OPPORTUNITIES**\n${opportunities.map(i =>
                  `• **${i.title}**: ${i.summary}`
                                                                      ).join('\n')}`);
    }
  
    if (risks.length > 0) {
          sections.push(`⚠️ **RISKS TO WATCH**\n${risks.map(i =>
                  `• **${i.title}**: ${i.summary}`
                                                               ).join('\n')}`);
    }
  
    if (trends.length > 0) {
          sections.push(`📊 **TRENDS**\n${trends.map(i =>
                  `• **${i.title}**: ${i.summary}`
                                                        ).join('\n')}`);
    }
  
    return sections.join('\n\n');
}

export default {
    synthesizeDeepContext,
    formatDeepInsightsForResponse
};
// Test input
