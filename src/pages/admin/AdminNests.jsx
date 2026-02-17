/**
 * Admin Nests Management Page
 * Allows platform admins to manage purchasable datasets (Nests)
 * for Candidates (Talent), Prospects (Growth), and Investors (Raise)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Upload,
  Euro,
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
  Factory,
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
import { supabase } from '@/api/supabaseClient';
import { BUTTON_STYLES } from '@/lib/adminTheme';
import { NestUploadWizard } from '@/components/admin/NestUploadWizard';

// Nest type icons
const NEST_TYPE_ICONS = {
  candidates: Users,
  prospects: Briefcase,
  investors: Building2,
  companies: Factory,
};

const NEST_TYPE_LABELS = {
  candidates: 'Candidates',
  prospects: 'Prospects',
  investors: 'Investors',
  companies: 'Companies',
};

const NEST_TYPE_COLORS = {
  candidates: 'text-cyan-400 bg-cyan-500/20',
  prospects: 'text-cyan-400 bg-cyan-500/20',
  investors: 'text-blue-400 bg-blue-500/20',
  companies: 'text-cyan-400 bg-cyan-500/20',
};

// Format currency
function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', {
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
  // State - persist active tab in URL
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'candidates';
  const setActiveTab = useCallback((tab) => setSearchParams({ tab }), [setSearchParams]);
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
    currency: 'EUR',
    thumbnail_url: '',
    is_active: false,
  });

  // Upload wizard state is handled by NestUploadWizard

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

  // Fetch nests when tab or search changes (debounced for search)
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchNests();
    }, searchQuery ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [activeTab, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle create nest
  const handleCreateNest = () => {
    setNestForm({
      name: '',
      description: '',
      nest_type: activeTab,
      price: 0,
      currency: 'EUR',
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
      currency: nest.currency || 'EUR',
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

  // Handle import complete from wizard
  const handleImportComplete = useCallback(() => {
    fetchNests();
    fetchStats();
  }, [fetchNests, fetchStats]);

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
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Data Nests</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Manage purchasable datasets for Talent, Growth, and Raise</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchStats(); fetchNests(); }}
            className="border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleCreateNest}
            className={BUTTON_STYLES.primary}
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Create Nest
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2"
        >
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-400 text-xs">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Total Nests</p>
                <p className="text-lg font-semibold text-white">{stats.total_nests}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Active Nests</p>
                <p className="text-lg font-semibold text-white">{stats.active_nests}</p>
              </div>
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Total Items</p>
                <p className="text-lg font-semibold text-white">{stats.total_items.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Purchases</p>
                <p className="text-lg font-semibold text-white">{stats.total_purchases}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Revenue</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Euro className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="bg-white/5 border border-white/10 h-8">
          <TabsTrigger value="candidates" className="data-[state=active]:bg-white/10 text-xs h-7 px-2.5">
            <Users className="w-3 h-3 mr-1.5" />
            Candidate Nests
          </TabsTrigger>
          <TabsTrigger value="prospects" className="data-[state=active]:bg-white/10 text-xs h-7 px-2.5">
            <Briefcase className="w-3 h-3 mr-1.5" />
            Prospect Nests
          </TabsTrigger>
          <TabsTrigger value="investors" className="data-[state=active]:bg-white/10 text-xs h-7 px-2.5">
            <Building2 className="w-3 h-3 mr-1.5" />
            Investor Nests
          </TabsTrigger>
          <TabsTrigger value="companies" className="data-[state=active]:bg-white/10 text-xs h-7 px-2.5">
            <Factory className="w-3 h-3 mr-1.5" />
            Company Nests
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3">
          {/* Search */}
          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                  <Input
                    placeholder="Search nests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="sm"
                    className="pl-8 bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nests Table */}
          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
              ) : nests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Package className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-xs">No {NEST_TYPE_LABELS[activeTab].toLowerCase()} nests found</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleCreateNest}
                    className="text-blue-400 mt-1 text-xs"
                  >
                    Create your first {NEST_TYPE_LABELS[activeTab].toLowerCase()} nest
                  </Button>
                </div>
              ) : (
                <Table compact>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-zinc-400 py-1.5 px-2">Nest</TableHead>
                      <TableHead className="text-zinc-400 py-1.5 px-2">Price</TableHead>
                      <TableHead className="text-zinc-400 py-1.5 px-2 text-center">Items</TableHead>
                      <TableHead className="text-zinc-400 py-1.5 px-2 text-center">Purchases</TableHead>
                      <TableHead className="text-zinc-400 py-1.5 px-2 text-center">Revenue</TableHead>
                      <TableHead className="text-zinc-400 py-1.5 px-2 text-center">Status</TableHead>
                      <TableHead className="text-zinc-400 py-1.5 px-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nests.map((nest) => {
                      const TypeIcon = NEST_TYPE_ICONS[nest.nest_type] || Package;
                      return (
                        <TableRow key={nest.id} className="border-white/10 hover:bg-white/[0.03]">
                          <TableCell className="py-1.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded flex items-center justify-center ${NEST_TYPE_COLORS[nest.nest_type]}`}>
                                <TypeIcon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="font-medium text-white text-xs">{nest.name}</p>
                                <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                                  {nest.description || 'No description'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-2">
                            <p className="text-white text-xs">
                              {nest.price > 0 ? formatCurrency(nest.price, nest.currency) : 'Free'}
                            </p>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-center">
                            <Badge size="xs" variant="secondary" className="bg-white/10">
                              {nest.item_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-center">
                            <span className="text-zinc-300 text-xs">{nest.stats?.total_purchases || 0}</span>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-center">
                            <span className="text-zinc-300 text-xs">{formatCurrency(nest.stats?.total_revenue || 0)}</span>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-center">
                            <Badge size="xs" className={nest.is_active
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                            }>
                              {nest.is_active ? 'Active' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-xs" className="hover:bg-white/10">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                                <DropdownMenuItem
                                  onClick={() => handleEditNest(nest)}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white text-xs"
                                >
                                  <Edit className="w-3 h-3 mr-1.5" />
                                  Edit Nest
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleManageItems(nest)}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white text-xs"
                                >
                                  <Settings className="w-3 h-3 mr-1.5" />
                                  Manage Items
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedNest(nest);
                                    setShowUploadModal(true);
                                  }}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white text-xs"
                                >
                                  <Upload className="w-3 h-3 mr-1.5" />
                                  Upload CSV
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(nest)}
                                  className="text-zinc-300 focus:bg-white/10 focus:text-white text-xs"
                                >
                                  {nest.is_active ? (
                                    <>
                                      <ToggleRight className="w-3 h-3 mr-1.5" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="w-3 h-3 mr-1.5" />
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
                                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400 text-xs"
                                >
                                  <Trash2 className="w-3 h-3 mr-1.5" />
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
        <DialogContent compact className="max-w-md bg-[#1a1a2e] border-white/10">
          <DialogHeader compact>
            <DialogTitle compact className="text-white">
              {isEditing ? 'Edit Nest' : 'Create New Nest'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input
                size="sm"
                value={nestForm.name}
                onChange={(e) => setNestForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Senior Engineers Q1 2026"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={nestForm.description}
                onChange={(e) => setNestForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the dataset..."
                rows={2}
                className="bg-white/5 border-white/10 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  size="sm"
                  value={nestForm.price}
                  onChange={(e) => setNestForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <select
                  value={nestForm.currency}
                  onChange={(e) => setNestForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full h-8 rounded-md bg-white/5 border border-white/10 px-2.5 text-white text-xs"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Thumbnail URL</Label>
              <Input
                size="sm"
                value={nestForm.thumbnail_url}
                onChange={(e) => setNestForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={nestForm.is_active}
                onCheckedChange={(checked) => setNestForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label className="cursor-pointer text-xs">Active (visible in marketplace)</Label>
            </div>
          </div>

          <DialogFooter compact>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNest}
              disabled={isSaving || !nestForm.name}
              className={BUTTON_STYLES.primary}
            >
              {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Nest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload CSV Wizard */}
      <NestUploadWizard
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        nestId={selectedNest?.id}
        nestType={selectedNest?.nest_type}
        nestName={selectedNest?.name}
        onImportComplete={handleImportComplete}
      />

      {/* Manage Items Modal */}
      <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
        <DialogContent compact className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1a1a2e] border-white/10">
          <DialogHeader compact>
            <div className="flex items-center justify-between">
              <DialogTitle compact className="text-white">
                Items in {selectedNest?.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedNest && fetchNestItems(selectedNest.id)}
                disabled={loadingItems}
                className="text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${loadingItems ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </DialogHeader>

          <div className="py-2">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
            ) : nestItems.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No items in this nest yet.</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setShowItemsModal(false);
                    setShowUploadModal(true);
                  }}
                  className="text-blue-400 mt-1 text-xs"
                >
                  Upload CSV to add items
                </Button>
              </div>
            ) : (
              <Table compact>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-zinc-400 py-1.5 px-2">#</TableHead>
                    <TableHead className="text-zinc-400 py-1.5 px-2">Name</TableHead>
                    <TableHead className="text-zinc-400 py-1.5 px-2">Details</TableHead>
                    <TableHead className="text-zinc-400 py-1.5 px-2 text-center">Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nestItems.map((item, index) => {
                    const info = getItemDisplayInfo(item);
                    return (
                      <TableRow key={item.id} className="border-white/10">
                        <TableCell className="text-zinc-500 py-1.5 px-2">{index + 1}</TableCell>
                        <TableCell className="py-1.5 px-2">
                          <p className="text-white text-xs">{info.name}</p>
                          <p className="text-[10px] text-zinc-500">{info.email}</p>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs py-1.5 px-2">{info.subtitle}</TableCell>
                        <TableCell className="text-center py-1.5 px-2">
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

          <DialogFooter compact>
            <Button
              variant="outline"
              size="sm"
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
        <DialogContent compact className="max-w-sm bg-[#1a1a2e] border-white/10">
          <DialogHeader compact>
            <DialogTitle compact className="text-white">Delete Nest</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-zinc-300 text-xs">
              Are you sure you want to delete <span className="font-semibold text-white">{selectedNest?.name}</span>?
            </p>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              This will also delete all items and purchase records associated with this nest.
            </p>
          </div>

          <DialogFooter compact>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteNest}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              Delete Nest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
