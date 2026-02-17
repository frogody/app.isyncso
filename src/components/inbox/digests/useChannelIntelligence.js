/**
 * useChannelIntelligence - Hook for channel intelligence: sentiment, topics, action items
 *
 * Provides digest generation via Groq LLM (llama-3.3-70b-versatile) edge function.
 * Falls back to local regex analysis if the AI service is unavailable.
 * Uses Supabase to fetch messages, then sends them to the digest-channel edge function.
 * Caches digest results in state to avoid re-generation.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

// Time range definitions in hours
const TIME_RANGES = {
  'last-4h': { label: 'Last 4 hours', hours: 4 },
  'today': { label: 'Today', hours: 24 },
  'yesterday': { label: 'Yesterday', hours: 48 },
  'this-week': { label: 'This Week', hours: 168 },
};

/**
 * Compute start date from a time range key
 */
function getStartDate(timeRange) {
  const config = TIME_RANGES[timeRange];
  if (!config) return new Date(Date.now() - 4 * 60 * 60 * 1000);

  if (timeRange === 'yesterday') {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return yesterday;
  }

  if (timeRange === 'today') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return new Date(Date.now() - config.hours * 60 * 60 * 1000);
}

/**
 * Compute end date from a time range key
 */
function getEndDate(timeRange) {
  if (timeRange === 'yesterday') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date();
}

// ---------------------------------------------------------------------------
// Fallback local analysis (used when AI edge function is unavailable)
// ---------------------------------------------------------------------------

function extractKeywords(messages) {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up', 'what',
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'it',
    'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him',
    'his', 'she', 'her', 'they', 'them', 'their', 'also', 'get', 'got',
    'like', 'think', 'know', 'see', 'come', 'make', 'go', 'take', 'want',
  ]);

  const wordCounts = {};
  messages.forEach((msg) => {
    const content = (msg.content || '').toLowerCase();
    const words = content.split(/\s+/).filter((w) => w.length > 3);
    words.forEach((word) => {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function analyzeSentimentLocal(messages) {
  const positiveWords = [
    'great', 'awesome', 'excellent', 'good', 'love', 'amazing', 'wonderful',
    'fantastic', 'perfect', 'happy', 'glad', 'thanks', 'thank', 'appreciate',
    'agree', 'nice', 'well', 'success', 'done', 'completed', 'resolved',
  ];
  const negativeWords = [
    'bad', 'terrible', 'awful', 'hate', 'problem', 'issue', 'bug', 'broken',
    'fail', 'failed', 'error', 'wrong', 'concern', 'worried', 'stuck',
    'blocked', 'delay', 'delayed', 'risk', 'critical', 'urgent',
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  let totalWords = 0;

  messages.forEach((msg) => {
    const words = (msg.content || '').toLowerCase().split(/\s+/);
    totalWords += words.length;
    words.forEach((w) => {
      const cleaned = w.replace(/[^a-z]/g, '');
      if (positiveWords.includes(cleaned)) positiveCount++;
      if (negativeWords.includes(cleaned)) negativeCount++;
    });
  });

  if (totalWords === 0) return { score: 0.5, label: 'Neutral', trend: 'stable' };

  const ratio = (positiveCount - negativeCount) / Math.max(totalWords * 0.01, 1);
  const score = Math.min(1, Math.max(0, 0.5 + ratio * 0.1));

  let label = 'Neutral';
  if (score > 0.65) label = 'Positive';
  else if (score > 0.55) label = 'Mostly Positive';
  else if (score < 0.35) label = 'Negative';
  else if (score < 0.45) label = 'Mostly Negative';

  const trend = positiveCount > negativeCount ? 'improving' : negativeCount > positiveCount ? 'declining' : 'stable';

  return { score, label, trend, positiveCount, negativeCount };
}

function extractMentions(messages) {
  const mentions = {};
  messages.forEach((msg) => {
    const content = msg.content || '';
    const found = content.match(/@(\w+)/g);
    if (found) {
      found.forEach((m) => {
        const name = m.slice(1);
        mentions[name] = (mentions[name] || 0) + 1;
      });
    }
  });

  return Object.entries(mentions)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function findQuestionsLocal(messages) {
  return messages
    .filter((msg) => {
      const content = (msg.content || '').trim();
      return content.endsWith('?') || /^(who|what|when|where|why|how|is|are|can|could|would|should|do|does|did)\b/i.test(content);
    })
    .slice(0, 8)
    .map((msg) => ({
      id: msg.id,
      content: msg.content,
      author: msg.sender_name || msg.sender_id || 'Unknown',
      avatar: msg.sender_avatar || null,
      timestamp: msg.created_at,
    }));
}

function detectActionItemsLocal(messages) {
  const actionPatterns = [
    /i('ll| will)\s+(.+?)(?:\.|$)/i,
    /let me\s+(.+?)(?:\.|$)/i,
    /we need to\s+(.+?)(?:\.|$)/i,
    /we should\s+(.+?)(?:\.|$)/i,
    /please\s+(.+?)(?:\.|$)/i,
    /todo:?\s+(.+?)(?:\.|$)/i,
    /action item:?\s+(.+?)(?:\.|$)/i,
    /can you\s+(.+?)(?:\?|$)/i,
    /make sure\s+(.+?)(?:\.|$)/i,
    /don't forget\s+(.+?)(?:\.|$)/i,
  ];

  const items = [];
  messages.forEach((msg) => {
    const content = msg.content || '';
    for (const pattern of actionPatterns) {
      const match = content.match(pattern);
      if (match) {
        items.push({
          id: msg.id,
          text: match[0].trim(),
          fullMessage: content,
          author: msg.sender_name || msg.sender_id || 'Unknown',
          avatar: msg.sender_avatar || null,
          timestamp: msg.created_at,
        });
        break;
      }
    }
  });

  return items.slice(0, 10);
}

function detectDecisionsLocal(messages) {
  const decisionPatterns = [
    /decided\s+(.+?)(?:\.|$)/i,
    /let's\s+go\s+with\s+(.+?)(?:\.|$)/i,
    /we('re| are)\s+going\s+(to|with)\s+(.+?)(?:\.|$)/i,
    /agreed\s+(.+?)(?:\.|$)/i,
    /conclusion:?\s+(.+?)(?:\.|$)/i,
    /final\s+decision:?\s+(.+?)(?:\.|$)/i,
    /approved\s+(.+?)(?:\.|$)/i,
    /confirmed:?\s+(.+?)(?:\.|$)/i,
    /settled\s+on\s+(.+?)(?:\.|$)/i,
  ];

  const decisions = [];
  messages.forEach((msg) => {
    const content = msg.content || '';
    for (const pattern of decisionPatterns) {
      const match = content.match(pattern);
      if (match) {
        decisions.push({
          id: msg.id,
          text: match[0].trim(),
          fullMessage: content,
          author: msg.sender_name || msg.sender_id || 'Unknown',
          avatar: msg.sender_avatar || null,
          timestamp: msg.created_at,
        });
        break;
      }
    }
  });

  return decisions.slice(0, 8);
}

function findImportantMessagesLocal(messages) {
  return messages
    .filter((msg) => {
      const content = (msg.content || '').toLowerCase();
      const hasUrgency = /urgent|asap|critical|important|heads up|attention|fyi|announcement/i.test(content);
      const hasReactions = (msg.reactions?.length || 0) > 2;
      const isPinned = msg.is_pinned;
      return hasUrgency || hasReactions || isPinned;
    })
    .slice(0, 6)
    .map((msg) => ({
      id: msg.id,
      content: msg.content,
      author: msg.sender_name || msg.sender_id || 'Unknown',
      avatar: msg.sender_avatar || null,
      timestamp: msg.created_at,
      reason: msg.is_pinned
        ? 'Pinned'
        : (msg.reactions?.length || 0) > 2
        ? 'Highly reacted'
        : 'Flagged as important',
    }));
}

/**
 * Build a digest using local regex-based analysis (fallback)
 */
function buildLocalDigest(messages, channelId, timeRange) {
  const uniqueSenders = new Set(messages.map((m) => m.sender_id).filter(Boolean));

  return {
    channelId,
    timeRange,
    timeRangeLabel: TIME_RANGES[timeRange]?.label || timeRange,
    messageCount: messages.length,
    participantCount: uniqueSenders.size,
    decisions: detectDecisionsLocal(messages),
    actionItems: detectActionItemsLocal(messages),
    importantMessages: findImportantMessagesLocal(messages),
    questions: findQuestionsLocal(messages),
    sentiment: analyzeSentimentLocal(messages),
    topics: extractKeywords(messages),
    mentions: extractMentions(messages),
    generatedAt: new Date().toISOString(),
    aiPowered: false,
  };
}

// ---------------------------------------------------------------------------
// AI-powered analysis via edge function
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function analyzeWithAI(messages) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/digest-channel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        sender_name: m.sender_name,
        sender_id: m.sender_id,
        sender_avatar: m.sender_avatar,
        created_at: m.created_at,
        reactions: m.reactions,
        is_pinned: m.is_pinned,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Digest AI error ${response.status}: ${err}`);
  }

  return response.json();
}

/**
 * Build a digest using AI analysis from the edge function
 */
function buildAIDigest(aiResult, messages, channelId, timeRange) {
  const uniqueSenders = new Set(messages.map((m) => m.sender_id).filter(Boolean));

  // Map AI decisions back to message metadata
  const decisions = (aiResult.decisions || []).map((d) => {
    const msg = messages.find((m) => m.id === d.messageId);
    return {
      id: d.messageId,
      text: d.text,
      fullMessage: msg?.content || d.text,
      author: d.author || msg?.sender_name || 'Unknown',
      avatar: msg?.sender_avatar || null,
      timestamp: d.timestamp || msg?.created_at,
    };
  });

  const actionItems = (aiResult.actionItems || []).map((a) => {
    const msg = messages.find((m) => m.id === a.messageId);
    return {
      id: a.messageId,
      text: a.text,
      assignee: a.assignee,
      fullMessage: msg?.content || a.text,
      author: a.author || msg?.sender_name || 'Unknown',
      avatar: msg?.sender_avatar || null,
      timestamp: a.timestamp || msg?.created_at,
    };
  });

  const importantMessages = (aiResult.importantMessages || []).map((im) => {
    const msg = messages.find((m) => m.id === im.messageId);
    return {
      id: im.messageId,
      content: im.content || msg?.content,
      author: im.author || msg?.sender_name || 'Unknown',
      avatar: msg?.sender_avatar || null,
      timestamp: im.timestamp || msg?.created_at,
      reason: im.reason || 'AI flagged',
    };
  });

  const questions = (aiResult.questions || []).map((q) => {
    const msg = messages.find((m) => m.id === q.messageId);
    return {
      id: q.messageId,
      content: q.content || msg?.content,
      author: q.author || msg?.sender_name || 'Unknown',
      avatar: msg?.sender_avatar || null,
      timestamp: q.timestamp || msg?.created_at,
      answered: q.answered || false,
    };
  });

  return {
    channelId,
    timeRange,
    timeRangeLabel: TIME_RANGES[timeRange]?.label || timeRange,
    messageCount: messages.length,
    participantCount: uniqueSenders.size,
    summary: aiResult.summary || '',
    decisions,
    actionItems,
    importantMessages,
    questions,
    sentiment: {
      score: aiResult.sentiment?.score ?? 0.5,
      label: aiResult.sentiment?.label || 'Neutral',
      trend: aiResult.sentiment?.trend || 'stable',
      reasoning: aiResult.sentiment?.reasoning || '',
    },
    topics: aiResult.topics || [],
    mentions: extractMentions(messages),
    generatedAt: new Date().toISOString(),
    aiPowered: true,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChannelIntelligence() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache: channelId-timeRange -> digest result
  const cacheRef = useRef({});

  /**
   * Fetch messages for a channel within a time range
   */
  const fetchMessages = useCallback(async (channelId, timeRange) => {
    const startDate = getStartDate(timeRange);
    const endDate = getEndDate(timeRange);

    const { data, error: fetchError } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at, reactions, is_pinned, channel_id')
      .eq('channel_id', channelId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[useChannelIntelligence] fetchMessages error:', fetchError);
      throw fetchError;
    }

    // Try to resolve sender names
    const messages = data || [];
    if (messages.length > 0) {
      const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))];
      if (senderIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        const userMap = {};
        (users || []).forEach((u) => {
          userMap[u.id] = { name: u.full_name, avatar: u.avatar_url };
        });

        messages.forEach((msg) => {
          const user = userMap[msg.sender_id];
          if (user) {
            msg.sender_name = user.name;
            msg.sender_avatar = user.avatar;
          }
        });
      }
    }

    return messages;
  }, []);

  /**
   * Generate a full digest for a channel in a given time range.
   * Calls Groq LLM via edge function, falls back to local regex analysis.
   */
  const generateDigest = useCallback(async (channelId, timeRange = 'last-4h') => {
    if (!channelId) return null;

    const cacheKey = `${channelId}-${timeRange}`;

    // Return cached result if available and less than 5 minutes old
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      setDigest(cached.data);
      return cached.data;
    }

    try {
      setLoading(true);
      setError(null);

      const messages = await fetchMessages(channelId, timeRange);

      if (messages.length === 0) {
        const emptyDigest = {
          channelId,
          timeRange,
          timeRangeLabel: TIME_RANGES[timeRange]?.label || timeRange,
          messageCount: 0,
          participantCount: 0,
          summary: '',
          decisions: [],
          actionItems: [],
          importantMessages: [],
          questions: [],
          sentiment: { score: 0.5, label: 'No activity', trend: 'stable' },
          topics: [],
          mentions: [],
          generatedAt: new Date().toISOString(),
          aiPowered: false,
        };
        setDigest(emptyDigest);
        cacheRef.current[cacheKey] = { data: emptyDigest, timestamp: Date.now() };
        return emptyDigest;
      }

      let digestData;

      try {
        // Attempt AI-powered analysis
        const aiResult = await analyzeWithAI(messages);
        digestData = buildAIDigest(aiResult, messages, channelId, timeRange);
      } catch (aiErr) {
        console.warn('[useChannelIntelligence] AI analysis failed, using local fallback:', aiErr.message);
        digestData = buildLocalDigest(messages, channelId, timeRange);
      }

      setDigest(digestData);
      cacheRef.current[cacheKey] = { data: digestData, timestamp: Date.now() };
      return digestData;
    } catch (err) {
      console.error('[useChannelIntelligence] generateDigest error:', err);
      setError(err.message || 'Failed to generate digest');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  /**
   * Get current sentiment score for a channel (lightweight — uses local fallback)
   */
  const getChannelSentiment = useCallback(async (channelId) => {
    try {
      const messages = await fetchMessages(channelId, 'today');
      return analyzeSentimentLocal(messages);
    } catch {
      return { score: 0.5, label: 'Unknown', trend: 'stable' };
    }
  }, [fetchMessages]);

  /**
   * Extract conversation topics for a channel
   */
  const getTopics = useCallback(async (channelId) => {
    try {
      const messages = await fetchMessages(channelId, 'today');
      return extractKeywords(messages);
    } catch {
      return [];
    }
  }, [fetchMessages]);

  /**
   * Find implicit commitments and tasks
   */
  const getActionItems = useCallback(async (channelId) => {
    try {
      const messages = await fetchMessages(channelId, 'today');
      return detectActionItemsLocal(messages);
    } catch {
      return [];
    }
  }, [fetchMessages]);

  /**
   * Clear cached digests (useful when new messages arrive)
   */
  const clearCache = useCallback((channelId) => {
    if (channelId) {
      Object.keys(cacheRef.current).forEach((key) => {
        if (key.startsWith(channelId)) {
          delete cacheRef.current[key];
        }
      });
    } else {
      cacheRef.current = {};
    }
  }, []);

  return {
    digest,
    loading,
    error,
    generateDigest,
    getChannelSentiment,
    getTopics,
    getActionItems,
    clearCache,
    TIME_RANGES,
  };
}

export { TIME_RANGES };
export default useChannelIntelligence;
