import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { db } from "@/api/supabaseClient";
import { 
  Users, 
  TrendingUp, 
  Target, 
  Award,
  AlertCircle,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Custom Recharts Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <p className="text-gray-300 font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-400 text-sm">{entry.name}:</span>
            </div>
            <span className="font-bold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ManagerDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');

  const loadAnalytics = React.useCallback(async () => {

    setLoading(true);
    setError(null);
    
    try {
      const user = await db.auth.me();
      const { data } = await db.functions.invoke('getTeamAnalytics', {
        manager_id: user.id,
        time_range: timeRange
      });
      
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load team analytics:', err);
      if (err.response?.status === 403) {
        setError('not_manager');
      } else {
        setError('general');
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20 bg-gray-800 rounded-xl" />
            <Skeleton className="h-20 bg-gray-800 rounded-xl" />
            <Skeleton className="h-20 bg-gray-800 rounded-xl" />
          </div>
          <Skeleton className="h-72 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error === 'not_manager') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="glass-card border-0 max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-gray-400">
              This dashboard is only accessible to department managers. 
              Please contact your administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'general' || !analytics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="glass-card border-0 max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Error Loading Data</h2>
            <p className="text-gray-400">
              Failed to load team analytics. The analytics service may not be configured yet.
            </p>
            <Button
              onClick={loadAnalytics}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { team_overview, skill_heatmap, activity_trend, top_performers, engagement_breakdown } = analytics || {};

  return (
    <div className="min-h-screen bg-black p-4 animate-in fade-in duration-500">
      <div className="w-full px-4 lg:px-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-white tracking-tight">Team Learning Dashboard</h1>
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            </div>
            <p className="text-gray-400 text-xs">Monitor your team's progress and identify skill gaps</p>
          </div>

          <div className="flex gap-1.5">
            {['7d', '30d', '90d'].map(range => (
              <Button
                key={range}
                size="sm"
                onClick={() => setTimeRange(range)}
                variant={timeRange === range ? 'default' : 'outline'}
                className={`transition-all h-7 text-xs ${timeRange === range
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/50'
                  : 'border-slate-700 text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-cyan-500/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 group-hover:bg-cyan-500/20 transition-colors">
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <ArrowUpRight className="w-3 h-3 text-green-400" />
              </div>
              <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Team Members</h3>
              <p className="text-lg font-bold text-white">{team_overview.total_members}</p>
              <p className="text-[10px] text-cyan-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {team_overview.active_this_week} active this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-yellow-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-yellow-500/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 group-hover:bg-yellow-500/20 transition-colors">
                  <Award className="w-4 h-4 text-yellow-400" />
                </div>
                <TrendingUp className="w-3 h-3 text-green-400" />
              </div>
              <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total Team XP</h3>
              <p className="text-lg font-bold text-white">{team_overview.total_xp.toLocaleString()}</p>
              <p className="text-[10px] text-yellow-400 mt-0.5">
                {team_overview.avg_xp_per_member} avg per member
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-xl hover:shadow-purple-500/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 group-hover:bg-purple-500/20 transition-colors">
                  <Target className="w-4 h-4 text-purple-400" />
                </div>
                <TrendingUp className="w-3 h-3 text-green-400" />
              </div>
              <h3 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Skills Tracked</h3>
              <p className="text-lg font-bold text-white">{skill_heatmap.length}</p>
              <p className="text-[10px] text-purple-400 mt-0.5">
                {engagement_breakdown.total_interactions} interactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Trend + Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Trend Chart - 2/3 width */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 lg:col-span-2">
            <CardHeader className="border-b border-slate-800 p-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                Activity Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-3 not-prose">
              {activity_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240} className="not-prose">
                  <LineChart data={activity_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickLine={{ stroke: '#475569' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      tickLine={{ stroke: '#475569' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ color: '#94a3b8', paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="xp_gained" 
                      stroke="#a855f7" 
                      strokeWidth={3}
                      name="XP Gained"
                      dot={{ fill: '#a855f7', r: 4 }}
                      activeDot={{ r: 6, fill: '#a855f7' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="code_runs" 
                      stroke="#06b6d4" 
                      strokeWidth={3}
                      name="Code Runs"
                      dot={{ fill: '#06b6d4', r: 4 }}
                      activeDot={{ r: 6, fill: '#06b6d4' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reflections" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      name="Reflections"
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6, fill: '#f59e0b' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500">
                  No activity data in this time range
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers List - 1/3 width */}
          <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-white flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <Award className="w-5 h-5 text-yellow-400" />
                </div>
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {top_performers.slice(0, 5).map((performer, index) => (
                  <div 
                    key={performer.user_id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800 transition-all duration-200 group hover:shadow-lg hover:shadow-yellow-500/10"
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-yellow-500/50' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                        'bg-gradient-to-br from-slate-600 to-slate-700'
                      }`}>
                        #{index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate group-hover:text-yellow-400 transition-colors">{performer.full_name}</p>
                      <p className="text-xs text-gray-400">Level {performer.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold text-lg">{performer.total_xp}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">XP</p>
                    </div>
                  </div>
                ))}
                
                {top_performers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Gap Heatmap */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                  <Target className="w-5 h-5 text-red-400" />
                </div>
                <CardTitle className="text-white">Skill Gap Analysis</CardTitle>
              </div>
              <span className="text-sm font-normal text-gray-400">
                Skills sorted by lowest proficiency - prioritize these for training
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 not-prose">
            {skill_heatmap.length > 0 ? (
              <ResponsiveContainer width="100%" height={450} className="not-prose">
                <BarChart data={skill_heatmap} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={{ stroke: '#475569' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="skill_name" 
                    width={180}
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 13 }}
                    tickLine={{ stroke: '#475569' }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    formatter={(value, name) => {
                      if (name === 'avg_proficiency') return [`${value}%`, 'Avg Proficiency'];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8', paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar 
                    dataKey="avg_proficiency" 
                    fill="#ef4444" 
                    name="Avg Proficiency"
                    radius={[0, 8, 8, 0]}
                    background={{ fill: '#1e293b', radius: [0, 8, 8, 0] }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[450px] flex items-center justify-center text-gray-500">
                No skill data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Breakdown */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white">Engagement Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-xl bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all duration-200 group hover:shadow-lg hover:shadow-cyan-500/10">
                <div className="inline-flex p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-3 group-hover:bg-cyan-500/20 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                </div>
                <p className="text-5xl font-bold text-cyan-400 mb-2">{engagement_breakdown.code_executions}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider">Code Executions</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all duration-200 group hover:shadow-lg hover:shadow-purple-500/10">
                <div className="inline-flex p-3 rounded-full bg-purple-500/10 border border-purple-500/30 mb-3 group-hover:bg-purple-500/20 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                </div>
                <p className="text-5xl font-bold text-purple-400 mb-2">{engagement_breakdown.reflections_submitted}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider">Reflections Submitted</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/10 transition-all duration-200 group hover:shadow-lg hover:shadow-yellow-500/10">
                <div className="inline-flex p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-3 group-hover:bg-yellow-500/20 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                </div>
                <p className="text-5xl font-bold text-yellow-400 mb-2">{engagement_breakdown.total_interactions}</p>
                <p className="text-sm text-gray-400 uppercase tracking-wider">Total Interactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members & Assignments */}
        <TeamAssignments />
      </div>
    </div>
  );
}

// Team Assignments Component
function TeamAssignments() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningTo, setAssigningTo] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");

  const loadData = React.useCallback(async () => {

    try {
      const user = await db.auth.me();
      
      // Get company users
      const { data: usersData } = await db.functions.invoke('getCompanyUsers', { company_id: user.company_id });
      const users = usersData?.users || [];
      
      // Get published courses
      const coursesData = await db.entities.Course.filter({ is_published: true });
      
      // Get all assignments for company
      const assignmentsData = await db.entities.Assignment.filter({ company_id: user.company_id });
      
      setTeamMembers(users.filter(u => u.id !== user.id));
      setCourses(coursesData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to load assignments data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = React.useCallback(async (memberId) => {
    if (!selectedCourse) {
      alert('Please select a course');
      return;
    }

    try {
      const user = await db.auth.me();
      
      await db.entities.Assignment.create({
        company_id: user.company_id,
        course_id: selectedCourse,
        assigned_to_user_id: memberId,
        priority,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        status: 'open'
      });

      await loadData();
      setAssigningTo(null);
      setSelectedCourse("");
      setDueDate("");
      setPriority("medium");
      setNotes("");
    } catch (error) {
      console.error('Failed to assign course:', error);
      alert('Failed to assign course');
    }
  }, [selectedCourse, priority, dueDate, notes, loadData]);

  if (loading) {
    return (
      <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
        <CardContent className="p-6">
          <Skeleton className="h-32 bg-gray-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-white flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          Team Members & Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {teamMembers.map(member => {
            const memberAssignments = assignments.filter(a => a.assigned_to_user_id === member.id);
            const isAssigning = assigningTo === member.id;

            return (
              <div key={member.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{member.full_name}</h4>
                    <p className="text-sm text-gray-400">{member.job_title || 'Team Member'}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setAssigningTo(isAssigning ? null : member.id)}
                    className="bg-cyan-600 hover:bg-cyan-500"
                  >
                    {isAssigning ? 'Cancel' : 'Assign Course'}
                  </Button>
                </div>

                {/* Assignment Form */}
                {isAssigning && (
                  <div className="pt-3 border-t border-slate-700 space-y-3">
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Select a course...</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title} - {course.difficulty}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>

                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />

                    <Button
                      onClick={() => handleAssign(member.id)}
                      className="w-full bg-cyan-600 hover:bg-cyan-500"
                    >
                      Assign Course
                    </Button>
                  </div>
                )}

                {/* Current Assignments */}
                {memberAssignments.length > 0 && (
                  <div className="pt-3 border-t border-slate-700 space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Current Assignments</p>
                    {memberAssignments.map(assignment => {
                      const course = courses.find(c => c.id === assignment.course_id);
                      return (
                        <div key={assignment.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                          <div className="flex-1">
                            <p className="text-sm text-white">{course?.title || 'Unknown Course'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-xs ${
                                assignment.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                assignment.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {assignment.priority}
                              </Badge>
                              {assignment.due_date && (
                                <span className="text-xs text-gray-500">Due: {assignment.due_date}</span>
                              )}
                            </div>
                          </div>
                          <Badge className={`${
                            assignment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            assignment.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {assignment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {teamMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No team members found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}