import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchReasonCards } from "@/components/talent/campaign";
import { INTELLIGENCE_SIGNALS } from "@/components/talent/campaign/SignalMatchingConfig";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Plus,
  Check,
  Sparkles,
  Clock,
  Lightbulb,
  Brain,
  Loader2,
  Package,
} from "lucide-react";

// Match Level Badge with colors
const MatchLevelBadge = ({ level, score }) => {
  const levelColors = {
    Excellent: "bg-red-500/30 text-red-300 border-red-500/30",
    Good: "bg-red-500/20 text-red-400 border-red-500/30",
    Fair: "bg-red-500/10 text-red-400/70 border-red-500/20",
    Poor: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const derivedLevel = level || (
    score >= 80 ? "Excellent" :
    score >= 60 ? "Good" :
    score >= 40 ? "Fair" : "Poor"
  );

  return (
    <Badge className={`border ${levelColors[derivedLevel] || levelColors.Fair}`}>
      {derivedLevel}
    </Badge>
  );
};

// Intelligence Status Indicator
const IntelligenceStatus = ({ candidate }) => {
  const hasIntelligence = candidate.intelligence_generated ||
    candidate.intelligence_score > 0 ||
    candidate.best_outreach_angle ||
    candidate.timing_signals?.length > 0;

  const isProcessing = candidate.intelligence_status === 'processing';

  if (hasIntelligence) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-400" title="Intelligence profile ready">
        <Brain className="w-3 h-3" />
        <span>Intel Ready</span>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-300 animate-pulse" title="Generating intelligence...">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Processing</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-zinc-500" title="Intelligence pending">
      <Clock className="w-3 h-3" />
      <span>Pending</span>
    </div>
  );
};

// Nest Source Badge
const NestSourceBadge = ({ nestName }) => {
  if (!nestName) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full" title={`From nest: ${nestName}`}>
      <Package className="w-3 h-3" />
      <span className="truncate max-w-[120px]">{nestName}</span>
    </div>
  );
};

// Signal badges for matched signals
const signalBgMap = {
  red: "bg-red-500/20", orange: "bg-red-500/20", purple: "bg-red-500/20",
  emerald: "bg-red-500/20", amber: "bg-red-500/20", blue: "bg-red-500/20",
  zinc: "bg-zinc-500/20", rose: "bg-red-500/20",
};
const signalTextMap = {
  red: "text-red-400", orange: "text-red-400", purple: "text-red-400",
  emerald: "text-red-400", amber: "text-red-400", blue: "text-red-400",
  zinc: "text-zinc-400", rose: "text-red-400",
};
const signalBorderMap = {
  red: "border-red-500/30", orange: "border-red-500/30", purple: "border-red-500/30",
  emerald: "border-red-500/30", amber: "border-red-500/30", blue: "border-red-500/30",
  zinc: "border-zinc-500/30", rose: "border-red-500/30",
};

const SignalBadges = ({ signals }) => {
  if (!signals || signals.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {signals.map((signal) => {
        const def = INTELLIGENCE_SIGNALS.find(s => s.id === signal.id);
        if (!def) return null;
        return (
          <div
            key={signal.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${signalBgMap[def.color]} ${signalTextMap[def.color]} ${signalBorderMap[def.color]}`}
          >
            <span>{def.label}</span>
            {signal.boost !== 0 && (
              <span className={signal.boost > 0 ? "text-red-400" : "text-red-300"}>
                {signal.boost > 0 ? "+" : ""}{signal.boost}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function CandidateMatchResultCard({ match, isSelected, onToggleSelect, onClick }) {
  const [expanded, setExpanded] = useState(false);

  const scoreColor = match.match_score >= 80 ? "text-red-300"
    : match.match_score >= 60 ? "text-red-400"
    : match.match_score >= 40 ? "text-red-400/70"
    : "text-red-500/60";

  const scoreBgColor = match.match_score >= 80 ? "from-red-500 to-red-600"
    : match.match_score >= 60 ? "from-red-600 to-red-700"
    : match.match_score >= 40 ? "from-red-700 to-red-800"
    : "from-red-800 to-red-900";

  const currentRole = match.current_role ||
    (match.current_title && match.current_company ? `${match.current_title} at ${match.current_company}` : null) ||
    match.ai_analysis?.split('.')[0] ||
    "Role not specified";

  const strengths = match.key_strengths || match.match_reasons?.slice(0, 3) || [];
  const concerns = match.potential_concerns || [];
  const reasoning = match.reasoning || match.ai_analysis || "";
  const outreachAngle = match.outreach_angle || match.best_outreach_angle || "";

  return (
    <motion.div
      layout
      className={`p-4 rounded-xl border transition-all ${
        isSelected
          ? "bg-red-500/10 border-red-500/30"
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${scoreBgColor} flex items-center justify-center text-white font-bold text-sm`}>
              {match.candidate_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${scoreColor} bg-zinc-900 border-2 border-zinc-800`}>
              {match.match_score || 0}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <button
              onClick={onClick}
              className="font-medium text-white hover:text-red-400 transition-colors block truncate text-left"
            >
              {match.candidate_name || "Unknown Candidate"}
            </button>
            <p className="text-sm text-zinc-400 truncate">{currentRole}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <IntelligenceStatus candidate={match} />
              <NestSourceBadge nestName={match.nest_source} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <MatchLevelBadge score={match.match_score} level={match.match_level} />
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={(e) => {
              e.preventDefault();
              onToggleSelect(match.candidate_id);
            }}
            className={isSelected ? "bg-red-500 hover:bg-red-600" : "border-zinc-700 hover:border-zinc-600"}
          >
            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Why This Match Section */}
      <div className="mt-4 pt-4 border-t border-zinc-700/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400" />
            Why This Match?
          </h4>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            {expanded ? "Hide Details" : "See Full Analysis"}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        <MatchReasonCards
          factors={match.match_factors || {
            skills_fit: match.match_score || 0,
            experience_fit: match.match_score || 0,
            title_fit: match.match_score || 0,
            timing_score: 50,
            culture_fit: 50,
          }}
          insights={{
            key_strengths: strengths,
            concerns: concerns,
          }}
          compact={!expanded}
        />

        {match.signals_matched?.length > 0 && (
          <div className="mt-2">
            <SignalBadges signals={match.signals_matched} />
            {match.signal_boost_applied > 0 && (
              <p className="mt-1 text-xs text-red-400">
                +{match.signal_boost_applied} from signals
              </p>
            )}
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {strengths.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-red-400 uppercase tracking-wider">Key Strengths</h5>
                    <ul className="space-y-1">
                      {strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {concerns.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-red-300 uppercase tracking-wider">Considerations</h5>
                    <ul className="space-y-1">
                      {concerns.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                          <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reasoning && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-red-400 uppercase tracking-wider">AI Reasoning</h5>
                    <p className="text-sm text-zinc-400 leading-relaxed">{reasoning}</p>
                  </div>
                )}

                {match.intelligence_score > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-xs text-red-400">Flight Risk / Timing Score</p>
                      <p className="text-sm text-white font-medium">
                        {match.intelligence_score}% - {match.recommended_approach === 'aggressive' ? 'Act Now!' : match.recommended_approach || 'Standard'}
                      </p>
                    </div>
                  </div>
                )}

                {outreachAngle && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Suggested Outreach Angle
                    </p>
                    <p className="text-sm text-white leading-relaxed">{outreachAngle}</p>
                  </div>
                )}

                {match.timing_signals?.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-red-400" />
                      Timing Signals
                    </p>
                    <div className="space-y-1">
                      {match.timing_signals.slice(0, 3).map((signal, i) => (
                        <div key={i} className={`text-xs px-2 py-1 rounded ${
                          signal.urgency === 'high' ? 'bg-red-500/20 text-red-300' :
                          signal.urgency === 'medium' ? 'bg-red-500/15 text-red-300' :
                          'bg-zinc-700/50 text-zinc-400'
                        }`}>
                          {signal.trigger}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Re-export helpers for use in CandidatesTab
export { MatchLevelBadge, IntelligenceStatus, NestSourceBadge, SignalBadges };
