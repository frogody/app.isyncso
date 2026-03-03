import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Activity, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Package, Percent, Bell
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { useProductHealthList, useMarginAlerts } from '@/hooks/useProductIntelligence';
import { useUser } from '@/components/context/UserContext';

export const PRODUCT_INTELLIGENCE_WIDGETS = [
  { id: 'product_health_overview', name: 'Product Health', description: 'Health score distribution', size: 'medium' },
  { id: 'margin_overview', name: 'Margin Overview', description: 'Top/bottom products by margin', size: 'medium' },
  { id: 'margin_alerts', name: 'Margin Alerts', description: 'Active margin alerts', size: 'medium' },
];

const HEALTH_CONFIG = {
  thriving: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Thriving' },
  healthy: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Healthy' },
  watch: { color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', label: 'Watch' },
  at_risk: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'At Risk' },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Critical' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  medium: { color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
  low: { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

const TrendIcon = ({ trend }) => {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
};

// ============================================================================
// 1. Product Health Overview Widget
// ============================================================================

export function ProductHealthOverviewWidget() {
  const { user } = useUser();
  const { t } = useTheme();
  const { scores, thriving, healthy, watch, atRisk, critical, loading } = useProductHealthList(user?.company_id);

  if (loading) {
    return (
      <GlassCard className="p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <div className={cn('w-5 h-5 rounded animate-pulse', t('bg-zinc-200', 'bg-zinc-700'))} />
          <div className={cn('h-5 w-32 rounded animate-pulse', t('bg-zinc-200', 'bg-zinc-700'))} />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn('h-8 rounded animate-pulse', t('bg-zinc-100', 'bg-zinc-800/50'))} />
          ))}
        </div>
      </GlassCard>
    );
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, h) => s + h.overall_score, 0) / scores.length)
    : 0;

  const levels = [
    { key: 'thriving', items: thriving },
    { key: 'healthy', items: healthy },
    { key: 'watch', items: watch },
    { key: 'at_risk', items: atRisk },
    { key: 'critical', items: critical },
  ];

  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Activity className="w-5 h-5 text-cyan-400" />
          Product Health
        </h3>
        <Link to={createPageUrl("Products")} className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
          View all
        </Link>
      </div>

      {scores.length === 0 ? (
        <div className={cn('text-center py-6', t('text-zinc-400', 'text-zinc-500'))}>
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No health data yet</p>
          <p className="text-xs opacity-70 mt-1">Run health analysis to get started</p>
        </div>
      ) : (
        <>
          <div className={cn('text-center mb-4 p-3 rounded-xl', t('bg-zinc-100/60', 'bg-zinc-800/40'))}>
            <p className={cn('text-3xl font-bold', avgScore >= 60 ? 'text-cyan-400' : avgScore >= 40 ? 'text-zinc-400' : 'text-red-400')}>
              {avgScore}
            </p>
            <p className={cn('text-xs', t('text-zinc-500', 'text-zinc-400'))}>
              Avg Score across {scores.length} products
            </p>
          </div>

          <div className="space-y-1.5">
            {levels.map(({ key, items }) => {
              if (items.length === 0) return null;
              const cfg = HEALTH_CONFIG[key];
              const pct = Math.round((items.length / scores.length) * 100);
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className={cn('text-xs w-16', cfg.color)}>{cfg.label}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', cfg.bg.replace('/10', '/40'))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium w-6 text-right', t('text-zinc-600', 'text-zinc-400'))}>{items.length}</span>
                </div>
              );
            })}
          </div>

          {/* Actionable hint when many products need attention */}
          {(atRisk.length + critical.length) > 0 && (
            <div className={cn('mt-3 p-2 rounded-lg border flex items-start gap-2', 'bg-red-500/5 border-red-500/20')}>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className={cn('text-[11px]', t('text-zinc-500', 'text-zinc-400'))}>
                {atRisk.length + critical.length} product{(atRisk.length + critical.length) > 1 ? 's' : ''} need attention — review pricing or stock levels.
              </p>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}

// ============================================================================
// 2. Margin Overview Widget
// ============================================================================

export function MarginOverviewWidget({ margins = [] }) {
  const { t } = useTheme();

  // Deduplicate by product_id, keep latest
  const latest = new Map();
  margins.forEach(m => {
    if (!latest.has(m.product_id)) latest.set(m.product_id, m);
  });
  const unique = Array.from(latest.values());
  const sorted = [...unique].sort((a, b) => b.gross_margin_pct - a.gross_margin_pct);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();

  const MarginRow = ({ item, index }) => {
    const pct = Number(item.gross_margin_pct || 0);
    const isNeg = pct < 0;
    return (
      <div className={cn('flex items-center gap-2 py-1.5', index > 0 && cn('border-t', t('border-zinc-200/50', 'border-zinc-800/50')))}>
        <span className={cn('text-xs truncate flex-1', t('text-zinc-700', 'text-zinc-300'))}>
          {item.products?.name || 'Product'}
        </span>
        <div className="flex items-center gap-1.5">
          <Percent className={cn('w-3 h-3', isNeg ? 'text-red-400' : 'text-cyan-400')} />
          <span className={cn('text-xs font-medium tabular-nums', isNeg ? 'text-red-400' : 'text-cyan-400')}>
            {pct.toFixed(1)}%
          </span>
          <TrendIcon trend={item.margin_trend} />
        </div>
      </div>
    );
  };

  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Percent className="w-5 h-5 text-cyan-400" />
          Margins
        </h3>
      </div>

      {unique.length === 0 ? (
        <div className={cn('text-center py-6', t('text-zinc-400', 'text-zinc-500'))}>
          <Percent className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No margin data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {top5.length > 0 && (
            <div>
              <p className={cn('text-[10px] uppercase tracking-wider mb-1', t('text-zinc-400', 'text-zinc-500'))}>Top Margins</p>
              {top5.map((m, i) => <MarginRow key={m.id} item={m} index={i} />)}
            </div>
          )}
          {bottom5.length > 0 && bottom5[0]?.product_id !== top5[0]?.product_id && (
            <div>
              <p className={cn('text-[10px] uppercase tracking-wider mb-1', t('text-zinc-400', 'text-zinc-500'))}>Lowest Margins</p>
              {bottom5.map((m, i) => <MarginRow key={m.id} item={m} index={i} />)}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ============================================================================
// 3. Margin Alerts Widget
// ============================================================================

export function MarginAlertsWidget() {
  const { user } = useUser();
  const { t } = useTheme();
  const { alerts, acknowledge, loading } = useMarginAlerts(user?.company_id);

  if (loading) {
    return (
      <GlassCard className="p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <div className={cn('w-5 h-5 rounded animate-pulse', t('bg-zinc-200', 'bg-zinc-700'))} />
          <div className={cn('h-5 w-28 rounded animate-pulse', t('bg-zinc-200', 'bg-zinc-700'))} />
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className={cn('h-14 rounded-lg animate-pulse', t('bg-zinc-100', 'bg-zinc-800/50'))} />
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Bell className="w-5 h-5 text-cyan-400" />
          Margin Alerts
          {alerts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
              {alerts.length}
            </span>
          )}
        </h3>
      </div>

      {alerts.length === 0 ? (
        <div className={cn('text-center py-6', t('text-zinc-400', 'text-zinc-500'))}>
          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active alerts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {alerts.slice(0, 5).map(alert => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
            return (
              <div
                key={alert.id}
                className={cn('p-2.5 rounded-lg border', sev.bg, sev.border)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn('text-xs font-medium truncate', sev.color)}>
                      {alert.title}
                    </p>
                    <p className={cn('text-[10px] mt-0.5 truncate', t('text-zinc-500', 'text-zinc-500'))}>
                      {alert.description}
                    </p>
                  </div>
                  <button
                    onClick={() => acknowledge(alert.id)}
                    className={cn(
                      'shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-colors',
                      t('text-zinc-500 hover:text-zinc-700 bg-zinc-200', 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700')
                    )}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
