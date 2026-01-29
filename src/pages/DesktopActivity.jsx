import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [activityLogs, setActivityLogs] = useState([]);
  const [journals, setJournals] = useState([]);
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

  const DOWNLOAD_URL = "https://github.com/frogody/sync.desktop/releases/download/v1.0.0/SYNC.Desktop-1.0.0-arm64.dmg";
  const BYPASS_COMMAND = "xattr -cr ~/Downloads/SYNC.Desktop*.dmg && open ~/Downloads/SYNC.Desktop*.dmg";

  const handleDownload = () => {
    // Start the download
    window.open(DOWNLOAD_URL, '_blank');
    // Show the installation guide
    setShowInstallModal(true);
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(BYPASS_COMMAND);
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
      default:
        startDate.setDate(endDate.getDate() - 7);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const maxDailyMinutes = Math.max(...stats.dailyBreakdown.map(d => d.minutes), 1);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-cyan-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 p-6"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-10 bg-blue-600" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                <Laptop className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Activity</h1>
                <p className="text-zinc-500 mt-1">Track your productivity across all devices</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32 bg-zinc-800/50 border-zinc-700/60 text-zinc-200">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="1d">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleDownload}
                variant="outline"
                className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Get Desktop App
              </Button>

              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-200"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Download SYNC Desktop Banner */}
        {activityLogs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900/60 to-zinc-900/60 border border-cyan-500/20 p-6"
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20 bg-cyan-500" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-10 bg-cyan-400" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                  <Download className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-2">Download SYNC Desktop</h2>
                  <p className="text-zinc-400 mb-4 max-w-xl">
                    Unlock powerful productivity tracking with the SYNC Desktop companion app.
                    Get detailed insights into your work patterns and let SYNC understand your context.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Activity className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>Automatic activity tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Target className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>Focus score calculation</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Brain className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>AI-generated daily journals</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>Context-aware SYNC chat</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>Hourly productivity summaries</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>Floating avatar widget</span>
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
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                {stats.totalMinutes > 0 && (
                  <Badge className="bg-blue-950/40 text-blue-300/80 border-blue-800/30 text-xs">Active</Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-zinc-100">{formatDuration(stats.totalMinutes)}</div>
              <div className="text-sm text-zinc-500">Total Active Time</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{Math.round(stats.avgFocusScore * 100)}%</div>
              <div className="text-sm text-zinc-500">Avg Focus Score</div>
              <Progress value={stats.avgFocusScore * 100} className="mt-2 h-1 bg-zinc-800" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-green-950/60 border border-green-800/40 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{Math.round(stats.avgProductivity * 100)}%</div>
              <div className="text-sm text-zinc-500">Avg Productivity</div>
              <Progress value={stats.avgProductivity * 100} className="mt-2 h-1 bg-zinc-800" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-100">{stats.topApps.length}</div>
              <div className="text-sm text-zinc-500">Apps Tracked</div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1.5 gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-blue-300/90 text-zinc-500 px-4">
              <BarChart3 className="w-4 h-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="apps" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-blue-300/90 text-zinc-500 px-4">
              <Monitor className="w-4 h-4 mr-2" />Apps
            </TabsTrigger>
            <TabsTrigger value="journals" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-blue-300/90 text-zinc-500 px-4">
              <FileText className="w-4 h-4 mr-2" />Daily Journals
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-blue-300/90 text-zinc-500 px-4">
              <Activity className="w-4 h-4 mr-2" />Timeline
            </TabsTrigger>
            <TabsTrigger value="context" className="data-[state=active]:bg-zinc-800/80 data-[state=active]:text-purple-300/90 text-zinc-500 px-4">
              <Brain className="w-4 h-4 mr-2" />Deep Context
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Activity Chart */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Daily Activity
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
              </div>

              {/* Top Apps */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-cyan-400" />
                  Top Applications
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
                              <span className="text-sm font-medium text-zinc-200 truncate">{item.app}</span>
                              <span className="text-sm text-zinc-400 ml-2">{formatDuration(item.minutes)}</span>
                            </div>
                            <Progress value={percentage} className="h-1.5 bg-zinc-700" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Apps Tab */}
          <TabsContent value="apps" className="mt-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                All Applications
              </h3>

              {stats.topApps.length === 0 ? (
                <div className="text-center py-16">
                  <Monitor className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-zinc-100 mb-2">No Applications Tracked</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto mb-6">
                    Install and run SYNC Desktop Companion to start tracking your application usage.
                  </p>
                  <Button
                    onClick={() => window.open('/DownloadApp', '_self')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                            <h4 className="font-medium text-zinc-200 truncate">{item.app}</h4>
                            <p className="text-sm text-zinc-500">{percentage.toFixed(1)}% of total</p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-zinc-100 mb-2">
                          {formatDuration(item.minutes)}
                        </div>
                        <Progress value={percentage} className="h-2 bg-zinc-700" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Journals Tab */}
          <TabsContent value="journals" className="mt-6">
            <div className="space-y-4">
              {/* Quick Actions Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Daily Journals</h3>
                    <p className="text-xs text-zinc-500">AI-powered productivity reflections</p>
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
                <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 text-center">
                  <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-zinc-100 mb-2">No Daily Journals Yet</h4>
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
                </div>
              ) : (
                <Link to={createPageUrl('DailyJournal')} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 group-hover:border-cyan-500/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider">
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
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center border border-cyan-500/20">
                          <Calendar className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-zinc-100">
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
                        <div className="text-2xl font-bold text-zinc-100">
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
                          <Monitor className="w-4 h-4 text-blue-400" />
                          <span>{journals[0].top_apps.length} apps tracked</span>
                        </div>
                      )}
                      {journals[0].focus_areas && journals[0].focus_areas.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-green-400" />
                          <span>{journals[0].focus_areas.length} focus areas</span>
                        </div>
                      )}
                      {journals[0].highlights && journals[0].highlights.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>{journals[0].highlights.length} highlights</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </Link>
              )}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Activity Timeline
              </h3>

              {activityLogs.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-zinc-100 mb-2">No Activity Recorded</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    Activity data will appear here once SYNC Desktop starts tracking your usage.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {activityLogs.slice(0, 50).map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-all border border-zinc-700/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-zinc-200">
                            {new Date(log.hour_start).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <Badge className="bg-blue-950/40 text-blue-300/80 border-blue-800/30 text-xs">
                            {formatDuration(log.total_minutes)}
                          </Badge>
                          <Badge className="bg-cyan-950/40 text-cyan-300/80 border-cyan-800/30 text-xs">
                            {Math.round((log.focus_score || 0) * 100)}% focus
                          </Badge>
                        </div>
                        {log.app_breakdown && (Array.isArray(log.app_breakdown) ? log.app_breakdown.length > 0 : Object.keys(log.app_breakdown).length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(Array.isArray(log.app_breakdown)
                              ? log.app_breakdown
                                  .sort((a, b) => (b.minutes || 0) - (a.minutes || 0))
                                  .slice(0, 5)
                                  .map(item => ({ app: item.appName || item.app, mins: item.minutes || 0 }))
                              : Object.entries(log.app_breakdown)
                                  .sort(([,a], [,b]) => b - a)
                                  .slice(0, 5)
                                  .map(([app, mins]) => ({ app, mins }))
                            ).map(({ app, mins }) => (
                                <Badge
                                  key={app}
                                  className="bg-zinc-700/50 text-zinc-400 border-zinc-600/50 text-xs"
                                >
                                  {app}: {mins}m
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Deep Context Tab */}
          <TabsContent value="context" className="mt-6 space-y-6">
            {/* Work Pattern Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Focus Time Heatmap */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/30 to-zinc-900/50 border border-purple-800/30">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Focus Patterns
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
                        <Badge className="bg-purple-950/50 text-purple-300 border-purple-800/40">
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
                        {['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)'].map((period, i) => {
                          const value = 20 + Math.random() * 60; // Placeholder - will be real data
                          return (
                            <div key={period}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-zinc-400">{period}</span>
                                <span className="text-purple-300">{Math.round(value)}%</span>
                              </div>
                              <Progress value={value} className="h-2 bg-zinc-800" />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* App Categories Breakdown */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/30 to-zinc-900/50 border border-blue-800/30">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-400" />
                  Work Categories
                </h3>
                <div className="space-y-3">
                  {stats.topApps.length === 0 ? (
                    <div className="text-center py-8">
                      <Monitor className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500">No category data yet</p>
                    </div>
                  ) : (
                    <>
                      {['Development', 'Communication', 'Browsing', 'Writing'].map((category, i) => {
                        const categoryApps = stats.topApps.filter(app => {
                          const appName = app.appName?.toLowerCase() || '';
                          if (category === 'Development') return appName.includes('code') || appName.includes('terminal');
                          if (category === 'Communication') return appName.includes('slack') || appName.includes('mail');
                          if (category === 'Browsing') return appName.includes('chrome') || appName.includes('safari');
                          if (category === 'Writing') return appName.includes('notion') || appName.includes('docs');
                          return false;
                        });
                        const totalMins = categoryApps.reduce((sum, app) => sum + (app.minutes || 0), 0);
                        const percentage = stats.totalMinutes > 0 ? (totalMins / stats.totalMinutes) * 100 : 0;

                        const colors = {
                          'Development': 'from-blue-500 to-cyan-500',
                          'Communication': 'from-purple-500 to-pink-500',
                          'Browsing': 'from-green-500 to-emerald-500',
                          'Writing': 'from-amber-500 to-orange-500'
                        };

                        return (
                          <div key={category} className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors[category]}`} />
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-zinc-300">{category}</span>
                                <span className="text-zinc-400">{Math.round(percentage)}%</span>
                              </div>
                              <Progress value={percentage} className="h-1.5 bg-zinc-800" />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed App Usage with Context */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-lg font-semibold text-zinc-200 mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                Detailed App Usage & Context
              </h3>

              {activityLogs.length === 0 ? (
                <div className="text-center py-16">
                  <Brain className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-zinc-100 mb-2">Deep Context Coming Soon</h4>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    OCR text, semantic analysis, and work context will appear here as you use SYNC Desktop.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.slice(0, 10).map((log, i) => {
                    const apps = Array.isArray(log.app_breakdown)
                      ? log.app_breakdown
                      : Object.entries(log.app_breakdown || {}).map(([appName, minutes]) => ({ appName, minutes }));

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:border-purple-700/40 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-medium text-zinc-200">
                              {new Date(log.hour_start).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                              })}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-blue-950/40 text-blue-300/80 border-blue-800/30 text-xs">
                                {formatDuration(log.total_minutes)}
                              </Badge>
                              <Badge className="bg-purple-950/40 text-purple-300/80 border-purple-800/30 text-xs">
                                {Math.round((log.focus_score || 0) * 100)}% focus
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-300 hover:text-purple-200"
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>

                        {/* App breakdown */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {apps.slice(0, 5).map((app, j) => (
                            <div key={j} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-700/30 border border-zinc-600/30">
                              <Monitor className="w-3 h-3 text-zinc-400" />
                              <span className="text-xs text-zinc-300">{app.appName || 'Unknown'}</span>
                              <span className="text-xs text-zinc-500">{app.minutes || app}m</span>
                            </div>
                          ))}
                        </div>

                        {/* Context preview (will show OCR/semantic data when available) */}
                        {log.semantic_category && (
                          <div className="mt-3 pt-3 border-t border-zinc-700/40">
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <Brain className="w-4 h-4 text-purple-400" />
                              <span>Category: <span className="text-purple-300">{log.semantic_category}</span></span>
                            </div>
                          </div>
                        )}

                        {log.ocr_text && (
                          <div className="mt-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-700/30">
                            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Screen Content Preview
                            </div>
                            <p className="text-sm text-zinc-400 line-clamp-2">{log.ocr_text}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
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
                  The download should begin automatically. If not,
                  <a href={DOWNLOAD_URL} className="text-cyan-400 hover:underline ml-1">click here</a>.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">2</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-zinc-200 mb-1">Open Terminal & Run This Command</h4>
                <p className="text-sm text-zinc-400 mb-3">
                  macOS blocks apps from unidentified developers. Run this command to bypass:
                </p>
                <div className="relative">
                  <pre className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 pr-12 text-sm text-cyan-300 overflow-x-auto">
                    {BYPASS_COMMAND}
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
                  Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">⌘ + Space</kbd>, type "Terminal", press Enter, then paste the command.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">Drag to Applications</h4>
                <p className="text-sm text-zinc-400">
                  When the disk image opens, drag SYNC Desktop to Applications.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">4</span>
              </div>
              <div>
                <h4 className="font-medium text-zinc-200 mb-1">Launch & Connect</h4>
                <p className="text-sm text-zinc-400">
                  Open SYNC Desktop from Applications and sign in with your iSyncSO account.
                </p>
              </div>
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
