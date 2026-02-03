/**
 * Growth Nest Recommendations Page
 * AI-matched data nests based on campaign configuration
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  SortAsc,
  Users,
  Building2,
  Globe,
  Briefcase,
  DollarSign,
  Eye,
  ShoppingCart,
  Package,
  Trash2,
  Coins,
  TrendingUp,
  Target,
  Zap,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

// Constants
const STORAGE_KEY = 'growth_campaign_draft';

// Nests are loaded from database/marketplace

// Related industries mapping
const RELATED_INDUSTRIES = {
  Technology: ['E-commerce', 'Finance', 'Professional Services'],
  Healthcare: ['Professional Services'],
  Finance: ['Technology', 'Professional Services'],
  'E-commerce': ['Technology', 'Retail'],
  Manufacturing: ['Technology'],
  'Professional Services': ['Technology', 'Finance', 'Healthcare'],
  Retail: ['E-commerce', 'Technology'],
  Education: ['Technology'],
};

// Region labels
const REGION_LABELS = {
  north_america: 'North America',
  europe: 'Europe',
  apac: 'APAC',
  latam: 'LATAM',
  middle_east: 'Middle East',
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Glass card component
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Match scoring functions
function isRelatedIndustry(nestIndustry, campaignIndustries) {
  for (const industry of campaignIndustries) {
    if (RELATED_INDUSTRIES[industry]?.includes(nestIndustry)) {
      return true;
    }
  }
  return false;
}

function hasRegionOverlap(nestRegion, campaignRegions) {
  return campaignRegions.includes(nestRegion);
}

function countTitleOverlap(nestTitles, campaignTitles) {
  if (!campaignTitles?.length) return 0;

  let matches = 0;
  const normalizedCampaignTitles = campaignTitles.map((t) =>
    t.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  for (const nestTitle of nestTitles) {
    const normalizedNestTitle = nestTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      normalizedCampaignTitles.some(
        (ct) =>
          normalizedNestTitle.includes(ct) ||
          ct.includes(normalizedNestTitle) ||
          normalizedNestTitle === ct
      )
    ) {
      matches++;
    }
  }
  return matches;
}

function hasSizeOverlap(nestSizes, campaignSizes) {
  if (!campaignSizes?.length) return true;
  return nestSizes.some((size) => campaignSizes.includes(size));
}

function calculateMatchScore(nest, campaignConfig) {
  if (!campaignConfig) return 50;

  let score = 0;
  let maxScore = 0;

  // Industry match (30 points)
  maxScore += 30;
  if (campaignConfig.industries?.includes(nest.industry)) {
    score += 30;
  } else if (isRelatedIndustry(nest.industry, campaignConfig.industries || [])) {
    score += 15;
  }

  // Region match (20 points)
  maxScore += 20;
  if (hasRegionOverlap(nest.region, campaignConfig.regions || [])) {
    score += 20;
  }

  // Job title overlap (30 points)
  if (campaignConfig.jobTitles?.length > 0) {
    maxScore += 30;
    const titleOverlap = countTitleOverlap(nest.titles, campaignConfig.jobTitles);
    score += Math.min((titleOverlap / campaignConfig.jobTitles.length) * 30, 30);
  }

  // Company size match (20 points)
  maxScore += 20;
  if (hasSizeOverlap(nest.company_sizes, campaignConfig.companySizes || [])) {
    score += 20;
  }

  if (maxScore === 0) return 50;
  return Math.round((score / maxScore) * 100);
}

function generateMatchInsight(nest, campaignConfig, matchScore) {
  const insights = [];

  if (campaignConfig?.industries?.includes(nest.industry)) {
    insights.push(`Perfect industry match with ${nest.industry}`);
  }

  const titleOverlap = countTitleOverlap(nest.titles, campaignConfig?.jobTitles || []);
  if (titleOverlap > 0) {
    insights.push(
      `Contains ${titleOverlap} of your target job titles including ${nest.titles[0]}`
    );
  }

  if (hasRegionOverlap(nest.region, campaignConfig?.regions || [])) {
    insights.push(`Covers your target region: ${REGION_LABELS[nest.region]}`);
  }

  if (nest.verified_rate >= 90) {
    insights.push(`High data quality with ${nest.verified_rate}% verified contacts`);
  }

  if (insights.length === 0) {
    return `This nest contains ${nest.lead_count.toLocaleString()} contacts that may align with your outreach goals.`;
  }

  return insights.slice(0, 2).join('. ') + '.';
}

function getMatchBadge(score) {
  if (score >= 90) {
    return {
      label: 'Excellent Match',
      color: 'bg-green-500/20 text-green-400 border-green-500/50',
      icon: CheckCircle2,
    };
  } else if (score >= 70) {
    return {
      label: 'Good Match',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      icon: TrendingUp,
    };
  } else if (score >= 50) {
    return {
      label: 'Partial Match',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      icon: AlertCircle,
    };
  } else {
    return {
      label: 'Low Match',
      color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50',
      icon: Info,
    };
  }
}

// Nest Card Component
function NestCard({
  nest,
  campaignConfig,
  matchScore,
  isSelected,
  isOwned,
  onSelect,
  onPreview,
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = getMatchBadge(matchScore);
  const BadgeIcon = badge.icon;
  const insight = generateMatchInsight(nest, campaignConfig, matchScore);

  const titleOverlap = countTitleOverlap(nest.titles, campaignConfig?.jobTitles || []);
  const industryMatch = campaignConfig?.industries?.includes(nest.industry);
  const regionMatch = hasRegionOverlap(nest.region, campaignConfig?.regions || []);
  const sizeMatch = hasSizeOverlap(nest.company_sizes, campaignConfig?.companySizes || []);

  return (
    <motion.div variants={cardVariants}>
      <GlassCard
        className={`p-4 h-full flex flex-col transition-all ${
          isSelected
            ? 'border-indigo-500/50 ring-1 ring-indigo-500/30'
            : 'hover:border-zinc-700'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                {nest.industry}
              </Badge>
              <Badge className="bg-zinc-800 text-zinc-300 text-xs">
                {REGION_LABELS[nest.region]}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white">{nest.name}</h3>
          </div>
          <Badge className={`${badge.color} flex items-center gap-1`}>
            <BadgeIcon className="w-3 h-3" />
            {matchScore}%
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-lg font-bold text-white">
              {nest.lead_count.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500">Leads</p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800/50">
            <p className="text-lg font-bold text-indigo-400">{nest.price_credits}</p>
            <p className="text-xs text-zinc-500">Credits</p>
          </div>
        </div>

        {/* AI Insight */}
        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-zinc-300">{insight}</p>
          </div>
        </div>

        {/* Match Breakdown (Expandable) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <span>Match Breakdown</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 py-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Industry</span>
                  <span className="flex items-center gap-1">
                    {industryMatch ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Match</span>
                      </>
                    ) : isRelatedIndustry(
                        nest.industry,
                        campaignConfig?.industries || []
                      ) ? (
                      <>
                        <span className="text-amber-400">Related</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-500">No match</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Region</span>
                  <span className="flex items-center gap-1">
                    {regionMatch ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Match</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-500">No match</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Job Titles</span>
                  <span
                    className={
                      titleOverlap > 0 ? 'text-green-400' : 'text-zinc-500'
                    }
                  >
                    {titleOverlap} of {campaignConfig?.jobTitles?.length || 0} match
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Company Size</span>
                  <span className="flex items-center gap-1">
                    {sizeMatch ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Match</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-500">No match</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Sample Companies */}
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Sample Companies:</p>
                  <p className="text-sm text-zinc-400">
                    {nest.sample_companies.join(', ')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(nest)}
            className="flex-1 border-zinc-700 text-zinc-300"
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {isOwned ? (
            <Button
              size="sm"
              disabled
              className="flex-1 bg-zinc-700 text-zinc-400"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Owned
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onSelect(nest.id)}
              className={`flex-1 ${
                isSelected
                  ? 'bg-indigo-600 hover:bg-indigo-500'
                  : 'bg-zinc-700 hover:bg-zinc-600'
              } text-white`}
            >
              {isSelected ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Selected
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Select
                </>
              )}
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Preview Modal Component
function PreviewModal({ nest, isOpen, onClose }) {
  if (!nest) return null;

  // Mock sample data
  const sampleData = [
    {
      name: 'Sarah Chen',
      title: nest.titles[0],
      company: nest.sample_companies[0],
      location: REGION_LABELS[nest.region],
    },
    {
      name: 'Michael Roberts',
      title: nest.titles[1] || nest.titles[0],
      company: nest.sample_companies[1] || nest.sample_companies[0],
      location: REGION_LABELS[nest.region],
    },
    {
      name: 'Emily Watson',
      title: nest.titles[2] || nest.titles[0],
      company: nest.sample_companies[2] || nest.sample_companies[0],
      location: REGION_LABELS[nest.region],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">{nest.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-zinc-400">{nest.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <p className="text-xl font-bold text-white">
                {nest.lead_count.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">Total Leads</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <p className="text-xl font-bold text-indigo-400">{nest.price_credits}</p>
              <p className="text-xs text-zinc-500">Credits</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <p className="text-xl font-bold text-green-400">{nest.verified_rate}%</p>
              <p className="text-xs text-zinc-500">Verified</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <p className="text-xl font-bold text-white">{nest.data_freshness}</p>
              <p className="text-xs text-zinc-500">Updated</p>
            </div>
          </div>

          {/* Job Titles */}
          <div>
            <p className="text-sm text-zinc-400 mb-2">Job Titles Included:</p>
            <div className="flex flex-wrap gap-2">
              {nest.titles.map((title) => (
                <Badge key={title} className="bg-zinc-800 text-zinc-300">
                  {title}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sample Data */}
          <div>
            <p className="text-sm text-zinc-400 mb-2">Sample Data (Anonymized):</p>
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left text-xs text-zinc-400 p-2">Name</th>
                    <th className="text-left text-xs text-zinc-400 p-2">Title</th>
                    <th className="text-left text-xs text-zinc-400 p-2">Company</th>
                    <th className="text-left text-xs text-zinc-400 p-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="text-sm text-white p-2">{row.name}</td>
                      <td className="text-sm text-zinc-400 p-2">{row.title}</td>
                      <td className="text-sm text-zinc-400 p-2">{row.company}</td>
                      <td className="text-sm text-zinc-400 p-2">{row.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Selected Nests Sidebar Component
function SelectedNestsSidebar({
  selectedNests,
  nests,
  userCredits,
  onRemove,
  onContinue,
}) {
  const selectedNestData = nests.filter((n) => selectedNests.includes(n.id));
  const totalLeads = selectedNestData.reduce((sum, n) => sum + n.lead_count, 0);
  const totalCredits = selectedNestData.reduce((sum, n) => sum + n.price_credits, 0);
  const hasEnoughCredits = userCredits >= totalCredits;

  return (
    <GlassCard className="p-4 sticky top-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-indigo-400" />
        Selected Nests
      </h3>

      {selectedNests.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">
          Select nests to add to your campaign
        </p>
      ) : (
        <div className="space-y-3">
          {selectedNestData.map((nest) => (
            <div
              key={nest.id}
              className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{nest.name}</p>
                <p className="text-xs text-zinc-500">
                  {nest.lead_count.toLocaleString()} leads • {nest.price_credits} credits
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(nest.id)}
                className="text-zinc-500 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total Leads</span>
          <span className="text-white font-medium">
            {totalLeads.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total Credits</span>
          <span className="text-indigo-400 font-medium">{totalCredits}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Your Credits</span>
          <span
            className={`font-medium ${
              hasEnoughCredits ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {userCredits.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={selectedNests.length === 0}
        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        Continue with {selectedNests.length} Nest{selectedNests.length !== 1 ? 's' : ''}
      </Button>

      {!hasEnoughCredits && selectedNests.length > 0 && (
        <p className="text-xs text-red-400 mt-2 text-center">
          You need {totalCredits - userCredits} more credits
        </p>
      )}
    </GlassCard>
  );
}

// Main Component
export default function GrowthNestRecommendations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();

  // State
  const [campaignConfig, setCampaignConfig] = useState(null);
  const [nests, setNests] = useState([]);
  const [selectedNests, setSelectedNests] = useState([]);
  const [purchasedNests, setPurchasedNests] = useState([]);
  const [userCredits, setUserCredits] = useState(0);
  const [previewNest, setPreviewNest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('match');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  const orgId = user?.organization_id || user?.company_id;

  // Load campaign config from localStorage and fetch nests
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Load campaign config
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setCampaignConfig(parsed);
        } catch (e) {
          console.error('Failed to parse campaign config:', e);
        }
      }

      // Fetch available nests from growth_nests marketplace
      if (orgId) {
        try {
          const { data: nestsData, error } = await supabase
            .from('growth_nests')
            .select('*')
            .eq('is_active', true)
            .order('is_featured', { ascending: false })
            .order('lead_count', { ascending: false });

          if (!error && nestsData) {
            setNests(nestsData.map(n => ({
              id: n.id,
              name: n.name,
              industry: n.industry || 'General',
              region: n.region || 'Global',
              lead_count: n.lead_count || 0,
              price_credits: n.price_credits || 99,
              company_sizes: n.company_sizes || [],
              titles: n.titles || [],
              description: n.description || n.short_description || '',
              sample_companies: n.preview_data || [],
              data_freshness: 'Recent',
              verified_rate: 85,
              badge: n.badge,
              is_featured: n.is_featured,
              included_fields: n.included_fields || [],
            })));
          }
        } catch (error) {
          console.error('Error fetching nests:', error);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [orgId]);

  // Fetch user credits
  useEffect(() => {
    async function fetchCredits() {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single();

        if (data) {
          setUserCredits(data.credits || 0);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    }

    fetchCredits();
  }, [user?.id]);

  // Calculate match scores and sort
  const scoredNests = useMemo(() => {
    return nests
      .map((nest) => ({
        ...nest,
        matchScore: calculateMatchScore(nest, campaignConfig),
      }))
      .filter((nest) => {
        // Search filter
        if (
          searchQuery &&
          !nest.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        // Industry filter
        if (filterIndustry !== 'all' && nest.industry !== filterIndustry) {
          return false;
        }
        // Region filter
        if (filterRegion !== 'all' && nest.region !== filterRegion) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'match':
            return b.matchScore - a.matchScore;
          case 'price_low':
            return a.price_credits - b.price_credits;
          case 'price_high':
            return b.price_credits - a.price_credits;
          case 'leads':
            return b.lead_count - a.lead_count;
          default:
            return b.matchScore - a.matchScore;
        }
      });
  }, [nests, campaignConfig, searchQuery, sortBy, filterIndustry, filterRegion]);

  // Get unique industries and regions for filters
  const uniqueIndustries = [...new Set(nests.map((n) => n.industry))];
  const uniqueRegions = [...new Set(nests.map((n) => n.region))];

  // Handlers
  const toggleNestSelection = (nestId) => {
    setSelectedNests((prev) =>
      prev.includes(nestId)
        ? prev.filter((id) => id !== nestId)
        : [...prev, nestId]
    );
  };

  const handleContinue = () => {
    if (selectedNests.length === 0) return;

    // Update campaign config with selected nests
    const updatedConfig = {
      ...campaignConfig,
      selectedNestIds: selectedNests,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));

    // Navigate to workspace setup/purchase flow
    toast.success(`Selected ${selectedNests.length} nests for your campaign`);
    navigate('/growth/workspace/setup');
  };

  // ICP summary badges
  const icpBadges = useMemo(() => {
    if (!campaignConfig) return [];

    const badges = [];
    if (campaignConfig.industries?.length > 0) {
      badges.push(...campaignConfig.industries.slice(0, 2));
    }
    if (campaignConfig.companySizes?.length > 0) {
      badges.push(`${campaignConfig.companySizes[0]} employees`);
    }
    if (campaignConfig.jobTitles?.length > 0) {
      badges.push(campaignConfig.jobTitles[0]);
    }
    if (campaignConfig.regions?.length > 0) {
      badges.push(REGION_LABELS[campaignConfig.regions[0]]);
    }
    return badges.slice(0, 4);
  }, [campaignConfig]);

  const highMatchCount = scoredNests.filter((n) => n.matchScore >= 70).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-6 lg:px-8 xl:px-12 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/growth/campaign/new')}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Recommended Data Nests
              </h1>
              <p className="text-zinc-400">
                AI-matched to your campaign:{' '}
                <span className="text-indigo-400">
                  {campaignConfig?.campaignName || 'Your Campaign'}
                </span>
              </p>
            </div>
          </div>

          {/* ICP Summary Badges */}
          {icpBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {icpBadges.map((badge, i) => (
                <Badge
                  key={i}
                  className="bg-zinc-800 text-zinc-300 border-zinc-700"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendation Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">AI-Powered Matching</h3>
                <p className="text-sm text-zinc-300 mt-1">
                  We analyzed your ideal customer profile and found{' '}
                  <span className="text-indigo-400 font-medium">
                    {highMatchCount} nests
                  </span>{' '}
                  with high match potential.
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  Matching based on: Industry, Company Size, Job Titles, Region
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nests..."
                className="pl-9 bg-zinc-900/50 border-zinc-700"
              />
            </div>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-700">
              <SortAsc className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Match Score</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="leads">Lead Count</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterIndustry} onValueChange={setFilterIndustry}>
            <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-700">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {uniqueIndustries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRegion} onValueChange={setFilterRegion}>
            <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-700">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {uniqueRegions.map((region) => (
                <SelectItem key={region} value={region}>
                  {REGION_LABELS[region]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Nest Grid */}
          <div className="flex-1">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {scoredNests.map((nest) => (
                <NestCard
                  key={nest.id}
                  nest={nest}
                  campaignConfig={campaignConfig}
                  matchScore={nest.matchScore}
                  isSelected={selectedNests.includes(nest.id)}
                  isOwned={purchasedNests.includes(nest.id)}
                  onSelect={toggleNestSelection}
                  onPreview={setPreviewNest}
                />
              ))}
            </motion.div>

            {scoredNests.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No nests match your filters</p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterIndustry('all');
                    setFilterRegion('all');
                  }}
                  className="mt-2 text-indigo-400"
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 hidden lg:block">
            <SelectedNestsSidebar
              selectedNests={selectedNests}
              nests={nests}
              userCredits={userCredits}
              onRemove={(id) =>
                setSelectedNests((prev) => prev.filter((nid) => nid !== id))
              }
              onContinue={handleContinue}
            />
          </div>
        </div>

        {/* Mobile Selected Nests Bar */}
        {selectedNests.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 lg:hidden">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-white font-medium">
                  {selectedNests.length} nest{selectedNests.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
                <p className="text-sm text-zinc-400">
                  {nests
                    .filter((n) => selectedNests.includes(n.id))
                    .reduce((sum, n) => sum + n.price_credits, 0)}{' '}
                  credits total
                </p>
              </div>
              <Button
                onClick={handleContinue}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        nest={previewNest}
        isOpen={!!previewNest}
        onClose={() => setPreviewNest(null)}
      />
    </div>
  );
}
