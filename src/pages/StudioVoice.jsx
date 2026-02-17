import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudioNav } from '@/components/studio';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import {
  AudioLines,
  Search,
  Play,
  Square,
  Upload,
  X,
  FileAudio,
  Mic,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  Plus,
  User,
  Wand2,
  Volume2,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESET_VOICES = [
  { id: 'tara',  name: 'Tara',  gender: 'Female', color: '#f472b6', provider: 'together' },
  { id: 'leah',  name: 'Leah',  gender: 'Female', color: '#a78bfa', provider: 'together' },
  { id: 'jess',  name: 'Jess',  gender: 'Female', color: '#60a5fa', provider: 'together' },
  { id: 'leo',   name: 'Leo',   gender: 'Male',   color: '#34d399', provider: 'together' },
  { id: 'dan',   name: 'Dan',   gender: 'Male',   color: '#fbbf24', provider: 'together' },
  { id: 'mia',   name: 'Mia',   gender: 'Female', color: '#f87171', provider: 'together' },
  { id: 'zac',   name: 'Zac',   gender: 'Male',   color: '#2dd4bf', provider: 'together' },
  { id: 'zoe',   name: 'Zoe',   gender: 'Female', color: '#c084fc', provider: 'together' },
];

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/mp3'];
const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];
const MIN_DURATION_SECONDS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(0);
    });
    audio.src = URL.createObjectURL(file);
  });
}

// ---------------------------------------------------------------------------
// Animated Equalizer Component
// ---------------------------------------------------------------------------

function EqualizerBars({ playing, size = 'sm' }) {
  const barCount = 5;
  const heights = size === 'sm' ? [12, 18, 10, 16, 14] : [16, 24, 14, 20, 18];
  const barWidth = size === 'sm' ? 2 : 3;
  const gap = size === 'sm' ? 1.5 : 2;
  const totalWidth = barCount * barWidth + (barCount - 1) * gap;
  const maxH = Math.max(...heights);

  return (
    <div
      className="flex items-end"
      style={{ width: totalWidth, height: maxH, gap }}
    >
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-pink-400"
          style={{ width: barWidth }}
          animate={
            playing
              ? {
                  height: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3],
                }
              : { height: h * 0.25 }
          }
          transition={
            playing
              ? {
                  duration: 0.6 + i * 0.08,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice Card Component
// ---------------------------------------------------------------------------

function VoiceCard({ voice, isPlaying, onPlay, onStop, onUseInStudio, index }) {
  const isPreset = voice.type === 'preset';
  const isCustom = voice.type === 'custom';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-4 hover:border-zinc-700/60 transition-colors"
    >
      {/* Header: avatar + name + badge */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0"
          style={{ backgroundColor: voice.color || '#f472b6' }}
        >
          {voice.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{voice.name}</h3>
          <p className="text-xs text-zinc-500">{voice.gender || 'Custom'}</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase ${
            isPreset
              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
              : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
          }`}
        >
          {isPreset ? 'Preset' : 'Custom'}
        </span>
      </div>

      {/* Description (custom voices only) */}
      {isCustom && voice.description && (
        <p className="text-xs text-zinc-500 line-clamp-2">{voice.description}</p>
      )}

      {/* Player row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (isPlaying ? onStop() : onPlay(voice.id))}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isPlaying
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-zinc-700/40'
          }`}
        >
          {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
          {isPlaying && (
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: 'linear' }}
            />
          )}
        </div>

        {isPlaying && <EqualizerBars playing={true} size="sm" />}
      </div>

      {/* Use in Studio button */}
      <button
        onClick={() => onUseInStudio(voice)}
        className="w-full py-2 px-4 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
      >
        <ExternalLink className="w-3 h-3" />
        Use in Studio
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Uploaded File Card
// ---------------------------------------------------------------------------

function UploadedFileCard({ file, onRemove }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/40 rounded-xl px-4 py-3"
    >
      <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
        <FileAudio className="w-4 h-4 text-pink-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{file.file.name}</p>
        <p className="text-[10px] text-zinc-500">
          {formatFileSize(file.file.size)} &middot; {formatDuration(file.duration)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Duration Progress Bar
// ---------------------------------------------------------------------------

function DurationProgress({ current, required }) {
  const pct = Math.min((current / required) * 100, 100);
  const isMet = current >= required;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          Total audio: <span className="text-white font-medium">{formatDuration(current)}</span>
        </span>
        <span className={`text-xs font-medium ${isMet ? 'text-green-400' : 'text-zinc-500'}`}>
          {isMet ? (
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" /> Minimum met
            </span>
          ) : (
            `${formatDuration(required - current)} more needed`
          )}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isMet ? 'bg-green-500' : 'bg-pink-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Voice Clone Panel
// ---------------------------------------------------------------------------

function CreateVoiceClonePanel({ onCloneSuccess }) {
  const { user } = useUser();
  const [expanded, setExpanded] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState(0);
  const fileInputRef = useRef(null);

  const totalDuration = uploadedFiles.reduce((sum, f) => sum + (f.duration || 0), 0);
  const meetsMinimum = totalDuration >= MIN_DURATION_SECONDS;

  const handleFiles = useCallback(async (files) => {
    const validFiles = [];

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const isValidType = ACCEPTED_AUDIO_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);

      if (!isValidType) {
        toast.error(`Unsupported file: ${file.name}. Use MP3, WAV, or M4A.`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Max 50 MB per file.`);
        continue;
      }

      const duration = await getAudioDuration(file);
      validFiles.push({ file, duration, id: crypto.randomUUID() });
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      handleFiles(files);
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeFile = useCallback((id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleClone = useCallback(async () => {
    if (!voiceName.trim()) {
      toast.error('Please name your voice clone.');
      return;
    }
    if (!meetsMinimum) {
      toast.error('Upload at least 30 seconds of audio.');
      return;
    }

    setIsCloning(true);
    setCloneProgress(0);

    // Simulate processing stages
    const stages = [
      { pct: 15, label: 'Uploading audio samples...' },
      { pct: 40, label: 'Analyzing voice characteristics...' },
      { pct: 65, label: 'Training voice model...' },
      { pct: 85, label: 'Finalizing voice clone...' },
      { pct: 100, label: 'Done!' },
    ];

    for (const stage of stages) {
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
      setCloneProgress(stage.pct);
    }

    await new Promise((r) => setTimeout(r, 400));

    const newVoice = {
      id: crypto.randomUUID(),
      name: voiceName.trim(),
      description: description.trim(),
      gender: null,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 65%)`,
      type: 'custom',
      provider: 'clone',
      created_at: new Date().toISOString(),
      sample_count: uploadedFiles.length,
      total_duration: totalDuration,
    };

    // Persist to localStorage (Supabase table can be added later)
    try {
      const existing = JSON.parse(localStorage.getItem('cloned_voices') || '[]');
      existing.push(newVoice);
      localStorage.setItem('cloned_voices', JSON.stringify(existing));
    } catch {
      // Ignore localStorage errors
    }

    setIsCloning(false);
    setCloneProgress(0);
    setVoiceName('');
    setDescription('');
    setUploadedFiles([]);

    toast.success(`Voice "${newVoice.name}" saved locally! Custom voice cloning is in beta.`);
    onCloneSuccess(newVoice);
  }, [voiceName, description, uploadedFiles, meetsMinimum, totalDuration, onCloneSuccess]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/20 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Create Voice Clone</h2>
            <p className="text-xs text-zinc-500">Upload audio samples to clone any voice <span className="text-amber-400/80">(Beta)</span></p>
          </div>
        </div>
        <div className="p-2 rounded-lg text-zinc-500 group-hover:text-zinc-300 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-5 border-t border-zinc-800/40 pt-5">
              {/* Step 1: Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-400">
                    1
                  </span>
                  Name your voice
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g. My Voice, Sarah's Clone, Brand Narrator"
                  className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/20 transition-colors"
                />
              </div>

              {/* Step 2: Upload samples */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-400">
                    2
                  </span>
                  Upload voice samples
                </label>

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors ${
                    isDragging
                      ? 'border-pink-500/60 bg-pink-500/5'
                      : 'border-zinc-700/50 hover:border-pink-500/40 bg-zinc-800/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isDragging
                          ? 'bg-pink-500/20 border border-pink-500/30'
                          : 'bg-zinc-800/60 border border-zinc-700/40'
                      }`}
                    >
                      <Upload
                        className={`w-5 h-5 transition-colors ${isDragging ? 'text-pink-400' : 'text-zinc-500'}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-300 font-medium">
                        {isDragging ? 'Drop files here' : 'Drag & drop audio files'}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">MP3, WAV, or M4A &middot; Up to 50 MB per file</p>
                    </div>
                  </div>
                </div>

                {/* Uploaded files list */}
                <AnimatePresence>
                  {uploadedFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      {uploadedFiles.map((f) => (
                        <UploadedFileCard key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Duration progress */}
                {uploadedFiles.length > 0 && (
                  <DurationProgress current={totalDuration} required={MIN_DURATION_SECONDS} />
                )}
              </div>

              {/* Step 3: Description (optional) */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-400">
                    3
                  </span>
                  Description
                  <span className="text-zinc-600 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the voice characteristics, accent, tone..."
                  rows={3}
                  className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/20 transition-colors resize-none"
                />
              </div>

              {/* Clone button */}
              {isCloning ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                      <span className="text-sm text-zinc-300">
                        {cloneProgress < 15
                          ? 'Uploading audio samples...'
                          : cloneProgress < 40
                            ? 'Analyzing voice characteristics...'
                            : cloneProgress < 65
                              ? 'Training voice model...'
                              : cloneProgress < 85
                                ? 'Finalizing voice clone...'
                                : 'Almost there...'}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-pink-400">{cloneProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full"
                      animate={{ width: `${cloneProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleClone}
                  disabled={!voiceName.trim() || !meetsMinimum}
                  className="w-full py-3 px-6 rounded-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Clone Voice
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page: StudioVoice
// ---------------------------------------------------------------------------

export default function StudioVoice() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'preset' | 'custom'
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [clonedVoices, setClonedVoices] = useState([]);
  const playTimerRef = useRef(null);
  const audioRef = useRef(null);

  // Load cloned voices from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cloned_voices') || '[]');
      setClonedVoices(stored);
    } catch {
      setClonedVoices([]);
    }
  }, []);

  // Build full voice list
  const allVoices = [
    ...PRESET_VOICES.map((v) => ({ ...v, type: 'preset' })),
    ...clonedVoices.map((v) => ({ ...v, type: 'custom' })),
  ];

  // Filter and search
  const filteredVoices = allVoices.filter((voice) => {
    if (filterType === 'preset' && voice.type !== 'preset') return false;
    if (filterType === 'custom' && voice.type !== 'custom') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        voice.name.toLowerCase().includes(q) ||
        (voice.gender && voice.gender.toLowerCase().includes(q)) ||
        (voice.description && voice.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const presetCount = allVoices.filter((v) => v.type === 'preset').length;
  const customCount = allVoices.filter((v) => v.type === 'custom').length;

  // Play real TTS preview via sync-voice edge function
  const handlePlay = useCallback(async (voiceId) => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
    }
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingVoiceId(voiceId);

    try {
      const voice = allVoices.find(v => v.id === voiceId);
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ttsOnly: true,
          ttsText: `Hi there, I'm ${voice?.name || voiceId}. This is how I sound when I speak. Pretty natural, right?`,
          voice: voiceId,
        }),
      });

      const data = await response.json();
      if (data.audio) {
        const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlayingVoiceId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setPlayingVoiceId(null);
          audioRef.current = null;
        };
        audio.play();
      } else {
        toast.error('Voice preview unavailable');
        setPlayingVoiceId(null);
      }
    } catch (err) {
      console.error('[StudioVoice] Preview error:', err);
      toast.error('Failed to preview voice');
      setPlayingVoiceId(null);
    }
  }, [allVoices]);

  const handleStop = useCallback(() => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  }, []);

  const handleUseInStudio = useCallback(
    (voice) => {
      // Navigate to Podcast studio with voice context
      window.location.href = `/StudioPodcast?voice=${voice.id}&voiceName=${encodeURIComponent(voice.name)}`;
    },
    []
  );

  const handleCloneSuccess = useCallback((newVoice) => {
    setClonedVoices((prev) => [...prev, newVoice]);
    setFilterType('all');
  }, []);

  // Cleanup timer and audio on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sticky nav */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
              <AudioLines className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Voice Library</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {allVoices.length} voices available &middot; {presetCount} preset, {customCount} cloned
              </p>
            </div>
          </div>

          {/* Now Playing indicator */}
          <AnimatePresence>
            {playingVoiceId && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20"
              >
                <EqualizerBars playing={true} size="sm" />
                <span className="text-xs text-pink-300 font-medium">
                  Playing: {allVoices.find((v) => v.id === playingVoiceId)?.name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices by name, gender, or description..."
              className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/30 focus:ring-1 focus:ring-pink-500/20 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'preset', label: `Preset (${presetCount})` },
              { key: 'custom', label: `Custom (${customCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === tab.key
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Grid */}
        {filteredVoices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVoices.map((voice, i) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                index={i}
                isPlaying={playingVoiceId === voice.id}
                onPlay={handlePlay}
                onStop={handleStop}
                onUseInStudio={handleUseInStudio}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-700/40 flex items-center justify-center mb-4">
              <Volume2 className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 font-medium mb-1">No voices found</p>
            <p className="text-xs text-zinc-600">
              {searchQuery
                ? 'Try a different search term.'
                : filterType === 'custom'
                  ? 'Create your first voice clone below.'
                  : 'No voices available.'}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800/60" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/60">
            <Plus className="w-3 h-3 text-pink-400" />
            <span className="text-xs text-zinc-500 font-medium">Create New</span>
          </div>
          <div className="flex-1 h-px bg-zinc-800/60" />
        </div>

        {/* Create Voice Clone Panel */}
        <CreateVoiceClonePanel onCloneSuccess={handleCloneSuccess} />
      </div>
    </div>
  );
}
