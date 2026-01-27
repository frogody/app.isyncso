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
  Clock,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Plus,
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
  DollarSign,
  Users,
  Star,
  Code2,
  Layers,
  Zap,
  ArrowUpRight,
  Network,
  Newspaper,
  Shield,
  Globe,
  Percent,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IntelligenceGauge, IntelligenceLevelBadge, ApproachBadge } from "./IntelligenceGauge";

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
  // Calculate years at current company
  const calculateYearsAtCompany = () => {
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

  // Calculate company changes
  const calculateCompanyChanges = () => {
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
const CompanyTab = ({ candidate }) => {
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

      {/* Technology Stack */}
      {companyIntel.tech_stack && companyIntel.tech_stack.length > 0 && (
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
      {companyIntel.employee_ratings && (
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
      {companyIntel.funding && (
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
      {companyIntel.ma_news && companyIntel.ma_news.length > 0 && (
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
      {companyIntel.description && (
        <Section title="Company Profile">
          <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30">
            <p className="text-sm text-zinc-300 leading-relaxed">{companyIntel.description}</p>
          </div>
        </Section>
      )}

      {/* Growth Signals */}
      {companyIntel.growth_signals && companyIntel.growth_signals.length > 0 && (
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
const ProfileTab = ({ candidate }) => (
  <div className="space-y-6">
    {/* Contact Information */}
    <Section title="Contact Information">
      <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
        <InfoRow icon={Mail} label="Email" value={candidate.email} copyable />
        <InfoRow icon={Phone} label="Phone" value={candidate.phone} copyable />
        <InfoRow icon={Linkedin} label="LinkedIn" value={candidate.linkedin_url} link />
        {candidate.website && (
          <InfoRow icon={ExternalLink} label="Website" value={candidate.website} link />
        )}
      </div>
    </Section>

    {/* Professional Summary */}
    {candidate.summary && (
      <Section title="Professional Summary">
        <div className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/30">
          <p className="text-zinc-300 text-sm leading-relaxed">{candidate.summary}</p>
        </div>
      </Section>
    )}

    {/* Skills */}
    {candidate.skills && candidate.skills.length > 0 && (
      <Section title="Skills">
        <div className="flex flex-wrap gap-2">
          {candidate.skills.map((skill, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-300 border border-zinc-700/30"
            >
              {skill}
            </span>
          ))}
        </div>
      </Section>
    )}

    {/* Experience */}
    {candidate.experience && candidate.experience.length > 0 && (
      <Section title="Experience">
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
          {candidate.experience.map((exp, i) => (
            <ExperienceItem key={i} {...exp} />
          ))}
        </div>
      </Section>
    )}

    {/* Education */}
    {candidate.education && candidate.education.length > 0 && (
      <Section title="Education">
        <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
          {candidate.education.map((edu, i) => (
            <EducationItem key={i} {...edu} />
          ))}
        </div>
      </Section>
    )}

    {/* Additional Info */}
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
  </div>
);

// Intelligence Tab
const IntelligenceTab = ({ candidate, onRefresh, refreshing }) => {
  const hasIntel = candidate.intelligence_score != null;

  return (
    <div className="space-y-6">
      {/* Intel Score Header */}
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

      {hasIntel ? (
        <>
          {/* Best Outreach Angle */}
          {candidate.best_outreach_angle && (
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
          {candidate.timing_signals && candidate.timing_signals.length > 0 && (
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
          {candidate.outreach_hooks && candidate.outreach_hooks.length > 0 && (
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
          {candidate.key_insights && candidate.key_insights.length > 0 && (
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
          {candidate.company_pain_points && candidate.company_pain_points.length > 0 && (
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
          {candidate.inferred_skills && candidate.inferred_skills.length > 0 && (
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
          {candidate.lateral_opportunities && candidate.lateral_opportunities.length > 0 && (
            <Section title="Lateral Opportunities">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <ArrowUpRight className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">Adjacent roles this candidate could excel in</p>
                </div>
                <div className="space-y-2">
                  {candidate.lateral_opportunities.map((opp, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-zinc-300">{typeof opp === 'string' ? opp : opp.role || opp.title}</span>
                      {typeof opp === 'object' && opp.fit_score && (
                        <span className="ml-auto px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                          {opp.fit_score}% fit
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Company Correlations */}
          {candidate.company_correlations && candidate.company_correlations.length > 0 && (
            <Section title="Company Correlations">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Network className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-400">Companies with similar talent profiles and culture</p>
                </div>
                <div className="space-y-2">
                  {candidate.company_correlations.map((company, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm text-zinc-300">
                          {typeof company === 'string' ? company : company.name}
                        </span>
                      </div>
                      {typeof company === 'object' && company.similarity && (
                        <span className="text-xs text-cyan-400">{company.similarity}% match</span>
                      )}
                    </div>
                  ))}
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
  const [activeTab, setActiveTab] = useState("profile");
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [refreshingIntel, setRefreshingIntel] = useState(false);

  // Fetch candidate details
  useEffect(() => {
    if (candidateId && open) {
      fetchCandidateDetails();
      fetchActivityHistory();
    }
  }, [candidateId, open]);

  // Reset tab when opening for a new candidate
  useEffect(() => {
    if (open) {
      setActiveTab("profile");
    }
  }, [candidateId, open]);

  const fetchCandidateDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error) throw error;
      setCandidate(data);
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

  const handleRefreshIntel = async () => {
    if (!candidate) return;
    setRefreshingIntel(true);
    try {
      // Queue for intel generation
      const { error } = await supabase.from("sync_intel_queue").insert({
        candidate_id: candidate.id,
        organization_id: user.organization_id,
        source: "manual",
        priority: 1,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Intelligence generation queued");
      // Refresh candidate data after a delay
      setTimeout(fetchCandidateDetails, 2000);
    } catch (error) {
      console.error("Error queueing intel:", error);
      toast.error("Failed to queue intelligence generation");
    } finally {
      setRefreshingIntel(false);
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

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "intelligence", label: "Intelligence", icon: Brain },
    { id: "company", label: "Company", icon: Building2 },
    ...(campaignContext
      ? [{ id: "match", label: "Match Analysis", icon: Target }]
      : []),
    { id: "activity", label: "Activity", icon: History },
  ];

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

                    {/* Close Button */}
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Campaign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Generate Outreach
                    </Button>
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
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-zinc-800 px-6">
                  <div className="flex gap-1">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? "text-red-400 border-red-500"
                            : "text-zinc-400 border-transparent hover:text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === "profile" && <ProfileTab candidate={candidate} />}
                  {activeTab === "intelligence" && (
                    <IntelligenceTab
                      candidate={candidate}
                      onRefresh={handleRefreshIntel}
                      refreshing={refreshingIntel}
                    />
                  )}
                  {activeTab === "company" && <CompanyTab candidate={candidate} />}
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
    </AnimatePresence>
  );
}
