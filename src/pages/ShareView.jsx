import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "@/api/supabaseClient";
import {
  Folder, FolderOpen, Calendar, Clock, CheckCircle2, Circle, AlertCircle,
  ChevronRight, Target, Lock, Paperclip, Download, File, FileText, FileCode,
  FileSpreadsheet, Image, FileVideo, FileAudio, FileArchive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// Status configurations
const PROJECT_STATUSES = [
  { id: "planning", label: "Planning", color: "bg-purple-500", textColor: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  { id: "active", label: "Active", color: "bg-cyan-500", textColor: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30" },
  { id: "on_hold", label: "On Hold", color: "bg-amber-500", textColor: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  { id: "completed", label: "Completed", color: "bg-emerald-500", textColor: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  { id: "archived", label: "Archived", color: "bg-zinc-500", textColor: "text-zinc-400", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-500/30" },
];

const FOLDER_COLORS = [
  { id: "cyan", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", solid: "bg-cyan-500" },
  { id: "purple", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", solid: "bg-purple-500" },
  { id: "emerald", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", solid: "bg-emerald-500" },
  { id: "amber", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", solid: "bg-amber-500" },
  { id: "rose", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", solid: "bg-rose-500" },
];

// File type detection
const getFileTypeInfo = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  const types = {
    image: { exts: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'], icon: Image, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    document: { exts: ['doc', 'docx', 'txt', 'rtf', 'odt'], icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    spreadsheet: { exts: ['xls', 'xlsx', 'csv'], icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    code: { exts: ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'php', 'html', 'css', 'json'], icon: FileCode, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    video: { exts: ['mp4', 'avi', 'mov', 'wmv', 'webm'], icon: FileVideo, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    audio: { exts: ['mp3', 'wav', 'ogg', 'flac', 'm4a'], icon: FileAudio, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    archive: { exts: ['zip', 'rar', '7z', 'tar', 'gz'], icon: FileArchive, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  };

  for (const [, info] of Object.entries(types)) {
    if (info.exts.includes(ext)) return info;
  }
  return { icon: File, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Password Protection Screen
function PasswordProtection({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onUnlock(password, (valid) => {
      if (!valid) {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Lock className="w-6 h-6 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold text-white text-center mb-2">Password Protected</h2>
          <p className="text-sm text-zinc-500 text-center mb-6">Enter the password to view this content</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200">
              Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Shared Project View
function SharedProjectView({ project, tasks }) {
  const statusConfig = PROJECT_STATUSES.find(s => s.id === project?.status) || PROJECT_STATUSES[0];
  const settings = project?.share_settings || {};

  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "success").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const daysRemaining = project.due_date
    ? Math.ceil((new Date(project.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
            <Folder className="w-4 h-4" />
            <span>Project</span>
            {project.client_name && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-zinc-400">{project.client_name}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-white mb-3">
            {project.name}
          </h1>

          {project.description && (
            <p className="text-zinc-400 mb-6 max-w-2xl">
              {project.description}
            </p>
          )}

          {/* Status & Due Date */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.color} mr-2`} />
              {statusConfig.label}
            </Badge>
            {project.due_date && (
              <span className="text-sm text-zinc-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {daysRemaining !== null && daysRemaining > 0
                  ? `${daysRemaining} days remaining`
                  : daysRemaining === 0
                    ? 'Due today'
                    : new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Section */}
        {settings.show_tasks !== false && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-500 mb-1">Overall Progress</p>
                <p className="text-3xl font-semibold text-white">{progress}%</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xl font-semibold text-white">{completedTasks}</p>
                  <p className="text-xs text-zinc-500">Completed</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-cyan-400">{inProgressTasks}</p>
                  <p className="text-xs text-zinc-500">In Progress</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-zinc-500">{tasks.length - completedTasks - inProgressTasks}</p>
                  <p className="text-xs text-zinc-500">Remaining</p>
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-2 bg-zinc-800" />
          </div>
        )}

        {/* Tasks */}
        {settings.show_tasks !== false && tasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Tasks</h2>
            <div className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === "completed" || task.status === "success";
                const isInProgress = task.status === "in_progress";
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border ${
                      isCompleted
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : isInProgress
                          ? "bg-cyan-500/5 border-cyan-500/20"
                          : "bg-zinc-900/50 border-zinc-800"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? "bg-emerald-500/20" : isInProgress ? "bg-cyan-500/20" : "bg-zinc-800"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isInProgress ? (
                        <Clock className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isCompleted ? "text-zinc-500 line-through" : "text-white"}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-zinc-600 mt-0.5 truncate">{task.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : isInProgress
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}>
                      {isCompleted ? "Done" : isInProgress ? "In Progress" : "To Do"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestones */}
        {settings.show_milestones && project.milestones?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">Milestones</h2>
            <div className="space-y-2">
              {project.milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    milestone.completed
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-zinc-900/50 border-zinc-800"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    milestone.completed ? "bg-emerald-500/20" : "bg-zinc-800"
                  }`}>
                    {milestone.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Target className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${milestone.completed ? "text-zinc-500" : "text-white"}`}>
                      {milestone.title}
                    </p>
                    {milestone.due_date && (
                      <p className="text-xs text-zinc-600">Due: {new Date(milestone.due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files - Only show files marked as public */}
        {(() => {
          const publicFiles = (project.attachments || []).filter(f => f.is_public);
          if (publicFiles.length === 0) return null;

          return (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Files</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{publicFiles.length}</span>
              </div>
              <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden divide-y divide-zinc-800/50">
                {publicFiles.map((file) => {
                  const fileInfo = getFileTypeInfo(file.name);
                  const FileIcon = fileInfo.icon;

                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${fileInfo.bg} border border-zinc-700/30`}>
                        <FileIcon className={`w-5 h-5 ${fileInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-2">
                          <span>{formatFileSize(file.size)}</span>
                          {file.uploaded_at && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-600" />
                              <span>{new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </>
                          )}
                        </p>
                      </div>
                      {file.url && (
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="pt-8 border-t border-zinc-800/50 text-center">
          <p className="text-xs text-zinc-600">Shared via Project Portal</p>
        </div>
      </div>
    </div>
  );
}

// Shared Folder View
function SharedFolderView({ folder, projects, tasks }) {
  const colorConfig = FOLDER_COLORS.find(c => c.id === folder.cover_color) || FOLDER_COLORS[0];
  const settings = folder.share_settings || {};

  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const overallProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
            <FolderOpen className={`w-4 h-4 ${colorConfig.text}`} />
            <span>Client Folder</span>
            {folder.client_name && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-zinc-400">{folder.client_name}</span>
              </>
            )}
          </div>

          {/* Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl ${colorConfig.solid} flex items-center justify-center`}>
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">
                {folder.name}
              </h1>
              {folder.client_company && (
                <p className="text-sm text-zinc-500">{folder.client_company}</p>
              )}
            </div>
          </div>

          {folder.description && (
            <p className="text-zinc-400 mb-4 max-w-2xl">
              {folder.description}
            </p>
          )}

          {settings.welcome_message && (
            <p className="text-sm text-zinc-500 italic border-l-2 border-zinc-700 pl-4">
              {settings.welcome_message}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        {settings.show_overall_stats !== false && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-500 mb-1">Overall Progress</p>
                <p className="text-3xl font-semibold text-white">{overallProgress}%</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xl font-semibold text-white">{projects.length}</p>
                  <p className="text-xs text-zinc-500">Projects</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-emerald-400">{completedProjects}</p>
                  <p className="text-xs text-zinc-500">Completed</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-cyan-400">{projects.length - completedProjects}</p>
                  <p className="text-xs text-zinc-500">In Progress</p>
                </div>
              </div>
            </div>
            <Progress value={overallProgress} className="h-2 bg-zinc-800" />
          </div>
        )}

        {/* Projects List */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Projects ({projects.length})
          </h2>

          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project) => {
                const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
                const projectTasks = tasks.filter(t => t.project_id === project.id || String(t.project_id) === String(project.id));
                const completedTasks = projectTasks.filter(t => t.status === 'completed' || t.status === 'success').length;
                const progress = projectTasks.length > 0
                  ? Math.round((completedTasks / projectTasks.length) * 100)
                  : project.progress || 0;

                return (
                  <div
                    key={project.id}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Folder className={`w-5 h-5 ${statusConfig.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-medium text-white truncate">{project.name}</h3>
                          <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} text-xs`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{project.description}</p>
                        )}

                        {settings.show_individual_progress !== false && (
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Progress value={progress} className="h-1.5 bg-zinc-800" />
                            </div>
                            <span className="text-sm text-zinc-500">{progress}%</span>
                            {projectTasks.length > 0 && (
                              <span className="text-xs text-zinc-600">
                                {completedTasks}/{projectTasks.length} tasks
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-900/30 border border-zinc-800 rounded-xl">
              <Folder className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-500">No projects in this folder yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-zinc-800/50 text-center">
          <p className="text-xs text-zinc-600">Shared via Client Portal</p>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto pt-8">
        <Skeleton className="h-4 w-24 bg-zinc-800 mb-6" />
        <Skeleton className="h-10 w-64 bg-zinc-800 mb-3" />
        <Skeleton className="h-5 w-96 bg-zinc-800 mb-8" />
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <Skeleton className="h-8 w-32 bg-zinc-800 mb-4" />
          <Skeleton className="h-2 w-full bg-zinc-800" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Error Screen
function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-zinc-500 mb-6">
          {message || "This content is not available or the link has expired."}
        </p>
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
}

// Main ShareView Component
export default function ShareView() {
  const { type, shareId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [project, setProject] = useState(null);
  const [folder, setFolder] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadSharedContent();
  }, [type, shareId]);

  const loadSharedContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Decode the shareId - it could be base64 encoded
      // Handle both old format (project-{id}-{timestamp} truncated) and new format (just id)
      let decodedId;
      let extractedId;
      try {
        decodedId = atob(shareId);
        // Check if it's in old format "project-{id}" or "folder-{id}"
        const projectMatch = decodedId.match(/^project-(.+?)(?:-|$)/);
        const folderMatch = decodedId.match(/^folder-(.+?)(?:-|$)/);
        if (projectMatch) {
          extractedId = projectMatch[1];
        } else if (folderMatch) {
          extractedId = folderMatch[1];
        } else {
          extractedId = decodedId;
        }
      } catch {
        decodedId = shareId;
        extractedId = shareId;
      }

      // Fetch all data and find matching items
      const [projectActions, taskActions] = await Promise.all([
        db.entities.ActionLog.filter({ action_type: "project" }).catch(() => []),
        db.entities.ActionLog.filter({ action_type: "task" }).catch(() => []),
      ]);

      const allProjects = projectActions.map(p => ({
        id: p.id,
        name: p.title || p.action_description || "Untitled Project",
        description: p.description || p.notes,
        status: mapStatus(p.status),
        priority: p.priority || "medium",
        category: p.category || "development",
        start_date: p.start_date,
        due_date: p.due_date,
        budget: p.budget,
        spent: p.spent || 0,
        client_name: p.client_name,
        team_members: p.team_members || [],
        tags: p.tags || [],
        milestones: p.milestones || [],
        attachments: p.attachments || [],
        share_settings: p.share_settings || {
          is_public: false,
          share_link: "",
          allow_comments: true,
          show_budget: false,
          show_tasks: true,
          show_milestones: true,
          show_timeline: true,
          password_protected: false,
          password: "",
        },
        client_updates: p.client_updates || [],
        page_content: p.page_content || [],
        created_date: p.created_date,
        progress: 0,
      }));

      const allTasks = taskActions.map(t => ({
        id: t.id,
        title: t.title || t.action_description,
        description: t.description,
        status: t.status === "success" ? "completed" : t.status === "pending" ? "todo" : t.status,
        priority: t.priority || "medium",
        due_date: t.due_date,
        project_id: t.project_id,
        created_date: t.created_date,
      }));

      // Calculate progress for each project
      allProjects.forEach(p => {
        const projectTasks = allTasks.filter(t => t.project_id === p.id || String(t.project_id) === String(p.id));
        const completedTasks = projectTasks.filter(t => t.status === "completed" || t.status === "success").length;
        p.progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
      });

      if (type === "project") {
        // Find project by ID or by share link containing the shareId
        // The shareId should be base64 encoded project ID
        const foundProject = allProjects.find(p => {
          // Direct match with extracted ID (most reliable)
          if (p.id === extractedId) return true;
          // Direct match with decoded ID
          if (p.id === decodedId) return true;
          // Direct match with raw shareId
          if (p.id === shareId) return true;
          // Check if share link contains this shareId
          if (p.share_settings?.share_link?.includes(shareId)) return true;
          // Also try matching the end of share_link (the token part)
          const linkParts = p.share_settings?.share_link?.split('/');
          if (linkParts && linkParts[linkParts.length - 1] === shareId) return true;
          // Try numeric comparison in case IDs are stored as numbers
          if (p.id == extractedId) return true;
          return false;
        });

        if (!foundProject) {
          setError("Project not found or the share link is invalid");
          return;
        }

        if (!foundProject.share_settings?.is_public) {
          setError("This project is not publicly shared. The owner needs to enable sharing.");
          return;
        }

        if (foundProject.share_settings?.password_protected && foundProject.share_settings?.password) {
          setNeedsPassword(true);
          setProject(foundProject);
          setTasks(allTasks.filter(t => t.project_id === foundProject.id || String(t.project_id) === String(foundProject.id)));
        } else {
          setProject(foundProject);
          setTasks(allTasks.filter(t => t.project_id === foundProject.id || String(t.project_id) === String(foundProject.id)));
          setIsAuthenticated(true);
        }
      } else if (type === "folder") {
        // For folders, we check localStorage where folders are stored
        // Since folders are client-side only for now, we'll show a message
        try {
          const storedFolders = localStorage.getItem('project_folders');
          if (storedFolders) {
            const folders = JSON.parse(storedFolders);
            const foundFolder = folders.find(f => {
              if (f.id === extractedId) return true;
              if (f.id === decodedId) return true;
              if (f.id === shareId) return true;
              if (f.share_settings?.share_link?.includes(shareId)) return true;
              const linkParts = f.share_settings?.share_link?.split('/');
              if (linkParts && linkParts[linkParts.length - 1] === shareId) return true;
              return false;
            });

            if (foundFolder && foundFolder.share_settings?.is_public) {
              const folderProjectIds = foundFolder.project_ids || [];
              const folderProjects = allProjects.filter(p => folderProjectIds.includes(p.id));
              setFolder(foundFolder);
              setProjects(folderProjects);
              setTasks(allTasks);
              setIsAuthenticated(true);
            } else {
              setError("Folder not found or sharing is not enabled");
            }
          } else {
            setError("Folder data not available. Folders are stored locally and may not be accessible from different browsers.");
          }
        } catch (e) {
          setError("Failed to load folder data");
        }
      }
    } catch (err) {
      console.error("Error loading shared content:", err);
      setError("Failed to load shared content");
    } finally {
      setLoading(false);
    }
  };

  const mapStatus = (dbStatus) => {
    if (dbStatus === "success" || dbStatus === "completed") return "completed";
    if (dbStatus === "cancelled") return "archived";
    if (dbStatus === "in_progress") return "active";
    if (dbStatus === "on_hold") return "on_hold";
    return "planning";
  };

  const handlePasswordUnlock = (enteredPassword, callback) => {
    if (project?.share_settings?.password === enteredPassword) {
      setIsAuthenticated(true);
      setNeedsPassword(false);
      callback(true);
    } else {
      callback(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (needsPassword && !isAuthenticated) {
    return <PasswordProtection onUnlock={handlePasswordUnlock} />;
  }

  if (type === "project" && project) {
    return <SharedProjectView project={project} tasks={tasks} />;
  }

  if (type === "folder" && folder) {
    return <SharedFolderView folder={folder} projects={projects} tasks={tasks} />;
  }

  return <ErrorScreen message="Invalid share link" />;
}
