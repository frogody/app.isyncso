import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2, Zap, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnrichmentProgress({ organizationId, onComplete }) {
  const [stats, setStats] = useState(null); // { pending, processing, completed, failed, total }
  const [expanded, setExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const prevPendingRef = useRef(null);
  const pollRef = useRef(null);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    const { data, error } = await supabase
      .from('sync_intel_queue')
      .select('status')
      .eq('organization_id', organizationId);

    if (error || !data) return;

    const counts = { pending: 0, processing: 0, completed: 0, failed: 0, total: data.length };
    data.forEach(item => {
      if (counts[item.status] !== undefined) counts[item.status]++;
    });

    setStats(counts);

    const hasActive = counts.pending > 0 || counts.processing > 0;
    setIsActive(hasActive);

    // If just finished (was active, now all done), call onComplete
    if (prevPendingRef.current > 0 && counts.pending === 0 && counts.processing === 0) {
      onComplete?.();
    }
    prevPendingRef.current = counts.pending + counts.processing;
  }, [organizationId, onComplete]);

  // Poll while active
  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchStats]);

  // Trigger processor if stuck
  const triggerProcessor = async () => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-sync-intel-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ triggered_by: 'manual_retry' }),
      });
    } catch {}
  };

  if (!stats || stats.total === 0) return null;

  const done = stats.completed + stats.failed;
  const pct = stats.total > 0 ? Math.round((done / stats.total) * 100) : 0;
  const allDone = stats.pending === 0 && stats.processing === 0;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-red-500/20 text-red-400'
            : allDone && stats.total > 0
              ? 'bg-green-500/20 text-green-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
      >
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : allDone ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {isActive && (
          <span className="text-xs font-medium tabular-nums">
            {done}/{stats.total}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-72 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Enrichment Progress</span>
                <span className="text-xs text-zinc-400 tabular-nums">{pct}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${allDone ? 'bg-green-500' : 'bg-red-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <div className="w-2 h-2 rounded-full bg-zinc-500" />
                  Pending: {stats.pending}
                </div>
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  Processing: {stats.processing}
                </div>
                <div className="flex items-center gap-1.5 text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Complete: {stats.completed}
                </div>
                {stats.failed > 0 && (
                  <div className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-3 h-3" />
                    Failed: {stats.failed}
                  </div>
                )}
              </div>

              {/* Stages */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                <span>LinkedIn</span>
                <span>→</span>
                <span>Company</span>
                <span>→</span>
                <span>Intel</span>
              </div>

              {/* Retry button if stuck */}
              {stats.pending > 0 && stats.processing === 0 && (
                <button
                  onClick={triggerProcessor}
                  className="w-full text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg py-1.5 transition-colors"
                >
                  Restart Processing
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
