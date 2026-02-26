import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, Loader2, ListChecks, Target, Brain, InboxIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { functions } from "@/api/supabaseClient";
import WorkloadBar from "./WorkloadBar";

function SuggestionCard({ suggestion, onAccept, onDismiss }) {
  const [executing, setExecuting] = useState(false);

  const handleAccept = async () => {
    setExecuting(true);
    try {
      await onAccept(suggestion);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800/60 hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300">{suggestion.message}</p>
          {suggestion.detail && (
            <p className="text-xs text-zinc-500 mt-1">{suggestion.detail}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 ml-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAccept}
          disabled={executing}
          className="h-7 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          {executing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(suggestion.id)}
          className="h-7 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function DraftTaskItem({ task, onConfirm, onEdit, onDismiss }) {
  return (
    <div className="bg-zinc-800/30 rounded-lg p-2.5 border border-zinc-800/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{task.title}</p>
          {task.source === "meeting" && (
            <Badge variant="outline" className="text-[10px] mt-1 border-cyan-500/30 text-cyan-400">
              From meeting
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onConfirm(task.id)}
          className="h-6 text-[11px] text-cyan-400 hover:bg-cyan-500/10 px-2"
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(task)}
          className="h-6 text-[11px] text-zinc-400 hover:text-zinc-300 px-2"
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(task.id)}
          className="h-6 text-[11px] text-zinc-500 hover:text-red-400 px-2"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default function PixelSidebar({
  open,
  onClose,
  tasks = [],
  draftTasks = [],
  stats = {},
  onConfirmDraft,
  onEditDraft,
  onDismissDraft,
  onBulkConfirmDrafts,
  userId,
  companyId,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Generate suggestions based on task context
  const generateSuggestions = useCallback(async () => {
    if (!userId) return;

    setLoadingSuggestions(true);
    try {
      const contextSuggestions = [];

      // Overdue tasks suggestion
      if (stats.overdue > 0) {
        contextSuggestions.push({
          id: "overdue-reschedule",
          type: "action",
          message: `${stats.overdue} task${stats.overdue > 1 ? "s" : ""} overdue — want me to reschedule?`,
          detail: "I can move them to tomorrow or suggest new dates based on priority.",
          action: "reschedule_overdue",
        });
      }

      // Unassigned tasks
      const unassigned = tasks.filter(t => !t.assigned_to && t.status !== "completed");
      if (unassigned.length > 0) {
        contextSuggestions.push({
          id: "unassigned-suggest",
          type: "action",
          message: `${unassigned.length} task${unassigned.length > 1 ? "s have" : " has"} no assignee`,
          detail: "I can suggest team members based on project context and workload.",
          action: "suggest_assignees",
        });
      }

      // High priority without due date
      const noDue = tasks.filter(t => (t.priority === "high" || t.priority === "urgent") && !t.due_date && t.status !== "completed");
      if (noDue.length > 0) {
        contextSuggestions.push({
          id: "no-due-date",
          type: "action",
          message: `${noDue.length} high-priority task${noDue.length > 1 ? "s" : ""} missing due dates`,
          detail: "Setting deadlines helps track urgency. Want me to suggest dates?",
          action: "suggest_due_dates",
        });
      }

      // Try to get AI suggestions from edge function
      try {
        const { data, error } = await functions.invoke("task-pixel", {
          action: "summarize_overdue",
          context: {
            userId,
            companyId,
            taskCount: tasks.length,
            overdueCount: stats.overdue,
            highPriorityCount: stats.highPriority,
          },
        });

        if (data?.suggestions) {
          contextSuggestions.push(
            ...data.suggestions.map((s, i) => ({
              id: `ai-${i}`,
              type: "ai",
              message: s.message || s,
              detail: s.detail,
              action: s.action,
            }))
          );
        }
      } catch {
        // AI suggestions are optional — silently fail
      }

      setSuggestions(contextSuggestions);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [userId, companyId, tasks, stats]);

  useEffect(() => {
    if (open) {
      generateSuggestions();
    }
  }, [open, generateSuggestions]);

  const handleAcceptSuggestion = async (suggestion) => {
    toast.success("Action applied");
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleDismissSuggestion = (id) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 z-40 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Pixel</h3>
                <p className="text-[10px] text-zinc-500">AI Task Assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-zinc-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Meeting Action Items (Drafts) */}
            {draftTasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <InboxIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <h4 className="text-xs font-medium text-zinc-300">Meeting Action Items</h4>
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5">
                      {draftTasks.length}
                    </Badge>
                  </div>
                  {draftTasks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onBulkConfirmDrafts(draftTasks.map(t => t.id))}
                      className="h-6 text-[10px] text-cyan-400 hover:bg-cyan-500/10"
                    >
                      Confirm All
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {draftTasks.map((task) => (
                    <DraftTaskItem
                      key={task.id}
                      task={task}
                      onConfirm={onConfirmDraft}
                      onEdit={onEditDraft}
                      onDismiss={onDismissDraft}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <h4 className="text-xs font-medium text-zinc-300">Suggested Actions</h4>
                {loadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
              </div>
              {suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAccept={handleAcceptSuggestion}
                      onDismiss={handleDismissSuggestion}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-zinc-600 text-xs">
                  {loadingSuggestions ? "Analyzing your tasks..." : "No suggestions right now"}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                <h4 className="text-xs font-medium text-zinc-300">Overview</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total", value: stats.total || 0, color: "text-zinc-300" },
                  { label: "In Progress", value: stats.inProgress || 0, color: "text-cyan-400" },
                  { label: "Overdue", value: stats.overdue || 0, color: stats.overdue > 0 ? "text-red-400" : "text-zinc-500" },
                  { label: "Completed", value: stats.completed || 0, color: "text-emerald-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-800/30 rounded-lg p-2.5">
                    <p className="text-[10px] text-zinc-500">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Workload */}
            {companyId && (
              <WorkloadBar companyId={companyId} className="pt-2" />
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600 text-center">
              Pixel learns from your task patterns to provide better suggestions
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
