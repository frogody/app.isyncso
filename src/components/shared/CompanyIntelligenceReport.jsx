import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Users,
  DollarSign,
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
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-white/50">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="text-xs">{label}</span>
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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-medium text-white">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

/**
 * TechBadge - Tech stack badge
 */
const TechBadge = ({ name }) => (
  <span className="px-2 py-1 text-[11px] bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
    {name}
  </span>
);

/**
 * MetricCard - Large metric display
 */
const MetricCard = ({ label, value, icon: Icon, color = "white", subtext }) => (
  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon className={`w-4 h-4 text-${color}-400`} />}
      <span className="text-xs text-white/40">{label}</span>
    </div>
    <p className={`text-xl font-bold text-${color}-400`}>{value}</p>
    {subtext && <p className="text-xs text-white/40 mt-1">{subtext}</p>}
  </div>
);

/**
 * SectionCard - Reusable section wrapper
 */
const SectionCard = ({ icon: Icon, title, iconColor = "white", children, badge }) => (
  <motion.div
    variants={itemVariants}
    className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden"
  >
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 text-${iconColor}-400`} />
        <h4 className="font-medium text-white text-sm">{title}</h4>
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

  const hasData = firmographics || funding || technographics || employee_ratings ||
    social_media || workforce || competitive_landscape || website_traffic;

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
                  Enriching from 8 sources...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Company Intel
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20">
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </motion.div>

      {/* Row 1: Company Profile + Employee Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Firmographics / Company Profile */}
        {firmographics && (
          <SectionCard icon={Building2} title="Company Profile" iconColor="blue">
            <div className="space-y-3">
              {firmographics.logo_url && (
                <img src={firmographics.logo_url} alt="" className="h-8 object-contain" />
              )}

              <div className="grid grid-cols-2 gap-3">
                <DataRow label="Industry" value={firmographics.industry} icon={Factory} />
                <DataRow label="Employees" value={firmographics.employee_count_range || firmographics.employee_count?.toLocaleString()} icon={Users} />
                <DataRow label="Revenue" value={firmographics.revenue_range} icon={DollarSign} />
                <DataRow label="Founded" value={firmographics.founded_year} icon={Calendar} />
                <DataRow label="Type" value={firmographics.company_type} icon={Building} />
                <DataRow label="HQ" value={firmographics.headquarters} icon={MapPin} />
              </div>

              {(firmographics.naics_description || firmographics.sic_description) && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-white/40 mb-1">Industry Classification</p>
                  <p className="text-xs text-white/70">{firmographics.naics_description || firmographics.sic_description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {firmographics.website && (
                  <a
                    href={firmographics.website.startsWith("http") ? firmographics.website : `https://${firmographics.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/[0.05] hover:bg-white/[0.1] rounded text-white/60 hover:text-white"
                  >
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
                {firmographics.linkedin_url && (
                  <a
                    href={firmographics.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 rounded text-blue-400"
                  >
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {firmographics.ticker && (
                  <span className="px-2.5 py-1 text-xs bg-green-500/10 rounded text-green-400">
                    ${firmographics.ticker}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Employee Ratings */}
        {employee_ratings && (employee_ratings.overall_rating || employee_ratings.raw) && (
          <SectionCard
            icon={Star}
            title="Employee Ratings"
            iconColor="yellow"
            badge={
              employee_ratings.overall_rating && (
                <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {employee_ratings.overall_rating.toFixed(1)}
                </span>
              )
            }
          >
            <div className="space-y-3">
              <RatingBar label="Culture & Values" value={employee_ratings.culture_rating} />
              <RatingBar label="Work-Life Balance" value={employee_ratings.work_life_balance} />
              <RatingBar label="Compensation" value={employee_ratings.compensation_rating} />
              <RatingBar label="Career Opportunities" value={employee_ratings.career_opportunities} />
              <RatingBar label="Management" value={employee_ratings.management_rating} />

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                {employee_ratings.recommend_percent && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">{employee_ratings.recommend_percent}%</p>
                    <p className="text-xs text-white/40">Would Recommend</p>
                  </div>
                )}
                {employee_ratings.ceo_approval && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-400">{employee_ratings.ceo_approval}%</p>
                    <p className="text-xs text-white/40">CEO Approval</p>
                  </div>
                )}
              </div>

              {employee_ratings.review_count && (
                <p className="text-xs text-white/30 text-center">
                  Based on {employee_ratings.review_count.toLocaleString()} reviews
                </p>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Row 2: Funding + Social Media */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funding */}
        {funding && (funding.total_funding || funding.funding_rounds?.length > 0 || funding.raw) && (
          <SectionCard
            icon={Banknote}
            title="Funding & Investment"
            iconColor="green"
            badge={
              funding.funding_stage && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                  {funding.funding_stage}
                </span>
              )
            }
          >
            <div className="space-y-4">
              {funding.total_funding && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                  <p className="text-xs text-green-400/70 mb-1">Total Raised</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${(funding.total_funding / 1000000).toFixed(1)}M
                  </p>
                  {funding.last_funding_date && (
                    <p className="text-xs text-white/40 mt-1">
                      Last: {new Date(funding.last_funding_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {funding.funding_rounds?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Funding Rounds</p>
                  <div className="space-y-2">
                    {funding.funding_rounds.slice(0, 4).map((round, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-white">{round.round_type || "Round"}</span>
                        <div className="flex items-center gap-3">
                          {round.amount && (
                            <span className="text-green-400 font-medium">
                              ${(round.amount / 1000000).toFixed(1)}M
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
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  Publicly Traded
                  {funding.ipo_date && ` (IPO: ${new Date(funding.ipo_date).getFullYear()})`}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Social Media */}
        {social_media && (social_media.linkedin_followers || social_media.twitter_followers || social_media.raw) && (
          <SectionCard icon={Share2} title="Social Presence" iconColor="purple">
            <div className="grid grid-cols-3 gap-3">
              {social_media.linkedin_followers && (
                <div className="text-center p-2 bg-white/[0.03] rounded-lg">
                  <Linkedin className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">
                    {social_media.linkedin_followers >= 1000
                      ? `${(social_media.linkedin_followers / 1000).toFixed(1)}K`
                      : social_media.linkedin_followers}
                  </p>
                  <p className="text-[10px] text-white/40">Followers</p>
                </div>
              )}
              {social_media.twitter_followers && (
                <div className="text-center p-2 bg-white/[0.03] rounded-lg">
                  <Twitter className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">
                    {social_media.twitter_followers >= 1000
                      ? `${(social_media.twitter_followers / 1000).toFixed(1)}K`
                      : social_media.twitter_followers}
                  </p>
                  <p className="text-[10px] text-white/40">Followers</p>
                </div>
              )}
              {social_media.facebook_followers && (
                <div className="text-center p-2 bg-white/[0.03] rounded-lg">
                  <Heart className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">
                    {social_media.facebook_followers >= 1000
                      ? `${(social_media.facebook_followers / 1000).toFixed(1)}K`
                      : social_media.facebook_followers}
                  </p>
                  <p className="text-[10px] text-white/40">Likes</p>
                </div>
              )}
            </div>
            {social_media.engagement_rate && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <DataRow label="Engagement Rate" value={`${social_media.engagement_rate}%`} icon={Activity} />
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {/* Row 3: Tech Stack (full width) */}
      {technographics && (technographics.tech_stack?.length > 0 || technographics.raw) && (
        <SectionCard
          icon={Layers}
          title="Technology Stack"
          iconColor="cyan"
          badge={
            technographics.tech_count && (
              <span className="text-xs text-white/40">{technographics.tech_count} technologies</span>
            )
          }
        >
          {technographics.tech_stack?.length > 0 ? (
            <div className="space-y-4">
              {technographics.tech_stack.slice(0, 6).map((cat, idx) => (
                <div key={idx}>
                  <p className="text-xs text-white/50 mb-2 capitalize">{cat.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.technologies.slice(0, 8).map((tech, tidx) => (
                      <TechBadge key={tidx} name={tech} />
                    ))}
                    {cat.technologies.length > 8 && (
                      <span className="px-2 py-1 text-[11px] text-white/40">
                        +{cat.technologies.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">Technology data available in raw format</p>
          )}
        </SectionCard>
      )}

      {/* Row 4: Website Traffic + Competitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Website Traffic */}
        {website_traffic && (website_traffic.monthly_visits || website_traffic.raw) && (
          <SectionCard icon={Activity} title="Website Traffic" iconColor="orange">
            <div className="grid grid-cols-2 gap-3">
              {website_traffic.monthly_visits && (
                <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                  <Eye className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">
                    {website_traffic.monthly_visits >= 1000000
                      ? `${(website_traffic.monthly_visits / 1000000).toFixed(1)}M`
                      : website_traffic.monthly_visits >= 1000
                      ? `${(website_traffic.monthly_visits / 1000).toFixed(0)}K`
                      : website_traffic.monthly_visits}
                  </p>
                  <p className="text-[10px] text-white/40">Monthly Visits</p>
                </div>
              )}
              {website_traffic.bounce_rate && (
                <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                  <Percent className="w-4 h-4 text-red-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{website_traffic.bounce_rate}%</p>
                  <p className="text-[10px] text-white/40">Bounce Rate</p>
                </div>
              )}
              {website_traffic.avg_visit_duration && (
                <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                  <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{website_traffic.avg_visit_duration}</p>
                  <p className="text-[10px] text-white/40">Avg Duration</p>
                </div>
              )}
              {website_traffic.page_views && (
                <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                  <BarChart3 className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">
                    {website_traffic.page_views >= 1000
                      ? `${(website_traffic.page_views / 1000).toFixed(0)}K`
                      : website_traffic.page_views}
                  </p>
                  <p className="text-[10px] text-white/40">Page Views</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Competitors */}
        {competitive_landscape && (competitive_landscape.competitors?.length > 0 || competitive_landscape.raw) && (
          <SectionCard icon={Target} title="Competitive Landscape" iconColor="red">
            {competitive_landscape.competitors?.length > 0 ? (
              <div className="space-y-2">
                {competitive_landscape.competitors.slice(0, 5).map((comp, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white/[0.05] text-white/50 flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-white">{comp.name}</span>
                    </div>
                    {comp.similarity_score && (
                      <span className="text-xs text-white/40">
                        {Math.round(comp.similarity_score * 100)}% similar
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/40">Competitor data available</p>
            )}
          </SectionCard>
        )}
      </div>

      {/* Row 5: Workforce Trends */}
      {workforce && (workforce.growth_rate || workforce.departments || workforce.raw) && (
        <SectionCard icon={Users} title="Workforce Trends" iconColor="indigo">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {workforce.total_employees && (
              <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                <Users className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{workforce.total_employees.toLocaleString()}</p>
                <p className="text-[10px] text-white/40">Total Employees</p>
              </div>
            )}
            {workforce.growth_rate && (
              <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-400">+{workforce.growth_rate}%</p>
                <p className="text-[10px] text-white/40">Growth Rate</p>
              </div>
            )}
            {workforce.hiring_trend && (
              <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                <Briefcase className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white capitalize">{workforce.hiring_trend}</p>
                <p className="text-[10px] text-white/40">Hiring Trend</p>
              </div>
            )}
            {workforce.attrition_rate && (
              <div className="p-3 bg-white/[0.03] rounded-lg text-center">
                <TrendingDown className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-400">{workforce.attrition_rate}%</p>
                <p className="text-[10px] text-white/40">Attrition Rate</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
};

export default CompanyIntelligenceReport;
