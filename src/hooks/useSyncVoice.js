/**
 * useSyncVoice — Headless voice conversation hook
 *
 * Handles speech recognition, LLM calls, TTS playback.
 * No UI — just state and controls. Used by the sidebar avatar.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSyncState } from '@/components/context/SyncStateContext';
import { useUser } from '@/components/context/UserContext';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hasSpeechRecognition = !!SpeechRecognition;

const VOICE_STATES = {
  OFF: 'off',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export default function useSyncVoice() {
  const { user } = useUser();
  const syncState = useSyncState();

  const [voiceState, setVoiceState] = useState(VOICE_STATES.OFF);
  const [history, setHistory] = useState([]);

  const recognitionRef = useRef(null);
  const audioElRef = useRef(null);
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const turnIdRef = useRef(0); // increments each turn — stale callbacks check this

  // Store latest refs so callbacks never go stale
  const syncStateRef = useRef(syncState);
  const userRef = useRef(user);
  const historyRef = useRef(history);
  useEffect(() => { syncStateRef.current = syncState; }, [syncState]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { historyRef.current = history; }, [history]);

  const isActive = voiceState !== VOICE_STATES.OFF;

  // =========================================================================
  // Audio — simple Audio element (no AudioContext mic interference)
  // =========================================================================
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
    // If turn changed (safety timer fired), don't play
    if (turnIdRef.current !== turnId) {
      console.log('[SyncVoice] Skipping audio — turn expired');
      return;
    }

    try {
      stopAudio(); // stop any previous

      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audioElRef.current = audio;

      audio.onended = () => {
        console.log('[SyncVoice] Audio ended');
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      };

      audio.onerror = () => {
        console.warn('[SyncVoice] Audio error');
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      };

      audio.play().catch(() => {
        audioElRef.current = null;
        if (turnIdRef.current === turnId) onDone?.();
      });
    } catch (e) {
      console.error('[SyncVoice] playAudio error:', e);
      audioElRef.current = null;
      if (turnIdRef.current === turnId) onDone?.();
    }
  }, [stopAudio]);

  // =========================================================================
  // Speech recognition
  // =========================================================================
  const startListeningFnRef = useRef(null);

  const startListening = useCallback(() => {
    if (!activeRef.current || !hasSpeechRecognition) return;
    if (processingRef.current) return;

    // ALWAYS stop audio before starting mic (prevents echo)
    stopAudio();

    // Clean up existing recognition
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
            if (activeRef.current && !processingRef.current) {
              startListeningFnRef.current?.();
            }
          }, 200);
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          console.error('[SyncVoice] Mic blocked');
          activeRef.current = false;
          setVoiceState(VOICE_STATES.OFF);
          syncStateRef.current?.setMood?.('idle');
        } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
          console.warn('[SyncVoice] Recognition error:', e.error);
        }
      };

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript && transcript.trim().length >= 2 && !processingRef.current) {
          console.log('[SyncVoice] Heard:', transcript.trim());
          processingRef.current = true;
          processInput(transcript.trim());
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setVoiceState(VOICE_STATES.LISTENING);
      syncStateRef.current?.setMood?.('listening');
    } catch (e) {
      console.error('[SyncVoice] Failed to start:', e);
      if (activeRef.current) {
        setTimeout(() => startListeningFnRef.current?.(), 1000);
      }
    }
  }, [stopAudio]);

  useEffect(() => { startListeningFnRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // =========================================================================
  // Resume listening — the single path back to mic after any turn
  // =========================================================================
  const resumeListening = useCallback(() => {
    processingRef.current = false;
    if (!activeRef.current) return;
    console.log('[SyncVoice] Resuming listening');
    setVoiceState(VOICE_STATES.LISTENING);
    syncStateRef.current?.setMood?.('listening');
    setTimeout(() => startListeningFnRef.current?.(), 500);
  }, []);

  // =========================================================================
  // Process speech → LLM → TTS → auto-resume
  // =========================================================================
  const processInput = useCallback(async (text) => {
    if (!text || !activeRef.current) {
      processingRef.current = false;
      return;
    }

    // New turn — any stale audio callbacks will see the old turnId and bail
    const turnId = ++turnIdRef.current;

    console.log('[SyncVoice] Processing:', text);
    setVoiceState(VOICE_STATES.PROCESSING);
    syncStateRef.current?.setMood?.('thinking');
    stopListening();
    stopAudio();

    const controller = new AbortController();

    const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };

    try {
      // Phase 1: Text (fast LLM)
      const res = await fetch(voiceUrl, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          message: text,
          history: historyRef.current.slice(-6),
          userId: userRef.current?.id,
          companyId: userRef.current?.company_id,
        }),
      });

      if (turnIdRef.current !== turnId) return; // turn expired
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.response || data.text || '';
      console.log('[SyncVoice] Reply:', reply.substring(0, 80));

      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10));

      if (!activeRef.current || turnIdRef.current !== turnId) return;

      // Phase 2: TTS Audio (10s hard timeout)
      if (reply) {
        setVoiceState(VOICE_STATES.SPEAKING);
        syncStateRef.current?.setMood?.('speaking');

        try {
          const ttsTimeout = setTimeout(() => controller.abort(), 10000);

          const audioRes = await fetch(voiceUrl, {
            method: 'POST',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ ttsOnly: true, ttsText: reply }),
          });
          clearTimeout(ttsTimeout);

          if (turnIdRef.current !== turnId) return; // turn expired

          if (audioRes.ok && activeRef.current) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              console.log('[SyncVoice] Playing TTS...');
              playAudio(audioData.audio, turnId, () => {
                resumeListening();
              });
              return;
            }
          }
        } catch (audioErr) {
          if (turnIdRef.current !== turnId) return;
          console.warn('[SyncVoice] TTS:', audioErr.name === 'AbortError' ? 'timeout' : audioErr.message);
        }
      }

      // No audio or TTS failed — resume immediately
      if (turnIdRef.current === turnId) resumeListening();

    } catch (err) {
      if (err.name === 'AbortError' || turnIdRef.current !== turnId) {
        processingRef.current = false;
        return;
      }
      console.error('[SyncVoice] Error:', err);
      if (activeRef.current) setTimeout(() => resumeListening(), 1000);
    }
  }, [stopListening, stopAudio, playAudio, resumeListening]);

  // =========================================================================
  // Activate / deactivate
  // =========================================================================
  const activate = useCallback(async () => {
    if (!hasSpeechRecognition) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      console.error('[SyncVoice] Mic permission denied');
      return;
    }

    console.log('[SyncVoice] Activated');
    activeRef.current = true;
    processingRef.current = false;
    turnIdRef.current = 0;
    startListeningFnRef.current?.();
  }, []);

  const deactivate = useCallback(() => {
    console.log('[SyncVoice] Deactivated');
    activeRef.current = false;
    processingRef.current = false;
    turnIdRef.current++; // expire any in-flight turn
    stopListening();
    stopAudio();
    setVoiceState(VOICE_STATES.OFF);
    syncStateRef.current?.setMood?.('idle');
    setHistory([]);
  }, [stopListening, stopAudio]);

  const toggle = useCallback(() => {
    if (activeRef.current) deactivate();
    else activate();
  }, [activate, deactivate]);

  // Activate and immediately speak a message (for knock/proactive notifications)
  const activateWithMessage = useCallback(async (text) => {
    if (!text) return;

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      console.error('[SyncVoice] Mic permission denied');
      return;
    }

    console.log('[SyncVoice] Activated with message:', text.substring(0, 60));
    activeRef.current = true;
    processingRef.current = true;
    const turnId = ++turnIdRef.current;

    setVoiceState(VOICE_STATES.SPEAKING);
    syncStateRef.current?.setMood?.('speaking');
    setHistory(prev => [...prev, { role: 'assistant', content: text }]);

    // Fetch TTS and play
    const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };

    try {
      const controller = new AbortController();
      const ttsTimeout = setTimeout(() => controller.abort(), 10000);

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
          playAudio(audioData.audio, turnId, () => {
            resumeListening();
          });
          return;
        }
      }
    } catch (e) {
      if (turnIdRef.current !== turnId) return;
      console.warn('[SyncVoice] TTS for message:', e.message);
    }

    // TTS failed — still start listening
    if (turnIdRef.current === turnId) resumeListening();
  }, [playAudio, resumeListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      turnIdRef.current++;
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
      if (audioElRef.current) {
        try { audioElRef.current.pause(); } catch (_) {}
        audioElRef.current = null;
      }
    };
  }, []);

  return {
    voiceState,
    isActive,
    isListening: voiceState === VOICE_STATES.LISTENING,
    isProcessing: voiceState === VOICE_STATES.PROCESSING,
    isSpeaking: voiceState === VOICE_STATES.SPEAKING,
    toggle,
    activate,
    deactivate,
    activateWithMessage,
  };
}
