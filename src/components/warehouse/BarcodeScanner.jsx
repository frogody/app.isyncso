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

// Beep feedback using Web Audio API — no file needed
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
};

// Warehouse-relevant barcode formats only (faster than scanning all 17)
const WAREHOUSE_FORMATS = [
  9,  // EAN_13
  10, // EAN_8
  14, // UPC_A
  15, // UPC_E
  5,  // CODE_128
  8,  // ITF
  3,  // CODE_39
];

export default function BarcodeScanner({ onScan, isActive, scannerId = "barcode-scanner-region" }) {
  const { t } = useTheme();
  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScanRef = useRef({ text: '', time: 0 });
  const [manualEntry, setManualEntry] = useState("");
  const [scanMode, setScanMode] = useState("manual"); // "manual" or "camera"
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [scanFlash, setScanFlash] = useState(false);

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
        fps: 25,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
          width: Math.floor(viewfinderWidth * 0.8),
          height: Math.floor(viewfinderHeight * 0.4),
        }),
        aspectRatio: 1.777778,
        formatsToSupport: WAREHOUSE_FORMATS,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Continuous scanning with cooldown to prevent duplicates
          const now = Date.now();
          const last = lastScanRef.current;
          if (decodedText === last.text && now - last.time < 1500) return;
          lastScanRef.current = { text: decodedText, time: now };
          // Feedback
          playBeep();
          navigator.vibrate?.(100);
          setScanFlash(true);
          setTimeout(() => setScanFlash(false), 300);
          setLastScanned(decodedText);
          onScan(decodedText);
        },
        () => {}
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
                className={`rounded-xl overflow-hidden bg-black transition-all duration-300 ${scanFlash ? 'ring-4 ring-green-500' : ''}`}
                style={{ minHeight: "280px" }}
              />

              {/* Instructions + last scanned */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                {lastScanned ? (
                  <p className="text-green-400 text-sm text-center font-mono truncate">
                    {lastScanned}
                  </p>
                ) : (
                  <p className="text-white text-sm text-center">
                    Point the camera at the barcode
                  </p>
                )}
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
