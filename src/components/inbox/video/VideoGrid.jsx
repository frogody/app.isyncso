/**
 * VideoGrid - Adaptive participant grid for video calls (up to 100 participants)
 *
 * Layout modes:
 *   - Solo:      1 participant = full screen
 *   - Duo:       2 = side by side
 *   - Gallery:   3-49 = responsive grid (auto-sized tiles)
 *   - Overflow:  50+ = paginated gallery with navigation
 *   - Spotlight:  Active speaker prominent + others in strip
 *   - Screen:    Screen share takes main stage + participant strip
 *
 * Active speaker: Highlighted ring, moves to first position.
 * Framer Motion LayoutGroup for smooth reflow animations.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ParticipantTile from './ParticipantTile';

// ---------------------------------------------------------------------------
// Grid config calculator — auto-compute cols/rows for N participants
// ---------------------------------------------------------------------------
function getGridConfig(count) {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  if (count <= 16) return { cols: 4, rows: 4 };
  if (count <= 25) return { cols: 5, rows: 5 };
  if (count <= 36) return { cols: 6, rows: 6 };
  return { cols: 7, rows: 7 }; // Max 49 per page
}

const TILES_PER_PAGE = 49; // 7x7 max
const STRIP_MAX = 8; // Max tiles in sidebar strip

// ---------------------------------------------------------------------------
// Gallery pagination
// ---------------------------------------------------------------------------
const PageIndicator = memo(function PageIndicator({ current, total, onPrev, onNext }) {
  if (total <= 1) return null;
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
      <button
        onClick={onPrev}
        disabled={current === 0}
        className="p-1.5 rounded-lg bg-zinc-900/80 backdrop-blur border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs font-medium text-zinc-400 tabular-nums">
        {current + 1} / {total}
      </span>
      <button
        onClick={onNext}
        disabled={current >= total - 1}
        className="p-1.5 rounded-lg bg-zinc-900/80 backdrop-blur border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const VideoGrid = memo(function VideoGrid({
  participants = [],
  currentUserId,
  localStream = null,
  screenStream = null,
  activeSpeakerId = null,
}) {
  const [galleryPage, setGalleryPage] = useState(0);

  // Determine if anyone is screen sharing
  const screenSharer = useMemo(
    () => participants.find((p) => p.is_screen_sharing),
    [participants]
  );

  // Sort participants: active speaker first, then local user, then rest
  const sortedParticipants = useMemo(() => {
    const sorted = [...participants];
    sorted.sort((a, b) => {
      // Active speaker first
      if (a.user_id === activeSpeakerId && b.user_id !== activeSpeakerId) return -1;
      if (b.user_id === activeSpeakerId && a.user_id !== activeSpeakerId) return 1;
      // Then local user
      if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1;
      if (b.user_id === currentUserId && a.user_id !== currentUserId) return 1;
      return 0;
    });
    return sorted;
  }, [participants, currentUserId, activeSpeakerId]);

  // Helper: get the stream for a participant
  const getStreamForParticipant = useCallback((p, isScreen = false) => {
    if (p.user_id === currentUserId) {
      return isScreen ? screenStream : localStream;
    }
    // Remote participants would get their stream from WebRTC peer connections
    return null;
  }, [currentUserId, localStream, screenStream]);

  const totalPages = Math.ceil(sortedParticipants.length / TILES_PER_PAGE);
  const safePage = Math.min(galleryPage, Math.max(0, totalPages - 1));

  // -------------------------------------------------------------------
  // Screen share mode: screen = main, participants in side strip
  // -------------------------------------------------------------------
  if (screenSharer) {
    // Get non-screen-sharing participants for the strip
    const stripParticipants = sortedParticipants.slice(0, STRIP_MAX);

    return (
      <LayoutGroup>
        <div className="flex h-full w-full gap-2 p-2">
          {/* Main screen share area */}
          <div className="flex-1 min-w-0 relative">
            <AnimatePresence mode="popLayout">
              <ParticipantTile
                key={`screen-${screenSharer.id}`}
                participant={screenSharer}
                isLocal={screenSharer.user_id === currentUserId}
                isScreenShare
                stream={getStreamForParticipant(screenSharer, true)}
                size="full"
              />
            </AnimatePresence>
          </div>

          {/* Right sidebar strip */}
          <div className="w-48 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {stripParticipants.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  isLocal={p.user_id === currentUserId}
                  isActiveSpeaker={p.user_id === activeSpeakerId}
                  stream={getStreamForParticipant(p)}
                  size="strip"
                />
              ))}
            </AnimatePresence>
            {participants.length > STRIP_MAX && (
              <div className="flex items-center justify-center py-2 text-[10px] text-zinc-500 font-medium">
                +{participants.length - STRIP_MAX} more
              </div>
            )}
          </div>
        </div>
      </LayoutGroup>
    );
  }

  // -------------------------------------------------------------------
  // Spotlight mode: 1 active speaker large + rest in bottom strip
  // Only active when > 6 participants AND there's an active speaker
  // -------------------------------------------------------------------
  if (activeSpeakerId && sortedParticipants.length > 6) {
    const speaker = sortedParticipants.find(p => p.user_id === activeSpeakerId);
    const others = sortedParticipants.filter(p => p.user_id !== activeSpeakerId);
    const stripOthers = others.slice(0, STRIP_MAX);

    return (
      <LayoutGroup>
        <div className="flex flex-col h-full w-full gap-2 p-2">
          {/* Spotlight area */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="popLayout">
              {speaker && (
                <ParticipantTile
                  key={speaker.id}
                  participant={speaker}
                  isLocal={speaker.user_id === currentUserId}
                  isActiveSpeaker
                  stream={getStreamForParticipant(speaker)}
                  size="full"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Bottom strip */}
          <div className="h-28 flex gap-1.5 overflow-x-auto scrollbar-hide px-1">
            <AnimatePresence mode="popLayout">
              {stripOthers.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  isLocal={p.user_id === currentUserId}
                  stream={getStreamForParticipant(p)}
                  size="strip"
                />
              ))}
            </AnimatePresence>
            {others.length > STRIP_MAX && (
              <div className="flex-shrink-0 flex items-center justify-center px-3 text-xs text-zinc-500 font-medium">
                +{others.length - STRIP_MAX}
              </div>
            )}
          </div>
        </div>
      </LayoutGroup>
    );
  }

  // -------------------------------------------------------------------
  // Standard gallery layout (paginated for 50+ participants)
  // -------------------------------------------------------------------
  const pageParticipants = sortedParticipants.slice(
    safePage * TILES_PER_PAGE,
    (safePage + 1) * TILES_PER_PAGE
  );
  const { cols, rows } = getGridConfig(pageParticipants.length);

  return (
    <LayoutGroup>
      <div className="relative h-full w-full p-2">
        <div
          className="grid h-full w-full gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {pageParticipants.map((p) => (
              <ParticipantTile
                key={p.id}
                participant={p}
                isLocal={p.user_id === currentUserId}
                isActiveSpeaker={p.user_id === activeSpeakerId}
                stream={getStreamForParticipant(p)}
                size={pageParticipants.length > 16 ? 'mini' : pageParticipants.length > 4 ? 'small' : 'normal'}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination for large calls */}
        <PageIndicator
          current={safePage}
          total={totalPages}
          onPrev={() => setGalleryPage(p => Math.max(0, p - 1))}
          onNext={() => setGalleryPage(p => Math.min(totalPages - 1, p + 1))}
        />
      </div>
    </LayoutGroup>
  );
});

export default VideoGrid;
