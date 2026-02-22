import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook to fetch credit action costs from the credit_action_costs table.
 * Provides a map of action_key -> cost details for displaying credit costs in the UI.
 */
export function useActionCosts() {
  const [costs, setCosts] = useState({});
  const [costsList, setCostsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_action_costs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('[useActionCosts] Table may not exist yet:', error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const costMap = {};
      data.forEach(item => {
        costMap[item.action_key] = item;
      });
      setCosts(costMap);
      setCostsList(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  /**
   * Get the credit cost for a specific action.
   * Returns { credits_required, label, is_per_unit, unit_label } or null.
   */
  const getCost = useCallback((actionKey) => {
    return costs[actionKey] || null;
  }, [costs]);

  /**
   * Get grouped costs by category.
   */
  const costsByCategory = useCallback(() => {
    const grouped = {};
    costsList.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [costsList]);

  return { costs, costsList, loading, getCost, costsByCategory, refetch: fetchCosts };
}
