import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `You are a professional video director and storyboard artist. You create shot-by-shot storyboards for short cinematic videos.

RULES:
- Each shot should be 3-6 seconds long
- Total shot count = ceil(target_duration / 4) typically
- Every shot description must be a single, detailed visual scene that an AI video generator can create
- Include specific details: lighting, camera angle, subject appearance, setting, mood
- Describe real people naturally (e.g., "a woman in her 30s with dark hair" not "an AI person")
- Follow narrative structure: hook → problem/tension → solution/discovery → features/benefits → CTA/resolution
- Camera directions should use film terminology: wide shot, medium close-up, tracking shot, dolly zoom, rack focus, push-in, pull-back, bird's eye, low angle, over-the-shoulder
- Transitions: "cut" (hard), "dissolve" (soft blend), "fade" (to/from black), "wipe"
- Text overlays should be short (max 6 words), impactful, and only when they add value

STYLE ADJUSTMENTS:
- cinematic: dramatic lighting, shallow depth of field, slow push-ins, 24fps feel, anamorphic look
- documentary: natural lighting, handheld feel, real environments, talking head angles
- social_media: fast cuts, punchy, bright colors, vertical framing, text-heavy overlays
- product_showcase: clean backgrounds, hero lighting on product, 360 rotations, macro details
- corporate: professional settings, warm lighting, confident subjects, clean typography
- creative: unusual angles, color grading, abstract transitions, artistic compositions

OUTPUT FORMAT (strict JSON):
{
  "title": "string",
  "narrative_arc": "string describing the story flow",
  "total_duration_seconds": number,
  "shots": [
    {
      "shot_number": number,
      "scene": "short scene title",
      "description": "detailed visual description for AI video generation",
      "camera": "camera direction/movement",
      "duration_seconds": number,
      "mood": "single word mood",
      "text_overlay": "string or null",
      "transition_to_next": "cut|dissolve|fade|wipe"
    }
  ],
  "music_mood": "string",
  "voiceover_script": "string or null"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      project_id,
      brief,
      product_context,
      brand_context,
      target_duration,
      style,
      aspect_ratio,
    } = await req.json();

    if (!brief) {
      return new Response(
        JSON.stringify({ error: "Brief is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update project status
    if (project_id) {
      await supabase
        .from("video_projects")
        .update({ status: "storyboarding" })
        .eq("id", project_id);
    }

    // Build user prompt
    let userPrompt = `Create a storyboard for a ${target_duration || 30}-second ${style || "cinematic"} video.\n\n`;
    userPrompt += `BRIEF: ${brief}\n`;
    userPrompt += `ASPECT RATIO: ${aspect_ratio || "16:9"}\n`;

    if (product_context) {
      userPrompt += `\nPRODUCT: ${product_context.name || ""}`;
      if (product_context.description) userPrompt += `\nDESCRIPTION: ${product_context.description}`;
      if (product_context.features?.length) {
        userPrompt += `\nKEY FEATURES: ${product_context.features.map((f: any) => typeof f === "string" ? f : f.name || f.title).join(", ")}`;
      }
      if (product_context.tagline) userPrompt += `\nTAGLINE: ${product_context.tagline}`;
    }

    if (brand_context) {
      if (brand_context.tone) userPrompt += `\nBRAND TONE: ${brand_context.tone}`;
      if (brand_context.target_audience) userPrompt += `\nTARGET AUDIENCE: ${brand_context.target_audience}`;
    }

    userPrompt += `\n\nGenerate the storyboard as JSON. Make it compelling and cinematic.`;

    // Call Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      throw new Error(`Groq API error: ${err}`);
    }

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in Groq response");

    const storyboard = JSON.parse(content);

    // Update project with storyboard
    if (project_id) {
      await supabase
        .from("video_projects")
        .update({
          storyboard,
          status: "draft",
          name: storyboard.title || "Untitled Project",
        })
        .eq("id", project_id);

      // Create shot records
      if (storyboard.shots?.length) {
        const shotRecords = storyboard.shots.map((shot: any) => ({
          project_id,
          shot_number: shot.shot_number,
          description: shot.description,
          camera_direction: shot.camera,
          duration_seconds: shot.duration_seconds,
          status: "pending",
          generation_config: {
            scene: shot.scene,
            mood: shot.mood,
            text_overlay: shot.text_overlay,
            transition_to_next: shot.transition_to_next,
          },
        }));

        await supabase.from("video_shots").insert(shotRecords);
      }
    }

    return new Response(
      JSON.stringify({ storyboard }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Storyboard generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
