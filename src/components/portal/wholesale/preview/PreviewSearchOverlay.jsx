// ---------------------------------------------------------------------------
// PreviewSearchOverlay.jsx -- Premium B2B wholesale search overlay.
// Fullscreen glass-morphism overlay with debounced product search, SKU lookup,
// stock indicators, bulk pricing hints, and keyboard navigation.
// Uses the shared preview design system for consistent styling.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Package, ClipboardPlus, Tag, Clock, TrendingUp } from 'lucide-react';
import {
  GlassCard,
  StatusBadge,
  QuantityInput,
  PrimaryButton,
  GlassInput,
  motionVariants,
  glassCardStyle,
  gradientTextStyle,
  formatCurrency,
} from './previewDesignSystem';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RESULTS = 8;

const MOCK_RECENT_SEARCHES = [
  'Circuit boards',
  'LED panels',
  'USB-C cables',
  'Power supplies',
  'Sensors',
];

// Stock thresholds for status dot colours
function getStockStatus(product) {
  const stock = product.stock ?? product.inventory ?? product.quantity ?? null;
  if (stock === null || stock === undefined) return 'unknown';
  if (stock <= 0) return 'out';
  if (stock < 10) return 'low';
  return 'in';
}

const STOCK_DOT = {
  in: { bg: '#22c55e', label: 'In Stock' },
  low: { bg: '#f59e0b', label: 'Low Stock' },
  out: { bg: '#ef4444', label: 'Out of Stock' },
  unknown: { bg: '#71717a', label: 'Stock N/A' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PreviewSearchOverlay({ isOpen, onClose, products = [], cart, nav }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus input when opened, reset on close
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Full results (unsliced) for count display
  const allMatched = useMemo(() => {
    if (!debouncedQuery) return [];
    const lower = debouncedQuery.toLowerCase();
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const description = (p.description || '').toLowerCase();
      return (
        name.includes(lower) ||
        sku.includes(lower) ||
        category.includes(lower) ||
        description.includes(lower)
      );
    });
  }, [products, debouncedQuery]);

  const results = useMemo(() => allMatched.slice(0, MAX_RESULTS), [allMatched]);

  // Unique categories for empty-state category pills
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).slice(0, 8);
  }, [products]);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleSelect = useCallback(
    (productId) => {
      nav?.goToProduct?.(productId);
      onClose();
    },
    [nav, onClose],
  );

  const handleAddToOrder = useCallback(
    (e, product) => {
      e.stopPropagation();
      const moq = product.moq || product.min_order || 1;
      cart?.addItem?.(product, moq);
    },
    [cart],
  );

  // Enter on single result navigates directly
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && results.length === 1) {
        handleSelect(results[0].id);
      }
    },
    [results, handleSelect],
  );

  const handleRecentSearch = useCallback((term) => {
    setQuery(term);
  }, []);

  const handleCategoryClick = useCallback((cat) => {
    setQuery(cat);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
          onClick={handleBackdropClick}
        >
          {/* Centered search card */}
          <div className="max-w-2xl mx-auto mt-20 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl overflow-hidden"
              style={{
                ...glassCardStyle,
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, var(--ws-primary) 20%, var(--ws-border))',
              }}
            >
              {/* Gradient accent bar at top */}
              <div
                style={{
                  height: '2px',
                  width: '100%',
                  background: 'linear-gradient(90deg, var(--ws-primary), color-mix(in srgb, var(--ws-primary) 40%, #a78bfa), color-mix(in srgb, var(--ws-primary) 20%, var(--ws-surface)))',
                }}
              />

              {/* Search input area */}
              <div
                className="flex items-center gap-3 px-5 py-4"
                style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
              >
                <Search
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: 'var(--ws-primary, #06b6d4)' }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by SKU, product name, or category..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
                  style={{
                    color: 'var(--ws-text, #fff)',
                    caretColor: 'var(--ws-primary, #06b6d4)',
                    fontFamily: 'var(--ws-font)',
                  }}
                />
                {/* Clear button when text present */}
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                    style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06] ml-1"
                  style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
                  aria-label="Close search"
                >
                  <kbd
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                      border: '1px solid var(--ws-border)',
                      color: 'var(--ws-muted)',
                    }}
                  >
                    ESC
                  </kbd>
                </button>
              </div>

              {/* Results area */}
              <div className="max-h-[460px] overflow-y-auto">
                {!debouncedQuery ? (
                  /* ---------- Empty state: recent searches + categories ---------- */
                  <div className="px-5 py-5 space-y-6">
                    {/* Recent Searches */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5" style={{ color: 'var(--ws-muted)' }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ws-muted)' }}>
                          Recent Searches
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {MOCK_RECENT_SEARCHES.map((term) => (
                          <button
                            key={term}
                            onClick={() => handleRecentSearch(term)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                            style={{
                              background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                              border: '1px solid var(--ws-border)',
                              color: 'var(--ws-muted)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ws-primary) 50%, var(--ws-border))';
                              e.currentTarget.style.color = 'var(--ws-text)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--ws-border)';
                              e.currentTarget.style.color = 'var(--ws-muted)';
                            }}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Browse by Category */}
                    {categories.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="w-3.5 h-3.5" style={{ color: 'var(--ws-muted)' }} />
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ws-muted)' }}>
                            Browse by Category
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => handleCategoryClick(cat)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                              style={{
                                background: 'color-mix(in srgb, var(--ws-primary) 8%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, var(--ws-border))',
                                color: 'var(--ws-primary)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 15%, transparent)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 8%, transparent)';
                              }}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick tips */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: 'color-mix(in srgb, var(--ws-primary) 5%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--ws-primary) 10%, transparent)',
                      }}
                    >
                      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ws-primary)' }} />
                      <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                        Search by SKU for exact matches, or browse categories for bulk ordering.
                      </span>
                    </div>
                  </div>
                ) : results.length === 0 ? (
                  /* ---------- No results ---------- */
                  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: 'color-mix(in srgb, var(--ws-surface) 80%, transparent)',
                        border: '1px solid var(--ws-border)',
                      }}
                    >
                      <Package className="w-6 h-6" style={{ color: 'var(--ws-muted, rgba(255,255,255,0.3))' }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--ws-text)' }}>
                      No products found for &lsquo;{debouncedQuery}&rsquo;
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                      Try a different search term, SKU, or browse categories above.
                    </p>
                  </div>
                ) : (
                  /* ---------- Results list ---------- */
                  <>
                    {/* Result count header */}
                    {allMatched.length > MAX_RESULTS && (
                      <div
                        className="px-5 py-2 flex items-center justify-between"
                        style={{
                          borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.06))',
                          background: 'color-mix(in srgb, var(--ws-surface) 40%, transparent)',
                        }}
                      >
                        <span className="text-xs font-medium" style={{ color: 'var(--ws-muted)' }}>
                          Showing {MAX_RESULTS} of {allMatched.length} results
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                          background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
                          color: 'var(--ws-primary)',
                        }}>
                          Refine your search for fewer results
                        </span>
                      </div>
                    )}

                    <ul>
                      {results.map((product, idx) => (
                        <SearchResultRow
                          key={product.id}
                          product={product}
                          onSelect={handleSelect}
                          onAddToOrder={handleAddToOrder}
                          isLast={idx === results.length - 1}
                        />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// SearchResultRow (internal)
// ---------------------------------------------------------------------------

function SearchResultRow({ product, onSelect, onAddToOrder, isLast }) {
  const { id, name, sku, price, image, category } = product;
  const moq = product.moq || product.min_order || 1;
  const stock = getStockStatus(product);
  const stockInfo = STOCK_DOT[stock];
  const hasBulkPricing = product.priceTiers?.length > 0 || product.price_tiers?.length > 0 || product.bulk_pricing;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(id)}
        className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all duration-200 group"
        style={{
          borderBottom: isLast ? 'none' : '1px solid var(--ws-border, rgba(255,255,255,0.04))',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 4%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Product image / fallback */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
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
            />
          ) : (
            <Package
              className="w-4 h-4"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.3))' }}
            />
          )}
        </div>

        {/* Name + SKU */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--ws-text, #fff)' }}
          >
            {name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {sku && (
              <span
                className="text-[11px] font-mono truncate"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
              >
                {sku}
              </span>
            )}
            {/* Stock dot */}
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: stockInfo.bg }}
              />
              <span className="text-[10px]" style={{ color: stockInfo.bg }}>
                {stockInfo.label}
              </span>
            </span>
          </div>
        </div>

        {/* Category badge */}
        {category && (
          <span
            className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full hidden sm:inline-block"
            style={{
              background: 'color-mix(in srgb, var(--ws-primary) 8%, transparent)',
              color: 'var(--ws-primary)',
              border: '1px solid color-mix(in srgb, var(--ws-primary) 15%, transparent)',
            }}
          >
            {category}
          </span>
        )}

        {/* MOQ badge */}
        {moq > 1 && (
          <span
            className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full hidden md:inline-block"
            style={{
              background: 'rgba(234,179,8,0.1)',
              color: '#eab308',
              border: '1px solid rgba(234,179,8,0.2)',
            }}
          >
            MOQ: {moq}
          </span>
        )}

        {/* Price */}
        <div className="flex-shrink-0 text-right">
          <span
            className="text-sm font-bold block"
            style={{ color: 'var(--ws-text, #fff)' }}
          >
            {hasBulkPricing && (
              <span className="text-[10px] font-normal mr-1" style={{ color: 'var(--ws-muted)' }}>From</span>
            )}
            {formatCurrency(price)}
          </span>
          {hasBulkPricing && (
            <span className="text-[10px]" style={{ color: 'var(--ws-primary)' }}>
              Bulk pricing
            </span>
          )}
        </div>

        {/* Add to Order button */}
        <button
          type="button"
          onClick={(e) => onAddToOrder(e, product)}
          className="flex-shrink-0 p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
          style={{
            background: 'color-mix(in srgb, var(--ws-primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ws-primary) 20%, transparent)',
            color: 'var(--ws-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 20%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--ws-primary) 10%, transparent)';
          }}
          aria-label={`Add ${name} to order`}
          title="Add to Order"
        >
          <ClipboardPlus className="w-4 h-4" />
        </button>
      </button>
    </li>
  );
}
