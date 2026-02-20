import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Together AI helper
async function togetherChat(
  model: string,
  messages: Array<{ role: string; content: any }>,
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
) {
  const body: any = {
    model,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.max_tokens ?? 2000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOGETHER_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Together API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Parse JSON from LLM response (handles markdown fences)
function parseJSON(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Failed to parse JSON from response");
  }
}

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

    // Collect all image URLs
    const allImageUrls: string[] = [];
    if (hero_image_url) allImageUrls.push(hero_image_url);
    if (Array.isArray(gallery_urls)) {
      gallery_urls.forEach((url: string) => { if (url) allImageUrls.push(url); });
    }

    const imageCount = allImageUrls.length;
    const hasVideo = !!video_url;
    const bulletCount = bullet_points?.length || 0;
    const keywordCount = search_keywords?.length || 0;

    // ═══════════════════════════════════════════════════════
    // STEP 1: Vision analysis of all images
    // ═══════════════════════════════════════════════════════

    let imageAnalysis = "No images available for visual analysis.";

    if (allImageUrls.length > 0) {
      console.log(`[audit-listing] Analyzing ${allImageUrls.length} images with vision model...`);

      const imageContent: any[] = [
        {
          type: "text",
          text: `You are an expert e-commerce image analyst. Analyze each of these ${allImageUrls.length} product images for "${product_name || "this product"}" (${product_brand || "unknown brand"}).

For EACH image, describe:
1. **Type**: Is it a studio shot (white background), lifestyle shot, USP graphic, infographic, or other?
2. **What it shows**: Product angle, setting, visible features, text overlays
3. **Quality**: Lighting, composition, resolution assessment, professionalism
4. **Features visible**: Which specific product features/USPs are highlighted or visible?
5. **Issues**: Any problems (blurry, poor lighting, wrong aspect ratio, text hard to read, AI artifacts, unrealistic elements)

Then provide an OVERALL VISUAL ASSESSMENT:
- Image variety: Do images cover studio, lifestyle, and USP graphic types?
- Feature coverage: Which key product features are well-represented visually? Which are MISSING from all images?
- Hero image quality: Is the main/first image strong enough to drive clicks?
- Conversion readiness: Would these images convince a buyer on a marketplace?

The product's key features (from bullet points) are:
${bullet_points?.length ? bullet_points.map((b: string, i: number) => `- ${b}`).join("\n") : "(no bullet points provided)"}

Be specific. Reference image numbers (Image 1 = hero, Image 2+).`,
        },
      ];

      // Add each image (limit to 6 to avoid token overflow)
      const imagesToAnalyze = allImageUrls.slice(0, 6);
      imagesToAnalyze.forEach((url, i) => {
        imageContent.push({
          type: "image_url",
          image_url: { url },
        });
      });

      try {
        imageAnalysis = await togetherChat(
          "meta-llama/Llama-4-Scout-17B-16E-Instruct",
          [{ role: "user", content: imageContent }],
          { temperature: 0.2, max_tokens: 2000 }
        );
        console.log("[audit-listing] Vision analysis complete");
      } catch (visionErr: any) {
        console.warn("[audit-listing] Vision analysis failed, falling back:", visionErr.message);
        imageAnalysis = `Vision analysis unavailable. ${imageCount} images provided (hero: ${hero_image_url ? "yes" : "no"}, gallery: ${gallery_urls?.length || 0}). Cannot assess image content, quality, or feature coverage.`;
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Comprehensive audit with image analysis context
    // ═══════════════════════════════════════════════════════

    const auditPrompt = `You are a senior e-commerce listing optimization consultant who has audited thousands of product listings on Amazon, bol.com, and Shopify. Provide a brutally honest, data-driven audit.

## Product Context
- Product: ${product_name || "Unknown"}
- Brand: ${product_brand || "Unknown"}
- Category: ${product_category || "General"}
- Target channel: ${channel || "General marketplace"}

## Current Listing Content

### Title (${(listing_title || "").length} chars)
"${listing_title || "(empty)"}"

### Tagline
"${short_tagline || "(empty)"}"

### Bullet Points (${bulletCount} total)
${bullet_points?.length ? bullet_points.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n") : "(none)"}

### Description (${listing_description ? listing_description.split(/\s+/).length : 0} words)
${listing_description ? listing_description.substring(0, 2000) : "(empty)"}

### SEO
- SEO Title (${(seo_title || "").length} chars): "${seo_title || "(empty)"}"
- Meta Description (${(seo_description || "").length} chars): "${seo_description || "(empty)"}"
- Keywords (${keywordCount}): ${search_keywords?.join(", ") || "(none)"}

### Media Stats
- Images: ${imageCount} (hero: ${hero_image_url ? "yes" : "no"}, gallery: ${gallery_urls?.length || 0})
- Video: ${hasVideo ? "yes" : "no"}
- Ideal: 11 images (3 studio, 4 lifestyle, 4 USP graphics) + 1 video

### AI Image Analysis (each image was analyzed by a vision model)
${imageAnalysis}

## Audit Instructions

Return a JSON object with this EXACT structure. Be specific and reference actual content.

{
  "overall_score": <0-100>,
  "summary": "<2-3 sentence verdict — direct, no fluff>",
  "categories": [
    {
      "name": "Title & Tagline",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": ["<specific problem referencing actual content>"],
      "suggestions": ["<specific fix with example rewrite>"]
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
      "name": "Visual Content",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": ["<specific image problems found by vision analysis — e.g. 'Image 3 has AI artifacts', 'No image highlights the SteamGlide soleplate feature'>"],
      "suggestions": ["<specific visual improvements — e.g. 'Add a close-up USP graphic showing the OptimalTEMP dial with text overlay'>"]
    },
    {
      "name": "SEO & Discoverability",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": [],
      "suggestions": []
    },
    {
      "name": "Conversion Readiness",
      "score": <0-100>,
      "status": "good" | "warning" | "critical",
      "issues": ["<what would make a buyer hesitate — e.g. 'No social proof or comparison to competitors', 'Description reads like a spec sheet, not a sales pitch'>"],
      "suggestions": ["<what would increase add-to-cart rate>"]
    }
  ],
  "top_priorities": [
    "<#1 highest-impact change with specific action>",
    "<#2>",
    "<#3>",
    "<#4>",
    "<#5>"
  ],
  "missing_usp_visuals": [
    "<key product feature/USP from bullet points that has NO dedicated image — e.g. 'OptimalTEMP technology has no visual explanation'>"
  ]
}

## Scoring Guide

**Title & Tagline:**
- >80 chars: -15 | No brand: -10 | No key benefit: -15 | No tagline: -10
- Generic/vague language: -10 | Keyword stuffing: -10

**Bullet Points:**
- <5 bullets: -15 | >7 bullets: -5 | No benefit-driven language: -15
- No specifics (numbers, measurements): -10 | Repetitive content: -10

**Description:**
- <150 words: -15 | No formatting/headers: -10 | No CTA: -10
- Duplicates bullets: -10 | No brand story/emotional hook: -10

**Visual Content (USE THE IMAGE ANALYSIS ABOVE):**
- <5 images: -20 | No studio shots: -15 | No lifestyle shots: -15
- No USP graphics: -20 | AI artifacts visible: -10 per image
- Key USPs not shown in ANY image: -10 per missing USP
- No video: -10 | Poor hero image: -15

**SEO & Discoverability:**
- Title >60 chars: -10 | Description >160 chars: -5 | <5 keywords: -15
- No meta description: -15 | Keywords not in title/description: -10

**Conversion Readiness:**
- No social proof elements: -10 | No urgency/scarcity: -5
- No comparison/differentiation: -10 | Weak CTA: -10
- Images don't inspire confidence: -15

Return ONLY valid JSON.`;

    const auditContent = await togetherChat(
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      [
        { role: "system", content: "You are an elite e-commerce listing auditor. Return only valid JSON. Be brutally specific — reference actual content, image numbers, and feature names." },
        { role: "user", content: auditPrompt },
      ],
      { temperature: 0.3, max_tokens: 3000, json: true }
    );

    const audit = parseJSON(auditContent);

    // Inject the raw image analysis for transparency
    audit.image_analysis_summary = imageAnalysis.substring(0, 500);

    return new Response(JSON.stringify(audit), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[audit-listing] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
