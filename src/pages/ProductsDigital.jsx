import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Cloud, Plus, Search, Filter, Grid3X3, List, Tag, Eye, Edit2,
  Play, ExternalLink, FileText, DollarSign, Zap, Users, Star,
  ChevronDown, MoreHorizontal, Archive, Trash2, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, ProductCategory } from "@/api/entities";
import { ProductModal, ProductGridCard, ProductListRow } from "@/components/products";
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

const STATUS_COLORS = {
  published: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Published' },
  draft: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const PRICING_MODELS = {
  free: { label: 'Free', color: 'text-green-400' },
  one_time: { label: 'One-time', color: 'text-cyan-400' },
  subscription: { label: 'Subscription', color: 'text-purple-400' },
  usage_based: { label: 'Usage-based', color: 'text-amber-400' },
  freemium: { label: 'Freemium', color: 'text-indigo-400' },
};

export default function ProductsDigital() {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [digitalProducts, setDigitalProducts] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pricingFilter, setPricingFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

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
      const productsData = await Product.filter({ type: 'digital' }, { limit: 100 });
      setProducts(Array.isArray(productsData) ? productsData : []);
      const digitalData = await DigitalProduct.list({ limit: 100 });
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
          const result = await Product.filter({ type: 'digital' }, { limit: 100 });
          productsData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load products:', e);
        }

        try {
          const result = await DigitalProduct.list({ limit: 100 });
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
    <div className="max-w-full mx-auto px-4 lg:px-6 pr-14 py-4 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Digital Products</h1>
          <p className="text-xs text-zinc-400">Manage your digital product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Digital Product
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{stats.total}</span>
          <span className="text-sm text-zinc-500">total</span>
        </div>
        <div className="w-px h-8 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-green-400">{stats.published}</span>
          <span className="text-sm text-zinc-500">published</span>
        </div>
        <div className="w-px h-8 bg-zinc-800" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-cyan-400">{stats.withTrial}</span>
          <span className="text-sm text-zinc-500">with trial</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search digital products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-zinc-800/60 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-800/60 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800/60">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-800/60 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800/60">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pricing Filter */}
          <Select value={pricingFilter} onValueChange={setPricingFilter}>
            <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-800/60 text-white">
              <SelectValue placeholder="Pricing" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800/60">
              <SelectItem value="all">All Pricing</SelectItem>
              {Object.entries(PRICING_MODELS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800/50 border border-zinc-800/60">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          : 'space-y-3'
        }>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton
              key={i}
              className={viewMode === 'grid' ? 'h-64 bg-zinc-800/50' : 'h-20 bg-zinc-800/50'}
            />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-8 h-8 text-cyan-400" />
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No digital products found</h4>
          <p className="text-sm text-zinc-500 mb-4">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || pricingFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first digital product'}
          </p>
          <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Digital Product
          </Button>
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
  );
}
