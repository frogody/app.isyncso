import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
const { Course, Module, Lesson, UserProgress } = base44.entities;
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BookOpen } from "lucide-react";
import { useAchievement } from "../components/learn/AchievementContext";
import { useUser } from "@/components/context/UserContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// New modular components
import LessonSidebar from "@/components/lessons/LessonSidebar";
import LessonHeader from "@/components/lessons/LessonHeader";
import LessonContent from "@/components/lessons/LessonContent";
import LessonNavigation from "@/components/lessons/LessonNavigation";
import CompletionCelebration from "@/components/lessons/CompletionCelebration";

// Lazy load AI panel for performance
const AITutorPanel = lazy(() => import("@/components/lessons/AITutorPanel"));

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="flex h-screen bg-black text-white">
      <div className="hidden lg:block w-72 border-r border-zinc-800">
        <div className="p-5 space-y-4">
          <Skeleton className="h-6 w-3/4 bg-zinc-800" />
          <Skeleton className="h-2 w-full bg-zinc-800" />
          <div className="space-y-3 mt-6">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <Skeleton className="h-14 w-full bg-zinc-900" />
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-8 w-2/3 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
          <Skeleton className="h-4 w-5/6 bg-zinc-800" />
          <Skeleton className="h-64 w-full bg-zinc-800 mt-8" />
        </div>
        <Skeleton className="h-16 w-full bg-zinc-900" />
      </div>
    </div>
  );
}

// Error State
function ErrorState({ error }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700/40 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-cyan-400/60" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">Could not load lesson</h2>
        <p className="text-zinc-500 mb-6">{error}</p>
        <Link to={createPageUrl("Learn")}>
          <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium">
            Back to Courses
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function LessonViewer() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");
  const { showAchievement } = useAchievement();
  const { user: me, isLoading: userLoading } = useUser();

  // Core state
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [showChat, setShowChat] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [visionEnabled, setVisionEnabled] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  // Load course data
  const loadCourseData = useCallback(async () => {
    if (!courseId || !me) {
      if (!courseId) setError("No course ID provided.");
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setError(null);

    try {
      const courseData = await Course.get(courseId);
      if (!courseData) throw new Error("Course not found.");

      const courseModules = await Module.filter({ course_id: courseId });
      const courseModuleIds = new Set(courseModules.map(m => m.id));
      
      const allLessons = await Lesson.list();
      const courseLessons = allLessons.filter(l => courseModuleIds.has(l.module_id));

      if (courseModules.length === 0) {
        throw new Error("This course has no modules yet.");
      }
      if (courseLessons.length === 0) {
        throw new Error("This course has no lessons yet.");
      }

      setCourse(courseData);
      setModules(courseModules);
      setLessons(courseLessons);

      // Load or create progress
      const progressRecords = await UserProgress.filter({ user_id: me.id, course_id: courseId });
      let progress = progressRecords[0];

      if (!progress) {
        progress = await UserProgress.create({
          user_id: me.id,
          course_id: courseId,
          status: "in_progress",
          completion_percentage: 0,
          completed_lessons: []
        });
      }
      setUserProgress(progress);

      const completedSet = new Set(progress.completed_lessons || []);
      setCompletedLessons(completedSet);

      // Find initial lesson
      const sortedLessons = courseLessons.sort((a, b) => {
        const moduleA = courseModules.find(m => m.id === a.module_id)?.order_index || 0;
        const moduleB = courseModules.find(m => m.id === b.module_id)?.order_index || 0;
        if (moduleA !== moduleB) return moduleA - moduleB;
        return a.order_index - b.order_index;
      });

      const firstUncompleted = sortedLessons.find(l => !completedSet.has(l.id));
      setCurrentLesson(firstUncompleted || sortedLessons[sortedLessons.length - 1]);

    } catch (err) {
      console.error("Failed to load course:", err);
      setError(err.message || "An error occurred while loading the course.");
    } finally {
      setDataLoading(false);
    }
  }, [courseId, me]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Memoized sorted lessons
  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => {
      const moduleA = modules.find(m => m.id === a.module_id)?.order_index || 0;
      const moduleB = modules.find(m => m.id === b.module_id)?.order_index || 0;
      if (moduleA !== moduleB) return moduleA - moduleB;
      return a.order_index - b.order_index;
    });
  }, [lessons, modules]);

  const currentIndex = useMemo(
    () => sortedLessons.findIndex(l => l.id === currentLesson?.id),
    [sortedLessons, currentLesson]
  );

  // Navigation
  const navigateLesson = useCallback((direction) => {
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < sortedLessons.length) {
      setCurrentLesson(sortedLessons[nextIndex]);
      window.scrollTo(0, 0);
    }
  }, [currentIndex, sortedLessons]);

  // Lesson completion
  const handleLessonCompletion = async () => {
    if (!me || !userProgress || !currentLesson || completedLessons.has(currentLesson.id)) return;

    const newCompletedLessons = new Set(completedLessons);
    newCompletedLessons.add(currentLesson.id);
    setCompletedLessons(newCompletedLessons);

    const completion_percentage = Math.round((newCompletedLessons.size / lessons.length) * 100);
    const isCourseComplete = newCompletedLessons.size === lessons.length;

    try {
      await UserProgress.update(userProgress.id, {
        completed_lessons: Array.from(newCompletedLessons),
        completion_percentage,
        status: isCourseComplete ? "completed" : "in_progress",
        last_accessed: new Date().toISOString(),
      });

      let xpGained = 25;
      let currentStreak = 1;

      try {
        const gamificationResult = await base44.functions.invoke('updateGamification', {
          user_id: me.id,
          action: 'lesson_complete',
          metadata: { lesson_id: currentLesson.id, course_id: courseId }
        });

        const result = gamificationResult.data;
        if (result?.points_earned) xpGained = result.points_earned;
        if (result?.current_streak) currentStreak = result.current_streak;

        if (result?.new_badges?.length > 0) {
          result.new_badges.forEach(badge => {
            showAchievement({ 
              type: 'badge', 
              badge: {
                name: badge.badge_name,
                icon: badge.badge_icon,
                description: badge.badge_description,
                points: badge.points_awarded
              }
            });
          });
        }

        if (result?.level_up) {
          showAchievement({ 
            type: 'level_up', 
            level: { 
              new_level: result.level_up.new_level, 
              title: result.level_up.new_title 
            }
          });
        }
      } catch (gamError) {
        console.error("Failed to update gamification:", gamError);
      }

      const nextIndex = currentIndex + 1;
      const nextLesson = nextIndex < sortedLessons.length ? sortedLessons[nextIndex] : null;

      setCompletionData({
        xpGained,
        nextLesson,
        streak: currentStreak,
        currentLesson,
        userId: me.id,
        courseId
      });
      setShowCompletion(true);

    } catch (err) {
      console.error("Failed to update progress:", err);
    }
  };

  const handleNextAfterCompletion = (skipOne = false) => {
    setShowCompletion(false);
    navigateLesson(skipOne ? 2 : 1);
  };

  // Loading state
  if (userLoading || dataLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // Mobile sidebar component
  const mobileSidebar = (
    <LessonSidebar
      course={course}
      modules={modules}
      lessons={lessons}
      currentLesson={currentLesson}
      onLessonClick={setCurrentLesson}
      completedLessons={completedLessons}
    />
  );

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0 border-r border-zinc-800/60">
        <LessonSidebar
          course={course}
          modules={modules}
          lessons={lessons}
          currentLesson={currentLesson}
          onLessonClick={setCurrentLesson}
          completedLessons={completedLessons}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <LessonHeader
          course={course}
          currentLesson={currentLesson}
          showChat={showChat}
          onToggleChat={() => setShowChat(!showChat)}
          visionEnabled={visionEnabled}
          conversation={conversation}
          MobileSidebar={mobileSidebar}
        />

        {/* Lesson Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {currentLesson ? (
            <LessonContent
              key={currentLesson.id}
              lesson={currentLesson}
              onComplete={handleLessonCompletion}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <BookOpen className="w-16 h-16 text-zinc-600 mb-4" />
              <h2 className="text-xl font-bold">No lesson selected</h2>
              <p className="text-zinc-400 text-sm">Select a lesson from the sidebar to begin.</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <LessonNavigation
          currentIndex={currentIndex}
          totalLessons={sortedLessons.length}
          sortedLessons={sortedLessons}
          completedLessons={completedLessons}
          onNavigate={navigateLesson}
          onComplete={handleLessonCompletion}
          isCurrentCompleted={completedLessons.has(currentLesson?.id)}
        />
      </main>

      {/* AI Tutor Panel */}
      {currentLesson && (
        <ErrorBoundary title="AI Tutor Unavailable">
          <Suspense fallback={null}>
            <AITutorPanel
              lesson={currentLesson}
              isVisible={showChat}
              onClose={() => setShowChat(false)}
              onConversationReady={setConversation}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Completion Celebration */}
      <AnimatePresence>
        {showCompletion && completionData && (
          <CompletionCelebration
            xpGained={completionData.xpGained}
            nextLesson={completionData.nextLesson}
            streak={completionData.streak}
            currentLesson={completionData.currentLesson}
            userId={completionData.userId}
            courseId={completionData.courseId}
            onNext={handleNextAfterCompletion}
            onClose={() => setShowCompletion(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}