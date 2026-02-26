import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import CandidateMatchResultCard from "./CandidateMatchResultCard";
import { createPageUrl } from "@/utils";
import {
  Users,
  Sparkles,
  Save,
  Mail,
  Loader2,
  Plus,
  Brain,
  Clock,
  Package,
  ExternalLink,
} from "lucide-react";
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

export default function CandidatesTab({
  campaign,
  matchedCandidates = [],
  selectedCandidates,
  onToggleCandidateSelect,
  onSelectAllExcellent,
  onSaveSelection,
  onGenerateOutreach,
  onRunMatching,
  onCandidateClick,
  isMatching,
  savingSelection,
  generatingOutreach,
  linkedNest,
  nestCandidates = [],
  formData,
}) {
  const [matchFilter, setMatchFilter] = useState("All");
  const [showAllCandidates, setShowAllCandidates] = useState(false);

  const sortedCandidates = useMemo(() => {
    return [...matchedCandidates]
      .map(m => ({
        ...m,
        match_level: m.match_level || (
          m.match_score >= 80 ? "Excellent" :
          m.match_score >= 60 ? "Good" :
          m.match_score >= 40 ? "Fair" : "Poor"
        ),
      }))
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [matchedCandidates]);

  const filteredMatches = useMemo(() => {
    if (matchFilter === "All") return sortedCandidates;
    return sortedCandidates.filter(m => m.match_level === matchFilter);
  }, [sortedCandidates, matchFilter]);

  const levelCounts = useMemo(() => ({
    All: sortedCandidates.length,
    Excellent: sortedCandidates.filter(m => m.match_level === "Excellent").length,
    Good: sortedCandidates.filter(m => m.match_level === "Good").length,
    Fair: sortedCandidates.filter(m => m.match_level === "Fair").length,
    Poor: sortedCandidates.filter(m => m.match_level === "Poor").length,
  }), [sortedCandidates]);

  const avgScore = sortedCandidates.length > 0
    ? Math.round(sortedCandidates.reduce((sum, m) => sum + (m.match_score || 0), 0) / sortedCandidates.length)
    : 0;

  const displayedCandidates = showAllCandidates ? filteredMatches : filteredMatches.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Linked Nest Banner */}
      {linkedNest && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <Package className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-400 uppercase tracking-wider font-medium">Sourcing from Nest</p>
                <p className="text-lg font-semibold text-white">{linkedNest.name}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-zinc-400">{nestCandidates.length} candidates</span>
                  {(() => {
                    const intelReady = nestCandidates.filter(c =>
                      c.intelligence_generated || c.intelligence_score > 0 || c.best_outreach_angle
                    ).length;
                    const processing = nestCandidates.filter(c => c.intelligence_status === 'processing').length;
                    const pending = nestCandidates.length - intelReady - processing;
                    return (
                      <>
                        {intelReady > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <Brain className="w-3 h-3" /> {intelReady} ready
                          </span>
                        )}
                        {processing > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-300">
                            <Loader2 className="w-3 h-3 animate-spin" /> {processing} processing
                          </span>
                        )}
                        {pending > 0 && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" /> {pending} pending
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`${createPageUrl("TalentNestDetail")}?id=${linkedNest.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Nest
              </Link>
              <Button
                onClick={onRunMatching}
                disabled={isMatching || nestCandidates.length === 0}
                className="bg-red-500 hover:bg-red-600"
              >
                {isMatching ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Matching...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Run AI Matching <CreditCostBadge credits={2} /></>
                )}
              </Button>
            </div>
          </div>
          {nestCandidates.length > 0 && matchedCandidates.length === 0 && (
            <div className="mt-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
              <p className="text-sm text-zinc-400">
                <Sparkles className="w-4 h-4 inline mr-2 text-red-400" />
                Click "Run AI Matching" to analyze {nestCandidates.length} candidates against your role context.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-red-400" />
            Candidates
          </h3>
          {matchedCandidates.length > 0 && (
            <p className="text-sm text-zinc-400 mt-1">
              {matchedCandidates.length} candidates analyzed • Avg Score: {avgScore}
              {selectedCandidates?.size > 0 && (
                <span className="text-red-400 ml-2">• {selectedCandidates.size} selected</span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {levelCounts.Excellent > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSelectAllExcellent}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Excellent ({levelCounts.Excellent})
            </Button>
          )}

          {selectedCandidates?.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSaveSelection}
              disabled={savingSelection}
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              {savingSelection ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save ({selectedCandidates.size})
            </Button>
          )}

          {selectedCandidates?.size > 0 && (
            <Button
              size="sm"
              onClick={onGenerateOutreach}
              disabled={generatingOutreach}
              className="bg-red-500 hover:bg-red-600"
            >
              {generatingOutreach ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Generate Outreach <CreditCostBadge credits={1} /></>
              )}
            </Button>
          )}

          {!linkedNest && (formData?.project_id || formData?.role_id || campaign?.role_context) && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRunMatching}
              disabled={isMatching}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {isMatching ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Matching...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Run Matching <CreditCostBadge credits={2} /></>
              )}
            </Button>
          )}
        </div>
      </div>

      {matchedCandidates.length > 0 ? (
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {["All", "Excellent", "Good", "Fair"].map((level) => {
              const count = levelCounts[level] || 0;
              const isActive = matchFilter === level;
              const levelStyles = {
                All: isActive ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white",
                Excellent: isActive ? "bg-red-500/30 text-red-300" : "text-zinc-400 hover:text-red-400",
                Good: isActive ? "bg-red-500/20 text-red-400" : "text-zinc-400 hover:text-red-400",
                Fair: isActive ? "bg-red-500/10 text-red-400/70" : "text-zinc-400 hover:text-red-400",
              };

              return (
                <button
                  key={level}
                  onClick={() => setMatchFilter(level)}
                  disabled={count === 0 && level !== "All"}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${levelStyles[level]} ${
                    count === 0 && level !== "All" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {level} ({count})
                </button>
              );
            })}
          </div>

          {/* Match Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {displayedCandidates.map((match, idx) => (
              <CandidateMatchResultCard
                key={match.candidate_id || idx}
                match={match}
                isSelected={selectedCandidates?.has(match.candidate_id)}
                onToggleSelect={onToggleCandidateSelect}
                onClick={() => onCandidateClick?.(match)}
              />
            ))}
          </div>

          {/* Show More/Less */}
          {filteredMatches.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllCandidates(!showAllCandidates)}
              className="w-full text-zinc-400 hover:text-white"
            >
              {showAllCandidates
                ? "Show less"
                : `Show all ${filteredMatches.length} ${matchFilter !== "All" ? matchFilter.toLowerCase() : ""} matches`}
            </Button>
          )}
        </div>
      ) : (
        <GlassCard className="p-8 text-center">
          <Brain className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 mb-2">No matched candidates yet</p>
          {linkedNest ? (
            <p className="text-xs text-zinc-600">
              Click "Run AI Matching" above to analyze {nestCandidates.length} candidates from your nest
            </p>
          ) : formData?.project_id || formData?.role_id || campaign?.role_context ? (
            <p className="text-xs text-zinc-600">
              Click "Run Matching" to analyze candidates with AI-powered scoring
            </p>
          ) : (
            <p className="text-xs text-zinc-600">
              Link this campaign to a project or role in Settings to enable matching
            </p>
          )}
        </GlassCard>
      )}
    </div>
  );
}
