import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import anime from '@/lib/anime-wrapper';
import {
  Brain, Zap, BarChart3, Shield, Puzzle, Activity,
  Rocket, Euro, GraduationCap, UserPlus, Palette, Package,
  TrendingUp, Contact, SkipForward, Sparkles,
} from 'lucide-react';

// ─── AGENT SEGMENTS — identical to SyncAvatarMini ───────────────────────────
const AGENT_SEGMENTS = [
  { id: 'orchestrator', color: '#ec4899', from: 0.02, to: 0.08 },
  { id: 'learn',        color: '#06b6d4', from: 0.12, to: 0.18 },
  { id: 'growth',       color: '#6366f1', from: 0.22, to: 0.28 },
  { id: 'products',     color: '#10b981', from: 0.32, to: 0.38 },
  { id: 'sentinel',     color: '#86EFAC', from: 0.42, to: 0.48 },
  { id: 'finance',      color: '#f59e0b', from: 0.52, to: 0.58 },
  { id: 'create',       color: '#f43f5e', from: 0.62, to: 0.68 },
  { id: 'tasks',        color: '#f97316', from: 0.72, to: 0.78 },
  { id: 'research',     color: '#3b82f6', from: 0.82, to: 0.88 },
  { id: 'inbox',        color: '#14b8a6', from: 0.92, to: 0.98 },
];

// ─── Standalone animated SYNC avatar (no context dependency) ────────────────
function IntroSyncAvatar({ size = 160, mood = 'idle', level = 0.18 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const segmentsRef = useRef(null);
  const glowRef = useRef(null);
  const stateRef = useRef({ particles: [], time: 0, currentLevel: 0.18 });

  const r = size / 2;
  const segmentR = r - 3;
  const innerR = r * 0.58;

  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  // Animate segments
  useEffect(() => {
    if (!segmentsRef.current) return;
    const paths = segmentsRef.current.querySelectorAll('path');
    anime.remove(paths);

    const configs = {
      speaking: { strokeWidth: [3.5, 6, 3.5], opacity: [0.85, 1, 0.85], duration: 400 },
      thinking: { strokeWidth: [3.5, 5, 3.5], opacity: [0.8, 1, 0.8], duration: 800 },
      idle:     { strokeWidth: [3.5, 4.2, 3.5], opacity: [0.7, 0.9, 0.7], duration: 2000 },
    };
    const config = configs[mood] || configs.idle;

    anime({
      targets: paths,
      strokeWidth: config.strokeWidth,
      opacity: config.opacity,
      duration: config.duration,
      loop: true,
      easing: 'easeInOutSine',
      delay: anime.stagger(50),
    });

    return () => anime.remove(paths);
  }, [mood]);

  // Glow animation
  useEffect(() => {
    if (!glowRef.current) return;
    anime.remove(glowRef.current);

    const configs = {
      speaking: { scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5], duration: 400 },
      thinking: { scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4], duration: 1000 },
      idle:     { scale: [1, 1.05, 1], opacity: [0.25, 0.4, 0.25], duration: 3000 },
    };
    const config = configs[mood] || configs.idle;

    anime({
      targets: glowRef.current,
      scale: config.scale,
      opacity: config.opacity,
      duration: config.duration,
      loop: true,
      easing: 'easeInOutSine',
    });

    return () => { if (glowRef.current) anime.remove(glowRef.current); };
  }, [mood]);

  // Init particles
  useEffect(() => {
    const st = stateRef.current;
    const N = 24;
    const rand = (a) => { const x = Math.sin(a * 9999) * 10000; return x - Math.floor(x); };
    st.particles = Array.from({ length: N }).map((_, i) => {
      const pr = innerR * 0.8 * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return {
        x: r + pr * Math.cos(ang),
        y: r + pr * Math.sin(ang),
        vx: (rand(i + 11) - 0.5) * 0.12,
        vy: (rand(i + 17) - 0.5) * 0.12,
        s: 0.6 + rand(i + 23) * 0.8,
        hue: rand(i + 31) * 60 + 250,
      };
    });
  }, [size, innerR, r]);

  // Canvas particle render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;
      st.time += 0.016;

      const targetLevel = level || 0.18;
      st.currentLevel += (targetLevel - st.currentLevel) * 0.05;
      const intensity = st.currentLevel;
      const cx = size / 2;
      const cy = size / 2;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, size, size);

      // Inner dark circle
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.clip();

      // Purple gradient
      const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, innerR);
      const baseAlpha = 0.3 + intensity * 0.4;
      g.addColorStop(0, `rgba(168,85,247,${baseAlpha})`);
      g.addColorStop(0.5, `rgba(139,92,246,${baseAlpha * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Particles
      const speedBoost = 0.5 + intensity * 1.5;
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];
        const dx = a.x - cx;
        const dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.003 * speedBoost;
        const pr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + pr * Math.cos(ang) - a.x) * 0.002 * speedBoost;
        a.vy += (cy + pr * Math.sin(ang) - a.y) * 0.002 * speedBoost;
        a.x += a.vx * speedBoost;
        a.y += a.vy * speedBoost;

        const rr = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2);
        const maxR = innerR * 0.85;
        if (rr > maxR) {
          const k = maxR / rr;
          a.x = cx + (a.x - cx) * k;
          a.y = cy + (a.y - cy) * k;
          a.vx *= -0.3;
          a.vy *= -0.3;
        }

        // Links
        const linkOp = 0.15 + intensity * 0.3;
        for (let j = i + 1; j < st.particles.length; j++) {
          const b = st.particles[j];
          const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
          if (dist < 16) {
            const o = (1 - dist / 16) * linkOp;
            ctx.strokeStyle = `rgba(255,255,255,${o})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Dots
      ctx.globalCompositeOperation = 'lighter';
      const dotOp = 0.25 + intensity * 0.45;
      for (const p of st.particles) {
        ctx.fillStyle = `rgba(255,255,255,${dotOp})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * (0.8 + intensity * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => { running = false; cancelAnimationFrame(animationRef.current); };
  }, [size, level, innerR]);

  const glowColor = mood === 'speaking' ? '#a855f7' : '#a855f7';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow halo */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor}50 0%, transparent 70%)`,
          transform: 'scale(1.4)',
          opacity: 0.3,
        }}
      />

      {/* SVG ring segments */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          <filter id="introSegGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g ref={segmentsRef} filter="url(#introSegGlow)">
          {AGENT_SEGMENTS.map((seg) => (
            <path
              key={seg.id}
              data-agent={seg.id}
              d={arcPath(r, r, segmentR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={3.5}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
        </g>
      </svg>

      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// ─── Narration Script ─────────────────────────────────────────────────────────
function buildNarrationScript(name, company) {
  const n = name || 'there';
  const c = company || 'your company';
  return [
    {
      key: 'greeting',
      text: `Hey ${n}! I'm SYNC, your AI business orchestrator. Let me show you what iSyncSO can do for ${c}.`,
      minMs: 4000,
    },
    {
      key: 'engines',
      text: `iSyncSO brings together 10 powerful engines: CRM, Finance, Growth, Talent, Learn, Create, Products, Raise, Sentinel, and Analytics. All connected. All powered by AI.`,
      minMs: 6000,
    },
    {
      key: 'orchestrator',
      text: `At the heart of everything is me — SYNC. I can execute 51 different actions across every module. Create invoices, enrich contacts, match candidates, generate images — just tell me what you need.`,
      minMs: 7000,
    },
    {
      key: 'activity',
      text: `Every action your team takes is tracked in real time. I generate daily journals and activity summaries so you always know what's happening across your organization.`,
      minMs: 5500,
    },
    {
      key: 'integrations',
      text: `Plus, we connect to over 30 tools you already use — Slack, HubSpot, Gmail, Stripe, and more. And with built-in EU AI Act compliance, you stay ahead of regulations automatically.`,
      minMs: 6000,
    },
    {
      key: 'ready',
      text: `Ready? Let's dive in and explore what iSyncSO looks like for ${c}.`,
      minMs: 3000,
    },
  ];
}

// ─── Module Icons ─────────────────────────────────────────────────────────────
const MODULES = [
  { icon: Contact,       label: 'CRM',       color: '#06b6d4', agentId: 'learn' },
  { icon: Euro,          label: 'Finance',    color: '#f59e0b', agentId: 'finance' },
  { icon: Rocket,        label: 'Growth',     color: '#6366f1', agentId: 'growth' },
  { icon: UserPlus,      label: 'Talent',     color: '#ef4444', agentId: 'create' },
  { icon: GraduationCap, label: 'Learn',      color: '#14b8a6', agentId: 'inbox' },
  { icon: Palette,       label: 'Create',     color: '#f43f5e', agentId: 'create' },
  { icon: Package,       label: 'Products',   color: '#10b981', agentId: 'products' },
  { icon: TrendingUp,    label: 'Raise',      color: '#f97316', agentId: 'tasks' },
  { icon: Shield,        label: 'Sentinel',   color: '#86EFAC', agentId: 'sentinel' },
  { icon: BarChart3,     label: 'Analytics',  color: '#3b82f6', agentId: 'research' },
];

// ─── Feature Cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain, title: 'SYNC AI Orchestrator',
    desc: '51 voice-controlled actions across every module.',
    color: '#a855f7', phase: 2,
  },
  {
    icon: Activity, title: 'Activity Tracking',
    desc: 'Real-time logs and AI-generated daily journals.',
    color: '#06b6d4', phase: 3,
  },
  {
    icon: Puzzle, title: '30+ Integrations',
    desc: 'Slack, HubSpot, Gmail, Stripe, and more.',
    color: '#f59e0b', phase: 4,
  },
  {
    icon: Shield, title: 'EU AI Act Compliance',
    desc: 'Built-in AI governance and documentation.',
    color: '#86EFAC', phase: 4,
  },
];

// ─── TTS Helper ──────────────────────────────────────────────────────────────
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(voiceUrl, {
      method: 'POST', signal: controller.signal, headers: ttsHeaders,
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
      if (data.ttsUnavailable) return browserTTS(text, language, onDone);
    }
  } catch (_) {}

  return browserTTS(text, language, onDone);
}

function browserTTS(text, language, onDone) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      const wait = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, wait);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : 'en-US';
      u.rate = 1.0;
      const done = () => { resolve(); onDone?.(); };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    } catch (_) {
      const wait = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, wait);
    }
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DemoIntroScreen({ recipientName, companyName, onStart, language = 'en' }) {
  const [phase, setPhase] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [skipping, setSkipping] = useState(false);
  const audioRef = useRef(null);
  const mountedRef = useRef(true);
  const phaseRef = useRef(-1);

  const script = useRef(buildNarrationScript(recipientName, companyName)).current;

  const avatarMood = speaking ? 'speaking' : 'idle';
  const avatarLevel = speaking ? 0.55 : 0.18;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (mountedRef.current) setPhase(0); }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Narration engine
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
        setTimeout(() => {
          if (!mountedRef.current) return;
          const next = phaseRef.current + 1;
          if (next < script.length) {
            setPhase(next);
          } else {
            setTimeout(() => { if (mountedRef.current) onStart(); }, 1000);
          }
        }, 500);
      }
    };

    speakText(step.text, language, audioRef, () => { voiceDone = true; tryAdvance(); });

    const minTimer = setTimeout(() => { timerDone = true; tryAdvance(); }, step.minMs);

    return () => {
      clearTimeout(minTimer);
      try { window.speechSynthesis?.cancel(); } catch (_) {}
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {}
        audioRef.current = null;
      }
    };
  }, [phase, skipping]);

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
  const showFeatures = phase >= 2;
  const showStats = phase >= 2;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 overflow-hidden relative select-none">

      {/* ─── Cinematic Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Central purple nebula */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '120vw', height: '120vh',
            background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.07) 0%, rgba(99,102,241,0.03) 30%, transparent 60%)',
          }}
          animate={{ scale: speaking ? [1, 1.05, 1] : 1, rotate: [0, 1, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            top: '15%', left: '10%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            bottom: '10%', right: '5%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ x: [0, -25, 0], y: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            top: '60%', left: '60%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }}
        />
      </div>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center">

        {/* ─── SYNC Avatar ─── */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.2, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="mb-2"
            >
              <IntroSyncAvatar size={160} mood={avatarMood} level={avatarLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking waveform ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.5 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-[3px] h-6 mb-4"
            >
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2.5px] rounded-full"
                  style={{ background: 'linear-gradient(to top, #a855f7, #06b6d4)' }}
                  animate={{ height: [4, 14 + Math.sin(i * 0.8) * 6, 4] }}
                  transition={{ duration: 0.5 + i * 0.04, repeat: Infinity, delay: i * 0.06, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Welcome badge ─── */}
        <AnimatePresence>
          {phase === 0 && recipientName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 tracking-[0.2em] uppercase font-medium px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Prepared for {recipientName}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Narration Text ─── */}
        <AnimatePresence mode="wait">
          {phase >= 0 && transcript && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-8 max-w-2xl mx-auto px-6"
            >
              <p className="text-white/90 text-lg sm:text-xl md:text-2xl leading-relaxed font-light tracking-[-0.01em]">
                {transcript}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Module Icons ─── */}
        <AnimatePresence>
          {showModules && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-8 flex-wrap px-4"
            >
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <motion.div
                      className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border backdrop-blur-sm relative overflow-hidden"
                      style={{
                        borderColor: `${mod.color}20`,
                        background: `linear-gradient(135deg, ${mod.color}08, ${mod.color}03)`,
                      }}
                      animate={phase === 1 ? {
                        borderColor: [`${mod.color}20`, `${mod.color}60`, `${mod.color}20`],
                      } : {}}
                      transition={phase === 1 ? { duration: 2.5, repeat: Infinity, delay: i * 0.15 } : {}}
                      whileHover={{ scale: 1.1, borderColor: `${mod.color}80` }}
                    >
                      {/* Inner glow on active */}
                      {phase === 1 && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          style={{ background: `radial-gradient(circle, ${mod.color}15, transparent)` }}
                          animate={{ opacity: [0, 0.8, 0] }}
                          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
                        />
                      )}
                      <Icon className="w-5 h-5 relative z-10" style={{ color: mod.color }} />
                    </motion.div>
                    <span className="text-[10px] text-zinc-500 font-medium tracking-wide">{mod.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Feature Cards ─── */}
        <AnimatePresence>
          {showFeatures && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-8 px-2"
            >
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                const isActive = phase >= feat.phase;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{
                      opacity: isActive ? 1 : 0.25,
                      y: 0,
                    }}
                    transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative rounded-2xl border p-4 transition-all duration-700 overflow-hidden group"
                    style={{
                      borderColor: isActive ? `${feat.color}30` : 'rgba(255,255,255,0.04)',
                      background: isActive
                        ? `linear-gradient(135deg, ${feat.color}10, ${feat.color}05)`
                        : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    {/* Glow accent */}
                    {isActive && (
                      <motion.div
                        className="absolute -top-12 -right-12 w-24 h-24 rounded-full"
                        style={{ background: `radial-gradient(circle, ${feat.color}20, transparent)` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                      />
                    )}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 relative z-10"
                      style={{
                        background: isActive ? `${feat.color}15` : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: isActive ? feat.color : '#52525b' }} />
                    </div>
                    <h3 className={`text-xs sm:text-sm font-semibold mb-1 relative z-10 transition-colors duration-500 ${
                      isActive ? 'text-white' : 'text-zinc-700'
                    }`}>
                      {feat.title}
                    </h3>
                    <p className={`text-[10px] sm:text-xs leading-relaxed relative z-10 transition-colors duration-500 ${
                      isActive ? 'text-zinc-400' : 'text-zinc-800'
                    }`}>
                      {feat.desc}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Stats ─── */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center gap-6 sm:gap-10 md:gap-14 mb-8"
            >
              {[
                { value: '51', label: 'AI Actions' },
                { value: '10', label: 'Engines' },
                { value: '30+', label: 'Integrations' },
                { value: '11', label: 'Languages' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{stat.value}</div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.15em] mt-0.5 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Progress indicator ─── */}
        {phase >= 0 && phase < script.length && (
          <div className="flex items-center justify-center gap-1.5">
            {script.map((_, i) => (
              <motion.div
                key={i}
                className="h-[3px] rounded-full"
                animate={{
                  width: i === phase ? 28 : 6,
                  backgroundColor: i < phase ? 'rgba(168,85,247,0.5)' : i === phase ? 'rgba(168,85,247,0.9)' : 'rgba(63,63,70,0.4)',
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
        animate={{ opacity: phase >= 0 ? 0.6 : 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 3, duration: 0.5 }}
        onClick={handleSkip}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 text-sm backdrop-blur-md"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Skip Intro
      </motion.button>
    </div>
  );
}
