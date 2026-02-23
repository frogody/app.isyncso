import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  Download,
  X,
  TrendingUp,
  CalendarDays,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import OrderStatusBadge from './OrderStatusBadge';

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Toast (shared)
// ---------------------------------------------------------------------------

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
      style={{
        backgroundColor: type === 'error' ? '#991b1b' : type === 'warning' ? '#78350f' : 'var(--ws-surface, #18181b)',
        color: type === 'error' ? '#fca5a5' : type === 'warning' ? '#fde68a' : 'var(--ws-primary, #06b6d4)',
        border: `1px solid ${type === 'error' ? '#7f1d1d' : type === 'warning' ? '#92400e' : 'var(--ws-border, #27272a)'}`,
      }}
    >
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : type === 'warning' ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Check className="w-4 h-4 flex-shrink-0" />
      )}
      {message}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, loading = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-xl p-6"
        style={{
          backgroundColor: 'var(--ws-surface, #18181b)',
          border: '1px solid var(--ws-border, #27272a)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--ws-text, #fafafa)' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--ws-muted)', border: '1px solid var(--ws-border)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Order Progress Stages
// ---------------------------------------------------------------------------

const ORDER_STAGES = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Packing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

function OrderProgressBar({ status }) {
  const normalised = (status || '').toLowerCase().trim();

  if (normalised === 'cancelled') {
    return (
      <div className="flex items-center justify-center gap-2 py-1 mt-2">
        <AlertCircle className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(239,68,68,0.6)' }} />
        <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'rgba(239,68,68,0.6)' }}>
          ORDER CANCELLED
        </span>
      </div>
    );
  }

  const currentIdx = ORDER_STAGES.findIndex((s) => s.key === normalised);
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;

  return (
    <div className="mt-2.5 mb-0.5">
      <div className="max-w-md">
        <div className="flex items-center">
          {ORDER_STAGES.map((stage, idx) => {
            const isDone = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            const isActive = idx <= activeIdx;
            const isLast = idx === ORDER_STAGES.length - 1;

            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 52 }}>
                  <div
                    className="flex items-center justify-center rounded-full transition-all duration-300"
                    style={{
                      width: isCurrent ? 18 : 14,
                      height: isCurrent ? 18 : 14,
                      backgroundColor: isActive
                        ? 'var(--ws-primary, #06b6d4)'
                        : 'transparent',
                      border: isActive
                        ? 'none'
                        : '2px solid var(--ws-muted, rgba(255,255,255,0.15))',
                      boxShadow: isCurrent
                        ? '0 0 0 4px rgba(6, 182, 212, 0.15)'
                        : 'none',
                    }}
                  >
                    {isDone && (
                      <Check
                        className="flex-shrink-0"
                        style={{ width: 9, height: 9, color: 'var(--ws-bg, #000)', strokeWidth: 3 }}
                      />
                    )}
                    {isCurrent && (
                      <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: 'var(--ws-bg, #000)' }} />
                    )}
                  </div>
                  <span
                    className="text-[9px] mt-1 whitespace-nowrap select-none leading-none"
                    style={{
                      color: isCurrent
                        ? 'var(--ws-text, #fff)'
                        : isActive
                          ? 'var(--ws-muted, rgba(255,255,255,0.5))'
                          : 'var(--ws-muted, rgba(255,255,255,0.2))',
                      fontWeight: isCurrent ? 700 : 500,
                    }}
                  >
                    {stage.label}
                  </span>
                </div>

                {!isLast && (
                  <div className="flex-1 h-[2px] -mx-0.5 rounded-full" style={{ minWidth: 12 }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: idx < activeIdx ? '100%' : '0%',
                        backgroundColor: 'var(--ws-primary, #06b6d4)',
                      }}
                    />
                    {idx >= activeIdx && (
                      <div
                        className="h-[2px] rounded-full -mt-[2px]"
                        style={{ backgroundColor: 'var(--ws-muted, rgba(255,255,255,0.1))' }}
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Format a number as EUR currency.
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

/**
 * Format a date string into a human-readable short format.
 */
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

// ---------------------------------------------------------------------------
// Spending Analytics Strip
// ---------------------------------------------------------------------------

function SpendingAnalyticsStrip({ orders }) {
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { totalSpent: 0, ordersThisMonth: 0, avgOrderValue: 0 };
    }

    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= startOfMonth;
    }).length;

    return { totalSpent, ordersThisMonth, avgOrderValue };
  }, [orders]);

  const cards = [
    {
      icon: DollarSign,
      label: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
    },
    {
      icon: CalendarDays,
      label: 'Orders This Month',
      value: stats.ordersThisMonth.toString(),
    },
    {
      icon: TrendingUp,
      label: 'Avg. Order Value',
      value: formatCurrency(stats.avgOrderValue),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
          style={{
            backgroundColor: 'var(--ws-surface, #18181b)',
            border: '1px solid var(--ws-border, #27272a)',
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)' }}
          >
            <card.icon className="w-4 h-4" style={{ color: 'var(--ws-primary, #06b6d4)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold truncate" style={{ color: 'var(--ws-text, #fafafa)' }}>
              {card.value}
            </p>
            <p className="text-[11px] leading-none" style={{ color: 'var(--ws-muted, #a1a1aa)' }}>
              {card.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV Export utility
// ---------------------------------------------------------------------------

function exportOrdersCSV(orders) {
  const headers = ['Order Number', 'Date', 'Status', 'Items Count', 'Total'];
  const rows = orders.map((o) => {
    const itemCount = o.items_count != null ? o.items_count : Array.isArray(o.items) ? o.items.length : 0;
    return [
      o.order_number || `#${o.id?.slice(0, 8)}`,
      o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '',
      o.status || '',
      itemCount,
      (o.total ?? 0).toFixed(2),
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// OrderHistoryPage
// ---------------------------------------------------------------------------

/**
 * OrderHistoryPage
 *
 * Displays a paginated list of past B2B orders for the current client/org.
 * Supports status filtering, one-click reorder, CSV export, and cancellation.
 */
export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { org } = useParams();
  const { orgId, addToCart, client } = useWholesale();

  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // For analytics (all orders, no pagination)
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // Cancellation dialog
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Reorder loading states (per-order)
  const [reorderingId, setReorderingId] = useState(null);

  // Status counts for tab badges
  const [statusCounts, setStatusCounts] = useState({});

  // Fetch all orders for analytics + status counts (no pagination, lightweight)
  const fetchAllOrders = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('b2b_orders')
        .select('id, status, total, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllOrders(data);
        // Count by status
        const counts = { all: data.length };
        for (const o of data) {
          const s = (o.status || '').toLowerCase();
          counts[s] = (counts[s] || 0) + 1;
        }
        setStatusCounts(counts);
      }
    } catch (err) {
      console.error('[OrderHistoryPage] All orders fetch error:', err);
    }
  }, [orgId]);

  // Fetch paginated orders from Supabase
  const fetchOrders = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('b2b_orders')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[OrderHistoryPage] Fetch error:', error);
        setOrders([]);
        setTotalCount(0);
      } else {
        setOrders(data || []);
        setTotalCount(count ?? 0);
      }
    } catch (err) {
      console.error('[OrderHistoryPage] Unexpected error:', err);
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [orgId, statusFilter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleViewOrder = useCallback(
    (orderId) => {
      navigate(`/portal/${org}/shop/orders/${orderId}`);
    },
    [navigate, org],
  );

  const handleGoToCatalog = useCallback(() => {
    navigate(`/portal/${org}/shop/catalog`);
  }, [navigate, org]);

  // Derive item count from items_count column or items jsonb length
  const getItemCount = (order) => {
    if (order.items_count != null) return order.items_count;
    if (Array.isArray(order.items)) return order.items.length;
    return 0;
  };

  // ---------------------------------------------------------------------------
  // One-click Reorder
  // ---------------------------------------------------------------------------

  const handleReorder = useCallback(
    async (order) => {
      if (reorderingId) return;
      setReorderingId(order.id);

      try {
        // Try to get line items from the order data
        let items = [];

        // If order has inline items array
        if (Array.isArray(order.items) && order.items.length > 0) {
          items = order.items;
        } else {
          // Fetch from b2b_order_items table
          const { data: itemsData, error: itemsError } = await supabase
            .from('b2b_order_items')
            .select('*, products(*)')
            .eq('b2b_order_id', order.id);

          if (!itemsError && itemsData?.length) {
            items = itemsData;
          }
        }

        if (items.length === 0) {
          showToast('No items found in this order', 'error');
          return;
        }

        let addedCount = 0;
        let unavailableCount = 0;

        for (const item of items) {
          try {
            const product = item.products || item;
            addToCart(
              {
                id: item.product_id || product.id,
                name: product.name || item.name,
                sku: product.sku || item.sku || '',
                price: item.unit_price || item.price || product.price || 0,
                featured_image: product.featured_image || item.image || null,
              },
              item.quantity || 1,
            );
            addedCount++;
          } catch {
            unavailableCount++;
          }
        }

        if (unavailableCount > 0 && addedCount > 0) {
          showToast(`${addedCount} of ${addedCount + unavailableCount} items added (${unavailableCount} unavailable)`, 'warning');
        } else if (addedCount > 0) {
          showToast(`${addedCount} item${addedCount !== 1 ? 's' : ''} added to cart`);
        } else {
          showToast('Could not add items to cart', 'error');
        }
      } catch (err) {
        console.error('[OrderHistoryPage] Reorder error:', err);
        showToast('Failed to reorder', 'error');
      } finally {
        setReorderingId(null);
      }
    },
    [addToCart, reorderingId],
  );

  // ---------------------------------------------------------------------------
  // Cancellation Request
  // ---------------------------------------------------------------------------

  const handleCancelOrder = useCallback(async () => {
    if (!cancelOrderId) return;
    setCancelling(true);

    try {
      const { error } = await supabase
        .from('b2b_orders')
        .update({ status: 'cancelled' })
        .eq('id', cancelOrderId)
        .eq('organization_id', orgId);

      if (error) throw error;

      showToast('Order cancellation requested');
      setCancelOrderId(null);
      fetchOrders();
      fetchAllOrders();
    } catch (err) {
      console.error('[OrderHistoryPage] Cancel error:', err);
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  }, [cancelOrderId, orgId, fetchOrders, fetchAllOrders]);

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  const handleExport = useCallback(() => {
    // Export currently filtered orders (use allOrders filtered by status)
    let exportData = allOrders;
    if (statusFilter !== 'all') {
      exportData = allOrders.filter((o) => (o.status || '').toLowerCase() === statusFilter);
    }
    if (exportData.length === 0) {
      showToast('No orders to export', 'error');
      return;
    }
    exportOrdersCSV(exportData);
    showToast(`Exported ${exportData.length} order${exportData.length !== 1 ? 's' : ''}`);
  }, [allOrders, statusFilter]);

  // Can this order be cancelled?
  const canCancel = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'confirmed';
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ color: 'var(--ws-text)' }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Cancellation confirm dialog */}
      <AnimatePresence>
        {cancelOrderId && (
          <ConfirmDialog
            title="Request Cancellation"
            message="Are you sure you want to cancel this order? This cannot be undone."
            confirmLabel="Cancel Order"
            onConfirm={handleCancelOrder}
            onCancel={() => setCancelOrderId(null)}
            loading={cancelling}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--ws-text)' }}
          >
            Order History
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--ws-muted)' }}
          >
            {totalCount} order{totalCount !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* Export button */}
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.06]"
          style={{
            color: 'var(--ws-muted)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Spending Analytics Strip */}
      {allOrders.length > 0 && <SpendingAnalyticsStrip orders={allOrders} />}

      {/* Status filter tabs with count badges */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter === opt.value;
          const count = statusCounts[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                active ? '' : 'hover:bg-white/[0.06]'
              }`}
              style={{
                backgroundColor: active
                  ? 'var(--ws-primary, #06b6d4)'
                  : 'transparent',
                color: active
                  ? 'var(--ws-bg, #000)'
                  : 'var(--ws-muted, rgba(255,255,255,0.5))',
                border: active
                  ? '1px solid transparent'
                  : '1px solid var(--ws-border, rgba(255,255,255,0.08))',
              }}
            >
              {opt.label}
              {count > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none"
                  style={{
                    backgroundColor: active
                      ? 'rgba(0,0,0,0.2)'
                      : 'var(--ws-surface, rgba(255,255,255,0.06))',
                    color: active
                      ? 'var(--ws-bg, #000)'
                      : 'var(--ws-muted, rgba(255,255,255,0.4))',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: 'var(--ws-primary, #06b6d4)' }}
          />
        </div>
      ) : orders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <ShoppingBag
              className="w-7 h-7"
              style={{ color: 'var(--ws-muted)', opacity: 0.5 }}
            />
          </div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--ws-text)' }}
          >
            No orders yet
          </h3>
          <p
            className="text-sm max-w-sm mb-6"
            style={{ color: 'var(--ws-muted)' }}
          >
            {statusFilter !== 'all'
              ? `No orders with status "${statusFilter}" found.`
              : 'Browse our catalog and place your first order.'}
          </p>
          <button
            type="button"
            onClick={handleGoToCatalog}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--ws-primary, #06b6d4)',
              color: 'var(--ws-bg, #000)',
            }}
          >
            Browse Catalog
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Orders table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: '1px solid var(--ws-border)',
              backgroundColor: 'var(--ws-surface)',
            }}
          >
            {/* Desktop table header */}
            <div
              className="hidden sm:grid grid-cols-[1fr_120px_110px_80px_100px_120px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
              style={{
                color: 'var(--ws-muted)',
                borderBottom: '1px solid var(--ws-border)',
              }}
            >
              <span>Order</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-center">Items</span>
              <span className="text-right">Total</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Order rows */}
            {orders.map((order) => {
              const orderStatus = (order.status || '').toLowerCase();
              return (
                <div
                  key={order.id}
                  className="sm:grid sm:grid-cols-[1fr_120px_110px_80px_100px_120px] gap-4 px-5 py-4 items-center transition-colors hover:bg-white/[0.03]"
                  style={{
                    borderBottom: '1px solid var(--ws-border)',
                  }}
                >
                  {/* Order number (clickable) */}
                  <div
                    className="flex items-center gap-3 mb-2 sm:mb-0 cursor-pointer"
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
                    <div
                      className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(6, 182, 212, 0.08)',
                      }}
                    >
                      <Package
                        className="w-4 h-4"
                        style={{ color: 'var(--ws-primary, #06b6d4)' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-sm font-semibold block truncate"
                        style={{ color: 'var(--ws-text)' }}
                      >
                        {order.order_number || `#${order.id?.slice(0, 8)}`}
                      </span>
                    </div>
                  </div>

                  {/* Date */}
                  <span
                    className="text-xs hidden sm:block"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    {formatDate(order.created_at)}
                  </span>

                  {/* Status badge */}
                  <div className="mb-2 sm:mb-0">
                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* Item count */}
                  <span
                    className="text-sm text-center hidden sm:block"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    {getItemCount(order)}
                  </span>

                  {/* Total */}
                  <span
                    className="text-sm font-semibold text-right hidden sm:block"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    {formatCurrency(order.total)}
                  </span>

                  {/* Actions column */}
                  <div className="hidden sm:flex items-center justify-end gap-1.5">
                    {/* Reorder button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(order);
                      }}
                      disabled={reorderingId === order.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                      style={{
                        color: 'var(--ws-primary, #06b6d4)',
                        border: '1px solid var(--ws-border)',
                      }}
                      title="Reorder"
                    >
                      {reorderingId === order.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-3 h-3" />
                      )}
                      Reorder
                    </button>

                    {/* Cancel button (only for pending/confirmed) */}
                    {canCancel(order.status) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelOrderId(order.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-red-500/10"
                        style={{
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                        title="Request cancellation"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    )}

                    {/* View arrow */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOrder(order.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                      title="View order"
                    >
                      <ArrowRight
                        className="w-4 h-4"
                        style={{ color: 'var(--ws-muted)' }}
                      />
                    </button>
                  </div>

                  {/* Mobile summary */}
                  <div className="flex items-center justify-between sm:hidden mt-1">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--ws-muted)' }}
                    >
                      {formatDate(order.created_at)} &middot;{' '}
                      {getItemCount(order)} item{getItemCount(order) !== 1 ? 's' : ''}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--ws-text)' }}
                    >
                      {formatCurrency(order.total)}
                    </span>
                  </div>

                  {/* Mobile actions row */}
                  <div className="flex items-center gap-2 sm:hidden mt-2">
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      disabled={reorderingId === order.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                      style={{
                        color: 'var(--ws-primary, #06b6d4)',
                        border: '1px solid var(--ws-border)',
                      }}
                    >
                      {reorderingId === order.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShoppingCart className="w-3 h-3" />
                      )}
                      Reorder
                    </button>

                    {canCancel(order.status) && (
                      <button
                        type="button"
                        onClick={() => setCancelOrderId(order.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-red-500/10"
                        style={{
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleViewOrder(order.id)}
                      className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
                      style={{ color: 'var(--ws-muted)', border: '1px solid var(--ws-border)' }}
                    >
                      View
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Order Progress Bar */}
                  <div className="col-span-full px-0 pt-1 pb-0.5">
                    <OrderProgressBar status={order.status} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span
                className="text-xs"
                style={{ color: 'var(--ws-muted)' }}
              >
                Page {page + 1} of {totalPages}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06]"
                  style={{
                    color: 'var(--ws-muted)',
                    border: '1px solid var(--ws-border)',
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06]"
                  style={{
                    color: 'var(--ws-muted)',
                    border: '1px solid var(--ws-border)',
                  }}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
