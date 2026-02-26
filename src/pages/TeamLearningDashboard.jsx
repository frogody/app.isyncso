import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { db } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { usePermissions } from '@/components/context/PermissionContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users, Trophy, Flame, Target, BookOpen, BarChart3, Download,
  TrendingUp, Award, AlertTriangle, Clock, Star, ChevronDown,
  ChevronUp, ShieldCheck, Search, ArrowUpRight
} from 'lucide-react';

function SkeletonLoader({ lt }) {
  return (
    <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} p-6`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className={`h-12 w-72 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className={`h-24 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className={`h-80 lg:col-span-2 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
          <Skeleton className={`h-80 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
        </div>
        <Skeleton className={`h-64 ${lt('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
      </div>
    </div>
  );
}

function AccessDenied({ lt }) {
  return (
    <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} flex items-center justify-center p-6`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-center space-y-4 ${lt('bg-white border border-slate-200 shadow-md', 'bg-zinc-900/50 border border-zinc-800/60')} rounded-xl p-8 max-w-md`}
      >
        <ShieldCheck className={`w-10 h-10 ${lt('text-slate-400', 'text-zinc-500')} mx-auto`} />
        <h2 className={`text-lg font-bold ${lt('text-slate-900', 'text-white')}`}>Access Restricted</h2>
        <p className={`text-sm ${lt('text-slate-500', 'text-zinc-400')}`}>
          You need manager-level permissions to view the Team Learning Dashboard.
          Contact your administrator for access.
        </p>
        <Link to={createPageUrl('LearnDashboard')}>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white mt-2">
            Go to My Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color = 'teal', delay = 0, lt }) {
  const colorMap = {
    teal: 'text-teal-400/70',
    blue: 'text-blue-400/70',
    amber: 'text-amber-400/70',
    cyan: 'text-cyan-400/70',
    purple: 'text-purple-400/70',
  };
  const iconColor = colorMap[color] || colorMap.teal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative ${lt(
        'bg-white border border-slate-200 shadow-sm',
        'bg-zinc-900/50 border border-zinc-800/60'
      )} backdrop-blur-sm rounded-xl p-3 transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`${lt('text-slate-400', 'text-zinc-500')} text-xs`}>{label}</p>
          <p className={`text-lg font-bold ${lt('text-slate-900', 'text-zinc-100')} mt-0.5`}>{value}</p>
          {sublabel && <p className={`text-[10px] ${iconColor} mt-0.5`}>{sublabel}</p>}
        </div>
        <div className={`w-8 h-8 rounded-lg ${lt('bg-slate-100', 'bg-zinc-800/80')} border ${lt('border-slate-200', 'border-zinc-700/50')} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  );
}

function CompletionBar({ label, percentage, color = 'teal', delay = 0, lt }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs ${lt('text-slate-600', 'text-zinc-300')} truncate max-w-[60%]`}>{label}</span>
        <span className={`text-xs font-medium ${lt('text-slate-500', 'text-zinc-400')}`}>{percentage}%</span>
      </div>
      <div className={`h-2 rounded-full ${lt('bg-slate-100', 'bg-zinc-800/80')} overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
          className={`h-full rounded-full ${
            percentage >= 80 ? 'bg-teal-500' :
            percentage >= 50 ? 'bg-blue-500' :
            percentage >= 25 ? 'bg-amber-500' :
            'bg-red-500'
          }`}
        />
      </div>
    </motion.div>
  );
}

export default function TeamLearningDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const { lt } = useTheme();
  const { hasPermission, hierarchyLevel, isLoading: permLoading } = usePermissions();

  const [teamMembers, setTeamMembers] = useState([]);
  const [allProgress, setAllProgress] = useState([]);
  const [allGamification, setAllGamification] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedSections, setExpandedSections] = useState({
    table: true,
    skills: true,
    courses: true,
    required: true,
  });

  const canAccess = hasPermission('analytics.view') || hierarchyLevel >= 60;

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const loadTeamData = useCallback(async () => {
    if (!user?.id || !canAccess) return;
    setLoading(true);

    try {
      // Fetch team members scoped to company
      const { data: members, error: membersErr } = await db
        .from('users')
        .select('id, full_name, email, avatar_url, last_sign_in_at, created_at')
        .eq('company_id', user.company_id);

      if (membersErr) throw membersErr;
      const team = members || [];
      setTeamMembers(team);

      if (team.length === 0) {
        setLoading(false);
        return;
      }

      const memberIds = team.map(m => m.id);

      // Parallel data fetches
      const [progressRes, gamRes, coursesRes, skillsRes] = await Promise.all([
        db.from('user_progress')
          .select('user_id, course_id, status, completion_percentage, time_spent_minutes')
          .in('user_id', memberIds),
        db.from('user_gamification')
          .select('user_id, total_points, level, current_streak, weekly_points')
          .in('user_id', memberIds),
        db.from('courses')
          .select('id, title, category, difficulty, is_required'),
        db.from('user_skills')
          .select('user_id, skill_name, proficiency_score')
          .in('user_id', memberIds),
      ]);

      setAllProgress(progressRes.data || []);
      setAllGamification(gamRes.data || []);
      setCourses(coursesRes.data || []);
      setAllSkills(skillsRes.data || []);
    } catch (err) {
      console.error('Failed to load team learning data:', err);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [user, canAccess]);

  useEffect(() => {
    if (user?.id && !permLoading) {
      loadTeamData();
    }
  }, [loadTeamData, user, permLoading]);

  // Derived analytics
  const analytics = useMemo(() => {
    if (!teamMembers.length) return null;

    const memberStats = teamMembers.map(member => {
      const memberProgress = allProgress.filter(p => p.user_id === member.id);
      const memberGam = allGamification.find(g => g.user_id === member.id);
      const memberSkills = allSkills.filter(s => s.user_id === member.id);

      const completed = memberProgress.filter(p => p.status === 'completed');
      const avgCompletion = memberProgress.length
        ? Math.round(memberProgress.reduce((s, p) => s + (p.completion_percentage || 0), 0) / memberProgress.length)
        : 0;
      const totalTime = memberProgress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0);

      return {
        ...member,
        coursesCompleted: completed.length,
        coursesInProgress: memberProgress.filter(p => p.status === 'in_progress').length,
        avgCompletion,
        totalPoints: memberGam?.total_points || 0,
        level: memberGam?.level || 1,
        streak: memberGam?.current_streak || 0,
        weeklyPoints: memberGam?.weekly_points || 0,
        totalTime,
        skillCount: memberSkills.length,
        skills: memberSkills,
      };
    });

    const totalCompleted = memberStats.reduce((s, m) => s + m.coursesCompleted, 0);
    const avgCompletionRate = memberStats.length
      ? Math.round(memberStats.reduce((s, m) => s + m.avgCompletion, 0) / memberStats.length)
      : 0;
    const avgXP = memberStats.length
      ? Math.round(memberStats.reduce((s, m) => s + m.totalPoints, 0) / memberStats.length)
      : 0;

    const mostActive = [...memberStats].sort((a, b) => b.totalPoints - a.totalPoints)[0];

    // Course completion rates
    const courseStats = courses.map(course => {
      const enrolled = allProgress.filter(p => p.course_id === course.id);
      const completed = enrolled.filter(p => p.status === 'completed');
      return {
        ...course,
        enrolled: enrolled.length,
        completed: completed.length,
        completionRate: enrolled.length
          ? Math.round((completed.length / enrolled.length) * 100)
          : 0,
      };
    }).filter(c => c.enrolled > 0).sort((a, b) => b.enrolled - a.enrolled);

    // Skill coverage
    const skillMap = {};
    allSkills.forEach(s => {
      if (!skillMap[s.skill_name]) {
        skillMap[s.skill_name] = { name: s.skill_name, users: new Set(), totalScore: 0 };
      }
      skillMap[s.skill_name].users.add(s.user_id);
      skillMap[s.skill_name].totalScore += s.proficiency_score || 0;
    });
    const skillCoverage = Object.values(skillMap)
      .map(s => ({
        name: s.name,
        coverage: Math.round((s.users.size / teamMembers.length) * 100),
        userCount: s.users.size,
        avgScore: s.users.size ? Math.round(s.totalScore / s.users.size) : 0,
      }))
      .sort((a, b) => b.userCount - a.userCount);

    // Top performers
    const topPerformers = [...memberStats]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 3);

    // Required training status
    const requiredCourses = courses.filter(c => c.is_required);
    const requiredStatus = requiredCourses.map(course => {
      const membersCompleted = allProgress.filter(
        p => p.course_id === course.id && p.status === 'completed'
      ).map(p => p.user_id);
      const membersNotCompleted = teamMembers.filter(m => !membersCompleted.includes(m.id));
      return {
        course,
        completedCount: membersCompleted.length,
        notCompleted: membersNotCompleted,
      };
    });

    return {
      memberStats,
      totalCompleted,
      avgCompletionRate,
      avgXP,
      mostActive,
      courseStats,
      skillCoverage,
      topPerformers,
      requiredStatus,
    };
  }, [teamMembers, allProgress, allGamification, courses, allSkills]);

  // Filtered and sorted member list
  const filteredMembers = useMemo(() => {
    if (!analytics) return [];
    let members = [...analytics.memberStats];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      members = members.filter(m =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    }

    members.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'name': aVal = (a.full_name || '').toLowerCase(); bVal = (b.full_name || '').toLowerCase(); break;
        case 'completed': aVal = a.coursesCompleted; bVal = b.coursesCompleted; break;
        case 'completion': aVal = a.avgCompletion; bVal = b.avgCompletion; break;
        case 'xp': aVal = a.totalPoints; bVal = b.totalPoints; break;
        case 'streak': aVal = a.streak; bVal = b.streak; break;
        default: aVal = a.full_name; bVal = b.full_name;
      }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return members;
  }, [analytics, searchQuery, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const exportCSV = useCallback(() => {
    if (!analytics) return;

    const headers = ['Name', 'Email', 'Courses Completed', 'Avg Completion %', 'Total XP', 'Level', 'Streak', 'Time (min)', 'Skills'];
    const rows = analytics.memberStats.map(m => [
      m.full_name || '',
      m.email || '',
      m.coursesCompleted,
      m.avgCompletion,
      m.totalPoints,
      m.level,
      m.streak,
      m.totalTime,
      m.skillCount,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team-learning-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Team report exported successfully');
  }, [analytics]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-0.5 text-teal-400" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5 text-teal-400" />;
  };

  // Loading states
  if (userLoading || permLoading) return <SkeletonLoader lt={lt} />;
  if (!canAccess) return <AccessDenied lt={lt} />;
  if (loading) return <SkeletonLoader lt={lt} />;

  const formatLastActive = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const getRankMedal = (index) => {
    if (index === 0) return { bg: 'from-yellow-400/20 to-amber-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', label: '1st' };
    if (index === 1) return { bg: 'from-zinc-300/20 to-zinc-400/10', border: 'border-zinc-400/40', text: 'text-zinc-300', label: '2nd' };
    if (index === 2) return { bg: 'from-amber-600/20 to-amber-700/10', border: 'border-amber-600/40', text: 'text-amber-500', label: '3rd' };
    return null;
  };

  return (
    <div className={`min-h-screen ${lt('bg-slate-50', 'bg-black')} relative`}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-1/6 w-72 h-72 bg-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-5">
        {/* Page Header */}
        <PageHeader
          icon={Users}
          title="Team Learning Dashboard"
          subtitle={`${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''} across ${courses.length} course${courses.length !== 1 ? 's' : ''}`}
          color="teal"
          actions={
            <Button
              onClick={exportCSV}
              disabled={!analytics}
              className={`${lt(
                'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
                'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              )} text-xs gap-1.5`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          }
        />

        {!analytics || teamMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center py-16 ${lt('bg-white border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')} rounded-xl`}
          >
            <Users className={`w-10 h-10 ${lt('text-slate-300', 'text-zinc-600')} mx-auto mb-3`} />
            <h3 className={`text-sm font-semibold ${lt('text-slate-700', 'text-zinc-300')}`}>No Team Members Found</h3>
            <p className={`text-xs ${lt('text-slate-400', 'text-zinc-500')} mt-1`}>No users are associated with your company yet.</p>
          </motion.div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard
                icon={Users}
                label="Team Members"
                value={teamMembers.length}
                delay={0}
                lt={lt}
              />
              <StatCard
                icon={Target}
                label="Avg Completion"
                value={`${analytics.avgCompletionRate}%`}
                sublabel={analytics.avgCompletionRate >= 70 ? 'On track' : 'Needs attention'}
                color="blue"
                delay={0.05}
                lt={lt}
              />
              <StatCard
                icon={BookOpen}
                label="Courses Completed"
                value={analytics.totalCompleted}
                delay={0.1}
                lt={lt}
              />
              <StatCard
                icon={Trophy}
                label="Avg XP"
                value={analytics.avgXP.toLocaleString()}
                color="amber"
                delay={0.15}
                lt={lt}
              />
              <StatCard
                icon={Star}
                label="Most Active"
                value={analytics.mostActive?.full_name?.split(' ')[0] || '-'}
                sublabel={`${analytics.mostActive?.totalPoints?.toLocaleString() || 0} XP`}
                color="purple"
                delay={0.2}
                lt={lt}
              />
            </div>

            {/* Top Performers + Skill Gap Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top Performers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className={`${lt(
                  'bg-white border border-slate-200 shadow-sm',
                  'bg-zinc-900/50 border border-zinc-800/60'
                )} rounded-xl p-4`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-teal-400" />
                  <h3 className={`text-sm font-semibold ${lt('text-slate-800', 'text-zinc-200')}`}>Top Performers</h3>
                </div>
                <div className="space-y-3">
                  {analytics.topPerformers.map((performer, idx) => {
                    const medal = getRankMedal(idx);
                    return (
                      <motion.div
                        key={performer.id}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.08 }}
                        className={`flex items-center gap-3 ${lt(
                          'bg-slate-50 border border-slate-100',
                          'bg-zinc-800/40 border border-zinc-700/40'
                        )} rounded-lg p-3`}
                      >
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${medal.bg} border ${medal.border} flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${medal.text}`}>{medal.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${lt('text-slate-800', 'text-zinc-200')} truncate`}>
                            {performer.full_name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>
                              {performer.coursesCompleted} courses
                            </span>
                            <span className="text-[10px] text-teal-400 flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" /> {performer.streak}d
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-teal-400">{performer.totalPoints.toLocaleString()}</p>
                          <p className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>XP</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  {analytics.topPerformers.length === 0 && (
                    <p className={`text-xs ${lt('text-slate-400', 'text-zinc-500')} text-center py-4`}>No data yet</p>
                  )}
                </div>
              </motion.div>

              {/* Skill Gap Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`lg:col-span-2 ${lt(
                  'bg-white border border-slate-200 shadow-sm',
                  'bg-zinc-900/50 border border-zinc-800/60'
                )} rounded-xl p-4`}
              >
                <button
                  onClick={() => toggleSection('skills')}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-400" />
                    <h3 className={`text-sm font-semibold ${lt('text-slate-800', 'text-zinc-200')}`}>Skill Gap Analysis</h3>
                    <Badge className={`${lt('bg-slate-100 text-slate-500 border-slate-200', 'bg-zinc-800 text-zinc-400 border-zinc-700')} text-[10px] px-1.5 py-0`}>
                      {analytics.skillCoverage.length} skills
                    </Badge>
                  </div>
                  {expandedSections.skills
                    ? <ChevronUp className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                    : <ChevronDown className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                  }
                </button>
                {expandedSections.skills && (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {analytics.skillCoverage.length > 0 ? (
                      analytics.skillCoverage.slice(0, 15).map((skill, idx) => (
                        <div key={skill.name} className="flex items-center gap-3">
                          <span className={`text-xs ${lt('text-slate-600', 'text-zinc-300')} w-28 truncate flex-shrink-0`} title={skill.name}>
                            {skill.name}
                          </span>
                          <div className="flex-1">
                            <div className={`h-2 rounded-full ${lt('bg-slate-100', 'bg-zinc-800/80')} overflow-hidden`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${skill.coverage}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.04 }}
                                className={`h-full rounded-full ${
                                  skill.coverage >= 75 ? 'bg-teal-500' :
                                  skill.coverage >= 50 ? 'bg-blue-500' :
                                  skill.coverage >= 25 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                              />
                            </div>
                          </div>
                          <span className={`text-[10px] font-medium ${lt('text-slate-500', 'text-zinc-400')} w-14 text-right flex-shrink-0`}>
                            {skill.coverage}% ({skill.userCount})
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className={`text-xs ${lt('text-slate-400', 'text-zinc-500')} text-center py-6`}>No skill data available</p>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Course Completion Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className={`${lt(
                'bg-white border border-slate-200 shadow-sm',
                'bg-zinc-900/50 border border-zinc-800/60'
              )} rounded-xl p-4`}
            >
              <button
                onClick={() => toggleSection('courses')}
                className="flex items-center justify-between w-full mb-3"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  <h3 className={`text-sm font-semibold ${lt('text-slate-800', 'text-zinc-200')}`}>Course Completion Rates</h3>
                </div>
                {expandedSections.courses
                  ? <ChevronUp className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                  : <ChevronDown className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                }
              </button>
              {expandedSections.courses && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {analytics.courseStats.length > 0 ? (
                    analytics.courseStats.slice(0, 12).map((course, idx) => (
                      <CompletionBar
                        key={course.id}
                        label={`${course.title} (${course.completed}/${course.enrolled})`}
                        percentage={course.completionRate}
                        delay={idx * 0.04}
                        lt={lt}
                      />
                    ))
                  ) : (
                    <p className={`text-xs ${lt('text-slate-400', 'text-zinc-500')} text-center py-6`}>No course enrollment data</p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Required Training Status */}
            {analytics.requiredStatus.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`${lt(
                  'bg-white border border-slate-200 shadow-sm',
                  'bg-zinc-900/50 border border-zinc-800/60'
                )} rounded-xl p-4`}
              >
                <button
                  onClick={() => toggleSection('required')}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className={`text-sm font-semibold ${lt('text-slate-800', 'text-zinc-200')}`}>Required Training Status</h3>
                    {analytics.requiredStatus.some(r => r.notCompleted.length > 0) && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
                        Action Needed
                      </Badge>
                    )}
                  </div>
                  {expandedSections.required
                    ? <ChevronUp className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                    : <ChevronDown className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                  }
                </button>
                {expandedSections.required && (
                  <div className="space-y-3">
                    {analytics.requiredStatus.map((item, idx) => (
                      <motion.div
                        key={item.course.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + idx * 0.05 }}
                        className={`${lt(
                          'bg-slate-50 border border-slate-100',
                          'bg-zinc-800/30 border border-zinc-700/30'
                        )} rounded-lg p-3`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${lt('text-slate-700', 'text-zinc-200')}`}>
                              {item.course.title}
                            </span>
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              item.notCompleted.length === 0
                                ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {item.notCompleted.length === 0 ? 'All Complete' : `${item.notCompleted.length} pending`}
                            </Badge>
                          </div>
                          <span className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>
                            {item.completedCount}/{teamMembers.length} completed
                          </span>
                        </div>
                        {item.notCompleted.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.notCompleted.slice(0, 8).map(member => (
                              <span
                                key={member.id}
                                className={`text-[10px] px-2 py-0.5 rounded-full ${lt(
                                  'bg-red-50 text-red-600 border border-red-100',
                                  'bg-red-500/10 text-red-400 border border-red-500/20'
                                )}`}
                              >
                                {member.full_name?.split(' ')[0] || member.email?.split('@')[0] || 'Unknown'}
                              </span>
                            ))}
                            {item.notCompleted.length > 8 && (
                              <span className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>
                                +{item.notCompleted.length - 8} more
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Team Member Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className={`${lt(
                'bg-white border border-slate-200 shadow-sm',
                'bg-zinc-900/50 border border-zinc-800/60'
              )} rounded-xl p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => toggleSection('table')}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-teal-400" />
                  <h3 className={`text-sm font-semibold ${lt('text-slate-800', 'text-zinc-200')}`}>Team Members</h3>
                  {!expandedSections.table
                    ? <ChevronDown className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                    : <ChevronUp className={`w-4 h-4 ${lt('text-slate-400', 'text-zinc-500')}`} />
                  }
                </button>
                {expandedSections.table && (
                  <div className="relative">
                    <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${lt('text-slate-400', 'text-zinc-500')}`} />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 pr-3 py-1.5 text-xs rounded-lg ${lt(
                        'bg-slate-50 border border-slate-200 text-slate-700 placeholder:text-slate-400',
                        'bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500'
                      )} focus:outline-none focus:border-teal-500/50 w-48`}
                    />
                  </div>
                )}
              </div>

              {expandedSections.table && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${lt('border-slate-100', 'border-zinc-800/60')}`}>
                        {[
                          { key: 'name', label: 'Name' },
                          { key: 'completed', label: 'Completed' },
                          { key: 'completion', label: 'Avg Score' },
                          { key: 'xp', label: 'XP' },
                          { key: 'streak', label: 'Streak' },
                          { key: 'lastActive', label: 'Last Active' },
                        ].map(col => (
                          <th
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className={`text-left text-[10px] font-medium ${lt('text-slate-400', 'text-zinc-500')} uppercase tracking-wider py-2 px-2 cursor-pointer hover:text-teal-400 transition-colors select-none ${col.key !== 'name' ? 'text-center' : ''}`}
                          >
                            {col.label}
                            <SortIcon field={col.key} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member, idx) => (
                        <motion.tr
                          key={member.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + idx * 0.02 }}
                          className={`border-b ${lt('border-slate-50 hover:bg-slate-50', 'border-zinc-800/30 hover:bg-zinc-800/20')} transition-colors`}
                        >
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full ${lt('bg-slate-100', 'bg-zinc-800')} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                                ) : (
                                  <span className={`text-[10px] font-bold ${lt('text-slate-500', 'text-zinc-400')}`}>
                                    {(member.full_name || '?')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-medium ${lt('text-slate-800', 'text-zinc-200')} truncate`}>
                                  {member.full_name || 'Unnamed'}
                                </p>
                                <p className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')} truncate`}>
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={`py-2.5 px-2 text-center text-xs font-medium ${lt('text-slate-700', 'text-zinc-300')}`}>
                            {member.coursesCompleted}
                            {member.coursesInProgress > 0 && (
                              <span className={`text-[10px] ${lt('text-slate-400', 'text-zinc-500')} ml-1`}>
                                (+{member.coursesInProgress})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`text-xs font-medium ${
                              member.avgCompletion >= 80 ? 'text-teal-400' :
                              member.avgCompletion >= 50 ? lt('text-slate-600', 'text-zinc-300') :
                              'text-amber-400'
                            }`}>
                              {member.avgCompletion}%
                            </span>
                          </td>
                          <td className={`py-2.5 px-2 text-center text-xs font-medium ${lt('text-slate-700', 'text-zinc-300')}`}>
                            {member.totalPoints.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`text-xs flex items-center justify-center gap-0.5 ${
                              member.streak > 0 ? 'text-orange-400' : lt('text-slate-400', 'text-zinc-600')
                            }`}>
                              {member.streak > 0 && <Flame className="w-3 h-3" />}
                              {member.streak}d
                            </span>
                          </td>
                          <td className={`py-2.5 px-2 text-center text-[10px] ${lt('text-slate-400', 'text-zinc-500')}`}>
                            {formatLastActive(member.last_sign_in_at)}
                          </td>
                        </motion.tr>
                      ))}
                      {filteredMembers.length === 0 && (
                        <tr>
                          <td colSpan={6} className={`py-8 text-center text-xs ${lt('text-slate-400', 'text-zinc-500')}`}>
                            {searchQuery ? 'No members match your search' : 'No team members found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
