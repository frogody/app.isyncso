import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Edit,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  MessageSquare,
  Send,
  Eye,
  Copy,
  Archive,
  RefreshCw,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Campaign Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    active: { bg: "bg-red-500/20", text: "text-red-400", label: "Active" },
    paused: { bg: "bg-red-800/30", text: "text-red-300", label: "Paused" },
    draft: { bg: "bg-white/10", text: "text-white/60", label: "Draft" },
    completed: { bg: "bg-red-600/20", text: "text-red-400", label: "Completed" },
    archived: { bg: "bg-white/5", text: "text-white/40", label: "Archived" },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Campaign Type Badge
const TypeBadge = ({ type }) => {
  const styles = {
    recruitment: { bg: "bg-red-500/20", text: "text-red-400", label: "Recruitment" },
    growth: { bg: "bg-red-400/20", text: "text-red-300", label: "Growth" },
  };

  const style = styles[type] || styles.recruitment;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// Progress Ring
const ProgressRing = ({ progress, size = 40, strokeWidth = 3 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-medium text-white">{progress}%</span>
    </div>
  );
};

// Campaign Card
const CampaignCard = ({ campaign, onEdit, onToggle, onDelete, onDuplicate, onClick }) => {
  const [showMenu, setShowMenu] = useState(false);

  const matchedCandidates = campaign.matched_candidates || [];
  const sentCount = matchedCandidates.filter((c) => c.status === "sent").length;
  const repliedCount = matchedCandidates.filter((c) => c.status === "replied").length;
  const progress = matchedCandidates.length > 0 
    ? Math.round((sentCount / matchedCandidates.length) * 100) 
    : 0;

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-4 hover:border-red-500/30 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 cursor-pointer" onClick={onClick}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <StatusBadge status={campaign.status} />
              <TypeBadge type={campaign.campaign_type} />
            </div>
            <h3 className="text-sm font-semibold text-white">{campaign.name}</h3>
            <p className="text-xs text-white/60 line-clamp-2 mt-0.5">{campaign.description}</p>
          </div>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onClick();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        onEdit(campaign);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Settings
                    </button>
                    <button
                      onClick={() => {
                        onToggle(campaign);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      {campaign.status === "active" ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause Campaign
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Activate Campaign
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onDuplicate(campaign);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        onDelete(campaign);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{matchedCandidates.length}</p>
            <p className="text-[10px] text-white/60">Candidates</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">{sentCount}</p>
            <p className="text-[10px] text-white/60">Sent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">{repliedCount}</p>
            <p className="text-[10px] text-white/60">Replied</p>
          </div>
          <div className="flex items-center justify-center">
            <ProgressRing progress={progress} size={32} strokeWidth={2} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-500 to-red-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Calendar className="w-3 h-3" />
            <span>Created {new Date(campaign.created_date).toLocaleDateString()}</span>
          </div>
          <button
            onClick={onClick}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            View Details
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Create Campaign Modal
const CreateCampaignModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    campaign_type: "recruitment",
    status: "draft",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("[CreateCampaign] Submitting form data:", formData);
    onSubmit(formData);
  };

  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: "", description: "", campaign_type: "recruitment", status: "draft" });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Create Campaign</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-zinc-400 mb-2 block">Campaign Name</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Q1 Engineering Recruitment"
              className="bg-zinc-800/50 border-zinc-700 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-zinc-400 mb-2 block">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the campaign goals..."
              rows={3}
              className="bg-zinc-800/50 border-zinc-700 text-white resize-none"
            />
          </div>

          <div>
            <Label className="text-zinc-400 mb-2 block">Campaign Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "recruitment", label: "Recruitment", icon: Users, description: "Talent sourcing & outreach" },
                { value: "growth", label: "Growth", icon: TrendingUp, description: "Sales & marketing campaigns" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, campaign_type: type.value }))}
                  className={`p-4 rounded-lg border transition-colors ${
                    formData.campaign_type === type.value
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <type.icon className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-white/50 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Campaign"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default function TalentCampaigns() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("created_date", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (formData) => {
    console.log("[handleCreateCampaign] Starting with formData:", formData);
    console.log("[handleCreateCampaign] User:", user);
    console.log("[handleCreateCampaign] Organization ID:", user?.organization_id);

    if (!user?.organization_id) {
      console.error("[handleCreateCampaign] No organization_id found");
      toast.error("Organization not found. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignData = {
        name: formData.name,
        description: formData.description || null,
        campaign_type: formData.campaign_type,
        status: formData.status || "draft",
        organization_id: user.organization_id,
        created_by: user.id,
      };

      console.log("[handleCreateCampaign] Inserting campaign data:", campaignData);

      const { data, error } = await supabase
        .from("campaigns")
        .insert([campaignData])
        .select()
        .single();

      console.log("[handleCreateCampaign] Supabase response - data:", data, "error:", error);

      if (error) {
        console.error("[handleCreateCampaign] Supabase error:", error);
        throw error;
      }

      setCampaigns((prev) => [data, ...prev]);
      setShowCreateModal(false);
      toast.success("Campaign created successfully!");

      // Navigate to the detail page
      navigate(`${createPageUrl("TalentCampaignDetail")}?id=${data.id}`);
    } catch (err) {
      console.error("[handleCreateCampaign] Error:", err);
      toast.error(err.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCampaign = async (campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaign.id);

      if (error) throw error;
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
      );
      toast.success(`Campaign ${newStatus === "active" ? "activated" : "paused"}`);
    } catch (err) {
      console.error("Error toggling campaign:", err);
      toast.error("Failed to update campaign status");
    }
  };

  const handleDuplicateCampaign = async (campaign) => {
    if (!user?.organization_id) return;

    try {
      const duplicateData = {
        name: `${campaign.name} (Copy)`,
        description: campaign.description,
        campaign_type: campaign.campaign_type,
        status: "draft",
        organization_id: user.organization_id,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("campaigns")
        .insert([duplicateData])
        .select()
        .single();

      if (error) throw error;

      setCampaigns((prev) => [data, ...prev]);
      toast.success("Campaign duplicated");
    } catch (err) {
      console.error("Error duplicating campaign:", err);
      toast.error("Failed to duplicate campaign");
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deletingCampaign) return;

    setIsDeleting(true);
    try {
      // Delete related outreach tasks first
      const { error: tasksError } = await supabase
        .from("outreach_tasks")
        .delete()
        .eq("campaign_id", deletingCampaign.id);

      if (tasksError) console.warn("Error deleting tasks:", tasksError);

      // Delete the campaign
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", deletingCampaign.id);

      if (error) throw error;
      
      setCampaigns((prev) => prev.filter((c) => c.id !== deletingCampaign.id));
      setDeletingCampaign(null);
      toast.success("Campaign deleted");
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast.error("Failed to delete campaign");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCampaignClick = (campaign) => {
    navigate(`${createPageUrl("TalentCampaignDetail")}?id=${campaign.id}`);
  };

  const handleEditCampaign = (campaign) => {
    navigate(`${createPageUrl("TalentCampaignDetail")}?id=${campaign.id}`);
  };

  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (typeFilter) {
      result = result.filter((c) => c.campaign_type === typeFilter);
    }

    return result;
  }, [campaigns, searchQuery, statusFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === "active").length;
    const totalCandidates = campaigns.reduce(
      (sum, c) => sum + (c.matched_candidates?.length || 0),
      0
    );
    const totalSent = campaigns.reduce(
      (sum, c) =>
        sum + (c.matched_candidates?.filter((m) => m.status === "sent").length || 0),
      0
    );
    const totalReplied = campaigns.reduce(
      (sum, c) =>
        sum + (c.matched_candidates?.filter((m) => m.status === "replied").length || 0),
      0
    );

    return { total, active, totalCandidates, totalSent, totalReplied };
  }, [campaigns]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Campaigns"
          subtitle="Manage your outreach campaigns"
          icon={Megaphone}
          color="red"
        />
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-red-500 hover:bg-red-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`Total Campaigns (${stats.active} active)`}
          value={stats.total}
          icon={Megaphone}
          color="red"
        />
        <StatCard
          label="Total Candidates"
          value={stats.totalCandidates}
          icon={Users}
          color="red"
        />
        <StatCard
          label="Messages Sent"
          value={stats.totalSent}
          icon={Send}
          color="red"
        />
        <StatCard
          label="Replies Received"
          value={stats.totalReplied}
          icon={MessageSquare}
          color="red"
        />
      </div>

      {/* Filters */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-red-500/50"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-red-500/50"
          >
            <option value="">All Types</option>
            <option value="recruitment">Recruitment</option>
            <option value="growth">Growth</option>
          </select>

          <button
            onClick={fetchCampaigns}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Campaigns Grid */}
      {filteredCampaigns.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEditCampaign}
              onToggle={handleToggleCampaign}
              onDelete={setDeletingCampaign}
              onDuplicate={handleDuplicateCampaign}
              onClick={() => handleCampaignClick(campaign)}
            />
          ))}
        </motion.div>
      ) : (
        <GlassCard className="p-12 text-center">
          <Megaphone className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No campaigns found</h3>
          <p className="text-white/60 mb-6">
            {searchQuery || statusFilter || typeFilter
              ? "Try adjusting your filters"
              : "Create your first campaign to start reaching out to candidates"}
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-red-500 hover:bg-red-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </GlassCard>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCampaignModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateCampaign}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Campaign
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete <strong className="text-white">{deletingCampaign?.name}</strong>?
              This will also delete all related outreach tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
