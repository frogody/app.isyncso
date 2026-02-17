import React, { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * PriorityIndicator - Visual urgency indicator for channel list items.
 *
 * Score thresholds:
 *  80-100: Red pulse dot + "Urgent" label
 *  60-79:  Amber glow dot + "Important"
 *  30-59:  Cyan dot (normal)
 *  0-29:   No indicator
 *
 * @param {Object} props
 * @param {number} props.score - Priority score (0-100)
 * @param {boolean} props.compact - If true, show only the dot (no label)
 */
const PriorityIndicator = memo(function PriorityIndicator({ score = 0, compact = false }) {
  if (score < 30) return null;

  // Urgent: 80-100
  if (score >= 80) {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {/* Glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500/30"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Core dot */}
          <div className="relative w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
        </motion.div>
        {!compact && (
          <motion.span
            className="text-[9px] font-bold text-red-400 uppercase tracking-wider"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Urgent
          </motion.span>
        )}
      </div>
    );
  }

  // Important: 60-79
  if (score >= 60) {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {/* Subtle glow */}
          <div className="absolute inset-0 rounded-full bg-amber-400/20 scale-150" />
          {/* Core dot */}
          <div className="relative w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
        </motion.div>
        {!compact && (
          <motion.span
            className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Important
          </motion.span>
        )}
      </div>
    );
  }

  // Normal: 30-59
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
      </motion.div>
    </div>
  );
});

export default PriorityIndicator;
