import { cn } from '@/lib/utils';
import { useCreateTheme } from '@/contexts/CreateThemeContext';

export type CreateBadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

interface CreateBadgeProps {
  variant?: CreateBadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const darkStyles: Record<CreateBadgeVariant, string> = {
  primary: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  success: 'bg-green-500/10 text-green-400 border border-green-500/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  error: 'bg-red-500/10 text-red-400 border border-red-500/30',
  neutral: 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30',
};

const lightStyles: Record<CreateBadgeVariant, string> = {
  primary: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export function CreateBadge({ variant = 'primary', size = 'sm', children, className }: CreateBadgeProps) {
  const { ct } = useCreateTheme();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        {
          'px-2 py-0.5 text-[10px]': size === 'sm',
          'px-2.5 py-0.5 text-xs': size === 'md',
        },
        ct(lightStyles[variant], darkStyles[variant]),
        className
      )}
    >
      {children}
    </span>
  );
}
