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
  Lightbulb,
  MessageSquare,
  ArrowRight,
  Sparkles,
  FileText,
} from "lucide-react";
import { IntelligenceGauge, IntelligenceLevelBadge, UrgencyBadge, ApproachBadge } from "./IntelligenceGauge";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
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
 * SignalCard - Displays an intelligence factor/signal
 */
const SignalCard = ({ factor }) => {
  const impactStyles = {
    positive: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      icon: TrendingUp,
      iconColor: "text-green-400",
      badge: "bg-green-500/20 text-green-400"
    },
    negative: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: TrendingDown,
      iconColor: "text-red-400",
      badge: "bg-red-500/20 text-red-400"
    },
    neutral: {
      bg: "bg-white/[0.03]",
      border: "border-white/[0.06]",
      icon: Info,
      iconColor: "text-white/50",
      badge: "bg-white/10 text-white/60"
    },
  };

  const impact = factor.impact || "neutral";
  const style = impactStyles[impact] || impactStyles.neutral;
  const Icon = style.icon;

  return (
    <motion.div
      variants={itemVariants}
      className={`p-4 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.badge.split(' ')[0]}`}>
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-white text-sm">{factor.signal || "Signal"}</h4>
            {factor.weight && (
              <span className={`text-xs px-2 py-0.5 rounded ${style.badge}`}>
                +{factor.weight} pts
              </span>
            )}
          </div>
          <p className="text-sm text-white/60">{factor.insight || factor.description || factor}</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * TimingCard - Displays a timing signal
 */
const TimingCard = ({ signal }) => {
  const urgencyStyles = {
    high: { bg: "bg-red-500/10", border: "border-red-500/20", badge: "bg-red-500/20 text-red-400" },
    medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", badge: "bg-amber-500/20 text-amber-400" },
    low: { bg: "bg-blue-500/10", border: "border-blue-500/20", badge: "bg-blue-500/20 text-blue-400" },
  };

  const urgency = signal.urgency || "medium";
  const style = urgencyStyles[urgency] || urgencyStyles.medium;

  return (
    <motion.div
      variants={itemVariants}
      className={`p-4 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Clock className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-white text-sm">{signal.trigger || signal.description || signal}</h4>
            <span className={`text-xs px-2 py-0.5 rounded capitalize ${style.badge}`}>
              {urgency}
            </span>
          </div>
          {signal.window && (
            <p className="text-sm text-white/60">{signal.window}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * InsightCard - Displays key insights
 */
const InsightCard = ({ insights = [] }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <motion.div
      variants={itemVariants}
      className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-red-500/20">
          <Lightbulb className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="font-semibold text-white">Key Insights</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <ArrowRight className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-white/80">{insight}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

/**
 * OutreachHooksCard - Displays suggested outreach angles
 */
const OutreachHooksCard = ({ hooks = [], bestAngle }) => {
  if ((!hooks || hooks.length === 0) && !bestAngle) return null;

  return (
    <motion.div
      variants={itemVariants}
      className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <MessageSquare className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="font-semibold text-white">Outreach Hooks</h3>
      </div>

      {bestAngle && (
        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <p className="text-xs text-blue-400 font-medium mb-1">BEST OPENING ANGLE</p>
          <p className="text-sm text-white">{bestAngle}</p>
        </div>
      )}

      {hooks && hooks.length > 0 && (
        <ul className="space-y-2">
          {hooks.map((hook, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-sm text-white/80">{hook}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

/**
 * RecommendationCard - Displays engagement recommendation
 */
const RecommendationCard = ({ approach, timeline, summary }) => {
  const approachStyles = {
    immediate: {
      bg: "bg-gradient-to-br from-red-500/15 to-red-500/5",
      border: "border-red-500/30",
      iconBg: "bg-red-500/20",
      icon: Zap,
      iconColor: "text-red-400",
      title: "Immediate Outreach",
      description: "High receptiveness detected. Engage now."
    },
    targeted: {
      bg: "bg-gradient-to-br from-amber-500/15 to-amber-500/5",
      border: "border-amber-500/30",
      iconBg: "bg-amber-500/20",
      icon: Target,
      iconColor: "text-amber-400",
      title: "Targeted Engagement",
      description: "Good signals present. Personalized approach recommended."
    },
    nurture: {
      bg: "bg-gradient-to-br from-blue-500/15 to-blue-500/5",
      border: "border-blue-500/30",
      iconBg: "bg-blue-500/20",
      icon: TrendingUp,
      iconColor: "text-blue-400",
      title: "Long-term Nurturing",
      description: "Build relationship over time. Monitor for triggers."
    },
  };

  const style = approachStyles[approach] || approachStyles.nurture;
  const Icon = style.icon;

  return (
    <motion.div
      variants={itemVariants}
      className={`p-5 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${style.iconBg}`}>
          <Icon className={`w-6 h-6 ${style.iconColor}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white text-lg">{style.title}</h4>
          <p className="text-sm text-white/60 mt-1">{style.description}</p>
          {timeline && (
            <div className="flex items-center gap-2 mt-3 text-white/70">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{timeline}</span>
            </div>
          )}
        </div>
      </div>
      {summary && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-white/70">{summary}</p>
        </div>
      )}
    </motion.div>
  );
};

/**
 * IntelligenceReport - Full intelligence report for a candidate
 */
export const IntelligenceReport = ({ candidate, compact = false }) => {
  const {
    intelligence_score = 0,
    intelligence_level = "Low",
    intelligence_urgency = "Low",
    intelligence_factors: rawFactors = [],
    intelligence_timing: rawTiming = [],
    key_insights = [],
    outreach_hooks = [],
    risk_summary = "",
    best_outreach_angle = "",
    recommended_approach = "nurture",
    recommended_timeline = "",
    last_intelligence_update = null,
  } = candidate || {};

  // Ensure arrays
  const intelligence_factors = Array.isArray(rawFactors) ? rawFactors : (rawFactors?.signals || []);
  const intelligence_timing = Array.isArray(rawTiming) ? rawTiming : [];
  const insights = Array.isArray(key_insights) ? key_insights : [];
  const hooks = Array.isArray(outreach_hooks) ? outreach_hooks : [];

  // Separate by impact
  const positiveFactors = intelligence_factors.filter(f => f.impact === "positive");
  const negativeFactors = intelligence_factors.filter(f => f.impact === "negative");
  const neutralFactors = intelligence_factors.filter(f => !f.impact || f.impact === "neutral");

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
            {intelligence_factors.length} signals • {intelligence_timing.length} timing factors
          </p>
        </div>
      </div>
    );
  }

  const hasData = intelligence_factors.length > 0 || intelligence_timing.length > 0 || insights.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Score Overview */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
        <div className="flex items-center gap-6">
          <IntelligenceGauge score={intelligence_score} size="xl" showLabel />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <IntelligenceLevelBadge level={intelligence_level} />
              <UrgencyBadge urgency={intelligence_urgency} />
            </div>
            <p className="text-white/60 text-sm">
              {intelligence_factors.length} intelligence signals • {intelligence_timing.length} timing factors
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
        summary={risk_summary}
      />

      {/* Key Insights */}
      <InsightCard insights={insights} />

      {/* Outreach Hooks */}
      <OutreachHooksCard hooks={hooks} bestAngle={best_outreach_angle} />

      {/* Positive Signals (Recruitment Opportunities) */}
      {positiveFactors.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Recruitment Opportunities
            <span className="text-xs text-green-400/60 font-normal">({positiveFactors.length} signals)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {positiveFactors.map((factor, idx) => (
              <SignalCard key={idx} factor={factor} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Negative Signals (Challenges) */}
      {negativeFactors.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            Potential Challenges
            <span className="text-xs text-red-400/60 font-normal">({negativeFactors.length} signals)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {negativeFactors.map((factor, idx) => (
              <SignalCard key={idx} factor={factor} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Neutral Signals */}
      {neutralFactors.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-white/50" />
            Additional Context
            <span className="text-xs text-white/40 font-normal">({neutralFactors.length} signals)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {neutralFactors.map((factor, idx) => (
              <SignalCard key={idx} factor={factor} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Timing Intelligence */}
      {intelligence_timing.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-400" />
            Timing Intelligence
            <span className="text-xs text-red-400/60 font-normal">({intelligence_timing.length} windows)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {intelligence_timing.map((signal, idx) => (
              <TimingCard key={idx} signal={signal} />
            ))}
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {!hasData && (
        <motion.div
          variants={itemVariants}
          className="text-center p-12 bg-white/[0.03] rounded-2xl border border-white/[0.06]"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Intelligence Data Yet</h3>
          <p className="text-white/50 max-w-md mx-auto">
            Click "Generate Intel" to run an AI-powered analysis and get actionable recruitment insights for this candidate.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default IntelligenceReport;
