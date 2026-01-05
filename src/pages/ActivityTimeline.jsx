
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ActivitySession } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  Zap,
  Code,
  Layers,
  Wrench
} from "lucide-react";

export default function ActivityTimeline() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMinutes: 0,
    avgProductivity: 0,
    avgFocus: 0
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const user = await base44.auth.me();
      const data = await ActivitySession.filter({ 
        user_id: user.id 
      });
      
      // Sort by most recent first
      const sorted = data.sort((a, b) => 
        new Date(b.session_start) - new Date(a.session_start)
      );
      
      setActivities(sorted);
      
      // Calculate stats
      const totalMinutes = sorted.reduce((sum, a) => sum + (a.total_active_minutes || 0), 0);
      const avgProductivity = sorted.length > 0
        ? sorted.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / sorted.length
        : 0;
      const avgFocus = sorted.length > 0
        ? sorted.reduce((sum, a) => sum + (a.focus_score || 0), 0) / sorted.length
        : 0;
      
      setStats({
        totalSessions: sorted.length,
        totalMinutes: totalMinutes,
        avgProductivity: Math.round(avgProductivity * 100),
        avgFocus: Math.round(avgFocus * 100)
      });
      
    } catch (err) {
      console.error("Error loading activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getActivityTypeColor = (type) => {
    const colors = {
      coding: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      research: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      documentation: "bg-green-500/20 text-green-400 border-green-500/30",
      design: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      meeting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      default: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    };
    return colors[type] || colors.default;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-gray-800" />
            ))}
          </div>
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Activity Timeline</h1>
          <p className="text-gray-400">Your tracked work sessions and activities</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-blue-400" />
              <div className="text-3xl font-bold text-white">{stats.totalSessions}</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Total Sessions</h3>
              <p className="text-sm text-gray-400">Tracked activities</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-green-400" />
              <div className="text-3xl font-bold text-white">
                {Math.round(stats.totalMinutes / 60)}h
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Total Time</h3>
              <p className="text-sm text-gray-400">Active learning</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <div className="text-3xl font-bold text-white">{stats.avgProductivity}%</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Avg Productivity</h3>
              <p className="text-sm text-gray-400">Overall score</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-amber-400" />
              <div className="text-3xl font-bold text-white">{stats.avgFocus}%</div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Avg Focus</h3>
              <p className="text-sm text-gray-400">Concentration level</p>
            </div>
          </Card>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {activities.length === 0 ? (
            <Card className="glass-card border-0 p-12">
              <div className="text-center">
                <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Activities Yet
                </h3>
                <p className="text-gray-400 mb-4">
                  Install and run the LearningTracker app to start tracking your activities
                </p>
              </div>
            </Card>
          ) : (
            activities.map((activity, index) => (
              <Card key={activity.id} className="glass-card border-0">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getActivityTypeColor(activity.primary_activity_type)}>
                          {activity.primary_activity_type || 'General'}
                        </Badge>
                        <span className="text-gray-400 text-sm">
                          {new Date(activity.session_start).toLocaleString()}
                        </span>
                      </div>
                      
                      {activity.application_name && (
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {activity.application_name}
                        </h3>
                      )}
                      
                      {activity.window_title && (
                        <p className="text-gray-300 mb-3">{activity.window_title}</p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {formatDuration(activity.total_active_minutes || 0)}
                      </div>
                      <div className="text-sm text-gray-400">Duration</div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="text-lg font-bold text-purple-400">
                        {Math.round((activity.productivity_score || 0) * 100)}%
                      </div>
                      <div className="text-xs text-gray-400">Productivity</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="text-lg font-bold text-amber-400">
                        {Math.round((activity.focus_score || 0) * 100)}%
                      </div>
                      <div className="text-xs text-gray-400">Focus</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="text-lg font-bold text-blue-400">
                        {activity.context_switches_count || 0}
                      </div>
                      <div className="text-xs text-gray-400">Switches</div>
                    </div>
                  </div>

                  {/* Workflow Summary */}
                  {activity.workflow_summary && (
                    <div className="space-y-3 pt-4 border-t border-gray-700">
                      {activity.workflow_summary.languages_used && activity.workflow_summary.languages_used.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Code className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-1">Languages:</p>
                            <div className="flex flex-wrap gap-2">
                              {activity.workflow_summary.languages_used.map((lang, i) => (
                                <Badge key={i} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  {lang}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activity.workflow_summary.frameworks && activity.workflow_summary.frameworks.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Layers className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-1">Frameworks:</p>
                            <div className="flex flex-wrap gap-2">
                              {activity.workflow_summary.frameworks.map((fw, i) => (
                                <Badge key={i} className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  {fw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {activity.workflow_summary.tools_used && activity.workflow_summary.tools_used.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Wrench className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-400 mb-1">Tools:</p>
                            <div className="flex flex-wrap gap-2">
                              {activity.workflow_summary.tools_used.map((tool, i) => (
                                <Badge key={i} className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
