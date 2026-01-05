import React from "react";
import { Assignment, Department } from "@/api/entities";
import { User, Course } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Play } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AssignmentsPage() {
  const [me, setMe] = React.useState(null);
  const [assignments, setAssignments] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [tab, setTab] = React.useState("mine");

  React.useEffect(() => { load(); }, []);

  const load = async () => {
    const meData = await User.me();
    const [allAssignments, allCourses, allUsers, allDepts] = await Promise.all([
      Assignment.list(),
      Course.list(),
      User.list(),
      Department.list()
    ]);

    setMe(meData);
    const compUsers = allUsers.filter(u => !meData.company_id || u.company_id === meData.company_id);
    const compDepts = allDepts.filter(d => !meData.company_id || d.company_id === meData.company_id);
    setUsers(compUsers);
    setDepartments(compDepts);
    setCourses(allCourses);
    const compAssignments = allAssignments.filter(a => !meData.company_id || a.company_id === meData.company_id);
    setAssignments(compAssignments);
  };

  const myAssignments = assignments.filter(a => a.assigned_to_user_id === me?.id || (a.department_id && me?.department_id && a.department_id === me.department_id));

  const startCourse = (courseId) => {
    window.location.href = createPageUrl(`CourseDetail?id=${courseId}`);
  };

  // Simple manager form
  const [form, setForm] = React.useState({ course_id: "", assigned_to_user_id: "", department_id: "", priority: "medium", due_date: "" });
  const createAssignment = async () => {
    if (!form.course_id || (!form.assigned_to_user_id && !form.department_id)) return;
    await Assignment.create({
      company_id: me?.company_id || "",
      course_id: form.course_id,
      assigned_to_user_id: form.assigned_to_user_id || undefined,
      department_id: form.department_id || undefined,
      priority: form.priority,
      due_date: form.due_date
    });
    setForm({ course_id: "", assigned_to_user_id: "", department_id: "", priority: "medium", due_date: "" });
    load();
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Assignments</h1>
            <p className="text-gray-400">Courses assigned to you and your team</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* My assignments */}
          <Card className="glass-card border-0 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">My Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myAssignments.length === 0 ? (
                <div className="text-gray-400">No assignments yet.</div>
              ) : myAssignments.map(a => {
                const course = courses.find(c => c.id === a.course_id);
                return (
                  <div key={a.id} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{course?.title || "Course"}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-3">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 capitalize">{a.priority} priority</Badge>
                        {a.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {a.due_date}</span>}
                      </div>
                    </div>
                    <Button size="sm" className="emerald-gradient emerald-gradient-hover" onClick={() => startCourse(a.course_id)}>
                      <Play className="w-4 h-4 mr-1" /> Start
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Manager: create assignment */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> New Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {courses.map(c => <SelectItem key={c.id} value={c.id} className="text-white">{c.title}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="text-xs text-gray-400">Assign to a user OR a department</div>

              <Select value={form.assigned_to_user_id} onValueChange={(v) => setForm({ ...form, assigned_to_user_id: v, department_id: "" })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select user (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {users.map(u => <SelectItem key={u.id} value={u.id} className="text-white">{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v, assigned_to_user_id: "" })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {departments.map(d => <SelectItem key={d.id} value={d.id} className="text-white">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="low" className="text-white">Low</SelectItem>
                    <SelectItem value="medium" className="text-white">Medium</SelectItem>
                    <SelectItem value="high" className="text-white">High</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              </div>

              <Button className="emerald-gradient emerald-gradient-hover w-full" onClick={createAssignment}>Create Assignment</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}