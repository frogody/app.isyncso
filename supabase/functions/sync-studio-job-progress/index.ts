/**
 * Sync Studio -- Job Progress Polling Edge Function
 *
 * Returns the current status of a photoshoot generation job,
 * including counters and recently completed images.
 * The frontend polls this every 2-3 seconds during generation.
 *
 * Actions:
 *   - status: Get job status with counters and recent images
 *   - shot_breakdown: Get counts of generated images by shot type
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action, userId, jobId } = await req.json();

    if (!userId) {
      return json({ error: "Missing userId" }, 400);
    }

    switch (action) {
      // ============================
      // STATUS: Get job status with counters and recent images
      // ============================
      case "status": {
        // Fetch the job -- either by jobId or the latest for this user
        let job: Record<string, unknown> | null = null;

        if (jobId) {
          const { data, error } = await supabase
            .from("sync_studio_jobs")
            .select("*")
            .eq("job_id", jobId)
            .eq("user_id", userId)
            .single();

          if (error) {
            console.error(
              "[sync-studio-job-progress] job fetch error:",
              error.message
            );
          }
          job = data;
        } else {
          const { data, error } = await supabase
            .from("sync_studio_jobs")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(
              "[sync-studio-job-progress] latest job fetch error:",
              error.message
            );
          }
          job = data;
        }

        if (!job) {
          return json({ status: "none" });
        }

        const currentJobId = job.job_id as string;

        // Count distinct products completed (at least one image with status='completed')
        const { count: productsCompleted } = await supabase
          .from("sync_studio_generated_images")
          .select("product_ean", { count: "exact", head: true })
          .eq("job_id", currentJobId)
          .eq("status", "completed");

        // For distinct count we need a different approach since supabase-js
        // doesn't support COUNT(DISTINCT ...) directly. Use an RPC or query all
        // completed product_eans and deduplicate.
        const { data: completedEans } = await supabase
          .from("sync_studio_generated_images")
          .select("product_ean")
          .eq("job_id", currentJobId)
          .eq("status", "completed");

        const uniqueCompletedEans = new Set(
          (completedEans || []).map(
            (row: { product_ean: string }) => row.product_ean
          )
        );

        // Calculate rate metrics
        const imagesCompleted = (job.images_completed as number) || 0;
        const totalImages = (job.total_images as number) || 0;
        const createdAt = new Date(job.created_at as string);
        const now = new Date();
        const minutesElapsed =
          (now.getTime() - createdAt.getTime()) / (1000 * 60);

        let imagesPerMinute = 0;
        if (minutesElapsed > 0 && imagesCompleted > 0) {
          imagesPerMinute =
            Math.round((imagesCompleted / minutesElapsed) * 10) / 10;
        }

        let estimatedMinutesRemaining: number | null = null;
        const imagesRemaining = totalImages - imagesCompleted;
        if (imagesPerMinute > 0 && imagesRemaining > 0) {
          estimatedMinutesRemaining = Math.ceil(
            imagesRemaining / imagesPerMinute
          );
        }

        // Fetch last 10 completed images with product title from sync_studio_products
        const { data: recentImages, error: recentErr } = await supabase
          .from("sync_studio_generated_images")
          .select("image_id, image_url, product_ean, shot_number")
          .eq("job_id", currentJobId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10);

        if (recentErr) {
          console.error(
            "[sync-studio-job-progress] recent images error:",
            recentErr.message
          );
        }

        // Enrich recent images with product_title from sync_studio_products
        const enrichedImages: Array<Record<string, unknown>> = [];
        if (recentImages && recentImages.length > 0) {
          const eans = [
            ...new Set(
              recentImages.map(
                (img: { product_ean: string }) => img.product_ean
              )
            ),
          ];

          const { data: products } = await supabase
            .from("sync_studio_products")
            .select("ean, title")
            .eq("user_id", userId)
            .in("ean", eans);

          const titleMap = new Map<string, string>();
          for (const p of products || []) {
            titleMap.set(p.ean, p.title || p.ean);
          }

          for (const img of recentImages) {
            enrichedImages.push({
              image_id: img.image_id,
              image_url: img.image_url,
              product_ean: img.product_ean,
              shot_number: img.shot_number,
              product_title: titleMap.get(img.product_ean) || img.product_ean,
            });
          }
        }

        return json({
          ...job,
          products_completed: uniqueCompletedEans.size,
          products_total: (job.total_products as number) || 0,
          images_per_minute: imagesPerMinute,
          estimated_minutes_remaining: estimatedMinutesRemaining,
          recent_images: enrichedImages,
        });
      }

      // ============================
      // SHOT_BREAKDOWN: Count images by shot type
      // ============================
      case "shot_breakdown": {
        if (!jobId) {
          return json({ error: "Missing jobId for shot_breakdown" }, 400);
        }

        // Fetch approved shoot plans for this user, iterate their shots JSONB
        // arrays, and count by shot_type.
        const { data: plans, error: plansErr } = await supabase
          .from("sync_studio_shoot_plans")
          .select("shots")
          .eq("user_id", userId)
          .eq("plan_status", "approved");

        if (plansErr) {
          console.error(
            "[sync-studio-job-progress] plans fetch error:",
            plansErr.message
          );
          return json(
            { error: `Failed to fetch plans: ${plansErr.message}` },
            500
          );
        }

        // Count by shot_type across all plans' shots arrays
        const breakdown: Record<string, number> = {
          hero: 0,
          lifestyle: 0,
          detail: 0,
          alternate: 0,
          contextual: 0,
        };

        for (const plan of plans || []) {
          const shots = plan.shots as
            | Array<{ shot_type?: string }>
            | null;
          if (!shots || !Array.isArray(shots)) continue;

          for (const shot of shots) {
            const shotType = shot.shot_type || "unknown";
            if (shotType in breakdown) {
              breakdown[shotType]++;
            } else {
              breakdown[shotType] = (breakdown[shotType] || 0) + 1;
            }
          }
        }

        return json(breakdown);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal error";
    console.error("[sync-studio-job-progress]", error);
    return json({ error: message }, 500);
  }
});
