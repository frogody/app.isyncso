/**
 * useSmartCompose - AI-powered inline compose suggestions
 *
 * Provides ghost-text autocomplete suggestions based on local pattern matching.
 * Debounced to avoid excessive processing (500ms after typing stops, min 10 chars).
 * Tab key accepts the suggestion.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Pattern-based completions: maps trailing phrase fragments to suggested completions
const COMPOSE_PATTERNS = [
  { trigger: /can you\s*$/i, completion: 'please help me with...' },
  { trigger: /could you\s*$/i, completion: 'please take a look at...' },
  { trigger: /i think we should\s*$/i, completion: 'schedule a meeting to discuss...' },
  { trigger: /i think we need\s*$/i, completion: 'to review this before proceeding.' },
  { trigger: /thanks for\s*$/i, completion: 'getting back to me...' },
  { trigger: /thank you for\s*$/i, completion: 'your help with this.' },
  { trigger: /let me know\s*$/i, completion: 'if you have any questions.' },
  { trigger: /please let me\s*$/i, completion: 'know if you need anything else.' },
  { trigger: /i'll follow up\s*$/i, completion: 'with more details shortly.' },
  { trigger: /i'll get back\s*$/i, completion: 'to you on this.' },
  { trigger: /just wanted to\s*$/i, completion: 'check in on the status of...' },
  { trigger: /wanted to\s*$/i, completion: 'follow up on our conversation.' },
  { trigger: /do you have\s*$/i, completion: 'time to discuss this?' },
  { trigger: /are you available\s*$/i, completion: 'for a quick call?' },
  { trigger: /looking forward\s*$/i, completion: 'to hearing from you.' },
  { trigger: /sounds good\s*$/i, completion: "I'll get started on that." },
  { trigger: /happy to\s*$/i, completion: 'help with that!' },
  { trigger: /i was wondering\s*$/i, completion: 'if you could help me with...' },
  { trigger: /would it be\s*$/i, completion: 'possible to...' },
  { trigger: /when would\s*$/i, completion: 'be a good time to connect?' },
  { trigger: /as discussed\s*$/i, completion: "here's the update on..." },
  { trigger: /per our\s*$/i, completion: 'conversation, I wanted to...' },
  { trigger: /following up\s*$/i, completion: 'on our earlier discussion.' },
  { trigger: /quick question\s*$/i, completion: 'about the project...' },
  { trigger: /i have a\s*$/i, completion: 'question about...' },
];

const DEBOUNCE_MS = 500;
const MIN_CHARS = 10;

export function useSmartCompose({ channelId, userId, messageText, recentMessages } = {}) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef(null);
  const lastTextRef = useRef('');

  // Generate a suggestion from local pattern matching
  const generateSuggestion = useCallback((text) => {
    if (!text || text.length < MIN_CHARS) {
      setSuggestion(null);
      return;
    }

    // Check each pattern against the end of the input text
    for (const pattern of COMPOSE_PATTERNS) {
      if (pattern.trigger.test(text)) {
        setSuggestion(pattern.completion);
        return;
      }
    }

    // No pattern matched
    setSuggestion(null);
  }, []);

  // Debounced watcher on messageText changes
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const text = messageText || '';

    // If text got shorter or cleared, dismiss suggestion immediately
    if (text.length < MIN_CHARS || text.length < lastTextRef.current.length) {
      setSuggestion(null);
      lastTextRef.current = text;
      return;
    }

    lastTextRef.current = text;
    setLoading(true);

    debounceTimerRef.current = setTimeout(() => {
      generateSuggestion(text);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [messageText, generateSuggestion]);

  // Clear suggestion when channel changes
  useEffect(() => {
    setSuggestion(null);
  }, [channelId]);

  // Accept the current suggestion (append to message text)
  const acceptSuggestion = useCallback(() => {
    const accepted = suggestion;
    setSuggestion(null);
    return accepted;
  }, [suggestion]);

  // Dismiss the current suggestion
  const dismissSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  return {
    suggestion,
    loading,
    acceptSuggestion,
    dismissSuggestion,
  };
}

export default useSmartCompose;
