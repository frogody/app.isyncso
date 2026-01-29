import React from "react";
import { ComplianceRequirement } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Department } from "@/api/entities";
import { User } from "@/api/entities";
import { Course } from "@/api/entities";
import { UserProgress } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Calendar as CalIcon, AlertTriangle } from "lucide-react";

export default function ComplianceCenter() {
  const [me, setMe] = React.useState(null);
  const [requirements, setRequirements] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [progress, setProgress] = React.useState([]);
  const [form, setForm] = React.useState({ title: "", course_id: "", department_id: "", deadline: "", is_mandatory: true });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [u, reqs, depts, crs, prog] = await Promise.all([
      User.me(),
      ComplianceRequirement.list(),
      Department.list(),
      Course.list(),
      UserProgress.list()
    ]);
    setMe(u);
    const compReqs = reqs.filter(r => !u.company_id || r.company_id === u.company_id);
    const compDepts = depts.filter(d => !u.company_id || d.company_id === u.company_id);
    setRequirements(compReqs);
    setDepartments(compDepts);
    setCourses(crs);
    setProgress(prog);
    setLoading(false);
  };

  const createRequirement = async () => {
    if (!form.title || !form.course_id || !form.deadline) return;
    const req = await ComplianceRequirement.create({
      company_id: me?.company_id || "",
      title: form.title,
      course_id: form.course_id,
      department_id: form.department_id || undefined,
      deadline: form.deadline,
      is_mandatory: form.is_mandatory
    });
    // Create assignment for dept (group) so it appears for users
    await Assignment.create({
      company_id: me?.company_id || "",
      course_id: form.course_id,
      department_id: form.department_id || undefined,
      priority: "high",
      due_date: form.deadline,
      status: "open",
      notes: `Compliance: ${form.title}`
    });
    setForm({ title: "", course_id: "", department_id: "", deadline: "", is_mandatory: true });
    load();
  };

  const requirementStatus = (req) => {
    // Determine target users
    // If department specified -> users in dept; else all company users
    const targets = progress.filter(p => {
      const courseMatch = p.course_id === req.course_id;
      return courseMatch;
    });
    // Completed counts
    const completed = targets.filter(t => t.status === "completed").length;
    const total = targets.length || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { percent, completed, total };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {Array(3).fill(0).map((_,i) => <div key={i} className="h-24 bg-gray-800/40 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Compliance Center</h1>
            <p className="text-gray-400">Create mandatory requirements and track completion</p>
          </div>
        </div>

        {/* Create requirement */}
        <Card className="glass-card border-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">New Requirement</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Title (e.g., AI Ethics 2025)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white md:col-span-2" />
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {courses.map(c => <SelectItem key={c.id} value={c.id} className="text-white">{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Department (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={null} className="text-white">All Company</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id} className="text-white">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="flex justify-end">
              <Button onClick={createRequirement} className="emerald-gradient emerald-gradient-hover">Create</Button>
            </div>
          </CardContent>
        </Card>

        {/* Requirements list */}
        <div className="grid grid-cols-1 gap-3">
          {requirements.length === 0 ? (
            <Card className="glass-card border-0 p-4"><div className="text-gray-400">No compliance requirements yet.</div></Card>
          ) : requirements.map(req => {
            const status = requirementStatus(req);
            const course = courses.find(c => c.id === req.course_id);
            const dept = departments.find(d => d.id === req.department_id);
            const overdue = req.deadline && new Date(req.deadline) < new Date();
            return (
              <Card key={req.id} className="glass-card border-0">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <div className="text-white font-semibold">{req.title}</div>
                      {dept ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400">{dept.name}</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-400">All Company</Badge>
                      )}
                    </div>
                    <div className={`text-sm ${overdue ? "text-red-300" : "text-gray-400"} flex items-center gap-2`}>
                      <CalIcon className="w-4 h-4" /> {req.deadline || "No deadline"}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">Course: {course?.title || "Unknown"}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">{status.completed}/{status.total} completed</div>
                    <div className="w-1/2">
                      <div className="h-2 bg-gray-700 rounded">
                        <div className="h-2 rounded bg-emerald-500" style={{ width: `${status.percent}%` }} />
                      </div>
                    </div>
                    <div className="text-white text-sm">{status.percent}%</div>
                  </div>
                  {overdue && (
                    <div className="text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Past due — follow up with managers
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}