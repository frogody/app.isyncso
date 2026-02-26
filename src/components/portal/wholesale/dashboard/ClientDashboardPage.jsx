import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  DollarSign,
  Clock,
  Bell,
  ArrowRight,
  ShoppingCart,
  Heart,
  ClipboardList,
  MessageSquare,
  Megaphone,
  Loader2,
  ImageOff,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWholesale } from '../WholesaleProvider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  pending:    { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)', dot: '#f59e0b' },
  confirmed:  { bg: 'rgba(59, 130, 246, 0.12)',  text: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)',  dot: '#3b82f6' },
  processing: { bg: 'rgba(6, 182, 212, 0.12)',   text: '#22d3ee', border: 'rgba(6, 182, 212, 0.25)',   dot: '#06b6d4' },
  shipped:    { bg: 'rgba(168, 85, 247, 0.12)',  text: '#c084fc', border: 'rgba(168, 85, 247, 0.25)',  dot: '#a855f7' },
  delivered:  { bg: 'rgba(34, 197, 94, 0.12)',   text: '#4ade80', border: 'rgba(34, 197, 94, 0.25)',   dot: '#22c55e' },
  cancelled:  { bg: 'rgba(239, 68, 68, 0.12)',   text: '#f87171', border: 'rgba(239, 68, 68, 0.25)',   dot: '#ef4444' },
};

const FALLBACK_STATUS_STYLE = {
  bg: 'rgba(161, 161, 170, 0.12)', text: '#a1a1aa', border: 'rgba(161, 161, 170, 0.25)', dot: '#a1a1aa',
};

const NOTIFICATION_TYPE_CONFIG = {
  order_status: { Icon: Package,       color: 'rgb(34, 211, 238)' },
  message:      { Icon: MessageSquare, color: 'rgb(96, 165, 250)' },
  announcement: { Icon: Megaphone,     color: 'rgb(251, 191, 36)' },
};

const DEFAULT_NOTIFICATION_TYPE = { Icon: Bell, color: 'rgb(161, 161, 170)' };

// ---------------------------------------------------------------------------
// Helpers
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
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatDateLong() {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationTypeConfig(type) {
  return NOTIFICATION_TYPE_CONFIG[type] || DEFAULT_NOTIFICATION_TYPE;
}

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ---------------------------------------------------------------------------
// Skeleton / Loading Components
// ---------------------------------------------------------------------------

function SkeletonPulse({ className, style }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className || ''}`}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', ...style }}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <SkeletonPulse className="w-10 h-10 rounded-lg" />
        <SkeletonPulse className="w-16 h-4" />
      </div>
      <SkeletonPulse className="w-20 h-8 mb-1" />
      <SkeletonPulse className="w-24 h-3" />
    </div>
  );
}

function OrderRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4"
      style={{ borderBottom: '1px solid var(--ws-border)' }}
    >
      <SkeletonPulse className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="w-28 h-4" />
        <SkeletonPulse className="w-20 h-3" />
      </div>
      <SkeletonPulse className="w-16 h-5 rounded-full" />
      <SkeletonPulse className="w-16 h-4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const normalised = (status || '').toLowerCase().trim();
  const style = STATUS_STYLES[normalised] || FALLBACK_STATUS_STYLE;
  const label = normalised.charAt(0).toUpperCase() + normalised.slice(1);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: style.dot }}
      />
      {label || 'Unknown'}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, index }) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="rounded-xl p-5 transition-colors hover:bg-white/[0.02]"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgba(var(--ws-primary-rgb, 6, 182, 212), 0.1)' }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
        </div>
      </div>
      <div
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        {value}
      </div>
      <div className="text-xs font-medium mt-1" style={{ color: 'var(--ws-muted)' }}>
        {label}
      </div>
    </motion.div>
  );
}

function FavoriteProductCard({ favorite, onAddToCart, orgId }) {
  const navigate = useNavigate();
  const product = favorite.product || favorite;
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  const imageUrl = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const first = product.images[0];
      return typeof first === 'string' ? first : first?.url || first?.src || null;
    }
    return product.image_url || product.thumbnail || null;
  }, [product]);

  const handleAdd = useCallback(async (e) => {
    e.stopPropagation();
    setAdding(true);
    try {
      await onAddToCart({ id: product.id, name: product.name, sku: product.sku, price: product.price }, 1);
    } finally {
      setTimeout(() => setAdding(false), 600);
    }
  }, [onAddToCart, product]);

  const handleNavigate = useCallback(() => {
    if (orgId && product.id) {
      navigate(`/portal/${orgId}/shop/product/${product.id}`);
    }
  }, [navigate, orgId, product.id]);

  return (
    <div
      className="flex-shrink-0 w-44 rounded-xl overflow-hidden transition-colors cursor-pointer group"
      style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
      onClick={handleNavigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleNavigate(); }}
    >
      {/* Image */}
      <div
        className="relative w-full h-28 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name || 'Product'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          loading="lazy" decoding="async" />
        ) : (
          <ImageOff className="w-6 h-6" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className="text-xs font-semibold truncate mb-1"
          style={{ color: 'var(--ws-text)' }}
        >
          {product.name || 'Untitled'}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold" style={{ color: 'var(--ws-primary)' }}>
            {product.price != null ? formatCurrency(product.price) : '--'}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.08]"
            style={{ color: 'var(--ws-primary)' }}
            title="Add to Cart"
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onLoad, loading }) {
  const items = template.items || [];
  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  return (
    <div
      className="rounded-xl p-4 transition-colors"
      style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <ClipboardList className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h4
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            {template.name || 'Untitled Template'}
          </h4>
          <p className="text-[11px] font-medium" style={{ color: 'var(--ws-muted)' }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onLoad(template)}
        disabled={loading}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg, #000)' }}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ShoppingCart className="w-3.5 h-3.5" />
        )}
        Load into Cart
      </button>
    </div>
  );
}

function NotificationItem({ notification }) {
  const { Icon, color } = getNotificationTypeConfig(notification.type);
  const isUnread = !notification.read_at;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
      style={{ borderBottom: '1px solid var(--ws-border)' }}
    >
      {/* Unread dot */}
      <div className="pt-1.5 w-2 shrink-0 flex justify-center">
        {isUnread && (
          <span
            className="block w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--ws-primary)' }}
          />
        )}
      </div>
      {/* Type icon */}
      <div
        className="mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: isUnread ? 'var(--ws-text)' : 'var(--ws-muted)' }}
          >
            {notification.title}
          </span>
          <span
            className="text-[11px] whitespace-nowrap shrink-0"
            style={{ color: 'var(--ws-muted)' }}
          >
            {relativeTime(notification.created_at)}
          </span>
        </div>
        {notification.message && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--ws-muted)' }}>
            {notification.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2
        className="text-base font-bold"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        {title}
      </h2>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
          style={{ color: 'var(--ws-primary)' }}
        >
          {actionLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        <Icon className="w-5 h-5" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
      </div>
      <p className="text-sm max-w-xs" style={{ color: 'var(--ws-muted)' }}>
        {message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClientDashboardPage
// ---------------------------------------------------------------------------

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { org } = useParams();
  const {
    client,
    orgId,
    favorites,
    favoritesLoading,
    notifications,
    unreadCount,
    templates,
    templatesLoading,
    dashboardData,
    dashboardLoading,
    fetchDashboardData,
    addToCart,
  } = useWholesale();

  const [loadingTemplateId, setLoadingTemplateId] = useState(null);

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const resolvedOrg = org || orgId;

  // Derived values
  const displayName = client?.name || client?.company_name || 'there';
  const todayFormatted = useMemo(() => formatDateLong(), []);
  const recentOrders = useMemo(() => {
    return (dashboardData?.recentOrders || []).slice(0, 5);
  }, [dashboardData]);
  const recentNotifications = useMemo(() => {
    return (notifications || []).slice(0, 5);
  }, [notifications]);
  const displayedTemplates = useMemo(() => {
    return (templates || []).slice(0, 3);
  }, [templates]);

  // Handlers
  const goToCatalog = useCallback(() => {
    navigate(`/portal/${resolvedOrg}/shop/catalog`);
  }, [navigate, resolvedOrg]);

  const goToOrders = useCallback(() => {
    navigate(`/portal/${resolvedOrg}/shop/orders`);
  }, [navigate, resolvedOrg]);

  const goToTemplates = useCallback(() => {
    navigate(`/portal/${resolvedOrg}/shop/templates`);
  }, [navigate, resolvedOrg]);

  const handleViewOrder = useCallback((orderId) => {
    navigate(`/portal/${resolvedOrg}/shop/orders/${orderId}`);
  }, [navigate, resolvedOrg]);

  const handleLoadTemplate = useCallback(async (template) => {
    const items = template.items || [];
    if (items.length === 0) return;
    setLoadingTemplateId(template.id);
    try {
      for (const item of items) {
        addToCart(
          { id: item.product_id, name: item.name, sku: item.sku, price: item.unit_price },
          item.quantity || 1,
        );
      }
    } finally {
      setTimeout(() => setLoadingTemplateId(null), 500);
    }
  }, [addToCart]);

  // Stats
  const stats = useMemo(() => [
    {
      icon: Package,
      label: 'Total Orders',
      value: dashboardLoading ? '--' : (dashboardData?.totalOrders ?? 0),
    },
    {
      icon: DollarSign,
      label: 'Total Spent',
      value: dashboardLoading ? '--' : formatCurrency(dashboardData?.totalSpent ?? 0),
    },
    {
      icon: Clock,
      label: 'Pending Orders',
      value: dashboardLoading ? '--' : (dashboardData?.pendingOrders ?? 0),
    },
    {
      icon: Bell,
      label: 'Unread Notifications',
      value: unreadCount ?? 0,
    },
  ], [dashboardData, dashboardLoading, unreadCount]);

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ color: 'var(--ws-text)' }}
    >
      {/* ── Section 1: Welcome Header ────────────────────────────────── */}
      <motion.div
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--ws-heading-font)' }}
        >
          Welcome back, {displayName}
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--ws-muted)' }}>
          {todayFormatted} &mdash; Here&apos;s what&apos;s happening with your orders
        </p>
        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={goToCatalog}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--ws-primary)', color: 'var(--ws-bg, #000)' }}
          >
            <Search className="w-4 h-4" />
            Browse Catalog
          </button>
          <button
            type="button"
            onClick={goToOrders}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-white/[0.06]"
            style={{
              color: 'var(--ws-text)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <Package className="w-4 h-4" />
            View Orders
          </button>
        </div>
      </motion.div>

      {/* ── Section 2: Stats Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dashboardLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          stats.map((stat, idx) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              index={idx + 1}
            />
          ))
        )}
      </div>

      {/* ── Section 3: Recent Orders ─────────────────────────────────── */}
      <motion.div
        custom={5}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <SectionHeader
          title="Recent Orders"
          actionLabel="View All Orders"
          onAction={goToOrders}
        />
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
        >
          {dashboardLoading ? (
            <>
              <OrderRowSkeleton />
              <OrderRowSkeleton />
              <OrderRowSkeleton />
            </>
          ) : recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              message="No orders yet. Browse the catalog to place your first order."
            />
          ) : (
            <>
              {/* Desktop header */}
              <div
                className="hidden sm:grid grid-cols-[1fr_110px_100px_100px_60px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)', borderBottom: '1px solid var(--ws-border)' }}
              >
                <span>Order</span>
                <span>Date</span>
                <span>Status</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="sm:grid sm:grid-cols-[1fr_110px_100px_100px_60px] gap-4 px-5 py-3.5 items-center transition-colors cursor-pointer hover:bg-white/[0.03]"
                  style={{ borderBottom: '1px solid var(--ws-border)' }}
                  onClick={() => handleViewOrder(order.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleViewOrder(order.id);
                    }
                  }}
                >
                  {/* Order number */}
                  <div className="flex items-center gap-3 mb-1.5 sm:mb-0">
                    <div
                      className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)' }}
                    >
                      <Package className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
                    </div>
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--ws-text)' }}
                    >
                      {order.order_number || `#${(order.id || '').slice(0, 8)}`}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-xs hidden sm:block" style={{ color: 'var(--ws-muted)' }}>
                    {formatDate(order.created_at)}
                  </span>

                  {/* Status */}
                  <div className="mb-1.5 sm:mb-0">
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Total */}
                  <span
                    className="text-sm font-semibold text-right hidden sm:block"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    {formatCurrency(order.total)}
                  </span>

                  {/* Arrow */}
                  <div className="hidden sm:flex justify-end">
                    <ArrowRight className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
                  </div>

                  {/* Mobile summary */}
                  <div className="flex items-center justify-between sm:hidden">
                    <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                      {formatDate(order.created_at)}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* ── Section 4: Favorites Strip ───────────────────────────────── */}
      <motion.div
        custom={6}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <SectionHeader
          title="Favorites"
          actionLabel="View All"
          onAction={goToCatalog}
        />
        {favoritesLoading ? (
          <div className="flex items-center gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-44 rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
              >
                <SkeletonPulse className="w-full h-28" style={{ borderRadius: 0 }} />
                <div className="p-3 space-y-2">
                  <SkeletonPulse className="w-24 h-3" />
                  <SkeletonPulse className="w-16 h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : (!favorites || favorites.length === 0) ? (
          <div
            className="rounded-xl"
            style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
          >
            <EmptyState
              icon={Heart}
              message="No favorites yet. Browse the catalog to find products you love."
            />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            <AnimatePresence>
              {favorites.map((fav, idx) => (
                <motion.div
                  key={fav.product_id || idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <FavoriteProductCard
                    favorite={fav}
                    onAddToCart={addToCart}
                    orgId={resolvedOrg}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ── Section 5: Quick Reorder / Templates ─────────────────────── */}
      <motion.div
        custom={7}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <SectionHeader
          title="Quick Reorder"
          actionLabel="View All Templates"
          onAction={goToTemplates}
        />
        {templatesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <SkeletonPulse className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonPulse className="w-24 h-4" />
                    <SkeletonPulse className="w-16 h-3" />
                  </div>
                </div>
                <SkeletonPulse className="w-full h-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : (!templates || templates.length === 0) ? (
          <div
            className="rounded-xl"
            style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
          >
            <EmptyState
              icon={ClipboardList}
              message="Save your first order template from the cart page."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTemplates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onLoad={handleLoadTemplate}
                loading={loadingTemplateId === tpl.id}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Section 6: Notifications Feed ────────────────────────────── */}
      <motion.div
        custom={8}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <SectionHeader title="Recent Notifications" />
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--ws-surface)', border: '1px solid var(--ws-border)' }}
        >
          {(!notifications || notifications.length === 0) ? (
            <EmptyState
              icon={Bell}
              message="No notifications yet. You'll be notified about order updates and announcements."
            />
          ) : (
            recentNotifications.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
