/**
 * Error Recovery System for SYNC
 *
 * Provides intelligent error recovery including:
 * - Automatic retry with parameter adjustment
 * - Alternative action suggestions
 * - Graceful degradation
 * - User-friendly error messages with next steps
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';

// ============================================================================
// Types
// ============================================================================

export interface RecoveryContext {
  action: string;
  data: any;
  error: ActionResult;
  attemptNumber: number;
  ctx: ActionContext;
}

export interface RecoverySuggestion {
  action: string;
  description: string;
  data?: any;
  confidence: number;  // 0-1, how likely this will work
}

export interface RecoveryResult {
  shouldRetry: boolean;
  retryWithData?: any;
  suggestions: RecoverySuggestion[];
  userMessage: string;
  partialSuccess?: {
    completed: string[];
    failed: string[];
  };
}

// Error categories for intelligent handling
export type ErrorCategory =
  | 'not_found'           // Resource doesn't exist
  | 'validation'          // Invalid input data
  | 'permission'          // Access denied
  | 'duplicate'           // Resource already exists
  | 'dependency'          // Required resource missing
  | 'rate_limit'          // Too many requests
  | 'network'             // Connection issues
  | 'internal'            // Server error
  | 'unknown';            // Unclassified

// ============================================================================
// Error Classification
// ============================================================================

export function classifyError(error: string | undefined, action: string): ErrorCategory {
  if (!error) return 'unknown';

  const errorLower = error.toLowerCase();

  // Not found patterns
  if (errorLower.includes('not found') ||
      errorLower.includes('does not exist') ||
      errorLower.includes('no rows') ||
      errorLower.includes('404')) {
    return 'not_found';
  }

  // Validation patterns
  if (errorLower.includes('invalid') ||
      errorLower.includes('required') ||
      errorLower.includes('must be') ||
      errorLower.includes('cannot be') ||
      errorLower.includes('missing')) {
    return 'validation';
  }

  // Permission patterns
  if (errorLower.includes('permission') ||
      errorLower.includes('denied') ||
      errorLower.includes('unauthorized') ||
      errorLower.includes('403') ||
      errorLower.includes('forbidden')) {
    return 'permission';
  }

  // Duplicate patterns
  if (errorLower.includes('duplicate') ||
      errorLower.includes('already exists') ||
      errorLower.includes('unique constraint') ||
      errorLower.includes('conflict')) {
    return 'duplicate';
  }

  // Dependency patterns
  if (errorLower.includes('foreign key') ||
      errorLower.includes('reference') ||
      errorLower.includes('depends on')) {
    return 'dependency';
  }

  // Rate limit patterns
  if (errorLower.includes('rate limit') ||
      errorLower.includes('too many requests') ||
      errorLower.includes('429')) {
    return 'rate_limit';
  }

  // Network patterns
  if (errorLower.includes('timeout') ||
      errorLower.includes('connection') ||
      errorLower.includes('network') ||
      errorLower.includes('econnrefused')) {
    return 'network';
  }

  // Internal/server patterns
  if (errorLower.includes('internal') ||
      errorLower.includes('500') ||
      errorLower.includes('server error')) {
    return 'internal';
  }

  return 'unknown';
}

// ============================================================================
// Recovery Strategies
// ============================================================================

/**
 * Get recovery suggestions based on error category and action
 */
export function getRecoverySuggestions(
  context: RecoveryContext
): RecoverySuggestion[] {
  const { action, data, error } = context;
  const category = classifyError(error.error, action);
  const suggestions: RecoverySuggestion[] = [];

  switch (category) {
    case 'not_found':
      suggestions.push(...getNotFoundSuggestions(action, data));
      break;
    case 'validation':
      suggestions.push(...getValidationSuggestions(action, data, error.error));
      break;
    case 'duplicate':
      suggestions.push(...getDuplicateSuggestions(action, data));
      break;
    case 'dependency':
      suggestions.push(...getDependencySuggestions(action, data));
      break;
    case 'rate_limit':
    case 'network':
    case 'internal':
      // These typically need a retry after delay
      break;
    default:
      suggestions.push(...getGenericSuggestions(action, data));
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function getNotFoundSuggestions(action: string, data: any): RecoverySuggestion[] {
  const suggestions: RecoverySuggestion[] = [];

  // Finance actions
  if (action === 'create_invoice' || action === 'create_proposal') {
    if (data?.items?.length > 0) {
      suggestions.push({
        action: 'search_products',
        description: 'Search for the products first to verify they exist',
        data: { query: data.items[0]?.name || '' },
        confidence: 0.9,
      });
    }
  }

  if (action === 'update_invoice') {
    suggestions.push({
      action: 'list_invoices',
      description: 'List recent invoices to find the correct one',
      data: { limit: 10 },
      confidence: 0.85,
    });
  }

  if (action === 'convert_proposal_to_invoice') {
    suggestions.push({
      action: 'list_proposals',
      description: 'List proposals to find the one to convert',
      data: { status: 'draft', limit: 10 },
      confidence: 0.85,
    });
  }

  // Product actions
  if (action === 'update_product' || action === 'update_inventory') {
    suggestions.push({
      action: 'search_products',
      description: 'Search for the product first',
      data: { query: data?.name || data?.product_name || '' },
      confidence: 0.9,
    });
    suggestions.push({
      action: 'list_products',
      description: 'List all products to find the right one',
      data: { limit: 20 },
      confidence: 0.7,
    });
  }

  // CRM actions
  if (action === 'update_prospect') {
    suggestions.push({
      action: 'search_prospects',
      description: 'Search for the prospect first',
      data: { query: data?.name || data?.email || '' },
      confidence: 0.85,
    });
  }

  // Task actions
  if (action === 'update_task' || action === 'complete_task' || action === 'assign_task') {
    suggestions.push({
      action: 'list_tasks',
      description: 'List tasks to find the correct one',
      data: { limit: 10 },
      confidence: 0.85,
    });
  }

  return suggestions;
}

function getValidationSuggestions(action: string, data: any, error?: string): RecoverySuggestion[] {
  const suggestions: RecoverySuggestion[] = [];

  // Missing client name
  if (error?.includes('client_name')) {
    suggestions.push({
      action: 'search_prospects',
      description: 'Find the client in your CRM',
      data: {},
      confidence: 0.7,
    });
  }

  // Missing product info
  if (error?.includes('items') || error?.includes('product')) {
    suggestions.push({
      action: 'search_products',
      description: 'Search for products to add to the order',
      data: {},
      confidence: 0.8,
    });
  }

  // Invalid status
  if (error?.includes('status')) {
    if (action.includes('invoice')) {
      suggestions.push({
        action: 'update_invoice',
        description: 'Update invoice with valid status (draft, sent, paid, overdue, cancelled)',
        data: { ...data, status: 'draft' },
        confidence: 0.6,
      });
    }
  }

  return suggestions;
}

function getDuplicateSuggestions(action: string, data: any): RecoverySuggestion[] {
  const suggestions: RecoverySuggestion[] = [];

  if (action === 'create_product') {
    suggestions.push({
      action: 'search_products',
      description: 'This product might already exist - search for it',
      data: { query: data?.name || '' },
      confidence: 0.9,
    });
    suggestions.push({
      action: 'update_product',
      description: 'Update the existing product instead',
      data: data,
      confidence: 0.7,
    });
  }

  if (action === 'create_prospect') {
    suggestions.push({
      action: 'search_prospects',
      description: 'This prospect might already exist - search for them',
      data: { query: data?.email || data?.name || '' },
      confidence: 0.9,
    });
  }

  return suggestions;
}

function getDependencySuggestions(action: string, data: any): RecoverySuggestion[] {
  const suggestions: RecoverySuggestion[] = [];

  // Common dependencies
  if (action === 'create_invoice' || action === 'create_proposal') {
    suggestions.push({
      action: 'create_product',
      description: 'Create the product first, then try again',
      data: { name: data?.items?.[0]?.name },
      confidence: 0.6,
    });
  }

  if (action === 'assign_task') {
    suggestions.push({
      action: 'list_team_members',
      description: 'List team members to find valid assignees',
      data: {},
      confidence: 0.8,
    });
  }

  return suggestions;
}

function getGenericSuggestions(action: string, data: any): RecoverySuggestion[] {
  // Provide contextual suggestions based on action type
  const actionParts = action.split('_');
  const verb = actionParts[0];
  const noun = actionParts.slice(1).join('_');

  const suggestions: RecoverySuggestion[] = [];

  if (verb === 'update' || verb === 'delete' || verb === 'complete') {
    suggestions.push({
      action: `list_${noun}s`,
      description: `List ${noun}s to find the right one`,
      data: { limit: 10 },
      confidence: 0.7,
    });
  }

  return suggestions;
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Determine if an action should be retried and with what modifications
 */
export function shouldRetryAction(context: RecoveryContext): {
  retry: boolean;
  delay: number;
  modifiedData?: any;
  reason?: string;
} {
  const { action, data, error, attemptNumber } = context;
  const category = classifyError(error.error, action);

  // Max 3 attempts for most errors
  if (attemptNumber >= 3) {
    return { retry: false, delay: 0, reason: 'Maximum retry attempts reached' };
  }

  // Rate limit - retry with exponential backoff
  if (category === 'rate_limit') {
    return {
      retry: true,
      delay: Math.pow(2, attemptNumber) * 1000, // 2s, 4s, 8s
      reason: 'Rate limited, waiting before retry',
    };
  }

  // Network/server errors - retry once
  if (category === 'network' || category === 'internal') {
    if (attemptNumber < 2) {
      return {
        retry: true,
        delay: 1000,
        reason: 'Temporary error, retrying',
      };
    }
  }

  // Validation errors with fixable issues
  if (category === 'validation' && attemptNumber < 2) {
    const fixed = attemptAutoFix(action, data, error.error);
    if (fixed) {
      return {
        retry: true,
        delay: 0,
        modifiedData: fixed,
        reason: 'Auto-fixed validation issue',
      };
    }
  }

  return { retry: false, delay: 0 };
}

/**
 * Attempt to automatically fix common validation issues
 */
function attemptAutoFix(action: string, data: any, error?: string): any | null {
  if (!error) return null;
  const errorLower = error.toLowerCase();

  // Fix missing tax_percent (default 21% for Netherlands)
  if (errorLower.includes('tax') && (action === 'create_invoice' || action === 'create_proposal')) {
    if (!data.tax_percent) {
      return { ...data, tax_percent: 21 };
    }
  }

  // Fix invalid status values
  if (errorLower.includes('status')) {
    const validStatuses: Record<string, string[]> = {
      invoice: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      proposal: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      task: ['pending', 'in_progress', 'complete', 'cancelled'],
      prospect: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
    };

    for (const [entity, statuses] of Object.entries(validStatuses)) {
      if (action.includes(entity) && data.status && !statuses.includes(data.status)) {
        return { ...data, status: statuses[0] };
      }
    }
  }

  // Fix date format issues
  if (errorLower.includes('date') && data.date) {
    try {
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) {
        return { ...data, date: d.toISOString().split('T')[0] };
      }
    } catch {
      // Can't fix
    }
  }

  return null;
}

// ============================================================================
// User-Friendly Messages
// ============================================================================

/**
 * Generate a user-friendly error message with actionable next steps
 */
export function generateUserMessage(context: RecoveryContext): string {
  const { action, data, error } = context;
  const category = classifyError(error.error, action);
  const suggestions = getRecoverySuggestions(context);

  let message = '';

  // Category-specific messages
  switch (category) {
    case 'not_found':
      message = `I couldn't find what you're looking for. ${getNotFoundExplanation(action, data)}`;
      break;
    case 'validation':
      message = `There's an issue with the information provided. ${error.message}`;
      break;
    case 'permission':
      message = "You don't have permission to perform this action. Please check with your administrator.";
      break;
    case 'duplicate':
      message = `This ${getEntityName(action)} already exists. Would you like me to update it instead?`;
      break;
    case 'dependency':
      message = `I can't complete this because a required item is missing. ${getDependencyExplanation(action, data)}`;
      break;
    case 'rate_limit':
      message = "I'm receiving too many requests right now. I'll try again in a moment.";
      break;
    case 'network':
    case 'internal':
      message = "I'm experiencing a temporary issue. Let me try that again.";
      break;
    default:
      message = error.message || "I encountered an unexpected issue. Let me suggest some alternatives.";
  }

  // Add suggestions if available
  if (suggestions.length > 0) {
    message += '\n\nHere\'s what we can do:\n';
    suggestions.slice(0, 3).forEach((s, i) => {
      message += `${i + 1}. ${s.description}\n`;
    });
  }

  return message;
}

function getNotFoundExplanation(action: string, data: any): string {
  if (action === 'create_invoice' || action === 'create_proposal') {
    const itemNames = data?.items?.map((i: any) => i.name).join(', ');
    if (itemNames) {
      return `I couldn't find products matching: ${itemNames}. Let me search for similar products.`;
    }
  }
  if (action === 'update_invoice') {
    return 'The invoice you mentioned doesn\'t exist or may have been deleted.';
  }
  if (action === 'update_product') {
    return `I couldn't find a product called "${data?.name || 'that'}".`;
  }
  return 'The item you referenced doesn\'t seem to exist in the system.';
}

function getDependencyExplanation(action: string, data: any): string {
  if (action === 'create_invoice' || action === 'create_proposal') {
    return 'One or more products need to be created first.';
  }
  if (action === 'assign_task') {
    return 'The team member you\'re trying to assign to doesn\'t exist.';
  }
  return 'A required related item is missing.';
}

function getEntityName(action: string): string {
  if (action.includes('product')) return 'product';
  if (action.includes('invoice')) return 'invoice';
  if (action.includes('proposal')) return 'proposal';
  if (action.includes('prospect')) return 'prospect';
  if (action.includes('task')) return 'task';
  if (action.includes('expense')) return 'expense';
  if (action.includes('campaign')) return 'campaign';
  if (action.includes('team')) return 'team';
  return 'item';
}

// ============================================================================
// Main Recovery Handler
// ============================================================================

/**
 * Process a failed action and return recovery options
 */
export async function handleActionFailure(
  action: string,
  data: any,
  error: ActionResult,
  ctx: ActionContext,
  attemptNumber: number = 1
): Promise<RecoveryResult> {
  const context: RecoveryContext = {
    action,
    data,
    error,
    attemptNumber,
    ctx,
  };

  // Check if we should retry
  const retryInfo = shouldRetryAction(context);

  // Get suggestions
  const suggestions = getRecoverySuggestions(context);

  // Generate user-friendly message
  const userMessage = generateUserMessage(context);

  return {
    shouldRetry: retryInfo.retry,
    retryWithData: retryInfo.modifiedData,
    suggestions,
    userMessage,
  };
}

/**
 * Execute action with automatic retry and recovery
 */
export async function executeWithRecovery(
  executeAction: (action: string, data: any, ctx: ActionContext) => Promise<ActionResult>,
  action: string,
  data: any,
  ctx: ActionContext,
  maxAttempts: number = 3
): Promise<ActionResult & { recovery?: RecoveryResult }> {
  let lastError: ActionResult | null = null;
  let currentData = data;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await executeAction(action, currentData, ctx);

    if (result.success) {
      return result;
    }

    lastError = result;

    // Get recovery info
    const recovery = await handleActionFailure(action, currentData, result, ctx, attempt);

    // If we should retry
    if (recovery.shouldRetry && attempt < maxAttempts) {
      if (recovery.retryWithData) {
        currentData = recovery.retryWithData;
      }
      // Wait if there's a delay
      const retryInfo = shouldRetryAction({
        action,
        data: currentData,
        error: result,
        attemptNumber: attempt,
        ctx,
      });
      if (retryInfo.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryInfo.delay));
      }
      continue;
    }

    // Return error with recovery info
    return {
      ...result,
      message: recovery.userMessage,
      recovery,
    };
  }

  // Should not reach here, but just in case
  return lastError || {
    success: false,
    message: 'An unexpected error occurred after multiple retry attempts.',
    error: 'Max retries exceeded',
  };
}
