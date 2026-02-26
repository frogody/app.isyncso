/**
 * SmartReply - AI-powered quick reply suggestion pills via Groq LLM.
 *
 * Shows 2-3 contextual quick reply suggestions above the chat input
 * after receiving a new message. Click to insert into input (not auto-send).
 * Auto-dismisses after 30 seconds or when user starts typing.
 * Horizontal pill buttons with Framer Motion slide-up animation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const AUTO_DISMISS_MS = 30000;

export default function SmartReply({ lastMessage, recentMessages = [], onSelectReply, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastMessageIdRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  // Fetch AI suggestions when a new message arrives
  useEffect(() => {
    const messageId = lastMessage?.id || lastMessage?.content;
    if (!messageId || messageId === lastMessageIdRef.current) return;
    if (!lastMessage?.content || lastMessage.content.trim().length < 2) return;

    lastMessageIdRef.current = messageId;
    setDismissed(false);
    setSuggestions([]);
    setLoading(true);
    setVisible(true);

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    (async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/smart-compose`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              mode: 'smart_reply',
              lastMessage: lastMessage.content,
              recentMessages: (recentMessages || []).slice(-5).map(m => ({
                sender: m.sender_name || m.user?.full_name || 'User',
                content: m.content || '',
              })),
            }),
            signal: abortRef.current.signal,
          }
        );

        if (!response.ok) {
          setSuggestions([]);
          setVisible(false);
          return;
        }

        const data = await response.json();
        const replies = data.replies || [];

        if (replies.length > 0) {
          setSuggestions(replies.slice(0, 3));
        } else {
          setSuggestions([]);
          setVisible(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[SmartReply] Error:', err);
          setSuggestions([]);
          setVisible(false);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [lastMessage?.id, lastMessage?.content]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setDismissed(true);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleSelect = useCallback((text) => {
    onSelectReply?.(text);
    setVisible(false);
    setDismissed(true);
  }, [onSelectReply]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible || dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 flex-wrap"
        >
          {loading && suggestions.length === 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>SYNC thinking...</span>
            </div>
          )}

          {suggestions.map((text, i) => (
            <motion.button
              key={`${text}-${i}`}
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.15, delay: i * 0.05 }}
              onClick={() => handleSelect(text)}
              className="bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 rounded-full px-3 py-1 text-xs text-zinc-300 transition-colors whitespace-nowrap cursor-pointer"
            >
              {text}
            </motion.button>
          ))}

          {(suggestions.length > 0 || loading) && (
            <>
              <CreditCostBadge credits={1} size="xs" />
              <button
                onClick={handleDismiss}
                className="p-0.5 hover:bg-zinc-700/40 rounded-full transition-colors ml-0.5"
                title="Dismiss suggestions"
              >
                <X className="w-3 h-3 text-zinc-500" />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
