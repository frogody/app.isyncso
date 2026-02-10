import { motion } from 'framer-motion';
import {
  Plug,
  Link2,
  Layers,
  RefreshCw,
  Search,
  ExternalLink,
  Zap,
  Clock,
  Activity,
} from 'lucide-react';

// ─── Stats ────────────────────────────────────────────────────────────────────
const integrationStats = [
  { label: 'Available', value: '30+', icon: Layers, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'Connected', value: '8', icon: Link2, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'Syncing', value: '6', icon: RefreshCw, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
];

// ─── Category Tabs ────────────────────────────────────────────────────────────
const categories = ['All', 'Communication', 'CRM & Sales', 'Productivity', 'Finance', 'Development'];

// ─── Integrations ─────────────────────────────────────────────────────────────
const integrations = [
  {
    name: 'Slack',
    category: 'Communication',
    connected: true,
    color: '#E01E5A',
    description: 'Send and receive messages across channels and DMs.',
    lastSync: '2 min ago',
    records: '3,412',
  },
  {
    name: 'Gmail',
    category: 'Communication',
    connected: true,
    color: '#EA4335',
    description: 'Sync emails, track opens, and automate follow-ups.',
    lastSync: '5 min ago',
    records: '8,921',
  },
  {
    name: 'HubSpot',
    category: 'CRM & Sales',
    connected: true,
    color: '#FF7A59',
    description: 'Sync contacts, deals, and pipeline data bi-directionally.',
    lastSync: '10 min ago',
    records: '1,247',
  },
  {
    name: 'Notion',
    category: 'Productivity',
    connected: true,
    color: '#FFFFFF',
    description: 'Connect knowledge bases, docs, and project wikis.',
    lastSync: '15 min ago',
    records: '567',
  },
  {
    name: 'Google Drive',
    category: 'Productivity',
    connected: true,
    color: '#4285F4',
    description: 'Access and organize shared files and documents.',
    lastSync: '8 min ago',
    records: '2,103',
  },
  {
    name: 'Stripe',
    category: 'Finance',
    connected: true,
    color: '#635BFF',
    description: 'Track payments, subscriptions, and revenue metrics.',
    lastSync: '3 min ago',
    records: '4,582',
  },
  {
    name: 'Salesforce',
    category: 'CRM & Sales',
    connected: false,
    color: '#00A1E0',
    description: 'Enterprise CRM with leads, opportunities, and forecasting.',
    lastSync: null,
    records: null,
  },
  {
    name: 'LinkedIn',
    category: 'CRM & Sales',
    connected: true,
    color: '#0A66C2',
    description: 'Import contacts, enrich profiles, and track outreach.',
    lastSync: '1 hr ago',
    records: '892',
  },
  {
    name: 'Zoom',
    category: 'Communication',
    connected: true,
    color: '#2D8CFF',
    description: 'Schedule meetings and sync recordings automatically.',
    lastSync: '20 min ago',
    records: '156',
  },
  {
    name: 'GitHub',
    category: 'Development',
    connected: false,
    color: '#8B949E',
    description: 'Track repositories, PRs, and deployment status.',
    lastSync: null,
    records: null,
  },
  {
    name: 'Jira',
    category: 'Development',
    connected: false,
    color: '#0052CC',
    description: 'Sync issues, sprints, and project progress.',
    lastSync: null,
    records: null,
  },
  {
    name: 'QuickBooks',
    category: 'Finance',
    connected: false,
    color: '#2CA01C',
    description: 'Sync invoices, expenses, and financial reports.',
    lastSync: null,
    records: null,
  },
];

// ─── Connected Stats ──────────────────────────────────────────────────────────
const connectedTotals = [
  { label: 'Total Records Synced', value: '21,880', icon: Activity },
  { label: 'Actions Automated', value: '1,247', icon: Zap },
  { label: 'Time Saved This Month', value: '34 hrs', icon: Clock },
];


// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoIntegrations({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-6">

      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} data-demo="header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <Plug className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Integrations</h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              Connect {companyName} to your favorite tools and services.
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-sm text-zinc-500">Search integrations...</span>
        </div>
      </motion.div>

      {/* ─── Stats Row ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} data-demo="integration-stats" className="grid grid-cols-3 gap-3">
        {integrationStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.text}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── Category Tabs ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} data-demo="category-tabs" className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`text-xs font-medium px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors cursor-default ${
              i === 0
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* ─── Integration Grid ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}
        data-demo="integrations"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {integrations.map((integration) => {
          const isNotionDark = integration.name === 'Notion';
          const iconBg = isNotionDark ? '#333333' : `${integration.color}20`;
          const iconTextColor = isNotionDark ? '#FFFFFF' : integration.color;

          return (
            <div
              key={integration.name}
              data-demo={integration.connected ? 'connected' : 'available'}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-700/60 transition-colors"
            >
              {/* Top: Icon + name + category */}
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                  style={{ backgroundColor: iconBg, color: iconTextColor }}
                >
                  {integration.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
                  <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded mt-1 inline-block">
                    {integration.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-500 leading-relaxed">{integration.description}</p>

              {/* Status */}
              {integration.connected ? (
                <div className="mt-auto space-y-2 pt-2 border-t border-zinc-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span className="text-[11px] text-cyan-400 font-medium">Connected</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {integration.lastSync}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                    Syncing {integration.records} records
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-2">
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 text-xs font-medium border border-cyan-500/25 cursor-default hover:bg-cyan-500/25 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Connect
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* ─── Connected Stats (Bottom) ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}
        data-demo="connected-stats"
        className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {connectedTotals.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                <item.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{item.value}</p>
                <p className="text-xs text-zinc-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
