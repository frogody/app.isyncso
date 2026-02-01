import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  FileSpreadsheet, Download, Sun, Moon, AlertCircle, Printer,
  BarChart3, RefreshCw, FileText, CheckCircle, AlertTriangle,
  ExternalLink
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

function todayStr() { return new Date().toISOString().slice(0, 10); }

function endOfLastMonth() {
  const d = new Date(); d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function endOfLastQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 0).toISOString().slice(0, 10);
}

const TYPE_COLORS = {
  Asset:     { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  Liability: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  Equity:    { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  Revenue:   { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
  Expense:   { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
};

const DATE_BUTTONS = [
  { key: 'today', label: 'Today', fn: todayStr },
  { key: 'last_month', label: 'End of Last Month', fn: endOfLastMonth },
  { key: 'last_quarter', label: 'End of Last Quarter', fn: endOfLastQuarter },
  { key: 'custom', label: 'Custom' },
];

export default function FinanceReportTB() {
  const [asOfDate, setAsOfDate] = useState(todayStr);
  const [activePeriod, setActivePeriod] = useState('today');
  const [includeZero, setIncludeZero] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generated, setGenerated] = useState(false);

  const navigate = useNavigate();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);

  const handlePeriodClick = (p) => {
    setActivePeriod(p.key);
    if (p.fn) setAsOfDate(p.fn());
  };

  const fetchReport = useCallback(async () => {
    if (!user?.company_id) { toast.error('No company context'); return; }
    setLoading(true);
    setGenerated(false);
    try {
      const { data, error } = await supabase.rpc('get_trial_balance', {
        p_company_id: user.company_id,
        p_as_of_date: asOfDate,
      });
      if (error) throw error;
      setReportData(data || []);
      setGenerated(true);
    } catch (err) {
      console.error('Error fetching trial balance:', err);
      toast.error('Failed to generate report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, asOfDate]);

  // Process data
  const processed = useMemo(() => {
    if (!reportData) return null;

    let rows = reportData;
    if (!includeZero) {
      rows = rows.filter(r => (parseFloat(r.debit_balance) || 0) !== 0 || (parseFloat(r.credit_balance) || 0) !== 0);
    }

    // Group by type
    const groups = {};
    const typeOrder = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    for (const row of rows) {
      const t = row.account_type || 'Other';
      if (!groups[t]) groups[t] = [];
      groups[t].push(row);
    }

    // Ordered groups
    const orderedGroups = [];
    for (const t of typeOrder) {
      if (groups[t]) orderedGroups.push({ type: t, rows: groups[t] });
    }
    // Any remaining types
    for (const t of Object.keys(groups)) {
      if (!typeOrder.includes(t)) orderedGroups.push({ type: t, rows: groups[t] });
    }

    let totalDebits = 0;
    let totalCredits = 0;
    for (const row of rows) {
      totalDebits += parseFloat(row.debit_balance) || 0;
      totalCredits += parseFloat(row.credit_balance) || 0;
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    const difference = totalDebits - totalCredits;

    return { groups: orderedGroups, totalDebits, totalCredits, isBalanced, difference, rowCount: rows.length };
  }, [reportData, includeZero]);

  // CSV export
  const exportCSV = () => {
    if (!processed) { toast.error('Generate report first'); return; }
    const headers = ['Account Code', 'Account Name', 'Account Type', 'Debit', 'Credit'];
    const csvRows = [headers.join(',')];

    for (const group of processed.groups) {
      for (const r of group.rows) {
        csvRows.push([
          r.account_code,
          `"${(r.account_name || '').replace(/"/g, '""')}"`,
          r.account_type,
          (parseFloat(r.debit_balance) || 0).toFixed(2),
          (parseFloat(r.credit_balance) || 0).toFixed(2),
        ].join(','));
      }
    }
    csvRows.push('');
    csvRows.push(['', '', 'TOTALS', processed.totalDebits.toFixed(2), processed.totalCredits.toFixed(2)].join(','));

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const openLedger = (accountId) => {
    navigate(createPageUrl('FinanceGeneralLedger') + `?account=${accountId}`);
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
              icon={FileSpreadsheet}
              title="Trial Balance"
              subtitle="Verify that total debits equal total credits across all accounts"
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
                  <input type="checkbox" checked={includeZero} onChange={e => setIncludeZero(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500" />
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Include Zero Balances</span>
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
                  The Trial Balance verifies that total debits equal total credits across all accounts.
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
                      <h2 className={`text-xl font-bold ${ft('text-slate-900', 'text-white')}`}>Trial Balance</h2>
                      <p className={`text-sm mt-1 ${ft('text-slate-500', 'text-zinc-400')}`}>
                        As of {formatDate(asOfDate)}
                      </p>
                      <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        Generated: {new Date().toLocaleString()} · {processed.rowCount} accounts
                      </p>
                    </div>
                    {/* Balance Status Badge */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                      processed.isBalanced
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {processed.isBalanced
                        ? <CheckCircle className="w-5 h-5" />
                        : <AlertTriangle className="w-5 h-5" />
                      }
                      <span className="text-sm font-semibold">
                        {processed.isBalanced ? 'Balanced' : 'Unbalanced'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trial Balance Table */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-[11px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                        <th className="text-left px-4 py-2.5 font-medium w-24">Code</th>
                        <th className="text-left px-4 py-2.5 font-medium">Account Name</th>
                        <th className="text-center px-4 py-2.5 font-medium w-24">Type</th>
                        <th className="text-right px-4 py-2.5 font-medium w-36">Debit</th>
                        <th className="text-right px-4 py-2.5 font-medium w-36">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processed.groups.map((group) => {
                        const tc = TYPE_COLORS[group.type] || TYPE_COLORS.Asset;
                        const groupDebit = group.rows.reduce((s, r) => s + (parseFloat(r.debit_balance) || 0), 0);
                        const groupCredit = group.rows.reduce((s, r) => s + (parseFloat(r.credit_balance) || 0), 0);

                        return (
                          <React.Fragment key={group.type}>
                            {/* Type Header */}
                            <tr>
                              <td colSpan={5}
                                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                                  ft('bg-slate-50/80 text-slate-500', 'bg-zinc-800/40 text-zinc-500')
                                }`}>
                                <span className={`inline-flex items-center gap-1.5 ${tc.text}`}>
                                  {group.type}s
                                  <span className={`text-[10px] font-normal ${ft('text-slate-400', 'text-zinc-600')}`}>
                                    ({group.rows.length})
                                  </span>
                                </span>
                              </td>
                            </tr>
                            {/* Account Rows */}
                            {group.rows.map((row, i) => {
                              const debit = parseFloat(row.debit_balance) || 0;
                              const credit = parseFloat(row.credit_balance) || 0;
                              return (
                                <tr key={row.account_id || i}
                                  className={`border-t cursor-pointer group ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}
                                  onClick={() => openLedger(row.account_id)}>
                                  <td className={`px-4 py-2 text-sm font-mono ${ft('text-slate-500', 'text-zinc-500')}`}>
                                    {row.account_code}
                                  </td>
                                  <td className={`px-4 py-2 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>
                                    <span className="flex items-center gap-1.5">
                                      {row.account_name}
                                      <ExternalLink className={`w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ${ft('text-slate-400', 'text-zinc-500')}`} />
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}>
                                      {row.account_type}
                                    </span>
                                  </td>
                                  <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${
                                    debit > 0 ? ft('text-slate-900', 'text-white') : ft('text-slate-300', 'text-zinc-700')
                                  }`}>
                                    {debit > 0 ? formatCurrency(debit) : '—'}
                                  </td>
                                  <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${
                                    credit > 0 ? ft('text-slate-900', 'text-white') : ft('text-slate-300', 'text-zinc-700')
                                  }`}>
                                    {credit > 0 ? formatCurrency(credit) : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Type Subtotal */}
                            <tr className={`border-t ${ft('border-slate-100 bg-slate-50/30', 'border-zinc-800 bg-zinc-800/20')}`}>
                              <td className="px-4 py-1.5" />
                              <td className={`px-4 py-1.5 text-xs font-semibold ${ft('text-slate-500', 'text-zinc-500')}`}>
                                Total {group.type}s
                              </td>
                              <td />
                              <td className={`px-4 py-1.5 text-xs text-right font-semibold tabular-nums ${ft('text-slate-600', 'text-zinc-400')}`}>
                                {groupDebit > 0 ? formatCurrency(groupDebit) : '—'}
                              </td>
                              <td className={`px-4 py-1.5 text-xs text-right font-semibold tabular-nums ${ft('text-slate-600', 'text-zinc-400')}`}>
                                {groupCredit > 0 ? formatCurrency(groupCredit) : '—'}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>

                    {/* Totals Footer */}
                    <tfoot>
                      <tr className={`border-t-2 ${ft('border-slate-300 bg-slate-50', 'border-zinc-600 bg-zinc-800/50')}`}>
                        <td className="px-4 py-3" />
                        <td className={`px-4 py-3 text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>
                          TOTALS
                        </td>
                        <td />
                        <td className={`px-4 py-3 text-sm text-right font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                          {formatCurrency(processed.totalDebits)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                          {formatCurrency(processed.totalCredits)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>

              {/* Balance Check */}
              <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} ${
                processed.isBalanced ? 'ring-1 ring-green-500/20' : 'ring-1 ring-red-500/20'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {processed.isBalanced
                      ? <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      : <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                    }
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${
                        processed.isBalanced ? ft('text-green-700', 'text-green-400') : ft('text-red-700', 'text-red-400')
                      }`}>
                        {processed.isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is NOT Balanced'}
                      </h3>
                      <p className={`text-sm mt-0.5 ${ft('text-slate-500', 'text-zinc-400')}`}>
                        Total Debits: {formatCurrency(processed.totalDebits)} · Total Credits: {formatCurrency(processed.totalCredits)}
                      </p>
                    </div>
                    {processed.isBalanced && (
                      <span className="text-3xl">✓</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Unbalanced Analysis */}
              {!processed.isBalanced && (
                <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} border-red-500/20`}>
                  <CardContent className="p-6 space-y-3">
                    <h4 className={`text-sm font-semibold ${ft('text-red-700', 'text-red-400')}`}>
                      Difference: {formatCurrency(processed.difference)}
                    </h4>
                    <div className={`text-sm space-y-2 ${ft('text-slate-600', 'text-zinc-400')}`}>
                      <p className="font-medium">Common causes of imbalance:</p>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li>Off by a round number? Look for a missing or duplicated entry of that amount.</li>
                        <li>Off by a number divisible by 9? Likely a transposition error (e.g., 54 vs 45).</li>
                        <li>Off by exactly 2× an amount? A debit may have been posted as a credit or vice versa.</li>
                        <li>Opening balances may not have been entered as balanced journal entries.</li>
                      </ul>
                    </div>
                    <Button variant="outline" size="sm"
                      className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                      onClick={() => navigate(createPageUrl('FinanceJournalEntries'))}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Review Journal Entries
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* No Data */}
              {processed.rowCount === 0 && (
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
