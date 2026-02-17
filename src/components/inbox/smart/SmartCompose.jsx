/**
 * SmartCompose - Inline ghost-text compose suggestions
 *
 * Renders a transparent overlay that shows a suggested text completion
 * in a lighter color (text-zinc-500) after the user's current input.
 * Tab to accept, Escape to dismiss. Non-blocking -- user can keep typing.
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartCompose({
  suggestion,
  messageText,
  onAccept,
  onDismiss,
  textareaRef,
}) {
  // Handle keyboard shortcuts on the textarea
  useEffect(() => {
    const textarea = textareaRef?.current;
    if (!textarea || !suggestion) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        onAccept?.();
      }
      if (e.key === 'Escape' && suggestion) {
        onDismiss?.();
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [suggestion, onAccept, onDismiss, textareaRef]);

  if (!suggestion) return null;

  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute inset-0 flex items-start"
          style={{ zIndex: 1 }}
        >
          {/* Invisible spacer matching user text, then ghost suggestion */}
          <div className="w-full py-1 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {/* Invisible text matching user input to position the ghost text correctly */}
            <span className="invisible">{messageText}</span>
            <span className="text-zinc-500 select-none">{suggestion}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
