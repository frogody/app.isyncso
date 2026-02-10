import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Search, Plus, Building2, User, DollarSign, Target,
  Handshake, Trophy, CalendarCheck, BarChart3, Megaphone, Mail, Zap, Clock,
  ArrowUpRight, ArrowRight, AlertTriangle, Bell, Send, Users, Euro, Layers,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const PIPELINE_VALUE = 387000;
const TOTAL_PROSPECTS = 245;
const WON_VALUE = 142000;
const NEW_SIGNALS = 7;

const STAGE_DATA = [
  { name: 'New', value: 45, fill: '#818cf8' },
  { name: 'Contacted', value: 32, fill: '#6366f1' },
  { name: 'Qualified', value: 23, fill: '#4f46e5' },
  { name: 'Proposal', value: 12, fill: '#4338ca' },
  { name: 'Negotiation', value: 8, fill: '#3730a3' },
  { name: 'Won', value: 5, fill: '#312e81' },
];

const PIE_DATA = [
  { name: 'Inbound', value: 34, fill: '#6366f1' },
  { name: 'Outbound', value: 22, fill: '#818cf8' },
  { name: 'Referral', value: 18, fill: '#a5b4fc' },
  { name: 'Partner', value: 12, fill: '#c7d2fe' },
  { name: 'Other', value: 6, fill: '#52525b' },
];

const REVENUE_DATA = [
  { month: 'Sep', value: 48000 },
  { month: 'Oct', value: 62000 },
  { month: 'Nov', value: 55000 },
  { month: 'Dec', value: 78000 },
  { month: 'Jan', value: 71000 },
  { month: 'Feb', value: 85000 },
];

const STAGE_BADGES = {
  new: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
  contacted: 'bg-indigo-500/15 text-indigo-400/70 border border-indigo-500/25',
  qualified: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  proposal: 'bg-indigo-500/25 text-indigo-400/80 border border-indigo-500/35',
  negotiation: 'bg-indigo-500/30 text-indigo-400/90 border border-indigo-500/40',
  won: 'bg-indigo-500/35 text-indigo-300 border border-indigo-500/45',
  lost: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const TOP_DEALS = [
  { id: 1, company: 'TechVentures Inc.', contact: 'Alex Morgan', value: 45000, stage: 'proposal' },
  { id: 2, company: 'Summit Analytics', contact: 'Priya Shah', value: 41000, stage: 'qualified' },
  { id: 3, company: 'Pinnacle Group', contact: 'Robert Kim', value: 55000, stage: 'won' },
  { id: 4, company: 'DataBridge Corp', contact: 'Michael Chen', value: 22500, stage: 'negotiation' },
];

const PROSPECT_LISTS = [
  { id: 1, name: 'Enterprise SaaS Targets', count: 128, status: 'active' },
  { id: 2, name: 'EU Expansion Leads', count: 86, status: 'active' },
  { id: 3, name: 'Partner Referrals Q1', count: 34, status: 'active' },
  { id: 4, name: 'Conference Follow-ups', count: 67, status: 'paused' },
];

const SIGNALS = [
  { id: 1, company: 'TechVentures', headline: 'Visited pricing page 4 times this week', type: 'intent', score: 92 },
  { id: 2, company: 'Meridian Health', headline: 'Contract renewal in 28 days', type: 'renewal', score: 85 },
  { id: 3, company: 'Summit Analytics', headline: 'Announced EU expansion', type: 'expansion', score: 78 },
  { id: 4, company: 'NovaTech Solutions', headline: 'Series B funding announced ($24M)', type: 'funding', score: 72 },
];

const CAMPAIGNS = [
  { name: 'Q1 Enterprise Push', status: 'active', contacts: 128, meetings: 8, responseRate: 24 },
  { name: 'Product-Led Inbound', status: 'active', contacts: 312, meetings: 14, responseRate: 18 },
  { name: 'Partner Co-Sell', status: 'paused', contacts: 67, meetings: 4, responseRate: 31 },
];

const QUICK_ACTIONS = [
  { icon: Target, label: 'Pipeline', desc: '42 deals', color: 'indigo' },
  { icon: Users, label: 'Prospects', desc: '4 lists', color: 'indigo' },
  { icon: Send, label: 'Campaigns', desc: '3 active', color: 'indigo' },
  { icon: Bell, label: 'Signals', desc: '7 new', color: 'indigo' },
];

// ─── Tooltip Style ──────────────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: '8px',
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function DemoGrowth({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Funnel data calculated from stage data
  const leadsCount = 128;
  const qualifiedCount = 23;
  const proposalCount = 12;
  const wonCount = 5;
  const maxFunnel = Math.max(leadsCount, 1);
  const funnelStages = [
    { label: 'Leads', value: leadsCount, pct: 100 },
    { label: 'Qualified', value: qualifiedCount, pct: (qualifiedCount / maxFunnel) * 100 },
    { label: 'Proposal', value: proposalCount, pct: (proposalCount / maxFunnel) * 100 },
    { label: 'Won', value: wonCount, pct: (wonCount / maxFunnel) * 100 },
  ];

  const wonDeals = 5;
  const lostDeals = 3;
  const winRate = Math.round((wonDeals / (wonDeals + lostDeals)) * 100);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div data-demo="page-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Growth Dashboard</h1>
              <p className="text-xs text-zinc-400">Pipeline, prospects, and revenue intelligence</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors cursor-default">
              <Search className="w-4 h-4" />
              Research
            </button>
            <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-default">
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* ── Quick Prospect Search ──────────────────────────────── */}
        <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search: e.g., 'VP Sales at SaaS companies in Europe'"
                className="w-full pl-8 h-8 text-xs bg-zinc-800/50 border border-zinc-700/60 text-white rounded-lg focus:border-indigo-500/40 focus:outline-none px-3"
              />
            </div>
            <button className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium h-8 text-xs px-3 rounded-lg transition-colors cursor-default">
              Find Prospects
            </button>
          </div>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <div data-demo="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Euro, label: 'Pipeline Value', value: `€${(PIPELINE_VALUE / 1000).toFixed(0)}K`, change: '+14%' },
            { icon: Users, label: 'Total Prospects', value: TOTAL_PROSPECTS.toString(), change: '+28' },
            { icon: Target, label: 'Won Revenue', value: `€${(WON_VALUE / 1000).toFixed(0)}K`, change: '+22%' },
            { icon: Bell, label: 'New Signals', value: NEW_SIGNALS.toString(), change: '+3' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
                  <stat.icon className="w-4 h-4 text-indigo-400" />
                </div>
                {stat.change && (
                  <span className="text-xs font-medium rounded-lg px-1.5 py-0.5 text-green-400 bg-green-500/20">
                    ↑ {stat.change}
                  </span>
                )}
              </div>
              <div className="text-lg font-bold text-white mb-0.5">{stat.value}</div>
              <div className="text-xs text-zinc-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="p-3 text-center cursor-default rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-indigo-500/30 transition-all"
            >
              <action.icon className="w-5 h-5 text-indigo-400/70 mx-auto mb-1.5" />
              <h3 className="font-semibold text-white text-sm">{action.label}</h3>
              <p className="text-[10px] text-zinc-500">{action.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Main Content: Pipeline Chart + Conversion Funnel ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline Over Time (Recharts Line) */}
          <div className="lg:col-span-2">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400/70" />
                Pipeline Over Time
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `€${(v / 1000)}k`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value) => [`€${value.toLocaleString()}`, 'Pipeline']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400/70" />
              Conversion Funnel
            </h3>
            <div className="space-y-3">
              {funnelStages.map((stage, i) => (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{stage.label}</span>
                    <span className="text-xs font-bold text-indigo-400/80">{stage.value}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stage.pct, 5)}%` }}
                      transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Analytics Section ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Deals by Stage (Recharts Bar) */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400/70" />
              Deals by Stage
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STAGE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {STAGE_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win/Loss Analysis */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-400/70" />
              Win/Loss Analysis
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center py-4">
              <div>
                <p className="text-2xl font-bold text-indigo-400/70">{wonDeals}</p>
                <p className="text-zinc-500 text-xs mt-0.5">Won</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-600">{lostDeals}</p>
                <p className="text-zinc-500 text-xs mt-0.5">Lost</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-400/80">{winRate}%</p>
                <p className="text-zinc-500 text-xs mt-0.5">Win Rate</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${winRate}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-zinc-500">
                <span>Won: €{WON_VALUE.toLocaleString()}</span>
                <span>Lost: €{(lostDeals * 18000).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Source Breakdown ────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
          <h3 className="text-sm font-semibold text-white mb-3">Deals by Source</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE_DATA} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={56}>
                    {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              {PIE_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-zinc-300 text-xs">{item.name}</span>
                  <span className="text-zinc-500 text-xs ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Grid: Top Deals + Prospect Lists + Signals ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Deals */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Euro className="w-4 h-4 text-indigo-400/70" />
                Top Deals
              </h3>
              <span className="text-indigo-400/80 text-xs flex items-center gap-1 cursor-default">
                View All <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="space-y-2">
              {TOP_DEALS.map((opp, i) => (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-zinc-700/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs truncate">{opp.company}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
                      <Users className="w-2.5 h-2.5" />{opp.contact}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-indigo-400/80 font-bold text-xs">€{opp.value.toLocaleString()}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md inline-block ${STAGE_BADGES[opp.stage]}`}>
                      {opp.stage}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Prospect Lists */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400/70" />
                Prospect Lists
              </h3>
              <span className="text-indigo-400/80 text-xs flex items-center gap-1 cursor-default">
                View All <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="space-y-2">
              {PROSPECT_LISTS.map((list, i) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-zinc-700/30 cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs truncate">{list.name}</p>
                    <p className="text-[10px] text-zinc-500">{list.count} prospects</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                    {list.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Signals */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400/70" />
                Signals
              </h3>
              <span className="text-indigo-400/80 text-xs flex items-center gap-1 cursor-default">
                View All <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div className="space-y-2">
              {SIGNALS.map((signal, i) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-zinc-700/30 cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs truncate">{signal.company}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{signal.headline}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ml-2 ${
                    signal.score >= 80
                      ? 'bg-red-500/20 text-red-400/80 border border-red-500/30'
                      : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                  }`}>
                    {signal.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
