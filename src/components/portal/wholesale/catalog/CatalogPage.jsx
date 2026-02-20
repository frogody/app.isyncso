import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Grid3X3, List, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import B2BProductCard from './B2BProductCard';
import CategoryFilter from './CategoryFilter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

// ---------------------------------------------------------------------------
// Skeleton Grid
// ---------------------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl overflow-hidden animate-pulse"
          style={{
            backgroundColor: 'var(--ws-surface)',
            border: '1px solid var(--ws-border)',
          }}
        >
          <div className="aspect-square" style={{ backgroundColor: 'var(--ws-bg)' }} />
          <div className="p-4 space-y-3">
            <div className="h-3 w-16 rounded" style={{ backgroundColor: 'var(--ws-border)' }} />
            <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--ws-border)' }} />
            <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--ws-border)' }} />
            <div className="h-6 w-24 rounded mt-2" style={{ backgroundColor: 'var(--ws-border)' }} />
            <div className="h-10 w-full rounded-lg mt-2" style={{ backgroundColor: 'var(--ws-border)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

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
          Clear All Filters
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build page number array with ellipsis
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
    <div className="flex items-center justify-center gap-1.5 mt-8">
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
  );
}

// ---------------------------------------------------------------------------
// CatalogPage
// ---------------------------------------------------------------------------

export default function CatalogPage() {
  const navigate = useNavigate();
  const { org: orgSlug } = useParams();
  const { config, addToCart, orgId } = useWholesale();

  // Data state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter / view state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('name_asc');
  const [layout, setLayout] = useState('grid');
  const [page, setPage] = useState(1);

  // Resolve organization ID -- orgSlug from URL params is the org ID in this project
  const organizationId = orgId || orgSlug;

  // ---------------------------------------------------------------------------
  // Fetch products
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    async function fetchProducts() {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, physical_products(*), inventory(*), product_sales_channels!inner(channel)')
          .eq('product_sales_channels.channel', 'b2b')
          .eq('is_active', true)
          .eq('company_id', organizationId);

        if (cancelled) return;

        if (error) {
          console.error('[CatalogPage] Product fetch error:', error);
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[CatalogPage] Unexpected error:', err);
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();
    return () => { cancelled = true; };
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // Fetch categories
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (cancelled) return;

        if (error) {
          console.error('[CatalogPage] Category fetch error:', error);
          setCategories([]);
        } else {
          setCategories(data || []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[CatalogPage] Unexpected categories error:', err);
        setCategories([]);
      }
    }

    fetchCategories();
    return () => { cancelled = true; };
  }, [organizationId]);

  // ---------------------------------------------------------------------------
  // Derived: categories with product counts
  // ---------------------------------------------------------------------------

  const categoriesWithCounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      product_count: products.filter(
        (p) => p.category_id === cat.id || p.product_category_id === cat.id,
      ).length,
    }));
  }, [categories, products]);

  // ---------------------------------------------------------------------------
  // Derived: filtered and sorted products
  // ---------------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
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
    if (selectedCategories.length > 0) {
      result = result.filter(
        (p) =>
          selectedCategories.includes(p.category_id) ||
          selectedCategories.includes(p.product_category_id),
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':
          return (a.price ?? a.b2b_price ?? 0) - (b.price ?? b.b2b_price ?? 0);
        case 'price_desc':
          return (b.price ?? b.b2b_price ?? 0) - (a.price ?? a.b2b_price ?? 0);
        case 'newest':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, selectedCategories, sortBy]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));

  // Clamp page within bounds when filters change
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleNavigate = useCallback(
    (productId) => {
      navigate(`/portal/${orgSlug}/shop/product/${productId}`);
    },
    [navigate, orgSlug],
  );

  const handleAddToCart = useCallback(
    (productId, quantity) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        addToCart(product, quantity);
      }
    },
    [products, addToCart],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((next) => {
    setSelectedCategories(next);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Helpers for B2BProductCard props
  const getPricing = useCallback((product) => {
    return {
      unit_price: product.b2b_price ?? product.wholesale_price ?? product.price ?? null,
      discount_percent: product.b2b_discount_percent ?? 0,
    };
  }, []);

  const getInventory = useCallback((product) => {
    return product.inventory?.[0] || null;
  }, []);

  const hasFilters = searchQuery.trim() !== '' || selectedCategories.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={{ fontFamily: 'var(--ws-font)', color: 'var(--ws-text)' }}
    >
      {/* ---- Toolbar: Search, Sort, Layout Toggle ---- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--ws-muted)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors duration-150"
            style={{
              backgroundColor: 'var(--ws-surface)',
              color: 'var(--ws-text)',
              border: '1px solid var(--ws-border)',
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={handleSortChange}
            className="px-3 py-2.5 rounded-lg text-sm font-medium outline-none cursor-pointer transition-colors duration-150 appearance-none"
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

          {/* Layout toggle */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--ws-border)' }}
          >
            <button
              onClick={() => setLayout('grid')}
              className="flex items-center justify-center w-10 h-10 transition-colors duration-150"
              style={{
                backgroundColor:
                  layout === 'grid'
                    ? 'var(--ws-primary)'
                    : 'var(--ws-surface)',
                color:
                  layout === 'grid' ? 'var(--ws-bg)' : 'var(--ws-muted)',
              }}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className="flex items-center justify-center w-10 h-10 transition-colors duration-150"
              style={{
                backgroundColor:
                  layout === 'list'
                    ? 'var(--ws-primary)'
                    : 'var(--ws-surface)',
                color:
                  layout === 'list' ? 'var(--ws-bg)' : 'var(--ws-muted)',
              }}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Category Pills ---- */}
      {categoriesWithCounts.length > 0 && (
        <div className="mb-6">
          <CategoryFilter
            categories={categoriesWithCounts}
            selected={selectedCategories}
            onChange={handleCategoryChange}
            layout="pills"
          />
        </div>
      )}

      {/* ---- Results count ---- */}
      {!loading && filteredProducts.length > 0 && (
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--ws-muted)' }}
        >
          Showing {paginatedProducts.length} of {filteredProducts.length} product
          {filteredProducts.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ---- Product Grid / List ---- */}
      {loading ? (
        <SkeletonGrid />
      ) : paginatedProducts.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClearFilters={handleClearFilters} />
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedProducts.map((product) => (
            <B2BProductCard
              key={product.id}
              product={product}
              pricing={getPricing(product)}
              inventory={getInventory(product)}
              onAddToCart={handleAddToCart}
              onNavigate={handleNavigate}
              layout="grid"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedProducts.map((product) => (
            <B2BProductCard
              key={product.id}
              product={product}
              pricing={getPricing(product)}
              inventory={getInventory(product)}
              onAddToCart={handleAddToCart}
              onNavigate={handleNavigate}
              layout="list"
            />
          ))}
        </div>
      )}

      {/* ---- Pagination ---- */}
      {!loading && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
