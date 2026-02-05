import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  TrendingUp, Users,
  Target, Euro, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Widget metadata for the apps manager
export const RAISE_WIDGETS = [
  { id: 'raise_campaign', name: 'Active Campaign', description: 'Current fundraising progress', size: 'large' },
  { id: 'raise_target', name: 'Raise Target', description: 'Fundraising goal', size: 'small' },
  { id: 'raise_committed', name: 'Committed', description: 'Total committed amount', size: 'small' },
  { id: 'raise_investors', name: 'Investors', description: 'Investor pipeline count', size: 'small' },
  { id: 'raise_meetings', name: 'Meetings', description: 'Scheduled investor meetings', size: 'small' }
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-colors ${className}`}>
    {children}
  </div>
);

export function RaiseCampaignWidget({ campaign = null, investors = [] }) {
  const committedAmount = investors
    .filter(i => i.status === 'committed')
    .reduce((sum, i) => sum + (i.committed_amount || 0), 0);

  const targetAmount = campaign?.target_amount || 0;
  const progress = targetAmount > 0 ? Math.min((committedAmount / targetAmount) * 100, 100) : 0;

  const statusCounts = {
    contacted: investors.filter(i => i.status === 'contacted').length,
    meeting_scheduled: investors.filter(i => i.status === 'meeting_scheduled').length,
    in_dd: investors.filter(i => i.status === 'in_dd').length,
    committed: investors.filter(i => i.status === 'committed').length
  };

  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          {campaign?.name || 'Active Campaign'}
        </h2>
        <Link to={createPageUrl("Raise")} className="text-blue-400 text-sm hover:text-blue-300">View all</Link>
      </div>

      {campaign ? (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-400 text-xs">Progress</span>
              <span className="text-white text-xs font-medium">
                {'\u20AC'}{(committedAmount / 1000000).toFixed(1)}M / {'\u20AC'}{(targetAmount / 1000000).toFixed(1)}M
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-zinc-500 mt-1">{progress.toFixed(0)}% of target reached</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-blue-400">{statusCounts.contacted}</p>
              <p className="text-[10px] text-zinc-500">Contacted</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-amber-400">{statusCounts.meeting_scheduled}</p>
              <p className="text-[10px] text-zinc-500">Meetings</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-purple-400">{statusCounts.in_dd}</p>
              <p className="text-[10px] text-zinc-500">In DD</p>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-emerald-400">{statusCounts.committed}</p>
              <p className="text-[10px] text-zinc-500">Committed</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No active campaign
        </div>
      )}
    </Card>
  );
}

export function RaiseTargetWidget({ targetAmount = 0, roundType = '' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10">
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Raise Target</span>
        </div>
        {roundType && (
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-xs border">
            {roundType}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{'\u20AC'}{(targetAmount / 1000000).toFixed(1)}M</div>
    </Card>
  );
}

export function RaiseCommittedWidget({ committedAmount = 0, targetAmount = 0 }) {
  const progress = targetAmount > 0 ? Math.min((committedAmount / targetAmount) * 100, 100) : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <Euro className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Committed</span>
        </div>
        <span className="text-xs text-emerald-400 font-medium">{progress.toFixed(0)}%</span>
      </div>
      <div className="text-2xl font-bold text-emerald-400">{'\u20AC'}{(committedAmount / 1000000).toFixed(1)}M</div>
    </Card>
  );
}

export function RaiseInvestorsWidget({ investorCount = 0, interestedCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Total Investors</span>
        </div>
        {interestedCount > 0 && (
          <span className="text-xs text-blue-400 font-medium">{interestedCount} active</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{investorCount}</div>
    </Card>
  );
}

export function RaiseMeetingsWidget({ meetingCount = 0, upcomingCount = 0 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs text-zinc-400 font-medium">Meetings</span>
        </div>
        {upcomingCount > 0 && (
          <span className="text-xs text-amber-400 font-medium">{upcomingCount} upcoming</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{meetingCount}</div>
    </Card>
  );
}
