import React, { useState, useCallback, useEffect, memo } from 'react';
import { ShoppingCart, Check, Package, ImageOff, Loader2, Heart, Eye } from 'lucide-react';

/**
 * Stock status derived from inventory data.
 * Returns label, sublabel, dot color, and whether the product is purchasable.
 */
function getStockStatus(inventory) {
  if (!inventory) return { label: 'Checking...', sublabel: null, color: 'var(--ws-muted)', purchasable: false };

  const available = (inventory.quantity_on_hand ?? 0) - (inventory.quantity_reserved ?? 0);

  if (available <= 0) {
    return { label: 'Out of Stock', sublabel: null, color: '#ef4444', purchasable: false };
  }
  if (available <= 10) {
    return { label: 'Low Stock', sublabel: `${available} left`, color: '#f59e0b', purchasable: true };
  }
  return { label: 'In Stock', sublabel: null, color: '#22c55e', purchasable: true };
}

/**
 * Format a unit price for display.
 */
function formatPrice(pricing) {
  if (!pricing || pricing.unit_price == null) return null;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(pricing.unit_price);

  return formatted;
}

/**
 * Format a restock date for display.
 */
function formatRestockDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * StockIndicator
 *
 * Dot + text showing stock availability with improved detail.
 * Shows quantity for low stock, restock date for out of stock.
 */
function StockIndicator({ inventory, product }) {
  const { label, sublabel, color, purchasable } = getStockStatus(inventory);
  const restockDate = !purchasable ? formatRestockDate(product?.restock_date) : null;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--ws-muted)' }}
        >
          {label}
          {sublabel && (
            <span style={{ color }}> ({sublabel})</span>
          )}
        </span>
      </div>
      {restockDate && (
        <span
          className="text-[10px] ml-3.5"
          style={{ color: 'var(--ws-muted)' }}
        >
          Restocking: {restockDate}
        </span>
      )}
    </div>
  );
}

/**
 * PriceDisplay
 *
 * Shows the unit price styled with the primary color,
 * or a "Login for pricing" fallback.
 */
function PriceDisplay({ pricing, compact }) {
  const price = formatPrice(pricing);

  if (!price) {
    return (
      <span
        className={`${compact ? 'text-sm' : 'text-sm'} font-medium italic`}
        style={{ color: 'var(--ws-muted)' }}
      >
        Login for pricing
      </span>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`${compact ? 'text-base' : 'text-lg'} font-bold`}
        style={{ color: 'var(--ws-primary)' }}
      >
        {price}
      </span>
      {pricing.discount_percent > 0 && (
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
          }}
        >
          -{pricing.discount_percent}%
        </span>
      )}
    </div>
  );
}

/**
 * AddToCartButton
 *
 * Full-width button with loading spinner and success checkmark states.
 * Prevents event bubbling so clicking the button does not trigger card navigation.
 */
function AddToCartButton({ disabled, adding, added, onClick, compact }) {
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!disabled && !adding && !added) {
        onClick();
      }
    },
    [disabled, adding, added, onClick],
  );

  let content;
  if (added) {
    content = (
      <>
        <Check className="w-4 h-4" />
        <span>Added</span>
      </>
    );
  } else if (adding) {
    content = (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Adding...</span>
      </>
    );
  } else {
    content = (
      <>
        <ShoppingCart className="w-4 h-4" />
        <span>{compact ? 'Add' : 'Add to Cart'}</span>
      </>
    );
  }

  const isActive = added;
  const isDisabled = disabled || adding;

  return (
    <button
      type="button"
      disabled={isDisabled && !isActive}
      onClick={handleClick}
      className={`
        flex items-center justify-center gap-2 rounded-lg text-sm font-semibold
        transition-all duration-200
        ${compact ? 'px-3 py-2' : 'w-full px-4 py-2.5'}
        ${isDisabled && !isActive ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}
      `}
      style={{
        backgroundColor: isActive
          ? '#22c55e'
          : 'var(--ws-primary)',
        color: 'var(--ws-bg, #000)',
      }}
    >
      {content}
    </button>
  );
}

/**
 * ImagePlaceholder
 *
 * Shown when no product image is available.
 */
function ImagePlaceholder({ size }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
      <ImageOff
        className={size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'}
        style={{ color: 'var(--ws-muted)', opacity: 0.4 }}
      />
      {size !== 'sm' && (
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)', opacity: 0.3 }}
        >
          No image
        </span>
      )}
    </div>
  );
}

/**
 * FavoriteButton
 *
 * Heart icon toggle for favoriting a product.
 * Prevents event bubbling to avoid triggering card navigation.
 */
function FavoriteButton({ isFavorite, onToggle, productId, className = '' }) {
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      onToggle?.(productId);
    },
    [onToggle, productId],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${className}`}
      style={{
        backgroundColor: isFavorite ? 'rgba(244, 63, 94, 0.15)' : 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
      }}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className="w-4 h-4 transition-colors duration-200"
        style={{
          color: isFavorite ? '#f43f5e' : 'var(--ws-muted)',
          fill: isFavorite ? '#f43f5e' : 'none',
          opacity: isFavorite ? 1 : 0.6,
        }}
      />
    </button>
  );
}

/**
 * QuickViewButton
 *
 * Eye icon button for opening the quick view modal.
 * Prevents event bubbling to avoid triggering card navigation.
 */
function QuickViewButton({ onQuickView, product, className = '' }) {
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      onQuickView?.(product);
    },
    [onQuickView, product],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${className}`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
      }}
      aria-label="Quick view"
    >
      <Eye
        className="w-4 h-4 transition-colors duration-200"
        style={{
          color: 'var(--ws-muted)',
          opacity: 0.6,
        }}
      />
    </button>
  );
}

/**
 * GridCard
 *
 * Vertical product card for grid layout.
 * Image on top, product info and actions below.
 */
function GridCard({ product, pricing, inventory, stock, onAddToCart, onNavigate, compact, adding, added, isFavorite, onToggleFavorite, onQuickView }) {
  return (
    <div
      onClick={() => onNavigate(product.id)}
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
      role="article"
      aria-label={product.name}
    >
      {/* Image */}
      <div
        className="relative flex items-center justify-center aspect-square overflow-hidden"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        {product.featured_image ? (
          <img
            src={product.featured_image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder size="lg" />
        )}

        {/* Category badge */}
        {product.category_name && !compact && (
          <span
            className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'var(--ws-text)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {product.category_name}
          </span>
        )}

        {/* Top-right action buttons */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {onToggleFavorite && (
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              productId={product.id}
              className={isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            />
          )}
          {onQuickView && (
            <QuickViewButton
              onQuickView={onQuickView}
              product={product}
              className="opacity-0 group-hover:opacity-100"
            />
          )}
        </div>
      </div>

      {/* Details */}
      <div className={`flex flex-col gap-1.5 ${compact ? 'p-3' : 'p-4'} flex-1`}>
        {/* SKU */}
        <p
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)' }}
        >
          {product.sku}
        </p>

        {/* Product name - truncate to 2 lines */}
        <h3
          className={`${compact ? 'text-sm' : 'text-base'} font-semibold leading-snug line-clamp-2`}
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-auto pt-2">
          <PriceDisplay pricing={pricing} compact={compact} />
        </div>

        {/* Stock + Add to Cart */}
        <div className="flex items-center justify-between gap-3 mt-2">
          <StockIndicator inventory={inventory} product={product} />
        </div>

        <AddToCartButton
          disabled={!stock.purchasable}
          adding={adding}
          added={added}
          onClick={() => onAddToCart(product.id, 1)}
          compact={compact}
        />
      </div>
    </div>
  );
}

/**
 * ListCard
 *
 * Horizontal product card for list layout.
 * Image left, info center, price and actions right.
 */
function ListCard({ product, pricing, inventory, stock, onAddToCart, onNavigate, compact, adding, added, isFavorite, onToggleFavorite, onQuickView }) {
  return (
    <div
      onClick={() => onNavigate(product.id)}
      className="group flex items-center gap-4 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer p-3"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
      role="article"
      aria-label={product.name}
    >
      {/* Image */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-lg overflow-hidden"
        style={{ backgroundColor: 'var(--ws-bg)' }}
      >
        {product.featured_image ? (
          <img
            src={product.featured_image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder size="sm" />
        )}
      </div>

      {/* Center: name, sku, description */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
          style={{ color: 'var(--ws-muted)' }}
        >
          {product.sku}
        </p>
        <h3
          className="text-sm font-semibold leading-snug truncate"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>
        {product.description && !compact && (
          <p
            className="text-xs leading-relaxed mt-1 line-clamp-1"
            style={{ color: 'var(--ws-muted)' }}
          >
            {product.description}
          </p>
        )}
        {product.category_name && (
          <span
            className="inline-block text-[10px] font-medium uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--ws-muted)',
            }}
          >
            {product.category_name}
          </span>
        )}
      </div>

      {/* Action buttons: Quick View + Favorite */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {onQuickView && (
          <QuickViewButton
            onQuickView={onQuickView}
            product={product}
            className={`opacity-0 group-hover:opacity-100`}
          />
        )}
        {onToggleFavorite && (
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
            productId={product.id}
            className={isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          />
        )}
      </div>

      {/* Right: price, stock, add to cart */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <PriceDisplay pricing={pricing} compact />
        <StockIndicator inventory={inventory} product={product} />
        <AddToCartButton
          disabled={!stock.purchasable}
          adding={adding}
          added={added}
          onClick={() => onAddToCart(product.id, 1)}
          compact
        />
      </div>
    </div>
  );
}

/**
 * B2BProductCard
 *
 * Individual product card for the B2B catalog grid.
 * Supports grid (vertical) and list (horizontal) layouts.
 * Handles add-to-cart with loading spinner and success checkmark feedback.
 */
const B2BProductCard = memo(function B2BProductCard({
  product,
  pricing,
  inventory,
  onAddToCart,
  onNavigate,
  layout = 'grid',
  compact = false,
  isFavorite = false,
  onToggleFavorite,
  onQuickView,
}) {
  const [addingToCart, setAddingToCart] = useState(false);
  const [added, setAdded] = useState(false);

  // Reset added state after 2 seconds
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  const handleAddToCart = useCallback(
    async (productId, quantity) => {
      if (addingToCart || added) return;
      setAddingToCart(true);
      try {
        await Promise.resolve(onAddToCart(productId, quantity));
        setAdded(true);
      } catch {
        // Silently handle - parent should show toast
      } finally {
        setAddingToCart(false);
      }
    },
    [onAddToCart, addingToCart, added],
  );

  const stock = getStockStatus(inventory);

  const sharedProps = {
    product,
    pricing,
    inventory,
    stock,
    onAddToCart: handleAddToCart,
    onNavigate,
    compact,
    adding: addingToCart,
    added,
    isFavorite,
    onToggleFavorite,
    onQuickView,
  };

  if (layout === 'list') {
    return <ListCard {...sharedProps} />;
  }

  return <GridCard {...sharedProps} />;
});

export default B2BProductCard;
