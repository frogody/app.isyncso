// ---------------------------------------------------------------------------
// PreviewCheckoutPage.jsx -- 3-step checkout flow for the store builder
// preview. Runs inside an iframe in demo mode -- no real DB writes, no auth,
// no router. Uses CSS custom properties for theming.
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useMemo } from 'react';
import {
  Check,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Package,
  MapPin,
  CreditCard,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value) {
  return `\u20AC${Number(value || 0).toFixed(2)}`;
}

const VAT_RATE = 0.21;

const COUNTRIES = [
  'Netherlands',
  'Belgium',
  'Germany',
  'France',
  'United Kingdom',
  'Other',
];

const INITIAL_ADDRESS = {
  fullName: '',
  company: '',
  street: '',
  city: '',
  postal: '',
  country: 'Netherlands',
  phone: '',
};

const REQUIRED_FIELDS = ['fullName', 'street', 'city', 'postal', 'country'];

const FIELD_LABELS = {
  fullName: 'Full Name',
  company: 'Company Name',
  street: 'Street Address',
  city: 'City',
  postal: 'Postal Code',
  country: 'Country',
  phone: 'Phone Number',
};

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: 'Shipping' },
    { number: 2, label: 'Review' },
    { number: 3, label: 'Confirmation' },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.number < currentStep;

        return (
          <React.Fragment key={step.number}>
            {/* Connector line */}
            {idx > 0 && (
              <div
                className="w-10 sm:w-16 h-px flex-shrink-0"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--ws-primary)'
                    : 'var(--ws-border, rgba(255,255,255,0.1))',
                }}
              />
            )}

            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors text-sm font-semibold"
                style={{
                  backgroundColor: isActive || isCompleted
                    ? 'var(--ws-primary)'
                    : 'rgba(255,255,255,0.06)',
                  color: isActive || isCompleted
                    ? 'var(--ws-bg, #000)'
                    : 'var(--ws-muted)',
                }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className="text-[11px] font-medium"
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

// ---------------------------------------------------------------------------
// FormField
// ---------------------------------------------------------------------------

function FormField({ label, name, value, onChange, type = 'text', required = false, placeholder = '', error }) {
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`checkout-${name}`}
        className="text-xs font-medium"
        style={{ color: 'var(--ws-muted)' }}
      >
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        id={`checkout-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1"
        style={{
          backgroundColor: 'var(--ws-surface)',
          color: 'var(--ws-text)',
          border: hasError
            ? '1px solid #ef4444'
            : '1px solid var(--ws-border, rgba(255,255,255,0.1))',
          '--tw-ring-color': 'var(--ws-primary)',
        }}
      />
      {hasError && (
        <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SelectField
// ---------------------------------------------------------------------------

function SelectField({ label, name, value, onChange, options, required = false, error }) {
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`checkout-${name}`}
        className="text-xs font-medium"
        style={{ color: 'var(--ws-muted)' }}
      >
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <select
        id={`checkout-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        className="px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-1 appearance-none"
        style={{
          backgroundColor: 'var(--ws-surface)',
          color: 'var(--ws-text)',
          border: hasError
            ? '1px solid #ef4444'
            : '1px solid var(--ws-border, rgba(255,255,255,0.1))',
          '--tw-ring-color': 'var(--ws-primary)',
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {hasError && (
        <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 -- Shipping Address
// ---------------------------------------------------------------------------

function ShippingStep({ address, setAddress, errors, onNext, onBackToCart }) {
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setAddress((prev) => ({ ...prev, [name]: value }));
    },
    [setAddress],
  );

  return (
    <div>
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
            label="Full Name"
            name="fullName"
            value={address.fullName}
            onChange={handleChange}
            required
            placeholder="John Smith"
            error={errors.fullName}
          />
          <FormField
            label="Company Name"
            name="company"
            value={address.company}
            onChange={handleChange}
            placeholder="Acme B.V."
          />
          <div className="sm:col-span-2">
            <FormField
              label="Street Address"
              name="street"
              value={address.street}
              onChange={handleChange}
              required
              placeholder="123 Business Street"
              error={errors.street}
            />
          </div>
          <FormField
            label="City"
            name="city"
            value={address.city}
            onChange={handleChange}
            required
            placeholder="Amsterdam"
            error={errors.city}
          />
          <FormField
            label="Postal Code"
            name="postal"
            value={address.postal}
            onChange={handleChange}
            required
            placeholder="1012 AB"
            error={errors.postal}
          />
          <SelectField
            label="Country"
            name="country"
            value={address.country}
            onChange={handleChange}
            options={COUNTRIES}
            required
            error={errors.country}
          />
          <FormField
            label="Phone Number"
            name="phone"
            value={address.phone}
            onChange={handleChange}
            type="tel"
            placeholder="+31 6 12345678"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onBackToCart}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Continue to Review
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewItem
// ---------------------------------------------------------------------------

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
        className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center"
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
          <Package className="w-4 h-4" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
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

      {/* Qty x Price = Total */}
      <span
        className="text-xs flex-shrink-0"
        style={{ color: 'var(--ws-muted)' }}
      >
        {item.quantity} &times; {formatPrice(unitPrice)}
      </span>

      <span
        className="text-sm font-semibold flex-shrink-0 min-w-[5rem] text-right"
        style={{ color: 'var(--ws-text)' }}
      >
        {formatPrice(lineTotal)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 -- Review Order
// ---------------------------------------------------------------------------

function ReviewStep({ items, address, orderNotes, setOrderNotes, total, onBack, onPlaceOrder, loading }) {
  const subtotal = total;
  const vat = subtotal * VAT_RATE;
  const grandTotal = subtotal + vat;

  return (
    <div className="space-y-5">
      {/* Shipping address summary */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: 'var(--ws-primary)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Shipping Address
            </h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--ws-primary)' }}
          >
            Edit
          </button>
        </div>
        <div className="text-sm leading-relaxed" style={{ color: 'var(--ws-muted)' }}>
          <p style={{ color: 'var(--ws-text)' }}>{address.fullName}</p>
          {address.company && <p>{address.company}</p>}
          <p>{address.street}</p>
          <p>{address.postal} {address.city}</p>
          <p>{address.country}</p>
          {address.phone && <p>{address.phone}</p>}
        </div>
      </div>

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
            <ReviewItem key={item.productId} item={item} />
          ))}
        </div>
      </div>

      {/* Order notes */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <h3
          className="text-sm font-semibold mb-2"
          style={{ color: 'var(--ws-text)' }}
        >
          Order Notes
        </h3>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Add notes to your order..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none transition-colors focus:ring-1"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: 'var(--ws-text)',
            border: '1px solid var(--ws-border, rgba(255,255,255,0.1))',
            '--tw-ring-color': 'var(--ws-primary)',
          }}
        />
      </div>

      {/* Totals */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Subtotal</span>
            <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              {formatPrice(subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>VAT (21%)</span>
            <span className="text-sm font-medium" style={{ color: 'var(--ws-text)' }}>
              {formatPrice(vat)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--ws-muted)' }}>Shipping</span>
            <span className="text-xs font-medium italic" style={{ color: 'var(--ws-muted)' }}>
              Calculated after confirmation
            </span>
          </div>
          <div
            className="pt-3 mt-2 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--ws-text)' }}>Total</span>
            <span className="text-lg font-bold" style={{ color: 'var(--ws-primary)' }}>
              {formatPrice(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shipping
        </button>

        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={loading}
          className={`
            inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold
            transition-all duration-200
            ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}
          `}
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          {loading ? (
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
  );
}

// ---------------------------------------------------------------------------
// Step 3 -- Confirmation (Demo)
// ---------------------------------------------------------------------------

function ConfirmationStep({ orderId, total, itemCount, nav }) {
  const grandTotal = total + total * VAT_RATE;

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}
      >
        <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
      </div>

      <h2
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Order Placed Successfully!
      </h2>

      {/* Order ID */}
      <div
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg mt-2 mb-4"
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
          Order ID:
        </span>
        <span
          className="text-sm font-bold font-mono tracking-wider"
          style={{ color: 'var(--ws-primary)' }}
        >
          {orderId}
        </span>
      </div>

      <p
        className="text-sm mb-2 max-w-md"
        style={{ color: 'var(--ws-muted)' }}
      >
        Your order has been received and is being processed.
      </p>

      {/* Summary */}
      <div
        className="inline-flex items-center gap-4 px-4 py-2 rounded-lg mb-6"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--ws-text)' }}
        >
          {formatPrice(grandTotal)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={nav.goToCatalog}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          Continue Shopping
        </button>

        <button
          type="button"
          onClick={nav.goToOrders}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
          style={{
            color: 'var(--ws-muted)',
            border: '1px solid var(--ws-border)',
          }}
        >
          View Orders
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PreviewCheckoutPage
// ---------------------------------------------------------------------------

export default function PreviewCheckoutPage({ config, cart, nav }) {
  const { items, total, itemCount, clearCart } = cart;
  const { goToCart, goToCatalog, goToOrders, goToHome } = nav;

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({ ...INITIAL_ADDRESS });
  const [errors, setErrors] = useState({});
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // -- Validate shipping form -----------------------------------------------
  const validateShipping = useCallback(() => {
    const newErrors = {};
    for (const field of REQUIRED_FIELDS) {
      if (!address[field]?.trim()) {
        newErrors[field] = `${FIELD_LABELS[field]} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [address]);

  // -- Step navigation ------------------------------------------------------
  const goToStep = useCallback((s) => {
    setStep(s);
    // Scroll preview to top
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      // silent -- may not be available in all iframe contexts
    }
  }, []);

  const handleNextFromShipping = useCallback(() => {
    if (validateShipping()) {
      goToStep(2);
    }
  }, [validateShipping, goToStep]);

  const handleBackToShipping = useCallback(() => {
    goToStep(1);
  }, [goToStep]);

  // -- Place order (demo) ---------------------------------------------------
  const handlePlaceOrder = useCallback(() => {
    setLoading(true);

    // Simulate 1.5s processing delay
    setTimeout(() => {
      const generatedId = `ORD-${Date.now().toString(36).toUpperCase().slice(-8)}`;
      setOrderId(generatedId);
      clearCart();
      setLoading(false);
      goToStep(3);
    }, 1500);
  }, [clearCart, goToStep]);

  // -- Redirect to cart if empty (except on confirmation step) ---------------
  const isEmpty = (!items || items.length === 0) && step < 3;

  if (isEmpty) {
    return (
      <div
        className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--ws-muted)' }}
        >
          Your cart is empty. Add items before checking out.
        </p>
        <button
          type="button"
          onClick={goToCart}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Cart
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ backgroundColor: 'var(--ws-bg)' }}
    >
      {/* Page title */}
      <h1
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Checkout
      </h1>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step 1: Shipping */}
      {step === 1 && (
        <ShippingStep
          address={address}
          setAddress={setAddress}
          errors={errors}
          onNext={handleNextFromShipping}
          onBackToCart={goToCart}
        />
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <ReviewStep
          items={items}
          address={address}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
          total={total}
          onBack={handleBackToShipping}
          onPlaceOrder={handlePlaceOrder}
          loading={loading}
        />
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <ConfirmationStep
          orderId={orderId}
          total={total}
          itemCount={itemCount}
          nav={nav}
        />
      )}
    </div>
  );
}
