import React, { useMemo, memo } from 'react';
import { ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const BTW_RATE = 0.21;

/**
 * Format a number as EUR currency.
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * CartSummary
 *
 * Order totals calculation sidebar for the B2B wholesale storefront.
 * Shows subtotal, estimated tax (21% BTW), total, item count, and
 * checkout / continue shopping actions.
 *
 * Props:
 *   items      - Array of cart items from useCart
 *   onCheckout - () => void  callback for the checkout button
 */
const CartSummary = memo(function CartSummary({ items = [], onCheckout }) {
  const { org } = useParams();
  const catalogPath = `/portal/${org}/shop/catalog`;
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (item.quantity || 0);
    }, 0);
  }, [items]);

  const estimatedTax = useMemo(() => subtotal * BTW_RATE, [subtotal]);
  const total = useMemo(() => subtotal + estimatedTax, [subtotal, estimatedTax]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [items]);

  const hasPreorderItems = useMemo(() => {
    return items.some((item) => item.preorder);
  }, [items]);

  // Empty state
  if (!items.length) {
    return (
      <div
        className="rounded-xl p-6 flex flex-col items-center text-center"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <ShoppingCart
            className="w-6 h-6"
            style={{ color: 'var(--ws-muted)', opacity: 0.5 }}
          />
        </div>
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: 'var(--ws-text)' }}
        >
          Your cart is empty
        </h3>
        <p
          className="text-xs mb-5"
          style={{ color: 'var(--ws-muted)' }}
        >
          Add products from the catalog to get started.
        </p>
        <Link
          to={catalogPath}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Catalog
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: 'var(--ws-border)' }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--ws-text)' }}
        >
          Order Summary
        </h3>
        <p
          className="text-xs mt-0.5"
          style={{ color: 'var(--ws-muted)' }}
        >
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Totals */}
      <div className="px-5 py-4 space-y-3">
        {/* Subtotal */}
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

        {/* Estimated tax */}
        <div className="flex items-center justify-between">
          <span
            className="text-sm"
            style={{ color: 'var(--ws-muted)' }}
          >
            Estimated Tax (21% BTW)
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--ws-text)' }}
          >
            {formatCurrency(estimatedTax)}
          </span>
        </div>

        {/* Divider */}
        <div
          className="border-t pt-3"
          style={{ borderColor: 'var(--ws-border)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--ws-text)' }}
            >
              Total
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--ws-primary)' }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Pre-order notice */}
      {hasPreorderItems && (
        <div
          className="mx-5 mb-4 px-3 py-2.5 rounded-lg text-xs"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
        >
          Your cart contains pre-order items. These will ship when available.
        </div>
      )}

      {/* Actions */}
      <div
        className="px-5 py-4 border-t space-y-3"
        style={{ borderColor: 'var(--ws-border)' }}
      >
        {/* Checkout button */}
        <button
          type="button"
          onClick={onCheckout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Proceed to Checkout
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Continue shopping link */}
        <Link
          to={catalogPath}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
});

export default CartSummary;
