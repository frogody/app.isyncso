/**
 * AdminSystem Page
 * System administration dashboard for platform administrators
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Server,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Cpu,
  Zap,
  Shield,
  AlertCircle,
  Terminal,
  BarChart3,
  Users,
  Building2,
  Package,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

// Status Badge Component
function StatusBadge({ status }) {
  const config = {
    healthy: { bg: 'bg-green-500/20', color: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle },
    degraded: { bg: 'bg-yellow-500/20', color: 'text-yellow-400', border: 'border-yellow-500/30', icon: AlertTriangle },
    down: { bg: 'bg-red-500/20', color: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
    pending: { bg: 'bg-blue-500/20', color: 'text-blue-400', border: 'border-blue-500/30', icon: Clock },
    running: { bg: 'bg-cyan-500/20', color: 'text-cyan-400', border: 'border-cyan-500/30', icon: Play },
    completed: { bg: 'bg-green-500/20', color: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle },
    failed: { bg: 'bg-red-500/20', color: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
    cancelled: { bg: 'bg-zinc-500/20', color: 'text-zinc-400', border: 'border-zinc-500/30', icon: Pause },
  };

  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <Badge className={cn('text-xs gap-1', c.bg, c.color, c.border)}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  const colorClasses = {
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-white">{value}</h3>
            {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center border',
              colorClasses[color]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Health Check Card
function HealthCheckCard({ checks, onRunChecks, isRunning }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              System Health
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Service status and response times
            </CardDescription>
          </div>
          <Button
            onClick={onRunChecks}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRunning && 'animate-spin')} />
            Run Checks
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!checks?.length ? (
          <div className="p-6 text-center text-zinc-500">
            No health checks recorded. Click "Run Checks" to start.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {checks.map((check, index) => (
              <motion.div
                key={check.check_name || index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex items-center justify-between hover:bg-zinc-800/30"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    check.status === 'healthy' && 'bg-green-500/20',
                    check.status === 'degraded' && 'bg-yellow-500/20',
                    check.status === 'down' && 'bg-red-500/20'
                  )}>
                    {check.status === 'healthy' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {check.status === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                    {check.status === 'down' && <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{check.check_name}</p>
                    <p className="text-xs text-zinc-500">
                      {check.checked_at ? new Date(check.checked_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {check.response_time_ms && (
                    <span className="text-sm text-zinc-400">
                      {check.response_time_ms}ms
                    </span>
                  )}
                  <StatusBadge status={check.status} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Database Stats Table
function DatabaseStatsTable({ tables }) {
  if (!tables?.length) {
    return <div className="p-6 text-center text-zinc-500">No table statistics available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left p-4 text-zinc-400 font-medium">Table</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Rows</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Total Size</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Data Size</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Index Size</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Last Vacuum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {tables.map((table, index) => (
            <motion.tr
              key={table.table_name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className="hover:bg-zinc-800/50"
            >
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-mono text-sm">{table.table_name}</span>
                </div>
              </td>
              <td className="p-4 text-zinc-300">{(table.row_count || 0).toLocaleString()}</td>
              <td className="p-4 text-zinc-300">{table.total_size}</td>
              <td className="p-4 text-zinc-400">{table.data_size}</td>
              <td className="p-4 text-zinc-400">{table.index_size}</td>
              <td className="p-4 text-zinc-500 text-sm">
                {table.last_autovacuum
                  ? new Date(table.last_autovacuum).toLocaleDateString()
                  : 'Never'}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Errors List
function ErrorsList({ errors, onResolve, showResolved, onToggleResolved }) {
  const [expandedError, setExpandedError] = useState(null);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              System Errors
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Recent errors and exceptions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Show resolved</span>
            <Switch checked={showResolved} onCheckedChange={onToggleResolved} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!errors?.length ? (
          <div className="p-6 text-center text-zinc-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            No errors found
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {errors.map((error) => (
              <div key={error.id} className="hover:bg-zinc-800/30">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      error.resolved ? 'bg-green-500/20' : 'bg-red-500/20'
                    )}>
                      {error.resolved
                        ? <CheckCircle className="w-5 h-5 text-green-400" />
                        : <AlertCircle className="w-5 h-5 text-red-400" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-zinc-700/50 text-zinc-300 text-xs">
                          {error.error_type}
                        </Badge>
                        {error.error_code && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs">
                            {error.error_code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-white mt-1 truncate">{error.error_message}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(error.created_at).toLocaleString()}
                        {error.user_name && ` - ${error.user_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!error.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(error.id);
                        }}
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        Resolve
                      </Button>
                    )}
                    {expandedError === error.id
                      ? <ChevronDown className="w-5 h-5 text-zinc-400" />
                      : <ChevronRight className="w-5 h-5 text-zinc-400" />
                    }
                  </div>
                </div>

                <AnimatePresence>
                  {expandedError === error.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 border-t border-zinc-800 bg-zinc-900/50">
                        {error.stack_trace && (
                          <div className="mb-4">
                            <p className="text-sm text-zinc-400 mb-2">Stack Trace:</p>
                            <pre className="bg-black/50 p-3 rounded-lg text-xs text-zinc-300 overflow-x-auto">
                              {error.stack_trace}
                            </pre>
                          </div>
                        )}
                        {error.context && Object.keys(error.context).length > 0 && (
                          <div>
                            <p className="text-sm text-zinc-400 mb-2">Context:</p>
                            <pre className="bg-black/50 p-3 rounded-lg text-xs text-zinc-300 overflow-x-auto">
                              {JSON.stringify(error.context, null, 2)}
                            </pre>
                          </div>
                        )}
                        {error.resolved && (
                          <p className="text-sm text-green-400 mt-4">
                            Resolved on {new Date(error.resolved_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Background Jobs List
function JobsList({ jobs, statusFilter, onStatusFilter }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Background Jobs
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Scheduled and running tasks
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!jobs?.length ? (
          <div className="p-6 text-center text-zinc-500">
            No background jobs found
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-zinc-800/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      job.status === 'completed' && 'bg-green-500/20',
                      job.status === 'running' && 'bg-cyan-500/20',
                      job.status === 'failed' && 'bg-red-500/20',
                      job.status === 'pending' && 'bg-blue-500/20',
                      job.status === 'cancelled' && 'bg-zinc-500/20'
                    )}>
                      <Terminal className="w-5 h-5 text-current" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{job.job_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-zinc-700/50 text-zinc-300 text-xs">
                          {job.job_type}
                        </Badge>
                        {job.created_by_name && (
                          <span className="text-xs text-zinc-500">
                            by {job.created_by_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {job.status === 'running' && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400">{job.progress}%</span>
                      </div>
                    )}
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="text-xs text-zinc-500 mt-1">
                        {job.completed_at
                          ? new Date(job.completed_at).toLocaleString()
                          : job.started_at
                          ? `Started ${new Date(job.started_at).toLocaleString()}`
                          : `Created ${new Date(job.created_at).toLocaleString()}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
                {job.error_message && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                    {job.error_message}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// API Stats Card
function APIStatsCard({ stats }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-400" />
          API Usage (Last 24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!stats ? (
          <div className="text-center text-zinc-500">No API stats available</div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-white">
                {(stats.total_requests_24h || 0).toLocaleString()}
              </p>
              <p className="text-sm text-zinc-400">Total Requests</p>
            </div>

            <div>
              <p className="text-sm text-zinc-400 mb-3">Top Actions</p>
              <div className="space-y-2">
                {stats.requests_by_action?.map((item, index) => (
                  <div key={item.action} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{item.action}</span>
                    <Badge className="bg-orange-500/20 text-orange-400">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {stats.requests_by_admin?.length > 0 && (
              <div>
                <p className="text-sm text-zinc-400 mb-3">Top Admins</p>
                <div className="space-y-2">
                  {stats.requests_by_admin.map((item, index) => (
                    <div key={item.admin || index} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">{item.admin || 'Unknown'}</span>
                      <Badge className="bg-purple-500/20 text-purple-400">
                        {item.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSystem() {
  // useAdmin hook provides admin guard protection
  useAdmin();

  const [isLoading, setIsLoading] = useState(true);
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  // Data state
  const [overview, setOverview] = useState(null);
  const [tables, setTables] = useState([]);
  const [errors, setErrors] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [apiStats, setApiStats] = useState(null);

  // Filters
  const [showResolvedErrors, setShowResolvedErrors] = useState(false);
  const [jobStatusFilter, setJobStatusFilter] = useState('all');

  // Helper to get fresh auth headers
  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  // Fetch all data
  async function fetchData() {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();

      console.log('[AdminSystem] Fetching system data...');

      const [overviewRes, tablesRes, errorsRes, jobsRes, apiStatsRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/system/overview`, { headers }),
        fetch(`${ADMIN_API_URL}/system/tables`, { headers }),
        fetch(`${ADMIN_API_URL}/system/errors?includeResolved=${showResolvedErrors}`, { headers }),
        fetch(`${ADMIN_API_URL}/system/jobs${jobStatusFilter !== 'all' ? `?status=${jobStatusFilter}` : ''}`, { headers }),
        fetch(`${ADMIN_API_URL}/system/api-stats`, { headers }),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (tablesRes.ok) setTables(await tablesRes.json());
      if (errorsRes.ok) setErrors(await errorsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (apiStatsRes.ok) setApiStats(await apiStatsRes.json());

    } catch (error) {
      console.error('[AdminSystem] Error fetching data:', error);
      toast.error('Failed to load system data');
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch errors when filter changes
  async function fetchErrors() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${ADMIN_API_URL}/system/errors?includeResolved=${showResolvedErrors}`,
        { headers }
      );
      if (res.ok) setErrors(await res.json());
    } catch (error) {
      console.error('[AdminSystem] Error fetching errors:', error);
    }
  }

  // Fetch jobs when filter changes
  async function fetchJobs() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${ADMIN_API_URL}/system/jobs${jobStatusFilter !== 'all' ? `?status=${jobStatusFilter}` : ''}`,
        { headers }
      );
      if (res.ok) setJobs(await res.json());
    } catch (error) {
      console.error('[AdminSystem] Error fetching jobs:', error);
    }
  }

  // Run health checks
  async function runHealthChecks() {
    setIsRunningChecks(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${ADMIN_API_URL}/system/run-health-checks`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Health checks completed: ${result.checks.length} services checked`);

        // Refresh overview to get latest health status
        const overviewRes = await fetch(`${ADMIN_API_URL}/system/overview`, { headers });
        if (overviewRes.ok) setOverview(await overviewRes.json());
      } else {
        throw new Error('Failed to run health checks');
      }
    } catch (error) {
      console.error('[AdminSystem] Error running health checks:', error);
      toast.error('Failed to run health checks');
    } finally {
      setIsRunningChecks(false);
    }
  }

  // Resolve error
  async function resolveError(errorId) {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${ADMIN_API_URL}/system/errors/${errorId}/resolve`, {
        method: 'PUT',
        headers,
      });

      if (res.ok) {
        toast.success('Error resolved');
        fetchErrors();
        // Update overview error count
        const overviewRes = await fetch(`${ADMIN_API_URL}/system/overview`, { headers });
        if (overviewRes.ok) setOverview(await overviewRes.json());
      } else {
        throw new Error('Failed to resolve error');
      }
    } catch (error) {
      console.error('[AdminSystem] Error resolving error:', error);
      toast.error('Failed to resolve error');
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchErrors();
  }, [showResolvedErrors]);

  useEffect(() => {
    fetchJobs();
  }, [jobStatusFilter]);

  // Calculate overall system health
  const systemHealth = overview?.health?.every(h => h.status === 'healthy')
    ? 'healthy'
    : overview?.health?.some(h => h.status === 'down')
    ? 'down'
    : 'degraded';

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Administration</h1>
            <p className="text-zinc-400 mt-1">
              Monitor system health, errors, and background jobs
            </p>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="System Status"
          value={systemHealth === 'healthy' ? 'Operational' : systemHealth === 'down' ? 'Down' : 'Degraded'}
          subtitle={overview?.health?.length ? `${overview.health.length} services monitored` : 'No checks yet'}
          icon={Server}
          color={systemHealth === 'healthy' ? 'green' : systemHealth === 'down' ? 'red' : 'orange'}
        />
        <StatCard
          title="Database Size"
          value={overview?.database?.db_size || 'N/A'}
          subtitle={`${(overview?.database?.total_users || 0).toLocaleString()} users`}
          icon={Database}
          color="purple"
        />
        <StatCard
          title="Unresolved Errors"
          value={overview?.errors?.total_unresolved || 0}
          subtitle={`${overview?.errors?.last_24h || 0} in last 24h`}
          icon={AlertTriangle}
          color={overview?.errors?.total_unresolved > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Running Jobs"
          value={overview?.jobs?.running || 0}
          subtitle={`${overview?.jobs?.pending || 0} pending, ${overview?.jobs?.failed_24h || 0} failed`}
          icon={Cpu}
          color="cyan"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="health" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Health Checks
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            Database Stats
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            Errors
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Background Jobs
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            API Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <HealthCheckCard
            checks={overview?.health}
            onRunChecks={runHealthChecks}
            isRunning={isRunningChecks}
          />
        </TabsContent>

        <TabsContent value="database">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Database Table Statistics
              </CardTitle>
              <CardDescription className="text-zinc-500">
                Row counts, sizes, and maintenance status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : (
                <DatabaseStatsTable tables={tables} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          {isLoading ? (
            <div className="p-6 flex justify-center">
              <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : (
            <ErrorsList
              errors={errors}
              onResolve={resolveError}
              showResolved={showResolvedErrors}
              onToggleResolved={setShowResolvedErrors}
            />
          )}
        </TabsContent>

        <TabsContent value="jobs">
          {isLoading ? (
            <div className="p-6 flex justify-center">
              <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : (
            <JobsList
              jobs={jobs}
              statusFilter={jobStatusFilter}
              onStatusFilter={setJobStatusFilter}
            />
          )}
        </TabsContent>

        <TabsContent value="api">
          {isLoading ? (
            <div className="p-6 flex justify-center">
              <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : (
            <APIStatsCard stats={apiStats} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
