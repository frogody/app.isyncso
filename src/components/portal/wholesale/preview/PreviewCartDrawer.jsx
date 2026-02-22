// ---------------------------------------------------------------------------
// PreviewCartDrawer.jsx -- B2B Wholesale "Order Summary" slide-in drawer.
// Glass-morphism panel with gradient accents, MOQ enforcement, volume discount
// display, and quick PO number entry. Uses the shared preview design system.
// ---------------------------------------------------------------------------

import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, Package, ShoppingBag, AlertTriangle } from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  StatusBadge,
  QuantityInput,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const panelVariants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: { type: 'spring', stiffness: 320, damping: 32 },
  },
  exit: {
    x: '100%',
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// OrderItemRow (internal)
// ---------------------------------------------------------------------------

function OrderItemRow({ item, index, onUpdateQuantity, onRemove, moqViolations }) {
  const { productId, name, sku, price, quantity, image, moq } = item;
  const unitPrice = Number(price) || 0;
  const lineTotal = unitPrice * quantity;
  const hasMoqViolation = moqViolations?.includes?.(productId) || (moq && quantity < moq);

  return (
    <motion.li
      variants={itemVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="relative px-4 py-3.5"
      style={{
        borderLeft: '2px solid',
        borderImage: 'linear-gradient(180deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 30%, transparent)) 1',
      }}
    >
      {/* Glass row background */}
      <div
        className="absolute inset-0 rounded-r-xl"
        style={{
          background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
        }}
      />

      <div className="relative flex gap-3">
        {/* Product image */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
            border: '1px solid var(--ws-border)',
          }}
        >
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-5 h-5" style={{ color: 'var(--ws-muted)', opacity: 0.5 }} />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className="text-sm font-medium truncate leading-tight"
                style={{ color: 'var(--ws-text)' }}
              >
                {name}
              </p>
              {sku && (
                <p
                  className="text-[10px] font-medium uppercase tracking-wider mt-0.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  SKU: {sku}
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                {formatCurrency(unitPrice)} / unit
              </p>
            </div>

            {/* Remove */}
            <button
              type="button"
              onClick={() => onRemove(productId)}
              className="flex-shrink-0 p-1 rounded-lg transition-all duration-200"
              style={{ color: 'var(--ws-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--ws-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label={`Remove ${name} from order`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MOQ warning */}
          {hasMoqViolation && (
            <div className="mt-1.5">
              <StatusBadge
                status="error"
                label={`Min. order: ${moq || '?'} units`}
                size="xs"
              />
            </div>
          )}

          {/* Quantity + line total */}
          <div className="flex items-center justify-between mt-2">
            <QuantityInput
              value={quantity}
              onChange={(val) => onUpdateQuantity(productId, val)}
              min={1}
              size="sm"
            />
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: 'var(--ws-text)' }}
            >
              {formatCurrency(lineTotal)}
            </span>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

// ---------------------------------------------------------------------------
// PreviewCartDrawer
// ---------------------------------------------------------------------------

export default function PreviewCartDrawer({ isOpen, onClose, cart, nav }) {
  const {
    items = [],
    removeItem,
    updateQuantity,
    subtotal = 0,
    vat = 0,
    volumeDiscount = 0,
    total = 0,
    itemCount = 0,
    poNumber = '',
    setPoNumber,
    moqViolations = [],
  } = cart || {};

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );

  const handleViewOrder = useCallback(() => {
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

  // Computed
  const computedSubtotal = subtotal || items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1), 0);
  const computedVat = vat || computedSubtotal * 0.21;
  const computedTotal = total || (computedSubtotal - volumeDiscount + computedVat);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[998]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            key="cart-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 z-[999] h-full w-[400px] max-w-[90vw] flex flex-col"
            style={{
              ...glassCardStyle,
              borderRadius: 0,
              borderLeft: '1px solid var(--ws-border)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Order Summary"
          >
            {/* Gradient accent bar at top */}
            <div style={gradientAccentBar} />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--ws-border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--ws-primary) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
                  }}
                >
                  <ShoppingBag className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
                </div>
                <div>
                  <h2
                    className="text-base font-semibold leading-tight"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    Order Summary
                  </h2>
                  {itemCount > 0 && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                      {itemCount} {itemCount === 1 ? 'line item' : 'line items'}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl transition-all duration-200"
                style={{
                  color: 'var(--ws-muted)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ws-border)';
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-surface) 80%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.background = 'transparent';
                }}
                aria-label="Close order summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={ShoppingBag}
                  title="Your order is empty"
                  description="Browse our wholesale catalog to add products to your order."
                  action={
                    <PrimaryButton onClick={handleBrowse} size="sm">
                      Continue Browsing
                    </PrimaryButton>
                  }
                />
              </div>
            ) : (
              <>
                {/* Scrollable items */}
                <ul className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
                  <AnimatePresence mode="popLayout">
                    {items.map((item, idx) => (
                      <OrderItemRow
                        key={item.productId}
                        item={item}
                        index={idx}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeItem}
                        moqViolations={moqViolations}
                      />
                    ))}
                  </AnimatePresence>
                </ul>

                {/* Footer */}
                <div
                  className="flex-shrink-0 px-5 py-4 space-y-3"
                  style={{ borderTop: '1px solid var(--ws-border)' }}
                >
                  {/* Quick PO Number */}
                  {setPoNumber && (
                    <GlassInput
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="PO Number"
                      className="!py-2.5 !text-xs"
                    />
                  )}

                  {/* Price breakdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                        Subtotal
                      </span>
                      <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--ws-text)' }}>
                        {formatCurrency(computedSubtotal)}
                      </span>
                    </div>

                    {volumeDiscount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1" style={{ color: '#22c55e' }}>
                          Volume Discount
                        </span>
                        <span className="text-sm font-medium tabular-nums" style={{ color: '#22c55e' }}>
                          -{formatCurrency(volumeDiscount)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                        VAT 21%
                      </span>
                      <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--ws-text)' }}>
                        {formatCurrency(computedVat)}
                      </span>
                    </div>

                    {/* Divider */}
                    <div
                      className="!mt-2.5 !mb-2"
                      style={{ borderTop: '1px solid var(--ws-border)' }}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                        Order Total
                      </span>
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={gradientTextStyle()}
                      >
                        {formatCurrency(computedTotal)}
                      </span>
                    </div>
                  </div>

                  {/* MOQ violations warning */}
                  {moqViolations.length > 0 && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444',
                      }}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {moqViolations.length} {moqViolations.length === 1 ? 'item does' : 'items do'} not meet minimum order quantity
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    <PrimaryButton
                      onClick={handleCheckout}
                      className="w-full"
                      size="md"
                      disabled={moqViolations.length > 0}
                    >
                      Review & Place Order
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={handleViewOrder}
                      className="w-full"
                      size="sm"
                    >
                      View Full Order
                    </SecondaryButton>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
