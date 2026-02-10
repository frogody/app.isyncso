import { motion } from 'framer-motion';
import {
  FolderKanban,
  CheckCircle2,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  MoreHorizontal,
  Plus,
  Search,
  ListFilter,
} from 'lucide-react';

// ─── Stats ────────────────────────────────────────────────────────────────────
const projectStats = [
  { label: 'Active Projects', value: '12', icon: FolderKanban, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'Completed', value: '47', icon: CheckCircle2, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'Team Members', value: '24', icon: Users, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'On Track', value: '83%', icon: TrendingUp, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
];

// ─── Status & Priority Styles ─────────────────────────────────────────────────
const statusBadge = {
  Active: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  'On Hold': 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  Completed: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
};

const priorityDot = {
  High: 'bg-red-400',
  Medium: 'bg-amber-400',
  Low: 'bg-cyan-400',
};

// ─── Team Member Avatar Colors ────────────────────────────────────────────────
const avatarColors = [
  'bg-cyan-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
];

// ─── Mock Projects ────────────────────────────────────────────────────────────
const projects = [
  {
    name: 'Website Redesign',
    status: 'Active',
    progress: 72,
    teamSize: 5,
    dueDate: 'Mar 15, 2026',
    tasksDone: 18,
    tasksTotal: 24,
    priority: 'High',
    description: 'Complete overhaul of the company website with new design system',
  },
  {
    name: 'Mobile App Launch',
    status: 'Active',
    progress: 45,
    teamSize: 8,
    dueDate: 'Apr 30, 2026',
    tasksDone: 22,
    tasksTotal: 48,
    priority: 'High',
    description: 'Native iOS and Android app for customer-facing features',
  },
  {
    name: 'Q1 Marketing Campaign',
    status: 'Active',
    progress: 88,
    teamSize: 4,
    dueDate: 'Feb 28, 2026',
    tasksDone: 14,
    tasksTotal: 16,
    priority: 'Medium',
    description: 'Multi-channel marketing campaign for product awareness',
  },
  {
    name: 'CRM Migration',
    status: 'On Hold',
    progress: 30,
    teamSize: 3,
    dueDate: 'May 15, 2026',
    tasksDone: 6,
    tasksTotal: 20,
    priority: 'Medium',
    description: 'Migration from legacy CRM to new unified platform',
  },
  {
    name: 'Product Launch v2.0',
    status: 'Active',
    progress: 60,
    teamSize: 6,
    dueDate: 'Mar 30, 2026',
    tasksDone: 15,
    tasksTotal: 25,
    priority: 'High',
    description: 'Major product release with new feature set and pricing',
  },
  {
    name: 'Security Audit',
    status: 'Completed',
    progress: 100,
    teamSize: 3,
    dueDate: 'Feb 1, 2026',
    tasksDone: 12,
    tasksTotal: 12,
    priority: 'Low',
    description: 'Annual security audit and compliance review',
  },
];

// ─── Project Card Sub-component ───────────────────────────────────────────────
function ProjectCard({ project }) {
  const progressColor =
    project.progress >= 80
      ? 'bg-cyan-400'
      : project.progress >= 50
        ? 'bg-cyan-500'
        : 'bg-cyan-600';

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors cursor-default">
      {/* Top Row: Name + Status */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{project.name}</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{project.description}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusBadge[project.status]}`}>
          {project.status}
        </span>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Progress</span>
          <span className="text-xs text-white font-semibold">{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Team Avatars + Task Count */}
      <div className="flex items-center justify-between">
        {/* Team Avatars */}
        <div className="flex items-center -space-x-2">
          {Array.from({ length: Math.min(project.teamSize, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center text-[8px] font-bold text-white ${avatarColors[i % avatarColors.length]}`}
            />
          ))}
          {project.teamSize > 4 && (
            <div className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[8px] font-medium text-zinc-400">
              +{project.teamSize - 4}
            </div>
          )}
        </div>
        {/* Task Count */}
        <span className="text-xs text-zinc-500">
          {project.tasksDone}/{project.tasksTotal} tasks
        </span>
      </div>

      {/* Bottom Row: Due Date + Priority */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Calendar className="w-3 h-3" />
          <span>{project.dueDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${priorityDot[project.priority]}`} />
          <span className="text-[10px] text-zinc-500">{project.priority}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoProjects({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-5">
      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} data-demo="header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <FolderKanban className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Projects</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Track and manage all projects for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Search projects..."
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-400 placeholder-zinc-600 w-48 cursor-default focus:outline-none"
            />
          </div>
          {/* Filter */}
          <button className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 cursor-default">
            <ListFilter className="w-4 h-4" />
          </button>
          {/* Add Project */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-xs font-medium border border-cyan-500/25 cursor-default">
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        </div>
      </motion.div>

      {/* ─── Stats Row ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} data-demo="project-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {projectStats.map((stat) => (
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
      </motion.div>

      {/* ─── Project Cards Grid ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} data-demo="project-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </motion.div>
    </div>
  );
}
