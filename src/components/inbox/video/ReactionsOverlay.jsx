/**
 * ReactionsOverlay - Floating emoji reactions for video calls
 *
 * Renders floating emoji animations that drift upward and fade out.
 * Includes a small reaction button row at the bottom of the screen.
 * Reactions are broadcast to other participants via Supabase channel.
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';

// ---------------------------------------------------------------------------
// Available reactions
// ---------------------------------------------------------------------------
const REACTIONS = [
  { emoji: '\u{1F44D}', label: 'Thumbs Up' },
  { emoji: '\u{1F44F}', label: 'Clap' },
  { emoji: '\u{1F602}', label: 'Laugh' },
  { emoji: '\u{2764}\u{FE0F}', label: 'Heart' },
  { emoji: '\u{1F389}', label: 'Party' },
];

// ---------------------------------------------------------------------------
// Single floating reaction animation
// ---------------------------------------------------------------------------
const FloatingReaction = memo(function FloatingReaction({ emoji, id, x, onComplete }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 1, y: 0, x, scale: 1 }}
      animate={{
        opacity: 0,
        y: -300,
        scale: 1.3,
        x: x + (Math.random() - 0.5) * 60,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className="absolute bottom-24 text-4xl pointer-events-none select-none"
      style={{ left: `${x}px` }}
    >
      {emoji}
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ReactionsOverlay = memo(function ReactionsOverlay({
  callId,
  userId,
}) {
  const [activeReactions, setActiveReactions] = useState([]);
  const idCounter = useRef(0);
  const channelRef = useRef(null);
  const containerRef = useRef(null);

  // Subscribe to broadcast reactions from other participants
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call_reactions:${callId}`)
      .on('broadcast', { event: 'reaction' }, (payload) => {
        // Don't show our own reactions again (we already render them locally)
        if (payload.payload?.userId === userId) return;

        const containerWidth = containerRef.current?.offsetWidth || 800;
        const x = Math.random() * (containerWidth - 60) + 30;

        setActiveReactions((prev) => [
          ...prev,
          {
            id: `remote-${Date.now()}-${Math.random()}`,
            emoji: payload.payload?.emoji,
            x,
          },
        ]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [callId, userId]);

  // Send a reaction
  const sendReaction = useCallback(
    (emoji) => {
      const containerWidth = containerRef.current?.offsetWidth || 800;
      const x = Math.random() * (containerWidth - 60) + 30;
      const id = `local-${++idCounter.current}`;

      // Add locally for immediate feedback
      setActiveReactions((prev) => [...prev, { id, emoji, x }]);

      // Broadcast to others
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'reaction',
          payload: { emoji, userId },
        });
      }
    },
    [userId]
  );

  // Remove completed animation
  const removeReaction = useCallback((id) => {
    setActiveReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-20">
      {/* Floating reactions */}
      <AnimatePresence>
        {activeReactions.map((reaction) => (
          <FloatingReaction
            key={reaction.id}
            id={reaction.id}
            emoji={reaction.emoji}
            x={reaction.x}
            onComplete={() => removeReaction(reaction.id)}
          />
        ))}
      </AnimatePresence>

      {/* Reaction button row at bottom */}
      <div className="
        absolute bottom-3 left-1/2 -translate-x-1/2
        pointer-events-auto
        flex items-center gap-1
        px-3 py-1.5
        bg-zinc-900/90 backdrop-blur-xl
        border border-zinc-700/50 rounded-full
        shadow-lg
      ">
        {REACTIONS.map(({ emoji, label }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 1.4 }}
            whileHover={{ scale: 1.15, y: -4 }}
            onClick={() => sendReaction(emoji)}
            title={label}
            className="
              w-9 h-9 flex items-center justify-center
              rounded-full text-xl
              hover:bg-white/[0.08]
              transition-colors duration-150
              cursor-pointer
            "
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
});

export default ReactionsOverlay;
