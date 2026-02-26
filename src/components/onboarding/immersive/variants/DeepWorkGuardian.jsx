import React from 'react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: '🔔',
    title: 'Smart notification batching',
    desc: 'Group and prioritize notifications so you stay in flow without missing what matters.',
  },
  {
    icon: '⏱️',
    title: 'Focus session management',
    desc: 'Structured deep work sessions with automatic do-not-disturb and progress tracking.',
  },
  {
    icon: '🧠',
    title: 'Context switching reduction',
    desc: 'Minimize cognitive overhead by batching related tasks and blocking distractions.',
  },
  {
    icon: '🎯',
    title: 'Priority task surfacing',
    desc: 'Surface your highest-impact tasks at the right time based on your energy and schedule.',
  },
];

export default function DeepWorkGuardian({ userName }) {
  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col items-center text-center px-4">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="w-20 h-20 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center mb-6 text-4xl"
      >
        🛡️
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-white mb-2"
      >
        Meet your Deep Work Guardian
      </motion.h2>

      {/* Personalized greeting */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-zinc-400 text-sm mb-8 max-w-sm"
      >
        Hey {firstName}, based on your workflow, this agent will be your primary
        AI companion.
      </motion.p>

      {/* Feature list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-3 w-full max-w-sm"
      >
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="flex items-start gap-3 text-left p-3 rounded-xl bg-zinc-900/40 border border-zinc-800"
          >
            <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center shrink-0 text-sm">
              {feature.icon}
            </div>
            <div>
              <p className="text-sm text-white font-medium">{feature.title}</p>
              <p className="text-xs text-zinc-500">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
