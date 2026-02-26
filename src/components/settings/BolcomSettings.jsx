/**
 * BolcomSettings — bol.com integration settings panel (Phase 4 — P4-16)
 *
 * Sections:
 * 1. Credentials — client_id/secret inputs, test connection
 * 2. EAN Mappings — bolcom_offer_mappings table
 * 3. Inventory Comparison — compare local vs bol.com stock
 * 4. Replenishment History — shipments pushed to bol.com
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  ShoppingBag, Key, RefreshCw, Check, X, AlertTriangle,
  Loader2, Eye, EyeOff, ArrowRightLeft, Package, Truck,
  Download, ChevronDown, ChevronUp, Upload, FileSpreadsheet,
} from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/api/supabaseClient";
import {
  testBolcomConnection,
  saveBolcomCredentials,
} from "@/lib/services/inventory-service";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callBolcomApi(action, params) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/bolcom-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return response.json();
}

export default function BolcomSettings() {
  const { t } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id;

  // Credentials
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'connected' | 'error'
  const [connectionError, setConnectionError] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Import products
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Fetch pricing
  const [fetchingPricing, setFetchingPricing] = useState(false);
  const [pricingResult, setPricingResult] = useState(null);

  // Fetch images
  const [fetchingImages, setFetchingImages] = useState(false);
  const [imagesResult, setImagesResult] = useState(null);

  // Sync stock
  const [syncingStock, setSyncingStock] = useState(false);
  const [stockResult, setStockResult] = useState(null);

  // Offer mappings
  const [mappings, setMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Stock comparison
  const [stockData, setStockData] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [showStock, setShowStock] = useState(false);

  // Replenishment history
  const [repHistory, setRepHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // CSV import
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  // Check if credentials exist
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("bolcom_credentials")
        .select("id, is_active, last_token_error, token_expires_at")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        setHasCreds(true);
        if (data.token_expires_at && new Date(data.token_expires_at) > new Date()) {
          setConnectionStatus("connected");
        }
        if (data.last_token_error) {
          setConnectionError(data.last_token_error);
        }
      }
    })();
  }, [companyId]);

  // Load offer mappings
  const loadMappings = useCallback(async () => {
    if (!companyId) return;
    setLoadingMappings(true);
    try {
      const { data, error } = await supabase
        .from("bolcom_offer_mappings")
        .select("*, products(name, sku)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMappings(data || []);
    } catch (err) {
      console.error("Failed to load mappings:", err);
    } finally {
      setLoadingMappings(false);
    }
  }, [companyId]);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  // Save credentials
  const handleSaveCredentials = async () => {
    if (!companyId) {
      toast.error("No company linked to your account. Please contact support.");
      return;
    }
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Both Client ID and Client Secret are required");
      return;
    }
    setSavingCreds(true);
    try {
      await saveBolcomCredentials(companyId, clientId.trim(), clientSecret.trim());
      setHasCreds(true);
      setClientId("");
      setClientSecret("");
      setConnectionStatus(null);
      toast.success("Credentials saved securely");
    } catch (err) {
      toast.error(err.message || "Failed to save credentials");
    } finally {
      setSavingCreds(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!companyId) { toast.error("No company linked to your account."); return; }
    setTestingConnection(true);
    setConnectionError("");
    try {
      await testBolcomConnection(companyId);
      setConnectionStatus("connected");
      toast.success("Connected to bol.com successfully");
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(err.message || "Connection failed");
      toast.error(err.message || "Connection failed");
    } finally {
      setTestingConnection(false);
    }
  };

  // Import products from bol.com
  const handleImportProducts = async () => {
    if (!companyId) { toast.error("No company linked to your account."); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await callBolcomApi("importProducts", { companyId });
      if (!result.success) throw new Error(result.error);
      setImportResult(result.data);
      toast.success(`Imported ${result.data.imported} products, updated ${result.data.updated}`);
      // Refresh mappings table
      loadMappings();
    } catch (err) {
      toast.error(err.message || "Failed to import products");
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  // Fetch pricing from bol.com offers export
  const handleFetchPricing = async () => {
    if (!companyId) { toast.error("No company linked to your account."); return; }
    setFetchingPricing(true);
    setPricingResult(null);
    try {
      const result = await callBolcomApi("fetchPricing", { companyId });
      if (!result.success) throw new Error(result.error);
      setPricingResult(result.data);
      toast.success(`Updated pricing for ${result.data.pricesUpdated} products`);
    } catch (err) {
      toast.error(err.message || "Failed to fetch pricing");
      setPricingResult({ error: err.message });
    } finally {
      setFetchingPricing(false);
    }
  };

  // Fetch images from bol.com (auto-loops in batches of 500 until all done)
  const handleFetchImages = async () => {
    if (!companyId) { toast.error("No company linked to your account."); return; }
    setFetchingImages(true);
    setImagesResult(null);
    let totalFound = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalProcessed = 0;
    let batchNum = 0;
    try {
      while (true) {
        batchNum++;
        setImagesResult({ inProgress: true, batch: batchNum, imagesUpdated: totalUpdated, totalProcessed });
        const result = await callBolcomApi("fetchImages", { companyId, batchLimit: 60 });
        if (!result.success) throw new Error(result.error);
        totalFound += result.data.imagesFound || 0;
        totalUpdated += result.data.imagesUpdated || 0;
        totalErrors += result.data.fetchErrors || 0;
        totalProcessed += result.data.productsProcessed || 0;
        // If no more products to process, we're done
        if ((result.data.remaining || 0) === 0 || result.data.productsProcessed === 0) break;
        toast.info(`Batch ${batchNum} done: ${totalUpdated} images so far, ${result.data.remaining} remaining...`);
      }
      setImagesResult({ imagesFound: totalFound, imagesUpdated: totalUpdated, fetchErrors: totalErrors, totalProcessed });
      toast.success(`Updated images for ${totalUpdated} products (${totalProcessed} processed)`);
    } catch (err) {
      toast.error(err.message || "Failed to fetch images");
      setImagesResult({ error: err.message, imagesUpdated: totalUpdated, totalProcessed });
    } finally {
      setFetchingImages(false);
    }
  };

  // Sync stock from bol.com inventory
  const handleSyncStock = async () => {
    if (!companyId) { toast.error("No company linked to your account."); return; }
    setSyncingStock(true);
    setStockResult(null);
    try {
      const result = await callBolcomApi("fetchStock", { companyId });
      if (!result.success) throw new Error(result.error);
      setStockResult(result.data);
      toast.success(`Synced stock for ${result.data.synced} products (${result.data.withStock} with stock)`);
    } catch (err) {
      toast.error(err.message || "Failed to sync stock");
      setStockResult({ error: err.message });
    } finally {
      setSyncingStock(false);
    }
  };

  // Compare stock
  const handleCompareStock = async () => {
    setLoadingStock(true);
    setShowStock(true);
    try {
      const result = await callBolcomApi("syncStock", { companyId });
      if (!result.success) throw new Error(result.error);
      setStockData(result.data);
    } catch (err) {
      toast.error(err.message || "Failed to compare stock");
    } finally {
      setLoadingStock(false);
    }
  };

  // Load replenishment history
  const handleLoadHistory = async () => {
    setLoadingHistory(true);
    setShowHistory(true);
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_code, bol_replenishment_id, bol_replenishment_state, bol_labels_url, created_at, total_pallets, total_items")
        .eq("company_id", companyId)
        .not("bol_replenishment_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setRepHistory(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // CSV file handling
  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvResult(null);
    Papa.parse(file, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvPreview({ headers: results.meta.fields || [], rows: results.data });
      },
      error: () => {
        toast.error("Failed to parse CSV file");
        setCsvFile(null);
      },
    });
  };

  const handleCsvImport = async () => {
    if (!csvFile || !companyId) return;
    setImportingCsv(true);
    setCsvResult(null);
    try {
      const text = await csvFile.text();
      // Detect analytics format vs order-level format by checking headers
      const firstLine = text.split("\n")[0].toLowerCase();
      const isAnalytics = firstLine.includes("bestellingen") && firstLine.includes("ean") && firstLine.includes("klantbezoeken");

      // Extract period from filename (bolcom_ID_YYYY-MM-DD_YYYY-MM-DD.csv)
      const dateMatch = csvFile.name.match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
      const periodStart = dateMatch ? dateMatch[1] : "2025-11-01";
      const periodEnd = dateMatch ? dateMatch[2] : "2026-02-24";

      const action = isAnalytics ? "importAnalytics" : "importOrders";
      const params = isAnalytics
        ? { companyId, csvData: text, periodStart, periodEnd }
        : { companyId, csvData: text };

      const res = await callBolcomApi(action, params);
      if (!res.success) throw new Error(res.error);
      setCsvResult(res.data);
      toast.success(`Imported ${res.data.imported} orders (${res.data.skipped} skipped)`);
    } catch (err) {
      toast.error(err.message || "CSV import failed");
      setCsvResult({ error: err.message });
    } finally {
      setImportingCsv(false);
    }
  };

  const cardClass = `rounded-xl p-5 ${t("bg-white border border-gray-200", "bg-zinc-900/60 border border-zinc-800")}`;
  const labelClass = `block text-sm font-medium mb-1 ${t("text-gray-700", "text-zinc-300")}`;
  const mutedClass = t("text-gray-500", "text-zinc-500");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
          <ShoppingBag className="w-5 h-5 text-cyan-400" />
          bol.com Integration
        </h2>
        <p className={`text-sm mt-1 ${mutedClass}`}>
          Manage your bol.com Retailer API connection, EAN mappings, and stock sync.
        </p>
      </div>

      {/* 1. Credentials */}
      <div className={cardClass}>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
          <Key className="w-4 h-4 text-cyan-400" />
          API Credentials
        </h3>

        {/* Connection status */}
        {hasCreds && (
          <div className={`flex items-center gap-2 mb-4 p-2.5 rounded-lg ${
            connectionStatus === "connected"
              ? "bg-green-500/10 border border-green-500/20"
              : connectionStatus === "error"
                ? "bg-red-500/10 border border-red-500/20"
                : t("bg-gray-50 border border-gray-200", "bg-zinc-800/50 border border-zinc-700")
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected" ? "bg-green-400" : connectionStatus === "error" ? "bg-red-400" : "bg-zinc-500"
            }`} />
            <span className={`text-sm ${
              connectionStatus === "connected" ? "text-green-400" : connectionStatus === "error" ? "text-red-400" : mutedClass
            }`}>
              {connectionStatus === "connected" ? "Connected" : connectionStatus === "error" ? "Connection failed" : "Credentials saved — not tested yet"}
            </span>
            {connectionError && (
              <span className="text-xs text-red-400 ml-2 truncate">{connectionError}</span>
            )}
          </div>
        )}

        {/* Input fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Client ID</label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={hasCreds ? "••••••••••••" : "Enter Client ID"}
              className={t("bg-white border-gray-300", "bg-zinc-900 border-zinc-700")}
            />
          </div>
          <div>
            <label className={labelClass}>Client Secret</label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={hasCreds ? "••••••••••••" : "Enter Client Secret"}
                className={`pr-10 ${t("bg-white border-gray-300", "bg-zinc-900 border-zinc-700")}`}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${mutedClass}`}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveCredentials}
            disabled={savingCreds || (!clientId && !clientSecret)}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
          >
            {savingCreds ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
            Save Credentials
          </Button>
          {hasCreds && (
            <Button
              onClick={handleTestConnection}
              disabled={testingConnection}
              variant="outline"
              size="sm"
              className={`gap-1 ${t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}`}
            >
              {testingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Test Connection
            </Button>
          )}
        </div>
      </div>

      {/* Import Historical Orders (CSV) */}
      {hasCreds && (
        <div className={cardClass}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            Import Historical Orders
          </h3>
          <p className={`text-sm mb-4 ${mutedClass}`}>
            Upload a CSV export from your bol.com seller dashboard to import historical orders beyond the 3-month API limit.
          </p>

          <div className="flex items-center gap-3 mb-3">
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm ${t("border-gray-300 hover:bg-gray-50 text-gray-700", "border-zinc-700 hover:bg-zinc-800 text-zinc-300")}`}>
              <Upload className="w-3.5 h-3.5" />
              {csvFile ? csvFile.name : "Choose CSV file"}
              <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleCsvFileChange} />
            </label>
            {csvFile && (
              <Button
                onClick={handleCsvImport}
                disabled={importingCsv}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
              >
                {importingCsv ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {importingCsv ? "Importing..." : "Import Orders"}
              </Button>
            )}
            {csvFile && !importingCsv && (
              <button onClick={() => { setCsvFile(null); setCsvPreview(null); setCsvResult(null); }} className={`text-xs ${mutedClass} hover:text-red-400`}>Clear</button>
            )}
          </div>

          {/* CSV Preview */}
          {csvPreview && !csvResult && (
            <div className={`rounded-lg overflow-hidden border ${t("border-gray-200", "border-zinc-800")}`}>
              <div className={`px-3 py-1.5 text-xs font-medium ${t("bg-gray-50 text-gray-600", "bg-zinc-800/80 text-zinc-400")}`}>
                Preview — {csvPreview.headers.length} columns, showing first {csvPreview.rows.length} rows
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={t("bg-gray-50", "bg-zinc-900/50")}>
                      {csvPreview.headers.map((h, i) => (
                        <th key={i} className={`px-2 py-1 text-left font-medium ${mutedClass}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, i) => (
                      <tr key={i} className={t("border-t border-gray-100", "border-t border-zinc-800/50")}>
                        {csvPreview.headers.map((h, j) => (
                          <td key={j} className={`px-2 py-1 ${t("text-gray-700", "text-zinc-300")} max-w-[200px] truncate`}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Results */}
          {csvResult && !csvResult.error && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className="text-2xl font-bold text-cyan-400">{csvResult.imported}</p>
                <p className={`text-xs ${mutedClass}`}>Imported</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{csvResult.skipped}</p>
                <p className={`text-xs ${mutedClass}`}>Duplicates Skipped</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{csvResult.itemsImported || 0}</p>
                <p className={`text-xs ${mutedClass}`}>Items</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${csvResult.insertErrors > 0 ? "bg-red-500/10" : t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${csvResult.insertErrors > 0 ? "text-red-400" : t("text-gray-900", "text-white")}`}>{csvResult.insertErrors || 0}</p>
                <p className={`text-xs ${mutedClass}`}>Errors</p>
              </div>
            </div>
          )}
          {csvResult?.error && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {csvResult.error}
            </div>
          )}
        </div>
      )}

      {/* 2. Import Products */}
      {hasCreds && connectionStatus === "connected" && (
        <div className={cardClass}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
            <Download className="w-4 h-4 text-cyan-400" />
            Import Products from bol.com
          </h3>
          <p className={`text-sm mb-4 ${mutedClass}`}>
            Pull your entire bol.com catalog into SYNC. This will fetch product titles, images, categories, stock levels, and EAN codes.
          </p>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleImportProducts}
              disabled={importing || fetchingPricing || fetchingImages || syncingStock}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
            >
              {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {importing ? "Importing..." : "Import Products"}
            </Button>
            <Button
              onClick={handleFetchPricing}
              disabled={fetchingPricing || importing || fetchingImages || syncingStock}
              size="sm"
              variant="outline"
              className="gap-1 border-cyan-600/40 text-cyan-400 hover:bg-cyan-600/10"
            >
              {fetchingPricing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {fetchingPricing ? "Fetching Pricing..." : "Fetch Pricing"}
            </Button>
            <Button
              onClick={handleFetchImages}
              disabled={fetchingImages || importing || fetchingPricing || syncingStock}
              size="sm"
              variant="outline"
              className="gap-1 border-cyan-600/40 text-cyan-400 hover:bg-cyan-600/10"
            >
              {fetchingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {fetchingImages ? "Fetching Images..." : "Fetch Images"}
            </Button>
            <Button
              onClick={handleSyncStock}
              disabled={syncingStock || importing || fetchingPricing || fetchingImages}
              size="sm"
              variant="outline"
              className="gap-1 border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
            >
              {syncingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
              {syncingStock ? "Syncing Stock..." : "Sync Stock"}
            </Button>
          </div>

          {importing && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${t("bg-gray-50", "bg-zinc-800/50")}`}>
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className={`text-sm ${mutedClass}`}>
                Fetching inventory and enriching products from bol.com... This may take a few moments depending on catalog size.
              </span>
            </div>
          )}

          {importResult && !importResult.error && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold text-cyan-400`}>{importResult.imported}</p>
                  <p className={`text-xs ${mutedClass}`}>Imported</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{importResult.updated}</p>
                  <p className={`text-xs ${mutedClass}`}>Updated</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${importResult.errors > 0 ? "bg-red-500/10" : t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${importResult.errors > 0 ? "text-red-400" : t("text-gray-900", "text-white")}`}>{importResult.errors}</p>
                  <p className={`text-xs ${mutedClass}`}>Errors</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{importResult.total}</p>
                  <p className={`text-xs ${mutedClass}`}>Total</p>
                </div>
              </div>

              {importResult.message && (
                <p className={`text-sm ${mutedClass}`}>{importResult.message}</p>
              )}
            </div>
          )}

          {importResult?.error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {importResult.error}
              </p>
            </div>
          )}

          {fetchingPricing && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${t("bg-gray-50", "bg-zinc-800/50")}`}>
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className={`text-sm ${mutedClass}`}>
                Exporting offers from bol.com and fetching pricing data... This may take up to 90 seconds.
              </span>
            </div>
          )}

          {pricingResult && !pricingResult.error && (
            <div className="mt-4 space-y-3">
              <p className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>Pricing Update Results</p>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className="text-2xl font-bold text-cyan-400">{pricingResult.offersFound}</p>
                  <p className={`text-xs ${mutedClass}`}>Offers Found</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{pricingResult.pricesUpdated}</p>
                  <p className={`text-xs ${mutedClass}`}>Prices Updated</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{pricingResult.offersLinked}</p>
                  <p className={`text-xs ${mutedClass}`}>Offers Linked</p>
                </div>
              </div>
            </div>
          )}

          {pricingResult?.error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {pricingResult.error}
              </p>
            </div>
          )}

          {fetchingImages && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${t("bg-gray-50", "bg-zinc-800/50")}`}>
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className={`text-sm ${mutedClass}`}>
                {imagesResult?.inProgress
                  ? `Batch ${imagesResult.batch}: ${imagesResult.imagesUpdated} images updated, ${imagesResult.totalProcessed} processed so far...`
                  : "Fetching product images from bol.com..."}
              </span>
            </div>
          )}

          {imagesResult && !imagesResult.error && !imagesResult.inProgress && (
            <div className="mt-4 space-y-3">
              <p className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>Image Fetch Results</p>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className="text-2xl font-bold text-cyan-400">{imagesResult.imagesFound}</p>
                  <p className={`text-xs ${mutedClass}`}>Images Found</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{imagesResult.imagesUpdated}</p>
                  <p className={`text-xs ${mutedClass}`}>Products Updated</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{imagesResult.totalProcessed}</p>
                  <p className={`text-xs ${mutedClass}`}>Processed</p>
                </div>
              </div>
            </div>
          )}

          {imagesResult?.error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {imagesResult.error}
              </p>
            </div>
          )}

          {syncingStock && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${t("bg-gray-50", "bg-zinc-800/50")}`}>
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              <span className={`text-sm ${mutedClass}`}>
                Syncing stock levels from bol.com inventory...
              </span>
            </div>
          )}

          {stockResult && !stockResult.error && (
            <div className="mt-4 space-y-3">
              <p className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>Stock Sync Results</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className="text-2xl font-bold text-cyan-400">{stockResult.synced}</p>
                  <p className={`text-xs ${mutedClass}`}>Products Synced</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stockResult.withStock}</p>
                  <p className={`text-xs ${mutedClass}`}>With Stock</p>
                </div>
                <div className={`p-3 rounded-lg text-center bg-orange-500/10`}>
                  <p className="text-2xl font-bold text-orange-400">{stockResult.fbb}</p>
                  <p className={`text-xs ${mutedClass}`}>FBB (bol.com Warehouse)</p>
                </div>
                <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                  <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stockResult.fbr}</p>
                  <p className={`text-xs ${mutedClass}`}>FBR (Own Warehouse)</p>
                </div>
              </div>
            </div>
          )}

          {stockResult?.error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {stockResult.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. EAN Mappings */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
            <Package className="w-4 h-4 text-cyan-400" />
            EAN-to-Product Mappings
            <Badge variant="secondary" className="text-xs">{mappings.length}</Badge>
          </h3>
          <Button
            onClick={loadMappings}
            disabled={loadingMappings}
            variant="ghost"
            size="sm"
            className={`gap-1 ${mutedClass}`}
          >
            {loadingMappings ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
        </div>

        {mappings.length === 0 ? (
          <p className={`text-sm ${mutedClass}`}>
            No EAN mappings yet. Mappings will be auto-created when you sync offers from bol.com.
          </p>
        ) : (
          <div className={`rounded-lg border overflow-hidden ${t("border-gray-200", "border-zinc-800")}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={t("bg-gray-50", "bg-zinc-900")}>
                  <th className={`px-3 py-2 text-left ${mutedClass}`}>EAN</th>
                  <th className={`px-3 py-2 text-left ${mutedClass}`}>Product</th>
                  <th className={`px-3 py-2 text-left ${mutedClass}`}>Offer ID</th>
                  <th className={`px-3 py-2 text-right ${mutedClass}`}>bol.com Stock</th>
                  <th className={`px-3 py-2 text-center ${mutedClass}`}>Active</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className={t("border-t border-gray-100", "border-t border-zinc-800/50")}>
                    <td className={`px-3 py-1.5 font-mono ${t("text-gray-700", "text-zinc-300")}`}>{m.ean}</td>
                    <td className={`px-3 py-1.5 ${t("text-gray-600", "text-zinc-400")}`}>
                      {m.products?.name || "—"} {m.products?.sku && <span className={`text-xs ${mutedClass}`}>({m.products.sku})</span>}
                    </td>
                    <td className={`px-3 py-1.5 font-mono text-xs ${mutedClass}`}>{m.bolcom_offer_id || "—"}</td>
                    <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>{m.bolcom_stock_amount ?? "—"}</td>
                    <td className="px-3 py-1.5 text-center">
                      {m.is_active ? <Check className="w-3 h-3 text-green-400 mx-auto" /> : <X className="w-3 h-3 text-red-400 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Inventory Comparison */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            Inventory Comparison
          </h3>
          <Button
            onClick={handleCompareStock}
            disabled={loadingStock || !hasCreds}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
          >
            {loadingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
            Compare Stock
          </Button>
        </div>

        {showStock && stockData && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stockData.inSync?.length || 0}</p>
                <p className={`text-xs ${mutedClass}`}>In Sync</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${stockData.outOfSync?.length > 0 ? "bg-amber-500/10" : t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${stockData.outOfSync?.length > 0 ? "text-amber-400" : t("text-gray-900", "text-white")}`}>{stockData.outOfSync?.length || 0}</p>
                <p className={`text-xs ${mutedClass}`}>Out of Sync</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stockData.bolOnly?.length || 0}</p>
                <p className={`text-xs ${mutedClass}`}>bol.com Only</p>
              </div>
              <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stockData.localOnly?.length || 0}</p>
                <p className={`text-xs ${mutedClass}`}>Local Only</p>
              </div>
            </div>

            {stockData.outOfSync?.length > 0 && (
              <div className={`rounded-lg border overflow-hidden ${t("border-gray-200", "border-zinc-800")}`}>
                <div className={`px-3 py-2 text-xs font-medium ${t("bg-amber-50 text-amber-700", "bg-amber-500/10 text-amber-400")}`}>
                  <AlertTriangle className="w-3 h-3 inline mr-1" /> Out of Sync Items
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={t("bg-gray-50", "bg-zinc-900")}>
                      <th className={`px-3 py-2 text-left ${mutedClass}`}>EAN</th>
                      <th className={`px-3 py-2 text-right ${mutedClass}`}>Local</th>
                      <th className={`px-3 py-2 text-right ${mutedClass}`}>bol.com</th>
                      <th className={`px-3 py-2 text-right ${mutedClass}`}>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.outOfSync.map((item, i) => (
                      <tr key={i} className={t("border-t border-gray-100", "border-t border-zinc-800/50")}>
                        <td className={`px-3 py-1.5 font-mono ${t("text-gray-700", "text-zinc-300")}`}>{item.ean}</td>
                        <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>{item.localQty}</td>
                        <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>{item.bolQty}</td>
                        <td className={`px-3 py-1.5 text-right font-medium ${item.diff > 0 ? "text-green-400" : "text-red-400"}`}>
                          {item.diff > 0 ? "+" : ""}{item.diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showStock && !stockData && !loadingStock && (
          <p className={`text-sm ${mutedClass}`}>No stock data available.</p>
        )}
      </div>

      {/* 4. Replenishment History */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
            <Truck className="w-4 h-4 text-cyan-400" />
            Replenishment History
          </h3>
          <Button
            onClick={handleLoadHistory}
            disabled={loadingHistory}
            variant="outline"
            size="sm"
            className={`gap-1 ${t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}`}
          >
            {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showHistory ? "Collapse" : "Show History"}
          </Button>
        </div>

        {showHistory && (
          repHistory.length === 0 ? (
            <p className={`text-sm ${mutedClass}`}>No replenishments sent to bol.com yet.</p>
          ) : (
            <div className="space-y-2">
              {repHistory.map((s) => (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg ${t("bg-gray-50", "bg-zinc-800/40")}`}>
                  <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>
                      {s.shipment_code}
                    </p>
                    <p className={`text-xs ${mutedClass}`}>
                      {s.total_pallets} pallets, {s.total_items} items — {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${
                    s.bol_replenishment_state === "ARRIVED" ? "border-green-500/30 text-green-400"
                      : s.bol_replenishment_state === "IN_TRANSIT" ? "border-amber-500/30 text-amber-400"
                        : "border-blue-500/30 text-blue-400"
                  }`}>
                    {s.bol_replenishment_state || "CREATED"}
                  </Badge>
                  {s.bol_labels_url && (
                    <a href={s.bol_labels_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
