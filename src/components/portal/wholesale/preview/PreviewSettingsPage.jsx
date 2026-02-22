// ---------------------------------------------------------------------------
// PreviewSettingsPage.jsx -- B2B wholesale storefront settings page.
// Notification preferences, display settings, and security for the B2B client.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Globe,
  Lock,
  Eye,
  Mail,
  Smartphone,
  Package,
  CreditCard,
  Truck,
  Shield,
  Key,
  Monitor,
  ChevronRight,
} from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  GlassSelect,
  motionVariants,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange?.(!enabled)}
        className="relative w-10 h-5.5 rounded-full transition-colors shrink-0"
        style={{
          backgroundColor: enabled
            ? 'var(--ws-primary)'
            : 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
          border: `1px solid ${enabled ? 'var(--ws-primary)' : 'var(--ws-border)'}`,
          width: '40px',
          height: '22px',
        }}
      >
        <span
          className="absolute top-0.5 rounded-full transition-transform"
          style={{
            width: '16px',
            height: '16px',
            backgroundColor: enabled ? 'var(--ws-bg)' : 'var(--ws-muted)',
            transform: enabled ? 'translateX(20px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Section
// ---------------------------------------------------------------------------

function SettingsSection({ icon: Icon, title, children }) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--ws-primary) 12%, transparent)' }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: 'var(--ws-primary)' }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>{title}</h3>
      </div>
      <div style={{ borderTop: '1px solid var(--ws-border)' }}>
        {children}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreviewSettingsPage({ config, nav }) {
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    deliveryAlerts: true,
    invoiceReminders: true,
    priceChanges: false,
    newProducts: true,
    creditAlerts: true,
    emailDigest: true,
    smsAlerts: false,
  });

  const [display, setDisplay] = useState({
    language: 'en',
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    compactView: false,
  });

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Settings' },
        ]}
        onNavigate={nav?.goToHome}
      />

      <div className="mt-6 mb-8">
        <SectionHeader title="Settings" subtitle="Manage your notification preferences and account settings" />
      </div>

      <motion.div
        variants={motionVariants.container}
        initial="hidden"
        animate="visible"
        className="max-w-3xl space-y-6"
      >
        {/* Notifications */}
        <motion.div variants={motionVariants.card}>
          <SettingsSection icon={Bell} title="Notifications">
            <Toggle
              enabled={notifications.orderUpdates}
              onChange={() => toggleNotification('orderUpdates')}
              label="Order updates"
              description="Status changes, confirmations, and processing updates"
            />
            <Toggle
              enabled={notifications.deliveryAlerts}
              onChange={() => toggleNotification('deliveryAlerts')}
              label="Delivery alerts"
              description="Tracking updates and delivery confirmations"
            />
            <Toggle
              enabled={notifications.invoiceReminders}
              onChange={() => toggleNotification('invoiceReminders')}
              label="Invoice reminders"
              description="Payment due dates and overdue notices"
            />
            <Toggle
              enabled={notifications.creditAlerts}
              onChange={() => toggleNotification('creditAlerts')}
              label="Credit alerts"
              description="Credit limit changes and low balance warnings"
            />
            <Toggle
              enabled={notifications.priceChanges}
              onChange={() => toggleNotification('priceChanges')}
              label="Price changes"
              description="Updates when product pricing changes"
            />
            <Toggle
              enabled={notifications.newProducts}
              onChange={() => toggleNotification('newProducts')}
              label="New products"
              description="Notifications when new products are added to the catalog"
            />
          </SettingsSection>
        </motion.div>

        {/* Delivery Channels */}
        <motion.div variants={motionVariants.card}>
          <SettingsSection icon={Mail} title="Delivery Channels">
            <Toggle
              enabled={notifications.emailDigest}
              onChange={() => toggleNotification('emailDigest')}
              label="Email notifications"
              description="Receive notifications at john@company.com"
            />
            <Toggle
              enabled={notifications.smsAlerts}
              onChange={() => toggleNotification('smsAlerts')}
              label="SMS alerts"
              description="Critical alerts via SMS (order confirmations, delivery updates)"
            />
          </SettingsSection>
        </motion.div>

        {/* Display Preferences */}
        <motion.div variants={motionVariants.card}>
          <SettingsSection icon={Monitor} title="Display Preferences">
            <div className="pt-3 space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--ws-muted)' }}>Language</label>
                <GlassSelect
                  value={display.language}
                  onChange={(e) => setDisplay((p) => ({ ...p, language: e.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Fran\u00e7ais</option>
                </GlassSelect>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--ws-muted)' }}>Currency</label>
                <GlassSelect
                  value={display.currency}
                  onChange={(e) => setDisplay((p) => ({ ...p, currency: e.target.value }))}
                >
                  <option value="EUR">EUR (\u20ac)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (\u00a3)</option>
                </GlassSelect>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--ws-muted)' }}>Timezone</label>
                <GlassSelect
                  value={display.timezone}
                  onChange={(e) => setDisplay((p) => ({ ...p, timezone: e.target.value }))}
                >
                  <option value="Europe/Amsterdam">Europe/Amsterdam (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </GlassSelect>
              </div>
              <Toggle
                enabled={display.compactView}
                onChange={() => setDisplay((p) => ({ ...p, compactView: !p.compactView }))}
                label="Compact view"
                description="Show more items per page with smaller cards"
              />
            </div>
          </SettingsSection>
        </motion.div>

        {/* Security */}
        <motion.div variants={motionVariants.card}>
          <SettingsSection icon={Shield} title="Security">
            <div className="pt-3 space-y-3">
              <button
                className="w-full flex items-center justify-between py-3 group"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>Change password</p>
                    <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>Last changed 45 days ago</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--ws-muted)' }} />
              </button>
              <div style={{ borderTop: '1px solid var(--ws-border)' }} />
              <button
                className="w-full flex items-center justify-between py-3 group"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>Two-factor authentication</p>
                    <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>Not enabled</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--ws-muted)' }} />
              </button>
              <div style={{ borderTop: '1px solid var(--ws-border)' }} />
              <button
                className="w-full flex items-center justify-between py-3 group"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>Login history</p>
                    <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>View recent sign-in activity</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--ws-muted)' }} />
              </button>
            </div>
          </SettingsSection>
        </motion.div>

        {/* Save */}
        <motion.div variants={motionVariants.card} className="flex justify-end gap-3 pt-2 pb-8">
          <SecondaryButton onClick={() => {}}>Reset to Defaults</SecondaryButton>
          <PrimaryButton onClick={() => {}}>Save Changes</PrimaryButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
