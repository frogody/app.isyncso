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

// ─── Modern Electronic Beat Engine (~108 BPM) ──────────────────────────────
// Clean, minimal electronic production — Apple keynote energy.
// Tight kick, crisp clap, shuffled trap hi-hats, deep sub bass,
// crystal FM pluck melody, airy filtered pad. LOW volume behind voice.
function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let started = false;
  let beatTimer = null;
  let currentIntensity = 0.3;

  // Modulatable nodes
  let hatGainNode = null;
  let clapGainNode = null;
  let pluckGainNode = null;
  let padFilters = [];

  const BPM = 108;
  const beat = 60 / BPM;
  const sixteenth = beat / 4;

  // Minimal 4-chord progression: Am → F → C → G (uplifting pop in C major)
  const BASS_ROOTS = [110.00, 87.31, 130.81, 98.00]; // A2, F2, C3, G2
  // Pluck melody notes per chord (arpeggiated)
  const PLUCK_NOTES = [
    [440, 523.25, 659.25, 523.25],  // Am: A4 C5 E5 C5
    [349.23, 440, 523.25, 440],      // F:  F4 A4 C5 A4
    [523.25, 659.25, 783.99, 659.25],// C:  C5 E5 G5 E5
    [392, 493.88, 587.33, 493.88],   // G:  G4 B4 D5 B4
  ];
  // Pad voicings (wide, airy)
  const PAD_CHORDS = [
    [110, 164.81, 220, 329.63],  // Am spread
    [87.31, 130.81, 174.61, 261.63], // F spread
    [130.81, 196, 261.63, 392],  // C spread
    [98, 146.83, 196, 293.66],   // G spread
  ];

  const start = () => {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      // ── Clean plate reverb (short, bright) ──
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.18;
      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.25;
      [0.031, 0.059, 0.089, 0.131].forEach(t => {
        const d = ctx.createDelay(1);
        d.delayTime.value = t;
        const fb = ctx.createGain();
        fb.gain.value = 0.12;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 5000 - t * 8000;
        d.connect(filt); filt.connect(fb); fb.connect(d);
        filt.connect(reverbGain); reverbSend.connect(d);
      });
      reverbGain.connect(masterGain);

      // ── Stereo delay for pluck (ping-pong feel via two delays) ──
      const delayL = ctx.createDelay(1);
      const delayR = ctx.createDelay(1);
      const delayGainL = ctx.createGain();
      const delayGainR = ctx.createGain();
      delayL.delayTime.value = beat * 0.75; // dotted eighth
      delayR.delayTime.value = beat * 0.5;
      delayGainL.gain.value = 0.2;
      delayGainR.gain.value = 0.15;
      const delaySend = ctx.createGain();
      delaySend.gain.value = 0.3;
      delaySend.connect(delayL); delaySend.connect(delayR);
      delayL.connect(delayGainL); delayR.connect(delayGainR);
      delayGainL.connect(masterGain); delayGainR.connect(masterGain);

      // ── Bus gains ──
      hatGainNode = ctx.createGain();
      hatGainNode.gain.value = 0.07;
      hatGainNode.connect(masterGain);

      clapGainNode = ctx.createGain();
      clapGainNode.gain.value = 0.10;
      clapGainNode.connect(masterGain);
      clapGainNode.connect(reverbSend);

      const kickBus = ctx.createGain();
      kickBus.gain.value = 0.30;
      kickBus.connect(masterGain);

      const bassBus = ctx.createGain();
      bassBus.gain.value = 0.22;
      bassBus.connect(masterGain);

      pluckGainNode = ctx.createGain();
      pluckGainNode.gain.value = 0.05;
      pluckGainNode.connect(masterGain);
      pluckGainNode.connect(delaySend);
      pluckGainNode.connect(reverbSend);

      // ── Airy Pad (saw-like via detuned triangles, heavy LP filter) ──
      const padGain = ctx.createGain();
      padGain.gain.value = 0.020;
      padFilters = [];
      const padOscs = [];
      PAD_CHORDS[0].forEach((freq, i) => {
        [-7, 0, 7].forEach(det => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.detune.value = det + (Math.random() - 0.5) * 4;
          const lfo = ctx.createOscillator();
          const lfoG = ctx.createGain();
          lfo.type = 'sine';
          lfo.frequency.value = 0.04 + i * 0.015;
          lfoG.gain.value = 3;
          lfo.connect(lfoG); lfoG.connect(osc.detune); lfo.start();
          if (padFilters.length <= i) {
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = 400 + i * 80;
            f.Q.value = 0.6;
            padFilters.push(f);
            f.connect(padGain);
          }
          osc.connect(padFilters[Math.min(i, padFilters.length - 1)]);
          osc.start();
          padOscs.push(osc);
        });
      });
      padGain.connect(masterGain);

      // ── Beat state ──
      let nextBeatTime = ctx.currentTime + 0.1;
      let beatCount = 0;
      let chordIndex = 0;
      let chordBeatCount = 0;
      let pluckNoteIdx = 0;

      // === Tight Electronic Kick (punchy 808-style) ===
      const playKick = (time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        // Click transient
        const click = ctx.createOscillator();
        const clickG = ctx.createGain();
        click.type = 'square';
        click.frequency.value = 1800;
        clickG.gain.setValueAtTime(0.15, time);
        clickG.gain.exponentialRampToValueAtTime(0.001, time + 0.008);
        click.connect(clickG); clickG.connect(kickBus);
        click.start(time); click.stop(time + 0.015);
        osc.connect(gain); gain.connect(kickBus);
        osc.start(time); osc.stop(time + 0.3);
      };

      // === Electronic Clap (layered noise bursts) ===
      const playClap = (time) => {
        [0, 0.012, 0.025].forEach(offset => {
          const bufLen = Math.floor(ctx.sampleRate * 0.08);
          const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
          const noise = ctx.createBufferSource();
          noise.buffer = buf;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 2800 + Math.random() * 800;
          bp.Q.value = 1.5;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.55, time + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.09);
          noise.connect(bp); bp.connect(gain); gain.connect(clapGainNode);
          noise.start(time + offset); noise.stop(time + offset + 0.12);
        });
      };

      // === Crisp Hi-Hat (tight filtered noise) ===
      const playHiHat = (time, open = false, velocity = 1.0) => {
        const dur = open ? 0.12 : 0.025;
        const bufLen = Math.floor(ctx.sampleRate * dur * 2.5);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 8500; hp.Q.value = 0.8;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 14000;
        const gain = ctx.createGain();
        const vol = (open ? 0.3 : 0.18) * velocity;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        noise.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(hatGainNode);
        noise.start(time); noise.stop(time + dur + 0.01);
      };

      // === FM Pluck (crystal bell/marimba) ===
      const playPluck = (time, freq) => {
        // Carrier
        const car = ctx.createOscillator();
        const carGain = ctx.createGain();
        car.type = 'sine';
        car.frequency.value = freq;
        carGain.gain.setValueAtTime(0.4, time);
        carGain.gain.exponentialRampToValueAtTime(0.15, time + 0.08);
        carGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
        // Modulator (FM)
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        mod.type = 'sine';
        mod.frequency.value = freq * 3;
        modGain.gain.setValueAtTime(freq * 2.5, time);
        modGain.gain.exponentialRampToValueAtTime(freq * 0.1, time + 0.15);
        mod.connect(modGain); modGain.connect(car.frequency);
        car.connect(carGain); carGain.connect(pluckGainNode);
        mod.start(time); car.start(time);
        mod.stop(time + 0.9); car.stop(time + 0.9);
      };

      // === Sub Bass ===
      let currentBassOsc = null;
      let currentBassGain = null;
      const startBassNote = (time, freq) => {
        if (currentBassOsc) {
          try {
            currentBassGain.gain.cancelScheduledValues(time - 0.01);
            currentBassGain.gain.setValueAtTime(currentBassGain.gain.value, time - 0.01);
            currentBassGain.gain.linearRampToValueAtTime(0, time + 0.04);
            currentBassOsc.stop(time + 0.08);
          } catch (_) {}
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        osc.type = 'sine'; osc.frequency.value = freq;
        lp.type = 'lowpass'; lp.frequency.value = 180; lp.Q.value = 0.5;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.65, time + 0.03);
        osc.connect(lp); lp.connect(gain); gain.connect(bassBus);
        osc.start(time);
        currentBassOsc = osc; currentBassGain = gain;
      };

      // === Morph pad ===
      const morphPad = (time, chordFreqs) => {
        let oi = 0;
        chordFreqs.forEach(freq => {
          [-7, 0, 7].forEach(() => {
            if (oi < padOscs.length) {
              padOscs[oi].frequency.cancelScheduledValues(time);
              padOscs[oi].frequency.setValueAtTime(padOscs[oi].frequency.value, time);
              padOscs[oi].frequency.linearRampToValueAtTime(freq, time + 0.6);
            }
            oi++;
          });
        });
      };

      // ── Main beat loop ──
      const scheduleBeat = () => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const lookAhead = 0.1;

        while (nextBeatTime < now + lookAhead) {
          const t = Math.max(nextBeatTime, now);
          const pos = beatCount % 16; // 0-15 (16th notes in one bar)

          // ── Kick: beats 1 and 3 (four-on-the-floor energy) ──
          if (pos === 0 || pos === 8) {
            playKick(t);
          }
          // ── Extra kick on beat 4-and (pos 13) for drive ──
          if (pos === 13 && Math.random() < 0.3) {
            playKick(t);
          }

          // ── Clap on beats 2 and 4 ──
          if (pos === 4 || pos === 12) {
            playClap(t);
          }

          // ── Hi-hats: every 16th with velocity variation ──
          const isOffbeat = pos % 2 === 1;
          const isOpen = pos === 2 || pos === 10;
          const velocity = isOffbeat ? 0.5 + Math.random() * 0.3 : 0.8 + Math.random() * 0.2;
          playHiHat(t, isOpen, velocity);

          // ── Occasional 32nd-note hat roll (fill) ──
          if (pos === 14 && Math.random() < 0.35) {
            playHiHat(t + sixteenth * 0.5, false, 0.4);
          }
          if (pos === 15 && Math.random() < 0.4) {
            playHiHat(t + sixteenth * 0.33, false, 0.35);
            playHiHat(t + sixteenth * 0.66, false, 0.3);
          }

          // ── Pluck melody: one note per beat (every 4 sixteenths) ──
          if (pos % 4 === 0) {
            const noteIdx = (pos / 4) % 4;
            const freq = PLUCK_NOTES[chordIndex][noteIdx];
            playPluck(t, freq);
            pluckNoteIdx++;
          }

          // ── Chord change: every 2 bars (32 sixteenths) ──
          if (chordBeatCount === 0) {
            startBassNote(t, BASS_ROOTS[chordIndex]);
            morphPad(t, PAD_CHORDS[chordIndex]);
          }

          beatCount++;
          chordBeatCount++;
          if (chordBeatCount >= 32) {
            chordBeatCount = 0;
            chordIndex = (chordIndex + 1) % 4;
          }

          nextBeatTime += sixteenth;
        }
      };

      const beatLoop = () => {
        scheduleBeat();
        beatTimer = setTimeout(beatLoop, 40);
      };
      beatTimer = setTimeout(beatLoop, 40);

      // Fade in over 2.5s
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 2.5);
      started = true;
    } catch (_) {}
  };

  const setIntensity = (val) => {
    if (!ctx || !masterGain) return;
    currentIntensity = val;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0.32 + val * 0.14, t + 0.4);
    if (hatGainNode) {
      hatGainNode.gain.cancelScheduledValues(t);
      hatGainNode.gain.setValueAtTime(hatGainNode.gain.value, t);
      hatGainNode.gain.linearRampToValueAtTime(0.05 + val * 0.07, t + 0.3);
    }
    if (clapGainNode) {
      clapGainNode.gain.cancelScheduledValues(t);
      clapGainNode.gain.setValueAtTime(clapGainNode.gain.value, t);
      clapGainNode.gain.linearRampToValueAtTime(0.08 + val * 0.06, t + 0.3);
    }
    if (pluckGainNode) {
      pluckGainNode.gain.cancelScheduledValues(t);
      pluckGainNode.gain.setValueAtTime(pluckGainNode.gain.value, t);
      pluckGainNode.gain.linearRampToValueAtTime(0.04 + val * 0.04, t + 0.3);
    }
    padFilters.forEach((f, i) => {
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(f.frequency.value, t);
      f.frequency.linearRampToValueAtTime(400 + i * 80 + val * 1200, t + 0.5);
    });
  };

  const stop = () => {
    if (!ctx || !masterGain) return;
    if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => {
      try { ctx.close(); } catch (_) {}
      ctx = null; masterGain = null;
      hatGainNode = null; clapGainNode = null; pluckGainNode = null;
      padFilters = []; started = false;
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

    // Init particles — more variety, aurora-ready
    const N = 260;
    st.particles = Array.from({ length: N }).map(() => {
      const layer = Math.random();
      const isAurora = layer > 0.82; // ~18% of particles are aurora ribbon particles
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: layer,
        s: isAurora ? 1.2 + Math.random() * 2.5 : 0.3 + Math.random() * 1.5,
        baseAlpha: isAurora ? 0.06 + Math.random() * 0.12 : 0.1 + Math.random() * 0.5,
        pulse: Math.random() * Math.PI * 2,
        speed: isAurora ? 0.008 + Math.random() * 0.02 : 0.02 + Math.random() * 0.08,
        hue: isAurora
          ? (Math.random() > 0.5 ? 180 + Math.random() * 30 : 260 + Math.random() * 30)
          : (Math.random() > 0.85 ? (Math.random() > 0.5 ? 270 : 190) : 0),
        isAurora,
        auroraPhase: Math.random() * Math.PI * 2,
        auroraAmplitude: 30 + Math.random() * 60,
        originX: Math.random() * window.innerWidth,
      };
    });

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

      // ── Aurora ribbon pass (soft flowing color bands behind particles) ──
      ctx.globalCompositeOperation = 'screen';
      for (const p of st.particles) {
        if (!p.isAurora) continue;
        p.auroraPhase += 0.003 + st.intensity * 0.002;
        const waveX = p.originX + Math.sin(p.auroraPhase) * p.auroraAmplitude;
        const waveY = p.y + Math.cos(p.auroraPhase * 0.7 + p.originX * 0.001) * 20;
        const aAlpha = p.baseAlpha * (0.5 + st.intensity * 0.5);
        const grad = ctx.createRadialGradient(waveX, waveY, 0, waveX, waveY, p.s * 8);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 65%, ${aAlpha})`);
        grad.addColorStop(0.5, `hsla(${p.hue}, 70%, 55%, ${aAlpha * 0.3})`);
        grad.addColorStop(1, `hsla(${p.hue}, 60%, 45%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(waveX, waveY, p.s * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // ── Star particles pass ──
      for (const p of st.particles) {
        p.pulse += p.speed;
        const pulseVal = (Math.sin(p.pulse) + 1) * 0.5;
        const alpha = p.baseAlpha * (0.4 + st.intensity * 0.6) * (0.6 + pulseVal * 0.4);
        const size = p.s * (0.8 + st.intensity * 0.3 + pulseVal * 0.2);

        if (p.isAurora) {
          // Aurora particles drift in sine waves
          p.y -= 0.08 * (1 + st.intensity);
          p.x = p.originX + Math.sin(p.auroraPhase) * p.auroraAmplitude;
          if (p.y < -20) { p.y = h + 20; p.originX = Math.random() * w; p.x = p.originX; }
        } else {
          // Regular particles drift upward
          p.y -= p.z * 0.15 * (1 + st.intensity);
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        }

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
// Active word glows with gradient, past words dim, future words invisible.
// Uses audioDuration (actual TTS length) when available, falls back to durationMs.
function LyricDisplay({ text, durationMs = 5000, audioDuration, speaking, className = '' }) {
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
      // Use actual audio duration if available, otherwise fall back to minMs
      const effectiveDuration = audioDuration ? audioDuration * 1000 : durationMs;
      const msPerWord = (effectiveDuration * 0.85) / words.length;
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
  }, [text, speaking, durationMs, audioDuration, words.length]);

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
                scale: isActive ? 1.05 : 1,
              } : {
                opacity: 0,
                y: 10,
                filter: 'blur(8px)',
                scale: 0.97,
              }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block"
              style={isActive ? {
                background: 'linear-gradient(90deg, #06b6d4, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 18px rgba(6,182,212,0.5)) drop-shadow(0 0 40px rgba(168,85,247,0.3))',
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
    { key: 'greeting', text: `${n} — welcome. I'm SYNC. The intelligence behind iSyncSO. And right now, every part of me is focused on ${c}.`, minMs: 5000 },
    { key: 'engines', text: `Ten engines. CRM. Finance. Growth. Talent. Learn. Create. Products. Raise. Sentinel. Analytics. Individually powerful. Together? Unstoppable.`, minMs: 6000 },
    { key: 'orchestrator', text: `Fifty-one actions. All voice-controlled. Draft an invoice. Enrich a lead. Match a candidate. Generate a campaign visual. You speak — I execute. Instantly.`, minMs: 6000 },
    { key: 'activity', text: `Every move your team makes — every decision, every deal, every conversation — captured in real time. I even write your daily journals. Nothing slips through.`, minMs: 6000 },
    { key: 'integrations', text: `Slack, HubSpot, Gmail, Stripe — over thirty integrations, one workspace. EU AI Act compliance? Built in from day one. You're already ahead.`, minMs: 6000 },
    { key: 'ready', text: `Now — let me show you what this actually feels like. Step inside.`, minMs: 3500 },
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
          let resolvedDuration = null;

          // Read actual audio duration when metadata loads
          audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && isFinite(audio.duration)) {
              resolvedDuration = audio.duration;
            }
          });

          audio.onplaying = () => {
            if (!started) {
              started = true;
              // Pass actual audio duration (seconds) to onStart
              // If loadedmetadata already fired, use it; otherwise try audio.duration
              const dur = resolvedDuration || (audio.duration && isFinite(audio.duration) ? audio.duration : null);
              onStart?.(dur);
            }
          };
          const done = () => {
            audioRef.current = null;
            if (!started) {
              started = true;
              onStart?.(null);
            }
            resolve();
            onDone?.();
          };
          audio.onended = done; audio.onerror = done;
          audio.play().then(() => {
            if (!started) {
              started = true;
              const dur = resolvedDuration || (audio.duration && isFinite(audio.duration) ? audio.duration : null);
              onStart?.(dur);
            }
          }).catch(done);
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
      onStart?.(null);
      const w = Math.max(3000, text.length * 45);
      setTimeout(() => { resolve(); onDone?.(); }, w);
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : 'en-US';
      u.rate = 1.25;
      u.onstart = () => onStart?.(null);
      const done = () => { resolve(); onDone?.(); };
      u.onend = done; u.onerror = done; window.speechSynthesis.speak(u);
    } catch (_) {
      onStart?.(null);
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
  const [audioDuration, setAudioDuration] = useState(null); // actual TTS audio duration in seconds
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
    setAudioDuration(null);
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
    // Now receives actual audio duration (seconds) from speakText
    const handleAudioStart = (actualDuration) => {
      if (!mountedRef.current) return;
      setLoading(false);
      setSpeaking(true);
      // Store actual audio duration for LyricDisplay pacing
      if (actualDuration && isFinite(actualDuration)) {
        setAudioDuration(actualDuration);
      }
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

  const BPM_VISUAL = 108;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none" style={{ cursor: 'none' }}>

      {/* ─── Perspective Grid Floor (Apple keynote style) ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ perspective: '800px' }}>
        <motion.div
          className="absolute left-1/2 bottom-0 -translate-x-1/2"
          style={{
            width: '200vw', height: '60vh',
            transformOrigin: 'bottom center',
            transform: 'rotateX(65deg)',
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 80%)',
          }}
          animate={{ backgroundPositionY: ['0px', '-60px'] }}
          transition={{ duration: 60 / 108 * 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ─── Animated Gradient Mesh Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.18) 0%, transparent 50%)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 80% 30%, rgba(168,85,247,0.14) 0%, transparent 45%)' }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.10) 0%, transparent 45%)' }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 40%)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* ─── Horizontal Light Beam (lens flare) ─── */}
      <motion.div
        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none"
        style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.15) 20%, rgba(168,85,247,0.2) 50%, rgba(6,182,212,0.15) 80%, transparent)',
          filter: 'blur(6px)',
        }}
        animate={{ opacity: speaking ? [0.3, 0.8, 0.3] : [0.05, 0.15, 0.05], scaleY: speaking ? [1, 3, 1] : [1, 1.5, 1] }}
        transition={{ duration: 60 / 108, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ─── Particle Starfield ─── */}
      <StarfieldCanvas speaking={speaking} phase={phase} />

      {/* ─── Cinematic Background Layers ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Beat pulse — clean flash on every quarter note */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(6,182,212,0.08) 0%, transparent 40%)' }}
          animate={speaking ? { opacity: [0, 1, 0] } : { opacity: 0 }}
          transition={{ duration: 60 / BPM_VISUAL, repeat: Infinity, ease: 'easeOut' }}
        />

        {/* Central focus light — clean, concentrated */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '140vw', height: '140vh', background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, rgba(168,85,247,0.05) 20%, transparent 50%)' }}
          animate={{ scale: speaking ? [1, 1.08, 1] : [1, 1.03, 1] }}
          transition={{ duration: 60 / BPM_VISUAL * 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Flowing gradient orbs — cleaner Apple aesthetic */}
        <motion.div className="absolute w-[900px] h-[900px] rounded-full" style={{ top: '-10%', left: '-5%', background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 50%)', filter: 'blur(100px)' }}
          animate={{ x: [0, 60, 0], y: [0, -40, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[800px] h-[800px] rounded-full" style={{ bottom: '-8%', right: '-5%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 50%)', filter: 'blur(90px)' }}
          animate={{ x: [0, -50, 0], y: [0, 35, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full" style={{ top: '40%', right: '10%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 50%)', filter: 'blur(80px)' }}
          animate={{ x: [0, 40, 0], y: [0, -50, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 6 }} />

        {/* Vignette — tighter for more focus */}
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
      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center px-6">

        {/* ─── SYNC Avatar — Dramatic Cinematic Entrance with Rotating Rings ─── */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.02, filter: 'blur(60px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 relative"
            >
              {/* Light burst on entrance */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, rgba(168,85,247,0.2) 30%, transparent 60%)', transform: 'scale(4)' }}
                initial={{ opacity: 0.8, scale: 0.5 }}
                animate={{ opacity: 0, scale: 5 }}
                transition={{ duration: 2.5, ease: 'easeOut' }}
              />

              {/* Beat pulse ring — clean concentric */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 65%)', transform: 'scale(2.8)' }}
                animate={speaking ? { scale: [2.8, 3.2, 2.8], opacity: [0.25, 0.65, 0.25] } : { scale: [2.8, 2.9, 2.8], opacity: [0.08, 0.15, 0.08] }}
                transition={{ duration: 60 / BPM_VISUAL, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Concentric rotating ring 1 — outermost, slow */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -30,
                  border: '1px solid rgba(6,182,212,0.12)',
                  borderTopColor: 'rgba(6,182,212,0.4)',
                  borderRightColor: 'rgba(168,85,247,0.3)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              />

              {/* Concentric rotating ring 2 — middle, medium speed, opposite */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -18,
                  border: '1px solid rgba(168,85,247,0.1)',
                  borderBottomColor: 'rgba(236,72,153,0.35)',
                  borderLeftColor: 'rgba(6,182,212,0.25)',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />

              {/* Concentric rotating ring 3 — inner, dashed, fast */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -8,
                  border: '1px dashed rgba(139,92,246,0.15)',
                  borderTopColor: 'rgba(139,92,246,0.4)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />

              <IntroSyncAvatar size={240} mood={avatarMood} level={avatarLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking Visualizer — wide frequency analyzer ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.1, scaleY: 0.3 }}
              animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-end justify-center gap-[2px] h-16 mb-8"
            >
              {[...Array(40)].map((_, i) => {
                const center = 20;
                const dist = Math.abs(i - center) / center;
                const maxH = 50 * (1 - dist * 0.6);
                const col = AGENT_SEGMENTS[i % 10]?.color || '#06b6d4';
                return (
                  <motion.div
                    key={i}
                    className="w-[2.5px] rounded-full origin-bottom"
                    style={{
                      background: `linear-gradient(to top, ${col}44, ${col})`,
                      boxShadow: `0 0 8px ${col}40`,
                    }}
                    animate={{ height: [2, maxH + Math.sin(i * 0.3) * 12, 2] }}
                    transition={{
                      duration: 0.22 + (i % 7) * 0.03,
                      repeat: Infinity,
                      delay: i * 0.015,
                      ease: 'easeInOut',
                    }}
                  />
                );
              })}
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
              className="flex items-center gap-2 mb-6"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple-400/70"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Subtle divider ─── */}
        {phase >= 0 && speaking && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.15, scaleX: 1 }}
            className="w-48 h-px mb-6"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(6,182,212,0.6), transparent)' }}
          />
        )}

        {/* ─── Lyric Display — frosted glass panel, bigger text ─── */}
        <AnimatePresence mode="wait">
          {phase >= 0 && transcript && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, filter: 'blur(8px)', transition: { duration: 0.35 } }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10 max-w-3xl mx-auto relative"
            >
              {/* Frosted glass panel */}
              <div
                className="absolute -inset-x-8 -inset-y-5 rounded-3xl pointer-events-none"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              />

              {/* Glow behind text */}
              <motion.div
                className="absolute -inset-x-16 -inset-y-8 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 60%)', filter: 'blur(25px)' }}
                animate={speaking ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.2 }}
                transition={{ duration: 60 / BPM_VISUAL * 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <LyricDisplay
                text={transcript}
                durationMs={currentDuration}
                audioDuration={audioDuration}
                speaking={speaking}
                className="text-white/95 text-3xl sm:text-4xl md:text-5xl leading-relaxed font-light tracking-[-0.02em] relative z-10"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Subtle divider before modules ─── */}
        {showModules && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.1, scaleX: 1 }}
            transition={{ duration: 0.8 }}
            className="w-64 h-px mb-8"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
          />
        )}

        {/* ─── Module Icons — wave reveal with vibrant glow, BIGGER ─── */}
        <AnimatePresence>
          {showModules && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-center gap-4 sm:gap-5 md:gap-6 mb-10 flex-wrap"
            >
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                const waveY = Math.sin((i - 4.5) * 0.35) * 6;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0, y: 60 }}
                    animate={{ opacity: 1, scale: 1, y: waveY }}
                    transition={{ delay: i * 0.05, duration: 0.7, type: 'spring', stiffness: 250, damping: 20 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <motion.div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        border: `1px solid ${mod.color}25`,
                        background: `linear-gradient(145deg, ${mod.color}10, rgba(0,0,0,0.3))`,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                      animate={{
                        boxShadow: [`0 0 0px ${mod.color}00, 0 4px 20px rgba(0,0,0,0.3)`, `0 0 24px ${mod.color}30, 0 4px 20px rgba(0,0,0,0.3)`, `0 0 0px ${mod.color}00, 0 4px 20px rgba(0,0,0,0.3)`],
                        y: [0, -3, 0],
                      }}
                      transition={{ duration: 2.5 + i * 0.12, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" style={{ color: mod.color, filter: `drop-shadow(0 0 6px ${mod.color}50)` }} />
                    </motion.div>
                    <motion.span
                      className="text-[10px] sm:text-[11px] font-semibold tracking-[0.15em] uppercase"
                      style={{ color: mod.color + '80' }}
                      animate={{ opacity: [0.5, 0.9, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
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
                      border: `1px solid ${isActive ? feat.color + '30' : 'rgba(255,255,255,0.03)'}`,
                      background: isActive ? `linear-gradient(145deg, ${feat.color}0D, ${feat.color}05)` : 'rgba(255,255,255,0.005)',
                      backdropFilter: isActive ? 'blur(12px)' : 'none',
                    }}
                  >
                    {isActive && (
                      <motion.div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${feat.color}20, transparent)` }}
                        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} />
                    )}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 relative z-10"
                      style={{ background: isActive ? `${feat.color}15` : 'rgba(255,255,255,0.02)' }}>
                      <Icon className="w-6 h-6" style={{ color: isActive ? feat.color : '#3f3f46' }} />
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
                    className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
                    style={{ color: stat.color }}
                    animate={{ textShadow: [`0 0 0px ${stat.color}00`, `0 0 25px ${stat.color}50`, `0 0 0px ${stat.color}00`] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-[0.2em] mt-1.5 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Progress — more visible ─── */}
        {phase >= 0 && phase < script.length && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {script.map((_, i) => (
              <motion.div key={i} className="h-[3px] rounded-full"
                animate={{
                  width: i === phase ? 40 : 8,
                  backgroundColor: i < phase ? 'rgba(168,85,247,0.5)' : i === phase ? 'rgba(168,85,247,0.9)' : 'rgba(63,63,70,0.4)',
                  boxShadow: i === phase ? '0 0 8px rgba(168,85,247,0.4)' : '0 0 0px transparent',
                }}
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
