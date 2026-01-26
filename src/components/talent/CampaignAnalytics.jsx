import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  Send,
  MessageSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  Sparkles,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

/**
 * MetricCard - Single stat display with optional trend indicator
 */
export const MetricCard = ({
  label,
  value,
  unit = "",
  trend = null,
  trendValue = null,
  icon: Icon,
  color = "red",
  size = "md"
}) => {
  const colorStyles = {
    red: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", icon: "text-red-400" },
    green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", icon: "text-green-400" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", icon: "text-blue-400" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", icon: "text-cyan-400" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", icon: "text-amber-400" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", icon: "text-purple-400" },
  };

  const sizeStyles = {
    sm: { padding: "p-3", valueSize: "text-xl", labelSize: "text-xs", iconSize: "w-4 h-4" },
    md: { padding: "p-4", valueSize: "text-2xl", labelSize: "text-sm", iconSize: "w-5 h-5" },
    lg: { padding: "p-5", valueSize: "text-3xl", labelSize: "text-sm", iconSize: "w-6 h-6" },
  };

  const colors = colorStyles[color];
  const sizes = sizeStyles[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${sizes.padding} ${colors.bg} border ${colors.border} rounded-xl hover:border-opacity-50 transition-all`}
    >
      <div className="flex items-start justify-between mb-2">
        {Icon && (
          <div className={`p-2 rounded-lg bg-zinc-800/50`}>
            <Icon className={`${sizes.iconSize} ${colors.icon}`} />
          </div>
        )}
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div className={`${sizes.valueSize} font-bold text-white mb-1`}>
        {value}{unit && <span className="text-lg text-zinc-400 ml-1">{unit}</span>}
      </div>
      <div className={`${sizes.labelSize} text-zinc-400`}>{label}</div>
    </motion.div>
  );
};

/**
 * CampaignFunnel - Horizontal funnel visualization showing candidate progression
 */
export const CampaignFunnel = ({ stages }) => {
  if (!stages || stages.length === 0) return null;

  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-red-400" />
        <h3 className="text-white font-medium">Candidate Funnel</h3>
      </div>

      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const conversionFromPrev = idx > 0 && stages[idx - 1].count > 0
            ? ((stage.count / stages[idx - 1].count) * 100).toFixed(0)
            : null;

          return (
            <div key={stage.label} className="relative">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {stage.icon && <stage.icon className={`w-4 h-4 ${stage.iconColor || 'text-zinc-400'}`} />}
                  <span className="text-sm text-zinc-300">{stage.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {conversionFromPrev && (
                    <span className="text-xs text-zinc-500">
                      {conversionFromPrev}% from prev
                    </span>
                  )}
                  <span className="text-sm font-semibold text-white">{stage.count}</span>
                </div>
              </div>
              <div className="h-8 bg-zinc-900/50 rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercent}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 ${stage.color || 'bg-red-500'} rounded-lg`}
                  style={{ minWidth: stage.count > 0 ? '8px' : '0' }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs font-medium text-white/80">
                    {widthPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion arrows */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-700/30">
        {stages.slice(0, -1).map((stage, idx) => {
          const nextStage = stages[idx + 1];
          const conversion = stage.count > 0 ? ((nextStage.count / stage.count) * 100).toFixed(1) : 0;
          return (
            <React.Fragment key={`conv-${idx}`}>
              <div className="text-center">
                <div className="text-xs text-zinc-500">{stage.label.split(' ')[0]}</div>
                <div className="text-sm font-medium text-white">{stage.count}</div>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <span className="text-xs text-zinc-500">{conversion}%</span>
              </div>
            </React.Fragment>
          );
        })}
        <div className="text-center">
          <div className="text-xs text-zinc-500">{stages[stages.length - 1]?.label.split(' ')[0]}</div>
          <div className="text-sm font-medium text-white">{stages[stages.length - 1]?.count}</div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * ResponseTimeline - Timeline showing when candidate responses came in
 */
export const ResponseTimeline = ({ responses }) => {
  if (!responses || responses.length === 0) {
    return (
      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-medium">Response Timeline</h3>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No responses yet</p>
          <p className="text-zinc-600 text-xs mt-1">Responses will appear here as candidates reply</p>
        </div>
      </div>
    );
  }

  const sentimentStyles = {
    positive: { bg: "bg-green-500", text: "text-green-400", label: "Positive" },
    neutral: { bg: "bg-blue-500", text: "text-blue-400", label: "Neutral" },
    negative: { bg: "bg-red-500", text: "text-red-400", label: "Negative" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h3 className="text-white font-medium">Response Timeline</h3>
        <span className="ml-auto text-xs text-zinc-500">{responses.length} responses</span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-zinc-700" />

        <div className="space-y-4">
          {responses.slice(0, 10).map((response, idx) => {
            const sentiment = sentimentStyles[response.sentiment] || sentimentStyles.neutral;
            const date = new Date(response.respondedAt);
            const timeAgo = getTimeAgo(date);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-3 pl-0"
              >
                {/* Timeline dot */}
                <div className={`w-4 h-4 rounded-full ${sentiment.bg} flex-shrink-0 mt-0.5 relative z-10 ring-2 ring-zinc-900`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm truncate">
                      {response.candidateName}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${sentiment.bg}/20 ${sentiment.text}`}>
                      {sentiment.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo}</span>
                    <span>•</span>
                    <span>{date.toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {responses.length > 10 && (
          <div className="text-center mt-4 pt-2 border-t border-zinc-700/30">
            <span className="text-xs text-zinc-500">+{responses.length - 10} more responses</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * SourceBreakdown - Shows which nests/sources produced best candidates
 */
export const SourceBreakdown = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return (
      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-medium">Source Performance</h3>
        </div>
        <div className="text-center py-8">
          <Target className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No source data available</p>
        </div>
      </div>
    );
  }

  const totalCount = sources.reduce((sum, s) => sum + s.count, 0);
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-amber-500', 'bg-green-500'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-medium">Source Performance</h3>
      </div>

      {/* Horizontal stacked bar */}
      <div className="h-6 bg-zinc-900/50 rounded-lg overflow-hidden flex mb-4">
        {sources.map((source, idx) => {
          const widthPercent = totalCount > 0 ? (source.count / totalCount) * 100 : 0;
          return (
            <motion.div
              key={source.nestName}
              initial={{ width: 0 }}
              animate={{ width: `${widthPercent}%` }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              className={`${colors[idx % colors.length]} h-full`}
              title={`${source.nestName}: ${source.count} (${widthPercent.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Source list */}
      <div className="space-y-3">
        {sources.map((source, idx) => {
          const percentage = totalCount > 0 ? ((source.count / totalCount) * 100).toFixed(1) : 0;
          return (
            <div key={source.nestName} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors[idx % colors.length]}`} />
                <span className="text-sm text-zinc-300 truncate max-w-[150px]">{source.nestName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white font-medium">{source.count}</span>
                <span className="text-xs text-zinc-500 w-12 text-right">{percentage}%</span>
                {source.responseRate !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className={source.responseRate >= 20 ? 'text-green-400' : 'text-zinc-500'}>
                      {source.responseRate.toFixed(0)}% resp
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Best performer highlight */}
      {sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-700/30">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-zinc-400">Best performer:</span>
            <span className="text-xs text-amber-400 font-medium">
              {sources.reduce((best, s) => (s.responseRate || 0) > (best.responseRate || 0) ? s : best, sources[0]).nestName}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * RateGauge - Circular gauge for showing rates/percentages
 */
export const RateGauge = ({ value, label, size = "md", color = "red" }) => {
  const sizes = {
    sm: { width: 60, height: 60, strokeWidth: 4, fontSize: "text-sm" },
    md: { width: 80, height: 80, strokeWidth: 5, fontSize: "text-lg" },
    lg: { width: 100, height: 100, strokeWidth: 6, fontSize: "text-xl" },
  };

  const colorStyles = {
    red: "#ef4444",
    green: "#22c55e",
    blue: "#3b82f6",
    cyan: "#06b6d4",
    amber: "#f59e0b",
    purple: "#a855f7",
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={width} height={height} className="-rotate-90">
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke={colorStyles[color]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${fontSize} font-bold text-white`}>{value.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-xs text-zinc-400 mt-2">{label}</span>
    </div>
  );
};

/**
 * AnalyticsTab - Main analytics component for campaign detail
 */
export const AnalyticsTab = ({ campaign, outreachTasks = [], matchedCandidates = [] }) => {
  const metrics = useMemo(() => {
    // Calculate funnel metrics
    const matched = matchedCandidates.length;
    const selectedForOutreach = outreachTasks.length;
    const sent = outreachTasks.filter(t => ['sent', 'replied'].includes(t.status)).length;
    const replied = outreachTasks.filter(t => t.status === 'replied').length;
    const interviewed = outreachTasks.filter(t => t.status === 'interviewed').length;
    const hired = outreachTasks.filter(t => t.status === 'hired').length;

    // Calculate rates
    const selectionRate = matched > 0 ? (selectedForOutreach / matched) * 100 : 0;
    const responseRate = sent > 0 ? (replied / sent) * 100 : 0;
    const interviewRate = replied > 0 ? (interviewed / replied) * 100 : 0;
    const conversionRate = matched > 0 ? (hired / matched) * 100 : 0;

    // Calculate timing metrics
    const campaignAge = campaign?.created_at
      ? Math.floor((Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate average response time
    const responseTimes = outreachTasks
      .filter(t => t.sent_at && t.responded_at)
      .map(t => (new Date(t.responded_at) - new Date(t.sent_at)) / (1000 * 60 * 60 * 24));
    const avgDaysToResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    return {
      funnel: { matched, selectedForOutreach, sent, replied, interviewed, hired },
      rates: { selectionRate, responseRate, interviewRate, conversionRate },
      timing: { avgDaysToResponse, campaignAge },
    };
  }, [campaign, outreachTasks, matchedCandidates]);

  // Build funnel stages
  const funnelStages = [
    { label: "Matched", count: metrics.funnel.matched, color: "bg-blue-500", icon: Users, iconColor: "text-blue-400" },
    { label: "Selected", count: metrics.funnel.selectedForOutreach, color: "bg-purple-500", icon: UserCheck, iconColor: "text-purple-400" },
    { label: "Messaged", count: metrics.funnel.sent, color: "bg-cyan-500", icon: Send, iconColor: "text-cyan-400" },
    { label: "Responded", count: metrics.funnel.replied, color: "bg-green-500", icon: MessageSquare, iconColor: "text-green-400" },
    { label: "Interviewed", count: metrics.funnel.interviewed, color: "bg-amber-500", icon: Calendar, iconColor: "text-amber-400" },
    { label: "Hired", count: metrics.funnel.hired, color: "bg-red-500", icon: Award, iconColor: "text-red-400" },
  ];

  // Build response timeline from tasks
  const responses = outreachTasks
    .filter(t => t.responded_at)
    .map(t => ({
      candidateName: t.candidate?.first_name
        ? `${t.candidate.first_name} ${t.candidate.last_name || ''}`.trim()
        : 'Unknown',
      respondedAt: t.responded_at,
      sentiment: t.response_sentiment || 'neutral',
    }))
    .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));

  // Build source breakdown (if nest data is available)
  const sources = useMemo(() => {
    // Group by nest if available
    const nestMap = new Map();

    matchedCandidates.forEach(c => {
      const nestName = c.nest_name || campaign?.nest?.name || 'Direct Candidates';
      if (!nestMap.has(nestName)) {
        nestMap.set(nestName, { nestName, count: 0, replied: 0, sent: 0 });
      }
      const data = nestMap.get(nestName);
      data.count++;
    });

    // Add response data from tasks
    outreachTasks.forEach(t => {
      const nestName = t.candidate?.nest_name || campaign?.nest?.name || 'Direct Candidates';
      if (nestMap.has(nestName)) {
        const data = nestMap.get(nestName);
        if (['sent', 'replied'].includes(t.status)) data.sent++;
        if (t.status === 'replied') data.replied++;
      }
    });

    return Array.from(nestMap.values()).map(s => ({
      ...s,
      responseRate: s.sent > 0 ? (s.replied / s.sent) * 100 : 0,
    }));
  }, [matchedCandidates, outreachTasks, campaign]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Response Rate"
          value={metrics.rates.responseRate.toFixed(1)}
          unit="%"
          icon={MessageSquare}
          color={metrics.rates.responseRate >= 20 ? "green" : metrics.rates.responseRate >= 10 ? "amber" : "red"}
          trend={metrics.rates.responseRate >= 15 ? "up" : null}
        />
        <MetricCard
          label="Selection Rate"
          value={metrics.rates.selectionRate.toFixed(1)}
          unit="%"
          icon={UserCheck}
          color="purple"
        />
        <MetricCard
          label="Campaign Age"
          value={metrics.timing.campaignAge}
          unit="days"
          icon={Clock}
          color="blue"
        />
        <MetricCard
          label="Avg Response Time"
          value={metrics.timing.avgDaysToResponse ? metrics.timing.avgDaysToResponse.toFixed(1) : "—"}
          unit={metrics.timing.avgDaysToResponse ? "days" : ""}
          icon={TrendingUp}
          color="cyan"
        />
      </div>

      {/* Rate Gauges */}
      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-medium">Conversion Rates</h3>
        </div>
        <div className="flex items-center justify-around">
          <RateGauge value={metrics.rates.selectionRate} label="Selection" color="purple" />
          <RateGauge value={metrics.rates.responseRate} label="Response" color="green" />
          <RateGauge value={metrics.rates.interviewRate} label="Interview" color="cyan" />
          <RateGauge value={metrics.rates.conversionRate} label="Hired" color="red" />
        </div>
      </div>

      {/* Funnel Visualization */}
      <CampaignFunnel stages={funnelStages} />

      {/* Two Column Layout for Timeline and Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseTimeline responses={responses} />
        <SourceBreakdown sources={sources} />
      </div>

      {/* Stats Summary */}
      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-red-400" />
          <h3 className="text-white font-medium">Summary Statistics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{metrics.funnel.matched}</div>
            <div className="text-xs text-zinc-500">Total Matched</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.funnel.sent}</div>
            <div className="text-xs text-zinc-500">Messages Sent</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{metrics.funnel.replied}</div>
            <div className="text-xs text-zinc-500">Responses</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{metrics.funnel.hired}</div>
            <div className="text-xs text-zinc-500">Hired</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for relative time
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
}

export default AnalyticsTab;
