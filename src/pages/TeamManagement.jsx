import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { useUser } from "@/components/context/UserContext";
import { usePermissions } from "@/components/context/PermissionContext";
import { PermissionGuard, AdminGuard } from "@/components/guards";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import {
  Users, Shield, Settings, UserPlus, Search, MoreVertical,
  Mail, Trash2, Edit, ChevronRight, Building2, Loader2,
  Check, X, Crown, Key, Lock, ShieldCheck, ShieldAlert,
  Eye, EyeOff, UserCog, Filter, Plus, RefreshCw, Copy,
  AlertTriangle, Info, CheckCircle, ArrowLeft, FolderPlus,
  Boxes, ToggleLeft, ToggleRight, UserMinus
} from "lucide-react";
import { createPageUrl } from "@/utils";

// Role hierarchy colors and icons
const ROLE_CONFIG = {
  super_admin: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Crown, level: 100 },
  admin: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ShieldCheck, level: 80 },
  manager: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: UserCog, level: 60 },
  user: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Users, level: 40 },
  learner: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Eye, level: 30 },
  viewer: { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: EyeOff, level: 20 },
};

// Permission categories for better organization
const PERMISSION_CATEGORIES = {
  'Users & Teams': ['users', 'teams', 'departments'],
  'Content': ['courses', 'workflows', 'projects'],
  'Business': ['finance', 'analytics', 'inbox'],
  'System': ['settings', 'integrations', 'admin', 'companies'],
};

// All available apps for team access control
const ALL_APPS = [
  { name: 'learn', label: 'Learn', description: 'Learning & courses', icon: '📚' },
  { name: 'growth', label: 'Growth', description: 'Sales pipeline & outreach', icon: '📈' },
  { name: 'sentinel', label: 'Sentinel', description: 'AI compliance & governance', icon: '🛡️' },
  { name: 'finance', label: 'Finance', description: 'Financial dashboard', icon: '💰' },
  { name: 'inbox', label: 'Inbox', description: 'Team messaging', icon: '📬' },
  { name: 'projects', label: 'Projects', description: 'Project management', icon: '📋' },
  { name: 'analytics', label: 'Analytics', description: 'Business intelligence', icon: '📊' },
];

export default function TeamManagement({ embedded = false }) {
  const { user, company } = useUser();
  const { hasPermission, isAdmin, isSuperAdmin, assignRole, removeRole } = usePermissions();

  const [activeTab, setActiveTab] = useState("users");
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [teams, setTeams] = useState([]);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [isTeamMembersDialogOpen, setIsTeamMembersDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'learner' });
  const [teamForm, setTeamForm] = useState({ name: '', description: '' });
  const [savingInvite, setSavingInvite] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [company]);

  const loadData = async () => {
    if (!company?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Load team members (users in the same company)
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      // Load user roles for each member
      const memberIds = members?.map(m => m.id) || [];
      const { data: userRoles, error: rolesError } = await supabase
        .from('rbac_user_roles')
        .select(`
          *,
          role:rbac_roles(*)
        `)
        .in('user_id', memberIds);

      // Merge roles into members
      const membersWithRoles = members?.map(member => ({
        ...member,
        roles: userRoles?.filter(ur => ur.user_id === member.id).map(ur => ur.role) || []
      })) || [];

      setTeamMembers(membersWithRoles);

      // Load all available roles
      const { data: allRoles, error: allRolesError } = await supabase
        .from('rbac_roles')
        .select('*')
        .order('hierarchy_level', { ascending: false });

      if (!allRolesError) setRoles(allRoles || []);

      // Load all permissions
      const { data: allPermissions, error: permError } = await supabase
        .from('rbac_permissions')
        .select('*')
        .order('resource', { ascending: true });

      if (!permError) setPermissions(allPermissions || []);

      // Load pending invitations
      const { data: invites, error: invitesError } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending');

      if (!invitesError) setInvitations(invites || []);

      // Load teams with their app access and member counts
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_app_access (
            id,
            app_name,
            is_enabled
          ),
          team_members (
            id,
            user_id,
            role
          )
        `)
        .eq('company_id', company.id)
        .order('name', { ascending: true });

      if (!teamsError) setTeams(teamsData || []);

    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  // Send invitation
  const handleSendInvite = async () => {
    if (!inviteForm.email || !company?.id) return;

    setSavingInvite(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          company_id: company.id,
          email: inviteForm.email,
          role: inviteForm.role,
          status: 'pending',
          invited_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email via Edge Function
      try {
        await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: inviteForm.email,
            inviterName: user.full_name,
            inviterEmail: user.email,
            companyName: company.name,
            role: inviteForm.role,
            inviteToken: data.id
          }
        });
      } catch (emailError) {
        console.warn('Failed to send invitation email:', emailError);
        // Don't fail the whole operation if email fails
      }

      setInvitations([data, ...invitations]);
      setInviteForm({ email: '', role: 'learner' });
      setIsInviteDialogOpen(false);
      toast.success(`Invitation sent to ${inviteForm.email}`);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSavingInvite(false);
    }
  };

  // Revoke invitation
  const handleRevokeInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setInvitations(invitations.filter(i => i.id !== inviteId));
      toast.success('Invitation revoked');
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Failed to revoke invitation');
    }
  };

  // Assign role to user
  const handleAssignRole = async (userId, roleId) => {
    setSavingRole(true);
    try {
      // Check if user already has this role
      const { data: existing } = await supabase
        .from('rbac_user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single();

      if (existing) {
        toast.info('User already has this role');
        return;
      }

      const { error } = await supabase
        .from('rbac_user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          scope_type: 'company',
          scope_id: company.id,
          assigned_by: user.id
        });

      if (error) throw error;

      toast.success('Role assigned successfully');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    } finally {
      setSavingRole(false);
    }
  };

  // Remove role from user
  const handleRemoveRole = async (userId, roleId) => {
    try {
      const { error } = await supabase
        .from('rbac_user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      toast.success('Role removed');
      loadData();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  // Filter members based on search and role
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = !searchQuery ||
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' ||
      member.roles?.some(r => r.name === roleFilter);

    return matchesSearch && matchesRole;
  });

  // Get role permissions
  const getRolePermissions = async (roleId) => {
    try {
      const { data, error } = await supabase
        .from('rbac_role_permissions')
        .select(`
          permission:rbac_permissions(*)
        `)
        .eq('role_id', roleId);

      if (error) throw error;
      return data?.map(rp => rp.permission) || [];
    } catch (error) {
      console.error('Error loading role permissions:', error);
      return [];
    }
  };

  // Generate invite link
  const generateInviteLink = async () => {
    if (!company?.id) {
      toast.error('Company not found');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          company_id: company.id,
          email: `link-invite-${Date.now()}@placeholder.com`,
          role: 'learner',
          status: 'pending',
          invited_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}${createPageUrl("CompanyInvite")}?token=${data.id}`;
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied to clipboard!');
      setInvitations([data, ...invitations]);
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate invite link');
    }
  };

  // ==================== TEAM MANAGEMENT ====================

  // Create or update team
  const handleSaveTeam = async () => {
    if (!teamForm.name || !company?.id) return;

    setSavingTeam(true);
    try {
      if (selectedTeam?.id) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update({
            name: teamForm.name,
            description: teamForm.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTeam.id);

        if (error) throw error;
        toast.success('Team updated successfully');
      } else {
        // Create new team
        const { data: newTeam, error } = await supabase
          .from('teams')
          .insert({
            name: teamForm.name,
            description: teamForm.description,
            company_id: company.id
          })
          .select()
          .single();

        if (error) throw error;

        // Initialize app access for all apps (disabled by default)
        const appAccessRecords = ALL_APPS.map(app => ({
          team_id: newTeam.id,
          app_name: app.name,
          is_enabled: false
        }));

        await supabase
          .from('team_app_access')
          .insert(appAccessRecords);

        toast.success('Team created successfully');
      }

      setIsTeamDialogOpen(false);
      setTeamForm({ name: '', description: '' });
      setSelectedTeam(null);
      loadData();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Failed to save team');
    } finally {
      setSavingTeam(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? This will remove all team members and app access settings.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast.success('Team deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  // Toggle app access for a team
  const handleToggleAppAccess = async (teamId, appName, currentlyEnabled) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('team_app_access')
        .select('id')
        .eq('team_id', teamId)
        .eq('app_name', appName)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('team_app_access')
          .update({ is_enabled: !currentlyEnabled, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('team_app_access')
          .insert({
            team_id: teamId,
            app_name: appName,
            is_enabled: true
          });

        if (error) throw error;
      }

      // Update local state
      setTeams(teams.map(team => {
        if (team.id === teamId) {
          const updatedAccess = team.team_app_access.map(access =>
            access.app_name === appName
              ? { ...access, is_enabled: !currentlyEnabled }
              : access
          );
          // If access record didn't exist, add it
          if (!team.team_app_access.find(a => a.app_name === appName)) {
            updatedAccess.push({ app_name: appName, is_enabled: true });
          }
          return { ...team, team_app_access: updatedAccess };
        }
        return team;
      }));

      toast.success(`${appName} access ${!currentlyEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling app access:', error);
      toast.error('Failed to update app access');
    }
  };

  // Add user to team
  const handleAddUserToTeam = async (teamId, userId) => {
    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        toast.info('User is already in this team');
        return;
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;

      toast.success('User added to team');
      loadData();
    } catch (error) {
      console.error('Error adding user to team:', error);
      toast.error('Failed to add user to team');
    }
  };

  // Remove user from team
  const handleRemoveUserFromTeam = async (teamId, userId) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User removed from team');
      loadData();
    } catch (error) {
      console.error('Error removing user from team:', error);
      toast.error('Failed to remove user from team');
    }
  };

  // Open team dialog for editing
  const openEditTeamDialog = (team) => {
    setSelectedTeam(team);
    setTeamForm({ name: team.name, description: team.description || '' });
    setIsTeamDialogOpen(true);
  };

  // Open team dialog for creating
  const openCreateTeamDialog = () => {
    setSelectedTeam(null);
    setTeamForm({ name: '', description: '' });
    setIsTeamDialogOpen(true);
  };

  // Open team members dialog
  const openTeamMembersDialog = (team) => {
    setSelectedTeam(team);
    setIsTeamMembersDialogOpen(true);
  };

  // ==================== END TEAM MANAGEMENT ====================

  // Permission check
  if (!hasPermission('users.manage') && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-zinc-400 mb-6">
            You don't have permission to manage team members and roles.
          </p>
          <Button
            onClick={() => window.location.href = createPageUrl('Settings')}
            className="bg-cyan-600 hover:bg-cyan-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-20 w-full bg-zinc-800 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Skeleton className="h-10 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-10 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-10 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-10 bg-zinc-800 rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-black relative"}>
      {!embedded && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-950/10 rounded-full blur-3xl" />
        </div>
      )}

      <div className={embedded ? "space-y-4" : "relative z-10 w-full px-4 lg:px-6 py-4 space-y-4"}>
        {!embedded && (
          <>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = createPageUrl('Settings')}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>

            <PageHeader
              title="Team Management"
              subtitle="Manage users, roles, and permissions for your organization"
              icon={Users}
              color="cyan"
            />
          </>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <GlassCard className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{teamMembers.length}</div>
                <div className="text-[10px] text-zinc-500">Company Users</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Boxes className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{teams.length}</div>
                <div className="text-[10px] text-zinc-500">Teams</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{roles.length}</div>
                <div className="text-[10px] text-zinc-500">Active Roles</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{invitations.length}</div>
                <div className="text-[10px] text-zinc-500">Pending Invites</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Key className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{permissions.length}</div>
                <div className="text-[10px] text-zinc-500">Permissions</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-zinc-900/80 border border-zinc-800 p-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-zinc-800">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-zinc-800">
              <Boxes className="w-4 h-4 mr-2" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-zinc-800">
              <Mail className="w-4 h-4 mr-2" />
              Invitations
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <GlassCard className="p-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No team members found</p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <UserRow
                      key={member.id}
                      member={member}
                      roles={roles}
                      currentUserId={user.id}
                      isSuperAdmin={isSuperAdmin}
                      onAssignRole={handleAssignRole}
                      onRemoveRole={handleRemoveRole}
                      onSelectUser={setSelectedUser}
                    />
                  ))
                )}
              </div>
            </GlassCard>
          </TabsContent>

          {/* TEAMS TAB */}
          <TabsContent value="teams" className="space-y-4">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-cyan-400" />
                  Teams
                </h3>
                <Button
                  onClick={openCreateTeamDialog}
                  className="bg-cyan-600 hover:bg-cyan-500"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No teams created yet</p>
                  <p className="text-sm text-zinc-600 mt-1">Create teams to organize users and control app access</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      teamMembers={teamMembers}
                      allApps={ALL_APPS}
                      onEdit={openEditTeamDialog}
                      onDelete={handleDeleteTeam}
                      onToggleApp={handleToggleAppAccess}
                      onManageMembers={openTeamMembersDialog}
                    />
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          {/* INVITATIONS TAB */}
          <TabsContent value="invitations" className="space-y-4">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-400" />
                  Pending Invitations
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={generateInviteLink}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Generate Link
                  </Button>
                  <Button
                    onClick={() => setIsInviteDialogOpen(true)}
                    className="bg-cyan-600 hover:bg-cyan-500"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Invite
                  </Button>
                </div>
              </div>

              {invitations.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No pending invitations</p>
                  <p className="text-sm text-zinc-600 mt-1">Invite team members to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {invite.email.includes('placeholder.com')
                              ? 'Invite Link'
                              : invite.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <span className="capitalize">{invite.role?.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>Sent {new Date(invite.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          Pending
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-400">Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="mt-2 bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
              >
                <SelectTrigger className="mt-2 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {roles
                    .filter(r => !isSuperAdmin ? r.hierarchy_level < 80 : true) // Non-superadmins can't assign admin roles
                    .sort((a, b) => b.hierarchy_level - a.hierarchy_level)
                    .map(role => {
                      const config = ROLE_CONFIG[role.name] || ROLE_CONFIG.user;
                      const Icon = config.icon;
                      return (
                        <SelectItem key={role.id} value={role.name}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="capitalize">{role.name.replace('_', ' ')}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 mt-2">
                The invited user will have access based on this role's permissions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={!inviteForm.email || savingInvite}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              {savingInvite ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Create/Edit Dialog */}
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-400" />
              {selectedTeam ? 'Edit Team' : 'Create Team'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {selectedTeam ? 'Update team details' : 'Create a new team to organize users and control app access'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-zinc-400">Team Name</Label>
              <Input
                placeholder="e.g., Sales Team"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                className="mt-2 bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Description (optional)</Label>
              <Input
                placeholder="e.g., Handles all sales activities"
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                className="mt-2 bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTeamDialogOpen(false);
                setSelectedTeam(null);
                setTeamForm({ name: '', description: '' });
              }}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTeam}
              disabled={!teamForm.name || savingTeam}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              {savingTeam ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {selectedTeam ? 'Save Changes' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Members Dialog */}
      <Dialog open={isTeamMembersDialogOpen} onOpenChange={setIsTeamMembersDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              {selectedTeam?.name} - Members
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add or remove team members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Members */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Current Members ({selectedTeam?.team_members?.length || 0})</h4>
              {selectedTeam?.team_members?.length === 0 ? (
                <p className="text-zinc-500 text-sm">No members in this team yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTeam?.team_members?.map(tm => {
                    const member = teamMembers.find(m => m.id === tm.user_id);
                    if (!member) return null;
                    return (
                      <div key={tm.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white">
                            {member.full_name?.[0] || member.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm text-white">{member.full_name || 'Unnamed'}</div>
                            <div className="text-xs text-zinc-500">{member.email}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUserFromTeam(selectedTeam.id, tm.user_id)}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Members */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Add Members</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teamMembers
                  .filter(m => !selectedTeam?.team_members?.some(tm => tm.user_id === m.id))
                  .map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white">
                          {member.full_name?.[0] || member.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm text-white">{member.full_name || 'Unnamed'}</div>
                          <div className="text-xs text-zinc-500">{member.email}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUserToTeam(selectedTeam.id, member.id)}
                        className="border-zinc-700 text-zinc-300 hover:bg-cyan-600 hover:border-cyan-600"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                {teamMembers.filter(m => !selectedTeam?.team_members?.some(tm => tm.user_id === m.id)).length === 0 && (
                  <p className="text-zinc-500 text-sm">All users are already in this team</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsTeamMembersDialogOpen(false);
                setSelectedTeam(null);
              }}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Row Component
function UserRow({ member, roles, currentUserId, isSuperAdmin, onAssignRole, onRemoveRole, onSelectUser }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState('');

  const isCurrentUser = member.id === currentUserId;
  const highestRole = member.roles?.sort((a, b) => b.hierarchy_level - a.hierarchy_level)[0];
  const config = highestRole ? (ROLE_CONFIG[highestRole.name] || ROLE_CONFIG.user) : ROLE_CONFIG.user;
  const Icon = config.icon;

  const handleAssign = async () => {
    if (!selectedRoleToAssign) return;
    const role = roles.find(r => r.name === selectedRoleToAssign);
    if (role) {
      setIsAssigning(true);
      await onAssignRole(member.id, role.id);
      setSelectedRoleToAssign('');
      setIsAssigning(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-700/50 overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg font-semibold">
                {member.full_name?.[0] || member.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {isCurrentUser && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-zinc-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">
              {member.full_name || 'Unnamed User'}
            </span>
            {isCurrentUser && (
              <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">You</Badge>
            )}
          </div>
          <div className="text-sm text-zinc-500 truncate">{member.email}</div>
        </div>

        <div className="flex items-center gap-2">
          {member.roles?.map(role => {
            const roleConfig = ROLE_CONFIG[role.name] || ROLE_CONFIG.user;
            return (
              <Badge key={role.id} className={`${roleConfig.color} capitalize`}>
                {role.name.replace('_', ' ')}
              </Badge>
            );
          })}
          {member.roles?.length === 0 && (
            <Badge className="bg-zinc-700/50 text-zinc-400">No role</Badge>
          )}
        </div>

        <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-zinc-700/50 bg-zinc-900/30 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Job Title</span>
                  <p className="text-zinc-200">{member.job_title || 'Not set'}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Joined</span>
                  <p className="text-zinc-200">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Last Active</span>
                  <p className="text-zinc-200">
                    {member.last_sign_in_at
                      ? new Date(member.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Status</span>
                  <Badge className="bg-green-500/20 text-green-400 ml-2">Active</Badge>
                </div>
              </div>

              {/* Role Management */}
              <div className="border-t border-zinc-800 pt-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Manage Roles</h4>

                <div className="flex flex-wrap gap-2 mb-4">
                  {member.roles?.map(role => (
                    <div
                      key={role.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700"
                    >
                      <span className="text-sm text-zinc-200 capitalize">
                        {role.name.replace('_', ' ')}
                      </span>
                      {!isCurrentUser && (isSuperAdmin || role.hierarchy_level < 80) && (
                        <button
                          onClick={() => onRemoveRole(member.id, role.id)}
                          className="ml-1 p-0.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Role */}
                {!isCurrentUser && (
                  <div className="flex gap-2">
                    <Select value={selectedRoleToAssign} onValueChange={setSelectedRoleToAssign}>
                      <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Add role..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {roles
                          .filter(r => !member.roles?.some(mr => mr.id === r.id))
                          .filter(r => isSuperAdmin || r.hierarchy_level < 80)
                          .map(role => (
                            <SelectItem key={role.id} value={role.name}>
                              <span className="capitalize">{role.name.replace('_', ' ')}</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleAssign}
                      disabled={!selectedRoleToAssign || isAssigning}
                      className="bg-cyan-600 hover:bg-cyan-500"
                    >
                      {isAssigning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Role Permissions View Component
function RolePermissionsView({ role, allPermissions, permissionCategories }) {
  const [rolePermissions, setRolePermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRolePermissions();
  }, [role.id]);

  const loadRolePermissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rbac_role_permissions')
        .select('permission_id')
        .eq('role_id', role.id);

      if (!error) {
        setRolePermissions(data?.map(rp => rp.permission_id) || []);
      }
    } catch (error) {
      console.error('Error loading role permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 bg-zinc-800/50 rounded-lg" />
        ))}
      </div>
    );
  }

  // Group permissions by category
  const permissionsByCategory = {};
  Object.entries(permissionCategories).forEach(([category, resources]) => {
    permissionsByCategory[category] = allPermissions.filter(p =>
      resources.includes(p.resource)
    );
  });

  return (
    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
      {Object.entries(permissionsByCategory).map(([category, perms]) => {
        const categoryPermCount = perms.filter(p => rolePermissions.includes(p.id)).length;

        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-300">{category}</h4>
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">
                {categoryPermCount}/{perms.length}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {perms.map(perm => {
                const hasPermission = rolePermissions.includes(perm.id);
                return (
                  <div
                    key={perm.id}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg text-sm
                      ${hasPermission
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-zinc-800/30 border border-zinc-700/30'}
                    `}
                  >
                    {hasPermission ? (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                    )}
                    <span className={hasPermission ? 'text-zinc-200' : 'text-zinc-500'}>
                      {perm.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Team Card Component
function TeamCard({ team, teamMembers, allApps, onEdit, onDelete, onToggleApp, onManageMembers }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get enabled apps for this team
  const getAppAccess = (appName) => {
    const access = team.team_app_access?.find(a => a.app_name === appName);
    return access?.is_enabled || false;
  };

  // Get member count
  const memberCount = team.team_members?.length || 0;

  // Count enabled apps
  const enabledAppsCount = allApps.filter(app => getAppAccess(app.name)).length;

  return (
    <div className="rounded-xl border border-zinc-700/50 overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 bg-zinc-800/30 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Boxes className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{team.name}</span>
          </div>
          <div className="text-sm text-zinc-500">
            {team.description || 'No description'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-zinc-700/50 text-zinc-300">
            <Users className="w-3 h-3 mr-1" />
            {memberCount}
          </Badge>
          <Badge className={enabledAppsCount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700/50 text-zinc-400'}>
            {enabledAppsCount}/{allApps.length} apps
          </Badge>
        </div>

        <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-zinc-700/50 bg-zinc-900/30 space-y-6">
              {/* App Access Section */}
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  App Access
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allApps.map(app => {
                    const isEnabled = getAppAccess(app.name);
                    return (
                      <div
                        key={app.name}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all
                          ${isEnabled
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600'}
                        `}
                        onClick={() => onToggleApp(team.id, app.name, isEnabled)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{app.icon}</span>
                          <div className={`w-8 h-4 rounded-full relative ${isEnabled ? 'bg-green-500' : 'bg-zinc-600'}`}>
                            <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${isEnabled ? 'text-green-400' : 'text-zinc-400'}`}>
                          {app.label}
                        </div>
                        <div className="text-xs text-zinc-500">{app.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team Members Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Members ({memberCount})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageMembers(team);
                    }}
                    className="border-zinc-700 text-zinc-300"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                </div>
                {memberCount === 0 ? (
                  <p className="text-sm text-zinc-500">No members in this team</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {team.team_members?.slice(0, 5).map(tm => {
                      const member = teamMembers.find(m => m.id === tm.user_id);
                      if (!member) return null;
                      return (
                        <div
                          key={tm.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-white">
                            {member.full_name?.[0] || member.email?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs text-zinc-300">{member.full_name || member.email}</span>
                        </div>
                      );
                    })}
                    {memberCount > 5 && (
                      <div className="flex items-center px-2 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50">
                        <span className="text-xs text-zinc-400">+{memberCount - 5} more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(team);
                  }}
                  className="border-zinc-700 text-zinc-300"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit Team
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(team.id);
                  }}
                  className="border-zinc-700 text-red-400 hover:bg-red-500/20 hover:border-red-500/30"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
