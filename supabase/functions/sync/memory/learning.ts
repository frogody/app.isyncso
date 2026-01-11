/**
 * SYNC Learning System
 *
 * Stores successful task patterns and retrieves them for future planning.
 * Uses vector embeddings for semantic similarity matching.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { TaskPlan, TaskStep } from "../tools/planner.ts";
import { generateEmbedding } from "./embeddings.ts";

// =============================================================================
// Types
// =============================================================================

export interface LearnedPattern {
  id: string;
  triggerText: string;
  triggerEmbedding?: number[];
  planTemplate: PlanTemplate;
  successCount: number;
  feedbackScore: number;
  createdAt: Date;
  lastUsedAt: Date;
  metadata?: {
    avgExecutionTime?: number;
    commonEntities?: string[];
    userIds?: string[];
  };
}

export interface PlanTemplate {
  goal: string;
  steps: StepTemplate[];
}

export interface StepTemplate {
  description: string;
  agent: string;
  action: string;
  inputKeys: string[];  // What inputs are needed (will be filled at runtime)
  dependsOn: string[];
  announcement: string;
  completionMessage: string;
}

export interface PatternMatch {
  pattern: LearnedPattern;
  similarity: number;
  canApply: boolean;
  missingInputs: string[];
}

// =============================================================================
// Learning Functions
// =============================================================================

/**
 * Store a successful task completion as a learned pattern
 */
export async function learnFromSuccess(
  supabase: SupabaseClient,
  originalRequest: string,
  executedPlan: TaskPlan,
  feedback?: 'positive' | 'negative' | null,
  userId?: string
): Promise<string | null> {
  try {
    // Generate embedding for the request
    const embedding = await generateEmbedding(originalRequest);
    if (!embedding) {
      console.warn('[Learning] Failed to generate embedding for pattern');
      return null;
    }

    // Convert executed plan to template
    const planTemplate = convertToPlanTemplate(executedPlan);

    // Check if a similar pattern already exists
    const existingPattern = await findExactMatch(supabase, originalRequest);

    if (existingPattern) {
      // Update existing pattern
      const { error } = await supabase
        .from('sync_learned_patterns')
        .update({
          success_count: existingPattern.success_count + 1,
          feedback_score: calculateNewScore(
            existingPattern.feedback_score,
            existingPattern.success_count,
            feedback
          ),
          last_used_at: new Date().toISOString(),
          metadata: {
            ...existingPattern.metadata,
            userIds: [...new Set([...(existingPattern.metadata?.userIds || []), userId].filter(Boolean))],
          },
        })
        .eq('id', existingPattern.id);

      if (error) {
        console.error('[Learning] Failed to update pattern:', error);
        return null;
      }

      return existingPattern.id;
    }

    // Create new pattern
    const { data, error } = await supabase
      .from('sync_learned_patterns')
      .insert({
        trigger_text: originalRequest,
        trigger_embedding: embedding,
        plan_template: planTemplate,
        success_count: 1,
        feedback_score: feedback === 'positive' ? 1 : feedback === 'negative' ? -1 : 0,
        metadata: {
          userIds: userId ? [userId] : [],
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Learning] Failed to store pattern:', error);
      return null;
    }

    console.log(`[Learning] Stored new pattern: ${data.id}`);
    return data.id;

  } catch (error) {
    console.error('[Learning] Error in learnFromSuccess:', error);
    return null;
  }
}

/**
 * Find similar patterns for a new request
 */
export async function findSimilarPatterns(
  supabase: SupabaseClient,
  request: string,
  options: {
    matchThreshold?: number;
    maxResults?: number;
    minSuccessCount?: number;
  } = {}
): Promise<PatternMatch[]> {
  const {
    matchThreshold = 0.75,
    maxResults = 5,
    minSuccessCount = 1,
  } = options;

  try {
    // Generate embedding for the request
    const embedding = await generateEmbedding(request);
    if (!embedding) {
      console.warn('[Learning] Failed to generate embedding for search');
      return [];
    }

    // Use vector similarity search
    const { data, error } = await supabase.rpc('match_learned_patterns', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: maxResults,
      min_success_count: minSuccessCount,
    });

    if (error) {
      console.error('[Learning] Pattern search failed:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Convert to PatternMatch format
    return data.map((row: any) => ({
      pattern: {
        id: row.id,
        triggerText: row.trigger_text,
        planTemplate: row.plan_template,
        successCount: row.success_count,
        feedbackScore: row.feedback_score,
        createdAt: new Date(row.created_at),
        lastUsedAt: new Date(row.last_used_at),
        metadata: row.metadata,
      },
      similarity: row.similarity,
      canApply: true, // Will be refined after entity extraction
      missingInputs: [],
    }));

  } catch (error) {
    console.error('[Learning] Error in findSimilarPatterns:', error);
    return [];
  }
}

/**
 * Apply a learned pattern to a new request
 */
export function applyPattern(
  pattern: LearnedPattern,
  extractedEntities: Record<string, any>
): TaskStep[] | null {
  try {
    const steps: TaskStep[] = [];
    const missingInputs: string[] = [];

    for (let i = 0; i < pattern.planTemplate.steps.length; i++) {
      const template = pattern.planTemplate.steps[i];

      // Check if we have all required inputs
      const inputs: Record<string, any> = {};
      const inputTemplates: Record<string, string> = {};

      for (const inputKey of template.inputKeys) {
        if (extractedEntities[inputKey] !== undefined) {
          inputs[inputKey] = extractedEntities[inputKey];
        } else if (inputKey.startsWith('step_')) {
          // This is a dependency on a previous step's output
          inputTemplates[inputKey] = `{{${inputKey}}}`;
        } else {
          missingInputs.push(inputKey);
        }
      }

      // If critical inputs are missing, we can't apply this pattern
      if (missingInputs.length > 0 && i === 0) {
        console.log(`[Learning] Cannot apply pattern - missing inputs: ${missingInputs.join(', ')}`);
        return null;
      }

      steps.push({
        id: `step_${i + 1}`,
        index: i,
        description: template.description,
        agent: template.agent,
        action: template.action,
        inputs,
        inputTemplates,
        dependsOn: template.dependsOn,
        status: 'pending',
        announcement: fillTemplate(template.announcement, extractedEntities),
        completionMessage: template.completionMessage,
        failureMessage: `Failed to ${template.description.toLowerCase()}`,
        isCheckpoint: false,
        retryCount: 0,
        maxRetries: 2,
      });
    }

    return steps;

  } catch (error) {
    console.error('[Learning] Error applying pattern:', error);
    return null;
  }
}

/**
 * Record user feedback on a completed task
 */
export async function recordFeedback(
  supabase: SupabaseClient,
  patternId: string,
  feedback: 'positive' | 'negative'
): Promise<boolean> {
  try {
    // Get current pattern data
    const { data: pattern, error: fetchError } = await supabase
      .from('sync_learned_patterns')
      .select('feedback_score, success_count')
      .eq('id', patternId)
      .single();

    if (fetchError || !pattern) {
      console.error('[Learning] Pattern not found for feedback');
      return false;
    }

    // Calculate new score
    const newScore = calculateNewScore(
      pattern.feedback_score,
      pattern.success_count,
      feedback
    );

    // Update pattern
    const { error: updateError } = await supabase
      .from('sync_learned_patterns')
      .update({ feedback_score: newScore })
      .eq('id', patternId);

    if (updateError) {
      console.error('[Learning] Failed to record feedback:', updateError);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[Learning] Error recording feedback:', error);
    return false;
  }
}

/**
 * Get the best pattern for a request based on similarity and feedback
 */
export async function getBestPattern(
  supabase: SupabaseClient,
  request: string
): Promise<PatternMatch | null> {
  const matches = await findSimilarPatterns(supabase, request, {
    matchThreshold: 0.8,
    maxResults: 3,
    minSuccessCount: 2,
  });

  if (matches.length === 0) {
    return null;
  }

  // Score patterns by: similarity * (1 + normalized_feedback)
  const scoredMatches = matches.map(match => ({
    ...match,
    score: match.similarity * (1 + (match.pattern.feedbackScore / 10)),
  }));

  // Sort by combined score
  scoredMatches.sort((a, b) => b.score - a.score);

  // Return the best match if it's good enough
  if (scoredMatches[0].similarity >= 0.85) {
    return scoredMatches[0];
  }

  return null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert an executed plan to a reusable template
 */
function convertToPlanTemplate(plan: TaskPlan): PlanTemplate {
  return {
    goal: plan.goal,
    steps: plan.steps.map(step => ({
      description: step.description,
      agent: step.agent,
      action: step.action,
      inputKeys: Object.keys(step.inputs),
      dependsOn: step.dependsOn,
      announcement: step.announcement,
      completionMessage: step.completionMessage,
    })),
  };
}

/**
 * Find an exact match by trigger text
 */
async function findExactMatch(
  supabase: SupabaseClient,
  triggerText: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('sync_learned_patterns')
    .select('*')
    .eq('trigger_text', triggerText)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Calculate new feedback score using exponential moving average
 */
function calculateNewScore(
  currentScore: number,
  totalCount: number,
  newFeedback: 'positive' | 'negative' | null | undefined
): number {
  if (!newFeedback) {
    return currentScore;
  }

  const feedbackValue = newFeedback === 'positive' ? 1 : -1;

  // EMA with more weight on recent feedback
  const alpha = Math.min(0.3, 1 / (totalCount + 1));
  return currentScore * (1 - alpha) + feedbackValue * alpha;
}

/**
 * Fill template with extracted values
 */
function fillTemplate(template: string, values: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

// =============================================================================
// Analytics Functions
// =============================================================================

/**
 * Get learning analytics for a company
 */
export async function getLearningAnalytics(
  supabase: SupabaseClient,
  companyId?: string
): Promise<{
  totalPatterns: number;
  avgSuccessCount: number;
  avgFeedbackScore: number;
  topPatterns: LearnedPattern[];
}> {
  try {
    // Get all patterns (optionally filtered by company)
    const query = supabase
      .from('sync_learned_patterns')
      .select('*')
      .order('success_count', { ascending: false })
      .limit(100);

    const { data, error } = await query;

    if (error || !data) {
      return {
        totalPatterns: 0,
        avgSuccessCount: 0,
        avgFeedbackScore: 0,
        topPatterns: [],
      };
    }

    const totalPatterns = data.length;
    const avgSuccessCount = data.reduce((sum, p) => sum + p.success_count, 0) / totalPatterns;
    const avgFeedbackScore = data.reduce((sum, p) => sum + p.feedback_score, 0) / totalPatterns;

    const topPatterns: LearnedPattern[] = data.slice(0, 10).map((row: any) => ({
      id: row.id,
      triggerText: row.trigger_text,
      planTemplate: row.plan_template,
      successCount: row.success_count,
      feedbackScore: row.feedback_score,
      createdAt: new Date(row.created_at),
      lastUsedAt: new Date(row.last_used_at),
      metadata: row.metadata,
    }));

    return {
      totalPatterns,
      avgSuccessCount,
      avgFeedbackScore,
      topPatterns,
    };

  } catch (error) {
    console.error('[Learning] Error getting analytics:', error);
    return {
      totalPatterns: 0,
      avgSuccessCount: 0,
      avgFeedbackScore: 0,
      topPatterns: [],
    };
  }
}

/**
 * Prune low-performing patterns
 */
export async function prunePatterns(
  supabase: SupabaseClient,
  options: {
    minFeedbackScore?: number;
    minSuccessCount?: number;
    maxAgeHours?: number;
  } = {}
): Promise<number> {
  const {
    minFeedbackScore = -0.5,
    minSuccessCount = 1,
    maxAgeHours = 720, // 30 days
  } = options;

  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

    // Delete patterns with poor feedback or no usage
    const { data, error } = await supabase
      .from('sync_learned_patterns')
      .delete()
      .or(
        `feedback_score.lt.${minFeedbackScore},` +
        `and(success_count.lte.${minSuccessCount},last_used_at.lt.${cutoffDate.toISOString()})`
      )
      .select('id');

    if (error) {
      console.error('[Learning] Error pruning patterns:', error);
      return 0;
    }

    const prunedCount = data?.length || 0;
    if (prunedCount > 0) {
      console.log(`[Learning] Pruned ${prunedCount} low-performing patterns`);
    }

    return prunedCount;

  } catch (error) {
    console.error('[Learning] Error in prunePatterns:', error);
    return 0;
  }
}
