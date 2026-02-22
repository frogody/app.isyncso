import React, { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';

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
  { id: 'addresses', label: 'Delivery Addresses', icon: MapPin },
  { id: 'preferences', label: 'Order Preferences', icon: Settings },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'security', label: 'Security', icon: Shield },
];

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------

const MOCK_ACTIVITIES = [
  { id: 1, text: 'Order ORD-2026-00142 delivered', time: '2 hours ago', status: 'success' },
  { id: 2, text: 'Invoice INV-2026-0089 paid', time: '1 day ago', status: 'success' },
  { id: 3, text: 'Order ORD-2026-00141 shipped', time: '2 days ago', status: 'info' },
  { id: 4, text: 'Credit limit increased to EUR 50,000', time: '5 days ago', status: 'primary' },
  { id: 5, text: 'New team member Jane Smith added', time: '1 week ago', status: 'neutral' },
];

const MOCK_ADDRESSES = [
  {
    id: 1,
    label: 'Warehouse',
    street: 'Industrieweg 42',
    postal: '1234 AB',
    city: 'Amsterdam',
    country: 'Netherlands',
    department: 'Logistics',
    isDefault: true,
  },
  {
    id: 2,
    label: 'Head Office',
    street: 'Herengracht 100',
    postal: '1015 BS',
    city: 'Amsterdam',
    country: 'Netherlands',
    department: 'Administration',
    isDefault: false,
  },
  {
    id: 3,
    label: 'Distribution Center',
    street: 'Europaweg 8',
    postal: '3542 DR',
    city: 'Utrecht',
    country: 'Netherlands',
    department: 'Fulfillment',
    isDefault: false,
  },
];

const MOCK_TEAM = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@techdistribution.nl',
    role: 'admin',
    lastActive: '2 hours ago',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@techdistribution.nl',
    role: 'orderer',
    lastActive: '1 day ago',
  },
  {
    id: 3,
    name: 'Bob Wilson',
    email: 'bob@techdistribution.nl',
    role: 'viewer',
    lastActive: '3 days ago',
  },
];

const MOCK_LOGIN_HISTORY = [
  { date: 'Feb 22, 2026 14:32', ip: '82.161.45.12', location: 'Amsterdam, NL', device: 'Chrome / macOS' },
  { date: 'Feb 21, 2026 09:15', ip: '82.161.45.12', location: 'Amsterdam, NL', device: 'Chrome / macOS' },
  { date: 'Feb 20, 2026 16:44', ip: '185.23.108.3', location: 'Utrecht, NL', device: 'Safari / iOS' },
  { date: 'Feb 19, 2026 11:22', ip: '82.161.45.12', location: 'Amsterdam, NL', device: 'Chrome / macOS' },
  { date: 'Feb 18, 2026 08:55', ip: '82.161.45.12', location: 'Amsterdam, NL', device: 'Firefox / Windows' },
];

// ---------------------------------------------------------------------------
// Role badge styling
// ---------------------------------------------------------------------------

const ROLE_CONFIG = {
  admin: { label: 'Admin', status: 'primary' },
  orderer: { label: 'Orderer', status: 'info' },
  viewer: { label: 'Viewer', status: 'neutral' },
};

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab() {
  const creditUsed = 12500;
  const creditLimit = 50000;
  const creditAvailable = creditLimit - creditUsed;
  const creditPercent = ((creditLimit - creditUsed) / creditLimit) * 100;

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
              <StatusBadge status="primary" label="Gold Partner" pulse />
              <StatusBadge status="success" label="Active" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Credit Limit */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Credit Limit</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ws-text)' }}>
                  {formatCurrency(creditLimit)}
                </p>
              </div>
              {/* Available Credit */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Available Credit</p>
                <p className="text-xl font-bold" style={{ color: 'var(--ws-primary)' }}>
                  {formatCurrency(creditAvailable)}
                </p>
              </div>
              {/* Payment Terms */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Payment Terms</p>
                <p className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>Net-30</p>
              </div>
              {/* Member Since */}
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--ws-muted)' }}>Member Since</p>
                <p className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>January 2024</p>
              </div>
            </div>

            {/* Credit progress bar */}
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
          </div>

          {/* Right: Account Manager */}
          <div
            className="lg:w-72 flex-shrink-0 rounded-xl p-5"
            style={{
              background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--ws-muted)' }}>
              Account Manager
            </p>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #7c3aed))',
                  color: '#fff',
                }}
              >
                SB
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                  Sarah van den Berg
                </p>
                <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>Senior Account Executive</p>
              </div>
            </div>
            <div className="space-y-2">
              <a
                href="mailto:sarah@supplier.com"
                className="flex items-center gap-2 text-xs transition-colors"
                style={{ color: 'var(--ws-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
              >
                <Mail className="w-3.5 h-3.5" />
                sarah@supplier.com
              </a>
              <a
                href="tel:+31201234568"
                className="flex items-center gap-2 text-xs transition-colors"
                style={{ color: 'var(--ws-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
              >
                <Phone className="w-3.5 h-3.5" />
                +31 20 123 4568
              </a>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Quick Stats Row */}
      <motion.div
        variants={motionVariants.container}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard icon={Package} label="Total Orders" value="47" suffix="All time" index={0} />
        <StatCard icon={TrendingUp} label="This Year Spend" value={formatCurrency(124500)} suffix="2026" index={1} />
        <StatCard icon={CreditCard} label="Average Order" value={formatCurrency(2650)} index={2} />
        <StatCard icon={Clock} label="On-Time Payment" value="98%" suffix="Excellent" index={3} />
      </motion.div>

      {/* Recent Activity */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
            Recent Activity
          </h3>
          <button
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--ws-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
          >
            View All
          </button>
        </div>
        <div className="space-y-0">
          {MOCK_ACTIVITIES.map((activity, idx) => (
            <div
              key={activity.id}
              className="flex items-center justify-between py-3.5"
              style={{
                borderBottom:
                  idx < MOCK_ACTIVITIES.length - 1
                    ? '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)'
                    : 'none',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      activity.status === 'success'
                        ? '#22c55e'
                        : activity.status === 'info'
                        ? '#3b82f6'
                        : activity.status === 'primary'
                        ? 'var(--ws-primary)'
                        : '#a1a1aa',
                  }}
                />
                <p className="text-sm truncate" style={{ color: 'var(--ws-text)' }}>
                  {activity.text}
                </p>
              </div>
              <span className="text-xs flex-shrink-0 ml-4" style={{ color: 'var(--ws-muted)' }}>
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

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
// Tab: Company Profile
// ---------------------------------------------------------------------------

function CompanyProfileTab() {
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({
    companyName: 'TechDistribution B.V.',
    registrationNumber: 'KVK 12345678',
    vatNumber: 'NL123456789B01',
    industry: 'Technology Distribution',
    contactPerson: 'John Doe',
    email: 'john@techdistribution.nl',
    phone: '+31 20 123 4567',
    website: 'www.techdistribution.nl',
  });

  const handleSave = useCallback(() => {
    setEditing(false);
    setFeedback('Company profile updated!');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  const fields = [
    { key: 'companyName', label: 'Company Name', icon: Building2 },
    { key: 'registrationNumber', label: 'Registration Number (KVK)', icon: Hash },
    { key: 'vatNumber', label: 'VAT Number', icon: FileText },
    { key: 'industry', label: 'Industry', icon: Globe },
    { key: 'contactPerson', label: 'Contact Person', icon: User },
    { key: 'email', label: 'Email Address', icon: Mail },
    { key: 'phone', label: 'Phone Number', icon: Phone },
    { key: 'website', label: 'Website', icon: Globe },
  ];

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible">
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
              Company Information
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <FeedbackToast message={feedback} />
            {!editing ? (
              <SecondaryButton size="sm" icon={Edit2} onClick={() => setEditing(true)}>
                Edit
              </SecondaryButton>
            ) : (
              <div className="flex gap-2">
                <SecondaryButton size="sm" onClick={() => setEditing(false)}>Cancel</SecondaryButton>
                <PrimaryButton size="sm" icon={Check} onClick={handleSave}>Save</PrimaryButton>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </label>
              {editing ? (
                <GlassInput
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              ) : (
                <p
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)',
                    color: 'var(--ws-text)',
                  }}
                >
                  {form[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Delivery Addresses
// ---------------------------------------------------------------------------

function DeliveryAddressesTab() {
  const [addresses, setAddresses] = useState(MOCK_ADDRESSES);
  const [feedback, setFeedback] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    postal: '',
    city: '',
    country: 'Netherlands',
    department: '',
  });

  const handleSetDefault = useCallback((id) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    setFeedback('Default address updated!');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  const handleDelete = useCallback((id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setFeedback('Address removed!');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  const handleAdd = useCallback(() => {
    const id = Math.max(...addresses.map((a) => a.id), 0) + 1;
    setAddresses((prev) => [
      ...prev,
      { ...newAddress, id, isDefault: false },
    ]);
    setNewAddress({ label: '', street: '', postal: '', city: '', country: 'Netherlands', department: '' });
    setShowAddForm(false);
    setFeedback('Address added!');
    setTimeout(() => setFeedback(''), 2500);
  }, [addresses, newAddress]);

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FeedbackToast message={feedback} />
        </div>
        <SecondaryButton size="sm" icon={Plus} onClick={() => setShowAddForm(true)}>
          Add New Address
        </SecondaryButton>
      </div>

      {addresses.map((addr) => (
        <GlassCard key={addr.id} className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
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
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                    {addr.label}
                  </p>
                  {addr.isDefault && <StatusBadge status="success" label="Default" size="xs" />}
                </div>
                <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                  {addr.street}, {addr.postal} {addr.city}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>{addr.country}</p>
                {addr.department && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--ws-muted)' }}>
                    Department: {addr.department}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ws-primary)';
                    e.currentTarget.style.color = 'var(--ws-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ws-border)';
                    e.currentTarget.style.color = 'var(--ws-muted)';
                  }}
                >
                  Set as Default
                </button>
              )}
              <button
                onClick={() => setFeedback('Address updated!')}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--ws-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
                aria-label="Edit address"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(addr.id)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--ws-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
                aria-label="Delete address"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      ))}

      {/* Add Address Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-6">
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--ws-text)' }}>
                New Delivery Address
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Label</label>
                  <GlassInput
                    placeholder="e.g. Branch Office"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress((a) => ({ ...a, label: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Street Address</label>
                  <GlassInput
                    placeholder="Street and number"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Postal Code</label>
                  <GlassInput
                    placeholder="1234 AB"
                    value={newAddress.postal}
                    onChange={(e) => setNewAddress((a) => ({ ...a, postal: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>City</label>
                  <GlassInput
                    placeholder="Amsterdam"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Country</label>
                  <GlassInput
                    placeholder="Netherlands"
                    value={newAddress.country}
                    onChange={(e) => setNewAddress((a) => ({ ...a, country: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Department</label>
                  <GlassInput
                    placeholder="e.g. Logistics"
                    value={newAddress.department}
                    onChange={(e) => setNewAddress((a) => ({ ...a, department: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <PrimaryButton size="sm" icon={Check} onClick={handleAdd}>Save Address</PrimaryButton>
                <SecondaryButton size="sm" onClick={() => setShowAddForm(false)}>Cancel</SecondaryButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Order Preferences
// ---------------------------------------------------------------------------

function OrderPreferencesTab() {
  const [prefs, setPrefs] = useState({
    defaultAddress: 'warehouse',
    poPrefix: 'PO-2026-',
    preferredDay: 'tuesday',
    autoReorder: false,
    orderNotes: 'Deliver to loading dock B. Ring bell on arrival.',
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
          {/* Default Delivery Address */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
              Default Delivery Address
            </label>
            <GlassSelect
              value={prefs.defaultAddress}
              onChange={(e) => setPrefs((p) => ({ ...p, defaultAddress: e.target.value }))}
            >
              <option value="warehouse">Warehouse - Industrieweg 42, Amsterdam</option>
              <option value="office">Head Office - Herengracht 100, Amsterdam</option>
              <option value="dc">Distribution Center - Europaweg 8, Utrecht</option>
            </GlassSelect>
          </div>

          {/* PO Number Prefix */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--ws-muted)' }}>
              PO Number Prefix
            </label>
            <GlassInput
              value={prefs.poPrefix}
              onChange={(e) => setPrefs((p) => ({ ...p, poPrefix: e.target.value }))}
              placeholder="e.g. PO-2026-"
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--ws-muted)' }}>
              Auto-appended to all purchase orders
            </p>
          </div>

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
// Tab: Team Members
// ---------------------------------------------------------------------------

function TeamMembersTab() {
  const [team, setTeam] = useState(MOCK_TEAM);
  const [feedback, setFeedback] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('orderer');

  const handleRemove = useCallback((id) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    setFeedback('Team member removed.');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  const handleInvite = useCallback(() => {
    if (!inviteEmail) return;
    const id = Math.max(...team.map((m) => m.id), 0) + 1;
    setTeam((prev) => [
      ...prev,
      { id, name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, lastActive: 'Invited' },
    ]);
    setInviteEmail('');
    setShowInvite(false);
    setFeedback('Invitation sent!');
    setTimeout(() => setFeedback(''), 2500);
  }, [inviteEmail, inviteRole, team]);

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <FeedbackToast message={feedback} />
        <PrimaryButton size="sm" icon={UserPlus} onClick={() => setShowInvite(true)}>
          Invite Team Member
        </PrimaryButton>
      </div>

      {/* Invite form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-6">
              <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--ws-text)' }}>
                Invite New Team Member
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Email Address</label>
                  <GlassInput
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>Role</label>
                  <GlassSelect
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="orderer">Orderer</option>
                    <option value="viewer">Viewer</option>
                  </GlassSelect>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <PrimaryButton size="sm" icon={Mail} onClick={handleInvite}>Send Invite</PrimaryButton>
                <SecondaryButton size="sm" onClick={() => setShowInvite(false)}>Cancel</SecondaryButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team member list */}
      {team.map((member) => {
        const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
        return (
          <GlassCard key={member.id} className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: member.role === 'admin'
                      ? 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #7c3aed))'
                      : member.role === 'orderer'
                      ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                      : 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                    color: member.role === 'viewer' ? 'var(--ws-muted)' : '#fff',
                    border: member.role === 'viewer' ? '1px solid var(--ws-border)' : 'none',
                  }}
                >
                  {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                      {member.name}
                    </p>
                    <StatusBadge status={roleConfig.status} label={roleConfig.label} size="xs" />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>{member.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                    Last active: {member.lastActive}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ border: '1px solid var(--ws-border)', color: 'var(--ws-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ws-primary)';
                    e.currentTarget.style.color = 'var(--ws-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ws-border)';
                    e.currentTarget.style.color = 'var(--ws-muted)';
                  }}
                >
                  Edit Role
                </button>
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--ws-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
                    aria-label="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Security
// ---------------------------------------------------------------------------

function SecurityTab() {
  const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });
  const [twoFactor, setTwoFactor] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleChangePassword = useCallback(() => {
    setPasswords({ current: '', newPassword: '', confirm: '' });
    setFeedback('Password updated successfully!');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  const handleSignOutAll = useCallback(() => {
    setFeedback('All other sessions terminated.');
    setTimeout(() => setFeedback(''), 2500);
  }, []);

  return (
    <motion.div variants={motionVariants.container} initial="hidden" animate="visible" className="space-y-6">
      {/* Change Password */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <Lock className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
            Change Password
          </h3>
        </div>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
              Current Password
            </label>
            <GlassInput
              type="password"
              placeholder="Enter current password"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
              New Password
            </label>
            <GlassInput
              type="password"
              placeholder="Enter new password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--ws-muted)' }}>
              Confirm New Password
            </label>
            <GlassInput
              type="password"
              placeholder="Confirm new password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <PrimaryButton size="sm" onClick={handleChangePassword}>Update Password</PrimaryButton>
          <FeedbackToast message={feedback} />
        </div>
      </GlassCard>

      {/* Two-Factor Authentication */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <Smartphone className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
            Two-Factor Authentication
          </h3>
        </div>
        <div
          className="p-4 rounded-xl max-w-lg"
          style={{
            background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <Toggle
            label="Enable Two-Factor Authentication"
            description="Add an extra layer of security with an authenticator app. You will need to enter a verification code each time you sign in."
            checked={twoFactor}
            onChange={setTwoFactor}
          />
        </div>
        {twoFactor && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl max-w-lg"
            style={{
              background: 'color-mix(in srgb, var(--ws-primary) 5%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--ws-primary)' }}>
              Two-factor authentication is enabled. Use your authenticator app to generate verification codes.
            </p>
          </motion.div>
        )}
      </GlassCard>

      {/* Login History */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <Clock className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
            Login History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Date & Time', 'IP Address', 'Location', 'Device'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium py-2.5 pr-4"
                    style={{ color: 'var(--ws-muted)', borderBottom: '1px solid var(--ws-border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_LOGIN_HISTORY.map((entry, idx) => (
                <tr key={idx}>
                  <td
                    className="py-3 pr-4"
                    style={{
                      color: 'var(--ws-text)',
                      borderBottom:
                        idx < MOCK_LOGIN_HISTORY.length - 1
                          ? '1px solid color-mix(in srgb, var(--ws-border) 40%, transparent)'
                          : 'none',
                    }}
                  >
                    {entry.date}
                  </td>
                  <td
                    className="py-3 pr-4 font-mono text-xs"
                    style={{
                      color: 'var(--ws-muted)',
                      borderBottom:
                        idx < MOCK_LOGIN_HISTORY.length - 1
                          ? '1px solid color-mix(in srgb, var(--ws-border) 40%, transparent)'
                          : 'none',
                    }}
                  >
                    {entry.ip}
                  </td>
                  <td
                    className="py-3 pr-4"
                    style={{
                      color: 'var(--ws-muted)',
                      borderBottom:
                        idx < MOCK_LOGIN_HISTORY.length - 1
                          ? '1px solid color-mix(in srgb, var(--ws-border) 40%, transparent)'
                          : 'none',
                    }}
                  >
                    {entry.location}
                  </td>
                  <td
                    className="py-3"
                    style={{
                      color: 'var(--ws-muted)',
                      borderBottom:
                        idx < MOCK_LOGIN_HISTORY.length - 1
                          ? '1px solid color-mix(in srgb, var(--ws-border) 40%, transparent)'
                          : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" />
                      {entry.device}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Active Sessions */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--ws-text)' }}>
              Active Sessions
            </h3>
          </div>
          <SecondaryButton size="sm" icon={LogOut} onClick={handleSignOutAll}>
            Sign Out All Other Sessions
          </SecondaryButton>
        </div>
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--ws-primary) 5%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--ws-primary) 15%, transparent)',
              }}
            >
              <Monitor className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                Current Session
              </p>
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                Chrome / macOS -- Amsterdam, NL -- 82.161.45.12
              </p>
            </div>
          </div>
          <StatusBadge status="success" label="Active" size="xs" pulse />
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main: PreviewAccountPage
// ---------------------------------------------------------------------------

export default function PreviewAccountPage({ config, nav }) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTab = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'profile':
        return <CompanyProfileTab />;
      case 'addresses':
        return <DeliveryAddressesTab />;
      case 'preferences':
        return <OrderPreferencesTab />;
      case 'team':
        return <TeamMembersTab />;
      case 'security':
        return <SecurityTab />;
      default:
        return <OverviewTab />;
    }
  }, [activeTab]);

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
        subtitle="Manage your B2B account, team members, delivery addresses, and security settings"
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
