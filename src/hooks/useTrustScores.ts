import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabaseClient';

interface TrustScore {
  action_category: string;
  current_level: number;
  max_level: number;
  accuracy_count: number;
  error_count: number;
  total_actions: number;
  accuracy_rate: number;
}

interface TrustUpdateResult {
  current_level: number;
  accuracy_count: number;
  error_count: number;
  total_actions: number;
  action: 'none' | 'graduated' | 'demoted';
  cap: number;
}

export function useTrustScores(userId: string | null) {
  const [scores, setScores] = useState<TrustScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_trust_scores', {
        p_user_id: userId,
      });
      if (error) throw error;
      setScores(data || []);
    } catch (err) {
      console.error('Failed to fetch trust scores:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const getTrustLevel = useCallback(
    (category: string): number => {
      const score = scores.find((s) => s.action_category === category);
      return score?.current_level ?? 1;
    },
    [scores]
  );

  const recordAction = useCallback(
    async (category: string, success: boolean, companyId: string): Promise<TrustUpdateResult | null> => {
      if (!userId) return null;
      try {
        const { data, error } = await supabase.rpc('update_trust_score', {
          p_user_id: userId,
          p_company_id: companyId,
          p_action_category: category,
          p_success: success,
        });
        if (error) throw error;
        await fetchScores();
        return data as TrustUpdateResult;
      } catch (err) {
        console.error('Failed to record trust action:', err);
        return null;
      }
    },
    [userId, fetchScores]
  );

  return { scores, loading, getTrustLevel, recordAction, refetch: fetchScores };
}
