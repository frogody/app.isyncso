// ---------------------------------------------------------------------------
// PreviewCartPage.jsx -- B2B Wholesale "Order Review" full page.
// Two-column layout: line items list (left) + sticky order summary sidebar
// (right). Glass-morphism design, MOQ enforcement, bulk pricing indicators,
// PO number, delivery date, order notes, and payment terms display.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Package,
  ShoppingBag,
  AlertTriangle,
  TrendingDown,
  CalendarDays,
  FileText,
  CreditCard,
} from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  StatusBadge,
  QuantityInput,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  GlassTextarea,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VAT_RATE = 0.21;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBulkSavings(item) {
  // Compare resolved tier price vs base price
  const base = item.basePrice;
  const current = Number(item.price) || 0;
  if (base && current && current < base) {
    const pct = Math.round(((base - current) / base) * 100);
    return pct > 0 ? pct : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// OrderLineItem (internal)
// ---------------------------------------------------------------------------

function OrderLineItem({ item, index, onUpdateQuantity, onRemove }) {
  const { productId, name, sku, price, quantity, image, moq } = item;
  const unitPrice = Number(price) || 0;
  const lineTotal = unitPrice * quantity;
  const hasMoqViolation = moq && quantity < moq;
  const bulkSavings = getBulkSavings(item);

  return (
    <GlassCard
      variants={motionVariants.card}
      custom={index}
      accentBar
      hoverable={false}
      className="!rounded-xl"
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-4">
          {/* Product image */}
          <div
            className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
              border: '1px solid var(--ws-border)',
            }}
          >
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy" decoding="async"
              />
            ) : (
              <Package className="w-6 h-6" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
            )}
          </div>

          {/* Main details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-sm sm:text-base font-semibold truncate"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {name}
                </p>
                {sku && (
                  <p
                    className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider mt-0.5"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    SKU: {sku}
                  </p>
                )}
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--ws-muted)' }}>
                  {formatCurrency(unitPrice)} / unit
                </p>
              </div>

              {/* Line total + remove */}
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-sm sm:text-base font-bold tabular-nums"
                  style={{ color: 'var(--ws-text)' }}
                >
                  {formatCurrency(lineTotal)}
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(productId)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium transition-all duration-200 rounded-md px-1.5 py-0.5"
                  style={{ color: 'var(--ws-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--ws-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title="Remove from order"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>

            {/* Bottom row: quantity + badges */}
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <QuantityInput
                  value={quantity}
                  onChange={(val) => onUpdateQuantity(productId, val)}
                  min={1}
                  size="sm"
                />

                {/* Bulk pricing indicator */}
                {bulkSavings && (
                  <div
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                    style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      color: '#22c55e',
                    }}
                  >
                    <TrendingDown className="w-3 h-3" />
                    Saving {bulkSavings}% at this quantity
                  </div>
                )}
              </div>
            </div>

            {/* MOQ violation warning */}
            {hasMoqViolation && (
              <div
                className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg text-xs"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444',
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">
                  Minimum order: {moq} units
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// PreviewCartPage
// ---------------------------------------------------------------------------

export default function PreviewCartPage({ config, cart, nav }) {
  const {
    items = [],
    removeItem,
    updateQuantity,
    clearCart,
    subtotal: cartSubtotal,
    vat: cartVat,
    volumeDiscount: cartVolumeDiscount,
    total: cartTotal,
    itemCount = 0,
    poNumber: cartPoNumber,
    setPoNumber: cartSetPoNumber,
    moqViolations = [],
  } = cart || {};

  const { goToCatalog, goToCheckout, goToHome } = nav || {};

  // Local state for order details
  const [poNumber, setPoNumber] = useState(cartPoNumber || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Sync PO number to cart state if available
  const handlePoChange = useCallback((val) => {
    setPoNumber(val);
    cartSetPoNumber?.(val);
  }, [cartSetPoNumber]);

  // Computed totals
  const computedSubtotal = useMemo(() => {
    if (cartSubtotal != null) return cartSubtotal;
    return items.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1), 0);
  }, [cartSubtotal, items]);

  const volumeDiscount = cartVolumeDiscount || 0;
  const computedVat = cartVat != null ? cartVat : (computedSubtotal - volumeDiscount) * VAT_RATE;
  const computedTotal = cartTotal != null ? cartTotal : (computedSubtotal - volumeDiscount + computedVat);

  const hasMoqIssues = moqViolations.length > 0 || items.some((i) => i.moq && i.quantity < i.moq);

  // ----- Empty state -----
  if (!items || items.length === 0) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <EmptyState
          icon={ShoppingBag}
          title="Your order is empty"
          description="Browse our wholesale catalog to start building your order."
          action={
            <PrimaryButton onClick={goToCatalog}>
              Browse Catalog
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  // ----- Filled order -----
  return (
    <div
      className="w-full px-6 sm:px-10 lg:px-16 py-8"
      style={{ backgroundColor: 'var(--ws-bg)', minHeight: '100vh' }}
    >
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: goToHome, page: 'home' },
          { label: 'Order Review' },
        ]}
        onNavigate={(page) => {
          if (page === 'home') goToHome?.();
        }}
      />

      {/* Section header */}
      <SectionHeader
        title="Order Review"
        subtitle={`${itemCount} ${itemCount === 1 ? 'line item' : 'line items'} in your order`}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

        {/* Left column: Line items */}
        <div className="lg:col-span-2">
          <motion.div
            variants={motionVariants.container}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => (
                <OrderLineItem
                  key={item.productId}
                  item={item}
                  index={idx}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Continue browsing link (below items on desktop) */}
          <motion.div
            variants={motionVariants.fadeIn}
            initial="hidden"
            animate="visible"
            className="mt-6 hidden lg:block"
          >
            <SecondaryButton onClick={goToCatalog} size="sm">
              Continue Browsing
            </SecondaryButton>
          </motion.div>
        </div>

        {/* Right column: Sticky order summary */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <GlassCard accentBar hoverable={false}>
              <div className="p-5 space-y-5">

                {/* Title */}
                <h3
                  className="text-base font-semibold"
                  style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font, var(--ws-font))' }}
                >
                  Order Details
                </h3>

                {/* PO Number */}
                <div>
                  <label
                    className="flex items-center gap-1.5 text-xs font-medium mb-1.5"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PO Number
                    <span style={{ color: 'var(--ws-primary)' }}>*</span>
                  </label>
                  <GlassInput
                    value={poNumber}
                    onChange={(e) => handlePoChange(e.target.value)}
                    placeholder="Enter purchase order number"
                    className="!py-2.5 !text-xs"
                  />
                </div>

                {/* Requested delivery date */}
                <div>
                  <label
                    className="flex items-center gap-1.5 text-xs font-medium mb-1.5"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Requested Delivery Date
                  </label>
                  <GlassInput
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="!py-2.5 !text-xs"
                  />
                </div>

                {/* Order notes */}
                <div>
                  <label
                    className="flex items-center gap-1.5 text-xs font-medium mb-1.5"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    Order Notes
                  </label>
                  <GlassTextarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Special instructions, packaging requirements, etc."
                    rows={3}
                    className="!py-2.5 !text-xs"
                  />
                </div>

                {/* Payment terms */}
                <div className="flex items-center justify-between">
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--ws-muted)' }}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Payment Terms
                  </span>
                  <StatusBadge status="info" label="Net-30" size="xs" />
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--ws-border)' }} />

                {/* Price breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                      Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--ws-text)' }}>
                      {formatCurrency(computedSubtotal)}
                    </span>
                  </div>

                  {volumeDiscount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1" style={{ color: '#22c55e' }}>
                        <TrendingDown className="w-3 h-3" />
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

                  {/* Total divider */}
                  <div
                    className="!mt-3 !mb-1"
                    style={{ borderTop: '1px solid var(--ws-border)' }}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
                      Order Total
                    </span>
                    <span
                      className="text-xl font-bold tabular-nums"
                      style={gradientTextStyle()}
                    >
                      {formatCurrency(computedTotal)}
                    </span>
                  </div>
                </div>

                {/* MOQ warning */}
                {hasMoqIssues && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444',
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Resolve minimum order quantities to proceed</span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2.5 pt-1">
                  <PrimaryButton
                    onClick={goToCheckout}
                    className="w-full"
                    disabled={hasMoqIssues}
                  >
                    Review & Place Order
                  </PrimaryButton>
                  <SecondaryButton
                    onClick={goToCatalog}
                    className="w-full"
                    size="sm"
                  >
                    Continue Browsing
                  </SecondaryButton>
                </div>

              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
