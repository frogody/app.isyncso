/**
 * SyncVoiceMode v2.0
 * Comprehensive voice conversation interface with SYNC
 *
 * Architecture:
 * - Pre-generated acknowledgments with same TTS voice (no jarring voice switches)
 * - Smart acknowledgment detection (only for searches/actions, not simple queries)
 * - Optimized latency with visual feedback
 * - Echo prevention with audio state tracking
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, MessageSquare, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncTheme } from '@/contexts/SyncThemeContext';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import SyncAvatarMini from '@/components/icons/SyncAvatarMini';
import {
  VOICE_ACKNOWLEDGMENTS,
  getRandomAcknowledgment,
  detectAcknowledgmentCategory,
} from '@/constants/voiceAcknowledgments';

// Check for speech recognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

// Generate unique session ID
const generateSessionId = () => `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Voice states for UI feedback
const VOICE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  ACKNOWLEDGING: 'acknowledging',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export default function SyncVoiceMode({ isOpen, onClose, onSwitchToChat }) {
  const { user } = useUser();
  const { syt } = useSyncTheme();
  const syncState = useSyncState();

  // Core state
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState(null);
  const [sessionId] = useState(generateSessionId);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [latency, setLatency] = useState(null);
  const [statusText, setStatusText] = useState('');

  // Refs
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const isAudioPlayingRef = useRef(false);
  const currentSourceRef = useRef(null);

  // Computed states for backward compatibility
  const isListening = voiceState === VOICE_STATES.LISTENING;
  const isSpeaking = voiceState === VOICE_STATES.SPEAKING || voiceState === VOICE_STATES.ACKNOWLEDGING;
  const isProcessing = voiceState === VOICE_STATES.PROCESSING || voiceState === VOICE_STATES.ACKNOWLEDGING;

  // Initialize audio context
  useEffect(() => {
    if (isOpen && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isOpen]);

  // Play audio from base64
  const playAudio = useCallback(async (audioBase64, onEnd) => {
    if (!audioContextRef.current || isMuted) {
      onEnd?.();
      return;
    }

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Decode base64 to ArrayBuffer
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer.slice(0));

      // Create and play source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      currentSourceRef.current = source;

      source.onended = () => {
        currentSourceRef.current = null;
        onEnd?.();
      };

      source.start(0);
    } catch (error) {
      console.error('[Voice] Audio playback error:', error);
      currentSourceRef.current = null;
      onEnd?.();
    }
  }, [isMuted]);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      currentSourceRef.current = null;
    }
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (isAudioPlayingRef.current) {
      console.log('[Voice] Skipping startListening - audio playing');
      return;
    }
    if (recognitionRef.current && voiceState !== VOICE_STATES.LISTENING) {
      try {
        recognitionRef.current.start();
        setVoiceState(VOICE_STATES.LISTENING);
        setStatusText('Listening...');
        syncState.setMood('listening');
      } catch (e) {
        // May already be running
      }
    }
  }, [voiceState, syncState]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // May already be stopped
      }
    }
  }, []);

  // Process voice input - the main flow
  const processVoiceInput = useCallback(async (text) => {
    if (!text) return;

    console.log('[Voice] Processing:', text);
    setTranscript('');
    stopListening();
    isAudioPlayingRef.current = true;

    const startTime = Date.now();

    // Determine if we need an acknowledgment
    const ackCategory = detectAcknowledgmentCategory(text);
    console.log('[Voice] Acknowledgment category:', ackCategory);

    // Play acknowledgment if needed (for searches/actions, not simple queries)
    if (ackCategory && !isMuted) {
      setVoiceState(VOICE_STATES.ACKNOWLEDGING);
      const ack = getRandomAcknowledgment(ackCategory);
      setStatusText(ack.text);
      syncState.setMood('speaking');

      await new Promise((resolve) => {
        playAudio(ack.audio, resolve);
      });
    }

    // Now process with SYNC
    setVoiceState(VOICE_STATES.PROCESSING);
    setStatusText('Thinking...');
    syncState.setMood('thinking');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: text,
            sessionId,
            conversationHistory,
            voice: 'tara',
            context: {
              userId: user?.id,
              companyId: user?.company_id,
              source: 'voice-mode',
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const totalLatency = Date.now() - startTime;
      setLatency(totalLatency);

      console.log(`[Voice] Response in ${totalLatency}ms`);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.text }
      ].slice(-10));

      setLastResponse(data.text);

      // Play the response
      if (!isMuted && data.audio) {
        setVoiceState(VOICE_STATES.SPEAKING);
        setStatusText('');
        syncState.setMood('speaking');

        await new Promise((resolve) => {
          playAudio(data.audio, resolve);
        });
      }

      // Done - resume listening after a short delay (echo prevention)
      setVoiceState(VOICE_STATES.IDLE);
      setStatusText('');

      setTimeout(() => {
        isAudioPlayingRef.current = false;
        if (isOpen) {
          startListening();
        }
      }, 400);

    } catch (error) {
      console.error('[Voice] Processing error:', error);
      setError('Something went wrong. Try again.');
      setVoiceState(VOICE_STATES.IDLE);
      setStatusText('');
      isAudioPlayingRef.current = false;
      startListening();
    }
  }, [
    sessionId, user, isMuted, syncState, conversationHistory,
    playAudio, stopListening, startListening, isOpen
  ]);

  // Initialize speech recognition
  useEffect(() => {
    if (!hasSpeechRecognition || !isOpen) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setError(null);
    };

    recognition.onend = () => {
      // Auto-restart if appropriate
      if (isOpen && !isAudioPlayingRef.current && voiceState === VOICE_STATES.LISTENING) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[Voice] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in browser settings.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Voice error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      // Ignore if audio is playing (echo prevention)
      if (isAudioPlayingRef.current) {
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += result;
        } else {
          interimTranscript += result;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      // Process final transcript
      const trimmed = finalTranscript.trim();
      if (trimmed && trimmed.length >= 2) {
        // Filter echo artifacts
        const echoPatterns = /^(okay|ok|um|uh|hmm|yeah|yes|no|the|a|an|i|is|it|on|in|one|let|got)$/i;
        if (!echoPatterns.test(trimmed)) {
          processVoiceInput(trimmed);
        } else {
          console.log('[Voice] Filtered echo:', trimmed);
        }
      }
    };

    recognitionRef.current = recognition;

    // Auto-start
    try {
      recognition.start();
      setVoiceState(VOICE_STATES.LISTENING);
      setStatusText('Listening...');
      syncState.setMood('listening');
    } catch (e) {
      console.error('[Voice] Failed to start:', e);
    }

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isOpen, processVoiceInput, syncState]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopAudio();
      setTranscript('');
      setLastResponse('');
      setError(null);
      setLatency(null);
      setStatusText('');
      setConversationHistory([]);
      setVoiceState(VOICE_STATES.IDLE);
      isAudioPlayingRef.current = false;
    }
  }, [isOpen, stopListening, stopAudio]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
      setVoiceState(VOICE_STATES.IDLE);
      setStatusText('');
    } else if (voiceState === VOICE_STATES.IDLE) {
      startListening();
    }
  }, [isListening, voiceState, startListening, stopListening]);

  // No speech recognition support
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
              <button onClick={onClose} className={`px-4 py-2 ${syt('bg-slate-100', 'bg-zinc-800')} ${syt('text-slate-900', 'text-white')} rounded-lg ${syt('hover:bg-slate-200', 'hover:bg-zinc-700')}`}>
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Get display status
  const getDisplayStatus = () => {
    if (statusText) return statusText;
    switch (voiceState) {
      case VOICE_STATES.LISTENING: return 'Listening...';
      case VOICE_STATES.ACKNOWLEDGING: return 'One moment...';
      case VOICE_STATES.PROCESSING: return 'Thinking...';
      case VOICE_STATES.SPEAKING: return '';
      default: return 'Tap to speak';
    }
  };

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
            {latency && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} text-xs`}>
                <Zap className="w-3 h-3 text-green-400" />
                <span className="text-green-400">{latency}ms</span>
              </div>
            )}
            <button
              onClick={onSwitchToChat}
              className={`p-3 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} ${syt('hover:bg-slate-100', 'hover:bg-zinc-700/50')} transition-colors`}
              title="Switch to chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={toggleMute}
              className={cn(
                "p-3 rounded-full transition-colors",
                isMuted
                  ? "bg-red-500/20 text-red-400"
                  : `${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} ${syt('hover:bg-slate-100', 'hover:bg-zinc-700/50')}`
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className={`p-3 rounded-full ${syt('bg-slate-50', 'bg-zinc-800/50')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} ${syt('hover:bg-slate-100', 'hover:bg-zinc-700/50')} transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Brand badge */}
          <div className="absolute top-6 left-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${syt('bg-slate-100/50', 'bg-zinc-800/30')} text-xs ${syt('text-slate-400', 'text-zinc-500')}`}>
              <span>Powered by</span>
              <span className="text-purple-400 font-medium">Together.ai</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col items-center gap-8">
            {/* Avatar with state-based animation */}
            <motion.div
              animate={{
                scale: isSpeaking
                  ? [1, 1.08, 1]
                  : isProcessing
                  ? [1, 1.02, 1]
                  : isListening
                  ? [1, 1.03, 1]
                  : 1,
              }}
              transition={{
                duration: isSpeaking ? 0.3 : isProcessing ? 0.8 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <SyncAvatarMini size={180} />
            </motion.div>

            {/* Status text */}
            <div className="text-center space-y-2">
              <h2 className={`text-2xl font-semibold ${syt('text-slate-900', 'text-white')}`}>
                {getDisplayStatus()}
              </h2>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            {/* Transcript / Response display */}
            <div className="min-h-[100px] max-w-lg text-center px-6">
              {transcript && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg text-cyan-300 italic"
                >
                  "{transcript}"
                </motion.p>
              )}
              {lastResponse && !transcript && voiceState !== VOICE_STATES.PROCESSING && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-lg ${syt('text-slate-600', 'text-zinc-300')}`}
                >
                  {lastResponse}
                </motion.p>
              )}
              {voiceState === VOICE_STATES.PROCESSING && (
                <motion.div
                  className="flex justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-purple-500 rounded-full"
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Mic button */}
            <motion.button
              onClick={toggleMic}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                isListening
                  ? "bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                  : isSpeaking || isProcessing
                  ? "bg-purple-500/30 text-purple-300 cursor-not-allowed"
                  : `${syt('bg-slate-100', 'bg-zinc-800')} ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:bg-slate-200', 'hover:bg-zinc-700')}`
              )}
              disabled={isSpeaking || isProcessing}
            >
              {isListening ? (
                <Mic className="w-8 h-8" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </motion.button>

            {/* Instruction */}
            <p className={`text-sm ${syt('text-slate-400', 'text-zinc-600')}`}>
              {isListening
                ? "Speak naturally"
                : isSpeaking || isProcessing
                ? "SYNC is responding..."
                : "Tap the mic to start"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
