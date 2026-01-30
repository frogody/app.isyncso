import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Users,
  Megaphone,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Mail,
  Linkedin,
  Phone,
  Briefcase,
  Plus,
  Upload,
  FileText,
  Activity,
  Package,
  Sparkles,
  FolderPlus,
  ArrowRight,
  Eye,
  Brain,
  Zap,
  Award,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AddCandidateModal, ActivityFeed } from "@/components/talent";
import { TalentActionButtons } from '@/components/talent/TalentActionButtons';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

// Trend Indicator Component
const TrendIndicator = ({ value, suffix = "%" }) => {
  if (value === 0) {
    return (
      <span className="flex items-center text-white/50 text-sm">
        <Minus className="w-3 h-3 mr-1" />
        No change
      </span>
    );
  }

  const isPositive = value > 0;
  return (
    <span className={`flex items-center text-sm ${isPositive ? "text-red-400" : "text-zinc-400"}`}>
      {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
      {Math.abs(value)}{suffix}
    </span>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, icon: Icon }) => {
  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="px-3 py-2.5 bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-black/20 text-red-400 shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white leading-tight">{value}</h3>
            <p className="text-[11px] text-white/60 truncate">{title}{subtitle ? ` · ${subtitle}` : ''}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};


// Intelligence Distribution Component
const IntelligenceDistribution = ({ data }) => {
  const levels = [
    { key: "Critical", color: "bg-red-600", count: data.critical || 0 },
    { key: "High", color: "bg-red-500", count: data.high || 0 },
    { key: "Medium", color: "bg-red-400", count: data.medium || 0 },
    { key: "Low", color: "bg-zinc-500", count: data.low || 0 },
  ];

  const total = levels.reduce((a, b) => a + b.count, 0);

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Intelligence Distribution</h3>
      <div className="flex items-center gap-0.5 h-6 rounded-lg overflow-hidden mb-3">
        {levels.map((level) => {
          const width = total > 0 ? (level.count / total) * 100 : 25;
          return (
            <motion.div
              key={level.key}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full ${level.color}`}
              title={`${level.key}: ${level.count}`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {levels.map((level) => (
          <div key={level.key} className="text-center">
            <div className="text-sm font-bold text-white">{level.count}</div>
            <div className="text-[10px] text-white/50">{level.key}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Pipeline Stages Component
const PipelineStages = ({ candidates }) => {
  const stages = useMemo(() => {
    const stageOrder = ["new", "contacted", "responded", "screening", "interview", "offer", "hired", "rejected"];
    const stageCounts = {};

    candidates.forEach((c) => {
      const stage = c.stage || "new";
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    return stageOrder.map((stage) => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: stageCounts[stage] || 0,
    }));
  }, [candidates]);

  const total = candidates.length;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <GlassCard className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Pipeline Stages</h3>
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const percentage = total > 0 ? Math.round((stage.count / total) * 100) : 0;
          const barWidth = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

          return (
            <div key={stage.name} className="flex items-center gap-2">
              <div className="w-20 text-xs text-white/70">{stage.name}</div>
              <div className="flex-1 h-5 bg-zinc-800/50 rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded flex items-center justify-end px-1.5"
                >
                  {stage.count > 0 && (
                    <span className="text-[10px] font-medium text-white">{stage.count}</span>
                  )}
                </motion.div>
              </div>
              <div className="w-10 text-right text-xs text-white/50">{percentage}%</div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

// Campaign Performance Table
const CampaignPerformanceTable = ({ campaigns, outreachTasks }) => {
  const campaignStats = useMemo(() => {
    return campaigns.slice(0, 5).map((campaign) => {
      const tasks = outreachTasks.filter((t) => t.campaign_id === campaign.id);
      const sent = tasks.filter((t) => t.status === "sent" || t.status === "replied").length;
      const replied = tasks.filter((t) => t.status === "replied").length;
      const responseRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
      const matchedCount = campaign.matched_candidates?.length || 0;

      return {
        ...campaign,
        totalTasks: tasks.length,
        sent,
        replied,
        responseRate,
        matchedCount,
      };
    });
  }, [campaigns, outreachTasks]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Campaign Performance</h3>
        <Link to={createPageUrl("TalentCampaigns")}>
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-white/50 border-b border-white/10">
              <th className="pb-3 font-medium">Campaign</th>
              <th className="pb-3 font-medium text-right">Matches</th>
              <th className="pb-3 font-medium text-right">Sent</th>
              <th className="pb-3 font-medium text-right">Replied</th>
              <th className="pb-3 font-medium text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {campaignStats.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-white/40">
                  No campaigns found. Create one to get started!
                </td>
              </tr>
            ) : (
              campaignStats.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-white/5">
                  <td className="py-3">
                    <Link to={`${createPageUrl("TalentCampaignDetail")}?id=${campaign.id}`}>
                      <div>
                        <p className="font-medium text-white hover:text-red-400 transition-colors">{campaign.name}</p>
                        <p className="text-xs text-white/50">{campaign.status}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 text-right text-white/70">{campaign.matchedCount}</td>
                  <td className="py-3 text-right text-white/70">{campaign.sent}</td>
                  <td className="py-3 text-right text-white/70">{campaign.replied}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-medium ${
                        campaign.responseRate >= 20
                          ? "text-red-400"
                          : campaign.responseRate >= 10
                          ? "text-red-400/70"
                          : "text-white/50"
                      }`}
                    >
                      {campaign.responseRate}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// Recent Campaign Activity Component
const RecentCampaignActivity = ({ campaigns }) => {
  const recentCampaigns = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 8);
  }, [campaigns]);

  const formatTime = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-500/20 text-red-400';
      case 'draft':
        return 'bg-zinc-500/20 text-zinc-400';
      case 'paused':
        return 'bg-red-500/10 text-red-400/70';
      case 'completed':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-zinc-500/20 text-zinc-400';
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-2">
        {recentCampaigns.length === 0 ? (
          <p className="text-center text-white/40 py-4">No recent activity</p>
        ) : (
          recentCampaigns.map((campaign) => (
            <Link
              key={campaign.id}
              to={`${createPageUrl("TalentCampaignDetail")}?id=${campaign.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                <Megaphone className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate group-hover:text-red-400 transition-colors">
                  {campaign.name}
                </p>
                <p className="text-xs text-white/50">
                  {campaign.matched_candidates?.length || 0} matches
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge className={getStatusStyle(campaign.status)}>
                  {campaign.status}
                </Badge>
                <p className="text-[10px] text-white/40 mt-1">
                  {formatTime(campaign.updated_at || campaign.created_at)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </GlassCard>
  );
};

// Recommended Nests Section
const RecommendedNests = ({ nests, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (nests.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400 mb-2">No nests available yet</p>
        <p className="text-sm text-zinc-500">Check the marketplace for curated candidate pools</p>
        <Link to="/marketplace/nests">
          <Button className="mt-4 bg-red-500 hover:bg-red-600">
            Browse Marketplace
          </Button>
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {nests.map(nest => (
        <Link key={nest.id} to={`/marketplace/nests/${nest.id}`}>
          <motion.div className="h-full">
            <GlassCard className="p-4 h-full hover:border-red-500/30 transition-all flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <Badge className="bg-red-500/20 text-red-400 text-xs">
                  {nest.category || nest.nest_type || 'General'}
                </Badge>
                {nest.price === 0 && (
                  <Badge className="bg-red-500/20 text-red-400 text-xs">Free</Badge>
                )}
              </div>
              <h3 className="font-medium text-white mb-1 line-clamp-1">{nest.name}</h3>
              <p className="text-sm text-zinc-400 line-clamp-2 mb-3 flex-1">{nest.description}</p>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {nest.item_count || 0}
                </span>
                <span className={nest.price === 0 ? "text-red-400" : "text-white font-medium"}>
                  {nest.price === 0 ? "Free" : `$${nest.price}`}
                </span>
              </div>
            </GlassCard>
          </motion.div>
        </Link>
      ))}
    </div>
  );
};


// Analytics Overview Component
const AnalyticsOverview = ({ campaigns, outreachTasks, metrics }) => {
  // Find best performing campaign
  const bestCampaign = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;

    return campaigns.reduce((best, campaign) => {
      const tasks = outreachTasks.filter(t => t.campaign_id === campaign.id);
      const sent = tasks.filter(t => ['sent', 'replied'].includes(t.status)).length;
      const replied = tasks.filter(t => t.status === 'replied').length;
      const responseRate = sent > 0 ? (replied / sent) * 100 : 0;

      const bestTasks = outreachTasks.filter(t => t.campaign_id === best?.id);
      const bestSent = bestTasks.filter(t => ['sent', 'replied'].includes(t.status)).length;
      const bestReplied = bestTasks.filter(t => t.status === 'replied').length;
      const bestResponseRate = bestSent > 0 ? (bestReplied / bestSent) * 100 : 0;

      return responseRate > bestResponseRate ? { ...campaign, responseRate, sent, replied } : (best || { ...campaign, responseRate, sent, replied });
    }, null);
  }, [campaigns, outreachTasks]);

  // Generate smart recommendations
  const recommendations = useMemo(() => {
    const recs = [];

    // Check response rate
    if (metrics.responseRate < 10 && metrics.sentOutreach > 5) {
      recs.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Low Response Rate',
        description: 'Consider refining your messaging or targeting higher-intel candidates',
        action: { label: 'View Campaigns', url: createPageUrl('TalentCampaigns') },
      });
    }

    // Check for inactive campaigns
    const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;
    if (activeCampaignsCount === 0 && campaigns.length > 0) {
      recs.push({
        type: 'info',
        icon: Megaphone,
        title: 'No Active Campaigns',
        description: 'Restart paused campaigns or create new ones to continue outreach',
        action: { label: 'New Campaign', url: `${createPageUrl('TalentCampaignDetail')}?new=true` },
      });
    }

    // High intel candidates not in campaigns
    if (metrics.highRiskCandidates > 5 && metrics.activeCampaigns === 0) {
      recs.push({
        type: 'success',
        icon: Brain,
        title: 'High-Intel Candidates Available',
        description: `${metrics.highRiskCandidates} candidates with high flight risk scores ready to target`,
        action: { label: 'Start Campaign', url: `${createPageUrl('TalentCampaignDetail')}?new=true` },
      });
    }

    // Pending outreach
    const pendingTasks = outreachTasks.filter(t => t.status === 'approved_ready').length;
    if (pendingTasks > 0) {
      recs.push({
        type: 'action',
        icon: Send,
        title: `${pendingTasks} Messages Ready to Send`,
        description: 'Approved outreach messages are waiting to be sent',
        action: { label: 'View Queue', url: createPageUrl('TalentCampaigns') },
      });
    }

    return recs.slice(0, 3); // Max 3 recommendations
  }, [metrics, campaigns, outreachTasks]);

  const typeStyles = {
    warning: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400' },
    info: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400' },
    success: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400' },
    action: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-400' },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Response Rate Gauge */}
      <GlassCard className="p-5 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center mb-3">
            <svg width="120" height="120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="10"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={metrics.responseRate >= 20 ? '#ef4444' : metrics.responseRate >= 10 ? '#f87171' : '#fca5a5'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 50}
                initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - metrics.responseRate / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{metrics.responseRate}%</span>
              <span className="text-xs text-zinc-400">Response Rate</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Sent:</span>{' '}
              <span className="text-white font-medium">{metrics.sentOutreach}</span>
            </div>
            <div>
              <span className="text-zinc-400">Replied:</span>{' '}
              <span className="text-red-400 font-medium">{metrics.repliedOutreach}</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Best Performing Campaign */}
      <GlassCard className="p-5 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <Award className="w-4 h-4" />
          Best Performing Campaign
        </div>
        {bestCampaign ? (
          <div>
            <h4 className="text-lg font-semibold text-white mb-2 truncate">{bestCampaign.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Response Rate</span>
                <span className={`font-medium ${bestCampaign.responseRate >= 20 ? 'text-red-400' : 'text-zinc-300'}`}>
                  {bestCampaign.responseRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Messages Sent</span>
                <span className="text-white">{bestCampaign.sent || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Replies</span>
                <span className="text-red-400">{bestCampaign.replied || 0}</span>
              </div>
            </div>
            <Link
              to={`${createPageUrl('TalentCampaignDetail')}?id=${bestCampaign.id}`}
              className="mt-3 inline-flex items-center text-xs text-red-400 hover:text-red-300"
            >
              View Campaign <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        ) : (
          <div className="text-center py-4">
            <Megaphone className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">No campaigns yet</p>
            <Link
              to={`${createPageUrl('TalentCampaignDetail')}?new=true`}
              className="mt-2 inline-flex items-center text-xs text-red-400 hover:text-red-300"
            >
              Create First Campaign <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        )}
      </GlassCard>

      {/* Smart Recommendations */}
      <GlassCard className="p-5 bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4" />
          Recommendations
        </div>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              const styles = typeStyles[rec.type];
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg ${styles.bg} border ${styles.border}`}
                >
                  <div className="flex items-start gap-2">
                    <rec.icon className={`w-4 h-4 ${styles.icon} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{rec.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{rec.description}</p>
                      {rec.action && (
                        <Link
                          to={rec.action.url}
                          className={`mt-1 inline-flex items-center text-xs ${styles.icon} hover:underline`}
                        >
                          {rec.action.label} <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">All looking good!</p>
            <p className="text-zinc-500 text-xs mt-1">No recommendations at this time</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default function TalentDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  // Recommended nests state
  const [recommendedNests, setRecommendedNests] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
      fetchRecommendedNests();
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        case "all":
          startDate = new Date(0);
          break;
      }

      const [candidatesRes, campaignsRes, tasksRes, projectsRes, rolesRes] = await Promise.all([
        supabase
          .from("candidates")
          .select("*")
          .eq("organization_id", user.organization_id),
        supabase
          .from("campaigns")
          .select("*")
          .eq("organization_id", user.organization_id)
          .order("updated_date", { ascending: false }),
        supabase
          .from("outreach_tasks")
          .select("*, candidates(first_name, last_name)")
          .eq("organization_id", user.organization_id)
          .gte("created_date", startDate.toISOString()),
        supabase
          .from("projects")
          .select("*")
          .eq("organization_id", user.organization_id),
        supabase
          .from("roles")
          .select("*")
          .eq("organization_id", user.organization_id),
      ]);

      // Non-blocking error handling
      if (candidatesRes.error) console.warn("Failed to fetch candidates:", candidatesRes.error);
      if (campaignsRes.error) console.warn("Failed to fetch campaigns:", campaignsRes.error);
      if (tasksRes.error) console.warn("Failed to fetch outreach tasks:", tasksRes.error);
      if (projectsRes.error) console.warn("Failed to fetch projects:", projectsRes.error);
      if (rolesRes.error) console.warn("Failed to fetch roles:", rolesRes.error);

      // Transform tasks to include candidate name
      const tasksWithNames = (tasksRes.data || []).map((task) => ({
        ...task,
        candidate_name: task.candidates?.first_name ? `${task.candidates.first_name} ${task.candidates.last_name || ''}`.trim() : "Unknown",
      }));

      setCandidates(candidatesRes.data || []);
      setCampaigns(campaignsRes.data || []);
      setOutreachTasks(tasksWithNames);
      setProjects(projectsRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedNests = async () => {
    setLoadingRecommendations(true);
    try {
      // Get nests user hasn't purchased yet
      const { data: purchases } = await supabase
        .from('nest_purchases')
        .select('nest_id')
        .eq('organization_id', user.organization_id)
        .eq('status', 'completed');

      const purchasedIds = purchases?.map(p => p.nest_id) || [];

      // Build query for available nests
      let query = supabase
        .from('nests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4);

      // Exclude purchased nests if any
      if (purchasedIds.length > 0) {
        query = query.not('id', 'in', `(${purchasedIds.join(',')})`);
      }

      const { data: nests, error } = await query;
      if (error) throw error;

      setRecommendedNests(nests || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCandidates = candidates.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const totalOutreach = outreachTasks.length;
    const sentOutreach = outreachTasks.filter((t) => t.status === "sent" || t.status === "replied").length;
    const repliedOutreach = outreachTasks.filter((t) => t.status === "replied").length;
    const responseRate = sentOutreach > 0 ? Math.round((repliedOutreach / sentOutreach) * 100) : 0;

    // Intel-ready candidates
    const intelReady = candidates.filter((c) => c.last_intelligence_update && c.intelligence_score != null).length;

    // High-risk candidates (score >= 60)
    const highRiskCandidates = candidates.filter((c) => (c.intelligence_score || 0) >= 60).length;

    // Intelligence distribution
    const intelligenceDistribution = candidates.reduce(
      (acc, c) => {
        const level = (c.intelligence_level || "low").toLowerCase();
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    // Active projects and roles
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const activeRoles = roles.filter((r) => r.status === "active" || r.status === "open").length;
    const filledRoles = roles.filter((r) => r.status === "filled").length;

    // Total matches across campaigns
    const totalMatches = campaigns.reduce((sum, c) => sum + (c.matched_candidates?.length || 0), 0);

    return {
      totalCandidates,
      activeCampaigns,
      totalOutreach,
      sentOutreach,
      repliedOutreach,
      responseRate,
      highRiskCandidates,
      intelReady,
      intelligenceDistribution,
      activeProjects,
      activeRoles,
      filledRoles,
      totalMatches,
    };
  }, [candidates, campaigns, outreachTasks, projects, roles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-4 lg:px-6 py-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-6">
        <PageHeader
          title="Talent Dashboard"
          subtitle="Your recruitment command center"
          color="red"
          actions={
            <TalentActionButtons extra={
              <>
                <div className="w-px h-6 bg-zinc-700" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-28 bg-zinc-800/50 border-zinc-700 text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchData} className="text-white/60 hover:text-white h-8 w-8 p-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </>
            } />
          }
        />

        {/* Key Metrics — compact 8-up grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2"
        >
          <MetricCard title="Total Candidates" value={metrics.totalCandidates} subtitle={`${metrics.intelReady} intel-ready`} icon={Users} />
          <MetricCard title="Active Campaigns" value={metrics.activeCampaigns} subtitle={`${metrics.totalMatches} matches`} icon={Megaphone} />
          <MetricCard title="Outreach Sent" value={metrics.sentOutreach} subtitle={`${metrics.totalOutreach} tasks`} icon={Send} />
          <MetricCard title="Response Rate" value={`${metrics.responseRate}%`} subtitle={`${metrics.repliedOutreach} replies`} icon={MessageSquare} />
          <MetricCard title="Active Projects" value={metrics.activeProjects} subtitle={`${projects.length} total`} icon={Briefcase} />
          <MetricCard title="Open Roles" value={metrics.activeRoles} subtitle={`${roles.length} total`} icon={Target} />
          <MetricCard title="Roles Filled" value={metrics.filledRoles} subtitle={`${Math.round((metrics.filledRoles / Math.max(roles.length, 1)) * 100)}% success`} icon={CheckCircle2} />
          <MetricCard title="High Intel" value={metrics.highRiskCandidates} subtitle="Score 60+" icon={Brain} />
        </motion.div>

        {/* Analytics Overview Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-400" />
              Analytics Overview
            </h2>
            <p className="text-sm text-zinc-400">Performance metrics across all campaigns</p>
          </div>
          <AnalyticsOverview
            campaigns={campaigns}
            outreachTasks={outreachTasks}
            metrics={metrics}
          />
        </motion.div>

        {/* Recommended Nests Section */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-red-400" />
                Recommended Nests
              </h2>
              <p className="text-sm text-zinc-400">Curated talent pools for your hiring needs</p>
            </div>
            <Link to="/marketplace/nests">
              <Button variant="ghost" className="text-red-400 hover:text-red-300">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <RecommendedNests nests={recommendedNests} loading={loadingRecommendations} />
        </motion.div>

        {/* Charts Row */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <motion.div variants={itemVariants}>
            <PipelineStages candidates={candidates} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <IntelligenceDistribution data={metrics.intelligenceDistribution} />
          </motion.div>
        </motion.div>

        {/* Campaign Performance & Activity */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <CampaignPerformanceTable campaigns={campaigns} outreachTasks={outreachTasks} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6">
              <ActivityFeed limit={8} showHeader={true} compact={false} />
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
        onSuccess={(newCandidate) => {
          setCandidates((prev) => [newCandidate, ...prev]);
          setShowAddCandidate(false);
        }}
      />
    </div>
  );
}
