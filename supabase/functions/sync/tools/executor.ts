/**
 * SYNC Task Executor
 *
 * Executes task plans step-by-step with progress streaming,
 * error recovery, and adaptive replanning.
 */

import { ActionContext, ActionResult } from './types.ts';
import { TaskPlan, TaskStep } from './planner.ts';

// =============================================================================
// Types
// =============================================================================

export type ProgressUpdateType =
  | 'plan_start'
  | 'step_start'
  | 'step_progress'
  | 'step_complete'
  | 'step_failed'
  | 'step_skipped'
  | 'checkpoint'
  | 'needs_input'
  | 'plan_complete'
  | 'plan_failed'
  | 'replanning';

export interface ProgressUpdate {
  type: ProgressUpdateType;
  planId: string;
  stepId?: string;
  stepIndex?: number;
  totalSteps?: number;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface ExecutionResult {
  success: boolean;
  status: 'completed' | 'paused' | 'failed' | 'needs_input';
  plan: TaskPlan;
  results: Record<string, any>;
  summary: string;
  nextSteps?: string[];
  error?: string;
  waitingFor?: string; // Step ID if paused
}

export interface ExecutionContext {
  ctx: ActionContext;
  executeAction: (actionName: string, data: any, ctx: ActionContext) => Promise<ActionResult>;
  onProgress: (update: ProgressUpdate) => void;
  shouldContinue: () => boolean; // For cancellation
}

// =============================================================================
// Main Executor
// =============================================================================

export async function executePlan(
  plan: TaskPlan,
  execCtx: ExecutionContext
): Promise<ExecutionResult> {
  const { ctx, executeAction, onProgress, shouldContinue } = execCtx;
  const results: Record<string, any> = {};

  // Emit plan start
  onProgress({
    type: 'plan_start',
    planId: plan.id,
    totalSteps: plan.steps.length,
    message: `Starting: ${plan.goal}`,
    timestamp: new Date(),
  });

  plan.status = 'executing';

  // Execute steps in order, respecting dependencies
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    // Check for cancellation
    if (!shouldContinue()) {
      plan.status = 'paused';
      return {
        success: false,
        status: 'paused',
        plan,
        results,
        summary: 'Execution paused by user',
      };
    }

    // Check dependencies
    if (!areDependenciesMet(step, plan)) {
      step.status = 'skipped';
      onProgress({
        type: 'step_skipped',
        planId: plan.id,
        stepId: step.id,
        stepIndex: i,
        totalSteps: plan.steps.length,
        message: `Skipped: ${step.description} (dependencies not met)`,
        timestamp: new Date(),
      });
      continue;
    }

    // Check for checkpoint - pause for confirmation on important steps
    if (step.isCheckpoint && i > 0) {
      plan.status = 'paused';
      plan.currentStep = i;
      onProgress({
        type: 'checkpoint',
        planId: plan.id,
        stepId: step.id,
        stepIndex: i,
        totalSteps: plan.steps.length,
        message: `About to: ${step.description}. Continue?`,
        timestamp: new Date(),
      });
      return {
        success: true,
        status: 'paused',
        plan,
        results,
        summary: `Paused before: ${step.description}`,
        waitingFor: step.id,
      };
    }

    // Execute the step
    const stepResult = await executeStep(step, plan, results, execCtx);

    if (stepResult.success) {
      step.status = 'completed';
      step.result = stepResult.data;
      results[step.id] = stepResult.data;
      plan.completedSteps++;

      onProgress({
        type: 'step_complete',
        planId: plan.id,
        stepId: step.id,
        stepIndex: i,
        totalSteps: plan.steps.length,
        message: injectTemplateValues(step.completionMessage, results, step.id),
        data: stepResult.data,
        timestamp: new Date(),
      });

    } else {
      step.status = 'failed';
      step.error = stepResult.error;

      onProgress({
        type: 'step_failed',
        planId: plan.id,
        stepId: step.id,
        stepIndex: i,
        totalSteps: plan.steps.length,
        message: injectTemplateValues(step.failureMessage, results, step.id),
        data: { error: stepResult.error },
        timestamp: new Date(),
      });

      // Try to recover
      const recovery = await attemptRecovery(step, stepResult, plan, execCtx);

      if (recovery.recovered) {
        step.status = 'completed';
        step.result = recovery.result;
        results[step.id] = recovery.result;
        plan.completedSteps++;

        onProgress({
          type: 'step_complete',
          planId: plan.id,
          stepId: step.id,
          stepIndex: i,
          totalSteps: plan.steps.length,
          message: `Recovered! ${injectTemplateValues(step.completionMessage, results, step.id)}`,
          data: recovery.result,
          timestamp: new Date(),
        });

      } else if (recovery.needsInput) {
        plan.status = 'paused';
        plan.currentStep = i;
        onProgress({
          type: 'needs_input',
          planId: plan.id,
          stepId: step.id,
          stepIndex: i,
          totalSteps: plan.steps.length,
          message: recovery.question || 'Need more information to continue.',
          timestamp: new Date(),
        });
        return {
          success: false,
          status: 'needs_input',
          plan,
          results,
          summary: recovery.question || 'Waiting for user input',
          waitingFor: step.id,
        };

      } else {
        // Unrecoverable failure
        plan.status = 'failed';
        onProgress({
          type: 'plan_failed',
          planId: plan.id,
          stepId: step.id,
          message: `Failed at step ${i + 1}: ${stepResult.error}`,
          timestamp: new Date(),
        });
        return {
          success: false,
          status: 'failed',
          plan,
          results,
          summary: `Failed: ${stepResult.error}`,
          error: stepResult.error,
        };
      }
    }
  }

  // All steps completed
  plan.status = 'completed';
  plan.completedAt = new Date();

  const summary = generateSummary(plan, results);

  onProgress({
    type: 'plan_complete',
    planId: plan.id,
    totalSteps: plan.steps.length,
    message: summary,
    data: results,
    timestamp: new Date(),
  });

  return {
    success: true,
    status: 'completed',
    plan,
    results,
    summary,
    nextSteps: suggestNextSteps(plan, results),
  };
}

// =============================================================================
// Result Wrapper for Templates
// =============================================================================

/**
 * Wraps action results with useful template-accessible properties
 * Makes {{result.count}}, {{result.total}}, {{result.first.name}} etc. work
 */
function wrapResultForTemplates(rawData: any, fullResult: any): any {
  // If already an object with useful properties, enhance it
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    return {
      ...rawData,
      // Add count if not present (for single item results)
      count: rawData.count ?? 1,
      // Preserve message for templates
      message: fullResult.message,
    };
  }

  // If it's an array, wrap with useful properties
  if (Array.isArray(rawData)) {
    return {
      items: rawData,
      count: rawData.length,
      total: rawData.length,
      first: rawData[0] || null,
      last: rawData[rawData.length - 1] || null,
      // Also make array indexable directly: {{result[0].name}}
      ...rawData.reduce((acc: any, item: any, idx: number) => {
        acc[idx] = item;
        return acc;
      }, {}),
      // Preserve message for templates
      message: fullResult.message,
    };
  }

  // Primitive value - wrap in object
  return {
    value: rawData,
    count: rawData ? 1 : 0,
    message: fullResult.message,
  };
}

// =============================================================================
// Step Execution
// =============================================================================

interface StepExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

async function executeStep(
  step: TaskStep,
  plan: TaskPlan,
  previousResults: Record<string, any>,
  execCtx: ExecutionContext
): Promise<StepExecutionResult> {
  const { ctx, executeAction, onProgress } = execCtx;

  // Announce step start
  onProgress({
    type: 'step_start',
    planId: plan.id,
    stepId: step.id,
    stepIndex: step.index,
    totalSteps: plan.steps.length,
    message: injectTemplateValues(step.announcement, previousResults, step.id),
    timestamp: new Date(),
  });

  step.status = 'running';
  const startTime = Date.now();

  try {
    // Build inputs by resolving templates
    const resolvedInputs = resolveInputs(step, previousResults);

    // Execute the action
    const result = await executeAction(step.action, resolvedInputs, ctx);

    step.executionTimeMs = Date.now() - startTime;

    if (result.success) {
      // Wrap result with useful template properties
      const rawData = result.result || result;
      const wrappedData = wrapResultForTemplates(rawData, result);
      return {
        success: true,
        data: wrappedData,
      };
    } else {
      return {
        success: false,
        error: result.error || result.message || 'Unknown error',
      };
    }

  } catch (error) {
    step.executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    };
  }
}

// =============================================================================
// Input Resolution
// =============================================================================

function resolveInputs(step: TaskStep, previousResults: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = { ...step.inputs };

  // Resolve template values
  for (const [key, template] of Object.entries(step.inputTemplates)) {
    resolved[key] = injectTemplateValues(template, previousResults, step.id);
  }

  return resolved;
}

export function injectTemplateValues(
  template: string,
  results: Record<string, any>,
  currentStepId?: string
): string {
  if (!template) return template;

  // Pattern: {{step_id.field.nested_field}} or {{result.field}}
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    try {
      const parts = path.trim().split('.');
      let value: any;

      if (parts[0] === 'result' && currentStepId) {
        // Reference to current step's result
        value = results[currentStepId];
        parts.shift(); // Remove 'result'
      } else {
        // Reference to another step's result
        value = results[parts[0]];
        parts.shift(); // Remove step_id
      }

      // Navigate nested path
      for (const part of parts) {
        if (part === 'result') continue; // Skip 'result' in path
        if (value === undefined || value === null) break;

        // Handle array indexing like items[0]
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          value = value[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
        } else {
          value = value[part];
        }
      }

      return value !== undefined ? String(value) : match;
    } catch {
      return match;
    }
  });
}

// =============================================================================
// Dependency Checking
// =============================================================================

function areDependenciesMet(step: TaskStep, plan: TaskPlan): boolean {
  if (!step.dependsOn || step.dependsOn.length === 0) {
    return true;
  }

  for (const depId of step.dependsOn) {
    const depStep = plan.steps.find(s => s.id === depId);
    if (!depStep || depStep.status !== 'completed') {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Error Recovery
// =============================================================================

interface RecoveryResult {
  recovered: boolean;
  result?: any;
  needsInput: boolean;
  question?: string;
}

async function attemptRecovery(
  step: TaskStep,
  failedResult: StepExecutionResult,
  plan: TaskPlan,
  execCtx: ExecutionContext
): Promise<RecoveryResult> {
  const { executeAction, ctx } = execCtx;

  // Check if we can retry
  if (step.retryCount < step.maxRetries) {
    step.retryCount++;

    // Wait before retry (exponential backoff)
    await delay(Math.pow(2, step.retryCount) * 500);

    // Retry with same inputs
    const retryResult = await executeAction(step.action, step.inputs, ctx);

    if (retryResult.success) {
      return {
        recovered: true,
        result: retryResult.result,
        needsInput: false,
      };
    }
  }

  // Try fallback action if available
  if (step.fallbackAction) {
    const fallbackResult = await executeAction(step.fallbackAction, step.inputs, ctx);

    if (fallbackResult.success) {
      return {
        recovered: true,
        result: fallbackResult.result,
        needsInput: false,
      };
    }
  }

  // Analyze the error to determine if we need user input
  const errorLower = (failedResult.error || '').toLowerCase();

  if (errorLower.includes('not found') || errorLower.includes('no results')) {
    return {
      recovered: false,
      needsInput: true,
      question: `I couldn't find what I was looking for. Can you give me more details?`,
    };
  }

  if (errorLower.includes('permission') || errorLower.includes('access')) {
    return {
      recovered: false,
      needsInput: true,
      question: `I don't have permission to do that. Can you check the integration settings?`,
    };
  }

  if (errorLower.includes('missing') || errorLower.includes('required')) {
    return {
      recovered: false,
      needsInput: true,
      question: `I'm missing some required information. Can you provide more details?`,
    };
  }

  // Generic failure
  return {
    recovered: false,
    needsInput: false,
  };
}

// =============================================================================
// Summary Generation
// =============================================================================

function generateSummary(plan: TaskPlan, results: Record<string, any>): string {
  const completedSteps = plan.steps.filter(s => s.status === 'completed');
  const summaryParts: string[] = [];

  summaryParts.push(`All done! Here's what I did:\n`);

  for (const step of completedSteps) {
    const result = results[step.id];
    const shortSummary = getStepSummary(step, result);
    summaryParts.push(`- ${shortSummary}`);
  }

  return summaryParts.join('\n');
}

function getStepSummary(step: TaskStep, result: any): string {
  if (!result) return step.description;

  // Customize based on action type
  switch (step.action) {
    case 'search_prospects':
      return `Found ${result.name || 'client'}${result.company ? ` at ${result.company}` : ''}`;

    case 'search_products':
      return `Found ${result.name || 'product'}${result.price ? ` (${result.price})` : ''}`;

    case 'create_proposal':
      return `Created proposal ${result.proposal_number || '#' + result.id}`;

    case 'create_invoice':
      return `Created invoice ${result.invoice_number || '#' + result.id}`;

    case 'send_email':
      return `Sent email to ${result.to || 'recipient'}`;

    case 'create_task':
      return `Created task: ${result.title || step.description}`;

    case 'create_calendar_event':
      return `Scheduled: ${result.title || 'event'}`;

    default:
      return step.description;
  }
}

function suggestNextSteps(plan: TaskPlan, results: Record<string, any>): string[] {
  const suggestions: string[] = [];

  // Based on what was accomplished, suggest follow-ups
  const actions = plan.steps.map(s => s.action);

  if (actions.includes('create_proposal')) {
    suggestions.push('Would you like me to follow up on this proposal later?');
  }

  if (actions.includes('create_invoice')) {
    suggestions.push('Should I set a reminder for payment follow-up?');
  }

  if (actions.includes('search_products') && !actions.includes('create_proposal')) {
    suggestions.push('Want me to create a proposal with these products?');
  }

  return suggestions;
}

// =============================================================================
// Resume Execution
// =============================================================================

export async function resumePlan(
  plan: TaskPlan,
  userInput: string,
  execCtx: ExecutionContext
): Promise<ExecutionResult> {
  // Find where we paused
  const pausedStep = plan.steps[plan.currentStep];

  if (!pausedStep) {
    return {
      success: false,
      status: 'failed',
      plan,
      results: {},
      summary: 'Could not find paused step',
      error: 'Invalid plan state',
    };
  }

  // Update the step with user input
  if (pausedStep.status === 'failed' || plan.status === 'paused') {
    // User confirmed to continue or provided new input
    if (userInput.toLowerCase().includes('yes') ||
        userInput.toLowerCase().includes('continue') ||
        userInput.toLowerCase().includes('proceed')) {
      // Continue from current step
      plan.status = 'executing';
      return executePlan(plan, execCtx);
    }

    if (userInput.toLowerCase().includes('no') ||
        userInput.toLowerCase().includes('cancel') ||
        userInput.toLowerCase().includes('stop')) {
      plan.status = 'failed';
      return {
        success: false,
        status: 'failed',
        plan,
        results: {},
        summary: 'Cancelled by user',
      };
    }

    // User provided new input - update step inputs and retry
    pausedStep.inputs = { ...pausedStep.inputs, userInput };
    pausedStep.status = 'pending';
    pausedStep.retryCount = 0;
    plan.status = 'executing';

    return executePlan(plan, execCtx);
  }

  // Default: continue execution
  plan.status = 'executing';
  return executePlan(plan, execCtx);
}

// =============================================================================
// Utilities
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Progress Formatter
// =============================================================================

export function formatProgressUpdate(update: ProgressUpdate): string {
  const icons: Record<ProgressUpdateType, string> = {
    plan_start: '🚀',
    step_start: '⏳',
    step_progress: '⚙️',
    step_complete: '✓',
    step_failed: '✗',
    step_skipped: '⊘',
    checkpoint: '⚠️',
    needs_input: '❓',
    plan_complete: '🎉',
    plan_failed: '❌',
    replanning: '🔄',
  };

  const icon = icons[update.type] || '•';
  return `${icon} ${update.message}`;
}

export function formatProgressForStream(updates: ProgressUpdate[]): string {
  return updates.map(formatProgressUpdate).join('\n');
}
