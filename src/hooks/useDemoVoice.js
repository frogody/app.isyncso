import { useState, useRef, useEffect, useCallback } from 'react';
import { getLanguageConfig } from '../constants/languages';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hasSpeechRecognition = !!SpeechRecognition;

const VOICE_STATES = {
  OFF: 'off',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export default function useDemoVoice({ demoToken, onDemoAction, onDialogueEnd, onUserSpoke, language = 'en' } = {}) {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.OFF);
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef(null);
  const audioElRef = useRef(null);
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const turnIdRef = useRef(0);
  const historyRef = useRef([]);
  const stepContextRef = useRef(null);
  const onDemoActionRef = useRef(onDemoAction);
  const onDialogueEndRef = useRef(onDialogueEnd);
  const onUserSpokeRef = useRef(onUserSpoke);
  const audioCacheRef = useRef(new Map()); // Pre-cached audio: text → base64

  useEffect(() => { onDemoActionRef.current = onDemoAction; }, [onDemoAction]);
  useEffect(() => { onDialogueEndRef.current = onDialogueEnd; }, [onDialogueEnd]);
  useEffect(() => { onUserSpokeRef.current = onUserSpoke; }, [onUserSpoke]);

  const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice-demo`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  // Audio playback
  const stopAudio = useCallback(() => {
    if (audioElRef.current) {
      try {
        audioElRef.current.onended = null;
        audioElRef.current.onerror = null;
        audioElRef.current.pause();
        audioElRef.current.src = '';
      } catch (_) {}
      audioElRef.current = null;
    }
    // Also cancel any browser speechSynthesis
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }, []);

  const safetyTimeoutRef = useRef(null);

  const playAudio = useCallback((base64, turnId, onDone) => {
    if (turnIdRef.current !== turnId) return;

    // Clear any previous safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    try {
      stopAudio();
      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audioElRef.current = audio;

      let doneFired = false;
      const fireDone = () => {
        if (doneFired) return;
        doneFired = true;
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      };

      audio.onended = fireDone;
      audio.onerror = fireDone;

      audio.play().then(() => {
        // Set safety timeout: max(audio.duration + 2s, 30s)
        const safetyMs = audio.duration
          ? Math.min((audio.duration + 2) * 1000, 30000)
          : 30000;
        safetyTimeoutRef.current = setTimeout(() => {
          console.warn('[useDemoVoice] Safety timeout: force-resetting from Speaking');
          fireDone();
        }, safetyMs);
      }).catch(fireDone);
    } catch (e) {
      audioElRef.current = null;
      if (turnIdRef.current === turnId) onDone?.();
    }
  }, [stopAudio]);

  // Browser speechSynthesis fallback (for languages without Kokoro TTS)
  const browserSpeak = useCallback((text, turnId, onDone) => {
    if (turnIdRef.current !== turnId || !window.speechSynthesis) {
      onDone?.();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const langConfig = getLanguageConfig(language);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langConfig.speechCode;
      utterance.rate = 1.0;
      utterance.onend = () => { if (turnIdRef.current === turnId) onDone?.(); };
      utterance.onerror = () => { if (turnIdRef.current === turnId) onDone?.(); };
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      onDone?.();
    }
  }, [language]);

  // Speech recognition
  const startListeningFnRef = useRef(null);

  const startListening = useCallback(() => {
    if (!activeRef.current || !hasSpeechRecognition || isMuted) return;
    if (processingRef.current) return;
    stopAudio();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = getLanguageConfig(language).speechCode;

      rec.onend = () => {
        recognitionRef.current = null;
        if (activeRef.current && !processingRef.current) {
          setTimeout(() => {
            if (activeRef.current && !processingRef.current) startListeningFnRef.current?.();
          }, 80);
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          // Mic denied — keep active for text input but auto-switch to muted
          setIsMuted(true);
          setTranscript('Microphone access denied — use text input instead');
          recognitionRef.current = null;
          // Don't deactivate — user can still use text input
          if (activeRef.current) {
            setVoiceState(VOICE_STATES.LISTENING);
          }
          return;
        }
      };

      rec.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        if (text && text.trim().length >= 2 && !processingRef.current) {
          processingRef.current = true;
          processInput(text.trim());
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setVoiceState(VOICE_STATES.LISTENING);
    } catch (e) {
      if (activeRef.current) setTimeout(() => startListeningFnRef.current?.(), 300);
    }
  }, [stopAudio, isMuted, language]);

  useEffect(() => { startListeningFnRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  const resumeListening = useCallback(() => {
    processingRef.current = false;
    if (!activeRef.current) return;
    setVoiceState(VOICE_STATES.LISTENING);
    // 400ms breathing room prevents echo/feedback pickup after SYNC speaks
    setTimeout(() => startListeningFnRef.current?.(), 400);
  }, []);

  // Parse [DEMO_ACTION: xxx] from responses
  const parseDemoActions = useCallback((text) => {
    const actions = [];
    const regex = /\[DEMO_ACTION:\s*([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      actions.push(match[1].trim());
    }
    // Return clean text without action tags
    const cleanText = text.replace(/\[DEMO_ACTION:\s*[^\]]+\]/g, '').trim();
    return { cleanText, actions };
  }, []);

  // Process user speech input
  const processInput = useCallback(async (text) => {
    if (!text || !activeRef.current) {
      processingRef.current = false;
      return;
    }

    const turnId = ++turnIdRef.current;
    setVoiceState(VOICE_STATES.PROCESSING);
    setTranscript(`You: ${text}`);
    stopListening();
    stopAudio();

    // Notify parent that user spoke (enters conversation mode, cancels auto-advance)
    onUserSpokeRef.current?.(text);

    try {
      const res = await fetch(voiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: historyRef.current.slice(-12),
          demoToken,
          stepContext: stepContextRef.current,
          language,
        }),
      });

      if (turnIdRef.current !== turnId) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rawReply = data.response || data.text || '';
      const { cleanText: reply, actions } = parseDemoActions(rawReply);

      historyRef.current = [...historyRef.current, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-20);
      setTranscript(reply);

      // Fire demo actions
      if (actions.length && onDemoActionRef.current) {
        actions.forEach(a => onDemoActionRef.current(a));
      }

      if (!activeRef.current || turnIdRef.current !== turnId) return;

      // Play audio from combined response (single round-trip) or fall back to TTS-only/browser TTS
      if (reply) {
        setVoiceState(VOICE_STATES.SPEAKING);

        // Check if audio was included in the response (combined LLM+TTS)
        if (data.audio) {
          playAudio(data.audio, turnId, () => resumeListening());
          return;
        }

        // Server says no TTS available for this language — use browser speechSynthesis
        if (data.ttsUnavailable) {
          browserSpeak(reply, turnId, () => resumeListening());
          return;
        }

        // Fallback: separate TTS call
        try {
          const controller = new AbortController();
          const ttsTimeout = setTimeout(() => controller.abort(), 6000);
          const audioRes = await fetch(voiceUrl, {
            method: 'POST',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ ttsOnly: true, ttsText: reply, language }),
          });
          clearTimeout(ttsTimeout);
          if (turnIdRef.current !== turnId) return;
          if (audioRes.ok && activeRef.current) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              playAudio(audioData.audio, turnId, () => resumeListening());
              return;
            }
            // TTS unavailable from fallback call — use browser TTS
            if (audioData.ttsUnavailable) {
              browserSpeak(reply, turnId, () => resumeListening());
              return;
            }
          }
        } catch (_) {}
      }

      if (turnIdRef.current === turnId) resumeListening();
    } catch (err) {
      if (err.name === 'AbortError' || turnIdRef.current !== turnId) {
        processingRef.current = false;
        return;
      }
      if (activeRef.current) setTimeout(() => resumeListening(), 300);
    }
  }, [demoToken, language, stopListening, stopAudio, playAudio, browserSpeak, resumeListening, parseDemoActions, voiceUrl, headers]);

  // Pre-cache TTS audio for upcoming scripted dialogue (fire-and-forget)
  const preCacheAudio = useCallback((texts) => {
    if (!texts || !texts.length) return;
    texts.forEach(text => {
      if (!text || audioCacheRef.current.has(text)) return;
      // Mark as pending to avoid duplicate fetches
      audioCacheRef.current.set(text, 'pending');
      fetch(voiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ttsOnly: true, ttsText: text, language }),
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.audio) {
            audioCacheRef.current.set(text, data.audio);
          } else {
            // ttsUnavailable or error — mark as 'browser' so speakDialogue uses browser TTS
            audioCacheRef.current.set(text, data?.ttsUnavailable ? 'browser' : null);
            if (!data?.ttsUnavailable) audioCacheRef.current.delete(text);
          }
        })
        .catch(() => audioCacheRef.current.delete(text));
    });
  }, [voiceUrl, headers, language]);

  // Speak pre-written dialogue (scripted steps)
  const speakDialogue = useCallback(async (text) => {
    if (!text) return;

    const turnId = ++turnIdRef.current;
    processingRef.current = true;
    stopListening();
    stopAudio();

    setTranscript(text);
    setVoiceState(VOICE_STATES.SPEAKING);

    const handleDone = () => {
      resumeListening();
      onDialogueEndRef.current?.();
    };

    // Check pre-cache first
    const cached = audioCacheRef.current.get(text);
    if (cached && cached !== 'pending' && cached !== 'browser') {
      playAudio(cached, turnId, handleDone);
      return;
    }
    // Pre-cache indicated browser TTS for this language
    if (cached === 'browser') {
      browserSpeak(text, turnId, handleDone);
      return;
    }

    try {
      const controller = new AbortController();
      const ttsTimeout = setTimeout(() => controller.abort(), 8000);
      const audioRes = await fetch(voiceUrl, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({ ttsOnly: true, ttsText: text, language }),
      });
      clearTimeout(ttsTimeout);

      if (turnIdRef.current !== turnId || !activeRef.current) return;

      if (audioRes.ok) {
        const audioData = await audioRes.json();
        if (audioData.audio) {
          // Cache for potential replay
          audioCacheRef.current.set(text, audioData.audio);
          playAudio(audioData.audio, turnId, handleDone);
          return;
        }
        // No server TTS — use browser speechSynthesis
        if (audioData.ttsUnavailable) {
          audioCacheRef.current.set(text, 'browser');
          browserSpeak(text, turnId, handleDone);
          return;
        }
      }
    } catch (_) {}

    // TTS failed — wait long enough to read the transcript before advancing
    if (turnIdRef.current === turnId) {
      const readTime = Math.max(3000, text.length * 40);
      await new Promise(r => setTimeout(r, readTime));
      handleDone();
    }
  }, [voiceUrl, headers, language, stopListening, stopAudio, playAudio, browserSpeak, resumeListening]);

  // Generate and speak a tailored walkthrough via LLM (for priority modules after discovery)
  // Unlike speakDialogue (pre-written text→TTS), this calls the LLM to generate contextual dialogue
  // Unlike processInput (user speech→LLM), this doesn't trigger onUserSpoke and fires onDialogueEnd
  const generateGuidedWalkthrough = useCallback(async (guidedPrompt) => {
    if (!guidedPrompt || !activeRef.current) return;

    const turnId = ++turnIdRef.current;
    processingRef.current = true;
    stopListening();
    stopAudio();

    setVoiceState(VOICE_STATES.PROCESSING);
    setTranscript('');

    const handleDone = () => {
      resumeListening();
      onDialogueEndRef.current?.();
    };

    try {
      const res = await fetch(voiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: guidedPrompt,
          history: historyRef.current.slice(-12),
          demoToken,
          stepContext: stepContextRef.current,
          language,
        }),
      });

      if (turnIdRef.current !== turnId) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rawReply = data.response || data.text || '';
      const { cleanText: reply, actions } = parseDemoActions(rawReply);

      // Store in history as assistant turn (don't expose the guided prompt as user message)
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }].slice(-20);
      setTranscript(reply);

      // Fire demo actions (highlights, sub-page navigation)
      if (actions.length && onDemoActionRef.current) {
        actions.forEach(a => onDemoActionRef.current(a));
      }

      if (!activeRef.current || turnIdRef.current !== turnId) return;

      if (reply) {
        setVoiceState(VOICE_STATES.SPEAKING);

        if (data.audio) {
          playAudio(data.audio, turnId, handleDone);
          return;
        }

        // Server says no TTS for this language — use browser speechSynthesis
        if (data.ttsUnavailable) {
          browserSpeak(reply, turnId, handleDone);
          return;
        }

        // Fallback TTS
        try {
          const controller = new AbortController();
          const ttsTimeout = setTimeout(() => controller.abort(), 8000);
          const audioRes = await fetch(voiceUrl, {
            method: 'POST',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ ttsOnly: true, ttsText: reply, language }),
          });
          clearTimeout(ttsTimeout);
          if (turnIdRef.current !== turnId) return;
          if (audioRes.ok && activeRef.current) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              playAudio(audioData.audio, turnId, handleDone);
              return;
            }
            if (audioData.ttsUnavailable) {
              browserSpeak(reply, turnId, handleDone);
              return;
            }
          }
        } catch (_) {}
      }

      // TTS failed — wait reading time
      if (turnIdRef.current === turnId) {
        const readTime = Math.max(3000, (reply || '').length * 40);
        await new Promise(r => setTimeout(r, readTime));
        handleDone();
      }
    } catch (err) {
      if (err.name === 'AbortError' || turnIdRef.current !== turnId) {
        processingRef.current = false;
        return;
      }
      if (activeRef.current) setTimeout(() => handleDone(), 300);
    }
  }, [demoToken, language, stopListening, stopAudio, playAudio, browserSpeak, resumeListening, parseDemoActions, voiceUrl, headers]);

  // Set step context (called by orchestrator before each step)
  const setStepContext = useCallback((ctx) => {
    stepContextRef.current = ctx;
  }, []);

  // Activate voice
  const activate = useCallback(async () => {
    if (!hasSpeechRecognition) {
      // Still activate for text-only mode
      activeRef.current = true;
      processingRef.current = false;
      turnIdRef.current = 0;
      setVoiceState(VOICE_STATES.LISTENING);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      // Mic denied — still activate for text input
      activeRef.current = true;
      setVoiceState(VOICE_STATES.LISTENING);
      setIsMuted(true);
      return;
    }

    activeRef.current = true;
    processingRef.current = false;
    turnIdRef.current = 0;
    startListeningFnRef.current?.();
  }, []);

  const deactivate = useCallback(() => {
    activeRef.current = false;
    processingRef.current = false;
    turnIdRef.current++;
    stopListening();
    stopAudio();
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    setVoiceState(VOICE_STATES.OFF);
    setTranscript('');
    historyRef.current = [];
  }, [stopListening, stopAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted) {
        stopListening();
      } else if (activeRef.current && !processingRef.current) {
        setTimeout(() => startListeningFnRef.current?.(), 200);
      }
      return newMuted;
    });
  }, [stopListening]);

  // Handle text input (for when mic is unavailable)
  const submitText = useCallback((text) => {
    if (!text || processingRef.current) return;
    processingRef.current = true;
    processInput(text);
  }, [processInput]);

  // Cleanup
  useEffect(() => {
    return () => {
      activeRef.current = false;
      turnIdRef.current++;
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
      if (audioElRef.current) try { audioElRef.current.pause(); } catch (_) {}
    };
  }, []);

  // Handle tab visibility change — check if audio should have finished
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && voiceState === 'speaking') {
        const audio = audioElRef.current;
        if (audio && audio.ended) {
          // Audio finished while tab was backgrounded — trigger done
          audio.onended?.();
        } else if (!audio) {
          // Audio element gone but still in speaking state — force reset
          setVoiceState(activeRef.current ? VOICE_STATES.LISTENING : VOICE_STATES.OFF);
          processingRef.current = false;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [voiceState]);

  return {
    voiceState,
    transcript,
    isMuted,
    isActive: voiceState !== VOICE_STATES.OFF,
    isListening: voiceState === VOICE_STATES.LISTENING,
    isProcessing: voiceState === VOICE_STATES.PROCESSING,
    isSpeaking: voiceState === VOICE_STATES.SPEAKING,
    activate,
    deactivate,
    speakDialogue,
    generateGuidedWalkthrough,
    preCacheAudio,
    setStepContext,
    toggleMute,
    submitText,
  };
}
