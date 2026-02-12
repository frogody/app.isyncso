/**
 * ShopifySettings — Shopify integration settings panel (SH-16)
 *
 * Sections:
 * 1. Connection — OAuth connect/disconnect, test connection
 * 2. Product Mappings — shopify_product_mappings table
 * 3. Inventory Comparison — compare local vs Shopify stock
 * 4. Order Settings — auto-import, auto-fulfill toggles
 * 5. Webhook Status — 8 registered topics
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  Store, Key, RefreshCw, Check, X, AlertTriangle,
  Loader2, ArrowRightLeft, Package, Link2, Unlink,
  ChevronDown, ChevronUp, ShoppingCart, Webhook, Globe,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/api/supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callShopifyApi(action, params) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/shopify-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  return response.json();
}

const WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/cancelled",
  "inventory_levels/update",
  "products/update",
  "products/delete",
  "refunds/create",
  "app/uninstalled",
];

export default function ShopifySettings() {
  const { t } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id;

  // Connection
  const [shopDomain, setShopDomain] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'connected' | 'error'
  const [connectionError, setConnectionError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Product mappings
  const [mappings, setMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Stock comparison
  const [stockData, setStockData] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [showStock, setShowStock] = useState(false);

  // Order settings
  const [autoSyncOrders, setAutoSyncOrders] = useState(false);
  const [autoFulfill, setAutoFulfill] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Webhooks
  const [showWebhooks, setShowWebhooks] = useState(false);

  // Check if credentials exist
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("shopify_credentials")
        .select("id, shop_domain, is_active, auto_sync_orders, auto_fulfill, webhook_ids, last_sync_at, last_error")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        setCredentials(data);
        setConnectionStatus("connected");
        setAutoSyncOrders(data.auto_sync_orders || false);
        setAutoFulfill(data.auto_fulfill || false);
        if (data.last_error) {
          setConnectionError(data.last_error);
        }
      }
    })();
  }, [companyId]);

  // Load product mappings
  const loadMappings = useCallback(async () => {
    if (!companyId) return;
    setLoadingMappings(true);
    try {
      const { data, error } = await supabase
        .from("shopify_product_mappings")
        .select("*, products(id, name, sku, ean)")
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

  useEffect(() => {
    if (credentials) loadMappings();
  }, [credentials, loadMappings]);

  // Initiate OAuth
  const handleConnect = async () => {
    const domain = shopDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!domain || !domain.includes(".myshopify.com")) {
      toast.error("Enter a valid Shopify store domain (e.g. yourstore.myshopify.com)");
      return;
    }
    setConnecting(true);
    try {
      const result = await callShopifyApi("initiateOAuth", { companyId, shopDomain: domain });
      if (!result.success) throw new Error(result.error);

      // Open OAuth popup
      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        result.data.authUrl,
        "shopify-oauth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      // Poll for popup close / callback completion
      const pollInterval = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          // Check if credentials were saved
          const { data } = await supabase
            .from("shopify_credentials")
            .select("id, shop_domain, is_active, auto_sync_orders, auto_fulfill, webhook_ids, last_error")
            .eq("company_id", companyId)
            .eq("is_active", true)
            .maybeSingle();
          if (data) {
            setCredentials(data);
            setConnectionStatus("connected");
            setAutoSyncOrders(data.auto_sync_orders || false);
            setAutoFulfill(data.auto_fulfill || false);
            toast.success("Connected to Shopify successfully!");
          }
          setConnecting(false);
        }
      }, 1000);
    } catch (err) {
      toast.error(err.message || "Failed to initiate OAuth");
      setConnecting(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionError("");
    try {
      const result = await callShopifyApi("testConnection", { companyId });
      if (!result.success) throw new Error(result.error);
      setConnectionStatus("connected");
      toast.success("Shopify connection is active");
    } catch (err) {
      setConnectionStatus("error");
      setConnectionError(err.message || "Connection failed");
      toast.error(err.message || "Connection failed");
    } finally {
      setTestingConnection(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect from Shopify? This will remove all webhooks and deactivate product mappings.")) return;
    setDisconnecting(true);
    try {
      const result = await callShopifyApi("disconnect", { companyId });
      if (!result.success) throw new Error(result.error);
      setCredentials(null);
      setConnectionStatus(null);
      setMappings([]);
      setStockData(null);
      toast.success("Disconnected from Shopify");
    } catch (err) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  // Sync products
  const handleSyncProducts = async () => {
    setSyncing(true);
    try {
      const result = await callShopifyApi("syncProducts", { companyId });
      if (!result.success) throw new Error(result.error);
      toast.success(`Synced: ${result.data.mapped || 0} mapped, ${result.data.unmapped || 0} unmapped`);
      loadMappings();
    } catch (err) {
      toast.error(err.message || "Failed to sync products");
    } finally {
      setSyncing(false);
    }
  };

  // Compare stock
  const handleCompareStock = async () => {
    setLoadingStock(true);
    setShowStock(true);
    try {
      const result = await callShopifyApi("getInventoryLevels", { companyId });
      if (!result.success) throw new Error(result.error);

      // Compare local vs Shopify
      const inSync = [];
      const outOfSync = [];
      const shopifyOnly = [];
      const localOnly = [];

      for (const m of mappings) {
        const shopifyLevel = result.data?.levels?.find(
          (l) => l.inventory_item_id === m.shopify_inventory_item_id
        );
        if (!shopifyLevel) {
          localOnly.push(m);
          continue;
        }

        const { data: inv } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("product_id", m.product_id)
          .eq("company_id", companyId)
          .maybeSingle();

        const localQty = inv?.quantity || 0;
        const shopifyQty = shopifyLevel.available || 0;

        if (localQty === shopifyQty) {
          inSync.push({ ...m, localQty, shopifyQty });
        } else {
          outOfSync.push({ ...m, localQty, shopifyQty, diff: localQty - shopifyQty });
        }
      }

      setStockData({ inSync, outOfSync, shopifyOnly, localOnly });
    } catch (err) {
      toast.error(err.message || "Failed to compare stock");
    } finally {
      setLoadingStock(false);
    }
  };

  // Save order settings
  const handleSaveSettings = async () => {
    if (!credentials) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("shopify_credentials")
        .update({
          auto_sync_orders: autoSyncOrders,
          auto_fulfill: autoFulfill,
          updated_at: new Date().toISOString(),
        })
        .eq("id", credentials.id);
      if (error) throw error;
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const cardClass = `rounded-xl p-5 ${t("bg-white border border-gray-200", "bg-zinc-900/60 border border-zinc-800")}`;
  const labelClass = `block text-sm font-medium mb-1 ${t("text-gray-700", "text-zinc-300")}`;
  const mutedClass = t("text-gray-500", "text-zinc-500");

  const webhookIds = credentials?.webhook_ids || {};
  const registeredTopics = Object.keys(webhookIds);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
          <Store className="w-5 h-5 text-cyan-400" />
          Shopify Integration
        </h2>
        <p className={`text-sm mt-1 ${mutedClass}`}>
          Connect your Shopify store for bi-directional product sync, inventory management, and order import.
        </p>
      </div>

      {/* 1. Connection */}
      <div className={cardClass}>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
          <Link2 className="w-4 h-4 text-cyan-400" />
          Store Connection
        </h3>

        {/* Connection status */}
        {credentials && (
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
              {connectionStatus === "connected"
                ? `Connected to ${credentials.shop_domain}`
                : connectionStatus === "error"
                  ? "Connection error"
                  : "Checking connection..."}
            </span>
            {connectionError && (
              <span className="text-xs text-red-400 ml-2 truncate">{connectionError}</span>
            )}
          </div>
        )}

        {/* Connect or manage */}
        {!credentials ? (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Shop Domain</label>
              <Input
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="yourstore.myshopify.com"
                className={t("bg-white border-gray-300", "bg-zinc-900 border-zinc-700")}
              />
              <p className={`text-xs mt-1 ${mutedClass}`}>
                Enter your Shopify store domain (e.g. yourstore.myshopify.com)
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting || !shopDomain.trim()}
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
            >
              {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
              Connect to Shopify
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
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
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="outline"
              size="sm"
              className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
              Disconnect
            </Button>
            {credentials.last_sync_at && (
              <span className={`text-xs ${mutedClass}`}>
                Last synced: {new Date(credentials.last_sync_at).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Only show remaining sections when connected */}
      {credentials && (
        <>
          {/* 2. Product Mappings */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
                <Package className="w-4 h-4 text-cyan-400" />
                Product Mappings
                <Badge variant="secondary" className="text-xs">{mappings.length}</Badge>
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSyncProducts}
                  disabled={syncing}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
                >
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Sync Products
                </Button>
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
            </div>

            {mappings.length === 0 ? (
              <p className={`text-sm ${mutedClass}`}>
                No product mappings yet. Click "Sync Products" to match Shopify products with your local inventory by EAN or SKU.
              </p>
            ) : (
              <div className={`rounded-lg border overflow-hidden ${t("border-gray-200", "border-zinc-800")}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className={t("bg-gray-50", "bg-zinc-900")}>
                      <th className={`px-3 py-2 text-left ${mutedClass}`}>Shopify Product</th>
                      <th className={`px-3 py-2 text-left ${mutedClass}`}>Local Product</th>
                      <th className={`px-3 py-2 text-left ${mutedClass}`}>Matched By</th>
                      <th className={`px-3 py-2 text-right ${mutedClass}`}>Shopify Stock</th>
                      <th className={`px-3 py-2 text-center ${mutedClass}`}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id} className={t("border-t border-gray-100", "border-t border-zinc-800/50")}>
                        <td className={`px-3 py-1.5 ${t("text-gray-700", "text-zinc-300")}`}>
                          {m.shopify_product_title || "—"}
                        </td>
                        <td className={`px-3 py-1.5 ${t("text-gray-600", "text-zinc-400")}`}>
                          {m.products?.name || "—"}{" "}
                          {m.products?.sku && (
                            <span className={`text-xs ${mutedClass}`}>({m.products.sku})</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge variant="outline" className={`text-xs ${
                            m.matched_by === "ean"
                              ? "border-green-500/30 text-green-400"
                              : m.matched_by === "sku"
                                ? "border-blue-500/30 text-blue-400"
                                : "border-zinc-500/30 text-zinc-400"
                          }`}>
                            {m.matched_by || "—"}
                          </Badge>
                        </td>
                        <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>
                          {m.shopify_stock_level ?? "—"}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {m.is_active ? (
                            <Check className="w-3 h-3 text-green-400 mx-auto" />
                          ) : (
                            <X className="w-3 h-3 text-red-400 mx-auto" />
                          )}
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
                disabled={loadingStock || mappings.length === 0}
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
                    <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>
                      {stockData.inSync?.length || 0}
                    </p>
                    <p className={`text-xs ${mutedClass}`}>In Sync</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${stockData.outOfSync?.length > 0 ? "bg-amber-500/10" : t("bg-gray-50", "bg-zinc-800/50")}`}>
                    <p className={`text-2xl font-bold ${stockData.outOfSync?.length > 0 ? "text-amber-400" : t("text-gray-900", "text-white")}`}>
                      {stockData.outOfSync?.length || 0}
                    </p>
                    <p className={`text-xs ${mutedClass}`}>Out of Sync</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                    <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>
                      {stockData.shopifyOnly?.length || 0}
                    </p>
                    <p className={`text-xs ${mutedClass}`}>Shopify Only</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${t("bg-gray-50", "bg-zinc-800/50")}`}>
                    <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>
                      {stockData.localOnly?.length || 0}
                    </p>
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
                          <th className={`px-3 py-2 text-left ${mutedClass}`}>Product</th>
                          <th className={`px-3 py-2 text-right ${mutedClass}`}>Local</th>
                          <th className={`px-3 py-2 text-right ${mutedClass}`}>Shopify</th>
                          <th className={`px-3 py-2 text-right ${mutedClass}`}>Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockData.outOfSync.map((item, i) => (
                          <tr key={i} className={t("border-t border-gray-100", "border-t border-zinc-800/50")}>
                            <td className={`px-3 py-1.5 ${t("text-gray-700", "text-zinc-300")}`}>
                              {item.shopify_product_title || item.products?.name || "—"}
                            </td>
                            <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>{item.localQty}</td>
                            <td className={`px-3 py-1.5 text-right ${t("text-gray-900", "text-white")}`}>{item.shopifyQty}</td>
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

          {/* 4. Order Settings */}
          <div className={cardClass}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              Order Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>
                    Auto-Import Orders
                  </p>
                  <p className={`text-xs ${mutedClass}`}>
                    Automatically import new Shopify orders as sales orders
                  </p>
                </div>
                <Switch
                  checked={autoSyncOrders}
                  onCheckedChange={setAutoSyncOrders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${t("text-gray-700", "text-zinc-300")}`}>
                    Auto-Fulfill on Ship
                  </p>
                  <p className={`text-xs ${mutedClass}`}>
                    Automatically push fulfillment to Shopify when you complete shipping
                  </p>
                </div>
                <Switch
                  checked={autoFulfill}
                  onCheckedChange={setAutoFulfill}
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1"
              >
                {savingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <SettingsIcon className="w-3 h-3" />}
                Save Settings
              </Button>
            </div>
          </div>

          {/* 5. Webhook Status */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${t("text-gray-900", "text-white")}`}>
                <Webhook className="w-4 h-4 text-cyan-400" />
                Webhook Status
              </h3>
              <Button
                onClick={() => setShowWebhooks(!showWebhooks)}
                variant="outline"
                size="sm"
                className={`gap-1 ${t("border-gray-200 text-gray-700", "border-zinc-700 text-zinc-300")}`}
              >
                {showWebhooks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showWebhooks ? "Hide" : "Show"}
              </Button>
            </div>

            {showWebhooks && (
              <div className="space-y-2">
                {WEBHOOK_TOPICS.map((topic) => {
                  const isRegistered = registeredTopics.includes(topic);
                  return (
                    <div
                      key={topic}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${t("bg-gray-50", "bg-zinc-800/40")}`}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className={`w-3.5 h-3.5 ${isRegistered ? "text-green-400" : "text-zinc-500"}`} />
                        <span className={`text-sm font-mono ${t("text-gray-700", "text-zinc-300")}`}>
                          {topic}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          isRegistered
                            ? "border-green-500/30 text-green-400"
                            : "border-zinc-500/30 text-zinc-500"
                        }`}
                      >
                        {isRegistered ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
