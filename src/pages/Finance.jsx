import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Euro, TrendingUp, TrendingDown, CreditCard, Receipt,
  PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Plus,
  Filter, Download, Calendar, Building2, Users, FileText,
  Wallet, BanknoteIcon, BadgeEuro, Percent, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGuard } from '@/components/guards';
import { usePermissions } from '@/components/context/PermissionContext';
import { PageHeader } from '@/components/ui/PageHeader';

// Modal Component
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // Get permissions for conditional rendering
  const { hasPermission, isLoading: permLoading } = usePermissions();

  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFinanceData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        const [expensesData, invoicesData, subscriptionsData] = await Promise.all([
          (db.entities.Expense?.list ? db.entities.Expense.list({ limit: 100 }).catch(() => []) : Promise.resolve([])),
          (db.entities.Invoice?.list ? db.entities.Invoice.list({ limit: 100 }).catch(() => []) : Promise.resolve([])),
          (db.entities.Subscription?.list ? db.entities.Subscription.list({ limit: 100 }).catch(() => []) : Promise.resolve([]))
        ]);

        if (!isMounted) return;
        setExpenses(expensesData || []);
        setInvoices(invoicesData || []);
        setSubscriptions(subscriptionsData || []);
      } catch (error) {
        console.error('Error loading finance data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFinanceData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Create Invoice
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.target);
      const user = await db.auth.me();
      const invoice = await db.entities.Invoice.create({
        user_id: user?.id,
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        client_name: formData.get('client_name'),
        client_email: formData.get('client_email'),
        total: parseFloat(formData.get('amount')) || 0,
        status: 'pending',
        due_date: formData.get('due_date'),
        description: formData.get('description')
      });
      setInvoices(prev => [invoice, ...prev]);
      setShowInvoiceModal(false);
      e.target.reset();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Create Expense
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.target);
      const user = await db.auth.me();
      const expense = await db.entities.Expense.create({
        user_id: user?.id,
        description: formData.get('description'),
        amount: parseFloat(formData.get('amount')) || 0,
        category: formData.get('category'),
        date: formData.get('date') || new Date().toISOString().split('T')[0],
        vendor: formData.get('vendor')
      });
      setExpenses(prev => [expense, ...prev]);
      setShowExpenseModal(false);
      e.target.reset();
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Create Subscription
  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.target);
      const user = await db.auth.me();
      const subscription = await db.entities.Subscription.create({
        user_id: user?.id,
        name: formData.get('name'),
        amount: parseFloat(formData.get('amount')) || 0,
        billing_cycle: formData.get('billing_cycle') || 'monthly',
        status: 'active',
        next_billing_date: formData.get('next_billing_date'),
        description: formData.get('description')
      });
      setSubscriptions(prev => [subscription, ...prev]);
      setShowSubscriptionModal(false);
      e.target.reset();
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Memoize all calculations to prevent unnecessary recalculations
  const { totalRevenue, totalExpenses, pendingInvoices, monthlyRecurring, metrics } = useMemo(() => {
    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const totalExpenses = expenses
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingInvoices = invoices
      .filter(i => i.status === 'pending' || i.status === 'sent')
      .reduce((sum, i) => sum + (i.total || 0), 0);

    const monthlyRecurring = subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const metrics = [
      {
        title: 'Total Revenue',
        value: `$${totalRevenue.toLocaleString()}`,
        change: '+12.5%',
        trend: 'up',
        icon: Euro,
        color: 'blue'
      },
      {
        title: 'Total Expenses',
        value: `$${totalExpenses.toLocaleString()}`,
        change: '-3.2%',
        trend: 'down',
        icon: CreditCard,
        color: 'red'
      },
      {
        title: 'Pending Invoices',
        value: `$${pendingInvoices.toLocaleString()}`,
        change: `${invoices.filter(i => i.status === 'pending').length} invoices`,
        trend: 'neutral',
        icon: Receipt,
        color: 'blue'
      },
      {
        title: 'Monthly Recurring',
        value: `$${monthlyRecurring.toLocaleString()}`,
        change: `${subscriptions.filter(s => s.status === 'active').length} active`,
        trend: 'up',
        icon: TrendingUp,
        color: 'cyan'
      }
    ];

    return { totalRevenue, totalExpenses, pendingInvoices, monthlyRecurring, metrics };
  }, [invoices, expenses, subscriptions]);

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      red: 'bg-red-500/10 text-red-400 border-red-500/20',
      cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    };
    return colors[color] || colors.blue;
  };

  // Memoize permission checks - only compute when permissions are loaded
  const { canView, canCreate, canExport } = useMemo(() => {
    // Return false for all permissions while loading to avoid unnecessary re-computations
    if (permLoading) {
      return { canView: false, canCreate: false, canExport: false };
    }
    return {
      canView: hasPermission('finance.view'),
      canCreate: hasPermission('finance.create'),
      canExport: hasPermission('finance.export')
    };
  }, [hasPermission, permLoading]);

  if (loading || permLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <div className="text-red-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400">You don't have permission to view finance data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">

      <div className="w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <PageHeader
          icon={Euro}
          title="Finance"
          subtitle="Track revenue, expenses, and financial metrics"
          color="amber"
          actions={
            <div className="flex gap-3">
              {canExport && (
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => alert('Export coming soon!')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              {canCreate && (
                <Button className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30" onClick={() => setShowInvoiceModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Transaction
                </Button>
              )}
            </div>
          }
        />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${getColorClasses(metric.color)}`}>
                    <metric.icon className="w-4 h-4" />
                  </div>
                  {metric.trend === 'up' && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      {metric.change}
                    </Badge>
                  )}
                  {metric.trend === 'down' && (
                    <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-500/10">
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                      {metric.change}
                    </Badge>
                  )}
                  {metric.trend === 'neutral' && (
                    <Badge variant="outline" className="text-zinc-400 border-zinc-500/30">
                      {metric.change}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{metric.value}</p>
                  <p className="text-xs text-zinc-500">{metric.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800">
            <PieChart className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-zinc-800">
            <Receipt className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-zinc-800">
            <CreditCard className="w-4 h-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-zinc-800">
            <BadgeEuro className="w-4 h-4 mr-2" />
            Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Chart Placeholder */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Revenue Over Time</CardTitle>
                <CardDescription>Monthly revenue trend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center border border-dashed border-zinc-700 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500">Chart will appear when data is available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Expense Breakdown</CardTitle>
                <CardDescription>Expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center border border-dashed border-zinc-700 rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500">Chart will appear when data is available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Invoices</CardTitle>
                  <CardDescription>{invoices.length} total invoices</CardDescription>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowInvoiceModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-white mb-2">No invoices yet</h3>
                  <p className="text-xs text-zinc-500 mb-3">Create your first invoice to start tracking revenue</p>
                  <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowInvoiceModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg">
                          <FileText className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`}</p>
                          <p className="text-xs text-zinc-500">{invoice.client_name || 'Unknown Client'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">${(invoice.total || 0).toLocaleString()}</p>
                        <Badge variant="outline" className={
                          invoice.status === 'paid' ? 'text-amber-400 border-amber-500/30' :
                          invoice.status === 'overdue' ? 'text-red-400 border-red-500/30' :
                          'text-amber-400 border-amber-500/30'
                        }>
                          {invoice.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Expenses</CardTitle>
                  <CardDescription>{expenses.length} total expenses</CardDescription>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowExpenseModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-white mb-2">No expenses recorded</h3>
                  <p className="text-xs text-zinc-500 mb-3">Track your business expenses here</p>
                  <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowExpenseModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-red-500/10 rounded-lg">
                          <CreditCard className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{expense.description || 'Expense'}</p>
                          <p className="text-xs text-zinc-500">{expense.category || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-400">-${(expense.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">{expense.date || 'No date'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Subscriptions</CardTitle>
                  <CardDescription>{subscriptions.length} active subscriptions</CardDescription>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowSubscriptionModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subscription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <BadgeEuro className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-white mb-2">No subscriptions</h3>
                  <p className="text-xs text-zinc-500 mb-3">Track recurring revenue from subscriptions</p>
                  <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowSubscriptionModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                          <BadgeEuro className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{sub.name || 'Subscription'}</p>
                          <p className="text-xs text-zinc-500">{sub.billing_cycle || 'Monthly'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-cyan-400">${(sub.amount || 0).toLocaleString()}/mo</p>
                        <Badge variant="outline" className={
                          sub.status === 'active' ? 'text-amber-400 border-amber-500/30' :
                          'text-zinc-400 border-zinc-500/30'
                        }>
                          {sub.status || 'active'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Invoice Modal */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Create Invoice">
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <Label htmlFor="client_name" className="text-zinc-300">Client Name *</Label>
            <Input
              id="client_name"
              name="client_name"
              required
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="Enter client name"
            />
          </div>
          <div>
            <Label htmlFor="client_email" className="text-zinc-300">Client Email</Label>
            <Input
              id="client_email"
              name="client_email"
              type="email"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="client@example.com"
            />
          </div>
          <div>
            <Label htmlFor="amount" className="text-zinc-300">Amount *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              required
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="due_date" className="text-zinc-300">Due Date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-zinc-300">Description</Label>
            <Input
              id="description"
              name="description"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="Invoice description"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowInvoiceModal(false)} className="flex-1 border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600">
              {saving ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Add Expense">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <Label htmlFor="exp_description" className="text-zinc-300">Description *</Label>
            <Input
              id="exp_description"
              name="description"
              required
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="What was this expense for?"
            />
          </div>
          <div>
            <Label htmlFor="exp_amount" className="text-zinc-300">Amount *</Label>
            <Input
              id="exp_amount"
              name="amount"
              type="number"
              step="0.01"
              required
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-zinc-300">Category</Label>
            <select
              id="category"
              name="category"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2"
            >
              <option value="software">Software & Tools</option>
              <option value="marketing">Marketing</option>
              <option value="office">Office & Equipment</option>
              <option value="travel">Travel</option>
              <option value="salary">Salaries</option>
              <option value="contractors">Contractors</option>
              <option value="utilities">Utilities</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="vendor" className="text-zinc-300">Vendor</Label>
            <Input
              id="vendor"
              name="vendor"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="Vendor name"
            />
          </div>
          <div>
            <Label htmlFor="exp_date" className="text-zinc-300">Date</Label>
            <Input
              id="exp_date"
              name="date"
              type="date"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)} className="flex-1 border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600">
              {saving ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subscription Modal */}
      <Modal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} title="Add Subscription">
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <div>
            <Label htmlFor="sub_name" className="text-zinc-300">Subscription Name *</Label>
            <Input
              id="sub_name"
              name="name"
              required
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="e.g., Slack, AWS, Figma"
            />
          </div>
          <div>
            <Label htmlFor="sub_amount" className="text-zinc-300">Amount *</Label>
            <Input
              id="sub_amount"
              name="amount"
              type="number"
              step="0.01"
              required
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="billing_cycle" className="text-zinc-300">Billing Cycle</Label>
            <select
              id="billing_cycle"
              name="billing_cycle"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <Label htmlFor="next_billing_date" className="text-zinc-300">Next Billing Date</Label>
            <Input
              id="next_billing_date"
              name="next_billing_date"
              type="date"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sub_description" className="text-zinc-300">Description</Label>
            <Input
              id="sub_description"
              name="description"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              placeholder="What's this subscription for?"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowSubscriptionModal(false)} className="flex-1 border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-amber-500 hover:bg-amber-600">
              {saving ? 'Adding...' : 'Add Subscription'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
