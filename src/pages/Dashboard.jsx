import { useState, useEffect, useCallback, cloneElement } from "react";
import { db } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useUser, useTeamAccess } from "@/components/context/UserContext";
import { usePermissions } from "@/components/context/PermissionContext";
import { Plus, LayoutGrid, Users, TrendingUp, Award, Target, BookOpen, Briefcase, Shield, Euro, AlertTriangle, FileCheck, Activity, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
import {
  FinanceOverviewWidget, FinanceRevenueWidget, FinanceExpensesWidget,
  FinancePendingWidget, FinanceMRRWidget
} from "@/components/dashboard/widgets/FinanceWidgets";
import {
  RaiseCampaignWidget, RaiseTargetWidget, RaiseCommittedWidget,
  RaiseInvestorsWidget, RaiseMeetingsWidget
} from "@/components/dashboard/widgets/RaiseWidgets";
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
  // Finance widgets
  finance_overview: { size: 'large', app: 'finance' },
  finance_revenue: { size: 'small', app: 'finance' },
  finance_expenses: { size: 'small', app: 'finance' },
  finance_pending: { size: 'small', app: 'finance' },
  finance_mrr: { size: 'small', app: 'finance' },
  // Raise widgets
  raise_campaign: { size: 'large', app: 'raise' },
  raise_target: { size: 'small', app: 'raise' },
  raise_committed: { size: 'small', app: 'raise' },
  raise_investors: { size: 'small', app: 'raise' },
  raise_meetings: { size: 'small', app: 'raise' },
  // Core widgets (no app requirement)
  actions_recent: { size: 'medium', app: null },
  quick_actions: { size: 'medium', app: null },
};

export default function Dashboard() {
  const { user, isLoading: userLoading } = useUser();
  const { effectiveApps } = useTeamAccess();
  const { isManager, isAdmin, hierarchyLevel, isLoading: permLoading } = usePermissions();
  const [dataLoading, setDataLoading] = useState(true);
  const [enabledApps, setEnabledApps] = useState(['learn', 'growth', 'sentinel']);
  const [enabledWidgets, setEnabledWidgets] = useState([]);
  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'team'
  const [teamData, setTeamData] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // Check if user can see team dashboard (manager, admin, or super_admin)
  const canViewTeamDashboard = isManager || isAdmin || hierarchyLevel >= 60;
  
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
    // Finance
    invoices: [],
    financeRevenue: 0,
    financeExpenses: 0,
    pendingInvoiceAmount: 0,
    pendingInvoiceCount: 0,
    mrr: 0,
    activeSubscriptions: 0,
    // Raise
    raiseCampaign: null,
    investors: [],
    committedAmount: 0,
    investorMeetings: 0,
    upcomingMeetings: 0,
    // Core
    recentActions: [],
  });

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      // Load user config first - RLS handles filtering
      const configs = await db.entities.UserAppConfig.list({ limit: 10 }).catch(() => []);
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

      // Fetch all data in parallel - RLS handles data isolation
      const [
        coursesData, progressData, actionsData, opportunitiesData, systemsData,
        activitiesResult, gamificationResult, userSkillsResult,
        signalsResult, campaignsResult, certificatesResult,
        invoicesResult, expensesResult, subscriptionsResult,
        raiseCampaignsResult, investorsResult
      ] = await Promise.allSettled([
        db.entities.Course.list({ limit: 50 }).catch(() => []),
        db.entities.UserProgress.list({ limit: 100 }).catch(() => []),
        db.entities.ActionLog.list({ limit: 5 }).catch(() => []),
        db.entities.GrowthOpportunity.list({ limit: 10 }).catch(() => []),
        db.entities.AISystem.list({ limit: 50 }).catch(() => []),
        db.entities.ActivitySession.list({ limit: 100 }).catch(() => []),
        // UserGamification may not exist - wrap in try/catch
        db.entities.UserGamification?.list?.({ limit: 1 }).catch(() => []) || Promise.resolve([]),
        db.entities.UserSkill.list({ limit: 5 }).catch(() => []),
        db.entities.GrowthSignal.list({ limit: 5 }).catch(() => []),
        db.entities.GrowthCampaign.list({ limit: 10 }).catch(() => []),
        db.entities.Certificate.list({ limit: 50 }).catch(() => []),
        // Finance data
        db.entities.Invoice?.list?.({ limit: 20 }).catch(() => []) || Promise.resolve([]),
        db.entities.Expense?.list?.({ limit: 50 }).catch(() => []) || Promise.resolve([]),
        db.entities.Subscription?.list?.({ limit: 20 }).catch(() => []) || Promise.resolve([]),
        // Raise data
        db.entities.RaiseCampaign?.list?.({ limit: 1 }).catch(() => []) || Promise.resolve([]),
        db.entities.Investor?.list?.({ limit: 50 }).catch(() => []) || Promise.resolve([])
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

      // Process Finance data
      const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value : [];
      const expenses = expensesResult.status === 'fulfilled' ? expensesResult.value : [];
      const subscriptions = subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value : [];

      const financeRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.total || i.amount || 0), 0);
      const financeExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'sent');
      const pendingInvoiceAmount = pendingInvoices.reduce((sum, i) => sum + (i.total || i.amount || 0), 0);
      const pendingInvoiceCount = pendingInvoices.length;
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
      const mrr = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

      // Process Raise data
      const raiseCampaigns = raiseCampaignsResult.status === 'fulfilled' ? raiseCampaignsResult.value : [];
      const investors = investorsResult.status === 'fulfilled' ? investorsResult.value : [];
      const activeCampaign = raiseCampaigns.find(c => c.status === 'active') || raiseCampaigns[0] || null;
      const committedInvestors = investors.filter(i => i.status === 'committed');
      const committedAmount = committedInvestors.reduce((sum, i) => sum + (i.committed_amount || 0), 0);
      const investorMeetings = investors.filter(i => i.status === 'meeting_scheduled').length;
      const upcomingMeetings = investorMeetings; // Simplified

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
        docCount: systems.length * 3,
        // Finance
        invoices,
        financeRevenue,
        financeExpenses,
        pendingInvoiceAmount,
        pendingInvoiceCount,
        mrr,
        activeSubscriptions: activeSubscriptions.length,
        // Raise
        raiseCampaign: activeCampaign,
        investors,
        committedAmount,
        investorMeetings,
        upcomingMeetings,
        // Core
        recentActions,
      });

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  // Load team data for managers - across ALL modules
  const loadTeamData = useCallback(async () => {
    if (!user?.company_id || !canViewTeamDashboard) return;

    setTeamLoading(true);
    try {
      // Load data from ALL modules
      const [
        usersResult,
        progressResult,
        activityResult,
        opportunitiesResult,
        systemsResult,
        actionsResult,
        invoicesResult,
        expensesResult
      ] = await Promise.allSettled([
        db.entities.User?.list?.({ limit: 100 }).catch(() => []),
        db.entities.UserProgress?.list?.({ limit: 500 }).catch(() => []),
        db.entities.ActivitySession?.list?.({ limit: 500 }).catch(() => []),
        db.entities.GrowthOpportunity?.list?.({ limit: 100 }).catch(() => []),
        db.entities.AISystem?.list?.({ limit: 100 }).catch(() => []),
        db.entities.ActionLog?.list?.({ limit: 100 }).catch(() => []),
        db.entities.Invoice?.list?.({ limit: 100 }).catch(() => []),
        db.entities.Expense?.list?.({ limit: 100 }).catch(() => [])
      ]);

      const allUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
      const allProgress = progressResult.status === 'fulfilled' ? progressResult.value : [];
      const allActivities = activityResult.status === 'fulfilled' ? activityResult.value : [];
      const allOpportunities = opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value : [];
      const allSystems = systemsResult.status === 'fulfilled' ? systemsResult.value : [];
      const allActions = actionsResult.status === 'fulfilled' ? actionsResult.value : [];
      const allInvoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value : [];
      const allExpenses = expensesResult.status === 'fulfilled' ? expensesResult.value : [];

      // Filter to company users
      const teamMembers = allUsers.filter(u => u.company_id === user.company_id);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Team overview
      const activeThisWeek = new Set(
        allActivities
          .filter(a => new Date(a.created_at) > weekAgo)
          .map(a => a.user_id)
      ).size;

      // LEARN stats
      const totalHours = Math.round(allActivities.reduce((sum, a) => sum + (a.total_active_minutes || 0), 0) / 60);
      const coursesCompleted = allProgress.filter(p => p.status === 'completed').length;

      // GROWTH stats
      const activeDeals = allOpportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));
      const totalPipelineValue = activeDeals.reduce((sum, o) => sum + (o.value || o.deal_value || 0), 0);
      const wonDeals = allOpportunities.filter(o => o.stage === 'closed_won').length;
      const recentDeals = allOpportunities.filter(o => new Date(o.created_at) > weekAgo).length;

      // SENTINEL stats
      const totalSystems = allSystems.length;
      const highRiskSystems = allSystems.filter(s => s.risk_classification === 'high-risk').length;
      const compliantSystems = allSystems.filter(s => s.compliance_status === 'compliant').length;
      const complianceRate = totalSystems > 0 ? Math.round((compliantSystems / totalSystems) * 100) : 0;

      // FINANCE stats
      const totalRevenue = allInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);
      const pendingInvoices = allInvoices.filter(i => i.status === 'pending').length;
      const monthlyExpenses = allExpenses
        .filter(e => new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Actions this week
      const recentActions = allActions.filter(a => new Date(a.created_at) > weekAgo).length;

      setTeamData({
        // Team overview
        memberCount: teamMembers.length,
        activeThisWeek,

        // Learn
        learningHours: totalHours,
        coursesCompleted,

        // Growth
        activeDeals: activeDeals.length,
        pipelineValue: totalPipelineValue,
        wonDeals,
        recentDeals,

        // Sentinel
        aiSystems: totalSystems,
        highRiskSystems,
        complianceRate,

        // Finance
        revenue: totalRevenue,
        pendingInvoices,
        monthlyExpenses,

        // Activity
        actionsThisWeek: recentActions
      });
    } catch (error) {
      console.error('Error loading team data:', error);
      setTeamData(null);
    } finally {
      setTeamLoading(false);
    }
  }, [user, canViewTeamDashboard]);

  useEffect(() => {
    let isMounted = true;
    const runLoad = async () => {
      await loadDashboardData();
      // Only update state if still mounted (handled inside loadDashboardData via setters)
    };
    runLoad();
    return () => { isMounted = false; };
  }, [loadDashboardData]);

  // Load team data when switching to team view
  useEffect(() => {
    if (viewMode === 'team' && canViewTeamDashboard && !teamData) {
      loadTeamData();
    }
  }, [viewMode, canViewTeamDashboard, teamData, loadTeamData]);

  // Listen for config updates from the AppsManagerModal
  useEffect(() => {
    const handleConfigUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('dashboard-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('dashboard-config-updated', handleConfigUpdate);
  }, [loadDashboardData]);

  const loading = userLoading || dataLoading || permLoading;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-14 sm:h-16 w-full bg-zinc-800 rounded-xl sm:rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 sm:h-24 bg-zinc-800 rounded-xl sm:rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-48 sm:h-56 bg-zinc-800 rounded-xl sm:rounded-2xl" />)}
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

  // Helper to check enabled — must be in user prefs AND licensed
  const isWidgetEnabled = (widgetId) => enabledWidgets.includes(widgetId);
  const isAppEnabled = (appId) => !appId || (enabledApps.includes(appId) && effectiveApps.includes(appId));

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
      // Finance
      case 'finance_overview': return <FinanceOverviewWidget revenue={d.financeRevenue} expenses={d.financeExpenses} invoices={d.invoices} />;
      case 'finance_revenue': return <FinanceRevenueWidget totalRevenue={d.financeRevenue} />;
      case 'finance_expenses': return <FinanceExpensesWidget totalExpenses={d.financeExpenses} />;
      case 'finance_pending': return <FinancePendingWidget pendingAmount={d.pendingInvoiceAmount} invoiceCount={d.pendingInvoiceCount} />;
      case 'finance_mrr': return <FinanceMRRWidget mrr={d.mrr} activeCount={d.activeSubscriptions} />;
      // Raise
      case 'raise_campaign': return <RaiseCampaignWidget campaign={d.raiseCampaign} investors={d.investors} />;
      case 'raise_target': return <RaiseTargetWidget targetAmount={d.raiseCampaign?.target_amount || 0} roundType={d.raiseCampaign?.round_type || ''} />;
      case 'raise_committed': return <RaiseCommittedWidget committedAmount={d.committedAmount} targetAmount={d.raiseCampaign?.target_amount || 0} />;
      case 'raise_investors': return <RaiseInvestorsWidget investorCount={d.investors?.length || 0} interestedCount={d.investors?.filter(i => ['interested', 'meeting_scheduled', 'in_dd'].includes(i.status)).length || 0} />;
      case 'raise_meetings': return <RaiseMeetingsWidget meetingCount={d.investorMeetings} upcomingCount={d.upcomingMeetings} />;
      // Core
      case 'actions_recent': return <RecentActionsWidget actions={d.recentActions} />;
      case 'quick_actions': return <QuickActionsWidget enabledApps={enabledApps.filter(a => effectiveApps.includes(a))} />;
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
    <div className="min-h-screen bg-black">
      <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">

        {/* Welcome Header - Mobile optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white mb-0.5 truncate">
              {greeting}, {user?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-xs text-zinc-400 line-clamp-2">{getPersonalizedSubtitle()}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link to={createPageUrl("Actions")}>
              <Button className="h-10 sm:h-11 px-3 sm:px-4 bg-zinc-800/80 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 border border-zinc-700/50 text-sm sm:text-base touch-target">
                <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
                <span className="hidden xs:inline">New </span>Action
              </Button>
            </Link>
          </div>
        </div>

        {/* View Switcher for Managers */}
        {canViewTeamDashboard && (
          <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl w-fit border border-zinc-800">
            <button
              onClick={() => setViewMode('personal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'personal'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              My Dashboard
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'team'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Team Dashboard
            </button>
          </div>
        )}

        {/* Team Dashboard View */}
        {viewMode === 'team' && canViewTeamDashboard ? (
          <div className="space-y-6">
            {teamLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 bg-zinc-800 rounded-xl" />)}
                </div>
              </div>
            ) : teamData ? (
              <>
                {/* Team Overview Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Users className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-lg font-bold text-white">{teamData.memberCount}</p>
                      <p className="text-sm text-zinc-400">Team Members</p>
                      <p className="text-xs text-zinc-500 mt-1">{teamData.activeThisWeek} active this week</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Euro className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-lg font-bold text-white">${(teamData.pipelineValue / 1000).toFixed(0)}k</p>
                      <p className="text-sm text-zinc-400">Pipeline Value</p>
                      <p className="text-xs text-zinc-500 mt-1">{teamData.activeDeals} active deals</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Shield className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-lg font-bold text-white">{teamData.complianceRate}%</p>
                      <p className="text-sm text-zinc-400">Compliance Rate</p>
                      <p className="text-xs text-zinc-500 mt-1">{teamData.aiSystems} AI systems</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Activity className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-lg font-bold text-white">{teamData.actionsThisWeek}</p>
                      <p className="text-sm text-zinc-400">Actions This Week</p>
                      <p className="text-xs text-zinc-500 mt-1">Team activity</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Module Cards Grid — only show licensed modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LEARN Module Card */}
                  {effectiveApps.includes('learn') && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800 py-3">
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <BookOpen className="w-5 h-5 text-zinc-400" />
                        Learn
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.learningHours}h</p>
                          <p className="text-xs text-zinc-400">Learning Hours</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.coursesCompleted}</p>
                          <p className="text-xs text-zinc-400">Courses Completed</p>
                        </div>
                      </div>
                      <Link to={createPageUrl("LearnDashboard")} className="mt-4 block">
                        <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                          View Learning Analytics
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  )}

                  {/* GROWTH Module Card */}
                  {effectiveApps.includes('growth') && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800 py-3">
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <TrendingUp className="w-5 h-5 text-zinc-400" />
                        Growth
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.activeDeals}</p>
                          <p className="text-xs text-zinc-400">Active Deals</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.wonDeals}</p>
                          <p className="text-xs text-zinc-400">Won</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.recentDeals}</p>
                          <p className="text-xs text-zinc-400">New This Week</p>
                        </div>
                      </div>
                      <Link to={createPageUrl("GrowthPipeline")} className="mt-4 block">
                        <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                          View Pipeline
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  )}

                  {/* SENTINEL Module Card */}
                  {effectiveApps.includes('sentinel') && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800 py-3">
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <Shield className="w-5 h-5 text-zinc-400" />
                        Sentinel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.aiSystems}</p>
                          <p className="text-xs text-zinc-400">AI Systems</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.highRiskSystems}</p>
                          <p className="text-xs text-zinc-400">High Risk</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.complianceRate}%</p>
                          <p className="text-xs text-zinc-400">Compliant</p>
                        </div>
                      </div>
                      <Link to={createPageUrl("SentinelDashboard")} className="mt-4 block">
                        <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                          View Compliance
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  )}

                  {/* FINANCE Module Card */}
                  {effectiveApps.includes('finance') && (
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800 py-3">
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <Euro className="w-5 h-5 text-zinc-400" />
                        Finance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">${(teamData.revenue / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-zinc-400">Revenue</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{teamData.pendingInvoices}</p>
                          <p className="text-xs text-zinc-400">Pending</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">${(teamData.monthlyExpenses / 1000).toFixed(1)}k</p>
                          <p className="text-xs text-zinc-400">Expenses</p>
                        </div>
                      </div>
                      <Link to={createPageUrl("FinanceOverview")} className="mt-4 block">
                        <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                          View Financials
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  )}
                </div>

                {/* Quick Actions for Managers */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="border-b border-zinc-800 py-3">
                    <CardTitle className="text-white flex items-center gap-2 text-base">
                      <Briefcase className="w-5 h-5 text-zinc-400" />
                      Manager Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <Link to={createPageUrl("TeamManagement")}>
                        <Button variant="outline" size="sm" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
                          <Users className="w-4 h-4 mr-1.5" />
                          Team
                        </Button>
                      </Link>
                      <Link to={createPageUrl("Courses")}>
                        <Button variant="outline" size="sm" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
                          <BookOpen className="w-4 h-4 mr-1.5" />
                          Courses
                        </Button>
                      </Link>
                      <Link to={createPageUrl("GrowthPipeline")}>
                        <Button variant="outline" size="sm" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
                          <TrendingUp className="w-4 h-4 mr-1.5" />
                          Pipeline
                        </Button>
                      </Link>
                      <Link to={createPageUrl("SentinelDashboard")}>
                        <Button variant="outline" size="sm" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
                          <Shield className="w-4 h-4 mr-1.5" />
                          Compliance
                        </Button>
                      </Link>
                      <Link to={createPageUrl("FinanceOverview")}>
                        <Button variant="outline" size="sm" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
                          <Euro className="w-4 h-4 mr-1.5" />
                          Finance
                        </Button>
                      </Link>
                      <Link to={createPageUrl("AnalyticsDashboard")}>
                        <Button variant="outline" size="sm" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
                          <PieChart className="w-4 h-4 mr-1.5" />
                          Analytics
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-sm font-bold text-zinc-300 mb-2">No team data available</h2>
                <p className="text-zinc-500">Team analytics will appear once your team starts using the platform</p>
              </div>
            )}
          </div>
        ) : hasWidgets ? (
          <>
            {/* Small Widgets Row - Mobile optimized */}
            {smallWidgets.length > 0 && (
              <div className={`grid gap-3 sm:gap-4 ${
                smallWidgets.length === 1 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                smallWidgets.length === 2 ? 'grid-cols-2 lg:grid-cols-4' :
                smallWidgets.length === 3 ? 'grid-cols-2 lg:grid-cols-3' :
                'grid-cols-2 lg:grid-cols-4'
              }`}>
                {smallWidgets.map((widget, idx) => (
                  <div key={widget.id}>
                    {cloneElement(widget.component, { delay: idx * 0.05 })}
                  </div>
                ))}
              </div>
            )}

            {/* Large & Medium Widgets Grid - Mobile optimized with tablet breakpoint */}
            {gridItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {gridItems.map((widget, idx) => (
                  <div
                    key={widget.id}
                    className={widget.span === 2 ? "md:col-span-2" : ""}
                  >
                    {cloneElement(widget.component, { delay: smallWidgets.length * 0.05 + idx * 0.08 })}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Empty State - Mobile optimized */
          <div className="text-center py-16 px-4">
            <LayoutGrid className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h2 className="text-base font-medium text-zinc-300 mb-1">Customize your dashboard</h2>
            <p className="text-sm text-zinc-500">Use the menu to add widgets</p>
          </div>
        )}
      </div>
    </div>
  );
}