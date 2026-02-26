/**
 * CalendarBookingPage - Public booking page component (Calendly-style)
 *
 * URL format: /book/:username
 * Left panel: user info, meeting details, duration options
 * Right panel: calendar date picker + available time slots / confirmation form
 * Responsive: stacked layout on mobile
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  User,
  Video,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAvailability, DEFAULT_WORKING_HOURS, DEFAULT_BUFFER_MINUTES } from './useAvailability';
import TimeSlotPicker from './TimeSlotPicker';
import BookingConfirmation from './BookingConfirmation';

// ── Date helpers ────────────────────────────────────────────────────

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function isPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target < today;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];

// ── Inline Mini Calendar ────────────────────────────────────────────

function BookingCalendar({ selectedDate, onDateSelect, availability, duration }) {
  const [viewDate, setViewDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Prefetch events when month changes
  useEffect(() => {
    availability.prefetchMonth(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate.getFullYear(), viewDate.getMonth()]);

  // Build 6-week grid
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const gridStart = startOfWeek(monthStart);
    const rows = [];
    let day = gridStart;
    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        days.push(new Date(day));
        day = addDays(day, 1);
      }
      rows.push(days);
    }
    // Drop last row if entirely outside the view month
    const lastRow = rows[5];
    if (lastRow && !isSameMonth(lastRow[0], viewDate)) {
      rows.pop();
    }
    return rows;
  }, [viewDate]);

  const monthLabel = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  return (
    <div className="w-full select-none">
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-zinc-200">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-zinc-500 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const inMonth = isSameMonth(day, viewDate);
            const today = isToday(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const past = isPast(day);
            const isWorkDay = availability.isWorkingDay(day.getDay());
            const disabled = past || !inMonth || !isWorkDay;

            return (
              <button
                key={`${wi}-${di}`}
                onClick={() => !disabled && onDateSelect(day)}
                disabled={disabled}
                className={`
                  relative flex items-center justify-center h-10 w-full rounded-lg text-sm transition-all
                  ${disabled
                    ? 'text-zinc-700 cursor-not-allowed'
                    : today
                    ? 'text-white font-bold'
                    : selected
                    ? 'text-cyan-300 font-medium'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                  }
                  ${today && !selected ? 'bg-cyan-500/20 ring-1 ring-cyan-500/40' : ''}
                  ${selected ? 'bg-cyan-500 text-white font-semibold' : ''}
                `}
              >
                {day.getDate()}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function CalendarBookingPage() {
  const { username } = useParams();

  // State
  const [hostUser, setHostUser] = useState(null);
  const [bookingSettings, setBookingSettings] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userNotFound, setUserNotFound] = useState(false);
  const [duration, setDuration] = useState(30);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Europe/Amsterdam';
    }
  });

  // Parse working hours from booking settings
  const workingHours = useMemo(() => {
    if (!bookingSettings?.working_hours) return DEFAULT_WORKING_HOURS;
    return bookingSettings.working_hours;
  }, [bookingSettings]);

  const bufferMinutes = bookingSettings?.buffer_minutes ?? DEFAULT_BUFFER_MINUTES;

  // Availability hook
  const availability = useAvailability(hostUser?.id, {
    workingHours,
    bufferMinutes,
  });

  // Available durations from settings
  const availableDurations = useMemo(() => {
    if (bookingSettings?.durations?.length) {
      return DURATION_OPTIONS.filter((d) =>
        bookingSettings.durations.includes(d.value)
      );
    }
    return DURATION_OPTIONS;
  }, [bookingSettings]);

  // Fetch host user by username
  useEffect(() => {
    async function fetchHost() {
      if (!username) {
        setUserNotFound(true);
        setLoadingUser(false);
        return;
      }

      try {
        // Look up user by username/slug
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url, company_id, job_title, username')
          .eq('username', username)
          .maybeSingle();

        if (userError) throw userError;

        if (!userData) {
          setUserNotFound(true);
          setLoadingUser(false);
          return;
        }

        setHostUser(userData);

        // Fetch booking settings
        const { data: settings } = await supabase
          .from('booking_settings')
          .select('*')
          .eq('user_id', userData.id)
          .maybeSingle();

        if (settings) {
          // Check if booking is enabled
          if (settings.enabled === false) {
            setUserNotFound(true);
            setLoadingUser(false);
            return;
          }
          setBookingSettings(settings);
          // Set default duration from settings
          if (settings.default_duration) {
            setDuration(settings.default_duration);
          }
        }
      } catch (err) {
        console.error('[CalendarBookingPage] Failed to fetch host:', err);
        setUserNotFound(true);
      } finally {
        setLoadingUser(false);
      }
    }

    fetchHost();
  }, [username]);

  // Compute time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return availability.getAvailableSlots(selectedDate, duration);
  }, [selectedDate, duration, availability.getAvailableSlots]);

  // Handle date selection
  const handleDateSelect = useCallback(
    (date) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      setShowConfirmation(false);

      // Fetch events for this date's range
      const rangeStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const rangeEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      availability.fetchEventsForRange(rangeStart, rangeEnd);
    },
    [availability.fetchEventsForRange]
  );

  // Handle slot selection
  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
    setShowConfirmation(true);
  }, []);

  // Handle back from confirmation
  const handleBackFromConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setSelectedSlot(null);
  }, []);

  // Handle duration change
  const handleDurationChange = useCallback((newDuration) => {
    setDuration(newDuration);
    setSelectedSlot(null);
    setShowConfirmation(false);
  }, []);

  // User initials for avatar fallback
  const initials = useMemo(() => {
    if (!hostUser?.full_name) return '?';
    return hostUser.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [hostUser?.full_name]);

  // ── Loading State ──

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Loading booking page...</p>
        </div>
      </div>
    );
  }

  // ── Not Found State ──

  if (userNotFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-zinc-600" />
          </div>
          <h1 className="text-xl font-semibold text-white">Page not found</h1>
          <p className="text-zinc-400 text-sm">
            This booking page does not exist or has been disabled.
            Check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  // ── Main Page ──

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-4xl"
      >
        {/* Main booking card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* ── Left Panel: Host info & settings ── */}
            <div className="lg:w-[320px] border-b lg:border-b-0 lg:border-r border-zinc-800/60 p-6 lg:p-8 space-y-6">
              {/* Host info */}
              <div className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center gap-3">
                  {hostUser.avatar_url ? (
                    <img
                      src={hostUser.avatar_url}
                      alt={hostUser.full_name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-700/50"
                     loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-zinc-700/50">
                      {initials}
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {hostUser.full_name}
                    </h2>
                    {hostUser.job_title && (
                      <p className="text-xs text-zinc-500">{hostUser.job_title}</p>
                    )}
                  </div>
                </div>

                {/* Meeting title */}
                <div>
                  <h1 className="text-lg font-bold text-white">
                    {bookingSettings?.meeting_title || 'Book a Meeting'}
                  </h1>
                  {bookingSettings?.meeting_description && (
                    <p className="text-sm text-zinc-400 mt-1">
                      {bookingSettings.meeting_description}
                    </p>
                  )}
                </div>
              </div>

              {/* Meeting details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{duration} minutes</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{bookingSettings?.location || 'Video call'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{timezone.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* Duration options */}
              {availableDurations.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Duration
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableDurations.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleDurationChange(opt.value)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                          ${
                            duration === opt.value
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                          }
                        `}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Panel: Calendar + Slots / Confirmation ── */}
            <div className="flex-1 p-6 lg:p-8">
              <AnimatePresence mode="wait">
                {showConfirmation && selectedSlot ? (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BookingConfirmation
                      slot={selectedSlot}
                      duration={duration}
                      hostUser={hostUser}
                      onBack={handleBackFromConfirmation}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Section header */}
                    <h3 className="text-sm font-medium text-zinc-400">
                      Select a date & time
                    </h3>

                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Calendar picker */}
                      <div className="md:flex-1">
                        <BookingCalendar
                          selectedDate={selectedDate}
                          onDateSelect={handleDateSelect}
                          availability={availability}
                          duration={duration}
                        />
                      </div>

                      {/* Time slots */}
                      <div className="md:w-[200px]">
                        {selectedDate ? (
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-zinc-500">
                              {selectedDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <TimeSlotPicker
                              slots={timeSlots}
                              selectedSlot={selectedSlot}
                              onSelectSlot={handleSlotSelect}
                              timezone={timezone}
                              onTimezoneChange={setTimezone}
                              loading={availability.loading}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Calendar className="w-8 h-8 text-zinc-700 mb-3" />
                            <p className="text-sm text-zinc-500">
                              Pick a date to see available times
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-600">
            Powered by iSyncSO
          </p>
        </div>
      </motion.div>
    </div>
  );
}
