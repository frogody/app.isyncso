/**
 * useSmartCompose - AI-powered inline compose suggestions via Groq LLM.
 *
 * Provides ghost-text autocomplete suggestions based on conversation context.
 * Debounced to 800ms after typing stops, minimum 10 chars.
 * Tab key accepts the suggestion.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEBOUNCE_MS = 800;
const MIN_CHARS = 10;

export function useSmartCompose({ channelId, userId, messageText, recentMessages } = {}) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef(null);
  const lastTextRef = useRef('');
  const abortControllerRef = useRef(null);

  // Generate a suggestion from the AI edge function
  const generateSuggestion = useCallback(async (text) => {
    if (!text || text.length < MIN_CHARS) {
      setSuggestion(null);
      return;
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/smart-compose`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            mode: 'autocomplete',
            text,
            recentMessages: (recentMessages || []).slice(-5).map(m => ({
              sender: m.sender_name || m.user?.full_name || 'User',
              content: m.content || '',
            })),
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        setSuggestion(null);
        return;
      }

      const data = await response.json();
      if (data.suggestion) {
        setSuggestion(data.suggestion);
      } else {
        setSuggestion(null);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name !== 'AbortError') {
        console.error('[useSmartCompose] Error:', err);
        setSuggestion(null);
      }
    } finally {
      setLoading(false);
    }
  }, [recentMessages]);

  // Debounced watcher on messageText changes
  useEffect(() => {
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

    debounceTimerRef.current = setTimeout(() => {
      generateSuggestion(text);
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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
