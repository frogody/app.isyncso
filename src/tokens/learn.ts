// LEARN Design Tokens
// Learn Module - Design System Specification

// ─── Colors ───────────────────────────────────────────────

export const LEARN_COLORS = {
  primary: {
    DEFAULT: '#14B8A6', // teal-500
    shade: '#0D9488',   // teal-600
    light: '#2DD4BF',   // teal-400
    tint10: 'rgba(20, 184, 166, 0.1)',
    tint15: 'rgba(20, 184, 166, 0.15)',
    tint20: 'rgba(20, 184, 166, 0.2)',
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
