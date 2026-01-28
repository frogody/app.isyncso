import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Mail,
  ExternalLink,
  MessageSquare,
  UserPlus,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Brain,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "./IntelligenceGauge";
import { createPageUrl } from "@/utils";

/**
 * MatchScoreRing - Circular progress indicator for match score
 */
const MatchScoreRing = ({ score, size = "md" }) => {
  const sizes = {
    sm: { width: 40, height: 40, strokeWidth: 3, fontSize: "text-xs" },
    md: { width: 56, height: 56, strokeWidth: 4, fontSize: "text-sm" },
    lg: { width: 72, height: 72, strokeWidth: 5, fontSize: "text-lg" },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score) => {
    if (score >= 80) return { stroke: "#22c55e", text: "text-green-400", glow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]" };
    if (score >= 60) return { stroke: "#ef4444", text: "text-red-400", glow: "shadow-[0_0_12px_rgba(239,68,68,0.4)]" };
    if (score >= 40) return { stroke: "#eab308", text: "text-yellow-400", glow: "shadow-[0_0_12px_rgba(234,179,8,0.3)]" };
    return { stroke: "#64748b", text: "text-slate-400", glow: "" };
  };

  const config = getColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ${config.glow}`}>
      <svg width={width} height={height} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={config.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`${fontSize} font-bold ${config.text}`}>{score}%</span>
      </div>
    </div>
  );
};

/**
 * MatchFactorsBar - Mini visualization of match factors
 */
const MatchFactorsBar = ({ factors, size = "default" }) => {
  if (!factors) return null;

  const getBarColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTextColor = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const factorData = [
    { key: "skills_fit", label: "Skills" },
    { key: "experience_fit", label: "Experience" },
    { key: "title_fit", label: "Title" },
    { key: "timing_score", label: "Timing" },
    { key: "culture_fit", label: "Culture" },
  ];

  const barHeight = size === "compact" ? "h-8" : "h-12";

  return (
    <div className={`flex items-end gap-1 ${barHeight}`}>
      {factorData.map(({ key, label }, idx) => {
        const score = factors[key] ?? 0;
        const height = Math.max(10, score);

        return (
          <div key={key} className="group relative flex-1">
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <span className="text-zinc-300">{label}:</span>
              <span className={`ml-1 font-medium ${getTextColor(score)}`}>{score}%</span>
            </div>

            {/* Bar */}
            <motion.div
              className={`w-full rounded-t ${getBarColor(score)}`}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * MatchReasonBadge - Individual match reason display
 */
const MatchReasonBadge = ({ reason }) => {
  const getIcon = (reason) => {
    const lower = reason.toLowerCase();
    if (lower.includes("title") || lower.includes("alignment")) return TrendingUp;
    if (lower.includes("skill")) return Sparkles;
    if (lower.includes("location")) return MapPin;
    if (lower.includes("flight risk") || lower.includes("timing")) return AlertTriangle;
    if (lower.includes("department")) return Building2;
    return CheckCircle2;
  };

  const Icon = getIcon(reason);

  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <span className="text-white/70">{reason}</span>
    </div>
  );
};

/**
 * CandidateMatchCard - Shows a matched candidate with their score and reasons
 *
 * @param {object} match - Match object with candidate data, score, and reasons
 * @param {object} candidate - Full candidate object (if loaded separately)
 * @param {function} onAddToOutreach - Callback when adding to outreach
 * @param {function} onContact - Callback for contacting candidate
 * @param {boolean} isCompact - Use compact layout
 * @param {boolean} showActions - Show action buttons
 */
export const CandidateMatchCard = ({
  match,
  candidate,
  onAddToOutreach,
  onContact,
  isCompact = false,
  showActions = true,
}) => {
  // Merge match data with candidate data
  const data = candidate || match;
  const matchScore = match?.match_score || 0;
  const matchReasons = match?.match_reasons || [];
  const status = match?.status || "matched";

  const statusStyles = {
    matched: { bg: "bg-red-500/20", text: "text-red-400", label: "Matched" },
    pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pending" },
    contacted: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Contacted" },
    sent: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Sent" },
    replied: { bg: "bg-green-500/20", text: "text-green-400", label: "Replied" },
    scheduled: { bg: "bg-cyan-500/20", text: "text-cyan-400", label: "Scheduled" },
    declined: { bg: "bg-red-500/20", text: "text-red-400", label: "Declined" },
  };

  const statusStyle = statusStyles[status] || statusStyles.matched;

  const initials = data?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "??";

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-3 bg-zinc-800/30 border border-zinc-700/30 rounded-lg hover:border-red-500/30 transition-all"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`${createPageUrl("TalentCandidateProfile")}?id=${data?.id || match?.candidate_id}`}
              className="font-medium text-white hover:text-red-400 transition-colors truncate"
            >
              {data?.name || match?.candidate_name || "Unknown"}
            </Link>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-xs text-zinc-500 truncate">
            {data?.current_title || "Title"} at {data?.current_company || "Company"}
          </p>
        </div>

        {/* Match Score */}
        <div className="flex items-center gap-3">
          <MatchScoreRing score={matchScore} size="sm" />
          <IntelligenceGauge score={data?.intelligence_score || match?.intelligence_score || 0} size="sm" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5 hover:border-red-500/30 transition-all"
    >
      {/* Header Row */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
          {initials}
        </div>

        {/* Basic Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`${createPageUrl("TalentCandidateProfile")}?id=${data?.id || match?.candidate_id}`}
              className="text-lg font-semibold text-white hover:text-red-400 transition-colors"
            >
              {data?.name || match?.candidate_name || "Unknown Candidate"}
            </Link>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
            {(data?.current_title || data?.current_company) && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {data?.current_title && `${data.current_title}`}
                {data?.current_title && data?.current_company && " at "}
                {data?.current_company}
              </span>
            )}
            {data?.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {data.location}
              </span>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <MatchScoreRing score={matchScore} size="md" />
            <p className="text-xs text-zinc-500 mt-1">Match</p>
          </div>
          <div className="text-center">
            <IntelligenceGauge
              score={data?.intelligence_score || match?.intelligence_score || 0}
              size="md"
            />
            <p className="text-xs text-zinc-500 mt-1">Flight Risk</p>
          </div>
        </div>
      </div>

      {/* AI Analysis Summary */}
      {match?.ai_analysis && match.ai_analysis !== "Quick match (not AI-analyzed)" && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-medium mb-2">
            <Brain className="w-3.5 h-3.5" />
            AI Analysis
          </div>
          <p className="text-white text-sm leading-relaxed">{match.ai_analysis}</p>
        </div>
      )}

      {/* Match Factors Visualization */}
      {match?.match_factors && (
        <div className="mb-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-3">
            <BarChart3 className="w-3.5 h-3.5" />
            Match Breakdown
          </div>
          <MatchFactorsBar factors={match.match_factors} />
        </div>
      )}

      {/* Match Reasons */}
      {matchReasons.length > 0 && (
        <div className="mb-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
            Why they match
          </h4>
          <div className="space-y-1.5">
            {matchReasons.map((reason, idx) => (
              <MatchReasonBadge key={idx} reason={reason} />
            ))}
          </div>
        </div>
      )}

      {/* Best Approach - Intelligence insights for outreach */}
      {(data?.best_outreach_angle || match?.best_outreach_angle) && (
        <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            Best Approach
          </div>
          <p className="text-white text-sm leading-relaxed">
            {data?.best_outreach_angle || match?.best_outreach_angle}
          </p>

          {/* Timing hint if urgent */}
          {(data?.timing_signals?.[0]?.urgency === 'high' ||
            match?.timing_signals?.[0]?.urgency === 'high') && (
            <div className="mt-2 pt-2 border-t border-amber-500/20">
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span className="font-medium">Act Now:</span>
                {data?.timing_signals?.[0]?.trigger || match?.timing_signals?.[0]?.trigger}
              </p>
            </div>
          )}

          {/* Key outreach hook if available */}
          {(data?.outreach_hooks?.[0] || match?.outreach_hooks?.[0]) && (
            <div className="mt-2 pt-2 border-t border-amber-500/20">
              <p className="text-xs text-emerald-400 flex items-start gap-1.5">
                <Target className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium">Hook:</span>{" "}
                  {data?.outreach_hooks?.[0] || match?.outreach_hooks?.[0]}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Badges Row */}
      <div className="flex items-center gap-2 mb-4">
        <IntelligenceLevelBadge level={data?.intelligence_level || "Low"} size="sm" />
        <ApproachBadge approach={data?.recommended_approach || match?.recommended_approach || "nurture"} />
        {data?.skills?.slice(0, 2).map((skill, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 bg-zinc-700/50 text-zinc-300 rounded text-xs"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-700/30">
          <Link
            to={`${createPageUrl("TalentCandidateProfile")}?id=${data?.id || match?.candidate_id}`}
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            View Profile
            <ExternalLink className="w-3 h-3" />
          </Link>

          <div className="flex items-center gap-2">
            {onAddToOutreach && status === "matched" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddToOutreach(match)}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add to Outreach
              </Button>
            )}
            {onContact && (
              <Button
                size="sm"
                onClick={() => onContact(match)}
                className="bg-red-500 hover:bg-red-600"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Contact
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * CandidateMatchList - List of matched candidates
 */
export const CandidateMatchList = ({
  matches = [],
  candidates = [],
  isCompact = false,
  onAddToOutreach,
  onContact,
  emptyMessage = "No matches found",
}) => {
  // Create a map of candidates by ID for quick lookup
  const candidateMap = new Map(candidates.map(c => [c.id, c]));

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">{emptyMessage}</p>
        <p className="text-sm text-zinc-600 mt-1">
          Run AI matching to find suitable candidates
        </p>
      </div>
    );
  }

  return (
    <div className={isCompact ? "space-y-2" : "space-y-4"}>
      {matches.map((match, idx) => (
        <CandidateMatchCard
          key={match.candidate_id || idx}
          match={match}
          candidate={candidateMap.get(match.candidate_id)}
          isCompact={isCompact}
          onAddToOutreach={onAddToOutreach}
          onContact={onContact}
        />
      ))}
    </div>
  );
};

export default CandidateMatchCard;
