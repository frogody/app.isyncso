import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

export default function PortalClientManager() {
  const { user } = useUser();
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedClient, setExpandedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      // Send magic link via Supabase Auth
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

      // Update client status to invited
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
    if (!confirm('Are you sure you want to remove this client?')) return;

    try {
      // First remove project access
      await supabase
        .from('client_project_access')
        .delete()
        .eq('client_id', clientId);

      // Then remove the client
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
        // Remove access
        await supabase
          .from('client_project_access')
          .delete()
          .eq('client_id', clientId)
          .eq('project_id', projectId);
      } else {
        // Add access
        await supabase
          .from('client_project_access')
          .insert({
            client_id: clientId,
            project_id: projectId,
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

  const filteredClients = clients.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Portal Clients
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Manage who can access your client portal
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            projects={projects}
            expanded={expandedClient === client.id}
            onToggleExpand={() =>
              setExpandedClient(expandedClient === client.id ? null : client.id)
            }
            onSendInvite={() => handleSendInvite(client)}
            onDelete={() => handleDeleteClient(client.id)}
            onToggleAccess={(projectId, hasAccess) =>
              handleToggleProjectAccess(client.id, projectId, hasAccess)
            }
          />
        ))}
        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No clients yet</p>
            <p className="text-sm mt-1">Add your first client to get started</p>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          organizationId={user.organization_id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchClients();
          }}
        />
      )}
    </div>
  );
}

function ClientCard({
  client,
  projects,
  expanded,
  onToggleExpand,
  onSendInvite,
  onDelete,
  onToggleAccess,
}) {
  const assignedProjects = client.client_project_access?.map((a) => a.project_id) || [];

  const statusColors = {
    pending: 'bg-zinc-500/10 text-zinc-400',
    invited: 'bg-amber-500/10 text-amber-400',
    active: 'bg-emerald-500/10 text-emerald-400',
    inactive: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
      {/* Main Row */}
      <div className="p-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-medium">
          {client.full_name?.[0]?.toUpperCase() || client.email[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">
              {client.full_name || 'Unnamed'}
            </h4>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                statusColors[client.status] || statusColors.pending
              }`}
            >
              {client.status || 'pending'}
            </span>
          </div>
          <p className="text-sm text-zinc-400 truncate">{client.email}</p>
          {client.company_name && (
            <p className="text-xs text-zinc-500">{client.company_name}</p>
          )}
        </div>

        {/* Project Count */}
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <FolderKanban className="w-4 h-4" />
          {assignedProjects.length} projects
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {client.status !== 'active' && (
            <button
              onClick={onSendInvite}
              className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
              title="Send invite"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Remove client"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-2 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded: Project Access */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50">
          <p className="text-sm font-medium text-zinc-300 mb-3">Project Access</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {projects.map((project) => {
              const hasAccess = assignedProjects.includes(project.id);
              return (
                <button
                  key={project.id}
                  onClick={() => onToggleAccess(project.id, hasAccess)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                    hasAccess
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {hasAccess ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 opacity-50" />
                  )}
                  <span className="text-sm truncate">{project.title}</span>
                </button>
              );
            })}
          </div>
          {projects.length === 0 && (
            <p className="text-sm text-zinc-500">No projects available</p>
          )}
        </div>
      )}
    </div>
  );
}

function AddClientModal({ organizationId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    company_name: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('portal_clients').insert({
        organization_id: organizationId,
        email: formData.email.toLowerCase().trim(),
        full_name: formData.full_name.trim() || null,
        company_name: formData.company_name.trim() || null,
        status: 'invited',
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('A client with this email already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Client added! Send them an invite to get started.');
      onSuccess();
    } catch (err) {
      console.error('Error adding client:', err);
      toast.error('Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            Add Portal Client
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Add a client who will have access to your portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="client@company.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="John Smith"
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              placeholder="Acme Inc."
              className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.email.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
