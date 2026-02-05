import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Target, Rocket, TrendingUp, Bell,
  Send, Euro, Percent
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Widget metadata for the apps manager
export const GROWTH_WIDGETS = [
  { id: 'growth_pipeline', name: 'Pipeline Overview', description: 'Active deals and opportunities', size: 'large' },
  { id: 'growth_stats', name: 'Pipeline Value', description: 'Total pipeline value', size: 'small' },
  { id: 'growth_deals', name: 'Active Deals', description: 'Number of active deals', size: 'small' },
  { id: 'growth_winrate', name: 'Win Rate', description: 'Deal conversion percentage', size: 'small' },
  { id: 'growth_signals', name: 'Buying Signals', description: 'New opportunities detected', size: 'medium' },
  { id: 'growth_campaigns', name: 'Active Campaigns', description: 'Running outreach campaigns', size: 'medium' }
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-colors ${className}`}>
    {children}
  </div>
);

export function GrowthPipelineWidget({ opportunities = [] }) {
  const stageBadges = {
    lead: 'bg-zinc-700 text-zinc-300',
    qualified: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    proposal: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    negotiation: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/35',
    closed_won: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    closed_lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          Pipeline
        </h2>
        <Link to={createPageUrl("GrowthPipeline")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</Link>
      </div>

      {opportunities.length > 0 ? (
        <div className="space-y-2">
          {opportunities.slice(0, 4).map((opp) => (
            <Link key={opp.id} to={createPageUrl("GrowthPipeline")} className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{opp.company_name || opp.title}</p>
                  <p className="text-xs text-zinc-500 capitalize">{opp.stage?.replace(/_/g, ' ')}</p>
                </div>
                <Badge className={`${stageBadges[opp.stage] || 'bg-zinc-700'} border text-xs ml-2`}>
                  ${((opp.deal_value || opp.value || 0) / 1000).toFixed(0)}k
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No active deals
        </div>
      )}
    </Card>
  );
}

export function GrowthValueWidget({ totalValue = 0, change = null }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10">
            <Euro className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Pipeline Value</span>
        </div>
        {change !== null && (
          <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">${(totalValue / 1000).toFixed(0)}k</div>
    </Card>
  );
}

export function GrowthDealsWidget({ dealCount = 0, wonCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10">
            <Rocket className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Active Deals</span>
        </div>
        {wonCount > 0 && (
          <span className="text-xs text-emerald-400 font-medium">{wonCount} won</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{dealCount}</div>
    </Card>
  );
}

export function GrowthWinRateWidget({ winRate = 0, wonCount = 0, lostCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10">
          <Percent className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="text-xs text-zinc-400 font-medium">Win Rate</span>
      </div>
      <div className="text-2xl font-bold text-indigo-400">{winRate}%</div>
      <div className="flex gap-1 h-1.5 mt-2 rounded-full overflow-hidden">
        <div className="bg-indigo-500 rounded-l-full" style={{ width: `${winRate}%` }} />
        <div className="bg-zinc-700 rounded-r-full flex-1" />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{wonCount} won</span>
        <span>{lostCount} lost</span>
      </div>
    </Card>
  );
}

export function GrowthSignalsWidget({ signals = [] }) {
  const signalColors = {
    funding: 'text-indigo-400',
    hiring: 'text-cyan-400',
    news: 'text-amber-400',
    intent: 'text-emerald-400',
  };

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-400" />
          Buying Signals
        </h2>
        <Link to={createPageUrl("GrowthSignals")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</Link>
      </div>

      {signals.length > 0 ? (
        <div className="space-y-2">
          {signals.slice(0, 4).map((signal) => (
            <div key={signal.id} className="p-3 rounded-lg bg-zinc-800/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white truncate">{signal.company_name}</span>
                <span className={`text-xs font-medium capitalize ${signalColors[signal.signal_type] || 'text-zinc-400'}`}>
                  {signal.signal_type}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">{signal.headline}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No new signals
        </div>
      )}
    </Card>
  );
}

export function GrowthCampaignsWidget({ campaigns = [] }) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-indigo-400" />
          Active Campaigns
        </h2>
        <Link to={createPageUrl("GrowthCampaigns")} className="text-indigo-400 text-sm hover:text-indigo-300">View all</Link>
      </div>

      {activeCampaigns.length > 0 ? (
        <div className="space-y-2.5">
          {activeCampaigns.slice(0, 3).map((campaign) => {
            const progress = campaign.total_contacts > 0
              ? Math.round((campaign.contacted / campaign.total_contacts) * 100)
              : 0;
            return (
              <div key={campaign.id} className="p-3 rounded-lg bg-zinc-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white truncate">{campaign.name}</span>
                  <span className="text-xs text-indigo-400 font-medium">{campaign.responded || 0} replies</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-zinc-400">{progress}%</span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-zinc-500">
                  <span>{campaign.contacted || 0}/{campaign.total_contacts || 0} contacted</span>
                  <span>{campaign.meetings_booked || 0} meetings</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <Send className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No active campaigns
        </div>
      )}
    </Card>
  );
}
