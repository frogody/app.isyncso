import React, { useState } from 'react';
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

export default function UniversalContextBar() {
  const {
    activeThreads,
    recentEntities,
    currentIntent,
    activitySummary,
    hasData,
    isLoading,
    refresh,
  } = useSemanticContext();

  const [expanded, setExpanded] = useState(false);

  if (!hasData && !isLoading) return null;

  const primaryThread = activeThreads[0];
  const topEntities = recentEntities.slice(0, 3);
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
          {/* Activity pulse */}
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

          {/* Primary thread */}
          {primaryThread && (
            <span className="text-xs text-zinc-300 truncate max-w-[200px]">
              {primaryThread.title || 'Active thread'}
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
                        <span className="text-xs text-zinc-300 truncate">{thread.title || 'Untitled'}</span>
                        <span className="text-[10px] text-zinc-600">{thread.primary_activity_type || 'mixed'}</span>
                        <span className="text-[10px] text-zinc-600">{duration}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Entities */}
            {recentEntities.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">Recent Entities</div>
                <div className="flex flex-wrap gap-1.5">
                  {recentEntities.slice(0, 8).map((entity, i) => (
                    <span
                      key={entity.entity_id || i}
                      className={`px-2 py-0.5 rounded-full text-[10px] border ${
                        entity.type === 'person'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : entity.type === 'organization'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {entity.name}
                    </span>
                  ))}
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
