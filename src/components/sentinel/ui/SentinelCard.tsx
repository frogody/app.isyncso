import { useCallback } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface SentinelCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function SentinelCard({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
  ...props
}: SentinelCardProps) {
  const { st, theme } = useSentinelTheme();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (variant === 'interactive' && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        (onClick as (e: any) => void)(e);
      }
    },
    [variant, onClick],
  );

  return (
    <motion.div
      role={variant === 'interactive' ? 'button' : undefined}
      tabIndex={variant === 'interactive' ? 0 : undefined}
      onKeyDown={variant === 'interactive' ? handleKeyDown : undefined}
      onClick={onClick}
      className={cn(
        'relative',
        st(
          'bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
          'bg-zinc-900/50 rounded-[20px] border border-zinc-800/60 backdrop-blur-sm',
        ),
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-5': padding === 'md',
          'p-8': padding === 'lg',
        },
        {
          [st(
            'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-200',
            'hover:border-zinc-700/60 transition-colors duration-200',
          )]: variant === 'default',
          [cn(
            'cursor-pointer transition-all duration-200',
            st(
              'hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30',
              'hover:bg-zinc-900/60 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
            ),
          )]: variant === 'interactive',
          [st(
            'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
            'bg-zinc-800/60 shadow-lg',
          )]: variant === 'elevated',
        },
        className
      )}
      whileHover={variant === 'interactive' ? (theme === 'light' ? { y: -2 } : { scale: 1.02 }) : undefined}
      whileTap={variant === 'interactive' ? (theme === 'light' ? { y: 0 } : { scale: 0.98 }) : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SentinelCardSkeleton({ className }: { className?: string }) {
  const { st } = useSentinelTheme();
  return (
    <div
      className={cn(
        'p-6 animate-pulse',
        st(
          'bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
          'bg-zinc-900/50 rounded-[20px] border border-zinc-800/60',
        ),
        className
      )}
    >
      <div className={cn('h-4 w-24 rounded mb-4', st('bg-slate-100', 'bg-zinc-800'))} />
      <div className={cn('h-8 w-16 rounded mb-2', st('bg-slate-100', 'bg-zinc-800'))} />
      <div className={cn('h-3 w-32 rounded', st('bg-slate-100', 'bg-zinc-800'))} />
    </div>
  );
}
