import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Monitor, Clock, Zap, TrendingUp, Calendar, BarChart3, PieChart,
  RefreshCw, Download, ChevronLeft, ChevronRight, Loader2, Laptop,
  Target, Activity, Brain, Coffee, Code, Chrome, MessageSquare, FileText,
  Music, Video, Mail, Terminal, Folder, Settings, Plus, Sparkles, BookOpen, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check, ExternalLink, Shield } from 'lucide-react';
import { StatCard } from '@/components/ui/GlassCard';
import { SyncPageHeader } from '@/components/sync/ui';
import InfoCard from '@/components/shared/InfoCard';

// ---------------------------------------------------------------------------
// Motion presets (matching StoreDashboard)
// ---------------------------------------------------------------------------

const SLIDE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = (delay = 0) => ({
  ...SLIDE_UP,
  transition: { ...SLIDE_UP.transition, delay },
});

// App icon mapping
const APP_ICONS = {
  'Visual Studio Code': Code,
  'VS Code': Code,
  'Code': Code,
  'Chrome': Chrome,
  'Google Chrome': Chrome,
  'Safari': Chrome,
  'Firefox': Chrome,
  'Arc': Chrome,
  'Slack': MessageSquare,
  'Discord': MessageSquare,
  'Microsoft Teams': MessageSquare,
  'Zoom': Video,
  'Notion': FileText,
  'Obsidian': FileText,
  'Notes': FileText,
  'Spotify': Music,
  'Apple Music': Music,
  'Mail': Mail,
  'Gmail': Mail,
  'Outlook': Mail,
  'Terminal': Terminal,
  'iTerm': Terminal,
  'Finder': Folder,
  'System Preferences': Settings,
  'Settings': Settings,
};

const APP_COLORS = {
  'Visual Studio Code': 'from-blue-500 to-blue-600',
  'VS Code': 'from-blue-500 to-blue-600',
  'Code': 'from-blue-500 to-blue-600',
  'Chrome': 'from-green-500 to-emerald-600',
  'Google Chrome': 'from-green-500 to-emerald-600',
  'Safari': 'from-blue-400 to-cyan-500',
  'Arc': 'from-purple-500 to-pink-500',
  'Slack': 'from-purple-600 to-purple-700',
  'Discord': 'from-indigo-500 to-indigo-600',
  'Notion': 'from-zinc-600 to-zinc-700',
  'Terminal': 'from-zinc-800 to-black',
  'Finder': 'from-blue-500 to-cyan-500',
  'Spotify': 'from-green-500 to-green-600',
};

// ---------------------------------------------------------------------------
// Deep Context Tab — commitments & skills from desktop_context_events
// ---------------------------------------------------------------------------

// Map event_type/app to icon + color
const ACTIVITY_ICONS = {
  coding: { icon: Code, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  browsing: { icon: Chrome, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  communication: { icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  writing: { icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  email: { icon: Mail, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  meeting: { icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  design: { icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  idle: { icon: Coffee, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};
const DEFAULT_ACTIVITY = { icon: Activity, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' };

function getActivityStyle(eventType) {
  return ACTIVITY_ICONS[eventType] || DEFAULT_ACTIVITY;
}

function DeepContextTab({ userId }) {
  const [events, setEvents] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    async function fetchDeepContext() {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await db.from('desktop_context_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (data) {
        setEvents(data);
        setHasMore(data.length === 1000);

        const allCommitments = [];
        const seenCommitments = new Set();
        const allSkills = new Set();
        for (const event of data) {
          for (const c of (event.commitments || [])) {
            const key = c.description?.toLowerCase().trim();
            if (key && seenCommitments.has(key)) continue;
            if (key) seenCommitments.add(key);
            allCommitments.push({ ...c, timestamp: event.created_at, app: event.source_application });
          }
          for (const s of (event.skill_signals || [])) {
            const path = Array.isArray(s.skillPath) ? s.skillPath.join(' > ') : s.skillCategory;
            if (path) allSkills.add(path);
          }
        }
        setCommitments(allCommitments);
        setSkills([...allSkills]);
      }
      setLoading(false);
    }
    if (userId) fetchDeepContext();
  }, [userId]);

  // Build work sessions - consecutive events on same topic
  const workSessions = React.useMemo(() => {
    const sessions = [];
    let current = null;

    const sorted = [...events].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    for (const e of sorted) {
      const topic = e.source_window_title || e.summary || `${e.event_type} in ${e.source_application}`;

      if (current && current.app === e.source_application && current.topic === topic) {
        current.end = new Date(e.created_at);
        current.eventCount++;
      } else {
        if (current) sessions.push(current);
        current = {
          topic,
          app: e.source_application,
          eventType: e.event_type,
          summary: e.summary,
          windowTitle: e.source_window_title,
          start: new Date(e.created_at),
          end: new Date(e.created_at),
          eventCount: 1,
        };
      }
    }
    if (current) sessions.push(current);

    return sessions.reverse();
  }, [events]);

  // App breakdown stats
  const appBreakdown = React.useMemo(() => {
    const counts = {};
    for (const e of events) {
      const app = e.source_application || 'Unknown';
      const type = e.event_type || 'other';
      if (!counts[app]) counts[app] = { count: 0, type };
      counts[app].count++;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8);
  }, [events]);

  // Strip app suffixes from window titles for cleaner display
  const stripAppSuffix = (title) => {
    if (!title) return title;
    return title
      .replace(/\s*[-—–]\s*(Google Chrome|Chrome|Safari|Firefox|Microsoft Edge|Arc|Brave|Terminal|iTerm2?|VS Code|Visual Studio Code|Cursor|Zed|Warp|Alacritty|Hyper|kitty)\s*$/i, '')
      .replace(/\s*[-—–]\s*[A-Za-z]+\s*$/, '')
      .trim() || title;
  };

  const totalEvents = events.length;
  const totalMinutesTracked = Math.round(totalEvents * 0.5);
  const uniqueHours = React.useMemo(() => {
    const hours = new Set();
    for (const e of events) {
      hours.add(new Date(e.created_at).getHours());
    }
    return hours.size;
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <motion.div {...SLIDE_UP}>
        <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-8 text-center">
          <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm font-medium">No deep context events today</p>
          <p className="text-xs text-zinc-600 mt-2 max-w-sm mx-auto">
            Events appear as SYNC Desktop captures your screen activity. Make sure the desktop app is running.
          </p>
        </div>
      </motion.div>
    );
  }

  const visibleSessions = showAllSessions ? workSessions : workSessions.slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Summary Stats Row */}
      <motion.div {...SLIDE_UP} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Events</p>
          <p className="text-lg font-semibold text-white mt-0.5">{totalEvents}{hasMore ? '+' : ''}</p>
        </div>
        <div className="rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Minutes Tracked</p>
          <p className="text-lg font-semibold text-white mt-0.5">{totalMinutesTracked}</p>
        </div>
        <div className="rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Apps Used</p>
          <p className="text-lg font-semibold text-white mt-0.5">{appBreakdown.length}</p>
        </div>
        <div className="rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Hours Active</p>
          <p className="text-lg font-semibold text-white mt-0.5">{uniqueHours}</p>
        </div>
      </motion.div>

      {/* Work Sessions */}
      <motion.div {...stagger(0.05)}>
        <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-cyan-400" />
            Work Sessions
            <span className="text-[10px] text-zinc-500 font-normal ml-auto">{workSessions.length} sessions</span>
          </h3>
          <div className="space-y-2">
            {visibleSessions.map((session, i) => {
              const style = getActivityStyle(session.eventType);
              const rawTitle = session.windowTitle || session.summary || session.topic;
              const displayTitle = stripAppSuffix(rawTitle);
              const startTime = session.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = session.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const durationMs = session.end - session.start;
              const durationMin = Math.max(1, Math.round(durationMs / 60000));
              const timeRange = startTime === endTime ? startTime : `${startTime} - ${endTime}`;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <div className="flex items-start gap-3 p-3 rounded-[14px] border border-zinc-800/40 bg-zinc-800/20">
                    <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <style.icon className={`w-4 h-4 ${style.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{displayTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-500">{timeRange}</span>
                        <span className="text-[10px] text-zinc-500">&middot;</span>
                        <span className="text-[10px] text-zinc-500">{durationMin}m</span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-800/60 border border-zinc-700/40 rounded-full px-1.5 py-0.5">
                          {session.app}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {workSessions.length > 20 && !showAllSessions && (
            <button
              onClick={() => setShowAllSessions(true)}
              className="mt-3 w-full text-center text-xs text-cyan-400 hover:text-cyan-300 transition-colors py-2 rounded-lg border border-zinc-800/40 bg-zinc-800/20 hover:bg-zinc-800/40"
            >
              Show {workSessions.length - 20} more sessions
            </button>
          )}
        </div>
      </motion.div>

      {/* App Breakdown */}
      <motion.div {...stagger(0.1)}>
        <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-cyan-400" />
            App Usage Breakdown
          </h3>
          <div className="space-y-2.5">
            {appBreakdown.map(([app, { count, type }], i) => {
              const style = getActivityStyle(type);
              const pct = Math.round((count / totalEvents) * 100);
              const mins = Math.round(count * 0.5);
              return (
                <motion.div
                  key={app}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-7 h-7 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center flex-shrink-0`}>
                    <style.icon className={`w-3.5 h-3.5 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white font-medium truncate">{app}</span>
                      <span className="text-[10px] text-zinc-500 ml-2 flex-shrink-0">{mins}m ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full bg-cyan-500/60"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Commitments (if any) */}
      {commitments.length > 0 && (
        <motion.div {...stagger(0.15)}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                Commitments Detected
              </h3>
              <span className="text-[10px] text-zinc-500 font-medium">{commitments.length}</span>
            </div>
            <div className="space-y-2">
              {commitments.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-[14px] border border-zinc-800/40 bg-zinc-800/20">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    c.status === 'overdue' ? 'bg-red-400' :
                    c.status === 'fulfilled' ? 'bg-green-400' : 'bg-cyan-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white">{c.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-500">
                        {c.dueDate ? `Due: ${new Date(c.dueDate).toLocaleString()}` : 'No deadline'}
                      </span>
                      {c.app && (
                        <span className="text-[10px] text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 rounded-full px-1.5 py-0.5">
                          {c.app}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Skills (if any) */}
      {skills.length > 0 && (
        <motion.div {...stagger(0.2)}>
          <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Skills Exercised
              </h3>
              <span className="text-[10px] text-zinc-500 font-medium">{skills.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span key={i} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-full text-xs border border-cyan-500/20 font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function DesktopActivity({ embedded = false, onRegisterControls } = {}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState('90d');

  const [activityLogs, setActivityLogs] = useState([]);
  const [journals, setJournals] = useState([]);
  const [hasAnyData, setHasAnyData] = useState(false);
  const [lastActivityDate, setLastActivityDate] = useState(null);
  const [stats, setStats] = useState({
    totalMinutes: 0,
    avgFocusScore: 0,
    avgProductivity: 0,
    topApps: [],
    dailyBreakdown: [],
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [generatingJournal, setGeneratingJournal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [expandedOcr, setExpandedOcr] = useState(new Set());
  const [activeView, setActiveView] = useState('overview');

  const DOWNLOAD_URL_ARM64 = "https://github.com/frogody/sync.desktop/releases/download/v2.1.0/SYNC.Desktop-2.1.0-arm64.dmg";
  const DOWNLOAD_URL_INTEL = "https://github.com/frogody/sync.desktop/releases/download/v2.1.0/SYNC.Desktop-2.1.0-x64.dmg";
  const INSTALL_SCRIPT_URL = "https://github.com/frogody/sync.desktop/releases/download/v2.1.0/install-macos.command";
  const INSTALL_COMMAND = `curl -fsSL ${INSTALL_SCRIPT_URL} | bash`;

  const handleDownload = () => {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const isArm = platform.includes("ARM") || ua.includes("ARM64") || ua.includes("Apple");
    window.open(isArm ? DOWNLOAD_URL_ARM64 : DOWNLOAD_URL_INTEL, '_blank');
    setShowInstallModal(true);
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopiedCommand(true);
    toast.success('Command copied to clipboard');
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const getDateRangeParams = () => {
    const endDate = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date('2025-01-01');
        break;
      default:
        startDate.setDate(endDate.getDate() - 90);
    }

    return { startDate, endDate };
  };

  const loadData = async () => {
    try {
      const userData = await db.auth.me();
      setUser(userData);

      const { startDate, endDate } = getDateRangeParams();

      const { data: logs, error: logsError } = await db.from('desktop_activity_logs')
        .select('*')
        .eq('user_id', userData.id)
        .gte('hour_start', startDate.toISOString())
        .lte('hour_start', endDate.toISOString())
        .order('hour_start', { ascending: false });

      if (logsError) throw logsError;
      setActivityLogs(logs || []);

      if (!logs || logs.length === 0) {
        const { data: anyLogs } = await db.from('desktop_activity_logs')
          .select('hour_start')
          .eq('user_id', userData.id)
          .order('hour_start', { ascending: false })
          .limit(1);
        if (anyLogs && anyLogs.length > 0) {
          setHasAnyData(true);
          setLastActivityDate(new Date(anyLogs[0].hour_start));
        } else {
          setHasAnyData(false);
          setLastActivityDate(null);
        }
      } else {
        setHasAnyData(true);
        setLastActivityDate(null);
      }

      const { data: journalData, error: journalError } = await db.from('daily_journals')
        .select('*')
        .eq('user_id', userData.id)
        .gte('journal_date', startDate.toISOString().split('T')[0])
        .lte('journal_date', endDate.toISOString().split('T')[0])
        .order('journal_date', { ascending: false });

      if (journalError) throw journalError;
      setJournals(journalData || []);

      calculateStats(logs || [], journalData || []);

    } catch (error) {
      console.error('Failed to load desktop activity:', error);
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (logs, journalData) => {
    const totalMinutes = logs.reduce((sum, log) => sum + (log.total_minutes || 0), 0);
    const avgFocusScore = logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.focus_score || 0), 0) / logs.length
      : 0;
    const avgProductivity = journalData.length > 0
      ? journalData.reduce((sum, j) => sum + (j.productivity_score || 0), 0) / journalData.length
      : 0;

    const appTotals = {};
    logs.forEach(log => {
      if (log.app_breakdown) {
        if (Array.isArray(log.app_breakdown)) {
          log.app_breakdown.forEach(item => {
            const appName = item.appName || item.app;
            const mins = item.minutes || 0;
            if (appName) {
              appTotals[appName] = (appTotals[appName] || 0) + mins;
            }
          });
        } else {
          Object.entries(log.app_breakdown).forEach(([app, mins]) => {
            appTotals[app] = (appTotals[app] || 0) + (typeof mins === 'number' ? mins : parseInt(mins) || 0);
          });
        }
      }
    });

    const topApps = Object.entries(appTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([app, minutes]) => ({ app, minutes }));

    const dailyMap = {};
    logs.forEach(log => {
      const date = new Date(log.hour_start).toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date, minutes: 0, focusScores: [] };
      }
      dailyMap[date].minutes += log.total_minutes || 0;
      dailyMap[date].focusScores.push(log.focus_score || 0);
    });

    const dailyBreakdown = Object.values(dailyMap)
      .map(d => ({
        ...d,
        focus: d.focusScores.length > 0
          ? d.focusScores.reduce((a, b) => a + b, 0) / d.focusScores.length
          : 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    setStats({
      totalMinutes,
      avgFocusScore,
      avgProductivity,
      topApps,
      dailyBreakdown,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    toast.success('Activity data refreshed');
  };

  const generateJournal = async (date = new Date()) => {
    if (!user?.id) {
      toast.error('Please log in to generate journals');
      return;
    }

    setGeneratingJournal(true);
    try {
      const supabaseUrl = 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-daily-journal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            company_id: user.company_id,
            date: date.toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'No activity data for this date') {
          toast.error('No activity data available for this date. The desktop app needs to sync some hourly data first.');
        } else {
          toast.error(result.error || 'Failed to generate journal');
        }
        return;
      }

      toast.success(`Journal generated for ${result.date}${result.ai_generated ? ' with AI insights' : ''}`);

      if (result.journal) {
        setJournals(prev => {
          const filtered = prev.filter(j => j.journal_date !== result.journal.journal_date);
          return [result.journal, ...filtered];
        });
      }

      await loadData();
    } catch (error) {
      console.error('Error generating journal:', error);
      toast.error('Failed to generate journal');
    } finally {
      setGeneratingJournal(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getAppIcon = (appName) => {
    for (const [key, Icon] of Object.entries(APP_ICONS)) {
      if (appName.toLowerCase().includes(key.toLowerCase())) {
        return Icon;
      }
    }
    return Monitor;
  };

  const getAppColor = (appName) => {
    for (const [key, color] of Object.entries(APP_COLORS)) {
      if (appName.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    return 'from-zinc-500 to-zinc-600';
  };

  const parseCommitments = (raw) => {
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return typeof raw === 'string' && raw.trim() ? [{ description: raw }] : null;
    }
  };

  const toggleOcrExpand = (logId) => {
    setExpandedOcr(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  // Category breakdown computed once
  const categoryData = (() => {
    const categoryCounts = {};
    let totalWithCategory = 0;
    activityLogs.forEach(log => {
      if (log.app_breakdown && Array.isArray(log.app_breakdown) && log.app_breakdown.length > 0) {
        log.app_breakdown.forEach(item => {
          const cat = item.category || 'Other';
          const mins = item.minutes || 0;
          if (mins > 0) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + mins;
            totalWithCategory += mins;
          }
        });
        return;
      }
      if (log.semantic_category) {
        try {
          const parsed = JSON.parse(log.semantic_category);
          if (typeof parsed === 'object' && parsed !== null) {
            Object.entries(parsed).forEach(([cat, mins]) => {
              categoryCounts[cat] = (categoryCounts[cat] || 0) + (mins || 0);
              totalWithCategory += (mins || 0);
            });
            return;
          }
        } catch {}
        categoryCounts[log.semantic_category] = (categoryCounts[log.semantic_category] || 0) + (log.total_minutes || 1);
        totalWithCategory += (log.total_minutes || 1);
      }
    });
    return {
      categories: Object.entries(categoryCounts).sort(([, a], [, b]) => b - a),
      total: totalWithCategory,
    };
  })();

  // ── Header controls for embedded mode (must be before early returns) ──
  const dateRangePills = (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-zinc-900/60 border border-zinc-800/40">
      {[
        { key: '1d', label: 'Today' },
        { key: '7d', label: '7d' },
        { key: '30d', label: '30d' },
        { key: '90d', label: '90d' },
        { key: 'all', label: 'All' },
      ].map((p) => (
        <button
          key={p.key}
          onClick={() => setDateRange(p.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            dateRange === p.key
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  const actionButtons = (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleDownload}
        variant="outline"
        size="sm"
        className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 text-xs h-8 rounded-full"
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Desktop App
      </Button>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800/60 hover:text-white transition-all text-xs font-medium disabled:opacity-50"
      >
        {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  useEffect(() => {
    if (embedded && onRegisterControls) {
      onRegisterControls(
        <div className="flex items-center gap-3">
          {dateRangePills}
          {actionButtons}
        </div>
      );
    }
    return () => { if (embedded && onRegisterControls) onRegisterControls(null); };
  }, [embedded, onRegisterControls, dateRange, refreshing]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={embedded ? '' : 'min-h-screen bg-black px-4 lg:px-6 py-4'}>
        <div className="space-y-4">
          <div className="h-10 w-64 bg-zinc-800/50 rounded-[20px] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="h-80 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
            <div className="h-80 bg-zinc-900/30 rounded-[20px] border border-zinc-800/40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const maxDailyMinutes = Math.max(...stats.dailyBreakdown.map(d => d.minutes), 1);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={embedded ? '' : 'min-h-screen bg-black'}>
      <div className={embedded ? '' : 'w-full px-4 lg:px-6 py-4 space-y-4'}>

        {/* Header (standalone only) */}
        {!embedded && (
          <SyncPageHeader icon={BarChart3} title="Activity" subtitle="Desktop usage analytics">
            {dateRangePills}
            {actionButtons}
          </SyncPageHeader>
        )}

        {/* Privacy Notice */}
        <motion.div {...stagger(0.05)}>
          <InfoCard
            title="Your activity is private"
            icon={Shield}
            learnMoreUrl={createPageUrl('PrivacyAIAct')}
            className="bg-emerald-500/10 border-emerald-500/20"
          >
            Your employer cannot see your activity data. This is your personal productivity tool, protected by design and by law.
          </InfoCard>
        </motion.div>

        {/* No data in current range */}
        {activityLogs.length === 0 && hasAnyData && lastActivityDate && (
          <motion.div {...stagger(0.1)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-800/60 flex-shrink-0">
                  <Calendar className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-1">No activity in this period</h3>
                  <p className="text-sm text-zinc-400">
                    Your last tracked activity was on{' '}
                    <span className="text-cyan-400 font-medium">
                      {lastActivityDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>.
                    Try selecting a wider date range to see your data.
                  </p>
                </div>
                <Button
                  onClick={() => setDateRange('90d')}
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex-shrink-0 rounded-full"
                >
                  Show Last 90 Days
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Download SYNC Desktop Banner */}
        {activityLogs.length === 0 && !hasAnyData && (
          <motion.div {...stagger(0.1)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-800/60 flex-shrink-0">
                    <Download className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Download SYNC Desktop v2.0.2</h2>
                    <p className="text-zinc-400 mb-4 max-w-xl text-sm">
                      Your AI productivity companion. Reads what you're working on, detects commitments you make,
                      and gives SYNC real context to help you — all encrypted locally.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                      {[
                        { icon: Brain, text: 'Deep context awareness' },
                        { icon: MessageSquare, text: 'Commitment detection' },
                        { icon: Activity, text: 'Smart activity classification' },
                        { icon: Zap, text: 'Context switch detection' },
                        { icon: Target, text: 'Skill signal tracking' },
                        { icon: Sparkles, text: 'Daily journals & focus scores' },
                        { icon: Code, text: 'File & document monitoring' },
                        { icon: Laptop, text: 'AES-256 encrypted, privacy-first' },
                      ].map(({ icon: FIcon, text }) => (
                        <div key={text} className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <FIcon className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 lg:flex-shrink-0">
                  <Button
                    onClick={handleDownload}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 px-6 py-3 h-auto w-full rounded-full"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download for macOS
                  </Button>
                  <p className="text-xs text-zinc-500 text-center">Windows coming soon</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Clock}
            label="Total Active Time"
            value={formatDuration(stats.totalMinutes)}
            color="cyan"
            delay={0.1}
          />
          <StatCard
            icon={Target}
            label="Focus Score"
            value={`${Math.round(stats.avgFocusScore * 100)}%`}
            color="blue"
            delay={0.15}
          />
          <StatCard
            icon={TrendingUp}
            label="Productivity"
            value={`${Math.round(stats.avgProductivity * 100)}%`}
            color="green"
            delay={0.2}
          />
          <StatCard
            icon={Monitor}
            label="Top App"
            value={stats.topApps.length > 0 ? stats.topApps[0].app : 'N/A'}
            color="indigo"
            delay={0.25}
          />
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-zinc-900/60 border border-zinc-800/40 w-fit">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'deep-context', label: 'Deep Context', icon: Brain },
          ].map(({ key, label, icon: TabIcon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeView === key
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Deep Context View */}
        {activeView === 'deep-context' && user && (
          <DeepContextTab userId={user.id} />
        )}

        {/* Overview Content */}
        {activeView === 'overview' && (
        <>
        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Activity Timeline Card */}
          <motion.div {...stagger(0.3)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Activity Timeline
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium">Last 7 days</span>
              </div>

              {stats.dailyBreakdown.length === 0 ? (
                <div className="text-center py-12">
                  <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">No activity data yet</p>
                  <p className="text-sm text-zinc-600">Install and run SYNC Desktop to start tracking</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.dailyBreakdown.slice(-7).map((day, i) => (
                    <div key={day.date} className="flex items-center gap-2 sm:gap-4">
                      <div className="w-14 sm:w-20 text-[11px] sm:text-xs text-zinc-500 text-right">
                        {formatDate(day.date)}
                      </div>
                      <div className="flex-1 h-8 bg-zinc-800/50 rounded-lg overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(day.minutes / maxDailyMinutes) * 100}%` }}
                          transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-lg"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-300 font-medium">
                          {formatDuration(day.minutes)}
                        </span>
                      </div>
                      <div className="w-12 text-xs text-zinc-500">
                        {Math.round(day.focus * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Top Apps Card */}
          <motion.div {...stagger(0.35)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  Top Apps
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium">By usage</span>
              </div>

              {stats.topApps.length === 0 ? (
                <div className="text-center py-12">
                  <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">No apps tracked yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.topApps.map((item, i) => {
                    const AppIcon = getAppIcon(item.app);
                    const percentage = (item.minutes / stats.totalMinutes) * 100;
                    const maxMinutes = stats.topApps[0]?.minutes || 1;
                    const barPct = (item.minutes / maxMinutes) * 100;
                    return (
                      <motion.div
                        key={item.app}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getAppColor(item.app)} flex items-center justify-center flex-shrink-0`}>
                              <AppIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-xs font-medium text-zinc-200 truncate">{item.app}</span>
                          </div>
                          <span className="text-xs font-bold text-white tabular-nums ml-2 flex-shrink-0">{formatDuration(item.minutes)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.5, delay: 0.45 + i * 0.05, ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500">{percentage.toFixed(1)}% of total</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Category Breakdown Card */}
          <motion.div {...stagger(0.4)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  Category Breakdown
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium">By time</span>
              </div>

              {categoryData.categories.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-500">No category data yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Categories appear as SYNC Desktop analyzes your work</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryData.categories.slice(0, 8).map(([category, mins], i) => {
                    const percentage = categoryData.total > 0 ? (mins / categoryData.total) * 100 : 0;
                    const gradients = [
                      'from-cyan-500 to-cyan-400',
                      'from-blue-500 to-blue-400',
                      'from-cyan-400 to-blue-500',
                      'from-blue-400 to-cyan-300',
                      'from-cyan-500 to-blue-500',
                      'from-blue-500 to-cyan-500',
                    ];
                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.04 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradients[i % gradients.length]}`} />
                            <span className="text-xs font-medium text-zinc-200">{category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">{formatDuration(mins)}</span>
                            <span className="text-xs font-bold text-white tabular-nums">{Math.round(percentage)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${gradients[i % gradients.length]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: 0.55 + i * 0.04, ease: 'easeOut' }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions Card */}
          <motion.div {...stagger(0.45)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Quick Actions
                </h3>
              </div>

              <div className="space-y-3">
                {/* Generate Journal */}
                <button
                  onClick={() => generateJournal(new Date())}
                  disabled={generatingJournal}
                  className="w-full flex items-center gap-4 p-4 rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 hover:border-cyan-500/20 transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-[14px] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    {generatingJournal
                      ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      : <Sparkles className="w-5 h-5 text-cyan-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-white">Generate Today's Journal</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">AI-powered daily activity summary</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                </button>

                {/* View All Journals */}
                <Link to={createPageUrl('DailyJournal')} className="block">
                  <div className="w-full flex items-center gap-4 p-4 rounded-[16px] border border-zinc-800/60 bg-zinc-900/40 hover:border-cyan-500/20 transition-all group text-left">
                    <div className="w-10 h-10 rounded-[14px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white">View All Journals</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{journals.length} journal{journals.length !== 1 ? 's' : ''} available</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </Link>

                {/* Focus Analysis */}
                <div className="p-4 rounded-[16px] border border-zinc-800/60 bg-zinc-900/40">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-white">Focus Analysis</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Morning (6-12)', min: 6, max: 12 },
                      { label: 'Afternoon (12-18)', min: 12, max: 18 },
                      { label: 'Evening (18-24)', min: 18, max: 24 },
                    ].map(({ label, min, max }) => {
                      const periodLogs = activityLogs.filter(log => {
                        const h = new Date(log.hour_start).getHours();
                        return h >= min && h < max;
                      });
                      const avgFocus = periodLogs.length > 0
                        ? periodLogs.reduce((sum, l) => sum + (l.focus_score || 0), 0) / periodLogs.length * 100
                        : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-zinc-400">{label}</span>
                            <span className="text-cyan-300 font-medium">{Math.round(avgFocus)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800/50 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${avgFocus}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity Timeline */}
        {activityLogs.length > 0 && (
          <motion.div {...stagger(0.5)}>
            <div className="rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Recent Activity
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium">{activityLogs.length} entries</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {activityLogs.slice(0, 30).map((log, i) => {
                  const apps = Array.isArray(log.app_breakdown)
                    ? log.app_breakdown.sort((a, b) => (b.minutes || 0) - (a.minutes || 0))
                    : [];
                  const topApp = apps[0];
                  const topAppName = topApp?.appName || topApp?.app || '';

                  const catMins = {};
                  apps.forEach(item => {
                    const cat = item.category || 'Other';
                    catMins[cat] = (catMins[cat] || 0) + (item.minutes || 0);
                  });
                  const sortedCats = Object.entries(catMins).sort(([, a], [, b]) => b - a);
                  const topCategory = sortedCats[0]?.[0] || 'Other';

                  let contextHint = '';
                  if (log.ocr_text) {
                    const patterns = [
                      /(?:src|lib|components|pages|services)\/[\w/.-]+/i,
                      /(?:pull request|PR|issue|commit)\s*#?\d*/i,
                      /(?:Subject|Re):\s*[^\n]{5,60}/i,
                      /(?:meeting|standup|sync|call|huddle)\b/i,
                    ];
                    for (const pattern of patterns) {
                      const match = log.ocr_text.match(pattern);
                      if (match) {
                        contextHint = match[0].trim().slice(0, 80);
                        break;
                      }
                    }
                  }

                  let summaryLine = log.activities_summary || '';
                  if (!summaryLine) {
                    const primaryApps = apps.slice(0, 3).map(a => a.appName || a.app).filter(Boolean);
                    const lowerTopCat = (topCategory || '').toLowerCase();
                    if (lowerTopCat.includes('development') || lowerTopCat === 'coding') {
                      summaryLine = `Development work in ${primaryApps.join(', ')}`;
                      if (contextHint) summaryLine += ` — ${contextHint}`;
                    } else if (lowerTopCat.includes('communication') || lowerTopCat === 'chatting') {
                      summaryLine = `Communication via ${primaryApps.join(', ')}`;
                    } else if (lowerTopCat.includes('meeting')) {
                      summaryLine = `In meetings (${primaryApps.join(', ')})`;
                    } else if (lowerTopCat.includes('browsing')) {
                      summaryLine = `Browsing and research`;
                      if (contextHint) summaryLine += ` — ${contextHint}`;
                    } else if (lowerTopCat.includes('design')) {
                      summaryLine = `Design work in ${primaryApps.join(', ')}`;
                    } else if (lowerTopCat.includes('productivity')) {
                      summaryLine = `Productivity tasks in ${primaryApps.join(', ')}`;
                    } else if (primaryApps.length > 0) {
                      summaryLine = `Working in ${primaryApps.join(', ')}`;
                    }
                  }

                  const commitments = parseCommitments(log.commitments);

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + i * 0.02 }}
                      className="flex items-start gap-3 p-3 rounded-[14px] border border-zinc-800/40 bg-zinc-800/20 hover:border-zinc-700/60 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-800/40 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium text-white">
                            {new Date(log.hour_start).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-1.5 py-0.5">
                            {formatDuration(log.total_minutes)}
                          </span>
                          <span className="text-[10px] text-zinc-400 bg-zinc-800/60 border border-zinc-700/40 rounded-full px-1.5 py-0.5">
                            {Math.round((log.focus_score || 0) * 100)}% focus
                          </span>
                          {topCategory && topCategory !== 'Other' && (
                            <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-1.5 py-0.5">
                              {topCategory}
                            </span>
                          )}
                        </div>
                        {summaryLine && (
                          <p className="text-xs text-zinc-300 mt-1">{summaryLine}</p>
                        )}
                        {commitments && commitments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {commitments.map((c, ci) => (
                              <span key={ci} className="text-[10px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                                {c.description || c.title || c.text || (typeof c === 'string' ? c : 'Commitment')}
                              </span>
                            ))}
                          </div>
                        )}
                        {log.ocr_text && (
                          <button
                            onClick={() => toggleOcrExpand(log.id)}
                            className="mt-1.5 text-[10px] text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {expandedOcr.has(log.id) ? 'Hide screen content' : 'Show screen content'}
                          </button>
                        )}
                        {log.ocr_text && expandedOcr.has(log.id) && (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700/30">
                            <p className="text-[10px] text-zinc-400 whitespace-pre-wrap">{log.ocr_text}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
        </>
        )}
      </div>

      {/* Installation Guide Modal */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-zinc-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" />
              Install SYNC Desktop
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">Download Started</h4>
                <p className="text-sm text-zinc-400">
                  Your DMG is downloading. If it didn't start,{' '}
                  <a href={DOWNLOAD_URL_ARM64} className="text-cyan-400 hover:underline">Apple Silicon</a>
                  {' · '}
                  <a href={DOWNLOAD_URL_INTEL} className="text-cyan-400 hover:underline">Intel Mac</a>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">Open DMG & Drag to Applications</h4>
                <p className="text-sm text-zinc-400">
                  Double-click the downloaded <code className="text-cyan-300 bg-zinc-800 px-1 rounded">.dmg</code> file, then drag SYNC Desktop into the Applications folder.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-400 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">Allow the App to Open</h4>
                <p className="text-sm text-zinc-400 mb-2">
                  macOS will block the first launch because the app isn't from the App Store. To allow it:
                </p>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-zinc-300">
                    <strong className="text-amber-300">Option A:</strong> Open <strong>System Settings &rarr; Privacy & Security</strong>, scroll down and click <strong>"Open Anyway"</strong> next to the SYNC Desktop message.
                  </p>
                  <p className="text-sm text-zinc-300">
                    <strong className="text-amber-300">Option B:</strong> In Finder, <strong>right-click</strong> SYNC Desktop in Applications &rarr; click <strong>"Open"</strong> &rarr; confirm <strong>"Open"</strong> again.
                  </p>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  You only need to do this once. After that the app opens normally.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">4</span>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">Grant Permissions & Sign In</h4>
                <p className="text-sm text-zinc-400">
                  Grant Accessibility permission when prompted, then click "Sign in with iSyncSO" to connect your account.
                </p>
              </div>
            </div>

            {/* Terminal alternative */}
            <div className="pt-3 border-t border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Or install via Terminal</h4>
              <div className="relative">
                <pre className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 pr-12 text-sm text-cyan-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {INSTALL_COMMAND}
                </pre>
                <Button
                  onClick={copyCommand}
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-zinc-700"
                >
                  {copiedCommand ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Downloads, installs, and launches automatically — no DMG required.
              </p>
            </div>

            {/* Help link */}
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Having trouble?
                <a
                  href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  Apple's guide for opening apps from unknown developers
                </a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
