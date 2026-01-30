import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Briefcase, Target, Clock, Users } from "lucide-react";

const ICONS = { Award, Briefcase, Target, Clock, Users };

const FACTOR_CONFIG = {
  skills_fit: {
    label: "Skills Match",
    icon: "Award",
    description: "How well skills align with requirements",
  },
  experience_fit: {
    label: "Experience",
    icon: "Briefcase",
    description: "Years and relevance of experience",
  },
  title_fit: {
    label: "Title Fit",
    icon: "Target",
    description: "Current role alignment",
  },
  timing_score: {
    label: "Timing",
    icon: "Clock",
    description: "Career timing indicators",
  },
  culture_fit: {
    label: "Culture",
    icon: "Users",
    description: "Team and culture alignment",
  },
};

const getScoreColor = (score) => {
  if (score >= 80) return { ring: "#ef4444", text: "text-red-400", border: "border-red-500/50", bg: "bg-red-500/10" };
  if (score >= 60) return { ring: "#dc2626", text: "text-red-500", border: "border-red-600/50", bg: "bg-red-600/10" };
  if (score >= 40) return { ring: "#b91c1c", text: "text-red-600", border: "border-red-700/50", bg: "bg-red-700/10" };
  return { ring: "#991b1b", text: "text-red-700", border: "border-red-800/50", bg: "bg-red-800/10" };
};

const RadialProgress = ({ score, color, size = 48 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${progress} ${circumference}` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedNumber value={score} color={color} />
      </div>
    </div>
  );
};

const AnimatedNumber = ({ value, color }) => {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const duration = 800;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="text-xs font-bold" style={{ color }}>
      {display}
    </span>
  );
};

const FactorCard = ({ factorKey, score, config, compact, index }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = ICONS[config.icon];
  const colors = getScoreColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}

      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative flex-shrink-0 ${compact ? "w-28" : "w-36"} bg-zinc-800/60 border border-zinc-700/50 rounded-xl ${compact ? "p-3" : "p-4"} hover:bg-zinc-800/80 transition-all cursor-default`}
      style={{ borderColor: showTooltip ? colors.ring + "80" : undefined }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !compact && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-xs max-w-48 z-20 pointer-events-none"
          >
            <p className="font-medium text-white mb-0.5">{config.label}</p>
            <p className="text-zinc-400">{config.description}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center text-center gap-2">
        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
          <Icon className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} ${colors.text}`} />
        </div>
        <RadialProgress score={score} color={colors.ring} size={compact ? 40 : 48} />
        <p className={`${compact ? "text-[10px]" : "text-xs"} font-medium text-zinc-300 leading-tight`}>
          {config.label}
        </p>
        {!compact && (
          <p className="text-[10px] text-zinc-500 leading-tight line-clamp-2">
            {config.description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

const MatchReasonCards = ({ factors, insights, compact = false, loading = false }) => {
  // Loading state
  if (loading) {
    return (
      <div className="flex gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 min-w-[7rem] h-24 bg-zinc-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!factors) return null;

  // Empty state
  const hasValidData = Object.values(factors).some((v) => v > 0);
  if (!hasValidData) {
    return (
      <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30 text-center">
        <p className="text-sm text-zinc-500">Match factors not yet analyzed</p>
      </div>
    );
  }

  const entries = Object.entries(FACTOR_CONFIG).filter(
    ([key]) => factors[key] != null
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        className={
          compact
            ? "flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
        }
      >
        {entries.map(([key, config], index) => (
          <FactorCard
            key={key}
            factorKey={key}
            score={factors[key]}
            config={config}
            compact={compact}
            index={index}
          />
        ))}
      </div>

      {insights && (insights.key_strengths?.length > 0 || insights.concerns?.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2"
        >
          {insights.key_strengths?.slice(0, 2).map((s, i) => (
            <span
              key={`s-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
            >
              {s}
            </span>
          ))}
          {insights.concerns?.slice(0, 2).map((c, i) => (
            <span
              key={`c-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 border border-red-600/20"
            >
              {c}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default MatchReasonCards;
