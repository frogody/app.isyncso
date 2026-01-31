import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AISystemRecord } from '@/tokens/sentinel';
import { useSentinelTheme } from '@/contexts/SentinelThemeContext';

interface WorkflowStep {
  id: number;
  title: string;
  subtitle: string;
  path: string;
  count: string;
  isComplete: boolean;
  isCurrent: boolean;
}

interface WorkflowStepperProps {
  systems?: AISystemRecord[];
}

export default function WorkflowStepper({ systems = [] }: WorkflowStepperProps) {
  const hasRegisteredSystems = systems.length > 0;
  const unclassifiedCount = systems.filter(s => s.risk_classification === 'unclassified').length;
  const allSystemsClassified = systems.length > 0 && unclassifiedCount === 0;
  const highRiskCount = systems.filter(s => s.risk_classification === 'high-risk').length;
  const hasHighRiskSystems = highRiskCount > 0;
  const taskCount = highRiskCount * 22;

  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Register',
      subtitle: 'AI Systems',
      path: createPageUrl('AISystemInventory'),
      count: `${systems.length} systems`,
      isComplete: hasRegisteredSystems,
      isCurrent: !hasRegisteredSystems,
    },
    {
      id: 2,
      title: 'Classify',
      subtitle: 'Risk Level',
      path: createPageUrl('AISystemInventory'),
      count: allSystemsClassified ? 'All classified' : `${unclassifiedCount} pending`,
      isComplete: allSystemsClassified,
      isCurrent: hasRegisteredSystems && !allSystemsClassified,
    },
    {
      id: 3,
      title: 'Plan',
      subtitle: 'Roadmap',
      path: createPageUrl('ComplianceRoadmap'),
      count: `${taskCount} tasks`,
      isComplete: false,
      isCurrent: allSystemsClassified && !hasHighRiskSystems,
    },
    {
      id: 4,
      title: 'Document',
      subtitle: 'Compliance',
      path: createPageUrl('DocumentGenerator'),
      count: '0 generated',
      isComplete: false,
      isCurrent: hasHighRiskSystems,
    },
  ];

  const { st } = useSentinelTheme();

  return (
    <div className={cn('rounded-[20px] p-6 backdrop-blur-sm border', st('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/50 border-zinc-800/60'))}>
      <div className="flex items-center justify-between gap-4">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const Icon = step.isComplete ? CheckCircle : Circle;

          return (
            <React.Fragment key={step.id}>
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link
                  to={step.path}
                  className={cn(
                    'block group transition-all duration-200',
                    step.isCurrent ? 'scale-105' : step.isComplete ? 'opacity-80 hover:opacity-100' : 'opacity-60 hover:opacity-80'
                  )}
                >
                  <div className={cn(
                    'relative p-4 rounded-[20px] border transition-all',
                    step.isCurrent
                      ? st('bg-violet-50 border-violet-300 shadow-md', 'bg-sky-500/10 border-sky-500/40 shadow-glow')
                      : step.isComplete
                      ? st('bg-violet-50/50 border-violet-200', 'bg-sky-500/5 border-sky-500/20')
                      : st('bg-slate-50 border-slate-200', 'bg-zinc-800/30 border-zinc-700/30')
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                        step.isCurrent
                          ? st('bg-violet-100 text-violet-500', 'bg-sky-500/20 text-sky-400')
                          : step.isComplete
                          ? 'bg-green-500/20 text-green-400'
                          : st('bg-slate-100 text-slate-400', 'bg-zinc-700/30 text-zinc-500')
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'font-bold text-sm block mb-0.5',
                          step.isCurrent ? st('text-violet-600', 'text-sky-400') : step.isComplete ? st('text-slate-900', 'text-white') : st('text-slate-400', 'text-zinc-400')
                        )}>
                          {step.title}
                        </span>
                        <div className={cn('text-xs mb-1', st('text-slate-400', 'text-zinc-500'))}>{step.subtitle}</div>
                        <div className={cn(
                          'text-xs font-medium',
                          step.isCurrent ? st('text-violet-500', 'text-sky-300') : step.isComplete ? st('text-violet-400', 'text-sky-300/70') : st('text-slate-400', 'text-zinc-500')
                        )}>
                          {step.count}
                        </div>
                      </div>
                    </div>

                    {step.isCurrent && systems.length === 0 && (
                      <motion.div
                        className={cn('absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap', st('bg-violet-500', 'bg-sky-500'))}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        START HERE
                      </motion.div>
                    )}

                    {/* Active step indicator */}
                    {step.isCurrent && (
                      <motion.div
                        className={cn('absolute -bottom-px left-4 right-4 h-0.5 rounded-full', st('bg-violet-500', 'bg-sky-500'))}
                        layoutId="activeWorkflowStep"
                      />
                    )}
                  </div>
                </Link>
              </motion.div>

              {!isLast && (
                <ArrowRight className={cn('w-5 h-5 flex-shrink-0', st('text-slate-300', 'text-zinc-600'))} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
