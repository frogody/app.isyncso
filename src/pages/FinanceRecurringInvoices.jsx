import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { RefreshCw, Plus, Search, Edit2, Trash2, Play, Pause, Calendar, Clock, Send, X, Sun, Moon, MoreVertical, AlertCircle, ChevronDown, Mail } from 'lucide-react';
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

export default function FinanceRecurringInvoices({ embedded = false }) {
  const { user } = useUser();
  const { hasPermission } = usePermissions();
  const { theme } = useTheme();

  const ft = (light, dark) => (theme === 'dark' ? dark : light);

  const companyId = user?.company_id || user?.organization_id;

  const [templates, setTemplates] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(null);

  const emptyForm = {
    client_name: '',
    client_email: '',
    client_address: '',
    description: '',
    frequency: 'monthly',
    next_generate_date: '',
    tax_rate_id: '',
    auto_send: false,
    max_occurrences: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    notes: '',
  };

  const [form, setForm] = useState(emptyForm);

  // ------- Data Loading -------
  const fetchTemplates = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('next_generate_date', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      toast.error('Failed to load recurring invoices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxRates = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('rate');

      if (error) throw error;
      setTaxRates(data || []);
    } catch (err) {
      console.error('Failed to load tax rates:', err);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTemplates();
      fetchTaxRates();
    }
  }, [companyId]);

  // ------- Stats -------
  const stats = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const activeCount = templates.filter((t) => t.is_active).length;

    const dueThisWeek = templates.filter((t) => {
      if (!t.is_active || !t.next_generate_date) return false;
      const nextDate = new Date(t.next_generate_date);
      return nextDate <= weekFromNow;
    }).length;

    const totalGenerated = templates.reduce((sum, t) => sum + (t.total_generated || 0), 0);

    return { activeCount, dueThisWeek, totalGenerated };
  }, [templates]);

  // ------- Search -------
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        (t.client_name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.frequency || '').toLowerCase().includes(q)
    );
  }, [templates, searchQuery]);

  // ------- Helpers -------
  const formatCurrency = (num) =>
    `\u20AC${(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (d) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const getFrequencyBadge = (frequency) => {
    const styles = {
      weekly: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      biweekly: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
      monthly: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      quarterly: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      yearly: 'text-green-400 border-green-500/30 bg-green-500/10',
    };
    return (
      <Badge variant="outline" className={styles[frequency] || styles.monthly}>
        {frequency}
      </Badge>
    );
  };

  const getSelectedTaxRate = (taxRateId) => {
    return taxRates.find((tr) => tr.id === taxRateId);
  };

  // ------- Form Calculations -------
  const formCalculations = useMemo(() => {
    const subtotal = (form.items || []).reduce(
      (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
      0
    );
    const selectedTax = getSelectedTaxRate(form.tax_rate_id);
    const taxPercent = selectedTax ? parseFloat(selectedTax.rate) || 0 : 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, taxPercent, total };
  }, [form.items, form.tax_rate_id, taxRates]);

  // ------- Modal Handlers -------
  const openCreateModal = () => {
    setEditingTemplate(null);
    setForm({ ...emptyForm, items: [{ description: '', quantity: 1, unit_price: 0 }] });
    setModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setForm({
      client_name: template.client_name || '',
      client_email: template.client_email || '',
      client_address: template.client_address || '',
      description: template.description || '',
      frequency: template.frequency || 'monthly',
      next_generate_date: template.next_generate_date || '',
      tax_rate_id: template.tax_rate_id || '',
      auto_send: template.auto_send || false,
      max_occurrences: template.max_occurrences ?? '',
      items: template.items && template.items.length > 0
        ? template.items.map((i) => ({ description: i.description || '', quantity: i.quantity || 1, unit_price: i.unit_price || 0 }))
        : [{ description: '', quantity: 1, unit_price: 0 }],
      notes: template.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTemplate(null);
    setForm(emptyForm);
  };

  // ------- Item Handlers -------
  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0 }],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  // ------- CRUD Actions -------
  const handleSave = async () => {
    if (!form.client_name.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!form.frequency) {
      toast.error('Frequency is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        client_name: form.client_name.trim(),
        client_email: form.client_email.trim(),
        client_address: form.client_address.trim(),
        description: form.description.trim(),
        frequency: form.frequency,
        next_generate_date: form.next_generate_date || null,
        tax_rate_id: form.tax_rate_id || null,
        auto_send: form.auto_send,
        max_occurrences: form.max_occurrences !== '' ? parseInt(form.max_occurrences) : null,
        items: form.items.filter((i) => i.description.trim()),
        notes: form.notes.trim(),
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('recurring_invoices')
          .update(payload)
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('Recurring invoice template updated');
      } else {
        payload.created_by = user.id;
        payload.is_active = true;
        payload.total_generated = 0;
        const { error } = await supabase.from('recurring_invoices').insert(payload);
        if (error) throw error;
        toast.success('Recurring invoice template created');
      }

      closeModal();
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to save template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateNow = async (template) => {
    setGenerating(template.id);
    try {
      const { data, error } = await supabase.rpc('generate_recurring_invoice', {
        p_recurring_id: template.id,
      });
      if (error) throw error;
      toast.success(`Invoice generated successfully${data ? ` (ID: ${data})` : ''}`);
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to generate invoice');
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  const handleToggleActive = async (template) => {
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      if (error) throw error;
      toast.success(template.is_active ? 'Template paused' : 'Template activated');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to update template status');
      console.error(err);
    }
  };

  const handleDelete = async (template) => {
    if (template.total_generated > 0) {
      toast.error('Cannot delete a template that has generated invoices');
      return;
    }
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', template.id);
      if (error) throw error;
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to delete template');
      console.error(err);
    }
  };

  // ------- Render -------
  const content = (
    <div className="space-y-6">
      {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Active Templates</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{stats.activeCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Play className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Due This Week</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{stats.dueThisWeek}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${ft('text-slate-500', 'text-zinc-400')}`}>Total Generated</p>
                  <p className={`text-2xl font-bold mt-1 ${ft('text-slate-900', 'text-white')}`}>{stats.totalGenerated}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Send className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchTemplates(); fetchTaxRates(); }}
              className={ft('border-slate-200 text-slate-600 hover:bg-slate-50', 'border-zinc-700 text-zinc-400 hover:bg-white/[0.03]')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className={`${ft('bg-white border-slate-200', 'bg-white/[0.02] border-white/[0.06]')} border rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={ft('bg-slate-50 border-b border-slate-200', 'bg-white/[0.02] border-b border-white/[0.06]')}>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Client Name</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Frequency</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Next Date</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Tax Rate</th>
                  <th className={`text-center text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Items</th>
                  <th className={`text-center text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Auto-Send</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Status</th>
                  <th className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Last Generated</th>
                  <th className={`text-center text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Total Generated</th>
                  <th className={`text-right text-xs font-medium uppercase tracking-wider px-4 py-3 ${ft('text-slate-500', 'text-zinc-400')}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${ft('divide-slate-100', 'divide-white/[0.04]')}`}>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <RefreshCw className={`w-5 h-5 animate-spin mx-auto mb-2 ${ft('text-slate-400', 'text-zinc-500')}`} />
                      <p className={ft('text-slate-500', 'text-zinc-400')}>Loading templates...</p>
                    </td>
                  </tr>
                ) : filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
                      <Calendar className={`w-8 h-8 mx-auto mb-2 ${ft('text-slate-300', 'text-zinc-600')}`} />
                      <p className={ft('text-slate-500', 'text-zinc-400')}>
                        {searchQuery ? 'No templates match your search' : 'No recurring invoice templates yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((template) => {
                    const taxRate = getSelectedTaxRate(template.tax_rate_id);
                    return (
                      <tr
                        key={template.id}
                        className={`${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{template.client_name}</p>
                            {template.client_email && (
                              <p className={`text-xs mt-0.5 ${ft('text-slate-400', 'text-zinc-500')}`}>{template.client_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getFrequencyBadge(template.frequency)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm ${
                              template.is_active && isOverdue(template.next_generate_date)
                                ? 'text-red-400 font-medium'
                                : ft('text-slate-600', 'text-zinc-300')
                            }`}
                          >
                            {formatDate(template.next_generate_date)}
                          </span>
                          {template.is_active && isOverdue(template.next_generate_date) && (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 inline ml-1.5" />
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>
                          {taxRate ? `${taxRate.name} (${taxRate.rate}%)` : '\u2014'}
                        </td>
                        <td className={`px-4 py-3 text-center text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>
                          {template.items ? template.items.length : 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {template.auto_send ? (
                            <Mail className="w-4 h-4 text-blue-400 mx-auto" />
                          ) : (
                            <span className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>\u2014</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {template.is_active ? (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-zinc-400 border-zinc-500/30 bg-zinc-500/10">
                              Paused
                            </Badge>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>
                          {formatDate(template.last_generated_at)}
                        </td>
                        <td className={`px-4 py-3 text-center text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>
                          {template.total_generated || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={ft('hover:bg-slate-100 text-slate-500', 'hover:bg-white/[0.06] text-zinc-400')}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className={ft(
                                'bg-white border-slate-200',
                                'bg-zinc-900 border-zinc-700'
                              )}
                            >
                              <DropdownMenuItem
                                onClick={() => openEditModal(template)}
                                className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleGenerateNow(template)}
                                disabled={generating === template.id}
                                className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                {generating === template.id ? 'Generating...' : 'Generate Now'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(template)}
                                className={ft('text-slate-700 hover:bg-slate-50', 'text-zinc-300 hover:bg-white/[0.06]')}
                              >
                                {template.is_active ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              {(template.total_generated || 0) === 0 && (
                                <>
                                  <DropdownMenuSeparator className={ft('bg-slate-100', 'bg-zinc-700')} />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(template)}
                                    className="text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create / Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DialogContent
            className={`max-w-2xl max-h-[90vh] overflow-y-auto ${ft(
              'bg-white border-slate-200',
              'bg-zinc-900 border-zinc-700'
            )}`}
          >
            <DialogHeader>
              <DialogTitle className={ft('text-slate-900', 'text-white')}>
                {editingTemplate ? 'Edit Recurring Invoice Template' : 'New Recurring Invoice Template'}
              </DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editingTemplate
                  ? 'Update the recurring invoice template details below.'
                  : 'Set up a new recurring invoice template for automated billing.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Client Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Client Name *</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
                    placeholder="Client name"
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Client Email</Label>
                  <Input
                    type="email"
                    value={form.client_email}
                    onChange={(e) => setForm((p) => ({ ...p, client_email: e.target.value }))}
                    placeholder="client@example.com"
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Client Address</Label>
                <Textarea
                  value={form.client_address}
                  onChange={(e) => setForm((p) => ({ ...p, client_address: e.target.value }))}
                  placeholder="Client address"
                  rows={2}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>

              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Invoice description"
                  rows={2}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Frequency *</Label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
                    className={`w-full rounded-md px-3 py-2 text-sm border ${ft(
                      'bg-slate-100 border-slate-200 text-slate-900',
                      'bg-zinc-800 border-zinc-700 text-white'
                    )}`}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Next Generate Date</Label>
                  <Input
                    type="date"
                    value={form.next_generate_date}
                    onChange={(e) => setForm((p) => ({ ...p, next_generate_date: e.target.value }))}
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Max Occurrences</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.max_occurrences}
                    onChange={(e) => setForm((p) => ({ ...p, max_occurrences: e.target.value }))}
                    placeholder="Unlimited"
                    className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                  />
                </div>
              </div>

              {/* Tax Rate & Auto-Send */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Tax Rate</Label>
                  <select
                    value={form.tax_rate_id}
                    onChange={(e) => setForm((p) => ({ ...p, tax_rate_id: e.target.value }))}
                    className={`w-full rounded-md px-3 py-2 text-sm border ${ft(
                      'bg-slate-100 border-slate-200 text-slate-900',
                      'bg-zinc-800 border-zinc-700 text-white'
                    )}`}
                  >
                    <option value="">No tax</option>
                    {taxRates.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name} ({tr.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Auto-Send</Label>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, auto_send: !p.auto_send }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.auto_send ? 'bg-blue-600' : ft('bg-slate-300', 'bg-zinc-600')
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.auto_send ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm ${ft('text-slate-600', 'text-zinc-400')}`}>
                      {form.auto_send ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Invoice Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-400')}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Item
                  </Button>
                </div>

                {form.items.map((item, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${ft('bg-slate-50', 'bg-white/[0.02]')}`}>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                        className={ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            className={ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                          />
                        </div>
                        <div>
                          <Label className={`text-xs ${ft('text-slate-500', 'text-zinc-500')}`}>Unit Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                            className={ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                          />
                        </div>
                      </div>
                    </div>
                    {form.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Totals */}
                <div className={`rounded-lg p-4 space-y-2 ${ft('bg-slate-50 border border-slate-200', 'bg-white/[0.02] border border-white/[0.06]')}`}>
                  <div className="flex justify-between text-sm">
                    <span className={ft('text-slate-500', 'text-zinc-400')}>Subtotal</span>
                    <span className={ft('text-slate-900', 'text-white')}>{formatCurrency(formCalculations.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={ft('text-slate-500', 'text-zinc-400')}>
                      Tax {formCalculations.taxPercent > 0 ? `(${formCalculations.taxPercent}%)` : ''}
                    </span>
                    <span className={ft('text-slate-900', 'text-white')}>{formatCurrency(formCalculations.taxAmount)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-semibold pt-2 border-t ${ft('border-slate-200', 'border-white/[0.06]')}`}>
                    <span className={ft('text-slate-900', 'text-white')}>Total</span>
                    <span className="text-blue-400">{formatCurrency(formCalculations.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes for the invoice..."
                  rows={3}
                  className={ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={closeModal}
                className={ft('border-slate-200 text-slate-600 hover:bg-slate-50', 'border-zinc-700 text-zinc-400 hover:bg-white/[0.03]')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );

  if (embedded) return content;

  return (
    <FinancePageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Recurring Invoices"
          subtitle="Manage recurring invoice templates and automated billing"
        />
        {content}
      </div>
    </FinancePageTransition>
  );
}
