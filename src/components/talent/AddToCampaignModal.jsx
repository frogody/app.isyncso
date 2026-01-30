import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Megaphone,
  Plus,
  Check,
  Loader2,
  Users,
  Calendar,
  Mail,
  Linkedin,
  Phone,
  Zap,
  Search,
  Sparkles,
  FolderPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TypeIcon = ({ type }) => {
  const icons = {
    email: Mail,
    linkedin: Linkedin,
    cold_call: Phone,
    multi_channel: Zap,
  };
  const Icon = icons[type] || Mail;
  return <Icon className="w-4 h-4" />;
};

const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-red-500/20 text-red-400",
    paused: "bg-red-500/10 text-red-300",
    draft: "bg-zinc-500/20 text-zinc-400",
    completed: "bg-red-500/20 text-red-400",
  };

  return (
    <Badge className={styles[status] || styles.draft}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
};

const CampaignOption = ({ campaign, selected, onSelect }) => {
  const matchCount = campaign.matched_candidates?.length || 0;

  return (
    <motion.button

      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(campaign.id)}
      className={`w-full p-4 rounded-xl border text-left transition-all ${
        selected
          ? "bg-red-500/10 border-red-500/50"
          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${selected ? "bg-red-500/20" : "bg-zinc-700"}`}>
            <TypeIcon type={campaign.campaign_type} />
          </div>
          <div>
            <p className="font-medium text-white">{campaign.name}</p>
            <p className="text-sm text-zinc-400 mt-0.5">
              {campaign.role_context?.role_title || campaign.description || "No description"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selected && (
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
        <StatusBadge status={campaign.status} />
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {matchCount} matches
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(campaign.created_at).toLocaleDateString()}
        </span>
      </div>
    </motion.button>
  );
};

export default function AddToCampaignModal({
  open,
  onClose,
  selectedCandidateIds = [],
  onSuccess,
}) {
  const { user } = useUser();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [runMatching, setRunMatching] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCampaigns();
      setSelectedCampaignId(null);
      setSearchQuery("");
    }
  }, [open]);

  const fetchCampaigns = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", user.organization_id)
        .in("status", ["draft", "active", "paused"])
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

  const handleAdd = async () => {
    if (!selectedCampaignId || selectedCandidateIds.length === 0) return;

    setAdding(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

      // Get candidate data for the selected IDs
      const { data: candidateData, error: candError } = await supabase
        .from("candidates")
        .select("*")
        .in("id", selectedCandidateIds);

      if (candError) throw candError;

      // Merge existing matched_candidates with new ones (avoiding duplicates)
      const existingMatches = selectedCampaign.matched_candidates || [];
      const existingIds = new Set(existingMatches.map((m) => m.candidate_id));

      const newMatches = candidateData
        .filter((c) => !existingIds.has(c.id))
        .map((candidate) => ({
          candidate_id: candidate.id,
          candidate_name: `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim(),
          current_title: candidate.job_title,
          current_company: candidate.company_name,
          match_score: candidate.intelligence_score || 50, // Use intel score as initial match
          match_level: candidate.intelligence_level || "Fair",
          match_reasons: candidate.outreach_hooks || [],
          intelligence_score: candidate.intelligence_score,
          recommended_approach: candidate.recommended_approach,
          best_outreach_angle: candidate.best_outreach_angle,
          timing_signals: candidate.timing_signals,
          added_manually: true,
          added_at: new Date().toISOString(),
        }));

      if (newMatches.length === 0) {
        toast.info("All selected candidates are already in this campaign");
        setAdding(false);
        return;
      }

      // Update campaign with merged candidates
      const updatedMatches = [...existingMatches, ...newMatches];

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          matched_candidates: updatedMatches,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCampaignId);

      if (updateError) throw updateError;

      // Also create candidate_campaign_matches records
      const matchRecords = newMatches.map((m) => ({
        candidate_id: m.candidate_id,
        campaign_id: selectedCampaignId,
        organization_id: user.organization_id,
        match_score: m.match_score,
        match_reasons: m.match_reasons,
        intelligence_score: m.intelligence_score,
        recommended_approach: m.recommended_approach,
        best_outreach_angle: m.best_outreach_angle,
        timing_signals: m.timing_signals,
        status: "matched",
        matched_at: new Date().toISOString(),
      }));

      // Insert match records (ignore conflicts)
      await supabase
        .from("candidate_campaign_matches")
        .upsert(matchRecords, { onConflict: "candidate_id,campaign_id" });

      toast.success(`Added ${newMatches.length} candidates to ${selectedCampaign.name}`);

      if (onSuccess) {
        onSuccess(selectedCampaignId, newMatches.length);
      }

      onClose();

      // Optionally navigate to campaign detail
      if (runMatching) {
        navigate(`${createPageUrl("TalentCampaignDetail")}?id=${selectedCampaignId}`);
      }
    } catch (error) {
      console.error("Error adding candidates to campaign:", error);
      toast.error("Failed to add candidates to campaign");
    } finally {
      setAdding(false);
    }
  };

  const handleCreateNew = () => {
    onClose();
    // Navigate to campaign creation with selected candidates stored
    navigate(`${createPageUrl("TalentCampaigns")}?action=new&candidateIds=${selectedCandidateIds.join(",")}`);
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role_context?.role_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-red-400" />
            Add {selectedCandidateIds.length} Candidates to Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Campaign List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[350px]">
            {loading ? (
              <>
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </>
            ) : filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
                <CampaignOption
                  key={campaign.id}
                  campaign={campaign}
                  selected={selectedCampaignId === campaign.id}
                  onSelect={setSelectedCampaignId}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <Megaphone className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 mb-2">No campaigns found</p>
                <p className="text-sm text-zinc-500">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create a campaign to start matching candidates"}
                </p>
              </div>
            )}
          </div>

          {/* Run Matching Option */}
          {selectedCampaignId && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <input
                type="checkbox"
                id="runMatching"
                checked={runMatching}
                onChange={(e) => setRunMatching(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-700 text-red-500"
              />
              <label htmlFor="runMatching" className="flex items-center gap-2 text-sm text-red-400 cursor-pointer">
                <Sparkles className="w-4 h-4" />
                Go to campaign and run AI matching
              </label>
            </div>
          )}

          {/* Create New Option */}
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-3 w-full p-4 rounded-xl border border-dashed border-zinc-700 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-left"
          >
            <div className="p-2 rounded-lg bg-red-500/20">
              <Plus className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-medium text-white">Create New Campaign</p>
              <p className="text-sm text-zinc-400">Start a new campaign with these candidates</p>
            </div>
          </button>
        </div>

        <DialogFooter className="pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedCampaignId || adding}
            className="bg-red-500 hover:bg-red-600"
          >
            {adding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
