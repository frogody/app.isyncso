// SYNC Design Tokens
// SYNC Module - Design System Specification

// ─── Colors ───────────────────────────────────────────────

export const SYNC_COLORS = {
  primary: {
    DEFAULT: '#06B6D4', // cyan-500
    shade: '#0891B2',   // cyan-600
    light: '#22D3EE',   // cyan-400
    tint10: 'rgba(6, 182, 212, 0.1)',
    tint15: 'rgba(6, 182, 212, 0.15)',
    tint20: 'rgba(6, 182, 212, 0.2)',
  },
} as const;

// ─── Animation Tokens (Framer Motion) ─────────────────────

export const MOTION_VARIANTS = {
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  card: {
    rest: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 },
  },
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  },
} as const;
