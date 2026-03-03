import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook for fetching and computing client health scores.
 *
 * Usage:
 *   const { score, loading, refresh } = useClientHealth(prospectId, companyId);
 *   const { atRiskClients, loading } = useClientHealthList(companyId);
 */

// Single prospect health score
export function useClientHealth(prospectId, companyId) {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!prospectId || !companyId) return;
    setLoading(true);
    setError(null);

    try {
      // Check for cached score first
      const { data: cached } = await supabase
        .from('client_health_scores')
        .select('*')
        .eq('prospect_id', prospectId)
        .single();

      if (cached) {
        setScore(cached);

        // Recompute if stale (older than 24h)
        const age = Date.now() - new Date(cached.computed_at).getTime();
        if (age > 24 * 60 * 60 * 1000) {
          // Background refresh
          supabase.rpc('compute_client_health', {
            p_prospect_id: prospectId,
            p_company_id: companyId,
          }).then(({ data }) => {
            if (data && !data.error) {
              setScore(prev => ({
                ...prev,
                overall_score: data.overall_score,
                risk_level: data.risk_level,
                trend: data.trend,
                components: data.components,
                computed_at: new Date().toISOString(),
              }));
            }
          });
        }
      } else {
        // Compute fresh
        const { data, error: rpcErr } = await supabase.rpc('compute_client_health', {
          p_prospect_id: prospectId,
          p_company_id: companyId,
        });
        if (rpcErr) throw rpcErr;
        if (data && !data.error) {
          setScore({
            prospect_id: prospectId,
            overall_score: data.overall_score,
            risk_level: data.risk_level,
            trend: data.trend,
            components: data.components,
            computed_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('useClientHealth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [prospectId, companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { score, loading, error, refresh: fetch };
}

// List of all health scores for a company (for dashboard widget)
export function useClientHealthList(companyId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    supabase
      .from('client_health_scores')
      .select(`
        *,
        prospects:prospect_id (
          id, first_name, last_name, company, email,
          stage, contact_type, organization_id
        )
      `)
      .eq('company_id', companyId)
      .order('overall_score', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setScores(data);
        }
        setLoading(false);
      });
  }, [companyId]);

  const atRiskClients = scores.filter(s => s.risk_level === 'at_risk' || s.risk_level === 'critical');
  const watchClients = scores.filter(s => s.risk_level === 'watch');
  const healthyClients = scores.filter(s => s.risk_level === 'healthy');

  return { scores, atRiskClients, watchClients, healthyClients, loading };
}
