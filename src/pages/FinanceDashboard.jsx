import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import {
  Euro, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight,
  Plus, FileText, ChevronRight, Wallet, Sun, Moon, AlertCircle,
  BookOpen, ScrollText, Receipt, Scale, Clock, FileSpreadsheet,
  CheckCircle, AlertTriangle, ExternalLink, CreditCard, Users,
  LayoutDashboard, RefreshCw, Banknote
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `€${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function getQuarterRange() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function getYearRange() {
  const now = new Date();
  return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0, 10) };
}

const PERIOD_OPTIONS = [
  { key: 'month', label: 'This Month', fn: () => getMonthRange(0) },
  { key: 'quarter', label: 'This Quarter', fn: getQuarterRange },
  { key: 'year', label: 'This Year', fn: getYearRange },
];

const AGING_BUCKETS = [
  { key: 'current_amount', label: 'Current', color: 'text-green-400', bg: 'bg-green-500' },
  { key: 'days_30', label: '1-30', color: 'text-yellow-400', bg: 'bg-yellow-500' },
  { key: 'days_60', label: '31-60', color: 'text-amber-400', bg: 'bg-amber-500' },
  { key: 'days_90', label: '61-90', color: 'text-orange-400', bg: 'bg-orange-500' },
  { key: 'over_90', label: '90+', color: 'text-red-400', bg: 'bg-red-500' },
];

const REPORT_LINKS = [
  { label: 'Profit & Loss', desc: 'Revenue and expenses', icon: TrendingUp, path: 'FinanceReportPL', color: 'text-green-400' },
  { label: 'Balance Sheet', desc: 'Assets, liabilities, equity', icon: Scale, path: 'FinanceReportBS', color: 'text-blue-400' },
  { label: 'Trial Balance', desc: 'Verify books are balanced', icon: FileSpreadsheet, path: 'FinanceReportTB', color: 'text-purple-400' },
  { label: 'Aging Reports', desc: 'Track overdue payables', icon: Clock, path: 'FinanceReportAging', color: 'text-amber-400' },
  { label: 'General Ledger', desc: 'Complete transaction history', icon: BookOpen, path: 'FinanceGeneralLedger', color: 'text-cyan-400' },
];

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState('month');
  const [dateRange, setDateRange] = useState(getMonthRange);
  const [metrics, setMetrics] = useState({ cash: 0, ar: 0, ap: 0, netIncome: 0 });
  const [plData, setPLData] = useState(null);
  const [tbData, setTBData] = useState(null);
  const [agingData, setAgingData] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [billsDueSoon, setBillsDueSoon] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showGLBanner, setShowGLBanner] = useState(false);

  const navigate = useNavigate();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);

  const handlePeriodChange = (p) => {
    setActivePeriod(p.key);
    setDateRange(p.fn());
  };

  const loadDashboard = useCallback(async () => {
    if (!user?.company_id) return;
    const companyId = user.company_id;
    const today = new Date().toISOString().slice(0, 10);

    try {
      const [plResult, tbResult, agingResult, entriesResult, billsResult, invoiceCountResult, expenseCountResult] = await Promise.all([
        // P&L for the selected period
        supabase.rpc('get_profit_loss', { p_company_id: companyId, p_start_date: dateRange.from, p_end_date: dateRange.to })
          .then(r => { if (r.error) console.warn('P&L RPC error:', r.error.message); return r; }, (err) => { console.warn('P&L RPC failed:', err); return { data: [], error: err }; }),
        // Trial Balance as of today
        supabase.rpc('get_trial_balance', { p_company_id: companyId, p_as_of_date: today })
          .then(r => { if (r.error) console.warn('TB RPC error:', r.error.message); return r; }, (err) => { console.warn('TB RPC failed:', err); return { data: [], error: err }; }),
        // AP Aging
        supabase.rpc('get_aged_payables', { p_company_id: companyId, p_as_of_date: today })
          .then(r => { if (r.error) console.warn('Aging RPC error:', r.error.message); return r; }, (err) => { console.warn('Aging RPC failed:', err); return { data: [], error: err }; }),
        // Recent journal entries
        Promise.resolve(db.entities.JournalEntry?.list?.({ limit: 10, sort_by: 'entry_date', sort_order: 'desc' })).catch(() => []),
        // Bills due in next 7 days
        Promise.resolve(db.entities.Bill?.list?.({ limit: 10 })).catch(() => []),
        // Check if invoices exist (for GL banner)
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', companyId).then(r => r, () => ({ count: 0 })),
        // Check if expenses exist (for GL banner)
        supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('company_id', companyId).then(r => r, () => ({ count: 0 })),
      ]);

      // Process P&L — handle both old (row_type/section) and new (category/is_summary) field names
      const plRows = plResult?.data || [];
      let totalRevenue = 0, totalExpenses = 0, netIncome = 0;
      for (const row of plRows) {
        const isSubtotal = row.row_type === 'subtotal' || (row.is_summary === true && row.category !== 'Net Income');
        const isSummary = row.row_type === 'summary' || (row.is_summary === true && row.category === 'Net Income');
        const section = row.section || row.category;
        if (isSubtotal && section === 'Revenue') totalRevenue = parseFloat(row.amount) || 0;
        else if (isSubtotal && (section === 'Expenses' || section === 'Expense')) totalExpenses = parseFloat(row.amount) || 0;
        else if (isSummary) netIncome = parseFloat(row.amount) || 0;
      }
      setPLData({ revenue: totalRevenue, expenses: totalExpenses, netIncome });

      // Detect if financial data exists but GL is empty (show info banner)
      const hasInvoices = (invoiceCountResult?.count || 0) > 0;
      const hasExpenses = (expenseCountResult?.count || 0) > 0;
      const glIsEmpty = plRows.length === 0 && (tbResult?.data || []).length === 0;
      setShowGLBanner(glIsEmpty && (hasInvoices || hasExpenses));

      // Process Trial Balance
      const tbRows = tbResult?.data || [];
      let totalDebits = 0, totalCredits = 0, cashBalance = 0, arBalance = 0;
      for (const row of tbRows) {
        totalDebits += parseFloat(row.debit_balance) || 0;
        totalCredits += parseFloat(row.credit_balance) || 0;
        // Cash accounts typically start with 10xx
        const code = row.account_code || '';
        if (code.startsWith('10')) cashBalance += (parseFloat(row.debit_balance) || 0) - (parseFloat(row.credit_balance) || 0);
        // AR accounts typically 11xx
        if (code.startsWith('11')) arBalance += (parseFloat(row.debit_balance) || 0) - (parseFloat(row.credit_balance) || 0);
      }
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
      setTBData({ totalDebits, totalCredits, isBalanced, accountCount: tbRows.length });

      // Process AP Aging
      const agingRows = agingResult?.data || [];
      const agingTotals = { current_amount: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0, total: 0 };
      for (const row of agingRows) {
        agingTotals.current_amount += parseFloat(row.current_amount) || 0;
        agingTotals.days_30 += parseFloat(row.days_30) || 0;
        agingTotals.days_60 += parseFloat(row.days_60) || 0;
        agingTotals.days_90 += parseFloat(row.days_90) || 0;
        agingTotals.over_90 += parseFloat(row.over_90) || 0;
        agingTotals.total += parseFloat(row.total) || 0;
      }
      setAgingData(agingTotals);

      // Set top metrics
      setMetrics({
        cash: cashBalance,
        ar: arBalance,
        ap: agingTotals.total,
        netIncome,
      });

      // Recent entries
      setRecentEntries((entriesResult || []).slice(0, 10));

      // Bills due soon (next 7 days)
      const sevenDaysOut = new Date();
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const sevenStr = sevenDaysOut.toISOString().slice(0, 10);
      const dueSoon = (billsResult || [])
        .filter(b => b.status === 'pending' && b.due_date && b.due_date <= sevenStr && b.due_date >= today)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 5);
      setBillsDueSoon(dueSoon);

    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.company_id, dateRange]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading || permLoading) {
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex flex-col items-center justify-center text-center p-6`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')} mb-2`}>Access Denied</h2>
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view finance.</p>
      </div>
    );
  }

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">

          {/* Header */}
          <PageHeader
            icon={LayoutDashboard}
            title="Finance Dashboard"
            subtitle="Overview of your financial health and key metrics"
            color="blue"
            actions={
              <div className="flex items-center gap-3">
                {/* Period Toggle */}
                <div className="flex gap-1">
                  {PERIOD_OPTIONS.map(p => (
                    <button key={p.key} onClick={() => handlePeriodChange(p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        activePeriod === p.key
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : ft('bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
                              'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:bg-zinc-800')
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
            }
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Cash Position', value: metrics.cash, icon: Banknote, color: 'text-green-400', bgColor: 'bg-green-500/10' },
              { label: 'Accounts Receivable', value: metrics.ar, icon: ArrowUpRight, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
              { label: 'Accounts Payable', value: metrics.ap, icon: ArrowDownRight, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
              { label: 'Net Income', value: metrics.netIncome, icon: metrics.netIncome >= 0 ? TrendingUp : TrendingDown,
                color: metrics.netIncome >= 0 ? 'text-green-400' : 'text-red-400',
                bgColor: metrics.netIncome >= 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
            ].map((m, i) => (
              <Card key={i} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium uppercase tracking-wider ${ft('text-slate-400', 'text-zinc-500')}`}>
                      {m.label}
                    </span>
                    <div className={`w-8 h-8 rounded-lg ${m.bgColor} flex items-center justify-center`}>
                      <m.icon className={`w-4 h-4 ${m.color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                    {formatCurrency(m.value)}
                  </p>
                  <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                    {i === 3 ? `${formatDate(dateRange.from)} — ${formatDate(dateRange.to)}` : 'As of today'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* GL Info Banner */}
          {showGLBanner && (
            <Card className={`${ft('bg-amber-50 border-amber-200', 'bg-amber-500/5 border-amber-500/20')} border`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${ft('text-amber-800', 'text-amber-300')}`}>
                      Financial data hasn't been posted to the General Ledger
                    </p>
                    <p className={`text-xs mt-1 ${ft('text-amber-600', 'text-amber-400/70')}`}>
                      You have invoices and/or expenses that aren't reflected in the GL yet. Dashboard KPIs and reports read from the ledger.
                      Visit Ledger &gt; Chart of Accounts to initialize, then mark invoices as paid or save expenses to auto-post.
                    </p>
                  </div>
                  <Button variant="outline" size="sm"
                    className={ft('border-amber-300 text-amber-700 hover:bg-amber-100', 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10')}
                    onClick={() => navigate(createPageUrl('FinanceAccounts'))}>
                    Initialize COA
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Create Invoice', icon: Receipt, path: 'FinanceInvoices' },
                  { label: 'Enter Bill', icon: ScrollText, path: 'FinanceBills' },
                  { label: 'Record Payment', icon: Wallet, path: 'FinanceBillPayments' },
                  { label: 'Journal Entry', icon: FileSpreadsheet, path: 'FinanceJournalEntries' },
                ].map((a, i) => (
                  <Button key={i} variant="outline" size="sm"
                    className={ft('border-slate-200 text-slate-600 hover:bg-slate-50', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}
                    onClick={() => navigate(createPageUrl(a.path))}>
                    <a.icon className="w-3.5 h-3.5 mr-1.5" />{a.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* P&L Summary */}
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>P&L Summary</h3>
                  <Link to={createPageUrl('FinanceReportPL')} className="text-blue-400 hover:text-blue-300">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {plData && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Revenue</span>
                      <span className="text-sm font-medium text-green-400 tabular-nums">{formatCurrency(plData.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Expenses</span>
                      <span className="text-sm font-medium text-red-400 tabular-nums">{formatCurrency(plData.expenses)}</span>
                    </div>
                    <div className={`border-t pt-2 ${ft('border-slate-100', 'border-zinc-800')}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>Net Income</span>
                        <span className={`text-sm font-bold tabular-nums ${plData.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(plData.netIncome)}
                        </span>
                      </div>
                    </div>
                    {/* Mini bar */}
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500/40 rounded-l-full" style={{ width: `${Math.max((plData.revenue / (Math.max(plData.revenue, plData.expenses, 1))) * 100, 2)}%` }} />
                      <div className="bg-red-500/40 rounded-r-full" style={{ width: `${Math.max((plData.expenses / (Math.max(plData.revenue, plData.expenses, 1))) * 100, 2)}%` }} />
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/40" /><span className={ft('text-slate-400', 'text-zinc-500')}>Revenue</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/40" /><span className={ft('text-slate-400', 'text-zinc-500')}>Expenses</span></span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trial Balance Check */}
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>Balance Check</h3>
                  <Link to={createPageUrl('FinanceReportTB')} className="text-blue-400 hover:text-blue-300">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {tbData && (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      tbData.isBalanced ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      {tbData.isBalanced
                        ? <CheckCircle className="w-8 h-8 text-green-500" />
                        : <AlertTriangle className="w-8 h-8 text-red-500" />
                      }
                      <div>
                        <p className={`text-sm font-semibold ${tbData.isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                          {tbData.isBalanced ? 'Books are Balanced' : 'Books are NOT Balanced'}
                        </p>
                        <p className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>
                          {tbData.accountCount} accounts checked
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className={`p-2 rounded-md ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                        <p className={`text-[10px] uppercase tracking-wider ${ft('text-slate-400', 'text-zinc-500')}`}>Total Debits</p>
                        <p className={`text-sm font-bold tabular-nums mt-0.5 ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(tbData.totalDebits)}</p>
                      </div>
                      <div className={`p-2 rounded-md ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                        <p className={`text-[10px] uppercase tracking-wider ${ft('text-slate-400', 'text-zinc-500')}`}>Total Credits</p>
                        <p className={`text-sm font-bold tabular-nums mt-0.5 ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(tbData.totalCredits)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AP Aging Summary */}
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>AP Aging</h3>
                  <Link to={createPageUrl('FinanceReportAging')} className="text-blue-400 hover:text-blue-300">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                {agingData && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>Total Outstanding</span>
                      <span className={`text-lg font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(agingData.total)}</span>
                    </div>
                    {/* Stacked bar */}
                    <div className={`h-4 rounded-full overflow-hidden flex ${ft('bg-slate-100', 'bg-zinc-800')}`}>
                      {AGING_BUCKETS.map(b => {
                        const val = agingData[b.key] || 0;
                        const pct = agingData.total > 0 ? (val / agingData.total) * 100 : 0;
                        if (pct < 0.5) return null;
                        return <div key={b.key} className={`h-full ${b.bg}/50`} style={{ width: `${pct}%` }} />;
                      })}
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {AGING_BUCKETS.map(b => (
                        <div key={b.key}>
                          <p className={`text-[9px] font-medium ${ft('text-slate-400', 'text-zinc-500')}`}>{b.label}</p>
                          <p className={`text-xs font-semibold tabular-nums mt-0.5 ${b.color}`}>
                            {formatCurrency(agingData[b.key])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Grid */}
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Recent Activity */}
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>Recent Journal Entries</h3>
                  <Link to={createPageUrl('FinanceGeneralLedger')}
                    className={`text-xs flex items-center gap-1 ${ft('text-blue-600', 'text-blue-400')} hover:underline`}>
                    View All <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentEntries.length === 0 ? (
                  <p className={`text-sm text-center py-6 ${ft('text-slate-400', 'text-zinc-500')}`}>No recent entries</p>
                ) : (
                  <div className="space-y-1">
                    {recentEntries.map((entry, i) => (
                      <div key={entry.id || i}
                        className={`flex items-center gap-3 px-2 py-2 rounded-md ${ft('hover:bg-slate-50', 'hover:bg-white/[0.02]')}`}>
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                          entry.is_posted ? 'bg-green-500/10' : 'bg-zinc-500/10'
                        }`}>
                          <FileText className={`w-3.5 h-3.5 ${entry.is_posted ? 'text-green-400' : 'text-zinc-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${ft('text-slate-700', 'text-zinc-300')}`}>
                            {entry.description || entry.reference || entry.entry_number || 'Journal Entry'}
                          </p>
                          <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                            {formatDate(entry.entry_date)} · {entry.entry_number || ''}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${
                          entry.is_posted
                            ? 'text-green-400 border-green-500/30'
                            : 'text-zinc-400 border-zinc-500/30'
                        }`}>
                          {entry.is_posted ? 'Posted' : 'Draft'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bills Due Soon */}
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>Bills Due Soon</h3>
                  <Link to={createPageUrl('FinanceBills')}
                    className={`text-xs flex items-center gap-1 ${ft('text-blue-600', 'text-blue-400')} hover:underline`}>
                    View All <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {billsDueSoon.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${ft('text-green-300', 'text-green-600')}`} />
                    <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No bills due in the next 7 days</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {billsDueSoon.map((bill) => {
                      const daysUntil = Math.ceil((new Date(bill.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={bill.id}
                          className={`flex items-center gap-3 px-2 py-2 rounded-md ${ft('hover:bg-slate-50', 'hover:bg-white/[0.02]')}`}>
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                            daysUntil <= 2 ? 'bg-red-500/10' : 'bg-amber-500/10'
                          }`}>
                            <ScrollText className={`w-3.5 h-3.5 ${daysUntil <= 2 ? 'text-red-400' : 'text-amber-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${ft('text-slate-700', 'text-zinc-300')}`}>
                              {bill.bill_number || 'Bill'} {bill.vendor_name && `— ${bill.vendor_name}`}
                            </p>
                            <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                              Due {formatDate(bill.due_date)}
                              {daysUntil <= 0 ? ' (overdue)' : daysUntil === 1 ? ' (tomorrow)' : ` (${daysUntil} days)`}
                            </p>
                          </div>
                          <span className={`text-sm font-medium tabular-nums flex-shrink-0 ${ft('text-slate-900', 'text-white')}`}>
                            {formatCurrency(bill.balance_due || bill.total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Reports */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${ft('text-slate-700', 'text-zinc-300')}`}>Quick Reports</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {REPORT_LINKS.map((r) => (
                <Link key={r.path} to={createPageUrl(r.path)}>
                  <Card className={`h-full transition-colors ${ft('bg-white border-slate-200 hover:border-slate-300', 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700')}`}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className={`w-10 h-10 rounded-xl ${ft('bg-slate-50', 'bg-zinc-800/50')} flex items-center justify-center mb-2`}>
                        <r.icon className={`w-5 h-5 ${r.color}`} />
                      </div>
                      <p className={`text-sm font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>{r.label}</p>
                      <p className={`text-[11px] mt-0.5 ${ft('text-slate-400', 'text-zinc-500')}`}>{r.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </FinancePageTransition>
  );
}
