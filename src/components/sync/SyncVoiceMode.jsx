/**
 * SyncVoiceMode v3 — Fast voice conversation
 *
 * No acknowledgments, no server-side TTS.
 * Uses browser speechSynthesis for instant spoken output.
 * Edge function returns text only — no audio encoding/download.
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
const synth = window.speechSynthesis;

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
  const [history, setHistory] = useState([]);
  const [latency, setLatency] = useState(null);

  const recognitionRef = useRef(null);
  const processRef = useRef(null);
  const abortRef = useRef(null);

  const isListening = state === STATES.LISTENING;
  const isSpeaking = state === STATES.SPEAKING;
  const isProcessing = state === STATES.PROCESSING;
  const isBusy = isSpeaking || isProcessing;

  // Speak text using browser speech synthesis
  const speak = useCallback((text, onDone) => {
    if (isMuted || !text) {
      onDone?.();
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onend = () => onDone?.();
    utterance.onerror = () => onDone?.();
    synth.speak(utterance);
  }, [isMuted]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    synth.cancel();
  }, []);

  // Process user input — call edge function, speak result
  const processInput = useCallback(async (text) => {
    if (!text) return;

    console.log('[Voice] Processing:', text);
    setTranscript('');
    setState(STATES.PROCESSING);
    syncState.setMood('thinking');

    // Stop recognition while processing
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const t0 = Date.now();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: text,
            history: history.slice(-6),
            skipTTS: true,
          }),
        },
      );

      if (!res.ok) throw new Error(`${res.status}`);

      const data = await res.json();
      const ms = Date.now() - t0;
      setLatency(ms);

      const reply = data.response || data.text || '';
      console.log(`[Voice] Got reply in ${ms}ms: "${reply.substring(0, 60)}"`);

      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-10));
      setLastResponse(reply);

      // Speak it via browser TTS
      setState(STATES.SPEAKING);
      syncState.setMood('speaking');

      speak(reply, () => {
        setState(STATES.IDLE);
        syncState.setMood('listening');
      });

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[Voice] Error:', err);
      setError('Something went wrong. Try again.');
      setState(STATES.IDLE);
      syncState.setMood('listening');
    }
  }, [history, speak, syncState]);

  // Keep processRef current
  useEffect(() => { processRef.current = processInput; }, [processInput]);

  // Toggle mic
  const toggleMic = useCallback(async () => {
    if (state === STATES.LISTENING) {
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (_) {}
      setState(STATES.IDLE);
      setTranscript('');
      return;
    }

    if (state !== STATES.IDLE) return;
    setError(null);

    // Get mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      setError('Please allow microphone access.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onend = () => {
        setState(prev => prev === STATES.LISTENING ? STATES.IDLE : prev);
      };

      rec.onerror = (e) => {
        if (e.error === 'not-allowed') setError('Microphone blocked.');
        else if (e.error === 'no-speech') setError('No speech detected.');
        else if (e.error !== 'aborted') setError(`Error: ${e.error}`);
        setState(STATES.IDLE);
      };

      rec.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        setTranscript(interim || final);
        if (final && final.trim().length >= 2) {
          processRef.current(final.trim());
        }
      };

      recognitionRef.current = rec;
      rec.start();
      setState(STATES.LISTENING);
      syncState.setMood('listening');
    } catch (_) {
      setError('Failed to start. Try again.');
    }
  }, [state, syncState]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
      if (abortRef.current) abortRef.current.abort();
      stopSpeaking();
      setState(STATES.IDLE);
      setTranscript('');
      setLastResponse('');
      setError(null);
      setLatency(null);
      setHistory([]);
    }
  }, [isOpen, stopSpeaking]);

  // Set initial state
  useEffect(() => {
    if (isOpen) {
      setState(STATES.IDLE);
      syncState.setMood('listening');
    }
  }, [isOpen, syncState]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (_) {}
    };
  }, []);

  if (!hasSpeechRecognition) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 ${syt('bg-white/80', 'bg-black/80')} backdrop-blur-sm flex items-center justify-center`}
          >
            <div className={`${syt('bg-white', 'bg-zinc-900')} border ${syt('border-slate-300', 'border-zinc-700')} rounded-2xl p-6 max-w-sm text-center`}>
              <p className={`${syt('text-slate-900', 'text-white')} mb-4`}>Voice mode requires a browser with Speech Recognition support.</p>
              <button onClick={onClose} className={`px-4 py-2 ${syt('bg-slate-100', 'bg-zinc-800')} ${syt('text-slate-900', 'text-white')} rounded-lg`}>Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const statusText = isListening ? 'Listening...' : isProcessing ? 'Thinking...' : isSpeaking ? '' : 'Tap to speak';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
            <button
              onClick={onSwitchToChat}
              className={`p-3 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} transition-colors`}
              title="Switch to chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMuted(m => !m)}
              className={cn(
                "p-3 rounded-full transition-colors",
                isMuted ? "bg-red-500/20 text-red-400" : `${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')}`
              )}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className={`p-3 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Brand badge */}
          <div className="absolute top-6 left-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${syt('bg-slate-100/50', 'bg-zinc-800/30')} text-xs ${syt('text-slate-400', 'text-zinc-500')}`}>
              <span>SYNC</span>
              <span className="text-purple-400 font-medium">Voice</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col items-center gap-8">
            <motion.div
              animate={{
                scale: isSpeaking ? [1, 1.08, 1] : isProcessing ? [1, 1.02, 1] : isListening ? [1, 1.03, 1] : 1,
              }}
              transition={{
                duration: isSpeaking ? 0.3 : isProcessing ? 0.8 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <SyncAvatarMini size={180} />
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className={`text-2xl font-semibold ${syt('text-slate-900', 'text-white')}`}>
                {statusText}
              </h2>
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
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-purple-500 rounded-full"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            <motion.button
              onClick={toggleMic}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                isListening
                  ? "bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                  : isBusy
                  ? "bg-purple-500/30 text-purple-300 cursor-not-allowed"
                  : `${syt('bg-slate-100', 'bg-zinc-800')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:bg-slate-200', 'hover:bg-zinc-700')}`
              )}
              disabled={isBusy}
            >
              {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
            </motion.button>

            <p className={`text-sm ${syt('text-slate-400', 'text-zinc-600')}`}>
              {isListening ? "Speak naturally" : isBusy ? "SYNC is responding..." : "Tap the mic to start"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
