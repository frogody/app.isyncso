import React, { useEffect, useCallback } from 'react';
import { X, Minus, Plus, Trash2, ShoppingCart, Package } from 'lucide-react';

/**
 * PreviewCartDrawer
 *
 * Slide-in cart drawer rendered inside the store builder preview iframe.
 * Uses CSS custom properties (--ws-*) for theme consistency and pure CSS
 * transitions instead of Framer Motion to keep the preview bundle lean.
 *
 * Props:
 *   isOpen  - boolean  Whether the drawer is visible
 *   onClose - () => void  Callback to close the drawer
 *   cart    - object from usePreviewCart: { items, removeItem, updateQuantity, total, itemCount }
 *   nav     - object from usePreviewNavigation: { goToCart, goToCheckout, goToCatalog }
 */
export default function PreviewCartDrawer({ isOpen, onClose, cart, nav }) {
  const { items = [], removeItem, updateQuantity, total = 0, itemCount = 0 } = cart || {};

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleViewCart = useCallback(() => {
    nav?.goToCart?.();
    onClose();
  }, [nav, onClose]);

  const handleCheckout = useCallback(() => {
    nav?.goToCheckout?.();
    onClose();
  }, [nav, onClose]);

  const handleBrowse = useCallback(() => {
    nav?.goToCatalog?.();
    onClose();
  }, [nav, onClose]);

  const formatPrice = (value) => {
    const num = Number(value) || 0;
    return `\u20AC${num.toFixed(2)}`;
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-[380px] max-w-full flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          backgroundColor: 'var(--ws-surface, #18181b)',
          borderLeft: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
        >
          <div className="flex items-center gap-2.5">
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--ws-text, #fff)' }}
            >
              Shopping Cart
            </h2>
            {itemCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: 'var(--ws-primary, #06b6d4)',
                  color: 'var(--ws-bg, #000)',
                }}
              >
                {itemCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart content */}
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
            >
              <ShoppingCart
                className="w-7 h-7"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))', opacity: 0.6 }}
              />
            </div>
            <h3
              className="text-sm font-semibold mb-1"
              style={{ color: 'var(--ws-text, #fff)' }}
            >
              Your cart is empty
            </h3>
            <p
              className="text-xs mb-5"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
            >
              Browse our catalog to find products.
            </p>
            <button
              type="button"
              onClick={handleBrowse}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--ws-primary, #06b6d4)',
                color: 'var(--ws-bg, #000)',
              }}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable items list */}
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y" style={{ borderColor: 'var(--ws-border, rgba(255,255,255,0.06))' }}>
                {items.map((item) => (
                  <CartItemRow
                    key={item.productId}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                    formatPrice={formatPrice}
                  />
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div
              className="flex-shrink-0 px-5 py-4 space-y-3"
              style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
            >
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.6))' }}
                >
                  Subtotal
                </span>
                <span
                  className="text-base font-bold"
                  style={{ color: 'var(--ws-text, #fff)' }}
                >
                  {formatPrice(total)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleViewCart}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-white/[0.06]"
                  style={{
                    border: '1px solid var(--ws-border, rgba(255,255,255,0.15))',
                    color: 'var(--ws-text, #fff)',
                  }}
                >
                  View Cart
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--ws-primary, #06b6d4)',
                    color: 'var(--ws-bg, #000)',
                  }}
                >
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// CartItemRow (internal)
// ---------------------------------------------------------------------------

function CartItemRow({ item, onUpdateQuantity, onRemove, formatPrice }) {
  const { productId, name, sku, price, quantity, image } = item;
  const lineTotal = (Number(price) || 0) * (quantity || 1);

  return (
    <li className="flex gap-3 px-5 py-4">
      {/* Image / fallback */}
      <div
        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package
            className="w-5 h-5"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.3))' }}
          />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--ws-text, #fff)' }}
            >
              {name}
            </p>
            {sku && (
              <p
                className="text-[11px] mt-0.5 truncate"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
              >
                SKU: {sku}
              </p>
            )}
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
            >
              {formatPrice(price)}
            </p>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(productId)}
            className="p-1 rounded transition-colors hover:bg-white/[0.06] flex-shrink-0"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
            aria-label={`Remove ${name} from cart`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quantity controls + line total */}
        <div className="flex items-center justify-between mt-2.5">
          <div
            className="inline-flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--ws-border, rgba(255,255,255,0.1))' }}
          >
            <button
              type="button"
              onClick={() => onUpdateQuantity(productId, quantity - 1)}
              className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span
              className="w-8 h-7 flex items-center justify-center text-xs font-semibold"
              style={{
                color: 'var(--ws-text, #fff)',
                borderLeft: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
                borderRight: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
              }}
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(productId, quantity + 1)}
              className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--ws-text, #fff)' }}
          >
            {formatPrice(lineTotal)}
          </span>
        </div>
      </div>
    </li>
  );
}
