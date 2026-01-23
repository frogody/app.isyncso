/**
 * AdminAI Component
 * AI & Automation management for platform admins
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import AdminSidebar from '@/components/admin/AdminSidebar';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

  useEffect(() => {
    fetchData();
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
    if (cost === null || cost === undefined) return '$0.00';
    return `$${parseFloat(cost).toFixed(4)}`;
  };

  const formatTokens = (tokens) => {
    if (!tokens) return '0';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI & Automation</h1>
                <p className="text-zinc-400">Manage AI models, prompts, and automated workflows</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="border-zinc-700"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Tokens (30d)</p>
                    <p className="text-2xl font-bold text-white">
                      {formatTokens(stats?.total_tokens_30d)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Today: {formatTokens(stats?.total_tokens_today)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Cost (30d)</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCost(stats?.total_cost_30d)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Today: {formatCost(stats?.total_cost_today)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Active Models</p>
                    <p className="text-2xl font-bold text-white">
                      {stats?.active_models || 0}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {stats?.total_models || 0} total configured
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Active Workflows</p>
                    <p className="text-2xl font-bold text-white">
                      {stats?.active_workflows || 0}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {stats?.workflow_runs_today || 0} runs today
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Workflow className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
              <TabsTrigger value="models" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Brain className="w-4 h-4 mr-2" />
                AI Models
              </TabsTrigger>
              <TabsTrigger value="usage" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <BarChart3 className="w-4 h-4 mr-2" />
                Usage Analytics
              </TabsTrigger>
              <TabsTrigger value="prompts" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Sparkles className="w-4 h-4 mr-2" />
                Prompt Library
              </TabsTrigger>
              <TabsTrigger value="workflows" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Workflow className="w-4 h-4 mr-2" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Clock className="w-4 h-4 mr-2" />
                Scheduled Tasks
              </TabsTrigger>
            </TabsList>

            {/* AI Models Tab */}
            <TabsContent value="models">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Configured AI Models</h2>
                <Button
                  onClick={() => { setSelectedItem(null); setShowModelModal(true); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map((model) => (
                  <Card key={model.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            model.provider === 'openai' && "bg-green-500/20",
                            model.provider === 'anthropic' && "bg-orange-500/20",
                            model.provider === 'google' && "bg-blue-500/20"
                          )}>
                            <Brain className={cn(
                              "w-5 h-5",
                              model.provider === 'openai' && "text-green-400",
                              model.provider === 'anthropic' && "text-orange-400",
                              model.provider === 'google' && "text-blue-400"
                            )} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white flex items-center gap-2">
                              {model.name}
                              {model.is_default && (
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              )}
                            </h3>
                            <p className="text-xs text-zinc-500">{model.provider}</p>
                          </div>
                        </div>
                        <Badge className={model.is_active ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}>
                          {model.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{model.description}</p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-zinc-400">
                          <span>Input Price</span>
                          <span className="text-white">${model.pricing_input}/1K</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Output Price</span>
                          <span className="text-white">${model.pricing_output}/1K</span>
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

                      <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-zinc-700"
                          onClick={() => { setSelectedItem(model); setShowModelModal(true); }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
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
              <div className="space-y-6">
                {/* Usage by Model */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Usage by Model (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats?.usage_by_model?.map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-32 text-sm text-zinc-400">{item.name}</div>
                          <div className="flex-1">
                            <div className="h-6 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                                style={{
                                  width: `${Math.min(100, (item.tokens / (stats?.total_tokens_30d || 1)) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-24 text-right text-sm text-white">
                            {formatTokens(item.tokens)}
                          </div>
                          <div className="w-20 text-right text-sm text-green-400">
                            {formatCost(item.cost)}
                          </div>
                        </div>
                      ))}
                      {(!stats?.usage_by_model || stats.usage_by_model.length === 0) && (
                        <p className="text-center text-zinc-500 py-8">No usage data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Usage by Type */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Usage by Request Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stats?.usage_by_type?.map((item, index) => (
                        <div key={index} className="bg-zinc-800/50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-white">{item.requests}</p>
                          <p className="text-sm text-zinc-400">{item.request_type || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500">{formatTokens(item.tokens)} tokens</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Usage Chart Placeholder */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Daily Usage Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end gap-1">
                      {stats?.daily_usage?.slice(-30).map((day, index) => (
                        <div
                          key={index}
                          className="flex-1 bg-purple-500/30 hover:bg-purple-500/50 rounded-t transition-colors"
                          style={{
                            height: `${Math.max(5, (day.tokens / Math.max(...(stats?.daily_usage?.map(d => d.tokens) || [1]))) * 100)}%`
                          }}
                          title={`${day.date}: ${formatTokens(day.tokens)} tokens`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-zinc-500">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Prompt Library Tab */}
            <TabsContent value="prompts">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Prompt Templates</h2>
                <Button
                  onClick={() => { setSelectedItem(null); setShowPromptModal(true); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Prompt
                </Button>
              </div>

              <div className="space-y-4">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-white">{prompt.name}</h3>
                            <Badge className="bg-purple-500/20 text-purple-400">
                              {prompt.category}
                            </Badge>
                            <Badge className={prompt.is_active ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}>
                              {prompt.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{prompt.description}</p>

                          <div className="bg-zinc-800/50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-zinc-500 mb-1">User Prompt Template:</p>
                            <p className="text-sm text-zinc-300 font-mono">{prompt.user_prompt_template}</p>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span>Model: {prompt.model_name || 'Default'}</span>
                            <span>Temp: {prompt.temperature}</span>
                            <span>Max Tokens: {prompt.max_tokens}</span>
                            {prompt.variables?.length > 0 && (
                              <span>Variables: {prompt.variables.join(', ')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700"
                            onClick={() => { setSelectedItem(prompt); setShowPromptModal(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                            onClick={() => handleDeletePrompt(prompt.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {prompts.length === 0 && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-12 text-center">
                      <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-400">No prompts created yet</p>
                      <Button
                        onClick={() => setShowPromptModal(true)}
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Automation Workflows</h2>
                <Button
                  onClick={() => { setSelectedItem(null); setShowWorkflowModal(true); }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </div>

              <div className="space-y-4">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-white">{workflow.name}</h3>
                            <Badge className="bg-blue-500/20 text-blue-400">
                              {workflow.trigger_type}
                            </Badge>
                            <Badge className={workflow.is_active ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}>
                              {workflow.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{workflow.description}</p>

                          <div className="flex items-center gap-6 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              {workflow.total_runs || 0} runs
                            </span>
                            <span className="flex items-center gap-1 text-green-400">
                              <Check className="w-4 h-4" />
                              {workflow.successful_runs || 0} successful
                            </span>
                            <span className="flex items-center gap-1 text-red-400">
                              <X className="w-4 h-4" />
                              {workflow.failed_runs || 0} failed
                            </span>
                            {workflow.last_run_at && (
                              <span>Last run: {formatDistanceToNow(new Date(workflow.last_run_at), { addSuffix: true })}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700"
                            onClick={() => handleViewRuns(workflow)}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            History
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-500/30 text-green-400 hover:bg-green-500/20"
                            onClick={() => handleTriggerWorkflow(workflow.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Run
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700"
                            onClick={() => { setSelectedItem(workflow); setShowWorkflowModal(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {workflows.length === 0 && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-12 text-center">
                      <Workflow className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-400">No workflows created yet</p>
                      <Button
                        onClick={() => setShowWorkflowModal(true)}
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Scheduled Tasks</h2>
              </div>

              <div className="space-y-4">
                {scheduledTasks.map((task) => (
                  <Card key={task.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-white">{task.name}</h3>
                            <Badge className="bg-purple-500/20 text-purple-400">
                              {task.task_type}
                            </Badge>
                            <Badge className={task.is_active ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"}>
                              {task.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-400 mb-3">{task.description}</p>

                          <div className="flex items-center gap-6 text-sm text-zinc-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-4 h-4" />
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

                        <div className="flex items-center gap-4 ml-4">
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
                    <CardContent className="p-12 text-center">
                      <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-400">No scheduled tasks configured</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
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
    </div>
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {model ? 'Edit AI Model' : 'Add AI Model'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div>
              <Label className="text-zinc-400">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => setFormData({ ...formData, provider: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="together">Together.ai</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400">Model ID</Label>
              <Input
                value={formData.model_id}
                onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="gpt-4o"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-zinc-400">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Input Price ($/1K)</Label>
              <Input
                type="number"
                step="0.000001"
                value={formData.pricing_input}
                onChange={(e) => setFormData({ ...formData, pricing_input: parseFloat(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Output Price ($/1K)</Label>
              <Input
                type="number"
                step="0.000001"
                value={formData.pricing_output}
                onChange={(e) => setFormData({ ...formData, pricing_output: parseFloat(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Context Window</Label>
              <Input
                type="number"
                value={formData.context_window}
                onChange={(e) => setFormData({ ...formData, context_window: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label className="text-zinc-400">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_default}
                onCheckedChange={(v) => setFormData({ ...formData, is_default: v })}
              />
              <Label className="text-zinc-400">Default Model</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {prompt ? 'Edit Prompt' : 'Create Prompt'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div>
              <Label className="text-zinc-400">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="extraction">Extraction</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400">Model (optional)</Label>
              <Select
                value={formData.model_id || 'default'}
                onValueChange={(v) => setFormData({ ...formData, model_id: v === 'default' ? null : v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Use default" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="default">Use Default</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-zinc-400">Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <Label className="text-zinc-400">System Prompt</Label>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-sm"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-zinc-400">User Prompt Template</Label>
            <Textarea
              value={formData.user_prompt_template}
              onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
              className="bg-zinc-800 border-zinc-700 font-mono text-sm"
              rows={4}
              placeholder="Use {{variable}} for dynamic content"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Temperature (0-1)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Max Tokens</Label>
              <Input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
            <Label className="text-zinc-400">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {workflow ? 'Edit Workflow' : 'Create Workflow'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-zinc-400">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div>
              <Label className="text-zinc-400">Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-zinc-400">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-zinc-400">Trigger Type</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
            <Label className="text-zinc-400">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Run History: {workflow?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className={getStatusBadge(run.status)}>
                  {run.status}
                </Badge>
                <span className="text-sm text-zinc-500">
                  {format(new Date(run.started_at), 'MMM d, HH:mm:ss')}
                </span>
              </div>
              {run.error_message && (
                <p className="text-sm text-red-400 mt-2">{run.error_message}</p>
              )}
              {run.completed_at && (
                <p className="text-xs text-zinc-500 mt-2">
                  Duration: {Math.round((new Date(run.completed_at) - new Date(run.started_at)) / 1000)}s
                </p>
              )}
            </div>
          ))}
          {runs.length === 0 && (
            <p className="text-center text-zinc-500 py-8">No runs yet</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
