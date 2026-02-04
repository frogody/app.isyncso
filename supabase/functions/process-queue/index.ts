/**
 * Process Queue Edge Function
 *
 * Designed to be called periodically (every minute) by:
 * - Supabase pg_cron
 * - External cron service
 * - Manual trigger
 *
 * Processes jobs from the execution_queue table:
 * - timer: Resumes paused flow executions
 * - send_email: Sends queued emails
 * - send_linkedin: Queues LinkedIn actions
 * - send_sms: Sends SMS messages
 * - follow_up: Executes follow-up sequences
 * - retry: Retries failed node executions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

// ============================================================================
// Configuration
// ============================================================================

const MAX_JOBS_PER_RUN = 10;
const WORKER_ID = `worker-${crypto.randomUUID().slice(0, 8)}`;

const ALLOWED_ORIGINS = [
  'https://app.isyncso.com',
  'https://www.isyncso.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Service-role only - this is an internal function
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: service role required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = serviceRoleKey!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: Array<{
    jobId: string;
    jobType: string;
    success: boolean;
    error?: string;
  }> = [];

  try {
    // Parse request body for options
    let options = { maxJobs: MAX_JOBS_PER_RUN, jobTypes: null };
    try {
      const body = await req.json();
      if (body.maxJobs) options.maxJobs = Math.min(body.maxJobs, 50);
      if (body.jobTypes) options.jobTypes = body.jobTypes;
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log(`[process-queue] Starting worker ${WORKER_ID}, max jobs: ${options.maxJobs}`);

    // Release any stale locks first
    await supabase.rpc('release_stale_locks', { p_stale_minutes: 10 });

    // Process jobs
    for (let i = 0; i < options.maxJobs; i++) {
      // Claim next job
      const { data: jobs, error: claimError } = await supabase.rpc('claim_next_job', {
        p_worker_id: WORKER_ID,
        p_job_types: options.jobTypes || ['timer', 'send_email', 'send_linkedin', 'send_sms', 'webhook', 'retry', 'follow_up']
      });

      if (claimError) {
        console.error('[process-queue] Claim error:', claimError);
        break;
      }

      if (!jobs || jobs.length === 0) {
        console.log('[process-queue] No more jobs available');
        break;
      }

      const job = jobs[0];
      console.log(`[process-queue] Processing job ${job.id} (${job.job_type})`);

      // Process based on job type
      let result: { success: boolean; error?: string };

      try {
        switch (job.job_type) {
          case 'timer':
            result = await processTimerJob(supabase, job);
            break;

          case 'send_email':
            result = await processSendEmailJob(supabase, job);
            break;

          case 'send_linkedin':
            result = await processSendLinkedInJob(supabase, job);
            break;

          case 'send_sms':
            result = await processSendSMSJob(supabase, job);
            break;

          case 'follow_up':
            result = await processFollowUpJob(supabase, job);
            break;

          case 'retry':
            result = await processRetryJob(supabase, job);
            break;

          case 'webhook':
            result = await processWebhookJob(supabase, job);
            break;

          default:
            result = { success: false, error: `Unknown job type: ${job.job_type}` };
        }
      } catch (error) {
        result = { success: false, error: error.message };
      }

      // Complete the job
      await supabase.rpc('complete_job', {
        p_job_id: job.id,
        p_success: result.success,
        p_error_message: result.error || null
      });

      results.push({
        jobId: job.id,
        jobType: job.job_type,
        success: result.success,
        error: result.error
      });
    }

    // Retry failed jobs that haven't exceeded max attempts
    await supabase.rpc('retry_failed_jobs');

    return new Response(
      JSON.stringify({
        success: true,
        workerId: WORKER_ID,
        processedCount: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-queue] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Job Processors
// ============================================================================

/**
 * Process timer job - resume paused execution
 */
async function processTimerJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; node_id: string; payload: Record<string, unknown> }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .select('*, outreach_flows(*)')
      .eq('id', job.execution_id)
      .single();

    if (execError || !execution) {
      return { success: false, error: execError?.message || 'Execution not found' };
    }

    if (execution.status !== 'waiting') {
      return { success: false, error: `Execution status is ${execution.status}, not waiting` };
    }

    // Update execution status to running
    await supabase
      .from('flow_executions')
      .update({
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.execution_id);

    // Find next nodes after timer node
    const flow = execution.outreach_flows;
    const edges = flow.edges || [];
    const nextNodes = edges
      .filter((e: { source: string }) => e.source === job.node_id)
      .map((e: { target: string }) => e.target);

    if (nextNodes.length === 0) {
      // No next nodes - complete execution
      await supabase
        .from('flow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.execution_id);

      return { success: true };
    }

    // Trigger execute-ai-node for next node (or flowEngine resume)
    // For now, we'll call the edge function directly for the next node
    const executeResult = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-flow-node`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          executionId: job.execution_id,
          nodeId: nextNodes[0]
        })
      }
    );

    if (!executeResult.ok) {
      const errorText = await executeResult.text();
      return { success: false, error: `Failed to execute next node: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process send email job
 */
async function processSendEmailJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; node_id: string; payload: Record<string, unknown>; workspace_id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = job.payload || {};
    const prospectId = payload.prospect_id as string;
    const subject = payload.subject as string;
    const body = payload.body as string;

    if (!prospectId || !subject || !body) {
      return { success: false, error: 'Missing email content in payload' };
    }

    // Check rate limit
    const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
      p_workspace_id: job.workspace_id,
      p_resource_type: 'email',
      p_resource_id: null,
      p_increment: false
    });

    if (rateCheck?.[0] && !rateCheck[0].allowed) {
      // Rate limited - re-queue for later
      await supabase
        .from('execution_queue')
        .update({
          status: 'pending',
          scheduled_for: new Date(Date.now() + (rateCheck[0].retry_after_seconds || 60) * 1000).toISOString()
        })
        .eq('id', job.execution_id);

      return { success: false, error: 'Rate limited, re-queued' };
    }

    // Get prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('email, name, company')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospect?.email) {
      return { success: false, error: 'Prospect email not found' };
    }

    // Send email (integrate with your email service)
    // For now, we'll use a placeholder - you can integrate with SendGrid, Resend, etc.
    console.log(`[process-queue] Would send email to ${prospect.email}: ${subject}`);

    // Increment rate limit
    await supabase.rpc('check_rate_limit', {
      p_workspace_id: job.workspace_id,
      p_resource_type: 'email',
      p_resource_id: null,
      p_increment: true
    });

    // Log the interaction
    await supabase
      .from('interaction_memory')
      .insert({
        workspace_id: job.workspace_id,
        prospect_id: prospectId,
        execution_id: job.execution_id,
        interaction_type: 'email_sent',
        channel: 'email',
        content: { subject, body },
        outcome: 'pending'
      });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process LinkedIn message job
 */
async function processSendLinkedInJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; node_id: string; payload: Record<string, unknown>; workspace_id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = job.payload || {};

    // Check rate limit
    const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
      p_workspace_id: job.workspace_id,
      p_resource_type: 'linkedin',
      p_resource_id: null,
      p_increment: false
    });

    if (rateCheck?.[0] && !rateCheck[0].allowed) {
      return { success: false, error: 'Rate limited' };
    }

    // LinkedIn integration would go here
    // For now, log the action
    console.log(`[process-queue] LinkedIn message queued:`, payload);

    // Log the interaction
    await supabase
      .from('interaction_memory')
      .insert({
        workspace_id: job.workspace_id,
        prospect_id: payload.prospect_id,
        execution_id: job.execution_id,
        interaction_type: 'linkedin_queued',
        channel: 'linkedin',
        content: payload,
        outcome: 'pending'
      });

    // Increment rate limit
    await supabase.rpc('check_rate_limit', {
      p_workspace_id: job.workspace_id,
      p_resource_type: 'linkedin',
      p_resource_id: null,
      p_increment: true
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process SMS job
 */
async function processSendSMSJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; node_id: string; payload: Record<string, unknown>; workspace_id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = job.payload || {};
    const prospectId = payload.prospect_id as string;
    const message = payload.message as string;

    if (!prospectId || !message) {
      return { success: false, error: 'Missing SMS content' };
    }

    // Check rate limit
    const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
      p_workspace_id: job.workspace_id,
      p_resource_type: 'sms',
      p_resource_id: null,
      p_increment: false
    });

    if (rateCheck?.[0] && !rateCheck[0].allowed) {
      return { success: false, error: 'Rate limited' };
    }

    // Get prospect phone
    const { data: prospect } = await supabase
      .from('prospects')
      .select('phone, mobile_phone')
      .eq('id', prospectId)
      .single();

    const phone = prospect?.mobile_phone || prospect?.phone;
    if (!phone) {
      return { success: false, error: 'Prospect phone not found' };
    }

    // Call SMS send function (integrate with Twilio)
    const smsResult = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          to: phone,
          message,
          workspaceId: job.workspace_id
        })
      }
    );

    if (!smsResult.ok) {
      const errorText = await smsResult.text();
      return { success: false, error: `SMS send failed: ${errorText}` };
    }

    // Increment rate limit
    await supabase.rpc('check_rate_limit', {
      p_workspace_id: job.workspace_id,
      p_resource_type: 'sms',
      p_resource_id: null,
      p_increment: true
    });

    // Log interaction
    await supabase
      .from('interaction_memory')
      .insert({
        workspace_id: job.workspace_id,
        prospect_id: prospectId,
        execution_id: job.execution_id,
        interaction_type: 'sms_sent',
        channel: 'sms',
        content: { message, phone },
        outcome: 'pending'
      });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process follow-up job
 */
async function processFollowUpJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; node_id: string; payload: Record<string, unknown>; workspace_id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = job.payload || {};
    const followUpNumber = payload.follow_up_number as number || 1;

    console.log(`[process-queue] Processing follow-up #${followUpNumber} for execution ${job.execution_id}`);

    // Call the flow engine to execute the follow-up node
    const result = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-flow-node`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          executionId: job.execution_id,
          nodeId: job.node_id,
          context: {
            follow_up_number: followUpNumber,
            ...payload
          }
        })
      }
    );

    if (!result.ok) {
      const errorText = await result.text();
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process retry job
 */
async function processRetryJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; node_id: string; payload: Record<string, unknown>; attempts: number; max_attempts: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[process-queue] Retrying node ${job.node_id}, attempt ${job.attempts}/${job.max_attempts}`);

    // Call execute-flow-node to retry
    const result = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-flow-node`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          executionId: job.execution_id,
          nodeId: job.node_id,
          isRetry: true,
          retryAttempt: job.attempts
        })
      }
    );

    if (!result.ok) {
      const errorText = await result.text();
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process webhook job
 */
async function processWebhookJob(
  supabase: ReturnType<typeof createClient>,
  job: { execution_id: string; payload: Record<string, unknown> }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = job.payload || {};
    const url = payload.url as string;
    const method = (payload.method as string) || 'POST';
    const body = payload.body as Record<string, unknown>;
    const headers = payload.headers as Record<string, string> || {};

    if (!url) {
      return { success: false, error: 'Webhook URL required' };
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
