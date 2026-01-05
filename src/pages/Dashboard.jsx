import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useUser } from "@/components/context/UserContext";
import { motion } from "framer-motion";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Import ALL widget components
import { 
  LearnProgressWidget, LearnStatsWidget, LearnStreakWidget, 
  LearnXPWidget, LearnSkillsWidget, LearnCertificatesWidget 
} from "@/components/dashboard/widgets/LearnWidgets";
import { 
  GrowthPipelineWidget, GrowthValueWidget, GrowthDealsWidget,
  GrowthWinRateWidget, GrowthSignalsWidget, GrowthCampaignsWidget 
} from "@/components/dashboard/widgets/GrowthWidgets";
import { 
  SentinelComplianceWidget, SentinelSystemsWidget, SentinelRiskWidget,
  SentinelTasksWidget, SentinelDocsWidget 
} from "@/components/dashboard/widgets/SentinelWidgets";
import { RecentActionsWidget, QuickActionsWidget } from "@/components/dashboard/widgets/CoreWidgets";

// Widget size configuration
const WIDGET_CONFIG = {
  // Learn widgets
  learn_progress: { size: 'large', app: 'learn' },
  learn_stats: { size: 'small', app: 'learn' },
  learn_streak: { size: 'small', app: 'learn' },
  learn_xp: { size: 'small', app: 'learn' },
  learn_skills: { size: 'medium', app: 'learn' },
  learn_certificates: { size: 'small', app: 'learn' },
  // Growth widgets
  growth_pipeline: { size: 'large', app: 'growth' },
  growth_stats: { size: 'small', app: 'growth' },
  growth_deals: { size: 'small', app: 'growth' },
  growth_winrate: { size: 'small', app: 'growth' },
  growth_signals: { size: 'medium', app: 'growth' },
  growth_campaigns: { size: 'medium', app: 'growth' },
  // Sentinel widgets
  sentinel_compliance: { size: 'medium', app: 'sentinel' },
  sentinel_systems: { size: 'small', app: 'sentinel' },
  sentinel_risk: { size: 'medium', app: 'sentinel' },
  sentinel_tasks: { size: 'small', app: 'sentinel' },
  sentinel_docs: { size: 'small', app: 'sentinel' },
  // Core widgets (no app requirement)
  actions_recent: { size: 'medium', app: null },
  quick_actions: { size: 'medium', app: null },
};

export default function Dashboard() {
  const { user, isLoading: userLoading } = useUser();
  const [dataLoading, setDataLoading] = useState(true);
  const [enabledApps, setEnabledApps] = useState(['learn', 'growth', 'sentinel']);
  const [enabledWidgets, setEnabledWidgets] = useState([]);
  
  // Data states
  const [dashboardData, setDashboardData] = useState({
    // Learn
    courses: [],
    userProgress: [],
    gamification: { streak: 0, longestStreak: 0, totalXP: 0, level: 1 },
    userSkills: [],
    certificates: 0,
    totalHours: 0,
    // Growth
    opportunities: [],
    totalValue: 0,
    wonDeals: 0,
    lostDeals: 0,
    signals: [],
    campaigns: [],
    // Sentinel
    systems: [],
    complianceProgress: 0,
    highRiskCount: 0,
    riskBreakdown: {},
    pendingTasks: 0,
    urgentTasks: 0,
    docCount: 0,
    // Core
    recentActions: [],
  });

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Load user config first
      const configs = await base44.entities.UserAppConfig.filter({ user_id: user.id });
      const defaultWidgets = [
        'learn_progress', 'learn_stats', 'learn_streak', 'learn_xp',
        'growth_pipeline', 'growth_stats', 'growth_deals',
        'sentinel_compliance', 'sentinel_systems',
        'actions_recent', 'quick_actions'
      ];
      
      if (configs.length > 0) {
        setEnabledApps(configs[0].enabled_apps || ['learn', 'growth', 'sentinel']);
        setEnabledWidgets(configs[0].dashboard_widgets || defaultWidgets);
      } else {
        setEnabledWidgets(defaultWidgets);
      }

      // Fetch all data in parallel - all filtered by user_id for data isolation
      const [
        coursesData, progressData, actionsData, opportunitiesData, systemsData,
        activitiesResult, gamificationResult, userSkillsResult,
        signalsResult, campaignsResult, certificatesResult
      ] = await Promise.allSettled([
        base44.entities.Course.list(), // Courses are shared/published content
        base44.entities.UserProgress.filter({ user_id: user.id }),
        base44.entities.ActionLog.filter({ user_id: user.id }, '-created_date', 5),
        base44.entities.GrowthOpportunity.filter({ user_id: user.id }, '-updated_date', 10),
        base44.entities.AISystem.filter({ user_id: user.id }),
        base44.entities.ActivitySession.filter({ user_id: user.id }),
        base44.entities.UserGamification.filter({ user_id: user.id }),
        base44.entities.UserSkill.filter({ user_id: user.id }, '-proficiency_score', 5),
        base44.entities.GrowthSignal.filter({ user_id: user.id, is_read: false }, '-created_date', 5),
        base44.entities.GrowthCampaign.filter({ user_id: user.id, status: 'active' }),
        base44.entities.Certificate.filter({ user_id: user.id })
      ]);

      // Process Learn data
      const allCourses = coursesData.status === 'fulfilled' ? coursesData.value : [];
      const progress = progressData.status === 'fulfilled' ? progressData.value : [];
      const personalizedIds = new Set([...(user.primary_courses || []), ...(user.background_courses || []), ...progress.map(p => p.course_id)]);
      const availableCourses = allCourses.filter(c => c.is_published && (progress.some(p => p.course_id === c.id) || c.created_by === user.email || personalizedIds.has(c.id)));
      
      const activities = activitiesResult.status === 'fulfilled' ? activitiesResult.value : [];
      const totalActiveMinutes = activities.reduce((sum, a) => sum + (a.total_active_minutes || 0), 0);
      
      const gamificationData = gamificationResult.status === 'fulfilled' ? gamificationResult.value[0] : null;
      const userSkillsData = userSkillsResult.status === 'fulfilled' ? userSkillsResult.value : [];
      const certificates = certificatesResult.status === 'fulfilled' ? certificatesResult.value : [];

      // Process Growth data
      const opportunities = opportunitiesData.status === 'fulfilled' ? opportunitiesData.value : [];
      const totalValue = opportunities.reduce((sum, o) => sum + (o.value || o.deal_value || 0), 0);
      const wonDeals = opportunities.filter(o => o.stage === 'closed_won').length;
      const lostDeals = opportunities.filter(o => o.stage === 'closed_lost').length;
      const signals = signalsResult.status === 'fulfilled' ? signalsResult.value : [];
      const campaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value : [];

      // Process Sentinel data
      const systems = systemsData.status === 'fulfilled' ? systemsData.value : [];
      const complianceProgress = systems.length > 0 
        ? Math.round((systems.filter(s => s.compliance_status === 'compliant').length / systems.length) * 100) 
        : 0;
      const highRiskCount = systems.filter(s => s.risk_classification === 'high-risk').length;
      
      // Calculate risk breakdown
      const riskBreakdown = systems.reduce((acc, s) => {
        const risk = s.risk_classification || 'minimal-risk';
        acc[risk] = (acc[risk] || 0) + 1;
        return acc;
      }, {});
      
      // Estimate pending tasks (22 per high-risk system)
      const pendingTasks = highRiskCount * 22;
      const urgentTasks = Math.floor(pendingTasks * 0.2);

      // Core data
      const recentActions = actionsData.status === 'fulfilled' ? actionsData.value : [];

      setDashboardData({
        courses: availableCourses,
        userProgress: progress,
        gamification: {
          streak: gamificationData?.current_streak || 0,
          longestStreak: gamificationData?.longest_streak || 0,
          totalXP: gamificationData?.total_points || 0,
          level: gamificationData?.level || 1,
        },
        userSkills: userSkillsData.map(s => ({
          id: s.id,
          name: s.skill_name || 'Skill',
          progress: s.proficiency_score || 0
        })),
        certificates: certificates.length,
        totalHours: Math.round(totalActiveMinutes / 60 * 10) / 10,
        opportunities,
        totalValue,
        wonDeals,
        lostDeals,
        signals,
        campaigns,
        systems,
        complianceProgress,
        highRiskCount,
        riskBreakdown,
        pendingTasks,
        urgentTasks,
        docCount: systems.length * 3, // Estimate docs per system
        recentActions,
      });

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);
  
  // Listen for config updates from the AppsManagerModal
  useEffect(() => {
    const handleConfigUpdate = () => {
      loadDashboardData();
    };
    
    window.addEventListener('dashboard-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('dashboard-config-updated', handleConfigUpdate);
  }, [loadDashboardData]);

  const loading = userLoading || dataLoading;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-16 sm:h-20 w-full bg-zinc-800 rounded-xl sm:rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 sm:h-28 bg-zinc-800 rounded-xl sm:rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1,2,3].map(i => <Skeleton key={i} className="h-56 sm:h-72 bg-zinc-800 rounded-xl sm:rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  // Get personalized context from enriched profile
  const enrichedProfile = user?.enriched_profile;
  const linkedinProfile = user?.linkedin_profile;
  const seniority = linkedinProfile?.seniority_level || enrichedProfile?.seniority_level;
  const maturity = enrichedProfile?.ai_maturity_assessment;

  // Build personalized subtitle based on profile
  const getPersonalizedSubtitle = () => {
    if (!enrichedProfile && !linkedinProfile) {
      return "Here's what's happening across your workspace";
    }

    const priorities = enrichedProfile?.learning_priorities || [];
    const topPriority = priorities[0];

    if (seniority === 'executive' || seniority === 'founder') {
      return "Your team's AI progress and key metrics at a glance";
    }
    if (maturity === 'Exploring') {
      return topPriority
        ? `Start your AI journey with ${topPriority.toLowerCase()}`
        : "Begin your AI learning journey today";
    }
    if (maturity === 'Piloting') {
      return "Track your AI pilots and expand your skills";
    }
    if (maturity === 'Scaling' || maturity === 'Advanced') {
      return "Monitor your AI initiatives and optimize performance";
    }
    return "Here's what's happening across your workspace";
  };

  // Helper to check enabled
  const isWidgetEnabled = (widgetId) => enabledWidgets.includes(widgetId);
  const isAppEnabled = (appId) => !appId || enabledApps.includes(appId);

  // Build widget components map
  const getWidgetComponent = (widgetId) => {
    const d = dashboardData;
    switch (widgetId) {
      // Learn
      case 'learn_progress': return <LearnProgressWidget courses={d.courses} userProgress={d.userProgress} />;
      case 'learn_stats': return <LearnStatsWidget totalHours={d.totalHours} skillsCount={d.userSkills.length} />;
      case 'learn_streak': return <LearnStreakWidget streak={d.gamification.streak} longestStreak={d.gamification.longestStreak} />;
      case 'learn_xp': return <LearnXPWidget totalXP={d.gamification.totalXP} level={d.gamification.level} />;
      case 'learn_skills': return <LearnSkillsWidget skills={d.userSkills} />;
      case 'learn_certificates': return <LearnCertificatesWidget certificateCount={d.certificates} />;
      // Growth
      case 'growth_pipeline': return <GrowthPipelineWidget opportunities={d.opportunities} />;
      case 'growth_stats': return <GrowthValueWidget totalValue={d.totalValue} />;
      case 'growth_deals': return <GrowthDealsWidget dealCount={d.opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage)).length} wonCount={d.wonDeals} />;
      case 'growth_winrate': return <GrowthWinRateWidget winRate={d.wonDeals + d.lostDeals > 0 ? Math.round((d.wonDeals / (d.wonDeals + d.lostDeals)) * 100) : 0} wonCount={d.wonDeals} lostCount={d.lostDeals} />;
      case 'growth_signals': return <GrowthSignalsWidget signals={d.signals} />;
      case 'growth_campaigns': return <GrowthCampaignsWidget campaigns={d.campaigns} />;
      // Sentinel
      case 'sentinel_compliance': return <SentinelComplianceWidget complianceProgress={d.complianceProgress} systemsCount={d.systems.length} highRiskCount={d.highRiskCount} />;
      case 'sentinel_systems': return <SentinelSystemsWidget systemsCount={d.systems.length} highRiskCount={d.highRiskCount} />;
      case 'sentinel_risk': return <SentinelRiskWidget riskBreakdown={d.riskBreakdown} />;
      case 'sentinel_tasks': return <SentinelTasksWidget pendingTasks={d.pendingTasks} urgentTasks={d.urgentTasks} />;
      case 'sentinel_docs': return <SentinelDocsWidget docCount={d.docCount} />;
      // Core
      case 'actions_recent': return <RecentActionsWidget actions={d.recentActions} />;
      case 'quick_actions': return <QuickActionsWidget enabledApps={enabledApps} />;
      default: return null;
    }
  };

  // Collect enabled widgets by size
  const smallWidgets = [];
  const mediumWidgets = [];
  const largeWidgets = [];

  enabledWidgets.forEach(widgetId => {
    const config = WIDGET_CONFIG[widgetId];
    if (!config) return;
    if (!isAppEnabled(config.app)) return;

    const widget = { id: widgetId, component: getWidgetComponent(widgetId), size: config.size };
    if (!widget.component) return;

    if (config.size === 'small') smallWidgets.push(widget);
    else if (config.size === 'large') largeWidgets.push(widget);
    else mediumWidgets.push(widget);
  });

  const hasWidgets = smallWidgets.length > 0 || mediumWidgets.length > 0 || largeWidgets.length > 0;

  // Build optimized grid layout - interleave large and medium widgets to fill gaps
  const buildGridItems = () => {
    const items = [];
    let largeIdx = 0;
    let mediumIdx = 0;
    
    // Strategy: alternate between large (2-col) and medium (1-col) widgets
    // to fill the 3-column grid without gaps
    while (largeIdx < largeWidgets.length || mediumIdx < mediumWidgets.length) {
      // Add a large widget (takes 2 cols)
      if (largeIdx < largeWidgets.length) {
        items.push({ ...largeWidgets[largeIdx], span: 2 });
        largeIdx++;
        // Add a medium widget to fill the 3rd column
        if (mediumIdx < mediumWidgets.length) {
          items.push({ ...mediumWidgets[mediumIdx], span: 1 });
          mediumIdx++;
        }
      } else {
        // No more large widgets, add medium widgets
        // Add up to 3 medium widgets per row
        for (let i = 0; i < 3 && mediumIdx < mediumWidgets.length; i++) {
          items.push({ ...mediumWidgets[mediumIdx], span: 1 });
          mediumIdx++;
        }
      }
    }
    return items;
  };

  const gridItems = buildGridItems();

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background - hidden on mobile for performance */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-indigo-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">

        {/* Welcome Header - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-0.5 sm:mb-1 truncate">
              {greeting}, {user?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 line-clamp-2">{getPersonalizedSubtitle()}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link to={createPageUrl("Actions")}>
              <Button className="h-10 sm:h-11 px-3 sm:px-4 bg-zinc-800/80 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 border border-zinc-700/50 text-sm sm:text-base touch-target">
                <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
                <span className="hidden xs:inline">New </span>Action
              </Button>
            </Link>
          </div>
        </motion.div>

        {hasWidgets ? (
          <>
            {/* Small Widgets Row - Mobile optimized */}
            {smallWidgets.length > 0 && (
              <div className={`grid gap-3 sm:gap-4 ${
                smallWidgets.length === 1 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                smallWidgets.length === 2 ? 'grid-cols-2 lg:grid-cols-4' :
                smallWidgets.length === 3 ? 'grid-cols-2 lg:grid-cols-3' :
                'grid-cols-2 lg:grid-cols-4'
              }`}>
                {smallWidgets.map((widget, i) => (
                  <motion.div
                    key={widget.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {widget.component}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Large & Medium Widgets Grid - Mobile optimized with tablet breakpoint */}
            {gridItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {gridItems.map((widget, i) => (
                  <motion.div
                    key={widget.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className={widget.span === 2 ? "md:col-span-2" : ""}
                  >
                    {widget.component}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Empty State - Mobile optimized */
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <LayoutGrid className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-300 mb-1.5 sm:mb-2">Customize your dashboard</h2>
            <p className="text-sm sm:text-base text-zinc-500 mb-4 sm:mb-6">Tap the menu icon to add widgets</p>
          </div>
        )}
      </div>
    </div>
  );
}