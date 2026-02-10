/**
 * Supabase Edge Function: executeTalentOutreach
 * Core sending engine for talent recruitment outreach.
 *
 * Sends approved outreach tasks via LinkedIn (Composio), Email (Composio/Gmail), or SMS (Twilio).
 * Respects per-user per-channel daily rate limits.
 * Logs every attempt to outreach_execution_log.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");
const COMPOSIO_V3_URL = "https://backend.composio.dev/api/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecutionRequest {
  campaign_id?: string;
  user_id: string;
  limit?: number;
  channels?: string[]; // filter by channel
}

interface ExecutionSummary {
  sent: number;
  failed: number;
  skipped_rate_limit: number;
  skipped_no_connection: number;
  details: Array<{
    task_id: string;
    candidate_name: string;
    channel: string;
    status: string;
    error?: string;
  }>;
}

// ============================================================================
// Composio Tool Execution
// ============================================================================

async function executeComposioTool(
  connectedAccountId: string,
  toolSlug: string,
  args: Record<string, unknown>,
  entityId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { success: false, error: "COMPOSIO_API_KEY not configured" };
  }

  try {
    const response = await fetch(`${COMPOSIO_V3_URL}/tools/execute/${toolSlug}`, {
      method: "POST",
      headers: {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connected_account_id: connectedAccountId,
        arguments: args,
        ...(entityId ? { entity_id: entityId } : {}),
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error || result.successful === false) {
      const errMsg = result.message || result.error || result.detail || `HTTP ${response.status}`;
      return { success: false, error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };
    }

    return { success: true, data: result.data || result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Get user's Composio connection for a toolkit
// ============================================================================

async function getConnectionForToolkit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  toolkitSlug: string
): Promise<string | null> {
  const { data } = await supabase
    .from('user_integrations')
    .select('composio_connected_account_id')
    .eq('user_id', userId)
    .eq('toolkit_slug', toolkitSlug)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();

  return data?.composio_connected_account_id || null;
}

// ============================================================================
// Log execution attempt
// ============================================================================

async function logExecution(
  supabase: ReturnType<typeof createClient>,
  entry: {
    task_id: string;
    user_id: string;
    organization_id: string;
    channel: string;
    action: string;
    status: string;
    external_id?: string;
    error?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    await supabase.from('outreach_execution_log').insert(entry);
  } catch (e) {
    console.error('[executeTalentOutreach] Failed to log execution:', e);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ExecutionRequest = await req.json();
    const { campaign_id, user_id, limit = 25, channels } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user_id)
      .single();

    const organizationId = userData?.organization_id;

    // Query approved_ready tasks
    let query = supabase
      .from('outreach_tasks')
      .select('*, candidates(name, email, linkedin_profile, phone)')
      .eq('status', 'approved_ready')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }
    if (channels && channels.length > 0) {
      query = query.in('channel', channels);
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      return new Response(
        JSON.stringify({ error: tasksError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, skipped_rate_limit: 0, skipped_no_connection: 0, details: [], message: "No approved tasks to send." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summary: ExecutionSummary = {
      sent: 0,
      failed: 0,
      skipped_rate_limit: 0,
      skipped_no_connection: 0,
      details: [],
    };

    for (const task of tasks) {
      const channel = task.channel || 'linkedin';
      const candidateName = task.candidates?.name || task.candidate_id;

      // 1. Check rate limit
      const { data: withinLimit } = await supabase
        .rpc('check_and_increment_rate_limit', {
          p_user_id: user_id,
          p_channel: channel,
        });

      if (!withinLimit) {
        summary.skipped_rate_limit++;
        summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'skipped_rate_limit' });
        await logExecution(supabase, {
          task_id: task.id,
          user_id,
          organization_id: organizationId,
          channel,
          action: 'send',
          status: 'skipped_rate_limit',
        });
        continue;
      }

      // 2. Send based on channel
      let sendResult: { success: boolean; externalId?: string; error?: string } = { success: false, error: 'Unknown channel' };

      if (channel === 'linkedin') {
        const connId = await getConnectionForToolkit(supabase, user_id, 'linkedin');
        if (!connId) {
          summary.skipped_no_connection++;
          summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'no_connection' });
          await logExecution(supabase, {
            task_id: task.id, user_id, organization_id: organizationId,
            channel, action: 'send', status: 'skipped_no_connection',
            error: 'No LinkedIn connection found',
          });
          continue;
        }

        const recipientUrl = task.candidates?.linkedin_profile || task.metadata?.linkedin_url;
        const message = task.generated_message || task.metadata?.message;

        if (!recipientUrl || !message) {
          summary.failed++;
          const err = !recipientUrl ? 'No LinkedIn profile URL' : 'No message content';
          await supabase.from('outreach_tasks').update({ status: 'failed', send_error: err }).eq('id', task.id);
          summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'failed', error: err });
          await logExecution(supabase, { task_id: task.id, user_id, organization_id: organizationId, channel, action: 'send', status: 'failed', error: err });
          continue;
        }

        const result = await executeComposioTool(connId, 'LINKEDIN_SEND_MESSAGE', {
          recipient_profile_url: recipientUrl,
          message,
        }, user_id);

        sendResult = { success: result.success, externalId: result.data?.id, error: result.error };

      } else if (channel === 'email') {
        const connId = await getConnectionForToolkit(supabase, user_id, 'gmail');
        if (!connId) {
          summary.skipped_no_connection++;
          summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'no_connection' });
          await logExecution(supabase, { task_id: task.id, user_id, organization_id: organizationId, channel, action: 'send', status: 'skipped_no_connection', error: 'No Gmail connection found' });
          continue;
        }

        const recipientEmail = task.candidates?.email || task.metadata?.email;
        const subject = task.metadata?.subject || `Opportunity at ${task.metadata?.company_name || 'our company'}`;
        const body = task.generated_message || task.metadata?.message;

        if (!recipientEmail || !body) {
          summary.failed++;
          const err = !recipientEmail ? 'No email address' : 'No message content';
          await supabase.from('outreach_tasks').update({ status: 'failed', send_error: err }).eq('id', task.id);
          summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'failed', error: err });
          await logExecution(supabase, { task_id: task.id, user_id, organization_id: organizationId, channel, action: 'send', status: 'failed', error: err });
          continue;
        }

        const result = await executeComposioTool(connId, 'GMAIL_SEND_EMAIL', {
          recipient_email: recipientEmail,
          subject,
          body,
        }, user_id);

        sendResult = { success: result.success, externalId: result.data?.id, error: result.error };

      } else if (channel === 'sms') {
        const phoneNumber = task.candidates?.phone || task.metadata?.phone;
        const message = task.generated_message || task.metadata?.message;

        if (!phoneNumber || !message) {
          summary.failed++;
          const err = !phoneNumber ? 'No phone number' : 'No message content';
          await supabase.from('outreach_tasks').update({ status: 'failed', send_error: err }).eq('id', task.id);
          summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'failed', error: err });
          await logExecution(supabase, { task_id: task.id, user_id, organization_id: organizationId, channel, action: 'send', status: 'failed', error: err });
          continue;
        }

        // Call internal sms-send edge function
        try {
          const smsRes = await fetch(`${supabaseUrl}/functions/v1/sms-send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              candidate_id: task.candidate_id,
              organization_id: organizationId,
              campaign_id: task.campaign_id,
              phone_number: phoneNumber,
              message,
            }),
          });

          const smsResult = await smsRes.json();
          sendResult = {
            success: smsResult.success,
            externalId: smsResult.message_sid,
            error: smsResult.error,
          };
        } catch (smsErr) {
          sendResult = { success: false, error: String(smsErr) };
        }
      }

      // 3. Update task based on result
      if (sendResult.success) {
        summary.sent++;
        await supabase.from('outreach_tasks').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_message_id: sendResult.externalId || null,
          send_error: null,
        }).eq('id', task.id);
        summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'sent' });
        await logExecution(supabase, {
          task_id: task.id, user_id, organization_id: organizationId,
          channel, action: 'send', status: 'sent',
          external_id: sendResult.externalId,
        });
      } else {
        summary.failed++;
        await supabase.from('outreach_tasks').update({
          status: 'failed',
          send_error: sendResult.error || 'Unknown error',
        }).eq('id', task.id);
        summary.details.push({ task_id: task.id, candidate_name: candidateName, channel, status: 'failed', error: sendResult.error });
        await logExecution(supabase, {
          task_id: task.id, user_id, organization_id: organizationId,
          channel, action: 'send', status: 'failed',
          error: sendResult.error,
        });
      }
    }

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[executeTalentOutreach] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
