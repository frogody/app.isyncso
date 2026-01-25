/**
 * Admin Nests Management Page
 * Allows platform admins to manage purchasable datasets (Nests)
 * for Candidates (Talent), Prospects (Growth), and Investors (Raise)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Upload,
  DollarSign,
  Users,
  TrendingUp,
  Briefcase,
  Building2,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Settings,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@supabase/supabase-js';
import { BUTTON_STYLES } from '@/lib/adminTheme';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nest type icons
const NEST_TYPE_ICONS = {
  candidates: Users,
  prospects: Briefcase,
  investors: Building2,
};

const NEST_TYPE_LABELS = {
  candidates: 'Candidates',
  prospects: 'Prospects',
  investors: 'Investors',
};

const NEST_TYPE_COLORS = {
  candidates: 'text-blue-400 bg-blue-500/20',
  prospects: 'text-green-400 bg-green-500/20',
  investors: 'text-purple-400 bg-purple-500/20',
};

// Format currency
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminNests() {
  // State
  const [activeTab, setActiveTab] = useState('candidates');
  const [nests, setNests] = useState([]);
  const [stats, setStats] = useState({
    total_nests: 0,
    active_nests: 0,
    total_items: 0,
    total_purchases: 0,
    total_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedNest, setSelectedNest] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Nest form state
  const [nestForm, setNestForm] = useState({
    name: '',
    description: '',
    nest_type: 'candidates',
    price: 0,
    currency: 'USD',
    thumbnail_url: '',
    is_active: false,
  });

  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Items state
  const [nestItems, setNestItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      // Get aggregate stats
      const { data: nestsData } = await supabase
        .from('nests')
        .select('id, is_active, item_count');

      const { data: purchasesData } = await supabase
        .from('nest_purchases')
        .select('price_paid')
        .eq('status', 'completed');

      const totalNests = nestsData?.length || 0;
      const activeNests = nestsData?.filter(n => n.is_active).length || 0;
      const totalItems = nestsData?.reduce((sum, n) => sum + (n.item_count || 0), 0) || 0;
      const totalPurchases = purchasesData?.length || 0;
      const totalRevenue = purchasesData?.reduce((sum, p) => sum + parseFloat(p.price_paid || 0), 0) || 0;

      setStats({
        total_nests: totalNests,
        active_nests: activeNests,
        total_items: totalItems,
        total_purchases: totalPurchases,
        total_revenue: totalRevenue,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch nests
  const fetchNests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('nests')
        .select(`
          *,
          nest_purchases(count)
        `)
        .eq('nest_type', activeTab)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform to include purchase count
      const nestsWithStats = await Promise.all((data || []).map(async (nest) => {
        const { data: statsData } = await supabase.rpc('get_nest_stats', { p_nest_id: nest.id });
        return {
          ...nest,
          stats: statsData || { total_purchases: 0, total_revenue: 0, preview_items: 0 },
        };
      }));

      setNests(nestsWithStats);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch nests:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Fetch nest items
  const fetchNestItems = useCallback(async (nestId) => {
    setLoadingItems(true);
    try {
      const nest = nests.find(n => n.id === nestId);
      if (!nest) return;

      let query = supabase
        .from('nest_items')
        .select(`
          *,
          candidates(*),
          prospects(*),
          raise_investors(*)
        `)
        .eq('nest_id', nestId)
        .order('item_order', { ascending: true });

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setNestItems(data || []);
    } catch (err) {
      console.error('Failed to fetch nest items:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [nests]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch nests when tab changes
  useEffect(() => {
    fetchNests();
  }, [fetchNests]);

  // Handle create nest
  const handleCreateNest = () => {
    setNestForm({
      name: '',
      description: '',
      nest_type: activeTab,
      price: 0,
      currency: 'USD',
      thumbnail_url: '',
      is_active: false,
    });
    setIsEditing(false);
    setShowCreateModal(true);
  };

  // Handle edit nest
  const handleEditNest = (nest) => {
    setNestForm({
      name: nest.name || '',
      description: nest.description || '',
      nest_type: nest.nest_type,
      price: nest.price || 0,
      currency: nest.currency || 'USD',
      thumbnail_url: nest.thumbnail_url || '',
      is_active: nest.is_active || false,
    });
    setSelectedNest(nest);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  // Save nest
  const handleSaveNest = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (isEditing && selectedNest) {
        const { error: updateError } = await supabase
          .from('nests')
          .update({
            name: nestForm.name,
            description: nestForm.description,
            price: parseFloat(nestForm.price) || 0,
            currency: nestForm.currency,
            thumbnail_url: nestForm.thumbnail_url,
            is_active: nestForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedNest.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('nests')
          .insert({
            name: nestForm.name,
            description: nestForm.description,
            nest_type: nestForm.nest_type,
            price: parseFloat(nestForm.price) || 0,
            currency: nestForm.currency,
            thumbnail_url: nestForm.thumbnail_url,
            is_active: nestForm.is_active,
            created_by: user?.id,
          });

        if (insertError) throw insertError;
      }

      setShowCreateModal(false);
      fetchNests();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (nest) => {
    try {
      const { error: updateError } = await supabase
        .from('nests')
        .update({ is_active: !nest.is_active, updated_at: new Date().toISOString() })
        .eq('id', nest.id);

      if (updateError) throw updateError;
      fetchNests();
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle active:', err);
    }
  };

  // Delete nest
  const handleDeleteNest = async () => {
    if (!selectedNest) return;
    setIsSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('nests')
        .delete()
        .eq('id', selectedNest.id);

      if (deleteError) throw deleteError;

      setShowDeleteConfirm(false);
      setSelectedNest(null);
      fetchNests();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload
  const handleUploadCSV = async () => {
    if (!uploadFile || !selectedNest) return;

    setUploadProgress('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('nest_id', selectedNest.id);
      formData.append('nest_type', selectedNest.nest_type);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-nest-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadProgress(`Success! Created ${result.created_count || 0} items.`);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadProgress(null);
        fetchNests();
        fetchStats();
      }, 2000);
    } catch (err) {
      setUploadProgress(`Error: ${err.message}`);
    }
  };

  // Handle manage items
  const handleManageItems = (nest) => {
    setSelectedNest(nest);
    fetchNestItems(nest.id);
    setShowItemsModal(true);
  };

  // Toggle item preview status
  const handleTogglePreview = async (item) => {
    try {
      const { error: updateError } = await supabase
        .from('nest_items')
        .update({ is_preview: !item.is_preview })
        .eq('id', item.id);

      if (updateError) throw updateError;
      fetchNestItems(selectedNest.id);
    } catch (err) {
      console.error('Failed to toggle preview:', err);
    }
  };

  // Get item display info based on type
  const getItemDisplayInfo = (item) => {
    if (item.candidates) {
      return {
        name: `${item.candidates.first_name || ''} ${item.candidates.last_name || ''}`.trim() || 'Unknown',
        subtitle: item.candidates.job_title || item.candidates.company_name || 'No title',
        email: item.candidates.email,
      };
    }
    if (item.prospects) {
      return {
        name: `${item.prospects.first_name || ''} ${item.prospects.last_name || ''}`.trim() || 'Unknown',
        subtitle: item.prospects.company || item.prospects.job_title || 'No company',
        email: item.prospects.email,
      };
    }
    if (item.raise_investors) {
      return {
        name: item.raise_investors.profile?.name || 'Unknown Investor',
        subtitle: item.raise_investors.investor_type || 'Investor',
        email: item.raise_investors.profile?.email,
      };
    }
    return { name: 'Unknown', subtitle: '', email: '' };
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Data Nests</h1>
          <p className="text-zinc-400 mt-1">Manage purchasable datasets for Talent, Growth, and Raise</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => { fetchStats(); fetchNests(); }}
            className="border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleCreateNest}
            className={BUTTON_STYLES.primary}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Nest
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Nests</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.total_nests}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Active Nests</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.active_nests}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Items</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.total_items.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Purchases</p>
                <p className="text-2xl font-semibold text-white mt-1">{stats.total_purchases}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Revenue</p>
                <p className="text-2xl font-semibold text-white mt-1">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="candidates" className="data-[state=active]:bg-white/10">
            <Users className="w-4 h-4 mr-2" />
            Candidate Nests
          </TabsTrigger>
          <TabsTrigger value="prospects" className="data-[state=active]:bg-white/10">
            <Briefcase className="w-4 h-4 mr-2" />
            Prospect Nests
          </TabsTrigger>
          <TabsTrigger value="investors" className="data-[state=active]:bg-white/10">
            <Building2 className="w-4 h-4 mr-2" />
            Investor Nests
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Search */}
          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Search nests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={fetchNests}
                  className="border-white/10 bg-white/5"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Nests Table */}
          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : nests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>No {NEST_TYPE_LABELS[activeTab].toLowerCase()} nests found</p>
                  <Button
                    variant="link"
                    onClick={handleCreateNest}
                    className="text-blue-400 mt-2"
                  >
                    Create your first {NEST_TYPE_LABELS[activeTab].toLowerCase()} nest
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Nest</TableHead>
                      <TableHead className="text-zinc-400">Price</TableHead>
                      <TableHead className="text-zinc-400 text-center">Items</TableHead>
                      <TableHead className="text-zinc-400 text-center">Purchases</TableHead>
                      <TableHead className="text-zinc-400 text-center">Revenue</TableHead>
                      <TableHead className="text-zinc-400 text-center">Status</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nests.map((nest) => {
                      const TypeIcon = NEST_TYPE_ICONS[nest.nest_type] || Package;
                      return (
                        <TableRow key={nest.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${NEST_TYPE_COLORS[nest.nest_type]}`}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{nest.name}</p>
                                <p className="text-sm text-zinc-400 truncate max-w-[300px]">
                                  {nest.description || 'No description'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-white font-medium">
                              {nest.price > 0 ? formatCurrency(nest.price, nest.currency) : 'Free'}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-white/10">
                              {nest.item_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-zinc-300">{nest.stats?.total_purchases || 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-zinc-300">{formatCurrency(nest.stats?.total_revenue || 0)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={nest.is_active
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                            }>
                              {nest.is_active ? 'Active' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-white/10">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                                <DropdownMenuItem
                                  onClick={() => handleEditNest(nest)}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Nest
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleManageItems(nest)}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white"
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Manage Items
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedNest(nest);
                                    setShowUploadModal(true);
                                  }}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload CSV
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(nest)}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white"
                                >
                                  {nest.is_active ? (
                                    <>
                                      <ToggleRight className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-4 h-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedNest(nest);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Nest Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEditing ? 'Edit Nest' : 'Create New Nest'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={nestForm.name}
                onChange={(e) => setNestForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Senior Engineers Q1 2026"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={nestForm.description}
                onChange={(e) => setNestForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the dataset..."
                rows={3}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={nestForm.price}
                  onChange={(e) => setNestForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <select
                  value={nestForm.currency}
                  onChange={(e) => setNestForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full h-10 rounded-md bg-white/5 border border-white/10 px-3 text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={nestForm.thumbnail_url}
                onChange={(e) => setNestForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={nestForm.is_active}
                onCheckedChange={(checked) => setNestForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label className="cursor-pointer">Active (visible in marketplace)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNest}
              disabled={isSaving || !nestForm.name}
              className={BUTTON_STYLES.primary}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Nest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload CSV Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              Upload Data to {selectedNest?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-zinc-400">
              <p className="mb-2">Upload a CSV file with the following columns:</p>
              {selectedNest?.nest_type === 'candidates' && (
                <code className="block bg-white/5 p-2 rounded text-xs">
                  name, email, title, company, skills, linkedin_url
                </code>
              )}
              {selectedNest?.nest_type === 'prospects' && (
                <code className="block bg-white/5 p-2 rounded text-xs">
                  company_name, contact_name, email, title, industry, deal_value
                </code>
              )}
              {selectedNest?.nest_type === 'investors' && (
                <code className="block bg-white/5 p-2 rounded text-xs">
                  name, firm, email, type, check_size_min, check_size_max, focus_areas
                </code>
              )}
            </div>

            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="bg-white/5 border-white/10"
              />
            </div>

            {uploadProgress && (
              <div className={`p-3 rounded-lg ${uploadProgress.startsWith('Error') ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {uploadProgress}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadProgress(null);
              }}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadCSV}
              disabled={!uploadFile || uploadProgress?.startsWith('Uploading')}
              className={BUTTON_STYLES.primary}
            >
              {uploadProgress?.startsWith('Uploading') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Items Modal */}
      <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              Items in {selectedNest?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {loadingItems ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : nestItems.length === 0 ? (
              <div className="text-center py-10 text-zinc-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No items in this nest yet.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setShowItemsModal(false);
                    setShowUploadModal(true);
                  }}
                  className="text-blue-400 mt-2"
                >
                  Upload CSV to add items
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-zinc-400">#</TableHead>
                    <TableHead className="text-zinc-400">Name</TableHead>
                    <TableHead className="text-zinc-400">Details</TableHead>
                    <TableHead className="text-zinc-400 text-center">Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nestItems.map((item, index) => {
                    const info = getItemDisplayInfo(item);
                    return (
                      <TableRow key={item.id} className="border-white/10">
                        <TableCell className="text-zinc-500">{index + 1}</TableCell>
                        <TableCell>
                          <p className="text-white">{info.name}</p>
                          <p className="text-xs text-zinc-500">{info.email}</p>
                        </TableCell>
                        <TableCell className="text-zinc-400">{info.subtitle}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.is_preview}
                            onCheckedChange={() => handleTogglePreview(item)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowItemsModal(false)}
              className="border-white/10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Nest</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-zinc-300">
              Are you sure you want to delete <span className="font-semibold text-white">{selectedNest?.name}</span>?
            </p>
            <p className="text-sm text-zinc-500 mt-2">
              This will also delete all items and purchase records associated with this nest.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteNest}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Nest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
