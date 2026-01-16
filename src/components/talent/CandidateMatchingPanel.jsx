import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Sparkles,
  Loader2,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  Target,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CandidateMatchCard, CandidateMatchList } from "./CandidateMatchCard";

/**
 * CandidateMatchingPanel - AI-powered candidate matching for campaigns
 *
 * @param {object} campaign - Campaign object with matched_candidates
 * @param {function} onUpdate - Callback when campaign is updated
 */
export default function CandidateMatchingPanel({ campaign, onUpdate }) {
  const { user } = useUser();
  const [candidates, setCandidates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [sortOrder, setSortOrder] = useState("desc");

  // AI Matching config
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [minScore, setMinScore] = useState(30);

  // Load initial data
  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch candidates, projects, and roles in parallel
      const [candidatesRes, projectsRes, rolesRes] = await Promise.all([
        supabase
          .from("candidates")
          .select("*")
          .eq("organization_id", user.organization_id)
          .in("status", ["active", "passive"])
          .order("intelligence_score", { ascending: false }),
        supabase
          .from("projects")
          .select("*")
          .eq("organization_id", user.organization_id)
          .eq("status", "active"),
        supabase
          .from("roles")
          .select("*")
          .eq("organization_id", user.organization_id)
          .eq("status", "active"),
      ]);

      if (candidatesRes.error) throw candidatesRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setCandidates(candidatesRes.data || []);
      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Get matched candidates from campaign
  const matchedCandidates = useMemo(() => {
    return campaign?.matched_candidates || [];
  }, [campaign]);

  // Filter and sort matched candidates
  const filteredMatches = useMemo(() => {
    let result = [...matchedCandidates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const candidate = candidates.find((c) => c.id === m.candidate_id);
        return (
          m.candidate_name?.toLowerCase().includes(query) ||
          candidate?.name?.toLowerCase().includes(query) ||
          candidate?.email?.toLowerCase().includes(query) ||
          candidate?.current_company?.toLowerCase().includes(query) ||
          candidate?.current_title?.toLowerCase().includes(query)
        );
      });
    }

    // Score filter
    if (scoreFilter !== "all") {
      const threshold = parseInt(scoreFilter);
      result = result.filter((m) => m.match_score >= threshold);
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === "score") {
        aVal = a.match_score || 0;
        bVal = b.match_score || 0;
      } else if (sortBy === "intelligence") {
        aVal = a.intelligence_score || 0;
        bVal = b.intelligence_score || 0;
      } else if (sortBy === "name") {
        aVal = a.candidate_name?.toLowerCase() || "";
        bVal = b.candidate_name?.toLowerCase() || "";
      }
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [matchedCandidates, candidates, searchQuery, scoreFilter, sortBy, sortOrder]);

  // Run AI matching using the edge function
  const runAIMatching = async () => {
    if (!campaign?.id) {
      toast.error("Campaign not found");
      return;
    }

    if (!selectedProject && !selectedRole) {
      toast.error("Please select a project or role to match against");
      return;
    }

    setMatching(true);
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
            campaign_id: campaign.id,
            organization_id: user.organization_id,
            project_id: selectedProject || undefined,
            role_id: selectedRole || undefined,
            min_score: minScore,
            limit: 50,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to run AI matching");
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          `AI matched ${result.matched_candidates?.length || 0} candidates from ${result.candidates_analyzed} analyzed`
        );

        // Update campaign in parent
        if (onUpdate && result.matched_candidates) {
          onUpdate({
            ...campaign,
            matched_candidates: result.matched_candidates.map((m) => ({
              candidate_id: m.candidate_id,
              candidate_name: m.candidate_name,
              match_score: m.match_score,
              match_reasons: m.match_reasons,
              intelligence_score: m.intelligence_score,
              recommended_approach: m.recommended_approach,
              status: "matched",
              added_at: new Date().toISOString(),
            })),
          });
        }
      } else {
        toast.error(result.message || "No matches found");
      }
    } catch (error) {
      console.error("Error running AI matching:", error);
      toast.error(error.message || "Failed to run AI matching");
    } finally {
      setMatching(false);
    }
  };

  // Update candidate status in campaign
  const updateCandidateStatus = async (candidateId, newStatus) => {
    if (!campaign?.id) return;

    try {
      const updatedMatches = matchedCandidates.map((m) =>
        m.candidate_id === candidateId ? { ...m, status: newStatus } : m
      );

      const { error } = await supabase
        .from("campaigns")
        .update({ matched_candidates: updatedMatches })
        .eq("id", campaign.id);

      if (error) throw error;

      onUpdate?.({ ...campaign, matched_candidates: updatedMatches });
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Handle adding to outreach queue
  const handleAddToOutreach = (match) => {
    updateCandidateStatus(match.candidate_id, "pending");
  };

  // Stats
  const stats = useMemo(() => {
    const total = matchedCandidates.length;
    const highMatch = matchedCandidates.filter((m) => m.match_score >= 70).length;
    const medMatch = matchedCandidates.filter((m) => m.match_score >= 40 && m.match_score < 70).length;
    const avgScore = total > 0
      ? Math.round(matchedCandidates.reduce((sum, m) => sum + (m.match_score || 0), 0) / total)
      : 0;

    return { total, highMatch, medMatch, avgScore };
  }, [matchedCandidates]);

  // Available roles for selected project
  const availableRoles = useMemo(() => {
    if (!selectedProject) return roles;
    return roles.filter((r) => r.project_id === selectedProject);
  }, [roles, selectedProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Matching Configuration */}
      <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <Sparkles className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">AI Candidate Matching</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Match candidates against project requirements using AI analysis
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Project Selection */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Project (Optional)</label>
                <Select value={selectedProject || "__all__"} onValueChange={(v) => setSelectedProject(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="__all__">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Role (Optional)</label>
                <Select value={selectedRole || "__all__"} onValueChange={(v) => setSelectedRole(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="__all__">All Roles</SelectItem>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Score */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Minimum Score</label>
                <Select value={minScore.toString()} onValueChange={(v) => setMinScore(parseInt(v))}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="20">20%+</SelectItem>
                    <SelectItem value="30">30%+</SelectItem>
                    <SelectItem value="40">40%+</SelectItem>
                    <SelectItem value="50">50%+</SelectItem>
                    <SelectItem value="60">60%+</SelectItem>
                    <SelectItem value="70">70%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={runAIMatching}
              disabled={matching || (!selectedProject && !selectedRole)}
              className="bg-red-500 hover:bg-red-600"
            >
              {matching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Candidates...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Run AI Matching
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {matchedCandidates.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-zinc-500">Total Matches</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.highMatch}</p>
            <p className="text-xs text-zinc-500">High Match (70%+)</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.medMatch}</p>
            <p className="text-xs text-zinc-500">Medium Match</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.avgScore}%</p>
            <p className="text-xs text-zinc-500">Avg Score</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {matchedCandidates.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matched candidates..."
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>

          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-[140px] bg-zinc-800/50 border-zinc-700 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="70">70%+</SelectItem>
              <SelectItem value="50">50%+</SelectItem>
              <SelectItem value="30">30%+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="score">Match Score</SelectItem>
              <SelectItem value="intelligence">Flight Risk</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="text-zinc-400 hover:text-white"
          >
            {sortOrder === "desc" ? (
              <SortDesc className="w-4 h-4" />
            ) : (
              <SortAsc className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Matched Candidates List */}
      <CandidateMatchList
        matches={filteredMatches}
        candidates={candidates}
        onAddToOutreach={handleAddToOutreach}
        emptyMessage={
          matchedCandidates.length === 0
            ? "No candidates matched yet. Run AI matching to find suitable candidates."
            : "No candidates match your filters"
        }
      />

      {/* Footer */}
      {matchedCandidates.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-sm text-zinc-500">
          <span>
            Showing {filteredMatches.length} of {matchedCandidates.length} matched candidates
          </span>
          <span>
            {candidates.length} total candidates in pool
          </span>
        </div>
      )}
    </div>
  );
}
