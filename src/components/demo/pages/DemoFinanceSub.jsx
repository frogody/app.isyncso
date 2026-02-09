import {
  FileText,
  Plus,
  MoreHorizontal,
  Download,
  Eye,
  Send,
  Receipt,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  PieChart,
  BookOpen,
  Percent,
  Filter,
  Paperclip,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Wallet,
  ArrowDownRight,
  Building2,
  Mail,
  Layers,
  FolderTree,
  RefreshCw,
  Repeat,
  Search,
  Banknote,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const statusStyles = {
  Paid: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
  Overdue: 'bg-red-500/15 text-red-400',
  Draft: 'bg-zinc-700/50 text-zinc-400',
  Approved: 'bg-emerald-500/15 text-emerald-400',
  Rejected: 'bg-red-500/15 text-red-400',
  Sent: 'bg-blue-500/15 text-blue-400',
  Viewed: 'bg-purple-500/15 text-purple-400',
  Accepted: 'bg-emerald-500/15 text-emerald-400',
  Declined: 'bg-red-500/15 text-red-400',
};

/* ================================================================== */
/*  1. DemoFinanceInvoices                                             */
/* ================================================================== */

export function DemoFinanceInvoices({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Total Invoices', value: '124', icon: FileText },
    { label: 'Paid', value: '$287K', icon: CheckCircle2 },
    { label: 'Outstanding', value: '$34.2K', icon: Clock },
    { label: 'Overdue', value: '3', icon: AlertTriangle },
  ];

  const tabs = ['All', 'Paid', 'Pending', 'Overdue', 'Draft'];

  const invoices = [
    { id: 'INV-1052', client: companyName, amount: '$14,800', status: 'Paid', due: 'Feb 5, 2026', created: 'Jan 20, 2026' },
    { id: 'INV-1051', client: 'TechVentures BV', amount: '$8,200', status: 'Pending', due: 'Feb 12, 2026', created: 'Jan 25, 2026' },
    { id: 'INV-1050', client: 'Summit Analytics', amount: '$22,400', status: 'Paid', due: 'Feb 1, 2026', created: 'Jan 18, 2026' },
    { id: 'INV-1049', client: 'Meridian Health', amount: '$4,100', status: 'Overdue', due: 'Jan 28, 2026', created: 'Jan 10, 2026' },
    { id: 'INV-1048', client: 'DataBridge Corp', amount: '$6,900', status: 'Pending', due: 'Feb 18, 2026', created: 'Feb 1, 2026' },
    { id: 'INV-1047', client: 'NovaStar Inc.', amount: '$3,450', status: 'Draft', due: '-', created: 'Feb 4, 2026' },
    { id: 'INV-1046', client: 'Horizon Dynamics', amount: '$18,300', status: 'Paid', due: 'Jan 22, 2026', created: 'Jan 8, 2026' },
    { id: 'INV-1045', client: 'Vertex Solutions', amount: '$11,750', status: 'Overdue', due: 'Jan 15, 2026', created: 'Dec 28, 2025' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Invoices</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Manage and track all invoices for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-default border-b-2 ${
              i === 0
                ? 'text-amber-400 border-amber-400'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="overflow-x-auto" data-demo="invoices-list">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Invoice #</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Due Date</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium">Actions</th>
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
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{inv.due}</td>
                  <td className="py-3 text-zinc-500 text-xs">{inv.created}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  2. DemoFinanceProposals                                            */
/* ================================================================== */

export function DemoFinanceProposals({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Active Proposals', value: '8', icon: FileText },
    { label: 'Pending Approval', value: '3', icon: Clock },
    { label: 'Accepted This Month', value: '5', sub: '$142K', icon: CheckCircle2 },
    { label: 'Win Rate', value: '68%', icon: TrendingUp },
  ];

  const proposals = [
    { title: 'Enterprise SaaS Platform Build', client: companyName, amount: '$48,000', status: 'Accepted', created: 'Jan 15, 2026', expires: 'Feb 15, 2026' },
    { title: 'Brand Identity Redesign', client: 'TechVentures BV', amount: '$12,500', status: 'Sent', created: 'Jan 28, 2026', expires: 'Feb 28, 2026' },
    { title: 'Mobile App Development', client: 'Summit Analytics', amount: '$62,000', status: 'Viewed', created: 'Feb 1, 2026', expires: 'Mar 1, 2026' },
    { title: 'Data Pipeline Infrastructure', client: 'DataBridge Corp', amount: '$35,000', status: 'Draft', created: 'Feb 4, 2026', expires: '-' },
    { title: 'Marketing Automation Setup', client: 'Horizon Dynamics', amount: '$18,500', status: 'Declined', created: 'Jan 10, 2026', expires: 'Feb 10, 2026' },
    { title: 'Cloud Migration Strategy', client: 'Vertex Solutions', amount: '$27,000', status: 'Sent', created: 'Feb 3, 2026', expires: 'Mar 3, 2026' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Send className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Proposals</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Create and manage client proposals.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          New Proposal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              {stat.sub && <span className="text-sm text-amber-400 font-medium mb-0.5">{stat.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Proposal cards */}
      <div data-demo="proposals-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proposals.map((prop) => (
          <div key={prop.title} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <h3 className="text-white font-semibold text-sm leading-tight flex-1 mr-2">{prop.title}</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusStyles[prop.status]}`}>
                {prop.status}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs">Client</span>
                <span className="text-zinc-300 text-sm font-medium">{prop.client}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs">Amount</span>
                <span className="text-white text-sm font-mono font-semibold">{prop.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs">Created</span>
                <span className="text-zinc-400 text-xs">{prop.created}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-xs">Expires</span>
                <span className="text-zinc-400 text-xs">{prop.expires}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button className="flex-1 text-xs text-center py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 cursor-default transition-colors">
                View
              </button>
              <button className="flex-1 text-xs text-center py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 cursor-default transition-colors">
                Edit
              </button>
              <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  3. DemoFinanceExpenses                                              */
/* ================================================================== */

export function DemoFinanceExpenses({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const budgetUsed = 23100;
  const budgetTotal = 30000;
  const budgetPct = Math.round((budgetUsed / budgetTotal) * 100);

  const categories = [
    { name: 'Marketing', amount: '$6,200', pct: 27, color: 'bg-amber-500' },
    { name: 'Software', amount: '$4,800', pct: 21, color: 'bg-blue-500' },
    { name: 'Office', amount: '$3,200', pct: 14, color: 'bg-emerald-500' },
    { name: 'Travel', amount: '$2,100', pct: 9, color: 'bg-purple-500' },
    { name: 'Other', amount: '$6,800', pct: 29, color: 'bg-zinc-500' },
  ];

  const expenses = [
    { date: 'Feb 5, 2026', description: 'Google Ads Campaign', category: 'Marketing', amount: '$2,400', status: 'Approved', receipt: true },
    { date: 'Feb 4, 2026', description: 'Figma Enterprise License', category: 'Software', amount: '$1,180', status: 'Approved', receipt: true },
    { date: 'Feb 3, 2026', description: 'Team Lunch - Client Meeting', category: 'Other', amount: '$320', status: 'Pending', receipt: true },
    { date: 'Feb 2, 2026', description: 'AWS Monthly Charges', category: 'Software', amount: '$3,240', status: 'Approved', receipt: false },
    { date: 'Feb 1, 2026', description: 'Office Supplies', category: 'Office', amount: '$185', status: 'Approved', receipt: true },
    { date: 'Jan 30, 2026', description: 'Flight to Amsterdam', category: 'Travel', amount: '$890', status: 'Approved', receipt: true },
    { date: 'Jan 28, 2026', description: 'LinkedIn Premium Ads', category: 'Marketing', amount: '$1,600', status: 'Rejected', receipt: true },
    { date: 'Jan 27, 2026', description: 'Co-working Day Pass', category: 'Office', amount: '$45', status: 'Pending', receipt: false },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Receipt className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Expenses</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Track and categorize business expenses.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Log Expense
        </button>
      </div>

      {/* Budget progress + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Monthly budget */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Monthly Budget</h2>
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="text-3xl font-bold text-white">${(budgetUsed / 1000).toFixed(1)}K</span>
              <span className="text-zinc-500 text-sm ml-1">of ${(budgetTotal / 1000).toFixed(0)}K</span>
            </div>
            <span className="text-amber-400 text-sm font-semibold">{budgetPct}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: `${budgetPct}%` }} />
          </div>
          <p className="text-xs text-zinc-500 mt-2">${((budgetTotal - budgetUsed) / 1000).toFixed(1)}K remaining this month</p>
        </div>

        {/* Category breakdown */}
        <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Category Breakdown</h2>
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm w-20 shrink-0">{cat.name}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                </div>
                <span className="text-white text-sm font-mono w-16 text-right">{cat.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expense table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Expenses</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
              <Filter className="w-3 h-3" />
              Filter
            </button>
          </div>
        </div>
        <div className="overflow-x-auto" data-demo="expenses-list">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {expenses.map((exp, i) => (
                <tr key={i} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 text-zinc-500 text-xs">{exp.date}</td>
                  <td className="py-3 text-white font-medium">{exp.description}</td>
                  <td className="py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{exp.category}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-zinc-300 font-mono text-xs">{exp.amount}</span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[exp.status]}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {exp.receipt ? (
                      <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <span className="text-xs text-zinc-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  4. DemoFinanceLedger                                               */
/* ================================================================== */

export function DemoFinanceLedger({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const summary = [
    { label: 'Total Assets', value: '$542K', color: 'text-emerald-400' },
    { label: 'Total Liabilities', value: '$187K', color: 'text-red-400' },
    { label: 'Net Worth', value: '$355K', color: 'text-amber-400' },
  ];

  const accountCategories = [
    {
      name: 'Assets',
      expanded: true,
      accounts: [
        { number: '1000', name: 'Cash & Bank', type: 'Current Asset', balance: '$128,400' },
        { number: '1100', name: 'Accounts Receivable', type: 'Current Asset', balance: '$34,200' },
        { number: '1200', name: 'Inventory', type: 'Current Asset', balance: '$42,800' },
        { number: '1500', name: 'Equipment', type: 'Fixed Asset', balance: '$186,600' },
        { number: '1600', name: 'Prepaid Expenses', type: 'Current Asset', balance: '$12,000' },
      ],
    },
    {
      name: 'Liabilities',
      expanded: true,
      accounts: [
        { number: '2000', name: 'Accounts Payable', type: 'Current Liability', balance: '$34,200' },
        { number: '2100', name: 'Credit Card Payable', type: 'Current Liability', balance: '$8,600' },
        { number: '2200', name: 'Tax Payable', type: 'Current Liability', balance: '$14,200' },
        { number: '2500', name: 'Long-term Loan', type: 'Long-term Liability', balance: '$130,000' },
      ],
    },
    {
      name: 'Equity',
      expanded: false,
      accounts: [
        { number: '3000', name: 'Owner\'s Equity', type: 'Equity', balance: '$250,000' },
        { number: '3100', name: 'Retained Earnings', type: 'Equity', balance: '$105,000' },
      ],
    },
    {
      name: 'Revenue',
      expanded: false,
      accounts: [
        { number: '4000', name: 'Service Revenue', type: 'Income', balance: '$687,400' },
        { number: '4100', name: 'Product Sales', type: 'Income', balance: '$142,800' },
      ],
    },
    {
      name: 'Expenses',
      expanded: false,
      accounts: [
        { number: '5000', name: 'Salaries & Wages', type: 'Operating', balance: '$342,000' },
        { number: '5100', name: 'Marketing', type: 'Operating', balance: '$68,400' },
        { number: '5200', name: 'Rent & Utilities', type: 'Operating', balance: '$96,000' },
      ],
    },
  ];

  const journalEntries = [
    { date: 'Feb 5, 2026', description: 'Client Payment - INV-1052', debit: '$14,800', credit: '-', account: 'Cash & Bank', ref: 'JE-2041' },
    { date: 'Feb 4, 2026', description: 'Software Subscription', debit: '-', credit: '$1,180', account: 'Cash & Bank', ref: 'JE-2040' },
    { date: 'Feb 3, 2026', description: 'Invoice Issued - INV-1048', debit: '$6,900', credit: '-', account: 'Accounts Receivable', ref: 'JE-2039' },
    { date: 'Feb 2, 2026', description: 'Salary Payment', debit: '-', credit: '$28,500', account: 'Cash & Bank', ref: 'JE-2038' },
    { date: 'Feb 1, 2026', description: 'Office Supplies Purchase', debit: '-', credit: '$185', account: 'Cash & Bank', ref: 'JE-2037' },
    { date: 'Jan 31, 2026', description: 'Monthly Depreciation', debit: '-', credit: '$3,100', account: 'Equipment', ref: 'JE-2036' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20">
          <BookOpen className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">General Ledger</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">Chart of accounts and journal entries for {companyName}.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.map((item) => (
          <div key={item.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 text-center">
            <p className="text-zinc-500 text-sm mb-1">{item.label}</p>
            <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Chart of accounts */}
      <div data-demo="ledger" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Chart of Accounts</h2>
        <div className="space-y-2">
          {accountCategories.map((cat) => (
            <div key={cat.name} className="border border-zinc-800/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/30 cursor-default">
                {cat.expanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <span className="text-white font-semibold text-sm">{cat.name}</span>
                <span className="text-zinc-500 text-xs ml-auto">{cat.accounts.length} accounts</span>
              </div>
              {cat.expanded && (
                <div className="divide-y divide-zinc-800/30">
                  {cat.accounts.map((acc) => (
                    <div key={acc.number} className="flex items-center px-4 py-2.5 pl-10 hover:bg-zinc-800/20 transition-colors">
                      <span className="text-zinc-500 text-xs font-mono w-14">{acc.number}</span>
                      <span className="text-zinc-300 text-sm flex-1">{acc.name}</span>
                      <span className="text-zinc-500 text-xs w-32">{acc.type}</span>
                      <span className="text-white text-sm font-mono w-28 text-right">{acc.balance}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent journal entries */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Recent Journal Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Debit</th>
                <th className="pb-3 font-medium">Credit</th>
                <th className="pb-3 font-medium">Account</th>
                <th className="pb-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {journalEntries.map((entry, i) => (
                <tr key={i} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 text-zinc-500 text-xs">{entry.date}</td>
                  <td className="py-3 text-white font-medium">{entry.description}</td>
                  <td className="py-3">
                    <span className={`font-mono text-xs ${entry.debit !== '-' ? 'text-emerald-400' : 'text-zinc-600'}`}>{entry.debit}</span>
                  </td>
                  <td className="py-3">
                    <span className={`font-mono text-xs ${entry.credit !== '-' ? 'text-red-400' : 'text-zinc-600'}`}>{entry.credit}</span>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">{entry.account}</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">{entry.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  5. DemoFinancePayables                                             */
/* ================================================================== */

export function DemoFinancePayables({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const apAging = [
    { label: 'Current', amount: '$14,200', bar: 42, color: 'bg-emerald-500' },
    { label: '1-30 days', amount: '$9,800', bar: 29, color: 'bg-amber-400' },
    { label: '31-60 days', amount: '$6,100', bar: 18, color: 'bg-orange-500' },
    { label: '60+ days', amount: '$4,100', bar: 11, color: 'bg-red-500' },
  ];

  const vendors = [
    { name: 'AWS Cloud Services', outstanding: '$12,480', oldest: 'Jan 15, 2026', terms: 'Net 30', status: 'Current' },
    { name: 'WeWork Offices', outstanding: '$8,500', oldest: 'Feb 1, 2026', terms: 'Net 15', status: 'Current' },
    { name: 'Figma Enterprise', outstanding: '$4,720', oldest: 'Jan 28, 2026', terms: 'Net 30', status: 'Current' },
    { name: 'HubSpot CRM', outstanding: '$2,400', oldest: 'Dec 15, 2025', terms: 'Net 45', status: 'Overdue' },
    { name: 'Slack Business+', outstanding: '$1,860', oldest: 'Jan 22, 2026', terms: 'Net 30', status: 'Current' },
    { name: 'Adobe Creative Cloud', outstanding: '$3,200', oldest: 'Nov 30, 2025', terms: 'Net 30', status: 'Overdue' },
    { name: 'Notion Enterprise', outstanding: '$960', oldest: 'Feb 3, 2026', terms: 'Net 30', status: 'Current' },
    { name: 'Vercel Pro Plan', outstanding: '$780', oldest: 'Jan 20, 2026', terms: 'Net 30', status: 'Pending' },
  ];

  const paymentSchedule = [
    { vendor: 'WeWork Offices', amount: '$8,500', due: 'Feb 15, 2026', priority: 'high' },
    { vendor: 'Figma Enterprise', amount: '$4,720', due: 'Feb 28, 2026', priority: 'normal' },
    { vendor: 'Slack Business+', amount: '$1,860', due: 'Feb 22, 2026', priority: 'normal' },
    { vendor: 'Notion Enterprise', amount: '$960', due: 'Mar 3, 2026', priority: 'low' },
    { vendor: 'AWS Cloud Services', amount: '$12,480', due: 'Feb 15, 2026', priority: 'high' },
  ];

  const vendorStatus = {
    Current: 'bg-emerald-500/15 text-emerald-400',
    Overdue: 'bg-red-500/15 text-red-400',
    Pending: 'bg-amber-500/15 text-amber-400',
  };

  const priorityStyles = {
    high: 'text-red-400',
    normal: 'text-amber-400',
    low: 'text-zinc-500',
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <CreditCard className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Accounts Payable</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Vendor payments and aging analysis.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* AP Aging chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-5">AP Aging Analysis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {apAging.map((bucket) => (
            <div key={bucket.label} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">{bucket.label}</p>
              <p className="text-xl font-bold text-white">{bucket.amount}</p>
              <p className="text-xs text-zinc-500 mt-1">{bucket.bar}% of total</p>
            </div>
          ))}
        </div>
        <div className="w-full h-4 rounded-full overflow-hidden flex">
          {apAging.map((bucket) => (
            <div key={bucket.label} className={`h-full ${bucket.color}`} style={{ width: `${bucket.bar}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          {apAging.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${bucket.color}`} />
              <span className="text-[10px] text-zinc-500">{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor list + Payment schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor list */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Vendors</h2>
          <div className="overflow-x-auto" data-demo="payables-list">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 font-medium">Vendor Name</th>
                  <th className="pb-3 font-medium">Outstanding</th>
                  <th className="pb-3 font-medium">Oldest Invoice</th>
                  <th className="pb-3 font-medium">Terms</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {vendors.map((v) => (
                  <tr key={v.name} className="text-sm hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 text-white font-medium">{v.name}</td>
                    <td className="py-3">
                      <span className="text-zinc-300 font-mono text-xs">{v.outstanding}</span>
                    </td>
                    <td className="py-3 text-zinc-500 text-xs">{v.oldest}</td>
                    <td className="py-3 text-zinc-500 text-xs">{v.terms}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${vendorStatus[v.status]}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment schedule */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Payment Schedule</h2>
          <div className="space-y-3">
            {paymentSchedule.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                <div className={`p-2 rounded-lg ${p.priority === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{p.vendor}</p>
                  <p className="text-xs text-zinc-500">Due {p.due}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white font-mono">{p.amount}</p>
                  <span className={`text-[10px] font-medium capitalize ${priorityStyles[p.priority]}`}>{p.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  6. DemoFinanceReports                                              */
/* ================================================================== */

export function DemoFinanceReports({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const reports = [
    { name: 'P&L Statement', icon: BarChart3, lastGenerated: 'Feb 5, 2026', status: 'Ready' },
    { name: 'Balance Sheet', icon: BookOpen, lastGenerated: 'Feb 5, 2026', status: 'Ready' },
    { name: 'Cash Flow', icon: TrendingUp, lastGenerated: 'Feb 3, 2026', status: 'Ready' },
    { name: 'AR Aging', icon: Clock, lastGenerated: 'Feb 4, 2026', status: 'Ready' },
    { name: 'Tax Summary', icon: Percent, lastGenerated: 'Jan 31, 2026', status: 'Outdated' },
    { name: 'Budget vs Actual', icon: PieChart, lastGenerated: 'Feb 1, 2026', status: 'Ready' },
  ];

  const reportStatusStyle = {
    Ready: 'bg-emerald-500/15 text-emerald-400',
    Outdated: 'bg-amber-500/15 text-amber-400',
    Generating: 'bg-blue-500/15 text-blue-400',
  };

  const margins = [
    { label: 'Gross Margin', value: '85.6%', trend: '+2.1%', up: true },
    { label: 'Operating Margin', value: '62.3%', trend: '+4.8%', up: true },
    { label: 'Net Margin', value: '51.8%', trend: '+3.2%', up: true },
  ];

  const plMonthly = [
    { month: 'Sep', revenue: 58, expenses: 22, profit: 36 },
    { month: 'Oct', revenue: 72, expenses: 28, profit: 44 },
    { month: 'Nov', revenue: 65, expenses: 24, profit: 41 },
    { month: 'Dec', revenue: 80, expenses: 31, profit: 49 },
    { month: 'Jan', revenue: 74, expenses: 27, profit: 47 },
    { month: 'Feb', revenue: 87, expenses: 23, profit: 64 },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <BarChart3 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Financial Reports</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Generate and download financial reports.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Key margins */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {margins.map((m) => (
          <div key={m.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-zinc-400 text-sm font-medium">{m.label}</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{m.value}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                {m.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Report cards grid */}
      <div data-demo="reports-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div key={report.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{report.name}</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Last: {report.lastGenerated}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${reportStatusStyle[report.status]}`}>
                  {report.status}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button className="flex items-center gap-1.5 flex-1 text-xs text-center justify-center py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 cursor-default transition-colors">
                  <Eye className="w-3 h-3" />
                  View
                </button>
                <button className="flex items-center gap-1.5 flex-1 text-xs text-center justify-center py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 cursor-default transition-colors">
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly P&L visualization */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold">Monthly P&L Overview</h2>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-zinc-600" />
              Expenses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Profit
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-5">Last 6 months ($K)</p>
        <div className="flex items-end justify-between gap-4 h-56">
          {plMonthly.map((bar) => (
            <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-0.5 h-48">
                <div
                  className="flex-1 max-w-4 rounded-t-md bg-gradient-to-t from-amber-600/40 to-amber-400/80"
                  style={{ height: `${bar.revenue}%` }}
                />
                <div
                  className="flex-1 max-w-4 rounded-t-md bg-gradient-to-t from-zinc-700/60 to-zinc-500/60"
                  style={{ height: `${bar.expenses}%` }}
                />
                <div
                  className="flex-1 max-w-4 rounded-t-md bg-gradient-to-t from-emerald-700/40 to-emerald-400/80"
                  style={{ height: `${bar.profit}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1">{bar.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  7. DemoFinanceOverview                                              */
/* ================================================================== */

export function DemoFinanceOverview({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const kpis = [
    { label: 'Revenue', value: '$842K', trend: '+12.3%', up: true, icon: DollarSign },
    { label: 'Expenses', value: '$298K', trend: '+4.1%', up: true, icon: Receipt },
    { label: 'Profit Margin', value: '64.6%', trend: '+3.8%', up: true, icon: TrendingUp },
    { label: 'Runway', value: '18 mo', trend: '+2 mo', up: true, icon: Clock },
  ];

  const revenueMonths = [
    { month: 'Sep', value: 58 },
    { month: 'Oct', value: 72 },
    { month: 'Nov', value: 65 },
    { month: 'Dec', value: 80 },
    { month: 'Jan', value: 74 },
    { month: 'Feb', value: 87 },
  ];

  const expenseBreakdown = [
    { name: 'Payroll', amount: '$142,000', pct: 48, color: 'bg-amber-500' },
    { name: 'Software & Tools', amount: '$38,400', pct: 13, color: 'bg-blue-500' },
    { name: 'Marketing', amount: '$34,200', pct: 11, color: 'bg-purple-500' },
    { name: 'Office & Rent', amount: '$28,800', pct: 10, color: 'bg-emerald-500' },
    { name: 'Travel', amount: '$18,600', pct: 6, color: 'bg-orange-500' },
    { name: 'Other', amount: '$36,000', pct: 12, color: 'bg-zinc-500' },
  ];

  const cashFlow = [
    { month: 'Sep', inflow: 62, outflow: 24 },
    { month: 'Oct', inflow: 78, outflow: 30 },
    { month: 'Nov', inflow: 70, outflow: 26 },
    { month: 'Dec', inflow: 85, outflow: 33 },
    { month: 'Jan', inflow: 79, outflow: 29 },
    { month: 'Feb', inflow: 92, outflow: 25 },
  ];

  const recentTransactions = [
    { date: 'Feb 7, 2026', description: 'Client Payment - Summit Analytics', amount: '+$22,400', type: 'income' },
    { date: 'Feb 6, 2026', description: 'AWS Monthly Charges', amount: '-$3,240', type: 'expense' },
    { date: 'Feb 5, 2026', description: 'Client Payment - INV-1052', amount: '+$14,800', type: 'income' },
    { date: 'Feb 4, 2026', description: 'Figma Enterprise License', amount: '-$1,180', type: 'expense' },
    { date: 'Feb 3, 2026', description: 'Salary Payment - January', amount: '-$28,500', type: 'expense' },
    { date: 'Feb 2, 2026', description: 'Client Payment - Horizon Dynamics', amount: '+$18,300', type: 'income' },
    { date: 'Feb 1, 2026', description: 'Office Supplies', amount: '-$185', type: 'expense' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20">
          <Wallet className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Finance Overview</h1>
          <p className="text-zinc-400 mt-0.5 text-sm">Financial summary and key metrics for {companyName}.</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{kpi.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{kpi.value}</span>
              <span className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold">Revenue Trend</h2>
            <span className="text-xs text-zinc-500">Last 6 months ($K)</span>
          </div>
          <div className="flex items-end justify-between gap-4 h-48 mt-4">
            {revenueMonths.map((bar) => (
              <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center h-40">
                  <div
                    className="flex-1 max-w-8 rounded-t-md bg-gradient-to-t from-amber-600/40 to-amber-400/80"
                    style={{ height: `${bar.value}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Expense Breakdown</h2>
          <div className="space-y-3">
            {expenseBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-zinc-400 text-sm w-24 shrink-0 truncate">{cat.name}</span>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                </div>
                <span className="text-white text-xs font-mono w-20 text-right">{cat.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold">Cash Flow</h2>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Inflow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              Outflow
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-5">Last 6 months ($K)</p>
        <div className="flex items-end justify-between gap-4 h-40">
          {cashFlow.map((bar) => (
            <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-1 h-32">
                <div
                  className="flex-1 max-w-4 rounded-t-md bg-gradient-to-t from-emerald-700/40 to-emerald-400/80"
                  style={{ height: `${bar.inflow}%` }}
                />
                <div
                  className="flex-1 max-w-4 rounded-t-md bg-gradient-to-t from-red-700/40 to-red-400/80"
                  style={{ height: `${bar.outflow}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1">{bar.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto" data-demo="finance-overview-transactions">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recentTransactions.map((tx, i) => (
                <tr key={i} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 text-zinc-500 text-xs">{tx.date}</td>
                  <td className="py-3 text-white font-medium">{tx.description}</td>
                  <td className="py-3">
                    <span className={`font-mono text-xs font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  8. DemoFinanceAccounts                                              */
/* ================================================================== */

export function DemoFinanceAccounts({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const accountCategories = [
    {
      name: 'Assets',
      icon: Wallet,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      expanded: true,
      accounts: [
        { number: '1000', name: 'Cash & Cash Equivalents', type: 'Current Asset', balance: '$128,400', active: true },
        { number: '1010', name: 'Petty Cash', type: 'Current Asset', balance: '$2,500', active: true },
        { number: '1100', name: 'Accounts Receivable', type: 'Current Asset', balance: '$34,200', active: true },
        { number: '1200', name: 'Inventory', type: 'Current Asset', balance: '$42,800', active: true },
        { number: '1300', name: 'Prepaid Expenses', type: 'Current Asset', balance: '$12,000', active: true },
        { number: '1500', name: 'Equipment', type: 'Fixed Asset', balance: '$186,600', active: true },
        { number: '1510', name: 'Accumulated Depreciation', type: 'Contra Asset', balance: '-$34,200', active: true },
        { number: '1600', name: 'Intangible Assets', type: 'Fixed Asset', balance: '$45,000', active: false },
      ],
    },
    {
      name: 'Liabilities',
      icon: CreditCard,
      color: 'text-red-400',
      bgColor: 'bg-red-500/15',
      expanded: true,
      accounts: [
        { number: '2000', name: 'Accounts Payable', type: 'Current Liability', balance: '$34,200', active: true },
        { number: '2100', name: 'Credit Card Payable', type: 'Current Liability', balance: '$8,600', active: true },
        { number: '2200', name: 'Payroll Liabilities', type: 'Current Liability', balance: '$22,400', active: true },
        { number: '2300', name: 'Sales Tax Payable', type: 'Current Liability', balance: '$14,200', active: true },
        { number: '2500', name: 'Long-term Loan', type: 'Long-term Liability', balance: '$130,000', active: true },
        { number: '2600', name: 'Deferred Revenue', type: 'Current Liability', balance: '$18,500', active: true },
      ],
    },
    {
      name: 'Equity',
      icon: PieChart,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      expanded: false,
      accounts: [
        { number: '3000', name: "Owner's Equity", type: 'Equity', balance: '$250,000', active: true },
        { number: '3100', name: 'Retained Earnings', type: 'Equity', balance: '$105,000', active: true },
        { number: '3200', name: 'Dividends', type: 'Equity', balance: '$20,000', active: true },
      ],
    },
    {
      name: 'Revenue',
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      expanded: false,
      accounts: [
        { number: '4000', name: 'Service Revenue', type: 'Operating Revenue', balance: '$687,400', active: true },
        { number: '4100', name: 'Product Sales', type: 'Operating Revenue', balance: '$142,800', active: true },
        { number: '4200', name: 'Consulting Revenue', type: 'Operating Revenue', balance: '$84,200', active: true },
        { number: '4500', name: 'Interest Income', type: 'Non-Operating', balance: '$3,400', active: true },
      ],
    },
    {
      name: 'Expenses',
      icon: Receipt,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15',
      expanded: false,
      accounts: [
        { number: '5000', name: 'Salaries & Wages', type: 'Operating', balance: '$342,000', active: true },
        { number: '5100', name: 'Marketing & Advertising', type: 'Operating', balance: '$68,400', active: true },
        { number: '5200', name: 'Rent & Utilities', type: 'Operating', balance: '$96,000', active: true },
        { number: '5300', name: 'Software Subscriptions', type: 'Operating', balance: '$38,400', active: true },
        { number: '5400', name: 'Travel & Entertainment', type: 'Operating', balance: '$18,600', active: true },
        { number: '5500', name: 'Professional Services', type: 'Operating', balance: '$24,000', active: true },
        { number: '5600', name: 'Depreciation Expense', type: 'Non-Cash', balance: '$34,200', active: true },
      ],
    },
  ];

  const totalAccounts = accountCategories.reduce((sum, cat) => sum + cat.accounts.length, 0);
  const activeAccounts = accountCategories.reduce((sum, cat) => sum + cat.accounts.filter((a) => a.active).length, 0);

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <FolderTree className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Chart of Accounts</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Manage the account structure for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Total Accounts</span>
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white">{totalAccounts}</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Active Accounts</span>
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white">{activeAccounts}</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Categories</span>
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white">{accountCategories.length}</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Inactive</span>
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white">{totalAccounts - activeAccounts}</span>
        </div>
      </div>

      {/* Accounts tree */}
      <div data-demo="accounts-tree" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Account Categories</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
            <Filter className="w-3 h-3" />
            Filter
          </button>
        </div>
        <div className="space-y-2">
          {accountCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.name} className="border border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/30 cursor-default">
                  {cat.expanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                  <div className={`p-1.5 rounded-lg ${cat.bgColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                  </div>
                  <span className="text-white font-semibold text-sm">{cat.name}</span>
                  <span className="text-zinc-500 text-xs ml-auto">{cat.accounts.length} accounts</span>
                </div>
                {cat.expanded && (
                  <div className="divide-y divide-zinc-800/30">
                    {cat.accounts.map((acc) => (
                      <div key={acc.number} className="flex items-center px-4 py-2.5 pl-12 hover:bg-zinc-800/20 transition-colors">
                        <span className="text-zinc-500 text-xs font-mono w-14">{acc.number}</span>
                        <span className="text-zinc-300 text-sm flex-1">{acc.name}</span>
                        <span className="text-zinc-500 text-xs w-36">{acc.type}</span>
                        <span className={`text-sm font-mono w-28 text-right ${acc.balance.startsWith('-') ? 'text-red-400' : 'text-white'}`}>
                          {acc.balance}
                        </span>
                        <div className="w-16 text-right">
                          {acc.active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">Active</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-500 font-medium">Inactive</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  9. DemoFinanceVendors                                               */
/* ================================================================== */

export function DemoFinanceVendors({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Total Vendors', value: '42', icon: Building2 },
    { label: 'Active', value: '36', icon: CheckCircle2 },
    { label: 'Outstanding Balance', value: '$87.4K', icon: DollarSign },
    { label: 'Avg Payment Terms', value: 'Net 28', icon: Calendar },
  ];

  const vendors = [
    { name: 'AWS Cloud Services', contact: 'aws-billing@amazon.com', phone: '+1 (800) 555-0101', balance: '$12,480', terms: 'Net 30', status: 'Active', category: 'Software' },
    { name: 'WeWork Offices', contact: 'billing@wework.com', phone: '+31 20 555-0200', balance: '$8,500', terms: 'Net 15', status: 'Active', category: 'Office' },
    { name: 'Figma Enterprise', contact: 'enterprise@figma.com', phone: '+1 (800) 555-0302', balance: '$4,720', terms: 'Net 30', status: 'Active', category: 'Software' },
    { name: 'HubSpot CRM', contact: 'accounts@hubspot.com', phone: '+1 (800) 555-0403', balance: '$2,400', terms: 'Net 45', status: 'Overdue', category: 'Software' },
    { name: 'Slack Business+', contact: 'billing@slack.com', phone: '+1 (800) 555-0504', balance: '$1,860', terms: 'Net 30', status: 'Active', category: 'Software' },
    { name: 'Adobe Creative Cloud', contact: 'enterprise@adobe.com', phone: '+1 (800) 555-0605', balance: '$3,200', terms: 'Net 30', status: 'Overdue', category: 'Software' },
    { name: 'Notion Enterprise', contact: 'sales@notion.so', phone: '+1 (800) 555-0706', balance: '$960', terms: 'Net 30', status: 'Active', category: 'Software' },
    { name: 'Vercel Pro Plan', contact: 'billing@vercel.com', phone: '+1 (800) 555-0807', balance: '$780', terms: 'Net 30', status: 'Active', category: 'Software' },
    { name: 'Staples Office Supplies', contact: 'orders@staples.com', phone: '+1 (800) 555-0908', balance: '$1,245', terms: 'Net 60', status: 'Active', category: 'Office' },
    { name: 'KLM Corporate Travel', contact: 'corporate@klm.nl', phone: '+31 20 555-1009', balance: '$4,800', terms: 'Net 30', status: 'Pending', category: 'Travel' },
  ];

  const vendorStatusStyle = {
    Active: 'bg-emerald-500/15 text-emerald-400',
    Overdue: 'bg-red-500/15 text-red-400',
    Pending: 'bg-amber-500/15 text-amber-400',
    Inactive: 'bg-zinc-700/50 text-zinc-400',
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Vendors</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Manage vendor relationships and payment terms.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Vendor table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">All Vendors</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
              <Filter className="w-3 h-3" />
              Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto" data-demo="vendors-list">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Vendor Name</th>
                <th className="pb-3 font-medium">Contact</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Outstanding</th>
                <th className="pb-3 font-medium">Terms</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {vendors.map((v) => (
                <tr key={v.name} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-white font-medium">{v.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-400 text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {v.contact}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{v.category}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-zinc-300 font-mono text-xs">{v.balance}</span>
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{v.terms}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${vendorStatusStyle[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  10. DemoFinanceBills                                                */
/* ================================================================== */

export function DemoFinanceBills({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Total Bills', value: '67', icon: FileText },
    { label: 'Overdue Amount', value: '$18.4K', icon: AlertTriangle },
    { label: 'Paid This Month', value: '$42.8K', icon: CheckCircle2 },
    { label: 'Due This Week', value: '5', icon: Calendar },
  ];

  const tabs = ['All', 'Overdue', 'Pending', 'Paid'];

  const bills = [
    { id: 'BILL-0421', vendor: 'AWS Cloud Services', amount: '$3,240', due: 'Feb 15, 2026', received: 'Feb 1, 2026', status: 'Pending', category: 'Software' },
    { id: 'BILL-0420', vendor: 'WeWork Offices', amount: '$8,500', due: 'Feb 10, 2026', received: 'Jan 28, 2026', status: 'Overdue', category: 'Office' },
    { id: 'BILL-0419', vendor: 'Figma Enterprise', amount: '$1,180', due: 'Feb 28, 2026', received: 'Feb 4, 2026', status: 'Pending', category: 'Software' },
    { id: 'BILL-0418', vendor: 'HubSpot CRM', amount: '$2,400', due: 'Jan 28, 2026', received: 'Jan 12, 2026', status: 'Overdue', category: 'Software' },
    { id: 'BILL-0417', vendor: 'Staples Office Supplies', amount: '$485', due: 'Feb 20, 2026', received: 'Feb 5, 2026', status: 'Pending', category: 'Office' },
    { id: 'BILL-0416', vendor: 'Slack Business+', amount: '$1,860', due: 'Feb 1, 2026', received: 'Jan 15, 2026', status: 'Paid', category: 'Software' },
    { id: 'BILL-0415', vendor: 'Adobe Creative Cloud', amount: '$3,200', due: 'Jan 30, 2026', received: 'Jan 8, 2026', status: 'Overdue', category: 'Software' },
    { id: 'BILL-0414', vendor: 'KLM Corporate Travel', amount: '$4,800', due: 'Feb 12, 2026', received: 'Jan 30, 2026', status: 'Pending', category: 'Travel' },
    { id: 'BILL-0413', vendor: 'Notion Enterprise', amount: '$960', due: 'Jan 25, 2026', received: 'Jan 5, 2026', status: 'Paid', category: 'Software' },
    { id: 'BILL-0412', vendor: 'Vercel Pro Plan', amount: '$780', due: 'Jan 20, 2026', received: 'Jan 2, 2026', status: 'Paid', category: 'Software' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Bills</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Track incoming bills and due dates for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Add Bill
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-default border-b-2 ${
              i === 0
                ? 'text-amber-400 border-amber-400'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bills table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="overflow-x-auto" data-demo="bills-list">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Bill #</th>
                <th className="pb-3 font-medium">Vendor</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Due Date</th>
                <th className="pb-3 font-medium">Received</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {bills.map((bill) => (
                <tr key={bill.id} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      {bill.id}
                    </div>
                  </td>
                  <td className="py-3 text-white font-medium">{bill.vendor}</td>
                  <td className="py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{bill.category}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-zinc-300 font-mono text-xs">{bill.amount}</span>
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{bill.due}</td>
                  <td className="py-3 text-zinc-500 text-xs">{bill.received}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[bill.status]}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  11. DemoFinanceBillPayments                                        */
/* ================================================================== */

export function DemoFinanceBillPayments({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Total Payments', value: '189', icon: CreditCard },
    { label: 'Paid This Month', value: '$42.8K', icon: CheckCircle2 },
    { label: 'Scheduled', value: '8', icon: Calendar },
    { label: 'Avg Payment Time', value: '4.2 days', icon: Clock },
  ];

  const payments = [
    { date: 'Feb 5, 2026', vendor: 'Slack Business+', amount: '$1,860', method: 'Bank Transfer', reference: 'PAY-2041', status: 'Completed', bill: 'BILL-0416' },
    { date: 'Feb 4, 2026', vendor: 'Notion Enterprise', amount: '$960', method: 'Credit Card', reference: 'PAY-2040', status: 'Completed', bill: 'BILL-0413' },
    { date: 'Feb 3, 2026', vendor: 'Vercel Pro Plan', amount: '$780', method: 'Credit Card', reference: 'PAY-2039', status: 'Completed', bill: 'BILL-0412' },
    { date: 'Feb 2, 2026', vendor: 'AWS Cloud Services', amount: '$3,240', method: 'Bank Transfer', reference: 'PAY-2038', status: 'Completed', bill: 'BILL-0409' },
    { date: 'Feb 1, 2026', vendor: 'WeWork Offices', amount: '$8,500', method: 'Bank Transfer', reference: 'PAY-2037', status: 'Completed', bill: 'BILL-0408' },
    { date: 'Jan 30, 2026', vendor: 'Figma Enterprise', amount: '$1,180', method: 'Credit Card', reference: 'PAY-2036', status: 'Completed', bill: 'BILL-0407' },
    { date: 'Jan 28, 2026', vendor: 'Adobe Creative Cloud', amount: '$3,200', method: 'Bank Transfer', reference: 'PAY-2035', status: 'Completed', bill: 'BILL-0405' },
    { date: 'Jan 26, 2026', vendor: 'Staples Office Supplies', amount: '$285', method: 'Credit Card', reference: 'PAY-2034', status: 'Completed', bill: 'BILL-0403' },
  ];

  const scheduled = [
    { vendor: 'AWS Cloud Services', amount: '$3,240', scheduledDate: 'Feb 15, 2026', method: 'Bank Transfer' },
    { vendor: 'WeWork Offices', amount: '$8,500', scheduledDate: 'Feb 15, 2026', method: 'Bank Transfer' },
    { vendor: 'Figma Enterprise', amount: '$1,180', scheduledDate: 'Feb 28, 2026', method: 'Credit Card' },
    { vendor: 'KLM Corporate Travel', amount: '$4,800', scheduledDate: 'Feb 12, 2026', method: 'Bank Transfer' },
  ];

  const methodIcon = {
    'Bank Transfer': Banknote,
    'Credit Card': CreditCard,
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Banknote className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Bill Payments</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Payment history and scheduled payments.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Schedule Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Scheduled Payments + Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduled */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Scheduled Payments</h2>
          <div className="space-y-3">
            {scheduled.map((p, i) => {
              const MethodIcon = methodIcon[p.method] || CreditCard;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/40">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                    <MethodIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.vendor}</p>
                    <p className="text-xs text-zinc-500">{p.scheduledDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-mono">{p.amount}</p>
                    <span className="text-[10px] text-zinc-500">{p.method}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Payment History</h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
              <Download className="w-3 h-3" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto" data-demo="bill-payments-list">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Vendor</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Method</th>
                  <th className="pb-3 font-medium">Reference</th>
                  <th className="pb-3 font-medium">Bill</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {payments.map((p) => (
                  <tr key={p.reference} className="text-sm hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 text-zinc-500 text-xs">{p.date}</td>
                    <td className="py-3 text-white font-medium">{p.vendor}</td>
                    <td className="py-3">
                      <span className="text-zinc-300 font-mono text-xs">{p.amount}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{p.method}</span>
                    </td>
                    <td className="py-3 text-zinc-500 text-xs font-mono">{p.reference}</td>
                    <td className="py-3 text-zinc-500 text-xs font-mono">{p.bill}</td>
                    <td className="py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/15 text-emerald-400">
                        {p.status}
                      </span>
                    </td>
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

/* ================================================================== */
/*  12. DemoFinanceSubscriptions                                       */
/* ================================================================== */

export function DemoFinanceSubscriptions({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Active Subscriptions', value: '14', icon: Repeat },
    { label: 'Monthly MRR', value: '$8,420', icon: DollarSign },
    { label: 'Annual Spend', value: '$101K', icon: TrendingUp },
    { label: 'Up for Renewal', value: '3', icon: RefreshCw },
  ];

  const subscriptions = [
    { name: 'AWS Cloud Services', cost: '$3,240', cycle: 'Monthly', renewal: 'Mar 1, 2026', status: 'Active', category: 'Infrastructure', users: 'Unlimited' },
    { name: 'Figma Enterprise', cost: '$1,180', cycle: 'Monthly', renewal: 'Mar 4, 2026', status: 'Active', category: 'Design', users: '25 seats' },
    { name: 'Slack Business+', cost: '$620', cycle: 'Monthly', renewal: 'Mar 1, 2026', status: 'Active', category: 'Communication', users: '48 seats' },
    { name: 'HubSpot CRM', cost: '$800', cycle: 'Monthly', renewal: 'Mar 15, 2026', status: 'Active', category: 'Sales', users: '15 seats' },
    { name: 'Notion Enterprise', cost: '$320', cycle: 'Monthly', renewal: 'Mar 3, 2026', status: 'Active', category: 'Productivity', users: '48 seats' },
    { name: 'Vercel Pro', cost: '$260', cycle: 'Monthly', renewal: 'Mar 1, 2026', status: 'Active', category: 'Infrastructure', users: '10 seats' },
    { name: 'Adobe Creative Cloud', cost: '$1,600', cycle: 'Annual', renewal: 'Jun 15, 2026', status: 'Active', category: 'Design', users: '8 seats' },
    { name: 'GitHub Enterprise', cost: '$420', cycle: 'Monthly', renewal: 'Mar 1, 2026', status: 'Active', category: 'Development', users: '32 seats' },
    { name: 'Zoom Business', cost: '$250', cycle: 'Monthly', renewal: 'Mar 10, 2026', status: 'Active', category: 'Communication', users: '30 seats' },
    { name: 'Linear Pro', cost: '$160', cycle: 'Monthly', renewal: 'Mar 1, 2026', status: 'Active', category: 'Development', users: '25 seats' },
    { name: '1Password Business', cost: '$192', cycle: 'Monthly', renewal: 'Mar 5, 2026', status: 'Active', category: 'Security', users: '48 seats' },
    { name: 'Datadog Pro', cost: '$480', cycle: 'Monthly', renewal: 'Feb 15, 2026', status: 'Expiring Soon', category: 'Infrastructure', users: '5 seats' },
  ];

  const monthlySpend = [
    { month: 'Sep', amount: 62 },
    { month: 'Oct', amount: 68 },
    { month: 'Nov', amount: 72 },
    { month: 'Dec', amount: 75 },
    { month: 'Jan', amount: 80 },
    { month: 'Feb', amount: 84 },
  ];

  const subscriptionStatusStyle = {
    Active: 'bg-emerald-500/15 text-emerald-400',
    'Expiring Soon': 'bg-amber-500/15 text-amber-400',
    Cancelled: 'bg-red-500/15 text-red-400',
    Paused: 'bg-zinc-700/50 text-zinc-400',
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Repeat className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Track recurring subscriptions and SaaS spend.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Monthly Spend Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold">Monthly Subscription Spend</h2>
          <span className="text-xs text-zinc-500">Last 6 months ($00s)</span>
        </div>
        <div className="flex items-end justify-between gap-4 h-40 mt-4">
          {monthlySpend.map((bar) => (
            <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center h-32">
                <div
                  className="flex-1 max-w-8 rounded-t-md bg-gradient-to-t from-amber-600/40 to-amber-400/80"
                  style={{ height: `${bar.amount}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1">{bar.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Active Subscriptions</h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
            <Filter className="w-3 h-3" />
            Filter
          </button>
        </div>
        <div className="overflow-x-auto" data-demo="subscriptions-list">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Service</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Cost</th>
                <th className="pb-3 font-medium">Cycle</th>
                <th className="pb-3 font-medium">Users</th>
                <th className="pb-3 font-medium">Renewal</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {subscriptions.map((sub) => (
                <tr key={sub.name} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <Repeat className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span className="text-white font-medium">{sub.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{sub.category}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-zinc-300 font-mono text-xs">{sub.cost}</span>
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{sub.cycle}</td>
                  <td className="py-3 text-zinc-500 text-xs">{sub.users}</td>
                  <td className="py-3 text-zinc-500 text-xs">{sub.renewal}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${subscriptionStatusStyle[sub.status]}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 cursor-default">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  13. DemoFinanceJournalEntries                                      */
/* ================================================================== */

export function DemoFinanceJournalEntries({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const stats = [
    { label: 'Total Entries', value: '2,041', icon: BookOpen },
    { label: 'This Month', value: '87', icon: Calendar },
    { label: 'Total Debits', value: '$1.24M', icon: ArrowUpRight },
    { label: 'Total Credits', value: '$1.24M', icon: ArrowDownRight },
  ];

  const entries = [
    { date: 'Feb 7, 2026', ref: 'JE-2047', description: 'Client Payment - Summit Analytics', debitAccount: 'Cash & Bank', creditAccount: 'Accounts Receivable', debit: '$22,400', credit: '$22,400', createdBy: 'M. de Vries' },
    { date: 'Feb 6, 2026', ref: 'JE-2046', description: 'AWS Monthly Infrastructure', debitAccount: 'Software Subscriptions', creditAccount: 'Accounts Payable', debit: '$3,240', credit: '$3,240', createdBy: 'System' },
    { date: 'Feb 5, 2026', ref: 'JE-2045', description: 'Client Payment - INV-1052', debitAccount: 'Cash & Bank', creditAccount: 'Accounts Receivable', debit: '$14,800', credit: '$14,800', createdBy: 'M. de Vries' },
    { date: 'Feb 4, 2026', ref: 'JE-2044', description: 'Figma Enterprise License', debitAccount: 'Software Subscriptions', creditAccount: 'Cash & Bank', debit: '$1,180', credit: '$1,180', createdBy: 'System' },
    { date: 'Feb 3, 2026', ref: 'JE-2043', description: 'January Salary Payment', debitAccount: 'Salaries & Wages', creditAccount: 'Cash & Bank', debit: '$28,500', credit: '$28,500', createdBy: 'J. Bakker' },
    { date: 'Feb 3, 2026', ref: 'JE-2042', description: 'Invoice Issued - INV-1048', debitAccount: 'Accounts Receivable', creditAccount: 'Service Revenue', debit: '$6,900', credit: '$6,900', createdBy: 'System' },
    { date: 'Feb 2, 2026', ref: 'JE-2041', description: 'Office Supplies Purchase', debitAccount: 'Office Supplies', creditAccount: 'Cash & Bank', debit: '$185', credit: '$185', createdBy: 'A. Jansen' },
    { date: 'Feb 1, 2026', ref: 'JE-2040', description: 'Monthly Rent Payment', debitAccount: 'Rent & Utilities', creditAccount: 'Cash & Bank', debit: '$8,000', credit: '$8,000', createdBy: 'System' },
    { date: 'Jan 31, 2026', ref: 'JE-2039', description: 'Equipment Depreciation - Jan', debitAccount: 'Depreciation Expense', creditAccount: 'Accumulated Depreciation', debit: '$3,100', credit: '$3,100', createdBy: 'System' },
    { date: 'Jan 31, 2026', ref: 'JE-2038', description: 'Prepaid Insurance Amortization', debitAccount: 'Insurance Expense', creditAccount: 'Prepaid Expenses', debit: '$1,200', credit: '$1,200', createdBy: 'System' },
    { date: 'Jan 30, 2026', ref: 'JE-2037', description: 'Flight to Amsterdam - Travel', debitAccount: 'Travel & Entertainment', creditAccount: 'Credit Card Payable', debit: '$890', credit: '$890', createdBy: 'P. Smit' },
    { date: 'Jan 28, 2026', ref: 'JE-2036', description: 'LinkedIn Premium Ads', debitAccount: 'Marketing & Advertising', creditAccount: 'Cash & Bank', debit: '$1,600', credit: '$1,600', createdBy: 'K. Mol' },
  ];

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <BookOpen className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Journal Entries</h1>
            <p className="text-zinc-400 mt-0.5 text-sm">Double-entry bookkeeping records for {companyName}.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors cursor-default">
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default border border-zinc-700/50">
          <Calendar className="w-3 h-3" />
          Feb 1 - Feb 7, 2026
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
          <Filter className="w-3 h-3" />
          Filter by Account
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
          <Search className="w-3 h-3" />
          Search
        </button>
        <div className="ml-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs cursor-default">
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* Journal entries table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="overflow-x-auto" data-demo="journal-entries-list">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Reference</th>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Debit Account</th>
                <th className="pb-3 font-medium">Credit Account</th>
                <th className="pb-3 font-medium">Debit</th>
                <th className="pb-3 font-medium">Credit</th>
                <th className="pb-3 font-medium">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {entries.map((entry) => (
                <tr key={entry.ref} className="text-sm hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 text-zinc-500 text-xs">{entry.date}</td>
                  <td className="py-3">
                    <span className="text-zinc-300 text-xs font-mono">{entry.ref}</span>
                  </td>
                  <td className="py-3 text-white font-medium">{entry.description}</td>
                  <td className="py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{entry.debitAccount}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/50">{entry.creditAccount}</span>
                  </td>
                  <td className="py-3">
                    <span className="font-mono text-xs text-emerald-400">{entry.debit}</span>
                  </td>
                  <td className="py-3">
                    <span className="font-mono text-xs text-red-400">{entry.credit}</span>
                  </td>
                  <td className="py-3 text-zinc-500 text-xs">{entry.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals row */}
        <div className="flex items-center justify-end gap-6 mt-4 pt-4 border-t border-zinc-800">
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Total Debits</p>
            <p className="text-sm font-mono font-semibold text-emerald-400">$91,995</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Total Credits</p>
            <p className="text-sm font-mono font-semibold text-red-400">$91,995</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Difference</p>
            <p className="text-sm font-mono font-semibold text-amber-400">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
