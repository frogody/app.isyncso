import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  FileText,
} from 'lucide-react';

const financeStats = [
  { label: 'Monthly Revenue', value: '$87,400', change: '+18.2%', up: true, icon: TrendingUp, color: 'cyan' },
  { label: 'Outstanding', value: '$34,200', change: '8 invoices', up: false, icon: Clock, color: 'amber' },
  { label: 'Paid', value: '$53,200', change: '+$12,400', up: true, icon: CheckCircle2, color: 'emerald' },
  { label: 'Overdue', value: '$8,100', change: '3 invoices', up: false, icon: AlertTriangle, color: 'red' },
];

const revenueMonths = [
  { month: 'Jul', height: 45 },
  { month: 'Aug', height: 62 },
  { month: 'Sep', height: 38 },
  { month: 'Oct', height: 71 },
  { month: 'Nov', height: 55 },
  { month: 'Dec', height: 80 },
  { month: 'Jan', height: 68 },
  { month: 'Feb', height: 87 },
];

const statusStyles = {
  Paid: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
  Overdue: 'bg-red-500/15 text-red-400',
};

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
};

export default function DemoFinance({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const invoices = [
    { id: 'INV-1047', client: companyName, amount: '$12,400', status: 'Paid', date: 'Feb 3, 2025' },
    { id: 'INV-1046', client: 'TechVentures', amount: '$8,200', status: 'Pending', date: 'Jan 28, 2025' },
    { id: 'INV-1045', client: 'Summit Analytics', amount: '$15,800', status: 'Paid', date: 'Jan 22, 2025' },
    { id: 'INV-1044', client: 'Meridian Health', amount: '$4,100', status: 'Overdue', date: 'Jan 10, 2025' },
    { id: 'INV-1043', client: 'DataBridge Corp', amount: '$6,900', status: 'Pending', date: 'Jan 5, 2025' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Finance Overview</h1>
        <p className="text-zinc-400 mt-1">Revenue, invoices, and payment tracking.</p>
      </div>

      {/* Finance Stats */}
      <div data-demo="finance-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financeStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className={`p-2 rounded-lg ${iconBgMap[stat.color]}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  stat.up ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {stat.up && <ArrowUpRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div
          data-demo="revenue-chart"
          className="lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold">Revenue Trend</h2>
            <span className="text-xs text-zinc-500">Last 8 months</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {revenueMonths.map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-cyan-500/30 to-cyan-400/60 rounded-t-lg transition-all"
                  style={{ height: `${bar.height}%` }}
                />
                <span className="text-[10px] text-zinc-500">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        <div
          data-demo="invoices"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Invoices</h2>
            <span className="text-xs text-cyan-400 cursor-default">View all</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 font-medium">Invoice</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-sm">
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                        {inv.id}
                      </div>
                    </td>
                    <td className="py-3 text-white font-medium">{inv.client}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-1 text-zinc-300">
                        <DollarSign className="w-3 h-3 text-zinc-500" />
                        {inv.amount.replace('$', '')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${statusStyles[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-500 text-xs">{inv.date}</td>
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
