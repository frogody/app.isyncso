/**
 * ChannelDigest - "Catch me up" digest view component
 *
 * Shows digest sections: Key Decisions, Action Items, Sentiment Shifts, Important Messages.
 * Each section is collapsible with Framer Motion animation.
 * Time range selector: "Last 4 hours", "Today", "Yesterday", "This Week".
 * Loading state with skeleton animation.
 * Dark theme: bg-zinc-900/80, border-zinc-800/60, cyan accents.
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Clock, MessageSquare, Users,
  Lightbulb, CheckSquare, AlertTriangle, HelpCircle,
  TrendingUp, TrendingDown, Minus, Hash, AtSign,
  RefreshCw, Brain,
} from 'lucide-react';
import { useChannelIntelligence, TIME_RANGES } from './useChannelIntelligence';
import DigestCard, { AuthorAvatar, formatTimestamp } from './DigestCard';

// Skeleton loader for digest sections
const DigestSkeleton = memo(function DigestSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-zinc-800/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800/60 rounded-lg w-48" />
          <div className="h-3 bg-zinc-800/40 rounded-lg w-32" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
            <div className="h-5 bg-zinc-700/40 rounded w-8 mb-1.5" />
            <div className="h-3 bg-zinc-700/30 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Section skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/60" />
            <div className="h-4 bg-zinc-800/60 rounded w-32" />
          </div>
          <div className="space-y-2">
            <div className="h-12 bg-zinc-800/30 rounded-xl" />
            <div className="h-12 bg-zinc-800/30 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
});

// Time range selector pills
const TimeRangeSelector = memo(function TimeRangeSelector({ selected, onChange }) {
  const ranges = Object.entries(TIME_RANGES);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ranges.map(([key, config]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 ${
            selected === key
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:bg-zinc-800/60'
          }`}
        >
          {config.label}
        </button>
      ))}
    </div>
  );
});

// Sentiment indicator widget
const SentimentWidget = memo(function SentimentWidget({ sentiment }) {
  if (!sentiment) return null;

  const { score, label, trend } = sentiment;

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-emerald-400' : trend === 'declining' ? 'text-red-400' : 'text-zinc-500';

  // Color the score bar based on sentiment
  const barColor = score > 0.6 ? 'bg-emerald-500' : score < 0.4 ? 'bg-red-500' : 'bg-amber-500';
  const barWidth = `${Math.round(score * 100)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="p-3.5 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-200">Sentiment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span className={`text-[11px] font-medium ${trendColor}`}>{label}</span>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`absolute top-0 left-0 h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: barWidth }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-zinc-600">Negative</span>
        <span className="text-[10px] text-zinc-600">Positive</span>
      </div>
    </motion.div>
  );
});

// Quick stats bar
const StatsBar = memo(function StatsBar({ digest }) {
  if (!digest) return null;

  const stats = [
    { icon: MessageSquare, label: 'Messages', value: digest.messageCount, color: 'text-cyan-400' },
    { icon: Users, label: 'Participants', value: digest.participantCount, color: 'text-blue-400' },
    { icon: AtSign, label: 'Mentions', value: digest.mentions?.length || 0, color: 'text-violet-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="grid grid-cols-3 gap-2"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-lg font-bold text-white">{stat.value}</span>
            </div>
            <span className="text-[10px] text-zinc-500">{stat.label}</span>
          </div>
        );
      })}
    </motion.div>
  );
});

// Topics cloud component
const TopicsCloud = memo(function TopicsCloud({ topics }) {
  if (!topics || topics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.55 }}
      className="p-3.5 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <span className="text-sm font-semibold text-zinc-200">Hot Topics</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((topic, idx) => (
          <span
            key={topic.word}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800/60 border border-zinc-700/40 text-zinc-300"
            style={{
              opacity: Math.max(0.5, 1 - idx * 0.08),
            }}
          >
            <span>{topic.word}</span>
            <span className="text-zinc-600">{topic.count}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
});

export default function ChannelDigest({ channelId, channelName, onClose }) {
  const [timeRange, setTimeRange] = useState('today');
  const { digest, loading, error, generateDigest, clearCache } = useChannelIntelligence();

  // Generate digest on mount and when time range changes
  useEffect(() => {
    if (channelId) {
      generateDigest(channelId, timeRange);
    }
  }, [channelId, timeRange, generateDigest]);

  // Refresh handler
  const handleRefresh = () => {
    clearCache(channelId);
    generateDigest(channelId, timeRange);
  };

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col h-full bg-zinc-950/95 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-800/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-white">Catch Me Up</h2>
                {digest?.aiPowered && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20">
                    <Brain className="w-2.5 h-2.5 text-violet-400" />
                    <span className="text-[9px] font-medium text-violet-400">AI</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                {channelName ? `#${channelName}` : 'Channel digest'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/50 transition-all disabled:opacity-40"
              title="Refresh digest"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Time range selector */}
        <TimeRangeSelector selected={timeRange} onChange={handleTimeRangeChange} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {/* Loading state */}
        {loading && !digest && <DigestSkeleton />}

        {/* Error state */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-center"
          >
            <AlertTriangle className="w-6 h-6 text-red-400/60 mx-auto mb-2" />
            <p className="text-sm text-red-300 mb-1">Failed to generate digest</p>
            <p className="text-xs text-zinc-500">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Empty state */}
        {digest && digest.messageCount === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/40 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-zinc-600" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">No messages</h3>
            <p className="text-xs text-zinc-500 max-w-[240px] mx-auto">
              No messages found for {digest.timeRangeLabel?.toLowerCase()}. Try a wider time range.
            </p>
          </motion.div>
        )}

        {/* Digest content */}
        {digest && digest.messageCount > 0 && (
          <>
            {/* Quick stats */}
            <StatsBar digest={digest} />

            {/* AI Summary */}
            {digest.summary && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/5 to-cyan-500/5 backdrop-blur-xl border border-violet-500/15"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Brain className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">Summary</span>
                </div>
                <p className="text-[12px] leading-relaxed text-zinc-300">
                  {digest.summary}
                </p>
              </motion.div>
            )}

            {/* Sentiment */}
            <SentimentWidget sentiment={digest.sentiment} />

            {/* Key Decisions */}
            <DigestCard
              icon={Lightbulb}
              title="Key Decisions"
              count={digest.decisions.length}
              items={digest.decisions}
              sectionKey="decisions"
              defaultOpen={digest.decisions.length > 0}
              delay={0.2}
              emptyMessage="No key decisions detected in this time range."
            />

            {/* Action Items */}
            <DigestCard
              icon={CheckSquare}
              title="Action Items"
              count={digest.actionItems.length}
              items={digest.actionItems}
              sectionKey="actionItems"
              defaultOpen={digest.actionItems.length > 0}
              delay={0.3}
              emptyMessage="No action items or commitments found."
            />

            {/* Important Messages */}
            <DigestCard
              icon={AlertTriangle}
              title="Important Messages"
              count={digest.importantMessages.length}
              items={digest.importantMessages}
              sectionKey="important"
              defaultOpen={digest.importantMessages.length > 0}
              delay={0.4}
              emptyMessage="No flagged or highly-reacted messages."
            />

            {/* Questions */}
            <DigestCard
              icon={HelpCircle}
              title="Open Questions"
              count={digest.questions.length}
              items={digest.questions}
              sectionKey="questions"
              defaultOpen={false}
              delay={0.45}
              emptyMessage="No unanswered questions found."
            />

            {/* Topics cloud */}
            <TopicsCloud topics={digest.topics} />

            {/* Generated timestamp */}
            {digest.generatedAt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-1.5 py-2"
              >
                <Clock className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-600">
                  Generated {formatTimestamp(digest.generatedAt)}
                </span>
              </motion.div>
            )}
          </>
        )}

        {/* Loading overlay for refresh */}
        {loading && digest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/60 shadow-lg">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-xs text-zinc-300">Regenerating digest...</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
