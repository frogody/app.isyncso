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
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';
import { cn } from '@/lib/utils';

const CLASSIFICATION_ORDER: RiskClassification[] = [
  'prohibited', 'high-risk', 'gpai', 'limited-risk', 'minimal-risk', 'unclassified',
];

const STATUS_CONFIG = [
  { key: 'not-started' as const, label: 'Not Started', variant: 'neutral' as const },
  { key: 'in-progress' as const, label: 'In Progress', variant: 'warning' as const },
  { key: 'compliant' as const, label: 'Compliant', variant: 'success' as const },
  { key: 'non-compliant' as const, label: 'Non-Compliant', variant: 'error' as const },
];

export default function SentinelDashboard() {
  const { systems, loading } = useAISystems();
  const { totalSystems, complianceScore, byClassification, byStatus } = useComplianceStatus(systems);

  const { st } = useSentinelTheme();

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-[#F8FAFC]', 'bg-black'))}>
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
    <SentinelPageTransition className={cn('min-h-screen', st('bg-[#F8FAFC]', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-purple-100', 'bg-sky-500/10'))}>
              <Shield className={cn('w-5 h-5', st('text-purple-500', 'text-sky-400'))} />
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

        {/* Compliance Score & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SentinelCard padding="md" className="flex flex-col items-center justify-center">
            <ComplianceScoreGauge score={complianceScore} size="md" />
          </SentinelCard>

          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Shield} label="AI Systems" value={totalSystems} delay={0} />
            <StatCard icon={AlertTriangle} label="High-Risk" value={byClassification['high-risk']} delay={0.1} />
            <StatCard icon={CheckCircle} label="Compliant" value={byStatus.compliant} delay={0.2} />
            <StatCard icon={Clock} label="In Progress" value={byStatus['in-progress']} delay={0.3} />
          </div>
        </div>

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
          <SentinelCard padding="md">
            <h3 className={cn('text-base font-semibold flex items-center gap-2 mb-3', st('text-slate-900', 'text-white'))}>
              <Shield className={cn('w-4 h-4', st('text-purple-500', 'text-sky-400'))} />
              Risk Classification
            </h3>
            <div className="space-y-2">
              {CLASSIFICATION_ORDER.map((classification, i) => (
                <motion.div
                  key={classification}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className={cn('flex items-center justify-between p-2 rounded-lg border', st('bg-slate-50/80 border-slate-100', 'bg-zinc-800/30 border-zinc-700/30'))}
                >
                  <RiskClassificationBadge classification={classification} />
                  <span className={cn('text-sm font-bold', st('text-slate-900', 'text-white'))}>
                    {byClassification[classification]}
                  </span>
                </motion.div>
              ))}
            </div>
          </SentinelCard>

          <SentinelCard padding="md">
            <h3 className={cn('text-base font-semibold flex items-center gap-2 mb-3', st('text-slate-900', 'text-white'))}>
              <FileText className={cn('w-4 h-4', st('text-purple-500', 'text-sky-400'))} />
              Compliance Status
            </h3>
            <div className="space-y-2">
              {STATUS_CONFIG.map((status, i) => (
                <motion.div
                  key={status.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className={cn('flex items-center justify-between p-2 rounded-lg border', st('bg-slate-50/80 border-slate-100', 'bg-zinc-800/30 border-zinc-700/30'))}
                >
                  <SentinelBadge variant={status.variant}>{status.label}</SentinelBadge>
                  <span className={cn('text-sm font-bold', st('text-slate-900', 'text-white'))}>{byStatus[status.key]}</span>
                </motion.div>
              ))}
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
                className={cn('text-xs flex items-center gap-1', st('text-purple-500 hover:text-purple-600', 'text-sky-400 hover:text-sky-300'))}
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
                    className={cn('flex items-center justify-between p-3 rounded-lg border transition-all group', st('bg-slate-50 border-slate-200 hover:border-purple-300', 'bg-zinc-800/30 border-zinc-700/30 hover:border-sky-500/30'))}
                  >
                    <div className="flex-1">
                      <h4 className={cn('text-sm font-semibold mb-1 transition-colors', st('text-slate-900 group-hover:text-purple-500', 'text-white group-hover:text-sky-400'))}>
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
            icon={<Shield className="w-8 h-8 text-sky-400" />}
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
