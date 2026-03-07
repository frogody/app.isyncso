/**
 * useSchedulingRecommendations — Hook for fetching and auto-refreshing
 * scheduling recommendations from the scheduling_recommendations table.
 * Triggers edge function refresh if data is expired (>7 days) or missing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

export function useSchedulingRecommendations() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const refreshingRef = useRef(false);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch from table
      const { data, error: fetchError } = await supabase
        .from('scheduling_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is okay
        throw fetchError;
      }

      if (data) {
        const isExpired = new Date(data.expires_at) < new Date();
        if (isExpired && !refreshingRef.current) {
          // Trigger refresh in background
          refreshingRef.current = true;
          triggerRefresh(user.id).finally(() => {
            refreshingRef.current = false;
          });
        }
        setRecommendations(data.recommendations);
        setGeneratedAt(data.generated_at);
      } else {
        // No data at all, trigger generation
        if (!refreshingRef.current) {
          refreshingRef.current = true;
          triggerRefresh(user.id).finally(() => {
            refreshingRef.current = false;
          });
        }
      }
    } catch (err) {
      console.warn('[useSchedulingRecommendations] Error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerRefresh = useCallback(async (userId) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/scheduling-recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Edge function returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.recommendations) {
        setRecommendations(result.recommendations);
        setGeneratedAt(result.generated_at);
      }
    } catch (err) {
      console.warn('[useSchedulingRecommendations] Refresh failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await triggerRefresh(data.user.id);
      }
    } catch (err) {
      console.warn('[useSchedulingRecommendations] Refresh failed:', err.message);
    }
  }, [triggerRefresh]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, loading, error, refresh, generatedAt };
}
