// ---------------------------------------------------------------------------
// PreviewCatalogPage.jsx -- Premium B2B wholesale catalog page for the store
// builder preview. Glass-morphism design system, stagger animations, inline
// quantity inputs, MOQ badges, bulk pricing, stock indicators, and pagination.
//
// Renders entirely from props -- no router, no auth, no Supabase.
// Uses CSS custom properties (--ws-*) for theming.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardPlus,
  Check,
  SlidersHorizontal,
  Tag,
  Layers,
  X,
} from 'lucide-react';

import {
  GlassCard,
  SectionHeader,
  Breadcrumb,
  TrustBar,
  LoadingSkeleton,
  QuantityInput,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  GlassInput,
  motionVariants,
  glassCardStyle,
  gradientAccentBar,
  gradientTextStyle,
  formatCurrency,
  resolveImageUrl,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'sku_asc', label: 'SKU' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffectivePrice(product) {
  const p = product.price;
  if (p == null) return null;
  return typeof p === 'string' ? parseFloat(p) || null : p;
}

function getMoq(product) {
  return product.moq || product.minimum_order_quantity || 1;
}

function getStockStatus(product) {
  const stock = product.stock_quantity ?? product.stock;
  if (stock == null) return { label: 'In Stock', theme: 'success' };
  if (typeof stock === 'string') {
    const lower = stock.toLowerCase();
    if (lower.includes('out')) return { label: 'Out of Stock', theme: 'error' };
    if (lower.includes('limited') || lower.includes('low'))
      return { label: 'Low Stock', theme: 'warning' };
    return { label: 'In Stock', theme: 'success' };
  }
  if (typeof stock === 'number') {
    if (stock <= 0) return { label: 'Out of Stock', theme: 'error' };
    if (stock <= 10) return { label: 'Low Stock', theme: 'warning' };
    return { label: 'In Stock', theme: 'success' };
  }
  return { label: 'In Stock', theme: 'success' };
}

function isOutOfStock(product) {
  return getStockStatus(product).theme === 'error';
}

function getBulkPricing(product) {
  const tiers = product.bulk_pricing || product.pricing_tiers;
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) return null;
  // Find the tier with the highest quantity requirement
  const sorted = [...tiers].sort((a, b) => (a.quantity || a.min_qty || 0) - (b.quantity || b.min_qty || 0));
  const best = sorted[sorted.length - 1];
  if (!best) return null;
  const price = best.price ?? best.unit_price;
  const qty = best.quantity ?? best.min_qty;
  if (price == null || qty == null) return null;
  return { price, quantity: qty };
}

function getProductImage(product) {
  return resolveImageUrl(product.featured_image) || resolveImageUrl(product.image) || null;
}

// Stock theme colors (inline to use CSS vars for primary)
const STOCK_COLORS = {
  success: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  warning: { bg: 'rgba(234,179,8,0.12)', text: '#eab308', border: 'rgba(234,179,8,0.25)' },
  error: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryPills({ categories, selected, onSelect }) {
  return (
    <motion.div
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-2"
    >
      <button
        onClick={() => onSelect(null)}
        className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200"
        style={{
          background: selected === null
            ? 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))'
            : 'color-mix(in srgb, var(--ws-surface) 70%, transparent)',
          color: selected === null ? '#fff' : 'var(--ws-muted)',
          border: selected === null
            ? '1px solid var(--ws-primary)'
            : '1px solid var(--ws-border)',
          boxShadow: selected === null
            ? '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)'
            : 'none',
        }}
      >
        All Products
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200"
          style={{
            background: selected === cat
              ? 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))'
              : 'color-mix(in srgb, var(--ws-surface) 70%, transparent)',
            color: selected === cat ? '#fff' : 'var(--ws-muted)',
            border: selected === cat
              ? '1px solid var(--ws-primary)'
              : '1px solid var(--ws-border)',
            boxShadow: selected === cat
              ? '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)'
              : 'none',
          }}
        >
          {cat}
        </button>
      ))}
    </motion.div>
  );
}

function SortDropdown({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm font-medium outline-none cursor-pointer transition-all duration-200"
        style={{
          background: 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
          border: '1px solid var(--ws-border)',
          color: 'var(--ws-text)',
          backdropFilter: 'blur(8px)',
          minWidth: '180px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--ws-primary)';
          e.currentTarget.style.boxShadow =
            '0 0 0 3px color-mix(in srgb, var(--ws-primary) 15%, transparent)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--ws-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: 'var(--ws-muted)' }}
      />
    </div>
  );
}

function StockBadge({ product }) {
  const { label, theme } = getStockStatus(product);
  const colors = STOCK_COLORS[theme];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: colors.text,
          animation: theme === 'success' ? undefined : 'pulse 2s infinite',
        }}
      />
      {label}
    </span>
  );
}

function MoqBadge({ moq }) {
  if (moq <= 1) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
        color: 'var(--ws-primary)',
        border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
      }}
    >
      <Layers className="w-3 h-3" />
      MOQ: {moq}
    </span>
  );
}

function BulkPricingIndicator({ product }) {
  const bulk = getBulkPricing(product);
  if (!bulk) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium"
      style={{ color: 'var(--ws-primary)' }}
    >
      <Tag className="w-3 h-3" />
      From {formatCurrency(bulk.price)} at {bulk.quantity}+
    </span>
  );
}

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------

function ProductCard({ product, cart, nav, index }) {
  const [quantity, setQuantity] = useState(() => getMoq(product));
  const [added, setAdded] = useState(false);

  const effectivePrice = getEffectivePrice(product);
  const moq = getMoq(product);
  const outOfStock = isOutOfStock(product);
  const image = getProductImage(product);

  // Ensure quantity never drops below MOQ
  const handleQuantityChange = useCallback(
    (val) => {
      setQuantity(Math.max(moq, val));
    },
    [moq],
  );

  const handleAddToOrder = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (outOfStock || added) return;
      cart?.addItem(product, quantity);
      setAdded(true);
    },
    [product, cart, quantity, outOfStock, added],
  );

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <motion.div
      variants={motionVariants.staggerItem}
      custom={index}
      initial="hidden"
      animate="visible"
      layout
    >
      <GlassCard
        accentBar
        hoverable
        onClick={() => nav?.goToProduct(product.id)}
        className="flex flex-col h-full group"
      >
        {/* Image area */}
        <div
          className="relative aspect-square overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--ws-bg) 90%, var(--ws-surface))' }}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package
                className="w-14 h-14 opacity-15"
                style={{ color: 'var(--ws-muted)' }}
              />
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, color-mix(in srgb, var(--ws-bg) 40%, transparent) 0%, transparent 50%)',
            }}
          />

          {/* Stock badge */}
          <div className="absolute top-3 left-3">
            <StockBadge product={product} />
          </div>

          {/* MOQ badge */}
          <div className="absolute top-3 right-3">
            <MoqBadge moq={moq} />
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-col gap-2 p-5 flex-1">
          {/* SKU */}
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--ws-muted)' }}
          >
            {product.sku || 'N/A'}
          </p>

          {/* Name */}
          <h3
            className="text-sm font-bold leading-snug line-clamp-2"
            style={{
              color: 'var(--ws-text)',
              fontFamily: 'var(--ws-heading-font, var(--ws-font))',
            }}
          >
            {product.name}
          </h3>

          {/* Price row */}
          <div className="flex items-baseline gap-2 mt-1">
            {effectivePrice != null && (
              <span
                className="text-lg font-bold"
                style={gradientTextStyle()}
              >
                {formatCurrency(effectivePrice)}
              </span>
            )}
            {product.unit && (
              <span className="text-[11px]" style={{ color: 'var(--ws-muted)' }}>
                / {product.unit}
              </span>
            )}
          </div>

          {/* Bulk pricing indicator */}
          <BulkPricingIndicator product={product} />

          {/* Pack size */}
          {product.pack_size && (
            <span className="text-[11px]" style={{ color: 'var(--ws-muted)' }}>
              Pack size: {product.pack_size}
            </span>
          )}

          {/* Spacer to push actions to bottom */}
          <div className="mt-auto pt-4 space-y-3">
            {/* Quantity input */}
            <div
              className="flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
                Qty
              </span>
              <QuantityInput
                value={quantity}
                onChange={handleQuantityChange}
                min={moq}
                size="sm"
              />
            </div>

            {/* Add to Order button */}
            <button
              type="button"
              onClick={handleAddToOrder}
              disabled={outOfStock}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-250 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: added
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : outOfStock
                    ? 'var(--ws-surface)'
                    : 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))',
                color: outOfStock ? 'var(--ws-muted)' : '#fff',
                boxShadow: added
                  ? '0 2px 12px rgba(34,197,94,0.3)'
                  : outOfStock
                    ? 'none'
                    : '0 2px 8px color-mix(in srgb, var(--ws-primary) 30%, transparent)',
              }}
              onMouseEnter={(e) => {
                if (!outOfStock && !added) {
                  e.currentTarget.style.boxShadow =
                    '0 4px 20px color-mix(in srgb, var(--ws-primary) 40%, transparent)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!outOfStock && !added) {
                  e.currentTarget.style.boxShadow =
                    '0 2px 8px color-mix(in srgb, var(--ws-primary) 30%, transparent)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  Added to Order
                </>
              ) : outOfStock ? (
                'Out of Stock'
              ) : (
                <>
                  <ClipboardPlus className="w-4 h-4" />
                  Add to Order
                </>
              )}
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = useMemo(() => {
    const result = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (currentPage > 3) result.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) result.push(i);
      if (currentPage < totalPages - 2) result.push('...');
      result.push(totalPages);
    }
    return result;
  }, [currentPage, totalPages]);

  return (
    <motion.div
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-3 mt-12"
    >
      <div className="flex items-center gap-1.5">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            ...glassCardStyle,
            color: 'var(--ws-text)',
          }}
          onMouseEnter={(e) => {
            if (currentPage > 1) e.currentTarget.style.borderColor = 'var(--ws-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--ws-border)';
          }}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-10 h-10 flex items-center justify-center text-sm"
              style={{ color: 'var(--ws-muted)' }}
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  page === currentPage
                    ? 'linear-gradient(135deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 80%, #7c3aed))'
                    : 'color-mix(in srgb, var(--ws-surface) 60%, transparent)',
                color: page === currentPage ? '#fff' : 'var(--ws-text)',
                border:
                  page === currentPage
                    ? '1px solid var(--ws-primary)'
                    : '1px solid var(--ws-border)',
                boxShadow:
                  page === currentPage
                    ? '0 2px 8px color-mix(in srgb, var(--ws-primary) 25%, transparent)'
                    : 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            ...glassCardStyle,
            color: 'var(--ws-text)',
          }}
          onMouseEnter={(e) => {
            if (currentPage < totalPages) e.currentTarget.style.borderColor = 'var(--ws-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--ws-border)';
          }}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
        Page {currentPage} of {totalPages}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Active Filters Bar
// ---------------------------------------------------------------------------

function ActiveFilters({ searchQuery, selectedCategory, onClearSearch, onClearCategory, onClearAll }) {
  const hasFilters = searchQuery.trim() !== '' || selectedCategory !== null;
  if (!hasFilters) return null;

  return (
    <motion.div
      variants={motionVariants.fadeIn}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="flex items-center gap-2 flex-wrap"
    >
      <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
        Active filters:
      </span>
      {searchQuery.trim() && (
        <button
          onClick={onClearSearch}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
            color: 'var(--ws-primary)',
            border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
          }}
        >
          <Search className="w-3 h-3" />
          "{searchQuery}"
          <X className="w-3 h-3" />
        </button>
      )}
      {selectedCategory && (
        <button
          onClick={onClearCategory}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
            color: 'var(--ws-primary)',
            border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
          }}
        >
          {selectedCategory}
          <X className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={onClearAll}
        className="text-xs font-medium transition-colors"
        style={{ color: 'var(--ws-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
      >
        Clear all
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Results Header
// ---------------------------------------------------------------------------

function ResultsHeader({ count, sortBy, onSortChange }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
      <p className="text-sm font-medium" style={{ color: 'var(--ws-muted)' }}>
        <span className="font-bold" style={{ color: 'var(--ws-text)' }}>
          {count}
        </span>{' '}
        product{count !== 1 ? 's' : ''} available
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--ws-muted)' }} />
          <SortDropdown value={sortBy} onChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PreviewCatalogPage({ config, products = [], cart, nav }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return [...cats].sort();
  }, [products]);

  // Filtered + sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter -- name, SKU, description
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':
          return (getEffectivePrice(a) ?? 0) - (getEffectivePrice(b) ?? 0);
        case 'price_desc':
          return (getEffectivePrice(b) ?? 0) - (getEffectivePrice(a) ?? 0);
        case 'sku_asc':
          return (a.sku || '').localeCompare(b.sku || '');
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

  // Clamp page when filters change
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, page]);

  // Handlers
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  }, []);

  const handleCategorySelect = useCallback((cat) => {
    setSelectedCategory(cat);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((val) => {
    setSortBy(val);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPage(1);
  }, []);

  const hasFilters = searchQuery.trim() !== '' || selectedCategory !== null;

  return (
    <div
      className="w-full px-6 sm:px-10 lg:px-16 py-8"
      style={{
        fontFamily: 'var(--ws-font)',
        color: 'var(--ws-text)',
      }}
    >
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Home', onClick: () => nav?.goToHome() },
          { label: 'Product Catalog' },
        ]}
      />

      {/* Section Header */}
      <SectionHeader
        title="Product Catalog"
        subtitle="Browse our full range of wholesale products. All pricing shown is exclusive of VAT."
        action={
          cart?.itemCount > 0 ? (
            <SecondaryButton
              icon={ClipboardPlus}
              size="sm"
              onClick={() => nav?.goToCart()}
            >
              View Order ({cart.itemCount})
            </SecondaryButton>
          ) : null
        }
      />

      {/* Search bar */}
      <motion.div
        variants={motionVariants.fadeIn}
        initial="hidden"
        animate="visible"
        className="relative mb-5"
      >
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
          style={{ color: 'var(--ws-muted)' }}
        />
        <GlassInput
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by product name, SKU, or description..."
          className="pl-12"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setPage(1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--ws-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ws-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ws-muted)')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* Trust bar */}
      <TrustBar className="mb-6" />

      {/* Category pills + sort */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        {categories.length > 0 && (
          <CategoryPills
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        )}
        <ResultsHeader
          count={filteredProducts.length}
          sortBy={sortBy}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Active filters */}
      <AnimatePresence>
        {hasFilters && (
          <div className="mb-6">
            <ActiveFilters
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onClearSearch={() => {
                setSearchQuery('');
                setPage(1);
              }}
              onClearCategory={() => {
                setSelectedCategory(null);
                setPage(1);
              }}
              onClearAll={handleClearAll}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {isLoading ? (
        <LoadingSkeleton count={8} columns={4} />
      ) : paginatedProducts.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={Package}
          title="No products found"
          description={
            hasFilters
              ? 'No products match your current filters. Try adjusting your search or category selection.'
              : 'There are no products available in the catalog at this time.'
          }
          action={
            hasFilters ? (
              <PrimaryButton onClick={handleClearAll} size="sm">
                Clear All Filters
              </PrimaryButton>
            ) : null
          }
        />
      ) : (
        /* Product grid */
        <motion.div
          variants={motionVariants.container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {paginatedProducts.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              cart={cart}
              nav={nav}
              index={i}
            />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {!isLoading && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
