import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  ClipboardList,
  CheckCircle2,
  ShoppingBag,
  Package,
  ImageOff,
  Truck,
  CreditCard,
  Calendar,
  Mail,
  Bell,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import { supabase } from '@/api/supabaseClient';
import { reserveB2BInventory } from '@/lib/db/queries/b2b';
import { AlertCircle } from 'lucide-react';

/**
 * EUR currency formatter.
 */
const eurFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BTW_RATE = 0.21;

/**
 * Calculate minimum delivery date (3 business days from now).
 */
function getMinDeliveryDate() {
  const date = new Date();
  let businessDays = 0;
  while (businessDays < 3) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) businessDays++;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Step indicator displayed at the top of the checkout flow.
 */
function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: 'Shipping Address', icon: MapPin },
    { number: 2, label: 'Review Order', icon: ClipboardList },
    { number: 3, label: 'Confirmation', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, idx) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.number}>
            {idx > 0 && (
              <div
                className="w-8 h-px flex-shrink-0"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--ws-primary)'
                    : 'var(--ws-border, rgba(255,255,255,0.1))',
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  backgroundColor: isActive
                    ? 'var(--ws-primary)'
                    : isCompleted
                    ? 'var(--ws-primary)'
                    : 'rgba(255, 255, 255, 0.06)',
                  color: isActive || isCompleted ? 'var(--ws-bg, #000)' : 'var(--ws-muted)',
                }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{
                  color: isActive
                    ? 'var(--ws-text)'
                    : isCompleted
                    ? 'var(--ws-primary)'
                    : 'var(--ws-muted)',
                }}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Address form field component.
 */
function FormField({ label, name, value, onChange, type = 'text', required = false, placeholder = '', autoComplete = '' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-xs font-medium"
        style={{ color: 'var(--ws-muted)' }}
      >
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          color: 'var(--ws-text)',
          border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
          '--tw-ring-color': 'var(--ws-primary)',
        }}
      />
    </div>
  );
}

/**
 * Step 1: Shipping Address Form with Delivery Date Picker
 */
function ShippingStep({ address, setAddress, deliveryDate, setDeliveryDate, deliveryNotes, setDeliveryNotes, onNext }) {
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setAddress((prev) => ({ ...prev, [name]: value }));
    },
    [setAddress],
  );

  const isValid = useMemo(() => {
    return (
      address.name?.trim() &&
      address.street?.trim() &&
      address.city?.trim() &&
      address.postal?.trim() &&
      address.country?.trim()
    );
  }, [address]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isValid) {
        onNext();
      }
    },
    [isValid, onNext],
  );

  const minDate = useMemo(() => getMinDeliveryDate(), []);

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <MapPin className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            Shipping Address
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Contact Name"
            name="name"
            value={address.name}
            onChange={handleChange}
            required
            placeholder="John Smith"
            autoComplete="name"
          />
          <FormField
            label="Company Name"
            name="company"
            value={address.company}
            onChange={handleChange}
            placeholder="Acme B.V."
            autoComplete="organization"
          />
          <div className="sm:col-span-2">
            <FormField
              label="Street Address"
              name="street"
              value={address.street}
              onChange={handleChange}
              required
              placeholder="123 Business Street"
              autoComplete="street-address"
            />
          </div>
          <FormField
            label="City"
            name="city"
            value={address.city}
            onChange={handleChange}
            required
            placeholder="Amsterdam"
            autoComplete="address-level2"
          />
          <FormField
            label="Postal Code"
            name="postal"
            value={address.postal}
            onChange={handleChange}
            required
            placeholder="1012 AB"
            autoComplete="postal-code"
          />
          <FormField
            label="Country"
            name="country"
            value={address.country}
            onChange={handleChange}
            required
            placeholder="Netherlands"
            autoComplete="country-name"
          />
          <FormField
            label="Phone Number"
            name="phone"
            value={address.phone}
            onChange={handleChange}
            type="tel"
            placeholder="+31 6 12345678"
            autoComplete="tel"
          />
        </div>
      </div>

      {/* Delivery Date Picker */}
      <div
        className="rounded-xl p-5 mt-5"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            Preferred Delivery Date
          </h2>
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>(optional)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="deliveryDate"
              className="text-xs font-medium"
              style={{ color: 'var(--ws-muted)' }}
            >
              Delivery Date
            </label>
            <input
              id="deliveryDate"
              type="date"
              min={minDate}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--ws-text)',
                border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
                '--tw-ring-color': 'var(--ws-primary)',
                colorScheme: 'dark',
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="deliveryNotes"
              className="text-xs font-medium"
              style={{ color: 'var(--ws-muted)' }}
            >
              Delivery Notes
            </label>
            <textarea
              id="deliveryNotes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Deliver to loading dock, call before delivery..."
              rows={2}
              className="px-3 py-2.5 rounded-lg text-sm outline-none resize-none transition-colors focus:ring-1"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--ws-text)',
                border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
                '--tw-ring-color': 'var(--ws-primary)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={!isValid}
          className={`
            inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold
            transition-all duration-200
            ${!isValid ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}
          `}
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Continue to Review
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

/**
 * Order item row for the review step.
 */
function ReviewItem({ item }) {
  const unitPrice = Number(item.price) || 0;
  const lineTotal = unitPrice * item.quantity;

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.06))' }}
    >
      {/* Image */}
      <div
        className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        {(item.image || item.featured_image) ? (
          <img
            src={item.image || item.featured_image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy" decoding="async"
          />
        ) : (
          <ImageOff className="w-4 h-4" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
        )}
      </div>

      {/* Name + SKU */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--ws-text)' }}
        >
          {item.name}
        </p>
        {item.sku && (
          <p
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: 'var(--ws-muted)' }}
          >
            {item.sku}
          </p>
        )}
      </div>

      {/* Qty */}
      <span
        className="text-xs font-medium flex-shrink-0"
        style={{ color: 'var(--ws-muted)' }}
      >
        x{item.quantity}
      </span>

      {/* Price */}
      <span
        className="text-sm font-semibold flex-shrink-0 min-w-[5rem] text-right"
        style={{ color: 'var(--ws-text)' }}
      >
        {eurFormatter.format(lineTotal)}
      </span>
    </div>
  );
}

/**
 * Payment Terms Display card.
 */
function PaymentTermsCard({ client }) {
  const paymentTerms = client?.payment_terms || client?.payment_term;
  const displayTerms = paymentTerms || 'Payment on delivery';

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
        <h2
          className="text-base font-semibold"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          Payment Terms
        </h2>
      </div>
      <div
        className="flex items-center gap-3 px-3.5 py-3 rounded-lg"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        >
          <CreditCard className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
            {paymentTerms ? `Your payment terms: ${paymentTerms}` : 'Payment on delivery'}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--ws-muted)' }}>
            {paymentTerms
              ? 'Invoice will be sent after order processing'
              : 'Payment will be collected upon delivery'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Persistent Order Summary Sidebar - visible on desktop, collapsible on mobile.
 */
function OrderSummarySidebar({ items, isCollapsedOnMobile }) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0),
    [items],
  );
  const tax = subtotal * BTW_RATE;
  const total = subtotal + tax;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h3>
      </div>

      {/* Item list */}
      <div className="space-y-0 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {items.map((item) => {
          const lineTotal = (Number(item.price) || 0) * item.quantity;
          return (
            <div
              key={item.productId ?? item.id}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.04))' }}
            >
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--ws-text)' }}>
                  {item.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>
                  x{item.quantity}
                </p>
              </div>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--ws-text)' }}>
                {eurFormatter.format(lineTotal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>Subtotal</span>
          <span className="text-xs font-medium" style={{ color: 'var(--ws-text)' }}>
            {eurFormatter.format(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>VAT (21%)</span>
          <span className="text-xs font-medium" style={{ color: 'var(--ws-text)' }}>
            {eurFormatter.format(tax)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>Shipping</span>
          <span className="text-xs font-medium" style={{ color: 'var(--ws-text)' }}>
            {subtotal >= 500 ? 'Free' : 'Calculated at shipment'}
          </span>
        </div>
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>Total</span>
          <span className="text-base font-bold" style={{ color: 'var(--ws-primary)' }}>
            {eurFormatter.format(total)}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <div
        className="hidden lg:block rounded-xl p-5 sticky top-6"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        {content}
      </div>

      {/* Mobile: collapsible section */}
      <div
        className="lg:hidden rounded-xl overflow-hidden mb-5"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <button
          type="button"
          onClick={() => setMobileExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-5 py-3.5"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: 'var(--ws-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>
              Order Summary
            </span>
            <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: 'var(--ws-primary)' }}>
              {eurFormatter.format(subtotal + tax)}
            </span>
            {mobileExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
            )}
          </div>
        </button>
        {mobileExpanded && (
          <div className="px-5 pb-4">
            {content}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Step 2: Order Review
 */
function ReviewStep({ items, address, deliveryDate, deliveryNotes, orderNotes, setOrderNotes, client, onBack, onSubmit, submitting }) {
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0),
    [items],
  );
  const tax = subtotal * BTW_RATE;
  const total = subtotal + tax;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left column: review content */}
      <div className="flex-1 lg:w-2/3 space-y-5">
        {/* Mobile order summary (collapsible) */}
        <OrderSummarySidebar items={items} />

        {/* Order items */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'var(--ws-surface)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Order Items ({items.length})
            </h2>
          </div>

          <div>
            {items.map((item) => (
              <ReviewItem key={item.productId ?? item.id} item={item} />
            ))}
          </div>

          {/* Totals (shown inline for desktop without sidebar overlap) */}
          <div className="mt-4 pt-3 space-y-2 lg:hidden" style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Subtotal</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                {eurFormatter.format(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>VAT (21%)</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                {eurFormatter.format(tax)}
              </span>
            </div>
            <div
              className="flex items-center justify-between pt-2"
              style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>Total</span>
              <span className="text-lg font-bold" style={{ color: 'var(--ws-primary)' }}>
                {eurFormatter.format(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping address preview */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'var(--ws-surface)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Shipping Address
            </h2>
          </div>
          <div className="text-sm leading-relaxed" style={{ color: 'var(--ws-muted)' }}>
            <p style={{ color: 'var(--ws-text)' }}>{address.name}</p>
            {address.company && <p>{address.company}</p>}
            <p>{address.street}</p>
            <p>{address.postal} {address.city}</p>
            <p>{address.country}</p>
            {address.phone && <p>{address.phone}</p>}
          </div>

          {/* Delivery date & notes if provided */}
          {(deliveryDate || deliveryNotes) && (
            <div
              className="mt-3 pt-3"
              style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.06))' }}
            >
              {deliveryDate && (
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--ws-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                    Preferred delivery:{' '}
                    <span style={{ color: 'var(--ws-text)' }}>
                      {new Date(deliveryDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                </div>
              )}
              {deliveryNotes && (
                <p className="text-xs mt-1" style={{ color: 'var(--ws-muted)' }}>
                  Delivery notes: {deliveryNotes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment terms */}
        <PaymentTermsCard client={client} />

        {/* Order notes */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'var(--ws-surface)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Order Notes
            </h2>
          </div>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Add any special instructions or notes for this order..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none transition-colors focus:ring-1"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--ws-text)',
              border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
              '--tw-ring-color': 'var(--ws-primary)',
            }}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            style={{ color: 'var(--ws-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={`
              inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold
              transition-all duration-200
              ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}
            `}
            style={{
              backgroundColor: 'var(--ws-primary)',
              color: 'var(--ws-bg, #000)',
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Place Order
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right column: sticky summary sidebar (desktop only) */}
      <div className="hidden lg:block lg:w-1/3">
        <OrderSummarySidebar items={items} />
      </div>
    </div>
  );
}

/**
 * Step 3: Enhanced Order Confirmation
 */
function ConfirmationStep({ orderId }) {
  const { org } = useParams();
  const catalogPath = org ? `/portal/${org}/shop/catalog` : '/catalog';
  const ordersPath = org ? `/portal/${org}/shop/orders` : '/orders';

  const whatNextSteps = [
    {
      icon: Mail,
      title: 'Order Confirmation Email',
      description: 'You will receive a confirmation email with your order details shortly.',
    },
    {
      icon: Package,
      title: 'Processing Begins',
      description: 'Our team will start preparing your order for shipment.',
    },
    {
      icon: Bell,
      title: 'Shipping Notification',
      description: 'You will be notified when your order ships with tracking information.',
    },
  ];

  return (
    <div className="flex flex-col items-center text-center py-8 max-w-lg mx-auto">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}
      >
        <CheckCircle2 className="w-10 h-10" style={{ color: '#22c55e' }} />
      </div>

      <h2
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Order Placed Successfully!
      </h2>
      <p
        className="text-sm mb-2 max-w-md"
        style={{ color: 'var(--ws-muted)' }}
      >
        Thank you for your order. We will process it and notify you once it ships.
      </p>

      {/* Order number prominently displayed */}
      {orderId && (
        <div
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl mt-2 mb-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
            Order Number
          </span>
          <span
            className="text-lg font-bold font-mono tracking-wider"
            style={{ color: 'var(--ws-primary)' }}
          >
            #{orderId.substring(0, 8).toUpperCase()}
          </span>
        </div>
      )}

      {/* What's Next steps */}
      <div
        className="w-full rounded-xl p-5 mb-6 text-left"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <h3
          className="text-sm font-semibold mb-4"
          style={{ color: 'var(--ws-text)' }}
        >
          What happens next?
        </h3>
        <div className="space-y-4">
          {whatNextSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--ws-primary)',
                      color: 'var(--ws-bg, #000)',
                    }}
                  >
                    {idx + 1}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
                    {step.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {orderId && (
          <Link
            to={`${ordersPath}/${orderId}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--ws-primary)',
              color: 'var(--ws-bg, #000)',
            }}
          >
            <ClipboardList className="w-4 h-4" />
            View Order
          </Link>
        )}

        <Link
          to={catalogPath}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
          style={{
            color: 'var(--ws-muted)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

/**
 * CheckoutPage
 *
 * Multi-step checkout flow for the B2B wholesale storefront.
 *
 * Steps:
 *   1. Shipping Address - form with name, company, street, city, postal, country, phone,
 *      preferred delivery date, and delivery notes
 *   2. Review Order    - two-column layout with persistent summary sidebar,
 *      payment terms display, address preview, notes textarea
 *   3. Confirmation    - enhanced success with order number, "What's Next" steps,
 *      View Order and Continue Shopping buttons
 *
 * On submission, creates records in b2b_orders and b2b_order_items via Supabase,
 * then clears the cart.
 */
export default function CheckoutPage() {
  const { cartItems, clearCart, orgId, organizationId, config, client } = useWholesale();
  const navigate = useNavigate();
  const { org } = useParams();
  const minOrderAmount = Number(config?.min_order_amount) || 0;

  const [step, setStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    company: '',
    street: '',
    city: '',
    postal: '',
    country: 'Netherlands',
    phone: '',
  });
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Normalize cart items (same as CartPage).
   */
  const normalizedItems = useMemo(
    () =>
      cartItems.map((item) => ({
        ...item,
        productId: item.productId ?? item.id,
        image: item.image ?? item.featured_image ?? null,
        price: Number(item.price) || 0,
      })),
    [cartItems],
  );

  // Redirect to cart if empty (except on confirmation step)
  useEffect(() => {
    if (normalizedItems.length === 0 && step < 3) {
      navigate(`/portal/${org}/shop/cart`, { replace: true });
    }
  }, [normalizedItems.length, step, navigate, org]);

  const subtotal = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0),
    [normalizedItems],
  );

  const belowMinimum = minOrderAmount > 0 && subtotal < minOrderAmount;

  const handleNextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePrevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /**
   * Submit the order to Supabase.
   * Creates a b2b_orders row and corresponding b2b_order_items rows.
   */
  const handlePlaceOrder = useCallback(async () => {
    if (belowMinimum) {
      setError(`Minimum order amount is ${eurFormatter.format(minOrderAmount)}. Your current subtotal is ${eurFormatter.format(subtotal)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const resolvedOrgId = organizationId || orgId || org;

      // Calculate totals
      const taxAmount = subtotal * BTW_RATE;
      const totalAmount = subtotal + taxAmount;

      // Build shipping address with delivery preferences
      const fullShippingAddress = {
        ...shippingAddress,
        ...(deliveryDate ? { preferred_delivery_date: deliveryDate } : {}),
        ...(deliveryNotes ? { delivery_notes: deliveryNotes } : {}),
      };

      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('b2b_orders')
        .insert({
          organization_id: resolvedOrgId,
          company_id: config?.company_id || resolvedOrgId,
          client_id: client?.id,
          status: 'pending',
          shipping_address: fullShippingAddress,
          client_notes: orderNotes || null,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total: totalAmount,
          currency: 'EUR',
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('[CheckoutPage] Order creation failed:', orderError);
        throw new Error(orderError.message || 'Failed to create order');
      }

      const newOrderId = orderData.id;

      // Create order line items
      const orderItems = normalizedItems.map((item) => ({
        b2b_order_id: newOrderId,
        product_id: item.productId ?? item.id,
        product_name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: Number(item.price) || 0,
        line_total: (Number(item.price) || 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('b2b_order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('[CheckoutPage] Order items creation failed:', itemsError);
        // Order was created but items failed -- still show confirmation
        // so the user knows something went through.
      }

      // Reserve inventory for each order item
      // Failures are non-blocking -- the order is still valid, inventory can be
      // reconciled by an admin later.
      try {
        await Promise.allSettled(
          normalizedItems.map((item) =>
            reserveB2BInventory(
              item.productId ?? item.id,
              resolvedOrgId,
              item.quantity,
            )
          )
        );
      } catch (reserveErr) {
        console.error('[CheckoutPage] Inventory reservation error:', reserveErr);
      }

      // Success -- clear cart and advance to confirmation
      setOrderId(newOrderId);
      clearCart();
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[CheckoutPage] Checkout error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [orgId, organizationId, org, subtotal, shippingAddress, orderNotes, deliveryDate, deliveryNotes, normalizedItems, clearCart, belowMinimum, minOrderAmount, config, client]);

  const catalogPath = `/portal/${org}/shop/catalog`;
  const cartPath = `/portal/${org}/shop/cart`;

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      {/* Back link */}
      {step < 3 && (
        <Link
          to={step === 1 ? cartPath : '#'}
          onClick={(e) => {
            if (step > 1) {
              e.preventDefault();
              handlePrevStep();
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 mb-6"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? 'Back to Cart' : 'Back'}
        </Link>
      )}

      {/* Page title */}
      <h1
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Checkout
      </h1>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Error banner */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-5 text-sm flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 1 && (
        <ShippingStep
          address={shippingAddress}
          setAddress={setShippingAddress}
          deliveryDate={deliveryDate}
          setDeliveryDate={setDeliveryDate}
          deliveryNotes={deliveryNotes}
          setDeliveryNotes={setDeliveryNotes}
          onNext={handleNextStep}
        />
      )}

      {step === 2 && (
        <ReviewStep
          items={normalizedItems}
          address={shippingAddress}
          deliveryDate={deliveryDate}
          deliveryNotes={deliveryNotes}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
          client={client}
          onBack={handlePrevStep}
          onSubmit={handlePlaceOrder}
          submitting={submitting}
        />
      )}

      {step === 3 && (
        <ConfirmationStep orderId={orderId} />
      )}
    </div>
  );
}
