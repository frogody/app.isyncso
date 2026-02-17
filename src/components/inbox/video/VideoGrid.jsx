/**
 * VideoGrid - Responsive participant grid for video calls
 *
 * Auto-reflows based on participant count:
 *   1 = full screen
 *   2 = side by side
 *   3-4 = 2x2 grid
 *   5+ = adaptive rows
 *
 * Screen share mode: screen takes 70% width, participants in sidebar.
 * Uses Framer Motion LayoutGroup for smooth reflow animations.
 */

import React, { memo, useMemo } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import ParticipantTile from './ParticipantTile';

// ---------------------------------------------------------------------------
// Grid layout calculator
// ---------------------------------------------------------------------------
function getGridClasses(count) {
  if (count <= 1) return 'grid-cols-1 grid-rows-1';
  if (count === 2) return 'grid-cols-2 grid-rows-1';
  if (count <= 4) return 'grid-cols-2 grid-rows-2';
  if (count <= 6) return 'grid-cols-3 grid-rows-2';
  if (count <= 9) return 'grid-cols-3 grid-rows-3';
  return 'grid-cols-4 auto-rows-fr';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const VideoGrid = memo(function VideoGrid({
  participants = [],
  currentUserId,
}) {
  // Determine if anyone is screen sharing
  const screenSharer = useMemo(
    () => participants.find((p) => p.is_screen_sharing),
    [participants]
  );

  // Split participants: screen sharer vs others
  const otherParticipants = useMemo(
    () => (screenSharer ? participants.filter((p) => p.id !== screenSharer.id) : participants),
    [participants, screenSharer]
  );

  // Screen share mode layout
  if (screenSharer) {
    return (
      <LayoutGroup>
        <div className="flex h-full w-full gap-3 p-3">
          {/* Main screen share area - 70% */}
          <div className="flex-[7] min-w-0">
            <AnimatePresence mode="popLayout">
              <ParticipantTile
                key={`screen-${screenSharer.id}`}
                participant={screenSharer}
                isLocal={screenSharer.user_id === currentUserId}
                isScreenShare
              />
            </AnimatePresence>
          </div>

          {/* Sidebar with participants - 30% */}
          <div className="flex-[3] flex flex-col gap-2 overflow-y-auto min-w-[180px]">
            <AnimatePresence mode="popLayout">
              {participants.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  isLocal={p.user_id === currentUserId}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </LayoutGroup>
    );
  }

  // Standard grid layout
  const gridClasses = getGridClasses(participants.length);

  return (
    <LayoutGroup>
      <div className={`
        grid ${gridClasses}
        h-full w-full gap-3 p-3
      `}>
        <AnimatePresence mode="popLayout">
          {participants.map((p) => (
            <ParticipantTile
              key={p.id}
              participant={p}
              isLocal={p.user_id === currentUserId}
            />
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
});

export default VideoGrid;
