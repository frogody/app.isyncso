import React, { useState, useEffect } from 'react';
import {
  Euro, Clock, RefreshCw, FolderKanban, Flag, Trophy,
  Settings, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { toast } from 'sonner';

import HourlyRateEditor from './HourlyRateEditor';
import RetainerEditor from './RetainerEditor';
import ProjectPricingEditor from './ProjectPricingEditor';
import MilestonePricingEditor from './MilestonePricingEditor';
import SuccessFeeEditor from './SuccessFeeEditor';

const DEFAULT_PRICING_CONFIG = {
  hourly: { enabled: false, rate: 0, min_hours: 0, billing_increment: '1hr' },
  retainer: { enabled: false, monthly_fee: 0, included_hours: 0, overage_rate: 0 },
  project: { enabled: false, items: [] },
  milestones: { enabled: false, items: [] },
  success_fee: { enabled: false, base_fee: 0, success_percentage: 0, metric: '' },
};

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function PricingSummaryCard({ config, currency = 'EUR', t }) {
  const { hourly, retainer, project, milestones, success_fee } = config;

  const activeCount = [
    hourly?.enabled,
    retainer?.enabled,
    project?.enabled,
    milestones?.enabled,
    success_fee?.enabled,
  ].filter(Boolean).length;

  const projectItemCount = project?.items?.length || 0;
  const milestoneCount = milestones?.items?.length || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className={cn(
        "p-3 rounded-lg border",
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className="flex items-center gap-2 text-cyan-400 mb-1">
          <Settings className="w-4 h-4" />
          <span className="text-xs">Pricing Models</span>
        </div>
        <p className={cn("text-lg font-semibold", t('text-slate-900', 'text-white'))}>
          {activeCount}
        </p>
        <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
          active {activeCount === 1 ? 'model' : 'models'}
        </p>
      </div>

      <div className={cn(
        "p-3 rounded-lg border",
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className="flex items-center gap-2 text-cyan-400 mb-1">
          <Clock className="w-4 h-4" />
          <span className="text-xs">Hourly</span>
        </div>
        <p className={cn("text-lg font-semibold", t('text-slate-900', 'text-white'))}>
          {hourly?.enabled && hourly?.rate > 0
            ? formatPrice(hourly.rate, currency)
            : '-'
          }
        </p>
        {hourly?.enabled && hourly?.rate > 0 && (
          <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>per hour</p>
        )}
      </div>

      <div className={cn(
        "p-3 rounded-lg border",
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className="flex items-center gap-2 text-blue-400 mb-1">
          <FolderKanban className="w-4 h-4" />
          <span className="text-xs">Project Items</span>
        </div>
        <p className={cn("text-lg font-semibold", t('text-slate-900', 'text-white'))}>
          {projectItemCount}
        </p>
        <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
          {projectItemCount === 1 ? 'deliverable' : 'deliverables'}
        </p>
      </div>

      <div className={cn(
        "p-3 rounded-lg border",
        t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
      )}>
        <div className="flex items-center gap-2 text-cyan-400 mb-1">
          <Flag className="w-4 h-4" />
          <span className="text-xs">Milestones</span>
        </div>
        <p className={cn("text-lg font-semibold", t('text-slate-900', 'text-white'))}>
          {milestoneCount}
        </p>
        <p className={cn("text-xs", t('text-slate-500', 'text-zinc-500'))}>
          payment {milestoneCount === 1 ? 'stage' : 'stages'}
        </p>
      </div>
    </div>
  );
}

function SectionToggle({ icon: Icon, title, description, enabled, onToggle, color = 'cyan', t }) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg border",
      t('bg-white border-slate-200', 'bg-zinc-900/50 border-white/5')
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className={cn("font-medium", t('text-slate-900', 'text-white'))}>{title}</div>
          <div className={cn("text-sm", t('text-slate-500', 'text-zinc-500'))}>{description}</div>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

const SECTION_META = {
  hourly: { icon: Clock, title: 'Hourly Rate', description: 'Charge by the hour', color: 'cyan', label: 'Hourly' },
  retainer: { icon: RefreshCw, title: 'Retainer', description: 'Monthly fee with included hours', color: 'cyan', label: 'Retainer' },
  project: { icon: FolderKanban, title: 'Project Pricing', description: 'Fixed-price project deliverables', color: 'blue', label: 'Project' },
  milestones: { icon: Flag, title: 'Milestone Pricing', description: 'Payment tied to milestones', color: 'cyan', label: 'Milestones' },
  success_fee: { icon: Trophy, title: 'Success Fee', description: 'Base fee plus performance bonus', color: 'blue', label: 'Success Fee' },
};

export default function ServicePricingManager({
  pricingConfig = {},
  currency = 'EUR',
  onConfigChange,
  className,
}) {
  const { t } = useTheme();

  const [config, setConfig] = useState(() => ({
    ...DEFAULT_PRICING_CONFIG,
    ...pricingConfig,
  }));
  const [activeTab, setActiveTab] = useState('hourly');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with external config
  useEffect(() => {
    if (pricingConfig && Object.keys(pricingConfig).length > 0) {
      setConfig({
        ...DEFAULT_PRICING_CONFIG,
        ...pricingConfig,
      });
    }
  }, [pricingConfig]);

  const updateConfig = (path, value) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return newConfig;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await onConfigChange?.(config);
      setHasChanges(false);
      toast.success('Service pricing configuration saved');
    } catch (error) {
      console.error('Failed to save pricing config:', error);
      toast.error('Failed to save pricing configuration');
    }
  };

  const toggleSection = async (section) => {
    const newEnabled = !config[section]?.enabled;
    const newConfig = {
      ...config,
      [section]: {
        ...config[section],
        enabled: newEnabled,
      },
    };
    setConfig(newConfig);

    try {
      await onConfigChange?.(newConfig);
      const meta = SECTION_META[section];
      toast.success(`${meta.title} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save changes');
    }
  };

  // Auto-select first enabled tab
  useEffect(() => {
    const sections = ['hourly', 'retainer', 'project', 'milestones', 'success_fee'];
    const firstEnabled = sections.find((s) => config[s]?.enabled);
    if (firstEnabled && !config[activeTab]?.enabled) {
      setActiveTab(firstEnabled);
    }
  }, [config, activeTab]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <PricingSummaryCard config={config} currency={currency} t={t} />

      {/* Section Toggles */}
      <div className="space-y-2">
        {Object.entries(SECTION_META).map(([key, meta]) => (
          <SectionToggle
            key={key}
            icon={meta.icon}
            title={meta.title}
            description={meta.description}
            enabled={config[key]?.enabled}
            onToggle={() => toggleSection(key)}
            color={meta.color}
            t={t}
          />
        ))}
      </div>

      {/* Tabbed Editors */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "w-full p-1 border",
          t('bg-slate-100 border-slate-200', 'bg-zinc-900/50 border-white/5')
        )}>
          {Object.entries(SECTION_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const isEnabled = config[key]?.enabled;
            const badgeCount = key === 'project'
              ? config.project?.items?.length
              : key === 'milestones'
                ? config.milestones?.items?.length
                : null;
            const accentColor = meta.color === 'blue'
              ? 'data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400'
              : 'data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400';

            return (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "flex-1 text-xs",
                  accentColor,
                  !isEnabled && "opacity-50"
                )}
                disabled={!isEnabled}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">{meta.label}</span>
                {badgeCount > 0 && (
                  <Badge className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0",
                    meta.color === 'blue'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  )}>
                    {badgeCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Hourly */}
        <TabsContent value="hourly" className="mt-4">
          {config.hourly?.enabled ? (
            <HourlyRateEditor
              config={config.hourly}
              currency={currency}
              onConfigChange={(hourlyConfig) => {
                updateConfig('hourly', { ...config.hourly, ...hourlyConfig, enabled: true });
              }}
            />
          ) : (
            <EmptySection icon={Clock} label="hourly rate" t={t} />
          )}
        </TabsContent>

        {/* Retainer */}
        <TabsContent value="retainer" className="mt-4">
          {config.retainer?.enabled ? (
            <RetainerEditor
              config={config.retainer}
              currency={currency}
              onConfigChange={(retainerConfig) => {
                updateConfig('retainer', { ...config.retainer, ...retainerConfig, enabled: true });
              }}
            />
          ) : (
            <EmptySection icon={RefreshCw} label="retainer" t={t} />
          )}
        </TabsContent>

        {/* Project */}
        <TabsContent value="project" className="mt-4">
          {config.project?.enabled ? (
            <ProjectPricingEditor
              items={config.project?.items || []}
              currency={currency}
              onItemsChange={(items) => updateConfig('project.items', items)}
            />
          ) : (
            <EmptySection icon={FolderKanban} label="project pricing" t={t} />
          )}
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones" className="mt-4">
          {config.milestones?.enabled ? (
            <MilestonePricingEditor
              items={config.milestones?.items || []}
              currency={currency}
              onItemsChange={(items) => updateConfig('milestones.items', items)}
            />
          ) : (
            <EmptySection icon={Flag} label="milestone pricing" t={t} />
          )}
        </TabsContent>

        {/* Success Fee */}
        <TabsContent value="success_fee" className="mt-4">
          {config.success_fee?.enabled ? (
            <SuccessFeeEditor
              config={config.success_fee}
              currency={currency}
              onConfigChange={(sfConfig) => {
                updateConfig('success_fee', { ...config.success_fee, ...sfConfig, enabled: true });
              }}
            />
          ) : (
            <EmptySection icon={Trophy} label="success fee" t={t} />
          )}
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {hasChanges && (
        <div className={cn(
          "flex justify-end pt-4 border-t",
          t('border-slate-200', 'border-white/5')
        )}>
          <Button
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Save Pricing Configuration
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptySection({ icon: Icon, label, t }) {
  return (
    <div className={cn("text-center py-12", t('text-slate-400', 'text-zinc-500'))}>
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Enable {label} above to configure</p>
    </div>
  );
}
