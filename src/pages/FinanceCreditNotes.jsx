import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { FileText, Plus, Search, Edit2, Trash2, Check, X, Sun, Moon, MoreVertical, AlertCircle, Receipt, ArrowDownLeft, Filter, Download, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

export default function FinanceCreditNotes({ embedded = false }) {
  const { user } = useUser();
  const { theme } = useTheme();
  const { hasPermission } = usePermissions();

  const ft = (light, dark) => (theme === 'dark' ? dark : light);

  const companyId = user?.company_id || user?.organization_id;

  const [creditNotes, setCreditNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [form, setForm] = useState({
    credit_note_number: '',
    invoice_id: '',
    client_name: '',
    amount: '',
    tax_rate: 21,
    reason: '',
    notes: '',
  });

  // Generate credit note number
  const generateCreditNoteNumber = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `CN-${y}${m}${d}-${rand}`;
  };

  // Fetch data
  const fetchCreditNotes = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreditNotes(data || []);
    } catch (err) {
      console.error('Error fetching credit notes:', err);
      toast.error('Failed to load credit notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total, status')
        .eq('company_id', companyId)
        .eq('invoice_type', 'customer')
        .in('status', ['sent', 'overdue', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchCreditNotes();
      fetchInvoices();
    }
  }, [companyId]);

  // Stats
  const stats = useMemo(() => {
    const totalCount = creditNotes.length;
    const totalAmount = creditNotes.reduce((sum, cn) => sum + (parseFloat(cn.total) || 0), 0);
    const pendingCount = creditNotes.filter(cn => cn.status === 'draft' || cn.status === 'issued').length;
    return { totalCount, totalAmount, pendingCount };
  }, [creditNotes]);

  // Filtered data
  const filteredNotes = useMemo(() => {
    return creditNotes.filter(cn => {
      const matchesSearch =
        !searchQuery ||
        (cn.credit_note_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cn.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cn.reason || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || cn.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [creditNotes, searchQuery, statusFilter]);

  // Format helpers
  const formatCurrency = (num) => {
    const val = parseFloat(num) || 0;
    return `\u20AC${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Status badge
  const statusBadge = (status) => {
    const styles = {
      draft: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
      issued: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      applied: 'text-green-400 border-green-500/30 bg-green-500/10',
      void: 'text-red-400 border-red-500/30 bg-red-500/10',
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.draft}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft'}
      </Badge>
    );
  };

  // Linked invoice lookup
  const getLinkedInvoiceNumber = (invoiceId) => {
    if (!invoiceId) return '\u2014';
    const inv = invoices.find(i => i.id === invoiceId);
    return inv ? inv.invoice_number : '\u2014';
  };

  // Calculated fields
  const calcTaxAmount = parseFloat(form.amount || 0) * (parseFloat(form.tax_rate) / 100);
  const calcTotal = parseFloat(form.amount || 0) + calcTaxAmount;

  // Open create modal
  const openCreate = () => {
    setEditMode(false);
    setForm({
      credit_note_number: generateCreditNoteNumber(),
      invoice_id: '',
      client_name: '',
      amount: '',
      tax_rate: 21,
      reason: '',
      notes: '',
    });
    setModalOpen(true);
  };

  // Open edit modal
  const openEdit = (cn) => {
    setEditMode(true);
    setForm({
      credit_note_number: cn.credit_note_number || '',
      invoice_id: cn.invoice_id || '',
      client_name: cn.client_name || '',
      amount: cn.amount || '',
      tax_rate: cn.tax_rate != null ? cn.tax_rate : 21,
      reason: cn.reason || '',
      notes: cn.notes || '',
    });
    setSelectedNote(cn);
    setModalOpen(true);
  };

  // Handle invoice selection in form
  const handleInvoiceSelect = (invoiceId) => {
    setForm(prev => {
      if (!invoiceId) {
        return { ...prev, invoice_id: '', client_name: '', amount: '' };
      }
      const inv = invoices.find(i => i.id === invoiceId);
      if (inv) {
        return {
          ...prev,
          invoice_id: invoiceId,
          client_name: inv.client_name || '',
          amount: inv.total || '',
        };
      }
      return { ...prev, invoice_id: invoiceId };
    });
  };

  // Save (create or edit)
  const handleSave = async () => {
    if (!form.reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    const payload = {
      company_id: companyId,
      credit_note_number: form.credit_note_number,
      invoice_id: form.invoice_id || null,
      client_name: form.client_name,
      amount: parseFloat(form.amount),
      tax_rate: parseFloat(form.tax_rate),
      tax_amount: calcTaxAmount,
      total: calcTotal,
      reason: form.reason,
      notes: form.notes,
    };

    try {
      if (editMode && selectedNote) {
        const { error } = await supabase
          .from('credit_notes')
          .update(payload)
          .eq('id', selectedNote.id);

        if (error) throw error;
        toast.success('Credit note updated');
      } else {
        payload.status = 'draft';
        payload.created_by = user?.id;
        const { error } = await supabase
          .from('credit_notes')
          .insert(payload);

        if (error) throw error;
        toast.success('Credit note created');
      }

      setModalOpen(false);
      fetchCreditNotes();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save credit note');
    }
  };

  // Issue
  const handleIssue = async (cn) => {
    try {
      const { error } = await supabase
        .from('credit_notes')
        .update({ status: 'issued', issued_at: new Date().toISOString() })
        .eq('id', cn.id);

      if (error) throw error;
      toast.success('Credit note issued');
      fetchCreditNotes();
    } catch (err) {
      console.error('Issue error:', err);
      toast.error('Failed to issue credit note');
    }
  };

  // Apply to GL
  const handleApply = async (cn) => {
    try {
      const { error } = await supabase.rpc('post_credit_note', { p_credit_note_id: cn.id });

      if (error) throw error;
      toast.success('Credit note applied to General Ledger');
      fetchCreditNotes();
    } catch (err) {
      console.error('Apply error:', err);
      toast.error('Failed to apply credit note to GL');
    }
  };

  // Void
  const handleVoid = async (cn) => {
    if (cn.status === 'applied') {
      toast.error('Cannot void an applied credit note');
      return;
    }
    try {
      const { error } = await supabase
        .from('credit_notes')
        .update({ status: 'void' })
        .eq('id', cn.id);

      if (error) throw error;
      toast.success('Credit note voided');
      fetchCreditNotes();
    } catch (err) {
      console.error('Void error:', err);
      toast.error('Failed to void credit note');
    }
  };

  // Delete
  const handleDelete = async (cn) => {
    if (cn.status !== 'draft') {
      toast.error('Only draft credit notes can be deleted');
      return;
    }
    try {
      const { error } = await supabase
        .from('credit_notes')
        .delete()
        .eq('id', cn.id);

      if (error) throw error;
      toast.success('Credit note deleted');
      if (detailOpen && selectedNote?.id === cn.id) {
        setDetailOpen(false);
        setSelectedNote(null);
      }
      fetchCreditNotes();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete credit note');
    }
  };

  // Open detail
  const openDetail = (cn) => {
    setSelectedNote(cn);
    setDetailOpen(true);
  };

  return (
    <FinancePageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        {!embedded && (
          <PageHeader
            title="Credit Notes"
            subtitle="Manage credit notes and refunds"
            icon={<ArrowDownLeft className="h-6 w-6 text-blue-500" />}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Credit Notes */}
          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Total Credit Notes</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{stats.totalCount}</p>
                </div>
                <div className={`p-3 rounded-xl ${ft('bg-blue-50', 'bg-blue-500/10')}`}>
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Amount */}
          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Total Amount</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className={`p-3 rounded-xl ${ft('bg-green-50', 'bg-green-500/10')}`}>
                  <Receipt className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Pending</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{stats.pendingCount}</p>
                </div>
                <div className={`p-3 rounded-xl ${ft('bg-amber-50', 'bg-amber-500/10')}`}>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search, Filter, and Create */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
            <Input
              placeholder="Search credit notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
            />
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={`${ft('bg-white border-slate-200 text-slate-700', 'bg-zinc-800 border-zinc-700 text-zinc-300')} min-w-[130px]`}>
                <Filter className="h-4 w-4 mr-2" />
                {statusFilter === 'all' ? 'All Statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
              <DropdownMenuItem onClick={() => setStatusFilter('all')} className={ft('text-slate-700', 'text-zinc-300')}>All Statuses</DropdownMenuItem>
              <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-800')} />
              <DropdownMenuItem onClick={() => setStatusFilter('draft')} className={ft('text-slate-700', 'text-zinc-300')}>Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('issued')} className={ft('text-slate-700', 'text-zinc-300')}>Issued</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('applied')} className={ft('text-slate-700', 'text-zinc-300')}>Applied</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('void')} className={ft('text-slate-700', 'text-zinc-300')}>Void</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Button */}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Credit Note
          </Button>
        </div>

        {/* Table */}
        <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={ft('bg-slate-50 border-b border-slate-200', 'bg-white/[0.03] border-b border-white/[0.06]')}>
                  <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Credit Note #</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Client Name</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Linked Invoice</th>
                  <th className={`text-right px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Amount</th>
                  <th className={`text-right px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Tax Amount</th>
                  <th className={`text-right px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Total</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Reason</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Status</th>
                  <th className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Date</th>
                  <th className={`text-right px-4 py-3 text-xs font-medium uppercase tracking-wider ${ft('text-slate-500', 'text-zinc-400')}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${ft('divide-slate-100', 'divide-white/[0.04]')}`}>
                {loading ? (
                  <tr>
                    <td colSpan={10} className={`px-4 py-12 text-center ${ft('text-slate-500', 'text-zinc-400')}`}>
                      Loading credit notes...
                    </td>
                  </tr>
                ) : filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={`px-4 py-12 text-center ${ft('text-slate-500', 'text-zinc-400')}`}>
                      <div className="flex flex-col items-center gap-2">
                        <ArrowDownLeft className="h-8 w-8 opacity-40" />
                        <p className="font-medium">No credit notes found</p>
                        <p className="text-sm opacity-60">Create your first credit note to get started.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((cn) => (
                    <tr
                      key={cn.id}
                      className={`${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} cursor-pointer transition-colors`}
                      onClick={() => openDetail(cn)}
                    >
                      <td className={`px-4 py-3 text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>
                        {cn.credit_note_number || '\u2014'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>
                        {cn.client_name || '\u2014'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                        {getLinkedInvoiceNumber(cn.invoice_id)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-mono ${ft('text-slate-700', 'text-zinc-300')}`}>
                        {formatCurrency(cn.amount)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-mono ${ft('text-slate-500', 'text-zinc-400')}`}>
                        {formatCurrency(cn.tax_amount)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-medium ${ft('text-slate-900', 'text-white')}`}>
                        {formatCurrency(cn.total)}
                      </td>
                      <td className={`px-4 py-3 text-sm max-w-[180px] truncate ${ft('text-slate-500', 'text-zinc-400')}`}>
                        {cn.reason || '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {statusBadge(cn.status)}
                      </td>
                      <td className={`px-4 py-3 text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>
                        {formatDate(cn.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={ft('text-slate-500 hover:bg-slate-100', 'text-zinc-400 hover:bg-white/[0.06]')}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                            {cn.status === 'draft' && (
                              <DropdownMenuItem onClick={() => openEdit(cn)} className={ft('text-slate-700', 'text-zinc-300')}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {cn.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleIssue(cn)} className={ft('text-slate-700', 'text-zinc-300')}>
                                <Check className="h-4 w-4 mr-2" />
                                Issue
                              </DropdownMenuItem>
                            )}
                            {(cn.status === 'issued') && (
                              <DropdownMenuItem onClick={() => handleApply(cn)} className={ft('text-slate-700', 'text-zinc-300')}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Apply to GL
                              </DropdownMenuItem>
                            )}
                            {cn.status !== 'applied' && cn.status !== 'void' && (
                              <>
                                <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-800')} />
                                <DropdownMenuItem onClick={() => handleVoid(cn)} className="text-red-400">
                                  <X className="h-4 w-4 mr-2" />
                                  Void
                                </DropdownMenuItem>
                              </>
                            )}
                            {cn.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-800')} />
                                <DropdownMenuItem onClick={() => handleDelete(cn)} className="text-red-400">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create / Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className={`max-w-lg ${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                {editMode ? 'Edit Credit Note' : 'New Credit Note'}
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editMode ? 'Update the credit note details below.' : 'Fill in the details to create a new credit note.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Credit Note Number */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Credit Note #</Label>
                <Input
                  value={form.credit_note_number}
                  onChange={(e) => setForm(prev => ({ ...prev, credit_note_number: e.target.value }))}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  placeholder="CN-YYYYMMDD-XXXX"
                />
              </div>

              {/* Link to Invoice */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Link to Invoice (optional)</Label>
                <select
                  value={form.invoice_id}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className={`w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}
                >
                  <option value="">No linked invoice</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} &mdash; {inv.client_name} &mdash; {formatCurrency(inv.total)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Name */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Client Name</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  placeholder="Client name"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Amount (pre-tax)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  placeholder="0.00"
                />
              </div>

              {/* Tax Rate */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Tax Rate</Label>
                <select
                  value={form.tax_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) }))}
                  className={`w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}
                >
                  <option value={0}>0%</option>
                  <option value={9}>9%</option>
                  <option value={21}>21%</option>
                </select>
              </div>

              {/* Calculated Tax & Total */}
              <div className={`rounded-lg p-3 space-y-1 ${ft('bg-slate-50 border border-slate-200', 'bg-zinc-800/50 border border-zinc-700')}`}>
                <div className="flex justify-between text-sm">
                  <span className={ft('text-slate-500', 'text-zinc-400')}>Tax Amount</span>
                  <span className={`font-mono ${ft('text-slate-700', 'text-zinc-300')}`}>{formatCurrency(calcTaxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className={ft('text-slate-700', 'text-zinc-200')}>Total</span>
                  <span className={`font-mono ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(calcTotal)}</span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Reason <span className="text-red-400">*</span></Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  placeholder="Reason for the credit note..."
                  rows={2}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Notes (optional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
                {editMode ? 'Update' : 'Create'} Credit Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className={`max-w-lg ${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                Credit Note Details
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {selectedNote?.credit_note_number}
              </DialogDescription>
            </DialogHeader>

            {selectedNote && (
              <div className="space-y-4 py-2">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Status</span>
                  {statusBadge(selectedNote.status)}
                </div>

                {/* Detail rows */}
                <div className={`rounded-lg divide-y ${ft('bg-slate-50 border border-slate-200 divide-slate-200', 'bg-zinc-800/50 border border-zinc-700 divide-zinc-700')}`}>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Client Name</span>
                    <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{selectedNote.client_name || '\u2014'}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Linked Invoice</span>
                    <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{getLinkedInvoiceNumber(selectedNote.invoice_id)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Amount (pre-tax)</span>
                    <span className={`text-sm font-mono font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(selectedNote.amount)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Tax Rate</span>
                    <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{selectedNote.tax_rate != null ? `${selectedNote.tax_rate}%` : '\u2014'}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Tax Amount</span>
                    <span className={`text-sm font-mono font-medium ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(selectedNote.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Total</span>
                    <span className={`text-sm font-mono font-bold ${ft('text-slate-900', 'text-white')}`}>{formatCurrency(selectedNote.total)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Created</span>
                    <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatDate(selectedNote.created_at)}</span>
                  </div>
                  {selectedNote.issued_at && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Issued</span>
                      <span className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>{formatDate(selectedNote.issued_at)}</span>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Reason</p>
                  <p className={`text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>{selectedNote.reason || '\u2014'}</p>
                </div>

                {/* Notes */}
                {selectedNote.notes && (
                  <div className="space-y-1">
                    <p className={`text-sm font-medium ${ft('text-slate-500', 'text-zinc-400')}`}>Notes</p>
                    <p className={`text-sm ${ft('text-slate-700', 'text-zinc-300')}`}>{selectedNote.notes}</p>
                  </div>
                )}

                {/* GL Posting Status */}
                <div className={`rounded-lg p-3 ${ft('bg-slate-50 border border-slate-200', 'bg-zinc-800/50 border border-zinc-700')}`}>
                  <div className="flex items-center gap-2">
                    <Receipt className={`h-4 w-4 ${selectedNote.status === 'applied' ? 'text-green-500' : ft('text-slate-400', 'text-zinc-500')}`} />
                    <span className={`text-sm font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>
                      GL Posting: {selectedNote.status === 'applied' ? 'Posted' : 'Not posted'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {selectedNote?.status === 'draft' && (
                <>
                  <Button variant="outline" onClick={() => { setDetailOpen(false); openEdit(selectedNote); }} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { handleIssue(selectedNote); setDetailOpen(false); }}>
                    <Check className="h-4 w-4 mr-2" />
                    Issue
                  </Button>
                </>
              )}
              {selectedNote?.status === 'issued' && (
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { handleApply(selectedNote); setDetailOpen(false); }}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Apply to GL
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailOpen(false)} className={ft('border-slate-200 text-slate-700', 'border-zinc-700 text-zinc-300')}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FinancePageTransition>
  );
}
