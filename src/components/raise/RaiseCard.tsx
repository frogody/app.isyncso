import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { MOTION_VARIANTS } from '@/tokens/raise';

interface RaiseCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'default' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
} as const;

export function RaiseCard({
  className,
  children,
  variant = 'default',
  padding = 'none',
  ...props
}: RaiseCardProps) {
  const { rt } = useTheme();

  const isInteractive = variant === 'interactive';

  return (
    <motion.div
      className={cn(
        'relative rounded-[20px] border backdrop-blur-sm',
        rt(
          'bg-white border-slate-200 shadow-sm text-slate-900',
          'bg-zinc-900/50 border-zinc-800/60 text-white',
        ),
        variant === 'elevated' &&
          rt(
            'bg-white shadow-md border-slate-200',
            'bg-zinc-900/60 border-zinc-700/60',
          ),
        isInteractive &&
          rt(
            'cursor-pointer hover:border-slate-300 hover:shadow-md',
            'cursor-pointer hover:border-zinc-700/60 hover:bg-zinc-900/60',
          ),
        'transition-all duration-200',
        paddingMap[padding],
        className,
      )}
      whileHover={isInteractive ? MOTION_VARIANTS.card.hover : undefined}
      whileTap={isInteractive ? MOTION_VARIANTS.card.tap : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RaiseCardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function RaiseCardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { rt } = useTheme();
  return (
    <div
      className={cn(
        'font-semibold leading-none tracking-tight',
        rt('text-slate-900', 'text-white'),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function RaiseCardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { rt } = useTheme();
  return (
    <div
      className={cn('text-sm', rt('text-slate-500', 'text-zinc-400'), className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function RaiseCardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function RaiseCardSkeleton({ className }: { className?: string }) {
  const { rt } = useTheme();
  return (
    <div
      className={cn(
        'rounded-[20px] border backdrop-blur-sm animate-pulse',
        rt('bg-slate-100 border-slate-200', 'bg-zinc-900/50 border-zinc-800/60'),
        className,
      )}
    >
      <div className="p-6 space-y-4">
        <div
          className={cn(
            'h-4 rounded-full w-1/3',
            rt('bg-slate-200', 'bg-zinc-800'),
          )}
        />
        <div
          className={cn(
            'h-3 rounded-full w-2/3',
            rt('bg-slate-200', 'bg-zinc-800'),
          )}
        />
        <div
          className={cn(
            'h-8 rounded-lg w-1/2',
            rt('bg-slate-200', 'bg-zinc-800'),
          )}
        />
      </div>
    </div>
  );
}
