import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowDownToLine,
  RefreshCw,
  Trash2,
  Download,
  Send,
  Images,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function showToast(message, type = 'info') {
  // Lightweight inline toast; swappable for a proper toast library
  const el = document.createElement('div');
  el.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-opacity duration-300 ${
    type === 'error'
      ? 'bg-red-500/90 text-white'
      : type === 'success'
      ? 'bg-yellow-500/90 text-white'
      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
  }`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SyncStudioResults() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [products, setProducts] = useState([]);
  const [regeneratingIds, setRegeneratingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());

  // -------------------------------------------------------------------------
  // Edge function helper
  // -------------------------------------------------------------------------

  const callEdgeFunction = useCallback(async (body, fnName) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, []);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!jobId || !user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch job
      const { data: jobData, error: jobErr } = await supabase
        .from('sync_studio_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      if (jobErr) throw new Error(`Failed to load job: ${jobErr.message}`);
      setJob(jobData);

      // Fetch completed images
      const { data: images, error: imgErr } = await supabase
        .from('sync_studio_generated_images')
        .select('image_id, image_url, product_ean, shot_number, plan_id, status')
        .eq('job_id', jobId)
        .eq('status', 'completed');
      if (imgErr) throw new Error(`Failed to load images: ${imgErr.message}`);
      setGeneratedImages(images || []);

      // Get unique EANs from generated images
      const eans = [...new Set((images || []).map((img) => img.product_ean).filter(Boolean))];

      // Fetch products
      if (eans.length > 0) {
        const { data: prods, error: prodErr } = await supabase
          .from('sync_studio_products')
          .select('ean, title, existing_image_urls')
          .eq('user_id', user.id)
          .in('ean', eans);
        if (prodErr) throw new Error(`Failed to load products: ${prodErr.message}`);
        setProducts(prods || []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('SyncStudioResults load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // Grouped data
  // -------------------------------------------------------------------------

  const groupedByEan = useMemo(() => {
    const map = new Map();
    for (const img of generatedImages) {
      const ean = img.product_ean || 'unknown';
      if (!map.has(ean)) {
        const product = products.find((p) => p.ean === ean);
        map.set(ean, {
          ean,
          title: product?.title || `Product ${ean}`,
          existingImages: product?.existing_image_urls || [],
          generated: [],
        });
      }
      map.get(ean).generated.push(img);
    }
    // Sort generated images by shot_number
    for (const group of map.values()) {
      group.generated.sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
    }
    return [...map.values()];
  }, [generatedImages, products]);

  // -------------------------------------------------------------------------
  // Job stats
  // -------------------------------------------------------------------------

  const jobStats = useMemo(() => {
    if (!job) return null;
    const timeTaken =
      job.completed_at && job.created_at
        ? new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()
        : 0;
    return {
      total: job.total_images || 0,
      completed: job.images_completed || 0,
      failed: job.images_failed || 0,
      timeTaken,
      status: job.status,
      createdAt: job.created_at,
    };
  }, [job]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleDownloadImage = useCallback((imageUrl) => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.target = '_blank';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleRegenerate = useCallback(
    async (image) => {
      if (!user?.id) return;
      setRegeneratingIds((prev) => new Set([...prev, image.image_id]));
      try {
        const result = await callEdgeFunction(
          {
            action: 'regenerate',
            userId: user.id,
            companyId: user.company_id || user.id,
            imageId: image.image_id,
            planId: image.plan_id,
            productEan: image.product_ean,
            shotNumber: image.shot_number,
          },
          'sync-studio-regenerate-shot'
        );

        // Update the image in local state
        setGeneratedImages((prev) =>
          prev.map((img) =>
            img.image_id === image.image_id
              ? { ...img, image_url: result.image_url || img.image_url, status: result.status || 'completed' }
              : img
          )
        );
        showToast('Image regenerated successfully', 'success');
      } catch (err) {
        console.error('Regenerate error:', err);
        showToast(`Failed to regenerate: ${err.message}`, 'error');
      } finally {
        setRegeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(image.image_id);
          return next;
        });
      }
    },
    [user, callEdgeFunction]
  );

  const handleDelete = useCallback(
    async (image) => {
      if (!confirm('Delete this generated image? This cannot be undone.')) return;
      setDeletingIds((prev) => new Set([...prev, image.image_id]));
      try {
        const { error: delErr } = await supabase
          .from('sync_studio_generated_images')
          .delete()
          .eq('image_id', image.image_id);
        if (delErr) throw new Error(delErr.message);
        setGeneratedImages((prev) => prev.filter((img) => img.image_id !== image.image_id));
        showToast('Image deleted', 'success');
      } catch (err) {
        console.error('Delete error:', err);
        showToast(`Failed to delete: ${err.message}`, 'error');
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(image.image_id);
          return next;
        });
      }
    },
    []
  );

  const handleExportZip = useCallback(async () => {
    if (!user?.id || !jobId) return;
    try {
      showToast('Export ZIP coming soon...', 'info');
      // Placeholder - will call edge function in Phase 7
      // await callEdgeFunction({ action: 'export', userId: user.id, jobId }, 'sync-studio-export-zip');
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    }
  }, [user, jobId]);

  const handlePublish = useCallback(async () => {
    if (!user?.id || !jobId) return;
    try {
      showToast('Publish to Bol.com coming soon...', 'info');
      // Placeholder - will call edge function in Phase 8
      // await callEdgeFunction({ action: 'publish', userId: user.id, jobId }, 'sync-studio-publish-bol');
    } catch (err) {
      showToast(`Publish failed: ${err.message}`, 'error');
    }
  }, [user, jobId]);

  // -------------------------------------------------------------------------
  // Render: No jobId guard
  // -------------------------------------------------------------------------

  if (!jobId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mx-auto mb-5">
            <Images className="w-7 h-7 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Results Found</h2>
          <p className="text-sm text-zinc-400 mb-6">
            No job ID was provided. Please start from the dashboard.
          </p>
          <button
            onClick={() => navigate('/SyncStudioDashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-all"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Loading State
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top bar skeleton */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
            <div className="flex gap-6">
              <div className="h-12 bg-zinc-800 rounded-xl w-32" />
              <div className="h-12 bg-zinc-800 rounded-xl w-32" />
              <div className="h-12 bg-zinc-800 rounded-xl w-32" />
              <div className="h-12 bg-zinc-800 rounded-xl w-32" />
            </div>
          </div>
          {/* Product card skeletons */}
          {[1, 2].map((i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6 animate-pulse">
              <div className="h-5 bg-zinc-800 rounded w-64 mb-6" />
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="aspect-square bg-zinc-800/60 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Error State
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 text-center max-w-md"
        >
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Failed to load results</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/SyncStudioDashboard')}
              className="px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-sm font-medium hover:bg-zinc-700/60 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Empty State
  // -------------------------------------------------------------------------

  if (!loading && generatedImages.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 text-center max-w-md"
        >
          <Images className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No images found</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {job?.status === 'processing'
              ? 'This job is still processing. Images will appear here once completed.'
              : 'No completed images were found for this job.'}
          </p>
          <button
            onClick={() => navigate('/SyncStudioDashboard')}
            className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-colors"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Results
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/SyncStudioDashboard')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* ----------------------------------------------------------------- */}
        {/* Top Summary Bar */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              {/* Total */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Images className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Total</p>
                  <p className="text-lg font-bold text-white">{jobStats?.total || 0}</p>
                </div>
              </div>

              {/* Completed */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Completed</p>
                  <p className="text-lg font-bold text-white">{jobStats?.completed || 0}</p>
                </div>
              </div>

              {/* Failed */}
              {(jobStats?.failed || 0) > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Failed</p>
                    <p className="text-lg font-bold text-white">{jobStats?.failed || 0}</p>
                  </div>
                </div>
              )}

              {/* Time taken */}
              {jobStats?.timeTaken > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Time</p>
                    <p className="text-lg font-bold text-white">{formatDuration(jobStats.timeTaken)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportZip}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-sm font-medium hover:bg-zinc-700/60 hover:border-zinc-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download All (ZIP)
              </button>
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-colors"
              >
                <Send className="w-4 h-4" />
                Publish to Bol.com
              </button>
            </div>
          </div>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* Product List */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {groupedByEan.map((group, idx) => (
              <motion.div
                key={group.ean}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-6"
              >
                {/* Product header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{group.title}</h3>
                      <p className="text-zinc-500 text-xs">EAN: {group.ean}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {group.generated.length} generated image{group.generated.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Images */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Original Images</p>
                    {group.existingImages.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {group.existingImages.map((url, i) => (
                          <div
                            key={i}
                            className="w-24 h-24 rounded-xl bg-zinc-800/60 border border-zinc-700/40 overflow-hidden flex-shrink-0"
                          >
                            <img
                              src={url}
                              alt={`Original ${i + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-zinc-600 text-xs italic">No original images</div>
                    )}
                  </div>

                  {/* Generated Images */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Generated Images</p>
                    <div className="flex flex-wrap gap-3">
                      {group.generated.map((img) => {
                        const isRegenerating = regeneratingIds.has(img.image_id);
                        const isDeleting = deletingIds.has(img.image_id);

                        return (
                          <div key={img.image_id} className="flex flex-col items-center gap-2">
                            {/* Thumbnail */}
                            <div className="relative w-24 h-24 rounded-xl bg-zinc-800/60 border border-zinc-700/40 overflow-hidden flex-shrink-0 group">
                              <img
                                src={img.image_url}
                                alt={`Shot ${img.shot_number}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {/* Regenerating overlay */}
                              {isRegenerating && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                                </div>
                              )}
                              {/* Deleting overlay */}
                              {isDeleting && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                                </div>
                              )}
                              {/* Shot number badge */}
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-zinc-300 font-medium">
                                #{img.shot_number}
                              </div>
                            </div>

                            {/* Per-image actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDownloadImage(img.image_url)}
                                disabled={isRegenerating || isDeleting}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Download"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRegenerate(img)}
                                disabled={isRegenerating || isDeleting}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Regenerate"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleDelete(img)}
                                disabled={isRegenerating || isDeleting}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
