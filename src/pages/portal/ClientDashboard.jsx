import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  FolderKanban,
  Rocket,
  CheckCircle2,
  TrendingUp,
  Clock,
  Calendar,
  AlertCircle,
  Activity,
  MessageSquare,
  FileText,
  Inbox,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';

export default function ClientDashboard() {
  const { client, getAccessibleProjects } = usePortalClientContext();
  const settings = usePortalSettings();
  const { org: orgSlug } = useParams();
  const [projects, setProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const basePath = `/portal/${orgSlug || client?.organization?.slug || ''}`;

  useEffect(() => {
    const fetchData = async () => {
      if (!client) return;

      try {
        const projectsData = await getAccessibleProjects();
        setProjects(projectsData);

        const { data: activityData } = await supabase
          .from('portal_activity')
          .select('*')
          .eq('organization_id', client.organization_id)
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentActivity(activityData || []);

        const projectIds = projectsData.map((p) => p.id);
        if (projectIds.length > 0) {
          const { data: approvalsData } = await supabase
            .from('portal_approvals')
            .select('*, project:projects(id, title)')
            .in('project_id', projectIds)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);
          setPendingApprovals(approvalsData || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [client, getAccessibleProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: settings.primary_color }} />
          <p className="text-zinc-500 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'in_progress').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;

  const filteredProjects = projects.filter(
    (p) =>
      (p.name || p.title)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const greeting = getGreeting();
  const firstName = client?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <span>Home</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-300">Dashboard</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-zinc-400 mt-2">
            {settings.welcome_message || `Welcome to your ${settings.portal_name || 'client portal'}.`}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-lg group">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={totalProjects}
          color={settings.primary_color}
        />
        <StatCard
          icon={Rocket}
          label="Active"
          value={activeProjects}
          color="#f59e0b"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completedProjects}
          color="#10b981"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. Progress"
          value={`${avgProgress}%`}
          color="#8b5cf6"
        />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Projects */}
        <div className="lg:col-span-3">
          <SectionHeader
            icon={FolderKanban}
            title="Your Projects"
            count={filteredProjects.length}
            color={settings.primary_color}
          />

          <div className="space-y-3 mt-4">
            {filteredProjects.slice(0, 8).map((project) => (
              <ProjectCard key={project.id} project={project} settings={settings} basePath={basePath} />
            ))}
            {filteredProjects.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="No projects yet"
                description="Projects will appear here once they're shared with you"
              />
            )}
            {filteredProjects.length > 8 && (
              <Link
                to={`${basePath}/projects`}
                className="flex items-center justify-center gap-2 p-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-xl transition-colors"
              >
                View all {filteredProjects.length} projects
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Approvals */}
          <div>
            <SectionHeader
              icon={AlertCircle}
              title="Needs Attention"
              count={pendingApprovals.length}
              color="#f59e0b"
              highlight={pendingApprovals.length > 0}
            />

            <div className="space-y-2 mt-4">
              {pendingApprovals.map((approval) => (
                <Link
                  key={approval.id}
                  to={`${basePath}/project/${approval.project_id}?tab=approvals&approval=${approval.id}`}
                  className="group block p-4 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border border-amber-500/10 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-amber-200 transition-colors truncate">
                        {approval.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{approval.project?.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
              {pendingApprovals.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-sm text-zinc-500">All caught up!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <SectionHeader
              icon={Activity}
              title="Recent Activity"
              color={settings.primary_color}
            />

            <div className="space-y-1 mt-4">
              {recentActivity.slice(0, 5).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
              {recentActivity.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                    <Activity className="w-5 h-5 text-zinc-500" />
                  </div>
                  <p className="text-sm text-zinc-500">No activity yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Components

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="relative overflow-hidden p-5 bg-white/[0.02] border border-zinc-800/60 rounded-2xl transition-colors hover:bg-white/[0.04]">
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, color, highlight }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" style={{ color }} />
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</h2>
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            highlight
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-zinc-800/80 text-zinc-500'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function ProjectCard({ project, settings, basePath }) {
  const statusConfig = {
    active: { color: '#10b981', label: 'Active' },
    in_progress: { color: '#06b6d4', label: 'In Progress' },
    completed: { color: '#8b5cf6', label: 'Completed' },
    on_hold: { color: '#f59e0b', label: 'On Hold' },
    cancelled: { color: '#ef4444', label: 'Cancelled' },
    discovery: { color: '#6366f1', label: 'Discovery' },
  };

  const status = statusConfig[project.status] || statusConfig.active;
  const progress = project.progress || 0;

  // SVG progress ring
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Link
      to={`${basePath}/project/${project.id}`}
      className="group flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl transition-all"
    >
      {/* Progress Ring */}
      <div className="relative shrink-0">
        <svg width="40" height="40" className="transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={settings.primary_color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-400">
          {progress}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h3 className="font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
            {project.name || project.title}
          </h3>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full shrink-0"
            style={{
              backgroundColor: `${status.color}15`,
              color: status.color,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.label}
          </span>
        </div>
        {project.due_date && (
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500">
            <Calendar className="w-3 h-3" />
            Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
    </Link>
  );
}

function ActivityItem({ activity }) {
  const iconMap = {
    comment: MessageSquare,
    approval: CheckCircle2,
    file: FileText,
    update: Activity,
  };
  const Icon = iconMap[activity.action_type] || Activity;

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 line-clamp-2">{activity.description}</p>
        <p className="text-xs text-zinc-600 mt-1">{formatTimeAgo(activity.created_at)}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-zinc-600" />
      </div>
      <p className="text-white font-medium">{title}</p>
      <p className="text-sm text-zinc-500 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString();
}
