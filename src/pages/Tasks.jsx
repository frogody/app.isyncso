
import React, { useState, useEffect, useCallback } from "react";
import { Task } from "@/api/entities";
import { User } from "@/api/entities";
import { Candidate } from "@/api/entities";
import { Project } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  MessageSquare,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User as UserIcon,
  X,
  Zap,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { getUsersByIds } from "@/api/functions";
import { handleFollowUpResponse } from "@/api/functions";
import { useTranslation } from "@/components/utils/translations";
import SyncAvatar from "@/components/ui/SyncAvatar";
import IconWrapper from "@/components/ui/IconWrapper";

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, _setSortBy] = useState("due_date");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [userCache, setUserCache] = useState({});
  const [candidateCache, setCandidateCache] = useState({});
  const [projectCache, setProjectCache] = useState({});
  const [processingTasks, setProcessingTasks] = useState(new Set());

  const { t } = useTranslation(user?.language || 'nl');

  const formatKeyForDisplay = (key) => {
    if (!key) return '';
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const translateStatus = (status) => {
    const statusMap = {
      'pending': t('status_pending'),
      'in_progress': t('status_in_progress'),
      'completed': t('status_completed'),
      'cancelled': t('status_cancelled'),
      'all': t('filter_all')
    };
    return statusMap[status] || formatKeyForDisplay(status);
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "other",
    status: "pending",
    priority: "medium",
    due_date: "",
    notes: ""
  });

  const loadTasks = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const filter = { organization_id: user.organization_id };
      const allTasks = await Task.filter(filter, "-due_date", 200);
      setTasks(allTasks);

      const userIds = [...new Set(allTasks.map(t => t.assigned_to).filter(Boolean))];
      const candidateIds = [...new Set(allTasks.map(t => t.candidate_id).filter(Boolean))];
      const projectIds = [...new Set(allTasks.map(t => t.project_id).filter(Boolean))];

      if (userIds.length > 0) {
        const { data } = await getUsersByIds({ userIds });
        setUserCache(data.users || {});
      }

      if (candidateIds.length > 0) {
        const candidates = await Candidate.filter({
          id: candidateIds,
          organization_id: user.organization_id
        });
        const candidateMap = {};
        candidates.forEach(c => candidateMap[c.id] = c);
        setCandidateCache(candidateMap);
      }

      if (projectIds.length > 0) {
        const projects = await Project.filter({
          id: projectIds,
          organization_id: user.organization_id
        });
        const projectMap = {};
        projects.forEach(p => projectMap[p.id] = p);
        setProjectCache(projectMap);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
    setIsLoading(false);
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, loadTasks]);

  useEffect(() => {
    let filtered = [...tasks];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.candidate_name && t.candidate_name.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    filtered.sort((a, b) => {
      switch(sortBy) {
        case "due_date":
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        case "priority": {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        case "created":
          return new Date(b.created_date) - new Date(a.created_date);
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, statusFilter, priorityFilter, typeFilter, sortBy]);

  const getTaskStats = () => {
    const stats = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t =>
        t.status !== 'completed' &&
        t.due_date &&
        new Date(t.due_date) < new Date()
      ).length,
      dueToday: tasks.filter(t =>
        t.status !== 'completed' &&
        t.due_date &&
        new Date(t.due_date).toDateString() === new Date().toDateString()
      ).length,
      urgent: tasks.filter(t =>
        t.status !== 'completed' &&
        t.priority === 'urgent'
      ).length
    };
    return stats;
  };

  const stats = getTaskStats();

  const handleCompleteTask = async (taskId) => {
    setProcessingTasks(prev => new Set([...prev, taskId]));
    try {
      await Task.update(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      await loadTasks();
    } catch (error) {
      console.error("Error completing task:", error);
    }
    setProcessingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm(t('confirm_delete_task'))) return;

    setIsLoading(true);
    try {
      await Task.delete(taskId);
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
    setIsLoading(false);
  };

  const handleCreateTask = async () => {
    if (!formData.title.trim()) {
      alert(t('alert_enter_task_title'));
      return;
    }

    setIsLoading(true);
    try {
      await Task.create({
        ...formData,
        assigned_to: user.id,
        organization_id: user.organization_id
      });
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        type: "other",
        status: "pending",
        priority: "medium",
        due_date: "",
        notes: ""
      });
      await loadTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
    setIsLoading(false);
  };

  const handleFollowUpAction = async (taskId, responseReceived) => {
    setProcessingTasks(prev => new Set([...prev, taskId]));
    try {
      await handleFollowUpResponse({
        task_id: taskId,
        response_received: responseReceived
      });
      await loadTasks();
    } catch (error) {
      console.error("Error handling follow-up:", error);
      alert(t('alert_error_follow_up'));
    }
    setProcessingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      urgent: { color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: AlertCircle, label: t('priority_urgent') },
      high: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: TrendingUp, label: t('priority_high') },
      medium: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Target, label: t('priority_medium') },
      low: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: Clock, label: t('priority_low') }
    };
    const config = configs[priority] || configs.medium;
    config.label = formatKeyForDisplay(config.label);
    return config;
  };

  const getTypeConfig = (type) => {
    const configs = {
      follow_up: { icon: MessageSquare, label: t('type_follow_up'), color: 'text-purple-400' },
      outreach: { icon: Sparkles, label: t('type_outreach'), color: 'text-blue-400' },
      interview: { icon: UserIcon, label: t('type_interview'), color: 'text-green-400' },
      meeting: { icon: Calendar, label: t('type_meeting'), color: 'text-yellow-400' },
      research: { icon: Search, label: t('type_research'), color: 'text-indigo-400' },
      other: { icon: CheckSquare, label: t('type_other'), color: 'text-gray-400' }
    };
    const config = configs[type] || configs.other;
    config.label = formatKeyForDisplay(config.label);
    return config;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(user?.language || 'nl', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const _format = (date, formatStr) => {
    const months = [t('month_jan'), t('month_feb'), t('month_mar'), t('month_apr'), t('month_may'), t('month_jun'), t('month_jul'), t('month_aug'), t('month_sep'), t('month_oct'), t('month_nov'), t('month_dec')];
    if (formatStr === 'MMM d') {
      return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    return date.toLocaleDateString(user?.language || 'nl');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getTypeBadgeContent = (type) => {
    const config = getTypeConfig(type);
    const TypeIcon = config.icon;
    return (
      <span className="flex items-center gap-1">
        <TypeIcon className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due < now;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>{t('loading_tasks')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
          border-color: rgba(239,68,68,.4) !important;
        }
        .btn-outline {
          background: rgba(255,255,255,.04) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.08) !important;
          color: #FFFFFF !important;
        }
      `}</style>

      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <IconWrapper icon={CheckSquare} size={32} variant="muted" glow={false} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
                {t('tasks_title')}
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {t('tasks_subtitle')}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
            {t('new_task')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{t('pending')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                  {stats.pending}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{t('in_progress')}</p>
                <p className="text-2xl font-bold" style={{ color: '#FBBF24' }}>
                  {stats.in_progress}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{t('completed')}</p>
                <p className="text-2xl font-bold" style={{ color: '#34D399' }}>
                  {stats.completed}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{t('overdue')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {stats.overdue}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{t('due_today')}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {stats.dueToday}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
                <Input
                  placeholder={t('search_tasks')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-transparent border text-base h-11"
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="btn-outline w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    <SelectValue placeholder={t('status')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>{t('filter_all_status')}</SelectItem>
                  <SelectItem value="pending" style={{ color: 'var(--txt)' }}>{t('status_pending')}</SelectItem>
                  <SelectItem value="in_progress" style={{ color: 'var(--txt)' }}>{t('status_in_progress')}</SelectItem>
                  <SelectItem value="completed" style={{ color: 'var(--txt)' }}>{t('status_completed')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="btn-outline w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    <SelectValue placeholder={t('priority')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>{t('filter_all_priority')}</SelectItem>
                  <SelectItem value="urgent" style={{ color: 'var(--txt)' }}>{t('priority_urgent')}</SelectItem>
                  <SelectItem value="high" style={{ color: 'var(--txt)' }}>{t('priority_high')}</SelectItem>
                  <SelectItem value="medium" style={{ color: 'var(--txt)' }}>{t('priority_medium')}</SelectItem>
                  <SelectItem value="low" style={{ color: 'var(--txt)' }}>{t('priority_low')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="btn-outline w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    <SelectValue placeholder={t('type')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                  <SelectItem value="all" style={{ color: 'var(--txt)' }}>{t('filter_all_types')}</SelectItem>
                  <SelectItem value="follow_up" style={{ color: 'var(--txt)' }}>{t('type_follow_up')}</SelectItem>
                  <SelectItem value="outreach" style={{ color: 'var(--txt)' }}>{t('type_outreach')}</SelectItem>
                  <SelectItem value="interview" style={{ color: 'var(--txt)' }}>{t('type_interview')}</SelectItem>
                  <SelectItem value="meeting" style={{ color: 'var(--txt)' }}>{t('type_meeting')}</SelectItem>
                  <SelectItem value="research" style={{ color: 'var(--txt)' }}>{t('type_research')}</SelectItem>
                  <SelectItem value="other" style={{ color: 'var(--txt)' }}>{t('type_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <IconWrapper icon={CheckSquare} size={48} variant="muted" />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--txt)' }}>
                  {t('no_tasks_found')}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  {statusFilter === 'all'
                    ? t('no_tasks_desc')
                    : t('no_filtered_tasks_desc', { status: translateStatus(statusFilter) })}
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  <IconWrapper icon={Plus} size={18} variant="accent" className="mr-2" />
                  {t('create_task')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTasks.map((task) => {
              const assignedUser = userCache[task.assigned_to];
              const candidate = candidateCache[task.candidate_id];
              const project = projectCache[task.project_id];
              const isProcessing = processingTasks.has(task.id);
              const isFollowUpTask = task.type === 'follow_up' && task.title?.toLowerCase().includes(t('follow_up_title_keyword').toLowerCase());

              return (
                <Card
                  key={task.id}
                  className="glass-card hover:bg-white/[0.02] transition-all cursor-pointer"
                  onClick={() => { setSelectedTask(task); setShowDetailsModal(true); }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3
                              className={`font-semibold text-lg ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}
                              style={{ color: 'var(--txt)' }}
                            >
                              {task.title}
                            </h3>
                            <Badge
                              style={{
                                background: `${getPriorityColor(task.priority)}20`,
                                color: getPriorityColor(task.priority),
                                border: `1px solid ${getPriorityColor(task.priority)}40`,
                                padding: '4px 12px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              {getPriorityConfig(task.priority).label}
                            </Badge>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: 'rgba(255,255,255,.2)',
                                background: 'rgba(255,255,255,.05)',
                                color: 'var(--txt)',
                                padding: '4px 12px',
                                fontSize: '11px'
                              }}
                            >
                              {getTypeBadgeContent(task.type)}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
                            {candidate && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(createPageUrl('CandidateProfile') + '?id=' + candidate.id);
                                }}
                                className="flex items-center gap-1 hover:text-accent transition-colors"
                                style={{ color: 'var(--txt)' }}
                              >
                                <UserIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                <span>{candidate.first_name} {candidate.last_name}</span>
                              </button>
                            )}
                            {project && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(createPageUrl('Projects'));
                                }}
                                className="flex items-center gap-1 hover:text-accent transition-colors"
                                style={{ color: 'var(--txt)' }}
                              >
                                <Briefcase className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                <span>{project.title}</span>
                              </button>
                            )}
                            {assignedUser && (
                              <div className="flex items-center gap-1" style={{ color: 'var(--txt)' }}>
                                <UserIcon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                                <span>{assignedUser.full_name}</span>
                              </div>
                            )}
                            {task.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" style={{ color: isOverdue(task.due_date) && task.status !== 'completed' ? '#EF4444' : 'var(--muted)' }} />
                                <span
                                  className={isOverdue(task.due_date) && task.status !== 'completed' ? 'text-red-400' : ''}
                                  style={{ color: isOverdue(task.due_date) && task.status !== 'completed' ? '#EF4444' : 'var(--txt)' }}
                                >
                                  {formatDate(task.due_date)}
                                </span>
                              </div>
                            )}
                            {task.auto_created && (
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: 'rgba(239,68,68,.3)',
                                  background: 'rgba(239,68,68,.08)',
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  color: 'var(--accent)'
                                }}
                              >
                                <Zap className="w-3 h-3 mr-1" style={{ color: 'var(--accent)' }} />
                                {t('auto_created')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isFollowUpTask && task.status !== 'completed' && (
                          <div className="flex gap-1 mr-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setProcessingTasks(prev => new Set([...prev, task.id]));
                                (async () => {
                                  try {
                                    const currentDate = new Date(task.due_date || new Date());
                                    let businessDaysAdded = 0;
                                    let futureDate = new Date(currentDate);
                                    futureDate.setHours(0, 0, 0, 0);
                                    
                                    while (businessDaysAdded < 3) {
                                      futureDate.setDate(futureDate.getDate() + 1);
                                      const dayOfWeek = futureDate.getDay();
                                      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                                        businessDaysAdded++;
                                      }
                                    }
                                    
                                    const newDueDate = futureDate.toISOString().split('T')[0];
                                    await Task.update(task.id, { due_date: newDueDate });
                                    await loadTasks();
                                  } catch (error) {
                                    console.error("Error snoozing task:", error);
                                  } finally {
                                    setProcessingTasks(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(task.id);
                                      return newSet;
                                    });
                                  }
                                })();
                              }}
                              disabled={isProcessing}
                              className="btn-outline h-9 px-3"
                              title="Snooze 3 dagen"
                            >
                              <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleFollowUpAction(task.id, false); }}
                              disabled={isProcessing}
                              className="btn-outline h-9 px-3"
                              title={t('no_response')}
                            >
                              <X className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            </Button>
                          </div>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" style={{ color: 'var(--muted)' }}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setShowDetailsModal(true); }}
                              style={{color: 'var(--txt)'}}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {t('view_details')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                              disabled={task.status === 'completed' || isProcessing}
                              style={{color: 'var(--txt)'}}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {t('mark_complete')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator style={{background: 'rgba(255,255,255,.06)'}} />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="glass-card max-w-2xl" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
          <DialogHeader>
            <DialogTitle style={{color: 'var(--txt)'}}>{t('create_task')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>
                {t('task_title')} *
              </label>
              <Input
                placeholder={t('task_title_placeholder')}
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-transparent border"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)'}}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>
                {t('description')}
              </label>
              <Textarea
                placeholder={t('description_placeholder')}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="h-24 bg-transparent border"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)'}}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>
                  {t('type')}
                </label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger className="btn-outline">
                    <SelectValue placeholder={t('type')} />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                    <SelectItem value="follow_up" style={{color: 'var(--txt)'}}>{t('type_follow_up')}</SelectItem>
                    <SelectItem value="outreach" style={{color: 'var(--txt)'}}>{t('type_outreach')}</SelectItem>
                    <SelectItem value="interview" style={{color: 'var(--txt)'}}>{t('type_interview')}</SelectItem>
                    <SelectItem value="meeting" style={{color: 'var(--txt)'}}>{t('type_meeting')}</SelectItem>
                    <SelectItem value="research" style={{color: 'var(--txt)'}}>{t('type_research')}</SelectItem>
                    <SelectItem value="other" style={{color: 'var(--txt)'}}>{t('type_other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>
                  {t('priority')}
                </label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger className="btn-outline">
                    <SelectValue placeholder={t('priority')} />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                    <SelectItem value="urgent" style={{color: 'var(--txt)'}}>{t('priority_urgent')}</SelectItem>
                    <SelectItem value="high" style={{color: 'var(--txt)'}}>{t('priority_high')}</SelectItem>
                    <SelectItem value="medium" style={{color: 'var(--txt)'}}>{t('priority_medium')}</SelectItem>
                    <SelectItem value="low" style={{color: 'var(--txt)'}}>{t('priority_low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{color: 'var(--txt)'}}>
                {t('due_date')}
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="bg-transparent border"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)'}}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="btn-outline">
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateTask} disabled={isLoading} className="btn-primary">
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('create_task')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal */}
      {selectedTask && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="glass-card max-w-2xl" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
            <DialogHeader>
              <DialogTitle style={{color: 'var(--txt)'}}>{selectedTask.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const typeConfig = getTypeConfig(selectedTask.type);
                  const priorityConfig = getPriorityConfig(selectedTask.priority);
                  return (
                    <>
                      <Badge variant="outline" className={`${typeConfig.color} border-current/30`}>
                        <typeConfig.icon className="w-3 h-3 mr-1" />
                        {typeConfig.label}
                      </Badge>
                      <Badge className={priorityConfig.color}>
                        {priorityConfig.label}
                      </Badge>
                      <Badge variant="outline" style={{borderColor: 'rgba(255,255,255,.12)', color: 'var(--txt)'}}>
                        {translateStatus(selectedTask.status)}
                      </Badge>
                    </>
                  );
                })()}
              </div>

              {selectedTask.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{color: 'var(--txt)'}}>{t('description')}</h4>
                  <p className="text-sm" style={{color: 'var(--muted)'}}>{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTask.due_date && (
                  <div>
                    <h4 className="text-sm font-medium mb-1" style={{color: 'var(--txt)'}}>{t('due_date')}</h4>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>{formatDate(selectedTask.due_date)}</p>
                  </div>
                )}

                {selectedTask.created_date && (
                  <div>
                    <h4 className="text-sm font-medium mb-1" style={{color: 'var(--txt)'}}>{t('created_date')}</h4>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>{formatDate(selectedTask.created_date)}</p>
                  </div>
                )}

                {selectedTask.completed_at && (
                  <div>
                    <h4 className="text-sm font-medium mb-1" style={{color: 'var(--txt)'}}>{t('completed_date')}</h4>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>{formatDate(selectedTask.completed_at)}</p>
                  </div>
                )}
              </div>

              {selectedTask.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{color: 'var(--txt)'}}>{t('notes')}</h4>
                  <p className="text-sm" style={{color: 'var(--muted)'}}>{selectedTask.notes}</p>
                </div>
              )}

              {selectedTask.candidate_id && candidateCache[selectedTask.candidate_id] && (
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{color: 'var(--txt)'}}>{t('related_candidate')}</h4>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      navigate(createPageUrl('CandidateProfile') + '?id=' + selectedTask.candidate_id);
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/[0.03] transition-all"
                    style={{background: 'rgba(255,255,255,.02)', width: '100%'}}
                  >
                    <UserIcon className="w-4 h-4" style={{color: 'var(--accent)'}} />
                    <span style={{color: 'var(--txt)'}}>
                      {candidateCache[selectedTask.candidate_id].first_name} {candidateCache[selectedTask.candidate_id].last_name}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto" style={{color: 'var(--muted)'}} />
                  </button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="btn-outline">
                {t('close')}
              </Button>
              {selectedTask.status !== 'completed' && (
                <Button onClick={() => {
                  handleCompleteTask(selectedTask.id);
                  setShowDetailsModal(false);
                }} className="btn-primary">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('mark_complete')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
