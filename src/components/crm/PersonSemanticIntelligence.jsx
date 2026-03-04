import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useSemanticContext } from '@/contexts/SemanticContextProvider';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { Link } from 'react-router-dom';
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Calendar,
  Code,
  MessageSquare,
  FileText,
  Eye,
  Users,
  BarChart3,
  Loader2,
  Search,
  Zap,
  ArrowRight,
  Monitor,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ACTIVITY_ICONS = {
  email: Mail,
  meeting: Calendar,
  code: Code,
  chat: MessageSquare,
  document: FileText,
  browse: Eye,
  collaboration: Users,
  default: Activity,
};

function getActivityIcon(type) {
  if (!type) return Activity;
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(ACTIVITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return Activity;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// --- Sub-sections ---

function OverviewSection({ activities, entityMatch, personName }) {
  const stats = useMemo(() => {
    if (!activities?.length) return null;
    const sorted = [...activities].sort(
      (a, b) => new Date(a.occurred_at || a.created_at) - new Date(b.occurred_at || b.created_at)
    );
    const firstSeen = sorted[0]?.occurred_at || sorted[0]?.created_at;
    const lastSeen = sorted[sorted.length - 1]?.occurred_at || sorted[sorted.length - 1]?.created_at;

    // Activity type distribution
    const typeCounts = {};
    activities.forEach((a) => {
      const t = a.activity_type || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const dominantTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { total: activities.length, firstSeen, lastSeen, dominantTypes };
  }, [activities]);

  if (!stats) {
    return (
      <EmptyState
        icon={Monitor}
        message={`No activity data found for ${personName || 'this contact'}`}
        sub="Connect your desktop app to automatically track work related to this contact."
        showTrackingLink
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Interactions" value={stats.total} icon={Activity} />
        <MiniStat label="First Seen" value={formatDate(stats.firstSeen)} icon={Clock} />
        <MiniStat label="Last Seen" value={formatDate(stats.lastSeen)} icon={Clock} />
      </div>

      {/* Entity match info */}
      {entityMatch && (
        <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">Semantic Entity Match</span>
          </div>
          <p className="text-xs text-zinc-400">
            Matched as <span className="text-white font-medium">{entityMatch.entity_type}</span>
            {entityMatch.occurrence_count > 0 &&
              ` with ${entityMatch.occurrence_count} occurrences`}
          </p>
        </div>
      )}

      {/* Dominant activity types */}
      {stats.dominantTypes.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Top Activity Types</p>
          <div className="flex flex-wrap gap-2">
            {stats.dominantTypes.map(([type, count]) => {
              const Icon = getActivityIcon(type);
              return (
                <div
                  key={type}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg"
                >
                  <Icon className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-zinc-300 capitalize">{type}</span>
                  <span className="text-[10px] text-zinc-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineSection({ activities, personName }) {
  const [showAll, setShowAll] = useState(false);

  if (!activities?.length) {
    return (
      <EmptyState
        icon={Clock}
        message="No timeline events yet"
        sub={`Activity builds automatically as you work with ${personName || 'this contact'} through email, meetings, and other interactions.`}
        showTrackingLink
      />
    );
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(b.occurred_at || b.created_at) - new Date(a.occurred_at || a.created_at)
  );
  const displayed = showAll ? sorted : sorted.slice(0, 8);

  return (
    <div className="space-y-1">
      {displayed.map((act, i) => {
        const Icon = getActivityIcon(act.activity_type);
        const snippet =
          act.description ||
          act.activity_data?.title ||
          act.activity_data?.subject ||
          act.activity_type ||
          'Activity';
        return (
          <div
            key={act.id || i}
            className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
          >
            <div className="p-1.5 rounded-lg bg-white/[0.04] mt-0.5 flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">{snippet}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 capitalize">
                {act.activity_type}
                {act.source && ` via ${act.source}`}
              </p>
            </div>
            <span className="text-[10px] text-zinc-600 flex-shrink-0 mt-1">
              {formatRelativeTime(act.occurred_at || act.created_at)}
            </span>
          </div>
        );
      })}
      {sorted.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-cyan-400 hover:text-cyan-300 mt-2"
        >
          {showAll ? 'Show less' : `Show all ${sorted.length} activities`}
        </button>
      )}
    </div>
  );
}

function PatternsSection({ activities, personName }) {
  const patterns = useMemo(() => {
    if (!activities?.length) return null;

    const now = new Date();
    const dayMs = 86400000;
    const weekMs = dayMs * 7;

    // Frequency
    const last7 = activities.filter(
      (a) => now - new Date(a.occurred_at || a.created_at) < weekMs
    ).length;
    const last30 = activities.filter(
      (a) => now - new Date(a.occurred_at || a.created_at) < dayMs * 30
    ).length;
    const daily = last7 > 0 ? (last7 / 7).toFixed(1) : '0';
    const weekly = last30 > 0 ? (last30 / 4.3).toFixed(1) : '0';

    // Channels
    const channelCounts = {};
    activities.forEach((a) => {
      const t = a.activity_type || 'other';
      let channel = 'other';
      if (t.includes('email') || t.includes('mail')) channel = 'email';
      else if (t.includes('meet') || t.includes('call') || t.includes('video'))
        channel = 'meeting';
      else if (t.includes('code') || t.includes('commit') || t.includes('dev'))
        channel = 'code';
      else if (t.includes('chat') || t.includes('message')) channel = 'chat';
      else if (t.includes('doc') || t.includes('file')) channel = 'document';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });
    const topChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const totalChannel = Object.values(channelCounts).reduce((s, v) => s + v, 0);

    // Trajectory (compare last 2 weeks)
    const twoWeeksAgo = now - weekMs * 2;
    const recentWeek = activities.filter(
      (a) => now - new Date(a.occurred_at || a.created_at) < weekMs
    ).length;
    const prevWeek = activities.filter((a) => {
      const d = now - new Date(a.occurred_at || a.created_at);
      return d >= weekMs && d < weekMs * 2;
    }).length;
    let trajectory = 'stable';
    if (recentWeek > prevWeek * 1.3) trajectory = 'increasing';
    else if (recentWeek < prevWeek * 0.7) trajectory = 'decreasing';

    return { daily, weekly, monthly: last30, topChannels, totalChannel, trajectory };
  }, [activities]);

  if (!patterns) {
    return (
      <EmptyState
        icon={BarChart3}
        message="Not enough data to detect patterns yet"
        sub={`Keep working with ${personName || 'this contact'} and communication patterns will emerge automatically.`}
        showTrackingLink
      />
    );
  }

  const TrajectoryIcon =
    patterns.trajectory === 'increasing'
      ? TrendingUp
      : patterns.trajectory === 'decreasing'
        ? TrendingDown
        : Minus;
  const trajectoryColor =
    patterns.trajectory === 'increasing'
      ? 'text-emerald-400'
      : patterns.trajectory === 'decreasing'
        ? 'text-red-400'
        : 'text-zinc-400';

  return (
    <div className="space-y-4">
      {/* Frequency */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Communication Frequency</p>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Daily avg" value={patterns.daily} icon={Activity} />
          <MiniStat label="Weekly avg" value={patterns.weekly} icon={Activity} />
          <MiniStat label="Last 30d" value={patterns.monthly} icon={Activity} />
        </div>
      </div>

      {/* Channels */}
      {patterns.topChannels.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Preferred Channels</p>
          <div className="space-y-2">
            {patterns.topChannels.map(([channel, count]) => {
              const pct = patterns.totalChannel > 0 ? (count / patterns.totalChannel) * 100 : 0;
              const Icon = getActivityIcon(channel);
              return (
                <div key={channel} className="flex items-center gap-3">
                  <Icon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-300 capitalize w-16">{channel}</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 w-8 text-right">
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trajectory */}
      <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
        <div className="flex items-center gap-2">
          <TrajectoryIcon className={`w-4 h-4 ${trajectoryColor}`} />
          <span className="text-sm text-zinc-300">Relationship Trajectory</span>
        </div>
        <p className={`text-xs mt-1 capitalize ${trajectoryColor}`}>{patterns.trajectory}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          Based on week-over-week interaction frequency
        </p>
      </div>
    </div>
  );
}

// --- Shared UI ---

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
      <Icon className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub, showTrackingLink }) {
  const { t } = useTheme();
  return (
    <div className="text-center py-8">
      <Icon className={`w-10 h-10 mx-auto mb-3 ${t('text-zinc-300', 'text-white/10')}`} />
      <p className={`text-sm ${t('text-zinc-600', 'text-zinc-400')}`}>{message}</p>
      {sub && <p className={`text-xs mt-2 max-w-[280px] mx-auto leading-relaxed ${t('text-zinc-500', 'text-zinc-500')}`}>{sub}</p>}
      {showTrackingLink && (
        <Link
          to="/desktopactivity"
          className={`inline-flex items-center gap-1 text-xs mt-3 ${t('text-cyan-600 hover:text-cyan-700', 'text-cyan-400 hover:text-cyan-300')} transition-colors`}
        >
          Set up Desktop Tracking
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function SectionPanel({ title, icon: Icon, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <Icon className="w-4 h-4 text-cyan-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// --- Main Component ---

export default function PersonSemanticIntelligence({ prospect }) {
  const { recentEntities } = useSemanticContext();
  const [activities, setActivities] = useState([]);
  const [entityMatch, setEntityMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const personName = `${prospect?.first_name || ''} ${prospect?.last_name || ''}`.trim();
  const companyName = prospect?.company || '';

  useEffect(() => {
    if (!prospect) return;
    fetchPersonData();
  }, [prospect?.id]);

  // Extract email domain for broader matching (e.g. john@acme.com -> "acme")
  const emailDomain = useMemo(() => {
    const email = prospect?.email || prospect?.verified_email || '';
    if (!email.includes('@')) return '';
    const domain = email.split('@')[1]?.split('.')[0] || '';
    // Skip generic email providers
    const generic = ['gmail', 'yahoo', 'hotmail', 'outlook', 'live', 'icloud', 'aol', 'mail', 'protonmail', 'zoho'];
    return generic.includes(domain.toLowerCase()) ? '' : domain;
  }, [prospect?.email, prospect?.verified_email]);

  async function fetchPersonData() {
    setLoading(true);
    try {
      // 1. Try to find matching semantic entity
      // Build search terms: person name, company name, and email domain
      const searchTerms = [personName, companyName, emailDomain].filter(Boolean);
      let matchedEntity = null;

      // Check cached entities from context first
      if (recentEntities?.length) {
        matchedEntity = recentEntities.find((e) => {
          const name = (e.name || e.entity_name || '').toLowerCase();
          return searchTerms.some(
            (t) => t && name.includes(t.toLowerCase())
          );
        });
      }

      // If not in cache, query DB
      if (!matchedEntity && searchTerms.length > 0) {
        const { data: entities } = await supabase
          .from('semantic_entities')
          .select('*')
          .or(
            searchTerms
              .map((t) => `name.ilike.%${t}%`)
              .join(',')
          )
          .limit(1);
        if (entities?.length) matchedEntity = entities[0];
      }

      setEntityMatch(matchedEntity);

      // 2. Query activities related to this person via semantic threads
      // semantic_activities doesn't have a description column — activity context
      // lives in metadata (JSONB) and linked threads. Query threads that mention
      // this entity, then get activities from those threads.
      if (matchedEntity) {
        // Get threads where this entity appears in primary_entities
        const { data: threads } = await supabase
          .from('semantic_threads')
          .select('thread_id, title, primary_activity_type, primary_entities, last_activity_at')
          .contains('primary_entities', [{ name: matchedEntity.name }])
          .order('last_activity_at', { ascending: false })
          .limit(20);

        // Convert threads to activity-like entries for display
        if (threads?.length) {
          const threadActivities = threads.map((t) => ({
            id: t.thread_id,
            activity_type: t.primary_activity_type || 'mixed',
            description: t.title || 'Work thread',
            created_at: t.last_activity_at,
            source: 'thread',
          }));
          setActivities(threadActivities);
        }
      } else if (personName || companyName) {
        // Fallback: search metadata JSONB for name mentions
        const searchTerm = personName || companyName;
        const { data: acts } = await supabase
          .from('semantic_activities')
          .select('*')
          .ilike('metadata->>app_name', `%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(50);
        setActivities(acts || []);
      }
    } catch (err) {
      console.warn('[PersonSemanticIntelligence] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'patterns', label: 'Patterns', icon: BarChart3 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeSection === s.id
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {activeSection === 'overview' && (
        <SectionPanel title="Interaction Overview" icon={Activity}>
          <OverviewSection activities={activities} entityMatch={entityMatch} personName={personName} />
        </SectionPanel>
      )}

      {activeSection === 'timeline' && (
        <SectionPanel title="Activity Timeline" icon={Clock}>
          <TimelineSection activities={activities} personName={personName} />
        </SectionPanel>
      )}

      {activeSection === 'patterns' && (
        <SectionPanel title="Communication Patterns" icon={BarChart3}>
          <PatternsSection activities={activities} personName={personName} />
        </SectionPanel>
      )}
    </motion.div>
  );
}
