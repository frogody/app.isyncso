import React, { useRef, useEffect, useMemo, useState } from 'react';
import anime from '@/lib/anime-wrapper';
import { cn } from '@/lib/utils';
import { useSyncState } from '@/components/context/SyncStateContext';
import { useActiveAppSegments } from '@/hooks/useActiveAppSegments';
import { useUser } from '@/components/context/UserContext';
import { getAgentColor } from '@/lib/appColors';
import { User } from 'lucide-react';

// Check for reduced motion preference
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function SyncAvatarMini({ size = 48, className = '' }) {
  // Get synchronized state from context
  const syncState = useSyncState();
  const { mood, level, activeAgent, isProcessing, showSuccess } = syncState;

  const { user } = useUser();
  const { segments } = useActiveAppSegments();

  const segmentsRef = useRef(null);
  const glowRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  const avatarUrl = user?.avatar_url || null;

  // Derive animation state from sync state
  const animationState = useMemo(() => {
    if (showSuccess) return 'success';
    if (mood === 'knocking') return 'knocking';
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

    const configs = {
      knocking: {
        strokeWidth: [3, 6, 3],
        opacity: [0.8, 1, 0.8],
        duration: 300,
      },
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
  }, [animationState, segments.length]);

  // Highlight active agent segment
  useEffect(() => {
    if (!segmentsRef.current || !activeAgent) return;

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
      knocking: { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5], duration: 300 },
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

  // Get active agent color for glow — amber when knocking
  const activeAgentColor = mood === 'knocking'
    ? '#f59e0b'
    : activeAgent
      ? getAgentColor(activeAgent)
      : '#a855f7';

  // Avatar photo diameter
  const avatarSize = Math.round(innerR * 2 - 4);

  return (
    <div className={cn('relative', mood === 'knocking' && 'knock-shake', className)} style={{ width: size, height: size }}>
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
          <clipPath id={`avatarClip-${size}`}>
            <circle cx={r} cy={r} r={innerR - 2} />
          </clipPath>
        </defs>

        {/* Base ring (visible when no/few segments) */}
        <circle
          cx={r}
          cy={r}
          r={segmentR}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
        />

        {/* Colored segments - dynamic from user's active apps */}
        <g ref={segmentsRef} filter="url(#miniGlow)">
          {segments.map((segment) => (
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

        {/* Inner dark circle background */}
        <circle cx={r} cy={r} r={innerR} fill="rgba(0,0,0,0.6)" />

        {/* User avatar image or fallback */}
        {avatarUrl && !imgError ? (
          <image
            href={avatarUrl}
            x={r - innerR + 2}
            y={r - innerR + 2}
            width={avatarSize}
            height={avatarSize}
            clipPath={`url(#avatarClip-${size})`}
            preserveAspectRatio="xMidYMid slice"
            onError={() => setImgError(true)}
          />
        ) : (
          <>
            {/* Fallback gradient */}
            <circle cx={r} cy={r} r={innerR - 2} fill="url(#fallbackGrad)" />
            <defs>
              <linearGradient id="fallbackGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            {/* Fallback user icon */}
            <g transform={`translate(${r - 6}, ${r - 6})`}>
              <path
                d="M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4z"
                fill="rgba(255,255,255,0.7)"
              />
            </g>
          </>
        )}
      </svg>

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
