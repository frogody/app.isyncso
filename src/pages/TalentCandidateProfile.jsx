import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  MessageSquare,
  FileText,
  ChevronLeft,
  ExternalLink,
  Send,
  History,
  Sparkles,
  Loader2,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Smile,
  Meh,
  Frown,
  Zap,
  BarChart3,
  UserCheck,
  Building,
  Factory,
  Rocket,
  Shield,
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

// Info Row component for consistent display
const InfoRow = ({ icon: Icon, label, value, link, className = "" }) => {
  if (!value) return null;

  return (
    <div className={`flex items-start gap-3 py-2 ${className}`}>
      <Icon className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40 mb-0.5">{label}</p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/80 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-white/80">{value}</p>
        )}
      </div>
    </div>
  );
};

// Section Card component
const SectionCard = ({ title, icon: Icon, children, className = "" }) => (
  <GlassCard className={`p-5 ${className}`}>
    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
      <Icon className="w-5 h-5 text-red-400" />
      {title}
    </h3>
    {children}
  </GlassCard>
);

// Stat Box component
const StatBox = ({ label, value, subValue, icon: Icon, trend, color = "white" }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-white/50 uppercase tracking-wide">{label}</span>
      {Icon && <Icon className={`w-4 h-4 text-${color}/60`} />}
    </div>
    <div className="flex items-end gap-2">
      <span className={`text-2xl font-bold text-${color}`}>{value}</span>
      {trend && (
        <span className={`text-xs flex items-center gap-0.5 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    {subValue && <p className="text-xs text-white/40 mt-1">{subValue}</p>}
  </div>
);

// Urgency Badge component
const UrgencyBadge = ({ urgency }) => {
  const styles = {
    high: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    medium: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
    low: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  };
  const style = styles[urgency?.toLowerCase()] || styles.medium;

  return (
    <Badge className={`${style.bg} ${style.text} border ${style.border} font-medium`}>
      {urgency || "Medium"} Priority
    </Badge>
  );
};

// Satisfaction Icon component
const SatisfactionIcon = ({ level }) => {
  const lowerLevel = level?.toLowerCase() || "";
  if (lowerLevel.includes("high") || lowerLevel.includes("satisfied")) {
    return <Smile className="w-5 h-5 text-green-400" />;
  } else if (lowerLevel.includes("low") || lowerLevel.includes("dissatisfied")) {
    return <Frown className="w-5 h-5 text-red-400" />;
  }
  return <Meh className="w-5 h-5 text-amber-400" />;
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
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${style.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/10 my-2" />}
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
    sent: { color: "text-green-400", bg: "bg-green-500/20", label: "Sent" },
    completed: { color: "text-green-400", bg: "bg-green-500/20", label: "Completed" },
    cancelled: { color: "text-zinc-400", bg: "bg-zinc-500/20", label: "Cancelled" },
  };

  const style = statusStyles[task.status] || statusStyles.pending;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>
            {style.label}
          </span>
          <h4 className="font-medium text-white mt-2 capitalize">{task.task_type?.replace(/_/g, " ")}</h4>
        </div>
        <span className="text-sm text-white/40">{task.stage}</span>
      </div>
      {task.message_content && (
        <p className="text-sm text-white/60 line-clamp-3">{task.message_content}</p>
      )}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-sm text-white/40">
        <span>Attempt #{task.attempt_number || 1}</span>
        {task.sent_at && <span>Sent: {new Date(task.sent_at).toLocaleDateString()}</span>}
      </div>
    </GlassCard>
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
  const [intelligenceError, setIntelligenceError] = useState(null);

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
    setIntelligenceError(null);

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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to generate intelligence report";
        setIntelligenceError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error("Error generating intelligence:", err);
      const errorMessage = "Network error. Please try again.";
      setIntelligenceError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGeneratingIntelligence(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[600px] rounded-xl lg:col-span-1" />
            <Skeleton className="h-[600px] rounded-xl lg:col-span-2" />
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
            <p className="text-white/60 mb-6">The candidate you're looking for doesn't exist or has been removed.</p>
            <Link
              to={createPageUrl("TalentCandidates")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
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
    { id: "company", label: "Company" },
    { id: "career", label: "Career" },
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
      description: `Source: ${candidate.import_source || "Unknown file"}`,
      date: new Date(candidate.imported_at).toLocaleDateString(),
    });
  }
  if (candidate.created_date) {
    historyItems.push({
      type: "status",
      title: "Added to Talent Pool",
      description: "Candidate record created",
      date: new Date(candidate.created_date).toLocaleDateString(),
    });
  }
  outreachTasks.slice(0, 5).forEach(task => {
    historyItems.push({
      type: "outreach",
      title: `Outreach: ${task.task_type?.replace(/_/g, " ")}`,
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
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Candidates
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <motion.div variants={itemVariants} className="lg:col-span-1 space-y-4">
            {/* Main Profile Card */}
            <GlassCard className="p-6">
              {/* Avatar & Basic Info */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-red-500/30">
                  {initials}
                </div>
                <h2 className="text-xl font-bold text-white">{fullName}</h2>
                <p className="text-white/60">{candidate.job_title}</p>
                {candidate.recruitment_urgency && (
                  <div className="mt-3">
                    <UrgencyBadge urgency={candidate.recruitment_urgency} />
                  </div>
                )}
              </div>

              {/* Intelligence Score */}
              <div className="flex justify-center mb-6 pb-6 border-b border-white/10">
                <IntelligenceGauge score={candidate.intelligence_score || 0} size="lg" showLabel />
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-6 border-b border-white/10 pb-6">
                <InfoRow icon={Mail} label="Email" value={candidate.email} link={candidate.email ? `mailto:${candidate.email}` : null} />
                <InfoRow icon={Phone} label="Phone" value={candidate.phone} />
                <InfoRow icon={Building2} label="Company" value={candidate.company_name} />
                <InfoRow icon={MapPin} label="Location" value={candidate.person_home_location} />
                <InfoRow icon={MapPin} label="Work Address" value={candidate.work_address} />
                <InfoRow icon={Linkedin} label="LinkedIn" value="View Profile" link={candidate.linkedin_profile} />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatBox
                  label="Years at Company"
                  value={candidate.years_at_company || candidate.years_experience || 0}
                  icon={Calendar}
                />
                <StatBox
                  label="Times Promoted"
                  value={candidate.times_promoted || 0}
                  icon={TrendingUp}
                />
                <StatBox
                  label="Company Hops"
                  value={candidate.times_company_hopped || 0}
                  icon={Briefcase}
                />
                <StatBox
                  label="Outreach"
                  value={outreachTasks.length}
                  icon={MessageSquare}
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={generateIntelligenceReport}
                  disabled={generatingIntelligence}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    generatingIntelligence
                      ? "bg-red-500/10 text-red-400/60 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                  }`}
                >
                  {generatingIntelligence ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Intelligence
                    </>
                  )}
                </button>
                {intelligenceError && (
                  <p className="text-xs text-red-400 text-center">{intelligenceError}</p>
                )}
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors border border-white/10">
                  <Send className="w-4 h-4" />
                  Start Outreach
                </button>
              </div>
            </GlassCard>

            {/* Estimated Demographics */}
            {candidate.estimated_age_range && (
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-white/40" />
                  <div>
                    <p className="text-xs text-white/40">Estimated Age Range</p>
                    <p className="text-sm text-white/80">{candidate.estimated_age_range}</p>
                  </div>
                </div>
              </GlassCard>
            )}
          </motion.div>

          {/* Right Column - Tabbed Content */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-red-500/20 text-red-400"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Recruitment Urgency & Recommended Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SectionCard title="Recruitment Urgency" icon={Zap}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl ${
                        candidate.recruitment_urgency?.toLowerCase() === 'high' ? 'bg-red-500/20' :
                        candidate.recruitment_urgency?.toLowerCase() === 'low' ? 'bg-green-500/20' : 'bg-amber-500/20'
                      }`}>
                        <AlertTriangle className={`w-6 h-6 ${
                          candidate.recruitment_urgency?.toLowerCase() === 'high' ? 'text-red-400' :
                          candidate.recruitment_urgency?.toLowerCase() === 'low' ? 'text-green-400' : 'text-amber-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-white capitalize">{candidate.recruitment_urgency || "Medium"} Priority</p>
                        <p className="text-xs text-white/50">Outreach timing indicator</p>
                      </div>
                    </div>
                    {candidate.outreach_urgency_reasoning && (
                      <p className="text-sm text-white/60 bg-white/5 rounded-lg p-3">
                        {candidate.outreach_urgency_reasoning}
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard title="Recommended Action" icon={Target}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-red-500/20">
                        <Rocket className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white capitalize">{candidate.recommended_approach || "Nurture"} Approach</p>
                        <p className="text-xs text-white/50">{candidate.recommended_timeline || "Engage within 2-4 weeks"}</p>
                      </div>
                    </div>
                  </SectionCard>
                </div>

                {/* Job Satisfaction */}
                {(candidate.job_satisfaction || candidate.job_satisfaction_analysis) && (
                  <SectionCard title="Job Satisfaction" icon={Smile}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-white/10">
                        <SatisfactionIcon level={candidate.job_satisfaction} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{candidate.job_satisfaction || "Unknown"}</p>
                        {candidate.job_satisfaction_reasoning && (
                          <p className="text-sm text-white/60 mt-1">{candidate.job_satisfaction_reasoning}</p>
                        )}
                      </div>
                    </div>
                    {candidate.job_satisfaction_analysis && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-xs text-white/40 mb-2">Detailed Analysis</p>
                        <p className="text-sm text-white/70">{candidate.job_satisfaction_analysis}</p>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Salary Intelligence */}
                {(candidate.salary_intelligence || candidate.salary_range || candidate.market_position) && (
                  <SectionCard title="Salary Intelligence" icon={DollarSign}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {candidate.salary_range && (
                        <StatBox
                          label="Salary Range"
                          value={`$${Number(candidate.salary_range).toLocaleString()}`}
                          icon={DollarSign}
                          color="green-400"
                        />
                      )}
                      {candidate.market_position && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                          <p className="text-xs text-white/50 uppercase tracking-wide mb-2">Market Position</p>
                          <p className="text-sm text-white font-medium">{candidate.market_position}</p>
                        </div>
                      )}
                    </div>
                    {candidate.salary_intelligence && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/70">{candidate.salary_intelligence}</p>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Experience Analysis */}
                {(candidate.experience_analysis || candidate.experience_report) && (
                  <SectionCard title="Experience Analysis" icon={Briefcase}>
                    {candidate.experience_analysis && (
                      <div className="bg-white/5 rounded-lg p-4 mb-4">
                        <p className="text-sm text-white/70">{candidate.experience_analysis}</p>
                      </div>
                    )}
                    {candidate.experience_report && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-xs text-white/40 mb-2">Experience Report</p>
                        <p className="text-sm text-white/70 whitespace-pre-wrap">{candidate.experience_report}</p>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <SectionCard title="Skills" icon={Award}>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-white/5 border-white/10 text-white/80"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Recent M&A News */}
                {candidate.recent_ma_news && (
                  <SectionCard title="Recent M&A News" icon={FileText}>
                    <p className="text-sm text-white/70">{candidate.recent_ma_news}</p>
                  </SectionCard>
                )}
              </div>
            )}

            {activeTab === "company" && (
              <div className="space-y-4">
                {/* Company Overview */}
                <SectionCard title="Company Information" icon={Building2}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <InfoRow icon={Building2} label="Company Name" value={candidate.company_name} />
                    <InfoRow icon={MapPin} label="Company HQ" value={candidate.company_hq} />
                    <InfoRow icon={Globe} label="Domain" value={candidate.company_domain} link={candidate.company_domain ? `https://${candidate.company_domain}` : null} />
                    <InfoRow icon={Factory} label="Industry" value={candidate.industry} />
                    <InfoRow icon={Users} label="Company Size" value={candidate.company_size} />
                    <InfoRow icon={Building} label="Company Type" value={candidate.company_type} />
                    <InfoRow icon={Linkedin} label="Company LinkedIn" value="View Page" link={candidate.company_linkedin_url} />
                  </div>

                  {candidate.company_description && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-xs text-white/40 mb-2">Company Description</p>
                      <p className="text-sm text-white/70">{candidate.company_description}</p>
                    </div>
                  )}
                </SectionCard>

                {/* Company Metrics */}
                <SectionCard title="Company Metrics" icon={BarChart3}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {candidate.company_employee_count && (
                      <StatBox
                        label="Employee Count"
                        value={Number(candidate.company_employee_count).toLocaleString()}
                        icon={Users}
                      />
                    )}
                    {candidate.company_growth_percentage && (
                      <StatBox
                        label="Growth Rate"
                        value={`${candidate.company_growth_percentage}%`}
                        trend={candidate.company_growth_percentage}
                        icon={TrendingUp}
                      />
                    )}
                  </div>

                  {candidate.company_headcount_growth && (
                    <div className="mt-4 bg-white/5 rounded-lg p-4">
                      <p className="text-xs text-white/40 mb-2">Headcount Growth Details</p>
                      <p className="text-sm text-white/70">{candidate.company_headcount_growth}</p>
                    </div>
                  )}
                </SectionCard>

                {/* M&A News */}
                {candidate.recent_ma_news && (
                  <SectionCard title="Recent M&A Activity" icon={FileText}>
                    <p className="text-sm text-white/70">{candidate.recent_ma_news}</p>
                  </SectionCard>
                )}
              </div>
            )}

            {activeTab === "career" && (
              <div className="space-y-4">
                {/* Career Stats */}
                <SectionCard title="Career Metrics" icon={TrendingUp}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBox
                      label="Years at Company"
                      value={candidate.years_at_company || 0}
                      icon={Calendar}
                    />
                    <StatBox
                      label="Times Promoted"
                      value={candidate.times_promoted || 0}
                      icon={TrendingUp}
                    />
                    <StatBox
                      label="Avg Promotion Time"
                      value={candidate.avg_promotion_threshold ? `${candidate.avg_promotion_threshold}y` : "N/A"}
                      icon={Clock}
                    />
                    <StatBox
                      label="Company Changes"
                      value={candidate.times_company_hopped || 0}
                      icon={Briefcase}
                    />
                  </div>
                </SectionCard>

                {/* Career Changes */}
                {candidate.career_changes && (
                  <SectionCard title="Career Changes & Promotions" icon={Briefcase}>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{candidate.career_changes}</p>
                  </SectionCard>
                )}

                {/* Experience Analysis */}
                {candidate.experience_analysis && (
                  <SectionCard title="Experience Analysis" icon={UserCheck}>
                    <p className="text-sm text-white/70">{candidate.experience_analysis}</p>
                  </SectionCard>
                )}

                {/* Experience Report */}
                {candidate.experience_report && (
                  <SectionCard title="Experience Report" icon={FileText}>
                    <p className="text-sm text-white/70 whitespace-pre-wrap">{candidate.experience_report}</p>
                  </SectionCard>
                )}

                {/* Skills & Certifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidate.skills && candidate.skills.length > 0 && (
                    <SectionCard title="Skills" icon={Award}>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white/80"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {candidate.languages && candidate.languages.length > 0 && (
                    <SectionCard title="Languages" icon={Globe}>
                      <div className="flex flex-wrap gap-2">
                        {candidate.languages.map((lang, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white/80"
                          >
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>

                {/* Education */}
                {candidate.education && (
                  <SectionCard title="Education" icon={GraduationCap}>
                    {Array.isArray(candidate.education) ? (
                      <div className="space-y-4">
                        {candidate.education.map((edu, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-5 h-5 text-white/60" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">{edu.degree || edu.title}</h4>
                              <p className="text-sm text-white/60">{edu.school || edu.institution}</p>
                              {edu.year && <p className="text-xs text-white/40">{edu.year}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/70">{JSON.stringify(candidate.education)}</p>
                    )}
                  </SectionCard>
                )}
              </div>
            )}

            {activeTab === "intelligence" && (
              <div className="space-y-4">
                <GlassCard className="p-6">
                  <IntelligenceReport candidate={candidate} />

                  {/* Generate Button at bottom if no data */}
                  {!candidate.intelligence_factors?.length && !candidate.intelligence_timing?.length && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={generateIntelligenceReport}
                        disabled={generatingIntelligence}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                          generatingIntelligence
                            ? "bg-red-500/10 text-red-400/60 cursor-not-allowed"
                            : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                        }`}
                      >
                        {generatingIntelligence ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing Candidate...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate Intelligence Report
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </GlassCard>

                {/* Activity Timeline */}
                {historyItems.length > 0 && (
                  <SectionCard title="Activity History" icon={History}>
                    <div className="space-y-0">
                      {historyItems.map((item, idx) => (
                        <TimelineItem
                          key={idx}
                          item={item}
                          isLast={idx === historyItems.length - 1}
                        />
                      ))}
                    </div>
                  </SectionCard>
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
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                      <Send className="w-4 h-4" />
                      Start Outreach
                    </button>
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
