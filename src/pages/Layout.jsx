
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { SENTINEL, THEME_COLORS, UI, FEATURES } from "@/lib/constants";
import { logError } from "@/components/utils/errorHandler";
import {
  BookOpen,
  Home,
  User as UserIcon,
  Settings as SettingsIcon,
  BarChart3,
  PlusCircle,
  Menu,
  Brain,
  Sparkles,
  LogOut,
  Shield,
  Server,
  LifeBuoy,
  LogIn,
  Zap,
  List,
  Calendar,
  FileText,
  MessageSquare,
  Bookmark,
  LayoutDashboard,
  Award,
  Target,
  Trophy,
  Cpu,
  Map,
  Copy,
  Library,
  Megaphone,
  Inbox,
  Users,
  Clock,
  UsersRound,
  Search,
  GraduationCap,
  Rocket,
  Kanban,
  Radio,
  Briefcase,
  FolderKanban,
  ListTodo,
  Contact,
  Activity,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  PieChart
  } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// Import icons directly - no lazy loading for icons
import SentinelOrbitIcon from "@/components/icons/SentinelOrbitIcon";
import SyncOrbitIcon from "@/components/icons/SyncOrbitIcon";
import CoursesOrbitIcon from "@/components/icons/CoursesOrbitIcon";

import GrowthOrbitIcon from "@/components/icons/GrowthOrbitIcon";

// Direct imports to avoid lazy loading issues
import OnboardingGuard from "@/components/layout/OnboardingGuard";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import FloatingAgentTrigger from "@/components/agents/FloatingAgentTrigger";
import AppsManagerModal, { AVAILABLE_APPS } from "@/components/layout/AppsManagerModal";

// Import providers
import { AchievementProvider } from "@/components/learn/AchievementContext";
import { UserProvider, useTeamAccess } from "@/components/context/UserContext";
import { PermissionProvider, usePermissions } from "@/components/context/PermissionContext";

// Navigation items with permission requirements
// permission: null = always visible, string = requires that permission
const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    permission: null, // Always visible
  },
  {
    title: "CRM",
    url: createPageUrl("CRMContacts"),
    icon: Contact,
    permission: "users.view", // Basic permission
  },
  {
    title: "Projects",
    url: createPageUrl("Projects"),
    icon: FolderKanban,
    permission: "projects.view",
  },
  {
    title: "Tasks",
    url: createPageUrl("Tasks"),
    icon: ListTodo,
    permission: "projects.view", // Tasks are part of projects
  },
  {
    title: "Inbox",
    url: createPageUrl("Inbox"),
    icon: Inbox,
    permission: "inbox.view",
  },
  {
    title: "Actions",
    url: createPageUrl("Actions"),
    icon: Zap,
    permission: "workflows.view",
  },
  {
    title: "Activity",
    url: createPageUrl("Activity"),
    icon: Activity,
    permission: null, // Always visible
  },
];

// Engine apps with permission requirements
const ENGINE_ITEMS_CONFIG = {
  growth: {
    title: "Growth",
    url: createPageUrl("Growth"),
    icon: Rocket,
    id: 'growth',
    permission: "analytics.view", // Growth analytics
  },
  learn: {
    title: "Learn",
    url: createPageUrl("LearnDashboard"),
    icon: GraduationCap,
    id: 'learn',
    permission: "courses.view", // Learning features
  },
  sentinel: {
    title: "Sentinel",
    url: createPageUrl("SentinelDashboard"),
    icon: Shield,
    id: 'sentinel',
    permission: "admin.access", // Admin/compliance feature
  },
  sync: {
    title: "Sync",
    url: createPageUrl("AIAssistant"),
    icon: Brain,
    id: 'sync',
    permission: null, // Always available
  },
  finance: {
    title: "Finance",
    url: createPageUrl("FinanceOverview"),
    icon: DollarSign,
    id: 'finance',
    permission: "finance.view",
  },
  raise: {
    title: "Raise",
    url: createPageUrl("Raise"),
    icon: TrendingUp,
    id: 'raise',
    permission: "finance.view", // Fundraising is finance-related
  },
};



const adminItems = [];

// Get secondary nav config based on current route
function getSecondaryNavConfig(pathname, stats = {}) {
  // Convert to lowercase for case-insensitive matching
  const path = pathname.toLowerCase();

  // SENTINEL routes
      if (path.includes('sentinel') || path.includes('aisystem') || path.includes('compliance') || path.includes('document') || path.includes('riskassessment')) {
        return {
          title: 'SENTINEL',
          color: 'sage',
          agent: 'sentinel',
          items: [
            { label: 'AI Systems', path: createPageUrl('AISystemInventory'), icon: Cpu, badge: stats.systems },
            { label: 'Roadmap', path: createPageUrl('ComplianceRoadmap'), icon: Map, badge: stats.tasks },
            { label: 'Documents', path: createPageUrl('DocumentGenerator'), icon: FileText },
          ]
        };
      }
  
  // GROWTH routes (merged with CIDE)
          if (path.includes('growth') || path.includes('sequences') || path.includes('deals') || path.includes('leads') || path.includes('insights') || path.includes('prospect') || path.includes('research') || path.includes('pipeline')) {
            return {
              title: 'GROWTH',
              color: 'indigo',
              agent: 'growth',
              items: [
                { label: 'Pipeline', path: createPageUrl('GrowthPipeline'), icon: Kanban },
                { label: 'Prospects', path: createPageUrl('GrowthProspects'), icon: Users },
                { label: 'Campaigns', path: createPageUrl('GrowthCampaigns'), icon: Megaphone },
                { label: 'Signals', path: createPageUrl('GrowthSignals'), icon: Radio },
              ]
            };
          }

      // SYNC routes - no secondary nav needed as it only has dashboard
      if (path.includes('sync')) {
        return null;
      }

  // FINANCE routes
  if (path.includes('finance')) {
    return {
      title: 'FINANCE',
      color: 'amber',
      agent: 'finance',
      items: [
        { label: 'Overview', path: createPageUrl('FinanceOverview'), icon: PieChart },
        { label: 'Invoices', path: createPageUrl('FinanceInvoices'), icon: Receipt },
        { label: 'Expenses', path: createPageUrl('FinanceExpenses'), icon: DollarSign },
        { label: 'Subscriptions', path: createPageUrl('FinanceSubscriptions'), icon: CreditCard },
      ]
    };
  }

  // RAISE routes
  if (path.includes('raise')) {
    return {
      title: 'RAISE',
      color: 'orange',
      agent: 'raise',
      items: [
        { label: 'Dashboard', path: createPageUrl('Raise'), icon: TrendingUp },
      ]
    };
  }

  // LEARN routes (includes course building tools)
  if (path.includes('learn') || path.includes('course') || path.includes('lesson') || path.includes('certificate') || path.includes('skill') || path.includes('leaderboard') || path.includes('learndashboard')) {
    return {
      title: 'LEARN',
      color: 'cyan',
      agent: 'learn',
      items: [
        { label: 'My Courses', path: createPageUrl('Learn'), icon: BookOpen },
        { label: 'Skills', path: createPageUrl('SkillMap'), icon: Target, badge: stats.skills },
        { label: 'Course Builder', path: createPageUrl('ManageCourses'), icon: Library },
        { label: 'AI Tools', path: createPageUrl('LearnAITools'), icon: Sparkles },
      ]
    };
  }

  // SYNC routes
  if (path.includes('sync') || path.includes('aiassistant')) {
    return {
      title: 'SYNC',
      color: 'purple',
      agent: 'sync',
      items: [
        { label: 'Assistant', path: createPageUrl('AIAssistant'), icon: Brain },
        { label: 'Integrations', path: createPageUrl('MCPIntegrations'), icon: Cpu },
      ]
    };
  }
  
  return null;
}

// Color classes mapped from theme constants
const COLOR_CLASSES = {
  sage: {
    text: THEME_COLORS.sentinel.text,
    bg: THEME_COLORS.sentinel.bg,
    border: THEME_COLORS.sentinel.border,
    borderSolid: THEME_COLORS.sentinel.solid,
    glow: THEME_COLORS.sentinel.glow
  },
  indigo: {
    text: THEME_COLORS.growth.text,
    bg: THEME_COLORS.growth.bg,
    border: THEME_COLORS.growth.border,
    borderSolid: THEME_COLORS.growth.solid,
    glow: THEME_COLORS.growth.glow
  },
  cyan: {
    text: THEME_COLORS.learn.text,
    bg: THEME_COLORS.learn.bg,
    border: THEME_COLORS.learn.border,
    borderSolid: THEME_COLORS.learn.solid,
    glow: THEME_COLORS.learn.glow
  },
  amber: {
    text: THEME_COLORS.finance.text,
    bg: THEME_COLORS.finance.bg,
    border: THEME_COLORS.finance.border,
    borderSolid: THEME_COLORS.finance.solid,
    glow: THEME_COLORS.finance.glow
  },
  orange: {
    text: THEME_COLORS.raise.text,
    bg: THEME_COLORS.raise.bg,
    border: THEME_COLORS.raise.border,
    borderSolid: THEME_COLORS.raise.solid,
    glow: THEME_COLORS.raise.glow
  },
  purple: {
    text: THEME_COLORS.sync.text,
    bg: THEME_COLORS.sync.bg,
    border: THEME_COLORS.sync.border,
    borderSolid: THEME_COLORS.sync.solid,
    glow: THEME_COLORS.sync.glow
  }
};

// Header offset constant for secondary sidebar alignment
const SECONDARY_SIDEBAR_HEADER_OFFSET = 'pt-[56px]';

// Secondary Sidebar Component
function SecondarySidebar({ config, location }) {
  if (!config) return null;

  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.cyan;
  
  return (
    <div className="hidden md:flex flex-col w-[80px] bg-black border-r border-white/5 relative z-10 animate-in slide-in-from-left duration-300 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-4 flex items-center justify-center ${SECONDARY_SIDEBAR_HEADER_OFFSET} relative z-10`}>
        <h3 className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>
          {config.title}
        </h3>
      </div>
      
      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2 scrollbar-hide">
          {config.items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={`
                      relative flex items-center justify-center w-full h-12 rounded-xl transition-all duration-200 group
                      ${isActive 
                        ? `${colors.text} ${colors.bg}` 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? colors.text : 'group-hover:text-white'}`} />
                    {item.badge > 0 && (
                      <span className={`absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${colors.borderSolid} rounded-r-full ${colors.glow}`} />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-900 border-gray-700 text-white">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
    </div>
  );
}

// Reusable Sidebar Content - must be rendered inside PermissionProvider
function SidebarContent({ currentPageName, isMobile = false, secondaryNavConfig, enabledApps, onOpenAppsManager }) {
    const location = useLocation();
  const [me, setMe] = React.useState(null);

  // Get permission context - use the hook directly
  const { hasPermission, isAdmin, isManager, isLoading: permLoading } = usePermissions();

  // Get team-based app access
  const { effectiveApps, hasTeams, isLoading: teamLoading } = useTeamAccess();

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const u = await base44.auth.me();
        if (isMounted) {
          setMe(u);
        }
        // Manager status is now determined by RBAC system via PermissionContext
      } catch (e) {
        console.error("Failed to fetch user data:", e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Memoize filtered navigation items - show all items while loading
  const filteredNavItems = useMemo(() => {
    // While permissions are loading, show items without permission requirements
    if (permLoading) {
      return navigationItems.filter(item => !item.permission);
    }
    return navigationItems.filter(item => {
      // No permission required - always show
      if (!item.permission) return true;
      // Check permission
      return hasPermission(item.permission);
    });
  }, [hasPermission, permLoading]);

  // Memoize engine items based on team app access AND permissions
  // Priority: Admin gets all apps, otherwise use team-based effectiveApps, fallback to enabledApps
  const engineItems = useMemo(() => {
    // Determine which apps to show based on team membership and admin status
    let appsToShow;

    if (isAdmin) {
      // Admins get all apps regardless of team membership
      appsToShow = Object.keys(ENGINE_ITEMS_CONFIG);
    } else if (hasTeams && effectiveApps.length > 0) {
      // Users with teams get apps based on team_app_access
      appsToShow = effectiveApps;
    } else if (!hasTeams && !teamLoading) {
      // Users without team assignments get no engine apps (minimal access)
      // This encourages admins to assign users to teams
      appsToShow = [];
    } else {
      // Fallback to user's personal config while loading or if no teams
      appsToShow = enabledApps;
    }

    const items = appsToShow
      .map(appId => ENGINE_ITEMS_CONFIG[appId])
      .filter(Boolean);

    // While permissions are loading, show items without permission requirements
    if (permLoading) {
      return items.filter(item => !item.permission);
    }
    return items.filter(item => {
      // No permission required - always show
      if (!item.permission) return true;
      // Check permission
      return hasPermission(item.permission);
    });
  }, [enabledApps, effectiveApps, hasTeams, isAdmin, teamLoading, hasPermission, permLoading]);

  const handleLogin = async () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Apps Manager Button (Desktop only) */}
      {!isMobile && (
        <button
          onClick={onOpenAppsManager}
          className="absolute -right-3 top-16 bg-black border border-gray-700 text-gray-400 rounded-full p-1.5 hover:text-cyan-400 hover:border-cyan-500/50 transition-all z-50 shadow-lg"
          title="Manage Apps"
        >
          <SettingsIcon size={12} />
        </button>
      )}

      {/* Top Profile Section */}
      <div className="flex flex-col items-center justify-center py-6 gap-4 transition-all duration-300 px-2">
        
        {/* Settings via Avatar */}
        <Link to={createPageUrl("Settings")} className="relative group cursor-pointer flex flex-col items-center" aria-label="Go to Settings">
          {me?.avatar_url ? (
            <div className="rounded-full overflow-hidden border-2 border-white/10 w-10 h-10 transition-all duration-300 shadow-xl relative z-10">
              <img 
                src={me.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
          ) : (
            <div className="rounded-full overflow-hidden border-2 border-white/10 w-10 h-10 transition-all duration-300 shadow-xl relative z-10">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/97c0a3206_GeneratedImageDecember082025-5_28PM.jpeg" 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md -z-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
        </Link>

        </div>

      {/* Navigation - Mobile optimized with larger touch targets */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide scroll-smooth-ios">
        {/* Core Navigation - filtered by permissions */}
        <div className="space-y-1">
          {filteredNavItems.map((item) => {
                            const isActive = location.pathname === item.url;

                            return (
                              <Link
                                key={item.title}
                                to={item.url}
                                className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative active:scale-[0.98]
                                  ${isActive
                                    ? 'text-cyan-400 bg-cyan-950/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                                  }
                                `}
                                title={item.title}
                              >
                                <item.icon isActive={isActive} className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />
                                {isMobile && <span>{item.title}</span>}
                                {isActive && (
                                   <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-l-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                )}
                              </Link>
                            );
                          })}
        </div>

        <div className="h-px bg-white/5 mx-2 my-2" />

        {/* Engine Apps - Dynamic based on user config - Mobile optimized */}
        <div className="space-y-1">
          {engineItems.map((item) => {
            const isActive = location.pathname === item.url;
            const isLearn = item.id === "learn";
            const isSentinel = item.id === "sentinel";
            const isGrowth = item.id === "growth";
            const isSync = item.id === "sync";
            const isFinance = item.id === "finance";
            const isRaise = item.id === "raise";

            // Get the appropriate color classes for this engine
            const getEngineColors = () => {
              if (isLearn) return { text: 'text-cyan-400', bg: 'bg-cyan-950/30', solid: 'bg-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' };
              if (isSentinel) return { text: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/10', solid: 'bg-[#86EFAC]', glow: 'shadow-[0_0_10px_rgba(134,239,172,0.5)]' };
              if (isGrowth) return { text: 'text-indigo-400', bg: 'bg-indigo-950/30', solid: 'bg-indigo-500', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' };
              if (isSync) return { text: 'text-purple-400', bg: 'bg-purple-950/30', solid: 'bg-purple-500', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]' };
              if (isFinance) return { text: 'text-amber-400', bg: 'bg-amber-950/30', solid: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' };
              if (isRaise) return { text: 'text-orange-400', bg: 'bg-orange-950/30', solid: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' };
              return { text: 'text-cyan-400', bg: 'bg-cyan-950/30', solid: 'bg-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' };
            };
            const colors = getEngineColors();

            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative active:scale-[0.98]
                  ${isActive
                    ? `${colors.text} ${colors.bg}`
                    : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                  }
                `}
                title={item.title}
              >
                <item.icon isActive={isActive} className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? colors.text : 'group-hover:text-white'
                }`} />
                {isMobile ? <span>{item.title}</span> : <span className="sr-only">{item.title}</span>}
                {isActive && (
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${colors.solid} ${colors.glow}`} />
                )}
              </Link>
            );
          })}
          </div>

        <div className="h-px bg-white/5 mx-2 my-2" />

        {me?.role === 'admin' && adminItems.length > 0 && (
          <div className="space-y-1">
            {adminItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative active:scale-[0.98]
                    ${isActive
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                    }
                  `}
                  title={item.title}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-white'}`} />
                  {isMobile ? <span>{item.title}</span> : <span className="sr-only">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Agent Trigger - show when on agent-enabled pages */}
        {secondaryNavConfig?.agent && (
          <div className="mt-4 flex justify-center">
            <FloatingAgentTrigger agentType={secondaryNavConfig.agent} />
          </div>
        )}
        </nav>

      {/* Bottom Section */}
      <div className="p-4 space-y-4 bg-gradient-to-t from-black via-black to-transparent">
        {/* Credits / CTA */}
        {me ? (
        <div className="relative group flex justify-center" title="Top up coming soon">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center relative transition-colors cursor-not-allowed opacity-70">
               <span className="text-[9px] font-bold text-cyan-400">{me.credits || 0}</span>
            </div>
        </div>
        ) : (
          <Button 
             onClick={handleLogin}
             className="p-0 w-10 h-10 rounded-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white border-0 shadow-lg shadow-cyan-900/20"
          >
             <LogIn size={16} />
          </Button>
        )}
        </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [secondaryNavStats, setSecondaryNavStats] = useState({});
  const [enabledApps, setEnabledApps] = useState(FEATURES.DEFAULT_ENABLED_APPS);
  const [appsManagerOpen, setAppsManagerOpen] = useState(false);
  

  // Load user app config
  const loadUserAppConfig = React.useCallback(async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      // RLS handles filtering - list all accessible configs
      const configs = await base44.entities.UserAppConfig?.list?.({ limit: 10 }).catch(() => []) || [];
      if (configs.length > 0) {
        setEnabledApps(configs[0].enabled_apps || FEATURES.DEFAULT_ENABLED_APPS);
      }
    } catch (error) {
      logError('Layout:loadUserAppConfig', error);
    }
  }, []);

  // Load config on mount and listen for changes
  useEffect(() => {
    loadUserAppConfig();

    // Listen for config updates from AppsManagerModal or Onboarding
    const handleConfigUpdate = () => {
      loadUserAppConfig();
    };

    window.addEventListener('dashboard-config-updated', handleConfigUpdate);
    return () => {
      window.removeEventListener('dashboard-config-updated', handleConfigUpdate);
    };
  }, [loadUserAppConfig]);

  React.useEffect(() => {
    let isMounted = true;

    window.dispatchEvent(new CustomEvent("isyncso:navigation", {
      detail: { pathname: location.pathname, ts: new Date().toISOString() }
    }));

    // Load stats for secondary nav badges
    const loadStats = async () => {
      try {
        const { base44 } = await import("@/api/base44Client");
        // Convert pathname to lowercase for case-insensitive matching
        const path = location.pathname.toLowerCase();

        // SENTINEL stats
        if (path.includes('sentinel') || path.includes('aisystem') || path.includes('compliance')) {
          try {
            const systems = await base44.entities.AISystem.list();
            if (!isMounted) return;
            const highRiskCount = (systems || []).filter(s => s.risk_classification === 'high-risk').length;
            setSecondaryNavStats(prev => ({
              ...prev,
              systems: (systems || []).length,
              tasks: highRiskCount * SENTINEL.HIGH_RISK_TASK_MULTIPLIER
            }));
          } catch (e) {
            console.warn('Failed to load SENTINEL stats:', e.message);
          }
        }

        // GROWTH/CIDE stats
        if (path.includes('growth') || path.includes('cide')) {
          try {
            // Only load ProspectList - getICPTemplates edge function has CORS issues
            const lists = await base44.entities.ProspectList.list().catch(() => []);
            if (!isMounted) return;
            setSecondaryNavStats(prev => ({
              ...prev,
              lists: (lists || []).filter(l => l.status === 'active').length,
              templates: 0
            }));
          } catch (e) {
            console.warn('Failed to load GROWTH stats:', e.message);
          }
        }

        // LEARN stats
        if (path.includes('learn') || path.includes('course') || path.includes('certificate') || path.includes('skill') || path.includes('leaderboard')) {
          try {
            const currentUser = await base44.auth.me();
            if (!isMounted) return;
            if (currentUser?.id) {
              // RLS handles filtering - list all accessible items
              const [certificates, userSkills] = await Promise.all([
                base44.entities.Certificate?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([]),
                base44.entities.UserSkill?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([])
              ]);
              if (!isMounted) return;
              setSecondaryNavStats(prev => ({
                ...prev,
                certificates: (certificates || []).length,
                skills: (userSkills || []).length
              }));
            }
          } catch (e) {
            console.warn('Failed to load LEARN stats:', e.message);
          }
        }
      } catch (error) {
        logError('Layout:loadSecondaryNavStats', error);
      }
    };

    loadStats();

    return () => { isMounted = false; };
  }, [location.pathname]);

  // Callback for AppsManagerModal to update state immediately
  const onAppsConfigChange = (newConfig) => {
    setEnabledApps(newConfig.enabled_apps || FEATURES.DEFAULT_ENABLED_APPS);
  };

  // Memoize secondary nav config to prevent unnecessary recalculations
  const secondaryNavConfig = useMemo(
    () => getSecondaryNavConfig(location.pathname, secondaryNavStats),
    [location.pathname, secondaryNavStats]
  );
  
  return (
    <ErrorBoundary>
      <OnboardingGuard>
          <UserProvider>
          <PermissionProvider>
            <AchievementProvider>
              <Toaster />
              {/* Skip to main content link for keyboard navigation */}
              <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                Skip to main content
              </a>
              <div className="min-h-screen bg-black">
        <style>{`
          :root{
            --bg: #050505;
            --surface: #0E0E0E;
            --surface-hover: #161616;
            --txt: #FFFFFF;
            --muted: #888888;
            --accent: #06B6D4;
            --accent-glow: rgba(6, 182, 212, 0.4);
          }
          body{background:var(--bg); color:var(--txt); font-family: 'Inter', sans-serif;}

          /* Force dark backgrounds everywhere */
          .bg-white,
          .bg-white\\/95,.bg-white\\/90,.bg-white\\/80,.bg-white\\/70,
          .bg-white\\/60,.bg-white\\/50,.bg-white\\/40,.bg-white\\/30,
          .bg-white\\/20,.bg-white\\/10 { background: var(--surface) !important; border-color: rgba(255,255,255,0.08) !important; }

          .text-black { color: var(--txt) !important; }
          .border-white { border-color: rgba(255,255,255,.08) !important; }

          /* Surfaces */
          .glass-card {
            background: #0A0A0A !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 12px;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
          }

          /* Scrollbar Hide */
          .scrollbar-hide::-webkit-scrollbar {
              display: none;
          }
          .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }

          /* Buttons */
          .btn-primary {
            background: linear-gradient(180deg, rgba(6,182,212,0.1), rgba(6,182,212,0.05));
            color: #06B6D4;
            border: 1px solid rgba(6,182,212,0.3);
            box-shadow: 0 0 15px rgba(6,182,212,0.05);
            border-radius: 8px;
            transition: all 0.2s;
          }
          .btn-primary:hover {
            background: linear-gradient(180deg, rgba(6,182,212,0.2), rgba(6,182,212,0.1));
            border-color: rgba(6,182,212,0.6);
            color: #fff;
            box-shadow: 0 0 20px rgba(6,182,212,0.15);
          }

          .btn-outline {
            background: transparent;
            border: 1px solid rgba(255,255,255,0.1);
            color: #999;
            border-radius: 8px;
          }
          .btn-outline:hover {
            border-color: #fff;
            color: #fff;
            background: rgba(255,255,255,0.02);
          }

          /* Inputs */
          input, textarea, select {
            background: #080808 !important; 
            color: #fff !important; 
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 8px !important;
          }
          input:focus, textarea:focus, select:focus {
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 1px var(--accent-glow);
          }

          /* Global Colors */
          .bg-black { background: var(--bg) !important; }
          .text-white { color: #fff !important; }
          .text-gray-300, .text-gray-400 { color: #888 !important; }

          /* Badges & Pills */
          .badge, .pill {
            background: rgba(6,182,212,0.1) !important;
            color: #06B6D4 !important;
            border: 1px solid rgba(6,182,212,0.2) !important;
            border-radius: 6px !important;
          }

          /* Emerald Gradient replacements */
          .emerald-gradient, .emerald-gradient-hover {
             background: linear-gradient(180deg, rgba(6,182,212,0.1), rgba(6,182,212,0.05)) !important;
             color: #06B6D4 !important;
             border: 1px solid rgba(6,182,212,0.3) !important;
          }
          .emerald-gradient-hover:hover {
             border-color: #06B6D4 !important;
             color: #fff !important;
             box-shadow: 0 0 20px rgba(6,182,212,0.2) !important;
          }

          /* Progress Bars */
           div[role="progressbar"]{ background: rgba(255,255,255,.05) !important; height:6px !important; border-radius:999px !important; }
           div[role="progressbar"] > div{ background: var(--accent) !important; box-shadow: 0 0 10px var(--accent-glow); }

          /* Sheets/Dialogs */
          .SheetContent, .DialogContent {
             background: #0A0A0A !important;
             border-color: rgba(255,255,255,0.1) !important;
          }

          /* Metallic gradient title */
          .metallic-text{
            background: linear-gradient(180deg, #FFFFFF, rgba(255,255,255,.65));
            -webkit-background-clip: text; background-clip: text; color: transparent;
          }

          @media (prefers-reduced-motion: reduce) {
            .btn-primary, .emerald-gradient, .nav-item, a, button { transition: none !important; transform: none !important; }
          }

          /* Sidebar transitions */
          .sidebar-shell {
             transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
             background: #050505;
             border-right: 1px solid rgba(255,255,255,0.08);
          }

          /* Flowing Animations */
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
            50% { transform: translateY(-15px) translateX(5px); opacity: 1; }
          }
          @keyframes drift {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            33% { transform: translate(8px, -8px) scale(1.1); opacity: 0.8; }
            66% { transform: translate(-5px, 5px) scale(0.95); opacity: 0.7; }
          }
          @keyframes wave {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
            25% { transform: translateY(-10px) scale(1.05); opacity: 0.9; }
            50% { transform: translateY(-5px) scale(1.1); opacity: 1; }
            75% { transform: translateY(-12px) scale(1.05); opacity: 0.8; }
          }
          @keyframes cascade {
            0% { transform: translateY(-20px); opacity: 0; }
            50% { transform: translateY(10px); opacity: 1; }
            100% { transform: translateY(0); opacity: 0.7; }
          }
          @keyframes orbit {
            0% { transform: rotate(0deg) translateX(5px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(5px) rotate(-360deg); }
          }
          @keyframes celebrate {
            0%, 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.6; }
            25% { transform: translateY(-12px) scale(1.15) rotate(5deg); opacity: 1; }
            50% { transform: translateY(-8px) scale(1.1) rotate(-3deg); opacity: 0.9; }
            75% { transform: translateY(-15px) scale(1.2) rotate(3deg); opacity: 0.95; }
          }
          @keyframes shootDown {
            0% { height: 0; opacity: 0; }
            100% { height: var(--target-height); opacity: 1; }
          }
          `}</style>

        <div className="flex h-screen">
          {/* Desktop/Tablet Sidebar - Always collapsed */}
          <div className="hidden md:flex flex-col sidebar-shell w-[80px]">
            <SidebarContent 
              currentPageName={currentPageName} 
              secondaryNavConfig={secondaryNavConfig} 
              enabledApps={enabledApps}
              onOpenAppsManager={() => setAppsManagerOpen(true)}
            />
          </div>

          {/* Secondary Sidebar */}
          <SecondarySidebar config={secondaryNavConfig} location={location} />

          {/* Mobile Header - Only on phones (below 768px) */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800 pt-safe">
            <div className="flex items-center justify-between px-4 h-14 sm:h-16">
              <div className="flex items-center">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ebfb48566133bc1cface8c/3bee25c45_logoisyncso1.png"
                  alt="ISYNCSO"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 touch-target flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
                    aria-label="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0 border-gray-800 bg-black pt-safe pb-safe">
                  <SidebarContent
                    currentPageName={currentPageName}
                    isMobile={true}
                    secondaryNavConfig={secondaryNavConfig}
                    enabledApps={enabledApps}
                    onOpenAppsManager={() => setAppsManagerOpen(true)}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Main Content - Mobile optimized with safe areas */}
          <main
            id="main-content"
            className="flex-1 md:pt-0 pt-14 sm:pt-16 overflow-auto transition-all duration-300 pb-safe scroll-smooth-ios"
            role="main"
          >
            <div className="min-h-full">
              {children}
            </div>
          </main>




        </div>

        {/* Apps Manager Modal */}
        <AppsManagerModal
          isOpen={appsManagerOpen}
          onClose={() => setAppsManagerOpen(false)}
          onConfigUpdate={onAppsConfigChange}
        />
        </div>
          </AchievementProvider>
          </PermissionProvider>
        </UserProvider>
        </OnboardingGuard>
        </ErrorBoundary>
        );
        }
