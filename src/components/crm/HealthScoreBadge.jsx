import React from 'react';
import { Heart, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, Eye } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';

const RISK_CONFIG = {
  healthy:  { label: 'Healthy',  color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   icon: ShieldCheck },
  watch:    { label: 'Watch',    color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30',  icon: Eye },
  at_risk:  { label: 'At Risk',  color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30',     icon: AlertTriangle },
};

const TREND_ICON = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

/**
 * Compact health score badge for inline use (e.g., contact profile header).
 * Shows score number + risk level + trend indicator.
 */
export function HealthScoreBadge({ score, riskLevel, trend, size = 'sm' }) {
  const { crt } = useTheme();
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.watch;
  const TrendIcon = TREND_ICON[trend] || Minus;
  const RiskIcon = config.icon;

  if (size === 'xs') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
        <Heart className="w-3 h-3" />
        {score}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
      <RiskIcon className="w-3.5 h-3.5" />
      <span className="font-bold">{score}</span>
      <span className="opacity-70">{config.label}</span>
      <TrendIcon className="w-3 h-3 opacity-60" />
    </span>
  );
}

/**
 * Expanded health score card with component breakdown.
 * For use in profile detail sections.
 */
export function HealthScoreCard({ healthData, loading }) {
  const { crt } = useTheme();

  if (loading) {
    return (
      <div className={`rounded-xl p-4 ${crt('bg-slate-50 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')} animate-pulse`}>
        <div className={`h-5 w-32 rounded ${crt('bg-slate-200', 'bg-zinc-800')} mb-3`} />
        <div className={`h-8 w-16 rounded ${crt('bg-slate-200', 'bg-zinc-800')} mb-3`} />
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className={`h-3 rounded ${crt('bg-slate-100', 'bg-zinc-800/60')}`} />
          ))}
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const config = RISK_CONFIG[healthData.risk_level] || RISK_CONFIG.watch;
  const TrendIcon = TREND_ICON[healthData.trend] || Minus;
  const components = healthData.components || {};

  const bars = [
    { label: 'Payment', key: 'payment_timeliness', weight: '30%' },
    { label: 'Engagement', key: 'engagement_frequency', weight: '25%' },
    { label: 'Revenue', key: 'order_volume_trend', weight: '25%' },
    { label: 'Communication', key: 'communication_recency', weight: '20%' },
  ];

  return (
    <div className={`rounded-xl p-4 ${crt('bg-slate-50 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-medium ${crt('text-slate-700', 'text-white/80')}`}>Client Health</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-2xl font-bold ${config.color}`}>{healthData.overall_score}</span>
          <div className="flex flex-col items-center">
            <TrendIcon className={`w-3.5 h-3.5 ${
              healthData.trend === 'improving' ? 'text-green-400' :
              healthData.trend === 'declining' ? 'text-red-400' : crt('text-slate-400', 'text-white/40')
            }`} />
            <span className={`text-[9px] ${crt('text-slate-400', 'text-white/40')}`}>{healthData.trend}</span>
          </div>
        </div>
      </div>

      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mb-3 ${config.bg} ${config.color}`}>
        {config.label}
      </div>

      <div className="space-y-2">
        {bars.map(bar => {
          const val = components[bar.key] || 0;
          return (
            <div key={bar.key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs ${crt('text-slate-500', 'text-white/50')}`}>{bar.label}</span>
                <span className={`text-xs font-medium ${crt('text-slate-700', 'text-white/70')}`}>{val}</span>
              </div>
              <div className={`h-1.5 rounded-full ${crt('bg-slate-200', 'bg-white/[0.06]')}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    val >= 70 ? 'bg-cyan-500' :
                    val >= 50 ? 'bg-yellow-500' :
                    val >= 30 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {healthData.computed_at && (
        <p className={`text-[10px] ${crt('text-slate-400', 'text-white/30')} mt-3`}>
          Computed {new Date(healthData.computed_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

/**
 * At-risk clients widget for the CRM Dashboard.
 * Shows a list of clients with declining or critical health.
 */
export function AtRiskClientsWidget({ clients, loading, onNavigate }) {
  const { crt } = useTheme();

  if (loading) {
    return (
      <div className={`rounded-xl p-4 ${crt('bg-slate-50 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')}`}>
        <div className={`h-5 w-40 rounded ${crt('bg-slate-200', 'bg-zinc-800')} mb-3 animate-pulse`} />
        {[1,2,3].map(i => (
          <div key={i} className={`h-12 rounded-lg ${crt('bg-slate-100', 'bg-zinc-800/40')} mb-2 animate-pulse`} />
        ))}
      </div>
    );
  }

  if (!clients?.length) {
    return (
      <div className={`rounded-xl p-4 ${crt('bg-slate-50 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')}`}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className={`text-sm font-medium ${crt('text-slate-700', 'text-white/80')}`}>Client Health</span>
        </div>
        <p className={`text-xs ${crt('text-slate-400', 'text-white/40')}`}>All clients healthy — no action needed.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 ${crt('bg-slate-50 border border-slate-200', 'bg-white/[0.03] border border-white/[0.06]')}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className={`text-sm font-medium ${crt('text-slate-700', 'text-white/80')}`}>
            At-Risk Clients ({clients.length})
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {clients.slice(0, 5).map(item => {
          const config = RISK_CONFIG[item.risk_level] || RISK_CONFIG.at_risk;
          const prospect = item.prospects;
          const name = prospect
            ? [prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || prospect.company
            : 'Unknown';

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.prospect_id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg ${crt('hover:bg-slate-100', 'hover:bg-white/[0.04]')} transition-colors text-left`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${config.bg} ${config.color}`}>
                  {item.overall_score}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${crt('text-slate-800', 'text-white/90')} truncate`}>{name}</p>
                  <p className={`text-xs ${crt('text-slate-400', 'text-white/40')}`}>{prospect?.company || prospect?.stage || ''}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} flex-shrink-0`}>
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
