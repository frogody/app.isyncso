import React, { useState, useCallback, useMemo } from 'react';
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

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_ORDERS = [
  {
    id: 'ORD-2026-00142',
    poNumber: 'PO-2026-0089',
    date: '2026-02-15',
    status: 'delivered',
    paymentStatus: 'paid',
    paymentDueDate: '2026-03-15',
    deliveryAddress: 'Warehouse - Industrieweg 42, 3044 AS Rotterdam',
    items: [
      { name: 'Electric Motor 5.5kW IE3', sku: 'MOT-5500-IE3', quantity: 2, price: 2850.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Motor' },
      { name: 'Frequency Inverter 7.5kW', sku: 'INV-7500-FQ', quantity: 2, price: 1475.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Inverter' },
      { name: 'Control Panel CP-800', sku: 'PNL-CP800', quantity: 1, price: 1950.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Panel' },
    ],
    subtotal: 10600.00,
    discount: 530.00,
    vat: 2114.70,
    total: 12184.70,
    trackingNumber: 'NL9876543210',
    invoiceUrl: '#',
  },
  {
    id: 'ORD-2026-00141',
    poNumber: 'PO-2026-0088',
    date: '2026-02-12',
    status: 'in_transit',
    paymentStatus: 'net30_pending',
    paymentDueDate: '2026-03-12',
    deliveryAddress: 'Warehouse - Industrieweg 42, 3044 AS Rotterdam',
    items: [
      { name: 'CNC Mill End-Effector T4', sku: 'CNC-EE-T4', quantity: 1, price: 1250.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=CNC' },
      { name: 'Stainless Steel Sheet 2mm', sku: 'SS-SHT-2MM', quantity: 10, price: 89.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Steel' },
      { name: 'Welding Rod Pack WR-316L', sku: 'WR-316L-PK', quantity: 4, price: 175.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Weld' },
    ],
    subtotal: 2840.00,
    discount: 0,
    vat: 596.40,
    total: 3436.40,
    trackingNumber: 'NL1234567890',
    invoiceUrl: null,
  },
  {
    id: 'ORD-2026-00140',
    poNumber: 'PO-2026-0085',
    date: '2026-02-08',
    status: 'processing',
    paymentStatus: 'net30_pending',
    paymentDueDate: '2026-03-08',
    deliveryAddress: 'Main Office - Keizersgracht 123, 1015 CJ Amsterdam',
    items: [
      { name: 'PLC Module IO-16', sku: 'PLC-IO16', quantity: 3, price: 785.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=PLC' },
      { name: 'Sensor Kit SK-Pro', sku: 'SNS-SKPRO', quantity: 6, price: 165.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Sensor' },
    ],
    subtotal: 3345.00,
    discount: 167.25,
    vat: 667.33,
    total: 3845.08,
    trackingNumber: null,
    invoiceUrl: null,
  },
  {
    id: 'ORD-2026-00138',
    poNumber: 'PO-2026-0082',
    date: '2026-02-01',
    status: 'confirmed',
    paymentStatus: 'net30_pending',
    paymentDueDate: '2026-03-01',
    deliveryAddress: 'Warehouse - Industrieweg 42, 3044 AS Rotterdam',
    items: [
      { name: 'Hydraulic Pump Filter HF-200', sku: 'HYD-HF200', quantity: 12, price: 130.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Filter' },
      { name: 'Precision Gasket Ring M8', sku: 'GSK-M8-PR', quantity: 50, price: 24.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Gasket' },
    ],
    subtotal: 2760.00,
    discount: 138.00,
    vat: 550.62,
    total: 3172.62,
    trackingNumber: null,
    invoiceUrl: null,
  },
  {
    id: 'ORD-2026-00135',
    poNumber: 'PO-2026-0079',
    date: '2026-01-22',
    status: 'pending_review',
    paymentStatus: 'net30_due',
    paymentDueDate: '2026-02-22',
    deliveryAddress: 'Main Office - Keizersgracht 123, 1015 CJ Amsterdam',
    items: [
      { name: 'Torque Wrench 40-200Nm', sku: 'TRQ-40200', quantity: 2, price: 389.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Torque' },
      { name: 'Calibration Weight Set', sku: 'CAL-WGT-ST', quantity: 1, price: 367.80, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Cal' },
    ],
    subtotal: 1145.80,
    discount: 0,
    vat: 240.62,
    total: 1386.42,
    trackingNumber: null,
    invoiceUrl: null,
  },
  {
    id: 'ORD-2026-00130',
    poNumber: 'PO-2026-0074',
    date: '2026-01-10',
    status: 'invoiced',
    paymentStatus: 'paid',
    paymentDueDate: '2026-02-10',
    deliveryAddress: 'Warehouse - Industrieweg 42, 3044 AS Rotterdam',
    items: [
      { name: 'Safety Goggles Pro-X', sku: 'SAF-GOG-PX', quantity: 50, price: 22.50, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Safety' },
      { name: 'Cutting Fluid 5L', sku: 'CUT-FLD-5L', quantity: 8, price: 145.00, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Fluid' },
      { name: 'Cable Tray 3m Section', sku: 'CBL-TRY-3M', quantity: 20, price: 67.50, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Cable' },
    ],
    subtotal: 3635.00,
    discount: 181.75,
    vat: 725.18,
    total: 4178.43,
    trackingNumber: 'NL5678901234',
    invoiceUrl: '#',
  },
  {
    id: 'ORD-2026-00125',
    poNumber: 'PO-2026-0068',
    date: '2025-12-20',
    status: 'delivered',
    paymentStatus: 'paid',
    paymentDueDate: '2026-01-20',
    deliveryAddress: 'Warehouse - Industrieweg 42, 3044 AS Rotterdam',
    items: [
      { name: 'Digital Caliper 0-300mm', sku: 'DGC-300MM', quantity: 5, price: 299.99, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Caliper' },
    ],
    subtotal: 1499.95,
    discount: 75.00,
    vat: 299.24,
    total: 1724.19,
    trackingNumber: 'NL1122334455',
    invoiceUrl: '#',
  },
  {
    id: 'ORD-2026-00118',
    poNumber: 'PO-2026-0060',
    date: '2025-12-05',
    status: 'in_transit',
    paymentStatus: 'overdue',
    paymentDueDate: '2026-01-05',
    deliveryAddress: 'Main Office - Keizersgracht 123, 1015 CJ Amsterdam',
    items: [
      { name: 'Industrial Bearing Set A12', sku: 'BRG-A12-ST', quantity: 4, price: 498.75, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Bearing' },
      { name: 'Mounting Bracket Set', sku: 'MNT-BRK-ST', quantity: 10, price: 28.50, image: 'https://placehold.co/80x80/1a1a2e/ffffff?text=Mount' },
    ],
    subtotal: 2280.00,
    discount: 114.00,
    vat: 454.86,
    total: 2620.86,
    trackingNumber: 'NL6677889900',
    invoiceUrl: null,
  },
];

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const ORDER_STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', theme: 'info', pulse: true, color: 'rgba(59,130,246,0.8)' },
  confirmed: { label: 'Confirmed', theme: 'primary', pulse: false, color: 'var(--ws-primary)' },
  processing: { label: 'Processing', theme: 'warning', pulse: false, color: 'rgba(245,158,11,0.8)' },
  in_transit: { label: 'In Transit', theme: 'info', pulse: false, color: 'rgba(59,130,246,0.8)' },
  delivered: { label: 'Delivered', theme: 'success', pulse: false, color: 'rgba(34,197,94,0.8)' },
  invoiced: { label: 'Invoiced', theme: 'neutral', pulse: false, color: 'rgba(161,161,170,0.8)' },
};

const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Paid', theme: 'success', pulse: false },
  net30_pending: { label: 'Net-30', theme: 'info', pulse: false, getDynamic: (order) => `Net-30 (Due: ${formatDateShort(order.paymentDueDate)})` },
  net30_due: { label: 'Net-30 Due', theme: 'warning', pulse: false },
  overdue: { label: 'Overdue', theme: 'error', pulse: true },
};

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'invoiced', label: 'Invoiced' },
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
  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'pending_review').length, [orders]);
  const inTransitCount = useMemo(() => orders.filter((o) => o.status === 'in_transit').length, [orders]);

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
                  className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ border: '1px solid var(--ws-border)' }}
                >
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
          placeholder="Search by PO Number or Order ID..."
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
        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
        style={{ border: '1px solid var(--ws-border)' }}
      >
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--ws-text)' }}>
          {item.name}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--ws-muted)' }}>
          {item.sku}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
          {formatCurrency(item.quantity * item.price)}
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
          {/* Order ID + PO + Date */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold font-mono" style={{ color: 'var(--ws-text)' }}>
                {order.id}
              </p>
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
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
              {formatDateFull(order.date)}
            </p>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <StatusBadge status={statusCfg.theme} label={statusCfg.label} pulse={statusCfg.pulse} size="xs" />
            <StatusBadge status={paymentCfg.theme} label={paymentLabel} pulse={paymentCfg.pulse} size="xs" />
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
                <div className="sm:hidden pt-3">
                  <span className="text-xs font-mono" style={{ color: 'var(--ws-muted)' }}>
                    PO: {order.poNumber}
                  </span>
                </div>

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

                {/* Delivery + Tracking */}
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
                  {order.status === 'in_transit' && order.trackingNumber && (
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredOrders = useMemo(() => {
    let result = MOCK_ORDERS;

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
          o.poNumber.toLowerCase().includes(q),
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
  }, [activeFilter, searchQuery, dateFrom, dateTo]);

  const handleToggle = useCallback((orderId) => {
    setExpandedId((prev) => (prev === orderId ? null : orderId));
  }, []);

  const handleFilterChange = useCallback((key) => {
    setActiveFilter(key);
    setExpandedId(null);
  }, []);

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
      <OrderStatsBar orders={MOCK_ORDERS} />

      {/* Quick Reorder */}
      <QuickReorderSection orders={MOCK_ORDERS} nav={nav} />

      {/* Status Filter Pills */}
      <StatusFilterPills
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        orders={MOCK_ORDERS}
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
              key={order.id}
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
          Showing {filteredOrders.length} of {MOCK_ORDERS.length} orders
        </motion.p>
      )}
    </div>
  );
}
