import { useState, useRef, useEffect, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hasSpeechRecognition = !!SpeechRecognition;

const VOICE_STATES = {
  OFF: 'off',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export default function useDemoVoice({ demoToken, onDemoAction, onDialogueEnd, onUserSpoke } = {}) {
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
  }, []);

  const playAudio = useCallback((base64, turnId, onDone) => {
    if (turnIdRef.current !== turnId) return;
    try {
      stopAudio();
      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audioElRef.current = audio;
      audio.onended = () => {
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      };
      audio.onerror = () => {
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      };
      audio.play().catch(() => {
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      });
    } catch (e) {
      audioElRef.current = null;
      if (turnIdRef.current === turnId) onDone?.();
    }
  }, [stopAudio]);

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
      rec.lang = 'en-US';

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
          activeRef.current = false;
          setVoiceState(VOICE_STATES.OFF);
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
  }, [stopAudio, isMuted]);

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
    setTimeout(() => startListeningFnRef.current?.(), 150);
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
    onUserSpokeRef.current?.();

    try {
      const res = await fetch(voiceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: historyRef.current.slice(-4),
          demoToken,
          stepContext: stepContextRef.current,
        }),
      });

      if (turnIdRef.current !== turnId) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rawReply = data.response || data.text || '';
      const { cleanText: reply, actions } = parseDemoActions(rawReply);

      historyRef.current = [...historyRef.current, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10);
      setTranscript(reply);

      // Fire demo actions
      if (actions.length && onDemoActionRef.current) {
        actions.forEach(a => onDemoActionRef.current(a));
      }

      if (!activeRef.current || turnIdRef.current !== turnId) return;

      // Play audio from combined response (single round-trip) or fall back to TTS-only call
      if (reply) {
        setVoiceState(VOICE_STATES.SPEAKING);

        // Check if audio was included in the response (combined LLM+TTS)
        if (data.audio) {
          playAudio(data.audio, turnId, () => resumeListening());
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
            body: JSON.stringify({ ttsOnly: true, ttsText: reply }),
          });
          clearTimeout(ttsTimeout);
          if (turnIdRef.current !== turnId) return;
          if (audioRes.ok && activeRef.current) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              playAudio(audioData.audio, turnId, () => resumeListening());
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
  }, [demoToken, stopListening, stopAudio, playAudio, resumeListening, parseDemoActions, voiceUrl, headers]);

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

    try {
      const controller = new AbortController();
      const ttsTimeout = setTimeout(() => controller.abort(), 8000);
      const audioRes = await fetch(voiceUrl, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({ ttsOnly: true, ttsText: text }),
      });
      clearTimeout(ttsTimeout);

      if (turnIdRef.current !== turnId || !activeRef.current) return;

      if (audioRes.ok) {
        const audioData = await audioRes.json();
        if (audioData.audio) {
          playAudio(audioData.audio, turnId, handleDone);
          return;
        }
      }
    } catch (_) {}

    // TTS failed — resume quickly and still advance
    if (turnIdRef.current === turnId) {
      await new Promise(r => setTimeout(r, 1000));
      handleDone();
    }
  }, [voiceUrl, headers, stopListening, stopAudio, playAudio, resumeListening]);

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
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
      if (audioElRef.current) try { audioElRef.current.pause(); } catch (_) {}
    };
  }, []);

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
    setStepContext,
    toggleMute,
    submitText,
  };
}
