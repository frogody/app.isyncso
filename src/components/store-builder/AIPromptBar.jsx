// ---------------------------------------------------------------------------
// AIPromptBar.jsx -- Bottom bar for AI chat input in the B2B Store Builder.
// Accepts user prompts, shows quick suggestion chips, and indicates
// processing state.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowUp, Loader2, MessageSquare } from 'lucide-react';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SUGGESTIONS = [
  'Make it dark themed',
  'Add a testimonials section',
  'Change hero text',
  'Make it more minimal',
  'Add company stats',
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AIPromptBar({
  onSendPrompt,
  isProcessing = false,
  suggestions = DEFAULT_SUGGESTIONS,
  onExpandChat,
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const canSend = value.trim().length > 0 && !isProcessing;

  const handleSend = useCallback(async () => {
    const prompt = value.trim();
    if (!prompt || isProcessing) return;

    const savedPrompt = prompt;
    setValue('');
    try {
      await onSendPrompt(prompt);
    } catch (err) {
      console.error('AIPromptBar: send failed', err);
      // Restore prompt so user doesn't lose their input
      setValue(savedPrompt);
    }
  }, [value, isProcessing, onSendPrompt]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      setValue(suggestion);
      // Focus the input so the user can review or immediately send
      inputRef.current?.focus();
    },
    [],
  );

  // Keep focus management clean when processing finishes
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const displaySuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="shrink-0">
      {/* Suggestion chips */}
      <AnimatePresence>
        {displaySuggestions && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto scrollbar-none"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="shrink-0 text-xs bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white rounded-full px-3 py-1 transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="h-16 border-t border-zinc-800/60 bg-zinc-950 flex items-center px-4 gap-3">
        {/* Sparkles icon + expand chat */}
        <button
          onClick={onExpandChat}
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-zinc-800 transition-colors"
          title="Open AI chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder="Ask AI to modify your store... (e.g., 'Make it dark with blue accents')"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all disabled:opacity-50"
        />

        {/* Send / Loader button */}
        {isProcessing ? (
          <div className="w-9 h-9 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
              canSend
                ? 'bg-cyan-500 text-white hover:bg-cyan-400 cursor-pointer'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
