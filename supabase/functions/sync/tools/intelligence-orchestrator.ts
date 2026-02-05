/**
 * SYNC Intelligence Orchestrator
 *
 * Central coordinator that combines all intelligence modules to deliver
 * "mouth-dropping" results. This is the main integration point that should
 * be called from the SYNC index.ts
 *
 * @author Claude & Gody
 * @version 2.0.0
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { SyncSession } from '../memory/types.ts';
import { ActionResult } from './types.ts';

import {
    synthesizeDeepContext,
    formatDeepInsightsForResponse,
    DeepInsight
} from './deep-intelligence.ts';

import {
    predictUserIntent,
    generateSmartSuggestions,
    enrichContextPredictively,
    formatSuggestionsForUI,
    SmartSuggestion,
    PredictedIntent
} from './predictive-intelligence.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface IntelligenceResult {
    deepInsights: DeepInsight[];
    predictions: PredictedIntent[];
    suggestions: SmartSuggestion[];
    enrichedContext: string;
    formattedResponse: string;
}

export interface ResponseEnhancement {
    preResponse: string;  // Context to add before main response
  postResponse: string; // Insights to add after main response
  suggestedFollowUps: string[]; // Questions user might want to ask next
}

// ============================================================================
// MAIN ORCHESTRATION
// ============================================================================

/**
 * Main entry point - orchestrates all intelligence modules
 * Call this before generating the final LLM response
 */
export async function orchestrateIntelligence(
    supabase: SupabaseClient,
    session: SyncSession,
    query: string,
    recentMessages: string[] = [],
    recentActions: ActionResult[] = []
  ): Promise<IntelligenceResult> {
    console.log('[IntelligenceOrchestrator] Starting intelligence orchestration...');

  const startTime = Date.now();

  try {
        // Run all intelligence modules in parallel for speed
      const [
              deepInsights,
              predictions,
              suggestions,
              enrichedContext
            ] = await Promise.all([
              synthesizeDeepContext(supabase, session, query, recentActions),
              predictUserIntent(supabase, session, recentMessages, query),
              generateSmartSuggestions(supabase, session),
              enrichContextPredictively(supabase, session, query)
            ]);

      // Generate formatted response combining all insights
      const formattedResponse = generateFormattedResponse(
              deepInsights,
              predictions,
              suggestions,
              query
            );

      const duration = Date.now() - startTime;
        console.log(`[IntelligenceOrchestrator] Completed in ${duration}ms`);
        console.log(`[IntelligenceOrchestrator] Found ${deepInsights.length} insights, ${predictions.length} predictions, ${suggestions.length} suggestions`);

      return {
              deepInsights,
              predictions,
              suggestions,
              enrichedContext,
              formattedResponse
      };

  } catch (error) {
        console.error('[IntelligenceOrchestrator] Error:', error);
        return {
                deepInsights: [],
                predictions: [],
                suggestions: [],
                enrichedContext: '',
                formattedResponse: ''
        };
  }
}

/**
 * Generate response enhancement to make responses "mouth-dropping"
 * Call this after action execution to add insights to the response
 */
export async function enhanceResponse(
    supabase: SupabaseClient,
    session: SyncSession,
    action: string,
    actionResult: ActionResult,
    intelligenceResult: IntelligenceResult
  ): Promise<ResponseEnhancement> {
    const preResponse: string[] = [];
    const postResponse: string[] = [];
    const suggestedFollowUps: string[] = [];

  try {
        // === PRE-RESPONSE CONTEXT ===
      // Add relevant context that helps frame the response

      // === POST-RESPONSE INSIGHTS ===
      // Add valuable insights related to the action

      // Critical insights should be highlighted
      const criticalInsights = intelligenceResult.deepInsights.filter(i => i.priority === 'critical');
        if (criticalInsights.length > 0) {
                postResponse.push('\n---\n🚨 **Important Alerts:**');
                criticalInsights.forEach(insight => {
                          postResponse.push(`• **${insight.title}**: ${insight.summary}`);
                });
        }

      // Add relevant opportunities
      const relevantOpportunities = intelligenceResult.deepInsights.filter(i =>
              i.category === 'opportunity' && isRelevantToAction(action, i)
                                                                               ).slice(0, 2);

      if (relevantOpportunities.length > 0) {
              postResponse.push('\n💡 **Related Opportunities:**');
              relevantOpportunities.forEach(opp => {
                        postResponse.push(`• ${opp.title}: ${opp.summary}`);
              });
      }

      // Add proactive suggestions if relevant
      const relevantSuggestions = intelligenceResult.suggestions.filter(s =>
              isRelevantToAction(action, s)
                                                                            ).slice(0, 2);

      if (relevantSuggestions.length > 0) {
              postResponse.push('\n⚡ **Quick Actions:**');
              relevantSuggestions.forEach(sug => {
                        postResponse.push(`• ${sug.title}: ${sug.description}`);
              });
      }

      // === SUGGESTED FOLLOW-UPS ===
      // Generate smart follow-up questions based on context

      suggestedFollowUps.push(...generateFollowUpQuestions(action, actionResult, intelligenceResult));

      return {
              preResponse: preResponse.join('\n'),
              postResponse: postResponse.join('\n'),
              suggestedFollowUps
      };

  } catch (error) {
        console.error('[ResponseEnhancement] Error:', error);
        return {
                preResponse: '',
                postResponse: '',
                suggestedFollowUps: []
        };
  }
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

function generateFormattedResponse(
    insights: DeepInsight[],
    predictions: PredictedIntent[],
    suggestions: SmartSuggestion[],
    query: string
  ): string {
    const sections: string[] = [];

  // Only include the most relevant insights (max 5)
  const relevantInsights = insights.slice(0, 5);

  if (relevantInsights.length > 0) {
        sections.push(formatDeepInsightsForResponse(relevantInsights));
  }

  // Add top suggestion if highly relevant
  if (suggestions.length > 0 && suggestions[0].priority >= 80) {
        const topSuggestion = suggestions[0];
        sections.push(`\n💡 **${topSuggestion.title}**: ${topSuggestion.description}`);
  }

  return sections.join('\n');
}

function generateFollowUpQuestions(
    action: string,
    result: ActionResult,
    intelligence: IntelligenceResult
  ): string[] {
    const followUps: string[] = [];

  // Action-specific follow-ups
  const actionFollowUps: Record<string, string[]> = {
        'list_invoices': [
                'Send reminders for overdue invoices',
                'Show me cash flow analysis',
                'Which clients owe the most?'
              ],
        'list_prospects': [
                'Which prospects should I prioritize?',
                'Create follow-up tasks for hot prospects',
                'Show me conversion rate trends'
              ],
        'list_tasks': [
                'What are my priorities for today?',
                'Which tasks are blocking others?',
                'Reschedule overdue tasks'
              ],
        'search_invoices': [
                'Compare this to previous periods',
                'Show me related expenses',
                'Who are the top clients by revenue?'
              ],
        'get_financial_summary': [
                'What are my biggest expense categories?',
                'Show me month-over-month trends',
                'Forecast next month\'s revenue'
              ]
  };

  if (actionFollowUps[action]) {
        followUps.push(...actionFollowUps[action]);
  }

  // Add insight-based follow-ups
  if (intelligence.deepInsights.length > 0) {
        const topInsight = intelligence.deepInsights[0];
        if (topInsight.suggestedActions.length > 0) {
                followUps.push(topInsight.suggestedActions[0]);
        }
  }

  // Add prediction-based follow-ups
  if (intelligence.predictions.length > 0) {
        const topPrediction = intelligence.predictions.find(p => p.confidence > 0.7);
        if (topPrediction) {
                followUps.push(topPrediction.suggestedQuery);
        }
  }

  // Deduplicate and limit
  return [...new Set(followUps)].slice(0, 5);
}

function isRelevantToAction(action: string, item: DeepInsight | SmartSuggestion): boolean {
    const actionCategories: Record<string, string[]> = {
          'list_invoices': ['financial', 'invoice', 'payment', 'revenue', 'cash'],
          'search_invoices': ['financial', 'invoice', 'payment', 'revenue', 'cash'],
          'list_prospects': ['prospect', 'sales', 'opportunity', 'pipeline', 'deal'],
          'list_tasks': ['task', 'todo', 'deadline', 'overdue'],
          'list_contacts': ['client', 'customer', 'contact', 'relationship'],
          'get_financial_summary': ['financial', 'revenue', 'expense', 'cash', 'profit']
    };

  const relevantKeywords = actionCategories[action] || [];
    const itemText = 'title' in item
      ? `${item.title} ${item.summary || item.description}`
          : `${item.title} ${item.details}`;

  return relevantKeywords.some(keyword =>
        itemText.toLowerCase().includes(keyword)
                                 );
}

// ============================================================================
// SYSTEM PROMPT ENHANCEMENT
// ============================================================================

/**
 * Generate enhanced system prompt context
 * Call this before making the LLM call to inject intelligence
 */
export function generateEnhancedSystemContext(
    intelligenceResult: IntelligenceResult
  ): string {
    const sections: string[] = [];

  sections.push(`## PROACTIVE INTELLIGENCE CONTEXT`);

  // Add enriched context
  if (intelligenceResult.enrichedContext) {
        sections.push(intelligenceResult.enrichedContext);
  }

  // Add critical alerts
  const criticalInsights = intelligenceResult.deepInsights.filter(i => i.priority === 'critical');
    if (criticalInsights.length > 0) {
          sections.push(`\n### CRITICAL ALERTS (must mention in response)`);
          criticalInsights.forEach(insight => {
                  sections.push(`- ${insight.title}: ${insight.summary}`);
          });
    }

  // Add key opportunities
  const opportunities = intelligenceResult.deepInsights.filter(i => i.category === 'opportunity').slice(0, 3);
    if (opportunities.length > 0) {
          sections.push(`\n### KEY OPPORTUNITIES (consider mentioning)`);
          opportunities.forEach(opp => {
                  sections.push(`- ${opp.title}: ${opp.summary}`);
          });
    }

  // Add prediction context
  const highConfidencePredictions = intelligenceResult.predictions.filter(p => p.confidence > 0.75);
    if (highConfidencePredictions.length > 0) {
          sections.push(`\n### PREDICTED USER NEEDS`);
          highConfidencePredictions.forEach(pred => {
                  sections.push(`- ${pred.intent}: ${pred.reasoning} (${Math.round(pred.confidence * 100)}%)`);
          });
    }

  sections.push(`\n### RESPONSE GUIDELINES
  - Lead with the most actionable information
  - Proactively mention critical alerts even if not asked
  - Suggest relevant follow-up actions
  - Connect insights across different data domains
  - Be specific with numbers and names
  - End with suggested next steps or questions`);

  return sections.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    orchestrateIntelligence,
    enhanceResponse,
    generateEnhancedSystemContext
};
