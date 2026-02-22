/**
 * AdminAI Component
 * AI & Automation management for platform admins
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bot,
  RefreshCw,
  Coins,
  Zap,
  Brain,
  Workflow,
  Clock,
  Play,
  Pause,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Copy,
  TestTube,
  BarChart3,
  TrendingUp,
  Activity,
  Calendar,
  Settings,
  Star,
  Sparkles,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Server,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIconColor, getStatusColor, BUTTON_STYLES } from '@/lib/adminTheme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

export default function AdminAI() {
  const { adminUser } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('models');

  // Data states
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [usage, setUsage] = useState(null);

  // Real usage data from ai_usage_logs
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Modal states
  const [showModelModal, setShowModelModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showRunsModal, setShowRunsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [workflowRuns, setWorkflowRuns] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      };

      const [statsRes, modelsRes, promptsRes, workflowsRes, tasksRes, usageRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/ai/stats`, { headers }),
        fetch(`${ADMIN_API_URL}/ai/models`, { headers }),
        fetch(`${ADMIN_API_URL}/ai/prompts`, { headers }),
        fetch(`${ADMIN_API_URL}/automation/workflows`, { headers }),
        fetch(`${ADMIN_API_URL}/automation/scheduled-tasks`, { headers }),
        fetch(`${ADMIN_API_URL}/ai/usage?days=30`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (modelsRes.ok) setModels(await modelsRes.json());
      if (promptsRes.ok) setPrompts(await promptsRes.json());
      if (workflowsRes.ok) setWorkflows(await workflowsRes.json());
      if (tasksRes.ok) setScheduledTasks(await tasksRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
    } catch (error) {
      console.error('Error fetching AI data:', error);
      toast.error('Failed to load AI data');
    } finally {
      setLoading(false);
    }
  };

  // Provider mapping for grouping endpoints
  // Endpoint strings logged by edge functions:
  //   google/nano-banana-pro, google/veo-*, google/gemini-vision  → Google AI
  //   /v1/images/generations, together.xyz/images                 → Together.ai (FLUX)
  //   /v1/chat/completions, /orchestration, together.xyz/chat     → Together.ai (LLM)
  //   /v1/audio/speech, together.ai/audio                         → Together.ai (TTS)
  //   together.xyz/embeddings                                     → Together.ai (Embeddings)
  //   /openai/v1/chat/completions, groq.com/chat                  → Groq
  //   anthropic.com/messages                                      → Anthropic
  //   fal.ai, fal.run                                             → fal.ai
  //   explorium.ai/enrich                                         → Explorium
  //   tavily.com/search                                           → Tavily
  //   composio.dev/api                                            → Composio
  //   shotstack.io                                                → Shotstack
  //   twilio.com                                                  → Twilio
  //   resend.com                                                  → Resend
  const getProvider = (endpoint) => {
    if (!endpoint) return { name: 'Other', color: 'zinc' };
    const ep = endpoint.toLowerCase();
    // Google AI (Gemini, Veo, Nano Banana)
    if (ep.startsWith('google/') || ep.includes('googleapis') || ep.includes('gemini')) return { name: 'Google AI', color: 'blue' };
    // Groq (uses /openai/v1 prefix or explicit groq)
    if (ep.includes('groq') || ep.startsWith('/openai/')) return { name: 'Groq', color: 'orange' };
    // Anthropic (Claude)
    if (ep.includes('anthropic')) return { name: 'Anthropic', color: 'amber' };
    // Together.ai - Image (FLUX)
    if (ep.includes('/v1/images/') || ep.includes('together.xyz/images') || ep.includes('together.ai/images')) return { name: 'Together.ai (FLUX)', color: 'purple' };
    // Together.ai - TTS
    if (ep.includes('/audio/speech') || ep.includes('together.ai/audio')) return { name: 'Together.ai (TTS)', color: 'violet' };
    // Together.ai - Embeddings
    if (ep.includes('embeddings') || ep.includes('together.xyz/embed')) return { name: 'Together.ai (Embed)', color: 'indigo' };
    // Together.ai - LLM (chat completions, orchestration)
    if (ep.includes('/v1/chat/') || ep.includes('/orchestration') || ep.includes('together.xyz/chat') || ep.includes('together')) return { name: 'Together.ai (LLM)', color: 'purple' };
    // fal.ai
    if (ep.includes('fal.ai') || ep.includes('fal.run') || ep.includes('fal')) return { name: 'fal.ai', color: 'pink' };
    // Explorium
    if (ep.includes('explorium')) return { name: 'Explorium', color: 'green' };
    // Tavily
    if (ep.includes('tavily')) return { name: 'Tavily', color: 'yellow' };
    // Composio
    if (ep.includes('composio')) return { name: 'Composio', color: 'sky' };
    // Shotstack
    if (ep.includes('shotstack')) return { name: 'Shotstack', color: 'rose' };
    // Twilio
    if (ep.includes('twilio')) return { name: 'Twilio', color: 'red' };
    // Resend
    if (ep.includes('resend')) return { name: 'Resend', color: 'teal' };
    // Stripe
    if (ep.includes('stripe')) return { name: 'Stripe', color: 'violet' };
    // Jina
    if (ep.includes('jina')) return { name: 'Jina AI', color: 'lime' };
    // Firecrawl
    if (ep.includes('firecrawl')) return { name: 'Firecrawl', color: 'cyan' };
    return { name: 'Other', color: 'zinc' };
  };

  const PROVIDER_COLORS = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500', border: 'border-blue-500/30' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500', border: 'border-purple-500/30' },
    violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', bar: 'bg-violet-500', border: 'border-violet-500/30' },
    indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', bar: 'bg-indigo-500', border: 'border-indigo-500/30' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: 'bg-orange-500', border: 'border-orange-500/30' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500', border: 'border-amber-500/30' },
    pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', bar: 'bg-pink-500', border: 'border-pink-500/30' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-500', border: 'border-green-500/30' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', bar: 'bg-yellow-500', border: 'border-yellow-500/30' },
    sky: { bg: 'bg-sky-500/20', text: 'text-sky-400', bar: 'bg-sky-500', border: 'border-sky-500/30' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', bar: 'bg-rose-500', border: 'border-rose-500/30' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500', border: 'border-red-500/30' },
    teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', bar: 'bg-teal-500', border: 'border-teal-500/30' },
    lime: { bg: 'bg-lime-500/20', text: 'text-lime-400', bar: 'bg-lime-500', border: 'border-lime-500/30' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', bar: 'bg-cyan-500', border: 'border-cyan-500/30' },
    zinc: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', bar: 'bg-zinc-500', border: 'border-zinc-500/30' },
  };

  const fetchUsageData = async () => {
    setUsageLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      // Fetch all usage logs (last 30 days)
      const { data: usageLogs, error: usageError } = await supabase
        .from('ai_usage_logs')
        .select('endpoint, request_type, cost, total_tokens, prompt_tokens, completion_tokens, created_at')
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false });

      // Fetch ALL usage logs for all-time totals
      const { data: allTimeLogs, error: allTimeError } = await supabase
        .from('ai_usage_logs')
        .select('endpoint, cost, total_tokens, created_at');

      // Fetch credit transactions with user info for owner detection
      const { data: creditTxns, error: creditError } = await supabase
        .from('credit_transactions')
        .select('action_key, edge_function, amount, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(2000);

      // Fetch action cost definitions
      const { data: actionCosts, error: actionError } = await supabase
        .from('credit_action_costs')
        .select('action_key, credits_required, label, category, tier');

      // Fetch admin/owner users to identify platform owner usage
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id, full_name, role, email')
        .in('role', ['admin', 'super_admin']);

      if (usageError) throw usageError;

      const logs = usageLogs || [];
      const allLogs = allTimeLogs || [];
      const txns = creditTxns || [];
      const actions = actionCosts || [];

      // --- Aggregate by provider (30d) ---
      const providerMap = {};
      logs.forEach((log) => {
        const provider = getProvider(log.endpoint);
        if (!providerMap[provider.name]) {
          providerMap[provider.name] = {
            name: provider.name,
            color: provider.color,
            calls: 0,
            cost: 0,
            tokens: 0,
          };
        }
        providerMap[provider.name].calls += 1;
        providerMap[provider.name].cost += parseFloat(log.cost || 0);
        providerMap[provider.name].tokens += parseInt(log.total_tokens || 0);
      });
      const providerBreakdown = Object.values(providerMap).sort((a, b) => b.cost - a.cost);

      // --- Aggregate by endpoint (30d) ---
      const endpointMap = {};
      logs.forEach((log) => {
        const key = log.endpoint || 'unknown';
        if (!endpointMap[key]) {
          const provider = getProvider(log.endpoint);
          endpointMap[key] = {
            endpoint: key,
            provider: provider.name,
            providerColor: provider.color,
            requestType: log.request_type || 'unknown',
            calls: 0,
            cost: 0,
            tokens: 0,
            lastUsed: log.created_at,
          };
        }
        endpointMap[key].calls += 1;
        endpointMap[key].cost += parseFloat(log.cost || 0);
        endpointMap[key].tokens += parseInt(log.total_tokens || 0);
        if (log.created_at > endpointMap[key].lastUsed) {
          endpointMap[key].lastUsed = log.created_at;
        }
      });
      const endpointBreakdown = Object.values(endpointMap).sort((a, b) => b.cost - a.cost);

      // --- Daily cost trend (30d) grouped by provider ---
      const dailyMap = {};
      logs.forEach((log) => {
        const day = log.created_at?.split('T')[0];
        if (!day) return;
        const provider = getProvider(log.endpoint);
        if (!dailyMap[day]) dailyMap[day] = { date: day, totalCost: 0, providers: {} };
        dailyMap[day].totalCost += parseFloat(log.cost || 0);
        if (!dailyMap[day].providers[provider.name]) {
          dailyMap[day].providers[provider.name] = { cost: 0, color: provider.color };
        }
        dailyMap[day].providers[provider.name].cost += parseFloat(log.cost || 0);
      });

      // Fill in missing days
      const dailyTrend = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        dailyTrend.push(dailyMap[dayStr] || { date: dayStr, totalCost: 0, providers: {} });
      }

      // --- Summary stats (30d) ---
      const totalCalls30d = logs.length;
      const totalCost30d = logs.reduce((sum, l) => sum + parseFloat(l.cost || 0), 0);
      const totalTokens30d = logs.reduce((sum, l) => sum + parseInt(l.total_tokens || 0), 0);

      // All-time totals
      const totalCostAllTime = allLogs.reduce((sum, l) => sum + parseFloat(l.cost || 0), 0);
      const totalCallsAllTime = allLogs.length;

      // Today's stats
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter((l) => l.created_at?.startsWith(todayStr));
      const totalCostToday = todayLogs.reduce((sum, l) => sum + parseFloat(l.cost || 0), 0);
      const totalCallsToday = todayLogs.length;

      // Build owner user ID set
      const ownerIds = new Set((adminUsers || []).map((u) => u.id));
      const ownerNames = {};
      (adminUsers || []).forEach((u) => { ownerNames[u.id] = u.full_name || u.email || 'Admin'; });

      // Credit analysis (30d) - separate owner usage from customer revenue
      const recentTxns = txns.filter((t) => new Date(t.created_at) >= thirtyDaysAgo);
      const ownerTxns = recentTxns.filter((t) => parseFloat(t.amount) < 0 && ownerIds.has(t.user_id));
      const customerTxns = recentTxns.filter((t) => parseFloat(t.amount) < 0 && !ownerIds.has(t.user_id));

      const ownerCreditsUsed30d = ownerTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      const customerCreditsUsed30d = customerTxns.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      const totalCreditsUsed30d = ownerCreditsUsed30d + customerCreditsUsed30d;

      // Owner credit breakdown by action
      const ownerActionMap = {};
      ownerTxns.forEach((t) => {
        const key = t.action_key || t.edge_function || 'other';
        if (!ownerActionMap[key]) ownerActionMap[key] = { action: key, credits: 0, count: 0 };
        ownerActionMap[key].credits += Math.abs(parseFloat(t.amount));
        ownerActionMap[key].count += 1;
      });
      const ownerActionBreakdown = Object.values(ownerActionMap).sort((a, b) => b.credits - a.credits);

      // Credit top-ups (positive amounts)
      const creditsAdded30d = recentTxns
        .filter((t) => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      // Unique providers with data
      const uniqueProviders = [...new Set(logs.map((l) => getProvider(l.endpoint).name))];

      setUsageData({
        providerBreakdown,
        endpointBreakdown,
        dailyTrend,
        totalCalls30d,
        totalCost30d,
        totalTokens30d,
        totalCostAllTime,
        totalCallsAllTime,
        totalCostToday,
        totalCallsToday,
        ownerCreditsUsed30d,
        customerCreditsUsed30d,
        totalCreditsUsed30d,
        ownerActionBreakdown,
        creditsAdded30d,
        ownerNames,
        uniqueProviders,
        actionCosts: actions,
        creditTransactions: recentTxns,
      });
    } catch (error) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage analytics');
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUsageData();
  }, []);

  const handleSaveModel = async (data) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = selectedItem ? 'PUT' : 'POST';
      const url = selectedItem
        ? `${ADMIN_API_URL}/ai/models/${selectedItem.id}`
        : `${ADMIN_API_URL}/ai/models`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(selectedItem ? 'Model updated' : 'Model created');
        setShowModelModal(false);
        setSelectedItem(null);
        fetchData();
      } else {
        throw new Error('Failed to save model');
      }
    } catch (error) {
      toast.error('Failed to save model');
    }
  };

  const handleSavePrompt = async (data) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = selectedItem ? 'PUT' : 'POST';
      const url = selectedItem
        ? `${ADMIN_API_URL}/ai/prompts/${selectedItem.id}`
        : `${ADMIN_API_URL}/ai/prompts`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, created_by: adminUser?.id }),
      });

      if (response.ok) {
        toast.success(selectedItem ? 'Prompt updated' : 'Prompt created');
        setShowPromptModal(false);
        setSelectedItem(null);
        fetchData();
      } else {
        throw new Error('Failed to save prompt');
      }
    } catch (error) {
      toast.error('Failed to save prompt');
    }
  };

  const handleDeletePrompt = async (id) => {
    if (!confirm('Delete this prompt?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${ADMIN_API_URL}/ai/prompts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });

      if (response.ok) {
        toast.success('Prompt deleted');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  const handleSaveWorkflow = async (data) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = selectedItem ? 'PUT' : 'POST';
      const url = selectedItem
        ? `${ADMIN_API_URL}/automation/workflows/${selectedItem.id}`
        : `${ADMIN_API_URL}/automation/workflows`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, created_by: adminUser?.id }),
      });

      if (response.ok) {
        toast.success(selectedItem ? 'Workflow updated' : 'Workflow created');
        setShowWorkflowModal(false);
        setSelectedItem(null);
        fetchData();
      } else {
        throw new Error('Failed to save workflow');
      }
    } catch (error) {
      toast.error('Failed to save workflow');
    }
  };

  const handleTriggerWorkflow = async (workflowId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${ADMIN_API_URL}/automation/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast.success('Workflow triggered');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to trigger workflow');
    }
  };

  const handleViewRuns = async (workflow) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${ADMIN_API_URL}/automation/workflows/${workflow.id}/runs`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });

      if (response.ok) {
        const runs = await response.json();
        setWorkflowRuns(runs);
        setSelectedItem(workflow);
        setShowRunsModal(true);
      }
    } catch (error) {
      toast.error('Failed to load runs');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${ADMIN_API_URL}/automation/scheduled-tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !task.is_active }),
      });

      if (response.ok) {
        toast.success(task.is_active ? 'Task disabled' : 'Task enabled');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const formatCost = (cost) => {
    if (cost === null || cost === undefined) return '€0.00';
    return `€${parseFloat(cost).toFixed(4)}`;
  };

  const formatUsd = (cost, decimals = 2) => {
    if (cost === null || cost === undefined) return '$0.00';
    const val = parseFloat(cost);
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    if (val >= 100) return `$${val.toFixed(decimals)}`;
    if (val >= 1) return `$${val.toFixed(decimals)}`;
    if (val >= 0.01) return `$${val.toFixed(3)}`;
    return `$${val.toFixed(4)}`;
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const cleanEndpointName = (endpoint) => {
    if (!endpoint) return 'Unknown';
    const ep = endpoint.toLowerCase();
    // Specific known endpoint mappings
    if (ep === '/v1/images/generations') return 'FLUX Image Generation';
    if (ep === '/openai/v1/chat/completions') return 'Groq Chat';
    if (ep === '/v1/chat/completions') return 'Together.ai Chat';
    if (ep === '/v1/audio/speech') return 'Together.ai TTS';
    if (ep === '/v1/embeddings') return 'Together.ai Embeddings';
    if (ep === '/orchestration') return 'Together.ai Orchestration';
    if (ep.startsWith('google/')) return 'Google: ' + endpoint.slice(7).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (ep.includes('fal.ai') || ep.includes('fal.run')) return 'fal.ai: ' + endpoint.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (ep.includes('anthropic')) return 'Anthropic: ' + endpoint.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (ep.includes('explorium')) return 'Explorium Enrichment';
    if (ep.includes('tavily')) return 'Tavily Search';
    if (ep.includes('composio')) return 'Composio Action';
    if (ep.includes('shotstack')) return 'Shotstack Render';
    if (ep.includes('twilio')) return 'Twilio SMS';
    if (ep.includes('resend')) return 'Resend Email';
    if (ep.includes('jina')) return 'Jina AI';
    if (ep.includes('firecrawl')) return 'Firecrawl Scrape';
    // Fallback: clean up dashes and capitalize
    return endpoint
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <>
      <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">AI & Automation</h1>
                <p className="text-zinc-400 text-xs">Manage AI models, prompts, and automated workflows</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchData(); fetchUsageData(); }}
              disabled={loading || usageLoading}
              className="border-zinc-700 h-7 text-xs"
            >
              <RefreshCw className={cn("w-3 h-3 mr-1.5", (loading || usageLoading) && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-[10px]">API Calls (30d)</p>
                    <p className="text-lg font-bold text-white">
                      {formatNumber(usageData?.totalCalls30d || 0)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Today: {formatNumber(usageData?.totalCallsToday || 0)}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${getIconColor('blue')}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-[10px]">Platform Cost (30d)</p>
                    <p className="text-lg font-bold text-white">
                      {formatUsd(usageData?.totalCost30d || 0)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Today: {formatUsd(usageData?.totalCostToday || 0)} | All-time: {formatUsd(usageData?.totalCostAllTime || 0)}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${getIconColor('cyan')}`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-[10px]">API Providers</p>
                    <p className="text-lg font-bold text-white">
                      {usageData?.uniqueProviders?.length || 0}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {usageData?.endpointBreakdown?.length || 0} unique endpoints
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${getIconColor('blue')}`}>
                    <Server className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-[10px]">Tokens Used (30d)</p>
                    <p className="text-lg font-bold text-white">
                      {formatTokens(usageData?.totalTokens30d || 0)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Avg: {formatUsd(usageData?.totalCalls30d ? (usageData.totalCost30d / usageData.totalCalls30d) : 0, 4)}/call
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${getIconColor('blue')}`}>
                    <Hash className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900 border border-zinc-800 mb-4">
              <TabsTrigger value="models" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
                <Brain className="w-3 h-3 mr-1.5" />
                AI Models
              </TabsTrigger>
              <TabsTrigger value="usage" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
                <BarChart3 className="w-3 h-3 mr-1.5" />
                Usage Analytics
              </TabsTrigger>
              <TabsTrigger value="prompts" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
                <Sparkles className="w-3 h-3 mr-1.5" />
                Prompt Library
              </TabsTrigger>
              <TabsTrigger value="workflows" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
                <Workflow className="w-3 h-3 mr-1.5" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-xs">
                <Clock className="w-3 h-3 mr-1.5" />
                Scheduled Tasks
              </TabsTrigger>
            </TabsList>

            {/* AI Models Tab */}
            <TabsContent value="models">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-white">Configured AI Models</h2>
                <Button
                  onClick={() => { setSelectedItem(null); setShowModelModal(true); }}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add Model
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {models.map((model) => (
                  <Card key={model.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center",
                            model.provider === 'openai' && "bg-cyan-500/20",
                            model.provider === 'anthropic' && "bg-blue-500/20",
                            model.provider === 'google' && "bg-blue-500/20"
                          )}>
                            <Brain className={cn(
                              "w-3 h-3",
                              model.provider === 'openai' && "text-cyan-400",
                              model.provider === 'anthropic' && "text-blue-400",
                              model.provider === 'google' && "text-blue-400"
                            )} />
                          </div>
                          <div>
                            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                              {model.name}
                              {model.is_default && (
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              )}
                            </h3>
                            <p className="text-[10px] text-zinc-500">{model.provider}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-[10px] px-1.5 py-px", model.is_active ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-700 text-zinc-400")}>
                          {model.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <p className="text-[10px] text-zinc-400 mb-2 line-clamp-2">{model.description}</p>

                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between text-zinc-400">
                          <span>Input Price</span>
                          <span className="text-white">€{model.pricing_input}/1K</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Output Price</span>
                          <span className="text-white">€{model.pricing_output}/1K</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Context Window</span>
                          <span className="text-white">{formatTokens(model.context_window)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Total Usage</span>
                          <span className="text-white">{formatTokens(model.total_tokens_used)} tokens</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-zinc-700 h-6 text-[10px]"
                          onClick={() => { setSelectedItem(model); setShowModelModal(true); }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Usage Analytics Tab */}
            <TabsContent value="usage">
              {usageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="ml-2 text-zinc-400 text-sm">Loading usage data...</span>
                </div>
              ) : !usageData ? (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400 text-xs">No usage data available</p>
                    <Button
                      onClick={fetchUsageData}
                      size="sm"
                      className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                    >
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">

                  {/* Section A: API Provider Breakdown */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="py-2 px-3 border-b border-zinc-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm">API Provider Breakdown (30 days)</CardTitle>
                        <span className="text-[10px] text-zinc-500">
                          Total: {formatUsd(usageData.totalCost30d)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="space-y-2.5">
                        {usageData.providerBreakdown.map((provider) => {
                          const pctOfTotal = usageData.totalCost30d > 0
                            ? (provider.cost / usageData.totalCost30d) * 100
                            : 0;
                          const colors = PROVIDER_COLORS[provider.color] || PROVIDER_COLORS.zinc;
                          return (
                            <div key={provider.name} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-5 h-5 rounded flex items-center justify-center", colors.bg)}>
                                    <Server className={cn("w-3 h-3", colors.text)} />
                                  </div>
                                  <span className="text-xs text-white font-medium">{provider.name}</span>
                                  <span className="text-[10px] text-zinc-500">{provider.calls} calls</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono text-white">{formatUsd(provider.cost)}</span>
                                  <span className={cn("text-[10px] font-medium", colors.text)}>
                                    {pctOfTotal.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                                  style={{ width: `${Math.max(1, pctOfTotal)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {usageData.providerBreakdown.length === 0 && (
                          <p className="text-center text-zinc-500 text-xs py-4">No API calls in the last 30 days</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section B: Daily Cost Trend (30-day bar chart) */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="py-2 px-3 border-b border-zinc-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm">Daily Cost Trend (30 days)</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          {usageData.providerBreakdown.map((p) => {
                            const colors = PROVIDER_COLORS[p.color] || PROVIDER_COLORS.zinc;
                            return (
                              <div key={p.name} className="flex items-center gap-1">
                                <div className={cn("w-2 h-2 rounded-full", colors.bar)} />
                                <span className="text-[10px] text-zinc-500">{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      {(() => {
                        const maxDailyCost = Math.max(...usageData.dailyTrend.map((d) => d.totalCost), 0.01);
                        return (
                          <>
                            <div className="h-40 flex items-end gap-0.5">
                              {usageData.dailyTrend.map((day, index) => {
                                const providerEntries = Object.entries(day.providers);
                                const totalHeight = (day.totalCost / maxDailyCost) * 100;
                                return (
                                  <div
                                    key={index}
                                    className="flex-1 flex flex-col-reverse rounded-t overflow-hidden cursor-pointer group relative"
                                    style={{ height: `${Math.max(day.totalCost > 0 ? 3 : 0, totalHeight)}%` }}
                                    title={`${day.date}: ${formatUsd(day.totalCost)}`}
                                  >
                                    {providerEntries.length > 0 ? (
                                      providerEntries.map(([name, data]) => {
                                        const colors = PROVIDER_COLORS[data.color] || PROVIDER_COLORS.zinc;
                                        const segmentPct = day.totalCost > 0 ? (data.cost / day.totalCost) * 100 : 0;
                                        return (
                                          <div
                                            key={name}
                                            className={cn("w-full group-hover:opacity-80 transition-opacity", colors.bar)}
                                            style={{ height: `${segmentPct}%`, minHeight: segmentPct > 0 ? '1px' : 0 }}
                                          />
                                        );
                                      })
                                    ) : (
                                      <div className="w-full h-full bg-zinc-800" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] text-zinc-500">
                              <span>{usageData.dailyTrend[0]?.date?.slice(5)}</span>
                              <span>{usageData.dailyTrend[14]?.date?.slice(5)}</span>
                              <span>{usageData.dailyTrend[29]?.date?.slice(5)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Section C: Endpoint Details Table */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="py-2 px-3 border-b border-zinc-800">
                      <CardTitle className="text-white text-sm">Endpoint Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              <th className="text-left text-zinc-400 font-medium py-2 px-3">Endpoint</th>
                              <th className="text-left text-zinc-400 font-medium py-2 px-3">Provider</th>
                              <th className="text-left text-zinc-400 font-medium py-2 px-3">Type</th>
                              <th className="text-right text-zinc-400 font-medium py-2 px-3">Calls</th>
                              <th className="text-right text-zinc-400 font-medium py-2 px-3">Cost (USD)</th>
                              <th className="text-right text-zinc-400 font-medium py-2 px-3">Avg/Call</th>
                              <th className="text-right text-zinc-400 font-medium py-2 px-3">Last Used</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usageData.endpointBreakdown.map((ep) => {
                              const colors = PROVIDER_COLORS[ep.providerColor] || PROVIDER_COLORS.zinc;
                              return (
                                <tr key={ep.endpoint} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                  <td className="py-2 px-3">
                                    <span className="text-white font-mono text-[11px]">{cleanEndpointName(ep.endpoint)}</span>
                                  </td>
                                  <td className="py-2 px-3">
                                    <Badge className={cn("text-[10px] px-1.5 py-px", colors.bg, colors.text)}>
                                      {ep.provider}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="text-zinc-400 capitalize">{ep.requestType}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-white font-mono">
                                    {ep.calls}
                                  </td>
                                  <td className="py-2 px-3 text-right text-cyan-400 font-mono">
                                    {formatUsd(ep.cost)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-zinc-400 font-mono">
                                    {formatUsd(ep.calls > 0 ? ep.cost / ep.calls : 0, 4)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-zinc-500">
                                    {ep.lastUsed ? formatDistanceToNow(new Date(ep.lastUsed), { addSuffix: true }) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {usageData.endpointBreakdown.length === 0 && (
                          <p className="text-center text-zinc-500 text-xs py-6">No endpoint data</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section D: Revenue vs Cost + Owner Production Costs */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                    {/* D1: Cost Breakdown by Type */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader className="py-2 px-3 border-b border-zinc-800">
                        <CardTitle className="text-white text-sm">Cost by Type</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {(() => {
                            const typeMap = {};
                            usageData.endpointBreakdown.forEach((ep) => {
                              const type = ep.requestType || 'unknown';
                              if (!typeMap[type]) typeMap[type] = { type, calls: 0, cost: 0 };
                              typeMap[type].calls += ep.calls;
                              typeMap[type].cost += ep.cost;
                            });
                            const types = Object.values(typeMap).sort((a, b) => b.cost - a.cost);
                            return types.map((t) => (
                              <div key={t.type} className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white capitalize font-medium">{t.type}</span>
                                  <span className="text-[10px] text-zinc-500">{t.calls} calls</span>
                                </div>
                                <span className="text-xs text-cyan-400 font-mono">{formatUsd(t.cost)}</span>
                              </div>
                            ));
                          })()}
                          <div className="pt-2 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400">All-Time API Cost</span>
                              <span className="text-xs text-white font-mono">{formatUsd(usageData.totalCostAllTime)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-zinc-400">All-Time Calls</span>
                              <span className="text-xs text-white font-mono">{formatNumber(usageData.totalCallsAllTime)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* D2: Owner / Platform Credits (Production Cost) */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader className="py-2 px-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-white text-sm">Owner Credits Used</CardTitle>
                          <Badge className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-px">Production Cost</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
                            <p className="text-[10px] text-amber-400/70">Credits used by admin/owner accounts</p>
                            <p className="text-lg font-bold text-amber-400">
                              {formatNumber(usageData.ownerCreditsUsed30d)} credits
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              ~{formatCost(usageData.ownerCreditsUsed30d * 0.078)} production cost (30d)
                            </p>
                          </div>
                          {usageData.ownerActionBreakdown.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-[10px] text-zinc-500 font-medium">Owner usage breakdown:</p>
                              {usageData.ownerActionBreakdown.slice(0, 6).map((a) => (
                                <div key={a.action} className="flex items-center justify-between bg-zinc-800/30 rounded px-2 py-1">
                                  <span className="text-[10px] text-zinc-300 truncate flex-1 mr-2">
                                    {a.action.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-zinc-500">{a.count}x</span>
                                    <span className="text-[10px] text-amber-400 font-mono">{a.credits} cr</span>
                                  </div>
                                </div>
                              ))}
                              {usageData.ownerActionBreakdown.length > 6 && (
                                <p className="text-[10px] text-zinc-600 text-center">
                                  + {usageData.ownerActionBreakdown.length - 6} more
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-center text-[10px] text-zinc-600 py-2">
                              No owner credit usage recorded yet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* D3: Revenue vs Total Cost */}
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader className="py-2 px-3 border-b border-zinc-800">
                        <CardTitle className="text-white text-sm">Revenue vs Cost (30d)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {/* Customer revenue */}
                          <div className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-2.5">
                            <div>
                              <p className="text-[10px] text-zinc-400">Customer Credits Used</p>
                              <p className="text-sm font-bold text-green-400">
                                {formatNumber(usageData.customerCreditsUsed30d)} credits
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                ~{formatCost(usageData.customerCreditsUsed30d * 0.078)} revenue
                              </p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          </div>

                          {/* Platform API cost */}
                          <div className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-2.5">
                            <div>
                              <p className="text-[10px] text-zinc-400">Platform API Cost</p>
                              <p className="text-sm font-bold text-red-400">
                                {formatUsd(usageData.totalCost30d)}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                ~{formatCost(usageData.totalCost30d * 0.92)} (USD/EUR)
                              </p>
                            </div>
                            <ArrowDownRight className="w-4 h-4 text-red-400" />
                          </div>

                          {/* Owner production cost */}
                          {usageData.ownerCreditsUsed30d > 0 && (
                            <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5">
                              <div>
                                <p className="text-[10px] text-amber-400/70">Owner Credits (Prod Cost)</p>
                                <p className="text-sm font-bold text-amber-400">
                                  {formatNumber(usageData.ownerCreditsUsed30d)} credits
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  ~{formatCost(usageData.ownerCreditsUsed30d * 0.078)} internal cost
                                </p>
                              </div>
                              <ArrowDownRight className="w-4 h-4 text-amber-400" />
                            </div>
                          )}

                          {/* Margin calculation - only customer revenue counts */}
                          {(() => {
                            const customerRevenueEur = usageData.customerCreditsUsed30d * 0.078;
                            const apiCostEur = usageData.totalCost30d * 0.92;
                            const ownerCostEur = usageData.ownerCreditsUsed30d * 0.078;
                            const totalCostEur = apiCostEur + ownerCostEur;
                            const netProfit = customerRevenueEur - totalCostEur;
                            const margin = customerRevenueEur > 0
                              ? ((customerRevenueEur - totalCostEur) / customerRevenueEur) * 100
                              : (totalCostEur > 0 ? -100 : 0);
                            return (
                              <div className={cn(
                                "rounded-lg p-2.5 text-center",
                                margin >= 0 ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
                              )}>
                                <p className="text-[10px] text-zinc-400">Net Margin (excl. owner)</p>
                                <p className={cn("text-lg font-bold", margin >= 0 ? "text-green-400" : "text-red-400")}>
                                  {margin === -100 && usageData.customerCreditsUsed30d === 0
                                    ? 'N/A'
                                    : `${margin.toFixed(1)}%`
                                  }
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {netProfit >= 0 ? '+' : ''}{formatCost(netProfit)} net
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Section E: Action Cost Definitions */}
                  {usageData.actionCosts?.length > 0 && (
                    <Card className="bg-zinc-900/50 border-zinc-800">
                      <CardHeader className="py-2 px-3 border-b border-zinc-800">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-sm">Credit Action Pricing ({usageData.actionCosts.length} actions)</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {usageData.actionCosts.slice(0, 16).map((action) => (
                            <div key={action.action_key} className="bg-zinc-800/30 rounded-lg p-2">
                              <p className="text-[10px] text-white font-medium truncate" title={action.label || action.action_key}>
                                {action.label || action.action_key}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <Badge className="bg-zinc-700 text-zinc-300 text-[9px] px-1 py-px">
                                  {action.category || 'general'}
                                </Badge>
                                <span className="text-[10px] text-cyan-400 font-mono">
                                  {action.credits_required} cr
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {usageData.actionCosts.length > 16 && (
                          <p className="text-center text-[10px] text-zinc-500 mt-2">
                            + {usageData.actionCosts.length - 16} more actions defined
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                </div>
              )}
            </TabsContent>

            {/* Prompt Library Tab */}
            <TabsContent value="prompts">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-white">Prompt Templates</h2>
                <Button
                  onClick={() => { setSelectedItem(null); setShowPromptModal(true); }}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Create Prompt
                </Button>
              </div>

              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-xs font-semibold text-white">{prompt.name}</h3>
                            <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-px">
                              {prompt.category}
                            </Badge>
                            <Badge className={cn("text-[10px] px-1.5 py-px", prompt.is_active ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-700 text-zinc-400")}>
                              {prompt.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-400 mb-2">{prompt.description}</p>

                          <div className="bg-zinc-800/50 rounded-lg p-2 mb-2">
                            <p className="text-[10px] text-zinc-500 mb-0.5">User Prompt Template:</p>
                            <p className="text-[10px] text-zinc-300 font-mono line-clamp-2">{prompt.user_prompt_template}</p>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                            <span>Model: {prompt.model_name || 'Default'}</span>
                            <span>Temp: {prompt.temperature}</span>
                            <span>Max Tokens: {prompt.max_tokens}</span>
                            {prompt.variables?.length > 0 && (
                              <span>Variables: {prompt.variables.join(', ')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1.5 ml-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 h-6 w-6 p-0"
                            onClick={() => { setSelectedItem(prompt); setShowPromptModal(true); }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/20 h-6 w-6 p-0"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {prompts.length === 0 && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6 text-center">
                      <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-400 text-xs">No prompts created yet</p>
                      <Button
                        onClick={() => setShowPromptModal(true)}
                        size="sm"
                        className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                      >
                        Create First Prompt
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Workflows Tab */}
            <TabsContent value="workflows">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-white">Automation Workflows</h2>
                <Button
                  onClick={() => { setSelectedItem(null); setShowWorkflowModal(true); }}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Create Workflow
                </Button>
              </div>

              <div className="space-y-2">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-xs font-semibold text-white">{workflow.name}</h3>
                            <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-px">
                              {workflow.trigger_type}
                            </Badge>
                            <Badge className={cn("text-[10px] px-1.5 py-px", workflow.is_active ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-700 text-zinc-400")}>
                              {workflow.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-400 mb-2">{workflow.description}</p>

                          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {workflow.total_runs || 0} runs
                            </span>
                            <span className="flex items-center gap-1 text-green-400">
                              <Check className="w-3 h-3" />
                              {workflow.successful_runs || 0} successful
                            </span>
                            <span className="flex items-center gap-1 text-red-400">
                              <X className="w-3 h-3" />
                              {workflow.failed_runs || 0} failed
                            </span>
                            {workflow.last_run_at && (
                              <span>Last run: {formatDistanceToNow(new Date(workflow.last_run_at), { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1.5 ml-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 h-6 text-[10px] px-2"
                            onClick={() => handleViewRuns(workflow)}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            History
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-500/30 text-green-400 hover:bg-green-500/20 h-6 text-[10px] px-2"
                            onClick={() => handleTriggerWorkflow(workflow.id)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Run
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 h-6 w-6 p-0"
                            onClick={() => { setSelectedItem(workflow); setShowWorkflowModal(true); }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {workflows.length === 0 && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6 text-center">
                      <Workflow className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-400 text-xs">No workflows created yet</p>
                      <Button
                        onClick={() => setShowWorkflowModal(true)}
                        size="sm"
                        className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs"
                      >
                        Create First Workflow
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Scheduled Tasks Tab */}
            <TabsContent value="scheduled">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-white">Scheduled Tasks</h2>
              </div>

              <div className="space-y-2">
                {scheduledTasks.map((task) => (
                  <Card key={task.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-xs font-semibold text-white">{task.name}</h3>
                            <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-px">
                              {task.task_type}
                            </Badge>
                            <Badge className={cn("text-[10px] px-1.5 py-px", task.is_active ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-700 text-zinc-400")}>
                              {task.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-400 mb-2">{task.description}</p>

                          <div className="flex items-center gap-4 text-[10px] text-zinc-500 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {task.cron_expression}
                            </span>
                            <span>Timezone: {task.timezone}</span>
                            <span>Runs: {task.run_count || 0}</span>
                            {task.last_run_at && (
                              <span>Last: {formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}</span>
                            )}
                            {task.next_run_at && (
                              <span className="text-green-400">Next: {format(new Date(task.next_run_at), 'MMM d, HH:mm')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-3">
                          <Switch
                            checked={task.is_active}
                            onCheckedChange={() => handleToggleTask(task)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {scheduledTasks.length === 0 && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6 text-center">
                      <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-400 text-xs">No scheduled tasks configured</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
      </div>

      {/* Model Modal */}
      <ModelModal
        open={showModelModal}
        onClose={() => { setShowModelModal(false); setSelectedItem(null); }}
        model={selectedItem}
        onSave={handleSaveModel}
      />

      {/* Prompt Modal */}
      <PromptModal
        open={showPromptModal}
        onClose={() => { setShowPromptModal(false); setSelectedItem(null); }}
        prompt={selectedItem}
        models={models}
        onSave={handleSavePrompt}
      />

      {/* Workflow Modal */}
      <WorkflowModal
        open={showWorkflowModal}
        onClose={() => { setShowWorkflowModal(false); setSelectedItem(null); }}
        workflow={selectedItem}
        onSave={handleSaveWorkflow}
      />

      {/* Runs Modal */}
      <RunsModal
        open={showRunsModal}
        onClose={() => { setShowRunsModal(false); setSelectedItem(null); setWorkflowRuns([]); }}
        workflow={selectedItem}
        runs={workflowRuns}
      />
    </>
  );
}

// Model Modal Component
function ModelModal({ open, onClose, model, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    provider: 'openai',
    model_id: '',
    description: '',
    capabilities: [],
    pricing_input: 0,
    pricing_output: 0,
    max_tokens: 4096,
    context_window: 128000,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name || '',
        slug: model.slug || '',
        provider: model.provider || 'openai',
        model_id: model.model_id || '',
        description: model.description || '',
        capabilities: model.capabilities || [],
        pricing_input: model.pricing_input || 0,
        pricing_output: model.pricing_output || 0,
        max_tokens: model.max_tokens || 4096,
        context_window: model.context_window || 128000,
        is_active: model.is_active ?? true,
        is_default: model.is_default ?? false,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        provider: 'openai',
        model_id: '',
        description: '',
        capabilities: [],
        pricing_input: 0,
        pricing_output: 0,
        max_tokens: 4096,
        context_window: 128000,
        is_active: true,
        is_default: false,
      });
    }
  }, [model]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-sm">
            {model ? 'Edit AI Model' : 'Add AI Model'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => setFormData({ ...formData, provider: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="openai" className="text-xs">OpenAI</SelectItem>
                  <SelectItem value="anthropic" className="text-xs">Anthropic</SelectItem>
                  <SelectItem value="google" className="text-xs">Google</SelectItem>
                  <SelectItem value="together" className="text-xs">Together.ai</SelectItem>
                  <SelectItem value="groq" className="text-xs">Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Model ID</Label>
              <Input
                value={formData.model_id}
                onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                placeholder="gpt-4o"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-xs"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Input Price (€/1K)</Label>
              <Input
                type="number"
                step="0.000001"
                value={formData.pricing_input}
                onChange={(e) => setFormData({ ...formData, pricing_input: parseFloat(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Output Price (€/1K)</Label>
              <Input
                type="number"
                step="0.000001"
                value={formData.pricing_output}
                onChange={(e) => setFormData({ ...formData, pricing_output: parseFloat(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Context Window</Label>
              <Input
                type="number"
                value={formData.context_window}
                onChange={(e) => setFormData({ ...formData, context_window: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label className="text-zinc-400 text-xs">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_default}
                onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
              />
              <Label className="text-zinc-400 text-xs">Default Model</Label>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 h-7 text-xs">
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs">
              {model ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Prompt Modal Component
function PromptModal({ open, onClose, prompt, models, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'email',
    description: '',
    system_prompt: '',
    user_prompt_template: '',
    variables: [],
    model_id: null,
    temperature: 0.7,
    max_tokens: 1024,
    is_active: true,
  });

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name || '',
        slug: prompt.slug || '',
        category: prompt.category || 'email',
        description: prompt.description || '',
        system_prompt: prompt.system_prompt || '',
        user_prompt_template: prompt.user_prompt_template || '',
        variables: prompt.variables || [],
        model_id: prompt.model_id || null,
        temperature: prompt.temperature || 0.7,
        max_tokens: prompt.max_tokens || 1024,
        is_active: prompt.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        category: 'email',
        description: '',
        system_prompt: '',
        user_prompt_template: '',
        variables: [],
        model_id: null,
        temperature: 0.7,
        max_tokens: 1024,
        is_active: true,
      });
    }
  }, [prompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-sm">
            {prompt ? 'Edit Prompt' : 'Create Prompt'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="email" className="text-xs">Email</SelectItem>
                  <SelectItem value="summary" className="text-xs">Summary</SelectItem>
                  <SelectItem value="extraction" className="text-xs">Extraction</SelectItem>
                  <SelectItem value="creative" className="text-xs">Creative</SelectItem>
                  <SelectItem value="analysis" className="text-xs">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Model (optional)</Label>
              <Select
                value={formData.model_id || 'default'}
                onValueChange={(v) => setFormData({ ...formData, model_id: v === 'default' ? null : v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue placeholder="Use default" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="default" className="text-xs">Use Default</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700 h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">System Prompt</Label>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-xs"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">User Prompt Template</Label>
            <Textarea
              value={formData.user_prompt_template}
              onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-xs"
              rows={3}
              placeholder="Use {{variable}} for dynamic content"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Temperature (0-1)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
            <Label className="text-zinc-400 text-xs">Active</Label>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 h-7 text-xs">
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs">
              {prompt ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Workflow Modal Component
function WorkflowModal({ open, onClose, workflow, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    trigger_type: 'manual',
    trigger_config: {},
    actions: [],
    is_active: true,
  });

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        slug: workflow.slug || '',
        description: workflow.description || '',
        trigger_type: workflow.trigger_type || 'manual',
        trigger_config: workflow.trigger_config || {},
        actions: workflow.actions || [],
        is_active: workflow.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        trigger_type: 'manual',
        trigger_config: {},
        actions: [],
        is_active: true,
      });
    }
  }, [workflow]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-sm">
            {workflow ? 'Edit Workflow' : 'Create Workflow'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-400 text-xs">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-xs"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Trigger Type</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                <SelectItem value="webhook" className="text-xs">Webhook</SelectItem>
                <SelectItem value="schedule" className="text-xs">Schedule</SelectItem>
                <SelectItem value="event" className="text-xs">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
            <Label className="text-zinc-400 text-xs">Active</Label>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 h-7 text-xs">
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white h-7 text-xs">
              {workflow ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Runs Modal Component
function RunsModal({ open, onClose, workflow, runs }) {
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      running: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-zinc-500/20 text-zinc-400',
    };
    return styles[status] || styles.pending;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[80vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-sm">
            Run History: {workflow?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <Badge className={cn("text-[10px] px-1.5 py-px", getStatusBadge(run.status))}>
                  {run.status}
                </Badge>
                <span className="text-[10px] text-zinc-500">
                  {format(new Date(run.started_at), 'MMM d, HH:mm:ss')}
                </span>
              </div>
              {run.error_message && (
                <p className="text-[10px] text-red-400 mt-1.5">{run.error_message}</p>
              )}
              {run.completed_at && (
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Duration: {Math.round((new Date(run.completed_at) - new Date(run.started_at)) / 1000)}s
                </p>
              )}
            </div>
          ))}
          {runs.length === 0 && (
            <p className="text-center text-zinc-500 py-6 text-xs">No runs yet</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
