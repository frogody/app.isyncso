/**
 * Growth Dashboard Page
 * Main entry point for the Growth module - Accelerate revenue with intelligent prospecting
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  UserPlus,
  TrendingUp,
  Users,
  Target,
  Calendar,
  Euro,
  Activity,
  ArrowRight,
  ArrowUpRight,
  Zap,
  Bell,
  Mail,
  Phone,
  Sparkles,
  ChevronRight,
  Coins,
  Search,
  BarChart3,
  DollarSign,
  Layers,
  MessageSquare,
  Eye,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';
import { GrowthPageTransition } from '@/components/growth/ui';

function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const ACTIVITY_CONFIG = {
  campaign_sent: { icon: Mail, iconBg: 'bg-indigo-500/15 text-indigo-400', label: 'Campaign' },
  meeting_booked: { icon: Calendar, iconBg: 'bg-emerald-500/15 text-emerald-400', label: 'Meeting' },
  signal_detected: { icon: Zap, iconBg: 'bg-amber-500/15 text-amber-400', label: 'Signal' },
  prospect_replied: { icon: Bell, iconBg: 'bg-indigo-500/15 text-indigo-400', label: 'Reply' },
  call_scheduled: { icon: Phone, iconBg: 'bg-blue-500/15 text-blue-400', label: 'Call' },
  opportunity_created: { icon: Target, iconBg: 'bg-emerald-500/15 text-emerald-400', label: 'Opportunity' },
  opportunity_won: { icon: DollarSign, iconBg: 'bg-emerald-500/15 text-emerald-400', label: 'Won' },
  default: { icon: Activity, iconBg: 'bg-zinc-500/15 text-zinc-400', label: 'Activity' },
};

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: 'bg-zinc-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { key: 'meeting', label: 'Meeting', color: 'bg-indigo-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-violet-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
  { key: 'won', label: 'Won', color: 'bg-emerald-500' },
];

// Skeleton components
function StatSkeleton() {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
        <div className="w-12 h-5 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
      <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse mb-1" />
      <div className="h-3 w-24 bg-zinc-800/60 rounded animate-pulse" />
    </div>
  );
}

function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-48 bg-zinc-800/60 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-full bg-zinc-800/40 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-zinc-800/40 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function GrowthDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [stats, setStats] = useState({
    prospectsResearched: 0,
    campaignsActive: 0,
    meetingsBooked: 0,
    expansionRevenue: 0,
    activeSignals: 0,
    opportunitiesThisWeek: 0,
    totalPipeline: 0,
    wonDeals: 0,
  });
  const [activities, setActivities] = useState([]);
  const [pipelineCounts, setPipelineCounts] = useState({});

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      const orgId = user.organization_id || user.company_id;

      try {
        setLoading(true);

        const [
          { data: userData },
          { data: campaigns },
          { data: opportunities },
          { data: signals },
          { data: activityData },
        ] = await Promise.all([
          supabase.from('users').select('credits').eq('id', user.id).single(),
          supabase.from('growth_campaigns').select('*').eq('organization_id', orgId),
          supabase.from('growth_opportunities').select('*').eq('organization_id', orgId),
          supabase.from('customer_signals').select('*').eq('organization_id', orgId).is('acknowledged_at', null),
          supabase.from('growth_activities').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(8),
        ]);

        if (userData) setCredits(userData.credits || 0);

        const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
        const wonOpportunities = opportunities?.filter(o => o.stage === 'won') || [];
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - 7);
        const recentOpportunities = opportunities?.filter(o =>
          new Date(o.created_at) >= thisWeekStart
        ) || [];

        // Pipeline stage counts
        const stageCounts = {};
        (opportunities || []).forEach(o => {
          const stage = (o.stage || 'lead').toLowerCase();
          stageCounts[stage] = (stageCounts[stage] || 0) + 1;
        });
        setPipelineCounts(stageCounts);

        const totalPipeline = (opportunities || [])
          .filter(o => o.stage !== 'won' && o.stage !== 'lost')
          .reduce((sum, o) => sum + (o.value || 0), 0);

        setStats({
          prospectsResearched: campaigns?.reduce((sum, c) => sum + (c.prospects_count || 0), 0) || 0,
          campaignsActive: activeCampaigns.length,
          meetingsBooked: campaigns?.reduce((sum, c) => sum + (c.meetings_booked || 0), 0) || 0,
          expansionRevenue: wonOpportunities.reduce((sum, o) => sum + (o.closed_value || o.value || 0), 0),
          activeSignals: signals?.length || 0,
          opportunitiesThisWeek: recentOpportunities.length,
          totalPipeline,
          wonDeals: wonOpportunities.length,
        });

        const mappedActivities = (activityData || []).map(activity => {
          const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.default;
          return { ...activity, icon: config.icon, iconBg: config.iconBg, label: config.label };
        });
        setActivities(mappedActivities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats({
          prospectsResearched: 0, campaignsActive: 0, meetingsBooked: 0,
          expansionRevenue: 0, activeSignals: 0, opportunitiesThisWeek: 0,
          totalPipeline: 0, wonDeals: 0,
        });
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user?.id, user?.organization_id, user?.company_id]);

  const totalPipelineOpps = useMemo(() => {
    return PIPELINE_STAGES.reduce((sum, s) => sum + (pipelineCounts[s.key] || 0), 0) || 1;
  }, [pipelineCounts]);

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full px-6 lg:px-8 py-6 space-y-6">
          <div className="h-12 w-72 bg-zinc-800/60 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <CardSkeleton className="lg:col-span-2" />
            <CardSkeleton />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <GrowthPageTransition className="min-h-screen bg-black relative">
      {/* Subtle gradient orb */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">Here's your growth overview</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/10">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-white font-semibold text-sm tabular-nums">{credits.toLocaleString()}</span>
              <span className="text-zinc-500 text-xs">credits</span>
            </div>
            <Button
              onClick={() => navigate('/growth/campaign/new')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm h-8 px-4 rounded-full"
            >
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label="Prospects Researched"
            value={stats.prospectsResearched}
            color="indigo"
            delay={0}
          />
          <StatCard
            icon={Target}
            label="Active Campaigns"
            value={stats.campaignsActive}
            color="indigo"
            delay={0.05}
          />
          <StatCard
            icon={Calendar}
            label="Meetings Booked"
            value={stats.meetingsBooked}
            color="indigo"
            delay={0.1}
          />
          <StatCard
            icon={Euro}
            label="Revenue Won"
            value={stats.expansionRevenue > 0 ? `\u20AC${(stats.expansionRevenue / 1000).toFixed(0)}k` : '\u20AC0'}
            color="emerald"
            delay={0.15}
          />
        </div>

        {/* Pipeline + Signals Row */}
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Pipeline Funnel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/15 border border-indigo-500/20">
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Pipeline</h2>
                  <p className="text-[11px] text-zinc-500">
                    {stats.totalPipeline > 0
                      ? `\u20AC${(stats.totalPipeline / 1000).toFixed(0)}k in pipeline`
                      : 'No active opportunities'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/growth/opportunities')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {PIPELINE_STAGES.map((stage) => {
                const count = pipelineCounts[stage.key] || 0;
                const pct = Math.max((count / totalPipelineOpps) * 100, 0);
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-500 w-20 text-right font-medium">{stage.label}</span>
                    <div className="flex-1 h-5 bg-white/[0.03] rounded-md overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                        className={`h-full ${stage.color} rounded-md`}
                        style={{ minWidth: count > 0 ? '2px' : '0' }}
                      />
                      {count > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white/80 tabular-nums">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline summary badges */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.05]">
              <div className="flex items-center gap-1.5 text-[11px]">
                <CircleDot className="w-3 h-3 text-indigo-400" />
                <span className="text-zinc-400">{stats.opportunitiesThisWeek} new this week</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                <span className="text-zinc-400">{stats.wonDeals} won</span>
              </div>
            </div>
          </motion.div>

          {/* Signals Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15 border border-amber-500/20">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Signals</h2>
                  <p className="text-[11px] text-zinc-500">{stats.activeSignals} unread</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/growth/signals')}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                View
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              {stats.activeSignals > 0 ? (
                <div className="w-full space-y-3">
                  <div className="text-center">
                    <motion.p
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                      className="text-4xl font-bold text-amber-400 tabular-nums"
                    >
                      {stats.activeSignals}
                    </motion.p>
                    <p className="text-xs text-zinc-500 mt-1">buying signals detected</p>
                  </div>
                  <Button
                    onClick={() => navigate('/growth/signals')}
                    variant="ghost"
                    className="w-full text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs h-8 rounded-full"
                  >
                    Review Signals
                    <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto mb-2">
                    <Eye className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-xs text-zinc-500">No new signals</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Monitoring your accounts</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Two Action Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Find New Customers */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="group bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-indigo-500/30 transition-colors duration-300"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/15 border border-indigo-500/20">
                <UserPlus className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">Find New Customers</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Research, prospect, and launch outreach campaigns</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-base font-bold text-white tabular-nums">{stats.campaignsActive}</p>
                <p className="text-[10px] text-zinc-500">Active Campaigns</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-base font-bold text-white tabular-nums">{stats.meetingsBooked}</p>
                <p className="text-[10px] text-zinc-500">Meetings Booked</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/growth/campaign/new')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 rounded-full"
              >
                New Campaign
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
              <Button
                onClick={() => navigate('/growth/campaigns')}
                variant="ghost"
                className="text-zinc-400 hover:text-white text-xs h-8 rounded-full px-3"
              >
                View All
              </Button>
            </div>
          </motion.div>

          {/* Grow Existing Customers */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="group bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:border-emerald-500/30 transition-colors duration-300"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">Grow Existing Customers</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Monitor signals, spot upsell opportunities, expand revenue</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-base font-bold text-white tabular-nums">{stats.activeSignals}</p>
                <p className="text-[10px] text-zinc-500">Active Signals</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-base font-bold text-white tabular-nums">{stats.opportunitiesThisWeek}</p>
                <p className="text-[10px] text-zinc-500">Opps This Week</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/growth/opportunities')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 rounded-full"
              >
                View Opportunities
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
              <Button
                onClick={() => navigate('/growth/signals')}
                variant="ghost"
                className="text-zinc-400 hover:text-white text-xs h-8 rounded-full px-3"
              >
                Signals
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions Strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {[
            { icon: Search, label: 'Research', desc: 'Prospect workspace', link: '/growth/research', color: 'indigo' },
            { icon: MessageSquare, label: 'Outreach', desc: 'Build sequences', link: '/growth/outreach/new', color: 'indigo' },
            { icon: BarChart3, label: 'Signals', desc: 'Customer signals', link: '/growth/signals', color: 'amber' },
            { icon: Target, label: 'Pipeline', desc: 'View deals', link: '/growth/opportunities', color: 'emerald' },
          ].map((action, i) => {
            const colorMap = {
              indigo: { bg: 'bg-indigo-500/12', border: 'border-indigo-500/15', text: 'text-indigo-400' },
              amber: { bg: 'bg-amber-500/12', border: 'border-amber-500/15', text: 'text-amber-400' },
              emerald: { bg: 'bg-emerald-500/12', border: 'border-emerald-500/15', text: 'text-emerald-400' },
            };
            const c = colorMap[action.color];
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.link)}
                className="group/action flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-white/10 hover:border-indigo-500/30 transition-all duration-200 text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg} border ${c.border} shrink-0`}>
                  <action.icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">{action.label}</p>
                  <p className="text-[10px] text-zinc-500">{action.desc}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-700 group-hover/action:text-zinc-500 transition-colors ml-auto shrink-0" />
              </button>
            );
          })}
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/15 border border-indigo-500/20">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            </div>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-0.5">
              {activities.map((activity, idx) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.04, duration: 0.3 }}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/[0.02] transition-colors group/item"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${activity.iconBg}`}>
                    <activity.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-zinc-200 truncate">{activity.title}</p>
                    {activity.description && (
                      <p className="text-[11px] text-zinc-600 truncate">{activity.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium text-zinc-600 tabular-nums">
                      {formatRelativeTime(activity.created_at)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">No recent activity</p>
              <p className="text-xs text-zinc-600 mt-1">Launch a campaign to see activity here</p>
              <Button
                onClick={() => navigate('/growth/campaign/new')}
                variant="ghost"
                className="mt-3 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs h-8 rounded-full"
              >
                Start Campaign
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          )}
        </motion.div>

      </div>
    </GrowthPageTransition>
  );
}
