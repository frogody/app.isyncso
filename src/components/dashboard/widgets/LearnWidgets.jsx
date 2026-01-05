import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  GraduationCap, BookOpen, ArrowRight, ChevronRight, Play,
  Flame, Zap, Award, Target, Trophy
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';

// Widget metadata for the apps manager
export const LEARN_WIDGETS = [
  {
    id: 'learn_progress',
    name: 'Continue Learning',
    description: 'Shows courses in progress',
    size: 'large'
  },
  {
    id: 'learn_stats',
    name: 'Learning Stats',
    description: 'Hours learned and skills tracked',
    size: 'small'
  },
  {
    id: 'learn_streak',
    name: 'Daily Streak',
    description: 'Your current learning streak',
    size: 'small'
  },
  {
    id: 'learn_xp',
    name: 'XP & Level',
    description: 'Your level and XP progress',
    size: 'small'
  },
  {
    id: 'learn_skills',
    name: 'Top Skills',
    description: 'Your strongest skills',
    size: 'medium'
  },
  {
    id: 'learn_certificates',
    name: 'Certificates',
    description: 'Earned certificates',
    size: 'small'
  }
];

export function LearnProgressWidget({ courses = [], userProgress = [] }) {
  const inProgressCourses = userProgress.filter(p => p.status === 'in_progress');
  
  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-cyan-400" />
          Continue Learning
        </h2>
        <Link to={createPageUrl("Learn")} className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1">
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {inProgressCourses.length > 0 ? (
        <div className="space-y-3">
          {courses.filter(c => inProgressCourses.some(p => p.course_id === c.id)).slice(0, 3).map((course) => {
            const progress = inProgressCourses.find(p => p.course_id === course.id);
            return (
              <Link key={course.id} to={createPageUrl(`LessonViewer?courseId=${course.id}`)} className="block group">
                <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-cyan-500/30 hover:bg-zinc-800/70 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate pr-4">{course.title}</h3>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={progress?.completion_percentage || 0} className="flex-1 h-2" />
                    <span className="text-sm text-cyan-400 font-medium">{progress?.completion_percentage || 0}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-white font-medium mb-2">Start your learning journey</h3>
          <p className="text-zinc-400 text-sm mb-4">Explore courses and build new skills</p>
          <Link to={createPageUrl("Learn")}>
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium">
              Browse Courses
            </Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
}

export function LearnStatsWidget({ totalHours = 0, skillsCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/20 border-cyan-500/30 border">
          <GraduationCap className="w-5 h-5 text-cyan-400" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{totalHours}h</div>
      <div className="text-sm text-zinc-400">Learning Hours</div>
    </GlassCard>
  );
}

export function LearnStreakWidget({ streak = 0, longestStreak = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/20 border-orange-500/30 border">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
        {streak >= 7 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
            🔥 On Fire!
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{streak}</div>
      <div className="text-sm text-zinc-400">Day Streak</div>
      {longestStreak > streak && (
        <div className="text-xs text-zinc-500 mt-1">Best: {longestStreak} days</div>
      )}
    </GlassCard>
  );
}

export function LearnXPWidget({ totalXP = 0, level = 1 }) {
  const xpInCurrentLevel = totalXP % 1000;
  const progressToNextLevel = (xpInCurrentLevel / 1000) * 100;
  
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 text-white font-bold text-lg">
          {level}
        </div>
        <span className="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          Level {level}
        </span>
      </div>
      <div className="text-2xl font-bold text-cyan-400">{totalXP.toLocaleString()}</div>
      <div className="text-sm text-zinc-400 mb-2">Total XP</div>
      <Progress value={progressToNextLevel} className="h-1.5" />
      <div className="text-xs text-zinc-500 mt-1">{1000 - xpInCurrentLevel} XP to next level</div>
    </GlassCard>
  );
}

export function LearnSkillsWidget({ skills = [] }) {
  const topSkills = skills.slice(0, 4);
  
  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Top Skills
        </h2>
        <Link to={createPageUrl("SkillMap")} className="text-cyan-400 text-sm hover:text-cyan-300">View all</Link>
      </div>

      {topSkills.length > 0 ? (
        <div className="space-y-3">
          {topSkills.map((skill, i) => (
            <div key={skill.id || i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate">{skill.name || skill.skill_name}</span>
                  <span className="text-xs text-cyan-400 font-medium">{skill.progress || skill.proficiency_score || 0}%</span>
                </div>
                <Progress value={skill.progress || skill.proficiency_score || 0} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
          Complete courses to build skills
        </div>
      )}
    </GlassCard>
  );
}

export function LearnCertificatesWidget({ certificateCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 border-amber-500/30 border">
          <Award className="w-5 h-5 text-amber-400" />
        </div>
        {certificateCount > 0 && (
          <Link to={createPageUrl("Certificates")} className="text-xs text-amber-400 hover:text-amber-300">
            View →
          </Link>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{certificateCount}</div>
      <div className="text-sm text-zinc-400">Certificates</div>
    </GlassCard>
  );
}