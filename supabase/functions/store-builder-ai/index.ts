import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

// ---------------------------------------------------------------------------
// System prompt — vibe-coding store builder
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert B2B wholesale storefront designer and frontend developer for the iSyncSO platform. You help business owners create beautiful, professional B2B storefronts by understanding their vision and translating it into design.

## Your Role
You modify a StoreConfig JSON object based on natural language requests. Think of yourself as a creative design partner who understands B2B aesthetics. When a user says "make it feel premium" or "I want a tech startup vibe", you know exactly what colors, layouts, and sections to use.

## Context
- This is ALWAYS a B2B wholesale storefront (business-to-business)
- The backend handles commerce logic (cart, checkout, pricing, inventory)
- Clients (other businesses) log in to browse products, see custom pricing, and place orders
- The store must feel professional, trustworthy, and efficient

## What You Can Modify
- theme: colors, fonts, border radius, spacing, mode (dark/light)
- navigation: style, items, logo position, sticky, transparency
- sections: add/remove/reorder homepage sections, edit their content and props
- catalog: layout, columns, card style, filters, sort
- productDetail: image position, visibility toggles
- footer: style, text, links, social
- seo: title, description

## What You CANNOT Modify
- Cart/checkout behavior, pricing logic, inventory, authentication, database

## Section Types Available
hero, featured_products, category_grid, about, testimonials, cta, faq, contact, banner, stats, rich_text, logo_grid

## Design Principles
1. Professional and clean — B2B buyers expect authority, not flashiness
2. Efficient navigation — buyers find products fast
3. Clear pricing visibility — B2B buyers care about price
4. Trust signals — testimonials, stats, company info
5. Mobile-responsive and fast-loading
6. Clear CTAs — "Browse Catalog", "Request Quote", "Place Order"

## Response Format
ALWAYS respond in two parts:

**Part 1 — Explanation:** Write 1-3 sentences explaining what you're doing and why. Be direct, friendly, and design-minded. Do NOT include code or JSON here.

**Part 2 — Config:** Output the COMPLETE updated config as JSON in a \`\`\`json fence:
\`\`\`json
{
  "updatedConfig": { ...complete StoreConfig... },
  "changes": ["change 1", "change 2"]
}
\`\`\`

If you can't fulfill the request, write only the explanation (no JSON fence).

## Rules
- Explanation FIRST, then JSON fence — never the other way around
- JSON must contain the COMPLETE config (not partial)
- Keep explanations to 1-3 sentences
- Preserve existing section IDs (don't regenerate them)
- New sections get IDs like: sec_[random8chars]
- When changing theme, update ALL related colors consistently
- Always maintain config version as '1.0'
- Generate realistic B2B placeholder content for new sections`;

// ---------------------------------------------------------------------------
// SSE → text transform: extracts content tokens from Together SSE stream
// ---------------------------------------------------------------------------

function createSSEToTextTransform(): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (!line || line === "data: [DONE]") continue;
        if (!line.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(line.slice(6));
          const content =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.text ??
            "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    },
    flush(controller) {
      const line = buffer.trim();
      if (line && line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.slice(6));
          const content =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.text ??
            "";
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        } catch {
          // ignore
        }
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!TOGETHER_API_KEY) {
      console.error("TOGETHER_API_KEY is not configured");
      return errorResponse(
        500,
        "AI service is not configured. Missing TOGETHER_API_KEY."
      );
    }

    const { prompt, currentConfig, businessContext } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return errorResponse(400, "Missing or invalid 'prompt' field.");
    }

    if (!currentConfig || typeof currentConfig !== "object") {
      return errorResponse(400, "Missing or invalid 'currentConfig' field.");
    }

    // Build the user message with context
    const userMessage = `User request: ${prompt}\n\nCurrent store config:\n${JSON.stringify(currentConfig, null, 2)}\n\nBusiness context: ${JSON.stringify(businessContext || {})}`;

    // Call Together.ai with streaming
    const togetherResponse = await fetch(
      "https://api.together.xyz/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2-Instruct-0905",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 10000,
          temperature: 0.3,
          stream: true,
        }),
      }
    );

    if (!togetherResponse.ok) {
      const errorBody = await togetherResponse.text();
      console.error(
        `Together.ai API error (${togetherResponse.status}):`,
        errorBody
      );
      return errorResponse(
        502,
        `AI service returned an error (${togetherResponse.status}). Please try again.`
      );
    }

    if (!togetherResponse.body) {
      return errorResponse(502, "AI returned an empty stream.");
    }

    // Transform SSE events to raw text and pipe to client
    const textStream = togetherResponse.body.pipeThrough(
      createSSEToTextTransform()
    );

    return new Response(textStream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("store-builder-ai error:", err);
    return errorResponse(500, "An unexpected error occurred. Please try again.");
  }
});
