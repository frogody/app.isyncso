import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Target, Rocket, TrendingUp, Bell,
  Send, Euro, Users, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { StatCard, GlassCard, ProgressRing } from '@/components/ui/GlassCard';
import { AnimatedProgress } from '@/components/dashboard/AnimatedProgress';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';

// Widget metadata for the apps manager
export const GROWTH_WIDGETS = [
  { id: 'growth_pipeline', name: 'Pipeline Overview', description: 'Active deals and opportunities', size: 'large' },
  { id: 'growth_stats', name: 'Pipeline Value', description: 'Total pipeline value', size: 'small' },
  { id: 'growth_deals', name: 'Active Deals', description: 'Number of active deals', size: 'small' },
  { id: 'growth_winrate', name: 'Win Rate', description: 'Deal conversion percentage', size: 'small' },
  { id: 'growth_signals', name: 'Buying Signals', description: 'New opportunities detected', size: 'medium' },
  { id: 'growth_campaigns', name: 'Active Campaigns', description: 'Running outreach campaigns', size: 'medium' }
];

const STAGE_COLORS = {
  lead: '#71717a',
  qualified: '#a5b4fc',
  proposal: '#818cf8',
  negotiation: '#6366f1',
  closed_won: '#10b981',
};

const STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won'];

const STAGE_LABELS = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
};

const PIPELINE_CHART_CONFIG = {
  count: { label: 'Deals' },
};

export function GrowthPipelineWidget({ opportunities = [] }) {
  const { t } = useTheme();

  const stageData = useMemo(() => {
    const counts = {};
    for (const opp of opportunities) {
      const stage = opp.stage || 'lead';
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return STAGE_ORDER.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: counts[stage] || 0,
      fill: STAGE_COLORS[stage],
    }));
  }, [opportunities]);

  const topDeals = useMemo(() => {
    return [...opportunities]
      .sort((a, b) => (b.deal_value || b.value || 0) - (a.deal_value || a.value || 0))
      .slice(0, 3);
  }, [opportunities]);

  const stageBadges = {
    lead: 'bg-zinc-700 text-zinc-300',
    qualified: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    proposal: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    negotiation: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/35',
    closed_won: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    closed_lost: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <GlassCard glow="indigo" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Target className="w-5 h-5 text-indigo-400" />
          Pipeline
        </h2>
        <Link to={createPageUrl("GrowthPipeline")} className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
          View all
        </Link>
      </div>

      {opportunities.length > 0 ? (
        <>
          <ChartContainer config={PIPELINE_CHART_CONFIG} className="w-full aspect-auto h-[120px] mb-4">
            <BarChart data={stageData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" hide />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {stageData.map((entry) => (
                  <Cell key={entry.stage} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {stageData.map((s) => (
              <div key={s.stage} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                <span className={cn('text-[10px]', t('text-zinc-500', 'text-zinc-400'))}>{s.label} ({s.count})</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {topDeals.map((opp, i) => (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
              >
                <Link to={createPageUrl("GrowthPipeline")} className="block">
                  <div className={cn(
                    'flex items-center justify-between p-3 rounded-lg transition-colors',
                    t('bg-zinc-100/80 hover:bg-zinc-200/80', 'bg-zinc-800/30 hover:bg-zinc-800/50')
                  )}>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm truncate', t('text-zinc-900', 'text-white'))}>{opp.company_name || opp.title}</p>
                      <p className={cn('text-xs capitalize', t('text-zinc-500', 'text-zinc-500'))}>{opp.stage?.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className={`${stageBadges[opp.stage] || 'bg-zinc-700'} border text-xs ml-2`}>
                      {'\u20AC'}{((opp.deal_value || opp.value || 0) / 1000).toFixed(0)}k
                    </Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className={cn('text-center py-6 text-sm', t('text-zinc-400', 'text-zinc-500'))}>
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No active deals
        </div>
      )}
    </GlassCard>
  );
}

export function GrowthValueWidget({ totalValue = 0, change = null }) {
  const trend = change !== null ? (change >= 0 ? 'up' : 'down') : undefined;
  const changeStr = change !== null ? `${Math.abs(change)}%` : undefined;

  return (
    <StatCard
      icon={Euro}
      label="Pipeline Value"
      value={`\u20AC${(totalValue / 1000).toFixed(0)}k`}
      change={changeStr}
      trend={trend}
      color="indigo"
    />
  );
}

export function GrowthDealsWidget({ dealCount = 0, wonCount = 0 }) {
  return (
    <StatCard
      icon={Rocket}
      label="Active Deals"
      value={dealCount}
      color="indigo"
    />
  );
}

export function GrowthWinRateWidget({ winRate = 0, wonCount = 0, lostCount = 0 }) {
  const { t } = useTheme();
  return (
    <GlassCard glow="indigo" className="p-4">
      <div className="flex items-center gap-3">
        <ProgressRing value={winRate} size={56} strokeWidth={5} color="indigo">
          <span className={cn('text-sm font-bold', t('text-zinc-900', 'text-white'))}>{winRate}%</span>
        </ProgressRing>
        <div>
          <div className={cn('text-lg font-bold', t('text-zinc-900', 'text-white'))}>Win Rate</div>
          <div className={cn('text-xs', t('text-zinc-500', 'text-zinc-400'))}>{wonCount}W / {lostCount}L</div>
        </div>
      </div>
    </GlassCard>
  );
}

const SIGNAL_ICONS = {
  funding: TrendingUp,
  hiring: Users,
  news: Bell,
  intent: Zap,
};

const SIGNAL_COLORS = {
  funding: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  hiring: { text: 'text-blue-400', bg: 'bg-blue-500/10' },
  news: { text: 'text-purple-400', bg: 'bg-purple-500/10' },
  intent: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
};

export function GrowthSignalsWidget({ signals = [] }) {
  const { t } = useTheme();

  return (
    <GlassCard glow="indigo" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Bell className="w-5 h-5 text-indigo-400" />
          Buying Signals
        </h2>
        <Link to={createPageUrl("GrowthSignals")} className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
          View all
        </Link>
      </div>

      {signals.length > 0 ? (
        <div className="space-y-2">
          {signals.slice(0, 4).map((signal, i) => {
            const signalType = signal.signal_type || 'news';
            const SignalIcon = SIGNAL_ICONS[signalType] || Bell;
            const colors = SIGNAL_COLORS[signalType] || SIGNAL_COLORS.news;

            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={cn(
                  'p-3 rounded-lg',
                  t('bg-zinc-100/80', 'bg-zinc-800/30')
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-sm truncate flex-1', t('text-zinc-900', 'text-white'))}>{signal.company_name}</span>
                    <div className={cn('flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize', colors.bg, colors.text)}>
                      <SignalIcon className="w-3 h-3" />
                      {signalType}
                    </div>
                  </div>
                  <p className={cn('text-xs truncate', t('text-zinc-500', 'text-zinc-400'))}>{signal.headline}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={cn('text-center py-6 text-sm', t('text-zinc-400', 'text-zinc-500'))}>
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No new signals
        </div>
      )}
    </GlassCard>
  );
}

export function GrowthCampaignsWidget({ campaigns = [] }) {
  const { t } = useTheme();
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <GlassCard glow="indigo" className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn('text-base font-semibold flex items-center gap-2', t('text-zinc-900', 'text-white'))}>
          <Send className="w-5 h-5 text-indigo-400" />
          Active Campaigns
        </h2>
        <Link to={createPageUrl("GrowthCampaigns")} className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
          View all
        </Link>
      </div>

      {activeCampaigns.length > 0 ? (
        <div className="space-y-2.5">
          {activeCampaigns.slice(0, 3).map((campaign, i) => {
            const progress = campaign.total_contacts > 0
              ? Math.round((campaign.contacted / campaign.total_contacts) * 100)
              : 0;
            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
              >
                <div className={cn(
                  'p-3 rounded-lg',
                  t('bg-zinc-100/80', 'bg-zinc-800/30')
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('text-sm truncate', t('text-zinc-900', 'text-white'))}>{campaign.name}</span>
                    <div className="flex items-center gap-1.5">
                      {(campaign.responded || 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-400">
                          {campaign.responded} replies
                        </Badge>
                      )}
                      {(campaign.meetings_booked || 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400">
                          {campaign.meetings_booked} mtgs
                        </Badge>
                      )}
                    </div>
                  </div>
                  <AnimatedProgress
                    value={campaign.contacted || 0}
                    max={campaign.total_contacts || 1}
                    color="indigo"
                    height={5}
                    label={`${progress}%`}
                  />
                  <div className={cn('flex items-center justify-between mt-1.5 text-xs', t('text-zinc-500', 'text-zinc-500'))}>
                    <span>{campaign.contacted || 0}/{campaign.total_contacts || 0} contacted</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={cn('text-center py-6 text-sm', t('text-zinc-400', 'text-zinc-500'))}>
          <Send className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No active campaigns
        </div>
      )}
    </GlassCard>
  );
}
