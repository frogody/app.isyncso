import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCredits } from '../_shared/credit-check.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAL_KEY = Deno.env.get("FAL_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODELS: Record<string, string> = {
  kling: "fal-ai/kling-video/v2.1/master/text-to-video",
  minimax: "fal-ai/minimax-video/video-01-live/text-to-video",
  luma: "fal-ai/luma-dream-machine",
  wan: "fal-ai/wan/v2.1/1080p",
};

const ASPECT_RATIOS: Record<string, string> = {
  "16:9": "16:9",
  "9:16": "9:16",
  "1:1": "1:1",
  "4:5": "4:3",
};

function ok(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "submit"; // "submit" | "poll" | "result"

    if (!FAL_KEY) return err("FAL_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── SUBMIT: send prompt to fal.ai queue, return immediately ──
    if (action === "submit") {
      const {
        shot_id,
        project_id,
        description,
        model = "kling",
        duration_seconds = 5,
        aspect_ratio = "16:9",
        camera_direction,
        image_url,
        user_id,
      } = body;

      if (!description) return err("Description is required", 400);

      // ── Credit check (8 credits per shot) ──────────────────────
      if (user_id) {
        const credit = await requireCredits(supabase, user_id, 'generate-shot', {
          edgeFunction: 'generate-shot',
          metadata: { model, duration_seconds, shot_id },
        });
        if (!credit.success) return credit.errorResponse!;
      }

      let prompt = description;
      if (camera_direction) prompt += `. Camera: ${camera_direction}`;
      prompt += ". Cinematic quality, professional lighting, shallow depth of field, 24fps film look.";

      const endpoint = MODELS[model] || MODELS.kling;
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: ASPECT_RATIOS[aspect_ratio] || "16:9",
      };

      if (model === "kling") {
        input.duration = duration_seconds <= 5 ? "5" : "10";
      } else if (model === "minimax") {
        input.prompt_optimizer = true;
      } else if (model === "wan") {
        input.num_frames = Math.min(Math.round(duration_seconds * 16), 81);
        input.enable_safety_checker = false;
      }

      if (image_url) input.image_url = image_url;

      const response = await fetch(`https://queue.fal.run/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const e = await response.text();
        throw new Error(`fal.ai submit error (${response.status}): ${e}`);
      }

      const data = await response.json();
      const requestId = data.request_id;
      const statusUrl = data.status_url;
      const responseUrl = data.response_url;

      if (shot_id) {
        await supabase
          .from("video_shots")
          .update({ status: "generating", prompt, model, fal_request_id: requestId })
          .eq("id", shot_id);
      }

      return ok({ request_id: requestId, model, status_url: statusUrl, response_url: responseUrl });
    }

    // ── POLL: check fal.ai queue status ──
    if (action === "poll") {
      const { request_id, status_url, response_url } = body;
      if (!request_id && !status_url) return err("request_id or status_url is required", 400);

      // Use the exact URLs fal.ai gave us (they differ from submit URLs)
      const checkUrl = status_url || `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`;
      const resultUrl = response_url || `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`;

      const statusRes = await fetch(checkUrl, {
        headers: { Authorization: `Key ${FAL_KEY}` },
      });

      if (!statusRes.ok) {
        return ok({ status: "IN_QUEUE" });
      }

      const status = await statusRes.json();

      if (status.status === "COMPLETED") {
        // Fetch result using the response_url (explicit GET)
        const resultRes = await fetch(resultUrl, {
          method: "GET",
          headers: { Authorization: `Key ${FAL_KEY}` },
        });
        if (!resultRes.ok) {
          const errText = await resultRes.text();
          throw new Error(`Failed to fetch result (${resultRes.status}): ${errText}`);
        }
        const result = await resultRes.json();

        const videoUrl =
          result.video?.url || result.data?.video?.url || result.video_url || result.output?.url;

        if (!videoUrl) throw new Error("No video URL in result");

        // Download and re-upload to storage
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error("Failed to download video");
        const videoData = new Uint8Array(await videoResponse.arrayBuffer());

        const { project_id, shot_id } = body;
        const fileName = `video-shots/${project_id || "standalone"}/${shot_id || crypto.randomUUID()}.mp4`;

        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/generated-content/${fileName}`;
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "video/mp4",
            "x-upsert": "true",
          },
          body: videoData,
        });
        if (!uploadRes.ok) throw new Error(`Storage upload error: ${await uploadRes.text()}`);

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/generated-content/${fileName}`;

        // Update DB
        if (shot_id) {
          await supabase
            .from("video_shots")
            .update({ status: "completed", video_url: publicUrl })
            .eq("id", shot_id);
        }

        // Also insert into generated_content so it shows in Content Library
        if (project_id) {
          const { data: project } = await supabase
            .from("video_projects")
            .select("company_id, created_by, name")
            .eq("id", project_id)
            .single();

          if (project) {
            const { data: shotRecord } = shot_id
              ? await supabase.from("video_shots").select("description, shot_number, prompt").eq("id", shot_id).single()
              : { data: null };

            await supabase.from("generated_content").insert({
              company_id: project.company_id,
              created_by: project.created_by,
              content_type: "video",
              name: shotRecord?.description?.slice(0, 80) || `${project.name || "Video"} - Shot`,
              url: publicUrl,
              generation_config: {
                prompt: shotRecord?.prompt || shotRecord?.description || "",
                model: body.model || "kling",
                source: "ai_studio",
                project_id,
                shot_number: shotRecord?.shot_number,
              },
            });
          }
        }

        return ok({ status: "COMPLETED", video_url: publicUrl });
      }

      if (status.status === "FAILED") {
        const { shot_id } = body;
        if (shot_id) {
          await supabase
            .from("video_shots")
            .update({ status: "failed", error: status.error || "Generation failed" })
            .eq("id", shot_id);
        }
        return ok({ status: "FAILED", error: status.error || "Generation failed" });
      }

      // Still processing
      return ok({ status: status.status || "IN_PROGRESS" });
    }

    return err("Unknown action", 400);
  } catch (error: any) {
    console.error("Shot generation error:", error);
    return err(error.message);
  }
});
