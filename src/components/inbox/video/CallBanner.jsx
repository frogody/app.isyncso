/**
 * CallBanner - Compact banner showing an active video call in a channel header
 *
 * Displays a green pulsing dot, title, participant count, and a Join button.
 * Designed to sit inside a channel header bar without taking much space.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Video, Users } from 'lucide-react';

const CallBanner = memo(function CallBanner({
  title = 'Video call in progress',
  participantCount = 0,
  onJoin,
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="overflow-hidden"
    >
      <div
        className="
          flex items-center justify-between gap-3
          px-3 py-2 mx-2 my-1.5
          bg-cyan-500/[0.08] border border-cyan-500/20
          rounded-xl
        "
      >
        {/* Left: status + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Pulsing green dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>

          <Video className="w-4 h-4 text-cyan-400 shrink-0" />

          <span className="text-sm font-medium text-zinc-200 truncate">
            {title}
          </span>

          {/* Participant count */}
          {participantCount > 0 && (
            <div className="flex items-center gap-1 text-zinc-400 shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs tabular-nums">{participantCount}</span>
            </div>
          )}
        </div>

        {/* Right: Join button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={onJoin}
          className="
            shrink-0 flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            bg-cyan-500/20 text-cyan-400
            text-xs font-semibold
            hover:bg-cyan-500/30
            transition-colors duration-150
            cursor-pointer
          "
        >
          <Video className="w-3.5 h-3.5" />
          Join
        </motion.button>
      </div>
    </motion.div>
  );
});

export default CallBanner;
