import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

// Default panel configuration - all sections enabled by default
export const DEFAULT_PANEL_CONFIG = {
  profile: {
    enabled: true,
    sections: {
      analysis_cards: { enabled: true, order: 0, label: "Analysis Cards" },
      contact_info: { enabled: true, order: 1, label: "Contact Information" },
      professional_summary: { enabled: true, order: 2, label: "Professional Summary" },
      skills: { enabled: true, order: 3, label: "Skills" },
      experience: { enabled: true, order: 4, label: "Experience" },
      education: { enabled: true, order: 5, label: "Education" },
      additional_info: { enabled: true, order: 6, label: "Additional Information" }
    }
  },
  intelligence: {
    enabled: true,
    sections: {
      flight_risk_score: { enabled: true, order: 1, label: "Flight Risk Score" },
      best_outreach_angle: { enabled: true, order: 2, label: "Best Outreach Angle" },
      timing_signals: { enabled: true, order: 3, label: "Timing Signals" },
      outreach_hooks: { enabled: true, order: 4, label: "Outreach Hooks" },
      key_insights: { enabled: true, order: 5, label: "Key Insights" },
      employer_pain_points: { enabled: true, order: 6, label: "Employer Pain Points" },
      inferred_skills: { enabled: true, order: 7, label: "Inferred Skills" },
      lateral_opportunities: { enabled: true, order: 8, label: "Lateral Opportunities" },
      company_correlations: { enabled: true, order: 9, label: "Company Correlations" }
    }
  },
  company: {
    enabled: true,
    sections: {
      company_info: { enabled: true, order: 1, label: "Company Info" },
      tech_stack: { enabled: true, order: 2, label: "Technology Stack" },
      employee_ratings: { enabled: true, order: 3, label: "Employee Ratings" },
      funding_info: { enabled: true, order: 4, label: "Funding Information" },
      ma_news: { enabled: true, order: 5, label: "M&A News" },
      company_profile: { enabled: true, order: 6, label: "Company Profile" },
      growth_signals: { enabled: true, order: 7, label: "Growth Signals" }
    }
  },
  activity: {
    enabled: true,
    sections: {}
  }
};

// Deep merge helper to combine saved config with defaults
const deepMerge = (defaults, saved) => {
  if (!saved) return defaults;

  const result = { ...defaults };

  for (const key of Object.keys(defaults)) {
    if (saved[key] !== undefined) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = deepMerge(defaults[key], saved[key]);
      } else {
        result[key] = saved[key];
      }
    }
  }

  return result;
};

export const usePanelPreferences = () => {
  const { user } = useUser();
  const [preferences, setPreferences] = useState(DEFAULT_PANEL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user preferences on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('user_panel_preferences')
          .select('panel_config')
          .eq('user_id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (first time user)
          console.error('Error fetching panel preferences:', fetchError);
          setError(fetchError);
        } else if (data?.panel_config) {
          // Merge saved config with defaults (to handle new sections added later)
          const mergedConfig = deepMerge(DEFAULT_PANEL_CONFIG, data.panel_config);
          setPreferences(mergedConfig);
        }
      } catch (err) {
        console.error('Error fetching panel preferences:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  // Save preferences to database
  const savePreferences = useCallback(async (newConfig) => {
    if (!user?.id) return false;

    setSaving(true);
    setError(null);

    try {
      const { error: upsertError } = await supabase
        .from('user_panel_preferences')
        .upsert({
          user_id: user.id,
          organization_id: user.organization_id,
          panel_config: newConfig,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error saving panel preferences:', upsertError);
        setError(upsertError);
        return false;
      }

      setPreferences(newConfig);
      return true;
    } catch (err) {
      console.error('Error saving panel preferences:', err);
      setError(err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id, user?.organization_id]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    return savePreferences(DEFAULT_PANEL_CONFIG);
  }, [savePreferences]);

  // Check if a specific section is enabled
  const isSectionEnabled = useCallback((tab, section) => {
    return preferences[tab]?.sections?.[section]?.enabled ?? true;
  }, [preferences]);

  // Check if a tab is enabled
  const isTabEnabled = useCallback((tab) => {
    return preferences[tab]?.enabled ?? true;
  }, [preferences]);

  // Get ordered sections for a tab (only enabled ones)
  const getSectionOrder = useCallback((tab) => {
    const sections = preferences[tab]?.sections || {};
    return Object.entries(sections)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
      .map(([key]) => key);
  }, [preferences]);

  // Get all sections for a tab (for the modal)
  const getAllSections = useCallback((tab) => {
    const sections = preferences[tab]?.sections || {};
    return Object.entries(sections)
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
      .map(([key, config]) => ({
        key,
        ...config
      }));
  }, [preferences]);

  // Toggle a specific section
  const toggleSection = useCallback((tab, section) => {
    setPreferences(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        sections: {
          ...prev[tab]?.sections,
          [section]: {
            ...prev[tab]?.sections?.[section],
            enabled: !prev[tab]?.sections?.[section]?.enabled
          }
        }
      }
    }));
  }, []);

  // Toggle an entire tab
  const toggleTab = useCallback((tab) => {
    setPreferences(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        enabled: !prev[tab]?.enabled
      }
    }));
  }, []);

  // Update local preferences without saving (for preview)
  const updateLocalPreferences = useCallback((newConfig) => {
    setPreferences(newConfig);
  }, []);

  return {
    preferences,
    loading,
    saving,
    error,
    savePreferences,
    resetToDefaults,
    isSectionEnabled,
    isTabEnabled,
    getSectionOrder,
    getAllSections,
    toggleSection,
    toggleTab,
    updateLocalPreferences,
    DEFAULT_CONFIG: DEFAULT_PANEL_CONFIG
  };
};

export default usePanelPreferences;
