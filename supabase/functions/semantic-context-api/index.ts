/**
 * Semantic Context API — SYNC Agent Context Bridge (Phase 1.2 / I-2)
 *
 * Aggregates the user's current semantic state from the desktop pipeline
 * and entity graph into a structured context block that gets injected into
 * the SYNC Agent system prompt. This is what transforms SYNC from a
 * "command executor" into an "intelligence partner" — it knows what the
 * user is working on, who they're interacting with, and how that connects
 * to their business data.
 *
 * Data sources:
 *   - semantic_threads   → active work context (what they're doing now)
 *   - semantic_entities   → people, projects, orgs recently seen
 *   - entity_business_links → connections to CRM prospects, products, candidates
 *   - semantic_activities → recent activity type distribution
 *   - semantic_intents    → current detected intent
 *   - behavioral_signatures → work pattern baselines
 *   - trust_scores        → current autonomy levels
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SemanticContext {
  active_threads: ThreadContext[];
  recent_entities: EntityContext[];
  activity_summary: ActivitySummary;
  current_intent: IntentContext | null;
  behavioral_baseline: BehavioralBaseline;
  trust_levels: TrustLevel[];
  generated_at: string;
}

interface ThreadContext {
  thread_id: string;
  title: string | null;
  status: string;
  primary_activity_type: string | null;
  primary_entities: any[];
  event_count: number;
  duration_minutes: number;
  last_activity_at: string;
}

interface EntityContext {
  entity_id: string;
  name: string;
  type: string;
  occurrence_count: number;
  last_seen: string;
  business_links: BusinessLink[];
}

interface BusinessLink {
  business_type: string;
  business_record_id: string;
  business_name: string | null;
  match_confidence: number;
}

interface ActivitySummary {
  window_minutes: number;
  total_activities: number;
  distribution: Record<string, number>;
  dominant_type: string | null;
}

interface IntentContext {
  intent_type: string;
  intent_subtype: string | null;
  confidence: number;
  thread_id: string | null;
  evidence: any[];
}

interface BehavioralBaseline {
  avg_focus_duration_minutes: number | null;
  context_switches_per_hour: number | null;
  peak_activity_types: string[];
  trend: string;
}

interface TrustLevel {
  action_type: string;
  category: string;
  current_level: number;
  effective_level: number;
  accuracy_pct: number | null;
  total_actions: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, company_id, window_minutes = 120 } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve company_id if not provided
    let companyId = company_id;
    if (!companyId) {
      const { data: userData } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user_id)
        .single();
      companyId = userData?.company_id;
    }

    const windowStart = new Date(Date.now() - window_minutes * 60 * 1000).toISOString();

    // Run all queries in parallel for speed
    const [
      threadsResult,
      entitiesResult,
      activitiesResult,
      intentsResult,
      signaturesResult,
      trustResult,
    ] = await Promise.all([
      // 1. Active threads (active or paused within window)
      supabase
        .from("semantic_threads")
        .select("thread_id, title, status, primary_activity_type, primary_entities, event_count, started_at, last_activity_at")
        .eq("user_id", user_id)
        .in("status", ["active", "paused"])
        .gte("last_activity_at", windowStart)
        .order("last_activity_at", { ascending: false })
        .limit(5),

      // 2. Recent entities (seen within window, high occurrence)
      supabase
        .from("semantic_entities")
        .select("entity_id, name, type, occurrence_count, last_seen")
        .eq("user_id", user_id)
        .gte("last_seen", windowStart)
        .order("occurrence_count", { ascending: false })
        .limit(20),

      // 3. Recent activities (within window)
      supabase
        .from("semantic_activities")
        .select("activity_type, duration_ms")
        .eq("user_id", user_id)
        .gte("created_at", windowStart),

      // 4. Most recent unresolved intent
      supabase
        .from("semantic_intents")
        .select("intent_type, intent_subtype, confidence, thread_id, evidence")
        .eq("user_id", user_id)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(1),

      // 5. Behavioral signatures (7-day window)
      supabase
        .from("behavioral_signatures")
        .select("category, metric_name, current_value, trend")
        .eq("user_id", user_id)
        .eq("window_days", 7)
        .order("computed_at", { ascending: false })
        .limit(10),

      // 6. Trust levels (all for this user+company)
      companyId
        ? supabase
            .from("trust_scores")
            .select("action_type, category, current_level, accuracy_count, error_count, total_actions, user_cap_level")
            .eq("user_id", user_id)
            .eq("company_id", companyId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // ─── Process threads ───────────────────────────────────────────────
    const activeThreads: ThreadContext[] = (threadsResult.data || []).map((t: any) => ({
      thread_id: t.thread_id,
      title: t.title,
      status: t.status,
      primary_activity_type: t.primary_activity_type,
      primary_entities: t.primary_entities || [],
      event_count: t.event_count || 0,
      duration_minutes: Math.round(
        (new Date(t.last_activity_at).getTime() - new Date(t.started_at).getTime()) / 60000
      ),
      last_activity_at: t.last_activity_at,
    }));

    // ─── Process entities + resolve business links ─────────────────────
    const entityIds = (entitiesResult.data || []).map((e: any) => e.entity_id);
    let businessLinksMap: Record<string, BusinessLink[]> = {};

    if (entityIds.length > 0) {
      const { data: links } = await supabase
        .from("entity_business_links")
        .select("semantic_entity_id, business_type, business_record_id, match_confidence")
        .in("semantic_entity_id", entityIds);

      // Group by entity and resolve business names
      for (const link of links || []) {
        if (!businessLinksMap[link.semantic_entity_id]) {
          businessLinksMap[link.semantic_entity_id] = [];
        }
        // Resolve business name based on type
        let businessName: string | null = null;
        try {
          if (link.business_type === "prospect") {
            const { data } = await supabase
              .from("prospects")
              .select("first_name, last_name, company")
              .eq("id", link.business_record_id)
              .single();
            businessName = data?.company || `${data?.first_name} ${data?.last_name}`;
          } else if (link.business_type === "product") {
            const { data } = await supabase
              .from("products")
              .select("name")
              .eq("id", link.business_record_id)
              .single();
            businessName = data?.name;
          } else if (link.business_type === "candidate") {
            const { data } = await supabase
              .from("candidates")
              .select("first_name, last_name")
              .eq("id", link.business_record_id)
              .single();
            businessName = data ? `${data.first_name} ${data.last_name}` : null;
          }
        } catch { /* name lookup is best-effort */ }

        businessLinksMap[link.semantic_entity_id].push({
          business_type: link.business_type,
          business_record_id: link.business_record_id,
          business_name: businessName,
          match_confidence: link.match_confidence,
        });
      }
    }

    const recentEntities: EntityContext[] = (entitiesResult.data || []).map((e: any) => ({
      entity_id: e.entity_id,
      name: e.name,
      type: e.type,
      occurrence_count: e.occurrence_count,
      last_seen: e.last_seen,
      business_links: businessLinksMap[e.entity_id] || [],
    }));

    // ─── Process activity distribution ─────────────────────────────────
    const distribution: Record<string, number> = {};
    let totalActivities = 0;
    for (const a of activitiesResult.data || []) {
      distribution[a.activity_type] = (distribution[a.activity_type] || 0) + 1;
      totalActivities++;
    }
    const dominantType = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const activitySummary: ActivitySummary = {
      window_minutes,
      total_activities: totalActivities,
      distribution,
      dominant_type: dominantType,
    };

    // ─── Process current intent ────────────────────────────────────────
    const intentData = intentsResult.data?.[0] || null;
    const currentIntent: IntentContext | null = intentData
      ? {
          intent_type: intentData.intent_type,
          intent_subtype: intentData.intent_subtype,
          confidence: intentData.confidence,
          thread_id: intentData.thread_id,
          evidence: intentData.evidence || [],
        }
      : null;

    // ─── Process behavioral baseline ───────────────────────────────────
    const sigMap: Record<string, any> = {};
    for (const sig of signaturesResult.data || []) {
      sigMap[`${sig.category}:${sig.metric_name}`] = sig;
    }

    const focusSig = sigMap["focus:average_duration"];
    const switchSig = sigMap["context_switching:hourly_rate"];
    const peakTypes = (signaturesResult.data || [])
      .filter((s: any) => s.category === "activity_distribution")
      .sort((a: any, b: any) => (b.current_value?.percentage || 0) - (a.current_value?.percentage || 0))
      .slice(0, 3)
      .map((s: any) => s.metric_name);

    const behavioralBaseline: BehavioralBaseline = {
      avg_focus_duration_minutes: focusSig?.current_value?.minutes ?? null,
      context_switches_per_hour: switchSig?.current_value?.rate ?? null,
      peak_activity_types: peakTypes,
      trend: focusSig?.trend || "stable",
    };

    // ─── Process trust levels ──────────────────────────────────────────
    // Category caps from TRANSFORMATION_ARCHITECTURE.md Section 2.4
    const CATEGORY_CAPS: Record<string, number> = {
      informational: 2,
      administrative: 4,
      communication: 3,
      financial: 3,
      financial_exec: 3,
      pricing: 2,
      compliance: 3,
    };

    const trustLevels: TrustLevel[] = (trustResult.data || []).map((t: any) => {
      const categoryCap = CATEGORY_CAPS[t.category] || 4;
      const userCap = t.user_cap_level || 4;
      const effective = Math.min(t.current_level, categoryCap, userCap);
      const totalActions = t.total_actions || 0;
      const accuracyPct = totalActions > 0
        ? Math.round((t.accuracy_count / totalActions) * 100)
        : null;

      return {
        action_type: t.action_type,
        category: t.category,
        current_level: t.current_level,
        effective_level: effective,
        accuracy_pct: accuracyPct,
        total_actions: totalActions,
      };
    });

    // ─── Assemble context ──────────────────────────────────────────────
    const context: SemanticContext = {
      active_threads: activeThreads,
      recent_entities: recentEntities,
      activity_summary: activitySummary,
      current_intent: currentIntent,
      behavioral_baseline: behavioralBaseline,
      trust_levels: trustLevels,
      generated_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, context }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[semantic-context-api] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
