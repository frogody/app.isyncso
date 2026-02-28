import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/components/context/UserContext";
import { useSearchParams } from "react-router-dom";
import { supabase, functions } from "@/api/supabaseClient";
import {
  Plus, Sparkles, Keyboard, InboxIcon,
  ListChecks, CheckCircle2, AlertTriangle, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Task components
import TaskKanbanView from "@/components/tasks/TaskKanbanView";
import TaskListView from "@/components/tasks/TaskListView";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";
import TaskViewSwitcher from "@/components/tasks/TaskViewSwitcher";
import TaskFilters from "@/components/tasks/TaskFilters";
import TaskModal from "@/components/tasks/TaskModal";
import TaskKeyboardHandler from "@/components/tasks/TaskKeyboardHandler";
import TaskTriage from "@/components/tasks/TaskTriage";
import PixelSidebar from "@/components/tasks/PixelSidebar";
import { STATUS_CONFIG } from "@/components/tasks/TaskCard";
import TaskTemplates from "@/components/tasks/TaskTemplates";

// Hooks
import { useTasks, TASK_STATUSES, TASK_PRIORITIES } from "@/hooks/useTasks";

// ---------------------------------------------------------------------------
// Motion presets (matching StoreDashboard)
// ---------------------------------------------------------------------------

const SLIDE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = (delay = 0) => ({
  ...SLIDE_UP,
  transition: { ...SLIDE_UP.transition, delay },
});

const VIEW_ORDER = ["kanban", "list", "calendar"];

export default function Tasks() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  // View state
  const viewParam = searchParams.get("view") || "kanban";
  const [viewMode, setViewMode] = useState(viewParam);
  const [filters, setFilters] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showPixelSidebar, setShowPixelSidebar] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalDefaults, setModalDefaults] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);

  // Projects + team (for dropdowns)
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Tasks hook — fetches from `tasks` table with filtering and real-time
  const {
    tasks,
    loading,
    stats,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
    fetchTasks,
    confirmDraft,
    bulkConfirmDrafts,
    getDraftTasks,
  } = useTasks({
    filters: {
      assigned_to: user?.id,
      ...filters,
    },
  });

  // Draft tasks (from meetings, Pixel)
  const draftTasks = useMemo(() => getDraftTasks(), [getDraftTasks]);

  // Filtered tasks for views
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, filters.search]);

  // Fetch projects and team members for dropdowns
  useEffect(() => {
    if (!user?.id) return;

    const loadMeta = async () => {
      try {
        const [projectsRes, usersRes] = await Promise.all([
          supabase.from("projects").select("id, title").limit(50),
          user.company_id
            ? supabase.from("users").select("id, full_name, email, avatar_url").eq("company_id", user.company_id).limit(50)
            : Promise.resolve({ data: [] }),
        ]);
        setProjects(projectsRes.data || []);
        setTeamMembers(usersRes.data || []);
      } catch (err) {
        console.error("[Tasks] meta load error:", err);
      }
    };

    loadMeta();
  }, [user?.id, user?.company_id]);

  // View change
  const handleViewChange = (v) => {
    setViewMode(v);
    setSearchParams({ view: v });
  };

  const cycleView = () => {
    const idx = VIEW_ORDER.indexOf(viewMode);
    const next = VIEW_ORDER[(idx + 1) % VIEW_ORDER.length];
    handleViewChange(next);
  };

  // Task CRUD handlers
  const handleCreateTask = async (data) => {
    const newTask = await createTask(data);
    if (newTask) {
      toast.success("Task created");
      return newTask;
    }
    return null;
  };

  const handleSaveTask = async (formData, taskId) => {
    if (taskId) {
      const updated = await updateTask(taskId, formData);
      if (updated) toast.success("Task updated");
    } else {
      const created = await createTask(formData);
      if (created) toast.success("Task created");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    const success = await deleteTask(id);
    if (success) {
      toast.success("Task deleted");
      if (selectedTaskId === id) setSelectedTaskId(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const updated = await updateTask(id, { status: newStatus });
    if (updated) {
      const label = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Moved to ${label}`);
    }
  };

  // Drag and drop
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const oldStatus = result.source.droppableId;

    if (newStatus === oldStatus && result.source.index === result.destination.index) return;

    const updated = await updateTask(taskId, { status: newStatus });
    if (updated) {
      const label = STATUS_CONFIG[newStatus]?.label || newStatus;
      toast.success(`Task moved to ${label}`);
    }
  };

  // Modal handlers
  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalDefaults({});
    setShowModal(true);
  };

  const handleAddTask = (status = "pending", dueDate) => {
    setEditingTask(null);
    setModalDefaults({ status, due_date: dueDate || "" });
    setShowModal(true);
  };

  const handleOpenFullModal = (data) => {
    setEditingTask(null);
    setModalDefaults(data || {});
    setShowModal(true);
  };

  const handleSelectTemplate = (templateData) => {
    setEditingTask(null);
    setModalDefaults(templateData);
    setShowModal(true);
  };

  // Selection + keyboard navigation
  const handleSelectTask = (task) => {
    setSelectedTaskId(task?.id === selectedTaskId ? null : task?.id);
  };

  const selectedTask = useMemo(
    () => filteredTasks.find(t => t.id === selectedTaskId),
    [filteredTasks, selectedTaskId]
  );

  const navigateTask = (direction) => {
    if (filteredTasks.length === 0) return;
    const currentIdx = filteredTasks.findIndex(t => t.id === selectedTaskId);
    let nextIdx;
    if (currentIdx === -1) {
      nextIdx = 0;
    } else {
      nextIdx = direction === "up"
        ? Math.max(0, currentIdx - 1)
        : Math.min(filteredTasks.length - 1, currentIdx + 1);
    }
    setSelectedTaskId(filteredTasks[nextIdx]?.id);
  };

  // AI action handler — calls task-pixel edge function
  const handleAIAction = async (task, action) => {
    // Trigger inline action — the InlineAIActions component handles the API call
    // For context menu actions, do a quick call here
    try {
      const { data, error } = await functions.invoke("task-pixel", {
        action,
        context: {
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          taskPriority: task.priority,
          taskDueDate: task.due_date,
          userId: user?.id,
          companyId: user?.company_id,
        },
      });

      if (error) {
        toast.error(error.message || "AI action failed");
        return;
      }

      if (action === "suggest_subtasks" && data?.suggestions) {
        const newChecklist = (Array.isArray(data.suggestions) ? data.suggestions : []).map(item => ({
          id: crypto.randomUUID(),
          title: typeof item === "string" ? item : item.title || String(item),
          done: false,
          created_at: new Date().toISOString(),
        }));
        await updateTask(task.id, { checklist: [...(task.checklist || []), ...newChecklist] });
        toast.success(`Added ${newChecklist.length} subtasks`);
      } else if (action === "suggest_priority" && data?.result) {
        await updateTask(task.id, { priority: data.result });
        toast.success(`Priority set to ${data.result}`);
      } else {
        toast.info("AI suggestion applied");
      }
    } catch (err) {
      console.error("[Tasks] AI action error:", err);
      toast.error("AI action failed");
    }
  };

  // Triage handlers
  const handleDismissDraft = async (id) => {
    await deleteTask(id);
    toast.success("Draft dismissed");
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6">
        <div className="max-w-full mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-10 h-10 rounded-[14px] bg-zinc-800" />
            <div>
              <Skeleton className="h-6 w-24 bg-zinc-800 mb-1" />
              <Skeleton className="h-4 w-44 bg-zinc-800" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-[20px] bg-zinc-800" />
            ))}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="w-72 h-96 bg-zinc-800 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Keyboard handler */}
      <TaskKeyboardHandler
        enabled={!showModal}
        selectedTask={selectedTask}
        onCreateTask={() => handleAddTask("pending")}
        onCycleView={cycleView}
        onFocusSearch={() => document.querySelector('[placeholder*="Search tasks"]')?.focus()}
        onDeleteSelected={() => selectedTaskId && handleDeleteTask(selectedTaskId)}
        onEditSelected={() => selectedTask && handleEditTask(selectedTask)}
        onChangeStatus={() => {
          if (!selectedTask) return;
          const statuses = ["pending", "in_progress", "completed"];
          const idx = statuses.indexOf(selectedTask.status);
          const next = statuses[(idx + 1) % statuses.length];
          handleStatusChange(selectedTaskId, next);
        }}
        onChangePriority={() => {
          if (!selectedTask) return;
          const priorities = ["low", "medium", "high", "urgent"];
          const idx = priorities.indexOf(selectedTask.priority);
          const next = priorities[(idx + 1) % priorities.length];
          updateTask(selectedTaskId, { priority: next });
          toast.success(`Priority: ${next}`);
        }}
        onOpenDetail={(task) => handleEditTask(task)}
        onNavigateUp={() => navigateTask("up")}
        onNavigateDown={() => navigateTask("down")}
        onDeselectTask={() => setSelectedTaskId(null)}
      />

      <div className="max-w-full mx-auto p-4 sm:p-6">
        {/* Header */}
        <motion.div {...SLIDE_UP} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-cyan-500/10 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Tasks</h1>
              <p className="text-zinc-500 text-sm">Task management overview</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TaskViewSwitcher view={viewMode} onViewChange={handleViewChange} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPixelSidebar(!showPixelSidebar)}
              className={`rounded-full border-zinc-800/60 gap-1.5 ${showPixelSidebar ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "text-zinc-400"}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Pixel
              {draftTasks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-[10px]">
                  {draftTasks.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
              className="rounded-full border-zinc-800/60 text-zinc-400"
            >
              <InboxIcon className="w-3.5 h-3.5 mr-1" /> Templates
            </Button>
            <Button
              onClick={() => handleAddTask("pending")}
              className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full px-4 gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Task
            </Button>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: ListChecks, label: "Total Tasks", value: stats.total, color: "cyan" },
            { icon: CheckCircle2, label: "Completed", value: stats.completed, color: "cyan" },
            { icon: AlertTriangle, label: "Overdue", value: stats.overdue, color: stats.overdue > 0 ? "red" : "cyan" },
            { icon: Flame, label: "High Priority", value: stats.highPriority, color: "cyan" },
          ].map((stat, i) => {
            const iconColors = stat.color === "red" ? "bg-red-500/10 text-red-400" : "bg-cyan-500/10 text-cyan-400";
            const valueColor = stat.color === "red" && stat.value > 0 ? "text-red-400" : "text-white";
            return (
              <motion.div
                key={stat.label}
                {...stagger(0.05 * i)}
                className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5"
              >
                <div className={`w-9 h-9 rounded-[12px] ${iconColors.split(" ")[0]} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${iconColors.split(" ")[1]}`} />
                </div>
                <div className={`text-2xl font-bold ${valueColor}`}>{stat.value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            projects={projects}
            teamMembers={teamMembers}
          />
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center gap-3 mb-4 text-[10px] text-zinc-600 opacity-40 hover:opacity-100 transition-opacity">
          <Keyboard className="w-3 h-3" />
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">C</kbd> create</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">V</kbd> switch view</span>
          <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">/</kbd> search</span>
          {selectedTask && (
            <>
              <span className="text-zinc-700">|</span>
              <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">S</kbd> status</span>
              <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">P</kbd> priority</span>
              <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">E</kbd> edit</span>
              <span><kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400">Del</kbd> delete</span>
            </>
          )}
        </div>

        {/* Triage Inbox — draft tasks from meetings/Pixel */}
        <TaskTriage
          draftTasks={draftTasks}
          onConfirm={(id) => { confirmDraft(id); toast.success("Task confirmed"); }}
          onEdit={handleEditTask}
          onDismiss={handleDismissDraft}
          onBulkConfirm={(ids) => { bulkConfirmDrafts(ids); toast.success(`Confirmed ${ids.length} tasks`); }}
        />

        {/* Views */}
        {viewMode === "kanban" && (
          <TaskKanbanView
            tasks={filteredTasks}
            onDragEnd={handleDragEnd}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            onSelect={handleSelectTask}
            selectedTaskId={selectedTaskId}
            onCreateTask={handleCreateTask}
            onOpenFullModal={handleOpenFullModal}
            onAIAction={handleAIAction}
          />
        )}

        {viewMode === "list" && (
          <TaskListView
            tasks={filteredTasks}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onSelect={handleSelectTask}
            selectedTaskId={selectedTaskId}
            onCreateTask={handleCreateTask}
            onOpenFullModal={handleOpenFullModal}
            onAIAction={handleAIAction}
          />
        )}

        {viewMode === "calendar" && (
          <TaskCalendarView
            tasks={filteredTasks}
            onEdit={handleEditTask}
            onAddTask={(status, dueDate) => handleAddTask(status, dueDate)}
            onSelect={handleSelectTask}
            selectedTaskId={selectedTaskId}
          />
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) { setEditingTask(null); setModalDefaults({}); }
        }}
        task={editingTask ? { ...editingTask, ...modalDefaults } : Object.keys(modalDefaults).length > 0 ? modalDefaults : null}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        projects={projects}
        teamMembers={teamMembers}
      />

      {/* Pixel AI Sidebar */}
      <PixelSidebar
        open={showPixelSidebar}
        onClose={() => setShowPixelSidebar(false)}
        tasks={filteredTasks}
        draftTasks={draftTasks}
        stats={stats}
        onConfirmDraft={(id) => { confirmDraft(id); toast.success("Task confirmed"); }}
        onEditDraft={handleEditTask}
        onDismissDraft={handleDismissDraft}
        onBulkConfirmDrafts={(ids) => { bulkConfirmDrafts(ids); toast.success(`Confirmed ${ids.length} tasks`); }}
        userId={user?.id}
        companyId={user?.company_id}
      />

      {/* Task Templates */}
      <TaskTemplates
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}
