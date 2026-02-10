import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, User, Building2, Mail, Phone, Clock, Search, Filter,
  ArrowRight, ArrowLeft, Sparkles, Target, Star, TrendingUp, DollarSign,
  Heart, Briefcase, Globe, Cpu, Banknote, ChevronRight, Eye, MessageSquare,
  BarChart3, MapPin, Calendar, Shield, Truck, Handshake, Award, UserCheck,
  Upload, FileSpreadsheet, CheckCircle2, Package, AlertCircle, Settings,
  Plus, ChevronDown, Download, Send, FileText, Edit, Save, Columns,
  CheckCircle, LayoutGrid, Table2, Kanban, Linkedin, Trash2, MoreVertical,
  X, SlidersHorizontal,
} from 'lucide-react';

/* ── Shared utilities ──────────────────────────────────────────── */

function ScoreRing({ score, size = 40 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22d3ee' : score >= 60 ? '#22d3ee' : '#71717a';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(63,63,70,0.5)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{score}</span>
    </div>
  );
}

function LeadScoreIndicator({ score }) {
  const getLabel = (s) => {
    if (s >= 80) return { text: 'text-cyan-400', label: 'Hot' };
    if (s >= 60) return { text: 'text-cyan-400/80', label: 'Warm' };
    if (s >= 40) return { text: 'text-cyan-400/60', label: 'Cool' };
    return { text: 'text-zinc-500', label: 'Cold' };
  };
  const { text, label } = getLabel(score);
  const r = 12;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-8 h-8">
        <svg className="w-full h-full -rotate-90">
          <circle cx={16} cy={16} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-800" />
          <circle cx={16} cy={16} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={`${(score / 100) * c} ${c}`} className={text} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${text}`}>{score}</span>
      </div>
      <span className={`text-[10px] font-medium ${text}`}>{label}</span>
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

/* ========================================================================== */
/*  1.  DemoCRMLeads  --  replica of Leads.jsx (Lead Scoring page)            */
/* ========================================================================== */

const MOCK_LEADS = [
  { id: 1, name: 'John Smith', company: 'Acme Corp', email: 'john@acme.com', score: 92, breakdown: { engagement: 30, fit: 35, intent: 27 }, status: 'hot' },
  { id: 2, name: 'Sarah Williams', company: 'TechStart', email: 'sarah@techstart.io', score: 78, breakdown: { engagement: 25, fit: 28, intent: 25 }, status: 'warm' },
  { id: 3, name: 'Mike Chen', company: 'BigCorp LLC', email: 'mike@bigcorp.com', score: 65, breakdown: { engagement: 20, fit: 25, intent: 20 }, status: 'warm' },
  { id: 4, name: 'Emma Davis', company: 'Startup Co', email: 'emma@startup.co', score: 45, breakdown: { engagement: 15, fit: 18, intent: 12 }, status: 'cold' },
];

const SCORING_RULES = [
  { rule: 'Email Open', points: 5, category: 'Engagement' },
  { rule: 'Email Click', points: 10, category: 'Engagement' },
  { rule: 'Website Visit', points: 15, category: 'Intent' },
  { rule: 'Demo Request', points: 50, category: 'Intent' },
  { rule: 'Company Size Match', points: 20, category: 'Fit' },
  { rule: 'Industry Match', points: 15, category: 'Fit' },
];

export function DemoCRMLeads({ companyName = 'Acme Corp' }) {
  const [selectedLead, setSelectedLead] = useState(MOCK_LEADS[0]);
  const [showConfig, setShowConfig] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-cyan-400 bg-cyan-500/20';
    if (score >= 60) return 'text-cyan-400/80 bg-cyan-500/15';
    return 'text-zinc-400 bg-zinc-500/20';
  };

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white mb-1">Lead Scoring</h1>
            <p className="text-zinc-400 text-sm">Prioritize your best prospects for {companyName}</p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-zinc-300 cursor-default"
          >
            <Settings className="w-4 h-4" />
            Configure Rules
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Lead Cards */}
          <div className="lg:col-span-2 space-y-3">
            {MOCK_LEADS.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => { setSelectedLead(lead); setShowConfig(false); }}
                className={`bg-zinc-900/50 border rounded-lg p-4 cursor-default transition-colors ${
                  selectedLead?.id === lead.id ? 'border-cyan-500' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getScoreColor(lead.score)}`}>
                      <span className="text-lg font-bold">{lead.score}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{lead.name}</h3>
                      <p className="text-xs text-zinc-400">{lead.company}</p>
                      <p className="text-[10px] text-zinc-500">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'hot' ? 'bg-red-500/20 text-red-400' :
                      lead.status === 'warm' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {lead.status.toUpperCase()}
                    </span>
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>

                {/* Mini Breakdown */}
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-center">
                    <div className="text-base font-bold text-cyan-400">{lead.breakdown.engagement}</div>
                    <div className="text-[10px] text-zinc-500">Engagement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-cyan-400">{lead.breakdown.fit}</div>
                    <div className="text-[10px] text-zinc-500">Fit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-cyan-400">{lead.breakdown.intent}</div>
                    <div className="text-[10px] text-zinc-500">Intent</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Detail Panel / Config */}
          <div className="space-y-4">
            {/* Score Breakdown */}
            {selectedLead && !showConfig && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
              >
                <h3 className="text-base font-semibold text-white mb-3">Score Breakdown</h3>
                <div className="text-center mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${getScoreColor(selectedLead.score)}`}>
                    <span className="text-2xl font-bold">{selectedLead.score}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">{selectedLead.name}</p>
                </div>

                <div className="space-y-3">
                  {Object.entries(selectedLead.breakdown).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 capitalize">{key}</span>
                        <span className="text-xs text-cyan-400 font-medium">{value} pts</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(value / 35) * 100}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-cyan-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <button className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-xs font-medium transition-colors text-white cursor-default">
                    Send Outreach
                  </button>
                  <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors text-zinc-300 cursor-default">
                    View Profile
                  </button>
                </div>
              </motion.div>
            )}

            {/* Scoring Configuration */}
            {showConfig && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
              >
                <h3 className="text-base font-semibold text-white mb-3">Scoring Rules</h3>
                <div className="space-y-2">
                  {SCORING_RULES.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                      <div>
                        <div className="text-xs text-white">{rule.rule}</div>
                        <div className="text-[10px] text-zinc-500">{rule.category}</div>
                      </div>
                      <span className="text-xs font-medium text-cyan-400">+{rule.points}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:border-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2 cursor-default">
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  2.  DemoCRMProspects  --  replica of GrowthProspects.jsx                   */
/* ========================================================================== */

const PROSPECT_LISTS = [
  { id: 'l1', name: 'Q1 Target Accounts', prospect_count: 48, status: 'active' },
  { id: 'l2', name: 'Series B SaaS Companies', prospect_count: 124, status: 'active' },
  { id: 'l3', name: 'Conference Leads - SaaStr', prospect_count: 67, status: 'active' },
];

const PROSPECT_LIST_ITEMS = [
  { id: 'p1', name: 'Alex Morgan', company: 'TechVentures', title: 'VP of Engineering', score: 91, location: 'San Francisco' },
  { id: 'p2', name: 'Priya Shah', company: 'Summit Analytics', title: 'Co-Founder & CEO', score: 78, location: 'New York' },
  { id: 'p3', name: 'Tom Brady', company: 'Apex Dynamics', title: 'Head of Product', score: 65, location: 'Austin' },
  { id: 'p4', name: 'Hannah Cole', company: 'BlueRidge Capital', title: 'Managing Director', score: 84, location: 'Boston' },
  { id: 'p5', name: 'Marco Silva', company: 'PineVista Labs', title: 'CTO', score: 72, location: 'London' },
];

const ICP_TEMPLATES = [
  { id: 't1', name: 'Enterprise SaaS Buyers', description: 'VP/Director level at B2B SaaS with 200+ employees', industry: 'Technology', company_size: '200-1000', location: 'United States' },
  { id: 't2', name: 'FinTech Decision Makers', description: 'C-level at fintech startups Series A+', industry: 'Finance', company_size: '50-200', location: 'Europe' },
  { id: 't3', name: 'Healthcare IT Leaders', description: 'IT directors at hospital systems', industry: 'Healthcare', company_size: '1000+', location: 'United States' },
];

const PROSPECT_STATS = [
  { label: 'Total Prospects', value: 239, icon: Users },
  { label: 'Active Lists', value: 3, icon: Building2 },
  { label: 'Enriched', value: 156, icon: Mail },
  { label: 'In Campaigns', value: 42, icon: Send },
];

export function DemoCRMProspects({ companyName = 'Acme Corp' }) {
  const [activeTab, setActiveTab] = useState('lists');
  const [selectedList, setSelectedList] = useState(PROSPECT_LISTS[0]);
  const [selectedProspects, setSelectedProspects] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'lists', label: 'My Lists', icon: Users },
    { id: 'templates', label: 'ICP Templates', icon: FileText },
    { id: 'research', label: 'New Research', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Prospects</h1>
              <p className="text-zinc-400 text-sm">Manage your prospect lists, templates, and research</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-medium">
            239 total
          </span>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PROSPECT_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <stat.icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">{stat.value}</span>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-default ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lists Tab */}
        {activeTab === 'lists' && (
          <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lists Panel */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">My Lists</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {PROSPECT_LISTS.length}
                </span>
              </div>
              <div className="space-y-2">
                {PROSPECT_LISTS.map((list, i) => (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedList(list)}
                    className={`p-3 rounded-xl cursor-default transition-all ${
                      selectedList?.id === list.id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{list.name}</p>
                        <p className="text-xs text-zinc-400">{list.prospect_count} prospects</p>
                      </div>
                      <button className="p-1 rounded text-zinc-400 cursor-default">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Prospects Table */}
            <div className="lg:col-span-2">
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
                {selectedList ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{selectedList.name}</h3>
                        <p className="text-xs text-zinc-400">{selectedList.prospect_count} prospects</p>
                      </div>
                      {selectedProspects.size > 0 && (
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 text-xs border border-cyan-500/30 text-cyan-400/80 rounded-lg cursor-default flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            Export ({selectedProspects.size})
                          </button>
                          <button className="px-3 py-1.5 text-xs bg-cyan-600/80 text-white rounded-lg cursor-default flex items-center gap-1">
                            <Send className="w-3.5 h-3.5" />
                            Add to Campaign
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search prospects..."
                        className="w-full pl-9 h-8 text-sm bg-zinc-800 border border-zinc-700 text-white rounded-lg outline-none focus:border-cyan-500/50 placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
                      {PROSPECT_LIST_ITEMS.filter(p =>
                        !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.company.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((prospect) => (
                        <div
                          key={prospect.id}
                          onClick={() => {
                            setSelectedProspects(prev => {
                              const next = new Set(prev);
                              if (next.has(prospect.id)) next.delete(prospect.id);
                              else next.add(prospect.id);
                              return next;
                            });
                          }}
                          className={`py-2 px-2 cursor-default transition-all ${
                            selectedProspects.has(prospect.id) ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border ${selectedProspects.has(prospect.id) ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-600'} flex items-center justify-center`}>
                              {selectedProspects.has(prospect.id) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white">{prospect.name}</p>
                                <span className="text-[10px] px-1.5 py-px rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                  {prospect.score}%
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
                                <span>{prospect.company}</span>
                                <span>- {prospect.title}</span>
                                <span>- {prospect.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Select a List</h3>
                    <p className="text-zinc-500">Choose a list from the sidebar to view prospects</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <motion.div {...fadeUp} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  placeholder="Search templates..."
                  className="w-full pl-10 py-2 text-sm bg-zinc-900 border border-zinc-700 text-white rounded-lg outline-none focus:border-cyan-500/50 placeholder:text-zinc-500"
                />
              </div>
              <button className="px-4 py-2 bg-cyan-600/80 text-white text-sm font-medium rounded-lg flex items-center gap-2 cursor-default">
                <Plus className="w-4 h-4" />
                New Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ICP_TEMPLATES.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded text-zinc-400 hover:text-white cursor-default"><Edit className="w-4 h-4" /></button>
                      <button className="p-1.5 rounded text-zinc-400 hover:text-red-400 cursor-default"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.industry && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />{template.industry}
                      </span>
                    )}
                    {template.company_size && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <Users className="w-3 h-3" />{template.company_size}
                      </span>
                    )}
                    {template.location && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{template.location}
                      </span>
                    )}
                  </div>
                  <button className="w-full py-2 bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/30 hover:bg-cyan-500/20 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-default">
                    <Sparkles className="w-4 h-4" />
                    Use Template
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Research Tab */}
        {activeTab === 'research' && (
          <motion.div {...fadeUp} className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2">
              {[
                { id: 'define', label: 'Define ICP', icon: Filter, active: true },
                { id: 'search', label: 'Search', icon: Search, active: false },
                { id: 'review', label: 'Review', icon: Users, active: false },
                { id: 'export', label: 'Save', icon: Save, active: false },
              ].map((step, i, arr) => (
                <div key={step.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                    step.active
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-zinc-800/50 text-zinc-500'
                  }`}>
                    <step.icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && <div className={`w-8 h-0.5 ${i < 0 ? 'bg-cyan-500' : 'bg-zinc-700'}`} />}
                </div>
              ))}
            </div>

            {/* Define ICP */}
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">What are you looking for?</h3>
              <div className="flex gap-4 mb-6">
                <button className="flex-1 p-4 rounded-xl border-2 bg-cyan-500/20 border-cyan-500 text-white cursor-default">
                  <Building2 className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">Companies</div>
                  <div className="text-xs opacity-70">Find target accounts</div>
                </button>
                <button className="flex-1 p-4 rounded-xl border-2 bg-zinc-800/50 border-zinc-700 text-zinc-400 cursor-default">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">People</div>
                  <div className="text-xs opacity-70">Find decision makers</div>
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6">
              <label className="text-sm text-zinc-400 mb-2 block">Describe your ideal company</label>
              <textarea
                placeholder="e.g., B2B SaaS companies in fintech with 50-200 employees..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 min-h-[100px] text-sm outline-none focus:border-cyan-500/50 placeholder:text-zinc-500 resize-none"
              />
              <button className="text-cyan-400 text-sm mt-3 flex items-center gap-2 cursor-default">
                <Filter className="w-4 h-4" />
                Advanced Filters
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end">
              <button className="px-8 py-2.5 bg-cyan-600/80 text-white text-sm font-medium rounded-lg flex items-center gap-2 cursor-default">
                <Sparkles className="w-4 h-4" />
                Find Prospects
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Shared ContactListView  --  replica of CRMContacts.jsx                    */
/* ========================================================================== */

const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', color: 'bg-zinc-600', textColor: 'text-zinc-400', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/30' },
  { id: 'contacted', label: 'Contacted', color: 'bg-cyan-600/80', textColor: 'text-cyan-400/80', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  { id: 'qualified', label: 'Qualified', color: 'bg-cyan-500/80', textColor: 'text-cyan-400/80', bgColor: 'bg-cyan-500/15', borderColor: 'border-cyan-500/35' },
  { id: 'proposal', label: 'Proposal', color: 'bg-cyan-500', textColor: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/40' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-cyan-400/80', textColor: 'text-cyan-300/90', bgColor: 'bg-cyan-500/25', borderColor: 'border-cyan-500/45' },
  { id: 'won', label: 'Won', color: 'bg-cyan-400', textColor: 'text-cyan-300', bgColor: 'bg-cyan-500/30', borderColor: 'border-cyan-500/50' },
  { id: 'lost', label: 'Lost', color: 'bg-zinc-700', textColor: 'text-zinc-500', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-600/30' },
];

const CONTACT_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Outreach', 'Event', 'Partner'];

function ContactListView({ title, subtitle, contacts, stats, icon: HeaderIcon }) {
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const filtered = contacts.filter(c =>
    !searchQuery ||
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">{title}</h1>
          <p className="text-xs text-zinc-400">{filtered.length} {subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 flex-shrink-0">
            {[
              { mode: 'pipeline', icon: Kanban },
              { mode: 'grid', icon: LayoutGrid },
              { mode: 'table', icon: Table2 },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-2 rounded text-sm cursor-default ${
                  viewMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-1 cursor-default ${
              showAnalytics
                ? 'bg-cyan-500/15 text-cyan-400/80 border-cyan-500/30'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Analytics
          </button>

          <button className="px-3 py-2 text-sm border border-zinc-700 bg-zinc-800/50 text-zinc-300 rounded-lg flex items-center gap-1 cursor-default">
            <Download className="w-4 h-4" /> Export
          </button>

          <button className="px-3 py-2 text-sm border border-cyan-600/50 bg-cyan-600/10 text-cyan-400 rounded-lg flex items-center gap-1 cursor-default">
            <Sparkles className="w-4 h-4" /> Quick Add
          </button>

          <button className="px-3 py-2 text-sm bg-cyan-600/80 text-white rounded-lg flex items-center gap-1 cursor-default">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </motion.div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 sm:p-4">
                <div className="mb-1">
                  <stat.icon className="w-4 h-4 text-cyan-400/70" />
                </div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline Overview */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-base font-semibold text-white mb-3">Pipeline Overview</h3>
            <div className="space-y-2">
              {PIPELINE_STAGES.filter(s => s.id !== 'lost').map(stage => {
                const count = contacts.filter(c => c.stage === stage.id).length;
                const pct = contacts.length > 0 ? (count / contacts.length) * 100 : 0;
                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-zinc-400 truncate">{stage.label}</div>
                    <div className="flex-1 bg-zinc-800 rounded-full h-5 relative overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-full`} style={{ width: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-10 bg-zinc-900 border border-zinc-800 text-white rounded-lg outline-none text-sm focus:border-cyan-500/50 placeholder:text-zinc-500"
            />
          </div>
          <button className="px-4 h-10 bg-cyan-600 text-white rounded-lg flex items-center gap-2 text-sm cursor-default">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Smart Search</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <select className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg outline-none cursor-default">
            <option>All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s.id}>{s.label}</option>)}
          </select>
          <select className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg outline-none cursor-default">
            <option>All Sources</option>
            {CONTACT_SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Content Views */}
      {viewMode === 'pipeline' ? (
        /* Pipeline View */
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
          {PIPELINE_STAGES.map(stage => {
            const stageContacts = contacts.filter(c => c.stage === stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 w-[280px] snap-start">
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="font-medium text-white text-sm">{stage.label}</span>
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{stageContacts.length}</span>
                    </div>
                    <button className="text-zinc-500 cursor-default"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-xl p-2 border-2 border-transparent">
                  {stageContacts.map((contact) => (
                    <div key={contact.id} className="bg-zinc-900/80 rounded-xl border border-zinc-800/60 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center">
                          <span className="text-cyan-400/80 text-xs font-semibold">{contact.name?.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">{contact.name}</h4>
                          {contact.company_name && <p className="text-xs text-zinc-500 truncate">{contact.company_name}</p>}
                        </div>
                      </div>
                      {contact.deal_value > 0 && (
                        <div className="text-sm font-medium text-cyan-400/80 mb-2">
                          ${parseFloat(contact.deal_value).toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {contact.email && <Mail className="w-3 h-3 text-zinc-600" />}
                          {contact.phone && <Phone className="w-3 h-3 text-zinc-600" />}
                        </div>
                        <LeadScoreIndicator score={contact.score || 50} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((contact) => {
            const stageConfig = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 cursor-default transition-all hover:border-zinc-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 flex items-center justify-center ring-2 ring-zinc-800">
                      <span className="text-cyan-400/80 font-semibold">{contact.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{contact.name}</h4>
                      {contact.job_title && <p className="text-xs text-zinc-500">{contact.job_title}</p>}
                    </div>
                  </div>
                  <button className="text-zinc-600 cursor-default"><Star className="w-4 h-4" /></button>
                </div>
                {contact.company_name && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span className="truncate">{contact.company_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${stageConfig.bgColor} ${stageConfig.textColor} ${stageConfig.borderColor} border`}>
                    {stageConfig.label}
                  </span>
                  <LeadScoreIndicator score={contact.score || 50} />
                </div>
                {contact.deal_value > 0 && (
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-zinc-500">Deal Value</span>
                    <span className="font-semibold text-cyan-400/80">${parseFloat(contact.deal_value).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    {contact.email && (
                      <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 cursor-default"><Mail className="w-3.5 h-3.5" /></button>
                    )}
                    {contact.phone && (
                      <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 cursor-default"><Phone className="w-3.5 h-3.5" /></button>
                    )}
                    {contact.linkedin_url && (
                      <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 cursor-default"><Linkedin className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  {contact.last_contacted && (
                    <span className="text-xs text-zinc-500">{contact.last_contacted}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="py-1.5 px-2 text-left w-8">
                    <div className="w-3.5 h-3.5 rounded border border-zinc-600" />
                  </th>
                  <th className="py-1.5 px-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Contact</th>
                  <th className="py-1.5 px-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                  <th className="py-1.5 px-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Stage</th>
                  <th className="py-1.5 px-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Score</th>
                  <th className="py-1.5 px-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Value</th>
                  <th className="py-1.5 px-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                  <th className="py-1.5 px-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => {
                  const stageConfig = PIPELINE_STAGES.find(s => s.id === contact.stage) || PIPELINE_STAGES[0];
                  return (
                    <tr key={contact.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors h-9">
                      <td className="py-1 px-2">
                        <div className="w-3.5 h-3.5 rounded border border-zinc-600" />
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/15 to-cyan-400/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-400/80 text-[10px] font-semibold">{contact.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{contact.name}</p>
                            {contact.job_title && <p className="text-[10px] text-zinc-500">{contact.job_title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-1 px-2 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Building2 className="w-3 h-3 text-zinc-500" />
                          {contact.company_name || '-'}
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${stageConfig.bgColor} ${stageConfig.textColor} border ${stageConfig.borderColor}`}>
                          {stageConfig.label}
                        </span>
                      </td>
                      <td className="py-1 px-2 hidden md:table-cell">
                        <LeadScoreIndicator score={contact.score || 50} />
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-sm text-cyan-400/80 font-medium">
                          {contact.deal_value > 0 ? `$${parseFloat(contact.deal_value).toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td className="py-1 px-2 hidden lg:table-cell">
                        <span className="text-xs text-zinc-400 capitalize">{contact.source?.replace(/_/g, ' ') || '-'}</span>
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1">
                          <button className="p-1 rounded text-zinc-500 cursor-default"><Eye className="w-3.5 h-3.5" /></button>
                          <button className="p-1 rounded text-zinc-500 cursor-default"><MoreVertical className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <h2 className="text-xl font-semibold text-zinc-300 mb-2">No contacts found</h2>
              <p className="text-zinc-500 mb-6">Try adjusting your filters or add a new contact</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  3.  DemoCRMCustomers  --  CRMContacts filtered to customers               */
/* ========================================================================== */

const CUSTOMER_CONTACTS = [
  { id: 'cust1', name: 'Sarah Mitchell', email: 'sarah@techventures.com', phone: '+1 555-0101', company_name: 'TechVentures', job_title: 'VP Engineering', stage: 'won', source: 'referral', score: 92, deal_value: 125000, contact_type: 'customer', linkedin_url: 'https://linkedin.com', last_contacted: 'Jan 28' },
  { id: 'cust2', name: 'Lisa Tran', email: 'lisa@meridian.com', phone: '+1 555-0102', company_name: 'Meridian Health', job_title: 'CTO', stage: 'won', source: 'linkedin', score: 85, deal_value: 82000, contact_type: 'customer', last_contacted: 'Jan 25' },
  { id: 'cust3', name: 'David Nguyen', email: 'david@catalyst.com', phone: '+1 555-0103', company_name: 'Catalyst Labs', job_title: 'CEO', stage: 'won', source: 'website', score: 91, deal_value: 224000, contact_type: 'customer', last_contacted: 'Jan 30' },
  { id: 'cust4', name: 'Robert Kim', email: 'robert@pinnacle.com', company_name: 'Pinnacle Group', job_title: 'Director', stage: 'won', source: 'event', score: 88, deal_value: 180000, contact_type: 'customer', last_contacted: 'Jan 27' },
  { id: 'cust5', name: 'Priya Shah', email: 'priya@summit.com', company_name: 'Summit Analytics', job_title: 'Co-Founder', stage: 'negotiation', source: 'partner', score: 74, deal_value: 150000, contact_type: 'customer', last_contacted: 'Jan 22' },
  { id: 'cust6', name: 'Emma Wilson', email: 'emma@orion.com', company_name: 'Orion Systems', job_title: 'Product Lead', stage: 'proposal', source: 'cold_outreach', score: 45, deal_value: 91000, contact_type: 'customer', last_contacted: 'Jan 10' },
];

const CUSTOMER_STATS = [
  { label: 'Total Customers', value: 6, icon: Users },
  { label: 'Pipeline Value', value: '$852k', icon: DollarSign },
  { label: 'Win Rate', value: '67%', icon: Target },
  { label: 'Hot Leads', value: 4, icon: TrendingUp },
];

export function DemoCRMCustomers({ companyName = 'Acme Corp' }) {
  return <ContactListView title="Customers" subtitle="customers in pipeline" contacts={CUSTOMER_CONTACTS} stats={CUSTOMER_STATS} icon={Heart} />;
}

/* ========================================================================== */
/*  4.  DemoCRMCompanies  --  CRMContacts (all contacts view)                 */
/* ========================================================================== */

const ALL_CONTACTS = [
  { id: 'all1', name: 'Sarah Mitchell', email: 'sarah@techventures.com', phone: '+1 555-0101', company_name: 'TechVentures', job_title: 'VP Engineering', stage: 'won', source: 'referral', score: 92, deal_value: 125000, contact_type: 'customer', linkedin_url: 'https://linkedin.com', last_contacted: 'Jan 28' },
  { id: 'all2', name: 'James Park', email: 'james@novatech.io', company_name: 'NovaTech', job_title: 'CTO', stage: 'qualified', source: 'linkedin', score: 88, deal_value: 45000, contact_type: 'lead', last_contacted: 'Jan 26' },
  { id: 'all3', name: 'Lisa Tran', email: 'lisa@meridian.com', phone: '+1 555-0102', company_name: 'Meridian Health', job_title: 'CTO', stage: 'proposal', source: 'website', score: 82, deal_value: 82000, contact_type: 'prospect', last_contacted: 'Jan 25' },
  { id: 'all4', name: 'Carlos Diaz', email: 'carlos@urbanedge.com', company_name: 'UrbanEdge', job_title: 'Head of Sales', stage: 'contacted', source: 'event', score: 71, deal_value: 35000, contact_type: 'lead', last_contacted: 'Jan 20' },
  { id: 'all5', name: 'Nina Patel', email: 'nina@greenleaf.com', company_name: 'GreenLeaf', job_title: 'Director', stage: 'new', source: 'cold_outreach', score: 65, deal_value: 0, contact_type: 'target', last_contacted: 'Jan 18' },
  { id: 'all6', name: 'Michael Chen', email: 'michael@databridge.com', company_name: 'DataBridge', job_title: 'Architect', stage: 'negotiation', source: 'partner', score: 58, deal_value: 68000, contact_type: 'prospect', last_contacted: 'Jan 15' },
  { id: 'all7', name: 'David Nguyen', email: 'david@catalyst.com', company_name: 'Catalyst Labs', job_title: 'CEO', stage: 'won', source: 'referral', score: 91, deal_value: 224000, contact_type: 'customer' },
  { id: 'all8', name: 'Emma Wilson', email: 'emma@orion.com', company_name: 'Orion Systems', job_title: 'Product Lead', stage: 'lost', source: 'website', score: 42, deal_value: 91000, contact_type: 'lead' },
  { id: 'all9', name: 'Robert Kim', email: 'robert@pinnacle.com', company_name: 'Pinnacle Group', job_title: 'Director', stage: 'won', source: 'event', score: 88, deal_value: 180000, contact_type: 'partner' },
  { id: 'all10', name: 'Sofia Patel', email: 'sofia@greenleaf.com', company_name: 'GreenLeaf Materials', job_title: 'Ops Manager', stage: 'contacted', source: 'partner', score: 56, deal_value: 0, contact_type: 'supplier' },
];

const ALL_CONTACTS_STATS = [
  { label: 'Total Contacts', value: 10, icon: Users },
  { label: 'Pipeline Value', value: '$850k', icon: DollarSign },
  { label: 'Win Rate', value: '72%', icon: Target },
  { label: 'Hot Leads', value: 5, icon: TrendingUp },
];

export function DemoCRMCompanies({ companyName = 'Acme Corp' }) {
  return <ContactListView title="All Contacts" subtitle="contacts in pipeline" contacts={ALL_CONTACTS} stats={ALL_CONTACTS_STATS} icon={Building2} />;
}

/* ========================================================================== */
/*  5.  DemoCRMSuppliers  --  CRMContacts filtered to suppliers               */
/* ========================================================================== */

const SUPPLIER_CONTACTS = [
  { id: 'sup1', name: 'NovaParts Ltd', email: 'james@novaparts.com', phone: '+1 555-0201', company_name: 'NovaParts Ltd', job_title: 'Account Manager', stage: 'won', source: 'referral', score: 85, deal_value: 0, contact_type: 'supplier', last_contacted: 'Jan 28' },
  { id: 'sup2', name: 'Meridian Supply Co', email: 'anna@meridiansupply.com', phone: '+1 555-0202', company_name: 'Meridian Supply Co', job_title: 'Sales Director', stage: 'won', source: 'website', score: 78, deal_value: 0, contact_type: 'supplier', last_contacted: 'Jan 22' },
  { id: 'sup3', name: 'TechSource Global', email: 'erik@techsource.com', company_name: 'TechSource Global', job_title: 'VP Partnerships', stage: 'won', source: 'linkedin', score: 92, deal_value: 0, contact_type: 'supplier', last_contacted: 'Jan 26' },
  { id: 'sup4', name: 'GreenLeaf Materials', email: 'sofia@greenleafmat.com', company_name: 'GreenLeaf Materials', job_title: 'Ops Manager', stage: 'contacted', source: 'event', score: 65, deal_value: 0, contact_type: 'supplier', last_contacted: 'Jan 15' },
  { id: 'sup5', name: 'Atlas Components', email: 'david@atlas.com', company_name: 'Atlas Components', job_title: 'Procurement Lead', stage: 'won', source: 'partner', score: 80, deal_value: 0, contact_type: 'supplier', last_contacted: 'Jan 24' },
  { id: 'sup6', name: 'BlueStar Electronics', email: 'tom@bluestar.com', company_name: 'BlueStar Electronics', job_title: 'Key Account Mgr', stage: 'won', source: 'cold_outreach', score: 75, deal_value: 0, contact_type: 'supplier', last_contacted: 'Jan 29' },
];

const SUPPLIER_STATS = [
  { label: 'Total Suppliers', value: 6, icon: Users },
  { label: 'Active', value: 5, icon: Truck },
  { label: 'Avg Score', value: '79', icon: Target },
  { label: 'New This Month', value: 2, icon: TrendingUp },
];

export function DemoCRMSuppliers({ companyName = 'Acme Corp' }) {
  return <ContactListView title="Suppliers" subtitle="suppliers in CRM" contacts={SUPPLIER_CONTACTS} stats={SUPPLIER_STATS} icon={Truck} />;
}

/* ========================================================================== */
/*  6.  DemoCRMPartners  --  CRMContacts filtered to partners                 */
/* ========================================================================== */

const PARTNER_CONTACTS = [
  { id: 'par1', name: 'TechVentures Partners', email: 'partners@techventures.com', company_name: 'TechVentures Partners', job_title: 'Partner Manager', stage: 'won', source: 'referral', score: 90, deal_value: 320000, contact_type: 'partner', last_contacted: 'Jan 28' },
  { id: 'par2', name: 'Summit Referral Network', email: 'info@summitreferral.com', company_name: 'Summit Referral Network', job_title: 'Director', stage: 'won', source: 'event', score: 82, deal_value: 185000, contact_type: 'partner', last_contacted: 'Jan 20' },
  { id: 'par3', name: 'DataBridge Integration', email: 'tech@databridge.com', company_name: 'DataBridge Integration', job_title: 'Tech Lead', stage: 'won', source: 'linkedin', score: 88, deal_value: 210000, contact_type: 'partner', last_contacted: 'Jan 25' },
  { id: 'par4', name: 'Meridian Consulting', email: 'consult@meridian.com', company_name: 'Meridian Consulting', job_title: 'Managing Partner', stage: 'negotiation', source: 'partner', score: 75, deal_value: 95000, contact_type: 'partner', last_contacted: 'Jan 18' },
  { id: 'par5', name: 'Pinnacle Resellers', email: 'sales@pinnacle.com', company_name: 'Pinnacle Resellers', job_title: 'Channel Manager', stage: 'won', source: 'website', score: 86, deal_value: 275000, contact_type: 'partner', last_contacted: 'Jan 26' },
];

const PARTNER_STATS = [
  { label: 'Total Partners', value: 5, icon: Handshake },
  { label: 'Revenue Generated', value: '$1.1M', icon: DollarSign },
  { label: 'Active Deals', value: 12, icon: TrendingUp },
  { label: 'Avg Score', value: '84', icon: Star },
];

export function DemoCRMPartners({ companyName = 'Acme Corp' }) {
  return <ContactListView title="Partners" subtitle="partners in CRM" contacts={PARTNER_CONTACTS} stats={PARTNER_STATS} icon={Handshake} />;
}

/* ========================================================================== */
/*  7.  DemoCRMCandidates  --  CRMContacts filtered to candidates             */
/* ========================================================================== */

const CANDIDATE_CONTACTS = [
  { id: 'can1', name: 'Elena Rodriguez', email: 'elena@gmail.com', company_name: 'Previous Corp', job_title: 'Senior Engineer', stage: 'qualified', source: 'linkedin', score: 88, deal_value: 0, contact_type: 'candidate', last_contacted: 'Jan 28' },
  { id: 'can2', name: 'James Park', email: 'jpark@outlook.com', company_name: 'TechStart', job_title: 'Product Manager', stage: 'contacted', source: 'referral', score: 76, deal_value: 0, contact_type: 'candidate', last_contacted: 'Jan 25' },
  { id: 'can3', name: 'Sophia Nguyen', email: 'sophia.n@gmail.com', company_name: 'DataCorp', job_title: 'Data Scientist', stage: 'proposal', source: 'website', score: 82, deal_value: 0, contact_type: 'candidate', last_contacted: 'Jan 22' },
  { id: 'can4', name: 'Marcus Johnson', email: 'marcus.j@gmail.com', company_name: 'DesignStudio', job_title: 'UX Designer', stage: 'new', source: 'website', score: 60, deal_value: 0, contact_type: 'candidate', last_contacted: 'Jan 20' },
  { id: 'can5', name: 'Aisha Patel', email: 'aisha@protonmail.com', company_name: 'CloudOps Inc', job_title: 'DevOps Engineer', stage: 'qualified', source: 'linkedin', score: 84, deal_value: 0, contact_type: 'candidate', last_contacted: 'Jan 18' },
  { id: 'can6', name: 'Tom van der Berg', email: 'tom@company.com', company_name: 'Hired - Internal', job_title: 'Senior Engineer', stage: 'won', source: 'referral', score: 95, deal_value: 0, contact_type: 'candidate' },
  { id: 'can7', name: 'Laura Chen', email: 'lchen@email.com', company_name: 'WebAgency', job_title: 'Frontend Developer', stage: 'contacted', source: 'website', score: 70, deal_value: 0, contact_type: 'candidate', last_contacted: 'Jan 15' },
];

const CANDIDATE_STATS = [
  { label: 'Total Candidates', value: 7, icon: Users },
  { label: 'In Pipeline', value: 5, icon: Target },
  { label: 'Interviews', value: 3, icon: Calendar },
  { label: 'Offers Sent', value: 1, icon: Mail },
];

export function DemoCRMCandidates({ companyName = 'Acme Corp' }) {
  return <ContactListView title="Candidates" subtitle="candidates in pipeline" contacts={CANDIDATE_CONTACTS} stats={CANDIDATE_STATS} icon={UserCheck} />;
}

/* ========================================================================== */
/*  8.  DemoCRMTargets  --  CRMContacts filtered to targets                   */
/* ========================================================================== */

const TARGET_CONTACTS = [
  { id: 'tar1', name: 'TechVentures', email: 'info@techventures.com', company_name: 'TechVentures', job_title: 'Enterprise Account', stage: 'qualified', source: 'linkedin', score: 94, deal_value: 250000, contact_type: 'target', last_contacted: 'Jan 28' },
  { id: 'tar2', name: 'Meridian Health', email: 'bd@meridian.com', company_name: 'Meridian Health', job_title: 'Strategic Account', stage: 'contacted', source: 'event', score: 88, deal_value: 180000, contact_type: 'target', last_contacted: 'Jan 25' },
  { id: 'tar3', name: 'Summit Analytics', email: 'sales@summit.com', company_name: 'Summit Analytics', job_title: 'Growth Account', stage: 'new', source: 'website', score: 82, deal_value: 120000, contact_type: 'target', last_contacted: 'Jan 22' },
  { id: 'tar4', name: 'DataBridge Corp', email: 'partnerships@databridge.com', company_name: 'DataBridge Corp', job_title: 'Mid-Market', stage: 'new', source: 'cold_outreach', score: 71, deal_value: 85000, contact_type: 'target' },
  { id: 'tar5', name: 'Catalyst Labs', email: 'cto@catalyst.com', company_name: 'Catalyst Labs', job_title: 'Startup Account', stage: 'contacted', source: 'partner', score: 65, deal_value: 50000, contact_type: 'target', last_contacted: 'Jan 15' },
  { id: 'tar6', name: 'Orion Systems', email: 'procurement@orion.com', company_name: 'Orion Systems', job_title: 'Enterprise', stage: 'new', source: 'event', score: 58, deal_value: 200000, contact_type: 'target' },
];

const TARGET_STATS = [
  { label: 'Target Accounts', value: 6, icon: Target },
  { label: 'ICP Match', value: '78%', icon: Shield },
  { label: 'Assigned Reps', value: 4, icon: Users },
  { label: 'Avg Score', value: '76', icon: BarChart3 },
];

export function DemoCRMTargets({ companyName = 'Acme Corp' }) {
  return <ContactListView title="Target Accounts" subtitle="target accounts in pipeline" contacts={TARGET_CONTACTS} stats={TARGET_STATS} icon={Target} />;
}

/* ========================================================================== */
/*  9.  DemoCRMImport  --  replica of ContactsImport.jsx                      */
/* ========================================================================== */

const IMPORT_STEPS = [
  { id: 'upload', title: 'Upload File', icon: Upload, description: 'Upload your contacts spreadsheet' },
  { id: 'type', title: 'Contact Type', icon: Users, description: 'Select contact type for import' },
  { id: 'map', title: 'Map Columns', icon: Columns, description: 'Match columns to contact fields' },
  { id: 'validate', title: 'Review Data', icon: CheckCircle, description: 'Review and validate data' },
  { id: 'import', title: 'Import', icon: Download, description: 'Import contacts to CRM' },
];

const IMPORT_CONTACT_TYPES = [
  { id: 'lead', label: 'Leads', icon: Target, description: 'Unqualified contacts for initial outreach' },
  { id: 'prospect', label: 'Prospects', icon: TrendingUp, description: 'Qualified leads in sales pipeline' },
  { id: 'customer', label: 'Customers', icon: UserCheck, description: 'Paying customers with active relationships' },
  { id: 'supplier', label: 'Suppliers', icon: Truck, description: 'Vendors and product suppliers' },
  { id: 'partner', label: 'Partners', icon: Handshake, description: 'Business partners and affiliates' },
  { id: 'candidate', label: 'Candidates', icon: UserPlus, description: 'Job applicants and HR contacts' },
  { id: 'target', label: 'Targets', icon: Target, description: 'Target accounts for outbound' },
];

const FIELD_MAPPING = [
  { source: 'Full Name', target: 'Name', matched: true },
  { source: 'Email Address', target: 'Email', matched: true },
  { source: 'Company', target: 'Company', matched: true },
  { source: 'Job Title', target: 'Title', matched: true },
  { source: 'Phone Number', target: 'Phone', matched: true },
  { source: 'Custom Field 1', target: '--', matched: false },
];

const IMPORT_HISTORY = [
  { file: 'q1_leads_2026.csv', format: 'CSV', records: 1240, status: 'Completed', date: 'Jan 20, 2026', duplicates: 34 },
  { file: 'linkedin_export.csv', format: 'LinkedIn', records: 567, status: 'Completed', date: 'Jan 15, 2026', duplicates: 12 },
  { file: 'conference_contacts.xlsx', format: 'Excel', records: 89, status: 'Completed', date: 'Jan 10, 2026', duplicates: 5 },
  { file: 'partner_referrals.csv', format: 'CSV', records: 156, status: 'Failed', date: 'Jan 8, 2026', duplicates: 0 },
];

export function DemoCRMImport({ companyName = 'Acme Corp' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState('lead');

  return (
    <div className="min-h-screen bg-black px-4 lg:px-6 py-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center gap-3 mb-6">
          <button className="p-2 rounded-lg text-zinc-400 cursor-default">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Import Contacts</h1>
            <p className="text-sm text-zinc-400">Import contacts from CSV or Excel files into {companyName}</p>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {IMPORT_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    isActive ? 'bg-cyan-500 text-white' :
                    isComplete ? 'bg-cyan-500/50 text-white' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    isActive ? 'text-white' : 'text-zinc-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < IMPORT_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-cyan-500/50' : 'bg-zinc-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <motion.div key={currentStep} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Step 0: Upload */}
          {currentStep === 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="text-center mb-4">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white mb-2">Upload Contacts File</h2>
                <p className="text-xs text-zinc-400">Upload a CSV or Excel file containing your contacts</p>
              </div>
              <div className="border-2 border-dashed border-zinc-700 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:border-cyan-500/30 transition-colors cursor-default">
                <div className="p-4 rounded-2xl bg-cyan-500/10 mb-4">
                  <Upload className="w-10 h-10 text-cyan-400" />
                </div>
                <p className="text-white font-semibold">Drop your file here</p>
                <p className="text-sm text-zinc-500 mt-1">or click to browse</p>
                <p className="text-xs text-zinc-600 mt-3">Supports CSV, Excel (.xlsx), and LinkedIn exports. Max 50MB.</p>
              </div>
            </div>
          )}

          {/* Step 1: Type Selection */}
          {currentStep === 1 && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="text-center mb-4">
                <Users className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white mb-2">Select Contact Type</h2>
                <p className="text-xs text-zinc-400">What type of contacts are you importing?</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {IMPORT_CONTACT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all cursor-default ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-cyan-400' : 'text-zinc-400'}`} />
                      <h3 className={`font-medium mb-1 text-sm ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{type.label}</h3>
                      <p className="text-[10px] text-zinc-500">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {currentStep === 2 && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-2">Map Columns</h2>
                <p className="text-xs text-zinc-400">Match your spreadsheet columns to contact fields</p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-400">AI suggested mappings (92% confidence)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {FIELD_MAPPING.map((field) => (
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Validate */}
          {currentStep === 3 && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-2">Review Data</h2>
                <p className="text-xs text-zinc-400">Review the data before importing (1,206 valid contacts found)</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <div className="text-lg font-bold text-cyan-400">1,206</div>
                  <div className="text-[10px] text-zinc-400">Valid contacts</div>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="text-lg font-bold text-red-400">34</div>
                  <div className="text-[10px] text-zinc-400">Invalid rows</div>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-zinc-900/50 border-zinc-800">
                      <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Company</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {[
                      { name: 'Sarah Mitchell', email: 'sarah@techventures.com', company: 'TechVentures', phone: '+1 555-0101' },
                      { name: 'James Park', email: 'james@novatech.io', company: 'NovaTech', phone: '+1 555-0102' },
                      { name: 'Lisa Tran', email: 'lisa@meridian.com', company: 'Meridian Health', phone: '+1 555-0103' },
                      { name: 'Carlos Diaz', email: 'carlos@urbanedge.com', company: 'UrbanEdge', phone: '-' },
                      { name: 'Nina Patel', email: 'nina@greenleaf.com', company: 'GreenLeaf', phone: '+1 555-0105' },
                    ].map((row) => (
                      <tr key={row.email} className="hover:bg-zinc-800/20">
                        <td className="px-3 py-2 text-sm text-white">{row.name}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{row.email}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{row.company}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 text-center text-xs text-zinc-500 border-t border-zinc-800">
                  Showing first 5 of 1,206 contacts
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Import */}
          {currentStep === 4 && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <Download className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white mb-2">Ready to Import</h2>
              <p className="text-xs text-zinc-400 mb-4">
                1,206 contacts will be imported as {IMPORT_CONTACT_TYPES.find(t => t.id === selectedType)?.label || 'contacts'}
              </p>
              <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 mx-auto cursor-default">
                <Download className="w-4 h-4" />
                Start Import
              </button>
            </div>
          )}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4 gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-sm border rounded-lg flex items-center gap-2 cursor-default ${
              currentStep === 0 ? 'border-zinc-800 text-zinc-600' : 'border-zinc-700 text-zinc-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          {currentStep < IMPORT_STEPS.length - 1 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg flex items-center gap-2 cursor-default"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Import History */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden mt-6">
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
                {IMPORT_HISTORY.map((imp) => (
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
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        imp.status === 'Completed' ? 'bg-cyan-500/15 text-cyan-400' :
                        imp.status === 'Failed' ? 'bg-red-500/15 text-red-400' :
                        'bg-zinc-500/15 text-zinc-400'
                      }`}>{imp.status}</span>
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
    </div>
  );
}
