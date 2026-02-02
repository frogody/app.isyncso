import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { Account, AccountType, JournalEntry, JournalEntryLine } from '@/api/entities';
import {
  BookOpen, Search, Filter, Download, ChevronDown, Sun, Moon,
  AlertCircle, Calendar, RotateCcw, Landmark, TrendingUp, TrendingDown,
  Scale, ArrowRight, Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

const TYPE_BADGE_CLASSES = {
  Asset:     'text-blue-400 border-blue-500/30 bg-blue-500/10',
  Liability: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  Equity:    'text-purple-400 border-purple-500/30 bg-purple-500/10',
  Revenue:   'text-green-400 border-green-500/30 bg-green-500/10',
  Expense:   'text-red-400 border-red-500/30 bg-red-500/10',
};

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `€${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

// ── Account Selector (reused pattern from JournalEntries) ───────────────────
function AccountSelector({ accounts, accountTypes, value, onChange, ft, allowAll }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const typeMap = useMemo(() => {
    const m = {};
    accountTypes.forEach(t => { m[t.id] = t.name; });
    return m;
  }, [accountTypes]);

  const filtered = useMemo(() => {
    if (!query) return accounts;
    const q = query.toLowerCase();
    return accounts.filter(a =>
      (a.code || '').toLowerCase().includes(q) ||
      (a.name || '').toLowerCase().includes(q)
    );
  }, [accounts, query]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(a => {
      const tName = typeMap[a.account_type_id] || 'Other';
      if (!g[tName]) g[tName] = [];
      g[tName].push(a);
    });
    return g;
  }, [filtered, typeMap]);

  const selected = accounts.find(a => a.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full text-left rounded-md px-3 py-2 text-sm border truncate ${
          ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')
        } ${!value ? ft('text-slate-400', 'text-zinc-500') : ''}`}
      >
        {value === '__all__' ? 'All Accounts' : selected ? `${selected.code} — ${selected.name}` : 'Select an account...'}
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 w-80 max-h-72 overflow-y-auto rounded-lg border shadow-xl ${
          ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')
        }`}>
          <div className="p-2 sticky top-0 bg-inherit z-10">
            <Input
              placeholder="Search accounts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`text-xs h-8 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
              autoFocus
            />
          </div>
          {allowAll && (
            <button
              type="button"
              onClick={() => { onChange('__all__'); setOpen(false); setQuery(''); }}
              className={`w-full text-left px-3 py-2 text-sm font-medium ${
                ft('hover:bg-slate-50 text-slate-700', 'hover:bg-white/[0.05] text-zinc-300')
              } ${value === '__all__' ? ft('bg-blue-50', 'bg-blue-500/10') : ''}`}
            >
              All Accounts
            </button>
          )}
          {Object.entries(grouped).map(([typeName, accts]) => (
            <div key={typeName}>
              <div className={`px-2 py-1 text-[10px] uppercase tracking-wider font-medium ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/50')}`}>
                {typeName}
              </div>
              {accts.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a.id); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                    ft('hover:bg-slate-50 text-slate-700', 'hover:bg-white/[0.05] text-zinc-300')
                  } ${a.id === value ? ft('bg-blue-50', 'bg-blue-500/10') : ''}`}
                >
                  <span className={`font-mono text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{a.code}</span>
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={`p-3 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No accounts found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FinanceGeneralLedger({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);

  useEffect(() => { loadBaseData(); }, []);

  const loadBaseData = async () => {
    try {
      setLoading(true);
      const [acctData, typeData] = await Promise.all([
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
      ]);
      setAccounts((acctData || []).sort((a, b) => (a.code || '').localeCompare(b.code || '')));
      setAccountTypes((typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch (error) {
      console.error('Error loading base data:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const typeMap = useMemo(() => {
    const m = {};
    accountTypes.forEach(t => { m[t.id] = t; });
    return m;
  }, [accountTypes]);

  const accountMap = useMemo(() => {
    const m = {};
    accounts.forEach(a => { m[a.id] = a; });
    return m;
  }, [accounts]);

  const getTypeName = (typeId) => typeMap[typeId]?.name || 'Unknown';
  const getNormalBalance = (typeId) => typeMap[typeId]?.normal_balance || 'debit';

  // Fetch ledger data when filters change
  const fetchLedger = useCallback(async () => {
    const acctId = showAllAccounts ? '__all__' : selectedAccountId;
    if (!acctId) { setLedgerData([]); return; }

    setFetching(true);
    try {
      // Fetch all posted entries in date range
      const allEntries = await db.entities.JournalEntry?.list?.({ limit: 2000 }).catch(() => []) || [];
      const postedEntries = allEntries.filter(e =>
        e.is_posted &&
        !e.voided_at &&
        e.entry_date >= dateRange.from &&
        e.entry_date <= dateRange.to
      );
      const entryMap = {};
      postedEntries.forEach(e => { entryMap[e.id] = e; });
      const entryIds = new Set(postedEntries.map(e => e.id));

      // Fetch lines
      const allLines = await db.entities.JournalEntryLine?.list?.({ limit: 5000 }).catch(() => []) || [];
      let filteredLines = allLines.filter(l => entryIds.has(l.journal_entry_id));

      // Filter by account if single account
      if (acctId !== '__all__') {
        filteredLines = filteredLines.filter(l => l.account_id === acctId);
      }

      // Build ledger rows with entry info
      const rows = filteredLines.map(l => {
        const entry = entryMap[l.journal_entry_id] || {};
        return {
          ...l,
          entry_date: entry.entry_date,
          entry_number: entry.entry_number,
          entry_reference: entry.reference,
          entry_description: entry.description,
        };
      });

      // Sort by date ASC, then line_order
      rows.sort((a, b) => {
        const dateCmp = (a.entry_date || '').localeCompare(b.entry_date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.line_order || 0) - (b.line_order || 0);
      });

      setLedgerData(rows);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load ledger data');
      setLedgerData([]);
    } finally {
      setFetching(false);
    }
  }, [selectedAccountId, dateRange, showAllAccounts]);

  // Auto-fetch when a valid selection exists
  const hasSelection = showAllAccounts || selectedAccountId;
  useEffect(() => {
    if (hasSelection) fetchLedger();
    else setLedgerData([]);
  }, [fetchLedger, hasSelection]);

  // Calculate running balances
  const ledgerWithBalance = useMemo(() => {
    if (!hasSelection) return [];

    if (showAllAccounts) {
      // Group by account, compute running balance per account
      const byAccount = {};
      ledgerData.forEach(row => {
        const aid = row.account_id;
        if (!byAccount[aid]) byAccount[aid] = [];
        byAccount[aid].push(row);
      });

      const result = [];
      // Sort accounts by code
      const sortedAccountIds = Object.keys(byAccount).sort((a, b) =>
        (accountMap[a]?.code || '').localeCompare(accountMap[b]?.code || '')
      );

      for (const aid of sortedAccountIds) {
        const acct = accountMap[aid];
        const isDebitNormal = acct ? getNormalBalance(acct.account_type_id) === 'debit' : true;
        let balance = parseFloat(acct?.opening_balance) || 0;

        // Account header row
        result.push({ _type: 'account_header', account: acct });

        for (const row of byAccount[aid]) {
          const debit = parseFloat(row.debit) || 0;
          const credit = parseFloat(row.credit) || 0;
          if (isDebitNormal) balance = balance + debit - credit;
          else balance = balance - debit + credit;
          result.push({ ...row, running_balance: balance });
        }
      }
      return result;
    }

    // Single account
    const acct = accountMap[selectedAccountId];
    if (!acct) return [];
    const isDebitNormal = getNormalBalance(acct.account_type_id) === 'debit';
    let balance = parseFloat(acct.opening_balance) || 0;

    return ledgerData.map(row => {
      const debit = parseFloat(row.debit) || 0;
      const credit = parseFloat(row.credit) || 0;
      if (isDebitNormal) balance = balance + debit - credit;
      else balance = balance - debit + credit;
      return { ...row, running_balance: balance };
    });
  }, [ledgerData, accountMap, typeMap, selectedAccountId, showAllAccounts, hasSelection]);

  // Summary stats (single account only)
  const summary = useMemo(() => {
    if (showAllAccounts || !selectedAccountId) return null;
    const acct = accountMap[selectedAccountId];
    if (!acct) return null;
    const opening = parseFloat(acct.opening_balance) || 0;
    const totalDebits = ledgerData.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
    const totalCredits = ledgerData.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);
    const isDebitNormal = getNormalBalance(acct.account_type_id) === 'debit';
    const closing = isDebitNormal ? opening + totalDebits - totalCredits : opening - totalDebits + totalCredits;
    return { opening, totalDebits, totalCredits, closing, account: acct };
  }, [ledgerData, selectedAccountId, showAllAccounts, accountMap, typeMap]);

  // Totals for table footer
  const tableTotals = useMemo(() => {
    const rows = ledgerWithBalance.filter(r => !r._type);
    return {
      debits: rows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0),
      credits: rows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0),
    };
  }, [ledgerWithBalance]);

  // CSV export
  const exportCSV = () => {
    const rows = ledgerWithBalance.filter(r => !r._type);
    if (rows.length === 0) { toast.error('No data to export'); return; }

    const showAcctCol = showAllAccounts;
    const headers = ['Date', 'Entry #', 'Reference', 'Description'];
    if (showAcctCol) headers.push('Account Code', 'Account Name');
    headers.push('Debit', 'Credit', 'Running Balance');

    const csvRows = [headers.join(',')];
    for (const r of rows) {
      const acct = accountMap[r.account_id];
      const cols = [
        r.entry_date || '',
        r.entry_number || '',
        `"${(r.entry_reference || '').replace(/"/g, '""')}"`,
        `"${(r.description || r.entry_description || '').replace(/"/g, '""')}"`,
      ];
      if (showAcctCol) {
        cols.push(acct?.code || '', `"${(acct?.name || '').replace(/"/g, '""')}"`);
      }
      cols.push(
        (parseFloat(r.debit) || 0).toFixed(2),
        (parseFloat(r.credit) || 0).toFixed(2),
        (r.running_balance || 0).toFixed(2)
      );
      csvRows.push(cols.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${dateRange.from}-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const resetFilters = () => {
    setSelectedAccountId('');
    setShowAllAccounts(false);
    setDateRange(getDefaultDateRange());
    setLedgerData([]);
  };

  if (loading || permLoading) {
    if (embedded) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!canView) {
    if (embedded) return <div className="text-center py-12"><p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view the general ledger.</p></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex flex-col items-center justify-center text-center p-6`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')} mb-2`}>Access Denied</h2>
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view the general ledger.</p>
      </div>
    );
  }

  const dataRows = ledgerWithBalance.filter(r => !r._type);

  const content = (
        <div className={embedded ? "space-y-4" : "w-full px-4 lg:px-6 py-4 space-y-4"}>

          {/* Header */}
          {!embedded && <PageHeader
            icon={BookOpen}
            title="General Ledger"
            subtitle="View transaction history and running balances by account"
            color="blue"
            actions={
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                {dataRows.length > 0 && (
                  <Button variant="outline"
                    className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                    onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-2" />Export CSV
                  </Button>
                )}
              </div>
            }
          />}

          {/* Filter Controls */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Account selector */}
                <div className="flex-1">
                  <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Account</Label>
                  <div className="mt-1">
                    <AccountSelector
                      accounts={accounts.filter(a => a.is_active !== false)}
                      accountTypes={accountTypes}
                      value={showAllAccounts ? '__all__' : selectedAccountId}
                      onChange={(val) => {
                        if (val === '__all__') {
                          setShowAllAccounts(true);
                          setSelectedAccountId('');
                        } else {
                          setShowAllAccounts(false);
                          setSelectedAccountId(val);
                        }
                      }}
                      ft={ft}
                      allowAll
                    />
                  </div>
                </div>

                {/* Date from */}
                <div className="w-full lg:w-40">
                  <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>From Date</Label>
                  <Input type="date" value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>

                {/* Date to */}
                <div className="w-full lg:w-40">
                  <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>To Date</Label>
                  <Input type="date" value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>

                {/* Show all toggle */}
                <div className="flex items-end gap-2">
                  <label className={`flex items-center gap-2 rounded-md px-3 py-2 border cursor-pointer text-sm ${
                    ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')
                  } ${showAllAccounts ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : ''}`}>
                    <input type="checkbox" checked={showAllAccounts}
                      onChange={(e) => {
                        setShowAllAccounts(e.target.checked);
                        if (e.target.checked) setSelectedAccountId('');
                      }}
                      className="rounded" />
                    All accounts
                  </label>
                  <Button variant="outline" size="sm" onClick={resetFilters}
                    className={ft('border-slate-200 text-slate-500', 'border-zinc-700 text-zinc-400')}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards (single account only) */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Opening Balance</span>
                    <Landmark className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(summary.opening)}</p>
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{summary.account.code} — {summary.account.name}</p>
                </CardContent>
              </Card>
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Total Debits</span>
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-blue-400">{formatCurrency(summary.totalDebits)}</p>
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{dataRows.filter(r => (parseFloat(r.debit) || 0) > 0).length} entries</p>
                </CardContent>
              </Card>
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Total Credits</span>
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-amber-400">{formatCurrency(summary.totalCredits)}</p>
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{dataRows.filter(r => (parseFloat(r.credit) || 0) > 0).length} entries</p>
                </CardContent>
              </Card>
              <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Closing Balance</span>
                    <Scale className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <p className={`text-lg font-bold ${summary.closing >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.closing)}
                  </p>
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>
                    {getTypeName(summary.account.account_type_id)} ({getNormalBalance(summary.account.account_type_id)} normal)
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ledger Table */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {!hasSelection ? (
                /* No account selected */
                <div className="text-center py-16">
                  <BookOpen className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                    Select an account to view its ledger
                  </h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} max-w-md mx-auto`}>
                    Use the account selector above to view transaction history, or check "All accounts" to see the complete general ledger.
                  </p>
                </div>
              ) : fetching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : dataRows.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                    No transactions found
                  </h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')}`}>
                    No posted transactions for this account in the selected date range.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Column header */}
                  <div className={`grid gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider min-w-[800px] ${
                    ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')
                  } ${showAllAccounts ? 'grid-cols-[80px_90px_100px_1fr_100px_80px_80px_100px]' : 'grid-cols-[80px_90px_100px_1fr_80px_80px_100px]'}`}>
                    <div>Date</div>
                    <div>Entry #</div>
                    <div>Reference</div>
                    <div>Description</div>
                    {showAllAccounts && <div>Account</div>}
                    <div className="text-right">Debit</div>
                    <div className="text-right">Credit</div>
                    <div className="text-right">Balance</div>
                  </div>

                  <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')} min-w-[800px]`}>
                    {ledgerWithBalance.map((row, idx) => {
                      // Account header row (all-accounts mode)
                      if (row._type === 'account_header') {
                        const acct = row.account;
                        const tName = acct ? getTypeName(acct.account_type_id) : '';
                        return (
                          <div key={`hdr-${acct?.id || idx}`}
                            className={`px-3 py-2 flex items-center gap-2 ${ft('bg-slate-50', 'bg-zinc-800/20')}`}>
                            <span className={`font-mono text-xs font-bold ${ft('text-slate-600', 'text-zinc-300')}`}>{acct?.code}</span>
                            <span className={`text-sm font-semibold ${ft('text-slate-900', 'text-white')}`}>{acct?.name}</span>
                            {tName && <Badge variant="outline" className={`${TYPE_BADGE_CLASSES[tName] || ''} text-[9px]`}>{tName}</Badge>}
                            <span className={`text-[10px] ml-auto ${ft('text-slate-400', 'text-zinc-500')}`}>
                              Opening: {formatCurrency(acct?.opening_balance)}
                            </span>
                          </div>
                        );
                      }

                      const debit = parseFloat(row.debit) || 0;
                      const credit = parseFloat(row.credit) || 0;
                      const acct = accountMap[row.account_id];

                      return (
                        <div key={row.id || idx}
                          className={`grid gap-2 px-3 py-1.5 items-center ${
                            ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')
                          } transition-colors ${
                            showAllAccounts ? 'grid-cols-[80px_90px_100px_1fr_100px_80px_80px_100px]' : 'grid-cols-[80px_90px_100px_1fr_80px_80px_100px]'
                          }`}>
                          <div className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>
                            {formatDate(row.entry_date)}
                          </div>
                          <div>
                            <span className={`text-xs font-mono ${ft('text-blue-600', 'text-blue-400')} cursor-pointer hover:underline`}>
                              {row.entry_number}
                            </span>
                          </div>
                          <div className={`text-xs truncate ${ft('text-slate-400', 'text-zinc-500')}`}>
                            {row.entry_reference || '—'}
                          </div>
                          <div className={`text-sm truncate ${ft('text-slate-900', 'text-white')}`}>
                            {row.description || row.entry_description || '—'}
                          </div>
                          {showAllAccounts && (
                            <div className={`text-xs truncate ${ft('text-slate-500', 'text-zinc-400')}`}>
                              <span className="font-mono">{acct?.code}</span> {acct?.name}
                            </div>
                          )}
                          <div className={`text-right text-sm font-medium ${debit > 0 ? 'text-blue-400' : ft('text-slate-300', 'text-zinc-700')}`}>
                            {debit > 0 ? formatCurrency(debit) : '—'}
                          </div>
                          <div className={`text-right text-sm font-medium ${credit > 0 ? 'text-amber-400' : ft('text-slate-300', 'text-zinc-700')}`}>
                            {credit > 0 ? formatCurrency(credit) : '—'}
                          </div>
                          <div className={`text-right text-sm font-bold ${row.running_balance >= 0 ? ft('text-slate-900', 'text-white') : 'text-red-400'}`}>
                            {formatCurrency(row.running_balance)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals footer */}
                  <div className={`grid gap-2 px-3 py-2 items-center ${
                    ft('bg-slate-50 border-t border-slate-200', 'bg-zinc-800/30 border-t border-zinc-700')
                  } ${showAllAccounts ? 'grid-cols-[80px_90px_100px_1fr_100px_80px_80px_100px]' : 'grid-cols-[80px_90px_100px_1fr_80px_80px_100px]'} min-w-[800px]`}>
                    <div />
                    <div />
                    <div />
                    <div className={`text-xs font-semibold text-right ${ft('text-slate-600', 'text-zinc-300')}`}>
                      Totals ({dataRows.length} transactions)
                    </div>
                    {showAllAccounts && <div />}
                    <div className="text-right text-sm font-bold text-blue-400">
                      {formatCurrency(tableTotals.debits)}
                    </div>
                    <div className="text-right text-sm font-bold text-amber-400">
                      {formatCurrency(tableTotals.credits)}
                    </div>
                    <div className={`text-right text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>
                      {summary ? formatCurrency(summary.closing) : '—'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
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
