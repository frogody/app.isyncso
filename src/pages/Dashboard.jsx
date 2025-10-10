
import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/api/entities";
import { Candidate } from "@/api/entities";
import { OutreachMessage } from "@/api/entities";
import { Task } from "@/api/entities";
import { Project } from "@/api/entities";
import { useTranslation } from "@/components/utils/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  MessageSquare,
  CheckSquare,
  Briefcase,
  Clock,
  Zap,
  Calendar,
  Activity,
  Award,
  ChevronRight,
  Brain,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [outreachMessages, setOutreachMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const { t } = useTranslation(user?.language || 'nl');

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const userData = await User.me();
        setUser(userData);

        // Load all data in parallel
        const [candidatesData, outreachData, tasksData, projectsData] = await Promise.all([
          userData.organization_id
            ? Candidate.filter({ organization_id: userData.organization_id }, "-created_date", 500)
            : Candidate.list("-created_date", 500),
          userData.organization_id
            ? OutreachMessage.filter({ organization_id: userData.organization_id }, "-sent_at", 500)
            : OutreachMessage.list("-sent_at", 500),
          userData.organization_id
            ? Task.filter({ organization_id: userData.organization_id }, "-created_date", 500)
            : Task.list("-created_date", 500),
          userData.organization_id
            ? Project.filter({ organization_id: userData.organization_id }, "-updated_date", 100)
            : Project.list("-updated_date", 100),
        ]);

        setCandidates(candidatesData);
        setOutreachMessages(outreachData);
        setTasks(tasksData);
        setProjects(projectsData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // Personalized greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const lang = user?.language || 'nl';
    
    if (lang === 'nl') {
      if (hour < 12) return 'Goedemorgen';
      if (hour < 18) return 'Goedemiddag';
      return 'Goedenavond';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
  }, [user]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalCandidates = candidates.length;
    const hotLeads = candidates.filter(c => c.intelligence_score >= 70).length;
    const activeCandidates = candidates.filter(c => !c.contacted).length;
    
    const totalOutreach = outreachMessages.length;
    const responded = outreachMessages.filter(m => m.response_received || m.status === 'responded').length;
    const interested = outreachMessages.filter(m => m.status === 'interested').length;
    const responseRate = totalOutreach > 0 ? Math.round((responded / totalOutreach) * 100) : 0;

    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date() && t.status !== 'completed';
    }).length;
    const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const today = new Date().toDateString();
      return new Date(t.due_date).toDateString() === today && t.status !== 'completed';
    }).length;

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active_search' || p.status === 'discovery').length;
    const urgentProjects = projects.filter(p => p.priority === 'urgent').length;

    // Recent activity (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const newCandidatesWeek = candidates.filter(c => new Date(c.created_date) > last7Days).length;
    const newOutreachWeek = outreachMessages.filter(m => new Date(m.sent_at) > last7Days).length;
    const completedTasksWeek = tasks.filter(t => 
      t.status === 'completed' && t.completed_at && new Date(t.completed_at) > last7Days
    ).length;

    return {
      totalCandidates,
      hotLeads,
      activeCandidates,
      totalOutreach,
      responded,
      interested,
      responseRate,
      totalTasks,
      pendingTasks,
      overdueTasks,
      todayTasks,
      totalProjects,
      activeProjects,
      urgentProjects,
      newCandidatesWeek,
      newOutreachWeek,
      completedTasksWeek,
    };
  }, [candidates, outreachMessages, tasks, projects]);

  // Top performers (highest intelligence scores)
  const topCandidates = useMemo(() => {
    return [...candidates]
      .filter(c => c.intelligence_score)
      .sort((a, b) => (b.intelligence_score || 0) - (a.intelligence_score || 0))
      .slice(0, 5);
  }, [candidates]);

  // Upcoming tasks
  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter(t => t.status !== 'completed' && t.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);
  }, [tasks]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities = [];

    // Recent candidates
    candidates.slice(0, 3).forEach(c => {
      activities.push({
        type: 'candidate',
        title: `${c.first_name} ${c.last_name} added`,
        subtitle: c.company_name,
        time: c.created_date,
        icon: Users,
      });
    });

    // Recent outreach
    outreachMessages.slice(0, 3).forEach(m => {
      activities.push({
        type: 'outreach',
        title: `Message sent to ${m.candidate_name}`,
        subtitle: m.status,
        time: m.sent_at,
        icon: MessageSquare,
      });
    });

    // Recent tasks
    tasks.slice(0, 3).forEach(t => {
      activities.push({
        type: 'task',
        title: t.title,
        subtitle: t.status,
        time: t.created_date,
        icon: CheckSquare,
      });
    });

    return activities
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);
  }, [candidates, outreachMessages, tasks]);

  // Personalized insights
  const insights = useMemo(() => {
    const insights = [];

    if (metrics.hotLeads > 0) {
      insights.push({
        type: 'success',
        title: user?.language === 'nl' ? `${metrics.hotLeads} hot leads beschikbaar` : `${metrics.hotLeads} hot leads available`,
        action: user?.language === 'nl' ? 'Bekijk kandidaten' : 'View candidates',
        actionUrl: createPageUrl('CandidateAnalytics'),
      });
    }

    if (metrics.overdueTasks > 0) {
      insights.push({
        type: 'warning',
        title: user?.language === 'nl' ? `${metrics.overdueTasks} taken verlopen` : `${metrics.overdueTasks} tasks overdue`,
        action: user?.language === 'nl' ? 'Bekijk taken' : 'View tasks',
        actionUrl: createPageUrl('Tasks'),
      });
    }

    if (metrics.responseRate > 50) {
      insights.push({
        type: 'success',
        title: user?.language === 'nl' ? `Sterke respons rate van ${metrics.responseRate}%` : `Strong response rate of ${metrics.responseRate}%`,
        action: user?.language === 'nl' ? 'Bekijk outreach' : 'View outreach',
        actionUrl: createPageUrl('Outreach'),
      });
    }

    if (metrics.activeCandidates > metrics.totalCandidates * 0.7) {
      insights.push({
        type: 'info',
        title: user?.language === 'nl' ? 'Veel nieuwe kandidaten om te benaderen' : 'Many new candidates to reach out to',
        action: user?.language === 'nl' ? 'Start outreach' : 'Start outreach',
        actionUrl: createPageUrl('Candidates'),
      });
    }

    return insights.slice(0, 3);
  }, [metrics, user]);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const lang = user?.language || 'nl';

    if (diffMins < 1) return lang === 'nl' ? 'Net nu' : 'Just now';
    if (diffMins < 60) return `${diffMins}${lang === 'nl' ? 'm' : 'm'}`;
    if (diffHours < 24) return `${diffHours}${lang === 'nl' ? 'u' : 'h'}`;
    if (diffDays < 7) return `${diffDays}${lang === 'nl' ? 'd' : 'd'}`;
    return date.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>
            {user?.language === 'nl' ? 'Dashboard laden...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      <style>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
        }
        .btn-outline {
          background: rgba(255,255,255,.04) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.08) !important;
        }
      `}</style>

      <div className="max-w-none mx-auto space-y-6">
        {/* Header with Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <IconWrapper icon={Activity} size={36} variant="muted" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--txt)' }}>
                {greeting}, {user?.full_name?.split(' ')[0] || 'there'}
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Hier is je overzicht voor vandaag' : "Here's your overview for today"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Personalized Insights */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {insights.map((insight, idx) => (
              <Link key={idx} to={insight.actionUrl}>
                <Card
                  className="glass-card cursor-pointer hover:bg-white/[0.06] transition-all"
                  style={{
                    background: insight.type === 'success'
                      ? 'linear-gradient(135deg, rgba(34,197,94,.08), rgba(22,163,74,.06))'
                      : insight.type === 'warning'
                      ? 'linear-gradient(135deg, rgba(234,179,8,.08), rgba(202,138,4,.06))'
                      : 'linear-gradient(135deg, rgba(59,130,246,.08), rgba(37,99,235,.06))',
                    borderColor: insight.type === 'success'
                      ? 'rgba(34,197,94,.2)'
                      : insight.type === 'warning'
                      ? 'rgba(234,179,8,.2)'
                      : 'rgba(59,130,246,.2)',
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
                        {insight.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {insight.action}
                      </p>
                    </div>
                    <IconWrapper icon={ChevronRight} size={20} variant="muted" glow={false} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </motion.div>
        )}

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <IconWrapper icon={Users} size={32} variant="muted" />
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                  +{metrics.newCandidatesWeek}
                </Badge>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                {metrics.totalCandidates}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Totaal Kandidaten' : 'Total Candidates'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <IconWrapper icon={TrendingUp} size={32} variant="muted" />
                <Badge className="bg-red-500/10 text-red-400 border-red-500/30">
                  {metrics.hotLeads}
                </Badge>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                {metrics.hotLeads}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Hot Leads' : 'Hot Leads'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <IconWrapper icon={MessageSquare} size={32} variant="muted" />
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {metrics.responseRate}%
                </Badge>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                {metrics.responded}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Responses' : 'Responses'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <IconWrapper icon={CheckSquare} size={32} variant="muted" />
                {metrics.overdueTasks > 0 && (
                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                    {metrics.overdueTasks}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                {metrics.pendingTasks}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {user?.language === 'nl' ? 'Taken Open' : 'Tasks Pending'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Larger */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity This Week */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <IconWrapper icon={Activity} size={24} variant="muted" />
                    {user?.language === 'nl' ? 'Activiteit Deze Week' : 'Activity This Week'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.02)' }}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                        {metrics.newCandidatesWeek}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Nieuwe Kandidaten' : 'New Candidates'}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.02)' }}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                        {metrics.newOutreachWeek}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Berichten Verstuurd' : 'Messages Sent'}
                      </p>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.02)' }}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--txt)' }}>
                        {metrics.completedTasksWeek}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Taken Voltooid' : 'Tasks Completed'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Candidates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <IconWrapper icon={Award} size={24} variant="muted" />
                    {user?.language === 'nl' ? 'Top Kandidaten' : 'Top Candidates'}
                  </CardTitle>
                  <Link to={createPageUrl('CandidateAnalytics')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      style={{ color: 'var(--accent)' }}
                    >
                      {user?.language === 'nl' ? 'Bekijk Alles' : 'View All'}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCandidates.length === 0 ? (
                      <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Geen kandidaten met intelligence scores' : 'No candidates with intelligence scores'}
                      </p>
                    ) : (
                      topCandidates.map((candidate, idx) => (
                        <Link key={candidate.id} to={createPageUrl('CandidateProfile') + `?id=${candidate.id}`}>
                          <div
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-all"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                              style={{
                                background: idx === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                                           idx === 1 ? 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' :
                                           idx === 2 ? 'linear-gradient(135deg, #CD7F32, #B87333)' :
                                           'rgba(255,255,255,.08)',
                                color: idx < 3 ? '#000' : 'var(--txt)'
                              }}
                            >
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate" style={{ color: 'var(--txt)' }}>
                                {candidate.first_name} {candidate.last_name}
                              </p>
                              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                                {candidate.job_title} • {candidate.company_name}
                              </p>
                            </div>
                            <Badge
                              style={{
                                background: 'rgba(239,68,68,.12)',
                                color: '#FFCCCB',
                                border: '1px solid rgba(239,68,68,.3)',
                              }}
                            >
                              {candidate.intelligence_score}
                            </Badge>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <IconWrapper icon={Clock} size={24} variant="muted" />
                    {user?.language === 'nl' ? 'Recente Activiteit' : 'Recent Activity'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Geen recente activiteit' : 'No recent activity'}
                      </p>
                    ) : (
                      recentActivity.map((activity, idx) => {
                        const Icon = activity.icon;
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-all"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(255,255,255,.08)' }}
                            >
                              <Icon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
                                {activity.title}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                {activity.subtitle}
                              </p>
                            </div>
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                              {formatTimeAgo(activity.time)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <IconWrapper icon={Zap} size={24} variant="muted" />
                    {user?.language === 'nl' ? 'Snelle Acties' : 'Quick Actions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link to={createPageUrl('Candidates')}>
                    <Button className="w-full justify-start btn-outline">
                      <IconWrapper icon={Users} size={18} variant="default" className="mr-2" />
                      {user?.language === 'nl' ? 'Kandidaat Toevoegen' : 'Add Candidate'}
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Chat')}>
                    <Button className="w-full justify-start btn-outline">
                      <SyncAvatar size={18} variant="grey" className="mr-2" />
                      {user?.language === 'nl' ? 'Start SYNC Chat' : 'Start SYNC Chat'}
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Projects')}>
                    <Button className="w-full justify-start btn-outline">
                      <IconWrapper icon={Briefcase} size={18} variant="default" className="mr-2" />
                      {user?.language === 'nl' ? 'Nieuw Project' : 'New Project'}
                    </Button>
                  </Link>
                  <Link to={createPageUrl('CandidateAnalytics')}>
                    <Button className="w-full justify-start btn-outline">
                      <IconWrapper icon={Brain} size={18} variant="default" className="mr-2" />
                      {user?.language === 'nl' ? 'Bekijk Intelligence' : 'View Intelligence'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <IconWrapper icon={Calendar} size={24} variant="muted" />
                    {user?.language === 'nl' ? 'Aankomende Taken' : 'Upcoming Tasks'}
                  </CardTitle>
                  <Link to={createPageUrl('Tasks')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      style={{ color: 'var(--accent)' }}
                    >
                      {user?.language === 'nl' ? 'Bekijk Alles' : 'View All'}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingTasks.length === 0 ? (
                      <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Geen aankomende taken' : 'No upcoming tasks'}
                      </p>
                    ) : (
                      upcomingTasks.map((task) => {
                        const isOverdue = new Date(task.due_date) < new Date();
                        const isToday = new Date(task.due_date).toDateString() === new Date().toDateString();

                        return (
                          <Link key={task.id} to={createPageUrl('Tasks')}>
                            <div className="p-3 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-all">
                              <div className="flex items-start gap-2">
                                <div
                                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                                  style={{
                                    background: task.status === 'completed'
                                      ? 'rgba(34,197,94,.2)'
                                      : 'rgba(255,255,255,.08)',
                                  }}
                                >
                                  {task.status === 'completed' && (
                                    <CheckSquare className="w-3 h-3 text-green-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--txt)' }}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {isOverdue && (
                                      <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                                        {user?.language === 'nl' ? 'Verlopen' : 'Overdue'}
                                      </Badge>
                                    )}
                                    {isToday && !isOverdue && (
                                      <Badge className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                                        {user?.language === 'nl' ? 'Vandaag' : 'Today'}
                                      </Badge>
                                    )}
                                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                                      {new Date(task.due_date).toLocaleDateString(
                                        user?.language === 'nl' ? 'nl-NL' : 'en-US',
                                        { month: 'short', day: 'numeric' }
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Projects Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                    <IconWrapper icon={Briefcase} size={24} variant="muted" />
                    {user?.language === 'nl' ? 'Projecten' : 'Projects'}
                  </CardTitle>
                  <Link to={createPageUrl('Projects')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      style={{ color: 'var(--accent)' }}
                    >
                      {user?.language === 'nl' ? 'Bekijk Alles' : 'View All'}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,.02)' }}>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Totaal' : 'Total'}
                      </span>
                      <span className="font-bold" style={{ color: 'var(--txt)' }}>
                        {metrics.totalProjects}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(34,197,94,.08)' }}>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        {user?.language === 'nl' ? 'Actief' : 'Active'}
                      </span>
                      <span className="font-bold text-green-400">
                        {metrics.activeProjects}
                      </span>
                    </div>
                    {metrics.urgentProjects > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(239,68,68,.08)' }}>
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>
                          {user?.language === 'nl' ? 'Urgent' : 'Urgent'}
                        </span>
                        <span className="font-bold" style={{ color: 'var(--accent)' }}>
                          {metrics.urgentProjects}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
