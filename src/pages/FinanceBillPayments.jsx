import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { BillPayment, Bill, Vendor, Account, AccountType, JournalEntry } from '@/api/entities';
import {
  Wallet, Plus, Search, Filter, Download, ChevronDown, X,
  MoreVertical, Eye, Trash2, Sun, Moon, AlertCircle,
  DollarSign, Clock, Calendar, CreditCard, Building2,
  FileText, Banknote, CheckCircle, TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
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

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `€${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const METHOD_MAP = {
  bank_transfer: { label: 'Bank Transfer', icon: Building2 },
  check: { label: 'Check', icon: FileText },
  cash: { label: 'Cash', icon: Banknote },
  credit_card: { label: 'Credit Card', icon: CreditCard },
  other: { label: 'Other', icon: DollarSign },
};

// ── Bill Selector ───────────────────────────────────────────────────────────
function BillSelector({ bills, vendors, value, onChange, ft }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v; });
    return m;
  }, [vendors]);

  const payableBills = useMemo(() =>
    bills.filter(b => (b.status === 'pending' || b.status === 'partial') && (parseFloat(b.balance_due) || 0) > 0),
    [bills]
  );

  const filtered = useMemo(() => {
    if (!query) return payableBills;
    const q = query.toLowerCase();
    return payableBills.filter(b =>
      (b.bill_number || '').toLowerCase().includes(q) ||
      (vendorMap[b.vendor_id]?.name || '').toLowerCase().includes(q) ||
      (b.vendor_invoice_number || '').toLowerCase().includes(q)
    );
  }, [payableBills, query, vendorMap]);

  const selected = bills.find(b => b.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full text-left rounded-md px-3 py-2 text-sm border truncate ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} ${!value ? ft('text-slate-400', 'text-zinc-500') : ''}`}>
        {selected ? `${selected.bill_number} — ${vendorMap[selected.vendor_id]?.name || 'Unknown'} — Due: ${formatCurrency(selected.balance_due)}` : 'Select a bill...'}
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border shadow-xl ${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
          <div className="p-2 sticky top-0 bg-inherit z-10">
            <Input placeholder="Search bills..." value={query} onChange={(e) => setQuery(e.target.value)}
              className={`text-xs h-7 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} autoFocus />
          </div>
          {filtered.map(b => {
            const vendor = vendorMap[b.vendor_id];
            return (
              <button key={b.id} type="button" onClick={() => { onChange(b.id); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${ft('hover:bg-slate-50 text-slate-700', 'hover:bg-white/[0.05] text-zinc-300')} ${b.id === value ? ft('bg-blue-50', 'bg-blue-500/10') : ''}`}>
                <div>
                  <span className={`font-mono text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{b.bill_number}</span>
                  <span className="ml-2">{vendor?.name || 'Unknown'}</span>
                </div>
                <span className="text-amber-400 font-medium text-xs">{formatCurrency(b.balance_due)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <div className={`p-3 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No payable bills found</div>}
        </div>
      )}
    </div>
  );
}

// ── Account Selector (bank/cash accounts) ───────────────────────────────────
function BankAccountSelector({ accounts, accountTypes, value, onChange, ft }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const typeMap = useMemo(() => {
    const m = {};
    accountTypes.forEach(t => { m[t.id] = t.name; });
    return m;
  }, [accountTypes]);

  const bankAccounts = useMemo(() =>
    accounts.filter(a => {
      const typeName = typeMap[a.account_type_id];
      return typeName === 'Asset' && ((a.code || '').startsWith('10') || (a.name || '').toLowerCase().includes('bank') || (a.name || '').toLowerCase().includes('cash'));
    }),
    [accounts, typeMap]
  );

  const filtered = useMemo(() => {
    if (!query) return bankAccounts;
    const q = query.toLowerCase();
    return bankAccounts.filter(a => (a.code || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q));
  }, [bankAccounts, query]);

  const selected = accounts.find(a => a.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full text-left rounded-md px-3 py-2 text-sm border truncate ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} ${!value ? ft('text-slate-400', 'text-zinc-500') : ''}`}>
        {selected ? `${selected.code} — ${selected.name}` : 'Select bank/cash account...'}
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 w-72 max-h-60 overflow-y-auto rounded-lg border shadow-xl ${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
          <div className="p-2 sticky top-0 bg-inherit z-10">
            <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)}
              className={`text-xs h-7 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} autoFocus />
          </div>
          <button type="button" onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-sm ${ft('hover:bg-slate-50 text-slate-400', 'hover:bg-white/[0.05] text-zinc-500')}`}>
            None
          </button>
          {filtered.map(a => (
            <button key={a.id} type="button" onClick={() => { onChange(a.id); setOpen(false); setQuery(''); }}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${ft('hover:bg-slate-50 text-slate-700', 'hover:bg-white/[0.05] text-zinc-300')} ${a.id === value ? ft('bg-blue-50', 'bg-blue-500/10') : ''}`}>
              <span className={`font-mono text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{a.code}</span>
              <span className="truncate">{a.name}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className={`p-3 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No bank/cash accounts found</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FinanceBillPayments({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [saving, setSaving] = useState(false);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);
  const canCreate = useMemo(() => !permLoading && hasPermission('finance.create'), [hasPermission, permLoading]);

  const defaultPayForm = {
    bill_id: '', payment_date: new Date().toISOString().slice(0, 10),
    amount: '', payment_method: 'bank_transfer', bank_account_id: '',
    reference: '', notes: '',
  };
  const [payForm, setPayForm] = useState(defaultPayForm);

  // Bulk pay state
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkMethod, setBulkMethod] = useState('bank_transfer');
  const [bulkBankId, setBulkBankId] = useState('');
  const [bulkReference, setBulkReference] = useState('');
  const [bulkSelections, setBulkSelections] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payData, billData, vendorData, acctData, typeData, jeData] = await Promise.all([
        db.entities.BillPayment?.list?.({ limit: 2000 }).catch(() => []),
        db.entities.Bill?.list?.({ limit: 2000 }).catch(() => []),
        db.entities.Vendor?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
        db.entities.JournalEntry?.list?.({ limit: 2000 }).catch(() => []),
      ]);
      setPayments((payData || []).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')));
      setBills(billData || []);
      setVendors((vendorData || []).filter(v => v.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setAccounts((acctData || []).filter(a => a.is_active !== false).sort((a, b) => (a.code || '').localeCompare(b.code || '')));
      setAccountTypes((typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      setJournalEntries(jeData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const vendorMap = useMemo(() => { const m = {}; vendors.forEach(v => { m[v.id] = v; }); return m; }, [vendors]);
  const billMap = useMemo(() => { const m = {}; bills.forEach(b => { m[b.id] = b; }); return m; }, [bills]);
  const accountMap = useMemo(() => { const m = {}; accounts.forEach(a => { m[a.id] = a; }); return m; }, [accounts]);
  const jeMap = useMemo(() => { const m = {}; journalEntries.forEach(j => { m[j.id] = j; }); return m; }, [journalEntries]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);

    let thisMonth = 0, thisWeek = 0, totalAmount = 0;
    payments.forEach(p => {
      const amt = parseFloat(p.amount) || 0;
      totalAmount += amt;
      if (p.payment_date) {
        const pd = new Date(p.payment_date);
        if (pd >= monthStart) thisMonth += amt;
        if (pd >= weekStart) thisWeek += amt;
      }
    });
    return {
      total: payments.length,
      thisMonth,
      thisWeek,
      average: payments.length > 0 ? totalAmount / payments.length : 0,
    };
  }, [payments]);

  // Filter
  const filteredPayments = useMemo(() => {
    let result = [...payments];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const bill = billMap[p.bill_id];
        const vendor = bill ? vendorMap[bill.vendor_id] : null;
        return (p.reference || '').toLowerCase().includes(q) ||
          (bill?.bill_number || '').toLowerCase().includes(q) ||
          (vendor?.name || '').toLowerCase().includes(q);
      });
    }
    if (methodFilter !== 'all') result = result.filter(p => p.payment_method === methodFilter);
    if (vendorFilter !== 'all') result = result.filter(p => {
      const bill = billMap[p.bill_id];
      return bill?.vendor_id === vendorFilter;
    });
    if (bankFilter !== 'all') result = result.filter(p => p.bank_account_id === bankFilter);
    if (dateFrom) result = result.filter(p => p.payment_date >= dateFrom);
    if (dateTo) result = result.filter(p => p.payment_date <= dateTo);
    return result;
  }, [payments, searchQuery, methodFilter, vendorFilter, bankFilter, dateFrom, dateTo, billMap, vendorMap]);

  const hasActiveFilters = searchQuery || methodFilter !== 'all' || vendorFilter !== 'all' || bankFilter !== 'all' || dateFrom || dateTo;
  const resetFilters = () => { setSearchQuery(''); setMethodFilter('all'); setVendorFilter('all'); setBankFilter('all'); setDateFrom(''); setDateTo(''); };

  const resetPayForm = () => setPayForm({ ...defaultPayForm });

  // When bill changes, default amount to balance_due
  const handleBillChange = (billId) => {
    const bill = billMap[billId];
    setPayForm(prev => ({
      ...prev,
      bill_id: billId,
      amount: bill ? (parseFloat(bill.balance_due) || 0).toFixed(2) : '',
    }));
  };

  const handleSavePayment = async () => {
    if (!payForm.bill_id) { toast.error('Select a bill'); return; }
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    const bill = billMap[payForm.bill_id];
    if (bill && amount > (parseFloat(bill.balance_due) || 0) + 0.01) { toast.error('Amount exceeds balance due'); return; }

    setSaving(true);
    try {
      const companyId = user.company_id || user.organization_id;
      const payment = await db.entities.BillPayment.create({
        company_id: companyId,
        bill_id: payForm.bill_id,
        payment_date: payForm.payment_date,
        amount,
        payment_method: payForm.payment_method,
        bank_account_id: payForm.bank_account_id || null,
        reference: payForm.reference.trim() || null,
        notes: payForm.notes.trim() || null,
        created_by: user.id,
      });

      try {
        await supabase.rpc('record_bill_payment', { p_payment_id: payment.id });
      } catch { /* Payment recorded even if JE fails */ }

      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      setShowCreateModal(false);
      resetPayForm();
      loadData();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // Bulk pay
  const payableBills = useMemo(() =>
    bills.filter(b => (b.status === 'pending' || b.status === 'partial') && (parseFloat(b.balance_due) || 0) > 0)
      .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')),
    [bills]
  );

  const openBulkModal = () => {
    setBulkDate(new Date().toISOString().slice(0, 10));
    setBulkMethod('bank_transfer');
    setBulkBankId('');
    setBulkReference('');
    setBulkSelections(payableBills.map(b => ({ bill_id: b.id, selected: false, amount: (parseFloat(b.balance_due) || 0).toFixed(2) })));
    setShowBulkModal(true);
  };

  const toggleBulkBill = (billId) => {
    setBulkSelections(prev => prev.map(s => s.bill_id === billId ? { ...s, selected: !s.selected } : s));
  };
  const setBulkAmount = (billId, amount) => {
    setBulkSelections(prev => prev.map(s => s.bill_id === billId ? { ...s, amount } : s));
  };

  const bulkSelected = bulkSelections.filter(s => s.selected);
  const bulkTotal = bulkSelected.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);

  const handleBulkPay = async () => {
    if (bulkSelected.length === 0) { toast.error('Select at least one bill'); return; }
    const invalid = bulkSelected.find(s => !parseFloat(s.amount) || parseFloat(s.amount) <= 0);
    if (invalid) { toast.error('All selected bills must have a valid amount'); return; }

    setSaving(true);
    try {
      const companyId = user.company_id || user.organization_id;
      let successCount = 0;
      for (const item of bulkSelected) {
        const payment = await db.entities.BillPayment.create({
          company_id: companyId,
          bill_id: item.bill_id,
          payment_date: bulkDate,
          amount: parseFloat(item.amount),
          payment_method: bulkMethod,
          bank_account_id: bulkBankId || null,
          reference: bulkReference.trim() || null,
          created_by: user.id,
        });
        try { await supabase.rpc('record_bill_payment', { p_payment_id: payment.id }); } catch {}
        successCount++;
      }
      toast.success(`${successCount} payment${successCount > 1 ? 's' : ''} recorded (${formatCurrency(bulkTotal)})`);
      setShowBulkModal(false);
      loadData();
    } catch (error) {
      console.error('Bulk payment error:', error);
      toast.error('Failed to record some payments');
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async () => {
    if (!selectedPayment) return;
    try {
      await db.entities.BillPayment.delete(selectedPayment.id);
      toast.success('Payment deleted');
      setShowDeleteModal(false);
      setShowDetailModal(false);
      setSelectedPayment(null);
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete payment');
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Reference', 'Vendor', 'Bill #', 'Method', 'Bank Account', 'Amount'];
    const rows = filteredPayments.map(p => {
      const bill = billMap[p.bill_id];
      const vendor = bill ? vendorMap[bill.vendor_id] : null;
      const bank = accountMap[p.bank_account_id];
      return [
        p.payment_date || '', p.reference || '', vendor?.name || '', bill?.bill_number || '',
        METHOD_MAP[p.payment_method]?.label || p.payment_method || '',
        bank ? `${bank.code} — ${bank.name}` : '', (parseFloat(p.amount) || 0).toFixed(2),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const openDetail = (payment) => { setSelectedPayment(payment); setShowDetailModal(true); };

  if (loading || permLoading) {
    if (embedded) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!canView) {
    if (embedded) return <div className="text-center py-12"><p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view bill payments.</p></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex flex-col items-center justify-center text-center p-6`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')} mb-2`}>Access Denied</h2>
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view bill payments.</p>
      </div>
    );
  }

  const content = (
    <>
        <div className={embedded ? "space-y-4" : "w-full px-4 lg:px-6 py-4 space-y-4"}>

          {!embedded && <PageHeader
            icon={Wallet}
            title="Bill Payments"
            subtitle="Track and manage payments made against vendor bills"
            color="blue"
            actions={
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                  onClick={exportCSV} disabled={filteredPayments.length === 0}>
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
                {canCreate && (
                  <>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                      onClick={openBulkModal} disabled={payableBills.length === 0}>
                      <CheckCircle className="w-4 h-4 mr-2" />Pay Multiple
                    </Button>
                    <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                      onClick={() => { resetPayForm(); setShowCreateModal(true); }}>
                      <Plus className="w-4 h-4 mr-2" />Record Payment
                    </Button>
                  </>
                )}
              </div>
            }
          />}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Payments', value: stats.total, sub: `${filteredPayments.length} shown`, icon: Wallet, color: 'blue', textClass: 'text-blue-400' },
              { label: 'Paid This Month', value: formatCurrency(stats.thisMonth), sub: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), icon: Calendar, color: 'green', textClass: 'text-green-400' },
              { label: 'Paid This Week', value: formatCurrency(stats.thisWeek), sub: 'Current week', icon: TrendingUp, color: 'blue', textClass: 'text-blue-400' },
              { label: 'Average Payment', value: formatCurrency(stats.average), sub: 'Per payment', icon: DollarSign, color: 'blue', textClass: 'text-blue-400' },
            ].map((s, i) => (
              <Card key={i} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{s.label}</span>
                    <s.icon className={`w-3.5 h-3.5 ${s.textClass}`} />
                  </div>
                  <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{s.value}</p>
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                <div className="flex-1 relative min-w-[200px]">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                  <Input placeholder="Search payments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                {/* Method */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Filter className="w-4 h-4 mr-2" />
                      {methodFilter === 'all' ? 'All Methods' : METHOD_MAP[methodFilter]?.label || methodFilter}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => setMethodFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>All Methods</DropdownMenuItem>
                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                    {Object.entries(METHOD_MAP).map(([k, v]) => (
                      <DropdownMenuItem key={k} onClick={() => setMethodFilter(k)} className={ft('text-slate-600', 'text-zinc-300')}>{v.label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Vendor */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      {vendorFilter === 'all' ? 'All Vendors' : (vendorMap[vendorFilter]?.name || 'Vendor').slice(0, 16)}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} max-h-60 overflow-y-auto`}>
                    <DropdownMenuItem onClick={() => setVendorFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>All Vendors</DropdownMenuItem>
                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                    {vendors.map(v => (
                      <DropdownMenuItem key={v.id} onClick={() => setVendorFilter(v.id)} className={ft('text-slate-600', 'text-zinc-300')}>{v.name}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Date range */}
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className={`w-36 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className={`w-36 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className={ft('text-slate-500', 'text-zinc-400')}>
                    <X className="w-4 h-4 mr-1" />Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-16">
                  <Wallet className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                    {payments.length === 0 ? 'No payments recorded yet' : 'No payments match your filters'}
                  </h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6`}>
                    {payments.length === 0 ? 'Record a payment when you pay a vendor bill.' : 'Try adjusting your search or filters.'}
                  </p>
                  {canCreate && payments.length === 0 && (
                    <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                      onClick={() => { resetPayForm(); setShowCreateModal(true); }}>
                      <Plus className="w-4 h-4 mr-2" />Record Payment
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1">Reference</div>
                    <div className="col-span-2">Vendor</div>
                    <div className="col-span-1">Bill #</div>
                    <div className="col-span-2">Method</div>
                    <div className="col-span-2">Bank Account</div>
                    <div className="col-span-1 text-right">Amount</div>
                    <div className="col-span-1 text-center">JE</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                    {filteredPayments.map(payment => {
                      const bill = billMap[payment.bill_id];
                      const vendor = bill ? vendorMap[bill.vendor_id] : null;
                      const bank = accountMap[payment.bank_account_id];
                      const method = METHOD_MAP[payment.payment_method] || METHOD_MAP.other;
                      const MethodIcon = method.icon;
                      const je = payment.journal_entry_id ? jeMap[payment.journal_entry_id] : null;

                      return (
                        <div key={payment.id}
                          className={`grid grid-cols-12 gap-2 items-center px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors cursor-pointer`}
                          onClick={() => openDetail(payment)}>
                          <div className="col-span-1">
                            <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{formatDate(payment.payment_date)}</span>
                          </div>
                          <div className="col-span-1">
                            <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')} truncate block`}>{payment.reference || '—'}</span>
                          </div>
                          <div className="col-span-2">
                            <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate`}>{vendor?.name || 'Unknown'}</p>
                          </div>
                          <div className="col-span-1">
                            <span className={`text-xs font-mono ${ft('text-slate-500', 'text-zinc-400')}`}>{bill?.bill_number || '—'}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1.5">
                            <MethodIcon className={`w-3.5 h-3.5 ${ft('text-slate-400', 'text-zinc-500')}`} />
                            <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{method.label}</span>
                          </div>
                          <div className="col-span-2">
                            <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')} truncate block`}>
                              {bank ? `${bank.code} — ${bank.name}` : '—'}
                            </span>
                          </div>
                          <div className={`col-span-1 text-right text-sm font-bold text-green-400`}>
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="col-span-1 text-center">
                            {je ? (
                              <span className={`text-[10px] font-mono ${ft('text-blue-500', 'text-blue-400')}`}>{je.entry_number}</span>
                            ) : (
                              <span className={`text-[10px] ${ft('text-slate-300', 'text-zinc-600')}`}>—</span>
                            )}
                          </div>
                          <div className="col-span-1 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                                <DropdownMenuItem onClick={() => openDetail(payment)} className={ft('text-slate-600', 'text-zinc-300')}>
                                  <Eye className="w-4 h-4 mr-2" />View Details
                                </DropdownMenuItem>
                                {canCreate && (
                                  <>
                                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                    <DropdownMenuItem onClick={() => { setSelectedPayment(payment); setShowDeleteModal(true); }} className="text-red-400">
                                      <Trash2 className="w-4 h-4 mr-2" />Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Record Payment Modal ──────────────────────────────────────── */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetPayForm(); } else setShowCreateModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-lg max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-400" /> Record Payment
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Record a payment against a vendor bill
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Bill *</Label>
                <div className="mt-1">
                  <BillSelector bills={bills} vendors={vendors} value={payForm.bill_id} onChange={handleBillChange} ft={ft} />
                </div>
              </div>
              {payForm.bill_id && billMap[payForm.bill_id] && (
                <div className={`p-2 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')} flex items-center justify-between`}>
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Balance Due</span>
                  <span className="text-sm font-bold text-amber-400">{formatCurrency(billMap[payForm.bill_id].balance_due)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Payment Date *</Label>
                  <Input type="date" value={payForm.payment_date} onChange={(e) => setPayForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Amount *</Label>
                  <Input type="number" step="0.01" min="0" value={payForm.amount} onChange={(e) => setPayForm(prev => ({ ...prev, amount: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Payment Method</Label>
                <select value={payForm.payment_method} onChange={(e) => setPayForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}>
                  {Object.entries(METHOD_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Bank / Cash Account</Label>
                <div className="mt-1">
                  <BankAccountSelector accounts={accounts} accountTypes={accountTypes} value={payForm.bank_account_id}
                    onChange={(v) => setPayForm(prev => ({ ...prev, bank_account_id: v }))} ft={ft} />
                </div>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Reference</Label>
                <Input placeholder="Check #, transfer ref..." value={payForm.reference} onChange={(e) => setPayForm(prev => ({ ...prev, reference: e.target.value }))}
                  className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Notes</Label>
                <Textarea placeholder="Additional notes..." value={payForm.notes} onChange={(e) => setPayForm(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                  className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
              </div>
            </div>
            <DialogFooter className="gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); resetPayForm(); }}
                className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>Cancel</Button>
              <Button onClick={handleSavePayment} disabled={saving || !payForm.bill_id || !parseFloat(payForm.amount)}
                className={ft('bg-green-600 hover:bg-green-700 text-white', 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30')}>
                <CreditCard className="w-4 h-4 mr-2" />
                {saving ? 'Recording...' : `Pay ${payForm.amount ? formatCurrency(payForm.amount) : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Detail Modal ─────────────────────────────────────────────── */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-lg`}>
            {selectedPayment && (() => {
              const bill = billMap[selectedPayment.bill_id];
              const vendor = bill ? vendorMap[bill.vendor_id] : null;
              const bank = accountMap[selectedPayment.bank_account_id];
              const method = METHOD_MAP[selectedPayment.payment_method] || METHOD_MAP.other;
              const MethodIcon = method.icon;
              const je = selectedPayment.journal_entry_id ? jeMap[selectedPayment.journal_entry_id] : null;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-green-400" /> Payment Details
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${ft('bg-green-50 border border-green-200', 'bg-green-500/5 border border-green-500/20')} text-center`}>
                      <p className={`text-[10px] uppercase ${ft('text-green-600', 'text-green-400/70')}`}>Amount Paid</p>
                      <p className="text-2xl font-bold text-green-400">{formatCurrency(selectedPayment.amount)}</p>
                    </div>

                    <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                      <div>
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Payment Date</p>
                        <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatDate(selectedPayment.payment_date)}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Reference</p>
                        <p className={`text-sm font-medium font-mono ${ft('text-slate-900', 'text-white')}`}>{selectedPayment.reference || '—'}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Method</p>
                        <div className="flex items-center gap-1.5">
                          <MethodIcon className={`w-3.5 h-3.5 ${ft('text-slate-500', 'text-zinc-400')}`} />
                          <p className={`text-sm ${ft('text-slate-900', 'text-white')}`}>{method.label}</p>
                        </div>
                      </div>
                      <div>
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Bank Account</p>
                        <p className={`text-sm ${ft('text-slate-900', 'text-white')}`}>{bank ? `${bank.code} — ${bank.name}` : '—'}</p>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                      <p className={`text-[10px] uppercase mb-1 ${ft('text-slate-400', 'text-zinc-500')}`}>Bill</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-sm font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{bill?.bill_number || '—'}</span>
                          <span className={`text-sm ml-2 ${ft('text-slate-900', 'text-white')}`}>{vendor?.name || 'Unknown'}</span>
                        </div>
                        <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{bill ? formatCurrency(bill.total_amount) : '—'}</span>
                      </div>
                    </div>

                    {je && (
                      <div className={`p-3 rounded-lg ${ft('bg-blue-50 border border-blue-200', 'bg-blue-500/5 border border-blue-500/20')}`}>
                        <p className={`text-[10px] uppercase mb-1 ${ft('text-blue-500', 'text-blue-400/70')}`}>Journal Entry</p>
                        <p className={`text-sm font-mono ${ft('text-blue-600', 'text-blue-400')}`}>{je.entry_number} — {je.description || 'Payment'}</p>
                      </div>
                    )}

                    {selectedPayment.notes && (
                      <div>
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Notes</p>
                        <p className={`text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>{selectedPayment.notes}</p>
                      </div>
                    )}

                    <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>
                      Created {formatDate(selectedPayment.created_at)}
                    </p>
                  </div>
                  <DialogFooter className="gap-3 pt-2">
                    <Button variant="outline" onClick={() => setShowDetailModal(false)}
                      className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>Close</Button>
                    {canCreate && (
                      <Button onClick={() => { setShowDeleteModal(true); }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                        <Trash2 className="w-4 h-4 mr-2" />Delete
                      </Button>
                    )}
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation ──────────────────────────────────────── */}
        <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-sm`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" /> Delete Payment
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                This will remove this payment record. The bill balance will not be automatically updated.
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className={`p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                <p className="text-sm font-bold text-green-400">{formatCurrency(selectedPayment.amount)}</p>
                <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{formatDate(selectedPayment.payment_date)} — {selectedPayment.reference || 'No reference'}</p>
              </div>
            )}
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}
                className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>Cancel</Button>
              <Button onClick={deletePayment}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Bulk Payment Modal ───────────────────────────────────────── */}
        <Dialog open={showBulkModal} onOpenChange={(open) => { if (!open) setShowBulkModal(false); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-3xl max-h-[92vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" /> Pay Multiple Bills
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Select bills and pay them in batch with a single payment date and method
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Shared payment info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Payment Date</Label>
                  <Input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Method</Label>
                  <select value={bulkMethod} onChange={(e) => setBulkMethod(e.target.value)}
                    className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}>
                    {Object.entries(METHOD_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Bank Account</Label>
                  <div className="mt-1">
                    <BankAccountSelector accounts={accounts} accountTypes={accountTypes} value={bulkBankId}
                      onChange={(v) => setBulkBankId(v)} ft={ft} />
                  </div>
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Reference</Label>
                  <Input placeholder="Batch ref..." value={bulkReference} onChange={(e) => setBulkReference(e.target.value)}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
              </div>

              {/* Bill selection */}
              <div className={`rounded-lg border ${ft('border-slate-200', 'border-zinc-700')}`}>
                <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')} rounded-t-lg`}>
                  <div className="col-span-1">Select</div>
                  <div className="col-span-2">Bill #</div>
                  <div className="col-span-3">Vendor</div>
                  <div className="col-span-1">Due Date</div>
                  <div className="col-span-2 text-right">Balance</div>
                  <div className="col-span-3 text-right">Pay Amount</div>
                </div>
                <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')} max-h-64 overflow-y-auto`}>
                  {bulkSelections.map(item => {
                    const bill = billMap[item.bill_id];
                    if (!bill) return null;
                    const vendor = vendorMap[bill.vendor_id];
                    const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();
                    return (
                      <div key={item.bill_id} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${item.selected ? ft('bg-green-50/50', 'bg-green-500/5') : ''}`}>
                        <div className="col-span-1">
                          <input type="checkbox" checked={item.selected} onChange={() => toggleBulkBill(item.bill_id)}
                            className="rounded border-zinc-600" />
                        </div>
                        <div className="col-span-2">
                          <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{bill.bill_number}</span>
                        </div>
                        <div className="col-span-3">
                          <span className={`text-sm ${ft('text-slate-900', 'text-white')} truncate block`}>{vendor?.name || 'Unknown'}</span>
                        </div>
                        <div className="col-span-1">
                          <span className={`text-xs ${isOverdue ? 'text-red-400 font-medium' : ft('text-slate-500', 'text-zinc-400')}`}>
                            {formatDate(bill.due_date)}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm font-medium text-amber-400">{formatCurrency(bill.balance_due)}</span>
                        </div>
                        <div className="col-span-3 text-right">
                          {item.selected ? (
                            <Input type="number" step="0.01" min="0" value={item.amount}
                              onChange={(e) => setBulkAmount(item.bill_id, e.target.value)}
                              className={`h-7 text-sm text-right w-32 ml-auto ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                          ) : (
                            <span className={`text-sm ${ft('text-slate-300', 'text-zinc-600')}`}>—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Bulk total */}
                <div className={`px-3 py-2 flex items-center justify-between ${ft('bg-slate-50 border-t border-slate-200', 'bg-zinc-800/30 border-t border-zinc-700')} rounded-b-lg`}>
                  <span className={`text-sm font-medium ${ft('text-slate-600', 'text-zinc-300')}`}>
                    {bulkSelected.length} bill{bulkSelected.length !== 1 ? 's' : ''} selected
                  </span>
                  <span className="text-lg font-bold text-green-400">{formatCurrency(bulkTotal)}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkModal(false)}
                className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>Cancel</Button>
              <Button onClick={handleBulkPay} disabled={saving || bulkSelected.length === 0}
                className={ft('bg-green-600 hover:bg-green-700 text-white', 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30')}>
                <CreditCard className="w-4 h-4 mr-2" />
                {saving ? 'Processing...' : `Pay ${formatCurrency(bulkTotal)}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
