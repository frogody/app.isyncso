import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Linkedin,
  Globe,
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  MessageSquare,
  FileText,
  ChevronLeft,
  ExternalLink,
  Edit,
  Trash2,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// Intelligence Gauge Component
const IntelligenceGauge = ({ score, size = "lg" }) => {
  const sizes = {
    sm: { width: 48, height: 48, strokeWidth: 4, fontSize: "text-xs" },
    md: { width: 64, height: 64, strokeWidth: 5, fontSize: "text-sm" },
    lg: { width: 120, height: 120, strokeWidth: 8, fontSize: "text-2xl" },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score) => {
    if (score >= 80) return { stroke: "#ef4444", text: "text-red-400", bg: "bg-red-500/20", label: "Critical" };
    if (score >= 60) return { stroke: "#f97316", text: "text-orange-400", bg: "bg-orange-500/20", label: "High" };
    if (score >= 40) return { stroke: "#eab308", text: "text-yellow-400", bg: "bg-yellow-500/20", label: "Medium" };
    return { stroke: "#22c55e", text: "text-green-400", bg: "bg-green-500/20", label: "Low" };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center">
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
          <motion.circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <span className={`absolute ${fontSize} font-bold ${colors.text}`}>
          {score}
        </span>
      </div>
      <span className={`mt-2 text-sm font-medium ${colors.text}`}>{colors.label} Risk</span>
    </div>
  );
};

// Factor Badge
const FactorBadge = ({ factor, type = "positive" }) => {
  const styles = {
    positive: "bg-red-500/10 text-red-400 border-red-500/20",
    negative: "bg-green-500/10 text-green-400 border-green-500/20",
    neutral: "bg-white/10 text-white/60 border-white/10",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm border ${styles[type]}`}>
      {factor}
    </span>
  );
};

// Timeline Item
const TimelineItem = ({ item, isLast }) => {
  const typeStyles = {
    outreach: { icon: Send, color: "text-violet-400", bg: "bg-violet-500/20" },
    reply: { icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/20" },
    note: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/20" },
    status: { icon: RefreshCw, color: "text-yellow-400", bg: "bg-yellow-500/20" },
  };

  const style = typeStyles[item.type] || typeStyles.note;
  const Icon = style.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${style.color}`} />
        </div>
        {!isLast && <div className="w-px h-full bg-white/10 my-2" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-white">{item.title}</h4>
          <span className="text-sm text-white/40">{item.date}</span>
        </div>
        <p className="text-sm text-white/60">{item.description}</p>
      </div>
    </div>
  );
};

// Outreach Task Card
const OutreachTaskCard = ({ task }) => {
  const statusStyles = {
    pending: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Pending" },
    approved_ready: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Ready" },
    sent: { color: "text-violet-400", bg: "bg-violet-500/20", label: "Sent" },
    completed: { color: "text-green-400", bg: "bg-green-500/20", label: "Completed" },
    cancelled: { color: "text-red-400", bg: "bg-red-500/20", label: "Cancelled" },
  };

  const style = statusStyles[task.status] || statusStyles.pending;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>
            {style.label}
          </span>
          <h4 className="font-medium text-white mt-2">{task.task_type.replace(/_/g, " ")}</h4>
        </div>
        <span className="text-sm text-white/40">{task.stage}</span>
      </div>
      {task.message_content && (
        <p className="text-sm text-white/60 line-clamp-3">{task.message_content}</p>
      )}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-sm text-white/40">
        <span>Attempt #{task.attempt_number}</span>
        {task.sent_at && <span>Sent: {new Date(task.sent_at).toLocaleDateString()}</span>}
      </div>
    </GlassCard>
  );
};

export default function TalentCandidateProfile() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("id");

  const [candidate, setCandidate] = useState(null);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (candidateId) {
      fetchCandidate();
      fetchOutreachTasks();
    }
  }, [candidateId, user]);

  const fetchCandidate = async () => {
    if (!user?.organization_id || !candidateId) return;

    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .eq("organization_id", user.organization_id)
        .single();

      if (error) throw error;
      setCandidate(data);
    } catch (err) {
      console.error("Error fetching candidate:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutreachTasks = async () => {
    if (!user?.organization_id || !candidateId) return;

    try {
      const { data, error } = await supabase
        .from("outreach_tasks")
        .select("*")
        .eq("candidate_id", candidateId)
        .eq("organization_id", user.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOutreachTasks(data || []);
    } catch (err) {
      console.error("Error fetching outreach tasks:", err);
    }
  };

  const refreshIntelligence = async () => {
    // Call the Edge Function to refresh intelligence
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCandidateIntelligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.access_token}`,
          },
          body: JSON.stringify({
            candidate_id: candidateId,
            organization_id: user.organization_id,
          }),
        }
      );

      if (response.ok) {
        fetchCandidate();
      }
    } catch (err) {
      console.error("Error refreshing intelligence:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl lg:col-span-1" />
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-6">
        <GlassCard className="p-12 text-center">
          <User className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Candidate not found</h3>
          <p className="text-white/60 mb-6">The candidate you're looking for doesn't exist or has been removed.</p>
          <Link
            to={createPageUrl("TalentCandidates")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Candidates
          </Link>
        </GlassCard>
      </div>
    );
  }

  const intelligenceFactors = candidate.intelligence_factors || [];
  const intelligenceTiming = candidate.intelligence_timing || [];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "intelligence", label: "Intelligence" },
    { id: "outreach", label: "Outreach" },
    { id: "history", label: "History" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 space-y-6"
    >
      {/* Back Button */}
      <Link
        to={createPageUrl("TalentCandidates")}
        className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Candidates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <GlassCard className="p-6">
            {/* Avatar & Basic Info */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                {candidate.name?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-white">{candidate.name}</h2>
              <p className="text-white/60">{candidate.current_title}</p>
            </div>

            {/* Intelligence Score */}
            <div className="flex justify-center mb-6 pb-6 border-b border-white/10">
              <IntelligenceGauge score={candidate.intelligence_score || 0} />
            </div>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              {candidate.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-white/40" />
                  <a href={`mailto:${candidate.email}`} className="text-white/80 hover:text-violet-400 transition-colors">
                    {candidate.email}
                  </a>
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-white/40" />
                  <span className="text-white/80">{candidate.phone}</span>
                </div>
              )}
              {candidate.current_company && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-white/40" />
                  <span className="text-white/80">{candidate.current_company}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-white/40" />
                  <span className="text-white/80">{candidate.location}</span>
                </div>
              )}
              {candidate.linkedin_url && (
                <div className="flex items-center gap-3 text-sm">
                  <Linkedin className="w-4 h-4 text-white/40" />
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-violet-400 transition-colors flex items-center gap-1"
                  >
                    LinkedIn Profile
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{candidate.years_experience || 0}</p>
                <p className="text-xs text-white/60">Years Exp.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{outreachTasks.length}</p>
                <p className="text-xs text-white/60">Outreach</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={refreshIntelligence}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Intelligence
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors">
                <Send className="w-4 h-4" />
                Start Outreach
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Right Column - Tabbed Content */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-violet-500/20 text-violet-400"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Recommended Action */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  Recommended Action
                </h3>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    candidate.recommended_approach === "immediate" ? "bg-red-500/20" :
                    candidate.recommended_approach === "targeted" ? "bg-violet-500/20" : "bg-blue-500/20"
                  }`}>
                    <Target className={`w-6 h-6 ${
                      candidate.recommended_approach === "immediate" ? "text-red-400" :
                      candidate.recommended_approach === "targeted" ? "text-violet-400" : "text-blue-400"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white capitalize">
                      {candidate.recommended_approach || "Nurture"} Approach
                    </h4>
                    <p className="text-sm text-white/60 mt-1">
                      {candidate.recommended_timeline || "Engage within 2-4 weeks"}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Experience Summary */}
              {candidate.experience && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-violet-400" />
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {(Array.isArray(candidate.experience) ? candidate.experience : []).map((exp, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{exp.title}</h4>
                          <p className="text-sm text-white/60">{exp.company}</p>
                          <p className="text-xs text-white/40">{exp.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-violet-400" />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {activeTab === "intelligence" && (
            <div className="space-y-6">
              {/* Intelligence Factors */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Flight Risk Factors
                </h3>
                {intelligenceFactors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {intelligenceFactors.map((factor, idx) => (
                      <FactorBadge key={idx} factor={factor} type="positive" />
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60">No risk factors identified yet.</p>
                )}
              </GlassCard>

              {/* Timing Intelligence */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Timing Signals
                </h3>
                {intelligenceTiming.length > 0 ? (
                  <div className="space-y-3">
                    {intelligenceTiming.map((signal, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-white/80">{signal.signal || signal}</p>
                          {signal.date && (
                            <p className="text-xs text-white/40 mt-1">{signal.date}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60">No timing signals detected yet.</p>
                )}
              </GlassCard>

              {/* Last Updated */}
              {candidate.last_intelligence_update && (
                <div className="text-center text-sm text-white/40">
                  Last updated: {new Date(candidate.last_intelligence_update).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {activeTab === "outreach" && (
            <div className="space-y-4">
              {outreachTasks.length > 0 ? (
                outreachTasks.map((task) => (
                  <OutreachTaskCard key={task.id} task={task} />
                ))
              ) : (
                <GlassCard className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No outreach yet</h3>
                  <p className="text-white/60 mb-6">
                    Start an outreach campaign to engage with this candidate.
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors">
                    <Send className="w-4 h-4" />
                    Start Outreach
                  </button>
                </GlassCard>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-violet-400" />
                Activity History
              </h3>
              <div className="space-y-0">
                <TimelineItem
                  item={{
                    type: "status",
                    title: "Candidate Added",
                    description: "Added to talent pool",
                    date: new Date(candidate.created_at).toLocaleDateString(),
                  }}
                  isLast={true}
                />
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
