import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SentinelCard } from './SentinelCard';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

type AccentColor = 'emerald' | 'orange' | 'red' | 'green' | 'yellow' | 'purple' | 'blue';

const ACCENT_STYLES: Record<AccentColor, { iconBg: [string, string]; iconText: [string, string]; border: [string, string] }> = {
  emerald: { iconBg: ['bg-emerald-100 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/20'], iconText: ['text-emerald-600', 'text-emerald-400'], border: ['bg-emerald-400', 'bg-emerald-500'] },
  orange:  { iconBg: ['bg-orange-100 border-orange-200', 'bg-orange-500/10 border-orange-500/20'], iconText: ['text-orange-600', 'text-orange-400'], border: ['bg-orange-400', 'bg-orange-500'] },
  red:     { iconBg: ['bg-red-100 border-red-200', 'bg-red-500/10 border-red-500/20'], iconText: ['text-red-600', 'text-red-400'], border: ['bg-red-400', 'bg-red-500'] },
  green:   { iconBg: ['bg-green-100 border-green-200', 'bg-green-500/10 border-green-500/20'], iconText: ['text-green-600', 'text-green-400'], border: ['bg-green-400', 'bg-green-500'] },
  yellow:  { iconBg: ['bg-yellow-100 border-yellow-200', 'bg-yellow-500/10 border-yellow-500/20'], iconText: ['text-yellow-600', 'text-yellow-400'], border: ['bg-yellow-400', 'bg-yellow-500'] },
  purple:  { iconBg: ['bg-purple-100 border-purple-200', 'bg-purple-500/10 border-purple-500/20'], iconText: ['text-purple-600', 'text-purple-400'], border: ['bg-purple-400', 'bg-purple-500'] },
  blue:    { iconBg: ['bg-blue-100 border-blue-200', 'bg-blue-500/10 border-blue-500/20'], iconText: ['text-blue-600', 'text-blue-400'], border: ['bg-blue-400', 'bg-blue-500'] },
};

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
  delay?: number;
  accentColor?: AccentColor;
}

export function StatCard({ label, value, subtitle, icon: Icon, trend, loading, delay = 0, accentColor = 'emerald' }: StatCardProps) {
  const { st } = useSentinelTheme();
  const accent = ACCENT_STYLES[accentColor];

  if (loading) {
    return <StatCardSkeleton />;
  }

  const isZero = value === 0 || value === '0' || value === '0%';

  return (
    <SentinelCard
      padding="none"
      className="min-w-0 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex">
        {/* Colored left accent bar */}
        <div className={cn('w-1 rounded-l-[20px]', st(accent.border[0], accent.border[1]))} />

        <div className="flex-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', st('text-slate-500', 'text-zinc-400'))}>{label}</span>
            <div className={cn('p-2 rounded-xl border', st(accent.iconBg[0], accent.iconBg[1]))}>
              <Icon className={cn('w-4 h-4', st(accent.iconText[0], accent.iconText[1]))} />
            </div>
          </div>
          <motion.div
            className={cn(
              'text-2xl font-bold tabular-nums mb-0.5',
              st('text-slate-900', 'text-white'),
              isZero && 'opacity-40'
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isZero ? 0.4 : 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay + 0.1 }}
          >
            {value}
          </motion.div>
          {subtitle && (
            <div className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{subtitle}</div>
          )}
          {trend && (
            <div className={`text-xs mt-1 font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </SentinelCard>
  );
}

function StatCardSkeleton() {
  const { st } = useSentinelTheme();
  return (
    <SentinelCard padding="none" className="min-w-0 overflow-hidden">
      <div className="flex">
        <div className={cn('w-1 rounded-l-[20px]', st('bg-slate-200', 'bg-zinc-800'))} />
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={cn('h-3 w-16 rounded animate-pulse', st('bg-slate-200', 'bg-zinc-800'))} />
            <div className={cn('h-8 w-8 rounded-xl animate-pulse', st('bg-slate-200', 'bg-zinc-800'))} />
          </div>
          <div className={cn('h-7 w-12 rounded mt-1 animate-pulse', st('bg-slate-200', 'bg-zinc-800'))} />
          <div className={cn('h-3 w-20 rounded mt-2 animate-pulse', st('bg-slate-200', 'bg-zinc-800'))} />
        </div>
      </div>
    </SentinelCard>
  );
}
