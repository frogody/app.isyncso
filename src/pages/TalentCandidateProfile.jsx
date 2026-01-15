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
import { CompanyIntelligenceReport } from "@/components/shared/CompanyIntelligenceReport";
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
  ArrowUpRight,
  TrendingDown,
  Activity,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// Expandable Text component
const ExpandableText = ({ text, maxLength = 200 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-white/40">—</span>;

  const shouldTruncate = text.length > maxLength;
  const displayText = expanded || !shouldTruncate ? text : `${text.substring(0, maxLength)}...`;

  return (
    <div>
      <p className="text-sm text-white/70 leading-relaxed">{displayText}</p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-red-400 hover:text-red-300 mt-2 flex items-center gap-1"
        >
          {expanded ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Read more <ChevronDown className="w-3 h-3" /></>}
        </button>
      )}
    </div>
  );
};

// Stat Card
const StatCard = ({ label, value, icon: Icon, color = "red", subtext }) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl bg-${color}-500/10`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white mb-1">{value}</p>
    <p className="text-sm text-white/50">{label}</p>
    {subtext && <p className="text-xs text-white/30 mt-1">{subtext}</p>}
  </div>
);

// Info Row
const InfoRow = ({ icon: Icon, label, value, link }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="p-2 rounded-lg bg-white/[0.04]">
        <Icon className="w-4 h-4 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40">{label}</p>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-red-400 hover:text-red-300 truncate flex items-center gap-1">
            {value} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-white truncate">{value}</p>
        )}
      </div>
    </div>
  );
};

// Urgency Badge
const UrgencyBadge = ({ level }) => {
  const config = {
    high: { bg: "bg-red-500/20", text: "text-red-400", label: "High Priority" },
    medium: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Medium Priority" },
    low: { bg: "bg-green-500/20", text: "text-green-400", label: "Low Priority" },
    response: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Response Priority" },
  };
  const c = config[level?.toLowerCase()] || config.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
};

// Satisfaction Badge - parses "Switching Likelihood: High/Medium/Low" from analysis text
const SatisfactionBadge = ({ level }) => {
  // Extract switching likelihood from analysis text
  let switchingLikelihood = "Medium";
  if (level) {
    const match = level.match(/Switching Likelihood:\s*(High|Medium|Low)/i);
    if (match) {
      switchingLikelihood = match[1];
    }
  }

  const lowerLevel = switchingLikelihood.toLowerCase();
  let config;
  if (lowerLevel === "high") {
    // High switching = dissatisfied/open to move
    config = { bg: "bg-green-500/20", text: "text-green-400", icon: Smile, label: "Open to Move" };
  } else if (lowerLevel === "low") {
    // Low switching = satisfied/not looking
    config = { bg: "bg-red-500/20", text: "text-red-400", icon: Frown, label: "Not Looking" };
  } else {
    config = { bg: "bg-amber-500/20", text: "text-amber-400", icon: Meh, label: "Considering" };
  }
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// Timeline Item
const TimelineItem = ({ item, isLast }) => {
  const typeStyles = {
    outreach: { icon: Send, color: "text-red-400", bg: "bg-red-500/15" },
    reply: { icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/15" },
    note: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/15" },
    status: { icon: History, color: "text-zinc-400", bg: "bg-zinc-500/15" },
    import: { icon: FileDown, color: "text-purple-400", bg: "bg-purple-500/15" },
  };
  const style = typeStyles[item.type] || typeStyles.status;
  const Icon = style.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${style.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/[0.06] my-2" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white capitalize">{item.title}</h4>
          <span className="text-xs text-white/30">{item.date}</span>
        </div>
        <p className="text-xs text-white/50 mt-1">{item.description}</p>
      </div>
    </div>
  );
};

// Outreach Task Card
const OutreachTaskCard = ({ task }) => {
  const statusStyles = {
    pending: { color: "text-yellow-400", bg: "bg-yellow-500/15", label: "Pending" },
    approved_ready: { color: "text-blue-400", bg: "bg-blue-500/15", label: "Ready" },
    sent: { color: "text-green-400", bg: "bg-green-500/15", label: "Sent" },
    completed: { color: "text-green-400", bg: "bg-green-500/15", label: "Completed" },
    cancelled: { color: "text-zinc-400", bg: "bg-zinc-500/15", label: "Cancelled" },
  };
  const style = statusStyles[task.status] || statusStyles.pending;

  return (
    <div className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-lg ${style.bg} ${style.color}`}>
          {style.label}
        </span>
        <span className="text-xs text-white/30">{task.stage}</span>
      </div>
      <h4 className="text-sm font-medium text-white capitalize">{task.task_type?.replace(/_/g, " ")}</h4>
      {task.sent_at && (
        <p className="text-xs text-white/40 mt-2">Sent: {new Date(task.sent_at).toLocaleDateString()}</p>
      )}
    </div>
  );
};

// Analysis Card
const AnalysisCard = ({ icon: Icon, title, content, maxLength = 300 }) => {
  if (!content) return null;
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-red-500/10">
          <Icon className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      <ExpandableText text={content} maxLength={maxLength} />
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
        .order("created_date", { ascending: false });
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
      <div className="min-h-screen bg-black">
        <div className="w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <User className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Candidate not found</h3>
          <p className="text-white/50 mb-6">The candidate you're looking for doesn't exist.</p>
          <Link
            to={createPageUrl("TalentCandidates")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Candidates
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "company", label: "Company" },
    { id: "intelligence", label: "Intelligence" },
    { id: "outreach", label: "Outreach" },
  ];

  const fullName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  const initials = fullName.split(" ").filter(n => n).map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?";

  // Build history
  const historyItems = [];
  if (candidate.imported_at) {
    historyItems.push({
      type: "import",
      title: "Imported from CSV",
      description: candidate.import_source || "External source",
      date: new Date(candidate.imported_at).toLocaleDateString(),
    });
  }
  outreachTasks.slice(0, 5).forEach(task => {
    historyItems.push({
      type: "outreach",
      title: task.task_type?.replace(/_/g, " "),
      description: task.status,
      date: new Date(task.created_date).toLocaleDateString(),
    });
  });

  return (
    <div className="min-h-screen bg-black">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full px-6 lg:px-8 py-6 space-y-6"
      >
        {/* Back Button */}
        <Link
          to={createPageUrl("TalentCandidates")}
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Candidates
        </Link>

        {/* Hero Section */}
        <motion.div variants={itemVariants}>
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] rounded-3xl p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex items-center gap-5 flex-1">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-red-500/20">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-white mb-1">{fullName}</h1>
                  <p className="text-white/60 text-lg mb-3">{candidate.job_title || "—"}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {candidate.company_name && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
                        <Building2 className="w-4 h-4" />
                        {candidate.company_name}
                      </span>
                    )}
                    {candidate.person_home_location && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
                        <MapPin className="w-4 h-4" />
                        {candidate.person_home_location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Intelligence Score & Actions */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <IntelligenceGauge score={candidate.intelligence_score || 0} size="lg" showLabel />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={generateIntelligenceReport}
                    disabled={generatingIntelligence}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6"
                  >
                    {generatingIntelligence ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Intel
                  </Button>
                  <Button variant="outline" className="border-white/10 text-white/70 hover:bg-white/5 px-6">
                    <Send className="w-4 h-4 mr-2" />
                    Start Outreach
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-8 pt-8 border-t border-white/[0.06]">
              <div>
                <p className="text-xs text-white/40 mb-1">Urgency</p>
                <UrgencyBadge level={candidate.recruitment_urgency} />
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Satisfaction</p>
                <SatisfactionBadge level={candidate.job_satisfaction} />
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Salary Range</p>
                <p className="text-lg font-semibold text-green-400">
                  {candidate.salary_range ? `$${Number(candidate.salary_range).toLocaleString()}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Years at Company</p>
                <p className="text-lg font-semibold text-white">{candidate.years_at_company || 0}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Promotions</p>
                <p className="text-lg font-semibold text-white">{candidate.times_promoted || 0}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Company Changes</p>
                <p className="text-lg font-semibold text-white">{candidate.times_company_hopped || 0}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div variants={itemVariants}>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Analysis Cards */}
                <AnalysisCard
                  icon={Target}
                  title="Recruitment Assessment"
                  content={candidate.outreach_urgency_reasoning}
                  maxLength={400}
                />
                <AnalysisCard
                  icon={Briefcase}
                  title="Job Satisfaction Analysis"
                  content={candidate.job_satisfaction_analysis}
                  maxLength={400}
                />
                <AnalysisCard
                  icon={Award}
                  title="Experience Analysis"
                  content={candidate.experience_analysis}
                  maxLength={400}
                />

                {/* Career Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Years at Company" value={candidate.years_at_company || 0} icon={Calendar} color="blue" />
                  <StatCard label="Promotions" value={candidate.times_promoted || 0} icon={TrendingUp} color="green" />
                  <StatCard label="Avg Promo Time" value={candidate.avg_promotion_threshold ? `${candidate.avg_promotion_threshold}y` : "—"} icon={Clock} color="amber" />
                  <StatCard label="Company Changes" value={candidate.times_company_hopped || 0} icon={Briefcase} color="purple" />
                </div>

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-red-400" />
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => (
                        <Badge key={idx} className="bg-white/[0.06] border-white/[0.08] text-white/70 px-3 py-1.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Side Column */}
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Contact Information</h3>
                  <div className="space-y-1">
                    <InfoRow icon={Mail} label="Email" value={candidate.email} link={candidate.email ? `mailto:${candidate.email}` : null} />
                    <InfoRow icon={Phone} label="Phone" value={candidate.phone} />
                    <InfoRow icon={Linkedin} label="LinkedIn" value="View Profile" link={candidate.linkedin_profile} />
                    <InfoRow icon={MapPin} label="Location" value={candidate.person_home_location} />
                  </div>
                </div>

                {/* Recent Activity */}
                {historyItems.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <History className="w-5 h-5 text-red-400" />
                      Recent Activity
                    </h3>
                    <div>
                      {historyItems.slice(0, 4).map((item, idx) => (
                        <TimelineItem key={idx} item={item} isLast={idx === Math.min(historyItems.length - 1, 3)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === "company" && (
            <div className="space-y-4">
              {/* Compact Company Info Bar */}
              <motion.div
                variants={itemVariants}
                className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4"
              >
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Building2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{candidate.company_name || "—"}</p>
                      <p className="text-xs text-white/40">{candidate.industry || "Industry unknown"}</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-white/10 hidden sm:block" />
                  <div className="flex flex-wrap gap-4 text-sm">
                    {candidate.company_size && (
                      <div>
                        <span className="text-white/40 text-xs">Size</span>
                        <p className="text-white font-medium">{candidate.company_size}</p>
                      </div>
                    )}
                    {candidate.company_type && (
                      <div>
                        <span className="text-white/40 text-xs">Type</span>
                        <p className="text-white font-medium">{candidate.company_type}</p>
                      </div>
                    )}
                    {candidate.company_hq && (
                      <div>
                        <span className="text-white/40 text-xs">HQ</span>
                        <p className="text-white font-medium">{candidate.company_hq}</p>
                      </div>
                    )}
                    {candidate.company_domain && (
                      <div>
                        <span className="text-white/40 text-xs">Website</span>
                        <a
                          href={`https://${candidate.company_domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                        >
                          {candidate.company_domain} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {candidate.company_description && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <ExpandableText text={candidate.company_description} maxLength={250} />
                  </div>
                )}
              </motion.div>

              {/* M&A News - if exists */}
              {candidate.recent_ma_news && (
                <motion.div
                  variants={itemVariants}
                  className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-xl border border-amber-500/20 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-white text-sm">Recent M&A News</h3>
                  </div>
                  <ExpandableText text={candidate.recent_ma_news} maxLength={300} />
                </motion.div>
              )}

              {/* Company Intelligence */}
              <CompanyIntelligenceReport
                intelligence={candidate.company_intelligence}
                companyName={candidate.company_name}
                companyDomain={candidate.company_domain}
                entityType="candidate"
                entityId={candidate.id}
                onIntelligenceGenerated={(intel) => setCandidate({ ...candidate, company_intelligence: intel })}
              />

              {/* Experience Report */}
              {candidate.experience_report && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-red-500/10">
                      <FileText className="w-4 h-4 text-red-400" />
                    </div>
                    <h3 className="font-semibold text-white text-sm">Experience Report</h3>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{candidate.experience_report}</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Intelligence Tab */}
          {activeTab === "intelligence" && (
            <IntelligenceReport
              candidate={candidate}
              onGenerate={generateIntelligenceReport}
              isGenerating={generatingIntelligence}
            />
          )}

          {/* Outreach Tab */}
          {activeTab === "outreach" && (
            <div>
              {outreachTasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outreachTasks.map((task) => (
                    <OutreachTaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Outreach Yet</h3>
                  <p className="text-white/50 mb-6 max-w-md mx-auto">
                    Start engaging with this candidate through email, LinkedIn, or phone outreach.
                  </p>
                  <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-8">
                    <Send className="w-4 h-4 mr-2" />
                    Start Outreach Campaign
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
