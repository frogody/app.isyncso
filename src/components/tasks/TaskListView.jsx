import React, { useState, useMemo } from "react";
import {
  Calendar, Clock, CheckCircle2, Circle, MoreHorizontal,
  Edit2, Trash2, ChevronDown, ChevronRight, Sparkles, Flag
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
import { STATUS_CONFIG, PRIORITY_CONFIG, PriorityDot } from "./TaskCard";
import TaskQuickCreate from "./TaskQuickCreate";

function TaskListRow({ task, onEdit, onDelete, onStatusChange, onSelect, isSelected, onAIAction }) {
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const checklistTotal = task.checklist?.length || 0;
  const checklistDone = task.checklist?.filter(i => i.done)?.length || 0;

  const handleStatusToggle = (e) => {
    e.stopPropagation();
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    onStatusChange(task.id, nextStatus);
  };

  return (
    <div
      onClick={() => onSelect?.(task)}
      className={`flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer group ${
        isSelected
          ? "bg-cyan-500/5 border-l-2 border-l-cyan-500"
          : "hover:bg-white/[0.03] border-l-2 border-l-transparent"
      }`}
    >
      {/* Status checkbox */}
      <button
        onClick={handleStatusToggle}
        className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
          task.status === "completed"
            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
            : "border-zinc-600 hover:border-cyan-500/50"
        }`}
      >
        {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
      </button>

      {/* Priority dot */}
      <PriorityDot priority={task.priority} />

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm font-medium truncate cursor-pointer transition-colors ${
            task.status === "completed"
              ? "text-zinc-500 line-through"
              : "text-white hover:text-cyan-400"
          }`}
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
        >
          {task.title}
        </h4>
      </div>

      {/* Labels */}
      <div className="hidden md:flex items-center gap-1">
        {task.labels?.slice(0, 2).map((label) => (
          <span
            key={label}
            className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 rounded"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Checklist */}
      {checklistTotal > 0 && (
        <span className={`text-xs flex-shrink-0 ${checklistDone === checklistTotal ? "text-cyan-400" : "text-zinc-500"}`}>
          {checklistDone}/{checklistTotal}
        </span>
      )}

      {/* Due date */}
      {dueDate && (
        <span className={`text-[10px] flex items-center gap-1 flex-shrink-0 ${isOverdue ? "text-red-400" : "text-zinc-500"}`}>
          <Calendar className="w-2.5 h-2.5" />
          {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}

      {/* Priority badge */}
      <Badge variant="outline" className={`text-[10px] px-1.5 py-px flex-shrink-0 ${priorityConfig.color}`}>
        {priorityConfig.label}
      </Badge>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
          <DropdownMenuItem onClick={() => onEdit(task)} className="text-zinc-300">
            <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
          </DropdownMenuItem>
          {onAIAction && (
            <>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={() => onAIAction(task, 'suggest_subtasks')} className="text-cyan-400">
                <Sparkles className="w-3.5 h-3.5 mr-2" /> Break into subtasks
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-400">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function TaskListView({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onSelect,
  selectedTaskId,
  onCreateTask,
  onOpenFullModal,
  onAIAction,
}) {
  const [collapsedSections, setCollapsedSections] = useState({});

  const groupedTasks = useMemo(() => {
    const groups = {};
    const order = ["pending", "in_progress", "completed", "cancelled"];
    order.forEach((status) => {
      const statusTasks = tasks.filter((t) => t.status === status);
      if (statusTasks.length > 0) {
        groups[status] = statusTasks;
      }
    });
    return groups;
  }, [tasks]);

  const toggleSection = (status) => {
    setCollapsedSections((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <Circle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm mt-1">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick create at top */}
      <div className="px-3">
        <TaskQuickCreate
          onCreateTask={onCreateTask}
          onOpenFullModal={onOpenFullModal}
          placeholder="Add a task..."
        />
      </div>

      {/* Grouped sections */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        {Object.entries(groupedTasks).map(([status, statusTasks]) => {
          const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
          const Icon = config.icon;
          const isCollapsed = collapsedSections[status];

          return (
            <div key={status}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(status)}
                className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors border-b border-zinc-800/40"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                <span className="text-sm font-medium text-zinc-300">{config.label}</span>
                <span className="text-xs text-zinc-500">{statusTasks.length}</span>
              </button>

              {/* Tasks */}
              {!isCollapsed && (
                <div className="divide-y divide-zinc-800/40">
                  {statusTasks.map((task) => (
                    <TaskListRow
                      key={task.id}
                      task={task}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onSelect={onSelect}
                      isSelected={selectedTaskId === task.id}
                      onAIAction={onAIAction}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
