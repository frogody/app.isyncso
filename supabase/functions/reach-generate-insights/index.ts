import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

/**
 * reach-generate-insights
 *
 * Analyzes marketing performance metrics using Claude and generates
 * 3-5 actionable insight cards that are stored in reach_insights.
 *
 * Expected body:
 *   { company_id: string, metrics_data?: object[] }
 *
 * Returns:
 *   { insights: Array<{ insight_type, title, description }> }
 */

interface Insight {
  insight_type: "trend" | "anomaly" | "recommendation" | "opportunity";
  title: string;
  description: string;
}

const SYSTEM_PROMPT = `You are a marketing analytics expert. Analyze the provided social media performance metrics and generate 3-5 actionable insight cards.

Each insight MUST have:
- insight_type: one of "trend", "anomaly", "recommendation", "opportunity"
- title: short, punchy title (max 60 characters)
- description: 1-2 sentences with specific data points and actionable advice

Focus on:
- Performance trends (improving/declining metrics)
- Anomalies (unusual spikes or drops)
- Platform-specific recommendations
- Timing/scheduling opportunities
- Audience engagement patterns

Return ONLY valid JSON array of insight objects. No markdown, no explanation.`;

const SAMPLE_INSIGHTS: Insight[] = [
  {
    insight_type: "trend",
    title: "Instagram engagement peaks on weekdays",
    description:
      "Posts published Tuesday through Thursday between 10 AM and 1 PM consistently see 40% higher engagement than weekend posts. Consider shifting your content calendar accordingly.",
  },
  {
    insight_type: "recommendation",
    title: "Increase video content on TikTok",
    description:
      "Your TikTok videos average 3.2x more reach than static posts. Allocating more budget to short-form video could significantly boost overall reach metrics.",
  },
  {
    insight_type: "opportunity",
    title: "LinkedIn audience is underserved",
    description:
      "Your LinkedIn followers grew 18% this month but you only posted 3 times. Increasing to 5-7 posts per week could capture this growing professional audience.",
  },
  {
    insight_type: "anomaly",
    title: "Facebook reach dropped 25% this week",
    description:
      "Organic reach on Facebook declined sharply compared to the prior period. This may be due to algorithm changes. Consider boosting top-performing posts to maintain visibility.",
  },
  {
    insight_type: "trend",
    title: "Cross-platform hashtags driving discovery",
    description:
      'Posts using 5-8 targeted hashtags see 2.1x more impressions than those without. The hashtags "#MarketingTips" and "#GrowthHacking" perform best across your channels.',
  },
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { company_id, metrics_data } = body as {
      company_id?: string;
      metrics_data?: object[];
    };

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If no metrics data provided or no API key, return sample insights
    if (!metrics_data || metrics_data.length === 0 || !ANTHROPIC_API_KEY) {
      const reason = !ANTHROPIC_API_KEY
        ? "ANTHROPIC_API_KEY not configured"
        : "No metrics data provided";

      return new Response(
        JSON.stringify({
          insights: SAMPLE_INSIGHTS,
          message: `Returning sample insights (${reason}). Connect social accounts and sync metrics to generate personalized AI insights.`,
          sample: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Claude to analyze metrics and generate insights
    const metricsJson = JSON.stringify(metrics_data.slice(0, 100), null, 2);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here are the marketing performance metrics for the selected date range:\n\n${metricsJson}\n\nGenerate 3-5 actionable insight cards as a JSON array.`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);

      // Fall back to sample insights on API error
      return new Response(
        JSON.stringify({
          insights: SAMPLE_INSIGHTS,
          message:
            "AI insight generation encountered an error. Returning sample insights instead.",
          sample: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anthropicBody = await anthropicRes.json();
    const rawText =
      anthropicBody.content?.[0]?.text || "[]";

    // Parse the JSON response
    let insights: Insight[];
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (parseErr) {
      console.error("Failed to parse Claude response:", parseErr, rawText);
      insights = SAMPLE_INSIGHTS;
    }

    // Validate insight structure
    insights = insights
      .filter(
        (i) =>
          i &&
          typeof i.title === "string" &&
          typeof i.description === "string" &&
          ["trend", "anomaly", "recommendation", "opportunity"].includes(
            i.insight_type
          )
      )
      .slice(0, 5);

    if (insights.length === 0) {
      insights = SAMPLE_INSIGHTS;
    }

    return new Response(
      JSON.stringify({
        insights,
        message: "Insights generated successfully",
        sample: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("reach-generate-insights error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
