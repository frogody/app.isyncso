/**
 * SmartReply - Quick reply suggestion pills
 *
 * Shows 2-3 contextual quick reply suggestions above the chat input
 * after receiving a new message. Click to insert into input (not auto-send).
 * Auto-dismisses after 30 seconds or when user starts typing.
 * Horizontal pill buttons with Framer Motion slide-up animation.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Template categories for quick reply suggestions
const REPLY_TEMPLATES = {
  question: ['Yes, I can do that', 'Let me check and get back to you', 'Could you clarify?'],
  thanks: ["You're welcome!", 'Happy to help!', 'No problem!'],
  greeting: ['Hey! How are you?', 'Good morning!', 'Hi there!'],
  request: ["I'll get on that", 'Sure, give me a moment', 'On it!'],
  update: ['Thanks for the update', 'Noted!', 'Great, thanks for letting me know'],
};

// Classify the last message into a category
function classifyMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Greeting patterns
  if (/^(hi|hey|hello|good\s*(morning|afternoon|evening)|howdy|yo)\b/i.test(lower)) {
    return 'greeting';
  }

  // Thanks patterns
  if (/\b(thanks|thank\s*you|thx|ty|appreciate)\b/i.test(lower)) {
    return 'thanks';
  }

  // Question patterns
  if (
    lower.endsWith('?') ||
    /^(can|could|would|do|does|is|are|will|have|has|should|what|when|where|why|how)\b/i.test(lower)
  ) {
    return 'question';
  }

  // Request patterns (imperative)
  if (
    /^(please|pls|can you|could you|would you|send|check|review|fix|update|add|create|set up)\b/i.test(lower)
  ) {
    return 'request';
  }

  // Update/status patterns
  if (
    /\b(update|fyi|heads\s*up|just\s*so\s*you\s*know|letting\s*you\s*know|done|completed|finished|ready)\b/i.test(lower)
  ) {
    return 'update';
  }

  return null;
}

const AUTO_DISMISS_MS = 30000;

export default function SmartReply({ lastMessage, onSelectReply, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastMessageIdRef = useRef(null);
  const timerRef = useRef(null);

  // Determine suggestions based on the last message
  const suggestions = useMemo(() => {
    if (!lastMessage?.content) return [];
    const category = classifyMessage(lastMessage.content);
    if (!category || !REPLY_TEMPLATES[category]) return [];
    // Return 2-3 suggestions from the matched category
    return REPLY_TEMPLATES[category].slice(0, 3);
  }, [lastMessage?.content]);

  // Show suggestions when a new message arrives
  useEffect(() => {
    const messageId = lastMessage?.id || lastMessage?.content;
    if (!messageId || messageId === lastMessageIdRef.current) return;

    lastMessageIdRef.current = messageId;
    setDismissed(false);

    if (suggestions.length > 0) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [lastMessage?.id, lastMessage?.content, suggestions.length]);

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

  // Method to dismiss from parent (e.g., when user starts typing)
  useEffect(() => {
    // Expose dismiss behavior through the visible state
    if (dismissed) {
      setVisible(false);
    }
  }, [dismissed]);

  if (!visible || dismissed || suggestions.length === 0) return null;

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

          <button
            onClick={handleDismiss}
            className="p-0.5 hover:bg-zinc-700/40 rounded-full transition-colors ml-0.5"
            title="Dismiss suggestions"
          >
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
