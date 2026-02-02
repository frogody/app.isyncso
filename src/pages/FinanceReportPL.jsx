import React, { useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  TrendingUp, TrendingDown, Download, Sun, Moon, AlertCircle,
  Calendar, Printer, BarChart3, ArrowUpRight, ArrowDownRight,
  RefreshCw, FileText, ChevronDown, Minus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `€${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPercent(val) {
  if (val === null || val === undefined || !isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
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

function getPreviousPeriod(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);
  return { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) };
}

// ── Mini Bar Chart ──────────────────────────────────────────────────────────
function MiniBarChart({ revenue, expenses, ft }) {
  const max = Math.max(revenue, expenses, 1);
  const revPct = (revenue / max) * 100;
  const expPct = (expenses / max) * 100;

  return (
    <div className="flex items-end gap-3 h-20">
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="w-full rounded-t-md bg-green-500/20 border border-green-500/30 relative overflow-hidden"
          style={{ height: `${Math.max(revPct, 4)}%` }}>
          <div className="absolute inset-0 bg-green-500/30" />
        </div>
        <span className={`text-[10px] ${ft('text-slate-500', 'text-zinc-500')}`}>Revenue</span>
      </div>
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="w-full rounded-t-md bg-red-500/20 border border-red-500/30 relative overflow-hidden"
          style={{ height: `${Math.max(expPct, 4)}%` }}>
          <div className="absolute inset-0 bg-red-500/30" />
        </div>
        <span className={`text-[10px] ${ft('text-slate-500', 'text-zinc-500')}`}>Expenses</span>
      </div>
    </div>
  );
}

// ── Variance Indicator ──────────────────────────────────────────────────────
function VarianceIndicator({ current, previous, inverse = false }) {
  if (!previous || previous === 0) return <span className="text-zinc-500">—</span>;
  const change = current - previous;
  const pct = (change / Math.abs(previous)) * 100;
  const isPositive = inverse ? change < 0 : change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {formatPercent(pct)}
    </span>
  );
}

const PERIOD_BUTTONS = [
  { key: 'this_month', label: 'This Month', fn: () => getMonthRange(0) },
  { key: 'last_month', label: 'Last Month', fn: () => getMonthRange(-1) },
  { key: 'this_quarter', label: 'This Quarter', fn: getQuarterRange },
  { key: 'this_year', label: 'This Year', fn: getYearRange },
  { key: 'custom', label: 'Custom' },
];

export default function FinanceReportPL({ embedded = false }) {
  const [dateRange, setDateRange] = useState(getMonthRange);
  const [activePeriod, setActivePeriod] = useState('this_month');
  const [compare, setCompare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [generated, setGenerated] = useState(false);
  const reportRef = useRef(null);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);

  const handlePeriodClick = (p) => {
    setActivePeriod(p.key);
    if (p.fn) setDateRange(p.fn());
  };

  const fetchReport = useCallback(async () => {
    if (!user?.company_id) { toast.error('No company context'); return; }
    setLoading(true);
    setGenerated(false);
    try {
      const { data, error } = await supabase.rpc('get_profit_loss', {
        p_company_id: user.company_id,
        p_start_date: dateRange.from,
        p_end_date: dateRange.to,
      });
      if (error) throw error;
      setReportData(data || []);

      if (compare) {
        const prev = getPreviousPeriod(dateRange.from, dateRange.to);
        const { data: prevData, error: prevErr } = await supabase.rpc('get_profit_loss', {
          p_company_id: user.company_id,
          p_start_date: prev.from,
          p_end_date: prev.to,
        });
        if (prevErr) throw prevErr;
        setComparisonData({ data: prevData || [], from: prev.from, to: prev.to });
      } else {
        setComparisonData(null);
      }

      setGenerated(true);
    } catch (err) {
      console.error('Error fetching P&L:', err);
      toast.error('Failed to generate report');
      setReportData(null);
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, dateRange, compare]);

  // Process report data into sections
  const processed = useMemo(() => {
    if (!reportData) return null;

    const revenue = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpenses = 0;
    let netIncome = 0;

    for (const row of reportData) {
      if (row.row_type === 'detail' && row.section === 'Revenue') {
        revenue.push(row);
      } else if (row.row_type === 'detail' && row.section === 'Expenses') {
        expenses.push(row);
      } else if (row.row_type === 'subtotal' && row.section === 'Revenue') {
        totalRevenue = parseFloat(row.amount) || 0;
      } else if (row.row_type === 'subtotal' && row.section === 'Expenses') {
        totalExpenses = parseFloat(row.amount) || 0;
      } else if (row.row_type === 'summary') {
        netIncome = parseFloat(row.amount) || 0;
      }
    }

    return { revenue, expenses, totalRevenue, totalExpenses, netIncome };
  }, [reportData]);

  const processedComparison = useMemo(() => {
    if (!comparisonData?.data) return null;
    const rows = comparisonData.data;
    const map = {};
    let totalRevenue = 0;
    let totalExpenses = 0;
    let netIncome = 0;

    for (const row of rows) {
      if (row.row_type === 'detail') {
        map[row.account_code] = parseFloat(row.amount) || 0;
      } else if (row.row_type === 'subtotal' && row.section === 'Revenue') {
        totalRevenue = parseFloat(row.amount) || 0;
      } else if (row.row_type === 'subtotal' && row.section === 'Expenses') {
        totalExpenses = parseFloat(row.amount) || 0;
      } else if (row.row_type === 'summary') {
        netIncome = parseFloat(row.amount) || 0;
      }
    }

    return { map, totalRevenue, totalExpenses, netIncome };
  }, [comparisonData]);

  const showComparison = compare && processedComparison;

  // CSV export
  const exportCSV = () => {
    if (!processed) { toast.error('Generate report first'); return; }
    const headers = ['Section', 'Code', 'Account', 'Amount'];
    if (showComparison) headers.push('Previous', 'Variance', 'Variance %');
    const csvRows = [headers.join(',')];

    const addRow = (section, code, name, amount, prevAmount) => {
      const cols = [section, code, `"${name}"`, (parseFloat(amount) || 0).toFixed(2)];
      if (showComparison) {
        const prev = prevAmount || 0;
        const variance = (parseFloat(amount) || 0) - prev;
        const pct = prev !== 0 ? ((variance / Math.abs(prev)) * 100).toFixed(1) : '';
        cols.push(prev.toFixed(2), variance.toFixed(2), pct);
      }
      csvRows.push(cols.join(','));
    };

    processed.revenue.forEach(r => addRow('Revenue', r.account_code, r.account_name, r.amount, processedComparison?.map[r.account_code]));
    addRow('', '', 'Total Revenue', processed.totalRevenue, processedComparison?.totalRevenue);
    csvRows.push('');
    processed.expenses.forEach(r => addRow('Expenses', r.account_code, r.account_name, r.amount, processedComparison?.map[r.account_code]));
    addRow('', '', 'Total Expenses', processed.totalExpenses, processedComparison?.totalExpenses);
    csvRows.push('');
    addRow('', '', 'Net Income', processed.netIncome, processedComparison?.netIncome);

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  if (permLoading) {
    if (embedded) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!canView) {
    if (embedded) return <div className="text-center py-12"><p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view financial reports.</p></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex flex-col items-center justify-center text-center p-6`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')} mb-2`}>Access Denied</h2>
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view financial reports.</p>
      </div>
    );
  }

  const content = (
    <>
        <div className={embedded ? "space-y-4" : "w-full px-4 lg:px-6 py-4 space-y-4"}>

          {/* Header */}
          {!embedded && <div className="print:hidden">
            <PageHeader
              icon={TrendingUp}
              title="Profit & Loss Statement"
              subtitle="Income statement showing Revenue - Expenses = Net Income"
              color="green"
              actions={
                <div className="flex gap-3">
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </div>
              }
            />
          </div>}

          {/* Report Controls */}
          <Card className={`print:hidden ${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}`}>
            <CardContent className="p-4 space-y-4">
              {/* Period Selection */}
              <div>
                <Label className={`text-xs font-medium mb-2 block ${ft('text-slate-500', 'text-zinc-500')}`}>Period</Label>
                <div className="flex flex-wrap gap-2">
                  {PERIOD_BUTTONS.map(p => (
                    <button key={p.key} onClick={() => handlePeriodClick(p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        activePeriod === p.key
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : ft('bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',
                              'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800')
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              {activePeriod === 'custom' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>From Date</Label>
                    <Input type="date" value={dateRange.from}
                      onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
                      className={`mt-1 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} />
                  </div>
                  <div className="flex-1">
                    <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>To Date</Label>
                    <Input type="date" value={dateRange.to}
                      onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
                      className={`mt-1 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} />
                  </div>
                </div>
              )}

              {/* Actions Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Compare Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500" />
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Compare to Previous Period</span>
                </label>

                <div className="flex-1" />

                <Button onClick={fetchReport} disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                  Generate Report
                </Button>

                {generated && (
                  <>
                    <Button variant="outline" onClick={exportCSV}
                      className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Download className="w-4 h-4 mr-2" />CSV
                    </Button>
                    <Button variant="outline" onClick={handlePrint}
                      className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Printer className="w-4 h-4 mr-2" />Print
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {!generated && !loading && (
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-12 text-center">
                <FileText className={`w-16 h-16 mx-auto mb-4 ${ft('text-slate-300', 'text-zinc-700')}`} />
                <h3 className={`text-lg font-semibold mb-2 ${ft('text-slate-700', 'text-zinc-300')}`}>
                  Select a period and generate the report
                </h3>
                <p className={`text-sm ${ft('text-slate-500', 'text-zinc-500')}`}>
                  Choose a date range above, then click "Generate Report" to view your Profit & Loss statement.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-12 flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
                <p className={ft('text-slate-500', 'text-zinc-400')}>Generating report...</p>
              </CardContent>
            </Card>
          )}

          {/* Report Output */}
          {generated && processed && (
            <div ref={reportRef} className="space-y-4 print:space-y-2">

              {/* Report Header (visible in print) */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs uppercase tracking-wider mb-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        {user?.company_name || 'Company'}
                      </p>
                      <h2 className={`text-xl font-bold ${ft('text-slate-900', 'text-white')}`}>
                        Profit & Loss Statement
                      </h2>
                      <p className={`text-sm mt-1 ${ft('text-slate-500', 'text-zinc-400')}`}>
                        Period: {formatDate(dateRange.from)} — {formatDate(dateRange.to)}
                      </p>
                      {showComparison && (
                        <p className={`text-xs mt-0.5 ${ft('text-slate-400', 'text-zinc-500')}`}>
                          Compared to: {formatDate(comparisonData.from)} — {formatDate(comparisonData.to)}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')} print:block`}>
                        Generated: {new Date().toLocaleString()}
                      </p>
                    </div>

                    {/* Mini Chart */}
                    <div className="w-28 print:hidden">
                      <MiniBarChart revenue={processed.totalRevenue} expenses={processed.totalExpenses} ft={ft} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Section */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-0">
                  <div className={`px-4 py-3 border-b ${ft('border-slate-100 bg-green-50/50', 'border-zinc-800 bg-green-500/[0.03]')}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-semibold ${ft('text-green-700', 'text-green-400')}`}>Revenue</h3>
                      <span className={`text-sm font-bold ${ft('text-green-700', 'text-green-400')}`}>
                        {formatCurrency(processed.totalRevenue)}
                      </span>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className={`text-[11px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                        <th className="text-left px-4 py-2 font-medium w-24">Code</th>
                        <th className="text-left px-4 py-2 font-medium">Account</th>
                        <th className="text-right px-4 py-2 font-medium w-32">Amount</th>
                        {showComparison && (
                          <>
                            <th className="text-right px-4 py-2 font-medium w-32">Previous</th>
                            <th className="text-right px-4 py-2 font-medium w-28">Variance</th>
                            <th className="text-right px-4 py-2 font-medium w-20">%</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {processed.revenue.length === 0 ? (
                        <tr>
                          <td colSpan={showComparison ? 6 : 3} className={`px-4 py-4 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>
                            No revenue accounts found
                          </td>
                        </tr>
                      ) : (
                        processed.revenue.map((row, i) => {
                          const amt = parseFloat(row.amount) || 0;
                          const prev = processedComparison?.map[row.account_code] || 0;
                          const variance = amt - prev;
                          return (
                            <tr key={i} className={`border-t ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}>
                              <td className={`px-4 py-2 text-sm font-mono ${ft('text-slate-500', 'text-zinc-500')}`}>{row.account_code}</td>
                              <td className={`px-4 py-2 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>{row.account_name}</td>
                              <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                                {formatCurrency(amt)}
                              </td>
                              {showComparison && (
                                <>
                                  <td className={`px-4 py-2 text-sm text-right tabular-nums ${ft('text-slate-500', 'text-zinc-500')}`}>
                                    {formatCurrency(prev)}
                                  </td>
                                  <td className={`px-4 py-2 text-sm text-right tabular-nums font-medium ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(variance)}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <VarianceIndicator current={amt} previous={prev} />
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                      {/* Subtotal */}
                      <tr className={`border-t-2 ${ft('border-slate-200 bg-green-50/30', 'border-zinc-700 bg-green-500/[0.03]')}`}>
                        <td className="px-4 py-2" />
                        <td className={`px-4 py-2 text-sm font-bold ${ft('text-green-700', 'text-green-400')}`}>Total Revenue</td>
                        <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${ft('text-green-700', 'text-green-400')}`}>
                          {formatCurrency(processed.totalRevenue)}
                        </td>
                        {showComparison && (
                          <>
                            <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${ft('text-slate-500', 'text-zinc-500')}`}>
                              {formatCurrency(processedComparison.totalRevenue)}
                            </td>
                            <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${
                              processed.totalRevenue - processedComparison.totalRevenue >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatCurrency(processed.totalRevenue - processedComparison.totalRevenue)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <VarianceIndicator current={processed.totalRevenue} previous={processedComparison.totalRevenue} />
                            </td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Expenses Section */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-0">
                  <div className={`px-4 py-3 border-b ${ft('border-slate-100 bg-red-50/50', 'border-zinc-800 bg-red-500/[0.03]')}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-semibold ${ft('text-red-700', 'text-red-400')}`}>Expenses</h3>
                      <span className={`text-sm font-bold ${ft('text-red-700', 'text-red-400')}`}>
                        {formatCurrency(processed.totalExpenses)}
                      </span>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className={`text-[11px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                        <th className="text-left px-4 py-2 font-medium w-24">Code</th>
                        <th className="text-left px-4 py-2 font-medium">Account</th>
                        <th className="text-right px-4 py-2 font-medium w-32">Amount</th>
                        {showComparison && (
                          <>
                            <th className="text-right px-4 py-2 font-medium w-32">Previous</th>
                            <th className="text-right px-4 py-2 font-medium w-28">Variance</th>
                            <th className="text-right px-4 py-2 font-medium w-20">%</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {processed.expenses.length === 0 ? (
                        <tr>
                          <td colSpan={showComparison ? 6 : 3} className={`px-4 py-4 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>
                            No expense accounts found
                          </td>
                        </tr>
                      ) : (
                        processed.expenses.map((row, i) => {
                          const amt = parseFloat(row.amount) || 0;
                          const prev = processedComparison?.map[row.account_code] || 0;
                          const variance = amt - prev;
                          return (
                            <tr key={i} className={`border-t ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}>
                              <td className={`px-4 py-2 text-sm font-mono ${ft('text-slate-500', 'text-zinc-500')}`}>{row.account_code}</td>
                              <td className={`px-4 py-2 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>{row.account_name}</td>
                              <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                                {formatCurrency(amt)}
                              </td>
                              {showComparison && (
                                <>
                                  <td className={`px-4 py-2 text-sm text-right tabular-nums ${ft('text-slate-500', 'text-zinc-500')}`}>
                                    {formatCurrency(prev)}
                                  </td>
                                  <td className={`px-4 py-2 text-sm text-right tabular-nums font-medium ${variance <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(variance)}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <VarianceIndicator current={amt} previous={prev} inverse />
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                      {/* Subtotal */}
                      <tr className={`border-t-2 ${ft('border-slate-200 bg-red-50/30', 'border-zinc-700 bg-red-500/[0.03]')}`}>
                        <td className="px-4 py-2" />
                        <td className={`px-4 py-2 text-sm font-bold ${ft('text-red-700', 'text-red-400')}`}>Total Expenses</td>
                        <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${ft('text-red-700', 'text-red-400')}`}>
                          {formatCurrency(processed.totalExpenses)}
                        </td>
                        {showComparison && (
                          <>
                            <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${ft('text-slate-500', 'text-zinc-500')}`}>
                              {formatCurrency(processedComparison.totalExpenses)}
                            </td>
                            <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${
                              processed.totalExpenses - processedComparison.totalExpenses <= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatCurrency(processed.totalExpenses - processedComparison.totalExpenses)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <VarianceIndicator current={processed.totalExpenses} previous={processedComparison.totalExpenses} inverse />
                            </td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Net Income Summary */}
              <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} ${
                processed.netIncome >= 0 ? 'ring-1 ring-green-500/20' : 'ring-1 ring-red-500/20'
              }`}>
                <CardContent className="p-0">
                  <table className="w-full">
                    <tbody>
                      {/* Gross Profit row (Revenue - COGS if applicable, same as net for now) */}
                      <tr className={`border-b ${ft('border-slate-100', 'border-zinc-800')}`}>
                        <td className="w-24 px-4 py-3" />
                        <td className={`px-4 py-3 text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>
                          <div className="flex items-center gap-2">
                            <Minus className="w-3.5 h-3.5" />
                            Operating Result
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold tabular-nums w-32 ${ft('text-slate-700', 'text-zinc-300')}`}>
                          {formatCurrency(processed.netIncome)}
                        </td>
                        {showComparison && (
                          <>
                            <td className={`px-4 py-3 text-sm text-right tabular-nums w-32 ${ft('text-slate-500', 'text-zinc-500')}`}>
                              {formatCurrency(processedComparison.netIncome)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right tabular-nums font-medium w-28 ${
                              processed.netIncome - processedComparison.netIncome >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatCurrency(processed.netIncome - processedComparison.netIncome)}
                            </td>
                            <td className="px-4 py-3 text-right w-20">
                              <VarianceIndicator current={processed.netIncome} previous={processedComparison.netIncome} />
                            </td>
                          </>
                        )}
                      </tr>
                      {/* Net Income - highlighted */}
                      <tr className={processed.netIncome >= 0
                        ? ft('bg-green-50', 'bg-green-500/[0.05]')
                        : ft('bg-red-50', 'bg-red-500/[0.05]')
                      }>
                        <td className="w-24 px-4 py-4" />
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {processed.netIncome >= 0
                              ? <TrendingUp className="w-5 h-5 text-green-500" />
                              : <TrendingDown className="w-5 h-5 text-red-500" />
                            }
                            <span className={`text-base font-bold ${processed.netIncome >= 0
                              ? ft('text-green-700', 'text-green-400')
                              : ft('text-red-700', 'text-red-400')
                            }`}>
                              Net Income
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-4 text-right text-lg font-bold tabular-nums w-32 ${
                          processed.netIncome >= 0
                            ? ft('text-green-700', 'text-green-400')
                            : ft('text-red-700', 'text-red-400')
                        }`}>
                          {formatCurrency(processed.netIncome)}
                        </td>
                        {showComparison && (
                          <>
                            <td className={`px-4 py-4 text-right text-base font-bold tabular-nums w-32 ${ft('text-slate-500', 'text-zinc-400')}`}>
                              {formatCurrency(processedComparison.netIncome)}
                            </td>
                            <td className={`px-4 py-4 text-right text-base font-bold tabular-nums w-28 ${
                              processed.netIncome - processedComparison.netIncome >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatCurrency(processed.netIncome - processedComparison.netIncome)}
                            </td>
                            <td className="px-4 py-4 text-right w-20">
                              <VarianceIndicator current={processed.netIncome} previous={processedComparison.netIncome} />
                            </td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* No Data State */}
              {processed.revenue.length === 0 && processed.expenses.length === 0 && (
                <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${ft('text-slate-300', 'text-zinc-600')}`} />
                    <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                      No transactions found for this period. Post journal entries to generate reports.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:space-y-2 > * + * { margin-top: 0.5rem; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </>
  );

  if (embedded) return content;

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        {content}
      </div>
    </FinancePageTransition>
  );
}
