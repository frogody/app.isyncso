import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
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
    active: { bg: "bg-green-500/20", text: "text-green-400", label: "Active" },
    paused: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Paused" },
    draft: { bg: "bg-white/10", text: "text-white/60", label: "Draft" },
    completed: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Completed" },
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
    recruitment: { bg: "bg-violet-500/20", text: "text-violet-400", label: "Recruitment" },
    growth: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Growth" },
  };

  const style = styles[type] || styles.growth;

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
          stroke="#8b5cf6"
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
const CampaignCard = ({ campaign, onEdit, onToggle, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  const matchedCandidates = campaign.matched_candidates || [];
  const sentCount = matchedCandidates.filter((c) => c.status === "sent").length;
  const repliedCount = matchedCandidates.filter((c) => c.status === "replied").length;
  const progress = matchedCandidates.length > 0 
    ? Math.round((sentCount / matchedCandidates.length) * 100) 
    : 0;

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-6 hover:border-violet-500/30 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={campaign.status} />
              <TypeBadge type={campaign.campaign_type} />
            </div>
            <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
            <p className="text-sm text-white/60 line-clamp-2 mt-1">{campaign.description}</p>
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
                        onEdit(campaign);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Campaign
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
                          Resume Campaign
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
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
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{matchedCandidates.length}</p>
            <p className="text-xs text-white/60">Candidates</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-violet-400">{sentCount}</p>
            <p className="text-xs text-white/60">Sent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{repliedCount}</p>
            <p className="text-xs text-white/60">Replied</p>
          </div>
          <div className="flex items-center justify-center">
            <ProgressRing progress={progress} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Calendar className="w-4 h-4" />
            <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
          </div>
          <button className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
            View Details
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Create Campaign Modal
const CreateCampaignModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    campaign_type: "recruitment",
    status: "draft",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: "", description: "", campaign_type: "recruitment", status: "draft" });
  };

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
            <label className="block text-sm font-medium text-white/70 mb-2">Campaign Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Q1 Engineering Recruitment"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the campaign goals..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Campaign Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((f) => ({ ...f, campaign_type: "recruitment" }))}
                className={`p-4 rounded-lg border transition-colors ${
                  formData.campaign_type === "recruitment"
                    ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <Target className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Recruitment</p>
                <p className="text-xs mt-1 opacity-70">New candidates</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData((f) => ({ ...f, campaign_type: "growth" }))}
                className={`p-4 rounded-lg border transition-colors ${
                  formData.campaign_type === "growth"
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Growth</p>
                <p className="text-xs mt-1 opacity-70">Existing relationships</p>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors font-medium"
            >
              Create Campaign
            </button>
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (formData) => {
    if (!user?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([
          {
            ...formData,
            organization_id: user.organization_id,
            matched_candidates: [],
            message_style: {},
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setCampaigns((prev) => [data, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating campaign:", err);
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
    } catch (err) {
      console.error("Error toggling campaign:", err);
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id);

      if (error) throw error;
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
    } catch (err) {
      console.error("Error deleting campaign:", err);
    }
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

    return { active, totalCandidates, totalSent, totalReplied };
  }, [campaigns]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Campaigns"
          description="Manage your outreach campaigns"
          icon={Megaphone}
          iconColor="violet"
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Campaigns"
          value={stats.active}
          icon={Play}
          color="green"
        />
        <StatCard
          title="Total Candidates"
          value={stats.totalCandidates}
          icon={Users}
          color="violet"
        />
        <StatCard
          title="Messages Sent"
          value={stats.totalSent}
          icon={Send}
          color="blue"
        />
        <StatCard
          title="Replies Received"
          value={stats.totalReplied}
          icon={MessageSquare}
          color="emerald"
        />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-violet-500/50"
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
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-violet-500/50"
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
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={() => {}}
              onToggle={handleToggleCampaign}
              onDelete={handleDeleteCampaign}
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </GlassCard>
      )}

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCampaignModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateCampaign}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
