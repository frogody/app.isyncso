import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Clock, AlertTriangle, CheckCircle, Sparkles,
  FileText, Target, Zap, PlayCircle, Map, TrendingUp,
  ChevronRight, Flag, ChevronDown, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';
import { useRoadmap } from '@/hooks/sentinel';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { SentinelPageTransition } from '@/components/sentinel/ui/SentinelPageTransition';
import { ThemeToggle } from '@/components/sentinel/ThemeToggle';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

interface AIPlan {
  immediate_actions?: string[];
  quick_wins?: string[];
  risk_priorities?: string[];
  thirty_day_plan?: string;
}

const ENFORCEMENT_MILESTONES = [
  {
    date: '2025-02-02',
    title: 'Prohibited Practices & AI Literacy',
    description: 'Ban on prohibited AI practices. AI literacy requirements for providers and deployers.',
    icon: AlertTriangle,
  },
  {
    date: '2025-08-02',
    title: 'GPAI & Governance Rules',
    description: 'General-Purpose AI obligations. EU AI Office governance framework active.',
    icon: Target,
  },
  {
    date: '2026-08-02',
    title: 'High-Risk AI Full Compliance',
    description: 'All high-risk AI system obligations enforceable. CE marking, conformity assessment required.',
    icon: CheckCircle,
  },
  {
    date: '2027-08-02',
    title: 'High-Risk Systems in Regulated Products',
    description: 'High-risk AI in products covered by Annex I must comply.',
    icon: Flag,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MilestoneCard({ milestone, index }: { milestone: typeof ENFORCEMENT_MILESTONES[0]; index: number }) {
  const { st } = useTheme();
  const isPast = new Date(milestone.date) < new Date();
  const daysUntil = Math.ceil((new Date(milestone.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const Icon = milestone.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pl-10"
    >
      {/* Vertical connector */}
      {index < ENFORCEMENT_MILESTONES.length - 1 && (
        <div
          className={cn(
            'absolute left-[11px] top-10 bottom-0 w-[2px]',
            isPast
              ? st('bg-emerald-400', 'bg-emerald-500/40')
              : st('border-l-2 border-dashed border-zinc-300 bg-transparent', 'border-l-2 border-dashed border-zinc-700 bg-transparent')
          )}
          style={!isPast ? { width: 0 } : undefined}
        />
      )}

      {/* Node */}
      <div className="absolute left-[5px] top-[22px] z-10">
        {isPast ? (
          <div className={cn('w-3.5 h-3.5 rounded-full ring-4', st('bg-emerald-500 ring-emerald-100', 'bg-emerald-400 ring-emerald-400/10'))} />
        ) : (
          <div className={cn('w-3.5 h-3.5 rounded-full border-2', st('border-zinc-400 bg-white', 'border-zinc-600 bg-zinc-900'))} />
        )}
      </div>

      <SentinelCard
        padding="md"
        className={cn(
          'transition-all duration-300',
          isPast && st('border-emerald-200/80', 'border-emerald-500/20'),
        )}
      >
        {isPast && (
          <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-[20px]', st('bg-emerald-400', 'bg-emerald-400'))} />
        )}
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
            isPast ? st('bg-emerald-100', 'bg-emerald-400/15') : st('bg-slate-100', 'bg-zinc-800/80')
          )}>
            <Icon className={cn('w-4 h-4', isPast ? st('text-emerald-600', 'text-emerald-400') : st('text-slate-400', 'text-zinc-500'))} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cn('font-semibold', st('text-slate-900', 'text-white'))}>{milestone.title}</h3>
                <p className={cn('text-xs mt-1 leading-relaxed', st('text-slate-500', 'text-zinc-500'))}>{milestone.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isPast ? (
                  <SentinelBadge variant="success">Active</SentinelBadge>
                ) : (
                  <div className="text-center">
                    <div className={cn(
                      'text-lg font-bold tabular-nums',
                      daysUntil <= 180 ? st('text-yellow-600', 'text-yellow-400') : st('text-slate-400', 'text-zinc-500')
                    )}>
                      {daysUntil}
                    </div>
                    <div className={cn('text-[10px]', st('text-slate-400', 'text-zinc-600'))}>days</div>
                  </div>
                )}
              </div>
            </div>
            <div className={cn('flex items-center gap-1.5 mt-2.5 text-[10px]', st('text-slate-400', 'text-zinc-600'))}>
              <Calendar className="w-3 h-3" />
              {new Date(milestone.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function CircularProgress({ value, size = 36 }: { value: number; size?: number }) {
  const { st } = useTheme();
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
        className={st('stroke-slate-200', 'stroke-zinc-800')} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className={st('stroke-emerald-500', 'stroke-emerald-400')}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function SystemCard({ item, index }: { item: any; index: number }) {
  const { st } = useTheme();

  const riskColor = (() => {
    const risk = item.system.risk_classification?.toLowerCase();
    if (risk?.includes('high')) return { bar: 'bg-red-400', badge: 'error' as const };
    if (risk?.includes('limited')) return { bar: 'bg-yellow-400', badge: 'warning' as const };
    if (risk?.includes('minimal')) return { bar: 'bg-emerald-400', badge: 'success' as const };
    return { bar: st('bg-zinc-400', 'bg-zinc-600'), badge: 'neutral' as const };
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <SentinelCard padding="none" className="overflow-hidden">
        <div className="flex">
          <div className={cn('w-1 rounded-l-[20px]', riskColor.bar)} />
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h4 className={cn('font-semibold truncate', st('text-slate-900', 'text-white'))}>{item.system.name}</h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <SentinelBadge variant={riskColor.badge} size="sm">
                    {item.system.risk_classification?.replace('-', ' ').toUpperCase()}
                  </SentinelBadge>
                  <span className={cn('text-[11px]', st('text-slate-400', 'text-zinc-600'))}>{item.completedTasks}/{item.totalTasks} tasks</span>
                  {item.urgentTasks > 0 && <SentinelBadge variant="warning" size="sm">{item.urgentTasks} urgent</SentinelBadge>}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <CircularProgress value={item.progress} />
                <span className={cn('text-lg font-bold tabular-nums', st('text-emerald-600', 'text-emerald-400'))}>{Math.round(item.progress)}%</span>
              </div>
            </div>
            <Progress value={item.progress} className={cn('h-1.5 mb-4', st('bg-slate-100', 'bg-zinc-800/80'))} />
            <div className="flex gap-2">
              <Link to={`${createPageUrl('DocumentGenerator')}?system=${item.system.id}`} className="flex-1">
                <SentinelButton size="sm" className="w-full" icon={<FileText className="w-3.5 h-3.5" />}>Generate Docs</SentinelButton>
              </Link>
              <Link to={`${createPageUrl('RiskAssessment')}?systemId=${item.system.id}`}>
                <SentinelButton size="sm" variant="secondary" icon={<Target className="w-3.5 h-3.5" />}>Assess</SentinelButton>
              </Link>
            </div>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function UrgentTaskRow({ task, index }: { task: any; index: number }) {
  const { st } = useTheme();
  const overdue = task.daysRemaining < 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <SentinelCard padding="sm" className={cn(overdue && st('border-red-300', 'border-red-500/20'))}>
        {overdue && <div className="absolute top-0 left-0 w-1 h-full rounded-l-[20px] bg-red-400" />}
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
            overdue ? st('bg-red-100', 'bg-red-400/15') : st('bg-yellow-100', 'bg-yellow-400/10')
          )}>
            {overdue
              ? <AlertTriangle className={cn('w-4 h-4', st('text-red-500', 'text-red-400'))} />
              : <Clock className={cn('w-4 h-4', st('text-yellow-600', 'text-yellow-400'))} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-medium truncate', st('text-slate-900', 'text-white'))}>{task.obligation.obligation_title}</h4>
            <p className={cn('text-[11px] truncate', st('text-slate-400', 'text-zinc-600'))}>{task.system.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {overdue ? (
              <SentinelBadge variant="error" size="sm">{Math.abs(task.daysRemaining)}d overdue</SentinelBadge>
            ) : (
              <SentinelBadge variant="warning" size="sm">{task.daysRemaining}d left</SentinelBadge>
            )}
            <Link to={`${createPageUrl('DocumentGenerator')}?system=${task.system.id}`}>
              <SentinelButton size="sm" variant="secondary" icon={<PlayCircle className="w-3.5 h-3.5" />}>Start</SentinelButton>
            </Link>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, count, delay = 0 }: { icon: any; title: string; count?: number; delay?: number }) {
  const { st } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-2.5 mb-4"
    >
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
        <Icon className={cn('w-4 h-4', st('text-emerald-600', 'text-emerald-400'))} />
      </div>
      <h2 className={cn('text-lg font-semibold', st('text-slate-900', 'text-white'))}>{title}</h2>
      {count !== undefined && (
        <span className={cn('text-xs tabular-nums', st('text-slate-400', 'text-zinc-600'))}>{count}</span>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ComplianceRoadmap() {
  const { systems, stats, loading } = useRoadmap();
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const { st } = useTheme();

  const generateAIPlan = useCallback(async () => {
    setGeneratingPlan(true);
    try {
      const response = await db.integrations.Core.InvokeLLM({
        prompt: `Analyze these AI systems and provide compliance recommendations:\n${JSON.stringify(systems.map(s => ({ name: s.name, classification: s.risk_classification, status: s.compliance_status })), null, 2)}\n\nUrgent tasks: ${stats.urgentTasks.length}\nOverdue: ${stats.overdueCount}\n\nProvide:\n1. Top 3 immediate actions\n2. Quick wins\n3. Risk priorities\n4. 30-day plan`,
        response_json_schema: {
          type: 'object',
          properties: {
            immediate_actions: { type: 'array', items: { type: 'string' } },
            quick_wins: { type: 'array', items: { type: 'string' } },
            risk_priorities: { type: 'array', items: { type: 'string' } },
            thirty_day_plan: { type: 'string' },
          },
        },
      });
      setAiPlan(response as AIPlan);
      toast.success('AI action plan generated');
    } catch (error) {
      console.error('Failed to generate AI plan:', error);
      toast.error('Failed to generate plan');
    } finally {
      setGeneratingPlan(false);
    }
  }, [systems, stats]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('min-h-screen p-6', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-4xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <SentinelCardSkeleton className="h-14" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map(i => <SentinelCardSkeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 py-6 space-y-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <Map className={cn('w-5 h-5', st('text-emerald-600', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>Compliance Roadmap</h1>
              <div className={cn('flex items-center gap-3 mt-0.5 text-xs', st('text-slate-400', 'text-zinc-500'))}>
                <span>{stats.allTasks.length} tasks</span>
                <span className="opacity-30">/</span>
                <span className={cn(stats.completedCount > 0 && st('text-emerald-600', 'text-emerald-400'))}>{stats.completedCount} done</span>
                {stats.overdueCount > 0 && <>
                  <span className="opacity-30">/</span>
                  <span className={st('text-red-500', 'text-red-400')}>{stats.overdueCount} overdue</span>
                </>}
                <span className="opacity-30">/</span>
                <span className={cn(st('text-emerald-600', 'text-emerald-400'))}>{stats.progressPercent}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <ThemeToggle />
            {!aiPlan ? (
              <SentinelButton
                size="sm"
                onClick={generateAIPlan}
                disabled={generatingPlan || systems.length === 0}
                loading={generatingPlan}
                icon={!generatingPlan ? <Sparkles className="w-3.5 h-3.5" /> : undefined}
              >
                {generatingPlan ? 'Analyzing...' : 'AI Plan'}
              </SentinelButton>
            ) : (
              <SentinelButton
                size="sm"
                variant={aiPlanOpen ? 'primary' : 'secondary'}
                onClick={() => setAiPlanOpen(!aiPlanOpen)}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                AI Plan
                <ChevronDown className={cn('w-3 h-3 transition-transform', aiPlanOpen && 'rotate-180')} />
              </SentinelButton>
            )}

            {/* AI Plan dropdown */}
            <AnimatePresence>
              {aiPlan && aiPlanOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute top-full right-0 mt-2 w-[420px] z-50 rounded-2xl border backdrop-blur-xl shadow-xl',
                    st('bg-white border-slate-200', 'bg-zinc-900/95 border-zinc-800/80')
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn('text-xs font-semibold flex items-center gap-1.5', st('text-emerald-700', 'text-emerald-400'))}>
                        <Sparkles className="w-3.5 h-3.5" /> AI Action Plan
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={generateAIPlan} disabled={generatingPlan} className={cn('text-[10px] px-2 py-0.5 rounded-full transition-colors', st('text-slate-500 hover:text-slate-700 hover:bg-slate-100', 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'))}>
                          Redo
                        </button>
                        <button onClick={() => { setAiPlan(null); setAiPlanOpen(false); }} className={cn('p-1 rounded-lg transition-colors', st('text-slate-400 hover:text-slate-600', 'text-zinc-600 hover:text-zinc-300'))}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {/* Immediate Actions */}
                      {aiPlan.immediate_actions && aiPlan.immediate_actions.length > 0 && (
                        <div>
                          <div className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1', st('text-slate-400', 'text-zinc-500'))}>
                            <Target className="w-3 h-3" /> Actions
                          </div>
                          <ul className="space-y-1.5">
                            {aiPlan.immediate_actions.map((action, i) => (
                              <li key={i} className={cn('text-[11px] leading-snug flex items-start gap-1.5', st('text-slate-600', 'text-zinc-300'))}>
                                <span className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-px text-[9px] font-bold', st('bg-emerald-100 text-emerald-700', 'bg-emerald-400/15 text-emerald-400'))}>
                                  {i + 1}
                                </span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Quick Wins */}
                      {aiPlan.quick_wins && aiPlan.quick_wins.length > 0 && (
                        <div>
                          <div className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1', st('text-slate-400', 'text-zinc-500'))}>
                            <Zap className="w-3 h-3" /> Quick Wins
                          </div>
                          <ul className="space-y-1.5">
                            {aiPlan.quick_wins.map((win, i) => (
                              <li key={i} className={cn('text-[11px] leading-snug flex items-start gap-1.5', st('text-slate-600', 'text-zinc-300'))}>
                                <span className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-px text-[9px] font-bold', st('bg-emerald-50 text-emerald-600', 'bg-emerald-400/10 text-emerald-300'))}>
                                  {i + 1}
                                </span>
                                {win}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 30-Day Plan */}
                      {aiPlan.thirty_day_plan && (
                        <div className={cn('pt-2.5 border-t', st('border-slate-100', 'border-zinc-800/60'))}>
                          <div className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1', st('text-slate-400', 'text-zinc-500'))}>
                            <Calendar className="w-3 h-3" /> 30-Day Plan
                          </div>
                          <p className={cn('text-[11px] leading-snug', st('text-slate-600', 'text-zinc-300'))}>{aiPlan.thirty_day_plan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Enforcement Timeline ──────────────────────── */}
        <section>
          <SectionHeader icon={Calendar} title="Enforcement Timeline" delay={0.1} />
          <div className="space-y-3">
            {ENFORCEMENT_MILESTONES.map((milestone, idx) => (
              <MilestoneCard key={milestone.date} milestone={milestone} index={idx} />
            ))}
          </div>
        </section>

        {/* ── Urgent Tasks ───────────────────────────────── */}
        {stats.urgentTasks.length > 0 && (
          <section>
            <SectionHeader icon={Zap} title="Urgent Tasks" count={stats.urgentTasks.length} delay={0.2} />
            <div className="space-y-2">
              {stats.urgentTasks.map((task: any, i: number) => (
                <UrgentTaskRow key={task.id} task={task} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── System Progress ────────────────────────────── */}
        {stats.systemProgress.length > 0 && (
          <section>
            <SectionHeader icon={Target} title="System Progress" count={stats.systemProgress.length} delay={0.3} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {stats.systemProgress.map((item: any, i: number) => (
                <SystemCard key={item.system.id} item={item} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {systems.length === 0 && (
          <SentinelEmptyState
            icon={Target}
            title="No AI Systems Registered"
            message="Register your AI systems to start tracking compliance obligations and deadlines."
            actionLabel="Register AI System"
            onAction={() => { window.location.href = createPageUrl('AISystemInventory'); }}
          />
        )}
      </div>
    </SentinelPageTransition>
  );
}
