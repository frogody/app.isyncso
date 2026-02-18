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
    return twiml(`<Say voice="alice">Sorry, something went wrong. Please try again later.</Say><Hangup/>`);
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

  // Save conversation and reset timeout count in one write
  await supabase
    .from("sync_phone_calls")
    .update({ sync_actions_taken: { messages, timeout_count: 0 } })
    .eq("id", callId);

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
    return twiml(`<Say voice="alice">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
  }

  const participant = job.participants?.[pIdx];
  if (!participant) {
    console.error("[Scheduling] Participant not found at index:", pIdx);
    return twiml(`<Say voice="alice">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
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
    <Say voice="alice">${escapeXml(cleanGreeting)}</Say>
    <Gather input="speech" timeout="6" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">Are you still there?</Say>
    <Gather input="speech" timeout="6" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
    </Gather>
    <Say voice="alice">It seems like you're busy. I'll try again later. Goodbye!</Say>
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
      return twiml(`<Say voice="alice">I haven't heard from you, so I'll let you go. Goodbye!</Say><Hangup/>`);
    }

    return twiml(`
      <Say voice="alice">I'm still here. When are you free for the meeting?</Say>
      <Gather input="speech" timeout="6" speechTimeout="auto"
             action="${escapeXml(gatherUrl)}" method="POST">
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
    return twiml(`<Say voice="alice">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
  }

  const participant = job.participants?.[pIdx];
  if (!participant) {
    return twiml(`<Say voice="alice">Sorry, something went wrong. Goodbye.</Say><Hangup/>`);
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
      <Say voice="alice">${escapeXml(cleanResponse)}</Say>
      <Hangup/>
    `);
  }

  // Continue conversation
  return twiml(`
    <Say voice="alice">${escapeXml(cleanResponse)}</Say>
    <Gather input="speech" timeout="6" speechTimeout="auto"
           action="${escapeXml(gatherUrl)}" method="POST">
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
