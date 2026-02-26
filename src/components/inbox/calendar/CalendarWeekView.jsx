import React, { useMemo, useRef, useEffect, useCallback, memo, useState } from 'react';
import CalendarEventCard from './CalendarEventCard';

// ── Date helpers ──────────────────────────────────────────────

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  d.setDate(d.getDate() + diff);
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

function isAllDay(event) {
  return !!event.all_day;
}

const dayNameFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const HOUR_HEIGHT = 60; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ── Overlap detection ──────────────────────────────────────────

function computeOverlapGroups(events) {
  if (!events.length) return [];
  const sorted = [...events].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time),
  );
  const groups = [];
  let currentGroup = [sorted[0]];
  let groupEnd = new Date(sorted[0].end_time);

  for (let i = 1; i < sorted.length; i++) {
    const ev = sorted[i];
    if (new Date(ev.start_time) < groupEnd) {
      currentGroup.push(ev);
      const evEnd = new Date(ev.end_time);
      if (evEnd > groupEnd) groupEnd = evEnd;
    } else {
      groups.push(currentGroup);
      currentGroup = [ev];
      groupEnd = new Date(ev.end_time);
    }
  }
  groups.push(currentGroup);
  return groups;
}

// ── Sub-components ─────────────────────────────────────────────

const TimeColumn = memo(function TimeColumn() {
  return (
    <div className="flex-shrink-0 w-14 border-r border-zinc-800/40">
      {HOURS.map((h) => (
        <div
          key={h}
          className="h-[60px] flex items-start justify-end pr-2 pt-0.5"
        >
          <span className="text-[10px] text-zinc-600 leading-none">
            {String(h).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  );
});

const DayHeader = memo(function DayHeader({ date, isToday }) {
  return (
    <div className="flex-1 flex flex-col items-center py-2 min-w-0">
      <span
        className={`text-[10px] uppercase tracking-wider ${
          isToday ? 'text-cyan-400 font-semibold' : 'text-zinc-500'
        }`}
      >
        {dayNameFmt.format(date)}
      </span>
      <div className="relative mt-0.5">
        <span
          className={`text-sm font-semibold ${
            isToday ? 'text-white' : 'text-zinc-300'
          }`}
        >
          {date.getDate()}
        </span>
        {isToday && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        )}
      </div>
    </div>
  );
});

// ── Helpers for drag ────────────────────────────────────────────

const SNAP_MINUTES = 15; // snap to 15-minute intervals

function yToMinutes(y) {
  const raw = (y / HOUR_HEIGHT) * 60;
  return Math.max(0, Math.min(24 * 60, Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES));
}

function minutesToTimeStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Drag selection overlay ─────────────────────────────────────

const DragSelection = memo(function DragSelection({ startMin, endMin }) {
  const top = Math.min(startMin, endMin);
  const bottom = Math.max(startMin, endMin);
  const height = Math.max(bottom - top, SNAP_MINUTES);

  return (
    <div
      className="absolute left-0 right-0 z-15 pointer-events-none rounded-lg border-2 border-cyan-400/60 bg-cyan-500/15"
      style={{ top, height }}
    >
      <div className="absolute inset-x-0 top-0 px-2 py-0.5">
        <span className="text-[10px] font-medium text-cyan-300">
          {minutesToTimeStr(top)} – {minutesToTimeStr(top + height)}
        </span>
      </div>
    </div>
  );
});

// ── Main component ─────────────────────────────────────────────

const CalendarWeekView = memo(function CalendarWeekView({
  events = [],
  currentDate,
  onEventClick,
  onCreateEvent,
  onMoveEvent,
}) {
  const gridRef = useRef(null);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  // Current time position
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isCurrentWeek = weekDays.some((d) => isSameDay(d, today));

  // ── Drag-to-create state ──
  const [drag, setDrag] = useState(null); // { dayIdx, startMin, endMin }
  const dragRef = useRef(null); // non-reactive mirror for mousemove

  const handleColumnMouseDown = useCallback((e, dayIdx) => {
    // Only left click, ignore if target is an event card
    if (e.button !== 0) return;
    if (e.target.closest('[data-event-card]')) return;

    const col = e.currentTarget;
    const rect = col.getBoundingClientRect();
    const scrollTop = gridRef.current?.scrollTop || 0;
    const y = e.clientY - rect.top + scrollTop;
    const minute = yToMinutes(y);

    const state = { dayIdx, startMin: minute, endMin: minute + SNAP_MINUTES };
    dragRef.current = state;
    setDrag(state);

    const handleMouseMove = (ev) => {
      const yNow = ev.clientY - rect.top + (gridRef.current?.scrollTop || 0);
      const endMin = yToMinutes(yNow);
      const updated = { ...dragRef.current, endMin };
      dragRef.current = updated;
      setDrag(updated);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const final = dragRef.current;
      dragRef.current = null;
      setDrag(null);

      if (!final) return;

      const topMin = Math.min(final.startMin, final.endMin);
      const botMin = Math.max(final.startMin, final.endMin);
      const duration = botMin - topMin;

      // If barely dragged (< 15 min), treat as a click → default 1h event
      const effectiveEnd = duration < SNAP_MINUTES ? topMin + 60 : botMin;

      onCreateEvent?.({
        date: weekDays[final.dayIdx],
        startTime: minutesToTimeStr(topMin),
        endTime: minutesToTimeStr(Math.min(effectiveEnd, 24 * 60)),
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onCreateEvent, weekDays]);

  // Bucket events by day
  const { dayEvents, allDayEvents } = useMemo(() => {
    const dayMap = {};
    const allDay = {};
    weekDays.forEach((d) => {
      const key = d.toDateString();
      dayMap[key] = [];
      allDay[key] = [];
    });

    events.forEach((ev) => {
      const evDate = new Date(ev.start_time);
      const key = new Date(
        evDate.getFullYear(),
        evDate.getMonth(),
        evDate.getDate(),
      ).toDateString();
      if (dayMap[key]) {
        if (isAllDay(ev)) {
          allDay[key].push(ev);
        } else {
          dayMap[key].push(ev);
        }
      }
    });
    return { dayEvents: dayMap, allDayEvents: allDay };
  }, [events, weekDays]);

  const hasAllDay = useMemo(
    () => Object.values(allDayEvents).some((arr) => arr.length > 0),
    [allDayEvents],
  );

  const handleDrop = useCallback(
    (e, dayDate, hour) => {
      e.preventDefault();
      const eventId = e.dataTransfer.getData('text/plain');
      if (eventId && onMoveEvent) {
        const newStart = new Date(dayDate);
        newStart.setHours(hour, 0, 0, 0);
        onMoveEvent(eventId, newStart);
      }
    },
    [onMoveEvent],
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800/60 overflow-hidden select-none">
      {/* Header row */}
      <div className="flex border-b border-zinc-800/60 bg-zinc-900/80 flex-shrink-0">
        <div className="w-14 flex-shrink-0 border-r border-zinc-800/40" />
        {weekDays.map((d) => (
          <DayHeader key={d.toISOString()} date={d} isToday={isSameDay(d, today)} />
        ))}
      </div>

      {/* All-day row */}
      {hasAllDay && (
        <div className="flex border-b border-zinc-800/60 flex-shrink-0">
          <div className="w-14 flex-shrink-0 border-r border-zinc-800/40 flex items-center justify-end pr-2">
            <span className="text-[10px] text-zinc-600">All day</span>
          </div>
          {weekDays.map((d) => {
            const key = d.toDateString();
            const dayAllDay = allDayEvents[key] || [];
            return (
              <div
                key={key}
                className="flex-1 min-h-[28px] border-r border-zinc-800/40 last:border-r-0 p-0.5 space-y-0.5"
              >
                {dayAllDay.map((ev) => (
                  <CalendarEventCard
                    key={ev.id}
                    event={ev}
                    onClick={onEventClick}
                    compact
                    style={{ position: 'relative', width: '100%', height: 22 }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={gridRef}>
        <div className="flex relative" style={{ height: 24 * HOUR_HEIGHT }}>
          <TimeColumn />

          {/* Day columns */}
          {weekDays.map((d, dayIdx) => {
            const key = d.toDateString();
            const dayEvs = dayEvents[key] || [];
            const groups = computeOverlapGroups(dayEvs);
            const showTimeLine = isCurrentWeek && isSameDay(d, today);

            return (
              <div
                key={key}
                className="flex-1 relative border-r border-zinc-800/40 last:border-r-0"
                onMouseDown={(e) => handleColumnMouseDown(e, dayIdx)}
              >
                {/* Hour slot grid lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-b border-zinc-800/40 cursor-crosshair hover:bg-zinc-800/20 transition-colors"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, d, h)}
                  />
                ))}

                {/* Drag selection overlay */}
                {drag && drag.dayIdx === dayIdx && (
                  <DragSelection startMin={drag.startMin} endMin={drag.endMin} />
                )}

                {/* Current time indicator */}
                {showTimeLine && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: nowMinutes }}
                  >
                    <div className="w-2 h-2 rounded-full bg-cyan-400 -ml-1 flex-shrink-0" />
                    <div className="flex-1 h-[2px] bg-cyan-400" />
                  </div>
                )}

                {/* Events */}
                {groups.map((group) =>
                  group.map((ev, idx) => {
                    const start = new Date(ev.start_time);
                    const end = new Date(ev.end_time);
                    const startMin =
                      start.getHours() * 60 + start.getMinutes();
                    const endMin = end.getHours() * 60 + end.getMinutes();
                    const duration = Math.max(endMin - startMin, 20);
                    const overlapCount = group.length;
                    const width = `calc(${100 / overlapCount}% - 2px)`;
                    const left = `calc(${(idx * 100) / overlapCount}% + 1px)`;

                    return (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        onClick={onEventClick}
                        compact={duration < 35}
                        style={{
                          top: startMin,
                          height: duration,
                          width,
                          left,
                          right: 'auto',
                          zIndex: 10,
                        }}
                      />
                    );
                  }),
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default CalendarWeekView;
