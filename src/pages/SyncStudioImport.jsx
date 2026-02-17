import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Package,
  Camera,
  Check,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Images,
  Filter,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  LayoutGrid,
  Tag,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
const EDGE_FUNCTION = 'sync-studio-import-catalog';
const PLAN_EDGE_FUNCTION = 'sync-studio-generate-plans';
const MAX_SELECTION = 30;
const PAGE_SIZE = 50;

// --- Skeleton card ---
function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-zinc-900/50 border border-zinc-800/40 animate-pulse">
      <div className="aspect-square bg-zinc-800/40" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-zinc-800/60 rounded w-4/5" />
        <div className="h-2.5 bg-zinc-800/40 rounded w-1/2" />
      </div>
    </div>
  );
}

// --- Debounce hook ---
function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// --- Image count helper ---
function getImageCount(product) {
  let count = 0;
  if (product.featured_image?.url) count++;
  if (Array.isArray(product.gallery)) count += product.gallery.filter(g => g?.url).length;
  return count;
}

// --- Planning steps ---
const PLANNING_STEPS = [
  { key: 'starting', label: 'Importing products', desc: 'Copying selected products into your session' },
  { key: 'planning', label: 'Creating shoot plans', desc: 'AI is designing optimal shots for each product' },
  { key: 'done', label: 'Ready', desc: 'Opening your shoot planner' },
];

export default function SyncStudioImport() {
  const navigate = useNavigate();
  const { user } = useUser();

  // Product browsing state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [selectedProducts, setSelectedProducts] = useState(new Map()); // id -> {name, thumb}
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [gridSize, setGridSize] = useState('normal'); // normal | compact

  // Session state
  const [stage, setStage] = useState('picking'); // picking | starting | planning | done | error
  const [error, setError] = useState(null);
  const [planningProgress, setPlanningProgress] = useState({ current: 0, total: 0 });

  // -- Load products --
  useEffect(() => {
    if (!user?.company_id) return;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('id, name, category, ean, price, featured_image, gallery, tags', { count: 'exact' })
          .eq('company_id', user.company_id)
          .order('name', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (debouncedSearch.trim()) {
          query = query.ilike('name', `%${debouncedSearch.trim()}%`);
        }
        if (categoryFilter !== 'all') {
          query = query.eq('category', categoryFilter);
        }

        const { data, count, error: err } = await query;
        if (err) throw err;
        setProducts(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('[SyncStudioImport] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.company_id, debouncedSearch, categoryFilter, page]);

  // -- Extract unique categories --
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    if (!user?.company_id) return;
    const loadCats = async () => {
      const { data } = await supabase
        .from('products')
        .select('category')
        .eq('company_id', user.company_id)
        .not('category', 'is', null);
      if (data) {
        const unique = [...new Set(data.map((d) => d.category).filter(Boolean))].sort();
        setCategories(unique);
      }
    };
    loadCats();
  }, [user?.company_id]);

  // -- Toggle selection --
  const toggleProduct = useCallback(
    (product) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(product.id)) {
          next.delete(product.id);
          setSelectedProducts((sp) => { const m = new Map(sp); m.delete(product.id); return m; });
        } else if (next.size < MAX_SELECTION) {
          next.add(product.id);
          setSelectedProducts((sp) => {
            const m = new Map(sp);
            m.set(product.id, { name: product.name, thumb: product.featured_image?.url || null });
            return m;
          });
        }
        return next;
      });
    },
    []
  );

  const selectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of products) {
        if (next.size >= MAX_SELECTION) break;
        if (!next.has(p.id)) {
          next.add(p.id);
          setSelectedProducts((sp) => {
            const m = new Map(sp);
            m.set(p.id, { name: p.name, thumb: p.featured_image?.url || null });
            return m;
          });
        }
      }
      return next;
    });
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectedProducts(new Map());
  }, []);

  const removeFromSelection = useCallback((productId) => {
    setSelected((prev) => { const next = new Set(prev); next.delete(productId); return next; });
    setSelectedProducts((sp) => { const m = new Map(sp); m.delete(productId); return m; });
  }, []);

  // -- Edge function caller --
  const callEdgeFunction = useCallback(async (body, fnName = EDGE_FUNCTION) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      let msg;
      try { msg = JSON.parse(text).error || `HTTP ${response.status}`; } catch { msg = text; }
      throw new Error(msg);
    }
    return response.json();
  }, []);

  // -- Start session with selected products --
  const startSession = useCallback(async () => {
    if (selected.size === 0) return;
    setStage('starting');
    setError(null);
    setPlanningProgress({ current: 0, total: selected.size });

    try {
      // 1. Import selected products
      const importResult = await callEdgeFunction({
        action: 'start',
        userId: user?.id,
        companyId: user?.company_id,
        productIds: [...selected],
      });

      if (importResult.error) throw new Error(importResult.error);

      const jobId = importResult.importJobId;
      if (!jobId) throw new Error('No import job created');

      // 2. Start planning
      setStage('planning');
      const planResult = await callEdgeFunction({
        action: 'start',
        userId: user?.id,
        companyId: user?.company_id,
        importJobId: jobId,
      }, PLAN_EDGE_FUNCTION);

      setPlanningProgress({ current: planResult.planned || 0, total: selected.size });

      // 3. If planning needs continuation, poll
      if (planResult.hasMore && planResult.status !== 'completed') {
        let nextPage = planResult.nextPage;
        while (nextPage) {
          const chunk = await callEdgeFunction({
            action: 'continue',
            userId: user?.id,
            companyId: user?.company_id,
            importJobId: jobId,
            page: nextPage,
          }, PLAN_EDGE_FUNCTION);
          setPlanningProgress({ current: chunk.totalPlanned || 0, total: selected.size });
          if (!chunk.hasMore || chunk.status === 'completed') break;
          nextPage = chunk.nextPage;
        }
      }

      // 4. Brief "done" state then navigate
      setStage('done');
      setTimeout(() => navigate('/SyncStudioDashboard'), 600);
    } catch (err) {
      console.error('[SyncStudioImport] session error:', err);
      setError(err.message);
      setStage('error');
    }
  }, [selected, user, callEdgeFunction, navigate]);

  // -- Pagination --
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // -- Get image URL from product --
  const getThumb = (p) => p.featured_image?.url || null;

  // -- Selection percentage for ring --
  const selectionPct = Math.round((selected.size / MAX_SELECTION) * 100);

  // ============================================
  // LOADING / PLANNING STATE
  // ============================================
  if (stage !== 'picking' && stage !== 'error') {
    const currentStepIdx = stage === 'starting' ? 0 : stage === 'planning' ? 1 : 2;
    const progressPct = planningProgress.total > 0
      ? Math.round((planningProgress.current / planningProgress.total) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full"
        >
          {/* Main card */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-8">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </div>

            <h2 className="text-xl font-semibold text-white text-center mb-1">
              Preparing your photoshoot
            </h2>
            <p className="text-sm text-zinc-500 text-center mb-8">
              {selected.size} product{selected.size !== 1 ? 's' : ''} selected
            </p>

            {/* Steps */}
            <div className="space-y-4 mb-8">
              {PLANNING_STEPS.map((step, i) => {
                const isActive = i === currentStepIdx;
                const isDone = i < currentStepIdx;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    {/* Step indicator */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                      ${isDone ? 'bg-yellow-400 text-black' : isActive ? 'bg-yellow-500/20 border-2 border-yellow-400' : 'bg-zinc-800/60 border border-zinc-700/40'}
                    `}>
                      {isDone ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      ) : (
                        <span className="text-xs text-zinc-600 font-medium">{i + 1}</span>
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-medium ${isDone || isActive ? 'text-white' : 'text-zinc-600'}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar for planning */}
            {stage === 'planning' && planningProgress.total > 0 && (
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Generating plans...</span>
                  <span className="tabular-nums">{planningProgress.current}/{planningProgress.total}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Selected product thumbnails */}
          <div className="flex items-center justify-center gap-1 mt-6 flex-wrap px-4">
            {[...selectedProducts.entries()].slice(0, 12).map(([id, { thumb }]) => (
              <div
                key={id}
                className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/30 overflow-hidden shrink-0"
              >
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-3 h-3 text-zinc-700" />
                  </div>
                )}
              </div>
            ))}
            {selectedProducts.size > 12 && (
              <span className="text-[10px] text-zinc-600 ml-1">+{selectedProducts.size - 12}</span>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mb-6 break-words max-w-sm mx-auto">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/SyncStudioHome')}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Back to Studio
            </button>
            <button
              onClick={() => { setStage('picking'); setError(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors"
            >
              Try again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // MAIN: PRODUCT PICKER
  // ============================================
  const gridCols = gridSize === 'compact'
    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

  return (
    <div className="min-h-screen bg-black pb-28">
      {/* ============================================ */}
      {/* HEADER                                       */}
      {/* ============================================ */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Top row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/SyncStudioHome')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white">Select Products</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose up to {MAX_SELECTION} products for this photoshoot session
              </p>
            </div>

            {/* Grid toggle */}
            <div className="hidden sm:flex items-center bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-0.5">
              <button
                onClick={() => setGridSize('normal')}
                className={`p-1.5 rounded-md transition-colors ${gridSize === 'normal' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setGridSize('compact')}
                className={`p-1.5 rounded-md transition-colors ${gridSize === 'compact' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search + Filters row */}
          <div className="flex items-center gap-2 mt-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
                placeholder="Search products..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/40 transition-colors"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setPage(0); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                className="pl-7 pr-6 py-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-xs text-zinc-300 appearance-none focus:outline-none focus:border-yellow-500/40 cursor-pointer"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Selection controls */}
            <div className="flex items-center gap-1.5 ml-auto">
              {selected.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button
                onClick={selectAll}
                disabled={selected.size >= MAX_SELECTION}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Check className="w-3 h-3" />
                Select page
              </button>
            </div>
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-zinc-600">
              {loading ? 'Loading...' : `${totalCount.toLocaleString()} products`}
              {categoryFilter !== 'all' && ` in ${categoryFilter}`}
              {debouncedSearch.trim() && ` matching "${debouncedSearch}"`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-zinc-500 tabular-nums px-1">
                  {page + 1}/{totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* PRODUCT GRID                                 */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className={`grid ${gridCols} gap-2.5`}>
            {Array.from({ length: 18 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/40 border border-zinc-700/30 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-sm font-medium mb-1">No products found</p>
            <p className="text-zinc-600 text-xs">
              {debouncedSearch.trim()
                ? `No results for "${debouncedSearch}"`
                : 'Your product catalog is empty'}
            </p>
          </motion.div>
        ) : (
          <div className={`grid ${gridCols} gap-2.5`}>
            {products.map((product, idx) => {
              const isSelected = selected.has(product.id);
              const thumb = getThumb(product);
              const atLimit = selected.size >= MAX_SELECTION && !isSelected;
              const imgCount = getImageCount(product);

              return (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                  onClick={() => toggleProduct(product)}
                  disabled={atLimit}
                  className={`
                    group relative rounded-xl overflow-hidden text-left transition-all duration-150
                    ${isSelected
                      ? 'ring-2 ring-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 scale-[0.98]'
                      : atLimit
                        ? 'opacity-30 cursor-not-allowed bg-zinc-900/40 border border-zinc-800/30'
                        : 'bg-zinc-900/40 border border-zinc-800/40 hover:border-zinc-700/60 hover:bg-zinc-800/30'
                    }
                  `}
                >
                  {/* Image */}
                  <div className="aspect-square bg-zinc-800/20 relative overflow-hidden">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={product.name}
                        className={`w-full h-full object-contain p-1.5 transition-transform duration-200 ${
                          isSelected ? '' : 'group-hover:scale-105'
                        }`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-zinc-800" />
                      </div>
                    )}

                    {/* Selection check */}
                    <AnimatePresence>
                      {isSelected ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-yellow-400 text-black flex items-center justify-center shadow-lg shadow-yellow-400/30"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </motion.div>
                      ) : !atLimit ? (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : null}
                    </AnimatePresence>

                    {/* Image count badge */}
                    {imgCount > 0 && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[9px] text-zinc-300 font-medium">
                        <Images className="w-2.5 h-2.5" />
                        {imgCount}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className={`text-[11px] font-medium line-clamp-2 leading-tight ${
                      isSelected ? 'text-yellow-300' : 'text-zinc-200'
                    }`}>
                      {product.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {product.price && (
                        <span className="text-[10px] text-yellow-400/70 font-medium tabular-nums">
                          €{parseFloat(product.price).toFixed(2)}
                        </span>
                      )}
                      {product.ean && (
                        <span className="text-[9px] text-zinc-700 truncate">{product.ean}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Bottom pagination (visible on long pages) */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800/60 rounded-lg hover:text-white disabled:opacity-20 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 7 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                        : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800/60 rounded-lg hover:text-white disabled:opacity-20 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* FLOATING BOTTOM BAR                          */}
      {/* ============================================ */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-40"
          >
            <div className="bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-800/60">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-4">
                  {/* Selected thumbnails */}
                  <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center -space-x-1.5 shrink-0">
                      {[...selectedProducts.entries()].slice(0, 8).map(([id, { thumb }], i) => (
                        <motion.div
                          key={id}
                          initial={{ scale: 0, x: -10 }}
                          animate={{ scale: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="w-9 h-9 rounded-lg bg-zinc-800 border-2 border-zinc-950 overflow-hidden shrink-0 relative group/thumb"
                        >
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                              <Package className="w-3 h-3 text-zinc-600" />
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromSelection(id); }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                    {selectedProducts.size > 8 && (
                      <span className="text-xs text-zinc-500 ml-2 shrink-0">
                        +{selectedProducts.size - 8} more
                      </span>
                    )}
                  </div>

                  {/* Selection counter ring */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18" cy="18" r="15"
                          fill="none" stroke="rgb(39,39,42)" strokeWidth="2.5"
                        />
                        <circle
                          cx="18" cy="18" r="15"
                          fill="none" stroke="rgb(234,179,8)" strokeWidth="2.5"
                          strokeDasharray={`${selectionPct * 0.942} 100`}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tabular-nums">
                        {selected.size}
                      </span>
                    </div>

                    {/* Start button */}
                    <button
                      onClick={startSession}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      Start Session
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
