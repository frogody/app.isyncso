/**
 * Composio Webhooks Edge Function
 * Handles incoming webhook events from Composio triggers
 *
 * Supported triggers include:
 * - GMAIL_NEW_MESSAGE_RECEIVED
 * - SLACK_NEW_MESSAGE
 * - GOOGLECALENDAR_EVENT_CREATED
 * - GITHUB_PUSH
 * - And many more...
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMPOSIO_WEBHOOK_SECRET = Deno.env.get("COMPOSIO_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-composio-signature",
};

// ============================================
// Types
// ============================================

interface WebhookPayload {
  trigger_slug: string;
  connected_account_id: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

interface ProcessingResult {
  action: string;
  success: boolean;
  message?: string;
  data?: unknown;
}

// ============================================
// Webhook Verification (optional but recommended)
// ============================================

function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  // If no secret configured, skip verification
  if (!COMPOSIO_WEBHOOK_SECRET) {
    console.warn("COMPOSIO_WEBHOOK_SECRET not configured, skipping verification");
    return true;
  }

  // If secret is configured but no signature provided, reject
  if (!signature) {
    console.error("Missing webhook signature");
    return false;
  }

  // Implement HMAC verification if Composio supports it
  // For now, we'll do a simple comparison (update when Composio provides signature spec)
  try {
    // TODO: Implement proper HMAC-SHA256 verification when Composio documents their format
    // const expectedSignature = await crypto.subtle.sign(...)
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Event Processors
// ============================================

/**
 * Process Gmail events
 */
async function processGmailEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const { trigger_slug, data, user_id } = payload;

  switch (trigger_slug) {
    case "GMAIL_NEW_MESSAGE_RECEIVED":
    case "GMAIL_NEW_GMAIL_MESSAGE": {
      // Extract email details — handle both v1 and v3 payload formats
      const email = data as {
        from?: string;
        sender?: string;
        subject?: string;
        snippet?: string;
        message_text?: string;
        date?: string;
        message_timestamp?: string;
        id?: string;
        message_id?: string;
      };
      // Normalize field names (v3 uses sender/message_text/message_timestamp)
      const emailFrom = email.from || email.sender || '';
      const emailSubject = email.subject || '';
      const emailSnippet = email.snippet || email.message_text || '';
      const emailDate = email.date || email.message_timestamp || '';
      const emailId = (data as { id?: string }).id || email.message_id || '';

      console.log(`New Gmail message for user ${user_id}:`, emailSubject);

      // Check for urgent emails FIRST — trigger SYNC knock notification
      if (emailSubject.toLowerCase().includes('urgent')) {
        const senderName = emailFrom.split('<')[0].trim() || emailFrom || 'Someone';
        const { error: knockError } = await supabase.from("user_notifications").insert({
          user_id,
          type: 'sync_knock',
          title: 'Urgent Email',
          message: `${senderName}: ${emailSubject}`,
          metadata: {
            source: 'gmail',
            email_id: emailId,
            sender: emailFrom,
            subject: emailSubject,
            snippet: emailSnippet,
          },
        });
        if (knockError) {
          console.error("Failed to create knock notification:", knockError);
        } else {
          console.log(`[composio-webhooks] SYNC knock triggered for urgent email: "${emailSubject}"`);
        }
      }

      // Also store in inbox_messages (non-critical — don't fail if table issues)
      try {
        const { error } = await supabase.from("inbox_messages").insert({
          user_id,
          source: "gmail",
          source_id: emailId,
          from_address: emailFrom,
          subject: emailSubject,
          preview: emailSnippet,
          received_at: emailDate || new Date().toISOString(),
          read: false,
        });
        if (error) console.error("Failed to store Gmail message:", error.message);
      } catch (e) {
        console.error("inbox_messages insert error:", e);
      }

      return { action: "create_inbox_message", success: true, data: { subject: emailSubject } };
    }

    default:
      return { action: "unknown", success: false, message: `Unknown Gmail trigger: ${trigger_slug}` };
  }
}

/**
 * Process Slack events
 */
async function processSlackEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const { trigger_slug, data, user_id } = payload;

  switch (trigger_slug) {
    case "SLACK_NEW_MESSAGE": {
      const message = data as {
        channel?: string;
        text?: string;
        user?: string;
        ts?: string;
      };

      console.log(`New Slack message for user ${user_id} in ${message.channel}`);

      // Store notification (customize based on your needs)
      return {
        action: "slack_notification",
        success: true,
        data: { channel: message.channel, text: message.text?.substring(0, 100) },
      };
    }

    default:
      return { action: "unknown", success: false, message: `Unknown Slack trigger: ${trigger_slug}` };
  }
}

/**
 * Process Google Calendar events
 */
async function processCalendarEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const { trigger_slug, data, user_id } = payload;

  switch (trigger_slug) {
    case "GOOGLECALENDAR_EVENT_CREATED": {
      const event = data as {
        summary?: string;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
        attendees?: Array<{ email?: string }>;
      };

      console.log(`New calendar event for user ${user_id}:`, event.summary);

      // Create a task or notification for the calendar event
      return {
        action: "calendar_notification",
        success: true,
        data: { summary: event.summary, start: event.start?.dateTime },
      };
    }

    default:
      return { action: "unknown", success: false, message: `Unknown Calendar trigger: ${trigger_slug}` };
  }
}

/**
 * Process GitHub events
 */
async function processGitHubEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const { trigger_slug, data, user_id } = payload;

  switch (trigger_slug) {
    case "GITHUB_PUSH": {
      const push = data as {
        repository?: { name?: string; full_name?: string };
        commits?: Array<{ message?: string; author?: { name?: string } }>;
        ref?: string;
      };

      console.log(`GitHub push for user ${user_id}:`, push.repository?.full_name);

      return {
        action: "github_notification",
        success: true,
        data: {
          repo: push.repository?.full_name,
          branch: push.ref,
          commits: push.commits?.length || 0,
        },
      };
    }

    case "GITHUB_PR_CREATED": {
      const pr = data as {
        title?: string;
        number?: number;
        repository?: { full_name?: string };
        user?: { login?: string };
      };

      console.log(`New PR for user ${user_id}:`, pr.title);

      return {
        action: "github_pr_notification",
        success: true,
        data: { title: pr.title, number: pr.number, repo: pr.repository?.full_name },
      };
    }

    default:
      return { action: "unknown", success: false, message: `Unknown GitHub trigger: ${trigger_slug}` };
  }
}

/**
 * Process HubSpot events
 */
async function processHubSpotEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const { trigger_slug, data, user_id } = payload;

  switch (trigger_slug) {
    case "HUBSPOT_NEW_CONTACT": {
      const contact = data as {
        email?: string;
        firstname?: string;
        lastname?: string;
        company?: string;
      };

      console.log(`New HubSpot contact for user ${user_id}:`, contact.email);

      // Optionally sync to local CRM
      return {
        action: "hubspot_contact_sync",
        success: true,
        data: { email: contact.email, name: `${contact.firstname} ${contact.lastname}` },
      };
    }

    case "HUBSPOT_DEAL_STAGE_CHANGE": {
      const deal = data as {
        dealname?: string;
        dealstage?: string;
        amount?: number;
      };

      console.log(`HubSpot deal stage change for user ${user_id}:`, deal.dealname);

      return {
        action: "hubspot_deal_notification",
        success: true,
        data: { name: deal.dealname, stage: deal.dealstage, amount: deal.amount },
      };
    }

    default:
      return { action: "unknown", success: false, message: `Unknown HubSpot trigger: ${trigger_slug}` };
  }
}

/**
 * Generic event processor for unsupported triggers
 */
async function processGenericEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  console.log(`Generic event: ${payload.trigger_slug} for user ${payload.user_id}`);

  // Store the raw event for manual processing
  return {
    action: "store_raw_event",
    success: true,
    data: { trigger: payload.trigger_slug },
  };
}

/**
 * Route webhook to appropriate processor
 */
async function processWebhook(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const triggerSlug = payload.trigger_slug;

  // Route based on toolkit prefix
  if (triggerSlug.startsWith("GMAIL_")) {
    return processGmailEvent(payload, supabase);
  } else if (triggerSlug.startsWith("SLACK_")) {
    return processSlackEvent(payload, supabase);
  } else if (triggerSlug.startsWith("GOOGLECALENDAR_")) {
    return processCalendarEvent(payload, supabase);
  } else if (triggerSlug.startsWith("GITHUB_")) {
    return processGitHubEvent(payload, supabase);
  } else if (triggerSlug.startsWith("HUBSPOT_")) {
    return processHubSpotEvent(payload, supabase);
  } else {
    return processGenericEvent(payload, supabase);
  }
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-composio-signature");

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse payload — handle both v1 and v3 Composio webhook formats
    const raw = JSON.parse(rawBody);
    console.log(`[composio-webhooks] Raw keys: ${Object.keys(raw).join(', ')}`);

    // v3 may nest data differently: { trigger_id, trigger_name, connected_account_id, payload: {...} }
    const payload: WebhookPayload = {
      trigger_slug: raw.trigger_slug || raw.trigger_name || raw.triggerSlug || raw.triggerName || '',
      connected_account_id: raw.connected_account_id || raw.connectedAccountId || '',
      user_id: raw.user_id || raw.userId || '',
      data: raw.data || raw.payload || raw,
      timestamp: raw.timestamp || raw.created_at || '',
    };

    // If user_id not in webhook, look it up from connected account
    if (!payload.user_id && payload.connected_account_id) {
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('user_id')
        .eq('composio_connected_account_id', payload.connected_account_id)
        .single();
      if (integration) payload.user_id = integration.user_id;
    }

    console.log(`Received webhook: ${payload.trigger_slug} for user ${payload.user_id}`);

    // Store raw event for audit trail
    const { data: eventRecord, error: storeError } = await supabase
      .from("composio_webhook_events")
      .insert({
        user_id: payload.user_id,
        connected_account_id: payload.connected_account_id,
        trigger_slug: payload.trigger_slug,
        payload: payload.data,
        processed: false,
      })
      .select()
      .single();

    if (storeError) {
      console.error("Failed to store webhook event:", storeError);
    }

    // Process the webhook
    const result = await processWebhook(payload, supabase);

    // Update event as processed
    if (eventRecord) {
      await supabase
        .from("composio_webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error: result.success ? null : result.message,
        })
        .eq("id", eventRecord.id);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        processed: result.action,
        result: result.success,
        message: result.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
