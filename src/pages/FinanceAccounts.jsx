import React, { useState, useEffect, useMemo } from 'react';
import { db, supabase } from '@/api/supabaseClient';
import { Account, AccountType } from '@/api/entities';
import {
  BookOpen, Plus, Search, Filter, Download, ChevronRight, ChevronDown,
  MoreVertical, Edit2, Trash2, Sun, Moon, Layers, ToggleLeft, ToggleRight,
  AlertCircle, Landmark, TrendingUp, Scale, DollarSign, ArrowUpDown,
  Eye, RefreshCw
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

const ACCOUNT_TYPE_CONFIG = {
  Asset:     { color: 'blue',   icon: Landmark,   order: 1 },
  Liability: { color: 'amber',  icon: Scale,      order: 2 },
  Equity:    { color: 'purple', icon: Layers,      order: 3 },
  Revenue:   { color: 'green',  icon: TrendingUp,  order: 4 },
  Expense:   { color: 'red',    icon: DollarSign,  order: 5 },
};

const TYPE_BADGE_CLASSES = {
  Asset:     'text-blue-400 border-blue-500/30 bg-blue-500/10',
  Liability: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  Equity:    'text-purple-400 border-purple-500/30 bg-purple-500/10',
  Revenue:   'text-green-400 border-green-500/30 bg-green-500/10',
  Expense:   'text-red-400 border-red-500/30 bg-red-500/10',
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'SEK', 'NOK', 'DKK'];

function formatCurrency(amount, currency = 'EUR') {
  const num = parseFloat(amount) || 0;
  const symbols = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ', JPY: '¥' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinanceAccounts() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('code');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const { hasPermission, isLoading: permLoading } = usePermissions();
  const { user } = useUser();
  const { theme, toggleTheme, ft } = useTheme();

  const defaultFormData = {
    code: '',
    name: '',
    description: '',
    account_type_id: '',
    parent_id: '',
    currency: 'EUR',
    opening_balance: '0',
    is_active: true,
  };
  const [formData, setFormData] = useState(defaultFormData);

  const canView = useMemo(() => !permLoading && hasPermission('finance.view'), [hasPermission, permLoading]);
  const canCreate = useMemo(() => !permLoading && hasPermission('finance.create'), [hasPermission, permLoading]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [acctData, typeData] = await Promise.all([
        db.entities.Account?.list?.({ limit: 1000 }).catch(() => []),
        db.entities.AccountType?.list?.({ limit: 10 }).catch(() => []),
      ]);
      setAccounts(acctData || []);
      setAccountTypes((typeData || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const typeMap = useMemo(() => {
    const map = {};
    accountTypes.forEach(t => { map[t.id] = t; });
    return map;
  }, [accountTypes]);

  const getTypeName = (typeId) => typeMap[typeId]?.name || 'Unknown';

  // Build parent/child tree
  const accountTree = useMemo(() => {
    const byParent = {};
    accounts.forEach(a => {
      const pid = a.parent_id || 'root';
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push(a);
    });
    // Sort children by code
    Object.values(byParent).forEach(arr => arr.sort((a, b) => (a.code || '').localeCompare(b.code || '')));
    return byParent;
  }, [accounts]);

  // Filter and group
  const groupedAccounts = useMemo(() => {
    let filtered = [...accounts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        (a.code || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => getTypeName(a.account_type_id) === typeFilter);
    }
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(a => a.is_active === isActive);
    }

    // Group by type
    const groups = {};
    accountTypes.forEach(t => { groups[t.name] = []; });

    filtered.forEach(a => {
      const tName = getTypeName(a.account_type_id);
      if (!groups[tName]) groups[tName] = [];
      groups[tName].push(a);
    });

    // Sort within groups
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => {
        if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'balance') return (parseFloat(b.current_balance) || 0) - (parseFloat(a.current_balance) || 0);
        return 0;
      });
    });

    return groups;
  }, [accounts, accountTypes, searchQuery, typeFilter, statusFilter, sortBy, typeMap]);

  // Stats
  const stats = useMemo(() => {
    const active = accounts.filter(a => a.is_active);
    const totalAssets = accounts
      .filter(a => getTypeName(a.account_type_id) === 'Asset')
      .reduce((sum, a) => sum + (parseFloat(a.current_balance) || 0), 0);
    const totalLiabilities = accounts
      .filter(a => getTypeName(a.account_type_id) === 'Liability')
      .reduce((sum, a) => sum + (parseFloat(a.current_balance) || 0), 0);

    return {
      total: accounts.length,
      active: active.length,
      totalAssets,
      totalLiabilities,
      netEquity: totalAssets - totalLiabilities,
    };
  }, [accounts, typeMap]);

  const toggleSection = (typeName) => {
    setCollapsedSections(prev => ({ ...prev, [typeName]: !prev[typeName] }));
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditMode(false);
    setSelectedAccount(null);
  };

  const openEditModal = (account) => {
    setSelectedAccount(account);
    setFormData({
      code: account.code || '',
      name: account.name || '',
      description: account.description || '',
      account_type_id: account.account_type_id || '',
      parent_id: account.parent_id || '',
      currency: account.currency || 'EUR',
      opening_balance: (account.opening_balance || 0).toString(),
      is_active: account.is_active !== false,
    });
    setEditMode(true);
    setShowCreateModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.account_type_id) {
      toast.error('Code, name, and account type are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_id: user.company_id || user.organization_id,
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        account_type_id: formData.account_type_id,
        parent_id: formData.parent_id || null,
        currency: formData.currency,
        opening_balance: parseFloat(formData.opening_balance) || 0,
        is_active: formData.is_active,
      };

      if (editMode && selectedAccount) {
        await db.entities.Account.update(selectedAccount.id, payload);
        toast.success('Account updated');
      } else {
        payload.current_balance = payload.opening_balance;
        await db.entities.Account.create(payload);
        toast.success('Account created');
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving account:', error);
      const msg = error?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('An account with this code already exists');
      } else {
        toast.error('Failed to save account');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (account) => {
    if (account.is_system && account.is_active) {
      toast.error('Cannot deactivate a system account');
      return;
    }
    try {
      await db.entities.Account.update(account.id, { is_active: !account.is_active });
      toast.success(account.is_active ? 'Account deactivated' : 'Account reactivated');
      loadData();
    } catch (error) {
      console.error('Error toggling account:', error);
      toast.error('Failed to update account');
    }
  };

  const initializeCOA = async () => {
    setInitializing(true);
    try {
      const companyId = user.company_id || user.organization_id;
      const { error } = await supabase.rpc('create_default_chart_of_accounts', {
        p_company_id: companyId,
      });
      if (error) throw error;
      toast.success('Chart of Accounts initialized with default accounts');
      loadData();
    } catch (error) {
      console.error('Error initializing COA:', error);
      toast.error('Failed to initialize Chart of Accounts');
    } finally {
      setInitializing(false);
    }
  };

  // Determine indent level for sub-accounts
  const getIndentLevel = (account) => {
    let level = 0;
    let current = account;
    const visited = new Set();
    while (current?.parent_id && !visited.has(current.parent_id)) {
      visited.add(current.parent_id);
      current = accounts.find(a => a.id === current.parent_id);
      if (current) level++;
    }
    return level;
  };

  // Possible parents for the form (same type, not self, not children of self)
  const possibleParents = useMemo(() => {
    if (!formData.account_type_id) return [];
    return accounts.filter(a =>
      a.account_type_id === formData.account_type_id &&
      a.is_active &&
      (!selectedAccount || a.id !== selectedAccount.id)
    );
  }, [accounts, formData.account_type_id, selectedAccount]);

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
        <p className={ft('text-slate-500', 'text-zinc-400')}>
          You don't have permission to view accounts.
        </p>
      </div>
    );
  }

  const hasAccounts = accounts.length > 0;

  return (
    <FinancePageTransition>
      <div className={`min-h-screen ${ft('bg-slate-50', 'bg-black')}`}>
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          {/* Header */}
          <PageHeader
            icon={BookOpen}
            title="Chart of Accounts"
            subtitle="Manage your general ledger accounts"
            color="blue"
            actions={
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                  onClick={() => { toast.info('Export coming soon'); }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                {canCreate && (
                  <Button
                    className={ft(
                      'bg-blue-600 hover:bg-blue-700 text-white',
                      'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    )}
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                  </Button>
                )}
              </div>
            }
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Total Accounts</span>
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className={`text-lg font-bold ${ft('text-slate-900', 'text-white')}`}>{stats.total}</p>
                <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>{stats.active} active</p>
              </CardContent>
            </Card>
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Total Assets</span>
                  <Landmark className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className={`text-lg font-bold text-blue-400`}>{formatCurrency(stats.totalAssets)}</p>
                <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>All asset accounts</p>
              </CardContent>
            </Card>
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Total Liabilities</span>
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className={`text-lg font-bold text-amber-400`}>{formatCurrency(stats.totalLiabilities)}</p>
                <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>All liability accounts</p>
              </CardContent>
            </Card>
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${ft('text-slate-500', 'text-zinc-400')}`}>Net Equity</span>
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                </div>
                <p className={`text-lg font-bold ${stats.netEquity >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(stats.netEquity)}
                </p>
                <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')}`}>Assets − Liabilities</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          {hasAccounts && (
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                    <Input
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-10 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                        <Filter className="w-4 h-4 mr-2" />
                        {typeFilter === 'all' ? 'All Types' : typeFilter}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                      <DropdownMenuItem onClick={() => setTypeFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                      {accountTypes.map(t => (
                        <DropdownMenuItem key={t.id} onClick={() => setTypeFilter(t.name)} className={ft('text-slate-600', 'text-zinc-300')}>
                          {t.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                        {statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Inactive'}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                      <DropdownMenuItem onClick={() => setStatusFilter('all')} className={ft('text-slate-600', 'text-zinc-300')}>All</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')} className={ft('text-slate-600', 'text-zinc-300')}>Active</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('inactive')} className={ft('text-slate-600', 'text-zinc-300')}>Inactive</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}>
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Sort: {sortBy === 'code' ? 'Code' : sortBy === 'name' ? 'Name' : 'Balance'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                      <DropdownMenuItem onClick={() => setSortBy('code')} className={ft('text-slate-600', 'text-zinc-300')}>Code</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('name')} className={ft('text-slate-600', 'text-zinc-300')}>Name</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('balance')} className={ft('text-slate-600', 'text-zinc-300')}>Balance</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!hasAccounts && (
            <Card className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
              <CardContent className="p-0">
                <div className="text-center py-16">
                  <BookOpen className={`w-16 h-16 ${ft('text-slate-300', 'text-zinc-600')} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${ft('text-slate-900', 'text-white')} mb-2`}>
                    No accounts yet
                  </h3>
                  <p className={`${ft('text-slate-400', 'text-zinc-500')} mb-6 max-w-md mx-auto`}>
                    Initialize your Chart of Accounts with a standard set of accounts, or create accounts manually.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {canCreate && (
                      <>
                        <Button
                          className={ft(
                            'bg-blue-600 hover:bg-blue-700 text-white',
                            'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          )}
                          onClick={initializeCOA}
                          disabled={initializing}
                        >
                          {initializing ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Layers className="w-4 h-4 mr-2" />
                          )}
                          {initializing ? 'Initializing...' : 'Initialize Default Accounts'}
                        </Button>
                        <Button
                          variant="outline"
                          className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                          onClick={() => { resetForm(); setShowCreateModal(true); }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Manually
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Groups */}
          {hasAccounts && Object.entries(groupedAccounts).map(([typeName, typeAccounts]) => {
            if (typeAccounts.length === 0 && typeFilter !== 'all') return null;
            const config = ACCOUNT_TYPE_CONFIG[typeName] || { color: 'zinc', icon: BookOpen };
            const TypeIcon = config.icon;
            const isCollapsed = collapsedSections[typeName];
            const typeTotal = typeAccounts.reduce((sum, a) => sum + (parseFloat(a.current_balance) || 0), 0);

            return (
              <Card key={typeName} className={ft('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800')}>
                {/* Section header */}
                <button
                  className={`w-full flex items-center justify-between p-3 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors rounded-t-lg`}
                  onClick={() => toggleSection(typeName)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 bg-${config.color}-500/10 rounded-lg`}>
                      <TypeIcon className={`w-4 h-4 text-${config.color}-400`} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${ft('text-slate-900', 'text-white')}`}>
                        {typeName}s
                      </p>
                      <p className={`text-xs ${ft('text-slate-400', 'text-zinc-500')}`}>
                        {typeAccounts.length} account{typeAccounts.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${ft('text-slate-700', 'text-zinc-300')}`}>
                      {formatCurrency(typeTotal)}
                    </span>
                    {isCollapsed
                      ? <ChevronRight className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                      : <ChevronDown className={`w-4 h-4 ${ft('text-slate-400', 'text-zinc-500')}`} />
                    }
                  </div>
                </button>

                {/* Account rows */}
                {!isCollapsed && (
                  <CardContent className="p-0">
                    {typeAccounts.length === 0 ? (
                      <div className={`px-3 py-6 text-center ${ft('text-slate-400', 'text-zinc-500')} text-sm`}>
                        No {typeName.toLowerCase()} accounts {searchQuery ? 'match your search' : 'yet'}
                      </div>
                    ) : (
                      <div className={`divide-y ${ft('divide-slate-100', 'divide-zinc-800')}`}>
                        {/* Column header */}
                        <div className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider ${ft('text-slate-400 bg-slate-50', 'text-zinc-500 bg-zinc-800/30')}`}>
                          <div className="col-span-2">Code</div>
                          <div className="col-span-4">Account Name</div>
                          <div className="col-span-2">Type</div>
                          <div className="col-span-2 text-right">Balance</div>
                          <div className="col-span-1 text-center">Status</div>
                          <div className="col-span-1 text-right">Actions</div>
                        </div>
                        {typeAccounts.map((account) => {
                          const indent = getIndentLevel(account);
                          const balance = parseFloat(account.current_balance) || 0;
                          const tName = getTypeName(account.account_type_id);
                          const balanceColor =
                            tName === 'Asset' || tName === 'Revenue' ? 'text-blue-400' :
                            tName === 'Expense' ? 'text-red-400' :
                            tName === 'Liability' ? 'text-amber-400' : 'text-purple-400';

                          return (
                            <div
                              key={account.id}
                              className={`grid grid-cols-12 gap-2 items-center px-3 py-2 ${ft('hover:bg-slate-50', 'hover:bg-white/[0.03]')} transition-colors ${!account.is_active ? 'opacity-50' : ''}`}
                            >
                              <div className="col-span-2">
                                <span className={`text-xs font-mono ${ft('text-slate-600', 'text-zinc-300')}`}>
                                  {account.code}
                                </span>
                              </div>
                              <div className="col-span-4 flex items-center">
                                {indent > 0 && (
                                  <span className="inline-block" style={{ width: indent * 20 }} />
                                )}
                                {indent > 0 && (
                                  <span className={`mr-1.5 text-xs ${ft('text-slate-300', 'text-zinc-600')}`}>└</span>
                                )}
                                <div>
                                  <p className={`text-sm font-medium ${ft('text-slate-900', 'text-white')} truncate`}>
                                    {account.name}
                                  </p>
                                  {account.description && (
                                    <p className={`text-[10px] ${ft('text-slate-400', 'text-zinc-500')} truncate max-w-[200px]`}>
                                      {account.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <Badge variant="outline" className={TYPE_BADGE_CLASSES[tName] || ''}>
                                  {tName}
                                </Badge>
                              </div>
                              <div className={`col-span-2 text-right text-sm font-medium ${balanceColor}`}>
                                {formatCurrency(balance, account.currency)}
                              </div>
                              <div className="col-span-1 text-center">
                                {account.is_active ? (
                                  <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 text-[10px]">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className={`${ft('text-slate-400 border-slate-300', 'text-zinc-500 border-zinc-600')} text-[10px]`}>
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-1 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className={ft('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}>
                                    <DropdownMenuItem onClick={() => openEditModal(account)} className={ft('text-slate-600', 'text-zinc-300')}>
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toggleActive(account)} className={ft('text-slate-600', 'text-zinc-300')}>
                                      {account.is_active ? (
                                        <><ToggleLeft className="w-4 h-4 mr-2" />Deactivate</>
                                      ) : (
                                        <><ToggleRight className="w-4 h-4 mr-2" />Reactivate</>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className={ft('bg-slate-200', 'bg-zinc-700')} />
                                    <DropdownMenuItem onClick={() => toast.info('Journal view coming soon')} className={ft('text-slate-600', 'text-zinc-300')}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Transactions
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Create / Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { if (!open) { setShowCreateModal(false); resetForm(); } else setShowCreateModal(true); }}>
          <DialogContent className={`${ft('bg-white border-slate-200 text-slate-900', 'bg-zinc-900 border-zinc-700 text-white')} max-w-lg max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Account' : 'New Account'}</DialogTitle>
              <DialogDescription className={ft('text-slate-500', 'text-zinc-400')}>
                {editMode ? 'Update account details' : 'Add a new account to your chart of accounts'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Code & Name row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Code *</Label>
                  <Input
                    placeholder="1050"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className={`mt-1 font-mono ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Name *</Label>
                  <Input
                    placeholder="Checking Account"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                />
              </div>

              {/* Account Type */}
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Account Type *</Label>
                <select
                  value={formData.account_type_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_type_id: e.target.value, parent_id: '' }))}
                  className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}
                  required
                >
                  <option value="">Select type...</option>
                  {accountTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.normal_balance} normal)</option>
                  ))}
                </select>
              </div>

              {/* Parent Account */}
              <div>
                <Label className={ft('text-slate-700', 'text-zinc-300')}>Parent Account</Label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                  className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}
                  disabled={!formData.account_type_id}
                >
                  <option value="">None (top-level)</option>
                  {possibleParents.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                {!formData.account_type_id && (
                  <p className={`text-[10px] mt-1 ${ft('text-slate-400', 'text-zinc-500')}`}>Select an account type first</p>
                )}
              </div>

              {/* Currency & Opening Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Currency</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className={`mt-1 w-full rounded-md px-3 py-2 text-sm ${ft('bg-slate-100 border border-slate-200 text-slate-900', 'bg-zinc-800 border border-zinc-700 text-white')}`}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={ft('text-slate-700', 'text-zinc-300')}>Opening Balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: e.target.value }))}
                    className={`mt-1 ${ft('bg-slate-100 border-slate-200 text-slate-900', 'bg-zinc-800 border-zinc-700 text-white')}`}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-zinc-600"
                />
                <Label htmlFor="is_active" className={ft('text-slate-700', 'text-zinc-300')}>Active</Label>
              </div>

              <DialogFooter className="gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className={ft('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-300')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}
                  className={ft('bg-blue-600 hover:bg-blue-700 text-white', 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30')}
                >
                  {saving ? 'Saving...' : (editMode ? 'Update Account' : 'Create Account')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FinancePageTransition>
  );
}
