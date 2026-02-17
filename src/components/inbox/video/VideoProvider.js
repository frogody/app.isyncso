/**
 * VideoProvider - Video call provider abstraction layer
 *
 * Abstract interface for video call providers (LiveKit, Daily.co, etc.).
 * Ships with a mock provider for development; real integrations plug in later.
 */

// ---------------------------------------------------------------------------
// Abstract provider interface (documented for future implementors)
// ---------------------------------------------------------------------------
// Every provider must expose:
//   connect(roomId, token)   → Promise<void>
//   disconnect()             → Promise<void>
//   getLocalTracks()         → { audio, video, screen }
//   getRemoteTracks()        → Map<participantId, { audio, video, screen }>
//   toggleAudio(enabled)     → void
//   toggleVideo(enabled)     → void
//   toggleScreen(enabled)    → Promise<void>
//   on(event, handler)       → void
//   off(event, handler)      → void
//   isConnected              → boolean

// ---------------------------------------------------------------------------
// Mock provider — simulates connection lifecycle for Phase 2.1
// ---------------------------------------------------------------------------
class MockVideoProvider {
  constructor() {
    this._connected = false;
    this._audioEnabled = true;
    this._videoEnabled = true;
    this._screenEnabled = false;
    this._listeners = {};
    this._roomId = null;
  }

  get isConnected() {
    return this._connected;
  }

  /**
   * Simulate connecting to a room.
   * @param {string} roomId
   * @param {string} token - provider-specific auth token (ignored in mock)
   */
  async connect(roomId, token) {
    if (this._connected) return;
    this._roomId = roomId;

    // Simulate network handshake delay
    await _delay(600);

    this._connected = true;
    this._audioEnabled = true;
    this._videoEnabled = true;
    this._screenEnabled = false;
    this._emit('connected', { roomId });
  }

  /**
   * Simulate disconnecting from the room.
   */
  async disconnect() {
    if (!this._connected) return;

    await _delay(200);

    this._connected = false;
    this._screenEnabled = false;
    const roomId = this._roomId;
    this._roomId = null;
    this._emit('disconnected', { roomId });
  }

  /**
   * Return local media track references (empty in mock).
   */
  getLocalTracks() {
    return {
      audio: this._audioEnabled ? { kind: 'audio', enabled: true, mock: true } : null,
      video: this._videoEnabled ? { kind: 'video', enabled: true, mock: true } : null,
      screen: this._screenEnabled ? { kind: 'screen', enabled: true, mock: true } : null,
    };
  }

  /**
   * Return remote participant tracks (empty Map in mock).
   */
  getRemoteTracks() {
    return new Map();
  }

  /**
   * Toggle local audio track.
   */
  toggleAudio(enabled) {
    this._audioEnabled = enabled;
    this._emit('trackToggled', { kind: 'audio', enabled });
  }

  /**
   * Toggle local video track.
   */
  toggleVideo(enabled) {
    this._videoEnabled = enabled;
    this._emit('trackToggled', { kind: 'video', enabled });
  }

  /**
   * Toggle screen sharing.
   */
  async toggleScreen(enabled) {
    await _delay(300);
    this._screenEnabled = enabled;
    this._emit('trackToggled', { kind: 'screen', enabled });
  }

  // ---- Event bus ----

  on(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  }

  off(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(h => h !== handler);
  }

  _emit(event, payload) {
    (this._listeners[event] || []).forEach(h => {
      try { h(payload); } catch (e) { console.error(`[MockVideoProvider] listener error (${event}):`, e); }
    });
  }
}

// ---------------------------------------------------------------------------
// LiveKit stub — placeholder for Phase 2.2
// ---------------------------------------------------------------------------
class LiveKitProvider extends MockVideoProvider {
  constructor() {
    super();
    console.info('[LiveKitProvider] Using mock implementation — real LiveKit integration coming in Phase 2.2');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a video provider instance.
 * @param {'mock' | 'livekit'} type
 * @returns {MockVideoProvider}
 */
export function createVideoProvider(type = 'mock') {
  switch (type) {
    case 'livekit':
      return new LiveKitProvider();
    case 'mock':
    default:
      return new MockVideoProvider();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { MockVideoProvider, LiveKitProvider };
export default createVideoProvider;
