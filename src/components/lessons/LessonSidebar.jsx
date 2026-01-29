import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, CheckCircle, Circle, Lock, Play, 
  BookOpen, Clock, ChevronRight, Sparkles
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LessonSidebar({ 
  course, 
  modules, 
  lessons, 
  currentLesson, 
  onLessonClick, 
  completedLessons,
  className 
}) {
  const sortedModules = useMemo(
    () => modules ? [...modules].sort((a, b) => a.order_index - b.order_index) : [],
    [modules]
  );

  const totalLessons = lessons?.length || 0;
  const completedCount = completedLessons?.size || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (!course) return null;

  return (
    <div className={cn("flex flex-col h-full bg-black", className)}>
      {/* Course Header */}
      <div className="p-5 border-b border-zinc-800/50">
        <Link 
          to={createPageUrl(`CourseDetail?id=${course.id}`)} 
          className="group flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Course
        </Link>
        
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-2">
              {course.title}
            </h2>
            <div className="flex items-center gap-2">
              <Progress value={progressPercent} className="h-1.5 flex-1" />
              <span className="text-xs text-zinc-500 font-medium">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {sortedModules.map((module, moduleIndex) => {
          const moduleLessons = lessons
            .filter(l => l.module_id === module.id)
            .sort((a, b) => a.order_index - b.order_index);

          const moduleCompletedCount = moduleLessons.filter(l => completedLessons.has(l.id)).length;
          const moduleProgress = moduleLessons.length > 0 
            ? Math.round((moduleCompletedCount / moduleLessons.length) * 100) 
            : 0;

          return (
            <div key={module.id} className="mb-1">
              {/* Module Header */}
              <div className="px-4 py-3 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Module {moduleIndex + 1}
                  </h3>
                  {moduleProgress === 100 && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] px-1.5 py-0">
                      Complete
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-1">{module.title}</p>
              </div>

              {/* Lessons */}
              <div className="space-y-0.5 px-2">
                {moduleLessons.map((lesson, lessonIndex) => {
                  const isCompleted = completedLessons.has(lesson.id);
                  const isCurrent = currentLesson?.id === lesson.id;
                  const lessonNumber = lessonIndex + 1;

                  return (
                    <motion.button
                      key={lesson.id}
                      onClick={() => onLessonClick(lesson)}

                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative group",
                        isCurrent
                          ? "bg-cyan-500/15 text-white"
                          : isCompleted
                          ? "text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
                          : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
                      )}
                    >
                      {/* Status Icon */}
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                        isCurrent 
                          ? "bg-cyan-500 text-white" 
                          : isCompleted 
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : isCurrent ? (
                          <Play className="w-3 h-3 ml-0.5" />
                        ) : (
                          <span className="text-[10px] font-medium">{lessonNumber}</span>
                        )}
                      </div>

                      {/* Lesson Title */}
                      <span className={cn(
                        "flex-1 text-xs line-clamp-2 transition-colors",
                        isCurrent && "font-medium"
                      )}>
                        {lesson.title}
                      </span>

                      {/* Duration */}
                      {lesson.duration_minutes && !isCurrent && (
                        <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lesson.duration_minutes}m
                        </span>
                      )}

                      {/* Active Indicator */}
                      {isCurrent && (
                        <motion.div 
                          layoutId="activeLesson"
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-l-full"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>{completedCount} of {totalLessons} complete</span>
          </div>
          {progressPercent === 100 && (
            <div className="flex items-center gap-1 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-medium">Done!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}