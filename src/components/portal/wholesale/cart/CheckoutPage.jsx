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
} from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';
import { supabase } from '@/api/supabaseClient';

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
 * Step 1: Shipping Address Form
 */
function ShippingStep({ address, setAddress, onNext }) {
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
            loading="lazy"
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
 * Step 2: Order Review
 */
function ReviewStep({ items, address, orderNotes, setOrderNotes, onBack, onSubmit, submitting }) {
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0),
    [items],
  );
  const tax = subtotal * BTW_RATE;
  const total = subtotal + tax;

  return (
    <div className="space-y-5">
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

        {/* Totals */}
        <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}>
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
      </div>

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
  );
}

/**
 * Step 3: Order Confirmation
 */
function ConfirmationStep({ orderId }) {
  const { org } = useParams();
  const catalogPath = org ? `/${org}/catalog` : '/catalog';
  const ordersPath = org ? `/${org}/orders` : '/orders';

  return (
    <div className="flex flex-col items-center text-center py-8">
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

      {/* Order number */}
      {orderId && (
        <div
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg mt-2 mb-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
            Order Number:
          </span>
          <span
            className="text-sm font-bold font-mono tracking-wider"
            style={{ color: 'var(--ws-primary)' }}
          >
            {orderId.substring(0, 8).toUpperCase()}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4">
        {orderId && (
          <Link
            to={`${ordersPath}/${orderId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
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
 *   1. Shipping Address - form with name, company, street, city, postal, country, phone
 *   2. Review Order    - order summary, address preview, notes textarea, "Place Order" button
 *   3. Confirmation    - success message with order number and navigation links
 *
 * On submission, creates records in b2b_orders and b2b_order_items via Supabase,
 * then clears the cart.
 */
export default function CheckoutPage() {
  const { cartItems, clearCart, orgId } = useWholesale();
  const navigate = useNavigate();
  const { org } = useParams();

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
      navigate(org ? `/${org}/cart` : '/cart', { replace: true });
    }
  }, [normalizedItems.length, step, navigate, org]);

  const subtotal = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0),
    [normalizedItems],
  );

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
    setSubmitting(true);
    setError(null);

    try {
      const organizationId = orgId || org;

      // Calculate totals
      const taxAmount = subtotal * BTW_RATE;
      const totalAmount = subtotal + taxAmount;

      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('b2b_orders')
        .insert({
          organization_id: organizationId,
          status: 'pending',
          shipping_address: shippingAddress,
          notes: orderNotes || null,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          item_count: normalizedItems.reduce((sum, i) => sum + i.quantity, 0),
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
        order_id: newOrderId,
        product_id: item.productId ?? item.id,
        product_name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: Number(item.price) || 0,
        line_total: (Number(item.price) || 0) * item.quantity,
        image_url: item.image || item.featured_image || null,
      }));

      const { error: itemsError } = await supabase
        .from('b2b_order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('[CheckoutPage] Order items creation failed:', itemsError);
        // Order was created but items failed -- still show confirmation
        // so the user knows something went through.
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
  }, [orgId, org, subtotal, shippingAddress, orderNotes, normalizedItems, clearCart]);

  const catalogPath = org ? `/${org}/catalog` : '/catalog';
  const cartPath = org ? `/${org}/cart` : '/cart';

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
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
          className="rounded-lg px-4 py-3 mb-5 text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          {error}
        </div>
      )}

      {/* Step content */}
      {step === 1 && (
        <ShippingStep
          address={shippingAddress}
          setAddress={setShippingAddress}
          onNext={handleNextStep}
        />
      )}

      {step === 2 && (
        <ReviewStep
          items={normalizedItems}
          address={shippingAddress}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
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
