import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Check,
  Loader2,
  Building2,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";

// Intelligence Gauge Component
const IntelligenceGauge = ({ score, size = "sm" }) => {
  const sizes = {
    sm: { width: 32, height: 32, strokeWidth: 3, fontSize: "text-xs" },
  };
  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score) => {
    if (score >= 80) return "#ef4444";
    if (score >= 60) return "#f97316";
    if (score >= 40) return "#eab308";
    return "#22c55e";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={height} className="-rotate-90">
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`absolute ${fontSize} font-bold text-white`}>{score}</span>
    </div>
  );
};

// Intelligence Level Badge
const IntelligenceLevelBadge = ({ level }) => {
  const styles = {
    critical: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-green-500/20 text-green-400",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[level] || styles.low}`}>
      {level?.charAt(0).toUpperCase() + level?.slice(1)}
    </span>
  );
};

// Candidate Row Component
const CandidateRow = ({ candidate, isSelected, onToggle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? "bg-violet-500/10 border-violet-500/30"
          : "bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600/50"
      }`}
      onClick={() => onToggle(candidate.id)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(candidate.id)}
        className="border-zinc-600"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{candidate.name}</span>
          <IntelligenceLevelBadge level={candidate.intelligence_level} />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
          <Building2 className="w-3 h-3" />
          <span className="truncate">
            {candidate.current_title ? `${candidate.current_title} at ` : ""}
            {candidate.current_company || "Unknown Company"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <IntelligenceGauge score={candidate.intelligence_score || 0} />
        {candidate.urgency === "urgent" || candidate.urgency === "high" ? (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        ) : null}
      </div>
    </motion.div>
  );
};

export default function CandidateMatchingPanel({ campaign, onUpdate }) {
  const { user } = useUser();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Load candidates and pre-select matched ones
  useEffect(() => {
    fetchCandidates();
  }, [user]);

  useEffect(() => {
    if (campaign?.matched_candidates) {
      const matchedIds = campaign.matched_candidates.map((c) => c.candidate_id || c.id);
      setSelectedIds(new Set(matchedIds));
    }
  }, [campaign]);

  const fetchCandidates = async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("organization_id", user.organization_id)
        .in("status", ["active", "passive"])
        .order("intelligence_score", { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.current_company?.toLowerCase().includes(query) ||
          c.current_title?.toLowerCase().includes(query)
      );
    }

    if (levelFilter !== "all") {
      result = result.filter((c) => c.intelligence_level === levelFilter);
    }

    return result;
  }, [candidates, searchQuery, levelFilter]);

  const toggleCandidate = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const aiMatch = () => {
    // AI matching algorithm: score candidates based on intelligence_score, urgency, and level
    const scored = candidates.map((c) => {
      let score = c.intelligence_score || 0;

      // Urgency bonus
      if (c.urgency === "urgent") score += 30;
      else if (c.urgency === "high") score += 20;
      else if (c.urgency === "medium") score += 10;

      // Level bonus
      if (c.intelligence_level === "critical") score += 25;
      else if (c.intelligence_level === "high") score += 15;
      else if (c.intelligence_level === "medium") score += 5;

      return { ...c, matchScore: score };
    });

    // Sort by match score and take top candidates (max 50)
    const topCandidates = scored
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Math.min(50, Math.ceil(candidates.length * 0.3)));

    setSelectedIds(new Set(topCandidates.map((c) => c.id)));
    toast.success(`AI matched ${topCandidates.length} top candidates`);
  };

  const saveMatching = async () => {
    if (!campaign?.id) return;

    setSaving(true);
    try {
      const matchedCandidates = Array.from(selectedIds).map((id) => {
        const candidate = candidates.find((c) => c.id === id);
        return {
          candidate_id: id,
          name: candidate?.name,
          status: "pending",
          added_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from("campaigns")
        .update({ matched_candidates: matchedCandidates })
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success(`${selectedIds.size} candidates matched to campaign`);
      onUpdate?.({ ...campaign, matched_candidates: matchedCandidates });
    } catch (error) {
      console.error("Error saving matching:", error);
      toast.error("Failed to save candidate matching");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-medium text-white">Match Candidates</h3>
          <Badge variant="outline" className="border-zinc-700 text-zinc-400">
            {selectedIds.size} selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={aiMatch}
            className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Match
          </Button>
          <Button
            onClick={saveMatching}
            disabled={saving}
            size="sm"
            className="bg-violet-500 hover:bg-violet-600"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidates..."
            className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
          />
        </div>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[160px] bg-zinc-800/50 border-zinc-700 text-white">
            <SelectValue placeholder="Filter by level" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={selectAll}
          className="text-zinc-400 hover:text-white"
        >
          <UserPlus className="w-4 h-4 mr-1" />
          All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={deselectAll}
          className="text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4 mr-1" />
          None
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchCandidates}
          className="text-zinc-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Candidate List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">No candidates found</p>
            <p className="text-xs text-zinc-600 mt-1">
              {searchQuery || levelFilter !== "all"
                ? "Try adjusting your filters"
                : "Add candidates to your talent pool first"}
            </p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              isSelected={selectedIds.has(candidate.id)}
              onToggle={toggleCandidate}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-sm text-zinc-500">
        <span>
          {filteredCandidates.length} candidates available • {selectedIds.size} selected
        </span>
        <span>
          {candidates.filter((c) => c.intelligence_level === "critical" || c.intelligence_level === "high").length} high priority
        </span>
      </div>
    </div>
  );
}
