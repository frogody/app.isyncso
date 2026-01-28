import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutGrid,
  ListTodo,
  Clock,
  MessageSquare,
  FileText,
  CheckCircle2,
  Circle,
  Calendar,
  Users,
  DollarSign,
  Loader2,
  Download,
  ExternalLink,
  Send,
  MoreVertical,
  ChevronRight,
  FileBarChart,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';
import ExportModal from '@/components/portal/reports/ExportModal';

export default function ClientProjectDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { client, hasProjectPermission } = usePortalClientContext();
  const settings = usePortalSettings();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!id || !client) return;

      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });
        setTasks(tasksData || []);

        // Fetch comments
        const { data: commentsData } = await supabase
          .from('portal_comments')
          .select(`
            *,
            author_user:users(id, full_name, avatar_url),
            author_client:portal_clients(id, full_name, avatar_url)
          `)
          .eq('project_id', id)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false });
        setComments(commentsData || []);

        // Fetch approvals
        const { data: approvalsData } = await supabase
          .from('portal_approvals')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });
        setApprovals(approvalsData || []);

      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [id, client]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !client) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('portal_comments')
        .insert({
          organization_id: client.organization_id,
          project_id: id,
          author_type: 'client',
          author_client_id: client.id,
          content: newComment.trim(),
        })
        .select(`
          *,
          author_client:portal_clients(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      setComments([data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Project not found</p>
        <button
          onClick={() => navigate('/portal')}
          className="mt-4 text-cyan-400 hover:text-cyan-300"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, count: tasks.length },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length },
    { id: 'files', label: 'Files', icon: FileText, count: project.attachments?.length || 0 },
  ];

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    in_progress: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    completed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    on_hold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/portal')}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${statusColors[project.status] || statusColors.active}`}>
              {project.status?.replace('_', ' ') || 'Active'}
            </span>
          </div>
          {project.description && (
            <p className="text-zinc-400">{project.description}</p>
          )}
        </div>
        {/* Export Button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm font-medium text-white transition-colors"
        >
          <FileBarChart className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={id}
        projectName={project.name}
        settings={settings}
      />

      {/* Progress Bar */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Overall Progress</span>
          <span className="text-sm text-zinc-400">{project.progress || 0}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${project.progress || 0}%`,
              background: `linear-gradient(90deg, ${settings.primary_color}, ${settings.accent_color})`,
            }}
          />
        </div>
        <div className="flex items-center gap-6 mt-4">
          {project.start_date && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Calendar className="w-4 h-4" />
              Started {new Date(project.start_date).toLocaleDateString()}
            </div>
          )}
          {project.due_date && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Calendar className="w-4 h-4" />
              Due {new Date(project.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab project={project} settings={settings} tasks={tasks} approvals={approvals} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab tasks={tasks} settings={settings} />
        )}
        {activeTab === 'timeline' && (
          <TimelineTab project={project} settings={settings} />
        )}
        {activeTab === 'comments' && (
          <CommentsTab
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            onSubmit={handleAddComment}
            submitting={submittingComment}
            settings={settings}
            canComment={true}
          />
        )}
        {activeTab === 'files' && (
          <FilesTab project={project} settings={settings} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ project, settings, tasks, approvals }) {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Stats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-sm text-zinc-500">Total Tasks</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-emerald-400">{completedTasks}</p>
            <p className="text-sm text-zinc-500">Completed</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-400">{pendingApprovals}</p>
            <p className="text-sm text-zinc-500">Pending Approvals</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{project.milestones?.length || 0}</p>
            <p className="text-sm text-zinc-500">Milestones</p>
          </div>
        </div>
      </div>

      {/* Page Content (Notion-like blocks) */}
      {project.page_content?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
            {project.page_content.map((block, index) => (
              <ContentBlock key={index} block={block} />
            ))}
          </div>
        </div>
      )}

      {/* Client Updates */}
      {project.client_updates?.length > 0 && (
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Latest Updates</h3>
          <div className="space-y-3">
            {project.client_updates.slice(0, 3).map((update, index) => (
              <div
                key={index}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
              >
                <p className="text-zinc-300">{update.content}</p>
                <p className="text-xs text-zinc-500 mt-2">
                  {new Date(update.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Content Block Renderer
function ContentBlock({ block }) {
  switch (block.type) {
    case 'heading':
      return <h4 className="text-lg font-semibold text-white">{block.content}</h4>;
    case 'paragraph':
      return <p className="text-zinc-300">{block.content}</p>;
    case 'list':
      return (
        <ul className="list-disc list-inside text-zinc-300 space-y-1">
          {block.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'image':
      return (
        <img
          src={block.url}
          alt={block.caption || ''}
          className="rounded-lg max-w-full"
        />
      );
    default:
      return null;
  }
}

// Tasks Tab Component
function TasksTab({ tasks, settings }) {
  const groupedTasks = {
    pending: tasks.filter((t) => t.status === 'pending' || t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {Object.entries(groupedTasks).map(([status, statusTasks]) => (
        <div key={status} className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              {status.replace('_', ' ')}
            </h3>
            <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-400 rounded-full">
              {statusTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {statusTasks.map((task) => (
              <div
                key={task.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {statusTasks.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-8">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Timeline Tab Component
function TimelineTab({ project, settings }) {
  const milestones = project.milestones || [];

  return (
    <div className="max-w-2xl">
      {milestones.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-zinc-800" />

          {/* Milestones */}
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={milestone.id || index} className="relative flex gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    milestone.completed
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-zinc-800 border-2 border-zinc-700'
                  }`}
                >
                  {milestone.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-medium ${milestone.completed ? 'text-zinc-400' : 'text-white'}`}>
                        {milestone.name || milestone.title}
                      </h4>
                      {milestone.description && (
                        <p className="text-sm text-zinc-500 mt-1">{milestone.description}</p>
                      )}
                    </div>
                    {milestone.date && (
                      <span className="text-sm text-zinc-500">
                        {new Date(milestone.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-500">No milestones defined yet</p>
        </div>
      )}
    </div>
  );
}

// Comments Tab Component
function CommentsTab({ comments, newComment, setNewComment, onSubmit, submitting, settings, canComment }) {
  return (
    <div className="max-w-2xl space-y-6">
      {/* New Comment */}
      {canComment && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-transparent text-white placeholder:text-zinc-500 resize-none focus:outline-none"
            rows={3}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={onSubmit}
              disabled={!newComment.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Comment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} settings={settings} />
        ))}
        {comments.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-500">No comments yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, settings }) {
  const author = comment.author_type === 'client' ? comment.author_client : comment.author_user;
  const isTeam = comment.author_type === 'team';

  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-white text-sm font-medium">
            {author?.full_name?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{author?.full_name || 'Unknown'}</span>
          {isTeam && (
            <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full">Team</span>
          )}
          <span className="text-xs text-zinc-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        <p className="text-zinc-300 mt-1">{comment.content}</p>
      </div>
    </div>
  );
}

// Files Tab Component
function FilesTab({ project, settings }) {
  const files = project.attachments || [];

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('document') || type?.includes('word')) return '📝';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file, index) => (
        <div
          key={index}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getFileIcon(file.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{file.name}</p>
              <p className="text-sm text-zinc-500">
                {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'}
              </p>
            </div>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      ))}
      {files.length === 0 && (
        <div className="col-span-full text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-500">No files attached</p>
        </div>
      )}
    </div>
  );
}
