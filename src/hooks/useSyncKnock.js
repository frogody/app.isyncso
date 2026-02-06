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

// Web Audio API knock sound — three quick taps
function playKnockSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const taps = [0, 0.12, 0.24]; // timing of three taps

    taps.forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = 440;

      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.06);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.08);
    });

    // Close context after sounds finish
    setTimeout(() => ctx.close().catch(() => {}), 500);
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
    message += ' Want me to help you with this?';
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
