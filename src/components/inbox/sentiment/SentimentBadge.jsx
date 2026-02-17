/**
 * SentimentBadge - Small badge for channel list items showing sentiment.
 *
 * Color-coded dot: green (positive), amber (mixed), red (negative).
 * Pulsing animation for channels with active sentiment alerts.
 * Shows trend arrow (up/down/stable).
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SentimentBadge = memo(function SentimentBadge({
  score = 50,
  trend = 'stable',
  hasAlert = false,
  compact = true,
}) {
  // Determine sentiment tier
  const isPositive = score >= 65;
  const isNegative = score <= 35;

  // Color classes
  const dotColor = isPositive
    ? 'bg-green-400'
    : isNegative
    ? 'bg-red-400'
    : 'bg-amber-400';

  const glowColor = isPositive
    ? 'bg-green-400/30'
    : isNegative
    ? 'bg-red-400/30'
    : 'bg-amber-400/30';

  const TrendIcon = trend === 'up'
    ? TrendingUp
    : trend === 'down'
    ? TrendingDown
    : Minus;

  const trendColor = trend === 'up'
    ? 'text-green-400'
    : trend === 'down'
    ? 'text-red-400'
    : 'text-zinc-600';

  // Don't show anything for perfectly neutral scores with no trend
  if (score >= 45 && score <= 55 && trend === 'stable' && !hasAlert) {
    return null;
  }

  return (
    <motion.div
      className="flex items-center gap-1 flex-shrink-0"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      {/* Sentiment dot with optional pulse */}
      <div className="relative">
        {hasAlert && (
          <motion.div
            className={`absolute inset-0 rounded-full ${glowColor}`}
            animate={{
              scale: [1, 2, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        <div className={`relative w-1.5 h-1.5 rounded-full ${dotColor}`} />
      </div>

      {/* Trend arrow (only in non-compact mode or when there is a directional trend) */}
      {(!compact || trend !== 'stable') && (
        <TrendIcon className={`w-2.5 h-2.5 ${trendColor}`} />
      )}
    </motion.div>
  );
});

export default SentimentBadge;
