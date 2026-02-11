import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Package, Scan, Check, AlertTriangle, Plus, Minus,
  Camera, Barcode, Boxes, ArrowRight, X, RefreshCw,
  Warehouse, MapPin, CheckCircle2, AlertCircle, Keyboard,
  CameraOff, SwitchCamera, Sun, Moon
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
import { scanForReceiving, receiveStock, getDashboardData } from "@/lib/services/inventory-service";
import { listExpectedDeliveries, getReceivingHistory } from "@/lib/db/queries";
import { Html5Qrcode } from "html5-qrcode";

// Barcode scanner component with camera support for mobile devices
function BarcodeScanner({ onScan, isActive }) {
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
      const html5QrCode = new Html5Qrcode("barcode-scanner-region");
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

export default function InventoryReceiving() {
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

  const companyId = user?.company_id;
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      try {
        const [deliveries, history] = await Promise.all([
          listExpectedDeliveries(companyId, 'pending'),
          getReceivingHistory(companyId, 20),
        ]);

        setExpectedDeliveries(deliveries);
        setRecentReceiving(history);

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
        warehouseLocation: data.location,
        condition: data.condition,
        damageNotes: data.notes,
        receivedBy: user?.id,
      });

      // Refresh data
      const [deliveries, history] = await Promise.all([
        listExpectedDeliveries(companyId, 'pending'),
        getReceivingHistory(companyId, 20),
      ]);

      setExpectedDeliveries(deliveries);
      setRecentReceiving(history);

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

  return (
    <PermissionGuard permission="inventory.manage" showMessage>
      <ProductsPageTransition>
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className={`text-lg font-bold ${t('text-gray-900', 'text-white')}`}>Receiving</h1>
              <p className={`text-xs ${t('text-gray-600', 'text-zinc-400')}`}>Scan and receive incoming inventory</p>
            </div>
            <div className="flex items-center gap-2">
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
                Recent Receipts
              </h2>
              <RecentReceivingList items={recentReceiving} />
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
        </div>
      </ProductsPageTransition>
    </PermissionGuard>
  );
}
