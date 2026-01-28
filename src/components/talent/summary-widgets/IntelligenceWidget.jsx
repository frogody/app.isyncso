import React from "react";
import { Sparkles, TrendingUp, Target, Clock } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

// Compact score ring
const ScoreRing = ({ score, size = 56 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{score}</span>
      </div>
    </div>
  );
};

// Compact badge
const Badge = ({ label, color }) => {
  const colors = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${colors[color] || colors.amber}`}>
      {label}
    </span>
  );
};

const IntelligenceWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const score = candidate?.intelligence_score;
  const level = candidate?.intelligence_level;
  const approach = candidate?.recommended_approach;
  const hasData = score != null;

  // Determine colors based on values
  const levelColor = level?.toLowerCase() === 'high' ? 'red' :
                     level?.toLowerCase() === 'critical' ? 'red' :
                     level?.toLowerCase() === 'medium' ? 'amber' : 'green';

  const approachColor = approach?.toLowerCase() === 'aggressive' ? 'red' :
                        approach?.toLowerCase() === 'nurture' ? 'amber' : 'blue';

  return (
    <WidgetWrapper
      title="Intelligence"
      icon={Sparkles}
      iconColor="text-red-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
      compact
    >
      <div className="flex items-center gap-4">
        {/* Score Ring */}
        <ScoreRing score={score || 0} />

        {/* Quick Stats */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {level && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-zinc-500" />
              <Badge label={level} color={levelColor} />
            </div>
          )}
          {approach && (
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-zinc-500" />
              <Badge label={approach} color={approachColor} />
            </div>
          )}
          {candidate?.timing_signals?.length > 0 && (
            <div className="flex items-center gap-1.5 col-span-2">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-zinc-400">
                {candidate.timing_signals.length} timing signal{candidate.timing_signals.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
};

export default IntelligenceWidget;
