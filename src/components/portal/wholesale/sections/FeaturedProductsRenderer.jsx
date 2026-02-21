import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus } from 'lucide-react';
import { useWholesale } from '../WholesaleProvider';

/**
 * FeaturedProductsRenderer
 *
 * Grid of product cards for the B2B wholesale storefront.
 * Renders placeholder cards until real product data is wired in.
 * Supports configurable columns, card styles, and pricing/inquiry visibility.
 */

const PLACEHOLDER_PRODUCTS = [
  { id: 'ph-1', name: 'Premium Widget A', price: 24.99, sku: 'WDG-001' },
  { id: 'ph-2', name: 'Industrial Component B', price: 89.50, sku: 'IND-002' },
  { id: 'ph-3', name: 'Bulk Fastener Set', price: 12.75, sku: 'FST-003' },
  { id: 'ph-4', name: 'Precision Tool Kit', price: 149.00, sku: 'TLK-004' },
  { id: 'ph-5', name: 'Safety Equipment Pack', price: 67.25, sku: 'SFT-005' },
  { id: 'ph-6', name: 'Electrical Module X', price: 42.00, sku: 'ELC-006' },
  { id: 'ph-7', name: 'Heavy Duty Bracket', price: 18.90, sku: 'BRK-007' },
  { id: 'ph-8', name: 'Custom Assembly Unit', price: 215.00, sku: 'ASM-008' },
];

/**
 * Map columns number to Tailwind grid classes.
 * Mobile: 1-2 cols, Tablet: 2-3 cols, Desktop: user-defined.
 */
function getGridClasses(columns) {
  const desktop = Math.min(Math.max(columns || 4, 2), 6);
  const desktopMap = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };
  return `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${desktopMap[desktop] || 'lg:grid-cols-4'}`;
}

/**
 * Detailed product card: image, name, sku, price, button.
 */
function DetailedCard({ product, showPricing, showQuickInquiry, onAddToCart, onNavigate }) {
  return (
    <div
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
      onClick={() => onNavigate?.(product.id)}
    >
      {/* Image placeholder */}
      <div
        className="relative flex items-center justify-center aspect-square"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <ShoppingBag
          className="w-12 h-12 transition-transform duration-200 group-hover:scale-110"
          style={{ color: 'var(--ws-muted)' }}
        />
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)' }}
        >
          {product.sku}
        </p>
        <h3
          className="text-base font-semibold leading-snug"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>

        {showPricing && (
          <p
            className="text-lg font-bold mt-auto pt-2"
            style={{ color: 'var(--ws-primary)' }}
          >
            ${(product.price || 0).toFixed(2)}
          </p>
        )}

        {showQuickInquiry ? (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate?.(product.id); }}
            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 hover:opacity-90"
            style={{
              backgroundColor: 'var(--ws-primary)',
              color: 'var(--ws-bg)',
            }}
          >
            <Plus className="w-4 h-4" />
            Quick Inquiry
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 hover:opacity-90"
            style={{
              backgroundColor: 'var(--ws-primary)',
              color: 'var(--ws-bg)',
            }}
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact card: smaller image, inline layout.
 */
function CompactCard({ product, showPricing, showQuickInquiry, onAddToCart, onNavigate }) {
  return (
    <div
      className="group flex items-center gap-4 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
      onClick={() => onNavigate?.(product.id)}
    >
      {/* Small image placeholder */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-lg"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        <ShoppingBag className="w-6 h-6" style={{ color: 'var(--ws-muted)' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>
        {showPricing && (
          <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--ws-primary)' }}>
            ${(product.price || 0).toFixed(2)}
          </p>
        )}
      </div>

      {/* Action */}
      <button
        onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 hover:opacity-90"
        style={{
          backgroundColor: 'var(--ws-primary)',
          color: 'var(--ws-bg)',
        }}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Minimal card: text only, very clean.
 */
function MinimalCard({ product, showPricing, onNavigate }) {
  return (
    <div
      className="group flex items-center justify-between gap-4 rounded-lg px-4 py-3 transition-all duration-200 cursor-pointer"
      style={{
        border: '1px solid var(--ws-border)',
        backgroundColor: 'transparent',
      }}
      onClick={() => onNavigate?.(product.id)}
    >
      <div className="min-w-0">
        <h3
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--ws-muted)' }}>
          {product.sku}
        </p>
      </div>

      {showPricing && (
        <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--ws-primary)' }}>
          ${(product.price || 0).toFixed(2)}
        </span>
      )}
    </div>
  );
}

const CARD_COMPONENTS = {
  detailed: DetailedCard,
  compact: CompactCard,
  minimal: MinimalCard,
};

export default function FeaturedProductsRenderer({ section, theme }) {
  const navigate = useNavigate();
  const { addToCart } = useWholesale();

  const {
    heading = '',
    subheading = '',
    productIds = [],
    maxItems = 8,
    columns = 4,
    showPricing = true,
    showQuickInquiry = false,
    cardStyle = 'detailed',
  } = section?.props || {};

  // Use placeholder data until real products are wired in
  const products = PLACEHOLDER_PRODUCTS.slice(0, Math.min(maxItems, 8));

  const CardComponent = CARD_COMPONENTS[cardStyle] || DetailedCard;
  const gridClasses = getGridClasses(columns);

  const handleNavigate = (productId) => {
    navigate(`product/${productId}`);
  };

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price || 0,
      sku: product.sku,
      quantity: 1,
    });
  };

  return (
    <section
      className="w-full px-6 sm:px-10 lg:px-20 py-16 lg:py-20"
      style={{
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
        backgroundColor: 'var(--ws-bg)',
      }}
    >
      {/* Section header */}
      {(heading || subheading) && (
        <div className="mb-10 max-w-2xl">
          {heading && (
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3"
              style={{ fontFamily: 'var(--ws-heading-font)' }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p className="text-base lg:text-lg leading-relaxed" style={{ color: 'var(--ws-muted)' }}>
              {subheading}
            </p>
          )}
        </div>
      )}

      {/* Product grid */}
      <div className={`grid gap-5 ${gridClasses}`}>
        {products.map((product) => (
          <CardComponent
            key={product.id}
            product={product}
            showPricing={showPricing}
            showQuickInquiry={showQuickInquiry}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </section>
  );
}
