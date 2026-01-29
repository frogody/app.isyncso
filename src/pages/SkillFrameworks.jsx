import React from "react";
import { Skill } from "@/api/entities";
import { Course } from "@/api/entities";
import { CourseSkill } from "@/api/entities";
import { User } from "@/api/entities";
import { UserProgress } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Plus, Save, Trash2 } from "lucide-react";

export default function SkillFrameworks() {
  const [me, setMe] = React.useState(null);
  const [skills, setSkills] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [courseSkills, setCourseSkills] = React.useState([]);
  const [progress, setProgress] = React.useState([]);
  const [newSkill, setNewSkill] = React.useState({ name: "", category: "", description: "" });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [u, s, c, cs, p] = await Promise.all([
      User.me(),
      Skill.list(),
      Course.list(),
      CourseSkill.list(),
      UserProgress.list()
    ]);
    setMe(u);
    const compSkills = s.filter(sk => !u.company_id || !sk.company_id || sk.company_id === u.company_id);
    setSkills(compSkills);
    setCourses(c);
    setCourseSkills(cs);
    setProgress(p.filter(pr => pr.user_id)); // all progress
    setLoading(false);
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) return;
    await Skill.create({
      company_id: me?.company_id || undefined,
      name: newSkill.name.trim(),
      category: newSkill.category || "",
      description: newSkill.description || ""
    });
    setNewSkill({ name: "", category: "", description: "" });
    load();
  };

  const deleteSkill = async (skill) => {
    if (!confirm(`Delete skill: ${skill.name}?`)) return;
    // Remove mappings first
    const toDelete = courseSkills.filter(cs => cs.skill_id === skill.id);
    for (const m of toDelete) await CourseSkill.delete(m.id);
    await Skill.delete(skill.id);
    load();
  };

  const toggleCourseMap = async (skillId, courseId) => {
    const existing = courseSkills.find(cs => cs.skill_id === skillId && cs.course_id === courseId);
    if (existing) {
      await CourseSkill.delete(existing.id);
    } else {
      await CourseSkill.create({ skill_id: skillId, course_id: courseId, weight: 1 });
    }
    load();
  };

  const skillProgress = (skill) => {
    const mapped = courseSkills.filter(cs => cs.skill_id === skill.id).map(cs => cs.course_id);
    if (mapped.length === 0) return 0;
    const related = progress.filter(p => mapped.includes(p.course_id));
    if (related.length === 0) return 0;
    const avg = related.reduce((s, p) => s + (p.completion_percentage || 0), 0) / related.length;
    return Math.round(avg);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {Array(3).fill(0).map((_,i) => <div key={i} className="h-24 bg-gray-800/40 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Skills & Paths</h1>
            <p className="text-gray-400">Define skills, map courses, and track progress by capability</p>
          </div>
        </div>

        {/* Create Skill */}
        <Card className="glass-card border-0">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">Create Skill</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Skill name" value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <Input placeholder="Category (e.g., AI Basics)" value={newSkill.category} onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
              <Input placeholder="Description" value={newSkill.description} onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="flex justify-end">
              <Button onClick={addSkill} className="emerald-gradient emerald-gradient-hover"><Save className="w-4 h-4 mr-2" /> Save Skill</Button>
            </div>
          </CardContent>
        </Card>

        {/* Skills grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {skills.length === 0 ? (
            <Card className="glass-card border-0 p-4">
              <div className="text-gray-400">No skills yet. Create your first skill above.</div>
            </Card>
          ) : skills.map(skill => {
            const prog = skillProgress(skill);
            return (
              <Card key={skill.id} className="glass-card border-0">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-emerald-400" />
                        <div className="text-white font-semibold">{skill.name}</div>
                        {skill.category && <Badge className="bg-emerald-500/20 text-emerald-400">{skill.category}</Badge>}
                      </div>
                      {skill.description && <div className="text-sm text-gray-400 mt-1">{skill.description}</div>}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => deleteSkill(skill)} className="border-gray-700 text-gray-300">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Skill Progress</span>
                      <span className="text-white">{prog}%</span>
                    </div>
                    <Progress value={prog} className="h-2" />
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">Map Courses</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto pr-1">
                      {courses.map(c => {
                        const checked = !!courseSkills.find(cs => cs.skill_id === skill.id && cs.course_id === c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm p-2 rounded-md bg-gray-800/30 border border-gray-700/40">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCourseMap(skill.id, c.id)}
                            />
                            <span className="text-white line-clamp-1">{c.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}