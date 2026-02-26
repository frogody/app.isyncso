import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const AGENT_SEGMENTS = [
  { id: 'orchestrator', color: '#ec4899', from: 0.02, to: 0.08, label: 'Orchestrator' },
  { id: 'learn', color: '#06b6d4', from: 0.12, to: 0.18, label: 'Learn' },
  { id: 'growth', color: '#6366f1', from: 0.22, to: 0.28, label: 'Growth' },
  { id: 'products', color: '#10b981', from: 0.32, to: 0.38, label: 'Products' },
  { id: 'sentinel', color: '#86EFAC', from: 0.42, to: 0.48, label: 'Sentinel' },
  { id: 'finance', color: '#f59e0b', from: 0.52, to: 0.58, label: 'Finance' },
  { id: 'create', color: '#f43f5e', from: 0.62, to: 0.68, label: 'Create' },
  { id: 'tasks', color: '#f97316', from: 0.72, to: 0.78, label: 'Tasks' },
  { id: 'research', color: '#3b82f6', from: 0.82, to: 0.88, label: 'Research' },
  { id: 'inbox', color: '#14b8a6', from: 0.92, to: 0.98, label: 'Inbox' },
];

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 80;
const STROKE_WIDTH = 6;
const LABEL_RADIUS = RADIUS + 22;

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  };
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export default function RingSegments() {
  const ringRef = useRef(null);
  const labelsRef = useRef([]);
  const arcsRef = useRef([]);

  useEffect(() => {
    const labels = labelsRef.current.filter(Boolean);
    const arcs = arcsRef.current.filter(Boolean);

    // Animate ring rotation
    if (ringRef.current) {
      anime({
        targets: ringRef.current,
        rotate: [0, 360],
        duration: 30000,
        loop: true,
        easing: 'linear',
      });
    }

    // Draw arcs with staggered stroke-dashoffset
    arcs.forEach((arc) => {
      if (!arc) return;
      const length = arc.getTotalLength();
      arc.style.strokeDasharray = length;
      arc.style.strokeDashoffset = length;
    });

    anime({
      targets: arcs,
      strokeDashoffset: [function (el) { return el.getTotalLength(); }, 0],
      duration: 800,
      delay: anime.stagger(120, { start: 300 }),
      easing: 'easeInOutCubic',
    });

    // Fade in labels sequentially
    anime({
      targets: labels,
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 500,
      delay: anime.stagger(150, { start: 600 }),
      easing: 'easeOutBack',
    });

    return () => {
      anime.remove(ringRef.current);
      anime.remove(arcs);
      anime.remove(labels);
    };
  }, []);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg
        ref={ringRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {AGENT_SEGMENTS.map((seg, i) => {
          const startAngle = seg.from * Math.PI * 2 - Math.PI / 2;
          const endAngle = seg.to * Math.PI * 2 - Math.PI / 2;
          const d = describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle);
          return (
            <path
              key={seg.id}
              ref={(el) => (arcsRef.current[i] = el)}
              d={d}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${seg.color}60)` }}
            />
          );
        })}
      </svg>

      {/* Labels positioned around the ring (not rotating) */}
      {AGENT_SEGMENTS.map((seg, i) => {
        const midAngle = ((seg.from + seg.to) / 2) * Math.PI * 2 - Math.PI / 2;
        const x = CENTER + LABEL_RADIUS * Math.cos(midAngle);
        const y = CENTER + LABEL_RADIUS * Math.sin(midAngle);
        return (
          <span
            key={seg.id}
            ref={(el) => (labelsRef.current[i] = el)}
            className="absolute text-[9px] font-medium whitespace-nowrap pointer-events-none"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              color: seg.color,
              opacity: 0,
              textShadow: `0 0 8px ${seg.color}40`,
            }}
          >
            {seg.label}
          </span>
        );
      })}
    </div>
  );
}
