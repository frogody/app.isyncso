/**
 * AdminAgentDashboard Page
 * Real-time monitoring dashboard for the worker agent fleet
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Bot,
  Server,
  Shield,
  Bug,
  GitBranch,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Cpu,
  Zap,
  ChevronDown,
  Filter,
  Circle,
  ArrowDown,
  Pause,
  Wifi,
  WifiOff,
  Heart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getIconColor, getStatusColor } from '@/lib/adminTheme';

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_DOT_COLORS = {
  idle: 'bg-green-400',
  working: 'bg-blue-400',
  paused: 'bg-yellow-400',
  error: 'bg-red-400',
  offline: 'bg-zinc-500',
};

const STATUS_RING_COLORS = {
  idle: 'ring-green-400/30',
  working: 'ring-blue-400/30',
  paused: 'ring-yellow-400/30',
  error: 'ring-red-400/30',
  offline: 'ring-zinc-500/30',
};

const AGENT_TYPE_ICONS = {
  builder: Cpu,
  security: Shield,
  health: Heart,
  debug: Bug,
  relation: GitBranch,
  github: GitBranch,
};

const AGENT_TYPE_COLORS = {
  builder: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  security: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  health: 'bg-green-500/20 text-green-400 border-green-500/30',
  debug: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  relation: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  github: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

const SEVERITY_COLORS = {
  debug: 'text-zinc-500',
  info: 'text-zinc-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  critical: 'text-red-400 font-bold',
};

const SEVERITY_BG = {
  debug: 'bg-zinc-500/10 border-zinc-500/20',
  info: 'bg-zinc-500/10 border-zinc-700/50',
  warning: 'bg-yellow-500/10 border-yellow-500/20',
  error: 'bg-red-500/10 border-red-500/20',
  critical: 'bg-red-500/15 border-red-500/30',
};

const SEVERITY_BADGE = {
  debug: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  info: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-500/30 text-red-300 border-red-500/40',
};

// =============================================================================
// HELPERS
// =============================================================================

function formatHeartbeatAge(lastHeartbeat) {
  if (!lastHeartbeat) return { text: 'never', isStale: true };

  const now = new Date();
  const hb = new Date(lastHeartbeat);
  const diffMs = now - hb;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  const isStale = diffMinutes > 2;

  if (diffSeconds < 10) return { text: 'just now', isStale };
  if (diffSeconds < 60) return { text: `${diffSeconds}s ago`, isStale };
  if (diffMinutes < 60) return { text: `${diffMinutes}m ago`, isStale };
  if (diffHours < 24) return { text: `${diffHours}h ago`, isStale };
  return { text: `${Math.floor(diffHours / 24)}d ago`, isStale: true };
}

function formatDuration(ms) {
  if (!ms && ms !== 0) return '--';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-400 mb-0.5 uppercase tracking-wider">{title}</p>
            <h3 className="text-lg font-bold text-white">{value}</h3>
            {subtitle && (
              <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center border',
              getIconColor(color)
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// AGENT CARD
// =============================================================================

function AgentCard({ agent, taskTitle }) {
  const TypeIcon = AGENT_TYPE_ICONS[agent.agent_type] || Bot;
  const heartbeat = formatHeartbeatAge(agent.last_heartbeat);
  const metrics = agent.metrics || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Status dot with pulse for working */}
          <div className="relative flex items-center justify-center w-3 h-3">
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full',
                STATUS_DOT_COLORS[agent.status] || 'bg-zinc-500'
              )}
            />
            {agent.status === 'working' && (
              <span className="absolute inset-0 w-3 h-3 rounded-full bg-blue-400/40 animate-ping" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">{agent.name}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate max-w-[180px]">
              {agent.machine_url || 'no machine url'}
            </p>
          </div>
        </div>
        <Badge
          className={cn(
            'text-[10px] gap-1 border',
            AGENT_TYPE_COLORS[agent.agent_type] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
          )}
        >
          <TypeIcon className="w-3 h-3" />
          {agent.agent_type}
        </Badge>
      </div>

      {/* Current task */}
      {agent.current_task_id && (
        <div className="mb-3 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-[10px] text-blue-400/70 uppercase tracking-wider mb-0.5">Current Task</p>
          <p className="text-xs text-blue-300 truncate">
            {taskTitle || agent.current_task_id}
          </p>
        </div>
      )}

      {/* Heartbeat */}
      <div className="flex items-center gap-1.5 mb-3">
        <Clock className={cn('w-3 h-3', heartbeat.isStale ? 'text-red-400' : 'text-zinc-500')} />
        <span
          className={cn(
            'text-[11px]',
            heartbeat.isStale ? 'text-red-400' : 'text-zinc-400'
          )}
        >
          {heartbeat.text}
        </span>
        {heartbeat.isStale && (
          <span className="text-[9px] text-red-500 ml-1 uppercase tracking-wider">stale</span>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-[10px] text-zinc-500">Completed</p>
          <p className="text-sm font-semibold text-white">{metrics.tasks_completed ?? 0}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-zinc-500">Avg Time</p>
          <p className="text-sm font-semibold text-white">
            {formatDuration(metrics.avg_duration_ms)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-zinc-500">Errors</p>
          <p className={cn(
            'text-sm font-semibold',
            (metrics.error_count || 0) > 0 ? 'text-red-400' : 'text-white'
          )}>
            {metrics.error_count ?? 0}
          </p>
        </div>
      </div>

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-[9px] px-1.5 py-0.5 bg-zinc-800/80 text-zinc-400 rounded border border-zinc-700/50"
            >
              {cap}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// ACTIVITY FEED ITEM
// =============================================================================

function ActivityItem({ activity, agentName }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 px-3 py-2 rounded-lg border',
        SEVERITY_BG[activity.severity] || SEVERITY_BG.info
      )}
    >
      {/* Severity icon */}
      <div className="mt-0.5">
        {activity.severity === 'critical' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
        {activity.severity === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
        {activity.severity === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
        {activity.severity === 'info' && <Activity className="w-3.5 h-3.5 text-zinc-400" />}
        {activity.severity === 'debug' && <Bug className="w-3.5 h-3.5 text-zinc-500" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-white truncate">
            {agentName || activity.agent_id}
          </span>
          <Badge
            className={cn(
              'text-[9px] border py-0 px-1.5',
              SEVERITY_BADGE[activity.severity] || SEVERITY_BADGE.info
            )}
          >
            {activity.severity}
          </Badge>
          {activity.action && (
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              {activity.action}
            </span>
          )}
        </div>
        <p className={cn(
          'text-xs truncate',
          SEVERITY_COLORS[activity.severity] || 'text-zinc-400'
        )}>
          {activity.message}
        </p>
      </div>

      {/* Timestamp + duration */}
      <div className="text-right shrink-0">
        <p className="text-[10px] text-zinc-500">{formatTimestamp(activity.created_at)}</p>
        {activity.duration_ms != null && (
          <p className="text-[10px] text-zinc-600">{formatDuration(activity.duration_ms)}</p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AdminAgentDashboard({ embedded = false }) {
  const { adminToken } = useAdmin();

  // State
  const [agents, setAgents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [taskTitles, setTaskTitles] = useState({});
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayTasksCompleted, setTodayTasksCompleted] = useState(0);

  const feedRef = useRef(null);
  const agentNameMap = useRef({});

  // Build agent name lookup
  useEffect(() => {
    const map = {};
    agents.forEach((a) => {
      map[a.id] = a.name;
    });
    agentNameMap.current = map;
  }, [agents]);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agent_registry')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching agents:', error);
      return;
    }

    setAgents(data || []);

    // Fetch task titles for agents with current_task_id
    const taskIds = (data || [])
      .filter((a) => a.current_task_id)
      .map((a) => a.current_task_id);

    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('roadmap_items')
        .select('id, title')
        .in('id', taskIds);

      if (tasks) {
        const titles = {};
        tasks.forEach((t) => {
          titles[t.id] = t.title;
        });
        setTaskTitles(titles);
      }
    }
  }, []);

  // Fetch initial activities
  const fetchActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from('agent_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activities:', error);
      return;
    }

    setActivities(data || []);
  }, []);

  // Fetch today's tasks completed count
  const fetchTodayStats = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('agent_activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'task_completed')
      .gte('created_at', todayStart.toISOString());

    setTodayTasksCompleted(count || 0);
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchAgents(), fetchActivities(), fetchTodayStats()]);
      setIsLoading(false);
    };
    load();
  }, [fetchAgents, fetchActivities, fetchTodayStats]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('agent-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload) => {
          setActivities((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_registry' },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchAgents]);

  // Auto-scroll feed on new activities
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities]);

  // Heartbeat timer - re-render every 15s to update "ago" timestamps
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAgents(), fetchActivities(), fetchTodayStats()]);
    setIsRefreshing(false);
  };

  // Computed stats
  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === 'working').length;
    const idle = agents.filter((a) => a.status === 'idle').length;
    const errors = agents.filter((a) => a.status === 'error').length;
    const offline = agents.filter((a) => a.status === 'offline').length;
    const paused = agents.filter((a) => a.status === 'paused').length;

    return { total, active, idle, errors, offline, paused };
  }, [agents]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    if (severityFilter === 'all') return activities;
    return activities.filter((a) => a.severity === severityFilter);
  }, [activities, severityFilter]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={embedded ? "space-y-6" : "min-h-screen bg-zinc-950 p-6"}>
        <div className={embedded ? "" : "max-w-7xl mx-auto"}>
          <div className="animate-pulse space-y-6">
            {!embedded && <div className="h-8 bg-zinc-800 rounded w-48" />}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-zinc-900/50 rounded-xl border border-zinc-800" />
              ))}
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-zinc-900/50 rounded-xl border border-zinc-800" />
              ))}
            </div>
            <div className="h-64 bg-zinc-900/50 rounded-xl border border-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-zinc-950 p-6"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        {/* ============================================================== */}
        {/* HEADER                                                         */}
        {/* ============================================================== */}
        {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-cyan-400" />
              Agent Fleet
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {stats.active} active of {stats.total} agents
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
        )}

        {/* ============================================================== */}
        {/* AGENT GRID                                                     */}
        {/* ============================================================== */}
        {agents.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-8 text-center">
              <Server className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No agents registered</p>
              <p className="text-xs text-zinc-600 mt-1">
                Agents will appear here once they register with the fleet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {agents.map((agent, index) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  taskTitle={taskTitles[agent.current_task_id]}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ============================================================== */}
        {/* STATS BAR                                                      */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title="Total Agents"
            value={stats.total}
            icon={Server}
            color="blue"
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={Zap}
            color="green"
            subtitle="Currently working"
          />
          <StatCard
            title="Idle"
            value={stats.idle}
            icon={Pause}
            color="blue"
            subtitle="Awaiting tasks"
          />
          <StatCard
            title="Errors"
            value={stats.errors}
            icon={AlertCircle}
            color="red"
            subtitle={stats.offline > 0 ? `${stats.offline} offline` : undefined}
          />
          <StatCard
            title="Tasks Today"
            value={todayTasksCompleted}
            icon={CheckCircle2}
            color="green"
            subtitle="Completed today"
          />
        </div>

        {/* ============================================================== */}
        {/* ACTIVITY FEED                                                  */}
        {/* ============================================================== */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <CardTitle className="text-sm font-semibold text-white">Activity Feed</CardTitle>
                <span className="text-[10px] text-zinc-500">
                  {filteredActivities.length} entries
                </span>
                {/* Live indicator */}
                <div className="flex items-center gap-1 ml-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-[9px] text-green-400 uppercase tracking-wider">Live</span>
                </div>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[130px] h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
                  <Filter className="w-3 h-3 mr-1.5 text-zinc-500" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all" className="text-xs text-zinc-300">All Severities</SelectItem>
                  <SelectItem value="debug" className="text-xs text-zinc-400">Debug</SelectItem>
                  <SelectItem value="info" className="text-xs text-zinc-300">Info</SelectItem>
                  <SelectItem value="warning" className="text-xs text-yellow-400">Warning</SelectItem>
                  <SelectItem value="error" className="text-xs text-red-400">Error</SelectItem>
                  <SelectItem value="critical" className="text-xs text-red-300">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={feedRef}
              className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            >
              <AnimatePresence initial={false}>
                {filteredActivities.length === 0 ? (
                  <div className="py-8 text-center">
                    <Activity className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">
                      {severityFilter === 'all'
                        ? 'No activity recorded yet'
                        : `No ${severityFilter} events`}
                    </p>
                  </div>
                ) : (
                  filteredActivities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      agentName={agentNameMap.current[activity.agent_id]}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
