import React, { useMemo, useRef, useEffect, useCallback, memo, useState } from 'react';
import { MapPin, Users } from 'lucide-react';
import CalendarEventCard from './CalendarEventCard';

// ── Constants ──────────────────────────────────────────────────

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const fullDateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

// ── Helpers ────────────────────────────────────────────────────

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

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ── Drag helpers ───────────────────────────────────────────────

const SNAP_MINUTES = 15;

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

// ── Day event card (wider, shows more detail) ──────────────────

const EVENT_TYPE_COLORS = {
  meeting: '#06b6d4',
  call: '#8b5cf6',
  reminder: '#f59e0b',
  task: '#10b981',
  external: '#f97316',
  personal: '#ec4899',
};

const DayEventCard = memo(function DayEventCard({
  event,
  onClick,
  onDragStart,
  style,
}) {
  const color = event.color || EVENT_TYPE_COLORS[event.event_type] || '#06b6d4';
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const durationMin = (end - start) / 60_000;
  const showDetails = durationMin >= 45;

  return (
    <div
      className="absolute rounded-lg overflow-hidden cursor-pointer transition-colors group"
      style={{
        backgroundColor: `${color}20`,
        borderLeft: `3px solid ${color}`,
        ...style,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', event.id);
        onDragStart?.(e, event);
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: `${color}10` }}
      />
      <div className="relative px-2.5 py-1.5 h-full flex flex-col min-w-0">
        <span className="text-xs font-medium text-zinc-100 truncate leading-tight">
          {event.title}
        </span>
        <span className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
          {formatTime(event.start_time)} - {formatTime(event.end_time)}
        </span>
        {showDetails && (
          <div className="flex items-center gap-3 mt-1.5">
            {event.attendees?.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] text-zinc-500">
                  {event.attendees.length}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                <span className="text-[10px] text-zinc-500 truncate">
                  {event.location}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ── Time column ────────────────────────────────────────────────

const TimeColumn = memo(function TimeColumn() {
  return (
    <div className="flex-shrink-0 w-16 border-r border-zinc-800/40">
      {HOURS.map((h) => (
        <div
          key={h}
          className="h-[60px] flex items-start justify-end pr-2.5 pt-0.5"
        >
          <span className="text-[10px] text-zinc-600 leading-none">
            {String(h).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  );
});

// ── Main component ─────────────────────────────────────────────

const CalendarDayView = memo(function CalendarDayView({
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

  const viewDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const isToday = useMemo(() => isSameDay(viewDate, today), [viewDate, today]);

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  // Current time
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Separate all-day vs timed events for this day
  const { timedEvents, allDayEvents } = useMemo(() => {
    const timed = [];
    const allDay = [];
    events.forEach((ev) => {
      const evDate = new Date(ev.start_time);
      if (isSameDay(evDate, viewDate)) {
        if (isAllDay(ev)) {
          allDay.push(ev);
        } else {
          timed.push(ev);
        }
      }
    });
    return { timedEvents: timed, allDayEvents: allDay };
  }, [events, viewDate]);

  const groups = useMemo(() => computeOverlapGroups(timedEvents), [timedEvents]);

  // ── Drag-to-create state ──
  const [drag, setDrag] = useState(null); // { startMin, endMin }
  const dragRef = useRef(null);

  const handleColumnMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-event-card]')) return;

    const col = e.currentTarget;
    const rect = col.getBoundingClientRect();
    const scrollTop = gridRef.current?.scrollTop || 0;
    const y = e.clientY - rect.top + scrollTop;
    const minute = yToMinutes(y);

    const state = { startMin: minute, endMin: minute + SNAP_MINUTES };
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

      const effectiveEnd = duration < SNAP_MINUTES ? topMin + 60 : botMin;

      onCreateEvent?.({
        date: viewDate,
        startTime: minutesToTimeStr(topMin),
        endTime: minutesToTimeStr(Math.min(effectiveEnd, 24 * 60)),
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onCreateEvent, viewDate]);

  const handleDrop = useCallback(
    (e, hour) => {
      e.preventDefault();
      const eventId = e.dataTransfer.getData('text/plain');
      if (eventId && onMoveEvent) {
        const newStart = new Date(viewDate);
        newStart.setHours(hour, 0, 0, 0);
        onMoveEvent(eventId, newStart);
      }
    },
    [onMoveEvent, viewDate],
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800/60 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center border-b border-zinc-800/60 bg-zinc-900/80 px-4 py-3 flex-shrink-0">
        <h2
          className={`text-sm font-semibold ${
            isToday ? 'text-cyan-400' : 'text-zinc-200'
          }`}
        >
          {fullDateFmt.format(viewDate)}
        </h2>
        {isToday && (
          <span className="ml-2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        )}
      </div>

      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-zinc-800/60 flex-shrink-0">
          <div className="w-16 flex-shrink-0 border-r border-zinc-800/40 flex items-center justify-end pr-2.5">
            <span className="text-[10px] text-zinc-600">All day</span>
          </div>
          <div className="flex-1 p-1 space-y-0.5">
            {allDayEvents.map((ev) => (
              <CalendarEventCard
                key={ev.id}
                event={ev}
                onClick={onEventClick}
                compact
                style={{ position: 'relative', width: '100%', height: 24 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto" ref={gridRef}>
        <div className="flex relative" style={{ height: 24 * HOUR_HEIGHT }}>
          <TimeColumn />

          {/* Event column */}
          <div className="flex-1 relative" onMouseDown={handleColumnMouseDown}>
            {/* Hour slots */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full border-b border-zinc-800/40 cursor-crosshair hover:bg-zinc-800/20 transition-colors"
                style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, h)}
              />
            ))}

            {/* Drag selection overlay */}
            {drag && (
              <DragSelection startMin={drag.startMin} endMin={drag.endMin} />
            )}

            {/* Current time indicator */}
            {isToday && (
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
                const startMin = start.getHours() * 60 + start.getMinutes();
                const endMin = end.getHours() * 60 + end.getMinutes();
                const duration = Math.max(endMin - startMin, 20);
                const overlapCount = group.length;
                const width = `calc(${100 / overlapCount}% - 4px)`;
                const left = `calc(${(idx * 100) / overlapCount}% + 2px)`;

                return (
                  <DayEventCard
                    key={ev.id}
                    event={ev}
                    onClick={onEventClick}
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
        </div>
      </div>
    </div>
  );
});

export default CalendarDayView;
