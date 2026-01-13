/**
 * SYNC Predictive Intelligence Module
 *
 * Anticipates user needs before they ask by analyzing:
 * - Time patterns (time of day, day of week, month-end)
 * - Recent actions and context
 * - Typical user workflows
 * - Business context signals
 *
 * @author Claude & Gody
 * @version 2.0.0
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SyncSession } from '../memory/types.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictedIntent {
    intent: string;
    confidence: number;
    suggestedQuery: string;
    reasoning: string;
    preloadedData?: any;
}

export interface TimeContext {
    hour: number;
    dayOfWeek: number;
    dayOfMonth: number;
    isWeekend: boolean;
    isMonthEnd: boolean;
    isQuarterEnd: boolean;
    isMorning: boolean;
    isEvening: boolean;
    timeOfDay: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface SmartSuggestion {
    type: 'action' | 'query' | 'insight' | 'reminder';
    priority: number;
    title: string;
    description: string;
    actionLabel?: string;
    data?: any;
}

// ============================================================================
// PREDICTIVE INTENT
// ============================================================================

/**
 * Predict what the user likely wants based on context
 */
export async function predictUserIntent(
    supabase: SupabaseClient,
    session: SyncSession,
    recentMessages: string[],
    currentQuery?: string
  ): Promise<PredictedIntent[]> {
    const predictions: PredictedIntent[] = [];
    const timeContext = getTimeContext();
    const companyId = session.company_id;

  try {
        // === TIME-BASED PREDICTIONS ===

      // Morning Check-ins
      if (timeContext.isMorning) {
              predictions.push({
                        intent: 'daily_overview',
                        confidence: 0.75,
                        suggestedQuery: "What's on my agenda today?",
                        reasoning: 'Morning is a common time for daily planning'
              });

          // Monday specific
          if (timeContext.dayOfWeek === 1) {
                    predictions.push({
                                intent: 'weekly_planning',
                                confidence: 0.82,
                                suggestedQuery: "What happened last week and what's planned for this week?",
                                reasoning: 'Monday mornings typically involve weekly review'
                    });
          }
      }

      // Month-End Financial Review
      if (timeContext.isMonthEnd || timeContext.dayOfMonth >= 25) {
              predictions.push({
                        intent: 'monthly_financial_review',
                        confidence: 0.88,
                        suggestedQuery: "Give me a financial summary for this month",
                        reasoning: 'Month-end is common time for financial reviews'
              });

          predictions.push({
                    intent: 'invoice_status',
                    confidence: 0.85,
                    suggestedQuery: "What invoices are pending or overdue?",
                    reasoning: 'Month-end often triggers invoice follow-ups'
          });
      }

      // Quarter-End
      if (timeContext.isQuarterEnd) {
              predictions.push({
                        intent: 'quarterly_report',
                        confidence: 0.9,
                        suggestedQuery: "Generate a quarterly business report",
                        reasoning: 'Quarter-end requires comprehensive business review'
              });
      }

      // Evening Wind-down
      if (timeContext.isEvening) {
              predictions.push({
                        intent: 'end_of_day_summary',
                        confidence: 0.7,
                        suggestedQuery: "What did I accomplish today?",
                        reasoning: 'Evening is common for daily wrap-up'
              });
      }

      // === CONTEXT-BASED PREDICTIONS ===

      // If recent conversation mentioned a client
      const mentionedClient = extractMentionedEntities(recentMessages, 'client');
        if (mentionedClient) {
                predictions.push({
                          intent: 'client_deep_dive',
                          confidence: 0.78,
                          suggestedQuery: `Show me everything about ${mentionedClient}`,
                          reasoning: `Recent context mentioned ${mentionedClient}`
                });
        }

      // If recent conversation mentioned invoices
      if (recentMessages.some(m => /invoice|payment|billing/i.test(m))) {
              predictions.push({
                        intent: 'financial_action',
                        confidence: 0.72,
                        suggestedQuery: "What invoices need attention?",
                        reasoning: 'Recent conversation touched on finances'
              });
      }

      // === DATA-DRIVEN PREDICTIONS ===

      // Check for pending tasks due today/tomorrow
      const urgentTasks = await fetchUrgentTasks(supabase, companyId);
        if (urgentTasks.length > 0) {
                predictions.push({
                          intent: 'task_management',
                          confidence: 0.85,
                          suggestedQuery: `You have ${urgentTasks.length} tasks due soon. Want to see them?`,
                          reasoning: 'Urgent tasks need attention',
                          preloadedData: urgentTasks
                });
        }

      // Check for recent unread messages
      const unreadCount = await fetchUnreadCount(supabase, session.user_id);
        if (unreadCount > 0) {
                predictions.push({
                          intent: 'check_inbox',
                          confidence: 0.7,
                          suggestedQuery: `You have ${unreadCount} unread messages. Want to see them?`,
                          reasoning: 'Unread messages await attention',
                          preloadedData: { count: unreadCount }
                });
        }

      // Sort by confidence
      return predictions.sort((a, b) => b.confidence - a.confidence);

  } catch (error) {
        console.error('[PredictiveIntelligence] Error predicting intent:', error);
        return predictions;
  }
}

// ============================================================================
// SMART SUGGESTIONS
// ============================================================================

/**
 * Generate proactive suggestions based on business state
 */
export async function generateSmartSuggestions(
    supabase: SupabaseClient,
    session: SyncSession
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const companyId = session.company_id;
    const timeContext = getTimeContext();

  try {
        // === OVERDUE ITEMS ===
      const overdueInvoices = await fetchOverdueInvoices(supabase, companyId);
        if (overdueInvoices.length > 0) {
                const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                suggestions.push({
                          type: 'action',
                          priority: 95,
                          title: `${overdueInvoices.length} Overdue Invoices`,
                          description: `€${totalOverdue.toLocaleString()} needs collection. Send reminders?`,
                          actionLabel: 'Send Reminders',
                          data: overdueInvoices
                });
        }

      const overdueTasks = await fetchOverdueTasks(supabase, companyId);
        if (overdueTasks.length > 0) {
                suggestions.push({
                          type: 'reminder',
                          priority: 85,
                          title: `${overdueTasks.length} Overdue Tasks`,
                          description: `Tasks past deadline need attention`,
                          data: overdueTasks
                });
        }

      // === OPPORTUNITY ALERTS ===
      const hotProspects = await fetchHotProspects(supabase, companyId);
        if (hotProspects.length > 0) {
                const totalPotential = hotProspects.reduce((sum, p) => sum + (p.deal_value || 0), 0);
                suggestions.push({
                          type: 'insight',
                          priority: 80,
                          title: `${hotProspects.length} Hot Prospects`,
                          description: `€${totalPotential.toLocaleString()} in qualified pipeline. Follow up?`,
                          actionLabel: 'View Prospects',
                          data: hotProspects
                });
        }

      // === TIME-BASED SUGGESTIONS ===
      if (timeContext.dayOfWeek === 5 && timeContext.hour >= 14) {
              // Friday afternoon
          suggestions.push({
                    type: 'query',
                    priority: 60,
                    title: 'Weekly Summary',
                    description: 'Want a summary of this week before the weekend?',
                    actionLabel: 'Generate Summary'
          });
      }

      if (timeContext.isMonthEnd) {
              suggestions.push({
                        type: 'query',
                        priority: 75,
                        title: 'Monthly Report',
                        description: 'Month is ending. Generate a financial report?',
                        actionLabel: 'Generate Report'
              });
      }

      // === RECENT ACTIVITY FOLLOW-UPS ===
      const recentProposals = await fetchRecentProposals(supabase, companyId);
        if (recentProposals.length > 0) {
                suggestions.push({
                          type: 'reminder',
                          priority: 70,
                          title: `${recentProposals.length} Pending Proposals`,
                          description: 'Proposals sent in the last 7 days need follow-up',
                          actionLabel: 'Follow Up',
                          data: recentProposals
                });
        }

      // Sort by priority
      return suggestions.sort((a, b) => b.priority - a.priority);

  } catch (error) {
        console.error('[PredictiveIntelligence] Error generating suggestions:', error);
        return suggestions;
  }
}

// ============================================================================
// CONTEXT ENRICHMENT
// ============================================================================

/**
 * Enrich the context with predictive data before LLM call
 */
export async function enrichContextPredictively(
    supabase: SupabaseClient,
    session: SyncSession,
    query: string
  ): Promise<string> {
    const sections: string[] = [];
    const timeContext = getTimeContext();

  // Add time context
  sections.push(`## CURRENT CONTEXT
  - Time: ${timeContext.timeOfDay.replace('_', ' ')} (${new Date().toLocaleTimeString()})
  - Day: ${getDayName(timeContext.dayOfWeek)}${timeContext.isWeekend ? ' (Weekend)' : ''}
  - Month Progress: Day ${timeContext.dayOfMonth}${timeContext.isMonthEnd ? ' (Month End)' : ''}${timeContext.isQuarterEnd ? ' (Quarter End)' : ''}`);

  // Generate predictions based on query
  const predictions = await predictUserIntent(supabase, session, [], query);
    if (predictions.length > 0) {
          const topPredictions = predictions.slice(0, 3);
          sections.push(`## PREDICTED USER NEEDS
          ${topPredictions.map(p => `- ${p.reasoning} (${Math.round(p.confidence * 100)}% confidence)`).join('\n')}`);
    }

  // Get smart suggestions
  const suggestions = await generateSmartSuggestions(supabase, session);
    if (suggestions.length > 0) {
          const topSuggestions = suggestions.slice(0, 3);
          sections.push(`## PROACTIVE INSIGHTS
          ${topSuggestions.map(s => `- **${s.title}**: ${s.description}`).join('\n')}`);
    }

  return sections.join('\n\n');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTimeContext(): TimeContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    const month = now.getMonth();
    const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate();

  return {
        hour,
        dayOfWeek,
        dayOfMonth,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isMonthEnd: dayOfMonth >= daysInMonth - 3,
        isQuarterEnd: [2, 5, 8, 11].includes(month) && dayOfMonth >= daysInMonth - 5,
        isMorning: hour >= 6 && hour < 12,
              isEvening: hour >= 17 && hour < 22,
                    timeOfDay: hour < 6 ? 'night' :
                                     hour < 12 ? (hour < 9 ? 'early_morning' : 'morning') :
                                     hour < 17 ? 'afternoon' :
                                     hour < 22 ? 'evening' : 'night'
  };
}

function getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
}

function extractMentionedEntities(messages: string[], entityType: string): string | null {
    // Simple entity extraction - in production, use NLP
  const patterns: Record<string, RegExp> = {
        client: /(?:client|customer|company)\s+["']?([^"'\s,]+)["']?/i
  };

  const pattern = patterns[entityType];
    if (!pattern) return null;

  for (const msg of messages) {
        const match = msg.match(pattern);
        if (match) return match[1];
  }

  return null;
}

async function fetchUrgentTasks(supabase: SupabaseClient, companyId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

  const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'complete')
      .lte('due_date', tomorrow.toISOString())
      .order('due_date', { ascending: true })
      .limit(10);

  return data || [];
}

async function fetchUnreadCount(supabase: SupabaseClient, userId: string) {
    const { count } = await supabase
      .from('sync_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

  return count || 0;
}

async function fetchOverdueInvoices(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'paid')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(20);

  return data || [];
}

async function fetchOverdueTasks(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'complete')
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(20);

  return data || [];
}

async function fetchHotProspects(supabase: SupabaseClient, companyId: string) {
    const { data } = await supabase
      .from('prospects')
      .select('*')
      .eq('company_id', companyId)
      .or('status.eq.qualified,status.eq.proposal')
      .order('score', { ascending: false })
      .limit(10);

  return data || [];
}

async function fetchRecentProposals(supabase: SupabaseClient, companyId: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

  const { data } = await supabase
      .from('proposals')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'sent')
      .gte('sent_at', weekAgo.toISOString())
      .order('sent_at', { ascending: false })
      .limit(10);

  return data || [];
}

// ============================================================================
// FORMAT FOR UI
// ============================================================================

export function formatSuggestionsForUI(suggestions: SmartSuggestion[]): string {
    if (!suggestions.length) return '';

  return suggestions.slice(0, 5).map(s => {
        const icon = s.type === 'action' ? '⚡' :
                           s.type === 'reminder' ? '🔔' :
                           s.type === 'insight' ? '💡' : '❓';
        return `${icon} **${s.title}**: ${s.description}`;
  }).join('\n');
}

export default {
    predictUserIntent,
    generateSmartSuggestions,
    enrichContextPredictively,
    formatSuggestionsForUI
};
