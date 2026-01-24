/**
 * Shared AI Usage Tracking Utility
 *
 * Provides consistent logging of AI API usage across all edge functions.
 * All usage is tracked in the `ai_usage_logs` table for admin dashboard visibility.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

// ============================================================================
// Types
// ============================================================================

export interface AIUsageRecord {
  user_id?: string;
  organization_id?: string;  // Maps to company_id
  model_id?: string;         // UUID from ai_models table
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  request_type: 'chat' | 'completion' | 'embedding' | 'image' | 'sync_agent' | 'invoice_processing' | 'video';
  endpoint?: string;
  metadata?: Record<string, unknown>;
}

export interface ModelPricing {
  id: string;
  model_id: string;
  pricing_input: number;   // Per 1K tokens
  pricing_output: number;  // Per 1K tokens
}

// ============================================================================
// Model Pricing Constants (per 1K tokens unless noted)
// ============================================================================

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Together.ai LLM Models
  'moonshotai/Kimi-K2-Instruct': { input: 0.0006, output: 0.0009 },
  'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free': { input: 0, output: 0 },
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { input: 0.00088, output: 0.00088 },
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { input: 0.00018, output: 0.00018 },

  // Groq Models
  'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
  'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },

  // Embedding Models (input only)
  'BAAI/bge-large-en-v1.5': { input: 0.00002, output: 0 },

  // Image models use megapixel pricing, not tokens
  // Stored here for reference but cost is calculated differently
  'black-forest-labs/FLUX.1-Kontext-pro': { input: 0, output: 0 },
  'black-forest-labs/FLUX.1.1-pro': { input: 0, output: 0 },
  'black-forest-labs/FLUX.1-schnell': { input: 0, output: 0 },
};

// Image model pricing per megapixel
export const IMAGE_MODEL_PRICING: Record<string, number> = {
  'black-forest-labs/FLUX.1-Kontext-pro': 0.04,
  'black-forest-labs/FLUX.1-Kontext-dev': 0.025,
  'black-forest-labs/FLUX.1.1-pro': 0.04,
  'black-forest-labs/FLUX.1-dev': 0.025,
  'black-forest-labs/FLUX.1-schnell': 0.003,
};

// ============================================================================
// Model ID Cache (to avoid repeated lookups)
// ============================================================================

const modelIdCache = new Map<string, string>();

/**
 * Look up a model's UUID by its model identifier
 * Uses caching to minimize database queries
 */
export async function getModelId(
  supabase: SupabaseClient,
  modelIdentifier: string
): Promise<string | null> {
  // Check cache first
  if (modelIdCache.has(modelIdentifier)) {
    return modelIdCache.get(modelIdentifier)!;
  }

  try {
    const { data, error } = await supabase
      .from('ai_models')
      .select('id')
      .eq('model_id', modelIdentifier)
      .single();

    if (error || !data) {
      console.warn(`Model not found in ai_models: ${modelIdentifier}`);
      return null;
    }

    modelIdCache.set(modelIdentifier, data.id);
    return data.id;
  } catch (err) {
    console.error('Error looking up model ID:', err);
    return null;
  }
}

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Calculate cost from token counts and pricing
 * @param promptTokens - Number of input tokens
 * @param completionTokens - Number of output tokens
 * @param pricingInput - Cost per 1K input tokens
 * @param pricingOutput - Cost per 1K output tokens
 * @returns Total cost in USD
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricingInput: number,
  pricingOutput: number
): number {
  const inputCost = (promptTokens / 1000) * pricingInput;
  const outputCost = (completionTokens / 1000) * pricingOutput;
  return Math.round((inputCost + outputCost) * 1000000) / 1000000; // Round to 6 decimal places
}

/**
 * Calculate cost for a model using its identifier
 * Looks up pricing from MODEL_PRICING constants
 */
export function calculateModelCost(
  modelIdentifier: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[modelIdentifier];
  if (!pricing) {
    console.warn(`No pricing found for model: ${modelIdentifier}`);
    return 0;
  }
  return calculateCost(promptTokens, completionTokens, pricing.input, pricing.output);
}

/**
 * Calculate image generation cost based on megapixels
 */
export function calculateImageCost(
  modelIdentifier: string,
  width: number,
  height: number
): number {
  const pricing = IMAGE_MODEL_PRICING[modelIdentifier];
  if (!pricing) {
    console.warn(`No image pricing found for model: ${modelIdentifier}`);
    return 0;
  }
  const megapixels = (width * height) / 1000000;
  return Math.round(megapixels * pricing * 1000000) / 1000000;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log AI usage to the ai_usage_logs table
 * This is the single source of truth for the admin dashboard
 */
export async function logAIUsage(
  supabase: SupabaseClient,
  record: AIUsageRecord
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: record.user_id || null,
        organization_id: record.organization_id || null,
        model_id: record.model_id || null,
        prompt_tokens: record.prompt_tokens,
        completion_tokens: record.completion_tokens,
        total_tokens: record.total_tokens,
        cost: record.cost,
        request_type: record.request_type,
        endpoint: record.endpoint || null,
        metadata: record.metadata || {},
      });

    if (error) {
      console.error('Failed to log AI usage:', error);
    }
  } catch (err) {
    // Don't throw - usage logging should never break the main flow
    console.error('Error in logAIUsage:', err);
  }
}

/**
 * Convenience function to log LLM usage with automatic pricing lookup
 */
export async function logLLMUsage(
  supabase: SupabaseClient,
  modelIdentifier: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
  context: {
    userId?: string;
    companyId?: string;
    requestType: AIUsageRecord['request_type'];
    endpoint?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

  const modelId = await getModelId(supabase, modelIdentifier);
  const cost = calculateModelCost(modelIdentifier, promptTokens, completionTokens);

  await logAIUsage(supabase, {
    user_id: context.userId,
    organization_id: context.companyId,
    model_id: modelId || undefined,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost,
    request_type: context.requestType,
    endpoint: context.endpoint,
    metadata: context.metadata,
  });
}

/**
 * Convenience function to log image generation usage
 */
export async function logImageUsage(
  supabase: SupabaseClient,
  modelIdentifier: string,
  dimensions: { width: number; height: number },
  context: {
    userId?: string;
    companyId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const modelId = await getModelId(supabase, modelIdentifier);
  const cost = calculateImageCost(modelIdentifier, dimensions.width, dimensions.height);

  await logAIUsage(supabase, {
    user_id: context.userId,
    organization_id: context.companyId,
    model_id: modelId || undefined,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    cost,
    request_type: 'image',
    endpoint: '/v1/images/generations',
    metadata: {
      ...context.metadata,
      width: dimensions.width,
      height: dimensions.height,
      megapixels: (dimensions.width * dimensions.height) / 1000000,
    },
  });
}
