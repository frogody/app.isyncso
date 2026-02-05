import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook for tracking and managing AI usage costs
 */
export function useAIUsage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState({
    monthlyUsed: 0,
    dailyUsed: 0,
    monthlyLimit: 50,
    dailyLimit: 5,
    allowedTiers: ['economy', 'standard'],
  });

  // Load usage data
  const loadUsage = useCallback(async () => {
    if (!user?.company_id) return;

    setLoading(true);
    try {
      // Get limits
      const { data: limits } = await supabase
        .from('ai_usage_limits')
        .select('*')
        .eq('company_id', user.company_id)
        .single();

      // Calculate start of month and today
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Get monthly usage
      const { data: monthlyData } = await supabase
        .from('ai_usage_log')
        .select('cost_usd')
        .eq('company_id', user.company_id)
        .gte('created_at', startOfMonth);

      // Get daily usage
      const { data: dailyData } = await supabase
        .from('ai_usage_log')
        .select('cost_usd')
        .eq('company_id', user.company_id)
        .gte('created_at', startOfDay);

      const monthlyUsed = monthlyData?.reduce((sum, r) => sum + (parseFloat(r.cost_usd) || 0), 0) || 0;
      const dailyUsed = dailyData?.reduce((sum, r) => sum + (parseFloat(r.cost_usd) || 0), 0) || 0;

      setUsage({
        monthlyUsed,
        dailyUsed,
        monthlyLimit: limits?.monthly_limit_usd || 50,
        dailyLimit: limits?.daily_limit_usd || 5,
        perGenerationLimit: limits?.per_generation_limit_usd || 0.10,
        allowedTiers: limits?.allowed_tiers || ['economy', 'standard'],
      });
    } catch (error) {
      console.error('Error loading AI usage:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  /**
   * Check if a generation with the given cost is allowed
   */
  const checkLimit = useCallback((estimatedCost) => {
    const canGenerate =
      usage.monthlyUsed + estimatedCost <= usage.monthlyLimit &&
      usage.dailyUsed + estimatedCost <= usage.dailyLimit &&
      estimatedCost <= usage.perGenerationLimit;

    return {
      canGenerate,
      monthlyUsed: usage.monthlyUsed,
      monthlyLimit: usage.monthlyLimit,
      dailyUsed: usage.dailyUsed,
      dailyLimit: usage.dailyLimit,
      monthlyRemaining: usage.monthlyLimit - usage.monthlyUsed,
      dailyRemaining: usage.dailyLimit - usage.dailyUsed,
      reason: !canGenerate
        ? usage.monthlyUsed + estimatedCost > usage.monthlyLimit
          ? 'Monthly limit exceeded'
          : usage.dailyUsed + estimatedCost > usage.dailyLimit
            ? 'Daily limit exceeded'
            : 'Cost exceeds per-generation limit'
        : null,
    };
  }, [usage]);

  /**
   * Check if a tier is allowed
   */
  const isTierAllowed = useCallback((tier) => {
    return usage.allowedTiers.includes(tier);
  }, [usage.allowedTiers]);

  /**
   * Get usage stats formatted for display
   */
  const getDisplayStats = useCallback(() => {
    const monthlyPercent = (usage.monthlyUsed / usage.monthlyLimit) * 100;
    const dailyPercent = (usage.dailyUsed / usage.dailyLimit) * 100;

    return {
      monthly: {
        used: `\u20AC${usage.monthlyUsed.toFixed(2)}`,
        limit: `\u20AC${usage.monthlyLimit.toFixed(2)}`,
        remaining: `\u20AC${(usage.monthlyLimit - usage.monthlyUsed).toFixed(2)}`,
        percent: monthlyPercent,
        status: monthlyPercent >= 90 ? 'critical' : monthlyPercent >= 70 ? 'warning' : 'ok',
      },
      daily: {
        used: `\u20AC${usage.dailyUsed.toFixed(2)}`,
        limit: `\u20AC${usage.dailyLimit.toFixed(2)}`,
        remaining: `\u20AC${(usage.dailyLimit - usage.dailyUsed).toFixed(2)}`,
        percent: dailyPercent,
        status: dailyPercent >= 90 ? 'critical' : dailyPercent >= 70 ? 'warning' : 'ok',
      },
    };
  }, [usage]);

  return {
    loading,
    usage,
    checkLimit,
    isTierAllowed,
    getDisplayStats,
    refresh: loadUsage,
  };
}

export default useAIUsage;
