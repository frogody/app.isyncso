import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { Vendor, Bill, Account, AccountType } from '@/api/entities';
import {
  Users, Plus, Search, Filter, Download, ChevronDown, ChevronRight,
  MoreVertical, Edit2, Sun, Moon, AlertCircle, ToggleLeft, ToggleRight,
  Building2, Mail, Phone, Globe, FileText, DollarSign, Clock,
  ArrowUpDown, ExternalLink, Receipt
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

// ── Account Selector (expense accounts only) ───────────────────────────────
function ExpenseAccountSelector({ accounts, accountTypes, value, onChange, ft }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const typeMap = useMemo(() => {
    const m = {};
    accountTypes.forEach(t => { m[t.id] = t; });
    return m;
  }, [accountTypes]);

  const expenseAccounts = useMemo(() =>
    accounts.filter(a => a.is_active !== false && typeMap[a.account_type_id]?.name === 'Expense'),
    [accounts, typeMap]
  );

  const filtered = useMemo(() => {
    if (!query) return expenseAccounts;
    const q = query.toLowerCase();
    return expenseAccounts.filter(a => (a.code || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q));
  }, [expenseAccounts, query]);

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
        {selected ? `${selected.code} — ${selected.name}` : 'Select expense account...'}
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
          {filtered.length === 0 && <div className={`p-3 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No expense accounts found</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function FinanceVendors({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedVendorId, setExpandedVendorId] = useState(null);
  const [modalTab, setModalTab] = useState('basic');

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);
  const canCreate = useMemo(() => !permLoading && hasPermission('finance.create'), [hasPermission, permLoading]);

  const defaultForm = {
    name: '', contact_name: '', email: '', phone: '', website: '', tax_id: '', notes: '',
    billing_address_line1: '', billing_address_line2: '', billing_city: '',
    billing_state: '', billing_postal_code: '', billing_country: '',
    payment_terms: '30', default_expense_account_id: '', is_active: true,
  };
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorData, billData, acctData, typeData] = await Promise.all([
        db.entities.Vendor?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.Bill?.list?.({ limit: 2000 }).catch(() => []),
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
      ]);
      setVendors(vendorData || []);
      setBills(billData || []);
      setAccounts(acctData || []);
      setAccountTypes((typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  // Per-vendor bill aggregates
  const vendorBillAgg = useMemo(() => {
    const agg = {};
    bills.forEach(b => {
      if (!agg[b.vendor_id]) agg[b.vendor_id] = { outstanding: 0, overdue: 0, totalBilled: 0, totalPaid: 0, recentBills: [] };
      const a = agg[b.vendor_id];
      if (b.status !== 'void') {
        a.totalBilled += parseFloat(b.total_amount) || 0;
        a.totalPaid += parseFloat(b.amount_paid) || 0;
        if (b.status !== 'paid') {
          const due = parseFloat(b.balance_due) || 0;
          a.outstanding += due;
          if (b.due_date && new Date(b.due_date) < new Date() && due > 0) a.overdue += due;
        }
      }
      a.recentBills.push(b);
    });
    Object.values(agg).forEach(a => {
      a.recentBills.sort((x, y) => (y.bill_date || '').localeCompare(x.bill_date || ''));
      a.recentBills = a.recentBills.slice(0, 5);
    });
    return agg;
  }, [bills]);

  // Stats
  const stats = useMemo(() => {
    const active = vendors.filter(v => v.is_active !== false);
    let outstanding = 0, overdue = 0;
    Object.values(vendorBillAgg).forEach(a => { outstanding += a.outstanding; overdue += a.overdue; });
    return { total: vendors.length, active: active.length, outstanding, overdue };
  }, [vendors, vendorBillAgg]);

  // Filter & sort
  const filteredVendors = useMemo(() => {
    let result = [...vendors];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.vendor_code || '').toLowerCase().includes(q) ||
        (v.email || '').toLowerCase().includes(q) ||
        (v.contact_name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'active') result = result.filter(v => v.is_active !== false);
    else if (statusFilter === 'inactive') result = result.filter(v => v.is_active === false);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortBy === 'code') cmp = (a.vendor_code || '').localeCompare(b.vendor_code || '');
      else if (sortBy === 'outstanding') cmp = (vendorBillAgg[b.id]?.outstanding || 0) - (vendorBillAgg[a.id]?.outstanding || 0);
      else if (sortBy === 'terms') cmp = (a.payment_terms || 0) - (b.payment_terms || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [vendors, searchQuery, statusFilter, sortBy, sortDir, vendorBillAgg]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const resetForm = () => { setFormData({ ...defaultForm }); setEditMode(false); setSelectedVendor(null); setModalTab('basic'); };

  const openEdit = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name || '', contact_name: vendor.contact_name || '', email: vendor.email || '',
      phone: vendor.phone || '', website: vendor.website || '', tax_id: vendor.tax_id || '', notes: vendor.notes || '',
      billing_address_line1: vendor.billing_address_line1 || '', billing_address_line2: vendor.billing_address_line2 || '',
      billing_city: vendor.billing_city || '', billing_state: vendor.billing_state || '',
      billing_postal_code: vendor.billing_postal_code || '', billing_country: vendor.billing_country || '',
      payment_terms: (vendor.payment_terms || 30).toString(),
      default_expense_account_id: vendor.default_expense_account_id || '',
      is_active: vendor.is_active !== false,
    });
    setEditMode(true);
    setModalTab('basic');
    setShowCreateModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Vendor name is required'); return; }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { toast.error('Invalid email format'); return; }

    setSaving(true);
    try {
      const companyId = user.company_id || user.organization_id;
      const payload = {
        company_id: companyId,
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        website: formData.website.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        notes: formData.notes.trim() || null,
        billing_address_line1: formData.billing_address_line1.trim() || null,
        billing_address_line2: formData.billing_address_line2.trim() || null,
        billing_city: formData.billing_city.trim() || null,
        billing_state: formData.billing_state.trim() || null,
        billing_postal_code: formData.billing_postal_code.trim() || null,
        billing_country: formData.billing_country.trim() || null,
        payment_terms: parseInt(formData.payment_terms) || 30,
        default_expense_account_id: formData.default_expense_account_id || null,
        is_active: formData.is_active,
      };

      if (editMode && selectedVendor) {
        payload.updated_by = user.id;
        await db.entities.Vendor.update(selectedVendor.id, payload);
        toast.success('Vendor updated');
      } else {
        payload.created_by = user.id;
        await db.entities.Vendor.create(payload);
        toast.success('Vendor created');
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving vendor:', error);
      if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        toast.error('A vendor with this code already exists');
      } else {
        toast.error('Failed to save vendor');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (vendor) => {
    try {
      await db.entities.Vendor.update(vendor.id, { is_active: !vendor.is_active, updated_by: user.id });
      toast.success(vendor.is_active ? 'Vendor deactivated' : 'Vendor reactivated');
      loadData();
    } catch (error) {
      toast.error('Failed to update vendor');
    }
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  if (loading || permLoading) {
    if (embedded) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" /></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!canView) {
    if (embedded) return <div className="text-center py-12"><p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view vendors.</p></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex flex-col items-center justify-center text-center p-6`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')} mb-2`}>Access Denied</h2>
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view vendors.</p>
      </div>
    );
  }

  // Tab styles helper
  const tabCls = (tab) => `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
    modalTab === tab
      ? ft('bg-white border-b-2 border-blue-500 text-blue-600', 'bg-zinc-800 border-b-2 border-blue-400 text-blue-400')
      : ft('text-slate-500 hover:text-slate-700', 'text-zinc-500 hover:text-zinc-300')
  }`;

  const content = (
    <>
        <div className={embedded ? "space-y-4" : "w-full px-4 lg:px-6 py-4 space-y-4"}>

          {/* Header */}
          {!embedded && <PageHeader
            icon={Users}
            title="Vendors"
            subtitle="Manage supplier and vendor master data"
            color="blue"
            actions={
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                {canCreate && (
                  <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                    onClick={() => { resetForm(); setShowCreateModal(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Add Vendor
                  </Button>
                )}
              </div>
            }
          />}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Vendors', value: stats.total, sub: `${stats.active} active`, icon: Users, color: 'blue' },
              { label: 'Active Vendors', value: stats.active, sub: `${stats.total - stats.active} inactive`, icon: Building2, color: 'blue' },
              { label: 'Total Outstanding', value: formatCurrency(stats.outstanding), sub: 'Unpaid balance', icon: DollarSign, color: 'amber' },
              { label: 'Overdue Amount', value: formatCurrency(stats.overdue), sub: 'Past due date', icon: Clock, color: 'red' },
            ].map((s, i) => (
              <Card key={i} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{s.label}</span>
                    <s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} />
                  </div>
                  <p className={`text-lg font-bold ${s.color === 'red' && stats.overdue > 0 ? 'text-red-400' : s.color === 'amber' && stats.outstanding > 0 ? 'text-amber-400' : ft('text-slate-900', 'text-white')}`}>
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
                  <Input placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Filter className="w-4 h-4 mr-2" />
                      {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Inactive'}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    {['all', 'active', 'inactive'].map(s => (
                      <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={ft('text-slate-600', 'text-zinc-300')}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Vendor List */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-16">
                  <Users className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                    {vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'}
                  </h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6`}>
                    {vendors.length === 0 ? 'Add your first vendor to start tracking payables.' : 'Try adjusting your search or filters.'}
                  </p>
                  {canCreate && vendors.length === 0 && (
                    <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                      onClick={() => { resetForm(); setShowCreateModal(true); }}>
                      <Plus className="w-4 h-4 mr-2" />Add Vendor
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                    <div className="col-span-1 cursor-pointer flex items-center gap-1" onClick={() => toggleSort('code')}>
                      Code {sortBy === 'code' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                    <div className="col-span-2 cursor-pointer flex items-center gap-1" onClick={() => toggleSort('name')}>
                      Name {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                    <div className="col-span-2">Contact</div>
                    <div className="col-span-2">Email</div>
                    <div className="col-span-1">Terms</div>
                    <div className="col-span-2 text-right cursor-pointer flex items-center justify-end gap-1" onClick={() => toggleSort('outstanding')}>
                      Outstanding {sortBy === 'outstanding' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                    {filteredVendors.map(vendor => {
                      const agg = vendorBillAgg[vendor.id] || { outstanding: 0, overdue: 0, totalBilled: 0, totalPaid: 0, recentBills: [] };
                      const isExpanded = expandedVendorId === vendor.id;
                      return (
                        <div key={vendor.id}>
                          <div className={`grid grid-cols-12 gap-2 items-center px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors cursor-pointer ${!vendor.is_active ? 'opacity-50' : ''}`}
                            onClick={() => setExpandedVendorId(isExpanded ? null : vendor.id)}>
                            <div className="col-span-1 flex items-center gap-1">
                              {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                              <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{vendor.vendor_code}</span>
                            </div>
                            <div className="col-span-2">
                              <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate`}>{vendor.name}</p>
                            </div>
                            <div className="col-span-2">
                              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')} truncate block`}>{vendor.contact_name || '—'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')} truncate block`}>{vendor.email || '—'}</span>
                            </div>
                            <div className="col-span-1">
                              <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{vendor.payment_terms || 30}d</span>
                            </div>
                            <div className={`col-span-2 text-right text-sm font-medium ${agg.outstanding > 0 ? (agg.overdue > 0 ? 'text-red-400' : 'text-amber-400') : ft('text-slate-400', 'text-zinc-500')}`}>
                              {agg.outstanding > 0 ? formatCurrency(agg.outstanding) : '—'}
                            </div>
                            <div className="col-span-1 text-center">
                              <Badge variant="outline" className={`text-[10px] ${vendor.is_active !== false ? 'text-green-400 border-green-500/30 bg-green-500/10' : ft('text-slate-400 border-slate-400/30', 'text-zinc-500 border-zinc-600')}`}>
                                {vendor.is_active !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="col-span-1 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                                  <DropdownMenuItem onClick={() => openEdit(vendor)} className={ft('text-slate-600', 'text-zinc-300')}>
                                    <Edit2 className="w-4 h-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setExpandedVendorId(vendor.id)} className={ft('text-slate-600', 'text-zinc-300')}>
                                    <Receipt className="w-4 h-4 mr-2" />View Bills
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                  <DropdownMenuItem onClick={() => toggleActive(vendor)} className={ft('text-slate-600', 'text-zinc-300')}>
                                    {vendor.is_active !== false ? <><ToggleLeft className="w-4 h-4 mr-2" />Deactivate</> : <><ToggleRight className="w-4 h-4 mr-2" />Reactivate</>}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className={`px-6 py-4 ${ft('bg-slate-50 border-t border-slate-100', 'bg-zinc-800/20 border-t border-zinc-800')}`}>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Vendor info */}
                                <div className="space-y-2">
                                  <h4 className={`text-xs font-semibold uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Contact Info</h4>
                                  {vendor.phone && <p className={`text-sm flex items-center gap-2 ${ft('text-slate-600', 'text-zinc-300')}`}><Phone className="w-3.5 h-3.5" />{vendor.phone}</p>}
                                  {vendor.email && <p className={`text-sm flex items-center gap-2 ${ft('text-slate-600', 'text-zinc-300')}`}><Mail className="w-3.5 h-3.5" />{vendor.email}</p>}
                                  {vendor.website && <p className={`text-sm flex items-center gap-2 ${ft('text-slate-600', 'text-zinc-300')}`}><Globe className="w-3.5 h-3.5" />{vendor.website}</p>}
                                  {vendor.tax_id && <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Tax ID: {vendor.tax_id}</p>}
                                  {(vendor.billing_address_line1 || vendor.billing_city) && (
                                    <div className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                                      {vendor.billing_address_line1 && <p>{vendor.billing_address_line1}</p>}
                                      {vendor.billing_address_line2 && <p>{vendor.billing_address_line2}</p>}
                                      <p>{[vendor.billing_city, vendor.billing_state, vendor.billing_postal_code].filter(Boolean).join(', ')}</p>
                                      {vendor.billing_country && <p>{vendor.billing_country}</p>}
                                    </div>
                                  )}
                                </div>

                                {/* Quick stats */}
                                <div className="space-y-2">
                                  <h4 className={`text-xs font-semibold uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Billing Summary</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className={`p-2 rounded-lg ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                      <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>Total Billed</p>
                                      <p className={`text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(agg.totalBilled)}</p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                      <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>Total Paid</p>
                                      <p className="text-sm font-bold text-green-400">{formatCurrency(agg.totalPaid)}</p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                      <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>Outstanding</p>
                                      <p className="text-sm font-bold text-amber-400">{formatCurrency(agg.outstanding)}</p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                      <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>Overdue</p>
                                      <p className={`text-sm font-bold ${agg.overdue > 0 ? 'text-red-400' : ft('text-slate-400', 'text-zinc-500')}`}>{formatCurrency(agg.overdue)}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Recent bills */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className={`text-xs font-semibold uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Recent Bills</h4>
                                    {canCreate && (
                                      <Button variant="outline" size="sm" className={`h-6 text-[10px] ${ft('border-slate-200 text-slate-500', 'border-zinc-700 text-zinc-400')}`}
                                        onClick={() => toast.info('Navigate to Bills page to create')}>
                                        <Plus className="w-3 h-3 mr-1" />Create Bill
                                      </Button>
                                    )}
                                  </div>
                                  {agg.recentBills.length === 0 ? (
                                    <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>No bills yet</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {agg.recentBills.map(bill => {
                                        const bs = STATUS_MAP[bill.status] || STATUS_MAP.draft;
                                        return (
                                          <div key={bill.id} className={`flex items-center justify-between p-1.5 rounded ${ft('bg-white', 'bg-zinc-800/50')}`}>
                                            <div>
                                              <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{bill.bill_number}</span>
                                              <span className={`text-[10px] ml-2 ${ft('text-slate-400', 'text-zinc-500')}`}>{formatDate(bill.bill_date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className={`${bs.cls} text-[9px]`}>{bs.label}</Badge>
                                              <span className={`text-xs font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(bill.total_amount)}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
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

        {/* ── Create / Edit Modal ──────────────────────────────────────── */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetForm(); } else setShowCreateModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editMode ? 'Update vendor details' : 'Add a new supplier or vendor'}
              </DialogDescription>
            </DialogHeader>

            {/* Tabs */}
            <div className={`flex gap-1 border-b ${ft('border-slate-200', 'border-zinc-700')}`}>
              <button type="button" className={tabCls('basic')} onClick={() => setModalTab('basic')}>Basic Info</button>
              <button type="button" className={tabCls('address')} onClick={() => setModalTab('address')}>Address</button>
              <button type="button" className={tabCls('settings')} onClick={() => setModalTab('settings')}>Settings</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              {/* Basic Info */}
              {modalTab === 'basic' && (
                <div className="space-y-3">
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Name *</Label>
                    <Input placeholder="Vendor name" value={formData.name} onChange={(e) => set('name', e.target.value)}
                      className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>Contact Name</Label>
                      <Input placeholder="Primary contact" value={formData.contact_name} onChange={(e) => set('contact_name', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>Email</Label>
                      <Input type="email" placeholder="vendor@example.com" value={formData.email} onChange={(e) => set('email', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>Phone</Label>
                      <Input placeholder="+31 6 1234 5678" value={formData.phone} onChange={(e) => set('phone', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>Website</Label>
                      <Input placeholder="https://vendor.com" value={formData.website} onChange={(e) => set('website', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                  </div>
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Tax ID / VAT Number</Label>
                    <Input placeholder="NL123456789B01" value={formData.tax_id} onChange={(e) => set('tax_id', e.target.value)}
                      className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                  </div>
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Notes</Label>
                    <Textarea placeholder="Additional notes..." value={formData.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
                      className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                  </div>
                </div>
              )}

              {/* Address */}
              {modalTab === 'address' && (
                <div className="space-y-3">
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Address Line 1</Label>
                    <Input placeholder="Street address" value={formData.billing_address_line1} onChange={(e) => set('billing_address_line1', e.target.value)}
                      className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                  </div>
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Address Line 2</Label>
                    <Input placeholder="Apt, suite, etc." value={formData.billing_address_line2} onChange={(e) => set('billing_address_line2', e.target.value)}
                      className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>City</Label>
                      <Input placeholder="Amsterdam" value={formData.billing_city} onChange={(e) => set('billing_city', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>State / Region</Label>
                      <Input placeholder="Noord-Holland" value={formData.billing_state} onChange={(e) => set('billing_state', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>Postal Code</Label>
                      <Input placeholder="1012 AB" value={formData.billing_postal_code} onChange={(e) => set('billing_postal_code', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                    <div>
                      <Label className={ft('text-slate-700', 'text-zinc-300')}>Country</Label>
                      <Input placeholder="Netherlands" value={formData.billing_country} onChange={(e) => set('billing_country', e.target.value)}
                        className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Settings */}
              {modalTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Payment Terms (days)</Label>
                    <Input type="number" min="0" max="365" value={formData.payment_terms} onChange={(e) => set('payment_terms', e.target.value)}
                      className={`mt-1 w-32 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                    <p className={`text-[10px] mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>Number of days until bills from this vendor are due</p>
                  </div>
                  <div>
                    <Label className={ft('text-slate-700', 'text-zinc-300')}>Default Expense Account</Label>
                    <div className="mt-1">
                      <ExpenseAccountSelector accounts={accounts} accountTypes={accountTypes}
                        value={formData.default_expense_account_id} onChange={(v) => set('default_expense_account_id', v)} ft={ft} />
                    </div>
                    <p className={`text-[10px] mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>Auto-assigned when creating bills for this vendor</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="vendor_active" checked={formData.is_active}
                      onChange={(e) => set('is_active', e.target.checked)} className="rounded border-zinc-600" />
                    <Label htmlFor="vendor_active" className={ft('text-slate-700', 'text-zinc-300')}>Active</Label>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}
                  className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}>
                  {saving ? 'Saving...' : (editMode ? 'Update Vendor' : 'Create Vendor')}
                </Button>
              </DialogFooter>
            </form>
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
