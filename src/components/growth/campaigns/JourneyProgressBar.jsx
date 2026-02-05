import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/GlobalThemeContext';
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

// Indigo-themed color palettes
const DARK_THEME = {
  bar: {
    background: 'rgba(15, 15, 25, 0.95)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.05)',
  },
  completed: {
    bg: 'rgba(99, 102, 241, 0.15)',
    border: '#818cf8',
    color: '#a5b4fc',
    labelColor: '#a5b4fc',
  },
  current: {
    bg: 'rgba(99, 102, 241, 0.25)',
    border: '#6366f1',
    color: '#ffffff',
    labelColor: '#c7d2fe',
    shadow: '0 0 10px rgba(99, 102, 241, 0.4)',
  },
  future: {
    bg: 'rgba(39, 39, 50, 0.8)',
    border: 'rgba(63, 63, 80, 0.6)',
    color: 'rgba(161, 161, 178, 0.5)',
    labelColor: 'rgba(161, 161, 178, 0.5)',
  },
  connector: {
    done: 'rgba(129, 140, 248, 0.4)',
    pending: 'rgba(63, 63, 80, 0.4)',
  },
  collapse: { color: 'rgba(161, 161, 178, 0.6)' },
  nudge: {
    background: 'rgba(15, 15, 25, 0.92)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    shadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    labelColor: 'rgba(161, 161, 178, 0.7)',
  },
};

const LIGHT_THEME = {
  bar: {
    background: 'rgba(255, 255, 255, 0.97)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    shadow: '0 4px 20px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  completed: {
    bg: 'rgba(99, 102, 241, 0.1)',
    border: '#6366f1',
    color: '#4f46e5',
    labelColor: '#4338ca',
  },
  current: {
    bg: 'rgba(99, 102, 241, 0.15)',
    border: '#4f46e5',
    color: '#ffffff',
    bgSolid: '#6366f1',
    labelColor: '#4338ca',
    shadow: '0 0 8px rgba(99, 102, 241, 0.3)',
  },
  future: {
    bg: 'rgba(241, 245, 249, 0.8)',
    border: 'rgba(203, 213, 225, 0.6)',
    color: 'rgba(148, 163, 184, 0.7)',
    labelColor: 'rgba(148, 163, 184, 0.7)',
  },
  connector: {
    done: 'rgba(99, 102, 241, 0.3)',
    pending: 'rgba(203, 213, 225, 0.4)',
  },
  collapse: { color: 'rgba(100, 116, 139, 0.6)' },
  nudge: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    shadow: '0 4px 12px rgba(99, 102, 241, 0.06), 0 1px 3px rgba(0, 0, 0, 0.06)',
    labelColor: 'rgba(100, 116, 139, 0.7)',
  },
};

export default function JourneyProgressBar({ campaignId, currentPhase }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const currentIndex = JOURNEY_STEPS.findIndex((s) => s.id === currentPhase);
  const currentStep = JOURNEY_STEPS[currentIndex];
  const t = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

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
            <div
              style={{
                background: t.bar.background,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: t.bar.border,
                borderRadius: 14,
                boxShadow: t.bar.shadow,
              }}
            >
              <div style={{ padding: '10px 16px' }}>
                <div className="flex items-center gap-1.5">
                  {JOURNEY_STEPS.map((step, index) => {
                    const isCompleted = currentPhase === 'launched' || index < currentIndex;
                    const isCurrent = index === currentIndex && currentPhase !== 'launched';
                    const isFuture = index > currentIndex && currentPhase !== 'launched';
                    const isClickable = isCompleted && step.path !== null && step.id !== 'wizard';
                    const StepIcon = step.icon;

                    const palette = isCompleted ? t.completed : isCurrent ? t.current : t.future;

                    return (
                      <React.Fragment key={step.id}>
                        <div
                          className={`flex items-center gap-1.5 ${
                            isClickable ? 'cursor-pointer' : 'cursor-default'
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
                          style={{
                            opacity: isClickable ? undefined : 1,
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.opacity = '0.75'; }}
                          onMouseLeave={(e) => { if (isClickable) e.currentTarget.style.opacity = '1'; }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `1.5px solid ${palette.border}`,
                              background: isCurrent && palette.bgSolid ? palette.bgSolid : palette.bg,
                              color: palette.color,
                              flexShrink: 0,
                              transition: 'all 0.2s',
                              boxShadow: isCurrent ? palette.shadow : 'none',
                            }}
                          >
                            {isCompleted ? (
                              <Check style={{ width: 12, height: 12, color: palette.color }} />
                            ) : (
                              <StepIcon style={{ width: 12, height: 12, color: palette.color }} />
                            )}
                          </div>
                          <span
                            className="hidden sm:block"
                            style={{
                              fontSize: 11,
                              fontWeight: isCurrent ? 600 : 500,
                              color: palette.labelColor,
                              letterSpacing: '0.01em',
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
                              margin: '0 2px',
                              background: (currentPhase === 'launched' || index < currentIndex)
                                ? t.connector.done
                                : t.connector.pending,
                              transition: 'background 0.3s',
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}

                  <button
                    onClick={() => setExpanded(false)}
                    style={{
                      marginLeft: 10,
                      padding: 4,
                      borderRadius: 6,
                      color: t.collapse.color,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = theme === 'dark' ? '#e2e8f0' : '#334155'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = t.collapse.color; }}
                    title="Minimize progress bar"
                  >
                    <ChevronUp style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
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
                background: t.nudge.background,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: t.nudge.border,
                borderRadius: 12,
                boxShadow: t.nudge.shadow,
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
                  border: '1.5px solid #6366f1',
                  background: theme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : '#6366f1',
                  color: theme === 'dark' ? '#c7d2fe' : '#ffffff',
                }}
              >
                {currentStep?.icon && (
                  <currentStep.icon
                    style={{
                      width: 10,
                      height: 10,
                      color: theme === 'dark' ? '#c7d2fe' : '#ffffff',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 12, color: t.nudge.labelColor, fontWeight: 500 }}>
                {currentStep?.label || 'Progress'}
              </span>
              <ChevronDown style={{ width: 12, height: 12, color: t.nudge.labelColor }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
