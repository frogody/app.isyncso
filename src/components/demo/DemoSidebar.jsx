import React from 'react';
import {
  LayoutDashboard, Contact, FolderKanban, Package, Inbox,
  Euro, Rocket, GraduationCap, UserPlus, Shield, TrendingUp, Palette,
  Settings, Bell,
  // Finance sub-nav
  Receipt, FileText, CreditCard, BookOpen, ScrollText, BarChart3,
  // Growth sub-nav
  Megaphone, Radio, Target,
  // CRM sub-nav
  Users, UserCheck, Truck, Handshake, Crosshair, FileSpreadsheet,
  // Talent sub-nav
  Briefcase, Building2, MessageSquare,
  // Learn sub-nav
  Library, Sparkles,
  // Create sub-nav
  PaintBucket, Image, Video, FolderOpen,
  // Products sub-nav
  Cloud, Box, PackageCheck,
  // Raise sub-nav
  Presentation, FolderKey,
  // Sentinel sub-nav
  Cpu, Map, FileCheck,
  // Sync sub-nav
  Brain, Activity,
} from 'lucide-react';

// Matches production Layout.jsx navigationItems exactly
const coreNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, title: 'Dashboard' },
  { key: 'crm', icon: Contact, title: 'CRM' },
  { key: 'tasks', icon: FolderKanban, title: 'Projects' },
  { key: 'products', icon: Package, title: 'Products' },
  { key: 'inbox', icon: Inbox, title: 'Inbox' },
];

// Matches production ENGINE_ITEMS_CONFIG exactly
const engineItems = [
  { key: 'finance', icon: Euro, title: 'Finance', color: { text: 'text-amber-400', bg: 'bg-amber-950/30', solid: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' } },
  { key: 'growth', icon: Rocket, title: 'Growth', color: { text: 'text-indigo-400', bg: 'bg-indigo-950/30', solid: 'bg-indigo-500', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' } },
  { key: 'learn', icon: GraduationCap, title: 'Learn', color: { text: 'text-teal-400', bg: 'bg-teal-950/30', solid: 'bg-teal-500', glow: 'shadow-[0_0_10px_rgba(20,184,166,0.5)]' } },
  { key: 'talent', icon: UserPlus, title: 'Talent', color: { text: 'text-red-400', bg: 'bg-red-950/30', solid: 'bg-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' } },
  { key: 'sentinel', icon: Shield, title: 'Sentinel', color: { text: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/10', solid: 'bg-[#86EFAC]', glow: 'shadow-[0_0_10px_rgba(134,239,172,0.5)]' } },
  { key: 'raise', icon: TrendingUp, title: 'Raise', color: { text: 'text-orange-400', bg: 'bg-orange-950/30', solid: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' } },
  { key: 'create', icon: Palette, title: 'Create', color: { text: 'text-yellow-400', bg: 'bg-yellow-950/30', solid: 'bg-yellow-500', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' } },
];

// Matches production getSecondaryNavConfig() exactly
// Items without dedicated demo pages use parent module key as fallback
const MODULE_SUB_PAGES = {
  crm: {
    title: 'CRM',
    color: 'cyan',
    items: [
      { key: 'crm-leads', icon: Target, title: 'Leads' },
      { key: 'crm-prospects', icon: TrendingUp, title: 'Prospects' },
      { key: 'crm-customers', icon: UserCheck, title: 'Customers' },
      { key: 'crm-suppliers', icon: Truck, title: 'Suppliers', fallback: 'crm' },
      { key: 'crm-partners', icon: Handshake, title: 'Partners', fallback: 'crm' },
      { key: 'crm-candidates', icon: UserPlus, title: 'Candidates', fallback: 'crm' },
      { key: 'crm-targets', icon: Crosshair, title: 'Targets', fallback: 'crm' },
      { key: 'crm-companies', icon: Users, title: 'All Contacts' },
      { key: 'crm-import', icon: FileSpreadsheet, title: 'Import', fallback: 'crm' },
    ],
  },
  products: {
    title: 'PRODUCTS',
    color: 'cyan',
    items: [
      { key: 'products', icon: Package, title: 'Overview' },
      { key: 'products-digital', icon: Cloud, title: 'Digital' },
      { key: 'products-physical', icon: Box, title: 'Physical' },
      { key: 'products-receiving', icon: PackageCheck, title: 'Receiving' },
      { key: 'products-shipping', icon: Truck, title: 'Shipping' },
      { key: 'products-stockpurchases', icon: Receipt, title: 'Stock Purchases', fallback: 'products' },
      { key: 'products-import', icon: FileSpreadsheet, title: 'Import', fallback: 'products' },
    ],
  },
  finance: {
    title: 'FINANCE',
    color: 'amber',
    items: [
      { key: 'finance', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'finance-invoices', icon: Receipt, title: 'Invoices' },
      { key: 'finance-proposals', icon: FileText, title: 'Proposals' },
      { key: 'finance-expenses', icon: CreditCard, title: 'Expenses' },
      { key: 'finance-ledger', icon: BookOpen, title: 'Ledger' },
      { key: 'finance-payables', icon: ScrollText, title: 'Payables' },
      { key: 'finance-reports', icon: BarChart3, title: 'Reports' },
    ],
  },
  growth: {
    title: 'GROWTH',
    color: 'indigo',
    items: [
      { key: 'growth', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'growth-campaigns', icon: Megaphone, title: 'New Campaign' },
      { key: 'growth-signals', icon: Radio, title: 'Customer Signals' },
      { key: 'growth-opportunities', icon: Target, title: 'Opportunities' },
      { key: 'growth-pipeline', icon: Package, title: 'Data Nests' },
    ],
  },
  learn: {
    title: 'LEARN',
    color: 'teal',
    items: [
      { key: 'learn', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'learn-courses', icon: BookOpen, title: 'My Courses' },
      { key: 'learn-skills', icon: Target, title: 'Skills' },
      { key: 'learn-builder', icon: Library, title: 'Course Builder' },
      { key: 'learn-certifications', icon: Sparkles, title: 'AI Tools' },
    ],
  },
  talent: {
    title: 'TALENT',
    color: 'red',
    items: [
      { key: 'talent', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'talent-candidates', icon: Users, title: 'Candidates' },
      { key: 'talent-projects', icon: Briefcase, title: 'Projects' },
      { key: 'talent-campaigns', icon: Megaphone, title: 'Campaigns' },
      { key: 'talent-clients', icon: Building2, title: 'Clients', fallback: 'talent' },
      { key: 'talent-deals', icon: Handshake, title: 'Deals', fallback: 'talent' },
      { key: 'talent-outreach', icon: MessageSquare, title: 'SMS Outreach' },
      { key: 'talent-nests', icon: Package, title: 'Nests' },
    ],
  },
  sentinel: {
    title: 'SENTINEL',
    color: 'sage',
    items: [
      { key: 'sentinel', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'sentinel-systems', icon: Cpu, title: 'AI Systems' },
      { key: 'sentinel-roadmap', icon: Map, title: 'Roadmap' },
      { key: 'sentinel-documents', icon: FileText, title: 'Documents' },
    ],
  },
  raise: {
    title: 'RAISE',
    color: 'orange',
    items: [
      { key: 'raise', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'raise-investors', icon: Building2, title: 'Investors' },
      { key: 'raise-pitchdecks', icon: Presentation, title: 'Pitch Decks' },
      { key: 'raise-dataroom', icon: FolderKey, title: 'Data Room' },
      { key: 'raise-campaigns', icon: Rocket, title: 'Campaigns' },
      { key: 'raise-enrich', icon: FileSpreadsheet, title: 'Enrich', fallback: 'raise' },
    ],
  },
  create: {
    title: 'CREATE',
    color: 'yellow',
    items: [
      { key: 'create', icon: LayoutDashboard, title: 'Dashboard' },
      { key: 'create-branding', icon: PaintBucket, title: 'Branding' },
      { key: 'create-images', icon: Image, title: 'Images' },
      { key: 'create-videos', icon: Video, title: 'Videos' },
      { key: 'create-library', icon: FolderOpen, title: 'Library' },
    ],
  },
  'sync-showcase': {
    title: 'SYNC',
    color: 'cyan',
    items: [
      { key: 'sync-agent', icon: Brain, title: 'SYNC Agent' },
      { key: 'sync-activity', icon: Activity, title: 'Activity' },
      { key: 'sync-journals', icon: BookOpen, title: 'Daily Journals', fallback: 'sync-showcase' },
    ],
  },
};

// Color map matching production COLOR_CLASSES
const FLYOUT_COLORS = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-950/30', border: 'border-cyan-500/20', solid: 'bg-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-500/20', solid: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' },
  indigo: { text: 'text-indigo-400', bg: 'bg-indigo-950/30', border: 'border-indigo-500/20', solid: 'bg-indigo-500', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' },
  teal: { text: 'text-teal-400', bg: 'bg-teal-950/30', border: 'border-teal-500/20', solid: 'bg-teal-500', glow: 'shadow-[0_0_10px_rgba(20,184,166,0.5)]' },
  red: { text: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-500/20', solid: 'bg-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' },
  sage: { text: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/10', border: 'border-[#86EFAC]/20', solid: 'bg-[#86EFAC]', glow: 'shadow-[0_0_10px_rgba(134,239,172,0.5)]' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-500/20', solid: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-500/20', solid: 'bg-yellow-500', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' },
};

// Get parent module for a sub-page key (e.g. 'finance-invoices' → 'finance')
function getParentModule(pageKey) {
  if (MODULE_SUB_PAGES[pageKey]) return pageKey;
  for (const [mod, config] of Object.entries(MODULE_SUB_PAGES)) {
    if (config.items.some(s => s.key === pageKey)) return mod;
  }
  return null;
}

// Calculate flyout top offset to align with the active sidebar item (matches production calculateSecondaryNavOffset)
function calculateFlyoutOffset(moduleKey) {
  const AVATAR_HEIGHT = 60; // avatar + margin
  const NAV_PADDING = 16;   // py-4
  const ITEM_HEIGHT = 44;
  const ITEM_GAP = 4;
  const DIVIDER_HEIGHT = 20;

  // Check if this is a core nav item (crm, products)
  const coreIndex = coreNavItems.findIndex(n => n.key === moduleKey);
  if (coreIndex >= 0) {
    return AVATAR_HEIGHT + NAV_PADDING + (coreIndex * (ITEM_HEIGHT + ITEM_GAP));
  }

  // Engine item — offset past core items + divider
  const coreTotal = coreNavItems.length * (ITEM_HEIGHT + ITEM_GAP);
  const engineIndex = engineItems.findIndex(e => e.key === moduleKey);
  if (engineIndex >= 0) {
    return AVATAR_HEIGHT + NAV_PADDING + coreTotal + DIVIDER_HEIGHT + (engineIndex * (ITEM_HEIGHT + ITEM_GAP));
  }

  return AVATAR_HEIGHT + NAV_PADDING;
}

// Simplified SYNC avatar ring (no animation dependencies)
function DemoSyncAvatar({ size = 36 }) {
  const r = size / 2;
  const segmentR = r - 2;
  const innerR = r * 0.58;

  const segments = [
    { color: '#ec4899', from: 0.02, to: 0.08 },
    { color: '#06b6d4', from: 0.12, to: 0.18 },
    { color: '#6366f1', from: 0.22, to: 0.28 },
    { color: '#10b981', from: 0.32, to: 0.38 },
    { color: '#86EFAC', from: 0.42, to: 0.48 },
    { color: '#f59e0b', from: 0.52, to: 0.58 },
    { color: '#f43f5e', from: 0.62, to: 0.68 },
    { color: '#f97316', from: 0.72, to: 0.78 },
    { color: '#3b82f6', from: 0.82, to: 0.88 },
    { color: '#14b8a6', from: 0.92, to: 0.98 },
  ];

  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
          transform: 'scale(1.2)',
          opacity: 0.3,
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <filter id="demoGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={1.5} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#demoGlow)">
          {segments.map((seg, i) => (
            <path
              key={i}
              d={arcPath(r, r, segmentR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.75}
            />
          ))}
        </g>
      </svg>
      <div
        className="absolute rounded-full"
        style={{
          top: size / 2 - innerR,
          left: size / 2 - innerR,
          width: innerR * 2,
          height: innerR * 2,
          background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  );
}

export default function DemoSidebar({ currentPage = 'dashboard', onNavigate }) {
  const activeModule = getParentModule(currentPage);
  const moduleConfig = activeModule ? MODULE_SUB_PAGES[activeModule] : null;

  // Get color scheme for active module
  const activeEngine = engineItems.find(e => e.key === activeModule);
  const flyoutColorKey = moduleConfig?.color || 'cyan';
  const flyoutColors = FLYOUT_COLORS[flyoutColorKey] || FLYOUT_COLORS.cyan;

  // Calculate flyout position to align with active sidebar item
  const flyoutTop = activeModule ? calculateFlyoutOffset(activeModule) : 0;
  // Subtract header height so the first item aligns with the sidebar icon
  const headerHeight = 36;
  const flyoutOffset = Math.max(0, flyoutTop - headerHeight);

  return (
    <div className="hidden md:flex h-screen shrink-0 overflow-visible relative z-20">
      {/* Main icon sidebar — matches production exactly */}
      <div className="flex flex-col w-[72px] lg:w-[80px] bg-black/95 border-r border-zinc-800">
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide">
          {/* SYNC Avatar at top */}
          <div className="flex items-center justify-center min-h-[44px] w-full p-2 mb-2 rounded-xl">
            <DemoSyncAvatar size={36} />
          </div>

          {/* Core Navigation */}
          <div className="space-y-1">
            {coreNavItems.map((item) => {
              const isActive = currentPage === item.key || getParentModule(currentPage) === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate?.(item.key)}
                  className={`flex items-center justify-center min-h-[44px] w-full p-3 rounded-xl transition-all duration-200 group relative cursor-pointer hover:bg-white/5
                    ${isActive ? 'text-cyan-400 bg-cyan-950/30' : 'text-gray-400'}
                  `}
                  title={item.title}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : ''}`} />
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-l-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-white/5 mx-2 my-2" />

          {/* Engine Apps — color-coded, matches production */}
          <div className="space-y-1">
            {engineItems.map((item) => {
              const isActive = currentPage === item.key || getParentModule(currentPage) === item.key;
              const Icon = item.icon;
              const colors = item.color;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate?.(item.key)}
                  className={`flex items-center justify-center min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative cursor-pointer hover:bg-white/5 w-full
                    ${isActive ? `${colors.text} ${colors.bg}` : 'text-gray-400'}
                  `}
                  title={item.title}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? colors.text : ''}`} />
                  {isActive && (
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${colors.solid} ${colors.glow}`} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 space-y-1 bg-gradient-to-t from-black via-black to-transparent">
          <div className="flex items-center justify-center min-h-[44px] p-3 rounded-xl text-gray-400 cursor-default" title="Notifications">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-center min-h-[44px] p-3 rounded-xl text-gray-400 cursor-default" title="Settings">
            <Settings className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-center min-h-[44px] p-3 rounded-xl text-gray-400 cursor-default" title="Credits">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-cyan-400">50</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating sub-menu flyout — matches production SubmenuFlyout style */}
      {moduleConfig && moduleConfig.items.length > 0 && (
        <div
          className="absolute left-[72px] lg:left-[80px] bg-black/95 backdrop-blur-sm border border-white/10 rounded-2xl p-3 shadow-2xl z-50 hidden md:block overflow-hidden"
          style={{ top: `${flyoutOffset}px` }}
        >
          {/* Color tint overlay */}
          <div className={`absolute inset-0 ${flyoutColors.bg} opacity-30 rounded-2xl pointer-events-none`} />

          {/* Section title */}
          <div className="relative px-2 pb-2 mb-2 border-b border-white/5">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest ${flyoutColors.text}`}>
              {moduleConfig.title}
            </h3>
          </div>

          {/* Nav items */}
          <nav className="relative space-y-1">
            {moduleConfig.items.map((sub) => {
              const isActive = currentPage === sub.key;
              const Icon = sub.icon;
              const navKey = sub.fallback || sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => onNavigate?.(navKey)}
                  title={sub.title}
                  className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 group
                    ${isActive
                      ? `${flyoutColors.text} ${flyoutColors.bg}`
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? flyoutColors.text : 'group-hover:text-white'}`} />
                  {isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${flyoutColors.solid} ${flyoutColors.glow}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
