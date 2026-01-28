import React from "react";
import { motion } from "framer-motion";
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
  if (score >= 80) return { ring: "#22c55e", text: "text-green-400", border: "border-green-500/50", bg: "bg-green-500/10" };
  if (score >= 60) return { ring: "#eab308", text: "text-yellow-400", border: "border-yellow-500/50", bg: "bg-yellow-500/10" };
  if (score >= 40) return { ring: "#f97316", text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/10" };
  return { ring: "#ef4444", text: "text-red-400", border: "border-red-500/50", bg: "bg-red-500/10" };
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
    let start = 0;
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
  const Icon = ICONS[config.icon];
  const colors = getScoreColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      whileHover={{ scale: 1.03 }}
      className={`flex-shrink-0 ${compact ? "w-28" : "w-36"} bg-zinc-800/60 border border-zinc-700/50 rounded-xl ${compact ? "p-3" : "p-4"} hover:${colors.border} hover:bg-zinc-800/80 transition-all cursor-default`}
    >
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

const MatchReasonCards = ({ factors, insights, compact = false }) => {
  if (!factors) return null;

  const entries = Object.entries(FACTOR_CONFIG).filter(
    ([key]) => factors[key] != null
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
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
              className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20"
            >
              {s}
            </span>
          ))}
          {insights.concerns?.slice(0, 2).map((c, i) => (
            <span
              key={`c-${i}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
