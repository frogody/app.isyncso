import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

// ─── Constants ───────────────────────────────────────────

export const DEFAULT_MESSAGE_TYPES = {
  linkedin_connection: {
    enabled: true,
    char_limit: 300,
    label: 'Connection Request',
    description: 'Short message sent with LinkedIn connection request',
    default_tone: 'professional',
    template_instructions: '',
  },
  linkedin_inmail: {
    enabled: true,
    char_limit: 1900,
    label: 'LinkedIn InMail',
    description: 'Direct message to non-connections via InMail credits',
    default_tone: 'professional',
    template_instructions: '',
  },
  linkedin_message: {
    enabled: true,
    char_limit: 8000,
    label: 'Post-Connection Message',
    description: 'Message after connection is accepted',
    default_tone: 'friendly',
    template_instructions: '',
  },
  email: {
    enabled: true,
    char_limit: 5000,
    label: 'Email',
    description: 'Direct email outreach',
    default_tone: 'professional',
    template_instructions: '',
  },
};

export const DEFAULT_DATA_POINT_PRIORITIES = {
  ma_activity: 80,
  layoffs: 100,
  promotion_gap: 60,
  career_trajectory: 40,
  company_instability: 80,
  compensation_gap: 60,
  tenure_anniversary: 40,
  skill_match: 100,
  lateral_opportunities: 50,
  timing_signals: 70,
  work_history: 60,
  education_match: 30,
};

export const DEFAULT_LINKEDIN_WORKFLOW = {
  auto_advance_on_mark_sent: true,
  show_profile_summary: true,
  connection_first_strategy: true,
  follow_up_days: [3, 7],
  daily_limit: 25,
  batch_size: 10,
};

export const DEFAULT_PREFERENCES = {
  message_types: { ...DEFAULT_MESSAGE_TYPES },
  default_tone: 'professional',
  default_language: 'en',
  formality: 'formal',
  data_point_priorities: { ...DEFAULT_DATA_POINT_PRIORITIES },
  custom_instructions: '',
  linkedin_workflow: { ...DEFAULT_LINKEDIN_WORKFLOW },
};

export const DATA_POINT_LABELS = {
  ma_activity: { label: 'M&A Activity', description: "Mergers, acquisitions, or divestitures at the candidate's company" },
  layoffs: { label: 'Layoffs / Restructuring', description: 'Recent or upcoming layoffs, downsizing, or organizational changes' },
  promotion_gap: { label: 'Promotion Gap', description: 'Time since last promotion — longer gaps suggest readiness to move' },
  career_trajectory: { label: 'Career Trajectory', description: "Growth vs plateau patterns in the candidate's career" },
  company_instability: { label: 'Company Instability', description: 'Combined signal from M&A, leadership changes, and market position' },
  compensation_gap: { label: 'Compensation Gap', description: 'Estimated gap between current comp and market rate for their role' },
  tenure_anniversary: { label: 'Tenure Anniversary', description: 'Key tenure milestones (2yr, 3yr, 5yr) when people commonly switch' },
  skill_match: { label: 'Skill Match', description: 'Alignment between candidate skills and the role requirements' },
  lateral_opportunities: { label: 'Lateral Opportunities', description: 'Relevant companies or roles the candidate might consider' },
  timing_signals: { label: 'Timing Signals', description: 'Seasonal patterns, budget cycles, or market timing indicators' },
  work_history: { label: 'Work History', description: 'Previous employers, career path, and industry experience' },
  education_match: { label: 'Education Match', description: 'Relevant degrees, certifications, or training' },
};

export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal business tone' },
  { value: 'casual', label: 'Casual', description: 'Relaxed but respectful' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'direct', label: 'Direct', description: 'Straightforward, no fluff' },
];

export const PRESET_CONFIGS = {
  aggressive: {
    label: 'Aggressive',
    description: 'Emphasizes urgency signals like layoffs, M&A, and company instability',
    priorities: {
      ma_activity: 100, layoffs: 100, company_instability: 100, promotion_gap: 80,
      timing_signals: 90, career_trajectory: 60, compensation_gap: 70, tenure_anniversary: 50,
      skill_match: 80, lateral_opportunities: 40, work_history: 30, education_match: 20,
    },
  },
  relationship: {
    label: 'Relationship Builder',
    description: 'Focuses on career growth, skill match, and mutual value',
    priorities: {
      skill_match: 100, career_trajectory: 100, work_history: 90, education_match: 70,
      lateral_opportunities: 80, compensation_gap: 50, timing_signals: 40, promotion_gap: 40,
      ma_activity: 30, layoffs: 20, company_instability: 20, tenure_anniversary: 30,
    },
  },
  balanced: {
    label: 'Balanced',
    description: 'Even mix of urgency and relationship signals',
    priorities: { ...DEFAULT_DATA_POINT_PRIORITIES },
  },
};

// ─── Hook ────────────────────────────────────────────────

export function useOutreachPreferences(organizationId, campaignId) {
  const { user } = useUser();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(null);

  const orgId = organizationId || user?.organization_id;

  const fetchPreferences = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      // Try campaign-specific first
      let data = null;
      if (campaignId) {
        const { data: campaignPrefs, error } = await supabase
          .from('outreach_preferences')
          .select('*')
          .eq('organization_id', orgId)
          .eq('campaign_id', campaignId)
          .eq('is_active', true)
          .maybeSingle();
        if (error) throw error;
        data = campaignPrefs;
      }

      // Fall back to org-wide defaults
      if (!data) {
        const { data: orgPrefs, error } = await supabase
          .from('outreach_preferences')
          .select('*')
          .eq('organization_id', orgId)
          .is('campaign_id', null)
          .eq('is_active', true)
          .maybeSingle();
        if (error) throw error;
        data = orgPrefs;
      }

      if (data) {
        setRecordId(data.id);
        setPreferences({
          message_types: { ...DEFAULT_MESSAGE_TYPES, ...(data.message_types || {}) },
          default_tone: data.default_tone || 'professional',
          default_language: data.default_language || 'en',
          formality: data.formality || 'formal',
          data_point_priorities: { ...DEFAULT_DATA_POINT_PRIORITIES, ...(data.data_point_priorities || {}) },
          custom_instructions: data.custom_instructions || '',
          linkedin_workflow: { ...DEFAULT_LINKEDIN_WORKFLOW, ...(data.linkedin_workflow || {}) },
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
        setRecordId(null);
      }
    } catch (err) {
      console.error('Failed to load outreach preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, campaignId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = async (updates) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const merged = { ...preferences, ...updates };
      const payload = {
        organization_id: orgId,
        campaign_id: campaignId || null,
        message_types: merged.message_types,
        default_tone: merged.default_tone,
        default_language: merged.default_language,
        formality: merged.formality,
        data_point_priorities: merged.data_point_priorities,
        custom_instructions: merged.custom_instructions,
        linkedin_workflow: merged.linkedin_workflow,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (recordId) {
        const { error } = await supabase
          .from('outreach_preferences')
          .update(payload)
          .eq('id', recordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('outreach_preferences')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setRecordId(data.id);
      }

      setPreferences(merged);
    } catch (err) {
      console.error('Failed to save outreach preferences:', err);
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
