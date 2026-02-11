/**
 * BolcomReplenishmentDialog — Multi-step dialog for pushing a shipment to bol.com
 *
 * Steps:
 * 1. Loading product destinations
 * 2. Select delivery date / timeslot
 * 3. Confirmation + progress
 */

import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { toast } from "sonner";
import {
  Loader2, Truck, Calendar, Check, AlertTriangle, Download, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  getBolcomProductDestinations,
  getBolcomTimeslots,
  pushShipmentToBolcom,
  getBolcomReplenishmentLabels,
} from "@/lib/services/inventory-service";

export default function BolcomReplenishmentDialog({
  open,
  onOpenChange,
  shipment,
  replenishmentData,
  companyId,
  onSuccess,
}) {
  const { t } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: destinations
  const [destinations, setDestinations] = useState(null);

  // Step 2: delivery date
  const [deliveryDate, setDeliveryDate] = useState("");
  const [timeslots, setTimeslots] = useState(null);
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);

  // Step 3: result
  const [processStatusId, setProcessStatusId] = useState(null);
  const [labelsUrl, setLabelsUrl] = useState(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setLoading(false);
      setError(null);
      setDestinations(null);
      setDeliveryDate("");
      setTimeslots(null);
      setSelectedTimeslot(null);
      setProcessStatusId(null);
      setLabelsUrl(null);
      loadDestinations();
    }
  }, [open]);

  async function loadDestinations() {
    if (!replenishmentData) return;
    setLoading(true);
    setError(null);
    try {
      const products = replenishmentData.lines.map((l) => ({
        ean: l.ean,
        quantity: l.quantity,
      }));
      const data = await getBolcomProductDestinations(companyId, products);
      setDestinations(data);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to load product destinations");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateReplenishment() {
    setLoading(true);
    setError(null);
    try {
      const deliveryInfo = {
        deliveryDate: deliveryDate || new Date().toISOString().slice(0, 10),
        ...(selectedTimeslot ? { timeslotId: selectedTimeslot } : {}),
      };

      const result = await pushShipmentToBolcom(
        companyId,
        shipment.id,
        deliveryInfo,
        { labellingByBol: true }
      );

      setProcessStatusId(result.processStatusId);
      setStep(3);
      toast.success("Replenishment created — processing...");
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Failed to create replenishment");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadLabels() {
    if (!shipment.bol_replenishment_id) {
      toast.error("Replenishment not yet confirmed — labels not available yet");
      return;
    }
    setLoading(true);
    try {
      const { labelsUrl: url } = await getBolcomReplenishmentLabels(
        companyId,
        shipment.bol_replenishment_id,
        shipment.id
      );
      setLabelsUrl(url);
      window.open(url, "_blank");
      toast.success("Labels downloaded");
    } catch (err) {
      toast.error(err.message || "Failed to download labels");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-lg ${t("bg-white border-gray-200", "bg-zinc-950 border-zinc-800")}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
            <Truck className="w-5 h-5 text-cyan-400" />
            Push to bol.com
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s
                    ? "bg-cyan-500 text-white"
                    : step > s
                      ? "bg-cyan-500/20 text-cyan-400"
                      : t("bg-gray-200 text-gray-500", "bg-zinc-800 text-zinc-500")
                }`}>
                  {step > s ? <Check className="w-3 h-3" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-px ${step > s ? "bg-cyan-500" : t("bg-gray-300", "bg-zinc-700")}`} />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Loading destinations */}
          {step === 1 && (
            <div className="text-center py-8">
              {loading ? (
                <>
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                  <p className={`text-sm ${t("text-gray-600", "text-zinc-400")}`}>
                    Loading product destinations from bol.com...
                  </p>
                </>
              ) : (
                <p className={`text-sm ${t("text-gray-600", "text-zinc-400")}`}>
                  Preparing replenishment data...
                </p>
              )}
            </div>
          )}

          {/* Step 2: Delivery date selection */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-3 rounded-lg ${t("bg-gray-50 border border-gray-200", "bg-zinc-900 border border-zinc-800")}`}>
                <h4 className={`text-sm font-medium mb-2 ${t("text-gray-900", "text-white")}`}>Replenishment Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={t("text-gray-500", "text-zinc-500")}>Reference</div>
                  <div className={t("text-gray-900", "text-white")}>{replenishmentData?.reference}</div>
                  <div className={t("text-gray-500", "text-zinc-500")}>Pallets</div>
                  <div className={t("text-gray-900", "text-white")}>{replenishmentData?.numberOfLoadCarriers}</div>
                  <div className={t("text-gray-500", "text-zinc-500")}>EAN Lines</div>
                  <div className={t("text-gray-900", "text-white")}>{replenishmentData?.lines?.length}</div>
                  <div className={t("text-gray-500", "text-zinc-500")}>Total Items</div>
                  <div className={t("text-gray-900", "text-white")}>
                    {replenishmentData?.lines?.reduce((s, l) => s + l.quantity, 0)}
                  </div>
                  <div className={t("text-gray-500", "text-zinc-500")}>Total Weight</div>
                  <div className={t("text-gray-900", "text-white")}>{replenishmentData?.totalWeight || 0} kg</div>
                </div>
              </div>

              {/* Delivery date */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${t("text-gray-700", "text-zinc-300")}`}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${t(
                    "bg-white border-gray-300 text-gray-900",
                    "bg-zinc-900 border-zinc-700 text-white"
                  )}`}
                />
              </div>

              {/* EAN breakdown */}
              <div>
                <h4 className={`text-sm font-medium mb-2 ${t("text-gray-700", "text-zinc-300")}`}>
                  <Package className="w-4 h-4 inline mr-1" />
                  Items to Send
                </h4>
                <div className={`rounded-lg border overflow-hidden ${t("border-gray-200", "border-zinc-800")}`}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={t("bg-gray-50", "bg-zinc-900")}>
                        <th className={`px-3 py-2 text-left ${t("text-gray-500", "text-zinc-500")}`}>EAN</th>
                        <th className={`px-3 py-2 text-right ${t("text-gray-500", "text-zinc-500")}`}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {replenishmentData?.lines?.map((line, i) => (
                        <tr key={i} className={t("border-t border-gray-100", "border-t border-zinc-800/50")}>
                          <td className={`px-3 py-1.5 font-mono ${t("text-gray-700", "text-zinc-300")}`}>{line.ean}</td>
                          <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>{line.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className={`font-medium ${t("text-gray-900", "text-white")}`}>Replenishment Submitted</p>
                <p className={`text-sm mt-1 ${t("text-gray-500", "text-zinc-400")}`}>
                  Process Status ID: <span className="font-mono">{processStatusId}</span>
                </p>
                <p className={`text-xs mt-2 ${t("text-gray-400", "text-zinc-500")}`}>
                  bol.com is processing your replenishment. Labels will be available once confirmed.
                </p>
              </div>

              {shipment.bol_replenishment_id && (
                <Button
                  variant="outline"
                  onClick={handleDownloadLabels}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download Labels
                </Button>
              )}

              {labelsUrl && (
                <p className={`text-xs ${t("text-gray-500", "text-zinc-400")}`}>
                  <a href={labelsUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    Open labels PDF
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 2 && (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className={t("text-gray-600", "text-zinc-400")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateReplenishment}
                disabled={loading || !deliveryDate}
                className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Create Replenishment
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={() => onOpenChange(false)} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
