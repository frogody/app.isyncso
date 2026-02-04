/**
 * Growth Campaign Review & Launch Page
 * Phase 6 of campaign journey pipeline
 * Route: /growth/campaign/:campaignId/review
 *
 * Displays a full campaign summary before launch:
 * - Campaign Summary, Data Source, Enrichment Status
 * - Visual Flow Preview, Integration Checklist, Action Items
 * - Launch button (disabled until blocking items resolved)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Rocket,
  Target,
  Users,
  Database,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Mail,
  Linkedin,
  Phone,
  Package,
  GitBranch,
  ArrowRight,
  ArrowDown,
  Zap,
  Globe,
  Bot,
  Timer,
  Flag,
  Activity,
  Layers,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import IntegrationChecklist from '@/components/growth/campaigns/IntegrationChecklist';
import { getRequiredIntegrations } from '@/services/flowTemplateGenerator';
import JourneyProgressBar from '@/components/growth/campaigns/JourneyProgressBar';

// ============================================================================
// Constants & Helpers
// ============================================================================

const GOAL_LABELS = {
  book_meetings: 'Book meetings/demos',
  generate_leads: 'Generate leads for nurturing',
  event_registrations: 'Drive event registrations',
  promote_content: 'Promote content/webinar',
};

const CHANNEL_CONFIG = {
  email: { label: 'Email', icon: Mail, color: 'cyan' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'blue' },
  phone: { label: 'Phone/SMS', icon: Phone, color: 'violet' },
};

const NODE_TYPE_CONFIG = {
  trigger: { label: 'Trigger', icon: Zap, color: 'amber' },
  knowledgeBase: { label: 'Knowledge Base', icon: Database, color: 'purple' },
  aiAgent: { label: 'AI Agent', icon: Bot, color: 'cyan' },
  gmail: { label: 'Gmail', icon: Mail, color: 'red' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'blue' },
  sms: { label: 'SMS', icon: Phone, color: 'green' },
  hubspot: { label: 'HubSpot', icon: Globe, color: 'orange' },
  googleSheets: { label: 'Google Sheets', icon: Layers, color: 'green' },
  condition: { label: 'Condition', icon: GitBranch, color: 'yellow' },
  timer: { label: 'Wait', icon: Timer, color: 'zinc' },
  followUp: { label: 'Follow-up', icon: Mail, color: 'indigo' },
  end: { label: 'End', icon: Flag, color: 'zinc' },
};

// Glass card helper - consistent with other Growth pages
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Section header
const SectionHeader = ({ icon: Icon, title, subtitle, badge }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-cyan-400" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <span className="text-xs text-zinc-500">{subtitle}</span>}
    </div>
    {badge}
  </div>
);

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

// ============================================================================
// Flow Summary Component (visual div-based flow preview)
// ============================================================================

function FlowNodeCard({ node }) {
  const config = NODE_TYPE_CONFIG[node.type] || {
    label: node.type,
    icon: Activity,
    color: 'zinc',
  };
  const Icon = config.icon;
  const name = node.data?.name || config.label;

  const colorMap = {
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    zinc: 'bg-zinc-800/50 border-zinc-700 text-zinc-400',
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
        colorMap[config.color] || colorMap.zinc
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{name}</span>
    </div>
  );
}

function FlowConnector({ isParallel = false }) {
  if (isParallel) return null;
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="w-3.5 h-3.5 text-zinc-600" />
    </div>
  );
}

function FlowSummary({ flow }) {
  const nodes = flow?.nodes || [];
  const edges = flow?.edges || [];

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
        <GitBranch className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No flow configured</p>
      </div>
    );
  }

  // Build a simple layered layout from edges
  // Identify root nodes (no incoming edges)
  const targetSet = new Set(edges.map((e) => e.target));
  const sourceSet = new Set(edges.map((e) => e.source));
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // BFS to determine layers
  const rootIds = nodes
    .filter((n) => !targetSet.has(n.id))
    .map((n) => n.id);

  const layers = [];
  const visited = new Set();
  let currentLayer = rootIds.length > 0 ? rootIds : [nodes[0]?.id];

  while (currentLayer.length > 0) {
    const layerNodes = currentLayer
      .filter((id) => !visited.has(id) && nodeMap[id])
      .map((id) => nodeMap[id]);
    if (layerNodes.length === 0) break;
    layers.push(layerNodes);
    layerNodes.forEach((n) => visited.add(n.id));

    // Next layer: targets of edges from this layer
    const nextIds = [];
    for (const n of layerNodes) {
      for (const e of edges) {
        if (e.source === n.id && !visited.has(e.target)) {
          nextIds.push(e.target);
        }
      }
    }
    currentLayer = [...new Set(nextIds)];
  }

  // Include orphan nodes not yet visited
  const orphans = nodes.filter((n) => !visited.has(n.id));
  if (orphans.length > 0) layers.push(orphans);

  return (
    <div className="space-y-0">
      {layers.map((layer, layerIdx) => (
        <React.Fragment key={layerIdx}>
          {layerIdx > 0 && <FlowConnector />}
          <div
            className={`flex gap-2 ${
              layer.length > 1 ? 'justify-center' : 'justify-center'
            }`}
          >
            {layer.map((node) => (
              <FlowNodeCard key={node.id} node={node} />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================================
// Action Item Component
// ============================================================================

function ActionItemRow({ item }) {
  const isBlocking = item.blocking;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
        isBlocking
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-amber-500/5 border-amber-500/20'
      }`}
    >
      {isBlocking ? (
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      )}
      <span
        className={`text-sm ${
          isBlocking ? 'text-red-300' : 'text-amber-300'
        }`}
      >
        {item.message}
      </span>
      {isBlocking && (
        <Badge className="ml-auto bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
          Required
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GrowthCampaignReview() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  // Data state
  const [campaign, setCampaign] = useState(null);
  const [product, setProduct] = useState(null);
  const [nests, setNests] = useState([]);
  const [enrichWorkspace, setEnrichWorkspace] = useState(null);
  const [flow, setFlow] = useState(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  // ---- Data loading ----
  useEffect(() => {
    if (!campaignId || !user?.id) return;

    async function loadAll() {
      setLoading(true);
      try {
        // 1. Load campaign
        const { data: campaignData, error: campaignErr } = await supabase
          .from('growth_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (campaignErr || !campaignData) {
          toast.error('Campaign not found');
          navigate('/growth/campaigns');
          return;
        }
        setCampaign(campaignData);

        // Parallel fetches based on campaign data
        const promises = [];

        // 2. Product
        if (campaignData.product_id) {
          promises.push(
            supabase
              .from('products')
              .select('id, name, type, short_description, featured_image')
              .eq('id', campaignData.product_id)
              .single()
              .then(({ data }) => {
                if (data) setProduct(data);
              })
          );
        }

        // 3. Selected nests
        const selectedNestIds = campaignData.selected_nest_ids || [];
        if (selectedNestIds.length > 0) {
          promises.push(
            supabase
              .from('growth_nests')
              .select('id, name, lead_count, industry, region')
              .in('id', selectedNestIds)
              .then(({ data }) => {
                if (data) setNests(data);
              })
          );
        }

        // 4. Enrich workspace
        if (campaignData.enrich_workspace_id) {
          promises.push(
            supabase
              .from('enrich_workspaces')
              .select('id, name, columns, row_count, enriched_count')
              .eq('id', campaignData.enrich_workspace_id)
              .single()
              .then(({ data }) => {
                if (data) setEnrichWorkspace(data);
              })
          );
        }

        // 5. Flow
        if (campaignData.flow_id) {
          promises.push(
            supabase
              .from('flows')
              .select('id, name, nodes, edges, status')
              .eq('id', campaignData.flow_id)
              .single()
              .then(({ data }) => {
                if (data) setFlow(data);
              })
          );
        }

        // 6. Connected integrations
        promises.push(
          supabase
            .from('user_integrations')
            .select('toolkit_slug, status')
            .eq('user_id', user.id)
            .in('status', ['connected', 'active'])
            .then(({ data }) => {
              const map = {};
              (data || []).forEach((d) => {
                map[d.toolkit_slug] = true;
              });
              setConnectedIntegrations(map);
            })
        );

        await Promise.all(promises);
      } catch (err) {
        console.error('Error loading campaign review data:', err);
        toast.error('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [campaignId, user?.id, navigate]);

  // ---- Derived data ----

  const channels = campaign?.campaign_goals?.channels || {};
  const activeChannels = Object.entries(channels).filter(([, v]) => v);
  const primaryGoal =
    GOAL_LABELS[campaign?.campaign_goals?.primary_goal] ||
    campaign?.campaign_goals?.primary_goal ||
    'Not set';

  const totalProspects = useMemo(() => {
    return nests.reduce((sum, n) => sum + (n.lead_count || 0), 0);
  }, [nests]);

  const enrichStats = useMemo(() => {
    if (!enrichWorkspace) return { total: 0, enriched: 0, unenriched: 0, percentage: 0 };
    const total = enrichWorkspace.row_count || 0;
    const enriched = enrichWorkspace.enriched_count || 0;
    const unenriched = total - enriched;
    const percentage = total > 0 ? Math.round((enriched / total) * 100) : 0;
    return { total, enriched, unenriched, percentage };
  }, [enrichWorkspace]);

  const enrichColumns = useMemo(() => {
    if (!enrichWorkspace?.columns) return [];
    return (enrichWorkspace.columns || [])
      .filter((c) => c.type === 'enrichment' || c.source === 'enrichment')
      .map((c) => c.name || c.label || c.key);
  }, [enrichWorkspace]);

  const flowNodes = flow?.nodes || [];
  const requiredIntegrations = useMemo(
    () => getRequiredIntegrations(flowNodes),
    [flowNodes]
  );

  // ---- Action items ----

  const actionItems = useMemo(() => {
    const items = [];

    // Enrichment completeness
    if (enrichStats.unenriched > 0) {
      items.push({
        type: 'warning',
        message: `${enrichStats.unenriched} prospect${
          enrichStats.unenriched !== 1 ? 's' : ''
        } not yet enriched`,
        blocking: false,
      });
    }

    // No enrich workspace at all
    if (!enrichWorkspace && campaign?.enrich_workspace_id) {
      items.push({
        type: 'error',
        message: 'Enrichment workspace not found',
        blocking: false,
      });
    }

    // Integration checks
    requiredIntegrations.forEach((int) => {
      if (!connectedIntegrations[int.slug]) {
        items.push({
          type: 'error',
          message: `Connect ${int.label} to send outreach`,
          blocking: true,
        });
      }
    });

    // Flow check
    if (!flow && !campaign?.flow_id) {
      items.push({
        type: 'error',
        message: 'Create an outreach flow before launching',
        blocking: true,
      });
    }

    // No nests selected
    if (nests.length === 0 && (campaign?.selected_nest_ids || []).length === 0) {
      items.push({
        type: 'error',
        message: 'Select at least one prospect nest',
        blocking: true,
      });
    }

    // No channels selected
    if (activeChannels.length === 0) {
      items.push({
        type: 'error',
        message: 'Enable at least one outreach channel',
        blocking: true,
      });
    }

    return items;
  }, [
    enrichStats,
    enrichWorkspace,
    campaign,
    requiredIntegrations,
    connectedIntegrations,
    flow,
    nests,
    activeChannels,
  ]);

  const hasBlockingItems = actionItems.some((item) => item.blocking);
  const canLaunch = !hasBlockingItems && campaign && campaign.status !== 'active';

  // ---- Launch handler ----

  const handleLaunch = async () => {
    if (!canLaunch) return;
    setLaunching(true);
    try {
      const { error } = await supabase
        .from('growth_campaigns')
        .update({
          status: 'active',
          journey_phase: 'launched',
          launched_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaign launched successfully!');
      navigate('/growth/campaigns');
    } catch (err) {
      console.error('Launch error:', err);
      toast.error('Failed to launch campaign');
    } finally {
      setLaunching(false);
    }
  };

  // ---- Loading state ----

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Loading campaign review...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-zinc-400">Campaign not found</p>
          <Button
            variant="ghost"
            className="mt-4 text-cyan-400 hover:text-cyan-300"
            onClick={() => navigate('/growth/campaigns')}
          >
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const isAlreadyLaunched = campaign.status === 'active';

  // ---- Render ----

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Back button + Page header */}
      <div className="max-w-5xl mx-auto">
        <JourneyProgressBar campaignId={campaignId} currentPhase={campaign.journey_phase || 'review'} />
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Review & Launch</h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              {campaign.name || 'Untitled Campaign'}
            </p>
          </div>
          {isAlreadyLaunched && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Launched
            </Badge>
          )}
        </motion.div>

        <div className="space-y-6">
          {/* ---------------------------------------------------------------- */}
          {/* 1. Campaign Summary */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <GlassCard className="p-5">
              <SectionHeader
                icon={Target}
                title="Campaign Summary"
                badge={
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                    {campaign.status || 'draft'}
                  </Badge>
                }
              />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Campaign Name</p>
                    <p className="text-sm text-white font-medium">
                      {campaign.name || 'Untitled'}
                    </p>
                  </div>
                  {product && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Product</p>
                      <div className="flex items-center gap-2">
                        {product.featured_image ? (
                          <img
                            src={product.featured_image}
                            alt={product.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-zinc-500" />
                        )}
                        <span className="text-sm text-white">{product.name}</span>
                        {product.type && (
                          <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">
                            {product.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Primary Goal</p>
                    <p className="text-sm text-white">{primaryGoal}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Target Audience</p>
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {campaign.target_audience
                        ? typeof campaign.target_audience === 'string'
                          ? campaign.target_audience
                          : [
                              ...(campaign.target_audience.industries || []),
                              ...(campaign.target_audience.job_titles || []),
                            ]
                              .slice(0, 4)
                              .join(', ') ||
                            'Not specified'
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Channels</p>
                    <div className="flex gap-2 flex-wrap">
                      {activeChannels.length > 0 ? (
                        activeChannels.map(([key]) => {
                          const cfg = CHANNEL_CONFIG[key];
                          if (!cfg) return null;
                          const ChannelIcon = cfg.icon;
                          return (
                            <Badge
                              key={key}
                              className="bg-zinc-800 text-zinc-300 text-xs"
                            >
                              <ChannelIcon className="w-3 h-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-sm text-zinc-500">
                          No channels selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* ---------------------------------------------------------------- */}
          {/* 2. Data Source */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <GlassCard className="p-5">
              <SectionHeader
                icon={Database}
                title="Data Source"
                subtitle={
                  nests.length > 0
                    ? `${nests.length} nest${nests.length !== 1 ? 's' : ''}`
                    : undefined
                }
              />
              {nests.length > 0 ? (
                <div className="space-y-2">
                  {nests.map((nest) => (
                    <div
                      key={nest.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">
                            {nest.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {[nest.industry, nest.region]
                              .filter(Boolean)
                              .join(' / ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-zinc-400">
                        {(nest.lead_count || 0).toLocaleString()} prospects
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="text-sm text-zinc-400">Total Prospects</span>
                    <span className="text-sm font-semibold text-white">
                      {totalProspects.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No prospect nests selected</p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* ---------------------------------------------------------------- */}
          {/* 3. Enrichment Status */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <GlassCard className="p-5">
              <SectionHeader
                icon={Sparkles}
                title="Enrichment Status"
                badge={
                  enrichWorkspace ? (
                    <Badge
                      className={`text-xs ${
                        enrichStats.percentage === 100
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {enrichStats.percentage}% complete
                    </Badge>
                  ) : null
                }
              />
              {enrichWorkspace ? (
                <div className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                      <span>
                        {enrichStats.enriched.toLocaleString()} of{' '}
                        {enrichStats.total.toLocaleString()} enriched
                      </span>
                      <span>{enrichStats.percentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          enrichStats.percentage === 100
                            ? 'bg-green-500'
                            : 'bg-cyan-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${enrichStats.percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Enrichment columns added */}
                  {enrichColumns.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1.5">
                        Enrichment columns ({enrichColumns.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {enrichColumns.map((col) => (
                          <Badge
                            key={col}
                            className="bg-zinc-800 text-zinc-400 text-[10px]"
                          >
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No enrichment workspace linked</p>
                  <p className="text-xs mt-1">
                    Prospects will be used as-is without enrichment
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* ---------------------------------------------------------------- */}
          {/* 4. Flow Preview */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <GlassCard className="p-5">
              <SectionHeader
                icon={GitBranch}
                title="Outreach Flow"
                subtitle={
                  flow?.name ? flow.name : undefined
                }
                badge={
                  flow ? (
                    <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                      {flowNodes.length} step{flowNodes.length !== 1 ? 's' : ''}
                    </Badge>
                  ) : null
                }
              />
              <div className="min-h-[12rem] flex items-center justify-center py-2">
                <FlowSummary flow={flow} />
              </div>
            </GlassCard>
          </motion.div>

          {/* ---------------------------------------------------------------- */}
          {/* 5. Integration Checklist */}
          {/* ---------------------------------------------------------------- */}
          {requiredIntegrations.length > 0 && (
            <motion.div
              custom={4}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <IntegrationChecklist requiredIntegrations={requiredIntegrations} />
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* 6. Action Items */}
          {/* ---------------------------------------------------------------- */}
          {actionItems.length > 0 && (
            <motion.div
              custom={5}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <GlassCard className="p-5">
                <SectionHeader
                  icon={AlertCircle}
                  title="Action Items"
                  badge={
                    <Badge
                      className={`text-xs ${
                        hasBlockingItems
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {actionItems.length} item{actionItems.length !== 1 ? 's' : ''}
                    </Badge>
                  }
                />
                <div className="space-y-2">
                  {actionItems.map((item, idx) => (
                    <ActionItemRow key={idx} item={item} />
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* 7. Launch Button */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            custom={6}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="pt-2 pb-8"
          >
            {isAlreadyLaunched ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Campaign is live</span>
                </div>
                <p className="text-sm text-zinc-500">
                  This campaign was launched on{' '}
                  {campaign.launched_at
                    ? new Date(campaign.launched_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'an earlier date'}
                </p>
                <Button
                  className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white"
                  onClick={() => navigate('/growth/campaigns')}
                >
                  Back to Campaigns
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                disabled={!canLaunch || launching}
                onClick={handleLaunch}
                className={`w-full h-14 text-base font-semibold transition-all ${
                  canLaunch
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {launching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    {canLaunch
                      ? 'Launch Campaign'
                      : `Resolve ${
                          actionItems.filter((i) => i.blocking).length
                        } blocking item${
                          actionItems.filter((i) => i.blocking).length !== 1
                            ? 's'
                            : ''
                        } to launch`}
                  </>
                )}
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
