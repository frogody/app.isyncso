import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, BarChart3, Shield, Puzzle, Activity,
  Rocket, Euro, GraduationCap, UserPlus, Palette, Package,
  TrendingUp, Contact, Mic, ArrowRight, SkipForward,
} from 'lucide-react';

// ─── SYNC Avatar ──────────────────────────────────────────────────────────────
const RING_SEGMENTS = [
  { color: '#ec4899', from: 0.02, to: 0.08 },
  { color: '#06b6d4', from: 0.12, to: 0.18 },
  { color: '#6366f1', from: 0.22, to: 0.28 },
  { color: '#10b981', from: 0.32, to: 0.38 },
  { color: '#86EFAC', from: 0.42, to: 0.48 },
  { color: '#f59e0b', from: 0.52, to: 0.58 },
  { color: '#f43f5e', from: 0.62, to: 0.68 },
  { color: '#f97316', from: 0.72, to: 0.78 },
  { color: '#3b82f6', from: 0.82, to: 0.88 },
  { color: '#14b8a6', from: 0.92, to: 0.98 },
];

function SyncAvatar({ size = 120, speaking = false }) {
  const r = size / 2;
  const segmentR = r - 4;
  const innerR = r * 0.52;

  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 0 1 ${p1.x} ${p1.y}`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient glow behind avatar */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)',
          transform: 'scale(1.8)',
        }}
        animate={{ opacity: speaking ? [0.3, 0.6, 0.3] : 0.3 }}
        transition={speaking ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ animation: 'introSpin 25s linear infinite' }}
      >
        <defs>
          <filter id="introGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={3} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#introGlow)">
          {RING_SEGMENTS.map((seg, i) => (
            <path
              key={i}
              d={arcPath(r, r, segmentR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={speaking ? 5 : 4}
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
        </g>
      </svg>
      <div
        className="absolute rounded-full"
        style={{
          top: size / 2 - innerR,
          left: size / 2 - innerR,
          width: innerR * 2,
          height: innerR * 2,
          background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold tracking-tight" style={{ fontSize: size * 0.18 }}>
          SYNC
        </span>
      </div>
    </div>
  );
}

// ─── Narration Script ─────────────────────────────────────────────────────────
// Each phase has narration text and a minimum display duration (ms).
// Voice narration is fired at phase start; phase advances when voice finishes
// OR when the minimum duration elapses (whichever is longer).
function buildNarrationScript(name, company) {
  const n = name || 'there';
  const c = company || 'your company';
  return [
    // Phase 0: Avatar appears, SYNC introduces itself
    {
      key: 'greeting',
      text: `Hey ${n}! I'm SYNC, your AI business orchestrator. Let me show you what iSyncSO can do for ${c}.`,
      minMs: 4000,
    },
    // Phase 1: Platform overview — engines light up
    {
      key: 'engines',
      text: `iSyncSO brings together 10 powerful engines: CRM, Finance, Growth, Talent, Learn, Create, Products, Raise, Sentinel, and Analytics. All connected. All powered by AI.`,
      minMs: 6000,
    },
    // Phase 2: SYNC orchestrator
    {
      key: 'orchestrator',
      text: `At the heart of everything is me — SYNC. I can execute 51 different actions across every module. Create invoices, enrich contacts, match candidates, generate images — just tell me what you need.`,
      minMs: 7000,
    },
    // Phase 3: Activity tracking
    {
      key: 'activity',
      text: `Every action your team takes is tracked in real time. I generate daily journals and activity summaries so you always know what's happening across your organization.`,
      minMs: 5500,
    },
    // Phase 4: Integrations + compliance
    {
      key: 'integrations',
      text: `Plus, we connect to over 30 tools you already use — Slack, HubSpot, Gmail, Stripe, and more. And with built-in EU AI Act compliance, you stay ahead of regulations automatically.`,
      minMs: 6000,
    },
    // Phase 5: Transition to demo
    {
      key: 'ready',
      text: `Ready? Let's dive in and explore what iSyncSO looks like for ${c}.`,
      minMs: 3000,
    },
  ];
}

// ─── Module Icons Data ────────────────────────────────────────────────────────
const MODULES = [
  { icon: Contact, label: 'CRM', color: '#06b6d4' },
  { icon: Euro, label: 'Finance', color: '#f59e0b' },
  { icon: Rocket, label: 'Growth', color: '#6366f1' },
  { icon: UserPlus, label: 'Talent', color: '#ef4444' },
  { icon: GraduationCap, label: 'Learn', color: '#14b8a6' },
  { icon: Palette, label: 'Create', color: '#eab308' },
  { icon: Package, label: 'Products', color: '#06b6d4' },
  { icon: TrendingUp, label: 'Raise', color: '#f97316' },
  { icon: Shield, label: 'Sentinel', color: '#86EFAC' },
  { icon: BarChart3, label: 'Analytics', color: '#3b82f6' },
];

// ─── Feature Cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain, title: 'SYNC AI Orchestrator',
    desc: '51 voice-controlled actions across every module.',
    gradient: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30', iconColor: 'text-purple-400',
    phase: 2,
  },
  {
    icon: Activity, title: 'Activity Tracking',
    desc: 'Real-time logs and AI-generated daily journals.',
    gradient: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', iconColor: 'text-emerald-400',
    phase: 3,
  },
  {
    icon: Puzzle, title: '30+ Integrations',
    desc: 'Slack, HubSpot, Gmail, Stripe, and more.',
    gradient: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', iconColor: 'text-amber-400',
    phase: 4,
  },
  {
    icon: Shield, title: 'EU AI Act Compliance',
    desc: 'Built-in AI governance and documentation.',
    gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', iconColor: 'text-green-400',
    phase: 4,
  },
];

// ─── TTS Helper (direct fetch to sync-voice-demo, browser fallback) ──────────
const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice-demo`;
const ttsHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

async function speakText(text, language, audioRef, onDone) {
  if (!text) { onDone?.(); return; }

  const cancel = () => {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {}
      audioRef.current = null;
    }
  };

  cancel();

  // Try server TTS first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(voiceUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: ttsHeaders,
      body: JSON.stringify({ ttsOnly: true, ttsText: text, language }),
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.audio) {
        return new Promise((resolve) => {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audioRef.current = audio;
          const done = () => { audioRef.current = null; resolve(); onDone?.(); };
          audio.onended = done;
          audio.onerror = done;
          audio.play().catch(done);
        });
      }
      if (data.ttsUnavailable) {
        return browserTTS(text, language, onDone);
      }
    }
  } catch (_) {}

  // Fallback: browser speechSynthesis
  return browserTTS(text, language, onDone);
}

function browserTTS(text, language, onDone) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      // No TTS at all — wait a reading duration
      const wait = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, wait);
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : 'en-US';
      utterance.rate = 1.0;
      const done = () => { resolve(); onDone?.(); };
      utterance.onend = done;
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      const wait = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, wait);
    }
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DemoIntroScreen({ recipientName, companyName, onStart, language = 'en' }) {
  const [phase, setPhase] = useState(-1); // -1 = not started, 0..5 = narration phases
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [skipping, setSkipping] = useState(false);
  const audioRef = useRef(null);
  const mountedRef = useRef(true);
  const phaseRef = useRef(-1);

  const script = useRef(buildNarrationScript(recipientName, companyName)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Start the cinematic sequence after a brief blackout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) setPhase(0);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Narration engine — advances through phases
  useEffect(() => {
    if (phase < 0 || phase >= script.length || skipping) return;
    phaseRef.current = phase;

    const step = script[phase];
    setTranscript(step.text);
    setSpeaking(true);

    let voiceDone = false;
    let timerDone = false;
    let advanced = false;

    const tryAdvance = () => {
      if (advanced || !mountedRef.current) return;
      if (voiceDone && timerDone) {
        advanced = true;
        setSpeaking(false);
        // Brief pause between phases
        setTimeout(() => {
          if (!mountedRef.current) return;
          const next = phaseRef.current + 1;
          if (next < script.length) {
            setPhase(next);
          } else {
            // Narration complete — auto-start demo after a beat
            setTimeout(() => { if (mountedRef.current) onStart(); }, 800);
          }
        }, 400);
      }
    };

    // Speak the narration
    speakText(step.text, language, audioRef, () => {
      voiceDone = true;
      tryAdvance();
    });

    // Minimum display timer
    const minTimer = setTimeout(() => {
      timerDone = true;
      tryAdvance();
    }, step.minMs);

    return () => {
      clearTimeout(minTimer);
      // Cancel audio on phase change
      try { window.speechSynthesis?.cancel(); } catch (_) {}
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {}
        audioRef.current = null;
      }
    };
  }, [phase, skipping]);

  // Skip handler — cancels narration and jumps straight to demo
  const handleSkip = useCallback(() => {
    setSkipping(true);
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {}
      audioRef.current = null;
    }
    setSpeaking(false);
    onStart();
  }, [onStart]);

  const showModules = phase >= 1;
  const showFeatureCards = phase >= 2;
  const isReady = phase >= 5;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 overflow-hidden relative select-none">
      {/* ─── Background Effects ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)' }}
          animate={{ scale: speaking ? [1, 1.15, 1] : 1 }}
          transition={speaking ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)' }}
          animate={{ scale: phase >= 1 ? [1, 1.1, 1] : 0.8, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)' }}
          animate={{ scale: phase >= 2 ? [1, 1.1, 1] : 0.8, opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ─── Content ─── */}
      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center">

        {/* ─── SYNC Avatar ─── */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0, 0.7, 0.2, 1] }}
              className="mb-4"
            >
              <SyncAvatar size={110} speaking={speaking} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Transcript / Narration text ─── */}
        <AnimatePresence mode="wait">
          {phase >= 0 && transcript && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-6 max-w-2xl mx-auto px-4"
            >
              {phase === 0 && recipientName && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-zinc-500 text-xs mb-3 tracking-widest uppercase"
                >
                  Welcome, {recipientName}
                </motion.p>
              )}
              <p className="text-white/90 text-base sm:text-lg md:text-xl leading-relaxed font-light">
                {transcript}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking indicator ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-[3px] mb-6"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-cyan-400"
                  animate={{ height: [6, 18, 6] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Module Icons ─── */}
        <AnimatePresence>
          {showModules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center gap-3 sm:gap-4 mb-6 flex-wrap px-2"
            >
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.5, ease: [0, 0.8, 0.2, 1] }}
                    className="flex flex-col items-center gap-1"
                  >
                    <motion.div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border border-white/10 bg-white/[0.03] backdrop-blur-sm"
                      animate={phase === 1 ? {
                        boxShadow: [`0 0 0px ${mod.color}00`, `0 0 20px ${mod.color}40`, `0 0 0px ${mod.color}00`],
                      } : {}}
                      transition={phase === 1 ? { duration: 2, repeat: Infinity, delay: i * 0.2 } : {}}
                    >
                      <Icon className="w-5 h-5" style={{ color: mod.color }} />
                    </motion.div>
                    <span className="text-[10px] text-zinc-500 font-medium">{mod.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Feature Cards ─── */}
        <AnimatePresence>
          {showFeatureCards && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6 px-2"
            >
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                const isActive = phase >= feat.phase;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{
                      opacity: isActive ? 1 : 0.3,
                      y: 0,
                      scale: isActive ? 1 : 0.97,
                    }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className={`relative rounded-2xl border p-3 sm:p-4 transition-all duration-700 overflow-hidden ${
                      isActive
                        ? `${feat.border} bg-gradient-to-br ${feat.gradient}`
                        : 'border-white/5 bg-white/[0.01]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                      isActive ? 'bg-white/10' : 'bg-white/[0.03]'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? feat.iconColor : 'text-zinc-600'}`} />
                    </div>
                    <h3 className={`text-xs sm:text-sm font-semibold mb-0.5 transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-zinc-600'
                    }`}>
                      {feat.title}
                    </h3>
                    <p className={`text-[10px] sm:text-xs leading-relaxed transition-colors duration-500 ${
                      isActive ? 'text-zinc-300' : 'text-zinc-700'
                    }`}>
                      {feat.desc}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Stats Counter ─── */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center gap-8 sm:gap-12 mb-6"
            >
              {[
                { value: '51', label: 'AI Actions', delay: 0 },
                { value: '10', label: 'Engines', delay: 0.1 },
                { value: '30+', label: 'Integrations', delay: 0.2 },
                { value: '11', label: 'Languages', delay: 0.3 },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stat.delay, duration: 0.4 }}
                  className="text-center"
                >
                  <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Progress indicator ─── */}
        {phase >= 0 && phase < script.length && (
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {script.map((_, i) => (
              <motion.div
                key={i}
                className="h-1 rounded-full"
                animate={{
                  width: i === phase ? 24 : 6,
                  backgroundColor: i <= phase ? 'rgba(6,182,212,0.8)' : 'rgba(63,63,70,0.5)',
                }}
                transition={{ duration: 0.4 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Skip Button ─── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 0 ? 1 : 0 }}
        transition={{ delay: 2, duration: 0.5 }}
        onClick={handleSkip}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm backdrop-blur-sm"
      >
        <SkipForward className="w-4 h-4" />
        Skip Intro
      </motion.button>

      {/* ─── Keyframes ─── */}
      <style>{`
        @keyframes introSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
