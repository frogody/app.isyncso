import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  GraduationCap,
  TrendingUp,
  Shield,
  DollarSign,
  Rocket,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Zap,
  Clock,
  Users,
  Star,
  Sparkles,
  Settings,
  Power,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/utils';

// Agent definitions - in production, these would come from the database
const AGENTS_DATA = [
  {
    id: 'learn',
    name: 'Learn Agent',
    shortName: 'Learn',
    description: 'Your AI learning companion that personalizes course recommendations, tracks skill development, and provides intelligent tutoring support.',
    icon: GraduationCap,
    color: 'cyan',
    status: 'active',
    category: 'Productivity',
    capabilities: [
      'Personalized course recommendations',
      'Skill gap analysis',
      'Learning path optimization',
      'AI tutoring assistance',
      'Progress tracking & analytics',
      'Certificate management'
    ],
    useCases: [
      'Get course suggestions based on your role',
      'Track team learning progress',
      'Generate skill development reports',
      'Answer questions during lessons'
    ],
    stats: {
      users: '2.4k',
      tasks: '15k',
      satisfaction: '94%'
    },
    appLink: '/Learn'
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    shortName: 'Growth',
    description: 'Accelerate your sales pipeline with AI-powered prospect research, campaign automation, and intelligent lead scoring.',
    icon: TrendingUp,
    color: 'indigo',
    status: 'active',
    category: 'Sales',
    capabilities: [
      'Lead scoring & qualification',
      'Prospect enrichment',
      'Campaign automation',
      'Email sequence generation',
      'Market research',
      'Competitive intelligence'
    ],
    useCases: [
      'Find and qualify new prospects',
      'Generate personalized outreach',
      'Analyze campaign performance',
      'Research target companies'
    ],
    stats: {
      users: '1.8k',
      tasks: '28k',
      satisfaction: '91%'
    },
    appLink: '/Growth'
  },
  {
    id: 'sentinel',
    name: 'Sentinel Agent',
    shortName: 'Sentinel',
    description: 'Your AI compliance guardian that monitors risks, ensures governance, and generates compliance documentation automatically.',
    icon: Shield,
    color: 'sage',
    status: 'active',
    category: 'Compliance',
    capabilities: [
      'Risk assessment automation',
      'Compliance monitoring',
      'Document generation',
      'AI system governance',
      'Regulatory tracking',
      'Audit preparation'
    ],
    useCases: [
      'Assess AI system risks',
      'Generate compliance reports',
      'Monitor regulatory changes',
      'Create governance documentation'
    ],
    stats: {
      users: '890',
      tasks: '5.2k',
      satisfaction: '96%'
    },
    appLink: '/Sentinel'
  },
  {
    id: 'finance',
    name: 'Finance Agent',
    shortName: 'Finance',
    description: 'Streamline financial operations with intelligent invoice processing, expense categorization, and budget forecasting.',
    icon: DollarSign,
    color: 'amber',
    status: 'coming_soon',
    category: 'Finance',
    capabilities: [
      'Invoice processing',
      'Expense categorization',
      'Budget forecasting',
      'Cash flow analysis',
      'Financial reporting',
      'Subscription management'
    ],
    useCases: [
      'Process invoices automatically',
      'Categorize expenses with AI',
      'Forecast quarterly budgets',
      'Track subscription spend'
    ],
    stats: {
      users: '-',
      tasks: '-',
      satisfaction: '-'
    },
    appLink: '/Finance'
  },
  {
    id: 'raise',
    name: 'Raise Agent',
    shortName: 'Raise',
    description: 'Navigate fundraising with AI assistance for investor research, pitch preparation, and deal pipeline management.',
    icon: Rocket,
    color: 'orange',
    status: 'coming_soon',
    category: 'Fundraising',
    capabilities: [
      'Investor matching',
      'Pitch deck analysis',
      'Due diligence preparation',
      'Deal flow tracking',
      'Valuation insights',
      'Term sheet analysis'
    ],
    useCases: [
      'Find matching investors',
      'Prepare pitch materials',
      'Track fundraising pipeline',
      'Analyze term sheets'
    ],
    stats: {
      users: '-',
      tasks: '-',
      satisfaction: '-'
    },
    appLink: '/Raise'
  }
];

const colorStyles = {
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    solid: 'bg-cyan-500',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    gradient: 'from-cyan-500/20 to-cyan-600/5'
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    solid: 'bg-indigo-500',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    gradient: 'from-indigo-500/20 to-indigo-600/5'
  },
  sage: {
    bg: 'bg-[#86EFAC]/10',
    border: 'border-[#86EFAC]/30',
    text: 'text-[#86EFAC]',
    solid: 'bg-[#86EFAC]',
    glow: 'shadow-[0_0_20px_rgba(134,239,172,0.3)]',
    gradient: 'from-[#86EFAC]/20 to-[#86EFAC]/5'
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    solid: 'bg-amber-500',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    gradient: 'from-amber-500/20 to-amber-600/5'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    solid: 'bg-orange-500',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]',
    gradient: 'from-orange-500/20 to-orange-600/5'
  }
};

function AgentCard({ agent, onToggle, onViewDetails }) {
  const colors = colorStyles[agent.color];
  const Icon = agent.icon;
  const isActive = agent.status === 'active';
  const isComingSoon = agent.status === 'coming_soon';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={cn(
        'relative rounded-xl border bg-zinc-900/60 backdrop-blur-xl overflow-hidden cursor-pointer group',
        colors.border,
        isActive && 'hover:' + colors.glow
      )}
      onClick={() => onViewDetails(agent)}
    >
      {/* Gradient background */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', colors.gradient)} />

      {/* Status indicator */}
      <div className="absolute top-3 right-3 z-10">
        {isActive ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">Active</span>
          </div>
        ) : isComingSoon ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-500/20 border border-zinc-500/30">
            <Clock className="w-2.5 h-2.5 text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-medium">Soon</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-700/50 border border-zinc-600/30">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-medium">Off</span>
          </div>
        )}
      </div>

      <div className="relative p-4">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mb-3 border',
          colors.bg,
          colors.border
        )}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>

        {/* Title & Description */}
        <h3 className="text-sm font-semibold text-white mb-1">{agent.name}</h3>
        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{agent.description}</p>

        {/* Capabilities preview - only show 2 */}
        <div className="space-y-1 mb-3">
          {agent.capabilities.slice(0, 2).map((cap, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div className={cn('w-1 h-1 rounded-full', colors.solid)} />
              <span className="text-[11px] text-zinc-400 truncate">{cap}</span>
            </div>
          ))}
          {agent.capabilities.length > 2 && (
            <span className={cn('text-[11px]', colors.text)}>+{agent.capabilities.length - 2} more</span>
          )}
        </div>

        {/* Stats */}
        {isActive && (
          <div className="flex items-center gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-400">{agent.stats.users}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-400">{agent.stats.tasks}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-400">{agent.stats.satisfaction}</span>
            </div>
          </div>
        )}

        {/* View details arrow */}
        <div className={cn(
          'absolute bottom-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all',
          'bg-white/5 group-hover:bg-white/10',
          colors.text
        )}>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Agents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agents, setAgents] = useState(AGENTS_DATA);

  const categories = ['all', ...new Set(AGENTS_DATA.map(a => a.category))];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || agent.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && agent.status === 'active') ||
                         (statusFilter === 'coming_soon' && agent.status === 'coming_soon');
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleToggleAgent = (agentId) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId
        ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' }
        : a
    ));
  };

  const handleViewDetails = (agent) => {
    navigate(`/AgentDetail?id=${agent.id}`);
  };

  const activeCount = agents.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Specialized Agents"
        subtitle="Browse and manage AI agents that power your workspace"
        icon={Bot}
        color="cyan"
        badge={
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-medium">{activeCount} Active</span>
          </div>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-white/10">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="coming_soon">Coming Soon</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg bg-zinc-800/50 border border-white/10 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'space-y-3'
      )}>
        <AnimatePresence mode="popLayout">
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <AgentCard
                agent={agent}
                onToggle={handleToggleAgent}
                onViewDetails={handleViewDetails}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredAgents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No agents found</h3>
          <p className="text-zinc-400">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-zinc-900/60 border border-white/10"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <h4 className="font-medium text-white mb-1">Orchestrated by Sync</h4>
          <p className="text-sm text-zinc-400">All agents are coordinated by Sync, your central AI brain</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl bg-zinc-900/60 border border-white/10"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <h4 className="font-medium text-white mb-1">Fully Configurable</h4>
          <p className="text-sm text-zinc-400">Enable or disable agents based on your team's needs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-xl bg-zinc-900/60 border border-white/10"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
            <Power className="w-5 h-5 text-emerald-400" />
          </div>
          <h4 className="font-medium text-white mb-1">Always Learning</h4>
          <p className="text-sm text-zinc-400">Agents improve over time based on your usage patterns</p>
        </motion.div>
      </div>
    </div>
  );
}
