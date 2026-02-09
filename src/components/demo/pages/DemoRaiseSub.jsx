import {
  Users,
  Building2,
  DollarSign,
  Eye,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Upload,
  Share2,
  FolderOpen,
  Lock,
  Shield,
  Mail,
  Send,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Star,
  Thermometer,
  Download,
  ExternalLink,
  Target,
  Megaphone,
  MessageSquare,
  Sparkles,
  Zap,
  RefreshCw,
  Database,
  Search,
} from 'lucide-react';

// ─── INVESTORS ────────────────────────────────────────────────────────────────

const kanbanData = [
  {
    stage: 'Sourced',
    count: 8,
    borderColor: 'border-zinc-600',
    headingColor: 'text-zinc-400',
    investors: [
      { firm: 'Lightspeed Ventures', name: 'Emily Zhang', checkSize: '$200K', focus: 'SaaS, B2B', lastMeeting: 'Jan 15', sentiment: 'Warm' },
      { firm: 'Y Combinator', name: 'Dalton Caldwell', checkSize: '$500K', focus: 'Deep Tech', lastMeeting: 'Jan 20', sentiment: 'Interested' },
      { firm: 'Atomico', name: 'Marcus Eriksson', checkSize: '$350K', focus: 'European B2B', lastMeeting: 'Jan 22', sentiment: 'Warm' },
      { firm: 'Point Nine', name: 'Christoph Janz', checkSize: '$150K', focus: 'B2B SaaS', lastMeeting: 'Jan 18', sentiment: 'Cold' },
    ],
  },
  {
    stage: 'In Conversation',
    count: 5,
    borderColor: 'border-orange-500/40',
    headingColor: 'text-orange-400',
    investors: [
      { firm: 'Accel Partners', name: 'Rachel Chen', checkSize: '$400K', focus: 'Fintech, AI', lastMeeting: 'Jan 28', sentiment: 'Interested' },
      { firm: 'Northzone', name: 'Jessica Schultz', checkSize: '$300K', focus: 'Marketplaces', lastMeeting: 'Feb 1', sentiment: 'Warm' },
    ],
  },
  {
    stage: 'Due Diligence',
    count: 3,
    borderColor: 'border-amber-500/40',
    headingColor: 'text-amber-400',
    investors: [
      { firm: 'Andreessen Horowitz', name: 'David Park', checkSize: '$750K', focus: 'Enterprise AI', lastMeeting: 'Feb 3', sentiment: 'Interested' },
      { firm: 'Index Ventures', name: 'Sophie Laurent', checkSize: '$350K', focus: 'Cloud Infra', lastMeeting: 'Feb 4', sentiment: 'Interested' },
    ],
  },
  {
    stage: 'Committed',
    count: 2,
    borderColor: 'border-emerald-500/40',
    headingColor: 'text-emerald-400',
    investors: [
      { firm: 'Sequoia Capital', name: 'Sarah Lin', checkSize: '$500K', focus: 'AI, SaaS', lastMeeting: 'Feb 5', sentiment: 'Interested' },
      { firm: 'Felicis Ventures', name: 'Aydin Senkut', checkSize: '$300K', focus: 'Developer Tools', lastMeeting: 'Feb 4', sentiment: 'Interested' },
    ],
  },
];

const investorTable = [
  { firm: 'Sequoia Capital', contact: 'Sarah Lin', checkSize: '$500K', stage: 'Committed', lastContact: 'Feb 5', nextStep: 'Finalize docs' },
  { firm: 'Andreessen Horowitz', contact: 'David Park', checkSize: '$750K', stage: 'Due Diligence', lastContact: 'Feb 3', nextStep: 'Legal review' },
  { firm: 'Index Ventures', contact: 'Sophie Laurent', checkSize: '$350K', stage: 'Due Diligence', lastContact: 'Feb 4', nextStep: 'Customer calls' },
  { firm: 'Accel Partners', contact: 'Rachel Chen', checkSize: '$400K', stage: 'In Conversation', lastContact: 'Jan 28', nextStep: 'Q1 metrics' },
  { firm: 'Northzone', contact: 'Jessica Schultz', checkSize: '$300K', stage: 'In Conversation', lastContact: 'Feb 1', nextStep: 'Send model' },
  { firm: 'Felicis Ventures', contact: 'Aydin Senkut', checkSize: '$300K', stage: 'Committed', lastContact: 'Feb 4', nextStep: 'Wire transfer' },
  { firm: 'Lightspeed Ventures', contact: 'Emily Zhang', checkSize: '$200K', stage: 'Sourced', lastContact: 'Jan 15', nextStep: 'Schedule intro' },
  { firm: 'Y Combinator', contact: 'Dalton Caldwell', checkSize: '$500K', stage: 'Sourced', lastContact: 'Jan 20', nextStep: 'Follow up' },
];

const sentimentColors = {
  Interested: 'bg-emerald-500/15 text-emerald-400',
  Warm: 'bg-orange-500/15 text-orange-400',
  Cold: 'bg-zinc-700 text-zinc-400',
};

const stageBadge = {
  Sourced: 'bg-zinc-700 text-zinc-300',
  'In Conversation': 'bg-orange-500/15 text-orange-400',
  'Due Diligence': 'bg-amber-500/15 text-amber-400',
  Committed: 'bg-emerald-500/15 text-emerald-400',
};

export function DemoRaiseInvestors({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="investor-pipeline">
      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1100px]">
          {kanbanData.map((col) => (
            <div key={col.stage} className="flex-1 min-w-[260px] space-y-3">
              <div className={`flex items-center justify-between pb-3 border-b-2 ${col.borderColor}`}>
                <span className={`text-sm font-semibold ${col.headingColor}`}>{col.stage}</span>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{col.count}</span>
              </div>
              {col.investors.map((inv, idx) => (
                <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-2.5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-sm font-semibold text-white">{inv.firm}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${sentimentColors[inv.sentiment]}`}>{inv.sentiment}</span>
                  </div>
                  <p className="text-xs text-zinc-400 ml-5.5">{inv.name}</p>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-sm font-semibold text-orange-400">{inv.checkSize}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Target className="w-3 h-3" />
                    <span>{inv.focus}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 pt-1 border-t border-zinc-800/50">
                    <Calendar className="w-3 h-3" />
                    <span>Last: {inv.lastMeeting}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Investor Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Investor Directory</h2>
          <span className="text-[11px] text-zinc-500">{investorTable.length} investors tracked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/80 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Firm</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Check Size</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Last Contact</th>
                <th className="px-5 py-3 font-medium">Next Step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {investorTable.map((inv) => (
                <tr key={inv.firm} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-white">{inv.firm}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">{inv.contact}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-orange-400">{inv.checkSize}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full ${stageBadge[inv.stage]}`}>{inv.stage}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{inv.lastContact}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-400">{inv.nextStep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── PITCH DECKS ──────────────────────────────────────────────────────────────

const decks = [
  { name: 'Series A Deck v3.2', version: 'v3.2', updated: '2 days ago', views: 24, avgTime: '4m 12s', status: 'Current', investors: 8 },
  { name: 'Seed Round Deck', version: 'v2.1', updated: '3 months ago', views: 67, avgTime: '3m 45s', status: 'Archive', investors: 22 },
  { name: 'Strategic Partners Deck', version: 'v1.0', updated: '1 week ago', views: 5, avgTime: '2m 30s', status: 'Draft', investors: 0 },
];

const deckStatusStyle = {
  Current: 'bg-orange-500/15 text-orange-400',
  Archive: 'bg-zinc-700 text-zinc-400',
  Draft: 'bg-amber-500/15 text-amber-400',
};

const slideEngagement = [
  { slide: 1, label: 'Cover', pct: 30 },
  { slide: 2, label: 'Problem', pct: 55 },
  { slide: 3, label: 'Solution', pct: 78 },
  { slide: 4, label: 'Market', pct: 85 },
  { slide: 5, label: 'Product', pct: 92 },
  { slide: 6, label: 'Traction', pct: 95 },
  { slide: 7, label: 'Business', pct: 70 },
  { slide: 8, label: 'Team', pct: 65 },
  { slide: 9, label: 'Financials', pct: 88 },
  { slide: 10, label: 'Competition', pct: 60 },
  { slide: 11, label: 'Ask', pct: 82 },
  { slide: 12, label: 'Appendix', pct: 20 },
];

export function DemoRaisePitchDecks({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="pitch-decks">
      {/* Deck Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {decks.map((deck) => (
          <div
            key={deck.name}
            className={`bg-zinc-900/50 border rounded-2xl p-5 space-y-4 ${deck.status === 'Current' ? 'border-orange-500/30' : 'border-zinc-800'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{deck.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${deckStatusStyle[deck.status]}`}>{deck.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
                <span>{deck.views} views</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>avg {deck.avgTime}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>{deck.investors} investors</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Calendar className="w-3 h-3" />
                <span>{deck.updated}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-colors cursor-default">
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 text-xs rounded-xl transition-colors cursor-default">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Deck Analytics */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Series A Deck v3.2 - View Analytics</h2>
            <p className="text-xs text-zinc-500 mt-0.5">24 views - avg 4m 12s - 8 investors viewed</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">Primary Deck</span>
          </div>
        </div>

        {/* Slide Engagement Bars */}
        <div>
          <p className="text-xs text-zinc-500 mb-3">Time spent per slide (relative)</p>
          <div className="flex items-end gap-2 h-32">
            {slideEngagement.map((s) => (
              <div key={s.slide} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-zinc-500">{s.pct}%</span>
                <div
                  className="w-full bg-gradient-to-t from-orange-600/40 to-orange-400/70 rounded-t-md transition-all"
                  style={{ height: `${s.pct}%` }}
                />
                <span className="text-[9px] text-zinc-600">{s.slide}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[9px] text-zinc-600">Cover</span>
            <span className="text-[9px] text-zinc-600">Appendix</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DATA ROOM ────────────────────────────────────────────────────────────────

const folders = ['Financials', 'Legal', 'Product', 'Team', 'Market Analysis'];

const documents = [
  { name: 'Financial Model 2026', folder: 'Financials', type: 'XLSX', size: '2.4 MB', uploaded: 'Feb 3', accessCount: 18, sharedWith: 5 },
  { name: 'Cap Table', folder: 'Financials', type: 'XLSX', size: '890 KB', uploaded: 'Jan 28', accessCount: 12, sharedWith: 4 },
  { name: 'Term Sheet Draft', folder: 'Legal', type: 'PDF', size: '340 KB', uploaded: 'Feb 5', accessCount: 8, sharedWith: 3 },
  { name: 'SAFE Agreement', folder: 'Legal', type: 'PDF', size: '520 KB', uploaded: 'Jan 15', accessCount: 6, sharedWith: 2 },
  { name: 'Product Roadmap', folder: 'Product', type: 'PDF', size: '1.8 MB', uploaded: 'Feb 1', accessCount: 22, sharedWith: 7 },
  { name: 'Architecture Overview', folder: 'Product', type: 'DOCX', size: '3.1 MB', uploaded: 'Jan 20', accessCount: 9, sharedWith: 4 },
  { name: 'Team Bios & Org Chart', folder: 'Team', type: 'PDF', size: '1.2 MB', uploaded: 'Feb 2', accessCount: 15, sharedWith: 6 },
  { name: 'TAM/SAM Analysis', folder: 'Market Analysis', type: 'PDF', size: '4.5 MB', uploaded: 'Jan 25', accessCount: 11, sharedWith: 5 },
];

const accessLog = [
  { investor: 'David Park', firm: 'a16z', doc: 'Financial Model 2026', when: '2 hours ago' },
  { investor: 'Sophie Laurent', firm: 'Index', doc: 'Product Roadmap', when: '5 hours ago' },
  { investor: 'Rachel Chen', firm: 'Accel', doc: 'Cap Table', when: '1 day ago' },
  { investor: 'Sarah Lin', firm: 'Sequoia', doc: 'Term Sheet Draft', when: '1 day ago' },
];

const typeBadge = {
  PDF: 'bg-red-500/15 text-red-400',
  XLSX: 'bg-emerald-500/15 text-emerald-400',
  DOCX: 'bg-blue-500/15 text-blue-400',
};

export function DemoRaiseDataRoom({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="data-room">
      {/* Folder Structure */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {folders.map((f) => (
          <div key={f} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-default hover:border-zinc-700 transition-colors shrink-0">
            <FolderOpen className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-zinc-300">{f}</span>
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
              {documents.filter((d) => d.folder === f).length}
            </span>
          </div>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Documents</h2>
          <span className="text-[11px] text-zinc-500">{documents.length} files</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/80 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Uploaded</th>
                <th className="px-5 py-3 font-medium">Views</th>
                <th className="px-5 py-3 font-medium">Shared</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {documents.map((doc) => (
                <tr key={doc.name} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-white">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeBadge[doc.type]}`}>{doc.type}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{doc.size}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{doc.uploaded}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <Eye className="w-3 h-3" /> {doc.accessCount}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <Users className="w-3 h-3" /> {doc.sharedWith}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Log + Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Access Log */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Access Log</h2>
          <div className="space-y-3">
            {accessLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/30 border border-zinc-800/50 rounded-xl">
                <Eye className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-medium">{entry.investor}</span>
                    <span className="text-zinc-500"> ({entry.firm})</span>
                  </p>
                  <p className="text-xs text-zinc-500 truncate">Viewed {entry.doc}</p>
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0">{entry.when}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Badge */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-orange-500/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">Secure Data Room</h3>
          <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
            End-to-end encrypted, watermarked PDFs. All access is logged and investor-specific permissions can be revoked at any time.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Lock className="w-3 h-3 text-orange-400/70" /> AES-256 Encryption
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Shield className="w-3 h-3 text-orange-400/70" /> Watermarked
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

const campaigns = [
  { name: 'Series A Outreach', investors: 45, responseRate: 28, meetings: 12, status: 'Active' },
  { name: 'Angel Round Follow-up', investors: 22, responseRate: 36, meetings: 8, status: 'Completed' },
  { name: 'Strategic Partners', investors: 15, responseRate: 20, meetings: 3, status: 'Active' },
];

const campaignStatusStyle = {
  Active: 'bg-orange-500/15 text-orange-400',
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Paused: 'bg-zinc-700 text-zinc-400',
};

const emailSequence = [
  { step: 1, label: 'Intro Email', subject: 'Introduction to {companyName}', delay: 'Day 0', openRate: '52%' },
  { step: 2, label: 'Follow-up', subject: 'Quick follow-up on {companyName}', delay: 'Day 3', openRate: '38%' },
  { step: 3, label: 'Meeting Request', subject: 'Would love 15 min to discuss', delay: 'Day 7', openRate: '24%' },
];

const campaignStats = [
  { label: 'Investors Contacted', value: '45', icon: Users, color: 'bg-orange-500/15 text-orange-400' },
  { label: 'Response Rate', value: '28%', icon: MessageSquare, color: 'bg-orange-500/15 text-orange-400' },
  { label: 'Meetings Booked', value: '12', icon: Calendar, color: 'bg-orange-500/15 text-orange-400' },
];

export function DemoRaiseCampaigns({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="raise-campaigns">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {campaignStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {campaigns.map((camp) => (
          <div key={camp.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{camp.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${campaignStatusStyle[camp.status]}`}>{camp.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-sm font-bold text-white">{camp.investors}</p>
                <p className="text-[10px] text-zinc-500">Reached</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{camp.responseRate}%</p>
                <p className="text-[10px] text-zinc-500">Response</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{camp.meetings}</p>
                <p className="text-[10px] text-zinc-500">Meetings</p>
              </div>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500/70 rounded-full" style={{ width: `${camp.responseRate}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Email Sequence */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Email Sequence Preview</h2>
        <div className="space-y-3">
          {emailSequence.map((step, idx) => (
            <div key={step.step} className="flex items-center gap-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-orange-400">{step.step}</span>
                </div>
                {idx < emailSequence.length - 1 && <div className="w-0.5 h-6 bg-zinc-800 mt-1" />}
              </div>
              {/* Step content */}
              <div className="flex-1 p-3.5 bg-zinc-800/30 border border-zinc-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{step.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500">{step.delay}</span>
                    <span className="text-[10px] text-orange-400">{step.openRate} open</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Mail className="w-3 h-3" />
                  <span>{step.subject.replace('{companyName}', companyName)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ENRICH ──────────────────────────────────────────────────────────────────

const enrichStats = [
  { label: 'Enriched Today', value: '34', icon: Sparkles, color: 'bg-orange-500/15 text-orange-400' },
  { label: 'Success Rate', value: '92%', icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400' },
  { label: 'Credits Remaining', value: '1,240', icon: Zap, color: 'bg-orange-500/15 text-orange-400' },
];

const enrichQueueStatusStyles = {
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Processing: 'bg-orange-500/15 text-orange-400',
  Queued: 'bg-zinc-700/50 text-zinc-300',
  Failed: 'bg-red-500/15 text-red-400',
};

const enrichQueue = [
  { investor: 'Emily Zhang', firm: 'Lightspeed Ventures', status: 'Completed', dataPoints: 18, source: 'LinkedIn + Crunchbase', enrichedAt: '2 min ago' },
  { investor: 'Dalton Caldwell', firm: 'Y Combinator', status: 'Completed', dataPoints: 24, source: 'LinkedIn + PitchBook', enrichedAt: '8 min ago' },
  { investor: 'Marcus Eriksson', firm: 'Atomico', status: 'Processing', dataPoints: 12, source: 'LinkedIn', enrichedAt: '...' },
  { investor: 'Rachel Chen', firm: 'Accel Partners', status: 'Queued', dataPoints: 0, source: '--', enrichedAt: '--' },
  { investor: 'David Park', firm: 'Andreessen Horowitz', status: 'Queued', dataPoints: 0, source: '--', enrichedAt: '--' },
  { investor: 'Sophie Laurent', firm: 'Index Ventures', status: 'Failed', dataPoints: 0, source: 'LinkedIn', enrichedAt: '15 min ago' },
  { investor: 'Jessica Schultz', firm: 'Northzone', status: 'Completed', dataPoints: 21, source: 'LinkedIn + Crunchbase', enrichedAt: '22 min ago' },
  { investor: 'Sarah Lin', firm: 'Sequoia Capital', status: 'Completed', dataPoints: 27, source: 'LinkedIn + PitchBook', enrichedAt: '30 min ago' },
];

const dataPointCategories = [
  { label: 'Contact Info', count: 89, pct: 94 },
  { label: 'Investment History', count: 72, pct: 76 },
  { label: 'Portfolio Companies', count: 68, pct: 72 },
  { label: 'Social Profiles', count: 84, pct: 89 },
  { label: 'Board Seats', count: 45, pct: 47 },
];

export function DemoRaiseEnrich({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="space-y-6" data-demo="raise-enrich">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {enrichStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Search investors..."
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-400 placeholder-zinc-600 w-56 cursor-default focus:outline-none"
            />
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500/20 text-orange-400 text-sm font-medium border border-orange-500/25 cursor-default">
          <RefreshCw className="w-3.5 h-3.5" /> Start Enrichment
        </button>
      </div>

      {/* Enrichment Queue Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Enrichment Queue</h2>
          <span className="text-[11px] text-zinc-500">{enrichQueue.length} investors</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/80 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Investor</th>
                <th className="px-5 py-3 font-medium">Firm</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Data Points</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Enriched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {enrichQueue.map((entry) => (
                <tr key={entry.investor} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-white">{entry.investor}</td>
                  <td className="px-5 py-3.5 text-sm text-zinc-400">{entry.firm}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full ${enrichQueueStatusStyles[entry.status]}`}>{entry.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white font-semibold">
                    {entry.dataPoints > 0 ? entry.dataPoints : '--'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{entry.source}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500">{entry.enrichedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Points Breakdown */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white">Data Coverage</h2>
        </div>
        <div className="space-y-3">
          {dataPointCategories.map((cat) => (
            <div key={cat.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{cat.label}</span>
                <span className="text-xs text-zinc-500">{cat.count} found ({cat.pct}%)</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500/70 rounded-full" style={{ width: `${cat.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
