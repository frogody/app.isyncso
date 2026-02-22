/**
 * Shared Credit Check & Deduction Utility
 *
 * Edge functions import this to:
 * 1. Look up action cost from credit_action_costs
 * 2. Check user balance
 * 3. Deduct credits via the deduct_credits() RPC
 * 4. Return 402 if insufficient
 *
 * Usage in an edge function:
 *
 *   import { requireCredits, CreditResult } from '../_shared/credit-check.ts';
 *
 *   // Simple: deduct fixed credits for an action
 *   const credit = await requireCredits(supabase, userId, 'generate-image-pro');
 *   if (!credit.success) return credit.errorResponse;
 *
 *   // Per-unit: deduct credits * quantity (e.g. 3 credits/image x 10 images)
 *   const credit = await requireCredits(supabase, userId, 'studio-photoshoot-per-image', { quantity: 10 });
 *   if (!credit.success) return credit.errorResponse;
 *
 *   // After API call succeeds, credit is already deducted. Done.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Types
// ============================================================================

export interface ActionCost {
  action_key: string;
  credits_required: number;
  label: string;
  category: string;
  is_per_unit: boolean;
  unit_label: string | null;
}

export interface CreditResult {
  success: boolean;
  credits_deducted: number;
  balance_after: number;
  action_key: string;
  /** Pre-built 402 Response - only present when success=false */
  errorResponse?: Response;
}

export interface CreditCheckOptions {
  /** For per-unit actions: multiply credits by this quantity */
  quantity?: number;
  /** Override the default credits (e.g. for dynamic pricing) */
  creditsOverride?: number;
  /** Which edge function is calling this */
  edgeFunction?: string;
  /** Extra metadata to store in the transaction */
  metadata?: Record<string, unknown>;
  /** Human-readable description for the transaction log */
  description?: string;
  /** Reference type (e.g. 'product', 'candidate') */
  referenceType?: string;
  /** Reference ID */
  referenceId?: string;
  /** Reference name */
  referenceName?: string;
}

// ============================================================================
// Action Cost Cache (avoid repeated DB lookups within a single request)
// ============================================================================

const actionCostCache = new Map<string, ActionCost>();

/**
 * Look up the credit cost for an action key.
 * Caches results in-memory for the lifecycle of the edge function invocation.
 */
export async function getActionCost(
  supabase: SupabaseClient,
  actionKey: string
): Promise<ActionCost | null> {
  if (actionCostCache.has(actionKey)) {
    return actionCostCache.get(actionKey)!;
  }

  const { data, error } = await supabase
    .from('credit_action_costs')
    .select('action_key, credits_required, label, category, is_per_unit, unit_label')
    .eq('action_key', actionKey)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.warn(`[credit-check] No active action cost found for key: ${actionKey}`);
    return null;
  }

  const cost: ActionCost = {
    action_key: data.action_key,
    credits_required: data.credits_required,
    label: data.label,
    category: data.category,
    is_per_unit: data.is_per_unit,
    unit_label: data.unit_label,
  };

  actionCostCache.set(actionKey, cost);
  return cost;
}

// ============================================================================
// Main: requireCredits
// ============================================================================

/**
 * Check and deduct credits for a user action.
 * Call this BEFORE making the external API call.
 *
 * Returns { success: true, credits_deducted, balance_after } on success.
 * Returns { success: false, errorResponse } on failure (insufficient credits or missing action).
 */
export async function requireCredits(
  supabase: SupabaseClient,
  userId: string,
  actionKey: string,
  options: CreditCheckOptions = {}
): Promise<CreditResult> {
  // 1. Look up action cost
  const actionCost = await getActionCost(supabase, actionKey);

  if (!actionCost) {
    // Action not found in credit_action_costs - allow through with 0 credits
    // This prevents blocking when new features haven't been configured yet
    console.warn(`[credit-check] Action "${actionKey}" not configured, allowing through for free`);
    return {
      success: true,
      credits_deducted: 0,
      balance_after: -1,
      action_key: actionKey,
    };
  }

  // 2. Calculate total credits needed
  let creditsNeeded = options.creditsOverride ?? actionCost.credits_required;

  if (actionCost.is_per_unit && options.quantity && options.quantity > 1) {
    creditsNeeded = creditsNeeded * options.quantity;
  }

  // 3. Free actions pass through
  if (creditsNeeded <= 0) {
    return {
      success: true,
      credits_deducted: 0,
      balance_after: -1,
      action_key: actionKey,
    };
  }

  // 4. Deduct credits via RPC
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: creditsNeeded,
    p_transaction_type: 'usage',
    p_action_key: actionKey,
    p_edge_function: options.edgeFunction || actionKey,
    p_reference_type: options.referenceType || null,
    p_reference_id: options.referenceId || null,
    p_reference_name: options.referenceName || null,
    p_description: options.description || `${actionCost.label}${options.quantity ? ` (x${options.quantity})` : ''}`,
    p_metadata: JSON.stringify(options.metadata || {}),
  });

  if (error) {
    console.error('[credit-check] RPC deduct_credits error:', error);
    return {
      success: false,
      credits_deducted: 0,
      balance_after: 0,
      action_key: actionKey,
      errorResponse: new Response(
        JSON.stringify({
          error: 'Credit deduction failed',
          code: 'CREDIT_ERROR',
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  // Parse result (comes back as array from RPC)
  const result = Array.isArray(data) ? data[0] : data;

  if (!result?.success) {
    // Insufficient credits
    return {
      success: false,
      credits_deducted: 0,
      balance_after: result?.new_balance ?? 0,
      action_key: actionKey,
      errorResponse: new Response(
        JSON.stringify({
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: creditsNeeded,
          available: result?.new_balance ?? 0,
          action: actionKey,
          action_label: actionCost.label,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  console.log(
    `[credit-check] Deducted ${creditsNeeded} credits for "${actionKey}" from user ${userId}. Balance: ${result.new_balance}`
  );

  return {
    success: true,
    credits_deducted: creditsNeeded,
    balance_after: result.new_balance,
    action_key: actionKey,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Quick check if user has enough credits (without deducting).
 * Useful for UI pre-flight checks.
 */
export async function hasEnoughCredits(
  supabase: SupabaseClient,
  userId: string,
  actionKey: string,
  quantity?: number
): Promise<{ enough: boolean; required: number; available: number }> {
  const actionCost = await getActionCost(supabase, actionKey);

  if (!actionCost || actionCost.credits_required <= 0) {
    return { enough: true, required: 0, available: -1 };
  }

  let creditsNeeded = actionCost.credits_required;
  if (actionCost.is_per_unit && quantity && quantity > 1) {
    creditsNeeded *= quantity;
  }

  const { data, error } = await supabase.rpc('check_credits', {
    p_user_id: userId,
    p_amount: creditsNeeded,
  });

  if (error) {
    console.error('[credit-check] check_credits error:', error);
    return { enough: false, required: creditsNeeded, available: 0 };
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    enough: result?.has_enough ?? false,
    required: creditsNeeded,
    available: result?.current_balance ?? 0,
  };
}

/**
 * Refund credits back to user (e.g. when an API call fails after deduction).
 */
export async function refundCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  actionKey: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_transaction_type: 'refund',
    p_description: reason || `Refund for failed ${actionKey}`,
  });

  if (error) {
    console.error('[credit-check] Refund failed:', error);
    return false;
  }

  const result = Array.isArray(data) ? data[0] : data;
  console.log(`[credit-check] Refunded ${amount} credits to user ${userId} for "${actionKey}". New balance: ${result?.new_balance}`);
  return result?.success ?? false;
}

/**
 * Extract user ID from Supabase auth header.
 * Common pattern used across edge functions.
 */
export async function getUserFromAuth(
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<{ userId: string; error?: never } | { userId?: never; error: Response }> {
  if (!authHeader) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { userId: user.id };
}
