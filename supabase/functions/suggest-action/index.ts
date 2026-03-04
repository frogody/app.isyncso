/**
 * Suggest Action Edge Function
 *
 * Web-side intelligence engine. Receives business events from other edge
 * functions (business-pulse, invoice-signals, composio-webhooks) or frontend
 * hooks, evaluates importance/urgency, and inserts into pending_actions.
 *
 * The desktop app receives the INSERT via Supabase Realtime and shows the
 * pill-shaped approval UI. On approval, execute-action creates the task.
 *
 * POST /functions/v1/suggest-action
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

interface SuggestRequest {
  user_id: string;
  company_id: string;
  source: string;       // "invoice_signal" | "business_pulse" | "email_pattern" | "calendar_conflict" | "composio_trigger"
  event_type: string;   // specific event: "invoice_overdue" | "deal_won" | "deadline_tomorrow" | etc.
  event_data: {
    title: string;
    details?: string;
    entity_id?: string;
    entity_type?: string;
    due_date?: string;
    priority_hint?: string;
    [key: string]: unknown;
  };
}

interface ActionTemplate {
  title: string;
  subtitle: string | null;
  action_type: string;
  importance: number;
  urgency: number;
  action_payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Template-based scoring — no LLM needed for known event types
// ---------------------------------------------------------------------------

function resolveTemplate(
  eventType: string,
  eventData: SuggestRequest["event_data"]
): ActionTemplate | null {
  const title = eventData.title || "Action needed";

  switch (eventType) {
    case "invoice_overdue":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: eventData.details || "Send a payment reminder",
        action_type: "task_create",
        importance: 8,
        urgency: 8,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title,
            description: eventData.details || "Follow up on overdue invoice",
            priority: "high",
            due_date: eventData.due_date || null,
          },
        },
      };

    case "proposal_accepted":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Convert to invoice while it's fresh",
        action_type: "task_create",
        importance: 8,
        urgency: 6,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Convert proposal to invoice: ${eventData.title}`,
            description: eventData.details || "Proposal accepted — create invoice",
            priority: "high",
          },
        },
      };

    case "delivered_order":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Order delivered, payment pending",
        action_type: "task_create",
        importance: 7,
        urgency: 7,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Invoice delivered order: ${eventData.title}`,
            description: eventData.details || "Order delivered — create invoice",
            priority: "high",
          },
        },
      };

    case "deal_won":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Create follow-up task",
        action_type: "task_create",
        importance: 7,
        urgency: 5,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Follow up: ${eventData.title}`,
            description: eventData.details || "Deal won — schedule follow-up",
            priority: "medium",
          },
        },
      };

    case "deadline_tomorrow":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Due tomorrow — needs attention",
        action_type: "task_create",
        importance: 7,
        urgency: 9,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title,
            description: eventData.details || "Task deadline approaching",
            priority: "high",
            due_date: eventData.due_date || null,
          },
        },
      };

    case "stale_deal":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "No activity — risk of losing deal",
        action_type: "task_create",
        importance: 6,
        urgency: 7,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Follow up: ${eventData.title}`,
            description: eventData.details || "Deal going cold — reach out",
            priority: "high",
          },
        },
      };

    case "low_stock":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Reorder needed",
        action_type: "task_create",
        importance: 6,
        urgency: 6,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Restock: ${eventData.title}`,
            description: eventData.details || "Product stock is low",
            priority: "medium",
          },
        },
      };

    case "recurring_invoice_due":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Recurring invoice due soon",
        action_type: "task_create",
        importance: 6,
        urgency: 7,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title,
            description: eventData.details || "Recurring invoice due — review and send",
            priority: "medium",
            due_date: eventData.due_date || null,
          },
        },
      };

    case "email_action_needed":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: eventData.details || "Email requires a reply",
        action_type: "task_create",
        importance: 5,
        urgency: 6,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Reply: ${eventData.title}`,
            description: eventData.details || "Email needs response",
            priority: "medium",
          },
        },
      };

    case "calendar_conflict":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: "Scheduling conflict detected",
        action_type: "task_create",
        importance: 6,
        urgency: 9,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Resolve: ${eventData.title}`,
            description: eventData.details || "Calendar conflict — reschedule one event",
            priority: "high",
          },
        },
      };

    default:
      // Unknown event type — use priority hint or moderate defaults
      if (eventData.priority_hint === "high") {
        return {
          title: title.length > 60 ? title.slice(0, 57) + "..." : title,
          subtitle: eventData.details || null,
          action_type: "task_create",
          importance: 7,
          urgency: 7,
          action_payload: {
            integration: "internal",
            operation: "create_task",
            params: {
              title,
              description: eventData.details || "",
              priority: "high",
            },
          },
        };
      }
      return null; // Unknown + no priority hint → skip
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
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
    const body = (await req.json()) as SuggestRequest;

    if (!body.user_id || !body.company_id || !body.event_type || !body.event_data?.title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, company_id, event_type, event_data.title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Resolve template for this event type
    const template = resolveTemplate(body.event_type, body.event_data);
    if (!template) {
      return new Response(
        JSON.stringify({ suggested: false, reason: `Unknown event type: ${body.event_type}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check should_notify threshold
    const shouldNotify =
      template.importance >= 6 ||
      (template.importance >= 4 && template.urgency >= 7);

    if (!shouldNotify) {
      console.log(
        `[suggest-action] Skipping low-priority event: ${body.event_type} importance=${template.importance} urgency=${template.urgency}`
      );
      return new Response(
        JSON.stringify({
          suggested: false,
          reason: "Below notification threshold",
          importance: template.importance,
          urgency: template.urgency,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Dedup check — same event_hash in last 24 hours?
    const eventHash = `web:${body.source}:${body.event_type}:${body.event_data.entity_id || body.event_data.title}`;

    const { data: existing } = await supabase
      .from("pending_actions")
      .select("id, status")
      .eq("user_id", body.user_id)
      .eq("event_hash", eventHash)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) {
      console.log(
        `[suggest-action] Dedup hit: ${body.event_type} already suggested as ${existing.id} (status=${existing.status})`
      );
      return new Response(
        JSON.stringify({
          suggested: false,
          reason: "Already suggested recently",
          existing_action_id: existing.id,
          existing_status: existing.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Rate limit — max 5 suggestions per user per hour
    const { count: recentCount } = await supabase
      .from("pending_actions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", body.user_id)
      .eq("source", "web_intelligence")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if ((recentCount || 0) >= 5) {
      console.log(
        `[suggest-action] Rate limit: user ${body.user_id} has ${recentCount} suggestions in last hour`
      );
      return new Response(
        JSON.stringify({
          suggested: false,
          reason: "Rate limit reached (5/hour)",
          recent_count: recentCount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Insert into pending_actions — desktop receives via Realtime
    const actionId = crypto.randomUUID();
    const actionRow = {
      id: actionId,
      user_id: body.user_id,
      company_id: body.company_id,
      title: template.title,
      subtitle: template.subtitle,
      action_type: template.action_type,
      action_payload: template.action_payload,
      event_hash: eventHash,
      trigger_context: {
        source: body.source,
        event_type: body.event_type,
        event_data: body.event_data,
        suggested_at: new Date().toISOString(),
      },
      local_confidence: null,
      cloud_confidence: 0.9, // Template-based = high confidence
      importance_score: template.importance,
      urgency_score: template.urgency,
      should_notify: true,
      status: "pending",
      source: "web_intelligence",
      entity_id: body.event_data.entity_id || null,
      entity_type: body.event_data.entity_type || null,
    };

    const { error: insertError } = await supabase
      .from("pending_actions")
      .insert(actionRow);

    if (insertError) {
      console.error("[suggest-action] Insert failed:", insertError);
      return new Response(
        JSON.stringify({ error: `Database error: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[suggest-action] Created action ${actionId}: ${body.event_type} → "${template.title}" (importance=${template.importance}, urgency=${template.urgency})`
    );

    return new Response(
      JSON.stringify({
        suggested: true,
        action_id: actionId,
        title: template.title,
        subtitle: template.subtitle,
        importance: template.importance,
        urgency: template.urgency,
        event_type: body.event_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[suggest-action] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
