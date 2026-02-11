import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatCard, GlassCard, ProgressRing } from '@/components/ui/GlassCard';
import { useTheme } from '@/contexts/GlobalThemeContext';
import {
  Shield, Cpu, AlertTriangle, FileText, Clock,
  Layers
} from 'lucide-react';

// Widget metadata for the apps manager
export const SENTINEL_WIDGETS = [
  { id: 'sentinel_compliance', name: 'Compliance Status', description: 'Overall compliance progress', size: 'medium' },
  { id: 'sentinel_systems', name: 'AI Systems', description: 'Number of tracked systems', size: 'small' },
  { id: 'sentinel_risk', name: 'Risk Overview', description: 'Systems by risk level', size: 'medium' },
  { id: 'sentinel_tasks', name: 'Pending Tasks', description: 'Outstanding compliance tasks', size: 'small' },
  { id: 'sentinel_docs', name: 'Documentation', description: 'Generated documents', size: 'small' }
];

export function SentinelComplianceWidget({ complianceProgress = 0, systemsCount = 0, highRiskCount = 0 }) {
  let titleClass = 'text-white';
  let subtitleClass = 'text-zinc-400';
  let statBg = 'bg-zinc-800/40';

  try {
    const { t } = useTheme();
    titleClass = t('text-zinc-900', 'text-white');
    subtitleClass = t('text-zinc-500', 'text-zinc-400');
    statBg = t('bg-zinc-100', 'bg-zinc-800/40');
  } catch {}

  return (
    <GlassCard glow="sage" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', titleClass)}>
          <Shield className="w-5 h-5 text-[#86EFAC]" />
          Compliance
        </h2>
        <Link to={createPageUrl("SentinelDashboard")} className="text-[#86EFAC] text-sm hover:opacity-80">
          View all
        </Link>
      </div>

      <div className="flex items-center justify-center mb-4">
        <ProgressRing value={complianceProgress} size={100} strokeWidth={8} color="sage">
          <span className={cn('text-xl font-bold', titleClass)}>{complianceProgress}%</span>
        </ProgressRing>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn('text-center p-2.5 rounded-lg', statBg)}>
          <div className={cn('text-lg font-bold', titleClass)}>{systemsCount}</div>
          <div className={cn('text-xs', subtitleClass)}>AI Systems</div>
        </div>
        <div className={cn('text-center p-2.5 rounded-lg', statBg)}>
          <div className={cn('text-lg font-bold', titleClass)}>{highRiskCount}</div>
          <div className={cn('text-xs', subtitleClass)}>High Risk</div>
        </div>
      </div>

      {highRiskCount > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{highRiskCount} system{highRiskCount !== 1 ? 's' : ''} need attention</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export function SentinelSystemsWidget({ systemsCount = 0, highRiskCount = 0 }) {
  return (
    <StatCard
      icon={Cpu}
      color="sage"
      value={systemsCount}
      label="AI Systems"
      change={highRiskCount > 0 ? `${highRiskCount} high-risk` : null}
      trend={highRiskCount > 0 ? 'down' : undefined}
    />
  );
}

export function SentinelRiskWidget({ riskBreakdown = {} }) {
  const risks = [
    { key: 'prohibited', label: 'Prohibited', color: 'bg-red-500', textColor: 'text-red-400', dotColor: 'bg-red-500' },
    { key: 'high-risk', label: 'High Risk', color: 'bg-amber-500', textColor: 'text-amber-400', dotColor: 'bg-amber-500' },
    { key: 'gpai', label: 'GPAI', color: 'bg-purple-500', textColor: 'text-purple-400', dotColor: 'bg-purple-500' },
    { key: 'limited-risk', label: 'Limited', color: 'bg-yellow-500', textColor: 'text-yellow-400', dotColor: 'bg-yellow-500' },
    { key: 'minimal-risk', label: 'Minimal', color: 'bg-green-500', textColor: 'text-green-400', dotColor: 'bg-green-500' },
  ];

  const total = Object.values(riskBreakdown).reduce((sum, val) => sum + val, 0);

  let titleClass = 'text-white';
  let subtitleClass = 'text-zinc-400';
  let emptyTextClass = 'text-zinc-500';

  try {
    const { t } = useTheme();
    titleClass = t('text-zinc-900', 'text-white');
    subtitleClass = t('text-zinc-500', 'text-zinc-400');
    emptyTextClass = t('text-zinc-400', 'text-zinc-500');
  } catch {}

  return (
    <GlassCard glow="sage" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', titleClass)}>
          <Layers className="w-5 h-5 text-[#86EFAC]" />
          Risk Overview
        </h2>
        <Link to={createPageUrl("AISystemInventory")} className="text-[#86EFAC] text-sm hover:opacity-80">
          View all
        </Link>
      </div>

      {total > 0 ? (
        <>
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {risks.map((risk, i) => {
              const count = riskBreakdown[risk.key] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return percent > 0 ? (
                <motion.div
                  key={risk.key}
                  className={risk.color}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.15,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  title={`${risk.label}: ${count}`}
                />
              ) : null;
            })}
          </div>

          <div className="space-y-2">
            {risks.filter(r => (riskBreakdown[r.key] || 0) > 0).map(risk => (
              <div key={risk.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2.5 h-2.5 rounded-full', risk.dotColor)} />
                  <span className={cn('text-sm', subtitleClass)}>{risk.label}</span>
                </div>
                <span className={cn('text-sm font-medium', risk.textColor)}>
                  {riskBreakdown[risk.key] || 0}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={cn('text-center py-6 text-sm', emptyTextClass)}>
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No systems registered
        </div>
      )}
    </GlassCard>
  );
}

export function SentinelTasksWidget({ pendingTasks = 0, urgentTasks = 0 }) {
  return (
    <StatCard
      icon={Clock}
      color="amber"
      value={pendingTasks}
      label="Pending Tasks"
      change={urgentTasks > 0 ? `${urgentTasks} urgent` : null}
      trend={urgentTasks > 0 ? 'down' : undefined}
    />
  );
}

export function SentinelDocsWidget({ docCount = 0, recentDoc = null }) {
  return (
    <StatCard
      icon={FileText}
      color="sage"
      value={docCount}
      label="Documents"
    />
  );
}
