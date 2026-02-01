import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/GlobalThemeContext';
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Loader2,
  FolderKanban,
  Send,
  CheckCircle,
  XCircle,
  ChevronRight,
  Search,
  Building2,
  Plus,
  X,
  Globe,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  invited: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-red-500/10 text-red-400 border-red-500/30',
  blocked: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function PortalClientManager() {
  const { user } = useUser();
  const { st } = useTheme();
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null); // null = new, string = existing company_name

  useEffect(() => {
    if (user?.organization_id) {
      fetchClients();
      fetchProjects();
    }
  }, [user?.organization_id]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('portal_clients')
        .select(`
          *,
          client_project_access (
            id,
            project_id,
            permission_level,
            project:projects (id, title, status)
          )
        `)
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('organization_id', user.organization_id)
        .order('title');

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleSendInvite = async (client) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: client.email,
        options: {
          emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
          data: {
            portal_client_id: client.id,
            organization_id: user.organization_id,
          },
        },
      });

      if (error) throw error;

      await supabase
        .from('portal_clients')
        .update({ status: 'invited', updated_at: new Date().toISOString() })
        .eq('id', client.id);

      toast.success(`Invite sent to ${client.email}`);
      fetchClients();
    } catch (err) {
      console.error('Error sending invite:', err);
      toast.error('Failed to send invite');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Are you sure you want to remove this person?')) return;

    try {
      await supabase
        .from('client_project_access')
        .delete()
        .eq('client_id', clientId);

      const { error } = await supabase
        .from('portal_clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Client removed');
      fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('Failed to remove client');
    }
  };

  const handleToggleProjectAccess = async (clientId, projectId, hasAccess) => {
    try {
      if (hasAccess) {
        await supabase
          .from('client_project_access')
          .delete()
          .eq('client_id', clientId)
          .eq('project_id', projectId);
      } else {
        await supabase
          .from('client_project_access')
          .insert({
            client_id: clientId,
            project_id: projectId,
            organization_id: user.organization_id,
            permission_level: 'view',
            granted_by: user.id,
          });
      }
      fetchClients();
    } catch (err) {
      console.error('Error toggling access:', err);
      toast.error('Failed to update access');
    }
  };

  // Group clients by company_name
  const groupedClients = useMemo(() => {
    const groups = {};
    clients.forEach((c) => {
      const key = c.company_name || '_ungrouped';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [clients]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedClients;
    const q = searchQuery.toLowerCase();
    const filtered = {};
    Object.entries(groupedClients).forEach(([company, members]) => {
      const matches = members.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company_name?.toLowerCase().includes(q)
      );
      if (matches.length > 0 || company.toLowerCase().includes(q)) {
        filtered[company] = matches.length > 0 ? matches : members;
      }
    });
    return filtered;
  }, [groupedClients, searchQuery]);

  const openSheet = (companyName = null) => {
    setSelectedCompany(companyName);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${st('text-slate-900', 'text-white')} flex items-center gap-2`}>
            <Users className="w-5 h-5 text-cyan-400" />
            Portal Clients
          </h3>
          <p className={`text-sm ${st('text-slate-500', 'text-zinc-400')} mt-1`}>
            Manage client organizations and their team members who can access the portal
          </p>
        </div>
        <button
          onClick={() => openSheet(null)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${st('text-slate-400', 'text-zinc-500')}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients or companies..."
          className={`w-full pl-10 pr-4 py-2.5 ${st('bg-slate-100', 'bg-zinc-800/50')} border ${st('border-slate-200', 'border-zinc-700')} rounded-lg ${st('text-slate-900', 'text-white')} placeholder:${st('text-slate-400', 'text-zinc-500')} focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
        />
      </div>

      {/* Client Organizations */}
      <div className="space-y-4">
        {Object.entries(filteredGroups).map(([company, members]) => (
          <div
            key={company}
            className={`${st('bg-white border border-slate-200 shadow-sm', 'bg-zinc-800/30 border border-zinc-700/50')} rounded-xl overflow-hidden`}
          >
            {/* Company Header */}
            <button
              onClick={() => openSheet(company === '_ungrouped' ? null : company)}
              className={`w-full p-4 flex items-center gap-4 ${st('hover:bg-slate-100', 'hover:bg-zinc-800/50')} transition-colors text-left`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${st('text-slate-900', 'text-white')}`}>
                  {company === '_ungrouped' ? 'Individual Clients' : company}
                </h4>
                <p className={`text-sm ${st('text-slate-400', 'text-zinc-500')}`}>
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </p>
              </div>
              <div className={`flex items-center gap-2 text-sm ${st('text-slate-500', 'text-zinc-400')}`}>
                <FolderKanban className="w-4 h-4" />
                {new Set(members.flatMap((m) => m.client_project_access?.map((a) => a.project_id) || [])).size} projects
              </div>
              <ChevronRight className={`w-4 h-4 ${st('text-slate-400', 'text-zinc-500')}`} />
            </button>

            {/* Members */}
            <div className={`border-t ${st('border-slate-200', 'border-zinc-700/30')}`}>
              {members.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b ${st('border-slate-200', 'border-zinc-700/20')} last:border-b-0 ${st('hover:bg-slate-100', 'hover:bg-zinc-800/20')} transition-colors`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-sm font-medium">
                    {client.full_name?.[0]?.toUpperCase() || client.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${st('text-slate-900', 'text-white')} truncate`}>
                        {client.full_name || client.email.split('@')[0]}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
                          STATUS_COLORS[client.status] || STATUS_COLORS.pending
                        }`}
                      >
                        {client.status || 'pending'}
                      </span>
                    </div>
                    <p className={`text-xs ${st('text-slate-400', 'text-zinc-500')} truncate`}>{client.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {client.status !== 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendInvite(client);
                        }}
                        className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Send invite"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClient(client.id);
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(filteredGroups).length === 0 && (
          <div className={`text-center py-12 ${st('text-slate-400', 'text-zinc-500')}`}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No clients yet</p>
            <p className="text-sm mt-1">Add your first client organization to get started</p>
          </div>
        )}
      </div>

      {/* Client Sheet */}
      <ClientSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        companyName={selectedCompany}
        organizationId={user?.organization_id}
        userId={user?.id}
        clients={selectedCompany ? (groupedClients[selectedCompany] || []) : []}
        projects={projects}
        onRefresh={fetchClients}
        onSendInvite={handleSendInvite}
        onDeleteClient={handleDeleteClient}
        onToggleAccess={handleToggleProjectAccess}
      />
    </div>
  );
}

function ClientSheet({
  open,
  onClose,
  companyName,
  organizationId,
  userId,
  clients,
  projects,
  onRefresh,
  onSendInvite,
  onDeleteClient,
  onToggleAccess,
}) {
  const { st } = useTheme();
  const isNew = !companyName;
  const [company, setCompany] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [pendingEmails, setPendingEmails] = useState([]); // { email, full_name }
  const [saving, setSaving] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCompany(companyName || '');
      setEmailInput('');
      setNameInput('');
      setPendingEmails([]);
      setSaving(false);
      setExpandedMember(null);
    }
  }, [open, companyName]);

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    if (pendingEmails.some((e) => e.email === email) || clients.some((c) => c.email === email)) {
      toast.error('This email is already added');
      return;
    }
    setPendingEmails([...pendingEmails, { email, full_name: nameInput.trim() || null }]);
    setEmailInput('');
    setNameInput('');
  };

  const removeEmail = (email) => {
    setPendingEmails(pendingEmails.filter((e) => e.email !== email));
  };

  const handleSave = async () => {
    if (pendingEmails.length === 0) {
      toast.error('Add at least one email address');
      return;
    }
    if (!company.trim() && isNew) {
      toast.error('Enter a company name');
      return;
    }

    setSaving(true);
    try {
      const companyValue = company.trim() || null;
      const rows = pendingEmails.map((e) => ({
        organization_id: organizationId,
        email: e.email,
        full_name: e.full_name,
        company_name: companyValue,
        status: 'invited',
      }));

      const { data: newClients, error } = await supabase
        .from('portal_clients')
        .insert(rows)
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error('One or more emails already exist');
        } else {
          throw error;
        }
        return;
      }

      // Auto-create client folder in Projects if it doesn't exist
      if (companyValue) {
        try {
          const savedFolders = JSON.parse(localStorage.getItem('project_folders') || '[]');
          const exists = savedFolders.some(f => f.client_company?.toLowerCase() === companyValue.toLowerCase());
          if (!exists) {
            const colors = ['cyan', 'purple', 'emerald', 'amber', 'rose'];
            savedFolders.push({
              id: `folder_client_${Date.now()}`,
              name: `${companyValue} Projects`,
              description: `Client folder for ${companyValue}`,
              client_name: '',
              client_email: '',
              client_company: companyValue,
              cover_color: colors[savedFolders.length % colors.length],
              project_ids: [],
              share_settings: {
                is_public: false,
                share_link: '',
                allow_comments: true,
                show_individual_progress: true,
                show_overall_stats: true,
                password_protected: false,
                password: '',
                welcome_message: '',
              },
              created_date: new Date().toISOString(),
            });
            localStorage.setItem('project_folders', JSON.stringify(savedFolders));
          }
        } catch (err) {
          console.error('Error auto-creating client folder:', err);
        }
      }

      toast.success(`${newClients.length} client(s) added! Sending invites...`);
      onClose();
      await onRefresh();

      // Send invites to all new clients
      for (const client of newClients) {
        try {
          await supabase.auth.signInWithOtp({
            email: client.email,
            options: {
              emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
              data: {
                portal_client_id: client.id,
                organization_id: organizationId,
              },
            },
          });
          await supabase
            .from('portal_clients')
            .update({ status: 'invited', updated_at: new Date().toISOString() })
            .eq('id', client.id);
        } catch (err) {
          console.error(`Failed to invite ${client.email}:`, err);
        }
      }
      await onRefresh();
    } catch (err) {
      console.error('Error adding clients:', err);
      toast.error('Failed to add clients');
    } finally {
      setSaving(false);
    }
  };

  const assignedProjects = (client) =>
    client.client_project_access?.map((a) => a.project_id) || [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className={`w-full sm:max-w-2xl ${st('bg-white', 'bg-zinc-900')} ${st('border-slate-200', 'border-zinc-800/60')} overflow-y-auto p-0`}>
        <SheetDescription className="sr-only">Manage client portal access</SheetDescription>

        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500" />
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${st('text-slate-900', 'text-white')}`}>
                  {isNew ? 'Add Client Organization' : companyName}
                </h2>
                <p className={`text-sm ${st('text-slate-500', 'text-zinc-400')}`}>
                  {isNew
                    ? 'Add a client company and invite team members'
                    : `${clients.length} team member(s) with portal access`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Name (for new) */}
          {isNew && (
            <div>
              <label className={`block text-sm font-medium ${st('text-slate-600', 'text-zinc-300')} mb-1.5`}>
                Company / Organization Name
              </label>
              <div className="relative">
                <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${st('text-slate-400', 'text-zinc-500')}`} />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  className={`w-full pl-10 pr-4 py-2.5 ${st('bg-slate-100', 'bg-zinc-800/50')} border ${st('border-slate-200', 'border-zinc-700')} rounded-lg ${st('text-slate-900', 'text-white')} placeholder:${st('text-slate-400', 'text-zinc-500')} focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                />
              </div>
            </div>
          )}

          {/* Existing Members (for existing company) */}
          {!isNew && clients.length > 0 && (
            <div>
              <h3 className={`text-sm font-medium ${st('text-slate-600', 'text-zinc-300')} mb-3 flex items-center gap-2`}>
                <Users className={`w-4 h-4 ${st('text-slate-500', 'text-zinc-400')}`} />
                Team Members
              </h3>
              <div className="space-y-2">
                {clients.map((client) => {
                  const hasExpanded = expandedMember === client.id;
                  const assigned = assignedProjects(client);
                  return (
                    <div
                      key={client.id}
                      className={`${st('bg-white border border-slate-200 shadow-sm', 'bg-zinc-800/40 border border-zinc-700/40')} rounded-xl overflow-hidden`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white text-sm font-medium">
                          {client.full_name?.[0]?.toUpperCase() || client.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${st('text-slate-900', 'text-white')} truncate`}>
                              {client.full_name || client.email.split('@')[0]}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
                                STATUS_COLORS[client.status] || STATUS_COLORS.pending
                              }`}
                            >
                              {client.status}
                            </span>
                          </div>
                          <p className={`text-xs ${st('text-slate-400', 'text-zinc-500')}`}>{client.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedMember(hasExpanded ? null : client.id)}
                            className={`p-1.5 ${st('text-slate-500', 'text-zinc-400')} ${st('hover:bg-slate-100', 'hover:bg-zinc-700')} rounded-lg transition-colors`}
                            title="Manage project access"
                          >
                            <FolderKanban className="w-3.5 h-3.5" />
                            <span className="sr-only">Projects</span>
                          </button>
                          {client.status !== 'active' && (
                            <button
                              onClick={() => onSendInvite(client)}
                              className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="Resend invite"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteClient(client.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Project Access */}
                      {hasExpanded && (
                        <div className={`px-3 pb-3 pt-1 border-t ${st('border-slate-200', 'border-zinc-700/30')}`}>
                          <p className={`text-xs ${st('text-slate-400', 'text-zinc-500')} mb-2`}>Project Access</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {projects.map((project) => {
                              const has = assigned.includes(project.id);
                              return (
                                <button
                                  key={project.id}
                                  onClick={() => onToggleAccess(client.id, project.id, has)}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                                    has
                                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                      : `${st('bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-300', 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600')}`
                                  }`}
                                >
                                  {has ? (
                                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                  )}
                                  <span className="truncate">{project.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Emails */}
          <div>
            <h3 className={`text-sm font-medium ${st('text-slate-600', 'text-zinc-300')} mb-3 flex items-center gap-2`}>
              <Mail className={`w-4 h-4 ${st('text-slate-500', 'text-zinc-400')}`} />
              {isNew ? 'Add Team Members' : 'Add New Member'}
            </h3>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${st('text-slate-400', 'text-zinc-500')}`} />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                      placeholder="employee@company.com"
                      className={`w-full pl-10 pr-4 py-2.5 ${st('bg-slate-100', 'bg-zinc-800/50')} border ${st('border-slate-200', 'border-zinc-700')} rounded-lg ${st('text-slate-900', 'text-white')} placeholder:${st('text-slate-400', 'text-zinc-500')} focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                    />
                  </div>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                    placeholder="Full name (optional)"
                    className={`w-full px-4 py-2 ${st('bg-slate-100', 'bg-zinc-800/50')} border ${st('border-slate-200', 'border-zinc-700')} rounded-lg ${st('text-slate-900', 'text-white')} text-sm placeholder:${st('text-slate-400', 'text-zinc-500')} focus:outline-none focus:ring-2 focus:ring-cyan-500/50`}
                  />
                </div>
                <button
                  onClick={addEmail}
                  className={`self-start px-4 py-2.5 ${st('bg-slate-200', 'bg-zinc-800')} ${st('hover:bg-slate-100', 'hover:bg-zinc-700')} ${st('text-slate-600', 'text-zinc-300')} border ${st('border-slate-200', 'border-zinc-700')} rounded-lg transition-colors`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Pending emails list */}
              {pendingEmails.length > 0 && (
                <div className="space-y-1.5">
                  {pendingEmails.map((entry) => (
                    <div
                      key={entry.email}
                      className="flex items-center gap-3 p-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg"
                    >
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-medium">
                        {(entry.full_name?.[0] || entry.email[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {entry.full_name && (
                          <p className={`text-sm ${st('text-slate-900', 'text-white')} truncate`}>{entry.full_name}</p>
                        )}
                        <p className={`text-xs ${st('text-slate-500', 'text-zinc-400')} truncate`}>{entry.email}</p>
                      </div>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        pending
                      </span>
                      <button
                        onClick={() => removeEmail(entry.email)}
                        className={`p-1 ${st('text-slate-400', 'text-zinc-500')} hover:text-red-400 transition-colors`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          {pendingEmails.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {saving
                ? 'Saving...'
                : `Add ${pendingEmails.length} member${pendingEmails.length > 1 ? 's' : ''} & Send Invites`}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
