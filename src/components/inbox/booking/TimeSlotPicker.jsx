/**
 * TimeSlotPicker - Grid of available time slots for a selected date
 *
 * Displays time slots in rows, highlights the selected slot in cyan,
 * grays out unavailable slots, and shows timezone information.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Globe } from 'lucide-react';

// Detect user timezone
function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// Format timezone for display: "Europe/Amsterdam" -> "Europe/Amsterdam (CET)"
function formatTimezone(tz) {
  try {
    const now = new Date();
    const short = now.toLocaleTimeString('en-US', { timeZone: tz, timeZoneName: 'short' });
    const abbr = short.split(' ').pop();
    return `${tz.replace(/_/g, ' ')} (${abbr})`;
  } catch {
    return tz;
  }
}

const COMMON_TIMEZONES = [
  'Europe/Amsterdam',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export default function TimeSlotPicker({
  slots = [],
  selectedSlot,
  onSelectSlot,
  timezone,
  onTimezoneChange,
  loading = false,
}) {
  const currentTimezone = timezone || getUserTimezone();

  const availableSlots = useMemo(
    () => slots.filter((s) => s.available),
    [slots]
  );

  const unavailableSlots = useMemo(
    () => slots.filter((s) => !s.available),
    [slots]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          <span>Loading available times...</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-zinc-800/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-8 h-8 text-zinc-600 mb-2" />
        <p className="text-zinc-400 text-sm">No time slots for this date</p>
        <p className="text-zinc-500 text-xs mt-1">
          This day may be outside working hours
        </p>
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-8 h-8 text-zinc-600 mb-2" />
        <p className="text-zinc-400 text-sm">No available slots</p>
        <p className="text-zinc-500 text-xs mt-1">
          All times are booked for this date. Try another day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timezone selector */}
      <div className="flex items-center gap-2">
        <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        <select
          value={currentTimezone}
          onChange={(e) => onTimezoneChange?.(e.target.value)}
          className="flex-1 text-xs bg-transparent border-none text-zinc-400 focus:outline-none cursor-pointer appearance-none hover:text-zinc-300 transition-colors"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} className="bg-zinc-900 text-zinc-300">
              {formatTimezone(tz)}
            </option>
          ))}
        </select>
      </div>

      {/* Available slots grid */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Available ({availableSlots.length})
        </p>
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout">
            {availableSlots.map((slot, index) => {
              const isSelected =
                selectedSlot &&
                slot.start.getTime() === selectedSlot.start.getTime();

              return (
                <motion.button
                  key={slot.time}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02, duration: 0.15 }}
                  onClick={() => onSelectSlot(slot)}
                  className={`
                    relative px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150 border
                    ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/30'
                        : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300 hover:bg-zinc-800/70 hover:border-zinc-600/60 hover:text-white'
                    }
                  `}
                >
                  {slot.time}
                  {isSelected && (
                    <motion.div
                      layoutId="slot-indicator"
                      className="absolute inset-0 rounded-lg ring-2 ring-cyan-400/40"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
