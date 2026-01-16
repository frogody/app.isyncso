import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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
import { CandidateMatchingPanel, OutreachPipeline, OutreachQueue } from "@/components/talent";
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
    paused: "bg-yellow-500/20 text-yellow-400",
    draft: "bg-zinc-500/20 text-zinc-400",
    completed: "bg-red-500/20 text-red-400",
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

// Overview Tab Component
const OverviewTab = ({ campaign, formData, stats }) => {
  const matchedCandidates = campaign?.matched_candidates || [];

  return (
    <div className="space-y-6">
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

          {/* Top Matches Preview */}
          {matchedCandidates.length > 0 && (
            <GlassCard className="p-5">
              <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                Top Matches
              </h4>
              <div className="space-y-2">
                {matchedCandidates
                  .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
                  .slice(0, 3)
                  .map((match, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-sm text-white truncate">
                        {match.candidate_name || "Unknown"}
                      </span>
                      <span className="text-sm font-medium text-red-400">
                        {match.match_score || 0}%
                      </span>
                    </div>
                  ))}
              </div>
            </GlassCard>
          )}
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
                <span className="text-yellow-400 font-medium">{metrics.scoreDistribution.medium}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
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
  });

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

  const handleStatusChange = async (newStatus) => {
    if (!campaignId) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);

      if (error) throw error;

      handleChange("status", newStatus);
      setCampaign((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Campaign ${newStatus === "active" ? "activated" : newStatus}`);
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
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
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
            {!isNew && (
              <TabsTrigger
                value="matches"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Matches
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
              <OverviewTab campaign={campaign} formData={formData} stats={stats} />
            </TabsContent>
          )}

          {/* Matches Tab */}
          {!isNew && (
            <TabsContent value="matches" className="m-0">
              <CandidateMatchingPanel
                campaign={campaign}
                onUpdate={handleCampaignUpdate}
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
