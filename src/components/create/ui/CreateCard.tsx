import { useCallback } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCreateTheme } from '@/contexts/CreateThemeContext';

interface CreateCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function CreateCard({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
  ...props
}: CreateCardProps) {
  const { ct } = useCreateTheme();

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
        'relative rounded-[20px] backdrop-blur-sm',
        ct(
          'bg-white border border-slate-200 shadow-sm',
          'bg-zinc-900/50 border border-zinc-800/60',
        ),
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        {
          [ct('hover:border-slate-300', 'hover:border-zinc-700/60') + ' transition-colors duration-200']: variant === 'default',
          ['cursor-pointer ' + ct('hover:bg-slate-50 hover:shadow-md', 'hover:bg-zinc-900/60') + ' hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ' + ct('focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500/50', 'focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500/50') + ' transition-all duration-200']: variant === 'interactive',
          [ct('bg-slate-50 shadow-md', 'bg-zinc-800/60 shadow-lg')]: variant === 'elevated',
        },
        className
      )}
      whileHover={variant === 'interactive' ? { scale: 1.02 } : undefined}
      whileTap={variant === 'interactive' ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CreateCardSkeleton({ className }: { className?: string }) {
  const { ct } = useCreateTheme();
  return (
    <div
      className={cn(
        'rounded-[20px] p-6 animate-pulse',
        ct('bg-white border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60'),
        className
      )}
    >
      <div className={cn('h-4 w-24 rounded mb-4', ct('bg-slate-200', 'bg-zinc-800'))} />
      <div className={cn('h-8 w-16 rounded mb-2', ct('bg-slate-200', 'bg-zinc-800'))} />
      <div className={cn('h-3 w-32 rounded', ct('bg-slate-200', 'bg-zinc-800'))} />
    </div>
  );
}
