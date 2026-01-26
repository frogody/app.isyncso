/**
 * Intelligence Queue Widget
 * Shows the status of intelligence processing across all candidates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

const IntelligenceQueueWidget = ({ organizationId }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    ready: 0,
    failed: 0,
  });
  const [processingCandidates, setProcessingCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    try {
      // Fetch all candidates with their intelligence status
      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('id, first_name, last_name, job_title, current_title, intelligence_status, intelligence_generated, intelligence_score, updated_at')
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Calculate stats
      const total = candidates?.length || 0;
      let pending = 0;
      let processing = 0;
      let ready = 0;
      let failed = 0;

      const processingList = [];

      (candidates || []).forEach(c => {
        const hasIntel = c.intelligence_generated || c.intelligence_score > 0;

        if (c.intelligence_status === 'processing') {
          processing++;
          if (processingList.length < 3) {
            processingList.push({
              id: c.id,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
              title: c.current_title || c.job_title || 'No title',
            });
          }
        } else if (c.intelligence_status === 'failed') {
          failed++;
        } else if (hasIntel || c.intelligence_status === 'completed' || c.intelligence_status === 'ready') {
          ready++;
        } else {
          pending++;
        }
      });

      setStats({ total, pending, processing, ready, failed });
      setProcessingCandidates(processingList);
    } catch (error) {
      console.error('Error fetching intelligence stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up real-time subscription
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('intel-queue')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidates',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          // Refresh on intelligence status changes
          if (payload.new?.intelligence_status !== payload.old?.intelligence_status) {
            fetchStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      // Reset failed candidates to pending
      const { error } = await supabase
        .from('candidates')
        .update({ intelligence_status: 'pending' })
        .eq('organization_id', organizationId)
        .eq('intelligence_status', 'failed');

      if (error) throw error;

      toast.success('Failed candidates queued for retry');
      fetchStats();
    } catch (error) {
      console.error('Error retrying failed:', error);
      toast.error('Failed to retry');
    } finally {
      setRetrying(false);
    }
  };

  // Calculate progress percentage
  const progressPercent = stats.total > 0
    ? Math.round((stats.ready / stats.total) * 100)
    : 0;

  // Estimate remaining time (rough estimate: ~30 sec per candidate)
  const remainingCount = stats.pending + stats.processing;
  const estimatedMinutes = Math.ceil((remainingCount * 30) / 60);

  if (loading) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/20 border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              {stats.processing > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Intelligence Queue</h3>
              <p className="text-xs text-zinc-500">AI candidate analysis</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {stats.total === 0 ? (
          <div className="py-6 text-center">
            <Brain className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">No candidates yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Import candidates to start generating intelligence
            </p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">
                  {progressPercent}% complete
                </span>
                {remainingCount > 0 && (
                  <span className="text-xs text-zinc-500">
                    ~{estimatedMinutes} min remaining
                  </span>
                )}
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-lg bg-zinc-800/50">
                <div className="text-lg font-bold text-white">{stats.total}</div>
                <div className="text-xs text-zinc-500">Total</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-zinc-800/50">
                <div className="text-lg font-bold text-yellow-400 flex items-center justify-center gap-1">
                  {stats.processing > 0 && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {stats.processing}
                </div>
                <div className="text-xs text-zinc-500">Processing</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-zinc-800/50">
                <div className="text-lg font-bold text-green-400">{stats.ready}</div>
                <div className="text-xs text-zinc-500">Ready</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-zinc-800/50">
                <div className="text-lg font-bold text-zinc-500">{stats.pending}</div>
                <div className="text-xs text-zinc-500">Pending</div>
              </div>
            </div>

            {/* Processing Now */}
            {stats.processing > 0 && processingCandidates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  Processing now:
                </div>
                <div className="space-y-1">
                  {processingCandidates.map((candidate, index) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/30"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{candidate.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{candidate.title}</p>
                      </div>
                      <Loader2 className="w-3 h-3 text-yellow-400 animate-spin flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Alert */}
            {stats.failed > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">
                    {stats.failed} failed
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRetryFailed}
                  disabled={retrying}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                >
                  {retrying ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Retry
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {stats.total > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
          <button
            onClick={() => navigate('/talent/candidates?filter=pending_intel')}
            className="text-xs text-zinc-500 hover:text-purple-400 transition-colors flex items-center gap-1 w-full justify-center"
          >
            View All Candidates
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default IntelligenceQueueWidget;
