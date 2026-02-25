import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, Search, Filter, MoreVertical, Calendar, Euro,
  RefreshCw, Edit, Trash2, Pause, Play, Clock, AlertCircle, CheckCircle2,
  XCircle, RotateCcw, ExternalLink, Download, ArrowUpDown, Sun, Moon,
  Monitor, Server, Megaphone, MessageSquare, Zap, BarChart3, Shield, Users, Wallet, Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Subscription } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';
import { usePermissions } from '@/components/context/PermissionContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly', multiplier: 52 },
  { value: 'monthly', label: 'Monthly', multiplier: 12 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 4 },
  { value: 'yearly', label: 'Yearly', multiplier: 1 }
];

const CATEGORIES = [
  { value: 'software', label: 'Software & SaaS', icon: Monitor },
  { value: 'infrastructure', label: 'Infrastructure', icon: Server },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'communication', label: 'Communication', icon: MessageSquare },
  { value: 'productivity', label: 'Productivity', icon: Zap },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'hr', label: 'HR & Payroll', icon: Users },
  { value: 'finance', label: 'Finance', icon: Wallet },
  { value: 'other', label: 'Other', icon: Package }
];

export default function FinanceSubscriptions({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user } = useUser();
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { theme, toggleTheme, ft } = useTheme();
  const companyId = user?.company_id || user?.organization_id;

  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    billing_cycle: 'monthly',
    category: 'software',
    next_billing_date: '',
    description: '',
    website_url: '',
    status: 'active',
    tax_rate: '21',
    tax_mechanism: 'standard_btw'
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await Subscription.list();
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const canView = useMemo(() => {
    if (permLoading) return false;
    return hasPermission('finance.view');
  }, [hasPermission, permLoading]);

  const canCreate = hasPermission('finance.create') || hasPermission('finance.edit');

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active');
    const paused = subscriptions.filter(s => s.status === 'paused');
    const cancelled = subscriptions.filter(s => s.status === 'cancelled');

    let monthlyTotal = 0;
    active.forEach(sub => {
      const cycle = BILLING_CYCLES.find(c => c.value === sub.billing_cycle);
      if (cycle) {
        monthlyTotal += ((sub.amount || 0) * cycle.multiplier) / 12;
      }
    });

    return {
      total: subscriptions.length,
      active: active.length,
      paused: paused.length,
      cancelled: cancelled.length,
      monthlyCost: monthlyTotal,
      annualCost: monthlyTotal * 12
    };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    let filtered = [...subscriptions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(query) ||
        s.provider?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'amount': return (b.amount || 0) - (a.amount || 0);
        case 'date': return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default: return 0;
      }
    });

    return filtered;
  }, [subscriptions, searchQuery, statusFilter, sortBy]);

  const resetForm = () => {
    setFormData({
      name: '',
      provider: '',
      amount: '',
      billing_cycle: 'monthly',
      category: 'software',
      next_billing_date: '',
      description: '',
      website_url: '',
      status: 'active',
      tax_rate: '21',
      tax_mechanism: 'standard_btw'
    });
    setEditMode(false);
    setSelectedSubscription(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }
    setSaving(true);

    try {
      const amount = parseFloat(formData.amount) || 0;
      const taxRate = parseFloat(formData.tax_rate) || 0;
      const data = {
        ...formData,
        amount,
        tax_rate: taxRate,
        tax_amount: Math.round(amount * (taxRate / 100) * 100) / 100,
        user_id: user.id,
        company_id: companyId,
      };

      if (editMode && selectedSubscription) {
        const { user_id, company_id, ...updateData } = data;
        await Subscription.update(selectedSubscription.id, updateData);
        toast.success('Subscription updated');
      } else {
        await Subscription.create(data);
        toast.success('Subscription created');
      }

      setShowCreateModal(false);
      resetForm();
      loadSubscriptions();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subscription) => {
    setSelectedSubscription(subscription);
    setFormData({
      name: subscription.name || '',
      provider: subscription.provider || '',
      amount: subscription.amount?.toString() || '',
      billing_cycle: subscription.billing_cycle || 'monthly',
      category: subscription.category || 'software',
      next_billing_date: subscription.next_billing_date?.split('T')[0] || '',
      description: subscription.description || '',
      website_url: subscription.website_url || '',
      status: subscription.status || 'active',
      tax_rate: subscription.tax_rate?.toString() || '21',
      tax_mechanism: subscription.tax_mechanism || 'standard_btw'
    });
    setEditMode(true);
    setShowCreateModal(true);
  };

  const handleDelete = (subscription) => {
    setDeleteTarget(subscription);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await Subscription.delete(deleteTarget.id);
      toast.success('Subscription deleted');
      loadSubscriptions();
    } catch (error) {
      toast.error('Failed to delete subscription');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (subscription, newStatus) => {
    try {
      await Subscription.update(subscription.id, { status: newStatus });
      toast.success(`Subscription ${newStatus}`);
      loadSubscriptions();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      paused: ft('text-slate-500 border-slate-400/30 bg-slate-400/10', 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10'),
      cancelled: 'text-red-400 border-red-500/30 bg-red-500/10',
      trial: 'text-blue-400 border-blue-500/30 bg-blue-500/10'
    };
    return styles[status] || styles.active;
  };

  const getCategoryInfo = (value) => CATEGORIES.find(c => c.value === value) || CATEGORIES[9];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount || 0);
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
    if (embedded) return <div className="text-center py-12"><p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view subscriptions.</p></div>;
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex flex-col items-center justify-center text-center p-6`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className={`text-2xl font-bold ${ft('text-slate-900', 'text-white')} mb-2`}>Access Denied</h2>
        <p className={ft('text-slate-500', 'text-zinc-400')}>You don't have permission to view subscriptions.</p>
      </div>
    );
  }

  const content = (
        <div className={embedded ? "space-y-6" : "w-full px-6 lg:px-8 py-6 space-y-6"}>
          {/* Header */}
          {!embedded && <div className="flex items-center justify-between">
            <div className="flex-1">
              <PageHeader
                icon={CreditCard}
                title="Subscriptions"
                subtitle="Manage your recurring subscriptions"
                color="blue"
                actions={
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleTheme}
                      className={`${ft('border-slate-200 text-slate-600 hover:bg-slate-100', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}`}
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600 hover:bg-slate-100', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    {canCreate && (
                      <Button
                        className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subscription
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </div>}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: stats.total, sub: `${stats.active} active`, color: 'zinc' },
              { label: 'Monthly Cost', value: formatCurrency(stats.monthlyCost), icon: RefreshCw, color: 'blue' },
              { label: 'Annual Cost', value: formatCurrency(stats.annualCost), icon: Calendar, color: 'blue' },
              { label: 'Paused', value: stats.paused, sub: `${stats.cancelled} cancelled`, color: 'zinc' }
            ].map((stat) => (
              <Card key={stat.label} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`${ft('text-slate-500', 'text-zinc-400')} text-sm`}>{stat.label}</p>
                    {stat.icon && <stat.icon className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className={`text-xl font-bold ${ft('text-slate-900', 'text-white')}`}>{stat.value}</p>
                  {stat.sub && <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')} mt-1`}>{stat.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-400')}`} />
                  <Input
                    placeholder="Search subscriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-9 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800/50 border-zinc-700 text-white')}`}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Filter className="w-4 h-4 mr-2" />
                      Status: {statusFilter === 'all' ? 'All' : statusFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-800 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>All</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('active')} className={ft('text-slate-600', 'text-zinc-300')}>Active</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('paused')} className={ft('text-slate-600', 'text-zinc-300')}>Paused</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('cancelled')} className={ft('text-slate-600', 'text-zinc-300')}>Cancelled</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-800 border-zinc-700')}>
                    <DropdownMenuItem onClick={() => setSortBy('name')} className={ft('text-slate-600', 'text-zinc-300')}>Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('amount')} className={ft('text-slate-600', 'text-zinc-300')}>Amount</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('date')} className={ft('text-slate-600', 'text-zinc-300')}>Date Added</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions List */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {filteredSubscriptions.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className={`w-12 h-12 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>No subscriptions found</h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-4`}>Start tracking your recurring subscriptions</p>
                  {canCreate && (
                    <Button
                      className="bg-blue-500 hover:bg-blue-600"
                      onClick={() => { resetForm(); setShowCreateModal(true); }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Subscription
                    </Button>
                  )}
                </div>
              ) : (
                <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                  {filteredSubscriptions.map((subscription) => {
                    const category = getCategoryInfo(subscription.category);
                    const cycle = BILLING_CYCLES.find(c => c.value === subscription.billing_cycle);

                    return (
                      <motion.div
                        key={subscription.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 ${ft('hover:bg-slate-50', 'hover:bg-zinc-800/30')} transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <CreditCard className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium ${ft('text-slate-900', 'text-white')}`}>{subscription.name}</h3>
                                <Badge variant="outline" className={getStatusBadge(subscription.status)}>
                                  {subscription.status}
                                </Badge>
                              </div>
                              <p className={`text-sm ${ft('text-slate-400', 'text-zinc-500')}`}>
                                {subscription.provider || category.label} · {cycle?.label || 'Monthly'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-lg font-semibold ${ft('text-slate-900', 'text-white')}`}>
                                {formatCurrency(subscription.amount)}
                              </p>
                              <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                                per {subscription.billing_cycle}
                                {subscription.tax_rate > 0 && (
                                  subscription.tax_mechanism?.includes('reverse_charge')
                                    ? ` · ${subscription.tax_rate}% BTW (self-assessed)`
                                    : ` · ${subscription.tax_rate}% BTW`
                                )}
                              </p>
                            </div>

                            {canCreate && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className={ft('text-slate-400 hover:text-slate-900', 'text-zinc-400 hover:text-white')}>
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-800 border-zinc-700')}>
                                  {subscription.website_url && (
                                    <DropdownMenuItem
                                      onClick={() => window.open(subscription.website_url, '_blank')}
                                      className={ft('text-slate-600', 'text-zinc-300')}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Visit Website
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleEdit(subscription)} className={ft('text-slate-600', 'text-zinc-300')}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                  {subscription.status === 'active' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'paused')} className={ft('text-slate-600', 'text-zinc-300')}>
                                      <Pause className="w-4 h-4 mr-2" />
                                      Pause
                                    </DropdownMenuItem>
                                  )}
                                  {subscription.status === 'paused' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'active')} className="text-blue-400">
                                      <Play className="w-4 h-4 mr-2" />
                                      Resume
                                    </DropdownMenuItem>
                                  )}
                                  {subscription.status !== 'cancelled' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'cancelled')} className="text-red-400">
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  )}
                                  {subscription.status === 'cancelled' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'active')} className="text-blue-400">
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Reactivate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                  <DropdownMenuItem onClick={() => handleDelete(subscription)} className="text-red-400">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-md`}>
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Subscription' : 'New Subscription'}</DialogTitle>
                <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                  {editMode ? 'Update subscription details' : 'Add a new recurring subscription'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className={ft('text-slate-600', 'text-zinc-300')}>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Slack, AWS"
                    className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={ft('text-slate-600', 'text-zinc-300')}>Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0.00"
                      className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                      required
                    />
                  </div>
                  <div>
                    <Label className={ft('text-slate-600', 'text-zinc-300')}>Billing Cycle</Label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData({...formData, billing_cycle: e.target.value})}
                      className={`w-full ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} border rounded-md px-3 py-2 mt-1`}
                    >
                      {BILLING_CYCLES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={ft('text-slate-600', 'text-zinc-300')}>Provider</Label>
                    <Input
                      value={formData.provider}
                      onChange={(e) => setFormData({...formData, provider: e.target.value})}
                      placeholder="Company name"
                      className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                    />
                  </div>
                  <div>
                    <Label className={ft('text-slate-600', 'text-zinc-300')}>BTW / Tax Rate (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({...formData, tax_rate: e.target.value})}
                        placeholder="21"
                        className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                      />
                    </div>
                    {formData.amount && parseFloat(formData.tax_rate) > 0 && (
                      <p className={`text-xs mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>
                        BTW: {formatCurrency((parseFloat(formData.amount) || 0) * (parseFloat(formData.tax_rate) || 0) / 100)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={ft('text-slate-600', 'text-zinc-300')}>Category</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className={`w-full ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} border rounded-md px-3 py-2 mt-1`}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className={ft('text-slate-600', 'text-zinc-300')}>Next Billing Date</Label>
                    <Input
                      type="date"
                      value={formData.next_billing_date}
                      onChange={(e) => setFormData({...formData, next_billing_date: e.target.value})}
                      className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                    />
                  </div>
                </div>

                <div>
                  <Label className={ft('text-slate-600', 'text-zinc-300')}>Notes</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Additional notes..."
                    className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600">
                    {saving ? 'Saving...' : editMode ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
  );

  if (embedded) return content;

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        {content}
      </div>
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Subscription"
        description={`Are you sure you want to delete this subscription? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </FinancePageTransition>
  );
}
