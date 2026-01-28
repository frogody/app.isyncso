import React, { useState, useCallback } from "react";
import { Course, Module, Lesson } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  Target,
  CheckCircle,
  ArrowRight,
  Download,
  Loader2,
  FileText
} from "lucide-react";
import CourseForm from "@/components/forms/CourseForm";

export default function CourseGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("");

  const generateCourse = useCallback(async (formData) => {
    if (!formData?.topic?.trim()) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      setCurrentStage("Creating course structure...");
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const prompt = `Create a MICROLEARNING course with the following specifications:

Topic: ${formData.topic}
Difficulty Level: ${formData.difficulty}
Duration: ${formData.duration} hours
Target Audience: ${formData.audience}
Learning Objectives: ${formData.objectives}
Teaching Style: ${formData.style}

CRITICAL: Each lesson MUST follow MICROLESSON format (5-7 minutes each):

**LESSON STRUCTURE (MANDATORY):**

1. HOOK (30 sec)
   - Curiosity-triggering question or scenario
   - Example: "What if you could automate your most tedious task?"

2. CONCEPT (2-3 min)
   - ONE core idea only (300-400 words)
   - Simple analogies to familiar concepts
   - ONE visual element (mermaid diagram or example)

3. PRACTICE (2-3 min)
   - Interactive element (decision scenario, reflection, or 2-3 quiz questions)
   - Role-appropriate (business scenarios for non-technical)

4. SYNTHESIS (30 sec)
   - Connection to next topic
   - One actionable takeaway

CONTENT RULES:
- 400-600 words per lesson MAX
- Bite-sized, scannable format
- NO walls of text
- For non-technical audiences: Use case studies NOT code

Create:
1. Course overview
2. 4-6 modules with objectives
3. 3-4 MICROLESSONS per module (5-7 min each)

Format as complete, production-ready course.`;

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            course: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                difficulty: { type: "string" },
                category: { type: "string" },
                duration_hours: { type: "number" },
                prerequisites: { type: "array", items: { type: "string" } },
                learning_outcomes: { type: "array", items: { type: "string" } },
                instructor: { type: "string" }
              }
            },
            modules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  order_index: { type: "number" },
                  duration_hours: { type: "number" },
                  learning_objectives: { type: "array", items: { type: "string" } },
                  lessons: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string", description: "Full markdown content, 400-800 words" },
                        order_index: { type: "number" },
                        duration_minutes: { type: "number" },
                        lesson_type: { type: "string", enum: ["text", "interactive"] },
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
                  }
                }
              }
            }
          }
        }
      });

      clearInterval(progressInterval);
      setCurrentStage("Finalizing course content...");
      setGeneratedCourse(result);

      setProgress(100);
      setCurrentStage("Course generation complete!");

    } catch (error) {
      console.error("Error generating course:", error);
      alert(`Error generating course: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const saveCourse = useCallback(async (formData) => {
    if (!generatedCourse) return;

    try {
      setCurrentStage("Saving course to database...");

      const courseData = {
        ...generatedCourse.course,
        category: formData.category,
        difficulty: formData.difficulty,
        is_published: true,
        is_template: true
      };
      
      // Fallback for missing required fields
      if (!courseData.category) courseData.category = "applications";
      if (!courseData.difficulty) courseData.difficulty = "intermediate";

      // Validate enum fields
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      const validCategories = ["fundamentals", "machine_learning", "deep_learning", "nlp", "computer_vision", "ethics", "applications"];
      
      const difficulty = validDifficulties.includes(formData.difficulty?.toLowerCase()) 
        ? formData.difficulty.toLowerCase() 
        : "intermediate";
        
      const category = validCategories.includes(formData.category?.toLowerCase())
        ? formData.category.toLowerCase()
        : "applications";

      const createdCourse = await Course.create({
        ...courseData,
        difficulty,
        category,
        duration_hours: parseFloat(courseData.duration_hours) || 1,
        is_published: true,
        is_template: true
      });

      // Create modules and lessons
      if (generatedCourse.modules && Array.isArray(generatedCourse.modules)) {
        for (const moduleData of generatedCourse.modules) {
          const module = await Module.create({
            course_id: createdCourse.id,
            title: moduleData.title || "Module",
            description: moduleData.description || "",
            order_index: moduleData.order_index || 0,
            duration_hours: parseFloat(moduleData.duration_hours) || 0,
            learning_objectives: moduleData.learning_objectives || []
          });

          // Create lessons for this module
          if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
            for (const lessonData of moduleData.lessons) {
              await Lesson.create({
                module_id: module.id,
                title: lessonData.title || "Lesson",
                content: lessonData.content || "",
                order_index: lessonData.order_index || 0,
                duration_minutes: parseFloat(lessonData.duration_minutes) || 15,
                lesson_type: lessonData.quiz && lessonData.quiz.length > 0 ? "interactive" : "text",
                interactive_config: lessonData.quiz && lessonData.quiz.length > 0 ? {
                  quiz: lessonData.quiz
                } : {}
              });
            }
          }
        }
      }

      alert("Course generated and saved successfully!");
      setGeneratedCourse(null);
      setCurrentStage("");
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Error saving course. Please try again.");
    }
  }, [generatedCourse]);

  return (
    <div className="space-y-6">
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            AI Course Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CourseForm 
            onSubmit={generateCourse}
            isSubmitting={isGenerating}
          />

          {isGenerating && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                <span>{currentStage}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Course Preview */}
      {generatedCourse && (
        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Generated Course Preview
              </CardTitle>
              <Button
                onClick={() => saveCourse(generatedCourse.formData)}
                className="emerald-gradient emerald-gradient-hover"
              >
                <Download className="w-4 h-4 mr-2" />
                Save Course
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Course Overview */}
            <div className="p-6 rounded-lg bg-gray-800/30 border border-emerald-500/20">
              <h3 className="text-2xl font-bold text-white mb-2">
                {generatedCourse.course.title}
              </h3>
              <p className="text-gray-300 mb-4">{generatedCourse.course.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {generatedCourse.course.difficulty}
                </Badge>
                <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30">
                  <Clock className="w-3 h-3 mr-1" />
                  {generatedCourse.course.duration_hours}h
                </Badge>
                <Badge className="bg-emerald-600/20 text-emerald-500 border-emerald-600/30">
                  {generatedCourse.course.category || 'AI Course'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Learning Outcomes</h4>
                  <ul className="space-y-1">
                    {generatedCourse.course.learning_outcomes?.map((outcome, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <Target className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Prerequisites</h4>
                  <ul className="space-y-1">
                    {generatedCourse.course.prerequisites?.map((prereq, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modules (text/interactive lessons only) */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">Course Modules</h3>
              {generatedCourse.modules?.map((module, moduleIndex) => (
                <div key={moduleIndex} className="p-4 rounded-lg bg-gray-800/20 border border-emerald-500/30 hover-glow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-semibold text-white">
                      Module {module.order_index}: {module.title}
                    </h4>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {module.duration_hours}h
                    </Badge>
                  </div>
                  <p className="text-gray-300 mb-3">{module.description}</p>

                  <div className="space-y-2">
                    <h5 className="font-medium text-white">Lessons:</h5>
                    {module.lessons?.map((lesson, lessonIndex) => (
                      <div key={lessonIndex} className="flex justify-between items-center p-2 rounded bg-gray-800/50 border border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-gray-300">{lesson.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {lesson.lesson_type || "text"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {lesson.duration_minutes}min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}