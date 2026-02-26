// Shared barcode scanner configuration for warehouse scanning.
// Used by BarcodeScanner.jsx, InventoryReceiving.jsx, and PalletBuilder.jsx.
//
// IMPORTANT: html5-qrcode v2.3.8 splits config across TWO places:
//   1) Html5Qrcode constructor (2nd arg) — formatsToSupport, experimentalFeatures, verbose
//   2) .start() config (2nd arg)         — fps, qrbox, aspectRatio, videoConstraints
// Passing formatsToSupport in the .start() config does NOTHING.

// Warehouse-relevant barcode formats only (faster than scanning all 17)
export const WAREHOUSE_FORMATS = [
  9,  // EAN_13
  10, // EAN_8
  14, // UPC_A
  15, // UPC_E
  5,  // CODE_128
  8,  // ITF
  3,  // CODE_39
];

// Config for the Html5Qrcode CONSTRUCTOR — controls decoder setup.
export const SCANNER_INIT_CONFIG = {
  formatsToSupport: WAREHOUSE_FORMATS,
  experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  verbose: false,
};

// Video constraints for getUserMedia — requests HD rear camera for barcode scanning.
// Uses "ideal" so browsers that can't meet a constraint silently ignore it.
// facingMode MUST be here because when videoConstraints is present in the .start()
// config, html5-qrcode bypasses the first argument and uses these directly.
const VIDEO_CONSTRAINTS = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// Config for .start() — controls camera and scan region.
// qrbox MUST be wide for 1D barcodes. Barcodes are horizontal lines —
// a narrow qrbox (e.g. 25%) forces users to hold the phone unreasonably close.
// Library minimum is 50px per dimension (Constants.MIN_QR_BOX_SIZE).
export const SCANNER_CONFIG = {
  fps: 10,
  qrbox: (viewfinderWidth, viewfinderHeight) => ({
    width: Math.floor(viewfinderWidth * 0.8),
    height: Math.floor(Math.max(viewfinderHeight * 0.35, 60)),
  }),
  aspectRatio: 1.777778,
  videoConstraints: VIDEO_CONSTRAINTS,
};

/**
 * Apply camera optimizations after the scanner has started.
 * Bypasses the html5-qrcode library wrapper (which doesn't properly forward
 * `advanced` constraints) and applies directly to the MediaStreamTrack.
 *
 * Requests continuous autofocus + 1.5× zoom. Falls back to manual focus
 * at 25cm if continuous mode isn't available.
 *
 * Non-fatal — iOS Safari doesn't support focusMode/zoom and that's fine.
 *
 * @param {string} scannerId - DOM element ID where the scanner renders
 */
export async function optimizeCameraAfterStart(scannerId) {
  // Camera needs time to fully initialize before constraints take effect
  await new Promise(r => setTimeout(r, 1500));

  try {
    const videoEl = document.querySelector(`#${scannerId} video`);
    if (!videoEl || !videoEl.srcObject) {
      console.log("[Scanner] No video element found for optimization");
      return;
    }

    const track = videoEl.srcObject.getVideoTracks()[0];
    if (!track) return;

    const capabilities = track.getCapabilities();
    const advanced = {};

    // 1. Focus: prefer continuous autofocus, fall back to manual at ~25cm
    if (capabilities.focusMode) {
      if (capabilities.focusMode.includes("continuous")) {
        advanced.focusMode = "continuous";
      } else if (capabilities.focusMode.includes("manual") && capabilities.focusDistance) {
        advanced.focusMode = "manual";
        advanced.focusDistance = Math.max(0.25, capabilities.focusDistance.min);
      }
    }

    // 2. Zoom: apply 1.5× (clamped to device max)
    if (capabilities.zoom) {
      const targetZoom = Math.min(1.5, capabilities.zoom.max || 1);
      if (targetZoom > (capabilities.zoom.min || 1)) {
        advanced.zoom = targetZoom;
      }
    }

    if (Object.keys(advanced).length > 0) {
      await track.applyConstraints({ advanced: [advanced] });
      console.log("[Scanner] Camera optimizations applied:", advanced);
    } else {
      console.log("[Scanner] No advanced camera capabilities available");
    }
  } catch (err) {
    console.log("[Scanner] Camera optimization skipped:", err.message || err);
  }
}
