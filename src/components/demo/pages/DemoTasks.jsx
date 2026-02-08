import {
  CheckSquare,
  ListTodo,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';

const taskStats = [
  { label: 'Total', value: '34', icon: ListTodo, color: 'cyan' },
  { label: 'In Progress', value: '12', icon: Loader2, color: 'amber' },
  { label: 'Due Today', value: '8', icon: Clock, color: 'red' },
  { label: 'Completed', value: '14', icon: CheckCircle2, color: 'emerald' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  amber: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
};

const priorityStyles = {
  High: 'bg-red-500/15 text-red-400',
  Medium: 'bg-amber-500/15 text-amber-400',
  Low: 'bg-emerald-500/15 text-emerald-400',
};

const statusIcons = {
  Todo: Circle,
  'In Progress': Loader2,
  Done: CheckCircle2,
};

const statusStyles = {
  Todo: 'text-zinc-500',
  'In Progress': 'text-amber-400',
  Done: 'text-emerald-400',
};

export default function DemoTasks({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const tasks = [
    { title: `Follow up with ${companyName}`, assignee: 'SM', priority: 'High', due: 'Today', status: 'In Progress' },
    { title: 'Prepare Q1 report', assignee: 'DP', priority: 'High', due: 'Today', status: 'Todo' },
    { title: 'Review candidate profiles', assignee: 'RC', priority: 'Medium', due: 'Tomorrow', status: 'In Progress' },
    { title: 'Update pitch deck', assignee: 'TM', priority: 'Medium', due: 'Feb 10', status: 'Todo' },
    { title: 'Schedule team retrospective', assignee: 'LT', priority: 'Low', due: 'Feb 12', status: 'Todo' },
    { title: 'Finalize contract terms', assignee: 'SM', priority: 'High', due: 'Today', status: 'In Progress' },
    { title: 'Send onboarding materials', assignee: 'DP', priority: 'Low', due: 'Feb 14', status: 'Done' },
    { title: 'Deploy staging build', assignee: 'RC', priority: 'Medium', due: 'Yesterday', status: 'Done' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <CheckSquare className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-zinc-400 mt-0.5">
            Track and manage your team's work.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div data-demo="task-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {taskStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${iconBgMap[stat.color]}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Task List */}
      <div
        data-demo="tasks"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="divide-y divide-zinc-800/50">
          {tasks.map((task, i) => {
            const StatusIcon = statusIcons[task.status];
            return (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/20 transition-colors"
              >
                {/* Status icon */}
                <StatusIcon className={`w-5 h-5 shrink-0 ${statusStyles[task.status]}`} />

                {/* Title */}
                <span className={`flex-1 text-sm ${task.status === 'Done' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {task.title}
                </span>

                {/* Assignee avatar */}
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-400 shrink-0">
                  {task.assignee}
                </div>

                {/* Priority badge */}
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${priorityStyles[task.priority]}`}>
                  {task.priority}
                </span>

                {/* Due date */}
                <span className={`text-xs shrink-0 ${task.due === 'Today' || task.due === 'Yesterday' ? 'text-red-400' : 'text-zinc-500'}`}>
                  {task.due}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
