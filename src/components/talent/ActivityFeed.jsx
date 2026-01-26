import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Mail,
  Target,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  Zap,
  Upload,
  UserPlus,
  Send,
  Eye,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Format relative time
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

export default function ActivityFeed({ limit = 10, showHeader = true, compact = false }) {
  const { user } = useUser();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    fetchActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel(`activity-feed-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Fetch the activity with related data
          fetchActivityById(payload.new.id).then((activity) => {
            if (activity) {
              setActivities((prev) => [activity, ...prev.slice(0, limit - 1)]);
            }
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, limit]);

  const fetchActivityById = async (id) => {
    const { data } = await supabase
      .from("activity_log")
      .select(
        `
        *,
        candidate:candidates(id, first_name, last_name),
        campaign:campaigns(id, name)
      `
      )
      .eq("id", id)
      .single();
    return data;
  };

  const fetchActivities = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select(
          `
          *,
          candidate:candidates(id, first_name, last_name),
          campaign:campaigns(id, name)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error) setActivities(data || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      intel_queued: Clock,
      intel_complete: Brain,
      candidate_matched: Target,
      candidate_added: UserPlus,
      candidates_imported: Upload,
      outreach_sent: Send,
      outreach_opened: Eye,
      response_received: MessageSquare,
      campaign_created: Zap,
      campaign_started: Users,
      campaign_completed: CheckCircle,
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type) => {
    const colors = {
      intel_queued: "bg-zinc-700 text-zinc-400",
      intel_complete: "bg-cyan-500/20 text-cyan-400",
      candidate_matched: "bg-green-500/20 text-green-400",
      candidate_added: "bg-blue-500/20 text-blue-400",
      candidates_imported: "bg-indigo-500/20 text-indigo-400",
      outreach_sent: "bg-purple-500/20 text-purple-400",
      outreach_opened: "bg-amber-500/20 text-amber-400",
      response_received: "bg-yellow-500/20 text-yellow-400",
      campaign_created: "bg-red-500/20 text-red-400",
      campaign_started: "bg-orange-500/20 text-orange-400",
      campaign_completed: "bg-emerald-500/20 text-emerald-400",
    };
    return colors[type] || "bg-zinc-700 text-zinc-400";
  };

  const getCandidateName = (activity) => {
    if (activity.candidate) {
      return `${activity.candidate.first_name || ""} ${activity.candidate.last_name || ""}`.trim();
    }
    return "candidate";
  };

  const getActivityMessage = (activity) => {
    const candidateName = getCandidateName(activity);
    const campaignName = activity.campaign?.name || "campaign";

    const messages = {
      intel_queued: `Intel analysis queued for ${candidateName}`,
      intel_complete: `Intel analysis completed for ${candidateName}`,
      candidate_matched: `${candidateName} matched to ${campaignName}`,
      candidate_added: `${candidateName} added to talent pool`,
      candidates_imported: activity.metadata?.count
        ? `${activity.metadata.count} candidates imported`
        : "Candidates imported",
      outreach_sent: `Outreach sent to ${candidateName}`,
      outreach_opened: `${candidateName} opened your message`,
      response_received: `${candidateName} responded to outreach`,
      campaign_created: `Campaign "${campaignName}" created`,
      campaign_started: `Campaign "${campaignName}" started`,
      campaign_completed: `Campaign "${campaignName}" completed`,
    };
    return messages[activity.type] || activity.description || "Activity recorded";
  };

  const getActivityLink = (activity) => {
    if (activity.candidate?.id) {
      return `${createPageUrl("TalentCandidates")}?id=${activity.candidate.id}`;
    }
    if (activity.campaign?.id) {
      return `${createPageUrl("TalentCampaignDetail")}?id=${activity.campaign.id}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${compact ? "" : "p-4"}`}>
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-800 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={compact ? "" : "space-y-4"}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-400" />
            Recent Activity
          </h3>
          <button
            onClick={() => navigate(createPageUrl("TalentDashboard") + "?tab=activity")}
            className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No recent activity</p>
          <p className="text-xs mt-1 text-zinc-600">
            Activity will appear here as you work
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity, i) => {
            const Icon = getActivityIcon(activity.type);
            const link = getActivityLink(activity);

            const content = (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  link
                    ? "hover:bg-zinc-800/50 cursor-pointer"
                    : "bg-zinc-800/20"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${getActivityColor(activity.type)}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 leading-snug">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatRelativeTime(activity.created_at)}
                  </p>
                </div>
              </motion.div>
            );

            if (link) {
              return (
                <button
                  key={activity.id}
                  onClick={() => navigate(link)}
                  className="w-full text-left"
                >
                  {content}
                </button>
              );
            }

            return <div key={activity.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
