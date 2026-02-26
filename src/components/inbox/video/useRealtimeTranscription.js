/**
 * useRealtimeTranscription - Real-time audio transcription during calls.
 *
 * Captures audio from local + remote streams via MediaRecorder,
 * sends 10-second chunks to the transcribe-audio edge function (Groq Whisper),
 * accumulates a running transcript, and optionally runs live analysis.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const CHUNK_INTERVAL_MS = 10_000; // 10 seconds per chunk

export default function useRealtimeTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const mixedStreamRef = useRef(null);
  const intervalRef = useRef(null);
  const fullTranscriptRef = useRef('');
  const isListeningRef = useRef(false);
  const mimeTypeRef = useRef('audio/webm');

  /**
   * Mix local + remote audio streams into a single stream for recording.
   */
  const createMixedStream = useCallback((localStream, remoteStreams = []) => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const destination = ctx.createMediaStreamDestination();

    // Add local audio tracks
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const localSource = ctx.createMediaStreamSource(
          new MediaStream(audioTracks)
        );
        localSource.connect(destination);
      }
    }

    // Add remote audio tracks
    remoteStreams.forEach((stream) => {
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const remoteSource = ctx.createMediaStreamSource(
            new MediaStream(audioTracks)
          );
          remoteSource.connect(destination);
        }
      }
    });

    mixedStreamRef.current = destination.stream;
    return destination.stream;
  }, []);

  /**
   * Send accumulated audio chunk to the transcription API.
   */
  const sendChunk = useCallback(async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 1000) return; // Skip tiny chunks

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('mode', 'transcribe_and_analyze');
      formData.append('transcript_so_far', fullTranscriptRef.current);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('[transcription] API error:', errText);
        return;
      }

      const data = await response.json();

      if (data.text && data.text.trim()) {
        const newSegment = {
          id: Date.now(),
          text: data.text.trim(),
          timestamp: new Date().toISOString(),
          duration: data.duration || 0,
        };

        fullTranscriptRef.current += (fullTranscriptRef.current ? '\n' : '') + data.text.trim();

        setTranscript((prev) => [...prev, newSegment]);

        if (data.analysis) {
          setAnalysis(data.analysis);
        }
      }
    } catch (err) {
      console.error('[transcription] Failed to send chunk:', err);
    }
  }, []);

  /**
   * Start a fresh MediaRecorder that records for CHUNK_INTERVAL_MS then stops.
   * Stopping produces a complete WebM file with proper headers that Groq can parse.
   * After each stop, we send the blob and immediately start a new recorder.
   */
  const startRecorderCycle = useCallback(() => {
    const stream = mixedStreamRef.current;
    if (!stream || !isListeningRef.current) return;

    const recorder = new MediaRecorder(stream, {
      mimeType: mimeTypeRef.current,
      audioBitsPerSecond: 64000,
    });

    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      // Build a complete WebM blob from this recording cycle
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeTypeRef.current });
        sendChunk(blob);
      }
      // Start a new cycle if still listening
      if (isListeningRef.current) {
        startRecorderCycle();
      }
    };

    recorder.onerror = (e) => {
      console.error('[transcription] Recorder error:', e);
      // Try to restart
      if (isListeningRef.current) {
        setTimeout(startRecorderCycle, 1000);
      }
    };

    recorder.start();
    recorderRef.current = recorder;

    // Stop after CHUNK_INTERVAL_MS to produce a complete file
    intervalRef.current = setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, CHUNK_INTERVAL_MS);
  }, [sendChunk]);

  /**
   * Start recording and transcribing audio from the call.
   */
  const startListening = useCallback(
    (localStream, remoteStreams = []) => {
      if (isListeningRef.current) return;

      try {
        setError(null);
        setTranscript([]);
        setAnalysis(null);
        fullTranscriptRef.current = '';

        const mixedStream = createMixedStream(localStream, remoteStreams);

        // Check we have audio tracks
        if (mixedStream.getAudioTracks().length === 0) {
          setError('No audio tracks available');
          return;
        }

        mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        isListeningRef.current = true;
        setIsListening(true);

        // Start the first recording cycle
        startRecorderCycle();
      } catch (err) {
        console.error('[transcription] Failed to start:', err);
        setError(err.message || 'Failed to start transcription');
      }
    },
    [createMixedStream, startRecorderCycle]
  );

  /**
   * Stop recording and process any remaining audio.
   */
  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;

    // Mark as not listening first so onstop doesn't restart the cycle
    isListeningRef.current = false;

    // Clear the pending stop timeout
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop the recorder (onstop will send the final chunk)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    mixedStreamRef.current = null;
    setIsListening(false);
  }, []);

  /**
   * Get the full accumulated transcript as a single string.
   */
  const getFullTranscript = useCallback(() => {
    return fullTranscriptRef.current;
  }, []);

  /**
   * Clear the transcript and analysis state.
   */
  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setAnalysis(null);
    fullTranscriptRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    analysis,
    error,
    startListening,
    stopListening,
    getFullTranscript,
    clearTranscript,
  };
}
