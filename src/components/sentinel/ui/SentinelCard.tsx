import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  ...props
}: SentinelCardProps) {
  return (
    <motion.div
      className={cn(
        'bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] backdrop-blur-sm',
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        {
          'hover:border-zinc-700/60 transition-colors duration-200': variant === 'default',
          'cursor-pointer hover:bg-zinc-900/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200': variant === 'interactive',
          'bg-zinc-800/60 shadow-lg': variant === 'elevated',
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

export function SentinelCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-6 animate-pulse',
        className
      )}
    >
      <div className="h-4 w-24 bg-zinc-800 rounded mb-4" />
      <div className="h-8 w-16 bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-32 bg-zinc-800 rounded" />
    </div>
  );
}
