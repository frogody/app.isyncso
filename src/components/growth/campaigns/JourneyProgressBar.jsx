import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Rocket,
  Database,
  Sparkles,
  GitBranch,
  CheckCircle2,
  Zap,
  Check,
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
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.id === currentPhase);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        {JOURNEY_STEPS.map((step, index) => {
          const isCompleted = currentPhase === 'launched' || index < currentIndex;
          const isCurrent = index === currentIndex && currentPhase !== 'launched';
          const isFuture = index > currentIndex && currentPhase !== 'launched';
          const isClickable = isCompleted && step.path !== null && step.id !== 'wizard';

          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              {/* Step circle + label */}
              <div
                className={`flex flex-col items-center gap-1.5 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={() => {
                  if (isClickable) {
                    navigate(step.path(campaignId));
                  }
                }}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    navigate(step.path(campaignId));
                  }
                }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    isCompleted && 'bg-green-500/20 border-green-400 text-green-400',
                    isCurrent && 'bg-cyan-500/20 border-cyan-400 text-cyan-400 ring-4 ring-cyan-400/20 animate-pulse',
                    isFuture && 'bg-zinc-800 border-zinc-600 text-zinc-500',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </motion.div>

                <span
                  className={[
                    'text-xs font-medium hidden sm:block transition-colors duration-300',
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

              {/* Connector line between steps */}
              {index < JOURNEY_STEPS.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.06 + 0.1, duration: 0.3 }}
                  className={[
                    'flex-1 h-0.5 mx-2 origin-left transition-colors duration-300',
                    (currentPhase === 'launched' || index < currentIndex)
                      ? 'bg-green-400/50'
                      : 'bg-zinc-700',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </motion.div>
  );
}
