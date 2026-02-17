import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

// ── Date helpers ──────────────────────────────────────────────────
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

function isToday(date) {
  return isSameDay(date, new Date());
}

function isTomorrow(date) {
  return isSameDay(date, addDays(new Date(), 1));
}

function formatTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDayHeader(date) {
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);

  if (isToday(date)) return `Today - ${dayName}, ${monthDay}`;
  if (isTomorrow(date)) return `Tomorrow - ${dayName}, ${monthDay}`;
  return `${dayName}, ${monthDay}`;
}

// ── Constants ─────────────────────────────────────────────────────
const LOOKAHEAD_DAYS = 14;

// Event type badge colors
const TYPE_COLORS = {
  meeting: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  call: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  task: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  reminder: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  event: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  deadline: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// Color dots for events
const DOT_COLORS = [
  'bg-cyan-400',
  'bg-blue-400',
  'bg-violet-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-emerald-400',
  'bg-orange-400',
  'bg-pink-400',
];

function getDotColor(event, index) {
  if (event.color) {
    // If it's a tailwind class already, use it
    if (event.color.startsWith('bg-')) return event.color;
    // If it's a hex, we'll just pick from palette
  }
  return DOT_COLORS[index % DOT_COLORS.length];
}

function getTypeBadge(type) {
  if (!type) return null;
  const normalized = type.toLowerCase();
  return TYPE_COLORS[normalized] || 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30';
}

// ── Sub-components ────────────────────────────────────────────────

const EventRow = memo(function EventRow({ event, index, onEventClick }) {
  const startDate = event.start instanceof Date ? event.start : new Date(event.start);
  const endDate = event.end instanceof Date ? event.end : event.end ? new Date(event.end) : null;

  const startTime = formatTime(startDate);
  const endTime = endDate ? formatTime(endDate) : null;
  const timeRange =
    startTime && endTime ? `${startTime} - ${endTime}` : startTime || 'All day';

  const dotColor = getDotColor(event, index);
  const typeBadgeClass = event.type ? getTypeBadge(event.type) : null;
  const attendeeCount =
    event.attendees?.length || event.attendee_count || event.attendeesCount || 0;

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      onClick={() => onEventClick(event)}
      className="w-full flex items-start gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/40 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-all cursor-pointer text-left group"
    >
      {/* Color dot */}
      <div className="pt-1 shrink-0">
        <span className={`block w-2.5 h-2.5 rounded-full ${dotColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Title */}
            <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
              {event.title || 'Untitled Event'}
            </p>

            {/* Time */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-[12px] text-zinc-400">{timeRange}</span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="text-[12px] text-zinc-500 truncate">
                  {event.location}
                </span>
              </div>
            )}
          </div>

          {/* Right side: badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {attendeeCount > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Users className="w-3 h-3" />
                <span>{attendeeCount}</span>
              </div>
            )}
            {typeBadgeClass && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${typeBadgeClass}`}
              >
                {event.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
});

const DateGroup = memo(function DateGroup({ date, events, onEventClick }) {
  const label = formatDayHeader(date);
  const today = isToday(date);

  return (
    <div>
      {/* Date header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className={`text-[13px] font-semibold ${
            today ? 'text-cyan-400' : 'text-zinc-300'
          }`}
        >
          {label}
        </span>
        <div className="flex-1 h-px bg-zinc-800/50" />
      </div>

      {/* Event list */}
      <div className="space-y-1.5">
        {events.map((event, i) => (
          <EventRow
            key={event.id || i}
            event={event}
            index={i}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
});

// ── Empty State ───────────────────────────────────────────────────

const EmptyState = memo(function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
        <Calendar className="w-7 h-7 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-400 mb-1">No upcoming events</p>
      <p className="text-[12px] text-zinc-600 text-center max-w-[240px]">
        Events for the next {LOOKAHEAD_DAYS} days will appear here when you create them.
      </p>
    </motion.div>
  );
});

// ── Main Component ────────────────────────────────────────────────

const CalendarAgendaView = memo(function CalendarAgendaView({
  events = [],
  currentDate,
  onEventClick,
}) {
  // Group events by date for the next LOOKAHEAD_DAYS days
  const dateGroups = useMemo(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    const endDate = addDays(today, LOOKAHEAD_DAYS);

    // Filter events within the lookahead window
    const filtered = (events || []).filter((event) => {
      const d = event.start instanceof Date ? event.start : new Date(event.start);
      if (isNaN(d)) return false;
      return d >= today && d < endDate;
    });

    // Sort by start time
    filtered.sort((a, b) => {
      const aTime = (a.start instanceof Date ? a.start : new Date(a.start)).getTime();
      const bTime = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      return aTime - bTime;
    });

    // Group by date
    const groups = [];
    const groupMap = new Map();

    filtered.forEach((event) => {
      const d = event.start instanceof Date ? event.start : new Date(event.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (!groupMap.has(key)) {
        const dateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const group = { date: dateObj, events: [] };
        groupMap.set(key, group);
        groups.push(group);
      }
      groupMap.get(key).events.push(event);
    });

    return groups;
  }, [events, currentDate]);

  if (dateGroups.length === 0) {
    return <EmptyState />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full overflow-y-auto"
    >
      <div className="space-y-5 p-3">
        {dateGroups.map((group, i) => (
          <DateGroup
            key={group.date.toISOString()}
            date={group.date}
            events={group.events}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </motion.div>
  );
});

export default CalendarAgendaView;
