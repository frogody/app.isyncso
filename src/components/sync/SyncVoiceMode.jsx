/**
 * SyncVoiceMode
 * Low-latency voice conversation interface with SYNC
 * Uses Web Speech API for recognition + Cartesia Sonic for ultra-fast TTS (90ms)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import SyncAvatarMini from '@/components/icons/SyncAvatarMini';

// Check for speech recognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

// Generate unique session ID
const generateSessionId = () => `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Available voices for Together.ai TTS (Orpheus model)
const VOICES = ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'];

export default function SyncVoiceMode({ isOpen, onClose, onSwitchToChat }) {
  const { user } = useUser();
  const syncState = useSyncState();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState(null);
  const [sessionId] = useState(generateSessionId);
  const [isMuted, setIsMuted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [latency, setLatency] = useState(null);
  const [selectedVoice] = useState('tara'); // Female, friendly voice

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const isAudioPlayingRef = useRef(false); // Track if audio is currently playing (for echo prevention)

  // Initialize audio context for playback
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

  // Initialize speech recognition
  useEffect(() => {
    if (!hasSpeechRecognition || !isOpen) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      syncState.setMood('listening');
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still open and not processing/speaking/playing audio
      // IMPORTANT: Check isAudioPlayingRef to prevent echo feedback loop
      if (isOpen && !isProcessing && !isSpeaking && !isAudioPlayingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore - might already be started
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in your browser settings.');
      } else if (event.error !== 'no-speech') {
        setError(`Voice error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      // ECHO PREVENTION: Ignore results if audio is playing
      if (isAudioPlayingRef.current) {
        console.log('[Voice] Ignoring speech result - audio is playing (likely echo)');
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      // Process final transcript (with minimum length to filter echo artifacts)
      const trimmedTranscript = finalTranscript.trim();
      if (trimmedTranscript && trimmedTranscript.length >= 2) {
        // Filter out common echo artifacts (single words that sound like agent responses)
        const echoPatterns = /^(okay|ok|um|uh|hmm|yeah|yes|no|the|a|an|i|is|it|on|in)$/i;
        if (!echoPatterns.test(trimmedTranscript)) {
          processVoiceInput(trimmedTranscript);
        } else {
          console.log('[Voice] Filtered potential echo artifact:', trimmedTranscript);
        }
      }
    };

    recognitionRef.current = recognition;

    // Auto-start listening
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isOpen]);

  // Play audio from base64 using Web Audio API
  const playAudio = useCallback(async (audioBase64, format = 'mp3') => {
    if (!audioContextRef.current || isMuted) return;

    try {
      // Stop listening BEFORE playing audio to prevent echo
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      isAudioPlayingRef.current = true;

      // Resume audio context if suspended (browser autoplay policy)
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
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);

      // Create and play source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsSpeaking(false);
        setIsProcessing(false);
        syncState.setMood('listening');

        // CRITICAL: Wait before resuming listening to prevent echo feedback
        // This delay allows any reverb/echo to die down before mic activates
        setTimeout(() => {
          isAudioPlayingRef.current = false;
          startListening();
        }, 500); // 500ms delay to prevent picking up echo
      };

      setIsSpeaking(true);
      syncState.setMood('speaking');
      source.start(0);

    } catch (error) {
      console.error('Audio playback error:', error);
      isAudioPlayingRef.current = false;
      setIsSpeaking(false);
      setIsProcessing(false);
      startListening();
    }
  }, [isMuted, syncState]);

  // Process voice input with Cartesia Sonic TTS
  const processVoiceInput = useCallback(async (text) => {
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setTranscript('');
    syncState.setMood('thinking');

    // Stop listening while processing
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const startTime = Date.now();

    try {
      // Call sync-voice endpoint (LLM + Cartesia Sonic TTS)
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
            voice: selectedVoice,
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

      console.log(`[Voice] Response in ${totalLatency}ms:`, data.timing);

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.text }
      ].slice(-10)); // Keep last 5 exchanges

      setLastResponse(data.text);

      // Play the Cartesia Sonic audio
      if (!isMuted && data.audio) {
        await playAudio(data.audio, data.audioFormat);
      } else {
        setIsProcessing(false);
        startListening();
      }

    } catch (error) {
      console.error('Voice processing error:', error);
      setError('Failed to process. Try again.');
      setIsProcessing(false);
      startListening();
    }
  }, [isProcessing, sessionId, user, isMuted, syncState, conversationHistory, selectedVoice, playAudio]);

  // Start listening
  const startListening = useCallback(() => {
    // Don't start if audio is playing (echo prevention)
    if (isAudioPlayingRef.current) {
      console.log('[Voice] Skipping startListening - audio still playing');
      return;
    }
    if (recognitionRef.current && !isListening && !isSpeaking) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Might already be running
      }
    }
  }, [isListening, isSpeaking]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Manual mic toggle
  const toggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setLastResponse('');
      setError(null);
      setLatency(null);
      setConversationHistory([]);
    }
  }, [isOpen, stopListening]);

  if (!hasSpeechRecognition) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm text-center">
              <p className="text-white mb-4">Voice mode requires a browser with Speech Recognition support.</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center"
        >
          {/* Close and controls */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            {/* Latency indicator */}
            {latency && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800/50 text-xs">
                <Zap className="w-3 h-3 text-green-400" />
                <span className="text-green-400">{latency}ms</span>
              </div>
            )}
            <button
              onClick={onSwitchToChat}
              className="p-3 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
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
                  : "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50"
              )}
              title={isMuted ? "Unmute responses" : "Mute responses"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Powered by badge */}
          <div className="absolute top-6 left-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/30 text-xs text-zinc-500">
              <span>Powered by</span>
              <span className="text-purple-400 font-medium">Together.ai</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col items-center gap-8">
            {/* Avatar - larger for voice mode */}
            <motion.div
              animate={{
                scale: isSpeaking ? [1, 1.08, 1] : isListening ? [1, 1.03, 1] : 1,
              }}
              transition={{
                duration: isSpeaking ? 0.3 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <SyncAvatarMini size={180} />
            </motion.div>

            {/* Status */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                {isProcessing ? 'Thinking...' : isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Ready'}
              </h2>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
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
              {lastResponse && !transcript && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg text-zinc-300"
                >
                  {lastResponse}
                </motion.p>
              )}
              {isProcessing && !transcript && (
                <div className="flex items-center justify-center gap-2 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing with AI...</span>
                </div>
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
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              {isListening ? (
                <Mic className="w-8 h-8" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </motion.button>

            {/* Instructions */}
            <p className="text-sm text-zinc-600">
              {isListening ? "Speak naturally • SYNC is listening" : "Click mic to start"}
            </p>

            {/* Voice quality indicator */}
            <div className="flex items-center gap-4 text-xs text-zinc-600">
              <span>Ultra-low latency TTS</span>
              <span>•</span>
              <span>Natural voice synthesis</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
