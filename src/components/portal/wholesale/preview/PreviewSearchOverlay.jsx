import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Package } from 'lucide-react';

/**
 * PreviewSearchOverlay
 *
 * Fullscreen search overlay rendered inside the store builder preview iframe.
 * Provides debounced product search with keyboard navigation (ESC to close,
 * Enter to select single result). Uses CSS custom properties (--ws-*) for
 * theme consistency.
 *
 * Props:
 *   isOpen   - boolean  Whether the overlay is visible
 *   onClose  - () => void  Callback to close the overlay
 *   products - array of products: { id, name, sku, price, image, category }
 *   nav      - object: { goToProduct }
 */
export default function PreviewSearchOverlay({ isOpen, onClose, products = [], nav }) {
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

  // Auto-focus input when opened, reset query when closed
  useEffect(() => {
    if (isOpen) {
      // Use a small delay to ensure the overlay has rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter products against debounced query (max 8 results)
  const results = useMemo(() => {
    if (!debouncedQuery) return [];

    const lower = debouncedQuery.toLowerCase();
    return products
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        return name.includes(lower) || sku.includes(lower) || category.includes(lower);
      })
      .slice(0, 8);
  }, [products, debouncedQuery]);

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

  // Enter on single result navigates directly
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && results.length === 1) {
        handleSelect(results[0].id);
      }
    },
    [results, handleSelect],
  );

  const formatPrice = (value) => {
    const num = Number(value) || 0;
    return `\u20AC${num.toFixed(2)}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--ws-surface, #18181b)',
          border: '1px solid var(--ws-border, rgba(255,255,255,0.08))',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.08))' }}
        >
          <Search
            className="w-5 h-5 flex-shrink-0"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products..."
            className="flex-1 bg-transparent text-base outline-none placeholder:opacity-50"
            style={{
              color: 'var(--ws-text, #fff)',
              caretColor: 'var(--ws-primary, #06b6d4)',
            }}
            // Use style for placeholder color via CSS variable
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: 'var(--ws-muted, rgba(255,255,255,0.5))' }}
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[400px] overflow-y-auto">
          {!debouncedQuery ? (
            /* Empty query state */
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Search
                className="w-8 h-8 mb-3"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.2))' }}
              />
              <p
                className="text-sm"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
              >
                Start typing to search products...
              </p>
            </div>
          ) : results.length === 0 ? (
            /* No results state */
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Package
                className="w-8 h-8 mb-3"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.2))' }}
              />
              <p
                className="text-sm"
                style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
              >
                No products found for &lsquo;{debouncedQuery}&rsquo;
              </p>
            </div>
          ) : (
            /* Results list */
            <ul>
              {results.map((product) => (
                <SearchResultRow
                  key={product.id}
                  product={product}
                  onSelect={handleSelect}
                  formatPrice={formatPrice}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchResultRow (internal)
// ---------------------------------------------------------------------------

function SearchResultRow({ product, onSelect, formatPrice }) {
  const { id, name, sku, price, image, category } = product;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(id)}
        className="w-full flex items-center gap-3.5 px-5 py-3 text-left transition-colors hover:bg-white/[0.04]"
        style={{ borderBottom: '1px solid var(--ws-border, rgba(255,255,255,0.04))' }}
      >
        {/* Image / fallback */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
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
            className="text-sm font-medium truncate"
            style={{ color: 'var(--ws-text, #fff)' }}
          >
            {name}
          </p>
          {sku && (
            <p
              className="text-[11px] mt-0.5 truncate"
              style={{ color: 'var(--ws-muted, rgba(255,255,255,0.4))' }}
            >
              SKU: {sku}
            </p>
          )}
        </div>

        {/* Price */}
        <span
          className="text-sm font-semibold flex-shrink-0"
          style={{ color: 'var(--ws-text, #fff)' }}
        >
          {formatPrice(price)}
        </span>

        {/* Category badge */}
        {category && (
          <span
            className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--ws-muted, rgba(255,255,255,0.5))',
            }}
          >
            {category}
          </span>
        )}
      </button>
    </li>
  );
}
