import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Cloud, Plus, Search, Filter, Grid3X3, List, Table2, Tag, Eye, Edit2,
  Play, ExternalLink, FileText, Euro, Zap, Users, Star,
  ChevronDown, MoreHorizontal, Archive, Trash2, Copy,
  Sun, Moon, Pencil, Save, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, ProductCategory } from "@/api/entities";
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

const PRICING_MODELS = {
  free: { label: 'Free', color: 'text-cyan-400' },
  one_time: { label: 'One-time', color: 'text-cyan-400' },
  subscription: { label: 'Subscription', color: 'text-blue-400' },
  usage_based: { label: 'Usage-based', color: 'text-cyan-300' },
  freemium: { label: 'Freemium', color: 'text-blue-300' },
};

export default function ProductsDigital() {
  const { user } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const [products, setProducts] = useState([]);
  const [digitalProducts, setDigitalProducts] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pricingFilter, setPricingFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Table selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      digitalDetails: digitalProducts[product.id]
    });
    setModalOpen(true);
  };

  const handleProductSaved = async (savedProduct) => {
    toast.success('Product saved successfully!');
    // Reload data
    setLoading(true);
    try {
      const productsData = await Product.filter({ type: 'digital' }, { limit: 5000 });
      setProducts(Array.isArray(productsData) ? productsData : []);
      const digitalData = await DigitalProduct.list({ limit: 5000 });
      const digitalMap = {};
      (digitalData || []).forEach(dp => {
        digitalMap[dp.product_id] = dp;
      });
      setDigitalProducts(digitalMap);
    } catch (e) {
      console.error('Failed to reload products:', e);
    } finally {
      setLoading(false);
    }
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
      // Delete digital product details first if they exist
      if (digitalProducts[product.id]) {
        await DigitalProduct.delete(digitalProducts[product.id].id);
      }
      // Delete the main product
      await Product.delete(product.id);
      toast.success('Product deleted');
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (e) {
      console.error('Failed to delete product:', e);
      toast.error('Failed to delete product');
    }
  };

  const handleFieldChange = useCallback((productId, field, value) => {
    setPendingEdits(prev => {
      const productEdits = { ...prev[productId] };
      const product = products.find(p => p.id === productId);

      let original;
      if (field === 'name') original = product?.name ?? '';

      if (String(value) === String(original)) {
        delete productEdits[field];
      } else {
        productEdits[field] = value;
      }

      const next = { ...prev };
      if (Object.keys(productEdits).length === 0) {
        delete next[productId];
      } else {
        next[productId] = productEdits;
      }
      return next;
    });
  }, [products]);

  const editCount = Object.keys(pendingEdits).length;

  const handleDiscardEdits = () => {
    setPendingEdits({});
    setEditMode(false);
  };

  const handleSaveEdits = async () => {
    if (editCount === 0) return;
    setSaving(true);
    try {
      const entries = Object.entries(pendingEdits);
      let savedCount = 0;

      for (const [productId, edits] of entries) {
        const productUpdate = {};
        if ('name' in edits) productUpdate.name = edits.name;

        if (Object.keys(productUpdate).length > 0) {
          await supabase.from('products').update(productUpdate).eq('id', productId);
        }
        savedCount++;
      }

      toast.success(`Updated ${savedCount} product${savedCount !== 1 ? 's' : ''}`);
      setPendingEdits({});
      setEditMode(false);
      // Reload
      setLoading(true);
      try {
        const result = await Product.filter({ type: 'digital' }, { limit: 5000 });
        setProducts(Array.isArray(result) ? result : []);
      } finally {
        setLoading(false);
      }
    } catch (e) {
      console.error('Failed to save edits:', e);
      toast.error('Failed to save some changes');
    } finally {
      setSaving(false);
    }
  };

  // SEO: Set page title
  useEffect(() => {
    document.title = 'Digital Products | iSyncSO';
    return () => { document.title = 'iSyncSO'; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Load all data with defensive checks
        let productsData = [];
        let digitalData = [];
        let categoriesData = [];

        try {
          const result = await Product.filter({ type: 'digital' }, { limit: 5000 });
          productsData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load products:', e);
        }

        try {
          const result = await DigitalProduct.list({ limit: 5000 });
          digitalData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load digital products:', e);
        }

        try {
          let result = await ProductCategory.filter({ product_type: 'digital' }, { limit: 50 });
          if (!Array.isArray(result)) {
            result = await ProductCategory.list({ limit: 50 });
          }
          categoriesData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load categories:', e);
        }

        if (!isMounted) return;

        setProducts(productsData);
        setCategories(categoriesData);

        // Map digital product details by product_id
        const digitalMap = {};
        (digitalData || []).forEach(dp => {
          digitalMap[dp.product_id] = dp;
        });
        setDigitalProducts(digitalMap);
      } catch (error) {
        console.error('Failed to load digital products:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = p.name?.toLowerCase().includes(q) ||
          p.tagline?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;

      // Pricing filter
      if (pricingFilter !== 'all') {
        const dp = digitalProducts[p.id];
        if (!dp || dp.pricing_model !== pricingFilter) return false;
      }

      return true;
    });
  }, [products, digitalProducts, searchQuery, statusFilter, categoryFilter, pricingFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    withTrial: Object.values(digitalProducts).filter(dp => dp.trial_available).length,
  }), [products, digitalProducts]);

  return (
    <ProductsPageTransition>
      <div className={`max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4 ${t('bg-slate-50 min-h-screen', 'min-h-screen')}`}>
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>Digital Products</h1>
            <p className={`text-xs ${t('text-slate-500', 'text-zinc-400')}`}>Manage your digital product catalog</p>
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
              <Plus className="w-4 h-4 mr-2" /> New Digital Product
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
            <span className="text-lg font-bold text-cyan-400">{stats.published}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>published</span>
          </div>
          <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.withTrial}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>with trial</span>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl p-3 ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t('text-slate-400', 'text-zinc-500')}`} />
              <Input
                placeholder="Search digital products..."
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

            {/* Pricing Filter */}
            <Select value={pricingFilter} onValueChange={setPricingFilter}>
              <SelectTrigger className={`w-[160px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Pricing" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Pricing</SelectItem>
                {Object.entries(PRICING_MODELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
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

            {/* Edit Mode Toggle (table view only) */}
            {viewMode === 'table' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (editMode) {
                    handleDiscardEdits();
                  } else {
                    setEditMode(true);
                  }
                }}
                className={`h-8 px-3 ${editMode ? 'bg-cyan-500/20 text-cyan-400' : t('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')}`}
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                {editMode ? 'Editing' : 'Edit'}
              </Button>
            )}
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
                className={viewMode === 'grid' ? `h-64 ${t('bg-slate-200', 'bg-zinc-800/50')}` : `h-14 ${t('bg-slate-200', 'bg-zinc-800/50')}`}
              />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product, index) => (
                <div key={product.id}>
                  <ProductGridCard
                    product={product}
                    productType="digital"
                    details={digitalProducts[product.id]}
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
              products={filteredProducts}
              productType="digital"
              detailsMap={digitalProducts}
              selectedIds={selectedIds}
              onToggleSelect={(id) => setSelectedIds(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
              onToggleAll={() => setSelectedIds(prev =>
                prev.size === filteredProducts.length
                  ? new Set()
                  : new Set(filteredProducts.map(p => p.id))
              )}
              onEdit={handleEditProduct}
              onArchive={handleArchiveProduct}
              onDelete={handleDeleteProduct}
              editMode={editMode}
              pendingEdits={pendingEdits}
              onFieldChange={handleFieldChange}
            />
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product, index) => (
                <div key={product.id}>
                  <ProductListRow
                    product={product}
                    productType="digital"
                    details={digitalProducts[product.id]}
                    index={index}
                    onEdit={handleEditProduct}
                    onArchive={handleArchiveProduct}
                    onDelete={handleDeleteProduct}
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className={`rounded-xl p-12 text-center ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className={`text-lg font-medium mb-2 ${t('text-slate-900', 'text-white')}`}>No digital products found</h4>
            <p className={`text-sm mb-4 ${t('text-slate-500', 'text-zinc-500')}`}>
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || pricingFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first digital product'}
            </p>
            <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Digital Product
            </Button>
          </div>
        )}

        {/* Bulk Edit Save Bar */}
        {editMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`}>
              <span className={`text-sm ${t('text-slate-600', 'text-zinc-400')}`}>
                {editCount > 0 ? (
                  <><span className="font-semibold text-cyan-400">{editCount}</span> product{editCount !== 1 ? 's' : ''} modified</>
                ) : (
                  'Edit mode — click cells to edit'
                )}
              </span>
              <div className={`w-px h-6 ${t('bg-slate-200', 'bg-zinc-700')}`} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscardEdits}
                disabled={saving}
                className={t('text-slate-600 hover:text-slate-900', 'text-zinc-400 hover:text-white')}
              >
                <X className="w-4 h-4 mr-1" /> Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdits}
                disabled={editCount === 0 || saving}
                className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        )}

        {/* Product Modal */}
        <ProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          productType="digital"
          product={editingProduct}
          onSave={handleProductSaved}
        />
      </div>
    </ProductsPageTransition>
  );
}
