import React, { useState, useEffect, useMemo, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CampaignSequenceEditor from "@/components/campaigns/CampaignSequenceEditor";
import CampaignMetricsPanel from "@/components/campaigns/CampaignMetricsPanel";
import { OutreachPipeline, OutreachQueue, AnalyticsTab, CandidateDetailDrawer, BulkActionBar } from "@/components/talent";
import { MatchReasonCards } from "@/components/talent/campaign";
import CriteriaWeightingStep, { DEFAULT_WEIGHTS } from "@/components/talent/campaign/CriteriaWeightingStep";
import SignalMatchingConfig, { INTELLIGENCE_SIGNALS } from "@/components/talent/campaign/SignalMatchingConfig";
import OutreachCustomizationPanel from "@/components/talent/OutreachCustomizationPanel";
import LinkedInOutreachWorkflow from "@/components/talent/LinkedInOutreachWorkflow";
import AutomationPanel from "@/components/talent/AutomationPanel";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  AlertCircle,
  Lightbulb,
  Brain,
  Filter,
  Edit2,
  FileText,
  PartyPopper,
  RefreshCw,
  SlidersHorizontal,
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

// Weights Display Widget
const WeightsDisplayWidget = ({ weights }) => {
  if (!weights) return null;

  const factors = [
    { key: 'skills_fit', label: 'Skills', color: 'red60' },
    { key: 'experience_fit', label: 'Experience', color: 'red70' },
    { key: 'title_fit', label: 'Title', color: 'red80' },
    { key: 'location_fit', label: 'Location', color: 'red90' },
    { key: 'timing_score', label: 'Timing', color: 'red' },
    { key: 'culture_fit', label: 'Culture', color: 'red600' },
  ];

  // Use static Tailwind color maps to avoid dynamic class purging
  const colorMap = {
    red60: { bg: 'bg-red-500/60', text: 'text-red-400' },
    red70: { bg: 'bg-red-500/70', text: 'text-red-400' },
    red80: { bg: 'bg-red-500/80', text: 'text-red-400' },
    red90: { bg: 'bg-red-500/90', text: 'text-red-400' },
    red: { bg: 'bg-red-500', text: 'text-red-400' },
    red600: { bg: 'bg-red-600', text: 'text-red-300' },
  };

  return (
    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
      <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-red-400" />
        Matching Weights
      </h4>
      <div className="space-y-2">
        {factors.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-20">{label}</span>
            <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${colorMap[color].bg}`}
                style={{ width: `${weights[key] || 0}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${colorMap[color].text} w-8 text-right`}>
              {weights[key] || 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Match Level Badge with colors
const MatchLevelBadge = ({ level, score }) => {
  const levelColors = {
    Excellent: "bg-red-500/30 text-red-300 border-red-500/30",
    Good: "bg-red-500/20 text-red-400 border-red-500/30",
    Fair: "bg-red-500/10 text-red-400/70 border-red-500/20",
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

// Intelligence Status Indicator
const IntelligenceStatus = ({ candidate }) => {
  // Check for intelligence data - could be in various fields
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

// Nest Source Badge - Shows which nest a candidate came from
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

// CandidateMatchResultCard - Detailed match display with AI reasoning
const CandidateMatchResultCard = ({ match, isSelected, onToggleSelect, onClick }) => {
  const [expanded, setExpanded] = useState(false);

  const scoreColor = match.match_score >= 80 ? "text-red-300"
    : match.match_score >= 60 ? "text-red-400"
    : match.match_score >= 40 ? "text-red-400/70"
    : "text-red-500/60";

  const scoreBgColor = match.match_score >= 80 ? "from-red-500 to-red-600"
    : match.match_score >= 60 ? "from-red-600 to-red-700"
    : match.match_score >= 40 ? "from-red-700 to-red-800"
    : "from-red-800 to-red-900";

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

        {/* Always show factor cards */}
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

        {/* Matched Signals */}
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

        {/* Expandable detailed analysis */}
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
                {/* Key Strengths */}
                {strengths.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-red-400 uppercase tracking-wider">
                      Key Strengths
                    </h5>
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

                {/* Concerns */}
                {concerns.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-red-300 uppercase tracking-wider">
                      Considerations
                    </h5>
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

                {/* AI Reasoning */}
                {reasoning && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-red-400 uppercase tracking-wider">
                      AI Reasoning
                    </h5>
                    <p className="text-sm text-zinc-400 leading-relaxed">{reasoning}</p>
                  </div>
                )}

                {/* Intelligence Score */}
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

                {/* Outreach Angle */}
                {outreachAngle && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
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
};

// Outreach Preview Modal - Shows generated messages before sending
const OutreachPreviewModal = ({ open, onOpenChange, messages, onApprove, onEdit, campaignType }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!messages || messages.length === 0) return null;

  const currentMessage = messages[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-red-400" />
            Outreach Preview ({currentIndex + 1} of {messages.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
              {currentMessage.candidate_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{currentMessage.candidate_name}</p>
              <p className="text-sm text-zinc-400 truncate">{currentMessage.current_role || 'Role not specified'}</p>
            </div>
            <div className="flex items-center gap-2">
              {currentMessage.match_score && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {currentMessage.match_score}% Match
                </Badge>
              )}
              <Badge className={`${
                currentMessage.personalization_score >= 70 ? 'bg-red-500/20 text-red-400' :
                currentMessage.personalization_score >= 40 ? 'bg-red-500/15 text-red-400/80' :
                'bg-zinc-700/50 text-zinc-400'
              }`}>
                {currentMessage.personalization_score || 0}% Personal
              </Badge>
            </div>
          </div>

          {/* Subject Line (for email) */}
          {campaignType === 'email' && currentMessage.subject && (
            <div>
              <Label className="text-xs text-zinc-500 uppercase tracking-wider">Subject Line</Label>
              <div className="mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-white">{currentMessage.subject}</p>
              </div>
            </div>
          )}

          {/* Message Body */}
          <div>
            <Label className="text-xs text-zinc-500 uppercase tracking-wider">Message</Label>
            <div className="mt-1 p-4 rounded-lg bg-zinc-800 border border-zinc-700 max-h-[250px] overflow-y-auto">
              <p className="text-white whitespace-pre-wrap leading-relaxed">{currentMessage.content}</p>
            </div>
          </div>

          {/* Intelligence Used */}
          {currentMessage.intelligence_used?.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                AI Personalization Used
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentMessage.intelligence_used.map((item, i) => (
                  <Badge key={i} className="bg-red-500/20 text-red-400 text-xs">
                    {item.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(i => Math.min(messages.length - 1, i + 1))}
                disabled={currentIndex === messages.length - 1}
                className="border-zinc-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit && onEdit(currentMessage, currentIndex)}
                className="border-zinc-700"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => onApprove && onApprove(messages)}
                className="bg-red-500 hover:bg-red-600"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve All ({messages.length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Outreach Success Dialog - Shows after tasks are created
const OutreachSuccessDialog = ({ open, onOpenChange, taskCount, onViewQueue }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-center">
      <div className="py-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Outreach Ready!
        </h2>
        <p className="text-zinc-400 mb-6">
          {taskCount} personalized messages are queued and ready to send.
        </p>

        <div className="p-4 rounded-lg bg-zinc-800/50 text-left mb-6">
          <h3 className="text-sm font-medium text-white mb-2">Next Steps:</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              Review messages in the Outreach Queue
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              Click "Send" on each message when ready
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              Track responses and follow up
            </li>
          </ul>
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
          >
            Close
          </Button>
          <Button
            onClick={onViewQueue}
            className="bg-red-500 hover:bg-red-600"
          >
            <Send className="w-4 h-4 mr-2" />
            View Outreach Queue
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// Outreach Queue Tab - Manage outreach tasks
const OutreachQueueTab = ({ campaign, tasks, onRefresh, onSendTask, onCancelTask }) => {
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(null);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const statusColors = {
    pending: 'bg-zinc-500/20 text-zinc-400',
    approved_ready: 'bg-red-500/30 text-red-300',
    sent: 'bg-red-500/20 text-red-400',
    replied: 'bg-red-500/15 text-red-400/80',
    completed: 'bg-red-600/20 text-red-300',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  const handleSend = async (task) => {
    setSending(task.id);
    try {
      await onSendTask(task.id);
    } finally {
      setSending(null);
    }
  };

  const taskCounts = {
    all: tasks.length,
    approved_ready: tasks.filter(t => t.status === 'approved_ready').length,
    sent: tasks.filter(t => t.status === 'sent').length,
    replied: tasks.filter(t => t.status === 'replied').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'approved_ready', label: 'Ready' },
            { key: 'sent', label: 'Sent' },
            { key: 'replied', label: 'Replied' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? 'default' : 'ghost'}
              onClick={() => setFilter(key)}
              className={filter === key ? 'bg-red-500 hover:bg-red-600' : 'text-zinc-400 hover:text-white'}
            >
              {label}
              <Badge className="ml-2 bg-zinc-700/50 text-zinc-300">
                {taskCounts[key] || 0}
              </Badge>
            </Button>
          ))}
        </div>
        <Button variant="ghost" onClick={onRefresh} className="text-zinc-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Task List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <GlassCard key={task.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {task.candidate?.first_name?.[0]}{task.candidate?.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">
                      {task.candidate?.first_name} {task.candidate?.last_name}
                    </p>
                    <p className="text-sm text-zinc-400 truncate">
                      {task.candidate?.job_title}
                      {task.candidate?.company_name && ` at ${task.candidate.company_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={statusColors[task.status] || statusColors.pending}>
                    {task.status?.replace('_', ' ')}
                  </Badge>
                  {task.metadata?.match_score && (
                    <Badge className="bg-red-500/20 text-red-400">
                      {task.metadata.match_score}% match
                    </Badge>
                  )}
                </div>
              </div>

              {/* Message Preview */}
              <div className="mt-3 p-3 rounded-lg bg-zinc-800/50">
                {task.metadata?.subject && (
                  <p className="text-xs text-zinc-500 mb-1">
                    <span className="font-medium">Subject:</span> {task.metadata.subject}
                  </p>
                )}
                <p className="text-sm text-zinc-300 line-clamp-2">{task.message_content}</p>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Created {new Date(task.created_at).toLocaleDateString()}
                  {task.sent_at && ` • Sent ${new Date(task.sent_at).toLocaleDateString()}`}
                </p>
                <div className="flex gap-2">
                  {task.status === 'approved_ready' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCancelTask(task.id)}
                        className="border-zinc-700 text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSend(task)}
                        disabled={sending === task.id}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        {sending === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  {task.status === 'sent' && (
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      View Thread
                    </Button>
                  )}
                  {task.status === 'replied' && (
                    <Button size="sm" className="bg-red-500 hover:bg-red-600">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="p-8 text-center">
          <Send className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No outreach tasks yet</p>
          <p className="text-sm text-zinc-500 mt-1">
            Generate and approve outreach messages to see them here
          </p>
        </GlassCard>
      )}

      {/* Summary Stats */}
      {tasks.length > 0 && (
        <GlassCard className="p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{taskCounts.all}</p>
              <p className="text-xs text-zinc-500">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-300">{taskCounts.approved_ready}</p>
              <p className="text-xs text-zinc-500">Ready</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{taskCounts.sent}</p>
              <p className="text-xs text-zinc-500">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{taskCounts.replied}</p>
              <p className="text-xs text-zinc-500">Replied</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ campaign, formData, stats, onRunMatching, isMatching, linkedNest, nestCandidates, selectedCandidates, onToggleCandidateSelect, onSelectAllExcellent, onSaveSelection, onGenerateOutreach, savingSelection, generatingOutreach, onCandidateClick }) => {
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
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <Package className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-400 uppercase tracking-wider font-medium">Sourcing from Nest</p>
                <p className="text-lg font-semibold text-white">{linkedNest.name}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-zinc-400">
                    {nestCandidates.length} candidates
                  </span>
                  {(() => {
                    const intelReady = nestCandidates.filter(c =>
                      c.intelligence_generated || c.intelligence_score > 0 || c.best_outreach_angle
                    ).length;
                    const processing = nestCandidates.filter(c => c.intelligence_status === 'processing').length;
                    const pending = nestCandidates.length - intelReady - processing;
                    return (
                      <>
                        {intelReady > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <Brain className="w-3 h-3" />
                            {intelReady} ready
                          </span>
                        )}
                        {processing > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-300">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {processing} processing
                          </span>
                        )}
                        {pending > 0 && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {pending} pending
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
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

          {/* Matching Weights */}
          {campaign?.role_context?.criteria_weights && (
            <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
              <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-red-400" />
                Matching Weights
              </h4>
              <div className="space-y-2">
                {[
                  { key: "skills_fit", label: "Skills", bg: "bg-red-500/60", text: "text-red-400" },
                  { key: "experience_fit", label: "Experience", bg: "bg-red-500/70", text: "text-red-400" },
                  { key: "title_fit", label: "Title", bg: "bg-red-500/80", text: "text-red-400" },
                  { key: "location_fit", label: "Location", bg: "bg-red-500/90", text: "text-red-400" },
                  { key: "timing_score", label: "Timing", bg: "bg-red-500", text: "text-red-400" },
                  { key: "culture_fit", label: "Culture", bg: "bg-red-600", text: "text-red-300" },
                ].map(({ key, label, bg, text }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-20">{label}</span>
                    <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bg}`}
                        style={{ width: `${campaign.role_context.criteria_weights[key] || 0}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${text} w-8 text-right`}>
                      {campaign.role_context.criteria_weights[key] || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

              <div className="flex flex-wrap items-center gap-2">
                {/* Bulk Add Excellent */}
                {levelCounts.Excellent > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSelectAllExcellent}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Excellent ({levelCounts.Excellent})
                  </Button>
                )}

                {/* Save Selection */}
                {selectedCandidates?.size > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSaveSelection}
                    disabled={savingSelection}
                    className="border-zinc-700 text-zinc-300 hover:text-white"
                  >
                    {savingSelection ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save ({selectedCandidates.size})
                  </Button>
                )}

                {/* Generate Outreach */}
                {selectedCandidates?.size > 0 && (
                  <Button
                    size="sm"
                    onClick={onGenerateOutreach}
                    disabled={generatingOutreach}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {generatingOutreach ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Generate Outreach
                      </>
                    )}
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
                      Excellent: isActive ? "bg-red-500/30 text-red-300" : "text-zinc-400 hover:text-red-400",
                      Good: isActive ? "bg-red-500/20 text-red-400" : "text-zinc-400 hover:text-red-400",
                      Fair: isActive ? "bg-red-500/10 text-red-400/70" : "text-zinc-400 hover:text-red-400",
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
                      onClick={() => onCandidateClick?.(match)}
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

          {/* Matching Configuration */}
          {campaign?.role_context?.criteria_weights && (
            <WeightsDisplayWidget weights={campaign.role_context.criteria_weights} />
          )}
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ formData, handleChange, handleStatusChange, isNew, projects, roles, campaign }) => {
  const [showMatchingSettings, setShowMatchingSettings] = useState(false);
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
                    {p.title || p.name}
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

      {/* Matching Settings (Role Context, Criteria Weights, Signal Filters) */}
      {!isNew && (
        <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl space-y-4">
          <button
            type="button"
            onClick={() => setShowMatchingSettings(!showMatchingSettings)}
            className="w-full flex items-center justify-between"
          >
            <div>
              <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-red-400" />
                Matching Settings
              </h4>
              <p className="text-xs text-zinc-500 text-left">
                Role context, criteria weights, and signal filters for AI matching
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showMatchingSettings ? 'rotate-180' : ''}`} />
          </button>

          {showMatchingSettings && (
            <div className="pt-3 border-t border-zinc-700/50 space-y-6">
              {/* Role Context */}
              <div className="space-y-4">
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Role Context</h5>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Perfect Fit Criteria</Label>
                    <Textarea
                      value={formData.role_context_perfect_fit || ""}
                      onChange={(e) => handleChange("role_context_perfect_fit", e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      placeholder="What makes someone a perfect fit for this role..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Selling Points</Label>
                    <Textarea
                      value={formData.role_context_selling_points || ""}
                      onChange={(e) => handleChange("role_context_selling_points", e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      placeholder="Why should a candidate join? What makes this opportunity compelling..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Ideal Background</Label>
                    <Textarea
                      value={formData.role_context_ideal_background || ""}
                      onChange={(e) => handleChange("role_context_ideal_background", e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
                      placeholder="Describe the ideal candidate background..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Criteria Weights */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Criteria Weights</h5>
                <CriteriaWeightingStep
                  weights={formData.criteria_weights || DEFAULT_WEIGHTS}
                  onChange={(weights) => handleChange("criteria_weights", weights)}
                />
              </div>

              {/* Signal Filters */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Signal Filters</h5>
                <SignalMatchingConfig
                  selectedSignals={formData.signal_filters || []}
                  onChange={(signals) => handleChange("signal_filters", signals)}
                />
              </div>
            </div>
          )}
        </div>
      )}

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

export default function TalentCampaignDetail() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("id");
  const isNew = searchParams.get("new") === "true";
  const preSelectedProjectId = searchParams.get("projectId");
  const preSelectedRoleId = searchParams.get("roleId");
  const autoMatch = searchParams.get("autoMatch") === "true";

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
    role_context_perfect_fit: "",
    role_context_selling_points: "",
    role_context_ideal_background: "",
    criteria_weights: null,
    signal_filters: [],
  });

  const [isMatching, setIsMatching] = useState(false);
  const [linkedNest, setLinkedNest] = useState(null);
  const [nestCandidates, setNestCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [savingSelection, setSavingSelection] = useState(false);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [outreachMessages, setOutreachMessages] = useState([]);
  const [showOutreachPreview, setShowOutreachPreview] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [showOutreachSuccess, setShowOutreachSuccess] = useState(false);
  const [createdTaskCount, setCreatedTaskCount] = useState(0);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [outreachMode, setOutreachMode] = useState("queue");

  // Drawer state for candidate detail
  const [drawerCandidateId, setDrawerCandidateId] = useState(null);
  const [drawerMatchData, setDrawerMatchData] = useState(null);

  // Ref to track if URL params have been pre-populated
  const prepopulatedRef = useRef(false);
  // Ref to track if auto-matching has been triggered (for autoMatch URL param)
  const autoMatchTriggeredRef = useRef(false);

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

  // Save selected candidates to the campaign
  const handleSaveSelection = async () => {
    if (selectedCandidates.size === 0) {
      toast.error("No candidates selected");
      return;
    }

    setSavingSelection(true);
    try {
      // Update matched_candidates with selection status
      const updatedMatches = (campaign?.matched_candidates || []).map(m => ({
        ...m,
        selected: selectedCandidates.has(m.candidate_id),
        selected_at: selectedCandidates.has(m.candidate_id) ? new Date().toISOString() : m.selected_at || null,
      }));

      const { error } = await supabase
        .from('campaigns')
        .update({
          matched_candidates: updatedMatches,
          updated_date: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      if (error) throw error;

      setCampaign(prev => prev ? { ...prev, matched_candidates: updatedMatches } : null);
      toast.success(`${selectedCandidates.size} candidates saved to campaign`);
    } catch (err) {
      console.error("Save selection error:", err);
      toast.error("Failed to save selection");
    } finally {
      setSavingSelection(false);
    }
  };

  // Generate outreach messages for selected candidates
  const handleGenerateOutreach = async () => {
    const selectedMatches = (campaign?.matched_candidates || []).filter(m =>
      selectedCandidates.has(m.candidate_id)
    );

    if (selectedMatches.length === 0) {
      toast.error("Select candidates first");
      return;
    }

    setGeneratingOutreach(true);
    const generatedMessages = [];

    try {
      // Generate messages for each selected candidate
      for (const match of selectedMatches) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCampaignOutreach`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                campaign_id: campaign.id,
                candidate_id: match.candidate_id,
                organization_id: user.organization_id,
                candidate_name: match.candidate_name,
                candidate_title: match.current_title || match.current_role?.split(' at ')[0],
                candidate_company: match.current_company || match.current_role?.split(' at ')[1],
                match_score: match.match_score,
                match_reasons: match.match_reasons || match.key_strengths,
                intelligence_score: match.intelligence_score,
                recommended_approach: match.recommended_approach,
                outreach_hooks: match.outreach_hooks,
                best_outreach_angle: match.best_outreach_angle || match.outreach_angle,
                timing_signals: match.timing_signals,
                company_pain_points: match.company_pain_points,
                key_insights: match.key_insights,
                role_context: campaign.role_context,
                role_title: campaign.role_title,
                company_name: user.company_name || 'Our company',
                stage: 'initial',
                campaign_type: campaign.campaign_type || 'email',
              }),
            }
          );

          const result = await response.json();

          if (result.content) {
            generatedMessages.push({
              candidate_id: match.candidate_id,
              candidate_name: match.candidate_name,
              current_role: match.current_role || `${match.current_title || 'Role'} at ${match.current_company || 'Company'}`,
              match_score: match.match_score,
              subject: result.subject,
              content: result.content,
              intelligence_used: result.intelligence_used,
              personalization_score: result.personalization_score,
            });
          }
        } catch (msgError) {
          console.error(`Error generating for ${match.candidate_name}:`, msgError);
        }
      }

      if (generatedMessages.length > 0) {
        setOutreachMessages(generatedMessages);
        setShowOutreachPreview(true);
        toast.success(`Generated ${generatedMessages.length} personalized messages`);
      } else {
        toast.error("Failed to generate messages");
      }
    } catch (err) {
      console.error("Generate outreach error:", err);
      toast.error("Failed to generate outreach");
    } finally {
      setGeneratingOutreach(false);
    }
  };

  // Handle approving outreach messages - creates actual outreach_tasks
  const handleApproveOutreach = async (messages) => {
    setCreatingTasks(true);
    try {
      // Create outreach tasks for each message
      const tasks = messages.map(msg => ({
        organization_id: user.organization_id,
        campaign_id: campaign.id,
        candidate_id: msg.candidate_id,
        task_type: 'initial_outreach',
        message_content: msg.content,
        status: 'approved_ready',
        stage: 'first_message',
        attempt_number: 1,
        metadata: {
          subject: msg.subject,
          personalization_points: msg.intelligence_used,
          match_score: msg.match_score,
          outreach_angle: msg.outreach_angle,
          personalization_score: msg.personalization_score,
          generated_at: new Date().toISOString(),
        },
      }));

      const { data, error } = await supabase
        .from('outreach_tasks')
        .insert(tasks)
        .select();

      if (error) throw error;

      // Update campaign with approved messages and set to active
      const updatedMatches = (campaign?.matched_candidates || []).map(m => {
        const msg = messages.find(msg => msg.candidate_id === m.candidate_id);
        if (msg) {
          return {
            ...m,
            outreach_message: {
              subject: msg.subject,
              content: msg.content,
              generated_at: new Date().toISOString(),
              approved: true,
            },
            status: 'ready_to_send',
          };
        }
        return m;
      });

      await supabase
        .from('campaigns')
        .update({
          matched_candidates: updatedMatches,
          status: 'active',
          updated_date: new Date().toISOString(),
        })
        .eq('id', campaign.id);

      setCampaign(prev => prev ? { ...prev, matched_candidates: updatedMatches, status: 'active' } : null);
      setShowOutreachPreview(false);
      setOutreachMessages([]);

      // Show success dialog
      setCreatedTaskCount(data.length);
      setShowOutreachSuccess(true);

      // Refresh outreach tasks
      fetchOutreachTasks();
    } catch (err) {
      console.error("Approve outreach error:", err);
      toast.error("Failed to create outreach tasks");
    } finally {
      setCreatingTasks(false);
    }
  };

  // Fetch outreach tasks for this campaign
  const fetchOutreachTasks = async () => {
    if (!campaign?.id) return;

    try {
      const { data, error } = await supabase
        .from('outreach_tasks')
        .select('*, candidate:candidate_id(id, first_name, last_name, job_title, email, company_name)')
        .eq('campaign_id', campaign.id)
        .order('created_date', { ascending: false });

      if (error) throw error;
      setOutreachTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch outreach tasks:', err);
    }
  };

  // Handle sending an outreach task
  const handleSendTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('outreach_tasks')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Message marked as sent!');
      fetchOutreachTasks();
    } catch (err) {
      console.error('Failed to send task:', err);
      toast.error('Failed to update task status');
    }
  };

  // Handle canceling an outreach task
  const handleCancelTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('outreach_tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task cancelled');
      fetchOutreachTasks();
    } catch (err) {
      console.error('Failed to cancel task:', err);
      toast.error('Failed to cancel task');
    }
  };

  // Fetch projects and roles for selection
  useEffect(() => {
    if (user?.organization_id) {
      fetchProjectsAndRoles();
    }
  }, [user?.organization_id]);

  const fetchProjectsAndRoles = async () => {
    try {
      console.log('[fetchProjectsAndRoles] Starting fetch for org:', user.organization_id);

      // Use exact same query structure as TalentProjects.jsx
      const [projectsRes, rolesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("created_date", { ascending: false }),
        supabase
          .from("roles")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("created_date", { ascending: false }),
      ]);

      console.log('[fetchProjectsAndRoles] Results:', {
        projectsCount: projectsRes.data?.length || 0,
        rolesCount: rolesRes.data?.length || 0,
        projectsError: projectsRes.error ? JSON.stringify(projectsRes.error) : null,
        rolesError: rolesRes.error ? JSON.stringify(rolesRes.error) : null,
        sampleProjects: projectsRes.data?.slice(0, 2).map(p => ({ id: p.id, title: p.title, name: p.name })),
        sampleRoles: rolesRes.data?.slice(0, 2).map(r => ({ id: r.id, title: r.title, project_id: r.project_id }))
      });

      if (projectsRes.error) {
        console.error('[fetchProjectsAndRoles] Projects error:', JSON.stringify(projectsRes.error, null, 2));
      }
      if (rolesRes.error) {
        console.error('[fetchProjectsAndRoles] Roles error:', JSON.stringify(rolesRes.error, null, 2));
      }

      // Always set state, even if empty
      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error("[fetchProjectsAndRoles] Unexpected error:", error);
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
        .select(`
          id, first_name, last_name, job_title,
          company_name, skills, email, linkedin_url,
          intelligence_score, intelligence_level, intelligence_status,
          intelligence_generated, best_outreach_angle, timing_signals,
          outreach_hooks, recommended_approach, import_source
        `)
        .eq("organization_id", user.organization_id)
        .eq("import_source", `nest:${nestId}`)
        .limit(500);

      if (candidatesError) {
        console.error("Error fetching nest candidates:", candidatesError);
        setNestCandidates([]);
        return;
      }

      // Add nest name to each candidate for display
      const candidatesWithNest = (candidates || []).map(c => ({
        ...c,
        nest_source: nest?.name || 'Unknown Nest'
      }));

      setNestCandidates(candidatesWithNest);
    } catch (error) {
      console.error("Error fetching linked nest:", error);
    }
  };

  // Pre-populate form when projectId and roleId are passed via URL params
  useEffect(() => {
    console.log('[Pre-populate] Check:', {
      isNew,
      preSelectedProjectId,
      preSelectedRoleId,
      projectsLength: projects.length,
      rolesLength: roles.length,
      prepopulated: prepopulatedRef.current
    });

    // Skip if not creating new campaign
    if (!isNew) {
      console.log('[Pre-populate] Not a new campaign, skipping');
      return;
    }

    // Skip if no URL params
    if (!preSelectedProjectId && !preSelectedRoleId) {
      console.log('[Pre-populate] No URL params, skipping');
      return;
    }

    // Skip if already done
    if (prepopulatedRef.current) {
      console.log('[Pre-populate] Already done, skipping');
      return;
    }

    // Check if we have the data we need
    const needProject = !!preSelectedProjectId;
    const needRole = !!preSelectedRoleId;
    const hasProjectData = projects.length > 0;
    const hasRoleData = roles.length > 0;

    console.log('[Pre-populate] Data check:', { needProject, needRole, hasProjectData, hasRoleData });

    // Wait for required data
    if ((needProject && !hasProjectData) || (needRole && !hasRoleData)) {
      console.log('[Pre-populate] Waiting for data to load...');
      return;
    }

    // Find the project and role
    const foundProject = preSelectedProjectId ? projects.find(p => p.id === preSelectedProjectId) : null;
    const foundRole = preSelectedRoleId ? roles.find(r => r.id === preSelectedRoleId) : null;

    const projectName = foundProject?.title || foundProject?.name;
    console.log('[Pre-populate] Lookup results:', {
      projectId: preSelectedProjectId,
      foundProject: foundProject ? { id: foundProject.id, name: projectName } : null,
      roleId: preSelectedRoleId,
      foundRole: foundRole ? { id: foundRole.id, title: foundRole.title } : null
    });

    // Auto-generate campaign name based on role title
    const autoName = foundRole?.title
      ? `${foundRole.title} Outreach Campaign`
      : projectName
        ? `${projectName} Campaign`
        : "";

    // Set form data with the pre-selected values
    setFormData(prev => {
      const newData = {
        ...prev,
        project_id: preSelectedProjectId || prev.project_id,
        role_id: preSelectedRoleId || prev.role_id,
        name: prev.name || autoName,
      };
      console.log('[Pre-populate] Setting formData:', newData);
      return newData;
    });

    // Mark as done
    prepopulatedRef.current = true;
    console.log('[Pre-populate] Completed!');
  }, [isNew, preSelectedProjectId, preSelectedRoleId, projects, roles]);

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

  // Fetch outreach tasks when campaign is loaded
  useEffect(() => {
    if (campaign?.id) {
      fetchOutreachTasks();
    }
  }, [campaign?.id]);

  // Auto-trigger matching when navigated from nest purchase with autoMatch=true
  useEffect(() => {
    // Only trigger if:
    // 1. autoMatch URL param is true
    // 2. Campaign is loaded and has a nest_id (from nest purchase flow)
    // 3. Haven't triggered yet
    // 4. Not currently matching
    // 5. Not a new campaign (need existing campaign)
    if (
      autoMatch &&
      campaign?.id &&
      campaign?.nest_id &&
      !autoMatchTriggeredRef.current &&
      !isMatching &&
      !isNew
    ) {
      console.log('[Auto-Match] Triggering matching for campaign:', campaign.id);
      autoMatchTriggeredRef.current = true;

      // Show a toast to let user know matching is starting
      toast.info('Starting AI candidate matching...', { duration: 3000 });

      // Give a brief delay to let nest candidates load
      setTimeout(() => {
        runAutoMatching(campaign);
      }, 500);
    }
  }, [autoMatch, campaign?.id, campaign?.nest_id, isMatching, isNew]);

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
      // Default outreach mode based on campaign type
      if (data.campaign_type === "linkedin") {
        setOutreachMode("linkedin");
      }
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
        role_context_perfect_fit: data.role_context?.perfect_fit_criteria || "",
        role_context_selling_points: data.role_context?.selling_points || "",
        role_context_ideal_background: data.role_context?.ideal_background || "",
        criteria_weights: data.role_context?.criteria_weights || null,
        signal_filters: data.role_context?.signal_filters || [],
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
      // Build role_context from separate form fields merged with existing
      const existingRoleContext = campaign?.role_context || {};
      const roleContext = {
        ...existingRoleContext,
        ...(formData.role_context_perfect_fit ? { perfect_fit_criteria: formData.role_context_perfect_fit } : {}),
        ...(formData.role_context_selling_points ? { selling_points: formData.role_context_selling_points } : {}),
        ...(formData.role_context_ideal_background ? { ideal_background: formData.role_context_ideal_background } : {}),
        ...(formData.criteria_weights ? { criteria_weights: formData.criteria_weights } : {}),
        signal_filters: formData.signal_filters || [],
      };

      // Strip fields that don't exist in the campaigns table
      const {
        role_context_perfect_fit, role_context_selling_points, role_context_ideal_background,
        criteria_weights, signal_filters,
        delay_min_minutes, delay_max_minutes, sequence_steps,
        ...rest
      } = formData;

      const campaignData = {
        ...rest,
        role_context: roleContext,
        organization_id: user.organization_id,
        updated_date: new Date().toISOString(),
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

        // Prompt re-matching if matching settings were changed
        if (result.matched_candidates?.length > 0) {
          toast("Matching settings updated", {
            description: "Re-run matching to apply new weights and filters?",
            action: {
              label: "Re-match",
              onClick: () => runAutoMatching(result),
            },
            duration: 8000,
          });
        }
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
        const updatedMatches = result.matched_candidates.map((m) => {
          // Look up nest source from nestCandidates
          const nestCandidate = nestCandidates.find(nc => nc.id === m.candidate_id);
          return {
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
            // Nest source for display
            nest_source: nestCandidate?.nest_source || linkedNest?.name || null,
            status: "matched",
            added_at: new Date().toISOString(),
          };
        });

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
                  value="customize"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Customize
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="automation"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Automation
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
                onSaveSelection={handleSaveSelection}
                onGenerateOutreach={handleGenerateOutreach}
                savingSelection={savingSelection}
                generatingOutreach={generatingOutreach}
                onCandidateClick={(match) => {
                  setDrawerCandidateId(match.candidate_id);
                  setDrawerMatchData(match);
                }}
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
              campaign={campaign}
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
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  size="sm"
                  variant={outreachMode === "queue" ? "default" : "ghost"}
                  onClick={() => setOutreachMode("queue")}
                  className={outreachMode === "queue" ? "bg-red-500 hover:bg-red-600" : "text-zinc-400 hover:text-white"}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Queue View
                </Button>
                <Button
                  size="sm"
                  variant={outreachMode === "linkedin" ? "default" : "ghost"}
                  onClick={() => setOutreachMode("linkedin")}
                  className={outreachMode === "linkedin" ? "bg-red-500 hover:bg-red-600" : "text-zinc-400 hover:text-white"}
                >
                  <Linkedin className="w-4 h-4 mr-1" />
                  LinkedIn Workflow
                </Button>
              </div>

              {outreachMode === "queue" && (
                <OutreachQueueTab
                  campaign={campaign}
                  tasks={outreachTasks}
                  onRefresh={fetchOutreachTasks}
                  onSendTask={handleSendTask}
                  onCancelTask={handleCancelTask}
                />
              )}
              {outreachMode === "linkedin" && (
                <LinkedInOutreachWorkflow
                  campaign={campaign}
                  organizationId={campaign?.organization_id}
                />
              )}
            </TabsContent>
          )}

          {/* Customize Tab */}
          {!isNew && (
            <TabsContent value="customize" className="m-0">
              <OutreachCustomizationPanel
                organizationId={campaign.organization_id}
                campaignId={campaign.id}
              />
            </TabsContent>
          )}

          {/* Analytics Tab */}
          {!isNew && (
            <TabsContent value="analytics" className="m-0">
              <AnalyticsTab
                campaign={campaign}
                outreachTasks={outreachTasks}
                matchedCandidates={campaign?.matched_candidates || []}
              />
            </TabsContent>
          )}

          {/* Automation Tab */}
          {!isNew && (
            <TabsContent value="automation" className="m-0">
              <AutomationPanel campaign={campaign} />
            </TabsContent>
          )}
        </Tabs>
      </GlassCard>

      {/* Outreach Preview Modal */}
      <OutreachPreviewModal
        open={showOutreachPreview}
        onOpenChange={setShowOutreachPreview}
        messages={outreachMessages}
        onApprove={handleApproveOutreach}
        campaignType={campaign?.campaign_type || 'email'}
      />

      {/* Outreach Success Dialog */}
      <OutreachSuccessDialog
        open={showOutreachSuccess}
        onOpenChange={setShowOutreachSuccess}
        taskCount={createdTaskCount}
        onViewQueue={() => {
          setShowOutreachSuccess(false);
          setActiveTab("outreach");
        }}
      />

      {/* Candidate Detail Drawer */}
      <CandidateDetailDrawer
        open={!!drawerCandidateId}
        onClose={() => {
          setDrawerCandidateId(null);
          setDrawerMatchData(null);
        }}
        candidateId={drawerCandidateId}
        campaignContext={drawerMatchData ? {
          campaignId: campaign?.id,
          roleName: campaign?.role_context?.role_title || campaign?.name,
          matchData: drawerMatchData,
        } : undefined}
      />

      {/* Bulk Action Bar for Match Results */}
      <BulkActionBar
        selectedCount={selectedCandidates.size}
        onClear={() => setSelectedCandidates(new Set())}
        onGenerateOutreach={handleGenerateOutreach}
        onExport={() => {
          const selected = (campaign?.matched_candidates || []).filter(m => selectedCandidates.has(m.candidate_id));
          const headers = ["Name", "Title", "Company", "Match Score", "Intelligence Score", "Approach"];
          const rows = selected.map(m => [
            m.candidate_name,
            m.current_title || "",
            m.current_company || "",
            m.match_score || "",
            m.intelligence_score || "",
            m.recommended_approach || "",
          ]);
          const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `campaign-matches-${campaign?.name || "export"}-${Date.now()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Exported ${selected.length} matches`);
        }}
        context="campaign_matches"
        loading={{
          generateOutreach: generatingOutreach,
        }}
      />
      </motion.div>
    </div>
  );
}
