import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { SentinelCard } from './SentinelCard';

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
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-400 text-xs">{label}</span>
        <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20">
          <Icon className="w-4 h-4 text-sky-400" />
        </div>
      </div>
      <motion.div
        className="text-2xl font-bold text-white mb-0.5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay + 0.1 }}
      >
        {value}
      </motion.div>
      {subtitle && (
        <div className="text-xs text-zinc-500">{subtitle}</div>
      )}
      {trend && (
        <div className={`text-xs mt-1 font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </SentinelCard>
  );
}

function StatCardSkeleton() {
  return (
    <SentinelCard padding="md" className="min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
        <div className="h-8 w-8 bg-zinc-800 rounded-xl animate-pulse" />
      </div>
      <div className="h-7 w-12 bg-zinc-800 rounded mt-1 animate-pulse" />
      <div className="h-3 w-20 bg-zinc-800 rounded mt-2 animate-pulse" />
    </SentinelCard>
  );
}
