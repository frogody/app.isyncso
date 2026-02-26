/**
 * VideoProvider - Real browser media provider
 *
 * Uses getUserMedia / getDisplayMedia for actual mic, camera, and screen sharing.
 * No external dependency (LiveKit/Daily) needed — works peer-to-peer via browser APIs.
 * Tracks are exposed as MediaStream objects for <video> elements.
 *
 * Includes active speaker detection via Web Audio API analyser nodes.
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
    this._audioContext = null;
    this._analyserNode = null;
    this._speakerDetectionInterval = null;
    this._isSpeaking = false;
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

  /** Whether the local user is currently speaking */
  get isSpeaking() {
    return this._isSpeaking;
  }

  /**
   * Connect to a "room" — requests mic+camera permissions separately
   * for better browser compatibility and error handling.
   */
  async connect(roomId) {
    if (this._connected) return;
    this._roomId = roomId;

    let audioStream = null;
    let videoStream = null;

    // Request audio (mic) first — this is critical
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this._audioTrack = audioStream.getAudioTracks()[0] || null;
    } catch (err) {
      console.warn('[BrowserMediaProvider] Mic access failed:', err.name, err.message);
      this._audioTrack = null;
      this._emit('permissionError', { kind: 'audio', error: err });
    }

    // Request video (camera) separately — falls back gracefully
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });
      this._videoTrack = videoStream.getVideoTracks()[0] || null;
    } catch (err) {
      console.warn('[BrowserMediaProvider] Camera access failed:', err.name, err.message);
      this._videoTrack = null;
      this._emit('permissionError', { kind: 'video', error: err });
    }

    // Combine into a single local stream
    const tracks = [];
    if (this._audioTrack) tracks.push(this._audioTrack);
    if (this._videoTrack) tracks.push(this._videoTrack);

    if (tracks.length > 0) {
      this._localStream = new MediaStream(tracks);
    } else {
      this._localStream = null;
    }

    // Start active speaker detection if we have audio
    if (this._audioTrack) {
      this._startSpeakerDetection();
    }

    this._connected = true;
    this._emit('connected', {
      roomId,
      hasAudio: !!this._audioTrack,
      hasVideo: !!this._videoTrack,
    });
  }

  /**
   * Disconnect — stop all tracks and release media.
   */
  async disconnect() {
    if (!this._connected) return;

    this._stopSpeakerDetection();

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
            // Notify peers to switch back to camera track
            this._emit('trackChanged', { kind: 'camera', track: this._videoTrack });
          });
        }

        this._emit('trackToggled', { kind: 'screen', enabled: true });
        // Notify peers to switch to screen share track
        if (videoTrack) {
          this._emit('trackChanged', { kind: 'screen', track: videoTrack });
        }
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
      // Notify peers to switch back to camera track
      this._emit('trackChanged', { kind: 'camera', track: this._videoTrack });
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

  // ---- Active Speaker Detection ----

  _startSpeakerDetection() {
    if (!this._audioTrack) return;

    try {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this._audioContext.createMediaStreamSource(
        new MediaStream([this._audioTrack])
      );
      this._analyserNode = this._audioContext.createAnalyser();
      this._analyserNode.fftSize = 512;
      this._analyserNode.smoothingTimeConstant = 0.4;
      source.connect(this._analyserNode);

      const dataArray = new Uint8Array(this._analyserNode.frequencyBinCount);

      this._speakerDetectionInterval = setInterval(() => {
        if (!this._analyserNode) return;
        this._analyserNode.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const wasSpeaking = this._isSpeaking;
        this._isSpeaking = average > 15; // Threshold for "speaking"

        if (wasSpeaking !== this._isSpeaking) {
          this._emit('speakingChanged', { isSpeaking: this._isSpeaking });
        }
      }, 200);
    } catch (err) {
      console.warn('[BrowserMediaProvider] Speaker detection setup failed:', err);
    }
  }

  _stopSpeakerDetection() {
    if (this._speakerDetectionInterval) {
      clearInterval(this._speakerDetectionInterval);
      this._speakerDetectionInterval = null;
    }
    if (this._audioContext) {
      this._audioContext.close().catch(() => {});
      this._audioContext = null;
    }
    this._analyserNode = null;
    this._isSpeaking = false;
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
