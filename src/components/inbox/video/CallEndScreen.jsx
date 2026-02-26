/**
 * CallEndScreen - Post-call wrap-up screen powered by SYNC AI.
 *
 * When a call ends, SYNC analyzes the full transcript via Groq LLM and presents:
 *   - Executive summary
 *   - Action items with one-click "Create Task" buttons
 *   - Decisions made
 *   - Key discussion points
 *   - Follow-up suggestions with context-aware action buttons
 *   - Overall sentiment
 *   - "Approve All" to execute every pending item at once
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ListTodo,
  ArrowRight,
  X,
  Users,
  Clock,
  FileText,
  MessageSquare,
  Mail,
  CalendarPlus,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Sparkles,
  Zap,
  Check,
  RotateCcw,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWrapUpActions } from '@/hooks/useWrapUpActions';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Infer execution_type for older responses without it
// ---------------------------------------------------------------------------
function inferExecutionType(followUpType) {
  switch (followUpType) {
    case 'email': return 'auto_email';
    case 'meeting': return 'auto_calendar';
    case 'task': return 'auto_task';
    case 'update':
    default: return 'manual_task';
  }
}

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------
const PriorityBadge = memo(function PriorityBadge({ priority }) {
  const styles = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${styles[priority] || styles.low}`}>
      {priority}
    </span>
  );
});

// ---------------------------------------------------------------------------
// Sentiment indicator
// ---------------------------------------------------------------------------
const SentimentIndicator = memo(function SentimentIndicator({ sentiment }) {
  const iconMap = {
    positive: <ThumbsUp className="w-4 h-4 text-emerald-400" />,
    negative: <ThumbsDown className="w-4 h-4 text-red-400" />,
    neutral: <Minus className="w-4 h-4 text-zinc-400" />,
    mixed: <MessageSquare className="w-4 h-4 text-amber-400" />,
  };
  const colorMap = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-zinc-400',
    mixed: 'text-amber-400',
  };

  return (
    <div className="flex items-center gap-2">
      {iconMap[sentiment?.overall] || iconMap.neutral}
      <span className={`text-sm font-medium capitalize ${colorMap[sentiment?.overall] || colorMap.neutral}`}>
        {sentiment?.overall || 'neutral'}
      </span>
      {sentiment?.notes && (
        <span className="text-xs text-zinc-500 ml-1">— {sentiment.notes}</span>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Follow-up type icon
// ---------------------------------------------------------------------------
const FollowUpIcon = memo(function FollowUpIcon({ type }) {
  const icons = {
    email: <Mail className="w-3.5 h-3.5" />,
    meeting: <CalendarPlus className="w-3.5 h-3.5" />,
    task: <ListTodo className="w-3.5 h-3.5" />,
    update: <FileText className="w-3.5 h-3.5" />,
  };
  return icons[type] || icons.task;
});

// ---------------------------------------------------------------------------
// ActionButton — per-item action button with state transitions
// ---------------------------------------------------------------------------
const ActionButton = memo(function ActionButton({
  status = 'idle',
  label,
  icon: Icon,
  onClick,
  disabled = false,
  disabledTooltip,
}) {
  if (status === 'done') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400">
        <Check className="w-3.5 h-3.5" />
        Done
      </span>
    );
  }

  if (status === 'executing') {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs font-medium text-cyan-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Working...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/25 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
        title="Retry"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Retry
      </button>
    );
  }

  // idle
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        disabled
          ? 'bg-zinc-800/40 border border-zinc-700/30 text-zinc-600 cursor-not-allowed'
          : 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer'
      }`}
      title={disabled && disabledTooltip ? disabledTooltip : label}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Main CallEndScreen component
// ---------------------------------------------------------------------------
const CallEndScreen = memo(function CallEndScreen({
  callTitle,
  callDuration,
  participants = [],
  transcript,
  callId,
  onDismiss,
  userId,
}) {
  const [wrapup, setWrapup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);

  const {
    actionStates,
    hasEmailConnection,
    hasCalendarConnection,
    connectionsLoaded,
    executeCreateTask,
    executeAddToCalendar,
    executeSendEmail,
    executeApproveAll,
  } = useWrapUpActions(userId, callTitle, participants);

  // Is transcript too short for meaningful wrap-up?
  const isShortCall = !transcript || transcript.trim().length < 20;

  // Fetch the AI wrap-up on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchWrapUp() {
      if (isShortCall) {
        setWrapup({
          summary: 'Call was too short to generate a meaningful wrap-up.',
          action_items: [],
          decisions: [],
          key_points: [],
          follow_ups: [],
          sentiment: { overall: 'neutral', notes: '' },
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/sync-meeting-wrapup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              transcript,
              callTitle,
              callDuration,
              participants,
              callId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to generate wrap-up (${response.status})`);
        }

        const data = await response.json();
        if (!cancelled) {
          setWrapup(data);
        }
      } catch (err) {
        console.error('[CallEndScreen] Wrap-up error:', err);
        if (!cancelled) {
          setError(err.message);
          setWrapup({
            summary: 'Unable to generate a detailed summary for this call.',
            action_items: [],
            decisions: [],
            key_points: [],
            follow_ups: [],
            sentiment: { overall: 'neutral', notes: '' },
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWrapUp();
    return () => { cancelled = true; };
  }, [transcript, callTitle, callDuration, participants, callId, isShortCall]);

  // Copy summary to clipboard
  const handleCopySummary = useCallback(() => {
    if (!wrapup) return;

    const lines = [
      `# Call Wrap-Up: ${callTitle || 'Video Call'}`,
      '',
      `## Summary`,
      wrapup.summary,
      '',
    ];

    if (wrapup.action_items?.length > 0) {
      lines.push('## Action Items');
      wrapup.action_items.forEach((item, i) => {
        lines.push(`${i + 1}. [${item.priority?.toUpperCase() || 'MEDIUM'}] ${item.text} — ${item.assignee || 'Unassigned'} (${item.due_hint || 'TBD'})`);
      });
      lines.push('');
    }

    if (wrapup.decisions?.length > 0) {
      lines.push('## Decisions');
      wrapup.decisions.forEach((d, i) => {
        lines.push(`${i + 1}. ${d.text}${d.context ? ` (${d.context})` : ''}`);
      });
      lines.push('');
    }

    if (wrapup.key_points?.length > 0) {
      lines.push('## Key Points');
      wrapup.key_points.forEach((p) => lines.push(`- ${p}`));
      lines.push('');
    }

    if (wrapup.follow_ups?.length > 0) {
      lines.push('## Follow-Ups');
      wrapup.follow_ups.forEach((f) => {
        lines.push(`- [${f.type?.toUpperCase() || 'TASK'}] ${f.text}`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      toast.success('Wrap-up copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, [wrapup, callTitle]);

  // Count pending (non-done) actionable items
  const pendingCount = useMemo(() => {
    if (!wrapup) return 0;
    let count = 0;
    (wrapup.action_items || []).forEach((_, i) => {
      if (actionStates[`action-${i}`]?.status !== 'done') count++;
    });
    (wrapup.follow_ups || []).forEach((_, i) => {
      if (actionStates[`followup-${i}`]?.status !== 'done') count++;
    });
    return count;
  }, [wrapup, actionStates]);

  const allApproved = wrapup && pendingCount === 0 &&
    ((wrapup.action_items?.length || 0) + (wrapup.follow_ups?.length || 0)) > 0;

  // Approve All handler
  const handleApproveAll = useCallback(async () => {
    if (!wrapup || approvingAll) return;
    setApprovingAll(true);
    try {
      await executeApproveAll(wrapup.action_items, wrapup.follow_ups);
    } finally {
      setApprovingAll(false);
    }
  }, [wrapup, approvingAll, executeApproveAll]);

  // Get follow-up action button config
  const getFollowUpAction = useCallback((followUp, index) => {
    const key = `followup-${index}`;
    const state = actionStates[key]?.status || 'idle';
    const execType = followUp.execution_type || inferExecutionType(followUp.type);

    if (execType === 'auto_email') {
      const hasTo = !!followUp.email_details?.to;
      return {
        label: 'Send Email',
        icon: Send,
        disabled: !hasEmailConnection || !hasTo,
        disabledTooltip: !hasEmailConnection
          ? 'Connect Gmail or Outlook in Settings'
          : 'No recipient email identified',
        onClick: () => executeSendEmail(key, followUp.email_details || {}),
        status: state,
      };
    }

    if (execType === 'auto_calendar') {
      return {
        label: 'Add to Calendar',
        icon: CalendarPlus,
        disabled: !hasCalendarConnection,
        disabledTooltip: 'Connect Google Calendar or Outlook in Settings',
        onClick: () => executeAddToCalendar(key, followUp.meeting_details || { title: followUp.text }),
        status: state,
      };
    }

    // auto_task / manual_task
    return {
      label: 'Add to Tasks',
      icon: ListTodo,
      disabled: false,
      disabledTooltip: '',
      onClick: () => executeCreateTask(key, { text: followUp.text, priority: 'medium' }),
      status: state,
    };
  }, [actionStates, hasEmailConnection, hasCalendarConnection, executeCreateTask, executeAddToCalendar, executeSendEmail]);

  // Show action buttons? Only when not a short call and has items
  const hasActionableItems = wrapup &&
    ((wrapup.action_items?.length || 0) + (wrapup.follow_ups?.length || 0)) > 0 &&
    !isShortCall;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-zinc-950 flex items-start justify-center overflow-y-auto"
    >
      <div className="w-full max-w-3xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Call Wrap-Up</h1>
              <p className="text-sm text-zinc-400">
                {callTitle || 'Video Call'} — SYNC Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Call metadata */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-4 mb-6 text-sm text-zinc-400"
        >
          {callDuration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{callDuration}</span>
            </div>
          )}
          {participants.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </motion.div>

        {/* Loading state */}
        {loading && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-12 text-center"
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              SYNC is analyzing your call...
            </h3>
            <p className="text-sm text-zinc-400">
              Processing transcript and extracting key insights
            </p>
          </motion.div>
        )}

        {/* Error banner */}
        {error && !loading && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Wrap-up content */}
        {wrapup && !loading && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            {/* Summary card */}
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Executive Summary
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <SentimentIndicator sentiment={wrapup.sentiment} />
                  <button
                    onClick={handleCopySummary}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy full wrap-up"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {wrapup.summary}
              </p>
            </div>

            {/* Action Items */}
            {wrapup.action_items?.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Action Items ({wrapup.action_items.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {wrapup.action_items.map((item, i) => {
                    const key = `action-${i}`;
                    const state = actionStates[key]?.status || 'idle';
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200">{item.text}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                            <span>{item.assignee || 'Unassigned'}</span>
                            {item.due_hint && (
                              <>
                                <span className="text-zinc-700">·</span>
                                <span>{item.due_hint}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <PriorityBadge priority={item.priority} />
                          <ActionButton
                            status={state}
                            label="Create Task"
                            icon={ListTodo}
                            onClick={() => executeCreateTask(key, item)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Decisions */}
            {wrapup.decisions?.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Decisions Made ({wrapup.decisions.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {wrapup.decisions.map((decision, i) => (
                    <div key={i} className="p-3 bg-white/[0.03] rounded-xl">
                      <p className="text-sm text-zinc-200">{decision.text}</p>
                      {decision.context && (
                        <p className="text-xs text-zinc-500 mt-1">{decision.context}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Points & Follow-ups in 2-col layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Key Points */}
              {wrapup.key_points?.length > 0 && (
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Key Points
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {wrapup.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-ups */}
              {wrapup.follow_ups?.length > 0 && (
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarPlus className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Follow-Ups
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {wrapup.follow_ups.map((followUp, i) => {
                      const action = getFollowUpAction(followUp, i);
                      return (
                        <div key={i} className="flex items-start gap-2.5 p-3 bg-white/[0.03] rounded-xl">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 text-cyan-400">
                            <FollowUpIcon type={followUp.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200">{followUp.text}</p>
                            <span className="text-[10px] font-medium uppercase text-zinc-500 mt-0.5">
                              {followUp.type || 'task'}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            <ActionButton
                              status={action.status}
                              label={action.label}
                              icon={action.icon}
                              onClick={action.onClick}
                              disabled={action.disabled}
                              disabledTooltip={action.disabledTooltip}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-3 pb-4">
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy Summary
              </button>

              <div className="flex items-center gap-3">
                {/* Approve All button — only show when there are actionable items */}
                {hasActionableItems && (
                  allApproved ? (
                    <span className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-sm font-semibold text-emerald-400">
                      <Check className="w-4 h-4" />
                      All Approved
                    </span>
                  ) : (
                    <button
                      onClick={handleApproveAll}
                      disabled={approvingAll}
                      className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 rounded-xl text-sm font-semibold text-cyan-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approvingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      {approvingAll ? 'Approving...' : `Approve All (${pendingCount})`}
                    </button>
                  )
                )}

                <button
                  onClick={onDismiss}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Done
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default CallEndScreen;
