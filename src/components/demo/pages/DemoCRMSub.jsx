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
  Truck,
  Handshake,
  Award,
  UserCheck,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  CreditCard,
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
            <p className="text-zinc-400 text-sm mt-0.5">Company profiles and intelligence for {companyName}.</p>
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

/* ========================================================================== */
/*  5.  DemoCRMSuppliers                                                       */
/* ========================================================================== */

const supplierStats = [
  { label: 'Total Suppliers', value: '48', icon: Truck },
  { label: 'Active', value: '36', icon: CheckCircle2 },
  { label: 'Pending Review', value: '7', icon: Clock },
  { label: 'Total Products', value: '1,240', icon: Package },
];

const supplierStatusColors = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  'Under Review': 'bg-amber-500/15 text-amber-400',
  Inactive: 'bg-zinc-700 text-zinc-300',
  Suspended: 'bg-red-500/15 text-red-400',
};

const suppliers = [
  { name: 'NovaParts Ltd', contact: 'James Rivera', products: 124, paymentTerms: 'Net 30', status: 'Active', lastOrder: '2 days ago' },
  { name: 'Meridian Supply Co', contact: 'Anna Chen', products: 89, paymentTerms: 'Net 45', status: 'Active', lastOrder: '1 week ago' },
  { name: 'TechSource Global', contact: 'Erik Johansson', products: 312, paymentTerms: 'Net 60', status: 'Active', lastOrder: '3 days ago' },
  { name: 'GreenLeaf Materials', contact: 'Sofia Patel', products: 56, paymentTerms: 'Net 30', status: 'Under Review', lastOrder: '2 weeks ago' },
  { name: 'Atlas Components', contact: 'David Kim', products: 201, paymentTerms: 'Net 45', status: 'Active', lastOrder: '5 days ago' },
  { name: 'Pinnacle Logistics', contact: 'Maria Gonzalez', products: 78, paymentTerms: 'Net 30', status: 'Inactive', lastOrder: '2 months ago' },
  { name: 'BlueStar Electronics', contact: 'Tom Park', products: 145, paymentTerms: 'Net 60', status: 'Active', lastOrder: '1 day ago' },
  { name: 'Orion Chemicals', contact: 'Linda Muller', products: 67, paymentTerms: 'Net 45', status: 'Suspended', lastOrder: '3 months ago' },
];

export function DemoCRMSuppliers({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="suppliers-table">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Truck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Suppliers</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Manage supplier relationships for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search suppliers...</span>
          </div>
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 cursor-default">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {supplierStats.map((stat) => (
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

      {/* Supplier Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium text-center">Products</th>
                <th className="px-4 py-3 font-medium">Payment Terms</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Order</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {suppliers.map((s) => (
                <tr key={s.name} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-cyan-400">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-white">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                      <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {s.contact}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-bold text-white">{s.products}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400">{s.paymentTerms}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${supplierStatusColors[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {s.lastOrder}
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
/*  6.  DemoCRMPartners                                                        */
/* ========================================================================== */

const partnerStats = [
  { label: 'Total Partners', value: '24', icon: Handshake },
  { label: 'Revenue Generated', value: '$1.2M', icon: DollarSign },
  { label: 'Active Deals', value: '18', icon: TrendingUp },
  { label: 'Avg Partner Score', value: '82', icon: Star },
];

const partnerTypeColors = {
  Reseller: 'bg-cyan-500/15 text-cyan-400',
  Referral: 'bg-violet-500/15 text-violet-400',
  Technology: 'bg-blue-500/15 text-blue-400',
};

const tierColors = {
  Gold: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Silver: 'bg-zinc-600/20 text-zinc-300 border-zinc-500/30',
  Bronze: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const partners = [
  { name: 'TechVentures Partners', type: 'Reseller', revenue: '$320K', status: 'Active', tier: 'Gold', deals: 12 },
  { name: 'Summit Referral Network', type: 'Referral', revenue: '$185K', status: 'Active', tier: 'Silver', deals: 8 },
  { name: 'DataBridge Integration', type: 'Technology', revenue: '$210K', status: 'Active', tier: 'Gold', deals: 5 },
  { name: 'Meridian Consulting', type: 'Referral', revenue: '$95K', status: 'Active', tier: 'Bronze', deals: 4 },
  { name: 'Apex Cloud Solutions', type: 'Technology', revenue: '$150K', status: 'Inactive', tier: 'Silver', deals: 3 },
  { name: 'Pinnacle Resellers', type: 'Reseller', revenue: '$275K', status: 'Active', tier: 'Gold', deals: 9 },
];

export function DemoCRMPartners({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="partners-grid">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Handshake className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Partners</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Partner program management for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {partnerStats.map((stat) => (
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

      {/* Partner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((p) => (
          <div key={p.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-400">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${partnerTypeColors[p.type]}`}>{p.type}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${tierColors[p.tier]}`}>{p.tier}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-lg font-bold text-emerald-400">{p.revenue}</p>
                <p className="text-[10px] text-zinc-500">Revenue Generated</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{p.deals}</p>
                <p className="text-[10px] text-zinc-500">Active Deals</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <span className={`text-xs px-2.5 py-1 rounded-full ${p.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-300'}`}>
                {p.status}
              </span>
              <button className="text-xs text-cyan-400 cursor-default hover:underline flex items-center gap-1">
                View Details <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  7.  DemoCRMCandidatesCRM                                                   */
/* ========================================================================== */

const crmCandidateStats = [
  { label: 'Total Candidates', value: '312', icon: Users },
  { label: 'In Pipeline', value: '87', icon: Target },
  { label: 'Interviews Scheduled', value: '14', icon: Calendar },
  { label: 'Offers Sent', value: '5', icon: Mail },
];

const crmPipelineStages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];

const crmCandidates = [
  { name: 'Elena Rodriguez', position: 'Senior Engineer', stage: 'Interview', source: 'LinkedIn', applied: 'Jan 15, 2026' },
  { name: 'James Park', position: 'Product Manager', stage: 'Screening', source: 'Referral', applied: 'Jan 18, 2026' },
  { name: 'Sophia Nguyen', position: 'Data Scientist', stage: 'Offer', source: 'Job Board', applied: 'Jan 10, 2026' },
  { name: 'Marcus Johnson', position: 'UX Designer', stage: 'Applied', source: 'Website', applied: 'Jan 22, 2026' },
  { name: 'Aisha Patel', position: 'DevOps Engineer', stage: 'Interview', source: 'LinkedIn', applied: 'Jan 12, 2026' },
  { name: 'Tom van der Berg', position: 'Senior Engineer', stage: 'Hired', source: 'Referral', applied: 'Dec 20, 2025' },
  { name: 'Laura Chen', position: 'Frontend Developer', stage: 'Screening', source: 'Job Board', applied: 'Jan 20, 2026' },
  { name: 'David Kim', position: 'Engineering Manager', stage: 'Applied', source: 'LinkedIn', applied: 'Jan 24, 2026' },
];

const crmStageColors = {
  Applied: 'bg-zinc-700 text-zinc-300',
  Screening: 'bg-cyan-500/15 text-cyan-400',
  Interview: 'bg-blue-500/15 text-blue-400',
  Offer: 'bg-violet-500/15 text-violet-400',
  Hired: 'bg-emerald-500/15 text-emerald-400',
};

const crmSourceBadge = {
  LinkedIn: 'bg-blue-500/15 text-blue-400',
  Referral: 'bg-violet-500/15 text-violet-400',
  'Job Board': 'bg-cyan-500/15 text-cyan-400',
  Website: 'bg-zinc-700 text-zinc-300',
};

export function DemoCRMCandidatesCRM({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="crm-candidates-table">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <UserCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Candidates</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Track candidate applications for {companyName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search candidates...</span>
          </div>
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 cursor-default">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {crmCandidateStats.map((stat) => (
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

      {/* Pipeline Stages */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Pipeline Stages</h2>
        <div className="flex items-center gap-2">
          {crmPipelineStages.map((stage) => {
            const count = crmCandidates.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex-1 text-center p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <p className="text-lg font-bold text-white">{count}</p>
                <p className="text-[10px] text-zinc-500">{stage}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Applied Date</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {crmCandidates.map((c) => (
                <tr key={c.name} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                        {c.name.split(' ').map((w) => w[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {c.position}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${crmStageColors[c.stage]}`}>{c.stage}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${crmSourceBadge[c.source] || 'bg-zinc-700 text-zinc-300'}`}>{c.source}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {c.applied}
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
/*  8.  DemoCRMTargets                                                         */
/* ========================================================================== */

const targetStats = [
  { label: 'Target Accounts', value: '32', icon: Target },
  { label: 'ICP Match', value: '78%', icon: Shield },
  { label: 'Assigned Reps', value: '8', icon: Users },
  { label: 'Avg Score', value: '76', icon: BarChart3 },
];

const targets = [
  { name: 'TechVentures', industry: 'SaaS', size: '500-1K', score: 94, rep: 'Sarah Mitchell', icpMatch: true, strategy: 'Enterprise-level engagement through VP of Eng connection' },
  { name: 'Meridian Health', industry: 'HealthTech', size: '1K-5K', score: 88, rep: 'James Park', icpMatch: true, strategy: 'Product demo for clinical trial module' },
  { name: 'Summit Analytics', industry: 'Analytics', size: '50-200', score: 82, rep: 'Lisa Tran', icpMatch: true, strategy: 'Content-led nurture, data whitepaper sent' },
  { name: 'DataBridge Corp', industry: 'Data Infra', size: '200-500', score: 71, rep: 'Carlos Diaz', icpMatch: false, strategy: 'Evaluate fit after Q2 budget cycle' },
  { name: 'Catalyst Labs', industry: 'AI/ML', size: '50-200', score: 65, rep: 'Nina Patel', icpMatch: true, strategy: 'AI integration partnership discussion' },
  { name: 'Orion Systems', industry: 'Enterprise', size: '1K-5K', score: 58, rep: 'Michael Chen', icpMatch: false, strategy: 'Long-term play, modernization pitch' },
];

export function DemoCRMTargets({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="targets-grid">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Target className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Target Accounts</h1>
            <p className="text-zinc-400 text-sm mt-0.5">High-value target accounts for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {targetStats.map((stat) => (
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

      {/* Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targets.map((t) => (
          <div key={t.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-[10px] text-zinc-500">{t.industry}</p>
                </div>
              </div>
              <ScoreRing score={t.score} size={48} />
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                {t.size}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                {t.rep}
              </div>
            </div>

            {/* ICP Match Indicator */}
            <div className="flex items-center gap-2">
              {t.icpMatch ? (
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  ICP Match
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Partial Match
                </span>
              )}
            </div>

            {/* Strategy Notes */}
            <div className="pt-3 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 mb-1">Strategy</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{t.strategy}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  9.  DemoCRMImport                                                          */
/* ========================================================================== */

const importHistory = [
  { file: 'q1_leads_2026.csv', format: 'CSV', records: 1240, status: 'Completed', date: 'Jan 20, 2026', duplicates: 34 },
  { file: 'linkedin_export.csv', format: 'LinkedIn', records: 567, status: 'Completed', date: 'Jan 15, 2026', duplicates: 12 },
  { file: 'conference_contacts.xlsx', format: 'Excel', records: 89, status: 'Completed', date: 'Jan 10, 2026', duplicates: 5 },
  { file: 'partner_referrals.csv', format: 'CSV', records: 156, status: 'Failed', date: 'Jan 8, 2026', duplicates: 0 },
];

const importStatusColors = {
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Failed: 'bg-red-500/15 text-red-400',
  Processing: 'bg-amber-500/15 text-amber-400',
};

const supportedFormats = [
  { name: 'CSV', icon: FileSpreadsheet, desc: 'Comma-separated values' },
  { name: 'Excel', icon: FileSpreadsheet, desc: '.xlsx and .xls files' },
  { name: 'LinkedIn', icon: Globe, desc: 'LinkedIn export format' },
];

const fieldMappingPreview = [
  { source: 'Full Name', target: 'Name', matched: true },
  { source: 'Email Address', target: 'Email', matched: true },
  { source: 'Company', target: 'Company', matched: true },
  { source: 'Job Title', target: 'Title', matched: true },
  { source: 'Phone Number', target: 'Phone', matched: true },
  { source: 'Custom Field 1', target: '--', matched: false },
];

export function DemoCRMImport({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6" data-demo="import-wizard">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Upload className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Import Contacts</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Import contacts into {companyName} CRM.</p>
          </div>
        </div>
      </div>

      {/* Upload Area + Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Drop Zone */}
        <div className="lg:col-span-2 bg-zinc-900/50 border-2 border-dashed border-zinc-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-cyan-500/30 transition-colors cursor-default">
          <div className="p-4 rounded-2xl bg-cyan-500/10">
            <Upload className="w-10 h-10 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Drop your file here</p>
            <p className="text-sm text-zinc-500 mt-1">or click to browse</p>
          </div>
          <p className="text-xs text-zinc-600">Supports CSV, Excel (.xlsx), and LinkedIn exports. Max 50MB.</p>
        </div>

        {/* Supported Formats */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Supported Formats</h2>
          <div className="space-y-3">
            {supportedFormats.map((fmt) => (
              <div key={fmt.name} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <fmt.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{fmt.name}</p>
                  <p className="text-[10px] text-zinc-500">{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Field Mapping Preview */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Field Mapping Preview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fieldMappingPreview.map((field) => (
            <div
              key={field.source}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                field.matched ? 'bg-zinc-800/30 border-zinc-700/40' : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{field.source}</span>
                <ArrowRight className="w-3 h-3 text-zinc-600" />
                <span className={`text-xs font-medium ${field.matched ? 'text-cyan-400' : 'text-zinc-600'}`}>{field.target}</span>
              </div>
              {field.matched ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Import History */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Import History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium text-center">Records</th>
                <th className="px-4 py-3 font-medium text-center">Duplicates</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {importHistory.map((imp) => (
                <tr key={imp.file} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-sm font-medium text-white">{imp.file}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{imp.format}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-bold text-white">{imp.records.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm text-zinc-400">{imp.duplicates}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${importStatusColors[imp.status]}`}>{imp.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {imp.date}
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
