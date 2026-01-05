import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Play, BookOpen, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CourseCard = ({ course, progress, viewMode = "grid", index = 0 }) => {
  const navigate = useNavigate();

  if (!course) return null;

  // Distinct colors for each difficulty level
  const difficultyConfig = {
    beginner: {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      gradient: 'from-emerald-500 to-emerald-600'
    },
    intermediate: {
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      gradient: 'from-amber-500 to-amber-600'
    },
    advanced: {
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      gradient: 'from-rose-500 to-rose-600'
    }
  };

  const config = difficultyConfig[course.difficulty] || difficultyConfig.intermediate;

  const handleCourseAction = () => {
    if (progress?.status === 'in_progress') {
      navigate(createPageUrl(`LessonViewer?courseId=${course.id}`));
    } else {
      navigate(createPageUrl(`CourseDetail?id=${course.id}`));
    }
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="group"
      >
        <div className="relative bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 hover:border-cyan-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5 p-5">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-cyan-500/40 to-cyan-400/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center flex-shrink-0 border border-cyan-500/20">
              <BookOpen className="w-7 h-7 text-cyan-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                    {course.title}
                  </h3>
                  <p className="text-sm text-zinc-400 line-clamp-1 mt-1">{course.description}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Badge className={`${config.color} border`}>
                    {course.difficulty}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {course.duration_hours || 1}h
                  </span>
                  {course.category && (
                    <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 border text-xs">
                      {course.category.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {progress && (
                    <div className="flex items-center gap-2">
                      <Progress value={progress.completion_percentage} className="w-24 h-2 bg-zinc-800" />
                      <span className="text-xs text-cyan-400 font-medium">{progress.completion_percentage}%</span>
                    </div>
                  )}
                  <Button 
                    onClick={handleCourseAction}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
                  >
                    {progress?.status === 'completed' ? 'Review' : 
                     progress?.status === 'in_progress' ? 'Continue' : 'Start'}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group h-full"
    >
      <div className="relative h-full bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 hover:border-cyan-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/5 overflow-hidden flex flex-col">
        {/* Top gradient bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient} opacity-60`} />

        <div className="p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/20">
              <BookOpen className="w-6 h-6 text-cyan-400" />
            </div>
            <Badge className={`${config.color} border`}>
              {course.difficulty || 'intermediate'}
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">
              {course.title}
            </h3>
            <p className="text-sm text-zinc-400 line-clamp-2 mb-4">{course.description}</p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {course.duration_hours || 1}h
            </span>
            {course.category && (
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 border text-xs">
                {course.category.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>

          {/* Progress */}
          {progress && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-zinc-500">Progress</span>
                <span className="text-cyan-400 font-medium">{progress.completion_percentage}%</span>
              </div>
              <Progress value={progress.completion_percentage} className="h-1.5 bg-zinc-800" />
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={handleCourseAction}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
          >
            <Play className="w-4 h-4 mr-2" />
            {progress?.status === 'completed' ? 'Review Course' : 
             progress?.status === 'in_progress' ? 'Continue Learning' : 'Start Course'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CourseCard;