import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSemanticContext } from '@/contexts/SemanticContextProvider';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Activity,
  Users,
  Target,
  Code,
  Mail,
  FileText,
  Globe,
  MessageSquare,
  Wrench,
  RefreshCw,
  Zap,
  Laptop,
} from 'lucide-react';

/**
 * UniversalContextBar — Phase 3.1
 *
 * Collapsible bar at the top of main content showing the user's current
 * semantic context: active work thread, top entities, current intent,
 * and dominant activity type. Sourced from desktop pipeline data.
 */

const INTENT_LABELS = {
  SHIP: { label: 'Shipping', color: 'cyan', icon: Code },
  MANAGE: { label: 'Managing', color: 'blue', icon: Users },
  PLAN: { label: 'Planning', color: 'purple', icon: Target },
  MAINTAIN: { label: 'Maintaining', color: 'zinc', icon: Wrench },
  RESPOND: { label: 'Responding', color: 'amber', icon: MessageSquare },
};

const ACTIVITY_ICONS = {
  coding: Code,
  email: Mail,
  document: FileText,
  browsing: Globe,
  communication: MessageSquare,
  design: Activity,
};

// Entity types that are just app/OS noise, not business-relevant
const NOISE_ENTITY_TYPES = new Set(['tool']);

// Patterns that indicate a filename, not a meaningful entity
const FILE_NAME_PATTERNS = [
  /\.(png|jpg|jpeg|gif|svg|pdf|csv|json|md|tsx?|jsx?|sql|txt|xml|zip|mp4|mov)$/i,
  /^screenshot\s/i,
  /^screencapture-/i,
  /^untitled\s/i,
];

// Known noise entity names (exact, lowercased)
const NOISE_NAMES = new Set([
  'latest', 'chrome', 'safari', 'firefox', 'finder', 'terminal',
  'textedit', 'messages', 'google chrome', 'open open', 'untitled untitled',
  'complete product plan', 'claude code',
  'ha job', 'new tab', 'loading', 'search', 'home', 'settings',
  'dashboard', 'undefined', 'null', 'error', 'page', 'view',
  'edit', 'open', 'close', 'tab', 'window',
]);

function isBusinessEntity(entity) {
  if (!entity?.name) return false;
  if (NOISE_ENTITY_TYPES.has(entity.type)) return false;
  const nameLower = entity.name.toLowerCase().trim();
  if (nameLower.length < 2) return false;
  if (NOISE_NAMES.has(nameLower)) return false;
  if (FILE_NAME_PATTERNS.some(p => p.test(entity.name))) return false;
  return true;
}

// Clean up raw window titles to be more meaningful
function cleanThreadTitle(title) {
  if (!title) return 'Active thread';
  // Strip browser suffixes
  let clean = title
    .replace(/\s*[—–-]\s*(Google Chrome|Chrome|Safari|Firefox|Edge|Arc|Brave)\s*$/i, '')
    .replace(/^\s*(Google Chrome|Chrome|Safari|Firefox)\s*[—–-]\s*/i, '')
    .trim();
  // If still generic or empty, return original
  if (!clean || clean.length < 3) return title;
  // Truncate very long titles
  if (clean.length > 60) clean = clean.slice(0, 57) + '...';
  return clean;
}

export default function UniversalContextBar() {
  const {
    activeThreads,
    recentEntities,
    currentIntent,
    activitySummary,
    hasData,
    isLoading,
    lastFetched,
    refresh,
  } = useSemanticContext();

  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // Filter to only business-relevant entities
  const filteredEntities = useMemo(
    () => recentEntities.filter(isBusinessEntity),
    [recentEntities]
  );

  // Check if desktop data is stale (>1 hour old)
  const isStale = lastFetched && (Date.now() - new Date(lastFetched).getTime() > 3600000);

  // Calculate "Xm ago" label from lastFetched
  const timeAgoLabel = useMemo(() => {
    if (!lastFetched) return null;
    const diffMs = Date.now() - new Date(lastFetched).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return '<1m ago';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [lastFetched]);

  // Show a "not connected" state instead of silently hiding
  if (!hasData && !isLoading) {
    return (
      <div className="mx-3 mt-2 mb-1 md:mx-4">
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/20 px-3 py-2 flex items-center gap-2">
          <Laptop className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[11px] text-zinc-600">Desktop activity not connected</span>
          <button
            onClick={refresh}
            className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Check
          </button>
        </div>
      </div>
    );
  }

  const primaryThread = activeThreads[0];
  const topEntities = filteredEntities.slice(0, 3);
  const intentConfig = currentIntent ? INTENT_LABELS[currentIntent.intent_type] || null : null;
  const IntentIcon = intentConfig?.icon || Brain;
  const ActivityIcon = activitySummary?.dominant_type
    ? (ACTIVITY_ICONS[activitySummary.dominant_type] || Activity)
    : Activity;

  return (
    <div className="mx-3 mt-2 mb-1 md:mx-4">
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm overflow-hidden">
        {/* Compact bar */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
        >
          {/* Last updated timestamp — dim when stale */}
          {timeAgoLabel ? (
            <span className={`flex-shrink-0 text-[10px] font-medium ${isStale ? 'text-zinc-500' : 'text-cyan-400'}`}>
              {timeAgoLabel}
            </span>
          ) : (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          )}

          {/* Primary thread */}
          {primaryThread && (
            <span className="text-xs text-zinc-300 truncate max-w-[200px]">
              {cleanThreadTitle(primaryThread.title)}
            </span>
          )}

          {/* Intent badge */}
          {intentConfig && (
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-${intentConfig.color}-500/10 text-${intentConfig.color}-400 border border-${intentConfig.color}-500/20`}>
              <IntentIcon className="w-2.5 h-2.5" />
              {intentConfig.label}
            </span>
          )}

          {/* Top entities (compact) */}
          {topEntities.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              {topEntities.map((entity, i) => (
                <span key={entity.entity_id || i} className="text-[10px] text-zinc-500 truncate max-w-[80px]">
                  {entity.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Activity type */}
          <ActivityIcon className="w-3.5 h-3.5 text-zinc-500" />

          {/* Expand/collapse */}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-3 pb-3 pt-1 border-t border-zinc-800/40 space-y-3">
            {/* Active Threads */}
            {activeThreads.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Active Threads</div>
                <div className="space-y-1">
                  {activeThreads.slice(0, 3).map((thread) => {
                    const duration = Math.round(
                      (new Date(thread.last_activity_at).getTime() - new Date(thread.started_at || thread.last_activity_at).getTime()) / 60000
                    );
                    return (
                      <div key={thread.thread_id} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${thread.status === 'active' ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
                        <span className="text-xs text-zinc-300 truncate">{cleanThreadTitle(thread.title)}</span>
                        <span className="text-[10px] text-zinc-600">{thread.primary_activity_type || 'mixed'}</span>
                        <span className="text-[10px] text-zinc-600">{duration}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current Intent + Evidence */}
            {intentConfig && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Current Intent</div>
                <div className="flex items-center gap-1.5">
                  <IntentIcon className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs text-zinc-300">{intentConfig.label}</span>
                </div>
                {currentIntent?.evidence && (
                  <p className="text-[10px] text-zinc-500 mt-1">{currentIntent.evidence}</p>
                )}
              </div>
            )}

            {/* Recent Entities (filtered to business-relevant) */}
            {filteredEntities.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Recent Entities</div>
                <div className="flex flex-wrap gap-1.5">
                  {filteredEntities.slice(0, 8).map((entity, i) => {
                    const isClickable = entity.type === 'person' || entity.type === 'organization';
                    return (
                      <span
                        key={entity.entity_id || i}
                        onClick={isClickable ? (e) => { e.stopPropagation(); navigate('/crmdashboard?q=' + encodeURIComponent(entity.name)); } : undefined}
                        className={`px-2 py-0.5 rounded-full text-[10px] border ${
                          entity.type === 'person'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : entity.type === 'organization'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }${isClickable ? ' cursor-pointer hover:underline' : ''}`}
                      >
                        {entity.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Distribution */}
            {activitySummary && activitySummary.total_activities > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Activity Distribution</div>
                <div className="flex gap-1.5">
                  {Object.entries(activitySummary.distribution || {})
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => {
                      const pct = Math.round((count / activitySummary.total_activities) * 100);
                      return (
                        <div key={type} className="flex items-center gap-1">
                          <div
                            className="h-1.5 rounded-full bg-cyan-500/40"
                            style={{ width: `${Math.max(pct * 0.6, 8)}px` }}
                          />
                          <span className="text-[10px] text-zinc-500">{type} {pct}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Suggested Next — single contextual suggestion */}
            {intentConfig && (() => {
              let suggestion = null;
              if (currentIntent?.intent_type === 'RESPOND') {
                suggestion = { text: 'Check your inbox for pending messages', action: () => navigate('/inbox') };
              } else if (currentIntent?.intent_type === 'SHIP' && activitySummary?.dominant_type === 'coding') {
                suggestion = { text: 'Review your task board for next priorities', action: () => navigate('/tasks') };
              } else if (currentIntent?.intent_type === 'MANAGE') {
                suggestion = { text: 'Check your team dashboard', action: () => navigate('/dashboard') };
              }
              if (!suggestion) return null;
              return (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Suggested Next</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); suggestion.action(); }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    {suggestion.text}
                  </button>
                </div>
              );
            })()}

            {/* Refresh button */}
            <div className="flex justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); refresh(); }}
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
