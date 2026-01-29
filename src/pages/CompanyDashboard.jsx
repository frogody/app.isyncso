import React from "react";
import { db } from "@/api/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { exportToCsv } from "@/components/utils/csv";
import HRImport from "@/components/company/HRImport";
import {
  Users, ClipboardList, BarChart3, Activity, Download, Building2, Shield, BookOpen, Clock, TrendingUp
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, LineChart, Line, CartesianGrid
} from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CompanyDashboard() {
  const [me, setMe] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [progress, setProgress] = React.useState([]);
  const [assignments, setAssignments] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [requirements, setRequirements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const u = await db.auth.me();
      setMe(u);

      // If no company, show empty state - never load other users' data
      if (!u.company_id) {
        setUsers([]);
        setCourses([]);
        setAssignments([]);
        setDepartments([]);
        setRequirements([]);
        setProgress([]);
        setLoading(false);
        return;
      }

      // Load company-scoped data
      const [allCourses, companyAssignments, companyDepts, companyReqs] = await Promise.all([
        db.entities.Course.list(), // Courses are shared content
        db.entities.Assignment.filter({ company_id: u.company_id }),
        db.entities.Department.filter({ company_id: u.company_id }),
        db.entities.ComplianceRequirement.filter({ company_id: u.company_id })
      ]);

      // Get company users via secure function
      let companyUsers = [];
      try {
        const usersResponse = await db.functions.invoke('getCompanyUsers', { company_id: u.company_id });
        companyUsers = usersResponse.data || [];
      } catch {
        // If function fails, only include current user
        companyUsers = [u];
      }

      // Get progress only for company users
      const userIds = companyUsers.map(cu => cu.id);
      const progressPromises = userIds.map(uid =>
        db.entities.UserProgress.filter({ user_id: uid }).catch(() => [])
      );
      const progressArrays = await Promise.all(progressPromises);
      const companyProgress = progressArrays.flat();

      setUsers(companyUsers);
      setCourses(allCourses);
      setAssignments(companyAssignments);
      setDepartments(companyDepts);
      setRequirements(companyReqs);
      setProgress(companyProgress);
    } catch (error) {
      console.error("Error loading company dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalEmployees = users.length;
  const totalLearningMinutes = progress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0);
  const totalLearningHours = Math.round(totalLearningMinutes / 60);
  const totalEnrollments = progress.length;
  const completedEnrollments = progress.filter(p => p.status === "completed").length;
  const completionRate = totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  // Dept breakdown
  const deptStats = departments.map(d => {
    const deptUsers = users.filter(u => u.department_id === d.id);
    const p = progress.filter(pr => deptUsers.some(u => u.id === pr.user_id));
    const hrs = Math.round(p.reduce((s, pr) => s + (pr.time_spent_minutes || 0), 0) / 60);
    const comp = p.filter(pr => pr.status === "completed").length;
    const enr = p.length;
    const rate = enr ? Math.round((comp / enr) * 100) : 0;
    return { id: d.id, name: d.name, people: deptUsers.length, hours: hrs, completion: rate };
  });

  // Top courses by enrollments
  const topCourses = courses.map(c => {
    const enr = progress.filter(p => p.course_id === c.id).length;
    const comp = progress.filter(p => p.course_id === c.id && p.status === "completed").length;
    return { ...c, enr, comp, rate: enr ? Math.round((comp / enr) * 100) : 0 };
  }).sort((a,b) => b.enr - a.enr).slice(0,5);

  // Engagement over last 8 weeks
  const engagement = (() => {
    const map = new Map();
    progress.forEach(p => {
      if (!p.last_accessed) return;
      const d = new Date(p.last_accessed);
      const week = `${d.getFullYear()}-W${Math.ceil(((d - new Date(d.getFullYear(),0,1)) / 86400000 + new Date(d.getFullYear(),0,1).getDay()+1)/7)}`;
      map.set(week, (map.get(week) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).slice(-8).map(([w, cnt]) => ({ week: w, events: cnt }));
  })();

  const exportUsersCsv = () => {
    exportToCsv("users.csv", users.map(u => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.company_role || "learner",
      department: departments.find(d => d.id === u.department_id)?.name || "",
      job_title: u.job_title || "",
    })));
  };

  const exportProgressCsv = () => {
    exportToCsv("progress.csv", progress.map(p => ({
      user: users.find(u => u.id === p.user_id)?.full_name || "",
      course: courses.find(c => c.id === p.course_id)?.title || "",
      status: p.status,
      completion_percentage: p.completion_percentage,
      time_spent_minutes: p.time_spent_minutes || 0,
      last_accessed: p.last_accessed || "",
    })));
  };

  const exportAssignmentsCsv = () => {
    exportToCsv("assignments.csv", assignments.map(a => ({
      course: courses.find(c => c.id === a.course_id)?.title || "",
      to_user: users.find(u => u.id === a.assigned_to_user_id)?.full_name || "",
      department: departments.find(d => d.id === a.department_id)?.name || "",
      priority: a.priority,
      due_date: a.due_date || "",
      status: a.status,
    })));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {Array(4).fill(0).map((_,i) => <div key={i} className="h-20 bg-gray-800/40 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Company Dashboard</h1>
            <p className="text-gray-400">Overview for your organization</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportUsersCsv} className="btn-outline"><Download className="w-4 h-4 mr-2" /> Users</Button>
            <Button onClick={exportProgressCsv} className="btn-outline"><Download className="w-4 h-4 mr-2" /> Progress</Button>
            <Button onClick={exportAssignmentsCsv} className="btn-outline"><Download className="w-4 h-4 mr-2" /> Assignments</Button>
          </div>
        </div>

        {/* Company Hub navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to={createPageUrl("Assignments")} className="block">
            <Button className="w-full btn-primary">Assignments</Button>
          </Link>
          <Link to={createPageUrl("SkillFrameworks")} className="block">
            <Button className="w-full btn-primary">Skills & Paths</Button>
          </Link>
          <Link to={createPageUrl("ComplianceCenter")} className="block">
            <Button className="w-full btn-primary">Compliance</Button>
          </Link>
          <Link to={createPageUrl("Leaderboard")} className="block">
            <Button className="w-full btn-primary">Leaderboard</Button>
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <div className="text-lg font-bold text-white">{totalEmployees}</div>
            </div>
            <div className="text-white font-medium text-sm">Employees</div>
            <div className="text-xs text-gray-400">Across {departments.length} departments</div>
          </Card>
          <Card className="glass-card border-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <ClipboardList className="w-5 h-5 text-emerald-400" />
              <div className="text-lg font-bold text-white">{assignments.length}</div>
            </div>
            <div className="text-white font-medium text-sm">Assignments</div>
            <div className="text-xs text-gray-400">Open training tasks</div>
          </Card>
          <Card className="glass-card border-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <div className="text-lg font-bold text-white">{totalLearningHours}h</div>
            </div>
            <div className="text-white font-medium text-sm">Learning Time</div>
            <div className="text-xs text-gray-400">All-time</div>
          </Card>
          <Card className="glass-card border-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div className="text-lg font-bold text-white">{completionRate}%</div>
            </div>
            <div className="text-white font-medium text-sm">Completion Rate</div>
            <div className="text-xs text-gray-400">{completedEnrollments} completed</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="glass-card border-0 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white font-semibold text-sm">Engagement (last 8 weeks)</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={engagement}>
                    <defs>
                      <linearGradient id="eng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/>
                    <XAxis dataKey="week" stroke="#B5C0C4"/>
                    <YAxis stroke="#B5C0C4"/>
                    <Tooltip />
                    <Area type="monotone" dataKey="events" stroke="#10b981" fill="url(#eng)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white font-semibold text-sm">Top Courses</h3>
              </div>
              <div className="space-y-2">
                {topCourses.length === 0 ? (
                  <div className="text-gray-400 text-xs">No course activity yet</div>
                ) : topCourses.map(tc => (
                  <div key={tc.id} className="p-2 rounded-lg bg-gray-800/30 border border-gray-700/40">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium text-sm line-clamp-1">{tc.title}</div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">{tc.rate}%</Badge>
                    </div>
                    <div className="text-[10px] text-gray-400">{tc.enr} enrolled • {tc.comp} completed</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Departments */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold text-sm">Departments</h3>
            </div>
            {deptStats.length === 0 ? (
              <div className="text-gray-400 text-xs">No departments yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {deptStats.map(d => (
                  <div key={d.id} className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/40">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-white font-medium text-sm">{d.name}</div>
                      <div className="text-xs text-gray-400">{d.people} ppl</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <span>{d.hours}h</span>
                      <span>•</span>
                      <span>{d.completion}% completion</span>
                    </div>
                    <Progress value={d.completion} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* HR Import */}
        <HRImport onImported={load} />
      </div>
    </div>
  );
}