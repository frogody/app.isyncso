import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdCopyRequest {
  product: {
    name: string;
    description?: string;
    price?: number;
    category?: string;
  };
  platform: string;
  placement: string;
  ad_type: string;
  campaign_goal: string;
  target_audience?: string;
  tone?: string;
  brand_voice_profile?: {
    name?: string;
    tone_descriptors?: string[];
    writing_style?: string;
    vocabulary_preferences?: string[];
    dos?: string[];
    donts?: string[];
  } | null;
  additional_context?: string;
  dimensions: {
    width?: number | null;
    height?: number | null;
    maxCaption?: number | null;
    maxHeadline?: number | null;
    maxDescription?: number | null;
  };
}

interface AdVariant {
  headline: string;
  primary_text: string;
  cta_label: string;
}

function buildSystemPrompt(req: AdCopyRequest): string {
  const brandVoiceSection = req.brand_voice_profile
    ? `
BRAND VOICE GUIDELINES:
- Brand: ${req.brand_voice_profile.name || "N/A"}
- Tone descriptors: ${(req.brand_voice_profile.tone_descriptors || []).join(", ") || "N/A"}
- Writing style: ${req.brand_voice_profile.writing_style || "N/A"}
- Preferred vocabulary: ${(req.brand_voice_profile.vocabulary_preferences || []).join(", ") || "N/A"}
- Do: ${(req.brand_voice_profile.dos || []).join("; ") || "N/A"}
- Don't: ${(req.brand_voice_profile.donts || []).join("; ") || "N/A"}
`
    : "";

  const charLimits: string[] = [];
  if (req.dimensions.maxHeadline) {
    charLimits.push(`Headline: max ${req.dimensions.maxHeadline} characters`);
  } else {
    charLimits.push("Headline: max 40 characters (recommended)");
  }
  if (req.dimensions.maxCaption) {
    charLimits.push(
      `Primary text: max ${req.dimensions.maxCaption} characters`
    );
  }
  if (req.dimensions.maxDescription) {
    charLimits.push(
      `Description: max ${req.dimensions.maxDescription} characters`
    );
  }

  return `You are an expert advertising copywriter specializing in digital ad campaigns. Your task is to generate exactly 3 unique ad copy variants for a specific platform and placement.

PRODUCT INFORMATION:
- Name: ${req.product.name}
- Description: ${req.product.description || "N/A"}
- Price: ${req.product.price != null ? `EUR ${req.product.price}` : "N/A"}
- Category: ${req.product.category || "N/A"}

PLATFORM & PLACEMENT:
- Platform: ${req.placement}
- Dimensions: ${req.dimensions.width && req.dimensions.height ? `${req.dimensions.width}x${req.dimensions.height}` : "Text-based"}
- Ad Type: ${req.ad_type}

CHARACTER LIMITS (MUST RESPECT):
${charLimits.join("\n")}

CAMPAIGN GOAL: ${req.campaign_goal}
${req.target_audience ? `TARGET AUDIENCE: ${req.target_audience}` : ""}
${req.tone ? `TONE OF VOICE: ${req.tone}` : ""}
${req.additional_context ? `ADDITIONAL CONTEXT: ${req.additional_context}` : ""}
${brandVoiceSection}

RULES:
1. Generate exactly 3 unique variants
2. Each variant must have: headline, primary_text, cta_label
3. STRICTLY respect character limits for the platform
4. Make each variant distinctly different in approach:
   - Variant 1: Direct benefit / value proposition
   - Variant 2: Emotional / story-driven approach
   - Variant 3: Urgency / social proof approach
5. CTA labels should be short action phrases (2-4 words), e.g. "Shop Now", "Learn More", "Get Started"
6. Match the specified tone of voice
7. Optimize for the campaign goal (${req.campaign_goal})

Respond ONLY with valid JSON in this exact format:
{
  "variants": [
    {
      "headline": "...",
      "primary_text": "...",
      "cta_label": "..."
    },
    {
      "headline": "...",
      "primary_text": "...",
      "cta_label": "..."
    },
    {
      "headline": "...",
      "primary_text": "...",
      "cta_label": "..."
    }
  ]
}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      // Fallback: return placeholder variants if no API key
      console.warn("ANTHROPIC_API_KEY not set, returning placeholder variants");
      return new Response(
        JSON.stringify({
          variants: [
            {
              headline: `Discover ${(await req.json()).product?.name || "Our Product"}`,
              primary_text:
                "Experience the difference. This product is designed to elevate your everyday life with premium quality and thoughtful design.",
              cta_label: "Shop Now",
            },
            {
              headline: "Your Search Ends Here",
              primary_text:
                "Join thousands of satisfied customers who made the switch. Quality you can feel, at a price that makes sense.",
              cta_label: "Learn More",
            },
            {
              headline: "Limited Time Offer",
              primary_text:
                "Don't miss out on this opportunity. Premium quality meets exceptional value - available now for a limited time.",
              cta_label: "Get Yours",
            },
          ],
          _note: "Generated with placeholder - set ANTHROPIC_API_KEY for AI-generated copy",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const body: AdCopyRequest = await req.json();

    if (!body.product?.name) {
      return new Response(
        JSON.stringify({ error: "Product name is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const systemPrompt = buildSystemPrompt(body);

    const anthropicRes = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: systemPrompt,
            },
          ],
        }),
      }
    );

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({
          error: "AI generation failed",
          details: errText,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        }
      );
    }

    const anthropicData = await anthropicRes.json();
    const textBlock = anthropicData.content?.find(
      (block: { type: string }) => block.type === "text"
    );
    const rawText = textBlock?.text || "";

    // Extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonStr = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: { variants: AdVariant[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          raw: rawText.substring(0, 500),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        }
      );
    }

    if (
      !parsed.variants ||
      !Array.isArray(parsed.variants) ||
      parsed.variants.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "AI returned invalid variant structure",
          raw: rawText.substring(0, 500),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        }
      );
    }

    return new Response(
      JSON.stringify({
        variants: parsed.variants.map((v: AdVariant) => ({
          headline: v.headline || "",
          primary_text: v.primary_text || "",
          cta_label: v.cta_label || "",
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
