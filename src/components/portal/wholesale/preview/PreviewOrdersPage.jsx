import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ChevronDown,
  ChevronUp,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  MapPin,
  Hash,
  CreditCard,
  TrendingUp,
  ShoppingCart,
  Eye,
  ReceiptText,
  Timer,
  CircleDollarSign,
  ArrowRight,
  LogIn,
  Loader2,
} from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  StatusBadge,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';
import { useWholesale } from '../WholesaleProvider';
import { getClientOrders } from '@/lib/db/queries/b2b';

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const ORDER_STATUS_CONFIG = {
  pending: { label: 'Pending Review', theme: 'info', pulse: true, color: 'rgba(59,130,246,0.8)' },
  pending_review: { label: 'Pending Review', theme: 'info', pulse: true, color: 'rgba(59,130,246,0.8)' },
  confirmed: { label: 'Confirmed', theme: 'primary', pulse: false, color: 'var(--ws-primary)' },
  processing: { label: 'Processing', theme: 'warning', pulse: false, color: 'rgba(245,158,11,0.8)' },
  shipped: { label: 'In Transit', theme: 'info', pulse: false, color: 'rgba(59,130,246,0.8)' },
  in_transit: { label: 'In Transit', theme: 'info', pulse: false, color: 'rgba(59,130,246,0.8)' },
  delivered: { label: 'Delivered', theme: 'success', pulse: false, color: 'rgba(34,197,94,0.8)' },
  invoiced: { label: 'Invoiced', theme: 'neutral', pulse: false, color: 'rgba(161,161,170,0.8)' },
  cancelled: { label: 'Cancelled', theme: 'error', pulse: false, color: 'rgba(239,68,68,0.8)' },
};

const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Paid', theme: 'success', pulse: false },
  pending: { label: 'Pending', theme: 'info', pulse: false },
  net30_pending: { label: 'Net-30', theme: 'info', pulse: false, getDynamic: (order) => `Net-30 (Due: ${formatDateShort(order.paymentDueDate)})` },
  net30_due: { label: 'Net-30 Due', theme: 'warning', pulse: false },
  overdue: { label: 'Overdue', theme: 'error', pulse: true },
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getStatusAccentColor(status) {
  return ORDER_STATUS_CONFIG[status]?.color || 'var(--ws-border)';
}

/**
 * Normalize a B2B order from the database into the shape the UI expects.
 */
function normalizeOrder(dbOrder) {
  const items = (dbOrder.b2b_order_items || []).map((item) => ({
    name: item.product_name || 'Unknown Product',
    sku: item.sku || '',
    quantity: item.quantity || 1,
    price: Number(item.unit_price) || 0,
    lineTotal: Number(item.line_total) || 0,
    image: null, // DB items don't store images inline
  }));

  const subtotal = Number(dbOrder.subtotal) || 0;
  const discount = Number(dbOrder.discount_amount) || 0;
  const vat = Number(dbOrder.tax_amount) || 0;
  const total = Number(dbOrder.total) || 0;

  // Determine payment due date from payment_terms_days
  let paymentDueDate = null;
  if (dbOrder.created_at && dbOrder.payment_terms_days) {
    const created = new Date(dbOrder.created_at);
    created.setDate(created.getDate() + dbOrder.payment_terms_days);
    paymentDueDate = created.toISOString().split('T')[0];
  }

  // Derive payment status
  let paymentStatus = dbOrder.payment_status || 'pending';
  if (paymentStatus === 'pending' && dbOrder.payment_terms_days) {
    const now = new Date();
    if (paymentDueDate && new Date(paymentDueDate) < now) {
      paymentStatus = 'overdue';
    } else {
      paymentStatus = 'net30_pending';
    }
  }

  // Build delivery address string from JSONB
  const addr = dbOrder.shipping_address || {};
  const deliveryAddress = [addr.street, addr.city, addr.zip, addr.country]
    .filter(Boolean)
    .join(', ') || 'No address specified';

  return {
    id: dbOrder.order_number || dbOrder.id,
    dbId: dbOrder.id,
    poNumber: dbOrder.client_notes ? `PO-${dbOrder.order_number}` : '',
    date: dbOrder.created_at,
    status: dbOrder.status || 'pending',
    paymentStatus,
    paymentDueDate,
    deliveryAddress,
    items,
    subtotal,
    discount,
    vat,
    total,
    trackingNumber: null, // Could be added to b2b_orders table later
    invoiceUrl: null,
  };
}

// ---------------------------------------------------------------------------
// OrderStatsBar
// ---------------------------------------------------------------------------

function OrderStatsBar({ orders }) {
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      const d = new Date(o.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [orders]);

  const totalValue = useMemo(() => orders.reduce((s, o) => s + o.total, 0), [orders]);
  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'pending' || o.status === 'pending_review').length, [orders]);
  const inTransitCount = useMemo(() => orders.filter((o) => o.status === 'shipped' || o.status === 'in_transit').length, [orders]);

  const stats = [
    { label: 'This Month', value: `${thisMonthCount} orders`, icon: Calendar, accent: 'var(--ws-primary)' },
    { label: 'Total Value', value: formatCurrency(totalValue), icon: CircleDollarSign, accent: 'rgba(34,197,94,0.8)' },
    { label: 'Pending', value: pendingCount.toString(), icon: Timer, accent: 'rgba(59,130,246,0.8)' },
    { label: 'In Transit', value: inTransitCount.toString(), icon: Truck, accent: 'rgba(245,158,11,0.8)' },
  ];

  return (
    <motion.div
      variants={motionVariants.container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
    >
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <GlassCard key={i} accentBar className="p-4 sm:p-5" hoverable={false}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--ws-muted)' }}>
                  {stat.label}
                </p>
                <p className="text-lg sm:text-xl font-bold truncate" style={{ color: 'var(--ws-text)' }}>
                  {stat.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `color-mix(in srgb, ${stat.accent} 12%, transparent)` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: stat.accent }} />
              </div>
            </div>
          </GlassCard>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuickReorderSection
// ---------------------------------------------------------------------------

function QuickReorderSection({ orders, nav }) {
  const reorderableOrders = useMemo(
    () => orders.filter((o) => o.status === 'delivered' || o.status === 'invoiced').slice(0, 3),
    [orders],
  );

  if (reorderableOrders.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--ws-muted)' }}>
          Quick Reorder
        </h3>
        <button
          onClick={() => nav?.goToCatalog?.()}
          className="text-xs font-medium flex items-center gap-1 transition-colors"
          style={{ color: 'var(--ws-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          View Catalog
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
        {reorderableOrders.map((order) => (
          <GlassCard
            key={order.id}
            className="flex-shrink-0 w-72 sm:w-80 snap-start p-4"
            hoverable
            onClick={() => nav?.goToCatalog?.()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--ws-muted)' }}>
                {order.id}
              </span>
              <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                {formatDateShort(order.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {order.items.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ border: '1px solid var(--ws-border)', background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)' }}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4" style={{ color: 'var(--ws-muted)', opacity: 0.5 }} />
                  )}
                </div>
              ))}
              {order.items.length > 3 && (
                <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
                  +{order.items.length - 3} more
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: 'var(--ws-text)' }}>
                {formatCurrency(order.total)}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                  color: '#fff',
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Reorder
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusFilterPills
// ---------------------------------------------------------------------------

function StatusFilterPills({ activeFilter, onFilterChange, orders }) {
  const counts = useMemo(() => {
    const map = { all: orders.length };
    STATUS_FILTERS.forEach((f) => {
      if (f.key !== 'all') map[f.key] = orders.filter((o) => o.status === f.key).length;
    });
    return map;
  }, [orders]);

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {STATUS_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = counts[filter.key] || 0;

        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onFilterChange(filter.key)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                    color: '#fff',
                    boxShadow: '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)',
                  }
                : {
                    ...glassCardStyle,
                    color: 'var(--ws-muted)',
                  }
            }
          >
            {filter.label}
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
              style={
                isActive
                  ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }
                  : { backgroundColor: 'color-mix(in srgb, var(--ws-border) 60%, transparent)', color: 'var(--ws-muted)' }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchAndDateFilter
// ---------------------------------------------------------------------------

function SearchAndDateFilter({ searchQuery, onSearchChange, dateFrom, dateTo, onDateFromChange, onDateToChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--ws-muted)' }}
        />
        <GlassInput
          type="text"
          placeholder="Search by Order Number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="!pl-10"
        />
      </div>
      <div className="flex gap-2">
        <div className="relative">
          <GlassInput
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="!w-40 !text-xs"
            style={{ colorScheme: 'dark' }}
          />
          <span
            className="absolute -top-2 left-3 text-[10px] font-medium px-1"
            style={{ color: 'var(--ws-muted)', background: 'var(--ws-bg)' }}
          >
            From
          </span>
        </div>
        <div className="relative">
          <GlassInput
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="!w-40 !text-xs"
            style={{ colorScheme: 'dark' }}
          />
          <span
            className="absolute -top-2 left-3 text-[10px] font-medium px-1"
            style={{ color: 'var(--ws-muted)', background: 'var(--ws-bg)' }}
          >
            To
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderItemRow (inside expanded detail)
// ---------------------------------------------------------------------------

function OrderItemRow({ item, isLast }) {
  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)' }}
    >
      <div
        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ border: '1px solid var(--ws-border)', background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)' }}
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-4 h-4" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--ws-text)' }}>
          {item.name}
        </p>
        {item.sku && (
          <p className="text-xs font-mono" style={{ color: 'var(--ws-muted)' }}>
            {item.sku}
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
          {formatCurrency(item.lineTotal || item.quantity * item.price)}
        </p>
        <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
          {item.quantity} x {formatCurrency(item.price)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderRow
// ---------------------------------------------------------------------------

function OrderRow({ order, isExpanded, onToggle, nav, index }) {
  const statusCfg = ORDER_STATUS_CONFIG[order.status] || {};
  const paymentCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus] || {};
  const paymentLabel = paymentCfg.getDynamic ? paymentCfg.getDynamic(order) : paymentCfg.label;

  return (
    <motion.div
      variants={motionVariants.staggerItem}
      custom={index}
      initial="hidden"
      animate="visible"
      layout
    >
      <GlassCard
        hoverable
        className="overflow-hidden"
        style={{ position: 'relative' }}
        variants={{}}
      >
        {/* Gradient left accent bar colored by status */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{
            background: `linear-gradient(180deg, ${getStatusAccentColor(order.status)}, color-mix(in srgb, ${getStatusAccentColor(order.status)} 30%, transparent))`,
          }}
        />

        {/* Summary row */}
        <button
          type="button"
          className="w-full flex items-center gap-3 sm:gap-4 px-5 pl-6 py-4 text-left transition-colors"
          onClick={onToggle}
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 3%, transparent)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Order ID + Date */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold font-mono" style={{ color: 'var(--ws-text)' }}>
                {order.id}
              </p>
              {order.poNumber && (
                <span
                  className="hidden sm:inline text-[11px] font-mono px-2 py-0.5 rounded-md"
                  style={{
                    background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                    color: 'var(--ws-muted)',
                    border: '1px solid var(--ws-border)',
                  }}
                >
                  {order.poNumber}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
              {formatDateFull(order.date)}
            </p>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <StatusBadge status={statusCfg.theme} label={statusCfg.label} pulse={statusCfg.pulse} size="xs" />
            {paymentLabel && (
              <StatusBadge status={paymentCfg.theme} label={paymentLabel} pulse={paymentCfg.pulse} size="xs" />
            )}
          </div>

          {/* Item count (desktop) */}
          <span
            className="hidden md:inline text-xs whitespace-nowrap"
            style={{ color: 'var(--ws-muted)' }}
          >
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
          </span>

          {/* Total */}
          <span
            className="text-sm font-bold whitespace-nowrap flex-shrink-0"
            style={gradientTextStyle()}
          >
            {formatCurrency(order.total)}
          </span>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
          </motion.div>
        </button>

        {/* Expandable detail section */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div
                className="px-5 pl-6 pb-5 space-y-5"
                style={{ borderTop: '1px solid var(--ws-border)' }}
              >
                {/* PO number on mobile */}
                {order.poNumber && (
                  <div className="sm:hidden pt-3">
                    <span className="text-xs font-mono" style={{ color: 'var(--ws-muted)' }}>
                      PO: {order.poNumber}
                    </span>
                  </div>
                )}

                {/* Items */}
                <div className="pt-4">
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Order Items
                  </h4>
                  <div>
                    {order.items.map((item, idx) => (
                      <OrderItemRow key={idx} item={item} isLast={idx === order.items.length - 1} />
                    ))}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"
                      style={{ color: 'var(--ws-muted)' }}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Delivery Address
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--ws-text)' }}>
                      {order.deliveryAddress}
                    </p>
                  </div>
                  {order.trackingNumber && (
                    <div>
                      <h4
                        className="text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-2"
                        style={{ color: 'var(--ws-muted)' }}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Tracking
                      </h4>
                      <a
                        href={`https://track.example.com/${order.trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-mono transition-colors"
                        style={{ color: 'var(--ws-primary)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        {order.trackingNumber}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div
                  className="pt-4 space-y-2"
                  style={{ borderTop: '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Subtotal</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                      {formatCurrency(order.subtotal)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Discount</span>
                      <span className="text-sm font-medium" style={{ color: 'rgba(34,197,94,0.9)' }}>
                        -{formatCurrency(order.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>VAT (21%)</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                      {formatCurrency(order.vat)}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between pt-2"
                    style={{ borderTop: '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)' }}
                  >
                    <span className="text-sm font-bold" style={{ color: 'var(--ws-text)' }}>Total</span>
                    <span className="text-base font-bold" style={gradientTextStyle()}>
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {(order.status === 'invoiced' || order.invoiceUrl) && (
                    <SecondaryButton
                      size="sm"
                      icon={Download}
                      onClick={() => window.open(order.invoiceUrl || '#', '_blank')}
                    >
                      Download Invoice
                    </SecondaryButton>
                  )}
                  {(order.status === 'shipped' || order.status === 'in_transit') && order.trackingNumber && (
                    <SecondaryButton
                      size="sm"
                      icon={Truck}
                      onClick={() => window.open(`https://track.example.com/${order.trackingNumber}`, '_blank')}
                    >
                      Track Delivery
                    </SecondaryButton>
                  )}
                  <PrimaryButton
                    size="sm"
                    icon={RefreshCw}
                    onClick={() => nav?.goToCatalog?.()}
                  >
                    Reorder
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PreviewOrdersPage
// ---------------------------------------------------------------------------

export default function PreviewOrdersPage({ config, nav }) {
  const { client, isAuthenticated } = useWholesale();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch real orders when client is available
  useEffect(() => {
    if (!client?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOrders = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const dbOrders = await getClientOrders(client.id, 100);
        if (cancelled) return;
        setOrders(dbOrders.map(normalizeOrder));
      } catch (err) {
        console.error('[PreviewOrdersPage] Failed to fetch orders:', err);
        if (!cancelled) setFetchError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrders();

    return () => { cancelled = true; };
  }, [client?.id]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Status filter
    if (activeFilter !== 'all') {
      result = result.filter((o) => o.status === activeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.poNumber && o.poNumber.toLowerCase().includes(q)),
      );
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((o) => new Date(o.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.date) <= to);
    }

    return result;
  }, [orders, activeFilter, searchQuery, dateFrom, dateTo]);

  const handleToggle = useCallback((orderId) => {
    setExpandedId((prev) => (prev === orderId ? null : orderId));
  }, []);

  const handleFilterChange = useCallback((key) => {
    setActiveFilter(key);
    setExpandedId(null);
  }, []);

  // Not authenticated -- show sign-in prompt
  if (!isAuthenticated || !client) {
    return (
      <div className="min-h-full px-6 sm:px-10 lg:px-16 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Order History' },
          ]}
        />
        <SectionHeader
          title="Order History"
          subtitle="Track your orders, manage invoices, and quickly reorder past purchases"
        />
        <EmptyState
          icon={LogIn}
          title="Sign in to view your orders"
          description="Log in to your B2B account to access your order history, track shipments, and reorder past purchases."
          action={
            <PrimaryButton size="sm" icon={LogIn} onClick={() => nav?.goToLogin?.()}>
              Sign In
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-full px-6 sm:px-10 lg:px-16 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Order History' },
          ]}
        />
        <SectionHeader
          title="Order History"
          subtitle="Loading your orders..."
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--ws-primary)' }} />
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="min-h-full px-6 sm:px-10 lg:px-16 py-8">
        <Breadcrumb
          items={[
            { label: 'Home', onClick: () => nav?.goToHome?.() },
            { label: 'Order History' },
          ]}
        />
        <SectionHeader
          title="Order History"
          subtitle="Something went wrong"
        />
        <EmptyState
          icon={AlertCircle}
          title="Failed to load orders"
          description={fetchError}
          action={
            <PrimaryButton size="sm" icon={RefreshCw} onClick={() => window.location.reload()}>
              Retry
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 sm:px-10 lg:px-16 py-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome?.() },
          { label: 'Order History' },
        ]}
      />

      {/* Section Header */}
      <SectionHeader
        title="Order History"
        subtitle="Track your orders, manage invoices, and quickly reorder past purchases"
        action={
          <SecondaryButton size="sm" icon={ShoppingCart} onClick={() => nav?.goToCart?.()}>
            View Cart
          </SecondaryButton>
        }
      />

      {/* Order Stats Bar */}
      <OrderStatsBar orders={orders} />

      {/* Quick Reorder */}
      <QuickReorderSection orders={orders} nav={nav} />

      {/* Status Filter Pills */}
      <StatusFilterPills
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        orders={orders}
      />

      {/* Search + Date Range */}
      <SearchAndDateFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders found"
          description={
            searchQuery || activeFilter !== 'all' || dateFrom || dateTo
              ? 'Try adjusting your filters or search query'
              : 'Your order history will appear here once you place your first order'
          }
          action={
            (searchQuery || activeFilter !== 'all' || dateFrom || dateTo) && (
              <SecondaryButton
                size="sm"
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </SecondaryButton>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order, idx) => (
            <OrderRow
              key={order.dbId || order.id}
              order={order}
              isExpanded={expandedId === order.id}
              onToggle={() => handleToggle(order.id)}
              nav={nav}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredOrders.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs mt-6 pb-4"
          style={{ color: 'var(--ws-muted)' }}
        >
          Showing {filteredOrders.length} of {orders.length} orders
        </motion.p>
      )}
    </div>
  );
}
