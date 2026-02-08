import {
  Users,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Download,
  Plus,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  Linkedin,
  Eye,
  MoreHorizontal,
  Briefcase,
  Building2,
  MapPin,
  Target,
  FolderKanban,
  UserPlus,
  BarChart3,
  ShoppingCart,
  Star,
  Zap,
  TrendingUp,
  ArrowUpRight,
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

const flightRiskStyle = (level) => {
  if (level === 'Critical') return 'text-red-400 bg-red-500/15';
  if (level === 'High') return 'text-amber-400 bg-amber-500/15';
  if (level === 'Medium') return 'text-cyan-400 bg-cyan-500/15';
  return 'text-zinc-400 bg-zinc-700/50';
};

const statusStyle = (status) => {
  const map = {
    Open: 'bg-emerald-500/15 text-emerald-400',
    Filled: 'bg-zinc-700/50 text-zinc-400',
    'On Hold': 'bg-amber-500/15 text-amber-400',
    Active: 'bg-emerald-500/15 text-emerald-400',
    Paused: 'bg-amber-500/15 text-amber-400',
    Draft: 'bg-zinc-700/50 text-zinc-400',
    Completed: 'bg-cyan-500/15 text-cyan-400',
    Delivered: 'bg-emerald-500/15 text-emerald-400',
    Read: 'bg-cyan-500/15 text-cyan-400',
    Replied: 'bg-red-400 bg-red-500/15 text-red-400',
    Pending: 'bg-amber-500/15 text-amber-400',
    Bounced: 'bg-red-500/15 text-red-400',
  };
  return map[status] || 'bg-zinc-700/50 text-zinc-400';
};

const channelIcon = (ch) => {
  if (ch === 'Email') return Mail;
  if (ch === 'LinkedIn') return Linkedin;
  if (ch === 'SMS') return Smartphone;
  return Mail;
};

/* ================================================================== */
/*  1. DemoTalentCandidates                                           */
/* ================================================================== */

export function DemoTalentCandidates({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Total Candidates', value: '1,247', icon: Users },
    { label: 'Enriched', value: '892', icon: Sparkles },
    { label: 'Matched', value: '156', icon: Target },
    { label: 'In Pipeline', value: '42', icon: FolderKanban },
  ];

  const filters = ['All', 'High Match', 'High Flight Risk', 'Recently Enriched'];

  const candidates = [
    { name: 'Elena Rodriguez', title: 'VP of Engineering', company: 'Stripe', location: 'San Francisco, CA', score: 95, flightRisk: 'Critical', enriched: true, avatar: 'ER' },
    { name: 'David Kim', title: 'Head of Product', company: companyName, location: 'New York, NY', score: 88, flightRisk: 'High', enriched: true, avatar: 'DK' },
    { name: 'Sophia Nguyen', title: 'Senior Data Scientist', company: 'Meta', location: 'London, UK', score: 82, flightRisk: 'Medium', enriched: true, avatar: 'SN' },
    { name: 'Marcus Johnson', title: 'Director of Sales', company: 'HubSpot', location: 'Boston, MA', score: 76, flightRisk: 'High', enriched: false, avatar: 'MJ' },
    { name: 'Aisha Patel', title: 'Staff Engineer', company: 'Google', location: 'Austin, TX', score: 71, flightRisk: 'Low', enriched: true, avatar: 'AP' },
    { name: 'Tom van der Berg', title: 'CTO', company: 'DataBridge', location: 'Amsterdam, NL', score: 65, flightRisk: 'Medium', enriched: true, avatar: 'TB' },
    { name: 'Laura Chen', title: 'Product Manager', company: 'Shopify', location: 'Toronto, CA', score: 53, flightRisk: 'Low', enriched: false, avatar: 'LC' },
    { name: 'James Park', title: 'Engineering Manager', company: 'Netflix', location: 'Los Angeles, CA', score: 45, flightRisk: 'Low', enriched: true, avatar: 'JP' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/20">
            <Users className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Candidate Database</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Browse and manage your candidate pipeline.</p>
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
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`text-xs px-3.5 py-1.5 rounded-full cursor-default transition-colors ${
                i === 0 ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-default hover:bg-zinc-800/50">
            <Sparkles className="w-3.5 h-3.5" /> Enrich Selected
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-default hover:bg-zinc-800/50">
            <Send className="w-3.5 h-3.5" /> Add to Campaign
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-default hover:bg-zinc-800/50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Candidate Table */}
      <div data-demo="candidates-table" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-center">Match Score</th>
                <th className="px-4 py-3 font-medium">Flight Risk</th>
                <th className="px-4 py-3 font-medium">Enrichment</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {candidates.map((c) => {
                const ringSize = 40;
                const ringStroke = 4;
                const ringRadius = (ringSize - ringStroke) / 2;
                const ringCirc = 2 * Math.PI * ringRadius;
                const ringOffset = ringCirc - (c.score / 100) * ringCirc;
                const ringColor = c.score >= 80 ? '#f87171' : c.score >= 60 ? '#fbbf24' : '#71717a';

                return (
                  <tr key={c.name} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                          {c.avatar}
                        </div>
                        <span className="text-sm font-medium text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{c.title}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        {c.company}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3" />
                        {c.location}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center">
                        <div className="relative" style={{ width: ringSize, height: ringSize }}>
                          <svg width={ringSize} height={ringSize} className="-rotate-90">
                            <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="rgba(63,63,70,0.5)" strokeWidth={ringStroke} />
                            <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={ringColor} strokeWidth={ringStroke} strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{c.score}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${flightRiskStyle(c.flightRisk)}`}>
                        {c.flightRisk}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.enriched ? (
                        <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full w-fit">
                          <Sparkles className="w-3 h-3" /> Enriched
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">Not enriched</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 cursor-default"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 cursor-default"><Send className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 cursor-default"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                      </div>
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

/* ================================================================== */
/*  2. DemoTalentProjects                                             */
/* ================================================================== */

export function DemoTalentProjects({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Open Roles', value: '7', icon: Briefcase },
    { label: 'Avg Time to Fill', value: '23 days', icon: Clock },
    { label: 'Offer Acceptance', value: '84%', icon: CheckCircle2 },
  ];

  const projects = [
    {
      title: 'Senior Backend Engineer',
      department: 'Engineering',
      status: 'Open',
      candidates: 84,
      hiringManager: 'Sarah Mitchell',
      daysOpen: 12,
      pipeline: { Sourced: 42, Screened: 22, Interview: 12, Offer: 5, Hired: 3 },
    },
    {
      title: 'VP of Product',
      department: 'Product',
      status: 'Open',
      candidates: 36,
      hiringManager: 'David Kim',
      daysOpen: 28,
      pipeline: { Sourced: 18, Screened: 10, Interview: 5, Offer: 2, Hired: 1 },
    },
    {
      title: 'Lead Data Scientist',
      department: 'Data',
      status: 'On Hold',
      candidates: 52,
      hiringManager: 'Sophia Nguyen',
      daysOpen: 45,
      pipeline: { Sourced: 30, Screened: 14, Interview: 6, Offer: 2, Hired: 0 },
    },
    {
      title: 'Head of Design',
      department: 'Design',
      status: 'Filled',
      candidates: 28,
      hiringManager: 'Marcus Johnson',
      daysOpen: 19,
      pipeline: { Sourced: 12, Screened: 8, Interview: 5, Offer: 2, Hired: 1 },
    },
  ];

  const pipelineColors = {
    Sourced: 'bg-red-600/50',
    Screened: 'bg-red-500/50',
    Interview: 'bg-red-400/50',
    Offer: 'bg-red-300/50',
    Hired: 'bg-emerald-500/50',
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/20">
          <FolderKanban className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Recruitment Projects</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">Track open roles and hiring pipelines at {companyName}.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Project Cards */}
      <div data-demo="projects-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => {
          const total = Object.values(project.pipeline).reduce((a, b) => a + b, 0);
          return (
            <div key={project.title} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm">{project.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{project.department}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${statusStyle(project.status)}`}>
                  {project.status}
                </span>
              </div>

              {/* Mini pipeline bar */}
              <div>
                <div className="flex items-center h-3 rounded-full overflow-hidden bg-zinc-800/50">
                  {Object.entries(project.pipeline).map(([stage, count]) => (
                    <div
                      key={stage}
                      className={`h-full ${pipelineColors[stage]}`}
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  {Object.entries(project.pipeline).map(([stage, count]) => (
                    <div key={stage} className="text-center">
                      <p className="text-xs font-bold text-white">{count}</p>
                      <p className="text-[10px] text-zinc-500">{stage}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  <span>{project.candidates} candidates</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{project.daysOpen} days open</span>
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                Hiring Manager: <span className="text-white">{project.hiringManager}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  3. DemoTalentCampaigns                                            */
/* ================================================================== */

export function DemoTalentCampaigns({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Active Campaigns', value: '4' },
    { label: 'Avg Response Rate', value: '24%' },
    { label: 'Meetings Booked', value: '18' },
  ];

  const campaigns = [
    { name: 'Senior Engineers Q1', role: 'Senior Backend Engineer', type: 'Email', status: 'Active', candidates: 84, responseRate: 28, openRate: 62, meetingRate: 12 },
    { name: 'Product Leadership', role: 'VP of Product', type: 'LinkedIn', status: 'Active', candidates: 36, responseRate: 19, openRate: 54, meetingRate: 8 },
    { name: 'Data Science Expansion', role: 'Lead Data Scientist', type: 'Email', status: 'Paused', candidates: 52, responseRate: 22, openRate: 58, meetingRate: 10 },
    { name: 'Design Outreach', role: 'Head of Design', type: 'LinkedIn', status: 'Completed', candidates: 28, responseRate: 31, openRate: 71, meetingRate: 15 },
    { name: 'Sales Leadership', role: 'Director of Sales', type: 'SMS', status: 'Active', candidates: 42, responseRate: 15, openRate: 45, meetingRate: 6 },
    { name: 'DevOps Hiring', role: 'DevOps Lead', type: 'Email', status: 'Draft', candidates: 0, responseRate: 0, openRate: 0, meetingRate: 0 },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/20">
            <Send className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Outreach Campaigns</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Manage recruitment campaigns for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {/* Stats pills */}
      <div className="flex items-center gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800">
            <span className="text-sm font-bold text-white">{s.value}</span>
            <span className="text-xs text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Campaign Table */}
      <div data-demo="talent-campaigns" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">Candidates</th>
                <th className="px-4 py-3 font-medium">Performance</th>
                <th className="px-4 py-3 font-medium text-center">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {campaigns.map((c) => {
                const ChIcon = channelIcon(c.type);
                return (
                  <tr key={c.name} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-white">{c.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{c.role}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <ChIcon className="w-3.5 h-3.5" /> {c.type}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${statusStyle(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-bold text-white">{c.candidates}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs font-bold text-white">{c.openRate}%</p>
                          <p className="text-[10px] text-zinc-500">Open</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-red-400">{c.responseRate}%</p>
                          <p className="text-[10px] text-zinc-500">Reply</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-white">{c.meetingRate}%</p>
                          <p className="text-[10px] text-zinc-500">Meeting</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button className="text-xs text-red-400 cursor-default hover:underline">View</button>
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

/* ================================================================== */
/*  4. DemoTalentNests                                                */
/* ================================================================== */

export function DemoTalentNests({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const marketplaceNests = [
    { name: 'Senior Engineers Europe', description: 'Top backend and fullstack engineers across EU markets.', candidates: 1420, industries: ['SaaS', 'Fintech'], price: '$299', avgScore: 82, topCompanies: ['Stripe', 'Adyen', 'Klarna'], avgExp: '8 yrs' },
    { name: 'Product Managers NYC', description: 'Experienced PMs in the New York metro area.', candidates: 680, industries: ['E-commerce', 'Media'], price: '$199', avgScore: 76, topCompanies: ['Google', 'Meta', 'Shopify'], avgExp: '6 yrs' },
    { name: 'Data Scientists', description: 'ML and data professionals with production experience.', candidates: 920, industries: ['AI/ML', 'Analytics'], price: '$349', avgScore: 85, topCompanies: ['OpenAI', 'DeepMind', 'Netflix'], avgExp: '5 yrs' },
    { name: 'DevOps Specialists', description: 'Cloud infrastructure and platform engineering talent.', candidates: 540, industries: ['Cloud', 'SaaS'], price: '$249', avgScore: 79, topCompanies: ['AWS', 'Datadog', 'HashiCorp'], avgExp: '7 yrs' },
    { name: 'Sales Leaders EMEA', description: 'Enterprise sales leaders across Europe and Middle East.', candidates: 380, industries: ['Enterprise', 'B2B'], price: '$179', avgScore: 71, topCompanies: ['Salesforce', 'SAP', 'Oracle'], avgExp: '10 yrs' },
    { name: 'UX Researchers', description: 'User research and design strategy professionals.', candidates: 290, industries: ['Design', 'Product'], price: '$149', avgScore: 74, topCompanies: ['Apple', 'Figma', 'Spotify'], avgExp: '4 yrs' },
  ];

  const myNests = [
    { name: 'Senior Engineers Europe', candidates: 1420, purchased: 'Jan 15, 2026', enriched: 892 },
    { name: 'Data Scientists', candidates: 920, purchased: 'Jan 22, 2026', enriched: 614 },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/20">
          <ShoppingCart className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Candidate Nests</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">Browse and purchase curated candidate pools.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button className="px-4 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium cursor-default">Marketplace</button>
        <button className="px-4 py-1.5 rounded-lg text-zinc-400 text-sm cursor-default hover:bg-zinc-800/50">My Nests (2)</button>
      </div>

      {/* Marketplace Grid */}
      <div data-demo="nests-marketplace" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketplaceNests.map((nest) => (
          <div key={nest.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-white font-semibold text-sm">{nest.name}</h3>
              <span className="text-sm font-bold text-red-400">{nest.price}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{nest.description}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-lg font-bold text-white">{nest.candidates.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">Candidates</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{nest.avgExp}</p>
                <p className="text-[10px] text-zinc-500">Avg Experience</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 mb-1.5">Top Companies</p>
              <div className="flex flex-wrap gap-1">
                {nest.topCompanies.map((c) => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">{c}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {nest.industries.map((ind) => (
                  <span key={ind} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">{ind}</span>
                ))}
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-bold ${scoreColor(nest.avgScore)}`}>
                <Star className="w-3 h-3" /> {nest.avgScore}
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/20 cursor-default hover:bg-red-500/25 transition-colors">
              <ShoppingCart className="w-3.5 h-3.5" /> Purchase Nest
            </button>
          </div>
        ))}
      </div>

      {/* My Nests Section */}
      <div>
        <h2 className="text-white font-semibold mb-4">My Nests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myNests.map((nest) => (
            <div key={nest.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/15 text-red-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{nest.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{nest.candidates.toLocaleString()} candidates -- {nest.enriched} enriched</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Purchased {nest.purchased}</p>
              </div>
              <button className="text-xs text-red-400 cursor-default hover:underline flex items-center gap-1">
                View <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  5. DemoTalentOutreach                                             */
/* ================================================================== */

export function DemoTalentOutreach({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const perfStats = [
    { label: 'Messages Sent', value: '342', icon: Send },
    { label: 'Open Rate', value: '67%', icon: Eye },
    { label: 'Reply Rate', value: '24%', icon: MessageSquare },
    { label: 'Meetings Booked', value: '18', icon: Target },
  ];

  const templates = [
    { name: 'Initial Reach', subject: 'Quick question about your career goals', stage: 'Stage 1', performance: '28% reply rate' },
    { name: 'Follow-up', subject: 'Following up on my previous message', stage: 'Stage 2', performance: '18% reply rate' },
    { name: 'Meeting Request', subject: 'Would love 15 minutes of your time', stage: 'Stage 3', performance: '12% reply rate' },
  ];

  const messages = [
    { candidate: 'Elena Rodriguez', channel: 'Email', preview: 'Hi Elena, I noticed your recent talk at QCon...', sent: '2h ago', status: 'Read', response: 'Interested' },
    { candidate: 'David Kim', channel: 'LinkedIn', preview: 'David, the M&A news at your company caught my...', sent: '4h ago', status: 'Delivered', response: null },
    { candidate: 'Sophia Nguyen', channel: 'Email', preview: 'Congratulations on the promotion! I wanted to...', sent: '6h ago', status: 'Replied', response: 'Meeting scheduled' },
    { candidate: 'Marcus Johnson', channel: 'SMS', preview: 'Hi Marcus, quick note about an exciting sales...', sent: '1d ago', status: 'Delivered', response: null },
    { candidate: 'Aisha Patel', channel: 'Email', preview: 'Aisha, your expertise in distributed systems...', sent: '1d ago', status: 'Read', response: null },
    { candidate: 'Tom van der Berg', channel: 'LinkedIn', preview: 'Tom, as a fellow Dutch tech leader, I thought...', sent: '2d ago', status: 'Replied', response: 'Wants more info' },
    { candidate: 'Laura Chen', channel: 'Email', preview: 'Laura, your product work at Shopify has been...', sent: '3d ago', status: 'Bounced', response: null },
    { candidate: 'James Park', channel: 'SMS', preview: 'James, quick question about your engineering...', sent: '3d ago', status: 'Delivered', response: null },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/20">
          <MessageSquare className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Outreach Messages</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">SMS, Email, and LinkedIn outreach for {companyName}.</p>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {perfStats.map((s) => (
          <div key={s.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Message Templates */}
      <div>
        <h2 className="text-white font-semibold mb-4">Message Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">{t.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{t.stage}</span>
              </div>
              <p className="text-xs text-zinc-400">{t.subject}</p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-500">{t.performance}</span>
                <button className="text-xs text-red-400 cursor-default hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Messages */}
      <div data-demo="outreach-messages" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Recent Messages</h2>
          <span className="text-xs text-zinc-500">Showing 8 of 342</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Message Preview</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {messages.map((m) => {
                const ChIcon = channelIcon(m.channel);
                return (
                  <tr key={m.candidate + m.sent} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-white">{m.candidate}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <ChIcon className="w-3.5 h-3.5" /> {m.channel}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-zinc-400 truncate max-w-xs">{m.preview}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-500">{m.sent}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${statusStyle(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {m.response ? (
                        <span className="text-xs text-red-400">{m.response}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">--</span>
                      )}
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
