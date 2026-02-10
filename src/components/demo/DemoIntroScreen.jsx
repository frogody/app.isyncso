import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OuterRing, InnerViz } from '@/pages/SyncAgent';
import {
  Brain, BarChart3, Shield, Puzzle, Activity,
  Rocket, Euro, GraduationCap, UserPlus, Palette, Package,
  TrendingUp, Contact, SkipForward, Sparkles,
} from 'lucide-react';

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

    // Init particles — subtle, refined
    const N = 150;
    st.particles = Array.from({ length: N }).map(() => {
      const layer = Math.random();
      const isAurora = layer > 0.88; // ~12% aurora ribbons
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: layer,
        s: isAurora ? 0.8 + Math.random() * 1.5 : 0.2 + Math.random() * 1.0,
        baseAlpha: isAurora ? 0.03 + Math.random() * 0.06 : 0.05 + Math.random() * 0.3,
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
      style={{ opacity: 0.5 }}
    />
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
                color: 'rgba(255,255,255,1)',
              } : (isPast || isFar) ? {
                color: `rgba(255,255,255,${isFar ? 0.3 : 0.55})`,
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
    { key: 'greeting', text: `Hey ${n}. This is SYNC. And what you're about to see was built for ${c}.`, minMs: 4000 },
    { key: 'problem', text: `Your tools don't talk to each other. Your data lives in silos. Your team wastes hours switching between apps. That ends today.`, minMs: 5500 },
    { key: 'reveal', text: `Introducing iSinkso. One platform. Ten engines. CRM, Finance, Growth, Talent, and six more — all connected, all intelligent, all working together.`, minMs: 6000 },
    { key: 'orchestrator', text: `And at the center of it all — me. Fifty-one actions, all voice-controlled. Just say what you need. I handle the rest.`, minMs: 5000 },
    { key: 'integrations', text: `It connects to everything you already use. Slack. HubSpot. Gmail. Stripe. Over thirty integrations. One workspace. Zero friction.`, minMs: 5500 },
    { key: 'ready', text: `Enough talking. Let me show you.`, minMs: 2500 },
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
          else { setTimeout(() => { if (mountedRef.current) { ambientRef.current?.stop(); onStart(); } }, 500); }
        }, 150);
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
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 80%)',
          }}
          animate={{ backgroundPositionY: ['0px', '-60px'] }}
          transition={{ duration: 60 / 108 * 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* ─── Subtle Gradient Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(6,182,212,0.06) 0%, transparent 50%)' }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.04) 0%, transparent 45%)' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* ─── Horizontal Light Beam (subtle) ─── */}
      <motion.div
        className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none"
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.04) 70%, transparent)',
          filter: 'blur(4px)',
        }}
        animate={{ opacity: speaking ? [0.2, 0.5, 0.2] : [0.02, 0.08, 0.02] }}
        transition={{ duration: 60 / 108, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ─── Particle Starfield ─── */}
      <StarfieldCanvas speaking={speaking} phase={phase} />

      {/* ─── Minimal Background Layers ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Central ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '100vw', height: '100vh', background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 50%)' }}
        />

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
              initial={{ opacity: 0, scale: 0.02, filter: 'blur(60px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3 relative"
            >
              {/* Subtle glow pulse */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 60%)', transform: 'scale(2)' }}
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: 0, scale: 3 }}
                transition={{ duration: 2, ease: 'easeOut' }}
              />

              {/* Single rotating ring */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -12,
                  border: '1px solid rgba(6,182,212,0.08)',
                  borderTopColor: 'rgba(6,182,212,0.3)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              />

              <div className="relative" style={{ width: 180, height: 180 }}>
                <OuterRing size={180} mood={avatarMood === 'idle' ? 'listening' : avatarMood} level={avatarLevel} />
                <InnerViz size={180} mood={avatarMood === 'idle' ? 'listening' : avatarMood} level={avatarLevel} seed={1} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Speaking Visualizer — minimal monochrome ─── */}
        <AnimatePresence>
          {speaking && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.3 }}
              animate={{ opacity: 0.6, scaleX: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-end justify-center gap-[1.5px] h-6 mb-4"
            >
              {[...Array(24)].map((_, i) => {
                const center = 12;
                const dist = Math.abs(i - center) / center;
                const maxH = 18 * (1 - dist * 0.5);
                return (
                  <motion.div
                    key={i}
                    className="w-[1.5px] rounded-full origin-bottom bg-white/40"
                    animate={{ height: [1, maxH, 1] }}
                    transition={{
                      duration: 0.25 + (i % 5) * 0.04,
                      repeat: Infinity,
                      delay: i * 0.02,
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
              className="flex items-center gap-2 mb-3"
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
            className="w-32 h-px mb-3"
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
              className="text-center mb-5 max-w-2xl mx-auto relative"
            >
              {/* Frosted glass panel — minimal */}
              <div
                className="absolute -inset-x-5 -inset-y-3 rounded-2xl pointer-events-none"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.03)',
                }}
              />
              <LyricDisplay
                text={transcript}
                durationMs={currentDuration}
                audioDuration={audioDuration}
                speaking={speaking}
                className="text-white/90 text-base sm:text-lg md:text-xl leading-relaxed font-light tracking-[-0.01em] relative z-10"
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
            className="w-40 h-px mb-4"
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
              className="flex items-center justify-center gap-3 sm:gap-4 mb-5 flex-wrap"
            >
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.label}
                    initial={{ opacity: 0, scale: 0, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.5, type: 'spring', stiffness: 300, damping: 22 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <motion.div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                      style={{
                        border: `1px solid ${mod.color}18`,
                        background: `${mod.color}08`,
                      }}
                    >
                      <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" style={{ color: mod.color }} />
                    </motion.div>
                    <span
                      className="text-[8px] sm:text-[9px] font-medium tracking-[0.12em] uppercase"
                      style={{ color: mod.color + '60' }}
                    >
                      {mod.label}
                    </span>
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
              className="grid grid-cols-4 gap-2 w-full max-w-xl mb-5"
            >
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                const isActive = phase >= feat.phase;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isActive ? 1 : 0.12, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="relative rounded-xl px-3 py-2.5 overflow-hidden"
                    style={{
                      border: `1px solid ${isActive ? feat.color + '20' : 'rgba(255,255,255,0.02)'}`,
                      background: isActive ? `${feat.color}08` : 'transparent',
                    }}
                  >
                    <Icon className="w-4 h-4 mb-1.5" style={{ color: isActive ? feat.color : '#3f3f46' }} />
                    <h3 className={`text-[10px] font-semibold mb-0.5 transition-colors duration-500 ${isActive ? 'text-white/80' : 'text-zinc-800'}`}>{feat.title}</h3>
                    <p className={`text-[9px] leading-tight transition-colors duration-500 ${isActive ? 'text-zinc-500' : 'text-zinc-800'}`}>{feat.desc}</p>
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
              className="flex items-center justify-center gap-6 sm:gap-8 mb-4">
              {[
                { value: '51', label: 'AI Actions', color: '#a855f7' },
                { value: '10', label: 'Engines', color: '#06b6d4' },
                { value: '30+', label: 'Integrations', color: '#f59e0b' },
                { value: '11', label: 'Languages', color: '#3b82f6' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="text-center"
                >
                  <div className="text-lg sm:text-xl font-semibold tracking-tight" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-[0.15em] mt-0.5 font-medium">{stat.label}</div>
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
