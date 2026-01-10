import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

const AnimatedAvatar = ({ size = 48, state = 'idle', className = "" }) => {
  // State-based animation speeds
  const getAnimationDuration = (state) => {
    switch(state) {
      case 'idle': return '8s';     // Normal speed
      case 'active': return '2s';   // Faster
      case 'loading': return '3s';  // Slower with pulse
      default: return '8s';
    }
  };

  const duration = getAnimationDuration(state);
  const isLoading = state === 'loading';

  // Inject keyframes into document head once
  useEffect(() => {
    const styleId = 'animated-avatar-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes avatar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes avatar-morph {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          33% {
            transform: scale(1.1) rotate(45deg);
          }
          66% {
            transform: scale(0.9) rotate(-45deg);
          }
        }

        @keyframes avatar-pulse {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {/* Outer rotating gradient ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="absolute inset-0"
        style={{
          animation: `avatar-spin ${duration} linear infinite`,
        }}
      >
        <defs>
          <linearGradient id="rainbow-gradient" gradientTransform="rotate(0)">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="20%" stopColor="#ffa500" />
            <stop offset="40%" stopColor="#ffd700" />
            <stop offset="60%" stopColor="#00ff00" />
            <stop offset="80%" stopColor="#00bfff" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="avatar-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Gradient ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#rainbow-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity={isLoading ? 0.7 : 1}
          filter="url(#avatar-glow)"
        />
      </svg>

      {/* Inner glow background */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 107, 107, 0.15) 0%, transparent 70%)',
          animation: isLoading ? 'avatar-pulse 2s ease-in-out infinite' : 'none',
        }}
      />

      {/* Center diamond shape */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="absolute inset-0"
        style={{
          animation: `avatar-morph ${duration} ease-in-out infinite`,
          transformOrigin: 'center',
        }}
      >
        <defs>
          <linearGradient id="center-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor="#ff4444" />
          </linearGradient>
        </defs>

        {/* Center diamond */}
        <path
          d="M 50 30 L 65 50 L 50 70 L 35 50 Z"
          fill="url(#center-gradient)"
          opacity="0.9"
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
};

export default AnimatedAvatar;
