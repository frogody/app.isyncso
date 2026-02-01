import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRaiseTheme } from '@/contexts/RaiseThemeContext';

interface RaiseButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
  > {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const RaiseButton = forwardRef<HTMLButtonElement, RaiseButtonProps>(
  function RaiseButton(
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
    ref,
  ) {
    const { rt } = useRaiseTheme();

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
            [rt(
              'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700',
              'bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600',
            )]: variant === 'primary',
            [rt(
              'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-100',
              'bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50',
            )]: variant === 'secondary',
            [rt(
              'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100',
              'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30',
            )]: variant === 'ghost',
            'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20':
              variant === 'danger',
          },
          'disabled:opacity-50 disabled:cursor-not-allowed',
          rt(
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
          ),
          className,
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
  },
);
