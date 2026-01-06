import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  TrendingUp, Users, FileText, FolderOpen,
  Target, DollarSign, Briefcase, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/ui/GlassCard';

// Widget metadata for the apps manager
export const RAISE_WIDGETS = [
  {
    id: 'raise_campaign',
    name: 'Active Campaign',
    description: 'Current fundraising progress',
    size: 'large'
  },
  {
    id: 'raise_target',
    name: 'Raise Target',
    description: 'Fundraising goal',
    size: 'small'
  },
  {
    id: 'raise_committed',
    name: 'Committed',
    description: 'Total committed amount',
    size: 'small'
  },
  {
    id: 'raise_investors',
    name: 'Investors',
    description: 'Investor pipeline count',
    size: 'small'
  },
  {
    id: 'raise_meetings',
    name: 'Meetings',
    description: 'Scheduled investor meetings',
    size: 'small'
  }
];

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
    <GlassCard className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          {campaign?.name || 'Active Campaign'}
        </h2>
        <Link to={createPageUrl("Raise")} className="text-emerald-400 text-sm hover:text-emerald-300">View all</Link>
      </div>

      {campaign ? (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-400">Progress</span>
              <span className="text-emerald-400 font-medium">
                ${(committedAmount / 1000000).toFixed(1)}M / ${(targetAmount / 1000000).toFixed(1)}M
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-zinc-500 mt-1">{progress.toFixed(0)}% of target reached</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-blue-400">{statusCounts.contacted}</p>
              <p className="text-[10px] text-zinc-500">Contacted</p>
            </div>
            <div className="p-2 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-amber-400">{statusCounts.meeting_scheduled}</p>
              <p className="text-[10px] text-zinc-500">Meetings</p>
            </div>
            <div className="p-2 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-purple-400">{statusCounts.in_dd}</p>
              <p className="text-[10px] text-zinc-500">In DD</p>
            </div>
            <div className="p-2 rounded-lg bg-zinc-800/30 text-center">
              <p className="text-lg font-bold text-emerald-400">{statusCounts.committed}</p>
              <p className="text-[10px] text-zinc-500">Committed</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No active campaign
        </div>
      )}
    </GlassCard>
  );
}

export function RaiseTargetWidget({ targetAmount = 0, roundType = '' }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 border-emerald-500/30 border">
          <Target className="w-5 h-5 text-emerald-400" />
        </div>
        {roundType && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs border">
            {roundType}
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold text-white">${(targetAmount / 1000000).toFixed(1)}M</div>
      <div className="text-sm text-zinc-400">Raise Target</div>
    </GlassCard>
  );
}

export function RaiseCommittedWidget({ committedAmount = 0, targetAmount = 0 }) {
  const progress = targetAmount > 0 ? Math.min((committedAmount / targetAmount) * 100, 100) : 0;

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 border-emerald-500/30 border">
          <DollarSign className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {progress.toFixed(0)}%
        </span>
      </div>
      <div className="text-2xl font-bold text-emerald-400">${(committedAmount / 1000000).toFixed(1)}M</div>
      <div className="text-sm text-zinc-400">Committed</div>
    </GlassCard>
  );
}

export function RaiseInvestorsWidget({ investorCount = 0, interestedCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 border-emerald-500/30 border">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        {interestedCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {interestedCount} active
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{investorCount}</div>
      <div className="text-sm text-zinc-400">Total Investors</div>
    </GlassCard>
  );
}

export function RaiseMeetingsWidget({ meetingCount = 0, upcomingCount = 0 }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 border-amber-500/30 border">
          <Calendar className="w-5 h-5 text-amber-400" />
        </div>
        {upcomingCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {upcomingCount} upcoming
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{meetingCount}</div>
      <div className="text-sm text-zinc-400">Meetings</div>
    </GlassCard>
  );
}
