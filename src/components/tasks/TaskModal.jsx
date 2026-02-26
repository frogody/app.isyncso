import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown, ChevronUp, Calendar, Clock, Tag, Users, FolderOpen,
  Flag, ListChecks, Timer, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChecklistEditor from "./ChecklistEditor";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./TaskCard";

const EMPTY_TASK = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  assigned_to: "",
  project_id: "",
  due_date: "",
  labels: [],
  checklist: [],
  estimated_minutes: "",
  source: "manual",
};

export default function TaskModal({
  open,
  onOpenChange,
  task = null,
  onSave,
  onDelete,
  projects = [],
  teamMembers = [],
}) {
  const [formData, setFormData] = useState(EMPTY_TASK);
  const [showMore, setShowMore] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const isEditing = !!task;

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "pending",
        priority: task.priority || "medium",
        assigned_to: task.assigned_to || "",
        project_id: task.project_id || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
        labels: task.labels || [],
        checklist: task.checklist || [],
        estimated_minutes: task.estimated_minutes || "",
        source: task.source || "manual",
      });
      // Show more section if any advanced field has data
      setShowMore(
        !!task.description || !!task.project_id || !!task.due_date ||
        (task.labels?.length > 0) || (task.checklist?.length > 0) ||
        !!task.estimated_minutes
      );
    } else {
      setFormData(EMPTY_TASK);
      setShowMore(false);
    }
  }, [task, open]);

  // Auto-focus title
  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLabel = () => {
    const label = labelInput.trim();
    if (label && !formData.labels.includes(label)) {
      updateField("labels", [...formData.labels, label]);
    }
    setLabelInput("");
  };

  const handleRemoveLabel = (label) => {
    updateField("labels", formData.labels.filter((l) => l !== label));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const data = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        due_date: formData.due_date || null,
        project_id: formData.project_id || null,
        assigned_to: formData.assigned_to || null,
        estimated_minutes: formData.estimated_minutes ? parseInt(formData.estimated_minutes) : null,
      };

      await onSave(data, task?.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl+Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    // M to toggle more
    if (e.key === "m" && !e.target.matches("input, textarea, select")) {
      e.preventDefault();
      setShowMore((p) => !p);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-zinc-900 border-zinc-800 max-w-lg"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? "Edit Task" : "New Task"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isEditing
              ? "Update the task details below"
              : "Create a new task. Press Enter to save with defaults, or expand for details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title — always visible */}
          <div>
            <Input
              ref={titleRef}
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showMore && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
              className="bg-zinc-800 border-zinc-700 text-white text-base font-medium"
            />
          </div>

          {/* Quick row: Status + Priority — always visible */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={formData.status}
              onValueChange={(v) => updateField("status", v)}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.priority}
              onValueChange={(v) => updateField("priority", v)}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle More */}
          <button
            onClick={() => setShowMore((p) => !p)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showMore ? "Less details" : "More details"}
            <span className="text-zinc-600 ml-1">(M)</span>
          </button>

          {/* Expanded section */}
          {showMore && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Description */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  Description
                </label>
                <Textarea
                  placeholder="Add more details..."
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="bg-zinc-800 border-zinc-700 min-h-[80px]"
                />
              </div>

              {/* Assignee + Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Assignee
                  </label>
                  {teamMembers.length > 0 ? (
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(v) => updateField("assigned_to", v)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="User ID"
                      value={formData.assigned_to}
                      onChange={(e) => updateField("assigned_to", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 h-9"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" /> Project
                  </label>
                  {projects.length > 0 ? (
                    <Select
                      value={formData.project_id}
                      onValueChange={(v) => updateField("project_id", v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9">
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="none">No project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title || p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Project name"
                      value={formData.project_id}
                      onChange={(e) => updateField("project_id", e.target.value)}
                      className="bg-zinc-800 border-zinc-700 h-9"
                    />
                  )}
                </div>
              </div>

              {/* Due date + Time estimate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due Date
                  </label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => updateField("due_date", e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Estimate (min)
                  </label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={formData.estimated_minutes}
                    onChange={(e) => updateField("estimated_minutes", e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-9"
                    min="0"
                  />
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Labels
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.labels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="text-xs border-zinc-700 text-zinc-300 cursor-pointer hover:border-red-500/30 hover:text-red-400"
                      onClick={() => handleRemoveLabel(label)}
                    >
                      {label} &times;
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add label, press Enter"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                />
              </div>

              {/* Checklist */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                  <ListChecks className="w-3 h-3" /> Subtasks
                </label>
                <div className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-800">
                  <ChecklistEditor
                    checklist={formData.checklist}
                    onChange={(cl) => updateField("checklist", cl)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {isEditing && onDelete && (
              <Button
                variant="ghost"
                onClick={() => { onDelete(task.id); onOpenChange(false); }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.title.trim() || saving}
                className="bg-cyan-600/80 hover:bg-cyan-600 text-white"
              >
                {saving ? "Saving..." : isEditing ? "Update" : "Create"} Task
              </Button>
            </div>
          </div>

          {/* Shortcut hint */}
          <p className="text-[10px] text-zinc-600 text-center">
            {isEditing ? "Cmd+Enter to save" : "Enter to quick create | Cmd+Enter to save with details"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
