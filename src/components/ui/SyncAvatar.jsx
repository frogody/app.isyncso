
import React from "react";
import { motion } from "framer-motion";

const SyncAvatar = ({ size = 40, className = "", variant = "default" }) => {
  // Define color schemes
  const colors = variant === "grey" ? {
    // Grey variant - much darker and more subtle
    innerGradient1: [
      { offset: '0%', color: '#FFFFFF', opacity: 0.35 },
      { offset: '25%', color: '#F8FAFB', opacity: 0.3 },
      { offset: '50%', color: '#E9F0F1', opacity: 0.25 },
      { offset: '75%', color: '#B5C0C4', opacity: 0.2 },
      { offset: '100%', color: '#9CA7AB', opacity: 0 }
    ],
    innerGradient2: [
      { offset: '0%', color: '#FFFFFF', opacity: 0.35 },
      { offset: '25%', color: '#F8FAFB', opacity: 0.3 },
      { offset: '50%', color: '#E9F0F1', opacity: 0.25 },
      { offset: '75%', color: '#B5C0C4', opacity: 0.2 },
      { offset: '100%', color: '#9CA7AB', opacity: 0 }
    ],
    outerGradient1: [
      { offset: '0%', color: '#FFFFFF', opacity: 0.35 },
      { offset: '20%', color: '#F8FAFB', opacity: 0.28 },
      { offset: '40%', color: '#E9F0F1', opacity: 0.2 },
      { offset: '70%', color: '#B5C0C4', opacity: 0.12 },
      { offset: '100%', color: '#9CA7AB', opacity: 0 }
    ],
    outerGradient2: [
      { offset: '0%', color: '#FFFFFF', opacity: 0.35 },
      { offset: '20%', color: '#F8FAFB', opacity: 0.25 },
      { offset: '40%', color: '#E9F0F1', opacity: 0.18 },
      { offset: '70%', color: '#B5C0C4', opacity: 0.1 },
      { offset: '100%', color: '#9CA7AB', opacity: 0 }
    ],
    centerGlow: 'radial-gradient(circle, rgba(248, 250, 251, 0.2) 0%, rgba(233, 240, 241, 0.15) 40%, transparent 70%)'
  } : variant === "green" ? {
    // Green variant
    innerGradient1: [
      { offset: '0%', color: '#4ADE80', opacity: 1 },
      { offset: '25%', color: '#22C55E', opacity: 0.98 },
      { offset: '50%', color: '#16A34A', opacity: 0.85 },
      { offset: '75%', color: '#15803D', opacity: 0.5 },
      { offset: '100%', color: '#14532D', opacity: 0 }
    ],
    innerGradient2: [
      { offset: '0%', color: '#4ADE80', opacity: 1 },
      { offset: '25%', color: '#22C55E', opacity: 0.98 },
      { offset: '50%', color: '#16A34A', opacity: 0.85 },
      { offset: '75%', color: '#15803D', opacity: 0.5 },
      { offset: '100%', color: '#14532D', opacity: 0 }
    ],
    outerGradient1: [
      { offset: '0%', color: '#4ADE80', opacity: 1 },
      { offset: '20%', color: '#22C55E', opacity: 0.8 },
      { offset: '40%', color: '#16A34A', opacity: 0.5 },
      { offset: '70%', color: '#15803D', opacity: 0.2 },
      { offset: '100%', color: '#14532D', opacity: 0 }
    ],
    outerGradient2: [
      { offset: '0%', color: '#4ADE80', opacity: 1 },
      { offset: '20%', color: '#22C55E', opacity: 0.7 },
      { offset: '40%', color: '#16A34A', opacity: 0.4 },
      { offset: '70%', color: '#15803D', opacity: 0.15 },
      { offset: '100%', color: '#14532D', opacity: 0 }
    ],
    centerGlow: 'radial-gradient(circle, rgba(74, 222, 128, 0.6) 0%, rgba(34, 197, 94, 0.3) 40%, transparent 70%)'
  } : {
    // Default red variant
    innerGradient1: [
      { offset: '0%', color: '#EF4444', opacity: 1 },
      { offset: '25%', color: '#DC2626', opacity: 0.98 },
      { offset: '50%', color: '#B91C1C', opacity: 0.85 },
      { offset: '75%', color: '#8B0000', opacity: 0.5 },
      { offset: '100%', color: '#4B0000', opacity: 0 }
    ],
    innerGradient2: [
      { offset: '0%', color: '#EF4444', opacity: 1 },
      { offset: '25%', color: '#DC2626', opacity: 0.98 },
      { offset: '50%', color: '#B91C1C', opacity: 0.85 },
      { offset: '75%', color: '#8B0000', opacity: 0.5 },
      { offset: '100%', color: '#4B0000', opacity: 0 }
    ],
    outerGradient1: [
      { offset: '0%', color: '#EF4444', opacity: 1 },
      { offset: '20%', color: '#DC2626', opacity: 0.8 },
      { offset: '40%', color: '#B91C1C', opacity: 0.5 },
      { offset: '70%', color: '#8B0000', opacity: 0.2 },
      { offset: '100%', color: '#4B0000', opacity: 0 }
    ],
    outerGradient2: [
      { offset: '0%', color: '#EF4444', opacity: 1 },
      { offset: '20%', color: '#DC2626', opacity: 0.7 },
      { offset: '40%', color: '#B91C1C', opacity: 0.4 },
      { offset: '70%', color: '#8B0000', opacity: 0.15 },
      { offset: '100%', color: '#4B0000', opacity: 0 }
    ],
    centerGlow: 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 0%, rgba(220, 38, 38, 0.3) 40%, transparent 70%)'
  };

  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        background: 'transparent'
      }}
    >
      {/* INNER Layer - TWO thick arc segments, orbits clockwise */}
      <motion.div
        className="absolute"
        style={{
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          transformOrigin: 'center center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: 1000
        }}
        animate={{
          rotate: [0, 360]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop"
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id={`neon-glow-inner-${variant}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id={`fade-gradient-inner-1-${variant}`} x1="50%" y1="0%" x2="50%" y2="100%">
              {colors.innerGradient1.map((stop, idx) => (
                <stop key={idx} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
              ))}
            </linearGradient>
            <linearGradient id={`fade-gradient-inner-2-${variant}`} x1="50%" y1="100%" x2="50%" y2="0%">
              {colors.innerGradient2.map((stop, idx) => (
                <stop key={idx} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
              ))}
            </linearGradient>
          </defs>
          {/* First thick arc - top position */}
          <path
            d="M 38 46 L 62 46 L 62 36 A 21 21 0 0 0 38 36 Z"
            fill={`url(#fade-gradient-inner-1-${variant})`}
            filter={`url(#neon-glow-inner-${variant})`}
            opacity="0.95"
            style={{ mixBlendMode: 'normal' }}
          />
          {/* Second thick arc - bottom position */}
          <path
            d="M 62 54 L 38 54 L 38 64 A 21 21 0 0 0 62 64 Z"
            fill={`url(#fade-gradient-inner-2-${variant})`}
            filter={`url(#neon-glow-inner-${variant})`}
            opacity="0.95"
            style={{ mixBlendMode: 'normal' }}
          />
        </svg>
      </motion.div>

      {/* OUTER Ring - TWO thick arcs, orbits counterclockwise */}
      <motion.div
        className="absolute"
        style={{
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          transformOrigin: 'center center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: 1000
        }}
        animate={{
          rotate: [0, -360]
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop"
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id={`neon-glow-outer-${variant}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id={`fade-gradient-outer-1-${variant}`} x1="50%" y1="0%" x2="50%" y2="100%">
              {colors.outerGradient1.map((stop, idx) => (
                <stop key={idx} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
              ))}
            </linearGradient>
            <linearGradient id={`fade-gradient-outer-2-${variant}`} x1="50%" y1="100%" x2="50%" y2="0%">
              {colors.outerGradient2.map((stop, idx) => (
                <stop key={idx} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
              ))}
            </linearGradient>
          </defs>
          {/* First outer arc - moved closer to center */}
          <path
            d="M 29 45 L 32 45 L 32 38 A 22 22 0 0 0 68 38 L 68 45 L 71 45 L 71 32 A 23 23 0 0 0 29 32 Z"
            fill={`url(#fade-gradient-outer-1-${variant})`}
            filter={`url(#neon-glow-outer-${variant})`}
            opacity="0.9"
            style={{ mixBlendMode: 'normal' }}
          />
          {/* Second outer arc - moved closer to center */}
          <path
            d="M 68 55 L 63 55 L 63 62 A 25 25 0 0 0 37 62 L 37 55 L 32 55 L 32 73 A 28 28 0 0 0 68 73 Z"
            fill={`url(#fade-gradient-outer-2-${variant})`}
            filter={`url(#neon-glow-outer-${variant})`}
            opacity="0.9"
            style={{ mixBlendMode: 'normal' }}
          />
        </svg>
      </motion.div>

      {/* Center glow - enhanced for larger sizes */}
      <motion.div
        className="absolute"
        style={{
          width: '18%',
          height: '18%',
          top: '41%',
          left: '41%',
          borderRadius: '50%',
          background: colors.centerGlow,
          filter: 'blur(4px)'
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default SyncAvatar;
