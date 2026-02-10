import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Sparkles, Mail, Building2, Search, Download,
  LayoutGrid, Table2, Kanban, BarChart3, Plus, Star,
  Phone, Linkedin, MoreVertical, GripVertical, ChevronRight,
  Eye, Edit2, Trash2, Clock, Euro, ArrowUpRight, ArrowDownRight,
  Loader2, Sun, X,
} from 'lucide-react';

// ─── Pipeline Stages (matching real CRM cyan gradient) ─────────────────────────

const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-400', borderColor: 'border-zinc-500/30', dotColor: 'bg-zinc-600' },
  { id: 'contacted', label: 'Contacted', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400/80', borderColor: 'border-cyan-500/30', dotColor: 'bg-cyan-600/80' },
  { id: 'qualified', label: 'Qualified', bgColor: 'bg-cyan-500/15', textColor: 'text-cyan-400/80', borderColor: 'border-cyan-500/35', dotColor: 'bg-cyan-500/80' },
  { id: 'proposal', label: 'Proposal', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', borderColor: 'border-cyan-500/40', dotColor: 'bg-cyan-500' },
  { id: 'negotiation', label: 'Negotiation', bgColor: 'bg-cyan-500/25', textColor: 'text-cyan-300/90', borderColor: 'border-cyan-500/45', dotColor: 'bg-cyan-400/80' },
  { id: 'won', label: 'Won', bgColor: 'bg-cyan-500/30', textColor: 'text-cyan-300', borderColor: 'border-cyan-500/50', dotColor: 'bg-cyan-400' },
  { id: 'lost', label: 'Lost', bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-500', borderColor: 'border-zinc-600/30', dotColor: 'bg-zinc-700' },
];

// ─── Mock Contacts ─────────────────────────────────────────────────────────────

const CONTACTS = [
  { id: 1, name: 'Sarah Mitchell', email: 'sarah@techventures.io', company: 'TechVentures', title: 'VP of Engineering', score: 92, stage: 'won', source: 'referral', deal_value: 41000, starred: true, lastContacted: '2026-02-08' },
  { id: 2, name: 'James Park', email: 'james@novatech.com', company: 'NovaTech Solutions', title: 'Head of Product', score: 87, stage: 'proposal', source: 'linkedin', deal_value: 28500, starred: false, lastContacted: '2026-02-07' },
  { id: 3, name: 'Lisa Tran', email: 'lisa@meridianhealth.co', company: 'Meridian Health', title: 'CTO', score: 78, stage: 'negotiation', source: 'event', deal_value: 34500, starred: false, lastContacted: '2026-02-06' },
  { id: 4, name: 'Robert Kim', email: 'robert@pinnacle.com', company: 'Pinnacle Group', title: 'Engineering Manager', score: 71, stage: 'qualified', source: 'cold_outreach', deal_value: 24500, starred: false, lastContacted: '2026-02-05' },
  { id: 5, name: 'Nina Patel', email: 'nina@greenleaf.vc', company: 'GreenLeaf Ventures', title: 'Partner', score: 34, stage: 'new', source: 'website', deal_value: 0, starred: false, lastContacted: null },
  { id: 6, name: 'Michael Chen', email: 'mchen@databridge.com', company: 'DataBridge Corp', title: 'Director of Ops', score: 65, stage: 'contacted', source: 'linkedin', deal_value: 19200, starred: true, lastContacted: '2026-02-04' },
  { id: 7, name: 'Alex Morgan', email: 'alex@techventures.io', company: 'TechVentures', title: 'Senior Architect', score: 83, stage: 'qualified', source: 'referral', deal_value: 41000, starred: false, lastContacted: '2026-02-03' },
  { id: 8, name: 'Priya Shah', email: 'priya@summit.com', company: 'Summit Analytics', title: 'Co-Founder & CEO', score: 55, stage: 'contacted', source: 'event', deal_value: 12500, starred: false, lastContacted: '2026-02-01' },
  { id: 9, name: 'David Nguyen', email: 'david@catalyst.io', company: 'Catalyst Labs', title: 'Lead Developer', score: 42, stage: 'new', source: 'website', deal_value: 0, starred: false, lastContacted: null },
  { id: 10, name: 'Emma Wilson', email: 'emma@orion.com', company: 'Orion Systems', title: 'VP Sales', score: 88, stage: 'proposal', source: 'partner', deal_value: 52000, starred: true, lastContacted: '2026-02-08' },
  { id: 11, name: 'Carlos Diaz', email: 'carlos@urbanedge.com', company: 'UrbanEdge Media', title: 'Marketing Director', score: 61, stage: 'contacted', source: 'linkedin', deal_value: 22000, starred: false, lastContacted: '2026-02-02' },
  { id: 12, name: 'Hannah Cole', email: 'hannah@blueridge.co', company: 'BlueRidge Capital', title: 'CFO', score: 76, stage: 'negotiation', source: 'referral', deal_value: 18000, starred: false, lastContacted: '2026-02-06' },
  { id: 13, name: 'Tom Brady', email: 'tom@apex.com', company: 'Apex Dynamics', title: 'CRO', score: 69, stage: 'qualified', source: 'cold_outreach', deal_value: 15800, starred: false, lastContacted: '2026-01-30' },
  { id: 14, name: 'Sophie Laurent', email: 'sophie@index.vc', company: 'Index Group', title: 'Principal', score: 91, stage: 'won', source: 'event', deal_value: 72000, starred: true, lastContacted: '2026-02-07' },
  { id: 15, name: 'Marco Silva', email: 'marco@pinevista.com', company: 'PineVista Labs', title: 'Tech Lead', score: 48, stage: 'new', source: 'website', deal_value: 9200, starred: false, lastContacted: null },
  { id: 16, name: 'Aisha Patel', email: 'aisha@quantum.ai', company: 'Quantum AI', title: 'Head of AI', score: 74, stage: 'proposal', source: 'linkedin', deal_value: 27000, starred: false, lastContacted: '2026-02-05' },
  { id: 17, name: 'Jake Torres', email: 'jake@cloudnine.dev', company: 'CloudNine Tech', title: 'DevOps Lead', score: 39, stage: 'lost', source: 'cold_outreach', deal_value: 8500, starred: false, lastContacted: '2026-01-15' },
];

// ─── Lead Score Ring ───────────────────────────────────────────────────────────

function LeadScore({ score, size = 'md' }) {
  const getColor = (s) => {
    if (s >= 80) return { text: 'text-cyan-400', label: 'Hot' };
    if (s >= 60) return { text: 'text-cyan-400/80', label: 'Warm' };
    if (s >= 40) return { text: 'text-cyan-400/60', label: 'Cool' };
    return { text: 'text-zinc-500', label: 'Cold' };
  };
  const { text, label } = getColor(score);
  const sizes = { xs: { w: 24, r: 9, sw: 2, fs: 'text-[9px]' }, sm: { w: 32, r: 12, sw: 2.5, fs: 'text-[10px]' }, md: { w: 40, r: 16, sw: 3, fs: 'text-xs' } };
  const s = sizes[size] || sizes.md;
  const circ = 2 * Math.PI * s.r;
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative" style={{ width: s.w, height: s.w }}>
        <svg className="w-full h-full -rotate-90">
          <circle cx={s.w / 2} cy={s.w / 2} r={s.r} fill="none" stroke="rgba(63,63,70,0.5)" strokeWidth={s.sw} />
          <circle cx={s.w / 2} cy={s.w / 2} r={s.r} fill="none" stroke="currentColor" strokeWidth={s.sw}
            strokeDasharray={`${(score / 100) * circ} ${circ}`} className={text} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center ${s.fs} font-bold ${text}`}>{score}</span>
      </div>
      <span className={`${s.fs} font-medium ${text}`}>{label}</span>
    </div>
  );
}

// ─── Pipeline Card ─────────────────────────────────────────────────────────────

function PipelineCard({ contact }) {
  const stage = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
  return (
    <div className="bg-zinc-900/80 rounded-xl border border-zinc-800/60 hover:border-zinc-700 transition-all group">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center shrink-0">
              <span className="text-cyan-400/80 text-xs font-semibold">{contact.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-white truncate">{contact.name}</h4>
              <p className="text-xs text-zinc-500 truncate">{contact.company}</p>
            </div>
          </div>
          <button className="text-zinc-600 hover:text-zinc-400 p-1 cursor-default">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
        {contact.title && (
          <p className="text-xs text-zinc-500 mb-2 pl-6">{contact.title}</p>
        )}
        <div className="flex items-center justify-between pl-6">
          <LeadScore score={contact.score} size="xs" />
          {contact.deal_value > 0 && (
            <span className="text-xs font-medium text-cyan-400/80">€{contact.deal_value.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contact Card (Grid) ───────────────────────────────────────────────────────

function ContactCard({ contact }) {
  const stage = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 rounded-2xl p-4 cursor-default transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 flex items-center justify-center ring-2 ring-zinc-800">
            <span className="text-cyan-400/80 font-semibold">{contact.name.charAt(0)}</span>
          </div>
          <div>
            <h4 className="font-medium text-white group-hover:text-cyan-400 transition-colors">{contact.name}</h4>
            {contact.title && <p className="text-xs text-zinc-500">{contact.title}</p>}
          </div>
        </div>
        <button className="text-zinc-600 hover:text-yellow-400 transition-colors cursor-default">
          <Star className={`w-4 h-4 ${contact.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
        <Building2 className="w-4 h-4 text-zinc-500" />
        <span className="truncate">{contact.company}</span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${stage.bgColor} ${stage.textColor} ${stage.borderColor}`}>
          {stage.label}
        </span>
        <LeadScore score={contact.score} size="sm" />
      </div>
      {contact.deal_value > 0 && (
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-zinc-500">Deal Value</span>
          <span className="font-semibold text-cyan-400/80">€{contact.deal_value.toLocaleString()}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-default">
            <Mail className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-default">
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors cursor-default">
            <Linkedin className="w-3.5 h-3.5" />
          </button>
        </div>
        {contact.lastContacted && (
          <span className="text-xs text-zinc-500">
            {new Date(contact.lastContacted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Analytics Section ─────────────────────────────────────────────────────────

function CRMAnalytics() {
  const stageData = PIPELINE_STAGES.filter(s => s.id !== 'lost').map(s => ({
    ...s,
    count: CONTACTS.filter(c => c.id && c.stage === s.id).length,
    value: CONTACTS.filter(c => c.stage === s.id).reduce((sum, c) => sum + (c.deal_value || 0), 0),
  }));
  const totalValue = CONTACTS.reduce((sum, c) => sum + (c.deal_value || 0), 0);
  const wonValue = CONTACTS.filter(c => c.stage === 'won').reduce((sum, c) => sum + (c.deal_value || 0), 0);
  const conversionRate = Math.round((CONTACTS.filter(c => c.stage === 'won').length / CONTACTS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Pipeline', value: `€${totalValue.toLocaleString()}`, change: '+12.5%', up: true },
          { label: 'Won Revenue', value: `€${wonValue.toLocaleString()}`, change: '+8.3%', up: true },
          { label: 'Conversion Rate', value: `${conversionRate}%`, change: '-2.1%', up: false },
          { label: 'Avg Deal Size', value: `€${Math.round(totalValue / CONTACTS.length).toLocaleString()}`, change: '+5.7%', up: true },
        ].map((stat, i) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <span className={`text-[10px] flex items-center gap-0.5 ${stat.up ? 'text-cyan-400' : 'text-zinc-500'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white mb-3">Pipeline Distribution</h4>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
          {stageData.map(s => (
            <div key={s.id} className={`${s.dotColor} transition-all`}
              style={{ width: `${Math.max((s.count / CONTACTS.length) * 100, 3)}%` }}
              title={`${s.label}: ${s.count} contacts`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {stageData.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${s.dotColor}`} />
              <span className="text-xs text-zinc-500">{s.label} ({s.count})</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DemoCRM({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [viewMode, setViewMode] = useState('pipeline');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Group contacts by stage for pipeline view
  const contactsByStage = {};
  PIPELINE_STAGES.forEach(s => { contactsByStage[s.id] = []; });
  CONTACTS.forEach(c => {
    if (contactsByStage[c.stage]) contactsByStage[c.stage].push(c);
  });

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">All Contacts</h1>
            <p className="text-xs text-zinc-400">{CONTACTS.length} contacts in pipeline</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 shrink-0">
              {[
                { mode: 'pipeline', icon: Kanban, title: 'Pipeline View' },
                { mode: 'grid', icon: LayoutGrid, title: 'Grid View' },
                { mode: 'table', icon: Table2, title: 'Table View' },
              ].map(v => (
                <button
                  key={v.mode}
                  onClick={() => setViewMode(v.mode)}
                  className={`p-2 rounded text-sm cursor-default ${viewMode === v.mode ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                  title={v.title}
                >
                  <v.icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm cursor-default transition-colors ${
                showAnalytics
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>

            <button className="flex items-center gap-1 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-sm cursor-default">
              <Download className="w-4 h-4" /> Export
            </button>

            <button className="flex items-center gap-1 px-3 py-2 rounded-lg border border-cyan-600/50 bg-cyan-600/10 text-cyan-400 text-sm cursor-default">
              <Sparkles className="w-4 h-4" /> Quick Add
            </button>

            <button className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-600/80 text-white text-sm font-medium cursor-default">
              <Plus className="w-4 h-4" /> Add Contact
            </button>
          </div>
        </div>

        {/* ── Analytics Dashboard ───────────────────────────────── */}
        <AnimatePresence>
          {showAnalytics && <CRMAnalytics />}
        </AnimatePresence>

        {/* ── Search & Filters ──────────────────────────────────── */}
        <div className="space-y-3 mb-4 sm:mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search contacts or ask about them..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                readOnly
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 rounded-lg text-white text-sm cursor-default">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Smart Search</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['All Stages', 'All Sources', 'All Companies'].map(label => (
              <button key={label} className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 shrink-0 cursor-default">
                {label}
                <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Pipeline View ─────────────────────────────────────── */}
        {viewMode === 'pipeline' && (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 snap-x scrollbar-hide">
            {PIPELINE_STAGES.map((stage, si) => {
              const stageContacts = contactsByStage[stage.id] || [];
              const stageValue = stageContacts.reduce((sum, c) => sum + (c.deal_value || 0), 0);
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: si * 0.05 }}
                  className="w-72 shrink-0 snap-start"
                >
                  <div className={`rounded-xl border border-zinc-800/60 bg-zinc-900/30`}>
                    {/* Column Header */}
                    <div className="p-3 border-b border-zinc-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                          <h3 className={`text-sm font-medium ${stage.textColor}`}>{stage.label}</h3>
                          <span className="text-xs text-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 rounded">{stageContacts.length}</span>
                        </div>
                        <button className="text-zinc-600 hover:text-zinc-400 cursor-default">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {stageValue > 0 && (
                        <p className="text-xs text-zinc-500 mt-1 pl-4">€{stageValue.toLocaleString()}</p>
                      )}
                    </div>
                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-320px)] overflow-y-auto">
                      {stageContacts.map(contact => (
                        <PipelineCard key={contact.id} contact={contact} />
                      ))}
                      {stageContacts.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-xs text-zinc-600">No contacts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Grid View ─────────────────────────────────────────── */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {CONTACTS.map((contact, i) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}

        {/* ── Table View ────────────────────────────────────────── */}
        {viewMode === 'table' && (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl sm:rounded-2xl overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Contact</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Stage</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Score</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Value</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                    <th className="py-1.5 px-3 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {CONTACTS.map(contact => {
                    const stage = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
                    return (
                      <tr key={contact.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors h-9">
                        <td className="py-1 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center shrink-0">
                              <span className="text-cyan-400/80 text-[9px] font-medium">{contact.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-white hover:text-cyan-400 transition-colors text-xs truncate max-w-[120px]">{contact.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-1 px-3 hidden sm:table-cell">
                          <div className="text-xs text-zinc-300 truncate max-w-[120px]">{contact.company}</div>
                          <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{contact.title}</div>
                        </td>
                        <td className="py-1 px-3">
                          <span className={`text-[10px] py-px px-1.5 rounded-md border whitespace-nowrap ${stage.bgColor} ${stage.textColor} ${stage.borderColor}`}>
                            {stage.label}
                          </span>
                        </td>
                        <td className="py-1 px-3 hidden md:table-cell">
                          <LeadScore score={contact.score} size="xs" />
                        </td>
                        <td className="py-1 px-3">
                          <span className="font-medium text-white text-xs whitespace-nowrap">
                            {contact.deal_value ? `€${contact.deal_value.toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td className="py-1 px-3 hidden lg:table-cell">
                          <span className="text-[11px] text-zinc-400 capitalize whitespace-nowrap">{contact.source?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="py-1 px-3">
                          <div className="flex items-center">
                            <button className="p-1 text-zinc-400 hover:text-white cursor-default">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-zinc-400 hover:text-white cursor-default">
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center p-4 border-t border-zinc-800/50">
              <button className="px-4 py-2 border border-zinc-700 text-white text-sm rounded-lg cursor-default">
                Load More (1,230 remaining)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
