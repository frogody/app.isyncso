import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, FolderKanban, Calendar, ChevronRight, Loader2, Inbox, Filter } from 'lucide-react';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Projects' },
  { value: 'active', label: 'Active' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const STATUS_CONFIG = {
  active: { color: '#10b981', label: 'Active' },
  in_progress: { color: '#06b6d4', label: 'In Progress' },
  completed: { color: '#8b5cf6', label: 'Completed' },
  on_hold: { color: '#f59e0b', label: 'On Hold' },
  cancelled: { color: '#ef4444', label: 'Cancelled' },
  discovery: { color: '#6366f1', label: 'Discovery' },
};

export default function ClientProjects() {
  const { client, getAccessibleProjects } = usePortalClientContext();
  const settings = usePortalSettings();
  const { org: orgSlug } = useParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const basePath = `/portal/${orgSlug || client?.organization?.slug || ''}`;

  useEffect(() => {
    const fetchProjects = async () => {
      if (!client) return;
      try {
        const data = await getAccessibleProjects();
        setProjects(data);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [client, getAccessibleProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: settings.primary_color }} />
          <p className="text-zinc-500 text-sm">Loading projects...</p>
        </div>
      </div>
    );
  }

  const filtered = projects.filter((p) => {
    const matchesSearch =
      (p.name || p.title)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link to={basePath} className="hover:text-zinc-300 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-300">Projects</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
        <p className="text-zinc-400 mt-2">
          Browse and manage all your accessible projects.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-zinc-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-11 pr-4 py-3 bg-white/[0.03] backdrop-blur-sm border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"
            style={{ '--tw-ring-color': `${settings.primary_color}40` }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-10 pr-8 py-3 bg-white/[0.03] backdrop-blur-sm border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all cursor-pointer"
            style={{ '--tw-ring-color': `${settings.primary_color}40` }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-zinc-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-white font-medium">No projects found</p>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Projects will appear here once they are shared with you.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectGridCard
              key={project.id}
              project={project}
              settings={settings}
              basePath={basePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectGridCard({ project, settings, basePath }) {
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const progress = project.progress || 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Link
      to={`${basePath}/project/${project.id}`}
      className="group flex flex-col p-5 bg-white/[0.02] hover:bg-white/[0.05] border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
            {project.name || project.title}
          </h3>
          <span
            className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full"
            style={{
              backgroundColor: `${status.color}15`,
              color: status.color,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.label}
          </span>
        </div>

        {/* Progress Ring */}
        <div className="relative shrink-0">
          <svg width="48" height="48" className="transform -rotate-90">
            <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r={radius} fill="none"
              stroke={settings.primary_color} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-400">
            {progress}%
          </span>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{project.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-800/40">
        {project.due_date ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="w-3 h-3" />
            Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        ) : (
          <span />
        )}
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
      </div>
    </Link>
  );
}
