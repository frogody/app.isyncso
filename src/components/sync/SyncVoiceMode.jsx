/**
 * SyncVoiceMode
 * Low-latency voice conversation interface with SYNC
 * Uses Web Speech API for recognition and synthesis
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import SyncAvatarMini from '@/components/icons/SyncAvatarMini';

// Check for speech recognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

// Generate unique session ID
const generateSessionId = () => `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

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
      // Auto-restart if still open and not processing
      if (isOpen && !isProcessing && !isSpeaking) {
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

      // Process final transcript
      if (finalTranscript.trim()) {
        processVoiceInput(finalTranscript.trim());
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

  // Process voice input and get response
  const processVoiceInput = useCallback(async (text) => {
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setTranscript('');
    syncState.setMood('thinking');

    // Stop listening while processing
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            message: text,
            sessionId,
            stream: false,
            context: {
              userId: user?.id,
              companyId: user?.company_id,
              source: 'voice-mode',
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const responseText = data.response || data.message || "Done!";

      setLastResponse(responseText);

      // Speak the response
      if (!isMuted) {
        speakResponse(responseText);
      } else {
        setIsProcessing(false);
        // Resume listening
        startListening();
      }

      // Update sync state
      if (data.delegatedTo) {
        syncState.setActiveAgent(data.delegatedTo);
        setTimeout(() => syncState.setActiveAgent(null), 2000);
      }
      if (data.actionExecuted) {
        syncState.triggerSuccess();
      }

    } catch (error) {
      console.error('Voice processing error:', error);
      setError('Failed to process. Try again.');
      setIsProcessing(false);
      startListening();
    }
  }, [isProcessing, sessionId, user, isMuted, syncState]);

  // Speak response using TTS
  const speakResponse = useCallback((text) => {
    if (!synthRef.current || isMuted) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for more natural feel
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Google') ||
      v.name.includes('Microsoft') ||
      v.lang.startsWith('en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      syncState.setMood('speaking');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsProcessing(false);
      syncState.setMood('listening');
      // Resume listening
      startListening();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsProcessing(false);
      startListening();
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [isMuted, syncState]);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Might already be running
      }
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (isSpeaking && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

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
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setTranscript('');
      setLastResponse('');
      setError(null);
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

          {/* Main content */}
          <div className="flex flex-col items-center gap-8">
            {/* Avatar - larger for voice mode */}
            <motion.div
              animate={{
                scale: isSpeaking ? [1, 1.05, 1] : isListening ? [1, 1.02, 1] : 1,
              }}
              transition={{
                duration: isSpeaking ? 0.5 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <SyncAvatarMini size={180} />
            </motion.div>

            {/* Status */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                {isProcessing ? 'Processing...' : isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Ready'}
              </h2>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>

            {/* Transcript / Response display */}
            <div className="min-h-[80px] max-w-lg text-center px-6">
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
                  <span>Thinking...</span>
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
