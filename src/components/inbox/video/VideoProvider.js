/**
 * VideoProvider - Real browser media provider
 *
 * Uses getUserMedia / getDisplayMedia for actual mic, camera, and screen sharing.
 * No external dependency (LiveKit/Daily) needed — works peer-to-peer via browser APIs.
 * Tracks are exposed as MediaStream objects for <video> elements.
 */

class BrowserMediaProvider {
  constructor() {
    this._connected = false;
    this._audioTrack = null;
    this._videoTrack = null;
    this._screenStream = null;
    this._localStream = null;
    this._listeners = {};
    this._roomId = null;
  }

  get isConnected() {
    return this._connected;
  }

  /** The local camera+mic MediaStream (or null) */
  get localStream() {
    return this._localStream;
  }

  /** The screen share MediaStream (or null) */
  get screenStream() {
    return this._screenStream;
  }

  /**
   * Connect to a "room" — requests mic+camera permissions.
   * Falls back gracefully if user denies permissions.
   */
  async connect(roomId) {
    if (this._connected) return;
    this._roomId = roomId;

    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      this._audioTrack = this._localStream.getAudioTracks()[0] || null;
      this._videoTrack = this._localStream.getVideoTracks()[0] || null;
    } catch (err) {
      console.warn('[BrowserMediaProvider] getUserMedia failed, trying audio-only:', err.name);
      try {
        this._localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        this._audioTrack = this._localStream.getAudioTracks()[0] || null;
        this._videoTrack = null;
      } catch (audioErr) {
        console.warn('[BrowserMediaProvider] Audio-only also failed:', audioErr.name);
        this._localStream = null;
        this._audioTrack = null;
        this._videoTrack = null;
      }
    }

    this._connected = true;
    this._emit('connected', { roomId });
  }

  /**
   * Disconnect — stop all tracks and release media.
   */
  async disconnect() {
    if (!this._connected) return;

    // Stop all local tracks
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    if (this._screenStream) {
      this._screenStream.getTracks().forEach(t => t.stop());
      this._screenStream = null;
    }

    this._audioTrack = null;
    this._videoTrack = null;
    this._connected = false;

    const roomId = this._roomId;
    this._roomId = null;
    this._emit('disconnected', { roomId });
  }

  /**
   * Toggle local audio track enabled/disabled.
   */
  toggleAudio(enabled) {
    if (this._audioTrack) {
      this._audioTrack.enabled = enabled;
    }
    this._emit('trackToggled', { kind: 'audio', enabled });
  }

  /**
   * Toggle local video track enabled/disabled.
   */
  toggleVideo(enabled) {
    if (this._videoTrack) {
      this._videoTrack.enabled = enabled;
    }
    this._emit('trackToggled', { kind: 'video', enabled });
  }

  /**
   * Toggle screen sharing via getDisplayMedia.
   * Returns true if screen share started, false if stopped/cancelled.
   */
  async toggleScreen(enabled) {
    if (enabled) {
      try {
        this._screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        // Listen for user clicking "Stop sharing" in browser chrome
        const videoTrack = this._screenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener('ended', () => {
            this._screenStream = null;
            this._emit('screenShareEnded');
            this._emit('trackToggled', { kind: 'screen', enabled: false });
          });
        }

        this._emit('trackToggled', { kind: 'screen', enabled: true });
        return true;
      } catch (err) {
        // User cancelled the screen picker
        console.warn('[BrowserMediaProvider] getDisplayMedia cancelled:', err.name);
        this._screenStream = null;
        this._emit('trackToggled', { kind: 'screen', enabled: false });
        return false;
      }
    } else {
      // Stop screen share
      if (this._screenStream) {
        this._screenStream.getTracks().forEach(t => t.stop());
        this._screenStream = null;
      }
      this._emit('trackToggled', { kind: 'screen', enabled: false });
      return false;
    }
  }

  /**
   * Get local tracks info.
   */
  getLocalTracks() {
    return {
      audio: this._audioTrack ? { kind: 'audio', enabled: this._audioTrack.enabled, track: this._audioTrack } : null,
      video: this._videoTrack ? { kind: 'video', enabled: this._videoTrack.enabled, track: this._videoTrack } : null,
      screen: this._screenStream ? { kind: 'screen', enabled: true, stream: this._screenStream } : null,
    };
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
      try { h(payload); } catch (e) { console.error(`[BrowserMediaProvider] listener error (${event}):`, e); }
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a video provider instance.
 * @returns {BrowserMediaProvider}
 */
export function createVideoProvider() {
  return new BrowserMediaProvider();
}

export { BrowserMediaProvider };
export default createVideoProvider;
