import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import OrderStatusBadge from './OrderStatusBadge';

const PAGE_SIZE = 10;

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

/**
 * OrderHistoryPage
 *
 * Displays a paginated list of past B2B orders for the current client/org.
 * Supports status filtering. Each row navigates to the order detail page.
 */
export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { org } = useParams();
  const { orgId } = useWholesale();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch orders from Supabase
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
    return '--';
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ color: 'var(--ws-text)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
              className="hidden sm:grid grid-cols-[1fr_120px_110px_80px_100px_80px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
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
              <span />
            </div>

            {/* Order rows */}
            {orders.map((order) => (
              <div
                key={order.id}
                className="sm:grid sm:grid-cols-[1fr_120px_110px_80px_100px_80px] gap-4 px-5 py-4 items-center transition-colors cursor-pointer hover:bg-white/[0.03]"
                style={{
                  borderBottom: '1px solid var(--ws-border)',
                }}
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
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
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

                {/* View action */}
                <div className="hidden sm:flex justify-end">
                  <ArrowRight
                    className="w-4 h-4"
                    style={{ color: 'var(--ws-muted)' }}
                  />
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

                {/* Order Progress Bar */}
                <div className="col-span-full px-0 pt-1 pb-0.5">
                  <OrderProgressBar status={order.status} />
                </div>
              </div>
            ))}
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
