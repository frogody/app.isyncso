import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase, Plus, Search, Filter, Grid3X3, List, Tag, Eye, Edit2,
  Play, ExternalLink, FileText, Euro, Zap, Users, Star,
  ChevronDown, MoreHorizontal, Archive, Trash2, Copy,
  Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, ServiceProduct, ProductCategory } from "@/api/entities";
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
import { useTheme } from '@/contexts/GlobalThemeContext';
import { ProductsPageTransition } from '@/components/products/ui';

const STATUS_COLORS = {
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Published' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const PRICING_MODELS = {
  hourly: { label: 'Hourly', color: 'text-cyan-400' },
  retainer: { label: 'Retainer', color: 'text-blue-400' },
  project: { label: 'Project', color: 'text-cyan-300' },
  milestone: { label: 'Milestone', color: 'text-blue-300' },
  success_fee: { label: 'Success Fee', color: 'text-cyan-400' },
  hybrid: { label: 'Hybrid', color: 'text-blue-400' },
};

export default function ProductsServices() {
  const { user } = useUser();
  const { theme, toggleTheme, t } = useTheme();
  const [products, setProducts] = useState([]);
  const [serviceProducts, setServiceProducts] = useState({});
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
      serviceDetails: serviceProducts[product.id]
    });
    setModalOpen(true);
  };

  const handleProductSaved = async (savedProduct) => {
    toast.success('Service saved successfully!');
    // Reload data
    setLoading(true);
    try {
      const productsData = await Product.filter({ type: 'service' }, { limit: 5000 });
      setProducts(Array.isArray(productsData) ? productsData : []);
      const serviceData = await ServiceProduct.list({ limit: 5000 });
      const serviceMap = {};
      (serviceData || []).forEach(sp => {
        serviceMap[sp.product_id] = sp;
      });
      setServiceProducts(serviceMap);
    } catch (e) {
      console.error('Failed to reload services:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveProduct = async (product) => {
    try {
      await Product.update(product.id, { status: 'archived' });
      toast.success('Service archived');
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, status: 'archived' } : p
      ));
    } catch (e) {
      toast.error('Failed to archive service');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      // Delete service product details first if they exist
      if (serviceProducts[product.id]) {
        await ServiceProduct.delete(serviceProducts[product.id].id);
      }
      // Delete the main product
      await Product.delete(product.id);
      toast.success('Service deleted');
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (e) {
      console.error('Failed to delete service:', e);
      toast.error('Failed to delete service');
    }
  };

  // SEO: Set page title
  useEffect(() => {
    document.title = 'Services | iSyncSO';
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
        let serviceData = [];
        let categoriesData = [];

        try {
          const result = await Product.filter({ type: 'service' }, { limit: 5000 });
          productsData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load products:', e);
        }

        try {
          const result = await ServiceProduct.list({ limit: 5000 });
          serviceData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load service products:', e);
        }

        try {
          let result = await ProductCategory.filter({ product_type: 'service' }, { limit: 50 });
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

        // Map service product details by product_id
        const serviceMap = {};
        (serviceData || []).forEach(sp => {
          serviceMap[sp.product_id] = sp;
        });
        setServiceProducts(serviceMap);
      } catch (error) {
        console.error('Failed to load service products:', error);
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
        const sp = serviceProducts[p.id];
        if (!sp || sp.pricing_model !== pricingFilter) return false;
      }

      return true;
    });
  }, [products, serviceProducts, searchQuery, statusFilter, categoryFilter, pricingFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    withSLA: Object.values(serviceProducts).filter(sp => sp.sla?.response_time).length,
  }), [products, serviceProducts]);

  return (
    <ProductsPageTransition>
      <div className={`max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4 ${t('bg-slate-50 min-h-screen', 'min-h-screen')}`}>
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>Services</h1>
            <p className={`text-xs ${t('text-slate-500', 'text-zinc-400')}`}>Manage your service product catalog</p>
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
              <Briefcase className="w-4 h-4 mr-2" /> New Service
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
            <span className="text-lg font-bold text-cyan-400">{stats.withSLA}</span>
            <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>with SLA</span>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl p-3 ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t('text-slate-400', 'text-zinc-500')}`} />
              <Input
                placeholder="Search services..."
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
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'
            : 'space-y-3'
          }>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton
                key={i}
                className={viewMode === 'grid' ? `h-64 ${t('bg-slate-200', 'bg-zinc-800/50')}` : `h-20 ${t('bg-slate-200', 'bg-zinc-800/50')}`}
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
                    productType="service"
                    details={serviceProducts[product.id]}
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
                    productType="service"
                    details={serviceProducts[product.id]}
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
              <Briefcase className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className={`text-lg font-medium mb-2 ${t('text-slate-900', 'text-white')}`}>No services found</h4>
            <p className={`text-sm mb-4 ${t('text-slate-500', 'text-zinc-500')}`}>
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || pricingFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first service'}
            </p>
            <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Service
            </Button>
          </div>
        )}

        {/* Product Modal */}
        <ProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          productType="service"
          product={editingProduct}
          onSave={handleProductSaved}
        />
      </div>
    </ProductsPageTransition>
  );
}
