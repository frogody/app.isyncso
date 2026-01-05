import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt,
  PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Plus,
  Filter, Download, Calendar, Building2, Users, FileText,
  Wallet, BanknoteIcon, CircleDollarSign, Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);

      const [expensesData, invoicesData, subscriptionsData] = await Promise.all([
        base44.entities.Expense?.filter({}) || [],
        base44.entities.Invoice?.filter({}) || [],
        base44.entities.Subscription?.filter({}) || []
      ]);

      setExpenses(expensesData || []);
      setInvoices(invoicesData || []);
      setSubscriptions(subscriptionsData || []);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary metrics
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
      icon: DollarSign,
      color: 'emerald'
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
      color: 'amber'
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

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      red: 'bg-red-500/10 text-red-400 border-red-500/20',
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    };
    return colors[color] || colors.emerald;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Finance
          </h1>
          <p className="text-zinc-400 mt-1">
            Track revenue, expenses, and financial metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-zinc-700 text-zinc-300">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${getColorClasses(metric.color)}`}>
                    <metric.icon className="w-5 h-5" />
                  </div>
                  {metric.trend === 'up' && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
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
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                  <p className="text-sm text-zinc-500">{metric.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <CircleDollarSign className="w-4 h-4 mr-2" />
            Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart Placeholder */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Revenue Over Time</CardTitle>
                <CardDescription>Monthly revenue trend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border border-dashed border-zinc-700 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
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
                <div className="h-64 flex items-center justify-center border border-dashed border-zinc-700 rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
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
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No invoices yet</h3>
                  <p className="text-zinc-500 mb-4">Create your first invoice to start tracking revenue</p>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <FileText className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{invoice.invoice_number || `INV-${invoice.id?.slice(0, 8)}`}</p>
                          <p className="text-sm text-zinc-500">{invoice.client_name || 'Unknown Client'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">${(invoice.total || 0).toLocaleString()}</p>
                        <Badge variant="outline" className={
                          invoice.status === 'paid' ? 'text-emerald-400 border-emerald-500/30' :
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
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No expenses recorded</h3>
                  <p className="text-zinc-500 mb-4">Track your business expenses here</p>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <CreditCard className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{expense.description || 'Expense'}</p>
                          <p className="text-sm text-zinc-500">{expense.category || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-400">-${(expense.amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-zinc-500">{expense.date || 'No date'}</p>
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
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subscription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <CircleDollarSign className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No subscriptions</h3>
                  <p className="text-zinc-500 mb-4">Track recurring revenue from subscriptions</p>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                          <CircleDollarSign className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{sub.name || 'Subscription'}</p>
                          <p className="text-sm text-zinc-500">{sub.billing_cycle || 'Monthly'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-cyan-400">${(sub.amount || 0).toLocaleString()}/mo</p>
                        <Badge variant="outline" className={
                          sub.status === 'active' ? 'text-emerald-400 border-emerald-500/30' :
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
  );
}
