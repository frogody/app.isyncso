import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import {
  Package, Scan, Check, AlertTriangle, Plus, Minus,
  Camera, Barcode, Boxes, ArrowRight, X, RefreshCw,
  Warehouse, MapPin, CheckCircle2, AlertCircle, Keyboard,
  CameraOff, SwitchCamera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { toast } from "sonner";
import { scanForReceiving, receiveStock, getDashboardData } from "@/lib/services/inventory-service";
import { listExpectedDeliveries, getReceivingHistory } from "@/lib/db/queries";
import { Html5Qrcode } from "html5-qrcode";

// Barcode scanner component with camera support for mobile devices
function BarcodeScanner({ onScan, isActive }) {
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
          ? "Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen."
          : "Kon camera niet starten. Probeer handmatige invoer."
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
        <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-lg">
          <button
            onClick={() => handleModeSwitch("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-all ${
              scanMode === "camera"
                ? "bg-cyan-600 text-white"
                : "text-zinc-400 hover:text-white"
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
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-sm">Handmatig</span>
          </button>
        </div>
      )}

      {/* Camera scanner view */}
      {scanMode === "camera" && (
        <div className="space-y-4">
          {cameraError ? (
            <div className="p-6 border-2 border-dashed border-red-500/30 rounded-xl bg-red-500/5 text-center">
              <CameraOff className="w-12 h-12 mx-auto text-red-400 mb-3" />
              <p className="text-red-400 text-sm mb-4">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeSwitch("manual")}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Handmatige invoer
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
                    {/* Scan line animation */}
                    <motion.div
                      animate={{ y: [-60, 60, -60] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-0.5 bg-cyan-500 shadow-lg shadow-cyan-500/50"
                      style={{ width: "250px", marginLeft: "-125px", left: "50%" }}
                    />
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm text-center">
                  Richt de camera op de barcode
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
              Camera stoppen
            </Button>
          )}

          {/* Restart button when not scanning and no error */}
          {!isScanning && !cameraError && (
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              onClick={startCameraScanner}
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera starten
            </Button>
          )}
        </div>
      )}

      {/* Manual entry view */}
      {scanMode === "manual" && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ opacity: isActive ? [0.3, 1, 0.3] : 0.3 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-48 h-1 bg-cyan-500 rounded-full"
              />
            </div>
            <div className="p-8 border-2 border-dashed border-cyan-500/30 rounded-xl bg-cyan-500/5 text-center">
              <Barcode className="w-16 h-16 mx-auto text-cyan-400 mb-4" />
              <p className="text-zinc-400 text-sm">
                {hasCamera
                  ? "Typ EAN-code handmatig in of gebruik de camera"
                  : "Typ EAN-code of scan met een barcode scanner"
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
              className="flex-1 bg-zinc-900/50 border-white/10"
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 rounded-xl bg-zinc-900/70 border border-cyan-500/30"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
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
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Verwachte levering gevonden</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Verwacht:</span>
              <span className="ml-2 text-white">{expectedQty}</span>
            </div>
            <div>
              <span className="text-zinc-500">Ontvangen:</span>
              <span className="ml-2 text-white">{receivedQty}</span>
            </div>
            <div>
              <span className="text-zinc-500">Resterend:</span>
              <span className="ml-2 text-white font-medium">{remainingQty}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Geen verwachte levering</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Dit product staat niet op de verwachte leveringen lijst.
          </p>
        </div>
      )}

      {/* Current stock */}
      {scanResult.currentStock && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-white/10">
          <span className="text-sm text-zinc-400">Huidige voorraad:</span>
          <span className="ml-2 text-white font-medium">
            {scanResult.currentStock.quantity_on_hand} stuks
          </span>
          {scanResult.currentStock.warehouse_location && (
            <span className="ml-2 text-xs text-zinc-500">
              ({scanResult.currentStock.warehouse_location})
            </span>
          )}
        </div>
      )}

      {/* Quantity input */}
      <div className="space-y-4">
        <div>
          <Label>Aantal ontvangen</Label>
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
              className="w-24 text-center bg-zinc-900/50 border-white/10"
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
                className="text-xs text-zinc-400"
              >
                Max ({remainingQty})
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Conditie</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="mt-1 bg-zinc-900/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Goed</SelectItem>
                <SelectItem value="damaged">Beschadigd</SelectItem>
                <SelectItem value="defective">Defect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Locatie (optioneel)</Label>
            <Input
              placeholder="A1-B2..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 bg-zinc-900/50 border-white/10"
            />
          </div>
        </div>

        {condition !== "good" && (
          <div>
            <Label>Opmerkingen beschadiging</Label>
            <Textarea
              placeholder="Beschrijf de schade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-zinc-900/50 border-white/10"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSubmit} className="flex-1 bg-cyan-600 hover:bg-cyan-700">
            <Check className="w-4 h-4 mr-2" />
            Ontvangen ({quantity})
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Not found card
function NotFoundCard({ ean, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-6 rounded-xl bg-zinc-900/70 border border-red-500/30"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-red-500/10">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Product niet gevonden</h3>
          <p className="text-sm text-zinc-400">EAN: {ean}</p>
        </div>
      </div>
      <p className="text-sm text-zinc-400 mb-4">
        Dit product staat niet in het systeem. Voeg het eerst toe aan de producten.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Sluiten
        </Button>
        <Button className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="w-4 h-4 mr-2" />
          Product toevoegen
        </Button>
      </div>
    </motion.div>
  );
}

// Recent receiving log
function RecentReceivingList({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Boxes className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nog geen ontvangsten vandaag</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5"
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
              <p className="text-sm text-white">{item.products?.name || 'Unknown product'}</p>
              <p className="text-xs text-zinc-500">
                {item.quantity_received}x • {new Date(item.received_at).toLocaleTimeString('nl-NL')}
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

export default function InventoryReceiving() {
  const { user } = useUser();
  const [scanResult, setScanResult] = useState(null);
  const [notFoundEan, setNotFoundEan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentReceiving, setRecentReceiving] = useState([]);
  const [expectedDeliveries, setExpectedDeliveries] = useState([]);
  const [stats, setStats] = useState({
    pendingDeliveries: 0,
    receivedToday: 0,
    partialDeliveries: 0,
  });

  const companyId = user?.company_id;

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsRef = useRef(null);
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
        toast.error('Kon gegevens niet laden');
        setDataLoaded(true); // Set to true even on error to show UI
      }
    };

    loadData();
  }, [companyId]);

  // Animate header on mount
  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, []);

  // Animate stats bar with entrance animation
  useEffect(() => {
    if (!dataLoaded || !statsRef.current || prefersReducedMotion()) return;

    animate({
      targets: statsRef.current,
      translateY: [15, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
      delay: 100,
    });
  }, [dataLoaded]);

  // Handle barcode scan
  const handleScan = async (ean) => {
    if (!companyId) {
      toast.error('Geen bedrijf geselecteerd');
      return;
    }

    setIsLoading(true);
    setScanResult(null);
    setNotFoundEan(null);

    try {
      const result = await scanForReceiving(companyId, ean);

      if (result.found) {
        setScanResult(result);
        toast.success(`Product gevonden: ${result.product.name}`);
      } else {
        setNotFoundEan(ean);
        toast.error('Product niet gevonden');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scanfout: ' + (error.message || 'Onbekende fout'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle receive stock
  const handleReceive = async (data) => {
    if (!companyId) return;

    setIsLoading(true);

    try {
      const result = await receiveStock(companyId, data.productId, data.quantity, {
        expectedDeliveryId: data.expectedDeliveryId,
        warehouseLocation: data.location,
        condition: data.condition,
        damageNotes: data.notes,
        receivedBy: user?.id,
      });

      if (result.isPartial) {
        toast.warning(
          `Gedeeltelijke levering: nog ${result.remainingQuantity} stuks verwacht`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${data.quantity} stuks ontvangen`);
      }

      // Refresh data
      const [deliveries, history] = await Promise.all([
        listExpectedDeliveries(companyId, 'pending'),
        getReceivingHistory(companyId, 20),
      ]);

      setExpectedDeliveries(deliveries);
      setRecentReceiving(history);
      setScanResult(null);

      // Update stats
      setStats((prev) => ({
        ...prev,
        pendingDeliveries: deliveries.length,
        receivedToday: prev.receivedToday + data.quantity,
        partialDeliveries: deliveries.filter((d) => d.status === 'partial').length,
      }));
    } catch (error) {
      console.error('Receive error:', error);
      toast.error('Fout bij ontvangen: ' + (error.message || 'Onbekende fout'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PermissionGuard permission="inventory.manage" showMessage>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-6">
          <div ref={headerRef} style={{ opacity: 0 }}>
            <PageHeader
              title="Ontvangst"
              subtitle="Scan producten om voorraad te ontvangen"
              icon={Package}
            />
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" style={{ opacity: 0 }}>
            <StatCard
              icon={Boxes}
              label="Verwachte leveringen"
              value={stats.pendingDeliveries}
              color="cyan"
            />
            <StatCard
              icon={Check}
              label="Ontvangen vandaag"
              value={stats.receivedToday}
              sublabel="stuks"
              color="green"
            />
            <StatCard
              icon={AlertTriangle}
              label="Gedeeltelijke leveringen"
              value={stats.partialDeliveries}
              color="yellow"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner section */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Scan className="w-5 h-5 text-cyan-400" />
                Barcode Scanner
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {scanResult ? (
                    <ScannedProductCard
                      key="result"
                      scanResult={scanResult}
                      onReceive={handleReceive}
                      onCancel={() => setScanResult(null)}
                    />
                  ) : notFoundEan ? (
                    <NotFoundCard
                      key="notfound"
                      ean={notFoundEan}
                      onClose={() => setNotFoundEan(null)}
                    />
                  ) : (
                    <BarcodeScanner
                      key="scanner"
                      onScan={handleScan}
                      isActive={!scanResult && !notFoundEan}
                    />
                  )}
                </AnimatePresence>
              )}
            </GlassCard>

            {/* Recent receiving */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-cyan-400" />
                Recente ontvangsten
              </h2>
              <RecentReceivingList items={recentReceiving} />
            </GlassCard>
          </div>

          {/* Expected deliveries */}
          <GlassCard className="p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              Verwachte leveringen ({expectedDeliveries.length})
            </h2>

            {expectedDeliveries.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Geen verwachte leveringen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-zinc-500 border-b border-white/10">
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Leverancier</th>
                      <th className="pb-3 font-medium">Verwacht</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {expectedDeliveries.map((delivery) => (
                      <tr key={delivery.id} className="text-sm">
                        <td className="py-3 text-white">
                          {delivery.products?.name || 'Unknown'}
                          {delivery.products?.ean && (
                            <span className="ml-2 text-xs text-zinc-500">
                              ({delivery.products.ean})
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-zinc-400">
                          {delivery.suppliers?.name || '-'}
                        </td>
                        <td className="py-3 text-white">
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
                        <td className="py-3 text-zinc-400">
                          {delivery.expected_date
                            ? new Date(delivery.expected_date).toLocaleDateString('nl-NL')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </PermissionGuard>
  );
}
