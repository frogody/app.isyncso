import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Target, Rocket, ArrowRight, TrendingUp, Bell, 
  Send, DollarSign, Percent, Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/ui/GlassCard';

// Widget metadata for the apps manager
export const GROWTH_WIDGETS = [
  {
    id: 'growth_pipeline',
    name: 'Pipeline Overview',
    description: 'Active deals and opportunities',
    size: 'large'
  },
  {
    id: 'growth_stats',
    name: 'Pipeline Value',
    description: 'Total pipeline value',
    size: 'small'
  },
  {
    id: 'growth_deals',
    name: 'Active Deals',
    description: 'Number of active deals',
    size: 'small'
  },
  {
    id: 'growth_winrate',
    name: 'Win Rate',
    description: 'Deal conversion percentage',
    size: 'small'
  },
  {
    id: 'growth_signals',
    name: 'Buying Signals',
    description: 'New opportunities detected',
    size: 'medium'
  },
  {
    id: 'growth_campaigns',
    name: 'Active Campaigns',
    description: 'Running outreach campaigns',
    size: 'medium'
  }
];

export function GrowthPipelineWidget({ opportunities = [] }) {
  const stageBadges = {
    lead: 'bg-zinc-700 text-zinc-300',
    qualified: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    proposal: 'bg-indigo-500/25 text-indigo-400/80 border-indigo-500/35',
    negotiation: 'bg-indigo-500/30 text-indigo-400/90 border-indigo-500/40',
    closed_won: 'bg-indigo-500/35 text-indigo-300 border-indigo-500/45',
    closed_lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          Pipeline
        </h2>
        <Link to={createPageUrl("GrowthPipeline")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</Link>
      </div>

      {opportunities.length > 0 ? (
        <div className="space-y-3">
          {opportunities.slice(0, 4).map((opp) => (
            <Link key={opp.id} to={createPageUrl("GrowthPipeline")} className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{opp.company_name || opp.title}</p>
                  <p className="text-xs text-zinc-500 capitalize">{opp.stage?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={`${stageBadges[opp.stage] || 'bg-zinc-700'} border text-xs`}>
                    €{((opp.deal_value || opp.value || 0) / 1000).toFixed(0)}k
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No active deals
        </div>
      )}
    </GlassCard>
  );
}

export function GrowthValueWidget({ totalValue = 0, change = null }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 border-indigo-500/30 border">
          <DollarSign className="w-5 h-5 text-indigo-400" />
        </div>
        {change !== null && (
          <Badge className={`${change >= 0 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} text-xs`}>
            {change >= 0 ? '+' : ''}{change}%
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-white">€{(totalValue / 1000).toFixed(0)}k</div>
      <div className="text-sm text-zinc-400">Pipeline Value</div>
    </GlassCard>
  );
}

export function GrowthDealsWidget({ dealCount = 0, wonCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 border-indigo-500/30 border">
          <Rocket className="w-5 h-5 text-indigo-400" />
        </div>
        {wonCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            {wonCount} won
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{dealCount}</div>
      <div className="text-sm text-zinc-400">Active Deals</div>
    </GlassCard>
  );
}

export function GrowthWinRateWidget({ winRate = 0, wonCount = 0, lostCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 border-indigo-500/30 border">
          <Percent className="w-5 h-5 text-indigo-400" />
        </div>
      </div>
      <div className="text-2xl font-bold text-indigo-400">{winRate}%</div>
      <div className="text-sm text-zinc-400 mb-2">Win Rate</div>
      <div className="flex gap-1 h-2">
        <div className="bg-indigo-500 rounded-l-full" style={{ width: `${winRate}%` }} />
        <div className="bg-zinc-700 rounded-r-full flex-1" />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{wonCount} won</span>
        <span>{lostCount} lost</span>
      </div>
    </GlassCard>
  );
}

export function GrowthSignalsWidget({ signals = [] }) {
  const signalColors = {
    funding: 'bg-indigo-500/25 text-indigo-400 border-indigo-500/35',
    hiring: 'bg-indigo-500/20 text-indigo-400/80 border-indigo-500/30',
    news: 'bg-indigo-500/15 text-indigo-400/70 border-indigo-500/25',
    intent: 'bg-indigo-500/20 text-indigo-400/80 border-indigo-500/30',
  };

  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-400" />
          Buying Signals
        </h2>
        <Link to={createPageUrl("GrowthSignals")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</Link>
      </div>

      {signals.length > 0 ? (
        <div className="space-y-3">
          {signals.slice(0, 4).map((signal) => (
            <div key={signal.id} className="p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white truncate">{signal.company_name}</span>
                <Badge className={`${signalColors[signal.signal_type] || 'bg-zinc-700'} border text-xs`}>
                  {signal.signal_type}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 truncate">{signal.headline}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No new signals
        </div>
      )}
    </GlassCard>
  );
}

export function GrowthCampaignsWidget({ campaigns = [] }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  
  return (
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-indigo-400" />
          Active Campaigns
        </h2>
        <Link to={createPageUrl("GrowthCampaigns")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</Link>
      </div>

      {activeCampaigns.length > 0 ? (
        <div className="space-y-3">
          {activeCampaigns.slice(0, 3).map((campaign) => {
            const progress = campaign.total_contacts > 0 
              ? Math.round((campaign.contacted / campaign.total_contacts) * 100) 
              : 0;
            return (
              <div key={campaign.id} className="p-3 rounded-lg bg-zinc-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white truncate">{campaign.name}</span>
                  <span className="text-xs text-indigo-400">{campaign.responded || 0} replies</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-zinc-400">{progress}%</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                  <span>{campaign.contacted || 0}/{campaign.total_contacts || 0} contacted</span>
                  <span>{campaign.meetings_booked || 0} meetings</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Send className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No active campaigns
        </div>
      )}
    </GlassCard>
  );
}