/**
 * Growth Research Workspace
 * Campaign-aware prospect research with AI-powered columns
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Download,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  Building2,
  MapPin,
  Briefcase,
  BarChart3,
  PieChart,
  TrendingUp,
  Loader2,
  Check,
  X,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  Zap,
  Database,
  Globe,
  Calculator,
  GitMerge,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  Columns,
  LayoutGrid,
  List,
  Lightbulb,
  Brain,
  Star,
  Flame,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hash,
  Type,
  Link2,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

// Column type icons
const COLUMN_TYPE_ICONS = {
  field: Type,
  enrichment: Database,
  ai: Brain,
  formula: Calculator,
  waterfall: GitMerge,
  http_api: Globe,
  merge: GitMerge,
  fit_score: Star,
};

// Column type colors
const COLUMN_TYPE_COLORS = {
  field: 'text-zinc-400',
  enrichment: 'text-blue-400',
  ai: 'text-purple-400',
  formula: 'text-amber-400',
  waterfall: 'text-cyan-400',
  http_api: 'text-green-400',
  merge: 'text-pink-400',
  fit_score: 'text-yellow-400',
};

// AI Models
const AI_MODELS = [
  { id: 'moonshotai/Kimi-K2-Instruct', name: 'Kimi K2', description: 'Best for complex analysis', recommended: true },
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B', description: 'Fast and reliable' },
  { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', description: 'Great for research' },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'Strong reasoning' },
];

// Fit score badge component
function FitScoreBadge({ score }) {
  if (score === null || score === undefined) return null;

  let color = 'bg-red-500/20 text-red-400 border-red-500/30';
  let icon = AlertCircle;

  if (score >= 80) {
    color = 'bg-green-500/20 text-green-400 border-green-500/30';
    icon = Flame;
  } else if (score >= 50) {
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    icon = Star;
  }

  const Icon = icon;

  return (
    <Badge className={`${color} font-mono`}>
      <Icon className="w-3 h-3 mr-1" />
      {score}
    </Badge>
  );
}

// Cell renderer component
function CellRenderer({ cell, column, isSelected, isEditing, onEdit, onSave, onCancel, editValue, setEditValue }) {
  const cellRef = useRef(null);

  if (isEditing) {
    return (
      <input
        ref={cellRef}
        autoFocus
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onSave}
        className="w-full h-full bg-zinc-800 border-0 outline-none text-white px-2 py-1 text-sm"
      />
    );
  }

  // Handle different cell states
  if (cell?.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-zinc-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (cell?.status === 'error') {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <AlertCircle className="w-3 h-3" />
        <span className="text-xs truncate">{cell.error || 'Error'}</span>
      </div>
    );
  }

  // Special rendering for fit_score column
  if (column?.type === 'fit_score') {
    return <FitScoreBadge score={cell?.value} />;
  }

  // Default rendering
  const value = cell?.value || '';

  return (
    <div
      className="truncate cursor-text"
      onDoubleClick={onEdit}
      title={value}
    >
      {value || <span className="text-zinc-600">—</span>}
    </div>
  );
}

// Column header component
function ColumnHeader({ column, onMenuClick, onSort }) {
  const Icon = COLUMN_TYPE_ICONS[column.type] || Type;
  const iconColor = COLUMN_TYPE_COLORS[column.type] || 'text-zinc-400';

  return (
    <div className="flex items-center justify-between gap-2 group">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
        <span className="truncate font-medium">{column.name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
          <DropdownMenuItem onClick={() => onSort('asc')}>
            <SortAsc className="w-4 h-4 mr-2" />
            Sort A-Z
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSort('desc')}>
            <SortDesc className="w-4 h-4 mr-2" />
            Sort Z-A
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Column
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {column.type === 'ai' && (
            <>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem className="text-purple-400">
                <Play className="w-4 h-4 mr-2" />
                Run for All Rows
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem>
            <EyeOff className="w-4 h-4 mr-2" />
            Hide Column
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-400">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Campaign context sidebar
function CampaignContextSidebar({ campaign, isOpen, onToggle, onAddAIColumn, onFindBestFits }) {
  if (!campaign) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="flex-shrink-0 border-l border-zinc-800 overflow-hidden"
        >
          <div className="w-80 h-full overflow-y-auto p-4 space-y-4">
            {/* Campaign Summary */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-white">Campaign Context</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-500">Campaign</p>
                  <p className="text-white">{campaign.name}</p>
                </div>
                {campaign.product && (
                  <div>
                    <p className="text-zinc-500">Product</p>
                    <p className="text-white">{campaign.product.name}</p>
                  </div>
                )}
                {campaign.role_context?.icp_summary && (
                  <div>
                    <p className="text-zinc-500">Target ICP</p>
                    <p className="text-zinc-300 text-xs">{campaign.role_context.icp_summary}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Correlation Hints */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-purple-300">What to Look For</h3>
              </div>
              <div className="space-y-2 text-sm text-purple-200">
                {campaign.correlations?.length > 0 ? (
                  campaign.correlations.map((correlation, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                      <p>{correlation}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                      <p>Companies mentioning "scaling challenges"</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                      <p>Recent funding or growth signals</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                      <p>Tech stack compatibility indicators</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-400 px-1">Quick Actions</h3>
              <Button
                onClick={onAddAIColumn}
                variant="outline"
                className="w-full justify-start border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                <Brain className="w-4 h-4 mr-2" />
                Add AI Research Column
              </Button>
              <Button
                onClick={onFindBestFits}
                variant="outline"
                className="w-full justify-start border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Zap className="w-4 h-4 mr-2" />
                Find Best Fits
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Hot Leads
              </Button>
            </div>

            {/* AI Prompt Suggestions */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">Suggested Prompts</h3>
              </div>
              <div className="space-y-2">
                {[
                  `Analyze if {company} would benefit from ${campaign.product?.name || 'our solution'}`,
                  'Find pain points and challenges from {company} recent news',
                  'Score 1-10 how well {company} fits our target market',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onAddAIColumn(prompt)}
                    className="w-full text-left text-xs p-2 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Add AI Column Modal
function AddAIColumnModal({ isOpen, onClose, onAdd, campaign, columns, prefilledPrompt }) {
  const [name, setName] = useState('AI Analysis');
  const [prompt, setPrompt] = useState(prefilledPrompt || '');
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (prefilledPrompt) {
      setPrompt(prefilledPrompt);
    }
  }, [prefilledPrompt]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    // Simulate test run
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTestResult({
      success: true,
      output: 'Based on analysis, this company shows strong product-market fit indicators...',
    });
    setTesting(false);
  };

  const handleAdd = () => {
    onAdd({
      name,
      type: 'ai',
      config: {
        prompt,
        model,
      },
    });
    onClose();
    setName('AI Analysis');
    setPrompt('');
    setTestResult(null);
  };

  // Available variables from existing columns
  const variables = columns
    .filter(c => c.type === 'field')
    .map(c => ({ name: c.name, key: c.key || c.name.toLowerCase().replace(/\s+/g, '_') }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Add AI Research Column
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create an AI-powered column to research and analyze prospects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Column Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Column Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Fit Analysis"
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* AI Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">AI Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {m.recommended && (
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write your research prompt. Use {column_name} to reference data..."
              className="bg-zinc-800 border-zinc-700 min-h-[120px]"
            />
            <p className="text-xs text-zinc-500">
              Use variables like {'{company}'}, {'{website}'}, {'{industry}'} to include row data
            </p>
          </div>

          {/* Variable Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Available Variables</label>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setPrompt(prev => prev + `{${v.key}}`)}
                  className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {`{${v.key}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign-aware suggestions */}
          {campaign && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-purple-300 mb-2">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Campaign-aware suggestions:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  `Analyze fit for ${campaign.product?.name || 'our product'}`,
                  'Find buying signals and pain points',
                  'Score ICP match 1-10 with reasoning',
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(suggestion + '\n\nCompany: {company}\nWebsite: {website}')}
                    className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg border ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <p className="text-sm font-medium text-white mb-1">Test Result</p>
              <p className="text-xs text-zinc-300">{testResult.output}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!prompt || testing}
            className="border-zinc-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test on First Row
              </>
            )}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!name || !prompt}
            className="bg-purple-600 hover:bg-purple-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Insights View Component
function InsightsView({ rows, columns, campaign }) {
  // Calculate statistics
  const stats = useMemo(() => {
    const fitScoreColumn = columns.find(c => c.type === 'fit_score');
    const fitScores = rows
      .map(r => r.cells?.[fitScoreColumn?.id]?.value)
      .filter(v => v !== null && v !== undefined);

    const hotLeads = fitScores.filter(s => s >= 80).length;
    const warmLeads = fitScores.filter(s => s >= 50 && s < 80).length;
    const coldLeads = fitScores.filter(s => s < 50).length;

    // Industry breakdown
    const industryColumn = columns.find(c => c.name.toLowerCase().includes('industry'));
    const industries = {};
    if (industryColumn) {
      rows.forEach(r => {
        const industry = r.cells?.[industryColumn.id]?.value || 'Unknown';
        industries[industry] = (industries[industry] || 0) + 1;
      });
    }

    return {
      total: rows.length,
      hotLeads,
      warmLeads,
      coldLeads,
      avgScore: fitScores.length > 0
        ? Math.round(fitScores.reduce((a, b) => a + b, 0) / fitScores.length)
        : 0,
      industries: Object.entries(industries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [rows, columns]);

  // Top prospects
  const topProspects = useMemo(() => {
    const fitScoreColumn = columns.find(c => c.type === 'fit_score');
    const companyColumn = columns.find(c => c.name.toLowerCase().includes('company'));

    return rows
      .map(r => ({
        id: r.id,
        company: r.cells?.[companyColumn?.id]?.value || 'Unknown',
        score: r.cells?.[fitScoreColumn?.id]?.value || 0,
      }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [rows, columns]);

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-zinc-400">Total Prospects</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400">Hot Leads</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.hotLeads}</p>
        </div>

        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-yellow-400">Warm Leads</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.warmLeads}</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-zinc-400">Avg Fit Score</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgScore}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Prospects */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Top Prospects
          </h3>
          <div className="space-y-2">
            {topProspects.length > 0 ? (
              topProspects.map((prospect, i) => (
                <div
                  key={prospect.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-sm w-6">{i + 1}.</span>
                    <span className="text-white">{prospect.company}</span>
                  </div>
                  <FitScoreBadge score={prospect.score} />
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm">
                Add a Fit Score column to see top prospects
              </p>
            )}
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            Industry Breakdown
          </h3>
          <div className="space-y-3">
            {stats.industries.length > 0 ? (
              stats.industries.map(([industry, count]) => (
                <div key={industry}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-300">{industry}</span>
                    <span className="text-zinc-500">{count} ({Math.round(count / stats.total * 100)}%)</span>
                  </div>
                  <Progress
                    value={(count / stats.total) * 100}
                    className="h-2"
                  />
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm">
                No industry data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ready for Outreach */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Ready for Outreach</h3>
            <p className="text-zinc-400">
              {stats.hotLeads + stats.warmLeads} prospects scored 50+ are ready for your campaign
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-500">
            <Send className="w-4 h-4 mr-2" />
            Start Outreach
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function GrowthResearchWorkspace() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();

  // State
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('research');
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load workspace data
  useEffect(() => {
    async function loadWorkspace() {
      if (!workspaceId) return;

      try {
        setLoading(true);

        // Load workspace
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('enrich_workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        if (workspaceError) throw workspaceError;
        setWorkspace(workspaceData);

        // Load campaign if linked
        if (workspaceData?.campaign_id) {
          const { data: campaignData } = await supabase
            .from('growth_campaigns')
            .select('*')
            .eq('id', workspaceData.campaign_id)
            .single();

          if (campaignData) {
            setCampaign(campaignData);
          }
        }

        // Load columns
        const { data: columnsData, error: columnsError } = await supabase
          .from('enrich_columns')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('order_index');

        if (columnsError) throw columnsError;
        setColumns(columnsData || []);

        // Load rows with cells
        const { data: rowsData, error: rowsError } = await supabase
          .from('enrich_rows')
          .select(`
            *,
            enrich_cells (*)
          `)
          .eq('workspace_id', workspaceId)
          .order('order_index')
          .limit(500);

        if (rowsError) throw rowsError;

        // Transform rows to include cells as a map
        const transformedRows = (rowsData || []).map(row => ({
          ...row,
          cells: (row.enrich_cells || []).reduce((acc, cell) => {
            acc[cell.column_id] = cell;
            return acc;
          }, {}),
        }));

        setRows(transformedRows);
      } catch (error) {
        console.error('Error loading workspace:', error);
        toast({
          title: 'Error',
          description: 'Failed to load workspace data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [workspaceId, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Cmd/Ctrl + N: New column
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddColumnModal(true);
      }
      // Cmd/Ctrl + E: Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      // Escape: Clear selection
      if (e.key === 'Escape') {
        setSelectedCells(new Set());
        setEditingCell(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add column handler
  const handleAddColumn = async (columnData) => {
    try {
      const newColumn = {
        workspace_id: workspaceId,
        name: columnData.name,
        type: columnData.type,
        config: columnData.config || {},
        order_index: columns.length,
      };

      const { data, error } = await supabase
        .from('enrich_columns')
        .insert(newColumn)
        .select()
        .single();

      if (error) throw error;

      setColumns([...columns, data]);
      toast({
        title: 'Column Added',
        description: `"${columnData.name}" column has been created.`,
      });

      // If it's an AI column, offer to run it
      if (columnData.type === 'ai') {
        toast({
          title: 'AI Column Ready',
          description: 'Click "Run for All Rows" in the column menu to analyze prospects.',
        });
      }
    } catch (error) {
      console.error('Error adding column:', error);
      toast({
        title: 'Error',
        description: 'Failed to add column.',
        variant: 'destructive',
      });
    }
  };

  // Export handler
  const handleExport = () => {
    // Build CSV
    const headers = columns.map(c => c.name).join(',');
    const csvRows = rows.map(row =>
      columns.map(col => {
        const value = row.cells?.[col.id]?.value || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    );

    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace?.name || 'research'}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${rows.length} rows to CSV.`,
    });
  };

  // Handle opening AI column modal with prefilled prompt
  const handleAddAIColumn = (prompt) => {
    if (typeof prompt === 'string') {
      setPrefilledPrompt(prompt);
    } else {
      setPrefilledPrompt('');
    }
    setShowAddColumnModal(true);
  };

  // Find best fits handler
  const handleFindBestFits = async () => {
    // Check if fit score column exists
    const hasFitScore = columns.some(c => c.type === 'fit_score');

    if (!hasFitScore) {
      // Add fit score column
      await handleAddColumn({
        name: 'Fit Score',
        type: 'fit_score',
        config: {
          campaign_id: campaign?.id,
        },
      });
    }

    toast({
      title: 'Calculating Fit Scores',
      description: 'Analyzing prospects based on campaign criteria...',
    });

    // TODO: Trigger fit score calculation
  };

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;

    const query = searchQuery.toLowerCase();
    return rows.filter(row => {
      return Object.values(row.cells || {}).some(cell =>
        String(cell.value || '').toLowerCase().includes(query)
      );
    });
  }, [rows, searchQuery]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Not found state
  if (!workspace) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Workspace Not Found</h2>
        <p className="text-zinc-400 mb-6">This workspace doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate('/growth/dashboard')} className="bg-cyan-600 hover:bg-cyan-500">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-black flex flex-col">
        {/* Top Bar */}
        <div className="flex-shrink-0 h-14 border-b border-zinc-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/growth/dashboard')}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-white">
                {workspace.name}
              </h1>
              {campaign && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  <Target className="w-3 h-3 mr-1" />
                  {campaign.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prospects..."
                className="pl-9 w-64 bg-zinc-900 border-zinc-800 h-9"
              />
            </div>

            {/* View Toggle */}
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="bg-zinc-900 h-9">
                <TabsTrigger value="research" className="text-sm">
                  <LayoutGrid className="w-4 h-4 mr-1.5" />
                  Research
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-sm">
                  <BarChart3 className="w-4 h-4 mr-1.5" />
                  Insights
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Actions */}
            <Button
              onClick={() => handleAddAIColumn()}
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button>

            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-zinc-700 h-9"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>

            {/* Sidebar Toggle */}
            {campaign && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Spreadsheet / Insights */}
          <div className="flex-1 overflow-auto">
            {viewMode === 'research' ? (
              <div className="min-w-max">
                {/* Spreadsheet Table */}
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-zinc-900">
                    <tr>
                      {/* Row number column */}
                      <th className="w-12 px-3 py-2 text-left text-xs font-medium text-zinc-500 border-b border-r border-zinc-800">
                        #
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column.id}
                          className="px-3 py-2 text-left text-xs font-medium text-zinc-300 border-b border-r border-zinc-800 min-w-[180px] max-w-[300px]"
                        >
                          <ColumnHeader
                            column={column}
                            onSort={(dir) => {
                              const sorted = [...rows].sort((a, b) => {
                                const aVal = a.cells?.[column.id]?.value || '';
                                const bVal = b.cells?.[column.id]?.value || '';
                                return dir === 'asc'
                                  ? String(aVal).localeCompare(String(bVal))
                                  : String(bVal).localeCompare(String(aVal));
                              });
                              setRows(sorted);
                            }}
                          />
                        </th>
                      ))}
                      {/* Add column button */}
                      <th className="w-12 px-3 py-2 border-b border-zinc-800">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setShowAddColumnModal(true)}
                              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Add Column (Cmd+N)</TooltipContent>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className="group hover:bg-zinc-900/50"
                      >
                        {/* Row number */}
                        <td className="px-3 py-2 text-xs text-zinc-600 border-b border-r border-zinc-800/50">
                          {rowIndex + 1}
                        </td>
                        {columns.map((column) => {
                          const cellKey = `${row.id}-${column.id}`;
                          const isSelected = selectedCells.has(cellKey);
                          const isEditing = editingCell === cellKey;
                          const cell = row.cells?.[column.id];

                          return (
                            <td
                              key={column.id}
                              className={`px-3 py-2 text-sm text-zinc-300 border-b border-r border-zinc-800/50 ${
                                isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''
                              }`}
                              onClick={() => {
                                const newSelected = new Set(selectedCells);
                                if (selectedCells.has(cellKey)) {
                                  newSelected.delete(cellKey);
                                } else {
                                  newSelected.add(cellKey);
                                }
                                setSelectedCells(newSelected);
                              }}
                            >
                              <CellRenderer
                                cell={cell}
                                column={column}
                                isSelected={isSelected}
                                isEditing={isEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onEdit={() => {
                                  setEditingCell(cellKey);
                                  setEditValue(cell?.value || '');
                                }}
                                onSave={() => {
                                  // TODO: Save cell value
                                  setEditingCell(null);
                                }}
                                onCancel={() => {
                                  setEditingCell(null);
                                  setEditValue('');
                                }}
                              />
                            </td>
                          );
                        })}
                        <td className="border-b border-zinc-800/50" />
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Empty state */}
                {rows.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Database className="w-12 h-12 text-zinc-600 mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">No Data Yet</h2>
                    <p className="text-zinc-400 mb-6 max-w-md">
                      This workspace is empty. Import prospects from nests or add them manually.
                    </p>
                  </div>
                )}

                {/* Search no results */}
                {rows.length > 0 && filteredRows.length === 0 && searchQuery && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Search className="w-12 h-12 text-zinc-600 mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">No Results Found</h2>
                    <p className="text-zinc-400">
                      No prospects match "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <InsightsView rows={rows} columns={columns} campaign={campaign} />
            )}
          </div>

          {/* Campaign Context Sidebar */}
          <CampaignContextSidebar
            campaign={campaign}
            isOpen={sidebarOpen && !!campaign}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onAddAIColumn={handleAddAIColumn}
            onFindBestFits={handleFindBestFits}
          />
        </div>

        {/* Add Column Modal */}
        <AddAIColumnModal
          isOpen={showAddColumnModal}
          onClose={() => {
            setShowAddColumnModal(false);
            setPrefilledPrompt('');
          }}
          onAdd={handleAddColumn}
          campaign={campaign}
          columns={columns}
          prefilledPrompt={prefilledPrompt}
        />
      </div>
    </TooltipProvider>
  );
}
