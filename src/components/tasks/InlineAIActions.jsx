import React, { useState } from "react";
import {
  Sparkles, ListChecks, Flag, FileText, Timer,
  Check, X, Loader2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { functions } from "@/api/supabaseClient";

const AI_ACTIONS = [
  {
    id: "suggest_subtasks",
    label: "Break into subtasks",
    icon: ListChecks,
    description: "Generate checklist items from task title and description",
  },
  {
    id: "suggest_priority",
    label: "Suggest priority",
    icon: Flag,
    description: "Analyze due date, context, and workload",
  },
  {
    id: "write_description",
    label: "Write description",
    icon: FileText,
    description: "Generate a description from the task title",
  },
  {
    id: "estimate_time",
    label: "Estimate time",
    icon: Timer,
    description: "Suggest minutes based on task type",
  },
];

function AIResultCard({ result, onAccept, onDismiss }) {
  return (
    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 mt-2">
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-zinc-400 mb-1">Pixel suggests:</p>
          {typeof result === "string" ? (
            <p className="text-sm text-white whitespace-pre-wrap">{result}</p>
          ) : Array.isArray(result) ? (
            <ul className="space-y-1">
              {result.map((item, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-1.5">
                  <span className="text-cyan-400 mt-0.5">-</span>
                  {typeof item === "string" ? item : item.title || JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : (
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 ml-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAccept}
          className="h-7 text-xs text-cyan-400 hover:bg-cyan-500/10"
        >
          <Check className="w-3 h-3 mr-1" /> Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-3 h-3 mr-1" /> Dismiss
        </Button>
      </div>
    </div>
  );
}

export default function InlineAIActions({ task, onUpdateTask, userId, companyId }) {
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [resultAction, setResultAction] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleAction = async (action) => {
    setLoading(action.id);
    setResult(null);

    try {
      const { data, error } = await functions.invoke("task-pixel", {
        action: action.id,
        context: {
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          taskPriority: task.priority,
          taskDueDate: task.due_date,
          taskChecklist: task.checklist,
          userId,
          companyId,
        },
      });

      if (error) {
        toast.error(error.message || "AI action failed");
        return;
      }

      if (data?.suggestions) {
        setResult(data.suggestions);
        setResultAction(action.id);
      } else if (data?.result) {
        setResult(data.result);
        setResultAction(action.id);
      } else {
        toast.info("No suggestions generated");
      }
    } catch (err) {
      console.error("[InlineAIActions] error:", err);
      toast.error("Failed to get AI suggestions");
    } finally {
      setLoading(null);
    }
  };

  const handleAcceptResult = async () => {
    if (!result || !resultAction) return;

    try {
      let updates = {};

      switch (resultAction) {
        case "suggest_subtasks":
          // Result should be array of subtask titles
          const newChecklist = (Array.isArray(result) ? result : [result]).map((item) => ({
            id: crypto.randomUUID(),
            title: typeof item === "string" ? item : item.title || String(item),
            done: false,
            created_at: new Date().toISOString(),
          }));
          updates.checklist = [...(task.checklist || []), ...newChecklist];
          break;

        case "suggest_priority":
          updates.priority = typeof result === "string" ? result : result.priority || result;
          break;

        case "write_description":
          updates.description = typeof result === "string" ? result : result.description || String(result);
          break;

        case "estimate_time":
          const minutes = typeof result === "number" ? result : parseInt(result) || null;
          if (minutes) updates.estimated_minutes = minutes;
          break;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateTask(task.id, updates);
        toast.success("Applied AI suggestion");
      }
    } catch (err) {
      toast.error("Failed to apply suggestion");
    }

    setResult(null);
    setResultAction(null);
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        <span>AI Actions</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {AI_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={loading === action.id}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
            >
              {loading === action.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <action.icon className="w-3.5 h-3.5" />
              )}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Result display */}
      {result && (
        <AIResultCard
          result={result}
          onAccept={handleAcceptResult}
          onDismiss={() => { setResult(null); setResultAction(null); }}
        />
      )}
    </div>
  );
}
