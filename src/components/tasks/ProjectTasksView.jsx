import React, { useState, useMemo, useCallback } from "react";
import { Plus, LayoutGrid, List, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useProjectTasks } from "@/hooks/useTasks";
import TaskKanbanView from "./TaskKanbanView";
import TaskListView from "./TaskListView";
import TaskCalendarView from "./TaskCalendarView";
import TaskViewSwitcher from "./TaskViewSwitcher";
import TaskModal from "./TaskModal";
import { STATUS_CONFIG } from "./TaskCard";

/**
 * Embeddable task view for the Projects detail page.
 * Shows only tasks where project_id matches.
 */
export default function ProjectTasksView({
  projectId,
  projectName = "",
  teamMembers = [],
}) {
  const [viewMode, setViewMode] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalDefaults, setModalDefaults] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const {
    tasks,
    loading,
    stats,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks,
  } = useProjectTasks(projectId);

  const handleCreateTask = async (data) => {
    const newTask = await createTask({ ...data, project_id: projectId });
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
      const created = await createTask({ ...formData, project_id: projectId });
      if (created) toast.success("Task created");
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    const success = await deleteTask(id);
    if (success) toast.success("Task deleted");
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateTask(id, { status: newStatus });
    toast.success(`Moved to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    await updateTask(taskId, { status: newStatus });
    toast.success(`Moved to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalDefaults({});
    setShowModal(true);
  };

  const handleAddTask = (status = "pending", dueDate) => {
    setEditingTask(null);
    setModalDefaults({ status, project_id: projectId, due_date: dueDate || "" });
    setShowModal(true);
  };

  const handleOpenFullModal = (data) => {
    setEditingTask(null);
    setModalDefaults({ ...data, project_id: projectId });
    setShowModal(true);
  };

  const handleSelectTask = (task) => {
    setSelectedTaskId(task?.id === selectedTaskId ? null : task?.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-zinc-300">
            Tasks
            <span className="text-zinc-500 ml-1.5">({stats.total})</span>
          </h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {stats.completed > 0 && <span className="text-cyan-400">{stats.completed} done</span>}
            {stats.overdue > 0 && <span className="text-red-400">{stats.overdue} overdue</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TaskViewSwitcher view={viewMode} onViewChange={setViewMode} />
          <Button
            size="sm"
            onClick={() => handleAddTask("pending")}
            className="bg-cyan-600/80 hover:bg-cyan-600 text-white h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      {/* Views */}
      {viewMode === "kanban" && (
        <TaskKanbanView
          tasks={tasks}
          onDragEnd={handleDragEnd}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onAddTask={handleAddTask}
          onSelect={handleSelectTask}
          selectedTaskId={selectedTaskId}
          onCreateTask={handleCreateTask}
          onOpenFullModal={handleOpenFullModal}
        />
      )}

      {viewMode === "list" && (
        <TaskListView
          tasks={tasks}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onSelect={handleSelectTask}
          selectedTaskId={selectedTaskId}
          onCreateTask={handleCreateTask}
          onOpenFullModal={handleOpenFullModal}
        />
      )}

      {viewMode === "calendar" && (
        <TaskCalendarView
          tasks={tasks}
          onEdit={handleEditTask}
          onAddTask={handleAddTask}
          onSelect={handleSelectTask}
          selectedTaskId={selectedTaskId}
        />
      )}

      {/* Modal */}
      <TaskModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) { setEditingTask(null); setModalDefaults({}); }
        }}
        task={editingTask || (modalDefaults.title ? modalDefaults : null)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        projects={[{ id: projectId, name: projectName }]}
        teamMembers={teamMembers}
      />
    </div>
  );
}
