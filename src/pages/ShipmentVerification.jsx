/**
 * Shipment Verification — Phase 3b (P3-7, P3-8, P3-9)
 *
 * Comparison table showing purchased → received → packed quantities per EAN.
 * Highlights discrepancies with severity levels.
 * Sign-off flow to mark shipments as verified.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { useUser } from "@/components/context/UserContext";
import { PermissionGuard } from "@/components/guards";
import { toast } from "sonner";
import {
  ClipboardCheck, Package, AlertTriangle, CheckCircle2,
  XCircle, Info, RefreshCw, ChevronDown, ChevronUp,
  Sun, Moon, ShieldCheck, FileWarning, Boxes,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import * as db from "@/lib/db";
import {
  getVerificationData,
  signOffShipment,
} from "@/lib/services/inventory-service";

// =============================================================================
// DISCREPANCY LOGIC
// =============================================================================

function getDiscrepancy(row) {
  const { qty_purchased, qty_received, qty_packed } = row;

  // All match
  if (qty_purchased === qty_received && qty_received === qty_packed && qty_packed > 0) {
    return { type: "match", severity: "green", label: "Match" };
  }

  // Packed more than received — critical
  if (qty_packed > qty_received && qty_received > 0) {
    return { type: "over_packed", severity: "red", label: "Over-packed" };
  }

  // Items purchased but never received
  if (qty_purchased > 0 && qty_received === 0) {
    return { type: "not_received", severity: "red", label: "Not received" };
  }

  // Received less than purchased
  if (qty_received > 0 && qty_received < qty_purchased) {
    return { type: "partial_received", severity: "amber", label: "Partial receipt" };
  }

  // Received but not all packed (leftover stock, informational)
  if (qty_received > qty_packed && qty_packed > 0) {
    return { type: "under_packed", severity: "blue", label: "Under-packed" };
  }

  // Received more than purchased (bonus stock)
  if (qty_received > qty_purchased) {
    return { type: "over_received", severity: "amber", label: "Over-received" };
  }

  // No purchase data — can still be valid if received and packed
  if (qty_purchased === 0 && qty_received > 0 && qty_received === qty_packed) {
    return { type: "no_purchase", severity: "blue", label: "No purchase record" };
  }

  // No purchase data at all
  if (qty_purchased === 0 && qty_received === 0 && qty_packed > 0) {
    return { type: "packed_only", severity: "amber", label: "No purchase/receipt" };
  }

  return { type: "unknown", severity: "amber", label: "Check manually" };
}

function getSeverityStyles(severity) {
  switch (severity) {
    case "green":
      return { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" };
    case "red":
      return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" };
    case "amber":
      return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" };
    case "blue":
      return { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" };
    default:
      return { bg: "", border: "", text: "" };
  }
}

function getSeverityIcon(severity) {
  switch (severity) {
    case "green":
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case "red":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "amber":
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case "blue":
      return <Info className="w-4 h-4 text-blue-400" />;
    default:
      return null;
  }
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ShipmentVerification() {
  const { t, theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id;

  // Shipments
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Verification data
  const [verificationRows, setVerificationRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sign-off dialog
  const [showSignOffDialog, setShowSignOffDialog] = useState(false);
  const [signOffNotes, setSignOffNotes] = useState("");
  const [signingOff, setSigningOff] = useState(false);

  // Load finalized/shipped/verified shipments
  const loadShipments = useCallback(async () => {
    if (!companyId) return;
    try {
      const all = await db.listShipments(companyId, {
        status: ["finalized", "shipped", "delivered", "verified"],
      });
      setShipments(all);
    } catch (err) {
      toast.error("Failed to load shipments: " + err.message);
    }
  }, [companyId]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  // Load verification data when shipment selected
  const loadVerificationData = useCallback(async () => {
    if (!companyId || !selectedShipmentId) {
      setVerificationRows([]);
      return;
    }
    setLoading(true);
    try {
      const shipment = await db.getShipment(selectedShipmentId);
      setSelectedShipment(shipment);
      const rows = await getVerificationData(companyId, selectedShipmentId);
      setVerificationRows(rows);
    } catch (err) {
      toast.error("Failed to load verification data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedShipmentId]);

  useEffect(() => {
    loadVerificationData();
  }, [loadVerificationData]);

  // Compute summary stats
  const stats = React.useMemo(() => {
    let matched = 0;
    let discrepancies = 0;
    let redCount = 0;
    let amberCount = 0;

    for (const row of verificationRows) {
      const d = getDiscrepancy(row);
      if (d.severity === "green") matched++;
      else {
        discrepancies++;
        if (d.severity === "red") redCount++;
        if (d.severity === "amber") amberCount++;
      }
    }

    return {
      total: verificationRows.length,
      matched,
      discrepancies,
      redCount,
      amberCount,
    };
  }, [verificationRows]);

  const isVerified = selectedShipment?.verification_status === "verified" ||
    selectedShipment?.verification_status === "discrepancy";

  const hasDiscrepancies = stats.discrepancies > 0;

  // Sign off handler
  const handleSignOff = async (markDiscrepancy) => {
    if (!selectedShipment || !user?.id) return;
    setSigningOff(true);
    try {
      const updated = await signOffShipment(
        selectedShipment.id,
        user.id,
        signOffNotes.trim(),
        markDiscrepancy
      );
      setSelectedShipment(updated);
      setShowSignOffDialog(false);
      setSignOffNotes("");
      toast.success(`Shipment ${updated.shipment_code || ""} ${markDiscrepancy ? "verified with discrepancies" : "verified"}`);
      loadShipments();
    } catch (err) {
      toast.error("Failed to verify: " + err.message);
    } finally {
      setSigningOff(false);
    }
  };

  return (
    <PermissionGuard permission="inventory.manage" showMessage>
      <div className={`min-h-screen ${t("bg-gray-50", "bg-zinc-950")} ${t("text-gray-900", "text-white")} p-6`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardCheck className={`w-7 h-7 ${t("text-cyan-600", "text-cyan-400")}`} />
            <h1 className="text-2xl font-bold">Shipment Verification</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        {/* Shipment Selector */}
        <div className={`${t("bg-white", "bg-zinc-900/60")} ${t("border-gray-200", "border-zinc-800")} border rounded-xl p-4 mb-6`}>
          <label className={`text-sm font-medium ${t("text-gray-500", "text-zinc-400")} mb-2 block`}>
            Select Shipment
          </label>
          <div className="flex items-center gap-3">
            <Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}>
              <SelectTrigger className={`w-full max-w-md ${t("bg-gray-100 border-gray-300", "bg-zinc-800 border-zinc-700")}`}>
                <SelectValue placeholder="Choose a shipment to verify..." />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shipment_code || s.id.slice(0, 8)} — {s.shipment_type?.toUpperCase()} — {s.destination || "No destination"} ({s.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={loadVerificationData}
              disabled={!selectedShipmentId || loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Verified Banner */}
        {isVerified && selectedShipment && (
          <div className={`${selectedShipment.verification_status === "verified"
            ? "bg-green-500/10 border-green-500/30"
            : "bg-amber-500/10 border-amber-500/30"
          } border rounded-xl p-4 mb-6 flex items-center gap-3`}>
            <ShieldCheck className={`w-5 h-5 ${selectedShipment.verification_status === "verified" ? "text-green-400" : "text-amber-400"}`} />
            <div>
              <p className={`font-medium ${selectedShipment.verification_status === "verified" ? "text-green-400" : "text-amber-400"}`}>
                {selectedShipment.verification_status === "verified" ? "Verified" : "Verified with Discrepancies"}
              </p>
              <p className={`text-sm ${t("text-gray-500", "text-zinc-400")}`}>
                on {new Date(selectedShipment.verified_at).toLocaleString()}
                {selectedShipment.verification_notes && ` — "${selectedShipment.verification_notes}"`}
              </p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {selectedShipmentId && verificationRows.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              t={t}
              icon={<Boxes className="w-5 h-5 text-cyan-400" />}
              label="Total EANs"
              value={stats.total}
              color="cyan"
            />
            <SummaryCard
              t={t}
              icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
              label="Matched"
              value={stats.matched}
              color="green"
            />
            <SummaryCard
              t={t}
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              label="Discrepancies"
              value={stats.discrepancies}
              color={stats.redCount > 0 ? "red" : "amber"}
            />
            <SummaryCard
              t={t}
              icon={<ShieldCheck className={`w-5 h-5 ${isVerified ? "text-green-400" : "text-zinc-500"}`} />}
              label="Status"
              value={selectedShipment?.verification_status || "pending"}
              isText
              color={isVerified ? "green" : "zinc"}
            />
          </div>
        )}

        {/* Comparison Table */}
        {selectedShipmentId && (
          <div className={`${t("bg-white", "bg-zinc-900/60")} ${t("border-gray-200", "border-zinc-800")} border rounded-xl overflow-hidden mb-6`}>
            <div className="p-4 border-b border-inherit">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Quantity Comparison
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className={`w-6 h-6 animate-spin mx-auto mb-2 ${t("text-gray-400", "text-zinc-500")}`} />
                <p className={t("text-gray-400", "text-zinc-500")}>Loading verification data...</p>
              </div>
            ) : verificationRows.length === 0 ? (
              <div className="p-12 text-center">
                <FileWarning className={`w-8 h-8 mx-auto mb-2 ${t("text-gray-400", "text-zinc-600")}`} />
                <p className={t("text-gray-500", "text-zinc-500")}>
                  {selectedShipmentId ? "No items found in this shipment" : "Select a shipment to view verification data"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`${t("bg-gray-50", "bg-zinc-800/50")} ${t("text-gray-500", "text-zinc-400")} text-left text-sm`}>
                      <th className="px-4 py-3 font-medium">EAN</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium text-right">Purchased</th>
                      <th className="px-4 py-3 font-medium text-right">Received</th>
                      <th className="px-4 py-3 font-medium text-right">Packed</th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationRows.map((row) => {
                      const disc = getDiscrepancy(row);
                      const styles = getSeverityStyles(disc.severity);
                      return (
                        <tr
                          key={row.ean}
                          className={`border-t ${t("border-gray-200", "border-zinc-800")} ${styles.bg} transition-colors`}
                        >
                          <td className={`px-4 py-3 font-mono text-sm ${t("text-gray-700", "text-zinc-200")}`}>{row.ean || "—"}</td>
                          <td className={`px-4 py-3 text-sm ${t("text-gray-900", "text-white")}`}>{row.product_name}</td>
                          <td className={`px-4 py-3 text-sm text-right tabular-nums ${t("text-gray-700", "text-zinc-200")}`}>{row.qty_purchased}</td>
                          <td className={`px-4 py-3 text-sm text-right tabular-nums ${t("text-gray-700", "text-zinc-200")} ${row.qty_received !== row.qty_purchased && row.qty_purchased > 0 ? "font-semibold" : ""}`}>
                            {row.qty_received}
                            {row.qty_received !== row.qty_purchased && row.qty_purchased > 0 && (
                              <span className={`ml-1 text-xs ${row.qty_received < row.qty_purchased ? "text-amber-400" : "text-blue-400"}`}>
                                ({row.qty_received > row.qty_purchased ? "+" : ""}{row.qty_received - row.qty_purchased})
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right tabular-nums ${t("text-gray-700", "text-zinc-200")} ${row.qty_packed !== row.qty_received && row.qty_received > 0 ? "font-semibold" : ""}`}>
                            {row.qty_packed}
                            {row.qty_packed !== row.qty_received && row.qty_received > 0 && (
                              <span className={`ml-1 text-xs ${row.qty_packed > row.qty_received ? "text-red-400" : "text-blue-400"}`}>
                                ({row.qty_packed > row.qty_received ? "+" : ""}{row.qty_packed - row.qty_received})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {getSeverityIcon(disc.severity)}
                              <span className={`text-xs font-medium ${styles.text}`}>{disc.label}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sign-off Section */}
        {selectedShipment && !isVerified && verificationRows.length > 0 && (
          <div className={`${t("bg-white", "bg-zinc-900/60")} ${t("border-gray-200", "border-zinc-800")} border rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Verification Sign-off</h3>
                <p className={`text-sm ${t("text-gray-500", "text-zinc-400")}`}>
                  {hasDiscrepancies
                    ? `${stats.discrepancies} discrepancy(ies) found — notes required before sign-off`
                    : "All quantities match — ready for sign-off"}
                </p>
              </div>
              <Button
                onClick={() => setShowSignOffDialog(true)}
                className={hasDiscrepancies
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
                }
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify Shipment
              </Button>
            </div>
          </div>
        )}

        {/* Sign-off Dialog */}
        <Dialog open={showSignOffDialog} onOpenChange={setShowSignOffDialog}>
          <DialogContent className={t("bg-white border-gray-200", "bg-zinc-900 border-zinc-800")}>
            <DialogHeader>
              <DialogTitle>Verify Shipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Summary */}
              <div className={`${t("bg-gray-50", "bg-zinc-800/50")} rounded-lg p-3 text-sm space-y-1`}>
                <p>Shipment: <strong>{selectedShipment?.shipment_code}</strong></p>
                <p>Total EANs: <strong>{stats.total}</strong></p>
                <p className="text-green-400">Matched: <strong>{stats.matched}</strong></p>
                {stats.discrepancies > 0 && (
                  <p className="text-amber-400">Discrepancies: <strong>{stats.discrepancies}</strong></p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={`text-sm font-medium ${t("text-gray-500", "text-zinc-400")} mb-1 block`}>
                  Verification Notes {hasDiscrepancies && <span className="text-red-400">*</span>}
                </label>
                <Textarea
                  placeholder={hasDiscrepancies
                    ? "Explain the discrepancies before signing off..."
                    : "Optional notes about this verification..."}
                  value={signOffNotes}
                  onChange={(e) => setSignOffNotes(e.target.value)}
                  rows={3}
                  className={`${t("bg-gray-100 border-gray-300", "bg-zinc-800 border-zinc-700")} ${hasDiscrepancies && !signOffNotes.trim() ? "border-red-500/50" : ""}`}
                />
                {hasDiscrepancies && !signOffNotes.trim() && (
                  <p className="text-red-400 text-xs mt-1">Verification notes are required when signing off with discrepancies</p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowSignOffDialog(false)} disabled={signingOff}>
                Cancel
              </Button>
              {hasDiscrepancies ? (
                <Button
                  onClick={() => handleSignOff(true)}
                  disabled={signingOff || !signOffNotes.trim()}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {signingOff ? "Saving..." : "Mark with Discrepancies"}
                </Button>
              ) : (
                <Button
                  onClick={() => handleSignOff(false)}
                  disabled={signingOff}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {signingOff ? "Saving..." : "Mark Verified"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

// =============================================================================
// SUMMARY CARD
// =============================================================================

function SummaryCard({ t, icon, label, value, color, isText }) {
  const colorMap = {
    cyan: "border-cyan-500/30",
    green: "border-green-500/30",
    red: "border-red-500/30",
    amber: "border-amber-500/30",
    zinc: t("border-gray-300", "border-zinc-700"),
  };

  return (
    <div className={`${t("bg-white", "bg-zinc-900/60")} border ${colorMap[color] || colorMap.zinc} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className={`text-sm ${t("text-gray-500", "text-zinc-400")}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isText ? "text-base capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}
