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
    "authorization, x-client-info, apikey, content-type, x-composio-signature, webhook-signature",
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
// Webhook Verification (HMAC-SHA256)
// ============================================

async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  const secret = COMPOSIO_WEBHOOK_SECRET;

  // Fail closed: if no secret is configured, reject all requests
  if (!secret) {
    console.warn("[composio-webhooks] COMPOSIO_WEBHOOK_SECRET is not set — rejecting request (fail closed)");
    return false;
  }

  // If no signature was provided in the request, reject
  if (!signature) {
    console.warn("[composio-webhooks] No webhook signature header present — rejecting request");
    return false;
  }

  try {
    // Import the secret as an HMAC key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    // Compute HMAC-SHA256 of the raw payload
    const payloadData = encoder.encode(payload);
    const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, payloadData);

    // Convert to hex string
    const expectedHex = Array.from(new Uint8Array(expectedSigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Strip any algorithm prefix (e.g. "sha256=" or "hmac-sha256=")
    const receivedHex = signature.replace(/^(sha256=|hmac-sha256=)/i, "").toLowerCase();

    // Timing-safe comparison using crypto.subtle.verify:
    // We compare by signing the received hex and expected hex and checking equality
    // of fixed-length digests to avoid timing leaks from string comparison.
    if (receivedHex.length !== expectedHex.length) {
      console.warn("[composio-webhooks] Signature length mismatch — rejecting request");
      return false;
    }

    // Constant-time comparison: compute HMAC of both strings and compare digests
    const receivedBytes = encoder.encode(receivedHex);
    const expectedBytes = encoder.encode(expectedHex);
    const cmpKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const hmacReceived = await crypto.subtle.sign("HMAC", cmpKey, receivedBytes);
    const hmacExpected = await crypto.subtle.sign("HMAC", cmpKey, expectedBytes);

    const a = new Uint8Array(hmacReceived);
    const b = new Uint8Array(hmacExpected);
    let match = a.length === b.length ? 1 : 0;
    for (let i = 0; i < a.length; i++) {
      match &= a[i] === b[i] ? 1 : 0;
    }

    if (match !== 1) {
      console.warn("[composio-webhooks] Webhook signature mismatch — rejecting request");
      return false;
    }

    console.log("[composio-webhooks] Webhook signature verified successfully");
    return true;
  } catch (err) {
    console.error("[composio-webhooks] Signature verification error:", err);
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
      const emailThreadId = (data as { thread_id?: string }).thread_id || '';

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
            thread_id: emailThreadId,
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
 * Process LinkedIn events — reply detection for talent outreach
 */
async function processLinkedInEvent(
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<ProcessingResult> {
  const { trigger_slug, data, user_id } = payload;

  switch (trigger_slug) {
    case "LINKEDIN_NEW_MESSAGE_RECEIVED":
    case "LINKEDIN_NEW_MESSAGE": {
      const msg = data as {
        from_profile_url?: string;
        from_name?: string;
        message?: string;
        text?: string;
        conversation_id?: string;
      };

      const senderUrl = msg.from_profile_url || '';
      const senderName = msg.from_name || '';
      const messageText = msg.message || msg.text || '';

      console.log(`[composio-webhooks] LinkedIn message from ${senderName || senderUrl}`);

      // Try to match against outreach tasks by LinkedIn profile URL
      if (senderUrl) {
        const { data: matchedTasks } = await supabase
          .from('outreach_tasks')
          .select('id, candidate_id, campaign_id, status')
          .eq('status', 'sent')
          .not('candidate_id', 'is', null);

        if (matchedTasks && matchedTasks.length > 0) {
          // Get candidates with matching LinkedIn profiles
          const candidateIds = matchedTasks.map(t => t.candidate_id);
          const { data: candidates } = await supabase
            .from('candidates')
            .select('id, linkedin_profile')
            .in('id', candidateIds);

          const normalizeUrl = (url: string) => url.toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '');
          const normalizedSender = normalizeUrl(senderUrl);

          const matchedCandidate = candidates?.find(c =>
            c.linkedin_profile && normalizeUrl(c.linkedin_profile) === normalizedSender
          );

          if (matchedCandidate) {
            // Mark matching outreach tasks as replied
            const tasksToUpdate = matchedTasks.filter(t => t.candidate_id === matchedCandidate.id);
            for (const task of tasksToUpdate) {
              await supabase
                .from('outreach_tasks')
                .update({
                  status: 'replied',
                  metadata: {
                    reply_content: messageText.substring(0, 500),
                    replied_at: new Date().toISOString(),
                    reply_source: 'linkedin_webhook',
                  },
                })
                .eq('id', task.id);
            }

            console.log(`[composio-webhooks] Marked ${tasksToUpdate.length} task(s) as replied for candidate ${matchedCandidate.id}`);

            return {
              action: "talent_reply_detected",
              success: true,
              data: { candidate_id: matchedCandidate.id, tasks_updated: tasksToUpdate.length },
            };
          }
        }
      }

      return { action: "linkedin_message_received", success: true, data: { from: senderName } };
    }

    default:
      return { action: "unknown", success: false, message: `Unknown LinkedIn trigger: ${trigger_slug}` };
  }
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
    // Check for talent outreach reply detection FIRST
    const gmailResult = await processGmailEvent(payload, supabase);

    // After processing Gmail event, also check for talent outreach replies
    if (triggerSlug === "GMAIL_NEW_MESSAGE_RECEIVED" || triggerSlug === "GMAIL_NEW_GMAIL_MESSAGE") {
      const emailData = payload.data as { from?: string; sender?: string; subject?: string; message_text?: string };
      const senderEmail = (emailData.from || emailData.sender || '').match(/<([^>]+)>/)?.[1] || emailData.from || emailData.sender || '';

      if (senderEmail) {
        // Check if sender matches any candidate in sent outreach tasks
        const { data: candidates } = await supabase
          .from('candidates')
          .select('id, email')
          .ilike('email', senderEmail.toLowerCase().trim());

        if (candidates && candidates.length > 0) {
          const candidateIds = candidates.map(c => c.id);
          const { data: matchedTasks } = await supabase
            .from('outreach_tasks')
            .select('id')
            .in('candidate_id', candidateIds)
            .eq('status', 'sent')
            .eq('channel', 'email');

          if (matchedTasks && matchedTasks.length > 0) {
            for (const task of matchedTasks) {
              await supabase
                .from('outreach_tasks')
                .update({
                  status: 'replied',
                  metadata: {
                    reply_content: (emailData.subject || '') + ': ' + (emailData.message_text || '').substring(0, 300),
                    replied_at: new Date().toISOString(),
                    reply_source: 'gmail_webhook',
                  },
                })
                .eq('id', task.id);
            }
            console.log(`[composio-webhooks] Detected email reply from ${senderEmail}, updated ${matchedTasks.length} task(s)`);
          }
        }
      }
    }

    return gmailResult;
  } else if (triggerSlug.startsWith("LINKEDIN_")) {
    return processLinkedInEvent(payload, supabase);
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
    const signature = req.headers.get("webhook-signature") || req.headers.get("x-composio-signature");

    // Verify webhook signature (async HMAC-SHA256)
    if (!(await verifyWebhookSignature(rawBody, signature))) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse payload — handle v1, v3, and raw-body Composio webhook formats
    const raw = JSON.parse(rawBody);
    const rawKeys = Object.keys(raw);
    console.log(`[composio-webhooks] Raw keys: ${rawKeys.join(', ')}`);
    console.log(`[composio-webhooks] Raw payload (first 500 chars): ${rawBody.substring(0, 500)}`);

    // Detect Composio v3 "raw body" format: { headers: {...}, body: { email fields... } }
    // In this format there's NO trigger_slug or connected_account_id — we must infer them
    const isV3RawBody = raw.body && typeof raw.body === 'object' && raw.headers && typeof raw.headers === 'object';

    let payload: WebhookPayload;

    if (isV3RawBody) {
      console.log(`[composio-webhooks] Detected v3 raw-body format`);
      const bodyData = raw.body as Record<string, unknown>;
      const bodyKeys = Object.keys(bodyData);
      console.log(`[composio-webhooks] Body keys: ${bodyKeys.join(', ')}`);

      // Infer trigger_slug from body content
      let inferredTrigger = '';
      if (bodyData.sender || bodyData.subject || bodyData.message_text || bodyData.thread_id) {
        inferredTrigger = 'GMAIL_NEW_GMAIL_MESSAGE';
      } else if (bodyData.channel || (bodyData.text && bodyData.ts)) {
        inferredTrigger = 'SLACK_NEW_MESSAGE';
      } else if (bodyData.summary && (bodyData.start || bodyData.end)) {
        inferredTrigger = 'GOOGLECALENDAR_EVENT_CREATED';
      } else if (bodyData.commits || bodyData.ref) {
        inferredTrigger = 'GITHUB_PUSH';
      }
      console.log(`[composio-webhooks] Inferred trigger: ${inferredTrigger}`);

      payload = {
        trigger_slug: inferredTrigger,
        connected_account_id: '',
        user_id: '',
        data: bodyData,
        timestamp: (bodyData.message_timestamp as string) || (bodyData.date as string) || '',
      };
    } else {
      // Check if this is a flat Composio trigger payload (no trigger metadata, email data at top level)
      const hasTriggerMeta = raw.trigger_slug || raw.trigger_name || raw.triggerSlug || raw.triggerName;

      if (!hasTriggerMeta && (raw.sender || raw.subject || raw.message_text || raw.thread_id)) {
        // Flat Gmail payload from Composio trigger — data at top level
        console.log(`[composio-webhooks] Detected flat Gmail payload (no trigger metadata)`);
        payload = {
          trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
          connected_account_id: '',
          user_id: '',
          data: raw,
          timestamp: raw.message_timestamp || '',
        };
      } else if (!hasTriggerMeta && (raw.channel || (raw.text && raw.ts))) {
        console.log(`[composio-webhooks] Detected flat Slack payload`);
        payload = {
          trigger_slug: 'SLACK_NEW_MESSAGE',
          connected_account_id: '',
          user_id: '',
          data: raw,
          timestamp: raw.ts || '',
        };
      } else {
        // Standard v1 format with explicit trigger metadata
        payload = {
          trigger_slug: raw.trigger_slug || raw.trigger_name || raw.triggerSlug || raw.triggerName || '',
          connected_account_id: raw.connected_account_id || raw.connectedAccountId || '',
          user_id: raw.user_id || raw.userId || '',
          data: raw.data || raw.payload || raw,
          timestamp: raw.timestamp || raw.created_at || '',
        };
      }
    }

    // If user_id not in webhook, look it up from connected account
    if (!payload.user_id && payload.connected_account_id) {
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('user_id')
        .eq('composio_connected_account_id', payload.connected_account_id)
        .single();
      if (integration) payload.user_id = integration.user_id;
    }

    // If STILL no user_id (v3 raw-body has no connected_account_id), look up by email recipient
    if (!payload.user_id) {
      const emailTo = (payload.data.to as string) || '';
      const emailMatch = emailTo.match(/<([^>]+)>/) || [null, emailTo];
      const recipientEmail = (emailMatch[1] || '').toLowerCase().trim();
      console.log(`[composio-webhooks] No user_id, trying recipient email: ${recipientEmail}`);

      if (recipientEmail) {
        const { data: userByEmail } = await supabase
          .from('users')
          .select('id')
          .eq('email', recipientEmail)
          .maybeSingle();
        if (userByEmail) {
          payload.user_id = userByEmail.id;
          console.log(`[composio-webhooks] Found user by email: ${payload.user_id}`);
        }
      }

      // Last resort: if only one user has Gmail connected, use that user
      if (!payload.user_id) {
        const { data: gmailUsers } = await supabase
          .from('user_integrations')
          .select('user_id')
          .eq('toolkit_slug', 'gmail')
          .eq('status', 'ACTIVE');
        if (gmailUsers && gmailUsers.length === 1) {
          payload.user_id = gmailUsers[0].user_id;
          console.log(`[composio-webhooks] Fallback: single Gmail user: ${payload.user_id}`);
        }
      }
    }

    // Safety net: if trigger_slug is STILL empty, try to infer from data
    if (!payload.trigger_slug && payload.data) {
      const d = payload.data;
      if (d.sender || d.subject || d.message_text || d.thread_id) {
        payload.trigger_slug = 'GMAIL_NEW_GMAIL_MESSAGE';
        console.log(`[composio-webhooks] Safety net: inferred GMAIL from data fields`);
      } else if (d.channel || (d.text && d.ts)) {
        payload.trigger_slug = 'SLACK_NEW_MESSAGE';
        console.log(`[composio-webhooks] Safety net: inferred SLACK from data fields`);
      }
    }

    console.log(`[composio-webhooks] v3 | trigger=${payload.trigger_slug} user=${payload.user_id} keys=${Object.keys(payload.data || {}).slice(0, 5).join(',')}`);

    // ============================================
    // EMAIL POOL CHECK — before user-level processing
    // ============================================
    if (
      payload.trigger_slug === 'GMAIL_NEW_GMAIL_MESSAGE' ||
      payload.trigger_slug === 'GMAIL_NEW_MESSAGE_RECEIVED' ||
      payload.trigger_slug === 'OUTLOOK_MESSAGE_TRIGGER'
    ) {
      // Try to match by connected_account_id first, then by recipient email
      let poolAccount: Record<string, unknown> | null = null;

      if (payload.connected_account_id) {
        const { data: pa } = await supabase
          .from('email_pool_accounts')
          .select('*')
          .eq('composio_connected_account_id', payload.connected_account_id)
          .eq('is_active', true)
          .maybeSingle();
        if (pa) poolAccount = pa;
      }

      if (!poolAccount) {
        // Try matching by recipient email address
        const emailTo = (payload.data.to as string) || '';
        const toMatch = emailTo.match(/<([^>]+)>/) || [null, emailTo];
        const recipientAddr = (toMatch[1] || '').toLowerCase().trim();
        if (recipientAddr) {
          const { data: pa } = await supabase
            .from('email_pool_accounts')
            .select('*')
            .eq('email_address', recipientAddr)
            .eq('is_active', true)
            .maybeSingle();
          if (pa) poolAccount = pa;
        }
      }

      if (poolAccount) {
        console.log(`[composio-webhooks] EMAIL POOL match: ${poolAccount.email_address} (${poolAccount.id})`);

        // Normalize email fields
        const emailData = payload.data as Record<string, string | undefined>;
        const emailFrom = emailData.from || emailData.sender || '';
        const emailSubject = emailData.subject || '';
        const emailSnippet = emailData.snippet || emailData.message_text || '';
        const emailBody = emailData.body || emailData.message_text || emailSnippet;
        const emailDate = emailData.date || emailData.message_timestamp || new Date().toISOString();
        const emailSourceId = emailData.id || emailData.message_id || '';
        const emailThreadId = emailData.thread_id || '';

        // Quick pattern match against supplier_email_patterns
        let matchedSupplier: Record<string, unknown> | null = null;
        const { data: patterns } = await supabase
          .from('supplier_email_patterns')
          .select('*')
          .eq('company_id', poolAccount.company_id)
          .eq('is_active', true);

        if (patterns) {
          const senderLower = emailFrom.toLowerCase();
          const subjectLower = emailSubject.toLowerCase();
          for (const pattern of patterns) {
            const senderMatch = (pattern.sender_patterns as string[])?.some(
              (p: string) => senderLower.includes(p.toLowerCase().replace('@', ''))
            );
            const subjectMatch = (pattern.subject_patterns as string[])?.some(
              (p: string) => {
                try { return new RegExp(p, 'i').test(subjectLower); }
                catch { return subjectLower.includes(p.toLowerCase()); }
              }
            );
            if (senderMatch || subjectMatch) {
              matchedSupplier = pattern;
              break;
            }
          }
        }

        // Check for duplicate by email_source_id
        let isDuplicate = false;
        if (emailSourceId) {
          const { data: existingLog } = await supabase
            .from('email_pool_sync_log')
            .select('id')
            .eq('email_source_id', emailSourceId)
            .limit(1)
            .maybeSingle();
          if (existingLog) isDuplicate = true;
        }

        // Create sync log entry
        const { data: syncLog } = await supabase
          .from('email_pool_sync_log')
          .insert({
            company_id: poolAccount.company_id,
            email_pool_account_id: poolAccount.id,
            email_from: emailFrom,
            email_to: emailData.to || (poolAccount.email_address as string),
            email_subject: emailSubject,
            email_snippet: emailSnippet.substring(0, 500),
            email_body: (emailBody || '').substring(0, 10000),
            email_date: emailDate,
            email_source_id: emailSourceId,
            email_thread_id: emailThreadId,
            status: isDuplicate ? 'duplicate' : 'pending',
            is_duplicate: isDuplicate,
          })
          .select('id')
          .single();

        if (isDuplicate || !syncLog) {
          console.log(`[composio-webhooks] Pool email ${isDuplicate ? 'duplicate' : 'log failed'}, skipping`);
          return new Response(
            JSON.stringify({ success: true, processed: 'email_pool_duplicate' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If pattern matched or subject looks like an order, call process-order-email
        const looksLikeOrder = matchedSupplier ||
          /order|bestelling|bevestig|confirm|shipped|verzonden|tracking/i.test(emailSubject);

        if (looksLikeOrder) {
          console.log(`[composio-webhooks] Pool email → process-order-email (supplier: ${matchedSupplier?.supplier_name || 'unknown'})`);
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

          // Fire-and-forget call to process-order-email
          fetch(`${supabaseUrl}/functions/v1/process-order-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              company_id: poolAccount.company_id,
              email_pool_account_id: poolAccount.id,
              sync_log_id: syncLog.id,
              email_subject: emailSubject,
              email_body: emailBody,
              email_from: emailFrom,
              email_date: emailDate,
              matched_supplier: matchedSupplier ? {
                supplier_id: matchedSupplier.supplier_id,
                supplier_name: matchedSupplier.supplier_name,
                country: matchedSupplier.country,
                custom_extraction_hints: matchedSupplier.custom_extraction_hints,
              } : null,
              auto_approve_orders: poolAccount.auto_approve_orders,
              auto_approve_threshold: poolAccount.auto_approve_threshold,
              default_sales_channel: poolAccount.default_sales_channel,
            }),
          }).catch(err => console.error('[composio-webhooks] process-order-email call failed:', err));
        } else {
          // Not order-related, mark as skipped
          await supabase
            .from('email_pool_sync_log')
            .update({ status: 'skipped', classification: 'other', classification_method: 'skipped' })
            .eq('id', syncLog.id);
        }

        // Return early — pool emails don't go through user inbox flow
        return new Response(
          JSON.stringify({ success: true, processed: 'email_pool', sync_log_id: syncLog.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // EMAIL INVOICE IMPORT CHECK — detect invoice attachments
    // ============================================
    if (
      (payload.trigger_slug === 'GMAIL_NEW_GMAIL_MESSAGE' ||
       payload.trigger_slug === 'GMAIL_NEW_MESSAGE_RECEIVED') &&
      payload.connected_account_id
    ) {
      // Check if any email_import_settings exist for this connected account
      const { data: importSettings } = await supabase
        .from('email_import_settings')
        .select('id')
        .eq('connected_account_id', payload.connected_account_id)
        .eq('is_active', true)
        .maybeSingle();

      if (importSettings) {
        const emailData = payload.data as Record<string, unknown>;
        const hasAttachments = emailData.has_attachments ||
          (emailData.attachments && (emailData.attachments as unknown[]).length > 0) ||
          false;

        if (hasAttachments) {
          console.log(`[composio-webhooks] Invoice import: forwarding email with attachments to email-invoice-import`);
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

          // Fire-and-forget call to email-invoice-import
          fetch(`${supabaseUrl}/functions/v1/email-invoice-import`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: emailData,
              connected_account_id: payload.connected_account_id,
            }),
          }).catch(err => console.error('[composio-webhooks] email-invoice-import call failed:', err));
        }
      }
    }

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
