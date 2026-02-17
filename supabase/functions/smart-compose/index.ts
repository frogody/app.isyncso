import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

/**
 * smart-compose — AI-powered message composition assistant.
 *
 * Supports two modes:
 *   - "autocomplete": Ghost-text suggestion for inline compose
 *   - "smart_reply":  2-3 contextual quick reply suggestions
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
      mode = "autocomplete",
      text,
      lastMessage,
      recentMessages = [],
      channelName,
    } = await req.json();

    // ---------------------------------------------------------------
    // MODE: autocomplete — ghost-text inline suggestion
    // ---------------------------------------------------------------
    if (mode === "autocomplete") {
      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return new Response(
          JSON.stringify({ suggestion: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contextLines = recentMessages
        .slice(-5)
        .map((m: { sender?: string; content?: string }) =>
          `${m.sender || "User"}: ${m.content || ""}`
        )
        .join("\n");

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a smart email/chat autocomplete assistant. Given the user's partial message and recent conversation context, suggest a natural completion for their sentence.

Rules:
- Return ONLY the completion text (the part that comes AFTER what the user already typed)
- Keep it short: 3-15 words maximum
- Match the user's tone and formality level
- Make it natural and professional
- If no good completion comes to mind, return empty string ""
- Do NOT repeat what the user already typed
- Do NOT add quotes around the suggestion`,
              },
              {
                role: "user",
                content: `${contextLines ? `Recent conversation:\n${contextLines}\n\n` : ""}User is typing: "${text}"

Suggest a natural completion:`,
              },
            ],
            temperature: 0.3,
            max_tokens: 60,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim() || null;

      // Clean up: remove leading quotes, trailing quotes, and any repeated user text
      let cleaned = suggestion;
      if (cleaned) {
        cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
        if (cleaned.length < 2) cleaned = null;
      }

      return new Response(
        JSON.stringify({ suggestion: cleaned }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------------------------------------------------------
    // MODE: smart_reply — 2-3 quick reply suggestions
    // ---------------------------------------------------------------
    if (mode === "smart_reply") {
      if (
        !lastMessage ||
        typeof lastMessage !== "string" ||
        lastMessage.trim().length < 2
      ) {
        return new Response(
          JSON.stringify({ replies: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const contextLines = recentMessages
        .slice(-5)
        .map((m: { sender?: string; content?: string }) =>
          `${m.sender || "User"}: ${m.content || ""}`
        )
        .join("\n");

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `You are a smart reply assistant for a team chat app. Given the last message received and conversation context, suggest 3 brief, natural reply options the user might want to send.

Rules:
- Return valid JSON array of exactly 3 strings
- Each reply: 2-8 words, casual-professional tone
- Match the energy/formality of the conversation
- One positive/agreeing, one informational, one follow-up/question
- Do NOT be overly enthusiastic or use excessive exclamation marks
- Be contextually relevant, not generic

Return format: ["reply1", "reply2", "reply3"]`,
              },
              {
                role: "user",
                content: `${contextLines ? `Recent conversation:\n${contextLines}\n\n` : ""}Last message received: "${lastMessage}"

Suggest 3 quick replies:`,
              },
            ],
            temperature: 0.4,
            max_tokens: 100,
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

      let replies: string[] = [];
      if (content) {
        try {
          const parsed = JSON.parse(content);
          // Handle both { replies: [...] } and direct [...] format
          replies = Array.isArray(parsed)
            ? parsed.slice(0, 3)
            : Array.isArray(parsed.replies)
            ? parsed.replies.slice(0, 3)
            : [];
        } catch {
          console.error("[smart-compose] Failed to parse reply JSON");
        }
      }

      return new Response(
        JSON.stringify({ replies }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown mode
    return new Response(
      JSON.stringify({ error: `Unknown mode: ${mode}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[smart-compose] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
