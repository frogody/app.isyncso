import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRaiseTheme } from '@/contexts/RaiseThemeContext';

interface RaiseCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

/** Drop-in replacement for shadcn Card that respects Raise light/dark theme. */
export function RaiseCard({ className, children, ...props }: RaiseCardProps) {
  const { rt } = useRaiseTheme();
  return (
    <motion.div
      className={cn(
        'relative rounded-xl border backdrop-blur-sm',
        rt(
          'bg-white border-slate-200 shadow-sm text-slate-900',
          'bg-zinc-900/50 border-zinc-800 text-white',
        ),
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RaiseCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function RaiseCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { rt } = useRaiseTheme();
  return (
    <div className={cn('font-semibold leading-none tracking-tight', rt('text-slate-900', 'text-white'), className)} {...props}>
      {children}
    </div>
  );
}

export function RaiseCardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { rt } = useRaiseTheme();
  return (
    <div className={cn('text-sm', rt('text-slate-500', 'text-zinc-400'), className)} {...props}>
      {children}
    </div>
  );
}

export function RaiseCardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
