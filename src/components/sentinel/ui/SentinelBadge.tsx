import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'prohibited'
  | 'highRisk'
  | 'gpai'
  | 'limitedRisk'
  | 'minimalRisk';

interface SentinelBadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

// Unified muted palette — no circus of colors.
// Risk classifications use subtle zinc/emerald tones with text differentiation.
const darkStyles: Record<BadgeVariant, string> = {
  primary: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-zinc-700/40 text-yellow-400 border-zinc-600/40',
  error: 'bg-zinc-700/40 text-red-400 border-zinc-600/40',
  neutral: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
  prohibited: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
  highRisk: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
  gpai: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
  limitedRisk: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40',
  minimalRisk: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const lightStyles: Record<BadgeVariant, string> = {
  primary: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-slate-100 text-slate-700 border-slate-200',
  error: 'bg-slate-100 text-red-600 border-slate-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  prohibited: 'bg-slate-100 text-slate-700 border-slate-300',
  highRisk: 'bg-slate-100 text-slate-700 border-slate-300',
  gpai: 'bg-slate-100 text-slate-700 border-slate-300',
  limitedRisk: 'bg-slate-100 text-slate-600 border-slate-200',
  minimalRisk: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function SentinelBadge({
  variant = 'neutral',
  size = 'md',
  className,
  children,
}: SentinelBadgeProps) {
  const { theme } = useTheme();
  const styles = theme === 'light' ? lightStyles : darkStyles;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
