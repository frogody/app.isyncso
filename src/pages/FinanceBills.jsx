import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { Bill, BillLineItem, BillPayment, Vendor, Account, AccountType } from '@/api/entities';
import {
  ScrollText, Plus, Search, Filter, Download, ChevronDown, ChevronRight,
  MoreVertical, Edit2, Sun, Moon, AlertCircle, Trash2, X,
  DollarSign, Clock, CheckCircle, XCircle, Calculator, Eye, Ban,
  ArrowUpDown, Calendar, CreditCard
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

const STATUS_MAP = {
  draft: { label: 'Draft', cls: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10' },
  pending: { label: 'Pending', cls: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  partial: { label: 'Partial', cls: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  paid: { label: 'Paid', cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
  void: { label: 'Void', cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
};

const EMPTY_LINE = { description: '', account_id: '', quantity: '1', unit_price: '', tax_percent: '0' };

// ── Vendor Selector ─────────────────────────────────────────────────────────
function VendorSelector({ vendors, value, onChange, ft }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return vendors;
    const q = query.toLowerCase();
    return vendors.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.vendor_code || '').toLowerCase().includes(q)
    );
  }, [vendors, query]);

  const selected = vendors.find(v => v.id === value);

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
        {selected ? `${selected.vendor_code} — ${selected.name}` : 'Select vendor...'}
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 w-80 max-h-60 overflow-y-auto rounded-lg border shadow-xl ${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
          <div className="p-2 sticky top-0 bg-inherit z-10">
            <Input placeholder="Search vendors..." value={query} onChange={(e) => setQuery(e.target.value)}
              className={`text-xs h-7 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} autoFocus />
          </div>
          {filtered.map(v => (
            <button key={v.id} type="button" onClick={() => { onChange(v.id); setOpen(false); setQuery(''); }}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${ft('hover:bg-slate-50 text-slate-700', 'hover:bg-white/[0.05] text-zinc-300')} ${v.id === value ? ft('bg-blue-50', 'bg-blue-500/10') : ''}`}>
              <span className={`font-mono text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{v.vendor_code}</span>
              <span className="truncate">{v.name}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className={`p-3 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No vendors found</div>}
        </div>
      )}
    </div>
  );
}

// ── Account Selector (all active accounts, grouped by type) ─────────────────
function AccountSelector({ accounts, accountTypes, value, onChange, ft }) {
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
    return accounts.filter(a => (a.code || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q));
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
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full text-left rounded-md px-2 py-1.5 text-sm border truncate ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} ${!value ? ft('text-slate-400', 'text-zinc-500') : ''}`}>
        {selected ? `${selected.code} — ${selected.name}` : 'Select account...'}
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-lg border shadow-xl ${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
          <div className="p-2 sticky top-0 bg-inherit z-10">
            <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)}
              className={`text-xs h-7 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`} autoFocus />
          </div>
          {Object.entries(grouped).map(([typeName, accts]) => (
            <div key={typeName}>
              <div className={`px-2 py-1 text-[10px] uppercase tracking-wider font-medium ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/50')}`}>{typeName}</div>
              {accts.map(a => (
                <button key={a.id} type="button" onClick={() => { onChange(a.id); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 ${ft('hover:bg-slate-50 text-slate-700', 'hover:bg-white/[0.05] text-zinc-300')} ${a.id === value ? ft('bg-blue-50', 'bg-blue-500/10') : ''}`}>
                  <span className={`font-mono text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{a.code}</span>
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <div className={`p-3 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No accounts found</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FinanceBills() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [expandedBillId, setExpandedBillId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);
  const canCreate = useMemo(() => !permLoading && hasPermission('finance.create'), [hasPermission, permLoading]);

  const defaultForm = {
    vendor_id: '', vendor_invoice_number: '', bill_date: new Date().toISOString().slice(0, 10),
    due_date: '', ap_account_id: '', notes: '',
    lines: [{ ...EMPTY_LINE }],
  };
  const [formData, setFormData] = useState(defaultForm);

  const defaultPayForm = { payment_date: new Date().toISOString().slice(0, 10), amount: '', payment_method: 'bank_transfer', reference: '', bank_account_id: '' };
  const [payForm, setPayForm] = useState(defaultPayForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [billData, lineData, payData, vendorData, acctData, typeData] = await Promise.all([
        db.entities.Bill?.list?.({ limit: 2000 }).catch(() => []),
        db.entities.BillLineItem?.list?.({ limit: 5000 }).catch(() => []),
        db.entities.BillPayment?.list?.({ limit: 2000 }).catch(() => []),
        db.entities.Vendor?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
      ]);
      setBills(billData || []);
      setLineItems(lineData || []);
      setPayments(payData || []);
      setVendors((vendorData || []).filter(v => v.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setAccounts((acctData || []).filter(a => a.is_active !== false).sort((a, b) => (a.code || '').localeCompare(b.code || '')));
      setAccountTypes((typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const vendorMap = useMemo(() => {
    const m = {};
    vendors.forEach(v => { m[v.id] = v; });
    return m;
  }, [vendors]);

  const accountMap = useMemo(() => {
    const m = {};
    accounts.forEach(a => { m[a.id] = a; });
    return m;
  }, [accounts]);

  const typeMap = useMemo(() => {
    const m = {};
    accountTypes.forEach(t => { m[t.id] = t.name; });
    return m;
  }, [accountTypes]);

  const billLinesMap = useMemo(() => {
    const m = {};
    lineItems.forEach(l => {
      if (!m[l.bill_id]) m[l.bill_id] = [];
      m[l.bill_id].push(l);
    });
    return m;
  }, [lineItems]);

  const billPaymentsMap = useMemo(() => {
    const m = {};
    payments.forEach(p => {
      if (!m[p.bill_id]) m[p.bill_id] = [];
      m[p.bill_id].push(p);
    });
    return m;
  }, [payments]);

  // Find the default AP account (code 2000)
  const defaultAPAccount = useMemo(() =>
    accounts.find(a => a.code === '2000') || accounts.find(a => (a.name || '').toLowerCase().includes('accounts payable')),
    [accounts]
  );

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let pendingAmount = 0, overdueCount = 0, paidThisMonth = 0;
    bills.forEach(b => {
      if (b.status === 'pending' || b.status === 'partial') {
        pendingAmount += parseFloat(b.balance_due) || 0;
        if (b.due_date && new Date(b.due_date) < now) overdueCount++;
      }
    });
    payments.forEach(p => {
      if (p.payment_date) {
        const pd = new Date(p.payment_date);
        if (pd >= monthStart && pd <= monthEnd) paidThisMonth += parseFloat(p.amount) || 0;
      }
    });
    return { total: bills.length, pendingAmount, overdueCount, paidThisMonth };
  }, [bills, payments]);

  // Filter & sort
  const filteredBills = useMemo(() => {
    let result = [...bills];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        (b.bill_number || '').toLowerCase().includes(q) ||
        (b.vendor_invoice_number || '').toLowerCase().includes(q) ||
        (vendorMap[b.vendor_id]?.name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter);
    if (vendorFilter !== 'all') result = result.filter(b => b.vendor_id === vendorFilter);
    if (dateFrom) result = result.filter(b => b.bill_date >= dateFrom);
    if (dateTo) result = result.filter(b => b.bill_date <= dateTo);
    result.sort((a, b) => (b.bill_date || '').localeCompare(a.bill_date || '') || (b.bill_number || '').localeCompare(a.bill_number || ''));
    return result;
  }, [bills, searchQuery, statusFilter, vendorFilter, dateFrom, dateTo, vendorMap]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || vendorFilter !== 'all' || dateFrom || dateTo;
  const resetFilters = () => { setSearchQuery(''); setStatusFilter('all'); setVendorFilter('all'); setDateFrom(''); setDateTo(''); };

  // Line item helpers
  const calcLineAmount = (line) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    return Math.round(qty * price * 100) / 100;
  };
  const calcLineTax = (line) => {
    const amt = calcLineAmount(line);
    const pct = parseFloat(line.tax_percent) || 0;
    return Math.round(amt * pct / 100 * 100) / 100;
  };
  const calcLineTotal = (line) => calcLineAmount(line) + calcLineTax(line);

  const formTotals = useMemo(() => {
    const subtotal = formData.lines.reduce((s, l) => s + calcLineAmount(l), 0);
    const taxTotal = formData.lines.reduce((s, l) => s + calcLineTax(l), 0);
    return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
  }, [formData.lines]);

  const setLine = (idx, field, value) => {
    setFormData(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, lines };
    });
  };
  const addLine = () => setFormData(prev => ({ ...prev, lines: [...prev.lines, { ...EMPTY_LINE }] }));
  const removeLine = (idx) => {
    if (formData.lines.length <= 1) return;
    setFormData(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  };

  const resetForm = () => { setFormData({ ...defaultForm, lines: [{ ...EMPTY_LINE }] }); setEditMode(false); setSelectedBill(null); };

  // Auto-calculate due date when vendor changes
  const handleVendorChange = (vendorId) => {
    setFormData(prev => {
      const vendor = vendorMap[vendorId];
      const terms = vendor?.payment_terms || 30;
      const billDate = prev.bill_date ? new Date(prev.bill_date) : new Date();
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + terms);
      const update = { ...prev, vendor_id: vendorId, due_date: dueDate.toISOString().slice(0, 10) };
      // Set default AP account if not set
      if (!prev.ap_account_id && defaultAPAccount) update.ap_account_id = defaultAPAccount.id;
      // Pre-fill line account from vendor default
      if (vendor?.default_expense_account_id && prev.lines.length === 1 && !prev.lines[0].account_id) {
        update.lines = [{ ...prev.lines[0], account_id: vendor.default_expense_account_id }];
      }
      return update;
    });
  };

  const openEdit = async (bill) => {
    if (bill.status !== 'draft') { toast.error('Only draft bills can be edited'); return; }
    const lines = (billLinesMap[bill.id] || []).sort((a, b) => (a.line_order || 0) - (b.line_order || 0));
    setFormData({
      vendor_id: bill.vendor_id || '',
      vendor_invoice_number: bill.vendor_invoice_number || '',
      bill_date: bill.bill_date || new Date().toISOString().slice(0, 10),
      due_date: bill.due_date || '',
      ap_account_id: bill.ap_account_id || defaultAPAccount?.id || '',
      notes: bill.notes || '',
      lines: lines.length > 0 ? lines.map(l => ({
        id: l.id,
        description: l.description || '',
        account_id: l.account_id || '',
        quantity: (l.quantity || 1).toString(),
        unit_price: (l.unit_price || 0).toString(),
        tax_percent: (l.tax_percent || 0).toString(),
      })) : [{ ...EMPTY_LINE }],
    });
    setSelectedBill(bill);
    setEditMode(true);
    setShowCreateModal(true);
  };

  const handleSave = async (andPost = false) => {
    if (!formData.vendor_id) { toast.error('Vendor is required'); return; }
    if (!formData.bill_date) { toast.error('Bill date is required'); return; }
    const validLines = formData.lines.filter(l => l.account_id && parseFloat(l.unit_price) > 0);
    if (validLines.length === 0) { toast.error('At least one line item with account and amount is required'); return; }

    setSaving(true);
    try {
      const companyId = user.company_id || user.organization_id;
      const billPayload = {
        company_id: companyId,
        vendor_id: formData.vendor_id,
        vendor_invoice_number: formData.vendor_invoice_number.trim() || null,
        bill_date: formData.bill_date,
        due_date: formData.due_date || null,
        ap_account_id: formData.ap_account_id || defaultAPAccount?.id || null,
        notes: formData.notes.trim() || null,
        status: 'draft',
      };

      let billId;
      if (editMode && selectedBill) {
        billPayload.updated_by = user.id;
        await db.entities.Bill.update(selectedBill.id, billPayload);
        billId = selectedBill.id;
        // Delete existing lines and recreate
        const existingLines = billLinesMap[billId] || [];
        for (const l of existingLines) {
          await db.entities.BillLineItem.delete(l.id);
        }
      } else {
        billPayload.created_by = user.id;
        const created = await db.entities.Bill.create(billPayload);
        billId = created.id;
      }

      // Create line items
      for (let i = 0; i < validLines.length; i++) {
        const l = validLines[i];
        await db.entities.BillLineItem.create({
          bill_id: billId,
          account_id: l.account_id,
          description: l.description || null,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_percent: parseFloat(l.tax_percent) || 0,
          line_order: i + 1,
        });
      }

      if (andPost) {
        const { data } = await supabase.rpc('post_bill', { p_bill_id: billId });
        if (data?.success) {
          toast.success(`Bill posted — JE ${data.journal_entry_number || ''} created`);
        } else {
          toast.error(data?.error || 'Saved but failed to post');
        }
      } else {
        toast.success(editMode ? 'Bill updated' : 'Bill saved as draft');
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const postBill = async (bill) => {
    try {
      const { data } = await supabase.rpc('post_bill', { p_bill_id: bill.id });
      if (data?.success) {
        toast.success(`Bill ${bill.bill_number} posted — JE ${data.journal_entry_number || ''} created`);
        loadData();
      } else {
        toast.error(data?.error || 'Failed to post bill');
      }
    } catch (error) {
      console.error('Post error:', error);
      toast.error('Failed to post bill');
    }
  };

  const voidBill = async () => {
    if (!voidReason.trim()) { toast.error('Void reason is required'); return; }
    try {
      await db.entities.Bill.update(selectedBill.id, {
        status: 'void',
        notes: `${selectedBill.notes || ''}\n[VOIDED] ${voidReason.trim()}`.trim(),
        updated_by: user.id,
      });
      toast.success('Bill voided');
      setShowVoidModal(false);
      setVoidReason('');
      setSelectedBill(null);
      loadData();
    } catch (error) {
      console.error('Void error:', error);
      toast.error('Failed to void bill');
    }
  };

  const deleteBill = async (bill) => {
    if (bill.status !== 'draft') { toast.error('Only draft bills can be deleted'); return; }
    try {
      const existingLines = billLinesMap[bill.id] || [];
      for (const l of existingLines) {
        await db.entities.BillLineItem.delete(l.id);
      }
      await db.entities.Bill.delete(bill.id);
      toast.success('Bill deleted');
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete bill');
    }
  };

  // Quick Pay
  const openPayModal = (bill) => {
    setSelectedBill(bill);
    setPayForm({
      ...defaultPayForm,
      amount: (parseFloat(bill.balance_due) || 0).toFixed(2),
    });
    setShowPayModal(true);
  };

  const handlePay = async () => {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error('Payment amount must be greater than 0'); return; }
    if (amount > (parseFloat(selectedBill.balance_due) || 0) + 0.01) { toast.error('Payment exceeds balance due'); return; }

    setSaving(true);
    try {
      const companyId = user.company_id || user.organization_id;
      const payment = await db.entities.BillPayment.create({
        company_id: companyId,
        bill_id: selectedBill.id,
        payment_date: payForm.payment_date,
        amount: amount,
        payment_method: payForm.payment_method,
        reference: payForm.reference.trim() || null,
        bank_account_id: payForm.bank_account_id || null,
        created_by: user.id,
      });

      // Try to record payment via RPC (creates JE)
      try {
        await supabase.rpc('record_bill_payment', { p_payment_id: payment.id });
      } catch { /* Payment recorded even if JE creation fails */ }

      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      setShowPayModal(false);
      setSelectedBill(null);
      loadData();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Bank accounts for payment
  const bankAccounts = useMemo(() =>
    accounts.filter(a => {
      const typeName = typeMap[a.account_type_id];
      return typeName === 'Asset' && ((a.code || '').startsWith('10') || (a.name || '').toLowerCase().includes('bank') || (a.name || '').toLowerCase().includes('cash'));
    }),
    [accounts, typeMap]
  );

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
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view bills.</p>
      </div>
    );
  }

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">

          {/* Header */}
          <PageHeader
            icon={ScrollText}
            title="Bills"
            subtitle="Manage vendor bills and accounts payable"
            color="blue"
            actions={
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                {canCreate && (
                  <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                    onClick={() => { resetForm(); if (defaultAPAccount) setFormData(prev => ({ ...prev, ap_account_id: defaultAPAccount.id })); setShowCreateModal(true); }}>
                    <Plus className="w-4 h-4 mr-2" />New Bill
                  </Button>
                )}
              </div>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Bills', value: stats.total, sub: `${filteredBills.length} shown`, icon: ScrollText, color: 'blue' },
              { label: 'Pending Amount', value: formatCurrency(stats.pendingAmount), sub: 'Unpaid balance', icon: Clock, color: 'amber' },
              { label: 'Overdue Bills', value: stats.overdueCount, sub: 'Past due date', icon: AlertCircle, color: 'red' },
              { label: 'Paid This Month', value: formatCurrency(stats.paidThisMonth), sub: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), icon: CheckCircle, color: 'green' },
            ].map((s, i) => (
              <Card key={i} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{s.label}</span>
                    <s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} />
                  </div>
                  <p className={`text-lg font-bold ${s.color === 'red' && stats.overdueCount > 0 ? 'text-red-400' : s.color === 'amber' && stats.pendingAmount > 0 ? 'text-amber-400' : ft('text-slate-900', 'text-white')}`}>
                    {s.value}
                  </p>
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                  <Input placeholder="Search bills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                {/* Status */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Filter className="w-4 h-4 mr-2" />
                      {statusFilter === 'all' ? 'All Status' : STATUS_MAP[statusFilter]?.label || statusFilter}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>All Status</DropdownMenuItem>
                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <DropdownMenuItem key={k} onClick={() => setStatusFilter(k)} className={ft('text-slate-600', 'text-zinc-300')}>{v.label}</DropdownMenuItem>
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
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From"
                  className={`w-36 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To"
                  className={`w-36 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className={ft('text-slate-500', 'text-zinc-400')}>
                    <X className="w-4 h-4 mr-1" />Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bills Table */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {filteredBills.length === 0 ? (
                <div className="text-center py-16">
                  <ScrollText className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                    {bills.length === 0 ? 'No bills yet' : 'No bills match your filters'}
                  </h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6`}>
                    {bills.length === 0 ? 'Create your first bill to track vendor payables.' : 'Try adjusting your search or filters.'}
                  </p>
                  {canCreate && bills.length === 0 && (
                    <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                      onClick={() => { resetForm(); setShowCreateModal(true); }}>
                      <Plus className="w-4 h-4 mr-2" />New Bill
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                    <div className="col-span-1">Bill #</div>
                    <div className="col-span-2">Vendor</div>
                    <div className="col-span-1">Vendor Inv #</div>
                    <div className="col-span-1">Bill Date</div>
                    <div className="col-span-1">Due Date</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-2 text-right">Balance Due</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                    {filteredBills.map(bill => {
                      const vendor = vendorMap[bill.vendor_id];
                      const st = STATUS_MAP[bill.status] || STATUS_MAP.draft;
                      const isExpanded = expandedBillId === bill.id;
                      const isOverdue = bill.due_date && new Date(bill.due_date) < new Date() && bill.status !== 'paid' && bill.status !== 'void';
                      const isVoided = bill.status === 'void';
                      const lines = billLinesMap[bill.id] || [];
                      const billPaymentsList = billPaymentsMap[bill.id] || [];

                      return (
                        <div key={bill.id}>
                          <div className={`grid grid-cols-12 gap-2 items-center px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors cursor-pointer ${isVoided ? 'opacity-50' : ''}`}
                            onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}>
                            <div className="col-span-1 flex items-center gap-1">
                              {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                              <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{bill.bill_number}</span>
                            </div>
                            <div className="col-span-2">
                              <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate`}>{vendor?.name || 'Unknown'}</p>
                            </div>
                            <div className="col-span-1">
                              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')} truncate block`}>{bill.vendor_invoice_number || '—'}</span>
                            </div>
                            <div className="col-span-1">
                              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{formatDate(bill.bill_date)}</span>
                            </div>
                            <div className="col-span-1">
                              <span className={`text-xs ${isOverdue ? 'text-red-400 font-medium' : ft('text-slate-500', 'text-zinc-400')}`}>
                                {formatDate(bill.due_date)}
                                {isOverdue && ' ⚠'}
                              </span>
                            </div>
                            <div className={`col-span-1 text-right text-sm font-medium ${isVoided ? 'line-through' : ''} ${ft('text-slate-900', 'text-white')}`}>
                              {formatCurrency(bill.total_amount)}
                            </div>
                            <div className={`col-span-2 text-right text-sm font-medium ${
                              isVoided ? 'line-through ' + ft('text-slate-400', 'text-zinc-500')
                              : (parseFloat(bill.balance_due) || 0) > 0
                                ? (isOverdue ? 'text-red-400' : 'text-amber-400')
                                : 'text-green-400'
                            }`}>
                              {formatCurrency(bill.balance_due)}
                            </div>
                            <div className="col-span-1 text-center">
                              <Badge variant="outline" className={`${st.cls} text-[10px]`}>{st.label}</Badge>
                            </div>
                            <div className="col-span-2 text-right flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {(bill.status === 'pending' || bill.status === 'partial') && (parseFloat(bill.balance_due) || 0) > 0 && canCreate && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-green-400 hover:text-green-300 text-[10px]"
                                  onClick={() => openPayModal(bill)}>
                                  <CreditCard className="w-3 h-3 mr-1" />Pay
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                                  <DropdownMenuItem onClick={() => setExpandedBillId(bill.id)} className={ft('text-slate-600', 'text-zinc-300')}>
                                    <Eye className="w-4 h-4 mr-2" />View Details
                                  </DropdownMenuItem>
                                  {bill.status === 'draft' && canCreate && (
                                    <>
                                      <DropdownMenuItem onClick={() => openEdit(bill)} className={ft('text-slate-600', 'text-zinc-300')}>
                                        <Edit2 className="w-4 h-4 mr-2" />Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => postBill(bill)} className="text-green-400">
                                        <CheckCircle className="w-4 h-4 mr-2" />Post Bill
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                      <DropdownMenuItem onClick={() => deleteBill(bill)} className="text-red-400">
                                        <Trash2 className="w-4 h-4 mr-2" />Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {(bill.status === 'pending' || bill.status === 'partial') && canCreate && (
                                    <>
                                      <DropdownMenuItem onClick={() => openPayModal(bill)} className="text-green-400">
                                        <CreditCard className="w-4 h-4 mr-2" />Record Payment
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                      <DropdownMenuItem onClick={() => { setSelectedBill(bill); setShowVoidModal(true); }} className="text-red-400">
                                        <Ban className="w-4 h-4 mr-2" />Void Bill
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className={`px-6 py-4 ${ft('bg-slate-50 border-t border-slate-100', 'bg-zinc-800/20 border-t border-zinc-800')}`}>
                              <div className="space-y-4">
                                {/* Bill info row */}
                                <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 p-3 rounded-lg ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                  <div>
                                    <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Vendor Invoice</p>
                                    <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{bill.vendor_invoice_number || '—'}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>AP Account</p>
                                    <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{accountMap[bill.ap_account_id]?.name || '—'}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Subtotal</p>
                                    <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(bill.subtotal)}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Tax</p>
                                    <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(bill.tax_amount)}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Amount Paid</p>
                                    <p className="text-sm font-bold text-green-400">{formatCurrency(bill.amount_paid)}</p>
                                  </div>
                                </div>

                                {bill.notes && (
                                  <p className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{bill.notes}</p>
                                )}

                                {/* Line items */}
                                <div>
                                  <h4 className={`text-xs font-semibold uppercase mb-2 ${ft('text-slate-400', 'text-zinc-500')}`}>Line Items</h4>
                                  <div className={`rounded-lg border ${ft('border-slate-200', 'border-zinc-700')}`}>
                                    <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')} rounded-t-lg`}>
                                      <div className="col-span-3">Description</div>
                                      <div className="col-span-3">Account</div>
                                      <div className="col-span-1 text-right">Qty</div>
                                      <div className="col-span-2 text-right">Unit Price</div>
                                      <div className="col-span-1 text-right">Tax %</div>
                                      <div className="col-span-2 text-right">Total</div>
                                    </div>
                                    <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                                      {lines.sort((a, b) => (a.line_order || 0) - (b.line_order || 0)).map(line => {
                                        const acct = accountMap[line.account_id];
                                        const lineAmt = parseFloat(line.amount) || (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
                                        const lineTax = lineAmt * (parseFloat(line.tax_percent) || 0) / 100;
                                        return (
                                          <div key={line.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                                            <div className="col-span-3">
                                              <span className={`text-sm ${ft('text-slate-900', 'text-white')}`}>{line.description || '—'}</span>
                                            </div>
                                            <div className="col-span-3">
                                              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{acct ? `${acct.code} — ${acct.name}` : '—'}</span>
                                            </div>
                                            <div className={`col-span-1 text-right text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>{line.quantity}</div>
                                            <div className={`col-span-2 text-right text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>{formatCurrency(line.unit_price)}</div>
                                            <div className={`col-span-1 text-right text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>{line.tax_percent || 0}%</div>
                                            <div className={`col-span-2 text-right text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(lineAmt + lineTax)}</div>
                                          </div>
                                        );
                                      })}
                                      {lines.length === 0 && (
                                        <div className={`px-3 py-4 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No line items</div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Payments */}
                                {billPaymentsList.length > 0 && (
                                  <div>
                                    <h4 className={`text-xs font-semibold uppercase mb-2 ${ft('text-slate-400', 'text-zinc-500')}`}>Payments</h4>
                                    <div className="space-y-1">
                                      {billPaymentsList.sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || '')).map(p => (
                                        <div key={p.id} className={`flex items-center justify-between p-2 rounded ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                          <div className="flex items-center gap-3">
                                            <CreditCard className="w-3.5 h-3.5 text-green-400" />
                                            <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{formatDate(p.payment_date)}</span>
                                            <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{p.payment_method?.replace('_', ' ') || '—'}</span>
                                            {p.reference && <span className={`text-xs font-mono ${ft('text-slate-400', 'text-zinc-500')}`}>{p.reference}</span>}
                                          </div>
                                          <span className="text-sm font-bold text-green-400">{formatCurrency(p.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Create / Edit Bill Modal ──────────────────────────────────── */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetForm(); } else setShowCreateModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-4xl max-h-[92vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Bill' : 'New Bill'}</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editMode ? 'Update this draft bill' : 'Enter a vendor bill for accounts payable'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Vendor *</Label>
                  <div className="mt-1">
                    <VendorSelector vendors={vendors} value={formData.vendor_id} onChange={handleVendorChange} ft={ft} />
                  </div>
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Vendor Invoice #</Label>
                  <Input placeholder="Their reference" value={formData.vendor_invoice_number} onChange={(e) => set('vendor_invoice_number', e.target.value)}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Bill Date *</Label>
                  <Input type="date" value={formData.bill_date} onChange={(e) => set('bill_date', e.target.value)}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} required />
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Due Date</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => set('due_date', e.target.value)}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                <div className="md:col-span-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>AP Account</Label>
                  <div className="mt-1">
                    <AccountSelector accounts={accounts} accountTypes={accountTypes} value={formData.ap_account_id} onChange={(v) => set('ap_account_id', v)} ft={ft} />
                  </div>
                </div>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Notes</Label>
                <Textarea placeholder="Additional notes..." value={formData.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                  className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}
                    className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                    <Plus className="w-3 h-3 mr-1" />Add Line
                  </Button>
                </div>

                <div className={`rounded-lg border ${ft('border-slate-200', 'border-zinc-700')}`}>
                  {/* Line header */}
                  <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium ${ft('text-slate-400 bg-slate-50 border-b border-slate-200', 'text-zinc-500 bg-zinc-800/50 border-b border-zinc-700')} rounded-t-lg`}>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-3">Account</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-2">Unit Price</div>
                    <div className="col-span-1">Tax %</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1" />
                  </div>

                  {formData.lines.map((line, idx) => (
                    <div key={idx} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${ft('border-b border-slate-100', 'border-b border-zinc-800')} last:border-b-0`}>
                      <div className="col-span-3">
                        <Input placeholder="Description" value={line.description} onChange={(e) => setLine(idx, 'description', e.target.value)}
                          className={`h-8 text-sm ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className="col-span-3">
                        <AccountSelector accounts={accounts} accountTypes={accountTypes} value={line.account_id} onChange={(val) => setLine(idx, 'account_id', val)} ft={ft} />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" step="0.01" min="0" value={line.quantity} onChange={(e) => setLine(idx, 'quantity', e.target.value)}
                          className={`h-8 text-sm text-right ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" step="0.01" min="0" placeholder="0.00" value={line.unit_price} onChange={(e) => setLine(idx, 'unit_price', e.target.value)}
                          className={`h-8 text-sm text-right ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" step="0.01" min="0" placeholder="0" value={line.tax_percent} onChange={(e) => setLine(idx, 'tax_percent', e.target.value)}
                          className={`h-8 text-sm text-right ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className={`col-span-1 text-right text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>
                        {formatCurrency(calcLineTotal(line))}
                      </div>
                      <div className="col-span-1 text-center">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => removeLine(idx)} disabled={formData.lines.length <= 1}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className={`px-3 py-2 rounded-b-lg ${ft('bg-slate-50 border-t border-slate-200', 'bg-zinc-800/30 border-t border-zinc-700')}`}>
                    <div className="flex justify-end gap-6">
                      <div className="text-right">
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Subtotal</p>
                        <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(formTotals.subtotal)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Tax</p>
                        <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(formTotals.taxTotal)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Grand Total</p>
                        <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(formTotals.grandTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={() => handleSave(false)}
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')} variant="outline">
                  {saving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button type="button" disabled={saving || formTotals.grandTotal <= 0} onClick={() => handleSave(true)}
                  className={formTotals.grandTotal > 0
                    ? ft('bg-green-600 hover:bg-green-700 text-white', 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30')
                    : ft('bg-slate-200 text-slate-400 cursor-not-allowed', 'bg-zinc-800 text-zinc-500 cursor-not-allowed')
                  }>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {saving ? 'Posting...' : 'Save & Post'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Void Modal ───────────────────────────────────────────────── */}
        <Dialog open={showVoidModal} onOpenChange={(open) => { if (!open) { setShowVoidModal(false); setVoidReason(''); } else setShowVoidModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-md`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Ban className="w-5 h-5" /> Void Bill
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                This will mark the bill as void. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedBill && (
              <div className={`p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                <p className={`text-sm font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{selectedBill.bill_number}</p>
                <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{vendorMap[selectedBill.vendor_id]?.name} — {formatCurrency(selectedBill.total_amount)}</p>
              </div>
            )}
            <div>
              <Label className={ft('text-slate-700', 'text-zinc-300')}>Reason for voiding *</Label>
              <Textarea placeholder="Explain why this bill is being voided..."
                value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3}
                className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
            </div>
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => { setShowVoidModal(false); setVoidReason(''); }}
                className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={voidBill} disabled={!voidReason.trim()}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                <Ban className="w-4 h-4 mr-2" />Void Bill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Quick Pay Modal ──────────────────────────────────────────── */}
        <Dialog open={showPayModal} onOpenChange={(open) => { if (!open) { setShowPayModal(false); setSelectedBill(null); } else setShowPayModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-md`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-400" /> Record Payment
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                Record a payment against this bill
              </DialogDescription>
            </DialogHeader>
            {selectedBill && (
              <div className={`p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{selectedBill.bill_number}</p>
                    <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{vendorMap[selectedBill.vendor_id]?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Balance Due</p>
                    <p className="text-sm font-bold text-amber-400">{formatCurrency(selectedBill.balance_due)}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
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
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Payment Method</Label>
                <select value={payForm.payment_method} onChange={(e) => setPayForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Bank / Cash Account</Label>
                <div className="mt-1">
                  <AccountSelector accounts={bankAccounts} accountTypes={accountTypes} value={payForm.bank_account_id}
                    onChange={(v) => setPayForm(prev => ({ ...prev, bank_account_id: v }))} ft={ft} />
                </div>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Reference</Label>
                <Input placeholder="Check #, transfer ref..." value={payForm.reference} onChange={(e) => setPayForm(prev => ({ ...prev, reference: e.target.value }))}
                  className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
              </div>
            </div>
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => { setShowPayModal(false); setSelectedBill(null); }}
                className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={handlePay} disabled={saving || !parseFloat(payForm.amount)}
                className={ft('bg-green-600 hover:bg-green-700 text-white', 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30')}>
                <CreditCard className="w-4 h-4 mr-2" />
                {saving ? 'Recording...' : `Pay ${payForm.amount ? formatCurrency(payForm.amount) : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </FinancePageTransition>
  );
}
