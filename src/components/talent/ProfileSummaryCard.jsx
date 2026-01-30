import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Target,
  Settings,
  MapPin,
  Briefcase,
  X,
  Check,
  Building2,
  Mail,
  Phone,
  Linkedin,
  GraduationCap,
  Award,
  TrendingUp,
  Euro,
  Lightbulb,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "./IntelligenceGauge";

/**
 * ProfileSummaryCard - A scannable summary card showing key decision points for recruiters
 *
 * Features:
 * - 35+ customizable metrics organized by category
 * - Quick settings popover with categorized toggles
 * - Clean 2-column layout with visual hierarchy
 * - Proper save functionality (fixes closure bug)
 */

// Category metadata for display
const CATEGORY_META = {
  core: { label: "Intelligence", icon: Sparkles, color: "text-red-400" },
  timing: { label: "Timing & Signals", icon: Clock, color: "text-red-400" },
  professional: { label: "Professional", icon: Briefcase, color: "text-red-400" },
  location: { label: "Location", icon: MapPin, color: "text-red-400" },
  contact: { label: "Contact Status", icon: Mail, color: "text-red-400" },
  skills: { label: "Skills", icon: Award, color: "text-red-400" },
  compensation: { label: "Compensation", icon: Euro, color: "text-red-400" },
  education: { label: "Education", icon: GraduationCap, color: "text-red-400" },
  insights: { label: "AI Insights", icon: Lightbulb, color: "text-red-400" },
  company: { label: "Company Intel", icon: Building2, color: "text-red-400" }
};

// Category display order
const CATEGORY_ORDER = ['core', 'timing', 'skills', 'professional', 'contact', 'location', 'compensation', 'education', 'insights', 'company'];

// Mini Toggle Switch
const MiniToggle = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
      checked ? 'bg-red-500' : 'bg-zinc-600'
    }`}
  >
    <motion.div
      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow"
      animate={{ left: checked ? '17px' : '2px' }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

// Collapsible Category Section
const CategorySection = ({ category, metrics, onToggle, expanded, onToggleExpand }) => {
  const meta = CATEGORY_META[category] || { label: category, icon: Settings, color: "text-zinc-400" };
  const Icon = meta.icon;
  const enabledCount = metrics.filter(m => m.enabled).length;

  return (
    <div className="border-b border-zinc-700/30 last:border-b-0">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="w-3 h-3 text-zinc-500" />
          </motion.div>
          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
          <span className="text-xs font-medium text-zinc-300">{meta.label}</span>
        </div>
        <span className="text-[10px] text-zinc-500">{enabledCount}/{metrics.length}</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 space-y-0.5">
              {metrics.map(metric => (
                <div
                  key={metric.key}
                  className="flex items-center justify-between py-1.5 pl-5 pr-1 hover:bg-zinc-800/20 rounded transition-colors"
                >
                  <span className="text-[11px] text-zinc-400">{metric.label}</span>
                  <MiniToggle
                    checked={metric.enabled}
                    onChange={() => onToggle(metric.key)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Settings Popover Component
const SettingsPopover = ({
  open,
  onClose,
  preferences,
  onToggleMetric,
  onSave,
  saving,
  anchorRef
}) => {
  const popoverRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({ core: true, timing: true });

  const metrics = preferences?.summary_card?.metrics || {};

  // Group metrics by category
  const groupedMetrics = {};
  Object.entries(metrics).forEach(([key, config]) => {
    const category = config.category || 'other';
    if (!groupedMetrics[category]) {
      groupedMetrics[category] = [];
    }
    groupedMetrics[category].push({ key, ...config });
  });

  // Sort each category
  Object.keys(groupedMetrics).forEach(cat => {
    groupedMetrics[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Filter by search
  const filteredCategories = searchQuery
    ? Object.entries(groupedMetrics).reduce((acc, [cat, items]) => {
        const filtered = items.filter(m =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) acc[cat] = filtered;
        return acc;
      }, {})
    : groupedMetrics;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, anchorRef]);

  // Reset search on close
  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  if (!open) return null;

  const toggleExpand = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const enabledTotal = Object.values(metrics).filter(m => m.enabled).length;
  const totalMetrics = Object.keys(metrics).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-10 z-50 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700/50 bg-zinc-800/50">
            <div>
              <span className="text-sm font-medium text-white">Customize Summary</span>
              <span className="text-[10px] text-zinc-500 ml-2">{enabledTotal}/{totalMetrics} shown</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-zinc-700/30">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-zinc-800 border border-zinc-700/50 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="max-h-72 overflow-y-auto">
            {CATEGORY_ORDER.filter(cat => filteredCategories[cat]).map(category => (
              <CategorySection
                key={category}
                category={category}
                metrics={filteredCategories[category]}
                onToggle={onToggleMetric}
                expanded={searchQuery ? true : expandedCategories[category]}
                onToggleExpand={() => toggleExpand(category)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-zinc-700/50 bg-zinc-800/30">
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {saving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Metric Display Components
const MetricBadge = ({ children, color = "red", className = "" }) => (
  <span className={`px-2 py-0.5 text-[10px] font-medium bg-${color}-500/10 text-${color}-400 rounded-full border border-${color}-500/20 ${className}`}>
    {children}
  </span>
);

const MetricRow = ({ icon: Icon, label, value, color = "zinc" }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <Icon className={`w-3 h-3 text-${color}-400 flex-shrink-0`} />
      <span className="text-zinc-500">{label}:</span>
      <span className="text-zinc-300 truncate">{value}</span>
    </div>
  );
};

const ProfileSummaryCard = ({
  candidate,
  preferences,
  saving = false,
  onSavePreferences,
  onUpdatePreferences
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const settingsButtonRef = useRef(null);

  // Sync local prefs with parent preferences
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  if (!candidate) return null;

  // Check if summary card is enabled
  const summaryCardEnabled = localPrefs?.summary_card?.enabled ?? true;
  if (!summaryCardEnabled) return null;

  // Get metric enabled state from LOCAL prefs (not stale parent)
  const isMetricEnabled = (metric) => {
    return localPrefs?.summary_card?.metrics?.[metric]?.enabled ?? false;
  };

  // Handle toggle - update local state immediately
  const handleToggleMetric = (metricKey) => {
    const newPrefs = {
      ...localPrefs,
      summary_card: {
        ...localPrefs.summary_card,
        metrics: {
          ...localPrefs.summary_card?.metrics,
          [metricKey]: {
            ...localPrefs.summary_card?.metrics?.[metricKey],
            enabled: !localPrefs.summary_card?.metrics?.[metricKey]?.enabled
          }
        }
      }
    };
    setLocalPrefs(newPrefs);
    if (onUpdatePreferences) {
      onUpdatePreferences(newPrefs);
    }
  };

  // Handle save - pass CURRENT local prefs (not stale closure)
  const handleSave = async () => {
    if (onSavePreferences) {
      const success = await onSavePreferences(localPrefs);
      if (success) {
        setShowSettings(false);
      }
      return success;
    }
    setShowSettings(false);
    return true;
  };

  // Helper functions for data extraction
  const getKeyTimingSignal = () => {
    const signals = candidate.timing_signals || [];
    if (!signals.length) return null;
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    const sorted = [...signals].sort((a, b) => {
      const aUrgency = urgencyOrder[a.urgency?.toLowerCase()] || 0;
      const bUrgency = urgencyOrder[b.urgency?.toLowerCase()] || 0;
      return bUrgency - aUrgency;
    });
    return sorted[0];
  };

  const getTopSkills = () => {
    const skills = candidate.skills || [];
    return skills.slice(0, 3).map(skill => {
      if (typeof skill === 'object') {
        return skill?.name || skill?.skill || String(skill);
      }
      return String(skill);
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return null;
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > maxLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + "...";
  };

  const getFlightRiskIndicator = () => {
    const level = candidate.intelligence_level?.toLowerCase();
    if (level === "critical" || level === "high") {
      return { show: true, color: "red", label: "High Flight Risk" };
    }
    if (level === "medium") {
      return { show: true, color: "yellow", label: "Moderate Risk" };
    }
    return { show: false };
  };

  // Extract all candidate data
  const keySignal = getKeyTimingSignal();
  const topSkills = getTopSkills();
  const outreachAngle = candidate.best_outreach_angle;
  const flightRisk = getFlightRiskIndicator();

  const urgencyConfig = {
    high: { bg: "bg-red-500/15", text: "text-red-400", dot: "bg-red-400" },
    medium: { bg: "bg-yellow-500/15", text: "text-yellow-400", dot: "bg-yellow-400" },
    low: { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-400" },
  };
  const signalUrgency = keySignal?.urgency?.toLowerCase() || "medium";
  const signalConfig = urgencyConfig[signalUrgency] || urgencyConfig.medium;

  // Check what data is available AND enabled
  const showIntelScore = candidate.intelligence_score != null && isMetricEnabled('intelligence_score');
  const showLevel = candidate.intelligence_level && isMetricEnabled('intelligence_level');
  const showApproach = candidate.recommended_approach && isMetricEnabled('recommended_approach');
  const showSignal = keySignal != null && isMetricEnabled('timing_signal');
  const showAngle = outreachAngle != null && isMetricEnabled('outreach_angle');
  const showSkills = topSkills.length > 0 && isMetricEnabled('top_skills');
  const showFlightRisk = flightRisk.show && isMetricEnabled('flight_risk');

  // Professional metrics
  const showTitle = candidate.current_title && isMetricEnabled('current_title');
  const showCompany = (candidate.current_company || candidate.company_name) && isMetricEnabled('company_name');
  const showTenure = candidate.years_at_company && isMetricEnabled('years_at_company');
  const showPromos = candidate.times_promoted != null && isMetricEnabled('times_promoted');
  const showHops = candidate.times_company_hopped != null && isMetricEnabled('times_company_hopped');
  const showYearsExp = candidate.years_of_experience && isMetricEnabled('years_experience');

  // Location metrics
  const showLocation = candidate.location && isMetricEnabled('location');
  const showCity = candidate.location_city && isMetricEnabled('location_city');
  const showRegion = candidate.location_region && isMetricEnabled('location_region');
  const showCountry = candidate.location_country && isMetricEnabled('location_country');

  // Contact metrics
  const showHasEmail = isMetricEnabled('has_email');
  const showHasPhone = isMetricEnabled('has_phone');
  const showHasLinkedin = isMetricEnabled('has_linkedin');
  const showEnrichment = candidate.enriched_at && isMetricEnabled('enrichment_status');

  // Skills metrics
  const showSkillsCount = candidate.skills?.length && isMetricEnabled('skills_count');
  const showInferredCount = candidate.inferred_skills?.length && isMetricEnabled('inferred_skills_count');
  const showCertsCount = candidate.certifications?.length && isMetricEnabled('certifications_count');

  // Compensation
  const showSalary = candidate.salary_range && isMetricEnabled('salary_range');

  // Education
  const showEduLevel = candidate.education_level && isMetricEnabled('education_level');
  const showEduCount = candidate.education?.length && isMetricEnabled('education_count');

  // Insights
  const showInsightsCount = candidate.key_insights?.length && isMetricEnabled('key_insights_count');
  const showHooksCount = candidate.outreach_hooks?.length && isMetricEnabled('outreach_hooks_count');
  const showLateralCount = candidate.lateral_opportunities?.length && isMetricEnabled('lateral_opportunities_count');
  const showCorrelationsCount = candidate.company_correlations?.length && isMetricEnabled('company_correlations_count');

  // Company intel
  const showCompanyIntel = candidate.company_intelligence && isMetricEnabled('company_intel_available');
  const showSatisfaction = candidate.job_satisfaction && isMetricEnabled('job_satisfaction');
  const showUrgency = candidate.recruitment_urgency && isMetricEnabled('recruitment_urgency');

  // Check if we have any content to show
  const hasLeftColumn = showIntelScore || showLevel || showApproach || showFlightRisk;
  const hasCenterColumn = showSignal || showAngle;
  const hasRightColumn = showSkills || showTitle || showCompany || showLocation || showTenure ||
    showPromos || showHops || showYearsExp || showHasEmail || showHasPhone || showHasLinkedin ||
    showSkillsCount || showSalary || showInsightsCount || showCompanyIntel;

  const hasAnyContent = hasLeftColumn || hasCenterColumn || hasRightColumn;
  if (!hasAnyContent) return null;

  return (
    <div className="mx-6 mb-4">
      <div className="relative p-4 bg-gradient-to-br from-zinc-800/70 via-zinc-800/50 to-zinc-900/60 border border-zinc-700/40 rounded-xl">
        {/* Settings Button */}
        <button
          ref={settingsButtonRef}
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2.5 right-2.5 p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors group z-10"
          title="Customize summary card"
        >
          <Settings className={`w-4 h-4 transition-colors ${showSettings ? 'text-red-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
        </button>

        {/* Settings Popover */}
        <SettingsPopover
          open={showSettings}
          onClose={() => setShowSettings(false)}
          preferences={localPrefs}
          onToggleMetric={handleToggleMetric}
          onSave={handleSave}
          saving={saving}
          anchorRef={settingsButtonRef}
        />

        {/* Main Content - 2 Column Layout */}
        <div className="flex gap-5">
          {/* LEFT COLUMN: Intelligence Core */}
          {hasLeftColumn && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Gauge */}
              {showIntelScore && (
                <div className="flex flex-col items-center">
                  <IntelligenceGauge
                    score={candidate.intelligence_score || 0}
                    size="xs"
                    animated={false}
                  />
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-col gap-1.5">
                {showLevel && (
                  <IntelligenceLevelBadge level={candidate.intelligence_level} size="xs" />
                )}
                {showApproach && (
                  <ApproachBadge approach={candidate.recommended_approach} size="xs" />
                )}
                {showFlightRisk && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-${flightRisk.color}-500/10 border border-${flightRisk.color}-500/20`}>
                    <AlertTriangle className={`w-3 h-3 text-${flightRisk.color}-400`} />
                    <span className={`text-[9px] font-medium text-${flightRisk.color}-400`}>
                      {flightRisk.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          {hasLeftColumn && (hasCenterColumn || hasRightColumn) && (
            <div className="w-px bg-gradient-to-b from-transparent via-zinc-600/40 to-transparent self-stretch" />
          )}

          {/* CENTER COLUMN: Timing & Outreach */}
          {hasCenterColumn && (
            <div className="flex-1 min-w-0 space-y-2.5 py-0.5">
              {/* Timing Signal */}
              {showSignal && (
                <div className="flex items-start gap-2">
                  <div className={`p-1.5 rounded-lg ${signalConfig.bg} flex-shrink-0`}>
                    <Clock className={`w-3.5 h-3.5 ${signalConfig.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded ${signalConfig.bg} ${signalConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${signalConfig.dot} animate-pulse`} />
                        {signalUrgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">
                      {keySignal.trigger}
                    </p>
                  </div>
                </div>
              )}

              {/* Outreach Angle */}
              {showAngle && (
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-red-500/10 flex-shrink-0">
                    <Target className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-red-400/70 uppercase tracking-wider font-medium mb-0.5">
                      Outreach Angle
                    </p>
                    <p
                      className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2"
                      title={outreachAngle}
                    >
                      {truncateText(outreachAngle, 120)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {hasCenterColumn && hasRightColumn && (
            <div className="w-px bg-gradient-to-b from-transparent via-zinc-600/40 to-transparent self-stretch" />
          )}

          {/* RIGHT COLUMN: Quick Facts */}
          {hasRightColumn && (
            <div className="flex flex-col gap-2 flex-shrink-0 min-w-[140px] max-w-[180px]">
              {/* Skills */}
              {showSkills && (
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {topSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 text-[9px] font-medium bg-red-500/10 text-red-400 rounded border border-red-500/20"
                        title={skill}
                      >
                        {skill.length > 10 ? skill.substring(0, 10) + "..." : skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Professional Info */}
              {(showTitle || showCompany || showTenure || showYearsExp) && (
                <div className="space-y-0.5">
                  {showTitle && (
                    <MetricRow icon={Briefcase} label="Role" value={candidate.current_title} color="red" />
                  )}
                  {showCompany && (
                    <MetricRow icon={Building2} label="Co" value={candidate.current_company || candidate.company_name} color="red" />
                  )}
                  {showTenure && (
                    <MetricRow icon={TrendingUp} label="Tenure" value={`${candidate.years_at_company}y`} color="red" />
                  )}
                  {showYearsExp && (
                    <MetricRow icon={Briefcase} label="Exp" value={`${candidate.years_of_experience}y`} color="red" />
                  )}
                </div>
              )}

              {/* Location */}
              {(showLocation || showCity) && (
                <MetricRow
                  icon={MapPin}
                  label="Loc"
                  value={candidate.location || candidate.location_city}
                  color="red"
                />
              )}

              {/* Contact Status */}
              {(showHasEmail || showHasPhone || showHasLinkedin) && (
                <div className="flex items-center gap-2">
                  {showHasEmail && candidate.email && (
                    <Mail className="w-3 h-3 text-red-400" title="Has email" />
                  )}
                  {showHasPhone && (candidate.phone || candidate.mobile_phone) && (
                    <Phone className="w-3 h-3 text-red-400" title="Has phone" />
                  )}
                  {showHasLinkedin && candidate.linkedin_url && (
                    <Linkedin className="w-3 h-3 text-red-400" title="Has LinkedIn" />
                  )}
                  {showEnrichment && (
                    <span className="text-[9px] text-red-400">Enriched</span>
                  )}
                </div>
              )}

              {/* Salary */}
              {showSalary && (
                <MetricRow
                  icon={Euro}
                  label="Salary"
                  value={typeof candidate.salary_range === 'number' ? `$${candidate.salary_range.toLocaleString()}` : candidate.salary_range}
                  color="red"
                />
              )}

              {/* Counts */}
              {(showSkillsCount || showCertsCount || showInsightsCount) && (
                <div className="flex items-center gap-2 flex-wrap text-[9px] text-zinc-500">
                  {showSkillsCount && <span>{candidate.skills.length} skills</span>}
                  {showCertsCount && <span>{candidate.certifications.length} certs</span>}
                  {showInsightsCount && <span>{candidate.key_insights.length} insights</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
