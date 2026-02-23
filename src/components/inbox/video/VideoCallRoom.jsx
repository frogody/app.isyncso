/**
 * VideoCallRoom - Full-screen video call experience
 *
 * Full viewport overlay with dark background, frosted glass controls,
 * participant video grid (supports up to 100 people), call header,
 * floating reactions, SYNC AI assistant with collapsible edge notch.
 * AnimatePresence for smooth mount/unmount transitions.
 */

import React, { memo, useState, useCallback, useMemo, useRef } from 'react';
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
  Copy,
  MessageSquare,
  X,
  Brain,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import VideoGrid from './VideoGrid';
import CallHeader from './CallHeader';
import ReactionsOverlay from './ReactionsOverlay';
import SyncCallAssistant from './SyncCallAssistant';
import InviteMembersPanel from './InviteMembersPanel';

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
  showChat,
  showSync,
  showInvite,
  participantCount,
  joinCode,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleReactions,
  onToggleChat,
  onToggleSync,
  onToggleInvite,
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
        z-30
        flex items-center justify-center gap-2 px-5 py-3 mx-auto mb-4
        bg-zinc-900/95 backdrop-blur-xl
        border border-zinc-700/50 rounded-2xl
        shadow-2xl shadow-black/50
        w-fit
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

      {/* Chat toggle */}
      <ControlButton
        icon={MessageSquare}
        isActive={showChat}
        label={showChat ? 'Hide chat' : 'Show chat'}
        onClick={onToggleChat}
      />

      {/* SYNC AI toggle */}
      <ControlButton
        icon={Brain}
        isActive={showSync}
        label={showSync ? 'Hide SYNC' : 'SYNC Assistant'}
        onClick={onToggleSync}
      />

      {/* Invite members */}
      <ControlButton
        icon={UserPlus}
        isActive={showInvite}
        label={showInvite ? 'Hide invites' : 'Invite members'}
        onClick={onToggleInvite}
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
  isLocalSpeaking = false,
  localStream = null,
  screenStream = null,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onEndCall,
}) {
  const [showReactions, setShowReactions] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showSync, setShowSync] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [syncCollapsed, setSyncCollapsed] = useState(false);
  const syncAssistantRef = useRef(null);

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

  // Determine active speaker (local user for now; in real WebRTC this would come from remote audio levels)
  const activeSpeakerId = useMemo(() => {
    if (isLocalSpeaking) return userId;
    // In a full implementation, we'd track active speaker from remote participants too
    return null;
  }, [isLocalSpeaking, userId]);

  const toggleReactions = useCallback(() => {
    setShowReactions((prev) => !prev);
  }, []);

  const toggleChat = useCallback(() => {
    setShowChat((prev) => !prev);
    // Close invite if opening chat (they share the right panel slot)
    setShowInvite(false);
  }, []);

  const toggleSync = useCallback(() => {
    setShowSync((prev) => !prev);
    setSyncCollapsed(false);
  }, []);

  const toggleInvite = useCallback(() => {
    setShowInvite((prev) => !prev);
    // Close chat if opening invite (they share the right panel slot)
    setShowChat(false);
  }, []);

  // Capture transcript and trigger end/leave with it
  const handleLeave = useCallback(() => {
    const transcript = syncAssistantRef.current?.getFullTranscript?.() || '';
    if (onLeave) onLeave(transcript);
  }, [onLeave]);

  const handleEndCall = useCallback(() => {
    const transcript = syncAssistantRef.current?.getFullTranscript?.() || '';
    if (onEndCall) onEndCall(transcript);
  }, [onEndCall]);

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

        {/* Video grid + side panels */}
        <div className="flex-1 pt-14 pb-2 relative flex overflow-hidden">
          {/* SYNC Assistant panel (left side) — uses flex layout, not absolute */}
          {showSync && (
            <SyncCallAssistant
              ref={syncAssistantRef}
              localStream={localStream}
              callId={callId}
              isVisible={showSync}
              onClose={toggleSync}
              onCollapsedChange={setSyncCollapsed}
            />
          )}

          {/* Main video area */}
          <div className={`flex-1 relative transition-all duration-300 ${showChat || showInvite ? 'mr-80' : ''}`}>
            <VideoGrid
              participants={participants}
              currentUserId={userId}
              localStream={localStream}
              screenStream={screenStream}
              activeSpeakerId={activeSpeakerId}
            />

            {/* Reactions overlay */}
            {showReactions && (
              <ReactionsOverlay
                callId={callId}
                userId={userId}
              />
            )}
          </div>

          {/* Chat panel */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-700/50 flex flex-col z-20"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
                  <h3 className="text-sm font-semibold text-white">Call Chat</h3>
                  <button
                    onClick={toggleChat}
                    className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Chat messages will appear here</p>
                    <p className="text-xs text-zinc-600 mt-1">Send messages to other call participants</p>
                  </div>
                </div>
                <div className="p-3 border-t border-zinc-700/50">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm placeholder-zinc-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invite members panel */}
          <AnimatePresence>
            {showInvite && (
              <InviteMembersPanel
                companyId={call?.company_id}
                organizationId={user?.organization_id}
                userId={userId}
                userName={user?.full_name}
                callId={callId}
                joinCode={joinCode}
                joinUrl={call?.join_url}
                callTitle={title}
                participantUserIds={participants.map((p) => p.user_id).filter(Boolean)}
                onClose={toggleInvite}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Extended controls */}
        <RoomControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          showReactions={showReactions}
          showChat={showChat}
          showSync={showSync}
          showInvite={showInvite}
          participantCount={participants.length}
          joinCode={joinCode}
          onToggleMute={onToggleMute}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onToggleReactions={toggleReactions}
          onToggleChat={toggleChat}
          onToggleSync={toggleSync}
          onToggleInvite={toggleInvite}
          onEndCall={handleEndCall}
          onLeave={handleLeave}
          isHost={isHost}
        />
      </motion.div>
    </AnimatePresence>
  );
});

export default VideoCallRoom;
