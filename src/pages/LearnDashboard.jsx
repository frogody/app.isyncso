import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatMinutes } from '@/utils/dateUtils';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { 
  BookOpen, Trophy, Flame, Target, Clock, Zap, 
  ArrowRight, Award, TrendingUp, Calendar, Play, Info, Share2,
  ChevronRight, Star, Sparkles, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GlassCard, ProgressRing } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import { BadgeShowcase } from '@/components/ui/BadgeShowcase';
import { SkillProgressList } from '@/components/ui/SkillProgressBar';
import { CourseCarousel } from '@/components/ui/CourseCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

function StatCardEnhanced({ icon: Icon, label, value, sublabel, color = 'cyan', onClick, delay = 0 }) {
  const colorClasses = {
    cyan: { icon: 'text-cyan-400/70', bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', glow: 'shadow-cyan-500/5' },
    orange: { icon: 'text-cyan-300/70', bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', glow: 'shadow-cyan-500/5' },
    violet: { icon: 'text-cyan-400/60', bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', glow: 'shadow-cyan-500/5' },
    emerald: { icon: 'text-cyan-400/70', bg: 'bg-zinc-800/80', border: 'border-zinc-700/50', glow: 'shadow-cyan-500/5' },
  };
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`relative bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/60 p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-cyan-700/40 hover:bg-zinc-900/70' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
          {sublabel && <p className={`text-xs ${colors.icon} mt-0.5`}>{sublabel}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
      {onClick && (
        <div className="absolute bottom-2 right-2">
          <Info className="w-3 h-3 text-zinc-700" />
        </div>
      )}
    </motion.div>
  );
}

function ContinueLearningCard({ course, progress, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={createPageUrl(`LessonViewer?courseId=${course.id}`)}>
        <div className="group relative bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-cyan-800/50 transition-all duration-200 p-4">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-cyan-600/40" />
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-7 h-7 text-cyan-400/70" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-zinc-100 truncate group-hover:text-cyan-300/90 transition-colors">
                {course.title}
              </h4>
              <div className="flex items-center gap-3 mt-2">
                <Progress value={progress?.completion_percentage || 0} className="flex-1 h-2 bg-zinc-800" />
                <span className="text-sm font-medium text-cyan-400/80">{progress?.completion_percentage || 0}%</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {course.duration_hours}h total
                </span>
                {course.category && (
                  <Badge className="bg-zinc-800/80 text-zinc-500 border-zinc-700/50 text-[10px]">
                    {course.category}
                  </Badge>
                )}
              </div>
            </div>
            
            <Button size="sm" className="bg-zinc-800/80 hover:bg-zinc-800 text-cyan-400/80 border border-zinc-700/60 flex-shrink-0">
              Continue <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function LearnDashboard() {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [skills, setSkills] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitySessions, setActivitySessions] = useState([]);
  
  // Modal states
  const [showXPModal, setShowXPModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user?.id) {
      loadDashboardData().then(() => {
        if (!isMounted) return;
      });
    }
    return () => { isMounted = false; };
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // RLS handles data isolation - no need for user_id filters
      const [progressData, gamificationData, allCourses, sessionsData, certsData, skillsData] = await Promise.all([
        db.entities.UserProgress.list({ limit: 100 }).catch(() => []),
        // UserGamification may not exist
        db.entities.UserGamification?.list?.({ limit: 1 }).catch(() => []) || Promise.resolve([]),
        // List all courses - is_template/is_published columns may not exist
        db.entities.Course.list({ limit: 100 }).catch(() => []),
        db.entities.ActivitySession.list({ limit: 200 }).catch(() => []),
        db.entities.Certificate.list({ limit: 50 }).catch(() => []),
        db.entities.UserSkill.list({ limit: 20 }).catch(() => [])
      ]);

      const totalTimeMinutes = sessionsData.reduce((sum, s) => sum + (s.total_active_minutes || 0), 0);
      const completedCourses = progressData.filter(p => p.status === 'completed').length;
      const inProgressCourses = progressData.filter(p => p.status === 'in_progress').length;

      setAnalytics({
        totalTimeMinutes,
        completedCourses,
        inProgressCourses,
        certificatesCount: certsData.length,
        streak: gamificationData[0]?.current_streak || 0,
        weeklyPoints: gamificationData[0]?.weekly_points || 0,
        totalPoints: gamificationData[0]?.total_points || 0,
        level: gamificationData[0]?.level || 1
      });

      setGamification(gamificationData[0]);
      setUserProgress(progressData);
      setCourses(allCourses);
      setCertificates(certsData);
      setActivitySessions(sessionsData);
      setSkills(skillsData.slice(0, 5).map(s => ({
        id: s.id,
        name: s.skill_name || 'Skill',
        progress: s.proficiency_score || 0
      })));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Using centralized formatMinutes from @/utils/dateUtils

  // Memoized calculations
  const { continueLearning, recommended } = useMemo(() => {
    const inProgressCourseIds = userProgress.filter(p => p.status === 'in_progress').map(p => p.course_id);
    const startedCourseIds = new Set(userProgress.map(p => p.course_id));
    
    return {
      continueLearning: courses.filter(c => inProgressCourseIds.includes(c.id)).slice(0, 3),
      recommended: courses.filter(c => !startedCourseIds.has(c.id)).slice(0, 6)
    };
  }, [courses, userProgress]);

  const overallProgress = useMemo(() => {
    if (!analytics?.completedCourses && !analytics?.inProgressCourses) return 0;
    return Math.round((analytics.completedCourses / (analytics.completedCourses + analytics.inProgressCourses)) * 100) || 0;
  }, [analytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 bg-zinc-800 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-64 bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

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
          icon={GraduationCap}
          title="Learning Dashboard"
          subtitle={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Learner'}! Keep up the momentum.`}
          color="cyan"
          actions={
            <Link to={createPageUrl('Learn')}>
              <Button className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Courses
              </Button>
            </Link>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardEnhanced
            icon={Play}
            label="In Progress"
            value={analytics?.inProgressCourses || 0}
            sublabel="Active courses"
            color="cyan"
            delay={0}
          />
          <StatCardEnhanced
            icon={Trophy}
            label="Completed"
            value={analytics?.completedCourses || 0}
            sublabel="Courses finished"
            color="emerald"
            delay={0.1}
          />
          <StatCardEnhanced
            icon={Award}
            label="Certificates"
            value={analytics?.certificatesCount || 0}
            sublabel="Earned"
            color="violet"
            delay={0.2}
          />
          <StatCardEnhanced
            icon={Flame}
            label="Day Streak"
            value={analytics?.streak || 0}
            sublabel="Keep it going!"
            color="orange"
            onClick={() => setShowStreakModal(true)}
            delay={0.3}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Learning */}
            <GlassCard glow="cyan" className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-cyan-400" />
                  Continue Learning
                </h3>
                <Link to={createPageUrl('Learn')} className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {continueLearning.length > 0 ? (
                <div className="space-y-3">
                  {continueLearning.map((course, i) => {
                    const progress = userProgress.find(p => p.course_id === course.id);
                    return <ContinueLearningCard key={course.id} course={course} progress={progress} index={i} />;
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h4 className="text-white font-medium mb-2">No courses in progress</h4>
                  <p className="text-zinc-400 text-sm mb-4">Start your learning journey today</p>
                  <Link to={createPageUrl('Learn')}>
                    <Button className="bg-cyan-500 hover:bg-cyan-400 text-white">
                      Start a Course
                    </Button>
                  </Link>
                </div>
              )}
            </GlassCard>

            {/* Activity Heatmap */}
            <GlassCard glow="cyan" className="p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Weekly Activity
              </h3>
              <ActivityHeatmap userId={user?.id} color="cyan" />
            </GlassCard>

            {/* Skill Progress */}
            {skills.length > 0 && (
              <GlassCard glow="cyan" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    Skill Progress
                  </h3>
                  <Link to={createPageUrl('SkillMap')} className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <SkillProgressList skills={skills} color="cyan" clickable />
              </GlassCard>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Progress Ring */}
            <GlassCard glow="cyan" className="p-6">
              <h3 className="text-lg font-semibold text-white text-center mb-6">Overall Progress</h3>
              <div className="flex justify-center mb-6">
                <ProgressRing value={overallProgress} color="cyan" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div 
                  onClick={() => setShowTimeModal(true)}
                  className="cursor-pointer hover:bg-zinc-800/50 rounded-xl p-3 transition-colors border border-transparent hover:border-zinc-700"
                >
                  <div className="text-2xl font-bold text-white">{formatMinutes(analytics?.totalTimeMinutes || 0)}</div>
                  <div className="text-xs text-zinc-400 flex items-center justify-center gap-1">
                    Time Invested <Info className="w-3 h-3" />
                  </div>
                </div>
                <div 
                  onClick={() => setShowXPModal(true)}
                  className="cursor-pointer hover:bg-zinc-800/50 rounded-xl p-3 transition-colors border border-transparent hover:border-zinc-700"
                >
                  <div className="text-2xl font-bold text-cyan-400">{analytics?.totalPoints || 0}</div>
                  <div className="text-xs text-zinc-400 flex items-center justify-center gap-1">
                    Total XP <Info className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Level & Streak */}
            <GlassCard glow="cyan" className="p-6">
              <div 
                onClick={() => setShowLevelModal(true)}
                className="flex items-center justify-between mb-4 cursor-pointer hover:bg-zinc-800/30 rounded-xl p-3 -m-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-500/30">
                    {analytics?.level || 1}
                  </div>
                  <div>
                    <div className="text-white font-semibold">Level {analytics?.level || 1}</div>
                    <div className="text-xs text-zinc-400">Click for details</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </div>
              
              <div className="mb-4 mt-4">
                <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                  <span>Progress to Level {(analytics?.level || 1) + 1}</span>
                  <span className="text-cyan-400">{((analytics?.totalPoints || 0) % 1000)} / 1000 XP</span>
                </div>
                <Progress value={((analytics?.totalPoints || 0) % 1000) / 10} className="h-2 bg-zinc-800" />
              </div>
              
              <div 
                onClick={() => setShowStreakModal(true)}
                className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/15 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-7 h-7 text-orange-400" />
                  <div>
                    <div className="text-white font-semibold">{analytics?.streak || 0} Day Streak!</div>
                    <div className="text-xs text-zinc-400">Click to view history</div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-orange-400 hover:bg-orange-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`I'm on a ${analytics?.streak || 0} day learning streak!`);
                    toast.success('Streak copied!');
                  }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </GlassCard>

            {/* Achievements */}
            <GlassCard glow="cyan" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-cyan-400" />
                  Achievements
                </h3>
                <Link to={createPageUrl('Leaderboard')} className="text-cyan-400 text-sm hover:text-cyan-300">
                  View All
                </Link>
              </div>
              
              <BadgeShowcase 
                badges={gamification?.badges?.map((b, i) => ({
                  id: i,
                  name: b.name || b,
                  type: b.type || 'default',
                  tier: b.tier || 'bronze',
                  description: b.description
                })) || []} 
                maxDisplay={6}
                showLocked={true}
              />
            </GlassCard>
          </div>
        </div>

        {/* Recommended Courses */}
        {recommended.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <CourseCarousel courses={recommended} title="Recommended for You" color="cyan" />
          </motion.div>
        )}
      </div>

      {/* XP Modal */}
      <Dialog open={showXPModal} onOpenChange={setShowXPModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              XP Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-center p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400">{analytics?.totalPoints || 0}</div>
              <div className="text-sm text-zinc-400">Total XP Earned</div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">How to Earn XP</h4>
              {[
                { action: 'Complete a lesson', xp: '+50 XP', icon: BookOpen },
                { action: 'Finish a course', xp: '+500 XP', icon: Trophy },
                { action: 'Daily login', xp: '+10 XP', icon: Calendar },
                { action: 'Quiz perfect score', xp: '+100 XP', icon: Award },
                { action: 'Maintain streak', xp: '+25 XP/day', icon: Flame },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-white">{item.action}</span>
                  </div>
                  <span className="text-sm font-medium text-cyan-400">{item.xp}</span>
                </div>
              ))}
            </div>

            <Link to={createPageUrl('Leaderboard')}>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white">
                View Leaderboard
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Streak Modal */}
      <Dialog open={showStreakModal} onOpenChange={setShowStreakModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Streak History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30">
                <div className="text-3xl font-bold text-orange-400">{analytics?.streak || 0}</div>
                <div className="text-sm text-zinc-400">Current Streak</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="text-3xl font-bold text-white">{gamification?.longest_streak || analytics?.streak || 0}</div>
                <div className="text-sm text-zinc-400">Longest Streak</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50">
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Streak Tips</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <Flame className="w-3 h-3 text-orange-400 mt-1 flex-shrink-0" />
                  Complete at least one lesson daily
                </li>
                <li className="flex items-start gap-2">
                  <Flame className="w-3 h-3 text-orange-400 mt-1 flex-shrink-0" />
                  Streaks reset at midnight
                </li>
                <li className="flex items-start gap-2">
                  <Flame className="w-3 h-3 text-orange-400 mt-1 flex-shrink-0" />
                  Longer streaks = bonus XP rewards
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => {
                navigator.clipboard.writeText(`I'm on a ${analytics?.streak || 0} day learning streak!`);
                toast.success('Copied to clipboard!');
              }}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Your Streak
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Modal */}
      <Dialog open={showLevelModal} onOpenChange={setShowLevelModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              Level Progress
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-cyan-500/30">
                {analytics?.level || 1}
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Level {analytics?.level || 1}</div>
                <div className="text-sm text-zinc-400">{analytics?.totalPoints || 0} total XP</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Progress to Level {(analytics?.level || 1) + 1}</span>
                <span className="text-cyan-400">{((analytics?.totalPoints || 0) % 1000)} / 1000 XP</span>
              </div>
              <Progress value={((analytics?.totalPoints || 0) % 1000) / 10} className="h-3" />
              <div className="text-xs text-zinc-500 mt-2">
                {1000 - ((analytics?.totalPoints || 0) % 1000)} XP until next level
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-300">Level Rewards</h4>
              {[
                { level: 5, reward: 'Unlock Advanced Courses', unlocked: (analytics?.level || 1) >= 5 },
                { level: 10, reward: 'Custom Profile Badge', unlocked: (analytics?.level || 1) >= 10 },
                { level: 20, reward: 'Early Access Features', unlocked: (analytics?.level || 1) >= 20 },
                { level: 50, reward: 'Master Status', unlocked: (analytics?.level || 1) >= 50 },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${item.unlocked ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-zinc-800/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${item.unlocked ? 'bg-cyan-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                      {item.level}
                    </div>
                    <span className={`text-sm ${item.unlocked ? 'text-white' : 'text-zinc-400'}`}>{item.reward}</span>
                  </div>
                  {item.unlocked && <Star className="w-4 h-4 text-cyan-400" />}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Modal */}
      <Dialog open={showTimeModal} onOpenChange={setShowTimeModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Time Invested
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="text-center p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400">{formatMinutes(analytics?.totalTimeMinutes || 0)}</div>
              <div className="text-sm text-zinc-400">Total Learning Time</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Today', minutes: activitySessions.filter(s => new Date(s.session_start).toDateString() === new Date().toDateString()).reduce((sum, s) => sum + (s.total_active_minutes || 0), 0) },
                { label: 'This Week', minutes: activitySessions.filter(s => new Date(s.session_start) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).reduce((sum, s) => sum + (s.total_active_minutes || 0), 0) },
                { label: 'This Month', minutes: activitySessions.filter(s => new Date(s.session_start) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).reduce((sum, s) => sum + (s.total_active_minutes || 0), 0) },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-zinc-800/50">
                  <div className="text-xl font-bold text-white">{item.minutes}m</div>
                  <div className="text-xs text-zinc-400">{item.label}</div>
                </div>
              ))}
            </div>

            <Link to={createPageUrl('ActivityTimeline')}>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white">
                View Full Activity History
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}