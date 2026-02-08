import {
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
  Clock,
  Star,
} from 'lucide-react';

const learnStats = [
  { label: 'Courses', value: '24', icon: BookOpen, color: 'cyan' },
  { label: 'Enrolled', value: '156', icon: Users, color: 'emerald' },
  { label: 'Completion Rate', value: '89%', icon: Trophy, color: 'amber' },
  { label: 'Certifications', value: '12', icon: Star, color: 'violet' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
  violet: 'bg-violet-500/15 text-violet-400',
};

const difficultyStyles = {
  Beginner: 'bg-emerald-500/15 text-emerald-400',
  Intermediate: 'bg-amber-500/15 text-amber-400',
  Advanced: 'bg-red-500/15 text-red-400',
};

const courses = [
  {
    title: 'AI for Business Leaders',
    progress: 75,
    instructor: 'Dr. Sarah Chen',
    duration: '8 hours',
    difficulty: 'Intermediate',
  },
  {
    title: 'Sales Mastery 2026',
    progress: 100,
    instructor: 'James Mitchell',
    duration: '12 hours',
    difficulty: 'Advanced',
  },
  {
    title: 'Compliance Essentials',
    progress: 45,
    instructor: 'Nina Patel',
    duration: '4 hours',
    difficulty: 'Beginner',
  },
  {
    title: 'Product Management',
    progress: 20,
    instructor: 'Marcus Lee',
    duration: '10 hours',
    difficulty: 'Intermediate',
  },
];

export default function DemoLearn({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <GraduationCap className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Learning & Development</h1>
          <p className="text-zinc-400 mt-0.5">
            Upskill your team at {companyName}.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div data-demo="learn-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {learnStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${iconBgMap[stat.color]}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Course Grid */}
      <div data-demo="courses" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div
            key={course.title}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-white font-semibold text-sm">{course.title}</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full ${difficultyStyles[course.difficulty]}`}>
                {course.difficulty}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Progress</span>
                <span className={`text-xs font-medium ${course.progress === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {course.progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${course.progress === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{course.instructor}</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {course.duration}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
