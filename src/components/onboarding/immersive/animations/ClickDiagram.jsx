import React from 'react';
import { motion } from 'framer-motion';

const STEPS = [
  {
    clicks: 1,
    label: 'Single Click',
    description: 'Quick action',
    color: '#06b6d4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 15l-2 5L9 9l11 4-5 2z" />
        <path d="M22 22l-5-10" />
      </svg>
    ),
  },
  {
    clicks: 2,
    label: 'Double Click',
    description: 'Detail view',
    color: '#6366f1',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </svg>
    ),
  },
  {
    clicks: 3,
    label: 'Triple Click',
    description: 'AI assist',
    color: '#ec4899',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" />
        <path d="M8.24 9.93A4 4 0 0 1 12 2" />
        <path d="M12 18v-4" />
        <circle cx="12" cy="21" r="1" />
        <path d="M7 13h10" />
      </svg>
    ),
  },
];

function ClickIndicator({ count, color, delay }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: 1 }}
          transition={{
            delay: delay + i * 0.15,
            duration: 0.35,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export default function ClickDiagram() {
  return (
    <div className="flex flex-col gap-5" style={{ width: 260 }}>
      {STEPS.map((step, i) => (
        <motion.div
          key={step.clicks}
          className="flex items-center gap-4 rounded-xl px-4 py-3"
          style={{
            backgroundColor: `${step.color}08`,
            border: `1px solid ${step.color}20`,
          }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.5 + i * 0.5,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Icon */}
          <motion.div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ color: step.color, backgroundColor: `${step.color}15` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 + i * 0.5, type: 'spring', stiffness: 300 }}
          >
            {step.icon}
          </motion.div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-zinc-200">{step.label}</span>
              <ClickIndicator count={step.clicks} color={step.color} delay={0.9 + i * 0.5} />
            </div>
            <motion.span
              className="text-xs text-zinc-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 + i * 0.5 }}
            >
              {step.description}
            </motion.span>
          </div>

          {/* Arrow */}
          <motion.div
            className="text-zinc-600"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 + i * 0.5 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
