/**
 * CallControls - Floating control bar for active video calls
 *
 * Dark floating bar anchored at the bottom of the call view.
 * Provides mic, camera, screen share, and end call controls
 * with real-time participant count.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Individual control button
// ---------------------------------------------------------------------------
const ControlButton = memo(function ControlButton({
  icon: Icon,
  activeIcon: ActiveIcon,
  isActive,
  isDestructive,
  label,
  onClick,
}) {
  const ResolvedIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      title={label}
      className={`
        relative flex items-center justify-center w-11 h-11 rounded-xl
        transition-colors duration-200 cursor-pointer
        ${isDestructive
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : isActive
            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            : 'bg-white/[0.07] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
        }
      `}
    >
      <ResolvedIcon className="w-5 h-5" />

      {/* Active indicator dot */}
      {isActive && !isDestructive && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400" />
      )}
    </motion.button>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const CallControls = memo(function CallControls({
  isMuted = false,
  isCameraOff = false,
  isScreenSharing = false,
  participantCount = 0,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="
        flex items-center gap-2 px-4 py-3
        bg-zinc-900/95 backdrop-blur-xl
        border border-zinc-700/50 rounded-2xl
        shadow-2xl shadow-black/40
      "
    >
      {/* Mic toggle */}
      <ControlButton
        icon={Mic}
        activeIcon={MicOff}
        isActive={isMuted}
        label={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMute}
      />

      {/* Camera toggle */}
      <ControlButton
        icon={Video}
        activeIcon={VideoOff}
        isActive={isCameraOff}
        label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        onClick={onToggleCamera}
      />

      {/* Screen share toggle */}
      <ControlButton
        icon={Monitor}
        isActive={isScreenSharing}
        label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        onClick={onToggleScreenShare}
      />

      {/* Divider */}
      <div className="w-px h-7 bg-zinc-700/60 mx-1" />

      {/* Participant count badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.05]">
        <Users className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-300 tabular-nums">
          {participantCount}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-zinc-700/60 mx-1" />

      {/* End call */}
      <ControlButton
        icon={PhoneOff}
        isDestructive
        label="End call"
        onClick={onEndCall}
      />
    </motion.div>
  );
});

export default CallControls;
