import React from "react";
import { ComplianceRequirement } from "@/api/entities";
import { Assignment } from "@/api/entities";
import { Department } from "@/api/entities";
import { User } from "@/api/entities";
import { Course } from "@/api/entities";
import { UserProgress } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Calendar as CalIcon, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { motion } from "framer-motion";

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
          {Array(3).fill(0).map((_,i) => <div key={i} className="h-24 bg-zinc-800/40 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader icon={Shield} title="Compliance Center" subtitle="Create mandatory requirements and track completion" color="sage" />

        {/* Create requirement */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#86EFAC]" />
              <h3 className="text-white font-semibold">New Requirement</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Title (e.g., AI Ethics 2025)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-zinc-800/50 border-zinc-700 text-white md:col-span-2" />
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {courses.map(c => <SelectItem key={c.id} value={c.id} className="text-white">{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue placeholder="Department (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value={null} className="text-white">All Company</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id} className="text-white">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="bg-zinc-800/50 border-zinc-700 text-white" />
            </div>
            <div className="flex justify-end">
              <Button onClick={createRequirement} className="bg-[#86EFAC]/10 hover:bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30">Create</Button>
            </div>
          </div>
        </div>

        {/* Requirements list */}
        <div className="grid grid-cols-1 gap-3">
          {requirements.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4"><div className="text-zinc-400">No compliance requirements yet.</div></div>
          ) : requirements.map(req => {
            const status = requirementStatus(req);
            const course = courses.find(c => c.id === req.course_id);
            const dept = departments.find(d => d.id === req.department_id);
            const overdue = req.deadline && new Date(req.deadline) < new Date();
            return (
              <div key={req.id} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#86EFAC]" />
                      <div className="text-white font-semibold">{req.title}</div>
                      {dept ? (
                        <Badge className="bg-[#86EFAC]/20 text-[#86EFAC]">{dept.name}</Badge>
                      ) : (
                        <Badge className="bg-[#86EFAC]/20 text-[#86EFAC]">All Company</Badge>
                      )}
                    </div>
                    <div className={`text-sm ${overdue ? "text-red-300" : "text-zinc-400"} flex items-center gap-2`}>
                      <CalIcon className="w-4 h-4" /> {req.deadline || "No deadline"}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">Course: {course?.title || "Unknown"}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-400">{status.completed}/{status.total} completed</div>
                    <div className="w-1/2">
                      <div className="h-2 bg-zinc-700 rounded">
                        <div className="h-2 rounded bg-[#86EFAC]" style={{ width: `${status.percent}%` }} />
                      </div>
                    </div>
                    <div className="text-white text-sm">{status.percent}%</div>
                  </div>
                  {overdue && (
                    <div className="text-xs text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Past due — follow up with managers
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
