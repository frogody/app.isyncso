import React from "react";
import { motion } from "framer-motion";

/**
 * IntelligenceGauge - A circular gauge component displaying flight risk intelligence scores
 * 
 * @param {number} score - Intelligence score from 0-100
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} showLabel - Whether to show the risk level label below the gauge
 * @param {boolean} animated - Whether to animate the gauge on mount
 */
export const IntelligenceGauge = ({ 
  score = 0, 
  size = "md", 
  showLabel = false,
  animated = true 
}) => {
  const sizes = {
    sm: { width: 40, height: 40, strokeWidth: 3, fontSize: "text-xs" },
    md: { width: 56, height: 56, strokeWidth: 4, fontSize: "text-sm" },
    lg: { width: 80, height: 80, strokeWidth: 5, fontSize: "text-lg" },
    xl: { width: 120, height: 120, strokeWidth: 6, fontSize: "text-2xl" },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size] || sizes.md;
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreConfig = (score) => {
    if (score >= 80) {
      return { 
        stroke: "#ef4444", 
        text: "text-red-400", 
        bg: "bg-red-500/20",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]",
        label: "Critical" 
      };
    }
    if (score >= 60) {
      return { 
        stroke: "#f97316", 
        text: "text-orange-400", 
        bg: "bg-orange-500/20",
        glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]",
        label: "High" 
      };
    }
    if (score >= 40) {
      return { 
        stroke: "#eab308", 
        text: "text-yellow-400", 
        bg: "bg-yellow-500/20",
        glow: "shadow-[0_0_15px_rgba(234,179,8,0.3)]",
        label: "Medium" 
      };
    }
    return { 
      stroke: "#22c55e", 
      text: "text-green-400", 
      bg: "bg-green-500/20",
      glow: "shadow-[0_0_15px_rgba(34,197,94,0.3)]",
      label: "Low" 
    };
  };

  const config = getScoreConfig(score);

  const circleProps = animated ? {
    initial: { strokeDashoffset: circumference },
    animate: { strokeDashoffset: offset },
    transition: { duration: 1.5, ease: "easeOut" }
  } : {
    strokeDashoffset: offset
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`relative inline-flex items-center justify-center rounded-full ${config.glow}`}>
        <svg width={width} height={height} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          {animated ? (
            <motion.circle
              cx={width / 2}
              cy={height / 2}
              r={radius}
              fill="none"
              stroke={config.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              {...circleProps}
            />
          ) : (
            <circle
              cx={width / 2}
              cy={height / 2}
              r={radius}
              fill="none"
              stroke={config.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        {/* Score text */}
        <span className={`absolute ${fontSize} font-bold ${config.text}`}>
          {score}
        </span>
      </div>
      {showLabel && (
        <span className={`mt-2 text-sm font-medium ${config.text}`}>
          {config.label} Risk
        </span>
      )}
    </div>
  );
};

/**
 * IntelligenceLevelBadge - A badge showing the categorized intelligence level
 * 
 * @param {string} level - Intelligence level: 'Critical' | 'High' | 'Medium' | 'Low'
 * @param {string} size - Size variant: 'sm' | 'md'
 */
export const IntelligenceLevelBadge = ({ level, size = "md" }) => {
  const styles = {
    Critical: "bg-red-500/20 text-red-400 border-red-500/30",
    High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${styles[level] || styles.Low} ${sizeStyles[size]}`}>
      {level}
    </span>
  );
};

/**
 * UrgencyBadge - A badge showing outreach urgency level
 * 
 * @param {string} urgency - Urgency level: 'High' | 'Medium' | 'Low'
 */
export const UrgencyBadge = ({ urgency }) => {
  const styles = {
    High: "bg-red-500/20 text-red-400",
    Medium: "bg-yellow-500/20 text-yellow-400",
    Low: "bg-green-500/20 text-green-400",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[urgency] || styles.Low}`}>
      {urgency} Urgency
    </span>
  );
};

/**
 * ApproachBadge - A badge showing the recommended engagement approach
 * 
 * @param {string} approach - Approach type: 'immediate' | 'targeted' | 'nurture'
 */
export const ApproachBadge = ({ approach }) => {
  const styles = {
    immediate: { bg: "bg-red-500/20", text: "text-red-400", label: "Immediate" },
    targeted: { bg: "bg-violet-500/20", text: "text-violet-400", label: "Targeted" },
    nurture: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Nurture" },
  };

  const style = styles[approach] || styles.nurture;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

export default IntelligenceGauge;
