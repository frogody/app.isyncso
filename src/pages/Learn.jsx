import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useDebounce } from "@/components/hooks/useDebounce";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";
import { useUser } from "@/components/context/UserContext";
import { 
  Search, Grid, List, BookOpen, GraduationCap, Clock, CheckCircle, PlayCircle, 
  TrendingUp, Sparkles, Target, Award, ArrowRight, Zap, Trophy, Filter
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

function StatBox({ icon: Icon, label, value, color = 'cyan' }) {
  const colorClasses = {
    cyan: 'bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50',
    emerald: 'bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50',
    violet: 'bg-zinc-800/80 text-cyan-400/60 border-zinc-700/50',
    amber: 'bg-zinc-800/80 text-cyan-300/70 border-zinc-700/50',
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/60 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} border flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ContinueCourseCard({ course, progress }) {
  return (
    <Link to={createPageUrl(`LessonViewer?courseId=${course.id}`)}>
      <div className="group bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-cyan-800/50 transition-all duration-200 p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-cyan-400/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-zinc-100 truncate group-hover:text-cyan-300/90 transition-colors">{course.title}</h3>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progress?.completion_percentage || 0} className="flex-1 h-2 bg-zinc-800" />
              <span className="text-xs text-cyan-400/80 font-medium">{progress?.completion_percentage || 0}%</span>
            </div>
          </div>
          <Button size="sm" className="bg-zinc-800/80 hover:bg-zinc-800 text-cyan-400/80 border border-zinc-700/60 flex-shrink-0">
            Continue
          </Button>
        </div>
      </div>
    </Link>
  );
}

function RecommendedCourseCard({ course }) {
  return (
    <Link to={createPageUrl(`CourseDetail?id=${course.id}`)}>
      <div className="group bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-cyan-800/50 transition-all duration-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-400/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-zinc-100 group-hover:text-cyan-300/90 transition-colors truncate">
              {course.title}
            </h3>
            <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{course.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50 border text-xs">
                {course.difficulty}
              </Badge>
              <span className="text-xs text-zinc-600 flex items-center gap-1">
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
      const [coursesData, progressData] = await Promise.allSettled([
        base44.entities.Course.list('-created_date', 100),
        base44.entities.UserProgress.filter({ user_id: user.id })
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
    loadData();
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
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 w-full bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatBox icon={BookOpen} label="Courses Available" value={libraryCourses.length} color="cyan" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatBox icon={PlayCircle} label="In Progress" value={stats.inProgressCourses} color="amber" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatBox icon={CheckCircle} label="Completed" value={stats.completedCourses} color="emerald" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatBox icon={Clock} label="Hours Learned" value={`${Math.round(stats.totalTimeSpent / 60)}h`} color="violet" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Continue Learning */}
          <GlassCard glow="cyan" className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-cyan-400" />
                Continue Learning
              </h2>
              {myCourses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection("my-courses")}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
            
            {inProgressCoursesList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-cyan-400" />
                </div>
                <h4 className="text-white font-medium mb-2">No courses in progress</h4>
                <p className="text-zinc-400 text-sm mb-4">Browse the library to find your next course</p>
                <Button
                  onClick={() => setActiveSection("library")}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white"
                >
                  Browse Library
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {inProgressCoursesList.map(course => {
                  const progress = userProgress.find(p => p.course_id === course.id);
                  return <ContinueCourseCard key={course.id} course={course} progress={progress} />;
                })}
              </div>
            )}
          </GlassCard>

          {/* Recommended Courses */}
          <GlassCard glow="cyan" className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Recommended for You
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection("library")}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Browse All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {recommendedCourses.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">You've explored all available courses!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedCourses.map(course => (
                  <RecommendedCourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Ring */}
          <GlassCard glow="cyan" className="p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-cyan-400" />
              Your Progress
            </h2>
            
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle className="text-zinc-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="56" cx="64" cy="64" />
                  <circle
                    className="text-cyan-500"
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="56"
                    cx="64"
                    cy="64"
                    strokeDasharray={`${stats.avgProgress * 3.52} 352`}
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-white">{stats.avgProgress}%</span>
              </div>
              <p className="text-sm text-zinc-400 mt-2">Average Completion</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-zinc-800/50">
                <span className="text-zinc-400">Courses Started</span>
                <span className="text-white font-medium">{userProgress.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-zinc-800/50">
                <span className="text-zinc-400">Completed</span>
                <span className="text-emerald-400 font-medium">{stats.completedCourses}</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-zinc-800/50">
                <span className="text-zinc-400">In Progress</span>
                <span className="text-amber-400 font-medium">{stats.inProgressCourses}</span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard glow="cyan" className="p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-cyan-400" />
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
                    <Button className="w-full justify-start bg-zinc-800/50 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-cyan-500/30">
                      <item.icon className="w-4 h-4 mr-2 text-cyan-400" />
                      {item.label}
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    key={i}
                    onClick={item.action}
                    className="w-full justify-start bg-zinc-800/50 hover:bg-zinc-800 text-white border border-zinc-700 hover:border-cyan-500/30"
                  >
                    <item.icon className="w-4 h-4 mr-2 text-cyan-400" />
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
        <p className="text-sm text-zinc-400">{courseList.length} courses found</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "text-cyan-400 bg-cyan-950/30" : "text-gray-400"}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "text-cyan-400 bg-cyan-950/30" : "text-gray-400"}
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
              <Button variant="outline" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrev} className="border-zinc-700 text-zinc-300">
                Previous
              </Button>
              <span className="text-sm text-zinc-400 px-4">Page {pagination.currentPage} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNext} className="border-zinc-700 text-zinc-300">
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          title="My Courses"
          subtitle={`Welcome back, ${user?.full_name || 'Learner'}! Continue your learning journey.`}
          icon={GraduationCap}
          color="cyan"
          actions={
            <div className="flex gap-2">
              {['dashboard', 'my-courses', 'library'].map((section) => (
                <Button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  size="sm"
                  className={activeSection === section 
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                    : "bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
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
  );
}