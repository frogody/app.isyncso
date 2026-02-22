// ---------------------------------------------------------------------------
// PreviewCartPage.jsx -- Full shopping cart page for the store builder preview.
// Renders inside an iframe. Uses CSS custom properties for theming.
// No router, no auth, no Supabase -- purely presentational with callback nav.
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Package,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value) {
  return `\u20AC${Number(value || 0).toFixed(2)}`;
}

const VAT_RATE = 0.21;

// ---------------------------------------------------------------------------
// CartItemRow
// ---------------------------------------------------------------------------

function CartItemRow({ item, onUpdateQuantity, onRemove }) {
  const unitPrice = Number(item.price) || 0;
  const lineTotal = unitPrice * item.quantity;

  return (
    <div
      className="flex items-center gap-4 p-4"
      style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
    >
      {/* Image */}
      <div
        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Package className="w-6 h-6" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
        )}
      </div>

      {/* Name + SKU */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--ws-text)' }}
        >
          {item.name}
        </p>
        {item.sku && (
          <p
            className="text-[11px] font-medium uppercase tracking-wider mt-0.5"
            style={{ color: 'var(--ws-muted)' }}
          >
            {item.sku}
          </p>
        )}
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
          disabled={item.quantity <= 1}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-30"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: 'var(--ws-text)',
            border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
          }}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span
          className="w-8 text-center text-sm font-semibold tabular-nums"
          style={{ color: 'var(--ws-text)' }}
        >
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: 'var(--ws-text)',
            border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Prices */}
      <div className="flex-shrink-0 text-right min-w-[6rem]">
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--ws-text)' }}
        >
          {formatPrice(lineTotal)}
        </p>
        {item.quantity > 1 && (
          <p
            className="text-[11px] mt-0.5"
            style={{ color: 'var(--ws-muted)' }}
          >
            {formatPrice(unitPrice)} each
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(item.productId)}
        className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-red-500/10"
        style={{ color: 'var(--ws-muted)' }}
        title="Remove item"
      >
        <Trash2 className="w-4 h-4 hover:text-red-400 transition-colors" style={{ color: 'inherit' }} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClearCartConfirmation
// ---------------------------------------------------------------------------

function ClearCartConfirmation({ onConfirm, onCancel }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span style={{ color: 'var(--ws-muted)' }}>Are you sure?</span>
      <button
        type="button"
        onClick={onConfirm}
        className="px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
        }}
      >
        Yes, Clear
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          color: 'var(--ws-muted)',
        }}
      >
        Cancel
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// PreviewCartPage
// ---------------------------------------------------------------------------

export default function PreviewCartPage({ config, cart, nav }) {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = cart;
  const { goToCatalog, goToCheckout, goToHome } = nav;

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearCart = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const executeClear = useCallback(() => {
    clearCart();
    setShowClearConfirm(false);
  }, [clearCart]);

  const cancelClear = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  if (!items || items.length === 0) {
    return (
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <ShoppingCart
            className="w-9 h-9"
            style={{ color: 'var(--ws-muted)', opacity: 0.5 }}
          />
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          Your cart is empty
        </h2>
        <p
          className="text-sm mb-6 max-w-sm"
          style={{ color: 'var(--ws-muted)' }}
        >
          Browse our catalog to find products
        </p>
        <button
          type="button"
          onClick={goToCatalog}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          Browse Products
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Computed totals
  // -----------------------------------------------------------------------
  const subtotal = total;
  const vat = subtotal * VAT_RATE;
  const grandTotal = subtotal + vat;

  // -----------------------------------------------------------------------
  // Filled cart
  // -----------------------------------------------------------------------
  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            Shopping Cart
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--ws-muted)' }}
          >
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {/* Clear cart / confirmation */}
        <div className="flex items-center gap-2">
          {showClearConfirm ? (
            <ClearCartConfirmation onConfirm={executeClear} onCancel={cancelClear} />
          ) : (
            <button
              type="button"
              onClick={handleClearCart}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
              style={{ color: '#f87171' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cart items (2 cols) */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            {items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>

        {/* Right: Order summary (1 col, sticky) */}
        <div className="lg:col-span-1">
          <div
            className="rounded-xl p-5 sticky top-6"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <h2
              className="text-base font-semibold mb-4"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Order Summary
            </h2>

            {/* Subtotal */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                Subtotal
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                {formatPrice(subtotal)}
              </span>
            </div>

            {/* VAT */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                VAT (21%)
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                {formatPrice(vat)}
              </span>
            </div>

            {/* Divider */}
            <div
              className="my-3"
              style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
            />

            {/* Total */}
            <div className="flex items-center justify-between mb-5">
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
                {formatPrice(grandTotal)}
              </span>
            </div>

            {/* Proceed to Checkout */}
            <button
              type="button"
              onClick={goToCheckout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--ws-primary)',
                color: 'var(--ws-bg, #000)',
              }}
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Continue Shopping */}
            <button
              type="button"
              onClick={goToCatalog}
              className="w-full mt-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--ws-muted)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
