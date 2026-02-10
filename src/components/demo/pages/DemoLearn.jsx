import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Play,
  Trophy,
  Award,
  Flame,
  Clock,
  ArrowRight,
  Target,
  Calendar,
  ChevronRight,
  Star,
  Lock,
  Share2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const continueLearningCourses = [
  {
    id: 1,
    title: 'AI for Business Leaders',
    progress: 72,
    duration: '8h',
    category: 'AI & Strategy',
  },
  {
    id: 2,
    title: 'Advanced Data Analytics',
    progress: 45,
    duration: '12h',
    category: 'Data Science',
  },
  {
    id: 3,
    title: 'Compliance Essentials 2026',
    progress: 91,
    duration: '4h',
    category: 'Compliance',
  },
];

const recommendedCourses = [
  {
    id: 10,
    title: 'Machine Learning Fundamentals',
    description: 'Learn the core concepts of ML and how to apply them in business contexts.',
    duration: '10h',
    category: 'AI & ML',
    difficulty: 'intermediate',
    rating: 4.8,
  },
  {
    id: 11,
    title: 'Leadership in Tech',
    description: 'Develop leadership skills for technical teams and cross-functional environments.',
    duration: '6h',
    category: 'Leadership',
    difficulty: 'beginner',
    rating: 4.6,
  },
  {
    id: 12,
    title: 'Financial Modeling',
    description: 'Build robust financial models for SaaS and enterprise business planning.',
    duration: '8h',
    category: 'Finance',
    difficulty: 'advanced',
    rating: 4.9,
  },
  {
    id: 13,
    title: 'Design Thinking',
    description: 'Apply human-centered design principles to product development.',
    duration: '5h',
    category: 'Product',
    difficulty: 'beginner',
    rating: 4.5,
  },
  {
    id: 14,
    title: 'Cloud Architecture',
    description: 'Master cloud infrastructure patterns for scalable applications.',
    duration: '14h',
    category: 'Engineering',
    difficulty: 'advanced',
    rating: 4.7,
  },
  {
    id: 15,
    title: 'Negotiation Skills',
    description: 'Learn proven negotiation frameworks for business deals and partnerships.',
    duration: '4h',
    category: 'Sales',
    difficulty: 'intermediate',
    rating: 4.4,
  },
];

const skills = [
  { name: 'Leadership', progress: 82 },
  { name: 'Data Analysis', progress: 68 },
  { name: 'Communication', progress: 91 },
  { name: 'Technical', progress: 74 },
  { name: 'Compliance', progress: 55 },
];

const badges = [
  { name: 'First Steps', type: 'first_lesson', tier: 'bronze', earned: true },
  { name: 'Course Champion', type: 'first_course', tier: 'silver', earned: true },
  { name: 'Week Warrior', type: 'streak_7', tier: 'bronze', earned: true },
  { name: 'Perfect Score', type: 'perfect_score', tier: 'silver', earned: true },
];

const lockedBadges = [
  { name: 'Monthly Master', type: 'streak_30', tier: 'gold', earned: false },
  { name: 'Skill Master', type: 'skill_master', tier: 'gold', earned: false },
  { name: 'Time Investor', type: 'time_invested', tier: 'silver', earned: false },
];

/* 7 columns (weeks) x 7 rows (days) heatmap - values 0-4 for intensity */
const heatmapGrid = [
  [2, 0, 3, 1, 4, 2, 1],
  [1, 4, 2, 3, 0, 1, 3],
  [3, 2, 4, 1, 3, 4, 2],
  [0, 1, 2, 3, 1, 2, 0],
  [4, 3, 1, 0, 2, 3, 4],
  [1, 2, 0, 4, 3, 1, 2],
  [3, 0, 2, 1, 4, 2, 3],
];

const heatmapColors = [
  'bg-zinc-800/60',
  'bg-teal-950/50',
  'bg-teal-900/50',
  'bg-teal-800/60',
  'bg-teal-700/70',
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BADGE_ICONS = {
  first_lesson: BookOpen,
  first_course: Trophy,
  streak_7: Flame,
  streak_30: Flame,
  perfect_score: Star,
  skill_master: Target,
  time_invested: Clock,
  default: Award,
};

const BADGE_COLORS = {
  bronze: 'from-zinc-700 to-zinc-800 border-zinc-600/50',
  silver: 'from-zinc-600 to-zinc-700 border-zinc-500/50',
  gold: 'from-zinc-500 to-zinc-600 border-zinc-400/50',
  default: 'from-zinc-700 to-zinc-800 border-zinc-600/50',
};

const LEVEL_THRESHOLDS = [
  { level: 1, min: 0, label: 'Novice' },
  { level: 2, min: 20, label: 'Beginner' },
  { level: 3, min: 40, label: 'Intermediate' },
  { level: 4, min: 60, label: 'Advanced' },
  { level: 5, min: 80, label: 'Expert' },
];

const difficultyColors = {
  beginner: 'bg-zinc-800/80 text-teal-400/70',
  intermediate: 'bg-zinc-800/80 text-teal-300/70',
  advanced: 'bg-zinc-800/80 text-teal-200/70',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoLearn({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [hoveredBadge, setHoveredBadge] = useState(null);

  const overallProgress = 62;
  const totalXP = 8420;
  const level = 4;
  const streak = 14;
  const xpInLevel = totalXP % 1000;

  /* Progress ring constants */
  const ringSize = 120;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (overallProgress / 100) * ringCircumference;

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-teal-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* ---- Header (PageHeader replica) ---- */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Learning Dashboard</h1>
            </div>
            <p className="text-xs text-zinc-400">
              Welcome back, {recipientName}! Keep up the momentum.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="cursor-default bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 h-8 text-xs px-3 rounded-md font-medium flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              Browse Courses
            </button>
          </div>
        </div>

        {/* ---- Stats Row ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Play, label: 'In Progress', value: 3, sublabel: 'Active courses', delay: 0 },
            { icon: Trophy, label: 'Completed', value: 5, sublabel: 'Courses finished', delay: 0.1 },
            { icon: Award, label: 'Certificates', value: 3, sublabel: 'Earned', delay: 0.2 },
            { icon: Flame, label: 'Day Streak', value: streak, sublabel: 'Keep it going!', delay: 0.3 },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              className="relative bg-zinc-900/50 border border-zinc-800/60 backdrop-blur-sm rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs">{stat.label}</p>
                  <p className="text-lg font-bold text-zinc-100 mt-0.5">{stat.value}</p>
                  <p className="text-[10px] text-teal-400/70 mt-0.5">{stat.sublabel}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-teal-400/70" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ---- Main Content Grid ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Continue Learning - GlassCard with teal glow */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-colors duration-300 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-teal-400" />
                  Continue Learning
                </h3>
                <span className="cursor-default text-teal-400 text-xs flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              <div className="space-y-2">
                {continueLearningCourses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="group relative bg-zinc-900/50 border border-zinc-800/60 backdrop-blur-sm rounded-xl hover:border-teal-800/50 transition-all duration-200 p-3">
                      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-teal-600/40" />

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-teal-400/70" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-zinc-100 text-sm truncate group-hover:text-teal-300/90 transition-colors">
                            {course.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-teal-500"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-teal-400/80">
                              {course.progress}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {course.duration} total
                            </span>
                            <span className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/50 text-[9px] px-1 py-0 rounded">
                              {course.category}
                            </span>
                          </div>
                        </div>

                        <button className="cursor-default bg-zinc-800/80 hover:bg-zinc-800 text-teal-400/80 border border-zinc-700/60 flex-shrink-0 text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1">
                          Continue <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Activity Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-colors duration-300 rounded-xl p-4"
            >
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-teal-400" />
                Weekly Activity
              </h3>

              <div className="space-y-2">
                {/* Week headers */}
                <div className="flex gap-1">
                  <div className="w-8" />
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex-1 text-center text-xs text-zinc-500">
                      W{i + 1}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid */}
                {days.map((day, dayIndex) => (
                  <div key={day} className="flex gap-1 items-center">
                    <div className="w-8 text-xs text-zinc-500">{day}</div>
                    {heatmapGrid[dayIndex].map((intensity, weekIndex) => (
                      <motion.div
                        key={weekIndex}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                        className={`flex-1 aspect-square rounded-sm cursor-default ${heatmapColors[intensity]}`}
                      />
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-between mt-3">
                  <span className="cursor-default text-xs text-teal-400/70 flex items-center gap-1">
                    View All Activity <ArrowRight className="w-3 h-3" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">Less</span>
                    {heatmapColors.map((c, i) => (
                      <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                    ))}
                    <span className="text-xs text-zinc-600">More</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Skill Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-colors duration-300 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-400" />
                  Skill Progress
                </h3>
                <span className="cursor-default text-teal-400 text-xs flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              <div className="space-y-4">
                {skills.map((skill, i) => {
                  const currentLevel = LEVEL_THRESHOLDS.filter(
                    (l) => skill.progress >= l.min
                  ).pop();

                  return (
                    <div key={skill.name} className="space-y-2 p-2 -m-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{skill.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            Lv.{currentLevel?.level} {currentLevel?.label}
                          </span>
                        </div>
                        <span className="text-sm text-zinc-400">{skill.progress}%</span>
                      </div>

                      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                        {LEVEL_THRESHOLDS.slice(1).map((level) => (
                          <div
                            key={level.level}
                            className="absolute top-0 bottom-0 w-px bg-zinc-700"
                            style={{ left: `${level.min}%` }}
                          />
                        ))}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.progress}%` }}
                          transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-4">
            {/* Overall Progress Ring */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-colors duration-300 rounded-xl p-4"
            >
              <h3 className="text-sm font-semibold text-white text-center mb-4">
                Overall Progress
              </h3>
              <div className="flex justify-center mb-4">
                <div className="relative" style={{ width: ringSize, height: ringSize }}>
                  <svg
                    className="transform -rotate-90"
                    width={ringSize}
                    height={ringSize}
                  >
                    <circle
                      className="stroke-zinc-800"
                      strokeWidth={ringStroke}
                      fill="none"
                      r={ringRadius}
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                    />
                    <motion.circle
                      className="stroke-teal-500"
                      strokeWidth={ringStroke}
                      strokeLinecap="round"
                      fill="none"
                      r={ringRadius}
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      initial={{ strokeDashoffset: ringCircumference }}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ strokeDasharray: ringCircumference }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{overallProgress}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="cursor-default rounded-lg p-2 transition-colors">
                  <div className="text-lg font-bold text-white">64h</div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    Time Invested
                  </div>
                </div>
                <div className="cursor-default rounded-lg p-2 transition-colors">
                  <div className="text-lg font-bold text-teal-400">
                    {totalXP.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                    Total XP
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Level & Streak */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-colors duration-300 rounded-xl p-4"
            >
              {/* Level display */}
              <div className="flex items-center justify-between mb-3 cursor-default rounded-lg p-2 -m-2 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/30">
                    {level}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Level {level}</div>
                    <div className="text-[10px] text-zinc-400">Advanced Learner</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </div>

              {/* XP Progress bar */}
              <div className="mb-3 mt-3">
                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                  <span>Progress to Level {level + 1}</span>
                  <span className="text-teal-400">{xpInLevel} / 1000 XP</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpInLevel / 10}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-teal-500"
                  />
                </div>
              </div>

              {/* Streak display */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-teal-500/10 to-teal-400/10 border border-teal-500/20 cursor-default">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-teal-400" />
                  <div>
                    <div className="text-white font-semibold text-sm">
                      {streak} Day Streak!
                    </div>
                    <div className="text-[10px] text-zinc-400">Keep it going</div>
                  </div>
                </div>
                <button className="cursor-default text-teal-400 hover:bg-teal-500/20 h-7 w-7 p-0 flex items-center justify-center rounded-md">
                  <Share2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>

            {/* Achievements / Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-teal-500/40 transition-colors duration-300 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-teal-400" />
                  Achievements
                </h3>
                <span className="cursor-default text-teal-400 text-xs">View All</span>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Earned badges */}
                {badges.map((badge, i) => {
                  const Icon = BADGE_ICONS[badge.type] || BADGE_ICONS.default;
                  const colorClass = BADGE_COLORS[badge.tier] || BADGE_COLORS.default;

                  return (
                    <motion.div
                      key={badge.type}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.1, type: 'spring' }}
                      className="group relative cursor-default"
                      onMouseEnter={() => setHoveredBadge(badge.name)}
                      onMouseLeave={() => setHoveredBadge(null)}
                    >
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br border-2 flex items-center justify-center shadow-lg transition-transform ${colorClass}`}
                      >
                        <Icon className="w-7 h-7 text-white drop-shadow-lg" />
                      </div>

                      {/* Tooltip */}
                      {hoveredBadge === badge.name && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg whitespace-nowrap z-10">
                          <div className="text-sm font-medium text-white">{badge.name}</div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Locked badges */}
                {lockedBadges.map((badge, i) => (
                  <motion.div
                    key={`locked-${badge.type}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (badges.length + i) * 0.1 }}
                    className="group relative cursor-default"
                    onMouseEnter={() => setHoveredBadge(badge.name)}
                    onMouseLeave={() => setHoveredBadge(null)}
                  >
                    <div className="w-14 h-14 rounded-full bg-zinc-800/50 border-2 border-zinc-700/50 flex items-center justify-center transition-transform opacity-50">
                      <Lock className="w-7 h-7 text-zinc-500" />
                    </div>

                    {hoveredBadge === badge.name && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg whitespace-nowrap z-10">
                        <div className="text-sm font-medium text-zinc-400">{badge.name}</div>
                        <div className="text-xs text-zinc-500">Locked</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ---- Recommended Courses (CourseCarousel replica) ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-zinc-100">Recommended for You</h3>
            <div className="flex gap-2">
              <button className="cursor-default p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-500 transition-colors">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button className="cursor-default p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-500 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2">
            {recommendedCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex-shrink-0 w-[300px]"
              >
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-teal-800/50 transition-all group cursor-default">
                  {/* Thumbnail placeholder */}
                  <div className="h-40 bg-zinc-800/50 relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-zinc-700" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border border-zinc-700/50 ${
                          difficultyColors[course.difficulty]
                        }`}
                      >
                        {course.difficulty}
                      </span>
                      {course.rating && (
                        <span className="flex items-center gap-1 text-teal-400/70 text-sm">
                          <Star className="w-4 h-4 fill-teal-400/70" />
                          {course.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h4 className="font-semibold text-zinc-100 mb-2 line-clamp-2 group-hover:text-teal-300/90 transition-colors">
                      {course.title}
                    </h4>
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                      </span>
                      <span className="px-2 py-1 rounded border bg-zinc-800/80 text-teal-400/70 border-zinc-700/50">
                        {course.category}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
