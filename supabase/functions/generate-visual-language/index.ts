import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

// ── System prompts per section ──────────────────────────────────────────

const PHOTOGRAPHY_SYSTEM = `You are a senior creative director specializing in brand photography direction. You create photography guidelines that are specific, evocative, and directly tied to brand personality.

Rules:
- Generate a cohesive photography style that aligns with the brand's personality, industry, and visual identity
- Mood should be 1-3 descriptive words/phrases (e.g., "warm and aspirational", "stark minimalism")
- Lighting should describe specific lighting qualities (e.g., "soft natural window light", "high-contrast directional")
- Composition should describe framing and spatial preferences (e.g., "generous negative space, rule of thirds", "tight crops, centered subjects")
- Color treatment should describe post-processing style (e.g., "desaturated earth tones", "vibrant and true-to-life")
- Subjects should describe what to photograph (e.g., "real people in work environments, product close-ups")
- Generate exactly 5-7 on_brand_descriptors (single words/short phrases that describe ideal photos)
- Generate exactly 5-7 off_brand_descriptors (what to avoid)
- Overlay rules: use brand primary color for overlays, set appropriate opacity (40-80%), and min_contrast of 4.5 for WCAG AA
- text_on_photo treatment should describe how text sits on photos (e.g., "white text on dark overlay", "dark text on light gradient")
- reference_image_urls should be an empty array (user adds their own references)

Return ONLY valid JSON. No markdown, no explanation.`;

const ILLUSTRATION_SYSTEM = `You are a senior illustration director at a world-class design agency. You define illustration systems that are distinctive, consistent, and aligned with brand identity.

Rules:
- Style must be one of: "flat", "line-art", "geometric", "hand-drawn", "3d-isometric" — choose based on brand personality and user preference
- Line weight: "thin" (1-2px), "medium" (2-3px), or "bold" (3-4px) — match to brand weight/boldness
- Corner radius: "sharp" (0px), "slightly-rounded" (4-8px), or "rounded" (12px+) — match typography personality
- Color usage: "monochrome" (1 color + shades), "limited-palette" (2-3 brand colors), or "full-palette" (all brand colors) — match brand richness axis
- Complexity: "minimal" (few elements), "moderate" (balanced detail), or "detailed" (rich illustrations) — match personality minimal/rich axis
- Geometric properties: primary_shapes (3-5 shapes like "circle", "rectangle", "triangle"), stroke_style ("solid", "dashed", "none"), fill_style ("solid", "gradient", "pattern", "none")
- All choices must be internally consistent and justified by the brand context

Return ONLY valid JSON. No markdown, no explanation.`;

// ── Prompt builders ─────────────────────────────────────────────────────

function buildBrandContextBlock(ctx: Record<string, any>): string {
  const pv = ctx.personality_vector || [50, 50, 50, 50, 50];

  let block = `BRAND CONTEXT:
Company: ${ctx.company_name || 'Unknown'}
Industry: ${ctx.industry?.primary || 'General'} — ${ctx.industry?.sub || ''}
Stage: ${ctx.company_stage || 'startup'}

BRAND PERSONALITY (0-100 scales):
- Classic [${pv[0]}] Modern
- Calm [${pv[1]}] Dynamic
- Serious [${pv[2]}] Playful
- Accessible [${pv[3]}] Premium
- Minimal [${pv[4]}] Rich`;

  if (ctx.personality_description) {
    block += `\n\nPersonality Description: ${ctx.personality_description}`;
  }

  if (ctx.strategy) {
    const s = ctx.strategy;
    if (s.mission) block += `\nMission: ${s.mission}`;
    if (s.vision) block += `\nVision: ${s.vision}`;
    if (s.values?.length) {
      block += `\nValues: ${s.values.slice(0, 3).map((v: any) => v.name || v).join(', ')}`;
    }
    if (s.positioning?.statement) block += `\nPositioning: ${s.positioning.statement}`;
  }

  if (ctx.color_mood) block += `\nVisual Mood (from color palette): ${ctx.color_mood}`;
  if (ctx.font_personality) block += `\nTypography Personality: ${ctx.font_personality}`;
  if (ctx.logo_style) block += `\nLogo Style: ${ctx.logo_style}`;
  if (ctx.logo_rationale) block += `\nLogo Rationale: ${ctx.logo_rationale}`;

  if (ctx.voice_summary) block += `\nBrand Voice: ${ctx.voice_summary}`;

  return block;
}

function buildPhotographyUserPrompt(ctx: Record<string, any>): string {
  let prompt = buildBrandContextBlock(ctx);

  if (ctx.photo_mood_prefs?.length) {
    prompt += `\n\nUSER PHOTOGRAPHY MOOD PREFERENCES: ${ctx.photo_mood_prefs.join(', ')}`;
  }
  if (ctx.photo_subject_prefs?.length) {
    prompt += `\nUSER SUBJECT PREFERENCES: ${ctx.photo_subject_prefs.join(', ')}`;
  }
  if (ctx.primary_color) {
    prompt += `\nPRIMARY BRAND COLOR: ${ctx.primary_color}`;
  }
  if (ctx.secondary_color) {
    prompt += `\nSECONDARY BRAND COLOR: ${ctx.secondary_color}`;
  }

  prompt += `

Generate a photography style as JSON with this exact structure:
{
  "mood": "1-3 descriptive words/phrases for the overall photographic mood",
  "lighting": "Specific lighting direction (e.g., 'soft natural light with golden hour warmth')",
  "composition": "Framing and spatial preferences (e.g., 'generous negative space, off-center subjects')",
  "color_treatment": "Post-processing style (e.g., 'warm tones, slightly lifted blacks, gentle grain')",
  "subjects": "What to photograph (e.g., 'real people in collaborative work settings, product details')",
  "on_brand_descriptors": ["word1", "word2", "word3", "word4", "word5"],
  "off_brand_descriptors": ["word1", "word2", "word3", "word4", "word5"],
  "reference_image_urls": [],
  "overlay_rules": {
    "allowed_overlays": [
      { "color": "${ctx.primary_color || '#000000'}", "opacity": 0.6 }
    ],
    "text_on_photo": {
      "treatment": "Description of how text appears on photos",
      "min_contrast": 4.5
    }
  }
}

Generate 5-7 on_brand_descriptors and 5-7 off_brand_descriptors. Make all descriptions specific to ${ctx.company_name || 'this brand'}.`;

  return prompt;
}

function buildIllustrationUserPrompt(ctx: Record<string, any>): string {
  let prompt = buildBrandContextBlock(ctx);

  if (ctx.illustration_style_pref) {
    prompt += `\n\nUSER ILLUSTRATION STYLE PREFERENCE: ${ctx.illustration_style_pref}`;
  }

  prompt += `

Generate an illustration style as JSON with this exact structure:
{
  "style": "flat" | "line-art" | "geometric" | "hand-drawn" | "3d-isometric",
  "line_weight": "thin" | "medium" | "bold",
  "corner_radius": "sharp" | "slightly-rounded" | "rounded",
  "color_usage": "monochrome" | "limited-palette" | "full-palette",
  "complexity": "minimal" | "moderate" | "detailed",
  "geometric_properties": {
    "primary_shapes": ["shape1", "shape2", "shape3"],
    "stroke_style": "solid" | "dashed" | "none",
    "fill_style": "solid" | "gradient" | "pattern" | "none"
  }
}

The style should align with the user's preference if provided, but override if it conflicts with the brand personality. All choices must be internally consistent.`;

  return prompt;
}

// ── JSON parser ─────────────────────────────────────────────────────────

function parseJsonResponse(content: string): Record<string, any> {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse response as JSON');
  }
}

// ── LLM call ────────────────────────────────────────────────────────────

async function callLLM(systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<Record<string, any>> {
  const temperatures = [0.7, 0.3];

  for (const temp of temperatures) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: temp,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini error (temp=${temp}):`, errText);
        continue;
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.error(`Empty Gemini response at temp=${temp}`);
        continue;
      }

      return parseJsonResponse(content);
    } catch (err) {
      console.error(`Parse failed at temp=${temp}:`, err);
      continue;
    }
  }

  throw new Error('Failed to generate after retries');
}

// ── Section handlers ────────────────────────────────────────────────────

async function handlePhotography(ctx: Record<string, any>) {
  const userPrompt = buildPhotographyUserPrompt(ctx);
  const result = await callLLM(PHOTOGRAPHY_SYSTEM, userPrompt, 2000);

  return {
    mood: result.mood || '',
    lighting: result.lighting || '',
    composition: result.composition || '',
    color_treatment: result.color_treatment || '',
    subjects: result.subjects || '',
    on_brand_descriptors: Array.isArray(result.on_brand_descriptors) ? result.on_brand_descriptors : [],
    off_brand_descriptors: Array.isArray(result.off_brand_descriptors) ? result.off_brand_descriptors : [],
    reference_image_urls: [],
    overlay_rules: {
      allowed_overlays: Array.isArray(result.overlay_rules?.allowed_overlays)
        ? result.overlay_rules.allowed_overlays
        : [{ color: ctx.primary_color || '#000000', opacity: 0.6 }],
      text_on_photo: {
        treatment: result.overlay_rules?.text_on_photo?.treatment || 'White text on semi-transparent dark overlay',
        min_contrast: result.overlay_rules?.text_on_photo?.min_contrast ?? 4.5,
      },
    },
  };
}

async function handleIllustration(ctx: Record<string, any>) {
  const userPrompt = buildIllustrationUserPrompt(ctx);
  const result = await callLLM(ILLUSTRATION_SYSTEM, userPrompt, 1500);

  const validStyles = ['flat', 'line-art', 'geometric', 'hand-drawn', '3d-isometric'];
  const validWeights = ['thin', 'medium', 'bold'];
  const validRadius = ['sharp', 'slightly-rounded', 'rounded'];
  const validColorUsage = ['monochrome', 'limited-palette', 'full-palette'];
  const validComplexity = ['minimal', 'moderate', 'detailed'];

  return {
    style: validStyles.includes(result.style) ? result.style : 'geometric',
    line_weight: validWeights.includes(result.line_weight) ? result.line_weight : 'medium',
    corner_radius: validRadius.includes(result.corner_radius) ? result.corner_radius : 'slightly-rounded',
    color_usage: validColorUsage.includes(result.color_usage) ? result.color_usage : 'limited-palette',
    complexity: validComplexity.includes(result.complexity) ? result.complexity : 'moderate',
    geometric_properties: {
      primary_shapes: Array.isArray(result.geometric_properties?.primary_shapes)
        ? result.geometric_properties.primary_shapes
        : ['circle', 'rectangle'],
      stroke_style: result.geometric_properties?.stroke_style || 'solid',
      fill_style: result.geometric_properties?.fill_style || 'solid',
    },
  };
}

// ── Main handler ────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { section, context } = await req.json();

    if (!section || !context) {
      return new Response(
        JSON.stringify({ error: 'section and context are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: Record<string, any>;

    switch (section) {
      case 'photography':
        result = await handlePhotography(context);
        break;
      case 'illustration':
        result = await handleIllustration(context);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown section: ${section}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
