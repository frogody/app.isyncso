import {
  BookOpen,
  GraduationCap,
  Users,
  Star,
  Clock,
  BarChart3,
  Award,
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Settings,
  FileText,
  Layers,
  Target,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Shield,
  Eye,
  Pen,
  Cpu,
  Sparkles,
  MessageSquare,
  Bot,
  Zap,
  Trophy,
  Flame,
  Crown,
  Medal,
  Brain,
  ListChecks,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const difficultyStyles = {
  Beginner: 'bg-emerald-500/15 text-emerald-400',
  Intermediate: 'bg-amber-500/15 text-amber-400',
  Advanced: 'bg-red-500/15 text-red-400',
};

const certStatusStyle = (status) => {
  const map = {
    Valid: 'bg-emerald-500/15 text-emerald-400',
    Expiring: 'bg-amber-500/15 text-amber-400',
    Expired: 'bg-red-500/15 text-red-400',
  };
  return map[status] || 'bg-zinc-700/50 text-zinc-400';
};

const publishingStyle = (status) => {
  const map = {
    Draft: 'bg-zinc-700/50 text-zinc-400',
    Review: 'bg-amber-500/15 text-amber-400',
    Published: 'bg-emerald-500/15 text-emerald-400',
  };
  return map[status] || 'bg-zinc-700/50 text-zinc-400';
};

/* ================================================================== */
/*  1. DemoLearnCourses                                               */
/* ================================================================== */

export function DemoLearnCourses({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const categories = ['All', 'Leadership', 'Technical', 'Business', 'Compliance'];

  const courses = [
    { title: 'Leadership Fundamentals', instructor: 'Dr. Sarah Chen', difficulty: 'Beginner', duration: '6 hours', rating: 4.8, enrolled: 234, progress: 72, category: 'Leadership' },
    { title: 'Data Analytics 101', instructor: 'Marcus Lee', difficulty: 'Intermediate', duration: '10 hours', rating: 4.6, enrolled: 189, progress: 45, category: 'Technical' },
    { title: 'AI for Business', instructor: 'Nina Patel', difficulty: 'Advanced', duration: '12 hours', rating: 4.9, enrolled: 312, progress: null, category: 'Technical' },
    { title: 'Sales Mastery', instructor: 'Tom Richards', difficulty: 'Intermediate', duration: '8 hours', rating: 4.5, enrolled: 156, progress: 91, category: 'Business' },
    { title: 'Project Management', instructor: 'Laura Kim', difficulty: 'Beginner', duration: '5 hours', rating: 4.7, enrolled: 278, progress: null, category: 'Business' },
    { title: 'Cybersecurity Basics', instructor: 'Alex Morgan', difficulty: 'Beginner', duration: '4 hours', rating: 4.4, enrolled: 145, progress: 30, category: 'Compliance' },
    { title: 'Design Thinking', instructor: 'Priya Shah', difficulty: 'Intermediate', duration: '7 hours', rating: 4.6, enrolled: 98, progress: null, category: 'Business' },
    { title: 'Financial Literacy', instructor: 'David Park', difficulty: 'Beginner', duration: '3 hours', rating: 4.3, enrolled: 201, progress: null, category: 'Business' },
    { title: 'Communication Skills', instructor: 'Jessica Martinez', difficulty: 'Beginner', duration: '4 hours', rating: 4.8, enrolled: 267, progress: 65, category: 'Leadership' },
  ];

  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.3;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < full ? 'text-amber-400 fill-amber-400' : hasHalf && i === full ? 'text-amber-400 fill-amber-400/50' : 'text-zinc-700'
            }`}
          />
        ))}
        <span className="text-[10px] text-zinc-500 ml-1">{rating}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20">
            <BookOpen className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Course Catalog</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Explore courses available for {companyName} team.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
          <Search className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">Search courses...</span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`text-xs px-3.5 py-1.5 rounded-full cursor-default transition-colors ${
              i === 0 ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div data-demo="course-catalog" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <div key={course.title} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Thumbnail placeholder */}
            <div className="h-32 bg-gradient-to-br from-teal-900/30 to-zinc-900 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-teal-500/30" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-white font-semibold text-sm leading-snug pr-2">{course.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${difficultyStyles[course.difficulty]}`}>
                  {course.difficulty}
                </span>
              </div>

              <p className="text-xs text-zinc-500">{course.instructor}</p>

              {renderStars(course.rating)}

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {course.enrolled}
                </div>
              </div>

              {/* Progress bar (if enrolled) */}
              {course.progress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Progress</span>
                    <span className={`text-[10px] font-medium ${course.progress >= 90 ? 'text-emerald-400' : 'text-teal-400'}`}>
                      {course.progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${course.progress >= 90 ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-600 to-teal-400'}`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  2. DemoLearnSkills                                                */
/* ================================================================== */

export function DemoLearnSkills({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const skillMatrix = [
    { name: 'Leadership', pct: 72, color: 'from-teal-600 to-teal-400' },
    { name: 'Technical', pct: 85, color: 'from-teal-500 to-teal-300' },
    { name: 'Communication', pct: 68, color: 'from-teal-600 to-teal-400' },
    { name: 'Analytics', pct: 79, color: 'from-teal-500 to-teal-300' },
    { name: 'Compliance', pct: 91, color: 'from-teal-600 to-teal-400' },
    { name: 'Creativity', pct: 63, color: 'from-teal-400 to-teal-200' },
  ];

  const teamMembers = [
    { name: 'Jessica Martinez', role: 'Team Lead', topSkills: ['Leadership', 'Communication'], certs: 3, hours: 64, growth: '+12%' },
    { name: 'Tom van der Berg', role: 'Senior Engineer', topSkills: ['Technical', 'Analytics'], certs: 5, hours: 82, growth: '+8%' },
    { name: 'Aisha Rahman', role: 'Product Manager', topSkills: ['Analytics', 'Leadership'], certs: 2, hours: 45, growth: '+15%' },
    { name: 'Daniel Park', role: 'Designer', topSkills: ['Creativity', 'Communication'], certs: 1, hours: 38, growth: '+22%' },
    { name: 'Laura Chen', role: 'Data Analyst', topSkills: ['Analytics', 'Technical'], certs: 4, hours: 71, growth: '+10%' },
    { name: 'Marcus Lee', role: 'Compliance Officer', topSkills: ['Compliance', 'Leadership'], certs: 6, hours: 56, growth: '+5%' },
  ];

  const skillGaps = [
    { gap: 'AI & Machine Learning', severity: 'High', recommended: 'AI for Business' },
    { gap: 'Data Privacy (GDPR)', severity: 'Medium', recommended: 'Data Privacy Professional' },
    { gap: 'Public Speaking', severity: 'Low', recommended: 'Communication Skills' },
  ];

  const gapColor = (sev) => {
    if (sev === 'High') return 'text-red-400 bg-red-500/15';
    if (sev === 'Medium') return 'text-amber-400 bg-amber-500/15';
    return 'text-teal-400 bg-teal-500/15';
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/20">
          <BarChart3 className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Skills Tracking</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">Monitor skill development across {companyName}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Matrix (bars) */}
        <div data-demo="skills-matrix" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-5">Skill Matrix</h2>
          <div className="space-y-4">
            {skillMatrix.map((skill) => (
              <div key={skill.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-400">{skill.name}</span>
                  <span className="text-xs font-mono text-teal-400">{skill.pct}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                    style={{ width: `${skill.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Gap Analysis */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-5">Skill Gap Analysis</h2>
          <div className="space-y-3">
            {skillGaps.map((gap) => (
              <div key={gap.gap} className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm text-white font-medium">{gap.gap}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${gapColor(gap.severity)}`}>
                    {gap.severity}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-teal-400">
                  <ChevronRight className="w-3 h-3" />
                  <span>Recommended: {gap.recommended}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Skills Breakdown */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Team Skills Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Team Member</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Top Skills</th>
                <th className="px-4 py-3 font-medium text-center">Certifications</th>
                <th className="px-4 py-3 font-medium text-center">Learning Hours</th>
                <th className="px-4 py-3 font-medium text-center">Skill Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {teamMembers.map((m) => (
                <tr key={m.name} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-300">
                        {m.name.split(' ').map((w) => w[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-white">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-400">{m.role}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      {m.topSkills.map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-bold text-white">{m.certs}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm text-zinc-300">{m.hours}h</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs text-emerald-400 flex items-center justify-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" /> {m.growth}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  3. DemoLearnBuilder                                               */
/* ================================================================== */

export function DemoLearnBuilder({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const modules = [
    { title: 'Introduction to the Course', lessons: 3, quizzes: 1, assignments: 0 },
    { title: 'Core Concepts', lessons: 5, quizzes: 2, assignments: 1 },
    { title: 'Intermediate Techniques', lessons: 4, quizzes: 1, assignments: 1 },
    { title: 'Advanced Applications', lessons: 6, quizzes: 2, assignments: 2 },
    { title: 'Case Studies', lessons: 3, quizzes: 0, assignments: 1 },
    { title: 'Final Assessment', lessons: 1, quizzes: 1, assignments: 1 },
  ];

  const publishingSteps = [
    { label: 'Draft', status: 'complete' },
    { label: 'Review', status: 'current' },
    { label: 'Published', status: 'upcoming' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20">
            <Pen className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Course Builder</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Create and manage learning content.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 text-sm border border-zinc-800 cursor-default">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors cursor-default">
            <CheckCircle2 className="w-4 h-4" /> Submit for Review
          </button>
        </div>
      </div>

      {/* Publishing Pipeline */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          {publishingSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                step.status === 'complete' ? 'bg-teal-500/20 border-teal-500/50 text-teal-400' :
                step.status === 'current' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}>
                {step.status === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${
                step.status === 'complete' ? 'text-teal-400' :
                step.status === 'current' ? 'text-amber-400' :
                'text-zinc-500'
              }`}>
                {step.label}
              </span>
              {i < publishingSteps.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${
                  step.status === 'complete' ? 'bg-teal-500/30' : 'bg-zinc-800'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Builder Interface */}
      <div data-demo="course-builder" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Module outline */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Modules</h2>
            <button className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400 cursor-default">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {modules.map((mod, i) => (
              <div
                key={mod.title}
                className={`p-3 rounded-xl border transition-colors cursor-default ${
                  i === 1 ? 'bg-teal-500/10 border-teal-500/30' : 'bg-zinc-800/30 border-zinc-700/40 hover:bg-zinc-800/50'
                }`}
              >
                <p className={`text-xs font-medium ${i === 1 ? 'text-teal-400' : 'text-white'}`}>
                  {i + 1}. {mod.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
                  <span>{mod.lessons} lessons</span>
                  <span>{mod.quizzes} quizzes</span>
                  <span>{mod.assignments} tasks</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Lesson editor */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Lesson Editor</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Editing</span>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value="Understanding Core Principles"
              readOnly
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white cursor-default"
            />
            {/* Rich text preview area */}
            <div className="bg-zinc-800/30 border border-zinc-700/40 rounded-xl p-4 min-h-[280px] space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-700/40">
                <div className="flex items-center gap-1">
                  {['B', 'I', 'U'].map((btn) => (
                    <button key={btn} className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold cursor-default hover:bg-zinc-700/50">
                      {btn}
                    </button>
                  ))}
                </div>
                <div className="w-px h-5 bg-zinc-700" />
                <div className="flex items-center gap-1">
                  {['H1', 'H2', 'P'].map((btn) => (
                    <button key={btn} className="px-2 h-7 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] cursor-default hover:bg-zinc-700/50">
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
              <h3 className="text-white font-semibold text-sm">Core Principles Overview</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                In this lesson, we explore the fundamental principles that form the backbone of this discipline.
                Understanding these concepts is crucial before moving on to more advanced topics.
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Key takeaways include the ability to identify patterns, apply frameworks systematically,
                and develop critical thinking around complex scenarios.
              </p>
              <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20">
                <p className="text-[10px] text-teal-400 font-medium mb-1">Learning Objective</p>
                <p className="text-xs text-zinc-300">Students will be able to identify and apply three core frameworks to real-world scenarios.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Settings panel */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" /> Course Settings
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Title</label>
              <div className="mt-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                AI for Business Leaders
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Description</label>
              <div className="mt-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-400 leading-relaxed">
                A comprehensive guide to leveraging AI in business strategy and operations.
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Difficulty</label>
              <div className="mt-1">
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">Intermediate</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Duration</label>
              <div className="mt-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                12 hours
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Prerequisites</label>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">Data Analytics 101</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">Leadership Fund.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  4. DemoLearnCertifications                                        */
/* ================================================================== */

export function DemoLearnCertifications({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const certifications = [
    { name: 'ISO 27001 Awareness', issuer: 'ISO Certification Body', earned: 'Mar 2025', expiry: 'Mar 2026', status: 'Valid', verified: true },
    { name: 'Data Privacy Professional', issuer: 'EU Compliance Board', earned: 'Jun 2025', expiry: 'Jun 2026', status: 'Valid', verified: true },
    { name: 'Agile Scrum Master', issuer: 'Scrum Alliance', earned: 'Jan 2025', expiry: 'Jan 2027', status: 'Valid', verified: true },
    { name: 'EU AI Act Compliance', issuer: 'iSyncSO Academy', earned: 'Sep 2025', expiry: 'Feb 2026', status: 'Expiring', verified: true },
    { name: 'Cloud Security Associate', issuer: 'AWS', earned: 'Nov 2024', expiry: 'Nov 2025', status: 'Expired', verified: false },
    { name: 'Leadership Excellence', issuer: 'iSyncSO Academy', earned: 'Dec 2025', expiry: 'Dec 2027', status: 'Valid', verified: true },
  ];

  const upcomingExams = [
    { name: 'Advanced Data Protection', date: 'Feb 18, 2026', registeredBy: 'Jessica Martinez' },
    { name: 'Cloud Security Renewal', date: 'Mar 5, 2026', registeredBy: 'Tom van der Berg' },
  ];

  const validCount = certifications.filter((c) => c.status === 'Valid').length;
  const totalCount = certifications.length;
  const coverage = Math.round((validCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/20">
          <Award className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Certifications</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">Track team certifications and compliance at {companyName}.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{totalCount}</p>
            <p className="text-xs text-zinc-500">Total Certifications</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{upcomingExams.length}</p>
            <p className="text-xs text-zinc-500">Upcoming Exams</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{coverage}%</p>
            <p className="text-xs text-zinc-500">Team Compliant</p>
          </div>
        </div>
      </div>

      {/* Certification Cards */}
      <div data-demo="certifications-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certifications.map((cert) => (
          <div key={cert.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400 flex-shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm leading-snug">{cert.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{cert.issuer}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${certStatusStyle(cert.status)}`}>
                {cert.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-zinc-500">Earned</p>
                <p className="text-white mt-0.5">{cert.earned}</p>
              </div>
              <div>
                <p className="text-zinc-500">Expires</p>
                <p className={`mt-0.5 ${cert.status === 'Expired' ? 'text-red-400' : cert.status === 'Expiring' ? 'text-amber-400' : 'text-white'}`}>
                  {cert.expiry}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              {cert.verified ? (
                <span className="flex items-center gap-1 text-[11px] text-teal-400">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <AlertTriangle className="w-3.5 h-3.5" /> Unverified
                </span>
              )}
              <button className="text-[11px] text-teal-400 cursor-default hover:underline">View Credential</button>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming Exams */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Upcoming Exams</h2>
        <div className="space-y-3">
          {upcomingExams.map((exam) => (
            <div key={exam.name} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
              <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{exam.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Registered by {exam.registeredBy}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-teal-400">{exam.date}</p>
                <p className="text-[10px] text-zinc-500">Scheduled</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  5. DemoLearnAITools                                                */
/* ================================================================== */

export function DemoLearnAITools({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const aiTools = [
    {
      name: 'AI Tutor',
      icon: Bot,
      description: 'Personalized 1-on-1 tutoring powered by AI. Ask questions, get explanations, and practice concepts in real-time.',
      usageCount: 1284,
      activeUsers: 89,
      satisfaction: 94,
    },
    {
      name: 'Quiz Generator',
      icon: ListChecks,
      description: 'Automatically generate quizzes from any course content. Supports multiple choice, true/false, and open-ended questions.',
      usageCount: 856,
      activeUsers: 67,
      satisfaction: 88,
    },
    {
      name: 'Content Summarizer',
      icon: FileText,
      description: 'Condense long articles, videos, and course materials into concise summaries with key takeaways highlighted.',
      usageCount: 2140,
      activeUsers: 124,
      satisfaction: 91,
    },
    {
      name: 'Skill Assessor',
      icon: Brain,
      description: 'AI-driven skill assessment that evaluates proficiency levels and identifies specific knowledge gaps to address.',
      usageCount: 542,
      activeUsers: 45,
      satisfaction: 86,
    },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/20">
          <Cpu className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Learning Tools</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">AI-powered tools to enhance learning at {companyName}.</p>
        </div>
      </div>

      {/* Stats Pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800">
          <span className="text-sm font-bold text-white">4</span>
          <span className="text-xs text-zinc-500">AI Tools</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800">
          <span className="text-sm font-bold text-white">4,822</span>
          <span className="text-xs text-zinc-500">Total Uses</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800">
          <span className="text-sm font-bold text-teal-400">90%</span>
          <span className="text-xs text-zinc-500">Avg Satisfaction</span>
        </div>
      </div>

      {/* AI Tool Cards */}
      <div data-demo="ai-tools" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiTools.map((tool) => (
          <div key={tool.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-teal-500/15 text-teal-400 shrink-0">
                <tool.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{tool.name}</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{tool.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <p className="text-sm font-bold text-white">{tool.usageCount.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">Total Uses</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <p className="text-sm font-bold text-white">{tool.activeUsers}</p>
                <p className="text-[10px] text-zinc-500">Active Users</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <p className="text-sm font-bold text-teal-400">{tool.satisfaction}%</p>
                <p className="text-[10px] text-zinc-500">Satisfaction</p>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-500/15 text-teal-400 text-xs font-medium border border-teal-500/20 cursor-default hover:bg-teal-500/25 transition-colors">
              <Zap className="w-3.5 h-3.5" /> Try {tool.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  6. DemoLearnAssistant                                              */
/* ================================================================== */

export function DemoLearnAssistant({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const chatMessages = [
    { role: 'user', text: 'I want to learn about data analytics but I\'m not sure where to start.' },
    { role: 'assistant', text: 'Great choice! Based on your current skill profile, I recommend starting with "Data Analytics 101" by Marcus Lee. It covers foundational concepts like data cleaning, visualization, and basic statistical analysis. You already have strong Excel skills, so you\'ll progress quickly through the first module.' },
    { role: 'user', text: 'How long will it take me to complete?' },
    { role: 'assistant', text: 'The course is 10 hours total. Given your background, I estimate you can complete it in about 7-8 hours. I\'d suggest dedicating 1-2 hours per day over the next week. After that, you\'ll be ready for the intermediate "Python for Data Analysis" track.' },
  ];

  const suggestedPaths = [
    { name: 'Data Analytics Track', courses: 4, duration: '32 hours', match: 94 },
    { name: 'Business Intelligence', courses: 3, duration: '24 hours', match: 87 },
    { name: 'AI & Machine Learning', courses: 5, duration: '40 hours', match: 72 },
  ];

  const recentRecommendations = [
    { course: 'Data Analytics 101', reason: 'Matches your skill gaps', priority: 'High' },
    { course: 'AI for Business', reason: 'Trending in your team', priority: 'Medium' },
    { course: 'Communication Skills', reason: 'Complements leadership track', priority: 'Low' },
  ];

  const recPriorityColors = {
    High: 'bg-teal-500/15 text-teal-400',
    Medium: 'bg-amber-500/15 text-amber-400',
    Low: 'bg-zinc-700 text-zinc-300',
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-teal-500/20">
          <Sparkles className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Learning Assistant</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">AI-powered learning guidance for {companyName} team.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div data-demo="learning-assistant-chat" className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Learning AI</p>
              <p className="text-[10px] text-teal-400">Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 space-y-4 min-h-[360px]">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-600/20 text-teal-100 rounded-br-md'
                    : 'bg-zinc-800/50 text-zinc-300 rounded-bl-md border border-zinc-700/40'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-500 cursor-default">
                Ask about courses, skills, or learning paths...
              </div>
              <button className="p-2.5 rounded-xl bg-teal-600 text-white cursor-default">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Suggested Learning Paths */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm">Suggested Paths</h2>
            <div className="space-y-3">
              {suggestedPaths.map((path) => (
                <div key={path.name} className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white font-medium">{path.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-bold">{path.match}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>{path.courses} courses</span>
                    <span>{path.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Recommendations */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm">Recent Recommendations</h2>
            <div className="space-y-3">
              {recentRecommendations.map((rec) => (
                <div key={rec.course} className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400 mt-0.5">
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">{rec.course}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{rec.reason}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${recPriorityColors[rec.priority]}`}>
                    {rec.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  7. DemoLearnLeaderboard                                            */
/* ================================================================== */

export function DemoLearnLeaderboard({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const timePeriods = ['Week', 'Month', 'All Time'];

  const topThree = [
    { rank: 1, name: 'Jessica Martinez', xp: 4820, courses: 12, streak: 45, badges: 8 },
    { rank: 2, name: 'Tom van der Berg', xp: 4350, courses: 11, streak: 38, badges: 7 },
    { rank: 3, name: 'Laura Chen', xp: 3980, courses: 9, streak: 32, badges: 6 },
  ];

  const leaderboard = [
    { rank: 1, name: 'Jessica Martinez', xp: 4820, courses: 12, streak: 45, badges: 8 },
    { rank: 2, name: 'Tom van der Berg', xp: 4350, courses: 11, streak: 38, badges: 7 },
    { rank: 3, name: 'Laura Chen', xp: 3980, courses: 9, streak: 32, badges: 6 },
    { rank: 4, name: 'Marcus Lee', xp: 3640, courses: 8, streak: 28, badges: 5 },
    { rank: 5, name: 'Aisha Rahman', xp: 3210, courses: 7, streak: 22, badges: 5 },
    { rank: 6, name: 'Daniel Park', xp: 2890, courses: 6, streak: 19, badges: 4 },
    { rank: 7, name: 'Priya Shah', xp: 2540, courses: 5, streak: 15, badges: 3 },
    { rank: 8, name: 'Carlos Diaz', xp: 2180, courses: 5, streak: 12, badges: 3 },
    { rank: 9, name: 'Nina Patel', xp: 1920, courses: 4, streak: 10, badges: 2 },
    { rank: 10, name: 'David Kim', xp: 1650, courses: 3, streak: 7, badges: 2 },
  ];

  const podiumIcons = [Crown, Medal, Award];
  const podiumColors = [
    'bg-amber-500/15 border-amber-500/30 text-amber-400',
    'bg-zinc-600/20 border-zinc-500/30 text-zinc-300',
    'bg-orange-500/15 border-orange-500/30 text-orange-400',
  ];
  const podiumHeights = ['h-32', 'h-24', 'h-20'];
  const podiumOrder = [1, 0, 2];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20">
            <Trophy className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Leaderboard</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Top learners at {companyName}.</p>
          </div>
        </div>
        {/* Time Period Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {timePeriods.map((period, i) => (
            <button
              key={period}
              className={`px-4 py-1.5 rounded-lg text-sm cursor-default transition-colors ${
                i === 1 ? 'bg-teal-500/15 text-teal-400 font-medium' : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      <div data-demo="leaderboard-podium" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-end justify-center gap-4">
          {podiumOrder.map((idx) => {
            const person = topThree[idx];
            const PodiumIcon = podiumIcons[idx];
            return (
              <div key={person.rank} className="flex flex-col items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full bg-zinc-800 border-2 flex items-center justify-center text-sm font-bold ${podiumColors[idx]}`}>
                    {person.name.split(' ').map((w) => w[0]).join('')}
                  </div>
                  <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${podiumColors[idx]} border`}>
                    <PodiumIcon className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">{person.name.split(' ')[0]}</p>
                  <p className="text-xs text-teal-400 font-bold">{person.xp.toLocaleString()} XP</p>
                </div>
                {/* Podium Bar */}
                <div className={`w-24 ${podiumHeights[idx]} rounded-t-xl bg-gradient-to-t from-teal-900/40 to-teal-600/20 border border-teal-500/20 border-b-0 flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-teal-400/60">#{person.rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium text-center w-16">Rank</th>
                <th className="px-4 py-3 font-medium">Learner</th>
                <th className="px-4 py-3 font-medium text-center">XP Points</th>
                <th className="px-4 py-3 font-medium text-center">Courses</th>
                <th className="px-4 py-3 font-medium text-center">Streak</th>
                <th className="px-4 py-3 font-medium text-center">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {leaderboard.map((user) => (
                <tr key={user.rank} className={`hover:bg-zinc-800/20 transition-colors ${user.rank <= 3 ? 'bg-teal-500/[0.03]' : ''}`}>
                  <td className="px-4 py-3.5 text-center">
                    {user.rank <= 3 ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${podiumColors[user.rank - 1]}`}>
                        {user.rank}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400 font-medium">{user.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-300">
                        {user.name.split(' ').map((w) => w[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-bold text-teal-400">{user.xp.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm text-zinc-300">{user.courses}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-sm text-zinc-300">{user.streak}d</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-sm text-zinc-300">{user.badges}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
