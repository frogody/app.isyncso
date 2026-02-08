import {
  Sparkles,
  Send,
  FileText,
  CheckSquare,
  DollarSign,
  Users,
  Target,
  MessageSquare,
  Calendar,
  Search,
  Zap,
  Mic,
  Bot,
  Activity,
  Clock,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Mail,
  Image,
  Globe,
  Filter,
} from 'lucide-react';

// ─── SYNC AGENT ───────────────────────────────────────────────────────────────

const chatMessages = [
  {
    role: 'user',
    content: 'Create an invoice for TechVentures, $12,500 for platform license',
  },
  {
    role: 'sync',
    content: 'Invoice #INV-2026-047 created for TechVentures:',
    data: [
      { label: 'Amount', value: '$12,500.00' },
      { label: 'Item', value: 'Platform License' },
      { label: 'Status', value: 'Draft' },
      { label: 'Due Date', value: 'Mar 8, 2026' },
    ],
    actions: ['Send Invoice', 'Edit'],
  },
  {
    role: 'user',
    content: 'How is my sales pipeline looking this week?',
  },
  {
    role: 'sync',
    content: 'Here is your pipeline summary for this week:',
    data: [
      { label: 'Active Deals', value: '23' },
      { label: 'Total Pipeline', value: '$387K' },
      { label: 'Closing This Week', value: '3 deals ($89K)' },
      { label: 'New Leads', value: '7 added' },
    ],
    actions: ['View Pipeline', 'Schedule Follow-ups'],
  },
  {
    role: 'user',
    content: 'Schedule a follow-up task for the Meridian Health deal next Tuesday',
  },
];

const syncResponse5 = {
  content: 'Task created and added to your calendar:',
  data: [
    { label: 'Task', value: 'Follow-up: Meridian Health' },
    { label: 'Date', value: 'Tuesday, Feb 11, 2026' },
    { label: 'Priority', value: 'High' },
    { label: 'Linked Deal', value: '$32,000 - Meridian Health' },
  ],
  actions: ['View Task', 'Reschedule'],
};

const actionCards = [
  { label: '51 Actions Available', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  { label: '10 Modules Connected', icon: Globe, color: 'text-violet-400', bg: 'bg-violet-500/15' },
  { label: 'Voice + Text', icon: Mic, color: 'text-amber-400', bg: 'bg-amber-500/15' },
];

const quickCommands = [
  'Create an invoice',
  'Show my tasks',
  'Find prospects in tech',
  'Summarize pipeline',
  'Generate an image',
  'Check compliance status',
];

export function DemoSyncAgent({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="sync-agent">
      {/* Chat Interface */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">SYNC AI</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-500">Online</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-5 space-y-5 max-h-[500px] overflow-y-auto">
          {chatMessages.map((msg, idx) => {
            if (msg.role === 'user') {
              return (
                <div key={idx} className="flex justify-end">
                  <div className="bg-cyan-500/15 border border-cyan-500/20 rounded-xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-white">{msg.content}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] space-y-3">
                  <p className="text-sm text-zinc-300">{msg.content}</p>
                  {msg.data && (
                    <div className="bg-black/30 rounded-lg p-3 space-y-2 border border-white/5">
                      {msg.data.map((d) => (
                        <div key={d.label} className="flex justify-between text-xs">
                          <span className="text-zinc-500">{d.label}</span>
                          <span className="text-white font-semibold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.actions && (
                    <div className="flex items-center gap-2 pt-1">
                      {msg.actions.map((action, ai) => (
                        <button
                          key={ai}
                          className={`text-[11px] px-3 py-1.5 rounded-lg cursor-default ${
                            ai === 0
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Final SYNC response */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] space-y-3">
              <p className="text-sm text-zinc-300">{syncResponse5.content}</p>
              <div className="bg-black/30 rounded-lg p-3 space-y-2 border border-white/5">
                {syncResponse5.data.map((d) => (
                  <div key={d.label} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{d.label}</span>
                    <span className="text-white font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                {syncResponse5.actions.map((action, ai) => (
                  <button
                    key={ai}
                    className={`text-[11px] px-3 py-1.5 rounded-lg cursor-default ${
                      ai === 0
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                        : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="px-5 py-3 border-t border-zinc-800/60">
          <div className="flex items-center gap-2 bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-3 py-2.5">
            <Mic className="w-4 h-4 text-zinc-600 shrink-0" />
            <span className="flex-1 text-sm text-zinc-600">Ask SYNC anything...</span>
            <button className="p-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 cursor-default shrink-0">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actionCards.map((card) => (
          <div key={card.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <span className="text-sm text-zinc-300 font-medium">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Commands */}
      <div>
        <p className="text-xs text-zinc-600 text-center mb-3">Quick commands</p>
        <div className="flex flex-wrap justify-center gap-2">
          {quickCommands.map((cmd) => (
            <div
              key={cmd}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800/60 text-sm text-zinc-300 cursor-default hover:border-cyan-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {cmd}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SYNC ACTIVITY ────────────────────────────────────────────────────────────

const activityStats = [
  { label: 'Actions This Month', value: '847', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  { label: 'Success Rate', value: '98.2%', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { label: 'Avg Response', value: '1.8s', icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/15' },
];

const moduleFilters = ['All', 'Finance', 'Growth', 'CRM', 'Tasks', 'Inbox', 'Sentinel'];

const moduleColors = {
  Finance: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: DollarSign },
  Growth: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', icon: Target },
  CRM: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', icon: Users },
  Tasks: { bg: 'bg-violet-500/15', text: 'text-violet-400', icon: CheckSquare },
  Inbox: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Mail },
  Sentinel: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: ShieldCheck },
  Create: { bg: 'bg-pink-500/15', text: 'text-pink-400', icon: Image },
  Reports: { bg: 'bg-zinc-700', text: 'text-zinc-400', icon: FileText },
  Research: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', icon: Search },
};

const activities = [
  { time: '2 min ago', action: 'Created invoice #INV-2026-047 for TechVentures ($12,500)', module: 'Finance', status: 'Completed' },
  { time: '8 min ago', action: 'Generated product image for "Enterprise Dashboard" campaign', module: 'Create', status: 'Completed' },
  { time: '15 min ago', action: 'Updated deal stage for Meridian Health to "Proposal"', module: 'Growth', status: 'Completed' },
  { time: '22 min ago', action: 'Scheduled follow-up task for Summit Analytics review', module: 'Tasks', status: 'Completed' },
  { time: '35 min ago', action: 'Sent campaign email to 12 prospects in Q1 Pipeline', module: 'Growth', status: 'Completed' },
  { time: '1 hour ago', action: 'Completed risk assessment for Customer Chatbot system', module: 'Sentinel', status: 'Completed' },
  { time: '1 hour ago', action: 'Drafted response to partnership inquiry from DataBridge', module: 'Inbox', status: 'In Progress' },
  { time: '2 hours ago', action: 'Generated quarterly revenue report for Q4 2025', module: 'Reports', status: 'Completed' },
  { time: '2 hours ago', action: 'Added 3 new contacts from LinkedIn research', module: 'CRM', status: 'Completed' },
  { time: '3 hours ago', action: 'Created expense entry for AWS hosting ($2,340)', module: 'Finance', status: 'Completed' },
  { time: '4 hours ago', action: 'Searched competitor pricing for market analysis', module: 'Research', status: 'Completed' },
  { time: '5 hours ago', action: 'Assigned overdue task review to 4 team members', module: 'Tasks', status: 'Completed' },
];

const statusStyle = {
  Completed: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  'In Progress': { dot: 'bg-amber-500', text: 'text-amber-400' },
};

export function DemoSyncActivity({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="sync-activity">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activityStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Module Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
        {moduleFilters.map((f, i) => (
          <button
            key={f}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium cursor-default transition-colors shrink-0 ${
              i === 0
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:border-zinc-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Activity Feed</h2>
          <span className="text-[11px] text-zinc-500">{activities.length} actions today</span>
        </div>
        <div className="divide-y divide-zinc-800/30">
          {activities.map((entry, idx) => {
            const mod = moduleColors[entry.module];
            const ModIcon = mod?.icon || Activity;
            const st = statusStyle[entry.status];
            return (
              <div key={idx} className="px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-800/20 transition-colors">
                {/* Timestamp */}
                <span className="text-[10px] text-zinc-600 w-20 shrink-0 text-right">{entry.time}</span>
                {/* Module icon */}
                <div className={`p-1.5 rounded-lg ${mod?.bg || 'bg-zinc-800'} shrink-0`}>
                  <ModIcon className={`w-3.5 h-3.5 ${mod?.text || 'text-zinc-400'}`} />
                </div>
                {/* Description */}
                <p className="text-sm text-zinc-300 flex-1 min-w-0">{entry.action}</p>
                {/* Module badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${mod?.bg || 'bg-zinc-800'} ${mod?.text || 'text-zinc-400'}`}>
                  {entry.module}
                </span>
                {/* Status */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  <span className={`text-[10px] ${st.text}`}>{entry.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
