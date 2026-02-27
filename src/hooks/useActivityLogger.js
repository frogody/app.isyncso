import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/components/sync/supabaseSync';

/**
 * Batched activity logger hook.
 * Auto-logs page_view events. Exposes logAction() for manual tracking.
 * Batches writes every 5 seconds. Silent failure — never breaks the app.
 */
export function useActivityLogger(userId, companyId) {
  const bufferRef = useRef([]);
  const timerRef = useRef(null);

  const flush = useCallback(async () => {
    if (!userId || bufferRef.current.length === 0) return;

    const events = [...bufferRef.current];
    bufferRef.current = [];

    try {
      await supabase.from('user_activity_log').insert(events);
    } catch (err) {
      // Silent failure — never break the app
      console.warn('[ActivityLogger] flush failed:', err.message);
    }
  }, [userId]);

  // Flush every 5 seconds
  useEffect(() => {
    timerRef.current = setInterval(flush, 5000);
    return () => {
      clearInterval(timerRef.current);
      flush(); // Flush remaining on unmount
    };
  }, [flush]);

  const logAction = useCallback((eventType, eventName, pagePath, metadata = {}) => {
    if (!userId) return;

    bufferRef.current.push({
      user_id: userId,
      company_id: companyId || null,
      event_type: eventType,
      event_name: eventName,
      page_path: pagePath || window.location.pathname,
      metadata,
      created_at: new Date().toISOString()
    });
  }, [userId, companyId]);

  const logPageView = useCallback((pageName, path) => {
    logAction('page_view', `viewed_${pageName.toLowerCase().replace(/\s+/g, '_')}`, path || window.location.pathname);
  }, [logAction]);

  return { logAction, logPageView, flush };
}
