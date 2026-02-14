import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import {
  TrendingUp, Zap, Clock, Target, Brain, Flame,
  BarChart3, Activity, AlertTriangle, BookOpen,
  Award, Calendar, ArrowUpRight, ArrowDownRight,
  Gauge, Layers, Timer, Trophy
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weekNumber(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d - start;
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function formatMinutes(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const CARD = 'bg-zinc-900/50 border border-zinc-800/60 rounded-xl';
const CARD_LIGHT = 'bg-white/80 border border-zinc-200/60 rounded-xl';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] },
});

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function SectionTitle({ icon: Icon, label, lt }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-teal-400" />
      <h3 className={`text-sm font-semibold ${lt('text-zinc-700', 'text-zinc-200')}`}>{label}</h3>
    </div>
  );
}

// 1 -- Learning Velocity
function LearningVelocity({ weeklyData, lt }) {
  const max = Math.max(...weeklyData.map((w) => w.count), 1);
  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(0)}>
      <SectionTitle icon={TrendingUp} label="Learning Velocity" lt={lt} />
      <p className={`text-xs mb-3 ${lt('text-zinc-500', 'text-zinc-500')}`}>
        Courses completed per week
      </p>
      <div className="flex items-end gap-1.5 h-28">
        {weeklyData.map((w, i) => {
          const pct = (w.count / max) * 100;
          return (
            <motion.div
              key={w.label}
              className="flex-1 flex flex-col items-center gap-1"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              style={{ originY: 1 }}
            >
              <div
                className="w-full rounded-t bg-teal-500/70 min-h-[4px] transition-all"
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
              <span className="text-[10px] text-zinc-500 truncate w-full text-center">
                {w.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// 2 -- Skill Radar (bar-based)
function SkillRadar({ skills, lt }) {
  const top6 = skills.slice(0, 6);
  if (top6.length === 0) {
    return (
      <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(1)}>
        <SectionTitle icon={Layers} label="Skill Profile" lt={lt} />
        <p className={`text-xs ${lt('text-zinc-500', 'text-zinc-500')}`}>
          No skill data yet. Complete courses to build your profile.
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(1)}>
      <SectionTitle icon={Layers} label="Skill Profile" lt={lt} />
      <div className="space-y-2.5 mt-2">
        {top6.map((s) => (
          <div key={s.skill_name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className={lt('text-zinc-700', 'text-zinc-300')}>{s.skill_name}</span>
              <span className="text-teal-400 font-medium">{s.proficiency_score}%</span>
            </div>
            <div className={`h-2 rounded-full ${lt('bg-zinc-200', 'bg-zinc-800')}`}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${clamp(s.proficiency_score, 0, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// 3 -- Time Distribution (heatmap)
function TimeDistribution({ interactions, lt }) {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourBuckets = [0, 4, 8, 12, 16, 20]; // 4-hour blocks
  const hourLabels = ['12a-4a', '4a-8a', '8a-12p', '12p-4p', '4p-8p', '8p-12a'];

  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(6).fill(0));
    interactions.forEach((ix) => {
      const d = new Date(ix.created_date);
      const day = (d.getDay() + 6) % 7; // Mon=0
      const hr = d.getHours();
      const bucket = Math.min(Math.floor(hr / 4), 5);
      g[day][bucket] += 1;
    });
    return g;
  }, [interactions]);

  const maxVal = Math.max(...grid.flat(), 1);

  function cellOpacity(v) {
    if (v === 0) return 0;
    return 0.2 + (v / maxVal) * 0.8;
  }

  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(2)}>
      <SectionTitle icon={Clock} label="Time Distribution" lt={lt} />
      <p className={`text-xs mb-3 ${lt('text-zinc-500', 'text-zinc-500')}`}>
        When you learn the most
      </p>
      <div className="space-y-1">
        {/* Hour headers */}
        <div className="flex gap-1 ml-9">
          {hourLabels.map((h) => (
            <div key={h} className="flex-1 text-[9px] text-zinc-500 text-center truncate">
              {h}
            </div>
          ))}
        </div>
        {/* Rows */}
        {dayLabels.map((day, di) => (
          <div key={day} className="flex items-center gap-1">
            <span className="w-8 text-[10px] text-zinc-500 text-right pr-1">{day}</span>
            {grid[di].map((val, hi) => (
              <div
                key={hi}
                className={`flex-1 h-5 rounded-sm ${lt('bg-zinc-200', 'bg-zinc-800/80')}`}
              >
                <div
                  className="h-full rounded-sm bg-teal-500 transition-all"
                  style={{ opacity: cellOpacity(val) }}
                  title={`${val} interactions`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// 4 -- Course Effectiveness
function CourseEffectiveness({ courses, lt }) {
  if (courses.length === 0) {
    return (
      <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(3)}>
        <SectionTitle icon={BookOpen} label="Course Effectiveness" lt={lt} />
        <p className={`text-xs ${lt('text-zinc-500', 'text-zinc-500')}`}>
          Complete courses to see effectiveness data.
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(3)}>
      <SectionTitle icon={BookOpen} label="Course Effectiveness" lt={lt} />
      <div className="space-y-3 mt-2 max-h-64 overflow-y-auto scrollbar-hide">
        {courses.map((c) => (
          <div
            key={c.course_id}
            className={`p-3 rounded-lg ${lt('bg-zinc-100', 'bg-zinc-800/40')} border ${lt('border-zinc-200', 'border-zinc-700/40')}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`text-xs font-medium ${lt('text-zinc-800', 'text-zinc-200')} line-clamp-1`}>
                {c.title}
              </span>
              {c.score != null && (
                <Badge variant="outline" className="text-[10px] border-teal-500/40 text-teal-400 ml-2 shrink-0">
                  {c.score}%
                </Badge>
              )}
            </div>
            <div className="flex gap-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" /> {formatMinutes(c.time_spent)}
              </span>
              {c.skills_gained > 0 && (
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-teal-400" /> {c.skills_gained} skills
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// 5 -- Engagement Score
function EngagementScore({ score, breakdown, lt }) {
  const level =
    score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';
  const levelColor =
    score >= 80
      ? 'text-teal-400'
      : score >= 60
        ? 'text-blue-400'
        : score >= 40
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(4)}>
      <SectionTitle icon={Gauge} label="Engagement Score" lt={lt} />
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle
              cx="40" cy="40" r="34"
              className={lt('stroke-zinc-200', 'stroke-zinc-800')}
              strokeWidth="8" fill="none"
            />
            <motion.circle
              cx="40" cy="40" r="34"
              className="stroke-teal-500"
              strokeWidth="8" fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - score / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${lt('text-zinc-900', 'text-white')}`}>{score}</span>
          </div>
        </div>
        <div>
          <span className={`text-sm font-semibold ${levelColor}`}>{level}</span>
          <p className="text-[10px] text-zinc-500 mt-0.5">Based on your consistency, activity, and quiz performance</p>
        </div>
      </div>
      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className={`text-[10px] w-20 truncate ${lt('text-zinc-600', 'text-zinc-400')}`}>{b.label}</span>
            <div className={`flex-1 h-1.5 rounded-full ${lt('bg-zinc-200', 'bg-zinc-800')}`}>
              <div
                className="h-full rounded-full bg-teal-500/80"
                style={{ width: `${clamp(b.value, 0, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 w-6 text-right">{b.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// 6 -- Knowledge Retention
function KnowledgeRetention({ quizScores, lt }) {
  if (quizScores.length === 0) {
    return (
      <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(5)}>
        <SectionTitle icon={Brain} label="Knowledge Retention" lt={lt} />
        <p className={`text-xs ${lt('text-zinc-500', 'text-zinc-500')}`}>
          Take quizzes to track retention over time.
        </p>
      </motion.div>
    );
  }
  const maxScore = 100;
  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(5)}>
      <SectionTitle icon={Brain} label="Knowledge Retention" lt={lt} />
      <p className={`text-xs mb-3 ${lt('text-zinc-500', 'text-zinc-500')}`}>
        Quiz scores over time
      </p>
      <div className="flex items-end gap-1 h-24">
        {quizScores.slice(-20).map((q, i) => {
          const pct = (q.score / maxScore) * 100;
          const color =
            q.score >= 80 ? 'bg-teal-500/80' : q.score >= 60 ? 'bg-blue-500/70' : 'bg-amber-500/70';
          return (
            <motion.div
              key={`${q.date}-${i}`}
              className="flex-1 flex flex-col items-center justify-end h-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              style={{ originY: 1 }}
            >
              <div
                className={`w-full rounded-t ${color} min-h-[3px]`}
                style={{ height: `${Math.max(pct, 3)}%` }}
                title={`${q.score}% on ${q.date}`}
              />
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
        <span>Oldest</span>
        <span>Recent</span>
      </div>
    </motion.div>
  );
}

// 7 -- Weakest Skills
function WeakestSkills({ skills, lt }) {
  const bottom3 = skills.slice(-3).reverse();
  if (bottom3.length === 0) {
    return (
      <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(6)}>
        <SectionTitle icon={AlertTriangle} label="Areas for Improvement" lt={lt} />
        <p className={`text-xs ${lt('text-zinc-500', 'text-zinc-500')}`}>
          No weak skill data yet.
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(6)}>
      <SectionTitle icon={AlertTriangle} label="Areas for Improvement" lt={lt} />
      <div className="space-y-3 mt-2">
        {bottom3.map((s, i) => (
          <div
            key={s.skill_name}
            className={`p-3 rounded-lg ${lt('bg-red-50', 'bg-red-500/5')} border ${lt('border-red-200/60', 'border-red-500/20')}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-medium ${lt('text-zinc-800', 'text-zinc-200')}`}>
                {s.skill_name}
              </span>
              <span className="text-[10px] text-red-400 font-medium">{s.proficiency_score}%</span>
            </div>
            <div className={`h-1.5 rounded-full ${lt('bg-zinc-200', 'bg-zinc-800')}`}>
              <div
                className="h-full rounded-full bg-red-500/70"
                style={{ width: `${clamp(s.proficiency_score, 0, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              {s.proficiency_score < 30
                ? 'Consider retaking foundational courses for this skill.'
                : s.proficiency_score < 50
                  ? 'Some practice exercises could strengthen this area.'
                  : 'Close to proficiency — a refresher course may help.'}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// 8 -- Learning Streaks (30-day calendar)
function LearningStreaks({ activeDays, currentStreak, lt }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return d;
  });

  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5'} {...fadeUp(7)}>
      <SectionTitle icon={Flame} label="Learning Streaks" lt={lt} />
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className={`text-sm font-bold ${lt('text-zinc-900', 'text-white')}`}>
          {currentStreak} day{currentStreak !== 1 ? 's' : ''}
        </span>
        <span className="text-[10px] text-zinc-500">current streak</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {days.map((d, i) => {
          const key = d.toISOString().slice(0, 10);
          const active = activeDays.has(key);
          const isToday = key === today.toISOString().slice(0, 10);
          return (
            <motion.div
              key={key}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.015, duration: 0.25 }}
              className={`
                aspect-square rounded-full flex items-center justify-center text-[8px]
                ${active
                  ? 'bg-teal-500/80 text-white'
                  : lt('bg-zinc-200', 'bg-zinc-800/60') + ' ' + lt('text-zinc-400', 'text-zinc-600')
                }
                ${isToday ? 'ring-1 ring-teal-400/60' : ''}
              `}
              title={`${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${active ? ' — Active' : ''}`}
            >
              {d.getDate()}
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500/80" /> Active
        </span>
        <span className="flex items-center gap-1">
          <div className={`w-2.5 h-2.5 rounded-full ${lt('bg-zinc-200', 'bg-zinc-800/60')}`} /> Inactive
        </span>
      </div>
    </motion.div>
  );
}

// 9 -- ROI Summary
function ROISummary({ roi, lt }) {
  const stats = [
    { icon: Timer, label: 'Total Time Invested', value: formatMinutes(roi.totalTime), color: 'text-teal-400' },
    { icon: Layers, label: 'Skills Gained', value: roi.skillsGained, color: 'text-blue-400' },
    { icon: BookOpen, label: 'Courses Completed', value: roi.coursesCompleted, color: 'text-cyan-400' },
    { icon: Trophy, label: 'Certificates Earned', value: roi.certificates, color: 'text-amber-400' },
  ];

  return (
    <motion.div className={lt(CARD_LIGHT, CARD) + ' p-5 col-span-1 md:col-span-2'} {...fadeUp(8)}>
      <SectionTitle icon={Award} label="ROI Summary" lt={lt} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`p-3 rounded-lg text-center ${lt('bg-zinc-100', 'bg-zinc-800/40')} border ${lt('border-zinc-200', 'border-zinc-700/40')}`}
          >
            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1.5`} />
            <div className={`text-lg font-bold ${lt('text-zinc-900', 'text-white')}`}>{s.value}</div>
            <div className="text-[10px] text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdvancedAnalytics({ userId, courseId }) {
  const { lt } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) return;
    loadAnalytics();
  }, [userId, courseId]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Parallel data fetching -------------------------------------------------
      const [
        progressRows,
        interactionRows,
        gamificationRows,
        skillRows,
        resultRows,
        courseRows,
        certificateRows,
      ] = await Promise.all([
        db.entities.UserProgress.filter({ user_id: userId }),
        db.entities.LessonInteraction.filter({ user_id: userId }),
        db.entities.UserGamification.list({ limit: 1 }),
        db.entities.UserSkill.filter({ user_id: userId }),
        db.entities.UserResult.filter({ user_id: userId }),
        db.entities.Course.list(),
        db.entities.Certificate.filter({ user_id: userId }).catch(() => []),
      ]);

      // Scope interactions to course if provided
      const interactions = courseId
        ? interactionRows.filter((i) => i.course_id === courseId)
        : interactionRows;

      const progress = courseId
        ? progressRows.filter((p) => p.course_id === courseId)
        : progressRows;

      const results = courseId
        ? resultRows.filter((r) => r.course_id === courseId)
        : resultRows;

      const gamification = gamificationRows[0] || {
        total_points: 0,
        weekly_points: 0,
        level: 1,
        current_streak: 0,
      };

      // Build a course lookup
      const courseMap = {};
      courseRows.forEach((c) => {
        courseMap[c.id] = c;
      });

      // ---- 1. Learning Velocity (courses completed per week) ----------------
      const completed = progress.filter((p) => p.status === 'completed' || p.completion_percentage >= 100);
      const weekMap = {};
      completed.forEach((p) => {
        const d = new Date(p.created_date);
        const label = `W${weekNumber(d)}`;
        weekMap[label] = (weekMap[label] || 0) + 1;
      });
      // Last 8 weeks
      const now = new Date();
      const weeklyData = Array.from({ length: 8 }, (_, i) => {
        const wd = new Date(now);
        wd.setDate(wd.getDate() - (7 - i) * 7);
        const label = `W${weekNumber(wd)}`;
        return { label, count: weekMap[label] || 0 };
      });

      // ---- 2. Skill Radar ---------------------------------------------------
      const sortedSkills = [...skillRows].sort(
        (a, b) => (b.proficiency_score || 0) - (a.proficiency_score || 0),
      );

      // ---- 3. Time Distribution — already have interactions -----------------

      // ---- 4. Course Effectiveness ------------------------------------------
      const courseEffectiveness = completed.map((p) => {
        const c = courseMap[p.course_id] || {};
        const courseResults = results.filter((r) => r.course_id === p.course_id);
        const bestScore = courseResults.length
          ? Math.max(...courseResults.map((r) => r.score || 0))
          : null;
        const courseSkills = skillRows.filter(
          (s) => s.course_id === p.course_id,
        );
        return {
          course_id: p.course_id,
          title: c.title || 'Untitled Course',
          score: bestScore,
          time_spent: p.time_spent_minutes || 0,
          skills_gained: courseSkills.length,
        };
      });

      // ---- 5. Engagement Score ----------------------------------------------
      const totalQuestions = interactions.filter(
        (i) => i.interaction_type === 'question_asked',
      ).length;
      const quizInteractions = interactions.filter(
        (i) => i.interaction_type === 'quiz_attempted',
      );
      const quizScoresRaw = quizInteractions.map((i) => {
        try {
          return JSON.parse(i.user_input)?.score ?? 0;
        } catch {
          return 0;
        }
      });
      const avgQuizScore = quizScoresRaw.length
        ? Math.round(quizScoresRaw.reduce((a, b) => a + b, 0) / quizScoresRaw.length)
        : 0;
      const totalMinutes = progress.reduce(
        (sum, p) => sum + (p.time_spent_minutes || 0),
        0,
      );

      const streakScore = clamp(Math.round((gamification.current_streak / 14) * 100), 0, 100);
      const questionScore = clamp(Math.round(Math.min(totalQuestions / 20, 1) * 100), 0, 100);
      const quizScore = avgQuizScore;
      const timeScore = clamp(Math.round(Math.min(totalMinutes / 300, 1) * 100), 0, 100);

      const engagementScore = Math.round(
        streakScore * 0.3 + questionScore * 0.2 + quizScore * 0.3 + timeScore * 0.2,
      );
      const engagementBreakdown = [
        { label: 'Streak', value: streakScore },
        { label: 'Questions', value: questionScore },
        { label: 'Quiz Scores', value: quizScore },
        { label: 'Time Spent', value: timeScore },
      ];

      // ---- 6. Knowledge Retention (quiz scores over time) -------------------
      const quizTimeline = resultRows
        .filter((r) => r.score != null && r.completed_at)
        .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
        .map((r) => ({
          score: r.score,
          date: new Date(r.completed_at).toLocaleDateString(),
        }));

      // ---- 7. Weakest Skills ------------------------------------------------
      // sortedSkills is highest first; weakest = end of array

      // ---- 8. Learning Streaks — active days --------------------------------
      const activeDays = new Set();
      interactions.forEach((ix) => {
        if (ix.created_date) {
          activeDays.add(new Date(ix.created_date).toISOString().slice(0, 10));
        }
      });
      progress.forEach((p) => {
        if (p.created_date) {
          activeDays.add(new Date(p.created_date).toISOString().slice(0, 10));
        }
      });

      // ---- 9. ROI Summary ---------------------------------------------------
      const roi = {
        totalTime: totalMinutes,
        skillsGained: skillRows.length,
        coursesCompleted: completed.length,
        certificates: certificateRows.length,
      };

      setData({
        weeklyData,
        sortedSkills,
        interactions,
        courseEffectiveness,
        engagementScore,
        engagementBreakdown,
        quizTimeline,
        activeDays,
        currentStreak: gamification.current_streak || 0,
        roi,
      });
    } catch (err) {
      console.error('[AdvancedAnalytics] Failed to load:', err);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  // ---------- Loading skeleton -----------------------------------------------
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`${lt(CARD_LIGHT, CARD)} p-5 animate-pulse`}
          >
            <div className={`h-3 ${lt('bg-zinc-200', 'bg-zinc-800')} rounded w-1/3 mb-4`} />
            <div className={`h-24 ${lt('bg-zinc-200', 'bg-zinc-800')} rounded`} />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  // ---------- Render ---------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center gap-2 mb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <BarChart3 className="w-5 h-5 text-teal-400" />
        <h2 className={`text-base font-semibold ${lt('text-zinc-800', 'text-zinc-100')}`}>
          Advanced Analytics
        </h2>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LearningVelocity weeklyData={data.weeklyData} lt={lt} />
        <SkillRadar skills={data.sortedSkills} lt={lt} />
        <TimeDistribution interactions={data.interactions} lt={lt} />
        <CourseEffectiveness courses={data.courseEffectiveness} lt={lt} />
        <EngagementScore
          score={data.engagementScore}
          breakdown={data.engagementBreakdown}
          lt={lt}
        />
        <KnowledgeRetention quizScores={data.quizTimeline} lt={lt} />
        <WeakestSkills skills={data.sortedSkills} lt={lt} />
        <LearningStreaks
          activeDays={data.activeDays}
          currentStreak={data.currentStreak}
          lt={lt}
        />
        <ROISummary roi={data.roi} lt={lt} />
      </div>
    </div>
  );
}
