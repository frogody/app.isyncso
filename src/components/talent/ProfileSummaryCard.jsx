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
  Check
} from "lucide-react";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "./IntelligenceGauge";

/**
 * ProfileSummaryCard - A scannable summary card showing key decision points for recruiters
 *
 * Features:
 * - Customizable metrics via user preferences
 * - Quick settings popover for toggling metrics
 * - Improved visual design with clear sections
 * - Responsive layout
 */

// Mini Toggle Switch for the settings popover
const MiniToggle = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative w-8 h-4 rounded-full transition-colors ${
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
  const metrics = preferences?.summary_card?.metrics || {};

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

  if (!open) return null;

  const sortedMetrics = Object.entries(metrics)
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-8 z-50 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/50">
            <span className="text-xs font-medium text-zinc-300">Customize Summary</span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          {/* Metrics List */}
          <div className="p-2 max-h-64 overflow-y-auto">
            {sortedMetrics.map(([key, config]) => (
              <div
                key={key}
                className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <span className="text-xs text-zinc-300">{config.label}</span>
                <MiniToggle
                  checked={config.enabled}
                  onChange={() => onToggleMetric(key)}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-zinc-700/50 bg-zinc-800/30">
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {saving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  Save
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ProfileSummaryCard = ({
  candidate,
  preferences,
  onSavePreferences,
  saving = false,
  onToggleMetric
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsButtonRef = useRef(null);

  if (!candidate) return null;

  // Check if summary card is enabled
  const summaryCardEnabled = preferences?.summary_card?.enabled ?? true;
  if (!summaryCardEnabled) return null;

  // Get metric enabled state
  const isMetricEnabled = (metric) => {
    return preferences?.summary_card?.metrics?.[metric]?.enabled ?? true;
  };

  // Get the highest urgency timing signal
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

  // Get top 3 skills
  const getTopSkills = () => {
    const skills = candidate.skills || [];
    return skills.slice(0, 3).map(skill => {
      if (typeof skill === 'object') {
        return skill?.name || skill?.skill || String(skill);
      }
      return String(skill);
    });
  };

  // Truncate text intelligently (at word boundary)
  const truncateText = (text, maxLength = 80) => {
    if (!text) return null;
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > maxLength * 0.6 ? truncated.substring(0, lastSpace) : truncated) + "...";
  };

  // Determine flight risk level based on intelligence_level
  const getFlightRiskIndicator = () => {
    const level = candidate.intelligence_level?.toLowerCase();
    if (level === "critical" || level === "high") {
      return { show: true, color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20", label: "High Flight Risk" };
    }
    if (level === "medium") {
      return { show: true, color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20", label: "Moderate Risk" };
    }
    return { show: false };
  };

  const keySignal = getKeyTimingSignal();
  const topSkills = getTopSkills();
  const outreachAngle = candidate.best_outreach_angle;
  const truncatedAngle = truncateText(outreachAngle, 80);
  const flightRisk = getFlightRiskIndicator();

  // Urgency colors for timing signal
  const urgencyConfig = {
    high: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30", dot: "bg-zinc-400" },
  };

  const signalUrgency = keySignal?.urgency?.toLowerCase() || "medium";
  const signalConfig = urgencyConfig[signalUrgency] || urgencyConfig.medium;

  // Check what data is available
  const hasIntelligence = candidate.intelligence_score != null && isMetricEnabled('intelligence_score');
  const hasLevel = candidate.intelligence_level && isMetricEnabled('intelligence_level');
  const hasApproach = candidate.recommended_approach && isMetricEnabled('recommended_approach');
  const hasSignals = keySignal != null && isMetricEnabled('timing_signal');
  const hasAngle = outreachAngle != null && isMetricEnabled('outreach_angle');
  const hasSkills = topSkills.length > 0 && isMetricEnabled('top_skills');
  const showFlightRisk = flightRisk.show && isMetricEnabled('flight_risk');
  const hasYearsExp = candidate.years_of_experience && isMetricEnabled('years_experience');
  const hasLocation = candidate.location && isMetricEnabled('location');

  // Don't render if no meaningful data
  const hasAnyContent = hasIntelligence || hasLevel || hasApproach || hasSignals || hasAngle || hasSkills || showFlightRisk || hasYearsExp || hasLocation;
  if (!hasAnyContent) return null;

  // Handle local toggle for settings popover
  const handleToggleMetric = (metricKey) => {
    if (onToggleMetric) {
      onToggleMetric(metricKey);
    }
  };

  const handleSave = async () => {
    if (onSavePreferences) {
      await onSavePreferences();
    }
    setShowSettings(false);
  };

  return (
    <div className="mx-6 mb-4">
      <div className="relative p-4 bg-gradient-to-r from-zinc-800/60 to-zinc-800/40 border border-zinc-700/50 rounded-xl backdrop-blur-sm">
        {/* Settings Button */}
        <button
          ref={settingsButtonRef}
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-3 right-3 p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors group"
          title="Customize summary card"
        >
          <Settings className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </button>

        {/* Settings Popover */}
        <SettingsPopover
          open={showSettings}
          onClose={() => setShowSettings(false)}
          preferences={preferences}
          onToggleMetric={handleToggleMetric}
          onSave={handleSave}
          saving={saving}
          anchorRef={settingsButtonRef}
        />

        <div className="flex items-stretch gap-5 flex-wrap lg:flex-nowrap">
          {/* Left Section: Intelligence Score + Badges */}
          {(hasIntelligence || hasLevel || hasApproach) && (
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Intelligence Gauge */}
              {hasIntelligence && (
                <div className="flex flex-col items-center">
                  <IntelligenceGauge
                    score={candidate.intelligence_score || 0}
                    size="xs"
                    animated={false}
                  />
                  <span className="text-[9px] text-zinc-500 mt-1 uppercase tracking-wider">Score</span>
                </div>
              )}

              {/* Badges Stack */}
              {(hasLevel || hasApproach) && (
                <div className="flex flex-col gap-1.5">
                  {hasLevel && (
                    <IntelligenceLevelBadge level={candidate.intelligence_level} size="xs" />
                  )}
                  {hasApproach && (
                    <ApproachBadge approach={candidate.recommended_approach} size="xs" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {(hasIntelligence || hasLevel || hasApproach) && (hasSignals || hasAngle) && (
            <div className="hidden lg:flex items-center">
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-zinc-600/50 to-transparent" />
            </div>
          )}

          {/* Center Section: Key Signal + Outreach Angle */}
          {(hasSignals || hasAngle) && (
            <div className="flex-1 min-w-0 space-y-3 py-1">
              {/* Key Timing Signal */}
              {hasSignals && (
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg ${signalConfig.bg} flex-shrink-0`}>
                    <Clock className={`w-3.5 h-3.5 ${signalConfig.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${signalConfig.bg} ${signalConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${signalConfig.dot} animate-pulse`} />
                        {signalUrgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                      {keySignal.trigger}
                    </p>
                  </div>
                </div>
              )}

              {/* Best Outreach Angle */}
              {hasAngle && (
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 flex-shrink-0">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-medium mb-0.5">
                      Outreach Angle
                    </p>
                    <p
                      className="text-xs text-zinc-300 leading-relaxed"
                      title={outreachAngle !== truncatedAngle ? outreachAngle : undefined}
                    >
                      {truncatedAngle}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {(hasSignals || hasAngle) && (hasSkills || showFlightRisk || hasYearsExp || hasLocation) && (
            <div className="hidden lg:flex items-center">
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-zinc-600/50 to-transparent" />
            </div>
          )}

          {/* Right Section: Skills + Flight Risk + Extra Metrics */}
          {(hasSkills || showFlightRisk || hasYearsExp || hasLocation) && (
            <div className="flex flex-col justify-center gap-2.5 flex-shrink-0 min-w-[140px]">
              {/* Top Skills */}
              {hasSkills && (
                <div>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5">Top Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {topSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20 whitespace-nowrap"
                        title={skill}
                      >
                        {skill.length > 12 ? skill.substring(0, 12) + "..." : skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Metrics Row */}
              {(hasYearsExp || hasLocation) && (
                <div className="flex items-center gap-3 text-[10px]">
                  {hasYearsExp && (
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Briefcase className="w-3 h-3" />
                      <span>{candidate.years_of_experience}y exp</span>
                    </div>
                  )}
                  {hasLocation && (
                    <div className="flex items-center gap-1 text-zinc-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[80px]" title={candidate.location}>
                        {candidate.location}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Flight Risk Indicator */}
              {showFlightRisk && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${flightRisk.bgColor} border ${flightRisk.borderColor}`}>
                  <AlertTriangle className={`w-3.5 h-3.5 ${flightRisk.color}`} />
                  <span className={`text-[10px] font-medium ${flightRisk.color}`}>
                    {flightRisk.label}
                  </span>
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
