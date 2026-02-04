/**
 * Queue Service - Manages Async Job Execution
 *
 * Handles:
 * - Timer/delay scheduling
 * - Email/LinkedIn/SMS send queuing
 * - Follow-up sequences
 * - Retry logic
 * - Rate limiting
 *
 * Integrates with flowExecutionEngine for async node execution.
 */

import { supabase } from '@/api/supabaseClient';

// ============================================================================
// Constants
// ============================================================================

const JOB_TYPES = {
  TIMER: 'timer',
  SEND_EMAIL: 'send_email',
  SEND_LINKEDIN: 'send_linkedin',
  SEND_SMS: 'send_sms',
  WEBHOOK: 'webhook',
  RETRY: 'retry',
  FOLLOW_UP: 'follow_up'
};

const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Default rate limits per resource type
const DEFAULT_RATE_LIMITS = {
  email: { maxCount: 50, windowMinutes: 60 },
  linkedin: { maxCount: 25, windowMinutes: 60 },
  sms: { maxCount: 100, windowMinutes: 60 },
  claude_api: { maxCount: 100, windowMinutes: 1 },
  embedding: { maxCount: 500, windowMinutes: 1 }
};

// ============================================================================
// Core Queue Operations
// ============================================================================

/**
 * Enqueue a new job
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Workspace/organization ID
 * @param {string} params.executionId - Flow execution ID
 * @param {string} params.nodeId - Node ID to execute
 * @param {string} params.jobType - Job type (timer, send_email, etc.)
 * @param {Date|string} params.scheduledFor - When to execute
 * @param {Object} params.payload - Additional data for the job
 * @param {number} params.priority - Higher = processed first (default 0)
 * @param {number} params.maxAttempts - Max retry attempts (default 3)
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export async function enqueueJob({
  workspaceId,
  executionId,
  nodeId,
  jobType,
  scheduledFor,
  payload = {},
  priority = 0,
  maxAttempts = 3
}) {
  try {
    if (!workspaceId || !executionId || !nodeId || !jobType) {
      return { success: false, error: 'Missing required parameters' };
    }

    // Validate job type
    if (!Object.values(JOB_TYPES).includes(jobType)) {
      return { success: false, error: `Invalid job type: ${jobType}` };
    }

    // Parse scheduledFor if string
    const scheduledTime = scheduledFor instanceof Date
      ? scheduledFor.toISOString()
      : scheduledFor || new Date().toISOString();

    const { data, error } = await supabase
      .from('execution_queue')
      .insert({
        workspace_id: workspaceId,
        execution_id: executionId,
        node_id: nodeId,
        job_type: jobType,
        scheduled_for: scheduledTime,
        payload,
        priority,
        max_attempts: maxAttempts,
        status: JOB_STATUS.PENDING
      })
      .select()
      .single();

    if (error) {
      console.error('[queueService] enqueueJob error:', error);
      return { success: false, error: error.message };
    }

    console.log('[queueService] Job enqueued:', { jobId: data.id, jobType, scheduledFor: scheduledTime });
    return { success: true, jobId: data.id };
  } catch (error) {
    console.error('[queueService] enqueueJob exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a specific job
 *
 * @param {string} jobId - The job ID to cancel
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelJob(jobId) {
  try {
    const { error } = await supabase
      .from('execution_queue')
      .update({
        status: JOB_STATUS.CANCELLED,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .in('status', [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel all jobs for an execution
 *
 * @param {string} executionId - The execution ID
 * @returns {Promise<{success: boolean, cancelledCount?: number, error?: string}>}
 */
export async function cancelExecutionJobs(executionId) {
  try {
    const { data, error } = await supabase
      .from('execution_queue')
      .update({
        status: JOB_STATUS.CANCELLED,
        updated_at: new Date().toISOString()
      })
      .eq('execution_id', executionId)
      .in('status', [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING])
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, cancelledCount: data?.length || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all queued jobs for an execution
 *
 * @param {string} executionId - The execution ID
 * @returns {Promise<{success: boolean, jobs?: Array, error?: string}>}
 */
export async function getQueuedJobs(executionId) {
  try {
    const { data, error } = await supabase
      .from('execution_queue')
      .select('*')
      .eq('execution_id', executionId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, jobs: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get queue statistics
 *
 * @param {string} workspaceId - Optional workspace filter
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
export async function getQueueStats(workspaceId = null) {
  try {
    let query = supabase
      .from('execution_queue')
      .select('job_type, status');

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Aggregate stats
    const stats = {
      total: data?.length || 0,
      byType: {},
      byStatus: {}
    };

    (data || []).forEach(job => {
      // By type
      stats.byType[job.job_type] = (stats.byType[job.job_type] || 0) + 1;
      // By status
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
    });

    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Timer Scheduling
// ============================================================================

/**
 * Schedule a timer job
 *
 * @param {string} workspaceId - Workspace ID
 * @param {string} executionId - Execution ID
 * @param {string} nodeId - Node ID that created this timer
 * @param {Object} delayConfig - Delay configuration
 * @param {number} delayConfig.minutes - Minutes to delay
 * @param {number} delayConfig.hours - Hours to delay
 * @param {number} delayConfig.days - Days to delay
 * @param {string} delayConfig.until - Specific datetime (ISO string)
 * @returns {Promise<{success: boolean, jobId?: string, scheduledFor?: string, error?: string}>}
 */
export async function scheduleTimer(workspaceId, executionId, nodeId, delayConfig) {
  try {
    let scheduledFor;

    if (delayConfig.until) {
      // Specific datetime
      scheduledFor = new Date(delayConfig.until);
    } else {
      // Calculate delay from now
      const totalMs =
        (delayConfig.minutes || 0) * 60 * 1000 +
        (delayConfig.hours || 0) * 60 * 60 * 1000 +
        (delayConfig.days || 0) * 24 * 60 * 60 * 1000;

      scheduledFor = new Date(Date.now() + totalMs);
    }

    const result = await enqueueJob({
      workspaceId,
      executionId,
      nodeId,
      jobType: JOB_TYPES.TIMER,
      scheduledFor,
      payload: {
        delay_config: delayConfig,
        created_at: new Date().toISOString()
      },
      priority: 0,
      maxAttempts: 1 // Timers don't retry
    });

    if (result.success) {
      return {
        success: true,
        jobId: result.jobId,
        scheduledFor: scheduledFor.toISOString()
      };
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Schedule a follow-up sequence
 *
 * @param {string} workspaceId - Workspace ID
 * @param {string} executionId - Execution ID
 * @param {string} nodeId - Starting node ID
 * @param {Object} followUpConfig - Follow-up configuration
 * @param {Array<string>} followUpConfig.delays - Array of delay strings ('2d', '4h', '30m')
 * @param {Array<string>} followUpConfig.nodeIds - Optional specific node IDs for each follow-up
 * @param {Object} followUpConfig.payload - Additional payload for each job
 * @returns {Promise<{success: boolean, jobIds?: string[], scheduledTimes?: string[], error?: string}>}
 */
export async function scheduleFollowUp(workspaceId, executionId, nodeId, followUpConfig) {
  try {
    const { delays = [], nodeIds = [], payload = {} } = followUpConfig;

    if (delays.length === 0) {
      return { success: false, error: 'No delays specified' };
    }

    const jobIds = [];
    const scheduledTimes = [];
    let baseTime = new Date();

    for (let i = 0; i < delays.length; i++) {
      const delay = parseDelayString(delays[i]);
      const scheduledFor = new Date(baseTime.getTime() + delay);

      const result = await enqueueJob({
        workspaceId,
        executionId,
        nodeId: nodeIds[i] || nodeId,
        jobType: JOB_TYPES.FOLLOW_UP,
        scheduledFor,
        payload: {
          ...payload,
          follow_up_number: i + 1,
          total_follow_ups: delays.length,
          original_node_id: nodeId
        },
        priority: delays.length - i, // Earlier follow-ups have higher priority
        maxAttempts: 3
      });

      if (result.success) {
        jobIds.push(result.jobId);
        scheduledTimes.push(scheduledFor.toISOString());
      }

      // Next follow-up is relative to this one
      baseTime = scheduledFor;
    }

    return {
      success: true,
      jobIds,
      scheduledTimes
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Parse a delay string like '2d', '4h', '30m' into milliseconds
 */
function parseDelayString(delayStr) {
  const match = delayStr.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Try parsing as number (assume minutes)
    const num = parseInt(delayStr);
    return isNaN(num) ? 0 : num * 60 * 1000;
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 0;
  }
}

// ============================================================================
// Send Job Scheduling
// ============================================================================

/**
 * Schedule an email to be sent
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Workspace ID
 * @param {string} params.executionId - Execution ID
 * @param {string} params.nodeId - Node ID
 * @param {string} params.prospectId - Prospect to send to
 * @param {string} params.subject - Email subject
 * @param {string} params.body - Email body
 * @param {Date|string} params.scheduledFor - When to send (default: now)
 * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
 */
export async function scheduleEmail(params) {
  const {
    workspaceId,
    executionId,
    nodeId,
    prospectId,
    subject,
    body,
    scheduledFor = new Date()
  } = params;

  return enqueueJob({
    workspaceId,
    executionId,
    nodeId,
    jobType: JOB_TYPES.SEND_EMAIL,
    scheduledFor,
    payload: {
      prospect_id: prospectId,
      subject,
      body
    },
    priority: 1,
    maxAttempts: 3
  });
}

/**
 * Schedule a LinkedIn message
 */
export async function scheduleLinkedIn(params) {
  const {
    workspaceId,
    executionId,
    nodeId,
    prospectId,
    message,
    messageType = 'connection_request',
    scheduledFor = new Date()
  } = params;

  return enqueueJob({
    workspaceId,
    executionId,
    nodeId,
    jobType: JOB_TYPES.SEND_LINKEDIN,
    scheduledFor,
    payload: {
      prospect_id: prospectId,
      message,
      message_type: messageType
    },
    priority: 1,
    maxAttempts: 3
  });
}

/**
 * Schedule an SMS message
 */
export async function scheduleSMS(params) {
  const {
    workspaceId,
    executionId,
    nodeId,
    prospectId,
    message,
    scheduledFor = new Date()
  } = params;

  return enqueueJob({
    workspaceId,
    executionId,
    nodeId,
    jobType: JOB_TYPES.SEND_SMS,
    scheduledFor,
    payload: {
      prospect_id: prospectId,
      message
    },
    priority: 1,
    maxAttempts: 3
  });
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if an action is allowed under rate limits
 *
 * @param {string} workspaceId - Workspace ID
 * @param {string} resourceType - Resource type (email, linkedin, sms, claude_api)
 * @param {string} resourceId - Optional specific resource ID
 * @returns {Promise<{allowed: boolean, currentCount?: number, maxCount?: number, retryAfter?: number}>}
 */
export async function checkRateLimit(workspaceId, resourceType, resourceId = null) {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_workspace_id: workspaceId,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_increment: false
    });

    if (error) {
      console.error('[queueService] checkRateLimit error:', error);
      // FAIL CLOSED - deny on error to prevent abuse
      return {
        allowed: false,
        error: 'Rate limit check unavailable - request denied for safety',
        failedClosed: true
      };
    }

    const result = data?.[0] || { allowed: false, current_count: 0, max_count: 0 };

    return {
      allowed: result.allowed,
      currentCount: result.current_count,
      maxCount: result.max_count,
      retryAfter: result.retry_after_seconds || null
    };
  } catch (error) {
    console.error('[queueService] checkRateLimit exception:', error);
    // FAIL CLOSED
    return {
      allowed: false,
      error: error.message,
      failedClosed: true
    };
  }
}

/**
 * Increment rate limit counter
 *
 * @param {string} workspaceId - Workspace ID
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Optional specific resource ID
 * @returns {Promise<{success: boolean, allowed: boolean, currentCount?: number}>}
 */
export async function incrementRateLimit(workspaceId, resourceType, resourceId = null) {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_workspace_id: workspaceId,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_increment: true
    });

    if (error) {
      console.error('[queueService] incrementRateLimit error:', error);
      return { success: false, allowed: true };
    }

    const result = data?.[0] || { allowed: true, current_count: 1 };

    return {
      success: true,
      allowed: result.allowed,
      currentCount: result.current_count
    };
  } catch (error) {
    console.error('[queueService] incrementRateLimit exception:', error);
    return { success: false, allowed: true };
  }
}

/**
 * Get rate limit configuration for a resource type
 *
 * @param {string} resourceType - Resource type
 * @returns {{maxCount: number, windowMinutes: number}}
 */
export function getRateLimitConfig(resourceType) {
  return DEFAULT_RATE_LIMITS[resourceType] || { maxCount: 100, windowMinutes: 60 };
}

// ============================================================================
// Job Claiming (for worker)
// ============================================================================

/**
 * Claim the next available job (for queue worker)
 *
 * @param {string} workerId - Unique worker identifier
 * @param {string[]} jobTypes - Types of jobs to claim
 * @returns {Promise<{success: boolean, job?: Object, error?: string}>}
 */
export async function claimNextJob(workerId, jobTypes = null) {
  try {
    const types = jobTypes || Object.values(JOB_TYPES);

    const { data, error } = await supabase.rpc('claim_next_job', {
      p_worker_id: workerId,
      p_job_types: types
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, job: null }; // No jobs available
    }

    return { success: true, job: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Complete a job
 *
 * @param {string} jobId - Job ID
 * @param {boolean} success - Whether job succeeded
 * @param {string} errorMessage - Error message if failed
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function completeJob(jobId, success, errorMessage = null) {
  try {
    const { error } = await supabase.rpc('complete_job', {
      p_job_id: jobId,
      p_success: success,
      p_error_message: errorMessage
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  JOB_TYPES,
  JOB_STATUS,
  DEFAULT_RATE_LIMITS
};

export default {
  // Core queue operations
  enqueueJob,
  cancelJob,
  cancelExecutionJobs,
  getQueuedJobs,
  getQueueStats,

  // Timer scheduling
  scheduleTimer,
  scheduleFollowUp,

  // Send scheduling
  scheduleEmail,
  scheduleLinkedIn,
  scheduleSMS,

  // Rate limiting
  checkRateLimit,
  incrementRateLimit,
  getRateLimitConfig,

  // Worker operations
  claimNextJob,
  completeJob,

  // Constants
  JOB_TYPES,
  JOB_STATUS
};
