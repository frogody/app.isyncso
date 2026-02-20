import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!TOGETHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TOGETHER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      listing_title,
      short_tagline,
      listing_description,
      bullet_points,
      seo_title,
      seo_description,
      search_keywords,
      hero_image_url,
      gallery_urls,
      video_url,
      video_reference_frames,
      product_name,
      product_brand,
      product_category,
      channel,
    } = await req.json();

    const imageCount = (hero_image_url ? 1 : 0) + (gallery_urls?.length || 0);
    const hasVideo = !!video_url;
    const bulletCount = bullet_points?.length || 0;
    const keywordCount = search_keywords?.length || 0;

    const prompt = `You are a senior e-commerce listing optimization expert. Audit this product listing and provide a detailed, actionable report.

## Product Context
- Product: ${product_name || "Unknown"}
- Brand: ${product_brand || "Unknown"}
- Category: ${product_category || "General"}
- Target channel: ${channel || "General marketplace"}

## Current Listing Content

### Title
"${listing_title || "(empty)"}"

### Tagline
"${short_tagline || "(empty)"}"

### Bullet Points (${bulletCount} total)
${bullet_points?.length ? bullet_points.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n") : "(none)"}

### Description
${listing_description ? listing_description.substring(0, 2000) : "(empty)"}

### SEO
- SEO Title (${(seo_title || "").length} chars): "${seo_title || "(empty)"}"
- Meta Description (${(seo_description || "").length} chars): "${seo_description || "(empty)"}"
- Keywords (${keywordCount}): ${search_keywords?.join(", ") || "(none)"}

### Media
- Images: ${imageCount} (hero: ${hero_image_url ? "yes" : "no"}, gallery: ${gallery_urls?.length || 0})
- Video: ${hasVideo ? "yes" : "no"}
- Advised: 11 images (3 studio, 4 lifestyle, 4 USP graphics) + 1 video

## Instructions

Analyze every aspect and return a JSON object with this EXACT structure:

{
  "overall_score": <number 0-100>,
  "summary": "<1-2 sentence overall verdict>",
  "categories": [
    {
      "name": "Title & Tagline",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": ["<specific issue>"],
      "suggestions": ["<specific actionable fix>"]
    },
    {
      "name": "Bullet Points",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": [],
      "suggestions": []
    },
    {
      "name": "Description",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": [],
      "suggestions": []
    },
    {
      "name": "Images & Video",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": [],
      "suggestions": []
    },
    {
      "name": "SEO",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": [],
      "suggestions": []
    }
  ],
  "top_priorities": [
    "<most impactful change #1>",
    "<most impactful change #2>",
    "<most impactful change #3>"
  ]
}

Scoring guide:
- Title: penalize if >80 chars, no brand, no key benefit, generic language, keyword stuffing
- Bullets: penalize if <5 bullets, >7 bullets, no benefit-driven language, too short, too long, repetitive
- Description: penalize if <150 words, no formatting/headers, no call to action, duplicate of bullets
- Images: score relative to 11 ideal (3 studio + 4 lifestyle + 4 USP). No video = -10 points.
- SEO: penalize if title >60 chars, description >160 chars, <5 keywords, no meta description

Be brutally honest. Every suggestion must be specific and actionable — not vague. Reference the actual content.

Return ONLY valid JSON, no markdown fences, no explanation.`;

    const togetherResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          { role: "system", content: "You are an e-commerce listing audit expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!togetherResponse.ok) {
      const errText = await togetherResponse.text();
      console.error("[audit-listing] Together error:", errText);
      return new Response(
        JSON.stringify({ error: "AI audit failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const togetherData = await togetherResponse.json();
    const content = togetherData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let audit;
    try {
      audit = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown fences
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        audit = JSON.parse(match[1]);
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to parse audit response", raw: content }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify(audit), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[audit-listing] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
