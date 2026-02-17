/**
 * useSentimentTracking - Keyword-based sentiment analysis for inbox channels.
 *
 * Provides channel-level sentiment scoring, trend tracking, topic extraction,
 * and action item detection. Results are cached per channel to avoid re-analysis.
 *
 * Sentiment scale: 0 (very negative) to 100 (very positive), 50 = neutral.
 */

import { useState, useMemo, useCallback, useRef } from 'react';

// ── Keyword dictionaries ──────────────────────────────────────────────────────

const POSITIVE_KEYWORDS = [
  'great', 'awesome', 'excellent', 'amazing', 'fantastic', 'wonderful',
  'perfect', 'love', 'happy', 'glad', 'excited', 'impressive', 'brilliant',
  'well done', 'good job', 'nice work', 'thank you', 'thanks', 'appreciate',
  'agree', 'approved', 'on track', 'ahead of schedule', 'milestone',
  'achieved', 'success', 'congrats', 'congratulations', 'resolved',
  'fixed', 'shipped', 'launched', 'celebrate', 'productive', 'progress',
  'helpful', 'pleased', 'delighted', 'thrilled', 'superb', 'outstanding',
];

const NEGATIVE_KEYWORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'disappointed', 'frustrated',
  'angry', 'annoyed', 'unacceptable', 'failure', 'failed', 'broken',
  'bug', 'issue', 'problem', 'concern', 'worried', 'delay', 'delayed',
  'blocked', 'blocker', 'urgent', 'critical', 'overdue', 'missed',
  'behind schedule', 'escalate', 'escalation', 'complaint', 'unhappy',
  'wrong', 'error', 'mistake', 'confused', 'unclear', 'risk', 'regression',
  'outage', 'incident', 'downtime', 'stress', 'overwhelmed', 'struggling',
];

// Words that intensify sentiment
const INTENSIFIERS = ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'really', 'super'];

// Negation words that flip sentiment
const NEGATIONS = ['not', "don't", "doesn't", "didn't", "won't", "can't", "isn't", "aren't", 'never', 'no'];

// Topic extraction patterns
const TOPIC_PATTERNS = [
  { pattern: /\b(?:deploy|deployment|release|ship|launch)\b/i, topic: 'Deployments' },
  { pattern: /\b(?:bug|issue|error|crash|broken)\b/i, topic: 'Bugs & Issues' },
  { pattern: /\b(?:meeting|call|standup|sync|retro)\b/i, topic: 'Meetings' },
  { pattern: /\b(?:deadline|due|timeline|milestone|sprint)\b/i, topic: 'Deadlines' },
  { pattern: /\b(?:client|customer|user|feedback)\b/i, topic: 'Client Relations' },
  { pattern: /\b(?:design|ui|ux|mockup|prototype|figma)\b/i, topic: 'Design' },
  { pattern: /\b(?:review|pr|pull request|code review|merge)\b/i, topic: 'Code Reviews' },
  { pattern: /\b(?:test|testing|qa|quality)\b/i, topic: 'Testing & QA' },
  { pattern: /\b(?:budget|cost|pricing|invoice|payment)\b/i, topic: 'Finance' },
  { pattern: /\b(?:hire|hiring|candidate|interview|onboard)\b/i, topic: 'Hiring' },
  { pattern: /\b(?:security|vulnerability|auth|permission)\b/i, topic: 'Security' },
  { pattern: /\b(?:performance|slow|latency|optimize)\b/i, topic: 'Performance' },
];

// Action item detection patterns
const ACTION_PATTERNS = [
  { pattern: /\bi(?:'ll| will)\s+(.{10,80})/i, label: 'commitment' },
  { pattern: /\bcan you\s+(.{10,80})/i, label: 'request' },
  { pattern: /\bcould you\s+(.{10,80})/i, label: 'request' },
  { pattern: /\bplease\s+(.{10,80})/i, label: 'request' },
  { pattern: /\bwe need to\s+(.{10,80})/i, label: 'task' },
  { pattern: /\blet'?s\s+(.{10,80})/i, label: 'proposal' },
  { pattern: /\btodo:?\s+(.{10,80})/i, label: 'task' },
  { pattern: /\baction item:?\s+(.{10,80})/i, label: 'task' },
  { pattern: /\bfollow up\s+(?:on|with)\s+(.{10,80})/i, label: 'follow-up' },
  { pattern: /\breminder:?\s+(.{10,80})/i, label: 'reminder' },
  { pattern: /\bdeadline:?\s+(.{10,80})/i, label: 'deadline' },
];

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Scores a single message's sentiment. Returns a value between -1 and 1.
 */
function scoreMessage(text) {
  if (!text || typeof text !== 'string') return 0;

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  let positiveHits = 0;
  let negativeHits = 0;
  let hasIntensifier = false;
  let hasNegation = false;

  // Check for intensifiers and negations in the preceding context
  for (const word of words) {
    if (INTENSIFIERS.includes(word)) hasIntensifier = true;
    if (NEGATIONS.includes(word)) hasNegation = true;
  }

  // Count keyword matches (supports multi-word phrases)
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) positiveHits++;
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lower.includes(keyword)) negativeHits++;
  }

  // Apply intensifier multiplier
  const multiplier = hasIntensifier ? 1.5 : 1;

  let rawScore = (positiveHits - negativeHits) * multiplier;

  // Negation flips sentiment direction
  if (hasNegation && (positiveHits > 0 || negativeHits > 0)) {
    rawScore *= -0.5; // Partial flip with reduced confidence
  }

  // Normalize to -1..1 range (cap at +/-3 hits worth of signal)
  return Math.max(-1, Math.min(1, rawScore / 3));
}

/**
 * Converts a -1..1 raw score to a 0..100 sentiment score.
 */
function normalizeScore(raw) {
  return Math.round(50 + raw * 50);
}

/**
 * Returns a sentiment label and color scheme based on a 0-100 score.
 */
function getSentimentMeta(score) {
  if (score >= 65) {
    return { label: 'positive', color: 'green', icon: 'smile' };
  }
  if (score <= 35) {
    return { label: 'negative', color: 'red', icon: 'frown' };
  }
  return { label: 'neutral', color: 'zinc', icon: 'meh' };
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL = 60_000; // 1 minute

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {Object} params.messages - Map of channelId -> message array
 * @param {Array}  params.channels - Array of channel objects
 */
export function useSentimentTracking({ messages = {}, channels = [] } = {}) {
  const [selectedRange, setSelectedRange] = useState('7d'); // '24h' | '7d' | '30d'
  const cacheRef = useRef(new Map());

  // ── Cache helper ──
  const getCached = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    return null;
  }, []);

  const setCache = useCallback((key, data) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  // ── Analyze sentiment for an array of messages ──
  const analyzeSentiment = useCallback((msgs) => {
    if (!msgs || msgs.length === 0) {
      return { score: 50, label: 'neutral', color: 'zinc', icon: 'meh', messageCount: 0 };
    }

    const scores = msgs.map((m) => scoreMessage(m.content || m.text || ''));
    const avgRaw = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const score = normalizeScore(avgRaw);
    const meta = getSentimentMeta(score);

    return { score, ...meta, messageCount: msgs.length };
  }, []);

  // ── Get aggregate sentiment for a channel ──
  const getChannelSentiment = useCallback((channelId) => {
    const cacheKey = `channel:${channelId}:${(messages[channelId] || []).length}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const channelMessages = messages[channelId] || [];
    const result = analyzeSentiment(channelMessages);
    setCache(cacheKey, result);
    return result;
  }, [messages, analyzeSentiment, getCached, setCache]);

  // ── Get sentiment trend over time ──
  const getSentimentTrend = useCallback((channelId, days = 7) => {
    const cacheKey = `trend:${channelId}:${days}:${(messages[channelId] || []).length}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const channelMessages = messages[channelId] || [];
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    // Filter messages within time range
    const rangeMessages = channelMessages.filter((m) => {
      const ts = new Date(m.created_at || m.timestamp || 0).getTime();
      return ts >= cutoff;
    });

    // Bucket messages by day
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const dayStart = now - (days - i) * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayKey = new Date(dayStart).toISOString().slice(0, 10);

      const dayMessages = rangeMessages.filter((m) => {
        const ts = new Date(m.created_at || m.timestamp || 0).getTime();
        return ts >= dayStart && ts < dayEnd;
      });

      if (dayMessages.length > 0) {
        const scores = dayMessages.map((m) => scoreMessage(m.content || m.text || ''));
        const avgRaw = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        buckets[dayKey] = {
          date: dayKey,
          score: normalizeScore(avgRaw),
          messageCount: dayMessages.length,
        };
      } else {
        buckets[dayKey] = { date: dayKey, score: 50, messageCount: 0 };
      }
    }

    const trendData = Object.values(buckets);

    // Calculate trend direction
    const recentScores = trendData.slice(-3).filter((d) => d.messageCount > 0);
    const olderScores = trendData.slice(0, -3).filter((d) => d.messageCount > 0);

    let trend = 'stable';
    if (recentScores.length > 0 && olderScores.length > 0) {
      const recentAvg = recentScores.reduce((s, d) => s + d.score, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((s, d) => s + d.score, 0) / olderScores.length;
      const diff = recentAvg - olderAvg;

      if (diff > 5) trend = 'up';
      else if (diff < -5) trend = 'down';
    }

    const result = { data: trendData, trend };
    setCache(cacheKey, result);
    return result;
  }, [messages, getCached, setCache]);

  // ── Extract key topics from messages ──
  const getTopics = useCallback((msgs) => {
    if (!msgs || msgs.length === 0) return [];

    const topicCounts = {};

    for (const msg of msgs) {
      const text = msg.content || msg.text || '';
      for (const { pattern, topic } of TOPIC_PATTERNS) {
        if (pattern.test(text)) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      }
    }

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, []);

  // ── Detect action items from messages ──
  const detectActionItems = useCallback((msgs) => {
    if (!msgs || msgs.length === 0) return [];

    const items = [];

    for (const msg of msgs) {
      const text = msg.content || msg.text || '';

      for (const { pattern, label } of ACTION_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          items.push({
            text: match[1].trim().replace(/[.!?,;]+$/, ''),
            type: label,
            messageId: msg.id,
            sender: msg.sender_name || msg.sender || 'Unknown',
            timestamp: msg.created_at || msg.timestamp,
          });
        }
      }
    }

    // Deduplicate by text similarity
    const seen = new Set();
    return items
      .filter((item) => {
        const key = item.text.toLowerCase().slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }, []);

  // ── Detect sentiment alerts (significant drops) ──
  const getSentimentAlerts = useCallback((channelId, channelName) => {
    const trend = getSentimentTrend(channelId, 7);
    const alerts = [];

    const dataWithMessages = trend.data.filter((d) => d.messageCount > 0);
    if (dataWithMessages.length < 2) return alerts;

    // Check for significant drops day-over-day
    for (let i = 1; i < dataWithMessages.length; i++) {
      const prev = dataWithMessages[i - 1];
      const curr = dataWithMessages[i];
      const drop = prev.score - curr.score;

      if (drop >= 20 && curr.score <= 40) {
        alerts.push({
          id: `${channelId}-${curr.date}`,
          channelId,
          channelName: channelName || channelId,
          date: curr.date,
          previousScore: prev.score,
          currentScore: curr.score,
          drop,
          severity: drop >= 35 ? 'critical' : 'warning',
          message: `Sentiment dropped ${drop}% in #${channelName || channelId}`,
        });
      }
    }

    return alerts;
  }, [getSentimentTrend]);

  // ── All channel alerts ──
  const allAlerts = useMemo(() => {
    const alerts = [];
    for (const channel of channels) {
      const channelAlerts = getSentimentAlerts(channel.id, channel.name);
      alerts.push(...channelAlerts);
    }
    return alerts.sort((a, b) => b.drop - a.drop);
  }, [channels, getSentimentAlerts]);

  // ── Percentage positive helper ──
  const getPositivePercentage = useCallback((channelId) => {
    const channelMessages = messages[channelId] || [];
    if (channelMessages.length === 0) return 50;

    const scores = channelMessages.map((m) => scoreMessage(m.content || m.text || ''));
    const positive = scores.filter((s) => s > 0.1).length;
    return Math.round((positive / scores.length) * 100);
  }, [messages]);

  return {
    analyzeSentiment,
    getChannelSentiment,
    getSentimentTrend,
    getTopics,
    detectActionItems,
    getSentimentAlerts,
    allAlerts,
    getPositivePercentage,
    selectedRange,
    setSelectedRange,
  };
}

export default useSentimentTracking;
