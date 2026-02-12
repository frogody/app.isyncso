/**
 * Sync Studio — Generate Shoot Plans Edge Function
 *
 * Autonomous shoot planning engine that processes products from
 * `sync_studio_products` and creates intelligent shoot plans in
 * `sync_studio_shoot_plans`.
 *
 * Uses category-based scene mapping, price tier styling, and existing
 * image analysis to determine optimal shot lists per product.
 *
 * Actions:
 *   - start: Begin generating plans for all imported products
 *   - continue: Continue generating plans for the next chunk
 *   - status: Get current planning progress
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHUNK_SIZE = 50; // Products per edge function invocation

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Category → Scene Mapping (configurable)
// ============================================

interface SceneSpec {
  scene: string;
  mood: string;
  lighting: string;
}

const CATEGORY_SCENES: Record<string, SceneSpec> = {
  "Kleding > Heren > T-shirts": {
    scene: "Flat-lay on light marble surface",
    mood: "clean & minimal",
    lighting: "soft directional from top-left",
  },
  "Kleding > Dames > Jurken": {
    scene: "Hanging on minimalist wooden hanger against linen backdrop",
    mood: "warm & editorial",
    lighting: "natural window light",
  },
  "Elektronica > Smartphones": {
    scene: "Angled on clean tech surface with subtle reflection",
    mood: "sleek & modern",
    lighting: "cool studio, gradient background",
  },
  "Tuin > Gereedschap": {
    scene: "Workshop bench or garden context, in-use feel",
    mood: "rugged & authentic",
    lighting: "natural daylight",
  },
  "Koken > Messen": {
    scene: "Kitchen counter with cutting board, herbs scattered",
    mood: "warm culinary",
    lighting: "warm overhead",
  },
  "Baby > Speelgoed": {
    scene: "Soft nursery setting, pastel rug or blanket",
    mood: "gentle & warm",
    lighting: "soft diffused",
  },
  "Sport > Hardlopen > Schoenen": {
    scene: "Athletic outdoor, track or trail context",
    mood: "dynamic & energetic",
    lighting: "golden hour / bright outdoor",
  },
  "Wonen > Verlichting": {
    scene: "Styled room interior, evening ambiance",
    mood: "cozy & aspirational",
    lighting: "product as light source + ambient",
  },
  "Beauty > Huidverzorging": {
    scene: "Marble/stone surface, botanical elements, water droplets",
    mood: "spa & premium",
    lighting: "soft diffused, high-key",
  },
};

const FALLBACK_SCENE: SceneSpec = {
  scene: "Clean white background, 3/4 angle",
  mood: "clean & neutral",
  lighting: "neutral studio lighting",
};

// ============================================
// Price Tier → Styling
// ============================================

interface PriceTier {
  name: string;
  styling: string;
}

function getPriceTier(price: number | null): PriceTier {
  if (price === null || price === undefined) {
    return { name: "unknown", styling: "Clean, bright, straightforward. Clarity over mood." };
  }
  if (price < 25) {
    return { name: "budget", styling: "Clean, bright, straightforward. Clarity over mood." };
  }
  if (price <= 100) {
    return { name: "mid-range", styling: "Lifestyle context, warm tones, editorial feel." };
  }
  if (price <= 500) {
    return { name: "premium", styling: "Aspirational, premium surfaces (marble, dark wood, linen)." };
  }
  return { name: "luxury", styling: "Minimal, high-end editorial, negative space, gallery-like." };
}

// ============================================
// Category Scene Matching (longest prefix)
// ============================================

function matchCategoryScene(categoryPath: string | null): SceneSpec {
  if (!categoryPath) return FALLBACK_SCENE;

  // Sort keys by length descending for longest prefix match
  const sortedKeys = Object.keys(CATEGORY_SCENES).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (categoryPath.startsWith(key)) {
      return CATEGORY_SCENES[key];
    }
  }

  return FALLBACK_SCENE;
}

// ============================================
// Shot Count Logic
// ============================================

interface ShotSpec {
  shot_number: number;
  shot_type: string;
  description: string;
  mood: string;
  background: string;
  focus: string;
}

function determineShotCount(existingImages: string[] | null): number {
  const count = existingImages?.length || 0;
  if (count === 0) return 4;
  if (count === 1) return 3;
  if (count <= 3) return 2;
  return 1;
}

function getShotTypes(shotCount: number): string[] {
  switch (shotCount) {
    case 4: return ["hero", "lifestyle", "detail", "alternate"];
    case 3: return ["hero", "lifestyle", "detail"];
    case 2: return ["lifestyle", "contextual"];
    case 1: return ["lifestyle"];
    default: return ["hero"];
  }
}

// ============================================
// Shot Spec Generation
// ============================================

function generateShotSpecs(
  product: any,
  scene: SceneSpec,
  priceTier: PriceTier,
): ShotSpec[] {
  const shotCount = determineShotCount(product.existing_image_urls);
  const shotTypes = getShotTypes(shotCount);
  const title = product.title || "Product";

  return shotTypes.map((shotType, index) => {
    const spec: ShotSpec = {
      shot_number: index + 1,
      shot_type: shotType,
      description: "",
      mood: scene.mood,
      background: scene.scene,
      focus: "",
    };

    switch (shotType) {
      case "hero":
        spec.description = `Main product shot of ${title}. ${scene.scene}. ${priceTier.styling}`;
        spec.focus = "Full product visibility, clean composition, brand-ready";
        break;
      case "lifestyle":
        spec.description = `Lifestyle/context shot of ${title} in natural setting. ${priceTier.styling}`;
        spec.focus = "Product in use or styled environment, emotional connection";
        break;
      case "detail":
        spec.description = `Close-up detail shot highlighting texture, material, or key feature of ${title}.`;
        spec.focus = "Texture, craftsmanship, material quality, macro perspective";
        break;
      case "alternate":
        spec.description = `Alternate angle of ${title}, showing back or side view. ${scene.scene}.`;
        spec.focus = "Secondary angle, completeness of product view";
        break;
      case "contextual":
        spec.description = `${title} shown in real-world context with complementary items. ${priceTier.styling}`;
        spec.focus = "Contextual storytelling, product ecosystem, scale reference";
        break;
      default:
        spec.description = `Product shot of ${title}. ${scene.scene}.`;
        spec.focus = "Product clarity";
    }

    return spec;
  });
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action, userId, companyId, importJobId, page } = await req.json();

    if (!userId || !companyId) {
      return json({ error: "Missing userId or companyId" }, 400);
    }

    switch (action) {
      // ============================
      // START: Begin generating plans
      // ============================
      case "start": {
        if (!importJobId) return json({ error: "Missing importJobId" }, 400);

        // Verify import job exists and is in planning state
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_import_jobs")
          .select("*")
          .eq("id", importJobId)
          .single();

        if (jobErr || !job) {
          return json({ error: "Import job not found" }, 404);
        }

        // Get total product count for this user
        const { count: totalProducts } = await supabase
          .from("sync_studio_products")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (!totalProducts || totalProducts === 0) {
          // No products to plan
          await supabase
            .from("sync_studio_import_jobs")
            .update({
              status: "completed",
              planned_products: 0,
              total_shots_planned: 0,
            })
            .eq("id", importJobId);

          return json({
            importJobId,
            status: "completed",
            planned: 0,
            totalPlanned: 0,
            totalShots: 0,
            hasMore: false,
            nextPage: null,
          });
        }

        // Update job to planning status
        await supabase
          .from("sync_studio_import_jobs")
          .update({
            status: "planning",
            planned_products: 0,
            total_shots_planned: 0,
          })
          .eq("id", importJobId);

        // Fetch first chunk of products
        const { data: products, error: prodErr } = await supabase
          .from("sync_studio_products")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .range(0, CHUNK_SIZE - 1);

        if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);

        let plannedCount = 0;
        let totalShots = 0;

        for (const product of (products || [])) {
          const scene = matchCategoryScene(product.category_path);
          const priceTier = getPriceTier(product.price);
          const shots = generateShotSpecs(product, scene, priceTier);

          const reasoning = [
            `Category: ${product.category_path || "Unknown"}`,
            `Price: €${product.price ?? "?"} (${priceTier.name})`,
            `Scene: ${scene.scene}`,
            `Mood: ${scene.mood}`,
            `Lighting: ${scene.lighting}`,
            `Existing images: ${product.existing_image_urls?.length || 0}`,
          ].join(" | ");

          const { error: upsertErr } = await supabase
            .from("sync_studio_shoot_plans")
            .upsert({
              product_ean: product.ean,
              user_id: userId,
              product_title: product.title,
              plan_status: "pending_approval",
              total_shots: shots.length,
              reasoning,
              shots,
            }, { onConflict: "product_ean,user_id" });

          if (upsertErr) {
            console.warn(`[sync-studio-generate-plans] Failed to upsert plan for ${product.ean}: ${upsertErr.message}`);
            continue;
          }

          plannedCount++;
          totalShots += shots.length;
        }

        // Update job progress
        await supabase
          .from("sync_studio_import_jobs")
          .update({
            planned_products: plannedCount,
            total_shots_planned: totalShots,
          })
          .eq("id", importJobId);

        const hasMore = (products?.length || 0) >= CHUNK_SIZE && plannedCount < totalProducts;

        // If no more products, mark as completed
        if (!hasMore) {
          await supabase
            .from("sync_studio_import_jobs")
            .update({ status: "completed" })
            .eq("id", importJobId);
        }

        return json({
          importJobId,
          status: hasMore ? "planning" : "completed",
          planned: plannedCount,
          totalPlanned: plannedCount,
          totalShots,
          hasMore,
          nextPage: hasMore ? 2 : null,
        });
      }

      // ============================
      // CONTINUE: Next chunk
      // ============================
      case "continue": {
        if (!importJobId) return json({ error: "Missing importJobId" }, 400);

        const currentPage = page || 2;
        const offset = (currentPage - 1) * CHUNK_SIZE;

        // Get current job state
        const { data: job } = await supabase
          .from("sync_studio_import_jobs")
          .select("planned_products, total_shots_planned")
          .eq("id", importJobId)
          .single();

        // Get total product count
        const { count: totalProducts } = await supabase
          .from("sync_studio_products")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        // Fetch next chunk of products
        const { data: products, error: prodErr } = await supabase
          .from("sync_studio_products")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .range(offset, offset + CHUNK_SIZE - 1);

        if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);

        if (!products || products.length === 0) {
          // No more products — mark as completed
          await supabase
            .from("sync_studio_import_jobs")
            .update({ status: "completed" })
            .eq("id", importJobId);

          return json({
            importJobId,
            status: "completed",
            planned: 0,
            totalPlanned: job?.planned_products || 0,
            totalShots: job?.total_shots_planned || 0,
            hasMore: false,
            nextPage: null,
          });
        }

        let plannedCount = 0;
        let chunkShots = 0;

        for (const product of products) {
          const scene = matchCategoryScene(product.category_path);
          const priceTier = getPriceTier(product.price);
          const shots = generateShotSpecs(product, scene, priceTier);

          const reasoning = [
            `Category: ${product.category_path || "Unknown"}`,
            `Price: €${product.price ?? "?"} (${priceTier.name})`,
            `Scene: ${scene.scene}`,
            `Mood: ${scene.mood}`,
            `Lighting: ${scene.lighting}`,
            `Existing images: ${product.existing_image_urls?.length || 0}`,
          ].join(" | ");

          const { error: upsertErr } = await supabase
            .from("sync_studio_shoot_plans")
            .upsert({
              product_ean: product.ean,
              user_id: userId,
              product_title: product.title,
              plan_status: "pending_approval",
              total_shots: shots.length,
              reasoning,
              shots,
            }, { onConflict: "product_ean,user_id" });

          if (upsertErr) {
            console.warn(`[sync-studio-generate-plans] Failed to upsert plan for ${product.ean}: ${upsertErr.message}`);
            continue;
          }

          plannedCount++;
          chunkShots += shots.length;
        }

        // Update cumulative totals
        const newTotalPlanned = (job?.planned_products || 0) + plannedCount;
        const newTotalShots = (job?.total_shots_planned || 0) + chunkShots;

        const hasMore = products.length >= CHUNK_SIZE && newTotalPlanned < (totalProducts || 0);

        await supabase
          .from("sync_studio_import_jobs")
          .update({
            planned_products: newTotalPlanned,
            total_shots_planned: newTotalShots,
            ...(hasMore ? {} : { status: "completed" }),
          })
          .eq("id", importJobId);

        return json({
          importJobId,
          status: hasMore ? "planning" : "completed",
          planned: plannedCount,
          totalPlanned: newTotalPlanned,
          totalShots: newTotalShots,
          hasMore,
          nextPage: hasMore ? currentPage + 1 : null,
        });
      }

      // ============================
      // STATUS: Check progress
      // ============================
      case "status": {
        if (!importJobId) {
          // Get latest job for user
          const { data: latest } = await supabase
            .from("sync_studio_import_jobs")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latest) return json({ status: "none" });

          // Get plan stats
          const { count: plannedCount } = await supabase
            .from("sync_studio_shoot_plans")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

          return json({
            ...latest,
            planned_products: latest.planned_products || plannedCount || 0,
          });
        }

        const { data: jobData } = await supabase
          .from("sync_studio_import_jobs")
          .select("*")
          .eq("id", importJobId)
          .single();

        if (!jobData) return json({ error: "Job not found" }, 404);

        // Get plan stats for this job's user
        const { count: totalPlans } = await supabase
          .from("sync_studio_shoot_plans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        return json({
          ...jobData,
          total_plans: totalPlans || 0,
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error("[sync-studio-generate-plans]", error);
    return json({ error: error.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
