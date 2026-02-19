import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Sparkles,
  Camera,
  Images,
  Check,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Eye,
  Download,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Clock,
  Zap,
  Star,
  Filter,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
const MAX_SELECTION = 30;
const PAGE_SIZE = 50;
const POLL_INTERVAL = 2500;

const STAGES = [
  { key: 'select', label: 'Select', icon: Package },
  { key: 'plan', label: 'Plan', icon: Sparkles },
  { key: 'shoot', label: 'Shoot', icon: Camera },
  { key: 'results', label: 'Results', icon: Images },
];

const SHOT_TYPE_STYLES = {
  hero: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-400',
  },
  usp_features: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
  },
  lifestyle: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
  },
  detail: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
  },
  alternate: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
  },
  contextual: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
};

const SHOT_TYPE_OPTIONS = [
  'hero',
  'usp_features',
  'lifestyle',
  'detail',
  'alternate',
  'contextual',
];

// ---------------------------------------------------------------------------
// Helper Components & Utilities
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/60 overflow-hidden animate-pulse">
      <div className="aspect-square bg-zinc-800/60" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-zinc-800/60 rounded w-3/4" />
        <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
      </div>
    </div>
  );
}

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function getShotStyle(type) {
  return (
    SHOT_TYPE_STYLES[type] || {
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/20',
      dot: 'bg-zinc-400',
    }
  );
}

function getImageCount(product) {
  let count = 0;
  if (product.featured_image?.url) count += 1;
  if (Array.isArray(product.gallery)) count += product.gallery.length;
  return count;
}

function StatusBadge({ status }) {
  const map = {
    approved: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      label: 'Approved',
    },
    modified: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/20',
      label: 'Modified',
    },
    pending: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      label: 'Pending',
    },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}
    >
      {s.label}
    </span>
  );
}

function ShotTypeDots({ shots }) {
  if (!Array.isArray(shots) || shots.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {shots.map((shot, i) => {
        const style = getShotStyle(shot.type);
        return (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${style.dot}`}
            title={shot.type}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage Indicator
// ---------------------------------------------------------------------------

function StageIndicator({ currentStage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {STAGES.map((stage, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;
        const Icon = stage.icon;

        return (
          <React.Fragment key={stage.key}>
            {i > 0 && (
              <div
                className={`h-px w-12 sm:w-20 ${
                  isCompleted || isActive
                    ? 'bg-yellow-500/40'
                    : 'bg-zinc-800'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-yellow-400 text-black'
                    : isActive
                    ? 'bg-yellow-500/15 border-2 border-yellow-400 text-yellow-400'
                    : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-600'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  isActive
                    ? 'text-yellow-400'
                    : isCompleted
                    ? 'text-zinc-300'
                    : 'text-zinc-600'
                }`}
              >
                {stage.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState = {
  stage: 'select',
  // Stage 1
  selectedProducts: {},
  // Stage 2
  planningStatus: 'idle',
  planningProgress: { current: 0, total: 0 },
  importJobId: null,
  plans: [],
  sessionProducts: [],
  editingPlanId: null,
  // Stage 3
  jobId: null,
  jobProgress: { total: 0, completed: 0, failed: 0 },
  recentImages: [],
  executionStatus: 'idle',
  startTime: null,
  // Stage 4
  allImages: [],
  // Shared
  error: null,
  loading: false,
};

function reducer(state, action) {
  switch (action.type) {
    // --- Selection ---
    case 'TOGGLE_PRODUCT': {
      const product = action.payload;
      const next = { ...state.selectedProducts };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        if (Object.keys(next).length >= MAX_SELECTION) return state;
        next[product.id] = {
          name: product.name,
          thumb: product.featured_image?.url || null,
          category: product.category,
          ean: product.ean,
          price: product.price,
        };
      }
      return { ...state, selectedProducts: next };
    }
    case 'SELECT_ALL': {
      const visible = action.payload;
      const next = { ...state.selectedProducts };
      for (const product of visible) {
        if (Object.keys(next).length >= MAX_SELECTION) break;
        if (!next[product.id]) {
          next[product.id] = {
            name: product.name,
            thumb: product.featured_image?.url || null,
            category: product.category,
            ean: product.ean,
            price: product.price,
          };
        }
      }
      return { ...state, selectedProducts: next };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedProducts: {} };
    case 'REMOVE_FROM_SELECTION': {
      const next = { ...state.selectedProducts };
      delete next[action.payload];
      return { ...state, selectedProducts: next };
    }

    // --- Planning ---
    case 'START_PLANNING':
      return {
        ...state,
        stage: 'plan',
        planningStatus: 'importing',
        error: null,
      };
    case 'PLANNING_PROGRESS':
      return {
        ...state,
        planningStatus: 'generating',
        planningProgress: action.payload,
      };
    case 'PLANS_LOADED':
      return {
        ...state,
        planningStatus: 'review',
        plans: action.payload.plans,
        sessionProducts: action.payload.products,
      };
    case 'UPDATE_PLAN': {
      const updated = action.payload;
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.plan_id === updated.plan_id ? { ...p, ...updated } : p
        ),
      };
    }
    case 'REMOVE_PLAN':
      return {
        ...state,
        plans: state.plans.filter((p) => p.plan_id !== action.payload),
      };
    case 'APPROVE_PLAN':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.plan_id === action.payload
            ? { ...p, plan_status: 'approved', approved_at: new Date().toISOString() }
            : p
        ),
      };
    case 'APPROVE_ALL':
      return {
        ...state,
        plans: state.plans.map((p) => ({
          ...p,
          plan_status: 'approved',
          approved_at: p.approved_at || new Date().toISOString(),
        })),
      };
    case 'SET_EDITING':
      return { ...state, editingPlanId: action.payload };

    // --- Execution ---
    case 'START_EXECUTION':
      return {
        ...state,
        stage: 'shoot',
        executionStatus: 'running',
        jobId: action.payload,
        startTime: Date.now(),
      };
    case 'JOB_PROGRESS':
      return {
        ...state,
        jobProgress: action.payload.progress,
        recentImages: action.payload.recentImages || state.recentImages,
      };
    case 'EXECUTION_COMPLETE':
      return { ...state, executionStatus: 'complete' };
    case 'EXECUTION_CANCELLED':
      return { ...state, executionStatus: 'cancelled' };

    // --- Results ---
    case 'LOAD_RESULTS':
      return { ...state, stage: 'results', allImages: action.payload };
    case 'RATE_IMAGE': {
      const { imageId, rating } = action.payload;
      return {
        ...state,
        allImages: state.allImages.map((img) =>
          img.image_id === imageId ? { ...img, rating } : img
        ),
      };
    }
    case 'REMOVE_IMAGE':
      return {
        ...state,
        allImages: state.allImages.filter(
          (img) => img.image_id !== action.payload
        ),
      };

    // --- Global ---
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'RESET':
      return { ...initialState };
    case 'RESUME_EXECUTION':
      return {
        ...state,
        stage: 'shoot',
        executionStatus: 'running',
        jobId: action.payload.job_id,
        jobProgress: {
          total: action.payload.total_images || 0,
          completed: action.payload.images_completed || 0,
          failed: action.payload.images_failed || 0,
        },
        startTime: Date.now(),
      };
    case 'RESUME_PLANNING':
      return {
        ...state,
        stage: 'plan',
        planningStatus: 'review',
        plans: action.payload.plans,
        sessionProducts: action.payload.products,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SyncStudioFlow() {
  const { user } = useUser();
  const [state, dispatch] = useReducer(reducer, initialState);
  const pollRef = useRef(null);

  // --- Edge function helper ---
  const callEdge = useCallback(async (fnName, body) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      let msg;
      try {
        msg = JSON.parse(text).error;
      } catch {
        msg = text;
      }
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  // --- Resume on mount ---
  useEffect(() => {
    if (!user?.id) return;

    async function checkResume() {
      try {
        // Check for active jobs first
        const { data: activeJobs } = await supabase
          .from('sync_studio_jobs')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'processing')
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeJobs && activeJobs.length > 0) {
          dispatch({ type: 'RESUME_EXECUTION', payload: activeJobs[0] });
          return;
        }

        // Check for existing plans
        const { data: existingPlans } = await supabase
          .from('sync_studio_shoot_plans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (existingPlans && existingPlans.length > 0) {
          const { data: prods } = await supabase
            .from('sync_studio_products')
            .select('*')
            .eq('user_id', user.id);

          dispatch({
            type: 'RESUME_PLANNING',
            payload: {
              plans: existingPlans,
              products: prods || [],
            },
          });
        }
      } catch (err) {
        console.error('Resume check failed:', err);
      }
    }

    checkResume();
  }, [user?.id]);

  // --- Render ---
  return (
    <div className="bg-[#09090b] min-h-[calc(100vh-60px)]">
      <StageIndicator currentStage={state.stage} />
      <div className="px-4 lg:px-8 pb-8">
        <AnimatePresence mode="wait">
          {state.stage === 'select' && (
            <SelectStage
              key="select"
              state={state}
              dispatch={dispatch}
              user={user}
              callEdge={callEdge}
            />
          )}
          {state.stage === 'plan' && (
            <PlanStage
              key="plan"
              state={state}
              dispatch={dispatch}
              user={user}
              callEdge={callEdge}
            />
          )}
          {state.stage === 'shoot' && (
            <ShootStage
              key="shoot"
              state={state}
              dispatch={dispatch}
              user={user}
              callEdge={callEdge}
              pollRef={pollRef}
            />
          )}
          {state.stage === 'results' && (
            <ResultsStage
              key="results"
              state={state}
              dispatch={dispatch}
              user={user}
              callEdge={callEdge}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage 1 : Select Products
// ---------------------------------------------------------------------------

function SelectStage({ state, dispatch, user, callEdge }) {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebouncedValue(searchRaw, 300);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch categories once
  useEffect(() => {
    if (!user?.company_id) return;
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('category')
        .eq('company_id', user.company_id)
        .not('category', 'is', null);
      if (data) {
        const unique = [...new Set(data.map((d) => d.category).filter(Boolean))];
        setCategories(unique.sort());
      }
    })();
  }, [user?.company_id]);

  // Fetch products
  useEffect(() => {
    if (!user?.company_id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('id, name, category, ean, price, featured_image, gallery, tags', {
          count: 'exact',
        })
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,ean.ilike.%${search}%,category.ilike.%${search}%`
        );
      }
      if (activeCategory) {
        query = query.eq('category', activeCategory);
      }

      const { data, count, error } = await query;
      if (cancelled) return;
      if (error) {
        toast.error('Failed to load products');
        console.error(error);
      } else {
        setProducts(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.company_id, page, search, activeCategory]);

  // Reset page on search/category change
  useEffect(() => {
    setPage(0);
  }, [search, activeCategory]);

  const selectedCount = Object.keys(state.selectedProducts).length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rangeStart = page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalCount);

  async function startPlanning() {
    const productIds = Object.keys(state.selectedProducts);
    if (productIds.length === 0) return;

    try {
      // Step 1: Import catalog
      const importResult = await callEdge('sync-studio-import-catalog', {
        action: 'start',
        userId: user.id,
        companyId: user.company_id,
        productIds,
      });

      const importJobId = importResult.importJobId;

      dispatch({
        type: 'PLANNING_PROGRESS',
        payload: { current: 0, total: productIds.length },
      });

      // Step 2: Generate plans
      let planResult = await callEdge('sync-studio-generate-plans', {
        action: 'start',
        userId: user.id,
        companyId: user.company_id,
        importJobId,
      });

      while (planResult?.status === 'processing' || planResult?.status === 'planning') {
        dispatch({
          type: 'PLANNING_PROGRESS',
          payload: {
            current: planResult.planned || planResult.processed || 0,
            total: planResult.totalProducts || planResult.total || productIds.length,
          },
        });
        await new Promise((r) => setTimeout(r, 2000));
        planResult = await callEdge('sync-studio-generate-plans', {
          action: 'continue',
          userId: user.id,
          companyId: user.company_id,
          importJobId,
          page: (planResult.page || 1) + 1,
        });
      }

      // Step 3: Fetch plans from DB
      const { data: plans } = await supabase
        .from('sync_studio_shoot_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      const { data: prods } = await supabase
        .from('sync_studio_products')
        .select('*')
        .eq('user_id', user.id);

      dispatch({
        type: 'PLANS_LOADED',
        payload: { plans: plans || [], products: prods || [] },
      });
      toast.success('Plans generated successfully');
    } catch (err) {
      toast.error(err.message || 'Planning failed');
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }

  function handleContinue() {
    dispatch({ type: 'START_PLANNING' });
    startPlanning();
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Select Products</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Choose up to {MAX_SELECTION} products for your AI photoshoot
        </p>
      </div>

      {/* Search + filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products by name, EAN, or category..."
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800/60 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 transition-colors"
          />
          {searchRaw && (
            <button
              onClick={() => setSearchRaw('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !activeCategory
                  ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-500/30'
                  : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-500/30'
                    : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product count + pagination + select all */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {totalCount > 0
              ? `Showing ${rangeStart}-${rangeEnd} of ${totalCount} products`
              : 'No products'}
          </span>
          {products.length > 0 && (
            <button
              onClick={() => dispatch({ type: 'SELECT_ALL', payload: products })}
              className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
            >
              Select page
            </button>
          )}
          {selectedCount > 0 && (
            <button
              onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500">
            {page + 1} / {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Package className="w-12 h-12 mb-3 text-zinc-700" />
          <p className="text-sm font-medium">No products found</p>
          <p className="text-xs text-zinc-600 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {products.map((product) => {
            const isSelected = !!state.selectedProducts[product.id];
            const atCapacity = selectedCount >= MAX_SELECTION && !isSelected;
            const imgUrl = product.featured_image?.url;
            const imgCount = getImageCount(product);

            return (
              <button
                key={product.id}
                onClick={() =>
                  !atCapacity && dispatch({ type: 'TOGGLE_PRODUCT', payload: product })
                }
                disabled={atCapacity}
                className={`relative rounded-xl border overflow-hidden text-left transition-all duration-200 group ${
                  isSelected
                    ? 'border-yellow-400 ring-2 ring-yellow-400/30'
                    : 'border-zinc-800/60 hover:border-zinc-700'
                } ${atCapacity ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-zinc-900/50 relative overflow-hidden">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-t-xl"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <Package className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-yellow-400/10 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-sm text-white font-medium truncate">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.category && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                        {product.category}
                      </span>
                    )}
                    {imgCount > 0 && (
                      <span className="text-[10px] text-zinc-600">
                        {imgCount} img{imgCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating selection bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl px-5 py-3 shadow-2xl shadow-black/40 flex items-center gap-4"
          >
            {/* Overlapping thumbnails */}
            <div className="flex -space-x-2">
              {Object.values(state.selectedProducts)
                .slice(0, 6)
                .map((p, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg border-2 border-zinc-900 overflow-hidden bg-zinc-800 flex items-center justify-center"
                  >
                    {p.thumb ? (
                      <img
                        src={p.thumb}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <Package className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                ))}
              {selectedCount > 6 && (
                <div className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                  +{selectedCount - 6}
                </div>
              )}
            </div>

            {/* Count ring */}
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgba(63,63,70,0.4)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="3"
                  strokeDasharray={`${(selectedCount / MAX_SELECTION) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {selectedCount}
              </span>
            </div>

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-yellow-500/20"
            >
              Continue with {selectedCount} product
              {selectedCount !== 1 ? 's' : ''}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stage 2 : Plan
// ---------------------------------------------------------------------------

function PlanStage({ state, dispatch, user, callEdge }) {
  const [expandedPlans, setExpandedPlans] = useState({});
  const [editData, setEditData] = useState({});
  const [rejectConfirm, setRejectConfirm] = useState(null);

  const totalShots = useMemo(
    () => state.plans.reduce((sum, p) => sum + (p.total_shots || 0), 0),
    [state.plans]
  );
  const approvedCount = useMemo(
    () => state.plans.filter((p) => p.plan_status === 'approved').length,
    [state.plans]
  );
  const allApproved = approvedCount === state.plans.length && state.plans.length > 0;
  const progressPct =
    state.plans.length > 0
      ? Math.round((approvedCount / state.plans.length) * 100)
      : 0;

  function toggleExpand(planId) {
    setExpandedPlans((prev) => ({ ...prev, [planId]: !prev[planId] }));
  }

  function findProductForPlan(plan) {
    return state.sessionProducts.find((p) => p.ean === plan.product_ean) || null;
  }

  // --- Plan actions ---
  async function approvePlan(planId) {
    try {
      await callEdge('sync-studio-approve-plan', {
        action: 'approve',
        userId: user.id,
        planId,
      });
      dispatch({ type: 'APPROVE_PLAN', payload: planId });
      toast.success('Plan approved');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function approveAll() {
    try {
      await callEdge('sync-studio-approve-plan', {
        action: 'approve_all',
        userId: user.id,
      });
      dispatch({ type: 'APPROVE_ALL' });
      toast.success('All plans approved');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function saveShotEdit(planId, shotNumber, data) {
    try {
      const result = await callEdge('sync-studio-update-plan', {
        action: 'update_shot',
        userId: user.id,
        planId,
        shotNumber,
        data,
      });
      if (result.plan) {
        dispatch({ type: 'UPDATE_PLAN', payload: result.plan });
      }
      toast.success('Shot updated');
      dispatch({ type: 'SET_EDITING', payload: null });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function addShot(planId, shotData) {
    try {
      const result = await callEdge('sync-studio-update-plan', {
        action: 'add_shot',
        userId: user.id,
        planId,
        data: shotData,
      });
      if (result.plan) {
        dispatch({ type: 'UPDATE_PLAN', payload: result.plan });
      }
      toast.success('Shot added');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function removeShot(planId, shotNumber) {
    try {
      const result = await callEdge('sync-studio-update-plan', {
        action: 'remove_shot',
        userId: user.id,
        planId,
        shotNumber,
      });
      if (result.plan) {
        dispatch({ type: 'UPDATE_PLAN', payload: result.plan });
      }
      toast.success('Shot removed');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function resetPlan(planId) {
    try {
      const result = await callEdge('sync-studio-update-plan', {
        action: 'reset_plan',
        userId: user.id,
        planId,
      });
      if (result.plan) {
        dispatch({ type: 'UPDATE_PLAN', payload: result.plan });
      }
      toast.success('Plan reset to original');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function rejectPlan(planId, ean) {
    try {
      await supabase
        .from('sync_studio_shoot_plans')
        .delete()
        .eq('plan_id', planId);
      if (ean) {
        await supabase
          .from('sync_studio_products')
          .delete()
          .eq('ean', ean)
          .eq('user_id', user.id);
      }
      dispatch({ type: 'REMOVE_PLAN', payload: planId });
      setRejectConfirm(null);
      toast.success('Plan removed');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const [isStarting, setIsStarting] = useState(false);

  async function handleStartPhotoshoot() {
    setIsStarting(true);
    toast.loading('Starting photoshoot...', { id: 'start-shoot' });
    try {
      const result = await callEdge('sync-studio-execute-photoshoot', {
        action: 'start',
        userId: user.id,
      });
      toast.dismiss('start-shoot');
      dispatch({ type: 'START_EXECUTION', payload: result.jobId || result.job_id });
      toast.success('Photoshoot started');
    } catch (err) {
      toast.dismiss('start-shoot');
      toast.error(err.message);
      setIsStarting(false);
    }
  }

  // --- Processing sub-phase ---
  if (
    state.planningStatus === 'importing' ||
    state.planningStatus === 'generating'
  ) {
    const steps = [
      {
        key: 'import',
        label: 'Importing products',
        desc: 'Syncing your product catalog',
      },
      {
        key: 'plan',
        label: 'Planning shots',
        desc: 'AI is designing your photoshoot',
      },
      {
        key: 'ready',
        label: 'Ready for review',
        desc: 'Plans are ready to customize',
      },
    ];
    const activeStep =
      state.planningStatus === 'importing' ? 0 : 1;
    const { current, total } = state.planningProgress;
    const barPct = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="max-w-lg w-full mx-auto bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-yellow-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white text-center mb-6">
            Preparing your photoshoot
          </h3>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isDone
                        ? 'bg-yellow-400 text-black'
                        : isActive
                        ? 'bg-yellow-500/15 border-2 border-yellow-400 text-yellow-400'
                        : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-600'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-xs font-medium">{i + 1}</span>
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isDone || isActive ? 'text-white' : 'text-zinc-600'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-zinc-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="mb-6">
              <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">
                {current} / {total} products processed
              </p>
            </div>
          )}

          {/* Selected product thumbs */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {Object.values(state.selectedProducts)
              .slice(0, 10)
              .map((p, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/40"
                >
                  {p.thumb ? (
                    <img
                      src={p.thumb}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-3 h-3 text-zinc-600" />
                    </div>
                  )}
                </div>
              ))}
            {Object.keys(state.selectedProducts).length > 10 && (
              <span className="text-[10px] text-zinc-500">
                +{Object.keys(state.selectedProducts).length - 10}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // --- Plan review sub-phase ---
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {[
          { label: 'Products', value: state.plans.length, icon: Package },
          { label: 'Total Shots', value: totalShots, icon: Camera },
          { label: 'Approved', value: approvedCount, icon: Check },
          {
            label: 'Pending',
            value: state.plans.length - approvedCount,
            icon: Clock,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2"
          >
            <stat.icon className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold text-white">
              {stat.value}
            </span>
            <span className="text-xs text-zinc-500">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-zinc-800/60 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">
          {approvedCount} of {state.plans.length} plans approved ({progressPct}%)
        </p>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 mb-6">
        {!allApproved && (
          <button
            onClick={approveAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-sm text-white hover:bg-zinc-800 transition-colors"
          >
            <Check className="w-4 h-4" />
            Approve All
          </button>
        )}
        <button
          onClick={handleStartPhotoshoot}
          disabled={!allApproved || isStarting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            allApproved && !isStarting
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg shadow-yellow-500/20'
              : 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          {isStarting ? 'Starting...' : 'Start Photoshoot'}
        </button>
      </div>

      {/* Plan cards */}
      <div className="space-y-3">
        {state.plans.map((plan) => {
          const isExpanded = expandedPlans[plan.plan_id];
          const isEditing = state.editingPlanId === plan.plan_id;
          const product = findProductForPlan(plan);
          const thumb =
            product?.existing_image_urls?.[0] || null;
          const shots = Array.isArray(plan.shots) ? plan.shots : [];

          return (
            <div
              key={plan.plan_id}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden"
            >
              {/* Collapsed row */}
              <div className="flex items-center gap-3 p-4">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                  {thumb ? (
                    <img
                      src={thumb}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <Package className="w-5 h-5 text-zinc-600" />
                  )}
                </div>

                {/* Title + category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {plan.product_title}
                  </p>
                  {product?.category_path && (
                    <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded inline-block mt-0.5">
                      {product.category_path}
                    </span>
                  )}
                </div>

                {/* Shot dots */}
                <ShotTypeDots shots={shots} />

                {/* Shot count */}
                <span className="text-xs text-zinc-500">
                  {plan.total_shots || shots.length} shot
                  {(plan.total_shots || shots.length) !== 1 ? 's' : ''}
                </span>

                {/* Status */}
                <StatusBadge status={plan.plan_status} />

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {plan.plan_status !== 'approved' && (
                    <button
                      onClick={() => approvePlan(plan.plan_id)}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 transition-colors"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      dispatch({
                        type: 'SET_EDITING',
                        payload: isEditing ? null : plan.plan_id,
                      });
                      if (!isExpanded) toggleExpand(plan.plan_id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-zinc-500 hover:text-yellow-400 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setRejectConfirm(
                        rejectConfirm === plan.plan_id ? null : plan.plan_id
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleExpand(plan.plan_id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Reject confirmation */}
              <AnimatePresence>
                {rejectConfirm === plan.plan_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 flex items-center gap-3 bg-red-500/5 border-t border-red-500/10 pt-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300 flex-1">
                        Remove this plan and product from the session?
                      </p>
                      <button
                        onClick={() =>
                          rejectPlan(plan.plan_id, plan.product_ean)
                        }
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setRejectConfirm(null)}
                        className="px-3 py-1.5 bg-zinc-800/60 text-zinc-400 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-zinc-800/60 pt-4 space-y-4">
                      {/* AI reasoning */}
                      {plan.reasoning && (
                        <div className="bg-zinc-800/20 border border-zinc-800/40 rounded-xl p-3 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-400 italic leading-relaxed">
                            {plan.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Existing images */}
                      {product?.existing_image_urls &&
                        product.existing_image_urls.length > 0 && (
                          <div>
                            <p className="text-xs text-zinc-500 mb-2">
                              Existing images
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {product.existing_image_urls.map((url, i) => (
                                <div
                                  key={i}
                                  className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0"
                                >
                                  <img
                                    src={url}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Shots list */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-zinc-500">
                            Planned shots ({shots.length})
                          </p>
                          {isEditing && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => resetPlan(plan.plan_id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-400 hover:text-white bg-zinc-800/40 rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" /> Reset
                              </button>
                              <button
                                onClick={() =>
                                  addShot(plan.plan_id, {
                                    type: 'hero',
                                    description: 'New shot',
                                    background: '',
                                    mood: '',
                                    focus: '',
                                  })
                                }
                                className="flex items-center gap-1 px-2 py-1 text-[10px] text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 rounded-lg transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Add shot
                              </button>
                            </div>
                          )}
                        </div>

                        {shots.map((shot, idx) => {
                          const style = getShotStyle(shot.type);

                          if (isEditing) {
                            const editKey = `${plan.plan_id}-${shot.shot_number}`;
                            const draft = editData[editKey] || {
                              description: shot.description || '',
                              background: shot.background || '',
                              mood: shot.mood || '',
                              focus: shot.focus || '',
                              type: shot.type || 'hero',
                            };

                            return (
                              <div
                                key={idx}
                                className="bg-zinc-800/30 border border-zinc-800/40 rounded-xl p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <select
                                    value={draft.type}
                                    onChange={(e) =>
                                      setEditData((prev) => ({
                                        ...prev,
                                        [editKey]: {
                                          ...draft,
                                          type: e.target.value,
                                        },
                                      }))
                                    }
                                    className="bg-zinc-900 border border-zinc-700/40 rounded-lg text-xs text-white px-2 py-1"
                                  >
                                    {SHOT_TYPE_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() =>
                                      removeShot(plan.plan_id, shot.shot_number)
                                    }
                                    className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                </div>
                                <textarea
                                  value={draft.description}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      [editKey]: {
                                        ...draft,
                                        description: e.target.value,
                                      },
                                    }))
                                  }
                                  rows={2}
                                  placeholder="Shot description..."
                                  className="w-full bg-zinc-900 border border-zinc-700/40 rounded-lg text-xs text-white px-2.5 py-2 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-yellow-500/40"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  {['background', 'mood', 'focus'].map(
                                    (field) => (
                                      <input
                                        key={field}
                                        value={draft[field]}
                                        onChange={(e) =>
                                          setEditData((prev) => ({
                                            ...prev,
                                            [editKey]: {
                                              ...draft,
                                              [field]: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder={
                                          field.charAt(0).toUpperCase() +
                                          field.slice(1)
                                        }
                                        className="bg-zinc-900 border border-zinc-700/40 rounded-lg text-xs text-white px-2 py-1.5 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/40"
                                      />
                                    )
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    saveShotEdit(
                                      plan.plan_id,
                                      shot.shot_number,
                                      draft
                                    )
                                  }
                                  className="px-3 py-1.5 bg-yellow-400/10 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-400/20 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            );
                          }

                          // Read-only view
                          return (
                            <div
                              key={idx}
                              className="bg-zinc-800/20 border border-zinc-800/40 rounded-xl p-3"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${style.bg} ${style.text} ${style.border}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
                                  />
                                  {shot.type}
                                </span>
                                <span className="text-[10px] text-zinc-600">
                                  Shot #{shot.shot_number}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {shot.description}
                              </p>
                              {(shot.mood || shot.background || shot.focus) && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {shot.mood && (
                                    <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                                      Mood: {shot.mood}
                                    </span>
                                  )}
                                  {shot.background && (
                                    <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                                      BG: {shot.background}
                                    </span>
                                  )}
                                  {shot.focus && (
                                    <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                                      Focus: {shot.focus}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stage 3 : Shoot (Execution)
// ---------------------------------------------------------------------------

function ShootStage({ state, dispatch, user, callEdge, pollRef }) {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer
  useEffect(() => {
    if (state.executionStatus !== 'running' || !state.startTime) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [state.executionStatus, state.startTime]);

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  // Polling
  useEffect(() => {
    if (state.executionStatus !== 'running' || !state.jobId) return;

    async function poll() {
      try {
        const result = await callEdge('sync-studio-job-progress', {
          action: 'status',
          userId: user.id,
          jobId: state.jobId,
        });

        dispatch({
          type: 'JOB_PROGRESS',
          payload: {
            progress: {
              total: result.total_images || 0,
              completed: result.images_completed || 0,
              failed: result.images_failed || 0,
            },
            recentImages: result.recent_images || [],
          },
        });

        if (result.status === 'completed') {
          dispatch({ type: 'EXECUTION_COMPLETE' });
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }

        if (result.status === 'processing') {
          try {
            await callEdge('sync-studio-execute-photoshoot', {
              action: 'continue',
              userId: user.id,
              jobId: state.jobId,
            });
          } catch {
            // Continue polling even if continue call fails
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state.executionStatus, state.jobId, user?.id, callEdge, dispatch, pollRef]);

  async function handleCancel() {
    try {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      await callEdge('sync-studio-execute-photoshoot', {
        action: 'cancel',
        userId: user.id,
        jobId: state.jobId,
      });
      dispatch({ type: 'EXECUTION_CANCELLED' });
      toast.success('Photoshoot cancelled');
    } catch (err) {
      toast.error(err.message);
    }
    setCancelConfirm(false);
  }

  async function loadAllResults() {
    try {
      const { data: images } = await supabase
        .from('sync_studio_generated_images')
        .select('*')
        .eq('job_id', state.jobId)
        .order('created_at', { ascending: true });

      dispatch({ type: 'LOAD_RESULTS', payload: images || [] });
    } catch (err) {
      toast.error('Failed to load results');
    }
  }

  const { total, completed, failed } = state.jobProgress;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // --- Running view ---
  if (state.executionStatus === 'running') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
              <Camera className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Photoshoot in progress
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              </h3>
            </div>
          </div>

          {/* Large progress bar */}
          <div className="mb-4">
            <div className="w-full bg-zinc-800/60 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-zinc-400">
                {completed} of {total} images
              </p>
              <p className="text-sm font-semibold text-white">{pct}%</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{completed}</p>
              <p className="text-xs text-zinc-500 mt-1">Completed</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{failed}</p>
              <p className="text-xs text-zinc-500 mt-1">Failed</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {formatTime(elapsed)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Elapsed</p>
            </div>
          </div>

          {/* Live Feed */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-white">Live Feed</h4>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>

            {state.recentImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {state.recentImages.map((img, i) => (
                  <motion.div
                    key={img.image_id || i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="rounded-xl overflow-hidden border border-zinc-800/60 relative group"
                  >
                    <div className="aspect-square bg-zinc-800">
                      {img.image_url ? (
                        <img
                          src={img.image_url}
                          className="w-full h-full object-cover"
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    {img.product_title && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-[10px] text-white truncate">
                          {img.product_title}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}
          </div>

          {/* Cancel button */}
          <div className="flex justify-end">
            {cancelConfirm ? (
              <div className="flex items-center gap-2 bg-zinc-900/50 border border-red-500/20 rounded-xl px-4 py-2">
                <span className="text-xs text-red-300">
                  Cancel this photoshoot?
                </span>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
                >
                  Yes, cancel
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="px-3 py-1.5 bg-zinc-800/60 text-zinc-400 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCancelConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // --- Complete view ---
  if (state.executionStatus === 'complete') {
    return <CompletionView elapsed={elapsed} formatTime={formatTime} state={state} loadAllResults={loadAllResults} />;
  }

  // --- Cancelled view ---
  if (state.executionStatus === 'cancelled') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center min-h-[60vh]"
      >
        <XCircle className="w-16 h-16 text-red-400 mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">
          Photoshoot Cancelled
        </h3>
        <p className="text-zinc-400 text-sm mb-6">
          {completed > 0
            ? `${completed} images were generated before cancellation.`
            : 'No images were generated.'}
        </p>
        <div className="flex items-center gap-3">
          {completed > 0 && (
            <button
              onClick={loadAllResults}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-sm text-white hover:bg-zinc-800 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Partial Results
            </button>
          )}
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            New Photoshoot
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}

// Completion sub-component (fires confetti on mount)
function CompletionView({ elapsed, formatTime, state, loadAllResults }) {
  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, []);

  const { completed, failed } = state.jobProgress;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[60vh]"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
      >
        <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
      </motion.div>
      <h3 className="text-2xl font-bold text-white mb-2">
        Photoshoot Complete!
      </h3>
      <p className="text-zinc-400 text-sm mb-6">
        {completed} image{completed !== 1 ? 's' : ''} generated
        {failed > 0 ? ` (${failed} failed)` : ''} in {formatTime(elapsed)}
      </p>
      <button
        onClick={loadAllResults}
        className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-yellow-500/20"
      >
        <Images className="w-5 h-5" />
        View Results
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stage 4 : Results Gallery
// ---------------------------------------------------------------------------

function ResultsStage({ state, dispatch, user, callEdge }) {
  const [lightbox, setLightbox] = useState(null);

  const imagesByProduct = useMemo(() => {
    const grouped = {};
    for (const img of state.allImages) {
      const key = img.product_ean || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(img);
    }
    return grouped;
  }, [state.allImages]);

  const totalCompleted = state.allImages.filter(
    (i) => i.status === 'completed'
  ).length;
  const totalFailed = state.allImages.filter(
    (i) => i.status === 'failed'
  ).length;

  function findProduct(ean) {
    return state.sessionProducts.find((p) => p.ean === ean) || null;
  }

  async function rateImage(imageId, rating) {
    try {
      await supabase
        .from('sync_studio_generated_images')
        .update({ rating })
        .eq('image_id', imageId);
      dispatch({ type: 'RATE_IMAGE', payload: { imageId, rating } });
    } catch (err) {
      toast.error('Failed to save rating');
    }
  }

  async function downloadImage(url, filename) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || 'image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error('Download failed');
    }
  }

  async function downloadAll() {
    const completedImages = state.allImages.filter(
      (i) => i.status === 'completed' && i.image_url
    );
    toast.info(`Downloading ${completedImages.length} images...`);
    for (const img of completedImages) {
      const product = findProduct(img.product_ean);
      const name = `${(product?.title || img.product_ean || 'image').replace(/\s+/g, '_')}_shot${img.shot_number || 0}.png`;
      await downloadImage(img.image_url, name);
      await new Promise((r) => setTimeout(r, 300));
    }
    toast.success('All downloads complete');
  }

  async function regenerateImage(img) {
    try {
      await callEdge('sync-studio-execute-photoshoot', {
        action: 'regenerate',
        userId: user.id,
        imageId: img.image_id,
        planId: img.plan_id,
        shotNumber: img.shot_number,
      });
      toast.success('Regeneration started');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Summary bar */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {[
              { label: 'Total', value: state.allImages.length },
              { label: 'Completed', value: totalCompleted, color: 'text-emerald-400' },
              { label: 'Failed', value: totalFailed, color: 'text-red-400' },
              {
                label: 'Products',
                value: Object.keys(imagesByProduct).length,
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className={`text-lg font-bold ${
                    stat.color || 'text-white'
                  }`}
                >
                  {stat.value}
                </p>
                <p className="text-[10px] text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {totalCompleted > 0 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-sm text-white hover:bg-zinc-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
            )}
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              New Photoshoot
            </button>
          </div>
        </div>
      </div>

      {/* Product sections */}
      {Object.entries(imagesByProduct).map(([ean, images]) => {
        const product = findProduct(ean);
        const productThumb = product?.existing_image_urls?.[0] || null;

        return (
          <div key={ean} className="mb-8">
            {/* Product header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                {productThumb ? (
                  <img
                    src={productThumb}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <Package className="w-4 h-4 text-zinc-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {product?.title || ean}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {images.length} image{images.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img) => {
                const isFailed = img.status === 'failed';
                const shotStyle = getShotStyle(img.shot_type || 'hero');

                return (
                  <div
                    key={img.image_id}
                    className={`rounded-xl overflow-hidden border group cursor-pointer relative ${
                      isFailed
                        ? 'border-red-500/30'
                        : 'border-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-zinc-800 relative">
                      {isFailed ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3">
                          <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
                          <p className="text-[10px] text-red-300 text-center">
                            {img.error_message || 'Generation failed'}
                          </p>
                          <button
                            onClick={() => regenerateImage(img)}
                            className="mt-2 flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-[10px] hover:bg-red-500/20 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        </div>
                      ) : (
                        <>
                          <img
                            src={img.image_url}
                            className="w-full h-full object-cover"
                            alt=""
                            loading="lazy"
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                              onClick={() => setLightbox(img)}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                downloadImage(
                                  img.image_url,
                                  `${(product?.title || ean).replace(/\s+/g, '_')}_shot${img.shot_number || 0}.png`
                                )
                              }
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Shot type badge */}
                    {!isFailed && img.shot_type && (
                      <div className="absolute top-2 left-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium ${shotStyle.bg} ${shotStyle.text} border ${shotStyle.border} backdrop-blur-sm`}
                        >
                          {img.shot_type}
                        </span>
                      </div>
                    )}

                    {/* Rating buttons */}
                    {!isFailed && (
                      <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/80">
                        <span className="text-[10px] text-zinc-600 truncate mr-1">
                          Shot #{img.shot_number || '?'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              rateImage(
                                img.image_id,
                                img.rating === 'up' ? null : 'up'
                              )
                            }
                            className={`p-1 rounded transition-colors ${
                              img.rating === 'up'
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-zinc-600 hover:text-emerald-400'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              rateImage(
                                img.image_id,
                                img.rating === 'down' ? null : 'down'
                              )
                            }
                            className={`p-1 rounded transition-colors ${
                              img.rating === 'down'
                                ? 'text-red-400 bg-red-500/10'
                                : 'text-zinc-600 hover:text-red-400'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Compare with originals */}
            {product?.existing_image_urls &&
              product.existing_image_urls.length > 0 && (
                <CompareSection
                  originalImages={product.existing_image_urls}
                  generatedImages={images.filter(
                    (i) => i.status === 'completed' && i.image_url
                  )}
                />
              )}
          </div>
        );
      })}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.image_url}
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
                alt=""
              />
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                {lightbox.shot_type && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                      getShotStyle(lightbox.shot_type).bg
                    } ${getShotStyle(lightbox.shot_type).text} border ${
                      getShotStyle(lightbox.shot_type).border
                    } backdrop-blur-sm`}
                  >
                    {lightbox.shot_type}
                  </span>
                )}
                <button
                  onClick={() =>
                    downloadImage(
                      lightbox.image_url,
                      `image_${lightbox.image_id}.png`
                    )
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Compare Section (original vs generated)
// ---------------------------------------------------------------------------

function CompareSection({ originalImages, generatedImages }) {
  const [showCompare, setShowCompare] = useState(false);

  if (generatedImages.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowCompare(!showCompare)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
      >
        {showCompare ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        Compare with originals
      </button>
      <AnimatePresence>
        {showCompare && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wider">
                  Original
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {originalImages.slice(0, 4).map((url, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg overflow-hidden border border-zinc-800/60"
                    >
                      <img
                        src={url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wider">
                  Generated
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {generatedImages.slice(0, 4).map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg overflow-hidden border border-yellow-500/20"
                    >
                      <img
                        src={img.image_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
