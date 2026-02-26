import React, { memo, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Date helpers ──────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Main Component ────────────────────────────────────────────────

const CalendarMiniMonth = memo(function CalendarMiniMonth({
  currentDate,
  onDateSelect,
  events = [],
}) {
  const [viewDate, setViewDate] = useState(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  // Navigate months
  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

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

  // Set of date keys that have events
  const datesWithEvents = useMemo(() => {
    const set = new Set();
    (events || []).forEach((event) => {
      const d = event.start instanceof Date ? event.start : new Date(event.start);
      if (!isNaN(d)) {
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    return set;
  }, [events]);

  function hasEvents(date) {
    return datesWithEvents.has(
      `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    );
  }

  const monthLabel = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  return (
    <div className="w-full max-w-[280px] select-none">
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={goToPrevMonth}
          className="p-1 rounded hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[13px] font-semibold text-zinc-200">
          {monthLabel}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-1 rounded hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-zinc-500 uppercase py-0.5"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const inMonth = isSameMonth(day, viewDate);
            const today = isToday(day);
            const selected = isSameDay(day, currentDate);
            const dayHasEvents = hasEvents(day);

            return (
              <button
                key={`${wi}-${di}`}
                onClick={() => onDateSelect(day)}
                className={`relative flex flex-col items-center justify-center h-8 w-full rounded-md text-[11px] transition-all ${
                  !inMonth
                    ? 'text-zinc-600 hover:text-zinc-500'
                    : today
                    ? 'text-white font-bold'
                    : selected
                    ? 'text-cyan-300 font-medium'
                    : 'text-zinc-300 hover:text-zinc-100'
                } ${
                  today
                    ? 'bg-cyan-500/90'
                    : selected
                    ? 'ring-1 ring-cyan-400/60'
                    : 'hover:bg-zinc-800/40'
                }`}
              >
                <span>{day.getDate()}</span>
                {/* Event indicator dot */}
                {dayHasEvents && !today && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400" />
                )}
                {dayHasEvents && today && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

export default CalendarMiniMonth;
