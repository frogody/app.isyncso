/**
 * Detect Temporal Patterns Edge Function
 *
 * Analyzes user behavior to detect recurring temporal patterns and upserts
 * them into the `temporal_patterns` table. Designed to run daily via cron
 * or on-demand per user.
 *
 * POST /functions/v1/detect-temporal-patterns
 *
 * Body:
 *   { userId: string, companyId: string }          — single user
 *   { batch: true }                                 — all active users
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

interface TemporalPattern {
  user_id: string;
  company_id: string;
  pattern_type: string;
  pattern_key: string;
  description: string;
  pattern_data: Record<string, unknown>;
  confidence: number;
  sample_count: number;
  first_observed: string | null;
  last_observed: string | null;
  next_expected: string | null;
  is_active: boolean;
}

interface DetectionSummary {
  user_id: string;
  action_cadence: number;
  entity_cadence: number;
  action_sequence: number;
  suggestion_response: number;
  total: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return ISO string for the next occurrence of a given DOW (0=Sun, 1=Mon, ...). */
function nextDayOfWeek(dow: number): string {
  const now = new Date();
  const current = now.getDay();
  let daysUntil = dow - current;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

/** Day-of-week name. */
const DOW_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** ISO date N days ago. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Add days to a date string and return ISO string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// 1. Action Cadence Detection
// ---------------------------------------------------------------------------

async function detectActionCadence(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string
): Promise<TemporalPattern[]> {
  const patterns: TemporalPattern[] = [];
  const since = daysAgo(60);

  // Fetch tasks created by the user in the last 60 days
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, created_at")
    .eq("created_by", userId)
    .gte("created_at", since);

  // Fetch invoices created by the user in the last 60 days
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, created_at, created_by")
    .eq("created_by", userId)
    .gte("created_at", since);

  const sources: { name: string; rows: { created_at: string }[] }[] = [
    { name: "task_creation", rows: tasks || [] },
    { name: "invoice_creation", rows: invoices || [] },
  ];

  for (const source of sources) {
    if (source.rows.length < 3) continue;

    // Group by ISO week number + day-of-week
    const dowCounts: Record<number, number> = {};
    const dowWeeks: Record<number, Set<string>> = {};

    for (const row of source.rows) {
      const d = new Date(row.created_at);
      const dow = d.getDay();
      dowCounts[dow] = (dowCounts[dow] || 0) + 1;

      // Track unique weeks (year-week) this DOW appeared in
      const yearWeek = `${d.getFullYear()}-W${Math.ceil(
        ((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 +
          new Date(d.getFullYear(), 0, 1).getDay() +
          1) /
          7
      )}`;
      if (!dowWeeks[dow]) dowWeeks[dow] = new Set();
      dowWeeks[dow].add(yearWeek);
    }

    // Total weeks in 60-day window
    const totalWeeks = Math.ceil(60 / 7);

    for (const [dowStr, count] of Object.entries(dowCounts)) {
      const dow = Number(dowStr);
      if (count < 3) continue;

      const uniqueWeeks = dowWeeks[dow]?.size || 0;
      const consistency = uniqueWeeks / totalWeeks;

      // Require ≥50% week-over-week regularity
      if (consistency < 0.5) continue;

      const avgCount = count / uniqueWeeks;
      const confidence = Math.min(consistency * 1.2, 1.0);

      const patternKey = `${source.name}_${DOW_NAMES[dow]}`;

      // Find first and last observation
      const dates = source.rows
        .filter((r) => new Date(r.created_at).getDay() === dow)
        .map((r) => r.created_at)
        .sort();

      patterns.push({
        user_id: userId,
        company_id: companyId,
        pattern_type: "action_cadence",
        pattern_key: patternKey,
        description: `User typically creates ${source.name.replace("_", " ")}s on ${DOW_NAMES[dow]}s`,
        pattern_data: {
          day_of_week: dow,
          avg_count: Math.round(avgCount * 100) / 100,
          consistency: Math.round(consistency * 100) / 100,
          total_occurrences: count,
          unique_weeks: uniqueWeeks,
        },
        confidence: Math.round(confidence * 100) / 100,
        sample_count: count,
        first_observed: dates[0] || null,
        last_observed: dates[dates.length - 1] || null,
        next_expected: nextDayOfWeek(dow),
        is_active: true,
      });
    }
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// 2. Entity Cadence Detection
// ---------------------------------------------------------------------------

async function detectEntityCadence(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string
): Promise<TemporalPattern[]> {
  const patterns: TemporalPattern[] = [];
  const since = daysAgo(90);

  // Query CRM activity log for this company in the last 90 days
  const { data: activities } = await supabase
    .from("crm_activity_log")
    .select("id, prospect_id, created_at")
    .eq("company_id", companyId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (!activities || activities.length === 0) return patterns;

  // Group activities by prospect_id
  const prospectActivities: Record<string, string[]> = {};
  for (const act of activities) {
    if (!act.prospect_id) continue;
    if (!prospectActivities[act.prospect_id]) {
      prospectActivities[act.prospect_id] = [];
    }
    prospectActivities[act.prospect_id].push(act.created_at);
  }

  // For each prospect, compute gap stats
  for (const [prospectId, dates] of Object.entries(prospectActivities)) {
    if (dates.length < 3) continue;

    const sorted = dates.sort();
    const gaps: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const gapMs =
        new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime();
      const gapDays = gapMs / (1000 * 60 * 60 * 24);
      gaps.push(gapDays);
    }

    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean < 1) continue; // Skip if touchpoints are sub-daily

    const variance =
      gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length;
    const stddev = Math.sqrt(variance);
    const cv = stddev / mean; // coefficient of variation

    // Regular pattern = CV < 0.6
    if (cv >= 0.6) continue;

    // Fetch prospect name
    const { data: prospect } = await supabase
      .from("prospects")
      .select("company_name, first_name, last_name")
      .eq("id", prospectId)
      .maybeSingle();

    const prospectName = prospect
      ? `${prospect.first_name || ""} ${prospect.last_name || ""}`.trim() ||
        prospect.company_name ||
        prospectId
      : prospectId;

    const confidence = Math.min(1.0 - cv, 1.0);
    const lastTouchpoint = sorted[sorted.length - 1];
    const nextExpected = addDays(lastTouchpoint, Math.round(mean));

    patterns.push({
      user_id: userId,
      company_id: companyId,
      pattern_type: "entity_cadence",
      pattern_key: `contact_prospect_${prospectId}`,
      description: `Contacts ${prospectName} every ~${Math.round(mean)} days`,
      pattern_data: {
        prospect_id: prospectId,
        prospect_name: prospectName,
        avg_gap_days: Math.round(mean * 10) / 10,
        stddev_days: Math.round(stddev * 10) / 10,
        touchpoint_count: sorted.length,
        coefficient_of_variation: Math.round(cv * 100) / 100,
      },
      confidence: Math.round(confidence * 100) / 100,
      sample_count: sorted.length,
      first_observed: sorted[0],
      last_observed: lastTouchpoint,
      next_expected: nextExpected,
      is_active: true,
    });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// 3. Action Sequence Detection
// ---------------------------------------------------------------------------

async function detectActionSequence(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string
): Promise<TemporalPattern[]> {
  const patterns: TemporalPattern[] = [];

  // Look for: proposal accepted → invoice created within 48 hours
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, prospect_id, status, updated_at, created_by")
    .eq("company_id", companyId)
    .eq("status", "accepted")
    .gte("updated_at", daysAgo(90));

  if (!proposals || proposals.length === 0) return patterns;

  const gapHours: number[] = [];
  let firstObserved: string | null = null;
  let lastObserved: string | null = null;

  for (const proposal of proposals) {
    // Find invoices created within 48 hours after proposal acceptance
    const acceptedAt = new Date(proposal.updated_at);
    const deadline = new Date(
      acceptedAt.getTime() + 48 * 60 * 60 * 1000
    ).toISOString();

    const { data: matchingInvoices } = await supabase
      .from("invoices")
      .select("id, created_at")
      .eq("company_id", companyId)
      .gte("created_at", proposal.updated_at)
      .lte("created_at", deadline)
      .limit(1);

    if (matchingInvoices && matchingInvoices.length > 0) {
      const invoice = matchingInvoices[0];
      const gapMs =
        new Date(invoice.created_at).getTime() - acceptedAt.getTime();
      const hours = gapMs / (1000 * 60 * 60);
      gapHours.push(hours);

      if (!firstObserved || proposal.updated_at < firstObserved) {
        firstObserved = proposal.updated_at;
      }
      if (!lastObserved || invoice.created_at > lastObserved) {
        lastObserved = invoice.created_at;
      }
    }
  }

  // Need at least 3 occurrences
  if (gapHours.length >= 3) {
    const sorted = [...gapHours].sort((a, b) => a - b);
    const medianIdx = Math.floor(sorted.length / 2);
    const medianGap =
      sorted.length % 2 === 0
        ? (sorted[medianIdx - 1] + sorted[medianIdx]) / 2
        : sorted[medianIdx];

    const meanGap = gapHours.reduce((a, b) => a + b, 0) / gapHours.length;
    const consistency = 1 - Math.min(1, (Math.max(...gapHours) - Math.min(...gapHours)) / (meanGap || 1) / 3);
    const confidence = Math.min(
      (gapHours.length / 5) * consistency,
      1.0
    );

    patterns.push({
      user_id: userId,
      company_id: companyId,
      pattern_type: "action_sequence",
      pattern_key: "proposal_accepted_to_invoice",
      description: `After proposal acceptance, creates invoice within ~${Math.round(medianGap)}h`,
      pattern_data: {
        trigger_event: "proposal_accepted",
        follow_up_action: "invoice_created",
        median_gap_hours: Math.round(medianGap * 10) / 10,
        mean_gap_hours: Math.round(meanGap * 10) / 10,
        occurrences: gapHours.length,
        min_gap_hours: Math.round(Math.min(...gapHours) * 10) / 10,
        max_gap_hours: Math.round(Math.max(...gapHours) * 10) / 10,
      },
      confidence: Math.round(confidence * 100) / 100,
      sample_count: gapHours.length,
      first_observed: firstObserved,
      last_observed: lastObserved,
      next_expected: null, // Triggered by events, not time-based
      is_active: true,
    });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// 4. Suggestion Response Detection
// ---------------------------------------------------------------------------

async function detectSuggestionResponse(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string
): Promise<TemporalPattern[]> {
  const patterns: TemporalPattern[] = [];
  const since = daysAgo(60);

  // Query pending_actions for this user in last 60 days
  const { data: actions } = await supabase
    .from("pending_actions")
    .select("id, action_type, status, source, created_at")
    .eq("user_id", userId)
    .gte("created_at", since);

  if (!actions || actions.length === 0) return patterns;

  // Group by action_type
  const byType: Record<
    string,
    { accepted: number; dismissed: number; total: number; dates: string[] }
  > = {};

  for (const action of actions) {
    const key = action.action_type || action.source || "unknown";
    if (!byType[key]) {
      byType[key] = { accepted: 0, dismissed: 0, total: 0, dates: [] };
    }
    byType[key].total++;
    byType[key].dates.push(action.created_at);

    if (action.status === "accepted" || action.status === "completed") {
      byType[key].accepted++;
    } else if (
      action.status === "dismissed" ||
      action.status === "rejected" ||
      action.status === "invalidated"
    ) {
      byType[key].dismissed++;
    }
  }

  for (const [actionType, stats] of Object.entries(byType)) {
    if (stats.total < 3) continue;

    const acceptanceRate = stats.accepted / stats.total;
    const sortedDates = stats.dates.sort();

    // Only create patterns for notable rates: >70% acceptance or <20% acceptance
    if (acceptanceRate > 0.7 || acceptanceRate < 0.2) {
      const description =
        acceptanceRate > 0.7
          ? `User accepts ${Math.round(acceptanceRate * 100)}% of ${actionType.replace(/_/g, " ")} suggestions`
          : `User ignores ${Math.round((1 - acceptanceRate) * 100)}% of ${actionType.replace(/_/g, " ")} suggestions`;

      // Confidence scales with sample size and how extreme the rate is
      const extremity = Math.abs(acceptanceRate - 0.5) * 2; // 0-1, higher = more extreme
      const sampleFactor = Math.min(stats.total / 10, 1.0);
      const confidence = Math.min(extremity * sampleFactor * 1.2, 1.0);

      patterns.push({
        user_id: userId,
        company_id: companyId,
        pattern_type: "suggestion_response",
        pattern_key: `response_${actionType}`,
        description,
        pattern_data: {
          action_type: actionType,
          accepted: stats.accepted,
          dismissed: stats.dismissed,
          total: stats.total,
          acceptance_rate: Math.round(acceptanceRate * 100) / 100,
        },
        confidence: Math.round(confidence * 100) / 100,
        sample_count: stats.total,
        first_observed: sortedDates[0] || null,
        last_observed: sortedDates[sortedDates.length - 1] || null,
        next_expected: null, // Not time-predictable
        is_active: true,
      });
    }
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Upsert & Deactivation
// ---------------------------------------------------------------------------

async function upsertPatterns(
  supabase: ReturnType<typeof createClient>,
  patterns: TemporalPattern[]
): Promise<{ upserted: number; errors: string[] }> {
  const errors: string[] = [];
  let upserted = 0;

  for (const pattern of patterns) {
    const { error } = await supabase.from("temporal_patterns").upsert(
      {
        user_id: pattern.user_id,
        company_id: pattern.company_id,
        pattern_type: pattern.pattern_type,
        pattern_key: pattern.pattern_key,
        description: pattern.description,
        pattern_data: pattern.pattern_data,
        confidence: pattern.confidence,
        sample_count: pattern.sample_count,
        first_observed: pattern.first_observed,
        last_observed: pattern.last_observed,
        next_expected: pattern.next_expected,
        is_active: pattern.is_active,
      },
      { onConflict: "user_id,pattern_type,pattern_key" }
    );

    if (error) {
      errors.push(
        `Failed to upsert ${pattern.pattern_type}/${pattern.pattern_key}: ${error.message}`
      );
    } else {
      upserted++;
    }
  }

  return { upserted, errors };
}

/** Deactivate patterns not observed in 30+ days for this user. */
async function deactivateStalePatterns(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<number> {
  const threshold = daysAgo(30);

  const { data, error } = await supabase
    .from("temporal_patterns")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true)
    .lt("last_observed", threshold)
    .select("id");

  if (error) {
    console.error(
      `[detect-temporal-patterns] Failed to deactivate stale patterns for ${userId}:`,
      error
    );
    return 0;
  }

  return data?.length || 0;
}

// ---------------------------------------------------------------------------
// Process Single User
// ---------------------------------------------------------------------------

async function processUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string
): Promise<DetectionSummary> {
  const summary: DetectionSummary = {
    user_id: userId,
    action_cadence: 0,
    entity_cadence: 0,
    action_sequence: 0,
    suggestion_response: 0,
    total: 0,
    errors: [],
  };

  // Run all four detectors in parallel
  const results = await Promise.allSettled([
    detectActionCadence(supabase, userId, companyId),
    detectEntityCadence(supabase, userId, companyId),
    detectActionSequence(supabase, userId, companyId),
    detectSuggestionResponse(supabase, userId, companyId),
  ]);

  const allPatterns: TemporalPattern[] = [];

  // Action Cadence
  if (results[0].status === "fulfilled") {
    allPatterns.push(...results[0].value);
    summary.action_cadence = results[0].value.length;
  } else {
    summary.errors.push(`action_cadence: ${results[0].reason}`);
  }

  // Entity Cadence
  if (results[1].status === "fulfilled") {
    allPatterns.push(...results[1].value);
    summary.entity_cadence = results[1].value.length;
  } else {
    summary.errors.push(`entity_cadence: ${results[1].reason}`);
  }

  // Action Sequence
  if (results[2].status === "fulfilled") {
    allPatterns.push(...results[2].value);
    summary.action_sequence = results[2].value.length;
  } else {
    summary.errors.push(`action_sequence: ${results[2].reason}`);
  }

  // Suggestion Response
  if (results[3].status === "fulfilled") {
    allPatterns.push(...results[3].value);
    summary.suggestion_response = results[3].value.length;
  } else {
    summary.errors.push(`suggestion_response: ${results[3].reason}`);
  }

  // Upsert all detected patterns
  if (allPatterns.length > 0) {
    const { upserted, errors } = await upsertPatterns(supabase, allPatterns);
    summary.total = upserted;
    summary.errors.push(...errors);
  }

  // Deactivate stale patterns
  const deactivated = await deactivateStalePatterns(supabase, userId);
  if (deactivated > 0) {
    console.log(
      `[detect-temporal-patterns] Deactivated ${deactivated} stale patterns for ${userId}`
    );
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Main Handler
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
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Batch mode: process all active users
    if (body.batch === true) {
      console.log("[detect-temporal-patterns] Batch mode: processing all active users");

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, company_id")
        .not("company_id", "is", null);

      if (usersError) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch users: ${usersError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!users || users.length === 0) {
        return new Response(
          JSON.stringify({ message: "No active users found", summaries: [] }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(
        `[detect-temporal-patterns] Processing ${users.length} users`
      );

      const summaries: DetectionSummary[] = [];

      // Process users sequentially to avoid overwhelming the DB
      for (const user of users) {
        try {
          const summary = await processUser(
            supabase,
            user.id,
            user.company_id
          );
          summaries.push(summary);
        } catch (err) {
          summaries.push({
            user_id: user.id,
            action_cadence: 0,
            entity_cadence: 0,
            action_sequence: 0,
            suggestion_response: 0,
            total: 0,
            errors: [err instanceof Error ? err.message : String(err)],
          });
        }
      }

      const totalPatterns = summaries.reduce((s, u) => s + u.total, 0);
      console.log(
        `[detect-temporal-patterns] Batch complete: ${totalPatterns} patterns across ${users.length} users`
      );

      return new Response(
        JSON.stringify({
          message: `Processed ${users.length} users, found ${totalPatterns} patterns`,
          users_processed: users.length,
          total_patterns: totalPatterns,
          summaries,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Single user mode
    const { userId, companyId } = body;

    if (!userId || !companyId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId and companyId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[detect-temporal-patterns] Processing user ${userId} (company ${companyId})`
    );

    const summary = await processUser(supabase, userId, companyId);

    console.log(
      `[detect-temporal-patterns] Done: ${summary.total} patterns found (cadence=${summary.action_cadence}, entity=${summary.entity_cadence}, sequence=${summary.action_sequence}, response=${summary.suggestion_response})`
    );

    return new Response(
      JSON.stringify({
        message: `Found ${summary.total} temporal patterns`,
        summary,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[detect-temporal-patterns] Unhandled error:", err);
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
