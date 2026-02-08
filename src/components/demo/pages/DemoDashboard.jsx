import {
  DollarSign,
  Handshake,
  CheckSquare,
  Users,
  FileText,
  UserPlus,
  ListTodo,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  TrendingUp,
  Target,
  LayoutGrid,
  BookOpen,
  Shield,
  Rocket,
  Zap,
  BarChart3,
  Award,
  Flame,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  PieChart,
  Megaphone,
  Star,
} from 'lucide-react';

// ─── KPI Stats ──────────────────────────────────────────────────────────────────
const kpiStats = [
  { label: 'Revenue', value: '$124.5K', change: '+12.5%', up: true, icon: DollarSign, color: 'cyan' },
  { label: 'Active Deals', value: '23', change: '+3 this week', up: true, icon: Handshake, color: 'blue' },
  { label: 'Tasks Due Today', value: '7', change: '2 overdue', up: false, icon: CheckSquare, color: 'amber' },
  { label: 'Team Members', value: '12', change: '+1 this week', up: true, icon: Users, color: 'violet' },
  { label: 'Pipeline Value', value: '$387K', change: '+8.3%', up: true, icon: Target, color: 'emerald' },
  { label: 'Conversion Rate', value: '34%', change: '+2.1pp', up: true, icon: TrendingUp, color: 'rose' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  blue: 'bg-blue-500/15 text-blue-400',
  amber: 'bg-amber-500/15 text-amber-400',
  violet: 'bg-violet-500/15 text-violet-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  rose: 'bg-rose-500/15 text-rose-400',
  red: 'bg-red-500/15 text-red-400',
  indigo: 'bg-indigo-500/15 text-indigo-400',
};

// ─── Pipeline Stages ────────────────────────────────────────────────────────────
const pipelineStages = [
  { stage: 'New', count: 45, width: 100, color: 'bg-zinc-500' },
  { stage: 'Contacted', count: 38, width: 84, color: 'bg-blue-500' },
  { stage: 'Qualified', count: 24, width: 53, color: 'bg-cyan-500' },
  { stage: 'Proposal', count: 15, width: 33, color: 'bg-violet-500' },
  { stage: 'Negotiation', count: 8, width: 18, color: 'bg-amber-500' },
  { stage: 'Won', count: 5, width: 11, color: 'bg-emerald-500' },
];

// ─── Revenue Chart Data ─────────────────────────────────────────────────────────
const revenueMonths = [
  { month: 'Jul', value: 68, amount: '$68K' },
  { month: 'Aug', value: 82, amount: '$82K' },
  { month: 'Sep', value: 59, amount: '$59K' },
  { month: 'Oct', value: 91, amount: '$91K' },
  { month: 'Nov', value: 74, amount: '$74K' },
  { month: 'Dec', value: 105, amount: '$105K' },
  { month: 'Jan', value: 97, amount: '$97K' },
  { month: 'Feb', value: 124, amount: '$124K' },
];
const maxRevenue = 130;

// ─── Activity Feed ──────────────────────────────────────────────────────────────
const activityTypes = {
  deal: { color: 'bg-cyan-500/15 text-cyan-400', border: 'border-cyan-500/20' },
  payment: { color: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/20' },
  task: { color: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/20' },
  meeting: { color: 'bg-violet-500/15 text-violet-400', border: 'border-violet-500/20' },
  alert: { color: 'bg-red-500/15 text-red-400', border: 'border-red-500/20' },
  contact: { color: 'bg-blue-500/15 text-blue-400', border: 'border-blue-500/20' },
};

// ─── Quick Actions ──────────────────────────────────────────────────────────────
const quickActions = [
  { label: 'Create Invoice', icon: FileText, color: 'cyan' },
  { label: 'Add Prospect', icon: UserPlus, color: 'blue' },
  { label: 'New Task', icon: ListTodo, color: 'amber' },
  { label: 'Schedule Meeting', icon: CalendarClock, color: 'violet' },
  { label: 'Generate Report', icon: BarChart3, color: 'emerald' },
  { label: 'Start Campaign', icon: Megaphone, color: 'rose' },
];

// ─── Team Members ───────────────────────────────────────────────────────────────
const teamMembers = [
  { name: 'Sarah Chen', role: 'Sales Lead', metric: '$42.5K', pct: 85, initials: 'SC', bg: 'bg-cyan-500' },
  { name: 'Marcus Rivera', role: 'Account Exec', metric: '$38.1K', pct: 76, initials: 'MR', bg: 'bg-violet-500' },
  { name: 'Emma Johansson', role: 'BDR', metric: '$29.8K', pct: 60, initials: 'EJ', bg: 'bg-emerald-500' },
  { name: 'David Kim', role: 'Sales Rep', metric: '$24.2K', pct: 48, initials: 'DK', bg: 'bg-blue-500' },
];


// ─── Circular Progress Ring ─────────────────────────────────────────────────────
function ProgressRing({ radius, stroke, progress, color, trackColor = 'text-zinc-800' }) {
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
      <circle
        className={trackColor}
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        className={color}
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
}


// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoDashboard({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activities = [
    { text: `New deal created: ${companyName} Q1 Platform Expansion`, time: '12 min ago', icon: Handshake, type: 'deal' },
    { text: 'Invoice #1042 marked as paid ($8,400)', time: '1 hour ago', icon: DollarSign, type: 'payment' },
    { text: 'Sarah completed onboarding checklist', time: '2 hours ago', icon: CheckCircle2, type: 'task' },
    { text: 'Meeting scheduled with CloudNine Inc.', time: '3 hours ago', icon: CalendarClock, type: 'meeting' },
    { text: 'Compliance alert: System audit due in 3 days', time: '4 hours ago', icon: AlertTriangle, type: 'alert' },
    { text: 'New contact imported via LinkedIn', time: '5 hours ago', icon: UserPlus, type: 'contact' },
    { text: `${recipientName} closed deal with Pinnacle Group ($55K)`, time: '6 hours ago', icon: Handshake, type: 'deal' },
    { text: 'Expense report submitted: $2,340 (Marketing)', time: '8 hours ago', icon: CircleDollarSign, type: 'payment' },
  ];

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-5">

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div data-demo="header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Welcome back, {recipientName}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {dateString} &middot; Here's what's happening at {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
              <LayoutGrid className="w-3.5 h-3.5" />
              Personal
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500">
              <Users className="w-3.5 h-3.5" />
              Team
            </button>
          </div>
        </div>
      </div>

      {/* ─── KPI Stats Row ─────────────────────────────────────────────────── */}
      <div data-demo="stats" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 text-xs font-medium">{stat.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBgMap[stat.color]}`}>
                <stat.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-xl font-bold text-white">{stat.value}</span>
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                stat.up ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {stat.change}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Widget Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ── Growth Pipeline Widget (large, 2 cols) ──────────────────────── */}
        <div
          data-demo="pipeline"
          className="md:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              Growth Pipeline
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">Total:</span>
              <span className="text-xs font-semibold text-white">135 leads</span>
            </div>
          </div>
          <div className="space-y-3">
            {pipelineStages.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-20 text-right shrink-0">{s.stage}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-700`}
                    style={{ width: `${s.width}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-zinc-300 w-8 text-right">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-bold text-white">$387K</p>
              <p className="text-[11px] text-zinc-500">Pipeline Value</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">34%</p>
              <p className="text-[11px] text-zinc-500">Win Rate</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">18 days</p>
              <p className="text-[11px] text-zinc-500">Avg. Cycle</p>
            </div>
          </div>
        </div>

        {/* ── Learn Progress Widget (medium, 1 col) ───────────────────────── */}
        <div
          data-demo="learn"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Learn Progress</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProgressRing radius={44} stroke={6} progress={72} color="text-cyan-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">72%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">AI Strategy Fundamentals</p>
              <p className="text-xs text-zinc-500 mt-0.5">Module 5 of 7</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Flame className="w-3.5 h-3.5" /> 12 days
                </span>
                <span className="flex items-center gap-1 text-xs text-violet-400">
                  <Zap className="w-3.5 h-3.5" /> 2,480 XP
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Next milestone</span>
              <span className="text-cyan-400 font-medium">Level 8 &mdash; 520 XP to go</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['Prompt Engineering', 'Data Analysis', 'ML Basics'].map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] text-center bg-zinc-800/80 text-zinc-400 px-2 py-1 rounded-md truncate"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-zinc-400">3 certificates earned</span>
            </div>
          </div>
        </div>

        {/* ── Sentinel Compliance Widget (medium, 1 col) ──────────────────── */}
        <div
          data-demo="sentinel"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Sentinel Compliance</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProgressRing radius={44} stroke={6} progress={78} color="text-emerald-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">78%</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">AI Systems</span>
                <span className="text-white font-medium">12</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">High Risk</span>
                <span className="text-red-400 font-medium">3</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Compliant</span>
                <span className="text-emerald-400 font-medium">8</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Pending Review</span>
                <span className="text-amber-400 font-medium">1</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>3 compliance tasks overdue</span>
            </div>
            <div className="mt-2 flex gap-2">
              {[
                { label: 'Low', count: 4, cls: 'bg-emerald-500/15 text-emerald-400' },
                { label: 'Medium', count: 5, cls: 'bg-amber-500/15 text-amber-400' },
                { label: 'High', count: 3, cls: 'bg-red-500/15 text-red-400' },
              ].map((risk) => (
                <span key={risk.label} className={`text-[10px] px-2 py-0.5 rounded-full ${risk.cls}`}>
                  {risk.count} {risk.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Finance Overview Widget (large, 2 cols) ─────────────────────── */}
        <div
          data-demo="finance"
          className="md:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
              Finance Overview
            </h2>
            <span className="text-[11px] text-zinc-500">Last 8 months</span>
          </div>
          {/* Bar Chart */}
          <div className="flex items-end gap-2 h-36">
            {revenueMonths.map((bar, i) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                <span className="text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.amount}
                </span>
                <div className="w-full relative">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      i === revenueMonths.length - 1
                        ? 'bg-gradient-to-t from-cyan-500/50 to-cyan-400/80'
                        : 'bg-gradient-to-t from-blue-500/25 to-blue-400/50'
                    }`}
                    style={{ height: `${(bar.value / maxRevenue) * 120}px` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500">{bar.month}</span>
              </div>
            ))}
          </div>
          {/* Finance Mini Stats */}
          <div className="mt-4 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-zinc-500">MRR</p>
              <p className="text-base font-bold text-white">$18.4K</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> +4.2%
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Expenses</p>
              <p className="text-base font-bold text-white">$67.2K</p>
              <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> +2.1%
              </span>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Pending</p>
              <p className="text-base font-bold text-white">$34.2K</p>
              <span className="text-[10px] text-zinc-400">8 invoices</span>
            </div>
          </div>
        </div>

        {/* ── Raise Progress Widget (medium, 1 col) ───────────────────────── */}
        <div
          data-demo="raise"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Raise Progress</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">$1.8M</span>
              <span className="text-xs text-zinc-500">of $2.5M</span>
            </div>
            <div className="bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                style={{ width: '72%' }}
              />
            </div>
            <p className="text-xs text-zinc-500">72% of target reached</p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Committed Investors</span>
              <span className="text-white font-medium">14</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Term Sheets</span>
              <span className="text-cyan-400 font-medium">3</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">In Due Diligence</span>
              <span className="text-amber-400 font-medium">5</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Meetings This Week</span>
              <span className="text-violet-400 font-medium">4</span>
            </div>
          </div>
        </div>

        {/* ── Recent Activity Feed (medium, 1 col) ────────────────────────── */}
        <div
          data-demo="activity"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
            {activities.map((activity, i) => {
              const style = activityTypes[activity.type] || activityTypes.deal;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style.color}`}>
                    <activity.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-relaxed">{activity.text}</p>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-600 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {activity.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Actions (small, 1 col) ────────────────────────────────── */}
        <div
          data-demo="quick-actions"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-800/60 bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors cursor-default`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBgMap[action.color]}`}>
                  <action.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-zinc-300 truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Team Performance (small, 1 col) ─────────────────────────────── */}
        <div
          data-demo="team"
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Star className="w-4 h-4 text-violet-400" />
              </div>
              Team Performance
            </h2>
            <span className="text-[10px] text-zinc-500">This month</span>
          </div>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${member.bg}`}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white truncate">{member.name}</span>
                    <span className="text-xs font-semibold text-zinc-300 ml-2">{member.metric}</span>
                  </div>
                  <div className="mt-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${member.bg} transition-all duration-500`}
                      style={{ width: `${member.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Team total</span>
            <span className="text-white font-semibold">$134.6K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
