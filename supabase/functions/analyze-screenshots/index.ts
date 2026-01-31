import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a UI/UX design analyst and product intelligence expert. You analyze product screenshots to extract BOTH design system information AND semantic product understanding. This data drives marketing video generation.

Analyze the provided screenshots holistically and return a JSON object with this exact structure:

{
  "productUnderstanding": {
    "purpose": "One sentence describing what this product does",
    "targetAudience": "Who uses this product",
    "valueProposition": "The core value it delivers",
    "productCategory": "saas" | "mobile-app" | "marketplace" | "tool" | "platform" | "analytics" | "compliance" | "other"
  },
  "extractedFeatures": [
    {
      "name": "Exact feature name visible in the UI",
      "description": "What this feature does based on what's shown",
      "screenIndex": 0
    }
  ],
  "keyScreens": [
    {
      "index": 0,
      "screenType": "dashboard" | "settings" | "list" | "detail" | "form" | "landing" | "onboarding" | "analytics" | "other",
      "title": "Title or heading visible on this screen",
      "description": "What this screen shows and its purpose"
    }
  ],
  "colorPalette": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex",
    "text": "#hex",
    "accent": "#hex"
  },
  "typography": {
    "style": "modern" | "classic" | "minimal" | "bold",
    "hasRoundedFonts": boolean,
    "fontFamily": "Inter" | "SF Pro" | "Roboto" | "system" | string,
    "headingSize": "small" | "medium" | "large",
    "headingWeight": "normal" | "semibold" | "bold" | "extrabold"
  },
  "uiStyle": {
    "cardStyle": "flat" | "elevated" | "bordered" | "glass",
    "borderRadius": "none" | "small" | "medium" | "large" | "full",
    "density": "compact" | "comfortable" | "spacious",
    "shadowStyle": "none" | "subtle" | "medium" | "strong",
    "spacing": "tight" | "normal" | "relaxed"
  },
  "components": [
    { "type": "navbar", "position": "top", "style": "dark" or "light" },
    { "type": "sidebar", "position": "left", "style": "collapsed" or "expanded" },
    { "type": "cards", "count": number },
    { "type": "buttons", "style": "rounded" or "square" or "pill" },
    { "type": "tables", "present": boolean },
    { "type": "charts", "types": ["bar", "line", "pie"] }
  ],
  "layoutPattern": "dashboard" | "landing" | "form" | "list" | "detail" | "mixed",
  "overallVibe": "professional" | "playful" | "minimal" | "data-heavy" | "creative",
  "iconStyle": "outlined" | "filled" | "duotone" | "line"
}

Rules:
- Extract actual hex colors from the screenshots, not guesses
- Only include components you can actually see
- For extractedFeatures: read the ACTUAL text labels, menu items, headings, and tab names visible in the UI. Do NOT invent generic feature names. If the sidebar says "Compliance Roadmap", that's the feature name.
- For keyScreens: describe what each screenshot actually shows. If the product context says it's a "compliance platform", interpret screens through that lens.
- For productUnderstanding: use both the visual evidence and any product context provided to determine what the product does.
- If multiple screenshots show different pages, describe the dominant pattern
- For typography, identify the closest matching font family and describe heading characteristics
- For uiStyle, assess shadow depth, spacing density, and card treatment
- For iconStyle, determine whether icons are outlined strokes, filled shapes, duotone, or thin lines
- Return ONLY valid JSON, no markdown fences or explanation`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { screenshots, productName, productDescription, productTags, productFeatures, productAiContext } = await req.json();

    if (!screenshots?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "No screenshots provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build content array with all screenshots as images
    const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];

    // Fetch and convert each screenshot to base64
    for (const url of screenshots.slice(0, 5)) {
      try {
        const imgResponse = await fetch(url);
        if (!imgResponse.ok) continue;

        const buffer = await imgResponse.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        const contentType = imgResponse.headers.get("content-type") || "image/png";
        const mediaType = contentType.split(";")[0].trim();

        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64,
          },
        });
      } catch (e) {
        console.error(`Failed to fetch screenshot: ${url}`, e);
      }
    }

    if (content.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not fetch any screenshots" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context-rich user message
    let userMessage = `Analyze these ${content.length} screenshot(s) from the product "${productName || "Unknown Product"}".`;
    if (productDescription) {
      userMessage += `\n\nProduct description: ${productDescription}`;
    }
    if (productTags?.length) {
      userMessage += `\nTags: ${productTags.join(", ")}`;
    }
    if (productFeatures?.length) {
      const featureNames = productFeatures.map((f: string | { title?: string; name?: string }) =>
        typeof f === "string" ? f : f.title || f.name || ""
      ).filter(Boolean);
      if (featureNames.length) {
        userMessage += `\nKnown features: ${featureNames.join(", ")}`;
      }
    }
    // Add AI context if available
    if (productAiContext?.targetPersona?.jobTitles?.length) {
      userMessage += `\nTarget audience: ${productAiContext.targetPersona.jobTitles.join(", ")}`;
    }
    if (productAiContext?.targetPersona?.painPoints?.length) {
      userMessage += `\nPain points solved: ${productAiContext.targetPersona.painPoints.join(", ")}`;
    }
    if (productAiContext?.positioning?.uniqueValue) {
      userMessage += `\nUnique value: ${productAiContext.positioning.uniqueValue}`;
    }
    if (productAiContext?.positioning?.differentiators?.length) {
      userMessage += `\nDifferentiators: ${productAiContext.positioning.differentiators.join(", ")}`;
    }
    if (productAiContext?.industry?.vertical) {
      userMessage += `\nIndustry: ${productAiContext.industry.vertical}`;
    }
    if (productAiContext?.industry?.regulations?.length) {
      userMessage += `\nRelevant regulations: ${productAiContext.industry.regulations.join(", ")}`;
    }

    userMessage += `\n\nExtract the full design system AND semantic product understanding as specified. Use the product context above to correctly interpret what you see in the screenshots.`;

    content.push({ type: "text", text: userMessage });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Anthropic API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const textContent = result.content?.find((c: { type: string }) => c.type === "text");
    const rawText = textContent?.text || "";

    // Parse JSON from response (strip markdown fences if present)
    const jsonMatch = rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    let analysis;
    try {
      analysis = JSON.parse(jsonMatch);
    } catch {
      console.error("Failed to parse analysis JSON:", rawText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI response", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-screenshots error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
