import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Euro,
  Calendar,
  Globe,
  Linkedin,
  MapPin,
  Factory,
  TrendingUp,
  TrendingDown,
  Cpu,
  Layers,
  Rocket,
  Briefcase,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Zap,
  Database,
  Code,
  Cloud,
  Shield,
  BarChart3,
  Banknote,
  Star,
  ThumbsUp,
  Heart,
  Award,
  Target,
  Share2,
  Twitter,
  Activity,
  Eye,
  Clock,
  Percent,
  Building,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

/**
 * DataRow - Simple data display row
 */
const DataRow = ({ label, value, icon: Icon }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-white/50">
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
};

/**
 * RatingBar - Visual rating display
 */
const RatingBar = ({ label, value, maxValue = 5 }) => {
  if (!value) return null;
  const percentage = (value / maxValue) * 100;
  const color = value >= 4 ? "bg-green-500" : value >= 3 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/60">{label}</span>
        <span className="text-sm font-medium text-white">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

/**
 * TechBadge - Tech stack badge
 */
const TechBadge = ({ name }) => (
  <span className="px-2.5 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded-md border border-cyan-500/20">
    {name}
  </span>
);

/**
 * SectionCard - Styled like IntelligenceReport sections
 */
const SectionCard = ({ icon: Icon, title, iconColor = "white", headerBg = "", children, badge, className = "" }) => (
  <motion.div
    variants={itemVariants}
    className={`bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden ${className}`}
  >
    <div className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.06] ${headerBg}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 text-${iconColor}-400`} />
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      {badge}
    </div>
    <div className="p-4">{children}</div>
  </motion.div>
);

/**
 * DataQualityBadge - Shows what data is available
 */
const DataQualityBadge = ({ quality }) => {
  if (!quality) return null;
  const { completeness } = quality;
  const color = completeness >= 6 ? "green" : completeness >= 4 ? "yellow" : "red";

  return (
    <span className={`text-xs px-2 py-0.5 rounded bg-${color}-500/20 text-${color}-400`}>
      {completeness}/8 sources
    </span>
  );
};

/**
 * CompanyIntelligenceReport - Comprehensive company intelligence display
 */
export const CompanyIntelligenceReport = ({
  intelligence,
  companyName,
  companyDomain,
  entityType,
  entityId,
  onIntelligenceGenerated,
  isSectionEnabled = () => true,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateIntelligence = async () => {
    if (!companyName) {
      toast.error("Company name is required");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateCompanyIntelligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            companyName,
            companyDomain,
            entityType,
            entityId,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.intelligence) {
        toast.success("Company intelligence generated");
        onIntelligenceGenerated?.(data.intelligence);
      } else {
        toast.info("No data found for this company");
      }
    } catch (error) {
      console.error("Generate intelligence error:", error);
      toast.error("Failed to generate intelligence");
    } finally {
      setIsGenerating(false);
    }
  };

  const {
    firmographics,
    funding,
    technographics,
    employee_ratings,
    social_media,
    workforce,
    competitive_landscape,
    website_traffic,
    enriched_at,
    data_quality,
  } = intelligence || {};

  // Check if firmographics has any useful data (not just empty strings)
  const hasFirmographicsContent = firmographics && (
    firmographics.industry ||
    firmographics.employee_count_range ||
    firmographics.employee_count ||
    firmographics.revenue_range ||
    firmographics.founded_year ||
    firmographics.company_type ||
    (firmographics.headquarters && firmographics.headquarters.trim()) ||
    firmographics.logo_url ||
    firmographics.naics_description ||
    firmographics.sic_description
  );

  // Check if employee ratings has any actual ratings
  const hasEmployeeRatingsContent = employee_ratings && (
    employee_ratings.overall_rating ||
    employee_ratings.culture_rating ||
    employee_ratings.work_life_balance ||
    employee_ratings.compensation_rating
  );

  // Check if funding has actual content
  const hasFundingContent = funding && (
    funding.total_funding ||
    (funding.funding_rounds && funding.funding_rounds.length > 0)
  );

  // Check if social media has followers
  const hasSocialContent = social_media && (
    social_media.linkedin_followers ||
    social_media.twitter_followers ||
    social_media.facebook_followers
  );

  // Check if we have any displayable data
  const hasData = hasFirmographicsContent ||
    technographics?.tech_stack?.length > 0 ||
    hasFundingContent ||
    hasEmployeeRatingsContent ||
    hasSocialContent ||
    (workforce && (workforce.total_employees || workforce.departments?.length > 0)) ||
    competitive_landscape?.competitors?.length > 0 ||
    (website_traffic && (website_traffic.monthly_visits || website_traffic.unique_visitors));

  // No data state
  if (!hasData) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center py-12"
      >
        <motion.div variants={itemVariants} className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Company Intelligence</h3>
          <p className="text-white/50 text-sm mb-6">
            Generate intelligence using Explorium to get firmographics, funding, tech stack, employee ratings, and more.
          </p>
          {companyName && (
            <button
              onClick={generateIntelligence}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white text-sm transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  SYNC INTEL
                </>
              )}
            </button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header Bar */}
      {isSectionEnabled('company', 'company_info') && (
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between bg-white/[0.02] rounded-xl border border-white/[0.06] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Company Intelligence</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {enriched_at && (
                  <span className="text-xs text-white/40">
                    Updated {new Date(enriched_at).toLocaleDateString()}
                  </span>
                )}
                <DataQualityBadge quality={data_quality} />
              </div>
            </div>
          </div>
          {companyName && (
            <button
              onClick={generateIntelligence}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 rounded-lg transition-all"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              SYNC INTEL
            </button>
          )}
        </motion.div>
      )}

      {/* Main 2-column grid - matches IntelligenceReport layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Firmographics / Company Profile */}
        {isSectionEnabled('company', 'company_info') && hasFirmographicsContent && (
          <SectionCard icon={Building2} title="Company Profile" iconColor="blue" headerBg="bg-blue-500/5">
            <div className="space-y-4">
              {firmographics.logo_url && (
                <img src={firmographics.logo_url} alt="" className="h-10 object-contain" />
              )}

              <div className="divide-y divide-white/[0.04]">
                <DataRow label="Industry" value={firmographics.industry} icon={Factory} />
                <DataRow label="Employees" value={firmographics.employee_count_range || firmographics.employee_count?.toLocaleString()} icon={Users} />
                <DataRow label="Revenue" value={firmographics.revenue_range} icon={Euro} />
                <DataRow label="Founded" value={firmographics.founded_year} icon={Calendar} />
                <DataRow label="Type" value={firmographics.company_type} icon={Building} />
                <DataRow label="Headquarters" value={firmographics.headquarters} icon={MapPin} />
              </div>

              {(firmographics.naics_description || firmographics.sic_description) && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Industry Classification</p>
                  <p className="text-sm text-white/70">{firmographics.naics_description || firmographics.sic_description}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {firmographics.website && (
                  <a
                    href={firmographics.website.startsWith("http") ? firmographics.website : `https://${firmographics.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
                {firmographics.linkedin_url && (
                  <a
                    href={firmographics.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                )}
                {firmographics.ticker && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/10 rounded-lg text-green-400">
                    ${firmographics.ticker}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Employee Ratings */}
        {isSectionEnabled('company', 'employee_ratings') && hasEmployeeRatingsContent && (
          <SectionCard
            icon={Star}
            title="Employee Ratings"
            iconColor="yellow"
            headerBg="bg-yellow-500/5"
            badge={
              employee_ratings.overall_rating && (
                <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {employee_ratings.overall_rating.toFixed(1)}
                </span>
              )
            }
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <RatingBar label="Culture & Values" value={employee_ratings.culture_rating} />
                <RatingBar label="Work-Life Balance" value={employee_ratings.work_life_balance} />
                <RatingBar label="Compensation" value={employee_ratings.compensation_rating} />
                <RatingBar label="Career Opportunities" value={employee_ratings.career_opportunities} />
                <RatingBar label="Management" value={employee_ratings.management_rating} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                {employee_ratings.recommend_percent && (
                  <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400">{employee_ratings.recommend_percent}%</p>
                    <p className="text-xs text-white/50 mt-1">Would Recommend</p>
                  </div>
                )}
                {employee_ratings.ceo_approval && (
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
                    <p className="text-2xl font-bold text-blue-400">{employee_ratings.ceo_approval}%</p>
                    <p className="text-xs text-white/50 mt-1">CEO Approval</p>
                  </div>
                )}
              </div>

              {employee_ratings.review_count && (
                <p className="text-xs text-white/40 text-center">
                  Based on {employee_ratings.review_count.toLocaleString()} reviews
                </p>
              )}
            </div>
          </SectionCard>
        )}

        {/* Funding */}
        {isSectionEnabled('company', 'funding_info') && hasFundingContent && (
          <SectionCard
            icon={Banknote}
            title="Funding & Investment"
            iconColor="green"
            headerBg="bg-green-500/5"
            badge={
              funding.funding_stage && (
                <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-400 rounded-md border border-green-500/30">
                  {funding.funding_stage}
                </span>
              )
            }
          >
            <div className="space-y-4">
              {funding.total_funding && (
                <div className="p-4 bg-gradient-to-br from-green-500/15 to-green-500/5 rounded-lg border border-green-500/20 text-center">
                  <p className="text-xs text-green-400/80 uppercase tracking-wider mb-1">Total Raised</p>
                  <p className="text-3xl font-bold text-green-400">
                    {'\u20AC'}{(funding.total_funding / 1000000).toFixed(1)}M
                  </p>
                  {funding.last_funding_date && (
                    <p className="text-xs text-white/40 mt-2">
                      Last funding: {new Date(funding.last_funding_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {funding.funding_rounds?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Funding Rounds</p>
                  <div className="divide-y divide-white/[0.04]">
                    {funding.funding_rounds.slice(0, 4).map((round, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <span className="text-sm text-white font-medium">{round.round_type || "Round"}</span>
                        <div className="flex items-center gap-4">
                          {round.amount && (
                            <span className="text-sm text-green-400 font-semibold">
                              {'\u20AC'}{(round.amount / 1000000).toFixed(1)}M
                            </span>
                          )}
                          {round.date && (
                            <span className="text-xs text-white/40">
                              {new Date(round.date).getFullYear()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {funding.is_public && (
                <div className="flex items-center gap-2 text-sm text-white/60 pt-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Publicly Traded
                  {funding.ipo_date && ` (IPO: ${new Date(funding.ipo_date).getFullYear()})`}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Social Media */}
        {isSectionEnabled('company', 'growth_signals') && hasSocialContent && (
          <SectionCard icon={Share2} title="Social Presence" iconColor="purple" headerBg="bg-purple-500/5">
            <div className="grid grid-cols-3 gap-3">
              {social_media.linkedin_followers && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                  <Linkedin className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-white">
                    {social_media.linkedin_followers >= 1000
                      ? `${(social_media.linkedin_followers / 1000).toFixed(1)}K`
                      : social_media.linkedin_followers}
                  </p>
                  <p className="text-xs text-white/50 mt-1">LinkedIn</p>
                </div>
              )}
              {social_media.twitter_followers && (
                <div className="p-4 bg-sky-500/10 rounded-lg border border-sky-500/20 text-center">
                  <Twitter className="w-5 h-5 text-sky-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-white">
                    {social_media.twitter_followers >= 1000
                      ? `${(social_media.twitter_followers / 1000).toFixed(1)}K`
                      : social_media.twitter_followers}
                  </p>
                  <p className="text-xs text-white/50 mt-1">Twitter</p>
                </div>
              )}
              {social_media.facebook_followers && (
                <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-center">
                  <Heart className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xl font-bold text-white">
                    {social_media.facebook_followers >= 1000
                      ? `${(social_media.facebook_followers / 1000).toFixed(1)}K`
                      : social_media.facebook_followers}
                  </p>
                  <p className="text-xs text-white/50 mt-1">Facebook</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Website Traffic */}
        {isSectionEnabled('company', 'growth_signals') && website_traffic && (website_traffic.monthly_visits || website_traffic.unique_visitors) && (
          <SectionCard
            icon={Activity}
            title="Website Traffic"
            iconColor="orange"
            headerBg="bg-orange-500/5"
            badge={website_traffic.rank && <span className="text-xs text-white/40">Global Rank #{website_traffic.rank.toLocaleString()}</span>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {website_traffic.monthly_visits && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 text-center">
                    <Eye className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">
                      {website_traffic.monthly_visits >= 1000000
                        ? `${(website_traffic.monthly_visits / 1000000).toFixed(1)}M`
                        : website_traffic.monthly_visits >= 1000
                        ? `${(website_traffic.monthly_visits / 1000).toFixed(1)}K`
                        : website_traffic.monthly_visits}
                    </p>
                    <p className="text-xs text-white/50">Monthly Visits</p>
                  </div>
                )}
                {website_traffic.unique_visitors && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
                    <Users className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">
                      {website_traffic.unique_visitors >= 1000
                        ? `${(website_traffic.unique_visitors / 1000).toFixed(1)}K`
                        : website_traffic.unique_visitors}
                    </p>
                    <p className="text-xs text-white/50">Unique Users</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {website_traffic.bounce_rate && (
                  <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center gap-2 text-white/60">
                      <Percent className="w-4 h-4" />
                      <span className="text-sm">Bounce Rate</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{website_traffic.bounce_rate}%</span>
                  </div>
                )}
                {website_traffic.avg_visit_duration && (
                  <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                    <div className="flex items-center gap-2 text-white/60">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Avg. Duration</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{website_traffic.avg_visit_duration}</span>
                  </div>
                )}
              </div>

              {website_traffic.traffic_sources && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Traffic Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(website_traffic.traffic_sources)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([source, count]) => {
                        const total = Object.values(website_traffic.traffic_sources).reduce((a, b) => a + b, 0);
                        const pct = Math.round((count / total) * 100);
                        return (
                          <span key={source} className="text-xs px-2.5 py-1.5 bg-white/[0.05] rounded-md text-white/70 capitalize">
                            {source} <span className="text-orange-400 font-medium">{pct}%</span>
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Workforce */}
        {isSectionEnabled('company', 'company_info') && workforce && (workforce.total_employees || workforce.departments?.length > 0) && (
          <SectionCard icon={Users} title="Workforce Distribution" iconColor="indigo" headerBg="bg-indigo-500/5">
            <div className="space-y-4">
              {workforce.total_employees && (
                <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-center">
                  <p className="text-3xl font-bold text-indigo-400">{workforce.total_employees.toLocaleString()}</p>
                  <p className="text-xs text-white/50 mt-1">LinkedIn Profiles</p>
                </div>
              )}

              {workforce.departments?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Department Breakdown</p>
                  <div className="space-y-2">
                    {workforce.departments.slice(0, 6).map((dept, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-white/70">{dept.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(dept.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-indigo-400 w-10 text-right">{dept.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Competitors */}
        {isSectionEnabled('company', 'company_info') && competitive_landscape?.competitors?.length > 0 && (
          <SectionCard icon={Target} title="Competitors" iconColor="red" headerBg="bg-red-500/5">
            <div className="divide-y divide-white/[0.04]">
              {competitive_landscape.competitors.slice(0, 6).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-white font-medium">{comp.name}</span>
                  </div>
                  {comp.similarity_score && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.round(comp.similarity_score * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/50 w-8 text-right">
                        {Math.round(comp.similarity_score * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Tech Stack - Full width below grid for better display */}
      {isSectionEnabled('company', 'tech_stack') && technographics && technographics.tech_stack?.length > 0 && (
        <SectionCard
          icon={Layers}
          title="Technology Stack"
          iconColor="cyan"
          headerBg="bg-cyan-500/5"
          badge={
            technographics.tech_count && (
              <span className="text-xs px-2.5 py-1 bg-cyan-500/20 text-cyan-400 rounded-md border border-cyan-500/30">
                {technographics.tech_count} technologies
              </span>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technographics.tech_stack.slice(0, 6).map((cat, idx) => (
              <div key={idx}>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.technologies.slice(0, 8).map((tech, tidx) => (
                    <TechBadge key={tidx} name={tech} />
                  ))}
                  {cat.technologies.length > 8 && (
                    <span className="px-2.5 py-1 text-xs text-white/40 bg-white/[0.03] rounded-md">
                      +{cat.technologies.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
};

export default CompanyIntelligenceReport;
