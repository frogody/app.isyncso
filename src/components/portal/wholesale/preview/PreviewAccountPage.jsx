import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassCard,
  SectionHeader,
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
// Helper: format address JSONB
// ---------------------------------------------------------------------------

function formatAddress(addr) {
  if (!addr) return null;
  return [addr.street, addr.city, addr.zip, addr.state, addr.country]
    .filter(Boolean)
    .join(', ');
}

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
// Tab: Addresses (real client addresses from JSONB)
// ---------------------------------------------------------------------------

function AddressesTab({ client }) {
  const shippingAddress = client?.shipping_address || null;
  const billingAddress = client?.billing_address || null;

  const addresses = useMemo(() => {
    const list = [];
    if (shippingAddress && Object.keys(shippingAddress).length > 0) {
      list.push({ id: 'shipping', label: 'Shipping Address', ...shippingAddress, isDefault: true });
    }
    if (billingAddress && Object.keys(billingAddress).length > 0) {
      list.push({ id: 'billing', label: 'Billing Address', ...billingAddress, isDefault: false });
    }
    return list;
  }, [shippingAddress, billingAddress]);

  if (addresses.length === 0) {
    return (
      <motion.div variants={motionVariants.container} initial="hidden" animate="visible">
        <GlassCard className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="w-10 h-10 mb-3" style={{ color: 'var(--ws-muted)', opacity: 0.5 }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ws-text)' }}>No addresses on file</p>
            <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
              Contact your account manager to add delivery addresses.
            </p>
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible" className="space-y-4">
      {addresses.map((addr) => (
        <GlassCard key={addr.id} className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: addr.isDefault
                  ? 'color-mix(in srgb, var(--ws-primary) 12%, transparent)'
                  : 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                border: addr.isDefault
                  ? '1px solid color-mix(in srgb, var(--ws-primary) 25%, transparent)'
                  : '1px solid var(--ws-border)',
              }}
            >
              <MapPin className="w-5 h-5" style={{ color: addr.isDefault ? 'var(--ws-primary)' : 'var(--ws-muted)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                  {addr.label}
                </p>
                {addr.isDefault && <StatusBadge status="success" label="Default" size="xs" />}
              </div>
              <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                {[addr.street, addr.city, addr.zip].filter(Boolean).join(', ')}
              </p>
              {addr.country && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>{addr.country}</p>
              )}
            </div>
          </div>
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
        <SectionHeader
          title="Company Account"
          subtitle="Manage your B2B account, delivery addresses, and preferences"
        />
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
      <SectionHeader
        title="Company Account"
        subtitle="Manage your B2B account, delivery addresses, and preferences"
      />

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
