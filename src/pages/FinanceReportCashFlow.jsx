import React, { useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  Wallet, Download, Sun, Moon, AlertCircle,
  Printer, BarChart3, RefreshCw, FileText, ArrowUpRight, ArrowDownRight
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

const PERIOD_BUTTONS = [
  { key: 'this_month', label: 'This Month', fn: () => getMonthRange(0) },
  { key: 'last_month', label: 'Last Month', fn: () => getMonthRange(-1) },
  { key: 'this_quarter', label: 'This Quarter', fn: getQuarterRange },
  { key: 'this_year', label: 'This Year', fn: getYearRange },
  { key: 'custom', label: 'Custom' },
];

const SECTION_CONFIG = {
  'Operating': { color: 'blue', label: 'Operating Activities' },
  'Investing': { color: 'purple', label: 'Investing Activities' },
  'Financing': { color: 'amber', label: 'Financing Activities' },
};

export default function FinanceReportCashFlow({ embedded = false }) {
  const [dateRange, setDateRange] = useState(getMonthRange);
  const [activePeriod, setActivePeriod] = useState('this_month');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
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
      const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('company_id', user.company_id);
      if (!count || count === 0) {
        toast.error('Initialize your Chart of Accounts first (Ledger > Chart of Accounts)');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_cash_flow', {
        p_company_id: user.company_id,
        p_start_date: dateRange.from,
        p_end_date: dateRange.to,
      });

      if (error) {
        console.error('[FinanceReportCashFlow] get_cash_flow error:', error);
        if (error.message?.includes('404') || error.code === 'PGRST202') {
          toast.error('Cash Flow report function not available. Please contact support.');
          setReportData([]);
          setGenerated(true);
          return;
        }
        throw error;
      }

      setReportData(data || []);
      setGenerated(true);
    } catch (err) {
      console.error('Error fetching Cash Flow:', err);
      toast.error('Failed to generate report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, dateRange]);

  // Process report data into sections
  const processed = useMemo(() => {
    if (!reportData) return null;

    const sections = { Operating: [], Investing: [], Financing: [] };
    const subtotals = { Operating: 0, Investing: 0, Financing: 0 };
    let netChange = 0;
    let beginningCash = 0;
    let endingCash = 0;

    for (const row of reportData) {
      const cat = row.category || row.section;
      const isSummary = row.is_summary === true || row.row_type === 'subtotal' || row.row_type === 'summary';

      if (cat === 'Summary' || cat === 'Net Change') {
        if (row.account_name?.includes('Net Change') || row.account_name?.includes('Net Cash')) {
          netChange = parseFloat(row.amount) || 0;
        } else if (row.account_name?.includes('Beginning')) {
          beginningCash = parseFloat(row.amount) || 0;
        } else if (row.account_name?.includes('Ending')) {
          endingCash = parseFloat(row.amount) || 0;
        }
        continue;
      }

      if (sections[cat] !== undefined) {
        if (isSummary) {
          subtotals[cat] = parseFloat(row.amount) || 0;
        } else {
          sections[cat].push(row);
        }
      }
    }

    return { sections, subtotals, netChange, beginningCash, endingCash };
  }, [reportData]);

  // CSV export
  const exportCSV = () => {
    if (!processed) { toast.error('Generate report first'); return; }
    const csvRows = [['Section', 'Account', 'Amount'].join(',')];

    for (const [sectionKey, rows] of Object.entries(processed.sections)) {
      const cfg = SECTION_CONFIG[sectionKey] || { label: sectionKey };
      rows.forEach(r => {
        csvRows.push([cfg.label, `"${r.account_name || ''}"`, (parseFloat(r.amount) || 0).toFixed(2)].join(','));
      });
      csvRows.push(['', `"Net Cash from ${cfg.label}"`, processed.subtotals[sectionKey].toFixed(2)].join(','));
      csvRows.push('');
    }

    csvRows.push(['', '"Net Change in Cash"', processed.netChange.toFixed(2)].join(','));
    csvRows.push(['', '"Beginning Cash Balance"', processed.beginningCash.toFixed(2)].join(','));
    csvRows.push(['', '"Ending Cash Balance"', processed.endingCash.toFixed(2)].join(','));

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const handlePrint = () => { window.print(); };

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
            icon={Wallet}
            title="Cash Flow Statement"
            subtitle="Cash inflows and outflows from Operating, Investing, and Financing activities"
            color="blue"
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

            <div className="flex flex-wrap items-center gap-3">
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
                Choose a date range above, then click "Generate Report" to view your Cash Flow statement.
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

            {/* Report Header */}
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-6">
                <div>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                    {user?.company_name || 'Company'}
                  </p>
                  <h2 className={`text-xl font-bold ${ft('text-slate-900', 'text-white')}`}>
                    Statement of Cash Flows
                  </h2>
                  <p className={`text-sm mt-1 ${ft('text-slate-500', 'text-zinc-400')}`}>
                    Period: {formatDate(dateRange.from)} — {formatDate(dateRange.to)}
                  </p>
                  <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')} print:block`}>
                    Generated: {new Date().toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Activity Sections */}
            {Object.entries(SECTION_CONFIG).map(([key, cfg]) => {
              const rows = processed.sections[key] || [];
              const subtotal = processed.subtotals[key] || 0;
              const colorMap = {
                blue: { header: ft('border-slate-100 bg-blue-50/50', 'border-zinc-800 bg-blue-500/[0.03]'), title: ft('text-blue-700', 'text-blue-400'), subtotalBg: ft('border-slate-200 bg-blue-50/30', 'border-zinc-700 bg-blue-500/[0.03]') },
                purple: { header: ft('border-slate-100 bg-purple-50/50', 'border-zinc-800 bg-purple-500/[0.03]'), title: ft('text-purple-700', 'text-purple-400'), subtotalBg: ft('border-slate-200 bg-purple-50/30', 'border-zinc-700 bg-purple-500/[0.03]') },
                amber: { header: ft('border-slate-100 bg-amber-50/50', 'border-zinc-800 bg-amber-500/[0.03]'), title: ft('text-amber-700', 'text-amber-400'), subtotalBg: ft('border-slate-200 bg-amber-50/30', 'border-zinc-700 bg-amber-500/[0.03]') },
              };
              const colors = colorMap[cfg.color] || colorMap.blue;

              return (
                <Card key={key} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                  <CardContent className="p-0">
                    <div className={`px-4 py-3 border-b ${colors.header}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-semibold ${colors.title}`}>{cfg.label}</h3>
                        <span className={`text-sm font-bold ${colors.title}`}>
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                    <table className="w-full">
                      <thead>
                        <tr className={`text-[11px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                          <th className="text-left px-4 py-2 font-medium">Account</th>
                          <th className="text-right px-4 py-2 font-medium w-36">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={2} className={`px-4 py-4 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>
                              No {cfg.label.toLowerCase()} in this period
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, i) => {
                            const amt = parseFloat(row.amount) || 0;
                            return (
                              <tr key={i} className={`border-t ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}>
                                <td className={`px-4 py-2 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>
                                  {row.account_name}
                                </td>
                                <td className={`px-4 py-2 text-sm text-right font-medium tabular-nums ${
                                  amt >= 0 ? ft('text-slate-900', 'text-white') : 'text-red-400'
                                }`}>
                                  {formatCurrency(amt)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {/* Subtotal */}
                        <tr className={`border-t-2 ${colors.subtotalBg}`}>
                          <td className={`px-4 py-2 text-sm font-bold ${colors.title}`}>
                            Net Cash from {cfg.label}
                          </td>
                          <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${colors.title}`}>
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}

            {/* Summary */}
            <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} ring-1 ${
              processed.netChange >= 0 ? 'ring-green-500/20' : 'ring-red-500/20'
            }`}>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    <tr className={`border-b ${ft('border-slate-100', 'border-zinc-800')}`}>
                      <td className={`px-4 py-3 text-sm font-semibold ${ft('text-slate-700', 'text-zinc-300')}`}>
                        Net Change in Cash
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold tabular-nums w-36 ${
                        processed.netChange >= 0 ? ft('text-green-700', 'text-green-400') : ft('text-red-700', 'text-red-400')
                      }`}>
                        {formatCurrency(processed.netChange)}
                      </td>
                    </tr>
                    <tr className={`border-b ${ft('border-slate-100', 'border-zinc-800')}`}>
                      <td className={`px-4 py-3 text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>
                        Beginning Cash Balance
                      </td>
                      <td className={`px-4 py-3 text-sm text-right tabular-nums w-36 ${ft('text-slate-700', 'text-zinc-300')}`}>
                        {formatCurrency(processed.beginningCash)}
                      </td>
                    </tr>
                    <tr className={processed.endingCash >= 0
                      ? ft('bg-green-50', 'bg-green-500/[0.05]')
                      : ft('bg-red-50', 'bg-red-500/[0.05]')
                    }>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {processed.netChange >= 0
                            ? <ArrowUpRight className="w-5 h-5 text-green-500" />
                            : <ArrowDownRight className="w-5 h-5 text-red-500" />
                          }
                          <span className={`text-base font-bold ${
                            processed.endingCash >= 0
                              ? ft('text-green-700', 'text-green-400')
                              : ft('text-red-700', 'text-red-400')
                          }`}>
                            Ending Cash Balance
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-4 text-right text-lg font-bold tabular-nums w-36 ${
                        processed.endingCash >= 0
                          ? ft('text-green-700', 'text-green-400')
                          : ft('text-red-700', 'text-red-400')
                      }`}>
                        {formatCurrency(processed.endingCash)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* No Data State */}
            {Object.values(processed.sections).every(s => s.length === 0) && (
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-8 text-center">
                  <AlertCircle className={`w-12 h-12 mx-auto mb-3 ${ft('text-slate-300', 'text-zinc-600')}`} />
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                    No cash flow activity found for this period. Cash flows appear here after invoices are paid and expenses are recorded.
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
