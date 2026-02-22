// ---------------------------------------------------------------------------
// PreviewProductDetailPage.jsx -- Full product detail page for the store
// builder preview iframe. Renders product info, image gallery, quantity
// selector, specifications, bulk pricing, and related products.
//
// Uses CSS custom properties (--ws-*) for theming. Data comes from props;
// optionally fetches richer data from DB via getB2BProduct when orgId is set.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  Package,
  ShoppingCart,
  Check,
  Minus,
  Plus,
  ArrowLeft,
  Star,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value) {
  if (value == null) return null;
  return `\u20AC${Number(value).toFixed(2)}`;
}

function getStockInfo(product) {
  const stock = product.stock;
  if (stock == null) return { label: 'In Stock', dotColor: '#22c55e', available: true };
  if (typeof stock === 'string') {
    const lower = stock.toLowerCase();
    if (lower.includes('out')) return { label: 'Out of Stock', dotColor: '#ef4444', available: false };
    if (lower.includes('limited') || lower.includes('low')) return { label: 'Limited Stock', dotColor: '#f59e0b', available: true };
    return { label: 'In Stock', dotColor: '#22c55e', available: true };
  }
  if (typeof stock === 'number') {
    if (stock <= 0) return { label: 'Out of Stock', dotColor: '#ef4444', available: false };
    if (stock <= 10) return { label: 'Limited Stock', dotColor: '#f59e0b', available: true };
    return { label: 'In Stock', dotColor: '#22c55e', available: true };
  }
  return { label: 'In Stock', dotColor: '#22c55e', available: true };
}

/**
 * Collect all displayable image URLs from a product object.
 */
function collectImages(product) {
  const images = [];
  if (product?.featured_image) images.push(product.featured_image);
  if (product?.image && !images.includes(product.image)) images.push(product.image);
  if (Array.isArray(product?.gallery)) {
    product.gallery.forEach((url) => {
      if (url && !images.includes(url)) images.push(url);
    });
  }
  return images;
}

/**
 * Parse specifications from various formats into { key, value } pairs.
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
// Sub-components
// ---------------------------------------------------------------------------

function Breadcrumb({ product, nav }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs flex-wrap mb-6" style={{ color: 'var(--ws-muted)' }}>
      <button
        onClick={() => nav?.goToHome?.()}
        className="hover:underline transition-colors"
        style={{ color: 'var(--ws-muted)' }}
      >
        Home
      </button>
      <ChevronRight className="w-3 h-3 flex-shrink-0" />
      <button
        onClick={() => nav?.goToCatalog?.()}
        className="hover:underline transition-colors"
        style={{ color: 'var(--ws-muted)' }}
      >
        Catalog
      </button>
      <ChevronRight className="w-3 h-3 flex-shrink-0" />
      <span style={{ color: 'var(--ws-text)' }}>{product?.name || 'Product'}</span>
    </nav>
  );
}

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
        <Package className="w-20 h-20" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
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
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 4).map((url, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden transition-all duration-200"
              style={{
                backgroundColor: 'var(--ws-surface)',
                border:
                  idx === activeIndex
                    ? '2px solid var(--ws-primary)'
                    : '1px solid var(--ws-border)',
                opacity: idx === activeIndex ? 1 : 0.6,
              }}
            >
              <img
                src={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuantitySelector({ value, onChange }) {
  const handleDecrement = () => onChange(Math.max(1, value - 1));
  const handleIncrement = () => onChange(Math.min(9999, value + 1));
  const handleInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10);
    if (isNaN(num)) {
      onChange(1);
    } else {
      onChange(Math.max(1, Math.min(9999, num)));
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--ws-border)' }}
    >
      <button
        onClick={handleDecrement}
        disabled={value <= 1}
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
        disabled={value >= 9999}
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
                backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
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

function BulkPricingTable({ basePrice }) {
  const price = basePrice || 0;
  const tiers = [
    { range: '1 - 9', unitPrice: price, savings: null },
    { range: '10 - 49', unitPrice: price * 0.9, savings: '10%' },
    { range: '50 - 99', unitPrice: price * 0.8, savings: '20%' },
    { range: '100+', unitPrice: price * 0.67, savings: '33%' },
  ];

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
        Volume Pricing
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ws-border)' }}>
            <th
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ws-muted)' }}
            >
              Quantity
            </th>
            <th
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ws-muted)' }}
            >
              Price Per Unit
            </th>
            <th
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ws-muted)' }}
            >
              Savings
            </th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, i) => (
            <tr
              key={tier.range}
              style={{
                borderBottom:
                  i < tiers.length - 1 ? '1px solid var(--ws-border)' : 'none',
              }}
            >
              <td className="px-5 py-3 font-medium" style={{ color: 'var(--ws-text)' }}>
                {tier.range}
              </td>
              <td className="px-5 py-3 font-semibold" style={{ color: 'var(--ws-primary)' }}>
                {formatPrice(tier.unitPrice)}
              </td>
              <td className="px-5 py-3" style={{ color: 'var(--ws-muted)' }}>
                {tier.savings ? (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      color: '#22c55e',
                    }}
                  >
                    Save {tier.savings}
                  </span>
                ) : (
                  <span className="text-xs">Base price</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedProducts({ products, currentId, nav }) {
  const related = useMemo(() => {
    return products
      .filter((p) => p.id !== currentId)
      .slice(0, 4);
  }, [products, currentId]);

  if (related.length === 0) return null;

  return (
    <div className="mt-12">
      <h2
        className="text-lg font-bold mb-4"
        style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
      >
        Related Products
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {related.map((product) => (
          <div
            key={product.id}
            onClick={() => nav?.goToProduct(product.id)}
            className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            style={{
              backgroundColor: 'var(--ws-surface)',
              border: '1px solid var(--ws-border)',
            }}
          >
            <div
              className="aspect-square flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'var(--ws-bg)' }}
            >
              {product.image || product.featured_image ? (
                <img
                  src={product.image || product.featured_image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <Package
                  className="w-8 h-8 opacity-15"
                  style={{ color: 'var(--ws-muted)' }}
                />
              )}
            </div>
            <div className="p-3">
              <h3
                className="text-xs font-medium truncate mb-1"
                style={{ color: 'var(--ws-text)' }}
              >
                {product.name}
              </h3>
              {product.price != null && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--ws-primary)' }}
                >
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo fallback data
// ---------------------------------------------------------------------------

const DEMO_SPECS = {
  Weight: '2.4 kg',
  Dimensions: '240 x 180 x 55 mm',
  Material: 'Stainless Steel 304',
  Color: 'Silver',
  Warranty: '24 months',
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * PreviewProductDetailPage
 *
 * Full product detail page for the store builder preview.
 * Supports image gallery, quantity selector, add-to-cart, specifications,
 * bulk pricing, and related products.
 *
 * Props:
 *   config   - Store config (uses config.productDetail for settings)
 *   products - Array of all products (for related products + fallback)
 *   pageData - { productId } identifying which product to show
 *   orgId    - Organization ID for DB fetching
 *   cart     - { addItem }
 *   nav      - { goToCatalog, goToProduct, goBack, goToHome }
 */
export default function PreviewProductDetailPage({
  config,
  products = [],
  pageData,
  orgId,
  cart,
  nav,
}) {
  const pd = config?.productDetail || {};
  const imagePosition = pd.imagePosition || 'left';
  const showSKU = pd.showSKU !== false;
  const showStock = pd.showStock !== false;
  const showSpecifications = pd.showSpecifications !== false;
  const showBulkPricing = pd.showBulkPricing !== false;
  const showRelatedProducts = pd.showRelatedProducts !== false;
  const showInquiryButton = pd.showInquiryButton !== false;

  // State
  const [product, setProduct] = useState(null);
  const [dbProduct, setDbProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Resolve product from products array
  useEffect(() => {
    const productId = pageData?.productId;
    if (productId && products.length > 0) {
      const found = products.find(
        (p) => p.id === productId || String(p.id) === String(productId),
      );
      setProduct(found || products[0]);
    } else if (products.length > 0) {
      setProduct(products[0]);
    }
    // Reset gallery and quantity on product change
    setActiveImageIndex(0);
    setQuantity(1);
    setAddedToCart(false);
  }, [pageData?.productId, products]);

  // Optionally fetch richer data from DB
  useEffect(() => {
    const productId = pageData?.productId;
    if (!productId || !orgId) return;
    let cancelled = false;

    async function fetchFromDB() {
      try {
        const { getB2BProduct } = await import('@/lib/db/queries/b2b');
        const data = await getB2BProduct(productId);
        if (!cancelled && data) {
          setDbProduct(data);
        }
      } catch {
        // Silently ignore -- fallback to products array
      }
    }

    fetchFromDB();
    return () => { cancelled = true; };
  }, [pageData?.productId, orgId]);

  // Merge product data with DB data
  const mergedProduct = useMemo(() => {
    if (!product) return null;
    if (!dbProduct) return product;

    return {
      ...product,
      featured_image: dbProduct.featured_image || product.featured_image || product.image,
      gallery: dbProduct.gallery || product.gallery || [],
      specifications:
        dbProduct.physical_products?.[0]?.specifications ||
        dbProduct.specifications ||
        product.specifications,
      description: dbProduct.description || product.description,
    };
  }, [product, dbProduct]);

  // Derived data
  const images = useMemo(() => collectImages(mergedProduct), [mergedProduct]);
  const stockInfo = mergedProduct ? getStockInfo(mergedProduct) : { label: 'In Stock', dotColor: '#22c55e', available: true };
  const basePrice = mergedProduct?.price ?? mergedProduct?.b2b_price ?? 0;

  const specifications = useMemo(() => {
    if (mergedProduct?.specifications) return mergedProduct.specifications;
    return DEMO_SPECS;
  }, [mergedProduct]);

  // Handlers
  const handleAddToCart = useCallback(() => {
    if (!mergedProduct || addedToCart) return;
    cart?.addItem(mergedProduct, quantity);
    setAddedToCart(true);
  }, [mergedProduct, quantity, cart, addedToCart]);

  useEffect(() => {
    if (!addedToCart) return;
    const timer = setTimeout(() => setAddedToCart(false), 2000);
    return () => clearTimeout(timer);
  }, [addedToCart]);

  // Not found state
  if (!mergedProduct && products.length === 0) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center gap-4"
        style={{ fontFamily: 'var(--ws-font)' }}
      >
        <Package className="w-16 h-16" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          Product Not Found
        </h2>
        <p className="text-sm" style={{ color: 'var(--ws-muted)' }}>
          The product you are looking for is not available.
        </p>
        <button
          onClick={() => nav?.goToCatalog?.()}
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

  // Use fallback if product not yet resolved
  const p = mergedProduct || products[0] || {};
  const productName = p.name || 'Product';
  const productSku = p.sku || '';
  const productCategory = p.category || 'Products';
  const productDescription =
    p.description ||
    'High-quality product designed for professional use. Built with premium materials and backed by our standard warranty.';

  // Build the two main columns
  const imageColumn = (
    <ImageGallery
      images={images}
      activeIndex={activeImageIndex}
      onSelect={setActiveImageIndex}
    />
  );

  const infoColumn = (
    <div className="flex flex-col gap-5">
      {/* Product name */}
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight"
        style={{ fontFamily: 'var(--ws-heading-font)', color: 'var(--ws-text)' }}
      >
        {productName}
      </h1>

      {/* SKU */}
      {showSKU && productSku && (
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)' }}
        >
          SKU: {productSku}
        </p>
      )}

      {/* Category badge */}
      <span
        className="inline-flex self-start items-center px-2.5 py-1 rounded-md text-xs font-medium"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          color: 'var(--ws-muted)',
          border: '1px solid var(--ws-border)',
        }}
      >
        {productCategory}
      </span>

      {/* Stock indicator */}
      {showStock && (
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: stockInfo.dotColor }}
          />
          <span className="text-sm font-medium" style={{ color: stockInfo.dotColor }}>
            {stockInfo.label}
          </span>
        </div>
      )}

      {/* Price */}
      {basePrice > 0 && (
        <span
          className="text-3xl font-bold"
          style={{ color: 'var(--ws-primary)' }}
        >
          {formatPrice(basePrice)}
        </span>
      )}

      {/* Description */}
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--ws-muted)' }}
      >
        {productDescription}
      </p>

      {/* Quantity selector */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)' }}
        >
          Quantity
        </label>
        <QuantitySelector value={quantity} onChange={setQuantity} />
      </div>

      {/* Add to Cart button */}
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
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </>
        )}
      </button>

      {/* Request Quote button */}
      {showInquiryButton && (
        <button
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-80"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--ws-text)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <Star className="w-4 h-4" />
          Request Quote
        </button>
      )}
    </div>
  );

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ fontFamily: 'var(--ws-font)', color: 'var(--ws-text)' }}
    >
      {/* Breadcrumb */}
      <Breadcrumb product={p} nav={nav} />

      {/* Main layout: image + info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {imagePosition === 'right' ? (
          <>
            {infoColumn}
            {imageColumn}
          </>
        ) : (
          <>
            {imageColumn}
            {infoColumn}
          </>
        )}
      </div>

      {/* Specifications */}
      {showSpecifications && (
        <div className="mt-12">
          <SpecificationsTable specs={specifications} />
        </div>
      )}

      {/* Bulk pricing */}
      {showBulkPricing && basePrice > 0 && (
        <div className="mt-8">
          <BulkPricingTable basePrice={basePrice} />
        </div>
      )}

      {/* Related products */}
      {showRelatedProducts && products.length > 1 && (
        <RelatedProducts
          products={products}
          currentId={p.id}
          nav={nav}
        />
      )}
    </div>
  );
}
