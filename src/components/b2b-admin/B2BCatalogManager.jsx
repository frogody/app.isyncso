/**
 * B2BCatalogManager - Admin page to manage the wholesale product catalog.
 *
 * Fetch from products table, toggle wholesale visibility via product_sales_channels
 * junction (channel='b2b'), bulk select/deselect, search by name, category filter,
 * product image/name/SKU/price display, inline wholesale price editor, pagination 20/page.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import {
  Search,
  Package,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Eye,
  EyeOff,
  DollarSign,
  Filter,
  RefreshCw,
  Tag,
  CheckSquare,
  Square,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductRow({
  product,
  isWholesale,
  wholesalePrice,
  selected,
  onToggle,
  onToggleWholesale,
  onPriceChange,
  savingId,
}) {
  const [editPrice, setEditPrice] = useState(wholesalePrice || '');
  const [editing, setEditing] = useState(false);

  const handlePriceSave = () => {
    onPriceChange(product.id, parseFloat(editPrice) || null);
    setEditing(false);
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') handlePriceSave();
    if (e.key === 'Escape') {
      setEditPrice(wholesalePrice || '');
      setEditing(false);
    }
  };

  return (
    <tr className="hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/40">
      {/* Checkbox */}
      <td className="px-4 py-3">
        <button onClick={() => onToggle(product.id)} className="text-zinc-400 hover:text-white transition-colors">
          {selected ? (
            <CheckSquare className="w-4 h-4 text-cyan-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </td>

      {/* Product */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {product.featured_image ? (
            <img
              src={product.featured_image}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover border border-zinc-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Package className="w-4 h-4 text-zinc-500" />
            </div>
          )}
          <div>
            <p className="text-sm text-white font-medium truncate max-w-[200px]">{product.name}</p>
            {product.category && (
              <p className="text-xs text-zinc-500">{product.category}</p>
            )}
          </div>
        </div>
      </td>

      {/* SKU */}
      <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{product.sku || '-'}</td>

      {/* Retail Price */}
      <td className="px-4 py-3 text-sm text-zinc-300">
        {product.price != null
          ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)
          : '-'}
      </td>

      {/* Wholesale Price */}
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              onKeyDown={handlePriceKeyDown}
              onBlur={handlePriceSave}
              autoFocus
              step="0.01"
              min="0"
              className="w-24 px-2 py-1 rounded-lg bg-zinc-800 border border-cyan-500/40 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Click to edit wholesale price"
          >
            {wholesalePrice != null
              ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: product.currency || 'EUR' }).format(wholesalePrice)
              : 'Set price'}
          </button>
        )}
      </td>

      {/* Wholesale visibility toggle */}
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleWholesale(product.id, !isWholesale)}
          disabled={savingId === product.id}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isWholesale
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
              : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          {savingId === product.id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isWholesale ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          {isWholesale ? 'Visible' : 'Hidden'}
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function B2BCatalogManager() {
  const { user } = useUser();
  const organizationId = user?.organization_id || user?.company_id;

  const [products, setProducts] = useState([]);
  const [salesChannels, setSalesChannels] = useState({}); // { productId: { enabled, wholesale_price } }
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(0);

  // Selections
  const [selected, setSelected] = useState(new Set());

  // Action state
  const [savingId, setSavingId] = useState(null);

  // Categories extracted from products
  const [categories, setCategories] = useState([]);

  // -----------------------------------------------------------------------
  // Fetch products + wholesale channel status
  // -----------------------------------------------------------------------
  const fetchProducts = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);

    try {
      // Build products query
      let query = supabase
        .from('products')
        .select('id, name, sku, price, currency, featured_image, category, status', { count: 'exact' })
        .eq('company_id', organizationId)
        .order('name', { ascending: true });

      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      query = query.range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      const { data: productsData, count, error: prodError } = await query;
      if (prodError) throw prodError;

      setProducts(productsData || []);
      setTotalCount(count || 0);

      // Fetch wholesale channel entries for these products
      const productIds = (productsData || []).map((p) => p.id);
      if (productIds.length > 0) {
        const { data: channels, error: chError } = await supabase
          .from('product_sales_channels')
          .select('product_id, is_active')
          .in('product_id', productIds)
          .eq('channel', 'b2b')
          .eq('company_id', organizationId);

        if (!chError && channels) {
          const channelMap = {};
          channels.forEach((ch) => {
            channelMap[ch.product_id] = {
              enabled: ch.is_active !== false,
            };
          });
          setSalesChannels(channelMap);
        }
      } else {
        setSalesChannels({});
      }

      // Fetch all categories once
      const { data: catData } = await supabase
        .from('products')
        .select('category')
        .eq('company_id', organizationId)
        .not('category', 'is', null);

      if (catData) {
        const uniqueCats = [...new Set(catData.map((c) => c.category).filter(Boolean))].sort();
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('[B2BCatalogManager] fetch error:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [organizationId, search, categoryFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter]);

  // -----------------------------------------------------------------------
  // Toggle wholesale visibility
  // -----------------------------------------------------------------------
  const toggleWholesale = useCallback(
    async (productId, enable) => {
      setSavingId(productId);
      try {
        if (enable) {
          // Upsert channel entry
          const { error: upsertErr } = await supabase
            .from('product_sales_channels')
            .upsert(
              {
                product_id: productId,
                channel: 'b2b',
                is_active: true,
                company_id: organizationId,
              },
              { onConflict: 'product_id,channel' }
            );
          if (upsertErr) throw upsertErr;
        } else {
          // Disable (soft) or delete
          const { error: delErr } = await supabase
            .from('product_sales_channels')
            .delete()
            .eq('product_id', productId)
            .eq('channel', 'b2b')
            .eq('company_id', organizationId);
          if (delErr) throw delErr;
        }

        // Update local state
        setSalesChannels((prev) => {
          const next = { ...prev };
          if (enable) {
            next[productId] = { ...next[productId], enabled: true };
          } else {
            delete next[productId];
          }
          return next;
        });
      } catch (err) {
        console.error('[B2BCatalogManager] toggle error:', err);
        setError(err.message);
      } finally {
        setSavingId(null);
      }
    },
    [organizationId]
  );

  // -----------------------------------------------------------------------
  // Update wholesale price
  // -----------------------------------------------------------------------
  const updateWholesalePrice = useCallback(
    async (productId, price) => {
      setSavingId(productId);
      try {
        const { error: upErr } = await supabase
          .from('product_sales_channels')
          .upsert(
            {
              product_id: productId,
              channel: 'b2b',
              is_active: true,
              company_id: organizationId,
            },
            { onConflict: 'product_id,channel' }
          );
        if (upErr) throw upErr;

        setSalesChannels((prev) => ({
          ...prev,
          [productId]: { ...(prev[productId] || {}), enabled: true, wholesale_price: price },
        }));
      } catch (err) {
        console.error('[B2BCatalogManager] price update error:', err);
        setError(err.message);
      } finally {
        setSavingId(null);
      }
    },
    [organizationId]
  );

  // -----------------------------------------------------------------------
  // Bulk operations
  // -----------------------------------------------------------------------
  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkToggleWholesale = async (enable) => {
    for (const productId of selected) {
      await toggleWholesale(productId, enable);
    }
    setSelected(new Set());
  };

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Catalog Manager</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage which products appear in your wholesale store
            </p>
          </div>
          <button
            onClick={fetchProducts}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
            <span className="text-sm text-cyan-400 font-medium">{selected.size} selected</span>
            <button
              onClick={() => bulkToggleWholesale(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium hover:bg-cyan-500 transition-colors"
            >
              Enable Wholesale
            </button>
            <button
              onClick={() => bulkToggleWholesale(false)}
              className="px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-600 transition-colors"
            >
              Disable Wholesale
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-zinc-400 hover:text-white text-xs"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No products found</p>
              <p className="text-zinc-500 text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left">
                      <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white transition-colors">
                        {selected.size === products.length ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Retail Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Wholesale Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Wholesale</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isWholesale={!!salesChannels[product.id]?.enabled}
                      wholesalePrice={salesChannels[product.id]?.wholesale_price}
                      selected={selected.has(product.id)}
                      onToggle={toggleSelect}
                      onToggleWholesale={toggleWholesale}
                      onPriceChange={updateWholesalePrice}
                      savingId={savingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Showing {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-400 px-2">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white disabled:opacity-40 disabled:hover:text-zinc-400 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
