import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Brain,
  Target,
  History,
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  MapPin,
  Building2,
  Calendar,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Award,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  Star,
  Code2,
  Layers,
  Zap,
  ArrowUpRight,
  Network,
  Newspaper,
  Globe,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  Settings,
  BadgeCheck,
  LayoutDashboard,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "./IntelligenceGauge";
import ProfileSummaryCard from "./ProfileSummaryCard";
import SummaryTabContent from "./SummaryTabContent";
import { IntelligenceReport } from "@/components/talent/IntelligenceReport";
import { CompanyIntelligenceReport } from "@/components/shared/CompanyIntelligenceReport";
import { fullEnrichFromLinkedIn } from "@/lib/explorium-api";
import { usePanelPreferences } from "@/hooks/usePanelPreferences";
import PanelCustomizationModal from "./PanelCustomizationModal";
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
import { createPageUrl } from "@/utils";

// Copy button with feedback
const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-zinc-700 rounded transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
      )}
    </button>
  );
};

// Section component
const Section = ({ title, children, className = "" }) => (
  <div className={className}>
    <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
      {title}
    </h4>
    {children}
  </div>
);

// Expandable Text component
const ExpandableText = ({ text, maxLength = 200 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-zinc-500">—</span>;

  const shouldTruncate = text.length > maxLength;
  const displayText = expanded || !shouldTruncate ? text : `${text.substring(0, maxLength)}...`;

  return (
    <div>
      <p className="text-sm text-zinc-300 leading-relaxed">{displayText}</p>
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

// Urgency Badge
const UrgencyBadge = ({ level }) => {
  const config = {
    high: { bg: "bg-red-500/20", text: "text-red-400", label: "High Priority" },
    medium: { bg: "bg-red-400/20", text: "text-red-300", label: "Medium Priority" },
    low: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Low Priority" },
  };
  const c = config[level?.toLowerCase()] || config.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
};

// Satisfaction Badge - parses "Switching Likelihood: High/Medium/Low" from analysis text
const SatisfactionBadge = ({ level }) => {
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
    config = { bg: "bg-red-500/20", text: "text-red-400", icon: Smile, label: "Open to Move" };
  } else if (lowerLevel === "low") {
    config = { bg: "bg-zinc-500/20", text: "text-zinc-400", icon: Frown, label: "Not Looking" };
  } else {
    config = { bg: "bg-red-400/20", text: "text-red-300", icon: Meh, label: "Considering" };
  }
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Analysis Card
const AnalysisCard = ({ icon: Icon, title, content, maxLength = 300 }) => {
  if (!content) return null;
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Icon className="w-4 h-4 text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <ExpandableText text={content} maxLength={maxLength} />
    </div>
  );
};

// Info row component
const InfoRow = ({ icon: Icon, label, value, copyable, link }) => {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-sm text-white">{value}</span>
        )}
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  );
};

// Experience item component
const ExperienceItem = ({ title, company, location, start_date, end_date, description }) => (
  <div className="py-3 border-b border-zinc-800 last:border-0">
    <div className="flex items-start justify-between">
      <div>
        <div className="font-medium text-white">{title}</div>
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          <Building2 className="w-3 h-3" />
          {company}
          {location && (
            <>
              <span className="text-zinc-600">•</span>
              <MapPin className="w-3 h-3" />
              {location}
            </>
          )}
        </div>
      </div>
      <div className="text-xs text-zinc-500">
        {start_date} - {end_date || "Present"}
      </div>
    </div>
    {description && (
      <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{description}</p>
    )}
  </div>
);

// Education item component
const EducationItem = ({ degree, field, school, year }) => (
  <div className="py-2 border-b border-zinc-800 last:border-0">
    <div className="flex items-start justify-between">
      <div>
        <div className="font-medium text-white">{degree} {field && `in ${field}`}</div>
        <div className="text-sm text-zinc-400 flex items-center gap-1">
          <GraduationCap className="w-3 h-3" />
          {school}
        </div>
      </div>
      {year && <div className="text-xs text-zinc-500">{year}</div>}
    </div>
  </div>
);

// Score bar component
const ScoreBar = ({ label, score, color = "red" }) => {
  const colorClasses = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{score || 0}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colorClasses[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${score || 0}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

// Reasoning block component
const ReasoningBlock = ({ title, items, content, color = "cyan" }) => {
  const colorStyles = {
    green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
    yellow: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400" },
  };

  const styles = colorStyles[color];

  return (
    <div className={`p-3 rounded-lg ${styles.bg} border ${styles.border}`}>
      <div className={`text-xs font-medium ${styles.text} mb-2`}>{title}</div>
      {items ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-1 flex-shrink-0 text-zinc-500" />
              {item}
            </li>
          ))}
        </ul>
      ) : content ? (
        <p className="text-sm text-zinc-300">{content}</p>
      ) : null}
    </div>
  );
};

// Quick Stats component for header
const QuickStats = ({ candidate }) => {
  // Use database fields if available, otherwise calculate from experience
  const calculateYearsAtCompany = () => {
    // First try to use the database field
    if (candidate.years_at_company != null) {
      return Math.round(candidate.years_at_company);
    }
    // Fallback to calculation from experience
    if (!candidate.experience || candidate.experience.length === 0) return null;
    const currentJob = candidate.experience.find(exp => !exp.end_date || exp.end_date === 'Present');
    if (!currentJob || !currentJob.start_date) return null;

    const startYear = parseInt(currentJob.start_date.match(/\d{4}/)?.[0]);
    if (!startYear) return null;
    const years = new Date().getFullYear() - startYear;
    return years;
  };

  // Calculate times promoted (count title changes at same company)
  const calculatePromotions = () => {
    if (!candidate.experience || candidate.experience.length < 2) return 0;
    let promotions = 0;
    const companiesWithMultipleRoles = {};

    candidate.experience.forEach(exp => {
      const company = exp.company?.toLowerCase();
      if (company) {
        if (!companiesWithMultipleRoles[company]) {
          companiesWithMultipleRoles[company] = [];
        }
        companiesWithMultipleRoles[company].push(exp.title);
      }
    });

    Object.values(companiesWithMultipleRoles).forEach(titles => {
      if (titles.length > 1) {
        promotions += titles.length - 1;
      }
    });

    return promotions;
  };

  // Use database field for company changes if available
  const calculateCompanyChanges = () => {
    // First try to use the database field
    if (candidate.times_company_hopped != null) {
      return candidate.times_company_hopped;
    }
    // Fallback to calculation from experience
    if (!candidate.experience || candidate.experience.length === 0) return 0;
    const uniqueCompanies = new Set(
      candidate.experience
        .map(exp => exp.company?.toLowerCase())
        .filter(Boolean)
    );
    return Math.max(0, uniqueCompanies.size - 1);
  };

  const yearsAtCompany = calculateYearsAtCompany();
  const timesPromoted = calculatePromotions();
  const companyChanges = calculateCompanyChanges();

  if (yearsAtCompany === null && timesPromoted === 0 && companyChanges === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 mt-3 text-xs">
      {yearsAtCompany !== null && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-lg">
          <Calendar className="w-3 h-3 text-cyan-400" />
          <span className="text-zinc-300">{yearsAtCompany}y at company</span>
        </div>
      )}
      {timesPromoted > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-lg">
          <TrendingUp className="w-3 h-3 text-green-400" />
          <span className="text-zinc-300">{timesPromoted}x promoted</span>
        </div>
      )}
      {companyChanges > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-lg">
          <ArrowUpRight className="w-3 h-3 text-amber-400" />
          <span className="text-zinc-300">{companyChanges} company changes</span>
        </div>
      )}
    </div>
  );
};

// Company Tab
const CompanyTab = ({ candidate, isSectionEnabled = () => true }) => {
  const companyIntel = candidate.company_intelligence || {};
  const hasCompanyData = companyIntel && Object.keys(companyIntel).length > 0;

  if (!hasCompanyData && !candidate.current_company) {
    return (
      <div className="text-center py-8">
        <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No company data available</p>
        <p className="text-sm text-zinc-500 mt-1">
          Company intelligence will appear here when available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Basic Info Bar */}
      {isSectionEnabled('company', 'company_info') && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {candidate.current_company?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <div className="text-lg font-medium text-white">{candidate.current_company || "Unknown Company"}</div>
            <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
              {companyIntel.industry && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {companyIntel.industry}
                </span>
              )}
              {companyIntel.employee_count && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {companyIntel.employee_count.toLocaleString()} employees
                </span>
              )}
              {companyIntel.headquarters && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {companyIntel.headquarters}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Technology Stack */}
      {isSectionEnabled('company', 'tech_stack') && companyIntel.tech_stack && companyIntel.tech_stack.length > 0 && (
        <Section title="Technology Stack">
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30">
            <div className="flex flex-wrap gap-2">
              {companyIntel.tech_stack.map((tech, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs border border-blue-500/20 flex items-center gap-1"
                >
                  <Code2 className="w-3 h-3" />
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Employee Ratings */}
      {isSectionEnabled('company', 'employee_ratings') && companyIntel.employee_ratings && (
        <Section title="Employee Ratings">
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30 space-y-3">
            {companyIntel.employee_ratings.overall && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Overall Rating</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(companyIntel.employee_ratings.overall)
                            ? "text-amber-400 fill-amber-400"
                            : "text-zinc-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-white font-medium">
                    {companyIntel.employee_ratings.overall.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
            {companyIntel.employee_ratings.culture && (
              <ScoreBar label="Culture & Values" score={companyIntel.employee_ratings.culture * 20} color="cyan" />
            )}
            {companyIntel.employee_ratings.work_life_balance && (
              <ScoreBar label="Work-Life Balance" score={companyIntel.employee_ratings.work_life_balance * 20} color="green" />
            )}
            {companyIntel.employee_ratings.compensation && (
              <ScoreBar label="Compensation" score={companyIntel.employee_ratings.compensation * 20} color="amber" />
            )}
            {companyIntel.employee_ratings.career_growth && (
              <ScoreBar label="Career Growth" score={companyIntel.employee_ratings.career_growth * 20} color="purple" />
            )}
          </div>
        </Section>
      )}

      {/* Funding Information */}
      {isSectionEnabled('company', 'funding_info') && companyIntel.funding && (
        <Section title="Funding Information">
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30 space-y-3">
            {companyIntel.funding.total_raised && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Total Raised
                </span>
                <span className="text-white font-medium">{companyIntel.funding.total_raised}</span>
              </div>
            )}
            {companyIntel.funding.last_round && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Last Round</span>
                <span className="text-white">{companyIntel.funding.last_round}</span>
              </div>
            )}
            {companyIntel.funding.last_round_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Round Date</span>
                <span className="text-white">{companyIntel.funding.last_round_date}</span>
              </div>
            )}
            {companyIntel.funding.investors && companyIntel.funding.investors.length > 0 && (
              <div className="pt-2 border-t border-zinc-700/50">
                <div className="text-xs text-zinc-500 mb-2">Key Investors</div>
                <div className="flex flex-wrap gap-1.5">
                  {companyIntel.funding.investors.map((investor, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20"
                    >
                      {investor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* M&A News */}
      {isSectionEnabled('company', 'ma_news') && companyIntel.ma_news && companyIntel.ma_news.length > 0 && (
        <Section title="M&A News">
          <div className="space-y-2">
            {companyIntel.ma_news.map((news, i) => (
              <div
                key={i}
                className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <Newspaper className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm text-white font-medium">{news.headline}</div>
                    {news.date && (
                      <div className="text-xs text-zinc-500 mt-1">{news.date}</div>
                    )}
                    {news.summary && (
                      <p className="text-xs text-zinc-400 mt-1">{news.summary}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Company Profile Summary */}
      {isSectionEnabled('company', 'company_profile') && companyIntel.description && (
        <Section title="Company Profile">
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30">
            <p className="text-sm text-zinc-300 leading-relaxed">{companyIntel.description}</p>
          </div>
        </Section>
      )}

      {/* Growth Signals */}
      {isSectionEnabled('company', 'growth_signals') && companyIntel.growth_signals && companyIntel.growth_signals.length > 0 && (
        <Section title="Growth Signals">
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
            <ul className="space-y-2">
              {companyIntel.growth_signals.map((signal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );
};

// Activity item component
const ActivityItem = ({ type, campaign_name, timestamp, details, message_preview }) => {
  const typeConfig = {
    matched: { icon: Target, label: "Matched to campaign", color: "text-blue-400" },
    outreach_generated: { icon: Sparkles, label: "Outreach generated", color: "text-purple-400" },
    outreach_sent: { icon: Send, label: "Outreach sent", color: "text-cyan-400" },
    outreach_opened: { icon: Eye, label: "Email opened", color: "text-amber-400" },
    response_received: { icon: MessageSquare, label: "Response received", color: "text-green-400" },
    interview_scheduled: { icon: Calendar, label: "Interview scheduled", color: "text-red-400" },
  };

  const config = typeConfig[type] || { icon: History, label: type, color: "text-zinc-400" };
  const Icon = config.icon;

  const formatTime = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative pl-10 pb-4">
      <div className="absolute left-2 w-5 h-5 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center z-10">
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30">
        <div className="flex justify-between items-start">
          <div className={`font-medium text-sm ${config.color}`}>{config.label}</div>
          <div className="text-xs text-zinc-500">{formatTime(timestamp)}</div>
        </div>
        {campaign_name && (
          <div className="text-sm text-zinc-400 mt-1">Campaign: {campaign_name}</div>
        )}
        {message_preview && (
          <div className="text-xs text-zinc-500 mt-2 italic truncate">"{message_preview}"</div>
        )}
        {details && <div className="text-xs text-zinc-500 mt-2">{details}</div>}
      </div>
    </div>
  );
};

// Profile Tab
const ProfileTab = ({ candidate, isSectionEnabled = () => true }) => (
  <div className="space-y-6">
    {/* Analysis Cards Section */}
    {isSectionEnabled('profile', 'analysis_cards') && (
      <div className="space-y-4">
        <AnalysisCard
          icon={Target}
          title="Recruitment Assessment"
          content={candidate.outreach_urgency_reasoning}
          maxLength={300}
        />
        <AnalysisCard
          icon={Briefcase}
          title="Job Satisfaction Analysis"
          content={candidate.job_satisfaction_analysis}
          maxLength={300}
        />
        <AnalysisCard
          icon={Award}
          title="Experience Analysis"
          content={candidate.experience_analysis}
          maxLength={300}
        />
      </div>
    )}

    {/* Contact Information */}
    {isSectionEnabled('profile', 'contact_info') && (
      <Section title="Contact Information">
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
          <InfoRow icon={Mail} label="Email" value={candidate.verified_email || candidate.email} copyable />
          {candidate.verified_email && candidate.email && candidate.verified_email !== candidate.email && (
            <InfoRow icon={Mail} label="Personal Email" value={candidate.email} copyable />
          )}
          <InfoRow icon={Phone} label="Phone" value={candidate.verified_phone || candidate.phone} copyable />
          {candidate.verified_mobile && (
            <InfoRow icon={Phone} label="Mobile" value={candidate.verified_mobile} copyable />
          )}
          <InfoRow icon={Linkedin} label="LinkedIn" value={candidate.linkedin_url} link />
          {candidate.website && (
            <InfoRow icon={ExternalLink} label="Website" value={candidate.website} link />
          )}

          {/* Enrichment status indicator */}
          {candidate.enriched_at && (
            <div className="mt-3 pt-3 border-t border-zinc-700/50">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified via {candidate.enrichment_source || "Explorium"}</span>
                <span className="text-zinc-500">• {new Date(candidate.enriched_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </Section>
    )}

    {/* Professional Summary */}
    {isSectionEnabled('profile', 'professional_summary') && candidate.summary && (
      <Section title="Professional Summary">
        <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30">
          <p className="text-zinc-300 text-sm leading-relaxed">{candidate.summary}</p>
        </div>
      </Section>
    )}

    {/* Skills */}
    {isSectionEnabled('profile', 'skills') && candidate.skills && candidate.skills.length > 0 && (
      <Section title={`Skills (${candidate.skills.length})`}>
        <div className="flex flex-wrap gap-2">
          {candidate.skills.map((skill, i) => {
            // Handle both string and object formats
            const skillName = typeof skill === 'object' ? (skill?.name || skill?.skill || JSON.stringify(skill)) : String(skill);
            return (
              <span
                key={i}
                className="px-2.5 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/20"
              >
                {skillName}
              </span>
            );
          })}
        </div>
      </Section>
    )}

    {/* Work History (from LinkedIn enrichment) */}
    {isSectionEnabled('profile', 'work_history') && candidate.work_history && candidate.work_history.length > 0 && (
      <Section title={`Work History (${candidate.work_history.length})`}>
        <div className="space-y-3">
          {candidate.work_history.map((job, i) => {
            // Handle nested object structures from Explorium API
            const jobTitle = typeof job.title === 'object' ? job.title?.name : (job.title || job.job_title);
            const companyName = typeof job.company === 'object' ? job.company?.name : (job.company || job.company_name);
            const description = job.summary || job.description;

            return (
              <div
                key={i}
                className="flex gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/30 flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{jobTitle || 'Unknown Position'}</p>
                  <p className="text-sm text-zinc-400">{companyName || 'Unknown Company'}</p>
                  {(job.start_date || job.end_date) && (
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {job.start_date} - {job.end_date || 'Present'}
                    </p>
                  )}
                  {description && (
                    <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    )}

    {/* Education (enhanced with LinkedIn enrichment data) */}
    {isSectionEnabled('profile', 'education') && candidate.education && candidate.education.length > 0 && (
      <Section title={`Education (${candidate.education.length})`}>
        <div className="space-y-3">
          {candidate.education.map((edu, i) => {
            // Handle nested object structures from Explorium API
            const schoolName = typeof edu.school === 'object' ? edu.school?.name : (edu.school || edu.institution);
            const degreeName = Array.isArray(edu.degrees) ? edu.degrees.join(', ') : (edu.degree || edu.field_of_study || edu.field);
            const majorName = Array.isArray(edu.majors) ? edu.majors.join(', ') : edu.major;
            const displayDegree = degreeName || majorName || 'Degree';

            return (
              <div
                key={i}
                className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{displayDegree}</p>
                    <p className="text-sm text-zinc-400">{schoolName || 'Unknown Institution'}</p>
                    {(edu.year || edu.end_date || edu.graduation_year) && (
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {edu.year || edu.end_date || edu.graduation_year}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    )}

    {/* Certifications */}
    {isSectionEnabled('profile', 'certifications') && candidate.certifications && candidate.certifications.length > 0 && (
      <Section title={`Certifications (${candidate.certifications.length})`}>
        <div className="space-y-2">
          {candidate.certifications.map((cert, i) => {
            // Handle both string and object formats
            const certName = typeof cert === 'object' ? (cert?.name || cert?.title || JSON.stringify(cert)) : String(cert);
            const certIssuer = typeof cert === 'object' ? cert?.issuer : null;
            const certDate = typeof cert === 'object' ? (cert?.date || cert?.issued_date) : null;
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30"
              >
                <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {certName}
                  </p>
                  {certIssuer && <p className="text-xs text-zinc-500">{certIssuer}</p>}
                  {certDate && <p className="text-xs text-zinc-600">{certDate}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    )}

    {/* Interests */}
    {isSectionEnabled('profile', 'interests') && candidate.interests && candidate.interests.length > 0 && (
      <Section title={`Interests (${candidate.interests.length})`}>
        <div className="flex flex-wrap gap-2">
          {candidate.interests.map((interest, i) => {
            // Handle both string and object formats
            const interestName = typeof interest === 'object' ? (interest?.name || interest?.interest || JSON.stringify(interest)) : String(interest);
            return (
              <span
                key={i}
                className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-xs border border-purple-500/20"
              >
                {interestName}
              </span>
            );
          })}
        </div>
      </Section>
    )}

    {/* Experience (Legacy - from original candidate data) */}
    {isSectionEnabled('profile', 'experience') && candidate.experience && candidate.experience.length > 0 && (
      <Section title="Experience">
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
          {candidate.experience.map((exp, i) => (
            <ExperienceItem key={i} {...exp} />
          ))}
        </div>
      </Section>
    )}

    {/* Additional Info */}
    {isSectionEnabled('profile', 'additional_info') && (
      <Section title="Additional Information">
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30 space-y-2">
          {candidate.years_experience && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Years of Experience</span>
              <span className="text-white">{candidate.years_experience}</span>
            </div>
          )}
          {candidate.current_salary && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Current Salary</span>
              <span className="text-white">${candidate.current_salary.toLocaleString()}</span>
            </div>
          )}
          {candidate.desired_salary && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Desired Salary</span>
              <span className="text-white">${candidate.desired_salary.toLocaleString()}</span>
            </div>
          )}
          {candidate.notice_period && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Notice Period</span>
              <span className="text-white">{candidate.notice_period}</span>
            </div>
          )}
        </div>
      </Section>
    )}
  </div>
);

// Intelligence Tab
const IntelligenceTab = ({ candidate, onRefresh, refreshing, isSectionEnabled = () => true }) => {
  const hasIntel = candidate.intelligence_score != null;

  return (
    <div className="space-y-6">
      {/* Intel Score Header */}
      {isSectionEnabled('intelligence', 'flight_risk_score') && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/20">
          <IntelligenceGauge score={candidate.intelligence_score || 0} size="lg" />
          <div className="flex-1">
            <div className="text-lg font-medium text-white">Flight Risk Score</div>
            <div className="flex items-center gap-2 mt-1">
              <IntelligenceLevelBadge level={candidate.intelligence_level || "Low"} />
              {candidate.recommended_approach && (
                <ApproachBadge approach={candidate.recommended_approach} />
              )}
            </div>
            {candidate.last_intelligence_update && (
              <div className="text-xs text-zinc-500 mt-2">
                Last updated: {new Date(candidate.last_intelligence_update).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {hasIntel ? (
        <>
          {/* Best Outreach Angle */}
          {isSectionEnabled('intelligence', 'best_outreach_angle') && candidate.best_outreach_angle && (
            <Section title="Best Outreach Angle">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {candidate.best_outreach_angle}
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Timing Signals */}
          {isSectionEnabled('intelligence', 'timing_signals') && candidate.timing_signals && candidate.timing_signals.length > 0 && (
            <Section title="Timing Signals">
              <div className="space-y-2">
                {candidate.timing_signals.map((signal, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      signal.urgency === "high"
                        ? "bg-red-500/10 border-red-500/20"
                        : signal.urgency === "medium"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-zinc-800/50 border-zinc-700/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{signal.trigger}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          signal.urgency === "high"
                            ? "bg-red-500/20 text-red-400"
                            : signal.urgency === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {signal.urgency} urgency
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Outreach Hooks */}
          {isSectionEnabled('intelligence', 'outreach_hooks') && candidate.outreach_hooks && candidate.outreach_hooks.length > 0 && (
            <Section title="Outreach Hooks">
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
                <ul className="space-y-2">
                  {candidate.outreach_hooks.map((hook, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Target className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{hook}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* Key Insights */}
          {isSectionEnabled('intelligence', 'key_insights') && candidate.key_insights && candidate.key_insights.length > 0 && (
            <Section title="Key Insights">
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
                <ul className="space-y-2">
                  {candidate.key_insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* Company Pain Points */}
          {isSectionEnabled('intelligence', 'employer_pain_points') && candidate.company_pain_points && candidate.company_pain_points.length > 0 && (
            <Section title="Employer Pain Points">
              <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
                <ul className="space-y-2">
                  {candidate.company_pain_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          {/* Inferred Skills */}
          {isSectionEnabled('intelligence', 'inferred_skills') && candidate.inferred_skills && candidate.inferred_skills.length > 0 && (
            <Section title="Inferred Skills">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">Skills inferred from experience and background, even if not explicitly listed</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidate.inferred_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs border border-purple-500/30 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Lateral Opportunities */}
          {isSectionEnabled('intelligence', 'lateral_opportunities') && candidate.lateral_opportunities && candidate.lateral_opportunities.length > 0 && (
            <Section title="Lateral Opportunities">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <ArrowUpRight className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">Adjacent roles or companies this candidate could excel in</p>
                </div>
                <div className="space-y-2">
                  {candidate.lateral_opportunities.map((opp, i) => {
                    // Handle various data formats
                    const displayText = typeof opp === 'string'
                      ? opp
                      : opp.role || opp.title || opp.name || opp.company || JSON.stringify(opp);
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-zinc-300">{displayText}</span>
                        {typeof opp === 'object' && opp.fit_score && (
                          <span className="ml-auto px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                            {opp.fit_score}% fit
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}

          {/* Company Correlations */}
          {isSectionEnabled('intelligence', 'company_correlations') && candidate.company_correlations && candidate.company_correlations.length > 0 && (
            <Section title="Company Correlations">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Network className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">Related companies and competitive insights</p>
                </div>
                <div className="space-y-2">
                  {candidate.company_correlations.map((company, i) => {
                    // Handle string format (company name)
                    if (typeof company === 'string') {
                      return (
                        <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-zinc-300">{company}</span>
                          </div>
                        </div>
                      );
                    }
                    // Handle object with name/similarity (expected format)
                    if (company.name) {
                      return (
                        <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-zinc-300">{company.name}</span>
                          </div>
                          {company.similarity && (
                            <span className="text-xs text-cyan-400">{company.similarity}% match</span>
                          )}
                        </div>
                      );
                    }
                    // Handle inference object format (from AI)
                    if (company.inference || company.observation || company.outreach_angle) {
                      return (
                        <div key={i} className="p-3 bg-zinc-800/50 rounded-lg space-y-2">
                          {company.observation && (
                            <div className="flex items-start gap-2">
                              <Eye className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-zinc-300">{company.observation}</span>
                            </div>
                          )}
                          {company.inference && (
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-zinc-400">{company.inference}</span>
                            </div>
                          )}
                          {company.outreach_angle && (
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-amber-300">{company.outreach_angle}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    // Fallback
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm text-zinc-300">{JSON.stringify(company)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No intelligence data available</p>
          <p className="text-sm text-zinc-500 mt-1">
            Generate intelligence to unlock insights
          </p>
        </div>
      )}

      {/* Refresh Button */}
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
        className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
      >
        {refreshing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        {hasIntel ? "Refresh Intelligence" : "Generate Intelligence"}
      </Button>
    </div>
  );
};

// Match Analysis Tab
const MatchAnalysisTab = ({ matchData, campaignContext }) => {
  if (!matchData) {
    return (
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No match data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Score Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-500/10 to-purple-500/10 rounded-lg border border-red-500/20">
        <div>
          <div className="text-lg font-medium text-white">Match Score</div>
          {campaignContext?.roleName && (
            <div className="text-sm text-zinc-400 mt-1">
              For: {campaignContext.roleName}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-red-400">{matchData.match_score || 0}%</div>
          <div className="text-xs text-zinc-500 mt-1">Match</div>
        </div>
      </div>

      {/* Score Breakdown */}
      {matchData.match_factors && (
        <Section title="Score Breakdown">
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30 space-y-3">
            <ScoreBar label="Skills Match" score={matchData.match_factors.skills_fit} color="blue" />
            <ScoreBar label="Experience Match" score={matchData.match_factors.experience_fit} color="purple" />
            <ScoreBar label="Title Match" score={matchData.match_factors.title_fit} color="cyan" />
            <ScoreBar label="Timing Score" score={matchData.match_factors.timing_score} color="amber" />
            <ScoreBar label="Culture Fit" score={matchData.match_factors.culture_fit} color="green" />
          </div>
        </Section>
      )}

      {/* AI Analysis */}
      {matchData.ai_analysis && (
        <Section title="AI Analysis">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-zinc-300 text-sm leading-relaxed">{matchData.ai_analysis}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Match Reasons */}
      {matchData.match_reasons && matchData.match_reasons.length > 0 && (
        <Section title="Why They Match">
          <div className="space-y-2">
            {matchData.match_reasons.map((reason, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-300">{reason}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Outreach Angle for this Match */}
      {matchData.best_outreach_angle && (
        <Section title="Recommended Outreach Angle">
          <ReasoningBlock
            title="Key Hook"
            content={matchData.best_outreach_angle}
            color="cyan"
          />
        </Section>
      )}
    </div>
  );
};

// Activity Tab
const ActivityTab = ({ activityHistory, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!activityHistory || activityHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No activity history yet</p>
        <p className="text-sm text-zinc-500 mt-1">
          Activity will appear here as you interact with this candidate
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-zinc-700" />

      <div className="space-y-0">
        {activityHistory.map((activity, i) => (
          <ActivityItem key={i} {...activity} />
        ))}
      </div>
    </div>
  );
};

// Main Drawer Component
export default function CandidateDetailDrawer({
  open,
  onClose,
  candidateId,
  campaignContext,
}) {
  const { user } = useUser();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);

  // SYNC Intel state
  const [generatingIntelligence, setGeneratingIntelligence] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "company" | "candidate" | ""

  // Enrichment state
  const [enrichingContact, setEnrichingContact] = useState(false);

  // SMS Modal state
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingFromNumber, setSendingFromNumber] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(false);

  // Campaign Matches state
  const [campaignMatches, setCampaignMatches] = useState([]);

  // Panel preferences
  const {
    preferences,
    loading: preferencesLoading,
    saving: preferencesSaving,
    savePreferences,
    isSectionEnabled,
    isTabEnabled,
    updateLocalPreferences
  } = usePanelPreferences();

  const SYNC_INTEL_CREDIT_COST = 10;

  // Fetch candidate details
  useEffect(() => {
    if (candidateId && open) {
      fetchCandidateDetails();
      fetchActivityHistory();
      fetchCampaignMatches();
    }
  }, [candidateId, open]);

  // Reset tab when opening for a new candidate
  useEffect(() => {
    if (open) {
      setActiveTab("profile");
    }
  }, [candidateId, open]);

  // Fetch phone numbers when SMS modal opens
  useEffect(() => {
    if (showSMSModal && user?.organization_id) {
      fetchAvailableNumbers();
    }
  }, [showSMSModal, user?.organization_id]);

  const fetchCandidateDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error) throw error;

      // Normalize data - map database column names to expected field names
      const normalizedCandidate = {
        ...data,
        // Profile fields
        name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
        current_title: data.current_title || data.job_title || null,
        current_company: data.current_company || data.company_name || null,
        location: data.location || data.person_home_location || null,
        linkedin_url: data.linkedin_url || data.linkedin_profile || null,
        summary: data.summary || data.professional_summary || null,

        // Intelligence fields - timing_signals from intelligence_timing
        timing_signals: data.timing_signals || data.intelligence_timing || [],

        // Key insights - may be in intelligence_data or intelligence_factors
        key_insights: data.key_insights ||
          (data.intelligence_data?.key_insights) ||
          (Array.isArray(data.intelligence_factors) && data.intelligence_factors.length > 0
            ? data.intelligence_factors.map(f => typeof f === 'string' ? f : f.description || f.factor)
            : []),

        // Outreach hooks normalization
        outreach_hooks: Array.isArray(data.outreach_hooks) ? data.outreach_hooks : [],

        // Company pain points normalization
        company_pain_points: Array.isArray(data.company_pain_points) ? data.company_pain_points : [],

        // Company correlations normalization
        company_correlations: Array.isArray(data.company_correlations) ? data.company_correlations : [],

        // Inferred skills - check intelligence_data
        inferred_skills: data.inferred_skills || data.intelligence_data?.inferred_skills || [],

        // Lateral opportunities - check intelligence_data
        lateral_opportunities: data.lateral_opportunities || data.intelligence_data?.lateral_opportunities || [],

        // Company intelligence - build from individual fields if not present
        company_intelligence: data.company_intelligence || {
          industry: data.industry || data.company_industry || null,
          employee_count: data.company_employee_count || null,
          headquarters: data.company_hq || data.company_hq_location || null,
          description: data.company_description || null,
          tech_stack: data.company_tech_stack || [],
          funding: data.company_latest_funding || data.company_last_funding || null,
          ma_news: data.recent_ma_news ? [{ headline: data.recent_ma_news }] : [],
          growth_signals: data.company_growth_percentage ? [`${data.company_growth_percentage}% growth`] : []
        },

        // Quick stats fields
        years_at_company: data.years_at_company || null,
        times_company_hopped: data.times_company_hopped || null,

        // LinkedIn Career Data - Skills & Career tab
        skills: Array.isArray(data.skills) ? data.skills : [],
        work_history: Array.isArray(data.work_history) ? data.work_history : [],
        education: Array.isArray(data.education) ? data.education : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        interests: Array.isArray(data.interests) ? data.interests : [],
      };

      setCandidate(normalizedCandidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      toast.error("Failed to load candidate details");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityHistory = async () => {
    setActivityLoading(true);
    try {
      // Fetch outreach tasks for this candidate
      const { data: tasks, error: tasksError } = await supabase
        .from("outreach_tasks")
        .select("*, campaign:campaign_id(id, name)")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch campaign matches
      const { data: matches, error: matchesError } = await supabase
        .from("candidate_campaign_matches")
        .select("*, campaign:campaign_id(id, name)")
        .eq("candidate_id", candidateId)
        .order("matched_at", { ascending: false });

      if (matchesError) throw matchesError;

      // Combine and format activity
      const activity = [];

      // Add matches
      matches?.forEach((match) => {
        activity.push({
          type: "matched",
          campaign_name: match.campaign?.name,
          timestamp: match.matched_at,
          details: `Match score: ${match.match_score}%`,
        });
      });

      // Add outreach tasks
      tasks?.forEach((task) => {
        if (task.status === "approved_ready" || task.status === "pending") {
          activity.push({
            type: "outreach_generated",
            campaign_name: task.campaign?.name,
            timestamp: task.created_at,
            message_preview: task.message_content?.substring(0, 100),
          });
        }
        if (task.sent_at) {
          activity.push({
            type: "outreach_sent",
            campaign_name: task.campaign?.name,
            timestamp: task.sent_at,
            message_preview: task.message_content?.substring(0, 100),
          });
        }
        if (task.status === "replied" && task.responded_at) {
          activity.push({
            type: "response_received",
            campaign_name: task.campaign?.name,
            timestamp: task.responded_at,
            details: task.response_sentiment
              ? `Sentiment: ${task.response_sentiment}`
              : undefined,
          });
        }
      });

      // Sort by timestamp descending
      activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivityHistory(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  // Fetch campaign matches
  const fetchCampaignMatches = async () => {
    if (!candidateId) return;
    try {
      const { data, error } = await supabase
        .from("candidate_campaign_matches")
        .select(`
          *,
          campaigns:campaign_id (id, name, description, status, campaign_type)
        `)
        .eq("candidate_id", candidateId)
        .order("match_score", { ascending: false });

      if (error) throw error;
      setCampaignMatches(data || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    }
  };

  // SYNC Intel handler
  const handleSyncIntel = async () => {
    if (!candidate) return;

    const isFromNestPurchase = candidate.source === 'nest_purchase';

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

      // Step 1: Sync company intelligence first
      if (candidate.current_company || candidate.company_name) {
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
              companyName: candidate.current_company || candidate.company_name,
              companyDomain: candidate.company_domain,
              entityType: "candidate",
              entityId: candidateId,
            }),
          }
        );
        const companyData = await companyResponse.json();
        if (companyData.intelligence) {
          companyIntel = companyData.intelligence;
          setCandidate(prev => ({ ...prev, company_intelligence: companyIntel }));
        }
      }

      // Step 2: Generate candidate intelligence
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
            company_intelligence: companyIntel,
          }),
        }
      );

      if (response.ok) {
        if (!isFromNestPurchase) {
          await supabase
            .from('users')
            .update({ credits: (user?.credits || 0) - SYNC_INTEL_CREDIT_COST })
            .eq('id', user.id);
          toast.success("Intelligence synced!", { description: `${SYNC_INTEL_CREDIT_COST} credits deducted` });
        } else {
          toast.success("Intelligence synced!");
        }
        await fetchCandidateDetails();
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

  // Enrich contact handler - saves ALL LinkedIn data
  const handleEnrichContact = async () => {
    if (!candidate.linkedin_url) {
      toast.error("No LinkedIn URL available");
      return;
    }

    setEnrichingContact(true);
    try {
      const enriched = await fullEnrichFromLinkedIn(candidate.linkedin_url);

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
        job_title: candidate.current_title || candidate.job_title || enriched.job_title,
        company_name: candidate.current_company || candidate.company_name || enriched.company,
        job_department: enriched.job_department || candidate.job_department,
        job_seniority_level: enriched.job_seniority_level || candidate.job_seniority_level,

        // Location details
        location_city: enriched.location_city || candidate.location_city,
        location_region: enriched.location_region || candidate.location_region,
        location_country: enriched.location_country || candidate.location_country,

        // Demographics
        age_group: enriched.age_group || candidate.age_group,
        gender: enriched.gender || candidate.gender,

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

      await fetchCandidateDetails();
      toast.success("Contact enriched!", {
        description: enrichedItems.length > 0
          ? `Found: ${enrichedItems.join(", ")}`
          : "Profile data updated",
      });
    } catch (err) {
      console.error("Enrichment error:", err);
      toast.error("Enrichment failed", {
        description: err.message || "Please try again",
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
            candidate_name: candidate.name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim(),
            candidate_title: candidate.current_title || candidate.job_title,
            candidate_company: candidate.current_company || candidate.company_name,
            candidate_skills: candidate.skills || [],
            campaign_type: "sms",
            stage: "initial",
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
              candidate_name: candidate.name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim(),
              source: "candidate_drawer",
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
        fetchActivityHistory();
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

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const allTabs = [
    { id: "summary", label: "Summary", icon: LayoutDashboard },
    { id: "profile", label: "Profile", icon: User },
    { id: "intelligence", label: "Intelligence", icon: Brain },
    { id: "company", label: "Company", icon: Building2 },
    { id: "matches", label: "Matches", icon: Target, count: campaignMatches.length },
    ...(campaignContext
      ? [{ id: "match", label: "Match Analysis", icon: Target }]
      : []),
    { id: "activity", label: "Activity", icon: History },
  ];

  // Filter tabs based on user preferences
  const tabs = allTabs.filter(tab => {
    // Match tab is always shown when there's campaign context
    if (tab.id === "match") return true;
    // Matches tab is always shown
    if (tab.id === "matches") return true;
    return isTabEnabled(tab.id);
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-[600px] bg-zinc-900 border-l border-zinc-800 z-50 overflow-hidden flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
              </div>
            ) : candidate ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 bg-gradient-to-b from-zinc-800/50 to-transparent">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                        {getInitials(candidate.name || `${candidate.first_name} ${candidate.last_name}`)}
                      </div>

                      {/* Info */}
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          {candidate.name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Unknown"}
                        </h2>
                        <div className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
                          {candidate.current_title && (
                            <>
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>{candidate.current_title}</span>
                            </>
                          )}
                          {candidate.current_title && candidate.current_company && (
                            <span className="text-zinc-600">at</span>
                          )}
                          {candidate.current_company && (
                            <>
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{candidate.current_company}</span>
                            </>
                          )}
                        </div>
                        {candidate.location && (
                          <div className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{candidate.location}</span>
                          </div>
                        )}
                        {/* Quick Stats */}
                        <QuickStats candidate={candidate} />
                      </div>
                    </div>

                    {/* Header Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Customize Button */}
                      <button
                        onClick={() => setShowCustomizationModal(true)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Customize panel"
                      >
                        <Settings className="w-5 h-5 text-zinc-400 hover:text-zinc-300" />
                      </button>
                      {/* Close Button */}
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Quick Stats Bar */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4 pt-4 border-t border-zinc-700/50">
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Urgency</p>
                      <UrgencyBadge level={candidate.recruitment_urgency} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Satisfaction</p>
                      <SatisfactionBadge level={candidate.job_satisfaction} />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Salary</p>
                      <p className="text-sm font-semibold text-red-400">
                        {candidate.salary_range ? `$${Number(candidate.salary_range).toLocaleString()}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Tenure</p>
                      <p className="text-sm font-semibold text-white">{candidate.years_at_company || 0}y</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Promos</p>
                      <p className="text-sm font-semibold text-white">{candidate.times_promoted || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-0.5">Job Changes</p>
                      <p className="text-sm font-semibold text-white">{candidate.times_company_hopped || 0}</p>
                    </div>
                  </div>

                  {/* Enhanced Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* SYNC INTEL Button */}
                    <Button
                      onClick={handleSyncIntel}
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

                    {/* Send SMS Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => setShowSMSModal(true)}
                    >
                      <MessageSquare className="w-3 h-3 mr-1.5" />
                      Send SMS
                    </Button>

                    {/* Enrich Button */}
                    {candidate.linkedin_url && !candidate.enriched_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnrichContact}
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
                      <div className="flex items-center gap-1 text-[10px] text-green-400 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Enriched
                      </div>
                    ) : null}

                    {/* LinkedIn Button */}
                    {candidate.linkedin_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        onClick={() => window.open(candidate.linkedin_url, "_blank")}
                      >
                        <Linkedin className="w-4 h-4" />
                      </Button>
                    )}

                    {/* View Full Profile Link */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      onClick={() => {
                        window.location.href = `${createPageUrl("TalentCandidateProfile")}?id=${candidate.id}`;
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1.5" />
                      Full Profile
                    </Button>
                  </div>
                </div>

                {/* Profile Summary Card - Quick decision points */}
                <ProfileSummaryCard
                  candidate={candidate}
                  preferences={preferences}
                  saving={preferencesSaving}
                  onSavePreferences={async (prefsToSave) => {
                    // Accept the current preferences from the component to avoid stale closure
                    const result = await savePreferences(prefsToSave);
                    return result;
                  }}
                  onUpdatePreferences={updateLocalPreferences}
                />

                {/* Tabs */}
                <div className="border-b border-zinc-800 px-6">
                  <div className="flex gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === tab.id
                            ? "text-red-400 border-red-500"
                            : "text-zinc-400 border-transparent hover:text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.count > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400 rounded-full">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === "summary" && (
                    <SummaryTabContent
                      candidate={candidate}
                      preferences={preferences}
                      onUpdatePreferences={updateLocalPreferences}
                      onSavePreferences={savePreferences}
                      saving={preferencesSaving}
                    />
                  )}
                  {activeTab === "profile" && (
                    <ProfileTab
                      candidate={candidate}
                      isSectionEnabled={isSectionEnabled}
                    />
                  )}
                  {activeTab === "intelligence" && (
                    <IntelligenceReport
                      candidate={candidate}
                      onGenerate={handleSyncIntel}
                      isGenerating={generatingIntelligence}
                      syncStatus={syncStatus}
                      isSectionEnabled={isSectionEnabled}
                    />
                  )}
                  {activeTab === "company" && (
                    <div className="space-y-4">
                      {/* Compact company info bar at top */}
                      {(candidate.current_company || candidate.company_name) && (
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{candidate.current_company || candidate.company_name}</h3>
                            {candidate.company_domain && (
                              <p className="text-sm text-blue-400/70">{candidate.company_domain}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* CompanyIntelligenceReport */}
                      <CompanyIntelligenceReport
                        intelligence={candidate.company_intelligence}
                        companyName={candidate.current_company || candidate.company_name}
                        companyDomain={candidate.company_domain}
                        entityType="candidate"
                        entityId={candidate.id}
                        onIntelligenceGenerated={(intel) => setCandidate({ ...candidate, company_intelligence: intel })}
                        isSectionEnabled={isSectionEnabled}
                      />
                    </div>
                  )}
                  {activeTab === "matches" && (
                    <div className="space-y-4">
                      {campaignMatches.length === 0 ? (
                        <div className="text-center py-12">
                          <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-white mb-2">No Campaign Matches</h3>
                          <p className="text-zinc-400 text-sm">
                            This candidate hasn't been matched to any campaigns yet.
                          </p>
                        </div>
                      ) : (
                        campaignMatches.map((match) => (
                          <div
                            key={match.id}
                            className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {/* Score Circle */}
                                <div className="relative w-14 h-14 flex-shrink-0">
                                  <svg className="w-14 h-14 -rotate-90">
                                    <circle
                                      cx="28"
                                      cy="28"
                                      r="24"
                                      fill="none"
                                      stroke="rgba(255,255,255,0.1)"
                                      strokeWidth="4"
                                    />
                                    <circle
                                      cx="28"
                                      cy="28"
                                      r="24"
                                      fill="none"
                                      stroke={match.match_score >= 80 ? "#22c55e" : match.match_score >= 60 ? "#eab308" : "#ef4444"}
                                      strokeWidth="4"
                                      strokeLinecap="round"
                                      strokeDasharray={`${(match.match_score / 100) * 150.8} 150.8`}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold text-white">{match.match_score}%</span>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-white">{match.campaigns?.name || "Unknown Campaign"}</h4>
                                  <p className="text-sm text-zinc-400">{match.campaigns?.campaign_type || "—"}</p>
                                  {match.match_reasons?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {match.match_reasons.slice(0, 3).map((reason, idx) => (
                                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                                          {reason}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span className={`text-xs px-2 py-1 rounded ${
                                match.campaigns?.status === "active"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-zinc-500/20 text-zinc-400"
                              }`}>
                                {match.campaigns?.status || "unknown"}
                              </span>
                            </div>

                            {match.best_outreach_angle && (
                              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                                <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-1">Best Approach</p>
                                <p className="text-sm text-zinc-300">{match.best_outreach_angle}</p>
                              </div>
                            )}

                            {match.timing_signals?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                                <p className="text-xs text-red-400/70 uppercase tracking-wider mb-1">Timing Signals</p>
                                <div className="flex flex-wrap gap-1">
                                  {match.timing_signals.slice(0, 3).map((signal, idx) => (
                                    <span key={idx} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">
                                      {signal.trigger || signal}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <p className="text-xs text-zinc-500 mt-3">
                              Matched {new Date(match.matched_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {activeTab === "match" && campaignContext && (
                    <MatchAnalysisTab
                      matchData={campaignContext.matchData}
                      campaignContext={campaignContext}
                    />
                  )}
                  {activeTab === "activity" && (
                    <ActivityTab
                      activityHistory={activityHistory}
                      loading={activityLoading}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500">Candidate not found</p>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Panel Customization Modal */}
      <PanelCustomizationModal
        open={showCustomizationModal}
        onClose={() => setShowCustomizationModal(false)}
        preferences={preferences}
        onSave={savePreferences}
        saving={preferencesSaving}
      />

      {/* SMS Modal */}
      <Dialog open={showSMSModal} onOpenChange={setShowSMSModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-400" />
              Send SMS to {candidate?.name || candidate?.first_name || "Candidate"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Recipient Info */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">
                  {candidate?.verified_phone || candidate?.phone || "No phone number"}
                </span>
              </div>
              {!candidate?.verified_phone && !candidate?.phone && (
                <span className="text-xs text-amber-400">Enrich to get phone</span>
              )}
            </div>

            {/* Sending Number Selection */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Send from</label>
              {availableNumbers.length === 0 ? (
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm text-amber-400">
                  No phone numbers available. Purchase one in SMS Outreach settings.
                </div>
              ) : (
                <Select value={sendingFromNumber} onValueChange={setSendingFromNumber}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select phone number" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {availableNumbers.map((num) => (
                      <SelectItem key={num.phone_number} value={num.phone_number} className="text-white">
                        {num.friendly_name || num.phone_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-400">Message</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generatePersonalizedSMS}
                  disabled={generatingMessage}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                >
                  {generatingMessage ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message or click 'Generate with AI' for a personalized message..."
                className="bg-zinc-800 border-zinc-700 text-white min-h-[120px] resize-none"
                maxLength={160}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-zinc-500">{smsMessage.length}/160 characters</span>
                {smsMessage.length > 160 && (
                  <span className="text-xs text-amber-400">Will be sent as multiple messages</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSMSModal(false);
                  setSmsMessage("");
                }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={sendSMS}
                disabled={sendingSMS || !smsMessage.trim() || !sendingFromNumber || (!candidate?.verified_phone && !candidate?.phone)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                {sendingSMS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
