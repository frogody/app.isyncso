import React, { useEffect, useState } from "react";
import { Course, Module, Lesson } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";

export default function CourseUpgrader() {
  const [courses, setCourses] = useState([]);
  const [mods, setMods] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [working, setWorking] = useState(false);
  const [pct, setPct] = useState(0);
  const [log, setLog] = useState([]);

  useEffect(() => {
    (async () => {
      setCourses(await Course.list());
      setMods(await Module.list());
      setLessons(await Lesson.list());
    })();
  }, []);

  const needsUpgrade = (l) => {
    const tooShort = (l.content || "").split(/\s+/).length < 300;
    const hasComplexConfig = l?.interactive_config?.activities || l?.interactive_config?.workflows;
    return tooShort || hasComplexConfig;
  };

  const doUpgrade = async () => {
    const total = lessons.length || 1;
    let done = 0;
    setWorking(true);
    setLog([]);

    for (const l of lessons) {
      if (!needsUpgrade(l)) {
        done++; 
        setPct(Math.round((done / total) * 100));
        continue;
      }

      const moduleRec = mods.find(m => m.id === l.module_id);
      const courseRec = courses.find(c => c.id === moduleRec?.course_id);
      
      setLog(prev => [...prev, `Upgrading: ${courseRec?.title} / ${moduleRec?.title} / ${l.title}`]);

      const prompt = `Create a complete, high-quality lesson with the following requirements:

Context:
- Course: ${courseRec?.title}
- Module: ${moduleRec?.title}
- Lesson: ${l.title}
- Original content (if any): ${(l.content || "").slice(0, 500)}

Requirements:
1. Write 400-700 words of clear, engaging educational content in markdown format
2. Include practical examples and real-world applications
3. Break content into clear sections with headings
4. Create 3-4 multiple choice quiz questions to test understanding
5. Each quiz question needs 4 options with one correct answer

Return JSON with: title, content (markdown), duration_minutes (15-25), lesson_type ("interactive"), and quiz array.`;

      try {
        const res = await InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              duration_minutes: { type: "number" },
              lesson_type: { type: "string", enum: ["interactive", "text"] },
              quiz: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" }
                  }
                }
              }
            }
          }
        });

        await Lesson.update(l.id, {
          title: res.title || l.title,
          content: res.content || l.content,
          duration_minutes: res.duration_minutes || 20,
          lesson_type: "interactive",
          interactive_config: {
            quiz: res.quiz || []
          }
        });

        setLog(prev => [...prev, `✓ Completed: ${l.title}`]);
      } catch (err) {
        setLog(prev => [...prev, `✗ Failed: ${l.title} - ${err.message}`]);
      }

      done++;
      setPct(Math.round((done / total) * 100));
    }

    setWorking(false);
    setLog(prev => [...prev, "Upgrade complete!"]);
  };

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Course Content Upgrader
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-gray-300 mb-3">
              This will upgrade all lessons to have quality content (400-700 words) and simple quiz questions.
              Removes all complex interactive components.
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={doUpgrade} 
                disabled={working} 
                className="btn-primary"
              >
                {working ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade All Lessons
                  </>
                )}
              </Button>
              
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            </div>

            {log.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700">
                <div className="text-[10px] text-gray-400 space-y-1 max-h-64 overflow-y-auto font-mono">
                  {log.map((line, i) => (
                    <div key={i} className={line.startsWith('✓') ? 'text-emerald-400' : line.startsWith('✗') ? 'text-red-400' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}