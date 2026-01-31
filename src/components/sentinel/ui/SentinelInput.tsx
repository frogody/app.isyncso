import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface SentinelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  variant?: 'default' | 'search';
}

export const SentinelInput = forwardRef<HTMLInputElement, SentinelInputProps>(
  function SentinelInput({ error, label, variant = 'default', className, ...props }, ref) {
    const { st } = useSentinelTheme();

    return (
      <div className="w-full">
        {label && (
          <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))} htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          {variant === 'search' && (
            <Search className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
          )}
          <input
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id || 'input'}-error` : undefined}
            className={cn(
              'w-full h-11 border rounded-xl px-4 text-sm',
              st('bg-white text-slate-900', 'bg-zinc-900/40 text-white'),
              st('placeholder:text-slate-400', 'placeholder:text-zinc-500'),
              st(
                'focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20',
                'focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20',
              ),
              'transition-all duration-200',
              error ? 'border-red-500/50' : st('border-slate-300', 'border-zinc-800/60'),
              variant === 'search' && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p id={`${props.id || 'input'}-error`} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
