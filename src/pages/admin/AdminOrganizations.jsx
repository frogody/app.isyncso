/**
 * AdminOrganizations Page
 * Organization management for platform administrators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Building2,
  Users,
  Search,
  RefreshCw,
  MoreVertical,
  Edit,
  Eye,
  Globe,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Crown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Briefcase,
  DollarSign,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// API helper - uses user's session token for authentication
async function adminApi(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const url = `${SUPABASE_URL}/functions/v1/admin-api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Stats Card Component
function StatCard({ title, value, icon: Icon, color, isLoading }) {
  const colorClasses = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">{title}</p>
            {isLoading ? (
              <div className="h-9 w-20 bg-zinc-800 animate-pulse rounded" />
            ) : (
              <h3 className="text-3xl font-bold text-white">{value}</h3>
            )}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center border',
              colorClasses[color]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ isActive }) {
  return isActive ? (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
      <CheckCircle className="w-3 h-3 mr-1" />
      Active
    </Badge>
  ) : (
    <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">
      <XCircle className="w-3 h-3 mr-1" />
      Inactive
    </Badge>
  );
}

// Organization Detail Modal
function OrganizationDetailModal({ org, open, onClose, onUpdate, adminRole }) {
  const [orgUsers, setOrgUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (open && org) {
      fetchOrgUsers();
    }
  }, [open, org]);

  const fetchOrgUsers = async () => {
    if (!org) return;
    setIsLoadingUsers(true);
    try {
      const data = await adminApi(`/organizations/${org.id}/users`);
      setOrgUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching org users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  if (!org) return null;

  const getInitials = (name) => {
    if (!name) return 'ORG';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={org.logo_url} />
              <AvatarFallback className="bg-purple-500/20 text-purple-400">
                {getInitials(org.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{org.name}</span>
              {org.domain && (
                <p className="text-sm text-zinc-400 font-normal">{org.domain}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger value="info" className="data-[state=active]:bg-zinc-700">
              Information
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-zinc-700">
              Users ({orgUsers.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-zinc-700">
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Industry
                </Label>
                <p className="text-white">{org.industry || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Company Size</Label>
                <p className="text-white">{org.size || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Website
                </Label>
                <p className="text-white">
                  {org.website ? (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {org.website}
                    </a>
                  ) : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> Domain
                </Label>
                <p className="text-white">{org.domain || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location
                </Label>
                <p className="text-white">{org.location || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Revenue
                </Label>
                <p className="text-white">{org.revenue || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Created
                </Label>
                <p className="text-white">
                  {org.created_date ? new Date(org.created_date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Status</Label>
                <StatusBadge isActive={org.is_active} />
              </div>
            </div>

            {org.description && (
              <div className="pt-4 border-t border-zinc-800">
                <Label className="text-zinc-400 text-xs">Description</Label>
                <p className="text-white mt-1">{org.description}</p>
              </div>
            )}

            {org.owner && (
              <div className="pt-4 border-t border-zinc-800">
                <Label className="text-zinc-400 text-xs mb-2 block">Owner / Primary Admin</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={org.owner.avatar_url} />
                    <AvatarFallback className="bg-red-500/20 text-red-400">
                      {org.owner.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{org.owner.name || 'Unknown'}</p>
                    <p className="text-zinc-400 text-sm">{org.owner.email}</p>
                  </div>
                </div>
              </div>
            )}

            {org.subscription && (
              <div className="pt-4 border-t border-zinc-800">
                <Label className="text-zinc-400 text-xs mb-2 block">Subscription</Label>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Crown className="w-3 h-3 mr-1" />
                    {org.subscription.plan_name || 'Active Plan'}
                  </Badge>
                  <span className="text-zinc-400 text-sm">
                    {org.subscription.billing_cycle || ''} - {org.subscription.status}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {isLoadingUsers ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin mx-auto" />
              </div>
            ) : orgUsers.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No users found</div>
            ) : (
              <div className="space-y-2">
                {orgUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-red-500/20 text-red-400 text-sm">
                          {(user.full_name || user.name || user.email)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {user.full_name || user.name || 'Unnamed'}
                        </p>
                        <p className="text-zinc-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                        {user.role || 'user'}
                      </Badge>
                      {user.is_active ? (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-zinc-500" title="Inactive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{org.total_users || 0}</div>
                  <p className="text-xs text-zinc-500">{org.active_users || 0} active in 30 days</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Prospects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{org.total_prospects || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-300">Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{org.total_customers || 0}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Edit Organization Modal
function EditOrganizationModal({ org, open, onClose, onSave }) {
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setEditForm({
        name: org.name || '',
        domain: org.domain || '',
        industry: org.industry || '',
        size: org.size || '',
        revenue: org.revenue || '',
        description: org.description || '',
        website: org.website || '',
        linkedin_url: org.linkedin_url || '',
        location: org.location || '',
      });
    }
  }, [org]);

  const handleSave = async () => {
    if (!org) return;
    setIsSaving(true);
    try {
      await adminApi(`/organizations/${org.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      toast.success('Organization updated successfully');
      onSave?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  if (!org) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update organization information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-domain">Domain</Label>
            <Input
              id="edit-domain"
              value={editForm.domain || ''}
              onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-industry">Industry</Label>
            <Input
              id="edit-industry"
              value={editForm.industry || ''}
              onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-size">Size</Label>
            <Select
              value={editForm.size || ''}
              onValueChange={(value) => setEditForm({ ...editForm, size: value })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Startup">Startup (1-10)</SelectItem>
                <SelectItem value="Small">Small (11-50)</SelectItem>
                <SelectItem value="Medium">Medium (51-200)</SelectItem>
                <SelectItem value="Large">Large (201-1000)</SelectItem>
                <SelectItem value="Enterprise">Enterprise (1000+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-website">Website</Label>
            <Input
              id="edit-website"
              value={editForm.website || ''}
              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-linkedin">LinkedIn</Label>
            <Input
              id="edit-linkedin"
              value={editForm.linkedin_url || ''}
              onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={editForm.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-revenue">Revenue</Label>
            <Input
              id="edit-revenue"
              value={editForm.revenue || ''}
              onChange={(e) => setEditForm({ ...editForm, revenue: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function AdminOrganizations() {
  const { adminRole } = useAdmin();

  // State
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState({
    total_organizations: 0,
    active_organizations: 0,
    new_this_month: 0,
    with_subscription: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Industries for filter
  const [industries, setIndustries] = useState([]);

  // Modals
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (search) params.append('search', search);
      if (industryFilter !== 'all') params.append('industry', industryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const data = await adminApi(`/organizations?${params.toString()}`);
      setOrganizations(data.organizations || []);
      const total = data.pagination?.total || data.total || 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / limit));

      // Extract unique industries for filter
      const uniqueIndustries = [...new Set(
        (data.organizations || [])
          .map(o => o.industry)
          .filter(Boolean)
      )];
      if (uniqueIndustries.length > industries.length) {
        setIndustries(uniqueIndustries);
      }
    } catch (error) {
      console.error('[AdminOrganizations] Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, industryFilter, statusFilter, sortBy, sortOrder]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await adminApi('/organization-stats');
      setStats(data.stats || data);

      // Also extract industries from stats if available
      if (data.stats?.industry_distribution) {
        const inds = Object.keys(data.stats.industry_distribution).filter(i => i !== 'Unknown');
        if (inds.length > industries.length) {
          setIndustries(inds);
        }
      }
    } catch (error) {
      console.error('[AdminOrganizations] Error fetching stats:', error);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch organizations when filters change
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, industryFilter, statusFilter]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // View organization details
  const handleViewOrg = async (org) => {
    try {
      const data = await adminApi(`/organizations/${org.id}`);
      setSelectedOrg(data.organization || data);
      setIsDetailModalOpen(true);
    } catch (error) {
      toast.error('Failed to load organization details');
    }
  };

  // Edit organization
  const handleEditOrg = (org) => {
    setSelectedOrg(org);
    setIsEditModalOpen(true);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchOrganizations();
    fetchStats();
  };

  const getInitials = (name) => {
    if (!name) return 'ORG';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canEdit = adminRole === 'super_admin' || adminRole === 'admin';

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Organizations</h1>
            <p className="text-zinc-400 mt-1">
              Manage all organizations on the platform
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Organizations"
          value={stats.total_organizations?.toLocaleString()}
          icon={Building2}
          color="purple"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="Active Organizations"
          value={stats.active_organizations?.toLocaleString()}
          icon={CheckCircle}
          color="green"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="New This Month"
          value={stats.new_this_month?.toLocaleString()}
          icon={TrendingUp}
          color="blue"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="With Subscription"
          value={stats.with_subscription?.toLocaleString()}
          icon={Crown}
          color="yellow"
          isLoading={isStatsLoading}
        />
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-800 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search organizations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* Industry Filter */}
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
              const [by, order] = v.split('-');
              setSortBy(by);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="total_users-desc">Most Users</SelectItem>
                <SelectItem value="total_users-asc">Fewest Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Organizations ({totalCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mx-auto mb-2" />
              <p className="text-zinc-500">Loading organizations...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No organizations found</p>
              <p className="text-zinc-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Organization</th>
                      <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Industry</th>
                      <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Location</th>
                      <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Users</th>
                      <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-xs text-zinc-400 font-medium px-4 py-3">Created</th>
                      <th className="text-right text-xs text-zinc-400 font-medium px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    <AnimatePresence>
                      {organizations.map((org, index) => (
                        <motion.tr
                          key={org.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-zinc-800/30 transition-colors"
                        >
                          {/* Organization Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={org.logo_url} />
                                <AvatarFallback className="bg-purple-500/20 text-purple-400 text-sm">
                                  {getInitials(org.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white font-medium">{org.name}</p>
                                <p className="text-zinc-500 text-sm">{org.domain || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Industry */}
                          <td className="px-4 py-3">
                            <span className="text-zinc-300 text-sm">
                              {org.industry || '-'}
                            </span>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-3">
                            <span className="text-zinc-300 text-sm">
                              {org.location || '-'}
                            </span>
                          </td>

                          {/* Users */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-zinc-500" />
                              <span className="text-zinc-300">{org.total_users || 0}</span>
                              {org.active_users > 0 && (
                                <span className="text-xs text-green-500">
                                  ({org.active_users} active)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge isActive={org.is_active} />
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3">
                            <span className="text-zinc-400 text-sm">
                              {org.created_date
                                ? new Date(org.created_date).toLocaleDateString()
                                : '-'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-zinc-800 border-zinc-700"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleViewOrg(org)}
                                  className="text-zinc-300 hover:text-white focus:text-white"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {canEdit && (
                                  <DropdownMenuItem
                                    onClick={() => handleEditOrg(org)}
                                    className="text-zinc-300 hover:text-white focus:text-white"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-500">
                    Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, totalCount)} of {totalCount} organizations
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-zinc-400">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Organization Detail Modal */}
      <OrganizationDetailModal
        org={selectedOrg}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrg(null);
        }}
        onUpdate={handleRefresh}
        adminRole={adminRole}
      />

      {/* Edit Organization Modal */}
      <EditOrganizationModal
        org={selectedOrg}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedOrg(null);
        }}
        onSave={handleRefresh}
      />
    </div>
  );
}
