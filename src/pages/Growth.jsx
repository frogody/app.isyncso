import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Calendar, ArrowRight,
  Bell, Send, BarChart3, Plus, Users, Clock, Zap, Search, UserPlus, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GlassCard, StatCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/components/context/UserContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import ClayCampaignBuilder from "@/components/growth/ClayCampaignBuilder";

export default function Growth() {
  const { user } = useUser();
  const [opportunities, setOpportunities] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [signals, setSignals] = useState([]);
  const [prospectLists, setProspectLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [prospects, camps, allCamps, sigs, lists] = await Promise.all([
        // Use Prospect entity (synced with CRM and GrowthPipeline)
        base44.entities.Prospect.filter({ user_id: user.id }, '-created_date'),
        base44.entities.GrowthCampaign.filter({ user_id: user.id, status: 'active' }),
        base44.entities.GrowthCampaign.filter({ user_id: user.id }),
        base44.entities.GrowthSignal.filter({ user_id: user.id, is_read: false }, '-created_date', 5),
        base44.entities.ProspectList.filter({ user_id: user.id }, '-created_date', 5)
      ]);
      // Map Prospect to opportunity format for display
      const opps = prospects.map(p => ({
        id: p.id,
        company_name: p.company_name,
        contact_name: p.contact_name,
        stage: p.stage || 'new',
        deal_value: p.deal_value || p.estimated_value || 0,
        source: p.source,
        created_date: p.created_date,
      }));
      setOpportunities(opps);
      setCampaigns(allCamps);
      setSignals(sigs);
      setProspectLists(lists);
    } catch (error) {
      console.error('Failed to load growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = createPageUrl(`GrowthResearch?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const totalProspects = prospectLists.reduce((sum, l) => sum + (l.prospect_count || 0), 0);

  const totalPipeline = opportunities.reduce((sum, o) => sum + (o.deal_value || 0), 0);
  const wonDeals = opportunities.filter(o => o.stage === 'won');
  const lostDeals = opportunities.filter(o => o.stage === 'lost');
  const wonValue = wonDeals.reduce((sum, o) => sum + (o.deal_value || 0), 0);
  const meetingsThisMonth = campaigns.reduce((sum, c) => sum + (c.meetings_booked || 0), 0);
  const winRate = (wonDeals.length + lostDeals.length) > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
  const activeDeals = opportunities.filter(o => !['won', 'lost'].includes(o.stage)).length;

  // Analytics data - stages synced with CRM
  const stageData = [
    { name: 'New', value: opportunities.filter(o => o.stage === 'new').length, fill: '#3b82f6' },
    { name: 'Contacted', value: opportunities.filter(o => o.stage === 'contacted').length, fill: '#06b6d4' },
    { name: 'Qualified', value: opportunities.filter(o => o.stage === 'qualified').length, fill: '#6366f1' },
    { name: 'Proposal', value: opportunities.filter(o => o.stage === 'proposal').length, fill: '#a855f7' },
    { name: 'Negotiation', value: opportunities.filter(o => o.stage === 'negotiation').length, fill: '#eab308' },
    { name: 'Won', value: wonDeals.length, fill: '#22c55e' }
  ];

  const sourceData = opportunities.reduce((acc, o) => {
    const source = o.source || 'Other';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(sourceData).map(([name, value], i) => ({
    name, value, fill: ['#6366f1', '#818cf8', '#a5b4fc', '#6366f1', '#52525b'][i % 5]
  }));

  // Group opportunities by month for pipeline chart
  const revenueData = (() => {
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months with 0
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyData[key] = { month: months[date.getMonth()], value: 0 };
    }
    
    // Aggregate deal values by month
    opportunities.forEach(opp => {
      if (opp.created_date) {
        const date = new Date(opp.created_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyData[key]) {
          monthlyData[key].value += (opp.deal_value || 0);
        }
      }
    });
    
    return Object.values(monthlyData);
  })();

  // Stage badges synced with CRM
  const stageBadges = {
    new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    contacted: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    qualified: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    proposal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    negotiation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    won: 'bg-green-500/20 text-green-400 border-green-500/30',
    lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full bg-zinc-800 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-2xl" />)}
          </div>
          <Skeleton className="h-80 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full px-6 lg:px-8 py-6 space-y-6">
        <PageHeader
          icon={TrendingUp}
          title="Growth Dashboard"
          subtitle="Pipeline, prospects, and revenue intelligence"
          color="indigo"
          actions={
            <div className="flex gap-2">
              <Link to={createPageUrl('GrowthResearch')}>
                <Button variant="outline" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 hover:text-white">
                  <Search className="w-4 h-4 mr-2" />
                  Research
                </Button>
              </Link>
              <Link to={createPageUrl('GrowthCampaigns')}>
                <Button className="bg-indigo-500 hover:bg-indigo-400 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </Link>
            </div>
          }
        />

        {/* Quick Prospect Search */}
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
          <form onSubmit={handleQuickSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quick search: e.g., 'VP Sales at SaaS companies in Europe'"
                className="pl-10 bg-zinc-800/50 border-zinc-700/60 text-white focus:border-indigo-500/40"
              />
            </div>
            <Button type="submit" className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium">
              Find Prospects
            </Button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Pipeline Value" value={`€${totalPipeline.toLocaleString()}`} color="indigo" delay={0} />
          <StatCard icon={Users} label="Total Prospects" value={totalProspects} color="indigo" delay={0.1} />
          <StatCard icon={Target} label="Won Revenue" value={`€${wonValue.toLocaleString()}`} color="indigo" delay={0.2} />
          <StatCard icon={Bell} label="New Signals" value={signals.length} color="indigo" delay={0.3} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Target, label: 'Pipeline', desc: `${opportunities.length} deals`, path: 'GrowthPipeline' },
            { icon: Users, label: 'Prospects', desc: `${prospectLists.length} lists`, path: 'GrowthProspects' },
            { icon: Send, label: 'Campaigns', desc: `${campaigns.length} active`, path: 'GrowthCampaigns' },
            { icon: Bell, label: 'Signals', desc: `${signals.length} new`, path: 'GrowthSignals' },
          ].map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
            >
              <Link to={createPageUrl(action.path)}>
                <div className="p-5 text-center cursor-pointer rounded-2xl bg-zinc-900/50 border border-zinc-800/60 hover:border-indigo-500/30 transition-all">
                  <action.icon className="w-8 h-8 text-indigo-400/70 mx-auto mb-2" />
                  <h3 className="font-semibold text-white">{action.label}</h3>
                  <p className="text-xs text-zinc-500">{action.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400/70" />
                Pipeline Over Time
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#71717a" />
                    <YAxis stroke="#71717a" tickFormatter={(v) => `€${(v/1000)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value) => [`€${value.toLocaleString()}`, 'Pipeline']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400/70" />
              Conversion Funnel
            </h3>
            <div className="space-y-3">
              {(() => {
                // Real data from campaigns and opportunities - synced with CRM stages
                const leadsCount = campaigns.reduce((sum, c) => sum + (c.total_contacts || 0), 0);
                const qualifiedCount = campaigns.reduce((sum, c) => sum + (c.meetings_booked || 0), 0);
                const proposalCount = opportunities.filter(o => o.stage === 'proposal').length;
                const closedWonCount = opportunities.filter(o => o.stage === 'won').length;
                
                // Calculate widths based on max value
                const maxValue = Math.max(leadsCount, qualifiedCount, proposalCount, closedWonCount, 1);
                
                return [
                  { label: 'Leads', value: leadsCount, width: Math.max((leadsCount / maxValue) * 100, 10), color: 'bg-indigo-500/60' },
                  { label: 'Qualified', value: qualifiedCount, width: Math.max((qualifiedCount / maxValue) * 100, 10), color: 'bg-indigo-500/70' },
                  { label: 'Proposal', value: proposalCount, width: Math.max((proposalCount / maxValue) * 100, 10), color: 'bg-indigo-500/80' },
                  { label: 'Won', value: closedWonCount, width: Math.max((closedWonCount / maxValue) * 100, 10), color: 'bg-indigo-500/90' },
                ];
              })().map((stage, i) => (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-sm text-zinc-400 w-20">{stage.label}</span>
                  <div className="flex-1 h-6 bg-zinc-800 rounded-lg overflow-hidden">
                    <div className={`h-full ${stage.color} rounded-lg flex items-center justify-end pr-2`} style={{ width: `${stage.width}%` }}>
                      <span className="text-xs font-bold text-white">{stage.value}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Clay Campaign Builder - Headliner Feature */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
          <ClayCampaignBuilder />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400/70" />
              Deals by Stage
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400/70" />
              Win/Loss Analysis
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center py-6">
              <div>
                <p className="text-4xl font-bold text-indigo-400/70">{wonDeals.length}</p>
                <p className="text-zinc-500 text-sm mt-1">Won</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-zinc-600">{lostDeals.length}</p>
                <p className="text-zinc-500 text-sm mt-1">Lost</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-indigo-400/80">{winRate}%</p>
                <p className="text-zinc-500 text-sm mt-1">Win Rate</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-indigo-500/60" style={{ width: `${winRate}%` }} />
                <div className="bg-zinc-800" style={{ width: `${100 - winRate}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>Won: €{wonValue.toLocaleString()}</span>
                <span>Lost: €{lostDeals.reduce((s, o) => s + (o.deal_value || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Source Breakdown */}
        {pieData.length > 0 && (
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-lg font-semibold text-white mb-4">Deals by Source</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-zinc-300 text-sm">{item.name}</span>
                    <span className="text-zinc-500 text-sm ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Deals */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-400/70" />
                Top Deals
              </h3>
              <Link to={createPageUrl('GrowthPipeline')} className="text-indigo-400/80 text-sm hover:text-indigo-300 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {opportunities.length > 0 ? (
              <div className="space-y-3">
                {opportunities.slice(0, 4).map((opp, i) => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors border border-zinc-700/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{opp.company_name}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                        {opp.contact_name && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{opp.contact_name}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-indigo-400/80 font-bold">€{(opp.deal_value || 0).toLocaleString()}</p>
                      <Badge className={stageBadges[opp.stage] || 'bg-zinc-700/60'}>{opp.stage}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No deals yet</p>
                <Link to={createPageUrl('GrowthPipeline')}>
                  <Button variant="outline" size="sm" className="mt-3 border-indigo-500/30 text-indigo-400/80 hover:text-indigo-300">
                    Add Opportunity
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Recent Prospect Lists */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400/70" />
                Prospect Lists
              </h3>
              <Link to={createPageUrl('GrowthProspects')} className="text-indigo-400/80 text-sm hover:text-indigo-300 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {prospectLists.length > 0 ? (
              <div className="space-y-3">
                {prospectLists.slice(0, 4).map((list, i) => (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors cursor-pointer border border-zinc-700/30"
                    onClick={() => window.location.href = createPageUrl(`GrowthProspects?list=${list.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{list.name}</p>
                      <p className="text-sm text-zinc-500">{list.prospect_count || 0} prospects</p>
                    </div>
                    <Badge className="bg-indigo-500/20 text-indigo-400/80 border-indigo-500/30">
                      {list.status || 'active'}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 mb-4">No prospect lists yet</p>
                <Link to={createPageUrl('GrowthResearch')}>
                  <Button className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium">
                    <Search className="w-4 h-4 mr-2" />
                    Start Research
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Signals */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400/70" />
                Signals
              </h3>
              <Link to={createPageUrl('GrowthSignals')} className="text-indigo-400/80 text-sm hover:text-indigo-300 flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {signals.length > 0 ? (
              <div className="space-y-3">
                {signals.slice(0, 4).map((signal, i) => (
                  <motion.div
                    key={signal.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors cursor-pointer border border-zinc-700/30"
                    onClick={() => window.location.href = createPageUrl('GrowthSignals')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{signal.company_name}</p>
                      <p className="text-sm text-zinc-500 truncate">{signal.headline}</p>
                    </div>
                    <Badge className={signal.relevance_score >= 80 ? 'bg-red-500/20 text-red-400/80 border-red-500/30' : 'bg-indigo-500/20 text-indigo-400/80 border-indigo-500/30'}>
                      {signal.signal_type}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 mb-4">No signals yet</p>
                <p className="text-xs text-zinc-600">Signals appear as we detect opportunities</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}