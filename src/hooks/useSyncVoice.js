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
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const activeRef = useRef(false);
  const processRef = useRef(null);

  const isActive = voiceState !== VOICE_STATES.OFF;

  // =========================================================================
  // Audio
  // =========================================================================
  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playAudio = useCallback(async (base64, onDone) => {
    if (!base64) { onDone?.(); return; }
    try {
      const ctx = ensureAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      audioSourceRef.current = source;
      source.onended = () => { audioSourceRef.current = null; onDone?.(); };
      source.start(0);
    } catch (e) {
      console.error('[SyncVoice] Audio error:', e);
      audioSourceRef.current = null;
      onDone?.();
    }
  }, [ensureAudioCtx]);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (_) {}
      audioSourceRef.current = null;
    }
  }, []);

  // =========================================================================
  // Speech recognition
  // =========================================================================
  const startListening = useCallback(() => {
    if (!activeRef.current || !hasSpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onend = () => {
        recognitionRef.current = null;
        if (activeRef.current) {
          // Auto-restart if still active and in listening state
          setTimeout(() => {
            if (activeRef.current) startListening();
          }, 300);
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          console.error('[SyncVoice] Mic blocked');
          deactivate();
        } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
          console.warn('[SyncVoice] Recognition error:', e.error);
        }
      };

      rec.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          }
        }
        if (final && final.trim().length >= 2) {
          processRef.current?.(final.trim());
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setVoiceState(VOICE_STATES.LISTENING);
      syncState.setMood('listening');
    } catch (e) {
      console.error('[SyncVoice] Failed to start:', e);
    }
  }, [syncState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // =========================================================================
  // Process speech → LLM → TTS → auto-resume
  // =========================================================================
  const processInput = useCallback(async (text) => {
    if (!text || !activeRef.current) return;

    console.log('[SyncVoice] Processing:', text);
    setVoiceState(VOICE_STATES.PROCESSING);
    syncState.setMood('thinking');
    stopListening();

    const controller = new AbortController();
    abortRef.current = controller;

    const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };

    try {
      // Phase 1: Text (fast)
      const res = await fetch(voiceUrl, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          message: text,
          history: history.slice(-6),
          userId: user?.id,
          companyId: user?.company_id,
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const reply = data.response || data.text || '';
      console.log('[SyncVoice] Reply:', reply.substring(0, 60));

      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10));

      if (!activeRef.current) return;

      // Phase 2: Audio
      if (reply) {
        setVoiceState(VOICE_STATES.SPEAKING);
        syncState.setMood('speaking');

        try {
          const audioRes = await fetch(voiceUrl, {
            method: 'POST',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ ttsOnly: true, ttsText: reply }),
          });

          if (audioRes.ok && activeRef.current) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              playAudio(audioData.audio, () => {
                if (activeRef.current) {
                  setVoiceState(VOICE_STATES.LISTENING);
                  syncState.setMood('listening');
                  setTimeout(() => startListening(), 400);
                }
              });
              return;
            }
          }
        } catch (audioErr) {
          if (audioErr.name !== 'AbortError') {
            console.warn('[SyncVoice] Audio failed:', audioErr.message);
          }
        }
      }

      // No audio — resume listening
      if (activeRef.current) {
        setVoiceState(VOICE_STATES.LISTENING);
        syncState.setMood('listening');
        setTimeout(() => startListening(), 400);
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[SyncVoice] Error:', err);
      if (activeRef.current) {
        setVoiceState(VOICE_STATES.LISTENING);
        syncState.setMood('listening');
        setTimeout(() => startListening(), 1000);
      }
    }
  }, [history, user, syncState, stopListening, startListening, playAudio]);

  useEffect(() => { processRef.current = processInput; }, [processInput]);

  // =========================================================================
  // Activate / deactivate
  // =========================================================================
  const activate = useCallback(async () => {
    if (!hasSpeechRecognition) return;

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      console.error('[SyncVoice] Mic permission denied');
      return;
    }

    activeRef.current = true;
    ensureAudioCtx();
    startListening();
  }, [startListening, ensureAudioCtx]);

  const deactivate = useCallback(() => {
    activeRef.current = false;
    stopListening();
    stopAudio();
    if (abortRef.current) abortRef.current.abort();
    setVoiceState(VOICE_STATES.OFF);
    syncState.setMood('idle');
    setHistory([]);
  }, [stopListening, stopAudio, syncState]);

  const toggle = useCallback(() => {
    if (activeRef.current) {
      deactivate();
    } else {
      activate();
    }
  }, [activate, deactivate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
      if (abortRef.current) abortRef.current.abort();
      if (audioSourceRef.current) try { audioSourceRef.current.stop(); } catch (_) {}
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
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
  };
}
