import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, Search, Filter, Download, Send, Check, Clock, AlertCircle,
  FileText, MoreVertical, Eye, Edit2, Trash2, Mail, X, ChevronDown,
  ArrowUpDown, Calendar, Euro, Building2, User, Package, RefreshCw, Zap,
  FileDown, Printer, Sun, Moon
} from 'lucide-react';
import { useFinanceTheme } from '@/contexts/FinanceThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';
import { downloadInvoicePDF, previewInvoicePDF } from '@/utils/generateInvoicePDF';
import { ProductSelector } from '@/components/finance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { usePermissions } from '@/components/context/PermissionContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';

export default function FinanceInvoices() {
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useFinanceTheme();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const companyId = user?.company_id;

  // Form state
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_address: '',
    total: '',
    due_date: '',
    description: '',
    items: [{ description: '', quantity: 1, unit_price: '' }]
  });

  useEffect(() => {
    if (companyId) {
      loadInvoices();
    }
  }, [companyId]);

  const loadInvoices = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv =>
        (inv.client_name || '').toLowerCase().includes(query) ||
        (inv.invoice_number || '').toLowerCase().includes(query) ||
        (inv.client_email || '').toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.created_at || 0) - new Date(a.created_at || 0);
          break;
        case 'amount':
          comparison = (b.total || 0) - (a.total || 0);
          break;
        case 'client':
          comparison = (a.client_name || '').localeCompare(b.client_name || '');
          break;
        case 'due':
          comparison = new Date(a.due_date || '9999') - new Date(b.due_date || '9999');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [invoices, searchQuery, statusFilter, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);
    const pending = invoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((sum, i) => sum + (i.total || 0), 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.total || 0), 0);

    return { total, paid, pending, overdue, count: invoices.length };
  }, [invoices]);

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_email: '',
      client_address: '',
      total: '',
      due_date: '',
      description: '',
      items: [{ description: '', quantity: 1, unit_price: '' }]
    });
    setEditMode(false);
  };

  // Calculate total from line items
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (quantity * price);
    }, 0);
  };

  // Add product from selector
  const handleAddProduct = (lineItem) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items.filter(i => i.description || i.product_id), lineItem],
      total: '' // Will be recalculated
    }));
    setShowProductSelector(false);
  };

  // Remove line item
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validItems = formData.items.filter(item => (item.description || item.name) && item.unit_price);
      const calculatedTotal = validItems.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const price = parseFloat(item.unit_price) || 0;
        return sum + (quantity * price);
      }, 0);

      const invoiceData = {
        user_id: user?.id,
        company_id: companyId,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_address: formData.client_address,
        total: calculatedTotal || parseFloat(formData.total) || 0,
        status: 'draft',
        due_date: formData.due_date || null,
        description: formData.description,
        items: validItems
      };

      if (editMode && selectedInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', selectedInvoice.id);

        if (error) throw error;
        toast.success('Invoice updated successfully');
      } else {
        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (error) throw error;
        setInvoices(prev => [newInvoice, ...prev]);

        // Auto-create subscriptions for subscription line items
        const subscriptionItems = validItems.filter(item => item.is_subscription);
        for (const item of subscriptionItems) {
          try {
            await supabase.from('subscriptions').insert({
              company_id: companyId,
              product_id: item.product_id,
              plan_id: item.plan_id,
              plan_name: item.plan_name,
              billing_cycle: item.billing_cycle || 'monthly',
              amount: item.unit_price,
              status: 'active',
              invoice_id: newInvoice?.id,
              client_name: formData.client_name,
              client_email: formData.client_email,
              start_date: new Date().toISOString()
            });
          } catch (subErr) {
            console.warn('Could not create subscription:', subErr);
          }
        }

        if (subscriptionItems.length > 0) {
          toast.success(`Invoice created with ${subscriptionItems.length} subscription(s) activated`);
        } else {
          toast.success('Invoice created successfully');
        }
      }

      setShowCreateModal(false);
      resetForm();
      loadInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (invoice, newStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: newStatus } : i));
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      toast.success('Invoice deleted');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleSendInvoice = async (invoice) => {
    if (!invoice.client_email) {
      toast.error('Client email is required to send the invoice');
      return;
    }

    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();

      // Send the email via edge function
      const emailResponse = await fetch(
        `https://sfxpmzicgpaxfntqleig.supabase.co/functions/v1/send-invoice-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            to: invoice.client_email,
            clientName: invoice.client_name,
            invoiceNumber: invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`,
            invoiceId: invoice.id,
            senderName: user?.full_name,
            senderCompany: user?.company_name || 'iSyncSO',
            total: invoice.total || 0,
            currency: 'EUR',
            dueDate: invoice.due_date,
            description: invoice.description,
            items: invoice.items || []
          })
        }
      );

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        throw new Error(emailResult.error || 'Failed to send email');
      }

      // Update invoice status
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoices(prev => prev.map(i =>
        i.id === invoice.id ? { ...i, status: 'sent', updated_at: new Date().toISOString() } : i
      ));

      toast.success('Invoice sent successfully');
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error(error.message || 'Failed to send invoice');
    }
  };

  const openEditModal = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      client_name: invoice.client_name || '',
      client_email: invoice.client_email || '',
      client_address: invoice.client_address || '',
      total: invoice.total?.toString() || '',
      due_date: invoice.due_date || '',
      description: invoice.description || '',
      items: invoice.items || [{ description: '', quantity: 1, unit_price: '' }]
    });
    setEditMode(true);
    setShowCreateModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: ft('bg-slate-200/50 text-slate-500 border-slate-300', 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'),
      sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      paid: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: ft('bg-slate-200/50 text-slate-500 border-slate-300', 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30')
    };
    return styles[status] || styles.pending;
  };

  const canCreate = useMemo(() => {
    if (permLoading) return false;
    return hasPermission('finance.create');
  }, [hasPermission, permLoading]);

  if (loading || permLoading) {
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <FinancePageTransition>
    <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>

      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            icon={Receipt}
            title="Invoices"
            subtitle="Create, send, and track your invoices"
            color="blue"
            actions={
              <div className="flex gap-3">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg border transition-colors ${ft('border-slate-200 hover:bg-slate-100 text-slate-600', 'border-zinc-700 hover:bg-zinc-800 text-zinc-400')}`}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <Button variant="outline" className={ft('border-slate-200 text-slate-600 hover:bg-slate-100', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {canCreate && (
                <Button
                  className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  onClick={() => { resetForm(); setShowCreateModal(true); }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              )}
              </div>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: `€${stats.total.toLocaleString()}`, count: stats.count, color: 'zinc' },
            { label: 'Paid', value: `€${stats.paid.toLocaleString()}`, icon: Check, color: 'blue' },
            { label: 'Pending', value: `€${stats.pending.toLocaleString()}`, icon: Clock, color: 'blue' },
            { label: 'Overdue', value: `€${stats.overdue.toLocaleString()}`, icon: AlertCircle, color: 'red' }
          ].map((stat) => (
            <Card key={stat.label} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>{stat.label}</span>
                  {stat.icon && <stat.icon className={`w-3.5 h-3.5 ${stat.color === 'blue' ? 'text-blue-400' : stat.color === 'red' ? 'text-red-400' : ft('text-slate-500', 'text-zinc-400')}`} />}
                </div>
                <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{stat.value}</p>
                {stat.count !== undefined && (
                  <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{stat.count} invoices</p>
                )}
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
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                  {['all', 'draft', 'sent', 'pending', 'paid', 'overdue'].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800') + ' capitalize'}
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                  {[
                    { value: 'date', label: 'Date' },
                    { value: 'amount', label: 'Amount' },
                    { value: 'client', label: 'Client' },
                    { value: 'due', label: 'Due Date' }
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => {
                        if (sortBy === option.value) {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(option.value);
                          setSortOrder('desc');
                        }
                      }}
                      className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                    >
                      {option.label} {sortBy === option.value && (sortOrder === 'asc' ? '↑' : '↓')}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-16">
                <Receipt className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>No invoices found</h3>
                <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6`}>
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
                </p>
                {canCreate && !searchQuery && statusFilter === 'all' && (
                  <Button
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className={`divide-y ${ft('divide-slate-200', 'divide-zinc-800')}`}>
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className={`px-3 py-2 transition-colors ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>
                              {invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`}
                            </p>
                            <Badge variant="outline" size="xs" className={getStatusBadge(invoice.status)}>
                              {invoice.status || 'draft'}
                            </Badge>
                          </div>
                          <div className={`flex items-center gap-3 mt-0.5 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {invoice.client_name || 'No client'}
                            </span>
                            {invoice.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due: {new Date(invoice.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className={`text-sm font-semibold ${ft('text-slate-900', 'text-white')}`}>
                          €{(invoice.total || 0).toLocaleString()}
                        </p>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={ft('text-slate-400 hover:text-slate-900', 'text-zinc-400 hover:text-white')}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                            <DropdownMenuItem
                              onClick={() => { setSelectedInvoice(invoice); setShowDetailModal(true); }}
                              className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => previewInvoicePDF(invoice)}
                              className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              View PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => downloadInvoicePDF(invoice)}
                              className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditModal(invoice)}
                              className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                            {invoice.status === 'draft' && invoice.client_email && (
                              <DropdownMenuItem
                                onClick={() => handleSendInvoice(invoice)}
                                className={`text-blue-400 ${ft('hover:bg-slate-100', 'hover:bg-zinc-800')}`}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(invoice, 'paid')}
                                className={`text-blue-400 ${ft('hover:bg-slate-100', 'hover:bg-zinc-800')}`}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvoice(invoice)}
                              className={`text-red-400 ${ft('hover:bg-slate-100', 'hover:bg-zinc-800')}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Invoice Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-lg max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
              {editMode ? 'Update invoice details' : 'Fill in the details to create a new invoice'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Client Name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  required
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Client Email</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                />
              </div>

              <div className="col-span-2">
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Client Address</Label>
                <Textarea
                  value={formData.client_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="Enter billing address"
                  rows={2}
                />
              </div>

              {/* Line Items Section */}
              <div className={`col-span-2 pt-4 border-t ${ft('border-slate-200', 'border-zinc-700')}`}>
                <div className="flex items-center justify-between mb-3">
                  <Label className={`${ft('text-slate-600', 'text-zinc-300')} flex items-center gap-2`}>
                    <Package className="w-4 h-4" />
                    Line Items
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProductSelector(true)}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                </div>

                {/* Line Items List */}
                {formData.items.filter(i => i.description || i.name || i.product_id).length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {formData.items.map((item, idx) => (
                      (item.description || item.name || item.product_id) && (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${ft('bg-slate-100 border-slate-200', 'bg-zinc-800/50 border-white/5')}`}
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${ft('bg-slate-200', 'bg-zinc-700/50')}`}>
                            {item.is_subscription ? (
                              <RefreshCw className="w-4 h-4 text-blue-400" />
                            ) : item.product_id ? (
                              <Zap className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Package className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-400')}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${ft('text-slate-900', 'text-white')} text-sm truncate`}>
                              {item.name || item.description}
                            </p>
                            {item.is_subscription && (
                              <p className="text-xs text-blue-400">
                                {item.plan_name} ({item.billing_cycle})
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')}`}>
                              €{((item.quantity || 1) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                            </p>
                            {item.quantity > 1 && (
                              <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                                {item.quantity} x €{parseFloat(item.unit_price || 0).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(idx)}
                            className={`${ft('text-slate-400', 'text-zinc-400')} hover:text-red-400 h-8 w-8 p-0`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    ))}

                    {/* Total from items */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="text-sm text-blue-400">Calculated Total</span>
                      <span className="text-lg font-bold text-blue-400">
                        €{calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-6 rounded-lg border border-dashed ${ft('border-slate-300', 'border-zinc-700')} mb-4`}>
                    <Package className={`w-8 h-8 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-2`} />
                    <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>No products added</p>
                    <p className={`text-xs ${ft('text-slate-400', 'text-zinc-600')} mt-1`}>
                      Click "Add Product" to select from your catalog
                    </p>
                  </div>
                )}

                {/* Manual amount override */}
                <div>
                  <Label className={`${ft('text-slate-400', 'text-zinc-500')} text-xs`}>Manual Amount Override</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => setFormData(prev => ({ ...prev, total: e.target.value }))}
                    className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                    placeholder="Leave empty to use calculated total"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Notes</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="Invoice notes or additional information"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className={ft('border-slate-200', 'border-zinc-700')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {saving ? 'Saving...' : (editMode ? 'Update Invoice' : 'Create Invoice')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-lg`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {selectedInvoice?.invoice_number || 'Invoice Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={getStatusBadge(selectedInvoice.status)}>
                  {selectedInvoice.status || 'draft'}
                </Badge>
                <p className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')}`}>
                  €{(selectedInvoice.total || 0).toLocaleString()}
                </p>
              </div>

              <div className={`space-y-3 ${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-4`}>
                <div className="flex justify-between">
                  <span className={ft('text-slate-500', 'text-zinc-400')}>Client</span>
                  <span className={ft('text-slate-900', 'text-white')}>{selectedInvoice.client_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={ft('text-slate-500', 'text-zinc-400')}>Email</span>
                  <span className={ft('text-slate-900', 'text-white')}>{selectedInvoice.client_email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={ft('text-slate-500', 'text-zinc-400')}>Due Date</span>
                  <span className={ft('text-slate-900', 'text-white')}>
                    {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={ft('text-slate-500', 'text-zinc-400')}>Created</span>
                  <span className={ft('text-slate-900', 'text-white')}>
                    {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              {selectedInvoice.items?.length > 0 && (
                <div className={`${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-4`}>
                  <p className={`${ft('text-slate-500', 'text-zinc-400')} text-sm mb-3`}>Line Items</p>
                  <div className="space-y-2">
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className={`flex items-center justify-between py-2 border-b ${ft('border-slate-200/50', 'border-zinc-700/50')} last:border-0`}>
                        <div className="flex items-center gap-2">
                          {item.is_subscription ? (
                            <RefreshCw className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-400" />
                          )}
                          <div>
                            <p className={`${ft('text-slate-900', 'text-white')} text-sm`}>{item.name || item.description}</p>
                            {item.is_subscription && (
                              <p className="text-xs text-blue-400">{item.plan_name} ({item.billing_cycle})</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`${ft('text-slate-900', 'text-white')} font-medium`}>
                            €{((item.quantity || 1) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-zinc-500">{item.quantity} × €{parseFloat(item.unit_price || 0).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvoice.description && (
                <div className={`${ft('bg-slate-100', 'bg-zinc-800/50')} rounded-lg p-4`}>
                  <p className={`${ft('text-slate-500', 'text-zinc-400')} text-sm mb-1`}>Notes</p>
                  <p className={ft('text-slate-900', 'text-white')}>{selectedInvoice.description}</p>
                </div>
              )}

              {/* PDF Actions */}
              <div className={`flex gap-3 pt-4 border-t ${ft('border-slate-200', 'border-zinc-700')}`}>
                <Button
                  variant="outline"
                  className={`flex-1 ${ft('border-slate-200 text-slate-600 hover:bg-slate-100', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}`}
                  onClick={() => previewInvoicePDF(selectedInvoice)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  View PDF
                </Button>
                <Button
                  variant="outline"
                  className={`flex-1 ${ft('border-slate-200 text-slate-600 hover:bg-slate-100', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}`}
                  onClick={() => downloadInvoicePDF(selectedInvoice)}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Status Actions */}
              <div className="flex gap-3">
                {selectedInvoice.status === 'draft' && selectedInvoice.client_email && (
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={() => { handleSendInvoice(selectedInvoice); setShowDetailModal(false); }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {selectedInvoice.status !== 'paid' && (
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                    onClick={() => { handleUpdateStatus(selectedInvoice, 'paid'); setShowDetailModal(false); }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Selector Modal */}
      <ProductSelector
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSelect={handleAddProduct}
        currency="EUR"
      />
    </div>
    </FinancePageTransition>
  );
}
