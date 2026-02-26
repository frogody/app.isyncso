/**
 * ParticipantTile - Individual video tile for a call participant
 *
 * Supports multiple sizes: full, normal, small, mini, strip.
 * Shows video feed (or camera-off avatar), name label, mute indicator,
 * active speaker ring, and screen share badge.
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MicOff, Monitor } from 'lucide-react';

// ---------------------------------------------------------------------------
// Initials avatar for camera-off state
// ---------------------------------------------------------------------------
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const InitialsAvatar = memo(function InitialsAvatar({ name, size = 'normal' }) {
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => {
    const colors = [
      'bg-cyan-600', 'bg-blue-600', 'bg-indigo-600',
      'bg-violet-600', 'bg-pink-600', 'bg-rose-600',
      'bg-teal-600', 'bg-sky-600',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = ((hash << 5) - hash + (name || '').charCodeAt(i)) | 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }, [name]);

  const sizeClasses = {
    full: 'w-20 h-20 text-2xl',
    normal: 'w-16 h-16 text-xl',
    small: 'w-12 h-12 text-base',
    mini: 'w-9 h-9 text-sm',
    strip: 'w-10 h-10 text-sm',
  };

  return (
    <div className={`
      flex items-center justify-center rounded-full
      ${bgColor} text-white font-bold select-none
      ${sizeClasses[size] || sizeClasses.normal}
    `}>
      {initials}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Video element that syncs srcObject from a MediaStream
// ---------------------------------------------------------------------------
const VideoElement = memo(function VideoElement({ stream, muted = false, mirror = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      // Ensure autoplay works
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
    />
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ParticipantTile = memo(function ParticipantTile({
  participant,
  isLocal = false,
  isScreenShare = false,
  isActiveSpeaker = false,
  stream = null,
  size = 'normal', // 'full' | 'normal' | 'small' | 'mini' | 'strip'
}) {
  const name = participant?.display_name || (isLocal ? 'You' : 'Participant');
  const isMuted = participant?.is_muted ?? false;
  const isCameraOff = participant?.is_camera_off ?? false;
  const isSharing = participant?.is_screen_sharing ?? false;

  // Determine if we have a live video stream to show
  const hasVideo = !!stream && !isCameraOff && !isScreenShare;
  const hasScreenStream = !!stream && isScreenShare;

  // Active speaker ring animation
  const speakerRing = isActiveSpeaker && !isScreenShare;

  // Mini mode hides most UI
  const isMini = size === 'mini';
  const isStrip = size === 'strip';
  const isCompact = isMini || isStrip;

  return (
    <motion.div
      layout
      layoutId={`tile-${participant?.id || 'local'}${isScreenShare ? '-screen' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`
        relative overflow-hidden
        ${isStrip ? 'rounded-xl flex-shrink-0 aspect-video' : 'rounded-2xl'}
        ${isScreenShare
          ? 'bg-zinc-950 border border-cyan-500/30'
          : speakerRing
            ? 'bg-zinc-900 border-2 border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
            : 'bg-zinc-900 border border-zinc-700/40'
        }
        flex items-center justify-center
        ${isMini ? 'min-h-[60px]' : isStrip ? 'min-h-[80px] min-w-[130px]' : 'min-h-[100px]'}
      `}
    >
      {/* Real video feed, screen share, or camera-off fallback */}
      {hasVideo ? (
        <VideoElement stream={stream} muted={isLocal} mirror={isLocal} />
      ) : hasScreenStream ? (
        <VideoElement stream={stream} muted />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-zinc-950">
          <InitialsAvatar name={name} size={size} />
        </div>
      )}

      {/* Active speaker glow pulse */}
      {speakerRing && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-cyan-400/40 pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Bottom name label overlay */}
      {!isMini && (
        <div className={`
          absolute bottom-0 left-0 right-0
          flex items-center justify-between
          ${isCompact ? 'px-2 py-1' : 'px-3 py-2'}
          bg-gradient-to-t from-black/80 to-transparent
        `}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-medium text-white truncate ${isCompact ? 'text-[10px]' : 'text-sm'}`}>
              {name}
              {isLocal && (
                <span className="ml-1 text-zinc-400 text-[10px]">(You)</span>
              )}
            </span>

            {/* Mute indicator */}
            {isMuted && (
              <div className={`flex items-center justify-center rounded-full bg-red-500/20 ${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`}>
                <MicOff className={`text-red-400 ${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
              </div>
            )}

            {/* Screen share badge */}
            {isSharing && !isScreenShare && !isCompact && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20">
                <Monitor className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-400">Sharing</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini mode: just name + mute dot */}
      {isMini && (
        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/60 flex items-center gap-1">
          <span className="text-[9px] text-zinc-300 truncate flex-1">{name}</span>
          {isMuted && <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
        </div>
      )}
    </motion.div>
  );
});

export default ParticipantTile;
