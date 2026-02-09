import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Globe,
  Zap,
  Calendar,
} from 'lucide-react';

// ─── Stats ────────────────────────────────────────────────────────────────────
const analyticsStats = [
  { label: 'Total Users', value: '342', icon: Users, change: '+12%', up: true, bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  { label: 'Active Today', value: '89', icon: Activity, change: '+8%', up: true, bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { label: 'Page Views', value: '12.4K', icon: Eye, change: '+23%', up: true, bg: 'bg-blue-500/15', text: 'text-blue-400' },
  { label: 'Avg. Session', value: '4m 32s', icon: Clock, change: '-5%', up: false, bg: 'bg-violet-500/15', text: 'text-violet-400' },
];

// ─── Time Periods ─────────────────────────────────────────────────────────────
const timePeriods = ['7D', '30D', '90D', '12M'];

// ─── Revenue Chart Data (mock bar chart) ──────────────────────────────────────
const revenueMonths = [
  { month: 'Sep', value: 42 },
  { month: 'Oct', value: 58 },
  { month: 'Nov', value: 52 },
  { month: 'Dec', value: 67 },
  { month: 'Jan', value: 78 },
  { month: 'Feb', value: 85 },
];

// ─── User Growth (mock line chart points) ─────────────────────────────────────
const userGrowth = [
  { month: 'Sep', value: 180 },
  { month: 'Oct', value: 210 },
  { month: 'Nov', value: 235 },
  { month: 'Dec', value: 268 },
  { month: 'Jan', value: 305 },
  { month: 'Feb', value: 342 },
];

// ─── Module Usage ─────────────────────────────────────────────────────────────
const moduleUsage = [
  { name: 'CRM', sessions: 1240, pct: 92, color: 'bg-cyan-500' },
  { name: 'Finance', sessions: 980, pct: 73, color: 'bg-blue-500' },
  { name: 'Tasks', sessions: 856, pct: 63, color: 'bg-violet-500' },
  { name: 'Growth', sessions: 742, pct: 55, color: 'bg-indigo-500' },
  { name: 'Inbox', sessions: 634, pct: 47, color: 'bg-amber-500' },
  { name: 'Products', sessions: 521, pct: 39, color: 'bg-emerald-500' },
  { name: 'Learn', sessions: 389, pct: 29, color: 'bg-rose-500' },
  { name: 'SYNC', sessions: 312, pct: 23, color: 'bg-teal-500' },
];

// ─── Top Pages ────────────────────────────────────────────────────────────────
const topPages = [
  { page: '/dashboard', views: '3,420', unique: '287', avgTime: '2m 14s', bounce: '18%' },
  { page: '/crm/contacts', views: '2,180', unique: '198', avgTime: '5m 42s', bounce: '12%' },
  { page: '/finance/invoices', views: '1,940', unique: '156', avgTime: '4m 08s', bounce: '15%' },
  { page: '/tasks', views: '1,680', unique: '234', avgTime: '3m 55s', bounce: '22%' },
  { page: '/growth/pipeline', views: '1,420', unique: '142', avgTime: '6m 20s', bounce: '9%' },
  { page: '/sync', views: '1,180', unique: '178', avgTime: '8m 12s', bounce: '7%' },
];

// ─── Heatmap Data (7 days x 24 hours) ────────────────────────────────────────
const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function generateHeatmapRow() {
  return Array.from({ length: 24 }, (_, hour) => {
    if (hour < 6 || hour > 22) return 0;
    if (hour >= 9 && hour <= 17) return Math.floor(Math.random() * 4) + 2;
    return Math.floor(Math.random() * 3);
  });
}

const heatmapData = heatmapDays.map(() => generateHeatmapRow());

const heatmapCellColor = [
  'bg-zinc-900',
  'bg-cyan-900/40',
  'bg-cyan-700/50',
  'bg-cyan-600/60',
  'bg-cyan-500/70',
  'bg-cyan-400/80',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DemoAnalytics({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const maxRevenue = Math.max(...revenueMonths.map((m) => m.value));
  const maxGrowth = Math.max(...userGrowth.map((m) => m.value));

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-5">
      {/* ─── Page Header ───────────────────────────────────────────────────── */}
      <div data-demo="header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Analytics</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Platform usage and performance insights for {companyName}.</p>
          </div>
        </div>
        {/* Time Period Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg">
          {timePeriods.map((period, i) => (
            <button
              key={period}
              className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-default transition-colors ${
                i === 1
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stats Row ─────────────────────────────────────────────────────── */}
      <div data-demo="analytics-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {analyticsStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.text}`} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className={`flex items-center gap-0.5 text-xs ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Bar Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Monthly recurring revenue trend</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              +27% vs last period
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {revenueMonths.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">${m.value}K</span>
                <div
                  className="w-full bg-gradient-to-t from-cyan-600/40 to-cyan-400/70 rounded-t-md transition-all"
                  style={{ height: `${(m.value / maxRevenue) * 100}%` }}
                />
                <span className="text-[10px] text-zinc-600">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Growth Line Chart (mock) */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-white">User Growth</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Total registered users over time</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              +90% in 6 months
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {userGrowth.map((m) => {
              const pct = (m.value / maxGrowth) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">{m.value}</span>
                  <div className="w-full relative flex items-end justify-center" style={{ height: `${pct}%` }}>
                    <div className="w-3 h-3 rounded-full bg-cyan-400 border-2 border-zinc-900 relative z-10" />
                    <div className="absolute bottom-0 w-full bg-cyan-500/10 rounded-t-md" style={{ height: '100%' }} />
                  </div>
                  <span className="text-[10px] text-zinc-600">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Module Usage + Top Pages ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module Usage */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Module Usage</h2>
            <span className="text-[11px] text-zinc-500">Last 30 days</span>
          </div>
          <div className="space-y-3">
            {moduleUsage.map((mod) => (
              <div key={mod.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">{mod.name}</span>
                  <span className="text-[11px] text-zinc-500">{mod.sessions} sessions</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${mod.color}`}
                    style={{ width: `${mod.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-white">Top Pages</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/80 uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Page</th>
                  <th className="px-3 py-3 font-medium">Views</th>
                  <th className="px-3 py-3 font-medium">Unique</th>
                  <th className="px-3 py-3 font-medium">Avg Time</th>
                  <th className="px-3 py-3 font-medium">Bounce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {topPages.map((p) => (
                  <tr key={p.page} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-5 py-3 text-sm text-cyan-400 font-mono">{p.page}</td>
                    <td className="px-3 py-3 text-sm text-white font-semibold">{p.views}</td>
                    <td className="px-3 py-3 text-sm text-zinc-400">{p.unique}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{p.avgTime}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{p.bounce}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Activity Heatmap ──────────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Activity Heatmap</h2>
            <p className="text-xs text-zinc-500 mt-0.5">User activity by day and hour (last 7 days)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">Less</span>
            <div className="flex items-center gap-0.5">
              {heatmapCellColor.map((color, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
              ))}
            </div>
            <span className="text-[10px] text-zinc-600">More</span>
          </div>
        </div>

        {/* Hour labels */}
        <div className="flex items-center mb-1 ml-10">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 3 === 0 && (
                <span className="text-[8px] text-zinc-600">{i.toString().padStart(2, '0')}</span>
              )}
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-1">
          {heatmapDays.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-8 text-right shrink-0">{day}</span>
              <div className="flex-1 flex gap-0.5">
                {heatmapData[dayIdx].map((val, hourIdx) => (
                  <div
                    key={hourIdx}
                    className={`flex-1 h-4 rounded-sm ${heatmapCellColor[Math.min(val, 5)]}`}
                    title={`${day} ${hourIdx}:00 - ${val} sessions`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
