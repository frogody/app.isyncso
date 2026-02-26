import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface RequestBody {
  step: "welcome" | "country" | "identity" | "complete";
  companyName?: string;
  companyContext?: {
    country?: string;
    kvkNumber?: string;
    vatNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  };
}

const STEP_PROMPTS: Record<string, string> = {
  welcome: `Generate a warm, friendly welcome message (2-3 sentences max) for a business owner entering their finance module for the first time. Introduce yourself as their AI accountant. Mention you'll help them set up their financial administration so you can start processing invoices smartly. Keep it conversational and encouraging.`,

  country: `Generate a brief message (2-3 sentences) explaining why you need to know their country. Mention that tax rules vary significantly by country — you currently support Dutch BTW rules including intracommunity supplies (ICV), reverse charge mechanisms, and all standard Dutch tax rates. Keep it informative but not overwhelming.`,

  identity: `Generate a brief message (2-3 sentences) explaining why you need their company details (KVK, VAT, address). Explain that every invoice has two companies on it — theirs and the vendor — and you need their details to automatically identify which one is them when processing invoices. Make it feel like practical advice from an accountant.`,

  complete: `Generate a congratulatory message (2-3 sentences) for completing their finance setup. Mention their workspace is ready and you can now intelligently process their invoices, identify their company vs vendors, and handle Dutch tax calculations. End with enthusiasm about getting started.`,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { step, companyName, companyContext } = (await req.json()) as RequestBody;

    if (!step || !STEP_PROMPTS[step]) {
      return new Response(
        JSON.stringify({ error: "Invalid step. Must be: welcome, country, identity, or complete" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI accountant not configured", message: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const companyRef = companyName || "your company";
    let contextNote = "";

    if (step === "complete" && companyContext) {
      const parts = [];
      if (companyContext.kvkNumber) parts.push(`KVK: ${companyContext.kvkNumber}`);
      if (companyContext.vatNumber) parts.push(`VAT: ${companyContext.vatNumber}`);
      if (companyContext.city) parts.push(`based in ${companyContext.city}`);
      if (parts.length > 0) {
        contextNote = ` The company details: ${parts.join(", ")}.`;
      }
    }

    const systemPrompt = `You are SYNC Finance, a friendly and professional AI accountant for ${companyRef}. You speak in first person, you're warm but concise. You never use markdown formatting, bullet points, or headers — just clean conversational text. You don't use emojis. Keep responses under 100 tokens.`;

    const userPrompt = STEP_PROMPTS[step] + contextNote;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", message: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || null;

    return new Response(
      JSON.stringify({ message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Finance AI Accountant error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", message: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
