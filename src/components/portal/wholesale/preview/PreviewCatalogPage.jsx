// ---------------------------------------------------------------------------
// PreviewCatalogPage.jsx -- Full product catalog page for the store builder
// preview iframe. Renders entirely from props (products array, config, cart,
// nav). All filtering, sorting, and pagination are client-side.
//
// Uses CSS custom properties (--ws-*) for theming.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ShoppingCart,
  Package,
  ChevronLeft,
  ChevronRight,
  Check,
  Grid3X3,
  List,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value) {
  if (value == null) return null;
  return `\u20AC${Number(value).toFixed(2)}`;
}

function getStockStatus(product) {
  const stock = product.stock;
  if (stock == null) return { label: 'In Stock', dotColor: '#22c55e' };
  if (typeof stock === 'string') {
    const lower = stock.toLowerCase();
    if (lower.includes('out')) return { label: 'Out of Stock', dotColor: '#ef4444' };
    if (lower.includes('limited') || lower.includes('low')) return { label: 'Limited', dotColor: '#f59e0b' };
    return { label: 'In Stock', dotColor: '#22c55e' };
  }
  if (typeof stock === 'number') {
    if (stock <= 0) return { label: 'Out of Stock', dotColor: '#ef4444' };
    if (stock <= 10) return { label: 'Limited', dotColor: '#f59e0b' };
    return { label: 'In Stock', dotColor: '#22c55e' };
  }
  return { label: 'In Stock', dotColor: '#22c55e' };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryPills({ categories, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150"
        style={{
          backgroundColor: selected === null ? 'var(--ws-primary)' : 'var(--ws-surface)',
          color: selected === null ? 'var(--ws-bg)' : 'var(--ws-muted)',
          border: selected === null ? '1px solid var(--ws-primary)' : '1px solid var(--ws-border)',
        }}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150"
          style={{
            backgroundColor: selected === cat ? 'var(--ws-primary)' : 'var(--ws-surface)',
            color: selected === cat ? 'var(--ws-bg)' : 'var(--ws-muted)',
            border: selected === cat ? '1px solid var(--ws-primary)' : '1px solid var(--ws-border)',
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

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
    <div className="flex flex-col items-center gap-3 mt-8">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            border: '1px solid var(--ws-border)',
            color: 'var(--ws-text)',
          }}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((page, idx) =>
          page === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-9 h-9 flex items-center justify-center text-sm"
              style={{ color: 'var(--ws-muted)' }}
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors duration-150"
              style={{
                backgroundColor:
                  page === currentPage ? 'var(--ws-primary)' : 'transparent',
                color:
                  page === currentPage ? 'var(--ws-bg)' : 'var(--ws-text)',
                border:
                  page === currentPage
                    ? '1px solid var(--ws-primary)'
                    : '1px solid var(--ws-border)',
              }}
            >
              {page}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            border: '1px solid var(--ws-border)',
            color: 'var(--ws-text)',
          }}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <span className="text-xs" style={{ color: 'var(--ws-muted)' }}>
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}

function EmptyState({ hasFilters, onClearFilters }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-4"
      style={{ color: 'var(--ws-muted)' }}
    >
      <Package className="w-16 h-16 mb-4 opacity-30" />
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--ws-text)' }}
      >
        No products found
      </h3>
      <p className="text-sm text-center max-w-md mb-4">
        {hasFilters
          ? 'No products match your current filters. Try adjusting your search or category selection.'
          : 'There are no products available in the catalog at this time.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg)',
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card variants
// ---------------------------------------------------------------------------

function AddToCartBtn({ product, cart }) {
  const [added, setAdded] = useState(false);

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (added) return;
      cart?.addItem(product);
      setAdded(true);
    },
    [product, cart, added],
  );

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90"
      style={{
        backgroundColor: added ? '#22c55e' : 'var(--ws-primary)',
        color: 'var(--ws-bg, #000)',
      }}
    >
      {added ? (
        <>
          <Check className="w-4 h-4" />
          <span>Added!</span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" />
          <span>Add to Cart</span>
        </>
      )}
    </button>
  );
}

function DetailedCard({ product, cart, nav, showPricing, showStock }) {
  const stock = getStockStatus(product);

  return (
    <div
      onClick={() => nav?.goToProduct(product.id)}
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
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Package
            className="w-12 h-12 opacity-20"
            style={{ color: 'var(--ws-muted)' }}
          />
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>

        <p
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ws-muted)' }}
        >
          SKU: {product.sku || 'N/A'}
        </p>

        {showPricing && product.price != null && (
          <span
            className="text-lg font-bold mt-1"
            style={{ color: 'var(--ws-primary)' }}
          >
            {formatPrice(product.price)}
          </span>
        )}

        {showStock && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: stock.dotColor }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--ws-muted)' }}
            >
              {stock.label}
            </span>
          </div>
        )}

        <div className="mt-auto pt-3">
          <AddToCartBtn product={product} cart={cart} />
        </div>
      </div>
    </div>
  );
}

function CompactCard({ product, cart, nav, showPricing, showStock }) {
  const stock = getStockStatus(product);

  return (
    <div
      onClick={() => nav?.goToProduct(product.id)}
      className="group flex items-center gap-4 rounded-xl overflow-hidden p-3 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
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
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Package
            className="w-6 h-6 opacity-20"
            style={{ color: 'var(--ws-muted)' }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-sm font-semibold leading-snug truncate"
          style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
        >
          {product.name}
        </h3>
        <p
          className="text-[10px] font-medium uppercase tracking-wider mt-0.5"
          style={{ color: 'var(--ws-muted)' }}
        >
          {product.sku || ''}
        </p>
        {showStock && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: stock.dotColor }}
            />
            <span className="text-[10px]" style={{ color: 'var(--ws-muted)' }}>
              {stock.label}
            </span>
          </div>
        )}
      </div>

      {/* Price + Action */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        {showPricing && product.price != null && (
          <span
            className="text-base font-bold"
            style={{ color: 'var(--ws-primary)' }}
          >
            {formatPrice(product.price)}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            cart?.addItem(product);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

function MinimalCard({ product, cart, nav, showPricing }) {
  return (
    <div
      onClick={() => nav?.goToProduct(product.id)}
      className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg transition-colors duration-150 cursor-pointer"
      style={{
        border: '1px solid var(--ws-border)',
      }}
      role="article"
      aria-label={product.name}
    >
      <div className="min-w-0">
        <h3
          className="text-sm font-medium truncate"
          style={{ color: 'var(--ws-text)' }}
        >
          {product.name}
        </h3>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {showPricing && product.price != null && (
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--ws-primary)' }}
          >
            {formatPrice(product.price)}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            cart?.addItem(product);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--ws-primary)',
            color: 'var(--ws-bg, #000)',
          }}
        >
          <ShoppingCart className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * PreviewCatalogPage
 *
 * Full product catalog page for the store builder preview.
 * Supports search, category filtering, sorting, pagination, and add-to-cart.
 *
 * Props:
 *   config   - Store config object (uses config.catalog for settings)
 *   products - Array of product objects
 *   cart     - { addItem }
 *   nav      - { goToProduct, goToHome }
 */
export default function PreviewCatalogPage({ config, products = [], cart, nav }) {
  const catalog = config?.catalog || {};
  const columns = catalog.columns || 3;
  const cardStyle = catalog.cardStyle || 'detailed';
  const showPricing = catalog.showPricing !== false;
  const showStock = catalog.showStock !== false;

  // Filter / view state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('name_asc');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);

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

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
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
          return (a.price ?? 0) - (b.price ?? 0);
        case 'price_desc':
          return (b.price ?? 0) - (a.price ?? 0);
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

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setPage(1);
  }, []);

  const hasFilters = searchQuery.trim() !== '' || selectedCategory !== null;

  // Grid columns style
  const gridColsClass =
    viewMode === 'grid'
      ? columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : columns === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : '';

  // Card renderer
  const renderCard = useCallback(
    (product) => {
      const cardProps = { product, cart, nav, showPricing, showStock };

      if (cardStyle === 'compact') return <CompactCard key={product.id} {...cardProps} />;
      if (cardStyle === 'minimal') return <MinimalCard key={product.id} {...cardProps} />;
      return <DetailedCard key={product.id} {...cardProps} />;
    },
    [cardStyle, cart, nav, showPricing, showStock],
  );

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ fontFamily: 'var(--ws-font)', color: 'var(--ws-text)' }}
    >
      {/* Top bar: heading + result count + view controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
          >
            Products
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ws-muted)' }}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--ws-border)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center justify-center w-9 h-9 transition-colors duration-150"
              style={{
                backgroundColor:
                  viewMode === 'grid' ? 'var(--ws-primary)' : 'var(--ws-surface)',
                color:
                  viewMode === 'grid' ? 'var(--ws-bg)' : 'var(--ws-muted)',
              }}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center justify-center w-9 h-9 transition-colors duration-150"
              style={{
                backgroundColor:
                  viewMode === 'list' ? 'var(--ws-primary)' : 'var(--ws-surface)',
                color:
                  viewMode === 'list' ? 'var(--ws-bg)' : 'var(--ws-muted)',
              }}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--ws-muted)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by name or SKU..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors duration-150"
          style={{
            backgroundColor: 'var(--ws-surface)',
            color: 'var(--ws-text)',
            border: '1px solid var(--ws-border)',
          }}
        />
      </div>

      {/* Category filter pills + sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        {categories.length > 0 && (
          <CategoryPills
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        )}

        <select
          value={sortBy}
          onChange={handleSortChange}
          className="px-3 py-2 rounded-lg text-sm font-medium outline-none cursor-pointer transition-colors duration-150 appearance-none flex-shrink-0"
          style={{
            backgroundColor: 'var(--ws-surface)',
            color: 'var(--ws-text)',
            border: '1px solid var(--ws-border)',
            minWidth: '160px',
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Product grid / list */}
      {paginatedProducts.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClearFilters={handleClearFilters} />
      ) : viewMode === 'grid' && cardStyle !== 'compact' ? (
        <div className={`grid ${gridColsClass} gap-5`}>
          {paginatedProducts.map(renderCard)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedProducts.map(renderCard)}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
