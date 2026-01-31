import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SHOTSTACK_BASE = SHOTSTACK_API_KEY?.startsWith("stag")
  ? "https://api.shotstack.io/stage"
  : "https://api.shotstack.io/v1";

const TRANSITION_MAP: Record<string, any> = {
  dissolve: { in: "fade", out: "fade" },
  fade: { in: "fade", out: "fade" },
  cut: {},
  wipe: { in: "wipeRight", out: "wipeLeft" },
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

function buildShotstackTimeline(shots: any[], storyboard: any, settings: any): any {
  const aspectRatio = settings?.aspect_ratio || "16:9";
  let currentTime = 0;
  const overlapSeconds = 0.5;

  const videoClips = shots.map((shot, i) => {
    const duration = shot.duration_seconds || 5;
    const storyboardShot = storyboard?.shots?.[i];
    const transitionType = storyboardShot?.transition_to_next || "cut";
    const transition = TRANSITION_MAP[transitionType] || {};

    const clip: any = {
      asset: { type: "video", src: shot.video_url, volume: 0 },
      start: currentTime,
      length: duration,
    };

    if (i > 0 && transition.in) {
      clip.transition = { ...(clip.transition || {}), in: transition.in };
    }
    if (i < shots.length - 1 && transition.out) {
      clip.transition = { ...(clip.transition || {}), out: transition.out };
    }

    const hasTransition = i < shots.length - 1 && transitionType !== "cut";
    currentTime += duration - (hasTransition ? overlapSeconds : 0);
    return clip;
  });

  const textClips: any[] = [];
  let textTime = 0;

  shots.forEach((shot, i) => {
    const duration = shot.duration_seconds || 5;
    const storyboardShot = storyboard?.shots?.[i];
    const textOverlay = storyboardShot?.text_overlay;
    const transitionType = storyboardShot?.transition_to_next || "cut";

    if (textOverlay && textOverlay !== "null") {
      textClips.push({
        asset: { type: "title", text: textOverlay, style: "minimal", color: "#ffffff", size: "medium", position: "bottom" },
        start: textTime + 0.5,
        length: Math.min(duration - 1, 3),
        transition: { in: "fade", out: "fade" },
      });
    }

    const hasTransition = i < shots.length - 1 && transitionType !== "cut";
    textTime += duration - (hasTransition ? overlapSeconds : 0);
  });

  const timeline: any = { tracks: [{ clips: videoClips }], background: "#000000" };
  if (textClips.length > 0) timeline.tracks.unshift({ clips: textClips });

  return {
    timeline,
    output: {
      format: "mp4",
      resolution: aspectRatio === "1:1" || aspectRatio === "4:5" ? "sd" : "hd",
      aspectRatio,
      fps: 30,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "submit"; // "submit" | "poll"

    if (!SHOTSTACK_API_KEY) return err("SHOTSTACK_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── SUBMIT: build timeline and send to Shotstack ──
    if (action === "submit") {
      const { project_id } = body;
      if (!project_id) return err("project_id is required", 400);

      const { data: project, error: projErr } = await supabase
        .from("video_projects")
        .select("*")
        .eq("id", project_id)
        .single();

      if (projErr || !project) throw new Error(`Project not found: ${projErr?.message}`);

      const { data: shots, error: shotsErr } = await supabase
        .from("video_shots")
        .select("*")
        .eq("project_id", project_id)
        .eq("status", "completed")
        .order("shot_number", { ascending: true });

      if (shotsErr || !shots?.length) throw new Error(`No completed shots found`);

      await supabase.from("video_projects").update({ status: "assembling" }).eq("id", project_id);

      const shotstackPayload = buildShotstackTimeline(shots, project.storyboard, project.settings);

      const renderResponse = await fetch(`${SHOTSTACK_BASE}/render`, {
        method: "POST",
        headers: {
          "x-api-key": SHOTSTACK_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shotstackPayload),
      });

      if (!renderResponse.ok) {
        const e = await renderResponse.text();
        throw new Error(`Shotstack render submit failed: ${e}`);
      }

      const renderData = await renderResponse.json();
      const renderId = renderData.response?.id;
      if (!renderId) throw new Error(`No render ID: ${JSON.stringify(renderData)}`);

      await supabase.from("video_projects").update({ shotstack_render_id: renderId }).eq("id", project_id);

      return ok({ render_id: renderId, status: "rendering" });
    }

    // ── POLL: check Shotstack render status ──
    if (action === "poll") {
      const { render_id, project_id } = body;
      if (!render_id) return err("render_id is required", 400);

      const statusResponse = await fetch(`${SHOTSTACK_BASE}/render/${render_id}`, {
        headers: { "x-api-key": SHOTSTACK_API_KEY },
      });

      if (!statusResponse.ok) return ok({ status: "rendering" });

      const statusData = await statusResponse.json();
      const status = statusData.response?.status;

      if (status === "done") {
        const finalUrl = statusData.response?.url;
        if (!finalUrl) throw new Error("Render done but no URL");

        // Download and re-upload
        const videoResponse = await fetch(finalUrl);
        if (!videoResponse.ok) throw new Error("Failed to download assembled video");
        const videoData = new Uint8Array(await videoResponse.arrayBuffer());

        const fileName = `video-projects/${project_id || "unknown"}/final.mp4`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/generated-content/${fileName}`;
        await fetch(uploadUrl, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "video/mp4",
            "x-upsert": "true",
          },
          body: videoData,
        });

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/generated-content/${fileName}`;

        if (project_id) {
          await supabase
            .from("video_projects")
            .update({ status: "completed", final_video_url: publicUrl })
            .eq("id", project_id);
        }

        return ok({ status: "completed", video_url: publicUrl });
      }

      if (status === "failed") {
        if (project_id) {
          await supabase.from("video_projects").update({ status: "failed" }).eq("id", project_id);
        }
        return ok({ status: "failed", error: statusData.response?.error || "Render failed" });
      }

      return ok({ status: status || "rendering" });
    }

    return err("Unknown action", 400);
  } catch (error: any) {
    console.error("Assembly error:", error);
    return err(error.message);
  }
});
