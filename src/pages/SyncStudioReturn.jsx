import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { SyncStudioNav } from '@/components/sync-studio';

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
  const configs = {
    completed: { icon: CheckCircle2, label: 'Completed', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    cancelled: { icon: XCircle, label: 'Cancelled', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
    failed: { icon: XCircle, label: 'Failed', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
    processing: { icon: Loader2, label: 'In Progress', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', spin: true },
    in_progress: { icon: Loader2, label: 'In Progress', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', spin: true },
  };
  const cfg = configs[status] || { icon: Clock, label: status || 'Unknown', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
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

  useEffect(() => {
    if (!user?.id) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [jobsRes, productsCountRes] = await Promise.all([
          supabase
            .from('sync_studio_jobs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sync_studio_products')
            .select('ean', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        if (jobsRes.data) setJobs(jobsRes.data);
        if (productsCountRes.count != null) setProductCount(productsCountRes.count);
      } catch (err) {
        console.error('[SyncStudioReturn] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  const latestJob = useMemo(() => jobs[0] || null, [jobs]);

  // Resolve the correct job ID field (table uses `id`, but some edge functions return `job_id`)
  function getJobId(job) {
    return job?.id || job?.job_id;
  }

  // -- Loading --
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Camera className="w-7 h-7 text-yellow-400" />
          </div>
          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading history...</p>
        </motion.div>
      </div>
    );
  }

  // -- Empty --
  if (jobs.length === 0 && productCount === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-5">
            <Camera className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to Sync Studio</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Get started by connecting your catalog and running your first AI photoshoot.
          </p>
          <button
            onClick={() => navigate('/SyncStudioHome')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-semibold rounded-full transition-all shadow-lg shadow-yellow-500/20"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // -- Main --
  return (
    <div className="min-h-screen bg-black">
      {/* ─── Sticky Nav (matches Dashboard) ────────────────────── */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3">
          <SyncStudioNav />
        </div>
      </div>

      {/* ─── Stats Strip ───────────────────────────────────────── */}
      <div className="bg-zinc-900/40 border-b border-zinc-800/40">
        <div className="w-full px-4 lg:px-8 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-400">
              <span className="text-white font-semibold tabular-nums">{productCount.toLocaleString()}</span> products in catalog
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-400">
              <span className="text-white font-semibold tabular-nums">{jobs.length}</span> photoshoot{jobs.length !== 1 ? 's' : ''}
            </span>
            {latestJob && (
              <>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-400">
                  Last: <span className="text-zinc-300">{formatDate(latestJob.created_at)}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/SyncStudioImport')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Re-sync Catalog
            </button>
            <button
              onClick={() => navigate('/SyncStudioDashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 transition-colors"
            >
              <Play className="w-3 h-3" />
              New Photoshoot
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────── */}
      <div className="w-full px-4 lg:px-8 pt-4 pb-8">

        {/* ─── Latest Photoshoot Card ──────────────────────────── */}
        {latestJob && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-zinc-800/60 rounded-2xl mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 bg-zinc-900/50">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-medium text-white">Latest Photoshoot</h3>
                  <JobStatusBadge status={latestJob.status} />
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(latestJob.created_at)}</span>
                  {latestJob.total_products != null && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{latestJob.total_products} products</span>}
                  {latestJob.total_images != null && <span className="flex items-center gap-1"><Images className="w-3 h-3" />{latestJob.total_images} images</span>}
                  {latestJob.duration_ms != null && <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{formatDuration(latestJob.duration_ms)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/SyncStudioResults?jobId=${getJobId(latestJob)}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  View Results
                </button>
                {latestJob.status === 'completed' && (
                  <button
                    onClick={() => navigate(`/SyncStudioResults?jobId=${getJobId(latestJob)}&publish=true`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Publish
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── History Table ───────────────────────────────────── */}
        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="border border-zinc-800/60 rounded-2xl overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                All Photoshoots
              </h2>
              <span className="text-[10px] text-zinc-600 ml-auto">{jobs.length} total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-t border-zinc-800/60">
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2">Date</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-3 py-2">Products</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-3 py-2">Images</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-3 py-2">Duration</th>
                    <th className="text-left text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-3 py-2">Status</th>
                    <th className="text-right text-[10px] font-medium text-zinc-600 uppercase tracking-wider px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, idx) => (
                    <tr
                      key={getJobId(job) || idx}
                      className="border-t border-zinc-800/40 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-zinc-300 text-xs whitespace-nowrap">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300 text-xs font-medium tabular-nums whitespace-nowrap">
                        {job.total_products != null ? job.total_products.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300 text-xs font-medium tabular-nums whitespace-nowrap">
                        {job.total_images != null ? job.total_images.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                        {formatDuration(job.duration_ms)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/SyncStudioResults?jobId=${getJobId(job)}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 text-zinc-300 transition-colors"
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
