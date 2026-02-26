import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const DEFAULT_EVENTS = [
  { icon: '📧', label: 'Email sent', color: '#06b6d4' },
  { icon: '📅', label: 'Meeting held', color: '#6366f1' },
  { icon: '✅', label: 'Task completed', color: '#10b981' },
  { icon: '📄', label: 'File shared', color: '#f59e0b' },
];

const APP_EVENTS = {
  gmail: { icon: '📧', label: 'Email tracked', color: '#06b6d4' },
  'google-calendar': { icon: '📅', label: 'Calendar synced', color: '#6366f1' },
  slack: { icon: '💬', label: 'Message logged', color: '#10b981' },
  notion: { icon: '📝', label: 'Page updated', color: '#f59e0b' },
  github: { icon: '🔀', label: 'Code pushed', color: '#ec4899' },
  linear: { icon: '✅', label: 'Issue resolved', color: '#3b82f6' },
  figma: { icon: '🎨', label: 'Design edited', color: '#f43f5e' },
  drive: { icon: '📄', label: 'File shared', color: '#f97316' },
};

export default function TimelineFill({ selectedApps = [] }) {
  const lineRef = useRef(null);
  const nodesRef = useRef([]);

  const events =
    selectedApps.length > 0
      ? selectedApps
          .slice(0, 4)
          .map((app) => APP_EVENTS[app] || DEFAULT_EVENTS[0])
      : DEFAULT_EVENTS;

  useEffect(() => {
    const nodes = nodesRef.current.filter(Boolean);

    // Animate the vertical line growing
    if (lineRef.current) {
      anime({
        targets: lineRef.current,
        scaleY: [0, 1],
        duration: 1200,
        delay: 400,
        easing: 'easeInOutCubic',
      });
    }

    // Animate nodes appearing
    anime({
      targets: nodes,
      opacity: [0, 1],
      translateX: [-20, 0],
      scale: [0.6, 1],
      duration: 600,
      delay: anime.stagger(350, { start: 800 }),
      easing: 'easeOutBack',
    });

    return () => {
      anime.remove(lineRef.current);
      anime.remove(nodes);
    };
  }, []);

  const totalHeight = events.length * 64 + 20;

  return (
    <div className="relative" style={{ width: 240, height: totalHeight }}>
      {/* Vertical line */}
      <div
        ref={lineRef}
        className="absolute left-6 top-2 bottom-2 w-px"
        style={{
          background: 'linear-gradient(to bottom, #06b6d4, #6366f1, #10b981)',
          transformOrigin: 'top',
          transform: 'scaleY(0)',
        }}
      />

      {/* Timeline nodes */}
      {events.map((event, i) => (
        <div
          key={i}
          ref={(el) => (nodesRef.current[i] = el)}
          className="flex items-center gap-3 mb-4"
          style={{ opacity: 0, paddingLeft: 8 }}
        >
          {/* Node dot */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base"
            style={{
              background: `${event.color}20`,
              border: `1.5px solid ${event.color}60`,
              boxShadow: `0 0 10px ${event.color}30`,
            }}
          >
            {event.icon}
          </div>
          {/* Label */}
          <div>
            <span className="text-sm text-zinc-200 font-medium">{event.label}</span>
            <span className="block text-[10px] text-zinc-500">Just now</span>
          </div>
        </div>
      ))}
    </div>
  );
}
