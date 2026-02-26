import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Eye,
  TrendingUp,
  MousePointer,
  Percent,
  Sparkles,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Link2,
  CalendarDays,
  Loader2,
  Unplug,
  Zap,
  Target,
  Users,
  Globe,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber, AnimatedCount } from "@/components/ui/AnimatedNumber";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { SOCIAL_PLATFORMS } from "@/lib/reach-constants";
import { CreditCostBadge } from '@/components/credits/CreditCostBadge';

// ---------------------------------------------------------------------------
// Date range options
// ---------------------------------------------------------------------------
const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "This year" },
];

// ---------------------------------------------------------------------------
// Sample data for empty state with charts
// ---------------------------------------------------------------------------
function generateSampleTimeSeries(days) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reach: Math.floor(800 + Math.random() * 1200 + i * 5),
      impressions: Math.floor(1200 + Math.random() * 1800 + i * 8),
    });
  }
  return data;
}

const SAMPLE_PLATFORM_DATA = [
  { platform: "Instagram", reach: 4200, impressions: 6800, clicks: 340, fill: "#E4405F" },
  { platform: "Facebook", reach: 3100, impressions: 5200, clicks: 210, fill: "#1877F2" },
  { platform: "LinkedIn", reach: 1800, impressions: 2900, clicks: 180, fill: "#0A66C2" },
  { platform: "X / Twitter", reach: 950, impressions: 1600, clicks: 95, fill: "#1DA1F2" },
  { platform: "TikTok", reach: 2600, impressions: 4100, clicks: 420, fill: "#69C9D0" },
];

const SAMPLE_INSIGHTS = [
  {
    id: "s1",
    insight_type: "trend",
    title: "Instagram engagement peaks on Tuesdays",
    description: "Your Instagram posts published on Tuesdays between 10-12 AM see 34% higher engagement than other days.",
  },
  {
    id: "s2",
    insight_type: "recommendation",
    title: "Increase LinkedIn posting frequency",
    description: "You're posting 2x/week on LinkedIn but your audience engagement suggests 4x/week would drive 28% more reach.",
  },
  {
    id: "s3",
    insight_type: "opportunity",
    title: "TikTok audience growing fast",
    description: "Your TikTok follower growth rate is 3.2x higher than other platforms. Consider allocating more content budget here.",
  },
];

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-medium text-zinc-400 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300 capitalize">{entry.dataKey}:</span>
          <span className="font-semibold text-white">
            {Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, change, color, delay, isSample }) {
  const isPositive = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {isSample && (
          <Badge variant="outline" size="xs" className="text-zinc-500 border-zinc-700">
            Sample
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        <AnimatedCount value={value} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-cyan-400" : "text-red-400"}`}>
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Insight card
// ---------------------------------------------------------------------------
const INSIGHT_ICONS = {
  trend: TrendingUp,
  anomaly: Zap,
  recommendation: Target,
  opportunity: Sparkles,
};

const INSIGHT_COLORS = {
  trend: "text-cyan-400 bg-cyan-500/10",
  anomaly: "text-red-400 bg-red-500/10",
  recommendation: "text-blue-400 bg-blue-500/10",
  opportunity: "text-amber-400 bg-amber-500/10",
};

function InsightCard({ insight, onDismiss, isSample }) {
  const InsightIcon = INSIGHT_ICONS[insight.insight_type] || Sparkles;
  const colors = INSIGHT_COLORS[insight.insight_type] || INSIGHT_COLORS.recommendation;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm relative group"
    >
      {!isSample && onDismiss && (
        <button
          onClick={() => onDismiss(insight.id)}
          className="absolute top-3 right-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${colors}`}>
          <InsightIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{insight.title}</h3>
            {isSample && (
              <Badge variant="outline" size="xs" className="text-zinc-500 border-zinc-700 shrink-0">
                Sample
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Top performing content row
// ---------------------------------------------------------------------------
function TopContentItem({ post, index }) {
  const platformKey = post.platform || "instagram";
  const platformInfo = SOCIAL_PLATFORMS[platformKey] || { name: platformKey, color: "#06b6d4" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-zinc-800/40 transition-colors"
    >
      <span className="text-lg font-bold text-zinc-500 w-6 text-right">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {post.caption || "Untitled post"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            size="xs"
            className="border-none text-white/80"
            style={{ backgroundColor: platformInfo.color + "33" }}
          >
            {platformInfo.name}
          </Badge>
          <span className="text-xs text-zinc-500">
            {post.metric_date
              ? new Date(post.metric_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-semibold text-cyan-400">
          {Number(post.engagement_rate || 0).toFixed(1)}%
        </span>
        <p className="text-xs text-zinc-500">engagement</p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state (no connections)
// ---------------------------------------------------------------------------
function EmptyState() {
  const features = [
    { icon: Eye, label: "Track Reach", desc: "See how many people view your content" },
    { icon: TrendingUp, label: "Measure Growth", desc: "Monitor follower and engagement growth" },
    { icon: Sparkles, label: "AI Insights", desc: "Get actionable recommendations from AI" },
    { icon: Globe, label: "Cross-Platform", desc: "All your channels in one dashboard" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
          <Unplug className="w-10 h-10 text-cyan-400" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-zinc-400" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">
        Connect your social accounts to start tracking
      </h2>
      <p className="text-sm text-zinc-400 mb-8 max-w-md text-center">
        Link your social media accounts to unlock performance analytics, AI-powered insights,
        and cross-platform comparison.
      </p>

      <Link
        to={createPageUrl("ReachSettings")}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm transition-colors"
      >
        Connect Accounts
        <ArrowUpRight className="w-4 h-4" />
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 w-full max-w-2xl">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center"
          >
            <div className="p-2 rounded-xl bg-cyan-500/10 w-fit mx-auto mb-3">
              <f.icon className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-sm font-medium text-white mb-0.5">{f.label}</p>
            <p className="text-xs text-zinc-500">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Platform bar chart custom bar shape
// ---------------------------------------------------------------------------
const PLATFORM_COLORS = {
  Instagram: "#E4405F",
  Facebook: "#1877F2",
  LinkedIn: "#0A66C2",
  "X / Twitter": "#1DA1F2",
  TikTok: "#69C9D0",
  "Google Analytics": "#F9AB00",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ReachDashboard() {
  const { user } = useUser();
  const companyId = user?.company_id;

  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [insights, setInsights] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [refreshingInsights, setRefreshingInsights] = useState(false);

  const isConnected = connections.length > 0;
  const hasRealMetrics = metrics.length > 0;

  // -------------------------------------------------------------------------
  // Fetch connections
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("reach_social_connections")
        .select("id, platform, account_name, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true);
      setConnections(data || []);
    })();
  }, [companyId]);

  // -------------------------------------------------------------------------
  // Fetch metrics + insights
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!companyId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const days = parseInt(dateRange, 10);
        const from = new Date();
        from.setDate(from.getDate() - days);
        const fromStr = from.toISOString().slice(0, 10);

        const [metricsRes, insightsRes, postsRes] = await Promise.all([
          supabase
            .from("reach_performance_metrics")
            .select("*")
            .eq("company_id", companyId)
            .gte("metric_date", fromStr)
            .order("metric_date", { ascending: true }),
          supabase
            .from("reach_insights")
            .select("*")
            .eq("company_id", companyId)
            .eq("is_dismissed", false)
            .order("created_at", { ascending: false })
            .limit(6),
          supabase
            .from("reach_performance_metrics")
            .select("*")
            .eq("company_id", companyId)
            .gte("metric_date", fromStr)
            .order("engagement_rate", { ascending: false })
            .limit(5),
        ]);

        setMetrics(metricsRes.data || []);
        setInsights(insightsRes.data || []);
        setTopPosts(postsRes.data || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, dateRange]);

  // -------------------------------------------------------------------------
  // Aggregated stats
  // -------------------------------------------------------------------------
  const stats = useMemo(() => {
    const source = hasRealMetrics ? metrics : [];
    const totalReach = source.reduce((s, m) => s + (m.reach || 0), 0);
    const totalImpressions = source.reduce((s, m) => s + (m.impressions || 0), 0);
    const totalClicks = source.reduce((s, m) => s + (m.clicks || 0), 0);
    const avgEngagement =
      source.length > 0
        ? source.reduce((s, m) => s + (parseFloat(m.engagement_rate) || 0), 0) / source.length
        : 0;

    return { totalReach, totalImpressions, totalClicks, avgEngagement };
  }, [metrics, hasRealMetrics]);

  // -------------------------------------------------------------------------
  // Time series chart data
  // -------------------------------------------------------------------------
  const timeSeriesData = useMemo(() => {
    if (hasRealMetrics) {
      const grouped = {};
      for (const m of metrics) {
        const d = m.metric_date;
        if (!grouped[d]) grouped[d] = { date: d, reach: 0, impressions: 0 };
        grouped[d].reach += m.reach || 0;
        grouped[d].impressions += m.impressions || 0;
      }
      return Object.values(grouped)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({
          ...r,
          label: new Date(r.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        }));
    }
    return generateSampleTimeSeries(parseInt(dateRange, 10));
  }, [metrics, hasRealMetrics, dateRange]);

  // -------------------------------------------------------------------------
  // Platform comparison data
  // -------------------------------------------------------------------------
  const platformData = useMemo(() => {
    if (hasRealMetrics) {
      const grouped = {};
      for (const m of metrics) {
        const p = m.platform || "unknown";
        const pName =
          SOCIAL_PLATFORMS[p]?.name || p.charAt(0).toUpperCase() + p.slice(1);
        if (!grouped[pName])
          grouped[pName] = { platform: pName, reach: 0, impressions: 0, clicks: 0 };
        grouped[pName].reach += m.reach || 0;
        grouped[pName].impressions += m.impressions || 0;
        grouped[pName].clicks += m.clicks || 0;
      }
      return Object.values(grouped);
    }
    return SAMPLE_PLATFORM_DATA;
  }, [metrics, hasRealMetrics]);

  // -------------------------------------------------------------------------
  // Dismiss insight
  // -------------------------------------------------------------------------
  const dismissInsight = useCallback(
    async (id) => {
      setInsights((prev) => prev.filter((i) => i.id !== id));
      const { error } = await supabase
        .from("reach_insights")
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) {
        toast.error("Failed to dismiss insight");
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Refresh insights (placeholder calls edge fn)
  // -------------------------------------------------------------------------
  const refreshInsights = useCallback(async () => {
    if (!companyId) return;
    setRefreshingInsights(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reach-generate-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            metrics_data: metrics.slice(0, 50),
          }),
        }
      );
      const body = await res.json();
      if (body.insights?.length) {
        // Upsert insights to DB
        for (const ins of body.insights) {
          await supabase.from("reach_insights").insert({
            company_id: companyId,
            insight_type: ins.insight_type,
            title: ins.title,
            description: ins.description,
            data: ins,
            is_dismissed: false,
          });
        }
        // Refetch
        const { data } = await supabase
          .from("reach_insights")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_dismissed", false)
          .order("created_at", { ascending: false })
          .limit(6);
        setInsights(data || []);
        toast.success("Insights refreshed");
      } else {
        toast.info(body.message || "No new insights generated");
      }
    } catch (err) {
      toast.error("Failed to generate insights");
    } finally {
      setRefreshingInsights(false);
    }
  }, [companyId, metrics]);

  // -------------------------------------------------------------------------
  // Active display insights (real or sample)
  // -------------------------------------------------------------------------
  const displayInsights = insights.length > 0 ? insights : SAMPLE_INSIGHTS;
  const insightsAreSample = insights.length === 0;

  // -------------------------------------------------------------------------
  // Sample stat values for empty state
  // -------------------------------------------------------------------------
  const displayStats = hasRealMetrics
    ? stats
    : {
        totalReach: 12640,
        totalImpressions: 20500,
        totalClicks: 1245,
        avgEngagement: 4.7,
      };

  const isSample = !hasRealMetrics;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Performance Dashboard</h1>
            <p className="text-sm text-zinc-400">
              Track your marketing performance across all channels
            </p>
          </div>
        </div>

        {/* Date range selector */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 pr-10 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 cursor-pointer"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Empty state -- no connections */}
      {!loading && !isConnected && <EmptyState />}

      {/* Connected state (or sample data preview when connected but no metrics) */}
      {!loading && isConnected && (
        <>
          {/* Sample data banner */}
          {isSample && isConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300/80">
                Showing sample data. Metrics will populate as your connected accounts generate activity.
              </p>
            </motion.div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Eye}
              label="Total Reach"
              value={displayStats.totalReach}
              change={12.4}
              color="bg-cyan-500/10 text-cyan-400"
              delay={0}
              isSample={isSample}
            />
            <StatCard
              icon={TrendingUp}
              label="Total Impressions"
              value={displayStats.totalImpressions}
              change={8.2}
              color="bg-blue-500/10 text-blue-400"
              delay={0.05}
              isSample={isSample}
            />
            <StatCard
              icon={MousePointer}
              label="Total Clicks"
              value={displayStats.totalClicks}
              change={-3.1}
              color="bg-purple-500/10 text-purple-400"
              delay={0.1}
              isSample={isSample}
            />
            <StatCard
              icon={Percent}
              label="Avg Engagement"
              value={displayStats.avgEngagement}
              change={5.6}
              color="bg-amber-500/10 text-amber-400"
              delay={0.15}
              isSample={isSample}
            />
          </div>

          {/* Main area chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Reach & Impressions</h2>
                <p className="text-sm text-zinc-500">Over time across all platforms</p>
              </div>
              {isSample && (
                <Badge variant="outline" size="sm" className="text-zinc-500 border-zinc-700">
                  Sample Data
                </Badge>
              )}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#27272a" }}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(val) => (
                      <span className="text-zinc-400 text-sm capitalize">{val}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="reach"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#reachGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#impressionsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Two-column layout: platform comparison + top content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform comparison bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Platform Comparison</h2>
                  <p className="text-sm text-zinc-500">Metrics by platform</p>
                </div>
                {isSample && (
                  <Badge variant="outline" size="xs" className="text-zinc-500 border-zinc-700">
                    Sample
                  </Badge>
                )}
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="platform"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "#27272a" }}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: 12 }}
                      formatter={(val) => (
                        <span className="text-zinc-400 text-sm capitalize">{val}</span>
                      )}
                    />
                    <Bar dataKey="reach" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="impressions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Top performing content */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Top Performing Content</h2>
                  <p className="text-sm text-zinc-500">Ranked by engagement rate</p>
                </div>
                {isSample && (
                  <Badge variant="outline" size="xs" className="text-zinc-500 border-zinc-700">
                    Sample
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {(hasRealMetrics && topPosts.length > 0
                  ? topPosts
                  : [
                      {
                        id: "s1",
                        platform: "instagram",
                        caption: "Summer collection launch - limited edition pieces available now",
                        engagement_rate: 8.4,
                        metric_date: "2026-02-15",
                      },
                      {
                        id: "s2",
                        platform: "tiktok",
                        caption: "Behind the scenes of our latest photoshoot",
                        engagement_rate: 6.2,
                        metric_date: "2026-02-13",
                      },
                      {
                        id: "s3",
                        platform: "linkedin",
                        caption: "We are hiring! Join our growing team of innovators",
                        engagement_rate: 5.1,
                        metric_date: "2026-02-12",
                      },
                      {
                        id: "s4",
                        platform: "facebook",
                        caption: "Customer spotlight: How Jane doubled her revenue with our platform",
                        engagement_rate: 4.3,
                        metric_date: "2026-02-10",
                      },
                      {
                        id: "s5",
                        platform: "twitter",
                        caption: "Exciting product update dropping next week. Stay tuned!",
                        engagement_rate: 3.8,
                        metric_date: "2026-02-08",
                      },
                    ]
                ).map((post, i) => (
                  <TopContentItem key={post.id || i} post={post} index={i} />
                ))}
              </div>
              {hasRealMetrics && topPosts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <Link
                    to={createPageUrl("ReachCalendar")}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    View in Calendar
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Insights</h2>
                  <p className="text-sm text-zinc-500">
                    {insightsAreSample
                      ? "Sample insights -- connect accounts and post content to generate real ones"
                      : "Actionable recommendations powered by AI"}
                  </p>
                </div>
              </div>
              <button
                onClick={refreshInsights}
                disabled={refreshingInsights}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 text-sm text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshingInsights ? "animate-spin" : ""}`}
                />
                Refresh Insights
                <CreditCostBadge credits={1} />
              </button>
            </div>

            {displayInsights.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
                <Sparkles className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">
                  No insights yet -- connect accounts and post content to generate AI insights
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {displayInsights.map((ins) => (
                    <InsightCard
                      key={ins.id}
                      insight={ins}
                      onDismiss={insightsAreSample ? null : dismissInsight}
                      isSample={insightsAreSample}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
