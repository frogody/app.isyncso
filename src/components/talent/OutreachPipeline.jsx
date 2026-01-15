import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Send,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Play,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Users,
  Zap,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { IntelligenceGauge, IntelligenceLevelBadge } from "./IntelligenceGauge";

// Pipeline stage configuration
const OUTREACH_STAGES = [
  {
    id: "initial",
    label: "Initial Outreach",
    daysDelay: 0,
    description: "First contact message",
    color: "violet",
    bgColor: "bg-violet-500/20",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-400",
    icon: Mail,
  },
  {
    id: "follow_up_1",
    label: "Follow-up 1",
    daysDelay: 3,
    description: "3 days after initial",
    color: "blue",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    icon: MessageSquare,
  },
  {
    id: "follow_up_2",
    label: "Follow-up 2",
    daysDelay: 5,
    description: "5 days after follow-up 1",
    color: "amber",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    icon: Send,
  },
];

// Candidate Card for Pipeline
const PipelineCandidateCard = ({
  candidate,
  match,
  stage,
  isSelected,
  onToggle,
  onGenerateMessage,
  isGenerating,
}) => {
  const initials = candidate?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "??";

  const hasMessage = !!match?.outreach_messages?.[stage.id];
  const stageConfig = OUTREACH_STAGES.find(s => s.id === stage.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-xl border transition-all ${
        isSelected
          ? `${stageConfig?.bgColor} ${stageConfig?.borderColor}`
          : "bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(match.candidate_id)}
          className="mt-1 border-zinc-600"
        />

        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`${createPageUrl("TalentCandidateProfile")}?id=${candidate?.id || match?.candidate_id}`}
              className="font-medium text-white hover:text-violet-400 transition-colors truncate"
            >
              {candidate?.name || match?.candidate_name || "Unknown"}
            </Link>
            {hasMessage && (
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 truncate">
            {candidate?.current_title || "—"} at {candidate?.current_company || "—"}
          </p>

          {/* Match Score & Intelligence */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-zinc-400">
              Match: <span className={`font-medium ${
                match?.match_score >= 70 ? "text-green-400" :
                match?.match_score >= 40 ? "text-yellow-400" : "text-zinc-400"
              }`}>{match?.match_score || 0}%</span>
            </span>
            <span className="text-xs text-zinc-400">
              Flight Risk: <span className={`font-medium ${
                (candidate?.intelligence_score || match?.intelligence_score || 0) >= 70 ? "text-red-400" :
                (candidate?.intelligence_score || match?.intelligence_score || 0) >= 40 ? "text-amber-400" : "text-green-400"
              }`}>{candidate?.intelligence_score || match?.intelligence_score || 0}%</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!hasMessage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onGenerateMessage(match.candidate_id)}
                    disabled={isGenerating}
                    className="text-zinc-400 hover:text-violet-400"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate AI Message</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Message Preview */}
      {hasMessage && (
        <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/30">
          <p className="text-sm text-zinc-300 line-clamp-2">
            {match.outreach_messages[stage.id]?.subject || match.outreach_messages[stage.id]?.content?.substring(0, 100)}...
          </p>
        </div>
      )}
    </motion.div>
  );
};

/**
 * OutreachPipeline - Multi-stage outreach management
 *
 * @param {object} campaign - Campaign object with matched_candidates
 * @param {function} onUpdate - Callback when campaign is updated
 */
export default function OutreachPipeline({ campaign, onUpdate }) {
  const { user } = useUser();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("initial");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [generatingIds, setGeneratingIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch candidates
  useEffect(() => {
    if (user?.organization_id) {
      fetchCandidates();
    }
  }, [user]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("organization_id", user.organization_id)
        .order("name");

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  // Get matched candidates with their messages
  const matchedCandidates = useMemo(() => {
    return campaign?.matched_candidates || [];
  }, [campaign]);

  // Create candidate map for quick lookup
  const candidateMap = useMemo(() => {
    return new Map(candidates.map(c => [c.id, c]));
  }, [candidates]);

  // Group candidates by their outreach stage
  const stageQueues = useMemo(() => {
    const queues = {
      initial: [],
      follow_up_1: [],
      follow_up_2: [],
      completed: [],
    };

    matchedCandidates.forEach(match => {
      const stage = match.outreach_stage || "initial";
      const status = match.status || "matched";

      // Skip if already completed or declined
      if (status === "replied" || status === "scheduled" || status === "declined") {
        queues.completed.push(match);
      } else if (queues[stage]) {
        queues[stage].push(match);
      } else {
        queues.initial.push(match);
      }
    });

    return queues;
  }, [matchedCandidates]);

  // Filter by search
  const filteredQueue = useMemo(() => {
    const queue = stageQueues[activeStage] || [];
    if (!searchQuery) return queue;

    const query = searchQuery.toLowerCase();
    return queue.filter(match => {
      const candidate = candidateMap.get(match.candidate_id);
      return (
        match.candidate_name?.toLowerCase().includes(query) ||
        candidate?.name?.toLowerCase().includes(query) ||
        candidate?.email?.toLowerCase().includes(query) ||
        candidate?.current_company?.toLowerCase().includes(query)
      );
    });
  }, [stageQueues, activeStage, searchQuery, candidateMap]);

  // Toggle selection
  const toggleSelect = (candidateId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredQueue.map(m => m.candidate_id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Generate message for single candidate
  const generateMessage = async (candidateId) => {
    const match = matchedCandidates.find(m => m.candidate_id === candidateId);
    const candidate = candidateMap.get(candidateId);

    if (!match || !candidate) {
      toast.error("Candidate not found");
      return;
    }

    setGeneratingIds(prev => new Set(prev).add(candidateId));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCampaignOutreach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            candidate_id: candidateId,
            candidate_name: candidate.name,
            candidate_title: candidate.current_title,
            candidate_company: candidate.current_company,
            candidate_skills: candidate.skills,
            match_score: match.match_score,
            match_reasons: match.match_reasons,
            stage: activeStage,
            campaign_type: campaign.campaign_type,
            organization_id: user.organization_id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate message");
      }

      const result = await response.json();

      // Update the match with the generated message
      const updatedMatches = matchedCandidates.map(m => {
        if (m.candidate_id === candidateId) {
          return {
            ...m,
            outreach_messages: {
              ...(m.outreach_messages || {}),
              [activeStage]: {
                subject: result.subject,
                content: result.content,
                generated_at: new Date().toISOString(),
              },
            },
          };
        }
        return m;
      });

      // Save to database
      const { error } = await supabase
        .from("campaigns")
        .update({ matched_candidates: updatedMatches })
        .eq("id", campaign.id);

      if (error) throw error;

      onUpdate?.({ ...campaign, matched_candidates: updatedMatches });
      toast.success("Message generated");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error(error.message || "Failed to generate message");
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  // Generate messages for all selected candidates
  const generateAllMessages = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select candidates first");
      return;
    }

    setGenerating(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const candidateId of ids) {
      try {
        await generateMessage(candidateId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setGenerating(false);
    clearSelection();

    if (failCount > 0) {
      toast.warning(`Generated ${successCount} messages, ${failCount} failed`);
    } else {
      toast.success(`Generated ${successCount} messages`);
    }
  };

  // Run outreach - send messages and create tasks
  const runOutreach = async () => {
    const readyCandidates = filteredQueue.filter(match =>
      selectedIds.has(match.candidate_id) &&
      match.outreach_messages?.[activeStage]
    );

    if (readyCandidates.length === 0) {
      toast.error("No candidates with generated messages selected");
      return;
    }

    setSending(true);

    try {
      // Create outreach tasks for each candidate
      const tasks = readyCandidates.map(match => ({
        organization_id: user.organization_id,
        campaign_id: campaign.id,
        candidate_id: match.candidate_id,
        candidate_name: match.candidate_name,
        task_type: campaign.campaign_type === "linkedin" ? "linkedin" : "email",
        subject: match.outreach_messages[activeStage]?.subject,
        content: match.outreach_messages[activeStage]?.content,
        stage: activeStage,
        status: "approved_ready",
        created_at: new Date().toISOString(),
      }));

      const { error: taskError } = await supabase
        .from("outreach_tasks")
        .upsert(tasks, {
          onConflict: "campaign_id,candidate_id,stage",
          ignoreDuplicates: false
        });

      if (taskError) throw taskError;

      // Update candidate statuses
      const updatedMatches = matchedCandidates.map(m => {
        if (selectedIds.has(m.candidate_id)) {
          return {
            ...m,
            status: "pending",
            outreach_stage: activeStage,
          };
        }
        return m;
      });

      const { error: updateError } = await supabase
        .from("campaigns")
        .update({ matched_candidates: updatedMatches })
        .eq("id", campaign.id);

      if (updateError) throw updateError;

      onUpdate?.({ ...campaign, matched_candidates: updatedMatches });
      clearSelection();
      toast.success(`${readyCandidates.length} messages queued for sending`);
    } catch (error) {
      console.error("Error running outreach:", error);
      toast.error("Failed to queue outreach messages");
    } finally {
      setSending(false);
    }
  };

  // Stats for current stage
  const stageStats = useMemo(() => {
    const queue = stageQueues[activeStage] || [];
    const withMessages = queue.filter(m => m.outreach_messages?.[activeStage]).length;
    return {
      total: queue.length,
      withMessages,
      pending: queue.length - withMessages,
    };
  }, [stageQueues, activeStage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Stage Navigation */}
      <div className="flex items-center gap-2 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
        {OUTREACH_STAGES.map((stage, idx) => {
          const count = stageQueues[stage.id]?.length || 0;
          const isActive = activeStage === stage.id;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => setActiveStage(stage.id)}
                className={`flex-1 p-4 rounded-xl border transition-all ${
                  isActive
                    ? `${stage.bgColor} ${stage.borderColor}`
                    : "bg-zinc-900/50 border-zinc-700/30 hover:border-zinc-600/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${stage.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stage.textColor}`} />
                  </div>
                  <Badge
                    variant="outline"
                    className={isActive ? `${stage.borderColor} ${stage.textColor}` : "border-zinc-700 text-zinc-400"}
                  >
                    {count}
                  </Badge>
                </div>
                <h4 className={`font-medium ${isActive ? "text-white" : "text-zinc-400"}`}>
                  {stage.label}
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">{stage.description}</p>
              </button>
              {idx < OUTREACH_STAGES.length - 1 && (
                <ChevronRight className="w-5 h-5 text-zinc-600 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}

        {/* Completed indicator */}
        <div className="flex-shrink-0 p-4 rounded-xl border border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <Badge variant="outline" className="border-green-500/30 text-green-400">
              {stageQueues.completed?.length || 0}
            </Badge>
          </div>
          <p className="text-sm font-medium text-green-400">Completed</p>
        </div>
      </div>

      {/* Stage Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidates..."
              className="pl-10 w-64 bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Users className="w-4 h-4" />
            <span>{stageStats.total} candidates</span>
            <span className="text-zinc-600">|</span>
            <span className="text-green-400">{stageStats.withMessages} ready</span>
            <span className="text-zinc-600">|</span>
            <span className="text-yellow-400">{stageStats.pending} pending</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="border-zinc-700 text-zinc-400"
              >
                Clear ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAllMessages}
                disabled={generating}
                className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Messages
              </Button>
              <Button
                onClick={runOutreach}
                disabled={sending}
                className="bg-violet-500 hover:bg-violet-600"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Outreach
              </Button>
            </>
          )}
          {selectedIds.size === 0 && filteredQueue.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-zinc-700 text-zinc-400"
            >
              Select All
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchCandidates}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Candidate List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {filteredQueue.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No candidates in this stage</p>
              <p className="text-sm text-zinc-600 mt-1">
                {activeStage === "initial"
                  ? "Match candidates to your campaign first"
                  : "Complete the previous stage to advance candidates here"}
              </p>
            </div>
          ) : (
            filteredQueue.map((match) => (
              <PipelineCandidateCard
                key={match.candidate_id}
                match={match}
                candidate={candidateMap.get(match.candidate_id)}
                stage={OUTREACH_STAGES.find(s => s.id === activeStage)}
                isSelected={selectedIds.has(match.candidate_id)}
                onToggle={toggleSelect}
                onGenerateMessage={generateMessage}
                isGenerating={generatingIds.has(match.candidate_id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Info */}
      {matchedCandidates.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-sm text-zinc-500">
          <div className="flex items-center gap-4">
            <span>
              {matchedCandidates.length} total matched candidates
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Messages are AI-generated. Review before sending.</span>
          </div>
        </div>
      )}
    </div>
  );
}
