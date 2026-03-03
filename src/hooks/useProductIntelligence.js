import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook for a single product's health score.
 */
export function useProductHealth(productId, companyId) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!productId || !companyId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('product_health_scores')
        .select('*')
        .eq('product_id', productId)
        .eq('company_id', companyId)
        .single();

      if (err && err.code !== 'PGRST116') throw err;
      setHealth(data || null);
    } catch (err) {
      console.error('useProductHealth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productId, companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { health, loading, error, refresh: fetch };
}

/**
 * Hook for all product health scores for a company (dashboard).
 */
export function useProductHealthList(companyId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    supabase
      .from('product_health_scores')
      .select(`
        *,
        products:product_id (id, name, type, status, featured_image)
      `)
      .eq('company_id', companyId)
      .order('overall_score', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setScores(data);
        setLoading(false);
      });
  }, [companyId]);

  const thriving = scores.filter(s => s.health_level === 'thriving');
  const healthy = scores.filter(s => s.health_level === 'healthy');
  const watch = scores.filter(s => s.health_level === 'watch');
  const atRisk = scores.filter(s => s.health_level === 'at_risk');
  const critical = scores.filter(s => s.health_level === 'critical');

  return { scores, thriving, healthy, watch, atRisk, critical, loading };
}

/**
 * Hook for product margin data.
 */
export function useProductMargins(productId, companyId) {
  const [margins, setMargins] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !companyId) return;
    setLoading(true);

    supabase
      .from('product_margins')
      .select('*')
      .eq('product_id', productId)
      .eq('company_id', companyId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setMargins(data);
        setLoading(false);
      });
  }, [productId, companyId]);

  return { margins, loading };
}

/**
 * Hook for unacknowledged margin alerts.
 */
export function useMarginAlerts(companyId) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('margin_alerts')
      .select(`
        *,
        products:product_id (id, name)
      `)
      .eq('company_id', companyId)
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) setAlerts(data);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const acknowledge = async (alertId) => {
    await supabase
      .from('margin_alerts')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  return { alerts, loading, acknowledge, refresh: fetchAlerts };
}

/**
 * Trigger compute functions via edge function.
 */
export function useComputeProductIntelligence(companyId) {
  const [computing, setComputing] = useState(false);

  const compute = useCallback(async (action = 'compute_health') => {
    if (!companyId) return;
    setComputing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-intelligence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action, company_id: companyId }),
        }
      );
      return await response.json();
    } catch (err) {
      console.error('Compute error:', err);
      return { error: err.message };
    } finally {
      setComputing(false);
    }
  }, [companyId]);

  return { compute, computing };
}
