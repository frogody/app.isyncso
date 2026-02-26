import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface Message {
  id: string;
  content: string;
  sender_name?: string;
  sender_id?: string;
  sender_avatar?: string;
  created_at: string;
  reactions?: unknown[];
  is_pinned?: boolean;
}

interface DigestResult {
  summary: string;
  sentiment: {
    score: number;
    label: string;
    trend: string;
    reasoning: string;
  };
  topics: Array<{ word: string; count: number }>;
  decisions: Array<{
    text: string;
    author: string;
    timestamp: string;
    messageId: string;
  }>;
  actionItems: Array<{
    text: string;
    assignee: string;
    author: string;
    timestamp: string;
    messageId: string;
  }>;
  importantMessages: Array<{
    content: string;
    author: string;
    timestamp: string;
    reason: string;
    messageId: string;
  }>;
  questions: Array<{
    content: string;
    author: string;
    timestamp: string;
    messageId: string;
    answered: boolean;
  }>;
}

const SYSTEM_PROMPT = `You are an expert conversation analyst for a team communication platform. Your job is to analyze a batch of channel messages and produce a structured digest.

You MUST return valid JSON matching this exact schema (no markdown, no code fences, just raw JSON):

{
  "summary": "A 2-3 sentence executive summary of the conversation",
  "sentiment": {
    "score": 0.0-1.0 (0=very negative, 0.5=neutral, 1.0=very positive),
    "label": "Positive" | "Mostly Positive" | "Neutral" | "Mostly Negative" | "Negative",
    "trend": "improving" | "stable" | "declining",
    "reasoning": "Brief explanation of sentiment assessment"
  },
  "topics": [
    {"word": "topic name", "count": estimated_relevance_1_to_10}
  ],
  "decisions": [
    {
      "text": "Clear summary of the decision made",
      "author": "person who made/announced the decision",
      "timestamp": "ISO timestamp from the message",
      "messageId": "original message id"
    }
  ],
  "actionItems": [
    {
      "text": "Clear description of the action item or commitment",
      "assignee": "person responsible (or 'unassigned')",
      "author": "person who created/mentioned the item",
      "timestamp": "ISO timestamp",
      "messageId": "original message id"
    }
  ],
  "importantMessages": [
    {
      "content": "The important message content",
      "author": "sender name",
      "timestamp": "ISO timestamp",
      "reason": "Why this message is important (e.g. 'Announcement', 'Blocker', 'Key update')",
      "messageId": "original message id"
    }
  ],
  "questions": [
    {
      "content": "The question asked",
      "author": "who asked",
      "timestamp": "ISO timestamp",
      "messageId": "original message id",
      "answered": true/false (whether someone answered it in a later message)
    }
  ]
}

RULES:
- Extract REAL decisions, action items, and questions from the messages — do not hallucinate.
- Each extracted item MUST reference a real message ID and timestamp from the input.
- For topics, estimate relevance (1-10) based on how central the topic is to the conversation.
- Limit topics to 8-10 most relevant.
- Limit decisions, action items, important messages, and questions to the top 8 each.
- If a field has no items, return an empty array [].
- The summary should capture the key themes and outcomes of the conversation.
- Detect unanswered questions — mark "answered": false if no one responded to the question.`;

async function analyzeWithGroq(messages: Message[]): Promise<DigestResult> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Format messages for the LLM
  const formatted = messages
    .map(
      (m) =>
        `[${m.created_at}] [id:${m.id}] ${m.sender_name || m.sender_id || "Unknown"}: ${m.content || "(empty)"}${m.is_pinned ? " [PINNED]" : ""}${(m.reactions?.length || 0) > 2 ? ` [${m.reactions!.length} reactions]` : ""}`
    )
    .join("\n");

  const userPrompt = `Analyze these ${messages.length} messages and produce a structured digest:\n\n${formatted}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from Groq");
  }

  const parsed = JSON.parse(content);

  // Validate required fields
  return {
    summary: parsed.summary || "",
    sentiment: {
      score: typeof parsed.sentiment?.score === "number" ? parsed.sentiment.score : 0.5,
      label: parsed.sentiment?.label || "Neutral",
      trend: parsed.sentiment?.trend || "stable",
      reasoning: parsed.sentiment?.reasoning || "",
    },
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    importantMessages: Array.isArray(parsed.importantMessages)
      ? parsed.importantMessages
      : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = (await req.json()) as { messages: Message[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required and must not be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap at 200 messages to keep token usage reasonable
    const capped = messages.slice(0, 200);

    const result = await analyzeWithGroq(capped);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[digest-channel] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
