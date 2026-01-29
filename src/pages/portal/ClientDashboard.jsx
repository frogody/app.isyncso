import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Loader2,
  Plus,
  ArrowUpRight,
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

  // Determine the base path for links - use org slug from path or client's org
  const basePath = `/portal/${orgSlug || client?.organization?.slug || ''}`;

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

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'in_progress').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;

  // Filter projects by search
  const filteredProjects = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const greeting = getGreeting();
  const firstName = client?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Notion-style Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
          <span>Home</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-zinc-300">Dashboard</span>
        </div>

        <div className="flex items-start gap-4 mb-6">
          <div className="text-5xl">
            {getTimeEmoji()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {greeting}, {firstName}
            </h1>
            <p className="text-zinc-400 text-lg">
              {settings.welcome_message || "Here's what's happening with your projects."}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
            style={{ '--tw-ring-color': settings.primary_color }}
          />
        </div>
      </div>

      {/* Quick Stats - Notion Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <QuickStatBlock emoji="📁" label="Projects" value={totalProjects} />
        <QuickStatBlock emoji="🚀" label="Active" value={activeProjects} />
        <QuickStatBlock emoji="✅" label="Completed" value={completedProjects} />
        <QuickStatBlock emoji="📊" label="Progress" value={`${avgProgress}%`} />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Projects - Main Column */}
        <div className="lg:col-span-3">
          <SectionHeader emoji="📂" title="Your Projects" count={filteredProjects.length} />

          <div className="space-y-2">
            {filteredProjects.slice(0, 6).map((project) => (
              <NotionProjectCard key={project.id} project={project} settings={settings} basePath={basePath} />
            ))}
            {filteredProjects.length === 0 && (
              <EmptyState
                emoji="📭"
                title="No projects yet"
                description="Projects will appear here once they're shared with you"
              />
            )}
            {filteredProjects.length > 6 && (
              <Link
                to={`${basePath}/projects`}
                className="flex items-center justify-center gap-2 p-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
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
              emoji="⏳"
              title="Needs Your Attention"
              count={pendingApprovals.length}
              highlight={pendingApprovals.length > 0}
            />

            <div className="space-y-2">
              {pendingApprovals.map((approval) => (
                <Link
                  key={approval.id}
                  to={`${basePath}/project/${approval.project_id}?tab=approvals&approval=${approval.id}`}
                  className="block p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-amber-200 transition-colors truncate">
                        {approval.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{approval.project?.title}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </Link>
              ))}
              {pendingApprovals.length === 0 && (
                <div className="p-4 text-center">
                  <span className="text-2xl">🎉</span>
                  <p className="text-sm text-zinc-500 mt-2">All caught up!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <SectionHeader emoji="🕐" title="Recent Activity" />

            <div className="space-y-1">
              {recentActivity.slice(0, 5).map((activity) => (
                <NotionActivityItem key={activity.id} activity={activity} />
              ))}
              {recentActivity.length === 0 && (
                <div className="p-4 text-center">
                  <span className="text-2xl">📝</span>
                  <p className="text-sm text-zinc-500 mt-2">No activity yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getTimeEmoji() {
  const hour = new Date().getHours();
  if (hour < 6) return '🌙';
  if (hour < 12) return '☀️';
  if (hour < 18) return '🌤️';
  return '🌙';
}

// Notion-style Components

function QuickStatBlock({ emoji, label, value }) {
  return (
    <div className="p-4 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/50 rounded-lg transition-colors cursor-default">
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="text-xl font-semibold text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ emoji, title, count, highlight }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{emoji}</span>
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">{title}</h2>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 text-xs rounded ${
            highlight ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function NotionProjectCard({ project, settings, basePath }) {
  const statusConfig = {
    active: { emoji: '🟢', label: 'Active' },
    in_progress: { emoji: '🔵', label: 'In Progress' },
    completed: { emoji: '✅', label: 'Completed' },
    on_hold: { emoji: '🟡', label: 'On Hold' },
    cancelled: { emoji: '🔴', label: 'Cancelled' },
  };

  const status = statusConfig[project.status] || statusConfig.active;

  return (
    <Link
      to={`${basePath}/project/${project.id}`}
      className="group flex items-center gap-3 p-3 hover:bg-zinc-800/40 rounded-lg transition-colors"
    >
      {/* Project Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${settings.primary_color}15` }}
      >
        📋
      </div>

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
            {project.name}
          </h3>
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {status.emoji} {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {/* Mini Progress Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-32">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${project.progress || 0}%`,
                  backgroundColor: settings.primary_color,
                }}
              />
            </div>
            <span className="text-xs text-zinc-500">{project.progress || 0}%</span>
          </div>
          {project.due_date && (
            <span className="text-xs text-zinc-600">
              📅 {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </Link>
  );
}

function NotionActivityItem({ activity }) {
  const getEmoji = (type) => {
    switch (type) {
      case 'comment':
        return '💬';
      case 'approval':
        return '✅';
      case 'file':
        return '📎';
      case 'update':
        return '✏️';
      default:
        return '📌';
    }
  };

  return (
    <div className="flex items-start gap-3 p-2 hover:bg-zinc-800/30 rounded-lg transition-colors">
      <span className="text-sm mt-0.5">{getEmoji(activity.action_type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 line-clamp-2">{activity.description}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{formatTimeAgo(activity.created_at)}</p>
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, description }) {
  return (
    <div className="py-12 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="text-white font-medium mt-3">{title}</p>
      <p className="text-sm text-zinc-500 mt-1">{description}</p>
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
