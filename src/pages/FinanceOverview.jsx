import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import anime from 'animejs';
import { prefersReducedMotion } from '@/lib/animations';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt,
  PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Plus,
  Download, Calendar, FileText, CircleDollarSign, ChevronRight,
  Wallet, Target, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '@/components/context/PermissionContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { createPageUrl } from '@/utils';

export default function FinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const { hasPermission, isLoading: permLoading } = usePermissions();

  // Refs for anime.js animations
  const statsGridRef = useRef(null);
  const cardsGridRef = useRef(null);

  // Animate stat cards on load
  useEffect(() => {
    if (loading || !statsGridRef.current || prefersReducedMotion()) return;

    const cards = statsGridRef.current.querySelectorAll('.stat-card');
    if (cards.length === 0) return;

    // Set initial state
    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
    });

    // Staggered entrance animation
    anime({
      targets: cards,
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(70, { start: 100 }),
      duration: 500,
      easing: 'easeOutQuart',
    });

    // Count up animation for stat values
    const statValues = statsGridRef.current.querySelectorAll('.stat-number');
    statValues.forEach(el => {
      const endValue = parseFloat(el.dataset.value) || 0;
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';

      const obj = { value: 0 };
      anime({
        targets: obj,
        value: endValue,
        round: 1,
        duration: 1200,
        delay: 200,
        easing: 'easeOutExpo',
        update: () => {
          el.textContent = prefix + obj.value.toLocaleString() + suffix;
        },
      });
    });
  }, [loading]);

  // Animate content cards
  useEffect(() => {
    if (loading || !cardsGridRef.current || prefersReducedMotion()) return;

    const cards = cardsGridRef.current.querySelectorAll('.content-card');
    if (cards.length === 0) return;

    // Set initial state
    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px) scale(0.97)';
    });

    // Staggered entrance animation
    anime({
      targets: cards,
      translateY: [30, 0],
      scale: [0.97, 1],
      opacity: [0, 1],
      delay: anime.stagger(100, { start: 400 }),
      duration: 600,
      easing: 'easeOutQuart',
    });
  }, [loading]);

  useEffect(() => {
    let isMounted = true;

    const loadFinanceData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        const [expensesData, invoicesData, subscriptionsData] = await Promise.all([
          base44.entities.Expense?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([]),
          base44.entities.Invoice?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([]),
          base44.entities.Subscription?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([])
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

  // Calculate metrics
  const metrics = useMemo(() => {
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

    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0;

    return {
      totalRevenue,
      totalExpenses,
      pendingInvoices,
      monthlyRecurring,
      netIncome,
      profitMargin,
      pendingCount: invoices.filter(i => i.status === 'pending').length,
      activeSubscriptions: subscriptions.filter(s => s.status === 'active').length
    };
  }, [invoices, expenses, subscriptions]);

  // Expense breakdown by category
  const expensesByCategory = useMemo(() => {
    const categories = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'other';
      categories[cat] = (categories[cat] || 0) + (exp.amount || 0);
    });
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    const allTransactions = [
      ...invoices.map(i => ({ ...i, type: 'invoice', date: i.created_at })),
      ...expenses.map(e => ({ ...e, type: 'expense', date: e.date || e.created_at }))
    ];
    return allTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [invoices, expenses]);

  const canView = useMemo(() => {
    if (permLoading) return false;
    return hasPermission('finance.view');
  }, [hasPermission, permLoading]);

  const getColorClasses = (color) => {
    const colors = {
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      red: 'bg-red-500/10 text-red-400 border-red-500/20',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    };
    return colors[color] || colors.amber;
  };

  const getCategoryColor = (category) => {
    const colors = {
      software: 'bg-indigo-500',
      marketing: 'bg-pink-500',
      office: 'bg-amber-500',
      travel: 'bg-amber-500',
      salary: 'bg-amber-500',
      contractors: 'bg-purple-500',
      utilities: 'bg-orange-500',
      other: 'bg-zinc-500'
    };
    return colors[category] || colors.other;
  };

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
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400">You don't have permission to view finance data.</p>
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
          icon={DollarSign}
          title="Finance Overview"
          subtitle="Track revenue, expenses, and financial health"
          color="amber"
          actions={
            <div className="flex gap-3">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          }
        />

        {/* Key Metrics Grid */}
        <div ref={statsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Revenue', value: metrics.totalRevenue, displayValue: `$${metrics.totalRevenue.toLocaleString()}`, change: '+12.5%', trend: 'up', icon: DollarSign, color: 'amber' },
            { title: 'Total Expenses', value: metrics.totalExpenses, displayValue: `$${metrics.totalExpenses.toLocaleString()}`, change: '-3.2%', trend: 'down', icon: CreditCard, color: 'red' },
            { title: 'Pending Invoices', value: metrics.pendingInvoices, displayValue: `$${metrics.pendingInvoices.toLocaleString()}`, change: `${metrics.pendingCount} invoices`, trend: 'neutral', icon: Receipt, color: 'orange' },
            { title: 'Monthly Recurring', value: metrics.monthlyRecurring, displayValue: `$${metrics.monthlyRecurring.toLocaleString()}`, change: `${metrics.activeSubscriptions} active`, trend: 'up', icon: TrendingUp, color: 'amber' }
          ].map((metric, index) => (
            <div key={metric.title} className="stat-card">
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${getColorClasses(metric.color)}`}>
                      <metric.icon className="w-5 h-5" />
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
                  <p className="stat-number text-2xl font-bold text-white" data-value={metric.value} data-prefix="$">{metric.displayValue}</p>
                  <p className="text-sm text-zinc-500">{metric.title}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Profit Overview */}
        <Card className="bg-gradient-to-r from-amber-950/30 to-amber-950/30 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Net Income</p>
                <p className={`text-3xl font-bold ${metrics.netIncome >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {metrics.netIncome >= 0 ? '+' : ''}{metrics.netIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-sm mb-1">Profit Margin</p>
                <p className={`text-2xl font-bold ${metrics.profitMargin >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {metrics.profitMargin}%
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={Math.max(0, Math.min(100, Number(metrics.profitMargin)))}
                className="h-2 bg-zinc-800"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expense Breakdown */}
          <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-400" />
                Expense Breakdown
              </CardTitle>
              <CardDescription>By category</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No expenses recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expensesByCategory.slice(0, 5).map((cat, index) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(cat.name)}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300 capitalize">{cat.name}</span>
                          <span className="text-white font-medium">${cat.amount.toLocaleString()}</span>
                        </div>
                        <Progress
                          value={(cat.amount / metrics.totalExpenses) * 100}
                          className="h-1.5 mt-1 bg-zinc-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link to={createPageUrl('FinanceExpenses')}>
                <Button variant="ghost" className="w-full mt-4 text-amber-400 hover:bg-amber-500/10">
                  View All Expenses
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Latest financial activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((transaction, index) => (
                    <div key={`${transaction.type}-${transaction.id}`} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${transaction.type === 'invoice' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                          {transaction.type === 'invoice' ? (
                            <FileText className="w-4 h-4 text-amber-400" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {transaction.type === 'invoice'
                              ? (transaction.client_name || transaction.invoice_number || 'Invoice')
                              : (transaction.description || 'Expense')}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${transaction.type === 'invoice' ? 'text-amber-400' : 'text-red-400'}`}>
                        {transaction.type === 'invoice' ? '+' : '-'}${(transaction.total || transaction.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to={createPageUrl('FinanceInvoices')}>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <Receipt className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">Invoices</h3>
                  <p className="text-sm text-zinc-500">{invoices.length} total</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('FinanceExpenses')}>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-red-500/30 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                  <CreditCard className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">Expenses</h3>
                  <p className="text-sm text-zinc-500">{expenses.length} recorded</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('FinanceSubscriptions')}>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                  <CircleDollarSign className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">Subscriptions</h3>
                  <p className="text-sm text-zinc-500">{metrics.activeSubscriptions} active</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
