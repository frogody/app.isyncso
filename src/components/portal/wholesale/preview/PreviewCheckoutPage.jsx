// ---------------------------------------------------------------------------
// PreviewCheckoutPage.jsx -- Premium B2B wholesale "Place Order" flow.
// 3-step process: Delivery Details -> Order Review -> Confirmation.
// Creates REAL orders via createB2BOrder / createB2BOrderItems when
// a client is authenticated. In preview mode (no client), order placement
// is disabled with a sign-in prompt.
// Uses CSS custom properties (--ws-*) for theming + design system components.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  ArrowLeft,
  Package,
  MapPin,
  FileText,
  Download,
  Phone,
  Mail,
  User,
  Calendar,
  Building2,
  Clock,
  AlertTriangle,
  ShoppingCart,
  LogIn,
  Loader2,
} from 'lucide-react';
import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  StatusBadge,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  GlassTextarea,
  GlassSelect,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';
import { useWholesale } from '../WholesaleProvider';
import { createB2BOrder, createB2BOrderItems } from '@/lib/db/queries/b2b';
import { processOrderPlaced } from '@/lib/b2b/processB2BOrder';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Delivery Details', 'Order Review', 'Confirmation'];

// ---------------------------------------------------------------------------
// StepIndicator -- Glass-morphism 3-step progress bar
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }) {
  return (
    <motion.div
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      className="rounded-2xl px-6 py-5 mb-8"
      style={{
        ...glassCardStyle,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center justify-center">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <React.Fragment key={stepNum}>
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className="flex-1 max-w-[80px] h-[2px] mx-2 sm:mx-3 rounded-full transition-colors duration-500"
                  style={{
                    background: isCompleted
                      ? 'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 60%, #7c3aed))'
                      : 'var(--ws-border)',
                  }}
                />
              )}

              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-400"
                  style={{
                    background:
                      isActive || isCompleted
                        ? 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 70%, #7c3aed))'
                        : 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                    color:
                      isActive || isCompleted ? '#fff' : 'var(--ws-muted)',
                    border:
                      isActive || isCompleted
                        ? 'none'
                        : '1px solid var(--ws-border)',
                    boxShadow:
                      isActive
                        ? '0 4px 16px color-mix(in srgb, var(--ws-primary) 30%, transparent)'
                        : 'none',
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  ) : (
                    stepNum
                  )}
                </motion.div>
                <span
                  className="text-[11px] sm:text-xs font-semibold whitespace-nowrap tracking-wide"
                  style={{
                    color: isActive
                      ? 'var(--ws-text)'
                      : isCompleted
                      ? 'var(--ws-primary)'
                      : 'var(--ws-muted)',
                  }}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// GlassInfoBar -- Read-only info display row
// ---------------------------------------------------------------------------

function GlassInfoBar({ icon: Icon, children, className = '' }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm ${className}`}
      style={{
        background:
          'color-mix(in srgb, var(--ws-primary) 6%, transparent)',
        border:
          '1px solid color-mix(in srgb, var(--ws-primary) 15%, transparent)',
      }}
    >
      {Icon && (
        <Icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: 'var(--ws-primary)' }}
        />
      )}
      <div style={{ color: 'var(--ws-text)' }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormLabel
// ---------------------------------------------------------------------------

function FormLabel({ htmlFor, required, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
      style={{ color: 'var(--ws-muted)' }}
    >
      {children}
      {required && (
        <span style={{ color: '#ef4444' }}> *</span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Helper: format address JSONB into string
// ---------------------------------------------------------------------------

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  return [addr.street, addr.city, addr.zip, addr.state, addr.country]
    .filter(Boolean)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Step 1 -- Delivery Details
// ---------------------------------------------------------------------------

function DeliveryDetailsStep({
  client,
  deliveryAddress,
  setDeliveryAddress,
  poNumber,
  setPoNumber,
  deliveryDate,
  setDeliveryDate,
  contactPerson,
  setContactPerson,
  specialInstructions,
  setSpecialInstructions,
  onContinue,
  onBack,
}) {
  const canContinue = poNumber?.trim()?.length > 0;

  // Build saved addresses from client data
  const savedAddresses = [];
  if (client?.shipping_address && Object.keys(client.shipping_address).length > 0) {
    savedAddresses.push({
      id: 'shipping',
      label: 'Shipping Address',
      full: formatAddress(client.shipping_address) || 'Shipping address on file',
    });
  }
  if (client?.billing_address && Object.keys(client.billing_address).length > 0) {
    savedAddresses.push({
      id: 'billing',
      label: 'Billing Address',
      full: formatAddress(client.billing_address) || 'Billing address on file',
    });
  }
  if (savedAddresses.length === 0) {
    savedAddresses.push({
      id: 'default',
      label: 'Default',
      full: 'No address on file - will use default',
    });
  }

  const paymentTerms = client?.payment_terms_days || 30;
  const creditLimit = Number(client?.credit_limit) || 0;

  return (
    <motion.div
      key="step-1"
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="space-y-6"
    >
      {/* Form card */}
      <GlassCard accentBar hoverable={false}>
        <div className="p-6 space-y-6">
          {/* Section heading */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  'color-mix(in srgb, var(--ws-primary) 12%, transparent)',
                border:
                  '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
              }}
            >
              <MapPin className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            </div>
            <div>
              <h2
                className="text-base font-bold"
                style={{
                  color: 'var(--ws-text)',
                  fontFamily: 'var(--ws-heading-font, var(--ws-font))',
                }}
              >
                Delivery Details
              </h2>
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                Select delivery address and enter order reference
              </p>
            </div>
          </div>

          {/* Delivery address selector */}
          <div>
            <FormLabel htmlFor="delivery-address" required>
              Delivery Address
            </FormLabel>
            <GlassSelect
              id="delivery-address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            >
              {savedAddresses.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.label} - {addr.full}
                </option>
              ))}
            </GlassSelect>
          </div>

          {/* PO Number + Delivery Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FormLabel htmlFor="po-number" required>
                PO Number
              </FormLabel>
              <GlassInput
                id="po-number"
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-00382"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <FormLabel htmlFor="delivery-date">
                Requested Delivery Date
              </FormLabel>
              <GlassInput
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Contact person */}
          <div>
            <FormLabel htmlFor="contact-person">
              Contact Person
            </FormLabel>
            <GlassInput
              id="contact-person"
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Full name of contact person"
            />
          </div>

          {/* Special instructions */}
          <div>
            <FormLabel htmlFor="special-instructions">
              Special Instructions
            </FormLabel>
            <GlassTextarea
              id="special-instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Dock number, delivery window, handling requirements..."
              rows={3}
            />
          </div>
        </div>
      </GlassCard>

      {/* Payment terms info bar */}
      <GlassInfoBar icon={FileText}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold" style={{ color: 'var(--ws-primary)' }}>
            Net-{paymentTerms}
          </span>
          {creditLimit > 0 && (
            <>
              <span style={{ color: 'var(--ws-border)' }}>|</span>
              <span>
                Credit Limit:{' '}
                <span className="font-semibold" style={{ color: 'var(--ws-text)' }}>
                  {formatCurrency(creditLimit)}
                </span>
              </span>
            </>
          )}
        </div>
      </GlassInfoBar>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <SecondaryButton onClick={onBack} icon={ArrowLeft}>
          Back to Order
        </SecondaryButton>
        <PrimaryButton
          onClick={onContinue}
          disabled={!canContinue}
          icon={ChevronRight}
        >
          Continue to Review
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ReviewLineItem -- Single product row in order review
// ---------------------------------------------------------------------------

function ReviewLineItem({ item, isLast }) {
  const unitPrice = Number(item.price) || 0;
  const lineTotal = unitPrice * (item.quantity || 1);

  return (
    <motion.div
      variants={motionVariants.fadeIn}
      className="flex items-center gap-4 py-4"
      style={{
        borderBottom: isLast
          ? 'none'
          : '1px solid color-mix(in srgb, var(--ws-border) 50%, transparent)',
      }}
    >
      {/* Product image */}
      <div
        className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          background:
            'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
          border: '1px solid var(--ws-border)',
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Package
            className="w-5 h-5"
            style={{ color: 'var(--ws-muted)', opacity: 0.4 }}
          />
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
            className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
            style={{ color: 'var(--ws-muted)' }}
          >
            SKU: {item.sku}
          </p>
        )}
      </div>

      {/* Qty x Price */}
      <div className="hidden sm:flex flex-col items-end gap-0.5">
        <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
          {item.quantity} x {formatCurrency(unitPrice)}
        </span>
      </div>

      {/* Line total */}
      <span
        className="text-sm font-bold flex-shrink-0 min-w-[6rem] text-right"
        style={{ color: 'var(--ws-text)' }}
      >
        {formatCurrency(lineTotal)}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 -- Order Review
// ---------------------------------------------------------------------------

function OrderReviewStep({
  cart,
  client,
  isAuthenticated,
  deliveryAddress,
  poNumber,
  deliveryDate,
  contactPerson,
  specialInstructions,
  onSubmit,
  onBack,
  submitting,
  submitError,
}) {
  const {
    items = [],
    subtotal = 0,
    vat = 0,
    volumeDiscount = 0,
    total = 0,
    moqViolations = [],
  } = cart;

  // Build selected address label from client data
  let selectedAddressLabel = 'Default Address';
  let selectedAddressFull = 'No address specified';
  if (client) {
    if (deliveryAddress === 'shipping' && client.shipping_address) {
      selectedAddressLabel = 'Shipping Address';
      selectedAddressFull = formatAddress(client.shipping_address) || 'Shipping address on file';
    } else if (deliveryAddress === 'billing' && client.billing_address) {
      selectedAddressLabel = 'Billing Address';
      selectedAddressFull = formatAddress(client.billing_address) || 'Billing address on file';
    }
  }

  const canSubmit = isAuthenticated && moqViolations.length === 0 && !submitting;

  return (
    <motion.div
      key="step-2"
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="space-y-6"
    >
      {/* MOQ violations warning */}
      {moqViolations.length > 0 && (
        <GlassCard hoverable={false} style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>
                Minimum Order Quantity Not Met
              </p>
              {moqViolations.map((v, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                  {v.name || v.productName || `Item ${i + 1}`}: minimum {v.moq || v.minimum} units required
                </p>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Not authenticated warning */}
      {!isAuthenticated && (
        <GlassCard hoverable={false} style={{ borderColor: 'color-mix(in srgb, var(--ws-primary) 40%, transparent)' }}>
          <div className="p-4 flex items-start gap-3">
            <LogIn className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--ws-primary)' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ws-primary)' }}>
                Sign in to place orders
              </p>
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                You must be signed in to your B2B account to submit orders. You can still review your order details.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Delivery address confirmation */}
      <GlassCard accentBar hoverable={false}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
              <h3
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                Delivery Address
              </h3>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: 'var(--ws-primary)' }}
            >
              Edit
            </button>
          </div>
          <div className="text-sm leading-relaxed" style={{ color: 'var(--ws-text)' }}>
            <p className="font-semibold">{selectedAddressLabel}</p>
            <p style={{ color: 'var(--ws-muted)' }}>{selectedAddressFull}</p>
            {contactPerson && (
              <p className="mt-1" style={{ color: 'var(--ws-muted)' }}>
                Contact: {contactPerson}
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* PO + delivery info bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassInfoBar icon={FileText}>
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>PO Number:</span>{' '}
          <span className="font-bold font-mono tracking-wide">{poNumber}</span>
        </GlassInfoBar>
        <GlassInfoBar icon={Clock}>
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>Delivery:</span>{' '}
          <span className="font-semibold">5-7 business days</span>
        </GlassInfoBar>
      </div>

      {/* Order items */}
      <GlassCard hoverable={false}>
        <div style={gradientAccentBar} />
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Package className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
            <h3
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: 'var(--ws-muted)' }}
            >
              Order Items ({items.length})
            </h3>
          </div>
          <div>
            {items.map((item, idx) => (
              <ReviewLineItem
                key={item.productId || item.id || idx}
                item={item}
                isLast={idx === items.length - 1}
              />
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Totals breakdown */}
      <GlassCard hoverable={false}>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
              Subtotal
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              {formatCurrency(subtotal)}
            </span>
          </div>

          {volumeDiscount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
                Volume Discount
              </span>
              <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                -{formatCurrency(volumeDiscount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>
              VAT (21%)
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              {formatCurrency(vat)}
            </span>
          </div>

          <div
            className="pt-4 mt-2 flex items-center justify-between"
            style={{
              borderTop:
                '1px solid color-mix(in srgb, var(--ws-border) 60%, transparent)',
            }}
          >
            <span
              className="text-base font-bold"
              style={{ color: 'var(--ws-text)' }}
            >
              Total
            </span>
            <span
              className="text-xl font-extrabold"
              style={gradientTextStyle()}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Special instructions (if any) */}
      {specialInstructions?.trim() && (
        <GlassInfoBar icon={FileText}>
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-wider block mb-0.5"
              style={{ color: 'var(--ws-muted)' }}
            >
              Special Instructions
            </span>
            <span className="text-sm">{specialInstructions}</span>
          </div>
        </GlassInfoBar>
      )}

      {/* Submit error */}
      {submitError && (
        <GlassCard hoverable={false} style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>
                Failed to place order
              </p>
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                {submitError}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <SecondaryButton onClick={onBack} icon={ArrowLeft} disabled={submitting}>
          Back to Details
        </SecondaryButton>
        <PrimaryButton
          onClick={onSubmit}
          disabled={!canSubmit}
          icon={submitting ? Loader2 : ChevronRight}
        >
          {submitting ? 'Placing Order...' : isAuthenticated ? 'Submit Order' : 'Sign in to Place Order'}
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AnimatedCheckmark -- Scale + opacity entry animation
// ---------------------------------------------------------------------------

function AnimatedCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.15,
      }}
      className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
      style={{
        background:
          'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
        border: '2px solid rgba(34,197,94,0.3)',
        boxShadow: '0 0 40px rgba(34,197,94,0.15)',
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 12,
          delay: 0.35,
        }}
      >
        <Check className="w-12 h-12" style={{ color: '#22c55e' }} strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 -- Order Submitted Confirmation
// ---------------------------------------------------------------------------

function ConfirmationStep({ nav, orderNumber }) {
  return (
    <motion.div
      key="step-3"
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center"
    >
      {/* Animated checkmark */}
      <AnimatedCheckmark />

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-2xl sm:text-3xl font-extrabold mb-3"
        style={{
          ...gradientTextStyle(),
          fontFamily: 'var(--ws-heading-font, var(--ws-font))',
        }}
      >
        Order Submitted for Processing
      </motion.h2>

      {/* Order number badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-4"
        style={{
          ...glassCardStyle,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ws-muted)' }}>
          Order Number
        </span>
        <span
          className="text-base font-extrabold font-mono tracking-widest"
          style={{ color: 'var(--ws-primary)' }}
        >
          {orderNumber || 'Processing...'}
        </span>
      </motion.div>

      {/* Status explanation */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="text-sm max-w-md mb-8 leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        Your order is pending review. You will receive confirmation within 1
        business day. A detailed order confirmation will be sent to your
        registered email address.
      </motion.p>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
      >
        <PrimaryButton
          onClick={nav.goToOrders}
          className="w-full sm:w-auto"
        >
          View Orders
        </PrimaryButton>
      </motion.div>

      {/* Continue browsing link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        type="button"
        onClick={nav.goToCatalog}
        className="mt-5 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: 'var(--ws-primary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        Continue Browsing
      </motion.button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PreviewCheckoutPage -- Main export
// ---------------------------------------------------------------------------

export default function PreviewCheckoutPage({ config, cart, nav }) {
  const { client, isAuthenticated, orgId } = useWholesale();

  const {
    items = [],
    subtotal = 0,
    vat = 0,
    volumeDiscount = 0,
    total = 0,
    itemCount = 0,
    poNumber: cartPoNumber = '',
    setPoNumber: cartSetPoNumber,
    deliveryDate: cartDeliveryDate = '',
    setDeliveryDate: cartSetDeliveryDate,
    orderNotes: cartOrderNotes = '',
    setOrderNotes: cartSetOrderNotes,
    clearCart,
    hasValidOrder,
    moqViolations = [],
  } = cart;

  const { goToHome, goToCatalog, goToCart, goToOrders, goBack } = nav;

  const [step, setStep] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('shipping');
  const [poNumber, setPoNumber] = useState(cartPoNumber || '');
  const [deliveryDate, setDeliveryDate] = useState(cartDeliveryDate || '');
  const [contactPerson, setContactPerson] = useState(client?.full_name || '');
  const [specialInstructions, setSpecialInstructions] = useState(cartOrderNotes || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState(null);
  const clearedRef = useRef(false);

  // Update contact person when client loads
  useEffect(() => {
    if (client?.full_name && !contactPerson) {
      setContactPerson(client.full_name);
    }
  }, [client?.full_name]);

  // Sync PO number and notes to cart if setters exist
  useEffect(() => {
    if (cartSetPoNumber && poNumber !== cartPoNumber) {
      cartSetPoNumber(poNumber);
    }
  }, [poNumber]);

  useEffect(() => {
    if (cartSetDeliveryDate && deliveryDate !== cartDeliveryDate) {
      cartSetDeliveryDate(deliveryDate);
    }
  }, [deliveryDate]);

  useEffect(() => {
    if (cartSetOrderNotes && specialInstructions !== cartOrderNotes) {
      cartSetOrderNotes(specialInstructions);
    }
  }, [specialInstructions]);

  // Navigate between steps
  const goToStep = useCallback((s) => {
    setStep(s);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {}
  }, []);

  // Submit order -- creates a real B2B order in the database
  const handleSubmitOrder = useCallback(async () => {
    if (!isAuthenticated || !client?.id || !orgId) {
      setSubmitError('You must be signed in to place an order.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Resolve the shipping address JSONB from the selected option
      const shippingAddr = deliveryAddress === 'billing'
        ? (client.billing_address || client.shipping_address || {})
        : (client.shipping_address || {});

      const billingAddr = client.billing_address || client.shipping_address || {};

      // Build combined notes
      const notes = [
        poNumber ? `PO: ${poNumber}` : '',
        contactPerson ? `Contact: ${contactPerson}` : '',
        specialInstructions || '',
      ].filter(Boolean).join(' | ');

      // Create the order
      const order = await createB2BOrder({
        organization_id: orgId,
        company_id: orgId, // In this B2B portal, company_id maps to organization_id
        client_id: client.id,
        subtotal: subtotal || 0,
        tax_amount: vat || 0,
        shipping_cost: 0,
        discount_amount: volumeDiscount || 0,
        total: total || 0,
        shipping_address: shippingAddr,
        billing_address: billingAddr,
        client_notes: notes,
        payment_terms_days: client.payment_terms_days || 30,
      });

      // Create order items
      if (items.length > 0) {
        const orderItems = items.map((item) => ({
          b2b_order_id: order.id,
          product_id: item.productId || item.id || null,
          product_name: item.name || 'Unknown Product',
          sku: item.sku || '',
          quantity: item.quantity || 1,
          unit_price: Number(item.price) || 0,
          line_total: (Number(item.price) || 0) * (item.quantity || 1),
          discount_percent: 0,
          tax_percent: 21,
          is_preorder: false,
        }));

        await createB2BOrderItems(orderItems);
      }

      // Run order automation (inventory, invoice, notification, email)
      try {
        await processOrderPlaced(order.id, orgId);
      } catch (automationErr) {
        console.warn('[Checkout] Automation partial failure:', automationErr);
        // Don't block order confirmation — order is created successfully
      }

      // Store the confirmed order number
      setConfirmedOrderNumber(order.order_number || order.id);

      // Move to confirmation step
      goToStep(3);
    } catch (err) {
      console.error('[PreviewCheckoutPage] Order creation failed:', err);
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isAuthenticated, client, orgId, items, subtotal, vat, volumeDiscount, total, deliveryAddress, poNumber, contactPerson, specialInstructions, goToStep]);

  // Clear cart exactly once on reaching step 3
  useEffect(() => {
    if (step === 3 && !clearedRef.current) {
      clearedRef.current = true;
      clearCart?.();
    }
  }, [step, clearCart]);

  // -- Empty cart guard (except on confirmation step) -------------------------
  if ((!items || items.length === 0) && step !== 3) {
    return (
      <div
        className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <EmptyState
          icon={ShoppingCart}
          title="No Items to Process"
          description="Your order is empty. Browse the catalog to add products before placing an order."
          action={
            <PrimaryButton onClick={goToCatalog} icon={ArrowLeft}>
              Browse Catalog
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: goToHome },
          { label: 'Order', onClick: goToCart },
          { label: STEP_LABELS[step - 1] },
        ]}
      />

      {/* Page title */}
      <SectionHeader
        title="Place Order"
        subtitle={
          step === 1
            ? 'Configure delivery details for your order'
            : step === 2
            ? 'Review your order before submission'
            : 'Your order has been submitted'
        }
        className="mb-6"
      />

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step content with AnimatePresence */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <DeliveryDetailsStep
            client={client}
            deliveryAddress={deliveryAddress}
            setDeliveryAddress={setDeliveryAddress}
            poNumber={poNumber}
            setPoNumber={setPoNumber}
            deliveryDate={deliveryDate}
            setDeliveryDate={setDeliveryDate}
            contactPerson={contactPerson}
            setContactPerson={setContactPerson}
            specialInstructions={specialInstructions}
            setSpecialInstructions={setSpecialInstructions}
            onContinue={() => goToStep(2)}
            onBack={goToCart}
          />
        )}

        {step === 2 && (
          <OrderReviewStep
            cart={cart}
            client={client}
            isAuthenticated={isAuthenticated}
            deliveryAddress={deliveryAddress}
            poNumber={poNumber}
            deliveryDate={deliveryDate}
            contactPerson={contactPerson}
            specialInstructions={specialInstructions}
            onSubmit={handleSubmitOrder}
            onBack={() => goToStep(1)}
            submitting={submitting}
            submitError={submitError}
          />
        )}

        {step === 3 && <ConfirmationStep nav={nav} orderNumber={confirmedOrderNumber} />}
      </AnimatePresence>
    </div>
  );
}
