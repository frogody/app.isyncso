/**
 * useAvailability - Real-time user availability hook
 *
 * Provides slot generation based on working hours configuration,
 * checks existing calendar_events for conflicts, and supports
 * buffer time between meetings.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';

// Default working hours: Mon-Fri, 9:00-17:00
const DEFAULT_WORKING_HOURS = {
  0: null, // Sunday - off
  1: { start: '09:00', end: '17:00' }, // Monday
  2: { start: '09:00', end: '17:00' }, // Tuesday
  3: { start: '09:00', end: '17:00' }, // Wednesday
  4: { start: '09:00', end: '17:00' }, // Thursday
  5: { start: '09:00', end: '17:00' }, // Friday
  6: null, // Saturday - off
};

const DEFAULT_BUFFER_MINUTES = 15;
const SLOT_INCREMENT_MINUTES = 30;

/**
 * Parse a time string "HH:MM" into { hours, minutes }
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Check if two time ranges overlap.
 * Range A: [startA, endA), Range B: [startB, endB)
 */
function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Generate all possible time slots for a given date based on working hours
 * and duration, then filter out slots that conflict with existing events.
 */
function generateSlots(date, workingHours, duration, bufferMinutes, existingEvents) {
  const dayOfWeek = date.getDay();
  const hours = workingHours[dayOfWeek];

  // Day is off
  if (!hours) return [];

  const { hours: startH, minutes: startM } = parseTime(hours.start);
  const { hours: endH, minutes: endM } = parseTime(hours.end);

  const dayStart = new Date(date);
  dayStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  const slots = [];
  let cursor = new Date(dayStart);

  while (cursor.getTime() + duration * 60 * 1000 <= dayEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + duration * 60 * 1000);

    // Check for conflicts with existing events (including buffer)
    const bufferedStart = new Date(slotStart.getTime() - bufferMinutes * 60 * 1000);
    const bufferedEnd = new Date(slotEnd.getTime() + bufferMinutes * 60 * 1000);

    const hasConflict = existingEvents.some((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return rangesOverlap(
        bufferedStart.getTime(),
        bufferedEnd.getTime(),
        eventStart.getTime(),
        eventEnd.getTime()
      );
    });

    // Skip past slots (cannot book in the past)
    const now = new Date();
    const isPast = slotStart.getTime() <= now.getTime();

    slots.push({
      start: slotStart,
      end: slotEnd,
      available: !hasConflict && !isPast,
      time: slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    });

    // Advance cursor by the increment
    cursor = new Date(cursor.getTime() + SLOT_INCREMENT_MINUTES * 60 * 1000);
  }

  return slots;
}

/**
 * useAvailability hook
 *
 * @param {string} userId - The user whose availability to check
 * @param {Object} options - Configuration options
 * @param {Object} options.workingHours - Custom working hours map (day -> {start, end} | null)
 * @param {number} options.bufferMinutes - Buffer time between meetings in minutes
 */
export function useAvailability(userId, options = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedRange, setFetchedRange] = useState(null);

  const workingHours = options.workingHours || DEFAULT_WORKING_HOURS;
  const bufferMinutes = options.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;

  /**
   * Fetch existing calendar events for a date range
   */
  const fetchEventsForRange = useCallback(
    async (startDate, endDate) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const rangeStart = new Date(startDate);
        rangeStart.setHours(0, 0, 0, 0);

        const rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        const { data, error: fetchError } = await supabase
          .from('calendar_events')
          .select('id, title, start_time, end_time, status')
          .eq('created_by', userId)
          .neq('status', 'cancelled')
          .lte('start_time', rangeEnd.toISOString())
          .gte('end_time', rangeStart.toISOString())
          .order('start_time', { ascending: true });

        if (fetchError) throw fetchError;

        setEvents(data || []);
        setFetchedRange({ start: rangeStart, end: rangeEnd });
      } catch (err) {
        console.error('[useAvailability] Failed to fetch events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Get available time slots for a specific date and duration
   */
  const getAvailableSlots = useCallback(
    (date, duration = 30) => {
      return generateSlots(date, workingHours, duration, bufferMinutes, events);
    },
    [workingHours, bufferMinutes, events]
  );

  /**
   * Check if a specific date has any available slots
   */
  const hasAvailableSlots = useCallback(
    (date, duration = 30) => {
      const slots = generateSlots(date, workingHours, duration, bufferMinutes, events);
      return slots.some((slot) => slot.available);
    },
    [workingHours, bufferMinutes, events]
  );

  /**
   * Get working hours for a specific day
   */
  const getWorkingHoursForDay = useCallback(
    (dayOfWeek) => {
      return workingHours[dayOfWeek] || null;
    },
    [workingHours]
  );

  /**
   * Check if a specific day is a working day
   */
  const isWorkingDay = useCallback(
    (dayOfWeek) => {
      return workingHours[dayOfWeek] !== null && workingHours[dayOfWeek] !== undefined;
    },
    [workingHours]
  );

  /**
   * Prefetch events for the current month view (used by the calendar picker)
   */
  const prefetchMonth = useCallback(
    (year, month) => {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      fetchEventsForRange(start, end);
    },
    [fetchEventsForRange]
  );

  return {
    events,
    loading,
    error,
    fetchedRange,
    fetchEventsForRange,
    getAvailableSlots,
    hasAvailableSlots,
    getWorkingHoursForDay,
    isWorkingDay,
    prefetchMonth,
  };
}

export {
  DEFAULT_WORKING_HOURS,
  DEFAULT_BUFFER_MINUTES,
  SLOT_INCREMENT_MINUTES,
};

export default useAvailability;
