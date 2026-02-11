import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Box, Plus, Search, Filter, Grid3X3, List, Table2, Tag, Eye, Edit2,
  Barcode, Package, Truck, Building2, Euro, AlertTriangle,
  ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Archive, Trash2, Copy, CheckCircle, XCircle,
  Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, PhysicalProduct, ProductCategory, Supplier } from "@/api/entities";
import { supabase } from '@/api/supabaseClient';
import { ProductModal, ProductGridCard, ProductListRow, ProductTableView } from "@/components/products";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';

const STATUS_COLORS = {
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Published' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const STOCK_STATUS = {
  in_stock: { label: 'In Stock', color: 'text-cyan-400', icon: CheckCircle },
  low_stock: { label: 'Low Stock', color: 'text-cyan-400', icon: AlertTriangle },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-400', icon: XCircle },
};

const PAGE_SIZE = 50;

function getStockStatus(inventory) {
  if (!inventory) return 'out_of_stock';
  const qty = inventory.quantity || 0;
  const lowThreshold = inventory.low_stock_threshold || 10;
  if (qty <= 0) return 'out_of_stock';
  if (qty <= lowThreshold) return 'low_stock';
  return 'in_stock';
}

export default function ProductsPhysical() {
  const { user } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [physicalProducts, setPhysicalProducts] = useState({});
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [channelsMap, setChannelsMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter, channelFilter]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      physicalDetails: physicalProducts[product.id]
    });
    setModalOpen(true);
  };

  const handleProductSaved = async () => {
    toast.success('Product saved successfully!');
    loadProducts();
  };

  const handleArchiveProduct = async (product) => {
    try {
      await Product.update(product.id, { status: 'archived' });
      toast.success('Product archived');
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, status: 'archived' } : p
      ));
    } catch (e) {
      toast.error('Failed to archive product');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await supabase.from('receiving_log').delete().eq('product_id', product.id);
      await supabase.from('inventory').delete().eq('product_id', product.id);
      await supabase.from('product_suppliers').delete().eq('product_id', product.id);
      await supabase.from('expected_deliveries').delete().eq('product_id', product.id);
      await supabase.from('expense_line_items').update({ product_id: null }).eq('product_id', product.id);
      await supabase.from('sales_order_items').update({ product_id: null }).eq('product_id', product.id);
      await supabase.from('stock_purchase_line_items').update({ product_id: null }).eq('product_id', product.id);
      await supabase.from('stock_inventory_entries').delete().eq('product_id', product.id);
      await supabase.from('notifications').delete().eq('product_id', product.id);
      await supabase.from('product_research_queue').update({ matched_product_id: null }).eq('matched_product_id', product.id);
      await supabase.from('product_research_queue').update({ created_product_id: null }).eq('created_product_id', product.id);

      if (physicalProducts[product.id]) {
        await PhysicalProduct.delete(product.id);
      }

      await Product.delete(product.id);
      toast.success('Product deleted');
      loadProducts();
    } catch (e) {
      console.error('Failed to delete product:', e);
      toast.error('Failed to delete product: ' + (e.message || 'Unknown error'));
    }
  };

  // SEO: Set page title
  useEffect(() => {
    document.title = 'Physical Products | iSyncSO';
    return () => { document.title = 'iSyncSO'; };
  }, []);

  // Server-side paginated product fetch
  const loadProducts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Build server-side query with filters
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('type', 'physical')
        .order('created_at', { ascending: false });

      // Server-side search
      if (debouncedSearch.trim()) {
        query = query.or(`name.ilike.%${debouncedSearch.trim()}%,ean.ilike.%${debouncedSearch.trim()}%,sku.ilike.%${debouncedSearch.trim()}%,tagline.ilike.%${debouncedSearch.trim()}%`);
      }

      // Server-side status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Server-side category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      // Channel filter — need to get product IDs from junction table first
      if (channelFilter !== 'all') {
        const { data: channelProducts } = await supabase
          .from('product_sales_channels')
          .select('product_id')
          .eq('channel', channelFilter);
        const channelProductIds = (channelProducts || []).map(c => c.product_id);
        if (channelProductIds.length > 0) {
          query = query.in('id', channelProductIds);
        } else {
          // No products match this channel filter
          setProducts([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: productsData, count, error } = await query;
      if (error) throw error;

      setProducts(productsData || []);
      setTotalCount(count || 0);

      // Fetch physical product details for this page's products
      const productIds = (productsData || []).map(p => p.id);
      if (productIds.length > 0) {
        const { data: physicalData } = await supabase
          .from('physical_products')
          .select('*')
          .in('product_id', productIds);
        const physicalMap = {};
        (physicalData || []).forEach(pp => {
          physicalMap[pp.product_id] = pp;
        });
        setPhysicalProducts(physicalMap);

        // Fetch channels for this page's products
        const { data: channelsData } = await supabase
          .from('product_sales_channels')
          .select('product_id, channel')
          .in('product_id', productIds);
        const chMap = {};
        (channelsData || []).forEach(ch => {
          if (!chMap[ch.product_id]) chMap[ch.product_id] = [];
          chMap[ch.product_id].push(ch.channel);
        });
        setChannelsMap(chMap);
      } else {
        setPhysicalProducts({});
        setChannelsMap({});
      }
    } catch (error) {
      console.error('Failed to load physical products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, debouncedSearch, statusFilter, categoryFilter, channelFilter]);

  // Load categories and suppliers once
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        let catResult = await ProductCategory.filter({ product_type: 'physical' }, { limit: 200 });
        if (!Array.isArray(catResult)) catResult = await ProductCategory.list({ limit: 200 });
        setCategories(Array.isArray(catResult) ? catResult : []);
      } catch (e) {
        console.warn('Failed to load categories:', e);
      }
      try {
        const suppResult = await Supplier.list({ limit: 200 });
        const suppliersMap = {};
        (suppResult || []).forEach(s => { suppliersMap[s.id] = s; });
        setSuppliers(suppliersMap);
      } catch (e) {
        console.warn('Failed to load suppliers:', e);
      }
    })();
  }, [user]);

  // Load products when page/filters change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Stats — based on total count and current page data (lightweight)
  const stats = useMemo(() => {
    const stockCounts = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
    products.forEach(p => {
      const pp = physicalProducts[p.id];
      const stockStatus = getStockStatus(pp?.inventory);
      stockCounts[stockStatus]++;
    });

    return {
      total: totalCount,
      published: products.filter(p => p.status === 'published').length,
      ...stockCounts,
    };
  }, [products, physicalProducts, totalCount]);

  return (
    <ProductsPageTransition>
      <div className={`max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4 ${t('bg-slate-50 min-h-screen', 'min-h-screen')}`}>
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>Physical Products</h1>
            <p className={`text-xs ${t('text-slate-500', 'text-zinc-400')}`}>Manage your physical inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={`rounded-full ${t('text-slate-600 hover:bg-slate-200', 'text-zinc-400 hover:bg-zinc-800')}`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Physical Product
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={`flex items-center gap-6 p-3 rounded-xl ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>{stats.total}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>total</span>
          </div>
          <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.in_stock}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>in stock</span>
          </div>
          <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.low_stock}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>low stock</span>
          </div>
          <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-400">{stats.out_of_stock}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>out of stock</span>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl p-3 ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t('text-slate-400', 'text-zinc-500')}`} />
              <Input
                placeholder="Search by name, EAN, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 ${t('bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400', 'bg-zinc-900/50 border-zinc-800/60 text-white placeholder:text-zinc-500')}`}
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={`w-[140px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className={`w-[160px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Filter */}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className={`w-[160px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Channel Filter */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className={`w-[140px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className={`flex items-center gap-1 p-1 rounded-lg ${t('bg-slate-100 border border-slate-200', 'bg-zinc-800/50 border border-zinc-800/60')}`}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : `${t('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')}`}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : `${t('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')}`}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid/List/Table */}
        {loading ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'
            : 'space-y-3'
          }>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton
                key={i}
                className={viewMode === 'grid' ? `h-72 ${t('bg-slate-200', 'bg-zinc-800/50')}` : `h-14 ${t('bg-slate-200', 'bg-zinc-800/50')}`}
              />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {products.map((product, index) => (
                  <div key={product.id}>
                    <ProductGridCard
                      product={product}
                      productType="physical"
                      details={physicalProducts[product.id]}
                      salesChannels={channelsMap[product.id]}
                      index={index}
                      onEdit={handleEditProduct}
                      onArchive={handleArchiveProduct}
                      onDelete={handleDeleteProduct}
                    />
                  </div>
                ))}
              </div>
            ) : viewMode === 'table' ? (
              <ProductTableView
                products={products}
                productType="physical"
                detailsMap={physicalProducts}
                selectedIds={selectedIds}
                onToggleSelect={(id) => setSelectedIds(prev => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                })}
                onToggleAll={() => setSelectedIds(prev =>
                  prev.size === products.length
                    ? new Set()
                    : new Set(products.map(p => p.id))
                )}
                onEdit={handleEditProduct}
                onArchive={handleArchiveProduct}
                onDelete={handleDeleteProduct}
              />
            ) : (
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={product.id}>
                    <ProductListRow
                      product={product}
                      productType="physical"
                      details={physicalProducts[product.id]}
                      salesChannels={channelsMap[product.id]}
                      index={index}
                      onEdit={handleEditProduct}
                      onArchive={handleArchiveProduct}
                      onDelete={handleDeleteProduct}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between p-3 rounded-xl ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
                <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} products
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className={t('text-slate-600 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className={`px-1 ${t('text-slate-400', 'text-zinc-600')}`}>...</span>
                      ) : (
                        <Button
                          key={p}
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p)}
                          className={`h-8 w-8 p-0 ${currentPage === p
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : t('text-slate-600 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800')
                          }`}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className={t('text-slate-600 hover:bg-slate-100', 'text-zinc-400 hover:bg-zinc-800')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`rounded-xl p-12 text-center ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className={`text-lg font-medium mb-2 ${t('text-slate-900', 'text-white')}`}>No physical products found</h4>
            <p className={`text-sm mb-4 ${t('text-slate-500', 'text-zinc-500')}`}>
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all' || channelFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first physical product'}
            </p>
            <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Physical Product
            </Button>
          </div>
        )}

        {/* Product Modal */}
        <ProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          productType="physical"
          product={editingProduct}
          onSave={handleProductSaved}
        />
      </div>
    </ProductsPageTransition>
  );
}
