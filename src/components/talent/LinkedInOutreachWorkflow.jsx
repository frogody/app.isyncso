import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { useOutreachPreferences } from "@/hooks/useOutreachPreferences";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/GlassCard";
import LinkedInCandidateCard from "./LinkedInCandidateCard";
import {
  UserPlus,
  MessageSquare,
  Reply,
  ReplyAll,
  Sparkles,
  Loader2,
  Search,
  Send,
  CheckCircle2,
  Users,
  Keyboard,
  RefreshCw,
} from "lucide-react";

// Stage configuration
const STAGE_CONFIG = [
  {
    key: "connection_request",
    label: "Connection Request",
    dbStage: "initial",
    messageType: "linkedin_connection",
    icon: UserPlus,
    description: "Send connection requests with personalized notes",
  },
  {
    key: "first_message",
    label: "First Message",
    dbStage: "first_message",
    messageType: "linkedin_message",
    icon: MessageSquare,
    description: "Message candidates who accepted your connection",
  },
  {
    key: "follow_up_1",
    label: "Follow-up 1",
    dbStage: "follow_up_1",
    messageType: "linkedin_message",
    icon: Reply,
    description: "Follow up with candidates who haven't replied",
  },
  {
    key: "follow_up_2",
    label: "Follow-up 2",
    dbStage: "follow_up_2",
    messageType: "linkedin_message",
    icon: ReplyAll,
    description: "Final follow-up — brief and respectful",
  },
];

const LinkedInOutreachWorkflow = ({ campaign, organizationId }) => {
  const { user } = useUser();
  const { preferences } = useOutreachPreferences(organizationId, campaign?.id);

  // Core state
  const [activeStage, setActiveStage] = useState("connection_request");
  const [candidates, setCandidates] = useState([]);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingIds, setGeneratingIds] = useState(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const listRef = useRef(null);

  const currentStageConfig = STAGE_CONFIG.find((s) => s.key === activeStage);

  // Fetch candidates + tasks
  // Primary: candidate_campaign_matches with corrected candidates join (valid columns only)
  // Fallback: campaign.matched_candidates JSONB if candidate_campaign_matches is empty
  // Intelligence fields (outreach_hooks, best_outreach_angle, etc.) come from match_details
  // or from campaign.matched_candidates entries when available
  const fetchData = useCallback(async () => {
    if (!campaign?.id || !organizationId) return;
    setLoading(true);

    try {
      // 1. Primary: fetch from candidate_campaign_matches with valid candidate columns only
      const { data: matches, error: matchError } = await supabase
        .from("candidate_campaign_matches")
        .select(
          `
          id, candidate_id, match_score, match_reasons, match_details,
          intelligence_score, recommended_approach,
          candidates:candidate_id (
            id, first_name, last_name, job_title, company_name,
            linkedin_url, skills, intelligence_score, intelligence_level,
            recommended_approach, intelligence_factors, intelligence_timing,
            outreach_status, outreach_stage, last_outreach_at
          )
        `
        )
        .eq("campaign_id", campaign.id)
        .not("candidates", "is", null);

      if (matchError) throw matchError;

      // 2. Fetch outreach tasks for this campaign + current stage
      const { data: tasks, error: taskError } = await supabase
        .from("outreach_tasks")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("stage", currentStageConfig?.dbStage);

      if (taskError) throw taskError;

      const taskMap = new Map();
      (tasks || []).forEach((t) => taskMap.set(t.candidate_id, t));

      // Build a lookup from campaign.matched_candidates JSONB for intelligence data fallback
      const matchedCandidatesMap = new Map();
      (campaign.matched_candidates || []).forEach((m) => {
        if (m.candidate_id) matchedCandidatesMap.set(m.candidate_id, m);
      });

      let merged = [];

      if (matches && matches.length > 0) {
        // 3a. Primary path: merge candidate_campaign_matches + candidates join + tasks
        merged = matches
          .filter((m) => m.candidates)
          .map((m) => {
            const c = m.candidates;
            // Intelligence data: check match_details first, then campaign.matched_candidates fallback
            const details = m.match_details || {};
            const fallback = matchedCandidatesMap.get(m.candidate_id) || {};

            return {
              // Candidate profile from candidates table join
              id: c.id,
              first_name: c.first_name,
              last_name: c.last_name,
              job_title: c.job_title,
              company_name: c.company_name,
              linkedin_url: c.linkedin_url,
              skills: c.skills,
              intelligence_factors: c.intelligence_factors,
              intelligence_level: c.intelligence_level,
              outreach_status: c.outreach_status,
              outreach_stage: c.outreach_stage,

              // Intelligence data (match_details → campaign.matched_candidates fallback → empty)
              intelligence_score: m.intelligence_score || c.intelligence_score,
              recommended_approach: m.recommended_approach || c.recommended_approach,
              outreach_hooks: details.outreach_hooks || fallback.outreach_hooks || [],
              best_outreach_angle: details.best_outreach_angle || fallback.best_outreach_angle || "",
              timing_signals: details.timing_signals || fallback.timing_signals || c.intelligence_timing || [],
              company_pain_points: details.company_pain_points || fallback.company_pain_points || [],
              key_insights: details.key_insights || fallback.key_insights || [],
              lateral_opportunities: details.lateral_opportunities || fallback.lateral_opportunities || [],

              // Match data from candidate_campaign_matches
              match_score: m.match_score || 0,
              match_reasons: m.match_reasons || [],
              match_details: m.match_details,
              candidate_id: m.candidate_id,

              // Outreach messages from campaign.matched_candidates fallback
              outreach_messages: fallback.outreach_messages || {},

              // The linked outreach task (if any)
              _task: taskMap.get(m.candidate_id) || null,
              _matchEntry: fallback,
            };
          });
      } else if (campaign.matched_candidates?.length > 0) {
        // 3b. Fallback: use campaign.matched_candidates JSONB when candidate_campaign_matches is empty
        const candidateIds = campaign.matched_candidates.map((m) => m.candidate_id).filter(Boolean);
        const { data: candidateDetails } = await supabase
          .from("candidates")
          .select("id, first_name, last_name, job_title, company_name, linkedin_url, skills, intelligence_score, intelligence_level, recommended_approach, intelligence_factors, intelligence_timing")
          .in("id", candidateIds);

        const detailMap = new Map();
        (candidateDetails || []).forEach((c) => detailMap.set(c.id, c));

        merged = campaign.matched_candidates
          .filter((m) => m.candidate_id && detailMap.has(m.candidate_id))
          .map((m) => {
            const detail = detailMap.get(m.candidate_id);
            return {
              id: detail.id,
              first_name: detail.first_name,
              last_name: detail.last_name,
              job_title: detail.job_title,
              company_name: detail.company_name,
              linkedin_url: detail.linkedin_url,
              skills: detail.skills,
              intelligence_factors: detail.intelligence_factors,
              intelligence_level: detail.intelligence_level,

              intelligence_score: m.intelligence_score || detail.intelligence_score,
              recommended_approach: m.recommended_approach || detail.recommended_approach,
              outreach_hooks: m.outreach_hooks || [],
              best_outreach_angle: m.best_outreach_angle || "",
              timing_signals: m.timing_signals || detail.intelligence_timing || [],
              company_pain_points: m.company_pain_points || [],
              key_insights: m.key_insights || [],
              lateral_opportunities: m.lateral_opportunities || [],

              match_score: m.match_score || 0,
              match_reasons: m.match_reasons || [],
              match_details: m.match_details,
              candidate_id: m.candidate_id,
              outreach_messages: m.outreach_messages || {},

              _task: taskMap.get(m.candidate_id) || null,
              _matchEntry: m,
            };
          });
      }

      setCandidates(merged);
      setOutreachTasks(tasks || []);
    } catch (err) {
      console.error("Failed to fetch workflow data:", err);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [campaign?.id, campaign?.matched_candidates, organizationId, currentStageConfig?.dbStage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset focused index on stage change
  useEffect(() => {
    setFocusedIndex(0);
  }, [activeStage]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter((c) => {
      const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
      const title = (c.job_title || "").toLowerCase();
      const company = (c.company_name || "").toLowerCase();
      return name.includes(q) || title.includes(q) || company.includes(q);
    });
  }, [candidates, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = candidates.length;
    const withTask = candidates.filter((c) => c._task).length;
    const ready = candidates.filter((c) => c._task?.status === "approved_ready").length;
    const sent = candidates.filter((c) => c._task?.status === "sent").length;
    const replied = candidates.filter((c) => c._task?.status === "replied").length;
    const noTask = total - withTask;
    return { total, ready, sent, replied, noTask };
  }, [candidates]);

  // Stage counts (for badges)
  const stageCounts = useMemo(() => {
    const counts = {};
    STAGE_CONFIG.forEach((s) => {
      counts[s.key] = candidates.filter((c) => {
        // For non-active stages, we can't know the exact count without querying
        // Show total for active stage only
        if (s.key === activeStage) return true;
        return true;
      }).length;
    });
    return counts;
  }, [candidates, activeStage]);

  // Generate message for single candidate
  const generateMessage = async (candidateId) => {
    const candidate = candidates.find(
      (c) => c.id === candidateId || c.candidate_id === candidateId
    );
    if (!candidate) {
      toast.error("Candidate not found");
      return;
    }

    setGeneratingIds((prev) => new Set(prev).add(candidateId));

    try {
      const stageConf = currentStageConfig;
      const messageType = stageConf.messageType;
      const typeConfig = preferences?.message_types?.[messageType] || {};

      const fullName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();

      // Intelligence data comes from matched_candidates JSONB entry (_matchEntry)
      // Profile data comes from candidates table
      const matchEntry = candidate._matchEntry || {};

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
            organization_id: organizationId,

            // Basic candidate info (from candidates table)
            candidate_name: fullName,
            candidate_title: candidate.job_title,
            candidate_company: candidate.company_name,
            candidate_skills: candidate.skills,

            // Match data (from matched_candidates JSONB)
            match_score: matchEntry.match_score || candidate.match_score,
            match_reasons: matchEntry.match_reasons || candidate.match_reasons,
            match_details: matchEntry.match_details,

            // Intelligence data (from matched_candidates JSONB — the gold mine)
            intelligence_score: matchEntry.intelligence_score || candidate.intelligence_score,
            recommended_approach: matchEntry.recommended_approach || candidate.recommended_approach,
            outreach_hooks: matchEntry.outreach_hooks || candidate.outreach_hooks,
            best_outreach_angle: matchEntry.best_outreach_angle || candidate.best_outreach_angle,
            timing_signals: matchEntry.timing_signals || candidate.timing_signals,
            company_pain_points: matchEntry.company_pain_points || candidate.company_pain_points,
            key_insights: matchEntry.key_insights || candidate.key_insights,
            lateral_opportunities: matchEntry.lateral_opportunities || candidate.lateral_opportunities,
            intelligence_factors: matchEntry.intelligence_factors || candidate.intelligence_factors,

            // Role context
            role_context: campaign.role_context,
            role_title: campaign.role_title || campaign.name,
            company_name: campaign.company_name,

            // Stage & type
            stage: stageConf.key === "connection_request" ? "initial" : stageConf.key,
            campaign_type: "linkedin",

            // Phase 2 preferences
            message_type: messageType,
            char_limit: typeConfig.char_limit,
            data_point_priorities: preferences?.data_point_priorities,
            custom_instructions: preferences?.custom_instructions,
            tone: typeConfig.default_tone || preferences?.default_tone,
            language: preferences?.default_language,
            formality: preferences?.formality,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate message");
      }

      const result = await response.json();

      // Upsert outreach task
      const taskData = {
        organization_id: organizationId,
        campaign_id: campaign.id,
        candidate_id: candidateId,
        task_type: messageType === "linkedin_connection" ? "linkedin_connection" : "linkedin",
        stage: stageConf.dbStage,
        message_content: result.content,
        subject: result.subject,
        content: result.content,
        candidate_name: fullName,
        status: "approved_ready",
        metadata: {
          message_type: result.message_type,
          char_count: result.char_count,
          char_limit: result.char_limit,
          data_points_used: result.data_points_used,
          personalization_score: result.personalization_score,
          intelligence_used: result.intelligence_used,
          language: result.language,
          generated_at: result.generated_at,
          match_score: candidate.match_score,
        },
      };

      const { data: upsertedTask, error: upsertError } = await supabase
        .from("outreach_tasks")
        .upsert(taskData, { onConflict: "campaign_id,candidate_id,stage" })
        .select()
        .single();

      if (upsertError) throw upsertError;

      // Update local state
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id === candidateId || c.candidate_id === candidateId) {
            return { ...c, _task: upsertedTask };
          }
          return c;
        })
      );

      toast.success("Message generated");
    } catch (err) {
      console.error("Error generating message:", err);
      toast.error(err.message || "Failed to generate message");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  // Generate all messages for candidates without tasks
  const generateAllMessages = async () => {
    const withoutTasks = filteredCandidates.filter((c) => !c._task);
    if (withoutTasks.length === 0) {
      toast.info("All candidates already have messages for this stage");
      return;
    }

    setGeneratingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < withoutTasks.length; i++) {
      const candidate = withoutTasks[i];
      const candidateId = candidate.id || candidate.candidate_id;
      try {
        await generateMessage(candidateId);
        successCount++;
      } catch {
        failCount++;
      }
      // Brief pause between generations to avoid rate limits
      if (i < withoutTasks.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setGeneratingAll(false);
    if (failCount === 0) {
      toast.success(`Generated ${successCount} messages`);
    } else {
      toast.warning(`Generated ${successCount}, failed ${failCount}`);
    }
  };

  // Mark task as sent
  const markAsSent = async (taskId) => {
    try {
      const { error } = await supabase
        .from("outreach_tasks")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setCandidates((prev) =>
        prev.map((c) => {
          if (c._task?.id === taskId) {
            return { ...c, _task: { ...c._task, status: "sent", sent_at: new Date().toISOString() } };
          }
          return c;
        })
      );

      // Auto-advance to next card
      setFocusedIndex((prev) => Math.min(prev + 1, filteredCandidates.length - 1));
      toast.success("Marked as sent! Next candidate ready.");
    } catch (err) {
      console.error("Failed to mark as sent:", err);
      toast.error("Failed to update task");
    }
  };

  // Mark task as replied
  const markAsReplied = async (taskId) => {
    try {
      const { error } = await supabase
        .from("outreach_tasks")
        .update({ status: "replied" })
        .eq("id", taskId);

      if (error) throw error;

      setCandidates((prev) =>
        prev.map((c) => {
          if (c._task?.id === taskId) {
            return { ...c, _task: { ...c._task, status: "replied" } };
          }
          return c;
        })
      );

      toast.success("Marked as replied");
    } catch (err) {
      console.error("Failed to mark as replied:", err);
      toast.error("Failed to update task");
    }
  };

  // Mark connection as accepted — create next-stage task
  const markAsAccepted = async (taskId) => {
    try {
      // Update current task
      const { error } = await supabase
        .from("outreach_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setCandidates((prev) =>
        prev.map((c) => {
          if (c._task?.id === taskId) {
            return {
              ...c,
              _task: { ...c._task, status: "completed", completed_at: new Date().toISOString() },
            };
          }
          return c;
        })
      );

      toast.success("Connection accepted! Switch to First Message to follow up.");
    } catch (err) {
      console.error("Failed to mark as accepted:", err);
      toast.error("Failed to update task");
    }
  };

  // Update task locally (after edit)
  const handleUpdateTask = (updatedTask) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c._task?.id === updatedTask.id) {
          return { ...c, _task: updatedTask };
        }
        return c;
      })
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const focused = filteredCandidates[focusedIndex];
      if (!focused && !["ArrowDown", "ArrowUp"].includes(e.key)) return;

      switch (e.key) {
        case "c":
          if (focused?._task?.status === "approved_ready") {
            e.preventDefault();
            const content = focused._task.content || focused._task.message_content;
            if (content) {
              navigator.clipboard.writeText(content);
              toast.success("Message copied!");
            }
          }
          break;
        case "l":
          if (focused?.linkedin_url) {
            e.preventDefault();
            const url = focused.linkedin_url.startsWith("http")
              ? focused.linkedin_url
              : `https://${focused.linkedin_url}`;
            window.open(url, "_blank");
          }
          break;
        case "s":
          if (focused?._task?.status === "approved_ready") {
            e.preventDefault();
            markAsSent(focused._task.id);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, filteredCandidates.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedIndex, filteredCandidates]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <GlassCard key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-700 rounded w-1/3" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage Selector */}
      <div className="flex gap-2 flex-wrap">
        {STAGE_CONFIG.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.key;
          return (
            <Button
              key={stage.key}
              size="sm"
              variant={isActive ? "default" : "ghost"}
              onClick={() => setActiveStage(stage.key)}
              className={
                isActive
                  ? "bg-red-500 hover:bg-red-600"
                  : "text-zinc-400 hover:text-white"
              }
            >
              <Icon className="w-4 h-4 mr-1" />
              {stage.label}
              <Badge className="ml-2 bg-zinc-700/50 text-zinc-300 text-xs">
                {candidates.length}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Stage Description */}
      {currentStageConfig && (
        <p className="text-sm text-zinc-500">{currentStageConfig.description}</p>
      )}

      {/* Stats Bar */}
      <GlassCard className="p-3">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-white">{stats.total}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-300">
              {stats.ready + stats.noTask}
            </p>
            <p className="text-xs text-zinc-500">
              {stats.noTask > 0 ? `${stats.noTask} need message` : "Ready"}
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{stats.sent}</p>
            <p className="text-xs text-zinc-500">Sent</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">{stats.replied}</p>
            <p className="text-xs text-zinc-500">Replied</p>
          </div>
        </div>
      </GlassCard>

      {/* Action Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={generateAllMessages}
          disabled={generatingAll || stats.noTask === 0}
          className="bg-red-500 hover:bg-red-600"
        >
          {generatingAll ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate All ({stats.noTask})
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchData}
          className="text-zinc-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800/50 border-zinc-700 text-white w-64"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShortcuts((v) => !v)}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <Keyboard className="w-4 h-4" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      {showShortcuts && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-6 flex-wrap text-xs text-zinc-400">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">c</kbd>{" "}
              Copy
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">l</kbd>{" "}
              LinkedIn
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">s</kbd>{" "}
              Mark Sent
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
          </div>
        </GlassCard>
      )}

      {/* Candidate Cards */}
      <div ref={listRef} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredCandidates.length > 0 ? (
            filteredCandidates.map((candidate, index) => (
              <LinkedInCandidateCard
                key={candidate.id || candidate._matchId}
                candidate={candidate}
                task={candidate._task}
                stageConfig={currentStageConfig}
                onGenerate={generateMessage}
                onCopy={() => {}}
                onOpenLinkedIn={() => {}}
                onMarkSent={markAsSent}
                onMarkReplied={markAsReplied}
                onMarkAccepted={markAsAccepted}
                onUpdateTask={handleUpdateTask}
                isGenerating={generatingIds.has(candidate.id)}
                isFocused={index === focusedIndex}
                preferences={preferences}
              />
            ))
          ) : (
            <GlassCard className="p-8 text-center">
              <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No matched candidates</p>
              <p className="text-sm text-zinc-500 mt-1">
                Run AI matching from the Overview tab to populate this workflow
              </p>
            </GlassCard>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LinkedInOutreachWorkflow;
