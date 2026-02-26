import React, { memo } from 'react';
import { Video } from 'lucide-react';

const EVENT_TYPE_COLORS = {
  meeting: '#06b6d4',
  call: '#8b5cf6',
  reminder: '#f59e0b',
  task: '#10b981',
  external: '#f97316',
  personal: '#ec4899',
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const CalendarEventCard = memo(function CalendarEventCard({
  event,
  onClick,
  onDragStart,
  style,
  compact = false,
}) {
  const color = event.color || EVENT_TYPE_COLORS[event.event_type] || '#06b6d4';

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
      <div className="relative px-1.5 py-1 h-full flex flex-col min-w-0">
        <span className="text-xs font-medium text-zinc-100 truncate leading-tight">
          {event.title}
        </span>
        {!compact && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[11px] text-zinc-400 truncate leading-tight">
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </span>
            {event.video_call_id && (
              <Video className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            )}
          </div>
        )}
        {compact && event.video_call_id && (
          <Video className="w-3 h-3 text-zinc-500 mt-0.5 flex-shrink-0" />
        )}
      </div>
    </div>
  );
});

export { EVENT_TYPE_COLORS };
export default CalendarEventCard;
