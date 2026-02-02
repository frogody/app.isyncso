import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

export const DEFAULT_SIGNAL_WEIGHTS = {
  career_stagnation: 15,
  company_instability: 20,
  job_hopping: 10,
  career_trajectory: 15,
  compensation_gaps: 10,
  timing_signals: 15,
  ma_activity: 15,
  layoffs: 20,
  leadership_change: 10,
  recent_promotion: -5,
  tenure_anniversary: 10,
  high_flight_risk: 20,
};

export const SIGNAL_DEFINITIONS = [
  { key: 'career_stagnation', label: 'Career Stagnation', description: 'No promotion in 3+ years', category: 'career', icon: 'TrendingUp' },
  { key: 'company_instability', label: 'Company Instability', description: 'M&A, restructuring, leadership changes', category: 'company', icon: 'AlertTriangle' },
  { key: 'job_hopping', label: 'Job Hopping Pattern', description: 'Frequent company changes (open to moves)', category: 'career', icon: 'ArrowUpRight' },
  { key: 'career_trajectory', label: 'Career Trajectory', description: 'Growth phase vs plateau detection', category: 'career', icon: 'Target' },
  { key: 'compensation_gaps', label: 'Compensation Gaps', description: 'Below market rate for role/experience', category: 'career', icon: 'Euro' },
  { key: 'timing_signals', label: 'Timing Signals', description: 'Work anniversaries, seasonal patterns', category: 'timing', icon: 'Calendar' },
  { key: 'ma_activity', label: 'M&A Activity', description: 'Mergers, acquisitions at employer', category: 'company', icon: 'Network' },
  { key: 'layoffs', label: 'Layoffs / Restructuring', description: 'Layoffs or downsizing at employer', category: 'company', icon: 'AlertTriangle' },
  { key: 'leadership_change', label: 'Leadership Change', description: 'New CEO/CTO/management at employer', category: 'company', icon: 'Users' },
  { key: 'recent_promotion', label: 'Recent Promotion', description: 'Recently promoted (less likely to move)', category: 'career', icon: 'Award' },
  { key: 'tenure_anniversary', label: 'Tenure Anniversary', description: 'At 2/3/5 year mark (common move points)', category: 'timing', icon: 'Calendar' },
  { key: 'high_flight_risk', label: 'High Flight Risk', description: 'Multiple strong signals converging', category: 'timing', icon: 'Zap' },
];

export const WEIGHT_PRESETS = {
  balanced: {
    name: 'Balanced',
    description: 'Equal emphasis across all signals',
    weights: { ...DEFAULT_SIGNAL_WEIGHTS },
  },
  urgency_focused: {
    name: 'Urgency Focused',
    description: 'Prioritize candidates ready to move now',
    weights: {
      ...DEFAULT_SIGNAL_WEIGHTS,
      company_instability: 30,
      layoffs: 30,
      high_flight_risk: 30,
      timing_signals: 25,
      career_stagnation: 20,
      recent_promotion: -10,
    },
  },
  stability_focused: {
    name: 'Stability Focused',
    description: 'Target long-tenure candidates at stable companies',
    weights: {
      ...DEFAULT_SIGNAL_WEIGHTS,
      career_stagnation: 25,
      compensation_gaps: 20,
      career_trajectory: 20,
      company_instability: 5,
      layoffs: 5,
      job_hopping: 5,
    },
  },
};

export const DEFAULT_TIMING_PREFERENCES = {
  anniversary_boost: true,
  ignore_recent_promotions: true,
  ignore_recent_promotions_months: 6,
  q1_q4_seasonal_boost: false,
};

const DEFAULT_PREFERENCES = {
  custom_signals: [],
  signal_weights: { ...DEFAULT_SIGNAL_WEIGHTS },
  industry_context: '',
  role_context: '',
  company_rules: [],
  timing_preferences: { ...DEFAULT_TIMING_PREFERENCES },
};

export function useIntelligencePreferences() {
  const { user } = useUser();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);

  const organizationId = user?.organization_id;

  const fetchPreferences = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('intelligence_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .is('user_id', null)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRecordId(data.id);
        setPreferences({
          custom_signals: data.custom_signals || [],
          signal_weights: { ...DEFAULT_SIGNAL_WEIGHTS, ...(data.signal_weights || {}) },
          industry_context: data.industry_context || '',
          role_context: data.role_context || '',
          company_rules: data.company_rules || [],
          timing_preferences: { ...DEFAULT_TIMING_PREFERENCES, ...(data.timing_preferences || {}) },
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
        setRecordId(null);
      }
    } catch (err) {
      console.error('Failed to load intelligence preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = async (newPrefs) => {
    if (!organizationId) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        user_id: null,
        custom_signals: newPrefs.custom_signals,
        signal_weights: newPrefs.signal_weights,
        industry_context: newPrefs.industry_context || null,
        role_context: newPrefs.role_context || null,
        company_rules: newPrefs.company_rules,
        timing_preferences: newPrefs.timing_preferences,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (recordId) {
        const { error } = await supabase
          .from('intelligence_preferences')
          .update(payload)
          .eq('id', recordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('intelligence_preferences')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setRecordId(data.id);
      }

      setPreferences(newPrefs);
    } catch (err) {
      console.error('Failed to save intelligence preferences:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    return savePreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    loading,
    saving,
    savePreferences,
    resetToDefaults,
    refetch: fetchPreferences,
  };
}
