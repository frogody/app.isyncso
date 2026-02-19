import { useState, useEffect } from 'react';
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
import { format } from 'date-fns';

const ENRICHMENT_ICONS = {
  linkedin_enrich: Linkedin,
  sync_intel: Sparkles,
  full_package: Zap,
};

export default function AdminCredits() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalCreditsIssued: 0,
    totalCreditsUsed: 0,
    activeUsers: 0,
    avgCreditsPerUser: 0,
  });

  const [enrichmentConfig, setEnrichmentConfig] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionFilters, setTransactionFilters] = useState({
    search: '',
    type: 'all',
    dateRange: '30',
  });
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    fetchOverviewStats();
    fetchEnrichmentConfig();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [transactionFilters.type, transactionFilters.dateRange]);

  const fetchOverviewStats = async () => {
    try {
      const { data: issuedData, error: issuedError } = await supabase
        .from('credit_transactions')
        .select('amount')
        .gt('amount', 0);

      if (issuedError) {
        console.warn('[AdminCredits] credit_transactions not available:', issuedError.message);
        setStats({
          totalCreditsIssued: 0,
          totalCreditsUsed: 0,
          activeUsers: 0,
          avgCreditsPerUser: 0,
        });
        return;
      }

      const totalIssued = issuedData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      const { data: usedData } = await supabase
        .from('credit_transactions')
        .select('amount')
        .lt('amount', 0);

      const totalUsed = Math.abs(usedData?.reduce((sum, t) => sum + t.amount, 0) || 0);

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('credits', 0);

      const { data: avgData } = await supabase
        .from('users')
        .select('credits')
        .gt('credits', 0);

      const avgCredits = avgData?.length
        ? Math.round(avgData.reduce((sum, u) => sum + u.credits, 0) / avgData.length)
        : 0;

      setStats({
        totalCreditsIssued: totalIssued,
        totalCreditsUsed: totalUsed,
        activeUsers: activeUsers || 0,
        avgCreditsPerUser: avgCredits,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEnrichmentConfig = async () => {
    const { data, error } = await supabase
      .from('enrichment_config')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setEnrichmentConfig(data);
    }
    setLoading(false);
  };

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      let query = supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionFilters.dateRange !== 'all') {
        const days = parseInt(transactionFilters.dateRange);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        query = query.gte('created_at', fromDate.toISOString());
      }

      if (transactionFilters.type !== 'all') {
        query = query.eq('transaction_type', transactionFilters.type);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[AdminCredits] credit_transactions not available:', error.message);
        setTransactions([]);
        return;
      }

      let filtered = data || [];
      if (transactionFilters.search) {
        const search = transactionFilters.search.toLowerCase();
        filtered = filtered.filter(t =>
          t.reference_name?.toLowerCase().includes(search) ||
          t.description?.toLowerCase().includes(search)
        );
      }
      setTransactions(filtered);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    setTransactionsLoading(false);
  };

  const handleUpdateConfig = async (config) => {
    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from('enrichment_config')
        .update({
          credits: config.credits,
          label: config.label,
          description: config.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Pricing updated successfully');
      setEditingConfig(null);
      fetchEnrichmentConfig();
    } catch (error) {
      toast.error('Failed to update pricing', { description: error.message });
    }
    setSavingConfig(false);
  };

  const StatCard = ({ title, value, icon: Icon, color = 'amber' }) => {
    const colorMap = {
      amber: 'bg-amber-500/10 text-amber-400',
      green: 'bg-green-500/10 text-green-400',
      red: 'bg-red-500/10 text-red-400',
      blue: 'bg-blue-500/10 text-blue-400',
    };
    const iconClasses = colorMap[color] || colorMap.amber;

    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">{title}</p>
              <p className="text-3xl font-bold text-white mt-1">{value.toLocaleString()}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconClasses.split(' ')[0]}`}>
              <Icon className={`w-6 h-6 ${iconClasses.split(' ')[1]}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-400" />
            Credits & Enrichment
          </h1>
          <p className="text-zinc-400 mt-1">Manage enrichment pricing and track credit usage</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            fetchOverviewStats();
            fetchEnrichmentConfig();
            fetchTransactions();
          }}
          className="border-zinc-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Credits Issued" value={stats.totalCreditsIssued} icon={TrendingUp} color="green" />
        <StatCard title="Total Credits Used" value={stats.totalCreditsUsed} icon={TrendingDown} color="red" />
        <StatCard title="Users with Credits" value={stats.activeUsers} icon={Users} color="blue" />
        <StatCard title="Avg Credits/User" value={stats.avgCreditsPerUser} icon={Coins} color="amber" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-700">
            <Settings className="w-4 h-4 mr-2" />
            Pricing Config
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-zinc-700">
            <History className="w-4 h-4 mr-2" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Enrichment Pricing</CardTitle>
              <CardDescription>Configure credit costs for each enrichment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrichmentConfig.map((config) => {
                  const Icon = ENRICHMENT_ICONS[config.key] || Sparkles;
                  const isEditing = editingConfig?.id === config.id;

                  return (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          {isEditing ? (
                            <Input
                              value={editingConfig.label}
                              onChange={(e) => setEditingConfig({ ...editingConfig, label: e.target.value })}
                              className="bg-zinc-700 border-zinc-600 mb-1"
                            />
                          ) : (
                            <p className="font-medium text-white">{config.label}</p>
                          )}
                          {isEditing ? (
                            <Input
                              value={editingConfig.description}
                              onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                              className="bg-zinc-700 border-zinc-600 text-sm"
                            />
                          ) : (
                            <p className="text-sm text-zinc-400">{config.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingConfig.credits}
                                onChange={(e) => setEditingConfig({ ...editingConfig, credits: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-zinc-700 border-zinc-600"
                              />
                              <span className="text-zinc-400">credits</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateConfig(editingConfig)}
                              disabled={savingConfig}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingConfig(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge className="bg-amber-500/20 text-amber-400 text-lg px-3 py-1">
                              {config.credits} credits
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingConfig({ ...config })}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-white">Transaction History</CardTitle>
                  <CardDescription>All credit transactions across the platform</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={transactionFilters.search}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, search: e.target.value })}
                      className="pl-9 w-64 bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <Select
                    value={transactionFilters.type}
                    onValueChange={(value) => setTransactionFilters({ ...transactionFilters, type: value })}
                  >
                    <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="enrichment">Enrichment</SelectItem>
                      <SelectItem value="top_up">Top Up</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={transactionFilters.dateRange}
                    onValueChange={(value) => setTransactionFilters({ ...transactionFilters, dateRange: value })}
                  >
                    <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Date</TableHead>
                      <TableHead className="text-zinc-400">Type</TableHead>
                      <TableHead className="text-zinc-400">Description</TableHead>
                      <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                      <TableHead className="text-zinc-400 text-right">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-zinc-400 py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="border-zinc-800">
                          <TableCell className="text-zinc-300">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize border-zinc-600">
                              {transaction.transaction_type}
                            </Badge>
                            {transaction.enrichment_type && (
                              <Badge variant="outline" className="ml-2 border-zinc-700 text-zinc-400">
                                {transaction.enrichment_type}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-zinc-400 max-w-xs truncate">
                            {transaction.description || transaction.reference_name || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`flex items-center justify-end gap-1 font-medium ${
                              transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {transaction.amount > 0 ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4" />
                              )}
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-zinc-300">
                            {transaction.balance_after}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
