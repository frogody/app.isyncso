import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAL_KEY = Deno.env.get("FAL_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// fal.ai model endpoints
const MODELS: Record<string, string> = {
  kling: "fal-ai/kling-video/v2/standard/text-to-video",
  minimax: "fal-ai/minimax-video/video-01-live/text-to-video",
  luma: "fal-ai/luma-dream-machine",
  wan: "fal-ai/wan/v2.1/1080p",
};

const ASPECT_RATIOS: Record<string, string> = {
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1",
  "4:5": "4:3", // closest supported
};

async function uploadToStorage(
  bucket: string,
  fileName: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: data,
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Storage upload error: ${err}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}

// Submit async request to fal.ai
async function submitFalRequest(
  model: string,
  prompt: string,
  duration: number,
  aspectRatio: string,
  imageUrl?: string
): Promise<string> {
  const endpoint = MODELS[model] || MODELS.kling;

  const input: Record<string, any> = {
    prompt,
    aspect_ratio: ASPECT_RATIOS[aspectRatio] || "16:9",
  };

  // Model-specific params
  if (model === "kling") {
    input.duration = duration <= 5 ? "5" : "10";
  } else if (model === "minimax") {
    input.prompt_optimizer = true;
  } else if (model === "luma") {
    // Luma uses different param names
  } else if (model === "wan") {
    input.num_frames = Math.min(Math.round(duration * 16), 81); // wan uses 16fps, max 81 frames
    input.enable_safety_checker = false;
  }

  if (imageUrl) {
    input.image_url = imageUrl;
  }

  // Submit to fal.ai queue
  const response = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`fal.ai submit error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.request_id;
}

// Poll for completion
async function pollFalResult(
  model: string,
  requestId: string,
  maxAttempts = 120,
  intervalMs = 5000
): Promise<{ videoUrl: string; thumbnailUrl?: string }> {
  const endpoint = MODELS[model] || MODELS.kling;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const statusResponse = await fetch(
      `https://queue.fal.run/${endpoint}/requests/${requestId}/status`,
      {
        headers: { Authorization: `Key ${FAL_KEY}` },
      }
    );

    if (!statusResponse.ok) continue;

    const status = await statusResponse.json();

    if (status.status === "COMPLETED") {
      // Fetch the actual result
      const resultResponse = await fetch(
        `https://queue.fal.run/${endpoint}/requests/${requestId}`,
        {
          headers: { Authorization: `Key ${FAL_KEY}` },
        }
      );

      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch result: ${await resultResponse.text()}`);
      }

      const result = await resultResponse.json();

      // Different models return video in different fields
      const videoUrl =
        result.video?.url ||
        result.data?.video?.url ||
        result.video_url ||
        result.output?.url;

      if (!videoUrl) {
        throw new Error(`No video URL in result: ${JSON.stringify(result).slice(0, 500)}`);
      }

      return {
        videoUrl,
        thumbnailUrl: result.thumbnail?.url || result.data?.thumbnail?.url,
      };
    }

    if (status.status === "FAILED") {
      throw new Error(`fal.ai generation failed: ${status.error || "Unknown error"}`);
    }
  }

  throw new Error("fal.ai generation timed out");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      shot_id,
      project_id,
      description,
      model = "kling",
      duration_seconds = 5,
      aspect_ratio = "16:9",
      camera_direction,
      image_url,
    } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!FAL_KEY) {
      return new Response(
        JSON.stringify({ error: "FAL_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build cinematic prompt
    let prompt = description;
    if (camera_direction) {
      prompt += `. Camera: ${camera_direction}`;
    }
    prompt += ". Cinematic quality, professional lighting, shallow depth of field, 24fps film look.";

    // Update shot status
    if (shot_id) {
      await supabase
        .from("video_shots")
        .update({ status: "generating", prompt, model })
        .eq("id", shot_id);
    }

    // Submit to fal.ai
    const requestId = await submitFalRequest(
      model,
      prompt,
      duration_seconds,
      aspect_ratio,
      image_url
    );

    // Update with request ID
    if (shot_id) {
      await supabase
        .from("video_shots")
        .update({ fal_request_id: requestId })
        .eq("id", shot_id);
    }

    // Poll for result
    const result = await pollFalResult(model, requestId);

    // Download and re-upload to our storage
    const videoResponse = await fetch(result.videoUrl);
    if (!videoResponse.ok) throw new Error("Failed to download generated video");
    const videoData = new Uint8Array(await videoResponse.arrayBuffer());

    const fileName = `video-shots/${project_id || "standalone"}/${shot_id || crypto.randomUUID()}.mp4`;
    const publicUrl = await uploadToStorage("generated-content", fileName, videoData, "video/mp4");

    // Upload thumbnail if available
    let thumbnailPublicUrl: string | undefined;
    if (result.thumbnailUrl) {
      try {
        const thumbResponse = await fetch(result.thumbnailUrl);
        if (thumbResponse.ok) {
          const thumbData = new Uint8Array(await thumbResponse.arrayBuffer());
          thumbnailPublicUrl = await uploadToStorage(
            "generated-content",
            fileName.replace(".mp4", "_thumb.jpg"),
            thumbData,
            "image/jpeg"
          );
        }
      } catch {
        // Thumbnail upload is non-critical
      }
    }

    // Update shot record
    if (shot_id) {
      await supabase
        .from("video_shots")
        .update({
          status: "completed",
          video_url: publicUrl,
          thumbnail_url: thumbnailPublicUrl || null,
        })
        .eq("id", shot_id);
    }

    return new Response(
      JSON.stringify({
        video_url: publicUrl,
        thumbnail_url: thumbnailPublicUrl,
        fal_request_id: requestId,
        model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Shot generation error:", error);

    // Try to update shot status on failure
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.shot_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("video_shots")
          .update({
            status: "failed",
            error: error.message,
            retry_count: body.retry_count ? body.retry_count + 1 : 1,
          })
          .eq("id", body.shot_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
