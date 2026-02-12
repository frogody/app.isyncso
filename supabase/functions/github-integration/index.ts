/**
 * GitHub Integration Edge Function
 *
 * Handles GitHub API operations for the agent platform:
 * - Create branches
 * - Create PRs with generated descriptions
 * - Get PR status / checks
 * - Merge PRs
 * - List recent agent-created PRs
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const GITHUB_REPO = "frogody/app.isyncso";
const GITHUB_API = "https://api.github.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── GitHub API Helper ─────────────────────────────────────
async function githubApi(
  path: string,
  method = "GET",
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}/repos/${GITHUB_REPO}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─── Actions ───────────────────────────────────────────────

async function createBranch(branchName: string, fromRef = "main") {
  // Get the SHA of the source branch
  const { ok, data: ref } = await githubApi(`/git/ref/heads/${fromRef}`);
  if (!ok) return { error: `Could not find ref ${fromRef}: ${JSON.stringify(ref)}` };

  const sha = (ref as any).object?.sha;
  if (!sha) return { error: "Could not get SHA from ref" };

  // Create the new branch
  const { ok: created, data: newRef } = await githubApi("/git/refs", "POST", {
    ref: `refs/heads/${branchName}`,
    sha,
  });

  if (!created) return { error: `Failed to create branch: ${JSON.stringify(newRef)}` };
  return { branch: branchName, sha };
}

async function createPR(
  title: string,
  body: string,
  head: string,
  base = "main",
  roadmapItemId?: string,
  agentId?: string
) {
  const { ok, data: pr } = await githubApi("/pulls", "POST", {
    title,
    body,
    head,
    base,
  });

  if (!ok) return { error: `Failed to create PR: ${JSON.stringify(pr)}` };

  const prData = pr as any;

  // Save to github_pull_requests table
  if (roadmapItemId) {
    await supabase.from("github_pull_requests").insert({
      roadmap_item_id: roadmapItemId,
      agent_id: agentId || null,
      pr_number: prData.number,
      branch_name: head,
      title,
      body,
      status: prData.draft ? "draft" : "open",
      github_url: prData.html_url,
    });

    // Update roadmap item
    await supabase
      .from("roadmap_items")
      .update({
        pr_number: prData.number,
        github_url: prData.html_url,
        branch_name: head,
      })
      .eq("id", roadmapItemId);
  }

  return {
    number: prData.number,
    url: prData.html_url,
    state: prData.state,
  };
}

async function getPRStatus(prNumber: number) {
  const { ok, data: pr } = await githubApi(`/pulls/${prNumber}`);
  if (!ok) return { error: `PR #${prNumber} not found` };

  // Get check runs
  const prData = pr as any;
  const { data: checks } = await githubApi(
    `/commits/${prData.head?.sha}/check-runs`
  );

  const checkRuns = (checks as any).check_runs || [];
  const checksStatus =
    checkRuns.length === 0
      ? "pending"
      : checkRuns.every((c: any) => c.conclusion === "success")
      ? "passing"
      : checkRuns.some((c: any) => c.conclusion === "failure")
      ? "failing"
      : "pending";

  // Update DB record
  await supabase
    .from("github_pull_requests")
    .update({ checks_status: checksStatus, status: prData.state })
    .eq("pr_number", prNumber);

  return {
    number: prData.number,
    state: prData.state,
    title: prData.title,
    merged: prData.merged,
    mergeable: prData.mergeable,
    checks: checksStatus,
    additions: prData.additions,
    deletions: prData.deletions,
    changed_files: prData.changed_files,
    url: prData.html_url,
  };
}

async function mergePR(prNumber: number) {
  const { ok, data } = await githubApi(`/pulls/${prNumber}/merge`, "PUT", {
    merge_method: "squash",
  });

  if (!ok) return { error: `Failed to merge: ${JSON.stringify(data)}` };

  // Update DB
  await supabase
    .from("github_pull_requests")
    .update({ status: "merged", merged_at: new Date().toISOString() })
    .eq("pr_number", prNumber);

  return { merged: true, message: (data as any).message };
}

async function listPRs(state = "open", limit = 20) {
  const { data: prs } = await supabase
    .from("github_pull_requests")
    .select("*, roadmap_items(title, category, priority)")
    .eq("status", state)
    .order("created_at", { ascending: false })
    .limit(limit);

  return prs || [];
}

// ─── Main Handler ──────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ error: "GITHUB_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { action, ...params } = await req.json();

    let result;
    switch (action) {
      case "create_branch":
        result = await createBranch(params.branch_name, params.from_ref);
        break;

      case "create_pr":
        result = await createPR(
          params.title,
          params.body,
          params.head,
          params.base,
          params.roadmap_item_id,
          params.agent_id
        );
        break;

      case "get_pr_status":
        result = await getPRStatus(params.pr_number);
        break;

      case "merge_pr":
        result = await mergePR(params.pr_number);
        break;

      case "list_prs":
        result = await listPRs(params.state, params.limit);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
