import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Package, Scan, Check, AlertTriangle, Plus, Minus,
  Camera, Barcode, Boxes, ArrowRight, X, RefreshCw,
  Warehouse, MapPin, CheckCircle2, AlertCircle, Keyboard,
  CameraOff, SwitchCamera, Sun, Moon, PlayCircle, StopCircle,
  Clock, History, Download, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/components/context/UserContext";
import { PermissionGuard } from "@/components/guards";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';
import { toast } from "sonner";
import {
  scanForReceiving,
  receiveStock,
  getDashboardData,
  startReceivingSession,
  closeReceivingSession,
} from "@/lib/services/inventory-service";
import {
  listExpectedDeliveries,
  getReceivingHistory,
  listReceivingSessions,
  getSessionReceivingLogs,
} from "@/lib/db/queries";
import { exportSessionCSV, exportSessionPDF } from "@/components/receiving/SessionExport";
import { Html5Qrcode } from "html5-qrcode";

// Barcode scanner component with camera support for mobile devices
function BarcodeScanner({ onScan, isActive }) {
  const { t } = useTheme();
  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const bufferRef = useRef(""); // Ref-based buffer for hardware scanner reliability
  const lastKeystrokeRef = useRef(0);
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
      const html5QrCode = new Html5Qrcode("barcode-scanner-region");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 300, height: 100 },
        aspectRatio: 1.777778,
        // Focus on EAN/UPC barcode formats for warehouse receiving
        formatsToSupport: [
          9,  // EAN_13 — primary product barcode format
          10, // EAN_8
          14, // UPC_A
          15, // UPC_E
          5,  // CODE_128 — common in shipping labels
          8,  // ITF — used on carton barcodes (ITF-14)
          3,  // CODE_39
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
    // Use ref buffer for hardware scanner reliability (state may lag behind fast input)
    const value = (bufferRef.current || manualEntry).trim();
    if (value) {
      onScan(value);
      setManualEntry("");
      bufferRef.current = "";
    }
  };

  // Handle input changes — keep ref buffer in sync for hardware scanner
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setManualEntry(val);
    bufferRef.current = val;
    lastKeystrokeRef.current = Date.now();
  }, []);

  // Handle Enter key from hardware scanner or keyboard
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = (bufferRef.current || manualEntry).trim();
      if (value) {
        onScan(value);
        setManualEntry("");
        bufferRef.current = "";
      }
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
                id="barcode-scanner-region"
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
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
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

// Product card after scan
function ScannedProductCard({ scanResult, onReceive, onCancel }) {
  const { t } = useTheme();

  // Calculate initial values safely
  const initialQuantity = scanResult?.expectedDelivery
    ? (scanResult.expectedDelivery.quantity_expected - scanResult.expectedDelivery.quantity_received) || 1
    : 1;

  const [quantity, setQuantity] = useState(initialQuantity);
  const [condition, setCondition] = useState("good");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Defensive: ensure scanResult and product exist (after hooks)
  if (!scanResult || !scanResult.product) return null;

  const expectedQty = scanResult.expectedDelivery?.quantity_expected || 0;
  const receivedQty = scanResult.expectedDelivery?.quantity_received || 0;
  const remainingQty = expectedQty - receivedQty;

  const handleSubmit = () => {
    onReceive({
      productId: scanResult.product.id,
      quantity,
      condition,
      location,
      notes,
      expectedDeliveryId: scanResult.expectedDelivery?.id,
    });
  };

  return (
    <div className={`p-4 rounded-xl ${t('bg-white/90 border-cyan-300/40', 'bg-zinc-900/70 border-cyan-500/30')} border`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`text-sm font-bold ${t('text-gray-900', 'text-white')}`}>
            {scanResult.product.name}
          </h3>
          <div className="flex gap-2 mt-1">
            {scanResult.product.sku && (
              <Badge variant="outline" className="text-xs">
                SKU: {scanResult.product.sku}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              EAN: {scanResult.product.ean}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Expected delivery info */}
      {scanResult.expectedDelivery ? (
        <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Expected delivery found</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className={`${t('text-gray-500', 'text-zinc-500')}`}>Expected:</span>
              <span className={`ml-2 ${t('text-gray-900', 'text-white')}`}>{expectedQty}</span>
            </div>
            <div>
              <span className={`${t('text-gray-500', 'text-zinc-500')}`}>Received:</span>
              <span className={`ml-2 ${t('text-gray-900', 'text-white')}`}>{receivedQty}</span>
            </div>
            <div>
              <span className={`${t('text-gray-500', 'text-zinc-500')}`}>Remaining:</span>
              <span className={`ml-2 ${t('text-gray-900', 'text-white')} font-medium`}>{remainingQty}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">No expected delivery</span>
          </div>
          <p className={`mt-1 text-xs ${t('text-gray-500', 'text-zinc-400')}`}>
            This product is not on the expected deliveries list.
          </p>
        </div>
      )}

      {/* Current stock */}
      {scanResult.currentStock && (
        <div className={`mb-3 p-3 rounded-lg ${t('bg-gray-100 border-gray-200', 'bg-zinc-800/50 border-white/10')} border`}>
          <span className={`text-sm ${t('text-gray-600', 'text-zinc-400')}`}>Current stock:</span>
          <span className={`ml-2 ${t('text-gray-900', 'text-white')} font-medium`}>
            {scanResult.currentStock.quantity_on_hand} items
          </span>
          {scanResult.currentStock.warehouse_location && (
            <span className={`ml-2 text-xs ${t('text-gray-500', 'text-zinc-500')}`}>
              ({scanResult.currentStock.warehouse_location})
            </span>
          )}
        </div>
      )}

      {/* Quantity input */}
      <div className="space-y-3">
        <div>
          <Label>Quantity received</Label>
          <div className="flex items-center gap-2 mt-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className={`w-24 text-center ${t('bg-white border-gray-200', 'bg-zinc-900/50 border-white/10')}`}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            {remainingQty > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(remainingQty)}
                className={`text-xs ${t('text-gray-500', 'text-zinc-400')}`}
              >
                Max ({remainingQty})
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className={`mt-1 ${t('bg-white border-gray-200', 'bg-zinc-900/50 border-white/10')}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Location (optional)</Label>
            <Input
              placeholder="A1-B2..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={`mt-1 ${t('bg-white border-gray-200', 'bg-zinc-900/50 border-white/10')}`}
            />
          </div>
        </div>

        {condition !== "good" && (
          <div>
            <Label>Damage notes</Label>
            <Textarea
              placeholder="Describe the damage..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`mt-1 ${t('bg-white border-gray-200', 'bg-zinc-900/50 border-white/10')}`}
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSubmit} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
            <Check className="w-4 h-4 mr-2" />
            Receive ({quantity})
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Not found card
function NotFoundCard({ ean, onClose }) {
  const { t } = useTheme();

  return (
    <div className={`p-4 rounded-xl ${t('bg-white/90 border-red-300/40', 'bg-zinc-900/70 border-red-500/30')} border`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-red-500/10">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${t('text-gray-900', 'text-white')}`}>Product not found</h3>
          <p className={`text-sm ${t('text-gray-600', 'text-zinc-400')}`}>EAN: {ean}</p>
        </div>
      </div>
      <p className={`text-sm ${t('text-gray-600', 'text-zinc-400')} mb-3`}>
        This product is not in the system. Add it to products first.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>
    </div>
  );
}

// Recent receiving log
function RecentReceivingList({ items }) {
  const { t } = useTheme();

  if (!items || items.length === 0) {
    return (
      <div className={`text-center py-8 ${t('text-gray-500', 'text-zinc-500')}`}>
        <Boxes className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No receipts yet today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center justify-between p-3 rounded-lg ${t('bg-white/80 border-gray-100', 'bg-zinc-900/50 border-white/5')} border`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${
              item.condition === 'good'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              {item.condition === 'good' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className={`text-sm ${t('text-gray-900', 'text-white')}`}>{item.products?.name || 'Unknown product'}</p>
              <p className={`text-xs ${t('text-gray-500', 'text-zinc-500')}`}>
                {item.quantity_received}x • {new Date(item.received_at).toLocaleTimeString('en-GB')}
              </p>
            </div>
          </div>
          {item.warehouse_location && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {item.warehouse_location}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

// Success confirmation card after receiving
function ReceiveSuccessCard({ productName, quantity, isPartial, remainingQty, onClose }) {
  const { t } = useTheme();

  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`p-4 rounded-xl ${t('bg-white/90 border-green-300/40', 'bg-zinc-900/70 border-green-500/30')} border`}>
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-400" />
        </div>
        <h3 className={`text-sm font-bold ${t('text-gray-900', 'text-white')} mb-2`}>
          Receipt confirmed!
        </h3>
        <p className={`${t('text-gray-600', 'text-zinc-400')} mb-2`}>
          <span className={`${t('text-gray-900', 'text-white')} font-medium`}>{quantity}x</span> {productName}
        </p>
        {isPartial && (
          <p className="text-yellow-400 text-sm">
            Still {remainingQty} items expected
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className={`mt-4 ${t('text-gray-500', 'text-zinc-400')}`}
        >
          Next scan
        </Button>
      </div>
    </div>
  );
}

// Session duration timer
function SessionTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const start = new Date(startedAt).getTime();
      const diff = Date.now() - start;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(
        hours > 0
          ? `${hours}h ${minutes}m ${seconds}s`
          : `${minutes}m ${seconds}s`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span>{elapsed}</span>;
}

export default function InventoryReceiving({ embedded = false }) {
  const { user } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const [scanResult, setScanResult] = useState(null);
  const [notFoundEan, setNotFoundEan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(null);
  const [recentReceiving, setRecentReceiving] = useState([]);
  const [expectedDeliveries, setExpectedDeliveries] = useState([]);
  const [stats, setStats] = useState({
    pendingDeliveries: 0,
    receivedToday: 0,
    partialDeliveries: 0,
  });

  // Session state
  const [activeSession, setActiveSession] = useState(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionItemCount, setSessionItemCount] = useState(0);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedSessionLogs, setExpandedSessionLogs] = useState([]);

  const companyId = user?.company_id;
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      try {
        const [deliveries, history, sessions] = await Promise.all([
          listExpectedDeliveries(companyId, 'pending'),
          getReceivingHistory(companyId, 20),
          listReceivingSessions(companyId),
        ]);

        setExpectedDeliveries(deliveries);
        setRecentReceiving(history);

        // Check for active session and auto-resume
        const active = sessions.find((s) => s.status === 'active');
        if (active) {
          setActiveSession(active);
          // Load session-specific logs for count
          const sessionLogs = await getSessionReceivingLogs(active.id);
          setSessionItemCount(sessionLogs.reduce((sum, l) => sum + l.quantity_received, 0));
        }

        // Session history (closed sessions, last 20)
        setSessionHistory(sessions.filter((s) => s.status === 'closed').slice(0, 20));

        // Calculate stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayReceiving = history.filter(
          (r) => new Date(r.received_at) >= todayStart
        );

        setStats({
          pendingDeliveries: deliveries.length,
          receivedToday: todayReceiving.reduce((sum, r) => sum + r.quantity_received, 0),
          partialDeliveries: deliveries.filter((d) => d.status === 'partial').length,
        });
        setDataLoaded(true);
      } catch (error) {
        console.error('Failed to load receiving data:', error);
        toast.error('Could not load data');
        setDataLoaded(true);
      }
    };

    loadData();
  }, [companyId]);

  // Handle barcode scan
  const handleScan = async (ean) => {
    if (!companyId) {
      toast.error('No company selected');
      return;
    }

    setIsLoading(true);
    setScanResult(null);
    setNotFoundEan(null);

    try {
      const result = await scanForReceiving(companyId, ean);

      if (result.found) {
        setScanResult(result);
        toast.success(`Product found: ${result.product.name}`);
      } else {
        setNotFoundEan(ean);
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan error: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle receive stock
  const handleReceive = async (data) => {
    if (!companyId) return;

    setIsLoading(true);
    const productName = scanResult?.product?.name || 'Product';

    try {
      const result = await receiveStock(companyId, data.productId, data.quantity, {
        expectedDeliveryId: data.expectedDeliveryId,
        eanScanned: scanResult?.product?.ean,
        warehouseLocation: data.location,
        condition: data.condition,
        damageNotes: data.notes,
        receivedBy: user?.id,
        receivingSessionId: activeSession?.id,
      });

      // Refresh data
      const [deliveries, history] = await Promise.all([
        listExpectedDeliveries(companyId, 'pending'),
        getReceivingHistory(companyId, 20),
      ]);

      setExpectedDeliveries(deliveries);
      setRecentReceiving(history);

      // Update session item count
      if (activeSession) {
        setSessionItemCount((prev) => prev + data.quantity);
      }

      // Show success card instead of just clearing
      setScanResult(null);
      setReceiveSuccess({
        productName,
        quantity: data.quantity,
        isPartial: result.isPartial,
        remainingQty: result.remainingQuantity,
      });

      // Update stats
      setStats((prev) => ({
        ...prev,
        pendingDeliveries: deliveries.length,
        receivedToday: prev.receivedToday + data.quantity,
        partialDeliveries: deliveries.filter((d) => d.status === 'partial').length,
      }));
    } catch (error) {
      console.error('Receive error:', error);
      toast.error('Error receiving: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Start a receiving session
  const handleStartSession = async () => {
    if (!companyId || !sessionName.trim()) return;
    if (!user?.id) { toast.error('User session expired'); return; }
    if (sessionName.trim().length > 100) { toast.error('Session name too long (max 100 characters)'); return; }

    try {
      const session = await startReceivingSession(companyId, sessionName.trim(), user?.id);
      setActiveSession(session);
      setSessionItemCount(0);
      setShowStartDialog(false);
      setSessionName('');
      toast.success(`Session started: ${session.name}`);
    } catch (error) {
      console.error('Start session error:', error);
      toast.error('Could not start session');
    }
  };

  // Close a receiving session
  const handleCloseSession = async () => {
    if (!activeSession || !companyId) return;

    try {
      const userName = user?.full_name || user?.email || 'Unknown';
      const closed = await closeReceivingSession(
        activeSession.id,
        user?.id,
        userName,
        companyId,
        sessionNotes.trim() || undefined
      );
      setSessionHistory((prev) => [closed, ...prev]);
      setActiveSession(null);
      setSessionItemCount(0);
      setShowCloseDialog(false);
      setSessionNotes('');
      toast.success(`Session closed: ${closed.name} — ${closed.total_items_received} items received`);
    } catch (error) {
      console.error('Close session error:', error);
      toast.error('Could not close session');
    }
  };

  // Toggle expanded session in history
  const handleToggleSession = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setExpandedSessionLogs([]);
      return;
    }
    try {
      const logs = await getSessionReceivingLogs(sessionId);
      setExpandedSessionLogs(logs);
      setExpandedSession(sessionId);
    } catch (error) {
      toast.error('Could not load session details');
    }
  };

  // Export handlers
  const handleExportCSV = async (session) => {
    try {
      const logs = expandedSession === session.id
        ? expandedSessionLogs
        : await getSessionReceivingLogs(session.id);
      if (!logs || logs.length === 0) { toast.warning('No items to export'); return; }
      exportSessionCSV(session, logs);
      toast.success('CSV exported');
    } catch (error) {
      toast.error('Export failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleExportPDF = async (session) => {
    try {
      const logs = expandedSession === session.id
        ? expandedSessionLogs
        : await getSessionReceivingLogs(session.id);
      if (!logs || logs.length === 0) { toast.warning('No items to export'); return; }
      exportSessionPDF(session, logs);
      toast.success('PDF exported');
    } catch (error) {
      toast.error('Export failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const pageContent = (
    <>
        <div className={embedded ? "space-y-4" : "max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4"}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            {!embedded && (
            <div>
              <h1 className={`text-lg font-bold ${t('text-gray-900', 'text-white')}`}>Receiving</h1>
              <p className={`text-xs ${t('text-gray-600', 'text-zinc-400')}`}>Scan and receive incoming inventory</p>
            </div>
            )}
            <div className="flex items-center gap-2">
              {!activeSession && (
                <Button
                  onClick={() => setShowStartDialog(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  size="sm"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSessionHistory(!showSessionHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${t(
                  'bg-gray-100 hover:bg-gray-200 text-gray-600',
                  'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                )}`}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active Session Banner */}
          {activeSession && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-full bg-cyan-500/20">
                  <PlayCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${t('text-gray-900', 'text-white')} truncate`}>
                    {activeSession.name}
                  </p>
                  <div className={`flex items-center gap-3 text-xs ${t('text-gray-500', 'text-zinc-400')}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <SessionTimer startedAt={activeSession.started_at} />
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {sessionItemCount} items
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV(activeSession)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPDF(activeSession)}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  PDF
                </Button>
                <Button
                  onClick={() => setShowCloseDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Close Session
                </Button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <span className={`text-xs ${t('text-gray-500', 'text-zinc-500')}`}>Expected Deliveries</span>
              </div>
              <p className={`text-lg font-bold ${t('text-gray-900', 'text-white')}`}>{stats.pendingDeliveries}</p>
            </div>
            <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-green-400" />
                <span className={`text-xs ${t('text-gray-500', 'text-zinc-500')}`}>Received Today</span>
              </div>
              <p className={`text-lg font-bold ${t('text-gray-900', 'text-white')}`}>{stats.receivedToday} <span className={`text-xs font-normal ${t('text-gray-500', 'text-zinc-500')}`}>items</span></p>
            </div>
            <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className={`text-xs ${t('text-gray-500', 'text-zinc-500')}`}>Partial Deliveries</span>
              </div>
              <p className={`text-lg font-bold ${t('text-gray-900', 'text-white')}`}>{stats.partialDeliveries}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Scanner section */}
            <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <h2 className={`text-sm font-bold ${t('text-gray-900', 'text-white')} mb-2 flex items-center gap-2`}>
                <Scan className="w-5 h-5 text-cyan-400" />
                Barcode Scanner
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <>
                  {receiveSuccess ? (
                    <ReceiveSuccessCard
                      productName={receiveSuccess.productName}
                      quantity={receiveSuccess.quantity}
                      isPartial={receiveSuccess.isPartial}
                      remainingQty={receiveSuccess.remainingQty}
                      onClose={() => setReceiveSuccess(null)}
                    />
                  ) : scanResult ? (
                    <ScannedProductCard
                      scanResult={scanResult}
                      onReceive={handleReceive}
                      onCancel={() => setScanResult(null)}
                    />
                  ) : notFoundEan ? (
                    <NotFoundCard
                      ean={notFoundEan}
                      onClose={() => setNotFoundEan(null)}
                    />
                  ) : (
                    <BarcodeScanner
                      onScan={handleScan}
                      isActive={!scanResult && !notFoundEan && !receiveSuccess}
                    />
                  )}
                </>
              )}
            </div>

            {/* Recent receiving */}
            <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <h2 className={`text-sm font-bold ${t('text-gray-900', 'text-white')} mb-2 flex items-center gap-2`}>
                <Warehouse className="w-5 h-5 text-cyan-400" />
                {activeSession ? `Session Receipts` : 'Recent Receipts'}
              </h2>
              <RecentReceivingList
                items={
                  activeSession
                    ? recentReceiving.filter((r) => r.receiving_session_id === activeSession.id)
                    : recentReceiving
                }
              />
            </div>
          </div>

          {/* Expected deliveries */}
          <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
            <h2 className={`text-sm font-bold ${t('text-gray-900', 'text-white')} mb-2 flex items-center gap-2`}>
              <Package className="w-5 h-5 text-cyan-400" />
              Expected Deliveries ({expectedDeliveries.length})
            </h2>

            {expectedDeliveries.length === 0 ? (
              <div className={`text-center py-8 ${t('text-gray-500', 'text-zinc-500')}`}>
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No expected deliveries</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`text-left text-sm ${t('text-gray-500 border-gray-200', 'text-zinc-500 border-white/10')} border-b`}>
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Supplier</th>
                      <th className="pb-3 font-medium">Expected</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className={`${t('divide-gray-100', 'divide-white/5')} divide-y`}>
                    {expectedDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="text-sm">
                        <td className={`py-3 ${t('text-gray-900', 'text-white')}`}>
                          {delivery.products?.name || 'Unknown'}
                          {delivery.products?.ean && (
                            <span className={`ml-2 text-xs ${t('text-gray-500', 'text-zinc-500')}`}>
                              ({delivery.products.ean})
                            </span>
                          )}
                        </td>
                        <td className={`py-3 ${t('text-gray-600', 'text-zinc-400')}`}>
                          {delivery.suppliers?.name || '-'}
                        </td>
                        <td className={`py-3 ${t('text-gray-900', 'text-white')}`}>
                          {delivery.quantity_received} / {delivery.quantity_expected}
                        </td>
                        <td className="py-3">
                          <Badge
                            className={
                              delivery.status === 'partial'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            }
                          >
                            {delivery.status}
                          </Badge>
                        </td>
                        <td className={`py-3 ${t('text-gray-600', 'text-zinc-400')}`}>
                          {delivery.expected_date
                            ? new Date(delivery.expected_date).toLocaleDateString('en-GB')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Session History */}
          {showSessionHistory && (
            <div className={`${t('bg-white/80 border-gray-200', 'bg-zinc-900/50 border-zinc-800/60')} border rounded-xl p-3`}>
              <h2 className={`text-sm font-bold ${t('text-gray-900', 'text-white')} mb-2 flex items-center gap-2`}>
                <History className="w-5 h-5 text-cyan-400" />
                Session History ({sessionHistory.length})
              </h2>

              {sessionHistory.length === 0 ? (
                <div className={`text-center py-8 ${t('text-gray-500', 'text-zinc-500')}`}>
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No past sessions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionHistory.map((session) => (
                    <div key={session.id}>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${t('bg-white/80 border-gray-100 hover:bg-gray-50', 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/60')} border`}
                        onClick={() => handleToggleSession(session.id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-1.5 rounded-full bg-cyan-500/10 text-cyan-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${t('text-gray-900', 'text-white')} truncate`}>
                              {session.name}
                            </p>
                            <p className={`text-xs ${t('text-gray-500', 'text-zinc-500')}`}>
                              {new Date(session.started_at).toLocaleDateString('en-GB')} — {session.total_items_received} items, {session.total_eans_scanned} products
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleExportCSV(session); }}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleExportPDF(session); }}
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          {expandedSession === session.id ? (
                            <ChevronUp className={`w-4 h-4 ${t('text-gray-400', 'text-zinc-500')}`} />
                          ) : (
                            <ChevronDown className={`w-4 h-4 ${t('text-gray-400', 'text-zinc-500')}`} />
                          )}
                        </div>
                      </div>

                      {/* Expanded session logs */}
                      {expandedSession === session.id && (
                        <div className={`ml-4 mt-1 p-3 rounded-lg ${t('bg-gray-50 border-gray-100', 'bg-zinc-800/30 border-white/5')} border`}>
                          {session.notes && (
                            <p className={`text-xs ${t('text-gray-600', 'text-zinc-400')} mb-2 italic`}>
                              Notes: {session.notes}
                            </p>
                          )}
                          {expandedSessionLogs.length === 0 ? (
                            <p className={`text-xs ${t('text-gray-500', 'text-zinc-500')}`}>No items in this session</p>
                          ) : (
                            <div className="space-y-1">
                              {expandedSessionLogs.map((log) => (
                                <div key={log.id} className={`flex items-center justify-between text-xs py-1`}>
                                  <span className={t('text-gray-900', 'text-white')}>
                                    {log.products?.name || log.ean_scanned || 'Unknown'}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className={t('text-gray-600', 'text-zinc-400')}>
                                      {log.quantity_received}x
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {log.condition}
                                    </Badge>
                                    {log.warehouse_location && (
                                      <span className={t('text-gray-500', 'text-zinc-500')}>
                                        {log.warehouse_location}
                                      </span>
                                    )}
                                    <span className={t('text-gray-500', 'text-zinc-500')}>
                                      {new Date(log.received_at).toLocaleTimeString('en-GB')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Start Session Dialog */}
        <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <DialogContent className={t('bg-white', 'bg-zinc-900 border-zinc-800')}>
            <DialogHeader>
              <DialogTitle className={t('text-gray-900', 'text-white')}>
                Start Receiving Session
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Session Name</Label>
                <Input
                  placeholder="e.g. Pallet delivery DHL 10 feb"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className={`mt-1 ${t('bg-white border-gray-200', 'bg-zinc-800 border-zinc-700')}`}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartSession}
                disabled={!sessionName.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Session Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className={t('bg-white', 'bg-zinc-900 border-zinc-800')}>
            <DialogHeader>
              <DialogTitle className={t('text-gray-900', 'text-white')}>
                Close Receiving Session
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {activeSession && (
                <div className={`p-3 rounded-lg ${t('bg-gray-50 border-gray-200', 'bg-zinc-800/50 border-zinc-700')} border`}>
                  <p className={`text-sm font-medium ${t('text-gray-900', 'text-white')} mb-2`}>
                    {activeSession.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className={t('text-gray-500', 'text-zinc-500')}>Duration: </span>
                      <span className={t('text-gray-900', 'text-white')}>
                        <SessionTimer startedAt={activeSession.started_at} />
                      </span>
                    </div>
                    <div>
                      <span className={t('text-gray-500', 'text-zinc-500')}>Items: </span>
                      <span className={t('text-gray-900', 'text-white')}>{sessionItemCount}</span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any notes about this session..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className={`mt-1 ${t('bg-white border-gray-200', 'bg-zinc-800 border-zinc-700')}`}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCloseSession}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Close Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );

  if (embedded) return pageContent;

  return (
    <PermissionGuard permission="inventory.manage" showMessage>
      <ProductsPageTransition>
        {pageContent}
      </ProductsPageTransition>
    </PermissionGuard>
  );
}
