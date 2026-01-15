import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntelligenceGauge } from "@/components/talent/IntelligenceGauge";
import { IntelligenceReport } from "@/components/talent/IntelligenceReport";
import {
  User,
  Building2,
  MapPin,
  Mail,
  Phone,
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  History,
  Sparkles,
  Loader2,
  DollarSign,
  Users,
  Calendar,
  Smile,
  Meh,
  Frown,
  Zap,
  BarChart3,
  Building,
  Factory,
  Rocket,
  FileDown,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
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

// Expandable Text component for long content
const ExpandableText = ({ text, maxLength = 200 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const shouldTruncate = text.length > maxLength;
  const displayText = expanded || !shouldTruncate ? text : `${text.substring(0, maxLength)}...`;

  return (
    <div>
      <p className="text-sm text-white/70 whitespace-pre-wrap">{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-red-400 hover:text-red-300 mt-2 flex items-center gap-1"
        >
          {expanded ? (
            <>Show less <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Read more <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
};

// Key Value Row - compact display
const KeyValue = ({ label, value, icon: Icon }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/50 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
};

// Metric Card - clean stat display
const MetricCard = ({ label, value, icon: Icon, color = "white" }) => (
  <div className="text-center p-4 bg-white/5 rounded-xl">
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 text-${color}/60`} />}
    <p className={`text-2xl font-bold text-${color}`}>{value}</p>
    <p className="text-xs text-white/50 mt-1">{label}</p>
  </div>
);

// Urgency indicator
const UrgencyIndicator = ({ level }) => {
  const config = {
    high: { color: "bg-red-500", text: "High", textColor: "text-red-400" },
    medium: { color: "bg-amber-500", text: "Medium", textColor: "text-amber-400" },
    low: { color: "bg-green-500", text: "Low", textColor: "text-green-400" },
    response: { color: "bg-amber-500", text: "Response", textColor: "text-amber-400" },
  };
  const c = config[level?.toLowerCase()] || config.medium;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${c.color}`} />
      <span className={`text-sm font-medium ${c.textColor}`}>{c.text} Priority</span>
    </div>
  );
};

// Satisfaction indicator
const SatisfactionIndicator = ({ level }) => {
  const lowerLevel = level?.toLowerCase() || "";
  let icon, color, label;

  if (lowerLevel.includes("high") || lowerLevel.includes("satisfied")) {
    icon = <Smile className="w-4 h-4" />;
    color = "text-green-400";
    label = "Satisfied";
  } else if (lowerLevel.includes("low") || lowerLevel.includes("dissatisfied")) {
    icon = <Frown className="w-4 h-4" />;
    color = "text-red-400";
    label = "Dissatisfied";
  } else {
    icon = <Meh className="w-4 h-4" />;
    color = "text-amber-400";
    label = level || "Mixed";
  }

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};

// Timeline Item
const TimelineItem = ({ item, isLast }) => {
  const typeStyles = {
    outreach: { icon: Send, color: "text-red-400", bg: "bg-red-500/20" },
    reply: { icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/20" },
    note: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/20" },
    status: { icon: History, color: "text-zinc-400", bg: "bg-zinc-500/20" },
    import: { icon: FileDown, color: "text-purple-400", bg: "bg-purple-500/20" },
  };

  const style = typeStyles[item.type] || typeStyles.status;
  const Icon = style.icon;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${style.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/10 my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">{item.title}</h4>
          <span className="text-xs text-white/40">{item.date}</span>
        </div>
        <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
      </div>
    </div>
  );
};

// Outreach Task Card
const OutreachTaskCard = ({ task }) => {
  const statusStyles = {
    pending: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Pending" },
    approved_ready: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Ready" },
    sent: { color: "text-green-400", bg: "bg-green-500/20", label: "Sent" },
    completed: { color: "text-green-400", bg: "bg-green-500/20", label: "Completed" },
    cancelled: { color: "text-zinc-400", bg: "bg-zinc-500/20", label: "Cancelled" },
  };

  const style = statusStyles[task.status] || statusStyles.pending;

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
          {style.label}
        </span>
        <span className="text-xs text-white/40">{task.stage}</span>
      </div>
      <h4 className="text-sm font-medium text-white capitalize">{task.task_type?.replace(/_/g, " ")}</h4>
      {task.sent_at && (
        <p className="text-xs text-white/40 mt-2">Sent: {new Date(task.sent_at).toLocaleDateString()}</p>
      )}
    </div>
  );
};

export default function TalentCandidateProfile() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("id");

  const [candidate, setCandidate] = useState(null);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [generatingIntelligence, setGeneratingIntelligence] = useState(false);

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
      toast.error("Failed to load candidate");
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

  const generateIntelligenceReport = async () => {
    setGeneratingIntelligence(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCandidateIntelligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            candidate_id: candidateId,
            organization_id: user.organization_id,
          }),
        }
      );

      if (response.ok) {
        await fetchCandidate();
        setActiveTab("intelligence");
        toast.success("Intelligence report generated");
      } else {
        toast.error("Failed to generate intelligence report");
      }
    } catch (err) {
      console.error("Error generating intelligence:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setGeneratingIntelligence(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[500px] rounded-xl" />
            <Skeleton className="h-[500px] rounded-xl lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6">
          <GlassCard className="p-12 text-center">
            <User className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Candidate not found</h3>
            <Link
              to={createPageUrl("TalentCandidates")}
              className="inline-flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Candidates
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "details", label: "Details" },
    { id: "intelligence", label: "Intelligence" },
    { id: "outreach", label: "Outreach" },
  ];

  const fullName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  const initials = fullName.split(" ").filter(n => n).map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?";

  // Build history timeline
  const historyItems = [];
  if (candidate.imported_at) {
    historyItems.push({
      type: "import",
      title: "Imported from CSV",
      description: candidate.import_source || "Unknown file",
      date: new Date(candidate.imported_at).toLocaleDateString(),
    });
  }
  outreachTasks.slice(0, 3).forEach(task => {
    historyItems.push({
      type: "outreach",
      title: task.task_type?.replace(/_/g, " "),
      description: task.status,
      date: new Date(task.created_at).toLocaleDateString(),
    });
  });

  return (
    <div className="min-h-screen bg-black relative">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6"
      >
        {/* Back Button */}
        <Link
          to={createPageUrl("TalentCandidates")}
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Candidates
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <GlassCard className="p-6">
              {/* Avatar & Name */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-2xl font-bold text-white">
                  {initials}
                </div>
                <h2 className="text-lg font-bold text-white">{fullName}</h2>
                <p className="text-sm text-white/60">{candidate.job_title}</p>
              </div>

              {/* Intelligence Score */}
              <div className="flex justify-center mb-6 pb-6 border-b border-white/10">
                <IntelligenceGauge score={candidate.intelligence_score || 0} size="md" showLabel />
              </div>

              {/* Quick Info */}
              <div className="space-y-3 mb-6 text-sm">
                {candidate.company_name && (
                  <div className="flex items-center gap-3 text-white/70">
                    <Building2 className="w-4 h-4 text-white/40" />
                    {candidate.company_name}
                  </div>
                )}
                {candidate.person_home_location && (
                  <div className="flex items-center gap-3 text-white/70">
                    <MapPin className="w-4 h-4 text-white/40" />
                    {candidate.person_home_location}
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-3 text-white/70">
                    <Mail className="w-4 h-4 text-white/40" />
                    <a href={`mailto:${candidate.email}`} className="hover:text-red-400 truncate">
                      {candidate.email}
                    </a>
                  </div>
                )}
                {candidate.linkedin_profile && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-4 h-4 text-white/40" />
                    <a
                      href={candidate.linkedin_profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-red-400 flex items-center gap-1"
                    >
                      LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-white">{candidate.years_at_company || 0}</p>
                  <p className="text-xs text-white/50">Years</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-white">{candidate.times_promoted || 0}</p>
                  <p className="text-xs text-white/50">Promotions</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={generateIntelligenceReport}
                  disabled={generatingIntelligence}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {generatingIntelligence ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Intelligence
                </Button>
                <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/5">
                  <Send className="w-4 h-4 mr-2" />
                  Start Outreach
                </Button>
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
                      ? "bg-red-500/20 text-red-400"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Key Insights Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Urgency */}
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-white">Recruitment Urgency</span>
                    </div>
                    <UrgencyIndicator level={candidate.recruitment_urgency} />
                  </GlassCard>

                  {/* Satisfaction */}
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Smile className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-white">Job Satisfaction</span>
                    </div>
                    <SatisfactionIndicator level={candidate.job_satisfaction} />
                  </GlassCard>

                  {/* Salary */}
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-white">Salary Range</span>
                    </div>
                    <p className="text-lg font-bold text-green-400">
                      {candidate.salary_range ? `$${Number(candidate.salary_range).toLocaleString()}` : "Unknown"}
                    </p>
                  </GlassCard>
                </div>

                {/* Urgency Reasoning */}
                {candidate.outreach_urgency_reasoning && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-400" />
                      Recruitment Assessment
                    </h3>
                    <ExpandableText text={candidate.outreach_urgency_reasoning} maxLength={250} />
                  </GlassCard>
                )}

                {/* Job Satisfaction Analysis */}
                {candidate.job_satisfaction_analysis && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-red-400" />
                      Job Satisfaction Analysis
                    </h3>
                    <ExpandableText text={candidate.job_satisfaction_analysis} maxLength={250} />
                  </GlassCard>
                )}

                {/* Experience Summary */}
                {candidate.experience_analysis && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-red-400" />
                      Experience Analysis
                    </h3>
                    <ExpandableText text={candidate.experience_analysis} maxLength={200} />
                  </GlassCard>
                )}

                {/* Recent Activity */}
                {historyItems.length > 0 && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                      <History className="w-4 h-4 text-red-400" />
                      Recent Activity
                    </h3>
                    <div>
                      {historyItems.map((item, idx) => (
                        <TimelineItem key={idx} item={item} isLast={idx === historyItems.length - 1} />
                      ))}
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="space-y-4">
                {/* Company Information */}
                <GlassCard className="p-4">
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-400" />
                    Company Information
                  </h3>
                  <div className="space-y-1">
                    <KeyValue label="Company" value={candidate.company_name} icon={Building2} />
                    <KeyValue label="Industry" value={candidate.industry} icon={Factory} />
                    <KeyValue label="Company Size" value={candidate.company_size} icon={Users} />
                    <KeyValue label="Employee Count" value={candidate.company_employee_count?.toLocaleString()} icon={Users} />
                    <KeyValue label="Company Type" value={candidate.company_type} icon={Building} />
                    <KeyValue label="Headquarters" value={candidate.company_hq} icon={MapPin} />
                    {candidate.company_domain && (
                      <div className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-sm text-white/50 flex items-center gap-2">
                          <Globe className="w-4 h-4" /> Website
                        </span>
                        <a
                          href={`https://${candidate.company_domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          {candidate.company_domain} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  {candidate.company_description && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-white/40 mb-2">About</p>
                      <ExpandableText text={candidate.company_description} maxLength={200} />
                    </div>
                  )}
                </GlassCard>

                {/* Career Metrics */}
                <GlassCard className="p-4">
                  <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    Career Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Years at Company" value={candidate.years_at_company || 0} icon={Calendar} />
                    <MetricCard label="Promotions" value={candidate.times_promoted || 0} icon={TrendingUp} />
                    <MetricCard label="Avg Promo Time" value={candidate.avg_promotion_threshold ? `${candidate.avg_promotion_threshold}y` : "N/A"} icon={Clock} />
                    <MetricCard label="Company Changes" value={candidate.times_company_hopped || 0} icon={Briefcase} />
                  </div>
                </GlassCard>

                {/* Career Changes */}
                {candidate.career_changes && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-red-400" />
                      Career Changes & Promotions
                    </h3>
                    <ExpandableText text={candidate.career_changes} maxLength={300} />
                  </GlassCard>
                )}

                {/* Salary & Market */}
                {(candidate.salary_intelligence || candidate.market_position) && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-red-400" />
                      Compensation Intelligence
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/40 mb-1">Salary Range</p>
                        <p className="text-lg font-bold text-green-400">
                          {candidate.salary_range ? `$${Number(candidate.salary_range).toLocaleString()}` : "Unknown"}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/40 mb-1">Market Position</p>
                        <p className="text-sm text-white">{candidate.market_position || "Unknown"}</p>
                      </div>
                    </div>
                    {candidate.salary_intelligence && (
                      <ExpandableText text={candidate.salary_intelligence} maxLength={200} />
                    )}
                  </GlassCard>
                )}

                {/* Experience Report */}
                {candidate.experience_report && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-400" />
                      Experience Report
                    </h3>
                    <ExpandableText text={candidate.experience_report} maxLength={300} />
                  </GlassCard>
                )}

                {/* M&A News */}
                {candidate.recent_ma_news && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-400" />
                      Recent M&A News
                    </h3>
                    <ExpandableText text={candidate.recent_ma_news} maxLength={300} />
                  </GlassCard>
                )}

                {/* Demographics */}
                {candidate.estimated_age_range && (
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50 flex items-center gap-2">
                        <User className="w-4 h-4" /> Estimated Age Range
                      </span>
                      <span className="text-sm text-white font-medium">{candidate.estimated_age_range}</span>
                    </div>
                  </GlassCard>
                )}

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-red-400" />
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white/5 border-white/10 text-white/70 text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Intelligence Tab */}
            {activeTab === "intelligence" && (
              <GlassCard className="p-6">
                <IntelligenceReport candidate={candidate} />

                {!candidate.intelligence_factors?.length && !candidate.intelligence_timing?.length && (
                  <div className="mt-6 text-center">
                    <p className="text-white/50 mb-4">No intelligence report generated yet.</p>
                    <Button
                      onClick={generateIntelligenceReport}
                      disabled={generatingIntelligence}
                      className="bg-gradient-to-r from-red-500 to-red-600"
                    >
                      {generatingIntelligence ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate Intelligence Report
                    </Button>
                  </div>
                )}
              </GlassCard>
            )}

            {/* Outreach Tab */}
            {activeTab === "outreach" && (
              <div className="space-y-4">
                {outreachTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {outreachTasks.map((task) => (
                      <OutreachTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <GlassCard className="p-12 text-center">
                    <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-white mb-2">No outreach yet</h3>
                    <p className="text-sm text-white/50 mb-4">Start engaging with this candidate.</p>
                    <Button className="bg-red-500 hover:bg-red-600">
                      <Send className="w-4 h-4 mr-2" />
                      Start Outreach
                    </Button>
                  </GlassCard>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
