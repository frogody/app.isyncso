/**
 * Flow Service - Database operations for outreach flows
 */

import { supabase } from '@/api/supabaseClient';

// ============================================================================
// Flow CRUD Operations
// ============================================================================

/**
 * Get all flows with execution stats
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<{success: boolean, flows?: Array, error?: string}>}
 */
export async function getFlowsWithStats(workspaceId = null) {
  try {
    let query = supabase
      .from('outreach_flows')
      .select(`
        *,
        flow_executions(
          id,
          status,
          created_at,
          completed_at
        )
      `)
      .order('updated_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Calculate stats for each flow
    const flowsWithStats = (data || []).map(flow => {
      const executions = flow.flow_executions || [];
      const total = executions.length;
      const completed = executions.filter(e => e.status === 'completed').length;
      const failed = executions.filter(e => e.status === 'failed').length;
      const running = executions.filter(e => ['running', 'pending', 'waiting'].includes(e.status)).length;

      // Calculate average completion time for completed executions
      const completedWithTime = executions.filter(e =>
        e.status === 'completed' && e.created_at && e.completed_at
      );
      let avgCompletionTime = null;
      if (completedWithTime.length > 0) {
        const totalTime = completedWithTime.reduce((sum, e) => {
          return sum + (new Date(e.completed_at) - new Date(e.created_at));
        }, 0);
        avgCompletionTime = totalTime / completedWithTime.length; // in ms
      }

      return {
        ...flow,
        stats: {
          totalRuns: total,
          completedRuns: completed,
          failedRuns: failed,
          runningCount: running,
          successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avgCompletionTimeMs: avgCompletionTime
        },
        // Remove raw executions data
        flow_executions: undefined
      };
    });

    return { success: true, flows: flowsWithStats };
  } catch (error) {
    console.error('[flowService] getFlowsWithStats error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get single flow by ID
 * @param {string} flowId - Flow ID
 * @returns {Promise<{success: boolean, flow?: Object, error?: string}>}
 */
export async function getFlowById(flowId) {
  try {
    const { data, error } = await supabase
      .from('outreach_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, flow: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new flow
 * @param {Object} flowData - Flow data
 * @returns {Promise<{success: boolean, flow?: Object, error?: string}>}
 */
export async function createFlow(flowData) {
  try {
    const { data, error } = await supabase
      .from('outreach_flows')
      .insert({
        name: flowData.name,
        description: flowData.description || '',
        agent_persona: flowData.agent_persona || '',
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        status: flowData.status || 'draft',
        workspace_id: flowData.workspace_id,
        created_by: flowData.created_by
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, flow: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing flow
 * @param {string} flowId - Flow ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, flow?: Object, error?: string}>}
 */
export async function updateFlow(flowId, updates) {
  try {
    const { data, error } = await supabase
      .from('outreach_flows')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', flowId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, flow: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a flow
 * @param {string} flowId - Flow ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFlow(flowId) {
  try {
    // First, cancel any running executions
    await supabase
      .from('flow_executions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Flow deleted'
      })
      .eq('flow_id', flowId)
      .in('status', ['running', 'pending', 'waiting']);

    // Then delete the flow (cascade will handle executions)
    const { error } = await supabase
      .from('outreach_flows')
      .delete()
      .eq('id', flowId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Duplicate a flow
 * @param {string} flowId - Flow ID to duplicate
 * @returns {Promise<{success: boolean, flow?: Object, error?: string}>}
 */
export async function duplicateFlow(flowId) {
  try {
    // Get the original flow
    const { data: original, error: fetchError } = await supabase
      .from('outreach_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (fetchError || !original) {
      return { success: false, error: fetchError?.message || 'Flow not found' };
    }

    // Create copy with modified name
    const { data: copy, error: insertError } = await supabase
      .from('outreach_flows')
      .insert({
        name: `Copy of ${original.name}`,
        description: original.description,
        agent_persona: original.agent_persona,
        nodes: original.nodes,
        edges: original.edges,
        status: 'draft', // Always start as draft
        workspace_id: original.workspace_id,
        created_by: original.created_by
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, flow: copy };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Toggle flow status (active/paused/draft)
 * @param {string} flowId - Flow ID
 * @param {string} newStatus - New status
 * @returns {Promise<{success: boolean, flow?: Object, error?: string}>}
 */
export async function toggleFlowStatus(flowId, newStatus) {
  try {
    const validStatuses = ['active', 'paused', 'draft'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: 'Invalid status' };
    }

    const { data, error } = await supabase
      .from('outreach_flows')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', flowId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, flow: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Execution Helpers
// ============================================================================

/**
 * Get recent executions for a flow
 * @param {string} flowId - Flow ID
 * @param {number} limit - Max results
 * @returns {Promise<{success: boolean, executions?: Array, error?: string}>}
 */
export async function getFlowExecutions(flowId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('flow_executions')
      .select(`
        *,
        prospects(id, name, company, email)
      `)
      .eq('flow_id', flowId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, executions: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get prospects for quick run selection
 * @param {string} workspaceId - Workspace ID
 * @param {string} search - Optional search term
 * @param {number} limit - Max results
 * @returns {Promise<{success: boolean, prospects?: Array, error?: string}>}
 */
export async function getProspectsForRun(workspaceId, search = '', limit = 20) {
  try {
    let query = supabase
      .from('prospects')
      .select('id, name, full_name, company, company_name, email, stage')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,full_name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, prospects: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getFlowsWithStats,
  getFlowById,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
  toggleFlowStatus,
  getFlowExecutions,
  getProspectsForRun
};
