/**
 * FeedSyncResults — Post-push result tracking with error grouping.
 *
 * Tabs: Succesvol (success), Feedback (errors grouped by type), History.
 * Sticky summary sidebar with success/error counts.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle, AlertTriangle, XCircle, Search, Download,
  ExternalLink, Clock, RefreshCw, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedSyncResults({ feedId, feedName, syncComplete }) {
  const [tab, setTab] = useState("success");
  const [loading, setLoading] = useState(true);
  const [syncLogs, setSyncLogs] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    if (!feedId) return;
    loadData();
  }, [feedId]);

  // Auto-refresh when sync completes
  useEffect(() => {
    if (syncComplete && feedId) {
      loadData();
    }
  }, [syncComplete]);

  // Poll for data while waiting for sync (items count is 0)
  useEffect(() => {
    if (!feedId || syncComplete) return;
    const interval = setInterval(() => {
      loadData();
    }, 4000);
    return () => clearInterval(interval);
  }, [feedId, syncComplete]);

  const loadData = async () => {
    setLoading(true);

    const [logsResult, itemsResult] = await Promise.all([
      supabase
        .from("product_feed_sync_log")
        .select("*")
        .eq("feed_id", feedId)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("product_feed_items")
        .select("id, source_ean, source_sku, transformed_data, is_excluded, exclude_reason, sync_hash, last_seen_at")
        .eq("feed_id", feedId)
        .order("last_seen_at", { ascending: false })
        .limit(500),
    ]);

    if (logsResult.data) setSyncLogs(logsResult.data);
    if (itemsResult.data) setFeedItems(itemsResult.data);
    setLoading(false);
  };

  // Compute stats
  const stats = useMemo(() => {
    const success = feedItems.filter((i) => !i.is_excluded).length;
    const excluded = feedItems.filter((i) => i.is_excluded).length;

    // Group errors from latest sync log
    const latestLog = syncLogs[0];
    const errorDetails = latestLog?.error_details || [];

    const errorGroups = {};
    for (const err of errorDetails) {
      const type = err.type || err.error || "Unknown Error";
      if (!errorGroups[type]) {
        errorGroups[type] = { type, count: 0, items: [] };
      }
      errorGroups[type].count++;
      if (errorGroups[type].items.length < 10) {
        errorGroups[type].items.push(err);
      }
    }

    return {
      success,
      excluded,
      errors: errorDetails.length,
      errorGroups: Object.values(errorGroups).sort((a, b) => b.count - a.count),
      latestLog,
    };
  }, [feedItems, syncLogs]);

  // Filtered items for success tab
  const filteredItems = useMemo(() => {
    let items = tab === "excluded"
      ? feedItems.filter((i) => i.is_excluded)
      : feedItems.filter((i) => !i.is_excluded);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.source_ean?.toLowerCase().includes(q) ||
        i.source_sku?.toLowerCase().includes(q) ||
        JSON.stringify(i.transformed_data || {}).toLowerCase().includes(q)
      );
    }

    return items;
  }, [feedItems, tab, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const pageItems = filteredItems.slice(page * pageSize, (page + 1) * pageSize);

  const exportCSV = () => {
    const header = "EAN,SKU,Name,Price,Stock,Status,Excluded,Reason\n";
    const rows = feedItems.map((i) => {
      const td = i.transformed_data || {};
      return `"${i.source_ean || ""}","${i.source_sku || ""}","${td.name || ""}","${td.price || ""}","${td.stock || ""}","${i.is_excluded ? "excluded" : "active"}","${i.is_excluded}","${i.exclude_reason || ""}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${feedName || "feed"}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading sync results...
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-zinc-700/30 pb-0.5">
          {[
            { id: "success", label: "Successful", count: stats.success, color: "text-green-400" },
            { id: "feedback", label: "Feedback", count: stats.errors, color: "text-red-400" },
            { id: "excluded", label: "Excluded", count: stats.excluded, color: "text-amber-400" },
            { id: "history", label: "History", count: syncLogs.length, color: "text-zinc-400" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(0); }}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                tab === t.id
                  ? "bg-zinc-800/60 text-zinc-200 border-b-2 border-cyan-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 ${tab === t.id ? t.color : "text-zinc-600"}`}>
                  {t.count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        {(tab === "success" || tab === "excluded") && (
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search by EAN, SKU, or name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        )}

        {/* Success / Excluded Tab */}
        {(tab === "success" || tab === "excluded") && (
          <div className="rounded-xl border border-zinc-700/30 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-800/60 border-b border-zinc-700/30">
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase">EAN</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase">SKU</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase">Name</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase">Price</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase">Stock</th>
                  {tab === "excluded" && (
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 uppercase">Reason</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={tab === "excluded" ? 6 : 5} className="px-3 py-8 text-center text-zinc-600">
                      No items found
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => {
                    const td = item.transformed_data || {};
                    return (
                      <tr key={item.id} className="hover:bg-zinc-800/30">
                        <td className="px-3 py-2 font-mono text-zinc-300">{item.source_ean || "—"}</td>
                        <td className="px-3 py-2 text-zinc-400">{item.source_sku || "—"}</td>
                        <td className="px-3 py-2 text-zinc-300 max-w-[200px] truncate">{td.name || "—"}</td>
                        <td className="px-3 py-2 text-zinc-300">{td.price ? `€${td.price}` : "—"}</td>
                        <td className="px-3 py-2 text-zinc-300">{td.stock ?? "—"}</td>
                        {tab === "excluded" && (
                          <td className="px-3 py-2 text-amber-400 text-[11px]">{item.exclude_reason || "—"}</td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700/30 bg-zinc-800/30">
                <span className="text-[11px] text-zinc-500">
                  {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredItems.length)} of {filteredItems.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] text-zinc-400 px-2">{page + 1}/{totalPages}</span>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Tab — Error Grouping */}
        {tab === "feedback" && (
          <div className="space-y-2">
            {stats.errorGroups.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-zinc-700/30 bg-zinc-800/30">
                <CheckCircle className="w-8 h-8 text-green-500/60 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No errors from last sync</p>
              </div>
            ) : (
              stats.errorGroups.map((group, idx) => (
                <div key={idx} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-sm text-red-300 font-medium">{group.type}</span>
                    </div>
                    <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                      {group.count.toLocaleString()} items
                    </span>
                  </div>
                  {group.items.length > 0 && (
                    <div className="space-y-1 pl-6">
                      {group.items.slice(0, 5).map((item, iIdx) => (
                        <p key={iIdx} className="text-[11px] text-zinc-500">
                          EAN: {item.ean || "?"} — {item.message || item.error || "No details"}
                        </p>
                      ))}
                      {group.count > 5 && (
                        <p className="text-[11px] text-zinc-600">... and {group.count - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === "history" && (
          <div className="space-y-2">
            {syncLogs.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-8">No sync history yet</p>
            ) : (
              syncLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      log.status === "success" ? "bg-green-500/10" :
                      log.status === "running" ? "bg-cyan-500/10" :
                      log.status === "failed" ? "bg-red-500/10" : "bg-zinc-700/30"
                    }`}>
                      {log.status === "success" ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                       log.status === "running" ? <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" /> :
                       log.status === "failed" ? <XCircle className="w-4 h-4 text-red-400" /> :
                       <Clock className="w-4 h-4 text-zinc-500" />}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300">{new Date(log.started_at).toLocaleString()}</p>
                      <p className="text-[11px] text-zinc-600">
                        Triggered by {log.triggered_by} · {log.completed_at ? `Took ${Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000)}s` : "In progress"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-zinc-500">{(log.total_rows || 0).toLocaleString()} rows</span>
                    <span className="text-green-400">+{log.imported || 0}</span>
                    <span className="text-cyan-400">~{log.updated || 0}</span>
                    <span className="text-amber-400">-{log.excluded || 0}</span>
                    {log.errors > 0 && <span className="text-red-400">!{log.errors}</span>}
                    {log.offers_pushed > 0 && <span className="text-blue-400">bol:{log.offers_pushed}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sticky Summary Sidebar */}
      <div className="w-[160px] shrink-0">
        <div className="sticky top-4 space-y-3">
          <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/40 p-3 space-y-3">
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Result</p>

            <div>
              <p className="text-xl font-bold text-green-400">{stats.success.toLocaleString()}</p>
              <p className="text-[11px] text-zinc-500">Successful</p>
            </div>

            {stats.excluded > 0 && (
              <div>
                <p className="text-lg font-bold text-amber-400">{stats.excluded.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-500">Excluded</p>
              </div>
            )}

            {stats.errors > 0 && (
              <div>
                <p className="text-lg font-bold text-red-400">{stats.errors.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-500">Errors</p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="w-full border-zinc-700/40 text-zinc-400 text-xs"
          >
            <Download className="w-3 h-3 mr-1" /> Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="w-full border-zinc-700/40 text-zinc-400 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
