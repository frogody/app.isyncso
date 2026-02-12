import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Progress from '@radix-ui/react-progress';
import {
  Package,
  Camera,
  FolderOpen,
  Image,
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Palette,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

const EDGE_FUNCTION = 'sync-studio-import-catalog';
const PLAN_EDGE_FUNCTION = 'sync-studio-generate-plans';
const POLL_INTERVAL_MS = 2000;
const COMPLETE_REDIRECT_DELAY_MS = 2000;

// --- Animated Counter ---
function AnimatedCounter({ value, duration = 600 }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(start + (end - start) * eased);
      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{displayed.toLocaleString()}</>;
}

// --- Stat Pill ---
function StatPill({ icon: Icon, label, value, suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3.5 py-2"
    >
      <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">
        <AnimatedCounter value={value} />
        {suffix}
      </span>
    </motion.div>
  );
}

// --- Progress Bar ---
function ImportProgressBar({ current, total }) {
  const percentage = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <div className="space-y-2">
      <Progress.Root
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-800"
        value={percentage}
      >
        <Progress.Indicator
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </Progress.Root>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          <span className="text-zinc-300 font-medium tabular-nums">
            <AnimatedCounter value={current} />
          </span>
          {' '}of ~
          <span className="tabular-nums">
            <AnimatedCounter value={total} />
          </span>
        </span>
        <span className="tabular-nums text-cyan-400/80 font-medium">{percentage}%</span>
      </div>
    </div>
  );
}

export default function SyncStudioImport() {
  const navigate = useNavigate();
  const { user } = useUser();

  // Import state
  const [stage, setStage] = useState('loading'); // loading | importing | planning | complete | error
  const [importJobId, setImportJobId] = useState(null);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Import stats
  const [totalProducts, setTotalProducts] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [categories, setCategories] = useState(0);
  const [brands, setBrands] = useState(0);
  const [images, setImages] = useState(0);
  const [currentProduct, setCurrentProduct] = useState('');

  // Planning stats
  const [plannedProducts, setPlannedProducts] = useState(0);
  const [totalShotsPlanned, setTotalShotsPlanned] = useState(0);
  const [planningPage, setPlanningPage] = useState(null);

  // Error
  const [error, setError] = useState(null);

  // Refs for cleanup
  const pollingRef = useRef(null);
  const planPollingRef = useRef(null);
  const mountedRef = useRef(true);
  const continueInFlightRef = useRef(false);
  const planInFlightRef = useRef(false);

  // -- Edge function caller --
  const callEdgeFunction = useCallback(async (body, fnName = EDGE_FUNCTION) => {
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

  // -- Update stats from response --
  const updateStats = useCallback((data) => {
    if (data.totalProducts != null) setTotalProducts(data.totalProducts);
    if (data.estimatedTotal != null) setEstimatedTotal(data.estimatedTotal);
    if (data.categories != null) setCategories(data.categories);
    if (data.brands != null) setBrands(data.brands);
    if (data.images != null) setImages(data.images);
    if (data.currentProduct) setCurrentProduct(data.currentProduct);
    if (data.importJobId) setImportJobId(data.importJobId);
    if (data.nextPage != null) setNextPage(data.nextPage);
    if (data.hasMore != null) setHasMore(data.hasMore);
  }, []);

  // -- Handle full completion (after planning) --
  const handleAllDone = useCallback(() => {
    if (!mountedRef.current) return;
    setStage('complete');
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (planPollingRef.current) { clearInterval(planPollingRef.current); planPollingRef.current = null; }
    setTimeout(() => {
      if (mountedRef.current) navigate('/SyncStudioDashboard');
    }, COMPLETE_REDIRECT_DELAY_MS);
  }, [navigate]);

  // -- Planning: continue next chunk --
  const continuePlanning = useCallback(async (jobId, page) => {
    if (!mountedRef.current || planInFlightRef.current) return;
    planInFlightRef.current = true;
    try {
      const data = await callEdgeFunction({
        action: 'continue',
        userId: user?.id,
        companyId: user?.company_id,
        importJobId: jobId,
        page,
      }, PLAN_EDGE_FUNCTION);
      if (!mountedRef.current) return;
      if (data.totalPlanned != null) setPlannedProducts(data.totalPlanned);
      if (data.totalShots != null) setTotalShotsPlanned(data.totalShots);
      if (data.nextPage != null) setPlanningPage(data.nextPage);
      if (data.status === 'completed' || !data.hasMore) {
        handleAllDone();
      }
    } catch (err) {
      if (mountedRef.current) { setError(err.message); setStage('error'); }
    } finally {
      planInFlightRef.current = false;
    }
  }, [callEdgeFunction, user, handleAllDone]);

  // -- Planning: poll + continue loop --
  const startPlanPolling = useCallback((jobId, initialPage) => {
    if (planPollingRef.current) clearInterval(planPollingRef.current);
    let currentPage = initialPage;
    planPollingRef.current = setInterval(async () => {
      if (!mountedRef.current) { clearInterval(planPollingRef.current); return; }
      if (planInFlightRef.current) return;
      try {
        const statusData = await callEdgeFunction({
          action: 'status',
          userId: user?.id,
          companyId: user?.company_id,
          importJobId: jobId,
        }, PLAN_EDGE_FUNCTION);
        if (!mountedRef.current) return;
        if (statusData.planned_products != null) setPlannedProducts(statusData.planned_products);
        if (statusData.total_shots_planned != null) setTotalShotsPlanned(statusData.total_shots_planned);
        if (statusData.status === 'completed') { handleAllDone(); return; }
        // Continue next chunk
        if (currentPage) {
          await continuePlanning(jobId, currentPage);
          currentPage = null; // will be set by continuePlanning via setPlanningPage
        }
      } catch (err) {
        // Transient errors ok, don't crash
      }
    }, POLL_INTERVAL_MS);
  }, [callEdgeFunction, user, handleAllDone, continuePlanning]);

  // -- Start planning phase --
  const startPlanning = useCallback(async (jobId) => {
    if (!mountedRef.current) return;
    setStage('planning');
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    try {
      const data = await callEdgeFunction({
        action: 'start',
        userId: user?.id,
        companyId: user?.company_id,
        importJobId: jobId,
      }, PLAN_EDGE_FUNCTION);
      if (!mountedRef.current) return;
      if (data.totalPlanned != null) setPlannedProducts(data.totalPlanned);
      if (data.totalShots != null) setTotalShotsPlanned(data.totalShots);
      if (data.status === 'completed' || !data.hasMore) {
        handleAllDone();
      } else {
        startPlanPolling(jobId, data.nextPage);
      }
    } catch (err) {
      if (mountedRef.current) { setError(err.message); setStage('error'); }
    }
  }, [callEdgeFunction, user, handleAllDone, startPlanPolling]);

  // -- Handle import completion (transitions to planning) --
  const handleComplete = useCallback((jobId) => {
    if (!mountedRef.current) return;
    const jid = jobId || importJobId;
    if (jid) {
      startPlanning(jid);
    } else {
      handleAllDone();
    }
  }, [importJobId, startPlanning, handleAllDone]);

  // -- Continue import (fetch next page) --
  const continueImport = useCallback(async (jobId, page) => {
    if (!mountedRef.current || continueInFlightRef.current) return;
    continueInFlightRef.current = true;

    try {
      const data = await callEdgeFunction({
        action: 'continue',
        userId: user?.id,
        companyId: user?.company_id,
        importJobId: jobId,
        page,
      });

      if (!mountedRef.current) return;
      updateStats(data);

      if (!data.hasMore || data.status === 'planning' || data.status === 'complete') {
        handleComplete(data.importJobId || jobId);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('[SyncStudioImport] continue error:', err);
        setError(err.message);
        setStage('error');
      }
    } finally {
      continueInFlightRef.current = false;
    }
  }, [callEdgeFunction, user, updateStats, handleComplete]);

  // -- Poll for progress / trigger next page --
  const startPolling = useCallback((jobId, initialPage) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let currentPage = initialPage;
    let currentJobId = jobId;

    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current) {
        clearInterval(pollingRef.current);
        return;
      }

      // If a continue is in flight, skip this tick
      if (continueInFlightRef.current) return;

      try {
        // Check status first
        const statusData = await callEdgeFunction({
          action: 'status',
          userId: user?.id,
          companyId: user?.company_id,
        });

        if (!mountedRef.current) return;
        updateStats(statusData);

        // Import is done — transition to planning
        if (statusData.status === 'planning' || statusData.status === 'complete' || !statusData.hasMore) {
          handleComplete(statusData.importJobId || currentJobId);
          return;
        }

        // There are more pages -- trigger continue
        if (statusData.hasMore && statusData.nextPage != null) {
          currentPage = statusData.nextPage;
          currentJobId = statusData.importJobId || currentJobId;
          await continueImport(currentJobId, currentPage);
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error('[SyncStudioImport] poll error:', err);
          // Don't set error on transient failures, only after repeated issues
        }
      }
    }, POLL_INTERVAL_MS);
  }, [callEdgeFunction, user, updateStats, handleComplete, continueImport]);

  // -- Init: check for existing job or start new one --
  useEffect(() => {
    if (!user?.id) return;

    mountedRef.current = true;

    const init = async () => {
      try {
        // 1) Check for active import
        const statusData = await callEdgeFunction({
          action: 'status',
          userId: user.id,
          companyId: user.company_id,
        });

        if (!mountedRef.current) return;
        updateStats(statusData);

        // Already fully completed — go to dashboard
        if (statusData.status === 'completed' || statusData.status === 'complete') {
          handleAllDone();
          return;
        }

        // In planning phase — resume planning
        if (statusData.status === 'planning' && statusData.importJobId) {
          handleComplete(statusData.importJobId);
          return;
        }

        // Active import found — resume
        if (statusData.status === 'importing' && statusData.importJobId) {
          setStage('importing');
          startPolling(statusData.importJobId, statusData.nextPage || 1);
          return;
        }

        // 2) No active import — start one
        const startData = await callEdgeFunction({
          action: 'start',
          userId: user.id,
          companyId: user.company_id,
        });

        if (!mountedRef.current) return;
        updateStats(startData);
        setStage('importing');

        if (!startData.hasMore || startData.status === 'planning' || startData.status === 'complete') {
          handleComplete(startData.importJobId);
        } else {
          startPolling(startData.importJobId, startData.nextPage || 2);
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error('[SyncStudioImport] init error:', err);
          setError(err.message);
          setStage('error');
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      if (planPollingRef.current) { clearInterval(planPollingRef.current); planPollingRef.current = null; }
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Retry handler --
  const handleRetry = () => {
    setError(null);
    setStage('loading');
    setTotalProducts(0);
    setEstimatedTotal(0);
    setCategories(0);
    setBrands(0);
    setImages(0);
    setCurrentProduct('');
    setImportJobId(null);
    setNextPage(1);
    setHasMore(true);
    // Re-trigger init by forcing remount-like effect
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {/* ----- LOADING ----- */}
        {stage === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full text-center"
          >
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-sm">Connecting to Bol.com...</p>
          </motion.div>
        )}

        {/* ----- IMPORTING ----- */}
        {stage === 'importing' && (
          <motion.div
            key="importing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Importing your catalog...</h2>
                <p className="text-sm text-zinc-500">Fetching products from Bol.com</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <ImportProgressBar
                current={totalProducts}
                total={estimatedTotal || totalProducts + 100}
              />
            </div>

            {/* Live Stats */}
            <div className="mb-5">
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-3">
                Found so far
              </p>
              <div className="flex flex-wrap gap-2">
                <StatPill icon={FolderOpen} label="categories" value={categories} />
                <StatPill icon={Camera} label="brands" value={brands} />
                <StatPill icon={Image} label="images" value={images} suffix="+" />
              </div>
            </div>

            {/* Current product ticker */}
            <AnimatePresence mode="wait">
              {currentProduct && (
                <motion.div
                  key={currentProduct}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-xs text-zinc-600 truncate"
                >
                  <Loader2 className="w-3 h-3 animate-spin shrink-0 text-zinc-600" />
                  <span className="truncate">{currentProduct}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ----- PLANNING ----- */}
        {stage === 'planning' && (
          <motion.div
            key="planning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Palette className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Creating shoot plans...</h2>
                <p className="text-sm text-zinc-500">Preparing photoshoot briefs for each product</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <ImportProgressBar
                current={plannedProducts}
                total={totalProducts || plannedProducts + 10}
              />
            </div>

            {/* Planning Stats */}
            <div className="mb-5">
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-3">
                Plans generated
              </p>
              <div className="flex flex-wrap gap-2">
                <StatPill icon={Package} label="products" value={plannedProducts} />
                <StatPill icon={Camera} label="total shots" value={totalShotsPlanned} />
              </div>
            </div>

            {/* Spinner */}
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Loader2 className="w-3 h-3 animate-spin shrink-0 text-cyan-400" />
              <span>Analyzing categories, prices & existing images...</span>
            </div>
          </motion.div>
        )}

        {/* ----- COMPLETE ----- */}
        {stage === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle2 className="w-7 h-7 text-cyan-400" />
            </motion.div>

            <h2 className="text-xl font-semibold text-white mb-2">Studio ready!</h2>

            <p className="text-sm text-zinc-400 mb-6">
              <span className="text-white font-medium tabular-nums">
                <AnimatedCounter value={totalProducts} />
              </span>
              {' products'}
              <span className="text-zinc-600 mx-1">&middot;</span>
              <span className="text-white font-medium tabular-nums">
                <AnimatedCounter value={totalShotsPlanned} />
              </span>
              {' shots planned'}
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Redirecting to dashboard...</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </div>
          </motion.div>
        )}

        {/* ----- ERROR ----- */}
        {stage === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-white mb-2">Import failed</h2>
            <p className="text-sm text-zinc-400 mb-6 break-words">
              {error || 'An unexpected error occurred.'}
            </p>

            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium rounded-xl transition-colors"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
