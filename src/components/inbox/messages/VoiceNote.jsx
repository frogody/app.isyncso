import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Mic, ChevronDown, ChevronUp } from 'lucide-react';

function generateWaveformBars(count = 40) {
  // Deterministic-looking random bars for visual consistency
  const bars = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 4;
    const height = 0.3 + Math.abs(Math.sin(angle)) * 0.5 + Math.abs(Math.cos(angle * 1.7)) * 0.2;
    bars.push(Math.min(1, height));
  }
  return bars;
}

export default function VoiceNote({ audioUrl, duration, transcript, senderName }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  const waveformBars = useMemo(() => generateWaveformBars(40), []);
  const PLAYBACK_RATES = [1, 1.5, 2];

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
      setIsLoaded(true);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else {
      audio.play();
      progressInterval.current = setInterval(() => {
        setCurrentTime(audio.currentTime);
      }, 50);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const handleWaveformClick = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * audioDuration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [audioDuration]);

  const formatTime = (seconds) => {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? currentTime / audioDuration : 0;

  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/50 p-3 max-w-xs">
      {/* Player row */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0 hover:bg-cyan-500/25 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-cyan-400" />
          ) : (
            <Play className="w-4 h-4 text-cyan-400 ml-0.5" />
          )}
        </button>

        {/* Waveform */}
        <div
          className="flex-1 flex items-center gap-px h-8 cursor-pointer"
          onClick={handleWaveformClick}
        >
          {waveformBars.map((height, i) => {
            const barProgress = i / waveformBars.length;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center"
              >
                <motion.div
                  className={`w-[2px] rounded-full transition-colors duration-150 ${
                    isActive ? 'bg-cyan-400' : 'bg-zinc-600'
                  }`}
                  style={{ height: `${height * 100}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.01, duration: 0.3 }}
                />
              </div>
            );
          })}
        </div>

        {/* Speed toggle */}
        <button
          onClick={cyclePlaybackRate}
          className="text-[10px] font-bold text-zinc-400 hover:text-cyan-400 bg-zinc-700/50 px-1.5 py-0.5 rounded transition-colors flex-shrink-0 min-w-[2rem] text-center"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Time + mic indicator */}
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Mic className="w-3 h-3 text-cyan-500/60" />
          <span className="text-[10px] text-zinc-500">
            {senderName && `${senderName} - `}Voice note
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </span>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mt-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            {showTranscript ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            Transcript
          </button>
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed bg-zinc-900/50 rounded-lg p-2 border border-zinc-700/30">
                  {transcript}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
