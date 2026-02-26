import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassCard,
  Breadcrumb,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  GlassSelect,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';
import {
  Building2,
  CreditCard,
  TrendingUp,
  Package,
  Clock,
  Users,
  Shield,
  Star,
  Mail,
  Phone,
  User,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  Check,
  ChevronRight,
  Globe,
  FileText,
  Truck,
  Settings,
  Eye,
  UserPlus,
  Lock,
  Smartphone,
  Monitor,
  LogOut,
  Bell,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Hash,
  Calendar,
  RefreshCw,
  Copy,
  LogIn,
  Loader2,
} from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import { supabase } from '@/api/supabaseClient';
import { getClientOrders } from '@/lib/db/queries/b2b';

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group gap-4">
      <div className="min-w-0">
        <span className="text-sm font-medium block" style={{ color: 'var(--ws-text)' }}>
          {label}
        </span>
        {description && (
          <span className="text-xs block mt-0.5" style={{ color: 'var(--ws-muted)' }}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
        style={{
          backgroundColor: checked
            ? 'var(--ws-primary)'
            : 'color-mix(in srgb, var(--ws-border) 80%, transparent)',
        }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
        />
      </button>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Feedback toast
// ---------------------------------------------------------------------------

function FeedbackToast({ message }) {
  if (!message) return null;
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: 'rgb(34, 197, 94)' }}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {message}
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Stat Card (quick stats row)
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, suffix, index }) {
  return (
    <GlassCard className="p-5" custom={index} hoverable>
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
          }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
        </div>
        {suffix && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
              color: 'var(--ws-primary)',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ws-text)' }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--ws-muted)' }}>{label}</p>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({ active, label, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--ws-primary) 15%, transparent)'
          : 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
        color: active ? 'var(--ws-primary)' : 'var(--ws-muted)',
        border: active
          ? '1px solid color-mix(in srgb, var(--ws-primary) 30%, transparent)'
          : '1px solid transparent',
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TABS definition
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'profile', label: 'Company Profile', icon: FileText },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'preferences', label: 'Order Preferences', icon: Settings },
];

// ---------------------------------------------------------------------------
// Tab: Overview (uses real client data)
// ---------------------------------------------------------------------------

function OverviewTab({ client }) {
  const creditLimit = Number(client?.credit_limit) || 0;
  const creditUsed = 0; // Could be calculated from outstanding orders
  const creditAvailable = creditLimit - creditUsed;
  const creditPercent = creditLimit > 0 ? ((creditLimit - creditUsed) / creditLimit) * 100 : 100;
  const paymentTerms = client?.payment_terms_days || 30;
  const taxExempt = client?.tax_exempt || false;

  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Fetch recent orders for stats
  useEffect(() => {
    if (!client?.id) {
      setOrdersLoading(false);
      return;
    }
    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await getClientOrders(client.id, 50);
        if (!cancelled) setRecentOrders(data || []);
      } catch (err) {
        console.error('[OverviewTab] Failed to fetch orders:', err);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [client?.id]);

  const totalOrders = recentOrders.length;
  const totalSpend = recentOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const avgOrder = totalOrders > 0 ? totalSpend / totalOrders : 0;

  return (
    <motion.div
      variants={motionVariants.container}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Account Status Card */}
      <GlassCard accentBar className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Left: Account info */}
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status="success" label="Active" />
              {taxExempt && <StatusBadge status="info" label="Tax Exempt" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Company</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ws-text)' }}>
                  {client?.company_name || 'N/A'}
                </p>
              </div>
              {/* Contact */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Contact</p>
                <p className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
                  {client?.full_name || 'N/A'}
                </p>
              </div>
              {/* Credit Limit */}
              {creditLimit > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Credit Limit</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--ws-text)' }}>
                    {formatCurrency(creditLimit)}
                  </p>
                </div>
              )}
              {/* Payment Terms */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Payment Terms</p>
                <p className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
                  Net-{paymentTerms}
                </p>
              </div>
            </div>

            {/* Credit progress bar */}
            {creditLimit > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>Credit Utilization</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--ws-primary)' }}>
                    {creditPercent.toFixed(0)}% available
                  </p>
                </div>
                <div
                  className="h-2.5 rounded-full overflow-hidden"
                  style={{ background: 'color-mix(in srgb, var(--ws-border) 60%, transparent)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${creditPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #7c3aed))',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Contact Details */}
          <div
            className="lg:w-72 flex-shrink-0 rounded-xl p-5"
            style={{
              background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--ws-muted)' }}>
              Contact Details
            </p>
            <div className="space-y-3">
              {client?.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--ws-muted)' }}>
                    {client.email}
                  </span>
                </div>
              )}
              {client?.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                    {client.phone}
                  </span>
                </div>
              )}
              {client?.full_name && (
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                    {client.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Quick Stats Row */}
      <motion.div
        variants={motionVariants.container}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <StatCard
          icon={Package}
          label="Total Orders"
          value={ordersLoading ? '...' : String(totalOrders)}
          suffix="All time"
          index={0}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Spend"
          value={ordersLoading ? '...' : formatCurrency(totalSpend)}
          index={1}
        />
        <StatCard
          icon={CreditCard}
          label="Average Order"
          value={ordersLoading ? '...' : formatCurrency(avgOrder)}
          index={2}
        />
      </motion.div>

      {/* Notification Preferences */}
      <NotificationPreferences />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Notification Preferences (shared section)
// ---------------------------------------------------------------------------

function NotificationPreferences() {
  const [prefs, setPrefs] = useState({
    orderStatus: true,
    delivery: true,
    invoiceReminders: true,
    creditLimit: false,
    priceChanges: false,
  });
  const [feedback, setFeedback] = useState('');

  const handleSave = useCallback(() => {
    setFeedback('Preferences saved!');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <Bell className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
        <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
          Notification Preferences
        </h3>
      </div>
      <div className="space-y-4 max-w-lg">
        <Toggle
          label="Order status updates"
          description="Get notified when order status changes"
          checked={prefs.orderStatus}
          onChange={(v) => setPrefs((p) => ({ ...p, orderStatus: v }))}
        />
        <Toggle
          label="Delivery notifications"
          description="Tracking updates and delivery confirmations"
          checked={prefs.delivery}
          onChange={(v) => setPrefs((p) => ({ ...p, delivery: v }))}
        />
        <Toggle
          label="Invoice reminders"
          description="Payment due date reminders"
          checked={prefs.invoiceReminders}
          onChange={(v) => setPrefs((p) => ({ ...p, invoiceReminders: v }))}
        />
        <Toggle
          label="Credit limit alerts"
          description="Alerts when credit utilization exceeds 80%"
          checked={prefs.creditLimit}
          onChange={(v) => setPrefs((p) => ({ ...p, creditLimit: v }))}
        />
        <Toggle
          label="Price change notifications"
          description="Product price updates for your frequent orders"
          checked={prefs.priceChanges}
          onChange={(v) => setPrefs((p) => ({ ...p, priceChanges: v }))}
        />
      </div>
      <div className="flex items-center gap-3 mt-6">
        <PrimaryButton size="sm" onClick={handleSave}>Save Preferences</PrimaryButton>
        <FeedbackToast message={feedback} />
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Tab: Company Profile (real client data)
// ---------------------------------------------------------------------------

function CompanyProfileTab({ client }) {
  const fields = [
    { key: 'company_name', label: 'Company Name', icon: Building2, value: client?.company_name || '' },
    { key: 'full_name', label: 'Contact Person', icon: User, value: client?.full_name || '' },
    { key: 'email', label: 'Email Address', icon: Mail, value: client?.email || '' },
    { key: 'phone', label: 'Phone Number', icon: Phone, value: client?.phone || '' },
    { key: 'payment_terms', label: 'Payment Terms', icon: CreditCard, value: client?.payment_terms_days ? `Net-${client.payment_terms_days}` : 'N/A' },
    { key: 'credit_limit', label: 'Credit Limit', icon: TrendingUp, value: client?.credit_limit ? formatCurrency(Number(client.credit_limit)) : 'N/A' },
    { key: 'tax_exempt', label: 'Tax Exempt', icon: FileText, value: client?.tax_exempt ? 'Yes' : 'No' },
  ];

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible">
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <Building2 className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
            Company Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map(({ key, label, icon: Icon, value }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </label>
              <p
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)',
                  color: 'var(--ws-text)',
                }}
              >
                {value || '-'}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Addresses (full CRUD on delivery_addresses JSONB)
// ---------------------------------------------------------------------------

const EMPTY_ADDRESS_FORM = {
  label: '',
  street: '',
  number: '',
  city: '',
  postal_code: '',
  state: '',
  country: '',
  is_default: false,
};

function AddressForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(initial || EMPTY_ADDRESS_FORM);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = form.label.trim() && form.street.trim() && form.number.trim() && form.postal_code.trim() && form.city.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            Label *
          </label>
          <GlassInput
            value={form.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="e.g. Warehouse, Head Office"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            Street *
          </label>
          <GlassInput
            value={form.street}
            onChange={(e) => handleChange('street', e.target.value)}
            placeholder="Street name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            Number *
          </label>
          <GlassInput
            value={form.number}
            onChange={(e) => handleChange('number', e.target.value)}
            placeholder="e.g. 42, 12A"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            Postal Code *
          </label>
          <GlassInput
            value={form.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="Postal / ZIP code"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            City *
          </label>
          <GlassInput
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="City"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            State / Province
          </label>
          <GlassInput
            value={form.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="State or province"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
            Country
          </label>
          <GlassInput
            value={form.country}
            onChange={(e) => handleChange('country', e.target.value)}
            placeholder="Country"
          />
        </div>
      </div>

      {/* Is Default checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer group">
        <button
          type="button"
          role="checkbox"
          aria-checked={form.is_default}
          onClick={() => handleChange('is_default', !form.is_default)}
          className="w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0"
          style={{
            background: form.is_default
              ? 'var(--ws-primary)'
              : 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
            border: form.is_default
              ? '1px solid var(--ws-primary)'
              : '1px solid var(--ws-border)',
          }}
        >
          {form.is_default && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
        <span className="text-sm" style={{ color: 'var(--ws-text)' }}>
          Set as default delivery address
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2.5 pt-1">
        <PrimaryButton size="sm" onClick={() => onSave(form)} disabled={!isValid || isSaving}>
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              Save Address
            </span>
          )}
        </PrimaryButton>
        <SecondaryButton size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </SecondaryButton>
      </div>
    </div>
  );
}

function AddressesTab({ client }) {
  const [addresses, setAddresses] = useState(() => {
    return Array.isArray(client?.delivery_addresses) ? client.delivery_addresses : [];
  });
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync local state when client prop changes
  useEffect(() => {
    setAddresses(Array.isArray(client?.delivery_addresses) ? client.delivery_addresses : []);
  }, [client?.delivery_addresses]);

  const showFeedback = useCallback((msg) => {
    setFeedback(msg);
    setErrorMsg('');
    setTimeout(() => setFeedback(''), 3000);
  }, []);

  const showError = useCallback((msg) => {
    setErrorMsg(msg);
    setFeedback('');
    setTimeout(() => setErrorMsg(''), 5000);
  }, []);

  // Persist the full delivery_addresses array to the database
  const persistAddresses = useCallback(
    async (updatedList) => {
      if (!client?.id) return false;
      setSaving(true);
      try {
        const { error } = await supabase
          .from('portal_clients')
          .update({ delivery_addresses: updatedList })
          .eq('id', client.id);

        if (error) throw error;
        setAddresses(updatedList);
        return true;
      } catch (err) {
        console.error('[AddressesTab] Failed to save addresses:', err);
        showError('Failed to save. Please try again.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [client?.id, showError]
  );

  // Add a new address
  const handleAddSave = useCallback(
    async (formData) => {
      const newAddress = {
        ...formData,
        id: crypto.randomUUID(),
      };

      let updatedList = [...addresses];

      // If marking as default, unset previous default
      if (newAddress.is_default) {
        updatedList = updatedList.map((a) => ({ ...a, is_default: false }));
      }

      // If this is the first address, always make it default
      if (updatedList.length === 0) {
        newAddress.is_default = true;
      }

      updatedList.push(newAddress);

      const ok = await persistAddresses(updatedList);
      if (ok) {
        setAddingNew(false);
        showFeedback('Address added');
      }
    },
    [addresses, persistAddresses, showFeedback]
  );

  // Edit an existing address
  const handleEditSave = useCallback(
    async (formData) => {
      let updatedList = addresses.map((a) => {
        if (a.id === editingId) {
          return { ...a, ...formData };
        }
        return a;
      });

      // If setting this address as default, unset others
      if (formData.is_default) {
        updatedList = updatedList.map((a) =>
          a.id === editingId ? a : { ...a, is_default: false }
        );
      }

      // Guarantee at least one default exists
      const hasDefault = updatedList.some((a) => a.is_default);
      if (!hasDefault && updatedList.length > 0) {
        updatedList[0].is_default = true;
      }

      const ok = await persistAddresses(updatedList);
      if (ok) {
        setEditingId(null);
        showFeedback('Address updated');
      }
    },
    [addresses, editingId, persistAddresses, showFeedback]
  );

  // Delete an address (cannot delete default)
  const handleDelete = useCallback(
    async (addressId) => {
      const target = addresses.find((a) => a.id === addressId);
      if (target?.is_default) return;

      let updatedList = addresses.filter((a) => a.id !== addressId);

      // If we removed the last non-default address and now have addresses, ensure one is default
      const hasDefault = updatedList.some((a) => a.is_default);
      if (!hasDefault && updatedList.length > 0) {
        updatedList[0].is_default = true;
      }

      const ok = await persistAddresses(updatedList);
      if (ok) {
        showFeedback('Address removed');
      }
    },
    [addresses, persistAddresses, showFeedback]
  );

  // Set a specific address as default
  const handleSetDefault = useCallback(
    async (addressId) => {
      const updatedList = addresses.map((a) => ({
        ...a,
        is_default: a.id === addressId,
      }));

      const ok = await persistAddresses(updatedList);
      if (ok) {
        showFeedback('Default address updated');
      }
    },
    [addresses, persistAddresses, showFeedback]
  );

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible" className="space-y-4">
      {/* Empty state */}
      {addresses.length === 0 && !addingNew && (
        <GlassCard className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="w-10 h-10 mb-3" style={{ color: 'var(--ws-muted)', opacity: 0.5 }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ws-text)' }}>
              No delivery addresses
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--ws-muted)' }}>
              Add one to speed up checkout.
            </p>
            <PrimaryButton size="sm" icon={Plus} onClick={() => setAddingNew(true)}>
              Add Address
            </PrimaryButton>
          </div>
        </GlassCard>
      )}

      {/* Header row (shown when addresses exist or adding new) */}
      {(addresses.length > 0 || addingNew) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
              Delivery Addresses
            </h3>
            {addresses.length > 0 && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
                  color: 'var(--ws-primary)',
                }}
              >
                {addresses.length}
              </span>
            )}
          </div>
          {!addingNew && (
            <PrimaryButton size="sm" icon={Plus} onClick={() => { setAddingNew(true); setEditingId(null); }}>
              Add Address
            </PrimaryButton>
          )}
        </div>
      )}

      {/* Feedback / Error */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'rgb(34, 197, 94)' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {feedback}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'rgb(239, 68, 68)' }}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New form (inline, above existing cards) */}
      {addingNew && (
        <GlassCard className="p-5 sm:p-6" accentBar>
          <div className="flex items-center gap-2.5 mb-4">
            <Plus className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              New Delivery Address
            </p>
          </div>
          <AddressForm
            onSave={handleAddSave}
            onCancel={() => setAddingNew(false)}
            isSaving={saving}
          />
        </GlassCard>
      )}

      {/* Address cards */}
      {addresses.map((addr) => (
        <GlassCard key={addr.id} className="p-5 sm:p-6">
          {editingId === addr.id ? (
            /* ---------- Edit mode ---------- */
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Edit2 className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                  Edit Address
                </p>
              </div>
              <AddressForm
                initial={{
                  label: addr.label || '',
                  street: addr.street || '',
                  number: addr.number || '',
                  city: addr.city || '',
                  postal_code: addr.postal_code || '',
                  state: addr.state || '',
                  country: addr.country || '',
                  is_default: !!addr.is_default,
                }}
                onSave={handleEditSave}
                onCancel={() => setEditingId(null)}
                isSaving={saving}
              />
            </div>
          ) : (
            /* ---------- Display mode ---------- */
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: addr.is_default
                    ? 'color-mix(in srgb, var(--ws-primary) 12%, transparent)'
                    : 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                  border: addr.is_default
                    ? '1px solid color-mix(in srgb, var(--ws-primary) 25%, transparent)'
                    : '1px solid var(--ws-border)',
                }}
              >
                <MapPin
                  className="w-5 h-5"
                  style={{ color: addr.is_default ? 'var(--ws-primary)' : 'var(--ws-muted)' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                    {addr.label || 'Address'}
                  </p>
                  {addr.is_default && <StatusBadge status="success" label="Default" size="xs" />}
                </div>
                <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                  {[addr.street && addr.number ? `${addr.street} ${addr.number}` : addr.street, addr.postal_code, addr.city].filter(Boolean).join(', ')}
                </p>
                {(addr.state || addr.country) && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                    {[addr.state, addr.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!addr.is_default && (
                  <button
                    type="button"
                    title="Set as default"
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={saving}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      color: 'var(--ws-muted)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 10%, transparent)';
                      e.currentTarget.style.color = 'var(--ws-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--ws-muted)';
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="Edit"
                  onClick={() => { setEditingId(addr.id); setAddingNew(false); }}
                  disabled={saving}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color: 'var(--ws-muted)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 10%, transparent)';
                    e.currentTarget.style.color = 'var(--ws-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ws-muted)';
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {!addr.is_default && (
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => handleDelete(addr.id)}
                    disabled={saving}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      color: 'var(--ws-muted)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, rgb(239, 68, 68) 10%, transparent)';
                      e.currentTarget.style.color = 'rgb(239, 68, 68)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--ws-muted)';
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Order Preferences
// ---------------------------------------------------------------------------

function OrderPreferencesTab() {
  const [prefs, setPrefs] = useState({
    defaultAddress: 'shipping',
    preferredDay: 'tuesday',
    autoReorder: false,
    orderNotes: '',
    stockThreshold: '25',
  });
  const [feedback, setFeedback] = useState('');

  const handleSave = useCallback(() => {
    setFeedback('Preferences saved!');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible">
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <Settings className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
            Order Preferences
          </h3>
        </div>

        <div className="space-y-5 max-w-xl">
          {/* Preferred Delivery Day */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
              Preferred Delivery Day
            </label>
            <GlassSelect
              value={prefs.preferredDay}
              onChange={(e) => setPrefs((p) => ({ ...p, preferredDay: e.target.value }))}
            >
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
            </GlassSelect>
          </div>

          {/* Auto-Reorder Toggle */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <Toggle
              label="Auto-Reorder"
              description="Automatically reorder frequently purchased items when stock runs low"
              checked={prefs.autoReorder}
              onChange={(v) => setPrefs((p) => ({ ...p, autoReorder: v }))}
            />
          </div>

          {/* Default Order Notes */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
              Default Order Notes Template
            </label>
            <GlassInput
              value={prefs.orderNotes}
              onChange={(e) => setPrefs((p) => ({ ...p, orderNotes: e.target.value }))}
              placeholder="e.g. Deliver to loading dock B"
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--ws-muted)' }}>
              Auto-filled in the notes field on every new order
            </p>
          </div>

          {/* Stock Alert Threshold */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
              Minimum Stock Alert Threshold
            </label>
            <GlassInput
              type="number"
              value={prefs.stockThreshold}
              onChange={(e) => setPrefs((p) => ({ ...p, stockThreshold: e.target.value }))}
              placeholder="e.g. 25"
              min="0"
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--ws-muted)' }}>
              Get notified when tracked product stock drops below this quantity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <PrimaryButton size="sm" onClick={handleSave}>Save Preferences</PrimaryButton>
          <FeedbackToast message={feedback} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main: PreviewAccountPage
// ---------------------------------------------------------------------------

export default function PreviewAccountPage({ config, nav }) {
  const { client, isAuthenticated } = useWholesale();
  const [activeTab, setActiveTab] = useState('overview');

  // Not authenticated -- show sign-in prompt
  if (!isAuthenticated || !client) {
    return (
      <div className="min-h-full px-6 sm:px-10 lg:px-16 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Company Account' },
          ]}
        />
        <div className="mb-8">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
          >
            Company Account
          </h2>
          <p className="mt-1.5 text-sm sm:text-base" style={{ color: 'var(--ws-muted)' }}>
            Manage your B2B account, delivery addresses, and preferences
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
            }}
          >
            <LogIn className="w-7 h-7" style={{ color: 'var(--ws-primary)' }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--ws-text)' }}>
            Sign in to view your account
          </h3>
          <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--ws-muted)' }}>
            Log in to your B2B account to manage company details, delivery addresses, and payment information.
          </p>
          <PrimaryButton icon={LogIn} onClick={() => nav?.goToLogin?.()}>
            Sign In
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const renderTab = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab client={client} />;
      case 'profile':
        return <CompanyProfileTab client={client} />;
      case 'addresses':
        return <AddressesTab client={client} />;
      case 'preferences':
        return <OrderPreferencesTab />;
      default:
        return <OverviewTab client={client} />;
    }
  }, [activeTab, client]);

  return (
    <div className="min-h-full px-6 sm:px-10 lg:px-16 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Company Account' },
        ]}
      />

      {/* Section Header */}
      <div className="mb-8">
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
        >
          Company Account
        </h2>
        <p className="mt-1.5 text-sm sm:text-base" style={{ color: 'var(--ws-muted)' }}>
          Manage your B2B account, delivery addresses, and preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 -mx-1">
        <div
          className="flex items-center gap-2 p-1.5 rounded-2xl overflow-x-auto scrollbar-none"
          style={{
            background: 'color-mix(in srgb, var(--ws-surface) 50%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {renderTab}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
