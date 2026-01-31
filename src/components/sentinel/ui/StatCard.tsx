import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SentinelCard } from './SentinelCard';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
  delay?: number;
}

export function StatCard({ label, value, subtitle, icon: Icon, trend, loading, delay = 0 }: StatCardProps) {
  const { st } = useSentinelTheme();

  if (loading) {
    return <StatCardSkeleton />;
  }

  return (
    <SentinelCard
      padding="md"
      className="min-w-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={cn('text-xs font-medium', st('text-slate-500', 'text-zinc-400'))}>{label}</span>
        <div className={cn('p-2.5 rounded-xl', st('bg-purple-50', 'bg-sky-500/10'))}>
          <Icon className={cn('w-4 h-4', st('text-purple-500', 'text-sky-400'))} />
        </div>
      </div>
      <motion.div
        className={cn('text-2xl font-bold mb-0.5', st('text-slate-800', 'text-white'))}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay + 0.1 }}
      >
        {value}
      </motion.div>
      {subtitle && (
        <div className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>{subtitle}</div>
      )}
      {trend && (
        <div className={cn('text-xs mt-1.5 font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md', trend.positive ? st('text-emerald-700 bg-emerald-50', 'text-green-400') : st('text-red-700 bg-red-50', 'text-red-400'))}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </SentinelCard>
  );
}

function StatCardSkeleton() {
  const { st } = useSentinelTheme();
  return (
    <SentinelCard padding="md" className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('h-3 w-16 rounded animate-pulse', st('bg-slate-100', 'bg-zinc-800'))} />
        <div className={cn('h-9 w-9 rounded-xl animate-pulse', st('bg-slate-100', 'bg-zinc-800'))} />
      </div>
      <div className={cn('h-7 w-12 rounded mt-1 animate-pulse', st('bg-slate-100', 'bg-zinc-800'))} />
      <div className={cn('h-3 w-20 rounded mt-2 animate-pulse', st('bg-slate-100', 'bg-zinc-800'))} />
    </SentinelCard>
  );
}
