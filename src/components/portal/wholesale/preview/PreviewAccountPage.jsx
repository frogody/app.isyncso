import React, { useState, useCallback } from 'react';
import {
  User,
  MapPin,
  Lock,
  Bell,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Check,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Toggle switch (pure Tailwind, no external lib)
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span
        className="text-sm"
        style={{ color: 'var(--ws-text, #fff)' }}
      >
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
        style={{
          backgroundColor: checked
            ? 'var(--ws-primary, #06b6d4)'
            : 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
          style={{
            transform: checked ? 'translateX(24px)' : 'translateX(4px)',
          }}
        />
      </button>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Shared input style helper
// ---------------------------------------------------------------------------

const inputStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderColor: 'var(--ws-border, rgba(255,255,255,0.1))',
  color: 'var(--ws-text, #fff)',
};

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:ring-1 placeholder:opacity-40';

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div
      className="rounded-xl p-5 sm:p-6"
      style={{
        backgroundColor: 'var(--ws-surface, #18181b)',
        border: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <Icon
          className="w-5 h-5"
          style={{ color: 'var(--ws-primary, #06b6d4)' }}
        />
        <h2
          className="text-base font-semibold"
          style={{ color: 'var(--ws-text, #fff)' }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback message
// ---------------------------------------------------------------------------

function FeedbackMessage({ message }) {
  if (!message) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: 'rgb(34, 197, 94)' }}
    >
      <Check className="w-3.5 h-3.5" />
      {message}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProfileSection
// ---------------------------------------------------------------------------

function ProfileSection() {
  const [form, setForm] = useState({
    fullName: 'John Doe',
    email: 'john@company.com',
    company: 'Acme Industries B.V.',
    phone: '+31 6 12345678',
    jobTitle: 'Procurement Manager',
  });
  const [feedback, setFeedback] = useState('');

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    setFeedback('Changes saved!');
    setTimeout(() => setFeedback(''), 2000);
  }, []);

  return (
    <SectionCard icon={User} title="Profile Information">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" /> Full Name
            </span>
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            <span className="inline-flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Company */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Company
            </span>
          </label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => handleChange('company', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Phone */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Job Title - full width */}
        <div className="sm:col-span-2">
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            <span className="inline-flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Job Title
            </span>
          </label>
          <input
            type="text"
            value={form.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary, #06b6d4)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Save Changes
        </button>
        <FeedbackMessage message={feedback} />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// AddressesSection
// ---------------------------------------------------------------------------

const DEMO_ADDRESSES = [
  {
    id: 1,
    name: 'Main Office',
    line1: 'Keizersgracht 123',
    line2: '1015 CJ Amsterdam',
    country: 'Netherlands',
    isDefault: true,
  },
  {
    id: 2,
    name: 'Warehouse',
    line1: 'Industrieweg 45',
    line2: '3044 AS Rotterdam',
    country: 'Netherlands',
    isDefault: false,
  },
];

function AddressesSection() {
  const [feedback, setFeedback] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAction = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2000);
  }, []);

  return (
    <SectionCard icon={MapPin} title="Shipping Addresses">
      <div className="space-y-3">
        {DEMO_ADDRESSES.map((addr) => (
          <div
            key={addr.id}
            className="flex items-start justify-between p-4 rounded-lg"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--ws-border, rgba(255,255,255,0.06))',
            }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ws-text, #fff)' }}
                >
                  {addr.name}
                </p>
                {addr.isDefault && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      color: 'rgb(34, 197, 94)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    Default
                  </span>
                )}
              </div>
              <p
                className="text-sm"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
              >
                {addr.line1}, {addr.line2}, {addr.country}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <button
                type="button"
                onClick={() => handleAction('Address updated!')}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                aria-label="Edit address"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAction('Address removed!')}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                aria-label="Delete address"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false);
              handleAction('Address added!');
            } else {
              setShowAddForm(true);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            border: '1px solid var(--ws-border, rgba(255,255,255,0.15))',
            color: 'var(--ws-text, #fff)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Address
        </button>
        <FeedbackMessage message={feedback} />
      </div>

      {showAddForm && (
        <div
          className="mt-4 p-4 rounded-lg space-y-3"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--ws-border, rgba(255,255,255,0.06))',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                Label
              </label>
              <input
                type="text"
                placeholder="e.g. Branch Office"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                Street Address
              </label>
              <input
                type="text"
                placeholder="Street and number"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                City & Postal Code
              </label>
              <input
                type="text"
                placeholder="1000 AA City"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                Country
              </label>
              <input
                type="text"
                placeholder="Netherlands"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                handleAction('Address added!');
              }}
              className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--ws-primary, #06b6d4)',
                color: 'var(--ws-bg, #000)',
              }}
            >
              Save Address
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// PasswordSection
// ---------------------------------------------------------------------------

function PasswordSection() {
  const [form, setForm] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  });
  const [feedback, setFeedback] = useState('');

  const handleSave = useCallback(() => {
    setFeedback('Password updated!');
    setForm({ current: '', newPassword: '', confirm: '' });
    setTimeout(() => setFeedback(''), 2000);
  }, []);

  return (
    <SectionCard icon={Lock} title="Change Password">
      <div className="space-y-3 max-w-md">
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            Current Password
          </label>
          <input
            type="password"
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            placeholder="Enter current password"
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            New Password
          </label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            placeholder="Enter new password"
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            Confirm Password
          </label>
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            placeholder="Confirm new password"
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary, #06b6d4)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Update Password
        </button>
        <FeedbackMessage message={feedback} />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// NotificationsSection
// ---------------------------------------------------------------------------

const NOTIFICATION_DEFAULTS = [
  { key: 'orderUpdates', label: 'Order updates', defaultValue: true },
  { key: 'shippingNotifications', label: 'Shipping notifications', defaultValue: true },
  { key: 'promotionalOffers', label: 'Promotional offers', defaultValue: false },
  { key: 'newProductAlerts', label: 'New product alerts', defaultValue: false },
  { key: 'monthlyNewsletter', label: 'Monthly newsletter', defaultValue: false },
];

function NotificationsSection() {
  const [prefs, setPrefs] = useState(() => {
    const initial = {};
    NOTIFICATION_DEFAULTS.forEach((n) => {
      initial[n.key] = n.defaultValue;
    });
    return initial;
  });
  const [feedback, setFeedback] = useState('');

  const handleToggle = useCallback((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    setFeedback('Preferences saved!');
    setTimeout(() => setFeedback(''), 2000);
  }, []);

  return (
    <SectionCard icon={Bell} title="Notifications">
      <div className="space-y-4 max-w-md">
        {NOTIFICATION_DEFAULTS.map((n) => (
          <Toggle
            key={n.key}
            label={n.label}
            checked={prefs[n.key]}
            onChange={(val) => handleToggle(n.key, val)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary, #06b6d4)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Save Preferences
        </button>
        <FeedbackMessage message={feedback} />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// PreviewAccountPage
// ---------------------------------------------------------------------------

export default function PreviewAccountPage({ config, nav }) {
  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <User
            className="w-5 h-5"
            style={{ color: 'var(--ws-primary, #06b6d4)' }}
          />
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--ws-text, #fff)' }}
        >
          My Account
        </h1>
      </div>

      {/* Sections */}
      <div className="space-y-5">
        <ProfileSection />
        <AddressesSection />
        <PasswordSection />
        <NotificationsSection />
      </div>
    </div>
  );
}
