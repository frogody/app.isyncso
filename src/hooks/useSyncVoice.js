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
  const abortRef = useRef(null);
  const audioElRef = useRef(null);
  const activeRef = useRef(false);
  const safetyTimerRef = useRef(null);
  const processingRef = useRef(false); // prevent double-processing

  // Store latest refs so callbacks never go stale
  const syncStateRef = useRef(syncState);
  const userRef = useRef(user);
  const historyRef = useRef(history);
  useEffect(() => { syncStateRef.current = syncState; }, [syncState]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { historyRef.current = history; }, [history]);

  const isActive = voiceState !== VOICE_STATES.OFF;

  // =========================================================================
  // Audio — simple Audio element (doesn't interfere with mic like AudioContext)
  // =========================================================================
  const playAudio = useCallback((base64, onDone) => {
    try {
      // Stop any existing audio
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.src = '';
        audioElRef.current = null;
      }

      const audio = new Audio(`data:audio/mp3;base64,${base64}`);
      audioElRef.current = audio;

      audio.onended = () => {
        console.log('[SyncVoice] Audio playback ended');
        audioElRef.current = null;
        onDone?.();
      };

      audio.onerror = (e) => {
        console.error('[SyncVoice] Audio play error:', e);
        audioElRef.current = null;
        onDone?.();
      };

      audio.play().catch((e) => {
        console.error('[SyncVoice] Audio play() rejected:', e);
        audioElRef.current = null;
        onDone?.();
      });
    } catch (e) {
      console.error('[SyncVoice] Audio error:', e);
      audioElRef.current = null;
      onDone?.();
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
      audioElRef.current = null;
    }
  }, []);

  // =========================================================================
  // Safety timer — force restart listening if stuck
  // =========================================================================
  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  // =========================================================================
  // Speech recognition
  // =========================================================================
  const startListeningFnRef = useRef(null);

  const startListening = useCallback(() => {
    if (!activeRef.current || !hasSpeechRecognition) return;
    if (processingRef.current) {
      console.log('[SyncVoice] Skipping startListening — still processing');
      return;
    }

    // Clean up existing
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false; // one utterance at a time — more reliable
      rec.interimResults = false; // only final results
      rec.lang = 'en-US';

      rec.onend = () => {
        recognitionRef.current = null;
        // Auto-restart if still active and not processing
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
        console.log('[SyncVoice] Heard:', transcript);
        if (transcript && transcript.trim().length >= 2 && !processingRef.current) {
          processingRef.current = true;
          processInput(transcript.trim());
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setVoiceState(VOICE_STATES.LISTENING);
      syncStateRef.current?.setMood?.('listening');
    } catch (e) {
      console.error('[SyncVoice] Failed to start recognition:', e);
      if (activeRef.current) {
        setTimeout(() => startListeningFnRef.current?.(), 1000);
      }
    }
  }, []);

  useEffect(() => { startListeningFnRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // =========================================================================
  // Resume listening — called after processing/speaking completes
  // =========================================================================
  const resumeListening = useCallback(() => {
    clearSafetyTimer();
    processingRef.current = false;
    if (!activeRef.current) return;
    console.log('[SyncVoice] Resuming listening');
    setVoiceState(VOICE_STATES.LISTENING);
    syncStateRef.current?.setMood?.('listening');
    // Small delay to let audio hardware settle after TTS playback
    setTimeout(() => startListeningFnRef.current?.(), 500);
  }, [clearSafetyTimer]);

  // =========================================================================
  // Process speech → LLM → TTS → auto-resume
  // =========================================================================
  const processInput = useCallback(async (text) => {
    if (!text || !activeRef.current) {
      processingRef.current = false;
      return;
    }

    console.log('[SyncVoice] Processing:', text);
    setVoiceState(VOICE_STATES.PROCESSING);
    syncStateRef.current?.setMood?.('thinking');
    stopListening();
    clearSafetyTimer();

    // Safety: force restart after 25s if stuck
    safetyTimerRef.current = setTimeout(() => {
      console.warn('[SyncVoice] Safety timeout — forcing restart');
      stopAudio();
      resumeListening();
    }, 25000);

    const controller = new AbortController();
    abortRef.current = controller;

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

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.response || data.text || '';
      console.log('[SyncVoice] Reply:', reply.substring(0, 80));

      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10));

      if (!activeRef.current) { clearSafetyTimer(); processingRef.current = false; return; }

      // Phase 2: TTS Audio
      if (reply) {
        setVoiceState(VOICE_STATES.SPEAKING);
        syncStateRef.current?.setMood?.('speaking');

        try {
          const ttsController = new AbortController();
          const ttsTimeout = setTimeout(() => ttsController.abort(), 10000);

          const audioRes = await fetch(voiceUrl, {
            method: 'POST',
            signal: ttsController.signal,
            headers,
            body: JSON.stringify({ ttsOnly: true, ttsText: reply }),
          });
          clearTimeout(ttsTimeout);

          if (audioRes.ok && activeRef.current) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              console.log('[SyncVoice] Playing TTS audio...');
              playAudio(audioData.audio, () => {
                console.log('[SyncVoice] Audio done → resuming mic');
                resumeListening();
              });
              return;
            }
          }
          console.log('[SyncVoice] No audio → resuming mic');
        } catch (audioErr) {
          console.warn('[SyncVoice] TTS error:', audioErr.name === 'AbortError' ? 'timeout' : audioErr.message);
        }
      }

      // No audio or TTS failed
      resumeListening();

    } catch (err) {
      if (err.name === 'AbortError') { clearSafetyTimer(); processingRef.current = false; return; }
      console.error('[SyncVoice] Error:', err);
      if (activeRef.current) {
        setTimeout(() => resumeListening(), 1000);
      }
    }
  }, [stopListening, playAudio, stopAudio, clearSafetyTimer, resumeListening]);

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
    startListeningFnRef.current?.();
  }, []);

  const deactivate = useCallback(() => {
    console.log('[SyncVoice] Deactivated');
    activeRef.current = false;
    processingRef.current = false;
    clearSafetyTimer();
    stopListening();
    stopAudio();
    if (abortRef.current) abortRef.current.abort();
    setVoiceState(VOICE_STATES.OFF);
    syncStateRef.current?.setMood?.('idle');
    setHistory([]);
  }, [stopListening, stopAudio, clearSafetyTimer]);

  const toggle = useCallback(() => {
    if (activeRef.current) deactivate();
    else activate();
  }, [activate, deactivate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
      if (abortRef.current) abortRef.current.abort();
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
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
  };
}
