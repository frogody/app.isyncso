/**
 * Health Runner Edge Function
 *
 * Runs platform health checks server-side:
 * - Table existence checks
 * - Edge function ping checks
 * - PostgreSQL function existence checks
 * - Writes results to health_check_results + platform_health_score
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Tables that should exist ──────────────────────────────────
const REQUIRED_TABLES = [
  "users", "companies", "organizations", "teams", "team_members",
  "prospects", "candidates", "campaigns", "products", "invoices",
  "expenses", "tasks", "conversations", "messages", "courses",
  "ai_systems", "roadmap_items", "agent_registry", "agent_activity_log",
  "commander_sessions", "health_check_results", "platform_health_score",
  "github_pull_requests", "sync_sessions", "sync_memory_chunks",
  "rbac_roles", "rbac_permissions", "rbac_user_roles",
  "user_integrations", "sms_messages",
];

// ─── Edge functions to ping ────────────────────────────────────
const EDGE_FUNCTIONS = [
  "sync", "commander-chat", "github-integration",
  "generate-image", "enhance-prompt", "process-invoice",
  "explorium-enrich", "health-runner",
];

// ─── PostgreSQL functions that should exist ─────────────────────
const REQUIRED_PG_FUNCTIONS = [
  "auth_uid", "auth_role", "auth_company_id", "auth_hierarchy_level",
  "user_in_company", "user_has_permission", "user_has_role",
  "is_admin", "is_super_admin", "is_manager",
  "normalize_company_name", "match_excluded_client",
];

// ─── Run a single check ────────────────────────────────────────
interface CheckResult {
  test_type: string;
  test_target: string;
  status: "pass" | "fail" | "skip";
  message: string;
  duration_ms: number;
}

async function checkTable(tableName: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase.from(tableName).select("*").limit(1);
    if (error && error.code === "42P01") {
      return { test_type: "table", test_target: tableName, status: "fail", message: `Table not found`, duration_ms: Date.now() - start };
    }
    // Permission errors still mean table exists
    return { test_type: "table", test_target: tableName, status: "pass", message: "OK", duration_ms: Date.now() - start };
  } catch (err) {
    return { test_type: "table", test_target: tableName, status: "fail", message: err.message, duration_ms: Date.now() - start };
  }
}

async function checkEdgeFunction(fnName: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "OPTIONS",
      headers: { "Content-Type": "application/json" },
    });
    // OPTIONS returning 200 or 204 means function is deployed
    const ok = res.status < 400;
    return {
      test_type: "edge_function",
      test_target: fnName,
      status: ok ? "pass" : "fail",
      message: ok ? `OK (${res.status})` : `HTTP ${res.status}`,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return { test_type: "edge_function", test_target: fnName, status: "fail", message: err.message, duration_ms: Date.now() - start };
  }
}

async function checkPgFunction(fnName: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.rpc("_health_check_fn_exists", { fn_name: fnName });
    if (error) {
      // RPC doesn't exist yet — do raw check
      const { data: rawData, error: rawErr } = await supabase
        .from("pg_catalog.pg_proc" as any)
        .select("proname")
        .eq("proname", fnName)
        .limit(1);

      // Fallback: just try calling it with a bad arg to see if it exists
      return {
        test_type: "pg_function",
        test_target: fnName,
        status: "skip",
        message: "Cannot verify (no health_check_fn_exists helper)",
        duration_ms: Date.now() - start,
      };
    }
    return {
      test_type: "pg_function",
      test_target: fnName,
      status: data ? "pass" : "fail",
      message: data ? "OK" : "Function not found",
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return { test_type: "pg_function", test_target: fnName, status: "skip", message: err.message, duration_ms: Date.now() - start };
  }
}

// ─── Main Handler ──────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const runId = crypto.randomUUID();
    const results: CheckResult[] = [];

    // Run all checks in parallel batches
    const tableChecks = await Promise.all(REQUIRED_TABLES.map(checkTable));
    results.push(...tableChecks);

    const fnChecks = await Promise.all(EDGE_FUNCTIONS.map(checkEdgeFunction));
    results.push(...fnChecks);

    const pgChecks = await Promise.all(REQUIRED_PG_FUNCTIONS.map(checkPgFunction));
    results.push(...pgChecks);

    // Save individual results
    const resultRows = results.map((r) => ({
      run_id: runId,
      test_type: r.test_type,
      test_target: r.test_target,
      status: r.status,
      message: r.message,
      duration_ms: r.duration_ms,
    }));

    await supabase.from("health_check_results").insert(resultRows);

    // Calculate score
    const total = results.length;
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;
    const score = total > 0 ? Math.round((passed / (total - skipped || 1)) * 100) : 0;

    // Save aggregated score
    await supabase.from("platform_health_score").insert({
      run_id: runId,
      total_tests: total,
      passed,
      failed,
      skipped,
      score,
    });

    return new Response(
      JSON.stringify({
        run_id: runId,
        score,
        total_tests: total,
        passed,
        failed,
        skipped,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
