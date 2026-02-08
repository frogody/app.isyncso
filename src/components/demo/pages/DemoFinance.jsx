import {
  Euro,
  TrendingUp,
  Clock,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Wallet,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const topStats = [
  { label: 'Monthly Revenue', value: '$87.4K', change: '+18.2%', up: true, icon: TrendingUp },
  { label: 'Outstanding', value: '$34.2K', change: '8 invoices', up: false, icon: Clock },
  { label: 'Expenses', value: '$23.1K', change: '+4.6%', up: false, icon: CreditCard },
  { label: 'Net Profit', value: '$64.3K', change: '+22%', up: true, icon: Wallet },
];

const revenueExpenseData = [
  { month: 'Sep', revenue: 58, expense: 28 },
  { month: 'Oct', revenue: 72, expense: 32 },
  { month: 'Nov', revenue: 65, expense: 26 },
  { month: 'Dec', revenue: 80, expense: 35 },
  { month: 'Jan', revenue: 74, expense: 30 },
  { month: 'Feb', revenue: 87, expense: 23 },
];

const plItems = [
  { label: 'Revenue', amount: '$87,400', pct: '+18.2%', up: true, indent: false, bold: true },
  { label: 'Cost of Goods Sold', amount: '-$12,600', pct: '+5.1%', up: false, indent: false, bold: false },
  { label: 'Gross Profit', amount: '$74,800', pct: '+21.3%', up: true, indent: false, bold: true },
  { label: 'Marketing', amount: '-$6,200', pct: '+12%', up: false, indent: true, bold: false },
  { label: 'Salaries', amount: '-$11,400', pct: '0%', up: null, indent: true, bold: false },
  { label: 'Tools & Software', amount: '-$2,800', pct: '-8%', up: true, indent: true, bold: false },
  { label: 'Operating Profit', amount: '$54,400', pct: '+26.1%', up: true, indent: false, bold: true },
  { label: 'Tax Provision', amount: '-$9,100', pct: '', up: null, indent: false, bold: false },
  { label: 'Net Income', amount: '$45,300', pct: '+22%', up: true, indent: false, bold: true },
];

const statusStyles = {
  Paid: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
  Overdue: 'bg-red-500/15 text-red-400',
  Draft: 'bg-zinc-700/50 text-zinc-400',
};

const apAging = [
  { label: 'Current', amount: '$14,200', bar: 42, color: 'bg-emerald-500' },
  { label: '1-30 days', amount: '$9,800', bar: 29, color: 'bg-amber-400' },
  { label: '31-60 days', amount: '$6,100', bar: 18, color: 'bg-orange-500' },
  { label: '60+ days', amount: '$4,100', bar: 11, color: 'bg-red-500' },
];

const upcomingBills = [
  { vendor: 'AWS Cloud Services', amount: '$3,240', due: 'Feb 12', urgent: false },
  { vendor: 'Figma Enterprise', amount: '$1,180', due: 'Feb 14', urgent: false },
  { vendor: 'WeWork Office Space', amount: '$8,500', due: 'Feb 15', urgent: true },
  { vendor: 'Slack Business+', amount: '$620', due: 'Feb 28', urgent: false },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoFinance({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const invoices = [
    { id: 'INV-1052', client: companyName, amount: '$14,800', status: 'Paid', due: 'Feb 5, 2026', created: 'Jan 20, 2026' },
    { id: 'INV-1051', client: 'TechVentures BV', amount: '$8,200', status: 'Pending', due: 'Feb 12, 2026', created: 'Jan 25, 2026' },
    { id: 'INV-1050', client: 'Summit Analytics', amount: '$22,400', status: 'Paid', due: 'Feb 1, 2026', created: 'Jan 18, 2026' },
    { id: 'INV-1049', client: 'Meridian Health', amount: '$4,100', status: 'Overdue', due: 'Jan 28, 2026', created: 'Jan 10, 2026' },
    { id: 'INV-1048', client: 'DataBridge Corp', amount: '$6,900', status: 'Pending', due: 'Feb 18, 2026', created: 'Feb 1, 2026' },
    { id: 'INV-1047', client: 'NovaStar Inc.', amount: '$3,450', status: 'Draft', due: '-', created: 'Feb 4, 2026' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* ---- Page Header ---- */}
      <div data-demo="finance-header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Euro className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Finance</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">
              Revenue, invoices, and expense tracking for {companyName}.
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* ---- Top Stats ---- */}
      <div data-demo="finance-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
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
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Revenue vs Expenses Chart + P&L ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue vs Expenses dual bar chart */}
        <div
          data-demo="revenue-expense-chart"
          className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold">Revenue vs Expenses</h2>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600" />
                Expenses
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-5">Last 6 months</p>
          <div className="flex items-end justify-between gap-3 h-52">
            {revenueExpenseData.map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-1 h-44">
                  {/* Revenue bar */}
                  <div
                    className="flex-1 max-w-5 rounded-t-md bg-gradient-to-t from-amber-600/40 to-amber-400/80"
                    style={{ height: `${bar.revenue}%` }}
                  />
                  {/* Expense bar */}
                  <div
                    className="flex-1 max-w-5 rounded-t-md bg-gradient-to-t from-zinc-700/60 to-zinc-500/60"
                    style={{ height: `${bar.expense}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* P&L Summary */}
        <div
          data-demo="pnl-summary"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">P&L Summary</h2>
          <div className="space-y-0">
            {plItems.map((item, idx) => {
              const isSeparator = item.label === 'Gross Profit' || item.label === 'Operating Profit' || item.label === 'Net Income';
              return (
                <div key={item.label}>
                  {isSeparator && idx > 0 && <div className="border-t border-zinc-800 my-2" />}
                  <div
                    className={`flex items-center justify-between py-1.5 ${
                      item.indent ? 'pl-4' : ''
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        item.bold ? 'text-white font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      {item.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-mono ${
                          item.bold ? 'text-white font-semibold' : 'text-zinc-300'
                        }`}
                      >
                        {item.amount}
                      </span>
                      {item.pct && (
                        <span
                          className={`text-[10px] font-medium min-w-[40px] text-right ${
                            item.up === true
                              ? 'text-emerald-400'
                              : item.up === false
                              ? 'text-red-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {item.pct}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Invoices Table ---- */}
      <div
        data-demo="invoices"
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Invoices</h2>
          <span className="text-xs text-amber-400 cursor-default">View all</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Invoice</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Due Date</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      {inv.id}
                    </div>
                  </td>
                  <td className="py-3 text-white font-medium">{inv.client}</td>
                  <td className="py-3">
                    <span className="text-zinc-300 font-mono text-xs">{inv.amount}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[inv.status]}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{inv.due}</td>
                  <td className="py-3 text-zinc-500 text-xs">{inv.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- AP Aging + Upcoming Bills ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AP Aging */}
        <div
          data-demo="ap-aging"
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-5">Accounts Payable Aging</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {apAging.map((bucket) => (
              <div
                key={bucket.label}
                className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3 text-center"
              >
                <p className="text-xs text-zinc-500 mb-1">{bucket.label}</p>
                <p className="text-lg font-bold text-white">{bucket.amount}</p>
              </div>
            ))}
          </div>
          {/* Proportion bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex">
            {apAging.map((bucket) => (
              <div
                key={bucket.label}
                className={`h-full ${bucket.color}`}
                style={{ width: `${bucket.bar}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {apAging.map((bucket) => (
              <span key={bucket.label} className="text-[10px] text-zinc-500">
                {bucket.bar}%
              </span>
            ))}
          </div>
        </div>

        {/* Upcoming Bills */}
        <div
          data-demo="upcoming-bills"
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">Upcoming Bills</h2>
          <div className="space-y-3">
            {upcomingBills.map((bill) => (
              <div
                key={bill.vendor}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40"
              >
                <div
                  className={`p-2 rounded-lg ${
                    bill.urgent
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{bill.vendor}</p>
                  <p className="text-xs text-zinc-500">Due {bill.due}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white font-mono">{bill.amount}</p>
                  {bill.urgent && (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 mt-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Urgent
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
