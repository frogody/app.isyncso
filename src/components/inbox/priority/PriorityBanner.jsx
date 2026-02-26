import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap } from 'lucide-react';

/**
 * PriorityBanner - Urgency summary banner for the inbox sidebar.
 *
 * Shows at the top of the sidebar when in priority mode.
 * Displays "X channels need attention" with a breakdown of urgent/important counts.
 * Auto-hides when there are no urgent or important channels.
 *
 * @param {Object} props
 * @param {Function} props.getPriorityScore - Function to get score for a channelId
 * @param {Array} props.channels - All channels
 * @param {boolean} props.isPriorityView - Whether priority view is active
 */
const PriorityBanner = memo(function PriorityBanner({ getPriorityScore, channels = [], isPriorityView = false }) {
  const { urgentCount, importantCount, totalAttention } = useMemo(() => {
    let urgent = 0;
    let important = 0;

    for (const channel of channels) {
      const score = getPriorityScore(channel.id);
      if (score >= 80) urgent++;
      else if (score >= 60) important++;
    }

    return {
      urgentCount: urgent,
      importantCount: important,
      totalAttention: urgent + important,
    };
  }, [channels, getPriorityScore]);

  // Auto-hide when nothing needs attention or not in priority view
  if (!isPriorityView || totalAttention === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          {/* Header line */}
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-200">
              {totalAttention} channel{totalAttention !== 1 ? 's' : ''} need{totalAttention === 1 ? 's' : ''} attention
            </span>
          </div>

          {/* Breakdown */}
          <div className="flex items-center gap-3 text-[10px]">
            {urgentCount > 0 && (
              <motion.div
                className="flex items-center gap-1"
                initial={{ x: -8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-400 font-medium">
                  {urgentCount} urgent
                </span>
              </motion.div>
            )}
            {importantCount > 0 && (
              <motion.div
                className="flex items-center gap-1"
                initial={{ x: -8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400 font-medium">
                  {importantCount} important
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default PriorityBanner;
