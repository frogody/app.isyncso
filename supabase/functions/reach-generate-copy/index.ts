import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// ---------------------------------------------------------------------------
// Use-case specific output schemas & system prompts
// ---------------------------------------------------------------------------

interface UseCaseConfig {
  description: string;
  outputFields: string[];
  systemInstructions: string;
}

const USE_CASE_CONFIGS: Record<string, UseCaseConfig> = {
  ad_copy: {
    description: "Advertising copy",
    outputFields: ["headline", "primary_text", "cta_label"],
    systemInstructions: `Generate advertising copy with:
- headline: A punchy, attention-grabbing headline (max 60 chars)
- primary_text: Persuasive body copy (100-200 words) that drives action
- cta_label: A short call-to-action button label (2-5 words)`,
  },
  email_campaign: {
    description: "Email marketing campaign",
    outputFields: ["subject_line", "preview_text", "body", "cta"],
    systemInstructions: `Generate an email marketing campaign with:
- subject_line: Compelling subject line that drives opens (max 60 chars)
- preview_text: Preview/preheader text (max 100 chars)
- body: Full email body in plain text with clear structure (150-300 words)
- cta: Call-to-action text for the primary button (2-6 words)`,
  },
  landing_page: {
    description: "Landing page copy",
    outputFields: ["hero_headline", "hero_subtext", "sections", "cta"],
    systemInstructions: `Generate landing page copy with:
- hero_headline: Bold hero headline (max 80 chars)
- hero_subtext: Supporting subheadline (1-2 sentences)
- sections: Array of 3-4 section objects, each with { heading, body } for the landing page
- cta: Primary call-to-action text (2-6 words)`,
  },
  social_caption: {
    description: "Social media captions",
    outputFields: ["caption", "hashtags"],
    systemInstructions: `Generate a social media caption with:
- caption: Engaging caption text appropriate for the platform and character limits
- hashtags: Array of 5-8 relevant hashtags (without the # symbol)`,
  },
  product_description: {
    description: "Product description",
    outputFields: [
      "title",
      "short_description",
      "long_description",
      "key_features",
    ],
    systemInstructions: `Generate a product description with:
- title: Product title optimized for search (max 100 chars)
- short_description: One-paragraph summary (2-3 sentences)
- long_description: Detailed description with benefits and features (150-250 words)
- key_features: Array of 4-6 key feature bullet points`,
  },
  cold_outreach: {
    description: "Cold outreach message",
    outputFields: ["subject", "opening", "body", "cta", "ps_line"],
    systemInstructions: `Generate a cold outreach message with:
- subject: Personalized, curiosity-driving subject line (max 50 chars)
- opening: Hook opening line that references the recipient (1-2 sentences)
- body: Value proposition and relevance (2-3 short paragraphs, ~100 words)
- cta: Specific, low-friction call-to-action (1-2 sentences)
- ps_line: A brief P.S. line that adds urgency or social proof`,
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      use_case,
      brand_name,
      product_service,
      target_audience,
      tone,
      key_message,
      brand_voice_profile,
      extra_fields,
    } = await req.json();

    // Validate required fields
    if (!use_case || !brand_name || !key_message) {
      return new Response(
        JSON.stringify({
          error: "use_case, brand_name, and key_message are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const config = USE_CASE_CONFIGS[use_case];
    if (!config) {
      return new Response(
        JSON.stringify({
          error: `Unknown use_case: ${use_case}. Valid: ${Object.keys(USE_CASE_CONFIGS).join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build extra fields context
    let extraContext = "";
    if (extra_fields && typeof extra_fields === "object") {
      const entries = Object.entries(extra_fields).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      );
      if (entries.length > 0) {
        extraContext = entries
          .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
          .join("\n");
      }
    }

    // Build brand voice context
    let voiceGuidelines = "";
    if (brand_voice_profile) {
      const parts: string[] = [];
      if (brand_voice_profile.name)
        parts.push(`Brand voice: ${brand_voice_profile.name}`);
      if (brand_voice_profile.tone_descriptors?.length)
        parts.push(
          `Tone descriptors: ${brand_voice_profile.tone_descriptors.join(", ")}`
        );
      if (brand_voice_profile.personality)
        parts.push(`Brand personality: ${brand_voice_profile.personality}`);
      if (brand_voice_profile.vocabulary_preferences)
        parts.push(
          `Vocabulary preferences: ${brand_voice_profile.vocabulary_preferences}`
        );
      if (brand_voice_profile.dos?.length)
        parts.push(`Do: ${brand_voice_profile.dos.join("; ")}`);
      if (brand_voice_profile.donts?.length)
        parts.push(`Don't: ${brand_voice_profile.donts.join("; ")}`);
      if (brand_voice_profile.example_phrases?.length)
        parts.push(
          `Example phrases: ${brand_voice_profile.example_phrases.join(" | ")}`
        );
      if (parts.length > 0) {
        voiceGuidelines = `\n\n## Brand Voice Guidelines\n${parts.join("\n")}`;
      }
    }

    const systemPrompt = `You are an expert marketing copywriter. Generate exactly 3 distinct variants of ${config.description} for the following brief.

## Brief
- Brand: ${brand_name}
- Product/Service: ${product_service || "Not specified"}
- Target Audience: ${target_audience || "General audience"}
- Tone: ${tone || "professional"}
- Key Message: ${key_message}
${extraContext ? `\n## Additional Context\n${extraContext}` : ""}${voiceGuidelines}

## Output Requirements
${config.systemInstructions}

Each variant should take a different creative angle while staying on-brief. Variant 1 should be the most conventional/safe, Variant 2 should be bolder, and Variant 3 should be the most creative/unexpected.

## Output Format
Return a JSON object with a "variants" key containing an array of exactly 3 objects. Each object must have these fields: ${config.outputFields.join(", ")}.

Example structure:
{
  "variants": [
    { ${config.outputFields.map((f) => `"${f}": "..."`).join(", ")} },
    { ${config.outputFields.map((f) => `"${f}": "..."`).join(", ")} },
    { ${config.outputFields.map((f) => `"${f}": "..."`).join(", ")} }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown code blocks, no explanation text.`;

    // Call Anthropic API
    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          temperature: 0.8,
          messages: [
            {
              role: "user",
              content: systemPrompt,
            },
          ],
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: errText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const content = anthropicData.content?.[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content generated from AI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try finding the outermost JSON object
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          parsed = JSON.parse(objMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      }
    }

    // Validate structure
    const variants = parsed.variants;
    if (!Array.isArray(variants) || variants.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid response structure: expected variants array",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        variants: variants.slice(0, 3),
        use_case,
        model: "claude-sonnet-4-20250514",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("reach-generate-copy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
