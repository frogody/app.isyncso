import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
  BarChart3,
  CheckCircle2,
  XCircle,
  Unplug,
  RefreshCw,
  AlertTriangle,
  Key,
  CloudCog,
  Loader2,
  ExternalLink,
  Clock,
  Shield,
  Info,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SOCIAL_PLATFORMS } from "@/lib/reach-constants";

// ---------------------------------------------------------------------------
// Icon mapping for platform icons (Lucide)
// ---------------------------------------------------------------------------
const PLATFORM_ICON_MAP = {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
  BarChart3,
};

// ---------------------------------------------------------------------------
// API key definitions
// ---------------------------------------------------------------------------
const API_KEYS = [
  {
    id: "NANOBANANA_API_KEY",
    name: "NanoBanana API Key",
    description: "Required for AI-powered marketing image generation",
    icon: "image",
  },
  {
    id: "RUNWAY_API_KEY",
    name: "Runway API Key",
    description: "Required for AI video generation and editing",
    icon: "video",
  },
  {
    id: "ANTHROPIC_API_KEY",
    name: "Anthropic API Key",
    description: "Powers AI copy generation, insights, and brand voice analysis",
    icon: "ai",
  },
];

// ---------------------------------------------------------------------------
// Platform connection card
// ---------------------------------------------------------------------------
function PlatformCard({ platformKey, platform, connection, onConnect, onDisconnect, disconnecting }) {
  const IconComponent = PLATFORM_ICON_MAP[platform.icon] || BarChart3;
  const isConnected = !!connection;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Platform icon with brand color */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: platform.color + "1A" }}
          >
            <IconComponent className="w-6 h-6" style={{ color: platform.color }} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">{platform.name}</h3>
            {isConnected ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-zinc-400">
                  {connection.account_name || "Connected account"}
                </span>
                <Badge variant="info" size="xs">Connected</Badge>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mt-0.5">Not connected</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && connection.last_synced_at && (
            <span className="text-xs text-zinc-500 hidden sm:block">
              Synced {new Date(connection.last_synced_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}

          {isConnected ? (
            <button
              onClick={() => onDisconnect(connection.id, platformKey)}
              disabled={disconnecting === connection.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors disabled:opacity-50"
            >
              {disconnecting === connection.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => onConnect(platformKey)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// OAuth setup banner
// ---------------------------------------------------------------------------
function OAuthBanner({ platformName, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-300 mb-1">
            OAuth Configuration Required
          </h4>
          <p className="text-sm text-amber-300/70 leading-relaxed">
            To connect <span className="font-medium text-amber-200">{platformName}</span>,
            you need to configure OAuth credentials in your Supabase project secrets. This
            requires creating a developer app on the platform and adding the client ID and
            secret to your environment.
          </p>
          <p className="text-sm text-amber-300/70 mt-2">
            See <code className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs">
            REACH_SETUP_NOTES.md</code> for step-by-step instructions.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-amber-400/60 hover:text-amber-400 transition-colors p-1"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// API key status card
// ---------------------------------------------------------------------------
function ApiKeyCard({ apiKey, index }) {
  // We cannot verify keys from the frontend (they are in Supabase secrets).
  // Show informational status.
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-zinc-800">
          <Key className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{apiKey.name}</h3>
          <p className="text-sm text-zinc-500 mt-0.5">{apiKey.description}</p>
        </div>
        <Badge variant="outline" size="sm" className="text-zinc-500 border-zinc-700 shrink-0">
          Managed via Secrets
        </Badge>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ReachSettings() {
  const { user } = useUser();
  const companyId = user?.company_id;

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(null);
  const [connectBanner, setConnectBanner] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  // -------------------------------------------------------------------------
  // Fetch connections
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reach_social_connections")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setConnections(data || []);

        // Find the most recent sync
        const latestSync = (data || [])
          .filter((c) => c.metadata?.last_synced_at)
          .sort((a, b) =>
            new Date(b.metadata.last_synced_at) - new Date(a.metadata.last_synced_at)
          )[0];
        if (latestSync) setLastSyncAt(latestSync.metadata.last_synced_at);
      } catch (err) {
        console.error("Failed to load connections:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  // -------------------------------------------------------------------------
  // Connection map by platform key
  // -------------------------------------------------------------------------
  const connectionMap = {};
  for (const conn of connections) {
    if (conn.is_active) {
      connectionMap[conn.platform] = conn;
    }
  }

  // -------------------------------------------------------------------------
  // Connect handler (show banner)
  // -------------------------------------------------------------------------
  const handleConnect = useCallback((platformKey) => {
    const platform = SOCIAL_PLATFORMS[platformKey];
    setConnectBanner(platform?.name || platformKey);
  }, []);

  // -------------------------------------------------------------------------
  // Disconnect handler
  // -------------------------------------------------------------------------
  const handleDisconnect = useCallback(
    async (connectionId, platformKey) => {
      setDisconnecting(connectionId);
      try {
        const { error } = await supabase
          .from("reach_social_connections")
          .update({ is_active: false })
          .eq("id", connectionId);
        if (error) throw error;

        setConnections((prev) =>
          prev.map((c) => (c.id === connectionId ? { ...c, is_active: false } : c))
        );
        toast.success(`${SOCIAL_PLATFORMS[platformKey]?.name || platformKey} disconnected`);
      } catch (err) {
        toast.error("Failed to disconnect account");
      } finally {
        setDisconnecting(null);
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Sync metrics
  // -------------------------------------------------------------------------
  const handleSyncMetrics = useCallback(async () => {
    if (!companyId) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-fetch-metrics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: companyId, date_range: "30" }),
        }
      );
      const body = await res.json();
      if (body.message) {
        toast.info(body.message);
      } else {
        toast.success("Metrics synced successfully");
        setLastSyncAt(new Date().toISOString());
      }
    } catch (err) {
      toast.error("Failed to sync metrics");
    } finally {
      setSyncing(false);
    }
  }, [companyId]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-8 max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/10">
          <Settings className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Reach Settings</h1>
          <p className="text-sm text-zinc-400">
            Manage your social media connections and channel integrations
          </p>
        </div>
      </div>

      {/* Connected Accounts */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">Connected Accounts</h2>
          <Badge variant="outline" size="sm" className="text-zinc-500 border-zinc-700">
            {Object.keys(connectionMap).length} / {Object.keys(SOCIAL_PLATFORMS).length}
          </Badge>
        </div>

        {/* OAuth banner */}
        {connectBanner && (
          <OAuthBanner
            platformName={connectBanner}
            onClose={() => setConnectBanner(null)}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(SOCIAL_PLATFORMS).map(([key, platform], i) => (
              <PlatformCard
                key={key}
                platformKey={key}
                platform={platform}
                connection={connectionMap[key]}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                disconnecting={disconnecting}
              />
            ))}
          </div>
        )}
      </section>

      {/* API Keys Status */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-white">API Keys Status</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          These keys are managed in your Supabase project secrets and power various Reach features.
        </p>

        <div className="space-y-3">
          {API_KEYS.map((apiKey, i) => (
            <ApiKeyCard key={apiKey.id} apiKey={apiKey} index={i} />
          ))}
        </div>

        <div className="flex items-start gap-2.5 mt-4 px-1">
          <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            API keys are securely stored as Supabase Edge Function secrets and cannot be viewed or
            modified from this interface. To update them, use the Supabase Dashboard or CLI.
          </p>
        </div>
      </section>

      {/* Data Sync */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-white">Data Sync</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          Pull the latest performance metrics from your connected platforms.
        </p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/10">
                <CloudCog className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Sync Metrics</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-500">
                    {lastSyncAt
                      ? `Last synced ${new Date(lastSyncAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}`
                      : "Never synced"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSyncMetrics}
              disabled={syncing || Object.keys(connectionMap).length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>

          {Object.keys(connectionMap).length === 0 && (
            <div className="flex items-start gap-2.5 mt-4 pt-4 border-t border-zinc-800">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/70">
                Connect at least one social account above before syncing metrics.
              </p>
            </div>
          )}

          {/* Auto-sync info */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-400">Auto-sync:</span> When enabled,
                  metrics will be fetched automatically every 6 hours. Auto-sync requires platform
                  API credentials to be configured in your Supabase secrets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
