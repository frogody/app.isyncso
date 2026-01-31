import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SentinelButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const SentinelButton = forwardRef<HTMLButtonElement, SentinelButtonProps>(
  function SentinelButton(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200',
          {
            'h-8 px-4 text-xs': size === 'sm',
            'h-10 px-6 text-sm': size === 'md',
            'h-12 px-7 text-base': size === 'lg',
          },
          {
            'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700': variant === 'primary',
            'bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50': variant === 'secondary',
            'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30': variant === 'ghost',
            'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20': variant === 'danger',
          },
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
          className
        )}
        disabled={disabled || loading}
        whileHover={disabled || loading ? undefined : { scale: 1.02 }}
        whileTap={disabled || loading ? undefined : { scale: 0.98 }}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </motion.button>
    );
  }
);
