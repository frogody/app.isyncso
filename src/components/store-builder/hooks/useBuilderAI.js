// ---------------------------------------------------------------------------
// useBuilderAI.js -- Manages AI communication between the Store Builder and
// the store-builder-ai edge function. Streams responses token-by-token for
// real-time chat UX, then extracts the JSON config from a ```json fence.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SUGGESTIONS = [
  'Make it dark themed',
  'Add a testimonials section',
  'Change hero text',
  'Make it more minimal',
  'Add company stats',
];

/**
 * Maps the type of change the AI just made to a set of follow-up suggestions.
 * Falls back to generic suggestions when no specific context is detected.
 */
function deriveContextualSuggestions(changes) {
  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return [
      'Adjust the color scheme',
      'Improve mobile responsiveness',
      'Add a call-to-action section',
      'Update the typography',
      'Simplify the layout',
    ];
  }

  const joined = changes.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join(' ').toLowerCase();

  if (joined.includes('theme') || joined.includes('color') || joined.includes('dark') || joined.includes('light')) {
    return [
      'Make the accent color blue',
      'Try a warmer palette',
      'Add more contrast',
      'Switch back to light theme',
      'Make buttons stand out more',
    ];
  }

  if (joined.includes('section') || joined.includes('hero') || joined.includes('testimonial') || joined.includes('footer')) {
    return [
      'Reorder the sections',
      'Add another section',
      'Remove a section',
      'Change the section layout',
      'Update section headlines',
    ];
  }

  if (joined.includes('text') || joined.includes('heading') || joined.includes('copy') || joined.includes('font')) {
    return [
      'Make headings larger',
      'Use a different font',
      'Shorten the copy',
      'Make text more professional',
      'Add subheadings',
    ];
  }

  if (joined.includes('image') || joined.includes('logo') || joined.includes('gallery')) {
    return [
      'Add more images',
      'Change image layout to grid',
      'Add image captions',
      'Use rounded image corners',
      'Make images full-width',
    ];
  }

  return [
    'Tweak the spacing',
    'Improve the visual hierarchy',
    'Add more white space',
    'Change the button styles',
    'Make it look more modern',
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts JSON from ```json ... ``` fenced block in the accumulated text.
 * Returns { updatedConfig, changes } or null if not found / parse error.
 */
function extractConfigFromText(fullText) {
  const fenceMatch = fullText.match(/```json\s*([\s\S]*?)```/);
  if (!fenceMatch) return null;

  try {
    const parsed = JSON.parse(fenceMatch[1].trim());
    return {
      updatedConfig: parsed.updatedConfig || null,
      changes: parsed.changes || [],
    };
  } catch {
    return null;
  }
}

/**
 * Returns the explanation portion of the AI response (everything before the
 * json fence), cleaned up. If no fence is found, returns the full text.
 */
function extractExplanation(fullText) {
  const fenceStart = fullText.indexOf('```json');
  const text = fenceStart !== -1 ? fullText.slice(0, fenceStart) : fullText;
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBuilderAI() {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);

  // Keep a ref to current messages so we can capture history synchronously
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Used to allow cancellation of in-flight streams
  const abortRef = useRef(null);

  // ---- Send prompt to AI edge function (streaming) --------------------------

  const sendPrompt = useCallback(async (prompt, currentConfig, businessContext) => {
    // Cancel any in-flight stream
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // Capture current messages for history BEFORE adding the new user message
    const currentMessages = messagesRef.current;

    // Build conversation history for the AI (last 20 messages, simplified)
    const history = currentMessages
      .filter((m) => m.content && !m.streaming)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: prompt, timestamp: new Date() },
    ]);
    setIsProcessing(true);
    setError(null);

    // Create a placeholder assistant message that we'll update while streaming
    const assistantMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', timestamp: null, streaming: true, _id: assistantMsgId },
    ]);

    let accumulated = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-builder-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt, currentConfig, businessContext, history }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`AI request failed (${response.status}): ${errorText}`);
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Show only the explanation part (before any ```json fence) in the chat
        const displayText = extractExplanation(accumulated);

        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === assistantMsgId
              ? { ...msg, content: displayText }
              : msg,
          ),
        );
      }

      // Stream finished — finalize the message
      const explanation = extractExplanation(accumulated);
      const result = extractConfigFromText(accumulated);

      // Build final display text
      let finalContent = explanation;
      if (result?.changes?.length) {
        const changeList = result.changes.map((c) => `- ${c}`).join('\n');
        finalContent = finalContent
          ? `${finalContent}\n\n${changeList}`
          : `Done! I made these changes:\n${changeList}`;
      } else if (!finalContent && result?.updatedConfig) {
        finalContent = 'Done! I updated the store configuration.';
      } else if (!finalContent) {
        finalContent = 'I processed your request but couldn\'t generate a config update. Please try rephrasing.';
      }

      // Finalize the assistant message (remove streaming flag)
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === assistantMsgId
            ? { ...msg, content: finalContent, timestamp: new Date(), streaming: false }
            : msg,
        ),
      );

      if (result?.updatedConfig) {
        setSuggestions(deriveContextualSuggestions(result.changes));
        return { updatedConfig: result.updatedConfig, changes: result.changes };
      }

      return null;
    } catch (err) {
      // Don't treat abort as an error
      if (err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === assistantMsgId
              ? { ...msg, content: 'Request cancelled.', timestamp: new Date(), streaming: false }
              : msg,
          ),
        );
        return null;
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong while contacting AI.';

      setError(errorMessage);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === assistantMsgId
            ? { ...msg, content: `Sorry, an error occurred: ${errorMessage}`, timestamp: new Date(), streaming: false }
            : msg,
        ),
      );

      return null;
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  }, []);

  // ---- Clear helpers --------------------------------------------------------

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestions(DEFAULT_SUGGESTIONS);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---- Return ---------------------------------------------------------------

  return {
    messages,
    isProcessing,
    error,
    suggestions,
    sendPrompt,
    clearMessages,
    clearError,
  };
}
