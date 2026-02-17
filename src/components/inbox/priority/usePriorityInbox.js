import { useState, useMemo, useCallback, useRef } from 'react';

// Time-sensitive keywords that boost priority score
const URGENT_KEYWORDS = ['urgent', 'asap', 'deadline', 'eod', 'blocker'];

// Roles considered high-importance senders
const HIGH_IMPORTANCE_ROLES = ['admin', 'manager', 'super_admin', 'owner'];

/**
 * Computes a priority score (0-100) for a single channel.
 *
 * Scoring weights:
 *  - Unread @mentions:      30 pts (capped)
 *  - Unread message count:  10 pts (1 pt per unread, max 10)
 *  - Message velocity:      15 pts (messages in last hour)
 *  - Sender importance:     15 pts (messages from admins/managers)
 *  - Time-sensitive keywords: 20 pts (urgent/asap/deadline/eod/blocker)
 *  - Recency of last msg:   10 pts (decays over time)
 */
function computeChannelScore(channel, messages, userId, mutedChannels) {
  // Muted channels always score 0
  if (mutedChannels.includes(channel.id)) return 0;

  const channelMessages = messages[channel.id] || [];
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  let score = 0;

  // --- Unread @mentions (weight: 30) ---
  const mentionCount = channelMessages.filter(
    (m) =>
      !m.read_by?.includes(userId) &&
      m.content &&
      (m.content.includes(`@${userId}`) ||
        m.content.includes('@here') ||
        m.content.includes('@channel') ||
        m.mentions?.includes(userId))
  ).length;
  score += Math.min(mentionCount * 10, 30);

  // --- Unread message count (weight: 10, 1pt per unread, max 10) ---
  const unreadCount = channelMessages.filter(
    (m) => !m.read_by?.includes(userId)
  ).length;
  score += Math.min(unreadCount, 10);

  // --- Message velocity (weight: 15) ---
  const recentMessages = channelMessages.filter(
    (m) => new Date(m.created_at).getTime() > oneHourAgo
  );
  score += Math.min(recentMessages.length * 3, 15);

  // --- Sender importance (weight: 15) ---
  const importantSenderMessages = channelMessages.filter(
    (m) =>
      !m.read_by?.includes(userId) &&
      m.sender_role &&
      HIGH_IMPORTANCE_ROLES.includes(m.sender_role)
  ).length;
  score += Math.min(importantSenderMessages * 5, 15);

  // --- Time-sensitive keywords (weight: 20) ---
  const keywordMessages = channelMessages.filter((m) => {
    if (m.read_by?.includes(userId)) return false;
    const content = (m.content || '').toLowerCase();
    return URGENT_KEYWORDS.some((kw) => content.includes(kw));
  }).length;
  score += Math.min(keywordMessages * 10, 20);

  // --- Recency of last message (weight: 10) ---
  if (channelMessages.length > 0) {
    const lastMsg = channelMessages[channelMessages.length - 1];
    const lastMsgTime = new Date(lastMsg.created_at).getTime();
    const minutesAgo = (now - lastMsgTime) / (1000 * 60);

    if (minutesAgo < 5) {
      score += 10;
    } else if (minutesAgo < 15) {
      score += 8;
    } else if (minutesAgo < 30) {
      score += 6;
    } else if (minutesAgo < 60) {
      score += 4;
    } else if (minutesAgo < 180) {
      score += 2;
    }
    // Older than 3 hours = 0
  }

  return Math.min(score, 100);
}

/**
 * usePriorityInbox - AI-powered priority scoring hook for inbox channels.
 *
 * @param {Object} params
 * @param {Array} params.channels - All channels (public, private, DMs, support)
 * @param {Object} params.messages - Map of channelId -> message array
 * @param {string} params.userId - Current user's ID
 * @param {Array} params.mutedChannels - Array of muted channel IDs
 *
 * @returns {Object} {
 *   prioritizedChannels, urgentCount, getPriorityScore,
 *   isPriorityView, togglePriorityView
 * }
 */
export function usePriorityInbox({ channels = [], messages = {}, userId, mutedChannels = [] }) {
  const [isPriorityView, setIsPriorityView] = useState(false);
  const cacheRef = useRef({ scores: null, timestamp: 0, key: '' });

  const CACHE_TTL = 30_000; // 30 seconds

  // Build a stable cache key from channel ids and message counts
  const cacheKey = useMemo(() => {
    const channelIds = channels.map((c) => c.id).sort().join(',');
    const msgCounts = channels
      .map((c) => `${c.id}:${(messages[c.id] || []).length}`)
      .join(',');
    return `${channelIds}|${msgCounts}|${mutedChannels.join(',')}`;
  }, [channels, messages, mutedChannels]);

  // Compute scores with 30s cache
  const scores = useMemo(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    if (cache.key === cacheKey && now - cache.timestamp < CACHE_TTL && cache.scores) {
      return cache.scores;
    }

    const newScores = {};
    for (const channel of channels) {
      newScores[channel.id] = computeChannelScore(channel, messages, userId, mutedChannels);
    }

    cacheRef.current = { scores: newScores, timestamp: now, key: cacheKey };
    return newScores;
  }, [channels, messages, userId, mutedChannels, cacheKey]);

  // Channels sorted by score descending
  const prioritizedChannels = useMemo(() => {
    if (!isPriorityView) return channels;

    return [...channels].sort((a, b) => {
      const scoreA = scores[a.id] || 0;
      const scoreB = scores[b.id] || 0;
      return scoreB - scoreA;
    });
  }, [channels, scores, isPriorityView]);

  // Count of channels at "urgent" level (score >= 80)
  const urgentCount = useMemo(() => {
    return Object.values(scores).filter((s) => s >= 80).length;
  }, [scores]);

  const getPriorityScore = useCallback(
    (channelId) => scores[channelId] || 0,
    [scores]
  );

  const togglePriorityView = useCallback(() => {
    setIsPriorityView((prev) => !prev);
  }, []);

  return {
    prioritizedChannels,
    urgentCount,
    getPriorityScore,
    isPriorityView,
    togglePriorityView,
  };
}

export default usePriorityInbox;
