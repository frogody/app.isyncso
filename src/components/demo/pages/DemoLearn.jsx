import {
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
  Clock,
  Flame,
  Award,
  CheckCircle2,
  Star,
  ChevronRight,
  BadgeCheck,
  BarChart3,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const learnStats = [
  { label: 'Courses', value: '24', icon: BookOpen },
  { label: 'Enrolled', value: '156', icon: Users },
  { label: 'Completion Rate', value: '89%', icon: Trophy },
  { label: 'Certifications', value: '12', icon: Award },
];

const difficultyStyles = {
  Beginner: 'bg-emerald-500/15 text-emerald-400',
  Intermediate: 'bg-amber-500/15 text-amber-400',
  Advanced: 'bg-red-500/15 text-red-400',
};

const courses = [
  {
    title: 'AI for Business Leaders',
    instructor: 'Dr. Sarah Chen',
    difficulty: 'Intermediate',
    progress: 72,
    duration: '8 hours',
    lessons: 24,
    currentChapter: 'Ch. 6: LLM Strategy',
  },
  {
    title: 'Advanced Data Analytics',
    instructor: 'Marcus Lee',
    difficulty: 'Advanced',
    progress: 45,
    duration: '12 hours',
    lessons: 36,
    currentChapter: 'Ch. 4: Statistical Models',
  },
  {
    title: 'Compliance Essentials',
    instructor: 'Nina Patel',
    difficulty: 'Beginner',
    progress: 91,
    duration: '4 hours',
    lessons: 12,
    currentChapter: 'Ch. 11: Final Review',
  },
];

const skillBars = [
  { name: 'Leadership', pct: 82, color: 'from-teal-600 to-teal-400' },
  { name: 'Data Analysis', pct: 68, color: 'from-teal-500 to-teal-300' },
  { name: 'Communication', pct: 91, color: 'from-teal-600 to-teal-400' },
  { name: 'Technical', pct: 74, color: 'from-teal-500 to-teal-300' },
  { name: 'Sales', pct: 55, color: 'from-teal-400 to-teal-200' },
  { name: 'Compliance', pct: 88, color: 'from-teal-600 to-teal-400' },
];

/* 7 columns x 4 rows heatmap - values 0-4 for intensity */
const heatmapData = [
  [2, 3, 1, 4, 2, 3, 1],
  [1, 4, 3, 2, 4, 1, 0],
  [3, 2, 4, 1, 3, 4, 2],
  [0, 1, 2, 3, 1, 2, 3],
];

const heatmapOpacity = ['opacity-10', 'opacity-25', 'opacity-40', 'opacity-60', 'opacity-90'];

const leaderboard = [
  { rank: 1, name: 'Jessica Martinez', xp: 12450, courses: 18, streak: 42, avatar: 'JM' },
  { rank: 2, name: 'Tom van der Berg', xp: 11200, courses: 16, streak: 38, avatar: 'TB' },
  { rank: 3, name: 'Aisha Rahman', xp: 9800, courses: 14, streak: 29, avatar: 'AR' },
  { rank: 4, name: 'Daniel Park', xp: 8400, courses: 12, streak: 21, avatar: 'DP' },
  { rank: 5, name: 'Laura Chen', xp: 7600, courses: 11, streak: 15, avatar: 'LC' },
];

const rankStyles = {
  1: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  2: 'text-zinc-300 bg-zinc-600/15 border-zinc-500/30',
  3: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
};

const certifications = [
  {
    name: 'AI Governance Professional',
    issuer: 'iSyncSO Academy',
    date: 'Jan 2026',
    verified: true,
  },
  {
    name: 'Data Privacy Specialist',
    issuer: 'EU Compliance Board',
    date: 'Dec 2025',
    verified: true,
  },
  {
    name: 'Leadership Excellence',
    issuer: 'iSyncSO Academy',
    date: 'Nov 2025',
    verified: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoLearn({ companyName = 'Acme Corp', recipientName = 'there' }) {
  /* SVG progress ring constants */
  const ringSize = 120;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const overallProgress = 72;
  const ringOffset = ringCircumference - (overallProgress / 100) * ringCircumference;

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* ---- Page Header ---- */}
      <div data-demo="learn-header" className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/20">
          <GraduationCap className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Learning & Development</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">
            Upskill your team at {companyName} with curated learning paths.
          </p>
        </div>
      </div>

      {/* ---- Progress Overview (hero) ---- */}
      <div
        data-demo="progress-overview"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6"
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Progress Ring */}
          <div className="relative flex-shrink-0">
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="rgba(63, 63, 70, 0.5)"
                strokeWidth={ringStroke}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="url(#tealGradient)"
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
              <defs>
                <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{overallProgress}%</span>
              <span className="text-[10px] text-zinc-500">Complete</span>
            </div>
          </div>

          {/* Hero stats */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Total Enrolled</p>
              <p className="text-xl font-bold text-white">8</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Completed</p>
              <p className="text-xl font-bold text-white">5</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Hours Learned</p>
              <p className="text-xl font-bold text-white">64h</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Current Streak</p>
              <p className="text-xl font-bold text-white flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" />
                14 days
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">XP Points</p>
              <p className="text-xl font-bold text-white">8,420</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Level</p>
              <p className="text-xl font-bold text-teal-400 flex items-center gap-1.5">
                <Star className="w-4 h-4" />
                Gold
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Stats Row ---- */}
      <div data-demo="learn-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {learnStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Active Courses ---- */}
      <div data-demo="courses">
        <h2 className="text-white font-semibold mb-4">Active Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.title}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-white font-semibold text-sm leading-snug pr-2">{course.title}</h3>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${difficultyStyles[course.difficulty]}`}
                >
                  {course.difficulty}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Progress</span>
                  <span
                    className={`text-xs font-medium ${
                      course.progress >= 90 ? 'text-emerald-400' : 'text-teal-400'
                    }`}
                  >
                    {course.progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      course.progress >= 90
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-teal-600 to-teal-400'
                    }`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>

              {/* Current chapter */}
              <div className="flex items-center gap-1.5 text-xs text-teal-400">
                <ChevronRight className="w-3 h-3" />
                <span>{course.currentChapter}</span>
              </div>

              {/* Meta info */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-800">
                <span>{course.instructor}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {course.lessons}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Skill Progress + Activity Heatmap ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Progress */}
        <div
          data-demo="skill-progress"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-5">Skill Progress</h2>
          <div className="space-y-4">
            {skillBars.map((skill) => (
              <div key={skill.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-400">{skill.name}</span>
                  <span className="text-xs font-mono text-teal-400">{skill.pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                    style={{ width: `${skill.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div
          data-demo="activity-heatmap"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Activity Heatmap</h2>
            <span className="text-xs text-zinc-500">Last 4 weeks</span>
          </div>
          <div className="flex items-center justify-between mb-2 px-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="text-[10px] text-zinc-600 w-8 text-center">
                {day}
              </span>
            ))}
          </div>
          <div className="space-y-1.5">
            {heatmapData.map((week, wIdx) => (
              <div key={wIdx} className="flex items-center justify-between px-1 gap-1.5">
                {week.map((intensity, dIdx) => (
                  <div
                    key={dIdx}
                    className={`w-8 h-8 rounded-lg bg-teal-400 ${heatmapOpacity[intensity]}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-3">
            <span className="text-[10px] text-zinc-600">Less</span>
            {heatmapOpacity.map((op, idx) => (
              <div key={idx} className={`w-3 h-3 rounded-sm bg-teal-400 ${op}`} />
            ))}
            <span className="text-[10px] text-zinc-600">More</span>
          </div>
        </div>
      </div>

      {/* ---- Leaderboard + Certifications ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div
          data-demo="leaderboard"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Leaderboard</h2>
            <span className="text-xs text-teal-400 cursor-default">View full ranking</span>
          </div>
          <div className="space-y-2">
            {leaderboard.map((member) => {
              const medalStyle = rankStyles[member.rank] || '';
              return (
                <div
                  key={member.rank}
                  className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40"
                >
                  {/* Rank */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                      medalStyle || 'text-zinc-400 bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    #{member.rank}
                  </div>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                    {member.avatar}
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{member.name}</p>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-bold text-teal-400">{member.xp.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500">XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{member.courses}</p>
                      <p className="text-[10px] text-zinc-500">Courses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {member.streak}
                      </p>
                      <p className="text-[10px] text-zinc-500">Streak</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Certifications Earned */}
        <div
          data-demo="certifications"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Certifications Earned</h2>
          <div className="space-y-3">
            {certifications.map((cert) => (
              <div
                key={cert.name}
                className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400 flex-shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium leading-snug">{cert.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{cert.issuer}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pl-11">
                  <span className="text-xs text-zinc-500">{cert.date}</span>
                  {cert.verified && (
                    <span className="flex items-center gap-1 text-[11px] text-teal-400">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
