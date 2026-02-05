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
            {/* Use inline styles to prevent light theme CSS overrides */}
            <div
              style={{
                background: 'rgba(9, 9, 11, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ padding: '10px 16px' }}>
                <div className="flex items-center gap-2">
                  {JOURNEY_STEPS.map((step, index) => {
                    const isCompleted = currentPhase === 'launched' || index < currentIndex;
                    const isCurrent = index === currentIndex && currentPhase !== 'launched';
                    const isFuture = index > currentIndex && currentPhase !== 'launched';
                    const isClickable = isCompleted && step.path !== null && step.id !== 'wizard';
                    const StepIcon = step.icon;

                    const circleStyle = isCompleted
                      ? { background: 'rgba(34, 197, 94, 0.2)', borderColor: '#4ade80', color: '#4ade80' }
                      : isCurrent
                      ? { background: 'rgba(6, 182, 212, 0.2)', borderColor: '#22d3ee', color: '#22d3ee' }
                      : { background: 'rgba(39, 39, 42, 0.8)', borderColor: '#52525b', color: '#71717a' };

                    const labelColor = isCompleted
                      ? '#4ade80'
                      : isCurrent
                      ? '#22d3ee'
                      : '#71717a';

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
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `1.5px solid ${circleStyle.borderColor}`,
                              background: circleStyle.background,
                              color: circleStyle.color,
                              flexShrink: 0,
                              transition: 'all 0.2s',
                            }}
                          >
                            {isCompleted ? (
                              <Check className="w-3 h-3" style={{ color: circleStyle.color }} />
                            ) : (
                              <StepIcon className="w-3 h-3" style={{ color: circleStyle.color }} />
                            )}
                          </div>
                          <span
                            className="hidden sm:block"
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: labelColor,
                            }}
                          >
                            {step.label}
                          </span>
                        </div>

                        {index < JOURNEY_STEPS.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              height: 1,
                              margin: '0 4px',
                              background: (currentPhase === 'launched' || index < currentIndex)
                                ? 'rgba(74, 222, 128, 0.4)'
                                : 'rgba(63, 63, 70, 0.6)',
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Collapse button */}
                  <button
                    onClick={() => setExpanded(false)}
                    style={{
                      marginLeft: 12,
                      padding: 4,
                      borderRadius: 6,
                      color: '#a1a1aa',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'rgba(24, 24, 27, 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Show campaign progress"
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #22d3ee',
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#22d3ee',
                }}
              >
                {currentStep?.icon && <currentStep.icon className="w-2.5 h-2.5" style={{ color: '#22d3ee' }} />}
              </div>
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>
                {currentStep?.label || 'Progress'}
              </span>
              <ChevronDown className="w-3 h-3" style={{ color: '#71717a' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
