/**
 * Sync Studio -- Execute Photoshoot Edge Function
 *
 * Starts and continues a batch photoshoot job. Processes approved shoot
 * plans by calling the existing `generate-image` edge function for each
 * shot. Designed for chunked execution to avoid edge function timeouts.
 *
 * Actions:
 *   - start:    Create job, seed pending images, process first chunk
 *   - continue: Process next chunk of pending images
 *   - cancel:   Cancel job and remove remaining pending images
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHUNK_SIZE = 5; // Images per invocation (avoid timeout)

// ============================================
// Shoot Settings Types & Constants
// ============================================

interface ShootSettings {
  vibe?: string | null;
  background?: string;
  lighting?: string;
  aspect_ratio?: string;
  width?: number;
  height?: number;
  batch_size?: number;
  variety_mode?: string;
}

const VIBES: Record<string, {
  name: string;
  background_hint: string;
  mood_hint: string;
  lighting_hint: string;
  composition_hint: string;
}> = {
  clean_studio: {
    name: "Clean Studio",
    background_hint: "Pure white seamless studio background",
    mood_hint: "Clean, precise, commercial",
    lighting_hint: "Bright even studio lighting, minimal shadows",
    composition_hint: "Centered product, generous white space",
  },
  lifestyle: {
    name: "Lifestyle",
    background_hint: "Natural home or lifestyle environment",
    mood_hint: "Warm, inviting, relatable",
    lighting_hint: "Soft natural window light",
    composition_hint: "Product in context with complementary items",
  },
  luxury: {
    name: "Luxury",
    background_hint: "Premium surfaces: marble, dark wood, velvet",
    mood_hint: "Aspirational, premium, elegant",
    lighting_hint: "Dramatic directional lighting with rich shadows",
    composition_hint: "Generous negative space, editorial framing",
  },
  minimalist: {
    name: "Minimalist",
    background_hint: "Monochrome surface, subtle texture",
    mood_hint: "Minimal, serene, refined",
    lighting_hint: "Soft diffused light, minimal contrast",
    composition_hint: "Rule of thirds, maximum simplicity",
  },
  bold_vibrant: {
    name: "Bold & Vibrant",
    background_hint: "Bold colored gradient or textured background",
    mood_hint: "Energetic, playful, attention-grabbing",
    lighting_hint: "Bright, saturated, high-key lighting",
    composition_hint: "Dynamic angles, bold crop",
  },
  natural: {
    name: "Natural",
    background_hint: "Natural materials: linen, wood, stone, plants",
    mood_hint: "Organic, authentic, earthy",
    lighting_hint: "Golden hour or soft outdoor light",
    composition_hint: "Organic arrangement with natural props",
  },
  editorial: {
    name: "Editorial",
    background_hint: "Architectural or styled editorial set",
    mood_hint: "Artistic, curated, fashion-forward",
    lighting_hint: "Dramatic studio lighting with intentional shadows",
    composition_hint: "Off-center, cropped, magazine-style framing",
  },
  dark_moody: {
    name: "Dark & Moody",
    background_hint: "Dark, deep-toned background with subtle texture",
    mood_hint: "Moody, cinematic, mysterious",
    lighting_hint: "Low-key lighting, dramatic rim light, deep shadows",
    composition_hint: "Chiaroscuro, product emerging from darkness",
  },
};

const LIGHTING_PROMPTS: Record<string, string> = {
  natural: "Natural daylight, soft shadows",
  studio: "Professional studio lighting, even illumination",
  dramatic: "Dramatic directional lighting with deep shadows",
  soft: "Soft diffused lighting, minimal contrast",
  golden_hour: "Warm golden hour sunlight",
  neon: "Neon-lit environment with colorful reflections",
};

const BG_PROMPTS: Record<string, string> = {
  white: "Pure white seamless background",
  gradient: "Smooth gradient background",
  textured: "Textured surface background",
  environment: "Real-world environment setting",
  abstract: "Abstract artistic background",
  transparent: "Clean isolated subject on transparent background",
};

const VARIETY_SUFFIXES: Record<string, string> = {
  conservative: "",
  moderate: "Vary the angle and arrangement slightly from other shots.",
  creative: "Use a unique creative angle, unexpected crop, or artistic composition that stands out.",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Prompt Builder
// ============================================

/**
 * Simplify a product title by taking only the brand + product type,
 * stripping specs like dimensions, materials codes, EAN, prices.
 */
function simplifyProductTitle(title: string | undefined): string | null {
  if (!title) return null;
  // Remove common spec patterns: dimensions (1.4mm, 24cm, 16m-16mm),
  // parenthetical specs, numeric codes, price patterns
  let clean = title
    .replace(/\([^)]*\)/g, " ")                   // remove parenthetical specs
    .replace(/\d+(\.\d+)?\s*(mm|cm|m|g|kg|ct|ml)\b/gi, " ")  // dimensions
    .replace(/\d{4,}/g, " ")                       // long numbers (EAN, codes)
    .replace(/€\s*\d+/g, " ")                      // prices
    .replace(/\b\d+[x×]\d+/g, " ")                // dimensions like 10x20
    .replace(/\s{2,}/g, " ")                       // collapse whitespace
    .trim();
  // Take first ~60 chars to keep it concise
  if (clean.length > 60) {
    clean = clean.substring(0, 60).replace(/\s\S*$/, "");
  }
  return clean || null;
}

function buildPrompt(
  shot: { description?: string; background?: string; mood?: string; focus?: string },
  product: { title?: string },
  settings?: ShootSettings | null,
): string {
  const vibe = settings?.vibe ? VIBES[settings.vibe] : null;

  // Background priority: explicit setting > vibe hint > shot background
  const background =
    (settings?.background && settings.background !== "auto" ? BG_PROMPTS[settings.background] : null) ||
    vibe?.background_hint ||
    shot.background ||
    null;

  // Mood priority: vibe hint > shot mood
  const mood = vibe?.mood_hint || shot.mood || null;

  // Lighting priority: explicit setting > vibe hint > nothing
  const lighting =
    (settings?.lighting && settings.lighting !== "auto" ? LIGHTING_PROMPTS[settings.lighting] : null) ||
    vibe?.lighting_hint ||
    null;

  // Composition: vibe hint (additive)
  const composition = vibe?.composition_hint || null;

  // Variety suffix
  const variety = settings?.variety_mode ? VARIETY_SUFFIXES[settings.variety_mode] : null;

  // Simplify product title to avoid FLUX rendering specs as text
  const cleanTitle = simplifyProductTitle(product.title);

  // Also simplify shot.description — strip specs that leaked in from product title
  let cleanDescription = shot.description || "";
  if (product.title && cleanDescription.includes(product.title)) {
    cleanDescription = cleanDescription.replace(product.title, cleanTitle || "the product");
  }

  return (
    [
      cleanDescription,
      background ? `Background: ${background}` : null,
      mood ? `Mood: ${mood}` : null,
      lighting ? `Lighting: ${lighting}` : null,
      composition ? `Composition: ${composition}` : null,
      shot.focus ? `Focus: ${shot.focus}` : null,
      cleanTitle ? `Product: ${cleanTitle}` : null,
      variety || null,
      "Do not include any text, words, numbers, labels, or watermarks in the image.",
    ]
      .filter(Boolean)
      .join(". ") + "."
  );
}

// ============================================
// Response Helper
// ============================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================
// Process a single image row
// ============================================

async function processImage(
  supabase: ReturnType<typeof createClient>,
  image: {
    image_id: string;
    plan_id: string;
    product_ean: string;
    shot_number: number;
  },
  userId: string,
  companyId: string,
  settings?: ShootSettings | null,
): Promise<"completed" | "failed"> {
  const { image_id, plan_id, product_ean, shot_number } = image;

  // Mark as generating
  await supabase
    .from("sync_studio_generated_images")
    .update({ status: "generating" })
    .eq("image_id", image_id);

  try {
    // Get the plan to access the shots array
    const { data: plan, error: planErr } = await supabase
      .from("sync_studio_shoot_plans")
      .select("shots")
      .eq("plan_id", plan_id)
      .single();

    if (planErr || !plan) {
      throw new Error(`Plan ${plan_id} not found: ${planErr?.message}`);
    }

    // Get the specific shot spec by shot_number (1-indexed in data, array is 0-indexed)
    const shots = plan.shots as Array<{
      shot_number: number;
      description?: string;
      background?: string;
      mood?: string;
      focus?: string;
    }>;
    const shot =
      shots.find((s) => s.shot_number === shot_number) ||
      shots[shot_number - 1];

    if (!shot) {
      throw new Error(
        `Shot ${shot_number} not found in plan ${plan_id} (${shots.length} shots available)`,
      );
    }

    // Get the product for existing images and title
    const { data: product, error: prodErr } = await supabase
      .from("sync_studio_products")
      .select("title, existing_image_urls")
      .eq("ean", product_ean)
      .eq("user_id", userId)
      .single();

    if (prodErr || !product) {
      throw new Error(
        `Product ${product_ean} not found: ${prodErr?.message}`,
      );
    }

    // Call the existing generate-image edge function
    const prompt = buildPrompt(shot, product, settings);

    const genResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          product_name: product.title,
          product_images: product.existing_image_urls || [],
          use_case: "product_scene",
          style: "photorealistic",
          user_id: userId,
          company_id: companyId,
          width: settings?.width || 1024,
          height: settings?.height || 1024,
        }),
      },
    );

    if (!genResponse.ok) {
      const errText = await genResponse.text();
      throw new Error(
        `generate-image returned ${genResponse.status}: ${errText}`,
      );
    }

    const genData = await genResponse.json();
    const imageUrl =
      genData.url || genData.image_url || genData.data?.url || null;

    if (!imageUrl) {
      throw new Error(
        "generate-image returned no image URL in response",
      );
    }

    // Mark as completed with URL
    await supabase
      .from("sync_studio_generated_images")
      .update({ status: "completed", image_url: imageUrl })
      .eq("image_id", image_id);

    return "completed";
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[sync-studio-execute-photoshoot] Image ${image_id} failed:`,
      message,
    );

    await supabase
      .from("sync_studio_generated_images")
      .update({ status: "failed", error_message: message })
      .eq("image_id", image_id);

    return "failed";
  }
}

// ============================================
// Process a chunk of pending images
// ============================================

async function processChunk(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  userId: string,
  companyId: string,
  settings?: ShootSettings | null,
): Promise<{ completed: number; failed: number; processed: number }> {
  // Fetch the next CHUNK_SIZE pending images
  const { data: pendingImages, error: fetchErr } = await supabase
    .from("sync_studio_generated_images")
    .select("image_id, plan_id, product_ean, shot_number")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(CHUNK_SIZE);

  if (fetchErr) {
    throw new Error(`Failed to fetch pending images: ${fetchErr.message}`);
  }

  if (!pendingImages || pendingImages.length === 0) {
    return { completed: 0, failed: 0, processed: 0 };
  }

  let completed = 0;
  let failed = 0;

  for (const image of pendingImages) {
    const result = await processImage(supabase, image, userId, companyId, settings);
    if (result === "completed") {
      completed++;
    } else {
      failed++;
    }
  }

  return { completed, failed, processed: pendingImages.length };
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
    const { action, userId, companyId, jobId, shootSettings } = await req.json();

    if (!userId) {
      return json({ error: "Missing userId" }, 400);
    }

    switch (action) {
      // ============================
      // START: Create job and begin
      // ============================
      case "start": {
        // 1. Count all approved shoot plans for this user
        const { data: approvedPlans, error: plansErr } = await supabase
          .from("sync_studio_shoot_plans")
          .select("plan_id, product_ean, total_shots, shots")
          .eq("user_id", userId)
          .eq("plan_status", "approved");

        if (plansErr) {
          return json(
            { error: `Failed to fetch approved plans: ${plansErr.message}` },
            500,
          );
        }

        if (!approvedPlans || approvedPlans.length === 0) {
          return json(
            { error: "No approved shoot plans found. Approve plans first." },
            400,
          );
        }

        // 2. Calculate total images from the sum of total_shots
        const totalImages = approvedPlans.reduce(
          (sum, plan) => sum + (plan.total_shots || 0),
          0,
        );

        // 3. Create a new sync_studio_jobs row
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_jobs")
          .insert({
            user_id: userId,
            status: "processing",
            total_products: approvedPlans.length,
            total_images: totalImages,
            images_completed: 0,
            images_failed: 0,
            vibe: shootSettings?.vibe || null,
            shoot_settings: shootSettings || null,
          })
          .select("job_id")
          .single();

        if (jobErr || !job) {
          return json(
            { error: `Failed to create job: ${jobErr?.message}` },
            500,
          );
        }

        const newJobId = job.job_id;

        // 4. For each approved plan, create generated_images rows (one per shot)
        const imageRows: Array<{
          job_id: string;
          plan_id: string;
          product_ean: string;
          shot_number: number;
          status: string;
        }> = [];

        for (const plan of approvedPlans) {
          const shots = (plan.shots as Array<{ shot_number?: number }>) || [];
          const shotCount = shots.length || plan.total_shots || 0;

          for (let i = 0; i < shotCount; i++) {
            imageRows.push({
              job_id: newJobId,
              plan_id: plan.plan_id,
              product_ean: plan.product_ean,
              shot_number: shots[i]?.shot_number ?? i + 1,
              status: "pending",
            });
          }
        }

        if (imageRows.length > 0) {
          const { error: insertErr } = await supabase
            .from("sync_studio_generated_images")
            .insert(imageRows);

          if (insertErr) {
            console.error(
              "[sync-studio-execute-photoshoot] Failed to insert image rows:",
              insertErr.message,
            );
            return json(
              {
                error: `Failed to create image records: ${insertErr.message}`,
              },
              500,
            );
          }
        }

        // 5. Update each plan's plan_status to 'generating'
        const planIds = approvedPlans.map((p) => p.plan_id);
        await supabase
          .from("sync_studio_shoot_plans")
          .update({ plan_status: "generating" })
          .eq("user_id", userId)
          .in("plan_id", planIds);

        // 6. Process the first chunk
        const effectiveCompanyId = companyId || userId;
        const chunkResult = await processChunk(
          supabase,
          newJobId,
          userId,
          effectiveCompanyId,
          shootSettings as ShootSettings | null,
        );

        // Update job counters
        await supabase
          .from("sync_studio_jobs")
          .update({
            images_completed: chunkResult.completed,
            images_failed: chunkResult.failed,
          })
          .eq("job_id", newJobId);

        // Check if there are more pending
        const { count: remainingCount } = await supabase
          .from("sync_studio_generated_images")
          .select("*", { count: "exact", head: true })
          .eq("job_id", newJobId)
          .eq("status", "pending");

        const hasMore = (remainingCount || 0) > 0;

        // If done, complete the job
        if (!hasMore) {
          await supabase
            .from("sync_studio_jobs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("job_id", newJobId);
        }

        return json({
          jobId: newJobId,
          status: hasMore ? "processing" : "completed",
          totalImages,
          completed: chunkResult.completed,
          failed: chunkResult.failed,
          hasMore,
        });
      }

      // ============================
      // CONTINUE: Process next chunk
      // ============================
      case "continue": {
        if (!jobId) return json({ error: "Missing jobId" }, 400);

        // 1. Get the job (verify user_id matches)
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_jobs")
          .select("*")
          .eq("job_id", jobId)
          .eq("user_id", userId)
          .single();

        if (jobErr || !job) {
          return json({ error: "Job not found or access denied" }, 404);
        }

        if (job.status === "completed" || job.status === "cancelled") {
          return json({
            jobId,
            status: job.status,
            totalImages: job.total_images,
            completed: job.images_completed,
            failed: job.images_failed,
            hasMore: false,
          });
        }

        // 2-3. Process next chunk
        const effectiveCompanyId = companyId || userId;
        const jobSettings = job.shoot_settings as ShootSettings | null;
        const chunkResult = await processChunk(
          supabase,
          jobId,
          userId,
          effectiveCompanyId,
          jobSettings,
        );

        // 4. Update job counters (cumulative)
        const newCompleted = job.images_completed + chunkResult.completed;
        const newFailed = job.images_failed + chunkResult.failed;

        // 5. Check for remaining pending images
        const { count: remainingCount } = await supabase
          .from("sync_studio_generated_images")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId)
          .eq("status", "pending");

        const hasMore = (remainingCount || 0) > 0;

        // Update job status and counters
        const updatePayload: Record<string, unknown> = {
          images_completed: newCompleted,
          images_failed: newFailed,
        };

        if (!hasMore) {
          updatePayload.status = "completed";
          updatePayload.completed_at = new Date().toISOString();
        }

        await supabase
          .from("sync_studio_jobs")
          .update(updatePayload)
          .eq("job_id", jobId);

        return json({
          jobId,
          status: hasMore ? "processing" : "completed",
          totalImages: job.total_images,
          completed: newCompleted,
          failed: newFailed,
          hasMore,
        });
      }

      // ============================
      // CANCEL: Stop and clean up
      // ============================
      case "cancel": {
        if (!jobId) return json({ error: "Missing jobId" }, 400);

        // Get current job state
        const { data: job, error: jobErr } = await supabase
          .from("sync_studio_jobs")
          .select("*")
          .eq("job_id", jobId)
          .eq("user_id", userId)
          .single();

        if (jobErr || !job) {
          return json({ error: "Job not found or access denied" }, 404);
        }

        // 1. Set job status to cancelled
        await supabase
          .from("sync_studio_jobs")
          .update({
            status: "cancelled",
            completed_at: new Date().toISOString(),
          })
          .eq("job_id", jobId);

        // 2. Delete all pending images for this job
        await supabase
          .from("sync_studio_generated_images")
          .delete()
          .eq("job_id", jobId)
          .eq("status", "pending");

        return json({
          jobId,
          status: "cancelled",
          completed: job.images_completed,
          failed: job.images_failed,
        });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal error";
    console.error("[sync-studio-execute-photoshoot]", error);
    return json({ error: message }, 500);
  }
});
