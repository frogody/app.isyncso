/**
 * AdminHealthDashboard — Platform Health Monitoring Dashboard
 *
 * Displays overall platform health score, test results, failing tests,
 * score history, and provides the ability to trigger health check runs.
 *
 * Data sources:
 * - platform_health_score: Overall score per run
 * - health_check_results: Individual test results per run
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Heart,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  Database,
  Route,
  Code2,
  FileCode,
  Lock,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const TEST_TYPE_META = {
  table:          { label: 'Table',          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    icon: Database },
  edge_function:  { label: 'Edge Function',  color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',    icon: Zap },
  function:       { label: 'Function',       color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Code2 },
  route:          { label: 'Route',          color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Route },
  import:         { label: 'Import',         color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: FileCode },
  rls:            { label: 'RLS',            color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',    icon: Shield },
  security:       { label: 'Security',       color: 'bg-red-500/20 text-red-400 border-red-500/30',       icon: Lock },
};

/* -------------------------------------------------------------------------- */
/*  HealthGauge SVG                                                            */
/* -------------------------------------------------------------------------- */

function HealthGauge({ score }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 90 ? '#22c55e' : score >= 70 ? '#06b6d4' : score >= 50 ? '#eab308' : '#ef4444';

  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r={radius} fill="none" stroke="#27272a" strokeWidth="12" />
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
        className="transition-all duration-1000"
      />
      <text x="100" y="95" textAnchor="middle" fill="white" fontSize="36" fontWeight="bold">
        {score}
      </text>
      <text x="100" y="120" textAnchor="middle" fill="#a1a1aa" fontSize="14">
        {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Critical'}
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex items-center gap-4"
    >
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Score History Bar Chart                                                     */
/* -------------------------------------------------------------------------- */

function ScoreHistoryChart({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        No history available
      </div>
    );
  }

  const maxScore = 100;

  return (
    <div className="flex items-end gap-2 h-48">
      {runs.map((run, idx) => {
        const pct = (run.score / maxScore) * 100;
        const barColor =
          run.score >= 90
            ? 'bg-green-500'
            : run.score >= 70
              ? 'bg-cyan-500'
              : run.score >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500';

        const date = new Date(run.created_at);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;

        return (
          <div key={run.id || idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-xs text-zinc-400 font-medium">{Math.round(run.score)}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 0.6, delay: idx * 0.05 }}
              className={`w-full rounded-t-md ${barColor} min-h-[4px]`}
              title={`Score: ${run.score} — ${date.toLocaleString()}`}
            />
            <span className="text-[10px] text-zinc-500 truncate w-full text-center">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Failing Tests Section                                                      */
/* -------------------------------------------------------------------------- */

function FailingTestsSection({ tests }) {
  const [expandedTypes, setExpandedTypes] = useState({});

  const grouped = useMemo(() => {
    if (!tests || tests.length === 0) return {};
    return tests.reduce((acc, t) => {
      const type = t.test_type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(t);
      return acc;
    }, {});
  }, [tests]);

  const toggleType = (type) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  if (!tests || tests.length === 0) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-zinc-500 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        All tests passing
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([type, items]) => {
        const meta = TEST_TYPE_META[type] || {
          label: type,
          color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
          icon: AlertTriangle,
        };
        const TypeIcon = meta.icon;
        const expanded = expandedTypes[type] !== false; // default expanded

        return (
          <div
            key={type}
            className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleType(type)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
              <TypeIcon className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm font-medium text-white">{meta.label}</span>
              <span className="ml-auto text-xs text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded">
                {items.length} failing
              </span>
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2">
                    {items.map((test) => (
                      <div
                        key={test.id}
                        className="flex items-start gap-3 bg-zinc-900/60 rounded-lg p-3 border border-zinc-800/50"
                      >
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">
                            {test.test_target}
                          </p>
                          {test.message && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                              {test.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.color}`}
                            >
                              {meta.label}
                            </span>
                            {test.duration_ms != null && (
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {test.duration_ms}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Recent Runs Table                                                          */
/* -------------------------------------------------------------------------- */

function RecentRunsTable({ runs }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
        No runs recorded yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-3 px-4 text-zinc-400 font-medium">Date</th>
            <th className="text-center py-3 px-4 text-zinc-400 font-medium">Score</th>
            <th className="text-center py-3 px-4 text-zinc-400 font-medium">Total</th>
            <th className="text-center py-3 px-4 text-zinc-400 font-medium">Passed</th>
            <th className="text-center py-3 px-4 text-zinc-400 font-medium">Failed</th>
            <th className="text-center py-3 px-4 text-zinc-400 font-medium">Skipped</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, idx) => {
            const scoreColor =
              run.score >= 90
                ? 'text-green-400'
                : run.score >= 70
                  ? 'text-cyan-400'
                  : run.score >= 50
                    ? 'text-yellow-400'
                    : 'text-red-400';

            return (
              <motion.tr
                key={run.id || idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="py-3 px-4 text-zinc-300">
                  {new Date(run.created_at).toLocaleString()}
                </td>
                <td className={`py-3 px-4 text-center font-bold ${scoreColor}`}>
                  {Math.round(run.score)}%
                </td>
                <td className="py-3 px-4 text-center text-zinc-300">{run.total_tests}</td>
                <td className="py-3 px-4 text-center text-green-400">{run.passed}</td>
                <td className="py-3 px-4 text-center text-red-400">{run.failed}</td>
                <td className="py-3 px-4 text-center text-yellow-400">{run.skipped}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                        */
/* -------------------------------------------------------------------------- */

export default function AdminHealthDashboard({ embedded = false }) {
  // -- State ----------------------------------------------------------------
  const [latestScore, setLatestScore] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [failingTests, setFailingTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [error, setError] = useState(null);

  // -- Data Fetching --------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch latest health score
      const { data: scoreData, error: scoreError } = await supabase
        .from('platform_health_score')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (scoreError && scoreError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw scoreError;
      }

      setLatestScore(scoreData || null);

      // Fetch last 10 runs for history
      const { data: runsData, error: runsError } = await supabase
        .from('platform_health_score')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (runsError) throw runsError;
      setRecentRuns(runsData || []);

      // If we have a latest run, fetch failing tests for that run_id
      if (scoreData?.run_id) {
        const { data: failData, error: failError } = await supabase
          .from('health_check_results')
          .select('*')
          .eq('run_id', scoreData.run_id)
          .eq('status', 'fail')
          .order('test_type', { ascending: true });

        if (failError) throw failError;
        setFailingTests(failData || []);
      } else {
        setFailingTests([]);
      }
    } catch (err) {
      console.error('[AdminHealthDashboard] fetch error:', err);
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -- Run Health Check -----------------------------------------------------
  const handleRunHealthCheck = async () => {
    setRunningCheck(true);
    setError(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/health-runner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ trigger: 'manual' }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Health check failed (${res.status}): ${text}`);
      }

      // Refetch data after run completes
      await fetchData();
    } catch (err) {
      console.error('[AdminHealthDashboard] run error:', err);
      setError(err.message || 'Failed to run health check');
    } finally {
      setRunningCheck(false);
    }
  };

  // -- Derived values -------------------------------------------------------
  const score = latestScore?.score != null ? Math.round(Number(latestScore.score)) : 0;
  const historyForChart = useMemo(() => [...(recentRuns || [])].reverse(), [recentRuns]);

  // -- Render ---------------------------------------------------------------
  return (
    <div className={embedded ? "text-white" : "min-h-screen bg-zinc-950 text-white"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        {/* Header */}
        {!embedded ? (
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <Heart className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Platform Health</h1>
              <p className="text-sm text-zinc-400">
                Monitor test results, scores, and system health
              </p>
            </div>
          </div>

          <button
            onClick={handleRunHealthCheck}
            disabled={runningCheck}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
          >
            {runningCheck ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Health Check Now
              </>
            )}
          </button>
        </div>
        ) : (
        <div className="flex justify-end">
          <button
            onClick={handleRunHealthCheck}
            disabled={runningCheck}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs transition-colors"
          >
            {runningCheck ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</> : <><Play className="w-3.5 h-3.5" />Run Health Check</>}
          </button>
        </div>
        )}

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-zinc-400 text-sm">Loading health data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Hero: Health Gauge + Stats Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              {/* Gauge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center"
              >
                <HealthGauge score={score} />
                {latestScore?.created_at && (
                  <p className="text-xs text-zinc-500 mt-4 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Last run: {new Date(latestScore.created_at).toLocaleString()}
                  </p>
                )}
              </motion.div>

              {/* Stats Grid */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                <StatCard
                  label="Total Tests"
                  value={latestScore?.total_tests}
                  icon={Activity}
                  color="bg-cyan-500/10 text-cyan-400"
                />
                <StatCard
                  label="Passed"
                  value={latestScore?.passed}
                  icon={CheckCircle2}
                  color="bg-green-500/10 text-green-400"
                />
                <StatCard
                  label="Failed"
                  value={latestScore?.failed}
                  icon={XCircle}
                  color="bg-red-500/10 text-red-400"
                />
                <StatCard
                  label="Skipped"
                  value={latestScore?.skipped}
                  icon={AlertTriangle}
                  color="bg-yellow-500/10 text-yellow-400"
                />
              </div>
            </div>

            {/* Score History + Failing Tests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Score History */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Score History
                  </h2>
                  <span className="text-xs text-zinc-500">Last {historyForChart.length} runs</span>
                </div>
                <ScoreHistoryChart runs={historyForChart} />
              </motion.div>

              {/* Failing Tests */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    Failing Tests
                  </h2>
                  {failingTests.length > 0 && (
                    <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                      {failingTests.length} failures
                    </span>
                  )}
                </div>
                <FailingTestsSection tests={failingTests} />
              </motion.div>
            </div>

            {/* Recent Runs Table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-zinc-400" />
                  Recent Runs
                </h2>
                <button
                  onClick={fetchData}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
              <RecentRunsTable runs={recentRuns} />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
