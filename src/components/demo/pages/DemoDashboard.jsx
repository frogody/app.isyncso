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
} from 'lucide-react';

const stats = [
  { label: 'Revenue', value: '$124,500', change: '+12.5%', up: true, icon: DollarSign, color: 'cyan' },
  { label: 'Active Deals', value: '23', change: '+3', up: true, icon: Handshake, color: 'emerald' },
  { label: 'Tasks Due', value: '7', change: '2 overdue', up: false, icon: CheckSquare, color: 'amber' },
  { label: 'Team Members', value: '12', change: '+1 this week', up: true, icon: Users, color: 'violet' },
];

const activities = [
  { text: 'New deal created: Q1 Platform Expansion', time: '12 min ago', icon: Handshake },
  { text: 'Invoice #1042 marked as paid ($8,400)', time: '1 hour ago', icon: DollarSign },
  { text: 'Sarah completed onboarding checklist', time: '2 hours ago', icon: CheckSquare },
  { text: 'Meeting scheduled with CloudNine Inc.', time: '3 hours ago', icon: CalendarClock },
  { text: 'New contact imported via LinkedIn', time: '5 hours ago', icon: UserPlus },
];

const quickActions = [
  { label: 'Create Invoice', icon: FileText, color: 'cyan' },
  { label: 'Add Prospect', icon: UserPlus, color: 'emerald' },
  { label: 'New Task', icon: ListTodo, color: 'amber' },
  { label: 'Schedule Meeting', icon: CalendarClock, color: 'violet' },
];

const colorMap = {
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
  violet: 'bg-violet-500/15 text-violet-400',
};

export default function DemoDashboard({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Welcome back, {recipientName}
        </h1>
        <p className="text-zinc-400 mt-1">
          Here's what's happening at {companyName} today.
        </p>
      </div>

      {/* Stat Cards */}
      <div data-demo="stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className={`p-2 rounded-lg ${iconBgMap[stat.color]}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  stat.up ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div
          data-demo="activity"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {activities.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 mt-0.5">
                  <activity.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">{activity.text}</p>
                  <span className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          data-demo="quick-actions"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-default ${colorMap[action.color]}`}
              >
                <action.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
