import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useUser } from "@/components/context/UserContext";
import {
  Plus, Search, Filter, Folder, FolderOpen, Calendar, Users, MoreVertical, X,
  Clock, CheckCircle2, Circle, AlertCircle, ChevronRight, ChevronDown, ChevronLeft,
  Trash2, Edit2, ExternalLink, Target, TrendingUp, BarChart3, List, Columns,
  LayoutGrid, Play, Pause, Archive, Flag, DollarSign, Wallet, Timer,
  CalendarDays, CalendarRange, Milestone, GitBranch, Link2, FileText, Paperclip,
  MessageSquare, Send, GripVertical, ArrowRight, ArrowUpRight, Settings2,
  PieChart, Activity, Layers, UserPlus, Eye, EyeOff, Copy, Share2, Upload, Image,
  File, FileCode, FileSpreadsheet, FileVideo, FileAudio, FileArchive,
  Download, Globe, Lock, Unlock, LinkIcon, QrCode, Bell, History, Hash,
  AtSign, Quote, Bold, Italic, ListOrdered, ListChecks, Code, CheckSquare,
  Heading1, Heading2, AlignLeft, Table, User, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PROJECT_STATUSES = [
  { id: "planning", label: "Planning", color: "bg-zinc-600", textColor: "text-zinc-400", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-500/30", icon: Target },
  { id: "active", label: "Active", color: "bg-cyan-500", textColor: "text-cyan-400/80", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", icon: Play },
  { id: "on_hold", label: "On Hold", color: "bg-cyan-600/60", textColor: "text-cyan-400/60", bgColor: "bg-cyan-500/5", borderColor: "border-cyan-500/20", icon: Pause },
  { id: "completed", label: "Completed", color: "bg-cyan-400", textColor: "text-cyan-300", bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/40", icon: CheckCircle2 },
  { id: "archived", label: "Archived", color: "bg-zinc-700", textColor: "text-zinc-500", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-600/30", icon: Archive },
];

const PRIORITY_LEVELS = [
  { id: "low", label: "Low", color: "text-zinc-400", bgColor: "bg-zinc-500/10", borderColor: "border-zinc-500/30" },
  { id: "medium", label: "Medium", color: "text-cyan-400/70", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/25" },
  { id: "high", label: "High", color: "text-cyan-400/90", bgColor: "bg-cyan-500/15", borderColor: "border-cyan-500/35" },
  { id: "critical", label: "Critical", color: "text-cyan-300", bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/45" },
];

const PROJECT_CATEGORIES = [
  { id: "development", label: "Development", color: "cyan" },
  { id: "design", label: "Design", color: "cyan" },
  { id: "marketing", label: "Marketing", color: "cyan" },
  { id: "sales", label: "Sales", color: "cyan" },
  { id: "operations", label: "Operations", color: "cyan" },
  { id: "research", label: "Research", color: "cyan" },
  { id: "other", label: "Other", color: "zinc" },
];

const emptyProject = {
  name: "",
  description: "",
  status: "planning",
  priority: "medium",
  category: "development",
  start_date: "",
  due_date: "",
  budget: "",
  spent: "",
  client_name: "",
  team_members: [],
  tags: [],
  milestones: [],
  attachments: [],
  share_settings: {
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
  client_updates: [],
  page_content: [],
  folder_id: null, // Reference to parent folder
};

// Project Folder for grouping projects by client
const emptyFolder = {
  name: "",
  description: "",
  client_name: "",
  client_email: "",
  client_company: "",
  cover_color: "cyan", // cyan, purple, emerald, amber, rose
  project_ids: [],
  share_settings: {
    is_public: false,
    share_link: "",
    allow_comments: true,
    show_individual_progress: true,
    show_overall_stats: true,
    password_protected: false,
    password: "",
    welcome_message: "",
  },
  created_date: "",
};

const FOLDER_COLORS = [
  { id: "cyan", gradient: "from-cyan-500 to-cyan-600", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  { id: "purple", gradient: "from-purple-500 to-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  { id: "emerald", gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  { id: "amber", gradient: "from-amber-500 to-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  { id: "rose", gradient: "from-rose-500 to-rose-600", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" },
];

// File type icons mapping
const FILE_TYPE_ICONS = {
  image: { icon: Image, color: "text-purple-400", bg: "bg-purple-500/10" },
  pdf: { icon: FileText, color: "text-red-400", bg: "bg-red-500/10" },
  spreadsheet: { icon: FileSpreadsheet, color: "text-green-400", bg: "bg-green-500/10" },
  code: { icon: FileCode, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  video: { icon: FileVideo, color: "text-pink-400", bg: "bg-pink-500/10" },
  audio: { icon: FileAudio, color: "text-orange-400", bg: "bg-orange-500/10" },
  archive: { icon: FileArchive, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  document: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  default: { icon: File, color: "text-zinc-400", bg: "bg-zinc-500/10" },
};

const getFileTypeInfo = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return FILE_TYPE_ICONS.image;
  if (['pdf'].includes(ext)) return FILE_TYPE_ICONS.pdf;
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(ext)) return FILE_TYPE_ICONS.spreadsheet;
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'md'].includes(ext)) return FILE_TYPE_ICONS.code;
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return FILE_TYPE_ICONS.video;
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return FILE_TYPE_ICONS.audio;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return FILE_TYPE_ICONS.archive;
  if (['doc', 'docx', 'txt', 'rtf', 'pages'].includes(ext)) return FILE_TYPE_ICONS.document;
  return FILE_TYPE_ICONS.default;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const generateShareLink = (projectId) => {
  const baseUrl = window.location.origin;
  // Encode project ID in base64 for the share link
  const token = btoa(projectId);
  return `${baseUrl}/share/project/${token}`;
};

const generateFolderShareLink = (folderId) => {
  const baseUrl = window.location.origin;
  // Encode folder ID in base64 for the share link
  const token = btoa(folderId || `folder-${Date.now()}`);
  return `${baseUrl}/share/folder/${token}`;
};

// Progress Ring Component
function ProgressRing({ progress, size = 40, strokeWidth = 3 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = (p) => {
    if (p >= 80) return "text-cyan-400";
    if (p >= 50) return "text-cyan-400/80";
    if (p >= 25) return "text-cyan-400/60";
    return "text-zinc-500";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={getColor(progress)}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${getColor(progress)}`}>
        {progress}%
      </span>
    </div>
  );
}

// File Drop Zone Component - Premium Design
function FileDropZone({ onFilesAdded, files = [], onRemoveFile, onTogglePublic }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
      url: URL.createObjectURL(file),
      is_public: false, // Default to internal/private
    }));

    onFilesAdded(droppedFiles);
    toast.success(`${droppedFiles.length} file(s) uploaded`);
  }, [onFilesAdded]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString(),
      url: URL.createObjectURL(file),
      is_public: false, // Default to internal/private
    }));

    onFilesAdded(selectedFiles);
    toast.success(`${selectedFiles.length} file(s) uploaded`);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Premium Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? "border-cyan-500 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5"
            : "border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/20 hover:bg-zinc-800/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Animated Background */}
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-cyan-500/10 to-cyan-500/5 animate-pulse" />
        )}

        <div className="relative">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragging
              ? "bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 shadow-lg shadow-cyan-500/20 scale-110"
              : "bg-zinc-800/80 border border-zinc-700/50"
          }`}>
            <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-cyan-400" : "text-zinc-500"}`} />
          </div>
          <p className={`text-sm font-medium mb-1 transition-colors ${isDragging ? "text-cyan-400" : "text-zinc-300"}`}>
            {isDragging ? "Release to upload" : "Drag and drop files"}
          </p>
          <p className="text-xs text-zinc-500">or click to browse from your computer</p>
          <p className="text-xs text-zinc-600 mt-2">Supports all file types</p>
        </div>
      </div>

      {/* File List - Premium */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-zinc-500" />
              <h4 className="text-sm font-medium text-zinc-300">Attachments</h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{files.length}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-800/30 border border-zinc-700/40 overflow-hidden divide-y divide-zinc-700/30">
            {files.map((file, index) => {
              const fileInfo = getFileTypeInfo(file.name);
              const FileIcon = fileInfo.icon;

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${fileInfo.bg} border border-zinc-700/30`}>
                    <FileIcon className={`w-5 h-5 ${fileInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-2">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-600" />
                      <span>{new Date(file.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Public/Private Toggle - Always visible */}
                    <Button
                      size="sm"
                      className={`h-7 px-2 text-xs transition-all ${
                        file.is_public
                          ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700"
                      }`}
                      onClick={(e) => { e.stopPropagation(); onTogglePublic?.(file.id); }}
                      title={file.is_public ? "Visible to clients" : "Internal only"}
                    >
                      {file.is_public ? (
                        <><Eye className="w-3 h-3 mr-1" /> Public</>
                      ) : (
                        <><EyeOff className="w-3 h-3 mr-1" /> Internal</>
                      )}
                    </Button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700"
                        onClick={(e) => { e.stopPropagation(); window.open(file.url, '_blank'); }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/30"
                        onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); toast.success("File removed"); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-zinc-600">No files attached yet</p>
        </div>
      )}
    </div>
  );
}

// Client Update Component
function ClientUpdateItem({ update, isOwner, onDelete }) {
  return (
    <div className="relative pl-6 pb-6 border-l-2 border-zinc-800 last:border-l-transparent last:pb-0">
      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50" />
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px] bg-cyan-500/15 text-cyan-400/80">
                {update.author?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white">{update.author || 'Team'}</span>
            <span className="text-xs text-zinc-500">
              {new Date(update.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-500 hover:text-red-400"
              onClick={() => onDelete(update.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="text-sm text-zinc-300 whitespace-pre-wrap">{update.content}</div>
        {update.attachments?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {update.attachments.map((att, i) => {
              const fileInfo = getFileTypeInfo(att.name);
              const FileIcon = fileInfo.icon;
              return (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <FileIcon className={`w-3 h-3 ${fileInfo.color}`} />
                  {att.name}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Premium Toggle Switch Component
function PremiumToggle({ enabled, onChange, size = "default" }) {
  const sizes = {
    small: { track: "w-8 h-4", thumb: "w-3 h-3", translate: "translate-x-4" },
    default: { track: "w-11 h-6", thumb: "w-5 h-5", translate: "translate-x-5" },
  };
  const s = sizes[size] || sizes.default;

  return (
    <button
      onClick={onChange}
      className={`relative ${s.track} rounded-full transition-all duration-300 ease-out ${
        enabled
          ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-lg shadow-cyan-500/30'
          : 'bg-zinc-700/80 hover:bg-zinc-600/80'
      }`}
    >
      <div className={`absolute top-0.5 left-0.5 ${s.thumb} rounded-full bg-white shadow-md transition-all duration-300 ease-out ${
        enabled ? s.translate : 'translate-x-0'
      }`} />
    </button>
  );
}

// Share Settings Panel - Premium Design
function ShareSettingsPanel({ project, onUpdateSettings, onGenerateLink }) {
  const [settings, setSettings] = useState(project?.share_settings || {});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSettings(project?.share_settings || {});
  }, [project]);

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const copyLink = async () => {
    if (settings.share_link) {
      await navigator.clipboard.writeText(settings.share_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateLink = () => {
    const link = generateShareLink(project.id);
    const newSettings = { ...settings, share_link: link, is_public: true };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
    onGenerateLink?.(link);
  };

  return (
    <div className="space-y-5">
      {/* Share Link Section - Premium Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Public Sharing</span>
                <p className="text-xs text-zinc-500">Share this project with clients</p>
              </div>
            </div>
            <PremiumToggle enabled={settings.is_public} onChange={() => handleToggle('is_public')} />
          </div>

          <AnimatePresence>
            {settings.is_public && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {settings.share_link ? (
                  <div className="flex items-center gap-2 p-1 bg-zinc-900/80 rounded-xl border border-zinc-700/50">
                    <Input
                      value={settings.share_link}
                      readOnly
                      className="bg-transparent border-0 text-xs text-zinc-400 focus:ring-0"
                    />
                    <Button
                      size="sm"
                      className={`shrink-0 transition-all duration-300 ${
                        copied
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      } border`}
                      onClick={copyLink}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateLink}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0 h-11"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Share Link
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Visibility Options - Premium List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <Eye className="w-3.5 h-3.5 text-zinc-500" />
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Client Visibility</h4>
        </div>

        <div className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden divide-y divide-zinc-700/30">
          {[
            { key: 'show_tasks', label: 'Tasks & Progress', desc: 'Show task completion status', icon: CheckSquare },
            { key: 'show_milestones', label: 'Milestones', desc: 'Display project milestones', icon: Milestone },
            { key: 'show_timeline', label: 'Timeline', desc: 'Show project schedule', icon: CalendarRange },
            { key: 'show_budget', label: 'Budget Information', desc: 'Reveal financial details', icon: DollarSign },
            { key: 'allow_comments', label: 'Allow Comments', desc: 'Let clients leave feedback', icon: MessageSquare },
          ].map(({ key, label, desc, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  settings[key] ? 'bg-cyan-500/15 text-cyan-400' : 'bg-zinc-700/50 text-zinc-500'
                } transition-colors`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-medium text-zinc-200">{label}</span>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
              <PremiumToggle
                enabled={settings[key]}
                onChange={() => handleToggle(key)}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Password Protection - Premium Card */}
      <div className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              settings.password_protected ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-700/50 text-zinc-500'
            } transition-colors`}>
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-medium text-zinc-200">Password Protection</span>
              <p className="text-xs text-zinc-500">Require password to access</p>
            </div>
          </div>
          <PremiumToggle
            enabled={settings.password_protected}
            onChange={() => handleToggle('password_protected')}
            size="small"
          />
        </div>

        <AnimatePresence>
          {settings.password_protected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4 overflow-hidden"
            >
              <Input
                type="password"
                placeholder="Enter a secure password"
                value={settings.password || ''}
                onChange={(e) => {
                  const newSettings = { ...settings, password: e.target.value };
                  setSettings(newSettings);
                  onUpdateSettings(newSettings);
                }}
                className="bg-zinc-900/60 border-zinc-700/50 text-sm placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Notion-like Page Block Component
function PageBlock({ block, onUpdate, onDelete, isEditing }) {
  const [content, setContent] = useState(block.content || '');
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  const blockTypes = {
    text: { icon: AlignLeft, placeholder: "Type something..." },
    heading1: { icon: Heading1, placeholder: "Heading 1" },
    heading2: { icon: Heading2, placeholder: "Heading 2" },
    bullet: { icon: List, placeholder: "List item" },
    numbered: { icon: ListOrdered, placeholder: "1. List item" },
    checklist: { icon: ListChecks, placeholder: "To-do item" },
    quote: { icon: Quote, placeholder: "Quote" },
    code: { icon: Code, placeholder: "Code block" },
    divider: { icon: null, placeholder: null },
  };

  const blockConfig = blockTypes[block.type] || blockTypes.text;

  if (block.type === 'divider') {
    return <div className="border-t border-zinc-800 my-4" />;
  }

  const handleSave = () => {
    onUpdate(block.id, { ...block, content });
    setIsLocalEditing(false);
  };

  const getBlockStyles = () => {
    switch (block.type) {
      case 'heading1': return 'text-2xl font-bold text-white';
      case 'heading2': return 'text-xl font-semibold text-white';
      case 'quote': return 'text-zinc-400 italic border-l-2 border-cyan-500 pl-4';
      case 'code': return 'font-mono text-sm bg-zinc-800 p-3 rounded-lg text-cyan-300';
      case 'bullet': return 'text-zinc-300 pl-4 before:content-["•"] before:mr-2 before:text-cyan-500';
      case 'numbered': return 'text-zinc-300';
      case 'checklist': return 'text-zinc-300';
      default: return 'text-zinc-300';
    }
  };

  return (
    <div className="group relative">
      {isEditing && (
        <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {isLocalEditing && isEditing ? (
        <div className="flex items-start gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={blockConfig.placeholder}
            className="flex-1 bg-zinc-800/50 border-zinc-700 min-h-[60px]"
            autoFocus
          />
          <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500">
            Save
          </Button>
        </div>
      ) : (
        <div
          onClick={() => isEditing && setIsLocalEditing(true)}
          className={`${getBlockStyles()} ${isEditing ? 'cursor-text hover:bg-zinc-800/30 rounded px-2 py-1 -mx-2' : ''}`}
        >
          {block.type === 'checklist' ? (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={block.checked} readOnly className="rounded" />
              <span className={block.checked ? 'line-through text-zinc-500' : ''}>{content || blockConfig.placeholder}</span>
            </div>
          ) : (
            content || (isEditing && <span className="text-zinc-600">{blockConfig.placeholder}</span>)
          )}
        </div>
      )}
    </div>
  );
}

// Client Portal / Shareable Project View - Premium Design
function ShareableProjectView({ project, tasks, isOwner, onAddUpdate, onDeleteUpdate }) {
  const [newUpdate, setNewUpdate] = useState('');
  const statusConfig = PROJECT_STATUSES.find(s => s.id === project?.status) || PROJECT_STATUSES[0];

  if (!project) return null;

  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "success").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const settings = project.share_settings || {};

  const handlePostUpdate = () => {
    if (!newUpdate.trim()) return;
    onAddUpdate({
      id: `update-${Date.now()}`,
      content: newUpdate,
      author: 'Team',
      created_at: new Date().toISOString(),
      attachments: [],
    });
    setNewUpdate('');
  };

  // Calculate days remaining
  const daysRemaining = project.due_date
    ? Math.ceil((new Date(project.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden">
        {/* Gradient Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0b]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-16">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-zinc-500 text-sm mb-8"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50">
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-400">Project Portal</span>
              {project.client_name && (
                <>
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-300">{project.client_name}</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Title Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-lg text-zinc-400 mb-8 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
                <div className={`w-2 h-2 rounded-full ${statusConfig.color} animate-pulse`} />
                <span className={`text-sm font-medium ${statusConfig.textColor}`}>{statusConfig.label}</span>
              </div>
              {project.due_date && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/60 border border-zinc-700/50 backdrop-blur-sm">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">
                    {daysRemaining !== null && daysRemaining > 0
                      ? `${daysRemaining} days remaining`
                      : daysRemaining === 0
                        ? 'Due today'
                        : new Date(project.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    }
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-4">
        {/* Premium Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/40 backdrop-blur-xl mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
          <div className="relative p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div>
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1">Overall Progress</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
                    {progress}%
                  </span>
                  <span className="text-zinc-500">complete</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex gap-6">
                <div className="text-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/30">
                  <div className="text-2xl font-bold text-white">{completedTasks}</div>
                  <div className="text-xs text-zinc-500 mt-1">Completed</div>
                </div>
                <div className="text-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/30">
                  <div className="text-2xl font-bold text-cyan-400">{inProgressTasks}</div>
                  <div className="text-xs text-zinc-500 mt-1">In Progress</div>
                </div>
                <div className="text-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/30">
                  <div className="text-2xl font-bold text-zinc-400">{tasks.length - completedTasks - inProgressTasks}</div>
                  <div className="text-xs text-zinc-500 mt-1">Remaining</div>
                </div>
              </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300 rounded-full"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Tasks Section */}
          {(settings.show_tasks !== false) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-700/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                      <CheckSquare className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">Tasks</h2>
                      <p className="text-xs text-zinc-500">{completedTasks} of {tasks.length} completed</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                {tasks.length > 0 ? tasks.slice(0, 15).map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      task.status === 'completed' || task.status === 'success'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : task.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-700/50 text-zinc-500'
                    }`}>
                      {task.status === 'completed' || task.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${
                      task.status === 'completed' || task.status === 'success'
                        ? 'text-zinc-500 line-through'
                        : 'text-zinc-300'
                    }`}>
                      {task.title}
                    </span>
                    {task.status === 'in_progress' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        In Progress
                      </span>
                    )}
                  </motion.div>
                )) : (
                  <div className="text-center py-8 text-zinc-500">
                    <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tasks yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Sidebar - Milestones & Timeline */}
          <div className="space-y-6">
            {/* Milestones */}
            {(settings.show_milestones !== false) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-700/40">
                  <div className="flex items-center gap-2">
                    <Milestone className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Milestones</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {project.milestones?.length > 0 ? project.milestones.map((milestone, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        milestone.completed
                          ? 'bg-cyan-400 shadow-lg shadow-cyan-400/30'
                          : 'bg-zinc-600 border-2 border-zinc-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${milestone.completed ? 'text-zinc-500' : 'text-zinc-300'}`}>
                          {milestone.name}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-zinc-500 text-center py-4">No milestones</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Timeline */}
            {(settings.show_timeline !== false) && project.start_date && project.due_date && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CalendarRange className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Timeline</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Start</span>
                    <span className="text-zinc-300">{new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="relative h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Due</span>
                    <span className="text-zinc-300">{new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Budget */}
            {settings.show_budget && project.budget && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Budget</h3>
                </div>
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  ${(parseFloat(project.spent) || 0).toLocaleString()}
                </div>
                <p className="text-xs text-zinc-500">
                  of ${parseFloat(project.budget).toLocaleString()} budget
                </p>
                <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((parseFloat(project.spent || 0) / parseFloat(project.budget)) * 100))}%` }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Updates Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden mb-8"
        >
          <div className="p-5 border-b border-zinc-700/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/20">
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Updates</h2>
                <p className="text-xs text-zinc-500">Latest project activity</p>
              </div>
            </div>
          </div>

          {/* Add Update (for owner) */}
          {isOwner && (
            <div className="p-5 border-b border-zinc-700/40 bg-zinc-900/30">
              <Textarea
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Share a progress update..."
                className="bg-zinc-800/50 border-zinc-700/50 resize-none focus:ring-cyan-500/20 focus:border-cyan-500/50 min-h-[100px] text-zinc-300 placeholder:text-zinc-600"
                rows={3}
              />
              <div className="flex items-center justify-between mt-3">
                <Button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 border border-zinc-700">
                  <Paperclip className="w-4 h-4 mr-1" />
                  Attach
                </Button>
                <Button
                  onClick={handlePostUpdate}
                  disabled={!newUpdate.trim()}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post Update
                </Button>
              </div>
            </div>
          )}

          {/* Updates List */}
          <div className="p-5">
            {(project.client_updates || []).length > 0 ? (
              <div className="space-y-4">
                {project.client_updates.map((update, i) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="relative pl-8 pb-6 border-l-2 border-zinc-700/50 last:border-l-transparent last:pb-0"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 shadow-lg shadow-cyan-500/30" />
                    <div className="bg-zinc-800/30 rounded-xl p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {update.author?.charAt(0) || 'T'}
                          </div>
                          <span className="text-sm font-medium text-zinc-300">{update.author || 'Team'}</span>
                          <span className="text-xs text-zinc-600">•</span>
                          <span className="text-xs text-zinc-500">
                            {new Date(update.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => onDeleteUpdate(update.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{update.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                  <History className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium">No updates yet</p>
                <p className="text-sm text-zinc-600 mt-1">Check back soon for project updates</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Premium Footer */}
      <div className="border-t border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-zinc-500">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center">
                <Folder className="w-3 h-3 text-cyan-400" />
              </div>
              <span>Project Portal</span>
            </div>
            <span className="text-zinc-600">Last updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROJECT FOLDERS COMPONENTS
// ============================================

// Folder Card Component
function FolderCard({ folder, projects, onClick }) {
  const colorConfig = FOLDER_COLORS.find(c => c.id === folder.cover_color) || FOLDER_COLORS[0];
  const folderProjects = projects.filter(p => folder.project_ids?.includes(p.id));
  const completedProjects = folderProjects.filter(p => p.status === 'completed').length;
  const totalProjects = folderProjects.length;
  const overallProgress = totalProjects > 0
    ? Math.round(folderProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalProjects)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      className="relative overflow-hidden bg-zinc-900/50 border border-zinc-800/60 rounded-2xl cursor-pointer hover:border-zinc-700 transition-all group"
    >
      {/* Color Header */}
      <div className={`h-2 bg-gradient-to-r ${colorConfig.gradient}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${colorConfig.bg} border ${colorConfig.border} flex items-center justify-center`}>
              <FolderOpen className={`w-6 h-6 ${colorConfig.text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                {folder.name}
              </h3>
              {folder.client_company && (
                <p className="text-xs text-zinc-500">{folder.client_company}</p>
              )}
            </div>
          </div>
          {folder.share_settings?.is_public && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-cyan-400">Shared</span>
            </div>
          )}
        </div>

        {/* Description */}
        {folder.description && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-4">{folder.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-zinc-800/50">
            <div className="text-lg font-bold text-white">{totalProjects}</div>
            <div className="text-xs text-zinc-500">Projects</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-800/50">
            <div className="text-lg font-bold text-cyan-400">{completedProjects}</div>
            <div className="text-xs text-zinc-500">Completed</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-zinc-800/50">
            <div className="text-lg font-bold text-white">{overallProgress}%</div>
            <div className="text-xs text-zinc-500">Progress</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorConfig.gradient} rounded-full`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/60">
          {folder.client_name && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className={`text-[10px] ${colorConfig.bg} ${colorConfig.text}`}>
                  {folder.client_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-zinc-400">{folder.client_name}</span>
            </div>
          )}
          <div className="flex -space-x-1">
            {folderProjects.slice(0, 3).map((p, i) => {
              const status = PROJECT_STATUSES.find(s => s.id === p.status) || PROJECT_STATUSES[0];
              return (
                <div key={i} className={`w-5 h-5 rounded-full ${status.bgColor} border border-zinc-900 flex items-center justify-center`}>
                  <div className={`w-2 h-2 rounded-full ${status.color}`} />
                </div>
              );
            })}
            {folderProjects.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-zinc-400">
                +{folderProjects.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Folder Detail Sheet
function FolderDetailSheet({
  folder,
  projects,
  allProjects,
  tasks,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateSettings,
  onRemoveProject,
  onAddProjects,
  onViewProject
}) {
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [showAddProjects, setShowAddProjects] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  if (!folder) return null;

  const colorConfig = FOLDER_COLORS.find(c => c.id === folder.cover_color) || FOLDER_COLORS[0];
  const folderProjects = projects;
  const availableProjects = allProjects.filter(p => !(folder.project_ids || []).includes(p.id));
  const completedProjects = folderProjects.filter(p => p.status === 'completed').length;
  const overallProgress = folderProjects.length > 0
    ? Math.round(folderProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / folderProjects.length)
    : 0;

  const handleUpdateShareSettings = (newSettings) => {
    onUpdateSettings?.({ share_settings: newSettings });
  };

  const handleGenerateLink = () => {
    const link = generateFolderShareLink(folder.id);
    const newSettings = { ...folder.share_settings, share_link: link, is_public: true };
    onUpdateSettings?.({ share_settings: newSettings });
    toast.success("Folder share link generated!");
  };

  const handleAddSelectedProjects = () => {
    if (selectedProjectIds.length > 0) {
      onAddProjects(selectedProjectIds);
      setSelectedProjectIds([]);
      setShowAddProjects(false);
      toast.success(`${selectedProjectIds.length} project(s) added to folder`);
    }
  };

  // Share Preview
  if (showSharePreview) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-5xl bg-[#0a0a0b] border-zinc-800/60 overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-zinc-800/50 p-4">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={() => setShowSharePreview(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Folder
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-medium text-cyan-400">Client Portal Preview</span>
              </div>
            </div>
          </div>
          <ShareableFolderView folder={folder} projects={folderProjects} tasks={tasks} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800/60 overflow-y-auto p-0">
        {/* Header */}
        <div className={`relative overflow-hidden`}>
          <div className={`h-2 bg-gradient-to-r ${colorConfig.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" style={{ top: '8px' }} />
          <div className={`absolute inset-0 ${colorConfig.bg} opacity-30`} style={{ top: '8px' }} />

          <div className="relative p-6 pt-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${colorConfig.bg} border ${colorConfig.border} flex items-center justify-center`}>
                  <FolderOpen className={`w-7 h-7 ${colorConfig.text}`} />
                </div>
                <div>
                  <SheetTitle className="text-white text-xl">{folder.name}</SheetTitle>
                  {folder.client_company && <p className="text-zinc-400 text-sm">{folder.client_company}</p>}
                </div>
              </div>
              {folder.share_settings?.is_public && (
                <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                  <Globe className="w-3 h-3 mr-1" />
                  Shared
                </Badge>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/50">
                <div className="text-2xl font-bold text-white">{folderProjects.length}</div>
                <div className="text-xs text-zinc-500">Projects</div>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/50">
                <div className="text-2xl font-bold text-cyan-400">{completedProjects}</div>
                <div className="text-xs text-zinc-500">Completed</div>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/50">
                <div className="text-2xl font-bold text-white">{overallProgress}%</div>
                <div className="text-xs text-zinc-500">Progress</div>
              </div>
              <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-zinc-800/50">
                <ProgressRing progress={overallProgress} size={40} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Button
              size="sm"
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0"
              onClick={() => setShowAddProjects(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Projects
            </Button>
            <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700" onClick={() => onEdit(folder)}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
              onClick={() => setShowSharePreview(true)}
            >
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </div>

          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-zinc-800/50 border border-zinc-700/50 mb-4 w-full grid grid-cols-3 p-1 rounded-xl">
              <TabsTrigger value="projects" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Projects</TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Details</TabsTrigger>
              <TabsTrigger value="share" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Share</TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects">
              <div className="space-y-3">
                {folderProjects.length > 0 ? folderProjects.map((project) => {
                  const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
                  const projectTasks = tasks.filter(t => t.project_id === project.id);
                  const completedTasks = projectTasks.filter(t => t.status === 'completed' || t.status === 'success').length;
                  const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : project.progress || 0;

                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                      onClick={() => onViewProject?.(project)}
                    >
                      <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center`}>
                        <Folder className={`w-5 h-5 ${statusConfig.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate hover:text-cyan-400 transition-colors">{project.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} text-[10px]`}>
                            {statusConfig.label}
                          </Badge>
                          <span className="text-xs text-zinc-500">{progress}% complete</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-zinc-800 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400 border border-zinc-700 hover:border-cyan-500/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProject?.(project);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveProject(project.id);
                            toast.success("Project removed from folder");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                      <Folder className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 font-medium">No projects in this folder</p>
                    <p className="text-sm text-zinc-600 mt-1">Add projects to share them with your client</p>
                    <Button
                      className="mt-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white"
                      onClick={() => setShowAddProjects(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Projects
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {folder.description && (
                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                  <h4 className="text-xs text-zinc-500 mb-2">Description</h4>
                  <p className="text-sm text-zinc-300">{folder.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {folder.client_name && (
                  <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                    <h4 className="text-xs text-zinc-500 mb-2">Client Contact</h4>
                    <p className="text-sm text-white">{folder.client_name}</p>
                    {folder.client_email && (
                      <p className="text-xs text-zinc-400 mt-1">{folder.client_email}</p>
                    )}
                  </div>
                )}
                {folder.client_company && (
                  <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                    <h4 className="text-xs text-zinc-500 mb-2">Company</h4>
                    <p className="text-sm text-white">{folder.client_company}</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <h4 className="text-xs text-zinc-500 mb-3">Folder Color</h4>
                <div className="flex gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => onUpdateFolder?.(folder.id, { cover_color: color.id })}
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color.gradient} ${
                        folder.cover_color === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
                      } transition-all hover:scale-110`}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Share Tab */}
            <TabsContent value="share">
              <FolderShareSettings
                folder={folder}
                onUpdateSettings={handleUpdateShareSettings}
                onGenerateLink={handleGenerateLink}
              />

              {/* Preview Card */}
              <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5" />
                <div className="relative p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/10 flex items-center justify-center border border-cyan-500/20">
                        <Eye className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Client Portal Preview</h4>
                        <p className="text-xs text-zinc-500">See how clients view this folder</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowSharePreview(true)}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Portal
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Add Projects Dialog */}
        <Dialog open={showAddProjects} onOpenChange={setShowAddProjects}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-white">Add Projects to Folder</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Select projects to add to "{folder.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {availableProjects.length > 0 ? availableProjects.map((project) => {
                const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
                const isSelected = selectedProjectIds.includes(project.id);

                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectIds(prev =>
                        isSelected
                          ? prev.filter(id => id !== project.id)
                          : [...prev, project.id]
                      );
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-2 border-cyan-500/40'
                        : 'bg-zinc-800/30 border-2 border-transparent hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-zinc-600'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${statusConfig.bgColor} flex items-center justify-center`}>
                      <Folder className={`w-4 h-4 ${statusConfig.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{project.name}</p>
                      <p className="text-xs text-zinc-500">{project.client_name || 'No client'}</p>
                    </div>
                    <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} text-[10px]`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-zinc-500">
                  <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>All projects are already in folders</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => { setShowAddProjects(false); setSelectedProjectIds([]); }}
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedProjects}
                disabled={selectedProjectIds.length === 0}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white disabled:opacity-50"
              >
                Add {selectedProjectIds.length > 0 ? `(${selectedProjectIds.length})` : ''} Projects
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

// Folder Share Settings Panel
function FolderShareSettings({ folder, onUpdateSettings, onGenerateLink }) {
  const [settings, setSettings] = useState(folder?.share_settings || {});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSettings(folder?.share_settings || {});
  }, [folder]);

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const copyLink = async () => {
    if (settings.share_link) {
      await navigator.clipboard.writeText(settings.share_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Share Link */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Share with Client</span>
                <p className="text-xs text-zinc-500">Create a client portal for this folder</p>
              </div>
            </div>
            <PremiumToggle enabled={settings.is_public} onChange={() => handleToggle('is_public')} />
          </div>

          <AnimatePresence>
            {settings.is_public && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {settings.share_link ? (
                  <div className="flex items-center gap-2 p-1 bg-zinc-900/80 rounded-xl border border-zinc-700/50">
                    <Input
                      value={settings.share_link}
                      readOnly
                      className="bg-transparent border-0 text-xs text-zinc-400"
                    />
                    <Button
                      size="sm"
                      className={`shrink-0 transition-all duration-300 ${
                        copied ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      } border`}
                      onClick={copyLink}
                    >
                      {copied ? <><CheckCircle2 className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={onGenerateLink}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0 h-11"
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Client Portal Link
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Visibility Options */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <Eye className="w-3.5 h-3.5 text-zinc-500" />
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Portal Settings</h4>
        </div>

        <div className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden divide-y divide-zinc-700/30">
          {[
            { key: 'show_individual_progress', label: 'Show Project Progress', desc: 'Display progress for each project', icon: TrendingUp },
            { key: 'show_overall_stats', label: 'Show Overall Statistics', desc: 'Display combined folder stats', icon: BarChart3 },
            { key: 'allow_comments', label: 'Allow Comments', desc: 'Let clients leave feedback', icon: MessageSquare },
          ].map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  settings[key] ? 'bg-cyan-500/15 text-cyan-400' : 'bg-zinc-700/50 text-zinc-500'
                } transition-colors`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-medium text-zinc-200">{label}</span>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
              <PremiumToggle enabled={settings[key]} onChange={() => handleToggle(key)} size="small" />
            </div>
          ))}
        </div>
      </div>

      {/* Welcome Message */}
      <div className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 p-4">
        <h4 className="text-sm font-medium text-zinc-200 mb-2">Welcome Message</h4>
        <p className="text-xs text-zinc-500 mb-3">Display a custom message on the client portal</p>
        <Textarea
          value={settings.welcome_message || ''}
          onChange={(e) => {
            const newSettings = { ...settings, welcome_message: e.target.value };
            setSettings(newSettings);
            onUpdateSettings(newSettings);
          }}
          placeholder="Welcome! Here you can track all your project orders..."
          className="bg-zinc-900/50 border-zinc-700/50 text-sm min-h-[80px]"
        />
      </div>
    </div>
  );
}

// Shareable Folder View - Client Portal
function ShareableFolderView({ folder, projects, tasks }) {
  const colorConfig = FOLDER_COLORS.find(c => c.id === folder?.cover_color) || FOLDER_COLORS[0];
  const settings = folder?.share_settings || {};

  if (!folder) return null;

  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const overallProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className={`absolute top-0 left-1/4 w-96 h-96 ${colorConfig.bg} rounded-full blur-3xl opacity-50`} />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0b]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-16">
          {/* Breadcrumb */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50">
              <FolderOpen className={`w-3.5 h-3.5 ${colorConfig.text}`} />
              <span className="text-zinc-400 text-sm">Client Portal</span>
              {folder.client_company && (
                <>
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-300 text-sm">{folder.client_company}</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{folder.name}</h1>
            {folder.description && (
              <p className="text-lg text-zinc-400 mb-6 max-w-2xl leading-relaxed">{folder.description}</p>
            )}
            {settings.welcome_message && (
              <div className={`p-4 rounded-xl ${colorConfig.bg} border ${colorConfig.border} mb-6`}>
                <p className={`text-sm ${colorConfig.text}`}>{settings.welcome_message}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-4">
        {/* Stats Overview */}
        {(settings.show_overall_stats !== false) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/40 backdrop-blur-xl mb-8"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${colorConfig.bg} opacity-30`} />
            <div className="relative p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-1">Portfolio Overview</h2>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold bg-gradient-to-r ${colorConfig.gradient} bg-clip-text text-transparent`}>
                      {projects.length}
                    </span>
                    <span className="text-zinc-500">total projects</span>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="text-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/30">
                    <div className="text-2xl font-bold text-emerald-400">{completedProjects}</div>
                    <div className="text-xs text-zinc-500 mt-1">Completed</div>
                  </div>
                  <div className="text-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/30">
                    <div className={`text-2xl font-bold ${colorConfig.text}`}>{activeProjects}</div>
                    <div className="text-xs text-zinc-500 mt-1">Active</div>
                  </div>
                  <div className="text-center px-6 py-3 rounded-2xl bg-zinc-800/50 border border-zinc-700/30">
                    <div className="text-2xl font-bold text-white">{overallProgress}%</div>
                    <div className="text-xs text-zinc-500 mt-1">Avg Progress</div>
                  </div>
                </div>
              </div>

              <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorConfig.gradient} rounded-full`}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Projects Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl ${colorConfig.bg} border ${colorConfig.border} flex items-center justify-center`}>
              <Layers className={`w-5 h-5 ${colorConfig.text}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Projects</h2>
              <p className="text-xs text-zinc-500">Track the status of all your orders</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {projects.map((project, i) => {
              const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
              const projectTasks = tasks.filter(t => t.project_id === project.id);
              const completedTasks = projectTasks.filter(t => t.status === 'completed' || t.status === 'success').length;
              const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : project.progress || 0;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="rounded-2xl bg-zinc-800/40 border border-zinc-700/40 overflow-hidden hover:border-zinc-600 transition-all group"
                >
                  <div className={`h-1 bg-gradient-to-r ${
                    project.status === 'completed' ? 'from-emerald-500 to-emerald-400' :
                    project.status === 'active' ? `${colorConfig.gradient}` :
                    'from-zinc-600 to-zinc-500'
                  }`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-xs text-zinc-500">{project.category || 'Project'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {(settings.show_individual_progress !== false) && (
                      <>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-zinc-500">Progress</span>
                          <span className={`font-medium ${statusConfig.textColor}`}>{progress}%</span>
                        </div>
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden mb-4">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              project.status === 'completed' ? 'bg-emerald-400' : `bg-gradient-to-r ${colorConfig.gradient}`
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    )}

                    {project.due_date && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-zinc-500">
              <div className={`w-6 h-6 rounded-lg ${colorConfig.bg} flex items-center justify-center`}>
                <FolderOpen className={`w-3 h-3 ${colorConfig.text}`} />
              </div>
              <span>Client Portal</span>
            </div>
            <span className="text-zinc-600">Last updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// END PROJECT FOLDERS COMPONENTS
// ============================================

// Timeline Bar for Gantt-like view
function TimelineBar({ project, startDate, endDate, totalDays }) {
  const projectStart = new Date(project.start_date || Date.now());
  const projectEnd = new Date(project.due_date || Date.now());
  const timelineStart = new Date(startDate);

  const startOffset = Math.max(0, (projectStart - timelineStart) / (1000 * 60 * 60 * 24));
  const duration = Math.max(1, (projectEnd - projectStart) / (1000 * 60 * 60 * 24));

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = Math.min((duration / totalDays) * 100, 100 - leftPercent);

  const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];

  return (
    <div
      className={`absolute h-6 rounded ${statusConfig.color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer group`}
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: "50%", transform: "translateY(-50%)" }}
    >
      <div className="absolute -top-8 left-0 hidden group-hover:block bg-zinc-800 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
        {project.name} ({Math.round(widthPercent)}%)
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, tasks, onClick, onStatusChange }) {
  const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === project.priority) || PRIORITY_LEVELS[1];
  const StatusIcon = statusConfig.icon;

  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "success").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const daysLeft = project.due_date
    ? Math.ceil((new Date(project.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysLeft !== null && daysLeft < 0 && project.status !== "completed";
  const budgetUsed = project.budget && project.spent ? Math.round((parseFloat(project.spent) / parseFloat(project.budget)) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 cursor-pointer hover:border-zinc-700 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusConfig.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
              {project.name}
            </h3>
            {project.client_name && (
              <p className="text-xs text-zinc-500">{project.client_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${priorityConfig.bgColor} ${priorityConfig.color} ${priorityConfig.borderColor} text-xs`}>
            {priorityConfig.label}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4">{project.description}</p>
      )}

      {/* Progress & Stats */}
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing progress={progress} />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Tasks</span>
            <span className="text-zinc-400">{completedTasks}/{totalTasks}</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" />
        </div>
      </div>

      {/* Budget Progress (if exists) */}
      {project.budget && (
        <div className="mb-4 p-3 bg-zinc-800/30 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-500 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Budget
            </span>
            <span className={`${budgetUsed > 90 ? "text-cyan-300" : "text-zinc-400"}`}>
              ${(parseFloat(project.spent) || 0).toLocaleString()} / ${parseFloat(project.budget).toLocaleString()}
            </span>
          </div>
          <Progress value={budgetUsed} className="h-1 bg-zinc-800" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
        <div className="flex items-center gap-3">
          {project.due_date && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-cyan-300" : "text-zinc-500"}`}>
              <Calendar className="w-3 h-3" />
              {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
            </span>
          )}
          {project.team_members?.length > 0 && (
            <div className="flex -space-x-2">
              {project.team_members.slice(0, 3).map((member, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-zinc-900">
                  <AvatarFallback className="text-[10px] bg-cyan-500/15 text-cyan-400/80">
                    {member.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.team_members.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] text-zinc-400">
                  +{project.team_members.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} text-xs`}>
          {statusConfig.label}
        </Badge>
      </div>
    </motion.div>
  );
}

// Kanban Project Card
function KanbanProjectCard({ project, index, onClick }) {
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === project.priority) || PRIORITY_LEVELS[1];
  const progress = project.progress || 0;

  return (
    <Draggable draggableId={String(project.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`group bg-zinc-900/80 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
            snapshot.isDragging
              ? "shadow-xl shadow-cyan-500/10 border-cyan-500/40 scale-[1.02] z-50"
              : "border-zinc-800/60 hover:border-zinc-700"
          }`}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="text-zinc-600 hover:text-zinc-400">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-white truncate group-hover:text-cyan-400">
                    {project.name}
                  </h4>
                  {project.client_name && (
                    <p className="text-xs text-zinc-500 truncate">{project.client_name}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`${priorityConfig.bgColor} ${priorityConfig.color} ${priorityConfig.borderColor} text-[10px] px-1.5`}>
                {priorityConfig.label}
              </Badge>
            </div>

            {/* Mini Progress */}
            <div className="ml-6 mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-500">{progress}% complete</span>
              </div>
              <Progress value={progress} className="h-1 bg-zinc-800" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between ml-6">
              {project.due_date && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(project.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {project.team_members?.length > 0 && (
                <div className="flex -space-x-1">
                  {project.team_members.slice(0, 2).map((member, i) => (
                    <Avatar key={i} className="w-5 h-5 border border-zinc-900">
                      <AvatarFallback className="text-[8px] bg-cyan-500/15 text-cyan-400/80">
                        {member.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// Kanban Column
function KanbanColumn({ status, projects, onAddProject, onClick }) {
  const StatusIcon = status.icon;

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${status.bgColor}`}>
            <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
          </div>
          <span className="font-medium text-white text-sm">{status.label}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{projects.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-white"
          onClick={() => onAddProject(status.id)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Droppable droppableId={status.id} type="PROJECT">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[300px] rounded-xl p-2 transition-all ${
              snapshot.isDraggingOver
                ? "bg-cyan-500/5 border-2 border-dashed border-cyan-500/30"
                : "border-2 border-transparent"
            }`}
          >
            {projects.map((project, index) => (
              <KanbanProjectCard
                key={project.id}
                project={project}
                index={index}
                onClick={() => onClick(project)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// Project Detail Sheet
function ProjectDetailSheet({
  project,
  tasks,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAddTask,
  onUpdateTask,
  onUpdateProject,
  onPreviewShare
}) {
  const [showSharePreview, setShowSharePreview] = useState(false);
  const statusConfig = PROJECT_STATUSES.find(s => s.id === project?.status) || PROJECT_STATUSES[0];
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === project?.priority) || PRIORITY_LEVELS[1];

  if (!project) return null;

  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "success").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const budgetUsed = project.budget && project.spent
    ? Math.round((parseFloat(project.spent) / parseFloat(project.budget)) * 100)
    : 0;

  const tasksByStatus = {
    todo: tasks.filter(t => !t.status || t.status === "todo" || t.status === "pending"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    completed: tasks.filter(t => t.status === "completed" || t.status === "success"),
  };

  const handleFilesAdded = (newFiles) => {
    const updatedAttachments = [...(project.attachments || []), ...newFiles];
    onUpdateProject?.(project.id, { attachments: updatedAttachments });
  };

  const handleRemoveFile = (fileId) => {
    const updatedAttachments = (project.attachments || []).filter(f => f.id !== fileId);
    onUpdateProject?.(project.id, { attachments: updatedAttachments });
  };

  const handleToggleFilePublic = (fileId) => {
    const updatedAttachments = (project.attachments || []).map(f =>
      f.id === fileId ? { ...f, is_public: !f.is_public } : f
    );
    onUpdateProject?.(project.id, { attachments: updatedAttachments });
    const file = updatedAttachments.find(f => f.id === fileId);
    toast.success(file?.is_public ? "File visible to clients" : "File hidden from clients");
  };

  const handleUpdateShareSettings = (newSettings) => {
    onUpdateProject?.(project.id, { share_settings: newSettings });
  };

  const handleAddClientUpdate = (update) => {
    const updatedUpdates = [update, ...(project.client_updates || [])];
    onUpdateProject?.(project.id, { client_updates: updatedUpdates });
  };

  const handleDeleteClientUpdate = (updateId) => {
    const updatedUpdates = (project.client_updates || []).filter(u => u.id !== updateId);
    onUpdateProject?.(project.id, { client_updates: updatedUpdates });
  };

  // Share Preview Modal - Premium Design
  if (showSharePreview) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-5xl bg-[#0a0a0b] border-zinc-800/60 overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-zinc-800/50 p-4">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={() => setShowSharePreview(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-600"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Project
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-medium text-cyan-400">Client Preview Mode</span>
                </div>
              </div>
            </div>
          </div>
          <ShareableProjectView
            project={project}
            tasks={tasks}
            isOwner={true}
            onAddUpdate={handleAddClientUpdate}
            onDeleteUpdate={handleDeleteClientUpdate}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800/60 overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className={`p-6 bg-cyan-500/5 border-b border-zinc-800/60`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Folder className="w-6 h-6 text-cyan-400/80" />
              </div>
              <div>
                <SheetTitle className="text-white text-xl">{project.name}</SheetTitle>
                {project.client_name && <p className="text-zinc-400 text-sm">{project.client_name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className={`${priorityConfig.bgColor} ${priorityConfig.color} ${priorityConfig.borderColor}`}>
                {priorityConfig.label}
              </Badge>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
              <ProgressRing progress={progress} size={36} strokeWidth={3} />
              <div className="text-xs text-zinc-500 mt-1">Progress</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{tasks.length}</div>
              <div className="text-xs text-zinc-500">Tasks</div>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{(project.attachments || []).length}</div>
              <div className="text-xs text-zinc-500">Files</div>
            </div>
            {project.due_date && (
              <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-white">
                  {new Date(project.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div className="text-xs text-zinc-500">Due</div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Button size="sm" className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0" onClick={() => onAddTask(project)}>
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
            <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-all" onClick={() => onEdit(project)}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-all"
              onClick={() => setShowSharePreview(true)}
            >
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </div>

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="bg-zinc-800/50 border border-zinc-700/50 mb-4 w-full grid grid-cols-6 p-1 rounded-xl">
              <TabsTrigger value="tasks" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Tasks</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Files</TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Overview</TabsTrigger>
              <TabsTrigger value="milestones" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Milestones</TabsTrigger>
              <TabsTrigger value="updates" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Updates</TabsTrigger>
              <TabsTrigger value="share" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-zinc-400 text-xs">Share</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks">
              {/* Budget Progress */}
              {project.budget && (
                <div className="mb-6 p-4 bg-zinc-800/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400 flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Budget Usage
                    </span>
                    <span className={`text-sm font-medium ${budgetUsed > 90 ? "text-cyan-300" : "text-zinc-300"}`}>
                      {budgetUsed}%
                    </span>
                  </div>
                  <Progress value={budgetUsed} className="h-2 bg-zinc-800" />
                  <div className="flex justify-between mt-2 text-xs text-zinc-500">
                    <span>Spent: ${(parseFloat(project.spent) || 0).toLocaleString()}</span>
                    <span>Budget: ${parseFloat(project.budget).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Task Lists by Status */}
              <div className="space-y-6">
                {/* To Do */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Circle className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-400">To Do ({tasksByStatus.todo.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasksByStatus.todo.map(task => (
                      <TaskItem key={task.id} task={task} onUpdate={onUpdateTask} />
                    ))}
                  </div>
                </div>

                {/* In Progress */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-cyan-400/80" />
                    <span className="text-sm font-medium text-zinc-400">In Progress ({tasksByStatus.in_progress.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasksByStatus.in_progress.map(task => (
                      <TaskItem key={task.id} task={task} onUpdate={onUpdateTask} />
                    ))}
                  </div>
                </div>

                {/* Completed */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-zinc-400">Completed ({tasksByStatus.completed.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasksByStatus.completed.map(task => (
                      <TaskItem key={task.id} task={task} onUpdate={onUpdateTask} />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              {project.description && (
                <div>
                  <h4 className="text-xs text-zinc-500 mb-2">Description</h4>
                  <p className="text-sm text-zinc-300">{project.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {project.start_date && (
                  <div className="p-3 bg-zinc-800/30 rounded-lg">
                    <div className="text-xs text-zinc-500 mb-1">Start Date</div>
                    <div className="text-sm text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      {new Date(project.start_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {project.due_date && (
                  <div className="p-3 bg-zinc-800/30 rounded-lg">
                    <div className="text-xs text-zinc-500 mb-1">Due Date</div>
                    <div className="text-sm text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      {new Date(project.due_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {project.team_members?.length > 0 && (
                <div>
                  <h4 className="text-xs text-zinc-500 mb-2">Team Members</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.team_members.map((member, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px] bg-cyan-500/15 text-cyan-400/80">
                            {member.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-zinc-300">{member}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {project.tags?.length > 0 && (
                <div>
                  <h4 className="text-xs text-zinc-500 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="border-zinc-700">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="milestones">
              {project.milestones?.length > 0 ? (
                <div className="space-y-3">
                  {project.milestones.map((milestone, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        milestone.completed ? "bg-cyan-500/20" : "bg-zinc-700"
                      }`}>
                        {milestone.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Milestone className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${milestone.completed ? "text-zinc-500 line-through" : "text-white"}`}>
                          {milestone.name}
                        </p>
                        {milestone.date && (
                          <p className="text-xs text-zinc-500">{new Date(milestone.date).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Milestone className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No milestones added</p>
                </div>
              )}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files">
              <FileDropZone
                onFilesAdded={handleFilesAdded}
                files={project.attachments || []}
                onRemoveFile={handleRemoveFile}
                onTogglePublic={handleToggleFilePublic}
              />
            </TabsContent>

            {/* Updates Tab - Client Updates */}
            <TabsContent value="updates">
              <div className="space-y-4">
                {/* Add Update Form */}
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <ClientUpdateForm
                    onSubmit={handleAddClientUpdate}
                  />
                </div>

                {/* Updates List */}
                <div className="space-y-0">
                  {(project.client_updates || []).length > 0 ? (
                    project.client_updates.map(update => (
                      <ClientUpdateItem
                        key={update.id}
                        update={update}
                        isOwner={true}
                        onDelete={handleDeleteClientUpdate}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No client updates yet</p>
                      <p className="text-xs mt-1">Post updates to keep your clients informed</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Share Tab */}
            <TabsContent value="share">
              <ShareSettingsPanel
                project={project}
                onUpdateSettings={handleUpdateShareSettings}
                onGenerateLink={(link) => {
                  toast.success("Share link generated!");
                }}
              />

              {/* Preview Button - Premium Card */}
              <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/20">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5" />
                <div className="relative p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/10 flex items-center justify-center border border-cyan-500/20">
                        <Eye className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Client Portal Preview</h4>
                        <p className="text-xs text-zinc-500">See exactly how your project appears to clients</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowSharePreview(true)}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border-0"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Portal
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Client Update Form Component
function ClientUpdateForm({ onSubmit }) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({
      id: `update-${Date.now()}`,
      content: content.trim(),
      author: 'Team',
      created_at: new Date().toISOString(),
      attachments: [],
    });
    setContent('');
    toast.success("Update posted!");
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share a progress update with your client..."
        className="bg-zinc-900/50 border-zinc-700 min-h-[100px]"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300">
            <Paperclip className="w-4 h-4 mr-1" />
            Attach
          </Button>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="bg-cyan-600/80 hover:bg-cyan-600"
        >
          <Send className="w-4 h-4 mr-1" />
          Post Update
        </Button>
      </div>
    </div>
  );
}

// Task Item Component
function TaskItem({ task, onUpdate }) {
  const priorityConfig = PRIORITY_LEVELS.find(p => p.id === task.priority) || PRIORITY_LEVELS[1];

  const cycleStatus = () => {
    const statuses = ["todo", "in_progress", "completed"];
    const currentStatus = task.status || "todo";
    const currentIdx = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    onUpdate(task.id, { status: nextStatus });
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors group">
      <button onClick={cycleStatus} className="flex-shrink-0">
        {task.status === "completed" || task.status === "success" ? (
          <CheckCircle2 className="w-5 h-5 text-cyan-400" />
        ) : task.status === "in_progress" ? (
          <Clock className="w-5 h-5 text-cyan-400/80" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.status === "completed" || task.status === "success" ? "text-zinc-500 line-through" : "text-white"}`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
      <Badge variant="outline" className={`border-zinc-700 text-xs ${priorityConfig.color}`}>
        {priorityConfig.label}
      </Badge>
    </div>
  );
}

// Analytics Overview
function ProjectAnalytics({ projects, tasks }) {
  const stats = useMemo(() => {
    const byStatus = {};
    PROJECT_STATUSES.forEach(s => { byStatus[s.id] = 0; });

    let totalBudget = 0;
    let totalSpent = 0;
    let onTime = 0;
    let overdue = 0;

    projects.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      totalBudget += parseFloat(p.budget) || 0;
      totalSpent += parseFloat(p.spent) || 0;

      if (p.due_date) {
        if (new Date(p.due_date) >= new Date() || p.status === "completed") {
          onTime++;
        } else {
          overdue++;
        }
      }
    });

    const completionRate = projects.length > 0
      ? Math.round((byStatus.completed / projects.length) * 100)
      : 0;

    return { byStatus, totalBudget, totalSpent, onTime, overdue, completionRate, total: projects.length };
  }, [projects]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Folder className="w-5 h-5 text-cyan-400/70" />
        </div>
        <div className="text-2xl font-bold text-white">{stats.total}</div>
        <div className="text-xs text-zinc-500">Total Projects</div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Play className="w-5 h-5 text-cyan-400/70" />
        </div>
        <div className="text-2xl font-bold text-white">{stats.byStatus.active || 0}</div>
        <div className="text-xs text-zinc-500">Active</div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <Target className="w-5 h-5 text-cyan-400/70" />
        </div>
        <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
        <div className="text-xs text-zinc-500">Completion Rate</div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <AlertCircle className="w-5 h-5 text-cyan-400/70" />
        </div>
        <div className="text-2xl font-bold text-white">{stats.overdue}</div>
        <div className="text-xs text-zinc-500">Overdue</div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="w-5 h-5 text-cyan-400/70" />
        </div>
        <div className="text-2xl font-bold text-white">${(stats.totalBudget / 1000).toFixed(0)}k</div>
        <div className="text-xs text-zinc-500">Total Budget</div>
      </div>
    </div>
  );
}

// Main Projects Component
export default function Projects() {
  const { user } = useUser();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'kanban', 'list', 'timeline'
  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [formData, setFormData] = useState(emptyProject);
  const [taskFormData, setTaskFormData] = useState({ title: "", description: "", priority: "medium", due_date: "", status: "todo" });
  const [editingProject, setEditingProject] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Folder state
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFolderDetailSheet, setShowFolderDetailSheet] = useState(false);
  const [folderFormData, setFolderFormData] = useState(emptyFolder);
  const [editingFolder, setEditingFolder] = useState(null);
  const [showFoldersSection, setShowFoldersSection] = useState(true);

  // Load folders from localStorage on mount
  useEffect(() => {
    const savedFolders = localStorage.getItem('project_folders');
    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (e) {
        console.error('Failed to load folders from localStorage:', e);
      }
    }
  }, []);

  // Save folders to localStorage whenever they change
  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem('project_folders', JSON.stringify(folders));
    }
  }, [folders]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectActions, taskActions] = await Promise.all([
        base44.entities.ActionLog.filter({ action_type: "project" }).catch(() => []),
        base44.entities.ActionLog.filter({ action_type: "task" }).catch(() => []),
      ]);

      const projectList = projectActions.map(p => ({
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

      const taskList = taskActions.map(t => ({
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
      projectList.forEach(p => {
        const projectTasks = taskList.filter(t => t.project_id === p.id);
        const completedTasks = projectTasks.filter(t => t.status === "completed" || t.status === "success").length;
        p.progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
      });

      setProjects(projectList);
      setTasks(taskList);
    } catch (error) {
      console.error("Failed to load data:", error);
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

  const mapStatusToDB = (uiStatus) => {
    if (uiStatus === "completed") return "success";
    if (uiStatus === "archived") return "cancelled";
    if (uiStatus === "active") return "in_progress";
    return "pending";
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const projectsByStatus = useMemo(() => {
    const grouped = {};
    PROJECT_STATUSES.forEach(s => {
      grouped[s.id] = filteredProjects.filter(p => p.status === s.id);
    });
    return grouped;
  }, [filteredProjects]);

  const getProjectTasks = (projectId) => tasks.filter(t =>
    t.project_id === projectId || String(t.project_id) === String(projectId)
  );

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const projectId = result.draggableId;
    const newStatus = result.destination.droppableId;

    // Use == for comparison to handle both string and number IDs
    setProjects(prev => prev.map(p => String(p.id) === projectId ? { ...p, status: newStatus } : p));

    try {
      await base44.entities.ActionLog.update(projectId, { status: mapStatusToDB(newStatus) });
      toast.success(`Project moved to ${PROJECT_STATUSES.find(s => s.id === newStatus)?.label}`);
    } catch (error) {
      console.error("Failed to update:", error);
      toast.error("Failed to update project");
      loadData();
    }
  };

  const handleSaveProject = async () => {
    if (!formData.name) {
      toast.error("Project name is required");
      return;
    }

    try {
      const projectData = {
        action_type: "project",
        title: formData.name,
        action_description: formData.name,
        description: formData.description,
        notes: formData.description,
        status: mapStatusToDB(formData.status),
        priority: formData.priority,
        category: formData.category,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        spent: formData.spent ? parseFloat(formData.spent) : 0,
        client_name: formData.client_name,
        team_members: formData.team_members,
        tags: formData.tags,
        milestones: formData.milestones,
        attachments: formData.attachments || [],
        share_settings: formData.share_settings || {
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
        client_updates: formData.client_updates || [],
        page_content: formData.page_content || [],
        user_id: user?.id,
      };

      if (editingProject) {
        // Preserve existing share_settings if not in formData
        if (editingProject.share_settings && !formData.share_settings) {
          projectData.share_settings = editingProject.share_settings;
        }
        await base44.entities.ActionLog.update(editingProject.id, projectData);
        toast.success("Project updated");
      } else {
        await base44.entities.ActionLog.create(projectData);
        toast.success("Project created");
      }

      setShowModal(false);
      setFormData(emptyProject);
      setEditingProject(null);
      loadData();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save project");
    }
  };

  const handleSaveTask = async () => {
    if (!taskFormData.title) {
      toast.error("Task title is required");
      return;
    }

    try {
      await base44.entities.ActionLog.create({
        action_type: "task",
        title: taskFormData.title,
        action_description: taskFormData.title,
        description: taskFormData.description,
        status: taskFormData.status === "completed" ? "success" : "pending",
        priority: taskFormData.priority,
        due_date: taskFormData.due_date || null,
        project_id: selectedProject?.id,
        user_id: user?.id,
      });

      toast.success("Task created");
      setShowTaskModal(false);
      setTaskFormData({ title: "", description: "", priority: "medium", due_date: "", status: "todo" });
      loadData();
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({ ...project });
    setShowModal(true);
  };

  const handleDeleteProject = async (id) => {
    if (!confirm("Delete this project and all its tasks?")) return;

    try {
      await base44.entities.ActionLog.delete(id);
      // Also delete associated tasks
      const projectTasks = tasks.filter(t => t.project_id === id);
      await Promise.all(projectTasks.map(t => base44.entities.ActionLog.delete(t.id)));

      toast.success("Project deleted");
      if (selectedProject?.id === id) {
        setSelectedProject(null);
        setShowDetailSheet(false);
      }
      loadData();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await base44.entities.ActionLog.update(taskId, {
        status: updates.status === "completed" ? "success" : updates.status === "todo" ? "pending" : updates.status,
      });
      loadData();
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleUpdateProjectData = async (projectId, updates) => {
    try {
      // Find the current project - try multiple sources for reliability
      let currentProject = projects.find(p => p.id === projectId || String(p.id) === String(projectId));

      // Fallback to selectedProject if not found in projects array
      if (!currentProject && selectedProject && (selectedProject.id === projectId || String(selectedProject.id) === String(projectId))) {
        currentProject = selectedProject;
      }

      // Update local state immediately for responsiveness
      setProjects(prev => prev.map(p =>
        (p.id === projectId || String(p.id) === String(projectId)) ? { ...p, ...updates } : p
      ));

      // Update selected project if it's the one being modified
      if (selectedProject?.id === projectId || String(selectedProject?.id) === String(projectId)) {
        setSelectedProject(prev => prev ? { ...prev, ...updates } : prev);
      }

      // Always do a full project update for nested fields to ensure persistence
      // Nested fields like share_settings, attachments, client_updates may not persist with partial updates
      if (currentProject) {
        // Merge current project data with updates
        const mergedProject = { ...currentProject, ...updates };

        const fullProjectData = {
          action_type: "project",
          title: mergedProject.name,
          action_description: mergedProject.name,
          description: mergedProject.description,
          notes: mergedProject.description,
          status: mapStatusToDB(mergedProject.status),
          priority: mergedProject.priority,
          category: mergedProject.category,
          start_date: mergedProject.start_date || null,
          due_date: mergedProject.due_date || null,
          budget: mergedProject.budget ? parseFloat(mergedProject.budget) : null,
          spent: mergedProject.spent ? parseFloat(mergedProject.spent) : 0,
          client_name: mergedProject.client_name,
          team_members: mergedProject.team_members || [],
          tags: mergedProject.tags || [],
          milestones: mergedProject.milestones || [],
          attachments: mergedProject.attachments || [],
          share_settings: mergedProject.share_settings || {
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
          client_updates: mergedProject.client_updates || [],
          page_content: mergedProject.page_content || [],
        };
        await base44.entities.ActionLog.update(projectId, fullProjectData);
      } else {
        // Fallback: try partial update if we can't find the project
        console.warn("Could not find project for full update, attempting partial update:", projectId);
        await base44.entities.ActionLog.update(projectId, updates);
      }
    } catch (error) {
      console.error("Failed to update project data:", error, updates);
      toast.error("Failed to save changes");
      loadData(); // Reload to reset state on error
    }
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setShowDetailSheet(true);
  };

  const handleAddProjectToStatus = (statusId) => {
    setEditingProject(null);
    setFormData({ ...emptyProject, status: statusId });
    setShowModal(true);
  };

  // Folder handlers
  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderFormData({ ...emptyFolder, created_date: new Date().toISOString() });
    setShowFolderModal(true);
  };

  const handleSaveFolder = () => {
    if (!folderFormData.name) {
      toast.error("Folder name is required");
      return;
    }

    const newFolder = {
      ...folderFormData,
      id: editingFolder?.id || `folder_${Date.now()}`,
      share_settings: {
        ...folderFormData.share_settings,
        share_link: folderFormData.share_settings?.share_link || generateFolderShareLink(),
      },
    };

    if (editingFolder) {
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? newFolder : f));
      toast.success("Folder updated");
    } else {
      setFolders(prev => [...prev, newFolder]);
      toast.success("Folder created");
    }

    setShowFolderModal(false);
    setFolderFormData(emptyFolder);
    setEditingFolder(null);
  };

  const handleEditFolder = (folder) => {
    setEditingFolder(folder);
    setFolderFormData(folder);
    setShowFolderModal(true);
  };

  const handleDeleteFolder = (folderId) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    toast.success("Folder deleted");
  };

  const handleViewFolder = (folder) => {
    setSelectedFolder(folder);
    setShowFolderDetailSheet(true);
  };

  const handleAddProjectsToFolder = (folderId, projectIds) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const existingIds = f.project_ids || [];
        const newIds = [...new Set([...existingIds, ...projectIds])];
        return { ...f, project_ids: newIds };
      }
      return f;
    }));
    toast.success(`Added ${projectIds.length} project(s) to folder`);
  };

  const handleRemoveProjectFromFolder = (folderId, projectId) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, project_ids: (f.project_ids || []).filter(id => id !== projectId) };
      }
      return f;
    }));
  };

  const handleUpdateFolderSettings = (folderId, updates) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, ...updates };
      }
      return f;
    }));
  };

  const getFolderProjects = (folder) => {
    return projects.filter(p => (folder.project_ids || []).includes(p.id));
  };

  const getFolderTasks = (folder) => {
    const folderProjectIds = folder.project_ids || [];
    return tasks.filter(t => folderProjectIds.includes(t.project_id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-48 bg-zinc-800 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 bg-zinc-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-full mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-sm text-zinc-400">{projects.length} total projects</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded ${viewMode === "kanban" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="Kanban View"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                className={`p-2 rounded ${viewMode === "timeline" ? "bg-zinc-700 text-white" : "text-zinc-400"}`}
                title="Timeline View"
              >
                <CalendarRange className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 ${showAnalytics ? "bg-cyan-500/15 text-cyan-400/80 border-cyan-500/30" : ""}`}
            >
              <BarChart3 className="w-4 h-4 mr-1" /> Analytics
            </Button>

            <Button onClick={() => { setEditingProject(null); setFormData(emptyProject); setShowModal(true); }} className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-1" /> New Project
            </Button>
          </div>
        </div>

        {/* Analytics */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ProjectAnalytics projects={projects} tasks={tasks} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client Folders Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFoldersSection(!showFoldersSection)}
              className="flex items-center gap-2 text-left group"
            >
              <motion.div
                animate={{ rotate: showFoldersSection ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
              </motion.div>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-cyan-500" />
                <h2 className="text-lg font-semibold text-white">Client Folders</h2>
                <Badge variant="outline" className="bg-zinc-800/50 border-zinc-700 text-zinc-400">
                  {folders.length}
                </Badge>
              </div>
            </button>
            <Button
              onClick={handleCreateFolder}
              size="sm"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 hover:border-cyan-500/50 transition-all"
            >
              <Plus className="w-4 h-4 mr-1" /> New Folder
            </Button>
          </div>

          <AnimatePresence>
            {showFoldersSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {folders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {folders.map(folder => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        projects={getFolderProjects(folder)}
                        onClick={() => handleViewFolder(folder)}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8 text-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
                    <div className="relative z-10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
                        <FolderOpen className="w-8 h-8 text-cyan-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No Client Folders Yet</h3>
                      <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                        Create folders to organize projects by client. Share folder portals with clients so they can track all their orders in one place.
                      </p>
                      <Button
                        onClick={handleCreateFolder}
                        className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Create First Folder
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Statuses</SelectItem>
              {PROJECT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Content Views */}
        {viewMode === "kanban" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              {PROJECT_STATUSES.filter(s => s.id !== "archived").map(status => (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  projects={projectsByStatus[status.id]}
                  onAddProject={handleAddProjectToStatus}
                  onClick={handleViewProject}
                />
              ))}
            </div>
          </DragDropContext>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                tasks={getProjectTasks(project.id)}
                onClick={() => handleViewProject(project)}
              />
            ))}
            {filteredProjects.length === 0 && (
              <div className="col-span-full text-center py-20">
                <Folder className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold text-zinc-300 mb-2">No projects found</h2>
                <p className="text-zinc-500 mb-6">Create your first project to get started</p>
                <Button onClick={() => { setEditingProject(null); setFormData(emptyProject); setShowModal(true); }} className="bg-cyan-600/80 hover:bg-cyan-600 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Create Project
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Project</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Progress</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Due Date</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Budget</th>
                    <th className="p-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(project => {
                    const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
                    const projectTasks = getProjectTasks(project.id);
                    const completedTasks = projectTasks.filter(t => t.status === "completed" || t.status === "success").length;
                    const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;

                    return (
                      <tr key={project.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewProject(project)}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${statusConfig.bgColor}`}>
                              <Folder className={`w-4 h-4 ${statusConfig.textColor}`} />
                            </div>
                            <div>
                              <div className="font-medium text-white hover:text-cyan-400 transition-colors">{project.name}</div>
                              {project.client_name && <div className="text-xs text-zinc-500">{project.client_name}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="w-20 h-1.5 bg-zinc-800" />
                            <span className="text-xs text-zinc-400">{progress}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-zinc-400">
                            {project.due_date ? new Date(project.due_date).toLocaleDateString() : "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-zinc-400">
                            {project.budget ? `$${parseFloat(project.budget).toLocaleString()}` : "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProject(project)}>
                              <Edit2 className="w-4 h-4 text-zinc-400" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4 text-zinc-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem onClick={() => handleViewProject(project)} className="text-zinc-300">
                                  <Eye className="w-4 h-4 mr-2" /> View
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-red-400">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Timeline View */
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Project Timeline</h3>
            <div className="space-y-4">
              {filteredProjects.filter(p => p.start_date && p.due_date).map(project => {
                const statusConfig = PROJECT_STATUSES.find(s => s.id === project.status) || PROJECT_STATUSES[0];
                return (
                  <div key={project.id} className="flex items-center gap-4">
                    <div className="w-48 flex-shrink-0">
                      <div className="font-medium text-white text-sm truncate">{project.name}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(project.start_date).toLocaleDateString()} - {new Date(project.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex-1 relative h-8 bg-zinc-800/50 rounded-lg">
                      <TimelineBar
                        project={project}
                        startDate={new Date(Math.min(...filteredProjects.filter(p => p.start_date).map(p => new Date(p.start_date))))}
                        endDate={new Date(Math.max(...filteredProjects.filter(p => p.due_date).map(p => new Date(p.due_date))))}
                        totalDays={90}
                      />
                    </div>
                    <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} w-24 justify-center`}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })}
              {filteredProjects.filter(p => p.start_date && p.due_date).length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  <CalendarRange className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No projects with dates to display</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Project Detail Sheet */}
      <ProjectDetailSheet
        project={selectedProject}
        tasks={selectedProject ? getProjectTasks(selectedProject.id) : []}
        isOpen={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
        onAddTask={() => setShowTaskModal(true)}
        onUpdateTask={handleUpdateTask}
        onUpdateProject={handleUpdateProjectData}
      />

      {/* Project Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
            <DialogDescription className="text-zinc-400">Create or edit your project details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Project Name *</label>
              <Input
                placeholder="Website Redesign"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Description</label>
              <Textarea
                placeholder="Project description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PROJECT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Priority</label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PRIORITY_LEVELS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Category</label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PROJECT_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Client Name</label>
                <Input
                  placeholder="Acme Corp"
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Budget ($)</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowModal(false); setEditingProject(null); }} className="flex-1 border-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleSaveProject} className="flex-1 bg-cyan-600/80 hover:bg-cyan-600 text-white">
                {editingProject ? "Update" : "Create"} Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Task Title *</label>
              <Input
                placeholder="Design homepage mockup"
                value={taskFormData.title}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Description</label>
              <Textarea
                placeholder="Task details..."
                value={taskFormData.description}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Priority</label>
                <Select value={taskFormData.priority} onValueChange={(v) => setTaskFormData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {PRIORITY_LEVELS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTaskModal(false)} className="flex-1 border-zinc-700">
                Cancel
              </Button>
              <Button onClick={handleSaveTask} className="flex-1 bg-cyan-600/80 hover:bg-cyan-600 text-white">
                Add Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Detail Sheet */}
      <FolderDetailSheet
        folder={selectedFolder}
        projects={selectedFolder ? getFolderProjects(selectedFolder) : []}
        allProjects={projects}
        tasks={selectedFolder ? getFolderTasks(selectedFolder) : []}
        isOpen={showFolderDetailSheet}
        onClose={() => setShowFolderDetailSheet(false)}
        onEdit={handleEditFolder}
        onDelete={handleDeleteFolder}
        onAddProjects={(projectIds) => handleAddProjectsToFolder(selectedFolder?.id, projectIds)}
        onRemoveProject={(projectId) => handleRemoveProjectFromFolder(selectedFolder?.id, projectId)}
        onUpdateSettings={(updates) => handleUpdateFolderSettings(selectedFolder?.id, updates)}
        onViewProject={handleViewProject}
      />

      {/* Folder Modal */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-500" />
              {editingFolder ? "Edit Folder" : "Create Client Folder"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a folder to group projects for a specific client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Folder Name */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">Folder Name *</label>
              <Input
                placeholder="e.g., Acme Corp Orders"
                value={folderFormData.name}
                onChange={(e) => setFolderFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 focus:border-cyan-500/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">Description</label>
              <Textarea
                placeholder="Describe what this folder contains..."
                value={folderFormData.description}
                onChange={(e) => setFolderFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 focus:border-cyan-500/50 min-h-[80px]"
              />
            </div>

            {/* Client Info */}
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-500" />
                Client Information
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Client Name</label>
                  <Input
                    placeholder="John Smith"
                    value={folderFormData.client_name}
                    onChange={(e) => setFolderFormData(prev => ({ ...prev, client_name: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={folderFormData.client_email}
                      onChange={(e) => setFolderFormData(prev => ({ ...prev, client_email: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Company</label>
                    <Input
                      placeholder="Acme Corp"
                      value={folderFormData.client_company}
                      onChange={(e) => setFolderFormData(prev => ({ ...prev, client_company: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Folder Color */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-3 block">Folder Color</label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setFolderFormData(prev => ({ ...prev, cover_color: color.id }))}
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.gradient} transition-all ${
                      folderFormData.cover_color === color.id
                        ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                        : "hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderFormData(emptyFolder);
                  setEditingFolder(null);
                }}
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFolder}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white"
              >
                {editingFolder ? "Save Changes" : "Create Folder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}