import {
  Users,
  UserPlus,
  Sparkles,
  AlertCircle,
  Mail,
  Building2,
  Clock,
  Search,
  Filter,
  Upload,
  LayoutGrid,
  LayoutList,
  Columns3,
  MapPin,
  Phone,
  Tag,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Star,
  Briefcase,
} from 'lucide-react';

/* ── Stats ─────────────────────────────────────────────────── */
const contactStats = [
  { label: 'Total Contacts', value: '1,247', sub: '+34 this week', icon: Users },
  { label: 'New This Month', value: '89', sub: '7.1% of total', icon: UserPlus },
  { label: 'Enriched', value: '934', sub: '75% coverage', icon: Sparkles },
  { label: 'At Risk', value: '12', sub: 'no activity 30d+', icon: AlertCircle },
];

/* ── Pipeline stage styles ─────────────────────────────────── */
const pipelineStyles = {
  New: 'bg-zinc-700 text-zinc-300',
  Contacted: 'bg-cyan-500/15 text-cyan-400',
  Qualified: 'bg-violet-500/15 text-violet-400',
  Customer: 'bg-emerald-500/15 text-emerald-400',
};

/* ── Company size badges ───────────────────────────────────── */
const sizeBadges = {
  Enterprise: 'bg-violet-500/10 text-violet-400',
  'Mid-Market': 'bg-cyan-500/10 text-cyan-400',
  SMB: 'bg-zinc-700 text-zinc-400',
  Startup: 'bg-amber-500/10 text-amber-400',
};

/* ── Lead score color ──────────────────────────────────────── */
function scoreColor(score) {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 60) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

/* ── Lead Score Ring (SVG) ─────────────────────────────────── */
function ScoreRing({ score, size = 56 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(63,63,70,0.5)"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
        {score}
      </span>
    </div>
  );
}

export default function DemoCRM({ companyName = 'Acme Corp', recipientName = 'there' }) {
  /* ── Contact data ────────────────────────────────────────── */
  const contacts = [
    {
      name: 'Sarah Mitchell',
      email: 'sarah@techventures.io',
      company: 'TechVentures',
      companySize: 'Enterprise',
      title: 'VP of Engineering',
      score: 92,
      stage: 'Customer',
      enriched: true,
      lastActivity: '2 hours ago',
      avatar: 'SM',
    },
    {
      name: recipientName !== 'there' ? recipientName : 'James Park',
      email: `james@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
      company: companyName,
      companySize: 'Mid-Market',
      title: 'Head of Product',
      score: 87,
      stage: 'Qualified',
      enriched: true,
      lastActivity: '5 hours ago',
      avatar: recipientName !== 'there' ? recipientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'JP',
    },
    {
      name: 'Lisa Tran',
      email: 'lisa.tran@meridianhealth.co',
      company: 'Meridian Health',
      companySize: 'Enterprise',
      title: 'CTO',
      score: 78,
      stage: 'Contacted',
      enriched: false,
      lastActivity: '1 day ago',
      avatar: 'LT',
    },
    {
      name: 'Robert Kim',
      email: `robert@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
      company: companyName,
      companySize: 'Mid-Market',
      title: 'Engineering Manager',
      score: 71,
      stage: 'Customer',
      enriched: true,
      lastActivity: '3 hours ago',
      avatar: 'RK',
    },
    {
      name: 'Nina Patel',
      email: 'nina@greenleaf.vc',
      company: 'GreenLeaf Ventures',
      companySize: 'SMB',
      title: 'Partner',
      score: 34,
      stage: 'New',
      enriched: false,
      lastActivity: '5 days ago',
      avatar: 'NP',
    },
    {
      name: 'Michael Chen',
      email: 'mchen@databridge.com',
      company: 'DataBridge Corp',
      companySize: 'Mid-Market',
      title: 'Director of Ops',
      score: 65,
      stage: 'Contacted',
      enriched: true,
      lastActivity: '12 hours ago',
      avatar: 'MC',
    },
    {
      name: 'Alex Morgan',
      email: 'alex.morgan@techventures.io',
      company: 'TechVentures',
      companySize: 'Enterprise',
      title: 'Senior Architect',
      score: 83,
      stage: 'Qualified',
      enriched: true,
      lastActivity: '6 hours ago',
      avatar: 'AM',
    },
    {
      name: 'Priya Shah',
      email: 'priya@summitanalytics.com',
      company: 'Summit Analytics',
      companySize: 'Startup',
      title: 'Co-Founder & CEO',
      score: 55,
      stage: 'Contacted',
      enriched: true,
      lastActivity: '2 days ago',
      avatar: 'PS',
    },
    {
      name: 'David Nguyen',
      email: 'david@catalystlabs.io',
      company: 'Catalyst Labs',
      companySize: 'Startup',
      title: 'Lead Developer',
      score: 42,
      stage: 'New',
      enriched: false,
      lastActivity: '4 days ago',
      avatar: 'DN',
    },
  ];

  /* ── Selected contact for sidebar (first one) ────────────── */
  const selected = contacts[0];

  const selectedInsights = [
    'Evaluated 3 competitor products last quarter',
    'Team grew by 40% in the last 6 months',
    'Budget cycle resets in Q2 - decision window closing',
  ];

  const selectedTimeline = [
    { action: 'Replied to email sequence', time: '2 hours ago', icon: Mail },
    { action: 'Attended product webinar', time: '3 days ago', icon: Calendar },
    { action: 'Downloaded whitepaper', time: '1 week ago', icon: Briefcase },
  ];

  const selectedTags = [
    { label: 'SaaS', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    { label: 'Enterprise', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    { label: 'Inbound', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div data-demo="page-header" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/20">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">CRM Contacts</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Manage and enrich your contact database.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 w-56">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search contacts...</span>
          </div>
          {/* Filter */}
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 cursor-default">
            <Filter className="w-4 h-4" />
          </button>
          {/* View toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button className="p-2.5 bg-cyan-500/15 text-cyan-400 cursor-default">
              <LayoutList className="w-4 h-4" />
            </button>
            <button className="p-2.5 text-zinc-500 cursor-default">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className="p-2.5 text-zinc-500 cursor-default">
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {/* Import */}
          <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-default">
            <Upload className="w-4 h-4" />
            Import Contacts
          </button>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div data-demo="contact-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {contactStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 shrink-0">
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">{stat.value}</span>
                <span className="text-xs font-medium text-cyan-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{stat.label}</p>
              <p className="text-[10px] text-zinc-600 truncate">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content: Table + Sidebar ───────────────────── */}
      <div className="flex gap-6">
        {/* Contact Table */}
        <div
          data-demo="contacts"
          className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden min-w-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium text-center">Score</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Enrichment</th>
                  <th className="px-4 py-3 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {contacts.map((contact, idx) => (
                  <tr
                    key={contact.email}
                    className={`hover:bg-zinc-800/20 transition-colors ${
                      idx === 0 ? 'bg-cyan-500/[0.03]' : ''
                    }`}
                  >
                    {/* Avatar + Name + Email */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                          {contact.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{contact.name}</p>
                          <div className="flex items-center gap-1 text-zinc-500 text-xs mt-0.5">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Company + Size badge */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${sizeBadges[contact.companySize]}`}>
                          {contact.companySize}
                        </span>
                      </div>
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-zinc-400">{contact.title}</span>
                    </td>
                    {/* Lead Score */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-lg min-w-[36px] ${scoreColor(contact.score)}`}>
                        {contact.score}
                      </span>
                    </td>
                    {/* Pipeline Stage */}
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${pipelineStyles[contact.stage]}`}>
                        {contact.stage}
                      </span>
                    </td>
                    {/* Enrichment */}
                    <td className="px-4 py-3.5" data-demo="enrichment">
                      {contact.enriched ? (
                        <span className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full w-fit">
                          <Sparkles className="w-3 h-3" />
                          AI Enriched
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">Not enriched</span>
                      )}
                    </td>
                    {/* Last Activity */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {contact.lastActivity}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────── */}
          <div data-demo="pagination" className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Showing 1-9 of 1,247 contacts</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 cursor-default">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 text-xs font-medium cursor-default">
                1
              </button>
              <button className="w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs cursor-default">
                2
              </button>
              <button className="w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs cursor-default">
                3
              </button>
              <span className="text-zinc-600 text-xs px-1">...</span>
              <button className="w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs cursor-default">
                156
              </button>
              <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 cursor-default">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Quick Intel Sidebar ───────────────────────────── */}
        <div
          data-demo="contact-intel"
          className="hidden xl:block w-80 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-5 shrink-0 self-start"
        >
          {/* Mini contact card */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-400">
              {selected.avatar}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
              <p className="text-xs text-zinc-400 truncate">{selected.title}</p>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{selected.company}</span>
              </div>
            </div>
          </div>

          {/* Location + Phone */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              San Francisco, CA
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              +1 (415) 555-0142
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              {selected.email}
            </div>
          </div>

          {/* Lead Score Ring */}
          <div className="flex flex-col items-center gap-2 py-2">
            <ScoreRing score={selected.score} size={64} />
            <span className="text-xs text-zinc-500">Lead Score</span>
          </div>

          {/* Key Insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Key Insights</h3>
            </div>
            <ul className="space-y-2">
              {selectedInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span className="text-xs text-zinc-400 leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Interactions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {selectedTimeline.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-500 shrink-0 mt-0.5">
                    <item.icon className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-300">{item.action}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((tag) => (
                <span
                  key={tag.label}
                  className={`text-[10px] px-2 py-1 rounded-full border ${tag.color}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
