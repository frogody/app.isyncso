import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

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
    const { st } = useSentinelTheme();

    return (
      <motion.button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200',
          {
            'h-8 px-4 text-xs': size === 'sm',
            'h-10 px-6 text-sm': size === 'md',
            'h-12 px-7 text-base': size === 'lg',
          },
          {
            [st(
              'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-[0_2px_8px_rgba(147,51,234,0.3)] hover:shadow-[0_4px_16px_rgba(147,51,234,0.4)] hover:from-purple-700 hover:to-purple-600',
              'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700',
            )]: variant === 'primary',
            [st(
              'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300',
              'bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50',
            )]: variant === 'secondary',
            [st(
              'bg-transparent text-slate-500 hover:text-purple-600 hover:bg-purple-50',
              'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30',
            )]: variant === 'ghost',
            [st(
              'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
              'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
            )]: variant === 'danger',
          },
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          st(
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
          ),
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
