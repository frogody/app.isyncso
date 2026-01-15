import React, { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
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
  Cpu,
  Layers,
  Rocket,
  Briefcase,
  ChevronRight,
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
 * InfoItem - Simple info display row
 */
const InfoItem = ({ icon: Icon, label, value, link }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="p-1.5 rounded-lg bg-white/[0.04] flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-white/40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-white truncate">{value}</p>
        )}
      </div>
    </div>
  );
};

/**
 * TechBadge - Tech stack badge
 */
const TechBadge = ({ name }) => (
  <span className="px-2 py-1 text-xs bg-white/[0.06] text-white/70 rounded-md border border-white/[0.08]">
    {name}
  </span>
);

/**
 * FundingRoundCard - Display funding round
 */
const FundingRoundCard = ({ round }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-400" />
      <span className="text-sm text-white">{round.round_type || "Funding"}</span>
    </div>
    <div className="flex items-center gap-4">
      {round.amount && (
        <span className="text-sm font-medium text-green-400">
          ${(round.amount / 1000000).toFixed(1)}M
        </span>
      )}
      {round.date && (
        <span className="text-xs text-white/40">{new Date(round.date).getFullYear()}</span>
      )}
    </div>
  </div>
);

/**
 * TechCategoryCard - Display tech category
 */
const TechCategoryCard = ({ category, technologies }) => {
  const categoryIcons = {
    "Analytics": BarChart3,
    "Cloud": Cloud,
    "Database": Database,
    "Security": Shield,
    "Development": Code,
    "Marketing": Rocket,
    "Sales": Briefcase,
  };

  const Icon = categoryIcons[category] || Cpu;

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white/70 capitalize">{category}</span>
        <span className="text-xs text-white/30">({technologies.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {technologies.slice(0, 5).map((tech, idx) => (
          <TechBadge key={idx} name={tech} />
        ))}
        {technologies.length > 5 && (
          <span className="px-2 py-1 text-xs text-white/40">
            +{technologies.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * CompanyIntelligenceReport - Reusable company intelligence display
 *
 * @param {Object} props
 * @param {Object} props.intelligence - Company intelligence data from Explorium
 * @param {string} props.companyName - Company name for generating new intel
 * @param {string} props.companyDomain - Company domain for generating new intel
 * @param {string} props.entityType - Type of entity ("candidate", "prospect", "contact")
 * @param {string} props.entityId - ID of the entity to update after generation
 * @param {Function} props.onIntelligenceGenerated - Callback when new intelligence is generated
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

  const { firmographics, funding, technographics, enriched_at } = intelligence || {};

  const hasData = firmographics || funding || technographics;

  // No data state with generate button
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
            Generate intelligence using Explorium to get firmographics, funding data, and tech stack information.
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
                  Generating...
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
      {/* Header with refresh */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Company Intelligence</h3>
            {enriched_at && (
              <p className="text-xs text-white/40">
                Updated {new Date(enriched_at).toLocaleDateString()}
              </p>
            )}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Firmographics */}
        {firmographics && (
          <motion.div
            variants={itemVariants}
            className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4"
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
              <Building2 className="w-4 h-4 text-white/50" />
              <h4 className="font-medium text-white text-sm">Company Profile</h4>
            </div>
            <div className="space-y-1">
              <InfoItem icon={Building2} label="Company" value={firmographics.company_name} />
              <InfoItem icon={Factory} label="Industry" value={firmographics.industry} />
              <InfoItem icon={Users} label="Employees" value={firmographics.employee_count?.toLocaleString() || firmographics.employee_count_range} />
              <InfoItem icon={DollarSign} label="Revenue" value={firmographics.revenue} />
              <InfoItem icon={Calendar} label="Founded" value={firmographics.founded_year} />
              <InfoItem icon={Briefcase} label="Type" value={firmographics.company_type} />
              <InfoItem icon={MapPin} label="HQ" value={firmographics.headquarters} />
              <InfoItem icon={Globe} label="Website" value={firmographics.website} link={firmographics.website?.startsWith("http") ? firmographics.website : `https://${firmographics.website}`} />
              <InfoItem icon={Linkedin} label="LinkedIn" value="View Profile" link={firmographics.linkedin_url} />
            </div>
            {firmographics.description && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-white/40 mb-1">About</p>
                <p className="text-xs text-white/60 line-clamp-3">{firmographics.description}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Funding & Acquisitions */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Funding */}
          {funding && (funding.total_funding || funding.funding_rounds?.length > 0) && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-400" />
                  <h4 className="font-medium text-white text-sm">Funding</h4>
                </div>
                {funding.funding_stage && (
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                    {funding.funding_stage}
                  </span>
                )}
              </div>

              {funding.total_funding && (
                <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-xs text-green-400/70 mb-1">Total Raised</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${(funding.total_funding / 1000000).toFixed(1)}M
                  </p>
                  {funding.last_funding_date && (
                    <p className="text-xs text-white/40 mt-1">
                      Last round: {new Date(funding.last_funding_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {funding.funding_rounds?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Funding Rounds</p>
                  {funding.funding_rounds.slice(0, 4).map((round, idx) => (
                    <FundingRoundCard key={idx} round={round} />
                  ))}
                  {funding.funding_rounds.length > 4 && (
                    <p className="text-xs text-white/40 mt-2">
                      +{funding.funding_rounds.length - 4} more rounds
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Acquisitions */}
          {funding?.acquisitions?.length > 0 && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/[0.06]">
                <Rocket className="w-4 h-4 text-purple-400" />
                <h4 className="font-medium text-white text-sm">Acquisitions</h4>
              </div>
              {funding.acquisitions.map((acq, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-sm text-white">{acq.acquired_by || "Acquired"}</span>
                  {acq.acquisition_date && (
                    <span className="text-xs text-white/40">
                      {new Date(acq.acquisition_date).getFullYear()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No funding data */}
          {(!funding || (!funding.total_funding && !funding.funding_rounds?.length)) && (
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="w-4 h-4 text-white/30" />
                <h4 className="font-medium text-white/50 text-sm">Funding</h4>
              </div>
              <p className="text-sm text-white/30">No funding data available</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Tech Stack - Full Width */}
      {technographics?.tech_stack?.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-4"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h4 className="font-medium text-white text-sm">Technology Stack</h4>
            </div>
            <span className="text-xs text-white/40">
              {technographics.tech_count} technologies detected
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {technographics.tech_stack.slice(0, 6).map((cat, idx) => (
              <TechCategoryCard
                key={idx}
                category={cat.category}
                technologies={cat.technologies}
              />
            ))}
          </div>
          {technographics.tech_stack.length > 6 && (
            <p className="text-xs text-white/40 mt-3">
              +{technographics.tech_stack.length - 6} more categories
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CompanyIntelligenceReport;
