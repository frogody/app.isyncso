import React, { useRef, useEffect } from 'react';
import anime from '@/lib/anime-wrapper';
import { cn } from '@/lib/utils';

// Agent color segments (same colors as SyncAgent page)
const AGENT_SEGMENTS = [
  { id: 'learn', color: '#06b6d4', from: 0.00, to: 0.12 },       // cyan
  { id: 'growth', color: '#6366f1', from: 0.14, to: 0.26 },     // indigo
  { id: 'products', color: '#10b981', from: 0.28, to: 0.40 },   // emerald
  { id: 'finance', color: '#f59e0b', from: 0.42, to: 0.54 },    // amber
  { id: 'sentinel', color: '#ec4899', from: 0.56, to: 0.68 },   // pink
  { id: 'create', color: '#ef4444', from: 0.70, to: 0.82 },     // red
  { id: 'raise', color: '#f97316', from: 0.84, to: 0.96 },      // orange
];

// Check for reduced motion preference
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function SyncAvatarMini({ size = 48, state = 'idle', className = '' }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const segmentsRef = useRef(null);
  const stateRef = useRef({
    particles: [],
    time: 0,
  });

  // Match SyncAgent proportions exactly
  const r = size / 2;                    // 24 for size 48
  const segmentR = r - 2;                // 22 - where colored segments sit
  const innerR = r * 0.58;               // ~14 - inner visualization area

  // Helpers for SVG arc paths
  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  // Animate segments
  useEffect(() => {
    if (prefersReducedMotion() || !segmentsRef.current) return;

    const paths = segmentsRef.current.querySelectorAll('path');

    anime.remove(paths);
    anime({
      targets: paths,
      strokeWidth: state === 'active' ? [4, 5, 4] : [4, 4.5, 4],
      opacity: state === 'active' ? [0.85, 1, 0.85] : [0.7, 0.9, 0.7],
      duration: state === 'active' ? 600 : 1500,
      loop: true,
      easing: 'easeInOutSine',
      delay: anime.stagger(60),
    });

    return () => anime.remove(paths);
  }, [state]);

  // Initialize particles
  useEffect(() => {
    const st = stateRef.current;
    const N = 15;
    const rand = (a) => {
      const x = Math.sin(a * 9999) * 10000;
      return x - Math.floor(x);
    };

    st.particles = Array.from({ length: N }).map((_, i) => {
      const pr = innerR * 0.8 * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return {
        x: r + pr * Math.cos(ang),
        y: r + pr * Math.sin(ang),
        vx: (rand(i + 11) - 0.5) * 0.12,
        vy: (rand(i + 17) - 0.5) * 0.12,
        s: 0.6 + rand(i + 23) * 0.8,
      };
    });
  }, [size, innerR, r]);

  // Canvas animation for inner visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;

      st.time += 0.016;
      const cx = size / 2;
      const cy = size / 2;
      const isActive = state === 'active';

      // Handle DPR
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, size, size);

      // Inner dark background
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fill();

      // Clip to inner circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.clip();

      // Purple gradient
      const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, innerR);
      g.addColorStop(0, isActive ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.4)');
      g.addColorStop(0.5, isActive ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Update and draw particles
      const speedBoost = isActive ? 1.3 : 0.8;
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];

        // Orbital motion
        const dx = a.x - cx;
        const dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.005 * speedBoost;
        const pr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + pr * Math.cos(ang) - a.x) * 0.003;
        a.vy += (cy + pr * Math.sin(ang) - a.y) * 0.003;

        a.x += a.vx * speedBoost;
        a.y += a.vy * speedBoost;

        // Keep inside
        const rr = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2);
        const maxR = innerR * 0.85;
        if (rr > maxR) {
          const k = maxR / rr;
          a.x = cx + (a.x - cx) * k;
          a.y = cy + (a.y - cy) * k;
          a.vx *= -0.3;
          a.vy *= -0.3;
        }

        // Draw links
        for (let j = i + 1; j < st.particles.length; j++) {
          const b = st.particles[j];
          const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
          if (dist < 10) {
            const o = (1 - dist / 10) * (isActive ? 0.4 : 0.25);
            ctx.strokeStyle = `rgba(255,255,255,${o})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      ctx.globalCompositeOperation = 'lighter';
      for (const p of st.particles) {
        ctx.fillStyle = `rgba(255,255,255,${isActive ? 0.4 : 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, state, innerR]);

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* SVG for colored ring segments */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          <filter id="miniGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={1.5} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Colored segments - THE outer ring */}
        <g ref={segmentsRef} filter="url(#miniGlow)">
          {AGENT_SEGMENTS.map((segment) => (
            <path
              key={segment.id}
              data-agent={segment.id}
              d={arcPath(r, r, segmentR, segment.from, segment.to)}
              fill="none"
              stroke={segment.color}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
        </g>
      </svg>

      {/* Canvas for inner particle visualization */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
