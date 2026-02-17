/**
 * SentimentAlert - Alert banner when sentiment drops significantly.
 *
 * Shows a dismissible warning banner with animated entrance.
 * "Tension detected in #client-google - sentiment dropped 40% this week"
 * Links to the full sentiment panel for details.
 */

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight, TrendingDown } from 'lucide-react';

const SentimentAlert = memo(function SentimentAlert({
  alert = null,
  onDismiss,
  onViewDetails,
}) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.(alert?.id);
  }, [alert?.id, onDismiss]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(alert?.channelId);
  }, [alert?.channelId, onViewDetails]);

  if (!alert || dismissed) return null;

  const isCritical = alert.severity === 'critical';

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          transition={{
            duration: 0.35,
            ease: [0.4, 0, 0.2, 1],
            height: { duration: 0.3 },
          }}
          className="overflow-hidden"
        >
          <div className={`mx-3 mt-2 px-3 py-2.5 rounded-lg border ${
            isCritical
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}>
            {/* Top row: icon + message */}
            <div className="flex items-start gap-2">
              <motion.div
                animate={{ rotate: [0, -8, 8, -4, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  isCritical ? 'text-red-400' : 'text-amber-400'
                }`} />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium leading-relaxed ${
                  isCritical ? 'text-red-300' : 'text-amber-300'
                }`}>
                  Tension detected in <span className="font-semibold">#{alert.channelName}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TrendingDown className={`w-3 h-3 ${
                    isCritical ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <span className="text-[10px] text-zinc-500">
                    Sentiment dropped {alert.drop}% &middot; {alert.previousScore} &rarr; {alert.currentScore}
                  </span>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="p-0.5 hover:bg-zinc-700/40 rounded transition-colors flex-shrink-0"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5 text-zinc-600" />
              </button>
            </div>

            {/* View details link */}
            <button
              onClick={handleViewDetails}
              className={`flex items-center gap-1 mt-1.5 ml-6 text-[10px] font-medium transition-colors ${
                isCritical
                  ? 'text-red-400/70 hover:text-red-400'
                  : 'text-amber-400/70 hover:text-amber-400'
              }`}
            >
              View sentiment details
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default SentimentAlert;
