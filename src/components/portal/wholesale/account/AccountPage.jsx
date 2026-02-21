import React, { useState, useEffect, useCallback } from 'react';
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

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--ws-border, #27272a)',
        backgroundColor: 'var(--ws-surface, #18181b)',
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--ws-border, #27272a)' }}
      >
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
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccountPage
// ---------------------------------------------------------------------------

export default function AccountPage() {
  const { org } = useParams();
  const { orgId } = useWholesale();

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

  // Password
  const [passwords, setPasswords] = useState({
    current: '',
    new_password: '',
    confirm: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState({
    order_updates: true,
    promotions: false,
    new_products: true,
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
        .from('b2b_clients')
        .select('company_name, contact_name, email, phone, notification_preferences')
        .eq('organization_id', orgId)
        .single();
      if (error) throw error;
      if (data) {
        setProfile({
          company_name: data.company_name || '',
          contact_name: data.contact_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
        if (data.notification_preferences) {
          setNotifPrefs({
            order_updates: data.notification_preferences.order_updates !== false,
            promotions: data.notification_preferences.promotions === true,
            new_products: data.notification_preferences.new_products !== false,
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
        .eq('organization_id', orgId)
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
        .from('b2b_clients')
        .update({
          company_name: profile.company_name,
          contact_name: profile.contact_name,
          email: profile.email,
          phone: profile.phone,
        })
        .eq('organization_id', orgId);
      if (error) throw error;
      showToast('Profile updated successfully');
    } catch (err) {
      console.error('[AccountPage] Profile save error:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
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
        .from('b2b_clients')
        .update({ notification_preferences: notifPrefs })
        .eq('organization_id', orgId);
      if (error) throw error;
      showToast('Notification preferences saved');
    } catch (err) {
      console.error('[AccountPage] Notif save error:', err);
      showToast('Failed to save preferences', 'error');
    } finally {
      setNotifSaving(false);
    }
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

      {/* ======= Profile Section ======= */}
      <SectionCard icon={User} title="Profile">
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

      {/* ======= Addresses Section ======= */}
      <SectionCard icon={MapPin} title="Addresses">
        {addressLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ws-primary)' }} />
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start justify-between gap-4 rounded-lg px-4 py-3"
                style={{
                  backgroundColor: 'var(--ws-bg, #09090b)',
                  border: '1px solid var(--ws-border, #27272a)',
                }}
              >
                <div className="min-w-0">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      color: 'var(--ws-primary, #06b6d4)',
                    }}
                  >
                    {addr.label || 'Address'}
                  </span>
                  <p className="text-sm" style={{ color: 'var(--ws-text)' }}>
                    {addr.street_1}
                    {addr.street_2 ? `, ${addr.street_2}` : ''}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                    {[addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingAddress(addr)}
                    className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--ws-muted)' }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    disabled={deletingId === addr.id}
                    className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === addr.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#ef4444' }} />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                    )}
                  </button>
                </div>
              </div>
            ))}

            <AnimatePresence>
              {editingAddress && (
                <AddressEditor
                  address={editingAddress === 'new' ? null : editingAddress}
                  onSave={handleSaveAddress}
                  onCancel={() => setEditingAddress(null)}
                />
              )}
            </AnimatePresence>

            {!editingAddress && (
              <button
                type="button"
                onClick={() => setEditingAddress('new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.06]"
                style={{
                  color: 'var(--ws-primary, #06b6d4)',
                  border: '1px solid var(--ws-border, #27272a)',
                }}
              >
                <Plus className="w-4 h-4" />
                Add New Address
              </button>
            )}
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

      {/* ======= Notification Preferences ======= */}
      <SectionCard icon={Bell} title="Notification Preferences">
        <div className="space-y-4">
          {[
            { key: 'order_updates', label: 'Order updates', desc: 'Receive notifications when your order status changes' },
            { key: 'promotions', label: 'Promotions', desc: 'Receive promotional emails and special offers' },
            { key: 'new_products', label: 'New products', desc: 'Get notified when new products are added to the catalog' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs[key]}
                onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                style={{
                  backgroundColor: notifPrefs[key]
                    ? 'var(--ws-primary, #06b6d4)'
                    : 'var(--ws-border, #27272a)',
                }}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full transition-transform"
                  style={{
                    backgroundColor: 'var(--ws-bg, #09090b)',
                    transform: notifPrefs[key] ? 'translateX(22px)' : 'translateX(4px)',
                  }}
                />
              </button>
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
