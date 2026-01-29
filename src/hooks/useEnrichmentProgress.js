import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useEnrichmentProgress(organizationId) {
  const [hasActiveQueue, setHasActiveQueue] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!organizationId) return;

    const checkActiveQueue = async () => {
      const { count } = await supabase
        .from('sync_intel_queue')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'processing']);

      const isActive = (count || 0) > 0;
      setHasActiveQueue(isActive);
      if (isActive) setShowProgress(true);
    };

    checkActiveQueue();

    const channel = supabase
      .channel(`queue-check-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sync_intel_queue',
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        checkActiveQueue();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [organizationId]);

  return {
    hasActiveQueue,
    showProgress,
    setShowProgress,
    dismissProgress: () => setShowProgress(false),
  };
}
