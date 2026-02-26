import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle, Package, ArrowLeft, Search, Filter,
  Image, Tag, FileText, Barcode, DollarSign, Truck,
  ChevronLeft, ChevronRight, ExternalLink, CheckCircle2,
  XCircle, ShieldAlert, Weight, Users, Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/context/UserContext";
import { supabase } from '@/api/supabaseClient';
import { sanitizeSearchInput } from '@/utils/validation';
import { useTheme } from '@/contexts/GlobalThemeContext';

const PAGE_SIZE = 50;

const HEALTH_CHECKS = [
  { id: 'missing_price', label: 'Missing Price', icon: DollarSign, color: 'red', description: 'No selling price set' },
  { id: 'missing_ean', label: 'Missing EAN', icon: Barcode, color: 'red', description: 'No EAN/barcode code' },
  { id: 'missing_image', label: 'Missing Image', icon: Image, color: 'amber', description: 'No product image' },
  { id: 'missing_category', label: 'Missing Category', icon: Tag, color: 'amber', description: 'No category assigned' },
  { id: 'missing_description', label: 'Missing Description', icon: FileText, color: 'zinc', description: 'No product description' },
  { id: 'missing_sku', label: 'Missing SKU', icon: Box, color: 'zinc', description: 'No SKU code set' },
  { id: 'missing_weight', label: 'Missing Weight', icon: Weight, color: 'zinc', description: 'No shipping weight defined' },
  { id: 'missing_supplier', label: 'Missing Supplier', icon: Users, color: 'zinc', description: 'No supplier linked' },
];

const SEVERITY_ORDER = { red: 0, amber: 1, zinc: 2 };

function getIssuesForProduct(product, physicalDetails) {
  const issues = [];

  // Missing price
  const price = physicalDetails?.pricing?.base_price;
  if (!price || price === 0) {
    issues.push('missing_price');
  }

  // Missing EAN
  if (!product.ean || product.ean.trim() === '') {
    const barcode = physicalDetails?.barcode;
    if (!barcode || barcode.trim() === '') {
      issues.push('missing_ean');
    }
  }

  // Missing image
  if (!product.featured_image || !product.featured_image.url) {
    issues.push('missing_image');
  }

  // Missing category
  if (!product.category || product.category.trim() === '') {
    issues.push('missing_category');
  }

  // Missing description
  if (!product.description || product.description.trim() === '') {
    issues.push('missing_description');
  }

  // Missing SKU
  if (!physicalDetails?.sku || physicalDetails.sku.trim() === '') {
    if (!product.sku || product.sku.trim() === '') {
      issues.push('missing_sku');
    }
  }

  // Missing weight
  if (!physicalDetails?.shipping?.weight) {
    issues.push('missing_weight');
  }

  // Missing supplier
  if (!physicalDetails?.supplier_id) {
    issues.push('missing_supplier');
  }

  return issues;
}

export default function ProductDataHealth() {
  const { user } = useUser();
  const { t } = useTheme();

  const [products, setProducts] = useState([]);
  const [physicalMap, setPhysicalMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [globalCounts, setGlobalCounts] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeFilter]);

  // Load global issue counts (once)
  useEffect(() => {
    if (!user?.company_id) return;

    const loadGlobalCounts = async () => {
      try {
        // Load ALL physical products and their details to compute issue counts
        const { data: allProducts, error: pErr } = await supabase
          .from('products')
          .select('id, ean, featured_image, category, description, sku')
          .eq('company_id', user.company_id)
          .eq('type', 'physical')
          .range(0, 49999);

        if (pErr) throw pErr;

        const allIds = (allProducts || []).map(p => p.id);
        const allPhysical = [];
        for (let i = 0; i < allIds.length; i += 500) {
          const batch = allIds.slice(i, i + 500);
          const { data: batchData } = await supabase
            .from('physical_products')
            .select('product_id, pricing, sku, barcode, shipping, supplier_id')
            .in('product_id', batch);
          if (batchData) allPhysical.push(...batchData);
        }

        const ppMap = {};
        allPhysical.forEach(pp => { ppMap[pp.product_id] = pp; });

        const counts = {};
        HEALTH_CHECKS.forEach(hc => { counts[hc.id] = 0; });
        let totalWithIssues = 0;

        (allProducts || []).forEach(p => {
          const issues = getIssuesForProduct(p, ppMap[p.id]);
          if (issues.length > 0) totalWithIssues++;
          issues.forEach(issue => { counts[issue] = (counts[issue] || 0) + 1; });
        });

        setGlobalCounts({ ...counts, total_with_issues: totalWithIssues, total: allProducts?.length || 0 });
      } catch (e) {
        console.error('Failed to load global health counts:', e);
      }
    };

    loadGlobalCounts();
  }, [user?.company_id]);

  // Filters that need physical_products table data
  const PHYSICAL_TABLE_FILTERS = ['missing_price', 'missing_sku', 'missing_weight', 'missing_supplier'];

  // Load products for current page
  const loadProducts = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);

    try {
      // For physical-table-dependent filters, first find matching product IDs
      let physicalFilterIds = null;
      if (PHYSICAL_TABLE_FILTERS.includes(activeFilter)) {
        // Get all physical_products for this company
        const { data: allProductIds } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', user.company_id)
          .eq('type', 'physical')
          .range(0, 49999);

        const ids = (allProductIds || []).map(p => p.id);
        const allPhysical = [];
        for (let i = 0; i < ids.length; i += 500) {
          const batch = ids.slice(i, i + 500);
          const { data: batchData } = await supabase
            .from('physical_products')
            .select('product_id, pricing, sku, shipping, supplier_id')
            .in('product_id', batch);
          if (batchData) allPhysical.push(...batchData);
        }

        const ppMap = {};
        allPhysical.forEach(pp => { ppMap[pp.product_id] = pp; });

        // Find product IDs that match the filter
        physicalFilterIds = ids.filter(id => {
          const pp = ppMap[id];
          if (activeFilter === 'missing_price') return !pp?.pricing?.base_price || pp.pricing.base_price === 0;
          if (activeFilter === 'missing_sku') return !pp?.sku || pp.sku.trim() === '';
          if (activeFilter === 'missing_weight') return !pp?.shipping?.weight;
          if (activeFilter === 'missing_supplier') return !pp?.supplier_id;
          return false;
        });

        if (physicalFilterIds.length === 0) {
          setProducts([]);
          setTotalCount(0);
          setPhysicalMap({});
          setLoading(false);
          return;
        }
      }

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('company_id', user.company_id)
        .eq('type', 'physical')
        .order('name', { ascending: true });

      if (debouncedSearch.trim()) {
        const cleanSearch = sanitizeSearchInput(debouncedSearch.trim());
        if (cleanSearch) {
          query = query.or(`name.ilike.%${cleanSearch}%,ean.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%`);
        }
      }

      // Server-side filterable issues
      if (activeFilter === 'missing_ean') {
        query = query.or('ean.is.null,ean.eq.');
      } else if (activeFilter === 'missing_image') {
        query = query.is('featured_image', null);
      } else if (activeFilter === 'missing_category') {
        query = query.or('category.is.null,category.eq.');
      } else if (activeFilter === 'missing_description') {
        query = query.or('description.is.null,description.eq.');
      }

      // Physical-table-dependent filters: use pre-computed IDs
      if (physicalFilterIds) {
        // Supabase .in() has URL length limits, paginate the IDs
        const pageIds = physicalFilterIds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
        if (pageIds.length > 0) {
          query = query.in('id', pageIds).range(0, PAGE_SIZE - 1);
        }
        setTotalCount(physicalFilterIds.length);
      } else {
        const from = (currentPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        query = query.range(from, to);
      }

      const { data: productsData, count, error } = await query;
      if (error) throw error;

      setProducts(productsData || []);
      if (!physicalFilterIds) {
        setTotalCount(count || 0);
      }

      // Load physical_products details
      const productIds = (productsData || []).map(p => p.id);
      if (productIds.length > 0) {
        const { data: physData } = await supabase
          .from('physical_products')
          .select('*')
          .in('product_id', productIds);

        const pMap = {};
        (physData || []).forEach(pp => { pMap[pp.product_id] = pp; });
        setPhysicalMap(pMap);
      } else {
        setPhysicalMap({});
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, currentPage, debouncedSearch, activeFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Compute issues for displayed products
  const productsWithIssues = useMemo(() => {
    return products.map(p => {
      const issues = getIssuesForProduct(p, physicalMap[p.id]);
      return { ...p, issues, physicalDetails: physicalMap[p.id] };
    }).filter(p => {
      // 'all' filter: only show products that actually have issues
      if (activeFilter === 'all') {
        return p.issues.length > 0;
      }
      // For specific filters, products are already filtered server-side or by pre-computed IDs
      return true;
    });
  }, [products, physicalMap, activeFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getColorClasses = (color) => {
    switch (color) {
      case 'red': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
      case 'amber': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
      default: return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
    }
  };

  const getIssueBadge = (issueId) => {
    const check = HEALTH_CHECKS.find(hc => hc.id === issueId);
    if (!check) return null;
    const colors = getColorClasses(check.color);
    return (
      <Badge key={issueId} className={`${colors.bg} ${colors.text} ${colors.border} border text-[11px] gap-1`}>
        <check.icon className="w-3 h-3" />
        {check.label}
      </Badge>
    );
  };

  // Completeness score
  const getCompletenessScore = (issues) => {
    const totalChecks = HEALTH_CHECKS.length;
    const passing = totalChecks - issues.length;
    return Math.round((passing / totalChecks) * 100);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-cyan-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="px-4 lg:px-6 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Products') + '?tab=physical'}>
            <Button variant="ghost" size="sm" className={`gap-1.5 ${t('text-slate-600 hover:text-slate-900', 'text-zinc-400 hover:text-white')}`}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className={`text-xl font-semibold ${t('text-slate-900', 'text-white')}`}>Product Data Health</h1>
            <p className={`text-sm ${t('text-slate-500', 'text-zinc-500')}`}>
              {globalCounts ? `${globalCounts.total_with_issues} of ${globalCounts.total} products have missing data` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {HEALTH_CHECKS.map(check => {
          const count = globalCounts?.[check.id] ?? '...';
          const colors = getColorClasses(check.color);
          const isActive = activeFilter === check.id;
          const CheckIcon = check.icon;

          return (
            <button
              key={check.id}
              onClick={() => setActiveFilter(activeFilter === check.id ? 'all' : check.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? `${colors.border} ${colors.bg} ring-1 ring-${check.color}-500/30`
                  : t(
                      'bg-white border-slate-200 hover:border-slate-300',
                      'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700'
                    )
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <CheckIcon className={`w-4 h-4 ${isActive ? colors.text : t('text-slate-400', 'text-zinc-500')}`} />
                <span className={`text-lg font-bold ${
                  count === 0 ? 'text-cyan-400' : (check.color === 'red' ? 'text-red-400' : check.color === 'amber' ? 'text-amber-400' : t('text-slate-600', 'text-zinc-400'))
                }`}>
                  {count}
                </span>
              </div>
              <p className={`text-xs font-medium ${t('text-slate-700', 'text-zinc-300')}`}>{check.label}</p>
              <p className={`text-[10px] ${t('text-slate-400', 'text-zinc-600')}`}>{check.description}</p>
            </button>
          );
        })}
      </div>

      {/* Overall Health Bar */}
      {globalCounts && (
        <div className={`rounded-xl p-3 ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${t('text-slate-700', 'text-zinc-300')}`}>Overall Data Completeness</span>
            <span className={`text-sm font-bold ${
              globalCounts.total_with_issues === 0 ? 'text-cyan-400' : 'text-amber-400'
            }`}>
              {globalCounts.total > 0 ? Math.round(((globalCounts.total - globalCounts.total_with_issues) / globalCounts.total) * 100) : 0}% complete
            </span>
          </div>
          <div className={`w-full h-2 rounded-full ${t('bg-slate-100', 'bg-zinc-800')}`}>
            <div
              className="h-2 rounded-full bg-cyan-500 transition-all"
              style={{ width: `${globalCounts.total > 0 ? ((globalCounts.total - globalCounts.total_with_issues) / globalCounts.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Active Filter + Search */}
      <div className={`rounded-xl p-3 ${t('bg-white shadow-sm border border-slate-200', 'bg-zinc-900/50 border border-zinc-800/60')}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t('text-slate-400', 'text-zinc-500')}`} />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-9 ${t(
                'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400',
                'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500'
              )}`}
            />
          </div>
          {activeFilter !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFilter('all')}
              className={`gap-1.5 text-xs ${t('border-slate-200 text-slate-600', 'border-zinc-700 text-zinc-400')}`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Clear filter
            </Button>
          )}
          <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>
            {activeFilter === 'all' ? 'Showing all products with issues' : `Filtered: ${HEALTH_CHECKS.find(h => h.id === activeFilter)?.label}`}
          </span>
        </div>
      </div>

      {/* Products Table */}
      <div className={`rounded-xl border overflow-hidden ${t('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={t('bg-slate-50 border-b border-slate-200', 'bg-zinc-900/80 border-b border-zinc-800')}>
                <th className={`text-left px-4 py-2.5 text-xs font-medium ${t('text-slate-500', 'text-zinc-500')}`}>Product</th>
                <th className={`text-left px-4 py-2.5 text-xs font-medium w-[80px] ${t('text-slate-500', 'text-zinc-500')}`}>Score</th>
                <th className={`text-left px-4 py-2.5 text-xs font-medium ${t('text-slate-500', 'text-zinc-500')}`}>Missing Data</th>
                <th className={`text-right px-4 py-2.5 text-xs font-medium w-[80px] ${t('text-slate-500', 'text-zinc-500')}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className={t('border-b border-slate-100', 'border-b border-zinc-800/40')}>
                    <td className="px-4 py-3"><div className={`h-4 w-48 rounded ${t('bg-slate-100', 'bg-zinc-800')} animate-pulse`} /></td>
                    <td className="px-4 py-3"><div className={`h-4 w-12 rounded ${t('bg-slate-100', 'bg-zinc-800')} animate-pulse`} /></td>
                    <td className="px-4 py-3"><div className={`h-4 w-64 rounded ${t('bg-slate-100', 'bg-zinc-800')} animate-pulse`} /></td>
                    <td className="px-4 py-3"><div className={`h-4 w-12 rounded ${t('bg-slate-100', 'bg-zinc-800')} animate-pulse ml-auto`} /></td>
                  </tr>
                ))
              ) : productsWithIssues.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <CheckCircle2 className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <p className={`text-sm font-medium ${t('text-slate-700', 'text-zinc-300')}`}>
                      {activeFilter === 'all' ? 'All products have complete data' : 'No products match this filter'}
                    </p>
                    <p className={`text-xs mt-1 ${t('text-slate-400', 'text-zinc-600')}`}>
                      {activeFilter !== 'all' ? 'Try clearing the filter to see all issues' : 'Great job keeping your catalog complete!'}
                    </p>
                  </td>
                </tr>
              ) : (
                productsWithIssues.map(product => {
                  const score = getCompletenessScore(product.issues);
                  const imageUrl = product.featured_image?.url;

                  return (
                    <tr
                      key={product.id}
                      className={`${t(
                        'border-b border-slate-100 hover:bg-slate-50',
                        'border-b border-zinc-800/40 hover:bg-zinc-800/30'
                      )} transition-colors`}
                    >
                      {/* Product */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${t('bg-slate-100', 'bg-zinc-800')}`}>
                            {imageUrl ? (
                              <img src={imageUrl} alt="" className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                            ) : (
                              <Package className={`w-4 h-4 ${t('text-slate-300', 'text-zinc-600')}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate max-w-[280px] ${t('text-slate-900', 'text-white')}`}>
                              {product.name}
                            </p>
                            <p className={`text-xs truncate max-w-[280px] ${t('text-slate-400', 'text-zinc-500')}`}>
                              {product.ean || product.physicalDetails?.barcode || 'No EAN'} {product.physicalDetails?.sku ? ` / ${product.physicalDetails.sku}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-2.5">
                        <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
                      </td>

                      {/* Missing Data */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {product.issues
                            .sort((a, b) => {
                              const checkA = HEALTH_CHECKS.find(h => h.id === a);
                              const checkB = HEALTH_CHECKS.find(h => h.id === b);
                              return (SEVERITY_ORDER[checkA?.color] ?? 2) - (SEVERITY_ORDER[checkB?.color] ?? 2);
                            })
                            .map(issue => getIssueBadge(issue))}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-2.5 text-right">
                        <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
                          <Button variant="ghost" size="sm" className={`h-7 px-2 text-xs ${t('text-slate-500 hover:text-slate-900', 'text-zinc-500 hover:text-white')}`}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 ${t('border-t border-slate-200', 'border-t border-zinc-800')}`}>
            <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>
              Page {currentPage} of {totalPages} ({totalCount} products)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`h-7 px-2 ${t('border-slate-200', 'border-zinc-700')}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`h-7 px-2 ${t('border-slate-200', 'border-zinc-700')}`}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
