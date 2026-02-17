/**
 * WorkflowLog - Execution history log for workflow triggers.
 *
 * Shows: timestamp, trigger name, event, actions taken, status (success/failed).
 * Supports filtering by trigger, status, and date range.
 * Expandable detail view for each log entry.
 */

import React, { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle, AlertTriangle, ChevronDown,
  Filter, MessageSquare, Mail, ListTodo, FileText,
  Bell, PartyPopper, RefreshCw, Globe, Zap, Search, X
} from 'lucide-react';

// Icon lookup for action types
const ACTION_ICON_MAP = {
  post_message: MessageSquare,
  send_email: Mail,
  create_task: ListTodo,
  create_invoice: FileText,
  notify_channel: Bell,
  celebrate: PartyPopper,
  update_status: RefreshCw,
  webhook: Globe,
};

const STATUS_STYLES = {
  success: {
    icon: CheckCircle,
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    label: 'Success',
  },
  failed: {
    icon: AlertTriangle,
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Failed',
  },
  partial: {
    icon: AlertTriangle,
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Partial',
  },
};

function formatTimestamp(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  // Same year: show month/day + time
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// LogEntry component
// ---------------------------------------------------------------------------

const LogEntry = memo(function LogEntry({ entry, index }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = STATUS_STYLES[entry.status] || STATUS_STYLES.success;
  const StatusIcon = statusConfig.icon;

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="border-b border-zinc-800/30 last:border-b-0"
    >
      {/* Summary row */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors text-left"
      >
        {/* Status icon */}
        <div
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${statusConfig.bg}`}
        >
          <StatusIcon className={`w-3 h-3 ${statusConfig.text}`} />
        </div>

        {/* Trigger name + event */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-zinc-200 block truncate">
            {entry.triggerName}
          </span>
          <span className="text-[10px] text-zinc-500 block truncate">
            {entry.eventType?.replace(/_/g, ' ')} &middot;{' '}
            {entry.actionsExecuted?.length || 0} action{(entry.actionsExecuted?.length || 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-zinc-500 flex-shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimestamp(entry.executedAt)}
        </span>

        {/* Expand chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 flex-shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pl-[52px] space-y-2">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusConfig.label}
                </span>
              </div>

              {/* Actions executed */}
              {entry.actionsExecuted && entry.actionsExecuted.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
                    Actions Executed
                  </span>
                  {entry.actionsExecuted.map((action, i) => {
                    const Icon = ACTION_ICON_MAP[action.type] || Zap;
                    const actionStatus = STATUS_STYLES[action.status] || STATUS_STYLES.success;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <Icon className="w-3 h-3 text-zinc-500" />
                        <span className="text-zinc-400">
                          {action.type?.replace(/_/g, ' ')}
                        </span>
                        <span className={`${actionStatus.text}`}>
                          {actionStatus.label}
                        </span>
                        <span className="text-zinc-600">
                          {formatTimestamp(action.executedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Event data preview */}
              {entry.eventData && Object.keys(entry.eventData).length > 0 && (
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold block mb-1">
                    Event Data
                  </span>
                  <pre className="text-[10px] text-zinc-500 bg-zinc-900/40 rounded-lg p-2 overflow-x-auto max-h-24">
                    {JSON.stringify(entry.eventData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WorkflowLog({ history = [], triggers = [] }) {
  const [filterTrigger, setFilterTrigger] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    let result = history;

    if (filterTrigger !== 'all') {
      result = result.filter((h) => h.triggerId === filterTrigger);
    }

    if (filterStatus !== 'all') {
      result = result.filter((h) => h.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.triggerName?.toLowerCase().includes(q) ||
          h.eventType?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [history, filterTrigger, filterStatus, searchQuery]);

  const clearFilters = useCallback(() => {
    setFilterTrigger('all');
    setFilterStatus('all');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = filterTrigger !== 'all' || filterStatus !== 'all' || searchQuery.trim();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Execution Log</h3>
            <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded-full">
              {filteredHistory.length}
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
            <input
              type="text"
              placeholder="Search log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          {/* Trigger filter */}
          <select
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none max-w-[120px]"
          >
            <option value="all">All Triggers</option>
            {triggers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800/40 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500 mb-1">No executions yet</p>
            <p className="text-[10px] text-zinc-600">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Trigger executions will appear here'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredHistory.map((entry, i) => (
              <LogEntry key={entry.id} entry={entry} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
