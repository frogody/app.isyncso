/**
 * Video Call Infrastructure - Barrel Export
 *
 * Phase 2.1: Provider abstraction, hooks, and UI controls.
 * Phase 2.2: Full VideoCallRoom UI with grid, reactions, header.
 * Real media integration (LiveKit/Daily.co) ships in Phase 2.3.
 */

export { useVideoCall } from './useVideoCall';
export { createVideoProvider, MockVideoProvider, LiveKitProvider } from './VideoProvider';
export { default as CallControls } from './CallControls';
export { default as CallBanner } from './CallBanner';
export { default as VideoCallRoom } from './VideoCallRoom';
export { default as VideoGrid } from './VideoGrid';
export { default as ParticipantTile } from './ParticipantTile';
export { default as CallHeader } from './CallHeader';
export { default as ReactionsOverlay } from './ReactionsOverlay';
export { default as CallEndScreen } from './CallEndScreen';
export { default as MeetingLinkModal } from './MeetingLinkModal';
