/**
 * Suggest Action Edge Function
 *
 * Web-side intelligence engine. Receives business events from:
 * - Template callers: business-pulse, invoice-signals, composio-webhooks
 * - Intelligence engine: intelligence-reason (pre-computed LLM suggestions)
 *
 * Two paths:
 * 1. Template path (legacy): event_type + event_data → template → static scores
 * 2. Intelligence path: source='intelligence_engine' → pre-computed scores + profile-aware gating
 *
 * Inserts into pending_actions → desktop Realtime → pill UI.
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
  user_id?: string;
  userId?: string;
  company_id?: string;
  companyId?: string;
  source: string;
  event_type?: string;
  event_data?: {
    title: string;
    details?: string;
    entity_id?: string;
    entity_type?: string;
    due_date?: string;
    priority_hint?: string;
    [key: string]: unknown;
  };
  // Intelligence engine fields (source='intelligence_engine')
  title?: string;
  subtitle?: string;
  actionType?: string;
  actionPayload?: Record<string, unknown>;
  importance?: number;
  urgency?: number;
  entityId?: string;
  entityType?: string;
  reasoning?: string;
  domains?: string[];
  dedupKey?: string;
  intelligenceSnapshotId?: string;
}

interface ActionTemplate {
  title: string;
  subtitle: string | null;
  action_type: string;
  importance: number;
  urgency: number;
  action_payload: Record<string, unknown>;
}

interface UserProfile {
  suggestion_capacity_per_day: number;
  suggestion_cooldown_minutes: number;
  preferred_suggestion_hours: number[];
  proactivity_preference: string;
  suggestion_type_affinity: Record<string, number>;
  suggestion_acceptance_rate: number | null;
}

// ---------------------------------------------------------------------------
// Template-based scoring — no LLM needed for known event types
// ---------------------------------------------------------------------------

function resolveTemplate(
  eventType: string,
  eventData: SuggestRequest["event_data"]
): ActionTemplate | null {
  const title = eventData?.title || "Action needed";

  switch (eventType) {
    case "invoice_overdue":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: eventData?.details || "Send a payment reminder",
        action_type: "task_create",
        importance: 8,
        urgency: 8,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title,
            description: eventData?.details || "Follow up on overdue invoice",
            priority: "high",
            due_date: eventData?.due_date || null,
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
            title: `Convert proposal to invoice: ${eventData?.title}`,
            description: eventData?.details || "Proposal accepted — create invoice",
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
            title: `Invoice delivered order: ${eventData?.title}`,
            description: eventData?.details || "Order delivered — create invoice",
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
            title: `Follow up: ${eventData?.title}`,
            description: eventData?.details || "Deal won — schedule follow-up",
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
            description: eventData?.details || "Task deadline approaching",
            priority: "high",
            due_date: eventData?.due_date || null,
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
            title: `Follow up: ${eventData?.title}`,
            description: eventData?.details || "Deal going cold — reach out",
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
            title: `Restock: ${eventData?.title}`,
            description: eventData?.details || "Product stock is low",
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
            description: eventData?.details || "Recurring invoice due — review and send",
            priority: "medium",
            due_date: eventData?.due_date || null,
          },
        },
      };

    case "email_action_needed":
      return {
        title: title.length > 60 ? title.slice(0, 57) + "..." : title,
        subtitle: eventData?.details || "Email requires a reply",
        action_type: "task_create",
        importance: 5,
        urgency: 6,
        action_payload: {
          integration: "internal",
          operation: "create_task",
          params: {
            title: `Reply: ${eventData?.title}`,
            description: eventData?.details || "Email needs response",
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
            title: `Resolve: ${eventData?.title}`,
            description: eventData?.details || "Calendar conflict — reschedule one event",
            priority: "high",
          },
        },
      };

    default:
      if (eventData?.priority_hint === "high") {
        return {
          title: title.length > 60 ? title.slice(0, 57) + "..." : title,
          subtitle: eventData?.details || null,
          action_type: "task_create",
          importance: 7,
          urgency: 7,
          action_payload: {
            integration: "internal",
            operation: "create_task",
            params: {
              title,
              description: eventData?.details || "",
              priority: "high",
            },
          },
        };
      }
      return null;
  }
}

// ---------------------------------------------------------------------------
// Profile-aware gating (intelligence engine path only)
// ---------------------------------------------------------------------------

async function loadUserProfile(supabase: any, userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_intelligence_profiles')
    .select('suggestion_capacity_per_day, suggestion_cooldown_minutes, preferred_suggestion_hours, proactivity_preference, suggestion_type_affinity, suggestion_acceptance_rate')
    .eq('user_id', userId)
    .maybeSingle();

  return data || null;
}

async function checkProfileGating(
  supabase: any,
  userId: string,
  profile: UserProfile | null,
  importance: number,
  urgency: number,
  actionType: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // No profile = allow everything (cold start)
  if (!profile) return { allowed: true };

  const now = new Date();
  const currentHour = now.getUTCHours();

  // 1. Proactivity preference gate
  if (profile.proactivity_preference === 'minimal' && importance < 8) {
    return { allowed: false, reason: 'User prefers minimal suggestions, importance < 8' };
  }

  // 2. Preferred hours gate — outside preferred hours, only urgency ≥ 8
  if (profile.preferred_suggestion_hours?.length > 0) {
    const inPreferredHours = profile.preferred_suggestion_hours.includes(currentHour);
    if (!inPreferredHours && urgency < 8) {
      return { allowed: false, reason: `Outside preferred hours (${profile.preferred_suggestion_hours.join(',')})` };
    }
  }

  // 3. Daily capacity check
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayCount } = await supabase
    .from('pending_actions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'web_intelligence')
    .gte('created_at', todayStart.toISOString());

  const capacity = profile.suggestion_capacity_per_day || 5;
  if ((todayCount || 0) >= capacity && importance < 9) {
    return { allowed: false, reason: `Daily capacity reached (${todayCount}/${capacity})` };
  }

  // 4. Cooldown check
  const cooldownMs = (profile.suggestion_cooldown_minutes || 30) * 60 * 1000;
  const { data: lastAction } = await supabase
    .from('pending_actions')
    .select('created_at')
    .eq('user_id', userId)
    .eq('source', 'web_intelligence')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastAction) {
    const timeSinceLast = now.getTime() - new Date(lastAction.created_at).getTime();
    if (timeSinceLast < cooldownMs && urgency < 9) {
      const remaining = Math.round((cooldownMs - timeSinceLast) / 60000);
      return { allowed: false, reason: `Cooldown: ${remaining}min remaining` };
    }
  }

  // 5. Type affinity gate — suppress types with <15% acceptance
  if (profile.suggestion_type_affinity && typeof profile.suggestion_type_affinity === 'object') {
    const typeRate = profile.suggestion_type_affinity[actionType];
    if (typeof typeRate === 'number' && typeRate < 0.15 && importance < 8) {
      return { allowed: false, reason: `Low acceptance rate for ${actionType}: ${Math.round(typeRate * 100)}%` };
    }
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Extended dedup (supports dedup_key + entity_id)
// ---------------------------------------------------------------------------

async function checkDedup(
  supabase: any,
  userId: string,
  eventHash: string,
  dedupKey?: string,
  entityId?: string,
): Promise<{ isDuplicate: boolean; existingId?: string; existingStatus?: string }> {
  // 48h window for intelligence engine, 24h for template
  const windowMs = dedupKey ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  // Check dedup_key first (intelligence engine path)
  if (dedupKey) {
    const { data: byKey } = await supabase
      .from('pending_actions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('dedup_key', dedupKey)
      .gte('created_at', cutoff)
      .maybeSingle();

    if (byKey) {
      return { isDuplicate: true, existingId: byKey.id, existingStatus: byKey.status };
    }
  }

  // Check entity_id — same entity = same suggestion regardless of phrasing
  if (entityId && dedupKey) {
    const { data: byEntity } = await supabase
      .from('pending_actions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('entity_id', entityId)
      .eq('source', 'web_intelligence')
      .gte('created_at', cutoff)
      .maybeSingle();

    if (byEntity) {
      return { isDuplicate: true, existingId: byEntity.id, existingStatus: byEntity.status };
    }
  }

  // Legacy event_hash check
  const { data: byHash } = await supabase
    .from('pending_actions')
    .select('id, status')
    .eq('user_id', userId)
    .eq('event_hash', eventHash)
    .gte('created_at', cutoff)
    .maybeSingle();

  if (byHash) {
    return { isDuplicate: true, existingId: byHash.id, existingStatus: byHash.status };
  }

  return { isDuplicate: false };
}

// ---------------------------------------------------------------------------
// Diversity filter — max 2 suggestions from same domain per run
// ---------------------------------------------------------------------------

async function checkDomainDiversity(
  supabase: any,
  userId: string,
  domains: string[],
): Promise<boolean> {
  if (!domains?.length) return true;

  // Check last 2 hours for domain concentration
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabase
    .from('pending_actions')
    .select('domains')
    .eq('user_id', userId)
    .eq('source', 'web_intelligence')
    .gte('created_at', cutoff)
    .not('domains', 'is', null);

  if (!recent?.length) return true;

  // Count domain occurrences
  const domainCounts: Record<string, number> = {};
  for (const action of recent) {
    if (Array.isArray(action.domains)) {
      for (const d of action.domains) {
        domainCounts[d] = (domainCounts[d] || 0) + 1;
      }
    }
  }

  // Check if any of this suggestion's domains already have 2+ recent entries
  for (const domain of domains) {
    if ((domainCounts[domain] || 0) >= 2) {
      return false; // Would exceed diversity limit
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Overload gate — if 5+ overdue tasks, only high importance
// ---------------------------------------------------------------------------

async function checkWorkloadGate(
  supabase: any,
  userId: string,
  companyId: string,
  importance: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('status', 'overdue')
    .or(`company_id.eq.${companyId},organization_id.eq.${companyId}`);

  if ((count || 0) >= 5 && importance < 8) {
    return { allowed: false, reason: `User overloaded: ${count} overdue tasks, only showing importance ≥ 8` };
  }

  return { allowed: true };
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

    // Normalize field names (intelligence-reason uses camelCase)
    const userId = body.user_id || body.userId || '';
    const companyId = body.company_id || body.companyId || '';

    const isIntelligenceEngine = body.source === 'intelligence_engine';

    // ── Validation ──────────────────────────────────────────────
    if (isIntelligenceEngine) {
      if (!userId || !companyId || !body.title) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: userId, companyId, title" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      if (!userId || !companyId || !body.event_type || !body.event_data?.title) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: user_id, company_id, event_type, event_data.title" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Intelligence Engine Path ──────────────────────────────
    if (isIntelligenceEngine) {
      const title = (body.title || '').slice(0, 60);
      const subtitle = body.subtitle || null;
      const actionType = body.actionType || 'task_create';
      const actionPayload = body.actionPayload || {};
      const importance = body.importance || 7;
      const urgency = body.urgency || 5;
      const entityId = body.entityId || null;
      const entityType = body.entityType || null;
      const reasoning = body.reasoning || null;
      const domains = body.domains || [];
      const dedupKey = body.dedupKey || null;
      const snapshotId = body.intelligenceSnapshotId || null;

      // 1. Profile-aware gating
      const profile = await loadUserProfile(supabase, userId);
      const gateResult = await checkProfileGating(supabase, userId, profile, importance, urgency, actionType);
      if (!gateResult.allowed) {
        console.log(`[suggest-action] Profile gate blocked: ${gateResult.reason}`);
        return new Response(
          JSON.stringify({ suggested: false, reason: gateResult.reason }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Workload gate
      const workloadResult = await checkWorkloadGate(supabase, userId, companyId, importance);
      if (!workloadResult.allowed) {
        console.log(`[suggest-action] Workload gate blocked: ${workloadResult.reason}`);
        return new Response(
          JSON.stringify({ suggested: false, reason: workloadResult.reason }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Extended dedup (dedup_key + entity_id + event_hash)
      const eventHash = `intel:${dedupKey || title}`;
      const dedupResult = await checkDedup(supabase, userId, eventHash, dedupKey || undefined, entityId || undefined);
      if (dedupResult.isDuplicate) {
        console.log(`[suggest-action] Dedup hit: ${dedupKey || title} → ${dedupResult.existingId}`);
        return new Response(
          JSON.stringify({
            suggested: false,
            reason: "Already suggested recently",
            existing_action_id: dedupResult.existingId,
            existing_status: dedupResult.existingStatus,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 4. Diversity filter — max 2 from same domain
      const diversityOk = await checkDomainDiversity(supabase, userId, domains);
      if (!diversityOk && importance < 8) {
        console.log(`[suggest-action] Diversity filter: domains ${domains.join(',')} over-represented`);
        return new Response(
          JSON.stringify({ suggested: false, reason: "Domain diversity limit reached" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 5. Insert
      const actionId = crypto.randomUUID();
      const actionRow = {
        id: actionId,
        user_id: userId,
        company_id: companyId,
        title,
        subtitle,
        action_type: actionType,
        action_payload: actionPayload,
        event_hash: eventHash,
        trigger_context: {
          source: 'intelligence_engine',
          suggested_at: new Date().toISOString(),
        },
        local_confidence: null,
        cloud_confidence: 0.95,
        importance_score: importance,
        urgency_score: urgency,
        should_notify: true,
        status: "pending",
        source: "web_intelligence",
        entity_id: entityId,
        entity_type: entityType,
        // New intelligence columns
        intelligence_snapshot_id: snapshotId,
        reasoning,
        domains,
        dedup_key: dedupKey,
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
        `[suggest-action] Intelligence: ${actionId} → "${title}" (imp=${importance}, urg=${urgency}, domains=${domains.join(',')})`
      );

      return new Response(
        JSON.stringify({
          suggested: true,
          action_id: actionId,
          title,
          subtitle,
          importance,
          urgency,
          domains,
          source: 'intelligence_engine',
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Template Path (legacy callers) ────────────────────────

    // 1. Resolve template for this event type
    const template = resolveTemplate(body.event_type!, body.event_data);
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
    const eventHash = `web:${body.source}:${body.event_type}:${body.event_data?.entity_id || body.event_data?.title}`;

    const dedupResult = await checkDedup(supabase, userId, eventHash);
    if (dedupResult.isDuplicate) {
      console.log(
        `[suggest-action] Dedup hit: ${body.event_type} already suggested as ${dedupResult.existingId} (status=${dedupResult.existingStatus})`
      );
      return new Response(
        JSON.stringify({
          suggested: false,
          reason: "Already suggested recently",
          existing_action_id: dedupResult.existingId,
          existing_status: dedupResult.existingStatus,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Rate limit — max 5 suggestions per user per hour
    const { count: recentCount } = await supabase
      .from("pending_actions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "web_intelligence")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if ((recentCount || 0) >= 5) {
      console.log(
        `[suggest-action] Rate limit: user ${userId} has ${recentCount} suggestions in last hour`
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
      user_id: userId,
      company_id: companyId,
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
      cloud_confidence: 0.9,
      importance_score: template.importance,
      urgency_score: template.urgency,
      should_notify: true,
      status: "pending",
      source: "web_intelligence",
      entity_id: body.event_data?.entity_id || null,
      entity_type: body.event_data?.entity_type || null,
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
