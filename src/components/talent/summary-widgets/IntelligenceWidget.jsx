import React from "react";
import { Sparkles } from "lucide-react";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "../IntelligenceGauge";
import WidgetWrapper from "./WidgetWrapper";

/**
 * IntelligenceWidget - Displays candidate intelligence score, level, and approach
 */
const IntelligenceWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const hasData = candidate?.intelligence_score != null;

  return (
    <WidgetWrapper
      title="Intelligence"
      icon={Sparkles}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="flex items-center gap-6">
        {/* Score Gauge */}
        <div className="flex flex-col items-center">
          <IntelligenceGauge
            score={candidate?.intelligence_score || 0}
            size="md"
            animated={false}
          />
          <span className="text-xs text-zinc-500 mt-2">Flight Risk Score</span>
        </div>

        {/* Badges */}
        <div className="flex-1 space-y-3">
          {candidate?.intelligence_level && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-16">Level:</span>
              <IntelligenceLevelBadge level={candidate.intelligence_level} size="sm" />
            </div>
          )}

          {candidate?.recommended_approach && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-16">Approach:</span>
              <ApproachBadge approach={candidate.recommended_approach} size="sm" />
            </div>
          )}

          {/* Career Trajectory */}
          {candidate?.career_trajectory && (
            <div className="mt-3 pt-3 border-t border-zinc-700/30">
              <p className="text-xs text-zinc-500 mb-1">Career Trajectory</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {candidate.career_trajectory}
              </p>
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default IntelligenceWidget;
