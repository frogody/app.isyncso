import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  TrendingUp, Users,
  Target, Euro, Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCard, GlassCard, ProgressRing } from '@/components/ui/GlassCard';
import { AnimatedProgress } from '@/components/dashboard/AnimatedProgress';
import { AnimatedCurrency, AnimatedPercentage } from '@/components/ui/AnimatedNumber';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

// Widget metadata for the apps manager
export const RAISE_WIDGETS = [
  { id: 'raise_campaign', name: 'Active Campaign', description: 'Current fundraising progress', size: 'large' },
  { id: 'raise_target', name: 'Raise Target', description: 'Fundraising goal', size: 'small' },
  { id: 'raise_committed', name: 'Committed', description: 'Total committed amount', size: 'small' },
  { id: 'raise_investors', name: 'Investors', description: 'Investor pipeline count', size: 'small' },
  { id: 'raise_meetings', name: 'Meetings', description: 'Scheduled investor meetings', size: 'small' }
];

export function RaiseCampaignWidget({ campaign = null, investors = [] }) {
  const { t } = useTheme();

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

  const totalInvestors = investors.length || 1;

  const stages = [
    { key: 'contacted', label: 'Contacted', color: 'blue', count: statusCounts.contacted },
    { key: 'meeting_scheduled', label: 'Meetings', color: 'amber', count: statusCounts.meeting_scheduled },
    { key: 'in_dd', label: 'In DD', color: 'purple', count: statusCounts.in_dd },
    { key: 'committed', label: 'Committed', color: 'emerald', count: statusCounts.committed },
  ];

  return (
    <GlassCard glow="blue" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          {campaign?.name || 'Active Campaign'}
        </h2>
        <Link to={createPageUrl("Raise")} className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
          View all
        </Link>
      </div>

      {campaign ? (
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <ProgressRing value={progress} size={100} strokeWidth={8} color="blue">
              <div className="flex flex-col items-center">
                <AnimatedPercentage value={progress} className={cn('text-xl font-bold', t('text-zinc-900', 'text-white'))} duration={1.2} />
              </div>
            </ProgressRing>
            <div className={cn('text-xs text-center', t('text-zinc-500', 'text-zinc-400'))}>
              <AnimatedCurrency value={committedAmount / 1000000} decimals={1} className="font-medium" />
              <span>M / </span>
              <AnimatedCurrency value={targetAmount / 1000000} decimals={1} className="font-medium" />
              <span>M raised</span>
            </div>
          </div>

          <div className="w-full space-y-2.5">
            {stages.map((stage) => (
              <div key={stage.key} className="flex items-center gap-3">
                <span className={cn('text-xs w-20 shrink-0', t('text-zinc-600', 'text-zinc-400'))}>{stage.label}</span>
                <AnimatedProgress
                  value={stage.count}
                  max={totalInvestors}
                  color={stage.color}
                  height={6}
                />
                <span className={cn('text-xs font-medium w-6 text-right shrink-0', t('text-zinc-700', 'text-zinc-300'))}>{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 mx-auto mb-3">
            <TrendingUp className={cn('w-6 h-6', t('text-zinc-400', 'text-zinc-500'))} />
          </div>
          <p className={cn('text-sm', t('text-zinc-500', 'text-zinc-500'))}>No active campaign</p>
        </div>
      )}
    </GlassCard>
  );
}

export function RaiseTargetWidget({ targetAmount = 0, roundType = '' }) {
  const { t } = useTheme();
  return (
    <GlassCard glow="blue" className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 border border-blue-500/30">
          <Target className="w-4 h-4 text-blue-400" />
        </div>
        {roundType && (
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-xs border">{roundType}</Badge>
        )}
      </div>
      <div className={cn('text-lg font-bold mb-0.5', t('text-zinc-900', 'text-white'))}>
        {'\u20AC'}{(targetAmount / 1000000).toFixed(1)}M
      </div>
      <div className={cn('text-xs', t('text-zinc-500', 'text-zinc-400'))}>Raise Target</div>
    </GlassCard>
  );
}

export function RaiseCommittedWidget({ committedAmount = 0, targetAmount = 0 }) {
  const { t } = useTheme();
  const progress = targetAmount > 0 ? Math.min((committedAmount / targetAmount) * 100, 100) : 0;
  return (
    <GlassCard glow="emerald" className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30">
          <Euro className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-xs text-emerald-400 font-medium">{progress.toFixed(0)}%</span>
      </div>
      <div className="text-lg font-bold text-emerald-400 mb-0.5">
        {'\u20AC'}{(committedAmount / 1000000).toFixed(1)}M
      </div>
      <div className={cn('text-xs', t('text-zinc-500', 'text-zinc-400'))}>Committed</div>
    </GlassCard>
  );
}

export function RaiseInvestorsWidget({ investorCount = 0, interestedCount = 0 }) {
  return (
    <StatCard
      icon={Users}
      color="blue"
      value={investorCount}
      label="Total Investors"
      change={interestedCount > 0 ? `${interestedCount} active` : undefined}
      trend={interestedCount > 0 ? 'up' : undefined}
    />
  );
}

export function RaiseMeetingsWidget({ meetingCount = 0, upcomingCount = 0 }) {
  return (
    <StatCard
      icon={Calendar}
      color="amber"
      value={meetingCount}
      label="Meetings"
      change={upcomingCount > 0 ? `${upcomingCount} upcoming` : undefined}
      trend={upcomingCount > 0 ? 'up' : undefined}
    />
  );
}
