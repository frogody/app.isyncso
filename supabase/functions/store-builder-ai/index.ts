import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const SYSTEM_PROMPT = `You are an expert B2B wholesale storefront designer for the iSyncSO platform. You help business owners design professional B2B wholesale storefronts where their clients can browse products, place orders, and manage their accounts.

## Your Role
You modify a StoreConfig JSON object based on user requests. You ONLY modify the design/layout/content. You NEVER touch commerce logic (cart, checkout, pricing, inventory — those are handled by the platform).

## Context
- This is ALWAYS a B2B wholesale storefront (business-to-business)
- The backend connects to the user's real product catalog, inventory, and pricing
- Clients (other businesses) log in to browse products, see their custom pricing, and place orders
- The store must feel professional, trustworthy, and efficient for B2B buyers

## What You Can Modify
- theme: colors, fonts, border radius, spacing, mode (dark/light), button/card styles
- navigation: style, items, logo, sticky, transparent
- sections: add, remove, reorder, edit content/props for homepage sections
- catalog: layout, columns, card style, filters, sort options
- productDetail: image position, what to show/hide
- footer: style, text, links, social
- seo: title, description

## What You CANNOT Modify
- Cart/checkout behavior
- Pricing logic
- Inventory/stock logic
- Authentication
- Database schema
- Any backend functionality

## Section Types Available
hero, featured_products, category_grid, about, testimonials, cta, faq, contact, banner, stats, rich_text, logo_grid

## Design Principles for B2B Wholesale
1. Professional and clean — not flashy consumer design
2. Efficient navigation — buyers want to find products fast
3. Clear pricing visibility — B2B buyers care about price
4. Trust signals — testimonials, stats, company info
5. Mobile-responsive — buyers browse on phone too
6. Fast loading — minimal animations, optimized images
7. Clear CTAs — "Browse Catalog", "Request Quote", "Place Order"

## Response Format
Return ONLY valid JSON with this structure:
{
  "updatedConfig": { ... the complete updated StoreConfig ... },
  "changes": ["description of change 1", "description of change 2"]
}

If the user asks something you can't do (like changing pricing logic), return:
{
  "updatedConfig": null,
  "changes": [],
  "message": "explanation of why and design alternative suggestion"
}

## Important Rules
- When adding sections, generate realistic placeholder content appropriate for B2B wholesale
- When changing theme, update ALL related colors (don't leave orphaned colors)
- When adding nav items, use paths like: /catalog, /about, /contact, /orders
- Always maintain the config version as '1.0'
- Preserve existing section IDs when modifying (don't regenerate IDs)
- Generate new unique IDs for new sections (use format: sec_[random8chars])`;

/**
 * Attempt to parse JSON from a string that may contain markdown fences
 * or other wrapping text around the actual JSON object.
 */
function extractJSON(raw: string): Record<string, unknown> | null {
  // First, try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // continue to extraction attempts
  }

  // Try extracting from markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  // Try finding the first { ... } block (greedy, outermost braces)
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(raw.slice(braceStart, braceEnd + 1));
    } catch {
      // give up
    }
  }

  return null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate API key availability
    if (!TOGETHER_API_KEY) {
      console.error("TOGETHER_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          error: "AI service is not configured. Missing TOGETHER_API_KEY.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { prompt, currentConfig, businessContext } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!currentConfig || typeof currentConfig !== "object") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid 'currentConfig' field.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the user message
    const userMessage = `User request: ${prompt}\n\nCurrent store config:\n${JSON.stringify(currentConfig, null, 2)}\n\nBusiness context: ${JSON.stringify(businessContext || {})}`;

    // Call Together.ai
    const togetherResponse = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2-Instruct",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 8000,
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!togetherResponse.ok) {
      const errorBody = await togetherResponse.text();
      console.error(
        `Together.ai API error (${togetherResponse.status}):`,
        errorBody
      );
      return new Response(
        JSON.stringify({
          error: `AI service returned an error (${togetherResponse.status}). Please try again.`,
          details:
            togetherResponse.status >= 500
              ? "The AI service is temporarily unavailable."
              : "The request could not be processed.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const completionData = await togetherResponse.json();

    const rawContent =
      completionData?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!rawContent) {
      console.error(
        "Empty response from Together.ai:",
        JSON.stringify(completionData)
      );
      return new Response(
        JSON.stringify({
          error: "AI returned an empty response. Please try again.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the LLM JSON response
    const parsed = extractJSON(rawContent);

    if (!parsed) {
      console.error("Failed to parse LLM response as JSON:", rawContent);
      return new Response(
        JSON.stringify({
          error:
            "AI response could not be parsed. Please rephrase your request and try again.",
          rawResponse: rawContent.slice(0, 500),
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return the structured response
    return new Response(
      JSON.stringify({
        updatedConfig: parsed.updatedConfig ?? null,
        changes: parsed.changes ?? [],
        ...(parsed.message ? { message: parsed.message } : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("store-builder-ai error:", err);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
