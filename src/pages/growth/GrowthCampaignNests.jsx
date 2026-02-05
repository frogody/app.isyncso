/**
 * Growth Campaign Nests Page
 * Step 2 of campaign journey: select prospect nests for the campaign
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Search, Filter,
  Users, Building2, Globe, Briefcase, Target,
  ShoppingCart, Package, Sparkles, Plus, Minus,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronRight,
  Database, Layers, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import JourneyProgressBar from '@/components/growth/campaigns/JourneyProgressBar';

// Glass card helper
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Match scoring (reuse logic from GrowthNestRecommendations)
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

function calculateMatchScore(nest, campaignConfig) {
  if (!campaignConfig) return 50;
  let score = 0, maxScore = 0;

  // Industry (30pts)
  maxScore += 30;
  const industries = campaignConfig.industries || [];
  if (industries.includes(nest.industry)) score += 30;
  else if (industries.some(i => RELATED_INDUSTRIES[i]?.includes(nest.industry))) score += 15;

  // Region (20pts)
  maxScore += 20;
  if ((campaignConfig.regions || []).includes(nest.region)) score += 20;

  // Titles (30pts)
  const targetTitles = campaignConfig.job_titles || [];
  if (targetTitles.length > 0) {
    maxScore += 30;
    const normalizedTargets = targetTitles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    let titleMatches = 0;
    for (const nt of (nest.titles || [])) {
      const norm = nt.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedTargets.some(ct => norm.includes(ct) || ct.includes(norm))) titleMatches++;
    }
    score += Math.min((titleMatches / targetTitles.length) * 30, 30);
  }

  // Company size (20pts)
  maxScore += 20;
  const sizes = campaignConfig.company_sizes || [];
  if (sizes.length === 0 || (nest.company_sizes || []).some(s => sizes.includes(s))) score += 20;

  return maxScore === 0 ? 50 : Math.round((score / maxScore) * 100);
}

// TABS
const TABS = [
  { id: 'recommended', label: 'Recommended', icon: Sparkles },
  { id: 'my_nests', label: 'My Nests', icon: Package },
  { id: 'custom', label: 'Build Custom', icon: Layers },
];

export default function GrowthCampaignNests() {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const { user } = useUser();
  const orgId = user?.organization_id || user?.company_id;

  // State
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // Nest data
  const [marketplaceNests, setMarketplaceNests] = useState([]);
  const [purchasedNests, setPurchasedNests] = useState([]);
  const [selectedNestIds, setSelectedNestIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Custom nest builder
  const [expandedNest, setExpandedNest] = useState(null);
  const [nestProspects, setNestProspects] = useState({});  // { nestId: prospects[] }
  const [selectedProspects, setSelectedProspects] = useState({}); // { nestId: Set<prospectId> }

  // Load campaign
  useEffect(() => {
    if (!campaignId) return;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('growth_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) { toast.error('Campaign not found'); navigate('/growth/campaigns'); return; }
      setCampaign(data);
      if (data.selected_nest_ids?.length) setSelectedNestIds(data.selected_nest_ids);
      setLoading(false);
    }
    load();
  }, [campaignId]);

  // Load marketplace nests
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('growth_nests')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false });
      if (data) setMarketplaceNests(data);
    }
    load();
  }, []);

  // Load purchased nests
  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      const { data: purchases } = await supabase
        .from('growth_nest_purchases')
        .select('nest_id, workspace_id, purchased_at, growth_nests(*)')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      if (purchases) {
        setPurchasedNests(purchases.map(p => ({ ...p.growth_nests, purchase: p })));
      }
    }
    load();
  }, [user?.id]);

  // Campaign config for match scoring
  const campaignConfig = useMemo(() => {
    if (!campaign) return null;
    return campaign.target_audience || {};
  }, [campaign]);

  // Score and sort marketplace nests
  const scoredNests = useMemo(() => {
    return marketplaceNests
      .map(nest => ({ ...nest, matchScore: calculateMatchScore(nest, campaignConfig) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .filter(n => !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase()) || (n.industry || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [marketplaceNests, campaignConfig, searchQuery]);

  // Toggle nest selection
  const toggleNest = (nestId) => {
    setSelectedNestIds(prev =>
      prev.includes(nestId) ? prev.filter(id => id !== nestId) : [...prev, nestId]
    );
  };

  // Load prospects for custom nest builder
  const loadNestProspects = async (nestId) => {
    if (nestProspects[nestId]) return;
    // Try to load from preview_data first (marketplace nests have this)
    const nest = [...marketplaceNests, ...purchasedNests].find(n => n.id === nestId);
    if (nest?.preview_data?.length) {
      setNestProspects(prev => ({ ...prev, [nestId]: nest.preview_data.slice(0, 50) }));
      return;
    }
    // Otherwise try growth_nest_items -> prospects
    const { data } = await supabase
      .from('growth_nest_items')
      .select('prospect_id, prospects(id, first_name, last_name, email, job_title, location)')
      .eq('growth_nest_id', nestId)
      .limit(50);
    if (data) {
      setNestProspects(prev => ({
        ...prev,
        [nestId]: data.filter(d => d.prospects).map(d => d.prospects),
      }));
    }
  };

  // Toggle prospect in custom nest
  const toggleProspect = (nestId, prospectId) => {
    setSelectedProspects(prev => {
      const current = new Set(prev[nestId] || []);
      if (current.has(prospectId)) current.delete(prospectId);
      else current.add(prospectId);
      return { ...prev, [nestId]: current };
    });
  };

  // Total custom prospects
  const totalCustomProspects = useMemo(() => {
    return Object.values(selectedProspects).reduce((sum, set) => sum + set.size, 0);
  }, [selectedProspects]);

  // Continue handler
  const handleContinue = async () => {
    if (selectedNestIds.length === 0 && totalCustomProspects === 0) {
      toast.error('Select at least one nest or build a custom selection');
      return;
    }
    setSaving(true);
    try {
      // If custom nest, save to growth_custom_nests
      let customNestId = null;
      if (activeTab === 'custom' && totalCustomProspects > 0) {
        const allProspectIds = [];
        const sourceNests = [];
        for (const [nestId, prospectSet] of Object.entries(selectedProspects)) {
          if (prospectSet.size > 0) {
            allProspectIds.push(...Array.from(prospectSet));
            const nest = purchasedNests.find(n => n.id === nestId);
            sourceNests.push({ nest_id: nestId, name: nest?.name, count: prospectSet.size });
          }
        }
        const { data: customNest, error } = await supabase
          .from('growth_custom_nests')
          .insert({
            campaign_id: campaignId,
            organization_id: orgId,
            name: `Custom - ${campaign?.name || 'Campaign'}`,
            source_nests: sourceNests,
            total_rows: allProspectIds.length,
            prospect_ids: allProspectIds,
          })
          .select()
          .single();
        if (error) throw error;
        customNestId = customNest.id;
      }

      // Update campaign
      await supabase
        .from('growth_campaigns')
        .update({
          selected_nest_ids: selectedNestIds,
          journey_phase: 'enrich',
          updated_date: new Date().toISOString(),
        })
        .eq('id', campaignId);

      navigate(`/growth/campaign/${campaignId}/enrich`);
      toast.success('Nests selected! Time to enrich your prospects.');
    } catch (error) {
      console.error('Failed to save nest selection:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // Render nest card
  const NestCard = ({ nest, matchScore, isSelected, onToggle, isPurchased }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 cursor-pointer transition-all ${
        isSelected
          ? 'bg-indigo-500/5 border-indigo-500/50'
          : 'bg-zinc-900/50 border-white/5 hover:border-zinc-600'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">{nest.name}</h3>
            {nest.is_featured && <Badge className="bg-amber-500/20 text-amber-400 text-xs">Featured</Badge>}
            {isPurchased && <Badge className="bg-green-500/20 text-green-400 text-xs">Owned</Badge>}
          </div>
          <p className="text-zinc-400 text-sm line-clamp-2">{nest.short_description || nest.description}</p>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-indigo-500 text-black' : 'bg-zinc-800 border border-zinc-700'
        }`}>
          {isSelected && <Check className="w-4 h-4" />}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-zinc-500">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{nest.lead_count?.toLocaleString() || 0}</span>
        {nest.industry && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{nest.industry}</span>}
        {nest.region && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{nest.region}</span>}
      </div>

      {matchScore != null && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                matchScore >= 80 ? 'bg-green-500' : matchScore >= 60 ? 'bg-indigo-500' : matchScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${matchScore}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${
            matchScore >= 80 ? 'text-green-400' : matchScore >= 60 ? 'text-indigo-400' : matchScore >= 40 ? 'text-amber-400' : 'text-red-400'
          }`}>{matchScore}% match</span>
        </div>
      )}

      {!isPurchased && nest.price_credits && (
        <div className="mt-2 text-xs text-zinc-500">
          {nest.price_credits} credits
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="w-full px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/growth/campaigns')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Select Prospects</h1>
                <p className="text-sm text-zinc-400">{campaign?.name} — Choose your target nests</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(selectedNestIds.length > 0 || totalCustomProspects > 0) && (
                <Badge className="bg-indigo-500/20 text-indigo-400">
                  {activeTab === 'custom'
                    ? `${totalCustomProspects} prospects selected`
                    : `${selectedNestIds.length} nest${selectedNestIds.length !== 1 ? 's' : ''} selected`
                  }
                </Badge>
              )}
              <Button
                onClick={handleContinue}
                disabled={saving || (selectedNestIds.length === 0 && totalCustomProspects === 0)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Continue to Enrichment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 lg:px-8 py-6 space-y-6">
        <JourneyProgressBar campaignId={campaignId} currentPhase="nests" />
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/30 border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {activeTab !== 'custom' && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nests by name or industry..."
              className="pl-10 bg-zinc-900/50 border-zinc-700"
            />
          </div>
        )}

        {/* Recommended Tab */}
        {activeTab === 'recommended' && (
          <div className="grid md:grid-cols-2 gap-4">
            {scoredNests.map(nest => (
              <NestCard
                key={nest.id}
                nest={nest}
                matchScore={nest.matchScore}
                isSelected={selectedNestIds.includes(nest.id)}
                onToggle={() => toggleNest(nest.id)}
              />
            ))}
            {scoredNests.length === 0 && (
              <div className="col-span-2 text-center py-16 text-zinc-500">
                <Database className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No marketplace nests available</p>
              </div>
            )}
          </div>
        )}

        {/* My Nests Tab */}
        {activeTab === 'my_nests' && (
          <div className="grid md:grid-cols-2 gap-4">
            {purchasedNests
              .filter(n => !searchQuery || n.name?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(nest => (
                <NestCard
                  key={nest.id}
                  nest={nest}
                  matchScore={calculateMatchScore(nest, campaignConfig)}
                  isSelected={selectedNestIds.includes(nest.id)}
                  onToggle={() => toggleNest(nest.id)}
                  isPurchased
                />
              ))}
            {purchasedNests.length === 0 && (
              <div className="col-span-2 text-center py-16 text-zinc-500">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No purchased nests yet</p>
                <Button
                  variant="outline"
                  className="mt-4 border-zinc-700 text-zinc-300"
                  onClick={() => setActiveTab('recommended')}
                >
                  Browse marketplace
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Build Custom Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            {/* Summary bar */}
            {totalCustomProspects > 0 && (
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{totalCustomProspects} prospects selected</p>
                      <p className="text-xs text-zinc-500">
                        From {Object.values(selectedProspects).filter(s => s.size > 0).length} nest(s)
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {purchasedNests.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Purchase nests first to build a custom selection</p>
                <Button
                  variant="outline"
                  className="mt-4 border-zinc-700 text-zinc-300"
                  onClick={() => setActiveTab('recommended')}
                >
                  Browse marketplace
                </Button>
              </div>
            ) : (
              purchasedNests.map(nest => {
                const isExpanded = expandedNest === nest.id;
                const prospects = nestProspects[nest.id] || [];
                const selected = selectedProspects[nest.id] || new Set();

                return (
                  <GlassCard key={nest.id} className="overflow-hidden">
                    <button
                      onClick={() => {
                        if (isExpanded) { setExpandedNest(null); return; }
                        setExpandedNest(nest.id);
                        loadNestProspects(nest.id);
                      }}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-indigo-400" />
                        <div>
                          <p className="text-white font-medium">{nest.name}</p>
                          <p className="text-xs text-zinc-500">{nest.lead_count || 0} prospects · {nest.industry || 'Various'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {selected.size > 0 && (
                          <Badge className="bg-indigo-500/20 text-indigo-400">{selected.size} selected</Badge>
                        )}
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5"
                        >
                          <div className="max-h-[400px] overflow-y-auto">
                            {prospects.length === 0 ? (
                              <div className="p-6 text-center text-zinc-500">
                                <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
                                Loading prospects...
                              </div>
                            ) : (
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur">
                                  <tr className="text-zinc-500 text-xs">
                                    <th className="px-4 py-2 text-left w-10">
                                      <input
                                        type="checkbox"
                                        checked={selected.size === prospects.length && prospects.length > 0}
                                        onChange={() => {
                                          if (selected.size === prospects.length) {
                                            setSelectedProspects(prev => ({ ...prev, [nest.id]: new Set() }));
                                          } else {
                                            setSelectedProspects(prev => ({
                                              ...prev,
                                              [nest.id]: new Set(prospects.map(p => p.id)),
                                            }));
                                          }
                                        }}
                                        className="accent-indigo-500"
                                      />
                                    </th>
                                    <th className="px-4 py-2 text-left">Name</th>
                                    <th className="px-4 py-2 text-left">Title</th>
                                    <th className="px-4 py-2 text-left">Company</th>
                                    <th className="px-4 py-2 text-left">Location</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prospects.map(prospect => {
                                    const name = prospect.full_name || `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() || prospect.name || 'Unknown';
                                    const pId = prospect.id || prospect.prospect_id;
                                    return (
                                      <tr
                                        key={pId}
                                        onClick={() => toggleProspect(nest.id, pId)}
                                        className={`cursor-pointer border-t border-white/[0.03] hover:bg-white/[0.02] ${
                                          selected.has(pId) ? 'bg-indigo-500/5' : ''
                                        }`}
                                      >
                                        <td className="px-4 py-2">
                                          <input
                                            type="checkbox"
                                            checked={selected.has(pId)}
                                            readOnly
                                            className="accent-indigo-500"
                                          />
                                        </td>
                                        <td className="px-4 py-2 text-white">{name}</td>
                                        <td className="px-4 py-2 text-zinc-400">{prospect.job_title || prospect.title || '—'}</td>
                                        <td className="px-4 py-2 text-zinc-400">{prospect.company_name || prospect.company || '—'}</td>
                                        <td className="px-4 py-2 text-zinc-400">{prospect.location || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
