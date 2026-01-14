import React from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  XCircle,
  Info,
  Zap,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Building2,
  MapPin,
} from "lucide-react";
import { IntelligenceGauge, IntelligenceLevelBadge, UrgencyBadge, ApproachBadge } from "./IntelligenceGauge";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

/**
 * FactorCard - Displays a single intelligence factor
 */
const FactorCard = ({ factor, type = "risk" }) => {
  const typeStyles = {
    risk: { 
      bg: "bg-red-500/10", 
      border: "border-red-500/20", 
      icon: AlertTriangle,
      iconColor: "text-red-400"
    },
    opportunity: { 
      bg: "bg-green-500/10", 
      border: "border-green-500/20", 
      icon: TrendingUp,
      iconColor: "text-green-400"
    },
    neutral: { 
      bg: "bg-white/5", 
      border: "border-white/10", 
      icon: Info,
      iconColor: "text-white/60"
    },
  };

  const style = typeStyles[type] || typeStyles.neutral;
  const Icon = style.icon;

  return (
    <motion.div 
      variants={itemVariants}
      className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <div>
        <p className="text-sm text-white/80">{factor.description || factor}</p>
        {factor.weight && (
          <p className="text-xs text-white/40 mt-1">Impact: {factor.weight}%</p>
        )}
      </div>
    </motion.div>
  );
};

/**
 * TimingSignal - Displays a timing-related intelligence signal
 */
const TimingSignal = ({ signal }) => {
  const getIcon = (type) => {
    switch (type) {
      case "anniversary": return Calendar;
      case "promotion": return TrendingUp;
      case "tenure": return Briefcase;
      case "education": return GraduationCap;
      case "achievement": return Award;
      case "company": return Building2;
      case "location": return MapPin;
      default: return Clock;
    }
  };

  const Icon = getIcon(signal.type);

  return (
    <motion.div 
      variants={itemVariants}
      className="flex items-start gap-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg"
    >
      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-white/80">{signal.description || signal}</p>
        {signal.date && (
          <p className="text-xs text-white/40 mt-1">{signal.date}</p>
        )}
      </div>
      {signal.relevance && (
        <span className="text-xs text-violet-400 font-medium">{signal.relevance}</span>
      )}
    </motion.div>
  );
};

/**
 * RecommendationCard - Displays engagement recommendation
 */
const RecommendationCard = ({ approach, timeline, reasoning }) => {
  const approachStyles = {
    immediate: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      iconBg: "bg-red-500/20",
      icon: Zap,
      iconColor: "text-red-400",
      title: "Immediate Outreach Required",
      description: "High flight risk detected. Engage within 24-48 hours."
    },
    targeted: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      iconBg: "bg-violet-500/20",
      icon: Target,
      iconColor: "text-violet-400",
      title: "Targeted Engagement",
      description: "Strong opportunity signals. Personalized approach recommended."
    },
    nurture: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      iconBg: "bg-blue-500/20",
      icon: TrendingUp,
      iconColor: "text-blue-400",
      title: "Long-term Nurturing",
      description: "Build relationship over time. Monitor for timing signals."
    },
  };

  const style = approachStyles[approach] || approachStyles.nurture;
  const Icon = style.icon;

  return (
    <motion.div 
      variants={itemVariants}
      className={`p-4 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${style.iconBg}`}>
          <Icon className={`w-6 h-6 ${style.iconColor}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">{style.title}</h4>
          <p className="text-sm text-white/60 mt-1">{style.description}</p>
          {timeline && (
            <div className="flex items-center gap-2 mt-3">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/70">{timeline}</span>
            </div>
          )}
          {reasoning && (
            <p className="text-sm text-white/50 mt-2 italic">"{reasoning}"</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * IntelligenceReport - Full intelligence report for a candidate
 * 
 * @param {object} candidate - Candidate object with intelligence data
 * @param {boolean} compact - Use compact layout
 */
export const IntelligenceReport = ({ candidate, compact = false }) => {
  const {
    intelligence_score = 0,
    intelligence_level = "Low",
    intelligence_urgency = "Low",
    intelligence_factors = [],
    intelligence_timing = [],
    recommended_approach = "nurture",
    recommended_timeline = "",
    last_intelligence_update = null,
  } = candidate || {};

  // Separate risk factors and opportunities
  const riskFactors = intelligence_factors.filter(f => 
    typeof f === 'string' || f.type === 'risk' || !f.type
  );
  const opportunities = intelligence_factors.filter(f => 
    f.type === 'opportunity'
  );

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <IntelligenceGauge score={intelligence_score} size="md" />
        <div>
          <div className="flex items-center gap-2">
            <IntelligenceLevelBadge level={intelligence_level} size="sm" />
            <ApproachBadge approach={recommended_approach} />
          </div>
          <p className="text-xs text-white/40 mt-1">
            {riskFactors.length} risk factors • {intelligence_timing.length} timing signals
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Score Overview */}
      <motion.div variants={itemVariants} className="flex items-center justify-between p-6 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-6">
          <IntelligenceGauge score={intelligence_score} size="xl" showLabel />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <IntelligenceLevelBadge level={intelligence_level} />
              <UrgencyBadge urgency={intelligence_urgency} />
            </div>
            <p className="text-white/60 text-sm">
              Based on {riskFactors.length} risk factors and {intelligence_timing.length} timing signals
            </p>
            {last_intelligence_update && (
              <p className="text-white/40 text-xs mt-1">
                Last updated: {new Date(last_intelligence_update).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <ApproachBadge approach={recommended_approach} />
      </motion.div>

      {/* Recommendation */}
      <RecommendationCard 
        approach={recommended_approach}
        timeline={recommended_timeline}
      />

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Flight Risk Factors
          </h3>
          <div className="space-y-2">
            {riskFactors.map((factor, idx) => (
              <FactorCard key={idx} factor={factor} type="risk" />
            ))}
          </div>
        </motion.div>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Opportunity Signals
          </h3>
          <div className="space-y-2">
            {opportunities.map((factor, idx) => (
              <FactorCard key={idx} factor={factor} type="opportunity" />
            ))}
          </div>
        </motion.div>
      )}

      {/* Timing Signals */}
      {intelligence_timing.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-400" />
            Timing Intelligence
          </h3>
          <div className="space-y-2">
            {intelligence_timing.map((signal, idx) => (
              <TimingSignal key={idx} signal={signal} />
            ))}
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {riskFactors.length === 0 && intelligence_timing.length === 0 && (
        <motion.div 
          variants={itemVariants}
          className="text-center p-8 bg-white/5 rounded-xl border border-white/10"
        >
          <Info className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Intelligence Data Yet</h3>
          <p className="text-white/60">
            Run an intelligence analysis to generate flight risk insights for this candidate.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default IntelligenceReport;
