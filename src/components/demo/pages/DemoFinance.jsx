import { motion } from 'framer-motion';
import {
  Euro, TrendingUp, TrendingDown, CreditCard, Receipt,
  PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Plus,
  Download, Calendar, FileText, ChevronRight,
  Wallet, Target, AlertCircle,
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const METRICS = {
  totalRevenue: 124500,
  totalExpenses: 67200,
  pendingInvoices: 34200,
  monthlyRecurring: 18400,
  netIncome: 57300,
  profitMargin: 46.0,
  pendingCount: 8,
  activeSubscriptions: 12,
};

const EXPENSE_CATEGORIES = [
  { name: 'software', amount: 18400 },
  { name: 'marketing', amount: 14200 },
  { name: 'salary', amount: 12800 },
  { name: 'travel', amount: 8600 },
  { name: 'office', amount: 5200 },
];

const RECENT_TRANSACTIONS = [
  { id: 1, type: 'invoice', client_name: 'TechVentures Inc.', total: 8400, date: '2026-02-08', status: 'paid' },
  { id: 2, type: 'expense', description: 'AWS Cloud Services', amount: 2340, date: '2026-02-07', category: 'software' },
  { id: 3, type: 'invoice', client_name: 'Summit Analytics', total: 12500, date: '2026-02-06', status: 'pending' },
  { id: 4, type: 'expense', description: 'Google Ads Campaign', amount: 3800, date: '2026-02-05', category: 'marketing' },
  { id: 5, type: 'invoice', client_name: 'Pinnacle Group', total: 55000, date: '2026-02-04', status: 'paid' },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function DemoFinance({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

  const getCategoryColor = (category) => {
    const colors = {
      software: 'bg-blue-500',
      marketing: 'bg-blue-400',
      salary: 'bg-blue-600',
      travel: 'bg-blue-500',
      office: 'bg-blue-500',
    };
    return colors[category] || 'bg-zinc-500';
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15">
              <Euro className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Finance Overview</h1>
              <p className="text-xs text-zinc-400">Track revenue, expenses, and financial health</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors cursor-default">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* ── Key Metrics Grid ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: 'Total Revenue', value: `€${METRICS.totalRevenue.toLocaleString()}`, change: '+12.5%', trend: 'up', icon: Euro },
            { title: 'Total Expenses', value: `€${METRICS.totalExpenses.toLocaleString()}`, change: '-3.2%', trend: 'down', icon: CreditCard },
            { title: 'Pending Invoices', value: `€${METRICS.pendingInvoices.toLocaleString()}`, change: `${METRICS.pendingCount} invoices`, trend: 'neutral', icon: Receipt },
            { title: 'Monthly Recurring', value: `€${METRICS.monthlyRecurring.toLocaleString()}`, change: `${METRICS.activeSubscriptions} active`, trend: 'up', icon: TrendingUp },
          ].map((metric, i) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.07 }}
            >
              <div className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <metric.icon className="w-4 h-4" />
                  </div>
                  {metric.trend === 'up' && (
                    <span className="text-[10px] px-1.5 py-px rounded-md text-blue-400 border border-blue-500/30 bg-blue-500/10 flex items-center gap-0.5">
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      {metric.change}
                    </span>
                  )}
                  {metric.trend === 'down' && (
                    <span className="text-[10px] px-1.5 py-px rounded-md text-blue-400 border border-blue-500/30 bg-blue-500/10 flex items-center gap-0.5">
                      <ArrowDownRight className="w-2.5 h-2.5" />
                      {metric.change}
                    </span>
                  )}
                  {metric.trend === 'neutral' && (
                    <span className="text-[10px] px-1.5 py-px rounded-md text-zinc-400 border border-zinc-500/30">
                      {metric.change}
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-white">{metric.value}</p>
                <p className="text-xs text-zinc-500">{metric.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Profit Overview Banner ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gradient-to-r from-blue-950/30 to-blue-950/30 border border-blue-500/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-xs mb-0.5">Net Income</p>
              <p className="text-xl font-bold text-white">
                +€{METRICS.netIncome.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-xs mb-0.5">Profit Margin</p>
              <p className="text-lg font-bold text-white">
                {METRICS.profitMargin}%
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${METRICS.profitMargin}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* ── Content Grid: Expense Breakdown + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Expense Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl lg:col-span-1"
          >
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-400" />
                Expense Breakdown
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">By category</p>
            </div>
            <div className="p-4 space-y-3">
              {EXPENSE_CATEGORIES.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(cat.name)}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300 capitalize">{cat.name}</span>
                      <span className="text-white font-medium">€{cat.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 mt-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(cat.amount / METRICS.totalExpenses) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button className="w-full mt-4 text-blue-400 hover:bg-blue-500/10 text-sm py-2 rounded-lg transition-colors cursor-default flex items-center justify-center gap-1">
                View All Expenses
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl lg:col-span-2"
          >
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-400" />
                Recent Transactions
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Latest financial activity</p>
            </div>
            <div className="p-4 space-y-3">
              {RECENT_TRANSACTIONS.map((tx) => (
                <div
                  key={`${tx.type}-${tx.id}`}
                  className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      {tx.type === 'invoice' ? (
                        <FileText className="w-4 h-4 text-blue-400" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tx.type === 'invoice' ? tx.client_name : tx.description}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-white">
                    {tx.type === 'invoice' ? '+' : '-'}€{(tx.total || tx.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Receipt, label: 'Invoices', desc: '24 total', path: 'invoices' },
            { icon: CreditCard, label: 'Expenses', desc: '156 recorded', path: 'expenses' },
            { icon: Euro, label: 'Subscriptions', desc: `${METRICS.activeSubscriptions} active`, path: 'subscriptions' },
          ].map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/30 transition-colors cursor-default rounded-xl group"
            >
              <div className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <action.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{action.label}</h3>
                  <p className="text-sm text-zinc-500">{action.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
