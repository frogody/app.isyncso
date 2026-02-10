import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { fullEnrichFromLinkedIn } from "@/lib/explorium-api";
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
  Euro,
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
  CheckCircle2,
  Percent,
  Coins,
  X,
  BadgeCheck,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getCrossCheckedTenure } from "@/utils/tenureCrossCheck";

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
const statCardColorMap = {
  red: { bg: "bg-red-500/10", text: "text-red-400" },
  zinc: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
};

const StatCard = ({ label, value, icon: Icon, color = "red", subtext }) => {
  const colors = statCardColorMap[color] || statCardColorMap.red;
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
      {subtext && <p className="text-xs text-white/30 mt-1">{subtext}</p>}
    </div>
  );
};

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
    medium: { bg: "bg-red-400/20", text: "text-red-300", label: "Medium Priority" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Low Priority" },
    response: { bg: "bg-red-400/20", text: "text-red-300", label: "Response Priority" },
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
    config = { bg: "bg-red-500/20", text: "text-red-400", icon: Smile, label: "Open to Move" };
  } else if (lowerLevel === "low") {
    // Low switching = satisfied/not looking
    config = { bg: "bg-zinc-500/20", text: "text-zinc-400", icon: Frown, label: "Not Looking" };
  } else {
    config = { bg: "bg-red-400/20", text: "text-red-300", icon: Meh, label: "Considering" };
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
    reply: { icon: MessageSquare, color: "text-red-300", bg: "bg-red-400/15" },
    note: { icon: FileText, color: "text-red-400", bg: "bg-red-500/15" },
    status: { icon: History, color: "text-zinc-400", bg: "bg-zinc-500/15" },
    import: { icon: FileDown, color: "text-red-300", bg: "bg-red-400/15" },
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
    pending: { color: "text-red-300", bg: "bg-red-400/15", label: "Pending" },
    approved_ready: { color: "text-red-400", bg: "bg-red-500/15", label: "Ready" },
    sent: { color: "text-red-400", bg: "bg-red-500/15", label: "Sent" },
    completed: { color: "text-red-500", bg: "bg-red-600/15", label: "Completed" },
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
  const [campaignMatches, setCampaignMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [generatingIntelligence, setGeneratingIntelligence] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "company" | "candidate" | ""
  const [enrichingContact, setEnrichingContact] = useState(false);

  // SMS Modal State
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingFromNumber, setSendingFromNumber] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(false);

  useEffect(() => {
    if (candidateId && user?.organization_id) {
      fetchCandidate();
      fetchOutreachTasks();
      fetchCampaignMatches();
    } else if (user && !user.organization_id) {
      setLoading(false);
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

  const fetchCampaignMatches = async () => {
    if (!user?.organization_id || !candidateId) return;
    try {
      // Fetch matches with campaign details
      const { data, error } = await supabase
        .from("candidate_campaign_matches")
        .select(`
          *,
          campaigns:campaign_id (
            id,
            name,
            description,
            status,
            campaign_type
          )
        `)
        .eq("candidate_id", candidateId)
        .eq("organization_id", user.organization_id)
        .order("match_score", { ascending: false });

      if (error) throw error;
      setCampaignMatches(data || []);
    } catch (err) {
      console.error("Error fetching campaign matches:", err);
    }
  };

  const SYNC_INTEL_CREDIT_COST = 10;

  const syncIntel = async () => {
    // Check if this candidate was from a nest purchase (free SYNC Intel)
    const isFromNestPurchase = candidate.source === 'nest_purchase';

    // For manual SYNC Intel, check if user has enough credits
    if (!isFromNestPurchase) {
      const currentCredits = user?.credits || 0;
      if (currentCredits < SYNC_INTEL_CREDIT_COST) {
        toast.error("Insufficient credits", {
          description: `SYNC Intel requires ${SYNC_INTEL_CREDIT_COST} credits. You have ${currentCredits} credits.`,
        });
        return;
      }
    }

    setGeneratingIntelligence(true);
    try {
      let companyIntel = candidate.company_intelligence;

      // Step 1: Sync company intelligence first (if company name exists)
      if (candidate.company_name) {
        setSyncStatus("company");
        const companyResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCompanyIntelligence`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              companyName: candidate.company_name,
              companyDomain: candidate.company_domain,
              entityType: "candidate",
              entityId: candidateId,
            }),
          }
        );
        const companyData = await companyResponse.json();
        if (companyData.intelligence) {
          companyIntel = companyData.intelligence;
          // Update local state with company data
          setCandidate(prev => ({ ...prev, company_intelligence: companyIntel }));
        }
      }

      // Step 2: Generate candidate intelligence with company data for correlations
      setSyncStatus("candidate");
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
            company_intelligence: companyIntel, // Pass company data for correlations
          }),
        }
      );

      if (response.ok) {
        // Deduct credits for manual SYNC Intel (not from nest purchase)
        if (!isFromNestPurchase) {
          const { error: creditError } = await supabase
            .from('users')
            .update({ credits: (user?.credits || 0) - SYNC_INTEL_CREDIT_COST })
            .eq('id', user.id);

          if (creditError) {
            console.error('Failed to deduct credits:', creditError);
          } else {
            // Update local user credits
            toast.success("Intelligence synced successfully", {
              description: `${SYNC_INTEL_CREDIT_COST} credits deducted`,
            });
          }
        } else {
          toast.success("Intelligence synced successfully");
        }

        await fetchCandidate();
        setActiveTab("intelligence");
      } else {
        toast.error("Failed to sync intelligence");
      }
    } catch (err) {
      console.error("Error syncing intelligence:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setGeneratingIntelligence(false);
      setSyncStatus("");
    }
  };

  // Enrich contact info via Explorium API - saves ALL LinkedIn data
  const enrichContact = async () => {
    if (!candidate.linkedin_profile) {
      toast.error("No LinkedIn URL available", {
        description: "Add a LinkedIn profile URL to enable contact enrichment",
      });
      return;
    }

    setEnrichingContact(true);
    try {
      const enriched = await fullEnrichFromLinkedIn(candidate.linkedin_profile);

      // Build the update object with ALL LinkedIn enrichment data
      const updateData = {
        // Contact info
        verified_email: enriched.email || candidate.verified_email,
        verified_phone: enriched.phone || candidate.verified_phone,
        verified_mobile: enriched.mobile_phone || candidate.verified_mobile,
        personal_email: enriched.personal_email || candidate.personal_email,
        mobile_phone: enriched.mobile_phone || candidate.mobile_phone,
        work_phone: enriched.work_phone || candidate.work_phone,
        email_status: enriched.email_status || candidate.email_status,

        // Enrichment tracking
        explorium_prospect_id: enriched.explorium_prospect_id || candidate.explorium_prospect_id,
        explorium_business_id: enriched.explorium_business_id || candidate.explorium_business_id,
        enriched_at: new Date().toISOString(),
        enrichment_source: "explorium",

        // Professional info
        job_title: candidate.job_title || enriched.job_title,
        company_name: candidate.company_name || enriched.company,
        person_home_location: candidate.person_home_location ||
          [enriched.location_city, enriched.location_country].filter(Boolean).join(", "),
        job_department: enriched.job_department || candidate.job_department,
        job_seniority_level: enriched.job_seniority_level || candidate.job_seniority_level,

        // Location details
        location_city: enriched.location_city || candidate.location_city,
        location_region: enriched.location_region || candidate.location_region,
        location_country: enriched.location_country || candidate.location_country,

        // Demographics
        age_group: enriched.age_group || candidate.age_group,
        gender: enriched.gender || candidate.gender,

        // Company info
        company_domain: candidate.company_domain || enriched.company_domain,
        company_size: candidate.company_size || enriched.company_size,
        company_employee_count: candidate.company_employee_count || enriched.company_employee_count,
        industry: candidate.industry || enriched.company_industry,

        // Skills, Education, Work History - CRITICAL for Skills & Career tab
        skills: enriched.skills?.length ? enriched.skills : candidate.skills,
        work_history: enriched.work_history?.length ? enriched.work_history : candidate.work_history,
        education: enriched.education?.length ? enriched.education : candidate.education,
        certifications: enriched.certifications?.length ? enriched.certifications : candidate.certifications,
        interests: enriched.interests?.length ? enriched.interests : candidate.interests,

        // Also store as inferred_skills for intelligence
        inferred_skills: enriched.skills?.length ? enriched.skills : candidate.inferred_skills,
      };

      const { error } = await supabase
        .from("candidates")
        .update(updateData)
        .eq("id", candidateId);

      if (error) throw error;

      // Count what we enriched
      const enrichedItems = [];
      if (enriched.email) enrichedItems.push("email");
      if (enriched.phone || enriched.mobile_phone) enrichedItems.push("phone");
      if (enriched.skills?.length) enrichedItems.push(`${enriched.skills.length} skills`);
      if (enriched.work_history?.length) enrichedItems.push(`${enriched.work_history.length} jobs`);
      if (enriched.education?.length) enrichedItems.push(`${enriched.education.length} edu`);
      if (enriched.certifications?.length) enrichedItems.push(`${enriched.certifications.length} certs`);

      await fetchCandidate();
      toast.success("Contact enriched!", {
        description: enrichedItems.length > 0
          ? `Found: ${enrichedItems.join(", ")}`
          : "Profile data updated",
      });
    } catch (err) {
      console.error("Enrichment error:", err);
      toast.error("Enrichment failed", {
        description: err.message || "Could not enrich contact information",
      });
    } finally {
      setEnrichingContact(false);
    }
  };

  // Fetch available phone numbers for SMS
  const fetchAvailableNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from("twilio_phone_numbers")
        .select("*")
        .eq("organization_id", user.organization_id)
        .eq("status", "active")
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      setAvailableNumbers(data || []);
      if (data?.length > 0 && !sendingFromNumber) {
        setSendingFromNumber(data[0].phone_number);
      }
    } catch (err) {
      console.error("Error fetching phone numbers:", err);
    }
  };

  // Generate personalized SMS using AI
  const generatePersonalizedSMS = async () => {
    if (!candidate) return;

    setGeneratingMessage(true);
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
            // Basic candidate info
            candidate_name: `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim(),
            candidate_title: candidate.job_title,
            candidate_company: candidate.company_name,
            candidate_skills: candidate.skills || [],

            // Outreach settings
            campaign_type: "sms",
            stage: "initial",

            // === CANDIDATE INTELLIGENCE (The Gold Mine!) ===
            intelligence_score: candidate.intelligence_score,
            recommended_approach: candidate.recommended_approach,
            outreach_hooks: candidate.outreach_hooks,
            best_outreach_angle: candidate.best_outreach_angle,
            timing_signals: candidate.timing_signals,
            company_pain_points: candidate.company_pain_points,
            key_insights: candidate.key_insights,
            lateral_opportunities: candidate.lateral_opportunities,
            intelligence_factors: candidate.intelligence_factors,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSmsMessage(data.content || data.message || "");
        toast.success("Message generated!", {
          description: data.personalization_score
            ? `Personalization: ${data.personalization_score}%`
            : undefined,
        });
      } else {
        toast.error("Failed to generate message");
      }
    } catch (err) {
      console.error("Error generating SMS:", err);
      toast.error("Failed to generate message");
    } finally {
      setGeneratingMessage(false);
    }
  };

  // Send SMS to candidate
  const sendSMS = async () => {
    const recipientPhone = candidate.verified_phone || candidate.phone;
    if (!recipientPhone) {
      toast.error("No phone number available", {
        description: "Enrich this candidate's contact info first",
      });
      return;
    }

    if (!sendingFromNumber) {
      toast.error("No sending number selected", {
        description: "Purchase a phone number in SMS Outreach settings",
      });
      return;
    }

    if (!smsMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setSendingSMS(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: "send_sms",
            from_number: sendingFromNumber,
            to_number: recipientPhone,
            message: smsMessage,
            organization_id: user.organization_id,
            metadata: {
              candidate_id: candidate.id,
              candidate_name: `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim(),
              source: "candidate_profile",
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("SMS sent successfully!", {
          description: `Message delivered to ${recipientPhone}`,
        });
        setShowSMSModal(false);
        setSmsMessage("");
        // Refresh outreach tasks
        fetchOutreachTasks();
      } else {
        toast.error("Failed to send SMS", {
          description: result.error || "Please try again",
        });
      }
    } catch (err) {
      console.error("Error sending SMS:", err);
      toast.error("Network error", {
        description: "Failed to send SMS. Please try again.",
      });
    } finally {
      setSendingSMS(false);
    }
  };

  // Fetch phone numbers when SMS modal opens
  useEffect(() => {
    if (showSMSModal && user?.organization_id) {
      fetchAvailableNumbers();
    }
  }, [showSMSModal, user?.organization_id]);

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
    { id: "matches", label: "Matches", count: campaignMatches.length },
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
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] rounded-xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Avatar & Basic Info */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-red-500/20">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold text-white">{fullName}</h1>
                  <p className="text-white/60 text-sm mb-1">{candidate.job_title || "—"}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                    {candidate.company_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {candidate.company_name}
                      </span>
                    )}
                    {candidate.person_home_location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {candidate.person_home_location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Intelligence Score & Actions */}
              <div className="flex items-center gap-4">
                <IntelligenceGauge score={candidate.intelligence_score || 0} size="md" />
                <div className="flex flex-col gap-1.5">
                  <Button
                    onClick={syncIntel}
                    disabled={generatingIntelligence}
                    size="sm"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  >
                    {generatingIntelligence ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1.5" />
                    )}
                    {syncStatus === "company" ? "SYNCING..." :
                     syncStatus === "candidate" ? "ANALYZING..." :
                     "SYNC INTEL"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => setShowSMSModal(true)}
                  >
                    <MessageSquare className="w-3 h-3 mr-1.5" />
                    Send SMS
                  </Button>
                  {candidate.linkedin_profile && !candidate.enriched_at ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={enrichContact}
                      disabled={enrichingContact}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {enrichingContact ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                      ) : (
                        <Zap className="w-3 h-3 mr-1.5" />
                      )}
                      {enrichingContact ? "Enriching..." : "Enrich"}
                    </Button>
                  ) : candidate.enriched_at ? (
                    <div className="flex items-center gap-1 text-[10px] text-red-400 px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Enriched
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Urgency</p>
                <UrgencyBadge level={candidate.recruitment_urgency} size="xs" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Satisfaction</p>
                <SatisfactionBadge level={candidate.job_satisfaction} size="xs" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Salary</p>
                <p className="text-sm font-semibold text-red-400">
                  {candidate.salary_range ? `€${Number(candidate.salary_range).toLocaleString()}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Tenure</p>
                <p className="text-sm font-semibold text-white">{getCrossCheckedTenure(candidate) || 0}y</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Promos</p>
                <p className="text-sm font-semibold text-white">{candidate.times_promoted || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Job Changes</p>
                <p className="text-sm font-semibold text-white">{candidate.times_company_hopped || 0}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                    activeTab === tab.id
                      ? "bg-white/20"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {tab.count}
                  </span>
                )}
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
                  <StatCard label="Years at Company" value={getCrossCheckedTenure(candidate) || 0} icon={Calendar} color="red" />
                  <StatCard label="Promotions" value={candidate.times_promoted || 0} icon={TrendingUp} color="red" />
                  <StatCard label="Avg Promo Time" value={candidate.avg_promotion_threshold ? `${candidate.avg_promotion_threshold}y` : "—"} icon={Clock} color="red" />
                  <StatCard label="Company Changes" value={candidate.times_company_hopped || 0} icon={Briefcase} color="red" />
                </div>

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-red-400" />
                      Skills ({candidate.skills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, idx) => {
                        // Handle both string and object formats
                        const skillName = typeof skill === 'object' ? (skill?.name || skill?.skill || JSON.stringify(skill)) : String(skill);
                        return (
                          <Badge key={idx} className="bg-red-500/10 border-red-500/20 text-red-400 px-3 py-1.5">
                            {skillName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Work History */}
                {candidate.work_history && candidate.work_history.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-red-400" />
                      Work History ({candidate.work_history.length})
                    </h3>
                    <div className="space-y-3">
                      {candidate.work_history.map((job, idx) => {
                        // Handle nested object structures from Explorium API
                        const jobTitle = typeof job.title === 'object' ? job.title?.name : (job.title || job.job_title);
                        const companyName = typeof job.company === 'object' ? job.company?.name : (job.company || job.company_name);
                        const description = job.summary || job.description;

                        return (
                          <div key={idx} className="flex gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                              <Briefcase className="w-5 h-5 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white">{jobTitle || 'Unknown Position'}</p>
                              <p className="text-sm text-white/60">{companyName || 'Unknown Company'}</p>
                              {(job.start_date || job.end_date) && (
                                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {job.start_date} - {job.end_date || 'Present'}
                                </p>
                              )}
                              {description && (
                                <p className="text-sm text-white/50 mt-2 line-clamp-2">{description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Education */}
                {candidate.education && candidate.education.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-purple-400" />
                      Education ({candidate.education.length})
                    </h3>
                    <div className="space-y-3">
                      {candidate.education.map((edu, idx) => {
                        // Handle nested object structures from Explorium API
                        const schoolName = typeof edu.school === 'object' ? edu.school?.name : (edu.school || edu.institution);
                        const degreeName = Array.isArray(edu.degrees) ? edu.degrees.join(', ') : (edu.degree || edu.field_of_study || edu.field);
                        const majorName = Array.isArray(edu.majors) ? edu.majors.join(', ') : edu.major;
                        const displayDegree = degreeName || majorName || 'Degree';

                        return (
                          <div key={idx} className="flex gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                              <GraduationCap className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white">{displayDegree}</p>
                              <p className="text-sm text-white/60">{schoolName || 'Unknown Institution'}</p>
                              {(edu.year || edu.end_date || edu.graduation_year) && (
                                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {edu.year || edu.end_date || edu.graduation_year}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {candidate.certifications && candidate.certifications.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <BadgeCheck className="w-5 h-5 text-green-400" />
                      Certifications ({candidate.certifications.length})
                    </h3>
                    <div className="space-y-2">
                      {candidate.certifications.map((cert, idx) => {
                        // Handle both string and object formats
                        const certName = typeof cert === 'object' ? (cert?.name || cert?.title || JSON.stringify(cert)) : String(cert);
                        const certIssuer = typeof cert === 'object' ? cert?.issuer : null;
                        const certDate = typeof cert === 'object' ? (cert?.date || cert?.issued_date) : null;

                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                            <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{certName}</p>
                              {certIssuer && <p className="text-xs text-white/50">{certIssuer}</p>}
                              {certDate && <p className="text-xs text-white/40">{certDate}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {candidate.interests && candidate.interests.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-400" />
                      Interests ({candidate.interests.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.interests.map((interest, idx) => {
                        // Handle both string and object formats
                        const interestName = typeof interest === 'object' ? (interest?.name || interest?.interest || JSON.stringify(interest)) : String(interest);
                        return (
                          <Badge key={idx} className="bg-pink-500/10 border-pink-500/20 text-pink-400 px-3 py-1.5">
                            {interestName}
                          </Badge>
                        );
                      })}
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
                  className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent rounded-xl border border-red-500/20 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-red-500/20">
                      <FileText className="w-4 h-4 text-red-400" />
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
              onGenerate={syncIntel}
              isGenerating={generatingIntelligence}
              syncStatus={syncStatus}
            />
          )}

          {/* Matches Tab */}
          {activeTab === "matches" && (
            <div>
              {campaignMatches.length > 0 ? (
                <div className="space-y-4">
                  {/* Match Summary */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Campaign Matches</h3>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {campaignMatches.length} {campaignMatches.length === 1 ? "match" : "matches"}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/50">
                      This candidate has been matched to the following campaigns through the auto-match process.
                      Higher scores indicate better fit for the role requirements.
                    </p>
                  </div>

                  {/* Match Cards - Ranked by Score */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {campaignMatches.map((match, index) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors"
                      >
                        {/* Rank Badge & Score */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                              index === 0
                                ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                                : index === 1
                                ? "bg-gradient-to-br from-red-400 to-red-500 text-white"
                                : index === 2
                                ? "bg-gradient-to-br from-red-600 to-red-700 text-white"
                                : "bg-white/10 text-white/60"
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <Link
                                to={`${createPageUrl("TalentCampaignDetail")}?id=${match.campaign_id}`}
                                className="text-white font-semibold hover:text-red-400 transition-colors"
                              >
                                {match.campaigns?.name || "Unknown Campaign"}
                              </Link>
                              <p className="text-sm text-white/50">
                                {match.role_title || "General Match"}
                                {match.project_name && ` • ${match.project_name}`}
                              </p>
                            </div>
                          </div>

                          {/* Match Score Circle */}
                          <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="6"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke={match.match_score >= 70 ? "#22c55e" : match.match_score >= 50 ? "#eab308" : "#ef4444"}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={`${(match.match_score / 100) * 176} 176`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-white">{Math.round(match.match_score)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        {match.match_reasons?.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <p className="text-xs text-white/40 uppercase tracking-wide">Match Reasons</p>
                            <div className="flex flex-wrap gap-2">
                              {match.match_reasons.slice(0, 4).map((reason, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] text-xs text-white/70"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-red-400" />
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(match.matched_at).toLocaleDateString()}
                            </span>
                            {match.campaigns?.status && (
                              <Badge
                                className={`text-xs ${
                                  match.campaigns.status === "active"
                                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                    : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                                }`}
                              >
                                {match.campaigns.status}
                              </Badge>
                            )}
                          </div>
                          {match.recommended_approach && (
                            <span className="text-xs text-white/50">
                              {match.recommended_approach === "immediate" && "⚡ Immediate"}
                              {match.recommended_approach === "targeted" && "🎯 Targeted"}
                              {match.recommended_approach === "nurture" && "🌱 Nurture"}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                    <Target className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Matches Yet</h3>
                  <p className="text-white/50 mb-6 max-w-md mx-auto">
                    This candidate hasn't been matched to any campaigns yet. Run auto-match on a campaign to see how well they fit.
                  </p>
                  <Link to={createPageUrl("TalentCampaigns")}>
                    <Button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-8">
                      <Sparkles className="w-4 h-4 mr-2" />
                      View Campaigns
                    </Button>
                  </Link>
                </div>
              )}
            </div>
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

        {/* SMS Modal */}
        <Dialog open={showSMSModal} onOpenChange={setShowSMSModal}>
          <DialogContent className="bg-zinc-900 border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-400" />
                Send SMS to {fullName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Recipient Info */}
              <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{fullName}</p>
                    <p className="text-xs text-white/50">
                      {candidate.verified_phone || candidate.phone || "No phone number"}
                    </p>
                  </div>
                </div>
              </div>

              {/* From Number Selection */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5">From Number</label>
                {availableNumbers.length > 0 ? (
                  <Select value={sendingFromNumber} onValueChange={setSendingFromNumber}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                      <SelectValue placeholder="Select a number" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {availableNumbers.map((num) => (
                        <SelectItem
                          key={num.id}
                          value={num.phone_number}
                          className="text-white hover:bg-white/[0.05]"
                        >
                          {num.phone_number} {num.friendly_name && `(${num.friendly_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06] text-center">
                    <Phone className="w-5 h-5 text-white/20 mx-auto mb-1" />
                    <p className="text-xs text-white/50">No phone numbers available</p>
                    <Link
                      to={createPageUrl("TalentSMSOutreach")}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Purchase a number
                    </Link>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/50">Message</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generatePersonalizedSMS}
                    disabled={generatingMessage}
                    className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2"
                  >
                    {generatingMessage ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    {generatingMessage ? "Generating..." : "AI Generate"}
                  </Button>
                </div>
                <Textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message or click AI Generate for a personalized message..."
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 min-h-[120px] resize-none"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-white/30">
                    {smsMessage.length} characters
                    {smsMessage.length > 160 && (
                      <span className="text-yellow-400/70 ml-1">
                        ({Math.ceil(smsMessage.length / 160)} SMS segments)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* No Phone Warning */}
              {!candidate.verified_phone && !candidate.phone && (
                <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">No phone number available</span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Click "Enrich" on the profile to find this candidate's phone number.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSMSModal(false)}
                  className="flex-1 border-white/10 text-white/70 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendSMS}
                  disabled={sendingSMS || !smsMessage.trim() || !sendingFromNumber || (!candidate.verified_phone && !candidate.phone)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  {sendingSMS ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {sendingSMS ? "Sending..." : "Send SMS"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
