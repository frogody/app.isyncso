/**
 * AdminApps Page
 * Platform app store and licensing management for administrators
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Package,
  Key,
  Building2,
  Users,
  Euro,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Crown,
  Zap,
  Shield,
  Star,
  ChevronDown,
} from 'lucide-react';
import { getIcon } from '@/lib/iconMap';
import { getStatusColor, getIconColor, BUTTON_STYLES } from '@/lib/adminTheme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

// Stat Card Component
function StatCard({ title, value, change, icon: Icon, color, subtitle }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 mb-0.5">{title}</p>
            <h3 className="text-lg font-bold text-white">{value}</h3>
            {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
            {change && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400">{change}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border',
              getIconColor(color)
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// App Card Component
function AppCard({ app, onEdit, onDelete, onViewLicenses }) {
  const pricingColors = {
    free: 'bg-green-500/20 text-green-400',
    freemium: 'bg-blue-500/20 text-blue-400',
    paid: 'bg-purple-500/20 text-purple-400',
    enterprise: 'bg-orange-500/20 text-orange-400',
  };

  // Map database fields to display values
  const getStatus = () => {
    if (app.is_beta) return 'beta';
    if (app.is_active === false) return 'inactive';
    return app.status || 'active';
  };

  const getPricingModel = () => app.pricing_type || app.pricing_model || 'free';

  const AppIcon = getIcon(app.icon, Package);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <AppIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">{app.name}</h3>
            <p className="text-[10px] text-zinc-400">{app.slug}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white h-6 w-6">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={() => onEdit(app)} className="text-zinc-300 hover:text-white text-xs">
              <Edit className="w-3 h-3 mr-1.5" />
              Edit App
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewLicenses(app)} className="text-zinc-300 hover:text-white text-xs">
              <Key className="w-3 h-3 mr-1.5" />
              View Licenses
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={() => onDelete(app)} className="text-red-400 hover:text-red-300 text-xs">
              <Trash2 className="w-3 h-3 mr-1.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-[10px] text-zinc-400 mb-2 line-clamp-2">{app.description}</p>

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge className={cn('text-[10px] px-1.5 py-px', getStatusColor(getStatus()))}>
          {getStatus()?.replace('_', ' ')}
        </Badge>
        <Badge className={cn('text-[10px] px-1.5 py-px', pricingColors[getPricingModel()] || pricingColors.free)}>
          {getPricingModel()}
        </Badge>
        {(app.is_core || app.module_type === 'core') && (
          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-px">
            <Crown className="w-2.5 h-2.5 mr-0.5" />
            Core
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
        <div>
          <p className="text-[10px] text-zinc-500">Active Licenses</p>
          <p className="text-sm font-semibold text-white">{app.active_licenses || 0}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Revenue</p>
          <p className="text-sm font-semibold text-white">
            €{(app.total_revenue || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// License Row Component
function LicenseRow({ license, onEdit, onRevoke }) {
  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
    expired: { icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    revoked: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    pending: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  };

  const config = statusConfig[license.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const LicenseAppIcon = getIcon(license.app_icon, Package);

  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-800/30 h-9">
      <td className="py-1.5 px-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
            <LicenseAppIcon className="w-3 h-3 text-zinc-300" />
          </div>
          <div>
            <p className="text-xs font-medium text-white">{license.app_name}</p>
            <p className="text-[10px] text-zinc-400">{license.license_type}</p>
          </div>
        </div>
      </td>
      <td className="py-1.5 px-3">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3 text-zinc-400" />
          <span className="text-xs text-zinc-300">{license.company_name}</span>
        </div>
      </td>
      <td className="py-1.5 px-3">
        <Badge className={cn('text-[10px] px-1.5 py-px', config.bg, config.color)}>
          <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
          {license.status}
        </Badge>
      </td>
      <td className="py-1.5 px-3 text-xs text-zinc-400">
        {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
      </td>
      <td className="py-1.5 px-3 text-xs text-zinc-300">€{(license.amount || 0).toLocaleString()}</td>
      <td className="py-1.5 px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white h-6 w-6">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
            <DropdownMenuItem onClick={() => onEdit(license)} className="text-zinc-300 hover:text-white text-xs">
              <Edit className="w-3 h-3 mr-1.5" />
              Edit License
            </DropdownMenuItem>
            {license.status === 'active' && (
              <DropdownMenuItem onClick={() => onRevoke(license)} className="text-red-400 hover:text-red-300 text-xs">
                <XCircle className="w-3 h-3 mr-1.5" />
                Revoke License
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function AdminApps() {
  // useAdmin hook provides admin guard protection
  useAdmin();
  const [activeTab, setActiveTab] = useState('apps');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pricingFilter, setPricingFilter] = useState('all');

  // Modals
  const [showAppModal, setShowAppModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [editingLicense, setEditingLicense] = useState(null);
  const [selectedAppForLicenses, setSelectedAppForLicenses] = useState(null);

  // App Form State
  const [appForm, setAppForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'productivity',
    icon: '',
    pricing_model: 'free',
    base_price: 0,
    status: 'active',
    is_core: false,
    features: [],
    permissions_required: [],
  });

  // License Form State
  const [licenseForm, setLicenseForm] = useState({
    app_id: '',
    company_id: '',
    license_type: 'subscription',
    expires_at: '',
    amount: 0,
    billing_cycle: 'monthly',
    user_limit: null,
    notes: '',
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Get fresh session directly from Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        console.error('[AdminApps] No session available');
        toast.error('Authentication required');
        setIsLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.access_token}`,
      };

      console.log('[AdminApps] Fetching data with headers:', { hasToken: !!currentSession.access_token });

      const [statsRes, appsRes, licensesRes, companiesRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/apps/stats`, { headers }),
        fetch(`${ADMIN_API_URL}/apps`, { headers }),
        fetch(`${ADMIN_API_URL}/licenses`, { headers }),
        fetch(`${ADMIN_API_URL}/companies`, { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApps(data || []);
      }
      if (licensesRes.ok) {
        const data = await licensesRes.json();
        setLicenses(data || []);
      }
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  // Filter apps
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || app.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesPricing = pricingFilter === 'all' || app.pricing_model === pricingFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesPricing;
    });
  }, [apps, searchTerm, categoryFilter, statusFilter, pricingFilter]);

  // Filter licenses
  const filteredLicenses = useMemo(() => {
    return licenses.filter(license => {
      const matchesSearch = license.app_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           license.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesApp = !selectedAppForLicenses || license.app_id === selectedAppForLicenses.id;
      return matchesSearch && matchesApp;
    });
  }, [licenses, searchTerm, selectedAppForLicenses]);

  // Helper to get fresh auth headers
  async function getAuthHeaders() {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentSession.access_token}`,
    };
  }

  // Handle app save
  async function handleSaveApp() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${ADMIN_API_URL}/apps`, {
        method: 'POST',
        headers,
        body: JSON.stringify(editingApp ? { ...appForm, id: editingApp.id } : appForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save app');
      }

      toast.success(editingApp ? 'App updated successfully' : 'App created successfully');
      setShowAppModal(false);
      setEditingApp(null);
      resetAppForm();
      fetchData();
    } catch (error) {
      console.error('Error saving app:', error);
      toast.error(error.message);
    }
  }

  // Handle app delete
  async function handleDeleteApp(app) {
    if (!confirm(`Are you sure you want to delete "${app.name}"?`)) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${ADMIN_API_URL}/apps/${app.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete app');
      }

      toast.success('App deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting app:', error);
      toast.error(error.message);
    }
  }

  // Handle license save
  async function handleSaveLicense() {
    try {
      const headers = await getAuthHeaders();
      const endpoint = editingLicense
        ? `${ADMIN_API_URL}/licenses/${editingLicense.id}`
        : `${ADMIN_API_URL}/licenses`;

      const response = await fetch(endpoint, {
        method: editingLicense ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(licenseForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save license');
      }

      toast.success(editingLicense ? 'License updated successfully' : 'License granted successfully');
      setShowLicenseModal(false);
      setEditingLicense(null);
      resetLicenseForm();
      fetchData();
    } catch (error) {
      console.error('Error saving license:', error);
      toast.error(error.message);
    }
  }

  // Handle license revoke
  async function handleRevokeLicense(license) {
    if (!confirm(`Are you sure you want to revoke this license for ${license.company_name}?`)) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${ADMIN_API_URL}/licenses/${license.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'revoked' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke license');
      }

      toast.success('License revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Error revoking license:', error);
      toast.error(error.message);
    }
  }

  // Open edit app modal
  function openEditAppModal(app) {
    setEditingApp(app);
    // Map database fields to form fields
    const getStatus = () => {
      if (app.is_beta) return 'beta';
      if (app.is_active === false) return 'inactive';
      return 'active';
    };
    setAppForm({
      name: app.name || '',
      slug: app.slug || '',
      description: app.description || '',
      category: app.category || 'productivity',
      icon: app.icon || '',
      pricing_model: app.pricing_type || app.pricing_model || 'free',
      base_price: app.price_monthly || app.base_price || 0,
      status: getStatus(),
      is_core: app.is_core || app.module_type === 'core',
      features: app.features || [],
      permissions_required: app.required_permissions || app.permissions_required || [],
    });
    setShowAppModal(true);
  }

  // Open edit license modal
  function openEditLicenseModal(license) {
    setEditingLicense(license);
    setLicenseForm({
      app_id: license.app_id || '',
      company_id: license.company_id || '',
      license_type: license.license_type || 'subscription',
      expires_at: license.expires_at ? license.expires_at.split('T')[0] : '',
      amount: license.amount || 0,
      billing_cycle: license.billing_cycle || 'monthly',
      user_limit: license.user_limit || null,
      notes: license.notes || '',
      status: license.status || 'active',
    });
    setShowLicenseModal(true);
  }

  // Reset forms
  function resetAppForm() {
    setAppForm({
      name: '',
      slug: '',
      description: '',
      category: 'productivity',
      icon: '',
      pricing_model: 'free',
      base_price: 0,
      status: 'active',
      is_core: false,
      features: [],
      permissions_required: [],
    });
  }

  function resetLicenseForm() {
    setLicenseForm({
      app_id: '',
      company_id: '',
      license_type: 'subscription',
      expires_at: '',
      amount: 0,
      billing_cycle: 'monthly',
      user_limit: null,
      notes: '',
    });
  }

  // View licenses for app
  function handleViewLicenses(app) {
    setSelectedAppForLicenses(app);
    setActiveTab('licenses');
  }

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">App Store Management</h1>
          <p className="text-zinc-400 text-xs">Manage platform apps and licenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              resetLicenseForm();
              setEditingLicense(null);
              setShowLicenseModal(true);
            }}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:text-white h-7 text-xs"
          >
            <Key className="w-3 h-3 mr-1.5" />
            Grant License
          </Button>
          <Button
            onClick={() => {
              resetAppForm();
              setEditingApp(null);
              setShowAppModal(true);
            }}
            size="sm"
            className="bg-red-500 hover:bg-red-600 h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Add App
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Apps"
          value={stats?.total_apps || 0}
          icon={Package}
          color="blue"
          subtitle={`${stats?.active_apps || 0} active`}
        />
        <StatCard
          title="Active Licenses"
          value={stats?.active_licenses || 0}
          icon={Key}
          color="green"
        />
        <StatCard
          title="Licensed Companies"
          value={stats?.licensed_companies || 0}
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Monthly Revenue"
          value={`€${(stats?.monthly_revenue || 0).toLocaleString()}`}
          icon={Euro}
          color="orange"
          change={stats?.revenue_change}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="apps" className="data-[state=active]:bg-zinc-800 text-xs">
              <Package className="w-3 h-3 mr-1.5" />
              Apps
            </TabsTrigger>
            <TabsTrigger value="licenses" className="data-[state=active]:bg-zinc-800 text-xs">
              <Key className="w-3 h-3 mr-1.5" />
              Licenses
              {selectedAppForLicenses && (
                <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-px">
                  {selectedAppForLicenses.name}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-zinc-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-zinc-900 border-zinc-800 text-white w-48 h-7 text-xs"
              />
            </div>

            {activeTab === 'apps' && (
              <>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800 text-zinc-300 h-7 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                    <SelectItem value="productivity" className="text-xs">Productivity</SelectItem>
                    <SelectItem value="communication" className="text-xs">Communication</SelectItem>
                    <SelectItem value="analytics" className="text-xs">Analytics</SelectItem>
                    <SelectItem value="automation" className="text-xs">Automation</SelectItem>
                    <SelectItem value="ai" className="text-xs">AI & ML</SelectItem>
                    <SelectItem value="integration" className="text-xs">Integrations</SelectItem>
                    <SelectItem value="security" className="text-xs">Security</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28 bg-zinc-900 border-zinc-800 text-zinc-300 h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all" className="text-xs">All Status</SelectItem>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="beta" className="text-xs">Beta</SelectItem>
                    <SelectItem value="coming_soon" className="text-xs">Coming Soon</SelectItem>
                    <SelectItem value="deprecated" className="text-xs">Deprecated</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={pricingFilter} onValueChange={setPricingFilter}>
                  <SelectTrigger className="w-28 bg-zinc-900 border-zinc-800 text-zinc-300 h-7 text-xs">
                    <SelectValue placeholder="Pricing" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all" className="text-xs">All Pricing</SelectItem>
                    <SelectItem value="free" className="text-xs">Free</SelectItem>
                    <SelectItem value="freemium" className="text-xs">Freemium</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                    <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {activeTab === 'licenses' && selectedAppForLicenses && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAppForLicenses(null)}
                className="border-zinc-700 text-zinc-300 h-7 text-xs"
              >
                <XCircle className="w-3 h-3 mr-1.5" />
                Clear Filter
              </Button>
            )}
          </div>
        </div>

        {/* Apps Tab */}
        <TabsContent value="apps" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onEdit={openEditAppModal}
                onDelete={handleDeleteApp}
                onViewLicenses={handleViewLicenses}
              />
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-white mb-1">No apps found</h3>
              <p className="text-zinc-400 text-xs mb-3">
                {searchTerm ? 'Try adjusting your search' : 'Create your first app to get started'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => {
                    resetAppForm();
                    setEditingApp(null);
                    setShowAppModal(true);
                  }}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add App
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses" className="space-y-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/50">
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">App</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Company</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Expires</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Amount</th>
                      <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLicenses.map((license) => (
                      <LicenseRow
                        key={license.id}
                        license={license}
                        onEdit={openEditLicenseModal}
                        onRevoke={handleRevokeLicense}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLicenses.length === 0 && (
                <div className="text-center py-8">
                  <Key className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-white mb-1">No licenses found</h3>
                  <p className="text-zinc-400 text-xs mb-3">
                    {selectedAppForLicenses
                      ? `No licenses for ${selectedAppForLicenses.name}`
                      : 'Grant your first license to get started'}
                  </p>
                  <Button
                    onClick={() => {
                      resetLicenseForm();
                      if (selectedAppForLicenses) {
                        setLicenseForm((prev) => ({ ...prev, app_id: selectedAppForLicenses.id }));
                      }
                      setEditingLicense(null);
                      setShowLicenseModal(true);
                    }}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1.5" />
                    Grant License
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* App Modal */}
      <Dialog open={showAppModal} onOpenChange={setShowAppModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">
              {editingApp ? 'Edit App' : 'Create New App'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              {editingApp ? 'Update app details' : 'Add a new app to the platform'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Name</Label>
                <Input
                  value={appForm.name}
                  onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                  placeholder="App Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Slug</Label>
                <Input
                  value={appForm.slug}
                  onChange={(e) => setAppForm({ ...appForm, slug: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                  placeholder="app-slug"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Description</Label>
              <Textarea
                value={appForm.description}
                onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white text-xs min-h-[60px]"
                placeholder="App description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Category</Label>
                <Select
                  value={appForm.category}
                  onValueChange={(value) => setAppForm({ ...appForm, category: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="productivity" className="text-xs">Productivity</SelectItem>
                    <SelectItem value="communication" className="text-xs">Communication</SelectItem>
                    <SelectItem value="analytics" className="text-xs">Analytics</SelectItem>
                    <SelectItem value="automation" className="text-xs">Automation</SelectItem>
                    <SelectItem value="ai" className="text-xs">AI & ML</SelectItem>
                    <SelectItem value="integration" className="text-xs">Integrations</SelectItem>
                    <SelectItem value="security" className="text-xs">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Icon (emoji)</Label>
                <Input
                  value={appForm.icon}
                  onChange={(e) => setAppForm({ ...appForm, icon: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                  placeholder="📦"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Pricing Model</Label>
                <Select
                  value={appForm.pricing_model}
                  onValueChange={(value) => setAppForm({ ...appForm, pricing_model: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="free" className="text-xs">Free</SelectItem>
                    <SelectItem value="freemium" className="text-xs">Freemium</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                    <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Base Price</Label>
                <Input
                  type="number"
                  value={appForm.base_price}
                  onChange={(e) => setAppForm({ ...appForm, base_price: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Status</Label>
                <Select
                  value={appForm.status}
                  onValueChange={(value) => setAppForm({ ...appForm, status: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="beta" className="text-xs">Beta</SelectItem>
                    <SelectItem value="coming_soon" className="text-xs">Coming Soon</SelectItem>
                    <SelectItem value="deprecated" className="text-xs">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
              <div>
                <Label className="text-zinc-300 text-xs">Core App</Label>
                <p className="text-[10px] text-zinc-500">Mark as core platform feature</p>
              </div>
              <Switch
                checked={appForm.is_core}
                onCheckedChange={(checked) => setAppForm({ ...appForm, is_core: checked })}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowAppModal(false)}
              className="border-zinc-700 text-zinc-300 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveApp}
              className="bg-red-500 hover:bg-red-600 h-7 text-xs"
            >
              {editingApp ? 'Update App' : 'Create App'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* License Modal */}
      <Dialog open={showLicenseModal} onOpenChange={setShowLicenseModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">
              {editingLicense ? 'Edit License' : 'Grant License'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              {editingLicense ? 'Update license details' : 'Grant app access to a company'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">App</Label>
              <Select
                value={licenseForm.app_id}
                onValueChange={(value) => setLicenseForm({ ...licenseForm, app_id: value })}
                disabled={!!editingLicense}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                  <SelectValue placeholder="Select app" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id} className="text-xs">
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Company</Label>
              <Select
                value={licenseForm.company_id}
                onValueChange={(value) => setLicenseForm({ ...licenseForm, company_id: value })}
                disabled={!!editingLicense}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id} className="text-xs">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">License Type</Label>
                <Select
                  value={licenseForm.license_type}
                  onValueChange={(value) => setLicenseForm({ ...licenseForm, license_type: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="trial" className="text-xs">Trial</SelectItem>
                    <SelectItem value="subscription" className="text-xs">Subscription</SelectItem>
                    <SelectItem value="perpetual" className="text-xs">Lifetime</SelectItem>
                    <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Billing Cycle</Label>
                <Select
                  value={licenseForm.billing_cycle}
                  onValueChange={(value) => setLicenseForm({ ...licenseForm, billing_cycle: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                    <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                    <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
                    <SelectItem value="one_time" className="text-xs">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Amount (€)</Label>
                <Input
                  type="number"
                  value={licenseForm.amount}
                  onChange={(e) => setLicenseForm({ ...licenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">User Limit</Label>
                <Input
                  type="number"
                  value={licenseForm.user_limit || ''}
                  onChange={(e) => setLicenseForm({ ...licenseForm, user_limit: e.target.value ? parseInt(e.target.value) : null })}
                  className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Expires At</Label>
              <Input
                type="date"
                value={licenseForm.expires_at}
                onChange={(e) => setLicenseForm({ ...licenseForm, expires_at: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs"
              />
            </div>

            {editingLicense && (
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Status</Label>
                <Select
                  value={licenseForm.status}
                  onValueChange={(value) => setLicenseForm({ ...licenseForm, status: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="expired" className="text-xs">Expired</SelectItem>
                    <SelectItem value="revoked" className="text-xs">Revoked</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Notes</Label>
              <Textarea
                value={licenseForm.notes}
                onChange={(e) => setLicenseForm({ ...licenseForm, notes: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white text-xs min-h-[50px]"
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowLicenseModal(false)}
              className="border-zinc-700 text-zinc-300 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLicense}
              className="bg-red-500 hover:bg-red-600 h-7 text-xs"
            >
              {editingLicense ? 'Update License' : 'Grant License'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
