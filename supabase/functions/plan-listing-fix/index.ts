import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Together AI helper
// ---------------------------------------------------------------------------
async function togetherChat(
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; max_tokens?: number; json?: boolean } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.max_tokens ?? 2000,
  };
  if (opts.json) {
    body.response_format = { type: "json_object" };
  }

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

// ---------------------------------------------------------------------------
// JSON parser that handles markdown fences
// ---------------------------------------------------------------------------
function parseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Failed to parse JSON from response");
  }
}

// ---------------------------------------------------------------------------
// Build the system prompt
// ---------------------------------------------------------------------------
function buildSystemPrompt(): string {
  return `You are an elite e-commerce listing optimization consultant with 15+ years of experience across Amazon, Bol.com, Coolblue, and other major European marketplaces. You specialize in turning underperforming listings into top-sellers through data-driven copy, visual strategy, and SEO optimization.

Your task: analyze an audit report of a product listing and produce a structured fix plan.

ANALYSIS METHODOLOGY - follow these steps internally:

1. TRIAGE - Read the overall score and each category score. Anything below 50 is critical, 50-69 is poor, 70-79 needs improvement, 80+ is acceptable.
2. ROOT CAUSE ANALYSIS - For each low-scoring category, identify WHY it scored low. Don't just repeat the audit — dig into the underlying cause (e.g. "title is generic" means the copywriter didn't research the product's USPs).
3. VISUAL CONTENT PRIORITY - If Visual Content has critical issues (AI artifacts, prompt text visible, poor quality), these MUST be addressed first because they destroy buyer trust instantly.
4. COPY ASSESSMENT - Evaluate title, tagline, bullets, and description separately. Check for: brand presence, benefit-led language, emotional hooks, specificity, readability.
5. SEO ASSESSMENT - Check meta title length (50-60 chars ideal), meta description length (120-160 chars), keyword targeting, search intent alignment.
6. MISSING USP VISUALS - Each missing USP visual is a lost conversion opportunity. Prioritize visuals that communicate the strongest differentiators.
7. CREDIT ESTIMATION - Credits correspond to API costs (~10 credits = $0.15). Costs per action: replace_image = 4 credits, copy = 2 credits, seo = 2 credits (0 if bundled with copy action), image (new USP visual) = 4 credits each.

DECISION RULES for which actions to include:

- "replace_image" action: ONLY include if the Visual Content category mentions critical issues like AI artifacts, visible prompt text, unusable images, or extremely poor quality. Do NOT include for minor visual improvements.
- "copy" action: Include if ANY of these categories scored below 80: Title & Tagline, Description, Bullet Points, Conversion Readiness. The "categories" array on the action should list ONLY the categories that scored below 80.
- "seo" action: Include if the SEO / Discoverability category scored below 80. Set credits to 0 if a "copy" action already exists (they run together), otherwise 2 credits.
- "image" actions: Include ONE action per entry in the missing_usp_visuals array. Each generates a professional infographic for that USP. 4 credits each.

RESPONSE FORMAT - return valid JSON with this exact structure:

{
  "reasoning": [
    "string - first observation about the overall state of the listing",
    "string - analysis of the most critical issue found",
    "string - analysis of the next issue",
    "... continue for each significant finding, 4-8 entries total"
  ],
  "actions": [
    {
      "id": "string - unique snake_case identifier",
      "type": "replace_image" | "copy" | "seo" | "image",
      "label": "string - short human-readable action title",
      "description": "string - detailed explanation of what will be done and why",
      "credits": 4,
      "categories": ["string"] // ONLY for type "copy" — which audit categories this fixes
    }
  ],
  "totalCredits": number,
  "summary": "string - one sentence: X actions to fix [key issues]. Expected score improvement: current -> projected."
}

REASONING STYLE:
- Write as if you're a senior consultant briefing a client
- Be direct and specific — reference actual product names, features, scores
- Each reasoning entry should be 1-2 sentences, conversational but professional
- Start with the big picture, then drill into specifics
- Use language like "Looking at...", "CRITICAL:", "The main issue here is...", "I'd prioritize...", "This is costing you..."
- Don't be generic. Reference the actual product, brand, and specific audit findings.

IMPORTANT:
- The "reasoning" array should have 4-8 entries showing your analytical thought process
- Actions must be ordered by priority (most critical first)
- replace_image actions always come first if present
- totalCredits must equal the sum of all action credits
- The projected score in summary should be realistic (typically +15-25 points for a full fix plan)
- Return ONLY valid JSON, no additional text or markdown`;
}

// ---------------------------------------------------------------------------
// Build the user prompt from request data
// ---------------------------------------------------------------------------
function buildUserPrompt(body: Record<string, unknown>): string {
  const audit = body.audit as Record<string, unknown>;
  const categories = (audit.categories as Array<Record<string, unknown>>) || [];
  const missingUspVisuals =
    (audit.missing_usp_visuals as string[]) || [];
  const topPriorities = (audit.top_priorities as string[]) || [];

  const categoryLines = categories
    .map(
      (c) =>
        `  - ${c.name}: ${c.score}/100${c.feedback ? ` — ${c.feedback}` : ""}`
    )
    .join("\n");

  const bulletPoints = (body.bullet_points as string[]) || [];
  const searchKeywords = (body.search_keywords as string[]) || [];

  return `PRODUCT INFORMATION:
- Product: ${body.product_name || "Unknown"}
- Brand: ${body.product_brand || "Unknown"}
- Category: ${body.product_category || "Unknown"}
- Images: ${body.image_count ?? "unknown"} images${body.has_video ? " + video" : ", no video"}

CURRENT LISTING:
- Title: ${body.listing_title || "(none)"}
- Bullet points: ${bulletPoints.length > 0 ? "\n" + bulletPoints.map((b, i) => `  ${i + 1}. ${b}`).join("\n") : "(none)"}
- Description: ${body.listing_description || "(none)"}
- SEO Title: ${body.seo_title || "(none)"}
- SEO Description: ${body.seo_description || "(none)"}
- Search Keywords: ${searchKeywords.length > 0 ? searchKeywords.join(", ") : "(none)"}

AUDIT RESULTS:
- Overall Score: ${audit.overall_score}/100
- Summary: ${audit.summary || "(none)"}

Category Scores:
${categoryLines || "  (no categories provided)"}

Top Priorities:
${topPriorities.length > 0 ? topPriorities.map((p) => `  - ${p}`).join("\n") : "  (none)"}

Missing USP Visuals:
${missingUspVisuals.length > 0 ? missingUspVisuals.map((v) => `  - ${v}`).join("\n") : "  (none)"}

Analyze this audit thoroughly and produce a fix plan following the rules in your instructions.`;
}

// ---------------------------------------------------------------------------
// Validate the LLM response structure
// ---------------------------------------------------------------------------
interface FixAction {
  id: string;
  type: "replace_image" | "copy" | "seo" | "image";
  label: string;
  description: string;
  credits: number;
  categories?: string[];
}

interface FixPlan {
  reasoning: string[];
  actions: FixAction[];
  totalCredits: number;
  summary: string;
}

function validateFixPlan(data: unknown): FixPlan {
  const plan = data as Record<string, unknown>;

  if (!Array.isArray(plan.reasoning) || plan.reasoning.length === 0) {
    throw new Error("Invalid response: reasoning must be a non-empty array");
  }
  if (!Array.isArray(plan.actions)) {
    throw new Error("Invalid response: actions must be an array");
  }
  if (typeof plan.totalCredits !== "number") {
    throw new Error("Invalid response: totalCredits must be a number");
  }
  if (typeof plan.summary !== "string" || plan.summary.length === 0) {
    throw new Error("Invalid response: summary must be a non-empty string");
  }

  const validTypes = new Set(["replace_image", "copy", "seo", "image"]);

  for (const action of plan.actions as Array<Record<string, unknown>>) {
    if (!action.id || typeof action.id !== "string") {
      throw new Error("Invalid action: missing id");
    }
    if (!validTypes.has(action.type as string)) {
      throw new Error(
        `Invalid action type: ${action.type}. Must be one of: replace_image, copy, seo, image`
      );
    }
    if (!action.label || typeof action.label !== "string") {
      throw new Error("Invalid action: missing label");
    }
    if (!action.description || typeof action.description !== "string") {
      throw new Error("Invalid action: missing description");
    }
    if (typeof action.credits !== "number" || action.credits < 1) {
      action.credits = 1;
    }
  }

  // Recalculate totalCredits to ensure consistency
  const calculatedTotal = (plan.actions as FixAction[]).reduce(
    (sum, a) => sum + (a.credits || 1),
    0
  );
  plan.totalCredits = calculatedTotal;

  return plan as unknown as FixPlan;
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
      throw new Error("TOGETHER_API_KEY is not configured");
    }

    const body = await req.json();

    // Basic input validation
    if (!body.audit || typeof body.audit !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'audit' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.audit.overall_score && body.audit.overall_score !== 0) {
      return new Response(
        JSON.stringify({ error: "Audit must include 'overall_score'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(body);

    const rawResponse = await togetherChat(
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.4, max_tokens: 2000, json: true }
    );

    const parsed = parseJSON(rawResponse);
    const fixPlan = validateFixPlan(parsed);

    return new Response(JSON.stringify(fixPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("plan-listing-fix error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
