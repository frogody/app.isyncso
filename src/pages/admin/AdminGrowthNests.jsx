/**
 * Admin Growth Nests Management Page
 * Allows platform admins to manage purchasable lead datasets for the Growth module
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  DollarSign,
  Users,
  TrendingUp,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Star,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { NestUploadWizard } from '@/components/admin/NestUploadWizard';

// Badge color mapping
const BADGE_COLORS = {
  popular: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  new: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  best_value: 'bg-green-500/20 text-green-400 border-green-500/30',
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

// Glass card component
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Stat card component
const StatCard = ({ icon: Icon, label, value, trend }) => (
  <GlassCard className="p-4">
    <div className="flex items-center justify-between mb-2">
      <Icon className="w-5 h-5 text-cyan-400" />
      {trend && (
        <Badge className="bg-green-500/20 text-green-400 text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          {trend}
        </Badge>
      )}
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-sm text-zinc-400">{label}</p>
  </GlassCard>
);

export default function AdminGrowthNests() {
  // State
  const [nests, setNests] = useState([]);
  const [stats, setStats] = useState({
    total_nests: 0,
    active_nests: 0,
    total_leads: 0,
    total_purchases: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedNest, setSelectedNest] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [nestForm, setNestForm] = useState({
    name: '',
    description: '',
    short_description: '',
    industry: '',
    region: '',
    lead_count: 0,
    titles: [],
    included_fields: [],
    price_credits: 99,
    price_usd: 49.00,
    is_active: false,
    is_featured: false,
    badge: null,
  });
  const [titlesInput, setTitlesInput] = useState('');

  // CSV upload state
  const fileInputRef = useRef(null);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [csvFile, setCsvFile] = useState(null);

  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importNest, setImportNest] = useState(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data: nestsData } = await supabase
        .from('growth_nests')
        .select('id, is_active, lead_count');

      const { data: purchasesData } = await supabase
        .from('growth_nest_purchases')
        .select('id')
        .eq('status', 'completed');

      setStats({
        total_nests: nestsData?.length || 0,
        active_nests: nestsData?.filter(n => n.is_active).length || 0,
        total_leads: nestsData?.reduce((sum, n) => sum + (n.lead_count || 0), 0) || 0,
        total_purchases: purchasesData?.length || 0,
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
        .from('growth_nests')
        .select(`
          *,
          growth_nest_purchases(count)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNests(data || []);
    } catch (err) {
      console.error('Failed to fetch nests:', err);
      toast.error('Failed to load growth nests');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    fetchNests();
    fetchStats();
  }, [fetchNests, fetchStats]);

  // Reset form
  const resetForm = () => {
    setNestForm({
      name: '',
      description: '',
      short_description: '',
      industry: '',
      region: '',
      lead_count: 0,
      titles: [],
      included_fields: [],
      price_credits: 99,
      price_usd: 49.00,
      is_active: false,
      is_featured: false,
      badge: null,
    });
    setTitlesInput('');
    setCsvFile(null);
    setSelectedNest(null);
    setIsEditing(false);
  };

  // Open create modal
  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleEdit = (nest) => {
    setSelectedNest(nest);
    setNestForm({
      name: nest.name || '',
      description: nest.description || '',
      short_description: nest.short_description || '',
      industry: nest.industry || '',
      region: nest.region || '',
      lead_count: nest.lead_count || 0,
      titles: nest.titles || [],
      included_fields: nest.included_fields || [],
      price_credits: nest.price_credits || 99,
      price_usd: nest.price_usd || 49.00,
      is_active: nest.is_active || false,
      is_featured: nest.is_featured || false,
      badge: nest.badge || null,
    });
    setTitlesInput((nest.titles || []).join(', '));
    setIsEditing(true);
    setShowCreateModal(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedNest) return;
    try {
      const { error } = await supabase
        .from('growth_nests')
        .delete()
        .eq('id', selectedNest.id);

      if (error) throw error;
      toast.success('Growth nest deleted');
      fetchNests();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete nest:', err);
      toast.error('Failed to delete nest');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedNest(null);
    }
  };

  // Toggle active status
  const handleToggleActive = async (nest) => {
    try {
      const { error } = await supabase
        .from('growth_nests')
        .update({ is_active: !nest.is_active })
        .eq('id', nest.id);

      if (error) throw error;
      toast.success(nest.is_active ? 'Nest deactivated' : 'Nest activated');
      fetchNests();
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error('Failed to update status');
    }
  };

  // Toggle featured status
  const handleToggleFeatured = async (nest) => {
    try {
      const { error } = await supabase
        .from('growth_nests')
        .update({ is_featured: !nest.is_featured })
        .eq('id', nest.id);

      if (error) throw error;
      toast.success(nest.is_featured ? 'Removed from featured' : 'Added to featured');
      fetchNests();
    } catch (err) {
      console.error('Failed to toggle featured:', err);
      toast.error('Failed to update featured status');
    }
  };

  // Handle CSV file selection
  const handleCSVSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    // Parse CSV to get row count and detect columns
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
      const rowCount = lines.length - 1; // Exclude header

      setNestForm(prev => ({
        ...prev,
        lead_count: rowCount,
        column_schema: headers.map((name, index) => ({
          name,
          type: 'field',
          position: index,
        })),
        included_fields: headers.filter(h =>
          ['email', 'phone', 'linkedin', 'company', 'title', 'name', 'location'].some(
            f => h.toLowerCase().includes(f)
          )
        ),
      }));

      toast.success(`CSV loaded: ${rowCount} leads detected`);
    } catch (err) {
      console.error('Failed to parse CSV:', err);
      toast.error('Failed to parse CSV file');
    }
  };

  // Save nest
  const handleSave = async () => {
    if (!nestForm.name) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Parse titles from input
      const titles = titlesInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      // Upload CSV if present
      let csvPath = selectedNest?.csv_storage_path;
      if (csvFile) {
        const fileName = `${Date.now()}_${csvFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('growth-nests')
          .upload(fileName, csvFile);

        if (uploadError) {
          console.error('Failed to upload CSV:', uploadError);
          toast.error('Failed to upload CSV');
        } else {
          csvPath = fileName;
        }
      }

      // Generate preview data (masked sample rows)
      let previewData = selectedNest?.preview_data || [];
      if (csvFile && nestForm.column_schema) {
        try {
          const text = await csvFile.text();
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));

          previewData = lines.slice(1, 6).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, i) => {
              let value = values[i] || '';
              // Mask sensitive data
              if (header.toLowerCase().includes('email') && value.includes('@')) {
                const [local, domain] = value.split('@');
                value = `${local[0]}***@${domain}`;
              } else if (header.toLowerCase().includes('phone') && value.length > 4) {
                value = `***-***-${value.slice(-4)}`;
              }
              row[header] = value;
            });
            return row;
          });
        } catch (err) {
          console.error('Failed to generate preview:', err);
        }
      }

      const nestData = {
        name: nestForm.name,
        description: nestForm.description,
        short_description: nestForm.short_description,
        industry: nestForm.industry,
        region: nestForm.region,
        lead_count: nestForm.lead_count,
        titles,
        included_fields: nestForm.included_fields,
        price_credits: nestForm.price_credits,
        price_usd: nestForm.price_usd,
        is_active: nestForm.is_active,
        is_featured: nestForm.is_featured,
        badge: nestForm.badge || null,
        csv_storage_path: csvPath,
        column_schema: nestForm.column_schema || [],
        preview_data: previewData,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && selectedNest) {
        const { error } = await supabase
          .from('growth_nests')
          .update(nestData)
          .eq('id', selectedNest.id);

        if (error) throw error;
        toast.success('Growth nest updated');
      } else {
        const { error } = await supabase
          .from('growth_nests')
          .insert(nestData);

        if (error) throw error;
        toast.success('Growth nest created');
      }

      setShowCreateModal(false);
      resetForm();
      fetchNests();
      fetchStats();
    } catch (err) {
      console.error('Failed to save nest:', err);
      toast.error('Failed to save growth nest');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter nests
  const filteredNests = nests.filter(nest =>
    !searchQuery || nest.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <PageHeader
          title="Growth Nests"
          subtitle="Manage purchasable lead datasets for the Growth module"
          icon={Package}
          actions={
            <Button
              onClick={handleCreate}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Nest
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Package} label="Total Nests" value={stats.total_nests} />
          <StatCard icon={CheckCircle} label="Active Nests" value={stats.active_nests} />
          <StatCard icon={Users} label="Total Leads" value={stats.total_leads.toLocaleString()} />
          <StatCard icon={TrendingUp} label="Total Purchases" value={stats.total_purchases} />
        </div>

        {/* Search */}
        <GlassCard className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search nests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700"
            />
          </div>
        </GlassCard>

        {/* Table */}
        <GlassCard className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Industry</TableHead>
                <TableHead className="text-zinc-400">Region</TableHead>
                <TableHead className="text-zinc-400 text-right">Leads</TableHead>
                <TableHead className="text-zinc-400 text-right">Price</TableHead>
                <TableHead className="text-zinc-400 text-center">Status</TableHead>
                <TableHead className="text-zinc-400 text-center">Featured</TableHead>
                <TableHead className="text-zinc-400 text-right">Purchases</TableHead>
                <TableHead className="text-zinc-400 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                  </TableCell>
                </TableRow>
              ) : filteredNests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-zinc-500">
                    No growth nests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredNests.map((nest) => (
                  <TableRow key={nest.id} className="border-zinc-800 hover:bg-zinc-800/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{nest.name}</span>
                        {nest.badge && (
                          <Badge className={BADGE_COLORS[nest.badge]}>
                            {nest.badge === 'popular' && <Star className="w-3 h-3 mr-1" />}
                            {nest.badge === 'new' && <Sparkles className="w-3 h-3 mr-1" />}
                            {nest.badge === 'best_value' && <Tag className="w-3 h-3 mr-1" />}
                            {nest.badge}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400">{nest.industry || '-'}</TableCell>
                    <TableCell className="text-zinc-400">{nest.region || '-'}</TableCell>
                    <TableCell className="text-right text-white">
                      {(nest.lead_count || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="text-cyan-400">{nest.price_credits} credits</span>
                        <span className="text-zinc-500 text-sm ml-1">
                          / {formatCurrency(nest.price_usd)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={nest.is_active}
                        onCheckedChange={() => handleToggleActive(nest)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={nest.is_featured}
                        onCheckedChange={() => handleToggleFeatured(nest)}
                      />
                    </TableCell>
                    <TableCell className="text-right text-zinc-400">
                      {nest.growth_nest_purchases?.[0]?.count || 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                          <DropdownMenuItem onClick={() => handleEdit(nest)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setImportNest(nest);
                            setShowImportWizard(true);
                          }}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Data
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedNest(nest);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </GlassCard>

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {isEditing ? 'Edit Growth Nest' : 'Create Growth Nest'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-zinc-400">Name *</Label>
                  <Input
                    value={nestForm.name}
                    onChange={(e) => setNestForm({ ...nestForm, name: e.target.value })}
                    placeholder="e.g., US SaaS Tech Leaders"
                    className="bg-zinc-800/50 border-zinc-700 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-zinc-400">Short Description</Label>
                  <Input
                    value={nestForm.short_description}
                    onChange={(e) => setNestForm({ ...nestForm, short_description: e.target.value })}
                    placeholder="Brief tagline for the marketplace"
                    className="bg-zinc-800/50 border-zinc-700 mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-zinc-400">Description</Label>
                  <Textarea
                    value={nestForm.description}
                    onChange={(e) => setNestForm({ ...nestForm, description: e.target.value })}
                    placeholder="Full description of the nest contents..."
                    className="bg-zinc-800/50 border-zinc-700 mt-1"
                    rows={3}
                  />
                </div>
              </div>

              {/* Categorization */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400">Industry</Label>
                  <Select
                    value={nestForm.industry}
                    onValueChange={(v) => setNestForm({ ...nestForm, industry: v })}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 mt-1">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="FinTech">FinTech</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-400">Region</Label>
                  <Select
                    value={nestForm.region}
                    onValueChange={(v) => setNestForm({ ...nestForm, region: v })}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 mt-1">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Europe">Europe</SelectItem>
                      <SelectItem value="North America">North America</SelectItem>
                      <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
                      <SelectItem value="Global">Global</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <Label className="text-zinc-400">Job Titles (comma-separated)</Label>
                <Input
                  value={titlesInput}
                  onChange={(e) => setTitlesInput(e.target.value)}
                  placeholder="VP of Sales, Director of Marketing, CTO"
                  className="bg-zinc-800/50 border-zinc-700 mt-1"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-zinc-400">Price (Credits)</Label>
                  <Input
                    type="number"
                    value={nestForm.price_credits}
                    onChange={(e) => setNestForm({ ...nestForm, price_credits: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800/50 border-zinc-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={nestForm.price_usd}
                    onChange={(e) => setNestForm({ ...nestForm, price_usd: parseFloat(e.target.value) || 0 })}
                    className="bg-zinc-800/50 border-zinc-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Lead Count</Label>
                  <Input
                    type="number"
                    value={nestForm.lead_count}
                    onChange={(e) => setNestForm({ ...nestForm, lead_count: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800/50 border-zinc-700 mt-1"
                  />
                </div>
              </div>

              {/* Badge */}
              <div>
                <Label className="text-zinc-400">Badge</Label>
                <Select
                  value={nestForm.badge || 'none'}
                  onValueChange={(v) => setNestForm({ ...nestForm, badge: v === 'none' ? null : v })}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 mt-1">
                    <SelectValue placeholder="No badge" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="none">No Badge</SelectItem>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="best_value">Best Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CSV Upload */}
              <div>
                <Label className="text-zinc-400">CSV Data File</Label>
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {csvFile ? csvFile.name : 'Upload CSV'}
                  </Button>
                  {csvFile && (
                    <span className="ml-3 text-sm text-zinc-400">
                      {nestForm.lead_count} leads detected
                    </span>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={nestForm.is_active}
                    onCheckedChange={(checked) => setNestForm({ ...nestForm, is_active: checked })}
                  />
                  <Label className="text-zinc-400">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={nestForm.is_featured}
                    onCheckedChange={(checked) => setNestForm({ ...nestForm, is_featured: checked })}
                  />
                  <Label className="text-zinc-400">Featured</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-cyan-500 hover:bg-cyan-600 text-black"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Delete Growth Nest</DialogTitle>
            </DialogHeader>
            <p className="text-zinc-400">
              Are you sure you want to delete "{selectedNest?.name}"? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Wizard */}
        {importNest && (
          <NestUploadWizard
            open={showImportWizard}
            onOpenChange={(open) => {
              setShowImportWizard(open);
              if (!open) setImportNest(null);
            }}
            nestId={importNest.id}
            nestType="prospects"
            nestName={importNest.name}
            onImportComplete={(result) => {
              fetchNests();
              fetchStats();
              toast.success(`Imported ${result.created_count || 0} prospects into "${importNest.name}"`);
            }}
          />
        )}
      </div>
    </div>
  );
}
