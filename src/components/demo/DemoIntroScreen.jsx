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

// ─── Modern Ambient Audio Engine ────────────────────────────────────────────
// Upbeat, cool, immersive — subtle rhythmic pulse, patterned arpeggios,
// filtered saw pads, shimmer textures. Think modern tech product soundtrack.
function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let oscs = [];
  let arpTimer = null;
  let started = false;
  let padFilters = [];
  let currentIntensity = 0.3;
  const BPM = 110;
  const beat = 60 / BPM;

  const start = () => {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      // ── Stereo Delay (ping-pong feel) ──
      const delayL = ctx.createDelay(2);
      delayL.delayTime.value = beat * 0.75; // dotted eighth
      const delayR = ctx.createDelay(2);
      delayR.delayTime.value = beat * 0.5; // eighth
      const delayFbL = ctx.createGain();
      delayFbL.gain.value = 0.25;
      const delayFbR = ctx.createGain();
      delayFbR.gain.value = 0.22;
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 3500;
      const delayMix = ctx.createGain();
      delayMix.gain.value = 0.2;
      delayL.connect(delayFilter);
      delayFilter.connect(delayFbL);
      delayFbL.connect(delayR);
      delayR.connect(delayFbR);
      delayFbR.connect(delayL);
      delayL.connect(delayMix);
      delayR.connect(delayMix);
      delayMix.connect(masterGain);

      // Send bus
      const delaySend = ctx.createGain();
      delaySend.gain.value = 0.35;
      delaySend.connect(delayL);

      // ── Reverb via feedback delay network ──
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.25;
      [0.053, 0.097, 0.149, 0.223].forEach(t => {
        const d = ctx.createDelay(1);
        d.delayTime.value = t;
        const fb = ctx.createGain();
        fb.gain.value = 0.18;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 2800 - t * 4000;
        d.connect(filt);
        filt.connect(fb);
        fb.connect(d);
        filt.connect(reverbGain);
        delaySend.connect(d);
      });
      reverbGain.connect(masterGain);

      // ── Warm Pad — two detuned saws per voice, LP filtered ──
      const padChord = [
        { freq: 130.81 },  // C3
        { freq: 164.81 },  // E3
        { freq: 196.00 },  // G3
        { freq: 261.63 },  // C4
      ];

      padChord.forEach((note, i) => {
        // Two detuned oscillators for thickness
        [-7, 7].forEach((det) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = note.freq;
          osc.detune.value = det + (Math.random() - 0.5) * 4;

          // Slow drift
          const dLfo = ctx.createOscillator();
          const dDepth = ctx.createGain();
          dLfo.type = 'sine';
          dLfo.frequency.value = 0.06 + i * 0.025;
          dDepth.gain.value = 5 + i * 2;
          dLfo.connect(dDepth);
          dDepth.connect(osc.detune);
          dLfo.start();

          osc.connect(padFilters.length > i ? padFilters[i] : (() => {
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = 400 + i * 80;
            f.Q.value = 1.2;
            padFilters.push(f);
            return f;
          })());
          osc.start();
          oscs.push(osc, dLfo);
        });

        // Filter modulation — medium speed for movement
        if (padFilters[i]) {
          const fLfo = ctx.createOscillator();
          const fDepth = ctx.createGain();
          fLfo.type = 'sine';
          fLfo.frequency.value = 0.12 + i * 0.04;
          fDepth.gain.value = 200 + i * 80;
          fLfo.connect(fDepth);
          fDepth.connect(padFilters[i].frequency);
          fLfo.start();
          oscs.push(fLfo);
        }
      });

      // Pad output with sidechain-style pumping
      const padGain = ctx.createGain();
      padGain.gain.value = 0.018;
      padFilters.forEach(f => f.connect(padGain));
      padGain.connect(masterGain);
      padGain.connect(delaySend);

      // Sidechain pump on pad — LFO at beat rate for rhythmic feel
      const pumpLfo = ctx.createOscillator();
      const pumpDepth = ctx.createGain();
      pumpLfo.type = 'sine';
      pumpLfo.frequency.value = BPM / 60; // 1 pump per beat
      pumpDepth.gain.value = 0.006;
      pumpLfo.connect(pumpDepth);
      pumpDepth.connect(padGain.gain);
      pumpLfo.start();
      oscs.push(pumpLfo);

      // ── Arpeggio Layer — patterned melodic sequence ──
      // A minor pentatonic across octaves — modern, clean
      const arpScale = [
        440.00, 523.25, 659.25, 783.99, 880.00,     // A4 C5 E5 G5 A5
        1046.50, 1318.51, 1567.98, 1760.00,          // C6 E6 G6 A6
      ];
      // Pattern: up-up-skip-down, repeating — gives forward motion
      const arpPattern = [0, 2, 4, 3, 1, 3, 5, 4, 2, 4, 6, 5, 3, 5, 7, 6];
      let arpStep = 0;
      let arpNextTime = 0;

      const scheduleArp = () => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        // Schedule a few notes ahead for tight timing
        while (arpNextTime < now + 0.15) {
          const t = Math.max(arpNextTime, now);
          const idx = arpPattern[arpStep % arpPattern.length];
          const freq = arpScale[Math.min(idx, arpScale.length - 1)];

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filt = ctx.createBiquadFilter();

          // Soft sine/triangle blend via two oscillators
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.detune.value = (Math.random() - 0.5) * 6;

          filt.type = 'lowpass';
          filt.frequency.value = 2500 + currentIntensity * 2000;
          filt.Q.value = 0.8;

          // Pluck envelope — snappy attack, smooth decay
          const vol = (0.02 + currentIntensity * 0.015) * (0.85 + Math.random() * 0.3);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(vol, t + 0.008);
          gain.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6 + Math.random() * 0.3);

          osc.connect(filt);
          filt.connect(gain);
          gain.connect(masterGain);
          gain.connect(delaySend); // Arps ping-pong nicely
          osc.start(t);
          osc.stop(t + 1.2);

          arpStep++;
          // Sixteenth note grid with occasional skip
          const stepLen = beat * 0.25;
          // Every 4th step, add a tiny swing
          const swing = (arpStep % 4 === 2) ? stepLen * 0.08 : 0;
          arpNextTime += stepLen + swing;
        }
      };

      arpNextTime = ctx.currentTime + beat * 2; // Start after 2 beats
      const arpLoop = () => {
        scheduleArp();
        arpTimer = setTimeout(arpLoop, 80); // Schedule lookahead
      };
      arpTimer = setTimeout(arpLoop, (beat * 2) * 1000);

      // ── Shimmer Layer — high-freq filtered noise, rhythmic ──
      const shimBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const shimData = shimBuf.getChannelData(0);
      for (let i = 0; i < shimData.length; i++) shimData[i] = Math.random() * 2 - 1;
      const shimNoise = ctx.createBufferSource();
      shimNoise.buffer = shimBuf;
      shimNoise.loop = true;

      const shimHP = ctx.createBiquadFilter();
      shimHP.type = 'highpass';
      shimHP.frequency.value = 6000;
      shimHP.Q.value = 0.3;

      const shimLP = ctx.createBiquadFilter();
      shimLP.type = 'lowpass';
      shimLP.frequency.value = 12000;

      const shimGain = ctx.createGain();
      shimGain.gain.value = 0.004;

      // Rhythmic gate on shimmer
      const shimGateLfo = ctx.createOscillator();
      const shimGateDepth = ctx.createGain();
      shimGateLfo.type = 'sine';
      shimGateLfo.frequency.value = BPM / 60 * 2; // 8th notes
      shimGateDepth.gain.value = 0.003;
      shimGateLfo.connect(shimGateDepth);
      shimGateDepth.connect(shimGain.gain);
      shimGateLfo.start();

      shimNoise.connect(shimHP);
      shimHP.connect(shimLP);
      shimLP.connect(shimGain);
      shimGain.connect(masterGain);
      shimNoise.start();
      oscs.push(shimGateLfo);

      // ── Low-mid texture — warm noise bed ──
      const bedBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const bedData = bedBuf.getChannelData(0);
      for (let i = 0; i < bedData.length; i++) bedData[i] = Math.random() * 2 - 1;
      const bedNoise = ctx.createBufferSource();
      bedNoise.buffer = bedBuf;
      bedNoise.loop = true;

      const bedBand = ctx.createBiquadFilter();
      bedBand.type = 'bandpass';
      bedBand.frequency.value = 500;
      bedBand.Q.value = 0.6;

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.005;

      // Slow sweep
      const bedLfo = ctx.createOscillator();
      const bedDepth = ctx.createGain();
      bedLfo.type = 'sine';
      bedLfo.frequency.value = 0.06;
      bedDepth.gain.value = 250;
      bedLfo.connect(bedDepth);
      bedDepth.connect(bedBand.frequency);
      bedLfo.start();

      bedNoise.connect(bedBand);
      bedBand.connect(bedGain);
      bedGain.connect(masterGain);
      bedNoise.start();
      oscs.push(bedLfo);

      // ── Sub Bass — gentle pulse with slight envelope ──
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      const subFilter = ctx.createBiquadFilter();
      sub.type = 'sine';
      sub.frequency.value = 55.00; // A1
      subFilter.type = 'lowpass';
      subFilter.frequency.value = 90;
      subGain.gain.value = 0.03;
      // Sub also pumps gently
      const subPump = ctx.createOscillator();
      const subPumpD = ctx.createGain();
      subPump.type = 'sine';
      subPump.frequency.value = BPM / 60 * 0.5; // half-note pulse
      subPumpD.gain.value = 0.01;
      subPump.connect(subPumpD);
      subPumpD.connect(subGain.gain);
      subPump.start();
      sub.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(masterGain);
      sub.start();
      oscs.push(sub, subPump);

      // Fade in over 3 seconds
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
      started = true;
    } catch (_) {}
  };

  const setIntensity = (val) => {
    if (!ctx || !masterGain) return;
    currentIntensity = val;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0.35 + val * 0.4, t + 0.6);

    // Open pad filters — more brightness when speaking
    padFilters.forEach((f, i) => {
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(f.frequency.value, t);
      f.frequency.linearRampToValueAtTime(400 + i * 80 + val * 800, t + 0.8);
    });
  };

  const stop = () => {
    if (!ctx || !masterGain) return;
    if (arpTimer) { clearTimeout(arpTimer); arpTimer = null; }
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.8);
    setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); } catch (_) {} });
      oscs = [];
      padFilters = [];
      try { ctx.close(); } catch (_) {}
      ctx = null;
      started = false;
    }, 2200);
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

// ─── Lyric-Video Text Display ───────────────────────────────────────────────
// Words illuminate progressively timed to narration, like a lyric video.
// Active word glows, past words dim, future words invisible.
function LyricDisplay({ text, durationMs = 5000, speaking, className = '' }) {
  const words = text.split(' ');
  const [cursor, setCursor] = useState(-1);
  const cursorRef = useRef(-1);
  const intervalRef = useRef(null);
  const WORDS_PER_LINE = 8;

  useEffect(() => {
    setCursor(-1);
    cursorRef.current = -1;
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!speaking) return;
    // Start revealing after a short breath
    const startDelay = setTimeout(() => {
      cursorRef.current = 0;
      setCursor(0);
      // Time per word — slightly faster at start, natural speech cadence
      const msPerWord = (durationMs * 0.85) / words.length;
      intervalRef.current = setInterval(() => {
        cursorRef.current++;
        if (cursorRef.current >= words.length) {
          clearInterval(intervalRef.current);
          return;
        }
        setCursor(cursorRef.current);
      }, msPerWord);
    }, 250);

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speaking, durationMs, words.length]);

  return (
    <div className={className}>
      {words.map((word, i) => {
        const isRevealed = i <= cursor;
        const isActive = i === cursor;
        const isPast = i < cursor && i >= cursor - 3;
        const isFar = i < cursor - 3;
        const isLineBreak = i > 0 && i % WORDS_PER_LINE === 0;

        return (
          <React.Fragment key={i}>
            {isLineBreak && <br />}
            <motion.span
              animate={isRevealed ? {
                opacity: isActive ? 1 : isPast ? 0.75 : isFar ? 0.45 : 0,
                y: 0,
                filter: 'blur(0px)',
                scale: isActive ? 1.03 : 1,
              } : {
                opacity: 0,
                y: 10,
                filter: 'blur(8px)',
                scale: 0.97,
              }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block"
              style={isActive ? {
                textShadow: '0 0 25px rgba(6,182,212,0.5), 0 0 50px rgba(168,85,247,0.25)',
                color: '#fff',
              } : (isPast || isFar) ? {
                color: `rgba(255,255,255,${isFar ? 0.4 : 0.65})`,
              } : {}}
            >
              {word}&nbsp;
            </motion.span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Narration Script ─────────────────────────────────────────────────────────
function buildNarrationScript(name, company) {
  const n = name || 'there';
  const c = company || 'your company';
  return [
    { key: 'greeting', text: `${n}... welcome. I'm SYNC. Think of me as the mind behind everything that happens inside iSyncSO. And right now, my full attention is on ${c}.`, minMs: 6000 },
    { key: 'engines', text: `Behind me are ten engines. CRM. Finance. Growth. Talent. Learn. Create. Products. Raise. Sentinel. Analytics. Each one powerful on its own — but together, they become something extraordinary.`, minMs: 8000 },
    { key: 'orchestrator', text: `I orchestrate all of them. Fifty-one actions, all voice-controlled. Draft an invoice. Enrich a lead. Match a candidate. Generate a campaign visual. You ask — I execute. Instantly.`, minMs: 8000 },
    { key: 'activity', text: `Every move your team makes, I see it. Every decision, every deal, every conversation — captured in real time. I even write your daily journals, so nothing ever slips through the cracks.`, minMs: 7000 },
    { key: 'integrations', text: `Your existing tools? They plug right in. Slack, HubSpot, Gmail, Stripe — over thirty integrations, flowing seamlessly into one workspace. And EU AI Act compliance? Built in. Automatic. You're already ahead.`, minMs: 8000 },
    { key: 'ready', text: `Now... let me show you what this actually feels like. Step inside with me.`, minMs: 4000 },
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

async function speakText(text, language, audioRef, onStart, onDone) {
  if (!text) { onStart?.(); onDone?.(); return; }
  const cancel = () => {
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ''; } catch (_) {} audioRef.current = null; }
  };
  cancel();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // longer for ElevenLabs
    const res = await fetch(voiceUrl, { method: 'POST', signal: controller.signal, headers: ttsHeaders, body: JSON.stringify({ ttsOnly: true, ttsText: text, language }) });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.audio) {
        return new Promise((resolve) => {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audioRef.current = audio;
          let started = false;
          audio.onplaying = () => { if (!started) { started = true; onStart?.(); } };
          const done = () => { audioRef.current = null; if (!started) { started = true; onStart?.(); } resolve(); onDone?.(); };
          audio.onended = done; audio.onerror = done;
          audio.play().then(() => { if (!started) { started = true; onStart?.(); } }).catch(done);
        });
      }
      if (data.ttsUnavailable) return browserTTS(text, language, onStart, onDone);
    }
  } catch (_) {}
  return browserTTS(text, language, onStart, onDone);
}

function browserTTS(text, language, onStart, onDone) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      onStart?.();
      const w = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, w);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : 'en-US';
      u.rate = 1.0;
      u.onstart = () => onStart?.();
      const done = () => { resolve(); onDone?.(); };
      u.onend = done; u.onerror = done; window.speechSynthesis.speak(u);
    } catch (_) {
      onStart?.();
      const w = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, w);
    }
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DemoIntroScreen({ recipientName, companyName, onStart, language = 'en' }) {
  const [phase, setPhase] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false); // waiting for TTS audio
  const [transcript, setTranscript] = useState('');
  const [currentDuration, setCurrentDuration] = useState(5000);
  const [skipping, setSkipping] = useState(false);
  const [letterboxOpen, setLetterboxOpen] = useState(false);
  const audioRef = useRef(null);
  const mountedRef = useRef(true);
  const phaseRef = useRef(-1);
  const ambientRef = useRef(null);

  const script = useRef(buildNarrationScript(recipientName, companyName)).current;
  const avatarMood = speaking ? 'speaking' : loading ? 'thinking' : 'idle';
  const avatarLevel = speaking ? 0.6 : loading ? 0.35 : 0.18;

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

  // Narration engine — waits for audio to start before revealing text
  useEffect(() => {
    if (phase < 0 || phase >= script.length || skipping) return;
    phaseRef.current = phase;
    const step = script[phase];
    setTranscript(step.text);
    setCurrentDuration(step.minMs);
    setSpeaking(false);
    setLoading(true);

    let voiceDone = false, timerDone = false, advanced = false;
    let minTimer = null;
    const tryAdvance = () => {
      if (advanced || !mountedRef.current) return;
      if (voiceDone && timerDone) {
        advanced = true;
        setSpeaking(false);
        setLoading(false);
        setTimeout(() => {
          if (!mountedRef.current) return;
          const next = phaseRef.current + 1;
          if (next < script.length) { setPhase(next); }
          else { setTimeout(() => { if (mountedRef.current) { ambientRef.current?.stop(); onStart(); } }, 1200); }
        }, 600);
      }
    };

    // onStart fires when audio actually begins playing — THEN reveal text
    const handleAudioStart = () => {
      if (!mountedRef.current) return;
      setLoading(false);
      setSpeaking(true);
      // Start the minimum duration timer from when audio begins, not when requested
      minTimer = setTimeout(() => { timerDone = true; tryAdvance(); }, step.minMs);
    };

    speakText(step.text, language, audioRef, handleAudioStart, () => { voiceDone = true; tryAdvance(); });

    return () => {
      if (minTimer) clearTimeout(minTimer);
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
        {/* Beat pulse — subtle full-screen flash at BPM */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 50%)' }}
          animate={speaking ? { opacity: [0, 0.8, 0] } : { opacity: 0 }}
          transition={{ duration: 60 / 110, repeat: Infinity, ease: 'easeOut' }}
        />

        {/* Central nebula — bigger, more vivid */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '160vw', height: '160vh', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.1) 0%, rgba(6,182,212,0.04) 20%, rgba(99,102,241,0.02) 35%, transparent 55%)' }}
          animate={{ scale: speaking ? [1, 1.08, 1] : [1, 1.03, 1], rotate: [0, 1, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Flowing orbs — more movement, varied speeds */}
        <motion.div className="absolute w-[900px] h-[900px] rounded-full" style={{ top: '5%', left: '-5%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 55%)', filter: 'blur(70px)' }}
          animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[700px] h-[700px] rounded-full" style={{ bottom: '0%', right: '-5%', background: 'radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 55%)', filter: 'blur(60px)' }}
          animate={{ x: [0, -50, 0], y: [0, 35, 0], scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full" style={{ top: '40%', right: '10%', background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 55%)', filter: 'blur(50px)' }}
          animate={{ x: [0, 35, 0], y: [0, -50, 0], scale: [0.9, 1.1, 0.9] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 5 }} />
        <motion.div className="absolute w-[500px] h-[500px] rounded-full" style={{ top: '20%', left: '40%', background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 55%)', filter: 'blur(50px)' }}
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 8 }} />

        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.75) 100%)' }} />
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

        {/* ─── SYNC Avatar — Dramatic Cinematic Entrance ─── */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.05, filter: 'blur(40px)', rotate: -30 }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', rotate: 0 }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 relative"
            >
              {/* Beat pulse ring behind avatar */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', transform: 'scale(2.2)' }}
                animate={speaking ? { scale: [2.2, 2.5, 2.2], opacity: [0.3, 0.6, 0.3] } : { scale: [2.2, 2.3, 2.2], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 60 / 110, repeat: Infinity, ease: 'easeInOut' }}
              />
              <IntroSyncAvatar size={220} mood={avatarMood} level={avatarLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking waveform — wider, more bars, color sweep ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.2, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-[2px] h-6 mb-6"
            >
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{ background: `linear-gradient(to top, ${AGENT_SEGMENTS[i % 10]?.color || '#a855f7'}66, ${AGENT_SEGMENTS[i % 10]?.color || '#06b6d4'})` }}
                  animate={{ height: [2, 14 + Math.sin(i * 0.5) * 10, 2] }}
                  transition={{ duration: 0.35 + (i % 4) * 0.05, repeat: Infinity, delay: i * 0.035, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Loading indicator — waiting for premium voice ─── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 mb-4"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400/60"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Lyric Display — words illuminate with narration ─── */}
        <AnimatePresence mode="wait">
          {phase >= 0 && transcript && (
            <motion.div
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -12, filter: 'blur(6px)', transition: { duration: 0.35 } }}
              transition={{ duration: 0.4 }}
              className="text-center mb-10 max-w-2xl mx-auto relative"
            >
              {/* Glow behind text */}
              <motion.div
                className="absolute inset-0 -inset-x-12 -inset-y-6 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, transparent 60%)', filter: 'blur(20px)' }}
                animate={speaking ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.2 }}
                transition={{ duration: 60 / 110 * 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <LyricDisplay
                text={transcript}
                durationMs={currentDuration}
                speaking={speaking}
                className="text-white/90 text-xl sm:text-2xl md:text-[1.9rem] leading-relaxed font-light tracking-[-0.01em] relative z-10"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Module Icons — wave reveal with rhythmic glow ─── */}
        <AnimatePresence>
          {showModules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 mb-10 flex-wrap"
            >
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                // Wave effect — each icon offsets from center
                const waveY = Math.sin((i - 4.5) * 0.4) * 8;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0, y: 50, rotate: -15 + i * 3 }}
                    animate={{ opacity: 1, scale: 1, y: waveY, rotate: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.8, type: 'spring', stiffness: 200, damping: 18 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-sm"
                      style={{
                        border: `1px solid ${mod.color}20`,
                        background: `linear-gradient(135deg, ${mod.color}0A, ${mod.color}03)`,
                      }}
                      animate={{
                        boxShadow: [`0 0 0px ${mod.color}00`, `0 0 24px ${mod.color}25`, `0 0 0px ${mod.color}00`],
                        borderColor: [`${mod.color}20`, `${mod.color}55`, `${mod.color}20`],
                        y: [0, -3, 0],
                      }}
                      transition={{ duration: 2 + i * 0.15, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                    >
                      <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${mod.color}15, transparent 70%)` }}
                        animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.12 }} />
                      <Icon className="w-6 h-6 relative z-10" style={{ color: mod.color }} />
                    </motion.div>
                    <motion.span
                      className="text-[10px] font-medium tracking-wider"
                      style={{ color: mod.color + '80' }}
                      animate={{ opacity: [0.5, 0.9, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.12 }}
                    >
                      {mod.label}
                    </motion.span>
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

        {/* ─── Stats — count-up with glow ─── */}
        <AnimatePresence>
          {showStats && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center justify-center gap-6 sm:gap-10 md:gap-14 mb-8">
              {[
                { value: '51', label: 'AI Actions', color: '#a855f7' },
                { value: '10', label: 'Engines', color: '#06b6d4' },
                { value: '30+', label: 'Integrations', color: '#f59e0b' },
                { value: '11', label: 'Languages', color: '#3b82f6' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                  className="text-center"
                >
                  <motion.div
                    className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                    style={{ color: stat.color }}
                    animate={{ textShadow: [`0 0 0px ${stat.color}00`, `0 0 20px ${stat.color}40`, `0 0 0px ${stat.color}00`] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.2em] mt-1.5 font-medium">{stat.label}</div>
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
