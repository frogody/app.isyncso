/**
 * Phone Actions for SYNC Agent
 * - schedule_meeting_calls: Initiate multi-person meeting scheduling via phone calls
 * - get_scheduling_job_status: Check status of an ongoing scheduling job
 */

import { ActionContext, ActionResult } from './types.ts';
import { successResult, errorResult } from '../utils/helpers.ts';
import { getConnectionForToolkit } from './composio.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Action names
export const PHONE_ACTIONS = [
  'schedule_meeting_calls',
  'get_scheduling_job_status',
];

/**
 * Route phone actions
 */
export async function executePhoneAction(
  ctx: ActionContext,
  action: string,
  data: any,
): Promise<ActionResult> {
  switch (action) {
    case 'schedule_meeting_calls':
      return scheduleMeetingCalls(ctx, data);
    case 'get_scheduling_job_status':
      return getSchedulingJobStatus(ctx, data);
    default:
      return errorResult(`Unknown phone action: ${action}`);
  }
}

/**
 * Parse a natural language date range into start/end timestamps
 */
function parseDateRange(dateRange: string): { start: string; end: string } {
  const now = new Date();
  const lower = (dateRange || '').toLowerCase();

  if (lower.includes('next week')) {
    // Next Monday 00:00 to next Friday 23:59
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    nextMonday.setHours(0, 0, 0, 0);
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    nextFriday.setHours(23, 59, 59, 999);
    return { start: nextMonday.toISOString(), end: nextFriday.toISOString() };
  }

  if (lower.includes('this week')) {
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    return { start: now.toISOString(), end: friday.toISOString() };
  }

  if (lower.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(18, 0, 0, 0);
    return { start: tomorrow.toISOString(), end: end.toISOString() };
  }

  // Default: next 7 days
  const weekLater = new Date(now);
  weekLater.setDate(now.getDate() + 7);
  return { start: now.toISOString(), end: weekLater.toISOString() };
}

/**
 * Main action: Schedule meeting by calling participants
 */
async function scheduleMeetingCalls(
  ctx: ActionContext,
  data: {
    participants: string[];
    meeting_subject?: string;
    date_range?: string;
    duration_minutes?: number;
  },
): Promise<ActionResult> {
  const { supabase, companyId, userId } = ctx;

  if (!userId) {
    return errorResult("User ID is required for scheduling calls.");
  }

  if (!data.participants || data.participants.length === 0) {
    return errorResult("Please specify who to call. Example: 'Call David and Mike to schedule a meeting'");
  }

  // 1. Look up each participant in prospects
  const participantData: Array<{
    name: string;
    phone: string;
    email: string;
    prospect_id: string;
    status: string;
    availability: any[];
    call_sid: string;
    call_record_id: string;
    error: string;
  }> = [];

  const notFound: string[] = [];
  const noPhone: string[] = [];

  for (const name of data.participants) {
    const query = name.toLowerCase();
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, first_name, last_name, email, phone, mobile, company')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .eq('company_id', companyId)
      .limit(5);

    if (error || !prospects || prospects.length === 0) {
      notFound.push(name);
      continue;
    }

    // Pick best match (prefer exact first name match)
    const match = prospects.find(p =>
      p.first_name?.toLowerCase() === query
    ) || prospects[0];

    const phone = match.phone || match.mobile;
    if (!phone) {
      noPhone.push(`${match.first_name} ${match.last_name}`.trim());
      continue;
    }

    participantData.push({
      name: `${match.first_name} ${match.last_name}`.trim(),
      phone,
      email: match.email || '',
      prospect_id: match.id,
      status: 'pending',
      availability: [],
      call_sid: '',
      call_record_id: '',
      error: '',
    });
  }

  // Handle errors
  if (notFound.length > 0 && participantData.length === 0) {
    return errorResult(
      `I couldn't find any contacts matching: ${notFound.join(', ')}. Can you give me their full name?`
    );
  }

  if (noPhone.length > 0 && participantData.length === 0) {
    return errorResult(
      `${noPhone.join(', ')} ${noPhone.length === 1 ? "doesn't" : "don't"} have a phone number on file. Please add one to their contact.`
    );
  }

  // 2. Check Google Calendar connection
  const calendarConnId = await getConnectionForToolkit(ctx, 'googlecalendar');
  if (!calendarConnId) {
    return errorResult(
      "Google Calendar is not connected. Please connect it first so I can check your availability.",
      "Calendar not connected"
    );
  }

  // 3. Get user's org phone number
  const { data: phoneNumbers } = await supabase
    .from('organization_phone_numbers')
    .select('phone_number')
    .eq('status', 'active')
    .limit(1);

  const fromNumber = phoneNumbers?.[0]?.phone_number;
  if (!fromNumber) {
    return errorResult(
      "You don't have a phone number set up for making calls. Go to Settings to get one."
    );
  }

  // 4. Parse date range
  const dateRange = parseDateRange(data.date_range || 'next week');

  // 5. Create scheduling job
  const { data: job, error: jobError } = await supabase
    .from('scheduling_jobs')
    .insert({
      user_id: userId,
      company_id: companyId,
      status: 'pending',
      meeting_subject: data.meeting_subject || 'Meeting',
      meeting_duration_minutes: data.duration_minutes || 30,
      date_range_start: dateRange.start,
      date_range_end: dateRange.end,
      participants: participantData,
      from_phone_number: fromNumber,
    })
    .select('id')
    .single();

  if (jobError || !job) {
    console.error('[Phone] Failed to create scheduling job:', jobError);
    return errorResult("Failed to start the scheduling process. Please try again.");
  }

  // 6. Fire-and-forget: invoke the scheduling orchestrator
  try {
    fetch(`${SUPABASE_URL}/functions/v1/scheduling-orchestrator?action=start&jobId=${job.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => console.error('[Phone] Orchestrator invoke failed:', err));
  } catch (e) {
    console.error('[Phone] Orchestrator invoke error:', e);
  }

  // 7. Return confirmation to user
  const names = participantData.map(p => p.name);
  const warnings: string[] = [];
  if (notFound.length > 0) warnings.push(`Couldn't find: ${notFound.join(', ')}`);
  if (noPhone.length > 0) warnings.push(`No phone number for: ${noPhone.join(', ')}`);

  const dateStr = new Date(dateRange.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    + ' to '
    + new Date(dateRange.end).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  let msg = `Got it! I'm calling ${names.join(' and ')} now to find a time for "${data.meeting_subject || 'a meeting'}" (${dateStr}). I'll check your calendar and schedule it once I have everyone's availability.`;

  if (warnings.length > 0) {
    msg += `\n\nHeads up: ${warnings.join('. ')}.`;
  }

  return successResult(msg, { job_id: job.id, participants: names });
}

/**
 * Check status of a scheduling job
 */
async function getSchedulingJobStatus(
  ctx: ActionContext,
  data: { job_id?: string },
): Promise<ActionResult> {
  const { supabase, userId } = ctx;

  if (!userId) return errorResult("User ID required.");

  // If no job_id, get the latest one
  let query = supabase
    .from('scheduling_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (data.job_id) {
    query = supabase
      .from('scheduling_jobs')
      .select('*')
      .eq('id', data.job_id)
      .eq('user_id', userId);
  }

  const { data: jobs, error } = await query;
  if (error || !jobs || jobs.length === 0) {
    return errorResult("No scheduling jobs found.");
  }

  const job = jobs[0];
  const participants = job.participants || [];

  const statusMap: Record<string, string> = {
    pending: 'Starting up...',
    checking_calendar: 'Checking your calendar...',
    calling: `Calling ${participants[job.current_participant_index]?.name || 'participant'}...`,
    between_calls: 'Processing availability, preparing next call...',
    finding_slot: 'Finding a time that works for everyone...',
    scheduling: 'Creating the calendar event...',
    completed: 'Meeting scheduled!',
    failed: `Failed: ${job.error_message || 'Unknown error'}`,
    partial: 'Partially completed - some participants unavailable.',
  };

  const participantStatus = participants.map((p: any) => {
    const avail = p.availability?.length
      ? `Available: ${p.availability.map((a: any) => new Date(a.start).toLocaleString()).join(', ')}`
      : p.status === 'completed' ? 'Responded (processing)' : p.status;
    return `- ${p.name}: ${avail}`;
  }).join('\n');

  let msg = `**Scheduling Status:** ${statusMap[job.status] || job.status}\n\n**Participants:**\n${participantStatus}`;

  if (job.selected_slot) {
    const start = new Date(job.selected_slot.start);
    msg += `\n\n**Selected Time:** ${start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (job.calendar_event_link) {
    msg += `\n\n**Calendar Event:** ${job.calendar_event_link}`;
  }

  return successResult(msg, job);
}
