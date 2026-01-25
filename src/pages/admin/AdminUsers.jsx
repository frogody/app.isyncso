/**
 * AdminUsers Page
 * User management for platform administrators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Users,
  UserPlus,
  UserCheck,
  Shield,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
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
  DropdownMenuSeparator,
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
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getRoleColor, getStatusColor, getIconColor } from '@/lib/adminTheme';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// API helper - uses user's session token for authentication
async function adminApi(endpoint, options = {}) {
  // Get the current session to get the user's access token
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
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-400 mb-0.5">{title}</p>
            {isLoading ? (
              <div className="h-6 w-16 bg-zinc-800 animate-pulse rounded" />
            ) : (
              <h3 className="text-lg font-bold text-white">{value}</h3>
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

// Role Badge Component
function RoleBadge({ role }) {
  return (
    <Badge className={cn('text-[10px] px-1.5 py-px', getRoleColor(role))}>
      {role?.replace('_', ' ') || 'User'}
    </Badge>
  );
}

// Status Badge Component
function StatusBadge({ isActive, isPlatformAdmin }) {
  if (isPlatformAdmin) {
    return (
      <Badge className={cn('text-[10px] px-1.5 py-px', getStatusColor('platform_admin'))}>
        <Shield className="w-2.5 h-2.5 mr-0.5" />
        Platform Admin
      </Badge>
    );
  }

  return isActive ? (
    <Badge className={cn('text-[10px] px-1.5 py-px', getStatusColor('active'))}>
      <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
      Active
    </Badge>
  ) : (
    <Badge className={cn('text-[10px] px-1.5 py-px', getStatusColor('inactive'))}>
      <Clock className="w-2.5 h-2.5 mr-0.5" />
      Inactive
    </Badge>
  );
}

// User Detail Modal
function UserDetailModal({ user, open, onClose, onUpdate, adminRole }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (user) {
      setEditData({
        role: user.role || 'user',
        job_title: user.job_title || '',
        credits: user.credits || 0,
        full_name: user.full_name || user.name || '',
      });
    }
    setIsEditing(false);
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await adminApi(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(editData),
      });
      toast.success('User updated successfully');
      onUpdate?.();
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const canEdit = adminRole === 'super_admin' || adminRole === 'admin';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-red-500/20 text-red-400">
                {(user.full_name || user.name || user.email)?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{user.full_name || user.name || 'Unnamed User'}</span>
              <p className="text-sm text-zinc-400 font-normal">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Row */}
          <div className="flex items-center gap-3">
            <RoleBadge role={user.role} />
            <StatusBadge isActive={user.is_active_recently} isPlatformAdmin={user.is_platform_admin} />
            {user.platform_admin_role && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                {user.platform_admin_role.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Company</Label>
              <p className="text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-500" />
                {user.company_name || 'No company'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Credits</Label>
              <p className="text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-500" />
                {user.credits || 0}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Created</Label>
              <p className="text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-500" />
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-400 text-xs">Last Active</Label>
              <p className="text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                {user.last_active_at
                  ? new Date(user.last_active_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          {isEditing && canEdit && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editData.full_name}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-job">Job Title</Label>
                  <Input
                    id="edit-job"
                    value={editData.job_title}
                    onChange={(e) => setEditData({ ...editData, job_title: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editData.role}
                    onValueChange={(value) => setEditData({ ...editData, role: value })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="learner">Learner</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-credits">Credits</Label>
                  <Input
                    id="edit-credits"
                    type="number"
                    value={editData.credits}
                    onChange={(e) => setEditData({ ...editData, credits: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Team Memberships */}
          {user.team_memberships?.length > 0 && (
            <div className="pt-4 border-t border-zinc-800">
              <Label className="text-zinc-400 text-xs mb-2 block">Team Memberships</Label>
              <div className="flex flex-wrap gap-2">
                {user.team_memberships.map((tm, idx) => (
                  <Badge key={idx} variant="outline" className="border-zinc-700 text-zinc-300">
                    {tm.team_name || `Team ${idx + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* RBAC Roles */}
          {user.rbac_roles?.length > 0 && (
            <div className="pt-4 border-t border-zinc-800">
              <Label className="text-zinc-400 text-xs mb-2 block">RBAC Roles</Label>
              <div className="flex flex-wrap gap-2">
                {user.rbac_roles.map((role, idx) => (
                  <Badge key={idx} className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {role.role_name || role.role_id}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {canEdit && (
            <>
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
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
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export default function AdminUsers() {
  const { adminRole } = useAdmin();

  // State
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    active_users_30d: 0,
    new_users_month: 0,
    platform_admins: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 25;

  // Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (companyFilter !== 'all') params.append('company_id', companyFilter);
      if (statusFilter !== 'all') params.append('is_active', statusFilter === 'active' ? 'true' : 'false');

      const data = await adminApi(`/users?${params.toString()}`);
      setUsers(data.users || []);
      const total = data.pagination?.total || data.total || 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / limit));
    } catch (error) {
      console.error('[AdminUsers] Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter, companyFilter, statusFilter, sortBy, sortOrder]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await adminApi('/user-stats');
      setStats(data.stats || data);
    } catch (error) {
      console.error('[AdminUsers] Error fetching stats:', error);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch companies for filter
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await adminApi('/companies');
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('[AdminUsers] Error fetching companies:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCompanies();
  }, [fetchStats, fetchCompanies]);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, companyFilter, statusFilter]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // View user details
  const handleViewUser = async (user) => {
    try {
      const data = await adminApi(`/users/${user.id}`);
      setSelectedUser(data.user || data);
      setIsDetailModalOpen(true);
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  // Deactivate user
  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return;
    setIsDeactivating(true);
    try {
      await adminApi(`/users/${userToDeactivate.id}`, {
        method: 'DELETE',
      });
      toast.success('User deactivated successfully');
      setIsDeactivateModalOpen(false);
      setUserToDeactivate(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.message || 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    fetchUsers();
    fetchStats();
  };

  const canDeactivate = adminRole === 'super_admin';

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">User Management</h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            Manage all platform users and their permissions
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-7 text-xs"
        >
          <RefreshCw className={cn('w-3 h-3 mr-1.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Users"
          value={stats.total_users?.toLocaleString()}
          icon={Users}
          color="blue"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="Active (30 days)"
          value={stats.active_users_30d?.toLocaleString()}
          icon={UserCheck}
          color="green"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="New This Month"
          value={stats.new_users_month?.toLocaleString()}
          icon={UserPlus}
          color="purple"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="Platform Admins"
          value={stats.platform_admins?.toLocaleString()}
          icon={Shield}
          color="red"
          isLoading={isStatsLoading}
        />
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-zinc-500" />
              <Input
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                size="sm"
                className="pl-8 h-7 text-xs bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px] h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="learner">Learner</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>

            {/* Company Filter */}
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[150px] h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[300px]">
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
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
              <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="email-asc">Email A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="border-b border-zinc-800 py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-red-400" />
              Users ({totalCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center">
              <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-xs">No users found</p>
              <p className="text-zinc-500 text-[10px] mt-0.5">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">User</th>
                      <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">Role</th>
                      <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">Company</th>
                      <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">Status</th>
                      <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">Last Active</th>
                      <th className="text-left text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">Joined</th>
                      <th className="text-right text-[10px] text-zinc-400 font-medium px-2 py-1.5 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    <AnimatePresence>
                      {users.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-zinc-800/30 transition-colors h-9"
                        >
                          {/* User Info */}
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-red-500/20 text-red-400 text-[9px]">
                                  {(user.full_name || user.name || user.email)?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white font-medium text-xs">
                                  {user.full_name || user.name || 'Unnamed'}
                                </p>
                                <p className="text-zinc-500 text-[10px]">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-2 py-1.5">
                            <RoleBadge role={user.role} />
                          </td>

                          {/* Company */}
                          <td className="px-2 py-1.5">
                            <span className="text-zinc-300 text-xs">
                              {user.company_name || '-'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-2 py-1.5">
                            <StatusBadge
                              isActive={user.is_active_recently}
                              isPlatformAdmin={user.is_platform_admin}
                            />
                          </td>

                          {/* Last Active */}
                          <td className="px-2 py-1.5">
                            <span className="text-zinc-400 text-xs">
                              {user.last_active_at
                                ? new Date(user.last_active_at).toLocaleDateString()
                                : 'Never'}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="px-2 py-1.5">
                            <span className="text-zinc-400 text-xs">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-1.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-zinc-800 border-zinc-700"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleViewUser(user)}
                                  className="text-zinc-300 hover:text-white focus:text-white text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1.5" />
                                  View Details
                                </DropdownMenuItem>
                                {(adminRole === 'super_admin' || adminRole === 'admin') && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewUser(user)}
                                    className="text-zinc-300 hover:text-white focus:text-white text-xs"
                                  >
                                    <Edit className="w-3 h-3 mr-1.5" />
                                    Edit User
                                  </DropdownMenuItem>
                                )}
                                {canDeactivate && user.role !== 'deactivated' && (
                                  <>
                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setUserToDeactivate(user);
                                        setIsDeactivateModalOpen(true);
                                      }}
                                      className="text-red-400 hover:text-red-300 focus:text-red-300 text-xs"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1.5" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  </>
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
                <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500">
                    Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, totalCount)} of {totalCount} users
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-6 w-6 p-0 border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <span className="text-xs text-zinc-400">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-6 w-6 p-0 border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdate={() => {
          fetchUsers();
          fetchStats();
        }}
        adminRole={adminRole}
      />

      {/* Deactivate Confirmation Modal */}
      <Dialog open={isDeactivateModalOpen} onOpenChange={setIsDeactivateModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Deactivate User
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to deactivate{' '}
              <span className="text-white font-medium">
                {userToDeactivate?.full_name || userToDeactivate?.name || userToDeactivate?.email}
              </span>
              ? This will prevent them from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeactivateModalOpen(false);
                setUserToDeactivate(null);
              }}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivateUser}
              disabled={isDeactivating}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeactivating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
