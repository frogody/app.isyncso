import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedBadge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { AnimatedProgress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/EmptyState";
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
  Target,
  CheckCircle2,
  Send,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Briefcase,
  ArrowRight,
  Brain,
  Sparkles,
  Award,
  Package,
  TrendingUp,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AddCandidateModal, ActivityFeed } from "@/components/talent";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label, sub }) {
  const isPercentage = typeof value === 'string' && value.endsWith('%');
  const numericValue = isPercentage ? parseFloat(value) : (typeof value === 'number' ? value : null);

  return (
    <motion.div
      variants={fadeIn}
    >
      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-4 py-3">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-white leading-none">
            {numericValue !== null ? (
              <AnimatedNumber value={numericValue} suffix={isPercentage ? '%' : ''} duration={1} />
            ) : value}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{label}{sub ? ` · ${sub}` : ''}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Response Rate Ring ───────────────────────────────────────────────────────
function ResponseRateRing({ rate, sent, replied }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={r} fill="none"
            stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - rate / 100) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">
            <AnimatedNumber value={rate} suffix="%" duration={1} />
          </span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-zinc-400">Sent</span>
          <span className="text-white font-medium ml-auto">{sent}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-300" />
          <span className="text-zinc-400">Replied</span>
          <span className="text-white font-medium ml-auto">{replied}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Mini Bars ───────────────────────────────────────────────────────
function PipelineBars({ candidates }) {
  const stages = useMemo(() => {
    const order = ["new", "contacted", "responded", "screening", "interview", "offer", "hired", "rejected"];
    const counts = {};
    candidates.forEach(c => { const s = c.stage || "new"; counts[s] = (counts[s] || 0) + 1; });
    return order.map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] || 0 }));
  }, [candidates]);

  const total = candidates.length;
  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = max > 0 ? Math.round((s.count / max) * 100) : 0;
        return (
          <div key={s.name} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{s.name}</span>
              <span className="text-[10px] text-zinc-600">{s.count > 0 ? s.count : ''}</span>
            </div>
            <AnimatedProgress value={pct} color="rose" glow={s.count > 0} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Intel Distribution Bar ───────────────────────────────────────────────────
function IntelBar({ data }) {
  const levels = [
    { key: "Critical", color: "bg-red-600", count: data.critical || 0 },
    { key: "High", color: "bg-red-500", count: data.high || 0 },
    { key: "Medium", color: "bg-red-400/60", count: data.medium || 0 },
    { key: "Low", color: "bg-zinc-600", count: data.low || 0 },
  ];
  const total = levels.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <div>
      <div className="flex items-center gap-0.5 h-5 rounded-lg overflow-hidden mb-3">
        {levels.map(l => (
          <motion.div key={l.key} initial={{ width: 0 }} animate={{ width: `${(l.count / total) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full ${l.color}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {levels.map(l => (
          <div key={l.key} className="text-center">
            <div className="text-sm font-semibold text-white">
              <AnimatedNumber value={l.count} duration={0.8} />
            </div>
            <div className="text-[10px] text-zinc-500">{l.key}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────
function CampaignRow({ campaign, outreachTasks }) {
  const tasks = outreachTasks.filter(t => t.campaign_id === campaign.id);
  const sent = tasks.filter(t => t.status === "sent" || t.status === "replied").length;
  const replied = tasks.filter(t => t.status === "replied").length;
  const rate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  const matches = campaign.matched_candidates?.length || 0;

  return (
    <motion.div
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-lg"
    >
      <Link
        to={`${createPageUrl("TalentCampaignDetail")}?id=${campaign.id}`}
        className="flex items-center gap-3 p-3 transition-colors group"
      >
        <div className="p-2 rounded-lg bg-red-500/10 group-hover:bg-red-500/15 transition-colors">
          <Megaphone className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate group-hover:text-red-400 transition-colors">{campaign.name}</p>
          <p className="text-[11px] text-zinc-500">{matches} matches · {sent} sent</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-sm font-medium ${rate >= 20 ? 'text-red-400' : rate > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {rate >= 20 ? (
              <AnimatedBadge variant="destructive" pulse size="xs" className="bg-red-500/20 text-red-400 border-red-500/30">{rate}%</AnimatedBadge>
            ) : (
              `${rate}%`
            )}
          </span>
          <p className="text-[10px] text-zinc-600">{replied} replies</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────
function RecCard({ icon: Icon, title, description, actionLabel, actionUrl }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-zinc-800/50">
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-white font-medium">{title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          {actionUrl && (
            <Link to={actionUrl} className="mt-1.5 inline-flex items-center text-xs text-red-400 hover:text-red-300">
              {actionLabel} <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Nest Card ────────────────────────────────────────────────────────────────
function NestCard({ nest }) {
  return (
    <Link to={`/TalentNestDetail?id=${nest.id}`}>
      <motion.div
        className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 hover:border-red-500/20 transition-all h-full flex flex-col"
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <AnimatedBadge className="bg-red-500/15 text-red-400 text-[10px] w-fit mb-2">
          {nest.category || nest.nest_type || 'candidates'}
        </AnimatedBadge>
        <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">{nest.name}</h4>
        <p className="text-xs text-zinc-500 line-clamp-2 flex-1 mb-3">{nest.description}</p>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/60">
          <span className="text-zinc-500 flex items-center gap-1">
            <Users className="w-3 h-3" /> {nest.item_count || 0}
          </span>
          <span className="text-white font-medium">€{nest.price || 0}</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
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
  const [recommendedNests, setRecommendedNests] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
      fetchRecommendedNests();
    } else if (user) {
      setLoading(false);
    }
  }, [user, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
        case "7d": startDate.setDate(now.getDate() - 7); break;
        case "30d": startDate.setDate(now.getDate() - 30); break;
        case "90d": startDate.setDate(now.getDate() - 90); break;
        case "all": startDate = new Date(0); break;
      }

      const [candidatesRes, campaignsRes, tasksRes, projectsRes, rolesRes] = await Promise.all([
        supabase.from("candidates").select("*").eq("organization_id", user.organization_id),
        supabase.from("campaigns").select("*").eq("organization_id", user.organization_id).order("updated_date", { ascending: false }),
        supabase.from("outreach_tasks").select("*, candidates(first_name, last_name)").eq("organization_id", user.organization_id).gte("created_date", startDate.toISOString()),
        supabase.from("projects").select("*").eq("organization_id", user.organization_id),
        supabase.from("roles").select("*").eq("organization_id", user.organization_id),
      ]);

      if (candidatesRes.error) console.warn("Failed to fetch candidates:", candidatesRes.error);
      if (campaignsRes.error) console.warn("Failed to fetch campaigns:", campaignsRes.error);
      if (tasksRes.error) console.warn("Failed to fetch outreach tasks:", tasksRes.error);
      if (projectsRes.error) console.warn("Failed to fetch projects:", projectsRes.error);
      if (rolesRes.error) console.warn("Failed to fetch roles:", rolesRes.error);

      const tasksWithNames = (tasksRes.data || []).map(task => ({
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
      const { data: purchases } = await supabase
        .from('nest_purchases').select('nest_id')
        .eq('organization_id', user.organization_id).eq('status', 'completed');
      const purchasedIds = purchases?.map(p => p.nest_id) || [];
      let query = supabase.from('nests').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(4);
      if (purchasedIds.length > 0) query = query.not('id', 'in', `(${purchasedIds.join(',')})`);
      const { data: nests, error } = await query;
      if (error) throw error;
      setRecommendedNests(nests || []);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const metrics = useMemo(() => {
    const totalCandidates = candidates.length;
    const activeCampaigns = campaigns.filter(c => c.status === "active").length;
    const totalOutreach = outreachTasks.length;
    const sentOutreach = outreachTasks.filter(t => t.status === "sent" || t.status === "replied").length;
    const repliedOutreach = outreachTasks.filter(t => t.status === "replied").length;
    const responseRate = sentOutreach > 0 ? Math.round((repliedOutreach / sentOutreach) * 100) : 0;
    const intelReady = candidates.filter(c => c.last_intelligence_update && c.intelligence_score != null).length;
    const highRiskCandidates = candidates.filter(c => (c.intelligence_score || 0) >= 60).length;
    const intelligenceDistribution = candidates.reduce((acc, c) => {
      const level = (c.intelligence_level || "low").toLowerCase();
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
    const activeProjects = projects.filter(p => p.status === "active").length;
    const activeRoles = roles.filter(r => r.status === "active" || r.status === "open").length;
    const filledRoles = roles.filter(r => r.status === "filled").length;
    const totalMatches = campaigns.reduce((sum, c) => sum + (c.matched_candidates?.length || 0), 0);

    return { totalCandidates, activeCampaigns, totalOutreach, sentOutreach, repliedOutreach, responseRate, highRiskCandidates, intelReady, intelligenceDistribution, activeProjects, activeRoles, filledRoles, totalMatches };
  }, [candidates, campaigns, outreachTasks, projects, roles]);

  // Smart recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    if (metrics.responseRate < 10 && metrics.sentOutreach > 5)
      recs.push({ icon: AlertTriangle, title: 'Low Response Rate', description: 'Refine messaging or target higher-intel candidates', actionLabel: 'View Campaigns', actionUrl: createPageUrl('TalentCampaigns') });
    const active = campaigns.filter(c => c.status === 'active').length;
    if (active === 0 && campaigns.length > 0)
      recs.push({ icon: Megaphone, title: 'No Active Campaigns', description: 'Restart paused campaigns or create new ones', actionLabel: 'New Campaign', actionUrl: `${createPageUrl('TalentCampaignDetail')}?new=true` });
    if (metrics.highRiskCandidates > 5 && metrics.activeCampaigns === 0)
      recs.push({ icon: Brain, title: 'High-Intel Candidates Ready', description: `${metrics.highRiskCandidates} candidates with flight risk scores ≥60`, actionLabel: 'Start Campaign', actionUrl: `${createPageUrl('TalentCampaignDetail')}?new=true` });
    const pending = outreachTasks.filter(t => t.status === 'approved_ready').length;
    if (pending > 0)
      recs.push({ icon: Send, title: `${pending} Messages Ready`, description: 'Approved outreach waiting to be sent', actionLabel: 'View Queue', actionUrl: createPageUrl('TalentCampaigns') });
    return recs.slice(0, 3);
  }, [metrics, campaigns, outreachTasks]);

  // Best campaign
  const bestCampaign = useMemo(() => {
    if (!campaigns.length) return null;
    return campaigns.reduce((best, c) => {
      const tasks = outreachTasks.filter(t => t.campaign_id === c.id);
      const sent = tasks.filter(t => ['sent', 'replied'].includes(t.status)).length;
      const replied = tasks.filter(t => t.status === 'replied').length;
      const rate = sent > 0 ? (replied / sent) * 100 : 0;
      if (!best || rate > best.rate) return { ...c, rate, sent, replied };
      return best;
    }, null);
  }, [campaigns, outreachTasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full px-4 lg:px-6 py-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-5">

        {/* Header */}
        <PageHeader
          title="Talent Dashboard"
          subtitle="Your recruitment command center"
          color="red"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <MotionButton variant="outline" size="sm" onClick={() => navigate(createPageUrl("TalentProjects"))} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8">
                <Briefcase className="w-3.5 h-3.5 mr-1" /> Create Role
              </MotionButton>
              <MotionButton variant="outline" size="sm" onClick={() => navigate("/marketplace/nests")} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8">
                <Package className="w-3.5 h-3.5 mr-1" /> Browse Nests
              </MotionButton>
              <MotionButton variant="outline" size="sm" onClick={() => navigate(`${createPageUrl("TalentCampaignDetail")}?new=true`)} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Run Matching
              </MotionButton>
              <MotionButton variant="outline" size="sm" onClick={() => navigate(createPageUrl("TalentCampaigns"))} className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 text-xs h-8">
                <Send className="w-3.5 h-3.5 mr-1" /> Launch Outreach
              </MotionButton>
              <MotionButton variant="outline" size="sm" onClick={() => navigate(`${createPageUrl("TalentCandidates")}?addNew=true`)} className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs h-8">
                <Users className="w-3.5 h-3.5 mr-1" /> Add Candidate
              </MotionButton>
              <div className="h-5 w-px bg-zinc-700 mx-1" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[120px] bg-zinc-900/60 border-zinc-800 text-white text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={fetchData} className="text-zinc-500 hover:text-white h-8 w-8 p-0">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          }
        />

        {/* ── Stats Row ────────────────────────────────────────────────── */}
        <motion.div variants={stagger} initial="hidden" animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2"
        >
          <StatPill icon={Users} value={metrics.totalCandidates} label="Candidates" sub={`${metrics.intelReady} intel`} />
          <StatPill icon={Megaphone} value={metrics.activeCampaigns} label="Campaigns" sub={`${metrics.totalMatches} matches`} />
          <StatPill icon={Send} value={metrics.sentOutreach} label="Sent" sub={`${metrics.totalOutreach} total`} />
          <StatPill icon={MessageSquare} value={`${metrics.responseRate}%`} label="Response" sub={`${metrics.repliedOutreach} replies`} />
          <StatPill icon={Briefcase} value={metrics.activeProjects} label="Projects" sub={`${projects.length} total`} />
          <StatPill icon={Target} value={metrics.activeRoles} label="Open Roles" sub={`${roles.length} total`} />
          <StatPill icon={CheckCircle2} value={metrics.filledRoles} label="Filled" sub={`${Math.round((metrics.filledRoles / Math.max(roles.length, 1)) * 100)}%`} />
          <StatPill icon={Brain} value={metrics.highRiskCandidates} label="High Intel" sub="Score 60+" />
        </motion.div>

        {/* ── Main Grid: Left (2/3) + Right (1/3) ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left Column ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Response + Best Campaign + Recommendations */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div variants={fadeIn}>
                <GlassCard className="p-5 h-full">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Response Rate</div>
                  <ResponseRateRing rate={metrics.responseRate} sent={metrics.sentOutreach} replied={metrics.repliedOutreach} />
                </GlassCard>
              </motion.div>

              <motion.div variants={fadeIn}>
                <GlassCard className="p-5 h-full">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">
                    <Award className="w-3.5 h-3.5 text-red-400" /> Best Campaign
                  </div>
                  {bestCampaign ? (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2 truncate">{bestCampaign.name}</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-zinc-500">Rate</span><span className="text-white font-medium">{bestCampaign.rate?.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Sent</span><span className="text-zinc-300">{bestCampaign.sent}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Replied</span><span className="text-red-400">{bestCampaign.replied}</span></div>
                      </div>
                      <Link to={`${createPageUrl('TalentCampaignDetail')}?id=${bestCampaign.id}`}
                        className="mt-3 inline-flex items-center text-xs text-red-400 hover:text-red-300">
                        View <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-zinc-600 text-sm">No campaigns yet</p>
                      <Link to={`${createPageUrl('TalentCampaignDetail')}?new=true`}
                        className="mt-1 inline-flex items-center text-xs text-red-400 hover:text-red-300">
                        Create Campaign <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  )}
                </GlassCard>
              </motion.div>

              <motion.div variants={fadeIn}>
                <GlassCard className="p-5 h-full">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" /> Recommendations
                  </div>
                  {recommendations.length > 0 ? (
                    <div className="space-y-2">
                      {recommendations.map((rec, i) => <RecCard key={i} {...rec} />)}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <CheckCircle2 className="w-8 h-8 text-red-500/40 mx-auto mb-1.5" />
                      <p className="text-zinc-500 text-sm">All looking good</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </motion.div>

            {/* Pipeline + Intel Distribution */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div variants={fadeIn}>
                <GlassCard className="p-5">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Pipeline Stages</div>
                  <PipelineBars candidates={candidates} />
                </GlassCard>
              </motion.div>
              <motion.div variants={fadeIn}>
                <GlassCard className="p-5">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Intelligence Distribution</div>
                  <IntelBar data={metrics.intelligenceDistribution} />
                </GlassCard>
              </motion.div>
            </motion.div>

            {/* Campaign Performance */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Campaigns</div>
                  <Link to={createPageUrl("TalentCampaigns")}>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-7 text-xs px-2">
                      View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                {campaigns.length === 0 ? (
                  <EmptyState
                    icon={Megaphone}
                    title="No campaigns yet"
                    description="Create a campaign to start reaching out to candidates"
                    action={() => navigate(`${createPageUrl('TalentCampaignDetail')}?new=true`)}
                    actionLabel="New Campaign"
                    size="sm"
                  />
                ) : (
                  <div className="space-y-0.5">
                    {campaigns.slice(0, 5).map(c => (
                      <CampaignRow key={c.id} campaign={c} outreachTasks={outreachTasks} />
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* ── Right Column ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Recommended Nests */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Recommended Nests</div>
                  <Link to="/marketplace/nests">
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-7 text-xs px-2">
                      Browse <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                {loadingRecommendations ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                ) : recommendedNests.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No nests available"
                    description="Browse the marketplace for candidate pools"
                    action={() => navigate('/marketplace/nests')}
                    actionLabel="Browse Marketplace"
                    size="sm"
                  />
                ) : (
                  <div className="space-y-3">
                    {recommendedNests.map(nest => <NestCard key={nest.id} nest={nest} />)}
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Activity Feed */}
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <GlassCard className="p-5">
                <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">Recent Activity</div>
                <ActivityFeed limit={8} showHeader={false} compact={true} />
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>

      <AddCandidateModal
        isOpen={showAddCandidate}
        onClose={() => setShowAddCandidate(false)}
        onSuccess={(newCandidate) => {
          setCandidates(prev => [newCandidate, ...prev]);
          setShowAddCandidate(false);
        }}
      />
    </div>
  );
}
