import React, { useState, useRef, useEffect } from 'react';
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { StudioNav } from '@/components/studio';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useUser } from '@/components/context/UserContext';
import {
  Mic,
  Sparkles,
  Users,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Volume2,
  Check,
  Loader2,
  FileText,
  Wand2,
  Radio,
  MessageSquare,
  Swords,
  BookOpen,
  ShoppingBag,
  User,
  UserCheck,
  GraduationCap,
  Headphones,
  AudioLines,
  SkipBack,
  SkipForward,
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PODCAST_STYLES = [
  { value: 'interview', label: 'Interview', icon: MessageSquare },
  { value: 'solo', label: 'Solo Monologue', icon: Mic },
  { value: 'panel', label: 'Panel Discussion', icon: Users },
  { value: 'debate', label: 'Debate', icon: Swords },
  { value: 'storytelling', label: 'Storytelling', icon: BookOpen },
  { value: 'product_review', label: 'Product Review', icon: ShoppingBag },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'educational', label: 'Educational' },
  { value: 'comedic', label: 'Comedic' },
  { value: 'inspirational', label: 'Inspirational' },
];

const DURATIONS = [
  { value: 1, label: '1 min' },
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
];

const VOICE_PRESETS = [
  { id: 'tara', name: 'Tara', gender: 'Female', color: 'rose' },
  { id: 'leah', name: 'Leah', gender: 'Female', color: 'violet' },
  { id: 'jess', name: 'Jess', gender: 'Female', color: 'amber' },
  { id: 'leo', name: 'Leo', gender: 'Male', color: 'blue' },
  { id: 'dan', name: 'Dan', gender: 'Male', color: 'emerald' },
  { id: 'mia', name: 'Mia', gender: 'Female', color: 'pink' },
  { id: 'zac', name: 'Zac', gender: 'Male', color: 'cyan' },
  { id: 'zoe', name: 'Zoe', gender: 'Female', color: 'orange' },
];

const SPEAKER_ROLES = [
  { value: 'host', label: 'Host' },
  { value: 'guest', label: 'Guest' },
  { value: 'expert', label: 'Expert' },
  { value: 'cohost', label: 'Co-host' },
];

const ROLE_ICONS = {
  host: Mic,
  guest: User,
  expert: GraduationCap,
  cohost: UserCheck,
};

const DEFAULT_SPEAKERS = [
  { id: '1', name: 'Alex', role: 'host', voiceId: 'leo' },
  { id: '2', name: 'Sarah', role: 'guest', voiceId: 'tara' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep, totalSteps = 3 }) {
  const labels = ['Topic & Script', 'Speakers & Voices', 'Generate & Preview'];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isActive ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 scale-110' : ''}
                  ${isCompleted ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
                  ${!isActive && !isCompleted ? 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40' : ''}
                `}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block transition-colors ${
                  isActive ? 'text-yellow-400' : isCompleted ? 'text-yellow-400' : 'text-zinc-500'
                }`}
              >
                {labels[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`w-8 sm:w-12 h-px transition-colors ${
                  isCompleted ? 'bg-yellow-500/40' : 'bg-zinc-700/40'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SelectDropdown({ label, value, onChange, options, icon: Icon }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-sm text-white appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all
            ${Icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3'}
          `}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 rotate-90 pointer-events-none" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DurationPicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Duration</label>
      <div className="flex gap-2 flex-wrap">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => onChange(d.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              value === d.value
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/10'
                : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/30 hover:border-zinc-600/50 hover:text-zinc-300'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function VoiceSelector({ selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {VOICE_PRESETS.map((v) => {
        const isSelected = selectedId === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-[11px] transition-all ${
              isSelected
                ? 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-300'
                : 'bg-zinc-800/30 border border-zinc-700/20 text-zinc-400 hover:border-zinc-600/40 hover:text-zinc-300'
            }`}
          >
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center">
                <Check className="w-2 h-2 text-black" />
              </div>
            )}
            <span className="font-medium">{v.name}</span>
            <span className="text-[10px] text-zinc-500">{v.gender}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SpeakerCard({ speaker, index, onUpdate, onRemove, canRemove }) {
  const RoleIcon = ROLE_ICONS[speaker.role] || User;
  const selectedVoice = VOICE_PRESETS.find((v) => v.id === speaker.voiceId);
  const [previewing, setPreviewing] = useState(false);

  const handlePreviewVoice = async () => {
    setPreviewing(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ttsOnly: true,
          ttsText: `Hi, I'm ${selectedVoice?.name || 'your speaker'}. This is how I sound when reading your podcast.`,
          voice: speaker.voiceId,
        }),
      });
      const data = await response.json();
      if (data.audio) {
        const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPreviewing(false);
        };
        audio.play();
      } else {
        toast.error('Voice preview unavailable');
        setPreviewing(false);
      }
    } catch (err) {
      console.error('[StudioPodcast] Voice preview error:', err);
      toast.error('Failed to preview voice');
      setPreviewing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 flex items-center justify-center">
            <RoleIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 font-medium">Speaker {index + 1}</span>
            <p className="text-sm font-semibold text-white">{speaker.name || 'Unnamed'}</p>
          </div>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Name & Role */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Name</label>
          <input
            type="text"
            value={speaker.name}
            onChange={(e) => onUpdate({ ...speaker, name: e.target.value })}
            placeholder="Speaker name"
            className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Role</label>
          <select
            value={speaker.role}
            onChange={(e) => onUpdate({ ...speaker, role: e.target.value })}
            className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all"
          >
            {SPEAKER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Voice */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Voice</label>
          <button
            onClick={handlePreviewVoice}
            disabled={previewing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800/60 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10 border border-zinc-700/30 hover:border-yellow-500/30 transition-all disabled:opacity-50"
          >
            {previewing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Playing...
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3" />
                Preview
              </>
            )}
          </button>
        </div>
        <VoiceSelector selectedId={speaker.voiceId} onSelect={(id) => onUpdate({ ...speaker, voiceId: id })} />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

function WaveformVisualizer({ isPlaying }) {
  const bars = 48;

  return (
    <div className="flex items-end justify-center gap-[2px] h-16 px-4">
      {Array.from({ length: bars }, (_, i) => {
        const baseHeight = 20 + Math.sin(i * 0.4) * 15 + Math.cos(i * 0.7) * 10;
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-yellow-500/60 to-yellow-400/90"
            animate={
              isPlaying
                ? {
                    height: [
                      `${baseHeight}%`,
                      `${Math.min(100, baseHeight + Math.random() * 50)}%`,
                      `${Math.max(10, baseHeight - Math.random() * 30)}%`,
                      `${baseHeight}%`,
                    ],
                  }
                : { height: `${baseHeight * 0.4}%` }
            }
            transition={
              isPlaying
                ? {
                    duration: 0.6 + Math.random() * 0.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.02,
                  }
                : { duration: 0.4 }
            }
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AudioPlayer({ audioUrl, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration * 60);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    });
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * totalDuration;
  };

  const skip = (seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(totalDuration, audioRef.current.currentTime + seconds));
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="space-y-4">
      <WaveformVisualizer isPlaying={isPlaying} />

      {/* Seek bar */}
      <div className="px-4">
        <div className="relative h-1.5 bg-zinc-800 rounded-full cursor-pointer group" onClick={handleSeek}>
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg shadow-yellow-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-zinc-500 font-mono">{formatTime(currentTime)}</span>
          <span className="text-[11px] text-zinc-500 font-mono">{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => skip(-15)}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black flex items-center justify-center shadow-lg shadow-yellow-500/30 transition-all hover:scale-105 active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button
          onClick={() => skip(15)}
          className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TranscriptView({ script }) {
  const speakerColors = {};
  const palette = [
    'text-yellow-400',
    'text-cyan-400',
    'text-violet-400',
    'text-emerald-400',
    'text-rose-400',
    'text-amber-400',
  ];
  let colorIdx = 0;

  const getColor = (name) => {
    if (!speakerColors[name]) {
      speakerColors[name] = palette[colorIdx % palette.length];
      colorIdx++;
    }
    return speakerColors[name];
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
      {script.map((line, i) => (
        <div key={i} className="flex gap-3">
          <span className={`text-xs font-bold whitespace-nowrap pt-0.5 min-w-[72px] ${getColor(line.speaker)}`}>
            {line.speaker}:
          </span>
          <p className="text-sm text-zinc-300 leading-relaxed">{line.text}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function GenerationProgress({ progress }) {
  const stages = [
    { label: 'Analyzing script', threshold: 15 },
    { label: 'Generating voices', threshold: 45 },
    { label: 'Mixing audio', threshold: 75 },
    { label: 'Finalizing', threshold: 95 },
  ];

  const currentStage = stages.findLast((s) => progress >= s.threshold) || stages[0];

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-400 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          <span className="text-sm text-zinc-300">{currentStage.label}...</span>
        </div>
        <span className="text-sm font-mono text-yellow-400">{Math.round(progress)}%</span>
      </div>

      {/* Stage dots */}
      <div className="flex items-center justify-between px-2">
        {stages.map((stage, i) => {
          const reached = progress >= stage.threshold;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  reached ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50' : 'bg-zinc-700'
                }`}
              />
              <span className={`text-[10px] ${reached ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function Step1TopicScript({
  topic,
  setTopic,
  style,
  setStyle,
  tone,
  setTone,
  duration,
  setDuration,
  script,
  setScript,
  generating,
  setGenerating,
  speakers,
}) {
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a podcast topic');
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          generateScript: true,
          topic,
          style,
          tone,
          duration,
          speakers: speakers.map(s => ({ name: s.name, role: s.role, voiceId: s.voiceId })),
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.script && data.script.length > 0) {
        setScript(data.script);
        toast.success('Script generated successfully');
      } else {
        throw new Error('No script returned');
      }
    } catch (err) {
      console.error('[StudioPodcast] Script generation error:', err);
      toast.error(err.message || 'Failed to generate script');
    } finally {
      setGenerating(false);
    }
  };

  const handleScriptEdit = (text) => {
    // Parse the edited text back into structured format
    const lines = text
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const match = line.match(/^(.+?):\s*(.+)$/);
        if (match) {
          return { speaker: match[1].trim(), text: match[2].trim() };
        }
        return { speaker: 'Narrator', text: line.trim() };
      });
    setScript(lines);
  };

  const scriptText = script.map((l) => `${l.speaker}: ${l.text}`).join('\n\n');

  return (
    <div className="space-y-6">
      {/* Topic */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Podcast Topic / Brief
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={4}
          placeholder="e.g. Discuss our new iPhone case line and why it's the best on the market. Cover durability, design philosophy, and customer testimonials..."
          className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all"
        />
      </div>

      {/* Style & Tone row */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SelectDropdown
          label="Podcast Style"
          value={style}
          onChange={setStyle}
          options={PODCAST_STYLES}
          icon={Radio}
        />
        <SelectDropdown label="Tone" value={tone} onChange={setTone} options={TONES} icon={Sparkles} />
      </div>

      {/* Duration */}
      <DurationPicker value={duration} onChange={setDuration} />

      {/* Generate Script */}
      <button
        onClick={handleGenerateScript}
        disabled={generating || !topic.trim()}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-yellow-500/20 active:scale-[0.98] disabled:hover:shadow-none"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Script...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Generate Script
          </>
        )}
      </button>

      {/* Script Editor */}
      <AnimatePresence>
        {script.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Generated Script
              </label>
              <span className="text-[11px] text-zinc-500">{script.length} segments</span>
            </div>
            <textarea
              value={scriptText}
              onChange={(e) => handleScriptEdit(e.target.value)}
              rows={Math.min(16, Math.max(8, script.length * 2))}
              className="w-full bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-4 py-3 text-sm text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/40 transition-all custom-scrollbar"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Step2SpeakersVoices({ speakers, setSpeakers }) {
  const addSpeaker = () => {
    if (speakers.length >= 4) {
      toast.error('Maximum 4 speakers allowed');
      return;
    }
    const newId = String(Date.now());
    const unusedVoices = VOICE_PRESETS.filter((v) => !speakers.some((s) => s.voiceId === v.id));
    const nextVoice = unusedVoices.length > 0 ? unusedVoices[0].id : VOICE_PRESETS[0].id;
    setSpeakers([
      ...speakers,
      { id: newId, name: '', role: 'guest', voiceId: nextVoice },
    ]);
  };

  const removeSpeaker = (id) => {
    if (speakers.length <= 1) return;
    setSpeakers(speakers.filter((s) => s.id !== id));
  };

  const updateSpeaker = (id, updated) => {
    setSpeakers(speakers.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Configure Speakers</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{speakers.length} of 4 speakers</p>
        </div>
        <button
          onClick={addSpeaker}
          disabled={speakers.length >= 4}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 hover:bg-yellow-500/25 hover:border-yellow-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Speaker
        </button>
      </div>

      {/* Speaker capacity indicator */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all ${
              n <= speakers.length ? 'bg-yellow-500/60' : 'bg-zinc-800/60'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        <div className="grid gap-4 sm:grid-cols-2">
          {speakers.map((speaker, i) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              index={i}
              onUpdate={(updated) => updateSpeaker(speaker.id, updated)}
              onRemove={() => removeSpeaker(speaker.id)}
              canRemove={speakers.length > 1}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Step3GeneratePreview({ topic, style, tone, duration, speakers, script, user }) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + (90 - prev) * 0.03;
      });
    }, 200);

    try {
      // Map script to include voiceId from speakers
      const scriptWithVoices = script.map(line => {
        const speaker = speakers.find(s => s.name === line.speaker);
        return {
          speaker: line.speaker,
          text: line.text,
          voiceId: speaker?.voiceId || 'tara',
        };
      });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-podcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          script: scriptWithVoices,
          topic,
          userId: user?.id,
          companyId: user?.company_id,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      clearInterval(progressInterval);
      setProgress(100);

      // Build audio blob from segments
      if (data.segments && data.segments.length > 0) {
        const audioChunks = data.segments.map(seg => {
          const bytes = Uint8Array.from(atob(seg.audio), c => c.charCodeAt(0));
          return bytes;
        });
        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        const blob = new Blob([combined], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
      } else if (data.audio_url) {
        setAudioUrl(data.audio_url);
      }

      setTimeout(() => {
        setGenerating(false);
        setGenerated(true);
        toast.success('Podcast generated successfully!');
      }, 500);
    } catch (err) {
      console.error('[StudioPodcast] Generation error:', err);
      clearInterval(progressInterval);
      setGenerating(false);
      setProgress(0);
      toast.error(err.message || 'Failed to generate podcast');
    }
  };

  const handleRegenerate = () => {
    if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    setGenerated(false);
    setAudioUrl(null);
    setAudioBlob(null);
    setProgress(0);
    handleGenerate();
  };

  const handleDownload = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcast-${topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } else if (audioUrl) {
      window.open(audioUrl, '_blank');
    }
  };

  const styleLabel = PODCAST_STYLES.find((s) => s.value === style)?.label || style;
  const toneLabel = TONES.find((t) => t.value === tone)?.label || tone;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-yellow-400" />
          Podcast Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Style</span>
            <p className="text-sm text-white font-medium mt-0.5">{styleLabel}</p>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Tone</span>
            <p className="text-sm text-white font-medium mt-0.5">{toneLabel}</p>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Duration</span>
            <p className="text-sm text-white font-medium mt-0.5">{duration} min</p>
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Speakers</span>
            <p className="text-sm text-white font-medium mt-0.5">{speakers.length}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-800/40">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Topic</span>
          <p className="text-sm text-zinc-300 mt-0.5 line-clamp-2">{topic}</p>
        </div>
        {/* Speaker chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {speakers.map((s) => {
            const voice = VOICE_PRESETS.find((v) => v.id === s.voiceId);
            return (
              <div
                key={s.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/30 text-xs"
              >
                <Headphones className="w-3 h-3 text-yellow-400" />
                <span className="text-zinc-300 font-medium">{s.name || 'Unnamed'}</span>
                <span className="text-zinc-500">as {s.role}</span>
                {voice && <span className="text-zinc-600">({voice.name})</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Generate / Progress / Result */}
      {!generating && !generated && (
        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-yellow-500/20 active:scale-[0.98]"
        >
          <Sparkles className="w-5 h-5" />
          Generate Podcast
          <CreditCostBadge credits={5} />
        </button>
      )}

      {generating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-6"
        >
          <GenerationProgress progress={progress} />
        </motion.div>
      )}

      {generated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* Player */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AudioLines className="w-4 h-4 text-yellow-400" />
                Your Podcast
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/60 text-zinc-300 hover:text-white border border-zinc-700/30 hover:border-zinc-600/50 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800/60 text-zinc-300 hover:text-yellow-400 border border-zinc-700/30 hover:border-yellow-500/30 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              </div>
            </div>
            <AudioPlayer audioUrl={audioUrl} duration={duration} />
          </div>

          {/* Transcript */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" />
              Transcript
            </h3>
            <TranscriptView script={script} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StudioPodcast() {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState('interview');
  const [tone, setTone] = useState('professional');
  const [duration, setDuration] = useState(5);
  const [script, setScript] = useState([]);
  const [generatingScript, setGeneratingScript] = useState(false);

  // Step 2 state
  const [speakers, setSpeakers] = useState(DEFAULT_SPEAKERS);

  const canProceedStep1 = topic.trim().length > 0 && script.length > 0;
  const canProceedStep2 = speakers.length >= 1 && speakers.every((s) => s.name.trim());

  const nextStep = () => {
    if (currentStep === 1 && !canProceedStep1) {
      toast.error('Generate a script first before continuing');
      return;
    }
    if (currentStep === 2 && !canProceedStep2) {
      toast.error('All speakers need a name');
      return;
    }
    setCurrentStep((s) => Math.min(3, s + 1));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(1, s - 1));

  const stepVariants = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Nav */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-6 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 lg:px-6 py-6 max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <Mic className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-300">AI Podcast Studio</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create Your Podcast</h1>
          <p className="text-sm text-zinc-500">
            Generate professional AI podcasts with multiple speakers and natural conversations.
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step Content */}
        <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-[20px] p-5 sm:p-6 mb-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <Step1TopicScript
                  topic={topic}
                  setTopic={setTopic}
                  style={style}
                  setStyle={setStyle}
                  tone={tone}
                  setTone={setTone}
                  duration={duration}
                  setDuration={setDuration}
                  script={script}
                  setScript={setScript}
                  generating={generatingScript}
                  setGenerating={setGeneratingScript}
                  speakers={speakers}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <Step2SpeakersVoices speakers={speakers} setSpeakers={setSpeakers} />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <Step3GeneratePreview
                  topic={topic}
                  style={style}
                  tone={tone}
                  duration={duration}
                  speakers={speakers}
                  script={script}
                  user={user}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/40 border border-zinc-700/30 hover:border-zinc-600/50 transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < 3 && (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full transition-all hover:shadow-lg hover:shadow-yellow-500/20 active:scale-[0.98]"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 3 && <div />}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(113, 113, 122, 0.3);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(113, 113, 122, 0.5);
        }
      `}</style>
    </div>
  );
}
