import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Bell, Filter, ExternalLink, Plus, Check, AlertTriangle, Zap, TrendingUp,
  Building2, Users, DollarSign, Briefcase, Cpu, ChevronRight, Sparkles,
  Clock, Eye, EyeOff, ArrowRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';

const SIGNAL_CONFIG = {
  hiring: { 
    icon: Users, 
    emoji: '👥', 
    label: 'Hiring', 
    color: 'from-indigo-500/60 to-indigo-600/60',
    bgColor: 'bg-indigo-500/15',
    textColor: 'text-indigo-400/70',
    borderColor: 'border-indigo-500/25',
    priority: 'medium' 
  },
  funding: { 
    icon: DollarSign, 
    emoji: '💰', 
    label: 'Funding', 
    color: 'from-indigo-500/80 to-indigo-600/80',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400/80',
    borderColor: 'border-indigo-500/30',
    priority: 'high' 
  },
  expansion: { 
    icon: TrendingUp, 
    emoji: '📈', 
    label: 'Expansion', 
    color: 'from-indigo-500/75 to-indigo-600/75',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400/75',
    borderColor: 'border-indigo-500/30',
    priority: 'high' 
  },
  leadership_change: { 
    icon: Briefcase, 
    emoji: '👔', 
    label: 'Leadership', 
    color: 'from-indigo-500/65 to-indigo-600/65',
    bgColor: 'bg-indigo-500/15',
    textColor: 'text-indigo-400/70',
    borderColor: 'border-indigo-500/25',
    priority: 'medium' 
  },
  compliance_trigger: { 
    icon: AlertTriangle, 
    emoji: '⚠️', 
    label: 'Compliance', 
    color: 'from-indigo-500/70 to-indigo-600/70',
    bgColor: 'bg-indigo-500/20',
    textColor: 'text-indigo-400/75',
    borderColor: 'border-indigo-500/30',
    priority: 'high' 
  },
  tech_adoption: { 
    icon: Cpu, 
    emoji: '💻', 
    label: 'Tech Adoption', 
    color: 'from-indigo-500/55 to-indigo-600/55',
    bgColor: 'bg-indigo-500/15',
    textColor: 'text-indigo-400/65',
    borderColor: 'border-indigo-500/20',
    priority: 'low' 
  }
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'bg-indigo-500/20 text-indigo-400/80 border-indigo-500/30', dotColor: 'bg-indigo-500' },
  medium: { label: 'Medium', color: 'bg-indigo-500/15 text-indigo-400/70 border-indigo-500/25', dotColor: 'bg-indigo-500/70' },
  low: { label: 'Low', color: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50', dotColor: 'bg-zinc-600' }
};

function SignalCard({ signal, onAction, onDismiss, index }) {
  const config = SIGNAL_CONFIG[signal.signal_type] || { 
    icon: Bell, emoji: '📌', label: signal.signal_type,
    color: 'from-zinc-500 to-zinc-600', bgColor: 'bg-zinc-500/20',
    textColor: 'text-zinc-400', borderColor: 'border-zinc-500/30', priority: 'low' 
  };
  const Icon = config.icon;

  const getPriority = () => {
    if (signal.relevance_score >= 80) return 'high';
    if (signal.relevance_score >= 50) return 'medium';
    return config.priority;
  };

  const priority = getPriority();
  const priorityConfig = PRIORITY_CONFIG[priority];

  const timeAgo = () => {
    if (!signal.detected_at) return 'Recently';
    const diff = Date.now() - new Date(signal.detected_at).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(signal.detected_at).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.03 }}
      className={`group relative ${signal.is_actioned ? 'opacity-60' : ''}`}
    >
      <div className={`bg-zinc-900/60 backdrop-blur-sm rounded-xl border transition-all duration-200 ${
        !signal.is_read 
          ? 'border-indigo-500/30 shadow-md shadow-indigo-500/5' 
          : 'border-zinc-800/60 hover:border-zinc-700/60'
      }`}>
        {/* Unread indicator */}
        {!signal.is_read && (
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-xl" />
        )}

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 relative`}>
              <Icon className={`w-7 h-7 ${config.textColor}`} />
              {/* Priority dot */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${priorityConfig.dotColor} ring-2 ring-zinc-900`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${config.bgColor} ${config.textColor} ${config.borderColor} border text-xs`}>
                      {config.emoji} {config.label}
                    </Badge>
                    <Badge className={`${priorityConfig.color} border text-xs`}>
                      {priorityConfig.label}
                    </Badge>
                    {!signal.is_read && (
                      <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border text-xs animate-pulse">
                        NEW
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    {signal.company_name}
                  </h3>
                  
                  <p className="text-zinc-300 mt-2">{signal.headline}</p>
                  
                  {signal.description && (
                    <p className="text-zinc-500 text-sm mt-2 line-clamp-2">{signal.description}</p>
                  )}
                </div>

                {/* Score */}
                {signal.relevance_score && (
                  <div className="flex-shrink-0 text-center">
                    <div className={`w-14 h-14 rounded-xl ${signal.relevance_score >= 80 ? 'bg-emerald-500/20' : signal.relevance_score >= 50 ? 'bg-amber-500/20' : 'bg-zinc-800'} flex items-center justify-center`}>
                      <span className={`text-xl font-bold ${signal.relevance_score >= 80 ? 'text-emerald-400' : signal.relevance_score >= 50 ? 'text-amber-400' : 'text-zinc-400'}`}>
                        {signal.relevance_score}
                      </span>
                    </div>
                    <p className="text-zinc-600 text-[10px] mt-1">Match Score</p>
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                {signal.company_domain && (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {signal.company_domain}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo()}
                </span>
              </div>

              {/* Actions */}
              {!signal.is_actioned ? (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-800/50">
                  <Button 
                    size="sm" 
                    onClick={() => onAction(signal)} 
                    className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Opportunity
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onDismiss(signal)} 
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
                  >
                    <EyeOff className="w-4 h-4 mr-1.5" />
                    Dismiss
                  </Button>
                  {signal.source_url && (
                    <a 
                      href={signal.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-auto text-zinc-500 hover:text-indigo-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                  <Check className="w-4 h-4 text-indigo-400/70" />
                  <span className="text-indigo-400/70 text-sm">Opportunity created</span>
                  <Link
                    to={createPageUrl('GrowthPipeline')}
                    className="ml-auto text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                  >
                    View in Pipeline
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function GrowthSignals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('unread');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSignals = async () => {
      try {
        const sigs = await db.entities.GrowthSignal.list({ limit: 100 }).catch(() => []);
        if (isMounted) setSignals(sigs || []);
      } catch (error) {
        console.error('Failed to load:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSignals();
    return () => { isMounted = false; };
  }, []);

  const handleCreateOpportunity = async (signal) => {
    try {
      // Create Prospect entity (synced with CRM and GrowthPipeline)
      await db.entities.Prospect.create({
        company_name: signal.company_name,
        source: `Signal: ${signal.signal_type}`,
        notes: `${signal.headline}\n\n${signal.description || ''}\n\nSource: ${signal.source_url || 'N/A'}`,
        stage: 'new'
      });
      await db.entities.GrowthSignal.update(signal.id, { is_actioned: true, is_read: true });
      setSignals(sigs => sigs.map(s => s.id === signal.id ? { ...s, is_actioned: true, is_read: true } : s));
      toast.success('Opportunity created from signal');
    } catch (error) {
      console.error('Failed:', error);
      toast.error('Failed to create opportunity');
    }
  };

  const handleDismiss = async (signal) => {
    try {
      await db.entities.GrowthSignal.update(signal.id, { is_read: true });
      setSignals(sigs => sigs.map(s => s.id === signal.id ? { ...s, is_read: true } : s));
      toast.success('Signal dismissed');
    } catch (error) {
      console.error('Failed:', error);
      toast.error('Failed to dismiss signal');
    }
  };

  const getSignalPriority = (signal) => {
    if (signal.relevance_score >= 80) return 'high';
    if (signal.relevance_score >= 50) return 'medium';
    return SIGNAL_CONFIG[signal.signal_type]?.priority || 'low';
  };

  // Stats calculation
  const stats = useMemo(() => {
    const unread = signals.filter(s => !s.is_read).length;
    const highPriority = signals.filter(s => getSignalPriority(s) === 'high' && !s.is_read).length;
    const actioned = signals.filter(s => s.is_actioned).length;
    const avgScore = signals.length > 0 
      ? Math.round(signals.reduce((sum, s) => sum + (s.relevance_score || 0), 0) / signals.length)
      : 0;
    return { unread, highPriority, actioned, avgScore, total: signals.length };
  }, [signals]);

  // Filter signals
  const filteredSignals = useMemo(() => {
    let result = signals;
    
    // Tab filter
    if (activeTab === 'unread') result = result.filter(s => !s.is_read);
    if (activeTab === 'actioned') result = result.filter(s => s.is_actioned);
    
    // Type filter
    if (typeFilter !== 'all') result = result.filter(s => s.signal_type === typeFilter);
    
    // Priority filter
    if (priorityFilter !== 'all') result = result.filter(s => getSignalPriority(s) === priorityFilter);
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.company_name?.toLowerCase().includes(term) ||
        s.headline?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [signals, activeTab, typeFilter, priorityFilter, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48 bg-zinc-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={Bell}
          title="Growth Signals"
          subtitle={`${stats.unread} new signals · ${stats.highPriority} high priority`}
          color="indigo"
          badge={stats.unread > 0 ? (
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border animate-pulse">
              {stats.unread} New
            </Badge>
          ) : null}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Total Signals</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">High Priority</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.highPriority}</p>
                <p className="text-xs text-indigo-400/70 mt-0.5">Requires attention</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-indigo-400/70" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Actioned</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.actioned}</p>
                <p className="text-xs text-indigo-400/70 mt-0.5">Opportunities created</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Check className="w-6 h-6 text-indigo-400/60" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-sm">Avg Match Score</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.avgScore}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1 rounded-xl">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 rounded-lg px-4"
              >
                All ({signals.length})
              </TabsTrigger>
              <TabsTrigger 
                value="unread" 
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 rounded-lg px-4"
              >
                Unread ({stats.unread})
              </TabsTrigger>
              <TabsTrigger 
                value="actioned" 
                className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg px-4"
              >
                Actioned ({stats.actioned})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 bg-zinc-900/80 border-zinc-700 text-white">
                <Filter className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue placeholder="Signal Type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(SIGNAL_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {cfg.emoji} {cfg.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40 bg-zinc-900/80 border-zinc-700 text-white">
                <Zap className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟠 Medium</SelectItem>
                <SelectItem value="low">⚪ Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Input 
                placeholder="Search signals..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-zinc-900/80 border-zinc-700 text-white pl-10"
              />
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Signals List */}
        {filteredSignals.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {activeTab === 'all' && typeFilter === 'all' && priorityFilter === 'all' && !searchTerm
                ? 'No Signals Yet'
                : 'No Matching Signals'
              }
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              {activeTab === 'all' && typeFilter === 'all' && priorityFilter === 'all' && !searchTerm
                ? 'Signals will appear here as we detect growth opportunities and buying triggers from your target accounts.'
                : 'Try adjusting your filters to see more signals.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredSignals.map((signal, i) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onAction={handleCreateOpportunity}
                  onDismiss={handleDismiss}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}