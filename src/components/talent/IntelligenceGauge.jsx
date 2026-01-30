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
    xs: { width: 24, height: 24, strokeWidth: 2, fontSize: "text-[10px]" },
    sm: { width: 32, height: 32, strokeWidth: 2.5, fontSize: "text-xs" },
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
        stroke: "#ef4444",
        text: "text-red-400",
        bg: "bg-red-500/30",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]",
        label: "High"
      };
    }
    if (score >= 40) {
      return {
        stroke: "#ef4444",
        text: "text-red-400",
        bg: "bg-red-500/20",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
        label: "Medium"
      };
    }
    return {
      stroke: "#ef4444",
      text: "text-red-400",
      bg: "bg-red-500/10",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.1)]",
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
    High: "bg-red-500/30 text-red-400 border-red-500/30",
    Medium: "bg-red-500/20 text-red-400 border-red-500/30",
    Low: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const sizeStyles = {
    xs: "px-1.5 py-px text-[10px]",
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
    Medium: "bg-red-500/20 text-red-400",
    Low: "bg-red-500/10 text-red-400",
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
 * @param {string} size - Size variant: 'xs' | 'sm' | 'md'
 */
export const ApproachBadge = ({ approach, size = "sm" }) => {
  const styles = {
    immediate: { bg: "bg-red-500/20", text: "text-red-400", label: "Immediate" },
    targeted: { bg: "bg-red-500/20", text: "text-red-400", label: "Targeted" },
    nurture: { bg: "bg-red-500/10", text: "text-red-400", label: "Nurture" },
  };

  const sizeStyles = {
    xs: "px-1.5 py-px text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const style = styles[approach] || styles.nurture;

  return (
    <span className={`inline-flex items-center rounded font-medium ${style.bg} ${style.text} ${sizeStyles[size]}`}>
      {style.label}
    </span>
  );
};

/**
 * IntelStatusBadge - Shows SYNC Intel processing status for a candidate
 *
 * @param {string} lastIntelUpdate - ISO timestamp of last intelligence update
 * @param {number} intelligenceScore - The candidate's intelligence score (if processed)
 * @param {string} size - Size variant: 'xs' | 'sm' | 'md'
 */
export const IntelStatusBadge = ({ lastIntelUpdate, intelligenceScore, size = "sm" }) => {
  const hasIntel = !!lastIntelUpdate && intelligenceScore != null;

  const sizeStyles = {
    xs: "px-1.5 py-px text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-sm gap-2",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  if (hasIntel) {
    return (
      <span className={`inline-flex items-center rounded font-medium bg-red-500/20 text-red-400 ${sizeStyles[size]}`}>
        <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Intel Ready
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded font-medium bg-zinc-500/20 text-zinc-400 ${sizeStyles[size]}`}>
      <svg className={`${iconSizes[size]} animate-pulse`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Pending
    </span>
  );
};

export default IntelligenceGauge;
