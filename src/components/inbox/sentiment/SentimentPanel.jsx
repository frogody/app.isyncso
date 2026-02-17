/**
 * SentimentPanel - Full sentiment analysis drawer panel.
 *
 * Slide-out panel showing:
 * - Sentiment trend chart (div-based bar visualization)
 * - Top topics extracted from recent messages
 * - Action items detected from conversations
 * - Alert history: previous sentiment drops/spikes
 * - Time range selector: 24h, 7 days, 30 days
 */

import React, { memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Smile, Meh, Frown, TrendingUp, TrendingDown, Minus,
  MessageSquare, AlertTriangle, CheckCircle2, Clock,
  ListTodo, Tag, BarChart3,
} from 'lucide-react';

const RANGE_OPTIONS = [
  { value: '24h', label: '24h', days: 1 },
  { value: '7d', label: '7 days', days: 7 },
  { value: '30d', label: '30 days', days: 30 },
];

const SENTIMENT_ICONS = { smile: Smile, meh: Meh, frown: Frown };
const TREND_ICONS = { up: TrendingUp, down: TrendingDown, stable: Minus };

const ACTION_TYPE_COLORS = {
  commitment: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  request: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  task: 'text-green-400 bg-green-500/10 border-green-500/20',
  proposal: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'follow-up': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  reminder: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  deadline: 'text-red-400 bg-red-500/10 border-red-500/20',
};

// ── Trend Chart (div-based bars) ──────────────────────────────────────────────

const TrendChart = memo(function TrendChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-zinc-600">
        No data available
      </div>
    );
  }

  const maxMessages = Math.max(...data.map((d) => d.messageCount), 1);

  return (
    <div className="flex items-end gap-1 h-28 px-1">
      {data.map((day, i) => {
        const barHeight = day.messageCount > 0
          ? Math.max(8, (day.messageCount / maxMessages) * 100)
          : 4;

        let barColor = 'bg-zinc-700';
        if (day.messageCount > 0) {
          if (day.score >= 65) barColor = 'bg-green-500/70';
          else if (day.score <= 35) barColor = 'bg-red-500/70';
          else barColor = 'bg-zinc-500/70';
        }

        const dayLabel = day.date ? day.date.slice(5) : '';

        return (
          <div key={day.date || i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-zinc-900 border border-zinc-700/60 rounded-md px-2 py-1 shadow-lg whitespace-nowrap">
                <div className="text-[9px] text-zinc-300 font-medium">Score: {day.score}</div>
                <div className="text-[9px] text-zinc-500">{day.messageCount} messages</div>
              </div>
            </div>

            {/* Bar */}
            <motion.div
              className={`w-full rounded-sm ${barColor}`}
              initial={{ height: 0 }}
              animate={{ height: `${barHeight}%` }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: 'easeOut' }}
            />

            {/* Date label (only show every nth label to avoid crowding) */}
            {(data.length <= 7 || i % Math.ceil(data.length / 7) === 0) && (
              <span className="text-[8px] text-zinc-600 leading-none">{dayLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
});

// ── Topic Badge ───────────────────────────────────────────────────────────────

const TopicBadge = memo(function TopicBadge({ topic, count }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/40">
      <Tag className="w-3 h-3 text-cyan-400 flex-shrink-0" />
      <span className="text-xs text-zinc-300">{topic}</span>
      <span className="text-[10px] text-zinc-500 font-medium">{count}</span>
    </div>
  );
});

// ── Action Item Card ──────────────────────────────────────────────────────────

const ActionItemCard = memo(function ActionItemCard({ item }) {
  const typeClass = ACTION_TYPE_COLORS[item.type] || ACTION_TYPE_COLORS.task;

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
      <div className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${typeClass} flex-shrink-0 mt-0.5`}>
        {item.type}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-300 leading-relaxed truncate">{item.text}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-600">{item.sender}</span>
          {item.timestamp && (
            <span className="text-[10px] text-zinc-700">
              {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Alert History Item ────────────────────────────────────────────────────────

const AlertHistoryItem = memo(function AlertHistoryItem({ alert }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${
      alert.severity === 'critical'
        ? 'bg-red-500/5 border-red-500/20'
        : 'bg-amber-500/5 border-amber-500/20'
    }`}>
      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
        alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-zinc-300 truncate">
          Dropped {alert.drop}pts on {alert.date}
        </p>
        <p className="text-[10px] text-zinc-600">
          {alert.previousScore} &rarr; {alert.currentScore}
        </p>
      </div>
    </div>
  );
});

// ── Main Panel ────────────────────────────────────────────────────────────────

const SentimentPanel = memo(function SentimentPanel({
  isOpen = false,
  onClose,
  channelId,
  channelName,
  sentiment = {},
  trendData = { data: [], trend: 'stable' },
  topics = [],
  actionItems = [],
  alerts = [],
  positivePercent = 50,
  selectedRange = '7d',
  onRangeChange,
}) {
  const { score = 50, label = 'neutral', color = 'zinc', icon = 'meh' } = sentiment;
  const SentimentIcon = SENTIMENT_ICONS[icon] || Meh;
  const TrendIcon = TREND_ICONS[trendData.trend] || Minus;

  const scoreColorClass = color === 'green'
    ? 'text-green-400'
    : color === 'red'
    ? 'text-red-400'
    : 'text-zinc-400';

  const trendColorClass = trendData.trend === 'up'
    ? 'text-green-400'
    : trendData.trend === 'down'
    ? 'text-red-400'
    : 'text-zinc-500';

  const trendLabel = trendData.trend === 'up'
    ? 'Trending Up'
    : trendData.trend === 'down'
    ? 'Trending Down'
    : 'Stable';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[380px] max-w-full bg-zinc-950 border-l border-zinc-800/60 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Sentiment Analysis</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-800/60 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {/* Channel info + score */}
            <div className="px-4 py-3 border-b border-zinc-800/40 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SentimentIcon className={`w-5 h-5 ${scoreColorClass}`} />
                  <div>
                    <div className="text-xs text-zinc-500">#{channelName || 'channel'}</div>
                    <div className={`text-lg font-bold ${scoreColorClass}`}>{score}<span className="text-xs font-normal text-zinc-600">/100</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendIcon className={`w-4 h-4 ${trendColorClass}`} />
                  <span className={`text-xs font-medium ${trendColorClass}`}>{trendLabel}</span>
                </div>
              </div>

              {/* Positive percentage bar */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-600">Positive messages</span>
                  <span className="text-[10px] text-zinc-500 font-medium">{positivePercent}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      positivePercent >= 65 ? 'bg-green-500' : positivePercent <= 35 ? 'bg-red-500' : 'bg-zinc-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${positivePercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {/* Time Range Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sentiment Trend</h3>
                  <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800/50">
                    {RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onRangeChange?.(opt.value)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                          selectedRange === opt.value
                            ? 'bg-zinc-700 text-zinc-200'
                            : 'text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-zinc-900/40 rounded-lg border border-zinc-800/40 p-3">
                  <TrendChart data={trendData.data} />
                </div>
              </div>

              {/* Topics */}
              {topics.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Top Topics</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <TopicBadge key={t.topic} topic={t.topic} count={t.count} />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {actionItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Action Items
                    </h3>
                    <span className="text-[10px] text-zinc-600 font-medium ml-auto">
                      {actionItems.length} detected
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {actionItems.map((item, i) => (
                      <ActionItemCard key={item.messageId || i} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Alert History */}
              {alerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Alert History</h3>
                  </div>
                  <div className="space-y-1.5">
                    {alerts.map((alert) => (
                      <AlertHistoryItem key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {topics.length === 0 && actionItems.length === 0 && alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-500">No significant activity detected</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    Topics, action items, and alerts will appear as messages flow in
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default SentimentPanel;
