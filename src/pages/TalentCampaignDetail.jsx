import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CampaignSequenceEditor from "@/components/campaigns/CampaignSequenceEditor";
import CampaignMetricsPanel from "@/components/campaigns/CampaignMetricsPanel";
import { OutreachPipeline, OutreachQueue } from "@/components/talent";
import {
  Megaphone,
  Settings,
  List,
  Users,
  BarChart3,
  ArrowLeft,
  Save,
  Loader2,
  Play,
  Pause,
  Trash2,
  Copy,
  Mail,
  Linkedin,
  Phone,
  Zap,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Eye,
  Sparkles,
  Package,
  ExternalLink,
  ChevronDown,
  Plus,
  Check,
  AlertCircle,
  Lightbulb,
  Brain,
  Filter,
} from "lucide-react";
import { createPageUrl } from "@/utils";

const CAMPAIGN_TYPES = [
  { value: "email", label: "Email", icon: Mail },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "cold_call", label: "Cold Call", icon: Phone },
  { value: "multi_channel", label: "Multi-Channel", icon: Zap },
];

const CAMPAIGN_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-red-500/20 text-red-400",
    paused: "bg-red-800/30 text-red-300",
    draft: "bg-zinc-500/20 text-zinc-400",
    completed: "bg-red-600/20 text-red-400",
    archived: "bg-zinc-500/20 text-zinc-500",
  };

  return (
    <Badge className={styles[status] || styles.draft}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
};

// Type Badge
const TypeBadge = ({ type }) => {
  const styles = {
    email: { bg: "bg-red-500/20", text: "text-red-400", icon: Mail },
    linkedin: { bg: "bg-red-500/20", text: "text-red-400", icon: Linkedin },
    cold_call: { bg: "bg-red-500/20", text: "text-red-400", icon: Phone },
    multi_channel: { bg: "bg-red-500/20", text: "text-red-400", icon: Zap },
  };

  const style = styles[type] || styles.email;
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${style.bg} ${style.text}`}>
      <Icon className="w-4 h-4" />
      {type?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
};

// Match Level Badge with colors
const MatchLevelBadge = ({ level, score }) => {
  const levelColors = {
    Excellent: "bg-green-500/20 text-green-400 border-green-500/30",
    Good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Fair: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Poor: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  // Derive level from score if not provided
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

// CandidateMatchResultCard - Detailed match display with AI reasoning
const CandidateMatchResultCard = ({ match, isSelected, onToggleSelect }) => {
  const [expanded, setExpanded] = useState(false);

  const scoreColor = match.match_score >= 80 ? "text-green-400"
    : match.match_score >= 60 ? "text-blue-400"
    : match.match_score >= 40 ? "text-yellow-400"
    : "text-red-400";

  const scoreBgColor = match.match_score >= 80 ? "from-green-500 to-green-600"
    : match.match_score >= 60 ? "from-blue-500 to-blue-600"
    : match.match_score >= 40 ? "from-yellow-500 to-yellow-600"
    : "from-red-500 to-red-600";

  // Get current role from various possible fields
  const currentRole = match.current_role ||
    (match.current_title && match.current_company ? `${match.current_title} at ${match.current_company}` : null) ||
    match.ai_analysis?.split('.')[0] ||
    "Role not specified";

  // Get key strengths - could be from match_reasons or key_strengths
  const strengths = match.key_strengths || match.match_reasons?.slice(0, 3) || [];

  // Get concerns - from potential_concerns or match_factors
  const concerns = match.potential_concerns || [];

  // Get reasoning - from reasoning field or ai_analysis
  const reasoning = match.reasoning || match.ai_analysis || "";

  // Get outreach angle - from outreach_angle or best_outreach_angle
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
          {/* Avatar with score overlay */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${scoreBgColor} flex items-center justify-center text-white font-bold text-sm`}>
              {match.candidate_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${scoreColor} bg-zinc-900 border-2 border-zinc-800`}>
              {match.match_score || 0}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={`${createPageUrl("TalentCandidateProfile")}?id=${match.candidate_id}`}
              className="font-medium text-white hover:text-red-400 transition-colors block truncate"
            >
              {match.candidate_name || "Unknown Candidate"}
            </Link>
            <p className="text-sm text-zinc-400 truncate">{currentRole}</p>
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

      {/* Match Factors Quick View */}
      {match.match_factors && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {Object.entries(match.match_factors).slice(0, 4).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <span className="text-zinc-500">{key.replace('_', ' ')}:</span>
              <span className={value >= 70 ? "text-green-400" : value >= 50 ? "text-yellow-400" : "text-zinc-400"}>
                {value}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable Details Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Hide" : "Show"} AI Analysis
      </button>

      {/* Expandable Details Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3">
              {/* Key Strengths */}
              {strengths.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    Key Strengths
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {strengths.map((s, i) => (
                      <Badge key={i} className="bg-green-500/20 text-green-400 border-green-500/20 text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Potential Concerns */}
              {concerns.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    Potential Concerns
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {concerns.map((c, i) => (
                      <Badge key={i} className="bg-amber-500/20 text-amber-400 border-amber-500/20 text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {reasoning && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                    <Brain className="w-3 h-3 text-purple-400" />
                    AI Analysis
                  </p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{reasoning}</p>
                </div>
              )}

              {/* Intelligence Score */}
              {match.intelligence_score > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-purple-400">Flight Risk / Timing Score</p>
                    <p className="text-sm text-white font-medium">
                      {match.intelligence_score}% - {match.recommended_approach === 'aggressive' ? 'Act Now!' : match.recommended_approach || 'Standard'}
                    </p>
                  </div>
                </div>
              )}

              {/* Outreach Angle */}
              {outreachAngle && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-xs text-cyan-400 mb-1 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Suggested Outreach Angle
                  </p>
                  <p className="text-sm text-white leading-relaxed">{outreachAngle}</p>
                </div>
              )}

              {/* Timing Signals */}
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
                        signal.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
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
    </motion.div>
  );
};

// Overview Tab Component
const OverviewTab = ({ campaign, formData, stats, onRunMatching, isMatching, linkedNest, nestCandidates, selectedCandidates, onToggleCandidateSelect, onSelectAllExcellent }) => {
  const matchedCandidates = campaign?.matched_candidates || [];
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [matchFilter, setMatchFilter] = useState("All");
  const [viewMode, setViewMode] = useState("detailed"); // "detailed" or "compact"

  // Sort and derive match levels
  const sortedCandidates = useMemo(() => {
    return [...matchedCandidates]
      .map(m => ({
        ...m,
        match_level: m.match_level || (
          m.match_score >= 80 ? "Excellent" :
          m.match_score >= 60 ? "Good" :
          m.match_score >= 40 ? "Fair" : "Poor"
        ),
      }))
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [matchedCandidates]);

  // Filter by match level
  const filteredMatches = useMemo(() => {
    if (matchFilter === "All") return sortedCandidates;
    return sortedCandidates.filter(m => m.match_level === matchFilter);
  }, [sortedCandidates, matchFilter]);

  // Calculate stats by level
  const levelCounts = useMemo(() => ({
    All: sortedCandidates.length,
    Excellent: sortedCandidates.filter(m => m.match_level === "Excellent").length,
    Good: sortedCandidates.filter(m => m.match_level === "Good").length,
    Fair: sortedCandidates.filter(m => m.match_level === "Fair").length,
    Poor: sortedCandidates.filter(m => m.match_level === "Poor").length,
  }), [sortedCandidates]);

  // Calculate average score
  const avgScore = sortedCandidates.length > 0
    ? Math.round(sortedCandidates.reduce((sum, m) => sum + (m.match_score || 0), 0) / sortedCandidates.length)
    : 0;

  const displayedCandidates = showAllCandidates ? filteredMatches : filteredMatches.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Linked Nest Banner */}
      {linkedNest && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Package className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-cyan-400 uppercase tracking-wider font-medium">Sourcing from Nest</p>
                <p className="text-lg font-semibold text-white">{linkedNest.name}</p>
                <p className="text-sm text-zinc-400">
                  {nestCandidates.length} candidates available for matching
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`${createPageUrl("TalentNestDetail")}?id=${linkedNest.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Nest
              </Link>
              <Button
                onClick={onRunMatching}
                disabled={isMatching || nestCandidates.length === 0}
                className="bg-red-500 hover:bg-red-600"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Matching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run AI Matching
                  </>
                )}
              </Button>
            </div>
          </div>
          {nestCandidates.length > 0 && matchedCandidates.length === 0 && (
            <div className="mt-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
              <p className="text-sm text-zinc-400">
                <Sparkles className="w-4 h-4 inline mr-2 text-red-400" />
                Click "Run AI Matching" to analyze {nestCandidates.length} candidates against your role context and find the best fits.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Campaign Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Info */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-red-400" />
              Campaign Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Description</label>
                <p className="text-white/80 mt-1">
                  {formData.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Type</label>
                  <div className="mt-1">
                    <TypeBadge type={formData.campaign_type} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={formData.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-700/50">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Daily Limit</label>
                  <p className="text-lg font-semibold text-white mt-1">{formData.daily_limit}</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Min Delay</label>
                  <p className="text-lg font-semibold text-white mt-1">{formData.delay_min_minutes} min</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Max Delay</label>
                  <p className="text-lg font-semibold text-white mt-1">{formData.delay_max_minutes} min</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Matched Candidates - Enhanced with AI Reasoning */}
          <GlassCard className="p-6">
            {/* Header with Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-400" />
                  Match Results
                </h3>
                {matchedCandidates.length > 0 && (
                  <p className="text-sm text-zinc-400 mt-1">
                    {matchedCandidates.length} candidates analyzed • Avg Score: {avgScore}
                    {selectedCandidates?.size > 0 && (
                      <span className="text-red-400 ml-2">• {selectedCandidates.size} selected</span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Bulk Add Excellent */}
                {levelCounts.Excellent > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSelectAllExcellent}
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Excellent ({levelCounts.Excellent})
                  </Button>
                )}

                {/* Run Matching (when not using nest banner) */}
                {!linkedNest && (formData.project_id || formData.role_id || campaign?.role_context) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRunMatching}
                    disabled={isMatching}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {isMatching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Matching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Run Matching
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {matchedCandidates.length > 0 ? (
              <div className="space-y-4">
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                  {["All", "Excellent", "Good", "Fair"].map((level) => {
                    const count = levelCounts[level] || 0;
                    const isActive = matchFilter === level;
                    const levelStyles = {
                      All: isActive ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white",
                      Excellent: isActive ? "bg-green-500/20 text-green-400" : "text-zinc-400 hover:text-green-400",
                      Good: isActive ? "bg-blue-500/20 text-blue-400" : "text-zinc-400 hover:text-blue-400",
                      Fair: isActive ? "bg-yellow-500/20 text-yellow-400" : "text-zinc-400 hover:text-yellow-400",
                    };

                    return (
                      <button
                        key={level}
                        onClick={() => setMatchFilter(level)}
                        disabled={count === 0 && level !== "All"}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${levelStyles[level]} ${
                          count === 0 && level !== "All" ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {level} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Match Cards Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {displayedCandidates.map((match, idx) => (
                    <CandidateMatchResultCard
                      key={match.candidate_id || idx}
                      match={match}
                      isSelected={selectedCandidates?.has(match.candidate_id)}
                      onToggleSelect={onToggleCandidateSelect}
                    />
                  ))}
                </div>

                {/* Show More/Less */}
                {filteredMatches.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllCandidates(!showAllCandidates)}
                    className="w-full text-zinc-400 hover:text-white"
                  >
                    {showAllCandidates
                      ? "Show less"
                      : `Show all ${filteredMatches.length} ${matchFilter !== "All" ? matchFilter.toLowerCase() : ""} matches`}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 mb-2">No matched candidates yet</p>
                {linkedNest ? (
                  <p className="text-xs text-zinc-600">
                    Click "Run AI Matching" above to analyze {nestCandidates.length} candidates from your nest
                  </p>
                ) : formData.project_id || formData.role_id || campaign?.role_context ? (
                  <p className="text-xs text-zinc-600">
                    Click "Run Matching" to analyze candidates with AI-powered scoring
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600">
                    Link this campaign to a project or role in Settings to enable matching
                  </p>
                )}
              </div>
            )}
          </GlassCard>

          {/* Sequence Preview */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <List className="w-5 h-5 text-red-400" />
              Sequence Steps ({formData.sequence_steps?.length || 0})
            </h3>
            {formData.sequence_steps?.length > 0 ? (
              <div className="space-y-3">
                {formData.sequence_steps.slice(0, 3).map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{step.type || "Email"}</p>
                      <p className="text-xs text-zinc-500">
                        {step.delay_days ? `Wait ${step.delay_days} days` : "Immediate"}
                      </p>
                    </div>
                  </div>
                ))}
                {formData.sequence_steps.length > 3 && (
                  <p className="text-sm text-zinc-500 text-center">
                    +{formData.sequence_steps.length - 3} more steps
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <List className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500">No sequence steps configured yet</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-500/20 rounded-lg">
                <Users className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalCandidates}</p>
                <p className="text-xs text-zinc-500">Matched Candidates</p>
              </div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600"
                style={{ width: `${Math.min((stats.sent / Math.max(stats.totalCandidates, 1)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {stats.sent} contacted ({Math.round((stats.sent / Math.max(stats.totalCandidates, 1)) * 100)}%)
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-red-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.replied}</p>
                <p className="text-xs text-zinc-500">Replies</p>
              </div>
            </div>
            <p className="text-sm text-red-400">
              {stats.replyRate}% reply rate
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-red-500/20 rounded-lg">
                <Send className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sent}</p>
                <p className="text-xs text-zinc-500">Messages Sent</p>
              </div>
            </div>
          </GlassCard>

          {/* Auto-Match Status */}
          <GlassCard className="p-5">
            <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />
              Auto-Match
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Status</span>
                <span className={`text-xs font-medium ${formData.auto_match_enabled ? "text-red-400" : "text-zinc-500"}`}>
                  {formData.auto_match_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Min Score</span>
                <span className="text-xs font-medium text-white">{formData.min_match_score || 30}%</span>
              </div>
              {formData.project_id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Target</span>
                  <span className="text-xs text-white">Project linked</span>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ formData, handleChange, handleStatusChange, isNew, projects, roles }) => {
  // Filter roles based on selected project
  const availableRoles = useMemo(() => {
    if (!formData.project_id) return roles;
    return roles.filter((r) => r.project_id === formData.project_id);
  }, [roles, formData.project_id]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-zinc-400">Campaign Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 text-white"
            placeholder="Q1 Engineering Recruitment"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400">Campaign Type</Label>
          <Select
            value={formData.campaign_type}
            onValueChange={(v) => handleChange("campaign_type", v)}
          >
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {CAMPAIGN_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-zinc-400">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
          placeholder="Campaign goals and target audience..."
          rows={3}
        />
      </div>

      {/* Campaign Targeting */}
      <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            Campaign Targeting
          </h4>
          <p className="text-xs text-zinc-500">
            Link this campaign to a project or role for AI candidate matching
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">Project</Label>
            <Select
              value={formData.project_id || "__none__"}
              onValueChange={(v) => {
                handleChange("project_id", v === "__none__" ? null : v);
                // Clear role if changing project
                if (v !== formData.project_id) {
                  handleChange("role_id", null);
                }
              }}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="__none__">No Project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Role</Label>
            <Select
              value={formData.role_id || "__none__"}
              onValueChange={(v) => handleChange("role_id", v === "__none__" ? null : v)}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="__none__">No Specific Role</SelectItem>
                {availableRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Auto-Match Settings */}
      <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />
              Auto-Match Candidates
            </h4>
            <p className="text-xs text-zinc-500">
              Automatically find and match candidates when campaign is activated
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("auto_match_enabled", !formData.auto_match_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.auto_match_enabled ? "bg-red-500" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.auto_match_enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {formData.auto_match_enabled && (
          <div className="pt-3 border-t border-zinc-700/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Minimum Match Score</Label>
                <Select
                  value={String(formData.min_match_score || 30)}
                  onValueChange={(v) => handleChange("min_match_score", parseInt(v))}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="20">20% - Include more candidates</SelectItem>
                    <SelectItem value="30">30% - Balanced (Recommended)</SelectItem>
                    <SelectItem value="50">50% - Higher quality</SelectItem>
                    <SelectItem value="70">70% - Only best matches</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-600">
                  Only candidates above this score will be matched
                </p>
              </div>
              <div className="flex items-center">
                <div className="p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400">
                  <p className="font-medium text-zinc-300 mb-1">How it works:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Analyzes all candidates against role requirements</li>
                    <li>Matches run when campaign is activated</li>
                    <li>Matched candidates appear in Overview & Outreach</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-zinc-400">Daily Limit</Label>
          <Input
            type="number"
            value={formData.daily_limit}
            onChange={(e) => handleChange("daily_limit", parseInt(e.target.value) || 50)}
            className="bg-zinc-800/50 border-zinc-700 text-white"
            min={1}
            max={500}
          />
          <p className="text-xs text-zinc-600">Max messages per day</p>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400">Min Delay (minutes)</Label>
          <Input
            type="number"
            value={formData.delay_min_minutes}
            onChange={(e) => handleChange("delay_min_minutes", parseInt(e.target.value) || 5)}
            className="bg-zinc-800/50 border-zinc-700 text-white"
            min={1}
          />
          <p className="text-xs text-zinc-600">Between messages</p>
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400">Max Delay (minutes)</Label>
          <Input
            type="number"
            value={formData.delay_max_minutes}
            onChange={(e) => handleChange("delay_max_minutes", parseInt(e.target.value) || 30)}
            className="bg-zinc-800/50 border-zinc-700 text-white"
            min={1}
          />
          <p className="text-xs text-zinc-600">Random delay range</p>
        </div>
      </div>

      {!isNew && (
        <div className="space-y-2">
          <Label className="text-zinc-400">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleStatusChange(v)}
          >
            <SelectTrigger className="w-[200px] bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {CAMPAIGN_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ campaign }) => {
  const matchedCandidates = campaign?.matched_candidates || [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = matchedCandidates.length;
    const statusCounts = matchedCandidates.reduce((acc, m) => {
      const status = m.status || "matched";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const scoreDistribution = {
      high: matchedCandidates.filter((m) => m.match_score >= 70).length,
      medium: matchedCandidates.filter((m) => m.match_score >= 40 && m.match_score < 70).length,
      low: matchedCandidates.filter((m) => m.match_score < 40).length,
    };

    return { total, statusCounts, scoreDistribution };
  }, [matchedCandidates]);

  return (
    <div className="space-y-6">
      {/* Pipeline Funnel */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-red-400" />
          Pipeline Funnel
        </h3>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Matched", count: metrics.statusCounts.matched || 0, color: "red" },
            { label: "Pending", count: metrics.statusCounts.pending || 0, color: "red" },
            { label: "Contacted", count: (metrics.statusCounts.contacted || 0) + (metrics.statusCounts.sent || 0), color: "red" },
            { label: "Replied", count: metrics.statusCounts.replied || 0, color: "red" },
            { label: "Scheduled", count: metrics.statusCounts.scheduled || 0, color: "red" },
          ].map((stage, idx) => (
            <div key={idx} className="text-center">
              <div className={`text-3xl font-bold text-${stage.color}-400 mb-1`}>
                {stage.count}
              </div>
              <p className="text-xs text-zinc-500">{stage.label}</p>
              <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${stage.color}-500`}
                  style={{
                    width: `${Math.min((stage.count / Math.max(metrics.total, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Match Score Distribution */}
      <div className="grid grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            Match Score Distribution
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">High Match (70%+)</span>
                <span className="text-red-400 font-medium">{metrics.scoreDistribution.high}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${(metrics.scoreDistribution.high / Math.max(metrics.total, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Medium Match (40-70%)</span>
                <span className="text-red-300 font-medium">{metrics.scoreDistribution.medium}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400"
                  style={{
                    width: `${(metrics.scoreDistribution.medium / Math.max(metrics.total, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Low Match (&lt;40%)</span>
                <span className="text-zinc-400 font-medium">{metrics.scoreDistribution.low}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-600"
                  style={{
                    width: `${(metrics.scoreDistribution.low / Math.max(metrics.total, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-400" />
            Campaign Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-400">Total Candidates</span>
              <span className="text-xl font-bold text-white">{metrics.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-400">Conversion Rate</span>
              <span className="text-xl font-bold text-red-400">
                {metrics.total > 0
                  ? Math.round(((metrics.statusCounts.replied || 0) / metrics.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <span className="text-zinc-400">Avg Match Score</span>
              <span className="text-xl font-bold text-red-400">
                {metrics.total > 0
                  ? Math.round(
                      matchedCandidates.reduce((sum, m) => sum + (m.match_score || 0), 0) /
                        metrics.total
                    )
                  : 0}%
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default function TalentCampaignDetail() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("id");
  const isNew = searchParams.get("new") === "true";

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(isNew ? "settings" : "overview");
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    campaign_type: "email",
    status: "draft",
    daily_limit: 50,
    delay_min_minutes: 5,
    delay_max_minutes: 30,
    sequence_steps: [],
    matched_candidates: [],
    project_id: null,
    role_id: null,
    nest_id: null,
    auto_match_enabled: true,
    min_match_score: 30,
  });

  const [isMatching, setIsMatching] = useState(false);
  const [linkedNest, setLinkedNest] = useState(null);
  const [nestCandidates, setNestCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());

  // Handle individual candidate selection toggle
  const handleToggleCandidateSelect = (candidateId) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  // Handle "Add All Excellent" bulk action
  const handleSelectAllExcellent = () => {
    const excellentCandidates = (campaign?.matched_candidates || [])
      .filter(m => {
        const level = m.match_level || (
          m.match_score >= 80 ? "Excellent" :
          m.match_score >= 60 ? "Good" :
          m.match_score >= 40 ? "Fair" : "Poor"
        );
        return level === "Excellent";
      })
      .map(m => m.candidate_id);

    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      excellentCandidates.forEach(id => newSet.add(id));
      return newSet;
    });

    toast.success(`Added ${excellentCandidates.length} excellent matches to selection`);
  };

  // Fetch projects and roles for selection
  useEffect(() => {
    if (user?.organization_id) {
      fetchProjectsAndRoles();
    }
  }, [user?.organization_id]);

  const fetchProjectsAndRoles = async () => {
    try {
      const [projectsRes, rolesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .eq("organization_id", user.organization_id)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("roles")
          .select("id, title, project_id")
          .eq("organization_id", user.organization_id)
          .eq("status", "active")
          .order("title"),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
    } catch (error) {
      console.error("Error fetching projects/roles:", error);
    }
  };

  // Fetch linked nest when campaign has nest_id
  useEffect(() => {
    if (campaign?.nest_id && user?.organization_id) {
      fetchLinkedNest(campaign.nest_id);
    } else {
      setLinkedNest(null);
      setNestCandidates([]);
    }
  }, [campaign?.nest_id, user?.organization_id]);

  const fetchLinkedNest = async (nestId) => {
    try {
      // Fetch the nest details
      const { data: nest, error: nestError } = await supabase
        .from("nests")
        .select("id, name, description, nest_type, category")
        .eq("id", nestId)
        .single();

      if (nestError) {
        console.error("Error fetching nest:", nestError);
        return;
      }

      setLinkedNest(nest);

      // Fetch candidates from this nest that belong to the organization
      // Candidates from nest purchases have import_source: 'nest:{nestId}'
      const { data: candidates, error: candidatesError } = await supabase
        .from("candidates")
        .select("id, name, first_name, last_name, current_title, job_title, current_company, company_name, skills, intelligence_score, intelligence_level")
        .eq("organization_id", user.organization_id)
        .eq("import_source", `nest:${nestId}`)
        .limit(500);

      if (candidatesError) {
        console.error("Error fetching nest candidates:", candidatesError);
        setNestCandidates([]);
        return;
      }

      setNestCandidates(candidates || []);
    } catch (error) {
      console.error("Error fetching linked nest:", error);
    }
  };

  // Fetch campaign data
  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId, isNew]);

  const fetchCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;

      setCampaign(data);
      setFormData({
        name: data.name || "",
        description: data.description || "",
        campaign_type: data.campaign_type || "email",
        status: data.status || "draft",
        daily_limit: data.daily_limit || 50,
        delay_min_minutes: data.delay_min_minutes || 5,
        delay_max_minutes: data.delay_max_minutes || 30,
        sequence_steps: data.sequence_steps || [],
        matched_candidates: data.matched_candidates || [],
        project_id: data.project_id || null,
        role_id: data.role_id || null,
        nest_id: data.nest_id || null,
        auto_match_enabled: data.auto_match_enabled !== false, // Default true
        min_match_score: data.min_match_score || 30,
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign");
      navigate(createPageUrl("TalentCampaigns"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    if (!user?.organization_id) {
      toast.error("Organization not found");
      return;
    }

    setSaving(true);
    try {
      const campaignData = {
        ...formData,
        organization_id: user.organization_id,
      };

      let result;
      if (isNew) {
        const { data, error } = await supabase
          .from("campaigns")
          .insert([campaignData])
          .select()
          .single();

        if (error) throw error;
        result = data;
        toast.success("Campaign created successfully");
        navigate(`${createPageUrl("TalentCampaignDetail")}?id=${result.id}`);
      } else {
        const { data, error } = await supabase
          .from("campaigns")
          .update(campaignData)
          .eq("id", campaignId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        toast.success("Campaign saved successfully");
      }

      setCampaign(result);
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error(error.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  // Run auto-matching against linked project/role or nest candidates
  const runAutoMatching = async (campaignData) => {
    const targetCampaign = campaignData || campaign;
    if (!targetCampaign?.id) return;

    // Must have something to match against (project, role, or role_context from campaign wizard)
    const hasMatchTarget = targetCampaign.project_id || targetCampaign.role_id || targetCampaign.role_context;

    if (!hasMatchTarget) {
      toast.error("Please configure role context in Settings before running matching");
      return;
    }

    // If we have nest candidates but none are loaded yet, show a message
    if (targetCampaign.nest_id && nestCandidates.length === 0) {
      toast.info("No candidates found from the linked nest. Please sync the nest first.");
      return;
    }

    setIsMatching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyzeCampaignProject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            campaign_id: targetCampaign.id,
            organization_id: user.organization_id,
            project_id: targetCampaign.project_id || undefined,
            role_id: targetCampaign.role_id || undefined,
            role_context: targetCampaign.role_context || undefined,
            min_score: targetCampaign.min_match_score || 30,
            limit: 100,
            // Pass nest info for logging/context
            nest_id: targetCampaign.nest_id || undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.matched_candidates?.length > 0) {
        // Update local state with matched candidates - include ALL fields from smart AI matching
        const updatedMatches = result.matched_candidates.map((m) => ({
          candidate_id: m.candidate_id,
          candidate_name: m.candidate_name,
          match_score: m.match_score,
          match_reasons: m.match_reasons,
          // AI analysis from smart multi-stage matching
          ai_analysis: m.ai_analysis,
          match_factors: m.match_factors,
          priority_rank: m.priority_rank,
          // Intelligence fields for "Best Approach" UI
          intelligence_score: m.intelligence_score,
          recommended_approach: m.recommended_approach,
          best_outreach_angle: m.best_outreach_angle,
          timing_signals: m.timing_signals,
          outreach_hooks: m.outreach_hooks,
          company_pain_points: m.company_pain_points,
          status: "matched",
          added_at: new Date().toISOString(),
        }));

        setCampaign((prev) => prev ? { ...prev, matched_candidates: updatedMatches } : null);
        setFormData((prev) => ({ ...prev, matched_candidates: updatedMatches }));

        const sourceInfo = linkedNest ? ` from "${linkedNest.name}"` : "";
        toast.success(`Found ${result.matched_candidates.length} matching candidates${sourceInfo}!`);
      } else {
        toast.info("No matching candidates found. Try adjusting your role context criteria.");
      }
    } catch (error) {
      console.error("Auto-matching error:", error);
      toast.error("Matching failed. Please try again.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!campaignId) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);

      if (error) throw error;

      handleChange("status", newStatus);
      const updatedCampaign = { ...campaign, status: newStatus };
      setCampaign(updatedCampaign);

      // Auto-match when activating campaign
      if (newStatus === "active" && formData.auto_match_enabled) {
        toast.success("Campaign activated - running auto-match...");
        runAutoMatching(updatedCampaign);
      } else {
        toast.success(`Campaign ${newStatus === "active" ? "activated" : newStatus}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDuplicate = async () => {
    if (!campaign) return;

    try {
      const duplicateData = {
        ...formData,
        name: `${formData.name} (Copy)`,
        status: "draft",
        organization_id: user.organization_id,
        matched_candidates: [],
      };

      const { data, error } = await supabase
        .from("campaigns")
        .insert([duplicateData])
        .select()
        .single();

      if (error) throw error;

      toast.success("Campaign duplicated");
      navigate(`${createPageUrl("TalentCampaignDetail")}?id=${data.id}`);
    } catch (error) {
      console.error("Error duplicating campaign:", error);
      toast.error("Failed to duplicate campaign");
    }
  };

  const handleDelete = async () => {
    if (!campaignId || !confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);

      if (error) throw error;

      toast.success("Campaign deleted");
      navigate(createPageUrl("TalentCampaigns"));
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleCampaignUpdate = (updated) => {
    setCampaign(updated);
    setFormData((prev) => ({
      ...prev,
      matched_candidates: updated.matched_candidates || [],
    }));
  };

  // Stats
  const stats = useMemo(() => {
    const matched = formData.matched_candidates || [];
    const sent = matched.filter((c) => c.status === "sent" || c.status === "contacted").length;
    const replied = matched.filter((c) => c.status === "replied").length;

    return {
      totalCandidates: matched.length,
      sent,
      replied,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    };
  }, [formData.matched_candidates]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-1" />
            </div>
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6"
      >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={createPageUrl("TalentCampaigns")}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {isNew ? "New Campaign" : formData.name || "Campaign"}
              </h1>
              {!isNew && <StatusBadge status={formData.status} />}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isNew ? "Create a new outreach campaign" : "Manage your campaign settings and candidates"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              {formData.status === "active" ? (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("paused")}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("active")}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Activate
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDuplicate}
                className="border-zinc-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-500 hover:bg-red-600"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <GlassCard className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800/50 mb-6">
            {!isNew && (
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
              >
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
            )}
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="sequence"
              className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
            >
              <List className="w-4 h-4 mr-2" />
              Sequence
            </TabsTrigger>
            {!isNew && (
              <>
                <TabsTrigger
                  value="outreach"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Outreach
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Overview Tab */}
          {!isNew && (
            <TabsContent value="overview" className="m-0">
              <OverviewTab
                campaign={campaign}
                formData={formData}
                stats={stats}
                onRunMatching={() => runAutoMatching(campaign)}
                isMatching={isMatching}
                linkedNest={linkedNest}
                nestCandidates={nestCandidates}
                selectedCandidates={selectedCandidates}
                onToggleCandidateSelect={handleToggleCandidateSelect}
                onSelectAllExcellent={handleSelectAllExcellent}
              />
            </TabsContent>
          )}


          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 m-0">
            <SettingsTab
              formData={formData}
              handleChange={handleChange}
              handleStatusChange={handleStatusChange}
              isNew={isNew}
              projects={projects}
              roles={roles}
            />
          </TabsContent>

          {/* Sequence Tab */}
          <TabsContent value="sequence" className="m-0">
            <CampaignSequenceEditor
              steps={formData.sequence_steps}
              onChange={(steps) => handleChange("sequence_steps", steps)}
            />
          </TabsContent>

          {/* Outreach Tab */}
          {!isNew && (
            <TabsContent value="outreach" className="m-0">
              <OutreachPipeline campaign={campaign} onUpdate={handleCampaignUpdate} />
            </TabsContent>
          )}

          {/* Analytics Tab */}
          {!isNew && (
            <TabsContent value="analytics" className="m-0">
              <AnalyticsTab campaign={campaign} />
            </TabsContent>
          )}
        </Tabs>
      </GlassCard>
      </motion.div>
    </div>
  );
}
