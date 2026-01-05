/**
 * Screen Capture Service
 * Handles browser screen sharing and frame capture
 */

class ScreenCaptureService {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
    this.isCapturing = false;
    this.onCaptureEnded = null;
  }

  async startCapture() {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "browser"
        },
        audio: false
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = resolve;
      });
      await this.videoElement.play();

      this.canvas = document.createElement('canvas');
      this.canvas.width = this.videoElement.videoWidth;
      this.canvas.height = this.videoElement.videoHeight;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      this.isCapturing = true;

      this.stream.getVideoTracks()[0].onended = () => {
        this.stopCapture();
        this.onCaptureEnded?.();
      };

      console.log('[ScreenCapture] Started successfully');
      return true;
      
    } catch (error) {
      console.error("[ScreenCapture] Failed:", error);
      return false;
    }
  }

  captureFrame() {
    if (!this.isCapturing || !this.videoElement || !this.ctx || !this.canvas) {
      return null;
    }

    try {
      this.ctx.drawImage(
        this.videoElement, 
        0, 0, 
        this.canvas.width, 
        this.canvas.height
      );
    } catch (error) {
      console.error('[ScreenCapture] Frame capture error:', error);
      return null;
    }

    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }

  stopCapture() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.stream = null;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
    this.isCapturing = false;
    console.log('[ScreenCapture] Stopped');
  }
}

export const screenCaptureService = new ScreenCaptureService();