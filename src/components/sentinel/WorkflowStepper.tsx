import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle, Circle } from 'lucide-react';
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

  const completedCount = steps.filter(s => s.isComplete).length;
  const progressPct = (completedCount / steps.length) * 100;

  return (
    <div className={cn('rounded-[20px] p-6 backdrop-blur-sm border', st('bg-white border-slate-200 shadow-sm', 'bg-zinc-900/50 border-zinc-800/60'))}>
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const prevComplete = idx === 0 || steps[idx - 1].isComplete;

          return (
            <React.Fragment key={step.id}>
              <motion.div
                className="flex-1 min-w-0"
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
                    'relative p-4 rounded-[20px] border transition-all overflow-hidden',
                    step.isCurrent
                      ? st('bg-emerald-50 border-emerald-300 shadow-md', 'bg-emerald-500/10 border-emerald-500/40 shadow-glow')
                      : step.isComplete
                      ? st('bg-emerald-50/50 border-emerald-200', 'bg-emerald-500/5 border-emerald-500/20')
                      : st('bg-slate-50 border-slate-200', 'bg-zinc-800/30 border-zinc-700/30')
                  )}>
                    {/* Top emerald accent bar for current step */}
                    {step.isCurrent && (
                      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', st('bg-emerald-500', 'bg-emerald-400'))} />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Step circle with number or check */}
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors relative',
                        step.isComplete
                          ? 'bg-green-500 text-white'
                          : step.isCurrent
                          ? st('bg-emerald-100 text-emerald-600', 'bg-emerald-500/20 text-emerald-400')
                          : st('bg-slate-100 text-slate-400', 'bg-zinc-700/30 text-zinc-500')
                      )}>
                        {step.isComplete ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-xs font-bold">{step.id}</span>
                        )}
                        {/* Emerald ring animation for current step */}
                        {step.isCurrent && (
                          <motion.div
                            className={cn('absolute inset-0 rounded-full border-2', st('border-emerald-400', 'border-emerald-500'))}
                            animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'font-bold text-sm block mb-0.5',
                          step.isCurrent ? st('text-emerald-600', 'text-emerald-400') : step.isComplete ? st('text-slate-900', 'text-white') : st('text-slate-400', 'text-zinc-400')
                        )}>
                          {step.title}
                        </span>
                        <div className={cn('text-xs mb-1', st('text-slate-400', 'text-zinc-500'))}>{step.subtitle}</div>
                        <div className={cn(
                          'text-xs font-medium',
                          step.isCurrent ? st('text-emerald-500', 'text-emerald-300') : step.isComplete ? st('text-emerald-400', 'text-emerald-300/70') : st('text-slate-400', 'text-zinc-500')
                        )}>
                          {step.count}
                        </div>
                      </div>
                    </div>

                    {/* START HERE badge with bounce */}
                    {step.isCurrent && systems.length === 0 && (
                      <motion.div
                        className={cn('absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap', st('bg-emerald-500', 'bg-emerald-500'))}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: [0, -3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        START HERE
                      </motion.div>
                    )}

                    {/* Active step indicator */}
                    {step.isCurrent && (
                      <motion.div
                        className={cn('absolute -bottom-px left-4 right-4 h-0.5 rounded-full', st('bg-emerald-500', 'bg-emerald-500'))}
                        layoutId="activeWorkflowStep"
                      />
                    )}
                  </div>
                </Link>
              </motion.div>

              {/* Connecting line between steps */}
              {!isLast && (
                <div className="w-8 flex-shrink-0 flex items-center justify-center px-1">
                  <div className={cn(
                    'h-0.5 flex-1 rounded-full transition-colors',
                    step.isComplete
                      ? st('bg-emerald-400', 'bg-emerald-500')
                      : st('bg-slate-200', 'bg-zinc-700')
                  )} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className={cn('mt-4 h-1 rounded-full overflow-hidden', st('bg-slate-100', 'bg-zinc-800'))}>
        <motion.div
          className={cn('h-full rounded-full', st('bg-emerald-500', 'bg-emerald-400'))}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
