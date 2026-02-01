// FINANCE Design Tokens
// Finance Module - Design System Specification

// ─── Colors ───────────────────────────────────────────────

export const FINANCE_COLORS = {
  primary: {
    DEFAULT: '#3B82F6', // blue-500
    shade: '#2563EB',   // blue-600
    light: '#60A5FA',   // blue-400
    tint10: 'rgba(59, 130, 246, 0.1)',
    tint15: 'rgba(59, 130, 246, 0.15)',
    tint20: 'rgba(59, 130, 246, 0.2)',
  },
} as const;

// ─── Component Tokens ─────────────────────────────────────

export const FINANCE_BUTTON_STYLES = {
  sizes: {
    sm: 'h-8 px-4 text-xs',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-7 text-base',
  },
  variants: {
    primary: 'bg-blue-500 text-white hover:bg-blue-400 active:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed rounded-full transition-colors duration-200',
    secondary: 'bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50 active:bg-zinc-800 rounded-full transition-colors duration-200',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-full transition-colors duration-200',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-full transition-colors duration-200',
  },
} as const;

export const FINANCE_CARD_STYLES = {
  base: 'bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-6 backdrop-blur-sm',
  hover: 'hover:border-zinc-700/60 hover:bg-zinc-900/60 transition-all duration-200',
  interactive: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
} as const;

export const FINANCE_BADGE_STYLES = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  variants: {
    primary: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    success: 'bg-green-500/10 text-green-400 border border-green-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    error: 'bg-red-500/10 text-red-400 border border-red-500/30',
    neutral: 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30',
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
