import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateCard } from './CreateCard';
import { useTheme } from '@/contexts/GlobalThemeContext';

interface CreateStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
  delay?: number;
}

export function CreateStatCard({ label, value, subtitle, icon: Icon, trend, loading, delay = 0 }: CreateStatCardProps) {
  const { ct } = useTheme();

  if (loading) {
    return <CreateStatCardSkeleton />;
  }

  return (
    <CreateCard
      padding="md"
      className="min-w-0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs', ct('text-slate-500', 'text-zinc-400'))}>{label}</span>
        <div className={cn('p-2 rounded-xl border', ct('bg-yellow-100 border-yellow-200', 'bg-yellow-500/10 border-yellow-500/20'))}>
          <Icon className={cn('w-4 h-4', ct('text-yellow-600', 'text-yellow-400'))} />
        </div>
      </div>
      <motion.div
        className={cn('text-2xl font-bold mb-0.5', ct('text-slate-900', 'text-white'))}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay + 0.1 }}
      >
        {value}
      </motion.div>
      {subtitle && (
        <div className={cn('text-xs', ct('text-slate-400', 'text-zinc-500'))}>{subtitle}</div>
      )}
      {trend && (
        <div className={`text-xs mt-1 font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </CreateCard>
  );
}

function CreateStatCardSkeleton() {
  const { ct } = useTheme();
  return (
    <CreateCard padding="md" className="min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('h-3 w-16 rounded animate-pulse', ct('bg-slate-200', 'bg-zinc-800'))} />
        <div className={cn('h-8 w-8 rounded-xl animate-pulse', ct('bg-slate-200', 'bg-zinc-800'))} />
      </div>
      <div className={cn('h-7 w-12 rounded mt-1 animate-pulse', ct('bg-slate-200', 'bg-zinc-800'))} />
      <div className={cn('h-3 w-20 rounded mt-2 animate-pulse', ct('bg-slate-200', 'bg-zinc-800'))} />
    </CreateCard>
  );
}
