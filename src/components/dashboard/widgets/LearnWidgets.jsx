import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  GraduationCap, BookOpen, ArrowRight, ChevronRight,
  Flame, Zap, Award, Target
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

// Widget metadata for the apps manager
export const LEARN_WIDGETS = [
  { id: 'learn_progress', name: 'Continue Learning', description: 'Shows courses in progress', size: 'large' },
  { id: 'learn_stats', name: 'Learning Stats', description: 'Hours learned and skills tracked', size: 'small' },
  { id: 'learn_streak', name: 'Daily Streak', description: 'Your current learning streak', size: 'small' },
  { id: 'learn_xp', name: 'XP & Level', description: 'Your level and XP progress', size: 'small' },
  { id: 'learn_skills', name: 'Top Skills', description: 'Your strongest skills', size: 'medium' },
  { id: 'learn_certificates', name: 'Certificates', description: 'Earned certificates', size: 'small' }
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-colors ${className}`}>
    {children}
  </div>
);

export function LearnProgressWidget({ courses = [], userProgress = [] }) {
  const inProgressCourses = userProgress.filter(p => p.status === 'in_progress');

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-cyan-400" />
          Continue Learning
        </h2>
        <Link to={createPageUrl("Learn")} className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {inProgressCourses.length > 0 ? (
        <div className="space-y-2.5">
          {courses.filter(c => inProgressCourses.some(p => p.course_id === c.id)).slice(0, 3).map((course) => {
            const progress = inProgressCourses.find(p => p.course_id === course.id);
            return (
              <Link key={course.id} to={createPageUrl(`LessonViewer?courseId=${course.id}`)} className="block group">
                <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors truncate pr-4">{course.title}</h3>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 flex-shrink-0 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progress?.completion_percentage || 0} className="flex-1 h-1.5" />
                    <span className="text-xs text-cyan-400 font-medium">{progress?.completion_percentage || 0}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 mb-3">Start your learning journey</p>
          <Link to={createPageUrl("Learn")}>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
              Browse Courses
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

export function LearnStatsWidget({ totalHours = 0, skillsCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
        </div>
        <span className="text-xs text-zinc-400 font-medium">Learning Hours</span>
      </div>
      <div className="text-2xl font-bold text-white">{totalHours}h</div>
    </Card>
  );
}

export function LearnStreakWidget({ streak = 0, longestStreak = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Day Streak</span>
        </div>
        {streak >= 7 && (
          <span className="text-xs text-orange-400 font-medium">On Fire</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{streak}</div>
      {longestStreak > streak && (
        <div className="text-xs text-zinc-500 mt-1">Best: {longestStreak} days</div>
      )}
    </Card>
  );
}

export function LearnXPWidget({ totalXP = 0, level = 1 }) {
  const xpInCurrentLevel = totalXP % 1000;
  const progressToNextLevel = (xpInCurrentLevel / 1000) * 100;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Total XP</span>
        </div>
        <span className="text-xs text-purple-400 font-medium">Lvl {level}</span>
      </div>
      <div className="text-2xl font-bold text-white">{totalXP.toLocaleString()}</div>
      <Progress value={progressToNextLevel} className="h-1 mt-2" />
      <div className="text-xs text-zinc-500 mt-1">{1000 - xpInCurrentLevel} XP to next level</div>
    </Card>
  );
}

export function LearnSkillsWidget({ skills = [] }) {
  const topSkills = skills.slice(0, 4);

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          Top Skills
        </h2>
        <Link to={createPageUrl("SkillMap")} className="text-cyan-400 text-sm hover:text-cyan-300">View all</Link>
      </div>

      {topSkills.length > 0 ? (
        <div className="space-y-3">
          {topSkills.map((skill, i) => (
            <div key={skill.id || i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-300">{skill.name || skill.skill_name}</span>
                <span className="text-xs text-cyan-400 font-medium">{skill.progress || skill.proficiency_score || 0}%</span>
              </div>
              <Progress value={skill.progress || skill.proficiency_score || 0} className="h-1.5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Complete courses to build skills
        </div>
      )}
    </Card>
  );
}

export function LearnCertificatesWidget({ certificateCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Certificates</span>
        </div>
        {certificateCount > 0 && (
          <Link to={createPageUrl("Certificates")} className="text-xs text-cyan-400 hover:text-cyan-300">
            View
          </Link>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{certificateCount}</div>
    </Card>
  );
}
