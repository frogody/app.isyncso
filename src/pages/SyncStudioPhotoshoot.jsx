import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Progress from '@radix-ui/react-progress';
import {
  Camera,
  Loader2,
  Package,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Square,
  Image as ImageIcon,
  Sparkles,
  PartyPopper,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
const EXECUTE_FN = 'sync-studio-execute-photoshoot';
const PROGRESS_FN = 'sync-studio-job-progress';
const POLL_INTERVAL = 2500; // ms

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString();
}

// ---------------------------------------------------------------------------
// Animated counter (reused from SyncStudioImport pattern)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SyncStudioPhotoshoot() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  // State
  const [jobData, setJobData] = useState(null);
  const [recentImages, setRecentImages] = useState([]);
  const [stage, setStage] = useState('processing'); // processing | completed | cancelled | error
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const pollingRef = useRef(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // ---------------------------------------------------------------------------
  // Edge function caller (same pattern as Dashboard / Import)
  // ---------------------------------------------------------------------------

  const callEdgeFunction = useCallback(async (body, fnName) => {
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

  // ---------------------------------------------------------------------------
  // Polling loop
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user?.id || !jobId) return;

    mountedRef.current = true;
    startTimeRef.current = Date.now();

    const poll = async () => {
      if (!mountedRef.current) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        // 1) Fetch progress status
        const progressData = await callEdgeFunction(
          { action: 'status', userId: user.id, jobId },
          PROGRESS_FN,
        );

        if (!mountedRef.current) return;

        // Update job data
        if (progressData) {
          setJobData(progressData);
        }

        // Update recent images from response
        if (progressData?.recent_images?.length) {
          setRecentImages((prev) => {
            const existingUrls = new Set(prev.map((img) => img.image_url));
            const newOnes = progressData.recent_images.filter(
              (img) => img.image_url && !existingUrls.has(img.image_url),
            );
            if (newOnes.length === 0) return prev;
            const merged = [...newOnes, ...prev].slice(0, 10);
            return merged;
          });
        }

        // Check terminal states
        const status = progressData?.status || progressData?.job_status;
        if (status === 'completed') {
          setStage('completed');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          inFlightRef.current = false;
          return;
        }
        if (status === 'cancelled') {
          setStage('cancelled');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          inFlightRef.current = false;
          return;
        }
        if (status === 'failed' || status === 'error') {
          setStage('error');
          setError(progressData?.error || 'The photoshoot encountered an error.');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          inFlightRef.current = false;
          return;
        }

        // 2) Call continue to process next chunk (only if still processing)
        try {
          await callEdgeFunction(
            { action: 'continue', userId: user.id, jobId },
            EXECUTE_FN,
          );
        } catch (continueErr) {
          // Continue errors are non-fatal -- the next poll will retry
          console.warn('[SyncStudioPhotoshoot] continue error:', continueErr.message);
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error('[SyncStudioPhotoshoot] poll error:', err);
          // Don't crash on transient errors; only set error after repeated failures
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    // Initial poll immediately
    poll();

    // Then set interval
    pollingRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user?.id, jobId, callEdgeFunction]);

  // ---------------------------------------------------------------------------
  // Cancel handler
  // ---------------------------------------------------------------------------

  const handleCancel = useCallback(async () => {
    if (!user?.id || !jobId || cancelling) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel this photoshoot? Completed images will be saved.',
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await callEdgeFunction(
        { action: 'cancel', userId: user.id, jobId },
        EXECUTE_FN,
      );
      setStage('cancelled');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err) {
      console.error('[SyncStudioPhotoshoot] cancel error:', err);
      // Still set cancelled optimistically
      setStage('cancelled');
    } finally {
      setCancelling(false);
    }
  }, [user?.id, jobId, cancelling, callEdgeFunction]);

  // ---------------------------------------------------------------------------
  // Computed values from jobData
  // ---------------------------------------------------------------------------

  const totalImages = jobData?.total_images || jobData?.totalImages || 0;
  const completedImages = jobData?.images_completed || jobData?.completed || 0;
  const failedImages = jobData?.images_failed || jobData?.failed || 0;
  const totalProducts = jobData?.total_products || jobData?.products_total || 0;
  const completedProducts = jobData?.products_completed || 0;

  const percentage = totalImages > 0
    ? Math.min(Math.round((completedImages / totalImages) * 100), 100)
    : 0;

  // Images per minute calculation
  const elapsedMs = Date.now() - startTimeRef.current;
  const elapsedMinutes = elapsedMs / 60000;
  const imagesPerMinute = elapsedMinutes > 0.1
    ? (completedImages / elapsedMinutes).toFixed(1)
    : '0.0';

  // Estimated time remaining
  const remainingImages = Math.max(0, totalImages - completedImages);
  const imagesPerMin = parseFloat(imagesPerMinute);
  const estimatedRemainingSeconds = imagesPerMin > 0
    ? Math.round((remainingImages / imagesPerMin) * 60)
    : 0;

  // Elapsed time for completed stage
  const totalElapsedSeconds = Math.round(elapsedMs / 1000);

  // ---------------------------------------------------------------------------
  // No jobId guard
  // ---------------------------------------------------------------------------

  if (!jobId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto mb-5">
            <Camera className="w-7 h-7 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Photoshoot Found</h2>
          <p className="text-sm text-zinc-400 mb-6">
            No job ID was provided. Please start a photoshoot from the dashboard.
          </p>
          <button
            onClick={() => navigate('/SyncStudioDashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium rounded-xl transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // COMPLETED stage
  // ---------------------------------------------------------------------------

  if (stage === 'completed') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full text-center"
        >
          {/* Celebration icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <PartyPopper className="w-8 h-8 text-cyan-400" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white mb-3"
          >
            Photoshoot Complete!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-zinc-400 mb-8"
          >
            <span className="text-white font-semibold tabular-nums">
              <AnimatedCounter value={completedImages} />
            </span>
            {' images generated for '}
            <span className="text-white font-semibold tabular-nums">
              <AnimatedCounter value={completedProducts || totalProducts} />
            </span>
            {' products'}
            {failedImages > 0 && (
              <>
                <span className="text-zinc-600 mx-1.5">&middot;</span>
                <span className="text-red-400 font-semibold tabular-nums">{failedImages}</span>
                {' failed'}
              </>
            )}
            <span className="text-zinc-600 mx-1.5">&middot;</span>
            <span className="text-zinc-400">{formatDuration(totalElapsedSeconds)}</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => navigate(`/SyncStudioResults?jobId=${jobId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
            >
              <ImageIcon className="w-4 h-4" />
              View Results
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CANCELLED stage
  // ---------------------------------------------------------------------------

  if (stage === 'cancelled') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto mb-5">
            <Square className="w-7 h-7 text-zinc-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Photoshoot Cancelled</h2>

          <p className="text-sm text-zinc-400 mb-6">
            {completedImages > 0 ? (
              <>
                <span className="text-white font-semibold tabular-nums">{formatNumber(completedImages)}</span>
                {' images were completed before cancellation'}
                {failedImages > 0 && (
                  <>
                    <span className="text-zinc-600 mx-1.5">&middot;</span>
                    <span className="text-red-400 font-semibold tabular-nums">{failedImages}</span>
                    {' failed'}
                  </>
                )}
              </>
            ) : (
              'The photoshoot was cancelled before any images were generated.'
            )}
          </p>

          <div className="flex items-center justify-center gap-3">
            {completedImages > 0 && (
              <button
                onClick={() => navigate(`/SyncStudioResults?jobId=${jobId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium rounded-xl transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                View Partial Results
              </button>
            )}
            <button
              onClick={() => navigate('/SyncStudioDashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR stage
  // ---------------------------------------------------------------------------

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-lg w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Photoshoot Error</h2>
          <p className="text-sm text-zinc-400 mb-6 break-words">
            {error || 'An unexpected error occurred during the photoshoot.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            {completedImages > 0 && (
              <button
                onClick={() => navigate(`/SyncStudioResults?jobId=${jobId}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium rounded-xl transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                View Partial Results
              </button>
            )}
            <button
              onClick={() => navigate('/SyncStudioDashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PROCESSING stage (main view)
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white">Photoshoot in progress...</h1>
              <p className="text-sm text-zinc-500">Generating images for your products</p>
            </div>
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <Progress.Root
              className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800"
              value={percentage}
            >
              <Progress.Indicator
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </Progress.Root>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-zinc-400">
                <span className="text-white font-medium tabular-nums">
                  <AnimatedCounter value={completedImages} />
                </span>
                {' of '}
                <span className="tabular-nums">
                  <AnimatedCounter value={totalImages} />
                </span>
                {' images'}
                {estimatedRemainingSeconds > 0 && (
                  <>
                    <span className="text-zinc-600 mx-1.5">&middot;</span>
                    <span className="text-zinc-500">
                      ~{formatDuration(estimatedRemainingSeconds)} remaining
                    </span>
                  </>
                )}
              </span>
              <span className="text-xs tabular-nums text-cyan-400/80 font-medium">
                {percentage}%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {/* Speed */}
            <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-3 py-2.5">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Speed</p>
                <p className="text-sm font-semibold text-white tabular-nums">{imagesPerMinute}/min</p>
              </div>
            </div>

            {/* Completed */}
            <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Done</p>
                <p className="text-sm font-semibold text-white tabular-nums">
                  <AnimatedCounter value={completedImages} />
                </p>
              </div>
            </div>

            {/* Failed */}
            <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-3 py-2.5">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Failed</p>
                <p className="text-sm font-semibold text-white tabular-nums">
                  <AnimatedCounter value={failedImages} />
                </p>
              </div>
            </div>

            {/* Products */}
            <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-3 py-2.5">
              <Package className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Products</p>
                <p className="text-sm font-semibold text-white tabular-nums">
                  <AnimatedCounter value={completedProducts} />
                  {totalProducts > 0 && (
                    <span className="text-zinc-500 font-normal">
                      {' / '}
                      <AnimatedCounter value={totalProducts} />
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Live feed: recent images */}
          {recentImages.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Live Feed
                </p>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <AnimatePresence mode="popLayout">
                  {recentImages.slice(0, 10).map((img) => (
                    <motion.div
                      key={img.image_url}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-1"
                    >
                      <div className="w-full aspect-square rounded-xl bg-zinc-800/60 border border-zinc-700/40 overflow-hidden">
                        <img
                          src={img.image_url}
                          alt={img.product_title || 'Generated image'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      {img.product_title && (
                        <p className="text-xs text-zinc-400 truncate" title={img.product_title}>
                          {img.product_title}
                        </p>
                      )}
                      {img.shot_number != null && (
                        <p className="text-[10px] text-zinc-500">
                          Shot {img.shot_number}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Empty live feed placeholder */}
          {recentImages.length === 0 && completedImages === 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider">
                  Live Feed
                </p>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="w-full aspect-square rounded-xl bg-zinc-800/40 border border-zinc-700/20 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-zinc-800/40 animate-pulse" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-center">
                Images will appear here as they are generated...
              </p>
            </div>
          )}

          {/* Cancel button */}
          <div className="flex justify-end">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {cancelling ? 'Cancelling...' : 'Cancel Photoshoot'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
