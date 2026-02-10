import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Filter, Sparkles, CheckCircle2, Clock, ChevronRight,
  Download, Plus, Send, Mail, MessageSquare, Smartphone, Eye,
  MoreHorizontal, Briefcase, Building2, MapPin, Target, FolderKanban,
  UserPlus, ShoppingCart, Star, Zap, TrendingUp, ArrowUpRight,
  Handshake, Calendar, FileText, Phone, Ban, Euro, Edit, Trash2,
  Upload, Grid3X3, List, RefreshCw, Play, Pause, Copy, Archive,
  ArrowRight, Megaphone, Package, ShoppingBag, ChevronDown, X,
  MessageCircle, CheckCircle, XCircle, Globe, AlertTriangle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const StatusBadge = ({ status, styles }) => {
  const defaultStyles = {
    active: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Active' },
    open: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Open' },
    filled: { bg: 'bg-red-600/20', text: 'text-red-400', label: 'Filled' },
    on_hold: { bg: 'bg-red-800/30', text: 'text-red-300', label: 'On Hold' },
    cancelled: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', label: 'Cancelled' },
    draft: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', label: 'Draft' },
    paused: { bg: 'bg-red-800/30', text: 'text-red-300', label: 'Paused' },
    completed: { bg: 'bg-red-600/20', text: 'text-red-400', label: 'Completed' },
    Inactive: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', label: 'Inactive' },
  };
  const s = (styles || defaultStyles)[status] || defaultStyles[status] || defaultStyles.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label || status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const styles = {
    urgent: { bg: 'bg-red-500/20', text: 'text-red-400' },
    high: { bg: 'bg-red-500/20', text: 'text-red-400' },
    medium: { bg: 'bg-red-400/20', text: 'text-red-300' },
    low: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  };
  const s = styles[priority] || styles.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  );
};

const ProgressRing = ({ filled, total, size = 40, strokeWidth = 3, showPercent = false }) => {
  const progress = total > 0 ? Math.round((filled / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ef4444"
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-medium text-white">
        {showPercent ? `${progress}%` : `${filled}/${total}`}
      </span>
    </div>
  );
};

const IntelligenceGauge = ({ score, size = 'sm' }) => {
  const dim = size === 'xs' ? 24 : size === 'sm' ? 32 : 40;
  const sw = size === 'xs' ? 2 : 3;
  const r = (dim - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const color = score >= 80 ? '#f87171' : score >= 60 ? '#fbbf24' : '#71717a';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="rgba(63,63,70,0.5)" strokeWidth={sw} />
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span className={`absolute font-bold text-white ${size === 'xs' ? 'text-[8px]' : 'text-[10px]'}`}>{score}</span>
    </div>
  );
};

const IntelLevelBadge = ({ level }) => {
  const s = {
    Critical: 'bg-red-500/15 text-red-400',
    High: 'bg-red-500/15 text-red-400',
    Medium: 'bg-amber-500/15 text-amber-400',
    Low: 'bg-zinc-700/50 text-zinc-400',
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${s[level] || s.Low}`}>{level}</span>;
};

const ApproachBadge = ({ approach }) => {
  const s = {
    aggressive: 'bg-red-500/15 text-red-400',
    nurture: 'bg-red-400/15 text-red-300',
    network: 'bg-zinc-700/50 text-zinc-400',
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${s[approach] || s.nurture}`}>{approach}</span>;
};

const CandidateAvatar = ({ name, size = 'md' }) => {
  const sizes = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const initials = name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center font-medium text-white ring-2 ring-white/10`}>
      {initials}
    </div>
  );
};


/* ================================================================== */
/*  1. DemoTalentCandidates                                            */
/* ================================================================== */

const CANDIDATES = [
  { id: 1, first_name: 'Elena', last_name: 'Rodriguez', job_title: 'VP of Engineering', company_name: 'Stripe', person_home_location: 'San Francisco, CA', intelligence_score: 95, intelligence_level: 'Critical', recommended_approach: 'aggressive', last_intelligence_update: '2026-01-15T10:00:00Z' },
  { id: 2, first_name: 'David', last_name: 'Kim', job_title: 'Head of Product', company_name: 'Booking.com', person_home_location: 'Amsterdam, NL', intelligence_score: 88, intelligence_level: 'High', recommended_approach: 'aggressive', last_intelligence_update: '2026-01-14T10:00:00Z' },
  { id: 3, first_name: 'Sophia', last_name: 'Nguyen', job_title: 'Senior Data Scientist', company_name: 'Meta', person_home_location: 'London, UK', intelligence_score: 82, intelligence_level: 'High', recommended_approach: 'nurture', last_intelligence_update: '2026-01-13T10:00:00Z' },
  { id: 4, first_name: 'Marcus', last_name: 'Johnson', job_title: 'Director of Sales', company_name: 'HubSpot', person_home_location: 'Boston, MA', intelligence_score: 76, intelligence_level: 'Medium', recommended_approach: 'aggressive', last_intelligence_update: null },
  { id: 5, first_name: 'Aisha', last_name: 'Patel', job_title: 'Staff Engineer', company_name: 'Google', person_home_location: 'Austin, TX', intelligence_score: 71, intelligence_level: 'Medium', recommended_approach: 'nurture', last_intelligence_update: '2026-01-10T10:00:00Z' },
  { id: 6, first_name: 'Tom', last_name: 'van der Berg', job_title: 'CTO', company_name: 'DataBridge', person_home_location: 'Amsterdam, NL', intelligence_score: 65, intelligence_level: 'Medium', recommended_approach: 'network', last_intelligence_update: '2026-01-09T10:00:00Z' },
  { id: 7, first_name: 'Laura', last_name: 'Chen', job_title: 'Product Manager', company_name: 'Shopify', person_home_location: 'Toronto, CA', intelligence_score: 53, intelligence_level: 'Low', recommended_approach: 'nurture', last_intelligence_update: null },
  { id: 8, first_name: 'James', last_name: 'Park', job_title: 'Engineering Manager', company_name: 'Netflix', person_home_location: 'Los Angeles, CA', intelligence_score: 45, intelligence_level: 'Low', recommended_approach: 'network', last_intelligence_update: '2026-01-05T10:00:00Z' },
];

export function DemoTalentCandidates({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [viewMode, setViewMode] = useState('table');
  const candidates = CANDIDATES;
  const readyCandidates = candidates.filter(c => c.last_intelligence_update && c.intelligence_score != null);

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* PageHeader */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20">
              <Users className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Candidates</h1>
              <p className="text-zinc-400 text-sm">{candidates.length} candidates in your talent pool</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-sm cursor-default">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm cursor-default">
              <Plus className="w-4 h-4" /> Add Candidate
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <div className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40 text-sm">
                Search by name, title, company, skills...
              </div>
            </div>
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 cursor-default">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results summary and view controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-400">Showing {candidates.length} of {candidates.length} candidates</p>
            <button className="text-zinc-400 hover:text-white text-sm cursor-default">Select Page</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors cursor-default ${viewMode === 'grid' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-colors cursor-default ${viewMode === 'table' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="p-2 rounded-lg text-zinc-400 cursor-default">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Candidates Display */}
        {viewMode === 'grid' ? (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {candidates.map(c => (
              <motion.div key={c.id} variants={itemVariants}>
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:border-red-500/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <CandidateAvatar name={`${c.first_name} ${c.last_name}`} size="lg" />
                      <div>
                        <h3 className="font-semibold text-white">{c.first_name} {c.last_name}</h3>
                        <p className="text-sm text-white/60">{c.job_title}</p>
                      </div>
                    </div>
                    <IntelligenceGauge score={c.intelligence_score} size="sm" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{c.company_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{c.person_home_location}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <IntelLevelBadge level={c.intelligence_level} />
                      <ApproachBadge approach={c.recommended_approach} />
                    </div>
                    <button className="p-1.5 rounded-lg text-white/40 cursor-default">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider w-8">
                      <div className="w-3.5 h-3.5 rounded border border-zinc-600" />
                    </th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">Candidate</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">Position</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">Score</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">Approach</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">Intel</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider">Location</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-white/40 uppercase tracking-wider w-12"></th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {candidates.map(c => (
                    <motion.tr key={c.id} variants={itemVariants} className="border-b border-white/5 last:border-0 h-9">
                      <td className="py-1 px-2">
                        <div className="w-3.5 h-3.5 rounded border border-zinc-600" />
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1.5">
                          <CandidateAvatar name={`${c.first_name} ${c.last_name}`} size="xs" />
                          <span className="font-medium text-white text-xs truncate max-w-[140px]">{c.first_name} {c.last_name}</span>
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <p className="text-white/70 text-xs truncate max-w-[200px]">{c.job_title}</p>
                        <p className="text-[10px] text-white/40 truncate max-w-[200px]">{c.company_name}</p>
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1.5">
                          <IntelligenceGauge score={c.intelligence_score} size="xs" />
                          <IntelLevelBadge level={c.intelligence_level} />
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <ApproachBadge approach={c.recommended_approach} />
                      </td>
                      <td className="py-1 px-2">
                        {c.last_intelligence_update ? (
                          <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Fresh</span>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Stale</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-white/50 text-[11px] truncate max-w-[150px]">{c.person_home_location}</td>
                      <td className="py-1 px-2">
                        <div className="flex items-center">
                          <button className="p-0.5 rounded text-white/40 cursor-default"><Eye className="w-3 h-3" /></button>
                          <button className="p-0.5 rounded text-white/40 cursor-default"><Edit className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flow Continuity CTA */}
        {readyCandidates.length >= 3 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Zap className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{readyCandidates.length} candidates with Intel Ready</p>
                  <p className="text-zinc-400 text-sm">Launch a campaign to match these candidates to your open roles</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm cursor-default">
                <Megaphone className="w-4 h-4" /> Create Campaign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ================================================================== */
/*  2. DemoTalentProjects                                              */
/* ================================================================== */

const PROJECTS = [
  { id: 'p1', title: 'Q1 Engineering Hiring', description: 'Hire 3 senior engineers for the platform team', status: 'active', priority: 'high', client_name: 'Internal', deadline: '2026-03-15', roles: [
    { id: 'r1', title: 'Senior Backend Engineer', status: 'open', location: 'Amsterdam', salary_range: '90k-120k', candidates_matched: 12 },
    { id: 'r2', title: 'Staff Frontend Engineer', status: 'open', location: 'Remote', salary_range: '100k-130k', candidates_matched: 8 },
    { id: 'r3', title: 'DevOps Lead', status: 'filled', location: 'Amsterdam', salary_range: '95k-125k', candidates_matched: 15 },
  ]},
  { id: 'p2', title: 'Product Team Expansion', description: 'Growing the product team with senior PMs', status: 'active', priority: 'medium', client_name: 'TechVentures', deadline: '2026-04-01', roles: [
    { id: 'r4', title: 'Senior Product Manager', status: 'open', location: 'London', salary_range: '85k-110k', candidates_matched: 6 },
    { id: 'r5', title: 'Product Designer', status: 'open', location: 'Remote', salary_range: '75k-95k', candidates_matched: 10 },
  ]},
  { id: 'p3', title: 'Data Science Initiative', description: 'Building a data science team from scratch', status: 'on_hold', priority: 'low', client_name: 'Summit Analytics', deadline: '2026-06-01', roles: [
    { id: 'r6', title: 'Lead Data Scientist', status: 'on_hold', location: 'Berlin', salary_range: '100k-140k', candidates_matched: 4 },
  ]},
  { id: 'p4', title: 'Sales Leadership', description: 'Hiring VP Sales for EMEA expansion', status: 'active', priority: 'urgent', client_name: 'Meridian Health', deadline: '2026-02-28', roles: [
    { id: 'r7', title: 'VP Sales EMEA', status: 'open', location: 'London', salary_range: '130k-180k', candidates_matched: 3 },
    { id: 'r8', title: 'Enterprise AE', status: 'filled', location: 'Amsterdam', salary_range: '80k-100k', candidates_matched: 9 },
  ]},
];

const PROJECT_STATS = [
  { title: 'Active Projects', value: 3, icon: Briefcase },
  { title: 'Total Roles', value: 8, icon: Target },
  { title: 'Active Roles', value: 5, icon: Users },
  { title: 'Filled Roles', value: 2, icon: CheckCircle2 },
];

export function DemoTalentProjects({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* PageHeader */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20">
              <Briefcase className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Recruitment Projects</h1>
              <p className="text-zinc-400 text-sm">Manage hiring projects and open roles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm cursor-default">
              <Zap className="w-4 h-4" /> Quick Add Role
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-white text-sm cursor-default">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>

        {/* Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {PROJECT_STATS.map(s => (
            <motion.div key={s.title} variants={itemVariants}>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <s.icon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <div className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white/40 text-sm">
                  Search projects, clients, roles...
                </div>
              </div>
              <div className="px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white/70 text-sm cursor-default">
                All Status
              </div>
              <button className="p-2 text-white/60 cursor-default"><RefreshCw className="w-4 h-4" /></button>
            </div>

            {/* Projects Grid */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROJECTS.map(project => {
                const filledRoles = project.roles.filter(r => r.status === 'filled').length;
                return (
                  <motion.div key={project.id} variants={itemVariants}>
                    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:border-red-500/30 transition-all duration-300">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={project.status} />
                            <PriorityBadge priority={project.priority} />
                          </div>
                          <h3 className="text-base font-semibold text-white">{project.title}</h3>
                          <p className="text-xs text-white/60 line-clamp-2 mt-0.5">{project.description}</p>
                        </div>
                        <button className="p-1 rounded-lg text-white/60 cursor-default">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Client & Timeline */}
                      <div className="flex items-center gap-3 text-xs text-white/50 mb-3">
                        <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{project.client_name}</span>
                        {project.deadline && (
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(project.deadline).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg mb-3">
                        <div className="flex items-center gap-2">
                          <ProgressRing filled={filledRoles} total={project.roles.length} />
                          <div>
                            <p className="text-xs font-medium text-white">Roles Progress</p>
                            <p className="text-[10px] text-white/50">{filledRoles} of {project.roles.length} filled</p>
                          </div>
                        </div>
                        <button className="text-red-400 text-xs flex items-center gap-1 cursor-default">
                          View Roles <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Roles Preview */}
                      <div className="space-y-1">
                        {project.roles.slice(0, 3).map(role => (
                          <div key={role.id} className="flex items-center justify-between p-1.5 bg-zinc-800/30 rounded text-xs">
                            <span className="text-white/80">{role.title}</span>
                            <StatusBadge status={role.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Right Column - Widgets */}
          <div className="lg:w-80 flex-shrink-0 space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Ready for Outreach</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-zinc-800/30 rounded-lg">
                  <span className="text-xs text-white/70">6 candidates with Intel</span>
                  <button className="text-xs text-red-400 cursor-default">Launch</button>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
              <div className="space-y-2 text-xs text-zinc-400">
                <p>Elena Rodriguez matched to Senior Backend role</p>
                <p>DevOps Lead role filled by Tom van der Berg</p>
                <p>New project "Sales Leadership" created</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ================================================================== */
/*  3. DemoTalentCampaigns                                             */
/* ================================================================== */

const CAMPAIGNS = [
  { id: 'c1', name: 'Senior Engineers Q1', description: 'Outreach to senior backend engineers across EU', status: 'active', campaign_type: 'recruitment', created_date: '2026-01-10', matched_candidates: [
    { status: 'sent' }, { status: 'sent' }, { status: 'replied' }, { status: 'pending' }, { status: 'sent' }, { status: 'pending' }, { status: 'replied' }, { status: 'pending' },
  ]},
  { id: 'c2', name: 'Product Leadership Outreach', description: 'Targeting VP/Director-level product leaders', status: 'active', campaign_type: 'recruitment', created_date: '2026-01-15', matched_candidates: [
    { status: 'sent' }, { status: 'replied' }, { status: 'pending' }, { status: 'sent' }, { status: 'pending' },
  ]},
  { id: 'c3', name: 'Data Science Expansion', description: 'Building pipeline for data science team', status: 'paused', campaign_type: 'recruitment', created_date: '2026-01-08', matched_candidates: [
    { status: 'sent' }, { status: 'sent' }, { status: 'sent' }, { status: 'pending' },
  ]},
  { id: 'c4', name: 'DevOps Talent Sourcing', description: 'Finding DevOps/SRE talent for infrastructure team', status: 'draft', campaign_type: 'growth', created_date: '2026-01-20', matched_candidates: []},
  { id: 'c5', name: 'Design Outreach Wave 2', description: 'Second wave of outreach to UX/UI designers', status: 'completed', campaign_type: 'recruitment', created_date: '2025-12-15', matched_candidates: [
    { status: 'sent' }, { status: 'replied' }, { status: 'replied' }, { status: 'sent' }, { status: 'replied' }, { status: 'sent' },
  ]},
];

const CAMPAIGN_STATS = [
  { label: 'Total Campaigns', value: 5, icon: Megaphone },
  { label: 'Total Candidates', value: 23, icon: Users },
  { label: 'Messages Sent', value: 14, icon: Send },
  { label: 'Replies Received', value: 5, icon: MessageSquare },
];

export function DemoTalentCampaigns({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* PageHeader */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20">
              <Megaphone className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Campaigns</h1>
              <p className="text-zinc-400 text-sm">Manage your outreach campaigns</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm cursor-default">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMPAIGN_STATS.map(s => (
            <div key={s.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <s.icon className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <div className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40 text-sm">
                  Search campaigns...
                </div>
              </div>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm cursor-default">All Statuses</div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm cursor-default">All Types</div>
            <button className="p-2 rounded-lg bg-white/5 text-white/60 cursor-default"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Campaign Cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAMPAIGNS.map(campaign => {
            const sentCount = campaign.matched_candidates.filter(c => c.status === 'sent').length;
            const repliedCount = campaign.matched_candidates.filter(c => c.status === 'replied').length;
            const progress = campaign.matched_candidates.length > 0 ? Math.round((sentCount / campaign.matched_candidates.length) * 100) : 0;

            return (
              <motion.div key={campaign.id} variants={itemVariants}>
                <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:border-red-500/30 transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <StatusBadge status={campaign.status} />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${campaign.campaign_type === 'recruitment' ? 'bg-red-500/20 text-red-400' : 'bg-red-400/20 text-red-300'}`}>
                          {campaign.campaign_type === 'recruitment' ? 'Recruitment' : 'Growth'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{campaign.name}</h3>
                      <p className="text-xs text-white/60 line-clamp-2 mt-0.5">{campaign.description}</p>
                    </div>
                    <button className="p-2 rounded-lg text-white/60 cursor-default"><MoreHorizontal className="w-5 h-5" /></button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{campaign.matched_candidates.length}</p>
                      <p className="text-[10px] text-white/60">Candidates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-400">{sentCount}</p>
                      <p className="text-[10px] text-white/60">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-400">{repliedCount}</p>
                      <p className="text-[10px] text-white/60">Replied</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ProgressRing filled={progress} total={100} size={32} strokeWidth={2} showPercent />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-red-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(campaign.created_date).toLocaleDateString()}</span>
                    </div>
                    <button className="flex items-center gap-1 text-xs text-red-400 cursor-default">
                      View Details <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}


/* ================================================================== */
/*  4. DemoTalentClients                                               */
/* ================================================================== */

const CLIENT_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-zinc-500', textColor: 'text-zinc-400' },
  { id: 'prospect', label: 'Prospect', color: 'bg-red-400', textColor: 'text-red-300' },
  { id: 'active', label: 'Active', color: 'bg-red-500', textColor: 'text-red-400' },
  { id: 'retained', label: 'Retained', color: 'bg-red-600', textColor: 'text-red-400' },
  { id: 'dormant', label: 'Dormant', color: 'bg-red-800', textColor: 'text-red-500' },
];

const CLIENTS = [
  { id: 'cl1', company: 'TechVentures', first_name: 'Sarah', last_name: 'Mitchell', job_title: 'HR Director', email: 'sarah@techventures.com', phone: '+31 6 12345678', location: 'Amsterdam, NL', stage: 'active', recruitment_fee_percentage: 20, exclude_candidates: true, industry: 'Technology' },
  { id: 'cl2', company: 'Summit Analytics', first_name: 'Priya', last_name: 'Shah', job_title: 'Head of People', email: 'priya@summit.io', phone: '+44 7700 900123', location: 'London, UK', stage: 'active', recruitment_fee_percentage: 22, exclude_candidates: true, industry: 'Analytics' },
  { id: 'cl3', company: 'Meridian Health', first_name: 'Lisa', last_name: 'Tran', job_title: 'VP Talent', email: 'lisa@meridian.com', phone: '+1 555 234 5678', location: 'Boston, MA', stage: 'retained', recruitment_fee_percentage: 18, exclude_candidates: false, industry: 'Healthcare' },
  { id: 'cl4', company: 'Catalyst Labs', first_name: 'David', last_name: 'Nguyen', job_title: 'CEO', email: 'david@catalystlabs.io', phone: '+31 6 98765432', location: 'Amsterdam, NL', stage: 'prospect', recruitment_fee_percentage: 20, exclude_candidates: true, industry: 'SaaS' },
  { id: 'cl5', company: 'DataBridge Corp', first_name: 'Michael', last_name: 'Chen', job_title: 'CTO', email: 'michael@databridge.com', phone: '+49 171 1234567', location: 'Berlin, DE', stage: 'lead', recruitment_fee_percentage: 25, exclude_candidates: false, industry: 'Data' },
  { id: 'cl6', company: 'Orion Systems', first_name: 'Emma', last_name: 'Wilson', job_title: 'Recruiting Manager', email: 'emma@orion.io', phone: '+1 555 876 5432', location: 'New York, NY', stage: 'active', recruitment_fee_percentage: 20, exclude_candidates: true, industry: 'Software' },
];

export function DemoTalentClients({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [viewMode, setViewMode] = useState('table');
  const activeClients = CLIENTS.filter(c => c.stage === 'active' || c.stage === 'retained').length;

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* PageHeader */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20">
              <Building2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Recruitment Clients</h1>
              <p className="text-zinc-400 text-sm">{CLIENTS.length} clients -- {activeClients} active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-sm cursor-default">
              <Sparkles className="w-4 h-4" /> Quick Add
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm cursor-default">
              <Plus className="w-4 h-4" /> Add Client
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <motion.div variants={itemVariants} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-[10px]">Total Clients</p>
                <p className="text-lg font-bold text-white">{CLIENTS.length}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-red-400/70" />
              </div>
            </div>
          </motion.div>
          {CLIENT_STAGES.slice(0, 4).map(stage => (
            <motion.div key={stage.id} variants={itemVariants} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-[10px]">{stage.label}</p>
                  <p className="text-lg font-bold text-white">{CLIENTS.filter(c => c.stage === stage.id).length}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${stage.color}/20 flex items-center justify-center`}>
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters and View Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <div className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white/40 text-sm">
                Search clients...
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white/70 text-sm cursor-default">
              <Filter className="w-4 h-4 text-zinc-500" /> All Stages
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg cursor-default ${viewMode === 'table' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg cursor-default ${viewMode === 'grid' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400'}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'table' ? (
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Company</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Contact</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Stage</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Fee</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {CLIENTS.map(client => {
                  const stage = CLIENT_STAGES.find(s => s.id === client.stage) || CLIENT_STAGES[0];
                  return (
                    <tr key={client.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                          <div>
                            <span className="text-sm font-medium text-white">{client.company}</span>
                            {client.industry && <p className="text-xs text-zinc-500 mt-0.5">{client.industry}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">
                        <div>
                          <span>{client.first_name} {client.last_name}</span>
                          {client.job_title && <p className="text-xs text-zinc-500 mt-0.5">{client.job_title}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">{client.email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 h-5 rounded ${stage.color}/20 ${stage.textColor}`}>{stage.label}</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-sm">{client.recruitment_fee_percentage}%</td>
                      <td className="py-3 px-4 text-right">
                        <button className="p-1 text-zinc-400 cursor-default"><MoreHorizontal className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {CLIENTS.map(client => {
              const stage = CLIENT_STAGES.find(s => s.id === client.stage) || CLIENT_STAGES[0];
              return (
                <motion.div key={client.id} variants={itemVariants}>
                  <div className="group relative bg-zinc-900/60 rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200 overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${stage.color} opacity-60`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{client.company}</h4>
                          <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-1">
                            <span className="truncate">{client.first_name} {client.last_name}</span>
                          </p>
                        </div>
                        <button className="p-1 text-zinc-400 cursor-default"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-400"><Mail className="w-3 h-3" /><span className="truncate">{client.email}</span></div>
                        {client.location && <div className="flex items-center gap-2 text-xs text-zinc-500"><MapPin className="w-3 h-3" /><span>{client.location}</span></div>}
                      </div>
                      <div className="mt-3 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${stage.color}/20 ${stage.textColor}`}>{stage.label}</span>
                        <span className="text-xs text-zinc-500">Fee: {client.recruitment_fee_percentage}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}


/* ================================================================== */
/*  5. DemoTalentDeals                                                 */
/* ================================================================== */

const DEAL_STAGES = [
  { id: 'lead', label: 'Lead', color: 'from-zinc-500 to-zinc-600', bgAccent: 'bg-zinc-500', probability: 5 },
  { id: 'briefing', label: 'Briefing', color: 'from-red-600 to-red-700', bgAccent: 'bg-red-500', probability: 15 },
  { id: 'agreement', label: 'Agreement', color: 'from-red-500 to-red-600', bgAccent: 'bg-red-500', probability: 25 },
  { id: 'search', label: 'Search', color: 'from-red-400 to-red-500', bgAccent: 'bg-red-500', probability: 35 },
  { id: 'presented', label: 'Presented', color: 'from-red-300 to-red-400', bgAccent: 'bg-red-400', probability: 50 },
  { id: 'interviews', label: 'Interviews', color: 'from-red-400 to-red-500', bgAccent: 'bg-red-500', probability: 65 },
  { id: 'offer', label: 'Offer', color: 'from-red-500 to-red-600', bgAccent: 'bg-red-500', probability: 80 },
  { id: 'confirmed', label: 'Confirmed', color: 'from-red-700 to-red-800', bgAccent: 'bg-red-700', probability: 100 },
];

const DEALS = [
  { id: 'd1', title: 'Senior BE - TechVentures', stage: 'interviews', deal_value: 18000, client: 'TechVentures', candidate: 'Elena Rodriguez', expected_start_date: '2026-03-01', fee_type: 'percentage', fee_percentage: 20 },
  { id: 'd2', title: 'VP Product - Summit', stage: 'offer', deal_value: 35000, client: 'Summit Analytics', candidate: 'David Kim', expected_start_date: '2026-02-15', fee_type: 'percentage', fee_percentage: 22 },
  { id: 'd3', title: 'Data Scientist - Meridian', stage: 'search', deal_value: 22000, client: 'Meridian Health', candidate: null, expected_start_date: '2026-04-01', fee_type: 'percentage', fee_percentage: 18 },
  { id: 'd4', title: 'DevOps Lead - Internal', stage: 'confirmed', deal_value: 24000, client: 'Internal', candidate: 'Tom van der Berg', expected_start_date: '2026-01-15', fee_type: 'flat', fee_percentage: null },
  { id: 'd5', title: 'Sales Director - Catalyst', stage: 'briefing', deal_value: 28000, client: 'Catalyst Labs', candidate: null, expected_start_date: '2026-05-01', fee_type: 'percentage', fee_percentage: 20 },
  { id: 'd6', title: 'Staff FE - Orion', stage: 'presented', deal_value: 20000, client: 'Orion Systems', candidate: 'Aisha Patel', expected_start_date: '2026-03-15', fee_type: 'percentage', fee_percentage: 20 },
  { id: 'd7', title: 'PM Lead - DataBridge', stage: 'lead', deal_value: 15000, client: 'DataBridge Corp', candidate: null, expected_start_date: null, fee_type: 'percentage', fee_percentage: 25 },
];

export function DemoTalentDeals({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const activeDeals = DEALS.filter(d => d.stage !== 'confirmed');
  const totalPipeline = activeDeals.reduce((sum, d) => sum + d.deal_value, 0);
  const weightedPipeline = activeDeals.reduce((sum, d) => {
    const stage = DEAL_STAGES.find(s => s.id === d.stage);
    return sum + (d.deal_value * (stage?.probability || 0) / 100);
  }, 0);
  const confirmedValue = DEALS.filter(d => d.stage === 'confirmed').reduce((sum, d) => sum + d.deal_value, 0);

  const dealStats = [
    { label: 'Pipeline Value', value: `EUR ${totalPipeline.toLocaleString()}`, icon: Euro },
    { label: 'Weighted Forecast', value: `EUR ${Math.round(weightedPipeline).toLocaleString()}`, icon: TrendingUp },
    { label: 'Confirmed Revenue', value: `EUR ${confirmedValue.toLocaleString()}`, icon: CheckCircle2 },
    { label: 'Avg Deal Size', value: `EUR ${Math.round(activeDeals.length > 0 ? totalPipeline / activeDeals.length : 0).toLocaleString()}`, icon: Target },
  ];

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* PageHeader */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20">
              <Handshake className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Recruitment Pipeline</h1>
              <p className="text-zinc-400 text-sm">{activeDeals.length} active deals -- EUR {totalPipeline.toLocaleString()} in pipeline</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm cursor-default">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>

        {/* Stats */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {dealStats.map(s => (
            <motion.div key={s.label} variants={itemVariants} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs">{s.label}</p>
                  <p className="text-lg font-bold text-white mt-0.5">{s.value}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-red-400/70" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Pipeline Board */}
        <div className="flex gap-4 overflow-x-auto pb-6">
          {DEAL_STAGES.map(stage => {
            const stageDeals = DEALS.filter(d => d.stage === stage.id);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.deal_value, 0);

            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
                {/* Column Header */}
                <div className="bg-zinc-900/70 rounded-xl border border-zinc-800/60 p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${stage.color}`} />
                      <h3 className="text-white font-semibold text-sm">{stage.label}</h3>
                      <span className="bg-zinc-800 text-zinc-300 text-xs px-1.5 py-0.5 rounded">{stageDeals.length}</span>
                    </div>
                    <button className="p-1 text-zinc-500 cursor-default"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-red-400/80">EUR {stageValue.toLocaleString()}</span>
                      <span className="text-xs text-zinc-600">total</span>
                    </div>
                  </div>
                </div>

                {/* Deal Cards */}
                <div className="space-y-3 min-h-[200px]">
                  {stageDeals.map(deal => (
                    <div key={deal.id} className="bg-zinc-900/60 rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 transition-all">
                      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${stage.color} opacity-60`} />
                      <div className="p-4">
                        <h4 className="font-semibold text-white text-sm truncate">{deal.title}</h4>
                        {deal.client && (
                          <p className="text-zinc-500 text-xs flex items-center gap-1.5 mt-1">
                            <Building2 className="w-3 h-3" />{deal.client}
                          </p>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-2xl font-bold text-white">EUR {deal.deal_value.toLocaleString()}</span>
                          <span className="text-zinc-600 text-sm">{stage.probability}%</span>
                        </div>
                        <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${stage.probability}%` }} />
                        </div>
                        <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-xs">
                          {deal.expected_start_date && (
                            <span className="flex items-center gap-1 text-zinc-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(deal.expected_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {deal.fee_type && (
                            <span className="text-[10px] px-1.5 py-0 border border-zinc-700 text-zinc-500 rounded">
                              {deal.fee_type === 'percentage' ? `${deal.fee_percentage}%` : 'Flat'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} opacity-20 flex items-center justify-center mb-3`}>
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-zinc-600 text-sm">Drop deal here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ================================================================== */
/*  6. DemoTalentOutreach                                              */
/* ================================================================== */

const SMS_STATUS_CONFIG = {
  queued: { label: 'Queued', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: Clock },
  sent: { label: 'Sent', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Send },
  delivered: { label: 'Delivered', color: 'bg-red-600/20 text-red-400 border-red-600/30', icon: CheckCircle },
  responded: { label: 'Responded', color: 'bg-red-400/20 text-red-300 border-red-400/30', icon: MessageCircle },
  interested: { label: 'Interested', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Sparkles },
  declined: { label: 'Declined', color: 'bg-red-800/20 text-red-500 border-red-800/30', icon: XCircle },
  scheduled: { label: 'Scheduled', color: 'bg-red-700/20 text-red-400 border-red-700/30', icon: Calendar },
  opted_out: { label: 'Opted Out', color: 'bg-zinc-600/20 text-zinc-500 border-zinc-600/30', icon: Ban },
};

const SMS_CONVERSATIONS = [
  { id: 's1', candidate: { first_name: 'Elena', last_name: 'Rodriguez', job_title: 'VP of Engineering', company_name: 'Stripe' }, status: 'responded', phone_number: '+1 555-0101', last_message_at: '2026-02-09T14:30:00Z', messages: [{ role: 'assistant', content: 'Hi Elena, I noticed your recent talk at QCon...' }, { role: 'candidate', content: 'Thanks for reaching out! I am open to hearing more.' }] },
  { id: 's2', candidate: { first_name: 'David', last_name: 'Kim', job_title: 'Head of Product', company_name: 'Booking.com' }, status: 'delivered', phone_number: '+31 6-1234-5678', last_message_at: '2026-02-09T10:00:00Z', messages: [{ role: 'assistant', content: 'David, the M&A news at your company caught my attention...' }] },
  { id: 's3', candidate: { first_name: 'Sophia', last_name: 'Nguyen', job_title: 'Senior Data Scientist', company_name: 'Meta' }, status: 'interested', phone_number: '+44 7700-900123', last_message_at: '2026-02-08T16:00:00Z', messages: [{ role: 'assistant', content: 'Sophia, your work on recommendation systems is impressive...' }, { role: 'candidate', content: 'I would love to schedule a call. When works for you?' }] },
  { id: 's4', candidate: { first_name: 'Marcus', last_name: 'Johnson', job_title: 'Director of Sales', company_name: 'HubSpot' }, status: 'sent', phone_number: '+1 555-0204', last_message_at: '2026-02-08T09:00:00Z', messages: [{ role: 'assistant', content: 'Hi Marcus, quick note about an exciting sales leadership opportunity...' }] },
  { id: 's5', candidate: { first_name: 'Tom', last_name: 'van der Berg', job_title: 'CTO', company_name: 'DataBridge' }, status: 'scheduled', phone_number: '+31 6-9876-5432', last_message_at: '2026-02-07T11:00:00Z', messages: [{ role: 'assistant', content: 'Tom, as a fellow Dutch tech leader...' }, { role: 'candidate', content: 'Let us meet Thursday at 2pm.' }] },
  { id: 's6', candidate: { first_name: 'Laura', last_name: 'Chen', job_title: 'Product Manager', company_name: 'Shopify' }, status: 'declined', phone_number: '+1 555-0306', last_message_at: '2026-02-06T15:00:00Z', messages: [{ role: 'assistant', content: 'Laura, your product work at Shopify has been...' }, { role: 'candidate', content: 'Thanks but not looking right now.' }] },
  { id: 's7', candidate: { first_name: 'James', last_name: 'Park', job_title: 'Engineering Manager', company_name: 'Netflix' }, status: 'queued', phone_number: '+1 555-0407', last_message_at: null, messages: [] },
];

const SMS_STATS = [
  { label: 'Total', value: 7, icon: MessageSquare, bg: 'bg-zinc-500/20', iconColor: 'text-zinc-400' },
  { label: 'Queued', value: 1, icon: Clock, bg: 'bg-zinc-500/20', iconColor: 'text-zinc-400' },
  { label: 'Sent', value: 1, icon: Send, bg: 'bg-red-500/20', iconColor: 'text-red-400' },
  { label: 'Delivered', value: 1, icon: CheckCircle, bg: 'bg-red-600/20', iconColor: 'text-red-400' },
  { label: 'Responded', value: 1, icon: MessageCircle, bg: 'bg-red-400/20', iconColor: 'text-red-300' },
  { label: 'Interested', value: 1, icon: Sparkles, bg: 'bg-red-500/20', iconColor: 'text-red-400' },
  { label: 'Scheduled', value: 1, icon: Calendar, bg: 'bg-red-700/20', iconColor: 'text-red-400' },
  { label: 'Declined', value: 1, icon: XCircle, bg: 'bg-red-500/20', iconColor: 'text-red-400' },
];

export function DemoTalentOutreach({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">SMS Outreach</h1>
          <p className="text-xs text-zinc-500">{SMS_CONVERSATIONS.length} conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm cursor-default">
            <Phone className="w-4 h-4" /> 2 Numbers
          </button>
          <button className="p-2 text-zinc-400 cursor-default"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {SMS_STATS.map(s => (
          <motion.div key={s.label} variants={itemVariants}>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 ${s.bg} rounded-lg`}>
                  <s.icon className={`w-3 h-3 ${s.iconColor}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-white">{s.value}</p>
                  <p className="text-[9px] text-zinc-500">{s.label}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <div className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white/40 text-sm">
                Search conversations...
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white/70 text-sm cursor-default">All Status</div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {SMS_CONVERSATIONS.map(conv => {
          const statusCfg = SMS_STATUS_CONFIG[conv.status] || SMS_STATUS_CONFIG.queued;
          const StatusIcon = statusCfg.icon;
          const candidateName = `${conv.candidate.first_name} ${conv.candidate.last_name}`;
          const lastMessage = conv.messages?.[conv.messages.length - 1];

          return (
            <motion.div key={conv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:border-red-500/30 cursor-default transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {candidateName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium text-white text-sm truncate">{candidateName}</h4>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mb-1">{conv.candidate.job_title} at {conv.candidate.company_name}</p>
                  {lastMessage && (
                    <p className="text-xs text-zinc-400 truncate">
                      {lastMessage.role === 'assistant' ? 'You: ' : ''}{lastMessage.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{conv.phone_number}</span>
                    {conv.last_message_at && <span>{new Date(conv.last_message_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


/* ================================================================== */
/*  7. DemoTalentNests                                                 */
/* ================================================================== */

const NESTS = [
  { id: 'n1', name: 'Senior Engineers Europe', description: 'Top backend and fullstack engineers across EU markets.', item_count: 1420, price: 299, nest_type: 'candidates', is_active: true },
  { id: 'n2', name: 'Product Managers NYC', description: 'Experienced PMs in the New York metro area.', item_count: 680, price: 199, nest_type: 'candidates', is_active: true },
  { id: 'n3', name: 'Data Scientists', description: 'ML and data professionals with production experience.', item_count: 920, price: 349, nest_type: 'candidates', is_active: true },
  { id: 'n4', name: 'DevOps Specialists', description: 'Cloud infrastructure and platform engineering talent.', item_count: 540, price: 249, nest_type: 'candidates', is_active: true },
  { id: 'n5', name: 'Sales Leaders EMEA', description: 'Enterprise sales leaders across Europe and Middle East.', item_count: 380, price: 179, nest_type: 'candidates', is_active: true },
  { id: 'n6', name: 'UX Researchers', description: 'User research and design strategy professionals.', item_count: 290, price: 149, nest_type: 'candidates', is_active: true },
  { id: 'n7', name: 'AI/ML Engineers', description: 'Specialized AI and machine learning engineers.', item_count: 450, price: 399, nest_type: 'candidates', is_active: true },
  { id: 'n8', name: 'FinTech Executives', description: 'C-level and VP talent from fintech companies.', item_count: 210, price: 499, nest_type: 'candidates', is_active: true },
];

export function DemoTalentNests({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="w-full px-4 lg:px-6 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white mb-1">Talent Nests</h1>
        <p className="text-zinc-500 text-xs">Pre-built candidate datasets for your recruitment needs</p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <div className="w-full pl-11 h-9 flex items-center bg-zinc-900/50 border border-zinc-800 rounded-lg text-white/40 text-sm">
            Search nests...
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm cursor-default">
          <Filter className="w-4 h-4" /> Filters
        </button>
        <div className="px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white/70 text-sm cursor-default">
          Featured
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-zinc-500">{NESTS.length} nests available</p>

      {/* Grid */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {NESTS.map(nest => (
          <motion.div key={nest.id} variants={itemVariants}>
            <div className="group p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/50 cursor-default transition-all duration-300">
              <h3 className="text-base font-medium text-white mb-2">{nest.name}</h3>
              <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{nest.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-white">EUR {nest.price}</span>
                  <span className="text-xs text-zinc-500">{nest.item_count.toLocaleString()} profiles</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Flow Continuity CTA */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Megaphone className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Ready to start recruiting?</p>
              <p className="text-zinc-400 text-sm">Purchase a nest to unlock data, then launch a targeted campaign or enrich</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-sm cursor-default">
              <Megaphone className="w-4 h-4" /> My Campaigns
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm cursor-default">
              <ShoppingBag className="w-4 h-4" /> Visit Marketplace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
