import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { JournalEntry, JournalEntryLine, Account, AccountType, FiscalPeriod } from '@/api/entities';
import {
  FileText, Plus, Search, Filter, Download, ChevronDown, ChevronUp,
  MoreVertical, Edit2, Trash2, Sun, Moon, AlertCircle, Check, X,
  Clock, Pencil, CheckCircle, XCircle, Calculator, Eye, Ban,
  ArrowUpDown, Calendar
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

const TYPE_BADGE_CLASSES = {
  Asset:     'text-blue-400 border-blue-500/30 bg-blue-500/10',
  Liability: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  Equity:    'text-purple-400 border-purple-500/30 bg-purple-500/10',
  Revenue:   'text-green-400 border-green-500/30 bg-green-500/10',
  Expense:   'text-red-400 border-red-500/30 bg-red-500/10',
};

const SOURCE_LABELS = {
  manual: 'Manual',
  invoice: 'Invoice',
  expense: 'Expense',
  bill: 'Bill',
  payment: 'Payment',
};

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `€${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_LINE = { account_id: '', description: '', debit: '', credit: '' };

// ── Account Selector ────────────────────────────────────────────────────────
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
        className={`w-full text-left rounded-md px-2 py-1.5 text-sm border truncate ${
          ft(
            'bg-slate-100 border-slate-200 text-slate-900',
            'bg-zinc-800 border-zinc-700 text-white'
          )
        } ${!value ? (ft('text-slate-400', 'text-zinc-500')) : ''}`}
      >
        {selected ? `${selected.code} — ${selected.name}` : 'Select account...'}
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-lg border shadow-xl ${
          ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')
        }`}>
          <div className="p-2 sticky top-0 bg-inherit">
            <Input
              placeholder="Search accounts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`text-xs h-7 ${ft('bg-slate-50 border-slate-200', 'bg-zinc-800 border-zinc-700')}`}
              autoFocus
            />
          </div>
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
                  className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 ${
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
export default function FinanceJournalEntries() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [detailLines, setDetailLines] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);
  const canCreate = useMemo(() => !permLoading && hasPermission('finance.create'), [hasPermission, permLoading]);

  const defaultForm = {
    entry_date: new Date().toISOString().slice(0, 10),
    reference: '',
    description: '',
    source_type: 'manual',
    lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
  };
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entryData, acctData, typeData] = await Promise.all([
        db.entities.JournalEntry?.list?.({ limit: 500 }).catch(() => []),
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
      ]);
      setEntries(entryData || []);
      setAccounts((acctData || []).filter(a => a.is_active !== false).sort((a, b) => (a.code || '').localeCompare(b.code || '')));
      setAccountTypes((typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const typeMap = useMemo(() => {
    const m = {};
    accountTypes.forEach(t => { m[t.id] = t.name; });
    return m;
  }, [accountTypes]);

  const accountMap = useMemo(() => {
    const m = {};
    accounts.forEach(a => { m[a.id] = a; });
    return m;
  }, [accounts]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const drafts = entries.filter(e => !e.is_posted && !e.voided_at);
    const postedThisMonth = entries.filter(e => e.is_posted && e.posted_at && new Date(e.posted_at) >= monthStart);
    const debitsThisMonth = entries
      .filter(e => e.is_posted && new Date(e.entry_date) >= monthStart)
      .reduce((s, e) => s + (parseFloat(e.total_debit) || 0), 0);
    return {
      total: entries.length,
      drafts: drafts.length,
      postedThisMonth: postedThisMonth.length,
      debitsThisMonth,
    };
  }, [entries]);

  // Filter & sort
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.entry_number || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.reference || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'draft') result = result.filter(e => !e.is_posted && !e.voided_at);
      else if (statusFilter === 'posted') result = result.filter(e => e.is_posted && !e.voided_at);
      else if (statusFilter === 'voided') result = result.filter(e => !!e.voided_at);
    }
    if (sourceFilter !== 'all') {
      result = result.filter(e => e.source_type === sourceFilter);
    }
    result.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.entry_date) - new Date(a.entry_date);
      if (sortBy === 'number') return (b.entry_number || '').localeCompare(a.entry_number || '');
      if (sortBy === 'amount') return (parseFloat(b.total_debit) || 0) - (parseFloat(a.total_debit) || 0);
      return 0;
    });
    return result;
  }, [entries, searchQuery, statusFilter, sourceFilter, sortBy]);

  // Form helpers
  const resetForm = () => {
    setFormData({ ...defaultForm, lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }] });
    setEditMode(false);
    setSelectedEntry(null);
  };

  const setLine = (idx, field, value) => {
    setFormData(prev => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      // Clear opposing field
      if (field === 'debit' && parseFloat(value) > 0) lines[idx].credit = '';
      if (field === 'credit' && parseFloat(value) > 0) lines[idx].debit = '';
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setFormData(prev => ({ ...prev, lines: [...prev.lines, { ...EMPTY_LINE }] }));
  };

  const removeLine = (idx) => {
    if (formData.lines.length <= 2) { toast.error('Minimum 2 lines required'); return; }
    setFormData(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  };

  const formTotals = useMemo(() => {
    const totalDebit = formData.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = formData.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { totalDebit, totalCredit, diff: Math.abs(totalDebit - totalCredit), balanced: Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0 };
  }, [formData.lines]);

  const handleSave = async (andPost = false) => {
    if (!formData.entry_date || !formData.description.trim()) {
      toast.error('Date and description are required');
      return;
    }
    const validLines = formData.lines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error('At least 2 line items with accounts and amounts required');
      return;
    }
    if (andPost && !formTotals.balanced) {
      toast.error('Total debits must equal total credits to post');
      return;
    }

    setSaving(true);
    try {
      const companyId = user.company_id || user.organization_id;
      const entryPayload = {
        company_id: companyId,
        entry_date: formData.entry_date,
        reference: formData.reference.trim() || null,
        description: formData.description.trim(),
        source_type: formData.source_type,
        created_by: user.id,
      };

      let entryId;
      if (editMode && selectedEntry) {
        await db.entities.JournalEntry.update(selectedEntry.id, entryPayload);
        entryId = selectedEntry.id;
        // Delete existing lines and recreate
        const existingLines = await db.entities.JournalEntryLine?.list?.({ limit: 100 }).catch(() => []) || [];
        const entryLines = existingLines.filter(l => l.journal_entry_id === entryId);
        for (const l of entryLines) {
          await db.entities.JournalEntryLine.delete(l.id);
        }
      } else {
        const created = await db.entities.JournalEntry.create(entryPayload);
        entryId = created.id;
      }

      // Create lines
      for (let i = 0; i < validLines.length; i++) {
        const l = validLines[i];
        await db.entities.JournalEntryLine.create({
          journal_entry_id: entryId,
          account_id: l.account_id,
          description: l.description || null,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          line_order: i + 1,
        });
      }

      if (andPost) {
        const { data } = await supabase.rpc('post_journal_entry', { p_entry_id: entryId });
        if (data?.success) {
          toast.success(`Entry ${data.entry_number} posted`);
        } else {
          toast.error(data?.error || 'Saved but failed to post');
        }
      } else {
        toast.success(editMode ? 'Entry updated' : 'Entry saved as draft');
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const postEntry = async (entry) => {
    try {
      const { data } = await supabase.rpc('post_journal_entry', { p_entry_id: entry.id });
      if (data?.success) {
        toast.success(`Entry ${data.entry_number} posted`);
        loadData();
        if (showDetailModal) {
          setSelectedEntry(prev => prev ? { ...prev, is_posted: true, posted_at: new Date().toISOString() } : prev);
        }
      } else {
        toast.error(data?.error || 'Failed to post entry');
      }
    } catch (error) {
      console.error('Post error:', error);
      toast.error('Failed to post entry');
    }
  };

  const voidEntry = async () => {
    if (!voidReason.trim()) { toast.error('Void reason is required'); return; }
    try {
      await db.entities.JournalEntry.update(selectedEntry.id, {
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: voidReason.trim(),
      });
      toast.success('Entry voided');
      setShowVoidModal(false);
      setShowDetailModal(false);
      setVoidReason('');
      loadData();
    } catch (error) {
      console.error('Void error:', error);
      toast.error('Failed to void entry');
    }
  };

  const openDetail = async (entry) => {
    setSelectedEntry(entry);
    try {
      const allLines = await db.entities.JournalEntryLine?.list?.({ limit: 500 }).catch(() => []) || [];
      setDetailLines(allLines.filter(l => l.journal_entry_id === entry.id).sort((a, b) => (a.line_order || 0) - (b.line_order || 0)));
    } catch { setDetailLines([]); }
    setShowDetailModal(true);
  };

  const openEdit = async (entry) => {
    if (entry.is_posted || entry.voided_at) { toast.error('Cannot edit posted or voided entries'); return; }
    try {
      const allLines = await db.entities.JournalEntryLine?.list?.({ limit: 500 }).catch(() => []) || [];
      const lines = allLines.filter(l => l.journal_entry_id === entry.id).sort((a, b) => (a.line_order || 0) - (b.line_order || 0));
      setFormData({
        entry_date: entry.entry_date || new Date().toISOString().slice(0, 10),
        reference: entry.reference || '',
        description: entry.description || '',
        source_type: entry.source_type || 'manual',
        lines: lines.length >= 2 ? lines.map(l => ({
          account_id: l.account_id || '',
          description: l.description || '',
          debit: (parseFloat(l.debit) || 0) > 0 ? l.debit.toString() : '',
          credit: (parseFloat(l.credit) || 0) > 0 ? l.credit.toString() : '',
        })) : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
      });
      setSelectedEntry(entry);
      setEditMode(true);
      setShowCreateModal(true);
    } catch {
      toast.error('Failed to load entry for editing');
    }
  };

  const getStatusInfo = (entry) => {
    if (entry.voided_at) return { label: 'Voided', cls: 'text-red-400 border-red-500/30 bg-red-500/10', icon: XCircle };
    if (entry.is_posted) return { label: 'Posted', cls: 'text-green-400 border-green-500/30 bg-green-500/10', icon: CheckCircle };
    return { label: 'Draft', cls: ft('text-slate-500 border-slate-400/30 bg-slate-400/10', 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'), icon: Pencil };
  };

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
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view journal entries.</p>
      </div>
    );
  }

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">

          {/* Header */}
          <PageHeader
            icon={FileText}
            title="Journal Entries"
            subtitle="Record and manage double-entry accounting transactions"
            color="blue"
            actions={
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                  onClick={() => toast.info('Export coming soon')}>
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
                {canCreate && (
                  <Button
                    className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />New Entry
                  </Button>
                )}
              </div>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Entries', value: stats.total, sub: `${stats.drafts} drafts`, icon: FileText, color: 'blue' },
              { label: 'Draft Entries', value: stats.drafts, sub: 'Awaiting posting', icon: Pencil, color: 'zinc' },
              { label: 'Posted This Month', value: stats.postedThisMonth, sub: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), icon: CheckCircle, color: 'green' },
              { label: 'Debits This Month', value: formatCurrency(stats.debitsThisMonth), sub: 'Total posted debits', icon: Calculator, color: 'blue' },
            ].map((s, i) => (
              <Card key={i} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{s.label}</span>
                    <s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} />
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
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                  <Input placeholder="Search entries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                {/* Status */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Filter className="w-4 h-4 mr-2" />
                      {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    {['all', 'draft', 'posted', 'voided'].map(s => (
                      <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={ft('text-slate-600', 'text-zinc-300')}>
                        {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Source */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      {sourceFilter === 'all' ? 'All Sources' : SOURCE_LABELS[sourceFilter]}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => setSourceFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>All Sources</DropdownMenuItem>
                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <DropdownMenuItem key={k} onClick={() => setSourceFilter(k)} className={ft('text-slate-600', 'text-zinc-300')}>{v}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      {sortBy === 'date' ? 'Date' : sortBy === 'number' ? 'Number' : 'Amount'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => setSortBy('date')} className={ft('text-slate-600', 'text-zinc-300')}>Date</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('number')} className={ft('text-slate-600', 'text-zinc-300')}>Number</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('amount')} className={ft('text-slate-600', 'text-zinc-300')}>Amount</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Entry List */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>No journal entries found</h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6`}>
                    {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Record your first accounting transaction'}
                  </p>
                  {canCreate && !searchQuery && statusFilter === 'all' && (
                    <Button className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                      onClick={() => { resetForm(); setShowCreateModal(true); }}>
                      <Plus className="w-4 h-4 mr-2" />New Entry
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Column header */}
                  <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                    <div className="col-span-1">Number</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-1">Reference</div>
                    <div className="col-span-1 text-right">Debit</div>
                    <div className="col-span-1 text-right">Credit</div>
                    <div className="col-span-1 text-center">Status</div>
                    <div className="col-span-1 text-center">Source</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                    {filteredEntries.map(entry => {
                      const status = getStatusInfo(entry);
                      const StatusIcon = status.icon;
                      const isVoided = !!entry.voided_at;
                      return (
                        <div key={entry.id}
                          className={`grid grid-cols-12 gap-2 items-center px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors ${isVoided ? 'opacity-50' : ''}`}>
                          <div className="col-span-1">
                            <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{entry.entry_number}</span>
                          </div>
                          <div className="col-span-1">
                            <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{formatDate(entry.entry_date)}</span>
                          </div>
                          <div className="col-span-3">
                            <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate ${isVoided ? 'line-through' : ''}`}>
                              {entry.description || '—'}
                            </p>
                          </div>
                          <div className="col-span-1">
                            <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} truncate block`}>{entry.reference || '—'}</span>
                          </div>
                          <div className={`col-span-1 text-right text-sm font-medium ${isVoided ? 'line-through' : ''} ${ft('text-slate-900', 'text-white')}`}>
                            {formatCurrency(entry.total_debit)}
                          </div>
                          <div className={`col-span-1 text-right text-sm font-medium ${isVoided ? 'line-through' : ''} ${ft('text-slate-900', 'text-white')}`}>
                            {formatCurrency(entry.total_credit)}
                          </div>
                          <div className="col-span-1 text-center">
                            <Badge variant="outline" className={`${status.cls} text-[10px]`}>
                              <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                            </Badge>
                          </div>
                          <div className="col-span-1 text-center">
                            <span className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>
                              {SOURCE_LABELS[entry.source_type] || entry.source_type}
                            </span>
                          </div>
                          <div className="col-span-2 text-right flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(entry)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                                <DropdownMenuItem onClick={() => openDetail(entry)} className={ft('text-slate-600', 'text-zinc-300')}>
                                  <Eye className="w-4 h-4 mr-2" />View Details
                                </DropdownMenuItem>
                                {!entry.is_posted && !entry.voided_at && (
                                  <>
                                    <DropdownMenuItem onClick={() => openEdit(entry)} className={ft('text-slate-600', 'text-zinc-300')}>
                                      <Edit2 className="w-4 h-4 mr-2" />Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => postEntry(entry)} className="text-green-400">
                                      <CheckCircle className="w-4 h-4 mr-2" />Post Entry
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {entry.is_posted && !entry.voided_at && (
                                  <DropdownMenuItem onClick={() => { setSelectedEntry(entry); setShowVoidModal(true); }} className="text-red-400">
                                    <Ban className="w-4 h-4 mr-2" />Void Entry
                                  </DropdownMenuItem>
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

        {/* ── Create / Edit Modal ──────────────────────────────────────── */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetForm(); } else setShowCreateModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-4xl max-h-[92vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editMode ? 'Update this draft entry' : 'Record a double-entry accounting transaction'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Date *</Label>
                  <Input type="date" value={formData.entry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} required />
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Reference</Label>
                  <Input placeholder="INV-001, PO-123..." value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Source Type</Label>
                  <select value={formData.source_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, source_type: e.target.value }))}
                    className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Description *</Label>
                <Input placeholder="e.g., Record monthly rent payment" value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} required />
              </div>

              {/* Line items */}
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
                    <div className="col-span-4">Account</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-2 text-right">Debit</div>
                    <div className="col-span-2 text-right">Credit</div>
                    <div className="col-span-1" />
                  </div>

                  {formData.lines.map((line, idx) => (
                    <div key={idx} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${ft('border-b border-slate-100', 'border-b border-zinc-800')} last:border-b-0`}>
                      <div className="col-span-4">
                        <AccountSelector
                          accounts={accounts}
                          accountTypes={accountTypes}
                          value={line.account_id}
                          onChange={(val) => setLine(idx, 'account_id', val)}
                          ft={ft}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input placeholder="Line description" value={line.description}
                          onChange={(e) => setLine(idx, 'description', e.target.value)}
                          className={`h-8 text-sm ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" step="0.01" min="0" placeholder="0.00" value={line.debit}
                          onChange={(e) => setLine(idx, 'debit', e.target.value)}
                          className={`h-8 text-sm text-right ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" step="0.01" min="0" placeholder="0.00" value={line.credit}
                          onChange={(e) => setLine(idx, 'credit', e.target.value)}
                          className={`h-8 text-sm text-right ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
                      </div>
                      <div className="col-span-1 text-center">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => removeLine(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Totals row */}
                  <div className={`grid grid-cols-12 gap-2 px-3 py-2 items-center rounded-b-lg ${
                    formTotals.balanced
                      ? ft('bg-green-50 border-t border-green-200', 'bg-green-500/5 border-t border-green-500/20')
                      : formTotals.totalDebit > 0 || formTotals.totalCredit > 0
                        ? ft('bg-red-50 border-t border-red-200', 'bg-red-500/5 border-t border-red-500/20')
                        : ft('bg-slate-50 border-t border-slate-200', 'bg-zinc-800/30 border-t border-zinc-700')
                  }`}>
                    <div className="col-span-4" />
                    <div className={`col-span-3 text-right text-xs font-medium ${ft('text-slate-600', 'text-zinc-300')}`}>
                      <div className="flex items-center justify-end gap-1">
                        <Calculator className="w-3 h-3" /> Totals
                      </div>
                    </div>
                    <div className={`col-span-2 text-right text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>
                      {formatCurrency(formTotals.totalDebit)}
                    </div>
                    <div className={`col-span-2 text-right text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>
                      {formatCurrency(formTotals.totalCredit)}
                    </div>
                    <div className="col-span-1 text-center">
                      {formTotals.balanced ? (
                        <Check className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (formTotals.totalDebit > 0 || formTotals.totalCredit > 0) ? (
                        <span className="text-[10px] text-red-400 font-medium">
                          {formatCurrency(formTotals.diff)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <DialogFooter className="gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={() => handleSave(false)}
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')} variant="outline">
                  {saving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button type="button" disabled={saving || !formTotals.balanced} onClick={() => handleSave(true)}
                  className={formTotals.balanced
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

        {/* ── Detail Modal ─────────────────────────────────────────────── */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-3xl max-h-[90vh] overflow-y-auto`}>
            {selectedEntry && (() => {
              const status = getStatusInfo(selectedEntry);
              const StatusIcon = status.icon;
              const isVoided = !!selectedEntry.voided_at;
              const isDraft = !selectedEntry.is_posted && !isVoided;
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="flex items-center gap-3">
                        <span className="font-mono">{selectedEntry.entry_number}</span>
                        <Badge variant="outline" className={status.cls}>
                          <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                        </Badge>
                      </DialogTitle>
                    </div>
                    <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                      {selectedEntry.description}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Entry info */}
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                    <div>
                      <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Date</p>
                      <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatDate(selectedEntry.entry_date)}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Reference</p>
                      <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{selectedEntry.reference || '—'}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Source</p>
                      <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{SOURCE_LABELS[selectedEntry.source_type] || selectedEntry.source_type}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase ${ft('text-slate-400', 'text-zinc-500')}`}>Total</p>
                      <p className={`text-sm font-bold ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(selectedEntry.total_debit)}</p>
                    </div>
                  </div>

                  {selectedEntry.is_posted && selectedEntry.posted_at && (
                    <div className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} flex items-center gap-1`}>
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      Posted on {formatDate(selectedEntry.posted_at)}
                    </div>
                  )}

                  {isVoided && (
                    <div className={`p-3 rounded-lg ${ft('bg-red-50 border border-red-200', 'bg-red-500/5 border border-red-500/20')}`}>
                      <p className="text-sm text-red-400 font-medium flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Voided {selectedEntry.voided_at ? `on ${formatDate(selectedEntry.voided_at)}` : ''}
                      </p>
                      {selectedEntry.void_reason && (
                        <p className={`text-xs mt-1 ${ft('text-red-400/70', 'text-red-400/70')}`}>Reason: {selectedEntry.void_reason}</p>
                      )}
                    </div>
                  )}

                  {/* Line items table */}
                  <div className={`rounded-lg border ${ft('border-slate-200', 'border-zinc-700')}`}>
                    <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')} rounded-t-lg`}>
                      <div className="col-span-2">Code</div>
                      <div className="col-span-4">Account</div>
                      <div className="col-span-2">Description</div>
                      <div className="col-span-2 text-right">Debit</div>
                      <div className="col-span-2 text-right">Credit</div>
                    </div>
                    <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                      {detailLines.map(line => {
                        const acct = accountMap[line.account_id];
                        const tName = acct ? typeMap[acct.account_type_id] : '';
                        return (
                          <div key={line.id} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center`}>
                            <div className="col-span-2">
                              <span className={`text-xs font-mono ${ft('text-slate-500', 'text-zinc-400')}`}>{acct?.code || '—'}</span>
                            </div>
                            <div className="col-span-4 flex items-center gap-2">
                              <span className={`text-sm ${ft('text-slate-900', 'text-white')}`}>{acct?.name || 'Unknown'}</span>
                              {tName && <Badge variant="outline" className={`${TYPE_BADGE_CLASSES[tName] || ''} text-[9px]`}>{tName}</Badge>}
                            </div>
                            <div className="col-span-2">
                              <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{line.description || '—'}</span>
                            </div>
                            <div className={`col-span-2 text-right text-sm ${parseFloat(line.debit) > 0 ? ft('text-slate-900', 'text-white') + ' font-medium' : ft('text-slate-300', 'text-zinc-600')}`}>
                              {formatCurrency(line.debit)}
                            </div>
                            <div className={`col-span-2 text-right text-sm ${parseFloat(line.credit) > 0 ? ft('text-slate-900', 'text-white') + ' font-medium' : ft('text-slate-300', 'text-zinc-600')}`}>
                              {formatCurrency(line.credit)}
                            </div>
                          </div>
                        );
                      })}
                      {detailLines.length === 0 && (
                        <div className={`px-3 py-6 text-center text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No line items</div>
                      )}
                    </div>
                  </div>

                  {/* Detail actions */}
                  <DialogFooter className="gap-3 pt-2">
                    <Button variant="outline" onClick={() => setShowDetailModal(false)}
                      className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      Close
                    </Button>
                    {isDraft && canCreate && (
                      <>
                        <Button variant="outline" onClick={() => { setShowDetailModal(false); openEdit(selectedEntry); }}
                          className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                          <Edit2 className="w-4 h-4 mr-2" />Edit
                        </Button>
                        <Button onClick={() => postEntry(selectedEntry)}
                          className={ft('bg-green-600 hover:bg-green-700 text-white', 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30')}>
                          <CheckCircle className="w-4 h-4 mr-2" />Post Entry
                        </Button>
                      </>
                    )}
                    {selectedEntry.is_posted && !isVoided && (
                      <Button onClick={() => { setShowVoidModal(true); }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                        <Ban className="w-4 h-4 mr-2" />Void Entry
                      </Button>
                    )}
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ── Void Modal ───────────────────────────────────────────────── */}
        <Dialog open={showVoidModal} onOpenChange={(open) => { if (!open) { setShowVoidModal(false); setVoidReason(''); } else setShowVoidModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-md`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Ban className="w-5 h-5" /> Void Journal Entry
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                This will reverse the effect on account balances. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className={`p-3 rounded-lg ${ft('bg-slate-50', 'bg-zinc-800/30')}`}>
                <p className={`text-sm font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>{selectedEntry.entry_number}</p>
                <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>{selectedEntry.description}</p>
              </div>
            )}
            <div>
              <Label className={ft('text-slate-700', 'text-zinc-300')}>Reason for voiding *</Label>
              <Textarea placeholder="Explain why this entry is being voided..."
                value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3}
                className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`} />
            </div>
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => { setShowVoidModal(false); setVoidReason(''); }}
                className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button onClick={voidEntry} disabled={!voidReason.trim()}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                <Ban className="w-4 h-4 mr-2" />Void Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </FinancePageTransition>
  );
}
