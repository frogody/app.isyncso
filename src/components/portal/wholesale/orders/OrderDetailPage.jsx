import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  Loader2,
  AlertCircle,
  Check,
  Truck,
  ClipboardList,
  CircleDot,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import OrderStatusBadge from './OrderStatusBadge';
import ReorderButton from './ReorderButton';

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
 * Format a date string into a human-readable format.
 */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Status Timeline
// ---------------------------------------------------------------------------

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Ordered', icon: ClipboardList },
  { key: 'confirmed', label: 'Confirmed', icon: CircleDot },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Check },
];

function StatusTimeline({ status }) {
  const normalised = (status || '').toLowerCase().trim();

  // For cancelled orders, show only a cancelled indicator
  if (normalised === 'cancelled') {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
        <span className="text-sm font-medium" style={{ color: '#f87171' }}>
          This order has been cancelled
        </span>
      </div>
    );
  }

  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === normalised);

  return (
    <div className="flex items-center w-full overflow-x-auto">
      {TIMELINE_STEPS.map((step, idx) => {
        const completed = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.icon;

        return (
          <div
            key={step.key}
            className="flex items-center flex-1 min-w-0"
          >
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isCurrent ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: completed
                    ? 'var(--ws-primary, #06b6d4)'
                    : 'var(--ws-surface, #18181b)',
                  color: completed
                    ? 'var(--ws-bg, #000)'
                    : 'var(--ws-muted, rgba(255,255,255,0.3))',
                  border: completed
                    ? 'none'
                    : '1px solid var(--ws-border)',
                  ringColor: isCurrent ? 'var(--ws-primary, #06b6d4)' : 'transparent',
                  '--tw-ring-color': isCurrent
                    ? 'rgba(6, 182, 212, 0.3)'
                    : 'transparent',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{
                  color: completed
                    ? 'var(--ws-text)'
                    : 'var(--ws-muted, rgba(255,255,255,0.3))',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {idx < TIMELINE_STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2"
                style={{
                  backgroundColor:
                    idx < currentIdx
                      ? 'var(--ws-primary, #06b6d4)'
                      : 'var(--ws-border, rgba(255,255,255,0.08))',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderDetailPage
// ---------------------------------------------------------------------------

/**
 * OrderDetailPage
 *
 * Displays full detail for a single B2B order including line items,
 * order totals, shipping address, status timeline, and a reorder button.
 */
export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { org, orderId } = useParams();
  const { orgId, addToCart } = useWholesale();

  const [order, setOrder] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch order with line items
  useEffect(() => {
    if (!orderId || !orgId) return;

    let cancelled = false;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('b2b_orders')
          .select('*')
          .eq('id', orderId)
          .eq('organization_id', orgId)
          .single();

        if (cancelled) return;

        if (orderError) {
          setError(orderError.message || 'Failed to load order');
          setLoading(false);
          return;
        }

        setOrder(orderData);

        // Fetch line items with product data
        const { data: itemsData, error: itemsError } = await supabase
          .from('b2b_order_items')
          .select('*, products(*)')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (cancelled) return;

        if (itemsError) {
          console.error('[OrderDetailPage] Items fetch error:', itemsError);
          // If the items table doesn't exist or no items, try inline items from order
          setLineItems(orderData.items || []);
        } else {
          setLineItems(itemsData || []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[OrderDetailPage] Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, orgId]);

  // Handle reorder -- add all items back to cart
  const handleReorder = useCallback(
    async (items) => {
      for (const item of items) {
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
      }
    },
    [addToCart],
  );

  const handleBack = useCallback(() => {
    navigate(`/portal/${org}/shop/orders`);
  }, [navigate, org]);

  // Compute order totals
  const subtotal =
    order?.subtotal ??
    lineItems.reduce(
      (sum, item) =>
        sum + (item.unit_price || item.price || 0) * (item.quantity || 0),
      0,
    );
  const tax = order?.tax ?? 0;
  const total = order?.total ?? subtotal + tax;

  // Shipping address
  const shippingAddress = order?.shipping_address;

  if (loading) {
    return (
      <div
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]"
      >
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: 'var(--ws-primary, #06b6d4)' }}
        />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ color: 'var(--ws-text)' }}
      >
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-80"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle
            className="w-10 h-10 mb-4"
            style={{ color: '#f87171' }}
          />
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--ws-text)' }}
          >
            Order not found
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--ws-muted)' }}
          >
            {error || 'This order could not be loaded.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ color: 'var(--ws-text)' }}
    >
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-80"
        style={{ color: 'var(--ws-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--ws-text)' }}
            >
              {order.order_number || `Order #${order.id?.slice(0, 8)}`}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--ws-muted)' }}
          >
            Placed on {formatDate(order.created_at)}
          </p>
        </div>

        <ReorderButton
          orderItems={lineItems}
          onReorder={handleReorder}
        />
      </div>

      {/* Status timeline */}
      <div
        className="rounded-xl p-5 mb-8"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <StatusTimeline status={order.status} />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line items -- spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <div
              className="px-5 py-3"
              style={{ borderBottom: '1px solid var(--ws-border)' }}
            >
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--ws-text)' }}
              >
                Order Items ({lineItems.length})
              </h2>
            </div>

            {/* Table header (desktop) */}
            <div
              className="hidden sm:grid grid-cols-[48px_1fr_80px_90px_100px] gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: 'var(--ws-muted)',
                borderBottom: '1px solid var(--ws-border)',
              }}
            >
              <span />
              <span>Product</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>

            {/* Line items */}
            {lineItems.map((item, idx) => {
              const product = item.products || item;
              const name = product.name || item.name || 'Unknown Product';
              const sku = product.sku || item.sku || '';
              const unitPrice = item.unit_price || item.price || product.price || 0;
              const qty = item.quantity || 0;
              const lineTotal = unitPrice * qty;
              const image =
                product.featured_image ||
                item.image ||
                product.image ||
                null;

              return (
                <div
                  key={item.id || idx}
                  className="sm:grid sm:grid-cols-[48px_1fr_80px_90px_100px] gap-3 px-5 py-3.5 items-center"
                  style={{
                    borderBottom:
                      idx < lineItems.length - 1
                        ? '1px solid var(--ws-border)'
                        : 'none',
                  }}
                >
                  {/* Image */}
                  <div
                    className="hidden sm:flex w-10 h-10 rounded-lg overflow-hidden items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--ws-bg)' }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package
                        className="w-4 h-4"
                        style={{ color: 'var(--ws-muted)', opacity: 0.3 }}
                      />
                    )}
                  </div>

                  {/* Name + SKU */}
                  <div className="min-w-0 mb-1 sm:mb-0">
                    <span
                      className="text-sm font-medium block truncate"
                      style={{ color: 'var(--ws-text)' }}
                    >
                      {name}
                    </span>
                    {sku && (
                      <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--ws-muted)' }}
                      >
                        SKU: {sku}
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  <span
                    className="text-sm text-center hidden sm:block"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    {qty}
                  </span>

                  {/* Unit price */}
                  <span
                    className="text-sm text-right hidden sm:block"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    {formatCurrency(unitPrice)}
                  </span>

                  {/* Line total */}
                  <span
                    className="text-sm font-semibold text-right hidden sm:block"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    {formatCurrency(lineTotal)}
                  </span>

                  {/* Mobile row */}
                  <div className="flex items-center justify-between sm:hidden">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--ws-muted)' }}
                    >
                      {qty} x {formatCurrency(unitPrice)}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--ws-text)' }}
                    >
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              );
            })}

            {lineItems.length === 0 && (
              <div
                className="px-5 py-10 text-center text-sm"
                style={{ color: 'var(--ws-muted)' }}
              >
                No items in this order.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Order summary + Shipping */}
        <div className="space-y-6">
          {/* Order totals */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: 'var(--ws-text)' }}
            >
              Order Summary
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Subtotal
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {tax > 0 && (
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    Tax
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    {formatCurrency(tax)}
                  </span>
                </div>
              )}

              <div
                className="flex items-center justify-between pt-3 mt-1"
                style={{ borderTop: '1px solid var(--ws-border)' }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ws-text)' }}
                >
                  Total
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: 'var(--ws-primary, #06b6d4)' }}
                >
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          {shippingAddress && (
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: '1px solid var(--ws-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <MapPin
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'var(--ws-primary, #06b6d4)' }}
                />
                <h3
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ws-text)' }}
                >
                  Shipping Address
                </h3>
              </div>

              <div
                className="text-sm space-y-0.5 leading-relaxed"
                style={{ color: 'var(--ws-muted)' }}
              >
                {typeof shippingAddress === 'string' ? (
                  <p>{shippingAddress}</p>
                ) : (
                  <>
                    {shippingAddress.name && <p style={{ color: 'var(--ws-text)' }}>{shippingAddress.name}</p>}
                    {shippingAddress.line1 && <p>{shippingAddress.line1}</p>}
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    {(shippingAddress.city || shippingAddress.postal_code) && (
                      <p>
                        {[shippingAddress.postal_code, shippingAddress.city]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                    )}
                    {shippingAddress.country && <p>{shippingAddress.country}</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
