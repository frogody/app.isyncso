import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook to fetch tracking data with Realtime subscription for live checkpoint updates.
 *
 * Accepts either:
 * - `orderId` — looks up shipping_task by b2b_order_id to find tracking_job_id
 * - `trackingJobId` — directly fetches the tracking job (used by warehouse)
 *
 * @param {{ orderId?: string, trackingJobId?: string }} params
 * @returns {{ trackingJob, checkpoints, isLoading, error, refetch }}
 */
export default function useTrackingData({ orderId, trackingJobId } = {}) {
  const [trackingJob, setTrackingJob] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!orderId && !trackingJobId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let jobId = trackingJobId;

      // If no direct trackingJobId, look it up via shipping_tasks
      if (!jobId && orderId) {
        const { data: shippingTask, error: stErr } = await supabase
          .from('shipping_tasks')
          .select('tracking_job_id')
          .eq('b2b_order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (stErr) throw stErr;
        jobId = shippingTask?.tracking_job_id;
      }

      if (!jobId) {
        setTrackingJob(null);
        setCheckpoints([]);
        setIsLoading(false);
        return;
      }

      // 2. Get tracking_jobs row
      const { data: job, error: jobErr } = await supabase
        .from('tracking_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobErr) throw jobErr;
      setTrackingJob(job);

      // 3. Get checkpoints sorted by time
      const { data: cps, error: cpErr } = await supabase
        .from('shipment_checkpoints')
        .select('*')
        .eq('tracking_job_id', jobId)
        .order('checkpoint_time', { ascending: true });

      if (cpErr) throw cpErr;
      setCheckpoints(cps || []);
    } catch (err) {
      setError(err.message || 'Failed to load tracking data');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, trackingJobId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for new checkpoints
  useEffect(() => {
    if (!trackingJob?.id) return;

    const channel = supabase
      .channel(`checkpoints:${trackingJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shipment_checkpoints',
          filter: `tracking_job_id=eq.${trackingJob.id}`,
        },
        (payload) => {
          setCheckpoints((prev) => {
            // Deduplicate
            if (prev.find((c) => c.id === payload.new.id)) return prev;
            // Insert sorted by checkpoint_time
            const next = [...prev, payload.new].sort(
              (a, b) => new Date(a.checkpoint_time) - new Date(b.checkpoint_time),
            );
            return next;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [trackingJob?.id]);

  return {
    trackingJob,
    checkpoints,
    isLoading,
    error,
    refetch: fetchData,
  };
}
