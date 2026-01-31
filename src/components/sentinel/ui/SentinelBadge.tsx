import { cn } from '@/lib/utils';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

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

const darkStyles: Record<BadgeVariant, string> = {
  primary: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
  neutral: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
  prohibited: 'bg-red-500/15 text-red-400 border-red-500/40',
  highRisk: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  gpai: 'bg-purple-500/15 text-purple-400 border-purple-500/40',
  limitedRisk: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  minimalRisk: 'bg-green-500/15 text-green-400 border-green-500/40',
};

const lightStyles: Record<BadgeVariant, string> = {
  primary: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  prohibited: 'bg-red-100 text-red-700 border-red-200',
  highRisk: 'bg-orange-100 text-orange-700 border-orange-200',
  gpai: 'bg-purple-100 text-purple-700 border-purple-200',
  limitedRisk: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  minimalRisk: 'bg-green-100 text-green-700 border-green-200',
};

export function SentinelBadge({
  variant = 'neutral',
  size = 'md',
  className,
  children,
}: SentinelBadgeProps) {
  const { theme } = useSentinelTheme();
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
