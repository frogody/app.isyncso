/**
 * Sync Studio -- Regenerate Shot Edge Function
 *
 * Regenerates a single image by calling the existing `generate-image`
 * edge function. Looks up the shot spec from the shoot plan and the
 * product details, builds a prompt, and replaces the existing image.
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

// ============================================
// Prompt Builder
// ============================================

function buildPrompt(
  shot: { description?: string; background?: string; mood?: string; focus?: string },
  product: { title?: string },
): string {
  return (
    [
      shot.description,
      shot.background ? `Background: ${shot.background}` : null,
      shot.mood ? `Mood: ${shot.mood}` : null,
      shot.focus ? `Focus: ${shot.focus}` : null,
      product.title ? `Product: ${product.title}` : null,
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
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { userId, companyId, imageId, planId, productEan, shotNumber } =
      await req.json();

    // Validate required fields
    if (!userId) return json({ error: "Missing userId" }, 400);
    if (!imageId) return json({ error: "Missing imageId" }, 400);
    if (!planId) return json({ error: "Missing planId" }, 400);
    if (!productEan) return json({ error: "Missing productEan" }, 400);
    if (!shotNumber) return json({ error: "Missing shotNumber" }, 400);

    // 1. Verify the existing image row exists
    const { data: existingImage, error: imgErr } = await supabase
      .from("sync_studio_generated_images")
      .select("image_id")
      .eq("image_id", imageId)
      .single();

    if (imgErr || !existingImage) {
      return json({ error: `Image ${imageId} not found` }, 404);
    }

    // 2. Mark as generating
    await supabase
      .from("sync_studio_generated_images")
      .update({ status: "generating" })
      .eq("image_id", imageId);

    try {
      // 3. Get the shot spec from the shoot plan
      const { data: plan, error: planErr } = await supabase
        .from("sync_studio_shoot_plans")
        .select("shots")
        .eq("plan_id", planId)
        .single();

      if (planErr || !plan) {
        throw new Error(`Plan ${planId} not found: ${planErr?.message}`);
      }

      const shots = plan.shots as Array<{
        shot_number: number;
        description?: string;
        background?: string;
        mood?: string;
        focus?: string;
      }>;
      const shot =
        shots.find((s) => s.shot_number === shotNumber) ||
        shots[shotNumber - 1];

      if (!shot) {
        throw new Error(
          `Shot ${shotNumber} not found in plan ${planId} (${shots.length} shots available)`,
        );
      }

      // 4. Get the product for title and existing images
      const { data: product, error: prodErr } = await supabase
        .from("sync_studio_products")
        .select("title, existing_image_urls")
        .eq("ean", productEan)
        .eq("user_id", userId)
        .single();

      if (prodErr || !product) {
        throw new Error(
          `Product ${productEan} not found: ${prodErr?.message}`,
        );
      }

      // 5. Build prompt
      const prompt = buildPrompt(shot, product);

      // 6. Call generate-image edge function
      const effectiveCompanyId = companyId || userId;

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
            company_id: effectiveCompanyId,
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
      const newImageUrl =
        genData.url || genData.image_url || genData.data?.url || null;

      if (!newImageUrl) {
        throw new Error(
          "generate-image returned no image URL in response",
        );
      }

      // 7. Update the row: completed with new URL, clear error
      await supabase
        .from("sync_studio_generated_images")
        .update({
          status: "completed",
          image_url: newImageUrl,
          error_message: null,
        })
        .eq("image_id", imageId);

      return json({
        image_id: imageId,
        image_url: newImageUrl,
        status: "completed",
      });
    } catch (err: unknown) {
      // On error: mark as failed with error message
      const message =
        err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[sync-studio-regenerate-shot] Image ${imageId} failed:`,
        message,
      );

      await supabase
        .from("sync_studio_generated_images")
        .update({ status: "failed", error_message: message })
        .eq("image_id", imageId);

      return json({ error: message, image_id: imageId, status: "failed" }, 500);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal error";
    console.error("[sync-studio-regenerate-shot]", error);
    return json({ error: message }, 500);
  }
});
