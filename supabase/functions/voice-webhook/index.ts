// Supabase Edge Function: voice-webhook
// Handles all Twilio voice call webhooks: outbound, inbound, AI conversation, status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Twilio Signature Validation ──────────────────────────────────────────────

async function validateTwilioSignature(
  req: Request,
  params: Record<string, string>,
): Promise<boolean> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || Deno.env.get("TWILIO_MASTER_AUTH_TOKEN");
  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is not configured");
  }

  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) {
    console.error("[voice-webhook] Missing X-Twilio-Signature header");
    return false;
  }

  // Build the validation string: full URL + sorted POST params appended
  const url = req.url;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1 with auth token
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Constant-time comparison
  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── TwiML Helpers ──────────────────────────────────────────────────────────

function twiml(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${body}</Response>`,
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
      },
    }
  );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── LLM for AI Conversation ───────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `You are SYNC, a friendly AI phone assistant for a business.

RULES:
- Keep responses to 1-2 short sentences. This is a phone call, not an email.
- Be warm, natural, and conversational.
- Use contractions: I'm, you're, let's, that's, don't.
- NEVER use markdown, bullets, lists, or formatting.
- Numbers spoken naturally: "about twelve hundred" not "1,247".
- If the caller wants to leave a message, confirm you'll pass it along.
- If the caller wants to schedule something, take down the details.
- If the caller asks to speak to someone, say you'll let them know.
- Always be helpful and professional.`;

async function callLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (!TOGETHER_API_KEY) return "I'm sorry, I'm having trouble right now. Can I take a message?";

  try {
    const res = await fetch("https://api.together.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [{ role: "system", content: AI_SYSTEM_PROMPT }, ...messages],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`LLM error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "I didn't catch that. Could you say that again?";
  } catch (err) {
    console.error("LLM error:", err);
    return "I'm sorry, I'm having a moment. Can I take a message instead?";
  }
}

// ─── Gatekeeper LLM (screens inbound calls) ────────────────────────────────

function getGatekeeperPrompt(userName: string): string {
  return `You are SYNC, a professional AI assistant who screens phone calls for ${userName}.

YOUR JOB:
- Answer incoming calls warmly and professionally.
- Find out WHO is calling and WHY they want to speak to ${userName}.
- Once you have both their name and reason, offer to connect them.

FLOW:
1. Greet the caller: "Hi, you've reached ${userName}'s office. I'm SYNC, their AI assistant. How can I help you today?"
2. If they ask to speak to ${userName}, say "Of course! May I ask who's calling?"
3. Once you have their name, ask "And what is this regarding?"
4. When you have BOTH name and reason, output the transfer marker exactly as shown below.
5. If they just want to leave a message, get the message and output the message marker.

MARKERS (output these EXACTLY when ready):
- To transfer: [TRANSFER:CallerName:brief reason]
  Example: [TRANSFER:David:project discussion]
- To take a message: [MESSAGE:CallerName:message summary]
  Example: [MESSAGE:Sarah:please call back about the invoice]

RULES:
- Keep responses to 1-2 short sentences. This is a phone call.
- Be warm and natural. Use contractions.
- NEVER use markdown, bullets, or formatting.
- If the caller gives both name and reason in one sentence, output [TRANSFER:...] immediately.
- If they seem unsure or just want to leave a message, use [MESSAGE:...] instead.
- Do NOT transfer without getting at least a name.`;
}

async function callGatekeeperLLM(
  messages: Array<{ role: string; content: string }>,
  userName: string,
): Promise<string> {
  const llmPayload = {
    messages: [{ role: "system", content: getGatekeeperPrompt(userName) }, ...messages],
    max_tokens: 200,
    temperature: 0.6,
  };

  // Try Groq first (fastest), fall back to Together.ai
  const providers = [
    ...(GROQ_API_KEY ? [{
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: GROQ_API_KEY,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      name: "Groq",
    }] : []),
    ...(TOGETHER_API_KEY ? [{
      url: "https://api.together.ai/v1/chat/completions",
      key: TOGETHER_API_KEY,
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      name: "Together",
    }] : []),
  ];

  if (providers.length === 0) return "I'm sorry, I'm having trouble right now. Can I take a message?";

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: provider.model, ...llmPayload }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`[Gatekeeper] ${provider.name} error ${res.status}: ${errBody}`);
        continue; // Try next provider
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        console.log(`[Gatekeeper] Used ${provider.name} successfully`);
        return content;
      }
    } catch (err) {
      console.error(`[Gatekeeper] ${provider.name} failed:`, err);
      continue; // Try next provider
    }
  }

  return "I didn't catch that. Could you say that again?";
}

// ─── Parse Twilio Form Data ────────────────────────────────────────────────

async function parsePayload(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await req.json();
  }
  // Twilio sends form-encoded data
  const formData = await req.formData();
  const payload: Record<string, string> = {};
  formData.forEach((value, key) => {
    payload[key] = value.toString();
  });
  return payload;
}

// ─── Look Up Caller ────────────────────────────────────────────────────────

async function lookupCaller(phoneNumber: string): Promise<{ name: string | null; entityType: string | null; entityId: string | null }> {
  // Check prospects (CRM contacts)
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, full_name")
    .or(`phone.eq.${phoneNumber},mobile.eq.${phoneNumber}`)
    .limit(1)
    .single();

  if (prospect) {
    return { name: prospect.full_name, entityType: "prospect", entityId: prospect.id };
  }

  // Check sync_phone_contacts
  const { data: contact } = await supabase
    .from("sync_phone_contacts")
    .select("id, name, entity_type, entity_id")
    .eq("phone_number", phoneNumber)
    .limit(1)
    .single();

  if (contact) {
    return { name: contact.name, entityType: contact.entity_type, entityId: contact.entity_id };
  }

  return { name: null, entityType: null, entityId: null };
}

// ─── Find User for Phone Number ────────────────────────────────────────────

async function findUserForNumber(toNumber: string): Promise<{ userId: string | null; greeting: string }> {
  const { data: phoneRecord } = await supabase
    .from("organization_phone_numbers")
    .select("organization_id, metadata")
    .eq("phone_number", toNumber)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!phoneRecord) return { userId: null, greeting: "Hello, how can I help you?" };

  // Find a user in this org to ring
  // organization_phone_numbers.organization_id maps to users.organization_id
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("organization_id", phoneRecord.organization_id)
    .limit(1);

  const userName = users?.[0]?.full_name || "our team";
  const greeting = phoneRecord.metadata?.greeting ||
    `Hello, you've reached the office of ${userName}. How can I help you today?`;

  return { userId: users?.[0]?.id || null, greeting };
}

// ─── Store/Retrieve Conversation ────────────────────────────────────────────

async function getConversation(callId: string): Promise<Array<{ role: string; content: string }>> {
  const { data } = await supabase
    .from("sync_phone_calls")
    .select("sync_actions_taken")
    .eq("id", callId)
    .single();

  return data?.sync_actions_taken?.messages || [];
}

async function saveConversation(callId: string, messages: Array<{ role: string; content: string }>) {
  await supabase
    .from("sync_phone_calls")
    .update({ sync_actions_taken: { messages, timeout_count: 0 } })
    .eq("id", callId);
}

// ─── Handlers ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const callId = url.searchParams.get("callId");

    const payload = await parsePayload(req);

    // ── Twilio signature validation (fail closed) ──────────────────────
    try {
      const isValid = await validateTwilioSignature(req, payload);
      if (!isValid) {
        console.error("[voice-webhook] Invalid Twilio signature — rejecting request");
        return new Response("Forbidden", { status: 403 });
      }
    } catch (err) {
      // Auth token not configured — fail closed
      console.error("[voice-webhook] Signature validation error:", err);
      return new Response("Server configuration error", { status: 500 });
    }

    // ── Status callback ─────────────────────────────────────────────────
    if (action === "status") {
      return await handleStatus(payload);
    }

    // ── Gather callback (AI speech received) ────────────────────────────
    if (action === "gather" && callId) {
      return await handleGather(payload, callId);
    }

    // ── Dial status (after <Dial> completes) ────────────────────────────
    if (action === "dial-status" && callId) {
      return await handleDialStatus(payload, callId);
    }

    // ── Gatekeeper gather (AI screening inbound call) ─────────────────
    if (action === "gatekeeper-gather" && callId) {
      const gkUserId = url.searchParams.get("userId") || "";
      return await handleGatekeeperGather(payload, callId, gkUserId);
    }

    // ── Scheduling call (outbound AI call for meeting scheduling) ──────
    if (action === "scheduling-call") {
      const jobId = url.searchParams.get("jobId") || "";
      const participantIndex = url.searchParams.get("participantIndex") || "0";
      return await handleSchedulingCall(payload, jobId, participantIndex);
    }

    // ── Scheduling gather (during ongoing scheduling call) ─────────────
    if (action === "scheduling-gather") {
      const jobId = url.searchParams.get("jobId") || "";
      const participantIndex = url.searchParams.get("participantIndex") || "0";
      const schedCallId = url.searchParams.get("callId") || "";
      return await handleSchedulingGather(payload, jobId, participantIndex, schedCallId);
    }

    // ── Initial call routing ────────────────────────────────────────────
    const to = payload.To || "";
    const from = payload.From || "";
    const callSid = payload.CallSid || "";
    const direction = payload.Direction || "";

    // "Call Sync" from browser: To is "sync-ai" — must check BEFORE generic outbound
    if (to === "sync-ai" || to === "client:sync-ai") {
      return await handleCallSync(payload, callSid, from);
    }

    // Outbound from browser: To is a phone number, Direction is "outbound" or From starts with "client:"
    if (from.startsWith("client:") || direction === "outbound-api") {
      return await handleOutbound(payload, callSid);
    }

    // Inbound call from external phone
    return await handleInbound(payload, callSid);

  } catch (error) {
    console.error("Voice webhook error:", error);
    return twiml(`<Say voice="Polly.Joanna-Neural">Sorry, something went wrong. Please try again later.</Say><Hangup/>`);
  }
});

// ─── Outbound Call (Browser → Phone) ────────────────────────────────────────

async function handleOutbound(payload: Record<string, string>, callSid: string): Promise<Response> {
  let to = payload.To || "";
  const from = payload.From || "";
  // The actual caller number is passed as a custom param
  const callerNumber = payload.CallerNumber || payload.FromNumber || "";

  console.log("[voice-webhook] handleOutbound:", { to, from, callerNumber, callSid });

  // Normalize number to E.164: convert 00 prefix to +, or prepend + for bare digits
  if (to.startsWith("00") && to.length > 6) {
    to = "+" + to.slice(2);
  } else if (/^\d{10}$/.test(to)) {
    to = "+1" + to; // Assume US for 10-digit
  } else if (/^\d{11,}$/.test(to) && !to.startsWith("+")) {
    to = "+" + to;
  }

  // If To looks like a phone number, dial it
  if (to.startsWith("+") || /^\d{10,}$/.test(to)) {
    // Create call record (wrapped in try-catch so DB errors don't kill the TwiML response)
    let callRecordId = "";
    try {
      const { data: callRecord, error: dbError } = await supabase
        .from("sync_phone_calls")
        .insert({
          user_id: from.replace("client:user_", ""),
          direction: "outbound",
          caller_number: callerNumber || from,
          callee_number: to,
          status: "ringing",
          twilio_call_sid: callSid,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("[voice-webhook] DB insert error:", dbError);
      }
      callRecordId = callRecord?.id || "";
    } catch (dbErr) {
      console.error("[voice-webhook] DB insert exception:", dbErr);
    }

    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=status&callId=${callRecordId}`;

    // callerId must be a valid Twilio number owned by the account; fall back gracefully
    const dialCallerId = callerNumber || "";
    const dialAttrs = dialCallerId
      ? `callerId="${escapeXml(dialCallerId)}" `
      : "";

    const twimlBody = `
      <Dial ${dialAttrs}timeout="30"
            statusCallback="${escapeXml(statusUrl)}"
            statusCallbackEvent="initiated ringing answered completed">
        <Number>${escapeXml(to)}</Number>
      </Dial>
    `;

    console.log("[voice-webhook] Outbound TwiML:", twimlBody);

    return twiml(twimlBody);
  }

  // If To is another client identity (shouldn't happen normally)
  console.warn("[voice-webhook] Unrecognized outbound target:", to);
  return twiml(`<Say voice="Polly.Joanna-Neural">Sorry, I couldn't connect that call.</Say><Hangup/>`);
}

// ─── Call Sync (Browser → AI Conversation) ──────────────────────────────────

async function handleCallSync(payload: Record<string, string>, callSid: string, from: string): Promise<Response> {
  const userId = from.replace("client:user_", "");

  const { data: callRecord } = await supabase
    .from("sync_phone_calls")
    .insert({
      user_id: userId,
      direction: "outbound",
      caller_number: from,
      callee_number: "sync-ai",
      status: "answered",
      twilio_call_sid: callSid,
      started_at: new Date().toISOString(),
      sync_actions_taken: { messages: [], timeout_count: 0 },
    })
    .select("id")
    .single();

  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gather&callId=${callRecord?.id || ""}`;

  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">Hey! I'm Sync, your AI assistant. What can I help you with?</Say>
    </Gather>
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">Are you still there?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">Okay, talk to you later! Bye.</Say>
    <Hangup/>
  `);
}

// ─── Inbound Call (Phone → Sync Number) ─────────────────────────────────────

async function handleInbound(payload: Record<string, string>, callSid: string): Promise<Response> {
  const from = payload.From || "";
  const to = payload.To || "";

  console.log("[voice-webhook] handleInbound — gatekeeper flow:", { from, to, callSid });

  // Look up caller
  const caller = await lookupCaller(from);
  const { userId, greeting } = await findUserForNumber(to);

  // Get user name for gatekeeper prompt
  let userName = "our team";
  if (userId) {
    const { data: userData } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();
    userName = userData?.full_name || "our team";
  }

  // Create call record with status 'gatekeeping'
  const { data: callRecord } = await supabase
    .from("sync_phone_calls")
    .insert({
      user_id: userId || "00000000-0000-0000-0000-000000000000",
      direction: "inbound",
      caller_number: from,
      caller_name: caller.name,
      caller_entity_type: caller.entityType,
      caller_entity_id: caller.entityId,
      callee_number: to,
      status: "gatekeeping",
      twilio_call_sid: callSid,
      started_at: new Date().toISOString(),
      sync_actions_taken: { messages: [], timeout_count: 0 },
    })
    .select("id")
    .single();

  const callIdParam = callRecord?.id || "";

  // Insert gatekeeping notification so the browser avatar shows teal pulse
  if (userId) {
    await supabase.from("user_notifications").insert({
      user_id: userId,
      type: "call_gatekeeping",
      title: "Incoming call being screened",
      message: `SYNC is screening a call from ${caller.name || from}`,
      metadata: { callerNumber: from, callerName: caller.name, callId: callIdParam },
    }).catch((err: any) => console.error("[Gatekeeper] Notification insert error:", err));
  }

  // Always go to gatekeeper AI first — never ring browser directly
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gatekeeper-gather&callId=${callIdParam}&userId=${userId || ""}`;

  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">Hi, you've reached the office of ${escapeXml(userName)}. I'm SYNC, their AI assistant. How can I help you today?</Say>
    </Gather>
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">Are you still there? How can I help?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">I haven't heard from you. Goodbye, I'll let them know you called.</Say>
    <Hangup/>
  `);
}

// ─── Dial Status (After ringing browser client) ─────────────────────────────

async function handleDialStatus(payload: Record<string, string>, callId: string): Promise<Response> {
  const dialCallStatus = payload.DialCallStatus || "";

  console.log("[voice-webhook] handleDialStatus:", { dialCallStatus, callId });

  // If the user answered in the browser, call is handled — just update status
  if (dialCallStatus === "completed" || dialCallStatus === "answered") {
    await supabase.from("sync_phone_calls").update({ status: "completed" }).eq("id", callId);
    return twiml("");
  }

  // User didn't answer the transfer — fall back to gatekeeper AI to take a message
  await supabase.from("sync_phone_calls").update({ status: "gatekeeping" }).eq("id", callId);

  // Get call data for context
  const { data: callData } = await supabase
    .from("sync_phone_calls")
    .select("callee_number, caller_name, user_id")
    .eq("id", callId)
    .single();

  const userId = callData?.user_id || "";

  // Insert call_message notification to clear gatekeeping state if user doesn't answer
  if (userId) {
    await supabase.from("user_notifications").insert({
      user_id: userId,
      type: "call_message",
      title: "Missed call — taking message",
      message: `${callData?.caller_name || "Caller"} couldn't be connected. SYNC is taking a message.`,
      metadata: { callId },
    }).catch((err: any) => console.error("[Gatekeeper] Notification error:", err));
  }

  const callerName = callData?.caller_name || "the caller";
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gatekeeper-gather&callId=${callId}&userId=${userId}`;

  // Seed the conversation with context so gatekeeper knows user didn't answer
  const existingMessages = await getConversation(callId);
  existingMessages.push({
    role: "system",
    content: `The user did not answer the transfer. Tell ${callerName} that they're not available right now and offer to take a message.`,
  });
  await saveConversation(callId, existingMessages);

  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">I'm sorry, they're not available right now. Can I take a message for them?</Say>
    </Gather>
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">Are you still there? Would you like to leave a message?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">Alright, I'll let them know you called. Goodbye!</Say>
    <Hangup/>
  `);
}

// ─── Gatekeeper Gather (AI screening inbound call) ──────────────────────────

async function handleGatekeeperGather(
  payload: Record<string, string>,
  callId: string,
  userId: string,
): Promise<Response> {
  const speechResult = payload.SpeechResult || "";
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gatekeeper-gather&callId=${callId}&userId=${userId}`;

  // No speech detected
  if (!speechResult) {
    const { data: callData } = await supabase
      .from("sync_phone_calls")
      .select("sync_actions_taken")
      .eq("id", callId)
      .single();

    const timeoutCount = (callData?.sync_actions_taken?.timeout_count || 0) + 1;
    await supabase
      .from("sync_phone_calls")
      .update({ sync_actions_taken: { ...callData?.sync_actions_taken, timeout_count: timeoutCount } })
      .eq("id", callId);

    if (timeoutCount >= 3) {
      return twiml(`<Say voice="Polly.Joanna-Neural">I haven't heard from you, so I'll let you go. Goodbye!</Say><Hangup/>`);
    }

    return twiml(`
      <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
              timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
        <Say voice="Polly.Joanna-Neural">I'm still here. How can I help you?</Say>
      </Gather>
      <Redirect>${escapeXml(gatherUrl)}</Redirect>
    `);
  }

  // Get user name for gatekeeper prompt
  let userName = "our team";
  if (userId) {
    const { data: userData } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();
    userName = userData?.full_name || "our team";
  }

  // Process speech with gatekeeper LLM
  const messages = await getConversation(callId);
  messages.push({ role: "user", content: speechResult });

  const aiResponse = await callGatekeeperLLM(messages, userName);

  // Check for TRANSFER marker: [TRANSFER:name:reason]
  const transferMatch = aiResponse.match(/\[TRANSFER:([^:]+):([^\]]+)\]/);
  if (transferMatch && userId) {
    const callerName = transferMatch[1].trim();
    const callReason = transferMatch[2].trim();
    const cleanResponse = aiResponse.replace(/\[TRANSFER:[^\]]+\]/, "").trim();

    console.log("[Gatekeeper] Transfer detected:", { callerName, callReason, userId });

    // Update call record
    await supabase
      .from("sync_phone_calls")
      .update({
        caller_name: callerName,
        status: "transferring",
        sync_actions_taken: { messages, timeout_count: 0, call_reason: callReason },
      })
      .eq("id", callId);

    // Insert transfer notification — triggers IncomingCallOverlay in browser
    await supabase.from("user_notifications").insert({
      user_id: userId,
      type: "incoming_call_transfer",
      title: `Call from ${callerName}`,
      message: `${callerName} is calling about: ${callReason}`,
      metadata: {
        callerName,
        callReason,
        callerNumber: payload.From || "",
        callId,
      },
    }).catch((err: any) => console.error("[Gatekeeper] Transfer notification error:", err));

    const sayText = cleanResponse || `Thanks ${callerName}, let me connect you now.`;
    const dialStatusUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=dial-status&callId=${callId}`;
    const identity = `user_${userId}`;

    // Save conversation before transferring
    messages.push({ role: "assistant", content: sayText });
    await saveConversation(callId, messages);

    return twiml(`
      <Say voice="Polly.Joanna-Neural">${escapeXml(sayText)}</Say>
      <Dial timeout="25" action="${escapeXml(dialStatusUrl)}" method="POST">
        <Client>${escapeXml(identity)}</Client>
      </Dial>
    `);
  }

  // Check for MESSAGE marker: [MESSAGE:name:summary]
  const messageMatch = aiResponse.match(/\[MESSAGE:([^:]+):([^\]]+)\]/);
  if (messageMatch) {
    const callerName = messageMatch[1].trim();
    const messageSummary = messageMatch[2].trim();
    const cleanResponse = aiResponse.replace(/\[MESSAGE:[^\]]+\]/, "").trim();

    console.log("[Gatekeeper] Message taken:", { callerName, messageSummary });

    // Update call record
    await supabase
      .from("sync_phone_calls")
      .update({
        caller_name: callerName,
        status: "completed",
        sync_summary: `Message from ${callerName}: ${messageSummary}`,
        sync_actions_taken: { messages, timeout_count: 0, call_reason: messageSummary },
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId);

    // Insert message notification
    if (userId) {
      await supabase.from("user_notifications").insert({
        user_id: userId,
        type: "call_message",
        title: `Message from ${callerName}`,
        message: messageSummary,
        metadata: { callerName, messageSummary, callerNumber: payload.From || "", callId },
      }).catch((err: any) => console.error("[Gatekeeper] Message notification error:", err));
    }

    const sayText = cleanResponse || `I'll pass that along to ${userName}. Thanks for calling, goodbye!`;
    return twiml(`
      <Say voice="Polly.Joanna-Neural">${escapeXml(sayText)}</Say>
      <Hangup/>
    `);
  }

  // No markers — continue the gatekeeper conversation normally
  const cleanResponse = aiResponse.replace(/\[TRANSFER:[^\]]*\]|\[MESSAGE:[^\]]*\]/g, "").trim();
  messages.push({ role: "assistant", content: cleanResponse });
  await saveConversation(callId, messages);

  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">${escapeXml(cleanResponse)}</Say>
    </Gather>
    <Redirect>${escapeXml(gatherUrl)}</Redirect>
  `);
}

// ─── Gather Callback (AI Speech Processing) ─────────────────────────────────

async function handleGather(payload: Record<string, string>, callId: string): Promise<Response> {
  const speechResult = payload.SpeechResult || "";
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gather&callId=${callId}`;

  // No speech detected
  if (!speechResult) {
    // Get timeout count
    const { data: callData } = await supabase
      .from("sync_phone_calls")
      .select("sync_actions_taken")
      .eq("id", callId)
      .single();

    const timeoutCount = (callData?.sync_actions_taken?.timeout_count || 0) + 1;
    await supabase
      .from("sync_phone_calls")
      .update({ sync_actions_taken: { ...callData?.sync_actions_taken, timeout_count: timeoutCount } })
      .eq("id", callId);

    if (timeoutCount >= 3) {
      return twiml(`<Say voice="Polly.Joanna-Neural">I haven't heard from you, so I'll let you go. Goodbye!</Say><Hangup/>`);
    }

    return twiml(`
      <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
              timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
        <Say voice="Polly.Joanna-Neural">I'm still here. Go ahead when you're ready.</Say>
      </Gather>
      <Redirect>${escapeXml(gatherUrl)}</Redirect>
    `);
  }

  // Process speech with LLM
  const messages = await getConversation(callId);
  messages.push({ role: "user", content: speechResult });

  const aiResponse = await callLLM(messages);
  messages.push({ role: "assistant", content: aiResponse });

  // Save conversation and reset timeout count in one write
  await supabase
    .from("sync_phone_calls")
    .update({ sync_actions_taken: { messages, timeout_count: 0 } })
    .eq("id", callId);

  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">${escapeXml(aiResponse)}</Say>
    </Gather>
    <Redirect>${escapeXml(gatherUrl)}</Redirect>
  `);
}

// ─── Status Callback ────────────────────────────────────────────────────────

async function handleStatus(payload: Record<string, string>): Promise<Response> {
  const callSid = payload.CallSid || "";
  const callStatus = payload.CallStatus || "";
  const callDuration = payload.CallDuration || payload.Duration || "";
  const recordingUrl = payload.RecordingUrl || "";

  if (!callSid) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const updates: Record<string, any> = {};

  if (callStatus === "completed" || callStatus === "busy" || callStatus === "no-answer" || callStatus === "failed" || callStatus === "canceled") {
    updates.status = callStatus === "completed" ? "completed" : callStatus === "busy" ? "declined" : callStatus;
    updates.ended_at = new Date().toISOString();
  } else if (callStatus === "in-progress" || callStatus === "answered") {
    updates.status = "answered";
  } else if (callStatus === "ringing") {
    updates.status = "ringing";
  }

  if (callDuration) {
    updates.duration_seconds = parseInt(callDuration, 10);
  }

  if (recordingUrl) {
    updates.recording_url = recordingUrl;
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("sync_phone_calls")
      .update(updates)
      .eq("twilio_call_sid", callSid);
  }

  // Generate summary for completed calls with conversation
  if (callStatus === "completed") {
    const { data: callData } = await supabase
      .from("sync_phone_calls")
      .select("sync_actions_taken, caller_number, direction")
      .eq("twilio_call_sid", callSid)
      .single();

    const messages = callData?.sync_actions_taken?.messages;
    if (messages?.length > 0) {
      const summaryPrompt = messages.map((m: any) =>
        `${m.role === "user" ? "Caller" : "SYNC"}: ${m.content}`
      ).join("\n");

      const summary = await callLLM([
        { role: "user", content: `Summarize this phone call in 1-2 sentences:\n\n${summaryPrompt}` },
      ]);

      await supabase
        .from("sync_phone_calls")
        .update({ sync_summary: summary, transcript: summaryPrompt })
        .eq("twilio_call_sid", callSid);
    }
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
}

// ─── Scheduling Call Handlers ──────────────────────────────────────────────

function getSchedulingSystemPrompt(
  job: any,
  participant: any,
  candidateSlots: Array<{ start: string; end: string }>,
): string {
  const subject = job.meeting_subject || "a meeting";
  const duration = job.meeting_duration_minutes || 30;
  const dateStart = new Date(job.date_range_start).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const dateEnd = new Date(job.date_range_end).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  let slotSuggestions = "";
  if (candidateSlots.length > 0) {
    const formatted = candidateSlots.slice(0, 5).map((s) => {
      const d = new Date(s.start);
      return d.toLocaleDateString("en-US", { weekday: "long" }) + " " +
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }).join(", ");
    slotSuggestions = `\n\nBased on previous responses, these times might work: ${formatted}. Suggest these first, but be open to other times.`;
  }

  return `You are SYNC, a friendly AI assistant making a phone call on behalf of your user to schedule ${subject}.

YOUR TASK:
- You're calling ${participant.name} to find out when they're free for a ${duration}-minute ${subject}.
- The meeting should happen between ${dateStart} and ${dateEnd}.
- Be warm, natural, and conversational. This is a phone call.${slotSuggestions}

RULES:
- Keep responses to 1-2 short sentences. Be concise.
- Introduce yourself: "Hi ${participant.name}, this is Sync, an AI assistant calling on behalf of [your user]. I'm helping schedule ${subject}."
- Ask when they're available between ${dateStart} and ${dateEnd}.
- Listen for specific days, times, or time ranges (e.g. "Tuesday afternoon", "Thursday after 2pm").
- Confirm back what you heard: "Got it, so you're free Tuesday between 2 and 5pm, is that right?"
- When they confirm their availability, say something like "Perfect, I've got your availability. I'll find a time that works for everyone and send a calendar invite. Thanks ${participant.name}!"
- After confirming availability, end your response with the marker [AVAILABILITY_CONFIRMED] on its own line.
- NEVER use markdown, bullets, lists, or formatting. Speak naturally.
- If they ask who the meeting is with or what it's about, tell them it's "${subject}".
- If they can't talk now, politely ask when you can call back.
- If they say they're not available at all during that time range, acknowledge it and end with [AVAILABILITY_CONFIRMED].`;
}

async function callSchedulingLLM(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
): Promise<string> {
  if (!TOGETHER_API_KEY) return "I'm sorry, I'm having trouble right now. I'll have someone follow up with you.";

  try {
    const res = await fetch("https://api.together.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

    if (!res.ok) throw new Error(`LLM error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "I didn't catch that. Could you repeat when you're available?";
  } catch (err) {
    console.error("[Scheduling] LLM error:", err);
    return "I'm sorry, I'm having a moment. Could you repeat that?";
  }
}

async function handleSchedulingCall(
  payload: Record<string, string>,
  jobId: string,
  participantIndex: string,
): Promise<Response> {
  const callSid = payload.CallSid || "";
  const pIdx = parseInt(participantIndex, 10);

  console.log("[voice-webhook] handleSchedulingCall:", { jobId, participantIndex, callSid });

  // Fetch the scheduling job
  const { data: job, error: jobError } = await supabase
    .from("scheduling_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error("[Scheduling] Job not found:", jobId, jobError);
    return twiml(`<Say voice="Polly.Joanna-Neural">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
  }

  const participant = job.participants?.[pIdx];
  if (!participant) {
    console.error("[Scheduling] Participant not found at index:", pIdx);
    return twiml(`<Say voice="Polly.Joanna-Neural">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
  }

  // Create a call record in sync_phone_calls
  const { data: callRecord, error: crError } = await supabase
    .from("sync_phone_calls")
    .insert({
      user_id: job.user_id,
      direction: "outbound",
      caller_number: job.from_phone_number || "",
      callee_number: participant.phone,
      status: "answered",
      twilio_call_sid: callSid,
      started_at: new Date().toISOString(),
      sync_actions_taken: { messages: [], timeout_count: 0 },
    })
    .select("id")
    .single();

  if (crError) console.error("[Scheduling] Call record insert error:", crError);
  const callRecordId = callRecord?.id || "";

  // Update job: mark participant as calling, save call_sid
  const updatedParticipants = [...job.participants];
  updatedParticipants[pIdx] = {
    ...updatedParticipants[pIdx],
    status: "calling",
    call_sid: callSid,
    call_record_id: callRecordId,
  };

  await supabase
    .from("scheduling_jobs")
    .update({
      status: "calling",
      current_participant_index: pIdx,
      current_call_sid: callSid,
      participants: updatedParticipants,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Build candidate slots from previous participants' availability
  const candidateSlots: Array<{ start: string; end: string }> = [];
  for (let i = 0; i < pIdx; i++) {
    const prev = job.participants[i];
    if (prev?.availability?.length) {
      candidateSlots.push(...prev.availability);
    }
  }

  // Generate greeting
  const systemPrompt = getSchedulingSystemPrompt(job, participant, candidateSlots);
  const greeting = await callSchedulingLLM(
    [{ role: "user", content: "(The call just connected. Introduce yourself and ask about their availability.)" }],
    systemPrompt,
  );

  // Strip the marker from greeting if present
  const cleanGreeting = greeting.replace(/\[AVAILABILITY_CONFIRMED\]/g, "").trim();

  // Save initial conversation
  const initMessages = [
    { role: "assistant", content: cleanGreeting },
  ];
  await saveConversation(callRecordId, initMessages);

  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=scheduling-gather&jobId=${jobId}&participantIndex=${participantIndex}&callId=${callRecordId}`;

  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">${escapeXml(cleanGreeting)}</Say>
    </Gather>
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">Are you still there?</Say>
    </Gather>
    <Say voice="Polly.Joanna-Neural">It seems like you're busy. I'll try again later. Goodbye!</Say>
    <Hangup/>
  `);
}

async function handleSchedulingGather(
  payload: Record<string, string>,
  jobId: string,
  participantIndex: string,
  callId: string,
): Promise<Response> {
  const speechResult = payload.SpeechResult || "";
  const pIdx = parseInt(participantIndex, 10);
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=scheduling-gather&jobId=${jobId}&participantIndex=${participantIndex}&callId=${callId}`;

  // No speech detected
  if (!speechResult) {
    const { data: callData } = await supabase
      .from("sync_phone_calls")
      .select("sync_actions_taken")
      .eq("id", callId)
      .single();

    const timeoutCount = (callData?.sync_actions_taken?.timeout_count || 0) + 1;
    await supabase
      .from("sync_phone_calls")
      .update({ sync_actions_taken: { ...callData?.sync_actions_taken, timeout_count: timeoutCount } })
      .eq("id", callId);

    if (timeoutCount >= 3) {
      // Mark participant as failed due to no response
      await markParticipantStatus(jobId, pIdx, "failed", "No response during call");
      return twiml(`<Say voice="Polly.Joanna-Neural">I haven't heard from you, so I'll let you go. Goodbye!</Say><Hangup/>`);
    }

    return twiml(`
      <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
              timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
        <Say voice="Polly.Joanna-Neural">I'm still here. When are you free for the meeting?</Say>
      </Gather>
      <Redirect>${escapeXml(gatherUrl)}</Redirect>
    `);
  }

  // Fetch job for system prompt context
  const { data: job } = await supabase
    .from("scheduling_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) {
    return twiml(`<Say voice="Polly.Joanna-Neural">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
  }

  const participant = job.participants?.[pIdx];
  if (!participant) {
    return twiml(`<Say voice="Polly.Joanna-Neural">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
  }

  // Build candidate slots from previous participants
  const candidateSlots: Array<{ start: string; end: string }> = [];
  for (let i = 0; i < pIdx; i++) {
    const prev = job.participants[i];
    if (prev?.availability?.length) {
      candidateSlots.push(...prev.availability);
    }
  }

  // Process speech with scheduling LLM
  const messages = await getConversation(callId);
  messages.push({ role: "user", content: speechResult });

  const systemPrompt = getSchedulingSystemPrompt(job, participant, candidateSlots);
  const aiResponse = await callSchedulingLLM(messages, systemPrompt);

  // Check for availability confirmed marker
  const isConfirmed = aiResponse.includes("[AVAILABILITY_CONFIRMED]");
  const cleanResponse = aiResponse.replace(/\[AVAILABILITY_CONFIRMED\]/g, "").trim();

  messages.push({ role: "assistant", content: cleanResponse });
  await saveConversation(callId, messages);

  if (isConfirmed) {
    // Mark participant as completed, trigger orchestrator
    await markParticipantStatus(jobId, pIdx, "completed", "");

    // Notify the scheduling orchestrator that this call is done
    try {
      fetch(`${SUPABASE_URL}/functions/v1/scheduling-orchestrator?action=call-completed&jobId=${jobId}&participantIndex=${pIdx}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ jobId, participantIndex: pIdx, callId }),
      }).catch((err) => console.error("[Scheduling] Orchestrator callback failed:", err));
    } catch (e) {
      console.error("[Scheduling] Orchestrator callback error:", e);
    }

    return twiml(`
      <Say voice="Polly.Joanna-Neural">${escapeXml(cleanResponse)}</Say>
      <Hangup/>
    `);
  }

  // Continue conversation
  return twiml(`
    <Gather input="speech" language="en-US" enhanced="true" speechModel="experimental_conversations"
            timeout="5" speechTimeout="auto" action="${escapeXml(gatherUrl)}" method="POST">
      <Say voice="Polly.Joanna-Neural">${escapeXml(cleanResponse)}</Say>
    </Gather>
    <Redirect>${escapeXml(gatherUrl)}</Redirect>
  `);
}

async function markParticipantStatus(
  jobId: string,
  participantIndex: number,
  status: string,
  errorMsg: string,
): Promise<void> {
  const { data: job } = await supabase
    .from("scheduling_jobs")
    .select("participants")
    .eq("id", jobId)
    .single();

  if (!job) return;

  const updatedParticipants = [...job.participants];
  updatedParticipants[participantIndex] = {
    ...updatedParticipants[participantIndex],
    status,
    error: errorMsg,
  };

  await supabase
    .from("scheduling_jobs")
    .update({
      participants: updatedParticipants,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
