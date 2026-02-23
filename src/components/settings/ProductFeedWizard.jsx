/**
 * ProductFeedWizard — 4-step wizard for adding a product feed.
 *
 * Steps:
 *   1. Feed URL — URL input, test, name, delimiter
 *   2. Field Mapping — Map CSV columns → target fields
 *   3. Transformation Rules — IF→THEN rule builder
 *   4. Review & Save — Summary, sync interval, bol.com defaults
 */

import React, { useState, useCallback } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  X, ArrowRight, ArrowLeft, Check, Loader2, Link2, Globe,
  Table2, Settings2, Zap, CheckCircle, AlertTriangle, Rss,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/api/supabaseClient";
import FeedRulesEditor from "./FeedRulesEditor";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callFeedApi(action, params) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/product-feed-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return response.json();
}

const TARGET_FIELDS = [
  { id: "ean", label: "EAN", required: true },
  { id: "sku", label: "SKU" },
  { id: "name", label: "Product Name", required: true },
  { id: "description", label: "Description" },
  { id: "short_description", label: "Short Description" },
  { id: "brand", label: "Brand" },
  { id: "category", label: "Category" },
  { id: "image_url", label: "Image URL" },
  { id: "wholesale_price", label: "Wholesale Price" },
  { id: "retail_price", label: "Retail Price" },
  { id: "stock_status", label: "Stock Status" },
  { id: "stock_quantity", label: "Stock Quantity" },
];

// Auto-suggest mapping based on Dutch column names
function autoSuggest(columnName) {
  const col = columnName.toLowerCase();
  if (col.includes("ean13") || col.includes("ean") || col === "barcode") return "ean";
  if (col.includes("artikelnummer") || col === "sku") return "sku";
  if (col === "omschrijving" || col === "naam" || col === "productnaam") return "name";
  if (col.includes("commercieleomschrijving") || col.includes("beschrijving")) return "description";
  if (col === "brutoinkoopprijs" || col.includes("inkoopprijs")) return "wholesale_price";
  if (col === "advieswinkelverkoopprijs" || col.includes("verkoopprijs")) return "retail_price";
  if (col === "voorraadstatus" || col.includes("stockstatus")) return "stock_status";
  if (col.includes("voorraad") && col.includes("aantal")) return "stock_quantity";
  if (col === "referentiefotourl" || col.includes("foto") || col.includes("image")) return "image_url";
  if (col === "merk" || col === "brand") return "brand";
  if (col === "artikelgroep" || col === "categorie" || col === "category") return "category";
  return "";
}

const SYNC_INTERVALS = [
  { id: "15min", label: "Every 15 minutes" },
  { id: "1h", label: "Every hour" },
  { id: "4h", label: "Every 4 hours" },
  { id: "24h", label: "Daily" },
  { id: "manual", label: "Manual only" },
];

export default function ProductFeedWizard({ open, onClose, onSaved, editFeed = null }) {
  const { t } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Feed URL
  const [feedName, setFeedName] = useState(editFeed?.name || "");
  const [feedUrl, setFeedUrl] = useState(editFeed?.feed_url || "");
  const [delimiter, setDelimiter] = useState(editFeed?.delimiter || ",");
  const [encoding, setEncoding] = useState(editFeed?.encoding || "utf-8");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Step 2: Field Mapping
  const [previewLoading, setPreviewLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState(editFeed?.field_mapping || {});

  // Step 3: Rules
  const [rules, setRules] = useState(editFeed?.transformation_rules || []);

  // Step 4: Review
  const [syncInterval, setSyncInterval] = useState(editFeed?.sync_interval || "1h");
  const [autoPushOffers, setAutoPushOffers] = useState(editFeed?.auto_push_offers || false);
  const [bolcomDefaults, setBolcomDefaults] = useState(
    editFeed?.bolcom_defaults || { fulfilment_method: "FBR", delivery_code: "2-3d", condition: "NEW" }
  );
  const [runFirstSync, setRunFirstSync] = useState(true);

  if (!open) return null;

  // ===== Step 1: Test URL =====
  const handleTestUrl = async () => {
    if (!feedUrl.trim()) return toast.error("Enter a feed URL");
    setTesting(true);
    setTestResult(null);
    try {
      const result = await callFeedApi("testUrl", { feedUrl: feedUrl.trim() });
      setTestResult(result);
      if (result.success) {
        toast.success(`Feed reachable — ${result.rowCount?.toLocaleString()} rows`);
      } else {
        toast.error(result.error || "Failed to reach URL");
      }
    } catch (e) {
      toast.error("Network error testing URL");
    } finally {
      setTesting(false);
    }
  };

  // ===== Step 2: Load Preview =====
  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const result = await callFeedApi("previewFeed", {
        feedUrl: feedUrl.trim(),
        delimiter,
        encoding,
        hasHeader: true,
      });
      if (result.headers) {
        setHeaders(result.headers);
        setSampleRows(result.sampleRows || []);

        // Auto-suggest field mapping
        if (Object.keys(fieldMapping).length === 0) {
          const suggested = {};
          result.headers.forEach((h) => {
            const target = autoSuggest(h);
            if (target) suggested[h] = target;
          });
          setFieldMapping(suggested);
        }
      } else {
        toast.error(result.error || "Failed to load preview");
      }
    } catch (e) {
      toast.error("Failed to load feed preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const goToStep = (s) => {
    if (s === 2 && headers.length === 0) {
      loadPreview();
    }
    setStep(s);
  };

  // ===== Step 4: Save Feed =====
  const handleSave = async () => {
    if (!companyId) return toast.error("Not logged in");
    if (!feedName.trim()) return toast.error("Enter a feed name");
    if (!feedUrl.trim()) return toast.error("Enter a feed URL");

    setSaving(true);
    try {
      const feedData = {
        company_id: companyId,
        name: feedName.trim(),
        feed_url: feedUrl.trim(),
        delimiter,
        encoding,
        has_header_row: true,
        sync_interval: syncInterval,
        is_active: true,
        auto_push_offers: autoPushOffers,
        field_mapping: fieldMapping,
        transformation_rules: rules,
        bolcom_defaults: bolcomDefaults,
      };

      let feedId;
      if (editFeed?.id) {
        const { error } = await supabase
          .from("product_feeds")
          .update(feedData)
          .eq("id", editFeed.id);
        if (error) throw error;
        feedId = editFeed.id;
        toast.success("Feed updated");
      } else {
        const { data, error } = await supabase
          .from("product_feeds")
          .insert(feedData)
          .select("id")
          .single();
        if (error) throw error;
        feedId = data.id;
        toast.success("Feed created");
      }

      // Trigger first sync
      if (runFirstSync && feedId) {
        toast.info("Starting first sync...");
        callFeedApi("syncFeed", { feedId, triggeredBy: "manual" })
          .then((res) => {
            if (res.success) {
              toast.success(
                `Sync complete: ${res.summary?.imported || 0} imported, ${res.summary?.excluded || 0} excluded, ${res.summary?.unchanged || 0} unchanged`
              );
            } else {
              toast.error(`Sync failed: ${res.error || "Unknown error"}`);
            }
          })
          .catch(() => toast.error("Sync request failed"));
      }

      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const mappedFields = Object.values(fieldMapping).filter(Boolean);
  const hasRequiredMappings = mappedFields.includes("ean") && mappedFields.includes("name");

  const steps = [
    { num: 1, label: "Feed URL", icon: Globe },
    { num: 2, label: "Field Mapping", icon: Table2 },
    { num: 3, label: "Rules", icon: Zap },
    { num: 4, label: "Review", icon: Check },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-700/40 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-700/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10">
              <Rss className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {editFeed ? "Edit Product Feed" : "Add Product Feed"}
              </h2>
              <p className="text-xs text-zinc-500">Step {step} of 4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-zinc-800/60">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => s.num <= step && goToStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  step === s.num
                    ? "bg-cyan-500/20 text-cyan-400"
                    : step > s.num
                    ? "text-cyan-500/60 hover:text-cyan-400"
                    : "text-zinc-600"
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
              {idx < steps.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-700" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(90vh-200px)]">
          {/* ===== STEP 1: Feed URL ===== */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">Feed Name</label>
                <Input
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="e.g. Kasius Jewelry Feed"
                  className="bg-zinc-800/60 border-zinc-700/40"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 mb-1.5 block">CSV Feed URL</label>
                <div className="flex gap-2">
                  <Input
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://files.channable.com/..."
                    className="flex-1 bg-zinc-800/60 border-zinc-700/40 font-mono text-sm"
                  />
                  <Button
                    onClick={handleTestUrl}
                    disabled={testing || !feedUrl.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Test
                  </Button>
                </div>
                {testResult && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${testResult.success ? "text-green-400" : "text-red-400"}`}>
                    {testResult.success ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Feed reachable — {testResult.rowCount?.toLocaleString()} rows found
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        {testResult.error}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-300 mb-1.5 block">Delimiter</label>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-300 mb-1.5 block">Encoding</label>
                  <select
                    value={encoding}
                    onChange={(e) => setEncoding(e.target.value)}
                    className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2"
                  >
                    <option value="utf-8">UTF-8</option>
                    <option value="latin1">Latin-1 (ISO-8859-1)</option>
                    <option value="windows-1252">Windows-1252</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2: Field Mapping ===== */}
          {step === 2 && (
            <div className="space-y-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading feed preview...
                </div>
              ) : headers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 mb-3">No preview data available</p>
                  <Button onClick={loadPreview} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                    Load Preview
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-400">
                    Map CSV columns to product fields. {headers.length} columns detected.
                    <span className="text-cyan-400 ml-1">{Object.values(fieldMapping).filter(Boolean).length} mapped</span>
                  </p>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {headers.map((header) => {
                      const sampleValue = sampleRows[0]?.[header] || "";
                      const truncatedSample = sampleValue.length > 60 ? sampleValue.substring(0, 60) + "..." : sampleValue;

                      return (
                        <div
                          key={header}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-zinc-200 truncate">{header}</p>
                            {truncatedSample && (
                              <p className="text-xs text-zinc-500 truncate mt-0.5">{truncatedSample}</p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                          <select
                            value={fieldMapping[header] || ""}
                            onChange={(e) => {
                              setFieldMapping((prev) => ({
                                ...prev,
                                [header]: e.target.value || undefined,
                              }));
                            }}
                            className={`w-40 rounded-lg border text-sm px-2 py-1.5 ${
                              fieldMapping[header]
                                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                : "bg-zinc-900/60 border-zinc-700/40 text-zinc-500"
                            }`}
                          >
                            <option value="">— skip —</option>
                            {TARGET_FIELDS.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label} {f.required ? "*" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  {!hasRequiredMappings && (
                    <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4" />
                      EAN and Product Name are required mappings
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== STEP 3: Transformation Rules ===== */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Add IF→THEN rules to transform feed data before importing. Rules are applied in order.
              </p>
              <FeedRulesEditor
                rules={rules}
                onChange={setRules}
                sourceFields={Object.keys(fieldMapping).filter((k) => fieldMapping[k])}
              />
            </div>
          )}

          {/* ===== STEP 4: Review & Save ===== */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Feed Name</span>
                    <p className="text-zinc-200">{feedName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">URL</span>
                    <p className="text-zinc-200 font-mono text-xs truncate">{feedUrl || "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Mapped Fields</span>
                    <p className="text-cyan-400">{Object.values(fieldMapping).filter(Boolean).length} fields</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Rules</span>
                    <p className="text-cyan-400">{rules.length} rules</p>
                  </div>
                  {testResult?.rowCount && (
                    <div>
                      <span className="text-zinc-500">Estimated Rows</span>
                      <p className="text-zinc-200">{testResult.rowCount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Settings */}
              <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">Sync Settings</h3>

                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Sync Interval</label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2"
                  >
                    {SYNC_INTERVALS.map((si) => (
                      <option key={si.id} value={si.id}>{si.label}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPushOffers}
                    onChange={(e) => setAutoPushOffers(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-zinc-300">Auto-push offers to bol.com on sync</span>
                </label>
              </div>

              {/* bol.com Defaults */}
              <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">bol.com Defaults</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Fulfilment</label>
                    <select
                      value={bolcomDefaults.fulfilment_method}
                      onChange={(e) => setBolcomDefaults({ ...bolcomDefaults, fulfilment_method: e.target.value })}
                      className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2 py-1.5"
                    >
                      <option value="FBR">FBR (Fulfilled by Retailer)</option>
                      <option value="FBB">FBB (Fulfilled by bol.com)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Delivery Code</label>
                    <select
                      value={bolcomDefaults.delivery_code}
                      onChange={(e) => setBolcomDefaults({ ...bolcomDefaults, delivery_code: e.target.value })}
                      className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2 py-1.5"
                    >
                      <option value="24uurs-21">24h delivery</option>
                      <option value="24uurs-22">1-2 business days</option>
                      <option value="2-3d">2-3 business days</option>
                      <option value="3-5d">3-5 business days</option>
                      <option value="4-8d">4-8 business days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Condition</label>
                    <select
                      value={bolcomDefaults.condition}
                      onChange={(e) => setBolcomDefaults({ ...bolcomDefaults, condition: e.target.value })}
                      className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2 py-1.5"
                    >
                      <option value="NEW">New</option>
                      <option value="AS_NEW">As New</option>
                      <option value="GOOD">Good</option>
                      <option value="REASONABLE">Reasonable</option>
                      <option value="MODERATE">Moderate</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* First sync toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                <input
                  type="checkbox"
                  checked={runFirstSync}
                  onChange={(e) => setRunFirstSync(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm text-cyan-400 font-medium">Run first sync immediately</span>
                  <p className="text-xs text-zinc-500">Start importing products right after saving</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-zinc-700/40">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="border-zinc-700/40 text-zinc-300"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-zinc-700/40 text-zinc-400">
              Cancel
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => goToStep(step + 1)}
                disabled={
                  (step === 1 && (!feedUrl.trim() || !feedName.trim())) ||
                  (step === 2 && !hasRequiredMappings)
                }
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                {editFeed ? "Save Changes" : "Save & Start Sync"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
