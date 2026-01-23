import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import {
  Plug2,
  Link2,
  Webhook,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Play,
  Eye,
  Search,
  Filter,
  ChevronRight,
  Activity,
  Globe,
  Key,
  Shield,
} from 'lucide-react';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

const CATEGORIES = [
  { value: 'crm', label: 'CRM', color: 'bg-blue-100 text-blue-800' },
  { value: 'productivity', label: 'Productivity', color: 'bg-green-100 text-green-800' },
  { value: 'communication', label: 'Communication', color: 'bg-purple-100 text-purple-800' },
  { value: 'email', label: 'Email', color: 'bg-orange-100 text-orange-800' },
  { value: 'payment', label: 'Payment', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'automation', label: 'Automation', color: 'bg-pink-100 text-pink-800' },
  { value: 'ai', label: 'AI', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'analytics', label: 'Analytics', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'storage', label: 'Storage', color: 'bg-amber-100 text-amber-800' },
];

const AUTH_TYPES = [
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'api_key', label: 'API Key' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'webhook', label: 'Webhook' },
];

function StatusBadge({ status }) {
  const styles = {
    connected: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    disabled: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    started: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const icons = {
    connected: CheckCircle2,
    error: XCircle,
    pending: Clock,
    disabled: XCircle,
    success: CheckCircle2,
    failed: XCircle,
    started: RefreshCw,
    completed: CheckCircle2,
  };

  const Icon = icons[status] || Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function CategoryBadge({ category }) {
  const cat = CATEGORIES.find(c => c.value === category);
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat?.color || 'bg-gray-100 text-gray-800'}`}>
      {cat?.label || category}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function ProviderModal({ provider, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    slug: provider?.slug || '',
    description: provider?.description || '',
    category: provider?.category || 'crm',
    auth_type: provider?.auth_type || 'api_key',
    logo_url: provider?.logo_url || '',
    website_url: provider?.website_url || '',
    docs_url: provider?.docs_url || '',
    features: provider?.features?.join(', ') || '',
    is_active: provider?.is_active ?? true,
    is_beta: provider?.is_beta ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        ...(provider?.id ? { id: provider.id } : {}),
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      toast.error('Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {provider ? 'Edit Provider' : 'Add Integration Provider'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!provider}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type *</label>
              <select
                value={formData.auth_type}
                onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {AUTH_TYPES.map(auth => (
                  <option key={auth.value} value={auth.value}>{auth.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://logo.clearbit.com/example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Docs URL</label>
              <input
                type="url"
                value={formData.docs_url}
                onChange={(e) => setFormData({ ...formData, docs_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
            <input
              type="text"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contacts_sync, email_send, calendar_read"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_beta}
                onChange={(e) => setFormData({ ...formData, is_beta: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Beta</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : provider ? 'Update Provider' : 'Create Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SyncLogsModal({ integration, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [integration.id]);

  async function fetchLogs() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${ADMIN_API_URL}/integrations/connections/${integration.id}/logs`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setLogs(data || []);
    } catch (error) {
      toast.error('Failed to fetch sync logs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Sync Logs</h2>
            <p className="text-sm text-gray-500">{integration.provider_name} - {integration.company_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No sync logs found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{log.sync_type}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.records_processed} processed
                      {log.records_failed > 0 && <span className="text-red-600 ml-1">({log.records_failed} failed)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveriesModal({ webhook, onClose }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, [webhook.id]);

  async function fetchDeliveries() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${ADMIN_API_URL}/integrations/webhooks/${webhook.id}/deliveries`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setDeliveries(data || []);
    } catch (error) {
      toast.error('Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Webhook Deliveries</h2>
            <p className="text-sm text-gray-500">{webhook.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No deliveries found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{delivery.event_type}</td>
                    <td className="px-4 py-3"><StatusBadge status={delivery.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {delivery.status_code ? (
                        <span className={delivery.status_code >= 200 && delivery.status_code < 300 ? 'text-green-600' : 'text-red-600'}>
                          {delivery.status_code}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {delivery.response_time_ms ? `${delivery.response_time_ms}ms` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(delivery.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminIntegrations() {
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [providers, setProviders] = useState([]);
  const [connections, setConnections] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [activeTab, setActiveTab] = useState('providers');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showSyncLogs, setShowSyncLogs] = useState(null);
  const [showDeliveries, setShowDeliveries] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  async function fetchData() {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();

      const [overviewRes, providersRes, connectionsRes, webhooksRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/integrations/overview`, { headers }),
        fetch(`${ADMIN_API_URL}/integrations/providers`, { headers }),
        fetch(`${ADMIN_API_URL}/integrations/connections`, { headers }),
        fetch(`${ADMIN_API_URL}/integrations/webhooks`, { headers }),
      ]);

      const [overviewData, providersData, connectionsData, webhooksData] = await Promise.all([
        overviewRes.json(),
        providersRes.json(),
        connectionsRes.json(),
        webhooksRes.json(),
      ]);

      setOverview(overviewData);
      setProviders(providersData || []);
      setConnections(connectionsData || []);
      setWebhooks(webhooksData || []);
    } catch (error) {
      console.error('Error fetching integrations data:', error);
      toast.error('Failed to load integrations data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProvider(data) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${ADMIN_API_URL}/integrations/providers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to save provider');
    }

    toast.success(data.id ? 'Provider updated' : 'Provider created');
    fetchData();
  }

  async function handleDeleteProvider(provider) {
    if (!confirm(`Are you sure you want to deactivate ${provider.name}?`)) return;

    try {
      const headers = await getAuthHeaders();
      await fetch(`${ADMIN_API_URL}/integrations/providers/${provider.id}`, {
        method: 'DELETE',
        headers,
      });

      toast.success('Provider deactivated');
      fetchData();
    } catch (error) {
      toast.error('Failed to deactivate provider');
    }
  }

  async function handleTestWebhook(webhook) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${ADMIN_API_URL}/integrations/webhooks/${webhook.id}/test`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Webhook test successful (${result.status_code}) - ${result.response_time_ms}ms`);
      } else {
        toast.error(`Webhook test failed: ${result.status_code || 'Connection error'}`);
      }

      fetchData();
    } catch (error) {
      toast.error('Failed to test webhook');
    }
  }

  const filteredProviders = providers.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredConnections = connections.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (searchQuery && !c.provider_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations Hub</h1>
          <p className="text-gray-500 mt-1">Manage external API integrations and webhooks</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Integration Providers"
          value={overview?.total_providers || 0}
          icon={Plug2}
          color="blue"
          subtitle="Available integrations"
        />
        <StatCard
          title="Active Connections"
          value={overview?.total_connections || 0}
          icon={Link2}
          color="green"
          subtitle="Connected companies"
        />
        <StatCard
          title="Error Connections"
          value={overview?.error_connections || 0}
          icon={AlertTriangle}
          color="red"
          subtitle="Need attention"
        />
        <StatCard
          title="Active Webhooks"
          value={overview?.total_webhooks || 0}
          icon={Webhook}
          color="purple"
          subtitle="Webhook endpoints"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            {[
              { id: 'providers', label: 'Providers', icon: Plug2 },
              { id: 'connections', label: 'Connections', icon: Link2 },
              { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {activeTab === 'providers' && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            )}

            {activeTab === 'connections' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="connected">Connected</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
                <option value="disabled">Disabled</option>
              </select>
            )}

            {activeTab === 'providers' && (
              <button
                onClick={() => {
                  setEditingProvider(null);
                  setShowProviderModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
            )}
          </div>

          {/* Providers Tab */}
          {activeTab === 'providers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      {provider.logo_url ? (
                        <img src={provider.logo_url} alt={provider.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <Plug2 className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{provider.name}</h3>
                        {provider.is_beta && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Beta</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{provider.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <CategoryBadge category={provider.category} />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {provider.auth_type === 'oauth2' ? <Shield className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                      {AUTH_TYPES.find(a => a.value === provider.auth_type)?.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">
                      {provider.connected_count || 0} connected
                    </span>
                    <div className="flex items-center gap-1">
                      {provider.website_url && (
                        <a
                          href={provider.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingProvider(provider);
                          setShowProviderModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredProviders.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No providers found
                </div>
              )}
            </div>
          )}

          {/* Connections Tab */}
          {activeTab === 'connections' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Connected By</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredConnections.map((connection) => (
                    <tr key={connection.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            {connection.provider_logo ? (
                              <img src={connection.provider_logo} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                              <Plug2 className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{connection.provider_name}</p>
                            <p className="text-xs text-gray-500">{connection.provider_category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{connection.company_name}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={connection.status} />
                        {connection.error_count > 0 && (
                          <span className="text-xs text-red-600 ml-2">({connection.error_count} errors)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {connection.last_sync_at
                          ? new Date(connection.last_sync_at).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {connection.connected_by_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setShowSyncLogs(connection)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Sync Logs"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredConnections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No connections found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">URL</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Events</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Deliveries</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{webhook.name}</p>
                          <p className="text-xs text-gray-500">{webhook.company_name || 'Platform'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 truncate max-w-[200px]">{webhook.url}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {webhook.events?.slice(0, 2).map((event, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {event}
                            </span>
                          ))}
                          {webhook.events?.length > 2 && (
                            <span className="text-xs text-gray-400">+{webhook.events.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={webhook.is_active ? 'connected' : 'disabled'} />
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-green-600">{webhook.successful_deliveries}</span>
                        {' / '}
                        <span className="text-red-600">{webhook.failed_deliveries}</span>
                        <span className="text-gray-400 text-xs ml-1">
                          ({webhook.deliveries_24h || 0} today)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleTestWebhook(webhook)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Test Webhook"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeliveries(webhook)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View Deliveries"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {webhooks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No webhooks configured
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProviderModal && (
        <ProviderModal
          provider={editingProvider}
          onClose={() => {
            setShowProviderModal(false);
            setEditingProvider(null);
          }}
          onSave={handleSaveProvider}
        />
      )}

      {showSyncLogs && (
        <SyncLogsModal
          integration={showSyncLogs}
          onClose={() => setShowSyncLogs(null)}
        />
      )}

      {showDeliveries && (
        <DeliveriesModal
          webhook={showDeliveries}
          onClose={() => setShowDeliveries(null)}
        />
      )}
    </div>
  );
}
