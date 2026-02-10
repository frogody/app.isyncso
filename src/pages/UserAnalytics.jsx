import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Course, User, UserProgress } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, TrendingUp, Clock, Award, Activity, BarChart3, PieChart, Calendar,
  Target, BookOpen, User as UserIcon, Download, RefreshCw, ArrowUp, ArrowDown,
  Zap, Eye, Filter, Search, ChevronRight, Sparkles, Brain, Flame, Trophy,
  GraduationCap, Star, AlertCircle, CheckCircle2, XCircle, TrendingDown,
  Layers, GitBranch, Timer, MousePointer, PlayCircle, PauseCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from "recharts";

const CYAN_COLORS = {
  primary: '#22d3ee',
  secondary: '#06b6d4',
  tertiary: '#0891b2',
  dark: '#164e63',
  light: '#a5f3fc',
};

const CHART_COLORS = ['#22d3ee', '#0891b2', '#06b6d4', '#67e8f9', '#a5f3fc', '#cffafe'];

export default function UserAnalytics() {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('engagement');
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyticsData = async () => {
    try {
      const [coursesData, usersData, progressData] = await Promise.all([
        Course.list(),
        User.list(),
        UserProgress.list()
      ]);
      setCourses(coursesData);
      setUsers(usersData);
      setUserProgress(progressData);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  // Core metrics
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeUserIds = [...new Set(userProgress.map(p => p.user_id))];
    const activeUsers = activeUserIds.length;
    const totalEnrollments = userProgress.length;
    const completedEnrollments = userProgress.filter(p => p.status === 'completed').length;
    const inProgressEnrollments = userProgress.filter(p => p.status === 'in_progress').length;

    const avgProgress = userProgress.length > 0
      ? Math.round(userProgress.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / userProgress.length)
      : 0;

    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    const avgTimeSpent = userProgress.filter(p => p.time_spent_minutes).length > 0
      ? Math.round(userProgress.filter(p => p.time_spent_minutes).reduce((sum, p) => sum + p.time_spent_minutes, 0) / userProgress.filter(p => p.time_spent_minutes).length)
      : 0;

    const enrollmentsPerUser = activeUsers > 0 ? (totalEnrollments / activeUsers).toFixed(1) : 0;

    return {
      totalUsers,
      activeUsers,
      totalEnrollments,
      completedEnrollments,
      inProgressEnrollments,
      avgProgress,
      completionRate,
      avgTimeSpent,
      enrollmentsPerUser,
      activationRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    };
  }, [users, userProgress]);

  // Engagement levels
  const engagement = useMemo(() => {
    const userCourseCount = {};
    userProgress.forEach(p => {
      userCourseCount[p.user_id] = (userCourseCount[p.user_id] || 0) + 1;
    });

    const levels = { power: 0, high: 0, medium: 0, low: 0, inactive: 0 };

    users.forEach(user => {
      const count = userCourseCount[user.id] || 0;
      if (count >= 5) levels.power++;
      else if (count >= 3) levels.high++;
      else if (count === 2) levels.medium++;
      else if (count === 1) levels.low++;
      else levels.inactive++;
    });

    return levels;
  }, [users, userProgress]);

  // Course analytics
  const courseAnalytics = useMemo(() => {
    return courses.map(course => {
      const enrollments = userProgress.filter(p => p.course_id === course.id);
      const completions = enrollments.filter(p => p.status === 'completed');
      const inProgress = enrollments.filter(p => p.status === 'in_progress');
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / enrollments.length)
        : 0;
      const avgTime = enrollments.filter(p => p.time_spent_minutes).length > 0
        ? Math.round(enrollments.filter(p => p.time_spent_minutes).reduce((sum, p) => sum + p.time_spent_minutes, 0) / enrollments.filter(p => p.time_spent_minutes).length)
        : 0;

      return {
        ...course,
        enrollmentCount: enrollments.length,
        completionCount: completions.length,
        inProgressCount: inProgress.length,
        completionRate: enrollments.length > 0 ? Math.round((completions.length / enrollments.length) * 100) : 0,
        avgProgress,
        avgTimeMinutes: avgTime,
        dropoffRate: enrollments.length > 0 ? Math.round(((enrollments.length - completions.length - inProgress.length) / enrollments.length) * 100) : 0,
      };
    }).sort((a, b) => b.enrollmentCount - a.enrollmentCount);
  }, [courses, userProgress]);

  // Learning patterns
  const learningPatterns = useMemo(() => {
    const byDifficulty = { beginner: 0, intermediate: 0, advanced: 0 };
    const byCategory = {};
    const byDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const completionTimes = [];

    userProgress.forEach(progress => {
      const course = courses.find(c => c.id === progress.course_id);
      if (!course) return;

      if (byDifficulty[course.difficulty] !== undefined) {
        byDifficulty[course.difficulty]++;
      }

      byCategory[course.category] = (byCategory[course.category] || 0) + 1;

      if (progress.updated_date) {
        const day = new Date(progress.updated_date).toLocaleDateString('en-US', { weekday: 'short' });
        if (byDay[day] !== undefined) byDay[day]++;
      }

      if (progress.status === 'completed' && progress.time_spent_minutes) {
        completionTimes.push(progress.time_spent_minutes);
      }
    });

    return { byDifficulty, byCategory, byDay, completionTimes };
  }, [courses, userProgress]);

  // Time series data for charts
  const timeSeriesData = useMemo(() => {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayProgress = userProgress.filter(p => {
        const pDate = new Date(p.updated_date || p.created_date).toISOString().split('T')[0];
        return pDate === dateStr;
      });

      last30Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        enrollments: dayProgress.length,
        completions: dayProgress.filter(p => p.status === 'completed').length,
        activeUsers: [...new Set(dayProgress.map(p => p.user_id))].length,
      });
    }
    return last30Days;
  }, [userProgress]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return userProgress
      .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))
      .slice(0, 15)
      .map(activity => {
        const course = courses.find(c => c.id === activity.course_id);
        const user = users.find(u => u.id === activity.user_id);
        return { ...activity, course, user };
      });
  }, [userProgress, courses, users]);

  // Category distribution for pie chart
  const categoryData = useMemo(() => {
    return Object.entries(learningPatterns.byCategory)
      .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [learningPatterns]);

  // Difficulty radar data
  const difficultyData = useMemo(() => {
    const total = Object.values(learningPatterns.byDifficulty).reduce((a, b) => a + b, 0) || 1;
    return [
      { subject: 'Beginner', A: Math.round((learningPatterns.byDifficulty.beginner / total) * 100), fullMark: 100 },
      { subject: 'Intermediate', A: Math.round((learningPatterns.byDifficulty.intermediate / total) * 100), fullMark: 100 },
      { subject: 'Advanced', A: Math.round((learningPatterns.byDifficulty.advanced / total) * 100), fullMark: 100 },
    ];
  }, [learningPatterns]);

  // Export data
  const handleExport = () => {
    const exportData = {
      metrics,
      courseAnalytics: courseAnalytics.map(c => ({
        title: c.title,
        enrollments: c.enrollmentCount,
        completions: c.completionCount,
        completionRate: c.completionRate
      })),
      engagement,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/15">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              Analytics Dashboard
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">Deep insights into user engagement and learning patterns</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800">
                <Calendar className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-zinc-700 bg-zinc-800/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-zinc-700 bg-zinc-800/50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          <MetricCard
            icon={Users}
            label="Total Users"
            value={metrics.totalUsers}
            subValue={`${metrics.activeUsers} active`}
            trend={metrics.activationRate}
            trendLabel="activation"
            color="cyan"
          />
          <MetricCard
            icon={BookOpen}
            label="Enrollments"
            value={metrics.totalEnrollments}
            subValue={`${metrics.enrollmentsPerUser}/user avg`}
            trend={12}
            color="cyan"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Completions"
            value={metrics.completedEnrollments}
            subValue={`${metrics.completionRate}% rate`}
            trend={metrics.completionRate > 50 ? 8 : -5}
            color="cyan"
          />
          <MetricCard
            icon={Target}
            label="Avg Progress"
            value={`${metrics.avgProgress}%`}
            subValue="across courses"
            trend={3}
            color="cyan"
          />
          <MetricCard
            icon={Timer}
            label="Avg Time"
            value={`${Math.round(metrics.avgTimeSpent / 60)}h`}
            subValue="per completion"
            trend={-2}
            color="cyan"
            className="hidden lg:block"
          />
        </motion.div>

        {/* Engagement Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Activity Trends
              </h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Enrollments
                </span>
                <span className="flex items-center gap-1.5 text-cyan-300/60">
                  <span className="w-2 h-2 rounded-full bg-cyan-300/60"></span>
                  Completions
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#67e8f9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="enrollments" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorEnrollments)" />
                <Area type="monotone" dataKey="completions" stroke="#67e8f9" strokeWidth={2} fillOpacity={1} fill="url(#colorCompletions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Breakdown */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-400" />
              User Engagement
            </h3>
            <div className="space-y-3">
              <EngagementRow label="Power Users" count={engagement.power} total={metrics.totalUsers} color="text-cyan-300" desc="5+ courses" />
              <EngagementRow label="Highly Engaged" count={engagement.high} total={metrics.totalUsers} color="text-cyan-400" desc="3-4 courses" />
              <EngagementRow label="Moderately Engaged" count={engagement.medium} total={metrics.totalUsers} color="text-cyan-400/70" desc="2 courses" />
              <EngagementRow label="Low Engagement" count={engagement.low} total={metrics.totalUsers} color="text-cyan-500/50" desc="1 course" />
              <EngagementRow label="Inactive" count={engagement.inactive} total={metrics.totalUsers} color="text-zinc-500" desc="No activity" />
            </div>
          </div>
        </motion.div>

        {/* Analytics Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="courses" className="space-y-4">
            <TabsList className="bg-zinc-900/80 border border-zinc-800/60 p-1 rounded-xl">
              <TabsTrigger value="courses" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400 rounded-lg">
                <BookOpen className="w-4 h-4 mr-2" />
                Course Performance
              </TabsTrigger>
              <TabsTrigger value="patterns" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400 rounded-lg">
                <Brain className="w-4 h-4 mr-2" />
                Learning Patterns
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400 rounded-lg">
                <Users className="w-4 h-4 mr-2" />
                User Insights
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400 rounded-lg">
                <Activity className="w-4 h-4 mr-2" />
                Live Activity
              </TabsTrigger>
            </TabsList>

            {/* Course Performance Tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Course Rankings */}
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Course Rankings</h3>
                    <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                      {courseAnalytics.length} courses
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {courseAnalytics.slice(0, 10).map((course, index) => (
                      <CourseRow key={course.id} course={course} rank={index + 1} />
                    ))}
                    {courseAnalytics.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No course data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Completion Funnel */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    Learning Funnel
                  </h3>
                  <div className="space-y-3">
                    <FunnelStep label="Enrolled" count={metrics.totalEnrollments} percentage={100} />
                    <FunnelStep label="Started" count={metrics.totalEnrollments - Math.round(metrics.totalEnrollments * 0.1)} percentage={90} />
                    <FunnelStep label="In Progress" count={metrics.inProgressEnrollments} percentage={Math.round((metrics.inProgressEnrollments / (metrics.totalEnrollments || 1)) * 100)} />
                    <FunnelStep label="Completed" count={metrics.completedEnrollments} percentage={metrics.completionRate} />
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Drop-off Rate</span>
                      <span className="text-cyan-400 font-semibold">{100 - metrics.completionRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Completion Chart */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Completion Rates by Course</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={courseAnalytics.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} domain={[0, 100]} />
                    <YAxis dataKey="title" type="category" stroke="#71717a" fontSize={11} width={150} tickFormatter={(val) => val.length > 20 ? val.slice(0, 20) + '...' : val} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                      formatter={(value) => [`${value}%`, 'Completion Rate']}
                    />
                    <Bar dataKey="completionRate" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Learning Patterns Tab */}
            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Category Distribution */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Category Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPie>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                      />
                      <Legend
                        formatter={(value) => <span className="text-zinc-300 capitalize">{value}</span>}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                {/* Difficulty Radar */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    Difficulty Preference
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={difficultyData}>
                      <PolarGrid stroke="#3f3f46" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Radar name="Preference" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Weekly Activity Heatmap */}
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Weekly Activity Pattern
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(learningPatterns.byDay).map(([day, count]) => {
                      const maxCount = Math.max(...Object.values(learningPatterns.byDay)) || 1;
                      const intensity = count / maxCount;
                      return (
                        <div key={day} className="text-center">
                          <div
                            className="w-full h-14 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                            style={{
                              backgroundColor: `rgba(34, 211, 238, ${0.1 + intensity * 0.4})`,
                              color: intensity > 0.5 ? '#fff' : '#a1a1aa'
                            }}
                          >
                            {count}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1">{day}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Learning Insights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InsightCard
                  icon={Clock}
                  title="Avg Completion Time"
                  value={learningPatterns.completionTimes.length > 0
                    ? `${Math.round(learningPatterns.completionTimes.reduce((a, b) => a + b, 0) / learningPatterns.completionTimes.length / 60)}h`
                    : '0h'
                  }
                  description="Average time to complete a course"
                />
                <InsightCard
                  icon={Star}
                  title="Most Popular Level"
                  value={Object.entries(learningPatterns.byDifficulty).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                  description="Most enrolled difficulty level"
                />
                <InsightCard
                  icon={GraduationCap}
                  title="Categories Explored"
                  value={Object.keys(learningPatterns.byCategory).length}
                  description="Different categories with enrollments"
                />
              </div>
            </TabsContent>

            {/* User Insights Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* User Segments */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    User Segments
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Power', users: engagement.power, fill: '#22d3ee' },
                      { name: 'High', users: engagement.high, fill: '#06b6d4' },
                      { name: 'Medium', users: engagement.medium, fill: '#0891b2' },
                      { name: 'Low', users: engagement.low, fill: '#155e75' },
                      { name: 'Inactive', users: engagement.inactive, fill: '#3f3f46' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                      />
                      <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                        {[
                          { name: 'Power', fill: '#22d3ee' },
                          { name: 'High', fill: '#06b6d4' },
                          { name: 'Medium', fill: '#0891b2' },
                          { name: 'Low', fill: '#155e75' },
                          { name: 'Inactive', fill: '#3f3f46' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Key User Metrics */}
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Key User Metrics
                  </h3>
                  <div className="space-y-4">
                    <UserMetricRow
                      label="Activation Rate"
                      value={`${metrics.activationRate}%`}
                      desc="Users who started at least 1 course"
                      progress={metrics.activationRate}
                    />
                    <UserMetricRow
                      label="Retention Rate"
                      value={`${metrics.totalUsers > 0 ? Math.round(((engagement.power + engagement.high + engagement.medium) / metrics.totalUsers) * 100) : 0}%`}
                      desc="Users with 2+ course enrollments"
                      progress={metrics.totalUsers > 0 ? Math.round(((engagement.power + engagement.high + engagement.medium) / metrics.totalUsers) * 100) : 0}
                    />
                    <UserMetricRow
                      label="Power User Rate"
                      value={`${metrics.totalUsers > 0 ? Math.round((engagement.power / metrics.totalUsers) * 100) : 0}%`}
                      desc="Users with 5+ course enrollments"
                      progress={metrics.totalUsers > 0 ? Math.round((engagement.power / metrics.totalUsers) * 100) : 0}
                    />
                    <UserMetricRow
                      label="Completion Success"
                      value={`${metrics.completionRate}%`}
                      desc="Overall course completion rate"
                      progress={metrics.completionRate}
                    />
                  </div>
                </div>
              </div>

              {/* User Lifecycle */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-4">User Lifecycle Journey</h3>
                <div className="flex items-center justify-between">
                  <LifecycleStage icon={UserIcon} label="Registered" count={metrics.totalUsers} isFirst />
                  <LifecycleArrow />
                  <LifecycleStage icon={PlayCircle} label="First Enrollment" count={metrics.activeUsers} />
                  <LifecycleArrow />
                  <LifecycleStage icon={Activity} label="Actively Learning" count={metrics.inProgressEnrollments} />
                  <LifecycleArrow />
                  <LifecycleStage icon={Trophy} label="Completed Course" count={metrics.completedEnrollments} />
                  <LifecycleArrow />
                  <LifecycleStage icon={Star} label="Power User" count={engagement.power} isLast />
                </div>
              </div>
            </TabsContent>

            {/* Live Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Recent Activity Feed
                  </h3>
                  <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></span>
                    Live
                  </Badge>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">No recent activity</p>
                    <p className="text-zinc-500 text-xs mt-1">Activity will appear here as users interact with courses</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    <AnimatePresence>
                      {recentActivity.map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            activity.status === 'completed' ? 'bg-cyan-500/20' :
                            activity.status === 'in_progress' ? 'bg-cyan-400/15' :
                            'bg-zinc-700/50'
                          }`}>
                            {activity.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                            ) : activity.status === 'in_progress' ? (
                              <PlayCircle className="w-4 h-4 text-cyan-400/70" />
                            ) : (
                              <PauseCircle className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs">
                              <span className="font-medium">{activity.user?.full_name || 'Unknown User'}</span>
                              {activity.status === 'completed' ? ' completed ' : ' is learning '}
                              <span className="text-cyan-400/80">{activity.course?.title || 'Unknown Course'}</span>
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {new Date(activity.updated_date || activity.created_date).toLocaleString()}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-bold text-white">{activity.completion_percentage || 0}%</div>
                            <Badge className={`text-[10px] ${
                              activity.status === 'completed' ? 'bg-cyan-500/20 text-cyan-400' :
                              activity.status === 'in_progress' ? 'bg-cyan-400/10 text-cyan-400/70' :
                              'bg-zinc-700 text-zinc-400'
                            }`}>
                              {activity.status?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

// Helper Components
const METRIC_COLOR_CLASSES = {
  cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
};

function MetricCard({ icon: Icon, label, value, subValue, trend, trendLabel, color = 'cyan', className = '' }) {
  const isPositive = trend > 0;
  const colorClasses = METRIC_COLOR_CLASSES[color] || METRIC_COLOR_CLASSES.cyan;
  return (
    <motion.div

      className={`bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${colorClasses.bg}`}>
          <Icon className={`w-4 h-4 ${colorClasses.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] ${isPositive ? 'text-cyan-400' : 'text-zinc-500'}`}>
            {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-lg font-bold text-white mb-0.5">{value}</div>
      <p className="text-xs text-zinc-500">{label}</p>
      {subValue && <p className="text-[10px] text-zinc-600 mt-0.5">{subValue}</p>}
    </motion.div>
  );
}

function EngagementRow({ label, count, total, color, desc }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-medium ${color}`}>{label}</span>
          <span className="text-zinc-600 text-xs ml-2">({desc})</span>
        </div>
        <span className="text-white font-semibold">{count}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CourseRow({ course, rank }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
        rank <= 3 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-700 text-zinc-400'
      }`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate text-xs">{course.title}</h4>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
          <span className="capitalize">{course.difficulty}</span>
          <span>{course.duration_hours}h</span>
          <Badge className="bg-cyan-500/10 text-cyan-400/70 border-0 text-[10px] px-1.5 py-0">
            {course.category?.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-sm font-bold text-white">{course.enrollmentCount}</div>
          <div className="text-[10px] text-zinc-500">Enrolled</div>
        </div>
        <div>
          <div className="text-sm font-bold text-cyan-400">{course.completionCount}</div>
          <div className="text-[10px] text-zinc-500">Completed</div>
        </div>
        <div>
          <div className="text-sm font-bold text-cyan-300">{course.completionRate}%</div>
          <div className="text-[10px] text-zinc-500">Rate</div>
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ label, count, percentage }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{count}</span>
      </div>
      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-right text-xs text-zinc-500">{percentage}%</div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, value, description }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-cyan-500/15">
          <Icon className="w-4 h-4 text-cyan-400" />
        </div>
        <span className="text-xs text-zinc-400">{title}</span>
      </div>
      <div className="text-lg font-bold text-white capitalize">{value}</div>
      <p className="text-[10px] text-zinc-500 mt-0.5">{description}</p>
    </div>
  );
}

function UserMetricRow({ label, value, desc, progress }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-white font-medium">{label}</span>
          <p className="text-xs text-zinc-500">{desc}</p>
        </div>
        <span className="text-xl font-bold text-cyan-400">{value}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function LifecycleStage({ icon: Icon, label, count, isFirst, isLast }) {
  return (
    <div className="text-center flex-1">
      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1.5 ${
        isFirst ? 'bg-zinc-700' : isLast ? 'bg-cyan-500/30' : 'bg-cyan-500/15'
      }`}>
        <Icon className={`w-4 h-4 ${isFirst ? 'text-zinc-400' : 'text-cyan-400'}`} />
      </div>
      <div className="text-sm font-bold text-white">{count}</div>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function LifecycleArrow() {
  return (
    <div className="flex-shrink-0 px-2">
      <ChevronRight className="w-5 h-5 text-zinc-600" />
    </div>
  );
}
