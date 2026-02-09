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
  Users,
  MessageSquare,
  Send,
  Lightbulb,
  BookOpen,
  Globe,
  FileText,
  Smartphone,
  Star,
  ShoppingCart,
  Database,
  CheckCircle,
  XCircle,
  CreditCard,
  GitBranch,
  Play,
  Pause,
  PenTool,
  Hash,
  Bot,
  Cpu,
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

/* ========================================================================== */
/*  5.  DemoGrowthProspects                                                    */
/* ========================================================================== */

const prospectTabs = ['All', 'New', 'Engaged', 'Qualified'];

const prospectStats = [
  { label: 'Total Prospects', value: '1,247', icon: Users, color: 'bg-indigo-500/15 text-indigo-400' },
  { label: 'New This Week', value: '64', icon: ArrowUpRight, color: 'bg-cyan-500/15 text-cyan-400' },
  { label: 'Avg Lead Score', value: '72', icon: Target, color: 'bg-violet-500/15 text-violet-400' },
];

const prospectsData = [
  { name: 'Sarah Mitchell', company: 'CloudNine Tech', email: 'sarah@cloudnine.io', score: 92, stage: 'Qualified', source: 'LinkedIn', lastActivity: '2h ago' },
  { name: 'James Park', company: 'NovaTech Solutions', email: 'james@novatech.com', score: 78, stage: 'Engaged', source: 'Inbound', lastActivity: '4h ago' },
  { name: 'Priya Shah', company: 'Summit Analytics', email: 'priya@summit.io', score: 85, stage: 'Qualified', source: 'Referral', lastActivity: '1d ago' },
  { name: 'Carlos Diaz', company: 'UrbanEdge Media', email: 'carlos@urbanedge.co', score: 64, stage: 'Engaged', source: 'Cold Email', lastActivity: '3h ago' },
  { name: 'Hannah Cole', company: 'BlueRidge Capital', email: 'hannah@blueridge.com', score: 45, stage: 'New', source: 'Event', lastActivity: '6h ago' },
  { name: 'Tom Brady', company: 'Apex Dynamics', email: 'tom@apex.io', score: 71, stage: 'Engaged', source: 'Outbound', lastActivity: '12h ago' },
  { name: 'Aisha Patel', company: 'Quantum AI', email: 'aisha@quantumai.com', score: 88, stage: 'Qualified', source: 'LinkedIn', lastActivity: '30m ago' },
  { name: 'Robert Kim', company: 'Pinnacle Group', email: 'robert@pinnacle.co', score: 52, stage: 'New', source: 'Inbound', lastActivity: '2d ago' },
];

const prospectSourceBadge = {
  LinkedIn: 'bg-blue-500/15 text-blue-400',
  Inbound: 'bg-indigo-500/15 text-indigo-400',
  Referral: 'bg-cyan-500/15 text-cyan-400',
  'Cold Email': 'bg-zinc-700 text-zinc-300',
  Event: 'bg-violet-500/15 text-violet-400',
  Outbound: 'bg-zinc-700 text-zinc-300',
};

const prospectStageBadge = {
  New: 'bg-zinc-700 text-zinc-300',
  Engaged: 'bg-indigo-500/15 text-indigo-400',
  Qualified: 'bg-emerald-500/15 text-emerald-400',
};

function prospectScoreColor(s) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-amber-400';
  return 'text-zinc-400';
}

export function DemoGrowthProspects({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-prospects">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Prospects</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Manage and qualify prospects for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default hover:border-zinc-700">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Enrich All
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
            <Plus className="w-4 h-4" />
            Add Prospect
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {prospectStats.map((stat) => (
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

      {/* Filter Tabs + Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
          {prospectTabs.map((tab, i) => (
            <button
              key={tab}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-default ${
                i === 0
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
          <Search className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">Search prospects...</span>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5">
        <input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 cursor-default" readOnly />
        <span className="text-xs text-zinc-500">Select all</span>
        <div className="h-4 w-px bg-zinc-800" />
        <button className="text-xs text-zinc-400 hover:text-zinc-300 cursor-default">Assign Campaign</button>
        <button className="text-xs text-zinc-400 hover:text-zinc-300 cursor-default">Export</button>
        <button className="text-xs text-zinc-400 hover:text-zinc-300 cursor-default">Update Stage</button>
      </div>

      {/* Prospect Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium w-8"><input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 cursor-default" readOnly /></th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium text-center">Score</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {prospectsData.map((p, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5"><input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 cursor-default" readOnly /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-sm font-medium text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      {p.company}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-zinc-400">{p.email}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-bold ${prospectScoreColor(p.score)}`}>{p.score}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${prospectStageBadge[p.stage]}`}>{p.stage}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${prospectSourceBadge[p.source] || 'bg-zinc-700 text-zinc-300'}`}>{p.source}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      {p.lastActivity}
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

/* ========================================================================== */
/*  6.  DemoGrowthAssistant                                                    */
/* ========================================================================== */

const chatMessages = [
  { role: 'user', text: 'What are the best growth strategies for Q1 based on our current pipeline?' },
  {
    role: 'ai',
    text: 'Based on your pipeline analysis, I recommend three key strategies for Q1:\n\n1. **Double down on LinkedIn outreach** - Your LinkedIn campaigns have a 31% response rate, the highest across all channels. Consider increasing budget by 40%.\n\n2. **Accelerate partner referrals** - Partner Co-Sell has the best conversion rate at 28%. Activate 3 more partner relationships.\n\n3. **Re-engage stalled deals** - You have $127K in stalled opportunities. A targeted re-engagement sequence could recover 20-30% of that value.',
  },
  { role: 'user', text: 'Can you create a re-engagement campaign for stalled deals?' },
  {
    role: 'ai',
    text: 'I\'ve drafted a re-engagement campaign targeting 14 stalled deals worth $127K combined. Here\'s the plan:\n\n- **Sequence:** 3-touch email + LinkedIn follow-up\n- **Timing:** Day 1 → Day 4 → Day 8\n- **Personalization:** Each message references their last interaction and a new value proposition\n\nShall I activate this campaign now or would you like to review the templates first?',
  },
];

const suggestedActions = [
  { label: 'Create re-engagement campaign', icon: Megaphone },
  { label: 'Analyze win/loss patterns', icon: BarChart3 },
  { label: 'Score pipeline health', icon: Target },
  { label: 'Draft outreach templates', icon: Mail },
];

const aiInsights = [
  { title: 'Pipeline Velocity Declining', description: 'Average days to close increased 15% vs last quarter. Consider adding mid-funnel touchpoints.', type: 'warning' },
  { title: 'Top Performer Pattern', description: 'Deals with 3+ stakeholder meetings close 2.4x faster. Encourage multi-threading.', type: 'insight' },
  { title: 'Channel Opportunity', description: 'LinkedIn InMail response rates up 12% industry-wide. Optimal send time: Tuesday 10am.', type: 'opportunity' },
];

const insightTypeStyles = {
  warning: { badge: 'bg-amber-500/15 text-amber-400', icon: AlertTriangle },
  insight: { badge: 'bg-indigo-500/15 text-indigo-400', icon: Lightbulb },
  opportunity: { badge: 'bg-emerald-500/15 text-emerald-400', icon: ArrowUpRight },
};

export function DemoGrowthAssistant({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-assistant">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Growth Assistant</h1>
            <p className="text-zinc-400 text-sm mt-0.5">AI-powered growth strategy advisor for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 p-5 space-y-4 max-h-[480px] overflow-y-auto">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 h-fit">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-300'
                  }`}
                >
                  {msg.text.split('\n').map((line, li) => (
                    <p key={li} className={li > 0 ? 'mt-2' : ''}>
                      {line.split('**').map((seg, si) =>
                        si % 2 === 1 ? (
                          <span key={si} className="font-semibold text-white">{seg}</span>
                        ) : (
                          <span key={si}>{seg}</span>
                        )
                      )}
                    </p>
                  ))}
                </div>
                {msg.role === 'user' && (
                  <div className="p-2 rounded-xl bg-zinc-800 text-zinc-400 shrink-0 h-fit">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="border-t border-zinc-800 p-4">
            <div className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-500 flex-1">Ask your growth assistant...</span>
              <button className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-default">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Actions */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Suggested Actions</h2>
            <div className="space-y-2">
              {suggestedActions.map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors text-left cursor-default"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                    <action.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-zinc-300">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 ml-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent AI Insights */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Recent Insights</h2>
            <div className="space-y-3">
              {aiInsights.map((insight, i) => {
                const style = insightTypeStyles[insight.type];
                return (
                  <div key={i} className="border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors space-y-2">
                    <div className="flex items-center gap-2">
                      <style.icon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-medium text-white">{insight.title}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{insight.description}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.badge}`}>{insight.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  7.  DemoGrowthResearch                                                     */
/* ========================================================================== */

const researchTabs = ['Active', 'Completed'];

const researchCompanies = [
  {
    name: 'TechVentures Inc.',
    industry: 'Enterprise SaaS',
    size: '500-1000',
    contacts: ['Alex Morgan (CTO)', 'Diana Lee (VP Sales)'],
    news: ['Raised $45M Series C', 'Launched AI product suite'],
    status: 'active',
  },
  {
    name: 'Meridian Health',
    industry: 'Healthcare Tech',
    size: '1000-5000',
    contacts: ['Lisa Tran (CMO)', 'Mark Sullivan (CIO)'],
    news: ['Acquired HealthData.io', 'Expanding to EU market'],
    status: 'active',
  },
  {
    name: 'Summit Analytics',
    industry: 'Data Analytics',
    size: '200-500',
    contacts: ['Priya Shah (CEO)', 'Kevin Wu (Head of Eng)'],
    news: ['IPO filing announced', 'New partnership with AWS'],
    status: 'active',
  },
  {
    name: 'DataBridge Corp',
    industry: 'Cloud Infrastructure',
    size: '100-200',
    contacts: ['Michael Chen (Founder)', 'Sara Johns (VP Ops)'],
    news: ['Pivot to AI infrastructure', 'Hiring 50 engineers'],
    status: 'completed',
  },
  {
    name: 'Catalyst Labs',
    industry: 'Machine Learning',
    size: '50-100',
    contacts: ['David Nguyen (CEO)', 'Amy Foster (CRO)'],
    news: ['Won Best Startup 2025 award', 'Open-sourced ML framework'],
    status: 'completed',
  },
];

export function DemoGrowthResearch({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-research">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Globe className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Research Workspace</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Deep company research and intelligence for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
            <Cpu className="w-3.5 h-3.5" />
            AI Research Agent Active
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4">
        <Search className="w-5 h-5 text-zinc-500" />
        <span className="text-sm text-zinc-500 flex-1">Search companies, industries, or contacts...</span>
        <button className="text-xs text-indigo-400 bg-indigo-500/15 px-3 py-1.5 rounded-lg cursor-default">AI Search</button>
      </div>

      {/* Research Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 w-fit">
        {researchTabs.map((tab, i) => (
          <button
            key={tab}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-default ${
              i === 0
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Research Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {researchCompanies
          .filter((c) => c.status === 'active')
          .map((company) => (
            <div key={company.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
              {/* Company Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">{company.name}</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{company.industry}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">Researching</span>
              </div>

              {/* Company Size */}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Users className="w-3.5 h-3.5" />
                <span>{company.size} employees</span>
              </div>

              {/* Key Contacts */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Key Contacts</p>
                <div className="space-y-1.5">
                  {company.contacts.map((contact, ci) => (
                    <div key={ci} className="flex items-center gap-2 text-xs text-zinc-400">
                      <User className="w-3 h-3 text-zinc-600" />
                      {contact}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent News */}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Recent News</p>
                <div className="space-y-1.5">
                  {company.news.map((item, ni) => (
                    <div key={ni} className="flex items-start gap-2">
                      <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-zinc-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                <button className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg cursor-default hover:bg-indigo-500/20 transition-colors">
                  View Full Report
                </button>
                <button className="text-[10px] text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg cursor-default hover:bg-zinc-700 transition-colors">
                  Add to Campaign
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  8.  DemoGrowthTemplates                                                    */
/* ========================================================================== */

const templateCategories = ['All', 'Email', 'LinkedIn', 'SMS'];

const templateTypeIcons = {
  Email: Mail,
  LinkedIn: Linkedin,
  SMS: Smartphone,
};

const templateTypeBadge = {
  Email: 'bg-blue-500/15 text-blue-400',
  LinkedIn: 'bg-indigo-500/15 text-indigo-400',
  SMS: 'bg-violet-500/15 text-violet-400',
};

const templatesData = [
  { name: 'Cold Outreach - Decision Maker', type: 'Email', openRate: 42, responseRate: 18, lastUsed: '2d ago' },
  { name: 'Warm Introduction Follow-up', type: 'Email', openRate: 68, responseRate: 31, lastUsed: '1d ago' },
  { name: 'Connection Request - CTO', type: 'LinkedIn', openRate: 55, responseRate: 24, lastUsed: '4h ago' },
  { name: 'Event Follow-up Sequence', type: 'Email', openRate: 51, responseRate: 22, lastUsed: '3d ago' },
  { name: 'Quick Product Demo Ask', type: 'SMS', openRate: 89, responseRate: 15, lastUsed: '6h ago' },
  { name: 'Re-engagement - Stalled Deal', type: 'Email', openRate: 38, responseRate: 12, lastUsed: '1w ago' },
  { name: 'InMail - VP Engineering', type: 'LinkedIn', openRate: 47, responseRate: 19, lastUsed: '5d ago' },
  { name: 'Partnership Proposal Intro', type: 'Email', openRate: 44, responseRate: 26, lastUsed: '2d ago' },
];

function rateColor(rate) {
  if (rate >= 40) return 'text-emerald-400';
  if (rate >= 20) return 'text-amber-400';
  return 'text-zinc-400';
}

export function DemoGrowthTemplates({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-templates">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <FileText className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Templates</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Outreach template library for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 w-fit">
        {templateCategories.map((cat, i) => (
          <button
            key={cat}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-default ${
              i === 0
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templatesData.map((tpl) => {
          const TypeIcon = templateTypeIcons[tpl.type];
          return (
            <div key={tpl.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">{tpl.name}</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Last used {tpl.lastUsed}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${templateTypeBadge[tpl.type]}`}>{tpl.type}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                  <p className={`text-lg font-bold ${rateColor(tpl.openRate)}`}>{tpl.openRate}%</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Open Rate</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                  <p className={`text-lg font-bold ${rateColor(tpl.responseRate)}`}>{tpl.responseRate}%</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Response Rate</p>
                </div>
              </div>

              {/* Performance bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Performance</span>
                  <span className="text-[10px] text-indigo-400">{Math.round((tpl.openRate + tpl.responseRate) / 2)}% avg</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600/60 to-indigo-400/80 rounded-full"
                    style={{ width: `${Math.round((tpl.openRate + tpl.responseRate) / 2)}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                <button className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg cursor-default hover:bg-indigo-500/20 transition-colors">
                  Edit Template
                </button>
                <button className="text-[10px] text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg cursor-default hover:bg-zinc-700 transition-colors">
                  Duplicate
                </button>
                <button className="text-[10px] text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg cursor-default hover:bg-zinc-700 transition-colors">
                  Preview
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  9.  DemoGrowthNests                                                        */
/* ========================================================================== */

const nestTabs = ['Available', 'Purchased'];

const nestsData = [
  { name: 'SaaS Decision Makers - US', size: '2,450', industry: 'SaaS', price: '$299', matchScore: 92, purchased: false },
  { name: 'FinTech C-Suite Europe', size: '1,180', industry: 'FinTech', price: '$449', matchScore: 87, purchased: false },
  { name: 'Healthcare IT Leaders', size: '890', industry: 'Healthcare', price: '$349', matchScore: 78, purchased: false },
  { name: 'E-Commerce Growth Teams', size: '3,200', industry: 'E-Commerce', price: '$199', matchScore: 71, purchased: true },
  { name: 'AI/ML Startup Founders', size: '640', industry: 'AI/ML', price: '$599', matchScore: 95, purchased: true },
  { name: 'Enterprise DevOps Leads', size: '1,750', industry: 'DevOps', price: '$379', matchScore: 84, purchased: false },
];

const industryBadge = {
  SaaS: 'bg-indigo-500/15 text-indigo-400',
  FinTech: 'bg-blue-500/15 text-blue-400',
  Healthcare: 'bg-emerald-500/15 text-emerald-400',
  'E-Commerce': 'bg-amber-500/15 text-amber-400',
  'AI/ML': 'bg-violet-500/15 text-violet-400',
  DevOps: 'bg-cyan-500/15 text-cyan-400',
};

function matchColor(score) {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-indigo-400';
  return 'text-zinc-400';
}

export function DemoGrowthNests({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-nests">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Database className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Data Nests</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Browse and purchase prospect pools for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 w-fit">
        {nestTabs.map((tab, i) => (
          <button
            key={tab}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-default ${
              i === 0
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filter Sidebar */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-5 h-fit">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h2 className="text-white font-semibold text-sm">Filters</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Industry</p>
              <div className="space-y-2">
                {['SaaS', 'FinTech', 'Healthcare', 'E-Commerce', 'AI/ML', 'DevOps'].map((ind) => (
                  <label key={ind} className="flex items-center gap-2 text-xs text-zinc-400 cursor-default">
                    <input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 cursor-default" readOnly />
                    {ind}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Pool Size</p>
              <div className="space-y-2">
                {['< 500', '500-1000', '1000-2500', '2500+'].map((size) => (
                  <label key={size} className="flex items-center gap-2 text-xs text-zinc-400 cursor-default">
                    <input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 cursor-default" readOnly />
                    {size}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Match Score</p>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500/70 rounded-full" style={{ width: '75%' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-zinc-600">0%</span>
                <span className="text-[10px] text-indigo-400">75%+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nest Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {nestsData
            .filter((n) => !n.purchased)
            .map((nest) => (
              <div key={nest.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-medium text-white">{nest.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${industryBadge[nest.industry] || 'bg-zinc-700 text-zinc-300'}`}>
                        {nest.industry}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${matchColor(nest.matchScore)}`}>{nest.matchScore}%</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800/40 rounded-xl p-2.5 text-center">
                    <p className="text-sm font-bold text-white">{nest.size}</p>
                    <p className="text-[10px] text-zinc-500">Prospects</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-xl p-2.5 text-center">
                    <p className="text-sm font-bold text-indigo-400">{nest.price}</p>
                    <p className="text-[10px] text-zinc-500">Price</p>
                  </div>
                </div>

                {/* Match score bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Match Score</span>
                    <span className={`text-[10px] font-semibold ${matchColor(nest.matchScore)}`}>{nest.matchScore}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600/60 to-indigo-400/80 rounded-full"
                      style={{ width: `${nest.matchScore}%` }}
                    />
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-colors cursor-default">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Buy Nest
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  10.  DemoGrowthEnrich                                                      */
/* ========================================================================== */

const enrichStats = [
  { label: 'Enriched Today', value: '142', icon: CheckCircle, color: 'bg-emerald-500/15 text-emerald-400' },
  { label: 'Success Rate', value: '94%', icon: Target, color: 'bg-indigo-500/15 text-indigo-400' },
  { label: 'Credits Remaining', value: '8,450', icon: CreditCard, color: 'bg-violet-500/15 text-violet-400' },
];

const enrichQueue = [
  { contact: 'Sarah Mitchell', company: 'CloudNine Tech', status: 'Completed', dataPoints: 24, source: 'LinkedIn + Email' },
  { contact: 'James Park', company: 'NovaTech Solutions', status: 'Completed', dataPoints: 18, source: 'LinkedIn' },
  { contact: 'Carlos Diaz', company: 'UrbanEdge Media', status: 'Processing', dataPoints: 12, source: 'Email' },
  { contact: 'Hannah Cole', company: 'BlueRidge Capital', status: 'Processing', dataPoints: 8, source: 'LinkedIn' },
  { contact: 'Tom Brady', company: 'Apex Dynamics', status: 'Queued', dataPoints: 0, source: 'Pending' },
  { contact: 'Aisha Patel', company: 'Quantum AI', status: 'Queued', dataPoints: 0, source: 'Pending' },
  { contact: 'Robert Kim', company: 'Pinnacle Group', status: 'Failed', dataPoints: 0, source: 'LinkedIn' },
  { contact: 'Nina Patel', company: 'GreenLeaf Ventures', status: 'Completed', dataPoints: 21, source: 'LinkedIn + Email' },
];

const enrichStatusStyles = {
  Completed: { badge: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle },
  Processing: { badge: 'bg-indigo-500/15 text-indigo-400', icon: Clock },
  Queued: { badge: 'bg-zinc-700 text-zinc-300', icon: Clock },
  Failed: { badge: 'bg-red-500/15 text-red-400', icon: XCircle },
};

export function DemoGrowthEnrich({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-enrich">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Enrichment</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Enrich prospect data with AI-powered intelligence for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
          <Zap className="w-4 h-4" />
          Start Enrichment
        </button>
      </div>

      {/* Enrichment Stats */}
      <div className="grid grid-cols-3 gap-4">
        {enrichStats.map((stat) => (
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

      {/* Progress Overview */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Current Batch Progress</h2>
          <span className="text-xs text-indigo-400">5 / 8 completed</span>
        </div>
        <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-600/60 to-indigo-400/80 rounded-full" style={{ width: '62.5%' }} />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> 3 completed</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-400" /> 2 processing</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-500" /> 2 queued</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> 1 failed</span>
        </div>
      </div>

      {/* Enrichment Queue Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">Data Points</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {enrichQueue.map((item, idx) => {
                const statusStyle = enrichStatusStyles[item.status];
                return (
                  <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="text-sm font-medium text-white">{item.contact}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                        {item.company}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${statusStyle.badge}`}>
                        <statusStyle.icon className="w-3 h-3" />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-sm font-bold ${item.dataPoints > 0 ? 'text-white' : 'text-zinc-600'}`}>
                        {item.dataPoints}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-500">{item.source}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  11.  DemoGrowthFlows                                                       */
/* ========================================================================== */

const flowStatusStyles = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Paused: 'bg-amber-500/15 text-amber-400',
  Draft: 'bg-zinc-700 text-zinc-300',
};

const flowStatusIcons = {
  Active: Play,
  Paused: Pause,
  Draft: PenTool,
};

const flowsData = [
  { name: 'New Lead Qualification', trigger: 'New prospect added', status: 'Active', lastRun: '2h ago', executions: 1247 },
  { name: 'Deal Stage Notifications', trigger: 'Pipeline stage change', status: 'Active', lastRun: '30m ago', executions: 892 },
  { name: 'Re-engagement Drip', trigger: '14 days inactive', status: 'Active', lastRun: '4h ago', executions: 456 },
  { name: 'Meeting Booked Follow-up', trigger: 'Calendar event created', status: 'Paused', lastRun: '3d ago', executions: 234 },
  { name: 'Win/Loss Survey', trigger: 'Deal closed', status: 'Active', lastRun: '1d ago', executions: 178 },
  { name: 'Onboarding Sequence', trigger: 'Contract signed', status: 'Draft', lastRun: 'Never', executions: 0 },
];

const flowBuilderNodes = [
  { id: 'trigger', label: 'Trigger', sub: 'New prospect', x: 60, y: 40 },
  { id: 'condition', label: 'Condition', sub: 'Score >= 70?', x: 60, y: 120 },
  { id: 'action1', label: 'Send Email', sub: 'Welcome template', x: 20, y: 200 },
  { id: 'action2', label: 'Add Tag', sub: 'High-intent', x: 100, y: 200 },
  { id: 'wait', label: 'Wait 2 days', sub: 'Delay', x: 60, y: 280 },
  { id: 'action3', label: 'Notify Rep', sub: 'Slack message', x: 60, y: 360 },
];

export function DemoGrowthFlows({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="growth-flows">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/20">
            <GitBranch className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Automation Flows</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Build and manage automation workflows for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Create Flow
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flow Cards */}
        <div className="lg:col-span-2 space-y-4">
          {flowsData.map((flow) => {
            const StatusIcon = flowStatusIcons[flow.status];
            return (
              <div key={flow.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{flow.name}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Trigger: {flow.trigger}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${flowStatusStyles[flow.status]}`}>
                    <StatusIcon className="w-3 h-3" />
                    {flow.status}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last run: {flow.lastRun}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{flow.executions.toLocaleString()} executions</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow Builder Visual Mock */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-white font-semibold text-sm">Flow Builder</h2>
            </div>
            <span className="text-[10px] text-zinc-500">Preview</span>
          </div>

          {/* Visual Flow Diagram */}
          <div className="relative" style={{ height: '420px' }}>
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
              {/* trigger -> condition */}
              <line x1="50%" y1="60" x2="50%" y2="100" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.3" />
              {/* condition -> action1 */}
              <line x1="50%" y1="150" x2="25%" y2="180" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.3" />
              {/* condition -> action2 */}
              <line x1="50%" y1="150" x2="75%" y2="180" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.3" />
              {/* action1 -> wait */}
              <line x1="25%" y1="230" x2="50%" y2="260" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.3" />
              {/* action2 -> wait */}
              <line x1="75%" y1="230" x2="50%" y2="260" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.3" />
              {/* wait -> action3 */}
              <line x1="50%" y1="310" x2="50%" y2="340" stroke="#6366f1" strokeWidth="2" strokeOpacity="0.3" />
            </svg>

            {/* Trigger Node */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '20px', zIndex: 1 }}>
              <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-4 py-2 text-center min-w-[120px]">
                <p className="text-[10px] font-semibold text-indigo-400">Trigger</p>
                <p className="text-[9px] text-zinc-500">New prospect</p>
              </div>
            </div>

            {/* Condition Node */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '100px', zIndex: 1 }}>
              <div className="bg-amber-600/15 border border-amber-500/30 rounded-xl px-4 py-2 text-center min-w-[120px]">
                <p className="text-[10px] font-semibold text-amber-400">Condition</p>
                <p className="text-[9px] text-zinc-500">Score &gt;= 70?</p>
              </div>
            </div>

            {/* Action 1 (Left) */}
            <div className="absolute left-1/4 -translate-x-1/2" style={{ top: '180px', zIndex: 1 }}>
              <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-center min-w-[100px]">
                <p className="text-[10px] font-semibold text-white">Send Email</p>
                <p className="text-[9px] text-zinc-500">Welcome</p>
              </div>
            </div>

            {/* Action 2 (Right) */}
            <div className="absolute left-3/4 -translate-x-1/2" style={{ top: '180px', zIndex: 1 }}>
              <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-center min-w-[100px]">
                <p className="text-[10px] font-semibold text-white">Add Tag</p>
                <p className="text-[9px] text-zinc-500">High-intent</p>
              </div>
            </div>

            {/* Wait Node */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '260px', zIndex: 1 }}>
              <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2 text-center min-w-[120px]">
                <p className="text-[10px] font-semibold text-white">Wait 2 days</p>
                <p className="text-[9px] text-zinc-500">Delay</p>
              </div>
            </div>

            {/* Action 3 */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '340px', zIndex: 1 }}>
              <div className="bg-emerald-600/15 border border-emerald-500/30 rounded-xl px-4 py-2 text-center min-w-[120px]">
                <p className="text-[10px] font-semibold text-emerald-400">Notify Rep</p>
                <p className="text-[9px] text-zinc-500">Slack message</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
