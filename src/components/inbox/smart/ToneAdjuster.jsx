/**
 * ToneAdjuster - Tone adjustment overlay for terse messages
 *
 * Detects when a message may come across as terse or aggressive:
 *  - Short message (under 30 chars)
 *  - No greeting or pleasantry
 *  - Imperative tone (starts with a command verb)
 *
 * Shows a compact pill notification offering to soften the message.
 * "Soften" uses AI rewrite via edge function, "Send as is" dismisses.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

// Imperative verbs that signal a terse/commanding tone
const IMPERATIVE_VERBS = [
  'fix', 'do', 'send', 'check', 'update', 'add', 'remove', 'delete',
  'change', 'move', 'stop', 'tell', 'give', 'make', 'get', 'set',
  'put', 'run', 'push', 'pull', 'close', 'open', 'finish', 'handle',
];

// Greetings and pleasantries that indicate a friendly tone
const FRIENDLY_MARKERS = [
  'hi', 'hey', 'hello', 'good morning', 'good afternoon', 'good evening',
  'please', 'thanks', 'thank you', 'would you', 'could you', 'would it',
  'if possible', 'when you get a chance', 'no rush', 'hope',
];

/**
 * Checks if a message might come across as terse/aggressive.
 * Returns true if the message is short, lacks greetings, and uses imperative tone.
 */
function isTerseMessage(text) {
  if (!text || typeof text !== 'string') return false;

  const trimmed = text.trim();

  // Must be reasonably short to be considered terse (under 60 chars)
  if (trimmed.length > 60) return false;

  // Must have at least a few characters
  if (trimmed.length < 3) return false;

  const lower = trimmed.toLowerCase();

  // Check for any friendly markers -- if present, not terse
  const hasFriendlyMarker = FRIENDLY_MARKERS.some((marker) => lower.includes(marker));
  if (hasFriendlyMarker) return false;

  // Check for imperative start
  const firstWord = lower.split(/\s+/)[0].replace(/[^a-z]/g, '');
  const startsImperative = IMPERATIVE_VERBS.includes(firstWord);

  // All-caps detection
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);

  // Short + imperative = terse
  if (startsImperative && trimmed.length < 40) return true;

  // Short + all caps = aggressive
  if (isAllCaps && trimmed.length > 3) return true;

  // Very short with no softeners (under 15 chars, no question mark, no exclamation)
  if (trimmed.length < 15 && !trimmed.includes('?') && !trimmed.includes('!') && startsImperative) {
    return true;
  }

  return false;
}

// Local softening rewrites (fallback when no edge function is available)
const LOCAL_REWRITES = {
  'fix this': 'Hey, could you take a look at this and fix it when you get a chance?',
  'fix it': 'Hey, could you take a look at this and fix it when you get a chance?',
  'do it': 'Would you mind handling this? Thanks!',
  'do this': 'Would you mind taking care of this? Thanks!',
  'send it': 'Could you please send this over? Thanks!',
  'check this': 'Hey, could you check this out when you have a moment?',
  'update this': 'Could you please update this when you get a chance?',
  'delete this': 'Would you mind deleting this? Thanks!',
  'change this': 'Could you please update this? Thanks!',
};

function softenLocally(text) {
  if (!text) return text;
  const lower = text.trim().toLowerCase().replace(/[.!]+$/, '');

  // Check for exact match in local rewrites
  if (LOCAL_REWRITES[lower]) {
    return LOCAL_REWRITES[lower];
  }

  // Generic softening: prepend "Hey, could you " and append "? Thanks!"
  const trimmed = text.trim().replace(/[.!]+$/, '');
  // Lowercase the first letter for the continuation
  const body = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `Hey, could you ${body}? Thanks!`;
}

export default function ToneAdjuster({ message, onRewrite, onSendAsIs }) {
  const [rewriting, setRewriting] = useState(false);

  const showAdjuster = useMemo(() => isTerseMessage(message), [message]);

  const handleSoften = useCallback(async () => {
    if (!message) return;

    setRewriting(true);
    try {
      // Use local softening for v1 (no API call needed)
      const softened = softenLocally(message);

      // Simulate a brief delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      onRewrite?.(softened);
    } catch (err) {
      console.error('[ToneAdjuster] Rewrite failed:', err);
      // Fallback: just soften locally
      onRewrite?.(softenLocally(message));
    } finally {
      setRewriting(false);
    }
  }, [message, onRewrite]);

  const handleSendAsIs = useCallback(() => {
    onSendAsIs?.();
  }, [onSendAsIs]);

  if (!showAdjuster) return null;

  return (
    <AnimatePresence>
      {showAdjuster && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs mx-3 sm:mx-4 mb-1"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-amber-300 whitespace-nowrap">
            This might come across as terse. Soften?
          </span>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={handleSoften}
              disabled={rewriting}
              className="px-2.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
            >
              {rewriting ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Softening
                </span>
              ) : (
                'Soften'
              )}
            </button>
            <button
              onClick={handleSendAsIs}
              className="px-2.5 py-0.5 hover:bg-zinc-700/40 text-zinc-400 rounded-full text-xs transition-colors"
            >
              Send as is
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Export the detection function for external use
export { isTerseMessage };
