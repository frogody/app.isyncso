import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * SemanticContextProvider — Phase 3.1
 *
 * Fetches semantic intelligence data from the semantic-context-api edge function
 * and makes it available throughout the app via useSemanticContext() hook.
 *
 * Data includes:
 * - active_threads: Current work threads from desktop pipeline
 * - recent_entities: People, orgs, projects recently seen
 * - activity_summary: Activity type distribution
 * - current_intent: Detected user intent (SHIP, MANAGE, PLAN, etc.)
 * - behavioral_baseline: Work pattern baselines
 * - trust_levels: Autonomy levels per action category
 */

const SemanticContext = createContext(null);

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';

export function SemanticContextProvider({ children }) {
  const [semanticData, setSemanticData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const intervalRef = useRef(null);
  const userRef = useRef(null);

  const fetchSemanticContext = useCallback(async (userId, companyId) => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/semantic-context-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          company_id: companyId,
          window_minutes: 120,
        }),
      });

      if (!response.ok) {
        throw new Error(`semantic-context-api returned ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.context) {
        setSemanticData(result.context);
        setLastFetched(new Date());
      }
    } catch (err) {
      console.warn('[SemanticContext] Fetch failed:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user and start polling
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Get company_id from users table
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!mounted) return;

      userRef.current = { id: user.id, companyId: userData?.company_id };

      // Initial fetch
      fetchSemanticContext(user.id, userData?.company_id);

      // Poll every 5 minutes
      intervalRef.current = setInterval(() => {
        if (userRef.current) {
          fetchSemanticContext(userRef.current.id, userRef.current.companyId);
        }
      }, POLL_INTERVAL_MS);
    }

    init();

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSemanticContext]);

  const refresh = useCallback(() => {
    if (userRef.current) {
      fetchSemanticContext(userRef.current.id, userRef.current.companyId);
    }
  }, [fetchSemanticContext]);

  const value = useMemo(() => ({
    // Full semantic data object
    data: semanticData,

    // Convenience accessors
    activeThreads: semanticData?.active_threads || [],
    recentEntities: semanticData?.recent_entities || [],
    activitySummary: semanticData?.activity_summary || null,
    currentIntent: semanticData?.current_intent || null,
    behavioralBaseline: semanticData?.behavioral_baseline || null,
    trustLevels: semanticData?.trust_levels || [],

    // State
    isLoading,
    error,
    lastFetched,
    hasData: !!semanticData && (
      (semanticData.active_threads?.length > 0) ||
      (semanticData.recent_entities?.length > 0) ||
      (semanticData.activity_summary?.total_activities > 0)
    ),

    // Actions
    refresh,
  }), [semanticData, isLoading, error, lastFetched, refresh]);

  return (
    <SemanticContext.Provider value={value}>
      {children}
    </SemanticContext.Provider>
  );
}

export function useSemanticContext() {
  const context = useContext(SemanticContext);
  if (!context) {
    // Return safe defaults when used outside provider (graceful degradation)
    return {
      data: null,
      activeThreads: [],
      recentEntities: [],
      activitySummary: null,
      currentIntent: null,
      behavioralBaseline: null,
      trustLevels: [],
      isLoading: false,
      error: null,
      lastFetched: null,
      hasData: false,
      refresh: () => {},
    };
  }
  return context;
}
