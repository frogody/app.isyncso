/**
 * Growth Dashboard Page
 * Main entry point for the Growth module - Accelerate revenue with intelligent prospecting
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  UserPlus,
  TrendingUp,
  Users,
  Target,
  Calendar,
  DollarSign,
  Activity,
  ArrowRight,
  Zap,
  Bell,
  Mail,
  Phone,
  Sparkles,
  ChevronRight,
  Coins,
  Search,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard, StatCard } from '@/components/ui/GlassCard';

// Format relative time
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
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
  });
  const [activities, setActivities] = useState([]);

  // Map activity types to icons and colors
  const ACTIVITY_CONFIG = {
    campaign_sent: { icon: Mail, iconBg: 'bg-indigo-500/20 text-indigo-400' },
    meeting_booked: { icon: Calendar, iconBg: 'bg-green-500/20 text-green-400' },
    signal_detected: { icon: Zap, iconBg: 'bg-amber-500/20 text-amber-400' },
    prospect_replied: { icon: Bell, iconBg: 'bg-indigo-500/20 text-indigo-400' },
    call_scheduled: { icon: Phone, iconBg: 'bg-blue-500/20 text-blue-400' },
    opportunity_created: { icon: Target, iconBg: 'bg-green-500/20 text-green-400' },
    opportunity_won: { icon: DollarSign, iconBg: 'bg-green-500/20 text-green-400' },
    default: { icon: Activity, iconBg: 'bg-zinc-500/20 text-zinc-400' },
  };

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      const orgId = user.organization_id || user.company_id;

      try {
        setLoading(true);

        const { data: userData } = await supabase
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single();

        if (userData) {
          setCredits(userData.credits || 0);
        }

        const { data: campaigns } = await supabase
          .from('growth_campaigns')
          .select('*')
          .eq('organization_id', orgId);

        const { data: opportunities } = await supabase
          .from('growth_opportunities')
          .select('*')
          .eq('organization_id', orgId);

        const { data: signals } = await supabase
          .from('customer_signals')
          .select('*')
          .eq('organization_id', orgId)
          .is('acknowledged_at', null);

        const { data: activityData } = await supabase
          .from('growth_activities')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5);

        const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
        const wonOpportunities = opportunities?.filter(o => o.stage === 'won') || [];
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - 7);
        const recentOpportunities = opportunities?.filter(o =>
          new Date(o.created_at) >= thisWeekStart
        ) || [];

        setStats({
          prospectsResearched: campaigns?.reduce((sum, c) => sum + (c.prospects_count || 0), 0) || 0,
          campaignsActive: activeCampaigns.length,
          meetingsBooked: campaigns?.reduce((sum, c) => sum + (c.meetings_booked || 0), 0) || 0,
          expansionRevenue: wonOpportunities.reduce((sum, o) => sum + (o.closed_value || o.value || 0), 0),
          activeSignals: signals?.length || 0,
          opportunitiesThisWeek: recentOpportunities.length,
        });

        const mappedActivities = (activityData || []).map(activity => {
          const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.default;
          return {
            ...activity,
            icon: config.icon,
            iconBg: config.iconBg,
          };
        });

        setActivities(mappedActivities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats({
          prospectsResearched: 0,
          campaignsActive: 0,
          meetingsBooked: 0,
          expansionRevenue: 0,
          activeSignals: 0,
          opportunitiesThisWeek: 0,
        });
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user?.id, user?.organization_id, user?.company_id]);

  return (
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <PageHeader
          icon={Rocket}
          title="Growth"
          subtitle="Accelerate your revenue with intelligent prospecting"
          color="indigo"
          actions={
            <GlassCard hover={false} animated={false} size="xs" className="px-3 py-1.5 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-white font-semibold text-sm">{credits.toLocaleString()}</span>
              <span className="text-zinc-400 text-xs">credits</span>
            </GlassCard>
          }
        />

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Prospects Researched"
            value={stats.prospectsResearched}
            change="23%"
            trend="up"
            color="indigo"
            delay={0}
          />
          <StatCard
            icon={Target}
            label="Campaigns Active"
            value={stats.campaignsActive}
            color="indigo"
            delay={0.1}
          />
          <StatCard
            icon={Calendar}
            label="Meetings Booked"
            value={stats.meetingsBooked}
            change="8%"
            trend="up"
            color="indigo"
            delay={0.2}
          />
          <StatCard
            icon={DollarSign}
            label="Expansion Revenue"
            value={`$${(stats.expansionRevenue / 1000).toFixed(0)}k`}
            change="15%"
            trend="up"
            color="green"
            delay={0.3}
          />
        </div>

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard glow="indigo" delay={0.1} size="lg" className="flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
                <UserPlus className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find New Customers</h3>
                <p className="text-xs text-zinc-400 mt-1">Research prospects, find correlations, and launch outreach campaigns</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-lg font-bold text-white">{stats.campaignsActive}</p>
                <p className="text-xs text-zinc-400">Active Campaigns</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-lg font-bold text-white">{stats.meetingsBooked}</p>
                <p className="text-xs text-zinc-400">Meetings This Month</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => navigate('/growth/campaign/new')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Start New Campaign
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button
                onClick={() => navigate('/growth/campaigns')}
                className="w-full text-xs text-zinc-400 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1 py-2"
              >
                View Campaigns
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </GlassCard>

          <GlassCard glow="green" delay={0.2} size="lg" className="flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/20 border border-green-500/30">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Grow Existing Customers</h3>
                <p className="text-xs text-zinc-400 mt-1">Monitor customer signals, spot upsell opportunities, and expand revenue</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-lg font-bold text-white">{stats.activeSignals}</p>
                <p className="text-xs text-zinc-400">Active Signals</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-lg font-bold text-white">{stats.opportunitiesThisWeek}</p>
                <p className="text-xs text-zinc-400">Opportunities This Week</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => navigate('/growth/opportunities')}
                className="w-full bg-green-600 hover:bg-green-500 text-white"
              >
                View Opportunities
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <button
                onClick={() => navigate('/growth/signals')}
                className="w-full text-xs text-zinc-400 hover:text-green-400 transition-colors flex items-center justify-center gap-1 py-2"
              >
                Monitor Signals
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Search, label: 'Research Prospects', desc: 'Open research workspace', link: '/growth/research' },
            { icon: Mail, label: 'Create Sequence', desc: 'Build outreach campaign', link: '/growth/outreach/new' },
            { icon: BarChart3, label: 'Customer Signals', desc: 'Monitor expansion signals', link: '/growth/signals' },
            { icon: Target, label: 'Opportunities', desc: 'View pipeline', link: '/growth/opportunities' },
          ].map((action, i) => (
            <GlassCard
              key={action.label}
              glow="indigo"
              delay={0.1 * i}
              size="sm"
              onClick={() => navigate(action.link)}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30 mb-2">
                <action.icon className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-white">{action.label}</p>
              <p className="text-xs text-zinc-400">{action.desc}</p>
            </GlassCard>
          ))}
        </div>

        {/* Recent Activity Feed */}
        <GlassCard hover={false} delay={0.3} size="lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            </div>
            <button
              onClick={() => navigate('/growth/activity')}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-1">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activity.iconBg}`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{activity.title}</p>
                    <p className="text-xs text-zinc-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No recent activity</p>
              <p className="text-xs text-zinc-500">Start a campaign to see activity here</p>
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
}
