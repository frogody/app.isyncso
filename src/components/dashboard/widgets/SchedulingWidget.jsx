import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock, AlertTriangle, Sun, Moon, ArrowUpRight, RefreshCw, Brain, Laptop } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSchedulingRecommendations } from '@/hooks/useSchedulingRecommendations';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';

/**
 * Compact scheduling recommendations widget for the Dashboard.
 * Shows top deep work block, any warnings (burnout), and link to full view.
 */
export default function SchedulingWidget() {
  const { t } = useTheme();
  const { recommendations, loading, refresh } = useSchedulingRecommendations();

  // Show desktop CTA if no data
  if (!loading && !recommendations) {
    return (
      <GlassCard glow="cyan" className="p-4" hover={false}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className={cn('text-sm font-semibold', t('text-zinc-900', 'text-white'))}>Schedule Insights</span>
        </div>
        <div className={cn('flex items-center gap-3 p-2 rounded-lg', t('bg-zinc-100/60', 'bg-zinc-800/30'))}>
          <Laptop className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={cn('text-xs', t('text-zinc-500', 'text-zinc-400'))}>
              Connect your desktop app to get personalized schedule recommendations.
            </p>
            <Link
              to={createPageUrl("DesktopActivity")}
              className="text-cyan-400 text-[11px] hover:text-cyan-300 transition-colors"
            >
              Set up Desktop Tracking →
            </Link>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (loading && !recommendations) {
    return (
      <GlassCard glow="cyan" className="p-4" hover={false}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className={cn('text-sm font-medium', t('text-zinc-600', 'text-zinc-400'))}>Loading schedule insights...</span>
        </div>
      </GlassCard>
    );
  }

  const { deep_work_blocks = [], warnings = [], productivity_tips = [] } = recommendations || {};
  const topBlock = deep_work_blocks[0];
  const highWarning = warnings.find(w => w.severity === 'high');

  return (
    <GlassCard glow="cyan" className="p-4" hover={false}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn('text-sm font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Brain className="w-4 h-4 text-cyan-400" />
          Schedule Insights
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <Link
            to={createPageUrl("DesktopActivity") + "?tab=scheduling"}
            className="text-cyan-400 text-xs hover:text-cyan-300 transition-colors flex items-center gap-0.5"
          >
            Full view <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {/* Top deep work block */}
        {topBlock && (
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            t('bg-zinc-100/60', 'bg-zinc-800/30')
          )}>
            {topBlock.start_hour < 12 ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('text-xs font-medium', t('text-zinc-900', 'text-white'))}>
                {topBlock.name || 'Deep Work'}
              </p>
              <p className={cn('text-[11px]', t('text-zinc-500', 'text-zinc-400'))}>
                {topBlock.start_hour}:00 – {topBlock.end_hour}:00
                {topBlock.reason && ` · ${topBlock.reason}`}
              </p>
            </div>
          </div>
        )}

        {/* High severity warning (burnout, overwork) */}
        {highWarning && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-red-300">{highWarning.title || 'Warning'}</p>
              <p className="text-[11px] text-red-400/70 truncate">{highWarning.description}</p>
            </div>
          </div>
        )}

        {/* Tip if no warning */}
        {!highWarning && productivity_tips[0] && (
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            t('bg-zinc-100/60', 'bg-zinc-800/30')
          )}>
            <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <p className={cn('text-[11px] truncate', t('text-zinc-500', 'text-zinc-400'))}>
              {productivity_tips[0].tip || productivity_tips[0]}
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
