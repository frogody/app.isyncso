import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const RISK_CONFIG = {
  healthy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Healthy' },
  watch: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Watch' },
  at_risk: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'At Risk' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
};

const TREND_ICON = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

export default function ClientHealthBadge({ prospectId, compact = false }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!prospectId) return;

    const fetchHealth = async () => {
      const { data, error } = await supabase
        .from('client_health_scores')
        .select('overall_score, risk_level, trend, components, computed_at')
        .eq('prospect_id', prospectId)
        .single();

      if (!error && data) {
        setHealth(data);
      }
      setLoading(false);
    };

    fetchHealth();
  }, [prospectId]);

  if (loading || !health) return null;

  const config = RISK_CONFIG[health.risk_level] || RISK_CONFIG.watch;
  const TrendIcon = TREND_ICON[health.trend] || Minus;

  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        config.bg, config.border, config.color
      )}>
        <Heart className="w-3 h-3" />
        {health.overall_score}
      </div>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border',
      config.bg, config.border
    )}>
      <Heart className={cn('w-4 h-4', config.color)} />
      <span className={cn('text-sm font-semibold', config.color)}>
        {health.overall_score}
      </span>
      <span className={cn('text-xs', config.color)}>
        {config.label}
      </span>
      <TrendIcon className={cn('w-3.5 h-3.5', config.color)} />
    </div>
  );
}

export function ClientHealthDetail({ prospectId }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!prospectId) return;

    const fetchHealth = async () => {
      const { data, error } = await supabase
        .from('client_health_scores')
        .select('*')
        .eq('prospect_id', prospectId)
        .single();

      if (!error && data) setHealth(data);
      setLoading(false);
    };

    fetchHealth();
  }, [prospectId]);

  if (loading || !health) return null;

  const components = health.components || {};
  const bars = [
    { label: 'Payment', value: components.payment_timeliness || 0, weight: '30%', color: 'bg-emerald-400', hint: 'Invoice payment speed' },
    { label: 'Engagement', value: components.engagement_frequency || 0, weight: '25%', color: 'bg-cyan-400', hint: 'Interaction frequency' },
    { label: 'Volume', value: components.order_volume_trend || 0, weight: '25%', color: 'bg-blue-400', hint: 'Order volume trend' },
    { label: 'Communication', value: components.communication_recency || 0, weight: '20%', color: 'bg-purple-400', hint: 'Last contact recency' },
  ];

  return (
    <div className="space-y-3">
      {bars.map(bar => (
        <div key={bar.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">
              {bar.label} <span className="text-zinc-600">({bar.weight})</span>
            </span>
            <span className="text-white font-medium">{bar.value}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', bar.color)}
              style={{ width: `${bar.value}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">{bar.hint}</p>
        </div>
      ))}
      {health.computed_at && (
        <p className="text-[10px] text-zinc-600 text-right">
          Last computed {new Date(health.computed_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
