import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, Search, Filter, Download, Send, Check, Clock, AlertCircle,
  FileText, MoreVertical, Eye, Edit2, Trash2, Mail, X, ChevronDown,
  ArrowUpDown, Calendar, DollarSign, Building2, User, Package, RefreshCw, Zap,
  FileDown, Printer
} from 'lucide-react';
import { downloadInvoicePDF, previewInvoicePDF } from '@/utils/generateInvoicePDF';
import { ProductSelector } from '@/components/finance';
import { Subscription } from '@/api/entities';
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
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Invoice?.list?.({ limit: 500 }).catch(() => []) || [];
      setInvoices(data);
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
      const user = await base44.auth.me();
      const validItems = formData.items.filter(item => (item.description || item.name) && item.unit_price);
      const calculatedTotal = validItems.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const price = parseFloat(item.unit_price) || 0;
        return sum + (quantity * price);
      }, 0);

      const invoiceData = {
        user_id: user?.id,
        company_id: user?.company_id,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_address: formData.client_address,
        total: calculatedTotal || parseFloat(formData.total) || 0,
        status: 'draft',
        due_date: formData.due_date,
        description: formData.description,
        items: validItems
      };

      let newInvoice;
      if (editMode && selectedInvoice) {
        await base44.entities.Invoice.update(selectedInvoice.id, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        newInvoice = await base44.entities.Invoice.create(invoiceData);
        setInvoices(prev => [newInvoice, ...prev]);

        // Auto-create subscriptions for subscription line items
        const subscriptionItems = validItems.filter(item => item.is_subscription);
        for (const item of subscriptionItems) {
          try {
            await Subscription.create({
              company_id: user?.company_id,
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
      await base44.entities.Invoice.update(invoice.id, { status: newStatus });
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
      await base44.entities.Invoice.delete(invoice.id);
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
      // Get current user info for sender details
      const me = await base44.auth.me();
      const session = await base44.auth.getSession();

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
            senderName: me?.full_name,
            senderCompany: me?.company_name || 'iSyncSO',
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
      await base44.entities.Invoice.update(invoice.id, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      setInvoices(prev => prev.map(i =>
        i.id === invoice.id ? { ...i, status: 'sent', sent_at: new Date().toISOString() } : i
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
      draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
      sent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      paid: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30'
    };
    return styles[status] || styles.pending;
  };

  const canCreate = useMemo(() => {
    if (permLoading) return false;
    return hasPermission('finance.create');
  }, [hasPermission, permLoading]);

  if (loading || permLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Receipt}
          title="Invoices"
          subtitle="Create, send, and track your invoices"
          color="amber"
          actions={
            <div className="flex gap-3">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {canCreate && (
                <Button
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  onClick={() => { resetForm(); setShowCreateModal(true); }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              )}
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: `$${stats.total.toLocaleString()}`, count: stats.count, color: 'zinc' },
            { label: 'Paid', value: `$${stats.paid.toLocaleString()}`, icon: Check, color: 'amber' },
            { label: 'Pending', value: `$${stats.pending.toLocaleString()}`, icon: Clock, color: 'amber' },
            { label: 'Overdue', value: `$${stats.overdue.toLocaleString()}`, icon: AlertCircle, color: 'red' }
          ].map((stat) => (
            <Card key={stat.label} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">{stat.label}</span>
                  {stat.icon && <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />}
                </div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                {stat.count !== undefined && (
                  <p className="text-xs text-zinc-500">{stat.count} invoices</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300">
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                  {['all', 'draft', 'sent', 'pending', 'paid', 'overdue'].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className="text-zinc-300 hover:bg-zinc-800 capitalize"
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
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
                      className="text-zinc-300 hover:bg-zinc-800"
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
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-16">
                <Receipt className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No invoices found</h3>
                <p className="text-zinc-500 mb-6">
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
                </p>
                {canCreate && !searchQuery && statusFilter === 'all' && (
                  <Button
                    className="bg-amber-500 hover:bg-amber-600"
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredInvoices.map((invoice) => (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <FileText className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-white">
                              {invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`}
                            </p>
                            <Badge variant="outline" className={getStatusBadge(invoice.status)}>
                              {invoice.status || 'draft'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
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

                      <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold text-white">
                          ${(invoice.total || 0).toLocaleString()}
                        </p>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
                            <DropdownMenuItem
                              onClick={() => { setSelectedInvoice(invoice); setShowDetailModal(true); }}
                              className="text-zinc-300 hover:bg-zinc-800"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => previewInvoicePDF(invoice)}
                              className="text-zinc-300 hover:bg-zinc-800"
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              View PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => downloadInvoicePDF(invoice)}
                              className="text-zinc-300 hover:bg-zinc-800"
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditModal(invoice)}
                              className="text-zinc-300 hover:bg-zinc-800"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-700" />
                            {invoice.status === 'draft' && invoice.client_email && (
                              <DropdownMenuItem
                                onClick={() => handleSendInvoice(invoice)}
                                className="text-amber-400 hover:bg-zinc-800"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== 'paid' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(invoice, 'paid')}
                                className="text-amber-400 hover:bg-zinc-800"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-zinc-700" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="text-red-400 hover:bg-zinc-800"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Invoice Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editMode ? 'Update invoice details' : 'Fill in the details to create a new invoice'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-zinc-300">Client Name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Client Email</Label>
                <Input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-zinc-300">Client Address</Label>
                <Textarea
                  value={formData.client_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  placeholder="Enter billing address"
                  rows={2}
                />
              </div>

              {/* Line Items Section */}
              <div className="col-span-2 pt-4 border-t border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Line Items
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProductSelector(true)}
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
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
                          className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                        >
                          <div className="w-8 h-8 rounded flex items-center justify-center bg-zinc-700/50">
                            {item.is_subscription ? (
                              <RefreshCw className="w-4 h-4 text-cyan-400" />
                            ) : item.product_id ? (
                              <Zap className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Package className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">
                              {item.name || item.description}
                            </p>
                            {item.is_subscription && (
                              <p className="text-xs text-cyan-400">
                                {item.plan_name} ({item.billing_cycle})
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              ${((item.quantity || 1) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-zinc-500">
                                {item.quantity} x ${parseFloat(item.unit_price || 0).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    ))}

                    {/* Total from items */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <span className="text-sm text-amber-400">Calculated Total</span>
                      <span className="text-lg font-bold text-amber-400">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 rounded-lg border border-dashed border-zinc-700 mb-4">
                    <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No products added</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Click "Add Product" to select from your catalog
                    </p>
                  </div>
                )}

                {/* Manual amount override */}
                <div>
                  <Label className="text-zinc-500 text-xs">Manual Amount Override</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => setFormData(prev => ({ ...prev, total: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    placeholder="Leave empty to use calculated total"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-zinc-300">Notes</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
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
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {saving ? 'Saving...' : (editMode ? 'Update Invoice' : 'Create Invoice')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              {selectedInvoice?.invoice_number || 'Invoice Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={getStatusBadge(selectedInvoice.status)}>
                  {selectedInvoice.status || 'draft'}
                </Badge>
                <p className="text-2xl font-bold text-white">
                  ${(selectedInvoice.total || 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-3 bg-zinc-800/50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Client</span>
                  <span className="text-white">{selectedInvoice.client_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-white">{selectedInvoice.client_email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Due Date</span>
                  <span className="text-white">
                    {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Created</span>
                  <span className="text-white">
                    {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              {selectedInvoice.items?.length > 0 && (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm mb-3">Line Items</p>
                  <div className="space-y-2">
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                        <div className="flex items-center gap-2">
                          {item.is_subscription ? (
                            <RefreshCw className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-400" />
                          )}
                          <div>
                            <p className="text-white text-sm">{item.name || item.description}</p>
                            {item.is_subscription && (
                              <p className="text-xs text-cyan-400">{item.plan_name} ({item.billing_cycle})</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
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
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm mb-1">Notes</p>
                  <p className="text-white">{selectedInvoice.description}</p>
                </div>
              )}

              {/* PDF Actions */}
              <div className="flex gap-3 pt-4 border-t border-zinc-700">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => previewInvoicePDF(selectedInvoice)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  View PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                    onClick={() => { handleSendInvoice(selectedInvoice); setShowDetailModal(false); }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {selectedInvoice.status !== 'paid' && (
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
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
  );
}
