import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { CreateButton } from './CreateButton';

interface CreateEmptyStateProps {
  icon: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function CreateEmptyState({ icon: IconOrNode, title, message, action }: CreateEmptyStateProps) {
  const { ct } = useTheme();

  const isComponent = typeof IconOrNode === 'function';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={cn('p-4 rounded-2xl mb-4', ct('bg-slate-100', 'bg-zinc-800/60'))}>
        {isComponent ? (
          <IconOrNode className={cn('w-8 h-8', ct('text-slate-400', 'text-zinc-500'))} />
        ) : (
          IconOrNode
        )}
      </div>
      <h3 className={cn('text-lg font-semibold mb-1', ct('text-slate-900', 'text-white'))}>{title}</h3>
      <p className={cn('text-sm max-w-sm', ct('text-slate-500', 'text-zinc-400'))}>{message}</p>
      {action && (
        <CreateButton variant="primary" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </CreateButton>
      )}
    </div>
  );
}
