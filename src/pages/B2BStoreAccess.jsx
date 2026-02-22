/**
 * B2BStoreAccess - Manage which clients can access the B2B storefront.
 *
 * Toggle store access per client (active ↔ suspended), invite new clients,
 * resend magic links, and see login history. Linked from StoreDashboard.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  AlertCircle,
  Loader2,
  Users,
  Building2,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Mail,
  Send,
  CheckCircle2,
  X,
  ArrowLeft,
  RefreshCw,
  Clock,
  Globe,
  Lock,
  Unlock,
  Eye,
  Phone,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// InviteClientModal (self-contained)
// ---------------------------------------------------------------------------

function InviteClientModal({ open, onClose, organizationId, onSuccess }) {
  const [form, setForm] = useState({ email: '', full_name: '', company_name: '', phone: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setForm({ email: '', full_name: '', company_name: '', phone: '' });
    setError(null);
    setSending(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.full_name.trim() || sending) return;
    setSending(true);
    setError(null);

    try {
      // 1. Insert portal_client
      const { error: insertErr } = await supabase
        .from('portal_clients')
        .insert({
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name.trim(),
          company_name: form.company_name.trim() || null,
          phone: form.phone.trim() || null,
          organization_id: organizationId,
          status: 'invited',
        });

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error('A client with this email already exists');
        }
        throw insertErr;
      }

      // 2. Look up store subdomain for magic link
      let redirectUrl = undefined;
      const { data: ps } = await supabase
        .from('portal_settings')
        .select('store_subdomain')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (ps?.store_subdomain) {
        redirectUrl = `https://${ps.store_subdomain}.syncstore.business`;
      }

      // 3. Send magic link
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: form.email.trim().toLowerCase(),
        options: {
          ...(redirectUrl ? { emailRedirectTo: redirectUrl } : {}),
          data: { full_name: form.full_name.trim(), invited_as: 'portal_client' },
        },
      });

      if (otpErr) {
        console.warn('[InviteClient] OTP warning:', otpErr.message);
      }

      onSuccess?.(`Invited ${form.full_name.trim()} (${form.email.trim()})`);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to invite client');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            Invite Client
          </h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="client@company.com"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="John Doe"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                placeholder="Acme Inc."
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+31..."
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.email.trim() || !form.full_name.trim() || sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Invite
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: format date
// ---------------------------------------------------------------------------

function formatDate(d) {
  if (!d) return 'Never';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return 'Never';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// ClientAccessCard
// ---------------------------------------------------------------------------

function ClientAccessCard({ client, onToggleAccess, onResendInvite, toggling, resending }) {
  const hasAccess = client.status === 'active' || client.status === 'invited';
  const isInvited = client.status === 'invited';
  const isSuspended = client.status === 'suspended';

  return (
    <div
      className="rounded-2xl border p-4 transition-all duration-200"
      style={{
        borderColor: hasAccess ? 'rgba(6, 182, 212, 0.15)' : 'rgba(63, 63, 70, 0.4)',
        backgroundColor: hasAccess ? 'rgba(6, 182, 212, 0.03)' : 'rgba(24, 24, 27, 0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Client info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              backgroundColor: hasAccess ? 'rgba(6, 182, 212, 0.1)' : 'rgba(63, 63, 70, 0.3)',
              color: hasAccess ? '#06b6d4' : '#71717a',
            }}
          >
            {(client.full_name || client.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {client.full_name || client.contact_name || client.name || 'Unnamed'}
            </p>
            <p className="text-xs text-zinc-500 truncate">{client.email}</p>
            {client.company_name && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-zinc-600" />
                <span className="text-xs text-zinc-500 truncate">{client.company_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status + Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: hasAccess
                ? isInvited ? 'rgba(234, 179, 8, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              color: hasAccess
                ? isInvited ? '#eab308' : '#10b981'
                : '#ef4444',
              border: `1px solid ${hasAccess
                ? isInvited ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)'}`,
            }}
          >
            {hasAccess
              ? isInvited ? <Mail className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />
              : <ShieldOff className="w-3 h-3" />
            }
            {isInvited ? 'Invited' : hasAccess ? 'Has Access' : 'No Access'}
          </span>

          {/* Access toggle */}
          <button
            onClick={() => onToggleAccess(client.id, hasAccess ? 'suspended' : 'active')}
            disabled={toggling}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
            style={{
              backgroundColor: hasAccess ? '#06b6d4' : '#3f3f46',
            }}
            title={hasAccess ? 'Revoke store access' : 'Grant store access'}
          >
            {toggling ? (
              <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white animate-spin" />
            ) : (
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200"
                style={{
                  transform: hasAccess ? 'translateX(22px)' : 'translateX(4px)',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Footer: last login + resend */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(63, 63, 70, 0.3)' }}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          {client.last_login_at
            ? `Last login: ${formatDateTime(client.last_login_at)}`
            : 'Never logged in'}
        </div>
        {isInvited && (
          <button
            onClick={() => onResendInvite(client)}
            disabled={resending}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
          >
            {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Resend Invite
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function B2BStoreAccess() {
  const { user } = useUser();
  const navigate = useNavigate();
  const organizationId = user?.organization_id || user?.company_id;

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, access, no-access, invited
  const [inviteOpen, setInviteOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [storeUrl, setStoreUrl] = useState(null);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('portal_clients')
        .select('id, full_name, name, contact_name, email, company_name, phone, status, last_login_at, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setClients(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Fetch store URL
  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('portal_settings')
      .select('store_subdomain, custom_domain')
      .eq('organization_id', organizationId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.custom_domain) setStoreUrl(`https://${data.custom_domain}`);
        else if (data?.store_subdomain) setStoreUrl(`https://${data.store_subdomain}.syncstore.business`);
      });
  }, [organizationId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Toggle access
  const handleToggleAccess = async (clientId, newStatus) => {
    setTogglingId(clientId);
    try {
      const { error: updateErr } = await supabase
        .from('portal_clients')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (updateErr) throw updateErr;

      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );

      setSuccessMsg(newStatus === 'active' ? 'Access granted' : 'Access revoked');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // Resend invite
  const handleResendInvite = async (client) => {
    setResendingId(client.id);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: client.email,
        options: {
          ...(storeUrl ? { emailRedirectTo: storeUrl } : {}),
          data: { full_name: client.full_name, invited_as: 'portal_client' },
        },
      });
      if (otpErr) throw otpErr;
      setSuccessMsg(`Invite resent to ${client.email}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResendingId(null);
    }
  };

  // Filter + search
  const filteredClients = useMemo(() => {
    let result = clients;

    if (filter === 'access') result = result.filter((c) => c.status === 'active');
    else if (filter === 'no-access') result = result.filter((c) => c.status === 'suspended');
    else if (filter === 'invited') result = result.filter((c) => c.status === 'invited');

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.full_name || c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.company_name || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [clients, filter, search]);

  // Stats
  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    invited: clients.filter((c) => c.status === 'invited').length,
    suspended: clients.filter((c) => c.status === 'suspended').length,
  }), [clients]);

  const FILTER_TABS = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'access', label: 'Has Access', count: stats.active },
    { key: 'invited', label: 'Pending', count: stats.invited },
    { key: 'no-access', label: 'No Access', count: stats.suspended },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 py-6">
        {/* Back + Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/storedashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Store Dashboard
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                Store Access
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Control which clients can access your B2B storefront
              </p>
            </div>
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Invite Client
            </button>
          </div>
        </div>

        {/* Store URL info */}
        {storeUrl && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/40 mb-6 text-sm">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-zinc-400">Store URL:</span>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 font-mono text-xs hover:underline truncate"
            >
              {storeUrl}
            </a>
            <span className="text-zinc-600 ml-auto shrink-0">
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              Login required
            </span>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Clients', value: stats.total, icon: Users, color: '#a1a1aa' },
            { label: 'Has Access', value: stats.active, icon: Unlock, color: '#10b981' },
            { label: 'Pending Invite', value: stats.invited, icon: Mail, color: '#eab308' },
            { label: 'No Access', value: stats.suspended, icon: Lock, color: '#ef4444' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 p-3 text-center"
            >
              <stat.icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <div className="flex gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: filter === tab.key ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  color: filter === tab.key ? '#06b6d4' : '#71717a',
                  border: `1px solid ${filter === tab.key ? 'rgba(6, 182, 212, 0.2)' : 'rgba(63, 63, 70, 0.3)'}`,
                }}
              >
                {tab.label}
                <span className="opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 w-full sm:w-auto sm:max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-cyan-500/40"
            />
          </div>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Client list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {clients.length === 0 ? 'No clients yet' : 'No matching clients'}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              {clients.length === 0
                ? 'Invite your first B2B client to give them store access.'
                : 'Try adjusting your search or filter.'}
            </p>
            {clients.length === 0 && (
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Invite First Client
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <ClientAccessCard
                key={client.id}
                client={client}
                onToggleAccess={handleToggleAccess}
                onResendInvite={handleResendInvite}
                toggling={togglingId === client.id}
                resending={resendingId === client.id}
              />
            ))}
            <p className="text-center text-xs text-zinc-600 pt-2">
              {filteredClients.length} of {clients.length} clients
            </p>
          </div>
        )}
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {inviteOpen && (
          <InviteClientModal
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            organizationId={organizationId}
            onSuccess={(msg) => {
              setSuccessMsg(msg);
              setTimeout(() => setSuccessMsg(null), 3000);
              fetchClients();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
