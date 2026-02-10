import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, AlertTriangle, CheckCircle, Clock, Search, Shield, Plus, Target,
  Zap, Building2, MoreHorizontal, ArrowRight,
  Calendar, FileText, Map, TrendingUp, Sparkles, Flag, PlayCircle,
  File, Check, ArrowLeft, Eye, Download,
} from 'lucide-react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SHARED PRIMITIVES (replicate SentinelCard, StatCard, SentinelBadge visuals)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Card({ children, className = '', padding = 'md', interactive = false, style, onClick, ...rest }) {
  const pad = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }[padding] || 'p-6';
  return (
    <motion.div
      onClick={onClick}
      className={`relative rounded-[20px] backdrop-blur-sm bg-zinc-900/50 border border-zinc-800/60 ${pad} ${interactive ? 'cursor-default hover:border-zinc-700/60 transition-all duration-200' : 'transition-colors duration-200'} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const ACCENT = {
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-500/10 border-emerald-500/20', iconText: 'text-emerald-400' },
  orange:  { bar: 'bg-orange-500',  iconBg: 'bg-orange-500/10 border-orange-500/20',  iconText: 'text-orange-400' },
  red:     { bar: 'bg-red-500',     iconBg: 'bg-red-500/10 border-red-500/20',     iconText: 'text-red-400' },
  green:   { bar: 'bg-green-500',   iconBg: 'bg-green-500/10 border-green-500/20',   iconText: 'text-green-400' },
  yellow:  { bar: 'bg-yellow-500',  iconBg: 'bg-yellow-500/10 border-yellow-500/20',  iconText: 'text-yellow-400' },
  purple:  { bar: 'bg-purple-500',  iconBg: 'bg-purple-500/10 border-purple-500/20',  iconText: 'text-purple-400' },
  blue:    { bar: 'bg-blue-500',    iconBg: 'bg-blue-500/10 border-blue-500/20',    iconText: 'text-blue-400' },
};

function StatCard({ icon: Icon, label, value, subtitle, delay = 0, accentColor = 'emerald' }) {
  const a = ACCENT[accentColor] || ACCENT.emerald;
  return (
    <Card padding="none" className="min-w-0 overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <div className="flex">
        <div className={`w-1 rounded-l-[20px] ${a.bar}`} />
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
            <div className={`p-2 rounded-xl border ${a.iconBg}`}>
              <Icon className={`w-4 h-4 ${a.iconText}`} />
            </div>
          </div>
          <motion.div
            className="text-2xl font-bold tabular-nums mb-0.5 text-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay + 0.1 }}
          >
            {value}
          </motion.div>
          {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
        </div>
      </div>
    </Card>
  );
}

function Badge({ variant = 'neutral', children }) {
  const styles = {
    success:  'bg-green-500/15 text-green-400 border border-green-500/20',
    warning:  'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    error:    'bg-red-500/15 text-red-400 border border-red-500/20',
    primary:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    neutral:  'bg-zinc-800 text-zinc-400 border border-zinc-700',
    highRisk: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[variant] || styles.neutral}`}>
      {children}
    </span>
  );
}

function PillButton({ children, variant = 'primary', className = '', icon, size = 'md', ...rest }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-full transition-colors cursor-default';
  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
  };
  const variants = {
    primary: 'bg-[#86EFAC] text-black hover:bg-[#86EFAC]/90',
    secondary: 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700',
    ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-800',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {icon}{children}
    </button>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  1. DemoSentinelSystems — replica of AISystemInventory.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_PROGRESS = {
  'not-started':    { label: 'Not Started',    color: 'text-zinc-500',    progress: 0 },
  'in-progress':    { label: 'In Progress',    color: 'text-emerald-400', progress: 50 },
  compliant:        { label: 'Compliant',      color: 'text-green-400',   progress: 100 },
  'non-compliant':  { label: 'Non-Compliant',  color: 'text-red-400',     progress: 25 },
};

const RISK_ACCENT_COLORS = {
  prohibited:    'bg-red-500',
  'high-risk':   'bg-orange-500',
  gpai:          'bg-purple-500',
  'limited-risk':'bg-yellow-500',
  'minimal-risk':'bg-green-500',
  unclassified:  'bg-zinc-500',
};

const RISK_BADGE_STYLES = {
  prohibited:     'bg-red-500/15 text-red-400 border border-red-500/20',
  'high-risk':    'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  gpai:           'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  'limited-risk': 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  'minimal-risk': 'bg-green-500/15 text-green-400 border border-green-500/20',
  unclassified:   'bg-zinc-700 text-zinc-400 border border-zinc-600',
};

const MOCK_SYSTEMS = [
  { id: '1', name: 'Customer Chatbot', purpose: 'Customer support conversational AI handling first-line queries', risk_classification: 'limited-risk', compliance_status: 'compliant', vendor: 'OpenAI', created_date: '2025-11-10' },
  { id: '2', name: 'Resume Screener', purpose: 'Automated CV screening and candidate ranking for HR department', risk_classification: 'high-risk', compliance_status: 'in-progress', vendor: 'Internal', created_date: '2025-12-01' },
  { id: '3', name: 'Fraud Detection Engine', purpose: 'Transaction anomaly detection for financial operations', risk_classification: 'high-risk', compliance_status: 'compliant', vendor: 'DataRobot', created_date: '2025-10-15' },
  { id: '4', name: 'Content Generator', purpose: 'Marketing copy and content creation using LLMs', risk_classification: 'limited-risk', compliance_status: 'compliant', vendor: 'Anthropic', created_date: '2025-12-20' },
  { id: '5', name: 'Price Optimizer', purpose: 'Dynamic pricing algorithm for e-commerce catalog', risk_classification: 'minimal-risk', compliance_status: 'compliant', vendor: 'Internal', created_date: '2026-01-05' },
  { id: '6', name: 'Sentiment Analyzer', purpose: 'Customer feedback sentiment analysis and topic extraction', risk_classification: 'minimal-risk', compliance_status: 'not-started', vendor: 'AWS', created_date: '2026-01-20' },
  { id: '7', name: 'Predictive Maintenance', purpose: 'Equipment failure prediction using sensor data', risk_classification: 'minimal-risk', compliance_status: 'compliant', vendor: 'Azure ML', created_date: '2025-09-01' },
  { id: '8', name: 'Employee Wellbeing Monitor', purpose: 'Workplace wellbeing scoring from survey and activity data', risk_classification: 'high-risk', compliance_status: 'non-compliant', vendor: 'Internal', created_date: '2025-11-25' },
  { id: '9', name: 'Document Classifier', purpose: 'Automatic classification and routing of incoming documents', risk_classification: 'minimal-risk', compliance_status: 'compliant', vendor: 'Google Cloud', created_date: '2025-08-12' },
];

function SystemCard({ system, index }) {
  const status = STATUS_PROGRESS[system.compliance_status] || STATUS_PROGRESS['not-started'];
  const daysRegistered = Math.floor((Date.now() - new Date(system.created_date).getTime()) / (1000 * 60 * 60 * 24));
  const accent = RISK_ACCENT_COLORS[system.risk_classification] || 'bg-zinc-500';
  const badgeStyle = RISK_BADGE_STYLES[system.risk_classification] || RISK_BADGE_STYLES.unclassified;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      <Card padding="none" interactive>
        {/* Top accent bar */}
        <div className={`h-[3px] w-full rounded-t-[inherit] ${accent}`} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold truncate text-white group-hover:text-emerald-400 transition-colors cursor-default">
                {system.name}
              </h3>
              <div className="mt-1.5">
                <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeStyle}`}>
                  {(system.risk_classification || 'unclassified').replace('-', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:bg-zinc-800 cursor-default">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Purpose */}
          <p className="text-xs line-clamp-2 mb-3 text-zinc-500">{system.purpose}</p>

          {/* Compliance Status */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <span className={`font-medium ${status.color}`}>{status.label}</span>
              <span className="text-zinc-500">{status.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{daysRegistered}d ago
              </span>
              {system.vendor && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{system.vendor}
                </span>
              )}
            </div>
            <PillButton size="sm" variant="ghost">
              Assess <ArrowRight className="w-3 h-3 ml-1" />
            </PillButton>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function DemoSentinelSystems({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = MOCK_SYSTEMS.filter(s => {
    const matchSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = filterClassification === 'all' || s.risk_classification === filterClassification;
    const matchStatus = filterStatus === 'all' || s.compliance_status === filterStatus;
    return matchSearch && matchClass && matchStatus;
  });

  const totalSystems = MOCK_SYSTEMS.length;
  const highRisk = MOCK_SYSTEMS.filter(s => s.risk_classification === 'high-risk').length;
  const compliant = MOCK_SYSTEMS.filter(s => s.compliance_status === 'compliant').length;
  const unclassified = MOCK_SYSTEMS.filter(s => s.risk_classification === 'unclassified').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] flex items-center justify-center bg-emerald-400/10">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">AI System Inventory</h1>
              <p className="text-xs text-zinc-500">{totalSystems} systems registered &middot; {highRisk} high-risk</p>
            </div>
          </div>
          <PillButton icon={<Plus className="w-4 h-4" />}>Register AI System</PillButton>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Cpu} label="Total Systems" value={totalSystems} delay={0} accentColor="emerald" />
          <StatCard icon={AlertTriangle} label="High-Risk" value={highRisk} subtitle="Requires documentation" delay={0.1} accentColor="orange" />
          <StatCard icon={CheckCircle} label="Compliant" value={compliant} subtitle={`${totalSystems > 0 ? Math.round((compliant / totalSystems) * 100) : 0}% of total`} delay={0.2} accentColor="green" />
          <StatCard icon={Target} label="Needs Assessment" value={unclassified} delay={0.3} accentColor="yellow" />
        </div>

        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <div className="flex-1 relative w-full lg:max-w-md flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="search"
                  placeholder="Search AI systems..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400/40"
                />
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-zinc-800 text-zinc-400">
                {filtered.length} results
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <select
                  value={filterClassification}
                  onChange={e => setFilterClassification(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-white appearance-none cursor-default focus:outline-none focus:border-emerald-400/40 w-44"
                >
                  <option value="all">All Classifications</option>
                  <option value="prohibited">Prohibited</option>
                  <option value="high-risk">High-Risk</option>
                  <option value="gpai">GPAI</option>
                  <option value="limited-risk">Limited Risk</option>
                  <option value="minimal-risk">Minimal Risk</option>
                  <option value="unclassified">Unclassified</option>
                </select>
              </div>

              <div className="relative">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-2 text-sm rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-white appearance-none cursor-default focus:outline-none focus:border-emerald-400/40 w-40"
                >
                  <option value="all">All Statuses</option>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="compliant">Compliant</option>
                  <option value="non-compliant">Non-Compliant</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((system, i) => (
              <SystemCard key={system.id} system={system} index={i} />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-zinc-900">
              <Search className="w-7 h-7 text-zinc-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold mb-1 text-zinc-300">No Systems Found</h3>
              <p className="text-sm mb-3 text-zinc-500">No systems match your current filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setFilterClassification('all'); setFilterStatus('all'); }}
                className="text-sm font-medium px-4 py-1.5 rounded-full text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors cursor-default"
              >
                Try adjusting your filters
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  2. DemoSentinelRoadmap — replica of ComplianceRoadmap.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ENFORCEMENT_MILESTONES = [
  { date: '2025-02-02', title: 'Prohibited Practices & AI Literacy', description: 'Ban on prohibited AI practices. AI literacy requirements for providers and deployers.', icon: AlertTriangle },
  { date: '2025-08-02', title: 'GPAI & Governance Rules', description: 'General-Purpose AI obligations. EU AI Office governance framework active.', icon: Target },
  { date: '2026-08-02', title: 'High-Risk AI Full Compliance', description: 'All high-risk AI system obligations enforceable. CE marking, conformity assessment required.', icon: CheckCircle },
  { date: '2027-08-02', title: 'High-Risk Systems in Regulated Products', description: 'High-risk AI in products covered by Annex I must comply.', icon: Flag },
];

const MOCK_SYSTEM_PROGRESS = [
  { system: { id: '1', name: 'Resume Screener', risk_classification: 'high-risk' }, completedTasks: 4, totalTasks: 8, progress: 50, urgentTasks: 2 },
  { system: { id: '2', name: 'Fraud Detection Engine', risk_classification: 'high-risk' }, completedTasks: 7, totalTasks: 8, progress: 87.5, urgentTasks: 0 },
  { system: { id: '3', name: 'Employee Wellbeing Monitor', risk_classification: 'high-risk' }, completedTasks: 1, totalTasks: 8, progress: 12.5, urgentTasks: 3 },
  { system: { id: '4', name: 'Customer Chatbot', risk_classification: 'limited-risk' }, completedTasks: 3, totalTasks: 4, progress: 75, urgentTasks: 1 },
];

const MOCK_URGENT_TASKS = [
  { id: 'u1', daysRemaining: -5, obligation: { obligation_title: 'Submit FRIA for Resume Screener' }, system: { id: '2', name: 'Resume Screener' } },
  { id: 'u2', daysRemaining: 12, obligation: { obligation_title: 'Complete conformity assessment documentation' }, system: { id: '3', name: 'Employee Wellbeing Monitor' } },
  { id: 'u3', daysRemaining: 28, obligation: { obligation_title: 'Update human oversight protocol' }, system: { id: '3', name: 'Employee Wellbeing Monitor' } },
  { id: 'u4', daysRemaining: 45, obligation: { obligation_title: 'Data governance plan review' }, system: { id: '1', name: 'Customer Chatbot' } },
];

function CircularProgress({ value, size = 32 }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-zinc-800" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-emerald-400" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function MilestoneCard({ milestone, index, isLast }) {
  const isPast = new Date(milestone.date) < new Date();
  const daysUntil = Math.ceil((new Date(milestone.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const Icon = milestone.icon;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="relative">
      {/* Connecting line */}
      {!isLast && (
        <div
          className={`absolute left-6 top-20 bottom-0 ${isPast ? 'bg-emerald-500/50' : ''}`}
          style={isPast ? { width: '2px' } : { width: 0, borderLeft: '2px dashed rgb(63 63 70)', }}
        />
      )}

      {/* Date node circle */}
      <div className="absolute left-[18px] top-6 z-10">
        {isPast ? (
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        ) : (
          <div className="w-3 h-3 rounded-full border-2 border-zinc-500 bg-zinc-900" />
        )}
      </div>

      <Card
        padding="md"
        className={isPast ? 'border-emerald-500/30' : ''}
        style={isPast ? { borderLeft: '3px solid rgb(52, 211, 153)' } : undefined}
      >
        {isPast && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r from-emerald-500 to-emerald-400" />}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-emerald-400/20' : 'bg-zinc-800'}`}>
            <Icon className={`w-4 h-4 ${isPast ? 'text-emerald-400' : 'text-zinc-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg text-white">{milestone.title}</h3>
                <p className="text-xs mt-1 text-zinc-500">{milestone.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isPast ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <div className="text-center">
                    <div className={`text-xl font-bold ${daysUntil <= 180 ? 'text-yellow-400' : 'text-zinc-400'}`}>{daysUntil}</div>
                    <div className="text-[10px] text-zinc-600">days</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(milestone.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function SystemProgressCard({ item, index }) {
  const riskBorderColor = (() => {
    const risk = item.system.risk_classification?.toLowerCase();
    if (risk?.includes('high')) return 'border-l-red-400';
    if (risk?.includes('limited')) return 'border-l-yellow-400';
    if (risk?.includes('minimal')) return 'border-l-emerald-400';
    return 'border-l-zinc-600';
  })();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card padding="md" className={`border-l-[3px] ${riskBorderColor}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate text-white">{item.system.name}</h3>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant="primary">{item.system.risk_classification?.replace('-', ' ').toUpperCase()}</Badge>
              <span className="text-xs text-zinc-500">{item.completedTasks}/{item.totalTasks} tasks</span>
              {item.urgentTasks > 0 && <Badge variant="warning">{item.urgentTasks} urgent</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CircularProgress value={item.progress} size={32} />
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-400">{Math.round(item.progress)}%</div>
              <div className="text-[10px] text-zinc-600">Complete</div>
            </div>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-zinc-800 mb-3">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all" style={{ width: `${item.progress}%` }} />
        </div>
        <div className="flex gap-2">
          <PillButton size="sm" className="flex-1" icon={<FileText className="w-4 h-4" />}>Generate Docs</PillButton>
          <PillButton size="sm" variant="secondary" icon={<Target className="w-4 h-4" />}>Assess</PillButton>
        </div>
      </Card>
    </motion.div>
  );
}

function UrgentTaskCard({ task, index }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card padding="md" className={task.daysRemaining < 0 ? 'border-red-500/30' : ''}>
        {task.daysRemaining < 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r from-red-500/60 to-red-400/60" />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {task.daysRemaining < 0 ? (
                <Badge variant="error">{Math.abs(task.daysRemaining)} DAYS OVERDUE</Badge>
              ) : (
                <Badge variant="warning">{task.daysRemaining} days left</Badge>
              )}
            </div>
            <h4 className="font-semibold text-lg mb-1 text-white">{task.obligation.obligation_title}</h4>
            <p className="text-xs text-zinc-500">{task.system.name}</p>
          </div>
          <PillButton size="sm" icon={<PlayCircle className="w-4 h-4" />}>Start</PillButton>
        </div>
      </Card>
    </motion.div>
  );
}

export function DemoSentinelRoadmap({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [view, setView] = useState('roadmap');

  const totalTasks = 28;
  const completedCount = 15;
  const overdueCount = 1;
  const urgentCount = MOCK_URGENT_TASKS.length;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  const tabs = [
    { id: 'roadmap', label: 'Timeline', icon: Calendar },
    { id: 'systems', label: `By System (${MOCK_SYSTEM_PROGRESS.length})`, icon: Target },
    { id: 'urgent', label: `Urgent (${urgentCount})`, icon: Zap, dot: urgentCount > 0 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] flex items-center justify-center bg-emerald-400/10">
              <Map className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Compliance Roadmap</h1>
              <p className="text-xs text-zinc-500">{totalTasks} tasks &middot; {progressPercent}% complete</p>
            </div>
          </div>
          <PillButton icon={<Sparkles className="w-4 h-4" />}>AI Action Plan</PillButton>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={FileText} label="Total Tasks" value={totalTasks} delay={0} accentColor="emerald" />
          <StatCard icon={AlertTriangle} label="Overdue" value={overdueCount} delay={0.05} accentColor="red" />
          <StatCard icon={Zap} label="Urgent (90d)" value={urgentCount} delay={0.1} accentColor="yellow" />
          <StatCard icon={CheckCircle} label="Completed" value={completedCount} delay={0.15} accentColor="green" />
          <StatCard icon={TrendingUp} label="Progress" value={`${progressPercent}%`} delay={0.2} accentColor="emerald" />
        </div>

        {/* Tabs */}
        <div className="p-1 rounded-xl border bg-zinc-900/60 border-zinc-800/60 inline-flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-default ${
                  active ? 'bg-emerald-400/20 text-emerald-400' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.dot && <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {view === 'roadmap' && (
          <div className="space-y-3 mt-4">
            {ENFORCEMENT_MILESTONES.map((milestone, idx) => (
              <MilestoneCard key={milestone.date} milestone={milestone} index={idx} isLast={idx === ENFORCEMENT_MILESTONES.length - 1} />
            ))}
          </div>
        )}

        {view === 'systems' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
            {MOCK_SYSTEM_PROGRESS.map((item, i) => (
              <SystemProgressCard key={item.system.id} item={item} index={i} />
            ))}
          </div>
        )}

        {view === 'urgent' && (
          <div className="space-y-3 mt-4">
            {MOCK_URGENT_TASKS.map((task, i) => (
              <UrgentTaskCard key={task.id} task={task} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  3. DemoSentinelDocuments — replica of DocumentGenerator.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DOC_TYPES = [
  {
    id: 'technical',
    title: 'Technical Documentation',
    subtitle: 'Annex IV',
    icon: FileText,
    description: 'Comprehensive technical documentation covering system design, development process, risk management, and monitoring.',
    features: ['System architecture', 'Training data', 'Risk assessment', 'Human oversight'],
    aiPowered: true,
  },
  {
    id: 'declaration',
    title: 'EU Declaration of Conformity',
    subtitle: 'Article 47',
    icon: File,
    description: 'Formal declaration that the AI system meets EU AI Act requirements and has undergone conformity assessment.',
    features: ['Legal compliance', 'CE marking ready', 'Market access', 'Official format'],
    aiPowered: false,
  },
];

const MOCK_HIGH_RISK_SYSTEMS = [
  { id: 'hr1', name: 'Resume Screener', purpose: 'Automated CV screening and candidate ranking for HR department', risk_classification: 'high-risk' },
  { id: 'hr2', name: 'Fraud Detection Engine', purpose: 'Transaction anomaly detection for financial operations', risk_classification: 'high-risk' },
  { id: 'hr3', name: 'Employee Wellbeing Monitor', purpose: 'Workplace wellbeing scoring from survey and activity data', risk_classification: 'high-risk' },
];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {[1, 2, 3].map(s => (
        <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
      ))}
      <span className="text-xs ml-2 text-zinc-400">Step {step} of 3</span>
    </div>
  );
}

function SystemSelectionCard({ system, isSelected, onClick, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="cursor-default"
    >
      <Card
        interactive
        padding="sm"
        className={isSelected ? 'border-emerald-500/30 bg-emerald-500/5 border-l-[3px] border-l-emerald-400' : ''}
      >
        {isSelected && <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px] bg-gradient-to-r from-emerald-500 to-emerald-400" />}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Radio indicator */}
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'}`}>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="highRisk">HIGH-RISK</Badge>
                {isSelected && <Badge variant="success">Selected</Badge>}
              </div>
              <h3 className="text-base font-semibold mb-1 text-white">{system.name}</h3>
              <p className="text-xs line-clamp-2 text-zinc-400">{system.purpose}</p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ml-4 ${isSelected ? 'bg-emerald-400/20' : 'bg-zinc-800'}`}>
            <Cpu className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function DocTypeCard({ docType, onClick, index }) {
  const Icon = docType.icon;
  const isTechnical = docType.id === 'technical';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      onClick={onClick}
      className="cursor-default group"
    >
      <Card interactive padding="md" className={`relative overflow-hidden ${isTechnical ? 'shadow-lg shadow-emerald-500/5' : ''}`}>
        {/* Gradient top bar for Technical Documentation */}
        {isTechnical && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-400/15">
            <Icon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold mb-1 transition-colors text-white group-hover:text-emerald-400">
              {docType.title}
            </h3>
            <Badge variant="neutral">{docType.subtitle}</Badge>
          </div>
        </div>
        <p className="text-xs mb-3 text-zinc-500">{docType.description}</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {docType.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-600">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {feature}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-3">
            {docType.aiPowered ? (
              <motion.span
                className="flex items-center gap-1.5 text-xs text-emerald-400"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-3 h-3" /> AI-powered draft
              </motion.span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <FileText className="w-3 h-3" /> Template-based
              </span>
            )}
            <span className="text-[10px] text-zinc-600">~2 min</span>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
        </div>
      </Card>
    </motion.div>
  );
}

export function DemoSentinelDocuments({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [docType, setDocType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = MOCK_HIGH_RISK_SYSTEMS.filter(s =>
    !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const step = docType && selectedSystem ? 3 : selectedSystem ? 2 : 1;

  const goBack = () => {
    if (docType) { setDocType(null); }
    else { setSelectedSystem(null); }
  };

  // Step 3: Document generation view (simplified preview)
  if (docType && selectedSystem) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black">
        <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
          <StepIndicator step={3} />
          <PillButton variant="secondary" onClick={goBack} icon={<ArrowLeft className="w-4 h-4" />}>Back</PillButton>

          <Card padding="md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-400/20">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">
                  {docType === 'technical' ? 'Technical Documentation' : 'EU Declaration of Conformity'}
                </h3>
                <p className="text-xs text-zinc-500">{selectedSystem.name}</p>
              </div>
              <Badge variant="highRisk">HIGH-RISK</Badge>
            </div>

            {/* Simulated document sections */}
            <div className="space-y-4 mt-6">
              {docType === 'technical' ? (
                <>
                  {['1. System Overview', '2. Intended Purpose', '3. Development Methodology', '4. Data Governance', '5. Risk Management', '6. Human Oversight', '7. Accuracy & Robustness', '8. Monitoring Plan'].map((section, i) => (
                    <motion.div
                      key={section}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border border-zinc-800/60 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">{section}</h4>
                        <div className="flex items-center gap-2">
                          {i < 4 ? (
                            <Badge variant="success">Generated</Badge>
                          ) : i < 6 ? (
                            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                              <Badge variant="primary">Generating...</Badge>
                            </motion.div>
                          ) : (
                            <Badge variant="neutral">Pending</Badge>
                          )}
                        </div>
                      </div>
                      {i < 4 && (
                        <div className="mt-2 space-y-1">
                          <div className="h-2.5 bg-zinc-800/60 rounded-full w-full" />
                          <div className="h-2.5 bg-zinc-800/60 rounded-full w-4/5" />
                          <div className="h-2.5 bg-zinc-800/60 rounded-full w-3/5" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </>
              ) : (
                <>
                  {['Provider Information', 'AI System Identification', 'Conformity Assessment', 'Standards Applied', 'Authorized Representative', 'Declaration Statement'].map((section, i) => (
                    <motion.div
                      key={section}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border border-zinc-800/60 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">{section}</h4>
                        <Badge variant={i < 3 ? 'success' : 'neutral'}>{i < 3 ? 'Complete' : 'Pending'}</Badge>
                      </div>
                      {i < 3 && (
                        <div className="mt-2 space-y-1">
                          <div className="h-2.5 bg-zinc-800/60 rounded-full w-full" />
                          <div className="h-2.5 bg-zinc-800/60 rounded-full w-3/4" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800/50">
              <div className="text-xs text-zinc-500">
                {docType === 'technical' ? '4 of 8 sections generated' : '3 of 6 sections complete'}
              </div>
              <div className="flex gap-2">
                <PillButton size="sm" variant="secondary" icon={<Eye className="w-4 h-4" />}>Preview</PillButton>
                <PillButton size="sm" icon={<Download className="w-4 h-4" />}>Download PDF</PillButton>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Step 2: Document type selection
  if (selectedSystem) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black">
        <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-4 space-y-4">
          <StepIndicator step={2} />

          <PillButton variant="secondary" onClick={goBack} icon={<ArrowLeft className="w-4 h-4" />}>Change System</PillButton>

          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-400/20">
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">{selectedSystem.name}</h3>
                <p className="text-xs text-zinc-500">{selectedSystem.purpose}</p>
              </div>
              <Badge variant="highRisk">HIGH-RISK</Badge>
            </div>
          </Card>

          <div>
            <h2 className="text-lg font-semibold mb-3 text-white">Select Document Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOC_TYPES.map((dt, i) => (
                <DocTypeCard key={dt.id} docType={dt} onClick={() => setDocType(dt.id)} index={i} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Step 1: System selection
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        <StepIndicator step={1} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[20px] flex items-center justify-center bg-emerald-400/10">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Document Generator</h1>
              <p className="text-xs text-zinc-500">{MOCK_HIGH_RISK_SYSTEMS.length} high-risk systems ready for documentation</p>
            </div>
          </div>
          <PillButton variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>Dashboard</PillButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Cpu} label="High-Risk Systems" value={MOCK_HIGH_RISK_SYSTEMS.length} delay={0} accentColor="orange" />
          <StatCard icon={FileText} label="Docs Required" value={MOCK_HIGH_RISK_SYSTEMS.length * 2} delay={0.05} accentColor="emerald" />
          <StatCard icon={Sparkles} label="AI-Powered" value="Yes" delay={0.1} accentColor="purple" />
          <StatCard icon={Shield} label="Compliance" value="Annex IV" delay={0.15} accentColor="blue" />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            placeholder="Search systems..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400/40"
          />
        </div>

        {/* System selection grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-white">Select AI System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((system, i) => (
              <SystemSelectionCard
                key={system.id}
                system={system}
                isSelected={selectedSystem?.id === system.id}
                onClick={() => setSelectedSystem(system)}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
