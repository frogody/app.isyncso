import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
const { Course, User, UserProgress } = db.entities;
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award,
  Settings,
  Activity,
  BarChart3,
  PieChart,
  Clock,
  Target,
  Zap,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = React.useCallback(async () => {
    try {
      // Get current user to scope data to their company
      const currentUser = await db.auth.me();

      // Courses are shared content, but filter users/progress by company
      const coursesData = await Course.list();

      let companyUsers = [];
      let progressData = [];

      if (currentUser.company_id) {
        // Use company-scoped function if available, otherwise filter
        try {
          const usersResponse = await db.functions.invoke('getCompanyUsers', { company_id: currentUser.company_id });
          companyUsers = usersResponse.data || [];
        } catch {
          // Fallback: filter by company_id
          const allUsers = await User.list();
          companyUsers = allUsers.filter(u => u.company_id === currentUser.company_id);
        }

        // Get progress for company users only
        const userIds = new Set(companyUsers.map(u => u.id));
        const allProgress = await UserProgress.list();
        progressData = allProgress.filter(p => userIds.has(p.user_id));
      }

      setCourses(coursesData);
      setUsers(companyUsers);
      setUserProgress(progressData);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Calculate statistics
  const totalUsers = users.length;
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.is_published).length;
  const totalEnrollments = userProgress.length;
  const completedEnrollments = userProgress.filter(p => p.status === 'completed').length;
  const inProgressEnrollments = userProgress.filter(p => p.status === 'in_progress').length;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
  
  // Recent activity
  const recentEnrollments = userProgress
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const topCourses = courses
    .map(course => ({
      ...course,
      enrollmentCount: userProgress.filter(p => p.course_id === course.id).length,
      completionCount: userProgress.filter(p => p.course_id === course.id && p.status === 'completed').length
    }))
    .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-800/50 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black p-6">
      <div className="w-full px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Admin Dashboard
            </h1>
            <p className="text-lg text-zinc-500">
              Platform overview and management
            </p>
          </div>
          <div className="flex gap-4">
            <Link to={createPageUrl("ManageCourses")}>
              <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium">
                <BookOpen className="w-4 h-4 mr-2" />
                Manage Courses
              </Button>
            </Link>
            <Link to={createPageUrl("UserAnalytics")}>
              <Button variant="outline" className="border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50">
                <BarChart3 className="w-4 h-4 mr-2" />
                User Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-400/70" />
              </div>
              <div className="text-3xl font-bold text-white">{totalUsers}</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Total Users</h3>
              <p className="text-sm text-zinc-500">Registered learners</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-cyan-400/70" />
              </div>
              <div className="text-3xl font-bold text-white">{publishedCourses}</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Published Courses</h3>
              <p className="text-sm text-zinc-500">Out of {totalCourses} total</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Activity className="w-6 h-6 text-cyan-400/70" />
              </div>
              <div className="text-3xl font-bold text-white">{totalEnrollments}</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Total Enrollments</h3>
              <p className="text-sm text-zinc-500">Course starts</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Award className="w-6 h-6 text-cyan-400/70" />
              </div>
              <div className="text-3xl font-bold text-white">{completionRate}%</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Completion Rate</h3>
              <p className="text-sm text-zinc-500">{completedEnrollments} completed</p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-8">
            {/* Course Performance */}
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="p-6 border-b border-zinc-800/60">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400/70" />
                  Top Performing Courses
                </h3>
              </div>
              <div className="p-6">
                {topCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-500">No course data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topCourses.map((course, index) => (
                      <div key={course.id} className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400/80 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{course.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-zinc-500">
                              <span>{course.enrollmentCount} enrollments</span>
                              <span>{course.completionCount} completed</span>
                              <Badge className="bg-cyan-500/15 text-cyan-400/70 border-cyan-500/25">
                                {course.difficulty}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {course.enrollmentCount > 0 ? Math.round((course.completionCount / course.enrollmentCount) * 100) : 0}%
                          </div>
                          <div className="text-xs text-zinc-500">completion</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="p-6 border-b border-zinc-800/60">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400/70" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                {recentEnrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-500">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEnrollments.map((enrollment) => {
                      const course = courses.find(c => c.id === enrollment.course_id);
                      return (
                        <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              enrollment.status === 'completed' ? 'bg-cyan-400/80' :
                              enrollment.status === 'in_progress' ? 'bg-cyan-400/60' :
                              'bg-zinc-500'
                            }`}></div>
                            <div>
                              <p className="text-white text-sm">
                                User enrolled in <span className="font-medium">{course?.title || 'Unknown Course'}</span>
                              </p>
                              <p className="text-zinc-500 text-xs">
                                {new Date(enrollment.created_date).toLocaleDateString()} - 
                                Status: {enrollment.status}
                              </p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${
                            enrollment.status === 'completed' ? 'bg-cyan-500/20 text-cyan-400/80 border-cyan-500/30' :
                            enrollment.status === 'in_progress' ? 'bg-cyan-500/15 text-cyan-400/70 border-cyan-500/25' :
                            'bg-zinc-700/50 text-zinc-400 border-zinc-600/40'
                          }`}>
                            {enrollment.completion_percentage}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="p-6 border-b border-zinc-800/60">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400/70" />
                  Quick Stats
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Active Learners</span>
                  <span className="text-white font-bold">{inProgressEnrollments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Avg. Course Duration</span>
                  <span className="text-white font-bold">
                    {courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + (c.duration_hours || 0), 0) / courses.length) : 0}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Draft Courses</span>
                  <span className="text-white font-bold">{totalCourses - publishedCourses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Success Rate</span>
                  <span className="text-cyan-400/80 font-bold">{completionRate}%</span>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="p-6 border-b border-zinc-800/60">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400/70" />
                  System Status
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400/70 rounded-full"></div>
                    <span className="text-zinc-500">Platform</span>
                  </div>
                  <span className="text-cyan-400/70 text-sm">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400/70 rounded-full"></div>
                    <span className="text-zinc-500">AI Assistant</span>
                  </div>
                  <span className="text-cyan-400/70 text-sm">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400/70 rounded-full"></div>
                    <span className="text-zinc-500">Database</span>
                  </div>
                  <span className="text-cyan-400/70 text-sm">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400/50 rounded-full"></div>
                    <span className="text-zinc-500">Storage</span>
                  </div>
                  <span className="text-cyan-400/60 text-sm">78% Used</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="p-6 border-b border-zinc-800/60">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400/70" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <Link to={createPageUrl("ManageCourses")}>
                  <Button className="w-full justify-start bg-zinc-800/40 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700/30">
                    <BookOpen className="w-4 h-4 mr-2 text-cyan-400/60" />
                    Create New Course
                  </Button>
                </Link>
                <Link to={createPageUrl("UserAnalytics")}>
                  <Button className="w-full justify-start bg-zinc-800/40 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700/30">
                    <Users className="w-4 h-4 mr-2 text-cyan-400/60" />
                    View User Reports
                  </Button>
                </Link>
                <Link to={createPageUrl("CourseUpgrader")}>
                  <Button className="w-full justify-start bg-zinc-800/40 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700/30">
                    <TrendingUp className="w-4 h-4 mr-2 text-cyan-400/60" />
                    Course Upgrader
                  </Button>
                </Link>
                <Link to={createPageUrl("AIAssistant")}>
                  <Button className="w-full justify-start bg-zinc-800/40 hover:bg-zinc-800/60 text-zinc-300 border border-zinc-700/30">
                    <Zap className="w-4 h-4 mr-2 text-cyan-400/60" />
                    AI Course Generator
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminGuard>
  );
}