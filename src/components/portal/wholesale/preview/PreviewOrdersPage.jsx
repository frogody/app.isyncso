import React, { useState, useCallback, useMemo } from 'react';
import {
  Package,
  ChevronDown,
  ChevronUp,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ORDERS = [
  {
    id: 'ORD-7F3A2B1C',
    date: '2 days ago',
    status: 'pending',
    itemCount: 3,
    total: 1247.5,
    items: [
      { name: 'Industrial Bearing Set A12', qty: 2, unitPrice: 498.75 },
      { name: 'Precision Gasket Ring M8', qty: 5, unitPrice: 24.0 },
      { name: 'Hydraulic Pump Filter HF-200', qty: 1, unitPrice: 130.0 },
    ],
    address: 'Keizersgracht 123, 1015 CJ Amsterdam, Netherlands',
    notes: 'Please deliver before 10:00 AM.',
  },
  {
    id: 'ORD-5E8D4C2A',
    date: '1 week ago',
    status: 'confirmed',
    itemCount: 5,
    total: 3890.0,
    items: [
      { name: 'CNC Mill End-Effector T4', qty: 1, unitPrice: 1250.0 },
      { name: 'Stainless Steel Sheet 2mm', qty: 10, unitPrice: 89.0 },
      { name: 'Welding Rod Pack WR-316L', qty: 4, unitPrice: 175.0 },
      { name: 'Safety Goggles Pro-X', qty: 20, unitPrice: 22.5 },
      { name: 'Cutting Fluid 5L', qty: 2, unitPrice: 145.0 },
    ],
    address: 'Industrieweg 45, 3044 AS Rotterdam, Netherlands',
    notes: null,
  },
  {
    id: 'ORD-9B1F6E3D',
    date: '2 weeks ago',
    status: 'shipped',
    itemCount: 2,
    total: 756.8,
    items: [
      { name: 'Torque Wrench 40-200Nm', qty: 1, unitPrice: 389.0 },
      { name: 'Calibration Weight Set', qty: 1, unitPrice: 367.8 },
    ],
    address: 'Keizersgracht 123, 1015 CJ Amsterdam, Netherlands',
    notes: 'Tracking: NL4829174ES',
  },
  {
    id: 'ORD-4A7C8D5E',
    date: '1 month ago',
    status: 'delivered',
    itemCount: 8,
    total: 12450.0,
    items: [
      { name: 'Electric Motor 5.5kW IE3', qty: 2, unitPrice: 2850.0 },
      { name: 'Frequency Inverter 7.5kW', qty: 2, unitPrice: 1475.0 },
      { name: 'Control Panel CP-800', qty: 1, unitPrice: 1950.0 },
      { name: 'Cable Tray 3m Section', qty: 12, unitPrice: 67.5 },
      { name: 'Terminal Block Set TB-24', qty: 4, unitPrice: 38.75 },
      { name: 'PLC Module IO-16', qty: 1, unitPrice: 785.0 },
      { name: 'Sensor Kit SK-Pro', qty: 3, unitPrice: 165.0 },
      { name: 'Mounting Bracket Set', qty: 6, unitPrice: 28.5 },
    ],
    address: 'Industrieweg 45, 3044 AS Rotterdam, Netherlands',
    notes: 'Annual equipment refresh order.',
  },
  {
    id: 'ORD-2D6B9A4F',
    date: '2 months ago',
    status: 'delivered',
    itemCount: 1,
    total: 299.99,
    items: [
      { name: 'Digital Caliper 0-300mm', qty: 1, unitPrice: 299.99 },
    ],
    address: 'Keizersgracht 123, 1015 CJ Amsterdam, Netherlands',
    notes: null,
  },
];

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered'];

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bg: 'rgba(245, 158, 11, 0.15)',
    text: 'rgb(245, 158, 11)',
    border: 'rgba(245, 158, 11, 0.3)',
    Icon: AlertCircle,
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'rgba(59, 130, 246, 0.15)',
    text: 'rgb(59, 130, 246)',
    border: 'rgba(59, 130, 246, 0.3)',
    Icon: Clock,
  },
  shipped: {
    label: 'Shipped',
    bg: 'rgba(6, 182, 212, 0.15)',
    text: 'rgb(6, 182, 212)',
    border: 'rgba(6, 182, 212, 0.3)',
    Icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    bg: 'rgba(34, 197, 94, 0.15)',
    text: 'rgb(34, 197, 94)',
    border: 'rgba(34, 197, 94, 0.3)',
    Icon: CheckCircle,
  },
};

const VAT_RATE = 0.21;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value) {
  const num = Number(value) || 0;
  return `\u20AC${num.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const { Icon } = cfg;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// OrderRow
// ---------------------------------------------------------------------------

function OrderRow({ order, isExpanded, onToggle }) {
  const subtotal = order.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const vat = subtotal * VAT_RATE;

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors"
      style={{
        backgroundColor: 'var(--ws-surface, #18181b)',
        border: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
      }}
    >
      {/* Summary row */}
      <button
        type="button"
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
        onClick={onToggle}
      >
        {/* Order number */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold font-mono truncate"
            style={{ color: 'var(--ws-text, #fff)' }}
          >
            {order.id}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            {order.date}
          </p>
        </div>

        {/* Status badge */}
        <StatusBadge status={order.status} />

        {/* Item count */}
        <span
          className="hidden sm:inline text-xs whitespace-nowrap"
          style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
        >
          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
        </span>

        {/* Total */}
        <span
          className="text-sm font-bold whitespace-nowrap"
          style={{ color: 'var(--ws-text, #fff)' }}
        >
          {formatPrice(order.total)}
        </span>

        {/* Chevron */}
        {isExpanded ? (
          <ChevronUp
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
          />
        ) : (
          <ChevronDown
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
          />
        )}
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          className="px-5 pb-5 space-y-4"
          style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.06))' }}
        >
          {/* Items table */}
          <div className="pt-4">
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
            >
              Order Items
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
                    }}
                  >
                    <th
                      className="text-left py-2 pr-4 text-xs font-medium"
                      style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                    >
                      Product
                    </th>
                    <th
                      className="text-center py-2 px-4 text-xs font-medium"
                      style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                    >
                      Qty
                    </th>
                    <th
                      className="text-right py-2 px-4 text-xs font-medium"
                      style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                    >
                      Unit Price
                    </th>
                    <th
                      className="text-right py-2 pl-4 text-xs font-medium"
                      style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom:
                          idx < order.items.length - 1
                            ? '1px solid var(--ws-border, rgba(255,255,255,0.04))'
                            : 'none',
                      }}
                    >
                      <td
                        className="py-2.5 pr-4"
                        style={{ color: 'var(--ws-text, #fff)' }}
                      >
                        {item.name}
                      </td>
                      <td
                        className="py-2.5 px-4 text-center"
                        style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
                      >
                        {item.qty}
                      </td>
                      <td
                        className="py-2.5 px-4 text-right"
                        style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
                      >
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td
                        className="py-2.5 pl-4 text-right font-medium"
                        style={{ color: 'var(--ws-text, #fff)' }}
                      >
                        {formatPrice(item.qty * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipping address */}
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
            >
              Shipping Address
            </h4>
            <p
              className="text-sm"
              style={{ color: 'var(--ws-text, #fff)' }}
            >
              {order.address}
            </p>
          </div>

          {/* Order notes */}
          {order.notes && (
            <div>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                Order Notes
              </h4>
              <p
                className="text-sm"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.7))' }}
              >
                {order.notes}
              </p>
            </div>
          )}

          {/* Totals */}
          <div
            className="pt-3 space-y-1.5"
            style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.06))' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                Subtotal
              </span>
              <span
                className="text-sm"
                style={{ color: 'var(--ws-text, #fff)' }}
              >
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-sm"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              >
                VAT (21%)
              </span>
              <span
                className="text-sm"
                style={{ color: 'var(--ws-text, #fff)' }}
              >
                {formatPrice(vat)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5">
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--ws-text, #fff)' }}
              >
                Total
              </span>
              <span
                className="text-base font-bold"
                style={{ color: 'var(--ws-primary, #06b6d4)' }}
              >
                {formatPrice(order.total)}
              </span>
            </div>
          </div>

          {/* Reorder button */}
          <ReorderButton />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReorderButton
// ---------------------------------------------------------------------------

function ReorderButton() {
  const [feedback, setFeedback] = useState(false);

  const handleReorder = useCallback(() => {
    setFeedback(true);
    setTimeout(() => setFeedback(false), 2000);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleReorder}
        disabled={feedback}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          backgroundColor: 'var(--ws-primary, #06b6d4)',
          color: 'var(--ws-bg, #000)',
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reorder
      </button>
      {feedback && (
        <span
          className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'rgb(34, 197, 94)' }}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Items added to cart
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PreviewOrdersPage
// ---------------------------------------------------------------------------

export default function PreviewOrdersPage({ config, nav }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return MOCK_ORDERS;
    return MOCK_ORDERS.filter((o) => o.status === activeFilter);
  }, [activeFilter]);

  const handleToggle = useCallback(
    (orderId) => {
      setExpandedId((prev) => (prev === orderId ? null : orderId));
    },
    [],
  );

  return (
    <div className="min-h-full px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <Package
            className="w-5 h-5"
            style={{ color: 'var(--ws-primary, #06b6d4)' }}
          />
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--ws-text, #fff)' }}
        >
          Order History
        </h1>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          const count =
            filter === 'all'
              ? MOCK_ORDERS.length
              : MOCK_ORDERS.filter((o) => o.status === filter).length;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter);
                setExpandedId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--ws-primary, #06b6d4)',
                      color: 'var(--ws-bg, #000)',
                    }
                  : {
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--ws-muted, rgba(255,255,255,0.6))',
                      border: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
                    }
              }
            >
              {filter}
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                style={
                  isActive
                    ? {
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        color: 'var(--ws-bg, #000)',
                      }
                    : {
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--ws-muted, rgba(255,255,255,0.5))',
                      }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
          >
            <Package
              className="w-7 h-7"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.3))' }}
            />
          </div>
          <h3
            className="text-sm font-semibold mb-1"
            style={{ color: 'var(--ws-text, #fff)' }}
          >
            No orders found
          </h3>
          <p
            className="text-xs"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
          >
            No {activeFilter !== 'all' ? `"${activeFilter}"` : ''} orders to display.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isExpanded={expandedId === order.id}
              onToggle={() => handleToggle(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
