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
  Loader2,
  Download,
  Send,
  ChevronRight,
  FileBarChart,
  Image,
  FileSpreadsheet,
  File,
  Milestone,
  ClipboardList,
  Target,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';
import ExportModal from '@/components/portal/reports/ExportModal';

export default function ClientProjectDetail() {
  const { id, org: orgSlug } = useParams();
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
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', id)
          .order('created_at', { ascending: false });
        setTasks(tasksData || []);

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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: settings.primary_color }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Project not found</p>
        <button
          onClick={() => navigate(`/portal/${orgSlug || client?.organization?.slug || ''}`)}
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
    { id: 'timeline', label: 'Timeline', icon: Milestone },
    { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length },
    { id: 'files', label: 'Files', icon: FileText, count: project.attachments?.length || 0 },
  ];

  const statusConfig = {
    active: { color: '#10b981', label: 'Active' },
    in_progress: { color: '#06b6d4', label: 'In Progress' },
    completed: { color: '#8b5cf6', label: 'Completed' },
    on_hold: { color: '#f59e0b', label: 'On Hold' },
    discovery: { color: '#6366f1', label: 'Discovery' },
    cancelled: { color: '#ef4444', label: 'Cancelled' },
  };
  const status = statusConfig[project.status] || statusConfig.active;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Status accent bar */}
      <div className="h-1 rounded-full w-24" style={{ backgroundColor: status.color }} />

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(`/portal/${orgSlug || client?.organization?.slug || ''}`)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors mt-0.5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight truncate">{project.title}</h1>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full shrink-0"
              style={{ backgroundColor: `${status.color}15`, color: status.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
              {status.label}
            </span>
          </div>
          {project.description && (
            <p className="text-zinc-400 line-clamp-2">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-zinc-800 rounded-xl text-sm font-medium text-white transition-colors shrink-0"
        >
          <FileBarChart className="w-4 h-4" />
          Export
        </button>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={id}
        projectName={project.title}
        settings={settings}
      />

      {/* Progress */}
      <div className="bg-white/[0.02] border border-zinc-800/60 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white">Overall Progress</span>
          <span className="text-sm font-bold" style={{ color: settings.primary_color }}>
            {project.progress || 0}%
          </span>
        </div>
        <div className="h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${project.progress || 0}%`,
              background: `linear-gradient(90deg, ${settings.primary_color}, ${settings.accent_color})`,
            }}
          />
        </div>
        <div className="flex items-center gap-6 mt-4">
          {project.start_date && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              Started {new Date(project.start_date).toLocaleDateString()}
            </div>
          )}
          {project.due_date && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              Due {new Date(project.due_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Tabs - pill style */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                  isActive ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab project={project} settings={settings} tasks={tasks} approvals={approvals} />
        )}
        {activeTab === 'tasks' && <TasksTab tasks={tasks} settings={settings} />}
        {activeTab === 'timeline' && <TimelineTab project={project} settings={settings} />}
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
        {activeTab === 'files' && <FilesTab project={project} settings={settings} />}
      </div>
    </div>
  );
}

// Overview
function OverviewTab({ project, settings, tasks, approvals }) {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OverviewStat icon={ClipboardList} label="Tasks" value={tasks.length} sub={`${taskProgress}% done`} color="#06b6d4" />
        <OverviewStat icon={CheckCircle2} label="Completed" value={completedTasks} color="#10b981" />
        <OverviewStat icon={Clock} label="Pending Approvals" value={pendingApprovals} color="#f59e0b" />
        <OverviewStat icon={Target} label="Milestones" value={project.milestones?.length || 0} color="#8b5cf6" />
      </div>

      {/* Description */}
      {project.description && (
        <div>
          <p className="text-lg text-zinc-300 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Page Content */}
      {project.page_content?.length > 0 && (
        <div className="space-y-4">
          {project.page_content.map((block, index) => (
            <NotionBlock key={index} block={block} settings={settings} />
          ))}
        </div>
      )}

      {/* Updates */}
      {project.client_updates?.length > 0 && (
        <div className="pt-8 border-t border-zinc-800/60">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: settings.primary_color }} />
            Latest Updates
          </h3>
          <div className="space-y-4">
            {project.client_updates.slice(0, 5).map((update, index) => (
              <div key={index} className="relative pl-6 pb-4 border-l-2 border-zinc-800 last:border-l-transparent">
                <div
                  className="absolute -left-[7px] top-1 w-3 h-3 rounded-full"
                  style={{ backgroundColor: settings.primary_color }}
                />
                <div className="bg-white/[0.02] border border-zinc-800/40 rounded-xl p-4 hover:bg-white/[0.04] transition-colors">
                  <p className="text-zinc-300">{update.content}</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    {new Date(update.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {!project.description && !project.page_content?.length && !project.client_updates?.length && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-zinc-400 text-lg">Project details will appear here</p>
          <p className="text-zinc-500 text-sm mt-1">The team will add content as the project progresses</p>
        </div>
      )}
    </div>
  );
}

function OverviewStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-zinc-800/60 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// Block Renderer
function NotionBlock({ block, settings }) {
  switch (block.type) {
    case 'heading':
    case 'heading_1':
      return <h2 className="text-2xl font-bold text-white mt-8 mb-4">{block.content || block.text}</h2>;
    case 'heading_2':
      return <h3 className="text-xl font-semibold text-white mt-6 mb-3">{block.content || block.text}</h3>;
    case 'heading_3':
      return <h4 className="text-lg font-medium text-white mt-4 mb-2">{block.content || block.text}</h4>;
    case 'paragraph':
    case 'text':
      return <p className="text-zinc-300 leading-relaxed mb-4">{block.content || block.text}</p>;
    case 'bulleted_list':
    case 'list':
      return (
        <ul className="space-y-2 mb-4">
          {(block.items || block.children)?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-2 shrink-0" />
              <span>{typeof item === 'string' ? item : item.content || item.text}</span>
            </li>
          ))}
        </ul>
      );
    case 'numbered_list':
      return (
        <ol className="space-y-2 mb-4">
          {(block.items || block.children)?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-zinc-300">
              <span className="text-zinc-500 font-mono text-sm min-w-[1.5rem] mt-0.5">{i + 1}.</span>
              <span>{typeof item === 'string' ? item : item.content || item.text}</span>
            </li>
          ))}
        </ol>
      );
    case 'todo':
    case 'to_do':
      return (
        <div className="flex items-start gap-3 mb-2">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
            block.checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
          }`}>
            {block.checked && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className={block.checked ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
            {block.content || block.text}
          </span>
        </div>
      );
    case 'quote':
    case 'callout':
      return (
        <div
          className="border-l-3 pl-4 py-3 pr-4 rounded-r-xl mb-4 bg-white/[0.02]"
          style={{ borderLeftColor: settings.primary_color }}
        >
          <p className="text-zinc-300 italic">{block.content || block.text}</p>
        </div>
      );
    case 'divider':
      return <hr className="border-zinc-800/60 my-8" />;
    case 'image':
      return (
        <figure className="my-6">
          <img src={block.url || block.src} alt={block.caption || ''} className="rounded-xl w-full"  loading="lazy" decoding="async" />
          {block.caption && (
            <figcaption className="text-sm text-zinc-500 text-center mt-2">{block.caption}</figcaption>
          )}
        </figure>
      );
    case 'video':
      return (
        <div className="my-6 aspect-video rounded-xl overflow-hidden bg-zinc-900">
          {block.url?.includes('youtube') || block.url?.includes('youtu.be') ? (
            <iframe src={block.url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen />
          ) : block.url?.includes('loom') ? (
            <iframe src={block.url.replace('share/', 'embed/')} className="w-full h-full" allowFullScreen />
          ) : (
            <video src={block.url} controls className="w-full h-full" />
          )}
        </div>
      );
    case 'code':
      return (
        <pre className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 overflow-x-auto mb-4">
          <code className="text-sm text-zinc-300 font-mono">{block.content || block.code}</code>
        </pre>
      );
    case 'toggle':
      return (
        <details className="mb-4 group">
          <summary className="cursor-pointer text-white font-medium flex items-center gap-2">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
            {block.title || block.content}
          </summary>
          <div className="pl-6 mt-2 text-zinc-400">
            {block.children?.map((child, i) => (
              <NotionBlock key={i} block={child} settings={settings} />
            ))}
          </div>
        </details>
      );
    default:
      if (block.content || block.text) {
        return <p className="text-zinc-300 mb-4">{block.content || block.text}</p>;
      }
      return null;
  }
}

// Tasks
function TasksTab({ tasks, settings }) {
  const columns = [
    { key: 'pending', label: 'To Do', color: '#71717a', filter: (t) => t.status === 'pending' || t.status === 'todo' },
    { key: 'in_progress', label: 'In Progress', color: '#06b6d4', filter: (t) => t.status === 'in_progress' },
    { key: 'completed', label: 'Done', color: '#10b981', filter: (t) => t.status === 'completed' },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-5">
      {columns.map(({ key, label, color, filter }) => {
        const columnTasks = tasks.filter(filter);
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{label}</h3>
              <span className="text-xs text-zinc-600">{columnTasks.length}</span>
            </div>
            <div className="space-y-2">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/[0.02] border border-zinc-800/60 rounded-xl p-4 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-zinc-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-zinc-600">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-zinc-600">No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Timeline
function TimelineTab({ project, settings }) {
  const milestones = project.milestones || [];

  return (
    <div className="max-w-2xl">
      {milestones.length > 0 ? (
        <div className="relative">
          <div
            className="absolute left-[15px] top-8 bottom-8 w-0.5"
            style={{
              background: `linear-gradient(to bottom, ${settings.primary_color}40, transparent)`,
            }}
          />
          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={milestone.id || index} className="relative flex gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    milestone.completed
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50'
                      : 'bg-zinc-800 ring-2 ring-zinc-700'
                  }`}
                >
                  {milestone.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 bg-white/[0.02] border border-zinc-800/60 rounded-xl p-4 hover:bg-white/[0.04] transition-colors">
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
                      <span className="text-xs text-zinc-500 shrink-0 ml-4">
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
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <Milestone className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-zinc-500">No milestones defined yet</p>
        </div>
      )}
    </div>
  );
}

// Comments
function CommentsTab({ comments, newComment, setNewComment, onSubmit, submitting, settings, canComment }) {
  return (
    <div className="max-w-2xl space-y-6">
      {canComment && (
        <div className="bg-white/[0.02] border border-zinc-800/60 rounded-xl p-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-transparent text-white placeholder:text-zinc-600 resize-none focus:outline-none text-sm"
            rows={3}
          />
          <div className="flex justify-end mt-3 pt-3 border-t border-zinc-800/40">
            <button
              onClick={onSubmit}
              disabled={!newComment.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Comment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} settings={settings} />
        ))}
        {comments.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-zinc-600" />
            </div>
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
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-2 ring-zinc-800"
        style={{
          background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
        }}
      >
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-full h-full rounded-full object-cover"  loading="lazy" decoding="async" />
        ) : (
          <span className="text-white text-xs font-semibold">
            {author?.full_name?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{author?.full_name || 'Unknown'}</span>
          {isTeam && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full"
              style={{ backgroundColor: `${settings.primary_color}15`, color: settings.primary_color }}>
              Team
            </span>
          )}
          <span className="text-xs text-zinc-600">
            {formatTimeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-zinc-300 mt-1">{comment.content}</p>
      </div>
    </div>
  );
}

// Files
function FilesTab({ project, settings }) {
  const files = project.attachments || [];

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return Image;
    if (type?.includes('pdf')) return FileText;
    if (type?.includes('spreadsheet') || type?.includes('excel')) return FileSpreadsheet;
    return File;
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file, index) => {
        const Icon = getFileIcon(file.type);
        return (
          <div
            key={index}
            className="bg-white/[0.02] border border-zinc-800/60 rounded-xl p-4 hover:bg-white/[0.05] transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {file.size ? formatFileSize(file.size) : 'Unknown size'}
                </p>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        );
      })}
      {files.length === 0 && (
        <div className="col-span-full flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-zinc-500">No files attached</p>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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
