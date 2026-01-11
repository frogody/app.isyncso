import React, { useState, useEffect } from "react";
import { db } from "@/api/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  TrendingUp,
  Target,
  Brain,
  Clock,
  Flame,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Trophy
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await db.functions.invoke('user/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-card border-0 p-8">
            <div className="text-center space-y-4">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Error Loading Dashboard</h2>
              <p className="text-gray-400">{error}</p>
              <Button onClick={loadDashboard} className="btn-primary">
                Retry
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const { activity_summary, top_skills, recommendations, pending_challenges, needs_attention } = dashboardData || {};
  const weekActivity = activity_summary?.last_7_days || {};

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Your Learning Journey</h1>
            <p className="text-gray-400">Track your skills and progress automatically</p>
          </div>
          <Link to={createPageUrl("DownloadApp")}>
            <Button className="btn-primary">
              <Activity className="w-4 h-4 mr-2" />
              Get Desktop App
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-emerald-400" />
              <div className="text-3xl font-bold text-white">
                {weekActivity.total_active_minutes ? Math.round(weekActivity.total_active_minutes / 60) : 0}h
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Active Time</h3>
              <p className="text-sm text-gray-400">Last 7 days</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-blue-400" />
              <div className="text-3xl font-bold text-white">
                {weekActivity.total_sessions || 0}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Sessions</h3>
              <p className="text-sm text-gray-400">This week</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-purple-400" />
              <div className="text-3xl font-bold text-white">
                {Math.round((weekActivity.avg_focus_score || 0) * 100)}%
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Focus Score</h3>
              <p className="text-sm text-gray-400">Average</p>
            </div>
          </Card>

          <Card className="glass-card border-0 p-6 bg-gradient-to-br from-amber-500/20 to-amber-600/20">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-amber-400" />
              <div className="text-3xl font-bold text-white">
                {Math.round((weekActivity.avg_productivity_score || 0) * 100)}%
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Productivity</h3>
              <p className="text-sm text-gray-400">Average</p>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Skills Progress */}
          <div className="xl:col-span-2 space-y-8">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  Skills Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!top_skills || top_skills.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No skills tracked yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Install the desktop app to start tracking your skills
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {top_skills.map((skill, index) => (
                      <div key={index} className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {skill.days_since_last_use === 0 && (
                                <Flame className="w-4 h-4 text-orange-400" title="Used today" />
                              )}
                              {skill.days_since_last_use > 30 && (
                                <AlertTriangle className="w-4 h-4 text-yellow-400" title="Needs practice" />
                              )}
                              {skill.trajectory === 'improving' && (
                                <TrendingUp className="w-4 h-4 text-emerald-400" title="Improving" />
                              )}
                            </div>
                            <h4 className="font-medium text-white">{skill.skill_name}</h4>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">
                              {Math.round(skill.proficiency * 100)}%
                            </div>
                            <div className="text-xs text-gray-400 capitalize">
                              {skill.trajectory}
                            </div>
                          </div>
                        </div>
                        <Progress value={skill.proficiency * 100} className="h-2" />
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{skill.total_applications} applications</span>
                          <span>
                            {skill.days_since_last_use === 0
                              ? 'Used today'
                              : skill.days_since_last_use === 1
                              ? 'Used yesterday'
                              : `${skill.days_since_last_use} days ago`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <Link to={createPageUrl("SkillsOverview")}>
                    <Button variant="outline" className="w-full border-gray-700 text-gray-300">
                      View All Skills
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Courses */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Recommended Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!recommendations || recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No recommendations yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      We'll recommend courses based on your activity
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="p-4 rounded-lg bg-gray-800/30 border border-emerald-500/20 hover:border-emerald-400/40 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-white">{rec.title}</h4>
                              <Badge className={`${
                                rec.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                rec.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-emerald-300 mb-2">
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              {rec.reason}
                            </p>
                          </div>
                          <Link to={createPageUrl(`CourseDetail?id=${rec.course_id}`)}>
                            <Button size="sm" className="btn-primary">
                              Start
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <Link to={createPageUrl("RecommendationsFeed")}>
                    <Button variant="outline" className="w-full border-gray-700 text-gray-300">
                      View All Recommendations
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Practice Challenges */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Practice Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!pending_challenges || pending_challenges.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No challenges yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pending_challenges.map((challenge, index) => (
                      <div key={index} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <h5 className="font-medium text-white text-sm">{challenge.skill_name}</h5>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          {challenge.challenge_description}
                        </p>
                        <Button size="sm" className="w-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">
                          Accept Challenge
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attention Needed */}
            {needs_attention && (
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {needs_attention.declining_skills > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-300">Declining Skills</span>
                        <Badge className="bg-red-500/20 text-red-400">
                          {needs_attention.declining_skills}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {needs_attention.unused_skills > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-yellow-300">Unused Skills (30+ days)</span>
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          {needs_attention.unused_skills}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {needs_attention.active_gaps > 0 && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-orange-300">Skill Gaps</span>
                        <Badge className="bg-orange-500/20 text-orange-400">
                          {needs_attention.active_gaps}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <Card className="glass-card border-0">
              <CardContent className="p-6 space-y-3">
                <Link to={createPageUrl("ActivityTimeline")}>
                  <Button variant="outline" className="w-full justify-start border-gray-700 text-gray-300">
                    <Activity className="w-4 h-4 mr-2" />
                    Activity Timeline
                  </Button>
                </Link>
                <Link to={createPageUrl("SkillsOverview")}>
                  <Button variant="outline" className="w-full justify-start border-gray-700 text-gray-300">
                    <Brain className="w-4 h-4 mr-2" />
                    All Skills
                  </Button>
                </Link>
                <Link to={createPageUrl("RecommendationsFeed")}>
                  <Button variant="outline" className="w-full justify-start border-gray-700 text-gray-300">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Recommendations
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}