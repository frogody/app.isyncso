/**
 * VideoCallRoom - Full-screen video call experience
 *
 * Full viewport overlay with dark background, frosted glass controls,
 * participant video grid, call header, and floating reactions.
 * AnimatePresence for smooth mount/unmount transitions.
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  Smile,
  Maximize2,
  Minimize2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

import VideoGrid from './VideoGrid';
import CallHeader from './CallHeader';
import ReactionsOverlay from './ReactionsOverlay';

// ---------------------------------------------------------------------------
// Control button (reused from CallControls pattern)
// ---------------------------------------------------------------------------
const ControlButton = memo(function ControlButton({
  icon: Icon,
  activeIcon: ActiveIcon,
  isActive,
  isDestructive,
  label,
  onClick,
  badge,
}) {
  const ResolvedIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      title={label}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-xl
        transition-colors duration-200 cursor-pointer
        ${isDestructive
          ? 'bg-red-500 text-white hover:bg-red-600'
          : isActive
            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            : 'bg-white/[0.07] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
        }
      `}
    >
      <ResolvedIcon className="w-5 h-5" />

      {/* Active indicator dot */}
      {isActive && !isDestructive && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
      )}

      {/* Badge */}
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white px-1">
          {badge}
        </span>
      )}
    </motion.button>
  );
});

// ---------------------------------------------------------------------------
// Extended control bar for the full room view
// ---------------------------------------------------------------------------
const RoomControls = memo(function RoomControls({
  isMuted,
  isCameraOff,
  isScreenSharing,
  showReactions,
  participantCount,
  joinCode,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleReactions,
  onEndCall,
  onLeave,
  isHost,
}) {
  const handleCopyCode = useCallback(() => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode).then(() => {
      toast.success('Join code copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy join code');
    });
  }, [joinCode]);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="
        absolute bottom-6 left-1/2 -translate-x-1/2 z-30
        flex items-center gap-2 px-5 py-3
        bg-zinc-900/95 backdrop-blur-xl
        border border-zinc-700/50 rounded-2xl
        shadow-2xl shadow-black/50
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
      <div className="w-px h-8 bg-zinc-700/60 mx-1" />

      {/* Reactions toggle */}
      <ControlButton
        icon={Smile}
        isActive={showReactions}
        label={showReactions ? 'Hide reactions' : 'Show reactions'}
        onClick={onToggleReactions}
      />

      {/* Participant count */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05]">
        <Users className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-300 tabular-nums">
          {participantCount}
        </span>
      </div>

      {/* Join code copy */}
      {joinCode && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleCopyCode}
          title={`Join code: ${joinCode}`}
          className="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
            bg-white/[0.05] hover:bg-white/[0.08]
            transition-colors duration-150 cursor-pointer
          "
        >
          <Copy className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-400">{joinCode}</span>
        </motion.button>
      )}

      {/* Divider */}
      <div className="w-px h-8 bg-zinc-700/60 mx-1" />

      {/* End / Leave call */}
      <ControlButton
        icon={PhoneOff}
        isDestructive
        label={isHost ? 'End call for all' : 'Leave call'}
        onClick={isHost ? onEndCall : onLeave}
      />
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Main VideoCallRoom component
// ---------------------------------------------------------------------------
const VideoCallRoom = memo(function VideoCallRoom({
  call,
  participants = [],
  user,
  isMuted = false,
  isCameraOff = false,
  isScreenSharing = false,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onEndCall,
}) {
  const [showReactions, setShowReactions] = useState(true);

  const callId = call?.id;
  const userId = user?.id;
  const title = call?.title || 'Video Call';
  const joinCode = call?.join_code;
  const startedAt = call?.started_at;
  const isRecording = call?.metadata?.is_recording ?? false;

  // Determine if current user is host
  const isHost = useMemo(
    () => call?.initiated_by === userId,
    [call, userId]
  );

  const toggleReactions = useCallback(() => {
    setShowReactions((prev) => !prev);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="video-call-room"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="
          fixed inset-0 z-50
          bg-zinc-950
          flex flex-col
        "
      >
        {/* Call header */}
        <CallHeader
          title={title}
          startedAt={startedAt}
          participantCount={participants.length}
          isRecording={isRecording}
        />

        {/* Video grid - fills remaining space */}
        <div className="flex-1 pt-14 pb-24 relative">
          <VideoGrid
            participants={participants}
            currentUserId={userId}
          />

          {/* Reactions overlay */}
          {showReactions && (
            <ReactionsOverlay
              callId={callId}
              userId={userId}
            />
          )}
        </div>

        {/* Extended controls */}
        <RoomControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          showReactions={showReactions}
          participantCount={participants.length}
          joinCode={joinCode}
          onToggleMute={onToggleMute}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onToggleReactions={toggleReactions}
          onEndCall={onEndCall}
          onLeave={onLeave}
          isHost={isHost}
        />
      </motion.div>
    </AnimatePresence>
  );
});

export default VideoCallRoom;
