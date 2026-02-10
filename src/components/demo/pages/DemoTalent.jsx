import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Megaphone,
  Send,
  MessageSquare,
  Briefcase,
  Target,
  CheckCircle2,
  Brain,
  RefreshCw,
  Award,
  Sparkles,
  ArrowRight,
  Package,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const STATS = [
  { icon: Users, value: 284, label: 'Candidates', sub: '142 intel' },
  { icon: Megaphone, value: 6, label: 'Campaigns', sub: '84 matches' },
  { icon: Send, value: 127, label: 'Sent', sub: '194 total' },
  { icon: MessageSquare, value: '23%', label: 'Response', sub: '29 replies' },
  { icon: Briefcase, value: 4, label: 'Projects', sub: '7 total' },
  { icon: Target, value: 5, label: 'Open Roles', sub: '12 total' },
  { icon: CheckCircle2, value: 3, label: 'Filled', sub: '25%' },
  { icon: Brain, value: 18, label: 'High Intel', sub: 'Score 60+' },
];

const PIPELINE_STAGES = [
  { name: 'New', count: 72 },
  { name: 'Contacted', count: 58 },
  { name: 'Responded', count: 41 },
  { name: 'Screening', count: 34 },
  { name: 'Interview', count: 22 },
  { name: 'Offer', count: 9 },
  { name: 'Hired', count: 3 },
  { name: 'Rejected', count: 14 },
];

const INTEL_DISTRIBUTION = {
  critical: 12,
  high: 38,
  medium: 86,
  low: 148,
};

const CAMPAIGNS = [
  { id: '1', name: 'Senior Engineers Q1', matches: 84, sent: 62, replyRate: 28, replies: 17 },
  { id: '2', name: 'Product Leadership', matches: 36, sent: 24, replyRate: 19, replies: 5 },
  { id: '3', name: 'Data Science Expansion', matches: 52, sent: 41, replyRate: 22, replies: 9 },
  { id: '4', name: 'Design Systems Team', matches: 28, sent: 18, replyRate: 33, replies: 6 },
  { id: '5', name: 'Platform Engineering', matches: 44, sent: 31, replyRate: 16, replies: 5 },
];

const BEST_CAMPAIGN = {
  name: 'Design Systems Team',
  rate: 33.3,
  sent: 18,
  replied: 6,
};

const RECOMMENDATIONS = [
  {
    icon: AlertTriangle,
    title: 'Low Response Rate',
    description: 'Refine messaging or target higher-intel candidates',
    actionLabel: 'View Campaigns',
  },
  {
    icon: Brain,
    title: 'High-Intel Candidates Ready',
    description: '18 candidates with flight risk scores >= 60',
    actionLabel: 'Start Campaign',
  },
  {
    icon: Send,
    title: '8 Messages Ready',
    description: 'Approved outreach waiting to be sent',
    actionLabel: 'View Queue',
  },
];

const QUICK_ACTIONS = [
  { icon: Users, label: 'Candidates', description: 'Browse your talent pool' },
  { icon: Package, label: 'Nests', description: 'Explore candidate pools' },
  { icon: Briefcase, label: 'Projects', description: 'Manage hiring projects' },
  { icon: Megaphone, label: 'Campaigns', description: 'Run outreach campaigns' },
];

const RECOMMENDED_NESTS = [
  { id: '1', category: 'engineers', name: 'Senior React Developers', description: 'Experienced React/TypeScript engineers from top startups', count: 342, price: 149 },
  { id: '2', category: 'leadership', name: 'VP Engineering EU', description: 'Engineering leaders with EU tech company experience', count: 87, price: 299 },
  { id: '3', category: 'data', name: 'ML Engineers FAANG', description: 'Machine learning engineers from FAANG companies', count: 214, price: 199 },
  { id: '4', category: 'product', name: 'Product Managers B2B', description: 'Product managers specializing in B2B SaaS platforms', count: 156, price: 179 },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatPill({ icon: Icon, value, label, sub }) {
  const isPercentage = typeof value === 'string' && value.endsWith('%');
  const displayValue = isPercentage ? value : value;

  return (
    <motion.div variants={fadeIn}>
      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-white leading-none">{displayValue}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {label}{sub ? ` \u00b7 ${sub}` : ''}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResponseRateRing({ rate, sent, replied }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={r} fill="none"
            stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - rate / 100) }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{rate}%</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-zinc-400">Sent</span>
          <span className="text-white font-medium ml-auto">{sent}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-300" />
          <span className="text-zinc-400">Replied</span>
          <span className="text-white font-medium ml-auto">{replied}</span>
        </div>
      </div>
    </div>
  );
}

function PipelineBars({ stages }) {
  const max = Math.max(...stages.map(s => s.count), 1);
  return (
    <div className="space-y-2">
      {stages.map((s) => {
        const pct = Math.round((s.count / max) * 100);
        return (
          <div key={s.name} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{s.name}</span>
              <span className="text-[10px] text-zinc-600">{s.count > 0 ? s.count : ''}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntelBar({ data }) {
  const levels = [
    { key: 'Critical', color: 'bg-red-600', count: data.critical },
    { key: 'High', color: 'bg-red-500', count: data.high },
    { key: 'Medium', color: 'bg-red-400/60', count: data.medium },
    { key: 'Low', color: 'bg-zinc-600', count: data.low },
  ];
  const total = levels.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <div>
      <div className="flex items-center gap-0.5 h-5 rounded-lg overflow-hidden mb-3">
        {levels.map((l) => (
          <motion.div
            key={l.key}
            initial={{ width: 0 }}
            animate={{ width: `${(l.count / total) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full ${l.color}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {levels.map((l) => (
          <div key={l.key} className="text-center">
            <div className="text-sm font-semibold text-white">{l.count}</div>
            <div className="text-[10px] text-zinc-500">{l.key}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignRow({ campaign }) {
  const rateColor = campaign.replyRate >= 20
    ? 'text-red-400'
    : campaign.replyRate > 0
      ? 'text-zinc-300'
      : 'text-zinc-600';

  return (
    <motion.div
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-lg"
    >
      <div className="flex items-center gap-3 p-3 group cursor-default">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Megaphone className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{campaign.name}</p>
          <p className="text-[11px] text-zinc-500">{campaign.matches} matches \u00b7 {campaign.sent} sent</p>
        </div>
        <div className="text-right shrink-0">
          {campaign.replyRate >= 20 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              {campaign.replyRate}%
            </span>
          ) : (
            <span className={`text-sm font-medium ${rateColor}`}>{campaign.replyRate}%</span>
          )}
          <p className="text-[10px] text-zinc-600">{campaign.replies} replies</p>
        </div>
      </div>
    </motion.div>
  );
}

function RecCard({ icon: Icon, title, description, actionLabel }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-zinc-800/50">
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">{title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          <span className="mt-1.5 inline-flex items-center text-xs text-red-400 cursor-default">
            {actionLabel} <ArrowRight className="w-3 h-3 ml-1" />
          </span>
        </div>
      </div>
    </div>
  );
}

function NestCard({ nest }) {
  return (
    <motion.div
      className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 hover:border-red-500/20 transition-all h-full flex flex-col cursor-default"
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 w-fit mb-2">
        {nest.category}
      </span>
      <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">{nest.name}</h4>
      <p className="text-xs text-zinc-500 line-clamp-2 flex-1 mb-3">{nest.description}</p>
      <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/60">
        <span className="text-zinc-500 flex items-center gap-1">
          <Users className="w-3 h-3" /> {nest.count}
        </span>
        <span className="text-white font-medium">&euro;{nest.price}</span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function DemoTalent({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-5">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Talent Dashboard</h1>
            </div>
            <p className="text-xs text-zinc-400">Your recruitment command center</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className="cursor-default inline-flex items-center gap-1 border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8 px-3 rounded-md font-medium transition-colors">
                <Briefcase className="w-3.5 h-3.5" /> Create Role
              </button>
              <button className="cursor-default inline-flex items-center gap-1 border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8 px-3 rounded-md font-medium transition-colors">
                <Package className="w-3.5 h-3.5" /> Browse Nests
              </button>
              <button className="cursor-default inline-flex items-center gap-1 border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8 px-3 rounded-md font-medium transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Run Matching
              </button>
              <button className="cursor-default inline-flex items-center gap-1 border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8 px-3 rounded-md font-medium transition-colors">
                <Send className="w-3.5 h-3.5" /> Launch Outreach
              </button>
              <button className="cursor-default inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs h-8 px-3 rounded-md font-medium transition-colors">
                <Users className="w-3.5 h-3.5" /> Add Candidate
              </button>

              <div className="h-5 w-px bg-zinc-700 mx-1" />

              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="appearance-none w-[120px] bg-zinc-900/60 border border-zinc-800 text-white text-xs h-8 pl-3 pr-7 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-default"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button className="cursor-default text-zinc-500 hover:text-white h-8 w-8 p-0 inline-flex items-center justify-center rounded-md transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2"
        >
          {STATS.map((s) => (
            <StatPill key={s.label} icon={s.icon} value={s.value} label={s.label} sub={s.sub} />
          ))}
        </motion.div>

        {/* ── Main Grid: Left 2/3 + Right 1/3 ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left Column ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Response Rate + Best Campaign + Recommendations */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Response Rate Ring */}
              <motion.div variants={fadeIn}>
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 h-full">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Response Rate</div>
                  <ResponseRateRing rate={23} sent={127} replied={29} />
                </div>
              </motion.div>

              {/* Best Campaign */}
              <motion.div variants={fadeIn}>
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 h-full">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">
                    <Award className="w-3.5 h-3.5 text-red-400" /> Best Campaign
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 truncate">{BEST_CAMPAIGN.name}</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Rate</span>
                        <span className="text-white font-medium">{BEST_CAMPAIGN.rate.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Sent</span>
                        <span className="text-zinc-300">{BEST_CAMPAIGN.sent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Replied</span>
                        <span className="text-red-400">{BEST_CAMPAIGN.replied}</span>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex items-center text-xs text-red-400 cursor-default">
                      View <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Recommendations */}
              <motion.div variants={fadeIn}>
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 h-full">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" /> Recommendations
                  </div>
                  <div className="space-y-2">
                    {RECOMMENDATIONS.map((rec, i) => (
                      <RecCard key={i} icon={rec.icon} title={rec.title} description={rec.description} actionLabel={rec.actionLabel} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Pipeline + Intel Distribution */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pipeline Bars */}
              <motion.div variants={fadeIn}>
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Pipeline Stages</div>
                  <PipelineBars stages={PIPELINE_STAGES} />
                </div>
              </motion.div>

              {/* Intel Distribution */}
              <motion.div variants={fadeIn}>
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Intelligence Distribution</div>
                  <IntelBar data={INTEL_DISTRIBUTION} />
                </div>
              </motion.div>
            </motion.div>

            {/* Campaigns List */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Campaigns</div>
                  <span className="inline-flex items-center text-red-400 text-xs cursor-default">
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
                <div className="space-y-0.5">
                  {CAMPAIGNS.map((c) => (
                    <CampaignRow key={c.id} campaign={c} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Right Column ───────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Quick Actions */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Quick Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <div
                        key={action.label}
                        className="p-3 rounded-lg bg-white/[0.02] border border-zinc-800/50 hover:border-red-500/20 transition-all cursor-default"
                      >
                        <div className="p-2 rounded-lg bg-red-500/10 w-fit mb-2">
                          <ActionIcon className="w-4 h-4 text-red-400" />
                        </div>
                        <p className="text-sm text-white font-medium">{action.label}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{action.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Recommended Nests */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Recommended Nests</div>
                  <span className="inline-flex items-center text-red-400 text-xs cursor-default">
                    Browse <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {RECOMMENDED_NESTS.map((nest) => (
                    <NestCard key={nest.id} nest={nest} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
