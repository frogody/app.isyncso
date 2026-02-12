import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Image as ImageIcon,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
const EDGE_FUNCTION = 'sync-studio-import-catalog';
const PLAN_EDGE_FUNCTION = 'sync-studio-generate-plans';
const MAX_SELECTION = 30;
const PAGE_SIZE = 50;

export default function SyncStudioImport() {
  const navigate = useNavigate();
  const { user } = useUser();

  // Product browsing state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Session state
  const [stage, setStage] = useState('picking'); // picking | starting | planning | error
  const [error, setError] = useState(null);

  // -- Load products --
  useEffect(() => {
    if (!user?.company_id) return;
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('id, name, category, ean, price, featured_image, tags', { count: 'exact' })
          .eq('company_id', user.company_id)
          .order('name', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (search.trim()) {
          query = query.ilike('name', `%${search.trim()}%`);
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
  }, [user?.company_id, search, categoryFilter, page]);

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
    (productId) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) {
          next.delete(productId);
        } else if (next.size < MAX_SELECTION) {
          next.add(productId);
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
        next.add(p.id);
      }
      return next;
    });
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
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
          if (!chunk.hasMore || chunk.status === 'completed') break;
          nextPage = chunk.nextPage;
        }
      }

      // 4. Navigate to dashboard
      navigate('/SyncStudioDashboard');
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

  if (stage === 'starting' || stage === 'planning') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-1">
            {stage === 'starting' ? 'Setting up session...' : 'Creating shoot plans...'}
          </h2>
          <p className="text-sm text-zinc-500">
            {selected.size} product{selected.size !== 1 ? 's' : ''} selected
          </p>
        </motion.div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mb-6 break-words">{error}</p>
          <button
            onClick={() => { setStage('picking'); setError(null); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors"
          >
            Back to selection
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white">Select Products</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Choose up to {MAX_SELECTION} products for this photoshoot session
              </p>
            </div>

            {/* Start button */}
            <button
              onClick={startSession}
              disabled={selected.size === 0}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                ${selected.size > 0
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }
              `}
            >
              <Camera className="w-4 h-4" />
              Start Session
              {selected.size > 0 && (
                <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs">
                  {selected.size}
                </span>
              )}
              {selected.size > 0 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/40"
              />
            </div>

            {/* Category filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                className="pl-8 pr-8 py-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-yellow-500/40 cursor-pointer"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Selection info */}
            <div className="flex items-center gap-2 ml-auto">
              {selected.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button
                onClick={selectAll}
                disabled={selected.size >= MAX_SELECTION}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
              >
                Select page
              </button>
              <div className={`
                px-3 py-1.5 rounded-lg text-xs font-medium tabular-nums
                ${selected.size >= MAX_SELECTION
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                  : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50'
                }
              `}>
                {selected.size}/{MAX_SELECTION}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No products found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              <AnimatePresence>
                {products.map((product) => {
                  const isSelected = selected.has(product.id);
                  const thumb = getThumb(product);
                  const atLimit = selected.size >= MAX_SELECTION && !isSelected;

                  return (
                    <motion.button
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => toggleProduct(product.id)}
                      disabled={atLimit}
                      className={`
                        group relative rounded-xl overflow-hidden text-left transition-all
                        ${isSelected
                          ? 'ring-2 ring-yellow-400 bg-yellow-500/5'
                          : atLimit
                            ? 'opacity-40 cursor-not-allowed bg-zinc-900/50'
                            : 'bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/60 hover:border-zinc-700/60'
                        }
                        ${isSelected ? 'border border-yellow-500/30' : ''}
                      `}
                    >
                      {/* Image */}
                      <div className="aspect-square bg-zinc-800/30 relative overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={product.name}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-zinc-700" />
                          </div>
                        )}

                        {/* Selection check */}
                        <div className={`
                          absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all
                          ${isSelected
                            ? 'bg-yellow-400 text-black scale-100'
                            : 'bg-zinc-800/80 text-zinc-500 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
                          }
                        `}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs text-white font-medium line-clamp-2 leading-tight">
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          {product.price && (
                            <span className="text-[10px] text-yellow-400/80 font-medium">
                              €{parseFloat(product.price).toFixed(2)}
                            </span>
                          )}
                          {product.category && (
                            <span className="text-[10px] text-zinc-600 truncate ml-1">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800/60 rounded-lg hover:text-white disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-500 tabular-nums px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800/60 rounded-lg hover:text-white disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}

            {/* Total count */}
            <p className="text-center text-xs text-zinc-600 mt-4">
              {totalCount.toLocaleString()} products in catalog
            </p>
          </>
        )}
      </div>
    </div>
  );
}
