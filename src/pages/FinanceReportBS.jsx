import React, { useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  Scale, Download, Sun, Moon, AlertCircle, Printer, BarChart3,
  ArrowUpRight, ArrowDownRight, RefreshCw, FileText, CheckCircle, AlertTriangle
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

function today() { return new Date().toISOString().slice(0, 10); }

function endOfLastMonth() {
  const d = new Date(); d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function endOfLastQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const d = new Date(now.getFullYear(), q * 3, 0);
  return d.toISOString().slice(0, 10);
}

function endOfLastYear() {
  return `${new Date().getFullYear() - 1}-12-31`;
}

function getPreviousDate(asOf) {
  // Same day, one year ago
  const d = new Date(asOf);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Variance Indicator ──────────────────────────────────────────────────────
function VarianceIndicator({ current, previous }) {
  if (!previous || previous === 0) return <span className="text-zinc-500">—</span>;
  const change = current - previous;
  const pct = (change / Math.abs(previous)) * 100;
  const isPositive = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {formatPercent(pct)}
    </span>
  );
}

// ── Mini Stacked Bar ────────────────────────────────────────────────────────
function BalanceBar({ assets, liabilities, equity, ft }) {
  const total = Math.max(assets, liabilities + equity, 1);
  const liabPct = (liabilities / total) * 100;
  const eqPct = (equity / total) * 100;

  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between mb-1">
          <span className={`text-[10px] ${ft('text-slate-500', 'text-zinc-500')}`}>Assets</span>
          <span className={`text-[10px] font-medium ${ft('text-slate-600', 'text-zinc-400')}`}>{formatCurrency(assets)}</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${ft('bg-slate-100', 'bg-zinc-800')}`}>
          <div className="h-full rounded-full bg-blue-500/60" style={{ width: '100%' }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className={`text-[10px] ${ft('text-slate-500', 'text-zinc-500')}`}>Liabilities + Equity</span>
          <span className={`text-[10px] font-medium ${ft('text-slate-600', 'text-zinc-400')}`}>{formatCurrency(liabilities + equity)}</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden flex ${ft('bg-slate-100', 'bg-zinc-800')}`}>
          <div className="h-full bg-amber-500/60" style={{ width: `${liabPct}%` }} />
          <div className="h-full bg-purple-500/60" style={{ width: `${eqPct}%` }} />
        </div>
        <div className="flex gap-3 mt-1">
          <span className="flex items-center gap-1 text-[9px] text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500/60" />Liabilities</span>
          <span className="flex items-center gap-1 text-[9px] text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-500/60" />Equity</span>
        </div>
      </div>
    </div>
  );
}

const DATE_BUTTONS = [
  { key: 'today', label: 'Today', fn: today },
  { key: 'last_month', label: 'End of Last Month', fn: endOfLastMonth },
  { key: 'last_quarter', label: 'End of Last Quarter', fn: endOfLastQuarter },
  { key: 'last_year', label: 'End of Last Year', fn: endOfLastYear },
  { key: 'custom', label: 'Custom' },
];

// ── Section Table ───────────────────────────────────────────────────────────
function SectionTable({ title, color, subcategories, totals, showComparison, comparisonMap, comparisonTotals, ft }) {
  const colorMap = {
    blue: { header: ft('text-blue-700 bg-blue-50/50', 'text-blue-400 bg-blue-500/[0.03]'), border: ft('border-blue-100', 'border-blue-500/10'),
            total: ft('text-blue-700', 'text-blue-400'), totalBg: ft('bg-blue-50/30', 'bg-blue-500/[0.03]') },
    amber: { header: ft('text-amber-700 bg-amber-50/50', 'text-amber-400 bg-amber-500/[0.03]'), border: ft('border-amber-100', 'border-amber-500/10'),
             total: ft('text-amber-700', 'text-amber-400'), totalBg: ft('bg-amber-50/30', 'bg-amber-500/[0.03]') },
    purple: { header: ft('text-purple-700 bg-purple-50/50', 'text-purple-400 bg-purple-500/[0.03]'), border: ft('border-purple-100', 'border-purple-500/10'),
              total: ft('text-purple-700', 'text-purple-400'), totalBg: ft('bg-purple-50/30', 'bg-purple-500/[0.03]') },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
      <CardContent className="p-0">
        {/* Section Header */}
        <div className={`px-4 py-3 border-b ${ft('border-slate-100', 'border-zinc-800')} ${c.header}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{title}</h3>
            <span className="text-sm font-bold">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className={`text-[11px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
              <th className="text-left px-4 py-2 font-medium w-24">Code</th>
              <th className="text-left px-4 py-2 font-medium">Account</th>
              <th className="text-right px-4 py-2 font-medium w-32">Balance</th>
              {showComparison && (
                <>
                  <th className="text-right px-4 py-2 font-medium w-32">Previous</th>
                  <th className="text-right px-4 py-2 font-medium w-28">Change</th>
                  <th className="text-right px-4 py-2 font-medium w-20">%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {Object.entries(subcategories).map(([subName, rows]) => (
              <React.Fragment key={subName}>
                {/* Subcategory header */}
                {Object.keys(subcategories).length > 1 && (
                  <tr>
                    <td colSpan={showComparison ? 6 : 3}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${ft('text-slate-400 bg-slate-50/50', 'text-zinc-500 bg-zinc-800/20')}`}>
                      {subName}
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => {
                  const bal = parseFloat(row.balance) || 0;
                  const prev = comparisonMap?.[row.account_code] || 0;
                  const change = bal - prev;
                  return (
                    <tr key={i} className={`border-t ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}>
                      <td className={`px-4 py-2 text-sm font-mono ${ft('text-slate-500', 'text-zinc-500')}`}>{row.account_code}</td>
                      <td className={`px-4 py-2 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>{row.account_name}</td>
                      <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                        {formatCurrency(bal)}
                      </td>
                      {showComparison && (
                        <>
                          <td className={`px-4 py-2 text-sm text-right tabular-nums ${ft('text-slate-500', 'text-zinc-500')}`}>
                            {formatCurrency(prev)}
                          </td>
                          <td className={`px-4 py-2 text-sm text-right tabular-nums font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(change)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <VarianceIndicator current={bal} previous={prev} />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {/* Subcategory subtotal */}
                {Object.keys(subcategories).length > 1 && (
                  <tr className={`border-t ${ft('border-slate-100', 'border-zinc-800')}`}>
                    <td className="px-4 py-1.5" />
                    <td className={`px-4 py-1.5 text-xs font-semibold ${ft('text-slate-500', 'text-zinc-500')}`}>
                      Total {subName}
                    </td>
                    <td className={`px-4 py-1.5 text-xs text-right font-semibold tabular-nums ${ft('text-slate-600', 'text-zinc-400')}`}>
                      {formatCurrency(rows.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0))}
                    </td>
                    {showComparison && <td colSpan={3} />}
                  </tr>
                )}
              </React.Fragment>
            ))}

            {/* Section Total */}
            <tr className={`border-t-2 ${ft('border-slate-200', 'border-zinc-700')} ${c.totalBg}`}>
              <td className="px-4 py-2" />
              <td className={`px-4 py-2 text-sm font-bold ${c.total}`}>{totals.label}</td>
              <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${c.total}`}>
                {formatCurrency(totals.total)}
              </td>
              {showComparison && comparisonTotals && (
                <>
                  <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${ft('text-slate-500', 'text-zinc-500')}`}>
                    {formatCurrency(comparisonTotals.total)}
                  </td>
                  <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${
                    totals.total - comparisonTotals.total >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(totals.total - comparisonTotals.total)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <VarianceIndicator current={totals.total} previous={comparisonTotals.total} />
                  </td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function FinanceReportBS() {
  const [asOfDate, setAsOfDate] = useState(today);
  const [activePeriod, setActivePeriod] = useState('today');
  const [compare, setCompare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [generated, setGenerated] = useState(false);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);

  const handlePeriodClick = (p) => {
    setActivePeriod(p.key);
    if (p.fn) setAsOfDate(p.fn());
  };

  const processRows = (rows) => {
    const assets = { subcategories: {}, total: 0 };
    const liabilities = { subcategories: {}, total: 0 };
    const equity = { subcategories: {}, total: 0 };
    let totalLiabilitiesEquity = 0;
    const accountMap = {};

    for (const row of rows) {
      if (row.is_summary) {
        if (row.account_name === 'Total Assets') assets.total = parseFloat(row.balance) || 0;
        else if (row.account_name === 'Total Liabilities') liabilities.total = parseFloat(row.balance) || 0;
        else if (row.account_name === 'Total Equity') equity.total = parseFloat(row.balance) || 0;
        else if (row.account_name === 'Total Liabilities & Equity') totalLiabilitiesEquity = parseFloat(row.balance) || 0;
        continue;
      }

      if (row.account_code) accountMap[row.account_code] = parseFloat(row.balance) || 0;

      const sub = row.subcategory || row.category || 'Other';
      if (row.category === 'Assets') {
        if (!assets.subcategories[sub]) assets.subcategories[sub] = [];
        assets.subcategories[sub].push(row);
      } else if (row.category === 'Liabilities') {
        if (!liabilities.subcategories[sub]) liabilities.subcategories[sub] = [];
        liabilities.subcategories[sub].push(row);
      } else if (row.category === 'Equity') {
        if (!equity.subcategories[sub]) equity.subcategories[sub] = [];
        equity.subcategories[sub].push(row);
      }
    }

    return { assets, liabilities, equity, totalLiabilitiesEquity, accountMap };
  };

  const fetchReport = useCallback(async () => {
    if (!user?.company_id) { toast.error('No company context'); return; }
    setLoading(true);
    setGenerated(false);
    try {
      const { data, error } = await supabase.rpc('get_balance_sheet', {
        p_company_id: user.company_id,
        p_as_of_date: asOfDate,
      });
      if (error) throw error;
      setReportData(data || []);

      if (compare) {
        const prevDate = getPreviousDate(asOfDate);
        const { data: prevData, error: prevErr } = await supabase.rpc('get_balance_sheet', {
          p_company_id: user.company_id,
          p_as_of_date: prevDate,
        });
        if (prevErr) throw prevErr;
        setComparisonData({ data: prevData || [], asOf: prevDate });
      } else {
        setComparisonData(null);
      }

      setGenerated(true);
    } catch (err) {
      console.error('Error fetching balance sheet:', err);
      toast.error('Failed to generate report');
      setReportData(null);
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, asOfDate, compare]);

  const processed = useMemo(() => reportData ? processRows(reportData) : null, [reportData]);
  const processedComparison = useMemo(() => comparisonData?.data ? processRows(comparisonData.data) : null, [comparisonData]);
  const showComparison = compare && processedComparison;

  const isBalanced = processed ? Math.abs(processed.assets.total - processed.totalLiabilitiesEquity) < 0.01 : true;
  const balanceDiff = processed ? processed.assets.total - processed.totalLiabilitiesEquity : 0;

  // CSV export
  const exportCSV = () => {
    if (!processed) { toast.error('Generate report first'); return; }
    const headers = ['Category', 'Subcategory', 'Code', 'Account', 'Balance'];
    if (showComparison) headers.push('Previous', 'Change');
    const csvRows = [headers.join(',')];

    const addSection = (name, section) => {
      Object.entries(section.subcategories).forEach(([sub, rows]) => {
        rows.forEach(r => {
          const bal = parseFloat(r.balance) || 0;
          const cols = [name, sub, r.account_code || '', `"${r.account_name}"`, bal.toFixed(2)];
          if (showComparison) {
            const prev = processedComparison?.accountMap[r.account_code] || 0;
            cols.push(prev.toFixed(2), (bal - prev).toFixed(2));
          }
          csvRows.push(cols.join(','));
        });
      });
      const cols = ['', '', '', `"Total ${name}"`, section.total.toFixed(2)];
      if (showComparison) {
        const prevSection = name === 'Assets' ? processedComparison?.assets : name === 'Liabilities' ? processedComparison?.liabilities : processedComparison?.equity;
        cols.push((prevSection?.total || 0).toFixed(2), (section.total - (prevSection?.total || 0)).toFixed(2));
      }
      csvRows.push(cols.join(','));
      csvRows.push('');
    };

    addSection('Assets', processed.assets);
    addSection('Liabilities', processed.liabilities);
    addSection('Equity', processed.equity);

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  if (permLoading) {
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
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view financial reports.</p>
      </div>
    );
  }

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">

          {/* Header */}
          <div className="print:hidden">
            <PageHeader
              icon={Scale}
              title="Balance Sheet"
              subtitle="Assets = Liabilities + Equity at a point in time"
              color="blue"
              actions={
                <div className="flex gap-3">
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </div>
              }
            />
          </div>

          {/* Controls */}
          <Card className={`print:hidden ${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}`}>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className={`text-xs font-medium mb-2 block ${ft('text-slate-500', 'text-zinc-500')}`}>As Of Date</Label>
                <div className="flex flex-wrap gap-2">
                  {DATE_BUTTONS.map(p => (
                    <button key={p.key} onClick={() => handlePeriodClick(p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        activePeriod === p.key
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : ft('bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100',
                              'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800')
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {activePeriod === 'custom' && (
                <div className="max-w-xs">
                  <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>Date</Label>
                  <Input type="date" value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    className={`mt-1 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500" />
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Compare to Same Date Last Year</span>
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
                    <Button variant="outline" onClick={() => window.print()}
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
                  Select a date and generate the report
                </h3>
                <p className={`text-sm ${ft('text-slate-500', 'text-zinc-500')}`}>
                  Choose an "as of" date above, then click "Generate Report" to view your Balance Sheet.
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

          {/* Report */}
          {generated && processed && (
            <div className="space-y-4 print:space-y-2">

              {/* Report Header */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs uppercase tracking-wider mb-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        {user?.company_name || 'Company'}
                      </p>
                      <h2 className={`text-xl font-bold ${ft('text-slate-900', 'text-white')}`}>Balance Sheet</h2>
                      <p className={`text-sm mt-1 ${ft('text-slate-500', 'text-zinc-400')}`}>
                        As of {formatDate(asOfDate)}
                      </p>
                      {showComparison && (
                        <p className={`text-xs mt-0.5 ${ft('text-slate-400', 'text-zinc-500')}`}>
                          Compared to: {formatDate(comparisonData.asOf)}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        Generated: {new Date().toLocaleString()}
                      </p>
                    </div>
                    <div className="w-40 print:hidden">
                      <BalanceBar
                        assets={processed.assets.total}
                        liabilities={processed.liabilities.total}
                        equity={processed.equity.total}
                        ft={ft}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assets */}
              <SectionTable
                title="ASSETS"
                color="blue"
                subcategories={processed.assets.subcategories}
                totals={{ total: processed.assets.total, label: 'Total Assets' }}
                showComparison={showComparison}
                comparisonMap={processedComparison?.accountMap}
                comparisonTotals={processedComparison ? { total: processedComparison.assets.total } : null}
                ft={ft}
              />

              {/* Liabilities */}
              <SectionTable
                title="LIABILITIES"
                color="amber"
                subcategories={processed.liabilities.subcategories}
                totals={{ total: processed.liabilities.total, label: 'Total Liabilities' }}
                showComparison={showComparison}
                comparisonMap={processedComparison?.accountMap}
                comparisonTotals={processedComparison ? { total: processedComparison.liabilities.total } : null}
                ft={ft}
              />

              {/* Equity */}
              <SectionTable
                title="EQUITY"
                color="purple"
                subcategories={processed.equity.subcategories}
                totals={{ total: processed.equity.total, label: 'Total Equity' }}
                showComparison={showComparison}
                comparisonMap={processedComparison?.accountMap}
                comparisonTotals={processedComparison ? { total: processedComparison.equity.total } : null}
                ft={ft}
              />

              {/* Balance Check */}
              <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} ${
                isBalanced ? 'ring-1 ring-green-500/20' : 'ring-1 ring-red-500/20'
              }`}>
                <CardContent className="p-0">
                  <table className="w-full">
                    <tbody>
                      <tr className={`border-b ${ft('border-slate-100', 'border-zinc-800')}`}>
                        <td className="w-24 px-4 py-3" />
                        <td className={`px-4 py-3 text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>
                          Total Liabilities & Equity
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold tabular-nums w-32 ${ft('text-slate-700', 'text-zinc-300')}`}>
                          {formatCurrency(processed.totalLiabilitiesEquity)}
                        </td>
                        {showComparison && (
                          <>
                            <td className={`px-4 py-3 text-sm text-right tabular-nums w-32 ${ft('text-slate-500', 'text-zinc-500')}`}>
                              {formatCurrency(processedComparison.totalLiabilitiesEquity)}
                            </td>
                            <td className="w-28 px-4 py-3" />
                            <td className="w-20 px-4 py-3" />
                          </>
                        )}
                      </tr>
                      <tr className={isBalanced
                        ? ft('bg-green-50', 'bg-green-500/[0.05]')
                        : ft('bg-red-50', 'bg-red-500/[0.05]')
                      }>
                        <td className="w-24 px-4 py-4" />
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {isBalanced
                              ? <CheckCircle className="w-5 h-5 text-green-500" />
                              : <AlertTriangle className="w-5 h-5 text-red-500" />
                            }
                            <span className={`text-base font-bold ${isBalanced
                              ? ft('text-green-700', 'text-green-400')
                              : ft('text-red-700', 'text-red-400')
                            }`}>
                              {isBalanced ? 'Balance Sheet is Balanced' : 'Balance Sheet is NOT Balanced'}
                            </span>
                          </div>
                          {!isBalanced && (
                            <p className={`text-xs mt-1 ml-7 ${ft('text-red-600', 'text-red-400')}`}>
                              Difference: {formatCurrency(balanceDiff)} (Assets - Liabilities & Equity)
                            </p>
                          )}
                        </td>
                        <td className={`px-4 py-4 text-right text-lg font-bold tabular-nums w-32 ${
                          isBalanced ? ft('text-green-700', 'text-green-400') : ft('text-red-700', 'text-red-400')
                        }`}>
                          {isBalanced ? '✓' : '⚠'}
                        </td>
                        {showComparison && (
                          <>
                            <td className="w-32 px-4 py-4" />
                            <td className="w-28 px-4 py-4" />
                            <td className="w-20 px-4 py-4" />
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* No Data */}
              {Object.keys(processed.assets.subcategories).length === 0 &&
               Object.keys(processed.liabilities.subcategories).length === 0 &&
               Object.keys(processed.equity.subcategories).length === 0 && (
                <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${ft('text-slate-300', 'text-zinc-600')}`} />
                    <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                      No transactions found as of this date. Post journal entries to generate reports.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:space-y-2 > * + * { margin-top: 0.5rem; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </FinancePageTransition>
  );
}
