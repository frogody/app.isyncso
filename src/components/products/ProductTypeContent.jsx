import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPageUrl } from "@/utils";
import {
  Cloud, Box, Briefcase, Package, Plus, Search, Grid3X3, List, Table2,
  ChevronLeft, ChevronRight, Pencil, Save, X, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import { Product, DigitalProduct, PhysicalProduct, ServiceProduct, ProductCategory, Supplier } from "@/api/entities";
import { supabase } from '@/api/supabaseClient';
import { ProductModal, ProductGridCard, ProductListRow, ProductTableView } from "@/components/products";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from '@/contexts/GlobalThemeContext';

const DIGITAL_PRICING_MODELS = {
  free: { label: 'Free', color: 'text-cyan-400' },
  one_time: { label: 'One-time', color: 'text-cyan-400' },
  subscription: { label: 'Subscription', color: 'text-blue-400' },
  usage_based: { label: 'Usage-based', color: 'text-cyan-300' },
  freemium: { label: 'Freemium', color: 'text-blue-300' },
};

const SERVICE_PRICING_MODELS = {
  hourly: { label: 'Hourly', color: 'text-cyan-400' },
  retainer: { label: 'Retainer', color: 'text-blue-400' },
  project: { label: 'Project', color: 'text-cyan-300' },
  milestone: { label: 'Milestone', color: 'text-blue-300' },
  success_fee: { label: 'Success Fee', color: 'text-cyan-400' },
  hybrid: { label: 'Hybrid', color: 'text-blue-400' },
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

export default function ProductTypeContent({ productType = 'all' }) {
  const { user } = useUser();
  const { t } = useTheme();

  // Core data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsMap, setDetailsMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [pricingFilter, setPricingFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Pagination (physical & all)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Channels map (physical)
  const [channelsMap, setChannelsMap] = useState({});

  // Table selection & edit mode
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editMode, setEditMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});
  const [saving, setSaving] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const useServerSidePagination = productType === 'physical' || productType === 'all';
  const showPricingFilter = productType === 'digital' || productType === 'service' || productType === 'all';
  const showStockFilter = productType === 'physical' || productType === 'all';
  const showChannelFilter = productType === 'physical' || productType === 'all';
  const showTypeFilter = productType === 'all';
  const showTableView = productType === 'digital' || productType === 'physical' || productType === 'all';
  const showEditMode = showTableView;

  // Debounce search (server-side pagination)
  useEffect(() => {
    if (useServerSidePagination) {
      const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, useServerSidePagination]);

  // Reset page on filter change (server-side pagination)
  useEffect(() => {
    if (useServerSidePagination) {
      setCurrentPage(1);
    }
  }, [debouncedSearch, statusFilter, categoryFilter, channelFilter, stockFilter, typeFilter, useServerSidePagination]);

  // ---- Handlers ----

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    const detailsKey = productType === 'physical' ? 'physicalDetails'
      : productType === 'service' ? 'serviceDetails'
      : productType === 'digital' ? 'digitalDetails'
      : (product.type === 'physical' ? 'physicalDetails' : product.type === 'service' ? 'serviceDetails' : 'digitalDetails');
    setEditingProduct({ ...product, [detailsKey]: detailsMap[product.id] });
    setModalOpen(true);
  };

  const handleProductSaved = async () => {
    toast.success('Product saved successfully!');
    if (useServerSidePagination) {
      loadServerProducts();
    } else {
      loadClientProducts();
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
      const effectiveType = productType === 'all' ? product.type : productType;

      if (effectiveType === 'physical') {
        // Cascade delete for physical products
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
        if (detailsMap[product.id]) {
          await PhysicalProduct.delete(product.id);
        }
      } else if (effectiveType === 'digital') {
        if (detailsMap[product.id]) {
          await DigitalProduct.delete(detailsMap[product.id].id);
        }
      } else if (effectiveType === 'service') {
        if (detailsMap[product.id]) {
          await ServiceProduct.delete(detailsMap[product.id].id);
        }
      }

      await Product.delete(product.id);
      toast.success('Product deleted');

      if (useServerSidePagination) {
        loadServerProducts();
      } else {
        setProducts(prev => prev.filter(p => p.id !== product.id));
      }
    } catch (e) {
      console.error('Failed to delete product:', e);
      toast.error('Failed to delete product: ' + (e.message || 'Unknown error'));
    }
  };

  const handleFieldChange = useCallback((productId, field, value) => {
    setPendingEdits(prev => {
      const productEdits = { ...prev[productId] };
      const product = products.find(p => p.id === productId);
      const details = detailsMap[productId];

      let original;
      if (field === 'name') original = product?.name ?? '';
      else if (field === 'sku') original = details?.sku ?? '';
      else if (field === 'price') original = details?.pricing?.base_price ?? '';
      else if (field === 'stock') original = details?.inventory?.quantity ?? '';
      else if (field === 'status') original = product?.status ?? 'draft';

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
  }, [products, detailsMap]);

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
        if ('status' in edits) productUpdate.status = edits.status;

        if (Object.keys(productUpdate).length > 0) {
          await supabase.from('products').update(productUpdate).eq('id', productId);
        }

        // Physical product specific edits
        const details = detailsMap[productId];
        if (details && ('sku' in edits || 'price' in edits || 'stock' in edits)) {
          const ppUpdate = {};
          if ('sku' in edits) ppUpdate.sku = edits.sku;
          if ('price' in edits) {
            ppUpdate.pricing = {
              ...(details.pricing || {}),
              base_price: edits.price === '' ? null : parseFloat(edits.price),
            };
          }
          if ('stock' in edits) {
            ppUpdate.inventory = {
              ...(details.inventory || {}),
              quantity: edits.stock === '' ? 0 : parseInt(edits.stock, 10),
            };
          }
          await supabase.from('physical_products').update(ppUpdate).eq('product_id', productId);
        }
        savedCount++;
      }

      toast.success(`Updated ${savedCount} product${savedCount !== 1 ? 's' : ''}`);
      setPendingEdits({});
      setEditMode(false);

      if (useServerSidePagination) {
        loadServerProducts();
      } else {
        loadClientProducts();
      }
    } catch (e) {
      console.error('Failed to save edits:', e);
      toast.error('Failed to save some changes');
    } finally {
      setSaving(false);
    }
  };

  // ---- Server-side data loading (physical & all) ----

  const loadServerProducts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('company_id', user?.company_id)
        .order('created_at', { ascending: false });

      // Type filter
      if (productType !== 'all') {
        query = query.eq('type', productType);
      } else if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      // Server-side search
      if (debouncedSearch.trim()) {
        query = query.or(`name.ilike.%${debouncedSearch.trim()}%,ean.ilike.%${debouncedSearch.trim()}%,sku.ilike.%${debouncedSearch.trim()}%,tagline.ilike.%${debouncedSearch.trim()}%`);
      }

      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      // Channel filter (physical only, needs junction table lookup)
      if (channelFilter !== 'all') {
        const { data: channelProducts } = await supabase
          .from('product_sales_channels')
          .select('product_id')
          .eq('channel', channelFilter)
          .eq('company_id', user?.company_id);
        const channelProductIds = (channelProducts || []).map(c => c.product_id);
        if (channelProductIds.length > 0) {
          query = query.in('id', channelProductIds);
        } else {
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

      // Fetch type-specific details for this page
      const productIds = (productsData || []).map(p => p.id);
      if (productIds.length > 0) {
        const newDetailsMap = {};

        if (productType === 'physical' || productType === 'all') {
          const physicalIds = productType === 'all'
            ? (productsData || []).filter(p => p.type === 'physical').map(p => p.id)
            : productIds;
          if (physicalIds.length > 0) {
            const { data: physicalData } = await supabase
              .from('physical_products')
              .select('*')
              .in('product_id', physicalIds);
            (physicalData || []).forEach(pp => {
              newDetailsMap[pp.product_id] = pp;
            });
          }
        }

        if (productType === 'all') {
          // Also load digital & service details for 'all' view
          const digitalIds = (productsData || []).filter(p => p.type === 'digital').map(p => p.id);
          if (digitalIds.length > 0) {
            const { data: digitalData } = await supabase
              .from('digital_products')
              .select('*')
              .in('product_id', digitalIds);
            (digitalData || []).forEach(dp => {
              newDetailsMap[dp.product_id] = dp;
            });
          }

          const serviceIds = (productsData || []).filter(p => p.type === 'service').map(p => p.id);
          if (serviceIds.length > 0) {
            const { data: serviceData } = await supabase
              .from('service_products')
              .select('*')
              .in('product_id', serviceIds);
            (serviceData || []).forEach(sp => {
              newDetailsMap[sp.product_id] = sp;
            });
          }
        }

        setDetailsMap(newDetailsMap);

        // Fetch channels for physical products on this page
        const physIdsForChannels = productType === 'all'
          ? (productsData || []).filter(p => p.type === 'physical').map(p => p.id)
          : productIds;
        if (physIdsForChannels.length > 0 && (productType === 'physical' || productType === 'all')) {
          const { data: channelsData } = await supabase
            .from('product_sales_channels')
            .select('product_id, channel')
            .in('product_id', physIdsForChannels)
            .eq('company_id', user?.company_id);
          const chMap = {};
          (channelsData || []).forEach(ch => {
            if (!chMap[ch.product_id]) chMap[ch.product_id] = [];
            chMap[ch.product_id].push(ch.channel);
          });
          setChannelsMap(chMap);
        } else {
          setChannelsMap({});
        }
      } else {
        setDetailsMap({});
        setChannelsMap({});
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, debouncedSearch, statusFilter, categoryFilter, channelFilter, productType, typeFilter]);

  // ---- Client-side data loading (digital & service) ----

  const loadClientProducts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let productsData = [];
      let detailData = [];
      let categoriesData = [];

      try {
        const result = await Product.filter({ type: productType }, { limit: 5000 });
        productsData = Array.isArray(result) ? result : [];
      } catch (e) {
        console.warn('Failed to load products:', e);
      }

      try {
        if (productType === 'digital') {
          const result = await DigitalProduct.list({ limit: 5000 });
          detailData = Array.isArray(result) ? result : [];
        } else if (productType === 'service') {
          const result = await ServiceProduct.list({ limit: 5000 });
          detailData = Array.isArray(result) ? result : [];
        }
      } catch (e) {
        console.warn('Failed to load type-specific products:', e);
      }

      try {
        let result = await ProductCategory.filter({ product_type: productType }, { limit: 50 });
        if (!Array.isArray(result)) {
          result = await ProductCategory.list({ limit: 50 });
        }
        categoriesData = Array.isArray(result) ? result : [];
      } catch (e) {
        console.warn('Failed to load categories:', e);
      }

      setProducts(productsData);
      setCategories(categoriesData);

      const map = {};
      (detailData || []).forEach(d => {
        map[d.product_id] = d;
      });
      setDetailsMap(map);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [user, productType]);

  // ---- Load categories (server-side mode) ----

  useEffect(() => {
    if (!user?.id) return;
    if (!useServerSidePagination) return;

    (async () => {
      try {
        const catType = productType === 'all' ? undefined : productType;
        let catResult;
        if (catType) {
          catResult = await ProductCategory.filter({ product_type: catType }, { limit: 200 });
        }
        if (!Array.isArray(catResult)) {
          catResult = await ProductCategory.list({ limit: 200 });
        }
        setCategories(Array.isArray(catResult) ? catResult : []);
      } catch (e) {
        console.warn('Failed to load categories:', e);
      }

      if (productType === 'physical' || productType === 'all') {
        try {
          const suppResult = await Supplier.list({ limit: 200 });
          const suppliersMap = {};
          (suppResult || []).forEach(s => { suppliersMap[s.id] = s; });
          setSuppliers(suppliersMap);
        } catch (e) {
          console.warn('Failed to load suppliers:', e);
        }
      }
    })();
  }, [user, productType, useServerSidePagination]);

  // ---- Trigger loading ----

  useEffect(() => {
    if (useServerSidePagination) {
      loadServerProducts();
    }
  }, [loadServerProducts, useServerSidePagination]);

  useEffect(() => {
    if (!useServerSidePagination) {
      loadClientProducts();
    }
  }, [loadClientProducts, useServerSidePagination]);

  // ---- Client-side filtering (digital & service) ----

  const filteredProducts = useMemo(() => {
    if (useServerSidePagination) return products;

    return products.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = p.name?.toLowerCase().includes(q) ||
          p.tagline?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;

      if (pricingFilter !== 'all') {
        const detail = detailsMap[p.id];
        if (!detail || detail.pricing_model !== pricingFilter) return false;
      }

      return true;
    });
  }, [products, detailsMap, searchQuery, statusFilter, categoryFilter, pricingFilter, useServerSidePagination]);

  // ---- Stats ----

  const stats = useMemo(() => {
    if (productType === 'digital') {
      return {
        total: products.length,
        published: products.filter(p => p.status === 'published').length,
        withTrial: Object.values(detailsMap).filter(dp => dp.trial_available).length,
      };
    }

    if (productType === 'service') {
      return {
        total: products.length,
        published: products.filter(p => p.status === 'published').length,
        withSLA: Object.values(detailsMap).filter(sp => sp.sla?.response_time).length,
      };
    }

    if (productType === 'physical') {
      const stockCounts = { in_stock: 0, low_stock: 0, out_of_stock: 0 };
      products.forEach(p => {
        const pp = detailsMap[p.id];
        const stockStatus = getStockStatus(pp?.inventory);
        stockCounts[stockStatus]++;
      });
      return {
        total: totalCount,
        ...stockCounts,
      };
    }

    // 'all' type
    const typeCounts = { digital: 0, physical: 0, service: 0 };
    products.forEach(p => {
      if (typeCounts[p.type] !== undefined) typeCounts[p.type]++;
    });
    return {
      total: totalCount,
      published: products.filter(p => p.status === 'published').length,
      digital: typeCounts.digital,
      physical: typeCounts.physical,
      service: typeCounts.service,
    };
  }, [products, detailsMap, totalCount, productType]);

  const totalPages = useServerSidePagination ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  const displayProducts = useServerSidePagination ? products : filteredProducts;

  // ---- Resolve effective product type for modal ----

  const getModalProductType = () => {
    if (productType !== 'all') return productType;
    if (typeFilter !== 'all') return typeFilter;
    return 'physical'; // default for 'all'
  };

  // ---- Determine empty state icon and messaging ----

  const getEmptyStateConfig = () => {
    const hasFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
      || (showPricingFilter && pricingFilter !== 'all')
      || (showStockFilter && stockFilter !== 'all')
      || (showChannelFilter && channelFilter !== 'all')
      || (showTypeFilter && typeFilter !== 'all');

    if (productType === 'digital') {
      return {
        icon: Cloud,
        title: 'No digital products found',
        message: hasFilters ? 'Try adjusting your filters' : 'Get started by adding your first digital product',
        buttonText: 'Add Digital Product',
      };
    }
    if (productType === 'physical') {
      return {
        icon: Box,
        title: 'No physical products found',
        message: hasFilters ? 'Try adjusting your filters' : 'Get started by adding your first physical product',
        buttonText: 'Add Physical Product',
      };
    }
    if (productType === 'service') {
      return {
        icon: Briefcase,
        title: 'No services found',
        message: hasFilters ? 'Try adjusting your filters' : 'Get started by adding your first service',
        buttonText: 'Add Service',
      };
    }
    return {
      icon: Package,
      title: 'No products found',
      message: hasFilters ? 'Try adjusting your filters' : 'Get started by adding your first product',
      buttonText: 'Add Product',
    };
  };

  // ---- Search placeholder ----

  const getSearchPlaceholder = () => {
    if (productType === 'digital') return 'Search digital products...';
    if (productType === 'physical') return 'Search by name, EAN, SKU...';
    if (productType === 'service') return 'Search services...';
    return 'Search all products...';
  };

  // ---- Pricing models for current type ----

  const getPricingModels = () => {
    if (productType === 'digital') return DIGITAL_PRICING_MODELS;
    if (productType === 'service') return SERVICE_PRICING_MODELS;
    // For 'all', combine both
    return { ...DIGITAL_PRICING_MODELS, ...SERVICE_PRICING_MODELS };
  };

  // ---- Determine the effective productType for card rendering ----

  const getCardProductType = (product) => {
    if (productType !== 'all') return productType;
    return product.type || 'physical';
  };

  // ---- Render ----

  const emptyConfig = getEmptyStateConfig();
  const EmptyIcon = emptyConfig.icon;

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className={`flex items-center gap-6 p-3 rounded-xl ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${t('text-slate-900', 'text-white')}`}>{stats.total}</span>
          <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>total</span>
        </div>
        <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />

        {productType === 'digital' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.published}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>published</span>
            </div>
            <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.withTrial}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>with trial</span>
            </div>
          </>
        )}

        {productType === 'service' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.published}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>published</span>
            </div>
            <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.withSLA}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>with SLA</span>
            </div>
          </>
        )}

        {productType === 'physical' && (
          <>
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
          </>
        )}

        {productType === 'all' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.published}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>published</span>
            </div>
            <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.digital}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>digital</span>
            </div>
            <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.physical}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>physical</span>
            </div>
            <div className={`w-px h-8 ${t('bg-slate-200', 'bg-zinc-800')}`} />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-cyan-400">{stats.service}</span>
              <span className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>service</span>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className={`rounded-xl p-3 ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t('text-slate-400', 'text-zinc-500')}`} />
            <Input
              placeholder={getSearchPlaceholder()}
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

          {/* Type Filter (all mode only) */}
          {showTypeFilter && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={`w-[140px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Pricing Filter */}
          {showPricingFilter && (
            <Select value={pricingFilter} onValueChange={setPricingFilter}>
              <SelectTrigger className={`w-[160px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Pricing" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Pricing</SelectItem>
                {Object.entries(getPricingModels()).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Stock Filter */}
          {showStockFilter && (
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
          )}

          {/* Channel Filter */}
          {showChannelFilter && (
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className={`w-[140px] ${t('bg-slate-50 border-slate-200 text-slate-900', 'bg-zinc-900/50 border-zinc-800/60 text-white')}`}>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent className={t('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')}>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="b2c">B2C</SelectItem>
                <SelectItem value="bolcom">bol.com</SelectItem>
                <SelectItem value="shopify">Shopify</SelectItem>
              </SelectContent>
            </Select>
          )}

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
            {showTableView && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Edit Mode Toggle (table view only) */}
          {showEditMode && viewMode === 'table' && (
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
      ) : displayProducts.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {displayProducts.map((product, index) => (
                <div key={product.id}>
                  <ProductGridCard
                    product={product}
                    productType={getCardProductType(product)}
                    details={detailsMap[product.id]}
                    salesChannels={channelsMap[product.id]}
                    index={index}
                    onEdit={handleEditProduct}
                    onArchive={handleArchiveProduct}
                    onDelete={handleDeleteProduct}
                  />
                </div>
              ))}
            </div>
          ) : viewMode === 'table' && showTableView ? (
            <ProductTableView
              products={displayProducts}
              productType={productType === 'all' ? (typeFilter !== 'all' ? typeFilter : 'physical') : productType}
              detailsMap={detailsMap}
              selectedIds={selectedIds}
              onToggleSelect={(id) => setSelectedIds(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
              onToggleAll={() => setSelectedIds(prev =>
                prev.size === displayProducts.length
                  ? new Set()
                  : new Set(displayProducts.map(p => p.id))
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
              {displayProducts.map((product, index) => (
                <div key={product.id}>
                  <ProductListRow
                    product={product}
                    productType={getCardProductType(product)}
                    details={detailsMap[product.id]}
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

          {/* Pagination (server-side only) */}
          {useServerSidePagination && totalPages > 1 && (
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
            <EmptyIcon className="w-8 h-8 text-cyan-400" />
          </div>
          <h4 className={`text-lg font-medium mb-2 ${t('text-slate-900', 'text-white')}`}>{emptyConfig.title}</h4>
          <p className={`text-sm mb-4 ${t('text-slate-500', 'text-zinc-500')}`}>
            {emptyConfig.message}
          </p>
          <Button onClick={handleAddProduct} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> {emptyConfig.buttonText}
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
                'Edit mode \u2014 click cells to edit'
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
        productType={getModalProductType()}
        product={editingProduct}
        onSave={handleProductSaved}
      />
    </div>
  );
}
