/**
 * MeetSync-inspired design tokens for Sentinel.
 * Used by the SentinelThemeContext `st()` helper for light/dark class switching.
 * These are reference values — actual styling uses Tailwind classes.
 */

export const SENTINEL_LIGHT = {
  // Page backgrounds
  pageBg: 'bg-[#F8FAFC]',
  cardBg: 'bg-white',
  cardBorder: 'border-[#F1F5F9]',
  cardShadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
  cardHoverShadow: 'hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
  cardRadius: 'rounded-2xl',

  // Primary accent (purple)
  primaryBg: 'bg-purple-600',
  primaryHoverBg: 'hover:bg-purple-700',
  primaryText: 'text-purple-600',
  primaryLightBg: 'bg-purple-50',
  primaryLightBorder: 'border-purple-100',
  primaryGradient: 'bg-gradient-to-r from-purple-600 to-purple-500',

  // Text
  textPrimary: 'text-slate-800',
  textSecondary: 'text-slate-500',
  textTertiary: 'text-slate-400',
  textInverse: 'text-white',

  // Borders
  borderLight: 'border-slate-100',
  borderDefault: 'border-slate-200',

  // Inputs
  inputBg: 'bg-slate-50',
  inputBorder: 'border-slate-200',
  inputFocus: 'focus:ring-purple-500/20 focus:border-purple-400',
} as const;

export const SENTINEL_DARK = {
  pageBg: 'bg-black',
  cardBg: 'bg-zinc-900/50',
  cardBorder: 'border-zinc-800/60',
  cardShadow: '',
  cardHoverShadow: '',
  cardRadius: 'rounded-[20px]',

  primaryBg: 'bg-sky-500',
  primaryHoverBg: 'hover:bg-sky-600',
  primaryText: 'text-sky-400',
  primaryLightBg: 'bg-sky-500/10',
  primaryLightBorder: 'border-sky-500/20',
  primaryGradient: 'bg-sky-500',

  textPrimary: 'text-white',
  textSecondary: 'text-zinc-400',
  textTertiary: 'text-zinc-500',
  textInverse: 'text-white',

  borderLight: 'border-zinc-800/40',
  borderDefault: 'border-zinc-800/60',

  inputBg: 'bg-zinc-900/40',
  inputBorder: 'border-zinc-800/60',
  inputFocus: 'focus:ring-sky-500/20 focus:border-sky-500/50',
} as const;
