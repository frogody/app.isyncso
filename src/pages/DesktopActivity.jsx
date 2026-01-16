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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-journal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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

      toast.success(`Journal generated for ${result.date}`);
      // Refresh data to show the new journal
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
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Activity</h1>
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
        </Tabs>
      </div>
    </div>
  );
}
