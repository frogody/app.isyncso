import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Clock, AlertTriangle, CheckCircle, Sparkles,
  FileText, Target, Zap, PlayCircle, Map, TrendingUp,
  ChevronRight, Flag,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';
import { useRoadmap } from '@/hooks/sentinel';
import { SentinelCard, SentinelCardSkeleton } from '@/components/sentinel/ui/SentinelCard';
import { SentinelButton } from '@/components/sentinel/ui/SentinelButton';
import { SentinelBadge } from '@/components/sentinel/ui/SentinelBadge';
import { SentinelEmptyState } from '@/components/sentinel/ui/SentinelErrorBoundary';
import { StatCard } from '@/components/sentinel/ui/StatCard';

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

function MilestoneCard({ milestone, index }: { milestone: typeof ENFORCEMENT_MILESTONES[0]; index: number }) {
  const isPast = new Date(milestone.date) < new Date();
  const daysUntil = Math.ceil((new Date(milestone.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const Icon = milestone.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {index < ENFORCEMENT_MILESTONES.length - 1 && (
        <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gradient-to-b from-sky-500/30 to-zinc-800/60" />
      )}

      <SentinelCard padding="md" className={isPast ? 'border-sky-500/30' : ''}>
        {isPast && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r from-sky-500 to-sky-400" />
        )}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-sky-500/20' : 'bg-zinc-800'}`}>
            <Icon className={`w-4 h-4 ${isPast ? 'text-sky-400' : 'text-zinc-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white text-lg">{milestone.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">{milestone.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isPast ? (
                  <SentinelBadge variant="success">Active</SentinelBadge>
                ) : daysUntil <= 180 ? (
                  <SentinelBadge variant="warning">{daysUntil}d</SentinelBadge>
                ) : (
                  <SentinelBadge variant="neutral">{daysUntil}d</SentinelBadge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(milestone.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function SystemProgressCard({ item, index }: { item: any; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <SentinelCard padding="md">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{item.system.name}</h3>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <SentinelBadge variant="primary">
                {item.system.risk_classification?.replace('-', ' ').toUpperCase()}
              </SentinelBadge>
              <span className="text-xs text-zinc-500">{item.completedTasks}/{item.totalTasks} tasks</span>
              {item.urgentTasks > 0 && (
                <SentinelBadge variant="warning">{item.urgentTasks} urgent</SentinelBadge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-sky-400">{Math.round(item.progress)}%</div>
            <div className="text-[10px] text-zinc-600">Complete</div>
          </div>
        </div>
        <Progress value={item.progress} className="h-2 bg-zinc-800 mb-3" />
        <div className="flex gap-2">
          <Link to={`${createPageUrl('DocumentGenerator')}?system=${item.system.id}`} className="flex-1">
            <SentinelButton size="sm" className="w-full" icon={<FileText className="w-4 h-4" />}>
              Generate Docs
            </SentinelButton>
          </Link>
          <Link to={`${createPageUrl('RiskAssessment')}?systemId=${item.system.id}`}>
            <SentinelButton size="sm" variant="secondary" icon={<Target className="w-4 h-4" />}>
              Assess
            </SentinelButton>
          </Link>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

function UrgentTaskCard({ task, index }: { task: any; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <SentinelCard padding="md" className={task.daysRemaining < 0 ? 'border-red-500/30' : ''}>
        {task.daysRemaining < 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r from-red-500/60 to-red-400/60" />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {task.daysRemaining < 0 ? (
                <SentinelBadge variant="error">{Math.abs(task.daysRemaining)} DAYS OVERDUE</SentinelBadge>
              ) : (
                <SentinelBadge variant="warning">{task.daysRemaining} days left</SentinelBadge>
              )}
            </div>
            <h4 className="font-semibold text-white text-lg mb-1">{task.obligation.obligation_title}</h4>
            <p className="text-xs text-zinc-500">{task.system.name}</p>
          </div>
          <Link to={`${createPageUrl('DocumentGenerator')}?system=${task.system.id}`}>
            <SentinelButton size="sm" icon={<PlayCircle className="w-4 h-4" />}>Start</SentinelButton>
          </Link>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

export default function ComplianceRoadmap() {
  const { systems, stats, loading } = useRoadmap();
  const [view, setView] = useState('roadmap');
  const [aiRecommendations, setAiRecommendations] = useState<AIPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

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
      setAiRecommendations(response as AIPlan);
      toast.success('AI action plan generated');
    } catch (error) {
      console.error('Failed to generate AI plan:', error);
      toast.error('Failed to generate plan');
    } finally {
      setGeneratingPlan(false);
    }
  }, [systems, stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="space-y-4">
          <SentinelCardSkeleton className="h-28" />
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => <SentinelCardSkeleton key={i} className="h-24" />)}
          </div>
          <SentinelCardSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] bg-sky-500/10 flex items-center justify-center">
              <Map className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Compliance Roadmap</h1>
              <p className="text-xs text-zinc-500">{stats.allTasks.length} tasks · {stats.progressPercent}% complete</p>
            </div>
          </div>
          <SentinelButton
            onClick={generateAIPlan}
            disabled={generatingPlan || systems.length === 0}
            loading={generatingPlan}
            icon={!generatingPlan ? <Sparkles className="w-4 h-4" /> : undefined}
          >
            {generatingPlan ? 'Analyzing...' : 'AI Action Plan'}
          </SentinelButton>
        </div>

        {/* AI Recommendations */}
        <AnimatePresence>
          {aiRecommendations && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <SentinelCard padding="md" className="bg-gradient-to-br from-sky-500/5 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    AI-Generated Action Plan
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setAiRecommendations(null)} className="text-zinc-400 hover:text-white">
                    Dismiss
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-sky-400 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Immediate Actions
                    </h4>
                    <ul className="space-y-2">
                      {aiRecommendations.immediate_actions?.map((action, i) => (
                        <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />{action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-sky-300 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Quick Wins
                    </h4>
                    <ul className="space-y-2">
                      {aiRecommendations.quick_wins?.map((win, i) => (
                        <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-sky-300 flex-shrink-0 mt-0.5" />{win}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {aiRecommendations.thirty_day_plan && (
                  <div className="mt-4 pt-4 border-t border-zinc-700/50">
                    <h4 className="text-xs font-semibold text-sky-400 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> 30-Day Plan
                    </h4>
                    <p className="text-xs text-zinc-300">{aiRecommendations.thirty_day_plan}</p>
                  </div>
                )}
              </SentinelCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={FileText} label="Total Tasks" value={stats.allTasks.length} delay={0} />
          <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueCount} delay={0.05} />
          <StatCard icon={Zap} label="Urgent (90d)" value={stats.urgentTasks.length} delay={0.1} />
          <StatCard icon={CheckCircle} label="Completed" value={stats.completedCount} delay={0.15} />
          <StatCard icon={TrendingUp} label="Progress" value={`${stats.progressPercent}%`} delay={0.2} />
        </div>

        {/* Tabs */}
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1 rounded-xl">
            <TabsTrigger value="roadmap" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 rounded-lg px-4">
              <Calendar className="w-4 h-4 mr-2" />Timeline
            </TabsTrigger>
            <TabsTrigger value="systems" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 rounded-lg px-4">
              <Target className="w-4 h-4 mr-2" />By System ({stats.systemProgress.length})
            </TabsTrigger>
            <TabsTrigger value="urgent" className="data-[state=active]:bg-sky-500/20 data-[state=active]:text-sky-400 rounded-lg px-4">
              <Zap className="w-4 h-4 mr-2" />Urgent ({stats.urgentTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roadmap" className="space-y-3 mt-4">
            {ENFORCEMENT_MILESTONES.map((milestone, idx) => (
              <MilestoneCard key={milestone.date} milestone={milestone} index={idx} />
            ))}
          </TabsContent>

          <TabsContent value="systems" className="mt-4">
            {stats.systemProgress.length === 0 ? (
              <SentinelEmptyState
                icon={Target}
                title="No Systems to Track"
                message="Register AI systems to track compliance progress"
                actionLabel="Register AI System"
                onAction={() => { window.location.href = createPageUrl('AISystemInventory'); }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {stats.systemProgress.map((item: any, i: number) => (
                  <SystemProgressCard key={item.system.id} item={item} index={i} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="urgent" className="space-y-3 mt-4">
            {stats.urgentTasks.length === 0 ? (
              <SentinelEmptyState
                icon={CheckCircle}
                title="All Clear!"
                message="No urgent tasks - all upcoming deadlines are under control"
              />
            ) : (
              stats.urgentTasks.map((task: any, i: number) => (
                <UrgentTaskCard key={task.id} task={task} index={i} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
