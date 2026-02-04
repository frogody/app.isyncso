/**
 * Flow Execution Engine - Orchestrates RAG-Powered Outreach Flows
 *
 * This engine executes outreach flows node-by-node, integrating with:
 * - contextBuilder: Assembles RAG context for each AI node
 * - agentTools: Provides tools for Claude to use during execution
 * - Supabase: Persists execution state and logs
 *
 * Flow execution is asynchronous and supports:
 * - Pause/resume for timers and manual intervention
 * - Parallel path execution
 * - Variable interpolation between nodes
 * - Retry logic for transient failures
 */

import { buildContext, formatContextForClaude, trimContextToFit } from './contextBuilder';
import { AGENT_TOOLS, executeToolCall, getToolsForNodeType } from './agentTools';
import { supabase, functions } from '@/api/supabaseClient';
import {
  scheduleTimer,
  scheduleEmail,
  scheduleLinkedIn,
  scheduleSMS,
  scheduleFollowUp,
  cancelExecutionJobs
} from './queueService';
import flowMetrics from './metrics';

// ============================================================================
// Constants
// ============================================================================

const MAX_TOOL_ITERATIONS = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const AI_TIMEOUT_MS = 60000; // 60 seconds
const MAX_CONTEXT_SIZE = 500000; // 500KB max context
const MAX_NODES_IN_CONTEXT = 10; // Keep last 10 node outputs

// ============================================================================
// Execution Cache (prevents N+1 queries)
// ============================================================================

const executionCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCachedExecution(executionId) {
  const cached = executionCache.get(executionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  executionCache.delete(executionId);
  return null;
}

function setCachedExecution(executionId, data) {
  executionCache.set(executionId, { data, timestamp: Date.now() });
}

function invalidateExecutionCache(executionId) {
  executionCache.delete(executionId);
}

// ============================================================================
// Timeout Helper
// ============================================================================

async function withTimeout(promise, timeoutMs, errorMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Context Size Management
// ============================================================================

function pruneContext(context) {
  const contextJson = JSON.stringify(context);

  if (contextJson.length <= MAX_CONTEXT_SIZE) {
    return context;
  }

  console.warn(`[flowEngine] Context size ${contextJson.length} exceeded ${MAX_CONTEXT_SIZE}, pruning`);

  // Keep only essential fields and last N node outputs
  const nodeOutputKeys = Object.keys(context)
    .filter(k => k.startsWith('node_') || k.match(/^[a-f0-9-]+$/))
    .slice(-MAX_NODES_IN_CONTEXT);

  const prunedContext = {
    prospect: context.prospect,
    company: context.company,
    flow_id: context.flow_id,
    execution_id: context.execution_id,
    last_node: context.last_node,
    last_node_type: context.last_node_type,
    _context_pruned: true,
    _pruned_at: new Date().toISOString()
  };

  // Add recent node outputs
  nodeOutputKeys.forEach(key => {
    if (context[key]) {
      prunedContext[key] = context[key];
    }
  });

  return prunedContext;
}

const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING: 'waiting',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

const NODE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

// ============================================================================
// Main Execution Functions
// ============================================================================

/**
 * Start a new flow execution for a prospect
 *
 * @param {string} flowId - The flow definition ID
 * @param {string} prospectId - The prospect to run the flow for
 * @param {string} campaignId - Optional campaign ID
 * @param {Object} initialContext - Initial variables/context
 * @returns {Promise<{success: boolean, executionId?: string, error?: string}>}
 */
export async function startFlowExecution(flowId, prospectId, campaignId = null, initialContext = {}) {
  try {
    console.log('[flowEngine] Starting flow execution', { flowId, prospectId, campaignId });
    flowMetrics.executionStarted(flowId, prospectId, initialContext.workspaceId);

    // 1. Get flow definition
    const { data: flow, error: flowError } = await supabase
      .from('outreach_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      return { success: false, error: flowError?.message || 'Flow not found' };
    }

    // 2. Get prospect data
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospect) {
      return { success: false, error: prospectError?.message || 'Prospect not found' };
    }

    // 3. Find the trigger node (start point)
    const nodes = flow.nodes || [];
    const triggerNode = nodes.find(n => n.type === 'trigger' || n.type === 'start');

    if (!triggerNode) {
      return { success: false, error: 'Flow has no trigger node' };
    }

    // 4. Create execution record
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .insert({
        workspace_id: flow.workspace_id,
        flow_id: flowId,
        prospect_id: prospectId,
        campaign_id: campaignId,
        status: EXECUTION_STATUS.RUNNING,
        current_node_id: triggerNode.id,
        context: {
          ...initialContext,
          flow_name: flow.name,
          prospect_name: prospect.name || prospect.full_name,
          prospect_company: prospect.company || prospect.company_name,
          started_at: new Date().toISOString()
        },
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (execError) {
      return { success: false, error: execError.message };
    }

    console.log('[flowEngine] Created execution', { executionId: execution.id });

    // 5. Execute the trigger node to start the flow
    const triggerResult = await executeNode(execution.id, triggerNode.id);

    if (!triggerResult.success) {
      await updateExecutionStatus(execution.id, EXECUTION_STATUS.FAILED, {
        error: triggerResult.error
      });
      return { success: false, executionId: execution.id, error: triggerResult.error };
    }

    return { success: true, executionId: execution.id };
  } catch (error) {
    console.error('[flowEngine] startFlowExecution error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Start flow execution from Google Sheets data
 * Processes each row from the sheet as a separate prospect context
 *
 * @param {string} flowId - The flow definition ID
 * @param {string} executionId - The parent execution ID
 * @param {Array} rows - Array of row data from Google Sheets
 * @param {Array} headers - Array of column headers
 * @param {string} workspaceId - The workspace ID
 * @param {string} userId - The user ID who started the flow
 * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
 */
export async function startFlowExecutionFromSheet(flowId, executionId, rows, headers, workspaceId, userId) {
  try {
    console.log('[flowEngine] Starting flow execution from Google Sheets', {
      flowId,
      executionId,
      rowCount: rows.length,
      headers
    });

    // 1. Get flow definition
    const { data: flow, error: flowError } = await supabase
      .from('outreach_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (flowError || !flow) {
      return { success: false, error: flowError?.message || 'Flow not found' };
    }

    // 2. Find the first non-trigger node to execute (after Google Sheets node)
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    // Find Google Sheets node
    const sheetNode = nodes.find(n =>
      n.type === 'googleSheets' || n.type === 'google_sheets'
    );

    if (!sheetNode) {
      return { success: false, error: 'Flow has no Google Sheets node' };
    }

    // Find the next node after Google Sheets
    const nextEdge = edges.find(e => e.source === sheetNode.id);
    const nextNodeId = nextEdge?.target;

    // 3. Update parent execution with running status
    await supabase
      .from('flow_executions')
      .update({
        status: EXECUTION_STATUS.RUNNING,
        started_at: new Date().toISOString()
      })
      .eq('id', executionId);

    // 4. Process each row as a prospect context
    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Sheet rows are 1-indexed, +1 for header

      console.log('[flowEngine] Processing sheet row', { rowNum, row });

      // Map sheet columns to prospect-like context
      const prospectContext = {
        _source: 'google_sheets',
        _row_number: rowNum,
        // Standard prospect mappings (try various common column names)
        name: row.name || row.full_name || row.prospect_name || '',
        full_name: row.full_name || row.name || row.prospect_name || '',
        email: row.email || row.email_address || row.mail || '',
        company: row.company || row.company_name || row.organization || '',
        company_name: row.company_name || row.company || row.organization || '',
        title: row.title || row.job_title || row.position || row.role || '',
        industry: row.industry || row.sector || '',
        phone: row.phone || row.phone_number || row.mobile || '',
        linkedin_url: row.linkedin || row.linkedin_url || row.linkedin_profile || '',
        // Include all original columns as well
        ...row
      };

      // Create child execution for this row
      const { data: rowExecution, error: rowExecError } = await supabase
        .from('flow_executions')
        .insert({
          workspace_id: workspaceId,
          flow_id: flowId,
          prospect_id: null, // No database prospect - using sheet data
          parent_execution_id: executionId,
          status: EXECUTION_STATUS.RUNNING,
          current_node_id: nextNodeId || sheetNode.id,
          context: {
            ...prospectContext,
            flow_name: flow.name,
            user_id: userId,
            prospect_name: prospectContext.name || prospectContext.full_name,
            prospect_email: prospectContext.email,
            prospect_company: prospectContext.company || prospectContext.company_name,
            sheet_row: rowNum,
            started_at: new Date().toISOString()
          },
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (rowExecError) {
        console.error('[flowEngine] Failed to create row execution', rowExecError);
        results.push({ row: rowNum, success: false, error: rowExecError.message });
        continue;
      }

      // Execute flow for this row
      try {
        // If there's a next node, execute it
        if (nextNodeId) {
          const nodeResult = await executeNode(rowExecution.id, nextNodeId);
          results.push({
            row: rowNum,
            executionId: rowExecution.id,
            success: nodeResult.success,
            error: nodeResult.error
          });
        } else {
          // No next node - just mark as complete
          await updateExecutionStatus(rowExecution.id, EXECUTION_STATUS.COMPLETED, {
            completed_at: new Date().toISOString()
          });
          results.push({
            row: rowNum,
            executionId: rowExecution.id,
            success: true
          });
        }
      } catch (nodeError) {
        console.error('[flowEngine] Error executing node for row', { rowNum, error: nodeError });
        await updateExecutionStatus(rowExecution.id, EXECUTION_STATUS.FAILED, {
          error: nodeError.message
        });
        results.push({
          row: rowNum,
          executionId: rowExecution.id,
          success: false,
          error: nodeError.message
        });
      }
    }

    // 5. Update parent execution status based on results
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    const finalStatus = failCount === rows.length
      ? EXECUTION_STATUS.FAILED
      : successCount === rows.length
        ? EXECUTION_STATUS.COMPLETED
        : EXECUTION_STATUS.COMPLETED; // Partial success

    await supabase
      .from('flow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        context: {
          rows_processed: rows.length,
          rows_succeeded: successCount,
          rows_failed: failCount,
          results: results
        }
      })
      .eq('id', executionId);

    console.log('[flowEngine] Sheet flow execution complete', {
      executionId,
      total: rows.length,
      succeeded: successCount,
      failed: failCount
    });

    return {
      success: true,
      executionId,
      results,
      summary: {
        total: rows.length,
        succeeded: successCount,
        failed: failCount
      }
    };
  } catch (error) {
    console.error('[flowEngine] startFlowExecutionFromSheet error:', error);

    // Update execution as failed
    await supabase
      .from('flow_executions')
      .update({
        status: EXECUTION_STATUS.FAILED,
        completed_at: new Date().toISOString(),
        context: { error: error.message }
      })
      .eq('id', executionId);

    return { success: false, error: error.message };
  }
}

/**
 * Execute a single node in a flow
 *
 * @param {string} executionId - The execution ID
 * @param {string} nodeId - The node to execute
 * @returns {Promise<{success: boolean, output?: Object, nextNodes?: string[], error?: string}>}
 */
export async function executeNode(executionId, nodeId) {
  let nodeExecution = null;

  try {
    console.log('[flowEngine] Executing node', { executionId, nodeId });

    // 1. Get execution state (with cache)
    let execution = getCachedExecution(executionId);
    if (!execution) {
      const { data, error: execError } = await supabase
        .from('flow_executions')
        .select('*, outreach_flows(*), prospects(*)')
        .eq('id', executionId)
        .single();

      if (execError || !data) {
        return { success: false, error: execError?.message || 'Execution not found' };
      }
      execution = data;
      setCachedExecution(executionId, execution);
    }

    // Check if execution is in a valid state
    if (![EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.PENDING].includes(execution.status)) {
      return { success: false, error: `Execution is ${execution.status}, cannot execute node` };
    }

    const flow = execution.outreach_flows;
    const prospect = execution.prospects;
    const nodes = flow.nodes || [];
    const node = nodes.find(n => n.id === nodeId);

    if (!node) {
      return { success: false, error: `Node ${nodeId} not found in flow` };
    }

    // 2. Create node execution record
    const { data: nodeExec, error: nodeExecError } = await supabase
      .from('node_executions')
      .insert({
        execution_id: executionId,
        node_id: nodeId,
        node_type: node.type,
        status: NODE_STATUS.RUNNING,
        started_at: new Date().toISOString(),
        input_data: {
          node_config: node.data,
          context_snapshot: execution.context
        }
      })
      .select()
      .single();

    if (nodeExecError) {
      console.error('[flowEngine] Failed to create node execution:', nodeExecError);
    }
    nodeExecution = nodeExec;

    // 3. Update current node in execution
    await supabase
      .from('flow_executions')
      .update({ current_node_id: nodeId })
      .eq('id', executionId);

    // 4. Execute based on node type
    let result;
    const nodeContext = {
      execution,
      flow,
      prospect,
      node,
      executionContext: execution.context || {}
    };

    switch (node.type) {
      case 'trigger':
      case 'start':
        result = await handleTriggerNode(nodeContext);
        break;

      case 'aiAnalysis':
      case 'ai_analysis':
        result = await handleAIAnalysisNode(nodeContext);
        break;

      case 'timer':
      case 'delay':
        result = await handleTimerNode(nodeContext);
        break;

      case 'sendEmail':
      case 'send_email':
        result = await handleSendEmailNode(nodeContext);
        break;

      case 'condition':
      case 'branch':
        result = await handleConditionNode(nodeContext);
        break;

      case 'followUp':
      case 'follow_up':
        result = await handleFollowUpNode(nodeContext);
        break;

      case 'research':
      case 'researchProspect':
        result = await handleResearchNode(nodeContext);
        break;

      case 'updateStatus':
      case 'update_status':
        result = await handleUpdateStatusNode(nodeContext);
        break;

      case 'linkedinMessage':
      case 'linkedin':
        result = await handleLinkedInNode(nodeContext);
        break;

      case 'sms':
        result = await handleSMSNode(nodeContext);
        break;

      case 'gmail':
        result = await handleGmailNode(nodeContext);
        break;

      case 'googleSheets':
      case 'google_sheets':
        result = await handleGoogleSheetsNode(nodeContext);
        break;

      case 'slack':
        result = await handleSlackNode(nodeContext);
        break;

      case 'hubspot':
        result = await handleHubSpotNode(nodeContext);
        break;

      case 'webhookTrigger':
      case 'webhook_trigger':
        result = await handleWebhookTriggerNode(nodeContext);
        break;

      case 'aiAgent':
      case 'ai_agent':
        result = await handleAIAgentNode(nodeContext);
        break;

      case 'end':
        result = { success: true, output: { completed: true }, isEnd: true };
        break;

      default:
        result = await handleGenericNode(nodeContext);
    }

    // 5. Update node execution record
    if (nodeExecution) {
      await supabase
        .from('node_executions')
        .update({
          status: result.success ? NODE_STATUS.COMPLETED : NODE_STATUS.FAILED,
          output_data: result.output,
          error_message: result.error,
          completed_at: new Date().toISOString(),
          tokens_used: result.tokensUsed || 0
        })
        .eq('id', nodeExecution.id);
    }

    if (!result.success) {
      return result;
    }

    // 6. Update execution context with node output (with size pruning)
    const updatedContext = pruneContext({
      ...execution.context,
      [node.id]: result.output,
      [`${node.type}_result`]: result.output,
      last_node: nodeId,
      last_node_type: node.type
    });

    // 7. Resolve next nodes
    const nextNodes = result.nextNodes || resolveNextNodes(flow, nodeId, updatedContext, result.branchId);

    // 8. Update execution state
    if (result.isEnd || nextNodes.length === 0) {
      await updateExecutionStatus(executionId, EXECUTION_STATUS.COMPLETED, {
        context: updatedContext,
        completed_at: new Date().toISOString()
      });
    } else if (result.waitUntil) {
      // Timer node - set to waiting
      await updateExecutionStatus(executionId, EXECUTION_STATUS.WAITING, {
        context: updatedContext,
        next_action_at: result.waitUntil
      });
    } else {
      // Continue to next node(s)
      await supabase
        .from('flow_executions')
        .update({ context: updatedContext })
        .eq('id', executionId);

      // Execute next nodes (supports parallel execution)
      for (const nextNodeId of nextNodes) {
        // Small delay between parallel nodes to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
        await executeNode(executionId, nextNodeId);
      }
    }

    return { success: true, output: result.output, nextNodes };
  } catch (error) {
    console.error('[flowEngine] executeNode error:', error);

    // Update node execution with error
    if (nodeExecution) {
      await supabase
        .from('node_executions')
        .update({
          status: NODE_STATUS.FAILED,
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', nodeExecution.id);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Resume a paused or waiting execution
 *
 * @param {string} executionId - The execution to resume
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resumeExecution(executionId) {
  try {
    const { data: execution, error } = await supabase
      .from('flow_executions')
      .select('*, outreach_flows(*)')
      .eq('id', executionId)
      .single();

    if (error || !execution) {
      return { success: false, error: error?.message || 'Execution not found' };
    }

    if (![EXECUTION_STATUS.WAITING, EXECUTION_STATUS.PAUSED].includes(execution.status)) {
      return { success: false, error: `Cannot resume execution with status: ${execution.status}` };
    }

    // Update status to running
    await updateExecutionStatus(executionId, EXECUTION_STATUS.RUNNING);

    // Find and execute the next node
    const flow = execution.outreach_flows;
    const nextNodes = resolveNextNodes(flow, execution.current_node_id, execution.context);

    if (nextNodes.length === 0) {
      await updateExecutionStatus(executionId, EXECUTION_STATUS.COMPLETED, {
        completed_at: new Date().toISOString()
      });
      return { success: true };
    }

    // Execute next node
    const result = await executeNode(executionId, nextNodes[0]);
    return result;
  } catch (error) {
    console.error('[flowEngine] resumeExecution error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Pause a running execution
 *
 * @param {string} executionId - The execution to pause
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function pauseExecution(executionId) {
  try {
    const { data: execution, error } = await supabase
      .from('flow_executions')
      .select('status')
      .eq('id', executionId)
      .single();

    if (error || !execution) {
      return { success: false, error: error?.message || 'Execution not found' };
    }

    if (execution.status !== EXECUTION_STATUS.RUNNING) {
      return { success: false, error: `Cannot pause execution with status: ${execution.status}` };
    }

    await updateExecutionStatus(executionId, EXECUTION_STATUS.PAUSED, {
      paused_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('[flowEngine] pauseExecution error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel/abort an execution
 *
 * @param {string} executionId - The execution to cancel
 * @param {string} reason - Reason for cancellation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelExecution(executionId, reason = 'User cancelled') {
  try {
    const { data: execution, error } = await supabase
      .from('flow_executions')
      .select('status')
      .eq('id', executionId)
      .single();

    if (error || !execution) {
      return { success: false, error: error?.message || 'Execution not found' };
    }

    if ([EXECUTION_STATUS.COMPLETED, EXECUTION_STATUS.FAILED, EXECUTION_STATUS.CANCELLED].includes(execution.status)) {
      return { success: false, error: `Execution already ${execution.status}` };
    }

    // Cancel any pending queued jobs for this execution
    const cancelQueueResult = await cancelExecutionJobs(executionId);
    if (!cancelQueueResult.success) {
      console.warn('[flowEngine] Failed to cancel queued jobs:', cancelQueueResult.error);
    } else {
      console.log('[flowEngine] Cancelled queued jobs:', cancelQueueResult.cancelledCount);
    }

    await updateExecutionStatus(executionId, EXECUTION_STATUS.CANCELLED, {
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      queued_jobs_cancelled: cancelQueueResult.cancelledCount || 0
    });

    return { success: true };
  } catch (error) {
    console.error('[flowEngine] cancelExecution error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current execution status and details
 *
 * @param {string} executionId - The execution ID
 * @returns {Promise<{success: boolean, execution?: Object, error?: string}>}
 */
export async function getExecutionStatus(executionId) {
  try {
    const { data, error } = await supabase
      .from('flow_executions')
      .select(`
        *,
        outreach_flows(name, description),
        prospects(name, company, email),
        node_executions(*)
      `)
      .eq('id', executionId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, execution: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get execution history for a prospect or campaign
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.prospectId - Filter by prospect
 * @param {string} filters.campaignId - Filter by campaign
 * @param {string} filters.flowId - Filter by flow
 * @param {string} filters.status - Filter by status
 * @param {number} filters.limit - Max results
 * @returns {Promise<{success: boolean, executions?: Array, error?: string}>}
 */
export async function getExecutionHistory(filters = {}) {
  try {
    let query = supabase
      .from('flow_executions')
      .select(`
        *,
        outreach_flows(name),
        prospects(name, company)
      `)
      .order('started_at', { ascending: false });

    if (filters.prospectId) query = query.eq('prospect_id', filters.prospectId);
    if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);
    if (filters.flowId) query = query.eq('flow_id', filters.flowId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, executions: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Node Type Handlers
// ============================================================================

/**
 * Handle trigger/start node
 */
async function handleTriggerNode(ctx) {
  const { node, prospect, execution } = ctx;

  // Validate trigger conditions if specified
  const conditions = node.data?.conditions || [];
  for (const condition of conditions) {
    if (!evaluateCondition(condition, prospect, execution.context)) {
      return {
        success: false,
        error: `Trigger condition not met: ${condition.description || condition.field}`
      };
    }
  }

  return {
    success: true,
    output: {
      triggered: true,
      timestamp: new Date().toISOString(),
      prospect_id: prospect.id,
      trigger_type: node.data?.trigger_type || 'manual'
    }
  };
}

/**
 * Handle AI analysis node - Core RAG integration
 */
async function handleAIAnalysisNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  // Build RAG context
  const context = await buildContext({
    node,
    execution,
    prospect,
    flow
  });

  // Call Claude with tools
  const result = await callClaudeWithRAG(
    node,
    context,
    prospect,
    execution
  );

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    output: {
      analysis: result.response,
      tool_calls: result.toolCalls,
      tokens_used: result.tokensUsed
    },
    tokensUsed: result.tokensUsed
  };
}

/**
 * Handle timer/delay node
 * Schedules a job in the execution queue to resume flow after delay
 */
async function handleTimerNode(ctx) {
  const { node, execution } = ctx;

  const delayMinutes = node.data?.delay_minutes || 0;
  const delayHours = node.data?.delay_hours || 0;
  const delayDays = node.data?.delay_days || 0;

  const totalDelayMs = (delayMinutes * 60 + delayHours * 3600 + delayDays * 86400) * 1000;
  const resumeAt = new Date(Date.now() + totalDelayMs);

  // Schedule timer job in execution queue
  const queueResult = await scheduleTimer(
    execution.workspace_id,
    execution.id,
    node.id,
    {
      minutes: delayMinutes,
      hours: delayHours,
      days: delayDays
    }
  );

  if (!queueResult.success) {
    console.error('[flowEngine] Failed to schedule timer:', queueResult.error);
  }

  return {
    success: true,
    output: {
      delay_configured: {
        minutes: delayMinutes,
        hours: delayHours,
        days: delayDays
      },
      resume_at: resumeAt.toISOString(),
      queue_job_id: queueResult.jobId
    },
    waitUntil: resumeAt.toISOString()
  };
}

/**
 * Handle send email node
 */
async function handleSendEmailNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  // Build context and generate email via Claude
  const context = await buildContext({
    node,
    execution,
    prospect,
    flow
  });

  // Override node prompt for email composition
  context.nodePrompt = node.data?.prompt || `
    Compose a personalized ${node.data?.email_type || 'outreach'} email for this prospect.
    ${node.data?.key_points ? `Key points to include: ${node.data.key_points.join(', ')}` : ''}
    ${node.data?.tone ? `Tone: ${node.data.tone}` : ''}
    Return the email with subject line and body.
  `;

  const result = await callClaudeWithRAG(node, context, prospect, execution);

  if (!result.success) {
    return result;
  }

  // Parse email from response
  const emailContent = parseEmailFromResponse(result.response);

  // Save as draft in interaction_memory
  const { data: draft, error: draftError } = await supabase
    .from('interaction_memory')
    .insert({
      workspace_id: execution.workspace_id,
      prospect_id: prospect.id,
      execution_id: execution.id,
      interaction_type: 'email_draft',
      channel: 'email',
      content: {
        subject: emailContent.subject,
        body: emailContent.body,
        generated_at: new Date().toISOString(),
        node_id: node.id
      },
      outcome: 'pending'
    })
    .select()
    .single();

  // Schedule email send via queue (either immediately or at specified time)
  const sendAt = node.data?.send_at ? new Date(node.data.send_at) : new Date();
  const queueResult = await scheduleEmail({
    workspaceId: execution.workspace_id,
    executionId: execution.id,
    nodeId: node.id,
    prospectId: prospect.id,
    subject: emailContent.subject,
    body: emailContent.body,
    scheduledFor: sendAt
  });

  if (!queueResult.success) {
    console.warn('[flowEngine] Failed to schedule email:', queueResult.error);
  }

  return {
    success: true,
    output: {
      email_draft: emailContent,
      draft_id: draft?.id,
      queue_job_id: queueResult.jobId,
      scheduled_for: sendAt.toISOString(),
      tokens_used: result.tokensUsed
    },
    tokensUsed: result.tokensUsed
  };
}

/**
 * Handle condition/branch node
 */
async function handleConditionNode(ctx) {
  const { node, execution, prospect } = ctx;
  const conditions = node.data?.conditions || [];
  const executionContext = execution.context || {};

  // Evaluate each condition
  for (const condition of conditions) {
    const result = evaluateCondition(condition, prospect, executionContext);
    if (result) {
      return {
        success: true,
        output: {
          evaluated_condition: condition.id || condition.field,
          result: true,
          branch: condition.branch || 'true'
        },
        branchId: condition.branch || 'true'
      };
    }
  }

  // No conditions matched - take default/false branch
  return {
    success: true,
    output: {
      evaluated_condition: 'default',
      result: false,
      branch: 'false'
    },
    branchId: 'false'
  };
}

/**
 * Handle follow-up node
 */
async function handleFollowUpNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  // Check if previous outreach had engagement
  const previousInteractions = execution.context?.interactions || [];
  const hadEngagement = previousInteractions.some(i =>
    i.outcome === 'positive' || i.opened || i.clicked || i.replied
  );

  // Build context with follow-up specific prompt
  const context = await buildContext({
    node,
    execution,
    prospect,
    flow
  });

  context.nodePrompt = node.data?.prompt || `
    Create a follow-up message for this prospect.
    ${hadEngagement ? 'They engaged with previous outreach - reference this.' : 'No engagement yet - try a different angle.'}
    Follow-up number: ${(execution.context?.follow_up_count || 0) + 1}
    Keep it brief and provide new value.
  `;

  const result = await callClaudeWithRAG(node, context, prospect, execution);

  if (!result.success) {
    return result;
  }

  // Schedule follow-up send via queue
  const followUpNumber = (execution.context?.follow_up_count || 0) + 1;
  const channel = node.data?.channel || 'email';
  const delayMs = node.data?.delay_minutes ? node.data.delay_minutes * 60 * 1000 : 0;
  const sendAt = node.data?.send_at
    ? new Date(node.data.send_at)
    : new Date(Date.now() + delayMs);

  // Use the follow-up scheduler with a single delay entry
  const delayFromNow = Math.max(0, sendAt.getTime() - Date.now());
  const delayMinutes = Math.ceil(delayFromNow / (60 * 1000));
  const delayStr = delayMinutes > 0 ? `${delayMinutes}m` : '0m';

  const queueResult = await scheduleFollowUp(
    execution.workspace_id,
    execution.id,
    node.id,
    {
      delays: [delayStr],
      payload: {
        prospect_id: prospect.id,
        content: result.response,
        channel,
        follow_up_number: followUpNumber,
        had_engagement: hadEngagement,
        previous_interactions: previousInteractions.slice(-3) // Last 3 interactions for reference
      }
    }
  );

  if (!queueResult.success) {
    console.warn('[flowEngine] Failed to schedule follow-up:', queueResult.error);
  }

  return {
    success: true,
    output: {
      follow_up_content: result.response,
      follow_up_number: followUpNumber,
      had_engagement: hadEngagement,
      queue_job_ids: queueResult.jobIds,
      scheduled_times: queueResult.scheduledTimes,
      tokens_used: result.tokensUsed
    },
    tokensUsed: result.tokensUsed
  };
}

/**
 * Handle research node
 */
async function handleResearchNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  // Build context for research
  const context = await buildContext({
    node,
    execution,
    prospect,
    flow
  });

  context.nodePrompt = node.data?.prompt || `
    Research this prospect and their company thoroughly.
    Find: pain points, recent news, triggers, key stakeholders, and best approach angles.
    Use the available tools to search knowledge base and scrape relevant pages.
  `;

  const result = await callClaudeWithRAG(node, context, prospect, execution);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    output: {
      research_findings: result.response,
      tool_calls: result.toolCalls,
      tokens_used: result.tokensUsed
    },
    tokensUsed: result.tokensUsed
  };
}

/**
 * Handle update status node
 */
async function handleUpdateStatusNode(ctx) {
  const { node, prospect } = ctx;

  const newStatus = node.data?.status;
  const notes = node.data?.notes;
  const tags = node.data?.tags;

  const updates = {};
  if (newStatus) updates.stage = newStatus;
  if (notes) updates.notes = interpolateVariables(notes, ctx.execution.context);
  if (tags) updates.tags = tags;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', prospect.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    output: {
      previous_status: prospect.stage,
      new_status: newStatus || prospect.stage,
      updated_fields: Object.keys(updates)
    }
  };
}

/**
 * Handle LinkedIn message node
 */
async function handleLinkedInNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  const context = await buildContext({
    node,
    execution,
    prospect,
    flow
  });

  const messageType = node.data?.message_type || 'connection_request';
  const charLimit = messageType === 'connection_request' ? 300 : 1900;

  context.nodePrompt = node.data?.prompt || `
    Compose a LinkedIn ${messageType.replace('_', ' ')} for this prospect.
    Character limit: ${charLimit}
    Be personal, relevant, and human.
  `;

  const result = await callClaudeWithRAG(node, context, prospect, execution);

  if (!result.success) {
    return result;
  }

  // Schedule LinkedIn message via queue
  const sendAt = node.data?.send_at ? new Date(node.data.send_at) : new Date();
  const queueResult = await scheduleLinkedIn({
    workspaceId: execution.workspace_id,
    executionId: execution.id,
    nodeId: node.id,
    prospectId: prospect.id,
    message: result.response,
    messageType: messageType,
    scheduledFor: sendAt
  });

  if (!queueResult.success) {
    console.warn('[flowEngine] Failed to schedule LinkedIn message:', queueResult.error);
  }

  return {
    success: true,
    output: {
      linkedin_message: result.response,
      message_type: messageType,
      char_count: result.response?.length || 0,
      queue_job_id: queueResult.jobId,
      scheduled_for: sendAt.toISOString(),
      tokens_used: result.tokensUsed
    },
    tokensUsed: result.tokensUsed
  };
}

/**
 * Handle SMS node
 */
async function handleSMSNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  const context = await buildContext({
    node,
    execution,
    prospect,
    flow
  });

  context.nodePrompt = node.data?.prompt || `
    Compose a brief SMS message for this prospect.
    Keep it under 160 characters. Be direct and human.
  `;

  const result = await callClaudeWithRAG(node, context, prospect, execution);

  if (!result.success) {
    return result;
  }

  // Schedule SMS via queue
  const sendAt = node.data?.send_at ? new Date(node.data.send_at) : new Date();
  const queueResult = await scheduleSMS({
    workspaceId: execution.workspace_id,
    executionId: execution.id,
    nodeId: node.id,
    prospectId: prospect.id,
    message: result.response,
    scheduledFor: sendAt
  });

  if (!queueResult.success) {
    console.warn('[flowEngine] Failed to schedule SMS:', queueResult.error);
  }

  return {
    success: true,
    output: {
      sms_message: result.response,
      char_count: result.response?.length || 0,
      queue_job_id: queueResult.jobId,
      scheduled_for: sendAt.toISOString(),
      tokens_used: result.tokensUsed
    },
    tokensUsed: result.tokensUsed
  };
}

/**
 * Handle generic/unknown node types
 */
async function handleGenericNode(ctx) {
  const { node, execution, prospect, flow } = ctx;

  if (node.data?.prompt) {
    // If node has a prompt, treat it as an AI node
    const context = await buildContext({
      node,
      execution,
      prospect,
      flow
    });

    const result = await callClaudeWithRAG(node, context, prospect, execution);
    return result.success
      ? { success: true, output: { response: result.response }, tokensUsed: result.tokensUsed }
      : result;
  }

  // No prompt - just pass through
  return {
    success: true,
    output: {
      node_type: node.type,
      node_data: node.data,
      pass_through: true
    }
  };
}

// ============================================================================
// Composio Integration Helpers
// ============================================================================

/**
 * Look up a user's Composio connected account for a given toolkit
 */
async function getUserComposioConnection(userId, toolkitSlug) {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('composio_connected_account_id, status')
    .eq('user_id', userId)
    .eq('toolkit_slug', toolkitSlug)
    .ilike('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }
  return data.composio_connected_account_id;
}

/**
 * Execute a Composio tool via the composio-connect edge function
 */
async function handleComposioToolExecution(toolkitSlug, toolSlug, args, execution) {
  const userId = execution.prospects?.user_id || execution.context?.user_id;
  const connectedAccountId = await getUserComposioConnection(userId, toolkitSlug);

  if (!connectedAccountId) {
    return {
      success: false,
      error: `No active ${toolkitSlug} connection found. Connect ${toolkitSlug} in Settings > Integrations first.`
    };
  }

  try {
    const { data, error } = await functions.invoke('composio-connect', {
      action: 'executeTool',
      toolSlug,
      connectedAccountId,
      arguments: args
    });

    if (error) {
      return { success: false, error: error.message || `Composio tool execution failed: ${toolSlug}` };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// Composio Node Handlers
// ============================================================================

/**
 * Handle Gmail node - Send/read emails via Composio
 */
async function handleGmailNode(ctx) {
  const { node, execution, prospect, flow } = ctx;
  const action = node.data?.action || 'send_email';

  // If AI mode, generate content first
  if (node.data?.use_ai && node.data?.body_prompt) {
    const context = await buildContext({ node, execution, prospect, flow });
    context.nodePrompt = node.data.body_prompt;
    const aiResult = await callClaudeWithRAG(node, context, prospect, execution);
    if (!aiResult.success) return aiResult;

    const emailContent = parseEmailFromResponse(aiResult.response);
    const toolArgs = {
      recipient_email: interpolateVariables(node.data?.recipient || prospect.email, execution.context),
      subject: emailContent.subject || interpolateVariables(node.data?.subject || '', execution.context),
      body: emailContent.body
    };

    const toolSlug = action === 'create_draft' ? 'GMAIL_CREATE_EMAIL_DRAFT' : 'GMAIL_SEND_EMAIL';
    const result = await handleComposioToolExecution('gmail', toolSlug, toolArgs, execution);

    return {
      success: result.success,
      output: { action, ...toolArgs, composio_result: result.data, ai_generated: true },
      error: result.error,
      tokensUsed: aiResult.tokensUsed
    };
  }

  // Direct mode
  const TOOL_MAP = {
    send_email: 'GMAIL_SEND_EMAIL',
    fetch_emails: 'GMAIL_FETCH_EMAILS',
    create_draft: 'GMAIL_CREATE_EMAIL_DRAFT'
  };

  const toolArgs = action === 'fetch_emails'
    ? { query: node.data?.body_prompt || '' }
    : {
        recipient_email: interpolateVariables(node.data?.recipient || prospect.email, execution.context),
        subject: interpolateVariables(node.data?.subject || '', execution.context),
        body: interpolateVariables(node.data?.body_prompt || '', execution.context)
      };

  const result = await handleComposioToolExecution('gmail', TOOL_MAP[action] || 'GMAIL_SEND_EMAIL', toolArgs, execution);

  return {
    success: result.success,
    output: { action, ...toolArgs, composio_result: result.data },
    error: result.error
  };
}

/**
 * Handle Google Sheets node - Read/write spreadsheet data
 */
async function handleGoogleSheetsNode(ctx) {
  const { node, execution } = ctx;
  const action = node.data?.action || 'get_values';

  const TOOL_MAP = {
    add_row: 'GOOGLESHEETS_BATCH_UPDATE',
    get_values: 'GOOGLESHEETS_GET_SPREADSHEET_VALUES',
    update_cell: 'GOOGLESHEETS_BATCH_UPDATE',
    search: 'GOOGLESHEETS_GET_SPREADSHEET_VALUES'
  };

  const toolArgs = {
    spreadsheet_id: node.data?.spreadsheet_id,
    range: node.data?.range || 'A1',
    ...(node.data?.sheet_name && { sheet_name: node.data.sheet_name })
  };

  if (action === 'add_row' || action === 'update_cell') {
    toolArgs.values = interpolateVariables(node.data?.values_prompt || '', execution.context);
  }

  const result = await handleComposioToolExecution(
    'googlesheets', TOOL_MAP[action] || 'GOOGLESHEETS_GET_SPREADSHEET_VALUES', toolArgs, execution
  );

  return {
    success: result.success,
    output: { action, spreadsheet_id: node.data?.spreadsheet_id, composio_result: result.data },
    error: result.error
  };
}

/**
 * Handle Slack node - Send messages to channels
 */
async function handleSlackNode(ctx) {
  const { node, execution, prospect, flow } = ctx;
  const action = node.data?.action || 'send_message';

  let message = interpolateVariables(node.data?.message_prompt || '', execution.context);

  // If AI mode, generate message
  if (node.data?.use_ai && node.data?.message_prompt) {
    const context = await buildContext({ node, execution, prospect, flow });
    context.nodePrompt = node.data.message_prompt;
    const aiResult = await callClaudeWithRAG(node, context, prospect, execution);
    if (!aiResult.success) return aiResult;
    message = aiResult.response;
  }

  const TOOL_MAP = {
    send_message: 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL',
    create_channel: 'SLACK_CREATE_A_CHANNEL'
  };

  const toolArgs = action === 'create_channel'
    ? { name: node.data?.channel }
    : { channel: node.data?.channel, text: message };

  const result = await handleComposioToolExecution('slack', TOOL_MAP[action], toolArgs, execution);

  return {
    success: result.success,
    output: { action, channel: node.data?.channel, message, composio_result: result.data },
    error: result.error
  };
}

/**
 * Handle HubSpot node - CRM operations
 */
async function handleHubSpotNode(ctx) {
  const { node, execution } = ctx;
  const action = node.data?.action || 'create_contact';
  const ec = execution.context || {};

  const TOOL_MAP = {
    create_contact: 'HUBSPOT_CREATE_CONTACT',
    create_deal: 'HUBSPOT_CREATE_DEAL',
    send_email: 'HUBSPOT_SEND_EMAIL'
  };

  let toolArgs = {};
  if (action === 'create_contact' || action === 'send_email') {
    toolArgs = {
      email: interpolateVariables(node.data?.email || '', ec),
      firstname: interpolateVariables(node.data?.first_name || '', ec),
      lastname: interpolateVariables(node.data?.last_name || '', ec),
      company: interpolateVariables(node.data?.company || '', ec)
    };
  } else if (action === 'create_deal') {
    toolArgs = {
      dealname: interpolateVariables(node.data?.deal_name || '', ec),
      amount: node.data?.amount || 0
    };
  }

  const result = await handleComposioToolExecution('hubspot', TOOL_MAP[action], toolArgs, execution);

  return {
    success: result.success,
    output: { action, ...toolArgs, composio_result: result.data },
    error: result.error
  };
}

/**
 * Handle Webhook Trigger node - Subscribe to Composio triggers
 */
async function handleWebhookTriggerNode(ctx) {
  const { node, execution } = ctx;
  const integration = node.data?.integration;
  const triggerType = node.data?.trigger_type;

  if (!integration || !triggerType) {
    return { success: false, error: 'Webhook trigger requires integration and trigger type' };
  }

  const userId = execution.prospects?.user_id || execution.context?.user_id;
  const connectedAccountId = await getUserComposioConnection(userId, integration);

  if (!connectedAccountId) {
    return {
      success: false,
      error: `No active ${integration} connection. Connect in Settings > Integrations.`
    };
  }

  try {
    const { data, error } = await functions.invoke('composio-connect', {
      action: 'subscribeTrigger',
      triggerSlug: triggerType,
      connectedAccountId,
      config: node.data?.filter_config ? JSON.parse(node.data.filter_config) : {}
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      output: {
        integration,
        trigger_type: triggerType,
        subscription: data,
        waiting_for_trigger: true
      },
      waitUntil: null // Webhook triggers resume asynchronously
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Handle AI Agent node - Autonomous agent with RAG + Composio tool calling
 */
async function handleAIAgentNode(ctx) {
  const { node, execution, prospect, flow } = ctx;
  const maxIterations = node.data?.max_iterations || 10;
  const allowedIntegrations = node.data?.allowed_integrations || [];

  // 1. Build full RAG context
  const context = await buildContext({ node, execution, prospect, flow });
  context.nodePrompt = node.data?.prompt || 'You are an autonomous agent. Complete the task using available tools.';

  // 2. Get base tools for this node type
  const baseTools = getToolsForNodeType('aiAgent');

  // 3. Fetch user's active Composio connections and build extended tool list
  const userId = execution.prospects?.user_id || execution.context?.user_id;
  const composioTools = [];

  for (const toolkit of allowedIntegrations) {
    const connId = await getUserComposioConnection(userId, toolkit);
    if (connId) {
      try {
        const { data } = await functions.invoke('composio-connect', {
          action: 'listTools', toolkitSlug: toolkit
        });
        if (data?.tools) {
          composioTools.push(...data.tools.map(t => ({
            name: `composio_${toolkit}_${t.name}`,
            description: t.description,
            input_schema: t.inputSchema || { type: 'object', properties: {} },
            _composio: { toolkit, toolSlug: t.name, connectedAccountId: connId }
          })));
        }
      } catch (err) {
        console.warn(`[flowEngine] Failed to list tools for ${toolkit}:`, err.message);
      }
    }
  }

  const allTools = [...(baseTools || []), ...composioTools];

  // 4. Call Claude with extended tools in an agentic loop
  const formattedContext = trimContextToFit(context, 12000);
  const messages = [{ role: 'user', content: formattedContext }];
  const toolCallResults = [];
  let totalTokens = 0;
  let finalResponse = '';

  for (let i = 0; i < maxIterations; i++) {
    const { data, error } = await withTimeout(
      functions.invoke('execute-ai-node', {
        systemPrompt: context.systemPrompt,
        messages,
        tools: allTools,
        nodeType: 'aiAgent',
        nodeConfig: node.data,
        prospectId: prospect.id,
        executionId: execution.id,
        workspaceId: execution.workspace_id
      }),
      AI_TIMEOUT_MS,
      'AI Agent call timed out'
    );

    if (error) {
      return { success: false, error: error.message };
    }

    totalTokens += data.tokensUsed || 0;

    // If no tool calls, we're done
    if (!data.toolCalls || data.toolCalls.length === 0) {
      finalResponse = data.response;
      break;
    }

    // Process tool calls
    for (const tc of data.toolCalls) {
      let toolResult;

      if (tc.name?.startsWith('composio_')) {
        // Route to Composio
        const composioTool = composioTools.find(t => t.name === tc.name);
        if (composioTool) {
          const execResult = await handleComposioToolExecution(
            composioTool._composio.toolkit,
            composioTool._composio.toolSlug,
            tc.input || {},
            execution
          );
          toolResult = execResult.success ? execResult.data : { error: execResult.error };
        } else {
          toolResult = { error: `Unknown composio tool: ${tc.name}` };
        }
      } else {
        // Route to internal tools
        try {
          toolResult = await executeToolCall(tc.name, tc.input, {
            prospectId: prospect.id,
            workspaceId: execution.workspace_id,
            executionId: execution.id
          });
        } catch (err) {
          toolResult = { error: err.message };
        }
      }

      toolCallResults.push({ tool: tc.name, input: tc.input, result: toolResult });

      // Add tool result to messages for next iteration
      messages.push({ role: 'assistant', content: data.response, tool_calls: [tc] });
      messages.push({ role: 'tool', content: JSON.stringify(toolResult), tool_call_id: tc.id });
    }

    finalResponse = data.response;
  }

  return {
    success: true,
    output: {
      agent_response: finalResponse,
      tool_calls: toolCallResults,
      iterations: toolCallResults.length,
      tokens_used: totalTokens
    },
    tokensUsed: totalTokens
  };
}

// ============================================================================
// Claude Integration with RAG
// ============================================================================

/**
 * Call Claude API with RAG context and tools
 * Uses edge function for secure API key handling
 *
 * @param {Object} node - The node being executed
 * @param {Object} context - Built RAG context
 * @param {Object} prospect - Prospect data
 * @param {Object} execution - Execution state
 * @returns {Promise<{success: boolean, response?: string, toolCalls?: Array, tokensUsed?: number, error?: string}>}
 */
async function callClaudeWithRAG(node, context, prospect, execution) {
  const startTime = Date.now();
  try {
    // 1. Get tools for this node type
    const tools = getToolsForNodeType(node.type);

    // 2. Format context for Claude
    const formattedContext = trimContextToFit(context, 12000);

    // 3. Build messages
    const messages = [
      {
        role: 'user',
        content: formattedContext
      }
    ];

    // 4. Call edge function for Claude API (with timeout)
    const { data, error } = await withTimeout(
      functions.invoke('execute-ai-node', {
        systemPrompt: context.systemPrompt,
        messages,
        tools,
        nodeType: node.type,
        nodeConfig: node.data,
        prospectId: prospect.id,
        executionId: execution.id,
        workspaceId: execution.workspace_id
      }),
      AI_TIMEOUT_MS,
      'Claude API call timed out after 60 seconds'
    );

    const duration = Date.now() - startTime;

    if (error) {
      console.error('[flowEngine] Claude API error:', error);
      flowMetrics.claudeApiCall(0, duration, 'claude-sonnet-4-20250514');
      return { success: false, error: error.message };
    }

    flowMetrics.claudeApiCall(data.tokensUsed || 0, duration, 'claude-sonnet-4-20250514');

    return {
      success: true,
      response: data.response,
      toolCalls: data.toolCalls || [],
      tokensUsed: data.tokensUsed || 0
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    flowMetrics.claudeApiCall(0, duration, 'claude-sonnet-4-20250514');
    console.error('[flowEngine] callClaudeWithRAG error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update execution status
 */
async function updateExecutionStatus(executionId, status, additionalUpdates = {}) {
  invalidateExecutionCache(executionId);

  const { error } = await supabase
    .from('flow_executions')
    .update({
      status,
      ...additionalUpdates,
      updated_at: new Date().toISOString()
    })
    .eq('id', executionId);

  if (error) {
    console.error('[flowEngine] Failed to update execution status:', error);
  }
}

/**
 * Resolve next nodes based on edges
 */
function resolveNextNodes(flow, currentNodeId, executionContext, branchId = null) {
  const edges = flow.edges || [];

  // Find outgoing edges from current node
  let outgoingEdges = edges.filter(e => e.source === currentNodeId);

  // If branch specified (from condition node), filter to matching branch
  if (branchId) {
    const branchEdge = outgoingEdges.find(e =>
      e.sourceHandle === branchId ||
      e.data?.branch === branchId ||
      e.label === branchId
    );
    if (branchEdge) {
      return [branchEdge.target];
    }
  }

  // Return all target nodes (supports parallel execution)
  return outgoingEdges.map(e => e.target);
}

/**
 * Evaluate a condition against prospect and context
 */
function evaluateCondition(condition, prospect, context) {
  const { field, operator, value } = condition;

  // Get the actual value from prospect or context
  let actualValue = getNestedValue(prospect, field) || getNestedValue(context, field);

  // Handle different operators
  switch (operator) {
    case 'equals':
    case '==':
    case '===':
      return actualValue === value;
    case 'not_equals':
    case '!=':
    case '!==':
      return actualValue !== value;
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
      return !String(actualValue).toLowerCase().includes(String(value).toLowerCase());
    case 'greater_than':
    case '>':
      return Number(actualValue) > Number(value);
    case 'less_than':
    case '<':
      return Number(actualValue) < Number(value);
    case 'is_empty':
      return !actualValue || actualValue === '' || (Array.isArray(actualValue) && actualValue.length === 0);
    case 'is_not_empty':
      return actualValue && actualValue !== '' && (!Array.isArray(actualValue) || actualValue.length > 0);
    case 'in':
      return Array.isArray(value) ? value.includes(actualValue) : false;
    case 'not_in':
      return Array.isArray(value) ? !value.includes(actualValue) : true;
    default:
      console.warn('[flowEngine] Unknown operator:', operator);
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Interpolate variables in a string
 * Supports {{prospect.name}}, {{context.analysis.painPoints}}, etc.
 */
function interpolateVariables(text, context) {
  if (!text || typeof text !== 'string') return text;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    if (value === undefined) return match; // Keep original if not found
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

/**
 * Parse email subject and body from Claude response
 */
function parseEmailFromResponse(response) {
  if (!response) return { subject: '', body: '' };

  // Try to parse structured format first
  const subjectMatch = response.match(/(?:Subject|SUBJECT):\s*(.+?)(?:\n|$)/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : '';

  // Remove subject line from body
  let body = response;
  if (subjectMatch) {
    body = response.replace(subjectMatch[0], '').trim();
  }

  // Clean up common markers
  body = body
    .replace(/^(?:Body|BODY|Email|EMAIL|Message|MESSAGE):\s*/i, '')
    .replace(/^---+\s*/gm, '')
    .trim();

  return { subject, body };
}

// ============================================================================
// Exports
// ============================================================================

export {
  EXECUTION_STATUS,
  NODE_STATUS
};

export default {
  startFlowExecution,
  startFlowExecutionFromSheet,
  executeNode,
  resumeExecution,
  pauseExecution,
  cancelExecution,
  getExecutionStatus,
  getExecutionHistory,
  EXECUTION_STATUS,
  NODE_STATUS
};
