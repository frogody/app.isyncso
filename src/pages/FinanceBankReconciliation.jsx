import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  ArrowLeftRight, CheckCircle2, XCircle, Zap, Link2, Unlink, Calendar, DollarSign,
  Building2, Filter, ChevronDown, ChevronRight, ArrowRight, Landmark,
  Search, Plus, MoreVertical, AlertCircle, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

export default function FinanceBankReconciliation({ embedded = false }) {
  const { ft } = useTheme();
  const { user } = useUser();
  const companyId = user?.company_id || user?.organization_id;

  // ── State ─────────────────────────────────────────────────────────────
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [journalLines, setJournalLines] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [selectedBankTxn, setSelectedBankTxn] = useState(null);
  const [selectedJELine, setSelectedJELine] = useState(null);
  const [statementBalance, setStatementBalance] = useState('');
  const [bookBalance, setBookBalance] = useState(0);
  const [showNewReconciliationModal, setShowNewReconciliationModal] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [filter, setFilter] = useState('all');
  const [newRecForm, setNewRecForm] = useState({ statement_date: '', statement_balance: '' });
  const [savingRec, setSavingRec] = useState(false);
  const [completing, setCompleting] = useState(false);

  // ── Currency formatter ────────────────────────────────────────────────
  const formatCurrency = (num) => {
    if (num === null || num === undefined || num === '') return '\u20AC0.00';
    return `\u20AC${Math.abs(Number(num)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSignedCurrency = (num) => {
    if (num === null || num === undefined || num === '') return '\u20AC0.00';
    const n = Number(num);
    const prefix = n >= 0 ? '+' : '-';
    return `${prefix}\u20AC${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ── Date formatter ────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ── Load Bank Accounts ────────────────────────────────────────────────
  const loadBankAccounts = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*, accounts(code, name)')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);

      // Auto-select first account if none selected
      if (!selectedAccountId && data && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading bank accounts:', err);
      toast.error('Failed to load bank accounts');
    }
  };

  // ── Load Transactions & GL Lines ──────────────────────────────────────
  const loadTransactionsAndLines = async () => {
    if (!companyId || !selectedAccountId) {
      setBankTransactions([]);
      setJournalLines([]);
      setReconciliation(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Bank transactions for this account
      const { data: txns, error: txnError } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_account_id', selectedAccountId)
        .order('transaction_date', { ascending: false })
        .range(0, 9999);

      if (txnError) throw txnError;
      setBankTransactions(txns || []);

      // Unmatched journal entry lines on the linked GL account
      const bankAccount = bankAccounts.find(a => a.id === selectedAccountId);
      if (bankAccount?.account_id) {
        const { data: lines, error: lineError } = await supabase
          .from('journal_entry_lines')
          .select('*, journal_entries!inner(id, entry_number, entry_date, description, source_type, is_posted)')
          .eq('account_id', bankAccount.account_id)
          .eq('journal_entries.company_id', companyId)
          .eq('journal_entries.is_posted', true)
          .order('created_at', { ascending: false })
          .range(0, 9999);

        if (lineError) throw lineError;

        // Filter out already-matched lines
        const matchedLineIds = (txns || [])
          .filter(t => t.matched_journal_line_id)
          .map(t => t.matched_journal_line_id);
        const unmatchedLines = (lines || []).filter(l => !matchedLineIds.includes(l.id));
        setJournalLines(unmatchedLines);

        // Calculate book balance from GL lines
        const totalDebits = (lines || []).reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
        const totalCredits = (lines || []).reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
        setBookBalance(totalDebits - totalCredits);
      } else {
        setJournalLines([]);
        setBookBalance(0);
      }

      // Load active reconciliation for this account
      const { data: rec } = await supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('bank_account_id', selectedAccountId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setReconciliation(rec || null);
      if (rec?.statement_balance) {
        setStatementBalance(rec.statement_balance);
      } else {
        const ba = bankAccounts.find(a => a.id === selectedAccountId);
        setStatementBalance(ba?.current_balance || 0);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (companyId) {
      loadBankAccounts();
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedAccountId && bankAccounts.length > 0) {
      loadTransactionsAndLines();
    }
  }, [selectedAccountId, bankAccounts]);

  // ── Computed values ───────────────────────────────────────────────────
  const filteredBankTxns = useMemo(() => {
    if (filter === 'unmatched') return bankTransactions.filter(t => t.match_status === 'unmatched' || !t.match_status);
    if (filter === 'matched') return bankTransactions.filter(t => t.match_status === 'matched' || t.match_status === 'manually_matched');
    return bankTransactions;
  }, [bankTransactions, filter]);

  const unmatchedCount = useMemo(() =>
    bankTransactions.filter(t => t.match_status === 'unmatched' || !t.match_status).length,
    [bankTransactions]
  );

  const matchedCount = useMemo(() =>
    bankTransactions.filter(t => t.match_status === 'matched' || t.match_status === 'manually_matched').length,
    [bankTransactions]
  );

  const excludedCount = useMemo(() =>
    bankTransactions.filter(t => t.match_status === 'excluded').length,
    [bankTransactions]
  );

  const difference = useMemo(() => {
    const stmtBal = Number(statementBalance) || 0;
    return stmtBal - bookBalance;
  }, [statementBalance, bookBalance]);

  const allMatched = useMemo(() =>
    bankTransactions.length > 0 && unmatchedCount === 0,
    [bankTransactions, unmatchedCount]
  );

  const selectedBankAccount = useMemo(() =>
    bankAccounts.find(a => a.id === selectedAccountId),
    [bankAccounts, selectedAccountId]
  );

  // ── Auto-Match ────────────────────────────────────────────────────────
  const handleAutoMatch = async () => {
    if (!selectedAccountId || !companyId) return;
    setMatching(true);
    try {
      const { data, error } = await supabase.rpc('auto_match_bank_transactions', {
        p_bank_account_id: selectedAccountId,
        p_company_id: companyId,
      });

      if (error) throw error;

      const matchedN = data?.matched_count || 0;
      const totalN = data?.total_count || bankTransactions.length;
      const remainingN = totalN - matchedN;

      toast.success(`Matched ${matchedN} of ${totalN} transactions (${remainingN} remaining)`);
      setSelectedBankTxn(null);
      setSelectedJELine(null);
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error auto-matching:', err);
      toast.error('Failed to auto-match transactions');
    } finally {
      setMatching(false);
    }
  };

  // ── Manual Match ──────────────────────────────────────────────────────
  const handleManualMatch = async () => {
    if (!selectedBankTxn || !selectedJELine) return;
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          matched_journal_entry_id: selectedJELine.journal_entries?.id || selectedJELine.journal_entry_id,
          matched_journal_line_id: selectedJELine.id,
          match_status: 'manually_matched',
          matched_at: new Date().toISOString(),
          matched_by: user?.id,
        })
        .eq('id', selectedBankTxn.id);

      if (error) throw error;
      toast.success('Transaction matched successfully');
      setSelectedBankTxn(null);
      setSelectedJELine(null);
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error matching transaction:', err);
      toast.error('Failed to match transaction');
    }
  };

  // ── Unmatch ───────────────────────────────────────────────────────────
  const handleUnmatch = async (txn) => {
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          matched_journal_entry_id: null,
          matched_journal_line_id: null,
          match_status: 'unmatched',
          matched_at: null,
          matched_by: null,
        })
        .eq('id', txn.id);

      if (error) throw error;
      toast.success('Transaction unmatched');
      setSelectedBankTxn(null);
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error unmatching:', err);
      toast.error('Failed to unmatch transaction');
    }
  };

  // ── Exclude ───────────────────────────────────────────────────────────
  const handleExclude = async (txn) => {
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          match_status: 'excluded',
          matched_journal_entry_id: null,
          matched_journal_line_id: null,
        })
        .eq('id', txn.id);

      if (error) throw error;
      toast.success('Transaction excluded from reconciliation');
      setSelectedBankTxn(null);
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error excluding transaction:', err);
      toast.error('Failed to exclude transaction');
    }
  };

  // ── Include (un-exclude) ──────────────────────────────────────────────
  const handleInclude = async (txn) => {
    try {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ match_status: 'unmatched' })
        .eq('id', txn.id);

      if (error) throw error;
      toast.success('Transaction included again');
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error including transaction:', err);
      toast.error('Failed to include transaction');
    }
  };

  // ── Start New Reconciliation ──────────────────────────────────────────
  const handleCreateReconciliation = async () => {
    if (!newRecForm.statement_date) {
      toast.error('Statement date is required');
      return;
    }
    if (!newRecForm.statement_balance && newRecForm.statement_balance !== 0) {
      toast.error('Statement balance is required');
      return;
    }

    setSavingRec(true);
    try {
      const { data: rec, error } = await supabase
        .from('bank_reconciliations')
        .insert({
          bank_account_id: selectedAccountId,
          company_id: companyId,
          statement_date: newRecForm.statement_date,
          statement_balance: Number(newRecForm.statement_balance),
          status: 'in_progress',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Assign all unmatched bank transactions to this reconciliation
      const unmatchedTxnIds = bankTransactions
        .filter(t => !t.reconciliation_id && (t.match_status === 'unmatched' || !t.match_status))
        .map(t => t.id);

      if (unmatchedTxnIds.length > 0) {
        const { error: assignErr } = await supabase
          .from('bank_transactions')
          .update({ reconciliation_id: rec.id })
          .in('id', unmatchedTxnIds);

        if (assignErr) console.error('Error assigning transactions to reconciliation:', assignErr);
      }

      toast.success('New reconciliation started');
      setShowNewReconciliationModal(false);
      setNewRecForm({ statement_date: '', statement_balance: '' });
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error creating reconciliation:', err);
      toast.error('Failed to create reconciliation');
    } finally {
      setSavingRec(false);
    }
  };

  // ── Complete Reconciliation ───────────────────────────────────────────
  const handleCompleteReconciliation = async () => {
    if (!reconciliation?.id) return;
    setCompleting(true);
    try {
      const { data, error } = await supabase.rpc('complete_bank_reconciliation', {
        p_reconciliation_id: reconciliation.id,
        p_company_id: companyId,
      });

      if (error) throw error;
      toast.success('Reconciliation completed successfully');
      setShowCompleteDialog(false);
      setSelectedBankTxn(null);
      setSelectedJELine(null);
      await loadTransactionsAndLines();
    } catch (err) {
      console.error('Error completing reconciliation:', err);
      toast.error('Failed to complete reconciliation');
    } finally {
      setCompleting(false);
    }
  };

  // ── Match Status Badge ────────────────────────────────────────────────
  const getMatchStatusBadge = (status, confidence) => {
    switch (status) {
      case 'matched':
        return (
          <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Matched{confidence ? ` (${confidence}%)` : ''}
          </Badge>
        );
      case 'manually_matched':
        return (
          <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 text-xs">
            <Link2 className="w-3 h-3 mr-1" />
            Manual Match
          </Badge>
        );
      case 'excluded':
        return (
          <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Excluded
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
            Unmatched
          </Badge>
        );
    }
  };

  // ── Source Type Badge ─────────────────────────────────────────────────
  const getSourceBadge = (sourceType) => {
    switch (sourceType) {
      case 'invoice':
        return <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10 text-xs">Invoice</Badge>;
      case 'expense':
        return <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10 text-xs">Expense</Badge>;
      case 'bill':
        return <Badge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/10 text-xs">Bill</Badge>;
      case 'payment':
        return <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 text-xs">Payment</Badge>;
      case 'manual':
        return <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10 text-xs">Manual</Badge>;
      default:
        return sourceType ? (
          <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10 text-xs">{sourceType}</Badge>
        ) : null;
    }
  };

  // ── Bank Transaction Row ──────────────────────────────────────────────
  const renderBankTransactionRow = (txn) => {
    const isSelected = selectedBankTxn?.id === txn.id;
    const isMatched = txn.match_status === 'matched' || txn.match_status === 'manually_matched';
    const isExcluded = txn.match_status === 'excluded';
    const amount = Number(txn.amount) || 0;

    return (
      <div
        key={txn.id}
        onClick={() => {
          if (isSelected) {
            setSelectedBankTxn(null);
          } else {
            setSelectedBankTxn(txn);
          }
        }}
        className={`p-3.5 border-b cursor-pointer transition-all ${
          isSelected
            ? 'ring-2 ring-blue-500 bg-blue-500/10'
            : isMatched
              ? `bg-green-500/5 border-green-500/20 ${ft('hover:bg-green-500/10', 'hover:bg-green-500/10')}`
              : isExcluded
                ? `opacity-60 ${ft('border-slate-100 hover:bg-slate-50', 'border-white/[0.04] hover:bg-white/[0.03]')}`
                : ft('border-slate-100 hover:bg-slate-50', 'border-white/[0.04] hover:bg-white/[0.03]')
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>
                {formatDate(txn.transaction_date)}
              </span>
              {txn.reference && (
                <Badge variant="outline" className={`text-xs ${ft('text-slate-500 border-slate-300', 'text-zinc-500 border-zinc-600')}`}>
                  {txn.reference}
                </Badge>
              )}
            </div>
            <p className={`text-sm font-medium truncate ${ft('text-slate-900', 'text-white')}`}>
              {txn.description || 'No description'}
            </p>
            {txn.counterparty && (
              <p className={`text-xs mt-0.5 ${ft('text-slate-500', 'text-zinc-500')}`}>
                {txn.counterparty}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              {getMatchStatusBadge(txn.match_status, txn.match_confidence)}
              {isMatched && txn.matched_journal_entry_id && (
                <span className={`text-xs flex items-center gap-1 ${ft('text-slate-500', 'text-zinc-500')}`}>
                  <ArrowRight className="w-3 h-3" />
                  Matched JE
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`text-sm font-semibold ${amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatSignedCurrency(amount)}
            </span>
            {(isMatched || isExcluded) && (
              <div className="mt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={`h-6 w-6 ${ft('hover:bg-slate-100', 'hover:bg-white/[0.06]')}`}>
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    {isMatched && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleUnmatch(txn); }}
                        className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Unmatch
                      </DropdownMenuItem>
                    )}
                    {isExcluded && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleInclude(txn); }}
                        className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Include Again
                      </DropdownMenuItem>
                    )}
                    {!isExcluded && (
                      <>
                        <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleExclude(txn); }}
                          className="text-zinc-400 hover:bg-zinc-500/10"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Exclude
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Journal Entry Line Row ────────────────────────────────────────────
  const renderJournalLineRow = (line) => {
    const isSelected = selectedJELine?.id === line.id;
    const je = line.journal_entries;
    const debit = Number(line.debit_amount) || 0;
    const credit = Number(line.credit_amount) || 0;

    return (
      <div
        key={line.id}
        onClick={() => {
          if (isSelected) {
            setSelectedJELine(null);
          } else {
            setSelectedJELine(line);
          }
        }}
        className={`p-3.5 border-b cursor-pointer transition-all ${
          isSelected
            ? 'ring-2 ring-blue-500 bg-blue-500/10'
            : ft('border-slate-100 hover:bg-slate-50', 'border-white/[0.04] hover:bg-white/[0.03]')
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-mono font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>
                {je?.entry_number || '—'}
              </span>
              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>
                {formatDate(je?.entry_date)}
              </span>
            </div>
            <p className={`text-sm truncate ${ft('text-slate-900', 'text-white')}`}>
              {je?.description || line.description || 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {getSourceBadge(je?.source_type)}
              {line.description && je?.description !== line.description && (
                <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>
                  {line.description}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {debit > 0 && (
              <span className="text-sm font-semibold text-green-500">
                Dr {formatCurrency(debit)}
              </span>
            )}
            {credit > 0 && (
              <span className="text-sm font-semibold text-red-500">
                Cr {formatCurrency(credit)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <FinancePageTransition>
      <div className="space-y-6">
        {!embedded && (
          <PageHeader
            title="Bank Reconciliation"
            subtitle="Match bank transactions with journal entries"
            icon={Landmark}
          />
        )}

        {/* ── Top Bar: Account Selector + Actions ──────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Bank Account Selector */}
          <div className="flex items-center gap-3 flex-1">
            <Building2 className={`w-5 h-5 ${ft('text-slate-400', 'text-zinc-500')}`} />
            <select
              value={selectedAccountId || ''}
              onChange={(e) => {
                setSelectedAccountId(e.target.value || null);
                setSelectedBankTxn(null);
                setSelectedJELine(null);
              }}
              className={`rounded-md px-3 py-2 text-sm min-w-[250px] ${ft(
                'bg-white border border-slate-300 text-slate-900',
                'bg-zinc-800 border border-zinc-700 text-white'
              )} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {bankAccounts.length === 0 && (
                <option value="">No bank accounts</option>
              )}
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} — {acc.account_name || acc.accounts?.name || 'Account'} ({acc.account_number_last4 ? `****${acc.account_number_last4}` : acc.accounts?.code || ''})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAutoMatch}
              disabled={matching || !selectedAccountId || bankTransactions.length === 0}
              className={ft('border-slate-200 text-slate-700 hover:bg-slate-50', 'border-zinc-700 text-zinc-300 hover:bg-white/[0.03]')}
            >
              {matching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {matching ? 'Matching...' : 'Auto-Match'}
            </Button>
            <Button
              onClick={() => {
                setNewRecForm({ statement_date: '', statement_balance: '' });
                setShowNewReconciliationModal(true);
              }}
              disabled={!selectedAccountId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Reconciliation
            </Button>
          </div>
        </div>

        {/* ── No Bank Accounts Empty State ──────────────────────────────── */}
        {bankAccounts.length === 0 && !loading && (
          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-12 text-center">
              <Landmark className={`w-12 h-12 mx-auto mb-4 ${ft('text-slate-300', 'text-zinc-600')}`} />
              <h3 className={`text-lg font-semibold mb-2 ${ft('text-slate-900', 'text-white')}`}>
                No bank accounts configured
              </h3>
              <p className={ft('text-slate-500', 'text-zinc-400')}>
                Create a bank account first to start reconciling transactions.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Summary Bar ──────────────────────────────────────────────── */}
        {selectedAccountId && bankAccounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Statement Balance</p>
                    <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>
                      {formatCurrency(statementBalance)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Landmark className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Book Balance</p>
                    <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>
                      {formatCurrency(bookBalance)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Difference</p>
                    <p className={`text-2xl font-bold mt-1 ${difference === 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(difference)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${difference === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <ArrowLeftRight className={`w-5 h-5 ${difference === 0 ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Status</p>
                    <div className="flex items-center gap-2 mt-2">
                      {reconciliation ? (
                        reconciliation.status === 'in_progress' ? (
                          <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10">In Progress</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">Completed</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className={`${ft('text-slate-500 border-slate-300', 'text-zinc-400 border-zinc-600')}`}>No Active Reconciliation</Badge>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${ft('text-slate-500', 'text-zinc-500')}`}>
                      {matchedCount} matched / {unmatchedCount} unmatched / {excludedCount} excluded
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Split Panel: Bank Transactions | GL Journal Entries ──────── */}
        {selectedAccountId && bankAccounts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ─── Left Panel: Bank Transactions ──────────────────────── */}
            <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
              {/* Panel Header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between ${ft('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/[0.06]')}`}>
                <div className="flex items-center gap-2">
                  <Landmark className={`w-4 h-4 ${ft('text-slate-500', 'text-zinc-400')}`} />
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${ft('text-slate-600', 'text-zinc-400')}`}>
                    Bank Transactions
                  </h3>
                  <Badge variant="outline" className={`text-xs ${ft('text-slate-500 border-slate-300', 'text-zinc-500 border-zinc-600')}`}>
                    {filteredBankTxns.length}
                  </Badge>
                </div>
                {/* Filter */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : ft('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-white/[0.06]')
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('unmatched')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      filter === 'unmatched'
                        ? 'bg-amber-600 text-white'
                        : ft('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-white/[0.06]')
                    }`}
                  >
                    Unmatched
                  </button>
                  <button
                    onClick={() => setFilter('matched')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      filter === 'matched'
                        ? 'bg-green-600 text-white'
                        : ft('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-white/[0.06]')
                    }`}
                  >
                    Matched
                  </button>
                </div>
              </div>

              {/* Transaction List */}
              <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                {loading ? (
                  <div className={`p-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    Loading transactions...
                  </div>
                ) : filteredBankTxns.length === 0 ? (
                  <div className={`p-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    {bankTransactions.length === 0 ? (
                      <>
                        <p>No transactions imported for this account.</p>
                        <p className="text-sm mt-1">Import bank transactions to start reconciling.</p>
                      </>
                    ) : (
                      <>
                        <p>No {filter} transactions.</p>
                        <p className="text-sm mt-1">Change the filter to see other transactions.</p>
                      </>
                    )}
                  </div>
                ) : allMatched && filter === 'all' ? (
                  <div className="p-6">
                    <div className={`rounded-xl p-6 text-center ${ft('bg-green-50 border border-green-200', 'bg-green-500/10 border border-green-500/20')}`}>
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
                      <h4 className={`font-semibold mb-1 ${ft('text-green-800', 'text-green-400')}`}>
                        All transactions matched!
                      </h4>
                      <p className={`text-sm ${ft('text-green-600', 'text-green-500/70')}`}>
                        Ready to complete reconciliation.
                      </p>
                    </div>
                    {/* Still show matched transactions below */}
                    <div className="mt-4">
                      {filteredBankTxns.map(renderBankTransactionRow)}
                    </div>
                  </div>
                ) : (
                  filteredBankTxns.map(renderBankTransactionRow)
                )}
              </div>
            </Card>

            {/* ─── Right Panel: GL Journal Entry Lines ────────────────── */}
            <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
              {/* Panel Header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between ${ft('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/[0.06]')}`}>
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className={`w-4 h-4 ${ft('text-slate-500', 'text-zinc-400')}`} />
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${ft('text-slate-600', 'text-zinc-400')}`}>
                    GL Journal Entries
                  </h3>
                  <Badge variant="outline" className={`text-xs ${ft('text-slate-500 border-slate-300', 'text-zinc-500 border-zinc-600')}`}>
                    {journalLines.length}
                  </Badge>
                </div>
                {selectedBankAccount?.accounts && (
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>
                    {selectedBankAccount.accounts.code} — {selectedBankAccount.accounts.name}
                  </span>
                )}
              </div>

              {/* Journal Lines List */}
              <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
                {loading ? (
                  <div className={`p-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    Loading journal entries...
                  </div>
                ) : journalLines.length === 0 ? (
                  <div className={`p-10 text-center ${ft('text-slate-400', 'text-zinc-500')}`}>
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>All journal entries have been matched.</p>
                    <p className="text-sm mt-1">No unmatched entries remaining on this account.</p>
                  </div>
                ) : (
                  journalLines.map(renderJournalLineRow)
                )}
              </div>

              {/* Match Selected Button */}
              {selectedBankTxn && selectedJELine && (
                <div className={`px-5 py-3 border-t ${ft('bg-slate-50 border-slate-200', 'bg-white/[0.03] border-white/[0.06]')}`}>
                  <Button
                    onClick={handleManualMatch}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Match Selected
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Bottom Action Bar ──────────────────────────────────────── */}
        {selectedAccountId && bankAccounts.length > 0 && bankTransactions.length > 0 && (
          <div className={`flex items-center justify-between px-5 py-3 rounded-xl border ${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')}`}>
            <div className="flex items-center gap-2">
              {selectedBankTxn && (selectedBankTxn.match_status === 'matched' || selectedBankTxn.match_status === 'manually_matched') && (
                <Button
                  variant="outline"
                  onClick={() => handleUnmatch(selectedBankTxn)}
                  className={ft('border-slate-200 text-slate-700 hover:bg-slate-50', 'border-zinc-700 text-zinc-300 hover:bg-white/[0.03]')}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Unmatch Selected
                </Button>
              )}
              {selectedBankTxn && selectedBankTxn.match_status !== 'excluded' && (
                <Button
                  variant="outline"
                  onClick={() => handleExclude(selectedBankTxn)}
                  className={ft('border-slate-200 text-slate-700 hover:bg-slate-50', 'border-zinc-700 text-zinc-300 hover:bg-white/[0.03]')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Exclude Selected
                </Button>
              )}
            </div>
            <Button
              onClick={() => setShowCompleteDialog(true)}
              disabled={!reconciliation || reconciliation.status !== 'in_progress'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Reconciliation
            </Button>
          </div>
        )}

        {/* ── New Reconciliation Modal ───────────────────────────────── */}
        <Dialog open={showNewReconciliationModal} onOpenChange={setShowNewReconciliationModal}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-md`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                Start New Reconciliation
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Enter the statement details from your bank to begin reconciliation for{' '}
                <span className="font-medium">{selectedBankAccount?.bank_name}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Statement Date</Label>
                <Input
                  type="date"
                  value={newRecForm.statement_date}
                  onChange={(e) => setNewRecForm({ ...newRecForm, statement_date: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Statement Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newRecForm.statement_balance}
                  onChange={(e) => setNewRecForm({ ...newRecForm, statement_balance: e.target.value })}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>
              {/* Preview info */}
              <div className={`rounded-lg p-3 ${ft('bg-slate-50 border border-slate-200', 'bg-zinc-800/50 border border-zinc-700')}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Unmatched transactions</span>
                  <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{unmatchedCount}</span>
                </div>
                <p className={`text-xs mt-1 ${ft('text-slate-500', 'text-zinc-500')}`}>
                  These will be assigned to the new reconciliation.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewReconciliationModal(false)}
                className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateReconciliation} disabled={savingRec} className="bg-blue-600 hover:bg-blue-700 text-white">
                {savingRec ? 'Creating...' : 'Start Reconciliation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Complete Reconciliation Confirmation ────────────────────── */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} sm:max-w-md`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                Complete Reconciliation
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Review the reconciliation summary before completing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className={`rounded-lg p-4 space-y-3 ${ft('bg-slate-50 border border-slate-200', 'bg-zinc-800/50 border border-zinc-700')}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Statement Balance</span>
                  <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(statementBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>Book Balance</span>
                  <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(bookBalance)}</span>
                </div>
                <div className={`border-t pt-2 ${ft('border-slate-200', 'border-zinc-700')}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>Difference</span>
                    <span className={`text-sm font-bold ${difference === 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(difference)}
                    </span>
                  </div>
                </div>
                <div className={`border-t pt-2 space-y-1.5 ${ft('border-slate-200', 'border-zinc-700')}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>Matched</span>
                    <span className="text-xs text-green-400">{matchedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>Unmatched</span>
                    <span className="text-xs text-amber-400">{unmatchedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>Excluded</span>
                    <span className="text-xs text-zinc-400">{excludedCount}</span>
                  </div>
                </div>
              </div>

              {/* Warning if unmatched */}
              {unmatchedCount > 0 && (
                <div className={`flex items-start gap-2 rounded-lg p-3 ${ft('bg-amber-50 border border-amber-200', 'bg-amber-500/10 border border-amber-500/20')}`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                  <p className={`text-sm ${ft('text-amber-800', 'text-amber-400')}`}>
                    There are still {unmatchedCount} unmatched transaction{unmatchedCount !== 1 ? 's' : ''}. Are you sure you want to complete this reconciliation?
                  </p>
                </div>
              )}

              {difference !== 0 && (
                <div className={`flex items-start gap-2 rounded-lg p-3 ${ft('bg-red-50 border border-red-200', 'bg-red-500/10 border border-red-500/20')}`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                  <p className={`text-sm ${ft('text-red-800', 'text-red-400')}`}>
                    The statement balance does not match the book balance. Difference: {formatCurrency(difference)}.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCompleteDialog(false)}
                className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteReconciliation}
                disabled={completing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {completing ? 'Completing...' : 'Complete Reconciliation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FinancePageTransition>
  );
}
