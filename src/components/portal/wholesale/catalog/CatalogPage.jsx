import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Grid3X3, List, ChevronLeft, ChevronRight, Package, Heart, X, ShoppingCart, Minus, Plus, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useWholesale } from '../WholesaleProvider';
import B2BProductCard from './B2BProductCard';
import CategoryFilter from './CategoryFilter';
import { getBulkClientPrices } from '@/lib/db/queries/b2b';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCTS_PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_RECENTLY_VIEWED = 10;

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

// ---------------------------------------------------------------------------
// Recently Viewed helpers (sessionStorage)
// ---------------------------------------------------------------------------

function getRecentlyViewedKey(orgId) {
  return `b2b_recently_viewed_${orgId || 'default'}`;
}

function getRecentlyViewedIds(orgId) {
  try {
    const raw = sessionStorage.getItem(getRecentlyViewedKey(orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addRecentlyViewed(orgId, productId) {
  try {
    const ids = getRecentlyViewedIds(orgId);
    const filtered = ids.filter((id) => id !== productId);
    filtered.unshift(productId);
    const trimmed = filtered.slice(0, MAX_RECENTLY_VIEWED);
    sessionStorage.setItem(getRecentlyViewedKey(orgId), JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}

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
// Recently Viewed Strip
// ---------------------------------------------------------------------------

function RecentlyViewedStrip({ products, onNavigate }) {
  if (!products || products.length === 0) return null;

  const formatPrice = (product) => {
    const price = product.b2b_price ?? product.wholesale_price ?? product.price;
    if (price == null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div
      className="mb-6 rounded-xl p-3"
      style={{
        backgroundColor: 'var(--ws-surface)',
        border: '1px solid var(--ws-border)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-2.5 px-1"
        style={{ color: 'var(--ws-muted)' }}
      >
        Recently Viewed
      </p>
      <div className="overflow-x-auto flex gap-3 pb-1" style={{ scrollbarWidth: 'thin' }}>
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onNavigate(product.id)}
            className="flex-shrink-0 flex items-center gap-2.5 rounded-lg p-2 transition-all duration-150 hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: 'var(--ws-bg)',
              border: '1px solid var(--ws-border)',
              minWidth: '180px',
              maxWidth: '220px',
            }}
          >
            <div
              className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: 'var(--ws-surface)' }}
            >
              {product.featured_image ? (
                <img
                  src={product.featured_image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Package className="w-5 h-5" style={{ color: 'var(--ws-muted)', opacity: 0.4 }} />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p
                className="text-xs font-medium truncate leading-snug"
                style={{ color: 'var(--ws-text)' }}
              >
                {product.name}
              </p>
              {formatPrice(product) && (
                <p
                  className="text-[11px] font-semibold mt-0.5"
                  style={{ color: 'var(--ws-primary)' }}
                >
                  {formatPrice(product)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick View Modal
// ---------------------------------------------------------------------------

function QuickViewModal({ product, pricing, inventory, onClose, onAddToCart, onNavigate, orgSlug }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Reset added state after 2 seconds
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  // Derive stock status
  const available = inventory
    ? (inventory.quantity_on_hand ?? 0) - (inventory.quantity_reserved ?? 0)
    : 0;

  const stockStatus = !inventory
    ? { label: 'Checking...', color: 'var(--ws-muted)', purchasable: false }
    : available <= 0
      ? { label: 'Out of Stock', color: '#ef4444', purchasable: false }
      : available <= 10
        ? { label: `Low Stock (${available} left)`, color: '#f59e0b', purchasable: true }
        : { label: 'In Stock', color: '#22c55e', purchasable: true };

  const formatPrice = (p) => {
    const unitPrice = p?.unit_price;
    if (unitPrice == null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(unitPrice);
  };

  const price = formatPrice(pricing);

  const handleAddToCart = useCallback(async () => {
    if (!stockStatus.purchasable || adding || added) return;
    setAdding(true);
    try {
      await Promise.resolve(onAddToCart(product.id, quantity));
      setAdded(true);
    } catch {
      // parent handles toast
    } finally {
      setAdding(false);
    }
  }, [product.id, quantity, onAddToCart, stockStatus.purchasable, adding, added]);

  const handleViewDetails = useCallback(() => {
    onClose();
    onNavigate(product.id);
  }, [onClose, onNavigate, product.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const description = product.description
    ? product.description.length > 200
      ? product.description.slice(0, 200) + '...'
      : product.description
    : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--ws-surface)',
          border: '1px solid var(--ws-border)',
        }}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-150"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'var(--ws-text)',
            backdropFilter: 'blur(4px)',
          }}
          aria-label="Close quick view"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div
            className="sm:w-1/2 aspect-square flex items-center justify-center"
            style={{ backgroundColor: 'var(--ws-bg)' }}
          >
            {product.featured_image ? (
              <img
                src={product.featured_image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <Package className="w-16 h-16" style={{ color: 'var(--ws-muted)', opacity: 0.3 }} />
                <span className="text-xs" style={{ color: 'var(--ws-muted)', opacity: 0.3 }}>
                  No image
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="sm:w-1/2 p-5 flex flex-col gap-3">
            {/* SKU */}
            {product.sku && (
              <p
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--ws-muted)' }}
              >
                {product.sku}
              </p>
            )}

            {/* Name */}
            <h2
              className="text-lg font-bold leading-snug"
              style={{ color: 'var(--ws-text)', fontFamily: 'var(--ws-heading-font)' }}
            >
              {product.name}
            </h2>

            {/* Price */}
            {price && (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold" style={{ color: 'var(--ws-primary)' }}>
                  {price}
                </span>
                {pricing?.discount_percent > 0 && (
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
            )}

            {/* Stock */}
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: stockStatus.color }}
              />
              <span className="text-xs font-medium" style={{ color: stockStatus.color }}>
                {stockStatus.label}
              </span>
            </div>
            {!stockStatus.purchasable && product.restock_date && (
              <p className="text-xs" style={{ color: 'var(--ws-muted)' }}>
                Restocking: {new Date(product.restock_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}

            {/* Description */}
            {description && (
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--ws-muted)' }}
              >
                {description}
              </p>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Quantity selector + Add to Cart */}
            <div className="flex items-center gap-3 mt-2">
              <div
                className="flex items-center rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--ws-border)' }}
              >
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex items-center justify-center w-9 h-9 transition-colors duration-150 disabled:opacity-30"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    color: 'var(--ws-text)',
                  }}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className="flex items-center justify-center w-10 h-9 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    color: 'var(--ws-text)',
                    borderLeft: '1px solid var(--ws-border)',
                    borderRight: '1px solid var(--ws-border)',
                  }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex items-center justify-center w-9 h-9 transition-colors duration-150"
                  style={{
                    backgroundColor: 'var(--ws-bg)',
                    color: 'var(--ws-text)',
                  }}
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!stockStatus.purchasable || adding}
                className={`
                  flex-1 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold py-2.5 px-4
                  transition-all duration-200
                  ${(!stockStatus.purchasable || adding) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}
                `}
                style={{
                  backgroundColor: added ? '#22c55e' : 'var(--ws-primary)',
                  color: 'var(--ws-bg, #000)',
                }}
              >
                {added ? (
                  <>
                    <span>Added!</span>
                  </>
                ) : adding ? (
                  <>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>

            {/* View Full Details link */}
            <button
              onClick={handleViewDetails}
              className="flex items-center justify-center gap-1.5 text-sm font-medium py-2 transition-colors duration-150 hover:opacity-80 cursor-pointer"
              style={{ color: 'var(--ws-primary)' }}
            >
              <span>View Full Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CatalogPage
// ---------------------------------------------------------------------------

export default function CatalogPage() {
  const navigate = useNavigate();
  const { org: orgSlug } = useParams();
  const { config, addToCart, orgId, organizationId: resolvedOrgUUID, client, isFavorite, toggleFavorite } = useWholesale();

  // Data state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client-specific pricing (bulk-fetched from price list)
  const [clientPrices, setClientPrices] = useState({});

  // Filter / view state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('name_asc');
  const [layout, setLayout] = useState('grid');
  const [page, setPage] = useState(1);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Quick view modal state
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Recently viewed state
  const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);

  // Resolve organization ID — use the UUID resolved by WholesaleProvider
  const organizationId = resolvedOrgUUID || orgId || orgSlug;

  // ---------------------------------------------------------------------------
  // Search Debounce (300ms)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when debounced search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // ---------------------------------------------------------------------------
  // Load recently viewed IDs from sessionStorage on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!organizationId) return;
    setRecentlyViewedIds(getRecentlyViewedIds(organizationId));
  }, [organizationId]);

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
  // Batch-fetch client-specific pricing from price lists
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!client?.id || products.length === 0) return;
    let cancelled = false;

    async function fetchClientPrices() {
      try {
        const results = await Promise.allSettled(
          products.map((p) => getBulkClientPrices(client.id, p.id))
        );

        if (cancelled) return;

        const priceMap = {};
        results.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            // Use the lowest tier (qty 1) price as the display price
            const tiers = result.value;
            const baseTier = tiers[0];
            priceMap[products[i].id] = {
              unit_price: baseTier.unit_price,
              tiers,
            };
          }
        });

        setClientPrices(priceMap);
      } catch (err) {
        console.error('[CatalogPage] Client price fetch error:', err);
      }
    }

    fetchClientPrices();
    return () => { cancelled = true; };
  }, [client?.id, products]);

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
  // Derived: recently viewed products (resolved from IDs + loaded products)
  // ---------------------------------------------------------------------------

  const recentlyViewedProducts = useMemo(() => {
    if (recentlyViewedIds.length === 0 || products.length === 0) return [];
    const productMap = new Map(products.map((p) => [p.id, p]));
    return recentlyViewedIds
      .map((id) => productMap.get(id))
      .filter(Boolean);
  }, [recentlyViewedIds, products]);

  // ---------------------------------------------------------------------------
  // Derived: filtered and sorted products
  // ---------------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Favorites filter
    if (showFavoritesOnly) {
      result = result.filter((p) => isFavorite(p.id));
    }

    // Search filter -- use debounced search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
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
  }, [products, debouncedSearch, selectedCategories, sortBy, showFavoritesOnly, isFavorite]);

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
      // Add to recently viewed before navigating
      const updated = addRecentlyViewed(organizationId, productId);
      setRecentlyViewedIds(updated);
      navigate(`/portal/${orgSlug}/shop/product/${productId}`);
    },
    [navigate, orgSlug, organizationId],
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
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategories([]);
    setShowFavoritesOnly(false);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
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

  const handleQuickView = useCallback((product) => {
    setQuickViewProduct(product);
  }, []);

  const handleCloseQuickView = useCallback(() => {
    setQuickViewProduct(null);
  }, []);

  // Helpers for B2BProductCard props
  const getPricing = useCallback((product) => {
    if (clientPrices[product.id]) {
      return {
        unit_price: clientPrices[product.id].unit_price,
        discount_percent: 0,
      };
    }
    return {
      unit_price: product.b2b_price ?? product.wholesale_price ?? product.price ?? null,
      discount_percent: product.b2b_discount_percent ?? 0,
    };
  }, [clientPrices]);

  const getInventory = useCallback((product) => {
    return product.inventory?.[0] || null;
  }, []);

  const hasFilters = debouncedSearch.trim() !== '' || selectedCategories.length > 0 || showFavoritesOnly;

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
            value={searchInput}
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

          {/* Favorites toggle */}
          <button
            onClick={() => {
              setShowFavoritesOnly((prev) => !prev);
              setPage(1);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-150"
            style={{
              backgroundColor: showFavoritesOnly
                ? 'var(--ws-primary)'
                : 'var(--ws-surface)',
              color: showFavoritesOnly ? 'var(--ws-bg)' : 'var(--ws-muted)',
              border: showFavoritesOnly
                ? '1px solid var(--ws-primary)'
                : '1px solid var(--ws-border)',
            }}
            aria-label={showFavoritesOnly ? 'Show all products' : 'Show favorites only'}
            title={showFavoritesOnly ? 'Show all products' : 'Show favorites only'}
          >
            <Heart
              className="w-4 h-4"
              style={{
                fill: showFavoritesOnly ? 'currentColor' : 'none',
              }}
            />
          </button>

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

      {/* ---- Recently Viewed Strip ---- */}
      {!loading && (
        <RecentlyViewedStrip
          products={recentlyViewedProducts}
          onNavigate={handleNavigate}
        />
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
              isFavorite={isFavorite(product.id)}
              onToggleFavorite={toggleFavorite}
              onQuickView={handleQuickView}
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
              isFavorite={isFavorite(product.id)}
              onToggleFavorite={toggleFavorite}
              onQuickView={handleQuickView}
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

      {/* ---- Quick View Modal ---- */}
      <AnimatePresence>
        {quickViewProduct && (
          <QuickViewModal
            product={quickViewProduct}
            pricing={getPricing(quickViewProduct)}
            inventory={getInventory(quickViewProduct)}
            onClose={handleCloseQuickView}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            orgSlug={orgSlug}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
