// Scheduling Orchestrator: Event-driven state machine for multi-person meeting scheduling
// Entry points:
//   ?action=start        - Initiated by SYNC action, checks calendar & starts first call
//   ?action=call-completed - Called by voice-webhook when a scheduling call ends
//   ?action=advance      - Self-invoked to call next participant or finalize

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_MASTER_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_MASTER_AUTH_TOKEN")!;
const TWILIO_TWIML_APP_SID = Deno.env.get("TWILIO_TWIML_APP_SID") || "";
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY") || "";
const COMPOSIO_API_KEY = Deno.env.get("COMPOSIO_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────

interface Participant {
  name: string;
  phone: string;
  email: string;
  prospect_id: string;
  status: string;
  availability: Array<{ start: string; end: string }>;
  call_sid: string;
  call_record_id: string;
  error: string;
}

interface SchedulingJob {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  meeting_subject: string;
  meeting_duration_minutes: number;
  date_range_start: string;
  date_range_end: string;
  participants: Participant[];
  user_availability: Array<{ start: string; end: string }>;
  current_participant_index: number;
  current_call_sid: string;
  candidate_slots: Array<{ start: string; end: string }>;
  selected_slot: { start: string; end: string } | null;
  calendar_event_id: string;
  calendar_event_link: string;
  from_phone_number: string;
  error_message: string;
  retry_count: number;
  user_notified: boolean;
  notification_message: string;
}

// ─── Main Handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const jobId = url.searchParams.get("jobId") || "";

    if (!jobId) {
      return json({ error: "Missing jobId" }, 400);
    }

    console.log(`[Orchestrator] action=${action} jobId=${jobId}`);

    switch (action) {
      case "start":
        return await handleStart(jobId);
      case "call-completed":
        return await handleCallCompleted(jobId, url);
      case "advance":
        return await handleAdvance(jobId);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[Orchestrator] Fatal error:", err);
    return json({ error: "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Action: Start ────────────────────────────────────────────────────────
// Called by SYNC phone action after creating the job

async function handleStart(jobId: string): Promise<Response> {
  const job = await getJob(jobId);
  if (!job) return json({ error: "Job not found" }, 404);

  // 1. Fetch user's calendar to know busy slots
  await updateJobStatus(jobId, "checking_calendar");

  const userAvailability = await fetchUserFreeSlots(job);

  await supabase
    .from("scheduling_jobs")
    .update({
      user_availability: userAvailability,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // 2. Initiate call to first pending participant
  const firstPending = job.participants.findIndex((p) => p.status === "pending");
  if (firstPending === -1) {
    await updateJobStatus(jobId, "failed", "No pending participants to call");
    return json({ error: "No pending participants" });
  }

  await initiateSchedulingCall(job, firstPending);
  return json({ success: true, status: "calling", participantIndex: firstPending });
}

// ─── Action: Call Completed ───────────────────────────────────────────────
// Called by voice-webhook after a scheduling call ends

async function handleCallCompleted(jobId: string, url: URL): Promise<Response> {
  const participantIndex = parseInt(url.searchParams.get("participantIndex") || "0", 10);

  const job = await getJob(jobId);
  if (!job) return json({ error: "Job not found" }, 404);

  const participant = job.participants[participantIndex];
  if (!participant) return json({ error: "Participant not found" }, 404);

  console.log(`[Orchestrator] Call completed for ${participant.name} (index ${participantIndex})`);

  // Extract availability from the call transcript
  const availability = await extractAvailabilityFromTranscript(
    participant.call_record_id,
    job.date_range_start,
    job.date_range_end,
  );

  // Update participant with extracted availability
  const updatedParticipants = [...job.participants];
  updatedParticipants[participantIndex] = {
    ...updatedParticipants[participantIndex],
    availability,
    status: availability.length > 0 ? "completed" : "completed",
  };

  await supabase
    .from("scheduling_jobs")
    .update({
      participants: updatedParticipants,
      status: "between_calls",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Self-invoke advance to handle next step
  try {
    fetch(
      `${SUPABASE_URL}/functions/v1/scheduling-orchestrator?action=advance&jobId=${jobId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({}),
      },
    ).catch((err) => console.error("[Orchestrator] Advance invoke failed:", err));
  } catch (e) {
    console.error("[Orchestrator] Advance invoke error:", e);
  }

  return json({
    success: true,
    participant: participant.name,
    availabilitySlots: availability.length,
  });
}

// ─── Action: Advance ──────────────────────────────────────────────────────
// Decides what happens next: call next participant or finalize

async function handleAdvance(jobId: string): Promise<Response> {
  const job = await getJob(jobId);
  if (!job) return json({ error: "Job not found" }, 404);

  // Find next pending participant
  const nextPending = job.participants.findIndex((p) => p.status === "pending");

  if (nextPending !== -1) {
    // More people to call — compute candidate slots first
    const candidateSlots = computeCandidateSlots(job);

    await supabase
      .from("scheduling_jobs")
      .update({
        candidate_slots: candidateSlots,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await initiateSchedulingCall(job, nextPending);
    return json({ success: true, status: "calling_next", participantIndex: nextPending });
  }

  // All participants done — find overlapping slot
  console.log("[Orchestrator] All calls complete. Finding overlapping slot...");
  await updateJobStatus(jobId, "finding_slot");

  const allAvailability = job.participants
    .filter((p) => p.status === "completed" && p.availability?.length > 0)
    .map((p) => p.availability);

  if (allAvailability.length === 0) {
    await updateJobStatus(jobId, "failed", "No participants provided availability");
    await notifyUser(job, "None of the participants provided availability for the meeting.");
    return json({ success: false, error: "No availability collected" });
  }

  // Include user's free slots
  const userSlots = job.user_availability || [];
  const allSlotsArrays = userSlots.length > 0 ? [userSlots, ...allAvailability] : allAvailability;

  const overlappingSlot = findOverlappingSlot(
    allSlotsArrays,
    job.meeting_duration_minutes || 30,
  );

  if (!overlappingSlot) {
    // No common slot found — partial completion
    await updateJobStatus(jobId, "partial");

    const participantSummary = job.participants
      .filter((p) => p.availability?.length > 0)
      .map((p) => {
        const times = p.availability.map((a) =>
          new Date(a.start).toLocaleString("en-US", {
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit",
          })
        ).join(", ");
        return `${p.name}: ${times}`;
      })
      .join("\n");

    await notifyUser(
      job,
      `I couldn't find a time that works for everyone for "${job.meeting_subject}". Here's what each person said:\n\n${participantSummary}\n\nWould you like to pick a time manually?`,
    );
    return json({ success: true, status: "partial" });
  }

  // Found a slot! Create calendar event
  console.log("[Orchestrator] Found slot:", overlappingSlot);
  await updateJobStatus(jobId, "scheduling");

  await supabase
    .from("scheduling_jobs")
    .update({ selected_slot: overlappingSlot })
    .eq("id", jobId);

  const eventResult = await createCalendarEvent(job, overlappingSlot);

  if (eventResult.success) {
    await supabase
      .from("scheduling_jobs")
      .update({
        status: "completed",
        calendar_event_id: eventResult.eventId || "",
        calendar_event_link: eventResult.eventLink || "",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    const slotDate = new Date(overlappingSlot.start);
    const timeStr = slotDate.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    }) + " at " + slotDate.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    });
    const names = job.participants.map((p) => p.name).join(" and ");

    await notifyUser(
      job,
      `Meeting scheduled! "${job.meeting_subject}" with ${names} on ${timeStr}.${eventResult.eventLink ? ` Calendar event: ${eventResult.eventLink}` : ""}`,
    );

    return json({ success: true, status: "completed", slot: overlappingSlot });
  } else {
    // Calendar event creation failed — still notify with the time
    await updateJobStatus(jobId, "partial", "Calendar event creation failed");

    const slotDate = new Date(overlappingSlot.start);
    const timeStr = slotDate.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    }) + " at " + slotDate.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    });
    const names = job.participants.map((p) => p.name).join(" and ");

    await notifyUser(
      job,
      `I found a time for "${job.meeting_subject}" with ${names}: ${timeStr}. I couldn't create the calendar event automatically — please create it manually.`,
    );

    return json({ success: true, status: "partial", slot: overlappingSlot });
  }
}

// ─── Twilio: Initiate Outbound Call ──────────────────────────────────────

async function initiateSchedulingCall(job: SchedulingJob, participantIndex: number): Promise<void> {
  const participant = job.participants[participantIndex];
  console.log(`[Orchestrator] Initiating call to ${participant.name} at ${participant.phone}`);

  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  // The TwiML URL tells Twilio to hit our voice-webhook with scheduling-call handler
  const twimlUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=scheduling-call&jobId=${job.id}&participantIndex=${participantIndex}`;
  const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/voice-webhook?action=status`;

  const body = new URLSearchParams({
    To: participant.phone,
    From: job.from_phone_number,
    Url: twimlUrl,
    Method: "POST",
    StatusCallback: statusCallbackUrl,
    StatusCallbackEvent: "initiated ringing answered completed",
    StatusCallbackMethod: "POST",
    Timeout: "30",
    MachineDetection: "Enable",
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[Orchestrator] Twilio call error:", data);
      // Mark participant as failed
      const updatedParticipants = [...job.participants];
      updatedParticipants[participantIndex] = {
        ...updatedParticipants[participantIndex],
        status: "failed",
        error: data.message || "Twilio call failed",
      };
      await supabase
        .from("scheduling_jobs")
        .update({ participants: updatedParticipants })
        .eq("id", job.id);

      // Try to advance (skip this participant)
      fetch(
        `${SUPABASE_URL}/functions/v1/scheduling-orchestrator?action=advance&jobId=${job.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({}),
        },
      ).catch(() => {});
      return;
    }

    console.log(`[Orchestrator] Call initiated: SID=${data.sid}`);

    // Update job with calling status
    const updatedParticipants = [...job.participants];
    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      status: "calling",
      call_sid: data.sid,
    };

    await supabase
      .from("scheduling_jobs")
      .update({
        status: "calling",
        current_participant_index: participantIndex,
        current_call_sid: data.sid,
        participants: updatedParticipants,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  } catch (err) {
    console.error("[Orchestrator] Call initiation error:", err);
    const updatedParticipants = [...job.participants];
    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      status: "failed",
      error: err instanceof Error ? err.message : "Call initiation failed",
    };
    await supabase
      .from("scheduling_jobs")
      .update({ participants: updatedParticipants })
      .eq("id", job.id);
  }
}

// ─── Extract Availability from Transcript ──────────────────────────────────

async function extractAvailabilityFromTranscript(
  callRecordId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
): Promise<Array<{ start: string; end: string }>> {
  if (!callRecordId) return [];

  // Get the conversation from the call record
  const { data: callData } = await supabase
    .from("sync_phone_calls")
    .select("sync_actions_taken")
    .eq("id", callRecordId)
    .single();

  const messages = callData?.sync_actions_taken?.messages;
  if (!messages || messages.length === 0) return [];

  // Format transcript
  const transcript = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "Person" : "SYNC"}: ${m.content}`
    )
    .join("\n");

  if (!TOGETHER_API_KEY) {
    console.error("[Orchestrator] No TOGETHER_API_KEY for availability extraction");
    return [];
  }

  // Use LLM to extract structured availability
  const today = new Date().toISOString().split("T")[0];
  const startDate = new Date(dateRangeStart).toISOString().split("T")[0];
  const endDate = new Date(dateRangeEnd).toISOString().split("T")[0];

  const prompt = `Extract the availability time slots mentioned by "Person" in this phone conversation.
The meeting should be scheduled between ${startDate} and ${endDate}.
Today's date is ${today}.

TRANSCRIPT:
${transcript}

INSTRUCTIONS:
- Extract ONLY what the Person said they are available (NOT the SYNC assistant)
- Convert natural language times to specific ISO 8601 timestamps
- For vague times like "Tuesday afternoon", use 13:00-17:00
- For "morning", use 9:00-12:00
- For "after 2pm", use 14:00-17:00
- If they say they're NOT available, don't include those times
- If they say they're available "all day", use 9:00-17:00
- Use the correct date based on the day of week mentioned and the date range

Return ONLY valid JSON array of objects with "start" and "end" in ISO 8601 format.
Example: [{"start": "2026-02-20T14:00:00.000Z", "end": "2026-02-20T17:00:00.000Z"}]
If no availability was mentioned, return: []`;

  try {
    const res = await fetch("https://api.together.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for structured extraction
      }),
    });

    if (!res.ok) {
      console.error("[Orchestrator] LLM extraction error:", res.status);
      return [];
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "[]";

    // Parse JSON from LLM response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }

    const slots = JSON.parse(jsonStr);

    if (!Array.isArray(slots)) return [];

    // Validate each slot has start and end
    return slots.filter(
      (s: any) => s && typeof s.start === "string" && typeof s.end === "string",
    );
  } catch (err) {
    console.error("[Orchestrator] Availability extraction failed:", err);
    return [];
  }
}

// ─── Fetch User's Free Slots (Google Calendar) ────────────────────────────

async function fetchUserFreeSlots(
  job: SchedulingJob,
): Promise<Array<{ start: string; end: string }>> {
  // Look up user's Google Calendar connection
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("composio_connected_account_id")
    .eq("user_id", job.user_id)
    .eq("toolkit_slug", "googlecalendar")
    .eq("status", "ACTIVE")
    .limit(1)
    .single();

  if (!integration?.composio_connected_account_id) {
    console.log("[Orchestrator] No Google Calendar connection, assuming all free");
    return generateDefaultFreeSlots(job.date_range_start, job.date_range_end);
  }

  // Fetch events via Composio
  try {
    const result = await composioExecuteTool(
      integration.composio_connected_account_id,
      "GOOGLECALENDAR_LIST_EVENTS",
      {
        timeMin: job.date_range_start,
        timeMax: job.date_range_end,
        maxResults: 50,
      },
      job.user_id,
    );

    if (!result.success || !result.data) {
      console.error("[Orchestrator] Calendar fetch failed:", result.error);
      return generateDefaultFreeSlots(job.date_range_start, job.date_range_end);
    }

    // Extract busy times from events
    const events = extractEventsFromComposioResult(result.data);
    const busySlots = events.map((e: any) => ({
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
    })).filter((s: any) => s.start && s.end);

    // Compute free windows (invert busy into free, within business hours 9-18)
    return computeFreeSlots(busySlots, job.date_range_start, job.date_range_end);
  } catch (err) {
    console.error("[Orchestrator] Calendar fetch error:", err);
    return generateDefaultFreeSlots(job.date_range_start, job.date_range_end);
  }
}

function extractEventsFromComposioResult(data: any): any[] {
  // Composio may wrap the response in various ways
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.data?.items && Array.isArray(data.data.items)) return data.data.items;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.response_data?.items) return data.response_data.items;
  if (data?.response_data && Array.isArray(data.response_data)) return data.response_data;
  return [];
}

function generateDefaultFreeSlots(
  rangeStart: string,
  rangeEnd: string,
): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekday: 9am - 6pm
      const dayStart = new Date(current);
      dayStart.setHours(9, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(18, 0, 0, 0);
      slots.push({ start: dayStart.toISOString(), end: dayEnd.toISOString() });
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

function computeFreeSlots(
  busySlots: Array<{ start: string; end: string }>,
  rangeStart: string,
  rangeEnd: string,
): Array<{ start: string; end: string }> {
  // Generate business hours for each weekday in range
  const allSlots = generateDefaultFreeSlots(rangeStart, rangeEnd);

  if (busySlots.length === 0) return allSlots;

  // For each day's business hours, subtract busy periods
  const freeSlots: Array<{ start: string; end: string }> = [];

  for (const daySlot of allSlots) {
    const dayStart = new Date(daySlot.start).getTime();
    const dayEnd = new Date(daySlot.end).getTime();

    // Get busy periods that overlap with this day
    const dayBusy = busySlots
      .map((b) => ({
        start: Math.max(new Date(b.start).getTime(), dayStart),
        end: Math.min(new Date(b.end).getTime(), dayEnd),
      }))
      .filter((b) => b.start < b.end)
      .sort((a, b) => a.start - b.start);

    if (dayBusy.length === 0) {
      freeSlots.push(daySlot);
      continue;
    }

    // Walk through the day, emitting free gaps
    let cursor = dayStart;
    for (const busy of dayBusy) {
      if (cursor < busy.start) {
        freeSlots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(busy.start).toISOString(),
        });
      }
      cursor = Math.max(cursor, busy.end);
    }
    if (cursor < dayEnd) {
      freeSlots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(dayEnd).toISOString(),
      });
    }
  }

  return freeSlots;
}

// ─── Compute Candidate Slots (Intersection So Far) ───────────────────────

function computeCandidateSlots(
  job: SchedulingJob,
): Array<{ start: string; end: string }> {
  // Start with user's availability
  let candidateSlots = job.user_availability || [];

  // Intersect with each completed participant's availability
  for (const p of job.participants) {
    if (p.status === "completed" && p.availability?.length > 0) {
      if (candidateSlots.length === 0) {
        candidateSlots = p.availability;
      } else {
        candidateSlots = intersectSlots(candidateSlots, p.availability);
      }
    }
  }

  return candidateSlots;
}

// ─── Find Overlapping Slot (Final) ────────────────────────────────────────

function findOverlappingSlot(
  allAvailabilityArrays: Array<Array<{ start: string; end: string }>>,
  durationMinutes: number,
): { start: string; end: string } | null {
  if (allAvailabilityArrays.length === 0) return null;

  let overlap = allAvailabilityArrays[0];

  for (let i = 1; i < allAvailabilityArrays.length; i++) {
    overlap = intersectSlots(overlap, allAvailabilityArrays[i]);
    if (overlap.length === 0) return null;
  }

  // Find first slot that fits the meeting duration
  const durationMs = durationMinutes * 60 * 1000;
  for (const slot of overlap) {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    if (end - start >= durationMs) {
      return {
        start: new Date(start).toISOString(),
        end: new Date(start + durationMs).toISOString(),
      };
    }
  }

  return null;
}

function intersectSlots(
  slotsA: Array<{ start: string; end: string }>,
  slotsB: Array<{ start: string; end: string }>,
): Array<{ start: string; end: string }> {
  const result: Array<{ start: string; end: string }> = [];

  for (const a of slotsA) {
    const aStart = new Date(a.start).getTime();
    const aEnd = new Date(a.end).getTime();

    for (const b of slotsB) {
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();

      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);

      if (overlapStart < overlapEnd) {
        result.push({
          start: new Date(overlapStart).toISOString(),
          end: new Date(overlapEnd).toISOString(),
        });
      }
    }
  }

  return result.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

// ─── Create Calendar Event via Composio ──────────────────────────────────

async function createCalendarEvent(
  job: SchedulingJob,
  slot: { start: string; end: string },
): Promise<{ success: boolean; eventId?: string; eventLink?: string }> {
  // Get user's calendar connection
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("composio_connected_account_id")
    .eq("user_id", job.user_id)
    .eq("toolkit_slug", "googlecalendar")
    .eq("status", "ACTIVE")
    .limit(1)
    .single();

  if (!integration?.composio_connected_account_id) {
    console.error("[Orchestrator] No calendar connection for event creation");
    return { success: false };
  }

  const attendees = job.participants
    .filter((p) => p.email)
    .map((p) => ({ email: p.email }));

  const participantNames = job.participants.map((p) => p.name).join(", ");

  try {
    const result = await composioExecuteTool(
      integration.composio_connected_account_id,
      "GOOGLECALENDAR_CREATE_EVENT",
      {
        summary: job.meeting_subject || "Meeting",
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        description: `Meeting with ${participantNames}. Scheduled automatically by SYNC.`,
        attendees,
      },
      job.user_id,
    );

    if (result.success) {
      const eventData = result.data as any;
      const eventId = eventData?.id || eventData?.data?.id || "";
      const eventLink = eventData?.htmlLink || eventData?.data?.htmlLink || "";
      return { success: true, eventId, eventLink };
    }

    console.error("[Orchestrator] Calendar event creation failed:", result.error);
    return { success: false };
  } catch (err) {
    console.error("[Orchestrator] Calendar event error:", err);
    return { success: false };
  }
}

// ─── Composio API Helper ─────────────────────────────────────────────────

async function composioExecuteTool(
  connectedAccountId: string,
  toolSlug: string,
  args: Record<string, unknown>,
  entityId?: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { success: false, error: "COMPOSIO_API_KEY not configured" };
  }

  const requestBody: Record<string, unknown> = {
    connected_account_id: connectedAccountId,
    arguments: args,
  };
  if (entityId) requestBody.entity_id = entityId;

  try {
    const res = await fetch(
      `https://backend.composio.dev/api/v3/tools/execute/${toolSlug}`,
      {
        method: "POST",
        headers: {
          "x-api-key": COMPOSIO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!res.ok) {
      return { success: false, error: data?.message || data?.error || `HTTP ${res.status}` };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// ─── Notify User ─────────────────────────────────────────────────────────

async function notifyUser(job: SchedulingJob, message: string): Promise<void> {
  console.log(`[Orchestrator] Notifying user ${job.user_id}: ${message.substring(0, 100)}...`);

  // Insert into user_notifications table
  try {
    await supabase.from("user_notifications").insert({
      user_id: job.user_id,
      type: "scheduling",
      title: `Meeting Scheduling: ${job.meeting_subject || "Meeting"}`,
      message,
      metadata: { job_id: job.id },
      read: false,
    });
  } catch (err) {
    console.error("[Orchestrator] Notification insert failed:", err);
  }

  // Also update the job itself
  await supabase
    .from("scheduling_jobs")
    .update({
      user_notified: true,
      notification_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

// ─── DB Helpers ──────────────────────────────────────────────────────────

async function getJob(jobId: string): Promise<SchedulingJob | null> {
  const { data, error } = await supabase
    .from("scheduling_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    console.error("[Orchestrator] getJob error:", error);
    return null;
  }
  return data as SchedulingJob;
}

async function updateJobStatus(
  jobId: string,
  status: string,
  errorMessage?: string,
): Promise<void> {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (errorMessage) updates.error_message = errorMessage;
  if (status === "completed" || status === "failed") updates.completed_at = new Date().toISOString();

  await supabase
    .from("scheduling_jobs")
    .update(updates)
    .eq("id", jobId);
}
