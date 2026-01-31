import { cn } from '@/lib/utils';

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

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
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

export function SentinelBadge({
  variant = 'neutral',
  size = 'md',
  className,
  children,
}: SentinelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
