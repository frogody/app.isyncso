import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Rocket, Download, Plus, Target, Euro, Users, FileText,
  BarChart3, Briefcase, Building2, Mail, ExternalLink,
  MessageSquare, MoreHorizontal,
} from 'lucide-react';

// ─── Investor Pipeline Stages ───────────────────────────────────────────────────
const INVESTOR_STAGES = [
  { id: 'contacted', label: 'Contacted', color: 'from-zinc-500 to-zinc-600', dotBg: 'bg-zinc-500' },
  { id: 'interested', label: 'Interested', color: 'from-orange-500 to-orange-600', dotBg: 'bg-orange-500' },
  { id: 'in_discussions', label: 'In Discussions', color: 'from-orange-400 to-orange-500', dotBg: 'bg-orange-400' },
  { id: 'due_diligence', label: 'Due Diligence', color: 'from-orange-500 to-orange-600', dotBg: 'bg-orange-500' },
  { id: 'committed', label: 'Committed', color: 'from-green-500 to-green-600', dotBg: 'bg-green-500' },
  { id: 'passed', label: 'Passed', color: 'from-red-500 to-red-600', dotBg: 'bg-red-500' },
];

// ─── Mock Campaign ──────────────────────────────────────────────────────────────
const ACTIVE_CAMPAIGN = {
  name: 'Series A Round',
  round_type: 'Series A',
  target_amount: 2500000,
  raised_amount: 1800000,
  status: 'active',
};

// ─── Mock Investors (12 across all stages) ──────────────────────────────────────
const MOCK_INVESTORS = [
  // Contacted (2)
  { id: 'inv-1', name: 'Emily Zhang', firm: 'Lightspeed Ventures', status: 'contacted', check_size: 200000, email: 'e.zhang@lightspeed.com', linkedin: 'https://linkedin.com/in/emilyzhang' },
  { id: 'inv-2', name: 'Marcus Eriksson', firm: 'Atomico', status: 'contacted', check_size: 350000, email: 'm.eriksson@atomico.com', linkedin: 'https://linkedin.com/in/meriksson' },
  // Interested (3)
  { id: 'inv-3', name: 'Rachel Chen', firm: 'Accel Partners', status: 'interested', check_size: 400000, email: 'r.chen@accel.com', linkedin: 'https://linkedin.com/in/rachelchen' },
  { id: 'inv-4', name: 'Jessica Schultz', firm: 'Northzone', status: 'interested', check_size: 300000, email: 'j.schultz@northzone.com', linkedin: null },
  { id: 'inv-5', name: 'James Wise', firm: 'Balderton Capital', status: 'interested', check_size: 250000, email: 'j.wise@balderton.com', linkedin: 'https://linkedin.com/in/jameswise' },
  // In Discussions (2)
  { id: 'inv-6', name: 'David Park', firm: 'Andreessen Horowitz', status: 'in_discussions', check_size: 750000, email: 'd.park@a16z.com', linkedin: 'https://linkedin.com/in/davidpark' },
  { id: 'inv-7', name: 'Sophie Laurent', firm: 'Index Ventures', status: 'in_discussions', check_size: 350000, email: 's.laurent@indexventures.com', linkedin: 'https://linkedin.com/in/sophielaurent' },
  // Due Diligence (1)
  { id: 'inv-8', name: 'Michael Torres', firm: 'General Catalyst', status: 'due_diligence', check_size: 500000, email: 'm.torres@generalcatalyst.com', linkedin: 'https://linkedin.com/in/michaeltorres' },
  // Committed (3)
  { id: 'inv-9', name: 'Sarah Lin', firm: 'Sequoia Capital', status: 'committed', check_size: 500000, email: 's.lin@sequoiacap.com', linkedin: 'https://linkedin.com/in/sarahlin' },
  { id: 'inv-10', name: 'Aydin Senkut', firm: 'Felicis Ventures', status: 'committed', check_size: 300000, email: 'a.senkut@felicis.com', linkedin: 'https://linkedin.com/in/aydinsenkut' },
  { id: 'inv-11', name: 'Carl Fritjofsson', firm: 'Creandum', status: 'committed', check_size: 200000, email: 'c.fritjofsson@creandum.com', linkedin: null },
  // Passed (1)
  { id: 'inv-12', name: 'Laura Kim', firm: 'Benchmark', status: 'passed', check_size: 400000, email: 'l.kim@benchmark.com', linkedin: 'https://linkedin.com/in/laurakim' },
];

// ─── Mock Pitch Decks ───────────────────────────────────────────────────────────
const MOCK_PITCH_DECKS = [
  { id: 'deck-1', name: 'Series A Pitch Deck', version: 'v2.3', description: 'Main investor presentation' },
  { id: 'deck-2', name: 'One-Pager', version: 'v1.1', description: 'Executive summary document' },
  { id: 'deck-3', name: 'Financial Model', version: 'v3.0', description: '3-year financial projections' },
];

// ─── Mock Data Rooms ────────────────────────────────────────────────────────────
const MOCK_DATA_ROOMS = [
  { id: 'dr-1', name: 'Series A Data Room', documents_count: 24, viewers: 8 },
  { id: 'dr-2', name: 'Legal Documents', documents_count: 12, viewers: 3 },
];

// ─── Animation Variants ─────────────────────────────────────────────────────────
const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoRaise({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [activeTab, setActiveTab] = useState('investors');

  // Campaign metrics
  const targetAmount = ACTIVE_CAMPAIGN.target_amount;
  const raisedAmount = ACTIVE_CAMPAIGN.raised_amount;
  const progressPercent = Math.round((raisedAmount / targetAmount) * 100);
  const totalInvestors = MOCK_INVESTORS.length;
  const interestedInvestors = MOCK_INVESTORS.filter(i => i.status === 'interested' || i.status === 'in_discussions').length;
  const committedInvestors = MOCK_INVESTORS.filter(i => i.status === 'committed').length;

  const metrics = [
    {
      label: 'Raise Target',
      value: `\u20AC${(targetAmount / 1000000).toFixed(1)}M`,
      subtitle: ACTIVE_CAMPAIGN.name,
      icon: Target,
      accentColor: 'orange',
    },
    {
      label: 'Amount Raised',
      value: `\u20AC${(raisedAmount / 1000000).toFixed(1)}M`,
      subtitle: `${progressPercent}% of target`,
      icon: Euro,
      accentColor: 'green',
    },
    {
      label: 'Investor Pipeline',
      value: totalInvestors,
      subtitle: `${interestedInvestors} interested, ${committedInvestors} committed`,
      icon: Users,
      accentColor: 'blue',
    },
    {
      label: 'Pitch Decks',
      value: MOCK_PITCH_DECKS.length,
      subtitle: `${MOCK_DATA_ROOMS.length} data rooms`,
      icon: FileText,
      accentColor: 'purple',
    },
  ];

  const accentBarColors = {
    orange: 'bg-orange-400',
    green: 'bg-green-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
  };

  const iconBgColors = {
    orange: 'bg-orange-500/10 text-orange-400',
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'investors', label: 'Investors', icon: Users },
    { id: 'materials', label: 'Materials', icon: FileText },
    { id: 'dataroom', label: 'Data Room', icon: Briefcase },
  ];

  // Pipeline stage data for overview
  const pipelineStages = [
    { stage: 'Contacted', count: MOCK_INVESTORS.filter(i => i.status === 'contacted').length, color: 'bg-zinc-500' },
    { stage: 'Interested', count: MOCK_INVESTORS.filter(i => i.status === 'interested').length, color: 'bg-orange-500' },
    { stage: 'In Discussions', count: MOCK_INVESTORS.filter(i => i.status === 'in_discussions').length, color: 'bg-orange-400' },
    { stage: 'Due Diligence', count: MOCK_INVESTORS.filter(i => i.status === 'due_diligence').length, color: 'bg-orange-500' },
    { stage: 'Committed', count: MOCK_INVESTORS.filter(i => i.status === 'committed').length, color: 'bg-green-500' },
  ];

  const getStatusBadgeStyle = (status) => {
    const map = {
      contacted: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
      interested: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      in_discussions: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      due_diligence: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      committed: 'bg-green-500/10 text-green-400 border-green-500/30',
      passed: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return map[status] || 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30';
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">

        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div data-demo="header" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Raise</h1>
            </div>
            <p className="text-xs text-zinc-400">Fundraising toolkit &amp; investor management</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-orange-500 text-white hover:bg-orange-400">
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* ─── Active Campaign Progress Bar ─────────────────────────────────── */}
        <motion.div
          data-demo="campaign-progress"
          initial={slideUp.initial}
          animate={slideUp.animate}
          transition={{ ...slideUp.transition, delay: 0.05 }}
          className="relative rounded-[20px] border backdrop-blur-sm bg-gradient-to-r from-orange-950/50 to-orange-950/50 border-orange-500/20 transition-all duration-200"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{ACTIVE_CAMPAIGN.name}</h3>
                <p className="text-sm text-zinc-400">{ACTIVE_CAMPAIGN.round_type}</p>
              </div>
              <span className="inline-flex items-center rounded-full border font-medium px-2.5 py-0.5 text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                Active
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Progress</span>
                <span className="text-white font-medium">
                  {'\u20AC'}{(raisedAmount / 1000000).toFixed(2)}M / {'\u20AC'}{(targetAmount / 1000000).toFixed(2)}M
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-right">{progressPercent}% raised</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Metrics Grid (RaiseStatCard pattern) ─────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {metrics.map((metric, index) => {
            const IconComp = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3, ease: 'easeOut' }}
              >
                <div className="relative rounded-[20px] border backdrop-blur-sm bg-zinc-900/50 border-zinc-800/60 text-white transition-all duration-200 overflow-hidden">
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-[20px] ${accentBarColors[metric.accentColor]}`} />
                  <div className="p-5 pl-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider mb-2 text-zinc-500">{metric.label}</p>
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                        <p className="text-xs mt-1 text-zinc-500">{metric.subtitle}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${iconBgColors[metric.accentColor]}`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`cursor-default inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ─── Tab Content ─────────────────────────────────────────────── */}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={slideUp.initial}
              animate={slideUp.animate}
              transition={slideUp.transition}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Investor Pipeline Breakdown */}
                <div className="relative rounded-[20px] border backdrop-blur-sm bg-zinc-900/50 border-zinc-800/60 text-white transition-all duration-200">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <div className="font-semibold leading-none tracking-tight text-white">Investor Pipeline</div>
                    <div className="text-sm text-zinc-400">Breakdown by stage</div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-3">
                      {pipelineStages.map((stage) => (
                        <div key={stage.stage} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                            <span className="text-zinc-300 text-sm">{stage.stage}</span>
                          </div>
                          <span className="text-white font-medium text-sm">{stage.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="relative rounded-[20px] border backdrop-blur-sm bg-zinc-900/50 border-zinc-800/60 text-white transition-all duration-200">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <div className="font-semibold leading-none tracking-tight text-white">Recent Activity</div>
                    <div className="text-sm text-zinc-400">Latest investor interactions</div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-3">
                      {MOCK_INVESTORS.slice(0, 5).map((investor) => (
                        <div key={investor.id} className="flex items-start gap-2 p-2 bg-zinc-800/50 rounded-xl">
                          <div className="p-1.5 bg-orange-500/10 rounded-lg">
                            <Building2 className="w-3 h-3 text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{investor.name}</p>
                            <p className="text-[10px] text-zinc-500">{investor.firm}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full border font-medium px-2 py-0.5 text-[10px] ${getStatusBadgeStyle(investor.status)}`}>
                            {investor.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Investors Tab (Kanban) */}
          {activeTab === 'investors' && (
            <motion.div
              key="investors"
              initial={slideUp.initial}
              animate={slideUp.animate}
              transition={slideUp.transition}
            >
              <div className="space-y-3">
                {/* Sub-header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Investor Pipeline</h2>
                    <p className="text-zinc-500 text-xs">{totalInvestors} investors in pipeline</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-zinc-900 rounded-full border border-zinc-800 p-0.5">
                      <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50">
                        <BarChart3 className="w-3 h-3" />
                        Board
                      </button>
                      <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30">
                        <Users className="w-3 h-3" />
                        List
                      </button>
                    </div>
                    <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-orange-500 text-white hover:bg-orange-400">
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Kanban Board */}
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {INVESTOR_STAGES.map((stage) => {
                    const stageInvestors = MOCK_INVESTORS.filter(i => i.status === stage.id);
                    const totalCheckSize = stageInvestors.reduce((sum, i) => sum + (i.check_size || 0), 0);

                    return (
                      <div key={stage.id} className="flex-shrink-0 w-72">
                        {/* Column Header - sticky */}
                        <div className="sticky top-0 z-10 pb-3 bg-black">
                          <div className="bg-zinc-900/70 backdrop-blur-xl rounded-[20px] border border-zinc-800/60 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${stage.color}`} />
                                <h3 className="text-white font-semibold text-sm">{stage.label}</h3>
                                <span className="inline-flex items-center rounded-full border font-medium px-2 py-0.5 text-[10px] bg-zinc-700/30 text-zinc-400 border-zinc-600/30">
                                  {stageInvestors.length}
                                </span>
                              </div>
                              <button className="cursor-default h-7 w-7 inline-flex items-center justify-center rounded-full bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/30 transition-colors">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-between">
                                <span className="text-lg font-bold text-orange-400/80">
                                  {'\u20AC'}{(totalCheckSize / 1000).toLocaleString()}k
                                </span>
                                <span className="text-xs text-zinc-600">potential</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Investor Cards */}
                        <div className="space-y-3 min-h-[300px] rounded-[20px] p-2 border-2 border-transparent">
                          {stageInvestors.map((investor, index) => (
                            <motion.div
                              key={investor.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05, duration: 0.25 }}
                              className="group relative bg-zinc-900/60 backdrop-blur-sm rounded-[20px] border border-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200"
                            >
                              {/* Top gradient bar */}
                              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r ${stage.color} opacity-60`} />

                              <div className="p-4">
                                {/* Header: Firm name + actions */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-white truncate">{investor.name}</h4>
                                    <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-1">
                                      <Building2 className="w-3 h-3" />
                                      <span className="truncate">{investor.firm}</span>
                                    </p>
                                  </div>
                                  <button className="cursor-default h-7 w-7 inline-flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800">
                                    <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                                  </button>
                                </div>

                                {/* Check Size */}
                                <div className="mt-3">
                                  <span className="text-lg font-bold text-white">
                                    {'\u20AC'}{(investor.check_size / 1000).toFixed(0)}k
                                  </span>
                                  <span className="text-zinc-600 text-sm ml-2">check size</span>
                                </div>

                                {/* Contact Info */}
                                <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-3 text-xs">
                                  {investor.email && (
                                    <span className="flex items-center gap-1 text-zinc-500">
                                      <Mail className="w-3 h-3" />
                                      <span className="truncate max-w-[100px]">{investor.email}</span>
                                    </span>
                                  )}
                                  {investor.linkedin && (
                                    <span className="flex items-center gap-1 text-zinc-500 cursor-default">
                                      <ExternalLink className="w-3 h-3" />
                                      LinkedIn
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}

                          {/* Empty state for columns with no investors */}
                          {stageInvestors.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-[20px] cursor-default transition-colors">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} opacity-20 flex items-center justify-center mb-3`}>
                                <Plus className="w-5 h-5 text-white" />
                              </div>
                              <p className="text-zinc-600 text-sm">Drop investor here</p>
                              <p className="text-zinc-700 text-xs mt-1">or click to add</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={slideUp.initial}
              animate={slideUp.animate}
              transition={slideUp.transition}
            >
              <div className="relative rounded-[20px] border backdrop-blur-sm bg-zinc-900/50 border-zinc-800/60 text-white transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold leading-none tracking-tight text-white">Pitch Materials</div>
                      <div className="text-sm text-zinc-400 mt-1.5">Decks, one-pagers, and presentations</div>
                    </div>
                    <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-orange-500 text-white hover:bg-orange-400">
                      <Plus className="w-3 h-3" />
                      Upload
                    </button>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {MOCK_PITCH_DECKS.map((deck) => (
                      <div
                        key={deck.id}
                        className="p-3 bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 rounded-xl transition-colors cursor-default"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="p-1.5 bg-orange-500/10 rounded-lg">
                            <FileText className="w-4 h-4 text-orange-400" />
                          </div>
                          <span className="inline-flex items-center rounded-full border font-medium px-2 py-0.5 text-[10px] bg-zinc-700/30 text-zinc-400 border-zinc-600/30">
                            {deck.version}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-white mb-0.5">{deck.name}</h4>
                        <p className="text-xs text-zinc-500">{deck.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Data Room Tab */}
          {activeTab === 'dataroom' && (
            <motion.div
              key="dataroom"
              initial={slideUp.initial}
              animate={slideUp.animate}
              transition={slideUp.transition}
            >
              <div className="relative rounded-[20px] border backdrop-blur-sm bg-zinc-900/50 border-zinc-800/60 text-white transition-all duration-200">
                <div className="flex flex-col space-y-1.5 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold leading-none tracking-tight text-white">Data Rooms</div>
                      <div className="text-sm text-zinc-400 mt-1.5">Secure document sharing with investors</div>
                    </div>
                    <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-orange-500 text-white hover:bg-orange-400">
                      <Plus className="w-3 h-3" />
                      Create
                    </button>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="space-y-2">
                    {MOCK_DATA_ROOMS.map((room) => (
                      <div key={room.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-500/10 rounded-lg">
                            <Briefcase className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{room.name}</p>
                            <p className="text-xs text-zinc-500">{room.documents_count} documents</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">{room.viewers} viewers</span>
                          <button className="cursor-default inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors duration-200 h-8 px-4 text-xs bg-transparent text-white border border-zinc-700 hover:bg-zinc-800/50">
                            <ExternalLink className="w-3 h-3" />
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
