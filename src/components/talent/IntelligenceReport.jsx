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
  ChevronRight,
  Timer,
  Shield,
  AlertCircle,
} from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * ScoreRing - Compact circular score indicator
 */
const ScoreRing = ({ score, size = "md" }) => {
  const sizes = {
    sm: { width: 48, stroke: 4, text: "text-sm" },
    md: { width: 64, stroke: 5, text: "text-lg" },
    lg: { width: 80, stroke: 6, text: "text-xl" },
  };

  const { width, stroke, text } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 70) return { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.3)" };
    if (s >= 40) return { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.2)" };
    return { ring: "#ef4444", glow: "rgba(239, 68, 68, 0.1)" };
  };

  const colors = getColor(score);

  return (
    <div className="relative" style={{ width, height: width }}>
      <svg width={width} height={width} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={colors.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold text-white ${text}`}>{score}</span>
      </div>
    </div>
  );
};

/**
 * StatusBadge - Compact status indicator
 */
const StatusBadge = ({ type, value }) => {
  const styles = {
    level: {
      Critical: "bg-red-500/20 text-red-400 border-red-500/30",
      High: "bg-red-500/30 text-red-400 border-red-500/30",
      Medium: "bg-red-500/20 text-red-400 border-red-500/30",
      Low: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    urgency: {
      High: "bg-red-500/20 text-red-400 border-red-500/30",
      Medium: "bg-red-500/20 text-red-400 border-red-500/30",
      Low: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    approach: {
      immediate: "bg-red-500/20 text-red-400 border-red-500/30",
      targeted: "bg-red-500/20 text-red-400 border-red-500/30",
      nurture: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };

  const labels = {
    approach: {
      immediate: "Act Now",
      targeted: "Target",
      nurture: "Nurture",
    },
  };

  const style = styles[type]?.[value] || "bg-white/10 text-white/60 border-white/20";
  const label = labels[type]?.[value] || value;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${style}`}>
      {label}
    </span>
  );
};

/**
 * SignalRow - Compact signal display
 */
const SignalRow = ({ signal, impact }) => {
  const impactStyles = {
    positive: { icon: TrendingUp, color: "text-red-400", bg: "bg-red-500/10" },
    negative: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
    neutral: { icon: Info, color: "text-white/40", bg: "bg-white/5" },
  };

  const style = impactStyles[impact] || impactStyles.neutral;
  const Icon = style.icon;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${style.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{signal.signal}</p>
        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{signal.insight || signal.description}</p>
      </div>
      {signal.weight && (
        <span className={`text-xs font-medium flex-shrink-0 ${
          impact === "positive" ? "text-red-400" :
          impact === "negative" ? "text-red-400" : "text-white/40"
        }`}>
          {impact === "positive" ? "+" : impact === "negative" ? "-" : ""}{Math.abs(signal.weight)}
        </span>
      )}
    </div>
  );
};

/**
 * TimingRow - Compact timing display
 */
const TimingRow = ({ timing }) => {
  const urgencyStyles = {
    high: "text-red-400",
    medium: "text-red-400",
    low: "text-red-400",
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Timer className="w-3.5 h-3.5 text-white/40 flex-shrink-0 mt-0.5" />
        <span className="text-sm text-white">{timing.trigger || timing.description}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {timing.window && <span className="text-xs text-white/40 whitespace-nowrap">{timing.window}</span>}
        <span className={`text-xs font-medium capitalize whitespace-nowrap ${urgencyStyles[timing.urgency] || "text-white/40"}`}>
          {timing.urgency || "—"}
        </span>
      </div>
    </div>
  );
};

/**
 * IntelligenceReport - Professional recruiter intelligence dashboard
 */
export const IntelligenceReport = ({ candidate, compact = false, singleColumn = false, onGenerate, isGenerating = false, syncStatus = "", isSectionEnabled = () => true }) => {
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
    // New company-correlation fields
    inferred_skills: rawInferredSkills = [],
    company_pain_points: rawPainPoints = [],
    lateral_opportunities: rawLateralOpps = [],
    company_correlations: rawCorrelations = [],
  } = candidate || {};

  // Ensure arrays
  const intelligence_factors = Array.isArray(rawFactors) ? rawFactors : (rawFactors?.signals || []);
  const intelligence_timing = Array.isArray(rawTiming) ? rawTiming : [];
  const insights = Array.isArray(key_insights) ? key_insights : [];
  const hooks = Array.isArray(outreach_hooks) ? outreach_hooks : [];

  // Company-correlation arrays
  const inferredSkills = Array.isArray(rawInferredSkills) ? rawInferredSkills : [];
  const companyPainPoints = Array.isArray(rawPainPoints) ? rawPainPoints : [];
  const lateralOpportunities = Array.isArray(rawLateralOpps) ? rawLateralOpps : [];
  const companyCorrelations = Array.isArray(rawCorrelations) ? rawCorrelations : [];

  // Separate by impact
  const positiveFactors = intelligence_factors.filter(f => f.impact === "positive");
  const negativeFactors = intelligence_factors.filter(f => f.impact === "negative");
  const neutralFactors = intelligence_factors.filter(f => !f.impact || f.impact === "neutral");

  // Calculate totals
  const positivePoints = positiveFactors.reduce((sum, f) => sum + (f.weight || 0), 0);
  const negativePoints = negativeFactors.reduce((sum, f) => sum + (f.weight || 0), 0);

  const hasData = intelligence_factors.length > 0 || intelligence_timing.length > 0 || insights.length > 0;

  // Compact view for inline display
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <ScoreRing score={intelligence_score} size="sm" />
        <div>
          <div className="flex items-center gap-1.5">
            <StatusBadge type="level" value={intelligence_level} />
            <StatusBadge type="approach" value={recommended_approach} />
          </div>
          <p className="text-xs text-white/40 mt-1">
            {intelligence_factors.length} signals
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!hasData) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center py-16"
      >
        <motion.div variants={itemVariants} className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">No Intelligence Report Yet</h3>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Generate an AI-powered intelligence report to discover recruitment timing, outreach strategies, and key insights about this candidate.
          </p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {syncStatus === "company" ? "SYNCING COMPANY..." :
                   syncStatus === "candidate" ? "ANALYZING CANDIDATE..." :
                   "SYNCING..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  SYNC INTEL
                </>
              )}
            </button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Row 1: Executive Summary + Best Opening */}
      {(isSectionEnabled('intelligence', 'flight_risk_score') || isSectionEnabled('intelligence', 'best_outreach_angle')) && (
        <div className={`grid grid-cols-1 ${singleColumn ? '' : 'lg:grid-cols-3'} gap-4`}>
          {/* Left: Score & Status */}
          {isSectionEnabled('intelligence', 'flight_risk_score') && (
            <motion.div
              variants={itemVariants}
              className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-5"
            >
              <div className="flex items-start gap-4">
                <ScoreRing score={intelligence_score} size="lg" />
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <StatusBadge type="level" value={intelligence_level} />
                    <StatusBadge type="urgency" value={intelligence_urgency} />
                    <StatusBadge type="approach" value={recommended_approach} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Timeline</span>
                      <span className="text-white font-medium">{recommended_timeline || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Signals</span>
                      <span className="text-white font-medium">{intelligence_factors.length}</span>
                    </div>
                  </div>
                </div>
              </div>
              {last_intelligence_update && (
                <p className="text-xs text-white/30 mt-3 pt-3 border-t border-white/[0.06]">
                  Updated {new Date(last_intelligence_update).toLocaleDateString()}
                </p>
              )}
            </motion.div>
          )}

          {/* Right: Best Opening Angle + Hooks */}
          {isSectionEnabled('intelligence', 'best_outreach_angle') && (
            <motion.div
              variants={itemVariants}
              className={`${!singleColumn && isSectionEnabled('intelligence', 'flight_risk_score') ? 'lg:col-span-2' : !singleColumn ? 'lg:col-span-3' : ''} bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent rounded-xl border border-red-500/20 p-5`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-red-500/20">
                  <MessageSquare className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="font-semibold text-white">Outreach Strategy</h3>
              </div>

              {best_outreach_angle && (
                <div className="bg-red-500/10 rounded-lg p-3 mb-4 border border-red-500/20">
                  <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">Best Opening</p>
                  <p className="text-white font-medium">{best_outreach_angle}</p>
                </div>
              )}

              {hooks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {hooks.slice(0, 3).map((hook, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03]">
                      <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-white/70 line-clamp-2">{hook}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Row 2: Risk Summary (if present) */}
      {risk_summary && (
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4"
        >
          <p className="text-sm text-white/70 leading-relaxed">{risk_summary}</p>
        </motion.div>
      )}

      {/* Row 3: Signals Grid */}
      <div className={`grid grid-cols-1 ${singleColumn ? '' : 'lg:grid-cols-2'} gap-4`}>
        {/* Opportunities */}
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-red-500/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-white text-sm">Opportunities</h3>
              <span className="text-xs text-white/40">({positiveFactors.length})</span>
            </div>
            {positivePoints > 0 && (
              <span className="text-xs font-semibold text-red-400">+{positivePoints} pts</span>
            )}
          </div>
          <div className="px-4 py-2 divide-y divide-white/[0.04]">
            {positiveFactors.length > 0 ? (
              positiveFactors.map((factor, idx) => (
                <SignalRow key={idx} signal={factor} impact="positive" />
              ))
            ) : (
              <p className="text-sm text-white/30 py-4 text-center">No opportunities identified</p>
            )}
          </div>
        </motion.div>

        {/* Challenges */}
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-red-500/5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-white text-sm">Challenges</h3>
              <span className="text-xs text-white/40">({negativeFactors.length})</span>
            </div>
            {negativePoints > 0 && (
              <span className="text-xs font-semibold text-red-400">-{negativePoints} pts</span>
            )}
          </div>
          <div className="px-4 py-2 divide-y divide-white/[0.04]">
            {negativeFactors.length > 0 ? (
              negativeFactors.map((factor, idx) => (
                <SignalRow key={idx} signal={factor} impact="negative" />
              ))
            ) : (
              <p className="text-sm text-white/30 py-4 text-center">No challenges identified</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 4: Timing + Insights */}
      {(isSectionEnabled('intelligence', 'timing_signals') || isSectionEnabled('intelligence', 'key_insights')) && (
        <div className={`grid grid-cols-1 ${singleColumn ? '' : 'lg:grid-cols-2'} gap-4`}>
          {/* Timing Windows */}
          {isSectionEnabled('intelligence', 'timing_signals') && (
            <motion.div
              variants={itemVariants}
              className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-amber-500/5">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">Timing Windows</h3>
                <span className="text-xs text-white/40">({intelligence_timing.length})</span>
              </div>
              <div className="px-4 py-2 divide-y divide-white/[0.04]">
                {intelligence_timing.length > 0 ? (
                  intelligence_timing.map((timing, idx) => (
                    <TimingRow key={idx} timing={timing} />
                  ))
                ) : (
                  <p className="text-sm text-white/30 py-4 text-center">No timing signals</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Key Insights */}
          {isSectionEnabled('intelligence', 'key_insights') && (
            <motion.div
              variants={itemVariants}
              className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-red-500/5">
                <Lightbulb className="w-4 h-4 text-red-400" />
                <h3 className="font-semibold text-white text-sm">Key Insights</h3>
                <span className="text-xs text-white/40">({insights.length})</span>
              </div>
              <div className="px-4 py-2">
                {insights.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 py-1">
                        <ChevronRight className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-white/70">{insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/30 py-4 text-center">No insights available</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Row 5: Company Correlations (when available) */}
      {isSectionEnabled('intelligence', 'company_correlations') && companyCorrelations.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-xl border border-amber-500/20 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-white text-sm">Company-Candidate Correlations</h3>
            <span className="text-xs text-amber-400/70 ml-auto">AI-Powered Insights</span>
          </div>
          <div className="p-4 space-y-4">
            {companyCorrelations.map((correlation, idx) => (
              <div key={idx} className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-amber-400/70 uppercase tracking-wider font-semibold">Observation</p>
                    <p className="text-sm text-white/90">{correlation.observation}</p>
                    <p className="text-xs text-red-400/70 uppercase tracking-wider font-semibold mt-3">Inference</p>
                    <p className="text-sm text-white/80">{correlation.inference}</p>
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <p className="text-xs text-red-400/70 uppercase tracking-wider font-semibold">Outreach Angle</p>
                      <p className="text-sm text-red-300">{correlation.outreach_angle}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Row 6: Inferred Skills + Company Pain Points + Lateral Opportunities */}
      {((isSectionEnabled('intelligence', 'inferred_skills') && inferredSkills.length > 0) ||
        (isSectionEnabled('intelligence', 'employer_pain_points') && companyPainPoints.length > 0) ||
        (isSectionEnabled('intelligence', 'lateral_opportunities') && lateralOpportunities.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Inferred Skills */}
          {isSectionEnabled('intelligence', 'inferred_skills') && inferredSkills.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-red-500/5">
                <Award className="w-4 h-4 text-red-400" />
                <h3 className="font-semibold text-white text-sm">Inferred Skills</h3>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {inferredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Company Pain Points */}
          {isSectionEnabled('intelligence', 'employer_pain_points') && companyPainPoints.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-red-500/5">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="font-semibold text-white text-sm">Company Pain Points</h3>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {companyPainPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-white/70">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Lateral Opportunities */}
          {isSectionEnabled('intelligence', 'lateral_opportunities') && lateralOpportunities.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-red-500/5">
                <Building2 className="w-4 h-4 text-red-400" />
                <h3 className="font-semibold text-white text-sm">Lateral Opportunities</h3>
              </div>
              <div className="p-4">
                <p className="text-xs text-white/50 mb-2">Competitor companies to mention:</p>
                <div className="flex flex-wrap gap-2">
                  {lateralOpportunities.map((company, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20 rounded-lg"
                    >
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Row 7: Additional Context (if any neutral signals) */}
      {neutralFactors.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            <Info className="w-4 h-4 text-white/40" />
            <h3 className="font-semibold text-white text-sm">Additional Context</h3>
            <span className="text-xs text-white/40">({neutralFactors.length})</span>
          </div>
          <div className="px-4 py-2 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 divide-white/[0.04]">
            {neutralFactors.map((factor, idx) => (
              <div key={idx} className={idx % 2 === 1 ? "lg:border-l lg:border-white/[0.04] lg:pl-4" : ""}>
                <SignalRow signal={factor} impact="neutral" />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default IntelligenceReport;
