/**
 * Analyze Action Edge Function
 *
 * Receives context events from the desktop MLX model, validates and enriches
 * them via Together.ai LLM, checks user integrations, and upserts into
 * pending_actions for Realtime delivery back to the desktop notch.
 *
 * POST /functions/v1/analyze-action
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
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

interface AnalyzeRequest {
  action_id: string;
  event_hash: string;
  user_id: string;
  company_id: string;
  action_type: string;
  local_title: string;
  local_confidence: number;
  trigger_context: Record<string, unknown>;
}

interface EnrichedAction {
  title: string;
  subtitle: string | null;
  cloud_confidence: number;
  action_payload: Record<string, unknown>;
  is_actionable: boolean;
  invalidation_reason?: string;
}

// ---------------------------------------------------------------------------
// LLM enrichment
// ---------------------------------------------------------------------------

async function enrichWithLLM(
  actionType: string,
  localTitle: string,
  triggerContext: Record<string, unknown>,
  userIntegrations: string[]
): Promise<EnrichedAction> {
  if (!TOGETHER_API_KEY) {
    // Fallback: pass through local data without enrichment
    return {
      title: localTitle,
      subtitle: null,
      cloud_confidence: 0.5,
      action_payload: {},
      is_actionable: true,
    };
  }

  const systemPrompt = `You are an action enrichment engine for a desktop productivity assistant.
You receive a context event detected by a local MLX model and must:

1. Determine if the event is truly actionable (not a false positive).
2. Enrich the notification title with specific details (dates, times, names) from the context.
3. Generate the full execution payload for the action type.

The user has these integrations connected: ${userIntegrations.length > 0 ? userIntegrations.join(", ") : "none"}.

Action types and their expected payloads:
- calendar_event: { integration: "google_calendar", operation: "create_event", params: { summary, start (ISO), end (ISO), attendees: [email], description? } }
- task_create: { integration: "internal", operation: "create_task", params: { title, description?, priority?: "high"|"medium"|"low", due_date? (ISO) } }
- email_reply: { integration: "gmail"|"outlook", operation: "send_email", params: { to, subject, body_draft } }
- reminder: { integration: "internal", operation: "create_notification", params: { title, message, remind_at (ISO) } }

Today is ${new Date().toISOString().split("T")[0]}.

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "is_actionable": boolean,
  "title": "max 60 char enriched notch text",
  "subtitle": "optional detail line or null",
  "cloud_confidence": 0.0-1.0,
  "action_payload": { ... full execution payload ... },
  "invalidation_reason": "reason if not actionable, else null"
}`;

  const userMessage = `Action type: ${actionType}
Local title: ${localTitle}
Context event:
${JSON.stringify(triggerContext, null, 2)}`;

  try {
    const response = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `[analyze-action] LLM API error: ${response.status} ${response.statusText}`
      );
      // Fallback to local data
      return {
        title: localTitle,
        subtitle: null,
        cloud_confidence: 0.5,
        action_payload: {},
        is_actionable: true,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty LLM response");
    }

    const parsed = JSON.parse(content) as EnrichedAction;
    return {
      title: parsed.title || localTitle,
      subtitle: parsed.subtitle || null,
      cloud_confidence:
        typeof parsed.cloud_confidence === "number"
          ? parsed.cloud_confidence
          : 0.5,
      action_payload: parsed.action_payload || {},
      is_actionable: parsed.is_actionable !== false,
      invalidation_reason: parsed.invalidation_reason || undefined,
    };
  } catch (err) {
    console.error("[analyze-action] LLM enrichment failed:", err);
    return {
      title: localTitle,
      subtitle: null,
      cloud_confidence: 0.5,
      action_payload: {},
      is_actionable: true,
    };
  }
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
    const body = (await req.json()) as AnalyzeRequest;

    // Validate required fields
    const required = [
      "action_id",
      "event_hash",
      "user_id",
      "company_id",
      "action_type",
      "local_title",
    ] as const;
    for (const field of required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check dedup — does this event_hash already exist for this user?
    const { data: existing } = await supabase
      .from("pending_actions")
      .select("id, status, title, subtitle, action_type, action_payload, cloud_confidence")
      .eq("user_id", body.user_id)
      .eq("event_hash", body.event_hash)
      .maybeSingle();

    if (existing) {
      console.log(
        `[analyze-action] Dedup hit: event_hash=${body.event_hash} already exists as action ${existing.id}`
      );
      return new Response(
        JSON.stringify({
          action_id: existing.id,
          status: existing.status,
          title: existing.title,
          subtitle: existing.subtitle,
          action_type: existing.action_type,
          action_payload: existing.action_payload,
          deduplicated: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Query user's connected integrations
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("toolkit_slug, status")
      .eq("user_id", body.user_id)
      .eq("status", "active");

    const connectedToolkits = (integrations || []).map(
      (i: { toolkit_slug: string }) => i.toolkit_slug
    );
    console.log(
      `[analyze-action] User ${body.user_id} has integrations: ${connectedToolkits.join(", ") || "none"}`
    );

    // 3. LLM enrichment
    const enriched = await enrichWithLLM(
      body.action_type,
      body.local_title,
      body.trigger_context || {},
      connectedToolkits
    );

    // 4. Determine status based on enrichment result
    const status = enriched.is_actionable ? "pending" : "invalidated";
    const statusMessage = enriched.is_actionable
      ? null
      : enriched.invalidation_reason || "Cloud validation rejected this action";

    // 5. Upsert into pending_actions
    const actionRow = {
      id: body.action_id,
      user_id: body.user_id,
      company_id: body.company_id,
      title: enriched.title,
      subtitle: enriched.subtitle,
      action_type: body.action_type,
      action_payload: enriched.action_payload,
      event_hash: body.event_hash,
      trigger_context: body.trigger_context || {},
      local_confidence: body.local_confidence || null,
      cloud_confidence: enriched.cloud_confidence,
      status,
      status_message: statusMessage,
    };

    const { error: upsertError } = await supabase
      .from("pending_actions")
      .upsert(actionRow, { onConflict: "user_id,event_hash" });

    if (upsertError) {
      console.error("[analyze-action] Upsert failed:", upsertError);
      return new Response(
        JSON.stringify({ error: `Database error: ${upsertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[analyze-action] Action ${body.action_id} upserted with status=${status}`
    );

    // 6. Return enriched action
    return new Response(
      JSON.stringify({
        action_id: body.action_id,
        status,
        title: enriched.title,
        subtitle: enriched.subtitle,
        action_type: body.action_type,
        action_payload: enriched.action_payload,
        cloud_confidence: enriched.cloud_confidence,
        status_message: statusMessage,
        deduplicated: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[analyze-action] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
