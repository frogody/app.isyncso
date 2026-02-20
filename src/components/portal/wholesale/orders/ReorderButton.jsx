import React, { useState, useCallback } from 'react';
import { ShoppingCart, Loader2, Check } from 'lucide-react';

/**
 * ReorderButton
 *
 * One-click re-order button that adds all items from a previous order
 * back into the cart via the provided callback.
 *
 * Props:
 *   orderItems - Array of order line items. Each should have at minimum:
 *                { product_id, name, sku, price, quantity, image? }
 *   onReorder  - async (items) => void  Callback to add items to cart.
 *   className  - Optional additional CSS classes.
 */
export default function ReorderButton({ orderItems, onReorder, className = '' }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = useCallback(async () => {
    if (!orderItems?.length || loading || done) return;

    setLoading(true);
    try {
      await onReorder(orderItems);
      setDone(true);
      // Reset success state after a brief pause
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      console.error('[ReorderButton] Reorder failed:', err);
    } finally {
      setLoading(false);
    }
  }, [orderItems, onReorder, loading, done]);

  const disabled = loading || !orderItems?.length;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        backgroundColor: done
          ? 'rgba(34, 197, 94, 0.15)'
          : 'var(--ws-primary, #06b6d4)',
        color: done
          ? '#4ade80'
          : 'var(--ws-bg, #000)',
        border: done
          ? '1px solid rgba(34, 197, 94, 0.3)'
          : '1px solid transparent',
      }}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : done ? (
        <Check className="w-4 h-4" />
      ) : (
        <ShoppingCart className="w-4 h-4" />
      )}
      {loading ? 'Adding...' : done ? 'Added to Cart' : 'Reorder'}
    </button>
  );
}
