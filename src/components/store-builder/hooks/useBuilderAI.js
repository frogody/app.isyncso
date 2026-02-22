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
 * Extracts JSON from the AI response. Tries multiple strategies:
 * 1. ```json ... ``` fenced block
 * 2. Unclosed ```json fence (model hit token limit)
 * 3. Raw JSON object starting with { "updatedConfig" or { "configPatch"
 *
 * Returns { updatedConfig?, configPatch?, changes } or null.
 */
function extractConfigFromText(fullText) {
  // Strategy 1: Proper fenced JSON block
  let jsonStr = null;
  const fenceMatch = fullText.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Strategy 2: Unclosed fence (model ran out of tokens before closing ```)
  if (!jsonStr) {
    const openFence = fullText.indexOf('```json');
    if (openFence !== -1) {
      jsonStr = fullText.slice(openFence + 7).trim();
      // Remove trailing ``` if partially there
      jsonStr = jsonStr.replace(/`{0,3}$/, '').trim();
    }
  }

  // Strategy 3: Raw JSON in the response (no fences at all)
  if (!jsonStr) {
    const rawMatch = fullText.match(/(\{[\s\S]*"(?:updatedConfig|configPatch)"[\s\S]*\})\s*$/);
    if (rawMatch) jsonStr = rawMatch[1].trim();
  }

  if (!jsonStr) return null;

  // Try to repair truncated JSON (missing closing braces/brackets)
  let parsed = tryParseJSON(jsonStr);
  if (!parsed) {
    // Attempt to close unclosed braces/brackets
    const repaired = repairJSON(jsonStr);
    parsed = tryParseJSON(repaired);
  }

  if (!parsed) return null;

  return {
    updatedConfig: parsed.updatedConfig || null,
    configPatch: parsed.configPatch || null,
    changes: parsed.changes || [],
    buildPlan: parsed.buildPlan || null,
  };
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/** Attempt to close unclosed brackets/braces in truncated JSON */
function repairJSON(str) {
  let depth = { brace: 0, bracket: 0 };
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth.brace++;
    else if (ch === '}') depth.brace--;
    else if (ch === '[') depth.bracket++;
    else if (ch === ']') depth.bracket--;
  }

  // Remove any trailing partial value (e.g. truncated string)
  let repaired = str.replace(/,\s*"[^"]*$/, '').replace(/,\s*$/, '');

  // Close unclosed strings
  if (inString) repaired += '"';

  // Close brackets/braces
  while (depth.bracket > 0) { repaired += ']'; depth.bracket--; }
  while (depth.brace > 0) { repaired += '}'; depth.brace--; }

  return repaired;
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

export function useBuilderAI(initialMessages) {
  const [messages, setMessages] = useState(() => {
    // Restore persisted messages (rehydrate timestamps)
    if (Array.isArray(initialMessages) && initialMessages.length > 0) {
      return initialMessages.map((m) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : null,
        streaming: false,
        building: false,
      }));
    }
    return [];
  });
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

    // Create a placeholder assistant message in "building" mode
    // During streaming we do NOT show the AI's explanation text — we show
    // a building progress state instead. The explanation is only revealed
    // after the config has been successfully extracted.
    const assistantMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: null,
        streaming: true,
        building: true,
        buildPhase: 'analyzing',
        _id: assistantMsgId,
      },
    ]);

    let accumulated = '';

    // Progress phases based on accumulated content length
    const updateBuildPhase = (text) => {
      const textLen = text.length;
      let phase = 'analyzing';
      if (textLen > 100) phase = 'planning';
      if (textLen > 400) phase = 'building';
      if (textLen > 1000) phase = 'applying';

      // Extract the explanation portion (everything before the JSON fence)
      // so users can see the AI's reasoning in real-time
      const fenceStart = text.indexOf('```json');
      const streamingText = fenceStart !== -1 ? text.slice(0, fenceStart) : text;
      const cleanText = streamingText.replace(/\n{3,}/g, '\n\n').trim();

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === assistantMsgId
            ? { ...msg, buildPhase: phase, content: cleanText }
            : msg,
        ),
      );
    };

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

      // Read the streaming response silently — don't show text to user yet
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Update the build phase and stream reasoning text to the user
        updateBuildPhase(accumulated);
      }

      // Stream finished — try to extract config JSON
      const explanation = extractExplanation(accumulated);
      let result = extractConfigFromText(accumulated);

      // ----- RETRY: If no JSON was extracted, ask the AI to output ONLY JSON -----
      if (!result && accumulated.length > 20) {
        console.warn('[useBuilderAI] No JSON extracted from stream, retrying with JSON-only prompt...');

        // Show retry phase
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === assistantMsgId
              ? { ...msg, buildPhase: 'retrying' }
              : msg,
          ),
        );

        try {
          const retryResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-builder-ai`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                prompt,
                currentConfig,
                businessContext,
                jsonRetry: true,
                previousResponse: accumulated,
              }),
              signal: controller.signal,
            },
          );

          if (retryResponse.ok) {
            const retryText = await retryResponse.text();
            result = extractConfigFromText(retryText);
            if (result) {
              console.log('[useBuilderAI] JSON retry succeeded');
            }
          }
        } catch (retryErr) {
          console.warn('[useBuilderAI] JSON retry failed:', retryErr.message);
        }
      }

      // Build final display text
      const hasConfig = !!(result?.updatedConfig || result?.configPatch);
      let finalContent = explanation;
      if (result?.changes?.length) {
        const changeList = result.changes.map((c) => `- ${c}`).join('\n');
        finalContent = finalContent
          ? `${finalContent}\n\n${changeList}`
          : `Done! I made these changes:\n${changeList}`;
      } else if (!finalContent && hasConfig) {
        finalContent = 'Done! I updated the store configuration.';
      } else if (!finalContent && !hasConfig) {
        finalContent = 'I couldn\'t apply changes to the store. Please try again with a more specific request.';
      }

      // If extraction failed completely, flag it in the message
      if (!hasConfig && explanation) {
        finalContent = `${explanation}\n\n⚠ Config update failed — try rephrasing your request.`;
      }

      // Finalize the assistant message — NOW show the explanation to the user
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === assistantMsgId
            ? {
                ...msg,
                content: finalContent,
                timestamp: new Date(),
                streaming: false,
                building: false,
                buildPhase: null,
                buildPlan: result?.buildPlan || null,
              }
            : msg,
        ),
      );

      // Return full config or a patch to be deep-merged by the caller
      if (result?.updatedConfig) {
        setSuggestions(deriveContextualSuggestions(result.changes));
        return { updatedConfig: result.updatedConfig, changes: result.changes };
      }

      if (result?.configPatch) {
        setSuggestions(deriveContextualSuggestions(result.changes));
        return { configPatch: result.configPatch, changes: result.changes };
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

  // Mark the last assistant message with hasChanges flag + optional diff stats
  const markLastMessageWithChanges = useCallback((diffStats) => {
    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'assistant' && !updated[i].streaming) {
          updated[i] = { ...updated[i], hasChanges: true, ...(diffStats ? { diffStats } : {}) };
          break;
        }
      }
      return updated;
    });
  }, []);

  // ---- Serializable snapshot for persistence --------------------------------

  /** Returns a clean array suitable for JSON storage (no circular refs, no _id) */
  const getSerializableMessages = useCallback(() => {
    return messagesRef.current
      .filter((m) => m.content && !m.streaming && !m.building)
      .map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ? m.timestamp.toISOString() : null,
        hasChanges: m.hasChanges || false,
        buildPlan: m.buildPlan || null,
      }));
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
    markLastMessageWithChanges,
    getSerializableMessages,
  };
}
