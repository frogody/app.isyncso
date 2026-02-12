import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Progress from '@radix-ui/react-progress';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit3,
  Filter,
  Loader2,
  Package,
  Play,
  Rocket,
  Search,
  SortAsc,
  Sparkles,
  Timer,
  Zap,
  Image as ImageIcon,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

const APPROVE_EDGE_FUNCTION = 'sync-studio-approve-plan';
const EXECUTE_EDGE_FUNCTION = 'sync-studio-execute-photoshoot';
const PROGRESS_EDGE_FUNCTION = 'sync-studio-job-progress';

// --- Shot type styling map ---
const SHOT_TYPE_STYLES = {
  hero: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  lifestyle: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  detail: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  alternate: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  contextual: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

function getShotStyle(type) {
  return SHOT_TYPE_STYLES[type] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
}

// --- Status badge ---
function StatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </span>
    );
  }
  if (status === 'user_modified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Edit3 className="w-3 h-3" />
        Modified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

// --- Category badge helper ---
function getCategoryLabel(categoryPath) {
  if (!categoryPath) return null;
  const segments = categoryPath.split(/[>/]/);
  return segments[segments.length - 1]?.trim() || null;
}

// --- Product Card ---
function ProductCard({ plan, product, onApprove, isApproving }) {
  const [expanded, setExpanded] = useState(false);

  const shots = Array.isArray(plan.shots) ? plan.shots : [];
  const shotTypes = shots.map((s) => s.type || s.shot_type || 'photo').join(', ');
  const isApproved = plan.plan_status === 'approved';
  const thumbnail = product?.existing_image_urls?.[0] || null;
  const categoryLabel = getCategoryLabel(product?.category_path);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden transition-colors hover:border-zinc-700/60"
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center shrink-0 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling?.classList?.remove('hidden');
              }}
            />
          ) : null}
          <Camera className={`w-5 h-5 text-zinc-600 ${thumbnail ? 'hidden' : ''}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-white truncate max-w-[280px]">
              {product?.title || plan.product_ean || 'Unknown Product'}
            </h3>
            {categoryLabel && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/40 shrink-0">
                {categoryLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-zinc-500 tabular-nums">{plan.product_ean}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-[11px] text-zinc-400">
              {shots.length} shot{shots.length !== 1 ? 's' : ''}: {shotTypes}
            </span>
          </div>
          {plan.reasoning && (
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-md">
              {plan.reasoning}
            </p>
          )}
        </div>

        {/* Status + Approve + Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={plan.plan_status} />

          {!isApproved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove(plan.plan_id);
              }}
              disabled={isApproving}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 transition-colors disabled:opacity-50"
            >
              {isApproving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Approve
            </button>
          )}

          <ChevronDown
            className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800/60 px-4 pb-4 pt-3 space-y-4">
              {/* Full reasoning */}
              {plan.reasoning && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">AI Reasoning</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{plan.reasoning}</p>
                </div>
              )}

              {/* Existing images */}
              {product?.existing_image_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Existing Images</p>
                  <div className="flex gap-2 flex-wrap">
                    {product.existing_image_urls.map((url, i) => (
                      <div
                        key={i}
                        className="w-16 h-16 rounded-lg bg-zinc-800/60 border border-zinc-700/40 overflow-hidden"
                      >
                        <img
                          src={url}
                          alt={`Existing ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planned shots */}
              {shots.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Planned Shots</p>
                  <div className="space-y-2">
                    {shots.map((shot, i) => {
                      const type = shot.type || shot.shot_type || 'photo';
                      const style = getShotStyle(type);
                      return (
                        <div
                          key={i}
                          className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}
                            >
                              {type}
                            </span>
                          </div>
                          {shot.description && (
                            <p className="text-sm text-zinc-300 mb-1.5">{shot.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-zinc-500">
                            {shot.mood && (
                              <span>
                                <span className="text-zinc-600">Mood:</span> {shot.mood}
                              </span>
                            )}
                            {shot.background && (
                              <span>
                                <span className="text-zinc-600">BG:</span> {shot.background}
                              </span>
                            )}
                            {shot.focus && (
                              <span>
                                <span className="text-zinc-600">Focus:</span> {shot.focus}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Approve at bottom */}
              {!isApproved && (
                <div className="pt-1">
                  <button
                    onClick={() => onApprove(plan.plan_id)}
                    disabled={isApproving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {isApproving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Approve Plan
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========================================================================
// Confirmation Modal
// ========================================================================

function ConfirmationModal({ open, onClose, stats, plans, onConfirm, isStarting }) {
  if (!open) return null;

  // Build shot type breakdown from plans
  const shotBreakdown = useMemo(() => {
    const counts = {};
    plans.forEach((plan) => {
      const shots = Array.isArray(plan.shots) ? plan.shots : [];
      shots.forEach((shot) => {
        const type = shot.shot_type || shot.type || 'photo';
        counts[type] = (counts[type] || 0) + 1;
      });
    });
    return counts;
  }, [plans]);

  // Estimate time: ~12 images/min
  const estimatedMinutes = Math.max(1, Math.ceil(stats.totalShots / 12));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl max-w-md w-full p-6 overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Ready to start your photoshoot?</h3>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-3 text-center">
                <Package className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white tabular-nums">{stats.approved}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Products</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-3 text-center">
                <Camera className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white tabular-nums">{stats.totalShots}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Images</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-3 text-center">
                <Timer className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white tabular-nums">~{estimatedMinutes} min</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Estimated</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-3 text-center">
                <Zap className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-white tabular-nums">{stats.totalShots}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Credits</p>
              </div>
            </div>

            {/* Shot breakdown */}
            {Object.keys(shotBreakdown).length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-medium text-zinc-400 mb-2">Shot breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(shotBreakdown).map(([type, count]) => {
                    const style = getShotStyle(type);
                    return (
                      <span
                        key={type}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text} border ${style.border}`}
                      >
                        <span className="capitalize">{type}</span>
                        <span className="opacity-60">{count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notice */}
            <p className="text-xs text-zinc-500 mb-5">
              You can cancel at any time. Completed images will be saved.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isStarting}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isStarting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                {isStarting ? 'Starting...' : 'Start Photoshoot'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ========================================================================
// Main Dashboard
// ========================================================================

export default function SyncStudioDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  // Data
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('category');

  // Approve state
  const [approvingIds, setApprovingIds] = useState(new Set());
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // -- Edge function caller --
  const callEdgeFunction = useCallback(async (body, fnName = APPROVE_EDGE_FUNCTION) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please log in again.');
    }

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
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error || parsed.message || `HTTP ${response.status}`;
      } catch {
        msg = text || `HTTP ${response.status}`;
      }
      throw new Error(msg);
    }

    return response.json();
  }, []);

  // -- Fetch plans + products --
  useEffect(() => {
    if (!user?.id) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [plansRes, productsRes] = await Promise.all([
          supabase
            .from('sync_studio_shoot_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('sync_studio_products')
            .select('*')
            .eq('user_id', user.id),
        ]);

        if (plansRes.data) setPlans(plansRes.data);
        if (productsRes.data) setProducts(productsRes.data);
      } catch (err) {
        console.error('[SyncStudioDashboard] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  // -- Build product lookup --
  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p.ean) map[p.ean] = p;
    });
    return map;
  }, [products]);

  // -- Computed stats --
  const stats = useMemo(() => {
    const total = plans.length;
    const approved = plans.filter((p) => p.plan_status === 'approved').length;
    const pending = total - approved;
    const totalShots = plans.reduce((sum, p) => {
      const shots = Array.isArray(p.shots) ? p.shots.length : 0;
      return sum + shots;
    }, 0);
    const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, pending, totalShots, percentage };
  }, [plans]);

  // -- Filtered + sorted plans --
  const filteredPlans = useMemo(() => {
    let result = [...plans];

    // Status filter
    if (filterStatus === 'pending') {
      result = result.filter((p) => p.plan_status === 'pending_approval' || p.plan_status === 'pending');
    } else if (filterStatus === 'approved') {
      result = result.filter((p) => p.plan_status === 'approved');
    } else if (filterStatus === 'modified') {
      result = result.filter((p) => p.plan_status === 'user_modified');
    }

    // Search filter (title or EAN)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((plan) => {
        const product = productMap[plan.product_ean];
        const title = (product?.title || '').toLowerCase();
        const ean = (plan.product_ean || '').toLowerCase();
        return title.includes(q) || ean.includes(q);
      });
    }

    // Sort
    if (sortBy === 'category') {
      result.sort((a, b) => {
        const catA = productMap[a.product_ean]?.category_path || '';
        const catB = productMap[b.product_ean]?.category_path || '';
        return catA.localeCompare(catB);
      });
    } else if (sortBy === 'shots') {
      result.sort((a, b) => {
        const shotsA = Array.isArray(a.shots) ? a.shots.length : 0;
        const shotsB = Array.isArray(b.shots) ? b.shots.length : 0;
        return shotsB - shotsA;
      });
    } else if (sortBy === 'alpha') {
      result.sort((a, b) => {
        const titleA = productMap[a.product_ean]?.title || a.product_ean || '';
        const titleB = productMap[b.product_ean]?.title || b.product_ean || '';
        return titleA.localeCompare(titleB);
      });
    }

    return result;
  }, [plans, filterStatus, searchQuery, sortBy, productMap]);

  // -- Approve single plan (optimistic) --
  const handleApprove = useCallback(
    async (planId) => {
      // Optimistic update
      setPlans((prev) =>
        prev.map((p) => (p.plan_id === planId ? { ...p, plan_status: 'approved' } : p))
      );
      setApprovingIds((prev) => new Set(prev).add(planId));

      try {
        await callEdgeFunction({
          action: 'approve',
          planId,
          userId: user?.id,
        });
      } catch (err) {
        console.error('[SyncStudioDashboard] approve error:', err);
        // Revert on failure
        setPlans((prev) =>
          prev.map((p) => (p.plan_id === planId ? { ...p, plan_status: 'pending_approval' } : p))
        );
      } finally {
        setApprovingIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
      }
    },
    [callEdgeFunction, user]
  );

  // -- Approve all (optimistic) --
  const handleApproveAll = useCallback(async () => {
    const pendingPlans = plans.filter(
      (p) => p.plan_status !== 'approved'
    );
    if (pendingPlans.length === 0) return;

    setApproveAllLoading(true);

    // Optimistic: mark all as approved
    setPlans((prev) =>
      prev.map((p) => ({ ...p, plan_status: 'approved' }))
    );

    try {
      await callEdgeFunction({
        action: 'approve_all',
        userId: user?.id,
      });
    } catch (err) {
      console.error('[SyncStudioDashboard] approve_all error:', err);
      // Revert: refetch from DB
      const { data } = await supabase
        .from('sync_studio_shoot_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) setPlans(data);
    } finally {
      setApproveAllLoading(false);
    }
  }, [plans, callEdgeFunction, user]);

  // -- Start photoshoot --
  const handleStartPhotoshoot = useCallback(async () => {
    setIsStarting(true);
    try {
      const result = await callEdgeFunction(
        {
          action: 'start',
          userId: user?.id,
          companyId: user?.company_id || user?.id,
        },
        EXECUTE_EDGE_FUNCTION
      );

      if (result?.jobId) {
        // Navigate to progress page with job ID
        navigate(`/SyncStudioPhotoshoot?jobId=${result.jobId}`);
      } else {
        console.error('[SyncStudioDashboard] No jobId returned from start:', result);
      }
    } catch (err) {
      console.error('[SyncStudioDashboard] start photoshoot error:', err);
      setIsStarting(false);
    }
  }, [callEdgeFunction, user, navigate]);

  // -- Loading state --
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Camera className="w-7 h-7 text-cyan-400" />
          </div>
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading shoot plans...</p>
        </motion.div>
      </div>
    );
  }

  // -- Empty state --
  if (plans.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto mb-5">
            <Package className="w-7 h-7 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No shoot plans yet</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Import your catalog first to generate AI photoshoot plans.
          </p>
          <button
            onClick={() => navigate('/SyncStudioHome')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sync Studio
          </button>
        </motion.div>
      </div>
    );
  }

  const allApproved = stats.percentage === 100;

  return (
    <div className="min-h-screen bg-black">
      {/* ============================================================ */}
      {/* STICKY TOP BAR                                                */}
      {/* ============================================================ */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Stats row */}
          <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="text-zinc-400">
                <span className="text-white font-semibold tabular-nums">{stats.total}</span> product{stats.total !== 1 ? 's' : ''}
                <span className="text-zinc-600 mx-1.5">&middot;</span>
                <span className="text-white font-semibold tabular-nums">{stats.totalShots}</span> shots planned
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">
                <span className="text-emerald-400 font-semibold tabular-nums">{stats.approved}</span> approved
                <span className="text-zinc-600 mx-1.5">&middot;</span>
                <span className="text-amber-400 font-semibold tabular-nums">{stats.pending}</span> pending
              </span>
            </div>

            <div className="flex items-center gap-2">
              {stats.pending > 0 && (
                <button
                  onClick={handleApproveAll}
                  disabled={approveAllLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 transition-colors disabled:opacity-50"
                >
                  {approveAllLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  Approve All ({stats.pending})
                </button>
              )}

              <button
                onClick={() => {
                  if (allApproved) setShowConfirmModal(true);
                }}
                disabled={!allApproved}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                  allApproved
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg shadow-cyan-500/20 animate-pulse'
                    : 'bg-zinc-800/60 text-zinc-600 border border-zinc-700/40 cursor-not-allowed'
                }`}
              >
                <Play className="w-3 h-3" />
                Start Photoshoot
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <Progress.Root
            className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800"
            value={stats.percentage}
          >
            <Progress.Indicator
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                allApproved
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
              }`}
              style={{ width: `${stats.percentage}%` }}
            />
          </Progress.Root>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-zinc-600">
              {stats.approved} of {stats.total} approved
            </span>
            <span className="text-[10px] text-cyan-400/80 font-medium tabular-nums">
              {stats.percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTER / SEARCH BAR                                           */}
      {/* ============================================================ */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-zinc-900/50 border border-zinc-800/60 rounded-xl pl-8 pr-8 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/40 transition-colors cursor-pointer"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="modified">Modified</option>
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or EAN..."
              className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-zinc-900/50 border border-zinc-800/60 rounded-xl pl-8 pr-8 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/40 transition-colors cursor-pointer"
            >
              <option value="category">Category</option>
              <option value="shots">Shot Count</option>
              <option value="alpha">Alphabetical</option>
            </select>
            <SortAsc className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* Result count */}
        <p className="text-[11px] text-zinc-600 mt-2">
          Showing {filteredPlans.length} of {plans.length} product{plans.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ============================================================ */}
      {/* PRODUCT CARDS LIST                                            */}
      {/* ============================================================ */}
      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredPlans.map((plan) => (
            <ProductCard
              key={plan.plan_id}
              plan={plan}
              product={productMap[plan.product_ean]}
              onApprove={handleApprove}
              isApproving={approvingIds.has(plan.plan_id)}
            />
          ))}
        </AnimatePresence>

        {filteredPlans.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Search className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No products match your filters.</p>
          </motion.div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        stats={stats}
        plans={plans.filter((p) => p.plan_status === 'approved')}
        onConfirm={handleStartPhotoshoot}
        isStarting={isStarting}
      />
    </div>
  );
}
