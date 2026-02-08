/**
 * useSyncKnock — Proactive SYNC knock notification hook
 *
 * Listens for sync_knock notifications (e.g. urgent emails),
 * triggers knocking animation + sound, manages knock lifecycle.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useSyncState } from '@/components/context/SyncStateContext';

const KNOCK_TIMEOUT = 30000; // Auto-dismiss after 30s
const SOUND_REPEAT_INTERVAL = 8000; // Repeat knock sound every 8s
const MAX_SOUND_REPEATS = 3;

// Shared AudioContext — unlocked on first user interaction
let sharedAudioCtx = null;
let audioCtxUnlocked = false;

function getAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
}

// Unlock AudioContext on any user gesture (click, touch, keydown)
function unlockAudioContext() {
  if (audioCtxUnlocked) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      audioCtxUnlocked = true;
      console.log('[SyncKnock] AudioContext unlocked');
    }).catch(() => {});
  } else {
    audioCtxUnlocked = true;
  }
}

// Register unlock listeners once
if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudioContext, { once: false, passive: true });
  });
}

// Web Audio API knock sound — realistic door knock using noise bursts + resonant filter
function playKnockSound() {
  try {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Three knocks: knock-knock ... knock (classic pattern)
    const knocks = [0, 0.18, 0.56];
    const volumes = [0.8, 0.7, 0.9];

    knocks.forEach((delay, i) => {
      const now = ctx.currentTime + delay;

      // — Noise burst (the "thud" impact) —
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        noiseData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufferSize, 3);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      // Bandpass filter to shape the thud (wood-like resonance ~180Hz)
      const thudFilter = ctx.createBiquadFilter();
      thudFilter.type = 'bandpass';
      thudFilter.frequency.value = 180;
      thudFilter.Q.value = 2.5;

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(volumes[i] * 0.5, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(thudFilter);
      thudFilter.connect(thudGain);
      thudGain.connect(ctx.destination);
      noise.start(now);

      // — Tonal "knock" resonance (wood panel ring) —
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(volumes[i] * 0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);

      // — Higher "tap" transient (knuckle contact) —
      const tap = ctx.createOscillator();
      tap.type = 'triangle';
      tap.frequency.value = 800 + Math.random() * 200;

      const tapGain = ctx.createGain();
      tapGain.gain.setValueAtTime(volumes[i] * 0.15, now);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      tap.connect(tapGain);
      tapGain.connect(ctx.destination);
      tap.start(now);
      tap.stop(now + 0.03);
    });
  } catch (e) {
    console.warn('[SyncKnock] Sound error:', e);
  }
}

export default function useSyncKnock() {
  const { notifications, markAsRead } = useNotifications();
  const syncState = useSyncState();

  const [knockQueue, setKnockQueue] = useState([]);
  const [currentKnock, setCurrentKnock] = useState(null);

  const timeoutRef = useRef(null);
  const soundIntervalRef = useRef(null);
  const soundCountRef = useRef(0);
  const processedIdsRef = useRef(new Set());

  const isKnocking = !!currentKnock;

  // Pick up sync_knock notifications
  useEffect(() => {
    const knockNotifs = notifications.filter(
      (n) => n.type === 'sync_knock' && !n.read && !processedIdsRef.current.has(n.id)
    );

    if (knockNotifs.length > 0) {
      setKnockQueue((prev) => {
        const existingIds = new Set(prev.map((k) => k.id));
        const newKnocks = knockNotifs.filter((k) => !existingIds.has(k.id));
        return [...prev, ...newKnocks];
      });
      // Mark these as seen so we don't re-process
      knockNotifs.forEach((n) => processedIdsRef.current.add(n.id));
    }
  }, [notifications]);

  // Activate next knock from queue
  useEffect(() => {
    if (currentKnock || knockQueue.length === 0) return;

    const next = knockQueue[0];
    setCurrentKnock(next);
    setKnockQueue((prev) => prev.slice(1));

    // Trigger knocking state on avatar
    syncState.triggerKnock?.(next.metadata || {});

    // Play initial knock sound
    playKnockSound();
    soundCountRef.current = 1;

    // Repeat sound periodically
    soundIntervalRef.current = setInterval(() => {
      if (soundCountRef.current >= MAX_SOUND_REPEATS) {
        clearInterval(soundIntervalRef.current);
        return;
      }
      playKnockSound();
      soundCountRef.current++;
    }, SOUND_REPEAT_INTERVAL);

    // Auto-dismiss timeout
    timeoutRef.current = setTimeout(() => {
      dismissKnock();
    }, KNOCK_TIMEOUT);
  }, [knockQueue, currentKnock]);

  // Dismiss current knock without consuming
  const dismissKnock = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    timeoutRef.current = null;
    soundIntervalRef.current = null;

    if (currentKnock) {
      markAsRead?.(currentKnock.id);
    }
    setCurrentKnock(null);
    syncState.clearKnock?.();
  }, [currentKnock, markAsRead, syncState]);

  // Consume knock — returns the message for voice to speak
  const consumeKnock = useCallback(() => {
    if (!currentKnock) return null;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    timeoutRef.current = null;
    soundIntervalRef.current = null;

    markAsRead?.(currentKnock.id);
    const knock = currentKnock;
    setCurrentKnock(null);
    syncState.clearKnock?.();

    return knock;
  }, [currentKnock, markAsRead, syncState]);

  // Format knock data into a natural spoken message
  const getKnockMessage = useCallback((knock) => {
    if (!knock) return null;
    const meta = knock.metadata || {};
    const sender = (meta.sender || '').split('<')[0].trim() || 'someone';
    const subject = meta.subject || 'an urgent matter';
    const snippet = meta.snippet || '';

    let message = `Hey, you just got an urgent email from ${sender} about ${subject}.`;
    if (snippet) {
      message += ` It says: ${snippet.substring(0, 120)}.`;
    }
    message += ' Want me to help you with this? You can ask me to reply.';
    return message;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    };
  }, []);

  return {
    isKnocking,
    currentKnock,
    knockQueue,
    consumeKnock,
    dismissKnock,
    getKnockMessage,
  };
}
