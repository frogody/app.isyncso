import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/api/supabaseClient';
import {
  Settings, X, Check,
  GraduationCap, Rocket, Shield, Sparkles, LayoutGrid, Eye, EyeOff,
  Users, Palette, TrendingUp, Clock, Lock, Zap, Target, BookOpen,
  Brain, Trophy, BarChart3, LineChart, Mail, Search, FileText,
  DollarSign, Wallet, Receipt, CreditCard, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Import widget definitions
import { LEARN_WIDGETS } from '@/components/dashboard/widgets/LearnWidgets';
import { GROWTH_WIDGETS } from '@/components/dashboard/widgets/GrowthWidgets';
import { SENTINEL_WIDGETS } from '@/components/dashboard/widgets/SentinelWidgets';
import { CORE_WIDGETS } from '@/components/dashboard/widgets/CoreWidgets';
import { FINANCE_WIDGETS } from '@/components/dashboard/widgets/FinanceWidgets';
import { RAISE_WIDGETS } from '@/components/dashboard/widgets/RaiseWidgets';

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
    color: 'cyan',
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
    icon: DollarSign,
    color: 'emerald',
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
    color: 'emerald',
    defaultEnabled: false,
    widgets: RAISE_WIDGETS,
    purpose: 'Manage your fundraising campaigns with investor tracking and data room management.',
    capabilities: [
      { icon: Users, text: 'Investor pipeline and relationship management' },
      { icon: FileText, text: 'Pitch deck and materials organization' },
      { icon: Target, text: 'Campaign progress and milestone tracking' },
      { icon: BarChart3, text: 'Data room for due diligence documents' }
    ]
  }
];

// Coming Soon apps
const COMING_SOON_APPS = [
  {
    id: 'talent',
    name: 'Talent',
    description: 'AI-powered recruitment & candidate research',
    icon: Users,
    color: 'violet'
  },
  {
    id: 'create',
    name: 'Create',
    description: 'Content generation with company context',
    icon: Palette,
    color: 'pink'
  }
];

const COLOR_CLASSES = {
  cyan: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    activeBg: 'bg-cyan-950/60',
    iconBg: 'bg-cyan-500/20',
    gradient: 'from-cyan-500/20 to-cyan-500/5'
  },
  indigo: {
    bg: 'bg-indigo-950/40',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    activeBg: 'bg-indigo-950/60',
    iconBg: 'bg-indigo-500/20',
    gradient: 'from-indigo-500/20 to-indigo-500/5'
  },
  sage: {
    bg: 'bg-emerald-950/40',
    border: 'border-[#86EFAC]/30',
    text: 'text-[#86EFAC]',
    activeBg: 'bg-emerald-950/60',
    iconBg: 'bg-[#86EFAC]/20',
    gradient: 'from-[#86EFAC]/20 to-[#86EFAC]/5'
  },
  violet: {
    bg: 'bg-violet-950/40',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    activeBg: 'bg-violet-950/60',
    iconBg: 'bg-violet-500/20',
    gradient: 'from-violet-500/20 to-violet-500/5'
  },
  pink: {
    bg: 'bg-pink-950/40',
    border: 'border-pink-500/30',
    text: 'text-pink-400',
    activeBg: 'bg-pink-950/60',
    iconBg: 'bg-pink-500/20',
    gradient: 'from-pink-500/20 to-pink-500/5'
  },
  emerald: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    activeBg: 'bg-emerald-950/60',
    iconBg: 'bg-emerald-500/20',
    gradient: 'from-emerald-500/20 to-emerald-500/5'
  }
};

export default function AppsManagerModal({ isOpen, onClose, onConfigUpdate }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabledApps, setEnabledApps] = useState(['learn', 'growth', 'sentinel']);
  const [enabledWidgets, setEnabledWidgets] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);


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

  const toggleApp = (appId) => {
    setEnabledApps(prev => {
      if (prev.includes(appId)) {
        if (prev.length === 1) {
          toast.error('You must have at least one app enabled');
          return prev;
        }
        const appWidgets = AVAILABLE_APPS.find(a => a.id === appId)?.widgets || [];
        setEnabledWidgets(w => w.filter(id => !appWidgets.some(aw => aw.id === id)));
        return prev.filter(id => id !== appId);
      } else {
        const appWidgets = AVAILABLE_APPS.find(a => a.id === appId)?.widgets || [];
        setEnabledWidgets(w => [...w, ...appWidgets.map(aw => aw.id)]);
        return [...prev, appId];
      }
    });
  };

  const toggleWidget = (widgetId) => {
    setEnabledWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  };

  const handleSave = async () => {
    if (!config?.id) return;
    
    setSaving(true);
    try {
      const updatedConfig = {
        enabled_apps: enabledApps,
        app_order: enabledApps,
        dashboard_widgets: enabledWidgets
      };
      
      await db.entities.UserAppConfig.update(config.id, updatedConfig);
      
      if (onConfigUpdate) {
        onConfigUpdate({ ...config, ...updatedConfig });
      }
      
      // Notify Dashboard to reload
      window.dispatchEvent(new CustomEvent('dashboard-config-updated'));
      
      toast.success('Configuration saved');
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const selectedAppData = selectedApp ? AVAILABLE_APPS.find(a => a.id === selectedApp) : null;

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

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row h-[calc(90vh-180px)] min-h-[400px]">
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
                  
                  return (
                    <div
                      key={app.id}
                      className={`
                        rounded-xl border transition-all cursor-pointer
                        ${isSelected 
                          ? `${colors.activeBg} ${colors.border} ring-1 ring-${app.color === 'sage' ? '[#86EFAC]' : app.color}-500/50` 
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
                          ${isEnabled ? colors.iconBg : 'bg-zinc-800'} 
                          border ${isEnabled ? colors.border : 'border-zinc-700'}
                        `}>
                          <Icon className={`w-5 h-5 ${isEnabled ? colors.text : 'text-zinc-500'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${isEnabled ? 'text-zinc-100' : 'text-zinc-400'}`}>
                            {app.name}
                          </h4>
                          <p className="text-xs text-zinc-500 truncate">
                            {app.widgets.length} widget{app.widgets.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleApp(app.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-cyan-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coming Soon */}
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
                    <Switch
                      checked={enabledApps.includes(selectedAppData.id)}
                      onCheckedChange={() => toggleApp(selectedAppData.id)}
                      className="data-[state=checked]:bg-cyan-600"
                    />
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

                  {/* Dashboard Widgets Label */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      Dashboard Widgets
                    </h4>
                    <span className="text-xs text-zinc-600">
                      {enabledWidgets.filter(w => selectedAppData.widgets.some(sw => sw.id === w)).length}/{selectedAppData.widgets.length} enabled
                    </span>
                  </div>

                  {/* Widget Grid - Scrollable */}
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

                  {/* Description */}
                  <p className="text-xs text-zinc-600 mt-2">
                    Click on a widget to toggle its visibility on your dashboard
                  </p>
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

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800 bg-zinc-900/80">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-zinc-700 text-zinc-400"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { AVAILABLE_APPS, COLOR_CLASSES };