// ---------------------------------------------------------------------------
// useBuilderAI.js -- Manages AI communication between the Store Builder and
// the store-builder-ai edge function. Maintains chat history, processing
// state, and contextual suggestions.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';

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
// Hook
// ---------------------------------------------------------------------------

export function useBuilderAI() {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);

  // ---- Send prompt to AI edge function ------------------------------------

  const sendPrompt = useCallback(async (prompt, currentConfig, businessContext) => {
    // Add user message to chat history
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: prompt, timestamp: new Date() },
    ]);
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-builder-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt, currentConfig, businessContext }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`AI request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // AI returned an updated config
      if (data.updatedConfig) {
        const summary =
          data.changes && Array.isArray(data.changes) && data.changes.length > 0
            ? `Done! I made these changes:\n${data.changes.map((c) => `- ${c}`).join('\n')}`
            : 'Done! I updated the store configuration.';

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: summary, timestamp: new Date() },
        ]);

        // Update suggestions based on what was just changed
        setSuggestions(deriveContextualSuggestions(data.changes));

        return { updatedConfig: data.updatedConfig, changes: data.changes };
      }

      // AI returned a plain message (e.g. clarification needed)
      if (data.message) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message, timestamp: new Date() },
        ]);

        return null;
      }

      // Unexpected response shape
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I received an unexpected response. Please try again.',
          timestamp: new Date(),
        },
      ]);

      return null;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong while contacting AI.';

      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, an error occurred: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);

      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ---- Clear helpers ------------------------------------------------------

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestions(DEFAULT_SUGGESTIONS);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---- Return -------------------------------------------------------------

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
