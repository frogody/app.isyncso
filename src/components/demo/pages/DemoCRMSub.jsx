import {
  Users,
  UserPlus,
  User,
  Building2,
  Mail,
  Phone,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Target,
  Star,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Heart,
  Briefcase,
  Globe,
  Cpu,
  Banknote,
  ChevronRight,
  Eye,
  MessageSquare,
  BarChart3,
  MapPin,
  Calendar,
  Shield,
} from 'lucide-react';

/* ── Score Ring (SVG) ──────────────────────────────────────────── */
function ScoreRing({ score, size = 48 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = score >= 80 ? '#22d3ee' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(63,63,70,0.5)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{score}</span>
    </div>
  );
}

function scoreColor(score) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 60) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

/* ========================================================================== */
/*  1.  DemoCRMLeads                                                           */
/* ========================================================================== */

const funnelStages = [
  { label: 'New', count: 156, pct: 100, shade: 'bg-cyan-400/30' },
  { label: 'MQL', count: 89, pct: 57, shade: 'bg-cyan-400/45' },
  { label: 'SQL', count: 42, pct: 27, shade: 'bg-cyan-500/55' },
  { label: 'Opportunity', count: 18, pct: 12, shade: 'bg-cyan-600/70' },
];

const leadScoring = [
  { label: 'Hot', count: 12, color: 'bg-red-500/15 text-red-400', dot: 'bg-red-400' },
  { label: 'Warm', count: 28, color: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-400' },
  { label: 'Cold', count: 45, color: 'bg-zinc-700 text-zinc-300', dot: 'bg-zinc-400' },
];

const leads = [
  { name: 'Sarah Mitchell', company: 'TechVentures', score: 94, source: 'Website', status: 'Hot', lastActivity: '1 hour ago' },
  { name: 'James Park', company: 'NovaTech', score: 88, source: 'LinkedIn', status: 'Hot', lastActivity: '3 hours ago' },
  { name: 'Lisa Tran', company: 'Meridian Health', score: 82, source: 'Referral', status: 'Hot', lastActivity: '5 hours ago' },
  { name: 'Carlos Diaz', company: 'UrbanEdge', score: 71, source: 'Webinar', status: 'Warm', lastActivity: '1 day ago' },
  { name: 'Nina Patel', company: 'GreenLeaf', score: 65, source: 'Cold Email', status: 'Warm', lastActivity: '2 days ago' },
  { name: 'Michael Chen', company: 'DataBridge', score: 58, source: 'Event', status: 'Warm', lastActivity: '3 days ago' },
  { name: 'Emma Wilson', company: 'Orion Systems', score: 42, source: 'Ads', status: 'Cold', lastActivity: '5 days ago' },
  { name: 'David Nguyen', company: 'Catalyst Labs', score: 31, source: 'Website', status: 'Cold', lastActivity: '1 week ago' },
];

const statusColors = {
  Hot: 'bg-red-500/15 text-red-400',
  Warm: 'bg-amber-500/15 text-amber-400',
  Cold: 'bg-zinc-700 text-zinc-300',
};

const sourceBadge = {
  Website: 'bg-cyan-500/15 text-cyan-400',
  LinkedIn: 'bg-blue-500/15 text-blue-400',
  Referral: 'bg-violet-500/15 text-violet-400',
  Webinar: 'bg-indigo-500/15 text-indigo-400',
  'Cold Email': 'bg-zinc-700 text-zinc-300',
  Event: 'bg-amber-500/15 text-amber-400',
  Ads: 'bg-zinc-700 text-zinc-300',
};

export function DemoCRMLeads({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="leads-table">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Target className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Leads</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Track and qualify incoming leads for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search leads...</span>
          </div>
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 cursor-default">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Funnel + Scoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Funnel */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-5">Lead Funnel</h2>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-20 text-right shrink-0">{stage.label}</span>
                <div className="flex-1 h-9 bg-zinc-800/50 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full ${stage.shade} rounded-lg flex items-center justify-end pr-3`}
                    style={{ width: `${stage.pct}%` }}
                  >
                    {stage.pct > 20 && (
                      <span className="text-xs font-semibold text-white/90">{stage.count}</span>
                    )}
                  </div>
                  {stage.pct <= 20 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-300">{stage.count}</span>
                  )}
                </div>
                {i > 0 && (
                  <span className="text-[10px] text-zinc-600 w-14 shrink-0">
                    {Math.round((stage.count / funnelStages[i - 1].count) * 100)}% conv
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lead Scoring Breakdown */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-5">Lead Scoring</h2>
          <div className="space-y-4">
            {leadScoring.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${bucket.dot} shrink-0`} />
                <span className="text-sm text-zinc-300 w-14">{bucket.label}</span>
                <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bucket.dot}`}
                    style={{ width: `${Math.round((bucket.count / 85) * 100)}%`, opacity: 0.6 }}
                  />
                </div>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${bucket.color}`}>{bucket.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium text-center">Score</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {leads.map((lead) => (
                <tr key={lead.name} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                        {lead.name.split(' ').map((w) => w[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-white">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {lead.company}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-lg min-w-[36px] ${scoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${sourceBadge[lead.source] || 'bg-zinc-700 text-zinc-300'}`}>{lead.source}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[lead.status]}`}>{lead.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {lead.lastActivity}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 cursor-default"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 cursor-default"><Mail className="w-3.5 h-3.5" /></button>
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
/*  2.  DemoCRMProspects                                                       */
/* ========================================================================== */

const prospectStats = [
  { label: 'Total Prospects', value: '156', icon: Users },
  { label: 'Enriched', value: '89', icon: Sparkles },
  { label: 'Engaged', value: '34', icon: MessageSquare },
  { label: 'Converting', value: '12', icon: TrendingUp },
];

const prospectFilters = ['All', 'Engaged', 'Not Contacted', 'High Score'];

const prospects = [
  { name: 'Alex Morgan', company: 'TechVentures', title: 'VP of Engineering', enriched: true, lastContacted: '2 days ago', score: 91 },
  { name: 'Priya Shah', company: 'Summit Analytics', title: 'Co-Founder & CEO', enriched: true, lastContacted: '1 week ago', score: 78 },
  { name: 'Tom Brady', company: 'Apex Dynamics', title: 'Head of Product', enriched: false, lastContacted: 'Never', score: 65 },
  { name: 'Hannah Cole', company: 'BlueRidge Capital', title: 'Managing Director', enriched: true, lastContacted: '3 days ago', score: 84 },
  { name: 'Marco Silva', company: 'PineVista Labs', title: 'CTO', enriched: true, lastContacted: '5 days ago', score: 72 },
  { name: 'Aisha Patel', company: 'Quantum AI', title: 'Director of Growth', enriched: false, lastContacted: 'Never', score: 58 },
];

export function DemoCRMProspects({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="prospects-grid">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <UserPlus className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Prospects</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Prospect pipeline for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {prospectStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 shrink-0">
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">{stat.value}</span>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {prospectFilters.map((f, i) => (
          <button
            key={f}
            className={`text-xs px-3 py-1.5 rounded-lg cursor-default transition-colors ${
              i === 0
                ? 'bg-cyan-500/15 text-cyan-400'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Prospect Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {prospects.map((p) => (
          <div key={p.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 shrink-0">
                {p.name.split(' ').map((w) => w[0]).join('')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{p.title}</p>
                  </div>
                  <ScoreRing score={p.score} size={48} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{p.company}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    {p.enriched ? (
                      <span className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        Enriched
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-600">Not enriched</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {p.lastContacted}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  3.  DemoCRMCustomers                                                       */
/* ========================================================================== */

const healthOverview = [
  { label: 'Healthy', pct: 78, color: 'bg-emerald-500', textColor: 'text-emerald-400', dot: 'bg-emerald-400' },
  { label: 'At-Risk', pct: 15, color: 'bg-amber-500', textColor: 'text-amber-400', dot: 'bg-amber-400' },
  { label: 'Churning', pct: 7, color: 'bg-red-500', textColor: 'text-red-400', dot: 'bg-red-400' },
];

const revenueMetrics = [
  { label: 'Total MRR', value: '$287K', color: 'text-white' },
  { label: 'Expansion', value: '$42K', color: 'text-emerald-400' },
  { label: 'Churn', value: '$8K', color: 'text-red-400' },
  { label: 'Net New', value: '$34K', color: 'text-cyan-400' },
];

const customers = [
  { company: 'TechVentures', contact: 'Sarah Mitchell', mrr: '$12,500', health: 92, nps: 78, lastActivity: '2 hours ago', contractEnd: 'Aug 2026' },
  { company: 'Meridian Health', contact: 'Lisa Tran', mrr: '$8,200', health: 85, nps: 72, lastActivity: '1 day ago', contractEnd: 'Jun 2026' },
  { company: 'Summit Analytics', contact: 'Priya Shah', mrr: '$15,000', health: 74, nps: 65, lastActivity: '3 days ago', contractEnd: 'Sep 2026' },
  { company: 'DataBridge Corp', contact: 'Michael Chen', mrr: '$6,800', health: 68, nps: 58, lastActivity: '5 days ago', contractEnd: 'Apr 2026' },
  { company: 'Catalyst Labs', contact: 'David Nguyen', mrr: '$22,400', health: 91, nps: 82, lastActivity: '6 hours ago', contractEnd: 'Dec 2026' },
  { company: 'Orion Systems', contact: 'Emma Wilson', mrr: '$9,100', health: 45, nps: 32, lastActivity: '2 weeks ago', contractEnd: 'Mar 2026' },
  { company: 'Pinnacle Group', contact: 'Robert Kim', mrr: '$18,000', health: 88, nps: 75, lastActivity: '1 day ago', contractEnd: 'Nov 2026' },
  { company: 'GreenLeaf Ventures', contact: 'Nina Patel', mrr: '$5,200', health: 35, nps: 28, lastActivity: '3 weeks ago', contractEnd: 'Feb 2026' },
];

function healthColor(score) {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function healthBg(score) {
  if (score >= 75) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 50) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

export function DemoCRMCustomers({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="customers-table">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Heart className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Customers</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Customer health and revenue for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Health Overview + Revenue Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Overview */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Customer Health</h2>
          {/* Stacked bar */}
          <div className="h-4 rounded-full overflow-hidden flex mb-4">
            {healthOverview.map((h) => (
              <div key={h.label} className={`${h.color}`} style={{ width: `${h.pct}%`, opacity: 0.7 }} />
            ))}
          </div>
          <div className="flex items-center gap-6">
            {healthOverview.map((h) => (
              <div key={h.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${h.dot}`} />
                <span className="text-xs text-zinc-400">{h.label}</span>
                <span className={`text-xs font-bold ${h.textColor}`}>{h.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Revenue Metrics</h2>
          <div className="grid grid-cols-4 gap-4">
            {revenueMetrics.map((m) => (
              <div key={m.label} className="text-center">
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium text-center">Health</th>
                <th className="px-4 py-3 font-medium text-center">NPS</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
                <th className="px-4 py-3 font-medium">Contract End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {customers.map((c) => (
                <tr key={c.company} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-sm font-medium text-white">{c.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-zinc-400">{c.contact}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-emerald-400">{c.mrr}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-lg min-w-[36px] ${healthBg(c.health)}`}>
                      {c.health}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-bold ${healthColor(c.nps)}`}>{c.nps}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {c.lastActivity}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {c.contractEnd}
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
/*  4.  DemoCRMCompanies                                                       */
/* ========================================================================== */

const companyFilters = ['Industry', 'Size', 'Funding Stage', 'Location'];

const companies = [
  { name: 'TechVentures', industry: 'SaaS', employees: '500-1K', techStack: ['React', 'AWS', 'Python'], funding: 'Series C', location: 'San Francisco' },
  { name: 'Meridian Health', industry: 'HealthTech', employees: '1K-5K', techStack: ['Java', 'Azure', 'Terraform'], funding: 'Series D', location: 'Boston' },
  { name: 'Summit Analytics', industry: 'Analytics', employees: '50-200', techStack: ['Python', 'Snowflake', 'dbt'], funding: 'Series A', location: 'New York' },
  { name: 'DataBridge Corp', industry: 'Data Infra', employees: '200-500', techStack: ['Go', 'K8s', 'Kafka'], funding: 'Series B', location: 'Austin' },
  { name: 'Catalyst Labs', industry: 'AI/ML', employees: '50-200', techStack: ['PyTorch', 'GCP', 'Rust'], funding: 'Series A', location: 'Seattle' },
  { name: 'Orion Systems', industry: 'Enterprise', employees: '1K-5K', techStack: ['Java', 'Oracle', 'SAP'], funding: 'Public', location: 'Chicago' },
  { name: 'Pinnacle Group', industry: 'FinTech', employees: '200-500', techStack: ['Scala', 'AWS', 'Redis'], funding: 'Series C', location: 'London' },
  { name: 'GreenLeaf Ventures', industry: 'CleanTech', employees: '10-50', techStack: ['React', 'Node', 'IoT'], funding: 'Seed', location: 'Amsterdam' },
  { name: 'Quantum AI', industry: 'AI/ML', employees: '50-200', techStack: ['Python', 'JAX', 'TPUs'], funding: 'Series B', location: 'Toronto' },
];

const fundingColors = {
  Seed: 'bg-zinc-700 text-zinc-300',
  'Series A': 'bg-cyan-500/15 text-cyan-400',
  'Series B': 'bg-blue-500/15 text-blue-400',
  'Series C': 'bg-violet-500/15 text-violet-400',
  'Series D': 'bg-indigo-500/15 text-indigo-400',
  Public: 'bg-emerald-500/15 text-emerald-400',
};

const selectedCompany = companies[0];

export function DemoCRMCompanies({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="companies-grid">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Building2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Companies</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Company profiles and intelligence.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search companies...</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {companyFilters.map((f) => (
          <button
            key={f}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300 cursor-default transition-colors"
          >
            <Filter className="w-3 h-3" />
            {f}
          </button>
        ))}
      </div>

      {/* Grid + Sidebar */}
      <div className="flex gap-6">
        {/* Company Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-w-0">
          {companies.map((c, idx) => (
            <div
              key={c.name}
              className={`bg-zinc-900/50 border rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-colors cursor-default ${
                idx === 0 ? 'border-cyan-500/30' : 'border-zinc-800'
              }`}
            >
              {/* Logo Placeholder + Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-zinc-500">{c.industry}</p>
                </div>
              </div>

              {/* Employee Count */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                {c.employees} employees
              </div>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-1">
                {c.techStack.map((tech) => (
                  <span key={tech} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{tech}</span>
                ))}
              </div>

              {/* Funding + Location */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${fundingColors[c.funding] || 'bg-zinc-700 text-zinc-300'}`}>
                  {c.funding}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <MapPin className="w-3 h-3" />
                  {c.location}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company Intel Sidebar */}
        <div className="hidden xl:block w-80 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-5 shrink-0 self-start">
          {/* Company Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg font-bold text-cyan-400">
              {selectedCompany.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{selectedCompany.name}</p>
              <p className="text-xs text-zinc-400">{selectedCompany.industry}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              {selectedCompany.employees} employees
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              {selectedCompany.location}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Banknote className="w-3.5 h-3.5 text-zinc-500" />
              {selectedCompany.funding}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              techventures.io
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Tech Stack</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedCompany.techStack.map((tech) => (
                <span key={tech} className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{tech}</span>
              ))}
            </div>
          </div>

          {/* Key Intelligence */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Intelligence</h3>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span className="text-xs text-zinc-400 leading-relaxed">Engineering team grew 40% in the last 6 months</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span className="text-xs text-zinc-400 leading-relaxed">Migrating from monolith to microservices architecture</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span className="text-xs text-zinc-400 leading-relaxed">Budget cycle resets in Q2 -- decision window approaching</span>
              </li>
            </ul>
          </div>

          {/* Contacts at Company */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Contacts</h3>
            </div>
            <div className="space-y-2">
              {['Sarah Mitchell', 'Alex Morgan'].map((name) => (
                <div key={name} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-300">
                    {name.split(' ').map((w) => w[0]).join('')}
                  </div>
                  <span className="text-xs text-zinc-300">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
