/**
 * useFeatureUsage Hook
 * Tracks feature/page usage for adaptive UI personalization
 * Phase 4 - A-6: Predictive UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

// Debounce buffer: collect feature keys and flush every 5 seconds
const pendingTracks = new Map(); // featureKey -> timestamp
let flushTimer = null;

async function flushPendingTracks(userId, companyId) {
  if (pendingTracks.size === 0) return;

  const keys = [...pendingTracks.keys()];
  pendingTracks.clear();

  for (const featureKey of keys) {
    try {
      // Try upsert — increment usage_count on conflict
      const { error } = await supabase.rpc('upsert_feature_usage', {
        p_user_id: userId,
        p_company_id: companyId,
        p_feature_key: featureKey,
      });

      // If RPC doesn't exist, fall back to manual upsert
      if (error) {
        const { data: existing } = await supabase
          .from('user_feature_usage')
          .select('id, usage_count')
          .eq('user_id', userId)
          .eq('feature_key', featureKey)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_feature_usage')
            .update({
              usage_count: existing.usage_count + 1,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('user_feature_usage')
            .insert({
              user_id: userId,
              company_id: companyId,
              feature_key: featureKey,
              usage_count: 1,
              last_used_at: new Date().toISOString(),
            });
        }
      }
    } catch (e) {
      console.error(`[useFeatureUsage] Failed to track ${featureKey}:`, e);
    }
  }
}

/**
 * Track a feature usage event (debounced — batches over 5 seconds)
 */
export function trackFeature(featureKey, userId, companyId) {
  if (!featureKey || !userId) return;

  // Deduplicate: don't track same key twice within the same flush window
  if (pendingTracks.has(featureKey)) return;
  pendingTracks.set(featureKey, Date.now());

  // Schedule flush
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushPendingTracks(userId, companyId);
  }, 5000);
}

/**
 * Hook to get top features for the current user
 */
export function useTopFeatures(limit = 10) {
  const { user } = useUser();
  const [topFeatures, setTopFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchTopFeatures = async () => {
      try {
        const { data, error } = await supabase
          .from('user_feature_usage')
          .select('feature_key, usage_count, last_used_at')
          .eq('user_id', user.id)
          .order('usage_count', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('[useFeatureUsage] Failed to fetch top features:', error);
        } else {
          setTopFeatures(data || []);
        }
      } catch (e) {
        console.error('[useFeatureUsage] Error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTopFeatures();
  }, [user?.id, limit]);

  return { topFeatures, loading };
}

/**
 * Hook that provides trackFeature bound to the current user
 */
export function useFeatureUsage() {
  const { user } = useUser();

  const track = useCallback(
    (featureKey) => {
      if (user?.id) {
        trackFeature(featureKey, user.id, user.company_id);
      }
    },
    [user?.id, user?.company_id]
  );

  return { trackFeature: track };
}

export default useFeatureUsage;
