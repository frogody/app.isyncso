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
    const { samples } = await req.json();

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one text sample is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a brand voice analyst. Analyze the provided text samples and extract a comprehensive brand voice profile.

Examine the writing style, tone, vocabulary choices, sentence structure, and overall personality conveyed through the text.

Return a JSON object with the following structure:
{
  "tone_descriptors": ["adjective1", "adjective2", "adjective3", "adjective4", "adjective5"],
  "vocabulary_preferences": {
    "preferred_words": ["word1", "word2", ...],
    "avoided_words": ["word1", "word2", ...],
    "industry_jargon": ["term1", "term2", ...],
    "power_words": ["word1", "word2", ...]
  },
  "sentence_patterns": [
    { "pattern": "Short punchy opener", "example": "We deliver results.", "description": "Uses brief declarative statements to open paragraphs" },
    { "pattern": "Question hooks", "example": "Ready to transform your business?", "description": "Engages readers with rhetorical questions" }
  ],
  "things_to_avoid": ["Avoid passive voice", "Never use corporate buzzwords like synergy", ...],
  "summary": "A 2-3 sentence description of the overall brand voice personality and communication style.",
  "formality_level": "casual" | "conversational" | "professional" | "formal" | "academic",
  "emotional_tone": "inspiring" | "authoritative" | "friendly" | "urgent" | "empathetic" | "bold",
  "reading_level": "simple" | "moderate" | "advanced"
}

Provide 3-5 tone descriptors as adjectives.
Provide 6-10 preferred words and 4-6 avoided words.
Provide 3-5 sentence patterns with concrete examples from the samples.
Provide 4-6 things to avoid.

Return ONLY valid JSON. No markdown, no explanation, no code fences.`;

    const samplesText = samples
      .map((s: string, i: number) => `--- Sample ${i + 1} ---\n${s}`)
      .join("\n\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Analyze these ${samples.length} text samples and extract the brand voice profile as JSON:\n\n${samplesText}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const aiData = await response.json();
    let content = aiData.content?.[0]?.text;

    if (!content) {
      throw new Error("No response content from Claude");
    }

    // Strip markdown code fences if present
    content = content.trim();
    if (content.startsWith("```")) {
      content = content
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing brand voice:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
