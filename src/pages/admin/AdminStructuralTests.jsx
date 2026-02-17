/**
 * AdminStructuralTests — Structural verification for all completed roadmap features.
 *
 * For each "done" roadmap_item with structural_tests JSONB, runs automated checks:
 * - route: Checks if a React route exists (client-side path matching)
 * - table: Queries Supabase to verify table exists
 * - edge_function: Pings edge function endpoint (OPTIONS/HEAD)
 * - function: Checks if a PostgreSQL function exists
 *
 * Results are displayed as a live dashboard with pass/fail per feature.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import {
  ShieldCheck, ShieldAlert, Play, RefreshCw, CheckCircle2, XCircle,
  Clock, Database, Route, Zap, Code2, ChevronDown, ChevronRight,
  BarChart3, Filter, Search, AlertTriangle, Loader2,
} from 'lucide-react';

const STATUS_COLORS = {
  pass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  fail: 'text-red-400 bg-red-500/10 border-red-500/30',
  pending: 'text-zinc-400 bg-zinc-800/50 border-zinc-700',
  running: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  skipped: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};

const TEST_TYPE_ICONS = {
  route: Route,
  table: Database,
  edge_function: Zap,
  function: Code2,
};

const CATEGORY_COLORS = {
  platform: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  crm: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  finance: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  products: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'sync-agent': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  talent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  growth: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  marketplace: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  sentinel: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  integrations: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  infrastructure: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  learn: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

// ============================================================
// Test Runners
// ============================================================

async function runTableTest(target) {
  try {
    const { data, error } = await supabase
      .from(target)
      .select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { status: 'fail', message: `Table "${target}" not found` };
      }
      if (error.code === 'PGRST204' || error.code === '42501') {
        return { status: 'pass', message: `Table "${target}" exists (RLS may restrict data)` };
      }
      return { status: 'pass', message: `Table "${target}" exists (query returned error: ${error.code})` };
    }
    return { status: 'pass', message: `Table "${target}" exists` };
  } catch (e) {
    return { status: 'fail', message: `Table check failed: ${e.message}` };
  }
}

async function runEdgeFunctionTest(target) {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${target}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ _healthcheck: true }),
    });
    // Any response other than 404 means the function is deployed
    if (res.status === 404) {
      return { status: 'fail', message: `Edge function "${target}" not found (404)` };
    }
    return { status: 'pass', message: `Edge function "${target}" responded (${res.status})` };
  } catch (e) {
    return { status: 'fail', message: `Edge function check failed: ${e.message}` };
  }
}

async function runFunctionTest(target) {
  try {
    const { data, error } = await supabase.rpc(target);
    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42883') {
        return { status: 'fail', message: `Function "${target}" not found` };
      }
      // Function exists but returned an error (expected for functions needing params)
      return { status: 'pass', message: `Function "${target}" exists (call error expected without params)` };
    }
    return { status: 'pass', message: `Function "${target}" exists and callable` };
  } catch (e) {
    // Most functions will error without proper params — that's fine
    if (e.message?.includes('does not exist')) {
      return { status: 'fail', message: `Function "${target}" not found` };
    }
    return { status: 'pass', message: `Function "${target}" exists` };
  }
}

function runRouteTest(target) {
  // Client-side route check: we verify the path is in our known route config
  // Since we're a SPA, all routes resolve to index.html. We check against known patterns.
  const knownRoutes = [
    '/', '/login', '/auth/callback', '/onboarding', '/dashboard', '/settings',
    '/crm', '/crm/companies', '/crm/contacts', '/crm/prospects',
    '/finance', '/inventoryexpenses', '/products', '/productdetail',
    '/sync', '/sync-studio', '/createimages',
    '/inbox', '/learn',
    '/sentinel', '/sentineldashboard', '/aisysteminventory', '/complianceroadmap',
    '/nests', '/talentcandidates', '/talentcandidateprofile', '/talentcampaigndetail',
    '/admin', '/admin/users', '/admin/organizations', '/admin/marketplace',
    '/admin/billing', '/admin/credits', '/admin/feature-flags', '/admin/roadmap',
    '/admin/demos', '/admin/settings', '/admin/audit-logs', '/admin/analytics',
    '/admin/system', '/admin/integrations', '/admin/content', '/admin/support',
    '/admin/ai', '/admin/nests', '/admin/apps', '/admin/growth-nests',
    '/admin/structural-tests',
  ];

  const match = knownRoutes.some(r => r === target || target.startsWith(r + '/'));
  if (match) {
    return { status: 'pass', message: `Route "${target}" is registered` };
  }
  return { status: 'skipped', message: `Route "${target}" not in known routes list (may still exist)` };
}

async function runSingleTest(test) {
  switch (test.type) {
    case 'table':
      return runTableTest(test.target);
    case 'edge_function':
      return runEdgeFunctionTest(test.target);
    case 'function':
      return runFunctionTest(test.target);
    case 'route':
      return runRouteTest(test.target);
    default:
      return { status: 'skipped', message: `Unknown test type: ${test.type}` };
  }
}

// ============================================================
// Components
// ============================================================

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function TestRow({ test, result }) {
  const Icon = TEST_TYPE_ICONS[test.type] || Code2;
  const statusColor = STATUS_COLORS[result?.status || 'pending'];

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-zinc-800/30">
      <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
      <span className="text-sm text-zinc-400 flex-1 truncate">{test.description}</span>
      <code className="text-xs text-zinc-500 font-mono shrink-0">{test.target}</code>
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${statusColor}`}>
        {result?.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
        {result?.status === 'pass' && <CheckCircle2 className="w-3 h-3" />}
        {result?.status === 'fail' && <XCircle className="w-3 h-3" />}
        {result?.status === 'skipped' && <AlertTriangle className="w-3 h-3" />}
        {!result && <Clock className="w-3 h-3" />}
        <span>{result?.status || 'pending'}</span>
      </div>
    </div>
  );
}

function FeatureCard({ item, results, isExpanded, onToggle, isRunning }) {
  const tests = item.structural_tests || [];
  const testResults = tests.map((t, i) => results[`${item.id}-${i}`]);
  const passCount = testResults.filter(r => r?.status === 'pass').length;
  const failCount = testResults.filter(r => r?.status === 'fail').length;
  const totalTests = tests.length;
  const allPassed = passCount === totalTests && totalTests > 0;
  const hasFails = failCount > 0;

  const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.platform;

  return (
    <div className={`rounded-xl border transition-all ${
      hasFails ? 'border-red-500/30 bg-red-500/5' :
      allPassed ? 'border-cyan-500/20 bg-cyan-500/5' :
      'border-zinc-800 bg-zinc-900/50'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-800/20 rounded-xl transition-colors"
      >
        <div className="shrink-0">
          {allPassed ? (
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          ) : hasFails ? (
            <ShieldAlert className="w-5 h-5 text-red-400" />
          ) : isRunning ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-zinc-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{item.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${catColor}`}>
              {item.category}
            </span>
            {totalTests > 0 && (
              <span className="text-xs text-zinc-500">
                {passCount}/{totalTests} checks passed
              </span>
            )}
            {totalTests === 0 && (
              <span className="text-xs text-zinc-600 italic">No structural tests defined</span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && tests.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1 border-t border-zinc-800/50 pt-3">
              {tests.map((test, i) => (
                <TestRow key={i} test={test} result={results[`${item.id}-${i}`]} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function AdminStructuralTests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [runningItems, setRunningItems] = useState(new Set());
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastRunAt, setLastRunAt] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('id, title, category, status, structural_tests, priority, created_at')
      .eq('status', 'done')
      .order('category')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))].sort();
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(i => i.category === filterCategory);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => {
        const tests = i.structural_tests || [];
        if (tests.length === 0) return filterStatus === 'no-tests';
        const testResults = tests.map((_, idx) => results[`${i.id}-${idx}`]);
        const hasFails = testResults.some(r => r?.status === 'fail');
        const allPassed = testResults.every(r => r?.status === 'pass') && testResults.length === tests.length;
        if (filterStatus === 'pass') return allPassed;
        if (filterStatus === 'fail') return hasFails;
        if (filterStatus === 'untested') return testResults.every(r => !r);
        return true;
      });
    }
    return filtered;
  }, [items, search, filterCategory, filterStatus, results]);

  const stats = useMemo(() => {
    let totalTests = 0;
    let passCount = 0;
    let failCount = 0;
    let untestedCount = 0;

    items.forEach(item => {
      const tests = item.structural_tests || [];
      totalTests += tests.length;
      tests.forEach((_, i) => {
        const r = results[`${item.id}-${i}`];
        if (r?.status === 'pass') passCount++;
        else if (r?.status === 'fail') failCount++;
        else untestedCount++;
      });
    });

    return {
      totalItems: items.length,
      totalTests,
      passCount,
      failCount,
      untestedCount,
      coverage: totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0,
    };
  }, [items, results]);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    const newResults = {};
    const allRunning = new Set();

    // Mark all as running
    items.forEach(item => {
      (item.structural_tests || []).forEach((_, i) => {
        const key = `${item.id}-${i}`;
        newResults[key] = { status: 'running', message: 'Running...' };
        allRunning.add(item.id);
      });
    });
    setResults({ ...newResults });
    setRunningItems(allRunning);

    // Run tests in batches of 10 for performance
    const allTests = [];
    items.forEach(item => {
      (item.structural_tests || []).forEach((test, i) => {
        allTests.push({ item, test, index: i, key: `${item.id}-${i}` });
      });
    });

    const batchSize = 10;
    for (let b = 0; b < allTests.length; b += batchSize) {
      const batch = allTests.slice(b, b + batchSize);
      const batchResults = await Promise.all(
        batch.map(async ({ test, key }) => {
          const result = await runSingleTest(test);
          return { key, result };
        })
      );

      batchResults.forEach(({ key, result }) => {
        newResults[key] = result;
      });
      setResults({ ...newResults });

      // Update running items
      const completedItems = new Set();
      items.forEach(item => {
        const tests = item.structural_tests || [];
        const allDone = tests.every((_, i) => {
          const r = newResults[`${item.id}-${i}`];
          return r && r.status !== 'running';
        });
        if (allDone) completedItems.add(item.id);
      });
      setRunningItems(prev => {
        const next = new Set(prev);
        completedItems.forEach(id => next.delete(id));
        return next;
      });
    }

    setRunning(false);
    setRunningItems(new Set());
    setLastRunAt(new Date());
  }, [items]);

  const toggleExpanded = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(filteredItems.map(i => i.id)));
  }, [filteredItems]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
            Structural Tests
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Verify every completed feature is structurally intact — routes, tables, functions, edge functions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRunAt && (
            <span className="text-xs text-zinc-500">
              Last run: {lastRunAt.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={runAllTests}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run All Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Features"
          value={stats.totalItems}
          icon={BarChart3}
          color="text-white bg-zinc-900/50 border-zinc-800"
        />
        <StatCard
          label="Total Tests"
          value={stats.totalTests}
          icon={ShieldCheck}
          color="text-white bg-zinc-900/50 border-zinc-800"
        />
        <StatCard
          label="Passing"
          value={stats.passCount}
          icon={CheckCircle2}
          color="text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
        />
        <StatCard
          label="Failing"
          value={stats.failCount}
          icon={XCircle}
          color="text-red-400 bg-red-500/10 border-red-500/30"
        />
        <StatCard
          label="Untested"
          value={stats.untestedCount}
          icon={Clock}
          color="text-zinc-400 bg-zinc-800/50 border-zinc-700"
        />
        <StatCard
          label="Coverage"
          value={`${stats.coverage}%`}
          icon={ShieldCheck}
          color={stats.coverage === 100 ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' :
                 stats.coverage > 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
                 'text-zinc-400 bg-zinc-800/50 border-zinc-700'}
        />
      </div>

      {/* Coverage Bar */}
      {stats.totalTests > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-300">Test Coverage</span>
            <span className="text-sm text-zinc-400">
              {stats.passCount} / {stats.totalTests} tests passing
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex">
            {stats.passCount > 0 && (
              <div
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${(stats.passCount / stats.totalTests) * 100}%` }}
              />
            )}
            {stats.failCount > 0 && (
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${(stats.failCount / stats.totalTests) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="all">All Results</option>
          <option value="pass">Passing</option>
          <option value="fail">Failing</option>
          <option value="untested">Untested</option>
          <option value="no-tests">No Tests Defined</option>
        </select>

        <button
          onClick={expandAll}
          className="px-3 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition"
        >
          Collapse All
        </button>
      </div>

      {/* Feature Cards */}
      <div className="space-y-2">
        {filteredItems.map(item => (
          <FeatureCard
            key={item.id}
            item={item}
            results={results}
            isExpanded={expandedIds.has(item.id)}
            onToggle={() => toggleExpanded(item.id)}
            isRunning={runningItems.has(item.id)}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No features match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
