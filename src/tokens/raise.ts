// RAISE Design Tokens
// Fundraising Module - Design System Specification

// --- Colors ---

export const RAISE_COLORS = {
  primary: {
    DEFAULT: '#FB923C',
    shade: '#F97316',
    light: '#FDBA74',
    tint10: 'rgba(251, 146, 60, 0.1)',
    tint15: 'rgba(251, 146, 60, 0.15)',
    tint20: 'rgba(251, 146, 60, 0.2)',
  },
} as const;

export const RAISE_NEUTRAL_TOKENS = {
  bg: {
    page: '#000000',
    surface: 'rgba(24, 24, 27, 0.5)',
    elevated: 'rgba(39, 39, 42, 0.6)',
    input: 'rgba(39, 39, 42, 0.4)',
    hover: 'rgba(63, 63, 70, 0.3)',
  },
  border: {
    default: 'rgba(63, 63, 70, 0.6)',
    subtle: 'rgba(63, 63, 70, 0.3)',
    focus: 'rgba(251, 146, 60, 0.5)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D4D4D8',
    muted: '#A1A1AA',
    disabled: '#71717A',
  },
} as const;

export const RAISE_SEMANTIC_COLORS = {
  success: {
    DEFAULT: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.1)',
    text: '#4ADE80',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  warning: {
    DEFAULT: '#EAB308',
    bg: 'rgba(234, 179, 8, 0.1)',
    text: '#FACC15',
    border: 'rgba(234, 179, 8, 0.3)',
  },
  error: {
    DEFAULT: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#F87171',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  info: {
    DEFAULT: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#60A5FA',
    border: 'rgba(59, 130, 246, 0.3)',
  },
} as const;

// --- Typography ---

export const RAISE_TYPOGRAPHY = {
  fontFamily: {
    display: '"SF Pro Display", "Inter", system-ui, sans-serif',
    body: '"Inter", "SF Pro Text", system-ui, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace',
  },
} as const;

export const RAISE_TEXT_STYLES = {
  h1: 'text-3xl font-semibold',
  h2: 'text-2xl font-semibold',
  h3: 'text-lg font-medium',
  h4: 'text-base font-medium',
  bodyLg: 'text-base',
  body: 'text-sm',
  bodySm: 'text-xs',
  label: 'text-xs font-medium uppercase tracking-wider',
  caption: 'text-[11px] font-medium',
} as const;

// --- Spacing ---

export const RAISE_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

// --- Border Radius ---

export const RAISE_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '20px',
  full: '9999px',
} as const;

// --- Shadows ---

export const RAISE_SHADOWS = {
  none: 'none',
  sm: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0px 12px 24px rgba(0, 0, 0, 0.12)',
  glow: '0 0 20px rgba(251, 146, 60, 0.15)',
  glowStrong: '0 0 30px rgba(251, 146, 60, 0.25)',
} as const;

// --- Component Tokens ---

export const RAISE_BUTTON_STYLES = {
  sizes: {
    sm: 'h-8 px-4 text-xs',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-7 text-base',
  },
} as const;

export const RAISE_CARD_STYLES = {
  base: 'border rounded-[20px] backdrop-blur-sm',
  hover: 'transition-all duration-200',
  interactive: 'cursor-pointer',
} as const;

export const RAISE_BADGE_STYLES = {
  base: 'inline-flex items-center rounded-full border font-medium',
} as const;

// --- Animation Tokens (Framer Motion) ---

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
  stagger: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.08,
        },
      },
    },
    item: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
    },
  },
} as const;
