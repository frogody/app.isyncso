/**
 * useCalendar - Calendar event CRUD hook
 *
 * Manages calendar events with Supabase, including attendees and reminders.
 * Provides navigation helpers and view state for week/day/month/agenda views.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

// Color map for event types
export const EVENT_COLORS = {
  meeting: '#06b6d4',
  call: '#8b5cf6',
  reminder: '#f59e0b',
  task: '#10b981',
  external: '#f97316',
  personal: '#ec4899',
};

// Available event types
export const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting', color: EVENT_COLORS.meeting },
  { value: 'call', label: 'Call', color: EVENT_COLORS.call },
  { value: 'reminder', label: 'Reminder', color: EVENT_COLORS.reminder },
  { value: 'task', label: 'Task', color: EVENT_COLORS.task },
  { value: 'external', label: 'External', color: EVENT_COLORS.external },
  { value: 'personal', label: 'Personal', color: EVENT_COLORS.personal },
];

// Preset color options for custom event colors
export const PRESET_COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981',
  '#f97316', '#ec4899', '#ef4444', '#3b82f6',
  '#14b8a6', '#a855f7', '#f43f5e', '#6366f1',
];

// Reminder presets (minutes before event)
export const REMINDER_PRESETS = [
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

/**
 * Compute the visible date range based on the current date and view,
 * with buffer days for smooth scrolling.
 */
function getDateRange(currentDate, view) {
  const start = new Date(currentDate);
  const end = new Date(currentDate);

  switch (view) {
    case 'day':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() + 1);
      break;
    case 'week':
      // Start of week (Monday)
      const dayOfWeek = start.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(start.getDate() + mondayOffset - 7); // buffer: 1 week before
      end.setDate(start.getDate() + 27); // ~4 weeks total
      break;
    case 'month':
      start.setDate(1);
      start.setDate(start.getDate() - 7); // buffer: 1 week before month start
      end.setMonth(end.getMonth() + 1, 0); // last day of month
      end.setDate(end.getDate() + 7); // buffer: 1 week after month end
      break;
    case 'agenda':
      // Show 30 days ahead
      end.setDate(end.getDate() + 30);
      break;
    default:
      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() + 7);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function useCalendar(userId, companyId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');

  // Compute date range from current date + view
  const dateRange = useMemo(
    () => getDateRange(currentDate, view),
    [currentDate.toISOString(), view]
  );

  // Fetch events for a given date range
  const fetchEvents = useCallback(async (startDate, endDate) => {
    if (!userId) return;

    setLoading(true);
    try {
      // Query events that overlap with the range:
      // event starts before range ends AND event ends after range starts
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          calendar_attendees (*),
          calendar_reminders (*)
        `)
        .eq('company_id', companyId)
        .lte('start_time', endDate.toISOString())
        .gte('end_time', startDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Normalize: add .start/.end aliases for components that expect them
      const normalized = (data || []).map((ev) => ({
        ...ev,
        start: ev.start_time,
        end: ev.end_time,
        type: ev.event_type,
        attendees: ev.calendar_attendees || ev.attendees || [],
      }));
      setEvents(normalized);
    } catch (error) {
      console.error('[useCalendar] Failed to fetch events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [userId, companyId]);

  // Refetch when date range changes
  useEffect(() => {
    fetchEvents(dateRange.start, dateRange.end);
  }, [dateRange.start.getTime(), dateRange.end.getTime(), fetchEvents]);

  // Refetch helper
  const refetch = useCallback(() => {
    fetchEvents(dateRange.start, dateRange.end);
  }, [fetchEvents, dateRange]);

  // Create event with attendees, reminders, and optional recurrence
  const createEvent = useCallback(async ({
    title,
    description,
    event_type = 'meeting',
    start_time,
    end_time,
    all_day = false,
    location,
    color,
    attendees = [],
    reminders = [],
    video_call,
    recurrence_rule = null,
    recurrence_end = null,
    recurrence_parent_id = null,
    metadata = {},
  }) => {
    if (!userId || !companyId) throw new Error('Not authenticated');

    try {
      const eventData = {
        company_id: companyId,
        created_by: userId,
        title,
        description: description || null,
        event_type,
        start_time: new Date(start_time).toISOString(),
        end_time: new Date(end_time).toISOString(),
        all_day,
        location: location || null,
        color: color || EVENT_COLORS[event_type] || EVENT_COLORS.meeting,
        status: 'confirmed',
        metadata: {
          ...metadata,
          ...(recurrence_rule ? { recurrence_rule, recurrence_end, recurrence_parent_id } : {}),
        },
      };

      const { data: newEvent, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      // Insert attendees
      if (attendees.length > 0) {
        const attendeeRows = attendees.map((att) => ({
          event_id: newEvent.id,
          user_id: att.user_id || null,
          email: att.email || null,
          name: att.name || null,
          response_status: 'pending',
          is_organizer: att.user_id === userId,
        }));

        const { error: attError } = await supabase
          .from('calendar_attendees')
          .insert(attendeeRows);

        if (attError) {
          console.error('[useCalendar] Failed to add attendees:', attError);
        }
      }

      // Insert reminders
      if (reminders.length > 0) {
        const reminderRows = reminders.map((minutesBefore) => ({
          event_id: newEvent.id,
          user_id: userId,
          remind_at: new Date(
            new Date(start_time).getTime() - minutesBefore * 60 * 1000
          ).toISOString(),
          reminder_type: 'notification',
          sent: false,
        }));

        const { error: remError } = await supabase
          .from('calendar_reminders')
          .insert(reminderRows);

        if (remError) {
          console.error('[useCalendar] Failed to add reminders:', remError);
        }
      }

      // Optimistic update
      setEvents((prev) => [...prev, newEvent].sort(
        (a, b) => new Date(a.start_time) - new Date(b.start_time)
      ));

      toast.success('Event created');
      refetch();
      return newEvent;
    } catch (error) {
      console.error('[useCalendar] Failed to create event:', error);
      toast.error('Failed to create event');
      throw error;
    }
  }, [userId, companyId, refetch]);

  // Update event (partial update)
  const updateEvent = useCallback(async (eventId, updates) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, ...data } : e))
      );

      // Handle attendees update if provided
      if (updates.attendees) {
        // Remove existing attendees and re-insert
        await supabase
          .from('calendar_attendees')
          .delete()
          .eq('event_id', eventId);

        if (updates.attendees.length > 0) {
          const attendeeRows = updates.attendees.map((att) => ({
            event_id: eventId,
            user_id: att.user_id || null,
            email: att.email || null,
            name: att.name || null,
            response_status: att.response_status || 'pending',
            is_organizer: att.is_organizer || false,
          }));

          await supabase.from('calendar_attendees').insert(attendeeRows);
        }
      }

      // Handle reminders update if provided
      if (updates.reminders) {
        await supabase
          .from('calendar_reminders')
          .delete()
          .eq('event_id', eventId);

        if (updates.reminders.length > 0) {
          const startTime = updates.start_time || data.start_time;
          const reminderRows = updates.reminders.map((minutesBefore) => ({
            event_id: eventId,
            user_id: userId,
            remind_at: new Date(
              new Date(startTime).getTime() - minutesBefore * 60 * 1000
            ).toISOString(),
            reminder_type: 'notification',
            sent: false,
          }));

          await supabase.from('calendar_reminders').insert(reminderRows);
        }
      }

      toast.success('Event updated');
      refetch();
      return data;
    } catch (error) {
      console.error('[useCalendar] Failed to update event:', error);
      toast.error('Failed to update event');
      throw error;
    }
  }, [userId, refetch]);

  // Delete event
  const deleteEvent = useCallback(async (eventId) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Optimistic update
      setEvents((prev) => prev.filter((e) => e.id !== eventId));

      toast.success('Event deleted');
    } catch (error) {
      console.error('[useCalendar] Failed to delete event:', error);
      toast.error('Failed to delete event');
      throw error;
    }
  }, []);

  // Move event (drag/drop reschedule)
  const moveEvent = useCallback(async (eventId, newStart, newEnd) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          start_time: new Date(newStart).toISOString(),
          end_time: new Date(newEnd).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, ...data } : e))
      );

      toast.success('Event rescheduled');
      return data;
    } catch (error) {
      console.error('[useCalendar] Failed to move event:', error);
      toast.error('Failed to reschedule event');
      throw error;
    }
  }, []);

  // Filter loaded events for a specific date
  const getEventsForDate = useCallback((date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const nextDay = new Date(target);
    nextDay.setDate(nextDay.getDate() + 1);

    return events.filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart < nextDay && eventEnd > target;
    });
  }, [events]);

  // Filter loaded events for a date range
  const getEventsForRange = useCallback((start, end) => {
    const rangeStart = new Date(start);
    const rangeEnd = new Date(end);

    return events.filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart < rangeEnd && eventEnd > rangeStart;
    });
  }, [events]);

  // Navigation: go to today
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Navigation: go forward based on view
  const goForward = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      switch (view) {
        case 'day':
          next.setDate(next.getDate() + 1);
          break;
        case 'week':
          next.setDate(next.getDate() + 7);
          break;
        case 'month':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'agenda':
          next.setDate(next.getDate() + 7);
          break;
        default:
          next.setDate(next.getDate() + 7);
      }
      return next;
    });
  }, [view]);

  // Navigation: go back based on view
  const goBack = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      switch (view) {
        case 'day':
          next.setDate(next.getDate() - 1);
          break;
        case 'week':
          next.setDate(next.getDate() - 7);
          break;
        case 'month':
          next.setMonth(next.getMonth() - 1);
          break;
        case 'agenda':
          next.setDate(next.getDate() - 7);
          break;
        default:
          next.setDate(next.getDate() - 7);
      }
      return next;
    });
  }, [view]);

  return {
    events,
    loading,
    currentDate,
    setCurrentDate,
    view,
    setView,
    dateRange,
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,
    getEventsForDate,
    getEventsForRange,
    goToToday,
    goForward,
    goBack,
    refetch,
  };
}

export default useCalendar;
