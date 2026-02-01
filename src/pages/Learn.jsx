import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { useDebounce } from "@/components/hooks/useDebounce";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";
import { useUser } from "@/components/context/UserContext";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { LearnPageTransition } from '@/components/learn/ui';
import {
  Search, Grid, List, BookOpen, GraduationCap, Clock, CheckCircle, PlayCircle,
  TrendingUp, Sparkles, Target, Award, ArrowRight, Zap, Trophy, Filter, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePagination } from "@/components/hooks/usePagination";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import CourseCard from "../components/courses/CourseCard";
import CourseFilters from "../components/courses/CourseFilters";
import EmptyState from "../components/courses/EmptyState";

function StatBox({ icon: Icon, label, value, color = 'teal', lt }) {
  const colorClasses = {
    teal: `${lt('bg-slate-100', 'bg-zinc-800/80')} text-teal-400/70 ${lt('border-slate-200', 'border-zinc-700/50')}`,
    emerald: `${lt('bg-slate-100', 'bg-zinc-800/80')} text-teal-400/70 ${lt('border-slate-200', 'border-zinc-700/50')}`,
    violet: `${lt('bg-slate-100', 'bg-zinc-800/80')} text-teal-400/60 ${lt('border-slate-200', 'border-zinc-700/50')}`,
    amber: `${lt('bg-slate-100', 'bg-zinc-800/80')} text-teal-300/70 ${lt('border-slate-200', 'border-zinc-700/50')}`,
  };

  return (
    <div className={`${lt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/50 border border-zinc-800/60')} backdrop-blur-sm rounded-xl p-3`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${lt('text-slate-400', 'text-zinc-500')} text-xs`}>{label}</p>
          <p className={`text-lg font-bold ${lt('text-slate-900', 'text-zinc-100')} mt-0.5`}>{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} border flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function ContinueCourseCard({ course, progress, lt }) {
  return (
    <Link to={createPageUrl(`LessonViewer?courseId=${course.id}`)}>
      <div className={`group ${lt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/50 border border-zinc-800/60')} backdrop-blur-sm rounded-xl hover:border-teal-800/50 transition-all duration-200 p-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/80')} border ${lt('border-slate-200', 'border-zinc-700/50')} flex items-center justify-center flex-shrink-0`}>
            <BookOpen className="w-6 h-6 text-teal-400/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${lt('text-slate-900', 'text-zinc-100')} truncate group-hover:text-teal-300/90 transition-colors`}>{course.title}</h3>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progress?.completion_percentage || 0} className={`flex-1 h-2 ${lt('bg-slate-200', 'bg-zinc-800')}`} />
              <span className="text-xs text-teal-400/80 font-medium">{progress?.completion_percentage || 0}%</span>
            </div>
          </div>
          <Button size="sm" className={`${lt('bg-slate-100', 'bg-zinc-800/80')} ${lt('hover:bg-slate-200', 'hover:bg-zinc-800')} text-teal-400/80 border ${lt('border-slate-200', 'border-zinc-700/60')} flex-shrink-0`}>
            Continue
          </Button>
        </div>
      </div>
    </Link>
  );
}

function RecommendedCourseCard({ course, lt }) {
  return (
    <Link to={createPageUrl(`CourseDetail?id=${course.id}`)}>
      <div className={`group ${lt('bg-white border border-slate-200 shadow-sm', 'bg-zinc-900/50 border border-zinc-800/60')} backdrop-blur-sm rounded-xl hover:border-teal-800/50 transition-all duration-200 p-4`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/80')} border ${lt('border-slate-200', 'border-zinc-700/50')} flex items-center justify-center flex-shrink-0`}>
            <Sparkles className="w-5 h-5 text-teal-400/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${lt('text-slate-900', 'text-zinc-100')} group-hover:text-teal-300/90 transition-colors truncate`}>
              {course.title}
            </h3>
            <p className={`text-xs ${lt('text-slate-400', 'text-zinc-600')} mt-1 line-clamp-2`}>{course.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={`${lt('bg-slate-100', 'bg-zinc-800/80')} text-teal-400/70 ${lt('border-slate-200', 'border-zinc-700/50')} border text-xs`}>
                {course.difficulty}
              </Badge>
              <span className={`text-xs ${lt('text-slate-400', 'text-zinc-600')} flex items-center gap-1`}>
                <Clock className="w-3 h-3" />
                {course.duration_hours}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Learn() {
  const { user, isLoading: userLoading } = useUser();
  const { theme, toggleTheme, lt } = useTheme();
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useLocalStorage("courses_filter_category", "all");
  const [selectedDifficulty, setSelectedDifficulty] = useLocalStorage("courses_filter_difficulty", "all");
  const [viewMode, setViewMode] = useLocalStorage("courses_view_mode", "grid");
  const [activeSection, setActiveSection] = useState("dashboard");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadData = useCallback(async () => {
    if (!user) {
      setDataLoading(false);
      return;
    }

    try {
      // RLS handles filtering - list all accessible items
      const [coursesData, progressData] = await Promise.allSettled([
        db.entities.Course.list({ limit: 100 }).catch(() => []),
        db.entities.UserProgress.list({ limit: 100 }).catch(() => [])
      ]);

      setCourses(coursesData.status === 'fulfilled' ? coursesData.value || [] : []);
      setUserProgress(progressData.status === 'fulfilled' ? progressData.value || [] : []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    loadData().then(() => { if (!isMounted) return; });
    return () => { isMounted = false; };
  }, [loadData]);

  // Stats calculation
  const stats = useMemo(() => {
    const completedCourses = userProgress.filter(p => p.status === 'completed').length;
    const inProgressCourses = userProgress.filter(p => p.status === 'in_progress').length;
    const totalTimeSpent = userProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
    const avgProgress = userProgress.length > 0
      ? Math.round(userProgress.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / userProgress.length)
      : 0;
    return { completedCourses, inProgressCourses, totalTimeSpent, avgProgress };
  }, [userProgress]);

  // Course filtering
  const getFilteredCourses = useCallback((section) => {
    let filtered = [...courses];

    if (section === "library") {
      filtered = filtered.filter(c => c.is_template === true && c.is_published !== false);
    } else if (section === "my-courses") {
      const progressCourseIds = userProgress.map(p => p.course_id);
      filtered = filtered.filter(c =>
        progressCourseIds.includes(c.id) ||
        (c.is_template === false && c.created_by === user?.email)
      );
    }

    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title?.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower) ||
        course.category?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(course => course.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [courses, debouncedSearchTerm, selectedCategory, selectedDifficulty, user, userProgress]);

  const myCourses = getFilteredCourses("my-courses");
  const libraryCourses = getFilteredCourses("library");

  const myCoursePagination = usePagination(myCourses, 12);
  const libraryPagination = usePagination(libraryCourses, 12);

  // In progress courses for continue learning
  const inProgressCoursesList = useMemo(() => {
    return courses.filter(c => {
      const progress = userProgress.find(p => p.course_id === c.id);
      return progress && progress.status === 'in_progress';
    }).slice(0, 3);
  }, [courses, userProgress]);

  // Recommended courses
  const recommendedCourses = useMemo(() => {
    const progressCourseIds = userProgress.map(p => p.course_id);
    return courses
      .filter(c => c.is_template === true && c.is_published !== false && !progressCourseIds.includes(c.id))
      .slice(0, 4);
  }, [courses, userProgress]);

  const loading = userLoading || dataLoading;

  if (loading) {
    return (
      <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} p-4`}>
        <div className="space-y-4">
          <Skeleton className={`h-20 w-full ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className={`h-16 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />)}
          </div>
          <Skeleton className={`h-80 w-full ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatBox icon={BookOpen} label="Courses Available" value={libraryCourses.length} color="teal" lt={lt} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatBox icon={PlayCircle} label="In Progress" value={stats.inProgressCourses} color="teal" lt={lt} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatBox icon={CheckCircle} label="Completed" value={stats.completedCourses} color="teal" lt={lt} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatBox icon={Clock} label="Hours Learned" value={`${Math.round(stats.totalTimeSpent / 60)}h`} color="teal" lt={lt} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-4">
          {/* Continue Learning */}
          <GlassCard glow="teal" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-base font-semibold ${lt('text-slate-900', 'text-white')} flex items-center gap-2`}>
                <PlayCircle className="w-4 h-4 text-teal-400" />
                Continue Learning
              </h2>
              {myCourses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection("my-courses")}
                  className="text-teal-400 hover:text-teal-300 text-xs h-7"
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>

            {inProgressCoursesList.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-5 h-5 text-teal-400" />
                </div>
                <h4 className={`${lt('text-slate-900', 'text-white')} font-medium text-sm mb-1.5`}>No courses in progress</h4>
                <p className={`${lt('text-slate-500', 'text-zinc-400')} text-xs mb-3`}>Browse the library to find your next course</p>
                <Button
                  size="sm"
                  onClick={() => setActiveSection("library")}
                  className="bg-teal-500 hover:bg-teal-400 text-white h-8 text-xs"
                >
                  Browse Library
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {inProgressCoursesList.map(course => {
                  const progress = userProgress.find(p => p.course_id === course.id);
                  return <ContinueCourseCard key={course.id} course={course} progress={progress} lt={lt} />;
                })}
              </div>
            )}
          </GlassCard>

          {/* Recommended Courses */}
          <GlassCard glow="teal" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-base font-semibold ${lt('text-slate-900', 'text-white')} flex items-center gap-2`}>
                <Sparkles className="w-4 h-4 text-teal-400" />
                Recommended for You
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection("library")}
                className="text-teal-400 hover:text-teal-300 text-xs h-7"
              >
                Browse All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {recommendedCourses.length === 0 ? (
              <div className="text-center py-8">
                <Award className={`w-8 h-8 ${lt('text-slate-300', 'text-zinc-600')} mx-auto mb-2`} />
                <p className={`${lt('text-slate-500', 'text-zinc-400')} text-xs`}>You've explored all available courses!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendedCourses.map(course => (
                  <RecommendedCourseCard key={course.id} course={course} lt={lt} />
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Progress Ring */}
          <GlassCard glow="teal" className="p-4">
            <h2 className={`text-sm font-semibold ${lt('text-slate-900', 'text-white')} flex items-center gap-2 mb-3`}>
              <Target className="w-4 h-4 text-teal-400" />
              Your Progress
            </h2>

            <div className="text-center mb-4">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle className={lt('text-slate-200', 'text-zinc-800')} strokeWidth="6" stroke="currentColor" fill="transparent" r="42" cx="48" cy="48" />
                  <circle
                    className="text-teal-500"
                    strokeWidth="6"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="42"
                    cx="48"
                    cy="48"
                    strokeDasharray={`${stats.avgProgress * 2.64} 264`}
                  />
                </svg>
                <span className={`absolute text-lg font-bold ${lt('text-slate-900', 'text-white')}`}>{stats.avgProgress}%</span>
              </div>
              <p className={`text-sm ${lt('text-slate-500', 'text-zinc-400')} mt-2`}>Average Completion</p>
            </div>

            <div className="space-y-3">
              <div className={`flex items-center justify-between text-sm p-3 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/50')}`}>
                <span className={lt('text-slate-500', 'text-zinc-400')}>Courses Started</span>
                <span className={`${lt('text-slate-900', 'text-white')} font-medium`}>{userProgress.length}</span>
              </div>
              <div className={`flex items-center justify-between text-sm p-3 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/50')}`}>
                <span className={lt('text-slate-500', 'text-zinc-400')}>Completed</span>
                <span className="text-teal-400 font-medium">{stats.completedCourses}</span>
              </div>
              <div className={`flex items-center justify-between text-sm p-3 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/50')}`}>
                <span className={lt('text-slate-500', 'text-zinc-400')}>In Progress</span>
                <span className="text-teal-300 font-medium">{stats.inProgressCourses}</span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard glow="teal" className="p-6">
            <h2 className={`text-lg font-semibold ${lt('text-slate-900', 'text-white')} flex items-center gap-2 mb-4`}>
              <Zap className="w-5 h-5 text-teal-400" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Browse Course Library', icon: BookOpen, action: () => setActiveSection("library") },
                { label: 'View Certificates', icon: Award, link: 'Certificates' },
                { label: 'Leaderboard', icon: Trophy, link: 'Leaderboard' },
                { label: 'Skills Dashboard', icon: Target, link: 'SkillMap' },
              ].map((item, i) => (
                item.link ? (
                  <Link key={i} to={createPageUrl(item.link)}>
                    <Button className={`w-full justify-start ${lt('bg-slate-100', 'bg-zinc-800/50')} ${lt('hover:bg-slate-200', 'hover:bg-zinc-800')} ${lt('text-slate-900', 'text-white')} border ${lt('border-slate-200', 'border-zinc-700')} hover:border-teal-500/30`}>
                      <item.icon className="w-4 h-4 mr-2 text-teal-400" />
                      {item.label}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    key={i}
                    onClick={item.action}
                    className={`w-full justify-start ${lt('bg-slate-100', 'bg-zinc-800/50')} ${lt('hover:bg-slate-200', 'hover:bg-zinc-800')} ${lt('text-slate-900', 'text-white')} border ${lt('border-slate-200', 'border-zinc-700')} hover:border-teal-500/30`}
                  >
                    <item.icon className="w-4 h-4 mr-2 text-teal-400" />
                    {item.label}
                  </Button>
                )
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );

  const renderCourseList = (courseList, pagination, emptyTitle, emptyDesc) => (
    <div className="space-y-6">
      <CourseFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={setSelectedDifficulty}
      />

      <div className="flex justify-between items-center">
        <p className={`text-sm ${lt('text-slate-500', 'text-zinc-400')}`}>{courseList.length} courses found</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "text-teal-400 bg-teal-950/30" : "text-gray-400"}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "text-teal-400 bg-teal-950/30" : "text-gray-400"}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {courseList.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDesc} />
      ) : (
        <>
          <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {pagination.items.map((course) => {
              const progress = userProgress.find(p => p.course_id === course.id);
              return <CourseCard key={course.id} course={course} progress={progress} viewMode={viewMode} />;
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrev} className={`${lt('border-slate-200', 'border-zinc-700')} ${lt('text-slate-600', 'text-zinc-300')}`}>
                Previous
              </Button>
              <span className={`text-sm ${lt('text-slate-500', 'text-zinc-400')} px-4`}>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNext} className={`${lt('border-slate-200', 'border-zinc-700')} ${lt('text-slate-600', 'text-zinc-300')}`}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <LearnPageTransition>
      <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} relative`}>
        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-teal-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-950/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <PageHeader
            title="My Courses"
            subtitle={`Welcome back, ${user?.full_name || 'Learner'}! Continue your learning journey.`}
            icon={GraduationCap}
            color="teal"
            actions={
              <div className="flex gap-2">
                <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-colors ${lt('border-slate-200 hover:bg-slate-100 text-slate-600', 'border-zinc-700 hover:bg-zinc-800 text-zinc-400')}`}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                {['dashboard', 'my-courses', 'library'].map((section) => (
                  <Button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    size="sm"
                    className={activeSection === section
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                      : `${lt('bg-white', 'bg-zinc-900')} border ${lt('border-slate-200', 'border-zinc-700')} ${lt('text-slate-500', 'text-zinc-400')} ${lt('hover:text-slate-900', 'hover:text-white')} ${lt('hover:border-slate-300', 'hover:border-zinc-600')}`
                    }
                  >
                    {section === 'dashboard' && 'Dashboard'}
                    {section === 'my-courses' && `My Courses (${myCourses.length})`}
                    {section === 'library' && `Library (${libraryCourses.length})`}
                  </Button>
                ))}
              </div>
            }
          />

          {/* Content */}
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "my-courses" && renderCourseList(myCourses, myCoursePagination, "No courses started yet", "Browse the library to find courses that interest you!")}
          {activeSection === "library" && renderCourseList(libraryCourses, libraryPagination, "No courses found", "Try adjusting your filters or check back later.")}
        </div>
      </div>
    </LearnPageTransition>
  );
}
