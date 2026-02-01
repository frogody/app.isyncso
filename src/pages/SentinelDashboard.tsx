import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Shield, AlertTriangle, CheckCircle, Clock, Plus,
  FileText, ArrowRight,
} from 'lucide-react';
import { useAISystems, useComplianceStatus } from '@/hooks/sentinel';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import { ComplianceScoreGauge } from '@/components/sentinel/ComplianceScoreGauge';
import WorkflowStepper from '@/components/sentinel/WorkflowStepper';
import QuickActions from '@/components/sentinel/QuickActions';
import RiskClassificationBadge from '@/components/sentinel/RiskClassificationBadge';
import type { RiskClassification } from '@/tokens/sentinel';
import { MOTION_VARIANTS } from '@/tokens/sentinel';
import { ThemeToggle } from '@/components/sentinel/ThemeToggle';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

const CLASSIFICATION_ORDER: RiskClassification[] = [
  'prohibited', 'high-risk', 'gpai', 'limited-risk', 'minimal-risk', 'unclassified',
];

const CLASSIFICATION_BAR_COLORS: Record<RiskClassification, [string, string]> = {
  'prohibited':   ['bg-slate-400', 'bg-zinc-400'],
  'high-risk':    ['bg-slate-400', 'bg-zinc-400'],
  'gpai':         ['bg-slate-300', 'bg-zinc-500'],
  'limited-risk': ['bg-slate-300', 'bg-zinc-500'],
  'minimal-risk': ['bg-emerald-400', 'bg-emerald-500'],
  'unclassified': ['bg-slate-300', 'bg-zinc-600'],
};

const STATUS_CONFIG = [
  { key: 'not-started' as const, label: 'Not Started', variant: 'neutral' as const, color: ['bg-slate-300', 'bg-zinc-600'], dot: ['bg-slate-400', 'bg-zinc-500'] },
  { key: 'in-progress' as const, label: 'In Progress', variant: 'warning' as const, color: ['bg-slate-400', 'bg-zinc-400'], dot: ['bg-slate-400', 'bg-zinc-400'] },
  { key: 'compliant' as const, label: 'Compliant', variant: 'success' as const, color: ['bg-emerald-400', 'bg-emerald-500'], dot: ['bg-emerald-400', 'bg-emerald-500'] },
  { key: 'non-compliant' as const, label: 'Non-Compliant', variant: 'error' as const, color: ['bg-slate-400', 'bg-zinc-400'], dot: ['bg-slate-400', 'bg-zinc-400'] },
];

export default function SentinelDashboard() {
  const { systems, loading } = useAISystems();
  const { totalSystems, complianceScore, byClassification, byStatus } = useComplianceStatus(systems);

  const { st } = useTheme();

  const maxClassification = Math.max(...CLASSIFICATION_ORDER.map(c => byClassification[c]), 1);
  const maxStatus = Math.max(...STATUS_CONFIG.map(s => byStatus[s.key]), 1);

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <SentinelCardSkeleton key={i} className="h-28" />
            ))}
          </div>
          <SentinelCardSkeleton className="h-56" />
        </div>
      </div>
    );
  }

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <Shield className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>EU AI Act Compliance</h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>Manage and track compliance for all AI systems</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to={createPageUrl('AISystemInventory')}>
              <SentinelButton icon={<Plus className="w-4 h-4" />}>
                Register AI System
              </SentinelButton>
            </Link>
          </div>
        </div>

        {/* Hero: Gauge + Stats */}
        <SentinelCard
          padding="none"
          className={cn(
            'overflow-hidden',
            st('bg-gradient-to-r from-emerald-50 via-white to-white', 'bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent')
          )}
        >
          <div className="flex flex-col lg:flex-row items-center gap-6 p-6">
            {/* Gauge left */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <ComplianceScoreGauge score={complianceScore} size="md" />
            </div>

            {/* Stats 2×2 grid right */}
            <div className="flex-1 grid grid-cols-2 gap-3 w-full">
              <StatCard icon={Shield} label="AI Systems" value={totalSystems} delay={0} accentColor="emerald" />
              <StatCard icon={AlertTriangle} label="High-Risk" value={byClassification['high-risk']} delay={0.1} accentColor="orange" />
              <StatCard icon={CheckCircle} label="Compliant" value={byStatus.compliant} delay={0.2} accentColor="green" />
              <StatCard icon={Clock} label="In Progress" value={byStatus['in-progress']} delay={0.3} accentColor="yellow" />
            </div>
          </div>
        </SentinelCard>

        {/* Workflow Stepper */}
        <motion.div {...MOTION_VARIANTS.slideUp} transition={{ delay: 0.4 }}>
          <WorkflowStepper systems={systems} />
        </motion.div>

        {/* Quick Actions */}
        <motion.div {...MOTION_VARIANTS.slideUp} transition={{ delay: 0.5 }}>
          <QuickActions systems={systems} taskCount={byClassification['high-risk'] * 22} />
        </motion.div>

        {/* Classification Breakdown & Compliance Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Risk Classification - bar chart */}
          <SentinelCard padding="md">
            <h3 className={cn('text-base font-semibold flex items-center gap-2 mb-4', st('text-slate-900', 'text-white'))}>
              <Shield className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
              Risk Classification
            </h3>
            <div className="space-y-3">
              {CLASSIFICATION_ORDER.map((classification, i) => {
                const count = byClassification[classification];
                const pct = (count / Math.max(totalSystems, 1)) * 100;
                const colors = CLASSIFICATION_BAR_COLORS[classification];
                return (
                  <motion.div
                    key={classification}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-28 flex-shrink-0">
                      <RiskClassificationBadge classification={classification} />
                    </div>
                    <div className={cn('flex-1 h-6 rounded-full overflow-hidden', st('bg-slate-100', 'bg-zinc-800/50'))}>
                      <motion.div
                        className={cn('h-full rounded-full', st(colors[0], colors[1]))}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.7 + i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                    <span className={cn('text-sm font-bold w-8 text-right tabular-nums', st('text-slate-900', 'text-white'))}>
                      {count}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </SentinelCard>

          {/* Compliance Status - bar chart */}
          <SentinelCard padding="md">
            <h3 className={cn('text-base font-semibold flex items-center gap-2 mb-4', st('text-slate-900', 'text-white'))}>
              <FileText className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
              Compliance Status
            </h3>
            <div className="space-y-3">
              {STATUS_CONFIG.map((status, i) => {
                const count = byStatus[status.key];
                const pct = (count / Math.max(totalSystems, 1)) * 100;
                return (
                  <motion.div
                    key={status.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-28 flex-shrink-0 flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', st(status.dot[0], status.dot[1]))} />
                      <span className={cn('text-sm font-medium', st('text-slate-700', 'text-zinc-300'))}>{status.label}</span>
                    </div>
                    <div className={cn('flex-1 h-6 rounded-full overflow-hidden', st('bg-slate-100', 'bg-zinc-800/50'))}>
                      <motion.div
                        className={cn('h-full rounded-full', st(status.color[0], status.color[1]))}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.7 + i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                    <span className={cn('text-sm font-bold w-8 text-right tabular-nums', st('text-slate-900', 'text-white'))}>
                      {count}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </SentinelCard>
        </div>

        {/* Recent Systems */}
        {systems.length > 0 && (
          <SentinelCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn('text-base font-semibold', st('text-slate-900', 'text-white'))}>Recent AI Systems</h3>
              <Link
                to={createPageUrl('AISystemInventory')}
                className={cn('text-xs flex items-center gap-1', st('text-emerald-500 hover:text-emerald-600', 'text-emerald-400 hover:text-emerald-300'))}
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {systems.slice(0, 5).map((system, i) => (
                <motion.div
                  key={system.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                >
                  <Link
                    to={createPageUrl(`RiskAssessment?systemId=${system.id}`)}
                    className={cn('flex items-center justify-between p-3 rounded-lg border transition-all group', st('bg-slate-50 border-slate-200 hover:border-emerald-300', 'bg-zinc-800/30 border-zinc-700/30 hover:border-emerald-500/30'))}
                  >
                    <div className="flex-1">
                      <h4 className={cn('text-sm font-semibold mb-1 transition-colors', st('text-slate-900 group-hover:text-emerald-500', 'text-white group-hover:text-emerald-400'))}>
                        {system.name}
                      </h4>
                      <p className={cn('text-xs line-clamp-1', st('text-slate-400', 'text-zinc-500'))}>{system.purpose}</p>
                    </div>
                    <RiskClassificationBadge
                      classification={system.risk_classification || 'unclassified'}
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          </SentinelCard>
        )}

        {/* Empty State */}
        {systems.length === 0 && (
          <SentinelEmptyState
            icon={<Shield className="w-8 h-8 text-emerald-400" />}
            title="Welcome to SENTINEL"
            message="Track AI systems, assess risks, and generate compliance documentation for the EU AI Act."
            action={{
              label: 'Register Your First AI System',
              onClick: () => {
                window.location.href = createPageUrl('AISystemInventory');
              },
            }}
          />
        )}
      </div>
    </SentinelPageTransition>
  );
}
