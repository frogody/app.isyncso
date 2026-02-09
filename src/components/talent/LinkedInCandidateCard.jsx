import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Copy,
  Check,
  Linkedin,
  Send,
  Edit2,
  RefreshCw,
  Loader2,
  Sparkles,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  UserCheck,
  X,
  Save,
} from "lucide-react";

const LinkedInCandidateCard = ({
  candidate,
  task,
  stageConfig,
  onGenerate,
  onCopy,
  onOpenLinkedIn,
  onMarkSent,
  onMarkReplied,
  onMarkAccepted,
  onUpdateTask,
  isGenerating,
  isFocused,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [justCopied, setJustCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);

  const firstName = candidate?.first_name || "";
  const lastName = candidate?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Unknown";
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "??";
  const jobTitle = candidate?.job_title || "";
  const companyName = candidate?.company_name || "";
  const linkedinUrl = candidate?.linkedin_url;
  const matchScore = candidate?.match_score || 0;
  const approach = candidate?.recommended_approach;
  const messageContent = task?.content || task?.message_content || "";
  const metadata = task?.metadata || {};

  // Character limit based on message type
  const charLimit = stageConfig?.messageType === "linkedin_connection" ? 300 : 8000;
  const charCount = messageContent.length;
  const charPct = charLimit > 0 ? charCount / charLimit : 0;
  const charColor =
    charPct > 0.95 ? "text-red-400" : charPct > 0.8 ? "text-yellow-400" : "text-green-400";

  // Determine card state
  const cardState = isGenerating
    ? "generating"
    : !task
      ? "no_task"
      : task.status === "replied"
        ? "replied"
        : task.status === "sent"
          ? "sent"
          : "approved_ready";

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isFocused]);

  const handleCopy = async () => {
    if (!messageContent) return;
    try {
      await navigator.clipboard.writeText(messageContent);
      setJustCopied(true);
      toast.success("Message copied! Open LinkedIn to paste");
      onCopy?.(task);
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleOpenLinkedIn = () => {
    if (!linkedinUrl) {
      toast.error("No LinkedIn URL — search manually");
      return;
    }
    const url = linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`;
    window.open(url, "_blank");
    onOpenLinkedIn?.(candidate);
  };

  const handleStartEdit = () => {
    setEditContent(messageContent);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("outreach_tasks")
        .update({ content: editContent, message_content: editContent })
        .eq("id", task.id);

      if (error) throw error;
      onUpdateTask?.({ ...task, content: editContent, message_content: editContent });
      setIsEditing(false);
      toast.success("Message updated");
    } catch (err) {
      console.error("Failed to save edit:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (!window.confirm("Regenerate message? Current message will be lost.")) return;
    onGenerate?.(candidate?.id || candidate?.candidate_id);
  };

  // Edit mode character count
  const editCharCount = editContent.length;
  const editCharPct = charLimit > 0 ? editCharCount / charLimit : 0;
  const editCharColor =
    editCharPct > 0.95
      ? "text-red-400"
      : editCharPct > 0.8
        ? "text-yellow-400"
        : "text-green-400";

  const borderClass =
    isFocused
      ? "border-red-500/50 ring-1 ring-red-500/20"
      : cardState === "replied"
        ? "border-green-500/30"
        : cardState === "sent"
          ? "border-zinc-700/30 opacity-60"
          : "border-zinc-700/30 hover:border-zinc-600/50";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <GlassCard className={`p-4 transition-all ${borderClass}`}>
        {/* Header: Avatar + Info + Badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white truncate">{fullName}</p>
              <p className="text-sm text-zinc-400 truncate">
                {jobTitle}
                {companyName && ` at ${companyName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {matchScore > 0 && (
              <Badge
                className={`${
                  matchScore >= 70
                    ? "bg-green-500/20 text-green-400"
                    : matchScore >= 40
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-zinc-500/20 text-zinc-400"
                }`}
              >
                {matchScore}%
              </Badge>
            )}
            {approach && (
              <Badge className="bg-red-500/20 text-red-400 text-xs capitalize">{approach}</Badge>
            )}
            {cardState === "sent" && (
              <Badge className="bg-red-500/20 text-red-400">
                <Send className="w-3 h-3 mr-1" />
                Sent
              </Badge>
            )}
            {cardState === "replied" && (
              <Badge className="bg-green-500/20 text-green-400">
                <MessageSquare className="w-3 h-3 mr-1" />
                Replied
              </Badge>
            )}
          </div>
        </div>

        {/* No Task State */}
        {cardState === "no_task" && (
          <div className="mt-3 flex items-center justify-center p-6 rounded-lg bg-zinc-800/30 border border-dashed border-zinc-700/50">
            <Button
              onClick={() => onGenerate?.(candidate?.id || candidate?.candidate_id)}
              className="bg-red-500 hover:bg-red-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Message
            </Button>
          </div>
        )}

        {/* Generating State */}
        {cardState === "generating" && (
          <div className="mt-3 flex items-center justify-center p-6 rounded-lg bg-zinc-800/30">
            <Loader2 className="w-5 h-5 text-red-400 animate-spin mr-2" />
            <span className="text-sm text-zinc-400">Generating personalized message...</span>
          </div>
        )}

        {/* Message Content (approved_ready, sent, replied) */}
        {(cardState === "approved_ready" || cardState === "sent" || cardState === "replied") && (
          <>
            {/* Message Preview / Edit */}
            <div className="mt-3">
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-200 min-h-[120px] resize-y"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${editCharColor}`}>
                      {editCharCount}/{charLimit} chars
                      {editCharCount > charLimit && " — over limit!"}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        {saving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-zinc-800/50 relative group">
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{messageContent}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs font-mono ${charColor}`}>
                      {charCount}/{charLimit}
                    </span>
                    {metadata?.personalization_score > 0 && (
                      <span className="text-xs text-zinc-500">
                        Personalization: {metadata.personalization_score}/100
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Points Used */}
            {metadata?.data_points_used?.length > 0 && !isEditing && (
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                <span className="text-xs text-zinc-500">Data points:</span>
                {metadata.data_points_used.map((dp) => (
                  <Badge key={dp} className="bg-zinc-800/50 text-zinc-400 text-[10px] px-1.5 py-0">
                    {dp.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {!isEditing && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {cardState === "approved_ready" && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className={
                        justCopied
                          ? "bg-green-500 hover:bg-green-600 transition-colors"
                          : "bg-red-500 hover:bg-red-600"
                      }
                    >
                      {justCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenLinkedIn}
                      className="border-zinc-700 text-zinc-300 hover:text-white hover:border-blue-500/50"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      LinkedIn
                      {!linkedinUrl && (
                        <AlertCircle className="w-3 h-3 ml-1 text-yellow-400" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkSent?.(task?.id)}
                      className="border-zinc-700 text-zinc-300 hover:text-white"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Sent
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartEdit}
                      className="text-zinc-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRegenerate}
                      className="text-zinc-400 hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {cardState === "sent" && stageConfig?.key === "connection_request" && (
                  <Button
                    size="sm"
                    onClick={() => onMarkAccepted?.(task?.id)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Mark Accepted
                  </Button>
                )}

                {cardState === "sent" && stageConfig?.key !== "connection_request" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkReplied?.(task?.id)}
                    className="border-zinc-700 text-zinc-300 hover:text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Mark Replied
                  </Button>
                )}

                {cardState === "replied" && (
                  <Badge className="bg-green-500/15 text-green-400 text-xs">
                    Candidate replied
                  </Badge>
                )}
              </div>
            )}

            {/* Timestamps */}
            {task?.sent_at && !isEditing && (
              <p className="mt-2 text-xs text-zinc-500">
                Sent {new Date(task.sent_at).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default LinkedInCandidateCard;
