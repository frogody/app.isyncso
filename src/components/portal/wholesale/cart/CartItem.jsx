import React, { useCallback, memo } from 'react';
import { Minus, Plus, Trash2, AlertTriangle, Clock } from 'lucide-react';

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
 * CartItem
 *
 * Single cart line item component for the B2B wholesale storefront.
 * Displays product image, name, SKU, quantity controls, pricing,
 * pre-order badge, and stock warnings.
 *
 * Props:
 *   item             - Cart item object from useCart
 *   onUpdateQuantity - (productId, newQty) => void
 *   onRemove         - (productId) => void
 */
const CartItem = memo(function CartItem({ item, onUpdateQuantity, onRemove }) {
  const lineTotal = item.price * item.quantity;
  const isOutOfStock = item.stockStatus === 'out_of_stock';

  const handleDecrement = useCallback(() => {
    if (item.quantity <= 1) return;
    onUpdateQuantity(item.productId, item.quantity - 1);
  }, [item.productId, item.quantity, onUpdateQuantity]);

  const handleIncrement = useCallback(() => {
    onUpdateQuantity(item.productId, item.quantity + 1);
  }, [item.productId, item.quantity, onUpdateQuantity]);

  const handleInputChange = useCallback(
    (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        onUpdateQuantity(item.productId, val);
      }
    },
    [item.productId, onUpdateQuantity],
  );

  const handleRemove = useCallback(() => {
    onRemove(item.productId);
  }, [item.productId, onRemove]);

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl transition-colors"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      {/* Product image */}
      <div
        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: 'var(--ws-muted)', opacity: 0.3 }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4
              className="text-sm font-semibold leading-snug truncate"
              style={{ color: 'var(--ws-text)' }}
            >
              {item.name}
            </h4>
            {item.sku && (
              <p
                className="text-[11px] font-medium uppercase tracking-wider mt-0.5"
                style={{ color: 'var(--ws-muted)' }}
              >
                SKU: {item.sku}
              </p>
            )}
          </div>

          {/* Line total */}
          <span
            className="text-sm font-bold flex-shrink-0"
            style={{ color: 'var(--ws-text)' }}
          >
            {formatCurrency(lineTotal)}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {/* Pre-order badge */}
          {item.preorder && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <Clock className="w-3 h-3" />
              Pre-order
            </span>
          )}

          {/* Out of stock warning */}
          {isOutOfStock && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <AlertTriangle className="w-3 h-3" />
              Out of Stock
            </span>
          )}

          {/* Unit price */}
          <span
            className="text-[11px] font-medium"
            style={{ color: 'var(--ws-muted)' }}
          >
            {formatCurrency(item.price)} each
          </span>
        </div>

        {/* Quantity controls + remove */}
        <div className="flex items-center justify-between mt-3">
          <div
            className="inline-flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--ws-border)' }}
          >
            <button
              type="button"
              onClick={handleDecrement}
              disabled={item.quantity <= 1}
              className="flex items-center justify-center w-8 h-8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted)' }}
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={handleInputChange}
              className="w-12 h-8 text-center text-sm font-medium bg-transparent outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{
                color: 'var(--ws-text)',
                borderLeft: '1px solid var(--ws-border)',
                borderRight: '1px solid var(--ws-border)',
              }}
              aria-label="Quantity"
            />

            <button
              type="button"
              onClick={handleIncrement}
              className="flex items-center justify-center w-8 h-8 transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted)' }}
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
            style={{ color: '#f87171' }}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default CartItem;
