import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  MessageSquare,
  Calendar,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';

export default function ClientDashboard() {
  const { client, getAccessibleProjects } = usePortalClientContext();
  const settings = usePortalSettings();
  const [projects, setProjects] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!client) return;

      try {
        // Fetch accessible projects
        const projectsData = await getAccessibleProjects();
        setProjects(projectsData);

        // Fetch recent activity
        const { data: activityData } = await supabase
          .from('portal_activity')
          .select('*')
          .eq('organization_id', client.organization_id)
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentActivity(activityData || []);

        // Fetch pending approvals
        const projectIds = projectsData.map((p) => p.id);
        if (projectIds.length > 0) {
          const { data: approvalsData } = await supabase
            .from('portal_approvals')
            .select('*, project:projects(id, name)')
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
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'in_progress').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {settings.welcome_message || `Welcome back, ${client?.full_name?.split(' ')[0] || 'there'}!`}
            </h1>
            <p className="text-zinc-400">
              Here's an overview of your projects and recent activity.
            </p>
          </div>
          <Link
            to="/portal/projects"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
            }}
          >
            View All Projects
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={totalProjects}
          color={settings.primary_color}
        />
        <StatCard
          icon={TrendingUp}
          label="Active"
          value={activeProjects}
          color="#22c55e"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completedProjects}
          color="#a855f7"
        />
        <StatCard
          icon={Clock}
          label="Avg Progress"
          value={`${avgProgress}%`}
          color="#f59e0b"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5" style={{ color: settings.primary_color }} />
                Your Projects
              </h2>
              <Link
                to="/portal/projects"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-zinc-800">
              {projects.slice(0, 4).map((project) => (
                <ProjectCard key={project.id} project={project} settings={settings} />
              ))}
              {projects.length === 0 && (
                <div className="p-8 text-center text-zinc-500">
                  <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No projects available yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Pending Approvals
              </h2>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 rounded-full">
                {pendingApprovals.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {pendingApprovals.map((approval) => (
                <Link
                  key={approval.id}
                  to={`/portal/project/${approval.project_id}?tab=approvals&approval=${approval.id}`}
                  className="block p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <p className="text-sm font-medium text-white mb-1">{approval.title}</p>
                  <p className="text-xs text-zinc-500">{approval.project?.name}</p>
                </Link>
              ))}
              {pendingApprovals.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No pending approvals
                </p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                Recent Activity
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, settings }) {
  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400',
    in_progress: 'bg-cyan-500/10 text-cyan-400',
    completed: 'bg-purple-500/10 text-purple-400',
    on_hold: 'bg-amber-500/10 text-amber-400',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  return (
    <Link
      to={`/portal/project/${project.id}`}
      className="block p-5 hover:bg-zinc-800/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-white mb-1">{project.name}</h3>
          <p className="text-sm text-zinc-500 line-clamp-1">
            {project.description || 'No description'}
          </p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[project.status] || statusColors.active}`}>
          {project.status?.replace('_', ' ') || 'Active'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {/* Progress bar */}
        <div className="flex-1">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${project.progress || 0}%`,
                backgroundColor: settings.primary_color,
              }}
            />
          </div>
        </div>
        <span className="text-sm text-zinc-400">{project.progress || 0}%</span>
      </div>
      {project.due_date && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
          <Calendar className="w-3.5 h-3.5" />
          Due {new Date(project.due_date).toLocaleDateString()}
        </div>
      )}
    </Link>
  );
}

function ActivityItem({ activity }) {
  const getIcon = (type) => {
    switch (type) {
      case 'comment':
        return MessageSquare;
      case 'approval':
        return CheckCircle2;
      case 'file':
        return FileText;
      default:
        return Clock;
    }
  };

  const Icon = getIcon(activity.action_type);

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 line-clamp-2">{activity.description}</p>
        <p className="text-xs text-zinc-600 mt-1">
          {formatTimeAgo(activity.created_at)}
        </p>
      </div>
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
