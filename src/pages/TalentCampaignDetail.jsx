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
import { CandidateMatchingPanel, OutreachQueue } from "@/components/talent";
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
    active: "bg-green-500/20 text-green-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    draft: "bg-zinc-500/20 text-zinc-400",
    completed: "bg-blue-500/20 text-blue-400",
    archived: "bg-zinc-500/20 text-zinc-500",
  };

  return (
    <Badge className={styles[status] || styles.draft}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
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
  const [activeTab, setActiveTab] = useState("settings");

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
  });

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
      };
      delete duplicateData.id;

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
    const sent = matched.filter((c) => c.status === "sent").length;
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
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
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
              {isNew ? "Create a new outreach campaign" : "Manage your campaign settings and sequence"}
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
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
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
            className="bg-violet-500 hover:bg-violet-600"
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

      {/* Stats (non-new campaigns) */}
      {!isNew && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="Matched Candidates"
            value={stats.totalCandidates}
            icon={Users}
            color="violet"
          />
          <StatCard
            title="Messages Sent"
            value={stats.sent}
            icon={Mail}
            color="blue"
          />
          <StatCard
            title="Replies"
            value={stats.replied}
            icon={Mail}
            color="green"
          />
          <StatCard
            title="Reply Rate"
            value={`${stats.replyRate}%`}
            icon={BarChart3}
            color="amber"
          />
        </div>
      )}

      {/* Main Content */}
      <GlassCard className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800/50 mb-6">
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="sequence"
              className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"
            >
              <List className="w-4 h-4 mr-2" />
              Sequence
            </TabsTrigger>
            {!isNew && (
              <>
                <TabsTrigger
                  value="candidates"
                  className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Candidates
                </TabsTrigger>
                <TabsTrigger
                  value="outreach"
                  className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Outreach
                </TabsTrigger>
                <TabsTrigger
                  value="metrics"
                  className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Metrics
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="settings" className="space-y-6 m-0">
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
          </TabsContent>

          <TabsContent value="sequence" className="m-0">
            <CampaignSequenceEditor
              steps={formData.sequence_steps}
              onChange={(steps) => handleChange("sequence_steps", steps)}
            />
          </TabsContent>

          {!isNew && (
            <>
              <TabsContent value="candidates" className="m-0">
                <CandidateMatchingPanel
                  campaign={campaign}
                  onUpdate={handleCampaignUpdate}
                />
              </TabsContent>

              <TabsContent value="outreach" className="m-0">
                <OutreachQueue campaignId={campaignId} />
              </TabsContent>

              <TabsContent value="metrics" className="m-0">
                <CampaignMetricsPanel campaign={campaign} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </GlassCard>
    </motion.div>
  );
}
