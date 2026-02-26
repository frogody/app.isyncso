import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

/**
 * transcribe-audio — Real-time audio transcription via Groq Whisper.
 *
 * Accepts raw audio as a multipart/form-data upload (field: "audio").
 * Returns the transcription + optionally a live analysis pass.
 *
 * Two modes:
 *   1. "transcribe" (default) — just returns text
 *   2. "transcribe_and_analyze" — returns text + live AI analysis
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const contentType = req.headers.get("content-type") || "";

    let audioBlob: Blob;
    let mode = "transcribe";
    let transcriptSoFar = "";
    let language = ""; // empty = auto-detect

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio");
      if (!audioFile || !(audioFile instanceof File || audioFile instanceof Blob)) {
        throw new Error("Missing 'audio' field in form data");
      }
      audioBlob = audioFile as Blob;
      mode = (formData.get("mode") as string) || "transcribe";
      transcriptSoFar = (formData.get("transcript_so_far") as string) || "";
      language = (formData.get("language") as string) || "";
    } else {
      // Accept raw binary with query params
      const url = new URL(req.url);
      mode = url.searchParams.get("mode") || "transcribe";
      language = url.searchParams.get("language") || "";
      transcriptSoFar = url.searchParams.get("transcript_so_far") || "";
      audioBlob = await req.blob();
    }

    // ------------------------------------------------------------------
    // Step 1: Transcribe with Groq Whisper
    // ------------------------------------------------------------------
    const whisperForm = new FormData();
    whisperForm.append("file", audioBlob, "audio.webm");
    whisperForm.append("model", "whisper-large-v3-turbo");
    // Only set language if explicitly provided — otherwise Whisper auto-detects
    if (language) {
      whisperForm.append("language", language);
    }
    whisperForm.append("response_format", "verbose_json");
    whisperForm.append("temperature", "0.0");

    const whisperRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: whisperForm,
      }
    );

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      throw new Error(`Whisper API error ${whisperRes.status}: ${errText}`);
    }

    const whisperData = await whisperRes.json();
    const transcribedText = whisperData.text || "";
    const segments = whisperData.segments || [];

    // If only transcription was requested, return immediately
    if (mode === "transcribe" || !transcribedText.trim()) {
      return new Response(
        JSON.stringify({
          text: transcribedText,
          segments,
          language: whisperData.language || language,
          duration: whisperData.duration || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ------------------------------------------------------------------
    // Step 2: Live analysis pass (lightweight, fast)
    // ------------------------------------------------------------------
    const fullTranscript = transcriptSoFar
      ? `${transcriptSoFar}\n${transcribedText}`
      : transcribedText;

    // Detect transcript language for analysis prompt
    const detectedLang = whisperData.language || "en";

    const analysisRes = await fetch(
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
              content: `You are a real-time meeting assistant analyzing a live conversation transcript. Extract ONLY what's clearly said — no hallucination.

IMPORTANT: The transcript is in "${detectedLang}". Write ALL analysis fields in the SAME language as the transcript. Additionally, provide an "action_items_en" field with English translations of action items (for automated task execution).

Return JSON:
{
  "action_items": ["string — in transcript language"],
  "action_items_en": ["string — English translation of each action item"],
  "decisions": ["string — in transcript language"],
  "questions": ["string — in transcript language"],
  "key_points": ["string — in transcript language"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "current_topic": "string — in transcript language"
}

Keep arrays short (max 5 items each). Focus on the LATEST segment but use the full transcript for context. Be concise — single sentence per item.`,
            },
            {
              role: "user",
              content: `Full transcript so far:\n${fullTranscript}\n\nAnalyze the latest additions and overall conversation.`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      }
    );

    let analysis = null;
    if (analysisRes.ok) {
      const analysisData = await analysisRes.json();
      const content = analysisData.choices?.[0]?.message?.content;
      if (content) {
        try {
          analysis = JSON.parse(content);
        } catch {
          console.error("[transcribe-audio] Failed to parse analysis JSON");
        }
      }
    }

    return new Response(
      JSON.stringify({
        text: transcribedText,
        segments,
        language: whisperData.language || language,
        duration: whisperData.duration || 0,
        analysis,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[transcribe-audio] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
