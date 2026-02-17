import React, { memo } from 'react';
import { Flame, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PriorityToggle - Toggle between Priority view and standard view.
 *
 * Shows a flame icon for priority mode, list icon for standard.
 * Includes a badge showing urgent channel count when > 0.
 *
 * @param {Object} props
 * @param {boolean} props.isPriority - Whether priority view is active
 * @param {Function} props.onToggle - Callback to toggle view
 * @param {number} props.urgentCount - Number of urgent channels (score >= 80)
 */
const PriorityToggle = memo(function PriorityToggle({ isPriority = false, onToggle, urgentCount = 0 }) {
  return (
    <button
      onClick={onToggle}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        isPriority
          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
          : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600/50'
      }`}
      title={isPriority ? 'Switch to standard view' : 'Switch to priority view'}
    >
      <AnimatePresence mode="wait">
        {isPriority ? (
          <motion.div
            key="flame"
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 30, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Flame className="w-3.5 h-3.5" />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ rotate: 30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -30, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <List className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="hidden sm:inline">
        {isPriority ? 'Priority' : 'Standard'}
      </span>

      {/* Urgent count badge */}
      <AnimatePresence>
        {urgentCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={`min-w-[16px] h-[16px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center ${
              isPriority
                ? 'bg-red-500/80 text-white'
                : 'bg-red-500/60 text-red-100'
            }`}
          >
            {urgentCount > 9 ? '9+' : urgentCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
});

export default PriorityToggle;
