import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import anime from '@/lib/anime-wrapper';
const animate = anime;
import { prefersReducedMotion } from '@/lib/animations';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Box, Plus, Search, Filter, Grid3X3, List, Tag, Eye, Edit2,
  Barcode, Package, Truck, Building2, DollarSign, AlertTriangle,
  ChevronDown, MoreHorizontal, Archive, Trash2, Copy, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, PhysicalProduct, ProductCategory, Supplier } from "@/api/entities";
import { supabase } from '@/api/supabaseClient';
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
  draft: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const STOCK_STATUS = {
  in_stock: { label: 'In Stock', color: 'text-green-400', icon: CheckCircle },
  low_stock: { label: 'Low Stock', color: 'text-cyan-400', icon: AlertTriangle },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-400', icon: XCircle },
};

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
  const [products, setProducts] = useState([]);
  const [physicalProducts, setPhysicalProducts] = useState({});
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Refs for anime.js animations
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const productsGridRef = useRef(null);

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

  const handleProductSaved = async (savedProduct) => {
    toast.success('Product saved successfully!');
    // Reload data
    setLoading(true);
    try {
      const productsData = await Product.filter({ type: 'physical' }, { limit: 100 });
      setProducts(Array.isArray(productsData) ? productsData : []);
      const physicalData = await PhysicalProduct.list({ limit: 100 });
      const physicalMap = {};
      (physicalData || []).forEach(pp => {
        physicalMap[pp.product_id] = pp;
      });
      setPhysicalProducts(physicalMap);
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
      // Delete/clear related records first to avoid FK constraint violations
      // Order matters - delete child records before parent

      // 1. Delete from receiving_log (has FK to products)
      await supabase.from('receiving_log').delete().eq('product_id', product.id);

      // 2. Delete from inventory table
      await supabase.from('inventory').delete().eq('product_id', product.id);

      // 3. Delete from product_suppliers table
      await supabase.from('product_suppliers').delete().eq('product_id', product.id);

      // 4. Delete from expected_deliveries table
      await supabase.from('expected_deliveries').delete().eq('product_id', product.id);

      // 5. Clear product_id from expense_line_items (keep expense history)
      await supabase.from('expense_line_items').update({ product_id: null }).eq('product_id', product.id);

      // 6. Clear product_id from sales_order_items (keep order history)
      await supabase.from('sales_order_items').update({ product_id: null }).eq('product_id', product.id);

      // 7. Clear product_id from stock_purchase_line_items
      await supabase.from('stock_purchase_line_items').update({ product_id: null }).eq('product_id', product.id);

      // 8. Delete from stock_inventory_entries
      await supabase.from('stock_inventory_entries').delete().eq('product_id', product.id);

      // 9. Delete notifications related to product
      await supabase.from('notifications').delete().eq('product_id', product.id);

      // 10. Clear references in product_research_queue
      await supabase.from('product_research_queue').update({ matched_product_id: null }).eq('matched_product_id', product.id);
      await supabase.from('product_research_queue').update({ created_product_id: null }).eq('created_product_id', product.id);

      // 11. Delete physical product details if they exist
      if (physicalProducts[product.id]) {
        await PhysicalProduct.delete(product.id);
      }

      // 12. Delete the main product
      await Product.delete(product.id);
      toast.success('Product deleted');
      setProducts(prev => prev.filter(p => p.id !== product.id));
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
        let physicalData = [];
        let categoriesData = [];
        let suppliersData = [];

        try {
          const result = await Product.filter({ type: 'physical' }, { limit: 100 });
          productsData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load products:', e);
        }

        try {
          const result = await PhysicalProduct.list({ limit: 100 });
          physicalData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load physical products:', e);
        }

        try {
          let result = await ProductCategory.filter({ product_type: 'physical' }, { limit: 50 });
          if (!Array.isArray(result)) {
            result = await ProductCategory.list({ limit: 50 });
          }
          categoriesData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load categories:', e);
        }

        try {
          const result = await Supplier.list({ limit: 50 });
          suppliersData = Array.isArray(result) ? result : [];
        } catch (e) {
          console.warn('Failed to load suppliers:', e);
        }

        if (!isMounted) return;

        setProducts(productsData);
        setCategories(categoriesData);

        // Map physical product details by product_id
        const physicalMap = {};
        (physicalData || []).forEach(pp => {
          physicalMap[pp.product_id] = pp;
        });
        setPhysicalProducts(physicalMap);

        // Map suppliers by id
        const suppliersMap = {};
        (suppliersData || []).forEach(s => {
          suppliersMap[s.id] = s;
        });
        setSuppliers(suppliersMap);
      } catch (error) {
        console.error('Failed to load physical products:', error);
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
          p.category?.toLowerCase().includes(q) ||
          p.ean?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;

      // Stock filter
      if (stockFilter !== 'all') {
        const pp = physicalProducts[p.id];
        const stockStatus = getStockStatus(pp?.inventory);
        if (stockStatus !== stockFilter) return false;
      }

      return true;
    });
  }, [products, physicalProducts, searchQuery, statusFilter, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const stockCounts = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
    products.forEach(p => {
      const pp = physicalProducts[p.id];
      const stockStatus = getStockStatus(pp?.inventory);
      stockCounts[stockStatus]++;
    });

    return {
      total: products.length,
      published: products.filter(p => p.status === 'published').length,
      ...stockCounts,
    };
  }, [products, physicalProducts]);

  // Animate header on mount
  useEffect(() => {
    if (!headerRef.current || prefersReducedMotion()) return;

    animate({
      targets: headerRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 500,
      easing: 'easeOutQuart',
    });
  }, []);

  // Animate stats bar with count-up
  useEffect(() => {
    if (loading || !statsRef.current || prefersReducedMotion()) return;

    // Entrance animation for stats bar
    animate({
      targets: statsRef.current,
      translateY: [15, 0],
      opacity: [0, 1],
      duration: 400,
      easing: 'easeOutQuad',
      delay: 100,
    });

    // Count-up animation for stat numbers
    const statValues = statsRef.current.querySelectorAll('.stat-number');
    statValues.forEach(el => {
      const endValue = parseFloat(el.dataset.value) || 0;
      const obj = { value: 0 };

      animate({
        targets: obj,
        value: endValue,
        round: 1,
        duration: 1000,
        delay: 200,
        easing: 'easeOutExpo',
        update: () => {
          el.textContent = obj.value;
        },
      });
    });
  }, [loading, stats]);

  // Animate product cards when loaded
  useEffect(() => {
    if (loading || !productsGridRef.current || prefersReducedMotion()) return;

    const cards = productsGridRef.current.querySelectorAll('.product-card');
    if (cards.length === 0) return;

    // Set initial state
    Array.from(cards).forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(25px) scale(0.96)';
    });

    // Staggered entrance animation
    animate({
      targets: cards,
      translateY: [25, 0],
      scale: [0.96, 1],
      opacity: [0, 1],
      delay: anime.stagger(40, { start: 150 }),
      duration: 450,
      easing: 'easeOutQuart',
    });
  }, [loading, filteredProducts, viewMode]);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-cyan-950/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div ref={headerRef} style={{ opacity: 0 }}>
          <PageHeader
            title="Physical Products"
            subtitle="Hardware, merchandise, equipment, and tangible goods"
            icon={Box}
            color="cyan"
            actions={
              <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Physical Product
              </Button>
            }
          />
        </div>

        {/* Stats Bar */}
        <div ref={statsRef} className="flex items-center gap-6 p-4 rounded-xl bg-zinc-900/50 border border-white/5" style={{ opacity: 0 }}>
          <div className="flex items-center gap-2">
            <span className="stat-number text-2xl font-bold text-white" data-value={stats.total}>0</span>
            <span className="text-sm text-zinc-500">total</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="stat-number text-2xl font-bold text-green-400" data-value={stats.in_stock}>0</span>
            <span className="text-sm text-zinc-500">in stock</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="stat-number text-2xl font-bold text-cyan-400" data-value={stats.low_stock}>0</span>
            <span className="text-sm text-zinc-500">low stock</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="stat-number text-2xl font-bold text-red-400" data-value={stats.out_of_stock}>0</span>
            <span className="text-sm text-zinc-500">out of stock</span>
          </div>
        </div>

        {/* Filters */}
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search by name, EAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-zinc-900/50 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-zinc-900/50 border-white/10 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Filter */}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[160px] bg-zinc-900/50 border-white/10 text-white">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800/50 border border-white/5">
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
        </GlassCard>

        {/* Products Grid/List */}
        {loading ? (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-3'
          }>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton
                key={i}
                className={viewMode === 'grid' ? 'h-72 bg-zinc-800/50' : 'h-20 bg-zinc-800/50'}
              />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          viewMode === 'grid' ? (
            <div ref={productsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="product-card">
                  <ProductGridCard
                    product={product}
                    productType="physical"
                    details={physicalProducts[product.id]}
                    index={index}
                    onEdit={handleEditProduct}
                    onArchive={handleArchiveProduct}
                    onDelete={handleDeleteProduct}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div ref={productsGridRef} className="space-y-3">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className="product-card">
                  <ProductListRow
                    product={product}
                    productType="physical"
                    details={physicalProducts[product.id]}
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
          <GlassCard className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">No physical products found</h4>
            <p className="text-sm text-zinc-500 mb-4">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || stockFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first physical product'}
            </p>
            <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Physical Product
            </Button>
          </GlassCard>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productType="physical"
        product={editingProduct}
        onSave={handleProductSaved}
      />
    </div>
  );
}
