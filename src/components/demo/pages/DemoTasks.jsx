import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, GripVertical, Calendar, Clock, CheckCircle2, Circle, AlertCircle,
  MoreHorizontal, Search, LayoutGrid, List, Flag, Tag,
  ChevronDown, Edit2, Trash2, Filter,
} from 'lucide-react';

// ─── Task Columns ──────────────────────────────────────────────────────────────

const TASK_COLUMNS = [
  { id: 'todo', label: 'To Do', icon: Circle, dotColor: 'bg-zinc-600' },
  { id: 'in_progress', label: 'In Progress', icon: Clock, dotColor: 'bg-cyan-500/80' },
  { id: 'review', label: 'In Review', icon: AlertCircle, dotColor: 'bg-cyan-400/80' },
  { id: 'completed', label: 'Completed', icon: CheckCircle2, dotColor: 'bg-cyan-400' },
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  { id: 'medium', label: 'Medium', color: 'bg-cyan-500/10 text-cyan-400/70 border-cyan-500/25' },
  { id: 'high', label: 'High', color: 'bg-cyan-500/15 text-cyan-400/85 border-cyan-500/35' },
  { id: 'critical', label: 'Critical', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/45' },
];

// ─── Mock Tasks ────────────────────────────────────────────────────────────────

const TASKS = [
  { id: 't1', title: 'Finalize Q1 sales report', description: 'Compile revenue data and prepare slides for board meeting', status: 'todo', priority: 'high', due_date: '2026-02-14', project: 'Sales Operations', assignee: 'SM' },
  { id: 't2', title: 'Review TechVentures onboarding plan', description: 'Ensure all deliverables are mapped to timeline', status: 'todo', priority: 'critical', due_date: '2026-02-12', project: 'Client Success', assignee: 'JP' },
  { id: 't3', title: 'Update product roadmap for Q2', description: 'Incorporate feedback from customer interviews', status: 'todo', priority: 'medium', due_date: '2026-02-18', project: 'Product', assignee: 'LT' },
  { id: 't4', title: 'Prepare investor update email', description: 'Monthly KPI summary for investors', status: 'todo', priority: 'low', due_date: '2026-02-20', project: 'Finance', assignee: 'EW' },
  { id: 't5', title: 'Implement SSO integration', description: 'OAuth2 SAML integration for enterprise clients', status: 'in_progress', priority: 'high', due_date: '2026-02-15', project: 'Engineering', assignee: 'MC' },
  { id: 't6', title: 'Design new analytics dashboard', description: 'Create mockups for pipeline analytics view', status: 'in_progress', priority: 'medium', due_date: '2026-02-17', project: 'Design', assignee: 'AM' },
  { id: 't7', title: 'Configure CI/CD pipeline', description: 'Set up automated testing and deployment', status: 'in_progress', priority: 'high', due_date: '2026-02-13', project: 'Engineering', assignee: 'DN' },
  { id: 't8', title: 'Write API documentation', description: 'Document all REST endpoints for v2 API', status: 'review', priority: 'medium', due_date: '2026-02-16', project: 'Engineering', assignee: 'MC' },
  { id: 't9', title: 'Test DataBridge integration', description: 'End-to-end testing of data sync', status: 'review', priority: 'high', due_date: '2026-02-11', project: 'Engineering', assignee: 'JP' },
  { id: 't10', title: 'Launch email campaign for Meridian', description: 'Outreach sequence for healthcare vertical', status: 'completed', priority: 'medium', due_date: '2026-02-08', project: 'Marketing', assignee: 'SM' },
  { id: 't11', title: 'Fix invoice PDF export bug', description: 'Currency formatting issue in generated PDFs', status: 'completed', priority: 'critical', due_date: '2026-02-09', project: 'Engineering', assignee: 'DN' },
  { id: 't12', title: 'Onboard Pinnacle Group', description: 'Complete setup and training for new client', status: 'completed', priority: 'high', due_date: '2026-02-10', project: 'Client Success', assignee: 'LT' },
];

// ─── Task Card Component ───────────────────────────────────────────────────────

function TaskCard({ task }) {
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === task.priority) || PRIORITY_LEVELS[1];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const dueDate = task.due_date ? new Date(task.due_date) : null;

  return (
    <div className="group bg-zinc-900/80 rounded-xl border border-zinc-800/60 hover:border-zinc-700 transition-all">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
            <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
          </div>
          <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white cursor-default">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        {task.description && (
          <p className="text-xs text-zinc-500 mb-2 pl-6 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between pl-6">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-1.5 py-px rounded-md border ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
            {dueDate && (
              <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-cyan-300' : 'text-zinc-500'}`}>
                <Calendar className="w-2.5 h-2.5" />
                {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center shrink-0">
            <span className="text-cyan-400/80 text-[9px] font-medium">{task.assignee}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DemoTasks({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [viewMode, setViewMode] = useState('kanban');

  // Group tasks by status
  const tasksByColumn = {};
  TASK_COLUMNS.forEach(col => { tasksByColumn[col.id] = []; });
  TASKS.forEach(t => {
    if (tasksByColumn[t.status]) tasksByColumn[t.status].push(t);
  });

  const stats = {
    total: TASKS.length,
    completed: TASKS.filter(t => t.status === 'completed').length,
    overdue: TASKS.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-full mx-auto p-4 sm:p-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">Tasks</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
              <span>{stats.total} total</span>
              <span className="text-cyan-400/80">{stats.completed} completed</span>
              {stats.overdue > 0 && <span className="text-cyan-300">{stats.overdue} overdue</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded cursor-default ${viewMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded cursor-default ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-600/80 text-white text-sm font-medium cursor-default">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>

        {/* ── Search & Filter ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
              readOnly
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 cursor-default">
            All Priorities
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* ── Kanban View ───────────────────────────────────────── */}
        {viewMode === 'kanban' && (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x scrollbar-hide">
            {TASK_COLUMNS.map((column, ci) => {
              const columnTasks = tasksByColumn[column.id] || [];
              const StatusIcon = column.icon;
              return (
                <motion.div
                  key={column.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.05 }}
                  className="w-72 shrink-0 snap-start"
                >
                  <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                    {/* Column Header */}
                    <div className="p-3 border-b border-zinc-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                          <h3 className="text-sm font-medium text-white">{column.label}</h3>
                          <span className="text-xs text-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 rounded">{columnTasks.length}</span>
                        </div>
                        <button className="text-zinc-600 hover:text-zinc-400 cursor-default">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Tasks */}
                    <div className="p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-320px)] overflow-y-auto">
                      {columnTasks.map(task => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-xs text-zinc-600">No tasks</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── List View ─────────────────────────────────────────── */}
        {viewMode === 'list' && (
          <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
            {TASKS.map(task => {
              const priorityConfig = PRIORITY_LEVELS.find(p => p.id === task.priority) || PRIORITY_LEVELS[1];
              const statusConfig = TASK_COLUMNS.find(c => c.id === task.status) || TASK_COLUMNS[0];
              const StatusIcon = statusConfig.icon;
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

              return (
                <div key={task.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-cyan-500/10">
                    <StatusIcon className="w-3 h-3 text-cyan-400/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white">{task.title}</h4>
                    {task.description && <p className="text-xs text-zinc-500 truncate">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.due_date && (
                      <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-cyan-300' : 'text-zinc-500'}`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-px rounded-md border ${priorityConfig.color}`}>
                      {priorityConfig.label}
                    </span>
                    <button className="p-1 text-zinc-400 hover:text-white cursor-default">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
