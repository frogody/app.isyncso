/**
 * ParticipantTile - Individual video tile for a call participant
 *
 * Shows video feed (or camera-off avatar), name label, mute indicator,
 * connection quality dots, and screen share badge.
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MicOff, Monitor, Wifi } from 'lucide-react';

// ---------------------------------------------------------------------------
// Connection quality indicator
// ---------------------------------------------------------------------------
const qualityConfig = {
  good: { dots: 3, color: 'bg-green-400' },
  fair: { dots: 2, color: 'bg-yellow-400' },
  poor: { dots: 1, color: 'bg-red-400' },
};

const ConnectionQuality = memo(function ConnectionQuality({ quality = 'good' }) {
  const config = qualityConfig[quality] || qualityConfig.good;

  return (
    <div className="flex items-end gap-0.5" title={`Connection: ${quality}`}>
      {[1, 2, 3].map((dot) => (
        <div
          key={dot}
          className={`
            w-1 rounded-full transition-colors duration-300
            ${dot <= config.dots ? config.color : 'bg-zinc-700'}
          `}
          style={{ height: `${dot * 4 + 2}px` }}
        />
      ))}
    </div>
  );
});

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

const InitialsAvatar = memo(function InitialsAvatar({ name }) {
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => {
    // Deterministic color from name
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

  return (
    <div className={`
      flex items-center justify-center w-16 h-16 rounded-full
      ${bgColor} text-white text-xl font-bold select-none
    `}>
      {initials}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
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
  stream = null,
}) {
  const name = participant?.display_name || (isLocal ? 'You' : 'Participant');
  const isMuted = participant?.is_muted ?? false;
  const isCameraOff = participant?.is_camera_off ?? false;
  const isSharing = participant?.is_screen_sharing ?? false;
  const quality = participant?.connection_quality || 'good';

  // Determine if we have a live video stream to show
  const hasVideo = !!stream && !isCameraOff && !isScreenShare;
  const hasScreenStream = !!stream && isScreenShare;

  return (
    <motion.div
      layout
      layoutId={`tile-${participant?.id || 'local'}${isScreenShare ? '-screen' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`
        relative overflow-hidden rounded-2xl
        ${isScreenShare
          ? 'bg-zinc-950 border border-cyan-500/30'
          : 'bg-zinc-900 border border-zinc-700/50'
        }
        flex items-center justify-center
        min-h-[120px]
      `}
    >
      {/* Real video feed, screen share, or camera-off fallback */}
      {hasVideo ? (
        <VideoElement stream={stream} muted={isLocal} mirror={isLocal} />
      ) : hasScreenStream ? (
        <VideoElement stream={stream} muted />
      ) : isCameraOff || !stream ? (
        <div className="flex items-center justify-center w-full h-full bg-zinc-950">
          <InitialsAvatar name={name} />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-zinc-950">
          <InitialsAvatar name={name} />
        </div>
      )}

      {/* Bottom name label overlay */}
      <div className="
        absolute bottom-0 left-0 right-0
        flex items-center justify-between
        px-3 py-2
        bg-gradient-to-t from-black/80 to-transparent
      ">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-white truncate">
            {name}
            {isLocal && (
              <span className="ml-1 text-xs text-zinc-400">(You)</span>
            )}
          </span>

          {/* Mute indicator */}
          {isMuted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20"
            >
              <MicOff className="w-3 h-3 text-red-400" />
            </motion.div>
          )}

          {/* Screen share badge */}
          {isSharing && !isScreenShare && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20">
              <Monitor className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-medium text-cyan-400">Sharing</span>
            </div>
          )}
        </div>

        {/* Connection quality */}
        <ConnectionQuality quality={quality} />
      </div>
    </motion.div>
  );
});

export default ParticipantTile;
