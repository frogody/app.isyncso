import React, { useState, useMemo } from "react";
import {
  InboxIcon, CheckCircle2, Edit2, Trash2, ChevronDown, ChevronUp,
  Calendar, Flag, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "./TaskCard";
import { toast } from "sonner";

export default function TaskTriage({
  draftTasks = [],
  onConfirm,
  onEdit,
  onDismiss,
  onBulkConfirm,
}) {
  const [expanded, setExpanded] = useState(true);

  const groupedBySource = useMemo(() => {
    const groups = {};
    draftTasks.forEach((task) => {
      const source = task.source || "unknown";
      if (!groups[source]) groups[source] = [];
      groups[source].push(task);
    });
    return groups;
  }, [draftTasks]);

  if (draftTasks.length === 0) return null;

  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-t-xl cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <InboxIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Triage Inbox</span>
          <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
            {draftTasks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBulkConfirm(draftTasks.map(t => t.id));
              toast.success(`Confirmed ${draftTasks.length} tasks`);
            }}
            className="h-7 text-xs text-cyan-400 hover:bg-cyan-500/10"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm All
          </Button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border border-t-0 border-cyan-500/20 rounded-b-xl bg-zinc-900/50 divide-y divide-zinc-800/40">
          {Object.entries(groupedBySource).map(([source, sourceTasks]) => (
            <div key={source} className="p-3">
              {Object.keys(groupedBySource).length > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                    {source === "meeting" ? "From Meetings" : source === "pixel" ? "Pixel Suggested" : "Draft"}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {sourceTasks.map((task) => {
                  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      <button
                        onClick={() => {
                          onConfirm(task.id);
                          toast.success("Task confirmed");
                        }}
                        className="w-5 h-5 rounded-full border border-cyan-500/40 flex-shrink-0 flex items-center justify-center hover:bg-cyan-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1 py-0 h-4 ${priorityConfig.color}`}
                          >
                            {priorityConfig.label}
                          </Badge>
                          {task.due_date && (
                            <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(task)}
                          className="h-6 w-6 text-zinc-400 hover:text-white"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDismiss(task.id)}
                          className="h-6 w-6 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
