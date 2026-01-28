import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';

// Default panel configuration - all sections enabled by default
export const DEFAULT_PANEL_CONFIG = {
  summary_card: {
    enabled: true,
    metrics: {
      // CORE METRICS - Intelligence
      intelligence_score: { enabled: true, order: 0, label: "Intelligence Score", category: "core" },
      intelligence_level: { enabled: true, order: 1, label: "Risk Level", category: "core" },
      recommended_approach: { enabled: true, order: 2, label: "Approach", category: "core" },

      // TIMING & SIGNALS
      timing_signal: { enabled: true, order: 10, label: "Key Timing Signal", category: "timing" },
      outreach_angle: { enabled: true, order: 11, label: "Outreach Angle", category: "timing" },
      flight_risk: { enabled: true, order: 12, label: "Flight Risk Alert", category: "timing" },

      // PROFESSIONAL
      current_title: { enabled: false, order: 20, label: "Current Title", category: "professional" },
      company_name: { enabled: false, order: 21, label: "Company", category: "professional" },
      years_at_company: { enabled: false, order: 22, label: "Tenure", category: "professional" },
      times_promoted: { enabled: false, order: 23, label: "Promotions", category: "professional" },
      times_company_hopped: { enabled: false, order: 24, label: "Job Changes", category: "professional" },
      years_experience: { enabled: false, order: 25, label: "Years Experience", category: "professional" },

      // LOCATION
      location: { enabled: false, order: 30, label: "Location", category: "location" },
      location_city: { enabled: false, order: 31, label: "City", category: "location" },
      location_region: { enabled: false, order: 32, label: "Region/State", category: "location" },
      location_country: { enabled: false, order: 33, label: "Country", category: "location" },

      // CONTACT STATUS
      has_email: { enabled: false, order: 40, label: "Has Email", category: "contact" },
      has_phone: { enabled: false, order: 41, label: "Has Phone", category: "contact" },
      has_linkedin: { enabled: false, order: 42, label: "Has LinkedIn", category: "contact" },
      enrichment_status: { enabled: false, order: 43, label: "Enrichment Status", category: "contact" },

      // SKILLS
      top_skills: { enabled: true, order: 50, label: "Top Skills", category: "skills" },
      skills_count: { enabled: false, order: 51, label: "Skills Count", category: "skills" },
      inferred_skills_count: { enabled: false, order: 52, label: "Inferred Skills", category: "skills" },
      certifications_count: { enabled: false, order: 53, label: "Certifications", category: "skills" },

      // COMPENSATION
      salary_range: { enabled: false, order: 60, label: "Salary Range", category: "compensation" },

      // EDUCATION
      education_level: { enabled: false, order: 70, label: "Education Level", category: "education" },
      education_count: { enabled: false, order: 71, label: "Degrees", category: "education" },

      // AI INSIGHTS
      key_insights_count: { enabled: false, order: 80, label: "Key Insights", category: "insights" },
      outreach_hooks_count: { enabled: false, order: 81, label: "Outreach Hooks", category: "insights" },
      lateral_opportunities_count: { enabled: false, order: 82, label: "Lateral Opps", category: "insights" },
      company_correlations_count: { enabled: false, order: 83, label: "Company Correlations", category: "insights" },

      // COMPANY INTEL
      company_intel_available: { enabled: false, order: 90, label: "Company Intel", category: "company" },
      job_satisfaction: { enabled: false, order: 91, label: "Job Satisfaction", category: "company" },
      recruitment_urgency: { enabled: false, order: 92, label: "Recruitment Urgency", category: "company" }
    }
  },
  profile: {
    enabled: true,
    sections: {
      analysis_cards: { enabled: true, order: 0, label: "Analysis Cards" },
      contact_info: { enabled: true, order: 1, label: "Contact Information" },
      professional_summary: { enabled: true, order: 2, label: "Professional Summary" },
      skills: { enabled: true, order: 3, label: "Skills" },
      work_history: { enabled: true, order: 4, label: "Work History" },
      education: { enabled: true, order: 5, label: "Education" },
      certifications: { enabled: true, order: 6, label: "Certifications" },
      interests: { enabled: true, order: 7, label: "Interests" },
      experience: { enabled: true, order: 8, label: "Experience (Legacy)" },
      additional_info: { enabled: true, order: 9, label: "Additional Information" }
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

  // Check if a summary card metric is enabled
  const isMetricEnabled = useCallback((metric) => {
    return preferences.summary_card?.metrics?.[metric]?.enabled ?? true;
  }, [preferences]);

  // Get ordered metrics for summary card (only enabled ones)
  const getEnabledMetrics = useCallback(() => {
    const metrics = preferences.summary_card?.metrics || {};
    return Object.entries(metrics)
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
      .map(([key]) => key);
  }, [preferences]);

  // Check if summary card is enabled
  const isSummaryCardEnabled = useCallback(() => {
    return preferences.summary_card?.enabled ?? true;
  }, [preferences]);

  // Get metrics grouped by category
  const getMetricsByCategory = useCallback(() => {
    const metrics = preferences.summary_card?.metrics || {};
    const categories = {};

    Object.entries(metrics).forEach(([key, config]) => {
      const category = config.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({ key, ...config });
    });

    // Sort each category by order
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return categories;
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
    isMetricEnabled,
    getEnabledMetrics,
    isSummaryCardEnabled,
    getMetricsByCategory,
    getSectionOrder,
    getAllSections,
    toggleSection,
    toggleTab,
    updateLocalPreferences,
    DEFAULT_CONFIG: DEFAULT_PANEL_CONFIG
  };
};

export default usePanelPreferences;
