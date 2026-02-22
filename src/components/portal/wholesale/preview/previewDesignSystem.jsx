// ---------------------------------------------------------------------------
// previewDesignSystem.js -- Shared design system for B2B wholesale preview pages.
// Provides glass-morphism cards, motion variants, section headers, breadcrumbs,
// status badges, loading skeletons, and trust signals — all matching the visual
// quality bar set by HeroRenderer / FeaturedProductsRenderer / StatsRenderer.
// ---------------------------------------------------------------------------

import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Shield,
  Truck,
  CreditCard,
  Headphones,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Image URL resolver — handles JSONB objects ({url, alt, path, ...}) and
// plain string URLs. Use everywhere a product image is displayed.
// ---------------------------------------------------------------------------

export function resolveImageUrl(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (typeof img === 'object' && img.url) return img.url;
  return null;
}

export function resolveGalleryUrls(gallery) {
  if (!gallery || !Array.isArray(gallery)) return [];
  return gallery.map(resolveImageUrl).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Motion Variants (matching section renderers)
// ---------------------------------------------------------------------------

export const motionVariants = {
  container: {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  },

  card: {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 260, damping: 22 },
    },
  },

  heading: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  },

  fadeIn: {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },

  slideLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  },

  slideRight: {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  },

  staggerItem: {
    hidden: { opacity: 0, y: 24 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  },
};

// ---------------------------------------------------------------------------
// Glass-morphism inline styles
// ---------------------------------------------------------------------------

export const glassCardStyle = {
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--ws-surface) 92%, transparent), color-mix(in srgb, var(--ws-surface) 80%, transparent))',
  border: '1px solid var(--ws-border)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

export const glassCardHoverHandlers = {
  onMouseEnter: (e) => {
    e.currentTarget.style.boxShadow =
      '0 20px 40px rgba(0,0,0,0.25), 0 0 0 1px var(--ws-primary)';
    e.currentTarget.style.borderColor =
      'color-mix(in srgb, var(--ws-primary) 40%, var(--ws-border))';
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.boxShadow =
      '0 1px 3px rgba(0,0,0,0.08)';
    e.currentTarget.style.borderColor = 'var(--ws-border)';
  },
};

export const gradientAccentBar = {
  height: '2px',
  width: '100%',
  background:
    'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, var(--ws-surface)))',
};

export const gradientTextStyle = (primary) => ({
  background: `linear-gradient(135deg, ${primary || 'var(--ws-primary)'}, color-mix(in srgb, ${primary || 'var(--ws-primary)'} 60%, #a78bfa))`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

// ---------------------------------------------------------------------------
// GlassCard -- Motion-enabled card with glass-morphism + hover glow
// ---------------------------------------------------------------------------

export function GlassCard({
  children,
  className = '',
  style: extraStyle = {},
  onClick,
  hoverable = true,
  accentBar = false,
  as: Tag = 'div',
  variants,
  custom,
  ...motionProps
}) {
  const Comp = Tag === 'div' ? motion.div : motion[Tag] || motion.div;

  return (
    <Comp
      variants={variants || motionVariants.card}
      custom={custom}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        ...glassCardStyle,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
        cursor: onClick ? 'pointer' : undefined,
        ...extraStyle,
      }}
      {...(hoverable ? glassCardHoverHandlers : {})}
      onClick={onClick}
      {...motionProps}
    >
      {accentBar && <div style={gradientAccentBar} />}
      {children}
    </Comp>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader -- Gradient accent line + animated heading
// ---------------------------------------------------------------------------

export function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}) {
  return (
    <motion.div
      variants={motionVariants.heading}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`mb-8 ${className}`}
    >
      <div
        className="h-[2px] w-16 mb-4 rounded-full"
        style={{
          background:
            'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent))',
        }}
      />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 text-sm sm:text-base" style={{ color: 'var(--ws-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb -- Glass-morphism breadcrumb trail
// ---------------------------------------------------------------------------

export function Breadcrumb({ items = [], onNavigate }) {
  return (
    <motion.nav
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-1.5 text-sm mb-6 flex-wrap"
      aria-label="Breadcrumb"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ws-muted)' }} />
            )}
            {isLast ? (
              <span className="font-medium" style={{ color: 'var(--ws-text)' }}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => item.onClick?.() || onNavigate?.(item.page)}
                className="hover:underline transition-colors"
                style={{ color: 'var(--ws-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </motion.nav>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge -- Color-coded status pill
// ---------------------------------------------------------------------------

const STATUS_THEMES = {
  success: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  warning: { bg: 'rgba(234,179,8,0.12)', text: '#eab308', border: 'rgba(234,179,8,0.25)' },
  error: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  info: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  neutral: { bg: 'rgba(161,161,170,0.12)', text: '#a1a1aa', border: 'rgba(161,161,170,0.25)' },
  primary: { bg: 'color-mix(in srgb, var(--ws-primary) 12%, transparent)', text: 'var(--ws-primary)', border: 'color-mix(in srgb, var(--ws-primary) 25%, transparent)' },
};

export function StatusBadge({ status, label, pulse = false, size = 'sm' }) {
  const theme = STATUS_THEMES[status] || STATUS_THEMES.neutral;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: theme.text }}
        />
      )}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LoadingSkeleton -- Pulse-animated glass placeholder grid
// ---------------------------------------------------------------------------

export function LoadingSkeleton({ count = 8, columns = 4 }) {
  const colClass = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }[columns] || 'lg:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${colClass} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden animate-pulse"
          style={glassCardStyle}
        >
          <div style={gradientAccentBar} />
          <div className="aspect-square" style={{ background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)' }} />
          <div className="p-4 space-y-3">
            <div className="h-4 rounded-full w-3/4" style={{ background: 'var(--ws-border)' }} />
            <div className="h-3 rounded-full w-1/2" style={{ background: 'var(--ws-border)' }} />
            <div className="h-8 rounded-lg w-full mt-3" style={{ background: 'var(--ws-border)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrustBar -- B2B trust signals strip
// ---------------------------------------------------------------------------

const TRUST_ITEMS = [
  { icon: CreditCard, label: 'NET-30 Payment Terms' },
  { icon: Truck, label: 'Free Delivery EUR 500+' },
  { icon: Shield, label: 'Verified B2B Partner' },
  { icon: Headphones, label: 'Dedicated Account Manager' },
];

export function TrustBar({ items, className = '' }) {
  const signals = items || TRUST_ITEMS;

  return (
    <motion.div
      variants={motionVariants.fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-4 px-4 rounded-xl ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 50%, transparent)',
        border: '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)',
      }}
    >
      {signals.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: 'var(--ws-muted)' }}>
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuantityInput -- Stepper input respecting MOQ
// ---------------------------------------------------------------------------

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 9999,
  size = 'md',
  className = '',
}) {
  const sizeClasses = size === 'sm'
    ? 'h-8 text-sm'
    : size === 'lg' ? 'h-12 text-base' : 'h-10 text-sm';
  const btnSize = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-12' : 'w-10';

  return (
    <div
      className={`inline-flex items-center rounded-lg overflow-hidden ${className}`}
      style={{
        border: '1px solid var(--ws-border)',
        background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
      }}
    >
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`${sizeClasses} ${btnSize} flex items-center justify-center font-medium transition-colors disabled:opacity-30`}
        style={{ color: 'var(--ws-text)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 10%, transparent)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        -
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
        className={`${sizeClasses} w-12 text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        style={{ color: 'var(--ws-text)', borderLeft: '1px solid var(--ws-border)', borderRight: '1px solid var(--ws-border)' }}
        min={min}
        max={max}
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`${sizeClasses} ${btnSize} flex items-center justify-center font-medium transition-colors disabled:opacity-30`}
        style={{ color: 'var(--ws-text)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 10%, transparent)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState -- Centered empty state with icon
// ---------------------------------------------------------------------------

export function EmptyState({ icon: Icon = Package, title, description, action }) {
  return (
    <motion.div
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
        }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--ws-primary)' }} />
      </div>
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--ws-muted)' }}>
          {description}
        </p>
      )}
      {action}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PrimaryButton + SecondaryButton -- Consistent action buttons
// ---------------------------------------------------------------------------

export function PrimaryButton({ children, onClick, disabled, className = '', icon: Icon, size = 'md', ...rest }) {
  const sizeClasses = size === 'sm' ? 'px-4 py-2 text-sm' : size === 'lg' ? 'px-8 py-3.5 text-base' : 'px-6 py-3 text-sm';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      style={{
        background: `linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))`,
        color: '#fff',
        boxShadow: '0 2px 8px color-mix(in srgb, var(--ws-primary) 30%, transparent)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.boxShadow = '0 4px 20px color-mix(in srgb, var(--ws-primary) 40%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--ws-primary) 30%, transparent)';
      }}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, className = '', icon: Icon, size = 'md', ...rest }) {
  const sizeClasses = size === 'sm' ? 'px-4 py-2 text-sm' : size === 'lg' ? 'px-8 py-3.5 text-base' : 'px-6 py-3 text-sm';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
        color: 'var(--ws-text)',
        border: '1px solid var(--ws-border)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--ws-primary)';
          e.currentTarget.style.color = 'var(--ws-primary)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.color = 'var(--ws-text)';
      }}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// GlassInput -- Themed text input
// ---------------------------------------------------------------------------

export function GlassInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        border: '1px solid var(--ws-border)',
        color: 'var(--ws-text)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-primary)';
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ws-primary) 15%, transparent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// GlassTextarea -- Themed textarea
// ---------------------------------------------------------------------------

export function GlassTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 resize-none ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        border: '1px solid var(--ws-border)',
        color: 'var(--ws-text)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-primary)';
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ws-primary) 15%, transparent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// GlassSelect -- Themed select dropdown
// ---------------------------------------------------------------------------

export function GlassSelect({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
        border: '1px solid var(--ws-border)',
        color: 'var(--ws-text)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-primary)';
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--ws-primary) 15%, transparent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--ws-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...props}
    >
      {children}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Utility: formatCurrency
// ---------------------------------------------------------------------------

export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}
