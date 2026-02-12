/**
 * Sync Studio -- Update Shoot Plan Edge Function
 *
 * Saves user edits to a shoot plan.
 *
 * Actions:
 *   - update_shot: Update a specific shot in the plan
 *   - add_shot: Add a new shot to the plan
 *   - remove_shot: Remove a shot from the plan
 *   - reset_plan: Reset plan to original auto-generated state
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
    const { action, userId, planId, shotNumber, updates, shot } = await req.json();

    if (!userId) {
      return json({ error: "Missing userId" }, 400);
    }

    if (!planId && action !== "reset_plan") {
      return json({ error: "Missing planId" }, 400);
    }

    switch (action) {
      // ============================
      // UPDATE_SHOT: Modify a specific shot in the plan
      // ============================
      case "update_shot": {
        if (!planId) return json({ error: "Missing planId" }, 400);
        if (shotNumber == null) return json({ error: "Missing shotNumber" }, 400);
        if (!updates || typeof updates !== "object") return json({ error: "Missing or invalid updates" }, 400);

        // Fetch plan and verify ownership
        const { data: plan, error: fetchErr } = await supabase
          .from("sync_studio_shoot_plans")
          .select("*")
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .single();

        if (fetchErr || !plan) {
          console.error("[sync-studio-update-plan] update_shot fetch error:", fetchErr?.message);
          return json({ error: "Plan not found or access denied" }, 404);
        }

        const shots = plan.shots || [];
        const shotIndex = shots.findIndex((s: any) => s.shot_number === shotNumber);

        if (shotIndex === -1) {
          return json({ error: `Shot with shot_number ${shotNumber} not found` }, 404);
        }

        // Merge updates into the shot
        shots[shotIndex] = { ...shots[shotIndex], ...updates };

        const { data: updatedPlan, error: updateErr } = await supabase
          .from("sync_studio_shoot_plans")
          .update({
            shots,
            user_modified: true,
            plan_status: "user_modified",
            updated_at: new Date().toISOString(),
          })
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateErr) {
          console.error("[sync-studio-update-plan] update_shot error:", updateErr.message);
          return json({ error: `Failed to update shot: ${updateErr.message}` }, 500);
        }

        return json(updatedPlan);
      }

      // ============================
      // ADD_SHOT: Add a new shot to the plan
      // ============================
      case "add_shot": {
        if (!planId) return json({ error: "Missing planId" }, 400);
        if (!shot || typeof shot !== "object") return json({ error: "Missing or invalid shot" }, 400);

        // Fetch plan and verify ownership
        const { data: plan, error: fetchErr } = await supabase
          .from("sync_studio_shoot_plans")
          .select("*")
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .single();

        if (fetchErr || !plan) {
          console.error("[sync-studio-update-plan] add_shot fetch error:", fetchErr?.message);
          return json({ error: "Plan not found or access denied" }, 404);
        }

        const shots = plan.shots || [];

        // Assign shot_number = max existing + 1
        const maxShotNumber = shots.reduce(
          (max: number, s: any) => Math.max(max, s.shot_number || 0),
          0
        );

        const newShot = {
          ...shot,
          shot_number: maxShotNumber + 1,
        };

        shots.push(newShot);

        const { data: updatedPlan, error: updateErr } = await supabase
          .from("sync_studio_shoot_plans")
          .update({
            shots,
            total_shots: shots.length,
            user_modified: true,
            plan_status: "user_modified",
            updated_at: new Date().toISOString(),
          })
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateErr) {
          console.error("[sync-studio-update-plan] add_shot error:", updateErr.message);
          return json({ error: `Failed to add shot: ${updateErr.message}` }, 500);
        }

        return json(updatedPlan);
      }

      // ============================
      // REMOVE_SHOT: Remove a shot and re-number remaining
      // ============================
      case "remove_shot": {
        if (!planId) return json({ error: "Missing planId" }, 400);
        if (shotNumber == null) return json({ error: "Missing shotNumber" }, 400);

        // Fetch plan and verify ownership
        const { data: plan, error: fetchErr } = await supabase
          .from("sync_studio_shoot_plans")
          .select("*")
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .single();

        if (fetchErr || !plan) {
          console.error("[sync-studio-update-plan] remove_shot fetch error:", fetchErr?.message);
          return json({ error: "Plan not found or access denied" }, 404);
        }

        const shots = plan.shots || [];
        const filteredShots = shots.filter((s: any) => s.shot_number !== shotNumber);

        if (filteredShots.length === shots.length) {
          return json({ error: `Shot with shot_number ${shotNumber} not found` }, 404);
        }

        // Re-number remaining shots sequentially (1, 2, 3...)
        const renumberedShots = filteredShots.map((s: any, i: number) => ({
          ...s,
          shot_number: i + 1,
        }));

        const { data: updatedPlan, error: updateErr } = await supabase
          .from("sync_studio_shoot_plans")
          .update({
            shots: renumberedShots,
            total_shots: renumberedShots.length,
            user_modified: true,
            plan_status: "user_modified",
            updated_at: new Date().toISOString(),
          })
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateErr) {
          console.error("[sync-studio-update-plan] remove_shot error:", updateErr.message);
          return json({ error: `Failed to remove shot: ${updateErr.message}` }, 500);
        }

        return json(updatedPlan);
      }

      // ============================
      // RESET_PLAN: Reset to auto-generated state
      // ============================
      case "reset_plan": {
        if (!planId) return json({ error: "Missing planId" }, 400);

        const { data: updatedPlan, error: updateErr } = await supabase
          .from("sync_studio_shoot_plans")
          .update({
            plan_status: "pending_approval",
            user_modified: false,
            updated_at: new Date().toISOString(),
          })
          .eq("plan_id", planId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateErr) {
          console.error("[sync-studio-update-plan] reset_plan error:", updateErr.message);
          return json({ error: `Failed to reset plan: ${updateErr.message}` }, 500);
        }

        if (!updatedPlan) {
          return json({ error: "Plan not found or access denied" }, 404);
        }

        return json(updatedPlan);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("[sync-studio-update-plan]", error);
    return json({ error: error.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
