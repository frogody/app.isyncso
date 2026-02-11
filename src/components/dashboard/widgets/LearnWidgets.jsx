import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  GraduationCap, BookOpen, ArrowRight, ChevronRight,
  Flame, Zap, Award, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard, GlassCard, ProgressRing } from '@/components/ui/GlassCard';
import { AnimatedProgress } from '@/components/dashboard/AnimatedProgress';
import { AnimatedCount } from '@/components/ui/AnimatedNumber';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Widget metadata for the apps manager
export const LEARN_WIDGETS = [
  { id: 'learn_progress', name: 'Continue Learning', description: 'Shows courses in progress', size: 'large' },
  { id: 'learn_stats', name: 'Learning Stats', description: 'Hours learned and skills tracked', size: 'small' },
  { id: 'learn_streak', name: 'Daily Streak', description: 'Your current learning streak', size: 'small' },
  { id: 'learn_xp', name: 'XP & Level', description: 'Your level and XP progress', size: 'small' },
  { id: 'learn_skills', name: 'Top Skills', description: 'Your strongest skills', size: 'medium' },
  { id: 'learn_certificates', name: 'Certificates', description: 'Earned certificates', size: 'small' }
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export function LearnProgressWidget({ courses = [], userProgress = [] }) {
  const { t } = useTheme();
  const inProgressCourses = userProgress.filter(p => p.status === 'in_progress');
  const matchedCourses = courses
    .filter(c => inProgressCourses.some(p => p.course_id === c.id))
    .slice(0, 4);

  return (
    <GlassCard glow="cyan" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          Continue Learning
        </h2>
        <Link to={createPageUrl("Learn")} className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {matchedCourses.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {matchedCourses.map((course) => {
            const progress = inProgressCourses.find(p => p.course_id === course.id);
            const pct = progress?.completion_percentage || 0;

            return (
              <motion.div key={course.id} variants={staggerItem}>
                <Link to={createPageUrl(`LessonViewer?courseId=${course.id}`)} className="block group">
                  <div className={cn(
                    'p-3 rounded-xl border transition-all duration-200',
                    t(
                      'bg-zinc-100/80 border-zinc-200 hover:border-cyan-400/50',
                      'bg-white/[0.03] border-white/10 hover:border-cyan-500/40'
                    )
                  )}>
                    <div className="flex items-center gap-3">
                      <ProgressRing value={pct} size={56} strokeWidth={4} color="cyan">
                        <span className={cn('text-xs font-bold', t('text-zinc-900', 'text-white'))}>{pct}%</span>
                      </ProgressRing>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          'text-sm font-medium truncate transition-colors group-hover:text-cyan-400',
                          t('text-zinc-900', 'text-white')
                        )}>
                          {course.title}
                        </h3>
                        <p className={cn('text-xs mt-0.5', t('text-zinc-500', 'text-zinc-400'))}>
                          {pct < 25 ? 'Just started' : pct < 75 ? 'In progress' : 'Almost done'}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors group-hover:text-cyan-400',
                        t('text-zinc-400', 'text-zinc-600')
                      )} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3',
            t('bg-zinc-100', 'bg-white/[0.04]')
          )}>
            <BookOpen className={cn('w-7 h-7', t('text-zinc-400', 'text-zinc-600'))} />
          </div>
          <p className={cn('text-sm mb-3', t('text-zinc-500', 'text-zinc-400'))}>Start your learning journey</p>
          <Link to={createPageUrl("Learn")}>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
              Browse Courses
            </Button>
          </Link>
        </motion.div>
      )}
    </GlassCard>
  );
}

export function LearnStatsWidget({ totalHours = 0, skillsCount = 0 }) {
  return (
    <StatCard
      icon={GraduationCap}
      color="cyan"
      value={`${totalHours}h`}
      label="Learning Hours"
    />
  );
}

export function LearnStreakWidget({ streak = 0, longestStreak = 0 }) {
  return (
    <StatCard
      icon={Flame}
      color="orange"
      value={streak}
      label="Day Streak"
      change={streak >= 7 ? 'On Fire' : null}
      trend="up"
    />
  );
}

export function LearnXPWidget({ totalXP = 0, level = 1 }) {
  const { t } = useTheme();
  const xpInCurrentLevel = totalXP % 1000;

  return (
    <GlassCard glow="purple" className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
          <Zap className="w-4 h-4 text-purple-400" />
        </div>
        <span className="text-xs text-purple-400 font-medium">Lvl {level}</span>
      </div>
      <div className={cn('text-lg font-bold mb-0.5', t('text-zinc-900', 'text-white'))}>
        <AnimatedCount value={totalXP} />
      </div>
      <div className={cn('text-xs mb-1.5', t('text-zinc-500', 'text-zinc-400'))}>Total XP</div>
      <AnimatedProgress value={xpInCurrentLevel} max={1000} color="purple" height={4} />
      <div className={cn('text-[10px] mt-1', t('text-zinc-400', 'text-zinc-500'))}>{1000 - xpInCurrentLevel} XP to next level</div>
    </GlassCard>
  );
}

export function LearnSkillsWidget({ skills = [] }) {
  const { t } = useTheme();
  const topSkills = skills.slice(0, 4);

  return (
    <GlassCard glow="cyan" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/20 border border-cyan-500/30">
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          Top Skills
        </h2>
        <Link to={createPageUrl("SkillMap")} className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">View all</Link>
      </div>

      {topSkills.length > 0 ? (
        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {topSkills.map((skill, i) => {
            const skillValue = skill.progress || skill.proficiency_score || 0;
            const skillName = skill.name || skill.skill_name;

            return (
              <motion.div key={skill.id || i} variants={staggerItem}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn('text-sm', t('text-zinc-700', 'text-zinc-300'))}>{skillName}</span>
                  <span className="text-xs text-cyan-400 font-medium">{skillValue}%</span>
                </div>
                <AnimatedProgress value={skillValue} max={100} color="cyan" height={5} />
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          className="text-center py-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2',
            t('bg-zinc-100', 'bg-white/[0.04]')
          )}>
            <Target className={cn('w-6 h-6', t('text-zinc-400', 'text-zinc-600 opacity-40'))} />
          </div>
          <p className={cn('text-sm', t('text-zinc-500', 'text-zinc-500'))}>Complete courses to build skills</p>
        </motion.div>
      )}
    </GlassCard>
  );
}

export function LearnCertificatesWidget({ certificateCount = 0 }) {
  return (
    <StatCard
      icon={Award}
      color="amber"
      value={certificateCount}
      label="Certificates"
    />
  );
}
