/**
 * Pallet Builder — Phase 3a
 *
 * Two-panel interface for building pallets within shipments.
 * Left panel: shipment overview + pallet list.
 * Right panel: active pallet detail + barcode scanner.
 * Bottom: EAN summary across all pallets with stock checks.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { useUser } from "@/components/context/UserContext";
import { PermissionGuard } from "@/components/guards";
import { toast } from "sonner";
import {
  Boxes, Package, Plus, Minus, Trash2, Lock,
  Scan, Barcode, Keyboard, Camera, CameraOff,
  Sun, Moon, ChevronDown, ChevronUp, Truck,
  AlertTriangle, Check, X, Search, PackagePlus,
  ClipboardList, History,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import * as db from "@/lib/db";
import {
  createNewShipment,
  addPalletToShipment,
  addProductToPallet,
  finalizeShipmentService,
} from "@/lib/services/inventory-service";

// =============================================================================
// BARCODE SCANNER (same pattern as InventoryReceiving)
// =============================================================================

function BarcodeScanner({ onScan, isActive }) {
  const { t } = useTheme();
  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [manualEntry, setManualEntry] = useState("");
  const [scanMode, setScanMode] = useState("manual");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setHasCamera(videoDevices.length > 0);
      } catch {
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  useEffect(() => {
    if (isActive && scanMode === "manual" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, scanMode]);

  const stopCameraScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch {}
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopCameraScanner(); };
  }, [stopCameraScanner]);

  const startCameraScanner = async () => {
    if (!scannerRef.current) return;
    setCameraError(null);
    setIsScanning(true);
    try {
      const qr = new Html5Qrcode("pallet-scanner-region");
      html5QrCodeRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 }, formatsToSupport: [5, 9, 10, 11, 12] },
        (decodedText) => {
          stopCameraScanner();
          onScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setCameraError(err.message || "Camera failed");
      setIsScanning(false);
    }
  };

  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && manualEntry.trim()) {
      onScan(manualEntry.trim());
      setManualEntry("");
    }
  }, [manualEntry, onScan]);

  return (
    <div className={`${t("bg-gray-50 border-gray-200", "bg-zinc-800/50 border-zinc-700/50")} border rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${t("text-gray-700", "text-zinc-300")} flex items-center gap-2`}>
          <Scan className="w-4 h-4 text-cyan-400" />
          Scan Product
        </h3>
        {hasCamera && (
          <div className="flex gap-1">
            <button
              onClick={() => { stopCameraScanner(); setScanMode("manual"); }}
              className={`p-1.5 rounded-lg text-xs ${scanMode === "manual" ? "bg-cyan-500/20 text-cyan-400" : t("text-gray-400", "text-zinc-500")}`}
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setScanMode("camera"); setTimeout(startCameraScanner, 100); }}
              className={`p-1.5 rounded-lg text-xs ${scanMode === "camera" ? "bg-cyan-500/20 text-cyan-400" : t("text-gray-400", "text-zinc-500")}`}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {scanMode === "manual" ? (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Enter or scan EAN barcode..."
            value={manualEntry}
            onChange={(e) => setManualEntry(e.target.value)}
            onKeyPress={handleKeyPress}
            inputMode="numeric"
            className={`flex-1 ${t("bg-white border-gray-200", "bg-zinc-900/50 border-white/10")}`}
          />
          <Button
            size="sm"
            onClick={() => { if (manualEntry.trim()) { onScan(manualEntry.trim()); setManualEntry(""); } }}
            disabled={!manualEntry.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Barcode className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div>
          <div id="pallet-scanner-region" ref={scannerRef} className="rounded-lg overflow-hidden" />
          {cameraError && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <CameraOff className="w-3 h-3" /> {cameraError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function PalletBuilder() {
  const { t, theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id;

  // Shipments
  const [shipments, setShipments] = useState([]);
  const [activeShipment, setActiveShipment] = useState(null);
  const [showNewShipmentDialog, setShowNewShipmentDialog] = useState(false);
  const [newShipmentType, setNewShipmentType] = useState("b2b");
  const [newShipmentDest, setNewShipmentDest] = useState("");
  const [newShipmentRef, setNewShipmentRef] = useState("");
  const [newShipmentNotes, setNewShipmentNotes] = useState("");

  // Pallets
  const [pallets, setPallets] = useState([]);
  const [activePallet, setActivePallet] = useState(null);
  const [palletItems, setPalletItems] = useState([]);

  // EAN summary
  const [eanSummary, setEanSummary] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Finalize
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeNotes, setFinalizeNotes] = useState("");

  // History
  const [showHistory, setShowHistory] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------------
  // DATA LOADING
  // ------------------------------------------------------------------

  const loadShipments = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await db.listShipments(companyId);
      setShipments(data);
    } catch (err) {
      console.error("Failed to load shipments:", err);
    }
  }, [companyId]);

  const loadPallets = useCallback(async (shipmentId) => {
    try {
      const data = await db.listPalletsByShipment(shipmentId);
      setPallets(data);
      // If active pallet is set, refresh its items
      if (activePallet) {
        const updated = data.find(p => p.id === activePallet.id);
        if (updated) {
          setActivePallet(updated);
          setPalletItems(updated.pallet_items || []);
        }
      }
    } catch (err) {
      console.error("Failed to load pallets:", err);
    }
  }, [activePallet]);

  const loadEanSummary = useCallback(async (shipmentId) => {
    try {
      const data = await db.getShipmentEanSummary(shipmentId);
      setEanSummary(data);
    } catch (err) {
      console.error("Failed to load EAN summary:", err);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await db.listInventory(companyId);
      setInventory(data);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  }, [companyId]);

  // Initial load
  useEffect(() => {
    if (companyId) {
      loadShipments();
      loadInventory();
    }
  }, [companyId, loadShipments, loadInventory]);

  // When active shipment changes, load its pallets + summary
  useEffect(() => {
    if (activeShipment) {
      loadPallets(activeShipment.id);
      loadEanSummary(activeShipment.id);
    } else {
      setPallets([]);
      setActivePallet(null);
      setPalletItems([]);
      setEanSummary([]);
    }
  }, [activeShipment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  const handleCreateShipment = async () => {
    if (!companyId || !user?.id) return;
    setLoading(true);
    try {
      const shipment = await createNewShipment(companyId, newShipmentType, user.id, {
        destination: newShipmentDest.trim() || undefined,
        destinationReference: newShipmentRef.trim() || undefined,
        notes: newShipmentNotes.trim() || undefined,
      });
      toast.success(`Shipment ${shipment.shipment_code || ''} created`);
      setActiveShipment(shipment);
      setShowNewShipmentDialog(false);
      setNewShipmentDest("");
      setNewShipmentRef("");
      setNewShipmentNotes("");
      loadShipments();
    } catch (err) {
      toast.error("Failed to create shipment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPallet = async () => {
    if (!companyId || !activeShipment) return;
    try {
      const pallet = await addPalletToShipment(companyId, activeShipment.id, user?.id);
      toast.success(`Pallet ${pallet.pallet_code} added`);
      await loadPallets(activeShipment.id);
      setActivePallet(pallet);
      setPalletItems([]);
    } catch (err) {
      toast.error("Failed to add pallet: " + err.message);
    }
  };

  const handleScan = useCallback(async (ean) => {
    if (!companyId || !activePallet) {
      toast.warning("Select a pallet first");
      return;
    }
    if (activeShipment?.status === "finalized") {
      toast.error("Shipment is finalized — cannot add items");
      return;
    }

    try {
      const result = await db.scanBarcode(companyId, ean);
      if (!result.found || !result.product) {
        toast.error(`Product not found for EAN: ${ean}`);
        return;
      }

      const item = await addProductToPallet(
        activePallet.id,
        result.product.id,
        result.product.ean || ean,
        1,
        user?.id
      );

      toast.success(`Added 1× ${result.product.name} to ${activePallet.pallet_code}`);

      // Refresh pallet items and EAN summary
      await Promise.all([
        loadPallets(activeShipment.id),
        loadEanSummary(activeShipment.id),
      ]);

      // Update active pallet items
      const freshItems = await db.listPalletItems(activePallet.id);
      setPalletItems(freshItems);
    } catch (err) {
      toast.error("Failed to add product: " + err.message);
    }
  }, [companyId, activePallet, activeShipment, user?.id, loadPallets, loadEanSummary]);

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty < 1) return;
    try {
      await db.updatePalletItemQty(itemId, newQty);
      const freshItems = await db.listPalletItems(activePallet.id);
      setPalletItems(freshItems);
      loadEanSummary(activeShipment.id);
    } catch (err) {
      toast.error("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await db.removePalletItem(itemId);
      const freshItems = await db.listPalletItems(activePallet.id);
      setPalletItems(freshItems);
      loadEanSummary(activeShipment.id);
      toast.success("Item removed");
    } catch (err) {
      toast.error("Failed to remove item");
    }
  };

  const handleRemovePallet = async (palletId) => {
    try {
      await db.removePallet(palletId);
      if (activePallet?.id === palletId) {
        setActivePallet(null);
        setPalletItems([]);
      }
      await loadPallets(activeShipment.id);
      loadEanSummary(activeShipment.id);
      toast.success("Pallet removed");
    } catch (err) {
      toast.error("Failed to remove pallet");
    }
  };

  const handleFinalize = async () => {
    if (!activeShipment || !user?.id) return;
    setLoading(true);
    try {
      const finalized = await finalizeShipmentService(activeShipment.id, user.id, finalizeNotes.trim() || undefined);
      toast.success(`Shipment ${finalized.shipment_code || ''} finalized`);
      setActiveShipment(finalized);
      setShowFinalizeDialog(false);
      setFinalizeNotes("");
      loadShipments();
    } catch (err) {
      toast.error("Failed to finalize: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPallet = (pallet) => {
    setActivePallet(pallet);
    setPalletItems(pallet.pallet_items || []);
  };

  // Helpers
  const getStockForEan = (ean) => {
    const inv = inventory.find(i => i.products?.ean === ean);
    return inv?.quantity_on_hand ?? null;
  };

  const isFinalized = activeShipment?.status === "finalized" || activeShipment?.status === "shipped";

  const activeShipments = shipments.filter(s => !["finalized", "shipped", "delivered", "verified", "cancelled"].includes(s.status));
  const historyShipments = shipments.filter(s => ["finalized", "shipped", "delivered", "verified", "cancelled"].includes(s.status));

  const totalPalletItems = palletItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <PermissionGuard permission="inventory.manage">
      <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} transition-colors`}>
        <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${t("text-gray-900", "text-white")} flex items-center gap-3`}>
                <Boxes className="w-7 h-7 text-cyan-400" />
                Pallet Builder
              </h1>
              <p className={`text-sm mt-1 ${t("text-gray-500", "text-zinc-500")}`}>
                Build pallets within shipments for packing and shipping
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowNewShipmentDialog(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> New Shipment
              </Button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg ${t("text-gray-500 hover:bg-gray-100", "text-zinc-500 hover:bg-zinc-800")}`}
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${t("text-gray-500 hover:bg-gray-100", "text-zinc-500 hover:bg-zinc-800")}`}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* LEFT PANEL — Shipment & Pallets */}
            <div className="space-y-3">

              {/* Active Shipments */}
              <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl p-3`}>
                <h2 className={`text-sm font-bold ${t("text-gray-900", "text-white")} mb-2 flex items-center gap-2`}>
                  <Truck className="w-4 h-4 text-cyan-400" />
                  Shipments
                </h2>

                {activeShipments.length === 0 ? (
                  <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} py-4 text-center`}>
                    No active shipments. Create one to start packing.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeShipments.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveShipment(s)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                          activeShipment?.id === s.id
                            ? "border-cyan-500/50 bg-cyan-500/10"
                            : t("border-gray-100 hover:border-gray-300 bg-gray-50", "border-zinc-800 hover:border-zinc-700 bg-zinc-800/40")
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>
                            {s.shipment_code || "Draft"}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${
                            s.shipment_type === "b2b" ? "border-blue-500/40 text-blue-400" : "border-orange-500/40 text-orange-400"
                          }`}>
                            {s.shipment_type === "b2b" ? "B2B" : "LVB"}
                          </Badge>
                        </div>
                        {s.destination && (
                          <p className={`text-xs mt-0.5 ${t("text-gray-500", "text-zinc-500")}`}>{s.destination}</p>
                        )}
                        <div className={`text-[10px] mt-1 ${t("text-gray-400", "text-zinc-600")}`}>
                          {s.status} · {s.total_pallets || 0} pallets · {s.total_items || 0} items
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pallets in active shipment */}
              {activeShipment && (
                <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className={`text-sm font-bold ${t("text-gray-900", "text-white")} flex items-center gap-2`}>
                      <Package className="w-4 h-4 text-cyan-400" />
                      Pallets
                    </h2>
                    {!isFinalized && (
                      <Button size="sm" variant="outline" onClick={handleAddPallet}
                        className={`text-xs ${t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}`}>
                        <Plus className="w-3 h-3 mr-1" /> Add Pallet
                      </Button>
                    )}
                  </div>

                  {pallets.length === 0 ? (
                    <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} py-3 text-center`}>
                      No pallets yet. Add one to start packing.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {pallets.map((p) => {
                        const itemCount = (p.pallet_items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
                        const eanCount = new Set((p.pallet_items || []).map(i => i.ean).filter(Boolean)).size;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                              activePallet?.id === p.id
                                ? "border-cyan-500/50 bg-cyan-500/10"
                                : t("border-gray-100 hover:border-gray-300", "border-zinc-800 hover:border-zinc-700")
                            }`}
                            onClick={() => handleSelectPallet(p)}
                          >
                            <div>
                              <span className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>
                                {p.pallet_code}
                              </span>
                              <span className={`text-xs ml-2 ${t("text-gray-400", "text-zinc-500")}`}>
                                {itemCount} items · {eanCount} EANs
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {p.status === "packed" && <Lock className="w-3 h-3 text-zinc-500" />}
                              {!isFinalized && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemovePallet(p.id); }}
                                  className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Shipment totals + Finalize */}
                  {pallets.length > 0 && (
                    <div className={`mt-3 pt-3 border-t ${t("border-gray-100", "border-zinc-800")}`}>
                      <div className="flex justify-between text-xs">
                        <span className={t("text-gray-500", "text-zinc-500")}>Total pallets</span>
                        <span className={t("text-gray-900", "text-white")}>{pallets.length}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className={t("text-gray-500", "text-zinc-500")}>Total items</span>
                        <span className={t("text-gray-900", "text-white")}>
                          {pallets.reduce((sum, p) => sum + (p.pallet_items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className={t("text-gray-500", "text-zinc-500")}>Unique EANs</span>
                        <span className={t("text-gray-900", "text-white")}>{eanSummary.length}</span>
                      </div>

                      {!isFinalized && (
                        <Button
                          onClick={() => setShowFinalizeDialog(true)}
                          className="w-full mt-3 bg-cyan-600 hover:bg-cyan-700 text-white"
                          size="sm"
                        >
                          <Lock className="w-3 h-3 mr-1" /> Finalize Shipment
                        </Button>
                      )}

                      {isFinalized && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                          <Check className="w-3 h-3" /> Finalized
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT PANEL — Active Pallet Detail */}
            <div className="lg:col-span-2 space-y-3">

              {!activeShipment ? (
                <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl p-8 text-center`}>
                  <Boxes className={`w-12 h-12 mx-auto mb-3 ${t("text-gray-300", "text-zinc-700")}`} />
                  <p className={`text-sm ${t("text-gray-500", "text-zinc-500")}`}>
                    Select or create a shipment to start building pallets
                  </p>
                </div>
              ) : !activePallet ? (
                <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl p-8 text-center`}>
                  <Package className={`w-12 h-12 mx-auto mb-3 ${t("text-gray-300", "text-zinc-700")}`} />
                  <p className={`text-sm ${t("text-gray-500", "text-zinc-500")}`}>
                    Select a pallet or add a new one to start scanning products
                  </p>
                  {!isFinalized && (
                    <Button size="sm" onClick={handleAddPallet} className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add Pallet
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Pallet header */}
                  <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl p-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-cyan-400" />
                        <h2 className={`text-lg font-bold ${t("text-gray-900", "text-white")}`}>
                          {activePallet.pallet_code}
                        </h2>
                        <Badge variant="outline" className={`text-[10px] ${
                          activePallet.status === "packing" ? "border-green-500/40 text-green-400" : "border-zinc-500/40 text-zinc-400"
                        }`}>
                          {activePallet.status}
                        </Badge>
                      </div>
                      <div className={`text-sm ${t("text-gray-500", "text-zinc-400")}`}>
                        {totalPalletItems} items · {new Set(palletItems.map(i => i.ean).filter(Boolean)).size} EANs
                      </div>
                    </div>
                  </div>

                  {/* Scanner */}
                  {!isFinalized && (
                    <BarcodeScanner onScan={handleScan} isActive={!!activePallet} />
                  )}

                  {/* Pallet items table */}
                  <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl overflow-hidden`}>
                    <div className={`px-3 py-2 border-b ${t("border-gray-100 bg-gray-50/50", "border-zinc-800 bg-zinc-800/30")}`}>
                      <h3 className={`text-sm font-semibold ${t("text-gray-700", "text-zinc-300")} flex items-center gap-2`}>
                        <ClipboardList className="w-4 h-4 text-cyan-400" />
                        Items on this pallet
                      </h3>
                    </div>

                    {palletItems.length === 0 ? (
                      <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} py-6 text-center`}>
                        No items yet. Scan a barcode to add products.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className={t("text-gray-500 bg-gray-50/50", "text-zinc-500 bg-zinc-800/30")}>
                              <th className="text-left px-3 py-2 text-xs font-medium">EAN</th>
                              <th className="text-left px-3 py-2 text-xs font-medium">Product</th>
                              <th className="text-center px-3 py-2 text-xs font-medium">Qty</th>
                              {!isFinalized && <th className="text-center px-3 py-2 text-xs font-medium w-10"></th>}
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${t("divide-gray-50", "divide-zinc-800/50")}`}>
                            {palletItems.map((item) => (
                              <tr key={item.id} className={t("hover:bg-gray-50", "hover:bg-zinc-800/30")}>
                                <td className={`px-3 py-2 font-mono text-xs ${t("text-gray-600", "text-zinc-400")}`}>
                                  {item.ean || "-"}
                                </td>
                                <td className={`px-3 py-2 ${t("text-gray-900", "text-white")}`}>
                                  {item.products?.name || "Unknown"}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    {!isFinalized && (
                                      <button
                                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className={`p-0.5 rounded ${t("hover:bg-gray-100", "hover:bg-zinc-700")} disabled:opacity-30`}
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    )}
                                    <span className={`w-8 text-center font-medium ${t("text-gray-900", "text-white")}`}>
                                      {item.quantity}
                                    </span>
                                    {!isFinalized && (
                                      <button
                                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                        className={`p-0.5 rounded ${t("hover:bg-gray-100", "hover:bg-zinc-700")}`}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                {!isFinalized && (
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* EAN Summary across all pallets */}
              {activeShipment && eanSummary.length > 0 && (
                <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl overflow-hidden`}>
                  <div className={`px-3 py-2 border-b ${t("border-gray-100 bg-gray-50/50", "border-zinc-800 bg-zinc-800/30")}`}>
                    <h3 className={`text-sm font-semibold ${t("text-gray-700", "text-zinc-300")} flex items-center gap-2`}>
                      <PackagePlus className="w-4 h-4 text-cyan-400" />
                      EAN Summary — All Pallets
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={t("text-gray-500 bg-gray-50/50", "text-zinc-500 bg-zinc-800/30")}>
                          <th className="text-left px-3 py-2 text-xs font-medium">EAN</th>
                          <th className="text-left px-3 py-2 text-xs font-medium">Product</th>
                          <th className="text-center px-3 py-2 text-xs font-medium">Packed</th>
                          <th className="text-center px-3 py-2 text-xs font-medium">In Stock</th>
                          <th className="text-center px-3 py-2 text-xs font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${t("divide-gray-50", "divide-zinc-800/50")}`}>
                        {eanSummary.map((row) => {
                          const stock = getStockForEan(row.ean);
                          const overPacked = stock !== null && row.total_packed > stock;
                          return (
                            <tr key={row.ean} className={`${overPacked ? t("bg-amber-50/50", "bg-amber-900/10") : ""} ${t("hover:bg-gray-50", "hover:bg-zinc-800/30")}`}>
                              <td className={`px-3 py-2 font-mono text-xs ${t("text-gray-600", "text-zinc-400")}`}>
                                {row.ean || "-"}
                              </td>
                              <td className={`px-3 py-2 ${t("text-gray-900", "text-white")}`}>
                                {row.product_name}
                              </td>
                              <td className={`px-3 py-2 text-center font-medium ${t("text-gray-900", "text-white")}`}>
                                {row.total_packed}
                              </td>
                              <td className={`px-3 py-2 text-center ${stock !== null ? t("text-gray-600", "text-zinc-400") : t("text-gray-300", "text-zinc-600")}`}>
                                {stock !== null ? stock : "—"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {overPacked && (
                                  <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" title="Packed quantity exceeds available stock" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shipment History (collapsible) */}
          {showHistory && historyShipments.length > 0 && (
            <div className={`${t("bg-white/80 border-gray-200", "bg-zinc-900/50 border-zinc-800/60")} border rounded-xl p-3`}>
              <h2 className={`text-sm font-bold ${t("text-gray-900", "text-white")} mb-2 flex items-center gap-2`}>
                <History className="w-4 h-4 text-cyan-400" />
                Shipment History
              </h2>
              <div className="space-y-1.5">
                {historyShipments.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveShipment(s)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      activeShipment?.id === s.id
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : t("border-gray-100 hover:border-gray-300 bg-gray-50", "border-zinc-800 hover:border-zinc-700 bg-zinc-800/40")
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>
                          {s.shipment_code || "—"}
                        </span>
                        <Badge variant="outline" className="text-[10px] ml-2 border-zinc-500/40 text-zinc-400">
                          {s.status}
                        </Badge>
                      </div>
                      <span className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>
                        {s.finalized_at ? new Date(s.finalized_at).toLocaleDateString("en-GB") : new Date(s.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div className={`text-xs mt-0.5 ${t("text-gray-500", "text-zinc-500")}`}>
                      {s.destination || "No destination"} · {s.total_pallets || 0} pallets · {s.total_items || 0} items
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* New Shipment Dialog */}
          <Dialog open={showNewShipmentDialog} onOpenChange={setShowNewShipmentDialog}>
            <DialogContent className={t("bg-white", "bg-zinc-900 border-zinc-800")}>
              <DialogHeader>
                <DialogTitle className={t("text-gray-900", "text-white")}>New Shipment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>Type</label>
                  <Select value={newShipmentType} onValueChange={setNewShipmentType}>
                    <SelectTrigger className={`mt-1 ${t("bg-white border-gray-200", "bg-zinc-900/50 border-white/10")}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2b">B2B — Business Shipment</SelectItem>
                      <SelectItem value="b2c_lvb">B2C LVB — bol.com Fulfillment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>
                    {newShipmentType === "b2b" ? "Destination / Customer" : "LVB Reference"}
                  </label>
                  <Input
                    placeholder={newShipmentType === "b2b" ? "e.g. Acme Corp Warehouse" : "e.g. bol.com LVB"}
                    value={newShipmentDest}
                    onChange={(e) => setNewShipmentDest(e.target.value)}
                    className={`mt-1 ${t("bg-white border-gray-200", "bg-zinc-900/50 border-white/10")}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>Reference (optional)</label>
                  <Input
                    placeholder="PO number, order reference..."
                    value={newShipmentRef}
                    onChange={(e) => setNewShipmentRef(e.target.value)}
                    className={`mt-1 ${t("bg-white border-gray-200", "bg-zinc-900/50 border-white/10")}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>Notes (optional)</label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={newShipmentNotes}
                    onChange={(e) => setNewShipmentNotes(e.target.value)}
                    rows={2}
                    className={`mt-1 ${t("bg-white border-gray-200", "bg-zinc-900/50 border-white/10")}`}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewShipmentDialog(false)}
                  className={t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}>
                  Cancel
                </Button>
                <Button onClick={handleCreateShipment} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  {loading ? "Creating..." : "Create Shipment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Finalize Dialog */}
          <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
            <DialogContent className={t("bg-white", "bg-zinc-900 border-zinc-800")}>
              <DialogHeader>
                <DialogTitle className={t("text-gray-900", "text-white")}>Finalize Shipment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className={`rounded-xl border p-3 ${t("bg-gray-50 border-gray-200", "bg-zinc-800/50 border-zinc-700")}`}>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className={`text-xs ${t("text-gray-500", "text-zinc-500")}`}>Pallets</p>
                      <p className={`text-lg font-bold ${t("text-gray-900", "text-white")}`}>{pallets.length}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${t("text-gray-500", "text-zinc-500")}`}>Items</p>
                      <p className={`text-lg font-bold ${t("text-gray-900", "text-white")}`}>
                        {pallets.reduce((sum, p) => sum + (p.pallet_items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs ${t("text-gray-500", "text-zinc-500")}`}>EANs</p>
                      <p className={`text-lg font-bold ${t("text-gray-900", "text-white")}`}>{eanSummary.length}</p>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {eanSummary.some(r => {
                  const stock = getStockForEan(r.ean);
                  return stock !== null && r.total_packed > stock;
                }) && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">
                      Some EANs have packed quantities exceeding available stock. Proceed with caution.
                    </p>
                  </div>
                )}

                <div>
                  <label className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>Notes (optional)</label>
                  <Textarea
                    placeholder="Finalization notes..."
                    value={finalizeNotes}
                    onChange={(e) => setFinalizeNotes(e.target.value)}
                    rows={2}
                    className={`mt-1 ${t("bg-white border-gray-200", "bg-zinc-900/50 border-white/10")}`}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}
                  className={t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}>
                  Cancel
                </Button>
                <Button onClick={handleFinalize} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Lock className="w-3 h-3 mr-1" />
                  {loading ? "Finalizing..." : "Finalize & Lock"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </PermissionGuard>
  );
}
