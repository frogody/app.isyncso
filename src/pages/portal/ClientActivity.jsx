import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, MessageSquare, CheckCircle2, FileText, Loader2, Inbox, ChevronRight } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { usePortalClientContext, usePortalSettings } from '@/components/portal/ClientProvider';

const ICON_MAP = {
  comment: { icon: MessageSquare, color: '#06b6d4' },
  approval: { icon: CheckCircle2, color: '#10b981' },
  file: { icon: FileText, color: '#8b5cf6' },
  update: { icon: Activity, color: '#f59e0b' },
};

export default function ClientActivity() {
  const { client } = usePortalClientContext();
  const settings = usePortalSettings();
  const { org: orgSlug } = useParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const basePath = `/portal/${orgSlug || client?.organization?.slug || ''}`;

  useEffect(() => {
    const fetchActivity = async () => {
      if (!client) return;
      try {
        const { data } = await supabase
          .from('portal_activity')
          .select('*')
          .eq('organization_id', client.organization_id)
          .order('created_at', { ascending: false })
          .limit(50);
        setActivities(data || []);
      } catch (err) {
        console.error('Error fetching activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [client]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: settings.primary_color }} />
          <p className="text-zinc-500 text-sm">Loading activity...</p>
        </div>
      </div>
    );
  }

  // Group by date
  const grouped = {};
  activities.forEach((a) => {
    const dateKey = new Date(a.created_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(a);
  });
  const dateKeys = Object.keys(grouped);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
        <Link to={basePath} className="hover:text-zinc-300 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-300">Activity</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Activity</h1>
        <p className="text-zinc-400 mt-2">A timeline of recent activity across your projects.</p>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-zinc-600" />
          </div>
          <p className="text-white font-medium">No activity yet</p>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs">
            Activity from your projects will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                {dateKey}
              </h3>
              <div className="relative pl-6 border-l border-zinc-800/60">
                {grouped[dateKey].map((activity) => (
                  <ActivityTimelineItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTimelineItem({ activity }) {
  const config = ICON_MAP[activity.action_type] || ICON_MAP.update;
  const Icon = config.icon;

  const time = new Date(activity.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="relative pb-6 last:pb-0">
      {/* Dot on timeline */}
      <div
        className="absolute -left-[calc(0.75rem+1.5px)] top-1 w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <Icon className="w-3 h-3" style={{ color: config.color }} />
      </div>

      <div className="ml-4 p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-zinc-800/60 rounded-xl transition-colors">
        <p className="text-sm text-zinc-300">{activity.description}</p>
        <p className="text-xs text-zinc-600 mt-2">{time}</p>
      </div>
    </div>
  );
}
