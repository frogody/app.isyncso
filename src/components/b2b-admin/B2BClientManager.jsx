/**
 * B2BClientManager - Admin interface for managing portal clients.
 *
 * Assigns clients to client groups, price lists, and manages B2B settings.
 * Columns: Name, Email, Company, Status, Client Group, Price List, Last Login
 * Inline editing: client_group_id, price_list_id, payment_terms_days, credit_limit, tax_exempt
 * Expandable row: addresses, notes, order stats
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  Search,
  AlertCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  Save,
  RotateCcw,
  MapPin,
  FileText,
  ShoppingCart,
  UserCircle,
  UserPlus,
  Mail,
  Phone,
  Send,
  CheckCircle2,
} from 'lucide-react';

import { ACTIVE_STATUS_COLORS, DEFAULT_STATUS_COLOR } from './shared/b2bConstants';

const STATUS_TABS = [
  { key: 'all', label: 'All Clients' },
  { key: 'active', label: 'Active' },
  { key: 'invited', label: 'Invited' },
  { key: 'suspended', label: 'Suspended' },
];

const CLIENT_STATUS_COLORS = {
  active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  invited: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const ITEMS_PER_PAGE = 20;

function StatusBadge({ status }) {
  const colorClass = CLIENT_STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {(status || 'unknown').charAt(0).toUpperCase() + (status || 'unknown').slice(1)}
    </span>
  );
}

function InlineSelect({ value, onChange, options, placeholder, saving }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={saving}
      className="w-full px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 text-white text-xs focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50 [color-scheme:dark]"
    >
      <option value="">{placeholder || 'None'}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  );
}

function ExpandedDetail({ client, orderStats }) {
  const shippingAddress = client.shipping_address || {};
  const billingAddress = client.billing_address || {};

  const formatAddress = (addr) => {
    if (!addr || typeof addr !== 'object') return null;
    const parts = [
      addr.street || addr.address_line_1,
      addr.city,
      addr.state || addr.province,
      addr.postal_code || addr.zip,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const stats = orderStats || {};
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount || 0);

  return (
    <div className="border-t border-zinc-800 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Shipping Address */}
      <div className="rounded-xl bg-zinc-800/40 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Shipping Address</p>
        </div>
        <p className="text-sm text-zinc-300">
          {formatAddress(shippingAddress) || 'No shipping address on file'}
        </p>
      </div>

      {/* Billing Address */}
      <div className="rounded-xl bg-zinc-800/40 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-3.5 h-3.5 text-zinc-500" />
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Billing Address</p>
        </div>
        <p className="text-sm text-zinc-300">
          {formatAddress(billingAddress) || 'No billing address on file'}
        </p>
      </div>

      {/* Order Stats */}
      <div className="rounded-xl bg-zinc-800/40 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-3.5 h-3.5 text-zinc-500" />
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Order History</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{stats.order_count || 0}</p>
            <p className="text-xs text-zinc-500">Orders</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{formatCurrency(stats.total_spend)}</p>
            <p className="text-xs text-zinc-500">Total Spend</p>
          </div>
        </div>
      </div>

      {/* B2B Notes */}
      {client.b2b_notes && (
        <div className="col-span-full rounded-xl bg-zinc-800/40 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">B2B Notes</p>
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{client.b2b_notes}</p>
        </div>
      )}
    </div>
  );
}

function InviteClientModal({ open, onClose, organizationId, onSuccess }) {
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    company_name: '',
    phone: '',
    notes: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setForm({ email: '', full_name: '', company_name: '', phone: '', notes: '' });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.full_name.trim()) return;

    setSending(true);
    setError(null);

    try {
      // 1. Insert portal_clients row
      const { error: insertErr } = await supabase.from('portal_clients').insert({
        email: form.email.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim() || null,
        phone: form.phone.trim() || null,
        b2b_notes: form.notes.trim() || null,
        organization_id: organizationId,
        status: 'invited',
      });

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error('A client with this email already exists');
        }
        throw insertErr;
      }

      // 2. Look up store subdomain for magic link redirect
      let redirectUrl = undefined;
      const { data: portalSettings } = await supabase
        .from('portal_settings')
        .select('store_subdomain')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (portalSettings?.store_subdomain) {
        redirectUrl = `https://${portalSettings.store_subdomain}.syncstore.business`;
      }

      // 3. Send magic link OTP
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: form.email.trim().toLowerCase(),
        options: {
          ...(redirectUrl ? { emailRedirectTo: redirectUrl } : {}),
          data: {
            full_name: form.full_name.trim(),
            invited_as: 'portal_client',
          },
        },
      });

      if (otpErr) {
        console.warn('[InviteClient] OTP warning (non-blocking):', otpErr.message);
        // Don't throw here -- the client record is already created.
        // The merchant can resend the invite later.
      }

      // 4. Done
      onSuccess(`Invitation sent to ${form.email}`);
      handleClose();
    } catch (err) {
      console.error('[InviteClient] error:', err);
      setError(err.message || 'Failed to invite client');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10">
              <UserPlus className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Invite Client</h2>
              <p className="text-xs text-zinc-500">Send a magic link invitation</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error inside modal */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2.5 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-red-500/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={handleChange('email')}
              placeholder="client@company.com"
              disabled={sending}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
              <UserCircle className="w-3.5 h-3.5" />
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={handleChange('full_name')}
              placeholder="Jane Doe"
              disabled={sending}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Company + Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Company
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={handleChange('company_name')}
                placeholder="Acme Corp"
                disabled={sending}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
                <Phone className="w-3.5 h-3.5" />
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+31 6 1234 5678"
                disabled={sending}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
              <FileText className="w-3.5 h-3.5" />
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Internal notes about this client..."
              rows={3}
              disabled={sending}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={sending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={sending || !form.email.trim() || !form.full_name.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Invite
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function B2BClientManager() {
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [clients, setClients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Dropdown options
  const [clientGroups, setClientGroups] = useState([]);
  const [priceLists, setPriceLists] = useState([]);

  // Filters
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Inline editing
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);

  // Expanded row
  const [expandedId, setExpandedId] = useState(null);
  const [orderStats, setOrderStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch dropdown options
  const fetchOptions = useCallback(async () => {
    if (!organizationId) return;

    try {
      const [groupsRes, priceListsRes] = await Promise.all([
        supabase
          .from('b2b_client_groups')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('b2b_price_lists')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('name'),
      ]);

      setClientGroups(groupsRes.data || []);
      setPriceLists(priceListsRes.data || []);
    } catch (err) {
      console.error('[B2BClientManager] options fetch error:', err);
    }
  }, [organizationId]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('portal_clients')
        .select(
          `
          id,
          name,
          full_name,
          contact_name,
          email,
          company_name,
          status,
          client_group_id,
          price_list_id,
          payment_terms_days,
          credit_limit,
          tax_exempt,
          shipping_address,
          billing_address,
          b2b_notes,
          last_login_at,
          created_at,
          b2b_client_groups (id, name),
          b2b_price_lists (id, name)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Status filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      // Pagination
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error: fetchErr, count } = await query;
      if (fetchErr) throw fetchErr;

      let filteredData = data || [];

      // Client-side search (name, email, company_name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredData = filteredData.filter((client) => {
          const clientName = (client.name || client.full_name || client.contact_name || '').toLowerCase();
          const clientEmail = (client.email || '').toLowerCase();
          const clientCompany = (client.company_name || '').toLowerCase();
          return (
            clientName.includes(q) ||
            clientEmail.includes(q) ||
            clientCompany.includes(q)
          );
        });
      }

      setClients(filteredData);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[B2BClientManager] fetch error:', err);
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [organizationId, activeTab, searchQuery, page]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Fetch order stats for expanded row
  const fetchOrderStats = async (clientId) => {
    setStatsLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('b2b_orders')
        .select('id, total')
        .eq('client_id', clientId);

      if (err) throw err;

      const orders = data || [];
      const totalSpend = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      setOrderStats((prev) => ({
        ...prev,
        [clientId]: { order_count: orders.length, total_spend: totalSpend },
      }));
    } catch (err) {
      console.error('[B2BClientManager] stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const toggleExpand = (clientId) => {
    if (expandedId === clientId) {
      setExpandedId(null);
    } else {
      setExpandedId(clientId);
      if (!orderStats[clientId]) {
        fetchOrderStats(clientId);
      }
    }
  };

  // Start inline editing
  const startEdit = (client) => {
    setEditingId(client.id);
    setEditData({
      client_group_id: client.client_group_id || '',
      price_list_id: client.price_list_id || '',
      payment_terms_days: client.payment_terms_days ?? '',
      credit_limit: client.credit_limit ?? '',
      tax_exempt: client.tax_exempt || false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (clientId) => {
    setSavingId(clientId);
    try {
      const updatePayload = {
        client_group_id: editData.client_group_id || null,
        price_list_id: editData.price_list_id || null,
        payment_terms_days: editData.payment_terms_days !== '' ? parseInt(editData.payment_terms_days, 10) : null,
        credit_limit: editData.credit_limit !== '' ? parseFloat(editData.credit_limit) : null,
        tax_exempt: editData.tax_exempt,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from('portal_clients')
        .update(updatePayload)
        .eq('id', clientId);

      if (upErr) throw upErr;

      // Update local state
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== clientId) return c;
          return {
            ...c,
            ...updatePayload,
            b2b_client_groups: clientGroups.find((g) => g.id === updatePayload.client_group_id) || null,
            b2b_price_lists: priceLists.find((p) => p.id === updatePayload.price_list_id) || null,
          };
        })
      );

      setEditingId(null);
      setEditData({});
      setSuccessMsg('Client updated successfully');
    } catch (err) {
      console.error('[B2BClientManager] save error:', err);
      setError(err.message || 'Failed to update client');
    } finally {
      setSavingId(null);
    }
  };

  // Quick-assign group or price list (without full edit mode)
  const quickUpdate = async (clientId, field, value) => {
    setSavingId(clientId);
    try {
      const payload = {
        [field]: value || null,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from('portal_clients')
        .update(payload)
        .eq('id', clientId);

      if (upErr) throw upErr;

      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== clientId) return c;
          const updated = { ...c, ...payload };
          if (field === 'client_group_id') {
            updated.b2b_client_groups = clientGroups.find((g) => g.id === value) || null;
          }
          if (field === 'price_list_id') {
            updated.b2b_price_lists = priceLists.find((p) => p.id === value) || null;
          }
          return updated;
        })
      );

      setSuccessMsg('Client updated');
    } catch (err) {
      console.error('[B2BClientManager] quick update error:', err);
      setError(err.message || 'Failed to update');
    } finally {
      setSavingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getClientName = (client) =>
    client.full_name || client.name || client.contact_name || 'Unnamed Client';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading skeleton
  if (loading && clients.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-12 bg-zinc-800/60 rounded-xl animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/60 rounded-xl border border-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white">B2B Clients</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage client assignments to groups, price lists, and B2B settings
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400">
            <Save className="w-5 h-5 shrink-0" />
            <p className="text-sm">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto p-1 hover:bg-cyan-500/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar + Invite button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Invite Client
          </button>
        </div>

        {/* Clients table */}
        {clients.length === 0 && !loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-16 text-center">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">
              {activeTab !== 'all'
                ? `No ${activeTab} clients found`
                : 'No clients found'}
            </p>
            {searchQuery && (
              <p className="text-xs text-zinc-600 mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <div className="col-span-2">Name</div>
              <div className="col-span-2">Company</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2">Client Group</div>
              <div className="col-span-2">Price List</div>
              <div className="col-span-2">Last Login</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-zinc-800">
              {clients.map((client) => {
                const isEditing = editingId === client.id;
                const isExpanded = expandedId === client.id;
                const isSaving = savingId === client.id;

                return (
                  <div key={client.id}>
                    {/* Main row */}
                    <div
                      className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors ${
                        isEditing ? 'bg-cyan-500/5' : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      {/* Name + Email */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {getClientName(client)}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {client.email || ''}
                        </p>
                      </div>

                      {/* Company */}
                      <div className="col-span-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <p className="text-sm text-zinc-300 truncate">
                            {client.company_name || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 text-center">
                        <StatusBadge status={client.status || 'active'} />
                      </div>

                      {/* Client Group */}
                      <div className="col-span-2 min-w-0">
                        {isEditing ? (
                          <InlineSelect
                            value={editData.client_group_id}
                            onChange={(val) =>
                              setEditData((prev) => ({ ...prev, client_group_id: val }))
                            }
                            options={clientGroups}
                            placeholder="No group"
                            saving={isSaving}
                          />
                        ) : (
                          <InlineSelect
                            value={client.client_group_id}
                            onChange={(val) => quickUpdate(client.id, 'client_group_id', val)}
                            options={clientGroups}
                            placeholder="No group"
                            saving={isSaving}
                          />
                        )}
                      </div>

                      {/* Price List */}
                      <div className="col-span-2 min-w-0">
                        {isEditing ? (
                          <InlineSelect
                            value={editData.price_list_id}
                            onChange={(val) =>
                              setEditData((prev) => ({ ...prev, price_list_id: val }))
                            }
                            options={priceLists}
                            placeholder="No price list"
                            saving={isSaving}
                          />
                        ) : (
                          <InlineSelect
                            value={client.price_list_id}
                            onChange={(val) => quickUpdate(client.id, 'price_list_id', val)}
                            options={priceLists}
                            placeholder="No price list"
                            saving={isSaving}
                          />
                        )}
                      </div>

                      {/* Last Login */}
                      <div className="col-span-2 text-sm text-zinc-400">
                        {formatDateTime(client.last_login_at)}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(client.id)}
                              disabled={isSaving}
                              className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
                              title="Save changes"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(client)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                              title="Edit B2B settings"
                            >
                              <UserCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleExpand(client.id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                              title="View details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline edit panel (expanded when editing) */}
                    {isEditing && (
                      <div className="border-t border-zinc-800/50 bg-cyan-500/5 px-5 py-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                              Payment Terms (days)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editData.payment_terms_days}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  payment_terms_days: e.target.value,
                                }))
                              }
                              placeholder="e.g., 30"
                              disabled={isSaving}
                              className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                              Credit Limit (EUR)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={editData.credit_limit}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  credit_limit: e.target.value,
                                }))
                              }
                              placeholder="e.g., 10000"
                              disabled={isSaving}
                              className="w-full px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors disabled:opacity-50"
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={editData.tax_exempt}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      tax_exempt: e.target.checked,
                                    }))
                                  }
                                  disabled={isSaving}
                                  className="sr-only"
                                />
                                <div
                                  className={`w-10 h-5.5 rounded-full transition-colors ${
                                    editData.tax_exempt ? 'bg-cyan-600' : 'bg-zinc-700'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow-sm transition-transform ${
                                      editData.tax_exempt ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </div>
                              </div>
                              <span className="text-sm text-zinc-300">Tax Exempt</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded detail row */}
                    {isExpanded && !isEditing && (
                      <ExpandedDetail
                        client={client}
                        orderStats={orderStats[client.id]}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500">
                  Showing {page * ITEMS_PER_PAGE + 1}-
                  {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of{' '}
                  {totalCount} clients
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-zinc-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading overlay for refetch */}
        {loading && clients.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm text-zinc-300">Refreshing...</span>
          </div>
        )}

        {/* Invite Client Modal */}
        <InviteClientModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          organizationId={organizationId}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            fetchClients();
          }}
        />
      </div>
    </div>
  );
}
