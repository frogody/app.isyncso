import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

// ── Date helpers ──────────────────────────────────────────────────
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Monday-based week: shift Sunday (0) to 6, others subtract 1
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

function formatTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

// ── Constants ─────────────────────────────────────────────────────
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_VISIBLE_EVENTS = 3;

// Color palette for event bars
const EVENT_COLORS = [
  'bg-cyan-500/80',
  'bg-blue-500/80',
  'bg-violet-500/80',
  'bg-amber-500/80',
  'bg-rose-500/80',
  'bg-emerald-500/80',
  'bg-orange-500/80',
  'bg-pink-500/80',
];

function getEventColor(event, index) {
  if (event.color) return event.color;
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

// ── Sub-components ────────────────────────────────────────────────

const EventBar = memo(function EventBar({ event, colorClass, onClick }) {
  const startTime = event.start instanceof Date ? formatTime(event.start) : '';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={`w-full text-left truncate rounded px-1 py-[1px] text-[10px] leading-tight text-white/90 ${colorClass} hover:brightness-110 transition-all cursor-pointer`}
      title={`${startTime ? startTime + ' ' : ''}${event.title || 'Untitled'}`}
    >
      {startTime ? `${startTime} ` : ''}
      {event.title || 'Untitled'}
    </button>
  );
});

const DayCell = memo(function DayCell({
  date,
  isCurrentMonth,
  events,
  onDateSelect,
  onEventClick,
  onCreateEvent,
}) {
  const dayNumber = date.getDate();
  const today = isToday(date);
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - MAX_VISIBLE_EVENTS;

  const handleCellClick = (e) => {
    // If clicking on the cell background (not an event), decide action
    if (e.target === e.currentTarget || e.target.closest('[data-cell-bg]')) {
      onDateSelect(date);
    }
  };

  const handleEmptyClick = (e) => {
    e.stopPropagation();
    onCreateEvent({ date });
  };

  return (
    <div
      onClick={handleCellClick}
      className={`min-h-[100px] border border-zinc-800/30 p-1 flex flex-col cursor-pointer transition-colors hover:bg-zinc-800/20 ${
        !isCurrentMonth ? 'bg-zinc-900/40' : 'bg-zinc-900/80'
      }`}
    >
      {/* Day number */}
      <div className="flex items-center justify-between mb-0.5" data-cell-bg>
        <span
          className={`text-sm w-6 h-6 flex items-center justify-center rounded-full ${
            today
              ? 'bg-cyan-500 text-white font-bold'
              : isCurrentMonth
              ? 'text-zinc-300'
              : 'text-zinc-600'
          }`}
        >
          {dayNumber}
        </span>
      </div>

      {/* Events */}
      <div className="flex-1 flex flex-col gap-[2px]">
        {visibleEvents.map((event, i) => (
          <EventBar
            key={event.id || i}
            event={event}
            colorClass={getEventColor(event, i)}
            onClick={onEventClick}
          />
        ))}
        {overflowCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDateSelect(date);
            }}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 text-left px-1 transition-colors"
          >
            +{overflowCount} more
          </button>
        )}
        {events.length === 0 && (
          <div
            className="flex-1"
            onClick={handleEmptyClick}
          />
        )}
      </div>
    </div>
  );
});

// ── Main Component ────────────────────────────────────────────────

const CalendarMonthView = memo(function CalendarMonthView({
  events = [],
  currentDate,
  onEventClick,
  onCreateEvent,
  onDateSelect,
}) {
  // Build the 6-week grid of dates
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
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

    // Only include 6th row if it contains dates from the current month
    const lastRow = rows[5];
    if (lastRow && !isSameMonth(lastRow[0], currentDate)) {
      rows.pop();
    }

    return rows;
  }, [currentDate]);

  // Index events by date string for fast lookup
  const eventsByDate = useMemo(() => {
    const map = {};
    (events || []).forEach((event) => {
      const eventDate = event.start instanceof Date
        ? event.start
        : new Date(event.start);
      if (isNaN(eventDate)) return;
      const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    // Sort each day's events by start time
    Object.values(map).forEach((dayEvents) =>
      dayEvents.sort((a, b) => {
        const aTime = a.start instanceof Date ? a.start.getTime() : new Date(a.start).getTime();
        const bTime = b.start instanceof Date ? b.start.getTime() : new Date(b.start).getTime();
        return aTime - bTime;
      })
    );
    return map;
  }, [events]);

  function getEventsForDate(date) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate[key] || [];
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800/40">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wider py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex-1 grid grid-rows-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => (
              <DayCell
                key={di}
                date={day}
                isCurrentMonth={isSameMonth(day, currentDate)}
                events={getEventsForDate(day)}
                onDateSelect={onDateSelect}
                onEventClick={onEventClick}
                onCreateEvent={onCreateEvent}
              />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
});

export default CalendarMonthView;
