/**
 * Execute Action Edge Function
 *
 * Receives an approved action_id from the desktop notch, fetches the
 * pending_actions row, and executes the prepared payload via Composio
 * (for integrations) or internal DB operations (for tasks/notifications).
 *
 * POST /functions/v1/execute-action
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY");
const COMPOSIO_V3_URL = "https://backend.composio.dev/api/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExecuteRequest {
  action_id: string;
  user_id: string;
}

interface PendingAction {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  subtitle: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  status: string;
}

// ---------------------------------------------------------------------------
// Composio tool execution
// ---------------------------------------------------------------------------

async function composioExecute(
  toolSlug: string,
  connectedAccountId: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { success: false, error: "COMPOSIO_API_KEY not configured" };
  }

  // Resolve Composio user_id from connected account
  let composioUserId: string | undefined;
  try {
    const accountRes = await fetch(
      `${COMPOSIO_V3_URL}/connected_accounts/${connectedAccountId}`,
      { headers: { "x-api-key": COMPOSIO_API_KEY, "Content-Type": "application/json" } }
    );
    if (accountRes.ok) {
      const accountData = await accountRes.json();
      composioUserId = accountData.user_id;
    }
  } catch {
    // Non-fatal — proceed without user_id
  }

  const executeBody: Record<string, unknown> = {
    connected_account_id: connectedAccountId,
    arguments: args,
  };
  if (composioUserId) {
    executeBody.entity_id = composioUserId;
    executeBody.user_id = composioUserId;
  }

  try {
    const res = await fetch(`${COMPOSIO_V3_URL}/tools/execute/${toolSlug}`, {
      method: "POST",
      headers: {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(executeBody),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: data.successful !== false,
      data: data.response_data || data.data || data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Composio execution failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Action executors by type
// ---------------------------------------------------------------------------

async function executeCalendarEvent(
  action: PendingAction,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; message: string }> {
  const payload = action.action_payload;
  const params = (payload.params || {}) as Record<string, unknown>;

  // Find user's Google Calendar connection
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("composio_connected_account_id")
    .eq("user_id", action.user_id)
    .eq("toolkit_slug", "googlecalendar")
    .eq("status", "active")
    .maybeSingle();

  if (!integration?.composio_connected_account_id) {
    return { success: false, message: "Google Calendar not connected" };
  }

  const result = await composioExecute(
    "GOOGLECALENDAR_CREATE_EVENT",
    integration.composio_connected_account_id,
    {
      summary: params.summary || action.title,
      start: params.start ? { dateTime: params.start, timeZone: "Europe/Amsterdam" } : undefined,
      end: params.end ? { dateTime: params.end, timeZone: "Europe/Amsterdam" } : undefined,
      attendees: Array.isArray(params.attendees)
        ? params.attendees.map((e: unknown) => ({ email: e }))
        : undefined,
      description: params.description || undefined,
    }
  );

  if (!result.success) {
    return { success: false, message: `Calendar error: ${result.error}` };
  }
  return { success: true, message: "Event created in Google Calendar" };
}

async function executeTaskCreate(
  action: PendingAction,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; message: string }> {
  const params = (action.action_payload.params || {}) as Record<string, unknown>;

  const { error } = await supabase.from("tasks").insert({
    title: (params.title as string) || action.title,
    description: (params.description as string) || null,
    priority: (params.priority as string) || "medium",
    due_date: (params.due_date as string) || null,
    status: "pending",
    created_by: action.user_id,
    company_id: action.company_id,
    source: "notch_action",
    source_ref_id: action.id,
  });

  if (error) {
    return { success: false, message: `Task creation failed: ${error.message}` };
  }
  return { success: true, message: "Task created" };
}

async function executeEmailReply(
  action: PendingAction,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; message: string }> {
  const payload = action.action_payload;
  const integration_type = (payload.integration as string) || "gmail";
  const params = (payload.params || {}) as Record<string, unknown>;

  // Determine toolkit slug
  const toolkitSlug = integration_type === "outlook" ? "outlook" : "gmail";
  const toolSlug =
    toolkitSlug === "gmail" ? "GMAIL_SEND_EMAIL" : "OUTLOOK_SEND_EMAIL";

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("composio_connected_account_id")
    .eq("user_id", action.user_id)
    .eq("toolkit_slug", toolkitSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!integration?.composio_connected_account_id) {
    return {
      success: false,
      message: `${toolkitSlug === "gmail" ? "Gmail" : "Outlook"} not connected`,
    };
  }

  const result = await composioExecute(
    toolSlug,
    integration.composio_connected_account_id,
    {
      to: params.to,
      subject: params.subject,
      body: params.body_draft || params.body,
    }
  );

  if (!result.success) {
    return { success: false, message: `Email error: ${result.error}` };
  }
  return { success: true, message: "Email sent" };
}

async function executeReminder(
  action: PendingAction,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; message: string }> {
  const params = (action.action_payload.params || {}) as Record<string, unknown>;

  const { error } = await supabase.from("user_notifications").insert({
    user_id: action.user_id,
    title: (params.title as string) || action.title,
    message: (params.message as string) || action.subtitle || "Reminder from SYNC",
    type: "reminder",
    read: false,
    metadata: {
      source: "notch_action",
      action_id: action.id,
      remind_at: params.remind_at || null,
    },
  });

  if (error) {
    return { success: false, message: `Reminder creation failed: ${error.message}` };
  }
  return { success: true, message: "Reminder set" };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as ExecuteRequest;

    if (!body.action_id || !body.user_id) {
      return new Response(
        JSON.stringify({ error: "Missing action_id or user_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the pending action
    const { data: action, error: fetchError } = await supabase
      .from("pending_actions")
      .select("*")
      .eq("id", body.action_id)
      .eq("user_id", body.user_id)
      .maybeSingle();

    if (fetchError || !action) {
      return new Response(
        JSON.stringify({ error: "Action not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Verify status allows execution
    if (action.status !== "pending" && action.status !== "approved") {
      return new Response(
        JSON.stringify({
          error: `Action cannot be executed — current status: ${action.status}`,
          action_id: action.id,
          status: action.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Set status to 'executing'
    await supabase
      .from("pending_actions")
      .update({ status: "executing" })
      .eq("id", action.id);

    console.log(
      `[execute-action] Executing action ${action.id} type=${action.action_type}`
    );

    // 4. Execute based on action_type
    let result: { success: boolean; message: string };

    switch (action.action_type) {
      case "calendar_event":
        result = await executeCalendarEvent(action as PendingAction, supabase);
        break;
      case "task_create":
        result = await executeTaskCreate(action as PendingAction, supabase);
        break;
      case "email_reply":
        result = await executeEmailReply(action as PendingAction, supabase);
        break;
      case "reminder":
        result = await executeReminder(action as PendingAction, supabase);
        break;
      default:
        result = {
          success: false,
          message: `Unknown action type: ${action.action_type}`,
        };
    }

    // 5. Update final status
    const finalStatus = result.success ? "completed" : "failed";
    await supabase
      .from("pending_actions")
      .update({
        status: finalStatus,
        status_message: result.message,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", action.id);

    console.log(
      `[execute-action] Action ${action.id} → ${finalStatus}: ${result.message}`
    );

    // 6. Return result
    return new Response(
      JSON.stringify({
        action_id: action.id,
        status: finalStatus,
        message: result.message,
        success: result.success,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[execute-action] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
