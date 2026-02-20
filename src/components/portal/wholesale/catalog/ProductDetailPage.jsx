import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  MessageSquare,
  Package,
  Minus,
  Plus,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import StockIndicator from './StockIndicator';
import BulkPricingTable from './BulkPricingTable';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value, currency = 'EUR') {
  if (value == null) return '--';
  try {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

/**
 * Resolve the effective unit price for the given quantity from bulk tiers.
 * Falls back to the product base price when no tier matches.
 */
function resolveUnitPrice(tiers, quantity, basePrice) {
  if (!tiers || tiers.length === 0) return basePrice || 0;
  for (const tier of tiers) {
    const min = tier.min_quantity ?? 0;
    const max = tier.max_quantity ?? Infinity;
    if (quantity >= min && quantity <= max) return tier.unit_price;
  }
  return basePrice || (tiers[0]?.unit_price ?? 0);
}

/**
 * Collect all displayable image URLs from the product.
 */
function collectImages(product) {
  const images = [];
  if (product?.featured_image) images.push(product.featured_image);
  if (Array.isArray(product?.gallery)) {
    product.gallery.forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
  }
  // Fallback to physical_products images
  const physical = product?.physical_products;
  if (physical) {
    const pp = Array.isArray(physical) ? physical[0] : physical;
    if (pp?.image_url && !images.includes(pp.image_url)) images.push(pp.image_url);
    if (Array.isArray(pp?.images)) {
      pp.images.forEach((url) => {
        if (url && !images.includes(url)) images.push(url);
      });
    }
  }
  return images;
}

/**
 * Parse specifications JSONB into a flat array of { key, value } pairs.
 */
function parseSpecifications(specs) {
  if (!specs) return [];
  if (Array.isArray(specs)) {
    return specs.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const key = item.key || item.label || item.name || `Spec ${i + 1}`;
        const value = item.value ?? item.description ?? '';
        return { key, value: String(value) };
      }
      return { key: `Spec ${i + 1}`, value: String(item) };
    });
  }
  if (typeof specs === 'object') {
    return Object.entries(specs).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Inquiry Modal
// ---------------------------------------------------------------------------

function InquiryModal({ product, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate API call -- replace with real inquiry endpoint when available
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
          fontFamily: 'var(--ws-font)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:opacity-70"
          style={{ color: 'var(--ws-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}
            >
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <h3
              className="text-xl font-bold"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Inquiry Sent
            </h3>
            <p className="text-sm text-center" style={{ color: 'var(--ws-muted)' }}>
              We have received your inquiry for{' '}
              <strong style={{ color: 'var(--ws-text)' }}>{product?.name}</strong>.
              {' '}Our team will get back to you shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--ws-primary)',
                color: 'var(--ws-bg)',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3
              className="text-xl font-bold mb-1"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              Request a Quote
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--ws-muted)' }}>
              Get custom pricing for{' '}
              <strong style={{ color: 'var(--ws-text)' }}>{product?.name}</strong>
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    border: '1px solid var(--ws-border)',
                    color: 'var(--ws-text)',
                  }}
                  placeholder="Tell us about your requirements, quantities, and timeline..."
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-90 disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--ws-primary)',
                  color: 'var(--ws-bg)',
                }}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Submit Inquiry
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image Gallery
// ---------------------------------------------------------------------------

function ImageGallery({ images, activeIndex, onSelect }) {
  if (images.length === 0) {
    return (
      <div
        className="aspect-square rounded-xl flex items-center justify-center"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <Package className="w-20 h-20" style={{ color: 'var(--ws-muted)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="aspect-square rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
      >
        <img
          src={images[activeIndex] || images[0]}
          alt="Product"
          className="w-full h-full object-contain p-4"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement.innerHTML =
              '<div class="flex items-center justify-center w-full h-full"><svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--ws-muted)"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
          }}
        />
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 5).map((url, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden transition-all duration-200"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: idx === activeIndex
                  ? '2px solid var(--ws-primary)'
                  : '1px solid var(--ws-border)',
                opacity: idx === activeIndex ? 1 : 0.6,
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantity Selector
// ---------------------------------------------------------------------------

function QuantitySelector({ value, onChange, min = 1, max = 9999 }) {
  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };
  const handleIncrement = () => {
    onChange(Math.min(max, value + 1));
  };
  const handleInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10);
    if (isNaN(num)) {
      onChange(min);
    } else {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--ws-border)' }}
    >
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:opacity-80 disabled:opacity-30"
        style={{
          backgroundColor: 'var(--ws-surface)',
          color: 'var(--ws-text)',
          borderRight: '1px solid var(--ws-border)',
        }}
        aria-label="Decrease quantity"
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleInput}
        className="w-16 h-10 text-center text-sm font-semibold outline-none bg-transparent"
        style={{
          color: 'var(--ws-text)',
          fontFamily: 'var(--ws-font)',
        }}
        aria-label="Quantity"
      />

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:opacity-80 disabled:opacity-30"
        style={{
          backgroundColor: 'var(--ws-surface)',
          color: 'var(--ws-text)',
          borderLeft: '1px solid var(--ws-border)',
        }}
        aria-label="Increase quantity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Specifications Table
// ---------------------------------------------------------------------------

function SpecificationsTable({ specs }) {
  const rows = useMemo(() => parseSpecifications(specs), [specs]);

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <h3
        className="px-5 py-4 text-base font-bold"
        style={{
          color: 'var(--ws-text)',
          fontFamily: 'var(--ws-heading-font)',
          borderBottom: '1px solid var(--ws-border)',
        }}
      >
        Specifications
      </h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom:
                  i < rows.length - 1 ? '1px solid var(--ws-border)' : 'none',
              }}
            >
              <td
                className="px-5 py-3 font-medium whitespace-nowrap"
                style={{ color: 'var(--ws-muted)', width: '40%' }}
              >
                {row.key}
              </td>
              <td className="px-5 py-3" style={{ color: 'var(--ws-text)' }}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ fontFamily: 'var(--ws-font)' }}
    >
      {/* Back link placeholder */}
      <div
        className="w-36 h-5 rounded mb-8 animate-pulse"
        style={{ backgroundColor: 'var(--ws-surface)' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image placeholder */}
        <div
          className="aspect-square rounded-xl animate-pulse"
          style={{ backgroundColor: 'var(--ws-surface)' }}
        />

        {/* Info placeholders */}
        <div className="flex flex-col gap-4">
          <div
            className="h-8 rounded w-3/4 animate-pulse"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-4 rounded w-1/2 animate-pulse"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-16 rounded-xl w-full animate-pulse mt-4"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-10 rounded w-40 animate-pulse mt-4"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
          <div
            className="h-12 rounded-lg w-full animate-pulse mt-4"
            style={{ backgroundColor: 'var(--ws-surface)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not Found
// ---------------------------------------------------------------------------

function NotFound({ navigate, orgId }) {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center gap-4"
      style={{ fontFamily: 'var(--ws-font)' }}
    >
      <Package className="w-16 h-16" style={{ color: 'var(--ws-muted)' }} />
      <h2
        className="text-2xl font-bold"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Product Not Found
      </h2>
      <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
        The product you are looking for does not exist or has been removed.
      </p>
      <button
        onClick={() => navigate(orgId ? `/portal/${orgId}/shop/catalog` : -1)}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-90"
        style={{
          backgroundColor: 'var(--ws-primary)',
          color: 'var(--ws-bg)',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductDetailPage
// ---------------------------------------------------------------------------

export default function ProductDetailPage() {
  const { productId, org } = useParams();
  const navigate = useNavigate();
  const { addToCart, orgId: ctxOrgId } = useWholesale();
  const orgId = org || ctxOrgId;

  // State
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Fetch product
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setError('No product ID');
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*, physical_products(*), inventory(*)')
          .eq('id', productId)
          .single();

        if (cancelled) return;

        if (fetchError) {
          console.error('[ProductDetailPage] Fetch error:', fetchError);
          setError(fetchError.message);
          setProduct(null);
        } else {
          setProduct(data);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[ProductDetailPage] Unexpected error:', err);
        setError(err.message || 'Failed to load product');
        setProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => { cancelled = true; };
  }, [productId]);

  // Derived data
  const images = useMemo(() => collectImages(product), [product]);

  const inventory = useMemo(() => {
    if (!product?.inventory) return null;
    return Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
  }, [product]);

  const physicalProduct = useMemo(() => {
    if (!product?.physical_products) return null;
    return Array.isArray(product.physical_products)
      ? product.physical_products[0]
      : product.physical_products;
  }, [product]);

  const bulkTiers = useMemo(() => {
    const tiers = product?.bulk_pricing || product?.pricing_tiers || physicalProduct?.bulk_pricing;
    if (!Array.isArray(tiers)) return [];
    return [...tiers].sort((a, b) => (a.min_quantity ?? 0) - (b.min_quantity ?? 0));
  }, [product, physicalProduct]);

  const basePrice = product?.price ?? product?.unit_price ?? physicalProduct?.price ?? 0;
  const effectiveUnitPrice = resolveUnitPrice(bulkTiers, quantity, basePrice);
  const lineTotal = effectiveUnitPrice * quantity;
  const currency = product?.currency || 'EUR';

  const sku = product?.sku || physicalProduct?.sku || null;
  const ean = product?.ean || product?.barcode || physicalProduct?.ean || physicalProduct?.barcode || null;

  const specifications = physicalProduct?.specifications || product?.specifications || null;

  // Handlers
  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: effectiveUnitPrice,
        sku,
        featured_image: images[0] || null,
      },
      quantity,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, quantity, effectiveUnitPrice, sku, images, addToCart]);

  const handleBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(orgId ? `/portal/${orgId}/shop/catalog` : '/');
    }
  }, [navigate, orgId]);

  // Render states
  if (loading) return <Skeleton />;
  if (error || !product) return <NotFound navigate={navigate} orgId={orgId} />;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--ws-bg)',
        color: 'var(--ws-text)',
        fontFamily: 'var(--ws-font)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors hover:opacity-80"
          style={{ color: 'var(--ws-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>

        {/* ---------------------------------------------------------------- */}
        {/* Top section: Image + Product Info                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <ImageGallery
            images={images}
            activeIndex={activeImageIndex}
            onSelect={setActiveImageIndex}
          />

          {/* Product Info */}
          <div className="flex flex-col gap-5">
            {/* Name */}
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {product.name}
            </h1>

            {/* SKU / EAN */}
            {(sku || ean) && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                {sku && <span>SKU: {sku}</span>}
                {sku && ean && (
                  <span
                    className="w-px h-3"
                    style={{ backgroundColor: 'var(--ws-border)' }}
                  />
                )}
                {ean && <span>EAN: {ean}</span>}
              </div>
            )}

            {/* Price display */}
            <div
              className="rounded-xl px-5 py-4"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border: '1px solid var(--ws-border)',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{ color: 'var(--ws-muted)' }}
              >
                Price per unit
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--ws-primary)' }}>
                {formatCurrency(effectiveUnitPrice, currency)}
              </p>
              {bulkTiers.length > 1 && effectiveUnitPrice < basePrice && (
                <p className="text-xs mt-1" style={{ color: 'var(--ws-muted)' }}>
                  Base price:{' '}
                  <span className="line-through">{formatCurrency(basePrice, currency)}</span>
                </p>
              )}
            </div>

            {/* Quantity + Line total */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Quantity
                </label>
                <QuantitySelector value={quantity} onChange={setQuantity} />
              </div>

              <div className="flex flex-col gap-1.5 ml-auto sm:ml-0">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--ws-muted)' }}
                >
                  Line total
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--ws-text)' }}>
                  {formatCurrency(lineTotal, currency)}
                </span>
              </div>
            </div>

            {/* Stock indicator */}
            {inventory && (
              <div>
                <StockIndicator
                  quantityOnHand={inventory.quantity_on_hand ?? inventory.quantity ?? 0}
                  quantityReserved={inventory.quantity_reserved ?? 0}
                  expectedDeliveryDate={inventory.expected_delivery_date ?? null}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold transition-all duration-200 hover:opacity-90"
                style={{
                  backgroundColor: addedToCart ? '#22c55e' : 'var(--ws-primary)',
                  color: 'var(--ws-bg)',
                }}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={() => setShowInquiry(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--ws-text)',
                  border: '1px solid var(--ws-border)',
                }}
              >
                <MessageSquare className="w-4 h-4" />
                Request Quote
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Description                                                      */}
        {/* ---------------------------------------------------------------- */}
        {product.description && (
          <div
            className="mt-12 rounded-xl px-5 py-6 sm:px-8 sm:py-8"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <h3
              className="text-base font-bold mb-4"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              Description
            </h3>
            {product.description.includes('<') ? (
              <div
                className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed"
                style={{ color: 'var(--ws-muted)' }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--ws-muted)' }}
              >
                {product.description}
              </p>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Specifications                                                   */}
        {/* ---------------------------------------------------------------- */}
        {specifications && (
          <div className="mt-8">
            <SpecificationsTable specs={specifications} />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Bulk Pricing Table                                               */}
        {/* ---------------------------------------------------------------- */}
        {bulkTiers.length > 0 && (
          <div className="mt-8">
            <h3
              className="text-base font-bold mb-4"
              style={{
                color: 'var(--ws-text)',
                fontFamily: 'var(--ws-heading-font)',
              }}
            >
              Bulk Pricing
            </h3>
            <BulkPricingTable
              tiers={bulkTiers}
              currentQuantity={quantity}
              currency={currency}
            />
          </div>
        )}
      </div>

      {/* Inquiry Modal */}
      {showInquiry && (
        <InquiryModal product={product} onClose={() => setShowInquiry(false)} />
      )}
    </div>
  );
}
