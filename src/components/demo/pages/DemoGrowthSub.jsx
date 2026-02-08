import {
  TrendingUp,
  Building2,
  User,
  DollarSign,
  Target,
  Clock,
  ArrowRight,
  Plus,
  Megaphone,
  Mail,
  Linkedin,
  Layers,
  Zap,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  BarChart3,
  CalendarCheck,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Eye,
  Search,
  Filter,
} from 'lucide-react';

/* ========================================================================== */
/*  1.  DemoGrowthPipeline                                                     */
/* ========================================================================== */

const pipelineVelocity = [
  { label: 'Avg Days to Close', value: '18', icon: Clock },
  { label: 'Conversion Rate', value: '34%', icon: Target },
  { label: 'Avg Deal Size', value: '$28K', icon: DollarSign },
];

const kanbanColumns = [
  {
    stage: 'New Lead',
    color: 'border-zinc-600',
    pill: 'text-zinc-300',
    deals: [
      { company: 'NovaTech Solutions', value: '$12,500', contact: 'James Park', source: 'Inbound', days: 2, score: 64 },
      { company: 'BlueRidge Capital', value: '$18,000', contact: 'Hannah Cole', source: 'Referral', days: 4, score: 58 },
      { company: 'PineVista Labs', value: '$9,200', contact: 'Marco Silva', source: 'Outbound', days: 1, score: 42 },
    ],
  },
  {
    stage: 'Contacted',
    color: 'border-indigo-500/40',
    pill: 'text-indigo-400',
    deals: [
      { company: 'UrbanEdge Media', value: '$22,000', contact: 'Carlos Diaz', source: 'LinkedIn', days: 6, score: 71 },
      { company: 'Meridian Health', value: '$34,500', contact: 'Lisa Tran', source: 'Referral', days: 9, score: 76 },
      { company: 'Apex Dynamics', value: '$15,800', contact: 'Tom Brady', source: 'Outbound', days: 5, score: 63 },
      { company: 'Quantum AI', value: '$27,000', contact: 'Aisha Patel', source: 'Inbound', days: 3, score: 69 },
    ],
  },
  {
    stage: 'Qualified',
    color: 'border-indigo-500/50',
    pill: 'text-indigo-300',
    deals: [
      { company: 'TechVentures', value: '$41,000', contact: 'Alex Morgan', source: 'Event', days: 12, score: 85 },
      { company: 'Summit Analytics', value: '$28,500', contact: 'Priya Shah', source: 'Inbound', days: 8, score: 79 },
      { company: 'DataBridge Corp', value: '$19,200', contact: 'Michael Chen', source: 'Cold Email', days: 10, score: 74 },
    ],
  },
  {
    stage: 'Proposal Sent',
    color: 'border-violet-500/40',
    pill: 'text-violet-400',
    deals: [
      { company: 'GreenLeaf Ventures', value: '$36,000', contact: 'Nina Patel', source: 'Partner', days: 14, score: 88 },
      { company: 'Orion Systems', value: '$52,000', contact: 'Emma Wilson', source: 'Referral', days: 7, score: 91 },
      { company: 'Pinnacle Group', value: '$24,500', contact: 'Robert Kim', source: 'Inbound', days: 11, score: 82 },
    ],
  },
  {
    stage: 'Negotiation',
    color: 'border-amber-500/40',
    pill: 'text-amber-400',
    deals: [
      { company: 'Catalyst Labs', value: '$67,200', contact: 'David Nguyen', source: 'Enterprise', days: 5, score: 94 },
      { company: 'CloudNine Tech', value: '$45,000', contact: 'Sarah Mitchell', source: 'Upsell', days: 3, score: 92 },
      { company: 'Atlas Digital', value: '$31,800', contact: 'Kevin Wright', source: 'Partner', days: 8, score: 87 },
    ],
  },
  {
    stage: 'Closed Won',
    color: 'border-emerald-500/40',
    pill: 'text-emerald-400',
    deals: [
      { company: 'Helix Corp', value: '$55,000', contact: 'Diana Lee', source: 'Renewed', days: 0, score: 98 },
      { company: 'Zenith Solutions', value: '$38,400', contact: 'Paul Martinez', source: 'Won', days: 0, score: 96 },
      { company: 'Vanguard Tech', value: '$72,000', contact: 'Rachel Adams', source: 'Won', days: 0, score: 99 },
    ],
  },
];

const sourceBadgeColors = {
  Inbound: 'bg-indigo-500/15 text-indigo-400',
  Referral: 'bg-cyan-500/15 text-cyan-400',
  Outbound: 'bg-zinc-700 text-zinc-300',
  LinkedIn: 'bg-blue-500/15 text-blue-400',
  Event: 'bg-violet-500/15 text-violet-400',
  'Cold Email': 'bg-zinc-700 text-zinc-300',
  Partner: 'bg-amber-500/15 text-amber-400',
  Enterprise: 'bg-indigo-500/15 text-indigo-400',
  Upsell: 'bg-emerald-500/15 text-emerald-400',
  Renewed: 'bg-emerald-500/15 text-emerald-400',
  Won: 'bg-emerald-500/15 text-emerald-400',
};

function scoreColor(score) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-zinc-400';
}

export function DemoGrowthPipeline({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="pipeline-board">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Pipeline Board</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Full pipeline view for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search deals...</span>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
            <Plus className="w-4 h-4" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Velocity Stats */}
      <div className="grid grid-cols-3 gap-4">
        {pipelineVelocity.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">{stat.value}</span>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((col) => {
          const stageTotal = col.deals.reduce((sum, d) => sum + parseInt(d.value.replace(/[$,]/g, ''), 10), 0);
          return (
            <div key={col.stage} className="min-w-[260px] flex-1 space-y-3">
              {/* Column Header */}
              <div className={`flex items-center justify-between pb-3 border-b-2 ${col.color}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${col.pill}`}>{col.stage}</span>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{col.deals.length}</span>
                </div>
                <span className="text-xs text-zinc-500">${(stageTotal / 1000).toFixed(0)}K</span>
              </div>

              {/* Deal Cards */}
              {col.deals.map((deal, i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{deal.company}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${sourceBadgeColors[deal.source] || 'bg-zinc-700 text-zinc-300'}`}>
                      {deal.source}
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
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${scoreColor(deal.score)}`}>AI {deal.score}</span>
                      {deal.days > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <Clock className="w-3 h-3" />
                          {deal.days}d
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  2.  DemoGrowthCampaigns                                                    */
/* ========================================================================== */

const campaignsData = [
  {
    name: 'Q1 Enterprise Outreach',
    type: 'Email',
    typeIcon: Mail,
    status: 'Active',
    prospects: 256,
    responseRate: 24,
    meetings: 12,
    conversion: 18,
  },
  {
    name: 'LinkedIn Decision-Makers',
    type: 'LinkedIn',
    typeIcon: Linkedin,
    status: 'Active',
    prospects: 142,
    responseRate: 31,
    meetings: 9,
    conversion: 22,
  },
  {
    name: 'Product-Led Nurture',
    type: 'Multi-channel',
    typeIcon: Layers,
    status: 'Active',
    prospects: 418,
    responseRate: 16,
    meetings: 18,
    conversion: 12,
  },
  {
    name: 'Partner Co-Sell Program',
    type: 'Email',
    typeIcon: Mail,
    status: 'Paused',
    prospects: 87,
    responseRate: 38,
    meetings: 6,
    conversion: 28,
  },
];

const responseBarData = [
  { campaign: 'Q1 Enterprise', rate: 24 },
  { campaign: 'LinkedIn DM', rate: 31 },
  { campaign: 'Product-Led', rate: 16 },
  { campaign: 'Partner Co-Sell', rate: 38 },
];

const activeSequences = [
  { name: 'Cold to Warm Pipeline', steps: 5, activeLeads: 128, status: 'Running' },
  { name: 'Re-engagement Series', steps: 3, activeLeads: 64, status: 'Running' },
  { name: 'Post-Demo Follow-up', steps: 4, activeLeads: 31, status: 'Running' },
];

export function DemoGrowthCampaigns({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="campaigns-list">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Megaphone className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Manage outreach campaigns for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {campaignsData.map((c) => (
          <div key={c.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                  <c.typeIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{c.type} campaign</p>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  c.status === 'Active'
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {c.status}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-sm font-bold text-white">{c.prospects}</p>
                <p className="text-[10px] text-zinc-500">Prospects</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{c.responseRate}%</p>
                <p className="text-[10px] text-zinc-500">Response</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{c.meetings}</p>
                <p className="text-[10px] text-zinc-500">Meetings</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{c.conversion}%</p>
                <p className="text-[10px] text-zinc-500">Conversion</p>
              </div>
            </div>
            {/* Conversion mini-bar */}
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500/70 rounded-full"
                style={{ width: `${c.conversion}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Response Rate Chart + Active Sequences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Rate Bar Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-5">Response Rate by Campaign</h2>
          <div className="space-y-4">
            {responseBarData.map((bar) => (
              <div key={bar.campaign} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{bar.campaign}</span>
                  <span className="text-xs font-semibold text-indigo-400">{bar.rate}%</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600/60 to-indigo-400/80 rounded-full"
                    style={{ width: `${bar.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Sequences */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-white font-semibold">Active Sequences</h2>
            </div>
            <span className="text-xs text-zinc-500">{activeSequences.length} running</span>
          </div>
          <div className="space-y-3">
            {activeSequences.map((seq) => (
              <div key={seq.name} className="border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{seq.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                    {seq.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{seq.steps} steps</span>
                  <span>{seq.activeLeads} active leads</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  3.  DemoGrowthSignals                                                      */
/* ========================================================================== */

const signalStats = [
  { label: 'Hot Signals', value: '12', icon: Zap, color: 'bg-red-500/15 text-red-400' },
  { label: 'At-Risk Accounts', value: '5', icon: AlertTriangle, color: 'bg-amber-500/15 text-amber-400' },
  { label: 'Expansion Triggers', value: '3', icon: ArrowUpRight, color: 'bg-emerald-500/15 text-emerald-400' },
];

const signalCategories = {
  'Buying Signal': { badge: 'bg-indigo-500/15 text-indigo-400', border: 'border-l-indigo-500' },
  'Churn Risk': { badge: 'bg-red-500/15 text-red-400', border: 'border-l-red-500' },
  'Expansion Opportunity': { badge: 'bg-emerald-500/15 text-emerald-400', border: 'border-l-emerald-500' },
  'Competitor Activity': { badge: 'bg-amber-500/15 text-amber-400', border: 'border-l-amber-500' },
};

const urgencyColors = {
  High: 'bg-red-500/15 text-red-400',
  Medium: 'bg-amber-500/15 text-amber-400',
  Low: 'bg-zinc-700 text-zinc-300',
};

const signalCards = [
  {
    company: 'TechVentures',
    type: 'Buying Signal',
    description: 'Visited pricing page 6 times this week. Two stakeholders opened proposal email.',
    urgency: 'High',
    action: 'Schedule a call with Alex Morgan to discuss enterprise pricing.',
  },
  {
    company: 'Meridian Health',
    type: 'Churn Risk',
    description: 'NPS dropped from 72 to 45. Support ticket volume increased 3x in 2 weeks.',
    urgency: 'High',
    action: 'Arrange executive check-in and offer dedicated support.',
  },
  {
    company: 'Summit Analytics',
    type: 'Expansion Opportunity',
    description: 'Announced EU expansion. Will need compliance and localization tooling.',
    urgency: 'Medium',
    action: 'Prepare EU-specific proposal with compliance add-ons.',
  },
  {
    company: 'DataBridge Corp',
    type: 'Competitor Activity',
    description: 'Competitor X launched similar feature at 20% lower price. DataBridge evaluating alternatives.',
    urgency: 'High',
    action: 'Proactive outreach with competitive comparison deck.',
  },
  {
    company: 'GreenLeaf Ventures',
    type: 'Buying Signal',
    description: 'Downloaded case study and ROI calculator. Demo request pending from CFO.',
    urgency: 'Medium',
    action: 'Fast-track demo scheduling for leadership team.',
  },
  {
    company: 'Orion Systems',
    type: 'Churn Risk',
    description: 'Usage dropped 40% month-over-month. Key champion left the company.',
    urgency: 'High',
    action: 'Identify new champion and schedule re-onboarding session.',
  },
  {
    company: 'Catalyst Labs',
    type: 'Expansion Opportunity',
    description: 'Team grew from 50 to 120 engineers. Current plan at capacity.',
    urgency: 'Medium',
    action: 'Present enterprise tier with volume pricing.',
  },
  {
    company: 'Pinnacle Group',
    type: 'Competitor Activity',
    description: 'Received demo from competitor Y. Internal Slack mentions evaluation timeline.',
    urgency: 'Low',
    action: 'Share customer success stories and schedule renewal discussion.',
  },
];

export function DemoGrowthSignals({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="signals-feed">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Zap className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Customer Signals</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Real-time buying and churn signals for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 cursor-default">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Signal Stats */}
      <div className="grid grid-cols-3 gap-4">
        {signalStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stat.color} shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">{stat.value}</span>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Signal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {signalCards.map((signal, i) => {
          const cat = signalCategories[signal.type];
          return (
            <div
              key={i}
              className={`bg-zinc-900/50 border border-zinc-800 border-l-2 ${cat.border} rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-colors`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-sm font-semibold text-white">{signal.company}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.badge}`}>{signal.type}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${urgencyColors[signal.urgency]}`}>{signal.urgency}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{signal.description}</p>
              <div className="flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-300">{signal.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  4.  DemoGrowthOpportunities                                                */
/* ========================================================================== */

const forecastSummary = [
  { label: 'Best Case', value: '$542K', color: 'text-emerald-400' },
  { label: 'Committed', value: '$312K', color: 'text-indigo-400' },
  { label: 'Pipeline', value: '$892K', color: 'text-zinc-300' },
];

const winLossData = [
  { label: 'Won', pct: 62, color: 'bg-emerald-500/70' },
  { label: 'Lost', pct: 24, color: 'bg-red-500/70' },
  { label: 'Stalled', pct: 14, color: 'bg-zinc-600' },
];

const opportunities = [
  { company: 'TechVentures', value: '$45,000', stage: 'Negotiation', probability: 85, close: 'Feb 18', owner: 'Alex M.', next: 'Final contract review' },
  { company: 'Catalyst Labs', value: '$67,200', stage: 'Proposal', probability: 70, close: 'Feb 24', owner: 'David N.', next: 'Present to CFO' },
  { company: 'Summit Analytics', value: '$41,000', stage: 'Qualified', probability: 45, close: 'Mar 08', owner: 'Priya S.', next: 'Technical deep-dive' },
  { company: 'Meridian Health', value: '$34,500', stage: 'Contacted', probability: 25, close: 'Mar 22', owner: 'Lisa T.', next: 'Discovery call' },
  { company: 'GreenLeaf Ventures', value: '$36,000', stage: 'Negotiation', probability: 90, close: 'Feb 14', owner: 'Nina P.', next: 'Sign contract' },
  { company: 'Orion Systems', value: '$52,000', stage: 'Proposal', probability: 65, close: 'Mar 01', owner: 'Emma W.', next: 'Stakeholder alignment' },
  { company: 'DataBridge Corp', value: '$22,500', stage: 'Qualified', probability: 40, close: 'Mar 15', owner: 'Michael C.', next: 'ROI analysis' },
  { company: 'Pinnacle Group', value: '$55,000', stage: 'Negotiation', probability: 80, close: 'Feb 20', owner: 'Robert K.', next: 'Legal review' },
];

const stageColors = {
  Negotiation: 'bg-amber-500/15 text-amber-400',
  Proposal: 'bg-violet-500/15 text-violet-400',
  Qualified: 'bg-indigo-500/15 text-indigo-400',
  Contacted: 'bg-cyan-500/15 text-cyan-400',
};

function probColor(p) {
  if (p >= 75) return 'text-emerald-400';
  if (p >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export function DemoGrowthOpportunities({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="opportunities-table">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Trophy className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Opportunities</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Track and manage open opportunities for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Add Opportunity
        </button>
      </div>

      {/* Forecast + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast Summary */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Forecast Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            {forecastSummary.map((f) => (
              <div key={f.label} className="text-center">
                <p className={`text-2xl font-bold ${f.color}`}>{f.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Win/Loss Analysis */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Win / Loss Analysis</h2>
          <div className="space-y-3">
            {winLossData.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{item.label}</span>
                  <span className="text-xs font-semibold text-zinc-300">{item.pct}%</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunity Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium text-center">Probability</th>
                <th className="px-4 py-3 font-medium">Expected Close</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Next Step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {opportunities.map((opp, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-sm font-medium text-white">{opp.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-emerald-400">{opp.value}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${stageColors[opp.stage]}`}>{opp.stage}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-bold ${probColor(opp.probability)}`}>{opp.probability}%</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <CalendarCheck className="w-3.5 h-3.5 text-zinc-500" />
                      {opp.close}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-zinc-400">{opp.owner}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-zinc-500">{opp.next}</span>
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
