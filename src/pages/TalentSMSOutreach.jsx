/**
 * TalentSMSOutreach - SMS Outreach Dashboard
 * Manage SMS conversations with candidates
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/components/context/UserContext";
import { supabase } from "@/api/supabaseClient";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  User,
  RefreshCw,
  ChevronRight,
  MessageCircle,
  Ban,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import PhoneNumberManager from "@/components/integrations/PhoneNumberManager";
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';
import { useTheme } from '@/contexts/GlobalThemeContext';

// Status configuration
const STATUS_CONFIG = {
  queued: { label: "Queued", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: Clock },
  sent: { label: "Sent", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: Send },
  delivered: { label: "Delivered", color: "bg-red-600/20 text-red-400 border-red-600/30", icon: CheckCircle },
  responded: { label: "Responded", color: "bg-red-400/20 text-red-300 border-red-400/30", icon: MessageCircle },
  interested: { label: "Interested", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: Sparkles },
  declined: { label: "Declined", color: "bg-red-800/20 text-red-500 border-red-800/30", icon: XCircle },
  scheduled: { label: "Scheduled", color: "bg-red-700/20 text-red-400 border-red-700/30", icon: Calendar },
  opted_out: { label: "Opted Out", color: "bg-zinc-600/20 text-zinc-500 border-zinc-600/30", icon: Ban },
};

// Conversation Card
const ConversationCard = ({ conversation, candidate, onClick, t }) => {
  const status = STATUS_CONFIG[conversation.status] || STATUS_CONFIG.queued;
  const StatusIcon = status.icon;
  const lastMessage = conversation.messages?.[conversation.messages.length - 1];
  const candidateName = candidate
    ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Unknown"
    : "Unknown";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}

      onClick={onClick}
      className={`p-3 rounded-lg ${t("bg-white", "bg-zinc-900/40")} border ${t("border-gray-200", "border-zinc-800/50")} hover:border-red-500/30 cursor-pointer transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {candidateName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`font-medium ${t("text-gray-900", "text-white")} text-sm truncate`}>{candidateName}</h4>
            <Badge variant="outline" className={`text-[10px] ${status.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} truncate mb-1`}>
            {candidate?.job_title} {candidate?.company_name ? `at ${candidate.company_name}` : ""}
          </p>

          {lastMessage && (
            <p className={`text-xs ${t("text-gray-500", "text-zinc-400")} truncate`}>
              {lastMessage.role === "assistant" ? "You: " : ""}{lastMessage.content}
            </p>
          )}

          <div className={`flex items-center gap-3 mt-2 text-[10px] ${t("text-gray-400", "text-zinc-500")}`}>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {conversation.phone_number}
            </span>
            {conversation.last_message_at && (
              <span>{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}</span>
            )}
          </div>
        </div>

        <ChevronRight className={`w-4 h-4 ${t("text-gray-300", "text-zinc-600")} shrink-0`} />
      </div>
    </motion.div>
  );
};

// Conversation Detail Sheet
const ConversationSheet = ({ conversation, candidate, onClose, onRefresh, t }) => {
  const [draftMessage, setDraftMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const { user } = useUser();

  const candidateName = candidate
    ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Unknown"
    : "Unknown";

  const handleSend = async () => {
    if (!draftMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            conversation_id: conversation.id,
            candidate_id: conversation.candidate_id,
            organization_id: user?.organization_id,
            phone_number: conversation.phone_number,
            message: draftMessage,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Message sent!");
        setDraftMessage("");
        onRefresh?.();
      } else {
        toast.error(result.error || "Failed to send");
      }
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAI = async () => {
    const lastCandidateMessage = [...(conversation.messages || [])].reverse().find(m => m.role === "candidate");
    if (!lastCandidateMessage) {
      toast.error("No candidate message to respond to");
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-ai-respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            conversation_id: conversation.id,
            inbound_message: lastCandidateMessage.content,
            candidate_id: conversation.candidate_id,
            organization_id: user?.organization_id,
            auto_send: false,
          }),
        }
      );

      const result = await response.json();
      if (result.success && result.response) {
        setDraftMessage(result.response);
        toast.success("AI response generated!");
      } else {
        toast.error(result.error || "Failed to generate response");
      }
    } catch (err) {
      console.error("AI generation error:", err);
      toast.error("Failed to generate AI response");
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <Sheet open={!!conversation} onOpenChange={() => onClose()}>
      <SheetContent className={`w-full sm:max-w-lg ${t("bg-white", "bg-zinc-900")} ${t("border-gray-200", "border-zinc-800")}`}>
        <SheetHeader>
          <SheetTitle className={`${t("text-gray-900", "text-white")} flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-sm font-bold text-white">
              {candidateName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{candidateName}</p>
              <p className={`text-xs ${t("text-gray-400", "text-zinc-500")} font-normal`}>{conversation?.phone_number}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 max-h-[60vh]">
          {(conversation?.messages || []).map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "assistant" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === "assistant"
                    ? `bg-red-500/20 ${t("text-gray-900", "text-white")} border border-red-500/30`
                    : `${t("bg-gray-100", "bg-zinc-800")} ${t("text-gray-900", "text-white")} border ${t("border-gray-200", "border-zinc-700")}`
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] ${t("text-gray-400", "text-zinc-500")} mt-1`}>
                  {new Date(msg.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}

          {conversation?.opted_out && (
            <div className="text-center py-4">
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                <Ban className="w-3 h-3 mr-1" />
                Candidate opted out
              </Badge>
            </div>
          )}
        </div>

        {/* Compose Area */}
        {!conversation?.opted_out && (
          <div className={`border-t ${t("border-gray-200", "border-zinc-800")} pt-4 space-y-3`}>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
                disabled={generatingAI}
                className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-500", "text-zinc-400")} ${t("hover:text-gray-900", "hover:text-white")}`}
              >
                {generatingAI ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                Generate AI Response
                <CreditCostBadge credits={1} />
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 ${t("bg-white", "bg-zinc-800")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")}`}
                maxLength={320}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={sending || !draftMessage.trim()}
                className="bg-red-500 hover:bg-red-600 gap-1"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <CreditCostBadge credits={1} />
                  </>
                )}
              </Button>
            </div>
            <p className={`text-[10px] ${t("text-gray-400", "text-zinc-500")} text-right`}>{draftMessage.length}/320 characters</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default function TalentSMSOutreach() {
  const { t } = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [candidates, setCandidates] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);

  // Fetch phone numbers first
  const fetchPhoneNumbers = useCallback(async () => {
    if (!user?.organization_id) return;

    try {
      const { data } = await supabase
        .from("organization_phone_numbers")
        .select("*")
        .eq("organization_id", user.organization_id)
        .eq("status", "active");

      setPhoneNumbers(data || []);
    } catch (err) {
      console.error("Failed to fetch phone numbers:", err);
    }
  }, [user?.organization_id]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user?.organization_id) return;

    setLoading(true);
    try {
      // Fetch phone numbers and conversations in parallel
      await fetchPhoneNumbers();

      const { data, error } = await supabase
        .from("sms_conversations")
        .select("*, candidates(id, first_name, last_name, job_title, company_name)")
        .eq("organization_id", user.organization_id)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      setConversations(data || []);

      // Build candidates lookup
      const candidateMap = {};
      (data || []).forEach((conv) => {
        if (conv.candidates) {
          candidateMap[conv.candidate_id] = conv.candidates;
        }
      });
      setCandidates(candidateMap);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [user?.organization_id, fetchPhoneNumbers]);

  useEffect(() => {
    if (user?.organization_id) {
      fetchConversations();
    } else if (user) {
      setLoading(false);
    }
  }, [fetchConversations, user]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((conv) => {
        const candidate = candidates[conv.candidate_id];
        const name = candidate
          ? `${candidate.first_name} ${candidate.last_name}`.toLowerCase()
          : "";
        return (
          name.includes(query) ||
          conv.phone_number.includes(query) ||
          candidate?.company_name?.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [conversations, statusFilter, searchQuery, candidates]);

  // Stats
  const stats = useMemo(() => ({
    total: conversations.length,
    queued: conversations.filter((c) => c.status === "queued").length,
    sent: conversations.filter((c) => c.status === "sent").length,
    delivered: conversations.filter((c) => c.status === "delivered").length,
    responded: conversations.filter((c) => c.status === "responded").length,
    interested: conversations.filter((c) => c.status === "interested").length,
    scheduled: conversations.filter((c) => c.status === "scheduled").length,
    declined: conversations.filter((c) => c.status === "declined").length,
    opted_out: conversations.filter((c) => c.status === "opted_out").length,
  }), [conversations]);

  if (loading) {
    return (
      <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} px-6 py-6 space-y-6`}>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Check if setup is needed
  const needsSetup = phoneNumbers.length === 0;

  return (
    <div className={`min-h-screen ${t("bg-gray-50", "bg-black")} px-6 py-6 space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-lg font-bold ${t("text-gray-900", "text-white")}`}>SMS Outreach</h1>
          <p className={`text-xs ${t("text-gray-400", "text-zinc-500")}`}>{conversations.length} conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPhoneSetup(true)}
            className={`${t("border-gray-200", "border-zinc-700")} ${t("text-gray-500", "text-zinc-400")} ${t("hover:text-gray-900", "hover:text-white")} gap-2`}
          >
            <Phone className="w-4 h-4" />
            {phoneNumbers.length > 0 ? `${phoneNumbers.length} Number${phoneNumbers.length > 1 ? 's' : ''}` : 'Get Number'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchConversations}
            className={`${t("text-gray-500", "text-zinc-400")} ${t("hover:text-gray-900", "hover:text-white")}`}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Phone Setup Banner */}
      {needsSetup && !showPhoneSetup && (
        <GlassCard className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Phone className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className={`font-medium ${t("text-gray-900", "text-white")}`}>Get a Phone Number</h4>
                <p className={`text-xs ${t("text-gray-500", "text-zinc-400")}`}>Purchase a phone number to start sending SMS</p>
              </div>
            </div>
            <Button
              onClick={() => setShowPhoneSetup(true)}
              className="bg-red-500 hover:bg-red-600"
            >
              Get Number
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Phone Number Setup Modal */}
      {showPhoneSetup && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${t("text-gray-900", "text-white")}`}>Phone Numbers</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPhoneSetup(false)}
              className={`${t("text-gray-500", "text-zinc-400")}`}
            >
              Close
            </Button>
          </div>
          <PhoneNumberManager
            onNumberSelected={(num) => {
              toast.success(`Selected ${num.phone_number}`);
              setShowPhoneSetup(false);
              fetchPhoneNumbers();
            }}
          />
        </GlassCard>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-500/20 rounded-lg">
              <MessageSquare className="w-3 h-3 text-zinc-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.total}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Total</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-500/20 rounded-lg">
              <Clock className="w-3 h-3 text-zinc-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.queued}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Queued</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <Send className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.sent}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Sent</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-600/20 rounded-lg">
              <CheckCircle className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.delivered}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Delivered</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-400/20 rounded-lg">
              <MessageCircle className="w-3 h-3 text-red-300" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.responded}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Responded</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <Sparkles className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.interested}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Interested</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-700/20 rounded-lg">
              <Calendar className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.scheduled}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Scheduled</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <XCircle className="w-3 h-3 text-red-400" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.declined}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Declined</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-600/20 rounded-lg">
              <Ban className="w-3 h-3 text-zinc-500" />
            </div>
            <div>
              <p className={`text-base font-bold ${t("text-gray-900", "text-white")}`}>{stats.opted_out}</p>
              <p className={`text-[9px] ${t("text-gray-400", "text-zinc-500")}`}>Opted Out</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${t("bg-white", "bg-zinc-800")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} text-sm`}
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`w-40 ${t("bg-white", "bg-zinc-800")} ${t("border-gray-200", "border-zinc-700")} ${t("text-gray-900", "text-white")} text-sm`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className={`${t("bg-white", "bg-zinc-800")} ${t("border-gray-200", "border-zinc-700")}`}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="opted_out">Opted Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <MessageSquare className={`w-12 h-12 ${t("text-gray-300", "text-zinc-600")} mx-auto mb-4`} />
          <h3 className={`text-lg font-medium ${t("text-gray-900", "text-white")} mb-2`}>No conversations yet</h3>
          <p className={`${t("text-gray-400", "text-zinc-500")} text-sm`}>
            Start SMS outreach from a campaign to see conversations here.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              candidate={candidates[conv.candidate_id]}
              onClick={() => setSelectedConversation(conv)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Conversation Detail Sheet */}
      <ConversationSheet
        conversation={selectedConversation}
        candidate={selectedConversation ? candidates[selectedConversation.candidate_id] : null}
        onClose={() => setSelectedConversation(null)}
        t={t}
        onRefresh={() => {
          fetchConversations();
          if (selectedConversation) {
            // Refresh the selected conversation data
            supabase
              .from("sms_conversations")
              .select("*")
              .eq("id", selectedConversation.id)
              .single()
              .then(({ data }) => {
                if (data) setSelectedConversation(data);
              });
          }
        }}
      />
    </div>
  );
}
