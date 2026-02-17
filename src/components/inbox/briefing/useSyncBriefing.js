/**
 * useSyncBriefing - Hook for Sync Morning Briefing
 *
 * Fetches, generates, and configures daily briefings from the sync_briefings table.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

// Default briefing preferences
const DEFAULT_PREFERENCES = {
  time: '08:00',
  sections: {
    schedule: true,
    messages: true,
    tasks: true,
    insights: true,
    preMeeting: true,
  },
  autoGenerate: false,
  notification: 'in-app', // 'push' | 'email' | 'in-app'
};

/**
 * Parse briefing content from DB JSONB into structured briefing object
 */
function parseBriefingContent(row) {
  if (!row) return null;

  const content = row.content || {};

  return {
    id: row.id,
    userId: row.user_id,
    generatedAt: row.generated_at,
    status: row.status,
    schedule: content.schedule || [],
    priorityMessages: content.priorityMessages || [],
    tasksDue: content.tasksDue || [],
    insights: content.insights || [],
    preMeetingContext: content.preMeetingContext || [],
  };
}

export function useSyncBriefing() {
  const { user } = useUser();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [lastBriefingAt, setLastBriefingAt] = useState(null);

  /**
   * Fetch today's briefing for the current user
   */
  const fetchLatestBriefing = useCallback(async (userId) => {
    if (!userId) return null;

    try {
      setLoading(true);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sync_briefings')
        .select('*')
        .eq('user_id', userId)
        .eq('briefing_date', today)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useSyncBriefing] fetchLatestBriefing error:', error);
        return null;
      }

      if (data) {
        const parsed = parseBriefingContent(data);
        setBriefing(parsed);
        setLastBriefingAt(data.generated_at);
        return parsed;
      }

      setBriefing(null);
      return null;
    } catch (err) {
      console.error('[useSyncBriefing] fetchLatestBriefing error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate a new briefing via edge function or local assembly
   */
  const generateBriefing = useCallback(async (userId) => {
    if (!userId) {
      toast.error('No user ID provided');
      return null;
    }

    try {
      setGenerating(true);

      const today = new Date().toISOString().split('T')[0];

      // Mark as generating
      const { data: existing } = await supabase
        .from('sync_briefings')
        .select('id')
        .eq('user_id', userId)
        .eq('briefing_date', today)
        .maybeSingle();

      // Gather briefing data from various sources
      const [scheduleData, messagesData, tasksData] = await Promise.allSettled([
        fetchSchedule(userId),
        fetchPriorityMessages(userId),
        fetchTasksDue(userId),
      ]);

      const schedule = scheduleData.status === 'fulfilled' ? scheduleData.value : [];
      const priorityMessages = messagesData.status === 'fulfilled' ? messagesData.value : [];
      const tasksDue = tasksData.status === 'fulfilled' ? tasksData.value : [];

      // Generate AI insights based on collected data
      const insights = generateInsights(schedule, priorityMessages, tasksDue);
      const preMeetingContext = generatePreMeetingContext(schedule);

      const content = {
        schedule,
        priorityMessages,
        tasksDue,
        insights,
        preMeetingContext,
      };

      let result;

      if (existing?.id) {
        // Update existing briefing
        const { data, error } = await supabase
          .from('sync_briefings')
          .update({
            content,
            generated_at: new Date().toISOString(),
            status: 'generated',
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new briefing
        const { data, error } = await supabase
          .from('sync_briefings')
          .insert({
            user_id: userId,
            company_id: user?.company_id || null,
            briefing_date: today,
            content,
            status: 'generated',
            generated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      const parsed = parseBriefingContent(result);
      setBriefing(parsed);
      setLastBriefingAt(result.generated_at);
      toast.success('Morning briefing generated');
      return parsed;
    } catch (err) {
      console.error('[useSyncBriefing] generateBriefing error:', err);
      toast.error('Failed to generate briefing');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user]);

  /**
   * Save briefing preferences
   */
  const configureBriefing = useCallback(async ({ time, sections, autoGenerate, notification }) => {
    const newPrefs = {
      ...preferences,
      ...(time !== undefined && { time }),
      ...(sections !== undefined && { sections: { ...preferences.sections, ...sections } }),
      ...(autoGenerate !== undefined && { autoGenerate }),
      ...(notification !== undefined && { notification }),
    };

    setPreferences(newPrefs);

    // Persist preferences to user metadata
    if (user?.id) {
      try {
        await supabase
          .from('sync_briefings')
          .upsert(
            {
              user_id: user.id,
              company_id: user.company_id || null,
              briefing_date: '1970-01-01', // Sentinel row for preferences
              content: {},
              metadata: { preferences: newPrefs },
              status: 'generated',
            },
            { onConflict: 'user_id,briefing_date' }
          );

        toast.success('Briefing preferences saved');
      } catch (err) {
        console.error('[useSyncBriefing] configureBriefing error:', err);
      }
    }
  }, [preferences, user]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.id) {
      fetchLatestBriefing(user.id);
      loadPreferences(user.id);
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchLatestBriefing]);

  /**
   * Load saved preferences
   */
  async function loadPreferences(userId) {
    try {
      const { data } = await supabase
        .from('sync_briefings')
        .select('metadata')
        .eq('user_id', userId)
        .eq('briefing_date', '1970-01-01')
        .maybeSingle();

      if (data?.metadata?.preferences) {
        setPreferences((prev) => ({ ...prev, ...data.metadata.preferences }));
      }
    } catch {
      // Silently fail - use defaults
    }
  }

  return {
    briefing,
    loading,
    generating,
    preferences,
    lastBriefingAt,
    fetchLatestBriefing,
    generateBriefing,
    configureBriefing,
  };
}

// --- Data fetching helpers ---

async function fetchSchedule(userId) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, start_time, end_time, attendees, location, description')
      .eq('user_id', userId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time', { ascending: true });

    return (data || []).map((ev) => ({
      title: ev.title,
      time: new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: ev.end_time
        ? new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : null,
      attendees: ev.attendees || [],
      location: ev.location || null,
    }));
  } catch {
    return [];
  }
}

async function fetchPriorityMessages(userId) {
  try {
    // Get recent unread messages from channels the user is in
    const { data: channels } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userId);

    if (!channels?.length) return [];

    const channelIds = channels.map((c) => c.channel_id);

    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, channel_id, sender_id, created_at, channels(name)')
      .in('channel_id', channelIds)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages?.length) return [];

    // Fetch sender names
    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    const { data: senders } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', senderIds);

    const senderMap = {};
    (senders || []).forEach((s) => {
      senderMap[s.id] = s.full_name;
    });

    return messages.slice(0, 5).map((msg) => ({
      channel: msg.channels?.name || 'Direct Message',
      sender: senderMap[msg.sender_id] || 'Unknown',
      preview: (msg.content || '').substring(0, 120),
      urgency: detectUrgency(msg.content),
    }));
  } catch {
    return [];
  }
}

async function fetchTasksDue(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, project_id, projects(name)')
      .eq('assigned_to', userId)
      .neq('status', 'completed')
      .lte('due_date', today + 'T23:59:59')
      .order('due_date', { ascending: true })
      .limit(10);

    return (data || []).map((task) => ({
      title: task.title,
      dueAt: task.due_date,
      priority: task.priority || 'medium',
      project: task.projects?.name || null,
      overdue: new Date(task.due_date) < new Date(today),
    }));
  } catch {
    return [];
  }
}

// --- Intelligence helpers ---

function detectUrgency(content) {
  if (!content) return 'normal';
  const lower = content.toLowerCase();
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical')) return 'high';
  if (lower.includes('important') || lower.includes('priority') || lower.includes('deadline')) return 'medium';
  return 'normal';
}

function generateInsights(schedule, messages, tasks) {
  const insights = [];

  if (schedule.length > 4) {
    insights.push({
      type: 'warning',
      text: `Heavy meeting day ahead: ${schedule.length} meetings scheduled. Consider blocking focus time.`,
      actionable: true,
    });
  }

  if (schedule.length === 0) {
    insights.push({
      type: 'positive',
      text: 'No meetings today. Great time for deep work and tackling those pending tasks.',
      actionable: false,
    });
  }

  const highUrgency = messages.filter((m) => m.urgency === 'high');
  if (highUrgency.length > 0) {
    insights.push({
      type: 'alert',
      text: `${highUrgency.length} urgent message${highUrgency.length > 1 ? 's' : ''} need your attention.`,
      actionable: true,
    });
  }

  const overdueTasks = tasks.filter((t) => t.overdue);
  if (overdueTasks.length > 0) {
    insights.push({
      type: 'warning',
      text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} require immediate action.`,
      actionable: true,
    });
  }

  if (tasks.length > 0 && tasks.length <= 3) {
    insights.push({
      type: 'positive',
      text: `Manageable workload: ${tasks.length} task${tasks.length > 1 ? 's' : ''} due today. You've got this.`,
      actionable: false,
    });
  }

  return insights;
}

function generatePreMeetingContext(schedule) {
  return schedule.slice(0, 3).map((meeting) => ({
    meetingTitle: meeting.title,
    attendeeInsights: meeting.attendees?.length
      ? `${meeting.attendees.length} attendee${meeting.attendees.length > 1 ? 's' : ''}`
      : 'No attendees listed',
    openItems: [],
  }));
}

export default useSyncBriefing;
