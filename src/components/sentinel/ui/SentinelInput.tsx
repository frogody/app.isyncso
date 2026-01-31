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
          <label className={cn('block text-xs font-semibold uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))} htmlFor={props.id}>
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
              'w-full h-11 rounded-xl px-4 text-sm transition-all duration-200',
              st(
                'bg-slate-50 text-slate-800 border border-transparent placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-purple-300 focus:ring-2 focus:ring-purple-500/15',
                'bg-zinc-900/40 text-white border border-zinc-800/60 placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20',
              ),
              error && st('border-red-300 focus:border-red-400 focus:ring-red-500/15', 'border-red-500/50'),
              variant === 'search' && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p id={`${props.id || 'input'}-error`} role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
