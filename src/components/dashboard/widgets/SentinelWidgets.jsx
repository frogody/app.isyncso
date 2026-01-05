import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Shield, Cpu, AlertTriangle, FileText, Clock, 
  CheckCircle, XCircle, Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlassCard, ProgressRing } from '@/components/ui/GlassCard';

// Widget metadata for the apps manager
export const SENTINEL_WIDGETS = [
  {
    id: 'sentinel_compliance',
    name: 'Compliance Status',
    description: 'Overall compliance progress',
    size: 'medium'
  },
  {
    id: 'sentinel_systems',
    name: 'AI Systems',
    description: 'Number of tracked systems',
    size: 'small'
  },
  {
    id: 'sentinel_risk',
    name: 'Risk Overview',
    description: 'Systems by risk level',
    size: 'medium'
  },
  {
    id: 'sentinel_tasks',
    name: 'Pending Tasks',
    description: 'Outstanding compliance tasks',
    size: 'small'
  },
  {
    id: 'sentinel_docs',
    name: 'Documentation',
    description: 'Generated documents',
    size: 'small'
  }
];

export function SentinelComplianceWidget({ complianceProgress = 0, systemsCount = 0, highRiskCount = 0 }) {
  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#86EFAC]" />
          Compliance
        </h2>
        <Link to={createPageUrl("SentinelDashboard")} className="text-[#86EFAC] text-sm hover:text-[#86EFAC]/80">View all</Link>
      </div>

      <div className="flex items-center justify-center mb-4">
        <ProgressRing value={complianceProgress} size={100} strokeWidth={8} color="sage" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 rounded-lg bg-zinc-800/50">
          <div className="text-xl font-bold text-white">{systemsCount}</div>
          <div className="text-xs text-zinc-400">AI Systems</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-zinc-800/50">
          <div className="text-xl font-bold text-amber-400">{highRiskCount}</div>
          <div className="text-xs text-zinc-400">High Risk</div>
        </div>
      </div>

      {highRiskCount > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
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
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#86EFAC]/20 border-[#86EFAC]/30 border">
          <Cpu className="w-5 h-5 text-[#86EFAC]" />
        </div>
        {highRiskCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {highRiskCount} high-risk
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{systemsCount}</div>
      <div className="text-sm text-zinc-400">AI Systems</div>
    </GlassCard>
  );
}

export function SentinelRiskWidget({ riskBreakdown = {} }) {
  const risks = [
    { key: 'prohibited', label: 'Prohibited', color: 'bg-red-500', textColor: 'text-red-400' },
    { key: 'high-risk', label: 'High Risk', color: 'bg-amber-500', textColor: 'text-amber-400' },
    { key: 'gpai', label: 'GPAI', color: 'bg-purple-500', textColor: 'text-purple-400' },
    { key: 'limited-risk', label: 'Limited', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    { key: 'minimal-risk', label: 'Minimal', color: 'bg-green-500', textColor: 'text-green-400' },
  ];

  const total = Object.values(riskBreakdown).reduce((sum, val) => sum + val, 0);

  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#86EFAC]" />
          Risk Overview
        </h2>
        <Link to={createPageUrl("AISystemInventory")} className="text-[#86EFAC] text-sm hover:text-[#86EFAC]/80">View all</Link>
      </div>

      {total > 0 ? (
        <>
          {/* Risk Bar */}
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {risks.map(risk => {
              const count = riskBreakdown[risk.key] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return percent > 0 ? (
                <div 
                  key={risk.key} 
                  className={`${risk.color}`} 
                  style={{ width: `${percent}%` }}
                  title={`${risk.label}: ${count}`}
                />
              ) : null;
            })}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {risks.filter(r => (riskBreakdown[r.key] || 0) > 0).map(risk => (
              <div key={risk.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${risk.color}`} />
                  <span className="text-zinc-400">{risk.label}</span>
                </div>
                <span className={`font-medium ${risk.textColor}`}>{riskBreakdown[risk.key] || 0}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No systems registered
        </div>
      )}
    </GlassCard>
  );
}

export function SentinelTasksWidget({ pendingTasks = 0, urgentTasks = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 border-amber-500/30 border">
          <Clock className="w-5 h-5 text-amber-400" />
        </div>
        {urgentTasks > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
            {urgentTasks} urgent
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{pendingTasks}</div>
      <div className="text-sm text-zinc-400">Pending Tasks</div>
      {pendingTasks > 0 && (
        <Link to={createPageUrl("ComplianceRoadmap")} className="text-xs text-[#86EFAC] hover:text-[#86EFAC]/80 mt-2 block">
          View roadmap →
        </Link>
      )}
    </GlassCard>
  );
}

export function SentinelDocsWidget({ docCount = 0, recentDoc = null }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#86EFAC]/20 border-[#86EFAC]/30 border">
          <FileText className="w-5 h-5 text-[#86EFAC]" />
        </div>
        {docCount > 0 && (
          <Link to={createPageUrl("DocumentGenerator")} className="text-xs text-[#86EFAC] hover:text-[#86EFAC]/80">
            View →
          </Link>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{docCount}</div>
      <div className="text-sm text-zinc-400">Documents</div>
      {recentDoc && (
        <p className="text-xs text-zinc-500 mt-1 truncate">Last: {recentDoc}</p>
      )}
    </GlassCard>
  );
}