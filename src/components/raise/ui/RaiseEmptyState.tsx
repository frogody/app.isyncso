import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { RaiseButton } from './RaiseButton';

interface RaiseEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function RaiseEmptyState({
  icon,
  title,
  message,
  action,
  actionLabel,
  onAction,
  className,
}: RaiseEmptyStateProps) {
  const { rt } = useTheme();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
            rt('bg-slate-100 text-slate-400', 'bg-zinc-800/60 text-zinc-500'),
          )}
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          'text-sm font-medium mb-1',
          rt('text-slate-900', 'text-white'),
        )}
      >
        {title}
      </h3>
      {message && (
        <p
          className={cn(
            'text-xs max-w-[280px] mb-4',
            rt('text-slate-400', 'text-zinc-500'),
          )}
        >
          {message}
        </p>
      )}
      {(action || (actionLabel && onAction)) && (
        <RaiseButton size="sm" onClick={action?.onClick || onAction} icon={action?.icon}>
          {action?.label || actionLabel}
        </RaiseButton>
      )}
    </div>
  );
}
