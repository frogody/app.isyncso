import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from 'animejs';
import { prefersReducedMotion } from '@/lib/animations';
import { base44 } from "@/api/base44Client";
import { useUser } from "@/components/context/UserContext";
import {
  Plus, GripVertical, Calendar, Clock, CheckCircle2, Circle, AlertCircle,
  MoreHorizontal, Trash2, Edit2, Filter, Search, LayoutGrid, List, User,
  Flag, Tag, ChevronDown, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";

const TASK_COLUMNS = [
  { id: "todo", label: "To Do", color: "zinc", icon: Circle },
  { id: "in_progress", label: "In Progress", color: "cyan", icon: Clock },
  { id: "review", label: "In Review", color: "cyan", icon: AlertCircle },
  { id: "completed", label: "Completed", color: "cyan", icon: CheckCircle2 },
];

const PRIORITY_LEVELS = [
  { id: "low", label: "Low", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  { id: "medium", label: "Medium", color: "bg-cyan-500/10 text-cyan-400/70 border-cyan-500/25" },
  { id: "high", label: "High", color: "bg-cyan-500/15 text-cyan-400/85 border-cyan-500/35" },
  { id: "critical", label: "Critical", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/45" },
];

const emptyTask = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  due_date: "",
  project_name: "",
  assigned_to: "",
  tags: [],
};

function TaskCard({ task, index, onEdit, onDelete }) {
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === task.priority) || PRIORITY_LEVELS[1];

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
  const dueDate = task.due_date ? new Date(task.due_date) : null;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group bg-zinc-900/80 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
            snapshot.isDragging
              ? "shadow-xl shadow-cyan-500/10 border-cyan-500/40 scale-[1.02] z-50"
              : "border-zinc-800/60 hover:border-zinc-700"
          }`}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <div className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-zinc-600 hover:text-zinc-400">
                  <GripVertical className="w-4 h-4" />
                </div>
                <h4
                  className="text-sm font-medium text-white truncate cursor-pointer hover:text-cyan-400"
                  onClick={() => onEdit(task)}
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
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-zinc-500 line-clamp-2 mb-2 ml-6">{task.description}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between ml-6">
              <div className="flex items-center gap-2">
                {dueDate && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-cyan-300" : "text-zinc-500"}`}>
                    <Calendar className="w-3 h-3" />
                    {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {task.project_name && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-zinc-700 text-zinc-500">
                    {task.project_name}
                  </Badge>
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

function TaskColumn({ column, tasks, onAddTask, onEdit, onDelete, className = "" }) {
  const Icon = column.icon;
  const colorClasses = {
    zinc: "text-zinc-400 bg-zinc-500/10",
    cyan: "text-cyan-400/80 bg-cyan-500/10",
  };

  return (
    <div className={`flex-shrink-0 w-[260px] sm:w-72 md:w-[280px] lg:w-80 ${className}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${colorClasses[column.color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium text-white">{column.label}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white"
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[400px] rounded-xl p-2 transition-all ${
              snapshot.isDraggingOver
                ? "bg-cyan-500/5 border-2 border-dashed border-cyan-500/30"
                : "border-2 border-transparent"
            }`}
          >
            <AnimatePresence>
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div
                className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors"
                onClick={() => onAddTask(column.id)}
              >
                <Plus className="w-6 h-6 text-zinc-600 mb-2" />
                <p className="text-zinc-600 text-sm">Add a task</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function Tasks() {
  const { user } = useUser();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyTask);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");

  // Refs for anime.js animations
  const columnsRef = useRef(null);
  const headerRef = useRef(null);
  const statsRef = useRef(null);

  // Animate header on mount
  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion()) return;

    anime({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, []);

  // Animate columns when tasks load
  useEffect(() => {
    if (loading || !columnsRef.current || prefersReducedMotion()) return;

    const columns = columnsRef.current.querySelectorAll('.task-column');
    if (columns.length === 0) return;

    // Set initial state
    Array.from(columns).forEach(col => {
      col.style.opacity = '0';
      col.style.transform = 'translateY(30px)';
    });

    // Staggered entrance animation
    anime({
      targets: columns,
      translateY: [30, 0],
      opacity: [0, 1],
      delay: anime.stagger(80, { start: 150 }),
      duration: 600,
      easing: 'easeOutQuart',
    });
  }, [loading]);

  // Animate task count stats
  const animateStats = useCallback(() => {
    if (!statsRef.current || prefersReducedMotion()) return;

    const statElements = statsRef.current.querySelectorAll('.stat-count');
    statElements.forEach(el => {
      const endValue = parseInt(el.dataset.count) || 0;
      const obj = { value: 0 };

      anime({
        targets: obj,
        value: endValue,
        round: 1,
        duration: 800,
        easing: 'easeOutExpo',
        update: () => {
          el.textContent = obj.value;
        },
      });
    });
  }, []);

  // Trigger stats animation when tasks change
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      setTimeout(animateStats, 300);
    }
  }, [loading, tasks.length, animateStats]);

  // Success animation for task completion
  const animateTaskComplete = useCallback((taskElement) => {
    if (!taskElement || prefersReducedMotion()) return;

    anime({
      targets: taskElement,
      scale: [1, 1.05, 1],
      backgroundColor: ['rgba(6, 182, 212, 0)', 'rgba(6, 182, 212, 0.1)', 'rgba(6, 182, 212, 0)'],
      duration: 400,
      easing: 'easeOutQuad',
    });
  }, []);

  useEffect(() => {
    if (user?.id) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user?.id) return;
    try {
      const taskActions = await base44.entities.ActionLog.filter({
        user_id: user.id,
        action_type: "task"
      });

      const taskList = taskActions.map(t => ({
        id: String(t.id), // Ensure ID is string for drag-and-drop
        title: t.title || t.action_description || "Untitled Task",
        description: t.description || t.notes,
        status: mapStatusFromDB(t.status),
        priority: t.priority || "medium",
        due_date: t.due_date,
        project_name: t.project_name || t.client_name,
        project_id: t.project_id,
        assigned_to: t.assigned_to,
        tags: t.tags || [],
        created_date: t.created_date,
        updated_date: t.updated_date,
      }));

      setTasks(taskList);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const mapStatusFromDB = (dbStatus) => {
    if (dbStatus === "success") return "completed";
    if (dbStatus === "in_progress") return "in_progress";
    if (dbStatus === "review") return "review";
    return "todo";
  };

  const mapStatusToDB = (uiStatus) => {
    if (uiStatus === "completed") return "success";
    if (uiStatus === "in_progress") return "in_progress";
    if (uiStatus === "review") return "review";
    return "pending";
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = !searchQuery ||
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.project_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  const tasksByColumn = useMemo(() => {
    const grouped = {};
    TASK_COLUMNS.forEach(col => {
      grouped[col.id] = filteredTasks.filter(t => t.status === col.id);
    });
    return grouped;
  }, [filteredTasks]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;

    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await base44.entities.ActionLog.update(taskId, {
        status: mapStatusToDB(newStatus)
      });

      const columnLabel = TASK_COLUMNS.find(c => c.id === newStatus)?.label;
      toast.success(`Task moved to ${columnLabel}`);
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to move task");
      loadTasks(); // Revert on error
    }
  };

  const handleSaveTask = async () => {
    if (!formData.title) {
      toast.error("Task title is required");
      return;
    }

    try {
      const taskData = {
        action_type: "task",
        title: formData.title,
        action_description: formData.title,
        description: formData.description,
        notes: formData.description,
        status: mapStatusToDB(formData.status),
        priority: formData.priority,
        due_date: formData.due_date || null,
        project_name: formData.project_name,
        assigned_to: formData.assigned_to,
        tags: formData.tags,
        user_id: user?.id,
      };

      if (editingTask) {
        await base44.entities.ActionLog.update(editingTask.id, taskData);
        toast.success("Task updated");
      } else {
        await base44.entities.ActionLog.create(taskData);
        toast.success("Task created");
      }

      setShowModal(false);
      setFormData(emptyTask);
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error("Failed to save task");
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      project_name: task.project_name,
      assigned_to: task.assigned_to,
      tags: task.tags || [],
    });
    setShowModal(true);
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;

    try {
      await base44.entities.ActionLog.delete(id);
      toast.success("Task deleted");
      loadTasks();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleAddTask = (columnId) => {
    setEditingTask(null);
    setFormData({ ...emptyTask, status: columnId });
    setShowModal(true);
  };

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length,
    highPriority: tasks.filter(t => t.priority === "high" || t.priority === "critical").length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6">
        <div className="max-w-full mx-auto">
          <Skeleton className="h-10 w-48 bg-zinc-800 mb-6" />
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="w-72 h-96 bg-zinc-800 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-full mx-auto p-4 sm:p-6">
        {/* Header */}
        <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Tasks</h1>
            <div ref={statsRef} className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
              <span><span className="stat-count" data-count={stats.total}>{stats.total}</span> total</span>
              <span className="text-cyan-400/80"><span className="stat-count" data-count={stats.completed}>{stats.completed}</span> completed</span>
              {stats.overdue > 0 && <span className="text-cyan-300"><span className="stat-count" data-count={stats.overdue}>{stats.overdue}</span> overdue</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded ${viewMode === "kanban" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={() => handleAddTask("todo")}
              className="bg-cyan-600/80 hover:bg-cyan-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_LEVELS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        {viewMode === "kanban" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div ref={columnsRef} className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 tablet-scroll scroll-smooth-ios">
              {TASK_COLUMNS.map(column => (
                <TaskColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id]}
                  onAddTask={handleAddTask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  className="task-column"
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => {
                const priorityConfig = PRIORITY_LEVELS.find(p => p.id === task.priority) || PRIORITY_LEVELS[1];
                const statusConfig = TASK_COLUMNS.find(c => c.id === task.status) || TASK_COLUMNS[0];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10">
                      <StatusIcon className="w-4 h-4 text-cyan-400/80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-medium text-white cursor-pointer hover:text-cyan-400"
                        onClick={() => handleEditTask(task)}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-zinc-500 truncate">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {task.due_date && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <Badge variant="outline" className={`${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem onClick={() => handleEditTask(task)} className="text-zinc-300">
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tasks found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTask ? "Edit Task" : "New Task"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingTask ? "Update the task details below" : "Create a new task to track your work"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Task Title *</label>
              <Input
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Description</label>
              <Textarea
                placeholder="Add more details..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {TASK_COLUMNS.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Priority</label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PRIORITY_LEVELS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Project</label>
                <Input
                  placeholder="Project name"
                  value={formData.project_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => { setShowModal(false); setEditingTask(null); }}
                className="flex-1 border-zinc-700"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTask} className="flex-1 bg-cyan-600/80 hover:bg-cyan-600 text-white">
                {editingTask ? "Update" : "Create"} Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}