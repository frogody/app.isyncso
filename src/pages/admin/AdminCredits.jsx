import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Settings,
  History,
  Users,
  Search,
  RefreshCw,
  Edit2,
  Save,
  X,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Linkedin,
  Zap,
  BarChart3,
  Image,
  Video,
  MessageSquare,
  Globe,
  Brain,
  ChevronDown,
  ChevronRight,
  Filter,
  Hash,
  Clock,
  Eye,
  EyeOff,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS = {
  ai: Brain,
  image: Image,
  video: Video,
  enrichment: Globe,
  chat: MessageSquare,
  research: Globe,
};

const CATEGORY_COLORS = {
  ai: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  image: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  video: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  enrichment: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  chat: 'bg-green-500/20 text-green-400 border-green-500/30',
  research: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const TIER_COLORS = {
  free: 'bg-zinc-500/20 text-zinc-400',
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-cyan-500/20 text-cyan-400',
  high: 'bg-amber-500/20 text-amber-400',
  premium: 'bg-red-500/20 text-red-400',
};

export default function AdminCredits() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview stats
  const [stats, setStats] = useState({
    totalCreditsIssued: 0,
    totalCreditsUsed: 0,
    activeUsers: 0,
    avgCreditsPerUser: 0,
  });

  // Action costs from credit_action_costs
  const [actionCosts, setActionCosts] = useState([]);
  const [actionCostsLoading, setActionCostsLoading] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [savingAction, setSavingAction] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [actionCategoryFilter, setActionCategoryFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [transactionFilters, setTransactionFilters] = useState({
    search: '',
    type: 'all',
    dateRange: '30',
    edgeFunction: 'all',
  });
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Usage analytics
  const [usageByAction, setUsageByAction] = useState([]);
  const [usageByFunction, setUsageByFunction] = useState([]);
  const [usageByUser, setUsageByUser] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageDays, setUsageDays] = useState('30');

  useEffect(() => {
    fetchOverviewStats();
    fetchActionCosts();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab, transactionFilters.type, transactionFilters.dateRange, transactionFilters.edgeFunction]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchUsageAnalytics();
  }, [activeTab, usageDays]);

  // ─── Fetchers ──────────────────────────────────────────────────────────────

  const fetchOverviewStats = async () => {
    try {
      const [issuedRes, usedRes, usersRes, avgRes] = await Promise.all([
        supabase.from('credit_transactions').select('amount').gt('amount', 0),
        supabase.from('credit_transactions').select('amount').lt('amount', 0),
        supabase.from('users').select('*', { count: 'exact', head: true }).gt('credits', 0),
        supabase.from('users').select('credits').gt('credits', 0),
      ]);

      const totalIssued = issuedRes.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalUsed = Math.abs(usedRes.data?.reduce((sum, t) => sum + t.amount, 0) || 0);
      const avgCredits = avgRes.data?.length
        ? Math.round(avgRes.data.reduce((sum, u) => sum + u.credits, 0) / avgRes.data.length)
        : 0;

      setStats({
        totalCreditsIssued: totalIssued,
        totalCreditsUsed: totalUsed,
        activeUsers: usersRes.count || 0,
        avgCreditsPerUser: avgCredits,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchActionCosts = async () => {
    setActionCostsLoading(true);
    const { data, error } = await supabase
      .from('credit_action_costs')
      .select('*')
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('[AdminCredits] credit_action_costs not available:', error.message);
    } else {
      setActionCosts(data || []);
      // Auto-expand all categories
      const cats = {};
      (data || []).forEach(a => { cats[a.category] = true; });
      setExpandedCategories(cats);
    }
    setActionCostsLoading(false);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      let query = supabase
        .from('credit_transactions')
        .select('*, users!credit_transactions_user_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (transactionFilters.dateRange !== 'all') {
        const days = parseInt(transactionFilters.dateRange);
        query = query.gte('created_at', subDays(new Date(), days).toISOString());
      }

      if (transactionFilters.type !== 'all') {
        query = query.eq('transaction_type', transactionFilters.type);
      }

      if (transactionFilters.edgeFunction !== 'all') {
        query = query.eq('edge_function', transactionFilters.edgeFunction);
      }

      const { data, error } = await query;

      if (error) {
        // Fallback without join if foreign key doesn't exist
        const fallback = await supabase
          .from('credit_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        let filtered = fallback.data || [];
        if (transactionFilters.search) {
          const s = transactionFilters.search.toLowerCase();
          filtered = filtered.filter(t =>
            t.description?.toLowerCase().includes(s) ||
            t.action_key?.toLowerCase().includes(s) ||
            t.edge_function?.toLowerCase().includes(s)
          );
        }
        setTransactions(filtered);
      } else {
        let filtered = data || [];
        if (transactionFilters.search) {
          const s = transactionFilters.search.toLowerCase();
          filtered = filtered.filter(t =>
            t.description?.toLowerCase().includes(s) ||
            t.action_key?.toLowerCase().includes(s) ||
            t.edge_function?.toLowerCase().includes(s) ||
            t.users?.full_name?.toLowerCase().includes(s) ||
            t.users?.email?.toLowerCase().includes(s)
          );
        }
        setTransactions(filtered);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setTransactionsLoading(false);
  };

  const fetchUsageAnalytics = async () => {
    setUsageLoading(true);
    try {
      const fromDate = subDays(new Date(), parseInt(usageDays)).toISOString();

      // Fetch all deductions in the period
      const { data: txns } = await supabase
        .from('credit_transactions')
        .select('action_key, edge_function, amount, user_id, created_at')
        .lt('amount', 0)
        .gte('created_at', fromDate);

      if (!txns) {
        setUsageByAction([]);
        setUsageByFunction([]);
        setUsageByUser([]);
        setUsageLoading(false);
        return;
      }

      // Group by action_key
      const byAction = {};
      txns.forEach(t => {
        const key = t.action_key || 'unknown';
        if (!byAction[key]) byAction[key] = { action_key: key, count: 0, total_credits: 0 };
        byAction[key].count++;
        byAction[key].total_credits += Math.abs(t.amount);
      });
      setUsageByAction(Object.values(byAction).sort((a, b) => b.total_credits - a.total_credits));

      // Group by edge_function
      const byFunc = {};
      txns.forEach(t => {
        const key = t.edge_function || 'unknown';
        if (!byFunc[key]) byFunc[key] = { edge_function: key, count: 0, total_credits: 0 };
        byFunc[key].count++;
        byFunc[key].total_credits += Math.abs(t.amount);
      });
      setUsageByFunction(Object.values(byFunc).sort((a, b) => b.total_credits - a.total_credits));

      // Group by user (top 20)
      const byUser = {};
      txns.forEach(t => {
        const key = t.user_id || 'unknown';
        if (!byUser[key]) byUser[key] = { user_id: key, count: 0, total_credits: 0 };
        byUser[key].count++;
        byUser[key].total_credits += Math.abs(t.amount);
      });
      const topUsers = Object.values(byUser).sort((a, b) => b.total_credits - a.total_credits).slice(0, 20);

      // Fetch user names for top users
      if (topUsers.length > 0) {
        const userIds = topUsers.map(u => u.user_id).filter(id => id !== 'unknown');
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds);

        const userMap = {};
        (userData || []).forEach(u => { userMap[u.id] = u; });
        topUsers.forEach(u => {
          const user = userMap[u.user_id];
          u.full_name = user?.full_name || 'Unknown';
          u.email = user?.email || '';
        });
      }
      setUsageByUser(topUsers);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
    setUsageLoading(false);
  };

  // ─── Action Cost Management ────────────────────────────────────────────────

  const handleUpdateActionCost = async (action) => {
    setSavingAction(true);
    try {
      const { error } = await supabase
        .from('credit_action_costs')
        .update({
          credits_required: action.credits_required,
          label: action.label,
          description: action.description,
          is_active: action.is_active,
          tier: action.tier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.id);

      if (error) throw error;
      toast.success(`Updated "${action.label}"`);
      setEditingAction(null);
      fetchActionCosts();
    } catch (error) {
      toast.error('Failed to update action cost', { description: error.message });
    }
    setSavingAction(false);
  };

  // ─── Grouped + Filtered action costs ───────────────────────────────────────

  const filteredActions = useMemo(() => {
    let filtered = actionCosts;
    if (actionCategoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === actionCategoryFilter);
    }
    if (actionSearch) {
      const s = actionSearch.toLowerCase();
      filtered = filtered.filter(a =>
        a.action_key?.toLowerCase().includes(s) ||
        a.label?.toLowerCase().includes(s) ||
        a.description?.toLowerCase().includes(s)
      );
    }
    return filtered;
  }, [actionCosts, actionCategoryFilter, actionSearch]);

  const groupedActions = useMemo(() => {
    const groups = {};
    filteredActions.forEach(a => {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    });
    return groups;
  }, [filteredActions]);

  const categories = useMemo(() => {
    const cats = new Set(actionCosts.map(a => a.category));
    return Array.from(cats).sort();
  }, [actionCosts]);

  // Unique edge functions for transaction filter
  const edgeFunctions = useMemo(() => {
    const fns = new Set(transactions.map(t => t.edge_function).filter(Boolean));
    return Array.from(fns).sort();
  }, [transactions]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ─── Stat Card ─────────────────────────────────────────────────────────────

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'cyan' }) => {
    const colorMap = {
      cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      green: 'bg-green-500/10 text-green-400 border-green-500/20',
      red: 'bg-red-500/10 text-red-400 border-red-500/20',
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    const cls = colorMap[color] || colorMap.cyan;

    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">{title}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center', cls)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Coins className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Credits & API Costs</h1>
            <p className="text-zinc-400 text-xs">Manage action pricing, track credit usage across all edge functions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchOverviewStats();
            fetchActionCosts();
            if (activeTab === 'transactions') fetchTransactions();
            if (activeTab === 'analytics') fetchUsageAnalytics();
          }}
          className="border-zinc-700 h-8 text-xs"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Credits Issued" value={stats.totalCreditsIssued} icon={TrendingUp} color="green" />
        <StatCard title="Total Credits Used" value={stats.totalCreditsUsed} icon={TrendingDown} color="red" />
        <StatCard title="Users with Credits" value={stats.activeUsers} icon={Users} color="blue" />
        <StatCard
          title="Action Types"
          value={actionCosts.length}
          subtitle={`${actionCosts.filter(a => a.is_active).length} active`}
          icon={Zap}
          color="cyan"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-4">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
            <Settings className="w-3 h-3 mr-1.5" />
            Action Costs
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
            <History className="w-3 h-3 mr-1.5" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
            <BarChart3 className="w-3 h-3 mr-1.5" />
            Usage Analytics
          </TabsTrigger>
        </TabsList>

        {/* ────────────────────────────────────────────────────────────────────
            ACTION COSTS TAB
        ──────────────────────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-white text-sm">All Billable Actions</CardTitle>
                  <CardDescription className="text-xs">
                    {actionCosts.length} actions configured — edit credit cost inline
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <Input
                      placeholder="Search actions..."
                      value={actionSearch}
                      onChange={(e) => setActionSearch(e.target.value)}
                      className="pl-8 w-52 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    />
                  </div>
                  <Select value={actionCategoryFilter} onValueChange={setActionCategoryFilter}>
                    <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat} className="text-xs capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {actionCostsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : Object.keys(groupedActions).length === 0 ? (
                <p className="text-center text-zinc-500 text-xs py-8">
                  {actionSearch ? 'No actions match your search' : 'No action costs configured yet — run the credit_system_full migration'}
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedActions).map(([category, actions]) => {
                    const CatIcon = CATEGORY_ICONS[category] || Zap;
                    const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.ai;
                    const isExpanded = expandedCategories[category];

                    return (
                      <div key={category} className="border border-zinc-800 rounded-lg overflow-hidden">
                        {/* Category header */}
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', catColor.split(' ')[0])}>
                              <CatIcon className={cn('w-3.5 h-3.5', catColor.split(' ')[1])} />
                            </div>
                            <span className="text-sm font-medium text-white capitalize">{category}</span>
                            <Badge className="bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0">{actions.length}</Badge>
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                        </button>

                        {/* Actions list */}
                        {isExpanded && (
                          <div className="divide-y divide-zinc-800/50">
                            {actions.map((action) => {
                              const isEditing = editingAction?.id === action.id;

                              return (
                                <div key={action.id} className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors">
                                  <div className="flex-1 min-w-0 mr-3">
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <Input
                                          value={editingAction.label}
                                          onChange={(e) => setEditingAction({ ...editingAction, label: e.target.value })}
                                          className="bg-zinc-700 border-zinc-600 h-6 text-xs w-48"
                                        />
                                      ) : (
                                        <span className="text-xs font-medium text-white">{action.label}</span>
                                      )}
                                      {!action.is_active && (
                                        <Badge className="bg-zinc-700 text-zinc-400 text-[9px] px-1 py-0">disabled</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <code className="text-[10px] text-zinc-500 font-mono">{action.action_key}</code>
                                      <Badge className={cn('text-[9px] px-1 py-0', TIER_COLORS[action.tier] || TIER_COLORS.medium)}>
                                        {action.tier}
                                      </Badge>
                                      {action.is_per_unit && (
                                        <span className="text-[9px] text-zinc-500">per {action.unit_label || 'unit'}</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isEditing ? (
                                      <>
                                        <Input
                                          type="number"
                                          value={editingAction.credits_required}
                                          onChange={(e) => setEditingAction({ ...editingAction, credits_required: parseInt(e.target.value) || 0 })}
                                          className="w-16 bg-zinc-700 border-zinc-600 h-6 text-xs text-center"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateActionCost(editingAction)}
                                          disabled={savingAction}
                                          className="bg-cyan-600 hover:bg-cyan-700 h-6 w-6 p-0"
                                        >
                                          {savingAction ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingAction(null)}
                                          className="h-6 w-6 p-0 text-zinc-400"
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 text-xs px-2 py-0.5 font-mono">
                                          <Zap className="w-3 h-3 mr-1" />
                                          {action.credits_required}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingAction({ ...action })}
                                          className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────────────
            TRANSACTIONS TAB
        ──────────────────────────────────────────────────────────────────── */}
        <TabsContent value="transactions">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="py-3 px-4 border-b border-zinc-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-white text-sm">Transaction History</CardTitle>
                  <CardDescription className="text-xs">
                    All credit transactions across the platform — showing action keys and edge functions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <Input
                      placeholder="Search..."
                      value={transactionFilters.search}
                      onChange={(e) => {
                        setTransactionFilters({ ...transactionFilters, search: e.target.value });
                        // Client-side filter, trigger re-fetch only on enter
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                      className="pl-8 w-44 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    />
                  </div>
                  <Select
                    value={transactionFilters.type}
                    onValueChange={(v) => setTransactionFilters({ ...transactionFilters, type: v })}
                  >
                    <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-xs">All Types</SelectItem>
                      <SelectItem value="deduction" className="text-xs">Deductions</SelectItem>
                      <SelectItem value="top_up" className="text-xs">Top Up</SelectItem>
                      <SelectItem value="enrichment" className="text-xs">Enrichment</SelectItem>
                      <SelectItem value="adjustment" className="text-xs">Adjustment</SelectItem>
                      <SelectItem value="refund" className="text-xs">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={transactionFilters.edgeFunction}
                    onValueChange={(v) => setTransactionFilters({ ...transactionFilters, edgeFunction: v })}
                  >
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 h-7 text-xs">
                      <SelectValue placeholder="Edge Function" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-xs">All Functions</SelectItem>
                      {edgeFunctions.map(fn => (
                        <SelectItem key={fn} value={fn} className="text-xs">{fn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={transactionFilters.dateRange}
                    onValueChange={(v) => setTransactionFilters({ ...transactionFilters, dateRange: v })}
                  >
                    <SelectTrigger className="w-28 bg-zinc-800 border-zinc-700 h-7 text-xs">
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="7" className="text-xs">7 days</SelectItem>
                      <SelectItem value="30" className="text-xs">30 days</SelectItem>
                      <SelectItem value="90" className="text-xs">90 days</SelectItem>
                      <SelectItem value="all" className="text-xs">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400 text-[10px]">Date</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">User</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">Type</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">Action Key</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">Edge Function</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">Description</TableHead>
                        <TableHead className="text-zinc-400 text-[10px] text-right">Amount</TableHead>
                        <TableHead className="text-zinc-400 text-[10px] text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-zinc-500 py-8 text-xs">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((t) => (
                          <TableRow key={t.id} className="border-zinc-800/50">
                            <TableCell className="text-zinc-400 text-[10px] whitespace-nowrap">
                              {format(new Date(t.created_at), 'MMM d HH:mm')}
                            </TableCell>
                            <TableCell className="text-[10px]">
                              <span className="text-zinc-300 truncate max-w-[120px] block">
                                {t.users?.full_name || t.users?.email || t.user_id?.slice(0, 8) || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize border-zinc-700 text-[9px] px-1 py-0">
                                {t.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {t.action_key ? (
                                <code className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
                                  {t.action_key}
                                </code>
                              ) : (
                                <span className="text-zinc-600 text-[10px]">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {t.edge_function ? (
                                <code className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                                  {t.edge_function}
                                </code>
                              ) : (
                                <span className="text-zinc-600 text-[10px]">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-zinc-400 text-[10px] max-w-[200px] truncate">
                              {t.description || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                'flex items-center justify-end gap-0.5 font-medium text-xs',
                                t.amount > 0 ? 'text-green-400' : 'text-red-400'
                              )}>
                                {t.amount > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {t.amount > 0 ? '+' : ''}{t.amount}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-zinc-300 text-xs">
                              {t.balance_after ?? '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────────────────────────────────────────────────────────────
            USAGE ANALYTICS TAB
        ──────────────────────────────────────────────────────────────────── */}
        <TabsContent value="analytics">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Credit Usage Analytics</h2>
            <Select value={usageDays} onValueChange={setUsageDays}>
              <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="7" className="text-xs">Last 7 days</SelectItem>
                <SelectItem value="30" className="text-xs">Last 30 days</SelectItem>
                <SelectItem value="90" className="text-xs">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {usageLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Usage by Action */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="py-2 px-4 border-b border-zinc-800">
                  <CardTitle className="text-white text-xs flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Credits by Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {usageByAction.length === 0 ? (
                      <p className="text-center text-zinc-500 text-xs py-4">No usage data</p>
                    ) : (
                      usageByAction.map((item, i) => {
                        const maxCredits = usageByAction[0]?.total_credits || 1;
                        return (
                          <div key={item.action_key} className="flex items-center gap-2">
                            <div className="w-5 text-[10px] text-zinc-500 text-right">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <code className="text-[10px] text-zinc-300 font-mono truncate">{item.action_key}</code>
                                <span className="text-[10px] text-zinc-400 ml-2 whitespace-nowrap">
                                  {item.count}x → <span className="text-cyan-400 font-medium">{item.total_credits}</span> credits
                                </span>
                              </div>
                              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                                  style={{ width: `${(item.total_credits / maxCredits) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Usage by Edge Function */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="py-2 px-4 border-b border-zinc-800">
                  <CardTitle className="text-white text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    Credits by Edge Function
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {usageByFunction.length === 0 ? (
                      <p className="text-center text-zinc-500 text-xs py-4">No usage data</p>
                    ) : (
                      usageByFunction.map((item, i) => {
                        const maxCredits = usageByFunction[0]?.total_credits || 1;
                        return (
                          <div key={item.edge_function} className="flex items-center gap-2">
                            <div className="w-5 text-[10px] text-zinc-500 text-right">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <code className="text-[10px] text-zinc-300 font-mono truncate">{item.edge_function}</code>
                                <span className="text-[10px] text-zinc-400 ml-2 whitespace-nowrap">
                                  {item.count}x → <span className="text-blue-400 font-medium">{item.total_credits}</span> credits
                                </span>
                              </div>
                              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                                  style={{ width: `${(item.total_credits / maxCredits) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-2">
                <CardHeader className="py-2 px-4 border-b border-zinc-800">
                  <CardTitle className="text-white text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Top Credit Consumers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead className="text-zinc-400 text-[10px] w-8">#</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">User</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">Email</TableHead>
                        <TableHead className="text-zinc-400 text-[10px] text-right">Actions</TableHead>
                        <TableHead className="text-zinc-400 text-[10px] text-right">Credits Used</TableHead>
                        <TableHead className="text-zinc-400 text-[10px]">Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageByUser.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-zinc-500 py-6 text-xs">
                            No usage data
                          </TableCell>
                        </TableRow>
                      ) : (
                        usageByUser.map((user, i) => {
                          const maxCredits = usageByUser[0]?.total_credits || 1;
                          return (
                            <TableRow key={user.user_id} className="border-zinc-800/50">
                              <TableCell className="text-zinc-500 text-[10px]">{i + 1}</TableCell>
                              <TableCell className="text-zinc-200 text-xs font-medium">{user.full_name}</TableCell>
                              <TableCell className="text-zinc-400 text-[10px]">{user.email}</TableCell>
                              <TableCell className="text-right text-zinc-300 text-xs">{user.count}</TableCell>
                              <TableCell className="text-right">
                                <span className="text-amber-400 font-medium text-xs">{user.total_credits}</span>
                              </TableCell>
                              <TableCell className="w-32">
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                                    style={{ width: `${(user.total_credits / maxCredits) * 100}%` }}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
