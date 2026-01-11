import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { db } from "@/api/supabaseClient";
const { Course, Module, Lesson, UserProgress } = db.entities;
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  BookOpen, Clock, BarChart3, CheckCircle, PlayCircle, ArrowLeft,
  AlertTriangle, User as UserIcon, Sparkles, Award, Target, GraduationCap,
  ChevronRight, Layers, Timer, XCircle
} from "lucide-react";
import YellowOrbitIcon from "@/components/icons/YellowOrbitIcon";
import { useUser } from "@/components/context/UserContext";
import { LearningAnalytics } from "@/components/learn/LearningAnalytics";

export default function CourseDetail() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("id");
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const [personalizeProgress, setPersonalizeProgress] = useState(0);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCourseDetails = useCallback(async () => {
    if (!courseId || !user) {
      if (!courseId) setError("No course ID provided.");
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setError(null);
    try {
      const [courseData, progressData] = await Promise.all([
        Course.get(courseId),
        UserProgress.list()
      ]);

      if (!courseData) throw new Error("Course not found.");

      const courseModules = await Module.filter({ course_id: courseId });
      const courseModuleIds = new Set(courseModules.map(m => m.id));
      
      const allLessons = await Lesson.list();
      const courseLessons = allLessons.filter(l => courseModuleIds.has(l.module_id));

      setCourse(courseData);
      setModules(courseModules);
      setLessons(courseLessons);

      const progressForCourse = progressData.find(p => p.course_id === courseId && p.user_id === user.id);
      setUserProgress(progressForCourse || null);

    } catch (err) {
      console.error("Failed to load course details:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setDataLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => {
    loadCourseDetails();
  }, [loadCourseDetails]);

  const handleStartOrContinueCourse = () => {
    navigate(createPageUrl(`LessonViewer?courseId=${course.id}`));
  };

  const handlePersonalize = async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    setIsPersonalizing(true);
    setPersonalizeProgress(0);

    try {
      const currentCredits = user.credits !== undefined ? user.credits : 1000;
      if (currentCredits < 200) {
        toast({
          title: "Insufficient Credits",
          description: `You have ${currentCredits} credits but need 200 to personalize this course.`,
          variant: "destructive"
        });
        setIsPersonalizing(false);
        return;
      }

      setPersonalizeProgress(10);

      const progressInterval = setInterval(() => {
        setPersonalizeProgress(prev => prev < 90 ? prev + 2 : prev);
      }, 2000);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        const response = await db.functions.invoke('personalizeCourse', {
          templateCourseId: course.id.toString()
        }, { signal: controller.signal });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        const result = response.data || response;

        if (result.success) {
          setPersonalizeProgress(100);
          toast({
            title: "Course Personalized!",
            description: "Your personalized course is ready. Redirecting...",
          });
          setTimeout(() => {
            navigate(createPageUrl(`CourseDetail?id=${result.course_id}`));
          }, 500);
        } else {
          throw new Error(result.error || 'Personalization failed');
        }
      } catch (fetchError) {
        clearInterval(progressInterval);
        throw fetchError;
      }

    } catch (e) {
      console.error("Personalization failed:", e);
      let errorMsg = 'Failed to personalize course';
      if (e.name === 'AbortError') {
        errorMsg = 'Course generation is taking longer than expected. Please check back in a few minutes.';
      } else if (e.response?.status === 503 || e.message?.includes('503')) {
        errorMsg = 'The AI service is experiencing high demand. Please try again in 1-2 minutes.';
      } else {
        errorMsg = `${e.message || 'Unknown error'}`;
      }
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
      setIsPersonalizing(false);
      setPersonalizeProgress(0);
    }
  };

  const loading = userLoading || dataLoading;

  // Distinct colors for each difficulty level
  const difficultyConfig = {
    beginner: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', gradient: 'from-emerald-500/60 to-emerald-600/60' },
    intermediate: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/25', gradient: 'from-amber-500/70 to-amber-600/70' },
    advanced: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', gradient: 'from-rose-500/80 to-rose-600/80' }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 bg-zinc-800 rounded-2xl" />
              <Skeleton className="h-64 bg-zinc-800 rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 bg-zinc-800 rounded-2xl" />
              <Skeleton className="h-32 bg-zinc-800 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="p-12 text-center max-w-md rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
          <AlertTriangle className="w-16 h-16 text-cyan-400/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Link to={createPageUrl("Learn")}>
            <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const config = difficultyConfig[course.difficulty] || difficultyConfig.intermediate;

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-cyan-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Back Button */}
        <Link to={createPageUrl("Learn")}>
          <Button variant="ghost" className="text-zinc-400 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>

        {/* Course Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-6 lg:p-8 relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />
            
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${config.color} border`}>
                    {course.difficulty}
                  </Badge>
                  {course.category && (
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 border">
                      {course.category.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  {course.is_template && (
                    <Badge className="bg-cyan-500/15 text-cyan-400/70 border-cyan-500/25 border">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Template
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl lg:text-4xl font-bold text-white">{course.title}</h1>
                <p className="text-lg text-zinc-400 leading-relaxed">{course.description}</p>

                <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-sm text-zinc-500 pt-2">
                  <div className="flex items-center gap-2 bg-zinc-800/40 px-3 py-1.5 rounded-lg border border-zinc-700/30">
                    <Layers className="w-4 h-4 text-cyan-400/70" />
                    <span>{modules.length} Modules</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800/40 px-3 py-1.5 rounded-lg border border-zinc-700/30">
                    <BookOpen className="w-4 h-4 text-cyan-400/70" />
                    <span>{lessons.length} Lessons</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800/40 px-3 py-1.5 rounded-lg border border-zinc-700/30">
                    <Timer className="w-4 h-4 text-cyan-400/70" />
                    <span>{course.duration_hours} Hours</span>
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="w-full lg:w-80 space-y-4">
                {course.is_template ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handlePersonalize}
                      disabled={isPersonalizing}
                      className={`w-full h-14 font-semibold text-base transition-all ${
                        isPersonalizing 
                          ? "bg-zinc-800/60 border border-cyan-500/30 text-cyan-400/80" 
                          : "bg-cyan-600/80 hover:bg-cyan-600 text-white"
                      }`}
                    >
                      {isPersonalizing ? (
                        <div className="flex items-center gap-3">
                          <YellowOrbitIcon className="w-5 h-5" />
                          <span>Generating... {personalizeProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          <span>Personalize (200 Credits)</span>
                        </div>
                      )}
                    </Button>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Tailor this course content specifically to your industry and role for a more relevant learning experience.
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleStartOrContinueCourse}
                    className="w-full h-14 bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold text-base"
                  >
                    <PlayCircle className="w-6 h-6 mr-2" />
                    {userProgress?.status === 'in_progress' ? 'Continue Course' : 'Start Course'}
                  </Button>
                )}

                {userProgress && (
                  <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/40 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Your Progress</span>
                      <span className="text-cyan-400/80 font-semibold">{userProgress.completion_percentage}%</span>
                    </div>
                    <Progress value={userProgress.completion_percentage} className="h-2 bg-zinc-800" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Learning Analytics */}
        {!course.is_template && userProgress && (
          <LearningAnalytics courseId={course.id} userId={user?.id} />
        )}

        {/* Course Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* What you'll learn */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-5">
                  <Award className="w-5 h-5 text-cyan-400/70" />
                  What you'll learn
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.learning_outcomes?.map((outcome, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                    >
                      <CheckCircle className="w-5 h-5 text-cyan-400/70 mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-400 text-sm">{outcome}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Course Curriculum */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-5">
                  <BookOpen className="w-5 h-5 text-cyan-400/70" />
                  Course Curriculum
                </h3>
                <div className="space-y-4">
                  {modules.sort((a,b) => a.order_index - b.order_index).map((module, idx) => {
                    const moduleLessons = lessons.filter(l => l.module_id === module.id).sort((a,b) => a.order_index - b.order_index);
                    
                    return (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + idx * 0.05 }}
                        className="rounded-xl bg-zinc-800/30 border border-zinc-700/30 overflow-hidden"
                      >
                        <div className="flex items-center gap-3 p-4 bg-zinc-800/40">
                          <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-400/80 font-bold">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{module.title}</h4>
                            <p className="text-xs text-zinc-500">{moduleLessons.length} lessons</p>
                          </div>
                        </div>
                        
                        <div className="p-3 space-y-1">
                          {moduleLessons.map((lesson, lessonIdx) => (
                            <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/40 transition-colors">
                              <div className="flex items-center gap-3">
                                <ChevronRight className="w-4 h-4 text-cyan-400/40" />
                                <span className="text-zinc-400 text-sm">{lesson.title}</span>
                              </div>
                              <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-1 rounded">
                                {lesson.duration_minutes} min
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructor */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <UserIcon className="w-5 h-5 text-cyan-400/70" />
                  Instructor
                </h3>
                <div className="flex items-center gap-4">
                  {course.instructor_image ? (
                    <img
                      src={course.instructor_image}
                      alt={course.instructor || "Instructor"}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-zinc-700/50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border-2 border-zinc-700/50">
                      <GraduationCap className="w-8 h-8 text-cyan-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{course.instructor || "AI Learning Engine"}</p>
                    <p className="text-sm text-zinc-500">{course.instructor_title || "Expert in AI Applications"}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Prerequisites */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-cyan-400/70" />
                  Prerequisites
                </h3>
                <ul className="space-y-2">
                  {course.prerequisites?.length > 0 ? course.prerequisites.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-zinc-400 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 mt-2 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  )) : (
                    <li className="flex items-start gap-2 text-zinc-400 text-sm">
                      <CheckCircle className="w-4 h-4 text-cyan-400/70 mt-0.5 flex-shrink-0" />
                      <span>No specific prerequisites required.</span>
                    </li>
                  )}
                </ul>
              </div>
            </motion.div>

            {/* Course Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-cyan-400/70" />
                  Course Details
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Difficulty', value: course.difficulty, icon: Target },
                    { label: 'Duration', value: `${course.duration_hours} hours`, icon: Clock },
                    { label: 'Modules', value: modules.length, icon: Layers },
                    { label: 'Lessons', value: lessons.length, icon: BookOpen },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-zinc-300 font-medium capitalize">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Login Required Dialog */}
      <ConfirmationDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        title="Login Required"
        description="Please log in to personalize this course and save your progress."
        confirmLabel="Go to Login"
        cancelLabel="Cancel"
        onConfirm={() => navigate(createPageUrl("Login"))}
      />

      {/* Error Dialog */}
      <ConfirmationDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title="Personalization Failed"
        description={errorMessage}
        confirmLabel="Try Again"
        cancelLabel="Close"
        onConfirm={() => {
          setShowErrorDialog(false);
          handlePersonalize();
        }}
        variant="destructive"
      />
    </div>
  );
}