import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  Lock,
  Bell,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  Building2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Star,
  StarOff,
  Globe,
  Phone,
  Mail,
  Calendar,
  Package,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import AddressEditor from './AddressEditor';

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
      style={{
        backgroundColor: type === 'error' ? '#991b1b' : 'var(--ws-surface, #18181b)',
        color: type === 'error' ? '#fca5a5' : 'var(--ws-primary, #06b6d4)',
        border: `1px solid ${type === 'error' ? '#7f1d1d' : 'var(--ws-border, #27272a)'}`,
      }}
    >
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Check className="w-4 h-4 flex-shrink-0" />
      )}
      {message}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------

function SectionCard({ icon: Icon, title, children, action }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--ws-border, #27272a)',
        backgroundColor: 'var(--ws-surface, #18181b)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)' }}
          >
            <Icon className="w-4 h-4" style={{ color: 'var(--ws-primary, #06b6d4)' }} />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--ws-text, #fafafa)' }}
          >
            {title}
          </h2>
        </div>
        {action && action}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Company Profile Card
// ---------------------------------------------------------------------------

function CompanyProfileCard({ client, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    website: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        company_name: client.company_name || '',
        phone: client.phone || '',
        website: client.website || '',
      });
    }
  }, [client]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setEditing(false);
    } catch {
      // parent handles toast
    } finally {
      setSaving(false);
    }
  };

  if (!client) return null;

  const memberSince = client.created_at ? formatDate(client.created_at) : '--';
  const isActive = client.status !== 'inactive' && client.status !== 'suspended';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--ws-border, #27272a)',
        backgroundColor: 'var(--ws-surface, #18181b)',
      }}
    >
      <div className="px-5 py-5">
        <div className="flex items-start gap-4">
          {/* Logo / Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid var(--ws-border)',
            }}
          >
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={client.company_name}
                className="w-full h-full rounded-xl object-cover"
               loading="lazy" decoding="async" />
            ) : (
              <Building2 className="w-6 h-6" style={{ color: 'var(--ws-primary, #06b6d4)' }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {editing ? (
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  className="text-lg font-bold bg-transparent outline-none border-b"
                  style={{
                    color: 'var(--ws-text, #fafafa)',
                    borderColor: 'var(--ws-primary, #06b6d4)',
                  }}
                />
              ) : (
                <h2
                  className="text-lg font-bold truncate"
                  style={{ color: 'var(--ws-text, #fafafa)' }}
                >
                  {client.company_name || 'Company'}
                </h2>
              )}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none flex-shrink-0"
                style={{
                  backgroundColor: isActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: isActive ? '#4ade80' : '#f87171',
                  border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                }}
              >
                {isActive ? 'Active' : client.status || 'Inactive'}
              </span>
            </div>

            {/* Details grid */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {client.id && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ws-muted)' }}>
                  <Package className="w-3 h-3" />
                  ID: {client.id.slice(0, 8)}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ws-muted)' }}>
                <Calendar className="w-3 h-3" />
                Member since {memberSince}
              </span>
              {(client.phone || form.phone) && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ws-muted)' }}>
                  <Phone className="w-3 h-3" />
                  {editing ? (
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="bg-transparent outline-none border-b text-xs"
                      style={{
                        color: 'var(--ws-text)',
                        borderColor: 'var(--ws-primary, #06b6d4)',
                        width: 120,
                      }}
                      placeholder="Phone"
                    />
                  ) : (
                    client.phone || '--'
                  )}
                </span>
              )}
              {(client.website || form.website || editing) && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ws-muted)' }}>
                  <Globe className="w-3 h-3" />
                  {editing ? (
                    <input
                      type="url"
                      value={form.website}
                      onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                      className="bg-transparent outline-none border-b text-xs"
                      style={{
                        color: 'var(--ws-text)',
                        borderColor: 'var(--ws-primary, #06b6d4)',
                        width: 160,
                      }}
                      placeholder="Website URL"
                    />
                  ) : (
                    client.website || '--'
                  )}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ws-muted)' }}>
                  <Mail className="w-3 h-3" />
                  {client.email}
                </span>
              )}
            </div>
          </div>

          {/* Edit / Save buttons */}
          <div className="flex-shrink-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      company_name: client.company_name || '',
                      phone: client.phone || '',
                      website: client.website || '',
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'var(--ws-muted)', border: '1px solid var(--ws-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                title="Edit company info"
              >
                <Pencil className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order Statistics
// ---------------------------------------------------------------------------

function OrderStatistics({ orgId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch all orders for this org
        const { data: orders, error } = await supabase
          .from('b2b_orders')
          .select('id, total, items, items_count, created_at')
          .eq('organization_id', resolvedOrgId);

        if (error) throw error;

        if (!orders || orders.length === 0) {
          setStats({ totalOrders: 0, totalSpent: 0, avgValue: 0, mostOrdered: null });
        } else {
          const totalOrders = orders.length;
          const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
          const avgValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

          // Find most ordered product across all orders with inline items
          const productCounts = {};
          for (const o of orders) {
            if (Array.isArray(o.items)) {
              for (const item of o.items) {
                const name = item.name || item.product_name || 'Unknown';
                const qty = item.quantity || 1;
                productCounts[name] = (productCounts[name] || 0) + qty;
              }
            }
          }

          let mostOrdered = null;
          let maxCount = 0;
          for (const [name, count] of Object.entries(productCounts)) {
            if (count > maxCount) {
              maxCount = count;
              mostOrdered = name;
            }
          }

          setStats({ totalOrders, totalSpent, avgValue, mostOrdered });
        }
      } catch (err) {
        console.error('[AccountPage] Stats fetch error:', err);
        setStats({ totalOrders: 0, totalSpent: 0, avgValue: 0, mostOrdered: null });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ws-primary)' }} />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { icon: ShoppingBag, label: 'Total Orders', value: stats.totalOrders.toString() },
    { icon: DollarSign, label: 'Total Spent', value: formatCurrency(stats.totalSpent) },
    { icon: TrendingUp, label: 'Avg. Order Value', value: formatCurrency(stats.avgValue) },
    { icon: Star, label: 'Most Ordered', value: stats.mostOrdered || '--' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
          style={{
            backgroundColor: 'var(--ws-bg, #09090b)',
            border: '1px solid var(--ws-border, #27272a)',
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)' }}
          >
            <card.icon className="w-4 h-4" style={{ color: 'var(--ws-primary, #06b6d4)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--ws-text, #fafafa)' }}>
              {card.value}
            </p>
            <p className="text-[11px] leading-none" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
              {card.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification Preference categories
// ---------------------------------------------------------------------------

const NOTIFICATION_CATEGORIES = [
  {
    key: 'order_updates',
    category: 'Order Updates',
    items: [
      { key: 'order_updates', label: 'Order status changes', desc: 'Get notified when your order status changes', channels: ['email', 'inapp'] },
      { key: 'shipping_updates', label: 'Shipping updates', desc: 'Track your shipments in real-time', channels: ['email', 'inapp'] },
    ],
  },
  {
    key: 'messages',
    category: 'Messages',
    items: [
      { key: 'direct_messages', label: 'Direct messages', desc: 'Receive notifications for new messages', channels: ['email', 'inapp'] },
    ],
  },
  {
    key: 'announcements',
    category: 'Announcements',
    items: [
      { key: 'promotions', label: 'Promotions', desc: 'Special offers and discounts', channels: ['email'] },
      { key: 'new_products', label: 'New products', desc: 'Get notified when new products are added', channels: ['email', 'inapp'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// AccountPage
// ---------------------------------------------------------------------------

export default function AccountPage() {
  const { org } = useParams();
  const { orgId, organizationId, client: wholesaleClient } = useWholesale();
  const resolvedOrgId = organizationId || orgId;

  // Full client data (more fields than what WholesaleProvider gives us)
  const [client, setClient] = useState(null);

  // Profile
  const [profile, setProfile] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(null); // null | 'new' | address obj
  const [deletingId, setDeletingId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  // Password
  const [passwords, setPasswords] = useState({
    current: '',
    new_password: '',
    confirm: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Notifications (enhanced)
  const [notifPrefs, setNotifPrefs] = useState({
    order_updates: { email: true, inapp: true },
    shipping_updates: { email: true, inapp: true },
    direct_messages: { email: true, inapp: true },
    promotions: { email: false },
    new_products: { email: true, inapp: true },
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // ---- Fetch profile ----
  const fetchProfile = useCallback(async () => {
    if (!orgId) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_clients')
        .select('*')
        .eq('organization_id', resolvedOrgId)
        .single();
      if (error) throw error;
      if (data) {
        setClient(data);
        setProfile({
          company_name: data.company_name || '',
          contact_name: data.contact_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        // Parse notification preferences
        if (data.notification_preferences) {
          const np = data.notification_preferences;
          // Handle both old format (flat booleans) and new format (nested objects)
          setNotifPrefs((prev) => {
            const next = { ...prev };
            for (const cat of NOTIFICATION_CATEGORIES) {
              for (const item of cat.items) {
                if (typeof np[item.key] === 'boolean') {
                  // Old format: convert to new
                  next[item.key] = {};
                  for (const ch of item.channels) {
                    next[item.key][ch] = np[item.key];
                  }
                } else if (typeof np[item.key] === 'object' && np[item.key] !== null) {
                  next[item.key] = { ...next[item.key], ...np[item.key] };
                }
              }
            }
            return next;
          });
        }
      }
    } catch (err) {
      console.error('[AccountPage] Profile fetch error:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [orgId]);

  // ---- Fetch addresses ----
  const fetchAddresses = useCallback(async () => {
    if (!orgId) return;
    setAddressLoading(true);
    try {
      const { data, error } = await supabase
        .from('b2b_client_addresses')
        .select('*')
        .eq('organization_id', resolvedOrgId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setAddresses(data || []);
    } catch (err) {
      console.error('[AccountPage] Addresses fetch error:', err);
    } finally {
      setAddressLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [fetchProfile, fetchAddresses]);

  // ---- Save profile ----
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('portal_clients')
        .update({
          company_name: profile.company_name,
          contact_name: profile.contact_name,
          email: profile.email,
          phone: profile.phone,
        })
        .eq('organization_id', resolvedOrgId);
      if (error) throw error;
      showToast('Profile updated successfully');
      // Refresh client
      fetchProfile();
    } catch (err) {
      console.error('[AccountPage] Profile save error:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // ---- Save company profile card edits ----
  const handleSaveCompanyProfile = async (formData) => {
    try {
      const updatePayload = {};
      if (formData.company_name) updatePayload.company_name = formData.company_name;
      if (formData.phone !== undefined) updatePayload.phone = formData.phone;
      if (formData.website !== undefined) updatePayload.website = formData.website;

      const { error } = await supabase
        .from('portal_clients')
        .update(updatePayload)
        .eq('organization_id', resolvedOrgId);
      if (error) throw error;
      showToast('Company info updated');
      fetchProfile();
    } catch (err) {
      console.error('[AccountPage] Company save error:', err);
      showToast('Failed to update company info', 'error');
      throw err;
    }
  };

  // ---- Save address ----
  const handleSaveAddress = async (formData) => {
    try {
      if (editingAddress && editingAddress !== 'new' && editingAddress.id) {
        const { error } = await supabase
          .from('b2b_client_addresses')
          .update(formData)
          .eq('id', editingAddress.id);
        if (error) throw error;
        showToast('Address updated');
      } else {
        const { error } = await supabase
          .from('b2b_client_addresses')
          .insert({ ...formData, organization_id: orgId });
        if (error) throw error;
        showToast('Address added');
      }
      setEditingAddress(null);
      fetchAddresses();
    } catch (err) {
      console.error('[AccountPage] Address save error:', err);
      showToast('Failed to save address', 'error');
    }
  };

  // ---- Delete address ----
  const handleDeleteAddress = async (id) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('b2b_client_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('Address deleted');
      fetchAddresses();
    } catch (err) {
      console.error('[AccountPage] Address delete error:', err);
      showToast('Failed to delete address', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Set default address ----
  const handleSetDefault = async (id) => {
    setSettingDefaultId(id);
    try {
      // First, unset all defaults
      await supabase
        .from('b2b_client_addresses')
        .update({ is_default: false })
        .eq('organization_id', resolvedOrgId);

      // Then set the new default
      const { error } = await supabase
        .from('b2b_client_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      showToast('Default address updated');
      fetchAddresses();
    } catch (err) {
      console.error('[AccountPage] Set default error:', err);
      showToast('Failed to set default address', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  };

  // ---- Change password ----
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passwords.current) errs.current = 'Required';
    if (!passwords.new_password) errs.new_password = 'Required';
    else if (passwords.new_password.length < 6) errs.new_password = 'Min 6 characters';
    if (passwords.new_password !== passwords.confirm) errs.confirm = 'Passwords do not match';
    setPasswordErrors(errs);
    if (Object.keys(errs).length) return;

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new_password,
      });
      if (error) throw error;
      setPasswords({ current: '', new_password: '', confirm: '' });
      showToast('Password changed successfully');
    } catch (err) {
      console.error('[AccountPage] Password change error:', err);
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  // ---- Save notification prefs ----
  const handleSaveNotifs = async () => {
    setNotifSaving(true);
    try {
      const { error } = await supabase
        .from('portal_clients')
        .update({ notification_preferences: notifPrefs })
        .eq('organization_id', resolvedOrgId);
      if (error) throw error;
      showToast('Notification preferences saved');
    } catch (err) {
      console.error('[AccountPage] Notif save error:', err);
      showToast('Failed to save preferences', 'error');
    } finally {
      setNotifSaving(false);
    }
  };

  // Toggle a notification channel
  const toggleNotifChannel = (itemKey, channel) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [channel]: !(prev[itemKey]?.[channel]),
      },
    }));
  };

  // ---- Shared styles ----
  const fc = 'w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:opacity-40';
  const inputStyle = (hasError) => ({
    backgroundColor: 'var(--ws-bg, #09090b)',
    color: 'var(--ws-text, #fafafa)',
    border: hasError ? '1px solid #ef4444' : '1px solid var(--ws-border, #27272a)',
  });
  const labelStyle = { color: 'var(--ws-muted, #a1a1aa)' };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: 'var(--ws-primary, #06b6d4)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      style={{ color: 'var(--ws-text)' }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--ws-text)' }}
        >
          My Account
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ws-muted)' }}>
          Manage your profile, addresses, and preferences
        </p>
      </div>

      {/* ======= Company Profile Card ======= */}
      <CompanyProfileCard client={client} onSave={handleSaveCompanyProfile} />

      {/* ======= Order Statistics ======= */}
      <SectionCard icon={TrendingUp} title="Order Statistics">
        <OrderStatistics orgId={orgId} />
      </SectionCard>

      {/* ======= Profile Section ======= */}
      <SectionCard icon={User} title="Contact Information">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Company name</label>
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => setProfile((p) => ({ ...p, company_name: e.target.value }))}
                className={fc}
                style={inputStyle(false)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Contact name</label>
              <input
                type="text"
                value={profile.contact_name}
                onChange={(e) => setProfile((p) => ({ ...p, contact_name: e.target.value }))}
                className={fc}
                style={inputStyle(false)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                className={fc}
                style={inputStyle(false)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className={fc}
                style={inputStyle(false)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
            >
              {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Profile
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ======= Addresses Section (Enhanced Cards) ======= */}
      <SectionCard
        icon={MapPin}
        title="Address Book"
        action={
          !editingAddress && (
            <button
              type="button"
              onClick={() => setEditingAddress('new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/[0.06]"
              style={{
                color: 'var(--ws-primary, #06b6d4)',
                border: '1px solid var(--ws-border, #27272a)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Address
            </button>
          )
        }
      >
        {addressLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ws-primary)' }} />
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.length === 0 && !editingAddress && (
              <div className="text-center py-8">
                <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--ws-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                  No addresses yet. Add your first address.
                </p>
              </div>
            )}

            {/* Address cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="relative rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor: 'var(--ws-bg, #09090b)',
                    border: addr.is_default
                      ? '1px solid var(--ws-primary, #06b6d4)'
                      : '1px solid var(--ws-border, #27272a)',
                  }}
                >
                  {/* Header: label + badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        color: 'var(--ws-primary, #06b6d4)',
                      }}
                    >
                      {addr.label || 'Address'}
                    </span>
                    {addr.is_default && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          color: '#4ade80',
                        }}
                      >
                        <Star className="w-2.5 h-2.5" />
                        Default
                      </span>
                    )}
                  </div>

                  {/* Address text */}
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ws-text)' }}>
                    {addr.street_1}
                    {addr.street_2 ? `, ${addr.street_2}` : ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                    {[addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ')}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5" style={{ borderTop: '1px solid var(--ws-border)' }}>
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={settingDefaultId === addr.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                        style={{ color: 'var(--ws-muted)' }}
                        title="Set as default"
                      >
                        {settingDefaultId === addr.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <StarOff className="w-3 h-3" />
                        )}
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingAddress(addr)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
                      style={{ color: 'var(--ws-muted)' }}
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={deletingId === addr.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      style={{ color: '#f87171' }}
                      title="Delete"
                    >
                      {deletingId === addr.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Address editor modal/inline */}
            <AnimatePresence>
              {editingAddress && (
                <AddressEditor
                  address={editingAddress === 'new' ? null : editingAddress}
                  onSave={handleSaveAddress}
                  onCancel={() => setEditingAddress(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </SectionCard>

      {/* ======= Password Section ======= */}
      <SectionCard icon={Lock} title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Current password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              className={fc}
              style={inputStyle(!!passwordErrors.current)}
            />
            {passwordErrors.current && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{passwordErrors.current}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={labelStyle}>New password</label>
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
              className={fc}
              style={inputStyle(!!passwordErrors.new_password)}
            />
            {passwordErrors.new_password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{passwordErrors.new_password}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Confirm new password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              className={fc}
              style={inputStyle(!!passwordErrors.confirm)}
            />
            {passwordErrors.confirm && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{passwordErrors.confirm}</p>}
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
            >
              {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ======= Enhanced Notification Preferences ======= */}
      <SectionCard icon={Bell} title="Notification Preferences">
        <div className="space-y-6">
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              {/* Category header */}
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--ws-muted, #a1a1aa)' }}
              >
                {cat.category}
              </h3>

              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 px-3 py-3 rounded-lg"
                    style={{
                      backgroundColor: 'var(--ws-bg, #09090b)',
                      border: '1px solid var(--ws-border, #27272a)',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>{item.desc}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Email toggle */}
                      {item.channels.includes('email') && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--ws-muted)' }}>Email</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={notifPrefs[item.key]?.email ?? false}
                            onClick={() => toggleNotifChannel(item.key, 'email')}
                            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                            style={{
                              backgroundColor: notifPrefs[item.key]?.email
                                ? 'var(--ws-primary, #06b6d4)'
                                : 'var(--ws-border, #27272a)',
                            }}
                          >
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
                              style={{
                                backgroundColor: 'var(--ws-bg, #09090b)',
                                transform: notifPrefs[item.key]?.email ? 'translateX(17px)' : 'translateX(3px)',
                              }}
                            />
                          </button>
                        </div>
                      )}

                      {/* In-app toggle */}
                      {item.channels.includes('inapp') && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--ws-muted)' }}>In-app</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={notifPrefs[item.key]?.inapp ?? false}
                            onClick={() => toggleNotifChannel(item.key, 'inapp')}
                            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
                            style={{
                              backgroundColor: notifPrefs[item.key]?.inapp
                                ? 'var(--ws-primary, #06b6d4)'
                                : 'var(--ws-border, #27272a)',
                            }}
                          >
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
                              style={{
                                backgroundColor: 'var(--ws-bg, #09090b)',
                                transform: notifPrefs[item.key]?.inapp ? 'translateX(17px)' : 'translateX(3px)',
                              }}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveNotifs}
              disabled={notifSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}
            >
              {notifSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Preferences
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
