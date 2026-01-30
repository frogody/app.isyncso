import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  MessageSquare,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Mail,
  Linkedin,
  Phone,
  Briefcase,
} from "lucide-react";
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

// Progress Bar Component
const ProgressBar = ({ value, max = 100, color = "red", label, showValue = true }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors = {
    red: "bg-red-500",
    blue: "bg-red-500",
    green: "bg-red-500",
    yellow: "bg-red-500",
    cyan: "bg-red-500",
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">{label}</span>
          {showValue && <span className="text-white/50">{value}/{max}</span>}
        </div>
      )}
      <div className="h-2 bg-zinc-700/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${colors[color]} rounded-full`}
        />
      </div>
    </div>
  );
};

// Funnel Stage Component
const FunnelStage = ({ stage, count, total, color, icon: Icon }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const width = Math.max(percentage, 20); // Minimum width for visibility

  return (
    <motion.div variants={itemVariants} className="relative">
      <div
        className={`p-4 rounded-lg border border-white/10 ${color}`}
        style={{ width: `${width}%`, minWidth: "200px" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-medium text-white">{stage}</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-white">{count}</span>
            <span className="text-sm text-white/50 ml-1">({percentage}%)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, icon: Icon, color = "red", trend }) => {
  const colors = {
    red: "from-red-500/20 to-red-600/20 border-red-500/30",
    blue: "from-red-500/20 to-red-600/20 border-red-500/30",
    green: "from-red-500/20 to-red-600/20 border-red-500/30",
    yellow: "from-red-500/20 to-red-600/20 border-red-500/30",
    cyan: "from-red-500/20 to-red-600/20 border-red-500/30",
  };

  const iconColors = {
    red: "text-red-400",
    blue: "text-red-400",
    green: "text-red-400",
    yellow: "text-red-400",
    cyan: "text-red-400",
  };

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className={`p-4 bg-gradient-to-br ${colors[color]}`}>
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg bg-black/20 ${iconColors[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          {trend !== undefined && <TrendIndicator value={trend} />}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-0.5">{value}</h3>
          <p className="text-xs text-white/70 font-medium">{title}</p>
          {subtitle && <p className="text-[10px] text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Outreach Type Stats Component
const OutreachTypeStats = ({ data }) => {
  const types = [
    { key: "email", label: "Email", icon: Mail, color: "red" },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "red" },
    { key: "linkedin_connection", label: "Connection", icon: Linkedin, color: "red" },
    { key: "call", label: "Call", icon: Phone, color: "red" },
  ];

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Outreach by Type</h3>
      <div className="space-y-4">
        {types.map((type) => (
          <div key={type.key} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${type.color}-500/20`}>
              <type.icon className={`w-4 h-4 text-${type.color}-400`} />
            </div>
            <div className="flex-1">
              <ProgressBar
                value={data[type.key] || 0}
                max={total || 1}
                color={type.color}
                label={type.label}
                showValue
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Intelligence Distribution Component
const IntelligenceDistribution = ({ data }) => {
  const levels = [
    { key: "Critical", color: "red", count: data.critical || 0 },
    { key: "High", color: "red", count: data.high || 0 },
    { key: "Medium", color: "red", count: data.medium || 0 },
    { key: "Low", color: "zinc", count: data.low || 0 },
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
              className={`h-full bg-${level.color}-500`}
              title={`${level.key}: ${level.count}`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {levels.map((level) => (
          <div key={level.key} className="text-center">
            <div className={`text-sm font-bold text-${level.color}-400`}>{level.count}</div>
            <div className="text-[10px] text-white/50">{level.key}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// Campaign Performance Table
const CampaignPerformanceTable = ({ campaigns, outreachTasks }) => {
  const campaignStats = useMemo(() => {
    return campaigns.map((campaign) => {
      const tasks = outreachTasks.filter((t) => t.campaign_id === campaign.id);
      const sent = tasks.filter((t) => t.status === "sent" || t.status === "replied").length;
      const replied = tasks.filter((t) => t.status === "replied").length;
      const responseRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

      return {
        ...campaign,
        totalTasks: tasks.length,
        sent,
        replied,
        responseRate,
      };
    });
  }, [campaigns, outreachTasks]);

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Campaign Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-white/50 border-b border-white/10">
              <th className="pb-3 font-medium">Campaign</th>
              <th className="pb-3 font-medium text-right">Tasks</th>
              <th className="pb-3 font-medium text-right">Sent</th>
              <th className="pb-3 font-medium text-right">Replied</th>
              <th className="pb-3 font-medium text-right">Response Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {campaignStats.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-white/40">
                  No campaigns found
                </td>
              </tr>
            ) : (
              campaignStats.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-white/5">
                  <td className="py-3">
                    <div>
                      <p className="font-medium text-white">{campaign.name}</p>
                      <p className="text-xs text-white/50">{campaign.status}</p>
                    </div>
                  </td>
                  <td className="py-3 text-right text-white/70">{campaign.totalTasks}</td>
                  <td className="py-3 text-right text-white/70">{campaign.sent}</td>
                  <td className="py-3 text-right text-white/70">{campaign.replied}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-medium ${
                        campaign.responseRate >= 20
                          ? "text-red-400"
                          : campaign.responseRate >= 10
                          ? "text-red-300"
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

// Recent Activity Component
const RecentActivity = ({ outreachTasks }) => {
  const recentTasks = useMemo(() => {
    return [...outreachTasks]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 10);
  }, [outreachTasks]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <Send className="w-4 h-4 text-red-400" />;
      case "replied":
        return <MessageSquare className="w-4 h-4 text-red-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

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

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recentTasks.length === 0 ? (
          <p className="text-center text-white/40 py-4">No recent activity</p>
        ) : (
          recentTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="p-2 rounded-lg bg-zinc-800/50">
                {getStatusIcon(task.status)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {task.candidate_name || "Unknown Candidate"}
                </p>
                <p className="text-xs text-white/50">
                  {task.task_type?.replace(/_/g, " ")} - {task.status}
                </p>
              </div>
              <span className="text-xs text-white/40">{formatTime(task.updated_at)}</span>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};

export default function TalentAnalytics() {
  const { user } = useUser();

  const [candidates, setCandidates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [outreachTasks, setOutreachTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    if (user?.organization_id) {
      fetchData();
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
          .eq("organization_id", user.organization_id),
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

      // Non-blocking error handling - log warnings but continue
      if (candidatesRes.error) {
        console.warn("Failed to fetch candidates:", candidatesRes.error);
      }
      if (campaignsRes.error) {
        console.warn("Failed to fetch campaigns:", campaignsRes.error);
      }
      if (tasksRes.error) {
        console.warn("Failed to fetch outreach tasks:", tasksRes.error);
      }
      if (projectsRes.error) {
        console.warn("Failed to fetch projects:", projectsRes.error);
      }
      if (rolesRes.error) {
        console.warn("Failed to fetch roles:", rolesRes.error);
      }

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
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
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

    // High-risk candidates (score >= 60)
    const highRiskCandidates = candidates.filter((c) => (c.intelligence_score || 0) >= 60).length;

    // Outreach by type
    const outreachByType = outreachTasks.reduce((acc, task) => {
      const type = task.task_type || "email";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

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
    const activeRoles = roles.filter((r) => r.status === "active").length;
    const filledRoles = roles.filter((r) => r.status === "filled").length;

    return {
      totalCandidates,
      activeCampaigns,
      totalOutreach,
      sentOutreach,
      repliedOutreach,
      responseRate,
      highRiskCandidates,
      outreachByType,
      intelligenceDistribution,
      activeProjects,
      activeRoles,
      filledRoles,
    };
  }, [candidates, campaigns, outreachTasks, projects, roles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black relative">
        <div className="relative z-10 w-full px-4 lg:px-6 py-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-4 gap-3 mb-4">
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
      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          title="Talent Analytics"
          subtitle="Pipeline metrics and recruitment performance"
          color="red"
          actions={
            <TalentActionButtons extra={
              <>
                <div className="w-px h-6 bg-zinc-700" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32 bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  onClick={fetchData}
                  className="text-white/60 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </>
            } />
          }
        />

        {/* Key Metrics */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <MetricCard
            title="Total Candidates"
            value={metrics.totalCandidates}
            subtitle={`${metrics.highRiskCandidates} high-risk`}
            icon={Users}
            color="red"
          />
          <MetricCard
            title="Active Campaigns"
            value={metrics.activeCampaigns}
            subtitle={`${campaigns.length} total`}
            icon={Megaphone}
            color="red"
          />
          <MetricCard
            title="Outreach Sent"
            value={metrics.sentOutreach}
            subtitle={`${metrics.totalOutreach} total tasks`}
            icon={Send}
            color="red"
          />
          <MetricCard
            title="Response Rate"
            value={`${metrics.responseRate}%`}
            subtitle={`${metrics.repliedOutreach} replies`}
            icon={MessageSquare}
            color="red"
          />
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <MetricCard
            title="Active Projects"
            value={metrics.activeProjects}
            subtitle={`${projects.length} total`}
            icon={Briefcase}
            color="red"
          />
          <MetricCard
            title="Open Roles"
            value={metrics.activeRoles}
            subtitle={`${roles.length} total roles`}
            icon={Target}
            color="red"
          />
          <MetricCard
            title="Roles Filled"
            value={metrics.filledRoles}
            subtitle={`${Math.round((metrics.filledRoles / Math.max(roles.length, 1)) * 100)}% success`}
            icon={CheckCircle2}
            color="red"
          />
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
            <RecentActivity outreachTasks={outreachTasks} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
