// Shared barcode scanner configuration for warehouse scanning.
// Used by BarcodeScanner.jsx, InventoryReceiving.jsx, and PalletBuilder.jsx.

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

// Video constraints for getUserMedia — requests HD for sharper barcode decoding.
// Uses "ideal" so browsers that can't meet a constraint silently ignore it.
const VIDEO_CONSTRAINTS = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

export const SCANNER_CONFIG = {
  fps: 15,
  qrbox: (viewfinderWidth, viewfinderHeight) => ({
    width: Math.floor(viewfinderWidth * 0.25),
    height: Math.floor(viewfinderHeight * 0.2),
  }),
  aspectRatio: 1.777778,
  formatsToSupport: WAREHOUSE_FORMATS,
  experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  videoConstraints: VIDEO_CONSTRAINTS,
};

/**
 * Apply camera optimizations after the scanner has started.
 * Requests continuous autofocus and 1.5× zoom so barcodes are sharp
 * and fill the smaller scan region from ~20cm away.
 *
 * Non-fatal — iOS Safari doesn't support focusMode/zoom and that's fine.
 */
export async function optimizeCameraAfterStart(html5QrCode) {
  await new Promise(r => setTimeout(r, 500));

  try {
    const capabilities = html5QrCode.getRunningTrackCapabilities();
    const constraints = {};

    if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
      constraints.focusMode = "continuous";
    }

    if (capabilities.zoom) {
      const maxZoom = capabilities.zoom.max || 1;
      const targetZoom = Math.min(1.5, maxZoom);
      if (targetZoom > (capabilities.zoom.min || 1)) {
        constraints.zoom = targetZoom;
      }
    }

    if (Object.keys(constraints).length > 0) {
      await html5QrCode.applyVideoConstraints({ advanced: [constraints] });
      console.log("[Scanner] Camera optimizations applied:", constraints);
    }
  } catch (err) {
    console.log("[Scanner] Camera optimization skipped:", err.message || err);
  }
}
