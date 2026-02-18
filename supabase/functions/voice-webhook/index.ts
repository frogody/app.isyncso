// Supabase Edge Function: voice-webhook
// Handles all Twilio voice call webhooks: outbound, inbound, AI conversation, status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");

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

  // Find an admin/owner user in this org to ring
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("company_id", phoneRecord.organization_id)
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

    // ── Initial call routing ────────────────────────────────────────────
    const to = payload.To || "";
    const from = payload.From || "";
    const callSid = payload.CallSid || "";
    const direction = payload.Direction || "";

    // Outbound from browser: To is a phone number, Direction is "outbound" or From starts with "client:"
    if (from.startsWith("client:") || direction === "outbound-api") {
      return await handleOutbound(payload, callSid);
    }

    // "Call Sync" from browser: To is "sync-ai"
    if (to === "sync-ai" || to === "client:sync-ai") {
      return await handleCallSync(payload, callSid, from);
    }

    // Inbound call from external phone
    return await handleInbound(payload, callSid);

  } catch (error) {
    console.error("Voice webhook error:", error);
    return twiml(`<Say voice="alice">Sorry, something went wrong. Please try again later.</Say><Hangup/>`);
  }
});

// ─── Outbound Call (Browser → Phone) ────────────────────────────────────────

async function handleOutbound(payload: Record<string, string>, callSid: string): Promise<Response> {
  const to = payload.To || "";
  const from = payload.From || "";
  // The actual caller number is passed as a custom param
  const callerNumber = payload.CallerNumber || payload.FromNumber || "";

  // If To looks like a phone number, dial it
  if (to.startsWith("+") || /^\d{10,}$/.test(to)) {
    // Create call record
    const { data: callRecord } = await supabase
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

    const statusUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=status&callId=${callRecord?.id || ""}`;

    return twiml(`
      <Dial callerId="${escapeXml(callerNumber || to)}"
            record="record-from-answer-dual"
            statusCallback="${escapeXml(statusUrl)}"
            statusCallbackEvent="initiated ringing answered completed">
        <Number>${escapeXml(to)}</Number>
      </Dial>
    `);
  }

  // If To is another client identity (shouldn't happen normally)
  return twiml(`<Say voice="alice">Sorry, I couldn't connect that call.</Say><Hangup/>`);
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
    <Say voice="alice">Hey! I'm Sync, your AI assistant. What can I help you with?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Are you still there?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Okay, talk to you later! Bye.</Say>
    <Hangup/>
  `);
}

// ─── Inbound Call (Phone → Sync Number) ─────────────────────────────────────

async function handleInbound(payload: Record<string, string>, callSid: string): Promise<Response> {
  const from = payload.From || "";
  const to = payload.To || "";

  // Look up caller
  const caller = await lookupCaller(from);
  const { userId, greeting } = await findUserForNumber(to);

  // Create call record
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
      status: "ringing",
      twilio_call_sid: callSid,
      started_at: new Date().toISOString(),
      sync_actions_taken: { messages: [], timeout_count: 0 },
    })
    .select("id")
    .single();

  const callIdParam = callRecord?.id || "";
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gather&callId=${callIdParam}`;
  const dialStatusUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=dial-status&callId=${callIdParam}`;

  // If user is online (has registered Twilio Device), try to ring their browser first
  if (userId) {
    const identity = `user_${userId}`;
    return twiml(`
      <Dial timeout="20" action="${escapeXml(dialStatusUrl)}" method="POST">
        <Client>${escapeXml(identity)}</Client>
      </Dial>
    `);
  }

  // No user found or not online — go straight to AI
  return twiml(`
    <Say voice="alice">${escapeXml(greeting)}</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Are you still there?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Goodbye. I'll let them know you called.</Say>
    <Hangup/>
  `);
}

// ─── Dial Status (After ringing browser client) ─────────────────────────────

async function handleDialStatus(payload: Record<string, string>, callId: string): Promise<Response> {
  const dialCallStatus = payload.DialCallStatus || "";

  // If the user answered in the browser, call is handled — just update status
  if (dialCallStatus === "completed" || dialCallStatus === "answered") {
    await supabase.from("sync_phone_calls").update({ status: "completed" }).eq("id", callId);
    return twiml("");
  }

  // User didn't answer — fall back to AI
  await supabase.from("sync_phone_calls").update({ status: "answered" }).eq("id", callId);

  // Get the greeting
  const { data: callData } = await supabase
    .from("sync_phone_calls")
    .select("callee_number")
    .eq("id", callId)
    .single();

  const { greeting } = await findUserForNumber(callData?.callee_number || "");
  const gatherUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=gather&callId=${callId}`;

  return twiml(`
    <Say voice="alice">${escapeXml(greeting)} They're not available right now, but I'm their AI assistant. How can I help?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Are you still there?</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Goodbye. I'll let them know you called.</Say>
    <Hangup/>
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
      return twiml(`<Say voice="alice">I haven't heard from you, so I'll let you go. Goodbye!</Say><Hangup/>`);
    }

    return twiml(`
      <Say voice="alice">I'm still here. Go ahead when you're ready.</Say>
      <Gather input="speech" timeout="5" speechTimeout="auto"
             action="${escapeXml(gatherUrl)}" method="POST">
      </Gather>
      <Redirect>${escapeXml(gatherUrl)}</Redirect>
    `);
  }

  // Process speech with LLM
  const messages = await getConversation(callId);
  messages.push({ role: "user", content: speechResult });

  const aiResponse = await callLLM(messages);
  messages.push({ role: "assistant", content: aiResponse });

  // Save conversation
  await saveConversation(callId, messages);

  // Reset timeout count on successful speech
  const { data: callData } = await supabase
    .from("sync_phone_calls")
    .select("sync_actions_taken")
    .eq("id", callId)
    .single();

  if (callData?.sync_actions_taken) {
    await supabase
      .from("sync_phone_calls")
      .update({ sync_actions_taken: { ...callData.sync_actions_taken, messages, timeout_count: 0 } })
      .eq("id", callId);
  }

  return twiml(`
    <Say voice="alice">${escapeXml(aiResponse)}</Say>
    <Gather input="speech" timeout="5" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
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
