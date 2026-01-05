import React, { useState, useEffect } from "react";
import { Course, Module, Lesson } from "@/api/entities";
import { InvokeGemini } from "@/components/integrations/GeminiAPI";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Video, 
  CheckCircle, 
  Clock,
  Loader2,
  FileText,
  Sparkles
} from "lucide-react";

export default function VideoManager() {
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("");

  useEffect(() => {
    loadCoursesData();
  }, []);

  const loadCoursesData = async () => {
    try {
      const [coursesData, modulesData, lessonsData] = await Promise.all([
        Course.list(),
        Module.list(),
        Lesson.list()
      ]);
      
      setCourses(coursesData);
      setModules(modulesData);
      setLessons(lessonsData);
    } catch (error) {
      console.error("Error loading courses data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseLessonsWithoutVideos = (courseId) => {
    const courseModules = modules.filter(m => m.course_id === courseId);
    let lessonsWithoutVideos = [];
    
    courseModules.forEach(module => {
      const moduleLessons = lessons.filter(l => l.module_id === module.id);
      const lessonsNeedingVideos = moduleLessons.filter(l => 
        l.lesson_type !== 'video' && !l.video_script
      );
      
      lessonsNeedingVideos.forEach(lesson => {
        lessonsWithoutVideos.push({
          ...lesson,
          module_title: module.title,
          module_id: module.id
        });
      });
    });
    
    return lessonsWithoutVideos;
  };

  const generateVideosForCourse = async (course) => {
    const lessonsNeedingVideos = getCourseLessonsWithoutVideos(course.id);
    
    if (lessonsNeedingVideos.length === 0) {
      alert("All lessons in this course already have videos!");
      return;
    }

    setGeneratingVideos(true);
    setProgress(0);
    setCurrentStage(`Generating videos for ${lessonsNeedingVideos.length} lessons...`);

    try {
      for (let i = 0; i < lessonsNeedingVideos.length; i++) {
        const lesson = lessonsNeedingVideos[i];
        setCurrentStage(`Creating video script for: ${lesson.title}`);
        
        try {
          // Generate video script for the lesson
          const videoPrompt = `Create a NotebookLM-style podcast script for this lesson:

Course: ${course.title}
Module: ${lesson.module_title}
Lesson: ${lesson.title}
Duration: ${lesson.duration_minutes || 10} minutes
Audience: ${course.difficulty} level

Lesson Content: ${lesson.content}

Create an engaging conversation between two AI hosts (Alex and Sam) discussing this topic. Make it educational, conversational, and include practical examples that relate to the course material.`;

          const videoScript = await InvokeGemini({
            prompt: videoPrompt,
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                duration_estimate: { type: "string" },
                script_segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      timestamp: { type: "string" },
                      speaker: { type: "string" },
                      content: { type: "string" },
                      visual_cues: { type: "string" },
                      tone_notes: { type: "string" }
                    }
                  }
                },
                summary: { type: "string" },
                key_learning_points: { type: "array", items: { type: "string" } }
              }
            }
          });

          // Update the lesson with video script
          const updatedContent = `${lesson.content}\n\n## Video Script\n\n${JSON.stringify(videoScript, null, 2)}`;
          
          await Lesson.update(lesson.id, {
            ...lesson,
            content: updatedContent,
            lesson_type: "video",
            video_script: videoScript
          });

          setProgress(((i + 1) / lessonsNeedingVideos.length) * 100);
          
        } catch (error) {
          console.error(`Error generating video for lesson ${lesson.title}:`, error);
        }
      }

      setCurrentStage("Video generation complete!");
      await loadCoursesData(); // Reload data to reflect changes
      
    } catch (error) {
      console.error("Error generating videos:", error);
      alert("Error generating videos. Please try again.");
    } finally {
      setGeneratingVideos(false);
      setTimeout(() => {
        setCurrentStage("");
        setProgress(0);
      }, 2000);
    }
  };

  const generateVideosForAllCourses = async () => {
    setGeneratingVideos(true);
    setProgress(0);
    
    let totalLessonsToProcess = 0;
    let processedLessons = 0;
    
    // Count total lessons that need videos
    courses.forEach(course => {
      totalLessonsToProcess += getCourseLessonsWithoutVideos(course.id).length;
    });
    
    if (totalLessonsToProcess === 0) {
      alert("All courses already have videos for all lessons!");
      setGeneratingVideos(false);
      return;
    }

    setCurrentStage(`Processing ${totalLessonsToProcess} lessons across all courses...`);

    try {
      for (const course of courses) {
        const lessonsNeedingVideos = getCourseLessonsWithoutVideos(course.id);
        
        for (const lesson of lessonsNeedingVideos) {
          setCurrentStage(`[${course.title}] Creating video: ${lesson.title}`);
          
          try {
            const videoPrompt = `Create a NotebookLM-style podcast script for this lesson:

Course: ${course.title}
Module: ${lesson.module_title}
Lesson: ${lesson.title}
Duration: ${lesson.duration_minutes || 10} minutes
Audience: ${course.difficulty} level

Lesson Content: ${lesson.content}

Create an engaging conversation between two AI hosts (Alex and Sam) discussing this topic.`;

            const videoScript = await InvokeGemini({
              prompt: videoPrompt,
              response_json_schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  duration_estimate: { type: "string" },
                  script_segments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        timestamp: { type: "string" },
                        speaker: { type: "string" },
                        content: { type: "string" },
                        visual_cues: { type: "string" },
                        tone_notes: { type: "string" }
                      }
                    }
                  },
                  summary: { type: "string" },
                  key_learning_points: { type: "array", items: { type: "string" } }
                }
              }
            });

            const updatedContent = `${lesson.content}\n\n## Video Script\n\n${JSON.stringify(videoScript, null, 2)}`;
            
            await Lesson.update(lesson.id, {
              ...lesson,
              content: updatedContent,
              lesson_type: "video",
              video_script: videoScript
            });

            processedLessons++;
            setProgress((processedLessons / totalLessonsToProcess) * 100);
            
          } catch (error) {
            console.error(`Error generating video for lesson ${lesson.title}:`, error);
            processedLessons++; // Still count as processed to maintain progress
            setProgress((processedLessons / totalLessonsToProcess) * 100);
          }
        }
      }

      setCurrentStage("All video generation complete!");
      await loadCoursesData();
      
    } catch (error) {
      console.error("Error in bulk video generation:", error);
      alert("Error generating videos. Please try again.");
    } finally {
      setGeneratingVideos(false);
      setTimeout(() => {
        setCurrentStage("");
        setProgress(0);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="glass-card border-0 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Bulk Actions */}
      <Card className="glass-card border-0">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-400" />
              Course Video Manager
            </CardTitle>
            <Button
              onClick={generateVideosForAllCourses}
              disabled={generatingVideos}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {generatingVideos ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Videos for All Courses
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        {generatingVideos && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{currentStage}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Course List with Video Status */}
      <div className="grid gap-6">
        {courses.map(course => {
          const lessonsWithoutVideos = getCourseLessonsWithoutVideos(course.id);
          const courseModules = modules.filter(m => m.course_id === course.id);
          const totalLessons = courseModules.reduce((sum, module) => {
            return sum + lessons.filter(l => l.module_id === module.id).length;
          }, 0);
          const lessonsWithVideos = totalLessons - lessonsWithoutVideos.length;
          const videoProgress = totalLessons > 0 ? (lessonsWithVideos / totalLessons) * 100 : 0;

          return (
            <Card key={course.id} className="glass-card border-0">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                    <p className="text-gray-400 mb-3">{course.description}</p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <Badge className="bg-blue-500/20 text-blue-400">
                        {course.difficulty}
                      </Badge>
                      <Badge className="bg-green-500/20 text-green-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {course.duration_hours}h
                      </Badge>
                      <Badge className={
                        videoProgress === 100 
                          ? "bg-green-500/20 text-green-400" 
                          : videoProgress > 0 
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }>
                        <Video className="w-3 h-3 mr-1" />
                        {lessonsWithVideos}/{totalLessons} Videos
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Video Coverage</span>
                        <span className="text-white">{Math.round(videoProgress)}%</span>
                      </div>
                      <Progress value={videoProgress} className="h-2 bg-gray-700" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {lessonsWithoutVideos.length > 0 ? (
                      <Button
                        onClick={() => generateVideosForCourse(course)}
                        disabled={generatingVideos}
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Generate {lessonsWithoutVideos.length} Videos
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        All Videos Complete
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              {lessonsWithoutVideos.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">
                      Lessons needing videos:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {lessonsWithoutVideos.map(lesson => (
                        <div key={lesson.id} className="flex items-center gap-2 p-2 rounded bg-gray-800/50">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-300 truncate">
                            {lesson.module_title}: {lesson.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}