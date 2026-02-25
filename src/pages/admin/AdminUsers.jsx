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
  Key,
  Globe,
  Plus,
  Loader2,
  Briefcase,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Base apps that are always available to every user (no license needed)
const BASE_APPS = [
  { name: 'Dashboard', slug: 'dashboard' },
  { name: 'CRM', slug: 'crm' },
  { name: 'Products', slug: 'products' },
  { name: 'Projects', slug: 'projects' },
  { name: 'Inbox', slug: 'inbox' },
];

// User Detail Modal
function UserDetailModal({ user, open, onClose, onUpdate, adminRole }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [licenses, setLicenses] = useState([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
  const [apps, setApps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState({ app_id: '', license_type: 'subscription' });
  const [isGranting, setIsGranting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({});

  const canEdit = adminRole === 'super_admin' || adminRole === 'admin';

  // Reset state when user changes or modal opens
  useEffect(() => {
    if (user && open) {
      setActiveTab('profile');
      setShowGrantForm(false);
      setEditData({
        role: user.role || 'user',
        job_title: user.job_title || '',
        credits: user.credits || 0,
        full_name: user.full_name || user.name || '',
        company_id: user.company_id || '',
      });
    }
  }, [user, open]);

  // Fetch licenses when licenses tab is selected
  useEffect(() => {
    if (activeTab === 'licenses' && user?.company_id) {
      fetchLicenses();
    }
  }, [activeTab, user?.company_id]);

  // Fetch companies for settings tab
  useEffect(() => {
    if (activeTab === 'settings' && companies.length === 0) {
      fetchCompaniesForSelect();
    }
  }, [activeTab]);

  const fetchLicenses = async () => {
    if (!user?.company_id) return;
    setIsLoadingLicenses(true);
    try {
      const data = await adminApi(`/licenses?company=${user.company_id}`);
      setLicenses(data.licenses || data || []);
    } catch (error) {
      console.error('Failed to fetch licenses:', error);
      setLicenses([]);
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  const fetchApps = async () => {
    if (apps.length > 0) return;
    try {
      const data = await adminApi('/apps');
      setApps(data.apps || data || []);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    }
  };

  const fetchCompaniesForSelect = async () => {
    if (companies.length > 0) return;
    try {
      const data = await adminApi('/companies');
      setCompanies(data.companies || data || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const handleGrantLicense = async () => {
    if (!grantForm.app_id || !user?.company_id) return;
    setIsGranting(true);
    try {
      await adminApi('/licenses', {
        method: 'POST',
        body: JSON.stringify({
          app_id: grantForm.app_id,
          company_id: user.company_id,
          license_type: grantForm.license_type,
        }),
      });
      toast.success('License granted successfully');
      setShowGrantForm(false);
      setGrantForm({ app_id: '', license_type: 'subscription' });
      fetchLicenses();
    } catch (error) {
      toast.error(error.message || 'Failed to grant license');
    } finally {
      setIsGranting(false);
    }
  };

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
    } catch (error) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { setShowGrantForm(false); onClose(); } }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback className="bg-cyan-500/20 text-cyan-400">
                {(user.full_name || user.name || user.email)?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{user.full_name || user.name || 'Unnamed User'}</span>
              <p className="text-sm text-zinc-400 font-normal">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="bg-zinc-800 border-zinc-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-zinc-700">
              Profile
            </TabsTrigger>
            <TabsTrigger value="licenses" className="data-[state=active]:bg-zinc-700">
              Licenses
            </TabsTrigger>
            {canEdit && (
              <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-700">
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 mt-4">
            {/* Status Row */}
            <div className="flex items-center gap-3">
              <RoleBadge role={user.role} />
              <StatusBadge isActive={user.is_active_recently} isPlatformAdmin={user.is_platform_admin} />
              {user.platform_admin_role && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
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
                <Label className="text-zinc-400 text-xs">Job Title</Label>
                <p className="text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-zinc-500" />
                  {user.job_title || 'Not set'}
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
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Email</Label>
                <p className="text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  {user.email}
                </p>
              </div>
            </div>

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
                    <Badge key={idx} className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {role.role_name || role.role_id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Licenses Tab */}
          <TabsContent value="licenses" className="space-y-4 mt-4">
            {!user.company_id ? (
              <div className="space-y-4">
                {/* Base Apps - Always Available */}
                <div className="space-y-2">
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Base Access (Always Included)</h4>
                  <div className="flex flex-wrap gap-2">
                    {BASE_APPS.map((app) => (
                      <div
                        key={app.slug}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-800/30"
                      >
                        <CheckCircle className="w-3 h-3 text-cyan-400" />
                        <span className="text-white text-xs">{app.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center py-4 border-t border-zinc-800">
                  <Building2 className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400 text-sm">No company assigned</p>
                  <p className="text-zinc-500 text-xs mt-1">Assign a company in the Settings tab to manage additional licenses.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    App Access for {user.company_name || 'Company'}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => { setShowGrantForm(!showGrantForm); fetchApps(); }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Grant License
                  </Button>
                </div>

                {/* Base Apps - Always Available */}
                <div className="space-y-2">
                  <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Base Access (Always Included)</h4>
                  <div className="flex flex-wrap gap-2">
                    {BASE_APPS.map((app) => (
                      <div
                        key={app.slug}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-800/30"
                      >
                        <CheckCircle className="w-3 h-3 text-cyan-400" />
                        <span className="text-white text-xs">{app.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-800" />

                {/* Grant License Form */}
                {showGrantForm && (
                  <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-800/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-400">App</Label>
                        <Select
                          value={grantForm.app_id}
                          onValueChange={(value) => setGrantForm({ ...grantForm, app_id: value })}
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs">
                            <SelectValue placeholder="Select app..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {apps.map((app) => (
                              <SelectItem key={app.id} value={app.id}>
                                {app.name || app.slug}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-400">License Type</Label>
                        <Select
                          value={grantForm.license_type}
                          onValueChange={(value) => setGrantForm({ ...grantForm, license_type: value })}
                        >
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                            <SelectItem value="perpetual">Perpetual</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGrantForm(false)}
                        className="border-zinc-700 text-zinc-300 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleGrantLicense}
                        disabled={isGranting || !grantForm.app_id}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                      >
                        {isGranting ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Granting...
                          </>
                        ) : (
                          'Grant'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Licensed Apps */}
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider">Licensed Apps</h4>
                {isLoadingLicenses ? (
                  <div className="text-center py-6">
                    <Loader2 className="w-5 h-5 text-zinc-400 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-xs">Loading licenses...</p>
                  </div>
                ) : licenses.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-zinc-500 text-xs">No additional licensed apps. Grant a license for premium features.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {licenses.map((license) => (
                      <div
                        key={license.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-800/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {license.app_name || license.app?.name || 'Unknown App'}
                            </p>
                            <p className="text-zinc-500 text-xs">
                              {license.license_type || 'subscription'} license
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              'text-[10px] px-1.5 py-px',
                              license.status === 'active'
                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                : license.status === 'expired'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                            )}
                          >
                            {license.status || 'active'}
                          </Badge>
                          {license.granted_at && (
                            <span className="text-zinc-500 text-[10px]">
                              {new Date(license.granted_at || license.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Settings Tab */}
          {canEdit && (
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-zinc-400 text-xs">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editData.full_name}
                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-job" className="text-zinc-400 text-xs">Job Title</Label>
                  <Input
                    id="edit-job"
                    value={editData.job_title}
                    onChange={(e) => setEditData({ ...editData, job_title: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-zinc-400 text-xs">Role</Label>
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
                  <Label htmlFor="edit-credits" className="text-zinc-400 text-xs">Credits</Label>
                  <Input
                    id="edit-credits"
                    type="number"
                    value={editData.credits}
                    onChange={(e) => setEditData({ ...editData, credits: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="edit-company" className="text-zinc-400 text-xs">Company</Label>
                  <Select
                    value={editData.company_id || 'none'}
                    onValueChange={(value) => setEditData({ ...editData, company_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select company..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[200px]">
                      <SelectItem value="none">No company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

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

  // Hard-delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi(`/users/${userToDelete.id}/hard-delete`, {
        method: 'POST',
        body: JSON.stringify({ confirm_email: deleteConfirmEmail }),
      });
      toast.success('User permanently deleted');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setDeleteConfirmEmail('');
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
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
          color="cyan"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="New This Month"
          value={stats.new_users_month?.toLocaleString()}
          icon={UserPlus}
          color="cyan"
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
              <Users className="w-4 h-4 text-cyan-400" />
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
                          onClick={() => handleViewUser(user)}
                          className="hover:bg-zinc-800/30 transition-colors h-9 cursor-pointer"
                        >
                          {/* User Info */}
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-[9px]">
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
                          <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
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
                                {canDeactivate && (
                                  <>
                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setUserToDelete(user);
                                        setDeleteConfirmEmail('');
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="text-red-500 hover:text-red-400 focus:text-red-400 text-xs font-medium"
                                    >
                                      <X className="w-3 h-3 mr-1.5" />
                                      Delete Permanently
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

      {/* Hard Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        setIsDeleteModalOpen(open);
        if (!open) { setUserToDelete(null); setDeleteConfirmEmail(''); }
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Permanently Delete User
            </DialogTitle>
            <DialogDescription className="text-zinc-400 space-y-2">
              <p>
                This will <span className="text-red-400 font-semibold">permanently delete</span>{' '}
                <span className="text-white font-medium">
                  {userToDelete?.full_name || userToDelete?.name || userToDelete?.email}
                </span>{' '}
                and all their data. This action cannot be undone.
              </p>
              <p className="text-xs text-zinc-500">
                This removes their profile, app configs, roles, team memberships, SYNC sessions, integrations, credits, and authentication account.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            <Label className="text-zinc-400 text-xs">
              Type the user's email to confirm: <span className="text-red-400 font-mono">{userToDelete?.email}</span>
            </Label>
            <Input
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Type email address here..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 text-sm"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                setDeleteConfirmEmail('');
              }}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={isDeleting || deleteConfirmEmail.toLowerCase() !== (userToDelete?.email || '').toLowerCase()}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-30"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Delete Forever
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
