import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Package,
  Images,
  RefreshCw,
  Play,
  Eye,
  Send,
  Calendar,
  Timer,
  History,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRelative(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '-';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function JobStatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
        <XCircle className="w-3 h-3" />
        Cancelled
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  if (status === 'processing' || status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <Loader2 className="w-3 h-3 animate-spin" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
      <Clock className="w-3 h-3" />
      {status || 'Unknown'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-zinc-800/60 rounded w-1/3 mb-3" />
      <div className="h-3 bg-zinc-800/40 rounded w-2/3 mb-2" />
      <div className="h-3 bg-zinc-800/40 rounded w-1/2" />
    </div>
  );
}

// ========================================================================
// Main Component
// ========================================================================

export default function SyncStudioReturn() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [productCount, setProductCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // -- Fetch data --
  useEffect(() => {
    if (!user?.id) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [jobsRes, productsCountRes, lastSyncRes] = await Promise.all([
          // All past jobs
          supabase
            .from('sync_studio_jobs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),

          // Product count
          supabase
            .from('sync_studio_products')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),

          // Last synced time (max updated_at)
          supabase
            .from('sync_studio_products')
            .select('updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1),
        ]);

        if (jobsRes.data) setJobs(jobsRes.data);
        if (productsCountRes.count != null) setProductCount(productsCountRes.count);
        if (lastSyncRes.data?.[0]?.updated_at) setLastSyncedAt(lastSyncRes.data[0].updated_at);
      } catch (err) {
        console.error('[SyncStudioReturn] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  // -- Derived data --
  const latestJob = useMemo(() => {
    if (!jobs.length) return null;
    return jobs[0];
  }, [jobs]);

  const lastSyncedRelative = useMemo(() => {
    return formatDateRelative(lastSyncedAt);
  }, [lastSyncedAt]);

  // -- Loading state --
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Sync Studio</h1>
              <p className="text-sm text-zinc-500">Loading your studio...</p>
            </div>
          </div>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // -- No history (first-time user) --
  if (jobs.length === 0 && productCount === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
            <Camera className="w-7 h-7 text-cyan-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to Sync Studio</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Get started by connecting your catalog and running your first AI photoshoot.
          </p>
          <button
            onClick={() => navigate('/SyncStudioHome')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-black text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // -- Main return dashboard --
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Camera className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Sync Studio</h1>
            <p className="text-sm text-zinc-500">
              {productCount.toLocaleString()} product{productCount !== 1 ? 's' : ''} in catalog
              {lastSyncedRelative && (
                <span className="text-zinc-600"> &middot; last synced {lastSyncedRelative}</span>
              )}
            </p>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* LAST PHOTOSHOOT CARD                                          */}
        {/* ============================================================ */}
        {latestJob && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Last Photoshoot
              </h2>
              <JobStatusBadge status={latestJob.status} />
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-300 mb-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{formatDate(latestJob.created_at)}</span>
              </div>
              {latestJob.total_products != null && (
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{latestJob.total_products?.toLocaleString()} products</span>
                </div>
              )}
              {latestJob.total_images != null && (
                <div className="flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{latestJob.total_images?.toLocaleString()} images</span>
                </div>
              )}
              {latestJob.duration_ms != null && (
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{formatDuration(latestJob.duration_ms)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/SyncStudioResults?jobId=${latestJob.job_id}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View Results
              </button>
              {latestJob.status === 'completed' && (
                <button
                  onClick={() => navigate(`/SyncStudioResults?jobId=${latestJob.job_id}&publish=true`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish to Bol.com
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* START NEW PHOTOSHOOT CARD                                      */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 mb-4"
        >
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Start New Photoshoot
          </h2>

          {lastSyncedRelative && (
            <p className="text-sm text-zinc-400 mb-4">
              Your catalog was last synced <span className="text-zinc-300 font-medium">{lastSyncedRelative}</span>.
            </p>
          )}

          <div className="space-y-3">
            {/* Re-sync & Plan */}
            <button
              onClick={() => navigate('/SyncStudioHome?resync=true')}
              className="group w-full text-left bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/40 hover:border-cyan-500/30 rounded-xl p-4 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    Re-sync & Plan New Shoot
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Delta update, only new/changed products
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors shrink-0" />
              </div>
            </button>

            {/* Use Current Catalog */}
            <button
              onClick={() => navigate('/SyncStudioDashboard')}
              className="group w-full text-left bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/40 hover:border-zinc-600/60 rounded-xl p-4 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-700/30 border border-zinc-600/30 flex items-center justify-center shrink-0">
                  <Play className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-zinc-200 transition-colors">
                    Use Current Catalog
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Reuse existing data, generate new plans
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </div>
            </button>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* PHOTOSHOOT HISTORY TABLE                                       */}
        {/* ============================================================ */}
        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl overflow-hidden"
          >
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Photoshoot History
                </h2>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-zinc-800/60">
                    <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                      Date
                    </th>
                    <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-3">
                      Products
                    </th>
                    <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-3">
                      Images
                    </th>
                    <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-3">
                      Duration
                    </th>
                    <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3 py-3">
                      Status
                    </th>
                    <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, idx) => (
                    <tr
                      key={job.job_id || job.id || idx}
                      className="border-t border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="px-6 py-3 text-zinc-300 whitespace-nowrap">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-3 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                        {job.total_products != null ? job.total_products.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                        {job.total_images != null ? job.total_images.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-3 text-zinc-400 whitespace-nowrap">
                        {formatDuration(job.duration_ms)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/SyncStudioResults?jobId=${job.job_id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800/40">
              <p className="text-[11px] text-zinc-600">
                {jobs.length} photoshoot{jobs.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
