import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import anime from '@/lib/anime-wrapper';
import {
  Brain, BarChart3, Shield, Puzzle, Activity,
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

// ─── Generative Ambient Audio Engine ────────────────────────────────────────
function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let nodes = [];
  let started = false;

  const start = () => {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      // Warm pad — layered detuned oscillators
      const padFreqs = [130.81, 196.00, 261.63, 329.63]; // C3, G3, C4, E4
      padFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (i - 1.5) * 6; // Slight detune for warmth

        filter.type = 'lowpass';
        filter.frequency.value = 400 + i * 80;
        filter.Q.value = 0.5;

        gain.gain.value = 0.035;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start();
        nodes.push({ osc, gain, filter });
      });

      // Sub bass drone
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.value = 65.41; // C2
      subGain.gain.value = 0.04;
      sub.connect(subGain);
      subGain.connect(masterGain);
      sub.start();
      nodes.push({ osc: sub, gain: subGain });

      // Shimmer layer — high sine with tremolo
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      const shimmerFilter = ctx.createBiquadFilter();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      shimmer.type = 'sine';
      shimmer.frequency.value = 523.25; // C5
      shimmerFilter.type = 'lowpass';
      shimmerFilter.frequency.value = 600;
      shimmerGain.gain.value = 0.012;

      lfo.type = 'sine';
      lfo.frequency.value = 0.15;
      lfoGain.gain.value = 0.008;

      shimmer.connect(shimmerFilter);
      shimmerFilter.connect(shimmerGain);
      lfo.connect(lfoGain);
      lfoGain.connect(shimmerGain.gain);
      shimmerGain.connect(masterGain);
      shimmer.start();
      lfo.start();
      nodes.push({ osc: shimmer, gain: shimmerGain }, { osc: lfo, gain: lfoGain });

      // Fade in over 3 seconds
      masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
      started = true;
    } catch (_) {}
  };

  const setIntensity = (val) => {
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0.3 + val * 0.5, t + 0.5);

    // Sweep filters up with intensity
    nodes.forEach(n => {
      if (n.filter) {
        n.filter.frequency.cancelScheduledValues(t);
        n.filter.frequency.setValueAtTime(n.filter.frequency.value, t);
        n.filter.frequency.linearRampToValueAtTime(400 + val * 600, t + 0.8);
      }
    });
  };

  const stop = () => {
    if (!ctx || !masterGain) return;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => {
      nodes.forEach(n => { try { n.osc.stop(); } catch (_) {} });
      nodes = [];
      try { ctx.close(); } catch (_) {}
      ctx = null;
      started = false;
    }, 2000);
  };

  return { start, setIntensity, stop };
}

// ─── Full-screen Particle Starfield ─────────────────────────────────────────
function StarfieldCanvas({ speaking, phase }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [], time: 0, intensity: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    // Init particles
    const N = 200;
    st.particles = Array.from({ length: N }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random(), // depth layer 0-1
      s: 0.3 + Math.random() * 1.5,
      baseAlpha: 0.1 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.08,
      hue: Math.random() > 0.85 ? (Math.random() > 0.5 ? 270 : 190) : 0, // Some purple/cyan tinted
    }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (!running) return;
      st.time += 0.016;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const targetInt = speaking ? 0.8 : (phase >= 0 ? 0.4 : 0.1);
      st.intensity += (targetInt - st.intensity) * 0.03;

      ctx.clearRect(0, 0, w, h);

      for (const p of st.particles) {
        p.pulse += p.speed;
        const pulseVal = (Math.sin(p.pulse) + 1) * 0.5;
        const alpha = p.baseAlpha * (0.4 + st.intensity * 0.6) * (0.6 + pulseVal * 0.4);
        const size = p.s * (0.8 + st.intensity * 0.3 + pulseVal * 0.2);

        // Subtle drift
        p.y -= p.z * 0.15 * (1 + st.intensity);
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }

        if (p.hue > 0) {
          ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${alpha * 0.8})`;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Glow for brighter particles
        if (alpha > 0.3 && size > 1) {
          ctx.fillStyle = p.hue > 0
            ? `hsla(${p.hue}, 60%, 60%, ${alpha * 0.15})`
            : `rgba(255,255,255,${alpha * 0.1})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw faint connecting lines between close particles (constellation effect)
      if (st.intensity > 0.3) {
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < st.particles.length; i++) {
          const a = st.particles[i];
          if (a.z < 0.3) continue; // Only foreground particles
          for (let j = i + 1; j < Math.min(i + 20, st.particles.length); j++) {
            const b = st.particles[j];
            if (b.z < 0.3) continue;
            const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
            if (dist < 100) {
              const o = (1 - dist / 100) * 0.04 * st.intensity;
              ctx.strokeStyle = `rgba(168,130,255,${o})`;
              ctx.lineWidth = 0.4;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => { running = false; window.removeEventListener('resize', resize); };
  }, []);

  // Update speaking/phase via ref to avoid re-creating canvas
  useEffect(() => { stateRef.current.speakingTarget = speaking; }, [speaking]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
}

// ─── SYNC Avatar (self-contained, anime.js + canvas particles) ──────────────
function IntroSyncAvatar({ size = 180, mood = 'idle', level = 0.18 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const segmentsRef = useRef(null);
  const glowRef = useRef(null);
  const stateRef = useRef({ particles: [], time: 0, currentLevel: 0.18 });

  const r = size / 2;
  const segmentR = r - 4;
  const innerR = r * 0.58;

  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };
  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 0 1 ${p1.x} ${p1.y}`;
  };

  useEffect(() => {
    if (!segmentsRef.current) return;
    const paths = segmentsRef.current.querySelectorAll('path');
    anime.remove(paths);
    const configs = {
      speaking: { strokeWidth: [4, 7, 4], opacity: [0.85, 1, 0.85], duration: 400 },
      thinking: { strokeWidth: [4, 6, 4], opacity: [0.8, 1, 0.8], duration: 800 },
      idle:     { strokeWidth: [4, 4.8, 4], opacity: [0.7, 0.9, 0.7], duration: 2000 },
    };
    const config = configs[mood] || configs.idle;
    anime({ targets: paths, strokeWidth: config.strokeWidth, opacity: config.opacity, duration: config.duration, loop: true, easing: 'easeInOutSine', delay: anime.stagger(50) });
    return () => anime.remove(paths);
  }, [mood]);

  useEffect(() => {
    if (!glowRef.current) return;
    anime.remove(glowRef.current);
    const configs = {
      speaking: { scale: [1, 1.2, 1], opacity: [0.5, 0.95, 0.5], duration: 400 },
      thinking: { scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4], duration: 1000 },
      idle:     { scale: [1, 1.06, 1], opacity: [0.25, 0.4, 0.25], duration: 3000 },
    };
    const config = configs[mood] || configs.idle;
    anime({ targets: glowRef.current, scale: config.scale, opacity: config.opacity, duration: config.duration, loop: true, easing: 'easeInOutSine' });
    return () => { if (glowRef.current) anime.remove(glowRef.current); };
  }, [mood]);

  useEffect(() => {
    const st = stateRef.current;
    const N = 28;
    const rand = (a) => { const x = Math.sin(a * 9999) * 10000; return x - Math.floor(x); };
    st.particles = Array.from({ length: N }).map((_, i) => {
      const pr = innerR * 0.8 * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return { x: r + pr * Math.cos(ang), y: r + pr * Math.sin(ang), vx: (rand(i + 11) - 0.5) * 0.12, vy: (rand(i + 17) - 0.5) * 0.12, s: 0.6 + rand(i + 23) * 0.9, hue: rand(i + 31) * 60 + 250 };
    });
  }, [size, innerR, r]);

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
      const cx = size / 2, cy = size / 2;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr; canvas.height = size * dpr;
        canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.clip();
      const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, innerR);
      const ba = 0.3 + intensity * 0.45;
      g.addColorStop(0, `rgba(168,85,247,${ba})`);
      g.addColorStop(0.5, `rgba(139,92,246,${ba * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      const speedBoost = 0.5 + intensity * 1.5;
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];
        const dx = a.x - cx, dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.003 * speedBoost;
        const pr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + pr * Math.cos(ang) - a.x) * 0.002 * speedBoost;
        a.vy += (cy + pr * Math.sin(ang) - a.y) * 0.002 * speedBoost;
        a.x += a.vx * speedBoost; a.y += a.vy * speedBoost;
        const rr = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2);
        const maxR = innerR * 0.85;
        if (rr > maxR) { const k = maxR / rr; a.x = cx + (a.x - cx) * k; a.y = cy + (a.y - cy) * k; a.vx *= -0.3; a.vy *= -0.3; }
        const linkOp = 0.15 + intensity * 0.35;
        for (let j = i + 1; j < st.particles.length; j++) {
          const b = st.particles[j]; const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
          if (dist < 18) { ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 18) * linkOp})`; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      const dotOp = 0.25 + intensity * 0.5;
      for (const p of st.particles) { ctx.fillStyle = `rgba(255,255,255,${dotOp})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.8 + intensity * 0.5), 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
    return () => { running = false; cancelAnimationFrame(animationRef.current); };
  }, [size, level, innerR]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={glowRef} className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)', transform: 'scale(1.6)', opacity: 0.3 }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <filter id="introSegGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2.5} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g ref={segmentsRef} filter="url(#introSegGlow)">
          {AGENT_SEGMENTS.map((seg) => (
            <path key={seg.id} data-agent={seg.id} d={arcPath(r, r, segmentR, seg.from, seg.to)} fill="none" stroke={seg.color} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
          ))}
        </g>
      </svg>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: size, height: size }} />
    </div>
  );
}

// ─── Word-by-Word Text Reveal ───────────────────────────────────────────────
function WordReveal({ text, className = '' }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: i * 0.045, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </span>
  );
}

// ─── Narration Script ─────────────────────────────────────────────────────────
function buildNarrationScript(name, company) {
  const n = name || 'there';
  const c = company || 'your company';
  return [
    { key: 'greeting', text: `Welcome, ${n}. I'm SYNC — the intelligence that orchestrates everything inside iSyncSO. I've been looking forward to showing you what we've built for ${c}.`, minMs: 5000 },
    { key: 'engines', text: `Imagine ten powerful engines — CRM, Finance, Growth, Talent, Learn, Create, Products, Raise, Sentinel, and Analytics — all working together as one living system. That's iSyncSO.`, minMs: 6500 },
    { key: 'orchestrator', text: `And I'm at the center of it all. Fifty-one actions at my fingertips. I can draft invoices, enrich your contacts, match the perfect candidate, generate stunning visuals — anything you need, just say the word.`, minMs: 7500 },
    { key: 'activity', text: `Nothing slips through the cracks. Every action, every decision your team makes is captured in real time. I even write your daily activity journals, so you always see the full picture.`, minMs: 6000 },
    { key: 'integrations', text: `And the tools you already rely on? Slack, HubSpot, Gmail, Stripe — over thirty integrations that flow seamlessly into one workspace. Plus, built-in EU AI Act compliance keeps you ahead of regulations, automatically.`, minMs: 7000 },
    { key: 'ready', text: `Now — let me show you what this looks like in practice. Let's step inside.`, minMs: 3500 },
  ];
}

// ─── Module Icons ─────────────────────────────────────────────────────────────
const MODULES = [
  { icon: Contact,       label: 'CRM',       color: '#06b6d4' },
  { icon: Euro,          label: 'Finance',    color: '#f59e0b' },
  { icon: Rocket,        label: 'Growth',     color: '#6366f1' },
  { icon: UserPlus,      label: 'Talent',     color: '#ef4444' },
  { icon: GraduationCap, label: 'Learn',      color: '#14b8a6' },
  { icon: Palette,       label: 'Create',     color: '#f43f5e' },
  { icon: Package,       label: 'Products',   color: '#10b981' },
  { icon: TrendingUp,    label: 'Raise',      color: '#f97316' },
  { icon: Shield,        label: 'Sentinel',   color: '#86EFAC' },
  { icon: BarChart3,     label: 'Analytics',  color: '#3b82f6' },
];

const FEATURES = [
  { icon: Brain,    title: 'SYNC AI Orchestrator', desc: '51 voice-controlled actions across every module.', color: '#a855f7', phase: 2 },
  { icon: Activity, title: 'Activity Tracking',    desc: 'Real-time logs and AI-generated daily journals.',  color: '#06b6d4', phase: 3 },
  { icon: Puzzle,   title: '30+ Integrations',     desc: 'Slack, HubSpot, Gmail, Stripe, and more.',        color: '#f59e0b', phase: 4 },
  { icon: Shield,   title: 'EU AI Act Compliance', desc: 'Built-in AI governance and documentation.',       color: '#86EFAC', phase: 4 },
];

// ─── TTS Helper ──────────────────────────────────────────────────────────────
const voiceUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-voice-demo`;
const ttsHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` };

async function speakText(text, language, audioRef, onDone) {
  if (!text) { onDone?.(); return; }
  const cancel = () => {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {} audioRef.current = null; }
  };
  cancel();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(voiceUrl, { method: 'POST', signal: controller.signal, headers: ttsHeaders, body: JSON.stringify({ ttsOnly: true, ttsText: text, language }) });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.audio) {
        return new Promise((resolve) => {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audioRef.current = audio;
          const done = () => { audioRef.current = null; resolve(); onDone?.(); };
          audio.onended = done; audio.onerror = done; audio.play().catch(done);
        });
      }
      if (data.ttsUnavailable) return browserTTS(text, language, onDone);
    }
  } catch (_) {}
  return browserTTS(text, language, onDone);
}

function browserTTS(text, language, onDone) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { const w = Math.max(3000, text.length * 45); setTimeout(() => { resolve(); onDone?.(); }, w); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : 'en-US';
      u.rate = 1.0;
      const done = () => { resolve(); onDone?.(); };
      u.onend = done; u.onerror = done; window.speechSynthesis.speak(u);
    } catch (_) { const w = Math.max(3000, text.length * 45); setTimeout(() => { resolve(); onDone?.(); }, w); }
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DemoIntroScreen({ recipientName, companyName, onStart, language = 'en' }) {
  const [phase, setPhase] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [skipping, setSkipping] = useState(false);
  const [letterboxOpen, setLetterboxOpen] = useState(false);
  const audioRef = useRef(null);
  const mountedRef = useRef(true);
  const phaseRef = useRef(-1);
  const ambientRef = useRef(null);

  const script = useRef(buildNarrationScript(recipientName, companyName)).current;
  const avatarMood = speaking ? 'speaking' : 'idle';
  const avatarLevel = speaking ? 0.6 : 0.18;

  useEffect(() => {
    mountedRef.current = true;
    ambientRef.current = createAmbientAudio();
    return () => {
      mountedRef.current = false;
      ambientRef.current?.stop();
    };
  }, []);

  // Start sequence
  useEffect(() => {
    const t1 = setTimeout(() => { if (mountedRef.current) setLetterboxOpen(true); }, 200);
    const t2 = setTimeout(() => {
      if (mountedRef.current) {
        setPhase(0);
        ambientRef.current?.start();
      }
    }, 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Update ambient intensity based on speaking
  useEffect(() => {
    ambientRef.current?.setIntensity(speaking ? 0.7 : 0.3);
  }, [speaking]);

  // Narration engine
  useEffect(() => {
    if (phase < 0 || phase >= script.length || skipping) return;
    phaseRef.current = phase;
    const step = script[phase];
    setTranscript(step.text);
    setSpeaking(true);

    let voiceDone = false, timerDone = false, advanced = false;
    const tryAdvance = () => {
      if (advanced || !mountedRef.current) return;
      if (voiceDone && timerDone) {
        advanced = true;
        setSpeaking(false);
        setTimeout(() => {
          if (!mountedRef.current) return;
          const next = phaseRef.current + 1;
          if (next < script.length) { setPhase(next); }
          else { setTimeout(() => { if (mountedRef.current) { ambientRef.current?.stop(); onStart(); } }, 1200); }
        }, 600);
      }
    };

    speakText(step.text, language, audioRef, () => { voiceDone = true; tryAdvance(); });
    const minTimer = setTimeout(() => { timerDone = true; tryAdvance(); }, step.minMs);

    return () => {
      clearTimeout(minTimer);
      try { window.speechSynthesis?.cancel(); } catch (_) {}
      if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {} audioRef.current = null; }
    };
  }, [phase, skipping]);

  const handleSkip = useCallback(() => {
    setSkipping(true);
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {} audioRef.current = null; }
    setSpeaking(false);
    ambientRef.current?.stop();
    onStart();
  }, [onStart]);

  const showModules = phase >= 1;
  const showFeatures = phase >= 2;
  const showStats = phase >= 2;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none" style={{ cursor: 'none' }}>

      {/* ─── Particle Starfield ─── */}
      <StarfieldCanvas speaking={speaking} phase={phase} />

      {/* ─── Cinematic Background Layers ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Central nebula */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '140vw', height: '140vh', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.03) 25%, transparent 55%)' }}
          animate={{ scale: speaking ? [1, 1.06, 1] : [1, 1.02, 1], rotate: [0, 0.5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Breathing orbs */}
        <motion.div className="absolute w-[800px] h-[800px] rounded-full" style={{ top: '10%', left: '5%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 60%)', filter: 'blur(60px)' }}
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full" style={{ bottom: '5%', right: '0%', background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 60%)', filter: 'blur(60px)' }}
          animate={{ x: [0, -30, 0], y: [0, 25, 0], scale: [1, 1.15, 1] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 4 }} />
        <motion.div className="absolute w-[500px] h-[500px] rounded-full" style={{ top: '50%', right: '20%', background: 'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 60%)', filter: 'blur(50px)' }}
          animate={{ x: [0, 25, 0], y: [0, -35, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 7 }} />

        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
      </div>

      {/* ─── Cinematic Letterbox ─── */}
      <motion.div
        className="absolute top-0 left-0 right-0 bg-black z-30 pointer-events-none"
        initial={{ height: '50vh' }}
        animate={{ height: letterboxOpen ? 0 : '50vh' }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-black z-30 pointer-events-none"
        initial={{ height: '50vh' }}
        animate={{ height: letterboxOpen ? 0 : '50vh' }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />

      {/* ─── Main Content ─── */}
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center px-6">

        {/* ─── SYNC Avatar — Large, Cinematic ─── */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.1, filter: 'blur(30px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3"
            >
              <IntroSyncAvatar size={180} mood={avatarMood} level={avatarLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking waveform ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.3 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.3 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center gap-[3px] h-5 mb-5"
            >
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{ background: `linear-gradient(to top, ${AGENT_SEGMENTS[i]?.color || '#a855f7'}88, ${AGENT_SEGMENTS[i]?.color || '#06b6d4'})` }}
                  animate={{ height: [3, 12 + Math.sin(i * 0.7) * 8, 3] }}
                  transition={{ duration: 0.45 + i * 0.03, repeat: Infinity, delay: i * 0.05, ease: 'easeInOut' }}
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
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500/80 tracking-[0.25em] uppercase font-medium">
                <Sparkles className="w-3 h-3 text-purple-400/60" />
                Prepared for {recipientName}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Narration Text (word-by-word reveal) ─── */}
        <AnimatePresence mode="wait">
          {phase >= 0 && transcript && (
            <motion.div
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
              transition={{ duration: 0.3 }}
              className="text-center mb-10 max-w-2xl mx-auto"
            >
              <WordReveal
                text={transcript}
                className="text-white/90 text-lg sm:text-xl md:text-[1.65rem] leading-relaxed font-light tracking-[-0.01em]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Module Icons ─── */}
        <AnimatePresence>
          {showModules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 mb-10 flex-wrap"
            >
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        border: `1px solid ${mod.color}18`,
                        background: `linear-gradient(135deg, ${mod.color}08, transparent)`,
                      }}
                      animate={phase === 1 ? {
                        boxShadow: [`0 0 0px ${mod.color}00`, `0 0 30px ${mod.color}30`, `0 0 0px ${mod.color}00`],
                        borderColor: [`${mod.color}18`, `${mod.color}50`, `${mod.color}18`],
                      } : {}}
                      transition={phase === 1 ? { duration: 3, repeat: Infinity, delay: i * 0.2 } : {}}
                    >
                      {phase === 1 && (
                        <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${mod.color}12, transparent 70%)` }}
                          animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }} />
                      )}
                      <Icon className="w-6 h-6 relative z-10" style={{ color: mod.color }} />
                    </motion.div>
                    <span className="text-[10px] text-zinc-600 font-medium tracking-wider">{mod.label}</span>
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
              transition={{ duration: 0.7 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-10"
            >
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                const isActive = phase >= feat.phase;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: isActive ? 1 : 0.15, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="relative rounded-2xl p-4 overflow-hidden"
                    style={{
                      border: `1px solid ${isActive ? feat.color + '25' : 'rgba(255,255,255,0.03)'}`,
                      background: isActive ? `linear-gradient(145deg, ${feat.color}0A, ${feat.color}03)` : 'rgba(255,255,255,0.005)',
                    }}
                  >
                    {isActive && (
                      <motion.div className="absolute -top-16 -right-16 w-32 h-32 rounded-full" style={{ background: `radial-gradient(circle, ${feat.color}15, transparent)` }}
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} />
                    )}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 relative z-10"
                      style={{ background: isActive ? `${feat.color}10` : 'rgba(255,255,255,0.02)' }}>
                      <Icon className="w-5 h-5" style={{ color: isActive ? feat.color : '#3f3f46' }} />
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 relative z-10 transition-colors duration-700 ${isActive ? 'text-white' : 'text-zinc-800'}`}>{feat.title}</h3>
                    <p className={`text-[11px] leading-relaxed relative z-10 transition-colors duration-700 ${isActive ? 'text-zinc-400' : 'text-zinc-800'}`}>{feat.desc}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Stats ─── */}
        <AnimatePresence>
          {showStats && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="flex items-center justify-center gap-8 sm:gap-12 md:gap-16 mb-8">
              {[
                { value: '51', label: 'AI Actions' },
                { value: '10', label: 'Engines' },
                { value: '30+', label: 'Integrations' },
                { value: '11', label: 'Languages' },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.1 }} className="text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">{stat.value}</div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-[0.2em] mt-1 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Progress ─── */}
        {phase >= 0 && phase < script.length && (
          <div className="flex items-center justify-center gap-1.5">
            {script.map((_, i) => (
              <motion.div key={i} className="h-[2px] rounded-full"
                animate={{ width: i === phase ? 32 : 5, backgroundColor: i < phase ? 'rgba(168,85,247,0.4)' : i === phase ? 'rgba(168,85,247,0.85)' : 'rgba(63,63,70,0.3)' }}
                transition={{ duration: 0.5 }} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Skip (ultra subtle) ─── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 0 ? 0.3 : 0 }}
        whileHover={{ opacity: 0.8, cursor: 'pointer' }}
        transition={{ delay: 4, duration: 0.8 }}
        onClick={handleSkip}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors duration-300 text-xs"
        style={{ cursor: 'pointer' }}
      >
        <SkipForward className="w-3 h-3" />
        Skip
      </motion.button>
    </div>
  );
}
