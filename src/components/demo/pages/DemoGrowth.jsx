import {
  TrendingUp,
  Search,
  Plus,
  Building2,
  User,
  DollarSign,
  Target,
  Handshake,
  Trophy,
  CalendarCheck,
  BarChart3,
  Megaphone,
  Mail,
  Zap,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

/* ── Stats ─────────────────────────────────────────────────── */
const pipelineStats = [
  { label: 'Total Pipeline', value: '$387K', sub: '42 deals', icon: DollarSign, change: '+14%' },
  { label: 'Active Deals', value: '23', sub: 'across 4 stages', icon: Target, change: '+3' },
  { label: 'Won This Month', value: '5', sub: '$142K revenue', icon: Trophy, change: '+2' },
  { label: 'Win Rate', value: '34%', sub: 'vs 28% last month', icon: BarChart3, change: '+6%' },
  { label: 'Meetings', value: '12', sub: 'this week', icon: CalendarCheck, change: '+4' },
];

/* ── Funnel ────────────────────────────────────────────────── */
const funnelStages = [
  { label: 'New', count: 45, pct: 100, shade: 'bg-indigo-400/40' },
  { label: 'Contacted', count: 32, pct: 71, shade: 'bg-indigo-400/50' },
  { label: 'Qualified', count: 23, pct: 51, shade: 'bg-indigo-500/55' },
  { label: 'Proposal', count: 12, pct: 27, shade: 'bg-indigo-500/65' },
  { label: 'Negotiation', count: 8, pct: 18, shade: 'bg-indigo-600/70' },
  { label: 'Won', count: 5, pct: 11, shade: 'bg-indigo-600/80' },
];

/* ── Revenue bars ──────────────────────────────────────────── */
const revenueMonths = [
  { month: 'Jul', value: 28, height: 33 },
  { month: 'Aug', value: 41, height: 48 },
  { month: 'Sep', value: 35, height: 41 },
  { month: 'Oct', value: 52, height: 61 },
  { month: 'Nov', value: 47, height: 55 },
  { month: 'Dec', value: 68, height: 80 },
  { month: 'Jan', value: 59, height: 69 },
  { month: 'Feb', value: 85, height: 100 },
];

/* ── Campaigns ─────────────────────────────────────────────── */
const campaigns = [
  {
    name: 'Q1 Enterprise Push',
    status: 'Active',
    prospects: 128,
    responseRate: 24,
    meetings: 8,
  },
  {
    name: 'Product-Led Inbound',
    status: 'Active',
    prospects: 312,
    responseRate: 18,
    meetings: 14,
  },
  {
    name: 'Partner Co-Sell',
    status: 'Paused',
    prospects: 67,
    responseRate: 31,
    meetings: 4,
  },
];

/* ── Signals ───────────────────────────────────────────────── */
const growthSignals = [
  {
    title: 'TechVentures showing buying signals',
    detail: 'Visited pricing page 4 times in the last week. Key contact opened 3 emails.',
    border: 'border-l-indigo-500',
    badge: 'Hot Lead',
    badgeColor: 'bg-red-500/15 text-red-400',
  },
  {
    title: 'Meridian Health contract renewal approaching',
    detail: 'Current contract expires in 28 days. NPS score: 72. Upsell opportunity identified.',
    border: 'border-l-amber-500',
    badge: 'Renewal',
    badgeColor: 'bg-amber-500/15 text-amber-400',
  },
  {
    title: 'Summit Analytics expanding to EU',
    detail: 'Public announcement of EU expansion. They will need local compliance tooling.',
    border: 'border-l-emerald-500',
    badge: 'Expansion',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
  },
];

/* ── Kanban stage styles ───────────────────────────────────── */
const stageStyles = {
  Lead: { border: 'border-zinc-600', pill: 'bg-zinc-700 text-zinc-300' },
  Qualified: { border: 'border-indigo-500/40', pill: 'bg-indigo-500/15 text-indigo-400' },
  Proposal: { border: 'border-violet-500/40', pill: 'bg-violet-500/15 text-violet-400' },
  'Closed Won': { border: 'border-emerald-500/40', pill: 'bg-emerald-500/15 text-emerald-400' },
};

const sourceBadgeColors = {
  Inbound: 'bg-indigo-500/15 text-indigo-400',
  Referral: 'bg-cyan-500/15 text-cyan-400',
  Outbound: 'bg-zinc-700 text-zinc-300',
  'Platform License': 'bg-violet-500/15 text-violet-400',
  Enterprise: 'bg-indigo-500/15 text-indigo-400',
  'Q1 Expansion': 'bg-amber-500/15 text-amber-400',
  'Add-on': 'bg-zinc-700 text-zinc-300',
  'New Deal': 'bg-indigo-500/15 text-indigo-400',
  Renewed: 'bg-emerald-500/15 text-emerald-400',
  Won: 'bg-emerald-500/15 text-emerald-400',
};

export default function DemoGrowth({ companyName = 'Acme Corp', recipientName = 'there' }) {
  /* ── Kanban columns ──────────────────────────────────────── */
  const columns = [
    {
      stage: 'Lead',
      deals: [
        { company: 'NovaTech Solutions', value: '$18,000', contact: 'James Park', tag: 'Inbound', days: 3 },
        { company: 'Meridian Health', value: '$32,000', contact: 'Lisa Tran', tag: 'Referral', days: 7 },
        { company: 'UrbanEdge Media', value: '$9,500', contact: 'Carlos Diaz', tag: 'Outbound', days: 1 },
        { company: 'BlueRidge Capital', value: '$14,200', contact: 'Hannah Cole', tag: 'Inbound', days: 5 },
      ],
    },
    {
      stage: 'Qualified',
      deals: [
        { company: 'TechVentures', value: '$28,000', contact: 'Alex Morgan', tag: 'Platform License', days: 12 },
        { company: 'Summit Analytics', value: '$41,000', contact: 'Priya Shah', tag: 'Enterprise', days: 9 },
        { company: 'Apex Dynamics', value: '$19,500', contact: 'Tom Brady', tag: 'Inbound', days: 4 },
      ],
    },
    {
      stage: 'Proposal',
      deals: [
        { company: companyName, value: '$45,000', contact: recipientName, tag: 'Q1 Expansion', days: 6 },
        { company: 'DataBridge Corp', value: '$22,500', contact: 'Michael Chen', tag: 'Add-on', days: 14 },
        { company: 'GreenLeaf Ventures', value: '$36,000', contact: 'Nina Patel', tag: 'New Deal', days: 3 },
      ],
    },
    {
      stage: 'Closed Won',
      deals: [
        { company: 'Pinnacle Group', value: '$55,000', contact: 'Robert Kim', tag: 'Renewed', days: 0 },
        { company: 'Orion Systems', value: '$19,800', contact: 'Emma Wilson', tag: 'Won', days: 0 },
        { company: 'Catalyst Labs', value: '$67,200', contact: 'David Nguyen', tag: 'Won', days: 0 },
      ],
    },
  ];

  /* ── Y-axis helpers for revenue chart ────────────────────── */
  const yLabels = ['$90K', '$60K', '$30K', '$0'];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div data-demo="page-header" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Growth Pipeline</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Track deals from prospect to close for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-64">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search deals...</span>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
            <Plus className="w-4 h-4" />
            Add Prospect
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div data-demo="pipeline-stats" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {pipelineStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">{stat.value}</span>
                <span className="text-xs font-medium text-indigo-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{stat.label}</p>
              <p className="text-[10px] text-zinc-600 truncate">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Conversion Funnel + Revenue Trend ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div data-demo="conversion-funnel" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Conversion Funnel</h2>
            <span className="text-xs text-zinc-500">Last 30 days</span>
          </div>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => {
              const convRate = i === 0 ? '100%' : `${Math.round((stage.count / funnelStages[0].count) * 100)}%`;
              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-20 text-right shrink-0">{stage.label}</span>
                  <div className="flex-1 h-8 bg-zinc-800/50 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full ${stage.shade} rounded-lg transition-all flex items-center justify-end pr-3`}
                      style={{ width: `${stage.pct}%` }}
                    >
                      {stage.pct > 20 && (
                        <span className="text-xs font-semibold text-white/90">{stage.count}</span>
                      )}
                    </div>
                    {stage.pct <= 20 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-300">
                        {stage.count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 w-10 shrink-0">{convRate}</span>
                  {i > 0 && (
                    <span className="text-[10px] text-zinc-600 w-12 shrink-0">
                      {Math.round((stage.count / funnelStages[i - 1].count) * 100)}% conv
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Trend */}
        <div data-demo="revenue-trend" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Revenue Trend</h2>
            <span className="text-xs text-zinc-500">Monthly closed revenue (K)</span>
          </div>
          <div className="flex gap-1">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between h-48 pr-2 pb-6">
              {yLabels.map((lbl) => (
                <span key={lbl} className="text-[10px] text-zinc-600 leading-none">{lbl}</span>
              ))}
            </div>
            {/* Bars */}
            <div className="flex-1 flex items-end justify-between gap-2 h-48">
              {revenueMonths.map((bar) => (
                <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-indigo-300 font-medium">${bar.value}K</span>
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600/40 to-indigo-400/70 rounded-t-lg transition-all"
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className="text-[10px] text-zinc-500 mt-1">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kanban Pipeline ─────────────────────────────────── */}
      <div data-demo="pipeline" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Pipeline Board</h2>
          <span className="text-xs text-zinc-500">{columns.reduce((n, c) => n + c.deals.length, 0)} deals total</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const style = stageStyles[col.stage];
            const stageTotal = col.deals.reduce((sum, d) => sum + parseInt(d.value.replace(/[$,]/g, ''), 10), 0);
            return (
              <div key={col.stage} className="min-w-[280px] flex-1 space-y-3">
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-3 border-b-2 ${style.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${style.pill.split(' ')[1]}`}>
                      {col.stage}
                    </span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                      {col.deals.length}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">${(stageTotal / 1000).toFixed(0)}K</span>
                </div>

                {/* Deal Cards */}
                {col.deals.map((deal, i) => (
                  <div
                    key={i}
                    data-demo="deal-card"
                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-sm font-medium text-white truncate">{deal.company}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${sourceBadgeColors[deal.tag] || 'bg-zinc-700 text-zinc-300'}`}>
                        {deal.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">{deal.value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-xs">{deal.contact}</span>
                      </div>
                      {deal.days > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <Clock className="w-3 h-3" />
                          {deal.days}d
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Campaigns + Growth Signals ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <div data-demo="campaigns" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-400" />
              <h2 className="text-white font-semibold">Active Campaigns</h2>
            </div>
            <span className="text-xs text-indigo-400 cursor-default">View all</span>
          </div>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.name}
                className="border border-zinc-800 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{campaign.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      campaign.status === 'Active'
                        ? 'bg-indigo-500/15 text-indigo-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-white">{campaign.prospects}</p>
                    <p className="text-[10px] text-zinc-500">Prospects</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <Mail className="w-3 h-3 text-zinc-500" />
                      <p className="text-sm font-bold text-white">{campaign.responseRate}%</p>
                    </div>
                    <p className="text-[10px] text-zinc-500">Response</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <CalendarCheck className="w-3 h-3 text-zinc-500" />
                      <p className="text-sm font-bold text-white">{campaign.meetings}</p>
                    </div>
                    <p className="text-[10px] text-zinc-500">Meetings</p>
                  </div>
                </div>
                {/* Response rate mini-bar */}
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500/70 rounded-full"
                    style={{ width: `${campaign.responseRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Signals */}
        <div data-demo="growth-signals" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-white font-semibold">Growth Signals</h2>
            </div>
            <span className="text-xs text-zinc-500">3 new today</span>
          </div>
          <div className="space-y-4">
            {growthSignals.map((signal) => (
              <div
                key={signal.title}
                className={`border border-zinc-800 border-l-2 ${signal.border} rounded-xl p-4 space-y-2 hover:border-zinc-700 transition-colors`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-white">{signal.title}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${signal.badgeColor}`}>
                    {signal.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 pl-6">{signal.detail}</p>
                <div className="pl-6">
                  <span className="flex items-center gap-1 text-xs text-indigo-400 cursor-default">
                    View details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
