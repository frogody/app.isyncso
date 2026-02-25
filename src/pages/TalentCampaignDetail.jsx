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
import { AnalyticsTab, CandidateDetailDrawer, BulkActionBar } from "@/components/talent";
import CriteriaWeightingStep, { DEFAULT_WEIGHTS } from "@/components/talent/campaign/CriteriaWeightingStep";
import SignalMatchingConfig from "@/components/talent/campaign/SignalMatchingConfig";
import OutreachCustomizationPanel from "@/components/talent/OutreachCustomizationPanel";
import LinkedInOutreachWorkflow from "@/components/talent/LinkedInOutreachWorkflow";
import CandidatesTab from "@/components/talent/CandidatesTab";
import TalentFlowTab from "@/components/talent/TalentFlowTab";
import OutreachQueueTab from "@/components/talent/OutreachQueueTab";
import OutreachPreviewModal from "@/components/talent/OutreachPreviewModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Megaphone,
  Settings,
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
  GitBranch,
  LayoutGrid,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useTheme } from "@/contexts/GlobalThemeContext";

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
  const { t } = useTheme();
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
    <div className={`p-4 ${t("bg-gray-100", "bg-zinc-800/50")} rounded-xl border ${t("border-gray-200", "border-zinc-700/50")}`}>
      <h4 className={`text-sm font-medium ${t("text-gray-600", "text-zinc-300")} mb-3 flex items-center gap-2`}>
        <SlidersHorizontal className="w-4 h-4 text-red-400" />
        Matching Weights
      </h4>
      <div className="space-y-2">
        {factors.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-xs ${t("text-gray-400", "text-zinc-500")} w-20`}>{label}</span>
            <div className={`flex-1 h-2 ${t("bg-gray-200", "bg-zinc-700")} rounded-full overflow-hidden`}>
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

// MatchLevelBadge, IntelligenceStatus, NestSourceBadge, SignalBadges extracted to CandidateMatchResultCard.jsx

// CandidateMatchResultCard extracted to @/components/talent/CandidateMatchResultCard.jsx

// OutreachPreviewModal extracted to @/components/talent/OutreachPreviewModal.jsx

// Outreach Success Dialog - Shows after tasks are created
const OutreachSuccessDialog = ({ open, onOpenChange, taskCount, onViewQueue }) => {
  const { t } = useTheme();
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={`max-w-md ${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-800")} text-center`}>
      <div className="py-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-8 h-8 text-red-400" />
        </div>
        <h2 className={`text-xl font-semibold ${t("text-gray-900", "text-white")} mb-2`}>
          Outreach Ready!
        </h2>
        <p className={`${t("text-gray-500", "text-zinc-400")} mb-6`}>
          {taskCount} personalized messages are queued and ready to send.
        </p>

        <div className={`p-4 rounded-lg ${t("bg-gray-100", "bg-zinc-800/50")} text-left mb-6`}>
          <h3 className={`text-sm font-medium ${t("text-gray-900", "text-white")} mb-2`}>Next Steps:</h3>
          <ul className={`space-y-2 text-sm ${t("text-gray-500", "text-zinc-400")}`}>
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
            className={t("border-gray-200", "border-zinc-700")}
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
};

// OutreachQueueTab extracted to @/components/talent/OutreachQueueTab.jsx

// Overview Tab Component (slimmed — candidate grid moved to CandidatesTab)
const OverviewTab = ({ campaign, formData, stats, onCandidateClick }) => {
  const { t } = useTheme();
  const matchedCandidates = campaign?.matched_candidates || [];
  const topCandidates = useMemo(() => {
    return [...matchedCandidates]
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
      .slice(0, 5);
  }, [matchedCandidates]);

  return (
    <div className="space-y-6">
      {/* Campaign Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Info */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mb-4 flex items-center gap-2`}>
              <Megaphone className="w-5 h-5 text-red-400" />
              Campaign Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`text-xs ${t("text-gray-400", "text-zinc-500")} uppercase tracking-wider`}>Description</label>
                <p className={`${t("text-gray-700", "text-white/80")} mt-1`}>
                  {formData.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs ${t("text-gray-400", "text-zinc-500")} uppercase tracking-wider`}>Type</label>
                  <div className="mt-1">
                    <TypeBadge type={formData.campaign_type} />
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${t("text-gray-400", "text-zinc-500")} uppercase tracking-wider`}>Status</label>
                  <div className="mt-1">
                    <StatusBadge status={formData.status} />
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-4 pt-4 border-t ${t("border-gray-200", "border-zinc-700/50")}`}>
                <div>
                  <label className={`text-xs ${t("text-gray-400", "text-zinc-500")} uppercase tracking-wider`}>Daily Limit</label>
                  <p className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mt-1`}>{formData.daily_limit}</p>
                </div>
                <div>
                  <label className={`text-xs ${t("text-gray-400", "text-zinc-500")} uppercase tracking-wider`}>Min Delay</label>
                  <p className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mt-1`}>{formData.delay_min_minutes} min</p>
                </div>
                <div>
                  <label className={`text-xs ${t("text-gray-400", "text-zinc-500")} uppercase tracking-wider`}>Max Delay</label>
                  <p className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mt-1`}>{formData.delay_max_minutes} min</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Matching Weights */}
          {campaign?.role_context?.criteria_weights && (
            <WeightsDisplayWidget weights={campaign.role_context.criteria_weights} />
          )}

          {/* Top 5 Candidates Preview */}
          <GlassCard className="p-6">
            <h3 className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mb-4 flex items-center gap-2`}>
              <Sparkles className="w-5 h-5 text-red-400" />
              Top Candidates ({matchedCandidates.length} total)
            </h3>
            {topCandidates.length > 0 ? (
              <div className="space-y-2">
                {topCandidates.map((match, idx) => (
                  <button
                    key={match.candidate_id || idx}
                    onClick={() => onCandidateClick?.(match)}
                    className={`w-full flex items-center gap-3 p-3 ${t("bg-gray-100", "bg-zinc-800/30")} rounded-lg ${t("hover:bg-gray-200", "hover:bg-zinc-800/50")} transition-colors text-left`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {match.candidate_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t("text-gray-900", "text-white")} truncate`}>{match.candidate_name}</p>
                      <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} truncate`}>{match.current_role || match.current_title || 'Unknown role'}</p>
                    </div>
                    <Badge className={`shrink-0 ${
                      match.match_score >= 80 ? 'bg-red-500/20 text-red-400' :
                      match.match_score >= 60 ? 'bg-red-500/15 text-red-400/80' :
                      'bg-zinc-700/50 text-zinc-400'
                    }`}>
                      {match.match_score}%
                    </Badge>
                  </button>
                ))}
                {matchedCandidates.length > 5 && (
                  <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} text-center pt-2`}>
                    +{matchedCandidates.length - 5} more -- see Candidates tab
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Brain className={`w-8 h-8 ${t("text-gray-300", "text-zinc-600")} mx-auto mb-2`} />
                <p className={`${t("text-gray-400", "text-zinc-500")} text-sm`}>No matched candidates yet</p>
                <p className={`text-xs ${t("text-gray-300", "text-zinc-600")} mt-1`}>Go to the Candidates tab to run matching</p>
              </div>
            )}
          </GlassCard>

          {/* Sequence Preview */}
          <GlassCard className="p-6">
            <h3 className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mb-4 flex items-center gap-2`}>
              <FileText className="w-5 h-5 text-red-400" />
              Sequence Steps ({formData.sequence_steps?.length || 0})
            </h3>
            {formData.sequence_steps?.length > 0 ? (
              <div className="space-y-3">
                {formData.sequence_steps.slice(0, 3).map((step, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 ${t("bg-gray-100", "bg-zinc-800/30")} rounded-lg`}>
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${t("text-gray-900", "text-white")}`}>{step.type || "Email"}</p>
                      <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>
                        {step.delay_days ? `Wait ${step.delay_days} days` : "Immediate"}
                      </p>
                    </div>
                  </div>
                ))}
                {formData.sequence_steps.length > 3 && (
                  <p className={`text-sm ${t("text-gray-400", "text-zinc-500")} text-center`}>
                    +{formData.sequence_steps.length - 3} more steps
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className={`w-8 h-8 ${t("text-gray-300", "text-zinc-600")} mx-auto mb-2`} />
                <p className={t("text-gray-400", "text-zinc-500")}>No sequence steps configured yet</p>
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
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stats.totalCandidates}</p>
                <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>Matched Candidates</p>
              </div>
            </div>
            <div className={`h-2 ${t("bg-gray-200", "bg-zinc-800")} rounded-full overflow-hidden`}>
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600"
                style={{ width: `${Math.min((stats.sent / Math.max(stats.totalCandidates, 1)) * 100, 100)}%` }}
              />
            </div>
            <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} mt-2`}>
              {stats.sent} contacted ({Math.round((stats.sent / Math.max(stats.totalCandidates, 1)) * 100)}%)
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-red-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stats.replied}</p>
                <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>Replies</p>
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
                <p className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>{stats.sent}</p>
                <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>Messages Sent</p>
              </div>
            </div>
          </GlassCard>

          {/* Auto-Match Status */}
          <GlassCard className="p-5">
            <h4 className={`text-sm font-medium ${t("text-gray-500", "text-zinc-400")} mb-3 flex items-center gap-2`}>
              <Sparkles className="w-4 h-4 text-red-400" />
              Auto-Match
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>Status</span>
                <span className={`text-xs font-medium ${formData.auto_match_enabled ? "text-red-400" : t("text-gray-400", "text-zinc-500")}`}>
                  {formData.auto_match_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>Min Score</span>
                <span className={`text-xs font-medium ${t("text-gray-900", "text-white")}`}>{formData.min_match_score || 30}%</span>
              </div>
              {formData.project_id && (
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>Target</span>
                  <span className={`text-xs ${t("text-gray-900", "text-white")}`}>Project linked</span>
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
  const { t } = useTheme();
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
          <Label className={t("text-gray-600", "text-zinc-400")}>Campaign Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}
            placeholder="Q1 Engineering Recruitment"
          />
        </div>

        <div className="space-y-2">
          <Label className={t("text-gray-600", "text-zinc-400")}>Campaign Type</Label>
          <Select
            value={formData.campaign_type}
            onValueChange={(v) => handleChange("campaign_type", v)}
          >
            <SelectTrigger className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
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
        <Label className={t("text-gray-600", "text-zinc-400")}>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} resize-none`}
          placeholder="Campaign goals and target audience..."
          rows={3}
        />
      </div>

      {/* Campaign Targeting */}
      <div className={`p-4 ${t("bg-gray-50", "bg-zinc-800/30")} border ${t("border-gray-200", "border-zinc-700/50")} rounded-xl space-y-4`}>
        <div>
          <h4 className={`text-sm font-semibold ${t("text-gray-900", "text-white")} mb-1 flex items-center gap-2`}>
            <Target className="w-4 h-4 text-red-400" />
            Campaign Targeting
          </h4>
          <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>
            Link this campaign to a project or role for AI candidate matching
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={t("text-gray-600", "text-zinc-400")}>Project</Label>
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
              <SelectTrigger className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
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
            <Label className={t("text-gray-600", "text-zinc-400")}>Role</Label>
            <Select
              value={formData.role_id || "__none__"}
              onValueChange={(v) => handleChange("role_id", v === "__none__" ? null : v)}
            >
              <SelectTrigger className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}>
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
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
      <div className={`p-4 ${t("bg-gray-50", "bg-zinc-800/30")} border ${t("border-gray-200", "border-zinc-700/50")} rounded-xl space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`text-sm font-semibold ${t("text-gray-900", "text-white")} mb-1 flex items-center gap-2`}>
              <Sparkles className="w-4 h-4 text-red-400" />
              Auto-Match Candidates
            </h4>
            <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>
              Automatically find and match candidates when campaign is activated
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("auto_match_enabled", !formData.auto_match_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.auto_match_enabled ? "bg-red-500" : t("bg-gray-300", "bg-zinc-700")
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
          <div className={`pt-3 border-t ${t("border-gray-200", "border-zinc-700/50")}`}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={t("text-gray-600", "text-zinc-400")}>Minimum Match Score</Label>
                <Select
                  value={String(formData.min_match_score || 30)}
                  onValueChange={(v) => handleChange("min_match_score", parseInt(v))}
                >
                  <SelectTrigger className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
                    <SelectItem value="20">20% - Include more candidates</SelectItem>
                    <SelectItem value="30">30% - Balanced (Recommended)</SelectItem>
                    <SelectItem value="50">50% - Higher quality</SelectItem>
                    <SelectItem value="70">70% - Only best matches</SelectItem>
                  </SelectContent>
                </Select>
                <p className={`text-xs ${t("text-gray-400", "text-zinc-600")}`}>
                  Only candidates above this score will be matched
                </p>
              </div>
              <div className="flex items-center">
                <div className={`p-3 ${t("bg-gray-100", "bg-zinc-800/50")} rounded-lg text-xs ${t("text-gray-500", "text-zinc-400")}`}>
                  <p className={`font-medium ${t("text-gray-600", "text-zinc-300")} mb-1`}>How it works:</p>
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
          <Label className={t("text-gray-600", "text-zinc-400")}>Daily Limit</Label>
          <Input
            type="number"
            value={formData.daily_limit}
            onChange={(e) => handleChange("daily_limit", parseInt(e.target.value) || 50)}
            className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}
            min={1}
            max={500}
          />
          <p className={`text-xs ${t("text-gray-400", "text-zinc-600")}`}>Max messages per day</p>
        </div>

        <div className="space-y-2">
          <Label className={t("text-gray-600", "text-zinc-400")}>Min Delay (minutes)</Label>
          <Input
            type="number"
            value={formData.delay_min_minutes}
            onChange={(e) => handleChange("delay_min_minutes", parseInt(e.target.value) || 5)}
            className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}
            min={1}
          />
          <p className={`text-xs ${t("text-gray-400", "text-zinc-600")}`}>Between messages</p>
        </div>

        <div className="space-y-2">
          <Label className={t("text-gray-600", "text-zinc-400")}>Max Delay (minutes)</Label>
          <Input
            type="number"
            value={formData.delay_max_minutes}
            onChange={(e) => handleChange("delay_max_minutes", parseInt(e.target.value) || 30)}
            className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}
            min={1}
          />
          <p className={`text-xs ${t("text-gray-400", "text-zinc-600")}`}>Random delay range</p>
        </div>
      </div>

      {/* Matching Settings (Role Context, Criteria Weights, Signal Filters) */}
      {!isNew && (
        <div className={`p-4 ${t("bg-gray-50", "bg-zinc-800/30")} border ${t("border-gray-200", "border-zinc-700/50")} rounded-xl space-y-4`}>
          <button
            type="button"
            onClick={() => setShowMatchingSettings(!showMatchingSettings)}
            className="w-full flex items-center justify-between"
          >
            <div>
              <h4 className={`text-sm font-semibold ${t("text-gray-900", "text-white")} mb-1 flex items-center gap-2`}>
                <SlidersHorizontal className="w-4 h-4 text-red-400" />
                Matching Settings
              </h4>
              <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} text-left`}>
                Role context, criteria weights, and signal filters for AI matching
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 ${t("text-gray-400", "text-zinc-400")} transition-transform ${showMatchingSettings ? 'rotate-180' : ''}`} />
          </button>

          {showMatchingSettings && (
            <div className={`pt-3 border-t ${t("border-gray-200", "border-zinc-700/50")} space-y-6`}>
              {/* Role Context */}
              <div className="space-y-4">
                <h5 className={`text-xs font-semibold ${t("text-gray-500", "text-zinc-400")} uppercase tracking-wider`}>Role Context</h5>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className={t("text-gray-600", "text-zinc-400")}>Perfect Fit Criteria</Label>
                    <Textarea
                      value={formData.role_context_perfect_fit || ""}
                      onChange={(e) => handleChange("role_context_perfect_fit", e.target.value)}
                      className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} resize-none`}
                      placeholder="What makes someone a perfect fit for this role..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={t("text-gray-600", "text-zinc-400")}>Selling Points</Label>
                    <Textarea
                      value={formData.role_context_selling_points || ""}
                      onChange={(e) => handleChange("role_context_selling_points", e.target.value)}
                      className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} resize-none`}
                      placeholder="Why should a candidate join? What makes this opportunity compelling..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={t("text-gray-600", "text-zinc-400")}>Ideal Background</Label>
                    <Textarea
                      value={formData.role_context_ideal_background || ""}
                      onChange={(e) => handleChange("role_context_ideal_background", e.target.value)}
                      className={`${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} resize-none`}
                      placeholder="Describe the ideal candidate background..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Criteria Weights */}
              <div className="space-y-3">
                <h5 className={`text-xs font-semibold ${t("text-gray-500", "text-zinc-400")} uppercase tracking-wider`}>Criteria Weights</h5>
                <CriteriaWeightingStep
                  weights={formData.criteria_weights || DEFAULT_WEIGHTS}
                  onChange={(weights) => handleChange("criteria_weights", weights)}
                />
              </div>

              {/* Signal Filters */}
              <div className="space-y-3">
                <h5 className={`text-xs font-semibold ${t("text-gray-500", "text-zinc-400")} uppercase tracking-wider`}>Signal Filters</h5>
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
          <Label className={t("text-gray-600", "text-zinc-400")}>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleStatusChange(v)}
          >
            <SelectTrigger className={`w-[200px] ${t("bg-white", "bg-zinc-800/50")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-700")}`}>
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
  const { t } = useTheme();
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
  const flowTabRef = useRef(null);
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
  const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false);

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
      // Map campaign_type to channel
      const channelMap = { linkedin: 'linkedin', email: 'email', gmail: 'email', sms: 'sms' };
      const channel = channelMap[campaign?.campaign_type] || 'linkedin';

      const tasks = messages.map(msg => ({
        organization_id: user.organization_id,
        campaign_id: campaign.id,
        candidate_id: msg.candidate_id,
        task_type: 'initial_outreach',
        message_content: msg.content,
        subject: msg.subject || null,
        channel,
        status: 'approved_ready',
        stage: 'first_message',
        attempt_number: 1,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        candidate_name: msg.candidate_name || null,
        metadata: {
          subject: msg.subject,
          message: msg.content, // duplicate for edge function fallback
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
        .select('*, candidate:candidate_id(id, first_name, last_name, name, job_title, email, company_name, linkedin_profile, phone)')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOutreachTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch outreach tasks:', err);
    }
  };

  // Handle sending an outreach task via executeTalentOutreach edge function
  const handleSendTask = async (taskId) => {
    try {
      // First approve the specific task if not already approved
      await supabase
        .from('outreach_tasks')
        .update({ status: 'approved_ready', approved_at: new Date().toISOString(), approved_by: user?.id })
        .eq('id', taskId)
        .eq('status', 'approved_ready'); // no-op if already approved

      // Call the real execution engine
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/executeTalentOutreach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            user_id: user?.id,
            limit: 1, // Send just this one task
          }),
        }
      );

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      if (result.sent > 0) {
        toast.success('Message sent successfully!');
      } else if (result.skipped_no_connection > 0) {
        toast.error('No integration connected. Connect LinkedIn/Gmail in Settings → Integrations.');
      } else if (result.skipped_rate_limit > 0) {
        toast.warning('Daily rate limit reached. Try again tomorrow.');
      } else if (result.failed > 0) {
        const detail = result.details?.[0];
        toast.error(`Send failed: ${detail?.error || 'Unknown error'}`);
      } else {
        toast.warning('No approved tasks to send');
      }

      fetchOutreachTasks();
    } catch (err) {
      console.error('Failed to send task:', err);
      toast.error(`Failed to send: ${err.message}`);
    }
  };

  // Handle sending ALL approved_ready tasks in batch
  const handleSendAllTasks = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/executeTalentOutreach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            user_id: user?.id,
            limit: 50,
          }),
        }
      );

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      const parts = [];
      if (result.sent > 0) parts.push(`${result.sent} sent`);
      if (result.failed > 0) parts.push(`${result.failed} failed`);
      if (result.skipped_rate_limit > 0) parts.push(`${result.skipped_rate_limit} rate-limited`);
      if (result.skipped_no_connection > 0) parts.push(`${result.skipped_no_connection} no connection`);

      if (result.sent > 0) {
        toast.success(`Batch complete: ${parts.join(', ')}`);
      } else if (parts.length > 0) {
        toast.warning(`Batch complete: ${parts.join(', ')}`);
      } else {
        toast.info('No approved tasks to send');
      }

      fetchOutreachTasks();
    } catch (err) {
      console.error('Failed to send batch:', err);
      toast.error(`Batch send failed: ${err.message}`);
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
      <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} relative`}>
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
    <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} relative`}>
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
            className={`p-2 rounded-lg ${t("bg-gray-100", "bg-zinc-800/50")} ${t("hover:bg-gray-200", "hover:bg-zinc-800")} ${t("text-gray-400", "text-zinc-400")} ${t("hover:text-gray-900", "hover:text-white")} transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-bold ${t("text-gray-900", "text-white")}`}>
                {isNew ? "New Campaign" : formData.name || "Campaign"}
              </h1>
              {!isNew && <StatusBadge status={formData.status} />}
            </div>
            <p className={`text-sm ${t("text-gray-400", "text-zinc-500")} mt-0.5`}>
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
                className={t("border-gray-200", "border-zinc-700")}
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
          <div className="flex items-center justify-between mb-4 gap-4">
            <TabsList className={t("bg-gray-100", "bg-zinc-800/50")}>
              {!isNew && (
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
              )}
              {!isNew && (
                <TabsTrigger
                  value="candidates"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Candidates
                </TabsTrigger>
              )}
              {!isNew && (
                <TabsTrigger
                  value="outreach"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Outreach
                </TabsTrigger>
              )}
              {!isNew && (
                <TabsTrigger
                  value="flow"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Flow
                </TabsTrigger>
              )}
              {!isNew && (
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              )}
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Flow toolbar - shown inline when Flow tab is active */}
            {activeTab === 'flow' && !isNew && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => flowTabRef.current?.save()}
                  disabled={flowTabRef.current?.saving}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {flowTabRef.current?.saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Flow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => flowTabRef.current?.regenerate()}
                  className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-600", "text-zinc-300")} ${t("hover:text-gray-900", "hover:text-white")}`}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => flowTabRef.current?.validate()}
                  className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-600", "text-zinc-300")} ${t("hover:text-gray-900", "hover:text-white")}`}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => flowTabRef.current?.autoLayout()}
                  className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-600", "text-zinc-300")} ${t("hover:text-gray-900", "hover:text-white")}`}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Auto-layout
                </Button>
              </div>
            )}
          </div>

          {/* Overview Tab */}
          {!isNew && (
            <TabsContent value="overview" className="m-0">
              {activeTab === "overview" && (
                <OverviewTab
                  campaign={campaign}
                  formData={formData}
                  stats={stats}
                  onCandidateClick={(match) => {
                    setDrawerCandidateId(match.candidate_id);
                    setDrawerMatchData(match);
                  }}
                />
              )}
            </TabsContent>
          )}

          {/* Candidates Tab */}
          {!isNew && (
            <TabsContent value="candidates" className="m-0">
              {activeTab === "candidates" && (
                <CandidatesTab
                  campaign={campaign}
                  matchedCandidates={campaign?.matched_candidates || []}
                  selectedCandidates={selectedCandidates}
                  onToggleCandidateSelect={handleToggleCandidateSelect}
                  onSelectAllExcellent={handleSelectAllExcellent}
                  onSaveSelection={handleSaveSelection}
                  onGenerateOutreach={handleGenerateOutreach}
                  onRunMatching={() => runAutoMatching(campaign)}
                  onCandidateClick={(match) => {
                    setDrawerCandidateId(match.candidate_id);
                    setDrawerMatchData(match);
                  }}
                  isMatching={isMatching}
                  savingSelection={savingSelection}
                  generatingOutreach={generatingOutreach}
                  linkedNest={linkedNest}
                  nestCandidates={nestCandidates}
                  formData={formData}
                />
              )}
            </TabsContent>
          )}


          {/* Outreach Tab */}
          {!isNew && (
            <TabsContent value="outreach" className="m-0">
              {activeTab === "outreach" && (
                <>
                  {/* Mode Toggle + Customize button */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={outreachMode === "queue" ? "default" : "ghost"}
                        onClick={() => setOutreachMode("queue")}
                        className={outreachMode === "queue" ? "bg-red-500 hover:bg-red-600" : `${t("text-gray-500", "text-zinc-400")} ${t("hover:text-gray-900", "hover:text-white")}`}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Queue View
                      </Button>
                      <Button
                        size="sm"
                        variant={outreachMode === "linkedin" ? "default" : "ghost"}
                        onClick={() => setOutreachMode("linkedin")}
                        className={outreachMode === "linkedin" ? "bg-red-500 hover:bg-red-600" : `${t("text-gray-500", "text-zinc-400")} ${t("hover:text-gray-900", "hover:text-white")}`}
                      >
                        <Linkedin className="w-4 h-4 mr-1" />
                        LinkedIn Workflow
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCustomizeDrawer(true)}
                      className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-600", "text-zinc-300")} ${t("hover:text-gray-900", "hover:text-white")}`}
                    >
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Customize Messages
                    </Button>
                  </div>

                  {outreachMode === "queue" && (
                    <OutreachQueueTab
                      campaign={campaign}
                      tasks={outreachTasks}
                      onRefresh={fetchOutreachTasks}
                      onSendTask={handleSendTask}
                      onSendAll={handleSendAllTasks}
                      onCancelTask={handleCancelTask}
                    />
                  )}
                  {outreachMode === "linkedin" && (
                    <LinkedInOutreachWorkflow
                      campaign={campaign}
                      organizationId={campaign?.organization_id}
                    />
                  )}

                  {/* Customize Messages Sheet Drawer */}
                  <Sheet open={showCustomizeDrawer} onOpenChange={setShowCustomizeDrawer}>
                    <SheetContent className={`${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-800")} w-[480px] sm:max-w-[480px] overflow-y-auto`}>
                      <SheetHeader>
                        <SheetTitle className={t("text-gray-900", "text-white")}>Customize Messages</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        <OutreachCustomizationPanel
                          organizationId={campaign?.organization_id}
                          campaignId={campaign?.id}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </TabsContent>
          )}

          {/* Flow Tab */}
          {!isNew && (
            <TabsContent value="flow" className="m-0">
              {activeTab === "flow" && (
                <TalentFlowTab
                  ref={flowTabRef}
                  campaign={campaign}
                  onFlowSaved={(flowId) => handleChange('flow_id', flowId)}
                />
              )}
            </TabsContent>
          )}

          {/* Analytics Tab */}
          {!isNew && (
            <TabsContent value="analytics" className="m-0">
              {activeTab === "analytics" && (
                <AnalyticsTab
                  campaign={campaign}
                  outreachTasks={outreachTasks}
                  matchedCandidates={campaign?.matched_candidates || []}
                />
              )}
            </TabsContent>
          )}

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 m-0">
            {activeTab === "settings" && (
              <>
                <SettingsTab
                  formData={formData}
                  handleChange={handleChange}
                  handleStatusChange={handleStatusChange}
                  isNew={isNew}
                  projects={projects}
                  roles={roles}
                  campaign={campaign}
                />

                {/* Outreach Sequence (merged from Sequence tab) */}
                {!isNew && (
                  <div className={`pt-6 border-t ${t("border-gray-200", "border-zinc-700/50")}`}>
                    <h3 className={`text-lg font-semibold ${t("text-gray-900", "text-white")} mb-4 flex items-center gap-2`}>
                      <FileText className="w-5 h-5 text-red-400" />
                      Outreach Sequence
                    </h3>
                    <CampaignSequenceEditor
                      steps={formData.sequence_steps}
                      onChange={(steps) => handleChange("sequence_steps", steps)}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
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
