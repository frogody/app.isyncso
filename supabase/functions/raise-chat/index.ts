import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!TOGETHER_API_KEY) {
      return new Response(JSON.stringify({ error: "TOGETHER_API_KEY not configured" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, model, temperature, max_tokens, stream: shouldStream } = body;
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const selectedModel = model || "moonshotai/Kimi-K2-Instruct";
    const selectedTemp = temperature ?? 0.7;
    const selectedMaxTokens = max_tokens || 2048;
    const wantStream = shouldStream !== false;

    // Call Together.ai
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: selectedMaxTokens,
        temperature: selectedTemp,
        stream: wantStream,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Together.ai error:", errText);
      // Fallback to non-streaming with free model
      const fallbackResp = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
          messages,
          max_tokens: selectedMaxTokens,
          temperature: selectedTemp,
        }),
      });
      const fallbackData = await fallbackResp.json();
      return new Response(JSON.stringify(fallbackData), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // If non-streaming requested, return JSON directly
    if (!wantStream) {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Stream the response
    return new Response(response.body, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("raise-chat error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
