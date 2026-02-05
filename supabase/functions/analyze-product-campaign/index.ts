import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { product, productDescription, problemSolved } = await req.json();

    const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
    if (!TOGETHER_API_KEY) throw new Error("TOGETHER_API_KEY not set");

    // Build rich context about the product
    const productContext = [
      `Product Name: ${product?.name || "Unknown"}`,
      `Type: ${product?.type || "Unknown"}`,
      `Description: ${productDescription || product?.description || "No description"}`,
      product?.tagline ? `Tagline: ${product.tagline}` : null,
      product?.short_description
        ? `Short Description: ${product.short_description}`
        : null,
      product?.category ? `Category: ${product.category}` : null,
      product?.price ? `Price: $${product.price}` : null,
      problemSolved ? `Problem Solved: ${problemSolved}` : null,
      product?.digitalDetails?.pricing_model
        ? `Pricing Model: ${product.digitalDetails.pricing_model}`
        : null,
      product?.digitalDetails?.features?.length
        ? `Features: ${JSON.stringify(product.digitalDetails.features)}`
        : null,
      product?.digitalDetails?.trial_available != null
        ? `Trial Available: ${product.digitalDetails.trial_available ? "Yes" : "No"}${product.digitalDetails.trial_days ? ` (${product.digitalDetails.trial_days} days)` : ""}`
        : null,
      product?.digitalDetails?.integrations?.length
        ? `Integrations: ${JSON.stringify(product.digitalDetails.integrations)}`
        : null,
      product?.digitalDetails?.ai_context
        ? `AI Context: ${product.digitalDetails.ai_context}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are an elite B2B growth strategist. Given a product, you determine the optimal outreach campaign configuration: who to target, how to reach them, and what signals indicate buying intent.

Analyze the product deeply. Consider its type, price point, complexity, market positioning, and competitive landscape to infer the ideal customer profile and campaign strategy.

You MUST return a valid JSON object with these exact fields. Choose ONLY from the allowed values listed for each field.

{
  "priceRange": one of ["under_1k", "1k_10k", "10k_50k", "50k_100k", "over_100k"],
  "salesCycle": one of ["under_1week", "1_4_weeks", "1_3_months", "3_6_months", "over_6_months"],
  "industries": array from ["Technology", "Healthcare", "Finance", "E-commerce", "Manufacturing", "Professional Services", "Retail", "Education", "Real Estate", "Other"] — pick 2-4 most relevant,
  "companySizes": array from ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] — pick 2-3 ideal ranges,
  "revenueRanges": array from ["under_1m", "1m_10m", "10m_50m", "50m_100m", "over_100m"] — pick 2-3 ideal ranges,
  "regions": array from ["north_america", "europe", "apac", "latam", "middle_east"] — pick where product fits best,
  "jobTitles": array of 4-6 specific job titles who would be the decision makers or champions for this product (be specific, e.g. "VP of Engineering", "Head of RevOps", "Chief Compliance Officer"),
  "seniorityLevels": array from ["c_level", "vp", "director", "manager", "individual_contributor"] — pick 2-3 levels,
  "departments": array from ["Sales", "Marketing", "Engineering", "IT", "Operations", "HR", "Finance", "Product", "Customer Success"] — pick 1-3 most relevant,
  "primaryGoal": one of ["book_meetings", "generate_leads", "event_registrations", "promote_content"],
  "channels": {"email": boolean, "linkedin": boolean, "phone": boolean} — recommend based on buyer persona and price point,
  "prospectCount": number between 50-500 (recommend based on product maturity and market size),
  "buyingSignals": array from ["recent_funding", "new_executive", "company_expansion", "job_postings", "tech_stack_changes", "competitor_mention"] — pick 2-4 most relevant,
  "personalizationAngles": a 2-3 sentence description of how outreach should be personalized based on the prospect's specific business context,
  "triggerIndicators": a 2-3 sentence description of specific events or conditions that indicate a prospect needs this product right now,
  "customQuestions": array of 2-3 smart research questions to investigate about each prospect (e.g. "What CRM does this company currently use?", "Has this company recently expanded internationally?")
}

Think step by step:
1. What TYPE of buyer needs this product? (their role, department, seniority)
2. What SIZE of company benefits most? (startup vs enterprise)
3. What INDUSTRIES have the strongest pain point for this?
4. What SIGNALS indicate they're actively looking for a solution?
5. What CHANNELS work best for this buyer persona and deal size?
6. What makes outreach feel personal and relevant vs generic?

Return ONLY valid JSON. No markdown, no explanation, no code fences, no wrapping text.`;

    const response = await fetch(
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
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze this product and return optimal B2B campaign configuration as JSON:\n\n${productContext}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together API error ${response.status}: ${errorText}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error("No response from AI");

    // Strip markdown code fences if present
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const suggestions = JSON.parse(content);

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing product:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
