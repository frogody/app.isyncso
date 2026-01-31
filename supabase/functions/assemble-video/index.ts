import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Shotstack API base (use staging for testing, production for live)
const SHOTSTACK_BASE = SHOTSTACK_API_KEY?.startsWith("stag")
  ? "https://api.shotstack.io/stage"
  : "https://api.shotstack.io/v1";

const TRANSITION_MAP: Record<string, any> = {
  dissolve: { in: "fade", out: "fade" },
  fade: { in: "fade", out: "fade" },
  cut: {},
  wipe: { in: "wipeRight", out: "wipeLeft" },
};

async function uploadToStorage(
  bucket: string,
  fileName: string,
  data: Uint8Array,
  contentType: string
): Promise<string> {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
  await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: data,
  });
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
}

function buildShotstackTimeline(
  shots: any[],
  storyboard: any,
  settings: any
): any {
  const aspectRatio = settings?.aspect_ratio || "16:9";
  let currentTime = 0;
  const overlapSeconds = 0.5; // transition overlap

  // Video track — main clips
  const videoClips = shots.map((shot, i) => {
    const duration = shot.duration_seconds || 5;
    const storyboardShot = storyboard?.shots?.[i];
    const transitionType = storyboardShot?.transition_to_next || "cut";
    const transition = TRANSITION_MAP[transitionType] || {};

    const clip: any = {
      asset: {
        type: "video",
        src: shot.video_url,
        volume: 0, // mute individual clips (music track handles audio)
      },
      start: currentTime,
      length: duration,
    };

    // Add transitions (except for first clip's "in" and last clip's "out")
    if (i > 0 && transition.in) {
      clip.transition = { ...(clip.transition || {}), in: transition.in };
    }
    if (i < shots.length - 1 && transition.out) {
      clip.transition = { ...(clip.transition || {}), out: transition.out };
    }

    // Advance time with overlap for transitions
    const hasTransition = i < shots.length - 1 && transitionType !== "cut";
    currentTime += duration - (hasTransition ? overlapSeconds : 0);

    return clip;
  });

  // Text overlay track
  const textClips: any[] = [];
  let textTime = 0;

  shots.forEach((shot, i) => {
    const duration = shot.duration_seconds || 5;
    const storyboardShot = storyboard?.shots?.[i];
    const textOverlay = storyboardShot?.text_overlay;
    const transitionType = storyboardShot?.transition_to_next || "cut";

    if (textOverlay) {
      textClips.push({
        asset: {
          type: "title",
          text: textOverlay,
          style: "minimal",
          color: "#ffffff",
          size: "medium",
          position: "bottom",
        },
        start: textTime + 0.5,
        length: Math.min(duration - 1, 3),
        transition: { in: "fade", out: "fade" },
      });
    }

    const hasTransition = i < shots.length - 1 && transitionType !== "cut";
    textTime += duration - (hasTransition ? overlapSeconds : 0);
  });

  const timeline: any = {
    tracks: [
      { clips: videoClips },
    ],
    background: "#000000",
  };

  if (textClips.length > 0) {
    timeline.tracks.unshift({ clips: textClips });
  }

  const resolutions: Record<string, string> = {
    "16:9": "hd",
    "9:16": "hd",
    "1:1": "sd",
    "4:5": "sd",
  };

  return {
    timeline,
    output: {
      format: "mp4",
      resolution: resolutions[aspectRatio] || "hd",
      aspectRatio: aspectRatio,
      fps: 30,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SHOTSTACK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SHOTSTACK_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch project
    const { data: project, error: projErr } = await supabase
      .from("video_projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projErr || !project) {
      throw new Error(`Project not found: ${projErr?.message}`);
    }

    // Fetch completed shots ordered by shot_number
    const { data: shots, error: shotsErr } = await supabase
      .from("video_shots")
      .select("*")
      .eq("project_id", project_id)
      .eq("status", "completed")
      .order("shot_number", { ascending: true });

    if (shotsErr || !shots?.length) {
      throw new Error(`No completed shots found: ${shotsErr?.message || "0 shots"}`);
    }

    // Update project status
    await supabase
      .from("video_projects")
      .update({ status: "assembling" })
      .eq("id", project_id);

    // Build Shotstack timeline
    const shotstackPayload = buildShotstackTimeline(
      shots,
      project.storyboard,
      project.settings
    );

    // Submit render to Shotstack
    const renderResponse = await fetch(`${SHOTSTACK_BASE}/render`, {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shotstackPayload),
    });

    if (!renderResponse.ok) {
      const err = await renderResponse.text();
      throw new Error(`Shotstack render submit failed: ${err}`);
    }

    const renderData = await renderResponse.json();
    const renderId = renderData.response?.id;

    if (!renderId) {
      throw new Error(`No render ID returned: ${JSON.stringify(renderData)}`);
    }

    // Save render ID
    await supabase
      .from("video_projects")
      .update({ shotstack_render_id: renderId })
      .eq("id", project_id);

    // Poll for completion (max 5 minutes)
    let finalUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const statusResponse = await fetch(`${SHOTSTACK_BASE}/render/${renderId}`, {
        headers: { "x-api-key": SHOTSTACK_API_KEY },
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.response?.status;

      if (status === "done") {
        finalUrl = statusData.response?.url;
        break;
      }

      if (status === "failed") {
        throw new Error(`Shotstack render failed: ${statusData.response?.error || "Unknown"}`);
      }
    }

    if (!finalUrl) {
      throw new Error("Shotstack render timed out");
    }

    // Download and re-upload to our storage
    const videoResponse = await fetch(finalUrl);
    if (!videoResponse.ok) throw new Error("Failed to download assembled video");
    const videoData = new Uint8Array(await videoResponse.arrayBuffer());

    const fileName = `video-projects/${project_id}/final.mp4`;
    const publicUrl = await uploadToStorage("generated-content", fileName, videoData, "video/mp4");

    // Update project as completed
    await supabase
      .from("video_projects")
      .update({
        status: "completed",
        final_video_url: publicUrl,
      })
      .eq("id", project_id);

    return new Response(
      JSON.stringify({
        video_url: publicUrl,
        shotstack_render_id: renderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Assembly error:", error);

    // Try to update project status
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.project_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("video_projects")
          .update({ status: "failed" })
          .eq("id", body.project_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
