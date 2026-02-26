import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  Calendar, Clock, CheckCircle2, Circle, AlertCircle, XCircle,
  MoreHorizontal, Trash2, Edit2, Flag, Sparkles, User, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const STATUS_CONFIG = {
  pending: { label: "To Do", color: "zinc", icon: Circle, dotColor: "bg-zinc-400" },
  in_progress: { label: "In Progress", color: "cyan", icon: Clock, dotColor: "bg-cyan-400" },
  completed: { label: "Completed", color: "cyan", icon: CheckCircle2, dotColor: "bg-emerald-400" },
  cancelled: { label: "Cancelled", color: "zinc", icon: XCircle, dotColor: "bg-zinc-500" },
};

export const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", dot: "bg-zinc-400" },
  medium: { label: "Medium", color: "bg-cyan-500/10 text-cyan-400/70 border-cyan-500/25", dot: "bg-cyan-400/70" },
  high: { label: "High", color: "bg-cyan-500/15 text-cyan-400/85 border-cyan-500/35", dot: "bg-cyan-400" },
  urgent: { label: "Urgent", color: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
};

export function PriorityDot({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />;
}

export default function TaskCard({
  task,
  index,
  onEdit,
  onDelete,
  onStatusChange,
  onAIAction,
  isSelected,
  onSelect,
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const checklistTotal = task.checklist?.length || 0;
  const checklistDone = task.checklist?.filter(i => i.done)?.length || 0;

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => {
            if (e.target.closest('button') || e.target.closest('[role="menu"]')) return;
            onSelect?.(task);
          }}
          className={`group bg-zinc-900/80 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
            snapshot.isDragging
              ? "shadow-xl shadow-cyan-500/10 border-cyan-500/40 scale-[1.02] z-50"
              : isSelected
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-zinc-800/60 hover:border-zinc-700"
          }`}
          style={provided.draggableProps.style}
        >
          <div className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <PriorityDot priority={task.priority} />
                <h4
                  className="text-sm font-medium text-white truncate cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                >
                  {task.title}
                </h4>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                  <DropdownMenuItem onClick={() => onEdit(task)} className="text-zinc-300">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  {onAIAction && (
                    <>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem onClick={() => onAIAction(task, 'suggest_subtasks')} className="text-cyan-400">
                        <Sparkles className="w-4 h-4 mr-2" /> Break into subtasks
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAIAction(task, 'suggest_priority')} className="text-cyan-400">
                        <Flag className="w-4 h-4 mr-2" /> Suggest priority
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-zinc-500 line-clamp-2 mb-2 ml-4">{task.description}</p>
            )}

            {/* Labels */}
            {task.labels?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2 ml-4">
                {task.labels.slice(0, 3).map((label) => (
                  <span
                    key={label}
                    className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 rounded"
                  >
                    {label}
                  </span>
                ))}
                {task.labels.length > 3 && (
                  <span className="text-[10px] text-zinc-500">+{task.labels.length - 3}</span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between ml-4">
              <div className="flex items-center gap-2">
                {dueDate && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-zinc-500"}`}>
                    <Calendar className="w-3 h-3" />
                    {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {checklistTotal > 0 && (
                  <span className={`text-xs flex items-center gap-1 ${
                    checklistDone === checklistTotal ? "text-cyan-400" : "text-zinc-500"
                  }`}>
                    <ListChecks className="w-3 h-3" />
                    {checklistDone}/{checklistTotal}
                  </span>
                )}
                {task.estimated_minutes && (
                  <span className="text-xs text-zinc-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimated_minutes}m
                  </span>
                )}
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${priorityConfig.color}`}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
