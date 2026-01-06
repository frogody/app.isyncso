import React, { useState, useEffect } from 'react';
import {
  DollarSign, CreditCard, Package, Plus, Sparkles, RefreshCw,
  Clock, Zap, Gift, Settings, ChevronDown, ChevronUp, Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import SubscriptionPlanEditor from './SubscriptionPlanEditor';
import OneTimePricingEditor from './OneTimePricingEditor';
import AddOnEditor from './AddOnEditor';

const DEFAULT_PRICING_CONFIG = {
  subscriptions: {
    enabled: false,
    default_cycle: 'monthly',
    plans: []
  },
  one_time: {
    enabled: false,
    items: []
  },
  add_ons: {
    enabled: false,
    items: []
  }
};

function formatPrice(amount, currency = 'EUR') {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function PricingSummaryCard({ config, currency = 'EUR' }) {
  const { subscriptions, one_time, add_ons } = config;

  // Calculate summary stats
  const planCount = subscriptions?.plans?.length || 0;
  const oneTimeCount = one_time?.items?.length || 0;
  const addOnCount = add_ons?.items?.length || 0;

  // Get price range from subscription plans
  const monthlyPrices = subscriptions?.plans
    ?.filter(p => p.pricing?.monthly?.amount)
    .map(p => p.pricing.monthly.amount) || [];
  const minPrice = monthlyPrices.length > 0 ? Math.min(...monthlyPrices) : 0;
  const maxPrice = monthlyPrices.length > 0 ? Math.max(...monthlyPrices) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2 text-cyan-400 mb-1">
          <CreditCard className="w-4 h-4" />
          <span className="text-xs">Subscriptions</span>
        </div>
        <p className="text-lg font-semibold text-white">
          {planCount} {planCount === 1 ? 'plan' : 'plans'}
        </p>
        {minPrice > 0 && (
          <p className="text-xs text-zinc-500">
            {formatPrice(minPrice, currency)}{maxPrice > minPrice ? ` - ${formatPrice(maxPrice, currency)}` : ''}/mo
          </p>
        )}
      </div>

      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Zap className="w-4 h-4" />
          <span className="text-xs">One-time</span>
        </div>
        <p className="text-lg font-semibold text-white">
          {oneTimeCount} {oneTimeCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2 text-purple-400 mb-1">
          <Gift className="w-4 h-4" />
          <span className="text-xs">Add-ons</span>
        </div>
        <p className="text-lg font-semibold text-white">
          {addOnCount} {addOnCount === 1 ? 'add-on' : 'add-ons'}
        </p>
      </div>

      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <div className="flex items-center gap-2 text-green-400 mb-1">
          <DollarSign className="w-4 h-4" />
          <span className="text-xs">Revenue Types</span>
        </div>
        <p className="text-lg font-semibold text-white">
          {[subscriptions?.enabled, one_time?.enabled, add_ons?.enabled].filter(Boolean).length}
        </p>
        <p className="text-xs text-zinc-500">active streams</p>
      </div>
    </div>
  );
}

function SectionToggle({ icon: Icon, title, description, enabled, onToggle, color = 'cyan' }) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-white/5">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-medium text-white">{title}</div>
          <div className="text-sm text-zinc-500">{description}</div>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

export default function DigitalPricingManager({
  pricingConfig = {},
  basePrice = 0,
  currency = 'EUR',
  onConfigChange,
  className
}) {
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_PRICING_CONFIG,
    ...pricingConfig
  }));
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with external config
  useEffect(() => {
    if (pricingConfig && Object.keys(pricingConfig).length > 0) {
      setConfig(prev => ({
        ...DEFAULT_PRICING_CONFIG,
        ...pricingConfig
      }));
    }
  }, [pricingConfig]);

  const updateConfig = (path, value) => {
    setConfig(prev => {
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
      toast.success('Pricing configuration saved');
    } catch (error) {
      console.error('Failed to save pricing config:', error);
      toast.error('Failed to save pricing configuration');
    }
  };

  const toggleSection = (section) => {
    updateConfig(`${section}.enabled`, !config[section]?.enabled);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <PricingSummaryCard config={config} currency={currency} />

      {/* Section Toggles */}
      <div className="space-y-2">
        <SectionToggle
          icon={CreditCard}
          title="Subscription Plans"
          description="Monthly or annual recurring billing"
          enabled={config.subscriptions?.enabled}
          onToggle={() => toggleSection('subscriptions')}
          color="cyan"
        />
        <SectionToggle
          icon={Zap}
          title="One-time Services"
          description="Setup fees, migrations, consultancy"
          enabled={config.one_time?.enabled}
          onToggle={() => toggleSection('one_time')}
          color="amber"
        />
        <SectionToggle
          icon={Gift}
          title="Add-ons"
          description="Optional extras and upgrades"
          enabled={config.add_ons?.enabled}
          onToggle={() => toggleSection('add_ons')}
          color="purple"
        />
      </div>

      {/* Tabbed Editors */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-zinc-900/50 border border-white/5 p-1">
          <TabsTrigger
            value="subscriptions"
            className={cn(
              "flex-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400",
              !config.subscriptions?.enabled && "opacity-50"
            )}
            disabled={!config.subscriptions?.enabled}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Subscriptions
            {config.subscriptions?.plans?.length > 0 && (
              <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 text-xs">
                {config.subscriptions.plans.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="one_time"
            className={cn(
              "flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400",
              !config.one_time?.enabled && "opacity-50"
            )}
            disabled={!config.one_time?.enabled}
          >
            <Zap className="w-4 h-4 mr-2" />
            One-time
            {config.one_time?.items?.length > 0 && (
              <Badge className="ml-2 bg-amber-500/20 text-amber-400 text-xs">
                {config.one_time.items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="add_ons"
            className={cn(
              "flex-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400",
              !config.add_ons?.enabled && "opacity-50"
            )}
            disabled={!config.add_ons?.enabled}
          >
            <Gift className="w-4 h-4 mr-2" />
            Add-ons
            {config.add_ons?.items?.length > 0 && (
              <Badge className="ml-2 bg-purple-500/20 text-purple-400 text-xs">
                {config.add_ons.items.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          {config.subscriptions?.enabled ? (
            <SubscriptionPlanEditor
              plans={config.subscriptions?.plans || []}
              defaultCycle={config.subscriptions?.default_cycle || 'monthly'}
              currency={currency}
              onPlansChange={(plans) => updateConfig('subscriptions.plans', plans)}
              onDefaultCycleChange={(cycle) => updateConfig('subscriptions.default_cycle', cycle)}
            />
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enable subscriptions above to configure plans</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="one_time" className="mt-4">
          {config.one_time?.enabled ? (
            <OneTimePricingEditor
              items={config.one_time?.items || []}
              currency={currency}
              onItemsChange={(items) => updateConfig('one_time.items', items)}
            />
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enable one-time services above to configure items</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="add_ons" className="mt-4">
          {config.add_ons?.enabled ? (
            <AddOnEditor
              items={config.add_ons?.items || []}
              currency={currency}
              onItemsChange={(items) => updateConfig('add_ons.items', items)}
            />
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enable add-ons above to configure options</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-white/5">
          <Button
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Save Pricing Configuration
          </Button>
        </div>
      )}
    </div>
  );
}
