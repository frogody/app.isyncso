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

// ─── R&B / Pop Beat Engine (~88 BPM) ─────────────────────────────────────────
// Smooth R&B production: kick, snare w/ ghosts, swung 16th hi-hats,
// sine bass on chord roots, Rhodes-style chords, warm pad, FDN reverb.
// Everything at LOW volume — sits behind voice narration.
function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let started = false;
  let beatTimer = null;
  let currentIntensity = 0.3;

  // Nodes we need to modulate via setIntensity
  let hatGainNode = null;
  let snareGainNode = null;
  let rhodesGainNode = null;
  let padFilters = [];

  const BPM = 88;
  const beat = 60 / BPM;               // ~0.6818s per beat
  const sixteenth = beat / 4;           // ~0.1705s
  const swingAmount = 0.032;            // seconds — subtle swing on even 16ths

  // Chord progression (2 bars each, repeating): Abm7, Emaj7, Bmaj7, Gbmaj7
  // Bass roots:
  const BASS_ROOTS = [103.83, 82.41, 123.47, 92.50]; // Ab2, E2, B2, Gb2

  // Rhodes chord voicings (frequencies for each chord)
  const RHODES_CHORDS = [
    // Abm7: Ab3, Cb4(B3), Eb4, Gb4
    [207.65, 246.94, 311.13, 369.99],
    // Emaj7: E3, G#3, B3, D#4
    [164.81, 207.65, 246.94, 311.13],
    // Bmaj7: B3, D#4, F#4, A#4
    [246.94, 311.13, 369.99, 466.16],
    // Gbmaj7: Gb3, Bb3, Db4, F4
    [185.00, 233.08, 277.18, 349.23],
  ];

  // Warm pad voicings (lower, wider — triangle waves)
  const PAD_CHORDS = [
    [103.83, 155.56, 207.65, 311.13],   // Abm spread
    [82.41, 123.47, 164.81, 246.94],     // E spread
    [123.47, 185.00, 246.94, 369.99],    // B spread
    [92.50, 138.59, 185.00, 277.18],     // Gb spread
  ];

  const start = () => {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      // ── Reverb via Feedback Delay Network ──
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.22;
      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.3;
      [0.043, 0.083, 0.127, 0.197].forEach(t => {
        const d = ctx.createDelay(1);
        d.delayTime.value = t;
        const fb = ctx.createGain();
        fb.gain.value = 0.15;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 3200 - t * 5000;
        d.connect(filt);
        filt.connect(fb);
        fb.connect(d);
        filt.connect(reverbGain);
        reverbSend.connect(d);
      });
      reverbGain.connect(masterGain);

      // ── Drum bus gains (so setIntensity can modulate them) ──
      hatGainNode = ctx.createGain();
      hatGainNode.gain.value = 0.08;
      hatGainNode.connect(masterGain);

      snareGainNode = ctx.createGain();
      snareGainNode.gain.value = 0.12;
      snareGainNode.connect(masterGain);
      snareGainNode.connect(reverbSend);

      const kickBus = ctx.createGain();
      kickBus.gain.value = 0.25;
      kickBus.connect(masterGain);

      // ── Bass gain ──
      const bassBus = ctx.createGain();
      bassBus.gain.value = 0.18;
      bassBus.connect(masterGain);

      // ── Rhodes gain ──
      rhodesGainNode = ctx.createGain();
      rhodesGainNode.gain.value = 0.06;
      rhodesGainNode.connect(masterGain);
      rhodesGainNode.connect(reverbSend);

      // ── Warm Pad (triangle waves, continuous, LP filtered) ──
      const padGain = ctx.createGain();
      padGain.gain.value = 0.025;
      padFilters = [];

      // Start with first chord, we'll morph pad frequencies on chord changes
      const padOscs = [];
      PAD_CHORDS[0].forEach((freq, i) => {
        [-5, 5].forEach(det => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.detune.value = det + (Math.random() - 0.5) * 3;

          // Slow drift LFO
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.type = 'sine';
          lfo.frequency.value = 0.05 + i * 0.02;
          lfoGain.gain.value = 4;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.detune);
          lfo.start();

          // LP filter per voice
          if (padFilters.length <= i) {
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = 500 + i * 100;
            f.Q.value = 0.8;
            padFilters.push(f);
            f.connect(padGain);
          }

          osc.connect(padFilters[Math.min(i, padFilters.length - 1)]);
          osc.start();
          padOscs.push(osc);
        });
      });
      padGain.connect(masterGain);

      // ── Beat scheduling via lookahead timer ──
      let nextBeatTime = ctx.currentTime + 0.1;
      let beatCount = 0;       // 16th note counter
      let chordIndex = 0;      // which chord in the progression (0-3)
      let chordBeatCount = 0;  // 16ths elapsed in current 2-bar section

      // === Drum Synthesizers (self-destructing) ===

      const playKick = (time) => {
        // Sine pitch sweep 150Hz -> 40Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
        gain.gain.setValueAtTime(0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(gain);
        gain.connect(kickBus);
        osc.start(time);
        osc.stop(time + 0.4);
      };

      const playSnare = (time, ghost = false) => {
        const vol = ghost ? 0.15 : 0.6;
        // Noise burst (filtered)
        const bufLen = Math.floor(ctx.sampleRate * 0.12);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = ghost ? 4500 : 3500;
        noiseFilter.Q.value = 1.2;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(vol, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + (ghost ? 0.06 : 0.15));
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(snareGainNode);
        noise.start(time);
        noise.stop(time + 0.2);

        // Sine tone body
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(ghost ? 220 : 185, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.04);
        oscGain.gain.setValueAtTime(vol * 0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        osc.connect(oscGain);
        oscGain.connect(snareGainNode);
        osc.start(time);
        osc.stop(time + 0.12);
      };

      const playHiHat = (time, open = false) => {
        const dur = open ? 0.15 : 0.04;
        const bufLen = Math.floor(ctx.sampleRate * dur * 2);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        hp.Q.value = 0.5;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 12000;
        const gain = ctx.createGain();
        const vol = open ? 0.35 : 0.2 + Math.random() * 0.1;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        noise.connect(hp);
        hp.connect(lp);
        lp.connect(gain);
        gain.connect(hatGainNode);
        noise.start(time);
        noise.stop(time + dur + 0.01);
      };

      // === Bass (sine, follows chord roots, 2 bars each) ===
      let currentBassOsc = null;
      let currentBassGain = null;

      const startBassNote = (time, freq) => {
        // Fade out previous if any
        if (currentBassOsc) {
          try {
            currentBassGain.gain.cancelScheduledValues(time - 0.01);
            currentBassGain.gain.setValueAtTime(currentBassGain.gain.value, time - 0.01);
            currentBassGain.gain.linearRampToValueAtTime(0, time + 0.05);
            currentBassOsc.stop(time + 0.1);
          } catch (_) {}
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.7, time + 0.05);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(bassBus);
        osc.start(time);
        currentBassOsc = osc;
        currentBassGain = gain;
      };

      // === Rhodes chords (multiple sine harmonics with bell-like decay) ===
      const playRhodesChord = (time, chordFreqs) => {
        chordFreqs.forEach((freq, noteIdx) => {
          // Fundamental + 2nd partial + 3rd partial
          [1, 2, 3].forEach((partial, pIdx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq * partial;
            // Bell-like decay: higher partials decay faster
            const vol = (0.3 / (pIdx + 1)) * (0.8 + Math.random() * 0.2);
            const decay = 1.8 - pIdx * 0.5;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(vol, time + 0.008);
            gain.gain.exponentialRampToValueAtTime(vol * 0.4, time + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
            osc.connect(gain);
            gain.connect(rhodesGainNode);
            osc.start(time);
            osc.stop(time + decay + 0.1);
          });
        });
      };

      // === Morph pad to new chord ===
      const morphPadChord = (time, chordFreqs) => {
        let oscIdx = 0;
        chordFreqs.forEach(freq => {
          [-5, 5].forEach(() => {
            if (oscIdx < padOscs.length) {
              padOscs[oscIdx].frequency.cancelScheduledValues(time);
              padOscs[oscIdx].frequency.setValueAtTime(padOscs[oscIdx].frequency.value, time);
              padOscs[oscIdx].frequency.linearRampToValueAtTime(freq, time + 0.8);
            }
            oscIdx++;
          });
        });
      };

      // ── Main beat scheduling loop (lookahead: schedule 100ms ahead, loop every 50ms) ──
      const scheduleBeat = () => {
        if (!ctx || ctx.state === 'closed') return;
        const now = ctx.currentTime;
        const lookAhead = 0.1;

        while (nextBeatTime < now + lookAhead) {
          const t = Math.max(nextBeatTime, now);
          const posInBar = beatCount % 16;    // 0-15 (16th notes in one bar)

          // Swing: every other 16th (the "e" and "a") gets slightly delayed
          const isSwung = posInBar % 2 === 1;

          // ── Kick on beats 1 and 3 (positions 0, 8) ──
          if (posInBar === 0 || posInBar === 8) {
            playKick(t);
          }

          // ── Snare on beats 2 and 4 (positions 4, 12) ──
          if (posInBar === 4 || posInBar === 12) {
            playSnare(t, false);
          }

          // ── Ghost snare hits (subtle, on specific 16ths) ──
          if (posInBar === 6 || posInBar === 10 || posInBar === 14) {
            if (Math.random() < 0.45) {
              playSnare(t, true);
            }
          }

          // ── Hi-hats on every 16th note ──
          const isOpenHat = posInBar === 2 || posInBar === 10;
          playHiHat(t, isOpenHat);

          // ── Rhodes chord (play at start of each 2-bar section) ──
          if (chordBeatCount === 0) {
            playRhodesChord(t, RHODES_CHORDS[chordIndex]);
            startBassNote(t, BASS_ROOTS[chordIndex]);
            morphPadChord(t, PAD_CHORDS[chordIndex]);
          }
          // Re-trigger Rhodes on beat 3 of bar 1 (position 8) for rhythm
          if (chordBeatCount === 8) {
            playRhodesChord(t + 0.01, RHODES_CHORDS[chordIndex]);
          }
          // Re-trigger on beat 1 of bar 2
          if (chordBeatCount === 16) {
            playRhodesChord(t + 0.01, RHODES_CHORDS[chordIndex]);
          }

          // Advance counters
          beatCount++;
          chordBeatCount++;

          // 2 bars = 32 sixteenth notes per chord
          if (chordBeatCount >= 32) {
            chordBeatCount = 0;
            chordIndex = (chordIndex + 1) % 4;
          }

          // Next 16th note time, with swing
          const swingDelay = isSwung ? swingAmount : 0;
          nextBeatTime += sixteenth + swingDelay;
        }
      };

      // Lookahead timer: check every 50ms, schedule 100ms ahead
      const beatLoop = () => {
        scheduleBeat();
        beatTimer = setTimeout(beatLoop, 50);
      };
      beatTimer = setTimeout(beatLoop, 50);

      // Fade in over 3 seconds to master gain ~0.35
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 3);
      started = true;
    } catch (_) {}
  };

  const setIntensity = (val) => {
    if (!ctx || !masterGain) return;
    currentIntensity = val;
    const t = ctx.currentTime;

    // Master volume adjusts slightly
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0.3 + val * 0.12, t + 0.5);

    // Open hi-hat and snare volume when speaking
    if (hatGainNode) {
      hatGainNode.gain.cancelScheduledValues(t);
      hatGainNode.gain.setValueAtTime(hatGainNode.gain.value, t);
      hatGainNode.gain.linearRampToValueAtTime(0.06 + val * 0.08, t + 0.4);
    }
    if (snareGainNode) {
      snareGainNode.gain.cancelScheduledValues(t);
      snareGainNode.gain.setValueAtTime(snareGainNode.gain.value, t);
      snareGainNode.gain.linearRampToValueAtTime(0.1 + val * 0.08, t + 0.4);
    }
    if (rhodesGainNode) {
      rhodesGainNode.gain.cancelScheduledValues(t);
      rhodesGainNode.gain.setValueAtTime(rhodesGainNode.gain.value, t);
      rhodesGainNode.gain.linearRampToValueAtTime(0.05 + val * 0.04, t + 0.4);
    }

    // Open pad filters for brightness when speaking
    padFilters.forEach((f, i) => {
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(f.frequency.value, t);
      f.frequency.linearRampToValueAtTime(500 + i * 100 + val * 900, t + 0.6);
    });
  };

  const stop = () => {
    if (!ctx || !masterGain) return;
    if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.8);
    setTimeout(() => {
      try { ctx.close(); } catch (_) {}
      ctx = null;
      masterGain = null;
      hatGainNode = null;
      snareGainNode = null;
      rhodesGainNode = null;
      padFilters = [];
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
      u.rate = 1.0;
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

  const BPM_VISUAL = 88;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none" style={{ cursor: 'none' }}>

      {/* ─── Animated Gradient Mesh Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Morphing gradient blobs */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.15) 0%, transparent 50%)' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 80% 30%, rgba(6,182,212,0.12) 0%, transparent 45%)' }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(236,72,153,0.1) 0%, transparent 45%)' }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 40%)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* ─── Animated Scan Lines ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.04 }}>
        <motion.div
          className="absolute left-0 right-0"
          style={{
            height: '200%',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)',
          }}
          animate={{ y: ['-50%', '0%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ─── Particle Starfield ─── */}
      <StarfieldCanvas speaking={speaking} phase={phase} />

      {/* ─── Cinematic Background Layers ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Beat pulse — subtle full-screen flash at BPM */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, transparent 50%)' }}
          animate={speaking ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
          transition={{ duration: 60 / BPM_VISUAL, repeat: Infinity, ease: 'easeOut' }}
        />

        {/* Central nebula — bigger, more vivid */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '180vw', height: '180vh', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.14) 0%, rgba(6,182,212,0.06) 18%, rgba(236,72,153,0.03) 30%, rgba(99,102,241,0.02) 42%, transparent 60%)' }}
          animate={{ scale: speaking ? [1, 1.1, 1] : [1, 1.04, 1], rotate: [0, 1.5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Flowing orbs — more movement, varied speeds */}
        <motion.div className="absolute w-[1000px] h-[1000px] rounded-full" style={{ top: '0%', left: '-8%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 55%)', filter: 'blur(80px)' }}
          animate={{ x: [0, 80, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[800px] h-[800px] rounded-full" style={{ bottom: '-5%', right: '-8%', background: 'radial-gradient(circle, rgba(236,72,153,0.07) 0%, transparent 55%)', filter: 'blur(70px)' }}
          animate={{ x: [0, -60, 0], y: [0, 45, 0], scale: [1, 1.25, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
        <motion.div className="absolute w-[700px] h-[700px] rounded-full" style={{ top: '35%', right: '8%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 55%)', filter: 'blur(60px)' }}
          animate={{ x: [0, 45, 0], y: [0, -60, 0], scale: [0.9, 1.15, 0.9] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 5 }} />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full" style={{ top: '15%', left: '35%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 55%)', filter: 'blur(60px)' }}
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 8 }} />

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
      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center px-6">

        {/* ─── SYNC Avatar — Dramatic Cinematic Entrance with Rotating Rings ─── */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.05, filter: 'blur(40px)', rotate: -30 }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', rotate: 0 }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 relative"
            >
              {/* Beat pulse ring behind avatar */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)', transform: 'scale(2.5)' }}
                animate={speaking ? { scale: [2.5, 2.9, 2.5], opacity: [0.3, 0.7, 0.3] } : { scale: [2.5, 2.6, 2.5], opacity: [0.1, 0.2, 0.1] }}
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

              <IntroSyncAvatar size={220} mood={avatarMood} level={avatarLevel} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking waveform — MUCH bigger, wider spread ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.2 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.2, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-[3px] h-12 mb-8"
            >
              {[...Array(25)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ background: `linear-gradient(to top, ${AGENT_SEGMENTS[i % 10]?.color || '#a855f7'}88, ${AGENT_SEGMENTS[i % 10]?.color || '#06b6d4'})` }}
                  animate={{ height: [3, 28 + Math.sin(i * 0.4) * 18, 3] }}
                  transition={{ duration: 0.3 + (i % 5) * 0.04, repeat: Infinity, delay: i * 0.025, ease: 'easeInOut' }}
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
                className="text-white/90 text-2xl sm:text-3xl md:text-4xl leading-relaxed font-light tracking-[-0.01em] relative z-10"
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
                      className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden backdrop-blur-sm"
                      style={{
                        border: `1px solid ${mod.color}30`,
                        background: `linear-gradient(135deg, ${mod.color}12, ${mod.color}06)`,
                      }}
                      animate={{
                        boxShadow: [`0 0 0px ${mod.color}00`, `0 0 32px ${mod.color}35`, `0 0 0px ${mod.color}00`],
                        borderColor: [`${mod.color}30`, `${mod.color}65`, `${mod.color}30`],
                        y: [0, -4, 0],
                      }}
                      transition={{ duration: 2 + i * 0.15, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                    >
                      <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${mod.color}20, transparent 70%)` }}
                        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.12 }} />
                      <Icon className="w-7 h-7 relative z-10" style={{ color: mod.color }} />
                    </motion.div>
                    <motion.span
                      className="text-[11px] font-semibold tracking-wider uppercase"
                      style={{ color: mod.color + '90' }}
                      animate={{ opacity: [0.6, 1, 0.6] }}
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
