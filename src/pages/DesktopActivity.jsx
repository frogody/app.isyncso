import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Copy, Check, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { SyncViewSelector } from '@/components/sync/ui';

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

export default function DesktopActivity() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(urlTab);
  const [dateRange, setDateRange] = useState('90d');

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);
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

  const DOWNLOAD_URL_ARM64 = "https://github.com/frogody/sync.desktop/releases/download/v2.0.2/SYNC.Desktop-2.0.2-arm64.dmg";
  const DOWNLOAD_URL_INTEL = "https://github.com/frogody/sync.desktop/releases/download/v2.0.2/SYNC.Desktop-2.0.2-x64.dmg";
  const INSTALL_SCRIPT_URL = "https://github.com/frogody/sync.desktop/releases/download/v2.0.2/install-macos.command";
  const INSTALL_COMMAND = `curl -fsSL ${INSTALL_SCRIPT_URL} | bash`;

  const handleDownload = () => {
    // Auto-detect architecture and download the right DMG
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

      // Fetch activity logs
      const { data: logs, error: logsError } = await db.from('desktop_activity_logs')
        .select('*')
        .eq('user_id', userData.id)
        .gte('hour_start', startDate.toISOString())
        .lte('hour_start', endDate.toISOString())
        .order('hour_start', { ascending: false });

      if (logsError) throw logsError;
      setActivityLogs(logs || []);

      // Check if any activity data exists at all (regardless of date range)
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

      // Fetch journals
      const { data: journalData, error: journalError } = await db.from('daily_journals')
        .select('*')
        .eq('user_id', userData.id)
        .gte('journal_date', startDate.toISOString().split('T')[0])
        .lte('journal_date', endDate.toISOString().split('T')[0])
        .order('journal_date', { ascending: false });

      if (journalError) throw journalError;
      setJournals(journalData || []);

      // Calculate stats
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

    // Aggregate app usage - handle both array and object formats
    const appTotals = {};
    logs.forEach(log => {
      if (log.app_breakdown) {
        if (Array.isArray(log.app_breakdown)) {
          // New array format: [{appName, minutes, category, percentage}, ...]
          log.app_breakdown.forEach(item => {
            const appName = item.appName || item.app;
            const mins = item.minutes || 0;
            if (appName) {
              appTotals[appName] = (appTotals[appName] || 0) + mins;
            }
          });
        } else {
          // Legacy object format: {appName: minutes, ...}
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

    // Daily breakdown
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
      // Use hardcoded URL to avoid environment variable issues
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

      // Immediately update UI with the returned journal
      if (result.journal) {
        setJournals(prev => {
          // Remove existing journal for same date if exists
          const filtered = prev.filter(j => j.journal_date !== result.journal.journal_date);
          // Add new journal at the beginning
          return [result.journal, ...filtered];
        });
      }

      // Also do a full refresh to ensure sync
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-5">
        <div className="max-w-7xl mx-auto space-y-5">
          <Skeleton className="h-12 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const maxDailyMinutes = Math.max(...stats.dailyBreakdown.map(d => d.minutes), 1);

  return (
    <div className="bg-black">
      <div className="w-full px-4 lg:px-6 py-3 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-white">Activity</h1>
              <p className="text-xs text-zinc-400">Track your productivity across all devices</p>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-28 h-8 text-xs bg-zinc-800/50 border-zinc-700/60 text-zinc-200">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="1d">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Desktop App
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-200 h-8 w-8 p-0"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <SyncViewSelector />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/50 p-0.5 rounded-lg">
            <TabsTrigger value="overview" className="text-xs px-3 py-1.5 data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300 rounded-md">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs px-3 py-1.5 data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300 rounded-md">Timeline</TabsTrigger>
            <TabsTrigger value="context" className="text-xs px-3 py-1.5 data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300 rounded-md">Context</TabsTrigger>
            <TabsTrigger value="apps" className="text-xs px-3 py-1.5 data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300 rounded-md">Apps</TabsTrigger>
            <TabsTrigger value="journals" className="text-xs px-3 py-1.5 data-[state=active]:bg-zinc-800/80 data-[state=active]:text-cyan-300 rounded-md">Journals</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-5 space-y-5">
            {/* No data in current range — suggest widening */}
            {activityLogs.length === 0 && hasAnyData && lastActivityDate && (
              <GlassCard hover={false} animated={true} className="p-5" glow="cyan">
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
                    className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex-shrink-0"
                  >
                    Show Last 90 Days
                  </Button>
                </div>
              </GlassCard>
            )}

            {/* Download SYNC Desktop Banner */}
            {activityLogs.length === 0 && !hasAnyData && (
              <GlassCard hover={false} animated={true} className="p-5" glow="cyan">
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
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Brain className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>Deep context awareness</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <MessageSquare className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>Commitment detection</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Activity className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>Smart activity classification</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Zap className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>Context switch detection</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Target className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>Skill signal tracking</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>Daily journals & focus scores</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Code className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>File & document monitoring</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Laptop className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span>AES-256 encrypted, privacy-first</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-shrink-0">
                    <Button
                      onClick={handleDownload}
                      className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 px-6 py-3 h-auto w-full"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download for macOS
                    </Button>
                    <p className="text-xs text-zinc-500 text-center">Windows coming soon</p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-cyan-400" />
                    </div>
                    {stats.totalMinutes > 0 && (
                      <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">Active</Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">{formatDuration(stats.totalMinutes)}</div>
                  <div className="text-sm text-zinc-500">Total Active Time</div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                      <Target className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(stats.avgFocusScore * 100)}%</div>
                  <div className="text-sm text-zinc-500">Avg Focus Score</div>
                  <Progress value={stats.avgFocusScore * 100} className="mt-2 h-1 bg-zinc-800" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">{Math.round(stats.avgProductivity * 100)}%</div>
                  <div className="text-sm text-zinc-500">Avg Productivity</div>
                  <Progress value={stats.avgProductivity * 100} className="mt-2 h-1 bg-zinc-800" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.topApps.length}</div>
                  <div className="text-sm text-zinc-500">Apps Tracked</div>
                </div>
              </motion.div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Daily Activity Chart */}
              <GlassCard hover={false} animated={false} className="p-5">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Daily Activity</div>
                <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Activity Over Time
                </h3>

                {stats.dailyBreakdown.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500">No activity data yet</p>
                    <p className="text-sm text-zinc-600">Install and run SYNC Desktop to start tracking</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.dailyBreakdown.slice(-7).map((day, i) => (
                      <div key={day.date} className="flex items-center gap-4">
                        <div className="w-20 text-xs text-zinc-500 text-right">
                          {formatDate(day.date)}
                        </div>
                        <div className="flex-1 h-8 bg-zinc-800/50 rounded-lg overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(day.minutes / maxDailyMinutes) * 100}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
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
              </GlassCard>

              {/* Top Apps */}
              <GlassCard hover={false} animated={false} className="p-5">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Top Applications</div>
                <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-cyan-400" />
                  Most Used Apps
                </h3>

                {stats.topApps.length === 0 ? (
                  <div className="text-center py-12">
                    <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500">No apps tracked yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topApps.map((item, i) => {
                      const AppIcon = getAppIcon(item.app);
                      const percentage = (item.minutes / stats.totalMinutes) * 100;
                      return (
                        <motion.div
                          key={item.app}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAppColor(item.app)} flex items-center justify-center`}>
                            <AppIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-white truncate">{item.app}</span>
                              <span className="text-sm text-zinc-400 ml-2">{formatDuration(item.minutes)}</span>
                            </div>
                            <Progress value={percentage} className="h-1.5 bg-zinc-700" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          </TabsContent>

          {/* Apps Tab */}
          <TabsContent value="apps" className="mt-5">
            <GlassCard hover={false} animated={false} className="p-5">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">All Applications</div>
              <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                Application Usage
              </h3>

              {stats.topApps.length === 0 ? (
                <div className="text-center py-16">
                  <Monitor className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Applications Tracked</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto mb-6">
                    Install and run SYNC Desktop Companion to start tracking your application usage.
                  </p>
                  <Button
                    onClick={() => window.open('/DownloadApp', '_self')}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download SYNC Desktop
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.topApps.map((item, i) => {
                    const AppIcon = getAppIcon(item.app);
                    const percentage = (item.minutes / stats.totalMinutes) * 100;
                    return (
                      <motion.div
                        key={item.app}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAppColor(item.app)} flex items-center justify-center`}>
                            <AppIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white truncate">{item.app}</h4>
                            <p className="text-sm text-zinc-500">{percentage.toFixed(1)}% of total</p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-2">
                          {formatDuration(item.minutes)}
                        </div>
                        <Progress value={percentage} className="h-2 bg-zinc-700" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          {/* Journals Tab */}
          <TabsContent value="journals" className="mt-5">
            <div className="space-y-4">
              {/* Quick Actions Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-800/60">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Daily Journals</h3>
                    <p className="text-xs text-zinc-500">AI-generated daily activity reports</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => generateJournal(new Date())}
                    disabled={generatingJournal}
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/50"
                  >
                    {generatingJournal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Today
                      </>
                    )}
                  </Button>
                  <Link to={createPageUrl('DailyJournal')}>
                    <Button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View All Journals
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Latest Journal Preview */}
              {journals.length === 0 ? (
                <GlassCard hover={false} animated={false} className="p-5 text-center">
                  <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Daily Journals Yet</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto mb-6">
                    Generate your first journal to see AI-powered insights about your productivity.
                  </p>
                  <Button
                    onClick={() => generateJournal(new Date())}
                    disabled={generatingJournal}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                  >
                    {generatingJournal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Today's Journal
                      </>
                    )}
                  </Button>
                </GlassCard>
              ) : (
                <Link to={createPageUrl('DailyJournal')} className="block group">
                  <GlassCard hover={true} animated={true} className="p-5 group-hover:border-cyan-500/30 transition-all cursor-pointer" glow="cyan">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" />
                        Latest Journal
                      </div>
                      <div className="flex items-center gap-2 text-sm text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        View all {journals.length} journals
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-800/60">
                          <Calendar className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white">
                            {new Date(journals[0].journal_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-zinc-500">
                            <span>{formatDuration(journals[0].total_active_minutes)} active</span>
                            {journals[0].ai_generated && (
                              <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Enhanced
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {Math.round((journals[0].productivity_score || 0) * 100)}%
                        </div>
                        <div className="text-sm text-zinc-500">Productivity</div>
                      </div>
                    </div>

                    {journals[0].overview && (
                      <p className="text-zinc-300 leading-relaxed line-clamp-3">
                        {journals[0].overview}
                      </p>
                    )}

                    {/* Summary stats row */}
                    <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center gap-6 text-sm text-zinc-500">
                      {journals[0].top_apps && journals[0].top_apps.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-cyan-400" />
                          <span>{journals[0].top_apps.length} apps tracked</span>
                        </div>
                      )}
                      {journals[0].focus_areas && journals[0].focus_areas.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-cyan-400" />
                          <span>{journals[0].focus_areas.length} focus areas</span>
                        </div>
                      )}
                      {journals[0].highlights && journals[0].highlights.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <span>{journals[0].highlights.length} highlights</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </Link>
              )}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-5">
            <GlassCard hover={false} animated={false} className="p-5">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Activity Timeline</div>
              <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Recent Activity
              </h3>

              {activityLogs.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Activity Recorded</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    Activity data will appear here once SYNC Desktop starts tracking your usage.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {activityLogs.slice(0, 50).map((log, i) => {
                    // Generate a meaningful activity summary from the data
                    const apps = Array.isArray(log.app_breakdown)
                      ? log.app_breakdown.sort((a, b) => (b.minutes || 0) - (a.minutes || 0))
                      : [];
                    const topApp = apps[0];
                    const topAppName = topApp?.appName || topApp?.app || '';

                    // Derive categories with time
                    const catMins = {};
                    apps.forEach(item => {
                      const cat = item.category || 'Other';
                      catMins[cat] = (catMins[cat] || 0) + (item.minutes || 0);
                    });
                    const sortedCats = Object.entries(catMins).sort(([,a], [,b]) => b - a);
                    const topCategory = sortedCats[0]?.[0] || 'Other';

                    // Extract meaningful context from OCR if available
                    let contextHint = '';
                    if (log.ocr_text) {
                      const ocrText = log.ocr_text;
                      const patterns = [
                        /(?:src|lib|components|pages|services)\/[\w/.-]+/i,
                        /(?:pull request|PR|issue|commit)\s*#?\d*/i,
                        /(?:Subject|Re):\s*[^\n]{5,60}/i,
                        /(?:meeting|standup|sync|call|huddle)\b/i,
                      ];
                      for (const pattern of patterns) {
                        const match = ocrText.match(pattern);
                        if (match) {
                          contextHint = match[0].trim().slice(0, 80);
                          break;
                        }
                      }
                    }

                    // Build the top-line summary (case-insensitive category matching)
                    const primaryApps = apps.slice(0, 3).map(a => a.appName || a.app).filter(Boolean);
                    let summaryLine = '';
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
                    } else if (lowerTopCat.includes('entertainment')) {
                      summaryLine = `Entertainment and media`;
                    } else if (primaryApps.length > 0) {
                      summaryLine = `Working in ${primaryApps.join(', ')}`;
                    }

                    const commitments = parseCommitments(log.commitments);

                    return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-all border border-zinc-700/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-800/60 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {new Date(log.hour_start).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">
                            {formatDuration(log.total_minutes)}
                          </Badge>
                          <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">
                            {Math.round((log.focus_score || 0) * 100)}% focus
                          </Badge>
                          {topCategory && topCategory !== 'Other' && (
                            <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-xs">
                              {topCategory}
                            </Badge>
                          )}
                        </div>

                        {/* Activity summary line */}
                        {summaryLine && (
                          <p className="text-sm text-zinc-300 mt-1.5">{summaryLine}</p>
                        )}

                        {/* Category breakdown */}
                        {sortedCats.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {sortedCats.slice(0, 4).map(([cat, mins]) => (
                              <Badge key={cat} className="bg-zinc-700/50 text-zinc-400 border-zinc-600/50 text-xs">
                                {cat}: {mins}m
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Commitments / action items */}
                        {commitments && commitments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {commitments.map((c, ci) => (
                              <Badge key={ci} className="bg-amber-500/10 text-amber-200/90 border-amber-500/20 text-xs">
                                {c.description || c.title || c.text || (typeof c === 'string' ? c : JSON.stringify(c))}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Screen content (collapsed by default, no raw dump) */}
                        {log.ocr_text && (
                          <button
                            onClick={() => toggleOcrExpand(log.id)}
                            className="mt-2 text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {expandedOcr.has(log.id) ? 'Hide screen content' : 'Show screen content'}
                          </button>
                        )}
                        {log.ocr_text && expandedOcr.has(log.id) && (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700/30">
                            <p className="text-xs text-zinc-400 whitespace-pre-wrap">{log.ocr_text}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          {/* Deep Context Tab */}
          <TabsContent value="context" className="mt-5 space-y-5">
            {/* Work Pattern Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Focus Time Heatmap */}
              <GlassCard hover={false} animated={false} className="p-5 bg-gradient-to-br from-cyan-950/30 to-zinc-900/60 border-cyan-800/30">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Focus Patterns</div>
                <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  Focus Analysis
                </h3>
                <div className="space-y-4">
                  {stats.dailyBreakdown.length === 0 ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500">No focus data yet</p>
                      <p className="text-sm text-zinc-600">Data will appear as you work</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Peak Focus Time</span>
                        <Badge className="bg-cyan-950/50 text-cyan-300 border-cyan-800/40">
                          {(() => {
                            const peakHour = activityLogs.reduce((max, log) =>
                              (log.focus_score || 0) > (max.focus_score || 0) ? log : max
                            , activityLogs[0] || {});
                            return peakHour.hour_start ? new Date(peakHour.hour_start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            }) : 'N/A';
                          })()}
                        </Badge>
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
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-zinc-400">{label}</span>
                                <span className="text-cyan-300">{Math.round(avgFocus)}%</span>
                              </div>
                              <Progress value={avgFocus} className="h-2 bg-zinc-800" />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </GlassCard>

              {/* App Categories Breakdown */}
              <GlassCard hover={false} animated={false} className="p-5 bg-gradient-to-br from-cyan-950/30 to-zinc-900/60 border-cyan-800/30">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Work Categories</div>
                <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-cyan-400" />
                  Category Breakdown
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const categoryCounts = {};
                    let totalWithCategory = 0;
                    activityLogs.forEach(log => {
                      // Primary: derive from app_breakdown categories (most reliable)
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
                      // Fallback: try semantic_category as JSON breakdown, then plain string
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
                    const categories = Object.entries(categoryCounts)
                      .sort(([,a], [,b]) => b - a);

                    if (categories.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                          <p className="text-zinc-500">No category data yet</p>
                          <p className="text-xs text-zinc-600 mt-1">Categories appear as SYNC Desktop analyzes your work</p>
                        </div>
                      );
                    }

                    const gradients = [
                      'from-blue-500 to-cyan-500',
                      'from-cyan-500 to-cyan-400',
                      'from-cyan-500 to-blue-500',
                      'from-blue-500 to-blue-400',
                      'from-cyan-400 to-blue-400',
                      'from-blue-400 to-cyan-300',
                    ];

                    return categories.map(([category, mins], i) => {
                      const percentage = totalWithCategory > 0 ? (mins / totalWithCategory) * 100 : 0;
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradients[i % gradients.length]}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-zinc-300">{category}</span>
                              <span className="text-zinc-400">{Math.round(percentage)}%</span>
                            </div>
                            <Progress value={percentage} className="h-1.5 bg-zinc-800" />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </GlassCard>
            </div>

            {/* Detailed App Usage with Context */}
            <GlassCard hover={false} animated={false} className="p-5">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Detailed Usage</div>
              <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                App Usage & Context
              </h3>

              {activityLogs.length === 0 ? (
                <div className="text-center py-16">
                  <Brain className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">Deep Context Coming Soon</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    OCR text, semantic analysis, and work context will appear here as you use SYNC Desktop.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.slice(0, 10).map((log, i) => {
                    const apps = Array.isArray(log.app_breakdown)
                      ? log.app_breakdown.sort((a, b) => (b.minutes || 0) - (a.minutes || 0))
                      : Object.entries(log.app_breakdown || {}).map(([appName, minutes]) => ({ appName, minutes }));

                    // Derive categories
                    const ctxCatMins = {};
                    apps.forEach(item => {
                      const cat = item.category || 'Other';
                      ctxCatMins[cat] = (ctxCatMins[cat] || 0) + (item.minutes || 0);
                    });
                    const ctxSortedCats = Object.entries(ctxCatMins).sort(([,a], [,b]) => b - a);
                    const ctxTopCat = ctxSortedCats.find(([c]) => c !== 'Other' && c !== 'System')?.[0] || ctxSortedCats[0]?.[0];

                    // Build activity summary
                    const ctxPrimaryApps = apps.slice(0, 3).map(a => a.appName || a.app).filter(Boolean);
                    let ctxSummary = '';
                    const lowerCat = (ctxTopCat || '').toLowerCase();
                    if (lowerCat.includes('development') || lowerCat === 'coding') {
                      ctxSummary = `Development work in ${ctxPrimaryApps.join(', ')}`;
                    } else if (lowerCat.includes('communication') || lowerCat === 'chatting') {
                      ctxSummary = `Communication via ${ctxPrimaryApps.join(', ')}`;
                    } else if (lowerCat.includes('meeting')) {
                      ctxSummary = `In meetings (${ctxPrimaryApps.join(', ')})`;
                    } else if (lowerCat.includes('browsing')) {
                      ctxSummary = `Browsing and research`;
                    } else if (lowerCat.includes('design')) {
                      ctxSummary = `Design work in ${ctxPrimaryApps.join(', ')}`;
                    } else if (lowerCat.includes('productivity')) {
                      ctxSummary = `Productivity tasks in ${ctxPrimaryApps.join(', ')}`;
                    } else if (ctxPrimaryApps.length > 0) {
                      ctxSummary = `Working in ${ctxPrimaryApps.join(', ')}`;
                    }

                    // Parse semantic_category properly
                    let parsedCategories = null;
                    if (log.semantic_category && log.semantic_category !== 'other') {
                      try {
                        const parsed = JSON.parse(log.semantic_category);
                        if (typeof parsed === 'object' && parsed !== null) {
                          parsedCategories = Object.entries(parsed).sort(([,a], [,b]) => b - a);
                        }
                      } catch {
                        // Plain string
                        if (log.semantic_category !== 'other') {
                          parsedCategories = [[log.semantic_category, log.total_minutes || 1]];
                        }
                      }
                    }

                    const commitments = parseCommitments(log.commitments);

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:border-cyan-700/40 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {new Date(log.hour_start).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                              })}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">
                                {formatDuration(log.total_minutes)}
                              </Badge>
                              <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">
                                {Math.round((log.focus_score || 0) * 100)}% focus
                              </Badge>
                              {ctxTopCat && ctxTopCat !== 'Other' && (
                                <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 text-xs">
                                  {ctxTopCat}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Activity summary */}
                        {ctxSummary && (
                          <p className="text-sm text-zinc-300 mb-3">{ctxSummary}</p>
                        )}

                        {/* Category breakdown (from app_breakdown or semantic_category) */}
                        {ctxSortedCats.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {ctxSortedCats.slice(0, 4).map(([cat, mins]) => (
                              <Badge key={cat} className="bg-zinc-700/50 text-zinc-400 border-zinc-600/50 text-xs">
                                {cat}: {mins}m
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Commitments / action items */}
                        {commitments && commitments.length > 0 && (
                          <div className="mb-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <div className="text-xs text-amber-300/70 mb-1.5 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Commitments
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {commitments.map((c, ci) => (
                                <Badge key={ci} className="bg-amber-500/10 text-amber-200/90 border-amber-500/20 text-xs">
                                  {c.description || c.title || c.text || (typeof c === 'string' ? c : 'Commitment detected')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Screen content (hidden by default) */}
                        {log.ocr_text && (
                          <button
                            onClick={() => toggleOcrExpand(`ctx-${log.id}`)}
                            className="mt-1 text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {expandedOcr.has(`ctx-${log.id}`) ? 'Hide screen content' : 'Show screen content'}
                          </button>
                        )}
                        {log.ocr_text && expandedOcr.has(`ctx-${log.id}`) && (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700/30">
                            <p className="text-xs text-zinc-400 whitespace-pre-wrap">{log.ocr_text}</p>
                          </div>
                        )}

                        {log.screen_captures && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Monitor className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] text-zinc-500">
                              {Array.isArray(log.screen_captures) ? log.screen_captures.length : log.screen_captures} screen capture{(Array.isArray(log.screen_captures) ? log.screen_captures.length : log.screen_captures) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
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

            {/* Step 3 — Gatekeeper */}
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
                    <strong className="text-amber-300">Option A:</strong> Open <strong>System Settings → Privacy & Security</strong>, scroll down and click <strong>"Open Anyway"</strong> next to the SYNC Desktop message.
                  </p>
                  <p className="text-sm text-zinc-300">
                    <strong className="text-amber-300">Option B:</strong> In Finder, <strong>right-click</strong> SYNC Desktop in Applications → click <strong>"Open"</strong> → confirm <strong>"Open"</strong> again.
                  </p>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  You only need to do this once. After that the app opens normally.
                </p>
              </div>
            </div>

            {/* Step 4 — Sign In */}
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
