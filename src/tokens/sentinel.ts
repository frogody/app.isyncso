// SENTINEL Design Tokens
// EU AI Act Compliance Module - Design System Specification
// Reference: .claude/agents/sentinel-transform/DESIGN_TOKENS.md

// ─── Colors ───────────────────────────────────────────────

export const SENTINEL_COLORS = {
  primary: {
    DEFAULT: '#0EA5E9',
    shade: '#0284C7',
    light: '#38BDF8',
    tint10: 'rgba(14, 165, 233, 0.1)',
    tint15: 'rgba(14, 165, 233, 0.15)',
    tint20: 'rgba(14, 165, 233, 0.2)',
  },
} as const;

export const NEUTRAL_TOKENS = {
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
    focus: 'rgba(14, 165, 233, 0.5)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D4D4D8',
    muted: '#A1A1AA',
    disabled: '#71717A',
  },
} as const;

export const SEMANTIC_COLORS = {
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

export const RISK_COLORS = {
  prohibited: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#F87171',
    border: 'rgba(239, 68, 68, 0.4)',
  },
  highRisk: {
    bg: 'rgba(249, 115, 22, 0.15)',
    text: '#FB923C',
    border: 'rgba(249, 115, 22, 0.4)',
  },
  gpai: {
    bg: 'rgba(168, 85, 247, 0.15)',
    text: '#C084FC',
    border: 'rgba(168, 85, 247, 0.4)',
  },
  limitedRisk: {
    bg: 'rgba(234, 179, 8, 0.15)',
    text: '#FACC15',
    border: 'rgba(234, 179, 8, 0.4)',
  },
  minimalRisk: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#4ADE80',
    border: 'rgba(34, 197, 94, 0.4)',
  },
  unclassified: {
    bg: 'rgba(161, 161, 170, 0.15)',
    text: '#A1A1AA',
    border: 'rgba(161, 161, 170, 0.4)',
  },
} as const;

// ─── Typography ───────────────────────────────────────────

export const TYPOGRAPHY = {
  fontFamily: {
    display: '"SF Pro Display", "Inter", system-ui, sans-serif',
    body: '"Inter", "SF Pro Text", system-ui, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }] as const,
    sm: ['0.875rem', { lineHeight: '1.25rem' }] as const,
    base: ['1rem', { lineHeight: '1.5rem' }] as const,
    lg: ['1.125rem', { lineHeight: '1.75rem' }] as const,
    xl: ['1.25rem', { lineHeight: '1.75rem' }] as const,
    '2xl': ['1.5rem', { lineHeight: '2rem' }] as const,
    '3xl': ['2rem', { lineHeight: '2.25rem' }] as const,
    '4xl': ['2.5rem', { lineHeight: '2.5rem' }] as const,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const TEXT_STYLES = {
  h1: 'text-3xl font-semibold text-white',
  h2: 'text-2xl font-semibold text-white',
  h3: 'text-lg font-medium text-white',
  h4: 'text-base font-medium text-white',
  bodyLg: 'text-base text-zinc-300',
  body: 'text-sm text-zinc-300',
  bodySm: 'text-xs text-zinc-400',
  label: 'text-xs font-medium text-zinc-400 uppercase tracking-wider',
  caption: 'text-[11px] font-medium text-zinc-500',
} as const;

// ─── Spacing ──────────────────────────────────────────────

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

// ─── Border Radius ────────────────────────────────────────

export const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '20px',
  full: '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────

export const SHADOWS = {
  none: 'none',
  sm: '0px 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0px 12px 24px rgba(0, 0, 0, 0.12)',
  glow: '0 0 20px rgba(14, 165, 233, 0.15)',
  glowStrong: '0 0 30px rgba(14, 165, 233, 0.25)',
} as const;

// ─── Component Tokens ─────────────────────────────────────

export const BUTTON_STYLES = {
  sizes: {
    sm: 'h-8 px-4 text-xs',
    md: 'h-10 px-6 text-sm',
    lg: 'h-12 px-7 text-base',
  },
  variants: {
    primary: 'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 disabled:bg-sky-500/50 disabled:cursor-not-allowed rounded-full transition-colors duration-200',
    secondary: 'bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50 active:bg-zinc-800 rounded-full transition-colors duration-200',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-full transition-colors duration-200',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-full transition-colors duration-200',
  },
} as const;

export const CARD_STYLES = {
  base: 'bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-6 backdrop-blur-sm',
  hover: 'hover:border-zinc-700/60 hover:bg-zinc-900/60 transition-all duration-200',
  interactive: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
} as const;

export const INPUT_STYLES = {
  base: 'h-11 bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200',
} as const;

export const BADGE_STYLES = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  variants: {
    primary: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
    success: 'bg-green-500/10 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
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
  progressRing: {
    initial: { pathLength: 0 },
    animate: (value: number) => ({
      pathLength: value / 100,
      transition: { duration: 1, ease: 'easeOut' },
    }),
  },
} as const;

// ─── Risk Classification Types ────────────────────────────

export type RiskClassification =
  | 'prohibited'
  | 'high-risk'
  | 'gpai'
  | 'limited-risk'
  | 'minimal-risk'
  | 'unclassified';

export type ComplianceStatus =
  | 'not-started'
  | 'in-progress'
  | 'compliant'
  | 'non-compliant';

export type DeploymentContext =
  | 'internal'
  | 'customer-facing'
  | 'embedded-in-product';

export interface AISystemRecord {
  id: string;
  name: string;
  description: string;
  purpose: string;
  deployment_context: DeploymentContext;
  ai_techniques: string[];
  data_inputs: string;
  decision_impact: string;
  provider_name: string;
  provider_url: string;
  product_url: string;
  company_id: string;
  created_by: string;
  risk_classification: RiskClassification;
  classification_reasoning: string;
  assessment_answers: Record<string, unknown>;
  compliance_status: ComplianceStatus;
  created_date: string;
  vendor: string;
}

/** Map risk classification key to RISK_COLORS entry */
export const riskColorMap: Record<RiskClassification, keyof typeof RISK_COLORS> = {
  'prohibited': 'prohibited',
  'high-risk': 'highRisk',
  'gpai': 'gpai',
  'limited-risk': 'limitedRisk',
  'minimal-risk': 'minimalRisk',
  'unclassified': 'unclassified',
};
