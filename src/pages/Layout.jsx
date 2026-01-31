
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/supabaseClient";
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
  Euro,
  TrendingUp,
  Receipt,
  CreditCard,
  PieChart,
  Bot,
  Package,
  Cloud,
  Box,
  Palette,
  Image,
  Video,
  FolderOpen,
  Truck,
  PackageCheck,
  Wallet,
  FileSpreadsheet,
  UserCheck,
  Handshake,
  UserPlus,
  Crosshair,
  Plug,
  Presentation,
  FolderKey,
  Building2,
  Monitor,
  ExternalLink,
  FolderPlus,
  Mail,
  Plus,
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
import SyncAvatarMini from "@/components/icons/SyncAvatarMini";
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
import { AnimationProvider, useAnimation } from "@/components/context/AnimationContext";
import { SyncStateProvider } from "@/components/context/SyncStateContext";

// Import SYNC floating components
import SyncFloatingChat from "@/components/sync/SyncFloatingChat";
import SyncVoiceMode from "@/components/sync/SyncVoiceMode";
import EnrichmentProgressBar from "@/components/talent/EnrichmentProgressBar";

// Import Keyboard Shortcuts
import { KeyboardShortcutsProvider } from "@/contexts/KeyboardShortcutsContext";
import GlobalShortcuts from "@/components/GlobalShortcuts";

// Import Notifications
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";

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
    url: createPageUrl("CRMContacts") + "?type=lead",
    icon: Contact,
    permission: "users.view", // Basic permission
    matchPatterns: ["/crm", "/contacts-import"], // For active state matching
  },
  {
    title: "Projects",
    url: createPageUrl("Projects"),
    icon: FolderKanban,
    permission: "projects.view",
  },
  {
    title: "Products",
    url: createPageUrl("Products"),
    icon: Package,
    permission: null, // Always visible - core feature
    matchPatterns: ["/product", "/inventory", "/stockpurchases"], // Matches /products, /productdetail, /inventory*, etc.
  },
  {
    title: "Inbox",
    url: createPageUrl("Inbox"),
    icon: Inbox,
    permission: "inbox.view",
  },
];

// Bottom navigation items (Admin, Settings)
const bottomNavItems = [
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: SettingsIcon,
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
    matchPatterns: ["/growth", "/sequences", "/deals", "/leads", "/insights", "/prospect", "/research", "/pipeline"],
  },
  learn: {
    title: "Learn",
    url: createPageUrl("LearnDashboard"),
    icon: GraduationCap,
    id: 'learn',
    permission: "courses.view", // Learning features
    matchPatterns: ["/learn", "/course", "/lesson", "/certificate", "/skill", "/leaderboard"],
  },
  talent: {
    title: "Talent",
    url: createPageUrl("TalentDashboard"),
    icon: UserPlus,
    id: 'talent',
    permission: "talent.view",
    matchPatterns: ["/talent"],
  },
  sentinel: {
    title: "Sentinel",
    url: createPageUrl("SentinelDashboard"),
    icon: Shield,
    id: 'sentinel',
    permission: "admin.access", // Admin/compliance feature
    matchPatterns: ["/sentinel", "/aisystem", "/compliance", "/document", "/riskassessment"],
  },
  finance: {
    title: "Finance",
    url: createPageUrl("FinanceOverview"),
    icon: Euro,
    id: 'finance',
    permission: "finance.view",
    matchPatterns: ["/finance", "/proposal"],
  },
  raise: {
    title: "Raise",
    url: createPageUrl("Raise"),
    icon: TrendingUp,
    id: 'raise',
    permission: "finance.view", // Fundraising is finance-related
    matchPatterns: ["/raise"],
  },
  create: {
    title: "Create",
    url: createPageUrl("Create"),
    icon: Palette,
    id: 'create',
    permission: null, // Always visible - content creation feature
    matchPatterns: ["/create"],
  },
};



const adminItems = [];

// Products settings key for localStorage
const PRODUCTS_SETTINGS_KEY = 'isyncso_products_settings';

// Helper function to check if a navigation item is active
function isNavItemActive(item, pathname) {
  const lowerPath = pathname.toLowerCase();

  // Extract base path from url (remove query params)
  const baseUrl = item.url.split('?')[0].toLowerCase();

  // For Dashboard, use exact match
  if (baseUrl === '/dashboard') {
    return lowerPath === '/dashboard' || lowerPath === '/';
  }

  // For other items, check if pathname matches the base URL exactly or as prefix
  if (lowerPath === baseUrl || lowerPath.startsWith(baseUrl + '/')) {
    return true;
  }

  // Get patterns to check (support both singular matchPattern and plural matchPatterns)
  const patterns = item.matchPatterns || (item.matchPattern ? [item.matchPattern] : []);

  if (patterns.length > 0) {
    return patterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      // Strict matching: pattern must match as a path segment
      // /crm matches /crmcontacts (starts with /crm)
      // /crm matches /crm/profile (starts with /crm/)
      // /crm does NOT match /microscopy (no leading slash match)
      return lowerPath.startsWith(lowerPattern);
    });
  }

  return false;
}

// Get secondary nav config based on current route
function getSecondaryNavConfig(pathname, stats = {}, productsSettings = {}) {
  // Convert to lowercase for case-insensitive matching
  const path = pathname.toLowerCase();

  // CRM routes - use startsWith for stricter matching
  if (path.startsWith('/crm') || path.startsWith('/contacts-import')) {
    return {
      title: 'CRM',
      color: 'cyan',
      items: [
        { label: 'Leads', path: createPageUrl('CRMContacts') + '?type=lead', icon: Target, badge: stats.contacts },
        { label: 'Prospects', path: createPageUrl('CRMContacts') + '?type=prospect', icon: TrendingUp },
        { label: 'Customers', path: createPageUrl('CRMContacts') + '?type=customer', icon: UserCheck },
        { label: 'Suppliers', path: createPageUrl('CRMContacts') + '?type=supplier', icon: Truck },
        { label: 'Partners', path: createPageUrl('CRMContacts') + '?type=partner', icon: Handshake },
        { label: 'Candidates', path: createPageUrl('CRMContacts') + '?type=candidate', icon: UserPlus },
        { label: 'Targets', path: createPageUrl('CRMContacts') + '?type=target', icon: Crosshair },
        { label: 'All Contacts', path: createPageUrl('CRMContacts'), icon: Users },
        { label: 'Import', path: createPageUrl('ContactsImport'), icon: FileSpreadsheet },
      ]
    };
  }

  // SENTINEL routes
  if (path.startsWith('/sentinel') || path.startsWith('/aisystem') || path.startsWith('/compliance') || path.startsWith('/document') || path.startsWith('/riskassessment')) {
    return {
      title: 'SENTINEL',
      color: 'sage',
      agent: 'sentinel',
      items: [
        { label: 'Dashboard', path: createPageUrl('SentinelDashboard'), icon: LayoutDashboard },
        { label: 'AI Systems', path: createPageUrl('AISystemInventory'), icon: Cpu, badge: stats.systems },
        { label: 'Roadmap', path: createPageUrl('ComplianceRoadmap'), icon: Map, badge: stats.tasks },
        { label: 'Documents', path: createPageUrl('DocumentGenerator'), icon: FileText },
      ]
    };
  }

  // TALENT routes (must be before GROWTH to prevent /talentdeals matching /deals)
  if (path.startsWith('/talent') || path.startsWith('/marketplace')) {
    return {
      title: 'TALENT',
      color: 'red',
      agent: 'talent',
      items: [
        { label: 'Dashboard', path: createPageUrl('TalentDashboard'), icon: LayoutDashboard },
        { label: 'Candidates', path: createPageUrl('TalentCandidates'), icon: Users },
        { label: 'Projects', path: createPageUrl('TalentProjects'), icon: Briefcase },
        { label: 'Campaigns', path: createPageUrl('TalentCampaigns'), icon: Megaphone },
        { label: 'Clients', path: createPageUrl('TalentClients'), icon: Building2 },
        { label: 'Deals', path: createPageUrl('TalentDeals'), icon: Handshake },
        { label: 'SMS Outreach', path: createPageUrl('TalentSMSOutreach'), icon: MessageSquare },
        { label: 'Nests', path: createPageUrl('TalentNests'), icon: Package },
      ]
    };
  }

  // GROWTH routes
  if (path.startsWith('/growth') || path.startsWith('/sequences') || path.startsWith('/deals') ||
      path.startsWith('/leads') || path.startsWith('/insights') || path.startsWith('/prospect') ||
      path.startsWith('/research') || path.startsWith('/pipeline')) {
    return {
      title: 'GROWTH',
      color: 'indigo',
      agent: 'growth',
      items: [
        { label: 'Dashboard', path: createPageUrl('Growth'), icon: LayoutDashboard },
        { label: 'Pipeline', path: createPageUrl('GrowthPipeline'), icon: Kanban },
        { label: 'Prospects', path: createPageUrl('GrowthProspects'), icon: Users },
        { label: 'Campaigns', path: createPageUrl('GrowthCampaigns'), icon: Megaphone },
        { label: 'Signals', path: createPageUrl('GrowthSignals'), icon: Radio },
      ]
    };
  }

  // FINANCE routes
  if (path.startsWith('/finance') || path.startsWith('/proposal')) {
    return {
      title: 'FINANCE',
      color: 'amber',
      agent: 'finance',
      items: [
        { label: 'Dashboard', path: createPageUrl('FinanceOverview'), icon: LayoutDashboard },
        { label: 'Invoices', path: createPageUrl('FinanceInvoices'), icon: Receipt },
        { label: 'Proposals', path: createPageUrl('FinanceProposals'), icon: FileText },
        { label: 'Business Expenses', path: createPageUrl('FinanceExpenses'), icon: Euro },
        { label: 'Subscriptions', path: createPageUrl('FinanceSubscriptions'), icon: CreditCard },
      ]
    };
  }

  // PRODUCTS routes
  if (path.startsWith('/products') || path.startsWith('/productdetail') || path.startsWith('/inventory') || path.startsWith('/stockpurchases')) {
    const { digitalEnabled = true, physicalEnabled = true } = productsSettings;

    // Build items list based on settings
    const items = [
      { label: 'Overview', path: createPageUrl('Products'), icon: Package },
    ];

    if (digitalEnabled) {
      items.push({ label: 'Digital', path: createPageUrl('ProductsDigital'), icon: Cloud });
    }
    if (physicalEnabled) {
      items.push({ label: 'Physical', path: createPageUrl('ProductsPhysical'), icon: Box });
    }

    // Inventory management items (only for physical products)
    if (physicalEnabled) {
      items.push({ label: 'Receiving', path: createPageUrl('InventoryReceiving'), icon: PackageCheck });
      items.push({ label: 'Shipping', path: createPageUrl('InventoryShipping'), icon: Truck });
      items.push({ label: 'Stock Purchases', path: createPageUrl('StockPurchases'), icon: Receipt });
      items.push({ label: 'Import', path: createPageUrl('InventoryImport'), icon: FileSpreadsheet });
    }

    return {
      title: 'PRODUCTS',
      color: 'cyan',
      items
    };
  }

  // RAISE routes
  if (path.startsWith('/raise')) {
    return {
      title: 'RAISE',
      color: 'orange',
      agent: 'raise',
      items: [
        { label: 'Dashboard', path: createPageUrl('Raise'), icon: LayoutDashboard },
        { label: 'Investors', path: createPageUrl('RaiseInvestors'), icon: Building2 },
        { label: 'Pitch Decks', path: createPageUrl('RaisePitchDecks'), icon: Presentation },
        { label: 'Data Room', path: createPageUrl('RaiseDataRoom'), icon: FolderKey },
        { label: 'Campaigns', path: createPageUrl('RaiseCampaigns'), icon: Rocket },
      ]
    };
  }

  // LEARN routes
  if (path.startsWith('/learn') || path.startsWith('/course') || path.startsWith('/lesson') ||
      path.startsWith('/certificate') || path.startsWith('/skill') || path.startsWith('/leaderboard')) {
    return {
      title: 'LEARN',
      color: 'teal',
      agent: 'learn',
      items: [
        { label: 'Dashboard', path: createPageUrl('LearnDashboard'), icon: LayoutDashboard },
        { label: 'My Courses', path: createPageUrl('Learn'), icon: BookOpen },
        { label: 'Skills', path: createPageUrl('SkillMap'), icon: Target, badge: stats.skills },
        { label: 'Course Builder', path: createPageUrl('ManageCourses'), icon: Library },
        { label: 'AI Tools', path: createPageUrl('LearnAITools'), icon: Sparkles },
      ]
    };
  }

  // SYNC routes
  if (path.startsWith('/sync') || path.startsWith('/aiassistant') || path.startsWith('/actions') ||
      path.startsWith('/activity') || path.startsWith('/desktop') || path.startsWith('/agents') ||
      path.startsWith('/agentdetail') || path.startsWith('/integration') || path.startsWith('/dailyjournal')) {
    const activityItems = [
      { label: 'SYNC Agent', path: createPageUrl('SyncAgent'), icon: Brain },
      { label: 'Agents', path: createPageUrl('Agents'), icon: Bot },
      { label: 'Integrations', path: createPageUrl('Integrations'), icon: Plug },
      { label: 'Overview', path: createPageUrl('DesktopActivity') + '?tab=overview', icon: BarChart3, matchPath: '/desktopactivity' },
      { label: 'Apps', path: createPageUrl('DesktopActivity') + '?tab=apps', icon: Monitor },
      { label: 'Daily Journals', path: createPageUrl('DesktopActivity') + '?tab=journals', icon: BookOpen },
      { label: 'Timeline', path: createPageUrl('DesktopActivity') + '?tab=timeline', icon: Activity },
      { label: 'Deep Context', path: createPageUrl('DesktopActivity') + '?tab=context', icon: Brain },
    ];
    return {
      title: 'SYNC',
      color: 'cyan',
      items: activityItems
    };
  }

  // CREATE routes
  if (path.startsWith('/create')) {
    return {
      title: 'CREATE',
      color: 'yellow',
      agent: 'create',
      items: [
        { label: 'Dashboard', path: createPageUrl('Create'), icon: LayoutDashboard },
        { label: 'Branding', path: createPageUrl('CreateBranding'), icon: Palette },
        { label: 'Images', path: createPageUrl('CreateImages'), icon: Image },
        { label: 'Videos', path: createPageUrl('CreateVideos'), icon: Video },
        { label: 'Library', path: createPageUrl('CreateLibrary'), icon: FolderOpen },
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
    text: THEME_COLORS.default.text,
    bg: THEME_COLORS.default.bg,
    border: THEME_COLORS.default.border,
    borderSolid: THEME_COLORS.default.solid,
    glow: THEME_COLORS.default.glow
  },
  teal: {
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
  },
  rose: {
    text: THEME_COLORS.create.text,
    bg: THEME_COLORS.create.bg,
    border: THEME_COLORS.create.border,
    borderSolid: THEME_COLORS.create.solid,
    glow: THEME_COLORS.create.glow
  },
  yellow: {
    text: THEME_COLORS.create.text,
    bg: THEME_COLORS.create.bg,
    border: THEME_COLORS.create.border,
    borderSolid: THEME_COLORS.create.solid,
    glow: THEME_COLORS.create.glow
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    borderSolid: 'bg-violet-500',
    glow: 'shadow-[0_0_10px_rgba(139,92,246,0.5)]'
  },
  red: {
    text: THEME_COLORS.talent.text,
    bg: THEME_COLORS.talent.bg,
    border: THEME_COLORS.talent.border,
    borderSolid: THEME_COLORS.talent.solid,
    glow: THEME_COLORS.talent.glow
  }
};

// Sidebar alignment constants
const SIDEBAR_CONSTANTS = {
  AVATAR_SECTION: 80,      // pt-4 (16px) + avatar (52px) + pb-3 (12px)
  NAV_PADDING: 16,         // py-4 top padding
  CORE_ITEM_HEIGHT: 44,    // min-h-[44px]
  ITEM_GAP: 4,             // space-y-1
  DIVIDER_HEIGHT: 17,      // h-px + my-2 (1px + 8px + 8px)
  ALIGNMENT_ADJUST: -8,    // Fine-tune adjustment to align items perfectly
};

// Core nav item indices (Dashboard, CRM, Projects, Products, Inbox)
const CORE_NAV_INDICES = {
  crm: 1,       // CRM is 2nd in core nav
  products: 3,  // Products is 4th in core nav
};

// Calculate offset for secondary sidebar based on config
function calculateSecondaryNavOffset(config) {
  const { AVATAR_SECTION, NAV_PADDING, CORE_ITEM_HEIGHT, ITEM_GAP, DIVIDER_HEIGHT, ALIGNMENT_ADJUST } = SIDEBAR_CONSTANTS;

  // Check if this is a core nav item (CRM, Products) or an engine app
  const configTitle = config?.title?.toLowerCase();
  const coreNavIndex = CORE_NAV_INDICES[configTitle];

  if (coreNavIndex !== undefined) {
    // Core nav item: align with that position
    // Offset = avatar + nav padding + items above + adjustment
    return AVATAR_SECTION + NAV_PADDING + (coreNavIndex * (CORE_ITEM_HEIGHT + ITEM_GAP)) + ALIGNMENT_ADJUST;
  }

  // Engine app: calculate based on engine index
  const agentId = config?.agent;
  const engineOrder = Object.keys(ENGINE_ITEMS_CONFIG);
  const engineIndex = agentId ? engineOrder.indexOf(agentId) : 0;

  // Count visible core items (5: Dashboard, CRM, Projects, Products, Inbox)
  const CORE_ITEMS_COUNT = 5;

  // Base offset: avatar + nav padding + core items (with gaps) + divider
  const coreItemsTotal = (CORE_ITEMS_COUNT * CORE_ITEM_HEIGHT) + ((CORE_ITEMS_COUNT - 1) * ITEM_GAP);
  const baseOffset = AVATAR_SECTION + NAV_PADDING + coreItemsTotal + DIVIDER_HEIGHT;

  // Add offset for engine items before the active one + alignment adjustment
  const engineItemsOffset = Math.max(0, engineIndex) * (CORE_ITEM_HEIGHT + ITEM_GAP);

  return baseOffset + engineItemsOffset + ALIGNMENT_ADJUST;
}

// Submenu Flyout Component - Floating panel that appears on click/hover
function SubmenuFlyout({ config, openSubmenu, onClose, onEnter, location }) {
  // Get submenu identifier (agent for engine apps, title for core items like CRM/Products)
  const submenuId = config?.agent || config?.title?.toLowerCase();

  // Only show if config exists and this submenu is open
  if (!config || !submenuId || openSubmenu !== submenuId) return null;

  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.cyan;

  // Calculate dynamic offset to align with the active primary nav item
  // Subtract header height (title + padding + border + container padding) so first nav item aligns
  const baseOffset = calculateSecondaryNavOffset(config);
  const headerHeight = 44; // title (~14px) + pb-2 (8px) + mb-2 (8px) + p-3 container (12px) + border (1px)
  const navOffset = baseOffset - headerHeight;

  return (
    <div
      className="absolute left-[72px] lg:left-[80px] bg-black/95 backdrop-blur-sm border border-white/10 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-left-2 duration-200 hidden md:block overflow-hidden"
      style={{ top: `${navOffset}px` }}
      onMouseEnter={onEnter}
      onMouseLeave={onClose}
    >
      {/* Subtle color tint overlay */}
      <div className={`absolute inset-0 ${colors.bg} opacity-30 rounded-2xl pointer-events-none`} />

      {/* Title */}
      <div className="relative px-2 pb-2 mb-2 border-b border-white/5">
        <h3 className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>
          {config.title}
        </h3>
      </div>

      {/* Nav items */}
      <TooltipProvider delayDuration={200}>
        <nav className="relative space-y-1">
          {config.items.map((item) => {
            // Parse URLs for proper comparison
            const itemUrl = new URL(item.path, 'http://localhost');
            const currentUrl = new URL(location.pathname + location.search, 'http://localhost');

            let isActive = false;

            // Check pathname match first
            if (currentUrl.pathname.toLowerCase() === itemUrl.pathname.toLowerCase()) {
              // If item has a 'type' query param, it must match
              const itemType = itemUrl.searchParams.get('type');
              const currentType = currentUrl.searchParams.get('type');

              if (itemType) {
                // Item specifies a type, must match exactly
                isActive = itemType === currentType;
              } else {
                // No specific type required, pathname match is enough
                isActive = true;
              }
            } else {
              // Check if current path starts with item path (for nested routes)
              const basePath = itemUrl.pathname.toLowerCase();
              isActive = currentUrl.pathname.toLowerCase().startsWith(basePath + '/');
            }

            const Icon = item.icon;

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    className={`
                      relative flex items-center justify-center w-full h-11 w-11 rounded-xl transition-all duration-200 group active:scale-[0.98]
                      ${isActive
                        ? `${colors.text} ${colors.bg}`
                        : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? colors.text : 'group-hover:text-white'}`} />
                    {item.badge > 0 && (
                      <span className={`absolute top-0.5 right-0.5 text-[8px] px-1 py-0.5 rounded-full font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${colors.borderSolid} rounded-r-full ${colors.glow}`} />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className={`bg-gray-900 ${colors.border} ${colors.text}`}>
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

// Mobile Secondary Navigation Component
function MobileSecondaryNav({ config, location }) {
  if (!config) return null;

  const colors = COLOR_CLASSES[config.color] || COLOR_CLASSES.cyan;

  return (
    <div className="border-t border-white/5 mt-2 pt-3">
      <div className="px-3 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>
          {config.title}
        </span>
      </div>
      <div className="space-y-0.5 px-1">
        {config.items.map((item) => {
          // Parse URLs for proper comparison
          const itemUrl = new URL(item.path, 'http://localhost');
          const currentUrl = new URL(location.pathname + location.search, 'http://localhost');

          let isActive = false;

          // Check pathname match first
          if (currentUrl.pathname.toLowerCase() === itemUrl.pathname.toLowerCase()) {
            // If item has a 'type' query param, it must match
            const itemType = itemUrl.searchParams.get('type');
            const currentType = currentUrl.searchParams.get('type');

            if (itemType) {
              // Item specifies a type, must match exactly
              isActive = itemType === currentType;
            } else {
              // No specific type required, pathname match is enough
              isActive = true;
            }
          } else {
            // Check if current path starts with item path (for nested routes)
            const basePath = itemUrl.pathname.toLowerCase();
            isActive = currentUrl.pathname.toLowerCase().startsWith(basePath + '/');
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98]
                ${isActive
                  ? `${colors.text} ${colors.bg}`
                  : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? colors.text : ''}`} />
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Reusable Sidebar Content - must be rendered inside PermissionProvider
function SidebarContent({ currentPageName, isMobile = false, secondaryNavConfig, enabledApps, onOpenAppsManager, openSubmenu, setOpenSubmenu, onSubmenuClose, onSubmenuEnter }) {
    const location = useLocation();
    const navigate = useNavigate();
  const [me, setMe] = React.useState(null);

  // Get permission context - use the hook directly
  const { hasPermission, isAdmin, isManager, isLoading: permLoading } = usePermissions();

  // Get animation context for avatar state
  const { triggerActivity } = useAnimation();

  // Get team-based app access
  const { effectiveApps, hasTeams, isLoading: teamLoading } = useTeamAccess();

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const u = await db.auth.me();
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
      // Admin link - show for RBAC admins or users with admin.access
      if (item.isAdmin) {
        return isAdmin || hasPermission(item.permission);
      }
      // Check permission
      return hasPermission(item.permission);
    });
  }, [hasPermission, permLoading, isAdmin]);

  // Memoize filtered bottom nav items (Settings, Admin)
  const filteredBottomNavItems = useMemo(() => {
    if (permLoading) {
      return bottomNavItems.filter(item => !item.permission);
    }
    return bottomNavItems.filter(item => {
      if (!item.permission) return true;
      if (item.isAdmin) {
        return isAdmin || hasPermission(item.permission);
      }
      return hasPermission(item.permission);
    });
  }, [hasPermission, permLoading, isAdmin]);

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
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <div className="flex flex-col h-full relative overflow-visible">
      {/* Navigation - Mobile optimized with larger touch targets */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide scroll-smooth-ios">
        {/* SYNC Avatar - top of sidebar */}
        <Link
          to={createPageUrl("SyncAgent")}
          className="flex items-center justify-center min-h-[44px] p-2 mb-2 rounded-xl transition-all duration-200 group hover:bg-white/5 active:scale-[0.98]"
          title="SYNC Agent"
        >
          <SyncAvatarMini size={36} />
        </Link>

        {/* Core Navigation - filtered by permissions */}
        <div className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = isNavItemActive(item, location.pathname);
            // Check if this item has a secondary nav (CRM, Products)
            const hasSecondaryNav = item.matchPatterns && (item.title === 'CRM' || item.title === 'Products');
            const submenuId = item.title.toLowerCase();

            // Mobile: always use Link
            if (isMobile) {
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={triggerActivity}
                  className={`flex items-center justify-start gap-3 px-4 min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98]
                    ${isActive
                      ? 'text-cyan-400 bg-cyan-950/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                    }
                  `}
                  title={item.title}
                >
                  <item.icon isActive={isActive} className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />
                  <span className="text-sm font-medium">{item.title}</span>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-l-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                  )}
                </Link>
              );
            }

            // Desktop: items with secondary nav use button for submenu
            if (hasSecondaryNav) {
              return (
                <button
                  key={item.title}
                  onClick={() => {
                    triggerActivity();
                    setOpenSubmenu?.(submenuId);
                    if (!isActive) {
                      navigate(item.url);
                    }
                  }}
                  onMouseEnter={() => {
                    if (isActive) {
                      onSubmenuEnter?.();
                      setOpenSubmenu?.(submenuId);
                    }
                  }}
                  onMouseLeave={() => {
                    onSubmenuClose?.();
                  }}
                  className={`flex items-center justify-center min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98] w-full
                    ${isActive
                      ? 'text-cyan-400 bg-cyan-950/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                    }
                  `}
                  title={item.title}
                >
                  <item.icon isActive={isActive} className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-l-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                  )}
                </button>
              );
            }

            // Desktop: items without secondary nav use Link
            return (
              <Link
                key={item.title}
                to={item.url}
                onClick={triggerActivity}
                className={`flex items-center justify-center min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98]
                  ${isActive
                    ? 'text-cyan-400 bg-cyan-950/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                  }
                `}
                title={item.title}
              >
                <item.icon isActive={isActive} className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />
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
            const isActive = isNavItemActive(item, location.pathname);
            const isLearn = item.id === "learn";
            const isSentinel = item.id === "sentinel";
            const isGrowth = item.id === "growth";
            const isSync = item.id === "sync";
            const isFinance = item.id === "finance";
            const isRaise = item.id === "raise";
            const isTalent = item.id === "talent";
            const isCreate = item.id === "create";

            // Get the appropriate color classes for this engine
            const getEngineColors = () => {
              if (isLearn) return { text: 'text-teal-400', bg: 'bg-teal-950/30', solid: 'bg-teal-500', glow: 'shadow-[0_0_10px_rgba(20,184,166,0.5)]' };
              if (isSentinel) return { text: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/10', solid: 'bg-[#86EFAC]', glow: 'shadow-[0_0_10px_rgba(134,239,172,0.5)]' };
              if (isGrowth) return { text: 'text-indigo-400', bg: 'bg-indigo-950/30', solid: 'bg-indigo-500', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' };
              if (isSync) return { text: 'text-purple-400', bg: 'bg-purple-950/30', solid: 'bg-purple-500', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]' };
              if (isFinance) return { text: 'text-amber-400', bg: 'bg-amber-950/30', solid: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' };
              if (isRaise) return { text: 'text-orange-400', bg: 'bg-orange-950/30', solid: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' };
              if (isTalent) return { text: 'text-red-400', bg: 'bg-red-950/30', solid: 'bg-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' };
              if (isCreate) return { text: 'text-yellow-400', bg: 'bg-yellow-950/30', solid: 'bg-yellow-500', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' };
              return { text: 'text-cyan-400', bg: 'bg-cyan-950/30', solid: 'bg-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' };
            };
            const colors = getEngineColors();

            // Mobile: use Link for navigation, Desktop: use button for submenu control
            if (isMobile) {
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={triggerActivity}
                  className={`flex items-center justify-start gap-3 px-4 min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98]
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
                  <span className="text-sm font-medium">{item.title}</span>
                  {isActive && (
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${colors.solid} ${colors.glow}`} />
                  )}
                </Link>
              );
            }

            // Desktop: button with submenu flyout behavior
            return (
              <button
                key={item.title}
                onClick={() => {
                  triggerActivity();
                  // Always open submenu on click
                  setOpenSubmenu?.(item.id);
                  // Navigate if not already on this engine
                  if (!isActive) {
                    navigate(item.url);
                  }
                }}
                onMouseEnter={() => {
                  // Only show submenu on hover if already active
                  if (isActive) {
                    onSubmenuEnter?.();
                    setOpenSubmenu?.(item.id);
                  }
                }}
                onMouseLeave={() => {
                  onSubmenuClose?.();
                }}
                className={`flex items-center justify-center min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98] w-full
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
                {isActive && (
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${colors.solid} ${colors.glow}`} />
                )}
              </button>
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
                  onClick={triggerActivity}
                  className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98]
                    ${isActive
                      ? 'text-purple-400 bg-purple-950/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                    }
                  `}
                  title={item.title}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-white'}`} />
                  {isMobile && <span className="text-sm font-medium">{item.title}</span>}
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

        {/* Mobile Secondary Navigation - shows context nav in mobile sheet */}
        {isMobile && secondaryNavConfig && (
          <MobileSecondaryNav config={secondaryNavConfig} location={location} />
        )}
        </nav>

      {/* Bottom Section */}
      <div className={`p-4 space-y-1 bg-gradient-to-t from-black via-black to-transparent ${isMobile ? 'pb-6' : ''}`}>
        {/* Notifications bell */}
        <NotificationsDropdown sidebarMode={!isMobile} />

        {/* Settings and Admin - at the bottom */}
        {filteredBottomNavItems.map((item) => {
          const isActive = isNavItemActive(item, location.pathname);
          const isAdminItem = item.isAdmin;
          const isExternalLink = item.isExternal;

          // External links open in new tab
          if (isExternalLink) {
            return (
              <a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={triggerActivity}
                className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98]
                  text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 active:bg-emerald-950/30
                `}
                title={`${item.title} (opens in new tab)`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0 transition-colors" />
                {isMobile && <span className="text-sm font-medium">{item.title}</span>}
              </a>
            );
          }

          return (
            <Link
              key={item.title}
              to={item.url}
              onClick={triggerActivity}
              className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative active:scale-[0.98]
                ${isActive
                  ? isAdminItem
                    ? 'text-purple-400 bg-purple-950/30'
                    : 'text-cyan-400 bg-cyan-950/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                }
              `}
              title={item.title}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                isActive
                  ? isAdminItem ? 'text-purple-400' : 'text-cyan-400'
                  : 'group-hover:text-white'
              }`} />
              {isMobile && <span className="text-sm font-medium">{item.title}</span>}
              {isActive && (
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${
                  isAdminItem
                    ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                    : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                }`} />
              )}
            </Link>
          );
        })}

        <div className="h-px bg-white/5 mx-2 my-1" />

        {/* Credits / CTA */}
        {me ? (
        <Link
          to="#"
          className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] p-3 rounded-xl transition-all duration-200 group text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 cursor-not-allowed opacity-70`}
          title="Top up coming soon"
          onClick={(e) => e.preventDefault()}
        >
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 flex items-center justify-center flex-shrink-0">
             <span className="text-[10px] font-bold text-cyan-400">{me.credits || 0}</span>
          </div>
          {isMobile && <span className="text-sm font-medium">Credits</span>}
        </Link>
        ) : (
          <button
             onClick={handleLogin}
             className={`flex items-center ${isMobile ? 'justify-start gap-3 px-4' : 'justify-center'} min-h-[44px] p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all`}
          >
             <LogIn size={20} className="flex-shrink-0" />
             {isMobile && <span className="text-sm font-medium">Log In</span>}
          </button>
        )}

        </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [secondaryNavStats, setSecondaryNavStats] = useState({});
  const [enabledApps, setEnabledApps] = useState(FEATURES.DEFAULT_ENABLED_APPS);
  const [appsManagerOpen, setAppsManagerOpen] = useState(false);
  const [productsSettings, setProductsSettings] = useState({ digitalEnabled: true, physicalEnabled: true });

  // SYNC floating chat and voice mode state
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);

  // Handler for SYNC voice mode
  const handleOpenVoiceMode = useCallback(() => {
    setIsFloatingChatOpen(false); // Close chat if open
    setIsVoiceModeOpen(true);
  }, []);

  const handleCloseFloatingChat = useCallback(() => {
    setIsFloatingChatOpen(false);
  }, []);

  const handleCloseVoiceMode = useCallback(() => {
    setIsVoiceModeOpen(false);
  }, []);

  const handleExpandChatToFullPage = useCallback(() => {
    setIsFloatingChatOpen(false);
    // Navigation handled in child component
  }, []);

  const handleSwitchToChat = useCallback(() => {
    setIsVoiceModeOpen(false);
    setIsFloatingChatOpen(true);
  }, []);

  // Submenu flyout state
  const [openSubmenu, setOpenSubmenu] = useState(null); // engine id or null
  const closeTimeoutRef = useRef(null);

  const handleSubmenuClose = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenSubmenu(null);
    }, 150); // Small delay for mouse movement
  }, []);

  const handleSubmenuEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);


  // Load user app config
  const loadUserAppConfig = React.useCallback(async () => {
    try {
      const user = await db.auth.me();
      if (!user) return;

      // RLS handles filtering - list all accessible configs
      const configs = await db.entities.UserAppConfig?.list?.({ limit: 10 }).catch(() => []) || [];
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

  // Load products settings from localStorage and listen for changes
  useEffect(() => {
    // Load initial settings
    try {
      const saved = localStorage.getItem(PRODUCTS_SETTINGS_KEY);
      if (saved) {
        setProductsSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load products settings:', e);
    }

    // Listen for settings changes from Products page
    const handleProductsSettingsChange = (event) => {
      if (event.detail) {
        setProductsSettings(event.detail);
      }
    };

    window.addEventListener('products-settings-changed', handleProductsSettingsChange);
    return () => {
      window.removeEventListener('products-settings-changed', handleProductsSettingsChange);
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    window.dispatchEvent(new CustomEvent("isyncso:navigation", {
      detail: { pathname: location.pathname, ts: new Date().toISOString() }
    }));

    // Load stats for secondary nav badges
    const loadStats = async () => {
      try {
        const { db } = await import("@/api/supabaseClient");
        // Convert pathname to lowercase for case-insensitive matching
        const path = location.pathname.toLowerCase();

        // SENTINEL stats
        if (path.includes('sentinel') || path.includes('aisystem') || path.includes('compliance')) {
          try {
            const systems = await db.entities.AISystem.list();
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
            const lists = await db.entities.ProspectList.list().catch(() => []);
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
            const currentUser = await db.auth.me();
            if (!isMounted) return;
            if (currentUser?.id) {
              // RLS handles filtering - list all accessible items
              const [certificates, userSkills] = await Promise.all([
                db.entities.Certificate?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([]),
                db.entities.UserSkill?.list?.({ limit: 100 }).catch(() => []) || Promise.resolve([])
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
    () => getSecondaryNavConfig(location.pathname, secondaryNavStats, productsSettings),
    [location.pathname, secondaryNavStats, productsSettings]
  );
  
  return (
    <ErrorBoundary>
      <OnboardingGuard>
          <UserProvider>
          <SyncStateProvider>
          <AnimationProvider>
          <PermissionProvider>
          <KeyboardShortcutsProvider>
          <NotificationsProvider>
            <AchievementProvider>
              <Toaster />
              <GlobalShortcuts />
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

          /* ── Sentinel Light Theme ─────────────────────────────────
             Comprehensive overrides for ALL dark classes used in Sentinel.
             html[data-sentinel-light] targets body/wrapper; [data-sentinel-light] targets descendants. */

          /* Page & body */
          html[data-sentinel-light] body { background: #F8FAFC !important; color: #0F172A !important; }
          html[data-sentinel-light] .min-h-screen.bg-black { background: #F8FAFC !important; }
          [data-sentinel-light] { background: #F8FAFC !important; color: #0F172A !important; }

          /* Backgrounds — white/slate */
          [data-sentinel-light] .bg-white,
          [data-sentinel-light] .bg-white\\/95,[data-sentinel-light] .bg-white\\/90,[data-sentinel-light] .bg-white\\/80,
          [data-sentinel-light] .bg-white\\/70,[data-sentinel-light] .bg-white\\/60 { background: #FFFFFF !important; border-color: #E2E8F0 !important; }
          [data-sentinel-light] .bg-slate-50 { background: #F8FAFC !important; }
          [data-sentinel-light] .bg-slate-100 { background: #F1F5F9 !important; }
          [data-sentinel-light] .bg-slate-200 { background: #E2E8F0 !important; }

          /* Backgrounds — dark surfaces → light */
          [data-sentinel-light] .bg-black { background: #F8FAFC !important; }
          [data-sentinel-light] .bg-zinc-950 { background: #F8FAFC !important; }
          [data-sentinel-light] .bg-zinc-900 { background: #FFFFFF !important; }
          [data-sentinel-light] .bg-zinc-900\\/50 { background: #FFFFFF !important; border-color: #E2E8F0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04) !important; }
          [data-sentinel-light] .bg-zinc-900\\/60 { background: #FFFFFF !important; box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important; }
          [data-sentinel-light] .bg-zinc-800 { background: #E2E8F0 !important; }
          [data-sentinel-light] .bg-zinc-800\\/60 { background: #F1F5F9 !important; }
          [data-sentinel-light] .bg-zinc-800\\/50 { background: #F1F5F9 !important; }
          [data-sentinel-light] .bg-zinc-800\\/30 { background: #F8FAFC !important; border-color: #E2E8F0 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important; }
          [data-sentinel-light] .bg-zinc-700 { background: #CBD5E1 !important; }
          [data-sentinel-light] .bg-zinc-700\\/30 { background: #F1F5F9 !important; }

          /* Backgrounds — emerald tints (keep emerald but lighter) */
          [data-sentinel-light] .bg-emerald-500\\/10 { background: rgba(16,185,129,0.08) !important; }
          [data-sentinel-light] .bg-emerald-500\\/5 { background: rgba(16,185,129,0.04) !important; }
          [data-sentinel-light] .bg-emerald-500\\/20 { background: rgba(16,185,129,0.12) !important; }
          [data-sentinel-light] .bg-emerald-400\\/10 { background: rgba(52,211,153,0.1) !important; }
          [data-sentinel-light] .bg-emerald-400\\/15 { background: rgba(52,211,153,0.12) !important; }
          [data-sentinel-light] .bg-emerald-400\\/20 { background: rgba(52,211,153,0.15) !important; }
          [data-sentinel-light] .bg-emerald-50 { background: #ECFDF5 !important; }
          [data-sentinel-light] .bg-emerald-50\\/50 { background: rgba(236,253,245,0.5) !important; }
          [data-sentinel-light] .bg-emerald-100 { background: #D1FAE5 !important; }

          /* Backgrounds — green/red tints */
          [data-sentinel-light] .bg-green-500\\/20 { background: rgba(34,197,94,0.15) !important; }
          [data-sentinel-light] .bg-red-500\\/5 { background: rgba(239,68,68,0.05) !important; }

          /* Text — primary */
          [data-sentinel-light] .text-white { color: #0F172A !important; }
          [data-sentinel-light] .text-black { color: #0F172A !important; }

          /* Text — zinc grays → slate equivalents */
          [data-sentinel-light] .text-zinc-300 { color: #475569 !important; }
          [data-sentinel-light] .text-zinc-400 { color: #64748B !important; }
          [data-sentinel-light] .text-zinc-500 { color: #64748B !important; }
          [data-sentinel-light] .text-zinc-600 { color: #475569 !important; }

          /* Text — gray */
          [data-sentinel-light] .text-gray-300,[data-sentinel-light] .text-gray-400 { color: #64748B !important; }

          /* Text — slate (ensure these pass through correctly) */
          [data-sentinel-light] .text-slate-900 { color: #0F172A !important; }
          [data-sentinel-light] .text-slate-800 { color: #1E293B !important; }
          [data-sentinel-light] .text-slate-700 { color: #334155 !important; }
          [data-sentinel-light] .text-slate-600 { color: #475569 !important; }
          [data-sentinel-light] .text-slate-500 { color: #64748B !important; }
          [data-sentinel-light] .text-slate-400 { color: #94A3B8 !important; }

          /* Borders — zinc → slate */
          [data-sentinel-light] .border-zinc-800\\/60 { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-zinc-800\\/50 { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-zinc-800 { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-zinc-700 { border-color: #CBD5E1 !important; }
          [data-sentinel-light] .border-zinc-700\\/30 { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-zinc-700\\/50 { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-zinc-600 { border-color: #CBD5E1 !important; }
          [data-sentinel-light] .border-white { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-slate-200 { border-color: #E2E8F0 !important; }
          [data-sentinel-light] .border-slate-300 { border-color: #CBD5E1 !important; }

          /* Borders — emerald */
          [data-sentinel-light] .border-emerald-500\\/20 { border-color: rgba(16,185,129,0.25) !important; }
          [data-sentinel-light] .border-emerald-500\\/30 { border-color: rgba(16,185,129,0.35) !important; }
          [data-sentinel-light] .border-emerald-500\\/40 { border-color: rgba(16,185,129,0.45) !important; }
          [data-sentinel-light] .border-emerald-300 { border-color: #6EE7B7 !important; }
          [data-sentinel-light] .border-emerald-200 { border-color: #A7F3D0 !important; }

          /* Shadows — proper light mode depth */
          [data-sentinel-light] .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.06) !important; }
          [data-sentinel-light] .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05) !important; }
          [data-sentinel-light] .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04) !important; }
          [data-sentinel-light] .shadow-glow { box-shadow: 0 4px 12px rgba(16,185,129,0.15) !important; }

          /* Inputs */
          [data-sentinel-light] input, [data-sentinel-light] textarea, [data-sentinel-light] select { background: #FFFFFF !important; color: #0F172A !important; border: 1px solid #CBD5E1 !important; border-radius: 8px !important; }
          [data-sentinel-light] input:focus, [data-sentinel-light] textarea:focus, [data-sentinel-light] select:focus { border-color: #10B981 !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.15) !important; }
          [data-sentinel-light] input::placeholder, [data-sentinel-light] textarea::placeholder { color: #94A3B8 !important; }

          /* Glass card */
          [data-sentinel-light] .glass-card { background: #FFFFFF !important; border: 1px solid #E2E8F0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important; }

          /* Backdrop */
          [data-sentinel-light] .backdrop-blur-sm { backdrop-filter: none !important; }

          /* Dialogs/Sheets */
          [data-sentinel-light] .SheetContent, [data-sentinel-light] .DialogContent { background: #FFFFFF !important; border-color: #E2E8F0 !important; }

          /* Progress bars */
          [data-sentinel-light] div[role="progressbar"] { background: #E2E8F0 !important; }
          [data-sentinel-light] div[role="progressbar"] > div { box-shadow: none !important; }

          /* Hover states */
          [data-sentinel-light] .hover\\:bg-zinc-800:hover { background: #F1F5F9 !important; }
          [data-sentinel-light] .hover\\:bg-zinc-900\\/60:hover { background: #F8FAFC !important; }
          [data-sentinel-light] .hover\\:border-zinc-700\\/60:hover { border-color: #CBD5E1 !important; }
          [data-sentinel-light] .hover\\:border-emerald-500\\/30:hover { border-color: rgba(16,185,129,0.4) !important; }
          [data-sentinel-light] .hover\\:border-emerald-300:hover { border-color: #6EE7B7 !important; }

          /* Radix UI select content */
          [data-sentinel-light] [role="listbox"] { background: #FFFFFF !important; border: 1px solid #E2E8F0 !important; }
          [data-sentinel-light] [role="option"]:hover, [data-sentinel-light] [role="option"][data-highlighted] { background: #F1F5F9 !important; }

          /* Animate pulse skeleton */
          [data-sentinel-light] .animate-pulse { opacity: 0.6 !important; }

          /* ── Sentinel Light: Sidebar & Submenus ──────────────── */
          html[data-sentinel-light] .sidebar-shell {
            background: #FFFFFF !important;
            border-right: 1px solid #E2E8F0 !important;
          }
          /* Submenu flyout */
          [data-sentinel-light] .bg-black\\/95 {
            background: rgba(255,255,255,0.97) !important;
            border-color: #E2E8F0 !important;
          }
          [data-sentinel-light] .border-white\\/10 {
            border-color: #E2E8F0 !important;
          }
          /* Nav item text */
          [data-sentinel-light] .text-gray-400 {
            color: #64748B !important;
          }
          /* Nav item hover */
          [data-sentinel-light] .hover\\:text-white:hover {
            color: #0F172A !important;
          }
          [data-sentinel-light] .hover\\:bg-white\\/5:hover {
            background: rgba(0,0,0,0.04) !important;
          }
          [data-sentinel-light] .active\\:bg-white\\/10:active {
            background: rgba(0,0,0,0.06) !important;
          }
          /* Active nav item (cyan) */
          [data-sentinel-light] .text-cyan-400 {
            color: #0891B2 !important;
          }
          [data-sentinel-light] .bg-cyan-950\\/30 {
            background: rgba(8,145,178,0.08) !important;
          }
          /* Dividers */
          [data-sentinel-light] .bg-white\\/5 {
            background: #E2E8F0 !important;
          }
          /* Submenu item active states */
          [data-sentinel-light] .bg-white\\/10 {
            background: rgba(0,0,0,0.06) !important;
          }
          /* Submenu shadow */
          [data-sentinel-light] .shadow-2xl {
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15) !important;
          }
          /* Sentinel-specific active color in sidebar */
          [data-sentinel-light] .text-emerald-400 {
            color: #059669 !important;
          }
          [data-sentinel-light] .bg-emerald-950\\/30, [data-sentinel-light] .bg-emerald-900\\/20 {
            background: rgba(5,150,105,0.08) !important;
          }
          /* Notification badge */
          [data-sentinel-light] .bg-red-500 {
            background: #EF4444 !important;
          }

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
          html[data-sentinel-light] input, html[data-sentinel-light] textarea, html[data-sentinel-light] select {
            background: #FFFFFF !important;
            color: #0F172A !important;
            border: 1px solid #E2E8F0 !important;
          }
          input:focus, textarea:focus, select:focus {
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 1px var(--accent-glow);
          }

          /* Global Colors */
          .bg-black { background: var(--bg) !important; }
          html[data-sentinel-light] .bg-black { background: #F8FAFC !important; }
          .text-white { color: #fff !important; }
          html[data-sentinel-light] .text-white { color: #0F172A !important; }
          html[data-sentinel-light] .text-black { color: #0F172A !important; }
          html[data-sentinel-light] .bg-white, html[data-sentinel-light] .bg-white\\/95, html[data-sentinel-light] .bg-white\\/90 { background: #FFFFFF !important; border-color: #E2E8F0 !important; }
          .text-gray-300, .text-gray-400 { color: #888 !important; }

          /* Badges & Pills */
          .badge, .pill {
            background: rgba(6,182,212,0.1) !important;
            color: #06B6D4 !important;
            border: 1px solid rgba(6,182,212,0.2) !important;
            border-radius: 6px !important;
          }
          [data-sentinel-light] .badge, [data-sentinel-light] .pill {
            background: rgba(16,185,129,0.1) !important;
            color: #059669 !important;
            border: 1px solid rgba(16,185,129,0.2) !important;
          }
          [data-sentinel-light] .btn-primary {
            background: linear-gradient(180deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08)) !important;
            color: #059669 !important;
            border: 1px solid rgba(16,185,129,0.3) !important;
            box-shadow: none !important;
          }
          [data-sentinel-light] .btn-primary:hover {
            background: linear-gradient(180deg, rgba(16,185,129,0.25), rgba(16,185,129,0.15)) !important;
            border-color: rgba(16,185,129,0.5) !important;
            color: #047857 !important;
          }
          [data-sentinel-light] .btn-outline {
            border: 1px solid #CBD5E1 !important;
            color: #475569 !important;
            background: transparent !important;
          }
          [data-sentinel-light] .btn-outline:hover {
            border-color: #94A3B8 !important;
            color: #0F172A !important;
            background: #F8FAFC !important;
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
          {/* Desktop/Tablet Sidebar with Flyout Submenu */}
          <div className="hidden md:flex flex-col sidebar-shell w-[72px] lg:w-[80px] overflow-visible relative z-20">
            <SidebarContent
              currentPageName={currentPageName}
              secondaryNavConfig={secondaryNavConfig}
              enabledApps={enabledApps}
              onOpenAppsManager={() => setAppsManagerOpen(true)}
              openSubmenu={openSubmenu}
              setOpenSubmenu={setOpenSubmenu}
              onSubmenuClose={handleSubmenuClose}
              onSubmenuEnter={handleSubmenuEnter}
            />
            {/* Submenu Flyout - positioned absolutely relative to sidebar */}
            <SubmenuFlyout
              config={secondaryNavConfig}
              openSubmenu={openSubmenu}
              onClose={handleSubmenuClose}
              onEnter={handleSubmenuEnter}
              location={location}
            />
          </div>

          {/* Mobile Header - Only on phones (below 768px) */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800 pt-safe">
            <div className="flex items-center justify-between px-3 sm:px-4 h-14 sm:h-16">
              <div className="flex items-center">
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
                  iSyncSo
                </span>
              </div>
              {/* Show current section badge on mobile */}
              {secondaryNavConfig && (
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${COLOR_CLASSES[secondaryNavConfig.color]?.bg || 'bg-cyan-500/10'} ${COLOR_CLASSES[secondaryNavConfig.color]?.text || 'text-cyan-400'}`}>
                  {secondaryNavConfig.title}
                </div>
              )}
              <div className="flex items-center gap-1">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors rounded-xl"
                    aria-label="Open menu"
                  >
                    <Menu className="w-6 h-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 border-gray-800 bg-black pt-safe pb-safe overflow-y-auto">
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
          </div>

          {/* Desktop Top Bar removed - notifications moved to sidebar */}

          {/* Main Content - Mobile optimized with safe areas */}
          <main
            id="main-content"
            className="relative flex-1 md:pt-0 pt-14 sm:pt-16 overflow-auto transition-all duration-300 pb-safe scroll-smooth-ios"
            role="main"
          >
            {/* SYNC environment top tabs — bordered pill style */}
            {secondaryNavConfig?.title === 'SYNC' && (
              <div className="px-4 lg:px-6 pt-4">
                <div className="inline-flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-1.5 overflow-x-auto scrollbar-hide">
                  {secondaryNavConfig.items.map((item) => {
                    const Icon = item.icon;
                    const fullUrl = location.pathname + location.search;
                    const itemBase = item.path?.split('?')[0];
                    const isActive = item.path?.includes('?')
                      ? fullUrl === item.path || (fullUrl === itemBase && item.matchPath)
                      : location.pathname === item.path;
                    return (
                      <Link
                        key={item.label}
                        to={item.path}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-zinc-800/80 text-cyan-300/90'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {/* TALENT quick action buttons moved to TalentDashboard PageHeader */}
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

        {/* SYNC Floating Chat Widget */}
        <SyncFloatingChat
          isOpen={isFloatingChatOpen}
          onClose={handleCloseFloatingChat}
          onExpandToFullPage={handleExpandChatToFullPage}
          onStartVoice={handleOpenVoiceMode}
        />

        {/* SYNC Voice Mode */}
        <SyncVoiceMode
          isOpen={isVoiceModeOpen}
          onClose={handleCloseVoiceMode}
          onSwitchToChat={handleSwitchToChat}
        />

        {/* Enrichment Progress Bar - shows during nest candidate processing */}
        <EnrichmentProgressBar />
        </div>
          </AchievementProvider>
          </NotificationsProvider>
          </KeyboardShortcutsProvider>
          </PermissionProvider>
          </AnimationProvider>
          </SyncStateProvider>
        </UserProvider>
        </OnboardingGuard>
        </ErrorBoundary>
        );
        }
