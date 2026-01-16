/**
 * Action Chaining System for SYNC
 *
 * Enables multi-step action execution:
 * - Sequential action chains
 * - Parallel action execution
 * - Dependency resolution between actions
 * - Partial success handling
 * - Rollback on failure (where possible)
 */

import {
  ActionResult,
  ActionContext,
  ChainedAction,
  ActionChainResult,
} from './types.ts';
import { handleActionFailure } from './recovery.ts';

// ============================================================================
// Types
// ============================================================================

export interface ActionChain {
  id: string;
  actions: ChainedAction[];
  strategy: 'sequential' | 'parallel' | 'smart';  // smart = parallel where possible
  stopOnError: boolean;
  description?: string;
}

export interface ChainExecutionContext {
  ctx: ActionContext;
  executeAction: (action: string, data: any) => Promise<ActionResult>;
  results: Map<string, ActionResult>;  // id -> result for dependency injection
}

// ============================================================================
// Chain Parsing
// ============================================================================

/**
 * Parse [ACTION_CHAIN] blocks from LLM response
 */
export function parseActionChain(response: string): ActionChain | null {
  const chainMatch = response.match(/\[ACTION_CHAIN\]([\s\S]*?)\[\/ACTION_CHAIN\]/);
  if (!chainMatch) return null;

  try {
    const parsed = JSON.parse(chainMatch[1].trim());

    // Handle array format (simple chain)
    if (Array.isArray(parsed)) {
      return {
        id: `chain_${Date.now()}`,
        actions: parsed.map((a, i) => ({
          ...a,
          id: a.id || `action_${i}`,
        })),
        strategy: 'sequential',
        stopOnError: true,
      };
    }

    // Handle object format (with metadata)
    return {
      id: parsed.id || `chain_${Date.now()}`,
      actions: (parsed.actions || []).map((a: any, i: number) => ({
        ...a,
        id: a.id || `action_${i}`,
      })),
      strategy: parsed.strategy || 'sequential',
      stopOnError: parsed.stopOnError !== false,
      description: parsed.description,
    };
  } catch {
    return null;
  }
}

/**
 * Also support inline chaining like:
 * [ACTION]...[/ACTION] -> [ACTION]...[/ACTION]
 */
export function parseMultipleActions(response: string): ChainedAction[] {
  const actionMatches = response.matchAll(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/g);
  const actions: ChainedAction[] = [];

  let index = 0;
  for (const match of actionMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      actions.push({
        action: parsed.action,
        data: parsed.data,
        id: `action_${index}`,
      });
      index++;
    } catch {
      // Skip invalid actions
    }
  }

  return actions;
}

// ============================================================================
// Dependency Resolution
// ============================================================================

/**
 * Resolve action dependencies and determine execution order
 */
export function resolveDependencies(actions: ChainedAction[]): ChainedAction[][] {
  // Create dependency graph
  const graph = new Map<string, Set<string>>();
  const actionMap = new Map<string, ChainedAction>();

  for (const action of actions) {
    const id = action.id || `action_${actions.indexOf(action)}`;
    actionMap.set(id, action);
    graph.set(id, new Set(action.dependsOn || []));
  }

  // Topological sort into layers
  const layers: ChainedAction[][] = [];
  const completed = new Set<string>();

  while (completed.size < actions.length) {
    const layer: ChainedAction[] = [];

    for (const [id, deps] of graph) {
      if (completed.has(id)) continue;

      // Check if all dependencies are completed
      const allDepsComplete = [...deps].every(d => completed.has(d));
      if (allDepsComplete) {
        layer.push(actionMap.get(id)!);
      }
    }

    if (layer.length === 0 && completed.size < actions.length) {
      // Circular dependency detected - break and run remaining sequentially
      for (const [id] of graph) {
        if (!completed.has(id)) {
          layer.push(actionMap.get(id)!);
          break;
        }
      }
    }

    for (const action of layer) {
      completed.add(action.id || `action_${actions.indexOf(action)}`);
    }

    if (layer.length > 0) {
      layers.push(layer);
    }
  }

  return layers;
}

// ============================================================================
// Data Injection
// ============================================================================

/**
 * Inject results from previous actions into current action data
 * Supports template syntax: {{action_id.field}}
 */
export function injectDependencyResults(
  action: ChainedAction,
  results: Map<string, ActionResult>
): ChainedAction {
  if (!action.dependsOn || action.dependsOn.length === 0) {
    return action;
  }

  let dataStr = JSON.stringify(action.data);

  // Replace {{id.path}} patterns with actual results
  const templateRegex = /\{\{(\w+)\.([^}]+)\}\}/g;
  dataStr = dataStr.replace(templateRegex, (match, id, path) => {
    const result = results.get(id);
    if (!result || !result.result) return match;

    // Navigate path in result
    const pathParts = path.split('.');
    let value: any = result.result;
    for (const part of pathParts) {
      value = value?.[part];
      if (value === undefined) return match;
    }

    // Return as JSON-safe string
    return typeof value === 'string' ? value : JSON.stringify(value);
  });

  try {
    return {
      ...action,
      data: JSON.parse(dataStr),
    };
  } catch {
    return action;
  }
}

// ============================================================================
// Chain Execution
// ============================================================================

/**
 * Execute a chain of actions with the specified strategy
 */
export async function executeActionChain(
  chain: ActionChain,
  ctx: ActionContext,
  executeAction: (action: { action: string; data: any }, companyId: string, userId?: string) => Promise<ActionResult>
): Promise<ActionChainResult> {
  const results: Map<string, ActionResult> = new Map();
  const completed: Array<{ action: string; result: ActionResult }> = [];
  let failedAction: { action: string; result: ActionResult; index: number } | undefined;

  // Determine execution order based on strategy
  let executionLayers: ChainedAction[][];

  if (chain.strategy === 'parallel') {
    // All actions in one layer (parallel)
    executionLayers = [chain.actions];
  } else if (chain.strategy === 'smart') {
    // Use dependency resolution
    executionLayers = resolveDependencies(chain.actions);
  } else {
    // Sequential: each action is its own layer
    executionLayers = chain.actions.map(a => [a]);
  }

  // Execute layer by layer
  for (let layerIndex = 0; layerIndex < executionLayers.length; layerIndex++) {
    const layer = executionLayers[layerIndex];

    // Execute all actions in this layer in parallel
    const layerPromises = layer.map(async (action) => {
      // Inject dependency results
      const injectedAction = injectDependencyResults(action, results);

      // Execute
      const result = await executeAction(
        { action: injectedAction.action, data: injectedAction.data },
        ctx.companyId,
        ctx.userId
      );

      return { action, result };
    });

    const layerResults = await Promise.all(layerPromises);

    // Process results
    for (const { action, result } of layerResults) {
      const actionId = action.id || `action_${chain.actions.indexOf(action)}`;
      results.set(actionId, result);

      if (result.success) {
        completed.push({ action: action.action, result });
      } else {
        const index = chain.actions.indexOf(action);

        // Handle failure with recovery
        const recovery = await handleActionFailure(
          action.action,
          action.data,
          result,
          ctx
        );

        failedAction = {
          action: action.action,
          result: { ...result, message: recovery.userMessage, recovery },
          index,
        };

        if (chain.stopOnError) {
          // Return partial success
          return buildChainResult(completed, failedAction, chain);
        }
      }
    }
  }

  return buildChainResult(completed, failedAction, chain);
}

function buildChainResult(
  completed: Array<{ action: string; result: ActionResult }>,
  failed: { action: string; result: ActionResult; index: number } | undefined,
  chain: ActionChain
): ActionChainResult {
  const success = !failed || completed.length === chain.actions.length;

  // Check if any action found data (has results)
  const hasDataResults = completed.some(c => {
    const result = c.result.result;
    return Array.isArray(result) ? result.length > 0 : result && typeof result === 'object';
  });

  // Build message
  let message = '';

  if (success) {
    // Filter out "No X found" messages if other actions found data
    const messages = completed
      .filter(c => {
        const isEmptyResultMsg = /^No \w+ found/i.test(c.result.message);
        return !(isEmptyResultMsg && hasDataResults);
      })
      .map(c => c.result.message);

    if (messages.length > 0) {
      message = messages.join('\n\n');
    } else {
      message = `Completed ${completed.length} action(s).`;
    }
  } else {
    message = '';
    if (completed.length > 0) {
      message += `Completed ${completed.length} action(s):\n`;
      completed.forEach((c, i) => {
        message += `${i + 1}. ${c.action}: ✓\n`;
      });
      message += '\n';
    }
    if (failed) {
      message += `Failed on: ${failed.action}\n${failed.result.message}`;
    }
  }

  return {
    success,
    completed,
    failed,
    partialResults: completed.map(c => c.result.result),
    message,
  };
}

// ============================================================================
// Common Chain Templates
// ============================================================================

/**
 * Pre-built chain templates for common multi-step operations
 */
export const CHAIN_TEMPLATES = {
  // Create invoice and send it
  create_and_send_invoice: (data: any): ActionChain => ({
    id: 'create_send_invoice',
    actions: [
      {
        id: 'create',
        action: 'create_invoice',
        data: { ...data, status: 'draft' },
      },
      {
        id: 'send',
        action: 'update_invoice',
        data: {
          id: '{{create.id}}',
          status: 'sent',
        },
        dependsOn: ['create'],
      },
    ],
    strategy: 'smart',
    stopOnError: true,
    description: 'Create and send invoice',
  }),

  // Create product and update inventory
  create_product_with_stock: (data: any): ActionChain => ({
    id: 'create_product_stock',
    actions: [
      {
        id: 'create',
        action: 'create_product',
        data: data,
      },
      {
        id: 'inventory',
        action: 'update_inventory',
        data: {
          product_id: '{{create.id}}',
          quantity: data.initial_quantity || 0,
          adjustment_type: 'set',
        },
        dependsOn: ['create'],
      },
    ],
    strategy: 'smart',
    stopOnError: true,
    description: 'Create product with initial inventory',
  }),

  // Create prospect and add to campaign
  create_prospect_and_campaign: (prospectData: any, campaignId: string): ActionChain => ({
    id: 'prospect_campaign',
    actions: [
      {
        id: 'prospect',
        action: 'create_prospect',
        data: prospectData,
      },
      {
        id: 'add_to_campaign',
        action: 'update_campaign',
        data: {
          campaign_id: campaignId,
          add_prospects: ['{{prospect.id}}'],
        },
        dependsOn: ['prospect'],
      },
    ],
    strategy: 'smart',
    stopOnError: false,  // Continue even if campaign add fails
    description: 'Create prospect and add to campaign',
  }),

  // Create task and assign
  create_and_assign_task: (taskData: any, assigneeId: string): ActionChain => ({
    id: 'create_assign_task',
    actions: [
      {
        id: 'create',
        action: 'create_task',
        data: taskData,
      },
      {
        id: 'assign',
        action: 'assign_task',
        data: {
          task_id: '{{create.id}}',
          assignee_id: assigneeId,
        },
        dependsOn: ['create'],
      },
    ],
    strategy: 'smart',
    stopOnError: true,
    description: 'Create and assign task',
  }),
};

// ============================================================================
// Chain Detection
// ============================================================================

/**
 * Detect if a user request implies multiple actions
 */
export function detectChainIntent(message: string): {
  isChain: boolean;
  chainType?: keyof typeof CHAIN_TEMPLATES;
  actions?: string[];
} {
  const lowerMsg = message.toLowerCase();

  // Look for "and" patterns indicating chained actions
  const andPatterns = [
    /create\s+.+\s+and\s+send/i,         // create X and send
    /make\s+.+\s+and\s+send/i,           // make X and send
    /add\s+.+\s+and\s+assign/i,          // add X and assign
    /create\s+.+\s+then\s+/i,            // create X then Y
    /first\s+.+\s+then\s+/i,             // first X then Y
    /after\s+creating\s+.+\s+/i,         // after creating X
  ];

  for (const pattern of andPatterns) {
    if (pattern.test(message)) {
      // Determine chain type based on context
      if (lowerMsg.includes('invoice') && lowerMsg.includes('send')) {
        return { isChain: true, chainType: 'create_and_send_invoice' };
      }
      if (lowerMsg.includes('task') && lowerMsg.includes('assign')) {
        return { isChain: true, chainType: 'create_and_assign_task' };
      }
      if (lowerMsg.includes('product') && (lowerMsg.includes('stock') || lowerMsg.includes('inventory'))) {
        return { isChain: true, chainType: 'create_product_with_stock' };
      }
      if (lowerMsg.includes('prospect') && lowerMsg.includes('campaign')) {
        return { isChain: true, chainType: 'create_prospect_and_campaign' };
      }

      // Generic chain detected
      return { isChain: true };
    }
  }

  // Check for explicit "both" or "all" requests
  if (/\b(both|all)\b/i.test(message) && /\b(and|,)\b/.test(message)) {
    return { isChain: true };
  }

  return { isChain: false };
}
