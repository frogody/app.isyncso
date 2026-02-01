import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

export type RaiseBadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

interface RaiseBadgeProps {
  variant?: RaiseBadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const darkStyles: Record<RaiseBadgeVariant, string> = {
  primary: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  success: 'bg-green-500/10 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
  neutral: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
};

const lightStyles: Record<RaiseBadgeVariant, string> = {
  primary: 'bg-orange-50 text-orange-700 border-orange-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-50 text-red-600 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function RaiseBadge({
  variant = 'neutral',
  size = 'md',
  className,
  children,
}: RaiseBadgeProps) {
  const { theme } = useTheme();
  const styles = theme === 'light' ? lightStyles : darkStyles;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
