import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { useTheme } from "@/contexts/GlobalThemeContext";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Search, BookOpen, Clock, BarChart3, Filter, ChevronRight,
  CheckCircle, PlayCircle, Lock, ArrowRight, GraduationCap,
  Layers, Target, Loader2, X, ListOrdered, Route
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const { LearningPath, LearningPathStep, Course, UserProgress } = db.entities;

const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", color: "text-teal-400", bg: "bg-teal-500/15", border: "border-teal-500/30" },
  intermediate: { label: "Intermediate", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  advanced: { label: "Advanced", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
};

function getDifficultyConfig(difficulty) {
  return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.beginner;
}

function getCourseStatus(courseId, progressMap) {
  const p = progressMap[courseId];
  if (!p) return "not_started";
  if (p.status === "completed" || p.completion_percentage >= 100) return "completed";
  if (p.status === "in_progress" || p.completion_percentage > 0) return "in_progress";
  return "not_started";
}

function getPathProgress(steps, progressMap) {
  if (!steps || steps.length === 0) return { completed: 0, inProgress: 0, total: 0, percentage: 0 };
  const total = steps.length;
  let completed = 0;
  let inProgress = 0;
  for (const step of steps) {
    const status = getCourseStatus(step.course_id, progressMap);
    if (status === "completed") completed++;
    else if (status === "in_progress") inProgress++;
  }
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, inProgress, total, percentage };
}

// --- Skeleton Loading ---
function PathGridSkeleton({ lt }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`${lt("bg-white border border-slate-200", "bg-zinc-900/50 border border-zinc-800/60")} rounded-xl p-4 space-y-3`}
        >
          <Skeleton className={`h-5 w-3/4 ${lt("bg-slate-200", "bg-zinc-800")} rounded`} />
          <Skeleton className={`h-3 w-full ${lt("bg-slate-200", "bg-zinc-800")} rounded`} />
          <Skeleton className={`h-3 w-2/3 ${lt("bg-slate-200", "bg-zinc-800")} rounded`} />
          <div className="flex gap-2 pt-2">
            <Skeleton className={`h-5 w-16 ${lt("bg-slate-200", "bg-zinc-800")} rounded-full`} />
            <Skeleton className={`h-5 w-20 ${lt("bg-slate-200", "bg-zinc-800")} rounded-full`} />
          </div>
          <Skeleton className={`h-2 w-full ${lt("bg-slate-200", "bg-zinc-800")} rounded-full mt-2`} />
        </div>
      ))}
    </div>
  );
}

// --- Path Card ---
function PathCard({ path, stepsForPath, progressMap, onOpenDetail, index, lt }) {
  const steps = stepsForPath || [];
  const { completed, total, percentage } = getPathProgress(steps, progressMap);
  const diffConf = getDifficultyConfig(path.difficulty);
  const isEnrolled = steps.some((s) => progressMap[s.course_id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <div
        onClick={() => onOpenDetail(path)}
        className={`group relative cursor-pointer ${lt(
          "bg-white border border-slate-200 shadow-sm hover:border-teal-400/40 hover:shadow-md",
          "bg-zinc-900/50 border border-zinc-800/60 hover:border-teal-700/50 hover:bg-zinc-900/70"
        )} backdrop-blur-sm rounded-xl p-4 transition-all duration-200`}
      >
        {/* Top accent bar for enrolled paths */}
        {isEnrolled && (
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-teal-500 to-teal-400" />
        )}

        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-sm ${lt("text-slate-900", "text-zinc-100")} truncate group-hover:text-teal-400 transition-colors`}>
                {path.title}
              </h3>
              {path.category && (
                <Badge className={`mt-1 text-[9px] px-1.5 py-0 ${lt(
                  "bg-slate-100 text-slate-500 border-slate-200",
                  "bg-zinc-800/80 text-zinc-400 border-zinc-700/50"
                )}`}>
                  {path.category}
                </Badge>
              )}
            </div>
            <div className={`w-8 h-8 rounded-lg ${lt("bg-slate-100 border-slate-200", "bg-zinc-800/80 border-zinc-700/50")} border flex items-center justify-center flex-shrink-0`}>
              <Route className="w-4 h-4 text-teal-400/70" />
            </div>
          </div>

          {/* Description */}
          <p className={`text-xs ${lt("text-slate-500", "text-zinc-500")} line-clamp-2 leading-relaxed`}>
            {path.description || "No description available."}
          </p>

          {/* Meta */}
          <div className={`flex items-center gap-3 text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {total} course{total !== 1 ? "s" : ""}
            </span>
            {path.estimated_hours > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {path.estimated_hours}h
              </span>
            )}
            <Badge className={`${diffConf.bg} ${diffConf.color} ${diffConf.border} text-[9px] px-1.5 py-0`}>
              {diffConf.label}
            </Badge>
          </div>

          {/* Progress (if enrolled) */}
          {isEnrolled && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>
                  {completed}/{total} completed
                </span>
                <span className="text-[10px] font-medium text-teal-400">{percentage}%</span>
              </div>
              <Progress value={percentage} className={`h-1.5 ${lt("bg-slate-100", "bg-zinc-800")}`} />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {isEnrolled ? (
              <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-[10px]">
                <PlayCircle className="w-3 h-3 mr-1" /> Enrolled
              </Badge>
            ) : (
              <span className={`text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>Not started</span>
            )}
            <ChevronRight className={`w-4 h-4 ${lt("text-slate-300", "text-zinc-600")} group-hover:text-teal-400 transition-colors`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Path Detail Modal ---
function PathDetailDialog({ path, steps, courses, progressMap, open, onClose, onEnroll, enrolling, lt }) {
  if (!path) return null;

  const sortedSteps = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));
  const courseLookup = useMemo(() => {
    const map = {};
    courses.forEach((c) => { map[c.id] = c; });
    return map;
  }, [courses]);

  const { completed, total, percentage } = getPathProgress(sortedSteps, progressMap);
  const diffConf = getDifficultyConfig(path.difficulty);
  const isEnrolled = sortedSteps.some((s) => progressMap[s.course_id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${lt(
        "bg-white border-slate-200",
        "bg-zinc-950 border-zinc-800"
      )} max-h-[85vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-bold ${lt("text-slate-900", "text-white")} flex items-center gap-2`}>
            <Route className="w-5 h-5 text-teal-400" />
            {path.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Description */}
          <p className={`text-xs ${lt("text-slate-500", "text-zinc-400")} leading-relaxed`}>
            {path.description || "No description provided."}
          </p>

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${diffConf.bg} ${diffConf.color} ${diffConf.border} text-[10px]`}>
              {diffConf.label}
            </Badge>
            {path.category && (
              <Badge className={`${lt("bg-slate-100 text-slate-600 border-slate-200", "bg-zinc-800 text-zinc-400 border-zinc-700")} text-[10px]`}>
                {path.category}
              </Badge>
            )}
            <Badge className={`${lt("bg-slate-100 text-slate-600 border-slate-200", "bg-zinc-800 text-zinc-400 border-zinc-700")} text-[10px]`}>
              <Layers className="w-3 h-3 mr-1" />
              {total} course{total !== 1 ? "s" : ""}
            </Badge>
            {path.estimated_hours > 0 && (
              <Badge className={`${lt("bg-slate-100 text-slate-600 border-slate-200", "bg-zinc-800 text-zinc-400 border-zinc-700")} text-[10px]`}>
                <Clock className="w-3 h-3 mr-1" />
                {path.estimated_hours}h estimated
              </Badge>
            )}
          </div>

          {/* Overall progress */}
          {isEnrolled && (
            <div className={`${lt("bg-slate-50 border-slate-200", "bg-zinc-900/60 border-zinc-800/60")} border rounded-lg p-3 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${lt("text-slate-700", "text-zinc-300")}`}>Overall Progress</span>
                <span className="text-xs font-bold text-teal-400">{percentage}%</span>
              </div>
              <Progress value={percentage} className={`h-2 ${lt("bg-slate-200", "bg-zinc-800")}`} />
              <div className={`flex items-center gap-4 text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-teal-400" /> {completed} done</span>
                <span className="flex items-center gap-1"><PlayCircle className="w-3 h-3 text-blue-400" /> {total - completed} remaining</span>
              </div>
            </div>
          )}

          {/* Course List */}
          <div className="space-y-2">
            <h4 className={`text-xs font-semibold ${lt("text-slate-700", "text-zinc-300")} flex items-center gap-1.5`}>
              <ListOrdered className="w-3.5 h-3.5 text-teal-400" />
              Course Sequence
            </h4>

            <div className="space-y-1.5">
              {sortedSteps.map((step, idx) => {
                const course = courseLookup[step.course_id];
                const status = getCourseStatus(step.course_id, progressMap);
                const prog = progressMap[step.course_id];

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${lt(
                      status === "completed"
                        ? "bg-teal-50 border border-teal-200/60"
                        : status === "in_progress"
                        ? "bg-blue-50 border border-blue-200/60"
                        : "bg-slate-50 border border-slate-200",
                      status === "completed"
                        ? "bg-teal-500/10 border border-teal-500/20"
                        : status === "in_progress"
                        ? "bg-blue-500/10 border border-blue-500/20"
                        : "bg-zinc-800/40 border border-zinc-700/40"
                    )}`}>
                      {/* Step number / status icon */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        status === "completed"
                          ? "bg-teal-500 text-white"
                          : status === "in_progress"
                          ? "bg-blue-500 text-white"
                          : lt("bg-slate-200 text-slate-500", "bg-zinc-700 text-zinc-400")
                      }`}>
                        {status === "completed" ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : status === "in_progress" ? (
                          <PlayCircle className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      {/* Course info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium truncate ${lt("text-slate-800", "text-zinc-200")}`}>
                            {course?.title || "Unknown Course"}
                          </span>
                          {step.is_required && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[8px] px-1 py-0">
                              Required
                            </Badge>
                          )}
                        </div>
                        {course && (
                          <div className={`flex items-center gap-2 mt-0.5 text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>
                            {course.duration_hours > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> {course.duration_hours}h
                              </span>
                            )}
                            {course.difficulty && (
                              <span>{getDifficultyConfig(course.difficulty).label}</span>
                            )}
                          </div>
                        )}
                        {status === "in_progress" && prog && (
                          <div className="mt-1">
                            <Progress value={prog.completion_percentage || 0} className={`h-1 ${lt("bg-slate-200", "bg-zinc-700")}`} />
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      {status === "completed" ? (
                        <span className="text-[10px] text-teal-400 font-medium flex-shrink-0">Done</span>
                      ) : status === "in_progress" ? (
                        <Link to={createPageUrl(`LessonViewer?courseId=${step.course_id}`)}>
                          <Button size="sm" className={`h-7 text-[10px] px-2 ${lt(
                            "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200",
                            "bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/30"
                          )} border`}>
                            Continue <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      ) : isEnrolled && course ? (
                        <Link to={createPageUrl(`LessonViewer?courseId=${step.course_id}`)}>
                          <Button size="sm" variant="ghost" className={`h-7 text-[10px] px-2 ${lt("text-slate-500", "text-zinc-500")}`}>
                            Start
                          </Button>
                        </Link>
                      ) : (
                        <Lock className={`w-3.5 h-3.5 ${lt("text-slate-300", "text-zinc-600")} flex-shrink-0`} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className={`pt-3 border-t ${lt("border-slate-200", "border-zinc-800")} flex items-center justify-between`}>
          {isEnrolled ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-[10px]">
                <CheckCircle className="w-3 h-3 mr-1" /> Enrolled
              </Badge>
              <span className={`text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>
                {completed}/{total} completed
              </span>
            </div>
          ) : (
            <span className={`text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>
              {total} course{total !== 1 ? "s" : ""} in this path
            </span>
          )}
          {!isEnrolled && (
            <Button
              onClick={() => onEnroll(path, sortedSteps)}
              disabled={enrolling || sortedSteps.length === 0}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs h-8 px-4"
            >
              {enrolling ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Enrolling...</>
              ) : (
                <><GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Start Path</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function LearningPaths() {
  const { user, isLoading: userLoading } = useUser();
  const { lt } = useTheme();

  const [paths, setPaths] = useState([]);
  const [steps, setSteps] = useState([]);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const [selectedPath, setSelectedPath] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // --- Data loading ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pathsData, stepsData, coursesData, progressData] = await Promise.all([
        LearningPath.filter({ is_published: true }),
        LearningPathStep.list(),
        Course.list(),
        UserProgress.list(),
      ]);
      setPaths(pathsData);
      setSteps(stepsData);
      setCourses(coursesData);
      setProgress(progressData);
    } catch (err) {
      console.error("Failed to load learning paths:", err);
      toast.error("Failed to load learning paths. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Derived data ---
  const progressMap = useMemo(() => {
    const map = {};
    progress.forEach((p) => {
      if (p.user_id === user?.id) {
        map[p.course_id] = p;
      }
    });
    return map;
  }, [progress, user?.id]);

  const stepsMap = useMemo(() => {
    const map = {};
    steps.forEach((s) => {
      if (!map[s.learning_path_id]) map[s.learning_path_id] = [];
      map[s.learning_path_id].push(s);
    });
    return map;
  }, [steps]);

  const categories = useMemo(() => {
    const cats = new Set();
    paths.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [paths]);

  const filteredPaths = useMemo(() => {
    let result = [...paths];

    // Tab filter
    if (activeTab === "my") {
      result = result.filter((p) => {
        const pathSteps = stepsMap[p.id] || [];
        return pathSteps.some((s) => progressMap[s.course_id]);
      });
    }

    // Search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search) ||
          p.category?.toLowerCase().includes(search)
      );
    }

    // Category
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Difficulty
    if (difficultyFilter !== "all") {
      result = result.filter((p) => p.difficulty === difficultyFilter);
    }

    return result;
  }, [paths, activeTab, searchTerm, categoryFilter, difficultyFilter, stepsMap, progressMap]);

  // --- Stats ---
  const stats = useMemo(() => {
    let enrolledCount = 0;
    let completedCount = 0;
    let totalCoursesDone = 0;

    paths.forEach((p) => {
      const pathSteps = stepsMap[p.id] || [];
      const isEnrolled = pathSteps.some((s) => progressMap[s.course_id]);
      if (isEnrolled) {
        enrolledCount++;
        const { completed, total, percentage } = getPathProgress(pathSteps, progressMap);
        totalCoursesDone += completed;
        if (percentage >= 100) completedCount++;
      }
    });

    return { enrolledCount, completedCount, totalCoursesDone };
  }, [paths, stepsMap, progressMap]);

  // --- Actions ---
  const handleOpenDetail = useCallback((path) => {
    setSelectedPath(path);
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setSelectedPath(null), 200);
  }, []);

  const handleEnroll = useCallback(async (path, pathSteps) => {
    if (!user?.id || !pathSteps.length) return;
    setEnrolling(true);
    try {
      const sorted = [...pathSteps].sort((a, b) => (a.order || 0) - (b.order || 0));
      const firstStep = sorted[0];

      // Check if progress already exists for the first course
      const existing = progress.find(
        (p) => p.user_id === user.id && p.course_id === firstStep.course_id
      );

      if (!existing) {
        await UserProgress.create({
          user_id: user.id,
          course_id: firstStep.course_id,
          status: "not_started",
          completion_percentage: 0,
          time_spent_minutes: 0,
        });
      }

      toast.success(`Enrolled in "${path.title}". Start your first course!`);
      await loadData();
      handleCloseDetail();
    } catch (err) {
      console.error("Enrollment error:", err);
      toast.error("Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }, [user?.id, progress, loadData, handleCloseDetail]);

  // --- Render ---
  if (loading || userLoading) {
    return (
      <div className={`min-h-screen ${lt("bg-slate-50", "bg-black")} px-4 lg:px-6 py-4`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className={`h-16 w-full ${lt("bg-slate-200", "bg-zinc-800")} rounded-xl`} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={`h-20 ${lt("bg-slate-200", "bg-zinc-800")} rounded-xl`} />
            ))}
          </div>
          <Skeleton className={`h-10 w-full ${lt("bg-slate-200", "bg-zinc-800")} rounded-lg`} />
          <PathGridSkeleton lt={lt} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${lt("bg-slate-50", "bg-black")} relative`}>
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <PageHeader
          icon={Route}
          title="Learning Paths"
          subtitle="Structured course sequences to guide your learning journey"
          color="teal"
          actions={
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`${lt("bg-slate-100 border-slate-200", "bg-zinc-900 border-zinc-700")} border`}>
                <TabsTrigger
                  value="all"
                  className={`data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-xs`}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  All Paths
                </TabsTrigger>
                <TabsTrigger
                  value="my"
                  className={`data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400 text-xs`}
                >
                  <Target className="w-3.5 h-3.5 mr-1.5" />
                  My Paths
                  {stats.enrolledCount > 0 && (
                    <span className="ml-1.5 text-[9px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full">
                      {stats.enrolledCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {/* Stats (only on "My Paths" tab) */}
        <AnimatePresence>
          {activeTab === "my" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Target, label: "Enrolled Paths", value: stats.enrolledCount },
                  { icon: CheckCircle, label: "Completed Paths", value: stats.completedCount },
                  { icon: BookOpen, label: "Courses Finished", value: stats.totalCoursesDone },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`${lt(
                      "bg-white border border-slate-200 shadow-sm",
                      "bg-zinc-900/50 border border-zinc-800/60"
                    )} rounded-xl p-3 flex items-center gap-3`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${lt("bg-slate-100 border-slate-200", "bg-zinc-800/80 border-zinc-700/50")} border flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4 text-teal-400/70" />
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${lt("text-slate-900", "text-zinc-100")}`}>{stat.value}</div>
                      <div className={`text-[10px] ${lt("text-slate-400", "text-zinc-500")}`}>{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${lt(
            "bg-white border border-slate-200 shadow-sm",
            "bg-zinc-900/50 border border-zinc-800/60"
          )} rounded-xl p-3`}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${lt("text-slate-400", "text-zinc-500")}`} />
              <Input
                placeholder="Search learning paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 h-9 text-sm ${lt(
                  "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400",
                  "bg-zinc-800/60 border-zinc-700 text-white placeholder:text-zinc-500"
                )}`}
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className={`w-full sm:w-40 h-9 text-xs ${lt(
                "bg-slate-50 border-slate-200 text-slate-700",
                "bg-zinc-800/60 border-zinc-700 text-zinc-300"
              )}`}>
                <Filter className="w-3 h-3 mr-1.5" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className={lt("bg-white border-slate-200", "bg-zinc-900 border-zinc-700")}>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className={`w-full sm:w-36 h-9 text-xs ${lt(
                "bg-slate-50 border-slate-200 text-slate-700",
                "bg-zinc-800/60 border-zinc-700 text-zinc-300"
              )}`}>
                <BarChart3 className="w-3 h-3 mr-1.5" />
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className={lt("bg-white border-slate-200", "bg-zinc-900 border-zinc-700")}>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-semibold ${lt("text-slate-700", "text-zinc-300")}`}>
            {activeTab === "my" ? "My Learning Paths" : "All Learning Paths"}
            <span className={`ml-2 text-xs font-normal ${lt("text-slate-400", "text-zinc-500")}`}>
              ({filteredPaths.length})
            </span>
          </h2>
        </div>

        {/* Path Grid */}
        {filteredPaths.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="p-8 text-center">
              <Route className={`w-10 h-10 mx-auto mb-3 ${lt("text-slate-300", "text-zinc-600")}`} />
              <h3 className={`text-sm font-semibold ${lt("text-slate-700", "text-zinc-300")} mb-1`}>
                {activeTab === "my" ? "No Enrolled Paths" : "No Paths Found"}
              </h3>
              <p className={`text-xs ${lt("text-slate-400", "text-zinc-500")} max-w-sm mx-auto`}>
                {activeTab === "my"
                  ? "Browse the All Paths tab and enroll in a learning path to get started."
                  : "Try adjusting your search or filters to find learning paths."}
              </p>
              {activeTab === "my" && (
                <Button
                  onClick={() => setActiveTab("all")}
                  className="mt-4 bg-teal-600 hover:bg-teal-500 text-white text-xs h-8 px-4"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Browse Paths
                </Button>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPaths.map((path, i) => (
              <PathCard
                key={path.id}
                path={path}
                stepsForPath={stepsMap[path.id]}
                progressMap={progressMap}
                onOpenDetail={handleOpenDetail}
                index={i}
                lt={lt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <PathDetailDialog
        path={selectedPath}
        steps={selectedPath ? (stepsMap[selectedPath.id] || []) : []}
        courses={courses}
        progressMap={progressMap}
        open={detailOpen}
        onClose={handleCloseDetail}
        onEnroll={handleEnroll}
        enrolling={enrolling}
        lt={lt}
      />
    </div>
  );
}
