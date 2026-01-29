import React, { useRef, useEffect, useMemo } from 'react';
import anime from '@/lib/anime-wrapper';
import { cn } from '@/lib/utils';
import { useSyncState } from '@/components/context/SyncStateContext';

// Agent color segments - MUST match SyncAgent.jsx exactly
const AGENT_SEGMENTS = [
  { id: 'orchestrator', color: '#ec4899', from: 0.004, to: 0.096 },  // pink
  { id: 'learn', color: '#06b6d4', from: 0.104, to: 0.196 },         // cyan
  { id: 'growth', color: '#6366f1', from: 0.204, to: 0.296 },        // indigo
  { id: 'products', color: '#10b981', from: 0.304, to: 0.396 },      // emerald
  { id: 'sentinel', color: '#86EFAC', from: 0.404, to: 0.496 },      // sage green
  { id: 'finance', color: '#f59e0b', from: 0.504, to: 0.596 },       // amber
  { id: 'create', color: '#f43f5e', from: 0.604, to: 0.696 },        // rose
  { id: 'tasks', color: '#f97316', from: 0.704, to: 0.796 },         // orange
  { id: 'research', color: '#3b82f6', from: 0.804, to: 0.896 },      // blue
  { id: 'inbox', color: '#14b8a6', from: 0.904, to: 0.996 },         // teal
];

// Check for reduced motion preference
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function SyncAvatarMini({ size = 48, className = '' }) {
  // Get synchronized state from context
  const syncState = useSyncState();
  const { mood, level, activeAgent, isProcessing, showSuccess } = syncState;

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const segmentsRef = useRef(null);
  const glowRef = useRef(null);
  const stateRef = useRef({
    particles: [],
    time: 0,
    currentLevel: 0.18,
  });

  // Derive animation state from sync state
  const animationState = useMemo(() => {
    if (showSuccess) return 'success';
    if (mood === 'speaking') return 'speaking';
    if (mood === 'thinking' || isProcessing) return 'thinking';
    return 'idle';
  }, [mood, isProcessing, showSuccess]);

  // Match SyncAgent proportions exactly
  const r = size / 2;
  const segmentR = r - 2;
  const innerR = r * 0.58;

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

  // Animate segments based on mood
  useEffect(() => {
    if (prefersReducedMotion() || !segmentsRef.current) return;

    const paths = segmentsRef.current.querySelectorAll('path');
    anime.remove(paths);

    // Different animation parameters based on state
    const configs = {
      speaking: {
        strokeWidth: [3, 5, 3],
        opacity: [0.9, 1, 0.9],
        duration: 400,
      },
      thinking: {
        strokeWidth: [3, 4.5, 3],
        opacity: [0.8, 1, 0.8],
        duration: 800,
      },
      success: {
        strokeWidth: [3, 6, 3],
        opacity: [1, 1, 1],
        duration: 300,
      },
      idle: {
        strokeWidth: [3, 3.5, 3],
        opacity: [0.7, 0.85, 0.7],
        duration: 2000,
      },
    };

    const config = configs[animationState] || configs.idle;

    anime({
      targets: paths,
      strokeWidth: config.strokeWidth,
      opacity: config.opacity,
      duration: config.duration,
      loop: true,
      easing: 'easeInOutSine',
      delay: anime.stagger(40),
    });

    return () => anime.remove(paths);
  }, [animationState]);

  // Highlight active agent segment
  useEffect(() => {
    if (!segmentsRef.current || !activeAgent) return;

    const paths = segmentsRef.current.querySelectorAll('path');
    const activePath = segmentsRef.current.querySelector(`path[data-agent="${activeAgent}"]`);

    if (activePath) {
      anime.remove(activePath);
      anime({
        targets: activePath,
        strokeWidth: [4, 6, 4],
        opacity: [1, 1, 1],
        duration: 500,
        loop: true,
        easing: 'easeInOutSine',
      });
    }

    return () => {
      if (activePath) anime.remove(activePath);
    };
  }, [activeAgent]);

  // Outer glow animation based on state
  useEffect(() => {
    if (prefersReducedMotion() || !glowRef.current) return;

    const glowConfigs = {
      speaking: { scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6], duration: 400 },
      thinking: { scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4], duration: 1000 },
      success: { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8], duration: 500 },
      idle: { scale: [1, 1.03, 1], opacity: [0.2, 0.35, 0.2], duration: 3000 },
    };

    const config = glowConfigs[animationState] || glowConfigs.idle;

    anime.remove(glowRef.current);
    anime({
      targets: glowRef.current,
      scale: config.scale,
      opacity: config.opacity,
      duration: config.duration,
      loop: true,
      easing: 'easeInOutSine',
    });

    return () => anime.remove(glowRef.current);
  }, [animationState]);

  // Initialize particles
  useEffect(() => {
    const st = stateRef.current;
    const N = 18; // More particles for richer visualization
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
        s: 0.5 + rand(i + 23) * 0.7,
        hue: rand(i + 31) * 60 + 250, // Purple-ish hue variation
      };
    });
  }, [size, innerR, r]);

  // Canvas animation for inner visualization - synchronized with mood/level
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;

      st.time += 0.016;

      // Smoothly interpolate to target level
      const targetLevel = level || 0.18;
      st.currentLevel += (targetLevel - st.currentLevel) * 0.05;

      const cx = size / 2;
      const cy = size / 2;
      const intensity = st.currentLevel;

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
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fill();

      // Clip to inner circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.clip();

      // Purple gradient - intensity based on level
      const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, innerR);
      const baseAlpha = 0.3 + intensity * 0.4;
      g.addColorStop(0, `rgba(168,85,247,${baseAlpha})`);
      g.addColorStop(0.5, `rgba(139,92,246,${baseAlpha * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Update and draw particles - speed based on level
      const speedBoost = 0.5 + intensity * 1.5;
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];

        // Orbital motion - faster when active
        const dx = a.x - cx;
        const dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.003 * speedBoost;
        const pr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + pr * Math.cos(ang) - a.x) * 0.002 * speedBoost;
        a.vy += (cy + pr * Math.sin(ang) - a.y) * 0.002 * speedBoost;

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

        // Draw links - more visible when active
        const linkOpacityBase = 0.15 + intensity * 0.3;
        for (let j = i + 1; j < st.particles.length; j++) {
          const b = st.particles[j];
          const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
          if (dist < 12) {
            const o = (1 - dist / 12) * linkOpacityBase;
            ctx.strokeStyle = `rgba(255,255,255,${o})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw dots - brighter when active
      ctx.globalCompositeOperation = 'lighter';
      const dotOpacity = 0.2 + intensity * 0.4;
      for (const p of st.particles) {
        ctx.fillStyle = `rgba(255,255,255,${dotOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * (0.8 + intensity * 0.4), 0, Math.PI * 2);
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
  }, [size, level, innerR]);

  // Get active agent color for glow
  const activeAgentColor = activeAgent
    ? AGENT_SEGMENTS.find(s => s.id === activeAgent)?.color || '#a855f7'
    : '#a855f7';

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* Outer glow halo */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${activeAgentColor}40 0%, transparent 70%)`,
          transform: 'scale(1.2)',
          opacity: 0.3,
        }}
      />

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
              strokeWidth={3}
              strokeLinecap="round"
              opacity={activeAgent === segment.id ? 1 : 0.75}
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

      {/* Success flash overlay */}
      {showSuccess && (
        <div
          className="absolute inset-0 rounded-full bg-green-500/30 animate-ping"
          style={{ animationDuration: '0.5s' }}
        />
      )}
    </div>
  );
}
