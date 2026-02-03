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
  Clock,
  ChevronRight,
  Coins,
  Search,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/components/context/UserContext';
import { supabase } from '@/api/supabaseClient';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Glass card component matching existing pattern
const GlassCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-zinc-900/50 border border-white/5 ${className}`}>
    {children}
  </div>
);

// Stat card component
function StatCard({ icon: Icon, label, value, trend, trendUp }) {
  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-4 hover:border-cyan-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
          {trend && (
            <Badge
              className={`text-xs ${
                trendUp
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
              }`}
            >
              {trendUp ? '+' : ''}{trend}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-zinc-400">{label}</p>
      </GlassCard>
    </motion.div>
  );
}

// Main action card component
function ActionCard({
  icon: Icon,
  iconColor,
  title,
  description,
  stats,
  ctaText,
  ctaLink,
  secondaryText,
  secondaryLink,
}) {
  const navigate = useNavigate();

  return (
    <motion.div variants={itemVariants} className="h-full">
      <GlassCard className="p-6 h-full flex flex-col hover:border-cyan-500/30 transition-all group">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
          {stats.map((stat, index) => (
            <div key={index} className="p-3 rounded-lg bg-zinc-800/50">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={() => navigate(ctaLink)}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button
            onClick={() => navigate(secondaryLink)}
            className="w-full text-sm text-zinc-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1 py-2"
          >
            {secondaryText}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Quick action card component
function QuickActionCard({ icon: Icon, label, description, link }) {
  const navigate = useNavigate();
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(link)}
      className="cursor-pointer"
    >
      <GlassCard className="p-4 hover:border-cyan-500/30 transition-all">
        <Icon className="w-5 h-5 text-cyan-400 mb-2" />
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </GlassCard>
    </motion.div>
  );
}

// Activity item component
function ActivityItem({ icon: Icon, iconBg, title, description, time }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
    >
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <span className="text-xs text-zinc-500 whitespace-nowrap">{time}</span>
    </motion.div>
  );
}

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

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Fetch user credits
        const { data: userData } = await supabase
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single();

        if (userData) {
          setCredits(userData.credits || 0);
        }

        // TODO: Replace with actual queries once tables exist
        // Fetch campaign stats from growth_campaigns table
        // const { data: campaignData } = await supabase
        //   .from('growth_campaigns')
        //   .select('*')
        //   .eq('organization_id', user.organization_id)
        //   .eq('status', 'active');

        // TODO: Fetch activity from growth_activity table
        // const { data: activityData } = await supabase
        //   .from('growth_activity')
        //   .select('*')
        //   .eq('organization_id', user.organization_id)
        //   .order('created_at', { ascending: false })
        //   .limit(5);

        // Placeholder data - replace with actual DB queries
        setStats({
          prospectsResearched: 247,
          campaignsActive: 3,
          meetingsBooked: 12,
          expansionRevenue: 45000,
          activeSignals: 28,
          opportunitiesThisWeek: 7,
        });

        // Placeholder activities - replace with growth_activity table
        setActivities([
          {
            id: 1,
            type: 'campaign_sent',
            title: 'Campaign "Q1 Tech Leaders" sent',
            description: '150 prospects reached',
            created_at: new Date(Date.now() - 1800000),
            icon: Mail,
            iconBg: 'bg-cyan-500/10 text-cyan-400',
          },
          {
            id: 2,
            type: 'meeting_booked',
            title: 'Meeting booked with Acme Corp',
            description: 'John Smith - VP Engineering',
            created_at: new Date(Date.now() - 7200000),
            icon: Calendar,
            iconBg: 'bg-green-500/10 text-green-400',
          },
          {
            id: 3,
            type: 'signal_detected',
            title: 'Expansion signal detected',
            description: 'TechCo Inc. showing growth patterns',
            created_at: new Date(Date.now() - 14400000),
            icon: Zap,
            iconBg: 'bg-amber-500/10 text-amber-400',
          },
          {
            id: 4,
            type: 'prospect_replied',
            title: 'Prospect replied',
            description: 'Sarah Chen interested in demo',
            created_at: new Date(Date.now() - 28800000),
            icon: Bell,
            iconBg: 'bg-indigo-500/10 text-indigo-400',
          },
          {
            id: 5,
            type: 'call_scheduled',
            title: 'Discovery call scheduled',
            description: 'DataFlow Systems - Tomorrow 2pm',
            created_at: new Date(Date.now() - 43200000),
            icon: Phone,
            iconBg: 'bg-blue-500/10 text-blue-400',
          },
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user?.id, user?.organization_id]);

  return (
    <div className="min-h-screen bg-black">
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <Rocket className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Growth</h1>
                <p className="text-zinc-400">
                  Accelerate your revenue with intelligent prospecting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GlassCard className="px-4 py-2 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-white font-semibold">
                  {credits.toLocaleString()}
                </span>
                <span className="text-zinc-400 text-sm">credits</span>
              </GlassCard>
            </div>
          </div>
        </motion.div>

        {/* Main Action Cards */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6 mb-8">
          <ActionCard
            icon={UserPlus}
            iconColor="bg-cyan-500/10 text-cyan-400"
            title="Find New Customers"
            description="Research prospects, find correlations with your product, and launch outreach campaigns"
            stats={[
              { label: 'Active Campaigns', value: stats.campaignsActive },
              { label: 'Meetings This Month', value: stats.meetingsBooked },
            ]}
            ctaText="Start New Campaign"
            ctaLink="/growth/campaign/new"
            secondaryText="View Campaigns"
            secondaryLink="/growth/campaigns"
          />

          <ActionCard
            icon={TrendingUp}
            iconColor="bg-green-500/10 text-green-400"
            title="Grow Existing Customers"
            description="Monitor customer signals, spot upsell opportunities, and expand revenue"
            stats={[
              { label: 'Active Signals', value: stats.activeSignals },
              { label: 'Opportunities This Week', value: stats.opportunitiesThisWeek },
            ]}
            ctaText="View Opportunities"
            ctaLink="/growth/opportunities"
            secondaryText="Monitor Signals"
            secondaryLink="/growth/signals"
          />
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Prospects Researched"
            value={stats.prospectsResearched}
            trend="23%"
            trendUp={true}
          />
          <StatCard
            icon={Target}
            label="Campaigns Active"
            value={stats.campaignsActive}
          />
          <StatCard
            icon={Calendar}
            label="Meetings Booked"
            value={stats.meetingsBooked}
            trend="8%"
            trendUp={true}
          />
          <StatCard
            icon={DollarSign}
            label="Expansion Revenue"
            value={`$${(stats.expansionRevenue / 1000).toFixed(0)}k`}
            trend="15%"
            trendUp={true}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickActionCard
            icon={Search}
            label="Research Prospects"
            description="Open research workspace"
            link="/growth/research"
          />
          <QuickActionCard
            icon={Mail}
            label="Create Sequence"
            description="Build outreach campaign"
            link="/growth/outreach/new"
          />
          <QuickActionCard
            icon={BarChart3}
            label="Customer Signals"
            description="Monitor expansion signals"
            link="/growth/signals"
          />
          <QuickActionCard
            icon={Target}
            label="Opportunities"
            description="View pipeline"
            link="/growth/opportunities"
          />
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              </div>
              <button
                onClick={() => navigate('/growth/activity')}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-4 h-4" />
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
                  <ActivityItem
                    key={activity.id}
                    icon={activity.icon}
                    iconBg={activity.iconBg}
                    title={activity.title}
                    description={activity.description}
                    time={formatRelativeTime(activity.created_at)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No recent activity</p>
                <p className="text-sm text-zinc-500">
                  Start a campaign to see activity here
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
