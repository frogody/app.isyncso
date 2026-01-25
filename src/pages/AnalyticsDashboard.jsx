import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Activity,
  Brain,
  TrendingUp,
  BookOpen,
  Target,
  Clock,
  Award
} from "lucide-react";

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoadAnalytics();
  }, []);

  const checkAdminAndLoadAnalytics = async () => {
    try {
      const user = await db.auth.me();
      
      if (!user || user.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      // TODO: Call backend function to get analytics
      // const { data } = await db.functions.invoke('admin/analytics');
      // setAnalytics(data);
      
      // Mock data for now
      setAnalytics({
        platform_stats: {
          total_users: 156,
          active_users_today: 42,
          total_sessions: 3847,
          total_skill_applications: 12459,
          avg_session_duration: 127
        },
        top_skills: [
          { skill_name: 'React', applications: 1247, users: 34 },
          { skill_name: 'Python', applications: 1098, users: 29 },
          { skill_name: 'TypeScript', applications: 894, users: 28 },
          { skill_name: 'SQL', applications: 756, users: 22 },
          { skill_name: 'AWS', applications: 623, users: 18 }
        ],
        course_effectiveness: [
          { course_title: 'Advanced React Patterns', completions: 23, applications_after: 187, avg_days_to_apply: 3 },
          { course_title: 'Python for Data Science', completions: 18, applications_after: 142, avg_days_to_apply: 5 },
          { course_title: 'SQL Mastery', completions: 15, applications_after: 98, avg_days_to_apply: 2 }
        ],
        engagement_metrics: {
          daily_active_users: [12, 15, 18, 22, 19, 24, 28],
          avg_session_duration: [105, 112, 118, 125, 127, 130, 135],
          skill_applications_per_day: [156, 178, 192, 205, 218, 225, 240]
        }
      });
      
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-card border-0 p-4">
            <div className="text-center space-y-3">
              <Award className="w-8 h-8 text-red-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Access Denied</h2>
              <p className="text-xs text-gray-400">{error || 'Admin privileges required'}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const { platform_stats, top_skills, course_effectiveness } = analytics;

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4 space-y-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-lg font-bold text-white mb-1">Analytics Dashboard</h1>
          <p className="text-xs text-gray-400">Platform-wide insights and metrics</p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="glass-card border-0 p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {platform_stats.total_users}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs mb-0.5">Total Users</h3>
              <p className="text-[10px] text-emerald-300">
                {platform_stats.active_users_today} active today
              </p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {platform_stats.total_sessions.toLocaleString()}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs mb-0.5">Total Sessions</h3>
              <p className="text-[10px] text-blue-300">All-time tracked</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {platform_stats.total_skill_applications.toLocaleString()}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs mb-0.5">Skill Applications</h3>
              <p className="text-[10px] text-purple-300">Total tracked</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {platform_stats.avg_session_duration}m
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs mb-0.5">Avg Session</h3>
              <p className="text-[10px] text-amber-300">Duration</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-3 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-pink-400" />
              </div>
              <div className="text-lg font-bold text-white">
                {Math.round((platform_stats.active_users_today / platform_stats.total_users) * 100)}%
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs mb-0.5">Engagement</h3>
              <p className="text-[10px] text-pink-300">Today</p>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Skills */}
          <Card className="glass-card border-0 rounded-xl">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-emerald-400" />
                Most Used Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {top_skills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                    <div>
                      <h4 className="font-medium text-white text-xs">{skill.skill_name}</h4>
                      <p className="text-[10px] text-gray-400">{skill.users} users practicing</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-400">
                        {skill.applications.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-500">applications</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Course Effectiveness */}
          <Card className="glass-card border-0 rounded-xl">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Course Effectiveness
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-3">
                {course_effectiveness.map((course, index) => (
                  <div key={index} className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white text-xs">{course.course_title}</h4>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                        {course.completions} completions
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-gray-400">Applications after</p>
                        <p className="text-white font-semibold">{course.applications_after}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Avg days to apply</p>
                        <p className="text-white font-semibold">{course.avg_days_to_apply}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Trends */}
        <Card className="glass-card border-0 rounded-xl">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Engagement Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Daily Active Users</h4>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-white">
                    {platform_stats.active_users_today}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18% vs last week</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Avg Session Duration</h4>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-white">
                    {platform_stats.avg_session_duration}m
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12% vs last week</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Skill Applications/Day</h4>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-white">240</div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+24% vs last week</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}