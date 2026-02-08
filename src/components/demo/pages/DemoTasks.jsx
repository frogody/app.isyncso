import {
  CheckSquare,
  ListTodo,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  LayoutGrid,
  List,
  Brain,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';

// ─── Stats ────────────────────────────────────────────────────────────────────
const taskStats = [
  { label: 'Total', value: '34', icon: ListTodo, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'In Progress', value: '12', icon: Loader2, bg: 'bg-amber-500/15', text: 'text-amber-400' },
  { label: 'Due Today', value: '8', icon: Clock, bg: 'bg-red-500/15', text: 'text-red-400' },
  { label: 'Completed This Week', value: '14', icon: CheckCircle2, bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
];

// ─── Priority & label styles ─────────────────────────────────────────────────
const priorityBadge = {
  High: 'bg-red-500/15 text-red-400 border border-red-500/20',
  Medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Low: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
};

const labelBadge = {
  'Sales': 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15',
  'Product': 'bg-violet-500/10 text-violet-400 border border-violet-500/15',
  'Marketing': 'bg-rose-500/10 text-rose-400 border border-rose-500/15',
  'Engineering': 'bg-blue-500/10 text-blue-400 border border-blue-500/15',
  'Design': 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
  'Finance': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
  'Ops': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15',
};

const columnBorders = {
  Todo: 'border-t-zinc-500',
  'In Progress': 'border-t-amber-500',
  Review: 'border-t-violet-500',
  Done: 'border-t-emerald-500',
};

// ─── Kanban Columns ───────────────────────────────────────────────────────────
const kanbanColumns = [
  {
    name: 'Todo',
    tasks: [
      { title: 'Prepare Q1 board presentation', desc: 'Compile revenue and growth metrics for board review', priority: 'High', assignee: 'SM', due: 'Today', subtasks: '1/4', labels: ['Sales'], aiPrioritized: true },
      { title: 'Update competitor analysis doc', desc: 'Add latest feature comparison matrix', priority: 'Medium', assignee: 'RC', due: 'Feb 10', subtasks: '0/3', labels: ['Product'] },
      { title: 'Schedule team retrospective', desc: 'Book conference room and send invites', priority: 'Low', assignee: 'LT', due: 'Feb 12', subtasks: '2/2', labels: ['Ops'] },
      { title: 'Review new design mockups', desc: 'Provide feedback on settings page redesign', priority: 'Medium', assignee: 'TM', due: 'Feb 11', subtasks: '0/5', labels: ['Design'] },
    ],
  },
  {
    name: 'In Progress',
    tasks: [
      { title: 'Follow up with {companyName}', desc: 'Send expansion proposal and schedule call', priority: 'High', assignee: 'SM', due: 'Today', subtasks: '2/5', labels: ['Sales'], aiPrioritized: true },
      { title: 'Finalize contract terms', desc: 'Legal review of enterprise agreement', priority: 'High', assignee: 'DP', due: 'Today', subtasks: '3/6', labels: ['Sales'] },
      { title: 'Build integration dashboard', desc: 'API usage metrics and health indicators', priority: 'Medium', assignee: 'MR', due: 'Feb 14', subtasks: '4/8', labels: ['Engineering'] },
    ],
  },
  {
    name: 'Review',
    tasks: [
      { title: 'Q1 marketing campaign brief', desc: 'Waiting for stakeholder sign-off', priority: 'Medium', assignee: 'RC', due: 'Feb 9', subtasks: '5/5', labels: ['Marketing'] },
      { title: 'Expense report - Jan 2026', desc: 'Pending manager approval', priority: 'Low', assignee: 'LT', due: 'Feb 8', subtasks: '3/3', labels: ['Finance'] },
    ],
  },
  {
    name: 'Done',
    tasks: [
      { title: 'Deploy staging build v2.4.1', desc: 'All smoke tests passing', priority: 'Medium', assignee: 'MR', due: 'Feb 5', subtasks: '6/6', labels: ['Engineering'], done: true },
      { title: 'Send onboarding materials', desc: 'Welcome kit sent to 3 new hires', priority: 'Low', assignee: 'DP', due: 'Feb 4', subtasks: '4/4', labels: ['Ops'], done: true },
      { title: 'Update pitch deck with Q4 data', desc: 'Added revenue charts and case studies', priority: 'High', assignee: 'TM', due: 'Feb 3', subtasks: '7/7', labels: ['Sales'], done: true },
    ],
  },
];


// ─── Task Card Sub-component ──────────────────────────────────────────────────
function TaskCard({ task, companyName }) {
  const title = task.title.replace('{companyName}', companyName);
  const isDone = task.done;
  const isOverdue = task.due === 'Today' || task.due === 'Yesterday';
  const subtaskParts = task.subtasks.split('/');
  const subtaskDone = parseInt(subtaskParts[0], 10);
  const subtaskTotal = parseInt(subtaskParts[1], 10);
  const subtaskPct = subtaskTotal > 0 ? (subtaskDone / subtaskTotal) * 100 : 0;

  return (
    <div
      className={`bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-3.5 space-y-2.5 hover:border-zinc-700/60 transition-colors cursor-default ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        ) : (
          <Circle className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
        )}
        <span className={`text-sm font-medium leading-tight flex-1 ${isDone ? 'text-zinc-500 line-through' : 'text-white'}`}>
          {title}
        </span>
        {task.aiPrioritized && (
          <div className="p-1 bg-violet-500/10 rounded-md shrink-0" title="AI prioritized">
            <Brain className="w-3 h-3 text-violet-400" />
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-zinc-500 leading-relaxed pl-6 line-clamp-1">{task.desc}</p>

      {/* Labels */}
      <div className="flex items-center gap-1.5 pl-6 flex-wrap">
        {task.labels.map((label) => (
          <span key={label} className={`text-[9px] px-1.5 py-0.5 rounded-md ${labelBadge[label] || 'bg-zinc-800 text-zinc-400'}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Subtask progress bar */}
      {subtaskTotal > 0 && (
        <div className="pl-6 flex items-center gap-2">
          <div className="flex-1 bg-zinc-800/80 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-cyan-500'}`}
              style={{ width: `${subtaskPct}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-500 shrink-0">{task.subtasks}</span>
        </div>
      )}

      {/* Bottom metadata */}
      <div className="flex items-center justify-between pl-6">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${priorityBadge[task.priority]}`}>
            {task.priority}
          </span>
          {/* Due date */}
          <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue && !isDone ? 'text-red-400' : 'text-zinc-500'}`}>
            <Calendar className="w-2.5 h-2.5" />
            {task.due}
          </span>
        </div>
        {/* Assignee avatar */}
        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-400 shrink-0">
          {task.assignee}
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoTasks({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-5">

      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <div data-demo="header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <CheckSquare className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Tasks</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Track and manage your team's work.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex p-0.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg">
            <button className="p-1.5 rounded-md bg-cyan-500/15 text-cyan-400 cursor-default">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-md text-zinc-500 cursor-default">
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Add Task */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/25 cursor-default">
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>
      </div>

      {/* ─── Stats Row ─────────────────────────────────────────────────────── */}
      <div data-demo="task-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {taskStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.text}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Kanban Board ──────────────────────────────────────────────────── */}
      <div
        data-demo="kanban-board"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {kanbanColumns.map((column) => (
          <div key={column.name} className="flex flex-col">
            {/* Column header */}
            <div className={`bg-zinc-900/50 border border-zinc-800/60 rounded-t-xl border-t-2 ${columnBorders[column.name]} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{column.name}</h3>
                <span className="text-[10px] font-medium bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">
                  {column.tasks.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default">
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                <button className="p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-default">
                  <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Column body */}
            <div className="bg-zinc-950/30 border border-t-0 border-zinc-800/40 rounded-b-xl p-2.5 space-y-2.5 flex-1 min-h-[200px]">
              {column.tasks.map((task, i) => (
                <TaskCard key={i} task={task} companyName={companyName} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
