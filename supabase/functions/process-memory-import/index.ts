import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const togetherApiKey = Deno.env.get("TOGETHER_API_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let importId: string | undefined;

  try {
    const { import_id, user_id } = await req.json();
    importId = import_id;

    if (!import_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "import_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the import record
    const { data: importRecord, error: fetchError } = await supabase
      .from("user_memory_imports")
      .select("*")
      .eq("id", import_id)
      .eq("user_id", user_id)
      .single();

    if (fetchError || !importRecord) {
      return new Response(
        JSON.stringify({ error: "Import record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set status to processing
    await supabase
      .from("user_memory_imports")
      .update({ status: "processing" })
      .eq("id", import_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("attachments")
      .download(importRecord.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Parse the file based on type
    const filename = (importRecord.original_filename || "").toLowerCase();
    let userMessages = "";
    let conversationCount = 0;

    if (filename.endsWith(".zip")) {
      const result = await parseZipFile(fileData);
      userMessages = result.userMessages;
      conversationCount = result.conversationCount;
    } else if (filename.endsWith(".json")) {
      const text = await fileData.text();
      const json = JSON.parse(text);
      const result = parseJsonConversations(json, importRecord.provider);
      userMessages = result.userMessages;
      conversationCount = result.conversationCount;
    } else {
      // TXT or other — use raw text
      userMessages = await fileData.text();
      conversationCount = 1;
    }

    // Truncate to ~15K chars
    if (userMessages.length > 15000) {
      userMessages = userMessages.slice(0, 15000);
    }

    if (!userMessages.trim()) {
      throw new Error("No user messages found in the uploaded file");
    }

    // Call Together AI for extraction
    const extracted = await extractWithLLM(userMessages, togetherApiKey);

    // Update the import record with results
    const { error: updateError } = await supabase
      .from("user_memory_imports")
      .update({
        topics: extracted.topics || [],
        preferences: extracted.preferences || [],
        key_facts: extracted.key_facts || [],
        writing_style: extracted.writing_style || null,
        summary: extracted.summary || null,
        conversation_count: conversationCount,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", import_id);

    if (updateError) {
      throw new Error(`Failed to update import record: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        import_id,
        topics: extracted.topics,
        preferences: extracted.preferences,
        key_facts: extracted.key_facts,
        writing_style: extracted.writing_style,
        summary: extracted.summary,
        conversation_count: conversationCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-memory-import error:", err);

    // Update status to failed if we have an import ID
    if (importId) {
      await supabase
        .from("user_memory_imports")
        .update({
          status: "failed",
          error_message: err.message || "Unknown error",
        })
        .eq("id", importId);
    }

    return new Response(
      JSON.stringify({ error: err.message || "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- File Parsing ---

async function parseZipFile(
  blob: Blob
): Promise<{ userMessages: string; conversationCount: number }> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  let userMessages = "";
  let conversationCount = 0;

  // ChatGPT export: conversations.json at root
  const conversationsFile = zip.file("conversations.json");
  if (conversationsFile) {
    const text = await conversationsFile.async("text");
    const conversations = JSON.parse(text);
    const result = parseJsonConversations(conversations, "chatgpt");
    return result;
  }

  // Claude export: multiple JSON files in directories
  const jsonFiles = zip.file(/\.json$/);
  if (jsonFiles.length > 0) {
    for (const file of jsonFiles) {
      try {
        const text = await file.async("text");
        const json = JSON.parse(text);
        const result = parseJsonConversations(
          Array.isArray(json) ? json : [json],
          "claude"
        );
        userMessages += result.userMessages + "\n";
        conversationCount += result.conversationCount;
      } catch {
        // Skip unparseable files
      }
    }
    return { userMessages, conversationCount };
  }

  // Fallback: read all text files
  const textFiles = zip.file(/\.(txt|md)$/);
  for (const file of textFiles) {
    const text = await file.async("text");
    userMessages += text + "\n";
    conversationCount++;
  }

  return { userMessages, conversationCount };
}

function parseJsonConversations(
  data: any,
  provider: string
): { userMessages: string; conversationCount: number } {
  let userMessages = "";
  let conversationCount = 0;

  if (provider === "chatgpt") {
    // ChatGPT format: array of conversations with mapping of message nodes
    const conversations = Array.isArray(data) ? data : [data];
    conversationCount = conversations.length;

    for (const convo of conversations) {
      if (convo.mapping) {
        for (const nodeId of Object.keys(convo.mapping)) {
          const node = convo.mapping[nodeId];
          const msg = node?.message;
          if (
            msg?.author?.role === "user" &&
            msg?.content?.parts
          ) {
            const text = msg.content.parts
              .filter((p: any) => typeof p === "string")
              .join("\n");
            if (text.trim()) {
              userMessages += text + "\n";
            }
          }
        }
      }
    }
  } else if (provider === "claude") {
    // Claude export: array of conversations with chat_messages
    const conversations = Array.isArray(data) ? data : [data];
    conversationCount = conversations.length;

    for (const convo of conversations) {
      const messages = convo.chat_messages || convo.messages || [];
      for (const msg of messages) {
        if (msg.sender === "human" || msg.role === "user") {
          const text =
            typeof msg.text === "string"
              ? msg.text
              : typeof msg.content === "string"
              ? msg.content
              : Array.isArray(msg.content)
              ? msg.content
                  .filter((c: any) => c.type === "text")
                  .map((c: any) => c.text)
                  .join("\n")
              : "";
          if (text.trim()) {
            userMessages += text + "\n";
          }
        }
      }
    }
  } else {
    // Generic: try to find user messages in any format
    const conversations = Array.isArray(data) ? data : [data];
    conversationCount = conversations.length;

    for (const convo of conversations) {
      const messages =
        convo.messages || convo.chat_messages || convo.data || [];
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (
            msg.role === "user" ||
            msg.sender === "human" ||
            msg.author === "user"
          ) {
            const text =
              typeof msg.content === "string"
                ? msg.content
                : typeof msg.text === "string"
                ? msg.text
                : "";
            if (text.trim()) {
              userMessages += text + "\n";
            }
          }
        }
      }
    }
  }

  return { userMessages, conversationCount };
}

// --- LLM Extraction ---

async function extractWithLLM(
  userMessages: string,
  apiKey: string
): Promise<{
  topics: Array<{ topic: string; frequency: number }>;
  preferences: Array<{
    category: string;
    preference: string;
    confidence: number;
  }>;
  key_facts: Array<{ fact: string; source_context: string }>;
  writing_style: string;
  summary: string;
}> {
  const systemPrompt = `You are an AI that analyzes a user's conversation history to build a profile. Given their messages, extract:

1. **topics**: Array of {topic, frequency} — what subjects they discuss most (frequency as count estimate)
2. **preferences**: Array of {category, preference, confidence} — their preferences (confidence 0-1)
3. **key_facts**: Array of {fact, source_context} — personal facts about them (name, job, location, etc.)
4. **writing_style**: A brief description of how they write (formal/casual, verbose/concise, etc.)
5. **summary**: A 2-3 sentence overview of who this person is based on their messages.

Return ONLY valid JSON with these exact keys. No markdown, no explanation.`;

  const response = await fetch(
    "https://api.together.xyz/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Kimi-K2-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Here are the user's messages from their AI conversation history:\n\n${userMessages}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Together AI API error: ${response.status} — ${errText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";

  // Parse the JSON response — strip markdown fences if present
  const cleaned = content
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON: ${cleaned.slice(0, 200)}`
    );
  }
}
