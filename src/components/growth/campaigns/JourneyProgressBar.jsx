import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Database,
  Sparkles,
  GitBranch,
  CheckCircle2,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const JOURNEY_STEPS = [
  { id: 'wizard', label: 'Campaign', icon: Rocket, path: null },
  { id: 'nests', label: 'Prospects', icon: Database, path: (id) => `/growth/campaign/${id}/nests` },
  { id: 'enrich', label: 'Enrich', icon: Sparkles, path: (id) => `/growth/campaign/${id}/enrich` },
  { id: 'flow', label: 'Flow', icon: GitBranch, path: (id) => `/growth/campaign/${id}/flow` },
  { id: 'review', label: 'Review', icon: CheckCircle2, path: (id) => `/growth/campaign/${id}/review` },
  { id: 'launched', label: 'Launched', icon: Zap, path: null },
];

export default function JourneyProgressBar({ campaignId, currentPhase }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.id === currentPhase);
  const currentStep = JOURNEY_STEPS[currentIndex];

  return (
    <div className="fixed top-3 right-16 z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="bar"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto"
          >
            <div className="bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-xl shadow-lg shadow-black/30">
              <div className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {JOURNEY_STEPS.map((step, index) => {
                    const isCompleted = currentPhase === 'launched' || index < currentIndex;
                    const isCurrent = index === currentIndex && currentPhase !== 'launched';
                    const isFuture = index > currentIndex && currentPhase !== 'launched';
                    const isClickable = isCompleted && step.path !== null && step.id !== 'wizard';
                    const StepIcon = step.icon;

                    return (
                      <React.Fragment key={step.id}>
                        <div
                          className={`flex items-center gap-1.5 ${
                            isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                          }`}
                          onClick={() => isClickable && navigate(step.path(campaignId))}
                          role={isClickable ? 'button' : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              navigate(step.path(campaignId));
                            }
                          }}
                        >
                          <div
                            className={[
                              'w-7 h-7 rounded-full flex items-center justify-center border transition-all flex-shrink-0',
                              isCompleted && 'bg-green-500/20 border-green-400 text-green-400',
                              isCurrent && 'bg-cyan-500/20 border-cyan-400 text-cyan-400',
                              isFuture && 'bg-zinc-800/80 border-zinc-600 text-zinc-500',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {isCompleted ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <StepIcon className="w-3 h-3" />
                            )}
                          </div>
                          <span
                            className={[
                              'text-xs font-medium hidden sm:block',
                              isCompleted && 'text-green-400',
                              isCurrent && 'text-cyan-400',
                              isFuture && 'text-zinc-500',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {step.label}
                          </span>
                        </div>

                        {index < JOURNEY_STEPS.length - 1 && (
                          <div
                            className={[
                              'flex-1 h-px mx-1',
                              (currentPhase === 'launched' || index < currentIndex)
                                ? 'bg-green-400/40'
                                : 'bg-zinc-700/60',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Collapse button */}
                  <button
                    onClick={() => setExpanded(false)}
                    className="ml-3 p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                    title="Minimize progress bar"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Collapsed nudge tab */
          <motion.div
            key="nudge"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex justify-end"
          >
            <button
              onClick={() => setExpanded(true)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-lg shadow-black/20 hover:bg-zinc-800/90 transition-all"
              title="Show campaign progress"
            >
              <div
                className={[
                  'w-5 h-5 rounded-full flex items-center justify-center border',
                  'bg-cyan-500/20 border-cyan-400 text-cyan-400',
                ].join(' ')}
              >
                {currentStep?.icon && <currentStep.icon className="w-2.5 h-2.5" />}
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-zinc-200">
                {currentStep?.label || 'Progress'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
