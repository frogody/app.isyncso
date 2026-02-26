/**
 * SentimentIndicator - Compact sentiment display for channel headers.
 *
 * Shows the current sentiment as an animated icon (Smile/Meh/Frown)
 * with a color-coded background. Clicking expands the full SentimentPanel.
 * Includes a tooltip with details: "Sentiment: 72% positive, trending up"
 */

import React, { memo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Meh, Frown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ICON_MAP = {
  smile: Smile,
  meh: Meh,
  frown: Frown,
};

const COLOR_MAP = {
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
    hoverBg: 'hover:bg-green-500/20',
  },
  zinc: {
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    text: 'text-zinc-400',
    hoverBg: 'hover:bg-zinc-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    hoverBg: 'hover:bg-red-500/20',
  },
};

const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const TREND_COLORS = {
  up: 'text-green-400',
  down: 'text-red-400',
  stable: 'text-zinc-500',
};

const TREND_LABELS = {
  up: 'trending up',
  down: 'trending down',
  stable: 'stable',
};

const SentimentIndicator = memo(function SentimentIndicator({
  sentiment = {},
  trend = 'stable',
  positivePercent = 50,
  onClick,
  compact = false,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef(null);

  const { score = 50, label = 'neutral', color = 'zinc', icon = 'meh' } = sentiment;
  const SentimentIcon = ICON_MAP[icon] || Meh;
  const TrendIcon = TREND_ICONS[trend] || Minus;
  const colors = COLOR_MAP[color] || COLOR_MAP.zinc;
  const trendColor = TREND_COLORS[trend] || TREND_COLORS.stable;

  const handleMouseEnter = () => {
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  };

  if (compact) {
    return (
      <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <SentimentIcon className={`w-3.5 h-3.5 ${colors.text}`} />
        </motion.div>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 whitespace-nowrap"
            >
              <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 shadow-xl">
                <span className="text-[10px] text-zinc-300">
                  Sentiment: {positivePercent}% positive, {TREND_LABELS[trend]}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <motion.button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-200 cursor-pointer ${colors.bg} ${colors.border} ${colors.hoverBg}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Sentiment icon with subtle pulse for negative */}
        <motion.div
          animate={
            color === 'red'
              ? { scale: [1, 1.1, 1] }
              : {}
          }
          transition={
            color === 'red'
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
        >
          <SentimentIcon className={`w-4 h-4 ${colors.text}`} />
        </motion.div>

        {/* Score label */}
        <span className={`text-xs font-medium ${colors.text} capitalize`}>
          {label}
        </span>

        {/* Trend arrow */}
        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 whitespace-nowrap"
          >
            <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-2 shadow-xl">
              <div className="flex items-center gap-2">
                <SentimentIcon className={`w-3.5 h-3.5 ${colors.text}`} />
                <span className="text-[11px] text-zinc-200 font-medium">
                  {positivePercent}% positive
                </span>
                <span className="text-[10px] text-zinc-500">|</span>
                <div className="flex items-center gap-1">
                  <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                  <span className={`text-[10px] ${trendColor}`}>
                    {TREND_LABELS[trend]}
                  </span>
                </div>
              </div>
              <div className="text-[9px] text-zinc-500 mt-0.5">
                Score: {score}/100 - Click for details
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SentimentIndicator;
