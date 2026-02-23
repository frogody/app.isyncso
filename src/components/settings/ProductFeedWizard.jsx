/**
 * ProductFeedWizard — 7-step wizard for bol.com channel setup (Channable-style).
 *
 * Steps:
 *   1. Settings     — Feed URL, name, delimiter, bol.com defaults
 *   2. Categories   — Map products to bol.com categories
 *   3. Rules        — IF→THEN transformation rules (sidebar + detail panel)
 *   4. Field Mapping — Map CSV columns → target fields + per-category attributes
 *   5. Quality      — Pre-push validation with error table
 *   6. Preview      — Transformed data table before pushing
 *   7. Result       — Post-push success/error tracking
 */

import React, { useState, useCallback } from "react";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  X, ArrowRight, ArrowLeft, Check, Loader2, Link2, Globe,
  Table2, Settings2, Zap, CheckCircle, AlertTriangle, Rss,
  Tag, Shield, Eye, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/api/supabaseClient";
import FeedRulesEditor from "./FeedRulesEditor";
import FeedRuleImpact from "./FeedRuleImpact";
import FeedCategoryMapping from "./FeedCategoryMapping";
import FeedQualityValidation from "./FeedQualityValidation";
import FeedPreview from "./FeedPreview";
import FeedSyncResults from "./FeedSyncResults";

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
  { id: "brand", label: "Brand", recommended: true },
  { id: "category", label: "Category" },
  { id: "image_url", label: "Image URL", recommended: true },
  { id: "wholesale_price", label: "Wholesale Price" },
  { id: "retail_price", label: "Retail Price" },
  { id: "stock_status", label: "Stock Status" },
  { id: "stock_quantity", label: "Stock Quantity", recommended: true },
];

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

const BOLCOM_DELIVERY_CODES = [
  { id: "24uurs-21", label: "24h delivery" },
  { id: "24uurs-22", label: "1-2 business days" },
  { id: "2-3d", label: "2-3 business days" },
  { id: "3-5d", label: "3-5 business days" },
  { id: "4-8d", label: "4-8 business days" },
  { id: "1-8d", label: "1-8 business days" },
];

export default function ProductFeedWizard({ open, onClose, onSaved, editFeed = null }) {
  const { user } = useUser();
  const companyId = user?.company_id;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedFeedId, setSavedFeedId] = useState(editFeed?.id || null);
  const [syncComplete, setSyncComplete] = useState(false);

  // Step 1: Settings
  const [feedName, setFeedName] = useState(editFeed?.name || "");
  const [feedUrl, setFeedUrl] = useState(editFeed?.feed_url || "");
  const [delimiter, setDelimiter] = useState(editFeed?.delimiter || ",");
  const [encoding, setEncoding] = useState(editFeed?.encoding || "utf-8");
  const [syncInterval, setSyncInterval] = useState(editFeed?.sync_interval || "1h");
  const [autoPushOffers, setAutoPushOffers] = useState(editFeed?.auto_push_offers || false);
  const [bolcomDefaults, setBolcomDefaults] = useState(
    editFeed?.bolcom_defaults || { fulfilment_method: "FBR", delivery_code: "2-3d", condition: "NEW" }
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Step 2: Categories
  const [categoryMappings, setCategoryMappings] = useState(editFeed?.category_mappings || []);

  // Step 3: Rules
  const [rules, setRules] = useState(editFeed?.transformation_rules || []);

  // Step 4: Field Mapping
  const [previewLoading, setPreviewLoading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState(editFeed?.field_mapping || {});

  if (!open) return null;

  // ── Actions ──

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
    } catch {
      toast.error("Network error testing URL");
    } finally {
      setTesting(false);
    }
  };

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
    } catch {
      toast.error("Failed to load feed preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const goToStep = (s) => {
    if (s === 4 && headers.length === 0) loadPreview();
    setStep(s);
  };

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
        category_mappings: categoryMappings,
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

      setSavedFeedId(feedId);

      // Move to step 7 (results) and trigger sync
      setStep(7);
      setSyncComplete(false);
      toast.info("Starting sync...");
      callFeedApi("syncFeed", { feedId, triggeredBy: "manual" })
        .then((res) => {
          if (res.success) {
            toast.success(
              `Sync complete: ${res.summary?.imported || 0} imported, ${res.summary?.excluded || 0} excluded`
            );
          } else {
            toast.error(`Sync failed: ${res.error || "Unknown error"}`);
          }
          setSyncComplete(true);
          onSaved?.();
        })
        .catch(() => { toast.error("Sync request failed"); setSyncComplete(true); });
    } catch (e) {
      toast.error(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const mappedFields = Object.values(fieldMapping).filter(Boolean);
  const hasRequiredMappings = mappedFields.includes("ean") && mappedFields.includes("name");

  const steps = [
    { num: 1, label: "Settings", icon: Settings2 },
    { num: 2, label: "Categories", icon: Tag },
    { num: 3, label: "Rules", icon: Zap },
    { num: 4, label: "Mapping", icon: Table2 },
    { num: 5, label: "Quality", icon: Shield },
    { num: 6, label: "Preview", icon: Eye },
    { num: 7, label: "Result", icon: BarChart3 },
  ];

  const canAdvance = () => {
    switch (step) {
      case 1: return feedUrl.trim() && feedName.trim();
      case 2: return true; // categories optional
      case 3: return true; // rules optional
      case 4: return hasRequiredMappings && headers.length > 0;
      case 5: return true; // quality is informational
      case 6: return true; // preview is informational
      default: return false;
    }
  };

  const stepBlockReason = () => {
    if (step === 4) {
      if (headers.length === 0) return "Load feed preview first to map fields";
      if (!hasRequiredMappings) return "Map EAN and Product Name to continue";
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[92vh] bg-zinc-900 border border-zinc-700/40 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700/40">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-500/10">
              <Rss className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                {editFeed ? "Edit Channel" : "New bol.com Channel"}
              </h2>
              <p className="text-[11px] text-zinc-500">{feedName || "Untitled Feed"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0.5 px-5 py-2 border-b border-zinc-800/60 overflow-x-auto">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => s.num <= Math.max(step, 1) && goToStep(s.num)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                  step === s.num
                    ? "bg-cyan-500/20 text-cyan-400"
                    : step > s.num
                    ? "text-cyan-500/60 hover:text-cyan-400"
                    : "text-zinc-600"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  step === s.num ? "bg-cyan-500 text-zinc-900" :
                  step > s.num ? "bg-cyan-500/30 text-cyan-400" :
                  "bg-zinc-700/50 text-zinc-500"
                }`}>
                  {step > s.num ? <Check className="w-2.5 h-2.5" /> : s.num}
                </span>
                {s.label}
              </button>
              {idx < steps.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-zinc-700 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[calc(92vh-160px)]">

          {/* ══════ STEP 1: Settings ══════ */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Feed Name</label>
                  <Input
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    placeholder="e.g. Kasius Jewelry Feed"
                    className="bg-zinc-800/60 border-zinc-700/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Unique ID Field</label>
                  <select className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2">
                    <option value="ean">EAN (ean13leverancier)</option>
                    <option value="sku">SKU (artikelnummer)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">CSV Feed URL</label>
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
                      <><CheckCircle className="w-4 h-4" />Feed reachable — {testResult.rowCount?.toLocaleString()} rows</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4" />{testResult.error}</>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Delimiter</label>
                  <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2">
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Encoding</label>
                  <select value={encoding} onChange={(e) => setEncoding(e.target.value)} className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2">
                    <option value="utf-8">UTF-8</option>
                    <option value="latin1">Latin-1</option>
                    <option value="windows-1252">Windows-1252</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Language</label>
                  <select className="w-full rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 px-3 py-2">
                    <option value="nl">Dutch</option>
                    <option value="en">English</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>

              {/* Sync & bol.com settings */}
              <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300">Sync & bol.com Settings</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Sync Interval</label>
                    <select value={syncInterval} onChange={(e) => setSyncInterval(e.target.value)} className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5">
                      {SYNC_INTERVALS.map((si) => <option key={si.id} value={si.id}>{si.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Fulfilment</label>
                    <select value={bolcomDefaults.fulfilment_method} onChange={(e) => setBolcomDefaults({ ...bolcomDefaults, fulfilment_method: e.target.value })} className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5">
                      <option value="FBR">FBR (Retailer)</option>
                      <option value="FBB">FBB (bol.com)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Delivery Code</label>
                    <select value={bolcomDefaults.delivery_code} onChange={(e) => setBolcomDefaults({ ...bolcomDefaults, delivery_code: e.target.value })} className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5">
                      {BOLCOM_DELIVERY_CODES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Condition</label>
                    <select value={bolcomDefaults.condition} onChange={(e) => setBolcomDefaults({ ...bolcomDefaults, condition: e.target.value })} className="w-full rounded-lg bg-zinc-900/60 border border-zinc-700/40 text-sm text-zinc-200 px-2.5 py-1.5">
                      <option value="NEW">New</option>
                      <option value="AS_NEW">As New</option>
                      <option value="GOOD">Good</option>
                      <option value="REASONABLE">Reasonable</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input type="checkbox" checked={autoPushOffers} onChange={(e) => setAutoPushOffers(e.target.checked)} className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-cyan-500" />
                  <span className="text-xs text-zinc-400">Auto-push offers to bol.com on sync</span>
                </label>
              </div>
            </div>
          )}

          {/* ══════ STEP 2: Categories ══════ */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Category Mapping</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Map products to bol.com categories so they appear in the right marketplace sections.</p>
              </div>
              <FeedCategoryMapping
                categoryMappings={categoryMappings}
                onChange={setCategoryMappings}
                sourceFields={Object.keys(fieldMapping).filter((k) => fieldMapping[k])}
                sampleRows={sampleRows}
                fieldMapping={fieldMapping}
              />
            </div>
          )}

          {/* ══════ STEP 3: Rules ══════ */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Transformation Rules</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Add IF→THEN rules to transform feed data before importing. Rules run in priority order.</p>
              </div>
              <FeedRulesEditor
                rules={rules}
                onChange={setRules}
                sourceFields={Object.keys(fieldMapping).filter((k) => fieldMapping[k])}
              />
              {/* Rule Impact Preview */}
              {sampleRows.length > 0 && rules.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-700/30">
                  <FeedRuleImpact
                    rules={rules}
                    sampleRows={sampleRows}
                    fieldMapping={fieldMapping}
                  />
                </div>
              )}
            </div>
          )}

          {/* ══════ STEP 4: Field Mapping ══════ */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">Field Mapping</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Map CSV columns to product fields. {headers.length} columns detected.</p>
                </div>
                {headers.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />Required</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Recommended</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />Optional</span>
                  </div>
                )}
              </div>

              {previewLoading ? (
                <div className="flex items-center justify-center py-12 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading feed preview...
                </div>
              ) : headers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 mb-3">No preview data available</p>
                  <Button onClick={loadPreview} className="bg-cyan-600 hover:bg-cyan-500 text-white">Load Preview</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
                    {headers.map((header) => {
                      const sampleValue = sampleRows[0]?.[header] || "";
                      const truncatedSample = sampleValue.length > 60 ? sampleValue.substring(0, 60) + "..." : sampleValue;
                      const targetField = TARGET_FIELDS.find((f) => f.id === fieldMapping[header]);
                      const reqDot = targetField?.required ? "bg-cyan-500" : targetField?.recommended ? "bg-amber-500" : fieldMapping[header] ? "bg-zinc-500" : "";

                      return (
                        <div key={header} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/20 hover:border-zinc-600/40 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-zinc-200 truncate">{header}</p>
                            {truncatedSample && <p className="text-[11px] text-zinc-600 truncate">{truncatedSample}</p>}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            {reqDot && <span className={`w-1.5 h-1.5 rounded-full ${reqDot}`} />}
                            <select
                              value={fieldMapping[header] || ""}
                              onChange={(e) => setFieldMapping((prev) => ({ ...prev, [header]: e.target.value || undefined }))}
                              className={`w-36 rounded-lg border text-xs px-2 py-1.5 ${
                                fieldMapping[header]
                                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                  : "bg-zinc-900/60 border-zinc-700/40 text-zinc-500"
                              }`}
                            >
                              <option value="">— skip —</option>
                              {TARGET_FIELDS.map((f) => (
                                <option key={f.id} value={f.id}>{f.label}{f.required ? " *" : f.recommended ? " ~" : ""}</option>
                              ))}
                            </select>
                          </div>
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

          {/* ══════ STEP 5: Quality ══════ */}
          {step === 5 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Quality Check</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Validate data quality before pushing to bol.com. Fix issues to prevent API rejections.</p>
              </div>
              <FeedQualityValidation
                fieldMapping={fieldMapping}
                rules={rules}
                sampleRows={sampleRows}
                bolcomDefaults={bolcomDefaults}
                onNavigateToStep={goToStep}
              />
            </div>
          )}

          {/* ══════ STEP 6: Preview ══════ */}
          {step === 6 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Data Preview</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Preview how your data will look after rules are applied. This shows sample data only — full sync processes all rows.</p>
              </div>
              <FeedPreview
                sampleRows={sampleRows}
                fieldMapping={fieldMapping}
                rules={rules}
              />
            </div>
          )}

          {/* ══════ STEP 7: Result ══════ */}
          {step === 7 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Sync Results</h3>
                <p className="text-xs text-zinc-500 mt-0.5">View sync results, track successful imports and errors.</p>
              </div>
              {savedFeedId ? (
                <FeedSyncResults feedId={savedFeedId} feedName={feedName} syncComplete={syncComplete} />
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p className="text-sm">Save your feed first to see results</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-700/40">
          <div>
            {step > 1 && step < 7 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="border-zinc-700/40 text-zinc-300 text-xs h-8">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {stepBlockReason() && (
              <span className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                {stepBlockReason()}
              </span>
            )}
            <Button variant="outline" onClick={onClose} className="border-zinc-700/40 text-zinc-400 text-xs h-8">
              {step === 7 ? "Done" : "Cancel"}
            </Button>
            {step < 6 && (
              <Button
                onClick={() => goToStep(step + 1)}
                disabled={!canAdvance()}
                className={`text-xs h-8 ${canAdvance() ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-zinc-700 text-zinc-500 cursor-not-allowed"}`}
              >
                {steps[step]?.label || "Next"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
            {step === 6 && (
              <Button
                onClick={handleSave}
                disabled={saving || !hasRequiredMappings}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                {editFeed ? "Save & Sync" : "Save & Start Sync"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
