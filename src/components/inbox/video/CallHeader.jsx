/**
 * CallHeader - Top bar overlay for active video call
 *
 * Shows call title, duration timer (mm:ss), participant count badge,
 * and recording indicator with pulsing red dot.
 */

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Circle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Duration timer hook
// ---------------------------------------------------------------------------
function useDurationTimer(startedAt) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();

    const tick = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    };

    tick(); // immediate update
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const CallHeader = memo(function CallHeader({
  title = 'Video Call',
  startedAt,
  participantCount = 0,
  isRecording = false,
}) {
  const duration = useDurationTimer(startedAt);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="
        absolute top-0 left-0 right-0 z-10
        flex items-center justify-between
        px-5 py-3
        bg-zinc-950/70 backdrop-blur-md
        border-b border-zinc-800/50
      "
    >
      {/* Left: Title + Recording */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-semibold text-white truncate max-w-[300px]">
          {title}
        </h2>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-medium text-red-400">REC</span>
          </div>
        )}
      </div>

      {/* Center: Duration */}
      <div className="flex items-center">
        <span className="text-sm font-mono text-zinc-300 tabular-nums">
          {duration}
        </span>
      </div>

      {/* Right: Participant count */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06]">
        <Users className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-300 tabular-nums">
          {participantCount}
        </span>
      </div>
    </motion.div>
  );
});

export default CallHeader;
