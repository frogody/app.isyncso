/**
 * Growth Customer Signals
 * Monitor existing customers for expansion signals and upsell opportunities
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Settings,
  TrendingUp,
  Activity,
  MessageSquare,
  Globe,
  Building2,
  DollarSign,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Phone,
  FileText,
  Upload,
  Download,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Bell,
  X,
  Eye,
  Briefcase,
  MapPin,
  Link2,
  StickyNote,
  Send,
  Loader2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

// Default signal configuration
const DEFAULT_SIGNAL_CONFIG = {
  growth: {
    enabled: true,
    label: 'Growth Signals',
    icon: TrendingUp,
    color: 'green',
    signals: [
      { id: 'hiring_surge', name: 'Hiring Surge', description: 'Significant increase in job postings', threshold: 20, period: 30, priority: 'high', enabled: true },
      { id: 'funding_round', name: 'Funding Round', description: 'New funding announcement', priority: 'high', enabled: true },
      { id: 'expansion_news', name: 'Expansion News', description: 'Opening new offices or markets', priority: 'medium', enabled: true },
      { id: 'new_office', name: 'New Office', description: 'Physical expansion detected', priority: 'medium', enabled: false },
    ],
  },
  usage: {
    enabled: true,
    label: 'Usage Signals',
    icon: Activity,
    color: 'blue',
    signals: [
      { id: 'login_increase', name: 'Login Frequency Increase', description: 'More active users', threshold: 50, period: 7, priority: 'medium', enabled: true },
      { id: 'feature_adoption', name: 'New Feature Adoption', description: 'Trying new product features', priority: 'medium', enabled: true },
      { id: 'api_spike', name: 'API Calls Spike', description: 'Significant API usage increase', threshold: 100, period: 7, priority: 'high', enabled: false },
    ],
  },
  engagement: {
    enabled: true,
    label: 'Engagement Signals',
    icon: MessageSquare,
    color: 'purple',
    signals: [
      { id: 'renewal_approaching', name: 'Contract Renewal', description: 'Renewal date approaching', daysAhead: 90, priority: 'high', enabled: true },
      { id: 'support_increase', name: 'Support Tickets Increase', description: 'More support requests', threshold: 100, period: 30, priority: 'low', enabled: true },
      { id: 'nps_change', name: 'NPS Score Change', description: 'Significant NPS movement', priority: 'medium', enabled: false },
    ],
  },
  external: {
    enabled: false,
    label: 'External Signals',
    icon: Globe,
    color: 'amber',
    signals: [
      { id: 'news_mention', name: 'News Mentions', description: 'Company in the news', priority: 'low', enabled: true },
      { id: 'tech_change', name: 'Tech Stack Change', description: 'New technology adoption', priority: 'medium', enabled: true },
      { id: 'leadership_change', name: 'Leadership Change', description: 'New C-level executive', priority: 'medium', enabled: false },
    ],
  },
};

// Mock customer data
const MOCK_CUSTOMERS = [
  {
    id: '1',
    name: 'Acme Corp',
    domain: 'acme.com',
    industry: 'Technology',
    plan: 'Enterprise',
    arr: 120000,
    healthScore: 85,
    startDate: '2024-03-15',
    renewalDate: '2025-03-15',
    signals: [
      { id: 's1', type: 'growth', signalId: 'hiring_surge', title: 'Hiring 15 new engineers', detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), priority: 'high' },
      { id: 's2', type: 'growth', signalId: 'funding_round', title: 'Series C funding announced ($50M)', detectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), priority: 'high' },
      { id: 's3', type: 'growth', signalId: 'expansion_news', title: 'Opening new office in Austin', detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), priority: 'medium' },
    ],
    contacts: [
      { name: 'John Smith', title: 'VP of Engineering', email: 'john@acme.com' },
    ],
  },
  {
    id: '2',
    name: 'TechFlow Inc',
    domain: 'techflow.io',
    industry: 'SaaS',
    plan: 'Professional',
    arr: 48000,
    healthScore: 72,
    startDate: '2024-06-01',
    renewalDate: '2025-06-01',
    signals: [
      { id: 's4', type: 'engagement', signalId: 'renewal_approaching', title: 'Contract renewal in 45 days', detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), priority: 'high' },
    ],
    contacts: [
      { name: 'Sarah Chen', title: 'Head of Operations', email: 'sarah@techflow.io' },
    ],
  },
  {
    id: '3',
    name: 'DataPro Systems',
    domain: 'datapro.com',
    industry: 'Data Analytics',
    plan: 'Enterprise',
    arr: 180000,
    healthScore: 91,
    startDate: '2023-11-01',
    renewalDate: '2024-11-01',
    signals: [
      { id: 's5', type: 'usage', signalId: 'login_increase', title: 'Login frequency up 75% this week', detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), priority: 'medium' },
      { id: 's6', type: 'usage', signalId: 'feature_adoption', title: 'Started using advanced analytics', detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), priority: 'medium' },
    ],
    contacts: [
      { name: 'Mike Johnson', title: 'CTO', email: 'mike@datapro.com' },
    ],
  },
  {
    id: '4',
    name: 'CloudFirst',
    domain: 'cloudfirst.co',
    industry: 'Cloud Services',
    plan: 'Starter',
    arr: 12000,
    healthScore: 65,
    startDate: '2024-09-01',
    renewalDate: '2025-09-01',
    signals: [],
    contacts: [
      { name: 'Emily Brown', title: 'Product Manager', email: 'emily@cloudfirst.co' },
    ],
  },
  {
    id: '5',
    name: 'FinanceHub',
    domain: 'financehub.com',
    industry: 'FinTech',
    plan: 'Professional',
    arr: 36000,
    healthScore: 78,
    startDate: '2024-04-15',
    renewalDate: '2025-04-15',
    signals: [
      { id: 's7', type: 'external', signalId: 'news_mention', title: 'Featured in TechCrunch article', detectedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), priority: 'low' },
    ],
    contacts: [
      { name: 'David Lee', title: 'CEO', email: 'david@financehub.com' },
    ],
  },
];

// Signal type styles
const SIGNAL_STYLES = {
  growth: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    icon: TrendingUp,
  },
  usage: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: Activity,
  },
  engagement: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    icon: MessageSquare,
  },
  external: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: Globe,
  },
};

// Priority styles
const PRIORITY_STYLES = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  low: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', dot: 'bg-zinc-400' },
};

// Health score component
function HealthScore({ score }) {
  let color = 'text-red-400';
  let bg = 'bg-red-500/20';

  if (score >= 80) {
    color = 'text-green-400';
    bg = 'bg-green-500/20';
  } else if (score >= 50) {
    color = 'text-yellow-400';
    bg = 'bg-yellow-500/20';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${bg}`}>
      <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      <span className={`text-sm font-medium ${color}`}>{score}</span>
    </div>
  );
}

// Signal badge component
function SignalBadge({ type, count, onClick, expanded }) {
  const style = SIGNAL_STYLES[type];
  const Icon = style.icon;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${style.bg} ${style.text} ${style.border} ${
        expanded ? 'ring-2 ring-offset-2 ring-offset-black ring-indigo-500' : 'hover:opacity-80'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{count}</span>
    </button>
  );
}

// Signal item component
function SignalItem({ signal }) {
  const style = SIGNAL_STYLES[signal.type];
  const priorityStyle = PRIORITY_STYLES[signal.priority];
  const Icon = style.icon;

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border ${style.border}`}>
      <div className={`p-1.5 rounded-lg bg-black/20`}>
        <Icon className={`w-4 h-4 ${style.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{signal.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-500">{timeAgo(signal.detectedAt)}</span>
          <Badge className={`${priorityStyle.bg} ${priorityStyle.text} text-xs px-1.5 py-0`}>
            {signal.priority}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Signal config panel
function SignalConfigPanel({ config, onChange, isOpen, onToggle }) {
  const [editingCategory, setEditingCategory] = useState(null);

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">Signal Configuration</h3>
            <p className="text-sm text-zinc-500">
              {Object.values(config).filter(c => c.enabled).length} of {Object.keys(config).length} categories enabled
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {Object.entries(config).map(([key, category]) => {
                const Icon = category.icon;
                const style = SIGNAL_STYLES[key];

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border ${
                      category.enabled
                        ? `${style.bg} ${style.border}`
                        : 'bg-zinc-800/30 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${category.enabled ? style.text : 'text-zinc-500'}`} />
                        <span className={`font-medium ${category.enabled ? 'text-white' : 'text-zinc-500'}`}>
                          {category.label}
                        </span>
                      </div>
                      <Switch
                        checked={category.enabled}
                        onCheckedChange={(checked) =>
                          onChange({
                            ...config,
                            [key]: { ...category, enabled: checked },
                          })
                        }
                      />
                    </div>

                    {category.enabled && (
                      <div className="space-y-2">
                        {category.signals.map((signal) => (
                          <div
                            key={signal.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/20"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={signal.enabled}
                                onCheckedChange={(checked) => {
                                  const updatedSignals = category.signals.map((s) =>
                                    s.id === signal.id ? { ...s, enabled: checked } : s
                                  );
                                  onChange({
                                    ...config,
                                    [key]: { ...category, signals: updatedSignals },
                                  });
                                }}
                              />
                              <div>
                                <p className="text-sm text-white">{signal.name}</p>
                                <p className="text-xs text-zinc-500">{signal.description}</p>
                              </div>
                            </div>
                            <Badge className={`${PRIORITY_STYLES[signal.priority].bg} ${PRIORITY_STYLES[signal.priority].text} text-xs`}>
                              {signal.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Customer row component
function CustomerRow({ customer, onSelect, onExpand, expandedSignalType, onCreateOpportunity }) {
  const signalsByType = useMemo(() => {
    const grouped = {};
    customer.signals.forEach((signal) => {
      if (!grouped[signal.type]) grouped[signal.type] = [];
      grouped[signal.type].push(signal);
    });
    return grouped;
  }, [customer.signals]);

  const latestSignal = customer.signals[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all">
        {/* Company info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-indigo-400 font-semibold">
            {customer.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{customer.name}</p>
            <p className="text-xs text-zinc-500 truncate">{customer.domain}</p>
          </div>
        </div>

        {/* Industry */}
        <div className="w-32">
          <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
            {customer.industry}
          </Badge>
        </div>

        {/* Plan & ARR */}
        <div className="w-32">
          <p className="text-sm text-white">{customer.plan}</p>
          <p className="text-xs text-zinc-500">${(customer.arr / 1000).toFixed(0)}k ARR</p>
        </div>

        {/* Health Score */}
        <div className="w-24">
          <HealthScore score={customer.healthScore} />
        </div>

        {/* Signals */}
        <div className="flex-1 flex items-center gap-2">
          {Object.entries(signalsByType).map(([type, signals]) => (
            <SignalBadge
              key={type}
              type={type}
              count={signals.length}
              expanded={expandedSignalType === type}
              onClick={(e) => {
                e.stopPropagation();
                onExpand(customer.id, expandedSignalType === type ? null : type);
              }}
            />
          ))}
          {customer.signals.length === 0 && (
            <span className="text-sm text-zinc-600">No signals</span>
          )}
        </div>

        {/* Last Signal */}
        <div className="w-28 text-right">
          {latestSignal ? (
            <p className="text-sm text-zinc-400">
              {Math.floor((Date.now() - new Date(latestSignal.detectedAt).getTime()) / (24 * 60 * 60 * 1000))}d ago
            </p>
          ) : (
            <p className="text-sm text-zinc-600">—</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(customer)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => onSelect(customer)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateOpportunity(customer)}>
                <Target className="w-4 h-4 mr-2" />
                Create Opportunity
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Phone className="w-4 h-4 mr-2" />
                Schedule Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded signals */}
      <AnimatePresence>
        {expandedSignalType && signalsByType[expandedSignalType] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-16 mt-2 mb-4 space-y-2">
              {signalsByType[expandedSignalType].map((signal) => (
                <SignalItem key={signal.id} signal={signal} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Customer detail drawer
function CustomerDrawer({ customer, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [note, setNote] = useState('');

  if (!customer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-2xl text-indigo-400 font-semibold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{customer.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-zinc-800 text-zinc-300">{customer.industry}</Badge>
                    <a
                      href={`https://${customer.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {customer.domain}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-4 bg-zinc-800">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="signals">Signals</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="p-6 space-y-6">
                  {/* Relationship Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-400">Current Relationship</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500">Plan</p>
                        <p className="text-white font-medium">{customer.plan}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500">ARR</p>
                        <p className="text-white font-medium">${customer.arr.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500">Customer Since</p>
                        <p className="text-white font-medium">
                          {new Date(customer.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500">Renewal Date</p>
                        <p className="text-white font-medium">
                          {new Date(customer.renewalDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-400">Health Score</h3>
                    <div className="p-4 rounded-xl bg-zinc-800/50">
                      <div className="flex items-center justify-between mb-3">
                        <HealthScore score={customer.healthScore} />
                        <span className="text-sm text-zinc-500">
                          {customer.healthScore >= 80 ? 'Healthy' : customer.healthScore >= 50 ? 'At Risk' : 'Critical'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Engagement</span>
                          <span className="text-white">85%</span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Support</span>
                          <span className="text-white">72%</span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: '72%' }} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Usage</span>
                          <span className="text-white">91%</span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '91%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-400">Key Contacts</h3>
                    {customer.contacts?.map((contact, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white">{contact.name}</p>
                          <p className="text-sm text-zinc-500">{contact.title}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="signals" className="p-6 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-400">Signal Timeline</h3>
                  {customer.signals.length > 0 ? (
                    <div className="space-y-3">
                      {customer.signals.map((signal) => (
                        <SignalItem key={signal.id} signal={signal} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500">No signals detected yet</p>
                      <p className="text-sm text-zinc-600">Signals are checked daily</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="p-6 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-400">Add Note</h3>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add internal notes about this customer..."
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                    />
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                      <StickyNote className="w-4 h-4 mr-2" />
                      Save Note
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer Actions */}
            <div className="p-6 border-t border-zinc-800 space-y-3">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                <Target className="w-4 h-4 mr-2" />
                Create Expansion Opportunity
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-zinc-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button variant="outline" className="flex-1 border-zinc-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Add customer modal
function AddCustomerModal({ isOpen, onClose, onAdd }) {
  const [activeTab, setActiveTab] = useState('manual');
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: '',
    plan: 'Starter',
    arr: '',
  });

  const handleManualAdd = () => {
    if (!formData.name || !formData.domain) return;

    onAdd({
      ...formData,
      id: Date.now().toString(),
      arr: parseInt(formData.arr) || 0,
      healthScore: 70,
      startDate: new Date().toISOString(),
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      signals: [],
      contacts: [],
    });

    setFormData({ name: '', domain: '', industry: '', plan: 'Starter', arr: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            Add Customers
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Import your customer list to start monitoring for expansion signals
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-zinc-800">
            <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
            <TabsTrigger value="csv" className="flex-1">CSV Upload</TabsTrigger>
            <TabsTrigger value="crm" className="flex-1">CRM Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Company Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corp"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Domain *</label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="acme.com"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Industry</label>
                <Input
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Technology"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Plan</label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Annual Revenue (ARR)</label>
              <Input
                type="number"
                value={formData.arr}
                onChange={(e) => setFormData({ ...formData, arr: e.target.value })}
                placeholder="50000"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <Button onClick={handleManualAdd} className="w-full bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="py-4">
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center">
              <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-white mb-2">Drop your CSV file here</p>
              <p className="text-sm text-zinc-500 mb-4">or click to browse</p>
              <Button variant="outline" className="border-zinc-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="ghost" className="text-indigo-400">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="crm" className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF7A59]/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#FF7A59]" />
                </div>
                <div>
                  <p className="text-white font-medium">HubSpot</p>
                  <p className="text-sm text-zinc-500">Sync customers from HubSpot CRM</p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400">Coming Soon</Badge>
            </div>
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00A1E0]/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#00A1E0]" />
                </div>
                <div>
                  <p className="text-white font-medium">Salesforce</p>
                  <p className="text-sm text-zinc-500">Sync customers from Salesforce</p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400">Coming Soon</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Main component
export default function GrowthCustomerSignals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();

  // State
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [signalConfig, setSignalConfig] = useState(DEFAULT_SIGNAL_CONFIG);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [expandedSignals, setExpandedSignals] = useState({}); // { customerId: signalType }
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    hasSignals: false,
    signalTypes: [],
    healthRange: [0, 100],
  });
  const [sortBy, setSortBy] = useState('signals');

  // Load customers
  useEffect(() => {
    setLoading(true);
    // Simulate loading
    setTimeout(() => {
      setCustomers(MOCK_CUSTOMERS);
      setLoading(false);
    }, 500);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const totalSignals = customers.reduce((sum, c) => sum + c.signals.length, 0);
    const customersWithSignals = customers.filter((c) => c.signals.length > 0).length;
    const highPrioritySignals = customers.reduce(
      (sum, c) => sum + c.signals.filter((s) => s.priority === 'high').length,
      0
    );
    const totalArr = customers.reduce((sum, c) => sum + c.arr, 0);

    return { totalSignals, customersWithSignals, highPrioritySignals, totalArr };
  }, [customers]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.domain.toLowerCase().includes(query) ||
          c.industry.toLowerCase().includes(query)
      );
    }

    // Filter by signals
    if (filters.hasSignals) {
      result = result.filter((c) => c.signals.length > 0);
    }

    // Filter by signal types
    if (filters.signalTypes.length > 0) {
      result = result.filter((c) =>
        c.signals.some((s) => filters.signalTypes.includes(s.type))
      );
    }

    // Filter by health score
    result = result.filter(
      (c) => c.healthScore >= filters.healthRange[0] && c.healthScore <= filters.healthRange[1]
    );

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'signals':
          return b.signals.length - a.signals.length;
        case 'health':
          return b.healthScore - a.healthScore;
        case 'arr':
          return b.arr - a.arr;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [customers, searchQuery, filters, sortBy]);

  // Add customer handler
  const handleAddCustomer = (customer) => {
    setCustomers((prev) => [...prev, customer]);
    toast({
      title: 'Customer Added',
      description: `${customer.name} has been added to monitoring.`,
    });
  };

  // Toggle expanded signals
  const handleExpandSignals = (customerId, signalType) => {
    setExpandedSignals((prev) => ({
      ...prev,
      [customerId]: signalType,
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // Create opportunity from signal
  const handleCreateOpportunity = (customer, signal = null) => {
    sessionStorage.setItem('newOppCustomer', JSON.stringify({
      id: customer.id,
      name: customer.name,
      industry: customer.industry,
      signal: signal?.name || 'Manual opportunity',
    }));
    navigate('/growth/opportunities?action=create');
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-6 lg:px-8 xl:px-12 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <button
            onClick={() => navigate('/growth/dashboard')}
            className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Growth
          </button>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <span className="text-white">Customer Signals</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-indigo-500/20 border border-green-500/30">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Customer Signals</h1>
              <p className="text-zinc-400">Monitor expansion opportunities in your customer base</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-zinc-700"
              onClick={() => navigate('/growth/opportunities')}
            >
              <Target className="w-4 h-4 mr-2" />
              View Opportunities
            </Button>
            <Button variant="outline" className="border-zinc-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Signals
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Customers
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span className="text-sm text-zinc-400">Customers</span>
            </div>
            <p className="text-2xl font-bold text-white">{customers.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-zinc-400">Active Signals</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalSignals}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-red-400" />
              <span className="text-sm text-zinc-400">High Priority</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.highPrioritySignals}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-sm text-zinc-400">Total ARR</span>
            </div>
            <p className="text-2xl font-bold text-white">${(stats.totalArr / 1000).toFixed(0)}k</p>
          </div>
        </div>

        {/* Signal Configuration */}
        <div className="mb-6">
          <SignalConfigPanel
            config={signalConfig}
            onChange={setSignalConfig}
            isOpen={showConfigPanel}
            onToggle={() => setShowConfigPanel(!showConfigPanel)}
          />
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="pl-9 bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hasSignals"
              checked={filters.hasSignals}
              onCheckedChange={(checked) => setFilters({ ...filters, hasSignals: checked })}
            />
            <label htmlFor="hasSignals" className="text-sm text-zinc-400 cursor-pointer">
              Has signals
            </label>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="signals">Most Signals</SelectItem>
              <SelectItem value="health">Health Score</SelectItem>
              <SelectItem value="arr">Highest ARR</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Customer List */}
        {filteredCustomers.length > 0 ? (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onSelect={setSelectedCustomer}
                onExpand={handleExpandSignals}
                expandedSignalType={expandedSignals[customer.id]}
                onCreateOpportunity={handleCreateOpportunity}
              />
            ))}
          </div>
        ) : customers.length === 0 ? (
          /* Empty state - No customers */
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Customers Yet</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Import your customer list to start monitoring for expansion signals and upsell opportunities.
            </p>
            <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Customer
            </Button>
          </div>
        ) : (
          /* Empty state - No results */
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Results Found</h2>
            <p className="text-zinc-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Customer Drawer */}
      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddCustomer}
      />
    </div>
  );
}
