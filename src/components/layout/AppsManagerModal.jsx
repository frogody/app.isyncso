import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import {
  Settings, X, Check,
  GraduationCap, Rocket, Shield, Sparkles, LayoutGrid, Eye, EyeOff,
  Users, Palette, TrendingUp, Clock, Lock, Zap, Target, BookOpen,
  Brain, Trophy, BarChart3, LineChart, Mail, Search, FileText,
  Euro, Wallet, Receipt, CreditCard, PieChart, Signal, ShoppingCart,
  Package, Calendar, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useTeamAccess } from '@/components/context/UserContext';

// Import widget definitions
import { LEARN_WIDGETS } from '@/components/dashboard/widgets/LearnWidgets';
import { GROWTH_WIDGETS } from '@/components/dashboard/widgets/GrowthWidgets';
import { SENTINEL_WIDGETS } from '@/components/dashboard/widgets/SentinelWidgets';
import { CORE_WIDGETS } from '@/components/dashboard/widgets/CoreWidgets';
import { FINANCE_WIDGETS } from '@/components/dashboard/widgets/FinanceWidgets';
import { RAISE_WIDGETS } from '@/components/dashboard/widgets/RaiseWidgets';
import { COMMERCE_WIDGETS } from '@/components/dashboard/widgets/CommerceWidgets';

// Merge core widgets into each app for visibility in previews
const ALL_CORE_WIDGETS = CORE_WIDGETS;

// Widget preview components (mini versions)
import { WidgetPreview } from '@/components/layout/WidgetPreviews';

// Define all available apps/features
const AVAILABLE_APPS = [
  {
    id: 'learn',
    name: 'Learn',
    description: 'Courses, skills, and learning paths',
    icon: GraduationCap,
    color: 'teal',
    defaultEnabled: true,
    widgets: LEARN_WIDGETS,
    purpose: 'Master AI skills with personalized learning paths designed for your role and goals.',
    capabilities: [
      { icon: BookOpen, text: 'AI-curated courses tailored to your skill level' },
      { icon: Brain, text: 'Adaptive learning that adjusts to your pace' },
      { icon: Trophy, text: 'Gamification with XP, streaks, and certificates' },
      { icon: Target, text: 'Skill assessments and progress tracking' }
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Pipeline, prospects, and campaigns',
    icon: Rocket,
    color: 'indigo',
    defaultEnabled: true,
    widgets: GROWTH_WIDGETS,
    purpose: 'Accelerate your sales pipeline with AI-powered prospecting and multi-channel campaigns.',
    capabilities: [
      { icon: Search, text: 'Smart prospect discovery and research' },
      { icon: LineChart, text: 'Pipeline management and deal tracking' },
      { icon: Zap, text: 'Buying signal detection and alerts' },
      { icon: Mail, text: 'Automated multi-channel outreach campaigns' }
    ]
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'AI compliance and risk management',
    icon: Shield,
    color: 'sage',
    defaultEnabled: true,
    widgets: SENTINEL_WIDGETS,
    purpose: 'Stay compliant with AI regulations like the EU AI Act with automated risk management.',
    capabilities: [
      { icon: BarChart3, text: 'AI system risk classification and assessment' },
      { icon: FileText, text: 'Auto-generated compliance documentation' },
      { icon: Target, text: 'Task management for compliance activities' },
      { icon: Zap, text: 'Real-time compliance status monitoring' }
    ]
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Revenue, expenses, and financial tracking',
    icon: Euro,
    color: 'blue',
    defaultEnabled: false,
    widgets: FINANCE_WIDGETS,
    purpose: 'Track your business finances with invoices, expenses, and subscription management.',
    capabilities: [
      { icon: Receipt, text: 'Invoice creation and tracking' },
      { icon: CreditCard, text: 'Expense management and categorization' },
      { icon: PieChart, text: 'Financial reporting and analytics' },
      { icon: TrendingUp, text: 'Revenue and subscription tracking' }
    ]
  },
  {
    id: 'raise',
    name: 'Raise',
    description: 'Fundraising toolkit & investor management',
    icon: TrendingUp,
    color: 'blue',
    defaultEnabled: false,
    widgets: RAISE_WIDGETS,
    purpose: 'Manage your fundraising campaigns with investor tracking and data room management.',
    capabilities: [
      { icon: Users, text: 'Investor pipeline and relationship management' },
      { icon: FileText, text: 'Pitch deck and materials organization' },
      { icon: Target, text: 'Campaign progress and milestone tracking' },
      { icon: BarChart3, text: 'Data room for due diligence documents' }
    ]
  },
  {
    id: 'talent',
    name: 'Talent',
    description: 'AI-powered recruitment & candidate intelligence',
    icon: Users,
    color: 'red',
    defaultEnabled: true,
    widgets: [],
    widgetsComingSoon: true,
    purpose: 'Streamline recruitment with AI-driven candidate intelligence and automated outreach.',
    capabilities: [
      { icon: Brain, text: 'Flight risk intelligence scoring' },
      { icon: Users, text: 'Candidate pipeline management' },
      { icon: Target, text: 'Multi-stage outreach campaigns' },
      { icon: Zap, text: 'Targeted recruitment workflows' }
    ]
  },
  {
    id: 'create',
    name: 'Create',
    description: 'AI content studio for images, video & more',
    icon: Palette,
    color: 'cyan',
    defaultEnabled: false,
    widgets: [],
    widgetsComingSoon: true,
    purpose: 'Generate images, videos, and branded content using AI with your company context.',
    capabilities: [
      { icon: Palette, text: 'AI image and product photography' },
      { icon: Zap, text: 'Video and podcast generation' },
      { icon: Target, text: 'Brand-consistent content creation' },
      { icon: BookOpen, text: 'Content library and asset management' }
    ]
  },
  // Products is a core app — always in the primary sidebar, not toggleable here
  {
    id: 'reach',
    name: 'Reach',
    description: 'Marketing automation & content hub',
    icon: Signal,
    color: 'violet',
    defaultEnabled: false,
    widgets: [],
    widgetsComingSoon: true,
    purpose: 'Plan, create, and distribute marketing campaigns across all channels with AI assistance.',
    capabilities: [
      { icon: Megaphone, text: 'Multi-channel campaign management' },
      { icon: Search, text: 'SEO analysis and optimization' },
      { icon: Calendar, text: 'Content calendar and scheduling' },
      { icon: Palette, text: 'AI-powered copy studio' }
    ]
  }
];

const COMING_SOON_APPS = [];

const COLOR_CLASSES = {
  teal: {
    bg: 'bg-teal-950/40',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
    activeBg: 'bg-teal-950/60',
    iconBg: 'bg-teal-500/20',
    gradient: 'from-teal-500/20 to-teal-500/5',
    ringClass: 'ring-teal-500/50'
  },
  cyan: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    activeBg: 'bg-cyan-950/60',
    iconBg: 'bg-cyan-500/20',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    ringClass: 'ring-cyan-500/50'
  },
  indigo: {
    bg: 'bg-indigo-950/40',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    activeBg: 'bg-indigo-950/60',
    iconBg: 'bg-indigo-500/20',
    gradient: 'from-indigo-500/20 to-indigo-500/5',
    ringClass: 'ring-indigo-500/50'
  },
  sage: {
    bg: 'bg-emerald-950/40',
    border: 'border-[#86EFAC]/30',
    text: 'text-[#86EFAC]',
    activeBg: 'bg-emerald-950/60',
    iconBg: 'bg-[#86EFAC]/20',
    gradient: 'from-[#86EFAC]/20 to-[#86EFAC]/5',
    ringClass: 'ring-[#86EFAC]/50'
  },
  violet: {
    bg: 'bg-violet-950/40',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    activeBg: 'bg-violet-950/60',
    iconBg: 'bg-violet-500/20',
    gradient: 'from-violet-500/20 to-violet-500/5',
    ringClass: 'ring-violet-500/50'
  },
  red: {
    bg: 'bg-red-950/40',
    border: 'border-red-500/30',
    text: 'text-red-400',
    activeBg: 'bg-red-950/60',
    iconBg: 'bg-red-500/20',
    gradient: 'from-red-500/20 to-red-500/5',
    ringClass: 'ring-red-500/50'
  },
  blue: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    activeBg: 'bg-blue-950/60',
    iconBg: 'bg-blue-500/20',
    gradient: 'from-blue-500/20 to-blue-500/5',
    ringClass: 'ring-blue-500/50'
  }
};

export default function AppsManagerModal({ isOpen, onClose, onConfigUpdate, embedded = false }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enabledApps, setEnabledApps] = useState(['learn', 'growth', 'sentinel']);
  const [enabledWidgets, setEnabledWidgets] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const { effectiveApps = [] } = useTeamAccess();
  const configRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  // Auto-select first enabled app when loading completes
  useEffect(() => {
    if (!loading && enabledApps.length > 0 && !selectedApp) {
      setSelectedApp(enabledApps[0]);
    }
  }, [loading, enabledApps]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const user = await db.auth.me();
      if (!user) return;

      const configs = await db.entities.UserAppConfig.filter({ user_id: user.id });

      if (configs.length > 0) {
        const userConfig = configs[0];
        setConfig(userConfig);
        configRef.current = userConfig;
        setEnabledApps(userConfig.enabled_apps || ['learn', 'growth', 'sentinel']);
        setEnabledWidgets(userConfig.dashboard_widgets || getDefaultWidgets());
      } else {
        const defaultWidgets = getDefaultWidgets();
        const defaultConfig = {
          user_id: user.id,
          enabled_apps: ['learn', 'growth', 'sentinel'],
          app_order: ['learn', 'growth', 'sentinel'],
          dashboard_widgets: defaultWidgets
        };
        const newConfig = await db.entities.UserAppConfig.create(defaultConfig);
        setConfig(newConfig);
        configRef.current = newConfig;
        setEnabledApps(defaultConfig.enabled_apps);
        setEnabledWidgets(defaultWidgets);
      }
    } catch (error) {
      console.error('Failed to load app config:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWidgets = () => {
    return [
      'learn_progress', 'learn_stats',
      'growth_pipeline', 'growth_stats', 'growth_deals',
      'sentinel_compliance', 'sentinel_systems',
      'actions_recent', 'quick_actions'
    ];
  };

  const isAppLicensed = (appId) => effectiveApps.length === 0 || effectiveApps.includes(appId);

  // Persist config to DB and notify sidebar + dashboard instantly
  const persistConfig = useCallback((newApps, newWidgets) => {
    const currentConfig = configRef.current;
    if (!currentConfig?.id) return;

    // Fire event immediately so sidebar updates without waiting for DB
    window.dispatchEvent(new CustomEvent('dashboard-config-updated', {
      detail: { enabled_apps: newApps, dashboard_widgets: newWidgets }
    }));

    onConfigUpdate?.({ ...currentConfig, enabled_apps: newApps, dashboard_widgets: newWidgets });

    // Persist to DB in background
    db.entities.UserAppConfig.update(currentConfig.id, {
      enabled_apps: newApps,
      app_order: newApps,
      dashboard_widgets: newWidgets
    }).catch((err) => {
      console.error('Failed to persist config:', err);
      toast.error('Failed to save — changes may not persist');
    });
  }, [onConfigUpdate]);

  const toggleApp = (appId) => {
    if (!isAppLicensed(appId)) return;

    let newApps;
    let newWidgets;

    setEnabledApps(prev => {
      if (prev.includes(appId)) {
        if (prev.length === 1) {
          toast.error('You must have at least one app enabled');
          return prev;
        }
        const appWidgets = AVAILABLE_APPS.find(a => a.id === appId)?.widgets || [];
        newWidgets = enabledWidgets.filter(id => !appWidgets.some(aw => aw.id === id));
        setEnabledWidgets(newWidgets);
        newApps = prev.filter(id => id !== appId);
      } else {
        const appWidgets = AVAILABLE_APPS.find(a => a.id === appId)?.widgets || [];
        newWidgets = [...enabledWidgets, ...appWidgets.map(aw => aw.id)];
        setEnabledWidgets(newWidgets);
        newApps = [...prev, appId];
      }
      // Persist after computing new state
      setTimeout(() => persistConfig(newApps, newWidgets), 0);
      return newApps;
    });
  };

  const toggleWidget = (widgetId) => {
    let newWidgets;
    setEnabledWidgets(prev => {
      if (prev.includes(widgetId)) {
        newWidgets = prev.filter(id => id !== widgetId);
      } else {
        newWidgets = [...prev, widgetId];
      }
      setTimeout(() => persistConfig(enabledApps, newWidgets), 0);
      return newWidgets;
    });
  };

  const handleRequestLicense = (appName) => {
    toast.success(`License request for ${appName} sent to your admin`);
  };

  const selectedAppData = selectedApp ? AVAILABLE_APPS.find(a => a.id === selectedApp) : null;
  const selectedAppLicensed = selectedAppData ? isAppLicensed(selectedAppData.id) : true;

  // Load config on mount for embedded mode
  useEffect(() => {
    if (embedded) {
      loadConfig();
    }
  }, [embedded]);

  const renderContent = () => (
    <>
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className={`flex flex-col lg:flex-row ${embedded ? 'min-h-[500px]' : 'h-[calc(90vh-120px)] min-h-[400px]'}`}>
            {/* Left Panel - Apps List */}
            <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 overflow-y-auto">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">
                Installed Apps
              </h3>

              <div className="space-y-2">
                {AVAILABLE_APPS.map((app) => {
                  const Icon = app.icon;
                  const colors = COLOR_CLASSES[app.color];
                  const isEnabled = enabledApps.includes(app.id);
                  const isSelected = selectedApp === app.id;
                  const isLicensed = isAppLicensed(app.id);

                  return (
                    <div
                      key={app.id}
                      className={`
                        rounded-xl border transition-all cursor-pointer
                        ${!isLicensed
                          ? 'bg-zinc-800/20 border-zinc-800/50 opacity-60'
                          : isSelected
                            ? `${colors.activeBg} ${colors.border} ring-1 ${colors.ringClass}`
                            : isEnabled
                              ? `${colors.bg} ${colors.border} hover:${colors.activeBg}`
                              : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'
                        }
                      `}
                      onClick={() => setSelectedApp(app.id)}
                    >
                      <div className="p-3 flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isEnabled && isLicensed ? colors.iconBg : 'bg-zinc-800'}
                          border ${isEnabled && isLicensed ? colors.border : 'border-zinc-700'}
                        `}>
                          <Icon className={`w-5 h-5 ${isEnabled && isLicensed ? colors.text : 'text-zinc-500'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm ${isEnabled && isLicensed ? 'text-zinc-100' : 'text-zinc-400'}`}>
                              {app.name}
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-500 truncate">
                            {app.widgets.length} widget{app.widgets.length !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {isLicensed ? (
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => toggleApp(app.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-cyan-600"
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestLicense(app.name);
                            }}
                            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/60 hover:text-zinc-100 transition-colors flex items-center gap-1 flex-shrink-0"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coming Soon */}
              {COMING_SOON_APPS.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-600 mb-3 px-2 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Coming Soon
                  </p>
                  <div className="space-y-2">
                    {COMING_SOON_APPS.map((app) => {
                      const Icon = app.icon;
                      const colors = COLOR_CLASSES[app.color];

                      return (
                        <div
                          key={app.id}
                          className="p-3 rounded-xl bg-zinc-800/20 border border-zinc-800/50 border-dashed opacity-60"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${colors.iconBg} border ${colors.border} flex items-center justify-center`}>
                              <Icon className={`w-5 h-5 ${colors.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm text-zinc-400">{app.name}</h4>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${colors.iconBg} ${colors.text} flex items-center gap-1`}>
                                  <Lock className="w-2 h-2" />
                                  Soon
                                </span>
                              </div>
                              <p className="text-xs text-zinc-600 truncate">{app.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Widget Preview */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              {selectedAppData ? (
                <>
                  {/* App Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`
                      w-14 h-14 rounded-xl flex items-center justify-center
                      ${COLOR_CLASSES[selectedAppData.color].iconBg}
                      border ${COLOR_CLASSES[selectedAppData.color].border}
                    `}>
                      <selectedAppData.icon className={`w-7 h-7 ${COLOR_CLASSES[selectedAppData.color].text}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-100">{selectedAppData.name}</h3>
                      <p className="text-sm text-zinc-500">{selectedAppData.description}</p>
                    </div>
                    {selectedAppLicensed ? (
                      <Switch
                        checked={enabledApps.includes(selectedAppData.id)}
                        onCheckedChange={() => toggleApp(selectedAppData.id)}
                        className="data-[state=checked]:bg-cyan-600"
                      />
                    ) : (
                      <button
                        onClick={() => handleRequestLicense(selectedAppData.name)}
                        className="px-4 py-2 rounded-full text-xs font-medium bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors flex items-center gap-1.5 border border-cyan-500/30"
                      >
                        <Lock className="w-3 h-3" />
                        Request License
                      </button>
                    )}
                  </div>

                  {/* Purpose Section */}
                  <div className={`mb-5 p-4 rounded-xl bg-gradient-to-r ${COLOR_CLASSES[selectedAppData.color].gradient} border ${COLOR_CLASSES[selectedAppData.color].border}`}>
                    <p className="text-sm text-zinc-200 mb-3">{selectedAppData.purpose}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedAppData.capabilities?.map((cap, idx) => {
                        const CapIcon = cap.icon;
                        return (
                          <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${COLOR_CLASSES[selectedAppData.color].iconBg}`}>
                              <CapIcon className={`w-3 h-3 ${COLOR_CLASSES[selectedAppData.color].text}`} />
                            </div>
                            <span>{cap.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unlicensed: locked state */}
                  {!selectedAppLicensed ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center p-8 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30">
                        <Lock className="w-8 h-8 mx-auto mb-3 text-zinc-500" />
                        <h4 className="text-sm font-medium text-zinc-300 mb-1">License Required</h4>
                        <p className="text-xs text-zinc-500 mb-4">Request a license to enable {selectedAppData.name} and its dashboard widgets</p>
                        <button
                          onClick={() => handleRequestLicense(selectedAppData.name)}
                          className="px-4 py-2 rounded-full text-xs font-medium bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors inline-flex items-center gap-1.5 border border-cyan-500/30"
                        >
                          <Mail className="w-3 h-3" />
                          Request License
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Dashboard Widgets Label */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Dashboard Widgets
                        </h4>
                        {selectedAppData.widgets.length > 0 && (
                          <span className="text-xs text-zinc-600">
                            {enabledWidgets.filter(w => selectedAppData.widgets.some(sw => sw.id === w)).length}/{selectedAppData.widgets.length} enabled
                          </span>
                        )}
                      </div>

                      {/* Widget Grid - Scrollable */}
                      {selectedAppData.widgets.length > 0 ? (
                        <ScrollArea className="flex-1">
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-4 pr-2">
                          {selectedAppData.widgets.map((widget) => {
                            const isWidgetEnabled = enabledWidgets.includes(widget.id);
                            const colors = COLOR_CLASSES[selectedAppData.color];

                            return (
                              <div
                                key={widget.id}
                                className={widget.size === 'large' ? 'col-span-2' : ''}
                              >
                                <div
                                  className={`
                                    relative rounded-xl border-2 overflow-hidden transition-all cursor-pointer h-full
                                    ${isWidgetEnabled
                                      ? `${colors.border} bg-gradient-to-b ${colors.gradient}`
                                      : 'border-zinc-800 bg-zinc-800/30 opacity-60 hover:opacity-80'
                                    }
                                  `}
                                  onClick={() => toggleWidget(widget.id)}
                                >
                                  {/* Preview Container */}
                                  <div className="p-3 h-28 overflow-hidden relative">
                                    <WidgetPreview
                                      widgetId={widget.id}
                                      appId={selectedAppData.id}
                                      size={widget.size}
                                    />

                                    {/* Overlay gradient */}
                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-900/90 to-transparent" />
                                  </div>

                                  {/* Widget Info */}
                                  <div className="p-2 pt-0 relative">
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-xs font-medium text-zinc-200 truncate">{widget.name}</h5>
                                        <p className="text-[10px] text-zinc-500">{widget.size}</p>
                                      </div>
                                      <div className={`
                                        w-6 h-6 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ml-2
                                        ${isWidgetEnabled
                                          ? `${colors.iconBg} ${colors.text}`
                                          : 'bg-zinc-800 text-zinc-500'
                                        }
                                      `}>
                                        {isWidgetEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Selection indicator */}
                                  {isWidgetEnabled && (
                                    <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${colors.iconBg} ${colors.border} border flex items-center justify-center`}>
                                      <Check className={`w-2.5 h-2.5 ${colors.text}`} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className={`text-center p-8 rounded-xl border border-dashed ${COLOR_CLASSES[selectedAppData.color].border} ${COLOR_CLASSES[selectedAppData.color].bg}`}>
                            <Clock className={`w-8 h-8 mx-auto mb-3 ${COLOR_CLASSES[selectedAppData.color].text}`} />
                            <h4 className="text-sm font-medium text-zinc-300 mb-1">Widgets Coming Soon</h4>
                            <p className="text-xs text-zinc-500">Dashboard widgets for {selectedAppData.name} are in development</p>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {selectedAppData.widgets.length > 0 && (
                        <p className="text-xs text-zinc-600 mt-2">
                          Click on a widget to toggle its visibility on your dashboard
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <LayoutGrid className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-400 mb-2">Select an App</h3>
                    <p className="text-sm text-zinc-600">Choose an app from the left to configure its dashboard widgets</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );

  if (embedded) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {renderContent()}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden" hideClose>
        <DialogTitle className="sr-only">Workspace Settings</DialogTitle>
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Settings className="w-6 h-6 text-cyan-400/80" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Workspace Settings</h2>
              <p className="text-sm text-zinc-500">Configure your apps and customize your dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

export { AVAILABLE_APPS, COLOR_CLASSES };
