import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Clock, Download, Sun, Moon, AlertCircle, Printer, BarChart3,
  RefreshCw, FileText, ChevronDown, ChevronRight, ExternalLink
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

const AGING_BUCKETS = [
  { key: 'current_amount', label: 'Current',  color: 'green',  bg: 'bg-green-500',  bgLight: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  { key: 'days_30',        label: '1-30 Days', color: 'yellow', bg: 'bg-yellow-500', bgLight: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  { key: 'days_60',        label: '31-60 Days',color: 'amber',  bg: 'bg-amber-500',  bgLight: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  { key: 'days_90',        label: '61-90 Days',color: 'orange', bg: 'bg-orange-500', bgLight: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  { key: 'over_90',        label: '90+ Days',  color: 'red',    bg: 'bg-red-500',    bgLight: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
];

// ── Stacked Bar Chart ───────────────────────────────────────────────────────
function AgingBarChart({ totals, ft }) {
  const grandTotal = Math.max(totals.total, 1);
  return (
    <div className="space-y-2">
      <div className={`h-6 rounded-full overflow-hidden flex ${ft('bg-slate-100', 'bg-zinc-800')}`}>
        {AGING_BUCKETS.map(b => {
          const val = parseFloat(totals[b.key]) || 0;
          const pct = (val / grandTotal) * 100;
          if (pct < 0.5) return null;
          return <div key={b.key} className={`h-full ${b.bg}/60`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {AGING_BUCKETS.map(b => (
          <span key={b.key} className="flex items-center gap-1 text-[10px]">
            <span className={`w-2 h-2 rounded-full ${b.bg}/60`} />
            <span className={ft('text-slate-500', 'text-zinc-500')}>{b.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FinanceReportAging({ embedded = false }) {
  const [asOfDate, setAsOfDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState('payable');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [groupedData, setGroupedData] = useState(null);
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [groupByCustomer, setGroupByCustomer] = useState(false);

  const navigate = useNavigate();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const fetchReport = useCallback(async () => {
    if (!user?.company_id) { toast.error('No company context'); return; }
    setLoading(true);
    setGenerated(false);
    setExpanded({});
    try {
      // Check if COA is initialized (needed for aging data to exist)
      const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('company_id', user.company_id);
      if (!count || count === 0) {
        toast.error('Initialize your Chart of Accounts first (Ledger > Chart of Accounts)');
        setLoading(false);
        return;
      }

      const rpcName = activeTab === 'payable' ? 'get_aged_payables' : 'get_aged_receivables';
      const { data, error } = await supabase.rpc(rpcName, {
        p_company_id: user.company_id,
        p_as_of_date: asOfDate,
      });

      if (error) {
        console.error('[FinanceReportAging] error:', error);
        if (error.message?.includes('404') || error.code === 'PGRST202') {
          toast.error(`Aging report function (${rpcName}) not available. Please contact support.`);
          setReportData([]);
          setGenerated(true);
          return;
        }
        throw error;
      }

      setReportData(data || []);

      // Fetch grouped AR data if applicable
      if (activeTab === 'receivable') {
        const { data: gData } = await supabase.rpc('get_aged_receivables_grouped', {
          p_company_id: user.company_id,
          p_as_of_date: asOfDate,
        });
        setGroupedData(gData || []);
      } else {
        setGroupedData(null);
      }

      setGenerated(true);
    } catch (err) {
      console.error('Error fetching aging report:', err);
      toast.error('Failed to generate report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, asOfDate, activeTab, groupByCustomer]);

  // Compute summary totals
  const totals = useMemo(() => {
    if (!reportData || reportData.length === 0) return null;
    const t = { current_amount: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0, total: 0, count: reportData.length };
    for (const row of reportData) {
      t.current_amount += parseFloat(row.current_amount) || 0;
      t.days_30 += parseFloat(row.days_30) || 0;
      t.days_60 += parseFloat(row.days_60) || 0;
      t.days_90 += parseFloat(row.days_90) || 0;
      t.over_90 += parseFloat(row.over_90) || 0;
      t.total += parseFloat(row.total || row.total_amount) || 0;
    }
    return t;
  }, [reportData]);

  // CSV export
  const exportCSV = () => {
    if (!reportData || reportData.length === 0) { toast.error('No data to export'); return; }
    const isAP = activeTab === 'payable';
    const headers = isAP
      ? ['Vendor', 'Vendor Code', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total']
      : ['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
    const csvRows = [headers.join(',')];

    for (const r of reportData) {
      if (isAP) {
        csvRows.push([
          `"${(r.vendor_name || '').replace(/"/g, '""')}"`,
          r.vendor_code || '',
          (parseFloat(r.current_amount) || 0).toFixed(2),
          (parseFloat(r.days_30) || 0).toFixed(2),
          (parseFloat(r.days_60) || 0).toFixed(2),
          (parseFloat(r.days_90) || 0).toFixed(2),
          (parseFloat(r.over_90) || 0).toFixed(2),
          (parseFloat(r.total) || 0).toFixed(2),
        ].join(','));
      } else {
        csvRows.push([
          r.invoice_number || '',
          `"${(r.customer_name || '').replace(/"/g, '""')}"`,
          r.issued_date ? new Date(r.issued_date).toISOString().slice(0, 10) : '',
          r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : '',
          (parseFloat(r.current_amount) || 0).toFixed(2),
          (parseFloat(r.days_30) || 0).toFixed(2),
          (parseFloat(r.days_60) || 0).toFixed(2),
          (parseFloat(r.days_90) || 0).toFixed(2),
          (parseFloat(r.over_90) || 0).toFixed(2),
          (parseFloat(r.total_amount) || 0).toFixed(2),
        ].join(','));
      }
    }

    if (totals) {
      csvRows.push('');
      const totalRow = isAP
        ? ['TOTALS', '', totals.current_amount.toFixed(2), totals.days_30.toFixed(2), totals.days_60.toFixed(2), totals.days_90.toFixed(2), totals.over_90.toFixed(2), totals.total.toFixed(2)]
        : ['', 'TOTALS', '', '', totals.current_amount.toFixed(2), totals.days_30.toFixed(2), totals.days_60.toFixed(2), totals.days_90.toFixed(2), totals.over_90.toFixed(2), totals.total.toFixed(2)];
      csvRows.push(totalRow.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aging-${activeTab}-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
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

  const isAP = activeTab === 'payable';

  const content = (
    <>
        <div className={embedded ? "space-y-4" : "w-full px-4 lg:px-6 py-4 space-y-4"}>

          {/* Header */}
          {!embedded && <div className="print:hidden">
            <PageHeader
              icon={Clock}
              title="Aging Reports"
              subtitle="Track outstanding payables and receivables by age"
              color="amber"
              actions={
                <div className="flex gap-3">
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                </div>
              }
            />
          </div>}

          {/* Controls */}
          <Card className={`print:hidden ${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}`}>
            <CardContent className="p-4 space-y-4">
              {/* Tabs */}
              <div className="flex gap-1">
                {[
                  { key: 'payable', label: 'Accounts Payable' },
                  { key: 'receivable', label: 'Accounts Receivable' },
                ].map(t => (
                  <button key={t.key} onClick={() => { setActiveTab(t.key); setGenerated(false); setReportData(null); }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === t.key
                        ? ft('bg-blue-50 text-blue-700 border border-blue-200', 'bg-blue-500/10 text-blue-400 border border-blue-500/30')
                        : ft('text-slate-500 hover:bg-slate-50', 'text-zinc-500 hover:bg-zinc-800/50')
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Date + Group toggle */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-48">
                  <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>As Of Date</Label>
                  <Input type="date" value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    className={`mt-1 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} />
                </div>

                {activeTab === 'receivable' && (
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input type="checkbox" checked={groupByCustomer} onChange={e => setGroupByCustomer(e.target.checked)}
                      className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500" />
                    <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Group by Customer</span>
                  </label>
                )}

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
                  {isAP
                    ? 'View outstanding vendor bills grouped by aging buckets.'
                    : 'View outstanding customer invoices grouped by aging buckets.'}
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
          {generated && reportData && (
            <div className="space-y-4 print:space-y-2">

              {/* Report Header */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className={`text-xs uppercase tracking-wider mb-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        {user?.company_name || 'Company'}
                      </p>
                      <h2 className={`text-xl font-bold ${ft('text-slate-900', 'text-white')}`}>
                        {isAP ? 'Accounts Payable Aging' : 'Accounts Receivable Aging'}
                      </h2>
                      <p className={`text-sm mt-1 ${ft('text-slate-500', 'text-zinc-400')}`}>
                        As of {formatDate(asOfDate)}
                      </p>
                      <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        Generated: {new Date().toLocaleString()} · {reportData.length} {isAP ? 'vendors' : 'invoices'}
                      </p>
                    </div>
                    {totals && (
                      <div className="w-64 print:hidden">
                        <AgingBarChart totals={totals} ft={ft} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              {totals && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6">
                  {AGING_BUCKETS.map(b => {
                    const val = totals[b.key];
                    return (
                      <Card key={b.key} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                        <CardContent className="p-3 text-center">
                          <p className={`text-[10px] uppercase tracking-wider font-medium ${ft('text-slate-400', 'text-zinc-500')}`}>
                            {b.label}
                          </p>
                          <p className={`text-lg font-bold mt-1 tabular-nums ${b.text}`}>
                            {formatCurrency(val)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} ring-1 ring-blue-500/20`}>
                    <CardContent className="p-3 text-center">
                      <p className={`text-[10px] uppercase tracking-wider font-medium ${ft('text-slate-400', 'text-zinc-500')}`}>
                        Total Outstanding
                      </p>
                      <p className={`text-lg font-bold mt-1 tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                        {formatCurrency(totals.total)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Aging Table */}
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-[11px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                        <th className="text-left px-4 py-2.5 font-medium w-8" />
                        <th className="text-left px-4 py-2.5 font-medium">{isAP ? 'Vendor' : 'Invoice / Customer'}</th>
                        {isAP && <th className="text-left px-4 py-2.5 font-medium w-24">Code</th>}
                        {!isAP && <th className="text-left px-4 py-2.5 font-medium w-24">Due Date</th>}
                        <th className="text-right px-3 py-2.5 font-medium w-24">Current</th>
                        <th className="text-right px-3 py-2.5 font-medium w-24">1-30</th>
                        <th className="text-right px-3 py-2.5 font-medium w-24">31-60</th>
                        <th className="text-right px-3 py-2.5 font-medium w-24">61-90</th>
                        <th className="text-right px-3 py-2.5 font-medium w-24">90+</th>
                        <th className="text-right px-4 py-2.5 font-medium w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan={isAP ? 9 : 9} className={`px-4 py-8 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>
                            No outstanding {isAP ? 'payables' : 'receivables'} found.
                          </td>
                        </tr>
                      ) : isAP ? (
                        // AP: Vendor rows (expandable)
                        reportData.map((row) => {
                          const isOpen = expanded[row.vendor_id];
                          const total = parseFloat(row.total) || 0;
                          const overdue = (parseFloat(row.days_30) || 0) + (parseFloat(row.days_60) || 0) +
                                          (parseFloat(row.days_90) || 0) + (parseFloat(row.over_90) || 0);
                          return (
                            <React.Fragment key={row.vendor_id}>
                              <tr className={`border-t cursor-pointer ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}
                                onClick={() => toggleExpand(row.vendor_id)}>
                                <td className="px-4 py-2.5">
                                  {isOpen
                                    ? <ChevronDown className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                                    : <ChevronRight className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                                  }
                                </td>
                                <td className={`px-4 py-2.5 text-sm font-medium ${ft('text-slate-800', 'text-zinc-200')}`}>
                                  {row.vendor_name}
                                </td>
                                <td className={`px-4 py-2.5 text-sm font-mono ${ft('text-slate-500', 'text-zinc-500')}`}>
                                  {row.vendor_code}
                                </td>
                                {AGING_BUCKETS.map(b => {
                                  const val = parseFloat(row[b.key]) || 0;
                                  return (
                                    <td key={b.key} className={`px-3 py-2.5 text-sm text-right tabular-nums ${
                                      val > 0 ? `font-medium ${b.text}` : ft('text-slate-300', 'text-zinc-700')
                                    }`}>
                                      {val > 0 ? formatCurrency(val) : '—'}
                                    </td>
                                  );
                                })}
                                <td className={`px-4 py-2.5 text-sm text-right font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                                  {formatCurrency(total)}
                                </td>
                              </tr>
                              {/* Expanded: link to vendor */}
                              {isOpen && (
                                <tr className={ft('bg-slate-50/50', 'bg-zinc-800/20')}>
                                  <td />
                                  <td colSpan={8} className="px-4 py-3">
                                    <div className="flex items-center gap-4">
                                      <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>
                                        {overdue > 0
                                          ? `${formatCurrency(overdue)} overdue`
                                          : 'All current — no overdue bills'}
                                      </span>
                                      <Button variant="ghost" size="sm"
                                        className={`text-xs ${ft('text-blue-600', 'text-blue-400')}`}
                                        onClick={(e) => { e.stopPropagation(); navigate(createPageUrl('FinanceBills') + `?vendor=${row.vendor_id}`); }}>
                                        <ExternalLink className="w-3 h-3 mr-1" />View Bills
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : groupByCustomer && groupedData ? (
                        // AR: Grouped by customer (expandable)
                        groupedData.map((row) => {
                          const custKey = row.customer_name || 'Unknown';
                          const isOpen = expanded[custKey];
                          const total = parseFloat(row.total_amount) || 0;
                          return (
                            <React.Fragment key={custKey}>
                              <tr className={`border-t cursor-pointer ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}
                                onClick={() => toggleExpand(custKey)}>
                                <td className="px-4 py-2.5">
                                  {isOpen
                                    ? <ChevronDown className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                                    : <ChevronRight className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                                  }
                                </td>
                                <td className={`px-4 py-2.5 text-sm font-medium ${ft('text-slate-800', 'text-zinc-200')}`}>
                                  {custKey}
                                  <span className={`ml-2 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                                    ({row.invoice_count} invoice{row.invoice_count > 1 ? 's' : ''})
                                  </span>
                                </td>
                                <td className={`px-4 py-2.5 text-sm ${ft('text-slate-500', 'text-zinc-500')}`} />
                                {AGING_BUCKETS.map(b => {
                                  const val = parseFloat(row[b.key]) || 0;
                                  return (
                                    <td key={b.key} className={`px-3 py-2.5 text-sm text-right tabular-nums ${
                                      val > 0 ? `font-medium ${b.text}` : ft('text-slate-300', 'text-zinc-700')
                                    }`}>
                                      {val > 0 ? formatCurrency(val) : '—'}
                                    </td>
                                  );
                                })}
                                <td className={`px-4 py-2.5 text-sm text-right font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                                  {formatCurrency(total)}
                                </td>
                              </tr>
                              {/* Expanded: individual invoices for this customer */}
                              {isOpen && reportData
                                .filter(inv => (inv.customer_name || 'Unknown') === custKey)
                                .map(inv => (
                                  <tr key={inv.invoice_id}
                                    className={ft('bg-slate-50/50 border-t border-slate-50', 'bg-zinc-800/20 border-t border-zinc-800/30')}>
                                    <td className="px-4 py-2" />
                                    <td className={`px-4 py-2 text-xs ${ft('text-slate-500', 'text-zinc-400')} pl-10`}>
                                      {inv.invoice_number}
                                    </td>
                                    <td className={`px-4 py-2 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                                      {formatDate(inv.due_date)}
                                    </td>
                                    {AGING_BUCKETS.map(b => {
                                      const val = parseFloat(inv[b.key]) || 0;
                                      return (
                                        <td key={b.key} className={`px-3 py-2 text-xs text-right tabular-nums ${
                                          val > 0 ? b.text : ft('text-slate-300', 'text-zinc-700')
                                        }`}>
                                          {val > 0 ? formatCurrency(val) : '—'}
                                        </td>
                                      );
                                    })}
                                    <td className={`px-4 py-2 text-xs text-right tabular-nums ${ft('text-slate-600', 'text-zinc-400')}`}>
                                      {formatCurrency(inv.total_amount)}
                                    </td>
                                  </tr>
                                ))
                              }
                            </React.Fragment>
                          );
                        })
                      ) : (
                        // AR: Individual invoice rows
                        reportData.map((row) => {
                          const total = parseFloat(row.total_amount) || 0;
                          return (
                            <tr key={row.invoice_id}
                              className={`border-t ${ft('border-slate-50 hover:bg-slate-50/50', 'border-zinc-800/50 hover:bg-white/[0.02]')}`}>
                              <td className="px-4 py-2.5" />
                              <td className={`px-4 py-2.5 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>
                                <span className="font-medium">{row.invoice_number}</span>
                                <span className={`ml-2 ${ft('text-slate-400', 'text-zinc-500')}`}>— {row.customer_name}</span>
                              </td>
                              <td className={`px-4 py-2.5 text-sm ${ft('text-slate-500', 'text-zinc-500')}`}>
                                {formatDate(row.due_date)}
                              </td>
                              {AGING_BUCKETS.map(b => {
                                const val = parseFloat(row[b.key]) || 0;
                                return (
                                  <td key={b.key} className={`px-3 py-2.5 text-sm text-right tabular-nums ${
                                    val > 0 ? `font-medium ${b.text}` : ft('text-slate-300', 'text-zinc-700')
                                  }`}>
                                    {val > 0 ? formatCurrency(val) : '—'}
                                  </td>
                                );
                              })}
                              <td className={`px-4 py-2.5 text-sm text-right font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                                {formatCurrency(total)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Totals Footer */}
                    {totals && reportData.length > 0 && (
                      <tfoot>
                        <tr className={`border-t-2 ${ft('border-slate-300 bg-slate-50', 'border-zinc-600 bg-zinc-800/50')}`}>
                          <td className="px-4 py-3" />
                          <td className={`px-4 py-3 text-sm font-bold ${ft('text-slate-900', 'text-white')}`} colSpan={isAP ? 2 : 2}>
                            TOTALS
                          </td>
                          {AGING_BUCKETS.map(b => (
                            <td key={b.key} className={`px-3 py-3 text-sm text-right font-bold tabular-nums ${b.text}`}>
                              {formatCurrency(totals[b.key])}
                            </td>
                          ))}
                          <td className={`px-4 py-3 text-sm text-right font-bold tabular-nums ${ft('text-slate-900', 'text-white')}`}>
                            {formatCurrency(totals.total)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:space-y-2 > * + * { margin-top: 0.5rem; }
          .print\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
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
