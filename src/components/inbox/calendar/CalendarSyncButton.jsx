/**
 * CalendarSyncButton - Google Calendar sync control for the calendar toolbar.
 *
 * Displays connection status and provides:
 * - "Connect Google Calendar" button when disconnected
 * - "Sync Now" button + last synced timestamp when connected
 * - Spinning indicator while syncing
 *
 * Designed for dark theme (zinc-800 bg, cyan accents).
 */

import React from 'react';
import { RefreshCw, Link2, Unlink, Clock, Check } from 'lucide-react';

function formatRelativeTime(date) {
  if (!date) return null;
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function CalendarSyncButton({
  isConnected,
  isSyncing,
  lastSyncAt,
  connectionLoading,
  onConnect,
  onSync,
}) {
  // Loading state while checking connection
  if (connectionLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
        <Clock className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
        <span className="text-[11px] text-zinc-500">Checking...</span>
      </div>
    );
  }

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <button
        onClick={onConnect}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-cyan-500/30 rounded-lg transition-all group"
      >
        <Link2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
        <span className="hidden sm:inline group-hover:text-cyan-400 transition-colors">
          Connect Google Calendar
        </span>
        <span className="sm:hidden group-hover:text-cyan-400 transition-colors">
          Connect
        </span>
      </button>
    );
  }

  // Connected - show sync button + status
  return (
    <div className="flex items-center gap-1.5">
      {/* Connected indicator */}
      <div className="flex items-center gap-1 px-1.5 py-1">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(6,182,212,0.5)]" />
        <span className="text-[10px] text-zinc-500 hidden lg:inline">Google</span>
      </div>

      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={isSyncing}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
          isSyncing
            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 cursor-wait'
            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700/50 hover:border-cyan-500/30 hover:text-cyan-400'
        }`}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`}
        />
        <span className="hidden sm:inline">
          {isSyncing ? 'Syncing...' : 'Sync'}
        </span>
      </button>

      {/* Last synced timestamp */}
      {lastSyncAt && !isSyncing && (
        <span className="text-[10px] text-zinc-600 hidden md:inline">
          {formatRelativeTime(lastSyncAt)}
        </span>
      )}
    </div>
  );
}
