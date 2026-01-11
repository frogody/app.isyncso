import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, TrendingUp, BookOpen, Star, Sparkles, Award, ChevronDown, ChevronUp,
  ArrowRight, Zap, Trophy, GraduationCap
} from "lucide-react";
import { useUser } from "@/components/context/UserContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const LEVEL_CONFIG = {
  expert: { 
    icon: '⭐', 
    label: 'Expert',
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/20',
    gradient: 'from-yellow-500 to-amber-500', 
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20'
  },
  advanced: { 
    icon: '🔷', 
    label: 'Advanced',
    color: 'text-blue-400', 
    bg: 'bg-blue-500/20',
    gradient: 'from-blue-500 to-cyan-500', 
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20'
  },
  intermediate: { 
    icon: '🔹', 
    label: 'Intermediate',
    color: 'text-cyan-400', 
    bg: 'bg-cyan-500/20',
    gradient: 'from-cyan-500 to-teal-500', 
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20'
  },
  beginner: { 
    icon: '🔸', 
    label: 'Beginner',
    color: 'text-green-400', 
    bg: 'bg-green-500/20',
    gradient: 'from-green-500 to-emerald-500', 
    border: 'border-green-500/30',
    glow: 'shadow-green-500/20'
  },
  novice: { 
    icon: '⚪', 
    label: 'Novice',
    color: 'text-zinc-400', 
    bg: 'bg-zinc-500/20',
    gradient: 'from-zinc-500 to-zinc-600', 
    border: 'border-zinc-500/30',
    glow: 'shadow-zinc-500/20'
  }
};

function SkillCard({ skill, config, index, isExpanded, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div
        onClick={onToggle}
        className={`relative bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/60 hover:border-cyan-800/50 transition-all duration-200 cursor-pointer overflow-hidden`}
      >
        {/* Top gradient bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient} opacity-40`} />
        
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-2xl flex-shrink-0`}>
              {config.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-semibold text-zinc-100">{skill.skill_name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-zinc-100">{skill.proficiency_score}%</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </div>
              
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.proficiency_score}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                />
              </div>
              
              <div className="flex items-center gap-4 mt-3 text-xs text-zinc-600">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {skill.course_count} course{skill.course_count !== 1 ? 's' : ''}
                </span>
                {skill.assessments_passed > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-cyan-400/60" />
                    {skill.assessments_passed} assessment{skill.assessments_passed !== 1 ? 's' : ''} passed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && skill.courses_contributing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-5 pt-5 border-t border-zinc-800 overflow-hidden"
              >
                <h5 className="text-xs font-semibold text-zinc-400 uppercase mb-3">Contributing Courses</h5>
                <div className="space-y-2">
                  {skill.courses_contributing.map((course, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                      <span className="text-sm text-white">{course.course_title}</span>
                      <Badge className={`${config.bg} ${config.color} ${config.border} border text-xs`}>
                        +{course.contribution_score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function SkillGapCard({ gap, index }) {
  return (
    <GlassCard key={index} glow="cyan" className="p-6 bg-zinc-900/30">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-zinc-100 mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400/70" />
            {gap.skill_name}
          </h4>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">
              Current: <span className="text-cyan-400/80 font-medium">{gap.current_score}%</span> ({gap.current_level})
            </span>
            <ArrowRight className="w-4 h-4 text-zinc-700" />
            <span className="text-zinc-500">
              Target: <span className="text-cyan-300/80 font-medium">{gap.target_level}</span>
            </span>
          </div>
        </div>
        <Badge className="bg-zinc-800/80 text-cyan-400/70 border-zinc-700/50 border">
          Growth Area
        </Badge>
      </div>

      <div className="space-y-2">
        {gap.recommended_courses?.map((course) => (
          <Link key={course.course_id} to={createPageUrl(`CourseDetail?id=${course.course_id}`)}>
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800/70 border border-zinc-700/60 hover:border-cyan-800/50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-cyan-400/70" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-zinc-200 group-hover:text-cyan-300/90 transition-colors">{course.course_title}</h5>
                  <p className="text-xs text-zinc-600">+{course.estimated_boost} estimated boost</p>
                </div>
              </div>
              <Button size="sm" className="bg-zinc-800/80 hover:bg-zinc-800 text-cyan-400/80 border border-zinc-700/60">
                Start
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}

export default function SkillMap() {
  const { user, isLoading: userLoading } = useUser();
  const [skillData, setSkillData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [expandedSkill, setExpandedSkill] = useState(null);

  const loadSkillMap = React.useCallback(async () => {
    if (!user) return;
    try {
      const response = await db.functions.invoke('getUserSkillMap', { user_id: user.id });
      setSkillData(response.data);
    } catch (error) {
      console.error("Failed to load skill map:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadSkillMap();
  }, [loadSkillMap, user]);

  const loading = userLoading || dataLoading;

  const stats = useMemo(() => {
    if (!skillData?.skills) return { total: 0, expert: 0, advanced: 0, growthAreas: 0 };
    return {
      total: skillData.skills.length,
      expert: skillData.skills.filter(s => s.proficiency_level === 'expert').length,
      advanced: skillData.skills.filter(s => s.proficiency_level === 'advanced').length,
      growthAreas: skillData.skill_gaps?.length || 0
    };
  }, [skillData]);

  const groupedSkills = useMemo(() => {
    if (!skillData?.skills) return {};
    return {
      expert: skillData.skills.filter(s => s.proficiency_level === 'expert'),
      advanced: skillData.skills.filter(s => s.proficiency_level === 'advanced'),
      intermediate: skillData.skills.filter(s => s.proficiency_level === 'intermediate'),
      beginner: skillData.skills.filter(s => s.proficiency_level === 'beginner'),
      novice: skillData.skills.filter(s => s.proficiency_level === 'novice')
    };
  }, [skillData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-2xl" />)}
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
          icon={Target}
          title="Skill Map"
          subtitle={`${stats.total} skills tracked · ${stats.expert + stats.advanced} mastered`}
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">Total Skills</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <Target className="w-6 h-6 text-cyan-400/70" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">Expert Level</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.expert}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-cyan-300/70" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">Advanced Level</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.advanced}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <Award className="w-6 h-6 text-cyan-400/60" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-sm">Growth Areas</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">{stats.growthAreas}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-cyan-400/70" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Skills by Level */}
        {Object.entries(groupedSkills).map(([level, skills]) => {
          if (skills.length === 0) return null;
          const config = LEVEL_CONFIG[level];

          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-lg`}>
                  {config.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                <Badge className={`${config.bg} ${config.color} ${config.border} border`}>
                  {skills.length} skill{skills.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {skills.map((skill, i) => (
                  <SkillCard
                    key={skill.skill_id}
                    skill={skill}
                    config={config}
                    index={i}
                    isExpanded={expandedSkill === skill.skill_id}
                    onToggle={() => setExpandedSkill(expandedSkill === skill.skill_id ? null : skill.skill_id)}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* Skill Gaps / Growth Areas */}
        {skillData?.skill_gaps?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Recommended Growth Areas</h3>
            </div>

            <div className="space-y-4">
              {skillData.skill_gaps.map((gap, i) => (
                <SkillGapCard key={i} gap={gap} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {(!skillData?.skills || skillData.skills.length === 0) && (
          <div className="p-16 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-cyan-400/70" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-100 mb-3">Build Your Skill Profile</h3>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto">
              Complete courses to build your professional skill profile and track your growth over time.
            </p>
            <Link to={createPageUrl("Learn")}>
              <Button className="bg-cyan-600/80 hover:bg-cyan-600 text-white px-6">
                <GraduationCap className="w-4 h-4 mr-2" />
                Start Learning
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}