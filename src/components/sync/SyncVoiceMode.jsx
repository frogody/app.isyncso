/**
 * SyncVoiceMode v6 — Hands-free continuous conversation
 *
 * Auto-listens on open. After SYNC responds, auto-resumes listening.
 * Pauses mic during audio playback to prevent echo/self-listening.
 * Mic button toggles pause/resume instead of start/stop.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, MessageSquare, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import SyncAvatarMini from '@/components/icons/SyncAvatarMini';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

const STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export default function SyncVoiceMode({ isOpen, onClose, onSwitchToChat }) {
  const { user } = useUser();
  const { syt } = useTheme();
  const syncState = useSyncState();

  const [state, setState] = useState(STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // user manually paused mic
  const [history, setHistory] = useState([]);
  const [latency, setLatency] = useState(null);

  const recognitionRef = useRef(null);
  const processRef = useRef(null);
  const abortRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const isPausedRef = useRef(isPaused);
  const micPermissionRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const isListening = state === STATES.LISTENING;
  const isSpeaking = state === STATES.SPEAKING;
  const isProcessing = state === STATES.PROCESSING;

  // =========================================================================
  // Audio context
  // =========================================================================
  useEffect(() => {
    if (isOpen && !audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [isOpen]);

  const playAudio = useCallback(async (base64, onDone) => {
    if (!audioCtxRef.current || isMuted || !base64) {
      onDone?.();
      return;
    }
    try {
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const buffer = await audioCtxRef.current.decodeAudioData(bytes.buffer.slice(0));
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtxRef.current.destination);
      audioSourceRef.current = source;
      source.onended = () => { audioSourceRef.current = null; onDone?.(); };
      source.start(0);
    } catch (e) {
      console.error('[Voice] Audio error:', e);
      audioSourceRef.current = null;
      onDone?.();
    }
  }, [isMuted]);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (_) {}
      audioSourceRef.current = null;
    }
  }, []);

  // =========================================================================
  // Start listening — called automatically after responses
  // =========================================================================
  const startListening = useCallback(() => {
    // Guard: don't start if closed, paused, or already listening/busy
    if (!isOpenRef.current || isPausedRef.current) return;

    // Stop any existing recognition
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
        // Auto-restart if we're still in listening state and not paused/closed
        if (isOpenRef.current && !isPausedRef.current) {
          setState(prev => {
            if (prev === STATES.LISTENING) {
              // Brief delay before restarting to avoid rapid fire
              setTimeout(() => startListening(), 300);
            }
            return prev;
          });
        }
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') {
          setError('Microphone blocked. Please allow access.');
          micPermissionRef.current = false;
        } else if (e.error === 'no-speech') {
          // Silently restart — no speech is normal in continuous mode
        } else if (e.error !== 'aborted') {
          console.warn('[Voice] Recognition error:', e.error);
        }
      };

      let silenceTimer = null;

      rec.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        setTranscript(interim || final);

        // Clear any pending silence timer
        if (silenceTimer) clearTimeout(silenceTimer);

        if (final && final.trim().length >= 2) {
          // User finished a sentence — process it
          processRef.current(final.trim());
        } else if (interim) {
          // User is still talking — set a silence timer
          silenceTimer = setTimeout(() => {
            // If we have interim text and no final after 2s, it might be stuck
            // Let the recognition handle it naturally
          }, 2000);
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setState(STATES.LISTENING);
      syncState.setMood('listening');
      setError(null);
      console.log('[Voice] Listening started');
    } catch (e) {
      console.error('[Voice] Failed to start recognition:', e);
      setError('Failed to start listening.');
    }
  }, [syncState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // =========================================================================
  // Process input — two-phase: text first, audio second
  // =========================================================================
  const processInput = useCallback(async (text) => {
    if (!text) return;

    console.log('[Voice] Processing:', text);
    setTranscript('');
    setState(STATES.PROCESSING);
    syncState.setMood('thinking');

    // Stop listening while processing + speaking (prevents echo)
    stopListening();

    const t0 = Date.now();
    const controller = new AbortController();
    abortRef.current = controller;

    const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    };

    try {
      // Phase 1: Get text (fast, 2-3s)
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
      const ms = Date.now() - t0;
      setLatency(ms);

      const reply = data.response || data.text || '';
      console.log(`[Voice] Text in ${ms}ms: "${reply.substring(0, 60)}"`);

      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10));
      setLastResponse(reply);

      // Phase 2: Fetch and play audio (mic stays OFF during playback)
      if (!isMuted && reply) {
        setState(STATES.SPEAKING);
        syncState.setMood('speaking');

        try {
          const audioRes = await fetch(voiceUrl, {
            method: 'POST',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ ttsOnly: true, ttsText: reply }),
          });

          if (audioRes.ok) {
            const audioData = await audioRes.json();
            if (audioData.audio) {
              // Play audio — when done, auto-resume listening
              playAudio(audioData.audio, () => {
                setState(STATES.IDLE);
                syncState.setMood('listening');
                // Auto-resume listening after audio finishes
                setTimeout(() => startListening(), 400);
              });
              return;
            }
          }
        } catch (audioErr) {
          if (audioErr.name !== 'AbortError') {
            console.warn('[Voice] Audio fetch failed:', audioErr.message);
          }
        }
      }

      // No audio played — go straight to listening
      setState(STATES.IDLE);
      syncState.setMood('listening');
      setTimeout(() => startListening(), 400);

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[Voice] Error:', err);
      setError('Something went wrong. Try again.');
      setState(STATES.IDLE);
      syncState.setMood('listening');
      // Resume listening even after error
      setTimeout(() => startListening(), 1000);
    }
  }, [history, playAudio, isMuted, syncState, user, stopListening, startListening]);

  useEffect(() => { processRef.current = processInput; }, [processInput]);

  // =========================================================================
  // Auto-start on open, request mic permission
  // =========================================================================
  useEffect(() => {
    if (!isOpen || !hasSpeechRecognition) return;

    // Request mic permission then auto-start
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        micPermissionRef.current = true;
        // Auto-start listening
        startListening();
      } catch (_) {
        setError('Please allow microphone access to use voice mode.');
        micPermissionRef.current = false;
      }
    })();

    return () => {
      stopListening();
      if (abortRef.current) abortRef.current.abort();
      stopAudio();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // Cleanup on close
  // =========================================================================
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (abortRef.current) abortRef.current.abort();
      stopAudio();
      setState(STATES.IDLE);
      setTranscript('');
      setLastResponse('');
      setError(null);
      setLatency(null);
      setHistory([]);
      setIsPaused(false);
    }
  }, [isOpen, stopAudio, stopListening]);

  // =========================================================================
  // Toggle pause/resume (mic button)
  // =========================================================================
  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume
      setIsPaused(false);
      setError(null);
      if (state === STATES.IDLE || state === STATES.LISTENING) {
        startListening();
      }
    } else {
      // Pause
      setIsPaused(true);
      stopListening();
      stopAudio();
      setState(STATES.IDLE);
      setTranscript('');
    }
  }, [isPaused, state, startListening, stopListening, stopAudio]);

  // =========================================================================
  // Interrupt: if user taps mic while SYNC is speaking, stop and listen
  // =========================================================================
  const handleMicTap = useCallback(() => {
    if (isSpeaking) {
      // Interrupt SYNC — stop audio, start listening
      stopAudio();
      setState(STATES.IDLE);
      setIsPaused(false);
      setTimeout(() => startListening(), 200);
      return;
    }
    if (isProcessing) return; // can't interrupt processing
    togglePause();
  }, [isSpeaking, isProcessing, stopAudio, togglePause, startListening]);

  // =========================================================================
  // No speech recognition fallback
  // =========================================================================
  if (!hasSpeechRecognition) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 ${syt('bg-white/80', 'bg-black/80')} backdrop-blur-sm flex items-center justify-center`}
          >
            <div className={`${syt('bg-white', 'bg-zinc-900')} border ${syt('border-slate-300', 'border-zinc-700')} rounded-2xl p-6 max-w-sm text-center`}>
              <p className={`${syt('text-slate-900', 'text-white')} mb-4`}>Voice mode requires Speech Recognition support.</p>
              <button onClick={onClose} className={`px-4 py-2 ${syt('bg-slate-100', 'bg-zinc-800')} ${syt('text-slate-900', 'text-white')} rounded-lg`}>Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // =========================================================================
  // Status text
  // =========================================================================
  const statusText = isListening
    ? (transcript ? '' : 'Listening...')
    : isProcessing ? 'Thinking...'
    : isSpeaking ? ''
    : isPaused ? 'Paused'
    : 'Starting...';

  const micActive = isListening && !isPaused;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 ${syt('bg-white/90', 'bg-black/90')} backdrop-blur-md flex flex-col items-center justify-center`}
        >
          {/* Top controls */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            {latency !== null && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                <Zap className="w-3 h-3 text-green-400" />
                <span className="text-green-400">{latency}ms</span>
              </div>
            )}
            <button onClick={onSwitchToChat} className={`p-3 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} transition-colors`} title="Switch to chat">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setIsMuted(m => !m); stopAudio(); }}
              className={cn("p-3 rounded-full transition-colors", isMuted ? "bg-red-500/20 text-red-400" : `${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')}`)}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className={`p-3 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} transition-colors`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Brand */}
          <div className="absolute top-6 left-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${syt('bg-slate-100/50', 'bg-zinc-800/30')} text-xs ${syt('text-slate-400', 'text-zinc-500')}`}>
              <span>SYNC</span>
              <span className="text-purple-400 font-medium">Voice</span>
            </div>
          </div>

          {/* Main */}
          <div className="flex flex-col items-center gap-8">
            <motion.div
              animate={{
                scale: isSpeaking ? [1, 1.08, 1]
                  : isProcessing ? [1, 1.02, 1]
                  : isListening ? [1, 1.03, 1]
                  : 1
              }}
              transition={{
                duration: isSpeaking ? 0.3 : isProcessing ? 0.8 : 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <SyncAvatarMini size={180} />
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className={`text-2xl font-semibold ${syt('text-slate-900', 'text-white')}`}>{statusText}</h2>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="min-h-[100px] max-w-lg text-center px-6">
              {transcript && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg text-cyan-300 italic">
                  &ldquo;{transcript}&rdquo;
                </motion.p>
              )}
              {lastResponse && !transcript && !isProcessing && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`text-lg ${syt('text-slate-600', 'text-zinc-300')}`}>
                  {lastResponse}
                </motion.p>
              )}
              {isProcessing && (
                <motion.div className="flex justify-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 bg-purple-500 rounded-full" animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Mic button: tap to pause/resume, or interrupt while speaking */}
            <motion.button
              onClick={handleMicTap}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                micActive ? "bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                  : isSpeaking ? "bg-orange-500/30 text-orange-300 hover:bg-orange-500/50"
                  : isProcessing ? "bg-purple-500/30 text-purple-300 cursor-not-allowed"
                  : isPaused ? `bg-red-500/20 text-red-400 ${syt('hover:bg-red-500/30', 'hover:bg-red-500/30')}`
                  : `${syt('bg-slate-100', 'bg-zinc-800')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:bg-slate-200', 'hover:bg-zinc-700')}`
              )}
              disabled={isProcessing}
            >
              {micActive ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
            </motion.button>

            <p className={`text-sm ${syt('text-slate-400', 'text-zinc-600')}`}>
              {micActive ? "Speak naturally — I'm listening"
                : isSpeaking ? "Tap to interrupt"
                : isProcessing ? "Thinking..."
                : isPaused ? "Tap to resume"
                : "Starting mic..."}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
