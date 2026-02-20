import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

/**
 * sync-meeting-wrapup — Post-call analysis via Groq LLM.
 *
 * Takes the full call transcript and produces a structured wrap-up:
 *   - executive summary
 *   - action items with assignees & due dates
 *   - decisions made
 *   - key discussion points
 *   - follow-up suggestions
 *   - sentiment per speaker
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const {
      transcript,
      callTitle,
      callDuration,
      participants,
      callId,
    } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
      return new Response(
        JSON.stringify({
          summary: "Call was too short to generate a meaningful wrap-up.",
          action_items: [],
          decisions: [],
          key_points: [],
          follow_ups: [],
          sentiment: { overall: "neutral" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const participantList = (participants || [])
      .map((p: { name?: string; role?: string }) => `${p.name || "Unknown"} (${p.role || "participant"})`)
      .join(", ");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: `You are SYNC, an AI meeting assistant. Analyze the following call transcript and produce a comprehensive post-call wrap-up.

Call: "${callTitle || "Video Call"}"
Duration: ${callDuration || "unknown"}
Participants: ${participantList || "unknown"}

Return valid JSON matching this exact schema:
{
  "summary": "2-3 sentence executive summary of the call",
  "action_items": [
    {
      "text": "description of the action",
      "assignee": "person's name or 'Unassigned'",
      "due_hint": "suggested timeframe like 'by Friday' or 'next week'",
      "priority": "high" | "medium" | "low"
    }
  ],
  "decisions": [
    {
      "text": "what was decided",
      "context": "brief context for why"
    }
  ],
  "key_points": ["important discussion point 1", "point 2"],
  "follow_ups": [
    {
      "text": "suggested follow-up action",
      "type": "email" | "meeting" | "task" | "update"
    }
  ],
  "sentiment": {
    "overall": "positive" | "neutral" | "negative" | "mixed",
    "notes": "brief sentiment observation"
  }
}

Rules:
- Only extract what was ACTUALLY said. No hallucination.
- Keep action items specific and actionable.
- If no decisions were made, return empty array.
- Maximum 8 action items, 5 decisions, 6 key points, 4 follow-ups.
- Be concise — single sentence per item.`,
            },
            {
              role: "user",
              content: `Full transcript:\n${transcript.slice(0, 12000)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let wrapup = null;
    if (content) {
      try {
        wrapup = JSON.parse(content);
      } catch {
        console.error("[sync-meeting-wrapup] Failed to parse JSON");
      }
    }

    // Fallback structure
    if (!wrapup) {
      wrapup = {
        summary: "Unable to generate a detailed summary for this call.",
        action_items: [],
        decisions: [],
        key_points: [],
        follow_ups: [],
        sentiment: { overall: "neutral", notes: "" },
      };
    }

    return new Response(JSON.stringify(wrapup), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync-meeting-wrapup] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
