import React, { useRef, useEffect } from 'react';
import anime from '@/lib/anime-wrapper';
import { cn } from '@/lib/utils';

// Agent color segments (same as SyncAgent page)
const AGENT_SEGMENTS = [
  { id: 'finance', color: '#f59e0b', from: 0.00, to: 0.12 },    // amber
  { id: 'learn', color: '#06b6d4', from: 0.14, to: 0.26 },      // cyan
  { id: 'sentinel', color: '#86efac', from: 0.28, to: 0.40 },   // sage
  { id: 'growth', color: '#6366f1', from: 0.42, to: 0.54 },     // indigo
  { id: 'sync', color: '#a855f7', from: 0.56, to: 0.68 },       // purple
  { id: 'create', color: '#f43f5e', from: 0.70, to: 0.82 },     // rose
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

  const r = size / 2;
  const ringR = r - 3;
  const innerR = r - 10;

  // Helper for polar coordinates
  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  // Helper for arc path
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
      strokeWidth: state === 'active' ? [3, 4, 3] : [3, 3.5, 3],
      opacity: state === 'active' ? [0.85, 1, 0.85] : [0.7, 0.85, 0.7],
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
    const N = 20; // Fewer particles for mini version
    const rand = (a) => {
      const x = Math.sin(a * 9999) * 10000;
      return x - Math.floor(x);
    };

    st.particles = Array.from({ length: N }).map((_, i) => {
      const pr = innerR * 0.7 * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return {
        x: r + pr * Math.cos(ang),
        y: r + pr * Math.sin(ang),
        vx: (rand(i + 11) - 0.5) * 0.15,
        vy: (rand(i + 17) - 0.5) * 0.15,
        s: 0.8 + rand(i + 23) * 1.2,
        p: rand(i + 31),
      };
    });
  }, [size, innerR, r]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;

      st.time += 0.016;
      const time = st.time;
      const cx = size / 2;
      const cy = size / 2;

      // Handle DPR
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Clear
      ctx.clearRect(0, 0, size, size);

      // Background circle
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, innerR * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Clip to inner circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR * 0.85, 0, Math.PI * 2);
      ctx.clip();

      // Gradient
      const isActive = state === 'active';
      const g = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, innerR);
      g.addColorStop(0, isActive ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.35)');
      g.addColorStop(0.6, isActive ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Particle physics
      const speedBoost = isActive ? 1.2 : 0.7;

      // Draw links and update particles
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];

        // Orbit around center
        const dx = a.x - cx;
        const dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.004 * speedBoost;
        const pr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + pr * Math.cos(ang) - a.x) * 0.002;
        a.vy += (cy + pr * Math.sin(ang) - a.y) * 0.002;

        a.x += a.vx * speedBoost;
        a.y += a.vy * speedBoost;

        // Keep inside
        const ddx = a.x - cx;
        const ddy = a.y - cy;
        const rr = Math.sqrt(ddx * ddx + ddy * ddy);
        const maxR = innerR * 0.8;
        if (rr > maxR) {
          const k = maxR / rr;
          a.x = cx + ddx * k;
          a.y = cy + ddy * k;
          a.vx *= -0.3;
          a.vy *= -0.3;
        }

        // Draw links
        for (let j = i + 1; j < st.particles.length; j += 3) {
          const b = st.particles[j];
          const lx = b.x - a.x;
          const ly = b.y - a.y;
          const dist = Math.sqrt(lx * lx + ly * ly);
          if (dist < 12) {
            const o = (1 - dist / 12) * (isActive ? 0.35 : 0.2);
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
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Scan line
      const scanY = cy + Math.sin(time * 2) * (innerR * 0.25);
      ctx.fillStyle = isActive ? 'rgba(192,132,252,0.2)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, scanY - 1, size, 2);

      ctx.restore();

      // Vignette
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(cx, cy, innerR * 0.3, cx, cy, innerR * 0.9);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR * 0.85, 0, Math.PI * 2);
      ctx.fill();

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
      {/* SVG Outer Ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          <filter id="miniGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base ring */}
        <circle
          cx={r}
          cy={r}
          r={ringR}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={5}
        />

        {/* Colored segments */}
        <g ref={segmentsRef} filter="url(#miniGlow)">
          {AGENT_SEGMENTS.map((segment) => (
            <path
              key={segment.id}
              data-agent={segment.id}
              d={arcPath(r, r, ringR, segment.from, segment.to)}
              fill="none"
              stroke={segment.color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
        </g>

        {/* Inner rim */}
        <circle
          cx={r}
          cy={r}
          r={innerR}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      </svg>

      {/* Canvas for particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ width: size, height: size }}
      />

      {/* Outer glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: state === 'active'
            ? '0 0 12px rgba(168,85,247,0.3), 0 0 24px rgba(139,92,246,0.15)'
            : '0 0 8px rgba(168,85,247,0.15), 0 0 16px rgba(139,92,246,0.08)',
        }}
      />
    </div>
  );
}
