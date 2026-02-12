import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Barcode, Keyboard, CameraOff, Scan, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Html5Qrcode } from "html5-qrcode";

// Shared BarcodeScanner component with camera support for mobile devices.
// Props: { onScan, isActive, scannerId }
// scannerId defaults to "barcode-scanner-region" - needed to avoid DOM ID conflicts
// when multiple scanners exist on different tabs.

export default function BarcodeScanner({ onScan, isActive, scannerId = "barcode-scanner-region" }) {
  const { t } = useTheme();
  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [manualEntry, setManualEntry] = useState("");
  const [scanMode, setScanMode] = useState("manual"); // "manual" or "camera"
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);

  // Check if device has camera on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);
      } catch (err) {
        console.log("Camera check failed:", err);
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  // Focus input when in manual mode and active
  useEffect(() => {
    if (isActive && scanMode === "manual" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, scanMode]);

  // Start camera scanner
  const startCameraScanner = async () => {
    if (!scannerRef.current) return;

    setCameraError(null);
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        formatsToSupport: [
          0,  // QR_CODE
          1,  // AZTEC
          2,  // CODABAR
          3,  // CODE_39
          4,  // CODE_93
          5,  // CODE_128
          6,  // DATA_MATRIX
          7,  // MAXICODE
          8,  // ITF
          9,  // EAN_13
          10, // EAN_8
          11, // PDF_417
          12, // RSS_14
          13, // RSS_EXPANDED
          14, // UPC_A
          15, // UPC_E
          16, // UPC_EAN_EXTENSION
        ],
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText, decodedResult) => {
          // Successfully scanned
          stopCameraScanner();
          onScan(decodedText);
        },
        (errorMessage) => {
          // Scan error - ignore, keep scanning
        }
      );
    } catch (err) {
      console.error("Camera scanner error:", err);
      setIsScanning(false);
      setCameraError(
        err.message.includes("Permission")
          ? "Camera access denied. Allow camera access in your browser settings."
          : "Could not start camera. Try manual entry."
      );
    }
  };

  // Stop camera scanner
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.log("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  // Cleanup on unmount or mode change
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Handle mode switch
  const handleModeSwitch = async (newMode) => {
    if (newMode === scanMode) return;

    if (scanMode === "camera") {
      await stopCameraScanner();
    }

    setScanMode(newMode);
    setCameraError(null);

    if (newMode === "camera") {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        startCameraScanner();
      }, 100);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualEntry.trim()) {
      onScan(manualEntry.trim());
      setManualEntry("");
    }
  };

  // Handle barcode scanner input (fast sequential keypresses from hardware scanner)
  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && manualEntry.trim()) {
      onScan(manualEntry.trim());
      setManualEntry("");
    }
  }, [manualEntry, onScan]);

  return (
    <div className="space-y-4">
      {/* Mode toggle - only show if camera is available */}
      {hasCamera && (
        <div className={`flex gap-2 p-1 ${t('bg-gray-100', 'bg-zinc-900/50')} rounded-lg`}>
          <button
            onClick={() => handleModeSwitch("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
              scanMode === "camera"
                ? "bg-cyan-600 text-white"
                : `${t('text-gray-500 hover:text-gray-900', 'text-zinc-400 hover:text-white')}`
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm">Camera</span>
          </button>
          <button
            onClick={() => handleModeSwitch("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
              scanMode === "manual"
                ? "bg-cyan-600 text-white"
                : `${t('text-gray-500 hover:text-gray-900', 'text-zinc-400 hover:text-white')}`
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-sm">Manual</span>
          </button>
        </div>
      )}

      {/* Camera scanner view */}
      {scanMode === "camera" && (
        <div className="space-y-4">
          {cameraError ? (
            <div className="p-4 border-2 border-dashed border-red-500/30 rounded-xl bg-red-500/5 text-center">
              <CameraOff className="w-10 h-10 mx-auto text-red-400 mb-3" />
              <p className="text-red-400 text-sm mb-3">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeSwitch("manual")}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Manual entry
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Scanner viewport */}
              <div
                id={scannerId}
                ref={scannerRef}
                className="rounded-xl overflow-hidden bg-black"
                style={{ minHeight: "280px" }}
              />

              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative">
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-cyan-500 shadow-lg shadow-cyan-500/50 animate-pulse"
                      style={{ width: "250px", marginLeft: "-125px", left: "50%" }}
                    />
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm text-center">
                  Point the camera at the barcode
                </p>
              </div>
            </div>
          )}

          {/* Stop button when scanning */}
          {isScanning && (
            <Button
              variant="outline"
              className="w-full"
              onClick={stopCameraScanner}
            >
              <X className="w-4 h-4 mr-2" />
              Stop Camera
            </Button>
          )}

          {/* Restart button when not scanning and no error */}
          {!isScanning && !cameraError && (
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              onClick={startCameraScanner}
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          )}
        </div>
      )}

      {/* Manual entry view */}
      {scanMode === "manual" && (
        <>
          <div className="relative">
            <div className="p-6 border-2 border-dashed border-cyan-500/30 rounded-xl bg-cyan-500/5 text-center">
              <Barcode className="w-12 h-12 mx-auto text-cyan-400 mb-3" />
              <p className={`${t('text-gray-600', 'text-zinc-400')} text-sm`}>
                {hasCamera
                  ? "Type EAN code manually or use the camera"
                  : "Type EAN code or scan with a barcode scanner"
                }
              </p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="EAN / Barcode..."
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`flex-1 ${t('bg-white border-gray-200', 'bg-zinc-900/50 border-white/10')}`}
              autoFocus={isActive && scanMode === "manual"}
            />
            <Button type="submit" disabled={!manualEntry.trim()}>
              <Scan className="w-4 h-4 mr-2" />
              Scan
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
