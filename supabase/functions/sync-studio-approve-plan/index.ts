/**
 * Sync Studio — Approve Shoot Plans Edge Function
 *
 * Handles approving shoot plans for the Sync Studio workflow.
 *
 * Actions:
 *   - approve: Approve a single plan by planId
 *   - approve_all: Approve all pending plans for a user
 *   - stats: Get approval stats for the dashboard
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action, userId, planId } = await req.json();

    if (!userId) {
      return json({ error: "Missing userId" }, 400);
    }

    switch (action) {
      // ============================
      // APPROVE: Approve a single plan
      // ============================
      case "approve": {
        if (!planId) return json({ error: "Missing planId" }, 400);

        const { data: updatedPlan, error: updateErr } = await supabase
          .from("sync_studio_shoot_plans")
          .update({
            plan_status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateErr) {
          console.error("[sync-studio-approve-plan] approve error:", updateErr.message);
          return json({ error: `Failed to approve plan: ${updateErr.message}` }, 500);
        }

        if (!updatedPlan) {
          return json({ error: "Plan not found" }, 404);
        }

        return json(updatedPlan);
      }

      // ============================
      // APPROVE_ALL: Approve all pending plans
      // ============================
      case "approve_all": {
        const { data: updatedPlans, error: updateErr } = await supabase
          .from("sync_studio_shoot_plans")
          .update({
            plan_status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("plan_status", "pending_approval")
          .select();

        if (updateErr) {
          console.error("[sync-studio-approve-plan] approve_all error:", updateErr.message);
          return json({ error: `Failed to approve plans: ${updateErr.message}` }, 500);
        }

        return json({ approved: updatedPlans?.length || 0 });
      }

      // ============================
      // STATS: Get approval stats
      // ============================
      case "stats": {
        // Get all plans for this user
        const { data: plans, error: plansErr } = await supabase
          .from("sync_studio_shoot_plans")
          .select("plan_status, total_shots, user_modified")
          .eq("user_id", userId);

        if (plansErr) {
          console.error("[sync-studio-approve-plan] stats error:", plansErr.message);
          return json({ error: `Failed to fetch stats: ${plansErr.message}` }, 500);
        }

        const allPlans = plans || [];

        const totalProducts = allPlans.length;
        const totalShots = allPlans.reduce((sum, p) => sum + (p.total_shots || 0), 0);
        const approvedProducts = allPlans.filter((p) => p.plan_status === "approved").length;
        const pendingProducts = allPlans.filter((p) => p.plan_status === "pending_approval").length;
        const modifiedProducts = allPlans.filter((p) => p.user_modified === true).length;

        return json({
          totalProducts,
          totalShots,
          approvedProducts,
          pendingProducts,
          modifiedProducts,
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("[sync-studio-approve-plan]", error);
    return json({ error: error.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
