import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRaiseTheme } from '@/contexts/RaiseThemeContext';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  RaiseCard,
  RaiseCardSkeleton,
} from '@/components/raise/RaiseCard';

type AccentColor = 'orange' | 'green' | 'red' | 'blue' | 'purple';

interface RaiseStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode | React.ElementType;
  trend?: { value: number; label?: string };
  loading?: boolean;
  delay?: number;
  accentColor?: AccentColor;
  className?: string;
}

const accentBarLight: Record<AccentColor, string> = {
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const accentBarDark: Record<AccentColor, string> = {
  orange: 'bg-orange-400',
  green: 'bg-green-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
  purple: 'bg-purple-400',
};

const iconBgLight: Record<AccentColor, string> = {
  orange: 'bg-orange-50 text-orange-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
};

const iconBgDark: Record<AccentColor, string> = {
  orange: 'bg-orange-500/10 text-orange-400',
  green: 'bg-green-500/10 text-green-400',
  red: 'bg-red-500/10 text-red-400',
  blue: 'bg-blue-500/10 text-blue-400',
  purple: 'bg-purple-500/10 text-purple-400',
};

export function RaiseStatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  loading = false,
  delay = 0,
  accentColor = 'orange',
  className,
}: RaiseStatCardProps) {
  const { rt } = useRaiseTheme();

  if (loading) {
    return <RaiseCardSkeleton className={cn('h-[120px]', className)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      <RaiseCard className="overflow-hidden">
        {/* Left accent bar */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px]',
            rt(accentBarLight[accentColor], accentBarDark[accentColor]),
          )}
        />

        <div className="p-5 pl-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-xs font-medium uppercase tracking-wider mb-2',
                  rt('text-slate-400', 'text-zinc-500'),
                )}
              >
                {label}
              </p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  rt('text-slate-900', 'text-white'),
                )}
              >
                {value}
              </p>
              {subtitle && (
                <p
                  className={cn(
                    'text-xs mt-1',
                    rt('text-slate-400', 'text-zinc-500'),
                  )}
                >
                  {subtitle}
                </p>
              )}
              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  {trend.value >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trend.value >= 0 ? 'text-green-400' : 'text-red-400',
                    )}
                  >
                    {trend.value >= 0 ? '+' : ''}
                    {trend.value}%
                  </span>
                  {trend.label && (
                    <span
                      className={cn(
                        'text-xs',
                        rt('text-slate-400', 'text-zinc-500'),
                      )}
                    >
                      {trend.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {icon && (
              <div
                className={cn(
                  'p-2.5 rounded-xl',
                  rt(iconBgLight[accentColor], iconBgDark[accentColor]),
                )}
              >
                {typeof icon === 'function' ? (() => { const Icon = icon as React.ElementType; return <Icon className="w-5 h-5" />; })() : icon}
              </div>
            )}
          </div>
        </div>
      </RaiseCard>
    </motion.div>
  );
}
