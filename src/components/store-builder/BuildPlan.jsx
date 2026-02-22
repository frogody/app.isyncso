// ---------------------------------------------------------------------------
// BuildPlan.jsx -- Visual task execution component for AI chat messages.
// Shows the AI's structured workflow: plan title + animated task checklist.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Loader2,
  ListChecks,
  ChevronDown,
} from 'lucide-react';

// ── Single Task Row ──────────────────────────────────────────────────────────

function TaskRow({ task, index, animating }) {
  const [status, setStatus] = useState(animating ? 'pending' : 'done');

  useEffect(() => {
    if (!animating) {
      setStatus('done');
      return;
    }
    // Stagger: each task starts after the previous one finishes
    const startDelay = index * 1200;
    const runDelay = startDelay + 400;

    const t1 = setTimeout(() => setStatus('running'), startDelay);
    const t2 = setTimeout(() => setStatus('done'), runDelay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animating, index]);

  return (
    <motion.div
      initial={animating ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animating ? index * 0.15 : 0, duration: 0.2 }}
      className="flex items-center gap-2 py-1"
    >
      {/* Status icon */}
      {status === 'done' && (
        <motion.div
          initial={animating ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        </motion.div>
      )}
      {status === 'running' && (
        <Loader2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-spin" />
      )}
      {status === 'pending' && (
        <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
      )}

      {/* Label */}
      <span
        className={`text-[11px] leading-tight transition-colors duration-300 ${
          status === 'done'
            ? 'text-zinc-300'
            : status === 'running'
              ? 'text-cyan-400'
              : 'text-zinc-600'
        }`}
      >
        {task.label}
      </span>
    </motion.div>
  );
}

// ── Main BuildPlan Component ─────────────────────────────────────────────────

export default function BuildPlan({ plan, animate }) {
  const [expanded, setExpanded] = useState(true);
  const hasAnimated = useRef(false);

  // Only animate once
  const shouldAnimate = animate && !hasAnimated.current;
  useEffect(() => {
    if (animate) hasAnimated.current = true;
  }, [animate]);

  if (!plan || !plan.tasks?.length) return null;

  const doneCount = plan.tasks.length; // All tasks are "done" from AI
  const totalCount = plan.tasks.length;

  return (
    <div className="mx-4 mb-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="w-5 h-5 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0">
          <ListChecks className="w-3 h-3 text-cyan-400" />
        </div>
        <span className="text-[11px] font-medium text-zinc-200 truncate flex-1 text-left">
          {plan.title || 'Build Plan'}
        </span>
        <span className="text-[10px] text-cyan-400 font-mono shrink-0">
          {doneCount}/{totalCount}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Task list */}
      {expanded && (
        <motion.div
          initial={shouldAnimate ? { height: 0 } : { height: 'auto' }}
          animate={{ height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="px-3 pb-2.5 border-t border-zinc-800/50"
        >
          <div className="pt-1.5">
            {plan.tasks.map((task, i) => (
              <TaskRow
                key={i}
                task={task}
                index={i}
                animating={shouldAnimate}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
              initial={shouldAnimate ? { width: '0%' } : { width: '100%' }}
              animate={{ width: '100%' }}
              transition={
                shouldAnimate
                  ? { delay: 0.5, duration: totalCount * 0.8, ease: 'easeOut' }
                  : { duration: 0 }
              }
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
