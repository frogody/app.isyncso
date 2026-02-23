/**
 * ProductFeedSettings — Main panel for managing product feeds.
 *
 * Shows list of feeds, status, sync history, and controls.
 * Accessible from Settings > Channels > Product Feeds tab.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  Rss, Plus, RefreshCw, Trash2, Settings2, Clock, Check,
  AlertTriangle, Loader2, ChevronDown, ChevronUp, Pause, Play,
  ExternalLink, Zap, Package, XCircle, Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/api/supabaseClient";
import ProductFeedWizard from "./ProductFeedWizard";

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

function timeAgo(dateStr) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ProductFeedSettings() {
  const { t } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id;

  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editFeed, setEditFeed] = useState(null);
  const [expandedFeed, setExpandedFeed] = useState(null);
  const [syncLogs, setSyncLogs] = useState({});
  const [syncingFeed, setSyncingFeed] = useState(null);

  const loadFeeds = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_feeds")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (data) setFeeds(data);
    if (error) toast.error("Failed to load feeds");
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const loadSyncLogs = async (feedId) => {
    const { data } = await supabase
      .from("product_feed_sync_log")
      .select("*")
      .eq("feed_id", feedId)
      .order("started_at", { ascending: false })
      .limit(10);

    if (data) {
      setSyncLogs((prev) => ({ ...prev, [feedId]: data }));
    }
  };

  const toggleExpand = (feedId) => {
    if (expandedFeed === feedId) {
      setExpandedFeed(null);
    } else {
      setExpandedFeed(feedId);
      if (!syncLogs[feedId]) loadSyncLogs(feedId);
    }
  };

  const handleSyncNow = async (feed) => {
    setSyncingFeed(feed.id);
    toast.info(`Syncing "${feed.name}"...`);
    try {
      const result = await callFeedApi("syncFeed", { feedId: feed.id, triggeredBy: "manual" });
      if (result.success) {
        toast.success(
          `Sync complete: ${result.summary?.imported || 0} imported, ${result.summary?.updated || 0} updated, ${result.summary?.excluded || 0} excluded`
        );
      } else {
        toast.error(`Sync failed: ${result.error || "Unknown"}`);
      }
      loadFeeds();
      loadSyncLogs(feed.id);
    } catch (e) {
      toast.error("Sync request failed");
    } finally {
      setSyncingFeed(null);
    }
  };

  const handleToggleActive = async (feed) => {
    const { error } = await supabase
      .from("product_feeds")
      .update({ is_active: !feed.is_active, updated_at: new Date().toISOString() })
      .eq("id", feed.id);

    if (error) return toast.error("Failed to update");
    toast.success(feed.is_active ? "Feed paused" : "Feed activated");
    loadFeeds();
  };

  const handleDelete = async (feed) => {
    if (!confirm(`Delete feed "${feed.name}"? This won't delete imported products.`)) return;
    const { error } = await supabase
      .from("product_feeds")
      .delete()
      .eq("id", feed.id);

    if (error) return toast.error("Failed to delete");
    toast.success("Feed deleted");
    loadFeeds();
  };

  const handleEdit = (feed) => {
    setEditFeed(feed);
    setWizardOpen(true);
  };

  const statusBadge = (status) => {
    switch (status) {
      case "success":
        return <span className="flex items-center gap-1 text-xs text-green-400"><Check className="w-3 h-3" />Success</span>;
      case "running":
        return <span className="flex items-center gap-1 text-xs text-cyan-400"><Loader2 className="w-3 h-3 animate-spin" />Running</span>;
      case "partial":
        return <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="w-3 h-3" />Partial</span>;
      case "failed":
        return <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3 h-3" />Failed</span>;
      default:
        return <span className="text-xs text-zinc-500">—</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Rss className="w-5 h-5 text-cyan-400" />
            Product Feeds
          </h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Import products from live CSV feeds and sync to your catalog
          </p>
        </div>
        <Button
          onClick={() => { setEditFeed(null); setWizardOpen(true); }}
          className="bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Feed
        </Button>
      </div>

      {/* Feeds List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading feeds...
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-zinc-700/40">
          <Rss className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No product feeds configured</p>
          <p className="text-zinc-600 text-xs mt-1">Add a feed to start importing products from supplier CSVs</p>
          <Button
            onClick={() => { setEditFeed(null); setWizardOpen(true); }}
            className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Your First Feed
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 overflow-hidden"
            >
              {/* Feed Card Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${feed.is_active ? "bg-cyan-500/10" : "bg-zinc-700/30"}`}>
                      <Rss className={`w-4 h-4 ${feed.is_active ? "text-cyan-400" : "text-zinc-500"}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-100 truncate">{feed.name}</h4>
                      <p className="text-xs text-zinc-500 font-mono truncate max-w-[300px]">{feed.feed_url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status */}
                    {statusBadge(feed.last_sync_status)}

                    {/* Quick stats */}
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {(feed.total_items || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(feed.last_sync_at)}
                    </span>

                    {/* Actions */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncNow(feed)}
                      disabled={syncingFeed === feed.id}
                      className="border-zinc-700/40 text-zinc-300 text-xs h-8"
                    >
                      {syncingFeed === feed.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Sync
                    </Button>

                    <button
                      onClick={() => handleToggleActive(feed)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40 transition-all"
                      title={feed.is_active ? "Pause" : "Resume"}
                    >
                      {feed.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleEdit(feed)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => toggleExpand(feed.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40 transition-all"
                    >
                      {expandedFeed === feed.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Sync summary bar */}
                {feed.last_sync_summary && typeof feed.last_sync_summary === "object" && feed.last_sync_summary.total_rows > 0 && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-700/30 text-xs text-zinc-500">
                    <span>Total: <span className="text-zinc-300">{(feed.last_sync_summary.total_rows || 0).toLocaleString()}</span></span>
                    <span>Imported: <span className="text-green-400">{(feed.last_sync_summary.imported || 0).toLocaleString()}</span></span>
                    <span>Updated: <span className="text-cyan-400">{(feed.last_sync_summary.updated || 0).toLocaleString()}</span></span>
                    <span>Unchanged: <span className="text-zinc-400">{(feed.last_sync_summary.unchanged || 0).toLocaleString()}</span></span>
                    <span>Excluded: <span className="text-amber-400">{(feed.last_sync_summary.excluded || 0).toLocaleString()}</span></span>
                    {feed.last_sync_summary.errors > 0 && (
                      <span>Errors: <span className="text-red-400">{feed.last_sync_summary.errors}</span></span>
                    )}
                    {feed.last_sync_summary.offers_pushed > 0 && (
                      <span>Offers pushed: <span className="text-blue-400">{feed.last_sync_summary.offers_pushed}</span></span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {expandedFeed === feed.id && (
                <div className="border-t border-zinc-700/30 p-4 space-y-4">
                  {/* Config summary */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500 text-xs">Sync Interval</span>
                      <p className="text-zinc-300">{feed.sync_interval}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Auto-push to bol.com</span>
                      <p className="text-zinc-300">{feed.auto_push_offers ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Field Mappings</span>
                      <p className="text-zinc-300">{Object.values(feed.field_mapping || {}).filter(Boolean).length} fields</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Rules</span>
                      <p className="text-zinc-300">{(feed.transformation_rules || []).length} rules</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Delimiter</span>
                      <p className="text-zinc-300 font-mono">{feed.delimiter === "," ? "Comma" : feed.delimiter === ";" ? "Semicolon" : feed.delimiter}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Created</span>
                      <p className="text-zinc-300">{new Date(feed.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Sync History */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Sync History
                    </h4>
                    {syncLogs[feed.id]?.length > 0 ? (
                      <div className="space-y-1.5">
                        {syncLogs[feed.id].map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs bg-zinc-900/40 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                              {statusBadge(log.status)}
                              <span className="text-zinc-500">{new Date(log.started_at).toLocaleString()}</span>
                              <span className="text-zinc-600">by {log.triggered_by}</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-500">
                              <span>{log.total_rows} rows</span>
                              <span className="text-green-400/60">+{log.imported}</span>
                              <span className="text-cyan-400/60">~{log.updated}</span>
                              <span className="text-amber-400/60">-{log.excluded}</span>
                              {log.errors > 0 && <span className="text-red-400/60">!{log.errors}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600">No sync history yet</p>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="pt-2 border-t border-zinc-800/60 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(feed)}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Feed
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Wizard Dialog */}
      <ProductFeedWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditFeed(null); }}
        onSaved={loadFeeds}
        editFeed={editFeed}
      />
    </div>
  );
}
