import {
  Brain,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Star,
  Zap,
  Shield,
  Building2,
  Briefcase,
  Users,
  Send,
  Mail,
  MessageSquare,
  Target,
  Eye,
  ArrowRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const scoreColor = (score) => {
  if (score >= 90) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score >= 80) return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
  if (score >= 70) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-zinc-400 bg-zinc-700/50 border-zinc-600';
};

const intelligenceStyles = {
  'High flight risk': { color: 'text-red-400 bg-red-500/10', icon: AlertTriangle },
  'M&A activity at employer': { color: 'text-amber-400 bg-amber-500/10', icon: TrendingUp },
  'Recently promoted': { color: 'text-emerald-400 bg-emerald-500/10', icon: Star },
  'Open to opportunities': { color: 'text-cyan-400 bg-cyan-500/10', icon: Zap },
};

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const statPills = [
  { label: 'Total Candidates', value: '847' },
  { label: 'Active Campaigns', value: '6' },
  { label: 'Response Rate', value: '23%' },
  { label: 'Interviews', value: '18' },
  { label: 'Offers', value: '4' },
  { label: 'Hired', value: '2' },
  { label: 'Avg Match', value: '78%' },
  { label: 'Pipeline Value', value: '$2.4M' },
];

const pipelineStages = [
  { label: 'New', count: 284, pct: 34, color: 'from-red-600/50 to-red-400/70' },
  { label: 'Contacted', count: 196, pct: 23, color: 'from-red-600/40 to-red-400/60' },
  { label: 'Responded', count: 142, pct: 17, color: 'from-red-500/40 to-red-400/55' },
  { label: 'Screening', count: 98, pct: 12, color: 'from-red-500/35 to-red-300/50' },
  { label: 'Interview', count: 52, pct: 6, color: 'from-red-400/35 to-red-300/50' },
  { label: 'Offer', count: 28, pct: 3, color: 'from-red-400/30 to-red-300/45' },
  { label: 'Hired', count: 18, pct: 2, color: 'from-emerald-500/40 to-emerald-400/60' },
  { label: 'Rejected', count: 29, pct: 3, color: 'from-zinc-600/40 to-zinc-500/50' },
];

const campaigns = [
  {
    name: 'Senior Engineers Q1',
    role: 'Senior Backend Engineer',
    matched: 84,
    sent: 62,
    responseRate: 28,
    status: 'Active',
  },
  {
    name: 'Product Leadership',
    role: 'VP of Product',
    matched: 36,
    sent: 24,
    responseRate: 19,
    status: 'Active',
  },
  {
    name: 'Data Science Expansion',
    role: 'Lead Data Scientist',
    matched: 52,
    sent: 41,
    responseRate: 22,
    status: 'Paused',
  },
];

const intelDistribution = [
  { level: 'Critical', count: 42, color: 'bg-red-500' },
  { level: 'High', count: 128, color: 'bg-amber-500' },
  { level: 'Medium', count: 318, color: 'bg-cyan-500' },
  { level: 'Low', count: 359, color: 'bg-zinc-600' },
];

const campaignStatusStyles = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Paused: 'bg-amber-500/15 text-amber-400',
  Completed: 'bg-zinc-700/50 text-zinc-400',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoTalent({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const candidates = [
    {
      name: 'Elena Rodriguez',
      title: 'VP of Engineering',
      company: 'Stripe',
      score: 92,
      skills: ['System Design', 'Team Leadership', 'Go', 'Kubernetes'],
      intelligence: 'High flight risk',
      outreachAngle: 'Reference their recent talk at QCon about scaling distributed teams.',
      avatar: 'ER',
    },
    {
      name: 'David Kim',
      title: 'Head of Product',
      company: companyName,
      score: 85,
      skills: ['Product Strategy', 'Analytics', 'B2B SaaS', 'GTM'],
      intelligence: 'M&A activity at employer',
      outreachAngle: 'Mention the opportunity for strategic ownership post-acquisition.',
      avatar: 'DK',
    },
    {
      name: 'Sophia Nguyen',
      title: 'Senior Data Scientist',
      company: 'Meta',
      score: 78,
      skills: ['ML/AI', 'Python', 'NLP', 'Data Pipelines'],
      intelligence: 'Recently promoted',
      outreachAngle: 'Congratulate on the promotion, position as next-level challenge.',
      avatar: 'SN',
    },
    {
      name: 'Marcus Johnson',
      title: 'Director of Sales',
      company: 'HubSpot',
      score: 71,
      skills: ['Enterprise Sales', 'Negotiation', 'CRM', 'Team Building'],
      intelligence: 'Open to opportunities',
      outreachAngle: 'Lead with equity upside and ability to build a team from scratch.',
      avatar: 'MJ',
    },
  ];

  /* SVG ring constants */
  const ringSize = 100;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const responseRate = 23;
  const ringOffset = ringCircumference - (responseRate / 100) * ringCircumference;

  const intelMax = Math.max(...intelDistribution.map((d) => d.count));

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* ---- Page Header ---- */}
      <div data-demo="talent-header" className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/20">
          <Brain className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Talent Intelligence</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">
            AI-driven candidate sourcing and outreach for {companyName}.
          </p>
        </div>
      </div>

      {/* ---- Stat Pills Row ---- */}
      <div
        data-demo="talent-stats"
        className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none"
      >
        {statPills.map((pill) => (
          <div
            key={pill.label}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800"
          >
            <span className="text-sm font-bold text-white">{pill.value}</span>
            <span className="text-xs text-zinc-500 whitespace-nowrap">{pill.label}</span>
          </div>
        ))}
      </div>

      {/* ---- Response Rate Ring + Pipeline Stages ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Response Rate Ring */}
        <div
          data-demo="response-rate"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center"
        >
          <h2 className="text-white font-semibold mb-4 self-start">Response Rate</h2>
          <div className="relative">
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              {/* Background circle */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="rgba(63, 63, 70, 0.5)"
                strokeWidth={ringStroke}
              />
              {/* Progress arc */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="url(#redGradient)"
                strokeWidth={ringStroke}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
              <defs>
                <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{responseRate}%</span>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-zinc-400">Sent: 268</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-300" />
              <span className="text-zinc-400">Replied: 62</span>
            </span>
          </div>
        </div>

        {/* Pipeline Stages Bars */}
        <div
          data-demo="pipeline-stages"
          className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-5">Pipeline Stages</h2>
          <div className="space-y-3">
            {pipelineStages.map((stage) => (
              <div key={stage.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-20 text-right flex-shrink-0">
                  {stage.label}
                </span>
                <div className="flex-1 h-5 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                    style={{ width: `${stage.pct}%`, minWidth: stage.pct > 0 ? '8px' : '0px' }}
                  />
                </div>
                <span className="text-xs text-zinc-300 font-mono w-8 text-right flex-shrink-0">
                  {stage.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Top Candidates Grid ---- */}
      <div data-demo="candidates" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((candidate) => {
          const intel = intelligenceStyles[candidate.intelligence];
          const IntelIcon = intel.icon;

          return (
            <div
              key={candidate.name}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4"
            >
              {/* Top row: avatar, info, score */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300">
                    {candidate.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{candidate.name}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-0.5">
                      <Briefcase className="w-3 h-3" />
                      {candidate.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs mt-0.5">
                      <Building2 className="w-3 h-3" />
                      {candidate.company}
                    </div>
                  </div>
                </div>
                <div
                  data-demo="match-score"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${scoreColor(candidate.score)}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {candidate.score}%
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Intelligence Signal */}
              <div
                data-demo="intelligence"
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${intel.color}`}
              >
                <IntelIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{candidate.intelligence}</span>
                <Shield className="w-3 h-3 ml-auto opacity-50" />
              </div>

              {/* Best outreach angle */}
              <div className="px-3 py-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                <p className="text-[11px] text-zinc-500 mb-0.5 font-medium uppercase tracking-wider">
                  Best Outreach Angle
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">{candidate.outreachAngle}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/50 cursor-default hover:bg-zinc-700/50 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  View Profile
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/20 cursor-default hover:bg-red-500/25 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                  Start Outreach
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Active Campaigns + Intelligence Distribution ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns */}
        <div
          data-demo="campaigns"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Active Campaigns</h2>
            <span className="text-xs text-red-400 cursor-default">View all</span>
          </div>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.name}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{campaign.name}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${campaignStatusStyles[campaign.status]}`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{campaign.role}</p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{campaign.matched}</p>
                    <p className="text-[10px] text-zinc-500">Matched</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{campaign.sent}</p>
                    <p className="text-[10px] text-zinc-500">Sent</p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-500">Response</span>
                      <span className="text-xs font-bold text-red-400">{campaign.responseRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                        style={{ width: `${campaign.responseRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Distribution */}
        <div
          data-demo="intel-distribution"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-5">Intelligence Distribution</h2>
          <div className="space-y-4">
            {intelDistribution.map((item) => (
              <div key={item.level}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-400">{item.level}</span>
                  <span className="text-xs font-mono text-zinc-300">{item.count}</span>
                </div>
                <div className="w-full h-3 bg-zinc-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.count / intelMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total candidates with intel</span>
              <span className="text-sm font-bold text-white">
                {intelDistribution.reduce((sum, d) => sum + d.count, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
