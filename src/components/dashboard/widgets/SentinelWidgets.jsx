import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-colors ${className}`}>
    {children}
  </div>
);

export function SentinelComplianceWidget({ complianceProgress = 0, systemsCount = 0, highRiskCount = 0 }) {
  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#86EFAC]" />
          Compliance
        </h2>
        <Link to={createPageUrl("SentinelDashboard")} className="text-[#86EFAC] text-sm hover:opacity-80">View all</Link>
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(39 39 42)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke="#86EFAC"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(complianceProgress / 100) * 314} 314`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{complianceProgress}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2.5 rounded-lg bg-zinc-800/40">
          <div className="text-lg font-bold text-white">{systemsCount}</div>
          <div className="text-xs text-zinc-400">AI Systems</div>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-zinc-800/40">
          <div className="text-lg font-bold text-white">{highRiskCount}</div>
          <div className="text-xs text-zinc-400">High Risk</div>
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
    </Card>
  );
}

export function SentinelSystemsWidget({ systemsCount = 0, highRiskCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#86EFAC]/10">
            <Cpu className="w-4 h-4 text-[#86EFAC]" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">AI Systems</span>
        </div>
        {highRiskCount > 0 && (
          <span className="text-xs text-amber-400 font-medium">{highRiskCount} high-risk</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{systemsCount}</div>
    </Card>
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
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#86EFAC]" />
          Risk Overview
        </h2>
        <Link to={createPageUrl("AISystemInventory")} className="text-[#86EFAC] text-sm hover:opacity-80">View all</Link>
      </div>

      {total > 0 ? (
        <>
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
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

          <div className="space-y-2">
            {risks.filter(r => (riskBreakdown[r.key] || 0) > 0).map(risk => (
              <div key={risk.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${risk.color}`} />
                  <span className="text-sm text-zinc-400">{risk.label}</span>
                </div>
                <span className={`text-sm font-medium ${risk.textColor}`}>{riskBreakdown[risk.key] || 0}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No systems registered
        </div>
      )}
    </Card>
  );
}

export function SentinelTasksWidget({ pendingTasks = 0, urgentTasks = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Pending Tasks</span>
        </div>
        {urgentTasks > 0 && (
          <span className="text-xs text-red-400 font-medium">{urgentTasks} urgent</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{pendingTasks}</div>
      {pendingTasks > 0 && (
        <Link to={createPageUrl("ComplianceRoadmap")} className="text-xs text-[#86EFAC] hover:opacity-80 mt-1 block">
          View roadmap →
        </Link>
      )}
    </Card>
  );
}

export function SentinelDocsWidget({ docCount = 0, recentDoc = null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#86EFAC]/10">
            <FileText className="w-4 h-4 text-[#86EFAC]" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Documents</span>
        </div>
        {docCount > 0 && (
          <Link to={createPageUrl("DocumentGenerator")} className="text-xs text-[#86EFAC] hover:opacity-80">
            View →
          </Link>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{docCount}</div>
      {recentDoc && (
        <p className="text-xs text-zinc-500 mt-1 truncate">Last: {recentDoc}</p>
      )}
    </Card>
  );
}
