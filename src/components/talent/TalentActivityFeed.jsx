/**
 * Talent Activity Feed
 * Shows recent activity across the talent pipeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Send,
  MessageSquare,
  Package,
  RefreshCw,
  Clock,
  ChevronRight,
  Activity,
  Loader2,
  Target,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';

// Activity type configurations
const ACTIVITY_TYPES = {
  candidate_matched: {
    icon: Brain,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Candidate Matched',
  },
  intelligence_ready: {
    icon: Sparkles,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Intelligence Ready',
  },
  message_sent: {
    icon: Send,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Message Sent',
  },
  reply_received: {
    icon: MessageSquare,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Reply Received',
  },
  nest_purchased: {
    icon: Package,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Nest Purchased',
  },
  campaign_created: {
    icon: Target,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Campaign Created',
  },
  candidate_added: {
    icon: UserPlus,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Candidate Added',
  },
};

// Format relative time
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TalentActivityFeed = ({ organizationId, limit = 10, showHeader = true }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!organizationId) return;

    try {
      const allActivities = [];

      // Fetch recent outreach tasks (sent messages and replies)
      const { data: outreachTasks } = await supabase
        .from('outreach_tasks')
        .select(`
          id,
          status,
          sent_at,
          replied_at,
          created_date,
          campaign_id,
          candidate:candidate_id(id, first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .or('status.eq.sent,status.eq.replied')
        .order('created_date', { ascending: false })
        .limit(20);

      // Process outreach tasks into activities
      (outreachTasks || []).forEach(task => {
        const candidateName = task.candidate
          ? `${task.candidate.first_name || ''} ${task.candidate.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown';

        if (task.status === 'replied' && task.replied_at) {
          allActivities.push({
            id: `reply-${task.id}`,
            type: 'reply_received',
            description: `Received reply from ${candidateName}`,
            timestamp: task.replied_at,
            link: `/TalentCampaignDetail?id=${task.campaign_id}&tab=outreach`,
          });
        }

        if (task.sent_at) {
          allActivities.push({
            id: `sent-${task.id}`,
            type: 'message_sent',
            description: `Message sent to ${candidateName}`,
            timestamp: task.sent_at,
            link: `/TalentCampaignDetail?id=${task.campaign_id}&tab=outreach`,
          });
        }
      });

      // Fetch recent nest purchases
      const { data: purchases } = await supabase
        .from('nest_purchases')
        .select(`
          id,
          created_at,
          nest:nest_id(id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      (purchases || []).forEach(purchase => {
        const nestName = purchase.nest?.name || 'a nest';
        allActivities.push({
          id: `purchase-${purchase.id}`,
          type: 'nest_purchased',
          description: `Purchased "${nestName}"`,
          timestamp: purchase.created_at,
          link: `/TalentNestDetail?id=${purchase.nest?.id || ''}`,
        });
      });

      // Fetch recent campaigns (for matched candidates)
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, matched_candidates, created_date, updated_date')
        .eq('organization_id', organizationId)
        .not('matched_candidates', 'is', null)
        .order('updated_date', { ascending: false })
        .limit(10);

      (campaigns || []).forEach(campaign => {
        const matches = campaign.matched_candidates || [];
        // Get recent matches (those added in the last 24 hours based on added_at)
        const recentMatches = matches.filter(m => {
          if (!m.added_at) return false;
          const addedDate = new Date(m.added_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return addedDate > dayAgo;
        }).slice(0, 3); // Limit to 3 per campaign

        recentMatches.forEach(match => {
          allActivities.push({
            id: `match-${campaign.id}-${match.candidate_id}`,
            type: 'candidate_matched',
            description: `AI matched ${match.candidate_name || 'candidate'} to ${campaign.name}`,
            timestamp: match.added_at,
            link: `/TalentCampaignDetail?id=${campaign.id}`,
          });
        });
      });

      // Fetch candidates with recent intelligence completion
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id, first_name, last_name, intelligence_generated, updated_at')
        .eq('organization_id', organizationId)
        .eq('intelligence_generated', true)
        .order('updated_at', { ascending: false })
        .limit(10);

      (candidates || []).forEach(candidate => {
        const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unknown';
        // Only show if updated in last 7 days (intelligence was recently generated)
        const updatedDate = new Date(candidate.updated_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (updatedDate > weekAgo) {
          allActivities.push({
            id: `intel-${candidate.id}`,
            type: 'intelligence_ready',
            description: `Intelligence ready for ${name}`,
            timestamp: candidate.updated_at,
            link: `/talent/candidates/${candidate.id}`,
          });
        }
      });

      // Sort all activities by timestamp DESC and take top N
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(allActivities.slice(0, limit));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Set up real-time subscription for outreach_tasks
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('talent-activities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outreach_tasks',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Refresh on any outreach task change
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchActivities]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const handleActivityClick = (activity) => {
    if (activity.link) {
      navigate(activity.link);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Activity className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Recent Activity</h3>
                <p className="text-xs text-zinc-500">What's happening in your pipeline</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">No recent activity</p>
            <p className="text-xs text-zinc-600 mt-1">
              Activity will appear here as you use the platform
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            <AnimatePresence mode="popLayout">
              {activities.map((activity, index) => {
                const config = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.candidate_matched;
                const Icon = config.icon;

                return (
                  <motion.button
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleActivityClick(activity)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors text-left group"
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white group-hover:text-white/90 line-clamp-2">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-500">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
          <button
            onClick={() => navigate('/talent/activity')}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 w-full justify-center"
          >
            View All Activity
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TalentActivityFeed;
