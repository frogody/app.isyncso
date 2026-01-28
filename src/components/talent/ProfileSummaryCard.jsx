import React from "react";
import { AlertTriangle, Clock, Zap, Target } from "lucide-react";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "./IntelligenceGauge";

/**
 * ProfileSummaryCard - A scannable summary card showing key decision points for recruiters
 *
 * Displays 5-7 key metrics at a glance:
 * - Intelligence Score with circular gauge
 * - Intelligence Level badge + Approach badge
 * - Key Timing Signal (highest urgency)
 * - Best Outreach Angle (truncated with tooltip)
 * - Top 3 Skills as compact badges
 * - Flight risk indicator (optional, based on intelligence_level)
 */
const ProfileSummaryCard = ({ candidate }) => {
  if (!candidate) return null;

  // Get the highest urgency timing signal
  const getKeyTimingSignal = () => {
    const signals = candidate.timing_signals || [];
    if (!signals.length) return null;

    // Sort by urgency: high > medium > low
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

  // Truncate text with ellipsis
  const truncateText = (text, maxLength = 60) => {
    if (!text) return null;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // Determine flight risk level based on intelligence_level
  const getFlightRiskIndicator = () => {
    const level = candidate.intelligence_level?.toLowerCase();
    if (level === "critical" || level === "high") {
      return { show: true, color: "text-red-400", bgColor: "bg-red-500/10", label: "High Flight Risk" };
    }
    if (level === "medium") {
      return { show: true, color: "text-yellow-400", bgColor: "bg-yellow-500/10", label: "Moderate Risk" };
    }
    return { show: false };
  };

  const keySignal = getKeyTimingSignal();
  const topSkills = getTopSkills();
  const outreachAngle = candidate.best_outreach_angle;
  const truncatedAngle = truncateText(outreachAngle, 60);
  const flightRisk = getFlightRiskIndicator();

  // Urgency colors for timing signal badge
  const urgencyConfig = {
    high: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30" },
  };

  const signalUrgency = keySignal?.urgency?.toLowerCase() || "medium";
  const signalConfig = urgencyConfig[signalUrgency] || urgencyConfig.medium;

  // Don't render if no meaningful data
  const hasIntelligence = candidate.intelligence_score != null;
  const hasSignals = keySignal != null;
  const hasAngle = outreachAngle != null;
  const hasSkills = topSkills.length > 0;

  if (!hasIntelligence && !hasSignals && !hasAngle && !hasSkills) {
    return null;
  }

  return (
    <div className="mx-6 mb-4 p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
      <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
        {/* Left Section: Intel Score Gauge + Badges */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Intelligence Gauge */}
          {hasIntelligence && (
            <IntelligenceGauge
              score={candidate.intelligence_score || 0}
              size="sm"
              animated={false}
            />
          )}

          {/* Badges Stack */}
          <div className="flex flex-col gap-1.5">
            {candidate.intelligence_level && (
              <IntelligenceLevelBadge level={candidate.intelligence_level} size="xs" />
            )}
            {candidate.recommended_approach && (
              <ApproachBadge approach={candidate.recommended_approach} size="xs" />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-12 bg-zinc-700/50" />

        {/* Center Section: Key Signal + Outreach Angle */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Key Timing Signal */}
          {keySignal && (
            <div className="flex items-start gap-2">
              <Clock className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${signalConfig.text}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${signalConfig.bg} ${signalConfig.text}`}>
                    {signalUrgency.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-300 truncate">
                    {keySignal.trigger}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Best Outreach Angle */}
          {truncatedAngle && (
            <div className="flex items-start gap-2">
              <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-cyan-400" />
              <p
                className="text-xs text-zinc-300 leading-relaxed"
                title={outreachAngle !== truncatedAngle ? outreachAngle : undefined}
              >
                {truncatedAngle}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        {(hasSkills || flightRisk.show) && (
          <div className="hidden lg:block w-px h-12 bg-zinc-700/50" />
        )}

        {/* Right Section: Top Skills + Flight Risk */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Top 3 Skills */}
          {hasSkills && (
            <div className="flex flex-wrap gap-1">
              {topSkills.map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20"
                >
                  {skill.length > 15 ? skill.substring(0, 15) + "..." : skill}
                </span>
              ))}
            </div>
          )}

          {/* Flight Risk Indicator */}
          {flightRisk.show && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${flightRisk.bgColor}`}>
              <AlertTriangle className={`w-3 h-3 ${flightRisk.color}`} />
              <span className={`text-[10px] font-medium ${flightRisk.color}`}>
                {flightRisk.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryCard;
