/**
 * useWrapUpActions Hook
 * Handles one-click execution of wrap-up action items and follow-ups:
 *   - Create tasks (via ActionLog)
 *   - Add calendar events (via Composio Google Calendar / Outlook Calendar)
 *   - Send emails (via Composio Gmail / Outlook)
 *   - Approve All for batch execution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useComposio } from '@/hooks/useComposio';
import { ToolHelpers } from '@/lib/composio';
import db from '@/api/supabaseClient';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert human-readable due hints to ISO date strings.
 * Falls back to +7 days from today.
 */
function parseDueHint(hint) {
  if (!hint) return null;

  const now = new Date();
  const lower = hint.toLowerCase().trim();

  if (lower.includes('today')) {
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('tomorrow')) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('friday')) {
    const day = now.getDay();
    const diff = (5 - day + 7) % 7 || 7; // next Friday
    now.setDate(now.getDate() + diff);
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('monday')) {
    const day = now.getDay();
    const diff = (1 - day + 7) % 7 || 7;
    now.setDate(now.getDate() + diff);
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('next week')) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('end of week')) {
    const day = now.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    now.setDate(now.getDate() + diff);
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('end of month')) {
    now.setMonth(now.getMonth() + 1, 0);
    return now.toISOString().slice(0, 10);
  }
  if (lower.includes('2 weeks') || lower.includes('two weeks')) {
    now.setDate(now.getDate() + 14);
    return now.toISOString().slice(0, 10);
  }

  // Default: 7 days from now
  now.setDate(now.getDate() + 7);
  return now.toISOString().slice(0, 10);
}

/**
 * Build a reasonable start/end datetime for a meeting from meeting_details.
 * Returns { start: ISO string, end: ISO string }.
 */
function buildMeetingTimes(details) {
  const now = new Date();
  const duration = details?.duration_minutes || 30;
  const timeframe = (details?.suggested_timeframe || '').toLowerCase();

  // Default: tomorrow at 10:00 AM
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);

  if (timeframe.includes('next week')) {
    start.setDate(start.getDate() + 7);
  } else if (timeframe.includes('today')) {
    start.setDate(now.getDate());
    start.setHours(Math.max(now.getHours() + 1, 10), 0, 0, 0);
  }

  const end = new Date(start.getTime() + duration * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWrapUpActions(userId, callTitle, participants) {
  const composio = useComposio();

  // Per-item status: { [itemKey]: { status: 'idle'|'executing'|'done'|'error', error?: string } }
  const [actionStates, setActionStates] = useState({});

  // Connection availability
  const [hasEmailConnection, setHasEmailConnection] = useState(false);
  const [hasCalendarConnection, setHasCalendarConnection] = useState(false);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);

  // Track which email/calendar provider is available
  const emailProvider = useRef(null); // 'gmail' | 'outlook'
  const calendarProvider = useRef(null); // 'googlecalendar' | 'outlook'
  const emailConnectionId = useRef(null);
  const calendarConnectionId = useRef(null);

  // Check Composio connections on mount
  useEffect(() => {
    if (!userId) {
      setConnectionsLoaded(true);
      return;
    }

    let cancelled = false;

    async function checkConnections() {
      try {
        const integrations = await composio.getLocalIntegrations(userId);
        const active = (integrations || []).filter((i) => i.status === 'ACTIVE');

        // Email: prefer Gmail, fallback Outlook
        const gmail = active.find((i) => i.toolkit_slug === 'gmail');
        const outlook = active.find((i) => i.toolkit_slug === 'outlook');
        if (gmail) {
          emailProvider.current = 'gmail';
          emailConnectionId.current = gmail.composio_connected_account_id;
        } else if (outlook) {
          emailProvider.current = 'outlook';
          emailConnectionId.current = outlook.composio_connected_account_id;
        }

        // Calendar: prefer Google Calendar, fallback Outlook
        const gcal = active.find((i) => i.toolkit_slug === 'googlecalendar');
        if (gcal) {
          calendarProvider.current = 'googlecalendar';
          calendarConnectionId.current = gcal.composio_connected_account_id;
        } else if (outlook) {
          calendarProvider.current = 'outlook';
          calendarConnectionId.current = outlook.composio_connected_account_id;
        }

        if (!cancelled) {
          setHasEmailConnection(!!(gmail || outlook));
          setHasCalendarConnection(!!(gcal || outlook));
          setConnectionsLoaded(true);
        }
      } catch (err) {
        console.error('[useWrapUpActions] Failed to check connections:', err);
        if (!cancelled) setConnectionsLoaded(true);
      }
    }

    checkConnections();
    return () => { cancelled = true; };
  }, [userId]);

  // --- State helpers ---
  const setItemState = useCallback((key, state) => {
    setActionStates((prev) => ({ ...prev, [key]: state }));
  }, []);

  // --- Task creation ---
  const executeCreateTask = useCallback(async (itemKey, taskData) => {
    setItemState(itemKey, { status: 'executing' });
    try {
      await db.entities.ActionLog.create({
        action_type: 'task',
        title: taskData.text || taskData.title,
        action_description: taskData.text || taskData.title,
        description: `From call: ${callTitle || 'Video Call'}`,
        notes: `From call: ${callTitle || 'Video Call'}`,
        status: 'queued',
        priority: taskData.priority || 'medium',
        due_date: parseDueHint(taskData.due_hint) || null,
        assigned_to: taskData.assignee !== 'Unassigned' ? taskData.assignee : null,
        user_id: userId,
        tags: ['call-wrapup'],
      });
      setItemState(itemKey, { status: 'done' });
      toast.success(`Task created: ${(taskData.text || taskData.title || '').slice(0, 40)}...`);
    } catch (err) {
      console.error('[useWrapUpActions] Task creation failed:', err);
      setItemState(itemKey, { status: 'error', error: err.message });
      toast.error('Failed to create task');
    }
  }, [userId, callTitle, setItemState]);

  // --- Calendar event ---
  const executeAddToCalendar = useCallback(async (itemKey, details) => {
    if (!calendarConnectionId.current) {
      toast.error('No calendar connected. Go to Settings > Integrations.');
      return;
    }

    setItemState(itemKey, { status: 'executing' });
    try {
      const times = buildMeetingTimes(details);
      const title = details?.title || 'Follow-up Meeting';
      const attendees = details?.suggested_attendees || [];

      let toolConfig;
      if (calendarProvider.current === 'googlecalendar') {
        toolConfig = ToolHelpers.googleCalendar.createEvent(
          title, times.start, times.end, attendees
        );
      } else {
        toolConfig = ToolHelpers.outlookCalendar.createEvent(
          title, times.start, times.end, attendees
        );
      }

      await composio.executeTool(toolConfig.toolSlug, {
        connectedAccountId: calendarConnectionId.current,
        arguments: toolConfig.arguments,
      });

      setItemState(itemKey, { status: 'done' });
      toast.success(`Calendar event created: ${title}`);
    } catch (err) {
      console.error('[useWrapUpActions] Calendar creation failed:', err);
      setItemState(itemKey, { status: 'error', error: err.message });
      toast.error('Failed to create calendar event');
    }
  }, [composio, setItemState]);

  // --- Send email ---
  const executeSendEmail = useCallback(async (itemKey, details) => {
    if (!emailConnectionId.current) {
      toast.error('No email connected. Go to Settings > Integrations.');
      return;
    }

    setItemState(itemKey, { status: 'executing' });
    try {
      const to = details?.to || '';
      const subject = details?.subject || `Follow-up: ${callTitle || 'Call'}`;
      const body = details?.body_hint || 'Please see the follow-up from our recent call.';

      if (!to) {
        throw new Error('No recipient email specified');
      }

      let toolConfig;
      if (emailProvider.current === 'gmail') {
        toolConfig = ToolHelpers.gmail.sendEmail(to, subject, body);
      } else {
        toolConfig = ToolHelpers.outlook.sendEmail(to, subject, body);
      }

      await composio.executeTool(toolConfig.toolSlug, {
        connectedAccountId: emailConnectionId.current,
        arguments: toolConfig.arguments,
      });

      setItemState(itemKey, { status: 'done' });
      toast.success(`Email sent to ${to}`);
    } catch (err) {
      console.error('[useWrapUpActions] Email send failed:', err);
      setItemState(itemKey, { status: 'error', error: err.message });
      toast.error(`Failed to send email: ${err.message}`);
    }
  }, [composio, callTitle, setItemState]);

  // --- Approve All ---
  const executeApproveAll = useCallback(async (actionItems, followUps) => {
    const allItems = [];

    // Queue action items as tasks
    (actionItems || []).forEach((item, i) => {
      const key = `action-${i}`;
      if (actionStates[key]?.status === 'done') return; // skip already done
      allItems.push({ key, type: 'task', data: item });
    });

    // Queue follow-ups based on execution_type
    (followUps || []).forEach((item, i) => {
      const key = `followup-${i}`;
      if (actionStates[key]?.status === 'done') return;

      const execType = item.execution_type || inferExecutionType(item.type);

      if (execType === 'auto_email' && hasEmailConnection && item.email_details?.to) {
        allItems.push({ key, type: 'email', data: item.email_details });
      } else if (execType === 'auto_calendar' && hasCalendarConnection) {
        allItems.push({ key, type: 'calendar', data: item.meeting_details || { title: item.text } });
      } else {
        // Fallback: create as task
        allItems.push({ key, type: 'task', data: { text: item.text, priority: 'medium' } });
      }
    });

    // Execute sequentially with small delay to avoid rate limits
    for (const entry of allItems) {
      try {
        if (entry.type === 'task') {
          await executeCreateTask(entry.key, entry.data);
        } else if (entry.type === 'calendar') {
          await executeAddToCalendar(entry.key, entry.data);
        } else if (entry.type === 'email') {
          await executeSendEmail(entry.key, entry.data);
        }
      } catch {
        // Individual errors already handled inside each executor
      }
      // Small delay between items
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [actionStates, hasEmailConnection, hasCalendarConnection, executeCreateTask, executeAddToCalendar, executeSendEmail]);

  return {
    actionStates,
    hasEmailConnection,
    hasCalendarConnection,
    connectionsLoaded,
    executeCreateTask,
    executeAddToCalendar,
    executeSendEmail,
    executeApproveAll,
  };
}

/**
 * Infer execution_type for older responses that don't include it.
 */
function inferExecutionType(followUpType) {
  switch (followUpType) {
    case 'email': return 'auto_email';
    case 'meeting': return 'auto_calendar';
    case 'task': return 'auto_task';
    case 'update':
    default: return 'manual_task';
  }
}

export default useWrapUpActions;
