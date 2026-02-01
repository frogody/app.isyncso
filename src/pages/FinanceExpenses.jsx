import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, Search, Filter, Download, Calendar, Tag, Building,
  MoreVertical, Edit2, Trash2, X, ChevronDown, ArrowUpDown, Receipt,
  TrendingUp, TrendingDown, Wallet, PieChart, FileText, Upload, Check,
  Sun, Moon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { usePermissions } from '@/components/context/PermissionContext';
import { useUser } from '@/components/context/UserContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useFinanceTheme } from '@/contexts/FinanceThemeContext';
import { FinancePageTransition } from '@/components/finance/ui/FinancePageTransition';

const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'Software & Tools', color: 'amber', icon: '💻' },
  { value: 'marketing', label: 'Marketing', color: 'amber', icon: '📣' },
  { value: 'office', label: 'Office & Equipment', color: 'amber', icon: '🏢' },
  { value: 'travel', label: 'Travel', color: 'amber', icon: '✈️' },
  { value: 'salary', label: 'Salaries', color: 'amber', icon: '👥' },
  { value: 'contractors', label: 'Contractors', color: 'amber', icon: '🤝' },
  { value: 'utilities', label: 'Utilities', color: 'amber', icon: '⚡' },
  { value: 'insurance', label: 'Insurance', color: 'amber', icon: '🛡️' },
  { value: 'legal', label: 'Legal & Professional', color: 'amber', icon: '⚖️' },
  { value: 'other', label: 'Other', color: 'zinc', icon: '📦' }
];

export default function FinanceExpenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useFinanceTheme();

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'software',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    receipt_url: '',
    is_recurring: false,
    tax_deductible: false
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await db.entities.Expense?.list?.({ limit: 500 }).catch(() => []) || [];
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(exp =>
        (exp.description || '').toLowerCase().includes(query) ||
        (exp.vendor || '').toLowerCase().includes(query) ||
        (exp.category || '').toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(exp => exp.category === categoryFilter);
    }

    // Filter by date range
    const now = new Date();
    if (dateRange === 'today') {
      const today = now.toISOString().split('T')[0];
      result = result.filter(exp => exp.date === today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      result = result.filter(exp => new Date(exp.date) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      result = result.filter(exp => new Date(exp.date) >= monthAgo);
    } else if (dateRange === 'year') {
      const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      result = result.filter(exp => new Date(exp.date) >= yearAgo);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0);
          break;
        case 'amount':
          comparison = (b.amount || 0) - (a.amount || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'vendor':
          comparison = (a.vendor || '').localeCompare(b.vendor || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [expenses, searchQuery, categoryFilter, dateRange, sortBy, sortOrder]);

  // Calculate stats and category breakdown
  const { stats, categoryBreakdown, monthlyTrend } = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // This month vs last month
    const now = new Date();
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date || e.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, e) => sum + (e.amount || 0), 0);

    const lastMonth = expenses.filter(e => {
      const d = new Date(e.date || e.created_at);
      const lastM = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getMonth() === lastM.getMonth() && d.getFullYear() === lastM.getFullYear();
    }).reduce((sum, e) => sum + (e.amount || 0), 0);

    const percentChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;

    // Category breakdown
    const byCategory = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (exp.amount || 0);
    });

    const categoryBreakdown = Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total * 100).toFixed(1) : 0,
        config: EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      stats: { total, thisMonth, lastMonth, percentChange, count: expenses.length },
      categoryBreakdown,
      monthlyTrend: thisMonth > lastMonth ? 'up' : thisMonth < lastMonth ? 'down' : 'stable'
    };
  }, [expenses]);

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'software',
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      receipt_url: '',
      is_recurring: false,
      tax_deductible: false
    });
    setEditMode(false);
    setSelectedExpense(null);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();

    // Validate user is authenticated
    if (!user?.id) {
      toast.error('You must be logged in to add expenses');
      return;
    }

    setSaving(true);
    try {
      const expenseData = {
        user_id: user.id, // Use user from context (guaranteed to exist)
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        category: formData.category,
        vendor: formData.vendor,
        date: formData.date,
        notes: formData.notes,
        receipt_url: formData.receipt_url,
        is_recurring: formData.is_recurring,
        tax_deductible: formData.tax_deductible
      };

      if (editMode && selectedExpense) {
        await db.entities.Expense.update(selectedExpense.id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        const newExpense = await db.entities.Expense.create(expenseData);
        setExpenses(prev => [newExpense, ...prev]);
        toast.success('Expense added successfully');
      }

      setShowCreateModal(false);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await db.entities.Expense.delete(expense.id);
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
      toast.success('Expense deleted');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const openEditModal = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      category: expense.category || 'other',
      vendor: expense.vendor || '',
      date: expense.date || new Date().toISOString().split('T')[0],
      notes: expense.notes || '',
      receipt_url: expense.receipt_url || '',
      is_recurring: expense.is_recurring || false,
      tax_deductible: expense.tax_deductible || false
    });
    setEditMode(true);
    setShowCreateModal(true);
  };

  const getCategoryConfig = (category) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  };

  const canCreate = useMemo(() => {
    if (permLoading) return false;
    return hasPermission('finance.create');
  }, [hasPermission, permLoading]);

  if (loading || permLoading) {
    return (
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>

        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <PageHeader
                icon={CreditCard}
                title="Expenses"
                subtitle="Track and categorize your business expenses"
                color="amber"
                actions={
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className={ft('text-slate-500 hover:bg-slate-200', 'text-zinc-400 hover:bg-zinc-800')}
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600 hover:bg-slate-100', 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    {canCreate && (
                      <Button
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Total Expenses</span>
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>${stats.total.toLocaleString()}</p>
                <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{stats.count} expenses</p>
              </CardContent>
            </Card>

            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>This Month</span>
                  {monthlyTrend === 'up' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>${stats.thisMonth.toLocaleString()}</p>
                <p className={`text-[10px] text-amber-400`}>
                  {stats.percentChange > 0 ? '+' : ''}{stats.percentChange}% vs last month
                </p>
              </CardContent>
            </Card>

            <Card className={`${ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')} md:col-span-2`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Top Categories</span>
                  <PieChart className={`w-3.5 h-3.5 ${ft('text-slate-400', 'text-zinc-400')}`} />
                </div>
                <div className="flex gap-3">
                  {categoryBreakdown.slice(0, 3).map((cat) => (
                    <div key={cat.category} className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{cat.config.icon}</span>
                        <span className={`text-[10px] ${ft('text-slate-500', 'text-zinc-400')} capitalize`}>{cat.config.label}</span>
                      </div>
                      <p className={`text-xs font-medium ${ft('text-slate-900', 'text-white')}`}>${cat.amount.toLocaleString()}</p>
                      <Progress value={parseFloat(cat.percentage)} className={`h-0.5 mt-1 ${ft('bg-slate-200', 'bg-zinc-800')}`} indicatorClassName="bg-amber-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                  <Input
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Tag className="w-4 h-4 mr-2" />
                      {categoryFilter === 'all' ? 'All Categories' : getCategoryConfig(categoryFilter).label}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={`${ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')} max-h-64 overflow-y-auto`}>
                    <DropdownMenuItem
                      onClick={() => setCategoryFilter('all')}
                      className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                    >
                      All Categories
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <DropdownMenuItem
                        key={cat.value}
                        onClick={() => setCategoryFilter(cat.value)}
                        className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                      >
                        <span className="mr-2">{cat.icon}</span>
                        {cat.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      {dateRange === 'all' ? 'All Time' : dateRange}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                    {[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' },
                      { value: 'year', label: 'This Year' }
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setDateRange(option.value)}
                        className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                      >
                        {option.label}
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
                      { value: 'category', label: 'Category' },
                      { value: 'vendor', label: 'Vendor' }
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

          {/* Expense List */}
          <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-16">
                  <CreditCard className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>No expenses found</h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6`}>
                    {searchQuery || categoryFilter !== 'all' || dateRange !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Start tracking your business expenses'}
                  </p>
                  {canCreate && !searchQuery && categoryFilter === 'all' && (
                    <Button
                      className="bg-amber-500 hover:bg-amber-600"
                      onClick={() => { resetForm(); setShowCreateModal(true); }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  )}
                </div>
              ) : (
                <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                  {filteredExpenses.map((expense) => {
                    const catConfig = getCategoryConfig(expense.category);
                    return (
                      <div
                        key={expense.id}
                        className={`px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`p-1.5 rounded-lg bg-${catConfig.color}-500/10`}>
                              <span className="text-base">{catConfig.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate`}>
                                  {expense.description || 'Untitled Expense'}
                                </p>
                                <Badge variant="outline" size="xs" className={ft('text-slate-500 border-slate-300', 'text-zinc-400 border-zinc-600')}>
                                  {catConfig.label}
                                </Badge>
                                {expense.tax_deductible && (
                                  <Badge variant="outline" size="xs" className="text-amber-400 border-amber-500/30">
                                    Tax Deductible
                                  </Badge>
                                )}
                              </div>
                              <div className={`flex items-center gap-3 mt-0.5 text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                                {expense.vendor && (
                                  <span className="flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    {expense.vendor}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-amber-400">
                              -${(expense.amount || 0).toLocaleString()}
                            </p>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className={ft('text-slate-400 hover:text-slate-900', 'text-zinc-400 hover:text-white')}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(expense)}
                                  className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {expense.receipt_url && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(expense.receipt_url, '_blank')}
                                    className={ft('text-slate-600 hover:bg-slate-100', 'text-zinc-300 hover:bg-zinc-800')}
                                  >
                                    <Receipt className="w-4 h-4 mr-2" />
                                    View Receipt
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteExpense(expense)}
                                  className={ft('text-red-500 hover:bg-slate-100', 'text-red-400 hover:bg-zinc-800')}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Expense Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-lg max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editMode ? 'Update expense details' : 'Record a new business expense'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Description *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="What was this expense for?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={ft('text-slate-600', 'text-zinc-300')}>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label className={ft('text-slate-600', 'text-zinc-300')}>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  />
                </div>
              </div>

              <div>
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')} rounded-md px-3 py-2`}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Vendor</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="Vendor or merchant name"
                />
              </div>

              <div>
                <Label className={ft('text-slate-600', 'text-zinc-300')}>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className={`${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')} mt-1`}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tax_deductible}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_deductible: e.target.checked }))}
                    className={`rounded ${ft('border-slate-300 bg-slate-100', 'border-zinc-600 bg-zinc-800')} text-amber-500`}
                  />
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>Tax Deductible</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                    className={`rounded ${ft('border-slate-300 bg-slate-100', 'border-zinc-600 bg-zinc-800')} text-amber-500`}
                  />
                  <span className={`text-sm ${ft('text-slate-600', 'text-zinc-300')}`}>Recurring Expense</span>
                </label>
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
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {saving ? 'Saving...' : (editMode ? 'Update Expense' : 'Add Expense')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FinancePageTransition>
  );
}
